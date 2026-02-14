// HDHub4u Provider - HTTP Utilities (OPTIMIZED)
// src/hdhub4u/http.js

import { MAIN_URL, HEADERS, DOMAINS_URL, setMainUrl } from './config.js';

// =================================================================================
// DOMAIN MANAGEMENT (NON-BLOCKING BACKGROUND UPDATES)
// =================================================================================

let domainLastUpdated = 0;
let domainUpdateInProgress = false;
const DOMAIN_UPDATE_INTERVAL = 3600000; // 1 hour in milliseconds

/**
 * Update domain in background without blocking current request
 * Uses fire-and-forget pattern - doesn't await the update
 */
export function triggerDomainUpdate() {
    const now = Date.now();
    
    // Skip if recently updated or update already in progress
    if (now - domainLastUpdated < DOMAIN_UPDATE_INTERVAL || domainUpdateInProgress) {
        return;
    }
    
    // Set flag to prevent duplicate requests
    domainUpdateInProgress = true;
    
    // Fire and forget - don't await
    performDomainUpdate()
        .then(() => {
            domainUpdateInProgress = false;
        })
        .catch(error => {
            console.log('[Domain Update] Background error:', error.message);
            domainUpdateInProgress = false;
        });
}

/**
 * Actual domain update logic (called in background)
 */
async function performDomainUpdate() {
    try {
        console.log('[Domain Update] Checking for new domain (background)...');
        
        const response = await fetch(DOMAINS_URL);
        const data = await response.json();
        
        if (data && data.HDHUB4u && MAIN_URL !== data.HDHUB4u) {
            console.log('[Domain Update] ✓ Domain updated:', data.HDHUB4u);
            setMainUrl(data.HDHUB4u);
            domainLastUpdated = Date.now();
        } else {
            console.log('[Domain Update] ✓ Domain unchanged');
            domainLastUpdated = Date.now();
            HEADERS.Referer = MAIN_URL + '/';
            HEADERS.Origin = MAIN_URL;
        }
    } catch (error) {
        console.log('[Domain Update] Error:', error.message);
        HEADERS.Referer = MAIN_URL + '/';
        HEADERS.Origin = MAIN_URL;
    }
}

/**
 * Initialize headers on first load
 */
export function initializeHeaders() {
    HEADERS.Referer = MAIN_URL + '/';
    HEADERS.Origin = MAIN_URL;
}

// Initialize on module load
initializeHeaders();

// =================================================================================
// FETCH WITH RETRY
// =================================================================================

/**
 * Fetch with automatic retry on failure
 * @param {string} url - URL to fetch
 * @param {object} customHeaders - Additional headers to merge
 * @param {number} maxRetries - Maximum retry attempts (default: 2)
 * @returns {Promise<Response>}
 */
export async function fetchWithRetry(url, customHeaders = {}, maxRetries = 2) {
    const headers = { ...HEADERS, ...customHeaders };
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
            const response = await fetch(url, { headers });
            
            if (!response.ok && attempt < maxRetries) {
                console.log(`[HTTP] Retry ${attempt + 1}/${maxRetries} for:`, url);
                await sleep(1000 * (attempt + 1)); // Exponential backoff
                continue;
            }
            
            return response;
        } catch (error) {
            if (attempt === maxRetries) {
                throw error;
            }
            console.log(`[HTTP] Error on attempt ${attempt + 1}, retrying:`, error.message);
            await sleep(1000 * (attempt + 1));
        }
    }
    
    throw new Error('Max retries reached');
}

/**
 * Sleep utility for retry delays
 */
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// =================================================================================
// SPECIALIZED FETCH FUNCTIONS
// =================================================================================

/**
 * Fetch with HEAD request to get redirect location
 * Useful for services that redirect to actual download URLs
 */
export async function fetchRedirectUrl(url, customHeaders = {}) {
    try {
        const headers = { ...HEADERS, ...customHeaders };
        const response = await fetch(url, {
            method: 'HEAD',
            headers,
            redirect: 'manual'
        });
        
        const location = response.headers.get('hx-redirect') || 
                        response.headers.get('location') ||
                        response.headers.get('Location');
        
        if (location) {
            // Handle relative URLs
            if (location.startsWith('http')) {
                return location;
            } else {
                const baseUrl = new URL(url);
                return baseUrl.origin + location;
            }
        }
        
        return null;
    } catch (error) {
        console.log('[HTTP] Redirect fetch error:', error.message);
        return null;
    }
}

/**
 * Fetch JSON with error handling
 */
export async function fetchJSON(url, customHeaders = {}) {
    try {
        const response = await fetchWithRetry(url, customHeaders);
        return await response.json();
    } catch (error) {
        console.log('[HTTP] JSON fetch error:', error.message);
        return null;
    }
}

/**
 * Fetch text/HTML with error handling
 */
export async function fetchText(url, customHeaders = {}) {
    try {
        const response = await fetchWithRetry(url, customHeaders);
        return await response.text();
    } catch (error) {
        console.log('[HTTP] Text fetch error:', error.message);
        return '';
    }
}
