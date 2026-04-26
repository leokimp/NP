"use strict";
var __async = function(__this, __arguments, generator) {
  return new Promise(function(resolve, reject) {
    var fulfilled = function(value) {
      try {
        step(generator.next(value));
      } catch (e) {
        reject(e);
      }
    };
    var rejected = function(value) {
      try {
        step(generator.throw(value));
      } catch (e) {
        reject(e);
      }
    };
    var step = function(x) {
      return x.done ? resolve(x.value) : Promise.resolve(x.value).then(fulfilled, rejected);
    };
    step((generator = generator.apply(__this, __arguments)).next());
  });
};
var __defProp = Object.defineProperty;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = function(target, all) {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = function(to, from, except, desc) {
  if (from && typeof from === "object" || typeof from === "function") {
    for (var key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: function() {
          return from[key];
        }, enumerable: !(desc = Object.getOwnPropertyDescriptor(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = function(mod) {
  return __copyProps(__defProp({}, "__esModule", { value: true }), mod);
};
var netmirror_exports = {};
__export(netmirror_exports, { getStreams: function() {
  return getStreams;
} });
module.exports = __toCommonJS(netmirror_exports);
var PREFERRED_AUDIO_LANG = "hin";
var ENABLE_PROXY = true;
var PROXY_WORKER_URL = "https://hlspxy.dpdns.org";
var ENABLE_STREAM_CACHE = false;
var CACHE_WORKER_URL = "https://cache.leokimpese.workers.dev";
var CACHE_TTL_SECONDS = 3600;
var TMDB_API_KEY = "439c478a771f35c05022f9feabcca01c";

var PLUGIN_TAG = "[NetMirror TV v1.0]";
var COOKIE_EXPIRY_MS = 15 * 60 * 60 * 1e3;
var API_EXPIRY_MS = 24 * 60 * 60 * 1e3; 
var _cachedToken = "";
var _tokenTimestamp = 0;
var _dynamicApiBase = "https://tv.imgcdn.kim"; // Fallback URL
var _apiBaseTimestamp = 0;
var _nmInFlight = {};
var PLATFORM_OTT = { netflix: "nf", primevideo: "pv", disney: "hs" };
var PLATFORM_LABEL = { netflix: "Netflix", primevideo: "Prime Video", disney: "JioHotstar" };
var APP_UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:136.0) Gecko/20100101 Firefox/136.0 /OS.GatuNewTV v1.0";
var API_HEADERS = {
  "User-Agent": APP_UA,
  "Accept": "application/json, text/plain, */*",
  "X-Requested-With": "NetmirrorNewTV v1.0"
};

// [ADD NEW FUNCTION ANYWHERE ABOVE bypass()]
// Polyfill for Base64 Decode to ensure Hermes compatibility
function decodeBase64(str) {
  var chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
  var output = '';
  str = String(str).replace(/=+$/, '');
  for (var bc = 0, bs, buffer, idx = 0; buffer = str.charAt(idx++); ~buffer && (bs = bc % 4 ? bs * 64 + buffer : buffer, bc++ % 4) ? output += String.fromCharCode(255 & bs >> (-2 * bc & 6)) : 0) {
      buffer = chars.indexOf(buffer);
  }
  return output;
}

function getApiBase() {
  var now = Date.now();
  if (_dynamicApiBase && (now - _apiBaseTimestamp < API_EXPIRY_MS)) {
    return Promise.resolve(_dynamicApiBase);
  }
  console.log(PLUGIN_TAG + " Checking dynamic TV API base...");
  return fetch("https://mobiledetects.com/checknewtv.php", {
    method: "GET",
    headers: API_HEADERS
  }).then(function(res) {
    return res.json();
  }).then(function(data) {
    if (data && data.token_hash) {
      _dynamicApiBase = decodeBase64(data.token_hash);
      _apiBaseTimestamp = Date.now();
      console.log(PLUGIN_TAG + " TV API Base Updated: " + _dynamicApiBase);
      return _dynamicApiBase;
    }
    return _dynamicApiBase;
  }).catch(function() {
    console.log(PLUGIN_TAG + " Failed to check API base, using fallback: " + _dynamicApiBase);
    return _dynamicApiBase;
  });
}

function unixNow() {
  return Math.floor(Date.now() / 1e3);
}
function makeCookieString(obj) {
  return Object.keys(obj).filter(function(k) {
    return obj[k] != null;
  }).map(function(k) {
    return k + "=" + obj[k];
  }).join("; ");
}
function decodeHtmlEntities(str) {
  if (!str)
    return str;
  return str.replace(/&#(\d+);/g, function(_, code) {
    return String.fromCharCode(parseInt(code, 10));
  }).replace(/&#x([0-9a-f]+);/gi, function(_, hex) {
    return String.fromCharCode(parseInt(hex, 16));
  }).replace(/&quot;/gi, '"').replace(/&apos;/gi, "'").replace(/&amp;/gi, "&").replace(/&lt;/gi, "<").replace(/&gt;/gi, ">");
}
function request(url, opts) {
  opts = opts || {};
  return fetch(url, Object.assign({ redirect: "follow" }, opts, {
    headers: Object.assign({}, API_HEADERS, opts.headers || {})
  })).then(function(res) {
    if (!res.ok)
      throw new Error("HTTP " + res.status + " for " + url);
    return res;
  });
}
function buildPlayerUrl(originalUrl) {
  if (!ENABLE_PROXY)
    return originalUrl;
  var base = PROXY_WORKER_URL.replace(/\/$/, "");
  return base + "/proxy?url=" + encodeURIComponent(originalUrl);
}
function nmCacheKey(tmdbId, type, season, episode) {
  return "nm121_" + tmdbId + "_" + (type || "movie") + "_" + (season != null ? season : "null") + "_" + (episode != null ? episode : "null");
}
function nmGetCachedStreams(tmdbId, type, season, episode) {
  var key = nmCacheKey(tmdbId, type, season, episode);
  console.log(PLUGIN_TAG + " [CACHE] Checking: " + key);
  return fetch(CACHE_WORKER_URL + "/" + key, {
    method: "GET",
    headers: { "Content-Type": "application/json" }
  }).then(function(res) {
    if (res.status === 404) {
      console.log(PLUGIN_TAG + " [CACHE] Miss");
      return null;
    }
    if (!res.ok)
      return null;
    return res.json();
  }).then(function(data) {
    if (!data || !Array.isArray(data.streams) || !data.streams.length)
      return null;
    console.log(PLUGIN_TAG + " [CACHE] \u26A1 Hit (" + data.streams.length + " stream(s))");
    return data.streams;
  }).catch(function() {
    return null;
  });
}
function nmSetCachedStreams(tmdbId, type, season, episode, streams) {
  var key = nmCacheKey(tmdbId, type, season, episode);
  return fetch(CACHE_WORKER_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      key,
      streams,
      ttl: CACHE_TTL_SECONDS,
      metadata: { tmdbId, type, season, episode, savedAt: Date.now(), plugin: "netmirror-v12.1" }
    })
  }).then(function(res) {
    console.log(PLUGIN_TAG + " [CACHE] Save " + (res.ok ? "\u2713" : "failed"));
  }).catch(function() {
  });
}
function resetAuthCache() {
  console.log(PLUGIN_TAG + " [AUTH FAILED] Flushing API and Token caches...");
  _apiBaseTimestamp = 0;
  _tokenTimestamp = 0;
  _cachedToken = "";
}

function bypass() {
  var now = Date.now();
  
  // 1. Checks if token is valid (Expires automatically after COOKIE_EXPIRY_MS)
  if (_cachedToken && now - _tokenTimestamp < COOKIE_EXPIRY_MS) {
    return Promise.resolve(_cachedToken);
  }
  
  // 2. getApiBase() automatically checks mobiledetects.com if API_EXPIRY_MS (24h) has passed
  return getApiBase().then(function(apiBase) {
    console.log(PLUGIN_TAG + " Requesting TV Token (1-Step OTP)...");
    return fetch(apiBase + "/newtv/otp.php", {
      method: "GET",
      headers: Object.assign({}, API_HEADERS, { "otp": "111111" })
    }).then(function(res) {
      if (!res.ok) throw new Error("HTTP " + res.status);
      return res.json();
    }).then(function(data) {
      if (data.status === "ok" && data.usertoken) {
        _cachedToken = data.usertoken;
        _tokenTimestamp = Date.now();
        console.log(PLUGIN_TAG + " TV Token Acquired");
        return _cachedToken;
      }
      throw new Error("Token extraction failed");
    }).catch(function(err) {
      // 3. Triggered if API changed, domain died, or OTP logic was patched
      resetAuthCache();
      throw err; 
    });
  });
}
function seqRatio(a, b) {
  if (!a || !b)
    return 0;
  var la = a.length, lb = b.length;
  if (la === 0 && lb === 0)
    return 1;
  var dp = Array.from({ length: la + 1 }, function() {
    return new Array(lb + 1).fill(0);
  });
  var best = 0;
  for (var i = 1; i <= la; i++)
    for (var j = 1; j <= lb; j++) {
      dp[i][j] = a[i - 1] === b[j - 1] ? dp[i - 1][j - 1] + 1 : 0;
      if (dp[i][j] > best)
        best = dp[i][j];
    }
  return 2 * best / (la + lb);
}
function jaccardWords(a, b) {
  var sa = new Set(a.split(/\s+/).filter(Boolean));
  var sb = new Set(b.split(/\s+/).filter(Boolean));
  var inter = 0;
  sa.forEach(function(w) {
    if (sb.has(w))
      inter++;
  });
  var union = new Set(Array.from(sa).concat(Array.from(sb))).size;
  return union === 0 ? 0 : inter / union;
}
function normTitle(s) {
  return s.replace(/&amp;/gi, "&").toLowerCase().replace(/\s*&\s*/g, " and ").replace(/\(\d{4}\)/g, "").replace(/\bseason\s*\d+\b/gi, "").replace(/\bs\d{1,2}\b/gi, "").replace(/[^a-z0-9\s]/g, "").replace(/\s+/g, " ").trim();
}
function calcTitleSim(query, candidate) {
  var q = normTitle(query), c = normTitle(candidate);
  if (!q || !c)
    return 0;
  if (q === c)
    return 1;
  var esc = q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  if (new RegExp("^" + esc + "\\b").test(c))
    return 0.65;
  if (new RegExp("\\b" + esc + "\\b").test(c))
    return 0.6;
  return Math.max(seqRatio(q, c), jaccardWords(q, c)) * 0.8;
}
function scoreResult(query, resultTitle, targetYear, resultYear) {
  var titleScore = calcTitleSim(query, resultTitle);
  var rank = titleScore;
  var rYear = resultYear || (resultTitle.match(/\b(19|20)\d{2}\b/) || [])[0];
  if (targetYear && rYear) {
    var d = Math.abs(parseInt(targetYear) - parseInt(rYear));
    if (d === 0)
      rank += 0.15;
    else if (d === 1)
      rank += 0.05;
    else
      rank -= 0.3;
  } else if (targetYear && !rYear && titleScore < 1)
    rank -= 0.1;
  return rank >= 0.72 ? rank : 0;
}
function resolveIds(rawId, type) {
  return __async(this, null, function* () {
    var isTv = type === "series" || type === "tv";
    var mediaType = isTv ? "tv" : "movie";
    var imdbId = null, title = "", year = "";
    if (rawId && rawId.startsWith("tt")) {
      imdbId = rawId;
      var iRes = yield fetch("https://api.imdbapi.dev/titles/" + rawId).then(function(r) {
        return r.json();
      }).catch(function() {
        return null;
      });
      if (iRes) {
        title = iRes.originalTitle || iRes.primaryTitle || "";
        year = iRes.startYear ? String(iRes.startYear) : "";
      }
    } else {
      var tmdbId = (rawId || "").replace(/^tmdb:/i, "");
      var info = yield fetch("https://api.themoviedb.org/3/" + mediaType + "/" + tmdbId + "?api_key=" + TMDB_API_KEY + "&append_to_response=external_ids").then(function(r) {
        return r.json();
      }).catch(function() {
        return {};
      });
      imdbId = info.imdb_id || info.external_ids && info.external_ids.imdb_id || null;
      title = (isTv ? info.name : info.title) || "";
      year = ((isTv ? info.first_air_date : info.release_date) || "").slice(0, 4);
    }
    var searchQueue = [], resolvedTitle = title;
    if (imdbId) {
      var fetched = yield Promise.all([
        fetch("https://api.imdbapi.dev/titles/" + imdbId).then(function(r) {
          return r.json();
        }).catch(function() {
          return null;
        }),
        fetch("https://api.imdbapi.dev/titles/" + imdbId + "/akas").then(function(r) {
          return r.json();
        }).catch(function() {
          return { akas: [] };
        })
      ]);
      var imdbInfo = fetched[0], akasData = fetched[1] || { akas: [] };
      if (imdbInfo) {
        if (imdbInfo.originalTitle && searchQueue.indexOf(imdbInfo.originalTitle) === -1)
          searchQueue.push(imdbInfo.originalTitle);
        if (imdbInfo.primaryTitle && searchQueue.indexOf(imdbInfo.primaryTitle) === -1)
          searchQueue.push(imdbInfo.primaryTitle);
        resolvedTitle = imdbInfo.originalTitle || imdbInfo.primaryTitle || title;
      }
      var indianAkas = (akasData.akas || []).filter(function(a) {
        return a.country && a.country.code === "IN";
      }).map(function(a) {
        return a.text;
      }).filter(function(t) {
        return /^[\w\s\-':.!&\u2013\u2014(),]+$/.test(t);
      });
      indianAkas.forEach(function(aka) {
        if (searchQueue.indexOf(aka) === -1)
          searchQueue.push(aka);
      });
    }
    if (searchQueue.length === 0)
      searchQueue.push(resolvedTitle || title);
    var base = resolvedTitle || title;
    var partMatch = base.match(/^([^:\-\u2013\u2014]+).*?(?:Part|Pt\.?)\s*(\d+)\s*$/i);
    if (partMatch) {
      var sv = partMatch[1].trim() + " " + partMatch[2];
      if (searchQueue.indexOf(sv) === -1)
        searchQueue.push(sv);
    }
    if (base.includes(":")) {
      var st = base.split(":")[0].trim();
      if (searchQueue.indexOf(st) === -1)
        searchQueue.push(st);
    }
    var nm = base.match(/^([^\d]+\s\d+)\b/i);
    if (nm && nm[1].length < base.length) {
      var sn = nm[1].trim();
      if (!/\b(19|20)\d{2}\b/.test(sn) && searchQueue.indexOf(sn) === -1)
        searchQueue.push(sn);
    }
    console.log(PLUGIN_TAG + ' resolved="' + (resolvedTitle || title) + '" year=' + year + " queue=[" + searchQueue.join(" | ") + "]");
    return { title: resolvedTitle || title, year, isTv, imdbId, searchQueue };
  });
}
function searchPlatform(searchQueue, year, platform, usertoken, isTv) {
  var ott = PLATFORM_OTT[platform];
  var hdrs = Object.assign({}, API_HEADERS, { "ott": ott, "usertoken": usertoken });
  return Promise.all(searchQueue.map(function(q) {
    var url = _dynamicApiBase + "/newtv/search.php?s=" + encodeURIComponent(q);
    return request(url, { headers: hdrs }).then(function(res) {
      return res.json();
    }).then(function(data) {
      return (data.searchResult || []).map(function(r) {
        var score = scoreResult(q, r.t || "", year, r.y || null);
        return score > 0 ? { id: r.id, title: r.t, score } : null;
      }).filter(Boolean);
    }).catch(function() {
      return [];
    });
  })).then(function(arrays) {
    var all = [].concat.apply([], arrays);
    var best = all.reduce(function(a, b) {
      return b.score > a.score ? b : a;
    }, { score: 0 });
    if (best)
      console.log(PLUGIN_TAG + " [" + platform + '] best="' + best.title + '" score=' + best.score.toFixed(3));
    else
      console.log(PLUGIN_TAG + " [" + platform + "] no match \u22650.72");
    return best.score > 0 ? best : null;
  });
}
var LANG_MAP = {
  ces: "Czech",
  cze: "Czech",
  deu: "German",
  ger: "German",
  eng: "English",
  spa: "Spanish",
  fra: "French",
  fre: "French",
  hin: "Hindi",
  hun: "Hungarian",
  ita: "Italian",
  jpn: "Japanese",
  pol: "Polish",
  por: "Portuguese",
  tur: "Turkish",
  ukr: "Ukrainian",
  kor: "Korean",
  zho: "Chinese",
  chi: "Chinese",
  ara: "Arabic",
  rus: "Russian",
  tam: "Tamil",
  tel: "Telugu",
  mal: "Malayalam",
  ben: "Bengali",
  mar: "Marathi",
  pan: "Punjabi",
  pun: "Punjabi",
  tha: "Thai",
  vie: "Vietnamese",
  ind: "Indonesian",
  msa: "Malay",
  nld: "Dutch",
  swe: "Swedish",
  nor: "Norwegian",
  dan: "Danish",
  fin: "Finnish",
  ron: "Romanian",
  bul: "Bulgarian",
  hrv: "Croatian",
  slk: "Slovak",
  srp: "Serbian",
  heb: "Hebrew"
};
function parseLangArray(langs) {
  if (!Array.isArray(langs) || !langs.length)
    return [];
  var seen = {}, out = [];
  langs.forEach(function(e) {
    var l = e.l || LANG_MAP[(e.s || "").toLowerCase()] || null;
    if (l && !seen[l]) {
      seen[l] = true;
      out.push(l);
    }
  });
  return out;
}
function formatLangs(langs) {
  if (!langs || !langs.length)
    return null;
  return langs.slice(0, 5).join(" - ") + (langs.length > 5 ? " +" + (langs.length - 5) + " more" : "");
}
function loadContent(contentId, platform, usertoken) {
  var ott = PLATFORM_OTT[platform];
  var hdrs = Object.assign({}, API_HEADERS, { "ott": ott, "usertoken": usertoken });
  var url = _dynamicApiBase + "/newtv/post.php?id=" + contentId;
  
  return request(url, { headers: hdrs }).then(function(res) {
    return res.json();
  }).then(function(data) {
    console.log(PLUGIN_TAG + ' Loaded "' + data.title + '" type=' + data.type);
    return {
      id: contentId,
      title: data.title,
      year: data.year,
      type: data.type,
      episodes: (data.episodes || []).filter(Boolean),
      seasons: data.season || [],
      langs: parseLangArray(data.lang || []),
      raw: data
    };
  });
}
function fetchMoreEpisodes(contentId, seasonId, platform, usertoken, startPage) {
  var collected = [];
  function page(n) {
    var ott = PLATFORM_OTT[platform];
    var hdrs = Object.assign({}, API_HEADERS, { "ott": ott, "usertoken": usertoken });
    var url = _dynamicApiBase + "/newtv/episodes.php?s=" + seasonId + "&series=" + contentId + "&page=" + n;
    
    return request(url, { headers: hdrs }).then(function(res) {
      return res.json();
    }).then(function(data) {
      if (data.episodes) {
        collected = collected.concat(data.episodes.filter(Boolean));
      }
      // Infinite loop protection: Limit to 10 pages maximum per season
      if (data.nextPageShow === 1 && n < 10) {
        return page(n + 1);
      }
      return collected;
    }).catch(function() {
      return collected;
    });
  }
  return page(startPage || 1);
}
function findEpisode(episodes, targetSeason, targetEpisode) {
  var s = parseInt(targetSeason), e = parseInt(targetEpisode);
  return (episodes || []).find(function(ep) {
    if (!ep)
      return false;
    var epS, epE;
    if (ep.s && ep.ep) {
      // Extract only the first set of digits to avoid merging season/episode numbers
      var sMatch = (ep.s + "").match(/\d+/);
      var eMatch = (ep.ep + "").match(/\d+/);
      epS = sMatch ? parseInt(sMatch[0]) : -1;
      epE = eMatch ? parseInt(eMatch[0]) : -1;
    } else if (ep.season !== void 0 && ep.episode !== void 0) {
      epS = parseInt(ep.season);
      epE = parseInt(ep.episode);
    } else if (ep.season_number !== void 0 && ep.episode_number !== void 0) {
      epS = parseInt(ep.season_number);
      epE = parseInt(ep.episode_number);
    } else
      return false;
    return epS === s && epE === e;
  }) || null;
}
function getPlaylist(contentId, title, platform, usertoken) {
  var ott = PLATFORM_OTT[platform];
  var originalUrl = _dynamicApiBase + "/newtv/player.php?id=" + contentId;
  var hdrs = Object.assign({}, API_HEADERS, { "ott": ott, "usertoken": usertoken });

  return fetch(originalUrl, { headers: hdrs })
    .then(function(res) {
      if (!res.ok) throw new Error("player HTTP " + res.status);
      return res.json();
    }).then(function(data) {
      var sources = [], subtitles = [];
      if (data.status === "ok" && data.video_link) {
        sources.push({ 
          url: data.video_link.replace(/\\\//g, '/'), 
          label: "Auto", 
          type: "application/x-mpegURL", 
          isDefault: true 
        });
      }
      return { sources, subtitles };
    });
}
function pickQuality(label) {
  var l = (label || "").toLowerCase();
  if (l.includes("full hd") || l.includes("1080"))
    return { name: "1080p", height: 1080 };
  if (l.includes("mid hd") || l.includes("720"))
    return { name: "720p", height: 720 };
  if (l.includes("low hd") || l.includes("480"))
    return { name: "480p", height: 480 };
  if (l === "auto")
    return { name: "Auto", height: 0 };
  return { name: label || "Auto", height: 0 };
}
function buildStreamLine(platform, content, resolved, episodeData) {
  var titleLine = content.title || resolved.title;
  var yearStr = content.year || resolved.year;
  if (yearStr)
    titleLine += " (" + yearStr + ")";
  if (resolved.isTv && episodeData) {
    var sNum = String(episodeData.s || episodeData.season || episodeData.season_number || "").replace(/\D/g, "");
    var eNum = String(episodeData.ep || episodeData.episode || episodeData.episode_number || "").replace(/\D/g, "");
    titleLine += " - S" + sNum + "E" + eNum;
    if (episodeData.t)
      titleLine += " - " + decodeHtmlEntities(episodeData.t);
  }
  var langs = formatLangs(content.langs);
  var lines = [titleLine];
  if (langs)
    lines.push(langs);
  return lines.join("\n");
}

function makeStream(platform, qualityName, finalUrl, titleLine) {
  var playerUrl = buildPlayerUrl(finalUrl);
  var streamHeaders = ENABLE_PROXY ? {} : {
    "User-Agent": APP_UA,
    "Origin": "https://net52.cc",
    "Referer": "https://net52.cc/",
    "Accept": "*/*",
    "Accept-Encoding": "identity",
    "Connection": "keep-alive",
    "X-Requested-With": "NetmirrorNewTV v1.0"
  };
  console.log(PLUGIN_TAG + " [stream] " + (ENABLE_PROXY ? "[PROXIED] " : "[DIRECT] ") + qualityName + " \u2192 " + playerUrl.slice(0, 80) + "\u2026");
  return {
    name: (PLATFORM_LABEL[platform] || platform) + " | " + qualityName,
    title: titleLine,
    url: playerUrl,
    type: "hls",
    headers: streamHeaders,
    behaviorHints: { bingeGroup: "netmirror-" + platform }
  };
}
function loadPlatformContent(platform, hit, resolved, season, episode, cookie) {
  console.log(PLUGIN_TAG + " >> Pipeline: " + PLATFORM_LABEL[platform]);
  
  // 'cookie' is the usertoken passed from _getStreamsCore
  return loadContent(hit.id, platform, cookie).then(function(content) {
    var raw = content.raw;
    var chain = Promise.resolve();

    // OPTIMIZATION: Only fetch additional episodes if we are looking for a TV show.
    // This prevents movies from getting stuck in long episode-fetching loops.
    if (resolved.isTv) {
      if (raw.nextPageShow === 1 && raw.nextPageSeason) {
        chain = chain.then(function() {
          return fetchMoreEpisodes(hit.id, raw.nextPageSeason, platform, cookie, 2).then(function(more) {
            content.episodes = content.episodes.concat(more);
          });
        });
      }
      
      // Optimization: Only fetch the season we actually need to save requests/time
      if (Array.isArray(raw.season) && raw.season.length > 1) {
        var targetSeasonId = null;
        var sNum = parseInt(season) || 1;
        raw.season.forEach(function(s) {
          // Extract only the FIRST set of digits (e.g., "Season 4 (10 EP)" -> "4")
          var match = (s.s || "").match(/\d+/);
          var epS = match ? parseInt(match[0]) : -1;
          if (epS === sNum) targetSeasonId = s.id;
        });

        if (targetSeasonId && targetSeasonId !== raw.nextPageSeason) {
          chain = chain.then(function() {
            return fetchMoreEpisodes(hit.id, targetSeasonId, platform, cookie, 1).then(function(more) {
              content.episodes = content.episodes.concat(more);
            });
          });
        }
      }
    }

    return chain.then(function() {
      var targetId = hit.id, episodeObj = null;
      if (resolved.isTv) {
        episodeObj = findEpisode(content.episodes, season || 1, episode || 1);
        if (!episodeObj) {
          console.log(PLUGIN_TAG + " S" + season + "E" + episode + " not found on " + PLATFORM_LABEL[platform]);
          return null;
        }
        targetId = episodeObj.id;
        console.log(PLUGIN_TAG + " Episode ID: " + targetId);
      }
      
      // Pass the token ('cookie') to getPlaylist
      return getPlaylist(targetId, content.title || resolved.title, platform, cookie).then(function(playlist) {
        if (!playlist.sources.length) return null;
        
        var keep = playlist.sources.filter(function(s) {
          var lab = (s.label || "").toLowerCase();
          // The TV API returns "Auto" as a valid master playlist. Do not filter it out.
          if (lab.includes("low") || lab.includes("480")) return false;
          return true;
        });
        
        if (!keep.length) {
          console.log(PLUGIN_TAG + " No HD sources after filter");
          return null;
        }
        
        var titleLine = buildStreamLine(platform, content, resolved, episodeObj);
        return keep.map(function(src) {
          var q = pickQuality(src.label).name;
          return makeStream(platform, q, src.url, titleLine);
        }).sort(function(a, b) {
          var getQ = function(n) { return parseInt(n.match(/(\d+)p/) ? n.match(/(\d+)p/)[1] : 0); };
          return getQ(b.name) - getQ(a.name);
        });
      });
    });
  }).catch(function(err) {
    console.log(PLUGIN_TAG + " [" + PLATFORM_LABEL[platform] + "] error: " + err.message);
    return null;
  });
}
function getStreams(tmdbId, type, season, episode) {
  var s = season ? parseInt(season) : null;
  var e = episode ? parseInt(episode) : null;
  var contentType = type === "series" || type === "tv" ? "tv" : "movie";
  var flightKey = nmCacheKey(tmdbId, contentType, s, e);
  if (_nmInFlight[flightKey]) {
    console.log(PLUGIN_TAG + " [IN-FLIGHT] reusing existing scrape");
    return _nmInFlight[flightKey];
  }
  var promise;
  if (ENABLE_STREAM_CACHE) {
    promise = nmGetCachedStreams(tmdbId, contentType, s, e).then(function(cached) {
      if (cached)
        return cached;
      return _getStreamsCore(tmdbId, type, s, e, contentType);
    });
  } else {
    promise = _getStreamsCore(tmdbId, type, s, e, contentType);
  }
  _nmInFlight[flightKey] = promise;
  promise.then(
    function() {
      delete _nmInFlight[flightKey];
    },
    function() {
      delete _nmInFlight[flightKey];
    }
  );
  return promise;
}
function _getStreamsCore(tmdbId, type, s, e, contentType) {
  return __async(this, null, function* () {
    console.log(PLUGIN_TAG + " Request: " + tmdbId + " " + type + (s ? " S" + s + "E" + e : ""));
    var resolved = yield resolveIds(tmdbId, type);
    if (!resolved.title) {
      console.log(PLUGIN_TAG + " title resolution failed");
      return [];
    }
    var cookie = yield bypass();
    var platforms = ["netflix", "primevideo", "disney"];
    var searches = yield Promise.all(platforms.map(function(p) {
      return searchPlatform(resolved.searchQueue, resolved.year, p, cookie, resolved.isTv).then(function(hit) {
        return { platform: p, hit };
      });
    }));
    var maxScore = 0;
    searches.forEach(function(r) {
      if (r.hit && r.hit.score > maxScore)
        maxScore = r.hit.score;
    });
    if (maxScore === 0) {
      console.log(PLUGIN_TAG + " no platform matched");
      return [];
    }
    var threshold = maxScore >= 1 ? 1 : maxScore;
    var winners = searches.filter(function(r) {
      return r.hit && r.hit.score >= threshold;
    });
    console.log(PLUGIN_TAG + " \u{1F3C6} " + winners.length + " platform winner(s) at score=" + maxScore.toFixed(3));
    var arrays = yield Promise.all(winners.map(function(w) {
      return loadPlatformContent(w.platform, w.hit, resolved, s, e, cookie);
    }));
    var finalStreams = [];
    arrays.forEach(function(a) {
      if (a && a.length)
        finalStreams = finalStreams.concat(a);
    });
    if (ENABLE_STREAM_CACHE && finalStreams.length) {
      nmSetCachedStreams(tmdbId, contentType, s, e, finalStreams);
    }
    return finalStreams;
  });
}
