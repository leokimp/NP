/**
 * ╔══════════════════════════════════════════════════════════════════════════════╗
 * ║                NetMirror — Nuvio Mobile Plugin  v4.0                         ║
 * ╠══════════════════════════════════════════════════════════════════════════════╣
 * ║  Source      › https://net22.cc  /  https://net52.cc                         ║
 * ╠══════════════════════════════════════════════════════════════════════════════╣
 * ║  Platforms   › Netflix · Prime Video · Disney+                               ║
 * ║  Supports    › Movies & Series  (480p / 720p / 1080p / Auto)                 ║
 * ║  Engine      › CJS / Hermes (Nuvio Mobile compatible)                        ║
 * ║  Search      › cloudscraper resolveIds + IMDb AKAs + Pingora-style scoring   ║
 * ╚══════════════════════════════════════════════════════════════════════════════╝
 */

'use strict';

// ─── Hermes-compatible async polyfill ────────────────────────────────────────
var __async = function (__this, __arguments, generator) {
  return new Promise(function (resolve, reject) {
    var fulfilled = function (value) {
      try { step(generator.next(value)); } catch (e) { reject(e); }
    };
    var rejected = function (value) {
      try { step(generator.throw(value)); } catch (e) { reject(e); }
    };
    var step = function (x) {
      return x.done ? resolve(x.value) : Promise.resolve(x.value).then(fulfilled, rejected);
    };
    step((generator = generator.apply(__this, __arguments)).next());
  });
};

// ─── CJS exports ─────────────────────────────────────────────────────────────
var __defProp      = Object.defineProperty;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp   = Object.prototype.hasOwnProperty;
var __export = function (target, all) {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = function (to, from, except, desc) {
  if (from && typeof from === 'object' || typeof from === 'function') {
    for (var key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: function () { return from[key]; }, enumerable: !(desc = Object.getOwnPropertyDescriptor(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = function (mod) {
  return __copyProps(__defProp({}, '__esModule', { value: true }), mod);
};

var netmirror_exports = {};
__export(netmirror_exports, {
  getStreams: function () { return getStreams; }
});
module.exports = __toCommonJS(netmirror_exports);

// ─────────────────────────────────────────────────────────────────────────────
// Configuration
// ─────────────────────────────────────────────────────────────────────────────
// ✨ TOGGLE 1 ✨
// true  = Deep-dive playlist parsing (Checks for 29s dummy videos, slower)
// false = Fast pass-through (no validation, fastest)
var ENABLE_DEEP_VALIDATION = false;

// ✨ TOGGLE 2 ✨
// true  = Resolve net52.cc master playlists to direct CDN sub-playlist URLs
//         e.g. https://s20.freecdn1.top/files/81715676/1080p/1080p.m3u8?in=...
//         Slower (one extra fetch per stream) but bypasses the proxy hop.
// false = Pass the original net52.cc HLS URL straight to the app (current behaviour)
var ENABLE_DIRECT_CDN_LINKS = true;

// ✨ TOGGLE 3 ✨
// true  = On first scrape, save stream links to your Cloudflare cache worker.
//         On subsequent scrapes within the TTL window the worker is called first;
//         if it returns streams the full bypass/search/playlist pipeline is skipped
//         entirely — making repeat loads nearly instant.
// false = Always scrape fresh (current behaviour, no worker calls)
//
// ⚠ You MUST point CACHE_WORKER_URL at a worker that implements the same REST
//   contract as cache.leokimpese.workers.dev (used by cloudscraper.js):
//     GET  /<key>   → { streams:[...] }  or  HTTP 404
//     POST /        ← { key, streams, ttl, metadata }
//     POST /clearall
//     GET  /stats
//
// Stream URLs contain an expiry token in the `in=` query parameter.
// Keep CACHE_TTL_SECONDS well below the token lifetime (usually ~24 h).
// 3 600 s (1 h) is a safe conservative default.
var ENABLE_STREAM_CACHE  = false;
var CACHE_WORKER_URL     = 'https://cache.leokimpese.workers.dev';
var CACHE_TTL_SECONDS    = 3600;   // seconds — how long the worker stores stream links


var TMDB_API_KEY    = '439c478a771f35c05022f9feabcca01c';
var NETMIRROR_BASE  = 'https://net52.cc';
var NETMIRROR_PLAY  = 'https://net52.cc';
var PLUGIN_TAG      = '[NetMirror]';





var COOKIE_EXPIRY_MS = 15 * 60 * 60 * 1000;
var _cachedCookie    = '';
var _cookieTimestamp = 0;

// In-flight deduplication: if two identical getStreams() calls arrive while the
// first scrape is still running, the second one awaits the SAME Promise instead
// of spawning a duplicate bypass/search/playlist pipeline.
// Keyed by nmCacheKey(); entries are deleted automatically when the Promise settles.
var _nmInFlight = {};

var PLATFORM_OTT = { netflix: 'nf', primevideo: 'pv', disney: 'hs' };
var PLATFORM_LABEL = { netflix: 'Netflix', primevideo: 'Prime Video', disney: 'Disney+' };

// Switch to the working net52 CDN backend
var NETMIRROR_BASE = 'https://net52.cc';
var NETMIRROR_PLAY = 'https://net52.cc';

var SEARCH_ENDPOINT = {
  netflix    : NETMIRROR_BASE + '/search.php',
  primevideo : NETMIRROR_BASE + '/pv/search.php',
  disney     : NETMIRROR_BASE + '/mobile/hs/search.php',
};
var EPISODES_ENDPOINT = {
  netflix    : NETMIRROR_BASE + '/episodes.php',
  primevideo : NETMIRROR_BASE + '/pv/episodes.php',
  disney     : NETMIRROR_BASE + '/mobile/hs/episodes.php',
};
var POST_ENDPOINT = {
  netflix    : NETMIRROR_BASE + '/mobile/post.php',
  primevideo : NETMIRROR_BASE + '/mobile/pv/post.php',
  disney     : NETMIRROR_BASE + '/mobile/hs/post.php',
};
var PLAYLIST_ENDPOINT = {
  netflix    : NETMIRROR_PLAY + '/mobile/playlist.php',
  primevideo : NETMIRROR_PLAY + '/mobile/pv/playlist.php',
  disney     : NETMIRROR_PLAY + '/mobile/hs/playlist.php',
};

// CRITICAL: The mobile API demands these exact headers to bypass the HTML block.
var BASE_HEADERS = {
  'User-Agent'         : 'Mozilla/5.0 (Linux; Android 16; CPH2723 Build/AP3A.240617.008; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/146.0.7680.178 Mobile Safari/537.36 /OS.Gatu v3.0',
  'Accept'             : 'application/json, text/plain, */*',
  'Accept-Language'    : 'en-US,en;q=0.9',
  'X-Requested-With'   : 'app.netmirror.netmirrornew', 
  'sec-ch-ua-platform' : '"Android"',
  'Connection'         : 'keep-alive',
};
// ─────────────────────────────────────────────────────────────────────────────
// Utilities
// ─────────────────────────────────────────────────────────────────────────────

function unixNow() { return Math.floor(Date.now() / 1000); }

function makeCookieString(obj) {
  return Object.entries(obj).map(function (kv) { return kv[0] + '=' + kv[1]; }).join('; ');
}

// Decodes HTML entities returned by the server in episode titles.
// e.g. &#34;Get Some&#34;  →  "Get Some"
//      &amp;            →  &
//      &lt; / &gt;     →  < / >
function decodeHtmlEntities(str) {
  if (!str) return str;
  return str
    .replace(/&#(\d+);/g,   function (_, code) { return String.fromCharCode(parseInt(code, 10)); })
    .replace(/&#x([0-9a-f]+);/gi, function (_, hex)  { return String.fromCharCode(parseInt(hex, 16)); })
    .replace(/&quot;/gi,  '"')
    .replace(/&apos;/gi, "'")
    .replace(/&amp;/gi,  '&')
    .replace(/&lt;/gi,   '<')
    .replace(/&gt;/gi,   '>');
}

// ─────────────────────────────────────────────────────────────────────────────
// Stream Cache  (ENABLE_STREAM_CACHE)
//
// Mirrors the cache.leokimpese.workers.dev contract used by cloudscraper.js.
// Cache keys are prefixed with "nm_" so this plugin's entries never collide
// with another plugin's data, even when both share the same worker URL.
//
// Why stream headers are safe to cache:
//   buildStream() sets  Cookie: 'hd=on'  — a static, non-session value.
//   The auth token lives inside the stream URL's `in=` query parameter,
//   not in the Cookie header, so cached objects stay playable until the
//   token expiry that is already baked into the URL itself.
// ─────────────────────────────────────────────────────────────────────────────

// Build a unique string key for a given content/episode combination.
// Format: nm_<tmdbId>_<type>_<season>_<episode>
function nmCacheKey(tmdbId, type, season, episode) {
  return 'nm_' + tmdbId +
    '_' + (type    || 'movie') +
    '_' + (season  != null ? season  : 'null') +
    '_' + (episode != null ? episode : 'null');
}

// GET /<key>  →  { streams:[...] } | HTTP 404
// Returns the streams array on a cache hit, or null on miss / any error.
// Never throws — callers can always treat null as "go scrape".
function nmGetCachedStreams(tmdbId, type, season, episode) {
  var key = nmCacheKey(tmdbId, type, season, episode);
  console.log(PLUGIN_TAG + ' [CACHE] Checking key: ' + key);

  return fetch(CACHE_WORKER_URL + '/' + key, {
    method : 'GET',
    headers: { 'Content-Type': 'application/json' },
  })
  .then(function (res) {
    if (res.status === 404) {
      console.log(PLUGIN_TAG + ' [CACHE] Miss: ' + key);
      return null;
    }
    if (!res.ok) {
      console.log(PLUGIN_TAG + ' [CACHE] Worker error: HTTP ' + res.status);
      return null;
    }
    return res.json();
  })
  .then(function (data) {
    if (!data || !Array.isArray(data.streams) || !data.streams.length) {
      console.log(PLUGIN_TAG + ' [CACHE] Invalid payload — treating as miss.');
      return null;
    }
    console.log(PLUGIN_TAG + ' [CACHE] ⚡ Hit: ' + key + ' (' + data.streams.length + ' stream(s))');
    return data.streams;
  })
  .catch(function (err) {
    // Network failure, malformed JSON, etc. — just treat as miss so scraping proceeds.
    console.log(PLUGIN_TAG + ' [CACHE] Fetch error: ' + err.message + ' — proceeding with scrape.');
    return null;
  });
}

// POST /  ←  { key, streams, ttl, metadata }
// Fire-and-forget safe: errors only log, never bubble up to the caller.
function nmSetCachedStreams(tmdbId, type, season, episode, streams, ttl) {
  var key     = nmCacheKey(tmdbId, type, season, episode);
  var ttlSecs = ttl || CACHE_TTL_SECONDS;

  console.log(PLUGIN_TAG + ' [CACHE] Saving: ' + key +
    ' (' + streams.length + ' stream(s), TTL: ' + ttlSecs + 's)');

  return fetch(CACHE_WORKER_URL, {
    method : 'POST',
    headers: { 'Content-Type': 'application/json' },
    body   : JSON.stringify({
      key     : key,
      streams : streams,
      ttl     : ttlSecs,
      metadata: {
        tmdbId  : tmdbId,
        type    : type,
        season  : season,
        episode : episode,
        savedAt : Date.now(),
        plugin  : 'netmirror-v10',
      },
    }),
  })
  .then(function (res) {
    if (!res.ok) {
      console.log(PLUGIN_TAG + ' [CACHE] Save failed: HTTP ' + res.status);
      return false;
    }
    console.log(PLUGIN_TAG + ' [CACHE] Saved ✓ (' + key + ')');
    return true;
  })
  .catch(function (err) {
    console.log(PLUGIN_TAG + ' [CACHE] Save error: ' + err.message);
    return false;
  });
}


// Fetches the net52.cc master playlist and swaps the stream URL for the direct
// CDN sub-playlist URL that matches the stream's quality label.
// ─────────────────────────────────────────────────────────────────────────────
function resolveDirectCdnLink(streamObj) {
  if (!ENABLE_DIRECT_CDN_LINKS) return Promise.resolve(streamObj);

  console.log(PLUGIN_TAG + ' [CDN RESOLVE] Fetching master: ' + streamObj.url);

  return fetch(streamObj.url, { method: 'GET', headers: streamObj.headers })
    .then(function (res) {
      if (!res.ok) {
        console.warn(PLUGIN_TAG + ' [CDN RESOLVE] HTTP ' + res.status + ' — keeping original URL.');
        return streamObj;
      }
      return res.text();
    })
    .then(function (playlistText) {
      if (!playlistText) return streamObj;
      // --- THE AUDIO FIX ---
      // If the master playlist contains demuxed audio, we MUST NOT strip the sub-playlist.
      // Pass the original Master URL to the player so it can find the audio tracks.
      if (playlistText.includes('#EXT-X-MEDIA:TYPE=AUDIO')) {
        console.log(PLUGIN_TAG + ' [CDN RESOLVE] Demuxed audio detected. Passing original Master URL to preserve audio.');
        return streamObj; 
      }
      // --- DEBUG INJECTION 2: Detect separate audio tracks ---
      if (playlistText.includes('#EXT-X-MEDIA:TYPE=AUDIO')) {
        console.warn(PLUGIN_TAG + ' [DEBUG-AUDIO] 🚨 SEPARATE AUDIO DETECTED IN MASTER PLAYLIST! 🚨');
        console.log(PLUGIN_TAG + ' [DEBUG-AUDIO] Master Dump:\n' + playlistText.substring(0, 1000));
      }
      // -------------------------------------------------------

      // If this is already a media playlist (no variant tags), pass through as-is
      if (!playlistText.includes('#EXT-X-STREAM-INF')) {
        console.log(PLUGIN_TAG + ' [CDN RESOLVE] Not a master playlist — keeping original URL.');
        return streamObj;
      }

      // ── Parse every variant entry in the master playlist ──────────────────
      var lines = playlistText.split('\n');
      var variants = [];

      for (var i = 0; i < lines.length; i++) {
        if (!lines[i].includes('#EXT-X-STREAM-INF')) continue;
        var infLine = lines[i];

        // The very next non-comment, non-empty line is the variant URL
        for (var j = i + 1; j < lines.length; j++) {
          var line = lines[j].trim();
          if (!line || line.startsWith('#')) continue;

          // Build absolute CDN URL
          var varUrl = line;
          if (!varUrl.startsWith('http')) {
            if (varUrl.startsWith('/')) {
              var domainMatch = streamObj.url.match(/^(https?:\/\/[^\/]+)/);
              varUrl = (domainMatch ? domainMatch[1] : NETMIRROR_PLAY) + varUrl;
            } else {
              var basePath = streamObj.url.substring(0, streamObj.url.lastIndexOf('/') + 1);
              varUrl = basePath + varUrl;
            }
          }

          // Detect quality from the URL path segment (e.g. "/1080p/") …
          var qualFromPath = varUrl.match(/\/(1080p|720p|480p|360p)\//i);
          // … or fall back to RESOLUTION= height in the #EXT-X-STREAM-INF line
          var resMatch  = infLine.match(/RESOLUTION=\d+x(\d+)/i);
          var bwMatch   = infLine.match(/BANDWIDTH=(\d+)/i);

          var varQuality = null;
          if (qualFromPath) {
            varQuality = qualFromPath[1].toLowerCase();
          } else if (resMatch) {
            var h = parseInt(resMatch[1]);
            if      (h >= 1080) varQuality = '1080p';
            else if (h >= 720)  varQuality = '720p';
            else if (h >= 480)  varQuality = '480p';
            else                varQuality = '360p';
          }

          variants.push({
            url      : varUrl,
            quality  : varQuality,
            bandwidth: bwMatch ? parseInt(bwMatch[1]) : 0,
          });
          break; // move on to the next #EXT-X-STREAM-INF
        }
      }

      if (!variants.length) {
        console.warn(PLUGIN_TAG + ' [CDN RESOLVE] No variants parsed — keeping original URL.');
        return streamObj;
      }

      // ── Pick the variant whose quality matches the stream label ───────────
      var targetQuality = (streamObj._quality || '').toLowerCase();
      var match = null;

      if (targetQuality && targetQuality !== 'auto') {
        match = variants.find(function (v) { return v.quality === targetQuality; });
      }

      // If no exact quality match, fall back to the highest-bandwidth variant
      if (!match) {
        variants.sort(function (a, b) { return b.bandwidth - a.bandwidth; });
        match = variants[0];
        console.log(PLUGIN_TAG + ' [CDN RESOLVE] No exact quality match for "' + targetQuality + '" — using highest bandwidth variant.');
      }

      console.log(PLUGIN_TAG + ' [CDN RESOLVE] ✓ ' + streamObj.url + '\n              → ' + match.url);

      // Return a new stream object with the direct CDN URL swapped in
      return Object.assign({}, streamObj, { url: match.url });
    })
    .catch(function (err) {
      console.warn(PLUGIN_TAG + ' [CDN RESOLVE ERROR] ' + err.message + ' — keeping original URL.');
      return streamObj;
    });
}


function checkStreamAlive(streamObj) {
  // ==========================================
  // FAST MODE (ENABLE_DEEP_VALIDATION = false)
  // ==========================================
  if (!ENABLE_DEEP_VALIDATION) {
    return Promise.resolve(streamObj);
  }

  // ==========================================
  // PERMISSIVE MODE (ENABLE_DEEP_VALIDATION = true)
  // Only confirmed dummy videos (< 60s) are dropped.
  // Everything else is sent to the app.
  // ==========================================
  return fetch(streamObj.url, {
    method: 'GET',
    headers: streamObj.headers
  })
  .then(function(res) {
    if (!res.ok) {
       console.warn(PLUGIN_TAG + ' [HTTP ' + res.status + '] Cannot validate, but sending to app.');
       return streamObj;
    }
    return res.text();
  })
  .then(function(playlistText) {
    if (!playlistText) return streamObj; // Pass to app if empty

    // Helper to calculate total duration from a playlist body
    function calcDuration(text) {
        var extinfRegex = /#EXTINF:(\d+(?:\.\d+)?)/g;
        var match;
        var total = 0;
        var count = 0;
        while ((match = extinfRegex.exec(text)) !== null) {
            total += parseFloat(match[1]);
            count++;
        }
        return { total: total, count: count };
    }

    // SCENARIO 1: It is already a Media Playlist
    if (playlistText.includes('#EXTINF:')) {
        var d = calcDuration(playlistText);
        console.log(PLUGIN_TAG + ' [MEDIA PLAYLIST] Duration: ' + d.total.toFixed(2) + 's (' + d.count + ' segments)');

        // The ONLY time we drop a link: confirmed dummy video
        if (d.total < 60 && d.total > 0) {
            console.warn(PLUGIN_TAG + ' [DUMMY VIDEO DETECTED] Duration ' + d.total.toFixed(2) + 's. Dropping.');
            return null;
        }
        console.log(PLUGIN_TAG + ' [VALIDATED] ' + streamObj.url);
        return streamObj;
    }

    // SCENARIO 2: It is a Master Playlist. We must dig deeper.
    else if (playlistText.includes('#EXT-X-STREAM-INF')) {
        console.log(PLUGIN_TAG + ' [MASTER PLAYLIST] Found. Digging for sub-playlist...');

        var lines = playlistText.split('\n');
        var subUrl = null;

        // Find the first URL right after an #EXT-X-STREAM-INF tag
        for (var i = 0; i < lines.length; i++) {
            if (lines[i].includes('#EXT-X-STREAM-INF')) {
                for (var j = i + 1; j < lines.length; j++) {
                    var line = lines[j].trim();
                    if (line && !line.startsWith('#')) {
                        subUrl = line;
                        break;
                    }
                }
                if (subUrl) break;
            }
        }

        if (!subUrl) {
            console.warn(PLUGIN_TAG + ' [MASTER PLAYLIST] Cannot extract sub-playlist, sending to app.');
            return streamObj;
        }

        // Build the absolute URL for the sub-playlist
        var absoluteSubUrl = subUrl;
        if (!subUrl.startsWith('http')) {
            if (subUrl.startsWith('/')) {
                // If it starts with a single slash, attach to base domain
                var domainMatch = streamObj.url.match(/^(https?:\/\/[^\/]+)/);
                absoluteSubUrl = (domainMatch ? domainMatch[1] : NETMIRROR_PLAY) + subUrl;
            } else {
                // Relative path (e.g., "video_1080p.m3u8") - attach to current path folder
                var basePath = streamObj.url.substring(0, streamObj.url.lastIndexOf('/') + 1);
                absoluteSubUrl = basePath + subUrl;
            }
        }

        console.log(PLUGIN_TAG + ' [SUB-PLAYLIST] Fetching: ' + absoluteSubUrl);

        // Fetch the Sub-Playlist
        return fetch(absoluteSubUrl, {
            method: 'GET',
            headers: streamObj.headers
        })
        .then(function(subRes) {
             if (!subRes.ok) throw new Error('Sub-playlist HTTP ' + subRes.status);
             return subRes.text();
        })
        .then(function(subText) {
             var subD = calcDuration(subText);
             console.log(PLUGIN_TAG + ' [SUB-PLAYLIST] Duration: ' + subD.total.toFixed(2) + 's (' + subD.count + ' segments)');

             // The ONLY time we drop inside a master playlist: confirmed dummy video
             if (subD.total < 60 && subD.total > 0) {
                 console.warn(PLUGIN_TAG + ' [DUMMY VIDEO DETECTED inside Master] Duration ' + subD.total.toFixed(2) + 's. Dropping.');
                 return null;
             }

             console.log(PLUGIN_TAG + ' [VALIDATED] ' + streamObj.url);
             return streamObj; // Return the ORIGINAL Master Playlist object to Nuvio
        })
        .catch(function(e) {
             console.warn(PLUGIN_TAG + ' [SUB-PLAYLIST ERROR] ' + e.message + ' -> Sending to app anyway.');
             return streamObj;
        });
    }

    // SCENARIO 3: Unknown format — send to app anyway
    else {
         console.warn(PLUGIN_TAG + ' [UNKNOWN FORMAT] Sending to app anyway.');
         return streamObj;
    }
  })
  .catch(function(err) {
    console.warn(PLUGIN_TAG + ' [NETWORK ERROR] ' + err.message + ' -> Sending to app anyway.');
    return streamObj;
  });
}


function request(url, opts) {
  opts = opts || {};
  return fetch(url, Object.assign({ redirect: 'follow' }, opts, {
    headers: Object.assign({}, BASE_HEADERS, opts.headers || {}),
  })).then(function (res) {
    if (!res.ok) throw new Error('HTTP ' + res.status + ' for ' + url);
    return res;
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Language helpers
// ─────────────────────────────────────────────────────────────────────────────

var LANG_MAP = {
  ces:'Czech',cze:'Czech',deu:'German',ger:'German',eng:'English',spa:'Spanish',
  fra:'French',fre:'French',hin:'Hindi',hun:'Hungarian',ita:'Italian',jpn:'Japanese',
  pol:'Polish',por:'Portuguese',tur:'Turkish',ukr:'Ukrainian',kor:'Korean',
  zho:'Chinese',chi:'Chinese',ara:'Arabic',rus:'Russian',tam:'Tamil',tel:'Telugu',
  mal:'Malayalam',ben:'Bengali',mar:'Marathi',pan:'Punjabi',pun:'Punjabi',tha:'Thai',
  vie:'Vietnamese',ind:'Indonesian',msa:'Malay',nld:'Dutch',swe:'Swedish',
  nor:'Norwegian',dan:'Danish',fin:'Finnish',ron:'Romanian',bul:'Bulgarian',
  hrv:'Croatian',slk:'Slovak',srp:'Serbian',heb:'Hebrew',
};

function parseLangArray(langs) {
  if (!Array.isArray(langs) || !langs.length) return [];
  var seen = {}, result = [];
  langs.forEach(function (e) {
    var l = e.l || LANG_MAP[(e.s || '').toLowerCase()] || null;
    if (l && !seen[l]) { seen[l] = true; result.push(l); }
  });
  return result;
}

function formatLangs(langs) {
  if (!langs || !langs.length) return null;
  return langs.slice(0, 5).join(' - ') + (langs.length > 5 ? ' +' + (langs.length - 5) + ' more' : '');
}

// ─────────────────────────────────────────────────────────────────────────────
// Quality helpers
// ─────────────────────────────────────────────────────────────────────────────

function parseQuality(source) {
  if (source.quality) {
    var m = (source.quality + '').match(/(\d{3,4}p)/i);
    if (m) return m[1].toLowerCase();
    var q = source.quality.toLowerCase();
    if (q.includes('1080') || q.includes('full hd') || q.includes('fhd')) return '1080p';
    if (q.includes('720') || q === 'hd') return '720p';
    if (q.includes('480')) return '480p';
    if (q.includes('360')) return '360p';
    if (q === 'auto') return 'Auto';
    return source.quality;
  }
  var url = source.url || source.file || '';
  var p = url.match(/[?&]q=(\d{3,4}p)/i);
  if (p) return p[1].toLowerCase();
  if (url.includes('1080')) return '1080p';
  if (url.includes('720')) return '720p';
  if (url.includes('480')) return '480p';
  if (url.includes('360')) return '360p';
  return 'Auto';
}

function qualitySortScore(q) {
  if (!q) return 0;
  var m = q.match(/(\d+)p/i);
  if (m) return parseInt(m[1]);
  return q.toLowerCase() === 'auto' ? 9999 : 0;
}

// ─────────────────────────────────────────────────────────────────────────────
// ── SEARCH ENGINE — ported from cloudscraper.js ──────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────

function seqRatio(a, b) {
  if (!a || !b) return 0;
  var la = a.length, lb = b.length;
  if (la === 0 && lb === 0) return 1;
  var dp = Array.from({ length: la + 1 }, function () { return new Array(lb + 1).fill(0); });
  var best = 0;
  for (var i = 1; i <= la; i++)
    for (var j = 1; j <= lb; j++) {
      dp[i][j] = a[i - 1] === b[j - 1] ? dp[i - 1][j - 1] + 1 : 0;
      if (dp[i][j] > best) best = dp[i][j];
    }
  return 2 * best / (la + lb);
}

function jaccardWords(a, b) {
  var sa = new Set(a.split(/\s+/).filter(Boolean));
  var sb = new Set(b.split(/\s+/).filter(Boolean));
  var inter = 0;
  sa.forEach(function (w) { if (sb.has(w)) inter++; });
  var union = new Set(Array.from(sa).concat(Array.from(sb))).size;
  return union === 0 ? 0 : inter / union;
}

function normTitle(s) {
  return s
    .replace(/&amp;/gi, '&')
    .toLowerCase()
    .replace(/\s*&\s*/g, ' and ')
    .replace(/\(\d{4}\)/g, '')
    .replace(/\bseason\s*\d+\b/gi, '')
    .replace(/\bs\d{1,2}\b/gi, '')
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function calcTitleSim(query, candidate) {
  var q = normTitle(query);
  var c = normTitle(candidate);
  if (!q || !c) return 0;
  if (q === c) return 1.0;

  var esc = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  if (new RegExp('^' + esc + '\\b').test(c)) {
    return 0.65;
  }
  if (new RegExp('\\b' + esc + '\\b').test(c)) {
    return 0.60;
  }
  return Math.max(seqRatio(q, c), jaccardWords(q, c)) * 0.8;
}

function scoreResult(query, resultTitle, targetYear, resultYear) {
  var titleScore = calcTitleSim(query, resultTitle);
  var rankScore = titleScore;

  var rYear = resultYear || (resultTitle.match(/\b(19|20)\d{2}\b/) || [])[0];
  
  if (targetYear && rYear) {
    var delta = Math.abs(parseInt(targetYear) - parseInt(rYear));
    if (delta === 0) {
      rankScore += 0.15;
    } else if (delta === 1) {
      rankScore += 0.05;
    } else {
      rankScore -= 0.30;
    }
  } else if (targetYear && !rYear && titleScore < 1.0) {
    rankScore -= 0.10;
  }
  
  return rankScore >= 0.72 ? rankScore : 0;
}

function resolveIds(rawId, type) {
  return __async(this, null, function* () {
    var isTv      = (type === 'series' || type === 'tv');
    var mediaType = isTv ? 'tv' : 'movie';
    var imdbId    = null;
    var title     = '';
    var year      = '';

    if (rawId && rawId.startsWith('tt')) {
      console.log(PLUGIN_TAG + ' [resolveIds] IMDb path: ' + rawId);
      imdbId = rawId;
      var iRes = yield fetch('https://api.imdbapi.dev/titles/' + rawId)
        .then(function (r) { return r.json(); }).catch(function () { return null; });
      if (iRes) {
        title = iRes.originalTitle || iRes.primaryTitle || '';
        year  = iRes.startYear ? String(iRes.startYear) : '';
      }

    } else {
      var tmdbId = (rawId || '').replace(/^tmdb:/i, '');
      console.log(PLUGIN_TAG + ' [resolveIds] TMDB path: ' + tmdbId);
      var info = yield fetch(
        'https://api.themoviedb.org/3/' + mediaType + '/' + tmdbId +
        '?api_key=' + TMDB_API_KEY + '&append_to_response=external_ids'
      ).then(function (r) { return r.json(); }).catch(function () { return {}; });

      imdbId = info.imdb_id || (info.external_ids && info.external_ids.imdb_id) || null;
      title  = (isTv ? info.name : info.title) || '';
      year   = ((isTv ? info.first_air_date : info.release_date) || '').slice(0, 4);
    }

    var searchQueue   = [];
    var resolvedTitle = title;

    if (imdbId) {
      var fetched = yield Promise.all([
        fetch('https://api.imdbapi.dev/titles/' + imdbId)
          .then(function (r) { return r.json(); }).catch(function () { return null; }),
        fetch('https://api.imdbapi.dev/titles/' + imdbId + '/akas')
          .then(function (r) { return r.json(); }).catch(function () { return { akas: [] }; }),
      ]);
      var imdbInfo = fetched[0];
      var akasData = fetched[1] || { akas: [] };

      if (imdbInfo) {
        if (imdbInfo.originalTitle && searchQueue.indexOf(imdbInfo.originalTitle) === -1)
          searchQueue.push(imdbInfo.originalTitle);
        if (imdbInfo.primaryTitle && searchQueue.indexOf(imdbInfo.primaryTitle) === -1)
          searchQueue.push(imdbInfo.primaryTitle);
        resolvedTitle = imdbInfo.originalTitle || imdbInfo.primaryTitle || title;
      }

      var indianAkas = (akasData.akas || [])
        .filter(function (a) { return a.country && a.country.code === 'IN'; })
        .map(function (a) { return a.text; })
        .filter(function (t) { return /^[\w\s\-':.!&\u2013\u2014(),]+$/.test(t); });
      indianAkas.forEach(function (aka) {
        if (searchQueue.indexOf(aka) === -1) searchQueue.push(aka);
      });
    }

    if (searchQueue.length === 0) searchQueue.push(resolvedTitle || title);

    var base      = resolvedTitle || title;
    var partMatch = base.match(/^([^:\-\u2013\u2014]+).*?(?:Part|Pt\.?)\s*(\d+)\s*$/i);
    if (partMatch) {
      var shortVariant = partMatch[1].trim() + ' ' + partMatch[2];
      console.log(PLUGIN_TAG + ' [resolveIds] Sequel variant: ' + shortVariant);
      if (searchQueue.indexOf(shortVariant) === -1) searchQueue.push(shortVariant);
    }

    if (base.includes(':')) {
      var splitTitle = base.split(':')[0].trim();
      if (searchQueue.indexOf(splitTitle) === -1) {
        console.log(PLUGIN_TAG + ' [resolveIds] Colon variant: ' + splitTitle);
        searchQueue.push(splitTitle);
      }
    }

    var numMatch = base.match(/^([^\d]+\s\d+)\b/i);
    if (numMatch && numMatch[1].length < base.length) {
      var shortNum = numMatch[1].trim();
      if (!/\b(19|20)\d{2}\b/.test(shortNum)) {
        console.log(PLUGIN_TAG + ' [resolveIds] Number variant: ' + shortNum);
        if (searchQueue.indexOf(shortNum) === -1) searchQueue.push(shortNum);
      }
    }

    console.log(PLUGIN_TAG + ' [resolveIds] title="' + (resolvedTitle || title) + '" year=' + year + ' imdb=' + imdbId);
    console.log(PLUGIN_TAG + ' [resolveIds] queue=[' + searchQueue.join(' | ') + ']');

    return {
      title       : resolvedTitle || title,
      year        : year,
      isTv        : isTv,
      imdbId      : imdbId,
      searchQueue : searchQueue,
    };
  });
}

function searchPlatform(searchQueue, year, platform, cookie, isTv) {
  var ott  = PLATFORM_OTT[platform];
  var jar  = makeCookieString({ t_hash_t: cookie.t_hash_t, t_hash: cookie.t_hash, hd: 'on', ott: ott });
  var hdrs = Object.assign({}, BASE_HEADERS, { Cookie: jar, Referer: NETMIRROR_BASE + '/home' });

  function doSearch(originalQuery, searchQuery) {
    var url = SEARCH_ENDPOINT[platform] + '?s=' + encodeURIComponent(searchQuery) + '&t=' + unixNow();
    return request(url, { headers: hdrs })
      .then(function (res) { return res.json(); })
      .then(function (data) {
        var candidates = data.searchResult || [];
        if (!candidates.length) return null;
        var best = null;
        candidates.forEach(function (item) {
          if (item.r) {
            var rStr = String(item.r).toLowerCase();
            var isItemSeries = rStr.includes('series') || rStr.includes('season') || rStr.includes('episode');
            if (isTv && !isItemSeries && /\d+(h|m)/.test(rStr)) return;
            if (!isTv && isItemSeries) return;
          }

          var rank = scoreResult(originalQuery, item.t, year, item.y);
          if (rank > 0 && (!best || rank > best.score))
            best = { id: item.id, title: item.t, score: rank };
        });
        return best;
      }).catch(function () { return null; });
  }

  var pairs = [];
  searchQueue.forEach(function (q) {
    pairs.push({ original: q, search: q });
    if (year && !q.includes(year)) pairs.push({ original: q, search: q + ' ' + year });
  });

  return Promise.all(pairs.map(function (p) { return doSearch(p.original, p.search); }))
    .then(function (hits) {
      var best = null;
      hits.forEach(function (hit) {
        if (!hit) return;
        if (!best || hit.score > best.score) best = hit;
      });
      if (best) console.log(PLUGIN_TAG + ' [' + platform + '] Best: "' + best.title + '" score=' + best.score.toFixed(3));
      else console.log(PLUGIN_TAG + ' [' + platform + '] No match above threshold (0.72)');
      return best;
    });
}

function bypass() {
  var now = Date.now();
  if (_cachedCookie && _cachedCookie.t_hash_t && (now - _cookieTimestamp) < COOKIE_EXPIRY_MS) {
    console.log(PLUGIN_TAG + ' Using cached auth cookies.');
    return Promise.resolve(_cachedCookie);
  }
  console.log(PLUGIN_TAG + ' Bypassing authentication (Fetching Desktop & Mobile tokens)...');
  
  function attempt(n) {
    if (n >= 5) return Promise.reject(new Error('Bypass failed after 5 attempts'));
    
    // Step 1: Get Desktop Token (required for the video 'in=' parameter)
    return fetch(NETMIRROR_PLAY + '/tv/p.php', { method: 'POST', redirect: 'follow', headers: BASE_HEADERS })
      .then(function(res1) {
        var raw1 = res1.headers.get('set-cookie') || '';
        var m1 = (Array.isArray(raw1) ? raw1.join('; ') : raw1).match(/t_hash_t=([^;,\s]+)/);
        var t_hash_t = m1 ? m1[1] : null;

        // Step 2: Get Mobile Token (required to bypass HTML block)
        return fetch(NETMIRROR_PLAY + '/mobile/p.php', { 
          method: 'POST', 
          redirect: 'follow', 
          headers: Object.assign({}, BASE_HEADERS, {
              'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
              'X-Requested-With': 'XMLHttpRequest'
          }),
          body: 'hash=ffb1d9b5ba49418751b3d03f051b456d%3A%3A4166207771%3A%3Ani'
        })
        .then(function(res2) {
           var raw2 = res2.headers.get('set-cookie') || '';
           var m2 = (Array.isArray(raw2) ? raw2.join('; ') : raw2).match(/t_hash=([^;,\s]+)/);
           var t_hash = m2 ? m2[1] : null;

           return res2.text().then(function(body) {
              if (!body.includes('"r":"n"')) return attempt(n + 1);
              if (!t_hash_t || !t_hash) return attempt(n + 1);
              
              _cachedCookie = { t_hash_t: t_hash_t, t_hash: t_hash };
              _cookieTimestamp = Date.now();
              console.log(PLUGIN_TAG + ' Auth successful. Both cookies set.');
              return _cachedCookie;
           });
        });
      });
  }
  return attempt(0);
}

function loadContent(contentId, platform, cookie) {
  var ott  = PLATFORM_OTT[platform];
  var jar  = makeCookieString({ t_hash: cookie.t_hash, t_hash_t: cookie.t_hash_t, ott: ott, hd: 'on' });
  var hdrs = Object.assign({}, BASE_HEADERS, { Cookie: jar, Referer: NETMIRROR_BASE + '/home' });
  return request(POST_ENDPOINT[platform] + '?id=' + contentId + '&t=' + unixNow(), { headers: hdrs })
    .then(function (res) { return res.json(); })
    .then(function (data) {
      console.log(PLUGIN_TAG + ' Loaded: "' + data.title + '"');
      return {
        id       : contentId,
        title    : data.title,
        year     : data.year,
        episodes : (data.episodes || []).filter(Boolean),
        seasons  : data.season  || [],
        langs    : parseLangArray(data.lang || []),
        runtime  : data.runtime || null,
        isMovie  : !data.episodes || !data.episodes[0],
        _raw     : data,
      };
    });
}

function fetchMoreEpisodes(contentId, seasonId, platform, cookie, startPage) {
  var ott  = PLATFORM_OTT[platform];
  var jar  = makeCookieString({ t_hash: cookie.t_hash, t_hash_t: cookie.t_hash_t, ott: ott, hd: 'on' });
  var hdrs = Object.assign({}, BASE_HEADERS, { Cookie: jar, Referer: NETMIRROR_BASE + '/home' });
  var collected = [];
  function page(n) {
    return request(
      EPISODES_ENDPOINT[platform] + '?s=' + seasonId + '&series=' + contentId + '&t=' + unixNow() + '&page=' + n,
      { headers: hdrs }
    ).then(function (res) { return res.json(); })
      .then(function (data) {
        if (data.episodes) collected = collected.concat(data.episodes.filter(Boolean));
        return data.nextPageShow === 0 ? collected : page(n + 1);
      }).catch(function () { return collected; });
  }
  return page(startPage || 2);
}

function getPlaylist(contentId, title, platform, cookie) {
  var ott = PLATFORM_OTT[platform];
  var jar = makeCookieString({ t_hash: cookie.t_hash, t_hash_t: cookie.t_hash_t, ott: ott, hd: 'on' });
  var url = PLAYLIST_ENDPOINT[platform]
    + '?id='  + contentId
    + '&t='   + encodeURIComponent(title)
    + '&tm='  + unixNow();
  return request(url, {
    headers: Object.assign({}, BASE_HEADERS, { Cookie: jar, Referer: NETMIRROR_PLAY + '/' }),
  }).then(function (res) { return res.json(); })
    .then(function (playlist) {
      if (!Array.isArray(playlist) || !playlist.length) return { sources: [], subtitles: [] };
      var sources = [], subtitles = [];
      playlist.forEach(function (item) {
        (item.sources || []).forEach(function (src) {
          var u = src.file || '';
          u = u.replace('/tv/', '/');
          if (!u.startsWith('/')) u = '/' + u;
          u = NETMIRROR_PLAY + u;
          if (u) sources.push({ url: u, quality: src.label || '', type: src.type || 'application/x-mpegURL' });
        });
        (item.tracks || []).filter(function (t) { return t.kind === 'captions'; }).forEach(function (track) {
          var s = track.file || '';
          if (s.startsWith('//')) s = 'https:' + s;
          else if (s.startsWith('/')) s = NETMIRROR_PLAY + s;
          if (s) subtitles.push({ url: s, language: track.label || 'Unknown' });
        });
      });
      console.log(PLUGIN_TAG + ' Playlist: ' + sources.length + ' src, ' + subtitles.length + ' subs.');
      return { sources: sources, subtitles: subtitles };
    });
}


function findEpisode(episodes, targetSeason, targetEpisode) {
  var s = parseInt(targetSeason), e = parseInt(targetEpisode);
  return (episodes || []).find(function (ep) {
    if (!ep) return false;
    var epS, epE;
    if (ep.s && ep.ep) {
      epS = parseInt((ep.s + '').replace(/\D/g, ''));
      epE = parseInt((ep.ep + '').replace(/\D/g, ''));
    } else if (ep.season !== undefined && ep.episode !== undefined) {
      epS = parseInt(ep.season); epE = parseInt(ep.episode);
    } else if (ep.season_number !== undefined && ep.episode_number !== undefined) {
      epS = parseInt(ep.season_number); epE = parseInt(ep.episode_number);
    } else { return false; }
    return epS === s && epE === e;
  }) || null;
}

function buildStream(source, platform, resolved, content, episodeData, fullCookieJar) {
  var quality   = parseQuality(source);
  var platLabel = PLATFORM_LABEL[platform] || platform;
  var langStr   = formatLangs(content.langs);

  var titleLine = content.title || resolved.title;
  var yearStr   = content.year || resolved.year;
  if (yearStr) titleLine += ' (' + yearStr + ')';

  if (resolved.isTv && episodeData) {
    var sNum = String(episodeData.s  || episodeData.season  || episodeData.season_number  || '').replace(/\D/g, '');
    var eNum = String(episodeData.ep || episodeData.episode || episodeData.episode_number || '').replace(/\D/g, '');
    titleLine += ' - S' + sNum + 'E' + eNum;
    if (episodeData.t) titleLine += ' - ' + decodeHtmlEntities(episodeData.t);
  }

  var lines = [titleLine];
  if (langStr)         lines.push(langStr);

  return {
    name    : platLabel + ' | ' + quality,
    title   : lines.join('\n'),
    url     : source.url,
    _quality : quality,
    type    : 'hls',
    headers : {
      'User-Agent'      : 'Mozilla/5.0 (Android) ExoPlayer',
      'Accept'          : '*/*',
      'Accept-Encoding' : 'identity',
      'Connection'      : 'keep-alive',
      'Cookie'          : 'hd=on',
      'Referer'         : NETMIRROR_PLAY + '/',
    },
    behaviorHints: { bingeGroup: 'netmirror-' + platform },
  };
}

function loadPlatformContent(platform, hit, resolved, season, episode, cookie) {
  console.log(PLUGIN_TAG + ' Extracting streams from: ' + PLATFORM_LABEL[platform]);

  return loadContent(hit.id, platform, cookie).then(function (content) {
    var raw   = content._raw;
    var chain = Promise.resolve();

    if (raw.nextPageShow === 1 && raw.nextPageSeason)
      chain = chain.then(function () {
        return fetchMoreEpisodes(hit.id, raw.nextPageSeason, platform, cookie, 2)
          .then(function (more) { content.episodes = content.episodes.concat(more); });
      });

    if (Array.isArray(raw.season) && raw.season.length > 1) {
      var slicedSeasons = raw.season.slice(0, -1);
      slicedSeasons.forEach(function (s) {
        chain = chain.then(function () {
          return fetchMoreEpisodes(hit.id, s.id, platform, cookie, 1)
            .then(function (more) { content.episodes = content.episodes.concat(more); });
        });
      });
    }

    return chain.then(function () {
      var targetId = hit.id, episodeObj = null;

      if (resolved.isTv) {
        episodeObj = findEpisode(content.episodes, season || 1, episode || 1);
        if (!episodeObj) {
          console.log(PLUGIN_TAG + ' S' + season + 'E' + episode + ' not found on ' + PLATFORM_LABEL[platform]);
          return null;
        }
        targetId = episodeObj.id;
        console.log(PLUGIN_TAG + ' Episode ID: ' + targetId);
      }

      // Mobile API bypasses the iframe token generation and passes the auth cookie hash directly
      return getPlaylist(targetId, resolved.title, platform, cookie)
        .then(function (playlist) {
          if (!playlist || !playlist.sources || !playlist.sources.length) {
            console.log(PLUGIN_TAG + ' No sources'); return null;
          }

          var fullCookieJar = makeCookieString({ t_hash: cookie, ott: PLATFORM_OTT[platform], hd: 'on' });

          // Build all stream objects first
          var rawStreams = playlist.sources
            .filter(function(src) {
              var q = parseQuality(src).toLowerCase();
              if (q === '480p' || q === '360p' || q.indexOf('low') !== -1) return false;
              return true;
            })
            .map(function (src) { return buildStream(src, platform, resolved, content, episodeObj, fullCookieJar); });

          // Resolve net52.cc master URL -> direct CDN URL, then validate
          var validationPromises = rawStreams.map(function(streamData) {
              return resolveDirectCdnLink(streamData).then(function(resolved) {
                  return checkStreamAlive(resolved);
              });
          });

          // Wait for all HEAD requests to finish
          return Promise.all(validationPromises).then(function(validatedStreams) {
            
            // Filter out the nulls (dead links) and sort the survivors by quality
            var survivingStreams = validatedStreams
                .filter(Boolean)
                .sort(function (a, b) { return qualitySortScore(b._quality) - qualitySortScore(a._quality); });

            console.log(PLUGIN_TAG + ' + ' + survivingStreams.length + ' validated stream(s) from ' + PLATFORM_LABEL[platform]);
            return survivingStreams;
          });
        });
    });
  }).catch(function (err) {
    console.log(PLUGIN_TAG + ' Error loading ' + PLATFORM_LABEL[platform] + ': ' + err.message);
    return null;
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Public entry point — thin shell that handles:
//   1. In-flight deduplication  (prevents double-scraping the same title)
//   2. Cache gate               (returns stored streams instantly if available)
//   3. Delegates real work to   _getStreamsCore()
// ─────────────────────────────────────────────────────────────────────────────
function getStreams(tmdbId, type, season, episode) {
  var s   = season  ? parseInt(season)  : null;
  var e   = episode ? parseInt(episode) : null;

  // Determine content type string once, used for both cache key and inner call.
  var contentType = (type === 'series' || type === 'tv') ? 'tv' : 'movie';
  var flightKey   = nmCacheKey(tmdbId, contentType, s, e);

  // ── 1. In-flight deduplication ─────────────────────────────────────────────
  // If an identical request is already mid-scrape, return the same Promise.
  // This prevents duplicate 60-second pipelines when two requests race.
  if (_nmInFlight[flightKey]) {
    console.log(PLUGIN_TAG + ' [IN-FLIGHT] Awaiting existing scrape: ' + flightKey);
    return _nmInFlight[flightKey];
  }

  // ── 2. Cache gate + real scrape ────────────────────────────────────────────
  var promise;

  if (ENABLE_STREAM_CACHE) {
    // Check the worker first; only run the full pipeline on a cache miss.
    promise = nmGetCachedStreams(tmdbId, contentType, s, e)
      .then(function (cached) {
        if (cached) {
          console.log(PLUGIN_TAG + ' [CACHE] ⚡ Instant return — ' + cached.length + ' stream(s) from cache.');
          return cached;
        }
        // Cache miss — run the full scrape and save results afterwards.
        return _getStreamsCore(tmdbId, type, s, e, contentType);
      });
  } else {
    // Caching disabled — always scrape fresh.
    promise = _getStreamsCore(tmdbId, type, s, e, contentType);
  }

  // Register in-flight; clean up once settled (resolved OR rejected).
  _nmInFlight[flightKey] = promise;
  promise.then(
    function () { delete _nmInFlight[flightKey]; },
    function () { delete _nmInFlight[flightKey]; }
  );

  return promise;
}

// ─────────────────────────────────────────────────────────────────────────────
// Full scrape pipeline — bypass → search → playlist → validate → (cache save)
// Called by getStreams() on a cache miss (or when ENABLE_STREAM_CACHE = false).
// ─────────────────────────────────────────────────────────────────────────────
function _getStreamsCore(tmdbId, type, s, e, contentType) {
  return __async(this, null, function* () {
    console.log(PLUGIN_TAG + ' ID: ' + tmdbId + ' type: ' + type + (s ? ' S' + s + 'E' + e : ''));

    var resolved = yield resolveIds(tmdbId, type);

    if (!resolved.title) {
      console.log(PLUGIN_TAG + ' Title resolution failed.');
      return [];
    }

    var cookie = yield bypass();

    var platforms = ['netflix', 'primevideo', 'disney'];
    console.log(PLUGIN_TAG + ' Initiating parallel search across all platforms...');

    var searchPromises = platforms.map(function(plat) {
      return searchPlatform(resolved.searchQueue, resolved.year, plat, cookie, resolved.isTv)
        .then(function(hit) {
          return { platform: plat, hit: hit };
        });
    });

    var searchResults = yield Promise.all(searchPromises);

    var maxScore = 0;
    searchResults.forEach(function(res) {
      if (res.hit && res.hit.score > maxScore) {
        maxScore = res.hit.score;
      }
    });

    if (maxScore === 0) {
      console.log(PLUGIN_TAG + ' No valid matches found on any platform.');
      return [];
    }

    var threshold = maxScore >= 1.0 ? 1.0 : maxScore;
    var winningResults = searchResults.filter(function(res) {
      return res.hit && res.hit.score >= threshold;
    });

    console.log(PLUGIN_TAG + ' 🏆 Perfect Match found on ' + winningResults.length + ' platform(s) (Max Score: ' + maxScore.toFixed(3) + ')');

    var loadPromises = winningResults.map(function(res) {
      return loadPlatformContent(res.platform, res.hit, resolved, s, e, cookie);
    });

    var streamArrays = yield Promise.all(loadPromises);

    var finalStreams = [];
    streamArrays.forEach(function(arr) {
      if (arr && arr.length) finalStreams = finalStreams.concat(arr);
    });

    // ── Cache save (fire-and-forget) ──────────────────────────────────────────
    // Only save non-empty results. Do NOT yield — we don't want to make the
    // caller wait for the worker write. Errors are logged inside nmSetCachedStreams.
    if (ENABLE_STREAM_CACHE && finalStreams.length) {
      nmSetCachedStreams(tmdbId, contentType, s, e, finalStreams, CACHE_TTL_SECONDS);
    }

    return finalStreams;
  });
}