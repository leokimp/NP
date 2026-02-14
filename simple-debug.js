/**
 * Simple Debug - Test a pixel.hubcdn.fans URL
 * Usage: node simple-debug.js "YOUR_URL_HERE"
 */

// Get URL from command line argument
const testUrl = process.argv[2] || 'https://pixel.hubcdn.fans/?id=786ba3337f705dac06259b6b09233d505d99e59966e63dcdfb008ac8ad07519ef01bf5ca07a55ae0e6deefdaad97cf51e80e4af92c3b2a67198c1d618c07ae7460ab70723377427a2142a61fa3eed62afb270f76256c8c0e9849e8b2f2f75b66::89d0f9a79573933e94149a66552c6c18';

console.log('🔍 Testing URL:', testUrl);
console.log('');

const HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36'
};

async function debugUrl(url, depth = 0, maxDepth = 5) {
    if (depth > maxDepth) {
        console.log('⚠️  Max depth reached');
        return;
    }
    
    const indent = '  '.repeat(depth);
    console.log(`${indent}[Step ${depth}] Fetching...`);
    console.log(`${indent}URL: ${url.substring(0, 120)}${url.length > 120 ? '...' : ''}`);
    
    try {
        const response = await fetch(url, {
            method: 'GET',
            headers: HEADERS,
            redirect: 'manual'
        });
        
        console.log(`${indent}Status: ${response.status} ${response.statusText}`);
        
        // Check for redirect
        const location = response.headers.get('location') || response.headers.get('Location');
        if (location) {
            console.log(`${indent}➜ Redirect to: ${location}`);
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
        
        // No redirect - check content
        const contentType = response.headers.get('content-type') || '';
        const contentLength = response.headers.get('content-length') || 'unknown';
        
        console.log(`${indent}Content-Type: ${contentType}`);
        console.log(`${indent}Content-Length: ${contentLength}`);
        
        // Check if it's a direct file
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
        
        // It's HTML - check for redirects in content
        if (contentType.includes('text/html')) {
            const html = await response.text();
            console.log(`${indent}Response: HTML page (${html.length} chars)`);
            
            // Check for meta refresh
            const metaMatch = html.match(/<meta[^>]*http-equiv=["']refresh["'][^>]*content=["'][^"']*url=([^"']+)["']/i);
            if (metaMatch) {
                console.log(`${indent}Found meta refresh: ${metaMatch[1]}`);
                console.log('');
                return await debugUrl(metaMatch[1], depth + 1, maxDepth);
            }
            
            // Check for JS redirect
            const jsMatch = html.match(/(?:window\.location|location\.href)\s*=\s*["']([^"']+)["']/);
            if (jsMatch) {
                console.log(`${indent}Found JS redirect: ${jsMatch[1]}`);
                console.log('');
                return await debugUrl(jsMatch[1], depth + 1, maxDepth);
            }
            
            // Check for download button/link
            const downloadMatch = html.match(/<a[^>]*href=["']([^"']*(?:download|api\/file)[^"']*)["']/i);
            if (downloadMatch) {
                console.log(`${indent}Found download link in HTML: ${downloadMatch[1]}`);
                console.log('');
                
                let downloadUrl = downloadMatch[1];
                if (!downloadUrl.startsWith('http')) {
                    const base = new URL(url);
                    downloadUrl = base.origin + downloadUrl;
                }
                
                return await debugUrl(downloadUrl, depth + 1, maxDepth);
            }
            
            // Show a preview of the HTML
            console.log('');
            console.log(`${indent}HTML Preview (first 300 chars):`);
            console.log(`${indent}---`);
            console.log(html.substring(0, 300).split('\n').map(line => `${indent}${line}`).join('\n'));
            console.log(`${indent}---`);
            console.log('');
            console.log('❌ Could not find download link in HTML');
        } else {
            console.log('');
            console.log(`⚠️  Unknown content type: ${contentType}`);
            const text = await response.text();
            console.log('Response preview:', text.substring(0, 200));
        }
        
        return url;
        
    } catch (error) {
        console.log(`${indent}❌ Error: ${error.message}`);
        return null;
    }
}

console.log('════════════════════════════════════════════════════');
console.log('  DEBUG: Tracing pixel.hubcdn.fans Redirect Chain');
console.log('════════════════════════════════════════════════════');
console.log('');

debugUrl(testUrl).then(finalUrl => {
    console.log('');
    console.log('════════════════════════════════════════════════════');
    if (finalUrl) {
        console.log('✅ Analysis complete');
        console.log('');
        console.log('Final URL:', finalUrl);
    } else {
        console.log('❌ Failed to resolve URL');
    }
    console.log('════════════════════════════════════════════════════');
}).catch(err => {
    console.error('Fatal error:', err);
});
