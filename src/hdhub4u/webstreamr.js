// WebStreamr API Provider with Filtering.
// src/hdhub4u/webstreamr.js

import { fetchWithRetry } from './http.js';

// =================================================================================
// CONFIGURATION
// =================================================================================

const WEBSTREAMR_BASE_URL = 'https://webstreamr.hayd.uk/%7B%22gu%22%3A%22on%22%2C%22hi%22%3A%22on%22%2C%22mediaFlowProxyUrl%22%3A%22%22%2C%22mediaFlowProxyPassword%22%3A%22%22%2C%22disableExtractor_doodstream%22%3A%22on%22%2C%22disableExtractor_dropload%22%3A%22on%22%2C%22disableExtractor_fastream%22%3A%22on%22%2C%22disableExtractor_kinoger%22%3A%22on%22%2C%22disableExtractor_lulustream%22%3A%22on%22%2C%22disableExtractor_mixdrop%22%3A%22on%22%2C%22disableExtractor_savefiles%22%3A%22on%22%2C%22disableExtractor_streamembed%22%3A%22on%22%2C%22disableExtractor_streamtape%22%3A%22on%22%2C%22disableExtractor_streamup%22%3A%22on%22%2C%22disableExtractor_supervideo%22%3A%22on%22%2C%22disableExtractor_uqload%22%3A%22on%22%2C%22disableExtractor_vidora%22%3A%22on%22%2C%22disableExtractor_vidsrc%22%3A%22on%22%2C%22disableExtractor_vixsrc%22%3A%22on%22%2C%22disableExtractor_voe%22%3A%22on%22%2C%22disableExtractor_youtube%22%3A%22on%22%7D';

// Languages to KEEP (whitelist)
const ALLOWED_LANGUAGES = ['hindi', 'gujarati', 'english'];

// Languages to BLOCK
const BLOCKED_LANGUAGES = [
    'kannada', 'tamil', 'telugu', 'malayalam', 'bengali',
    'marathi', 'punjabi', 'odia', 'assamese', 'urdu',
    'bhojpuri', 'rajasthani', 'konkani', 'sindhi', 'nepali',
    'kashmiri', 'manipuri', 'sanskrit', 'maithili'
];

// Minimum quality to keep (1080p and above)
const MIN_QUALITY = 1080;

// Quality patterns to block
const BLOCKED_QUALITY_PATTERNS = [
    '360p', '480p', '576p', '720p',
    'cam', 'camrip', 'hdcam', 'ts', 'telesync', 'tc', 'telecine',
    'dvdscr', 'screener', 'r5', 'r6'
];

// =================================================================================
// QUALITY EXTRACTION
// =================================================================================

function extractQuality(streamName) {
    const nameLower = streamName.toLowerCase();
    
    // Check for explicit quality markers
    const qualityMatch = nameLower.match(/(\d{3,4})p/);
    if (qualityMatch) {
        return parseInt(qualityMatch[1]);
    }
    
    // Check for 2160p/4K
    if (nameLower.includes('2160p') || nameLower.includes('4k') || nameLower.includes('uhd')) {
        return 2160;
    }
    
    // Check for 1080p
    if (nameLower.includes('1080p') || nameLower.includes('fhd')) {
        return 1080;
    }
    
    return 0; // Unknown quality
}

function hasBlockedQuality(streamName) {
    const nameLower = streamName.toLowerCase();
    
    // Check for explicitly blocked quality patterns
    for (const pattern of BLOCKED_QUALITY_PATTERNS) {
        if (nameLower.includes(pattern)) {
            return true;
        }
    }
    
    // Check if quality is below minimum
    const quality = extractQuality(streamName);
    if (quality > 0 && quality < MIN_QUALITY) {
        return true;
    }
    
    return false;
}

// =================================================================================
// LANGUAGE DETECTION
// =================================================================================

function detectLanguage(streamName) {
    const nameLower = streamName.toLowerCase();
    
    // Explicitly block unwanted languages found in title
    for (const lang of BLOCKED_LANGUAGES) {
        if (nameLower.includes(lang)) {
            return 'blocked';
        }
    }

    // Check for allowed languages
    for (const lang of ALLOWED_LANGUAGES) {
        if (nameLower.includes(lang)) {
            return 'allowed';
        }
    }
    
    // If no language detected, might be Hindi (default for Indian content)
    return 'unknown';
}

// =================================================================================
// STREAM FILTERING
// =================================================================================

function shouldFilterStream(stream) {
    const streamName = (stream.name || '').toLowerCase();
    const streamTitle = (stream.title || '').toLowerCase();
    const combinedText = `${streamName} ${streamTitle}`;

    // Step A: Quality Filter
    if (hasBlockedQuality(combinedText)) return true;

    // Step B: Strict Language Blocking
    // If the title explicitly contains a blocked language, trash it
    for (const lang of BLOCKED_LANGUAGES) {
        if (combinedText.includes(lang)) return true;
    }

    // Step C: Allowed Language Check
    // If it explicitly has an allowed language, keep it
    for (const lang of ALLOWED_LANGUAGES) {
        if (combinedText.includes(lang)) return false;
    }

    // Step D: High Quality Fallback (The "Saaho" rule)
    // If no language is mentioned at all, only keep if it's 1080p/2160p
    const quality = extractQuality(combinedText);
    if (quality >= MIN_QUALITY) return false;

    return true; // Filter out everything else
}

// =================================================================================
// METADATA CLEANING
// =================================================================================

function cleanStreamMetadata(streams) {
    return streams.map(stream => {
        let name = stream.name || "";
        let title = stream.title || "";

        // 1. Extract Quality for the top line
        const qualityMatch = title.match(/(\d{3,4}p|4k|uhd)/i);
        const cleanName = qualityMatch ? qualityMatch[1].toLowerCase() : (name.match(/\d{3,4}p/i) ? name.match(/\d{3,4}p/i)[0].toLowerCase() : "HD");

        // 2. Extract Movie Name, Year, and Language
        const yearMatch = title.match(/\b(19|20)\d{2}\b/);
        const year = yearMatch ? yearMatch[0] : "";
        
        // Identify the specific language found in the text
        const langMatch = title.match(/hindi|gujarati|english/i);
        let lang = "";
        if (langMatch) {
            lang = langMatch[0].charAt(0).toUpperCase() + langMatch[0].slice(1).toLowerCase();
        } else {
            // If we kept it via high-quality fallback but no lang is found, label as "Multi"
            lang = "Multi"; 
        }

        const nameRegex = /^(.*?)(?=\s*\d{3,4}p|\s*4k|\s*uhd|\s*\b(19|20)\d{2}\b|\n)/i;
        const nameMatch = title.match(nameRegex);
        let movieName = nameMatch ? nameMatch[1].replace(/[._]/g, ' ').replace(/\(|\)/g, '').trim() : title.split('\n')[0].trim();

        const cleanTitleLine = `${movieName}  ${year}  ${lang}`.replace(/\s+/g, ' ').trim();

        // 3. Extract size from title if present
        const sizeMatch = title.match(/(\d+(?:\.\d+)?\s*[GM]B)/i);
        const cleanSize = sizeMatch ? sizeMatch[1] : "";

        return {
            ...stream,
            name: cleanName,
            title: cleanTitleLine.trim(),
            size: cleanSize
        };
    });
}

// =================================================================================
// MAIN EXTRACTOR FUNCTION
// =================================================================================

/**
 * Fetch and filter streams from WebStreamr API
 * @param {string} imdbId - IMDb ID (e.g., "tt1190634")
 * @param {string} mediaType - "movie" or "tv"
 * @param {string} season - Season number (for TV shows)
 * @param {string} episode - Episode number (for TV shows)
 * @returns {Promise<Array>} - Array of filtered streams
 */
export async function webstreamrExtractor(imdbId, mediaType, season, episode) {
    console.log('[WEBSTREAMR] Starting extraction:', { imdbId, mediaType, season, episode });
    
    if (!imdbId) {
        console.log('[WEBSTREAMR] No IMDb ID provided');
        return [];
    }
    
    try {
        // Build endpoint URL
        let endpoint;
        if (mediaType === 'movie') {
            endpoint = `/stream/movie/${imdbId}.json`;
        } else if (mediaType === 'tv' && season && episode) {
            endpoint = `/stream/series/${imdbId}:${season}:${episode}.json`;
        } else {
            console.log('[WEBSTREAMR] Invalid mediaType or missing season/episode');
            return [];
        }
        
        const url = `${WEBSTREAMR_BASE_URL}${endpoint}`;
        console.log('[WEBSTREAMR] Fetching:', url);
        
        // Fetch data from API
        const response = await fetchWithRetry(url);
        const data = await response.json();
        
        if (!data.streams || !Array.isArray(data.streams)) {
            console.log('[WEBSTREAMR] No streams found in response');
            return [];
        }
        
        console.log(`[WEBSTREAMR] Raw streams: ${data.streams.length}`);
        
        // Filter streams
        const filteredStreams = data.streams.filter(stream => !shouldFilterStream(stream));
        console.log(`[WEBSTREAMR] After filtering: ${filteredStreams.length} streams`);
        
        if (filteredStreams.length === 0) {
            console.log('[WEBSTREAMR] All streams filtered out');
            return [];
        }
        
        // Clean metadata
        const cleanedStreams = cleanStreamMetadata(filteredStreams);
        
        // Convert to standard format (matching your existing format)
        const results = cleanedStreams.map(stream => ({
            source: 'WebStreamr',
            quality: `${stream.name || 'Unknown'}.`,
            url: stream.url,
            size: stream.behaviorHints?.videoSize || 0,
            filename: stream.title,
            sizeText: stream.size || ''
        }));
        
        console.log(`[WEBSTREAMR] Returning ${results.length} streams`);
        return results;
        
    } catch (error) {
        console.log('[WEBSTREAMR] Error:', error.message);
        return [];
    }
}
