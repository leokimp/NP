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
var PROXY_WORKER_URL = "https://hls.leokimpese.workers.dev";
var ENABLE_STREAM_CACHE = false;
var CACHE_WORKER_URL = "https://cache.leokimpese.workers.dev";
var CACHE_TTL_SECONDS = 3600;
var TMDB_API_KEY = "439c478a771f35c05022f9feabcca01c";
var NM_BASE = "https://net52.cc";
var PLUGIN_TAG = "[NetMirror v12.1]";
var COOKIE_EXPIRY_MS = 15 * 60 * 60 * 1e3;
var _cachedCookie = "";
var _cookieTimestamp = 0;
var _nmInFlight = {};
var PLATFORM_OTT = { netflix: "nf", primevideo: "pv", disney: "hs" };
var PLATFORM_LABEL = { netflix: "Netflix", primevideo: "Prime Video", disney: "JioHotstar" };
var MOBILE_PATH = {
  netflix: "/mobile",
  primevideo: "/mobile/pv",
  disney: "/mobile/hs"
};
var APP_UA = "Mozilla/5.0 (Linux; Android 16; CPH2723 Build/AP3A.240617.008; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/146.0.7680.178 Mobile Safari/537.36 /OS.Gatu v3.0";
var API_HEADERS = {
  "User-Agent": APP_UA,
  "Accept": "*/*",
  "Accept-Language": "en-IN,en-US;q=0.9,en;q=0.8",
  "X-Requested-With": "XMLHttpRequest",
  "sec-ch-ua": '"Chromium";v="146", "Not-A.Brand";v="24", "Android WebView";v="146"',
  "sec-ch-ua-mobile": "?1",
  "sec-ch-ua-platform": '"Android"',
  "sec-fetch-site": "same-origin",
  "sec-fetch-mode": "cors",
  "sec-fetch-dest": "empty",
  "Referer": NM_BASE + "/mobile/home?app=1"
};
var APP_HEADERS = {
  "User-Agent": APP_UA,
  "Accept": "*/*",
  "Accept-Language": "en-IN,en-US;q=0.9,en;q=0.8",
  "X-Requested-With": "app.netmirror.netmirrornew",
  "sec-fetch-mode": "cors",
  "sec-fetch-dest": "empty",
  "Referer": NM_BASE + "/mobile/home?app=1"
};
var CDN_HEADERS = {
  "User-Agent": APP_UA,
  "Origin": NM_BASE,
  "Referer": NM_BASE + "/",
  "X-Requested-With": "app.netmirror.netmirrornew",
  "Sec-Fetch-Site": "cross-site",
  "Sec-Fetch-Mode": "cors",
  "Sec-Fetch-Dest": "empty"
};
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
function bypass() {
  var now = Date.now();
  if (_cachedCookie && now - _cookieTimestamp < COOKIE_EXPIRY_MS) {
    console.log(PLUGIN_TAG + " Using cached cookie");
    return Promise.resolve(_cachedCookie);
  }
  console.log(PLUGIN_TAG + " Bypassing auth...");
  function attempt(n) {
    if (n >= 5)
      return Promise.reject(new Error("Bypass failed after 5 attempts"));
    return fetch(NM_BASE + "/tv/p.php", {
      method: "POST",
      redirect: "follow",
      headers: API_HEADERS
    }).then(function(res) {
      var raw = res.headers.get("set-cookie") || "";
      var cs = Array.isArray(raw) ? raw.join("; ") : raw;
      var m = cs.match(/t_hash_t=([^;,\s]+)/);
      var ext = m ? m[1] : null;
      return res.text().then(function(body) {
        if (!body.includes('"r":"n"'))
          return attempt(n + 1);
        if (!ext)
          throw new Error("t_hash_t missing in Set-Cookie");
        _cachedCookie = ext;
        _cookieTimestamp = Date.now();
        console.log(PLUGIN_TAG + " Auth OK");
        return _cachedCookie;
      });
    });
  }
  return attempt(0);
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
function searchPlatform(searchQueue, year, platform, cookie, isTv) {
  var ott = PLATFORM_OTT[platform];
  var jar = makeCookieString({ t_hash_t: cookie, ott, hd: "on", lang: PREFERRED_AUDIO_LANG });
  var hdrs = Object.assign({}, API_HEADERS, { Cookie: jar });
  return Promise.all(searchQueue.map(function(q) {
    var url = NM_BASE + MOBILE_PATH[platform] + "/search.php?s=" + encodeURIComponent(q) + "&t=" + unixNow();
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
function loadContent(contentId, platform, cookie) {
  var ott = PLATFORM_OTT[platform];
  var jar = makeCookieString({ t_hash_t: cookie, ott, hd: "on", lang: PREFERRED_AUDIO_LANG });
  var hdrs = Object.assign({}, API_HEADERS, { Cookie: jar });
  var url = NM_BASE + MOBILE_PATH[platform] + "/post.php?id=" + contentId + "&t=" + unixNow();
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
function fetchMoreEpisodes(contentId, seasonId, platform, cookie, startPage) {
  var ott = PLATFORM_OTT[platform];
  var jar = makeCookieString({ t_hash_t: cookie, ott, hd: "on", lang: PREFERRED_AUDIO_LANG });
  var hdrs = Object.assign({}, API_HEADERS, { Cookie: jar });
  var collected = [];
  function page(n) {
    var url = NM_BASE + MOBILE_PATH[platform] + "/episodes.php?s=" + seasonId + "&series=" + contentId + "&t=" + unixNow() + "&page=" + n;
    return request(url, { headers: hdrs }).then(function(res) {
      return res.json();
    }).then(function(data) {
      if (data.episodes)
        collected = collected.concat(data.episodes.filter(Boolean));
      return data.nextPageShow === 0 ? collected : page(n + 1);
    }).catch(function() {
      return collected;
    });
  }
  return page(startPage || 2);
}
function findEpisode(episodes, targetSeason, targetEpisode) {
  var s = parseInt(targetSeason), e = parseInt(targetEpisode);
  return (episodes || []).find(function(ep) {
    if (!ep)
      return false;
    var epS, epE;
    if (ep.s && ep.ep) {
      epS = parseInt((ep.s + "").replace(/\D/g, ""));
      epE = parseInt((ep.ep + "").replace(/\D/g, ""));
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
function getPlaylist(contentId, title, platform, cookie) {
  var ott = PLATFORM_OTT[platform];
  var jar = makeCookieString({ t_hash_t: cookie, ott, hd: "on", lang: PREFERRED_AUDIO_LANG });
  var qs = "?id=" + contentId;
  if (platform === "disney") {
    qs += "&t=";
  } else {
    qs += "&t=" + encodeURIComponent(title || "");
  }
  qs += "&tm=" + unixNow();
  if (platform === "primevideo") {
    qs += "&lang=" + PREFERRED_AUDIO_LANG + "&hd=on&userhash=" + encodeURIComponent(cookie);
  }
  var originalUrl = NM_BASE + MOBILE_PATH[platform] + "/playlist.php" + qs;
  var proxiedUrl = PROXY_WORKER_URL + "/proxy?url=" + encodeURIComponent(originalUrl);
  console.log(PLUGIN_TAG + " [playlist] " + proxiedUrl);
  return fetch(proxiedUrl, {
    headers: Object.assign({}, APP_HEADERS, { "X-NM-Cookie": jar })
  }).then(function(res) {
    if (!res.ok)
      throw new Error("playlist HTTP " + res.status);
    return res.json();
  }).then(function(playlist) {
    if (!Array.isArray(playlist) || !playlist.length)
      return { sources: [], subtitles: [] };
    var sources = [], subtitles = [];
    playlist.forEach(function(item) {
      (item.sources || []).forEach(function(src) {
        var u = src.file || "";
        if (!u)
          return;
        if (u.startsWith("//"))
          u = "https:" + u;
        else if (u.startsWith("/"))
          u = NM_BASE + u;
        sources.push({ url: u, label: src.label || "", type: src.type || "application/x-mpegURL", isDefault: src.default === "true" });
      });
      (item.tracks || []).filter(function(t) {
        return t.kind === "captions";
      }).forEach(function(t) {
        var s = t.file || "";
        if (s.startsWith("//"))
          s = "https:" + s;
        else if (s.startsWith("/"))
          s = NM_BASE + s;
        if (s)
          subtitles.push({ url: s, language: t.label || "Unknown" });
      });
    });
    console.log(PLUGIN_TAG + " [playlist] " + sources.length + " src / " + subtitles.length + " subs");
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
    "Origin": NM_BASE,
    "Referer": NM_BASE + "/",
    "Accept": "*/*",
    "Accept-Encoding": "identity",
    "Connection": "keep-alive",
    "X-Requested-With": "app.netmirror.netmirrornew"
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
  return loadContent(hit.id, platform, cookie).then(function(content) {
    var raw = content.raw;
    var chain = Promise.resolve();
    if (raw.nextPageShow === 1 && raw.nextPageSeason) {
      chain = chain.then(function() {
        return fetchMoreEpisodes(hit.id, raw.nextPageSeason, platform, cookie, 2).then(function(more) {
          content.episodes = content.episodes.concat(more);
        });
      });
    }
    if (Array.isArray(raw.season) && raw.season.length > 1) {
      raw.season.slice(0, -1).forEach(function(s) {
        chain = chain.then(function() {
          return fetchMoreEpisodes(hit.id, s.id, platform, cookie, 1).then(function(more) {
            content.episodes = content.episodes.concat(more);
          });
        });
      });
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
      return getPlaylist(targetId, content.title || resolved.title, platform, cookie).then(function(playlist) {
        if (!playlist.sources.length)
          return null;
        var keep = playlist.sources.filter(function(s) {
          var lab = (s.label || "").toLowerCase();
          if (lab === "auto")
            return false;
          if (lab.includes("low") || lab.includes("480"))
            return false;
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
          return parseInt(b.name.match(/(\d+)p/) ? b.name.match(/(\d+)p/)[1] : 0) - parseInt(a.name.match(/(\d+)p/) ? a.name.match(/(\d+)p/)[1] : 0);
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
