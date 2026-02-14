// HDHub4u Provider - Stream Extractors
// src/hdhub4u/extractors.js

import { MAIN_URL, HEADERS, rot13, safeAtob, safeBtoa, extractText, extractAttr, extractAllLinks, parseSize } from './config.js';
import { fetchWithRetry, fetchRedirectUrl, fetchJSON, fetchText } from './http.js';

// =================================================================================
// REDIRECT LINK DECODER
// =================================================================================

/**
 * Decode redirect links (gdtot, techyboy, etc.)
 * These use base64 + rot13 encoding
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
 * Example: https://pixeldrain.com/u/abc123
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
 * HubDrive usually has a button that redirects to actual link
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
 * HubCloud provides multiple download servers (FSL, S3, BuzzServer, etc.)
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
            const href = link.href;
            
            // Skip certain services
            if (text.includes("ZipDisk") || text.includes("Telegram")) {
                console.log('[HUBCLOUD] Skipping:', text);
                continue;
            }
            
            const sourceBase = `HubCloud [${text}]`;
            
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
        }
        
        console.log(`[HUBCLOUD] Extracted ${results.length} streams`);
        return results;
        
    } catch (err) {
        console.log('[HUBCLOUD] Error:', err.message);
        return [];
    }
}

// =================================================================================
// All functions are already exported above with "export async function"
// No need to export them again here
// =================================================================================
