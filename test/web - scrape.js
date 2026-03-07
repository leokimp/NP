/**
 * EXTREME RAW DATA DEBUGGER (MOVIE & TV)
 * Overwrite your entire satv.js with this!
 */

const TEST_CONFIGS = [
    {
        title: "12th Fail (2023)",
        type: 'movie',
        url: 'https://new3.hdhub4u.fo/12th-fail-2023-hindi-webrip-full-movie/'
    },
    {
        title: "The Boys (Season 1, Ep 1)",
        type: 'tv',
        url: 'https://new3.hdhub4u.fo/the-boys-season-1-hindi-all-episodes/',
        season: 1,
        episode: 1
    }
];

const evaluateStreamLink = (href, rawText) => {
    if (!href) return { passed: false, reason: 'Empty href attribute' };
    
    const hrefLower = href.toLowerCase();
    const cleanText = (rawText || '').replace(/<[^>]+>/g, '').trim();
    const textLower = cleanText.toLowerCase();

    // 1. URL BLACKLIST
    if (hrefLower.startsWith('/') || hrefLower.startsWith('#')) return { passed: false, reason: 'Relative or Anchor URL' };
    if (hrefLower.includes('hdhub4u') || hrefLower.includes('4khdhub')) return { passed: false, reason: 'Internal Site URL' };
    if (hrefLower.includes('discord') || hrefLower.includes('themoviedb.org') || hrefLower.includes('imdb.com')) return { passed: false, reason: 'Social/DB URL' };
    if (hrefLower.includes('{{') || hrefLower.includes('cdn-cgi')) return { passed: false, reason: 'Broken Template URL' };

    // 2. TEXT BLACKLIST
    if (cleanText === '') return { passed: false, reason: 'Empty Text (Image/Thumbnail)' };
    if (textLower.includes('watch')) return { passed: false, reason: 'Contains "Watch"' };
    if (textLower.includes('pack')) return { passed: false, reason: 'Contains "Pack"' };
    if (textLower.includes('480p')) return { passed: false, reason: 'Contains "480p"' };
    if (textLower.includes('720p')) return { passed: false, reason: 'Contains "720p"' };

    return { passed: true, reason: 'Clean', cleanText };
};

async function processMovie(html) {
    console.log(`[INFO] Processing as MOVIE...`);
    const validExtractedLinks = [];
    let totalEvaluated = 0;
    
    const linkRegex = /<a[^>]*href=["']([^"']*)["'][^>]*>(.*?)<\/a>/gis;
    let match;
    
    console.log(`\n======================================================`);
    console.log(`🔻 RAW BACKEND DATA: ALL MOVIE ANCHOR TAGS 🔻`);
    console.log(`======================================================`);
    
    while ((match = linkRegex.exec(html)) !== null) {
        totalEvaluated++;
        const fullRawTag = match[0]; // THIS is the raw HTML string
        const href = match[1];
        const rawText = match[2];
        
        const evalResult = evaluateStreamLink(href, rawText);
        
        if (evalResult.passed) {
            console.log(`\n🟢 [PASS]`);
            console.log(`   👉 RAW TAG : ${fullRawTag}`);
            validExtractedLinks.push(href);
        } else {
            console.log(`\n🔴 [FAIL] - ${evalResult.reason}`);
            console.log(`   👉 RAW TAG : ${fullRawTag}`);
        }
    }
    console.log(`\n======================================================`);
    console.log(`🔺 END RAW MOVIE DATA 🔺`);
    console.log(`======================================================\n`);
}

async function processTv(html, targetEp) {
    console.log(`[INFO] Processing as TV (Episode ${targetEp})...`);
    const validExtractedLinks = [];
    const nextEp = targetEp + 1;

    const currentEpRegex = new RegExp(`<(?:h[1-6]|strong|span|a)[^>]*>\\s*(?:Episode|Ep|E|EPiSODE)\\s*0?${targetEp}\\b`, 'i');
    const nextEpRegex = new RegExp(`<(?:h[1-6]|strong|span|a)[^>]*>\\s*(?:Episode|Ep|E|EPiSODE)\\s*0?${nextEp}\\b`, 'i');

    const startMatch = html.match(currentEpRegex);
    if (!startMatch) {
        console.error(`[ERROR] Could not find starting boundary!`);
        return;
    }

    const startIndex = startMatch.index;
    const nextMatch = html.substring(startIndex + 10).match(nextEpRegex);
    const endIndex = nextMatch ? (startIndex + 10 + nextMatch.index) : (startIndex + 6000);
    
    const episodeSlice = html.substring(startIndex, endIndex);
    
    console.log(`\n======================================================`);
    console.log(`🔻 RAW BACKEND DATA: FULL TV EPISODE ${targetEp} SLICE 🔻`);
    console.log(`======================================================`);
    console.log(episodeSlice);
    console.log(`======================================================`);
    console.log(`🔺 END FULL TV EPISODE SLICE 🔺`);
    console.log(`======================================================\n`);

    if (/\b(1080p|2160p|4k|uhd|720p|480p)\b/i.test(episodeSlice)) {
        const qualityMarkerRegex = /\b(720p|480p|360p|1080p|2160p|4k|uhd)\b/gi;
        const qualityMarkers = [];
        let qMatch;
        
        while ((qMatch = qualityMarkerRegex.exec(episodeSlice)) !== null) {
            qualityMarkers.push({
                quality: qMatch[1].toLowerCase(),
                index: qMatch.index,
                isHighQuality: /1080p|2160p|4k|uhd/i.test(qMatch[1])
            });
        }
        
        for (let i = 0; i < qualityMarkers.length; i++) {
            const marker = qualityMarkers[i];
            console.log(`\n--- [ZONE ${i + 1}: ${marker.quality.toUpperCase()}] ---`);
            
            if (!marker.isHighQuality) {
                console.log(`[SKIP] Low-quality zone.`);
                continue;
            }
            
            const searchStart = marker.index;
            const nextMarker = qualityMarkers[i + 1];
            const searchEnd = nextMarker ? nextMarker.index : episodeSlice.length;
            const searchZone = episodeSlice.substring(searchStart, searchEnd);

            console.log(`\n↓↓↓↓ RAW HTML: QUALITY ZONE ${marker.quality.toUpperCase()} ↓↓↓↓`);
            console.log(searchZone);
            console.log(`↑↑↑↑ END RAW HTML ↑↑↑↑\n`);

            const zoneLinks = /<a[^>]*href=["']([^"']+)["'][^>]*>(.*?)<\/a>/gi;
            let linkMatch;
            
            while ((linkMatch = zoneLinks.exec(searchZone)) !== null) {
                const fullRawTag = linkMatch[0];
                const href = linkMatch[1];
                const rawText = linkMatch[2];
                const evalResult = evaluateStreamLink(href, rawText);
                
                if (evalResult.passed) {
                    console.log(`  🟢 [PASS]`);
                    console.log(`     👉 RAW TAG: ${fullRawTag}`);
                    validExtractedLinks.push(href);
                } else {
                    console.log(`  🔴 [FAIL] - ${evalResult.reason}`);
                    console.log(`     👉 RAW TAG: ${fullRawTag}`);
                }
            }
        }
    }
}

async function runTests() {
    for (const config of TEST_CONFIGS) {
        console.log(`\n===============================================================`);
        console.log(`🚀 TESTING: ${config.title} (${config.type.toUpperCase()})`);
        console.log(`===============================================================\n`);

        try {
            const response = await fetch(config.url, {
                headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
            });
            const html = await response.text();
            
            if (config.type === 'movie') await processMovie(html);
            else if (config.type === 'tv') await processTv(html, config.episode);

        } catch (error) {
            console.error('\n[FATAL ERROR]', error.message);
        }
    }
}

runTests();