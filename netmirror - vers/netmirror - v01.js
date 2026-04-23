/**
 * ╔══════════════════════════════════════════════════════════════════════════════╗
 * ║               NetMirror — Nuvio Mobile Plugin  v3.0                         ║
 * ╠══════════════════════════════════════════════════════════════════════════════╣
 * ║  Source     › https://net22.cc  /  https://net52.cc                         ║
 * ║  Author     › Sanchit  |  TG: @S4NCHITT                                     ║
 * ║  Project    › Murph's Streams                                                ║
 * ╠══════════════════════════════════════════════════════════════════════════════╣
 * ║  Platforms  › Netflix · Prime Video · Disney+                                ║
 * ║  Supports   › Movies & Series  (480p / 720p / 1080p / Auto)                 ║
 * ║  Engine     › CJS / Hermes (Nuvio Mobile compatible)                        ║
 * ║  Search     › IMDb AKAs + sequel variants + scored parallel search           ║
 * ╚══════════════════════════════════════════════════════════════════════════════╝
 */

'use strict';

// ─── Hermes-compatible async polyfill ────────────────────────────────────────
// (same __async pattern used by hdhub4u-v5.js so Hermes can run it)
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
var __defProp = Object.defineProperty;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
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

// Cookie cache — bypass only when expired (15-minute window)
var COOKIE_EXPIRY_MS = 15 * 60 * 1000;
var _cachedCookie    = '';
var _cookieTimestamp = 0;

// Platform routing
var PLATFORM_OTT = {
  netflix    : 'nf',
  primevideo : 'pv',
  disney     : 'hs',
};

var PLATFORM_LABEL = {
  netflix    : 'Netflix',
  primevideo : 'Prime Video',
  disney     : 'Disney+',
};

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
// Utility Helpers
// ─────────────────────────────────────────────────────────────────────────────

function unixNow() {
  return Math.floor(Date.now() / 1000);
}

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
// Language Map
// ─────────────────────────────────────────────────────────────────────────────

var LANG_MAP = {
  ces:'Czech',   cze:'Czech',
  deu:'German',  ger:'German',
  eng:'English',
  spa:'Spanish',
  fra:'French',  fre:'French',
  hin:'Hindi',
  hun:'Hungarian',
  ita:'Italian',
  jpn:'Japanese',
  pol:'Polish',
  por:'Portuguese',
  tur:'Turkish',
  ukr:'Ukrainian',
  kor:'Korean',
  zho:'Chinese', chi:'Chinese',
  ara:'Arabic',
  rus:'Russian',
  tam:'Tamil',   tel:'Telugu',
  mal:'Malayalam',
  ben:'Bengali', mar:'Marathi',
  pan:'Punjabi', pun:'Punjabi',
  tha:'Thai',
  vie:'Vietnamese',
  ind:'Indonesian',
  msa:'Malay',
  nld:'Dutch',   swe:'Swedish',
  nor:'Norwegian', dan:'Danish',
  fin:'Finnish', ron:'Romanian',
  bul:'Bulgarian', hrv:'Croatian',
  slk:'Slovak',  srp:'Serbian',
  heb:'Hebrew',
};

function parseLangArray(langs) {
  if (!Array.isArray(langs) || !langs.length) return [];
  var seen = {};
  var result = [];
  langs.forEach(function (entry) {
    var label = entry.l || LANG_MAP[(entry.s || '').toLowerCase()] || null;
    if (label && !seen[label]) {
      seen[label] = true;
      result.push(label);
    }
  });
  return result;
}

function formatLangs(langs) {
  if (!langs || !langs.length) return null;
  var shown = langs.slice(0, 5);
  var suffix = langs.length > 5 ? ' +' + (langs.length - 5) + ' more' : '';
  return shown.join(' · ') + suffix;
}

// ─────────────────────────────────────────────────────────────────────────────
// Quality Parsing
// ─────────────────────────────────────────────────────────────────────────────

function parseQuality(source) {
  if (source.quality) {
    var m = (source.quality + '').match(/(\d{3,4}p)/i);
    if (m) return m[1].toLowerCase();
    var q = source.quality.toLowerCase();
    if (q.includes('1080') || q.includes('full hd') || q.includes('fhd')) return '1080p';
    if (q.includes('720')  || q === 'hd')  return '720p';
    if (q.includes('480'))                  return '480p';
    if (q.includes('360'))                  return '360p';
    if (q === 'auto')                       return 'Auto';
    return source.quality;
  }
  var url = source.url || source.file || '';
  var p = url.match(/[?&]q=(\d{3,4}p)/i);
  if (p) return p[1].toLowerCase();
  if (url.includes('1080')) return '1080p';
  if (url.includes('720'))  return '720p';
  if (url.includes('480'))  return '480p';
  if (url.includes('360'))  return '360p';
  return 'Auto';
}

function qualitySortScore(q) {
  if (!q) return 0;
  var m = q.match(/(\d+)p/i);
  if (m) return parseInt(m[1]);
  if (q.toLowerCase() === 'auto') return 9999;
  return 0;
}

// ─────────────────────────────────────────────────────────────────────────────
// Search — Title Similarity (from hdhub4u-v5.js — seqRatio + Jaccard)
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
  var union = new Set([].concat(Array.from(sa), Array.from(sb))).size;
  return union === 0 ? 0 : inter / union;
}

function calcTitleSim(query, candidate) {
  var norm = function (s) {
    return s.replace(/&amp;/gi, '&').toLowerCase()
      .replace(/\s*&\s*/g, ' and ')
      .replace(/[^a-z0-9\s]/g, '')
      .replace(/\s+/g, ' ').trim();
  };
  var q = norm(query), c = norm(candidate);
  if (!q || !c) return 0;
  var escaped = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  if (new RegExp('^' + escaped + '\\b').test(c)) return 0.95;
  if (new RegExp('\\b' + escaped + '\\b').test(c)) return 0.72;
  return Math.max(seqRatio(q, c), jaccardWords(q, c));
}

// ─────────────────────────────────────────────────────────────────────────────
// IMDb AKA Search (from hdhub4u-v5.js)
// Builds a rich search queue: originalTitle + primaryTitle + Indian AKAs
// + sequel short-variant (e.g. "Pushpa 2" from "Pushpa: The Rule - Part 2")
// ─────────────────────────────────────────────────────────────────────────────

function buildSearchQueue(tmdbTitle, imdbId) {
  return __async(this, null, function* () {
    var searchQueue = [];
    var resolvedTitle = tmdbTitle;

    if (imdbId) {
      console.log(PLUGIN_TAG + ' IMDb ID found: ' + imdbId);
      var imdbRes = null;
      var akasRes = { akas: [] };

      try {
        var responses = yield Promise.all([
          fetch('https://api.imdbapi.dev/titles/' + imdbId).then(function (r) { return r.json(); }).catch(function () { return null; }),
          fetch('https://api.imdbapi.dev/titles/' + imdbId + '/akas').then(function (r) { return r.json(); }).catch(function () { return { akas: [] }; })
        ]);
        imdbRes = responses[0];
        akasRes = responses[1] || { akas: [] };
      } catch (e) {
        console.log(PLUGIN_TAG + ' IMDb API error: ' + e.message);
      }

      if (imdbRes) {
        if (imdbRes.originalTitle) searchQueue.push(imdbRes.originalTitle);
        if (imdbRes.primaryTitle && searchQueue.indexOf(imdbRes.primaryTitle) === -1)
          searchQueue.push(imdbRes.primaryTitle);
        resolvedTitle = imdbRes.originalTitle || imdbRes.primaryTitle || tmdbTitle;
      }

      if (akasRes && Array.isArray(akasRes.akas)) {
        var indianAkas = akasRes.akas
          .filter(function (aka) { return aka.country && aka.country.code === 'IN'; })
          .map(function (aka) { return aka.text; })
          .filter(function (text) { return /^[\w\s\-':.!&–—(),]+$/.test(text); });
        indianAkas.forEach(function (aka) {
          if (searchQueue.indexOf(aka) === -1) searchQueue.push(aka);
        });
      }
    }

    if (searchQueue.length === 0) searchQueue.push(resolvedTitle);

    // Sequel short-variant: "Pushpa: The Rule - Part 2" → "Pushpa 2"
    var titleForVariant = resolvedTitle || tmdbTitle;
    var partMatch = titleForVariant.match(/^([^:\-–]+).*?(?:Part|Pt\.?)\s*(\d+)\s*$/i);
    if (partMatch) {
      var shortVariant = partMatch[1].trim() + ' ' + partMatch[2];
      console.log(PLUGIN_TAG + ' Adding sequel short variant: ' + shortVariant);
      if (searchQueue.indexOf(shortVariant) === -1) searchQueue.push(shortVariant);
    }

    return { searchQueue: searchQueue, resolvedTitle: resolvedTitle };
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// NetMirror Platform Search — uses calcTitleSim scoring (replaces old similarity)
// ─────────────────────────────────────────────────────────────────────────────

function searchPlatform(searchQueue, year, platform, cookie) {
  var ott  = PLATFORM_OTT[platform];
  var jar  = makeCookieString({ t_hash_t: cookie, user_token: '233123f803cf02184bf6c67e149cdd50', hd: 'on', ott: ott });
  var hdrs = Object.assign({}, BASE_HEADERS, { Cookie: jar, Referer: NETMIRROR_BASE + '/tv/home' });

  // Try each query in searchQueue in parallel, scored with calcTitleSim
  function doSearch(query) {
    var url = SEARCH_ENDPOINT[platform] + '?s=' + encodeURIComponent(query) + '&t=' + unixNow();
    return request(url, { headers: hdrs })
      .then(function (res) { return res.json(); })
      .then(function (data) {
        var results = (data.searchResult || []).map(function (item) {
          var score = calcTitleSim(query, item.t);
          return { id: item.id, title: item.t, score: score };
        }).filter(function (r) { return r.score >= 0.62; })
          .sort(function (a, b) { return b.score - a.score; });

        // Year bonus/penalty (from hdhub4u-v5.js performParallelSearch)
        if (year && results.length) {
          results = results.map(function (r) {
            var rYear = (r.title.match(/\b(19|20)\d{2}\b/) || [])[0];
            if (rYear) {
              var delta = Math.abs(parseInt(year) - parseInt(rYear));
              if (delta === 0) r.score = Math.min(1, r.score + 0.1);
              else if (delta > 3) r.score *= 0.7;
            }
            return r;
          }).filter(function (r) { return r.score >= 0.62; })
            .sort(function (a, b) { return b.score - a.score; });
        }

        return results.length ? results[0] : null;
      }).catch(function () { return null; });
  }

  // Run all queries in parallel (same strategy as hdhub4u performParallelSearch)
  var queries = searchQueue.slice(); // copy

  // Also append year to each query for better Pingora-like window matching
  if (year) {
    queries = queries.concat(
      searchQueue.map(function (q) { return q.includes(year) ? null : q + ' ' + year; })
        .filter(Boolean)
    );
  }

  return Promise.all(queries.map(function (q) { return doSearch(q); }))
    .then(function (allHits) {
      // Pick the highest scoring non-null hit
      var best = null;
      allHits.forEach(function (hit) {
        if (!hit) return;
        if (!best || hit.score > best.score) best = hit;
      });
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

  console.log(PLUGIN_TAG + ' Bypassing authentication…');

  function attempt(n) {
    if (n >= 5) return Promise.reject(new Error('Bypass failed after 5 attempts'));

    return fetch(NETMIRROR_PLAY + '/tv/p.php', { method: 'POST', redirect: 'follow', headers: BASE_HEADERS })
      .then(function (res) {
        var raw = res.headers.get('set-cookie') || '';
        var cs  = Array.isArray(raw) ? raw.join('; ') : raw;
        var cookieMatch = cs.match(/t_hash_t=([^;,\s]+)/);
        var extracted   = cookieMatch ? cookieMatch[1] : null;

        return res.text().then(function (body) {
          if (!body.includes('"r":"n"')) {
            console.log(PLUGIN_TAG + ' Bypass attempt ' + (n + 1) + ' failed, retrying…');
            return attempt(n + 1);
          }
          if (!extracted) throw new Error('t_hash_t not found in Set-Cookie');
          _cachedCookie    = extracted;
          _cookieTimestamp = Date.now();
          console.log(PLUGIN_TAG + ' Auth successful.');
          return _cachedCookie;
        });
      });
  }

  return attempt(0);
}

// ─────────────────────────────────────────────────────────────────────────────
// TMDB Lookup
// ─────────────────────────────────────────────────────────────────────────────

function getTmdbDetails(tmdbId, type) {
  var isTv = (type === 'tv' || type === 'series');
  var url  = 'https://api.themoviedb.org/3/' + (isTv ? 'tv' : 'movie') + '/' + tmdbId
    + '?api_key=' + TMDB_API_KEY + '&append_to_response=external_ids';

  return fetch(url)
    .then(function (res) { return res.json(); })
    .then(function (data) {
      var imdbId = data.imdb_id || (data.external_ids && data.external_ids.imdb_id) || null;
      return {
        title  : isTv ? data.name  : data.title,
        year   : isTv ? (data.first_air_date || '').slice(0, 4) : (data.release_date || '').slice(0, 4),
        isTv   : isTv,
        imdbId : imdbId,
      };
    })
    .catch(function (err) {
      console.log(PLUGIN_TAG + ' TMDB error: ' + err.message);
      return null;
    });
}

// ─────────────────────────────────────────────────────────────────────────────
// Content Loading & Episode Pagination
// ─────────────────────────────────────────────────────────────────────────────

function loadContent(contentId, platform, cookie) {
  var ott  = PLATFORM_OTT[platform];
  var jar  = makeCookieString({ t_hash_t: cookie, user_token: '233123f803cf02184bf6c67e149cdd50', ott: ott, hd: 'on' });
  var hdrs = Object.assign({}, BASE_HEADERS, { Cookie: jar, Referer: NETMIRROR_BASE + '/tv/home' });
  var url  = POST_ENDPOINT[platform] + '?id=' + contentId + '&t=' + unixNow();

  return request(url, { headers: hdrs })
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
        if (data.nextPageShow === 0) return collected;
        return page(n + 1);
      }).catch(function () { return collected; });
  }

  return page(startPage || 2);
}

// ─────────────────────────────────────────────────────────────────────────────
// Video Token
// Step 1: POST play.php → get h param
// Step 2: GET play.php on PLAY domain → parse data-h token
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
  })
    .then(function (res) { return res.json(); })
    .then(function (playData) {
      var h = playData.h;
      if (!h) throw new Error('play.php step1: no h param');
      console.log(PLUGIN_TAG + ' Token step1 h=' + String(h).slice(0, 30) + '...');

      return request(NETMIRROR_PLAY + '/play.php?id=' + contentId + '&' + h, {
        headers: {
          'Accept'          : 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
          'Accept-Language' : 'en-US,en;q=0.9',
          'Referer'         : NETMIRROR_BASE + '/',
          'Sec-Fetch-Dest'  : 'iframe',
          'Sec-Fetch-Mode'  : 'navigate',
          'Sec-Fetch-Site'  : 'cross-site',
          'Cookie'          : jar,
          'User-Agent'      : BASE_HEADERS['User-Agent'],
        },
      });
    })
    .then(function (res) { return res.text(); })
    .then(function (html) {
      var m = html.match(/data-h="([^"]+)"/);
      if (m) console.log(PLUGIN_TAG + ' Token step2 data-h=' + m[1].slice(0, 20) + '...');
      else   console.log(PLUGIN_TAG + ' Token step2: data-h NOT FOUND (html length=' + html.length + ')');
      return m ? m[1] : null;
    });
}

// ─────────────────────────────────────────────────────────────────────────────
// Playlist Fetch
// encodeURIComponent(token) is REQUIRED — raw token breaks server validation
// ─────────────────────────────────────────────────────────────────────────────

function getPlaylist(contentId, title, platform, cookie, token) {
  var ott = PLATFORM_OTT[platform];
  var jar = makeCookieString({ t_hash_t: cookie, ott: ott, hd: 'on' });

  var url = PLAYLIST_ENDPOINT[platform]
    + '?id='  + contentId
    + '&t='   + encodeURIComponent(title)
    + '&tm='  + unixNow()
    + '&h='   + encodeURIComponent(token);  // MUST be encoded

  return request(url, {
    headers: Object.assign({}, BASE_HEADERS, { Cookie: jar, Referer: NETMIRROR_PLAY + '/' }),
  })
    .then(function (res) { return res.json(); })
    .then(function (playlist) {
      if (!Array.isArray(playlist) || !playlist.length) return { sources: [], subtitles: [] };

      var sources   = [];
      var subtitles = [];

      playlist.forEach(function (item) {
        (item.sources || []).forEach(function (src) {
          var rawUrl = (src.file || '').replace(/^\/tv\//, '/');
          if (rawUrl && !rawUrl.startsWith('http'))
            rawUrl = NETMIRROR_PLAY + (rawUrl.startsWith('/') ? '' : '/') + rawUrl;
          if (rawUrl) sources.push({ url: rawUrl, quality: src.label || '', type: src.type || 'application/x-mpegURL' });
        });

        (item.tracks || []).filter(function (t) { return t.kind === 'captions'; }).forEach(function (track) {
          var subUrl = track.file || '';
          if (subUrl.startsWith('//')) subUrl = 'https:' + subUrl;
          else if (subUrl.startsWith('/')) subUrl = NETMIRROR_PLAY + subUrl;
          if (subUrl) subtitles.push({ url: subUrl, language: track.label || 'Unknown' });
        });
      });

      console.log(PLUGIN_TAG + ' Playlist: ' + sources.length + ' source(s), ' + subtitles.length + ' subtitle(s).');
      return { sources: sources, subtitles: subtitles };
    });
}

// ─────────────────────────────────────────────────────────────────────────────
// Episode Matching
// ─────────────────────────────────────────────────────────────────────────────

function findEpisode(episodes, targetSeason, targetEpisode) {
  var s = parseInt(targetSeason);
  var e = parseInt(targetEpisode);

  return (episodes || []).find(function (ep) {
    if (!ep) return false;
    var epS, epE;

    if (ep.s && ep.ep) {
      epS = parseInt((ep.s + '').replace(/\D/g, ''));
      epE = parseInt((ep.ep + '').replace(/\D/g, ''));
    } else if (ep.season !== undefined && ep.episode !== undefined) {
      epS = parseInt(ep.season);
      epE = parseInt(ep.episode);
    } else if (ep.season_number !== undefined && ep.episode_number !== undefined) {
      epS = parseInt(ep.season_number);
      epE = parseInt(ep.episode_number);
    } else {
      return false;
    }

    return epS === s && epE === e;
  }) || null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Stream Builder
// ─────────────────────────────────────────────────────────────────────────────

function buildStream(source, platform, tmdb, content, episodeData, langList) {
  var quality   = parseQuality(source);
  var platLabel = PLATFORM_LABEL[platform] || platform;
  var langStr   = formatLangs(langList);

  var titleLine = (tmdb.title || content.title);
  if (tmdb.year || content.year) titleLine += ' (' + (tmdb.year || content.year) + ')';
  if (tmdb.isTv && episodeData) {
    var sNum   = String(episodeData.s  || episodeData.season  || episodeData.season_number  || '').replace(/\D/g, '');
    var eNum   = String(episodeData.ep || episodeData.episode || episodeData.episode_number || '').replace(/\D/g, '');
    titleLine += ' · S' + sNum + 'E' + eNum;
    if (episodeData.t) titleLine += ' — ' + episodeData.t;
  }

  var lines = [titleLine, '📺 ' + quality + ' · HLS'];
  if (langStr)        lines.push('🔊 ' + langStr);
  if (content.runtime) lines.push('🗓 ' + content.runtime);
  lines.push("by Sanchit · @S4NCHITT · Murph's Streams");

  return {
    name    : '📺 ' + platLabel + ' | ' + quality,
    title   : lines.join('\n'),
    url     : source.url,
    quality : quality,
    type    : 'hls',
    headers : {
      'User-Agent'      : 'Mozilla/5.0 (Android) ExoPlayer',
      'Accept'          : '*/*',
      'Accept-Encoding' : 'identity',
      'Connection'      : 'keep-alive',
      'Cookie'          : 'hd=on',
      'Referer'         : NETMIRROR_PLAY + '/',
    },
    behaviorHints: {
      bingeGroup : 'netmirror-' + platform,
    },
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Platform Pipeline
// Search (with AKA queue) → Load → Match episode → Token → Playlist → Streams
// ─────────────────────────────────────────────────────────────────────────────

function tryPlatform(platform, tmdb, searchQueue, season, episode, cookie) {
  console.log(PLUGIN_TAG + ' Trying platform: ' + PLATFORM_LABEL[platform]);

  return searchPlatform(searchQueue, tmdb.year, platform, cookie)
    .then(function (hit) {
      if (!hit) {
        console.log(PLUGIN_TAG + ' Not found on ' + PLATFORM_LABEL[platform]);
        return null;
      }
      console.log(PLUGIN_TAG + ' Match: "' + hit.title + '" (ID: ' + hit.id + ') score=' + hit.score.toFixed(2));

      return loadContent(hit.id, platform, cookie).then(function (content) {
        var raw     = content._raw;
        var epChain = Promise.resolve();

        if (raw.nextPageShow === 1 && raw.nextPageSeason) {
          epChain = epChain.then(function () {
            return fetchMoreEpisodes(hit.id, raw.nextPageSeason, platform, cookie, 2)
              .then(function (more) { content.episodes = content.episodes.concat(more); });
          });
        }

        if (Array.isArray(raw.season) && raw.season.length > 1) {
          raw.season.slice(0, -1).forEach(function (s) {
            epChain = epChain.then(function () {
              return fetchMoreEpisodes(hit.id, s.id, platform, cookie, 1)
                .then(function (more) { content.episodes = content.episodes.concat(more); });
            });
          });
        }

        return epChain.then(function () {
          var targetId   = hit.id;
          var episodeObj = null;

          if (tmdb.isTv) {
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
              if (!token) {
                console.log(PLUGIN_TAG + ' Could not get video token');
                return null;
              }

              return getPlaylist(targetId, tmdb.title, platform, cookie, token)
                .then(function (playlist) {
                  if (!playlist.sources.length) {
                    console.log(PLUGIN_TAG + ' No sources in playlist');
                    return null;
                  }

                  var streams = playlist.sources
                    .map(function (src) {
                      return buildStream(src, platform, tmdb, content, episodeObj, content.langs);
                    })
                    .sort(function (a, b) {
                      return qualitySortScore(b.quality) - qualitySortScore(a.quality);
                    });

                  console.log(PLUGIN_TAG + ' ✔ ' + streams.length + ' stream(s) from ' + PLATFORM_LABEL[platform]);
                  return streams;
                });
            });
        });
      });
    })
    .catch(function (err) {
      console.log(PLUGIN_TAG + ' Error on ' + PLATFORM_LABEL[platform] + ': ' + err.message);
      return null;
    });
}

// ─────────────────────────────────────────────────────────────────────────────
// Public API — getStreams
// Called by Nuvio with (tmdbId, mediaType, season, episode)
// ─────────────────────────────────────────────────────────────────────────────

function getStreams(tmdbId, type, season, episode) {
  return __async(this, null, function* () {
    var mediaType = (type === 'series') ? 'tv' : (type || 'movie');
    var s = season  ? parseInt(season)  : null;
    var e = episode ? parseInt(episode) : null;

    console.log(PLUGIN_TAG + ' ► TMDB: ' + tmdbId + ' | type: ' + mediaType + (s ? ' S' + s + 'E' + e : ''));

    var tmdb = yield getTmdbDetails(tmdbId, mediaType);
    if (!tmdb || !tmdb.title) {
      console.log(PLUGIN_TAG + ' TMDB lookup failed.');
      return [];
    }
    console.log(PLUGIN_TAG + ' Title: "' + tmdb.title + '" (' + tmdb.year + ') imdbId: ' + tmdb.imdbId);

    // Build rich search queue using IMDb AKAs + sequel variants
    var queueResult   = yield buildSearchQueue(tmdb.title, tmdb.imdbId);
    var searchQueue   = queueResult.searchQueue;
    var resolvedTitle = queueResult.resolvedTitle;
    // Update tmdb title to best resolved title for matching
    tmdb.title = resolvedTitle || tmdb.title;

    console.log(PLUGIN_TAG + ' Search queue: [' + searchQueue.join(' | ') + ']');

    var cookie = yield bypass();

    // Platform priority — bias toward likely platform based on title keywords
    var platforms = ['netflix', 'primevideo', 'disney'];
    var t = tmdb.title.toLowerCase();
    if (t.includes('prime') || t.includes('boys') || t.includes('jack ryan')) {
      platforms = ['primevideo', 'netflix', 'disney'];
    } else if (t.includes('star wars') || t.includes('marvel') || t.includes('mandalorian') || t.includes('pixar')) {
      platforms = ['disney', 'netflix', 'primevideo'];
    }

    // Try platforms sequentially — return first successful result
    function tryNext(i) {
      if (i >= platforms.length) {
        console.log(PLUGIN_TAG + ' No streams found on any platform.');
        return Promise.resolve([]);
      }
      return tryPlatform(platforms[i], tmdb, searchQueue, s, e, cookie)
        .then(function (streams) {
          if (streams && streams.length) return streams;
          return tryNext(i + 1);
        });
    }

    return yield tryNext(0);
  });
}
