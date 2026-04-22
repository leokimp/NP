/**
 * ╔══════════════════════════════════════════════════════════════════════════════╗
 * ║               NetMirror — Nuvio Mobile Plugin  v4.0                          ║
 * ╠══════════════════════════════════════════════════════════════════════════════╣
 * ║  Source     › https://net22.cc  /  https://net52.cc                          ║
 * ╠══════════════════════════════════════════════════════════════════════════════╣
 * ║  Platforms  › Netflix · Prime Video · Disney+                                ║
 * ║  Supports   › Movies & Series  (480p / 720p / 1080p / Auto)                  ║
 * ║  Engine     › CJS / Hermes (Nuvio Mobile compatible)                         ║
 * ║  Search     › cloudscraper resolveIds + IMDb AKAs + Pingora-style scoring    ║
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

var TMDB_API_KEY    = '439c478a771f35c05022f9feabcca01c';
var NETMIRROR_BASE  = 'https://net22.cc';
var NETMIRROR_PLAY  = 'https://net52.cc';
var PLUGIN_TAG      = '[NetMirror]';

var COOKIE_EXPIRY_MS = 15 * 60 * 1000;
var _cachedCookie    = '';
var _cookieTimestamp = 0;

var PLATFORM_OTT = { netflix: 'nf', primevideo: 'pv', disney: 'hs' };
var PLATFORM_LABEL = { netflix: 'Netflix', primevideo: 'Prime Video', disney: 'Disney+' };

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
  netflix    : NETMIRROR_BASE + '/post.php',
  primevideo : NETMIRROR_BASE + '/pv/post.php',
  disney     : NETMIRROR_BASE + '/mobile/hs/post.php',
};
var PLAYLIST_ENDPOINT = {
  netflix    : NETMIRROR_PLAY + '/playlist.php',
  primevideo : NETMIRROR_PLAY + '/pv/playlist.php',
  disney     : NETMIRROR_PLAY + '/mobile/hs/playlist.php',
};

var BASE_HEADERS = {
  'User-Agent'       : 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept'           : 'application/json, text/plain, */*',
  'Accept-Language'  : 'en-US,en;q=0.9',
  'X-Requested-With' : 'XMLHttpRequest',
  'Connection'       : 'keep-alive',
};

// ─────────────────────────────────────────────────────────────────────────────
// Utilities
// ─────────────────────────────────────────────────────────────────────────────

function unixNow() { return Math.floor(Date.now() / 1000); }

function makeCookieString(obj) {
  return Object.entries(obj).map(function (kv) { return kv[0] + '=' + kv[1]; }).join('; ');
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
//
// Key improvements over previous versions:
//
//  1. normTitle strips (year), "Season N", "S01" noise from candidates
//     before scoring, so "Mirzapur (2018)" cleanly matches query "Mirzapur".
//
//  2. calcTitleSim priority:
//       a. prefix word-boundary  → 0.95   ("kill" vs "kill 2024")
//       b. whole-word contained  → 0.72
//       c. max(seqRatio, jaccard) as fuzzy fallback
//
//  3. scoreResult applies year bonus/penalty AFTER initial score:
//       delta==0  → +0.10 (cap 1.0)
//       delta>3   → x0.70
//     Hard minimum rankScore 0.72 (raised from 0.62) — kills weak/partial matches.
//
//  4. resolveIds (from cloudscraper) separates ID resolution cleanly:
//     IMDb tt-path vs TMDB numeric path, builds searchQueue once upfront.
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

// Normalise for comparison — strips year tags, season tags, punctuation
function normTitle(s) {
  return s
    .replace(/&amp;/gi, '&')
    .toLowerCase()
    .replace(/\s*&\s*/g, ' and ')
    .replace(/\(\d{4}\)/g, '')           // "(2024)"
    .replace(/\bseason\s*\d+\b/gi, '')   // "Season 2"
    .replace(/\bs\d{1,2}\b/gi, '')       // "S01"
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function calcTitleSim(query, candidate) {
  var q = normTitle(query);
  var c = normTitle(candidate);
  if (!q || !c) return 0;
  
  // 1. Exact match gets an automatic 1.0 (Passes immediately)
  if (q === c) return 1.0;

  var esc = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  // 2. Prefix match (e.g. "Kill" vs "Kill Blue")
  if (new RegExp('^' + esc + '\\b').test(c)) {
    return 0.65; // Base score is BELOW the 0.72 threshold!
  }
  
  // 3. Contained match
  if (new RegExp('\\b' + esc + '\\b').test(c)) {
    return 0.60;
  }
  
  // 4. Fuzzy fallback (heavily capped)
  return Math.max(seqRatio(q, c), jaccardWords(q, c)) * 0.8;
}

function scoreResult(query, resultTitle, targetYear, resultYear) {
  var titleScore = calcTitleSim(query, resultTitle);
  var rankScore = titleScore;

  var rYear = resultYear || (resultTitle.match(/\b(19|20)\d{2}\b/) || [])[0];
  
  if (targetYear && rYear) {
    var delta = Math.abs(parseInt(targetYear) - parseInt(rYear));
    if (delta === 0) {
      rankScore += 0.15; // Exact year bumps a failing 0.65 to a passing 0.80
    } else if (delta === 1) {
      rankScore += 0.05; // 1-year buffer bumps a 0.65 to 0.70 (Still fails unless it was an exact 1.0 title match)
    } else {
      rankScore -= 0.30; // Brutal penalty for wrong year
    }
  } else if (targetYear && !rYear && titleScore < 1.0) {
    // The "KILL BLUE" Rule: If TMDB wants a specific year, but the API gives no year,
    // AND the title is not an exact match, penalize it so it stays dead.
    rankScore -= 0.10;
  }
  
  return rankScore >= 0.72 ? rankScore : 0;
}
// ─────────────────────────────────────────────────────────────────────────────
// resolveIds — ported from cloudscraper.js
//
// Accepts rawId (tt…, plain TMDB number, or tmdb:… prefix) and type.
// Returns a single resolved object used everywhere downstream — no further
// external API calls needed after this.
// ─────────────────────────────────────────────────────────────────────────────

function resolveIds(rawId, type) {
  return __async(this, null, function* () {
    var isTv      = (type === 'series' || type === 'tv');
    var mediaType = isTv ? 'tv' : 'movie';
    var imdbId    = null;
    var title     = '';
    var year      = '';

    if (rawId && rawId.startsWith('tt')) {
      // ── IMDb ID path ─────────────────────────────────────────────────────
      console.log(PLUGIN_TAG + ' [resolveIds] IMDb path: ' + rawId);
      imdbId = rawId;
      var iRes = yield fetch('https://api.imdbapi.dev/titles/' + rawId)
        .then(function (r) { return r.json(); }).catch(function () { return null; });
      if (iRes) {
        title = iRes.originalTitle || iRes.primaryTitle || '';
        year  = iRes.startYear ? String(iRes.startYear) : '';
      }

    } else {
      // ── TMDB ID path ─────────────────────────────────────────────────────
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

    // ── Build search queue from IMDb AKAs ────────────────────────────────
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

      // Indian AKAs — ASCII-safe only to avoid garbage results
      var indianAkas = (akasData.akas || [])
        .filter(function (a) { return a.country && a.country.code === 'IN'; })
        .map(function (a) { return a.text; })
        .filter(function (t) { return /^[\w\s\-':.!&\u2013\u2014(),]+$/.test(t); });
      indianAkas.forEach(function (aka) {
        if (searchQueue.indexOf(aka) === -1) searchQueue.push(aka);
      });
    }

    if (searchQueue.length === 0) searchQueue.push(resolvedTitle || title);

    // Sequel short-variant: "Pushpa: The Rule - Part 2" → "Pushpa 2"
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

    // Number suffix variant: "Hotspot 2 Much" -> "Hotspot 2"
    var numMatch = base.match(/^([^\d]+\s\d+)\b/i);
    if (numMatch && numMatch[1].length < base.length) {
      var shortNum = numMatch[1].trim();
      // Ensure we aren't accidentally grabbing a year like "Blade Runner 2049"
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

// ─────────────────────────────────────────────────────────────────────────────
// NetMirror platform search — uses cloudscraper scoring
// ─────────────────────────────────────────────────────────────────────────────

function searchPlatform(searchQueue, year, platform, cookie, isTv) {
  var ott  = PLATFORM_OTT[platform];
  var jar  = makeCookieString({ t_hash_t: cookie, user_token: '233123f803cf02184bf6c67e149cdd50', hd: 'on', ott: ott });
  var hdrs = Object.assign({}, BASE_HEADERS, { Cookie: jar, Referer: NETMIRROR_BASE + '/tv/home' });

  // Search for a single query, score each candidate with scoreResult.
  // originalQuery is what we score against (no year suffix).
  // searchQuery   is what we actually send to the API (may include year).
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
            if (isTv && !isItemSeries && /\d+(h|m)/.test(rStr)) return; // Skip movies when looking for TV
            if (!isTv && isItemSeries) return; // Skip TV shows when looking for Movies
          }

          var rank = scoreResult(originalQuery, item.t, year, item.y);
          if (rank > 0 && (!best || rank > best.score))
            best = { id: item.id, title: item.t, score: rank };
        });
        return best;
      })
      .catch(function () { return null; });
  }

  // Build search pairs: bare + year-appended for each queue entry
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

// ─────────────────────────────────────────────────────────────────────────────
// Authentication Bypass
// ─────────────────────────────────────────────────────────────────────────────

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

// ─────────────────────────────────────────────────────────────────────────────
// Content Loading & Episode Pagination
// ─────────────────────────────────────────────────────────────────────────────

function loadContent(contentId, platform, cookie) {
  var ott  = PLATFORM_OTT[platform];
  var jar  = makeCookieString({ t_hash_t: cookie, user_token: '233123f803cf02184bf6c67e149cdd50', ott: ott, hd: 'on' });
  var hdrs = Object.assign({}, BASE_HEADERS, { Cookie: jar, Referer: NETMIRROR_BASE + '/tv/home' });
  return request(POST_ENDPOINT[platform] + '?id=' + contentId + '&t=' + unixNow(), { headers: hdrs })
    .then(function (res) { return res.json(); })
    .then(function (data) {
      console.log(PLUGIN_TAG + ' Loaded: "' + data.title + '"');

      // --- DEBUG CODE START ---
      console.log('\n[DEBUG] === RAW DATA FOR: ' + data.title + ' ===');
      console.log('[DEBUG] data.season array:', JSON.stringify(data.season));
      if (data.episodes && data.episodes.length > 0) {
        console.log('[DEBUG] Sample episode object (first one):', JSON.stringify(data.episodes[0]));
      }
      console.log('[DEBUG] ======================================\n');
      // --- DEBUG CODE END ---


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

// ─────────────────────────────────────────────────────────────────────────────
// Video Token
// Step 1: POST play.php on BASE → get h param
// Step 2: GET play.php on PLAY → parse data-h token
// ─────────────────────────────────────────────────────────────────────────────

function getVideoToken(contentId, cookie, ott) {
  var jar = makeCookieString({ t_hash_t: cookie, ott: ott || 'nf', hd: 'on' });
  return request(NETMIRROR_BASE + '/play.php', {
    method  : 'POST',
    headers : {
      'Content-Type'     : 'application/x-www-form-urlencoded',
      'X-Requested-With' : 'XMLHttpRequest',
      'Referer'          : NETMIRROR_BASE + '/',
      'Cookie'           : jar,
    },
    body: 'id=' + contentId,
  }).then(function (res) { return res.json(); })
    .then(function (playData) {
      var h = playData.h;
      if (!h) throw new Error('play.php step1: no h param');
      console.log(PLUGIN_TAG + ' Token step1 h=' + String(h).slice(0, 30) + '...');
      return request(NETMIRROR_PLAY + '/play.php?id=' + contentId + '&' + h, {
        headers: {
          'Accept'                    : 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
          'Accept-Language'           : 'en-GB,en;q=0.9',
          'Connection'                : 'keep-alive',
          'Host'                      : 'net52.cc',
          'Referer'                   : NETMIRROR_BASE + '/',
          'sec-ch-ua'                 : '"Chromium";v="142", "Brave";v="142", "Not_A Brand";v="99"',  // ADD
          'sec-ch-ua-mobile'          : '?0',
          'sec-ch-ua-platform'        : '"Linux"',
          'Sec-Fetch-Dest'            : 'iframe',
          'Sec-Fetch-Mode'            : 'navigate',
          'Sec-Fetch-Site'            : 'cross-site',
          'Sec-Fetch-Storage-Access'  : 'none',
          'Sec-Fetch-User'            : '?1',
          'Sec-GPC'                   : '1',
          'Upgrade-Insecure-Requests' : '1',
          'User-Agent'                : 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36',  // UPDATE version
          'Cookie'                    : jar,
        },
      });
    })
    .then(function (res) { return res.text(); })
    .then(function (html) {
      var m = html.match(/data-h="([^"]+)"/);
      if (m) console.log(PLUGIN_TAG + ' Token step2 data-h=' + m[1].slice(0, 20) + '...');
      else   console.log(PLUGIN_TAG + ' Token step2: data-h NOT FOUND (html len=' + html.length + ')');
      return m ? m[1] : null;
    });
}

// ─────────────────────────────────────────────────────────────────────────────
// Playlist Fetch
// encodeURIComponent(token) REQUIRED — raw token breaks server validation
// ─────────────────────────────────────────────────────────────────────────────

function getPlaylist(contentId, title, platform, cookie, token) {
  var ott = PLATFORM_OTT[platform];
  var jar = makeCookieString({ t_hash_t: cookie, ott: ott, hd: 'on' });
  var url = PLAYLIST_ENDPOINT[platform]
    + '?id='  + contentId
    + '&t='   + encodeURIComponent(title)
    + '&tm='  + unixNow()
    + '&h='   + token;
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
          u = NETMIRROR_PLAY + '/' + u.replace(/^\//, '');  // always domain + "/" + path (no double slash)
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

// ─────────────────────────────────────────────────────────────────────────────
// Episode Matching
// ─────────────────────────────────────────────────────────────────────────────

function findEpisode(episodes, targetSeason, targetEpisode) {
  var s = parseInt(targetSeason), e = parseInt(targetEpisode);

  // --- DEBUG CODE START ---
  console.log('[DEBUG] findEpisode called looking for S' + s + 'E' + e);
  console.log('[DEBUG] Total episodes loaded in memory:', (episodes || []).length);
  // --- DEBUG CODE END ---


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

// ─────────────────────────────────────────────────────────────────────────────
// Stream Builder
// ─────────────────────────────────────────────────────────────────────────────

function buildStream(source, platform, resolved, content, episodeData) {
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
    if (episodeData.t) titleLine += ' - ' + episodeData.t;
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

// ─────────────────────────────────────────────────────────────────────────────
// Platform Pipeline
// ─────────────────────────────────────────────────────────────────────────────

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

      return getVideoToken(targetId, cookie, PLATFORM_OTT[platform])
        .then(function (token) {
          if (!token) { console.log(PLUGIN_TAG + ' No token'); return null; }

          return getPlaylist(targetId, resolved.title, platform, cookie, token)
            .then(function (playlist) {
              if (!playlist.sources.length) { console.log(PLUGIN_TAG + ' No sources'); return null; }

              var streams = playlist.sources
                .filter(function(src) {
                  var q = parseQuality(src).toLowerCase();
                  // Drop 480p, 360p, and anything containing "low"
                  if (q === '480p' || q === '360p' || q.indexOf('low') !== -1) return false;
                  return true;
                })
                .map(function (src) { return buildStream(src, platform, resolved, content, episodeObj); })
                .sort(function (a, b) { return qualitySortScore(b._quality) - qualitySortScore(a._quality); });

              console.log(PLUGIN_TAG + ' + ' + streams.length + ' stream(s) from ' + PLATFORM_LABEL[platform]);
              return streams;
            });
        });
    });
  }).catch(function (err) {
    console.log(PLUGIN_TAG + ' Error loading ' + PLATFORM_LABEL[platform] + ': ' + err.message);
    return null;
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Public API — getStreams
// Nuvio calls: getStreams(tmdbId, type, season, episode)
// ─────────────────────────────────────────────────────────────────────────────

function getStreams(tmdbId, type, season, episode) {
  return __async(this, null, function* () {
    var s = season  ? parseInt(season)  : null;
    var e = episode ? parseInt(episode) : null;

    console.log(PLUGIN_TAG + ' ID: ' + tmdbId + ' type: ' + type + (s ? ' S' + s + 'E' + e : ''));

    // Step 1: resolve IDs + build search queue
    var resolved = yield resolveIds(tmdbId, type);

    if (!resolved.title) {
      console.log(PLUGIN_TAG + ' Title resolution failed.');
      return [];
    }

    // Step 2: auth bypass
    var cookie = yield bypass();

    // Step 3: PARALLEL SEARCH
    // We search all platforms simultaneously instead of waiting for one to fail.
    var platforms = ['netflix', 'primevideo', 'disney'];
    console.log(PLUGIN_TAG + ' Initiating parallel search across all platforms...');

    var searchPromises = platforms.map(function(plat) {
      return searchPlatform(resolved.searchQueue, resolved.year, plat, cookie, resolved.isTv)
        .then(function(hit) {
          return { platform: plat, hit: hit };
        });
    });

    var searchResults = yield Promise.all(searchPromises);

    // Step 4: FIND THE PERFECT MATCH
    // Iterate through all results to find the highest score.
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

    // Filter down to ONLY the platform(s) that achieved this highest score.
    // If Netflix and Prime both score 1.15, we load from both!

    var threshold = maxScore >= 1.0 ? 1.0 : maxScore;
    var winningResults = searchResults.filter(function(res) {
      return res.hit && res.hit.score >= threshold;
    });

    console.log(PLUGIN_TAG + ' 🏆 Perfect Match found on ' + winningResults.length + ' platform(s) (Max Score: ' + maxScore.toFixed(3) + ')');

    // Step 5: LOAD STREAMS FOR WINNERS
    // Run the heavy playlist extraction ONLY for the winning platform(s)
    var loadPromises = winningResults.map(function(res) {
      return loadPlatformContent(res.platform, res.hit, resolved, s, e, cookie);
    });

    var streamArrays = yield Promise.all(loadPromises);
    
    // Flatten the results into a single array of streams
    var finalStreams = [];
    streamArrays.forEach(function(arr) {
      if (arr && arr.length) finalStreams = finalStreams.concat(arr);
    });

    return finalStreams;
  });
}
