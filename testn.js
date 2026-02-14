const { getStreams } = require('./providers/hdhub4u.js');

const tmdbId = '1112564';
const mediaType = 'movie';

console.log(`\n${'='.repeat(70)}`);
console.log(`Testing Single Request`);
console.log(`TMDB ID: ${tmdbId} | Type: ${mediaType}`);
console.log('='.repeat(70));

const startTime = Date.now();

getStreams(tmdbId, mediaType).then(streams => {
    const endTime = Date.now();
    const duration = ((endTime - startTime) / 1000).toFixed(2);
    
    console.log(`\n✅ Success! Found ${streams.length} streams in ${duration}s\n`);
    
    if (streams.length === 0) {
        console.log('⚠️  No streams found - this might be normal if content is not available\n');
    } else {
        streams.forEach((stream, index) => {
            console.log(`Stream ${index + 1}:`);
            console.log(`  Name: ${stream.name || 'N/A'}`);
            console.log(`  Title: ${stream.title || 'N/A'}`);
            console.log(`  Size: ${stream.size || 'N/A'}`);
            // Shows up to 1000 characters of the URL so it doesn't flood the terminal
            console.log(`  URL: ${stream.url ? stream.url.substring(0, 1000) : 'N/A'}`);
            console.log('');
        });
    }
}).catch(error => {
    const endTime = Date.now();
    const duration = ((endTime - startTime) / 1000).toFixed(2);
    
    console.log(`\n❌ Error after ${duration}s:`);
    console.log(`  ${error.message}`);
    console.log(`  ${error.stack}\n`);
});