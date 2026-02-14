// api-cache.js - UPDATED to match new worker endpoints

const CACHE_API_BASE = "https://cache.leokimpese.workers.dev";
const DEFAULT_TTL = 3600;

function generateCacheKey(tmdbId, mediaType, season, episode) {
    return `${tmdbId}_${mediaType}_${season || 'null'}_${episode || 'null'}`;
}

// GET /:key - Retrieve cached streams
export async function getCachedStreams(tmdbId, mediaType, season, episode) {
    const key = generateCacheKey(tmdbId, mediaType, season, episode);
    
    try {
        console.log('[API-CACHE] Fetching:', key);
        
        const response = await fetch(`${CACHE_API_BASE}/${key}`, {  // ✅ Changed from /v1/cache/${key}
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        if (response.status === 404) {
            console.log('[API-CACHE] Miss:', key);
            return null;
        }
        
        if (!response.ok) {
            console.log('[API-CACHE] Error:', response.status);
            return null;
        }
        
        const data = await response.json();
        
        if (!data || !data.streams || !Array.isArray(data.streams)) {
            console.log('[API-CACHE] Invalid response format');
            return null;
        }
        
        console.log(`[API-CACHE] Hit: ${key} (${data.streams.length} streams)`);
        return data.streams;
        
    } catch (error) {
        console.log('[API-CACHE] Fetch error:', error.message);
        return null;
    }
}

// POST / - Save streams to cache
export async function setCachedStreams(tmdbId, mediaType, season, episode, streams, ttl = DEFAULT_TTL) {
    const key = generateCacheKey(tmdbId, mediaType, season, episode);
    
    try {
        console.log(`[API-CACHE] Saving: ${key} (${streams.length} streams, TTL: ${ttl}s)`);
        
        const response = await fetch(CACHE_API_BASE, {  // ✅ Already correct - POST to base URL
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                key: key,
                streams: streams,
                ttl: ttl,
                metadata: {
                    tmdbId,
                    mediaType,
                    season,
                    episode,
                    timestamp: Date.now()
                }
            })
        });
        
        if (!response.ok) {
            console.log('[API-CACHE] Save failed:', response.status);
            return false;
        }
        
        console.log('[API-CACHE] Saved successfully');
        return true;
        
    } catch (error) {
        console.log('[API-CACHE] Save error:', error.message);
        return false;
    }
}

// DELETE /:key - Invalidate cache
export async function invalidateCache(tmdbId, mediaType, season, episode) {
    const key = generateCacheKey(tmdbId, mediaType, season, episode);
    
    try {
        console.log('[API-CACHE] Invalidating:', key);
        
        const response = await fetch(`${CACHE_API_BASE}/${key}`, {  // ✅ Changed from /v1/cache/${key}
            method: 'DELETE'
        });
        
        if (response.ok) {
            console.log('[API-CACHE] Invalidated successfully');
            return true;
        }
        
        console.log('[API-CACHE] Invalidation failed:', response.status);
        return false;
        
    } catch (error) {
        console.log('[API-CACHE] Invalidation error:', error.message);
        return false;
    }
}

// POST /clearall - Clear all cache
export async function clearAllCache() {
    try {
        console.log('[API-CACHE] Clearing all cache...');
        
        const response = await fetch(`${CACHE_API_BASE}/clearall`, {  // ✅ Changed from /v1/cache/clear
            method: 'POST'
        });
        
        if (response.ok) {
            console.log('[API-CACHE] All cache cleared');
            return true;
        }
        
        console.log('[API-CACHE] Clear failed:', response.status);
        return false;
        
    } catch (error) {
        console.log('[API-CACHE] Clear error:', error.message);
        return false;
    }
}

// GET /stats - Get cache statistics
export async function getCacheStats() {
    try {
        const response = await fetch(`${CACHE_API_BASE}/stats`, {  // ✅ Changed from /v1/cache/stats
            method: 'GET'
        });
        
        if (!response.ok) {
            return {
                totalEntries: 0,
                totalSize: 0,
                error: 'Failed to fetch stats'
            };
        }
        
        const stats = await response.json();
        return stats;
        
    } catch (error) {
        console.log('[API-CACHE] Stats error:', error.message);
        return {
            totalEntries: 0,
            totalSize: 0,
            error: error.message
        };
    }
}