// HDHub4u Provider - Stream Extractors
// src/hdhub4u/extractors.js

import { MAIN_URL, HEADERS, rot13, safeAtob, safeBtoa, extractText, extractAttr, extractAllLinks, parseSize } from './config.js';
import { fetchWithRetry, fetchRedirectUrl, fetchJSON, fetchText } from './http.js';

// =================================================================================
// HELPER: CHECK IF URL IS DIRECT DOWNLOAD
// =================================================================================

/**
 * Check if a URL is a direct download link (not a redirect)
 */
function isDirectLink(url) {
    // Direct download patterns
    const directPatterns = [
        /pixeldrain\.com\/api\/file\/.*\?download/,  // Pixeldrain API
        /video-downloads\.googleusercontent\.com/,    // Google video downloads
        /drive\.google\.com\/uc\?/,                  // Google Drive direct
        /docs\.google\.com.*export/,                 // Google Docs export
    ];
    
    // Check if URL matches any direct pattern
    return directPatterns.some(pattern => pattern.test(url));
}

/**
 * Check if a URL is a redirect link that needs to be resolved
 */
function isRedirectLink(url) {
    const redirectPatterns = [
        /dl\.php\?link=/,           // dl.php redirect
        /pixel\.hubcdn/,            // pixel.hubcdn redirect
        /pixel\.rohitkiskk/,        // pixel workers redirect
        /\/go\//,                   // Generic /go/ redirects
        /redirect/i,                // URLs with 'redirect' in them
    ];
    
    return redirectPatterns.some(pattern => pattern.test(url));
}

// =================================================================================
// REDIRECT CHAIN RESOLVER
// =================================================================================

/**
 * Resolve redirect chains to get the final direct download URL
 * Handles: dl.php, pixel.hubcdn, encoded links, download buttons, etc.
 */
export async function resolveRedirectChain(url, maxHops = 10) {
    console.log('[RESOLVE] Starting redirect resolution for:', url.substring(0, 80) + '...');
    
    let currentUrl = url;
    let hopCount = 0;
    
    // Ad domains to skip
    const adDomains = [
        'bonuscaf.com',
        'urbanheadline.com',
        'propellerads',
        'adsterra',
        'popads',
        'popcash',
        'blogspot.com',
    ];
    
    while (hopCount < maxHops) {
        console.log(`[RESOLVE] Hop ${hopCount + 1}:`, currentUrl.substring(0, 80) + '...');
        
        // Check if we've reached a direct link
        if (isDirectLink(currentUrl)) {
            console.log('[RESOLVE] Found direct link!');
            return currentUrl;
        }
        
        try {
            // Fetch the page
            const response = await fetch(currentUrl, {
                method: 'GET',
                headers: HEADERS,
                redirect: 'manual'
            });
            
            // Check for HTTP redirect
            const location = response.headers.get('location');
            if (location) {
                currentUrl = location.startsWith('http') ? location : new URL(location, currentUrl).toString();
                hopCount++;
                continue;
            }
            
            // Check if it's a direct file download
            const contentType = response.headers.get('content-type') || '';
            if (contentType.includes('video/') || 
                contentType.includes('application/octet-stream') ||
                contentType.includes('application/x-matroska')) {
                console.log('[RESOLVE] Found direct file download');
                return currentUrl;
            }
            
            // It's HTML - extract links/redirects
            if (contentType.includes('text/html')) {
                const html = await response.text();
                
                // METHOD 1: Encoded data (like gdtot, techyboy)
                const regex = /s\('o','([A-Za-z0-9+/=]+)'|ck\('_wp_http_\d+','([^']+)'/g;
                let combinedString = '';
                let match;
                
                while ((match = regex.exec(html)) !== null) {
                    const extractedValue = match[1] || match[2];
                    if (extractedValue) combinedString += extractedValue;
                }
                
                if (combinedString) {
                    console.log('[RESOLVE] Found encoded data, decoding...');
                    try {
                        const decodedString = safeAtob(rot13(safeAtob(safeAtob(combinedString))));
                        const jsonObject = JSON.parse(decodedString);
                        const encodedUrl = safeAtob(jsonObject.o || '').trim();
                        
                        if (encodedUrl) {
                            console.log('[RESOLVE] Decoded URL from encoded data');
                            currentUrl = encodedUrl;
                            hopCount++;
                            continue;
                        }
                    } catch (err) {
                        console.log('[RESOLVE] Decode failed:', err.message);
                    }
                }
                
                // METHOD 2: Download button + JavaScript URL
                const buttonMatch = html.match(/<button[^>]*id=["']?(downloadbtn|download-btn|btn-download)[^"']*["']?[^>]*>/i);
                if (buttonMatch) {
                    console.log('[RESOLVE] Found download button, extracting URL from JS...');
                    
                    // Try multiple patterns to extract the URL
                    const urlPatterns = [
                        /https?:\/\/video-downloads\.googleusercontent\.com\/[^\s"'<>)]+/,
                        /https?:\/\/[^\s"'<>]+pixeldrain\.com[^\s"'<>]+/,
                        /https?:\/\/drive\.google\.com[^\s"'<>]+/,
                        /var\s+(?:download_?url|file_?url|link)\s*=\s*["']([^"']+)["']/i,
                        /location\.href\s*=\s*["']([^"']+)["']/i,
                        /window\.open\(["']([^"']+)["']/i,
                    ];
                    
                    for (const pattern of urlPatterns) {
                        const urlMatch = html.match(pattern);
                        if (urlMatch) {
                            const foundUrl = urlMatch[1] || urlMatch[0];
                            if (foundUrl && foundUrl.startsWith('http')) {
                                console.log('[RESOLVE] Extracted URL from button JS');
                                currentUrl = foundUrl;
                                hopCount++;
                                continue;
                            }
                        }
                    }
                }
                
                // METHOD 3: Direct URLs in HTML
                const directUrlPatterns = [
                    /https?:\/\/video-downloads\.googleusercontent\.com\/[^\s"'<>)]+/,
                    /https?:\/\/pixeldrain\.com\/api\/file\/[^\s"'<>]+/,
                    /https?:\/\/drive\.google\.com\/uc\?[^\s"'<>]+/,
                ];
                
                for (const pattern of directUrlPatterns) {
                    const urlMatch = html.match(pattern);
                    if (urlMatch) {
                        console.log('[RESOLVE] Found direct URL in HTML');
                        return urlMatch[0];
                    }
                }
                
                // METHOD 4: Download links
                const linkRegex = /<a[^>]*href=["']([^"']*)["'][^>]*>([^<]*)</gi;
                let linkMatch;
                
                while ((linkMatch = linkRegex.exec(html)) !== null) {
                    const href = linkMatch[1];
                    const text = linkMatch[2];
                    
                    if (!href || !href.startsWith('http')) continue;
                    
                    // Skip unwanted services
                    if (text.match(/telegram|zipdisk|ads/i)) continue;
                    
                    // Skip dl.php links (would create loop)
                    if (href.includes('dl.php?link=') && href === currentUrl) continue;
                    
                    // Look for download keywords
                    if (text.match(/download|get file|click here|direct link|server/i)) {
                        console.log('[RESOLVE] Found download link:', text);
                        
                        // If it's a direct link, return it
                        if (isDirectLink(href)) {
                            return href;
                        }
                        
                        // Otherwise, continue following it
                        currentUrl = href;
                        hopCount++;
                        break;
                    }
                }
                
                // METHOD 5: Meta refresh
                const metaMatch = html.match(/<meta[^>]*http-equiv=["']refresh["'][^>]*content=["'][^"']*url=([^"'\s]+)/i);
                if (metaMatch && metaMatch[1]) {
                    console.log('[RESOLVE] Following meta refresh');
                    currentUrl = metaMatch[1];
                    hopCount++;
                    continue;
                }
                
                // METHOD 6: JavaScript redirect (but skip ad domains)
                const jsMatch = html.match(/(?:window\.location|location\.href)\s*=\s*["']([^"']+)["']/);
                if (jsMatch) {
                    const jsUrl = jsMatch[1];
                    const isAd = adDomains.some(domain => jsUrl.includes(domain));
                    
                    if (!isAd) {
                        console.log('[RESOLVE] Following JS redirect');
                        currentUrl = jsUrl;
                        hopCount++;
                        continue;
                    } else {
                        console.log('[RESOLVE] Skipping ad redirect');
                    }
                }
                
                // No more redirects found
                console.log('[RESOLVE] No more redirects found on this page');
                
                // Validate: Is this actually a direct link?
                if (isRedirectLink(currentUrl)) {
                    console.log('[RESOLVE] WARNING: Stopped on redirect link, not direct download');
                    console.log('[RESOLVE] Returning original URL instead');
                    return url;
                }
                
                return currentUrl;
            }
            
            // Unknown content type
            return currentUrl;
            
        } catch (err) {
            console.log('[RESOLVE] Error:', err.message);
            
            // Don't return intermediate redirect on error
            if (isRedirectLink(currentUrl)) {
                console.log('[RESOLVE] Error occurred on redirect link, returning original');
                return url;
            }
            
            return currentUrl;
        }
    }
    
    console.log('[RESOLVE] Max hops reached');
    
    // Validate: Don't return redirect links!
    if (isRedirectLink(currentUrl)) {
        console.log('[RESOLVE] WARNING: Max hops reached but still on redirect link!');
        console.log('[RESOLVE] Returning original URL instead');
        return url; // Return original URL rather than intermediate redirect
    }
    
    return currentUrl;
}

// =================================================================================
// REDIRECT LINK DECODER (Enhanced)
// =================================================================================

/**
 * Decode redirect links (gdtot, techyboy, etc.)
 * Now returns direct links by resolving the redirect chain
 */
export async function getRedirectLinks(url) {
    console.log('[REDIRECT] Processing:', url);
    
    try {
        const doc = await fetchText(url);
        
        // Extract encoded data from JavaScript
        const regex = /s\('o','([A-Za-z0-9+/=]+)'|ck\('_wp_http_\d+','([^']+)'/g;
        let combinedString = '';
        let match;
        
        while ((match = regex.exec(doc)) !== null) {
            const extractedValue = match[1] || match[2];
            if (extractedValue) combinedString += extractedValue;
        }
        
        if (!combinedString) {
            console.log('[REDIRECT] No encoded data found');
            return url;
        }
        
        // Decode: base64(base64(rot13(base64(data))))
        const decodedString = safeAtob(rot13(safeAtob(safeAtob(combinedString))));
        const jsonObject = JSON.parse(decodedString);
        const encodedUrl = safeAtob(jsonObject.o || '').trim();
        
        if (encodedUrl) {
            console.log('[REDIRECT] Decoded URL:', encodedUrl);
            
            // If it's still a redirect, resolve it
            if (isRedirectLink(encodedUrl)) {
                return await resolveRedirectChain(encodedUrl);
            }
            
            return encodedUrl;
        }
        
        // Alternative decoding path
        const data = safeBtoa(jsonObject.data || '').trim();
        const wpHttp = (jsonObject.blog_url || '').trim();
        
        if (wpHttp && data) {
            console.log('[REDIRECT] Fetching from wpHttp');
            const html = await fetchText(`${wpHttp}?re=${data}`);
            const finalUrl = extractText(html);
            console.log('[REDIRECT] Final URL:', finalUrl);
            
            // If it's still a redirect, resolve it
            if (isRedirectLink(finalUrl)) {
                return await resolveRedirectChain(finalUrl);
            }
            
            return finalUrl;
        }
        
        return url;
    } catch (err) {
        console.log('[REDIRECT] Error:', err.message);
        return url;
    }
}

// =================================================================================
// PIXELDRAIN EXTRACTOR
// =================================================================================

/**
 * Extract stream info from Pixeldrain
 * Returns direct download URL
 */
export async function pixelDrainExtractor(url) {
    console.log('[PIXELDRAIN] Extracting from:', url);
    
    // Extract file ID
    const match = url.match(/(?:file|u)\/([A-Za-z0-9]+)/);
    const fileId = match ? match[1] : url.split('/').pop();
    
    if (!fileId) {
        console.log('[PIXELDRAIN] No file ID found');
        return [];
    }
    
    try {
        console.log('[PIXELDRAIN] File ID:', fileId);
        const info = await fetchJSON(`https://pixeldrain.com/api/file/${fileId}/info`);
        
        if (!info) {
            console.log('[PIXELDRAIN] Failed to fetch file info');
            return [];
        }
        
        // Extract quality from filename
        const qualityMatch = info.name ? info.name.match(/(\d{3,4})p/) : null;
        const quality = qualityMatch ? qualityMatch[0] : 'Unknown';
        
        // Return direct download URL
        return [{
            source: 'Pixeldrain',
            quality: quality,
            url: `https://pixeldrain.com/api/file/${fileId}?download`,
            size: info.size || 0,
            filename: info.name
        }];
    } catch (err) {
        console.log('[PIXELDRAIN] Error:', err.message);
        return [];
    }
}

// =================================================================================
// HUBDRIVE EXTRACTOR
// =================================================================================

/**
 * Extract stream from HubDrive
 * Returns only direct download links
 */
export async function hubDriveExtractor(url, referer) {
    console.log('[HUBDRIVE] Extracting from:', url);
    
    try {
        const html = await fetchText(url, { Referer: referer });
        
        // Look for HubCloud Server button
        const hubcloudMatch = html.match(/<a[^>]*href=["']([^"']*hubcloud[^"']*)["'][^>]*>.*?\[HubCloud Server\]/is);
        
        if (hubcloudMatch && hubcloudMatch[1]) {
            const href = hubcloudMatch[1];
            console.log('[HUBDRIVE] Found HubCloud link:', href);
            
            // Return the URL for hubCloud processing
            return await hubCloudExtractor(href, url);
        }
        
        console.log('[HUBDRIVE] No HubCloud link found');
        return [];
    } catch (err) {
        console.log('[HUBDRIVE] Error:', err.message);
        return [];
    }
}

// =================================================================================
// HUBCLOUD EXTRACTOR
// =================================================================================

/**
 * Extract streams from HubCloud
 * Returns only direct download links (resolves all redirects)
 */
export async function hubCloudExtractor(url, referer) {
    console.log('[HUBCLOUD] Extracting from:', url);
    
    let currentUrl = url;
    
    // Domain fix
    if (currentUrl.includes("hubcloud.ink")) {
        currentUrl = currentUrl.replace("hubcloud.ink", "hubcloud.dad");
    }
    
    try {
        // Fetch initial page
        let html = await fetchText(currentUrl, { Referer: referer });
        
        // Check if we need to follow a JavaScript redirect
        if (!currentUrl.includes("hubcloud.php")) {
            const scriptUrlMatch = html.match(/var url = '([^']*)'/);
            if (scriptUrlMatch && scriptUrlMatch[1]) {
                currentUrl = scriptUrlMatch[1];
                console.log('[HUBCLOUD] Following script URL:', currentUrl);
                html = await fetchText(currentUrl, { Referer: url });
            }
        }
        
        // Extract file info
        const sizeMatch = html.match(/<i[^>]*id=["']size["'][^>]*>([^<]*)<\/i>/i);
        const sizeText = sizeMatch ? sizeMatch[1].trim() : '';
        const sizeBytes = parseSize(sizeText);
        
        const headerMatch = html.match(/<div[^>]*class=["'][^"']*card-header[^"']*["'][^>]*>([^<]*)<\/div>/i);
        const header = headerMatch ? headerMatch[1].trim() : '';
        const qualityMatch = header.match(/(\d{3,4})p/);
        const quality = qualityMatch ? qualityMatch[0] : 'Unknown';
        
        console.log('[HUBCLOUD] Size:', sizeText, 'Quality:', quality);
        
        // Extract download buttons
        const links = extractAllLinks(html);
        const results = [];
        
        for (const link of links) {
            const text = link.text;
            let href = link.href;
            
            // Skip certain services
            if (text.includes("ZipDisk") || text.includes("Telegram")) {
                console.log('[HUBCLOUD] Skipping:', text);
                continue;
            }
            
            const sourceBase = `HubCloud [${text}]`;
            
            // Check if this is a redirect link - resolve it!
            if (isRedirectLink(href)) {
                console.log('[HUBCLOUD] Resolving redirect link:', href.substring(0, 60) + '...');
                href = await resolveRedirectChain(href);
                console.log('[HUBCLOUD] Resolved to:', href.substring(0, 60) + '...');
            }
            
            // Direct download servers
            if (text.includes("Download File") || 
                text.includes("FSL") || 
                text.includes("S3") || 
                text.includes("10Gbps")) {
                console.log('[HUBCLOUD] Direct server:', text);
                results.push({
                    source: sourceBase,
                    quality: quality,
                    url: href,
                    size: sizeBytes
                });
            }
            // BuzzServer requires HEAD request to get final URL
            else if (text.includes("BuzzServer")) {
                console.log('[HUBCLOUD] Processing BuzzServer');
                const finalUrl = await fetchRedirectUrl(`${href}/download`, { Referer: href });
                if (finalUrl) {
                    console.log('[HUBCLOUD] BuzzServer URL:', finalUrl);
                    results.push({
                        source: sourceBase,
                        quality: quality,
                        url: finalUrl,
                        size: sizeBytes
                    });
                }
            }
            // Pixeldrain links
            else if (href.includes("pixeldra")) {
                console.log('[HUBCLOUD] Found Pixeldrain link');
                const pdResults = await pixelDrainExtractor(href);
                if (pdResults[0]) results.push(pdResults[0]);
            }
            // Any other link with download keyword
            else if (text.match(/download|server|link/i)) {
                console.log('[HUBCLOUD] Other download link:', text);
                results.push({
                    source: sourceBase,
                    quality: quality,
                    url: href,
                    size: sizeBytes
                });
            }
        }
        
        console.log(`[HUBCLOUD] Extracted ${results.length} direct download links`);
        return results;
        
    } catch (err) {
        console.log('[HUBCLOUD] Error:', err.message);
        return [];
    }
}

// =================================================================================
// HUBCDN EXTRACTOR
// =================================================================================

/**
 * Extract from HubCdn
 * Returns only direct download links (resolves all redirects)
 */
export async function hubCdnExtractor(url, referer) {
    console.log('[HUBCDN] Extracting from:', url);
    
    try {
        const html = await fetchText(url, { Referer: referer });
        
        // Extract size and quality
        const sizeMatch = html.match(/<i[^>]*id=["']size["'][^>]*>([^<]*)<\/i>/i);
        const sizeText = sizeMatch ? sizeMatch[1].trim() : '';
        const sizeBytes = parseSize(sizeText);
        
        const qualityMatch = html.match(/(\d{3,4})p/);
        const quality = qualityMatch ? qualityMatch[0] : 'Unknown';
        
        console.log('[HUBCDN] Size:', sizeText, 'Quality:', quality);
        
        // Extract download links
        const links = extractAllLinks(html);
        const results = [];
        
        for (const link of links) {
            const text = link.text;
            let href = link.href;
            
            // Skip unwanted services
            if (text.includes("Telegram") || text.includes("ZipDisk")) {
                continue;
            }
            
            if (text.includes("Download") || text.includes("Server")) {
                console.log('[HUBCDN] Found download link:', text);
                
                // Resolve redirect if needed
                if (isRedirectLink(href)) {
                    console.log('[HUBCDN] Resolving redirect...');
                    href = await resolveRedirectChain(href);
                    console.log('[HUBCDN] Resolved to:', href.substring(0, 60) + '...');
                }
                
                results.push({
                    source: 'HubCdn',
                    quality: quality,
                    url: href,
                    size: sizeBytes
                });
            }
        }
        
        console.log(`[HUBCDN] Extracted ${results.length} direct download links`);
        return results;
    } catch (err) {
        console.log('[HUBCDN] Error:', err.message);
        return [];
    }
}

// =================================================================================
// HUBSTREAM EXTRACTOR
// =================================================================================

/**
 * Extract from Hubstream
 * Returns only direct download links (resolves all redirects)
 */
export async function hubstreamExtractor(url, referer) {
    console.log('[HUBSTREAM] Extracting from:', url);
    
    try {
        const html = await fetchText(url, { Referer: referer });
        
        // Extract quality from title or content
        const qualityMatch = html.match(/(\d{3,4})p/);
        const quality = qualityMatch ? qualityMatch[0] : 'Unknown';
        
        // Look for direct download buttons
        const downloadRegex = /<a[^>]*href=["']([^"']*)["'][^>]*>.*?(?:Download|Server|Direct)/gis;
        const results = [];
        let match;
        
        while ((match = downloadRegex.exec(html)) !== null) {
            let href = match[1];
            if (href && href.startsWith('http')) {
                console.log('[HUBSTREAM] Found download link');
                
                // Resolve redirect if needed
                if (isRedirectLink(href)) {
                    console.log('[HUBSTREAM] Resolving redirect...');
                    href = await resolveRedirectChain(href);
                    console.log('[HUBSTREAM] Resolved to:', href.substring(0, 60) + '...');
                }
                
                results.push({
                    source: 'Hubstream',
                    quality: quality,
                    url: href,
                    size: 0
                });
            }
        }
        
        console.log(`[HUBSTREAM] Extracted ${results.length} direct download links`);
        return results;
    } catch (err) {
        console.log('[HUBSTREAM] Error:', err.message);
        return [];
    }
}

// =================================================================================
// AUTO EXTRACTOR
// =================================================================================

/**
 * Auto-detect the type of URL and route to the appropriate extractor
 * Always returns an array of stream objects with metadata
 */
export async function autoExtract(url, referer = '') {
    console.log('[AUTO] Detecting extractor for:', url.substring(0, 80) + '...');
    
    // Check if it's already a direct link
    if (isDirectLink(url)) {
        console.log('[AUTO] Already a direct link');
        return [{
            source: 'Direct',
            quality: 'Unknown',
            url: url,
            size: 0
        }];
    }
    
    // Pixeldrain
    if (url.includes('pixeldrain')) {
        return await pixelDrainExtractor(url);
    }
    
    // HubCloud
    if (url.includes('hubcloud')) {
        return await hubCloudExtractor(url, referer);
    }
    
    // HubDrive
    if (url.includes('hubdrive')) {
        return await hubDriveExtractor(url, referer);
    }
    
    // HubCdn
    if (url.includes('hubcdn')) {
        return await hubCdnExtractor(url, referer);
    }
    
    // Hubstream
    if (url.includes('hubstream')) {
        return await hubstreamExtractor(url, referer);
    }
    
    // Encoded redirects (gdtot, techyboy, etc.)
    if (url.includes('gdtot') || url.includes('techyboy')) {
        const directUrl = await getRedirectLinks(url);
        return [{
            source: 'Redirect',
            quality: 'Unknown',
            url: directUrl,
            size: 0
        }];
    }
    
    // Check if it's a redirect that needs resolving
    if (isRedirectLink(url)) {
        console.log('[AUTO] Resolving redirect chain...');
        const directUrl = await resolveRedirectChain(url);
        return [{
            source: 'Redirect',
            quality: 'Unknown',
            url: directUrl,
            size: 0
        }];
    }
    
    console.log('[AUTO] No specific extractor found, trying generic redirect resolution');
    const directUrl = await resolveRedirectChain(url);
    return [{
        source: 'Generic',
        quality: 'Unknown',
        url: directUrl,
        size: 0
    }];
}
