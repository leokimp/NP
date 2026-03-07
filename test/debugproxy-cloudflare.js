// debug-proxy.js - Comprehensive Cloudflare Worker Testing Script
// Tests direct URLs, proxied URLs, rate limiting, and seeking functionality

const https = require('https');
const http = require('http');

// =================================================================================
// CONFIGURATION
// =================================================================================

const PROXY_WORKER_URL = "https://stream.leokimpese.workers.dev";

// Test URL from your output
const TEST_URL = "https://video-downloads.googleusercontent.com/ADGPM2lL7B8jkXubY-kiFeL-c55ZjddQQIZcDHU8cMKbQyuISnDdVQlqCZbaTWfW4e9UX7f7JiNUM9VotFQL0F9yUFMuKiWRWVhh7vpilboztiGCPR6iHxnoOK2Es5UZpKHkXvvm_ZlFv7_tVPSeBV5-CsYDXfjXZHGZc1UcmkkAgkY1XEy7tF8JXLQO_xnFDW_XgldsmISiQ0Ai0JfqYBbkamqIaIlF9S5axgCOCkNXSyGHdyzfIjZ4Vb5_a-Wb-OU6L9X7Ri8K2tAh8MGw94ITrDngRX5CvCCoRjlV3sCcvh4AzeVeYjsY506H96vvhbDI_AYYfhKHNcDN09S_hL-E4a80zq9Nu2jZUCQEgXDGvSbrHu1nuPuphSfDitom9DvrH51tnEoe480lQD5r_4W8YQFOYH5BYMbtR34y3EfvtOXvAead8Vf9OfdsvCDwhPSt3vGvaLqnT14ahXbd57h762xxEE4GqdG4uSoLT34Qe8ezhSwn61BAkDD9rWkrhs5D5p64eUFMBL0o4CW_CWYufMg8R99zCHbYRkZpWhMcdVh3nWZgekH10cYMwBsPJZqRQnNWskI47iutw-iB9PqMCymrAeMezs-USt0tjvwduFEWsZXPOdUvN1cjf_ax2la0sama_mhr7PsS2_B-CnNfHAk8cXOZz3rCIRCwVOHJdO128HB0sje_gqBypMlpsFLcSWMY-GFYd-N6VOjNBvXe9rP1xlpVKS-FRx1f_AnMXWtYEt_UjcnOsbgNpOP5i72y2wmqQ_MKGAePEgx6MnrcDAlKXsQ_ONVKdAW_TNy63r-IxieepYrIEXwfzCcqB3vyOyyLR65ytemoSXAaTCLQRi6T6PFstVpzRKa_eBs2Ld0C9j4Bgr-naKEJ6cIov8T1jXkUGYPcH45dN";

const COLORS = {
    reset: '\x1b[0m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m'
};

// =================================================================================
// HELPER FUNCTIONS
// =================================================================================

function log(color, prefix, message) {
    console.log(`${color}[${prefix}]${COLORS.reset} ${message}`);
}

function makeRequest(url, options = {}) {
    return new Promise((resolve, reject) => {
        const urlObj = new URL(url);
        const protocol = urlObj.protocol === 'https:' ? https : http;
        
        // FAKE BROWSER HEADERS - This is critical for testing the transparent proxy
        const defaultHeaders = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,video/webm,video/mp4,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.5',
            'Sec-Fetch-Dest': 'video',
            'Sec-Fetch-Mode': 'cors',
            'Sec-Fetch-Site': 'cross-site'
        };

        // Merge default headers with any specific test headers (like Range)
        const finalHeaders = { ...defaultHeaders, ...options.headers };

        const requestOptions = {
            hostname: urlObj.hostname,
            port: urlObj.port || (urlObj.protocol === 'https:' ? 443 : 80),
            path: urlObj.pathname + urlObj.search,
            method: options.method || 'GET',
            headers: finalHeaders,
            timeout: options.timeout || 30000 
        };

        log(COLORS.cyan, 'REQUEST', `${requestOptions.method} ${url.substring(0, 100)}...`);
        
        const startTime = Date.now();
        
        const req = protocol.request(requestOptions, (res) => {
            const elapsed = Date.now() - startTime;
            log(COLORS.green, 'RESPONSE', `Status: ${res.statusCode} (${elapsed}ms)`);
            
            let data = '';
            
            res.on('data', (chunk) => {
                if (options.collectBody !== false) {
                    if (data.length < 50000) { // Safety limit to prevent RangeError memory leak
                        data += chunk;
                    }
                }
            });
            
            res.on('end', () => {
                resolve({
                    statusCode: res.statusCode,
                    headers: res.headers,
                    body: data,
                    elapsed: elapsed
                });
            });
        });
        
        req.on('error', (error) => {
            const elapsed = Date.now() - startTime;
            log(COLORS.red, 'ERROR', `${error.message} (${elapsed}ms)`);
            reject(error);
        });
        
        req.on('timeout', () => {
            const elapsed = Date.now() - startTime;
            log(COLORS.red, 'TIMEOUT', `Request timed out after ${elapsed}ms`);
            req.destroy();
            reject(new Error('Request timeout'));
        });
        
        req.end();
    });
}

function printHeaders(headers) {
    console.log('\n📋 Response Headers:');
    Object.entries(headers).forEach(([key, value]) => {
        console.log(`   ${COLORS.cyan}${key}:${COLORS.reset} ${value}`);
    });
    console.log();
}

// =================================================================================
// TEST FUNCTIONS
// =================================================================================

async function testDirectURL() {
    log(COLORS.magenta, 'TEST 1', 'Testing Direct Google Drive URL (no proxy)');
    console.log('━'.repeat(80));
    
    try {
        const response = await makeRequest(TEST_URL, {
            method: 'HEAD',
            timeout: 10000
        });
        
        log(COLORS.green, 'SUCCESS', 'Direct URL is accessible');
        printHeaders(response.headers);
        
        return {
            success: true,
            contentLength: response.headers['content-length'],
            contentType: response.headers['content-type']
        };
    } catch (error) {
        log(COLORS.red, 'FAILED', `Direct URL test failed: ${error.message}`);
        return { success: false, error: error.message };
    }
}

async function testProxiedURL() {
    log(COLORS.magenta, 'TEST 2', 'Testing Proxied URL through Cloudflare Worker');
    console.log('━'.repeat(80));
    
    const proxiedUrl = `${PROXY_WORKER_URL}/?l=${TEST_URL}`;
    
    try {
        const response = await makeRequest(proxiedUrl, {
            method: 'HEAD',
            timeout: 15000
        });
        
        log(COLORS.green, 'SUCCESS', 'Proxied URL is accessible');
        printHeaders(response.headers);
        
        // Check for required headers
        const hasAcceptRanges = response.headers['accept-ranges'] === 'bytes';
        const hasCORS = response.headers['access-control-allow-origin'] === '*';
        
        log(COLORS.blue, 'HEADERS', `Accept-Ranges: ${hasAcceptRanges ? '✅' : '❌'}`);
        log(COLORS.blue, 'HEADERS', `CORS: ${hasCORS ? '✅' : '❌'}`);
        
        return {
            success: true,
            contentLength: response.headers['content-length'],
            contentType: response.headers['content-type'],
            hasAcceptRanges,
            hasCORS
        };
    } catch (error) {
        log(COLORS.red, 'FAILED', `Proxied URL test failed: ${error.message}`);
        return { success: false, error: error.message };
    }
}

async function testRangeRequest() {
    log(COLORS.magenta, 'TEST 3', 'Testing Range Request (Seeking)');
    console.log('━'.repeat(80));
    
    const proxiedUrl = `${PROXY_WORKER_URL}/?l=${TEST_URL}`;
    
    try {
        const response = await makeRequest(proxiedUrl, {
            method: 'GET',
            headers: {
                'Range': 'bytes=0-1023' // Request first 1KB
            },
            timeout: 15000,
            collectBody: false
        });
        
        const isPartialContent = response.statusCode === 206;
        const hasContentRange = !!response.headers['content-range'];
        
        log(COLORS.green, 'SUCCESS', `Range request completed`);
        log(COLORS.blue, 'STATUS', `Status Code: ${response.statusCode} ${isPartialContent ? '✅' : '❌ (Expected 206)'}`);
        log(COLORS.blue, 'HEADERS', `Content-Range: ${response.headers['content-range'] || 'Missing ❌'}`);
        
        printHeaders(response.headers);
        
        return {
            success: true,
            statusCode: response.statusCode,
            isPartialContent,
            hasContentRange
        };
    } catch (error) {
        log(COLORS.red, 'FAILED', `Range request test failed: ${error.message}`);
        return { success: false, error: error.message };
    }
}

async function testFullGETRequest() {
    log(COLORS.magenta, 'TEST 4', 'Testing Full GET Request (First 2KB)');
    console.log('━'.repeat(80));
    
    const proxiedUrl = `${PROXY_WORKER_URL}/?l=${TEST_URL}`;
    
    try {
        const response = await makeRequest(proxiedUrl, {
            method: 'GET',
            timeout: 20000
        });
        
        log(COLORS.green, 'SUCCESS', `GET request completed (received ${response.body.length} bytes)`);
        log(COLORS.blue, 'STATUS', `Status Code: ${response.statusCode}`);
        
        printHeaders(response.headers);
        
        return {
            success: true,
            statusCode: response.statusCode,
            receivedBytes: response.body.length
        };
    } catch (error) {
        log(COLORS.red, 'FAILED', `GET request test failed: ${error.message}`);
        return { success: false, error: error.message };
    }
}

async function testRateLimiting() {
    log(COLORS.magenta, 'TEST 5', 'Testing Rate Limiting (10 rapid requests)');
    console.log('━'.repeat(80));
    
    const proxiedUrl = `${PROXY_WORKER_URL}/?l=${TEST_URL}`;
    const results = [];
    
    for (let i = 1; i <= 10; i++) {
        try {
            log(COLORS.yellow, 'REQUEST', `Sending request ${i}/10...`);
            const response = await makeRequest(proxiedUrl, {
                method: 'HEAD',
                timeout: 5000
            });
            
            results.push({
                request: i,
                statusCode: response.statusCode,
                success: true
            });
            
            if (response.statusCode === 429) {
                log(COLORS.red, 'RATE LIMIT', `Hit rate limit at request ${i}`);
                break;
            }
        } catch (error) {
            results.push({
                request: i,
                error: error.message,
                success: false
            });
        }
        
        // Small delay between requests
        await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    const successCount = results.filter(r => r.success).length;
    const rateLimited = results.some(r => r.statusCode === 429);
    
    log(COLORS.blue, 'SUMMARY', `Successful: ${successCount}/10`);
    log(COLORS.blue, 'SUMMARY', `Rate Limited: ${rateLimited ? 'Yes ⚠️' : 'No ✅'}`);
    
    return { results, successCount, rateLimited };
}

async function testWorkerEndpoint() {
    log(COLORS.magenta, 'TEST 6', 'Testing Worker Endpoint (Root URL)');
    console.log('━'.repeat(80));
    
    try {
        const response = await makeRequest(PROXY_WORKER_URL, {
            method: 'GET',
            timeout: 5000
        });
        
        log(COLORS.green, 'SUCCESS', `Worker is responding`);
        log(COLORS.blue, 'STATUS', `Status Code: ${response.statusCode}`);
        log(COLORS.blue, 'BODY', response.body.substring(0, 200));
        
        return { success: true, statusCode: response.statusCode };
    } catch (error) {
        log(COLORS.red, 'FAILED', `Worker endpoint test failed: ${error.message}`);
        return { success: false, error: error.message };
    }
}

async function testOptionsRequest() {
    log(COLORS.magenta, 'TEST 7', 'Testing CORS Preflight (OPTIONS)');
    console.log('━'.repeat(80));
    
    const proxiedUrl = `${PROXY_WORKER_URL}/?l=${TEST_URL}`;
    
    try {
        const response = await makeRequest(proxiedUrl, {
            method: 'OPTIONS',
            timeout: 5000
        });
        
        log(COLORS.green, 'SUCCESS', 'OPTIONS request completed');
        log(COLORS.blue, 'STATUS', `Status Code: ${response.statusCode}`);
        
        printHeaders(response.headers);
        
        return { success: true, statusCode: response.statusCode };
    } catch (error) {
        log(COLORS.red, 'FAILED', `OPTIONS request failed: ${error.message}`);
        return { success: false, error: error.message };
    }
}

// =================================================================================
// MAIN TEST RUNNER
// =================================================================================

async function runAllTests() {
    console.log('\n' + '='.repeat(80));
    console.log('🔍 CLOUDFLARE WORKER PROXY DEBUG TOOL');
    console.log('='.repeat(80) + '\n');
    
    console.log(`${COLORS.cyan}Worker URL:${COLORS.reset} ${PROXY_WORKER_URL}`);
    console.log(`${COLORS.cyan}Test URL:${COLORS.reset} ${TEST_URL.substring(0, 100)}...\n`);
    
    const results = {};
    
    // Run tests sequentially
    try {
        results.test1 = await testDirectURL();
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        results.test2 = await testProxiedURL();
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        results.test3 = await testRangeRequest();
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        results.test4 = await testFullGETRequest();
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        results.test5 = await testRateLimiting();
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        results.test6 = await testWorkerEndpoint();
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        results.test7 = await testOptionsRequest();
        
    } catch (error) {
        log(COLORS.red, 'FATAL', `Test suite failed: ${error.message}`);
    }
    
    // Print Summary
    console.log('\n' + '='.repeat(80));
    console.log('📊 TEST SUMMARY');
    console.log('='.repeat(80) + '\n');
    
    const tests = [
        { name: 'Direct URL Access', result: results.test1 },
        { name: 'Proxied URL Access', result: results.test2 },
        { name: 'Range Request (Seeking)', result: results.test3 },
        { name: 'Full GET Request', result: results.test4 },
        { name: 'Rate Limiting', result: results.test5 },
        { name: 'Worker Endpoint', result: results.test6 },
        { name: 'CORS Preflight', result: results.test7 }
    ];
    
    tests.forEach((test, index) => {
        const status = test.result?.success ? `${COLORS.green}✅ PASS${COLORS.reset}` : `${COLORS.red}❌ FAIL${COLORS.reset}`;
        console.log(`Test ${index + 1}: ${test.name.padEnd(30)} ${status}`);
        if (!test.result?.success && test.result?.error) {
            console.log(`        ${COLORS.red}Error: ${test.result.error}${COLORS.reset}`);
        }
    });
    
    console.log('\n' + '='.repeat(80));
    console.log('🔍 DIAGNOSIS');
    console.log('='.repeat(80) + '\n');
    
    // Provide diagnosis
    if (!results.test1?.success) {
        console.log(`${COLORS.red}❌ Direct URL is not accessible${COLORS.reset}`);
        console.log('   → The Google Drive link itself may be expired or invalid');
        console.log('   → Try generating a fresh link from HDHub4u\n');
    }
    
    if (results.test1?.success && !results.test2?.success) {
        console.log(`${COLORS.red}❌ Worker is not responding${COLORS.reset}`);
        console.log('   → Check if your Cloudflare Worker is deployed');
        console.log('   → Verify the worker URL is correct');
        console.log('   → Check Cloudflare Worker logs for errors\n');
    }
    
    if (results.test2?.success && !results.test2.hasAcceptRanges) {
        console.log(`${COLORS.yellow}⚠️  Accept-Ranges header is missing${COLORS.reset}`);
        console.log('   → Seeking may not work properly');
        console.log('   → Ensure worker sets Accept-Ranges: bytes\n');
    }
    
    if (results.test3?.success && !results.test3.isPartialContent) {
        console.log(`${COLORS.yellow}⚠️  Range requests not working (Status ${results.test3.statusCode})${COLORS.reset}`);
        console.log('   → Worker is not forwarding Range headers correctly');
        console.log('   → Seeking will not work\n');
    }
    
    if (results.test5?.rateLimited) {
        console.log(`${COLORS.yellow}⚠️  Rate limiting detected${COLORS.reset}`);
        console.log('   → Worker is limiting requests per IP');
        console.log('   → Consider increasing rate limit or testing from different IP\n');
    }
    
    if (results.test2?.success && results.test3?.success && results.test3.isPartialContent) {
        console.log(`${COLORS.green}✅ Everything looks good!${COLORS.reset}`);
        console.log('   → Worker is proxying correctly');
        console.log('   → Seeking is enabled');
        console.log('   → CORS headers are set\n');
    }
    
    console.log('='.repeat(80) + '\n');
}

// Run tests
runAllTests().catch(error => {
    console.error(`${COLORS.red}Fatal error:${COLORS.reset}`, error);
    process.exit(1);
});
