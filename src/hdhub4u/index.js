// HDHub4u Provider - Main Entry Point (OPTIMIZED)
// src/hdhub4u/index.js

import { fetchWithRetry, fetchText, triggerDomainUpdate } from './http.js';
import { 
    pixelDrainExtractor, 
    hubDriveExtractor, 
    hubCloudExtractor,
    getRedirectLinks 
} from './extractors.js';
import { 
    isTitleMatch, 
    formatBytes,
    MAIN_URL,
    HEADERS,
    PINGORA_API_URL 
} from './config.js';

// =================================================================================
// ⚙️  TESTING CONFIGURATION
// =================================================================================
// Toggle cache on/off for testing
// - true  = Cache DISABLED (fresh fetch every time) - USE FOR TESTING
// - false = Cache ENABLED (normal operation) - USE FOR PRODUCTION
const DISABLE_CACHE_FOR_TESTING = false;
// =================================================================================

// Use API cache instead of in-memory cache
import {
    getCachedStreams,
    setCachedStreams,
    clearAllCache,
    getCacheStats
} from './api-cache.js';

// =================================================================================
// SEARCH FUNCTIONS (PARALLEL OPTIMIZATION)
// =================================================================================

/**
 * Perform search for a single query
 */
async function performSingleSearch(query) {
    const cleanQuery = query.replace(/Season \d+/i, '').trim();
    const params = new URLSearchParams({
        q: cleanQuery,
        query_by: "post_title",
        sort_by: "sort_by_date:desc"
    });
    
    try {
        // 1. Try Pingora API first
        const response = await fetchWithRetry(`${PINGORA_API_URL}?${params.toString()}`);
        const data = await response.json();
        
        const results = [];
        if (data.hits && data.hits.length > 0) {
            data.hits.forEach(hit => {
                results.push({
                    title: hit.document.post_title,
                    url: MAIN_URL + hit.document.permalink,
                    source: "Pingora",
                    searchedTitle: query
                });
            });
            return results;
        }
        
        // 2. Fallback to Native Search
        console.log(`[Search] "${query}" - Pingora returned 0 results, trying Native Search`);
        const nativeUrl = `${MAIN_URL}/?s=${encodeURIComponent(cleanQuery)}`;
        const nativeResponse = await fetchWithRetry(nativeUrl);
        const html = await nativeResponse.text();
        
        const nativeResults = [];
        const articleRegex = /<article[^>]*>.*?<\/article>/gis;
        const articles = html.match(articleRegex) || [];
        
        articles.forEach(article => {
            const linkMatch = article.match(/<a[^>]*href=["']([^"']*)["'][^>]*>(.*?)<\/a>/i);
            if (linkMatch) {
                const url = linkMatch[1];
                const titleMatch = linkMatch[2].replace(/<[^>]*>/g, '').trim();
                if (url && titleMatch) {
                    nativeResults.push({ 
                        title: titleMatch, 
                        url: url, 
                        source: "Native",
                        searchedTitle: query
                    });
                }
            }
        });
        
        return nativeResults;
    } catch (e) {
        console.log(`[Search] "${query}" - Error:`, e.message);
        return [];
    }
}

/**
 * PARALLEL SEARCH: Search all titles simultaneously
 * @param {Array<string>} queries - Array of search queries
 * @returns {Promise<Object>} - { results: Array, usedTitle: string }
 */
async function performParallelSearch(queries) {
    console.log(`[Parallel Search] Searching ${queries.length} titles simultaneously...`);
    
    const startTime = Date.now();
    
    // Launch all searches in parallel
    const searchPromises = queries.map(query => performSingleSearch(query));
    const allResults = await Promise.all(searchPromises);
    
    const elapsed = Date.now() - startTime;
    console.log(`[Parallel Search] Completed in ${elapsed}ms`);
    
    // Find first non-empty result
    for (let i = 0; i < allResults.length; i++) {
        if (allResults[i].length > 0) {
            console.log(`[Parallel Search] Found ${allResults[i].length} results for: "${queries[i]}"`);
            return {
                results: allResults[i],
                usedTitle: queries[i]
            };
        }
    }
    
    console.log('[Parallel Search] No results found in any search');
    return { results: [], usedTitle: '' };
}

// =================================================================================
// EXTRACTOR DISPATCHER (PARALLEL OPTIMIZATION)
// =================================================================================

/**
 * Process a single link through appropriate extractor
 */
async function loadExtractor(url, referer = MAIN_URL) {
    if (!url) {
        console.log("[EXTRACTOR] Empty URL");
        return [];
    }
    
    console.log("[EXTRACTOR] Processing:", url);
    
    try {
        const hostname = new URL(url).hostname;
        
        if (url.includes("?id=") || hostname.includes("techyboy") || hostname.includes("gdtot")) {
            const resolved = await getRedirectLinks(url);
            if (resolved && resolved !== url) {
                return await loadExtractor(resolved, url);
            }
            return [];
        }
        
        if (hostname.includes('hubcloud') || hostname.includes('hubcdn')) {
            return await hubCloudExtractor(url, referer);
        }
        
        if (hostname.includes('hubdrive')) {
            return await hubDriveExtractor(url, referer);
        }
        
        if (hostname.includes('pixeldrain')) {
            return await pixelDrainExtractor(url);
        }
        
        if (hostname.includes('hblinks')) {
            const response = await fetchWithRetry(url, { Referer: referer });
            const html = await response.text();
            const linkRegex = /<a[^>]*href=["']([^"']*)["'][^>]*>/gi;
            const links = [];
            let match;
            
            while ((match = linkRegex.exec(html)) !== null) {
                const href = match[1];
                if (href && href.startsWith('http')) {
                    if (href.includes('hblinks.dad') && !href.includes('/archives/')) {
                        continue;
                    }
                    links.push(href);
                }
            }
            
            console.log(`[HBLINKS] Found ${links.length} valid links - processing in parallel`);
            
            // PARALLEL EXTRACTION for hblinks
            const extractionPromises = links.map(link => loadExtractor(link, url));
            const allResults = await Promise.all(extractionPromises);
            
            // Flatten results
            return allResults.flat();
        }
        
        console.log("[EXTRACTOR] No matching extractor");
        return [];
        
    } catch (err) {
        console.log("[EXTRACTOR] Error:", err.message);
        return [];
    }
}

/**
 * PARALLEL EXTRACTION: Process multiple links simultaneously
 * @param {Array<string>} links - Array of URLs to extract
 * @param {string} referer - Referer URL
 * @returns {Promise<Array>} - Flattened array of all extracted streams
 */
async function extractLinksInParallel(links, referer) {
    console.log(`[Parallel Extraction] Processing ${links.length} links simultaneously...`);
    
    const startTime = Date.now();
    
    // Launch all extractions in parallel
    const extractionPromises = links.map(link => 
        loadExtractor(link, referer).catch(err => {
            console.log(`[Parallel Extraction] Error on ${link}:`, err.message);
            return [];
        })
    );
    
    const allResults = await Promise.all(extractionPromises);
    
    const elapsed = Date.now() - startTime;
    const totalStreams = allResults.flat().length;
    
    console.log(`[Parallel Extraction] Completed in ${elapsed}ms - Found ${totalStreams} streams`);
    
    // Flatten array of arrays into single array
    return allResults.flat();
}

// =================================================================================
// ROBUST PRE-FILTERED LINK EXTRACTION
// =================================================================================

function extractLinksWithMetadata(html, mediaType, season, episode) {
    const linksWithMetadata = [];
    
    // Helper to filter out site noise (ads, tags, telegram, zip files)
    const isJunkLink = (href) => {
        return href.includes('hdhub4u.') || 
               /\/20\d{2}\//.test(href) || 
               href.includes('-hindi-') || 
               href.includes('-movie/') || 
               href.includes('-series/') || 
               href.includes('-episodes/') ||
               href.includes('facebook.com') || 
               href.includes('telegram.me') ||
               href.includes('how-to-download') ||
               href.toLowerCase().endsWith('.zip') ||
               href.toLowerCase().includes('.zip?');
    };

    if (mediaType === 'movie') {
        const linkRegex = new RegExp(`<a[^>]*href=["']([^"']*)["'][^>]*>(.*?)<\\/a>`, 'gis');
        let match;
        while ((match = linkRegex.exec(html)) !== null) {
            const href = match[1];
            const text = match[2].replace(/<[^>]*>/g, '');
            
            if (isJunkLink(href)) continue;
            
            const context = html.substring(Math.max(0, match.index - 200), Math.min(html.length, match.index + 400));
            
            // For movies, only process 1080p and higher
            if ((text + context).match(/1080p|2160p|4k/i)) {
                if (href && href.startsWith('http')) {
                    linksWithMetadata.push({
                        url: href,
                        requiresQualityCheck: false,
                        preFilteredQuality: true
                    });
                }
            }
        }
        
    } else if (mediaType === 'tv' && season && episode) {
        const targetEp = parseInt(episode);
        const nextEp = targetEp + 1;

        // Find episode boundaries
        const currentEpRegex = new RegExp(`<(?:h[1-6]|strong|span|a)[^>]*>\\s*(?:Episode|Ep|E|EPiSODE)\\s*0?${targetEp}\\b`, 'i');
        const nextEpRegex = new RegExp(`<(?:h[1-6]|strong|span|a)[^>]*>\\s*(?:Episode|Ep|E|EPiSODE)\\s*0?${nextEp}\\b`, 'i');

        const startMatch = html.match(currentEpRegex);
        if (startMatch) {
            const startIndex = startMatch.index;
            const nextMatch = html.substring(startIndex + 10).match(nextEpRegex);
            const endIndex = nextMatch ? (startIndex + 10 + nextMatch.index) : (startIndex + 6000);
            const episodeSlice = html.substring(startIndex, endIndex);
            
            console.log(`[TV] Analyzing slice for Episode ${targetEp} (${episodeSlice.length} chars)`);
            
            // Check if quality labels exist in the episode block
            if (/1080p|2160p|4k|uhd|720p|480p/i.test(episodeSlice)) {
                console.log("[TV] Quality labels found in episode block. Filtering at HTML stage.");
                
                const qualityMarkerRegex = /(720p|480p|360p|1080p|2160p|4k|uhd)/gi;
                const qualityMarkers = [];
                let qMatch;
                
                qualityMarkerRegex.lastIndex = 0;
                while ((qMatch = qualityMarkerRegex.exec(episodeSlice)) !== null) {
                    qualityMarkers.push({
                        quality: qMatch[1].toLowerCase(),
                        index: qMatch.index,
                        isHighQuality: /1080p|2160p|4k|uhd/i.test(qMatch[1])
                    });
                }
                
                console.log(`[TV] Found ${qualityMarkers.length} quality markers`);
                
                for (let i = 0; i < qualityMarkers.length; i++) {
                    const marker = qualityMarkers[i];
                    
                    if (!marker.isHighQuality) {
                        console.log(`[TV] Marker ${i + 1}: ${marker.quality} - SKIPPING (low quality)`);
                        continue;
                    }
                    
                    console.log(`[TV] Marker ${i + 1}: ${marker.quality} - PROCESSING (high quality)`);
                    
                    const searchStart = marker.index;
                    const nextMarker = qualityMarkers[i + 1];
                    const searchEnd = nextMarker ? nextMarker.index : episodeSlice.length;
                    const searchZone = episodeSlice.substring(searchStart, searchEnd);
                    
                    console.log(`[TV]   Search zone: ${searchZone.length} chars`);
                    
                    const zoneLinks = /<a[^>]*href=["']([^"']+)["'][^>]*>/gi;
                    let linkMatch;
                    let foundLinks = 0;
                    
                    while ((linkMatch = zoneLinks.exec(searchZone)) !== null) {
                        const href = linkMatch[1];
                        if (href.startsWith('http') && !isJunkLink(href)) {
                            console.log(`[TV]   → Found link: ${href.substring(0, 60)}...`);
                            foundLinks++;
                            linksWithMetadata.push({
                                url: href,
                                requiresQualityCheck: false,
                                preFilteredQuality: true
                            });
                        }
                    }
                    
                    if (foundLinks === 0) {
                        console.log("[TV]   → No links found in this zone");
                    }
                }
                
            } else {
                console.log("[TV] No quality labels in episode block. Will check quality during extraction.");
                
                const linkRegex = /href=["']([^"']+)["']/gi;
                let match;
                while ((match = linkRegex.exec(episodeSlice)) !== null) {
                    const href = match[1];
                    if (href.startsWith('http') && !isJunkLink(href)) {
                        linksWithMetadata.push({
                            url: href,
                            requiresQualityCheck: true,
                            preFilteredQuality: false
                        });
                    }
                }
            }
        }
    }
    
    // Deduplicate
    const seen = new Set();
    const uniqueLinks = [];
    
    for (const linkMeta of linksWithMetadata) {
        if (!seen.has(linkMeta.url)) {
            seen.add(linkMeta.url);
            uniqueLinks.push(linkMeta);
        }
    }
    
    return uniqueLinks;
}

function extractLinks(html, mediaType, season, episode) {
    const linksWithMetadata = extractLinksWithMetadata(html, mediaType, season, episode);
    return linksWithMetadata.map(meta => meta.url);
}

// =================================================================================
// MAIN FUNCTION (OPTIMIZED WITH API CACHE AND PARALLEL PROCESSING)
// =================================================================================

async function getStreams(tmdbId, mediaType, season, episode) {
    console.log("[HDHub4u] Starting:", tmdbId, mediaType, season, episode);
    
    // ============== API CACHE CHECK ==============
    if (!DISABLE_CACHE_FOR_TESTING) {
        try {
            const cachedResult = await getCachedStreams(tmdbId, mediaType, season, episode);
            if (cachedResult) {
                console.log(`[HDHub4u] ⚡ Returning ${cachedResult.length} cached streams from API`);
                
                // Trigger background domain update (non-blocking)
                triggerDomainUpdate();
                
                return cachedResult;
            }
        } catch (error) {
            console.log('[HDHub4u] Cache fetch error, continuing with fresh fetch:', error.message);
        }
    } else {
        console.log('[CACHE] ⚠️  DISABLED FOR TESTING - Fresh fetch every time');
    }
    // =============================================
    
    try {
        // Trigger background domain update (non-blocking)
        triggerDomainUpdate();
        
        // 1. Fetch TMDB info to get the IMDb ID
        const tmdbUrl = `https://api.themoviedb.org/3/${mediaType}/${tmdbId}?api_key=342c3872f1357c6e1da3a5ac1ccc3605&append_to_response=external_ids`;
        const tmdbInfo = await fetch(tmdbUrl).then(r => r.json());
        
        const imdbId = tmdbInfo.imdb_id || (tmdbInfo.external_ids && tmdbInfo.external_ids.imdb_id);
        let displayTitle = mediaType === 'tv' ? tmdbInfo.name : tmdbInfo.title;
        let year = '';
        if (mediaType === 'movie' && tmdbInfo.release_date) {
            year = tmdbInfo.release_date.split('-')[0];
        } else if (mediaType === 'tv' && tmdbInfo.first_air_date) {
            year = tmdbInfo.first_air_date.split('-')[0];
        }
        const searchQueue = [];
        
        // 2. Pivot to IMDb API for India-specific Romanized titles
        if (imdbId) {
            console.log("[HDHub4u] IMDb ID found:", imdbId);
            const [imdbRes, akasRes] = await Promise.all([
                fetch(`https://api.imdbapi.dev/titles/${imdbId}`).then(r => r.json()).catch(() => null),
                fetch(`https://api.imdbapi.dev/titles/${imdbId}/akas`).then(r => r.json()).catch(() => ({ akas: [] }))
            ]);
            
            if (imdbRes) {
                if (imdbRes.originalTitle) searchQueue.push(imdbRes.originalTitle);
                if (imdbRes.primaryTitle && !searchQueue.includes(imdbRes.primaryTitle)) searchQueue.push(imdbRes.primaryTitle);
                displayTitle = imdbRes.originalTitle || imdbRes.primaryTitle;
            }
            
            if (akasRes && akasRes.akas) {
                const indianAkas = akasRes.akas
                    .filter(aka => aka.country && aka.country.code === "IN") 
                    .map(aka => aka.text)
                    .filter(text => /^[a-zA-Z0-9\s\-':.!&]+$/.test(text));
                
                indianAkas.forEach(aka => {
                    if (!searchQueue.includes(aka)) searchQueue.push(aka);
                });
            }
        }
        
        if (searchQueue.length === 0) searchQueue.push(displayTitle);
        
        // ============== PARALLEL SEARCH ==============
        const { results: searchResults, usedTitle: usedTitleForMatch } = await performParallelSearch(searchQueue);
        // =============================================
        
        if (searchResults.length === 0) {
            // ✅ FIX #1: Never cache empty results - may be temporary failure
            console.log("[HDHub4u] No search results - NOT caching empty result");
            return [];
        }
        
        // 4. Validate the Match
        const bestMatch = searchResults.find(r => {
            if (isTitleMatch(usedTitleForMatch, r.title)) {
                if (mediaType === 'tv' && season) {
                    const rLower = r.title.toLowerCase();
                    if (!rLower.includes(`season ${season}`)) return false;
                }
                return true;
            }
            return false;
        });
        
        if (!bestMatch) {
            // ✅ FIX #1: Never cache empty results - may be temporary failure
            console.log("[HDHub4u] No valid match found - NOT caching empty result");
            return [];
        }
        
        console.log("[HDHub4u] Found Page:", bestMatch.title);
        const pageHtml = await fetchText(bestMatch.url);
        
        // 5. Extract Links
        const linksToProcess = extractLinks(pageHtml, mediaType, season, episode);
        console.log(`[HDHub4u] Found ${linksToProcess.length} candidate links`);
        
        // ============== PARALLEL EXTRACTION ==============
        const extractedResults = await extractLinksInParallel(linksToProcess, bestMatch.url);
        // =================================================
        
        // 6. Final Stream Formatting
        const finalStreams = [];
        extractedResults.forEach(res => {
            if (!res || !res.url || res.quality === 'Unknown') return;
            if (res.quality.includes('480p') || res.quality.includes('720p')) return;
            
            finalStreams.push({
                name: res.quality,
                title: `${displayTitle}${year ? ` (${year})` : ''} ${mediaType === 'tv' ? `S${season}E${episode}` : ''}`,
                url: res.url,
                size: formatBytes(res.size),
                headers: HEADERS
            });
        });

        function parseSizeToBytes(sizeStr) {
            if (!sizeStr) return 0;
            const match = sizeStr.match(/([\d.]+)\s*(GB|MB|KB|B)/i);
            if (!match) return 0;

            const value = parseFloat(match[1]);
            const unit = match[2].toUpperCase();
            const multipliers = {
                'B': 1,
                'KB': 1024,
                'MB': 1024 * 1024,
                'GB': 1024 * 1024 * 1024
            };

            return value * (multipliers[unit] || 0);

        }

        
        const sortedStreams = finalStreams.sort((a, b) => {
            const qOrder = { '2160p': 10, '4k': 10, '1080p': 8 };
            const aOrder = qOrder[a.name.toLowerCase()] || 0;
            const bOrder = qOrder[b.name.toLowerCase()] || 0;

            if (bOrder !== aOrder) {
                return bOrder - aOrder;
            }

            return parseSizeToBytes(b.size) - parseSizeToBytes(a.size);

        });


        const numberedStreams = sortedStreams.map((stream, index) => ({
            ...stream,
            name: `${index + 1}. ${stream.name}` // "1. 1080p", "2. 2160p", etc.
        }));
        
        // ✅ FIX #1: Don't cache if extraction yielded zero streams
        if (numberedStreams.length === 0) {
            console.log("[HDHub4u] No valid streams extracted - NOT caching empty result");
            return [];
        }
        
        // ✅ FIX #2: Async cache save (fire-and-forget - don't block response)
        if (!DISABLE_CACHE_FOR_TESTING) {
            // Save to cache in background without waiting
            setCachedStreams(tmdbId, mediaType, season, episode, numberedStreams, 3600)
                .then(() => {
                    console.log(`[API-CACHE] ✅ Cached ${numberedStreams.length} streams in background`);
                    return getCacheStats();
                })
                .then(stats => {
                    console.log(`[API-CACHE] Stats: ${stats.totalEntries || 0} entries, ${stats.totalSize || 0} total streams`);
                })
                .catch(error => {
                    console.log('[API-CACHE] Background save error (non-critical):', error.message);
                });
        } else {
            console.log('[CACHE] ⚠️  Not saving to cache (testing mode)');
        }
        
        // ✅ FIX #2: Return immediately - don't wait for cache
        console.log(`[HDHub4u] ✅ Returning ${numberedStreams.length} streams to user`);
        return numberedStreams;
        
    } catch (error) {
        console.error("[HDHub4u] Critical Error:", error);
        return [];
    }
}

export { getStreams, clearAllCache, getCacheStats };
