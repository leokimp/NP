/**
 * DL.PHP Debug - Test dl.php?link= redirect chains
 * Usage: node dlphp-debug.js "YOUR_URL_HERE"
 * 
 * Example:
 * node dlphp-debug.js "https://gamerxyt.com/dl.php?link=https://video-downloads.googleusercontent.com/..."
 */

// Get URL from command line argument
const testUrl = process.argv[2];

if (!testUrl) {
    console.log('❌ Error: No URL provided');
    console.log('');
    console.log('Usage: node dlphp-debug.js "YOUR_URL_HERE"');
    console.log('');
    console.log('Example:');
    console.log('  node dlphp-debug.js "https://gamerxyt.com/dl.php?link=..."');
    process.exit(1);
}

console.log('🔍 Testing DL.PHP URL:', testUrl);
console.log('');

const HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.5'
};

// Helper: ROT13 decode
function rot13(str) {
    return str.replace(/[a-zA-Z]/g, char => {
        const start = char <= 'Z' ? 65 : 97;
        return String.fromCharCode(start + (char.charCodeAt(0) - start + 13) % 26);
    });
}

// Helper: Safe base64 decode
function safeAtob(str) {
    try {
        return Buffer.from(str, 'base64').toString('utf8');
    } catch (e) {
        return '';
    }
}

// Helper: Safe base64 encode
function safeBtoa(str) {
    try {
        return Buffer.from(str, 'utf8').toString('base64');
    } catch (e) {
        return '';
    }
}

async function debugUrl(url, depth = 0, maxDepth = 10) {
    if (depth > maxDepth) {
        console.log('⚠️  Max depth reached');
        return null;
    }
    
    const indent = '  '.repeat(depth);
    console.log(`${indent}[Hop ${depth + 1}] Fetching...`);
    console.log(`${indent}URL: ${url.substring(0, 100)}${url.length > 100 ? '...' : ''}`);
    
    try {
        const response = await fetch(url, {
            method: 'GET',
            headers: HEADERS,
            redirect: 'manual'
        });
        
        console.log(`${indent}Status: ${response.status} ${response.statusText}`);
        
        // ============================================================
        // CHECK 1: HTTP Redirect (301/302)
        // ============================================================
        const location = response.headers.get('location') || response.headers.get('Location');
        if (location) {
            console.log(`${indent}➜ HTTP Redirect to: ${location.substring(0, 80)}${location.length > 80 ? '...' : ''}`);
            console.log('');
            
            // Handle relative URLs
            let nextUrl = location;
            if (!location.startsWith('http')) {
                const base = new URL(url);
                nextUrl = base.origin + location;
            }
            
            // Follow redirect
            return await debugUrl(nextUrl, depth + 1, maxDepth);
        }
        
        // No redirect - get content
        const contentType = response.headers.get('content-type') || '';
        const contentLength = response.headers.get('content-length') || 'unknown';
        
        console.log(`${indent}Content-Type: ${contentType}`);
        console.log(`${indent}Content-Length: ${contentLength}`);
        
        // ============================================================
        // CHECK 2: Direct Download File
        // ============================================================
        if (contentType.includes('video/') || 
            contentType.includes('application/octet-stream') ||
            contentType.includes('application/x-matroska')) {
            console.log('');
            console.log('✅ SUCCESS! This is a direct download link');
            console.log(`📦 File size: ${contentLength} bytes`);
            console.log(`🎬 Type: ${contentType}`);
            console.log('');
            console.log('Final URL:', url);
            return url;
        }
        
        // ============================================================
        // CHECK 3: HTML Page - Extract links/redirects
        // ============================================================
        if (contentType.includes('text/html')) {
            const html = await response.text();
            console.log(`${indent}Response: HTML page (${html.length} chars)`);
            console.log('');
            
            // ------------------------------------------------------------
            // METHOD A: Encoded Data (like gdtot/techyboy)
            // ------------------------------------------------------------
            console.log(`${indent}🔐 Checking for encoded data...`);
            const regex = /s\('o','([A-Za-z0-9+/=]+)'|ck\('_wp_http_\d+','([^']+)'/g;
            let combinedString = '';
            let match;
            
            while ((match = regex.exec(html)) !== null) {
                const extractedValue = match[1] || match[2];
                if (extractedValue) combinedString += extractedValue;
            }
            
            if (combinedString) {
                console.log(`${indent}   ✓ Found encoded data (length: ${combinedString.length})`);
                try {
                    // Decode: base64(base64(rot13(base64(data))))
                    const decoded1 = safeAtob(combinedString);
                    console.log(`${indent}   Step 1: base64 decode -> ${decoded1.length} chars`);
                    
                    const decoded2 = safeAtob(decoded1);
                    console.log(`${indent}   Step 2: base64 decode -> ${decoded2.length} chars`);
                    
                    const decoded3 = rot13(decoded2);
                    console.log(`${indent}   Step 3: rot13 decode -> ${decoded3.length} chars`);
                    
                    const decoded4 = safeAtob(decoded3);
                    console.log(`${indent}   Step 4: base64 decode -> ${decoded4.length} chars`);
                    
                    const jsonObject = JSON.parse(decoded4);
                    console.log(`${indent}   ✓ Decoded JSON:`, Object.keys(jsonObject));
                    
                    const encodedUrl = safeAtob(jsonObject.o || '').trim();
                    
                    if (encodedUrl) {
                        console.log(`${indent}   ✅ Decoded URL: ${encodedUrl.substring(0, 80)}...`);
                        console.log('');
                        return await debugUrl(encodedUrl, depth + 1, maxDepth);
                    }
                    
                    // Alternative path
                    const data = safeBtoa(jsonObject.data || '').trim();
                    const wpHttp = (jsonObject.blog_url || '').trim();
                    
                    if (wpHttp && data) {
                        console.log(`${indent}   ✓ Found wpHttp path`);
                        const wpUrl = `${wpHttp}?re=${data}`;
                        console.log(`${indent}   Fetching: ${wpUrl}`);
                        console.log('');
                        return await debugUrl(wpUrl, depth + 1, maxDepth);
                    }
                } catch (decodeErr) {
                    console.log(`${indent}   ❌ Decode failed: ${decodeErr.message}`);
                }
            } else {
                console.log(`${indent}   ✗ No encoded data found`);
            }
            console.log('');
            
            // ------------------------------------------------------------
            // METHOD B: Download Buttons/Links (both <a> and <button>)
            // ------------------------------------------------------------
            console.log(`${indent}🔘 Checking for download buttons...`);
            
            // First, check for download buttons with specific IDs/classes
            const buttonIdMatch = html.match(/<button[^>]*id=["']?(downloadbtn|download-btn|btn-download)[^"']*["']?[^>]*>/i);
            if (buttonIdMatch) {
                console.log(`${indent}   ✓ Found download button element`);
                
                // Look for onclick handlers or data attributes
                const onclickMatch = html.match(/onclick=["']([^"']*download[^"']*)["']/i);
                if (onclickMatch) {
                    console.log(`${indent}     Has onclick handler`);
                }
                
                // Try to extract the download URL from JavaScript
                const urlPatterns = [
                    /var\s+(?:download_?url|file_?url|link)\s*=\s*["']([^"']+)["']/i,
                    /location\.href\s*=\s*["']([^"']*(?:googleusercontent|pixeldrain|drive\.google)[^"']*)["']/i,
                    /window\.open\(["']([^"']*(?:googleusercontent|pixeldrain|drive\.google)[^"']*)["']/i,
                ];
                
                for (const pattern of urlPatterns) {
                    const urlMatch = html.match(pattern);
                    if (urlMatch && urlMatch[1]) {
                        console.log(`${indent}   ✅ Extracted download URL from JavaScript`);
                        console.log(`${indent}     → ${urlMatch[1].substring(0, 80)}${urlMatch[1].length > 80 ? '...' : ''}`);
                        
                        if (urlMatch[1].includes('pixeldrain')) {
                            console.log(`${indent}     🎯 Pixeldrain detected`);
                        } else if (urlMatch[1].includes('googleusercontent')) {
                            console.log(`${indent}     🎯 Google download detected`);
                        }
                        
                        console.log('');
                        return urlMatch[1];
                    }
                }
            }
            
            // Second, check for regular <a> links
            const linkRegex = /<a[^>]*href=["']([^"']*)["'][^>]*>([^<]*)</gi;
            const links = [];
            let linkMatch;
            
            while ((linkMatch = linkRegex.exec(html)) !== null) {
                const href = linkMatch[1];
                const text = linkMatch[2];
                
                if (href && text && href.startsWith('http')) {
                    links.push({ href, text });
                }
            }
            
            console.log(`${indent}   Found ${links.length} <a> links`);
            
            for (const link of links) {
                const text = link.text.trim();
                const href = link.href;
                
                // Skip dl.php links (would create infinite loop)
                if (href.includes('dl.php?link=')) {
                    console.log(`${indent}   ⊙ Skipping dl.php link: ${text}`);
                    continue;
                }
                
                // Skip unwanted services
                if (text.match(/telegram|zipdisk|ads/i)) {
                    console.log(`${indent}   ⊙ Skipping: ${text}`);
                    continue;
                }
                
                // Look for download keywords
                if (text.match(/download|get file|click here|direct link|server|get link/i)) {
                    console.log(`${indent}   ✓ Found download link: "${text}"`);
                    console.log(`${indent}     → ${href.substring(0, 80)}${href.length > 80 ? '...' : ''}`);
                    
                    // Check if it's a known hosting service
                    if (href.includes('pixeldrain')) {
                        console.log(`${indent}     🎯 Pixeldrain detected`);
                    } else if (href.includes('googleusercontent')) {
                        console.log(`${indent}     🎯 Google download detected`);
                    }
                    
                    console.log('');
                    return await debugUrl(href, depth + 1, maxDepth);
                }
            }
            
            console.log(`${indent}   ✗ No download buttons/links found`);
            console.log('');
            
            // ------------------------------------------------------------
            // METHOD C: Meta Refresh
            // ------------------------------------------------------------
            console.log(`${indent}↪️  Checking for meta refresh...`);
            const metaMatch = html.match(/<meta[^>]*http-equiv=["']refresh["'][^>]*content=["'][^"']*url=([^"'\s]+)/i);
            if (metaMatch) {
                const metaUrl = metaMatch[1];
                console.log(`${indent}   ✓ Found meta refresh: ${metaUrl}`);
                console.log('');
                return await debugUrl(metaUrl, depth + 1, maxDepth);
            }
            console.log(`${indent}   ✗ No meta refresh found`);
            console.log('');
            
            // ------------------------------------------------------------
            // METHOD D: JavaScript Redirect (but skip ad domains)
            // ------------------------------------------------------------
            console.log(`${indent}↪️  Checking for JS redirect...`);
            const jsMatch = html.match(/(?:window\.location(?:\.href)?|location\.href|location)\s*=\s*["']([^"']+)["']/);
            if (jsMatch) {
                const jsUrl = jsMatch[1];
                
                // Check if it looks like an ad redirect (common ad domains)
                const adDomains = [
                    'bonuscaf.com',
                    'urbanheadline.com',
                    'propellerads.com',
                    'adsterra.com',
                    'popads.net',
                    'popcash.net',
                    'blogspot.com', // Often used for ad redirects
                ];
                
                const isAdDomain = adDomains.some(domain => jsUrl.includes(domain));
                
                if (isAdDomain) {
                    console.log(`${indent}   ⚠️  Found JS redirect to ad domain (skipping): ${jsUrl.substring(0, 60)}...`);
                    console.log(`${indent}   Continuing to search on this page instead...`);
                } else {
                    console.log(`${indent}   ✓ Found JS redirect: ${jsUrl}`);
                    console.log('');
                    return await debugUrl(jsUrl, depth + 1, maxDepth);
                }
            } else {
                console.log(`${indent}   ✗ No JS redirect found`);
            }
            console.log('');
            
            // ------------------------------------------------------------
            // METHOD E: Direct URL in HTML (regex search)
            // ------------------------------------------------------------
            console.log(`${indent}🔍 Checking for direct URLs in HTML...`);
            
            // Look for Google download URLs (most common)
            const googleMatch = html.match(/https?:\/\/video-downloads\.googleusercontent\.com\/[^\s"'<>)]+/);
            if (googleMatch) {
                const googleUrl = googleMatch[0];
                console.log(`${indent}   ✅ Found Google download URL: ${googleUrl.substring(0, 80)}...`);
                console.log('');
                return googleUrl;
            }
            
            // Look for other hosting URLs
            const directUrlMatch = html.match(/https?:\/\/[^\s"'<>]+(?:googleusercontent|drive\.google|pixeldrain)[^\s"'<>)]*/);
            if (directUrlMatch) {
                const directUrl = directUrlMatch[0];
                console.log(`${indent}   ✓ Found direct URL: ${directUrl.substring(0, 80)}...`);
                console.log('');
                return directUrl;
            }
            
            console.log(`${indent}   ✗ No direct URLs found`);
            console.log('');
            
            // Show HTML preview for debugging
            console.log(`${indent}📄 HTML Preview (first 500 chars):`);
            console.log(`${indent}${'─'.repeat(60)}`);
            const preview = html.substring(0, 500)
                .split('\n')
                .map(line => `${indent}${line}`)
                .join('\n');
            console.log(preview);
            console.log(`${indent}${'─'.repeat(60)}`);
            console.log('');
            
            console.log('❌ Could not extract download link from this page');
            return null;
        } else {
            console.log('');
            console.log(`⚠️  Unknown content type: ${contentType}`);
            const text = await response.text();
            console.log('Response preview:', text.substring(0, 300));
        }
        
        return url;
        
    } catch (error) {
        console.log(`${indent}❌ Error: ${error.message}`);
        console.log(`${indent}   Stack: ${error.stack}`);
        return null;
    }
}

// Main execution
console.log('═'.repeat(70));
console.log('  DEBUG: Tracing dl.php?link= Redirect Chain');
console.log('═'.repeat(70));
console.log('');

debugUrl(testUrl).then(finalUrl => {
    console.log('');
    console.log('═'.repeat(70));
    if (finalUrl) {
        console.log('✅ Analysis complete');
        console.log('');
        console.log('Final URL:', finalUrl);
        console.log('');
        
        // Check what type of URL we ended up with
        if (finalUrl.includes('pixeldrain')) {
            console.log('💡 Next step: Use pixelDrainExtractor() to get download link');
        } else if (finalUrl.includes('googleusercontent')) {
            console.log('💡 This is a direct Google download link - ready to use');
        } else if (finalUrl.includes('drive.google')) {
            console.log('💡 This is a Google Drive link');
        } else {
            console.log('💡 Check if this URL needs further processing');
        }
    } else {
        console.log('❌ Failed to resolve URL');
        console.log('');
        console.log('Possible reasons:');
        console.log('  • Page requires cookies/session');
        console.log('  • Page uses client-side JavaScript (needs headless browser)');
        console.log('  • Unknown redirect pattern');
        console.log('  • Max depth reached (increase maxDepth)');
    }
    console.log('═'.repeat(70));
}).catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
});
