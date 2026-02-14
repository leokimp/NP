// HDHub4u Provider - Configuration and Helpers
// src/hdhub4u/config.js

// =================================================================================
// CONFIGURATION
// =================================================================================

export let MAIN_URL = "https://hdhub4u.frl";
export const PINGORA_API_URL = "https://search.pingora.fyi/collections/post/documents/search";
export const DOMAINS_URL = "https://raw.githubusercontent.com/phisher98/TVVVV/refs/heads/main/domains.json";

export const HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
};

// Update MAIN_URL (used by http.js)
export function setMainUrl(newUrl) {
    MAIN_URL = newUrl;
    HEADERS.Referer = MAIN_URL + '/';
    HEADERS.Origin = MAIN_URL;
}

// =================================================================================
// HELPER FUNCTIONS
// =================================================================================

/**
 * Format bytes to human-readable string
 */
export function formatBytes(bytes) {
    if (!bytes || bytes === 0) return 'Unknown';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

/**
 * ROT13 cipher for decoding
 */
export function rot13(str) {
    return str.replace(/[a-zA-Z]/g, (c) => 
        String.fromCharCode((c <= "Z" ? 90 : 122) >= (c = c.charCodeAt(0) + 13) ? c : c - 26)
    );
}

/**
 * Safe base64 decode (works in React Native)
 */
export function safeAtob(str) {
    try {
        if (typeof atob !== 'undefined') return atob(str);
    } catch (e) {
        console.log('[atob] Error:', e.message);
    }
    return str;
}

/**
 * Safe base64 encode (works in React Native)
 */
export function safeBtoa(str) {
    try {
        if (typeof btoa !== 'undefined') return btoa(str);
    } catch (e) {
        console.log('[btoa] Error:', e.message);
    }
    return str;
}

/**
 * Fuzzy title matching
 * Example: "12 fail" matches "12th Fail"
 */
export function isTitleMatch(query, title) {
    const normalize = (str) => str.toLowerCase().replace(/[^a-z0-9\s]/g, '');
    const qNorm = normalize(query);
    const tNorm = normalize(title);
    
    // Strategy 1: Exact substring match (best case)
    if (tNorm.includes(qNorm)) {
        return true;
    }
    
    const qWords = qNorm.split(/\s+/).filter(w => w.length > 0);
    const tWords = tNorm.split(/\s+/).filter(w => w.length > 0);
    
    if (qWords.length === 0) return false;
    
    // Strategy 2: Check if query words appear at the START of the title
    // This prevents "The Boys" from matching "My Life with the Walter Boys"
    // because "the" doesn't appear until position 4
    
    // Find the first non-stop-word in query
    const stopWords = ['the', 'a', 'an', 'of', 'and', 'or'];
    const firstSignificantWord = qWords.find(w => !stopWords.includes(w)) || qWords[0];
    
    // Check if this word appears in the first 3 words of title
    const firstThreeWords = tWords.slice(0, 3);
    const firstWordMatch = firstThreeWords.some(tw => 
        tw.includes(firstSignificantWord) || firstSignificantWord.includes(tw)
    );
    
    if (!firstWordMatch) {
        return false; // First significant word must appear early
    }
    
    // Now check if ALL query words exist somewhere in title
    const allWordsExist = qWords.every(qw => {
        return tWords.some(tw => tw.includes(qw) || qw.includes(tw));
    });
    
    return allWordsExist;
}

/**
 * Parse size string to bytes
 * Example: "1.5 GB" -> 1610612736
 */
export function parseSize(str) {
    const match = str.match(/([\d.]+)\s*(GB|MB|KB|TB)/i);
    if (!match) return 0;
    
    const value = parseFloat(match[1]);
    const unit = match[2].toUpperCase();
    
    const multipliers = {
        'KB': 1024,
        'MB': 1024 ** 2,
        'GB': 1024 ** 3,
        'TB': 1024 ** 4
    };
    
    return value * (multipliers[unit] || 0);
}

/**
 * Extract text from HTML
 */
export function extractText(html) {
    return html.replace(/<[^>]*>/g, '').trim();
}

/**
 * Extract attribute from HTML tag
 */
export function extractAttr(html, attr) {
    const regex = new RegExp(`${attr}=["']([^"']*)["']`, 'i');
    const match = html.match(regex);
    return match ? match[1] : null;
}

/**
 * Extract all links from HTML
 */
export function extractAllLinks(html) {
    const links = [];
    const regex = /<a[^>]*href=["']([^"']*)["'][^>]*>(.*?)<\/a>/gis;
    let match;
    
    while ((match = regex.exec(html)) !== null) {
        links.push({
            href: match[1],
            text: extractText(match[2])
        });
    }
    
    return links;
}
