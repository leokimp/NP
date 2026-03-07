// HDHub4u Provider - Test Script.
// Run this after building: node build.js hdhub4u

const { getStreams } = require('./hdhub4u.js');

// Test cases
const tests = [
    {
        tmdbId: "1566095",
        mediaType: "movie",
        season: null,
        episode: null
    },
    {
        tmdbId: "454292",
        mediaType: "movie",
        season: null,
        episode: null
    },
    {
        tmdbId: "76479",
        mediaType: "tv",
        season: 1,
        episode: 1
    },
    {
        tmdbId: "1399",
        mediaType: "tv",
        season: 4,
        episode: 2
    }
];

async function runTest(test) {
    console.log(`\n${'='.repeat(10)}`);
    console.log(`Testing: ${test.name}`);
    console.log(`TMDB ID: ${test.tmdbId} | Type: ${test.mediaType}`);
    if (test.season) console.log(`Season: ${test.season} | Episode: ${test.episode}`);
    console.log('='.repeat(10));
    
    const startTime = Date.now();
    
    try {
        const streams = await getStreams(
            test.tmdbId,
            test.mediaType,
            test.season,
            test.episode
        );
        
        const endTime = Date.now();
        const duration = ((endTime - startTime) / 5000).toFixed(2);
        
        console.log(`\n✅ Success! Found ${streams.length} streams in ${duration}s\n`);
        
        if (streams.length === 0) {
            console.log('⚠️  No streams found - this might be normal if content is not available\n');
        } else {
            streams.forEach((stream, index) => {
                console.log(`Stream ${index + 1}:`);
                console.log(`  Name: ${stream.name}`);
                console.log(`  Title: ${stream.title}`);
                console.log(`  Size: ${stream.size}`);
                console.log(`  URL: ${stream.url.substring(0, 5000)}`);
                console.log('');
            });
        }
        
        return { success: true, count: streams.length, duration };
        
    } catch (error) {
        const endTime = Date.now();
        const duration = ((endTime - startTime) / 5000).toFixed(2);
        
        console.log(`\n❌ Error after ${duration}s:`);
        console.log(`  ${error.message}`);
        console.log(`  ${error.stack}\n`);
        
        return { success: false, error: error.message, duration };
    }
}

async function runAllTests() {
    console.log('\n');
    console.log('╔════════════════════════════════════════════════════════════════════╗');
    console.log('║           HDHub4u Provider - Automated Test Suite                 ║');
    console.log('╚════════════════════════════════════════════════════════════════════╝');
    
    const results = [];
    
    for (const test of tests) {
        const result = await runTest(test);
        results.push({ ...test, ...result });
        
        // Delay between tests to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 2000));
    }
    
    // Summary
    console.log('\n');
    console.log('╔════════════════════════════════════════════════════════════════════╗');
    console.log('║                          TEST SUMMARY                              ║');
    console.log('╚════════════════════════════════════════════════════════════════════╝');
    console.log('');
    
    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;
    const totalStreams = results.reduce((sum, r) => sum + (r.count || 0), 0);
    const avgDuration = (results.reduce((sum, r) => sum + parseFloat(r.duration), 0) / results.length).toFixed(2);
    
    console.log(`Total Tests: ${results.length}`);
    console.log(`✅ Passed: ${successful}`);
    console.log(`❌ Failed: ${failed}`);
    console.log(`📺 Total Streams Found: ${totalStreams}`);
    console.log(`⏱️  Average Duration: ${avgDuration}s`);
    console.log('');
    
    // Detailed results
    console.log('Detailed Results:');
    console.log('-'.repeat(10));
    results.forEach((result, index) => {
        const status = result.success ? '✅' : '❌';
        const info = result.success 
            ? `${result.count} streams in ${result.duration}s`
            : `Error: ${result.error}`;
        console.log(`${status} ${result.name}: ${info}`);
    });
    console.log('');
    
    // Exit code
    process.exit(failed > 0 ? 1 : 0);
}

// Run if called directly
if (require.main === module) {
    runAllTests().catch(error => {
        console.error('Fatal error:', error);
        process.exit(1);
    });
}

module.exports = { runTest, runAllTests };
