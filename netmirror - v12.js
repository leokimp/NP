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
var NETMIRROR_BASE  = 'https://net22.cc';
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

var APP_USER_AGENT = 'Mozilla/5.0 (Linux; Android 16; CPH2723 Build/AP3A.240617.008; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/146.0.7680.178 Mobile Safari/537.36 /OS.Gatu v3.0';

var SEARCH_ENDPOINT = {
  netflix    : NETMIRROR_PLAY + '/mobile/search.php',
  primevideo : NETMIRROR_PLAY + '/mobile/pv/search.php',
  disney     : NETMIRROR_PLAY + '/mobile/hs/search.php',
};
var EPISODES_ENDPOINT = {
  netflix    : NETMIRROR_PLAY + '/mobile/episodes.php',
  primevideo : NETMIRROR_PLAY + '/mobile/pv/episodes.php',
  disney     : NETMIRROR_PLAY + '/mobile/hs/episodes.php',
};
var POST_ENDPOINT = {
  netflix    : NETMIRROR_PLAY + '/mobile/post.php',
  primevideo : NETMIRROR_PLAY + '/mobile/pv/post.php',
  disney     : NETMIRROR_PLAY + '/mobile/hs/post.php',
};

var BASE_HEADERS = {
  'User-Agent'       : APP_USER_AGENT,
  'Accept'           : 'application/json, text/plain, */*',
  'Accept-Language'  : 'en-US,en;q=0.9',
  'X-Requested-With' : 'app.netmirror.netmirrornew',
  'Origin'           : NETMIRROR_PLAY,
  'Referer'          : NETMIRROR_PLAY + '/',
  'Connection'       : 'keep-alive',
};

var base64Encode = function(str) {
  if (typeof btoa === 'function') return btoa(unescape(encodeURIComponent(str)));
  if (typeof Buffer !== 'undefined') return new Buffer(str, 'utf-8').toString('base64');
  return '';
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
  var jar  = makeCookieString({ t_hash_t: cookie, user_token: '233123f803cf02184bf6c67e149cdd50', hd: 'on', ott: ott });
  var hdrs = Object.assign({}, BASE_HEADERS, { Cookie: jar, Referer: NETMIRROR_BASE + '/tv/home' });

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
      })
      .catch(function () { return null; });
  }

  var pairs = [];
  searchQueue.forEach(function (q) {
    pairs.push({ original: q, search: q });
    if (year && !q.includes(year))
      pairs.push({ original: q, search: q + ' ' + year });
  });

  return Promise.all(pairs.map(function (p) { return doSearch(p.original, p.search); }))
    .then(function (hits) {
      var best = null;
      hits.forEach(function (hit) {
        if (!hit) return;
        if (!best || hit.score > best.score) best = hit;
      });
      if (best)
        console.log(PLUGIN_TAG + ' [' + platform + '] Best: "' + best.title + '" score=' + best.score.toFixed(3));
      else
        console.log(PLUGIN_TAG + ' [' + platform + '] No match above threshold (0.72)');
      return best;
    });
}

function bypass() {
  var now = Date.now();
  if (_cachedCookie && (now - _cookieTimestamp) < COOKIE_EXPIRY_MS) {
    console.log(PLUGIN_TAG + ' Using cached auth cookie.');
    return Promise.resolve(_cachedCookie);
  }
  console.log(PLUGIN_TAG + ' Bypassing authentication...');
  function attempt(n) {
    if (n >= 5) return Promise.reject(new Error('Bypass failed after 5 attempts'));
    return fetch(NETMIRROR_PLAY + '/tv/p.php', { method: 'POST', redirect: 'follow', headers: BASE_HEADERS })
      .then(function (res) {
        var raw = res.headers.get('set-cookie') || '';
        var cs  = Array.isArray(raw) ? raw.join('; ') : raw;
        var m   = cs.match(/t_hash_t=([^;,\s]+)/);
        var ext = m ? m[1] : null;
        return res.text().then(function (body) {
          if (!body.includes('"r":"n"')) { return attempt(n + 1); }
          if (!ext) throw new Error('t_hash_t not found in Set-Cookie');
          _cachedCookie    = ext;
          _cookieTimestamp = Date.now();
          console.log(PLUGIN_TAG + ' Auth successful.');
          return _cachedCookie;
        });
      });
  }
  return attempt(0);
}

function loadContent(contentId, platform, cookie) {
  var ott  = PLATFORM_OTT[platform];
  var jar  = makeCookieString({ t_hash_t: cookie, user_token: '233123f803cf02184bf6c67e149cdd50', ott: ott, hd: 'on' });
  var hdrs = Object.assign({}, BASE_HEADERS, { Cookie: jar, Referer: NETMIRROR_BASE + '/tv/home' });
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
  var jar  = makeCookieString({ t_hash_t: cookie, user_token: '233123f803cf02184bf6c67e149cdd50', ott: ott, hd: 'on' });
  var hdrs = Object.assign({}, BASE_HEADERS, { Cookie: jar, Referer: NETMIRROR_BASE + '/tv/home' });
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

function resolveMobileStreams(targetId, title, platform, cookie, lang, contentObj, episodeObj) {
  var ott = PLATFORM_OTT[platform];
  var timestamp = unixNow();
  var appHeaders = Object.assign({}, BASE_HEADERS, { Cookie: 't_hash_t=' + cookie + '; ott=' + ott + '; hd=on' });
  var masterUrl = '';

  var buildPromise = Promise.resolve();

  // Route to the correct Mobile App HLS endpoint
  if (platform === 'netflix') {
    masterUrl = NETMIRROR_PLAY + '/mobile/hls/' + targetId + '.m3u8?in=' + cookie + '&hd=on&lang=' + (lang || 'hin');
  } else {
    // Both Prime Video and Disney+ use playlist.php endpoints that return JSON, not direct M3U8s
    var playlistApiUrl = '';
    if (platform === 'primevideo') {
      playlistApiUrl = NETMIRROR_PLAY + '/mobile/pv/playlist.php?id=' + targetId + '&t=' + encodeURIComponent(title) + '&tm=' + timestamp + '&lang=' + (lang || 'hin') + '&hd=on&userhash=' + cookie;
    } else if (platform === 'disney') {
      playlistApiUrl = NETMIRROR_PLAY + '/mobile/hs/playlist.php?id=' + targetId + '&t=' + encodeURIComponent(title) + '&tm=' + timestamp;
    }

    buildPromise = request(playlistApiUrl, { headers: appHeaders })
      .then(function(res) { return res.json(); })
      .then(function(json) {
        if (json && json[0] && json[0].sources && json[0].sources[0]) {
          var fileUrl = json[0].sources[0].file;
          // Ensure URL is absolute before passing it to the player
          if (!fileUrl.startsWith('http')) {
            if (!fileUrl.startsWith('/')) fileUrl = '/' + fileUrl;
            masterUrl = NETMIRROR_PLAY + fileUrl;
          } else {
            masterUrl = fileUrl;
          }
        } else {
           // Fallback for Disney
           if (platform === 'disney') masterUrl = NETMIRROR_PLAY + '/mobile/hs/hls/' + targetId + '.m3u8?in=' + cookie;
        }
      }).catch(function(e) {
        console.log(PLUGIN_TAG + ' [Playlist JSON Error] ' + e.message);
        if (platform === 'disney') masterUrl = NETMIRROR_PLAY + '/mobile/hs/hls/' + targetId + '.m3u8?in=' + cookie;
      });
  }

  return buildPromise.then(function() {
    if (!masterUrl) return [];

    var platLabel = PLATFORM_LABEL[platform] || platform;
    var displayTitle = title;
    if (contentObj.year) displayTitle += ' (' + contentObj.year + ')';
    if (episodeObj) {
      var sNum = String(episodeObj.s || episodeObj.season || '').replace(/\D/g, '');
      var eNum = String(episodeObj.ep || episodeObj.episode || '').replace(/\D/g, '');
      displayTitle += ' - S' + sNum + 'E' + eNum;
      if (episodeObj.t) displayTitle += ' - ' + decodeHtmlEntities(episodeObj.t);
    }

    var streams = [];

    // SOLUTION A: Native Master Playlist (Passes App Headers to the player so Net52.cc allows it)
    streams.push({
      name: platLabel + ' (Master)',
      title: displayTitle + '\nAuto (Demuxed HD)',
      url: masterUrl,
      isM3U8: true,
      headers: appHeaders,
      behaviorHints: { bingeGroup: 'netmirror-' + platform }
    });

    // SOLUTION B: Data URI Proxy (Downloads text, base64 encodes it, passes as URI. Player bypasses Net52.cc headers entirely)
    return request(masterUrl, { headers: appHeaders })
      .then(function(res) { return res.text(); })
      .then(function(m3u8Text) {
        if (m3u8Text && m3u8Text.includes('#EXTM3U')) {
          var base64M3u8 = base64Encode(m3u8Text);
          streams.push({
            name: platLabel + ' (Proxy)',
            title: displayTitle + '\nAuto (Demuxed Proxy Fallback)',
            url: "data:application/vnd.apple.mpegurl;base64," + base64M3u8,
            isM3U8: true,
            behaviorHints: { bingeGroup: 'netmirror-' + platform }
          });
        }
        return streams;
      }).catch(function(e) {
        console.log(PLUGIN_TAG + ' [Proxy Gen Failed] ' + e.message);
        return streams;
      });
  });
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

      // Generate Dual Streams (Solution A + B) via Mobile App endpoints
      return resolveMobileStreams(targetId, resolved.title, platform, cookie, 'hin', content, episodeObj)
        .then(function(streams) {
            if (streams && streams.length > 0) {
                console.log(PLUGIN_TAG + ' + ' + streams.length + ' Mobile App stream(s) generated from ' + PLATFORM_LABEL[platform]);
            } else {
                console.log(PLUGIN_TAG + ' No streams generated.');
            }
            return streams;
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