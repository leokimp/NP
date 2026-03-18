"use strict";
var __async = (__this, __arguments, generator) => {
  return new Promise((resolve, reject) => {
    var fulfilled = (value) => {
      try {
        step(generator.next(value));
      } catch (e) {
        reject(e);
      }
    };
    var rejected = (value) => {
      try {
        step(generator.throw(value));
      } catch (e) {
        reject(e);
      }
    };
    var step = (x) => x.done ? resolve(x.value) : Promise.resolve(x.value).then(fulfilled, rejected);
    step((generator = generator.apply(__this, __arguments)).next());
  });
};
module.exports = {
  getStreams,
  clearAllCache,
  getCacheStats
};
var TMDB_API_KEY = "342c3872f1357c6e1da3a5ac1ccc3605";
var MAIN_URL = "https://hdhub4u.frl";
var PINGORA_API_URL = "https://search.pingora.fyi/collections/post/documents/search";
var DOMAINS_URL = "https://raw.githubusercontent.com/phisher98/TVVVV/refs/heads/main/domains.json";
var PROXY_WORKER_URL = "https://stream.leokimpese.workers.dev/";
var CACHE_API_BASE = "https://cache.leokimpese.workers.dev";
var WEBSTREAMR_BASE_URL = "https://webstreamr.hayd.uk/%7B%22gu%22%3A%22on%22%2C%22hi%22%3A%22on%22%2C%22mediaFlowProxyUrl%22%3A%22%22%2C%22mediaFlowProxyPassword%22%3A%22%22%2C%22disableExtractor_doodstream%22%3A%22on%22%2C%22disableExtractor_dropload%22%3A%22on%22%2C%22disableExtractor_fastream%22%3A%22on%22%2C%22disableExtractor_kinoger%22%3A%22on%22%2C%22disableExtractor_lulustream%22%3A%22on%22%2C%22disableExtractor_mixdrop%22%3A%22on%22%2C%22disableExtractor_savefiles%22%3A%22on%22%2C%22disableExtractor_streamembed%22%3A%22on%22%2C%22disableExtractor_streamtape%22%3A%22on%22%2C%22disableExtractor_streamup%22%3A%22on%22%2C%22disableExtractor_supervideo%22%3A%22on%22%2C%22disableExtractor_uqload%22%3A%22on%22%2C%22disableExtractor_vidora%22%3A%22on%22%2C%22disableExtractor_vidsrc%22%3A%22on%22%2C%22disableExtractor_vixsrc%22%3A%22on%22%2C%22disableExtractor_voe%22%3A%22on%22%2C%22disableExtractor_youtube%22%3A%22on%22%7D";
var ENABLE_GOOGLE_DRIVE_PROXY = true;
var DEFAULT_TTL = 3600;
var MIN_QUALITY = 1080;
var DISABLE_CACHE_FOR_TESTING = false;
var ALLOWED_LANGUAGES = ["hindi", "gujarati", "english"];
var BLOCKED_QUALITY_PATTERNS = [
  "360p",
  "480p",
  "576p",
  "720p",
  "cam",
  "camrip",
  "hdcam",
  "ts",
  "telesync",
  "tc",
  "telecine",
  "dvdscr",
  "screener",
  "r5",
  "r6"
];
var UA_POOL = [
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:132.0) Gecko/20100101 Firefox/132.0"
];
var _uaIdx = 0;
function nextUA() {
  return UA_POOL[_uaIdx++ % UA_POOL.length];
}
function buildHeaders(referer, origin) {
  var ua = nextUA();
  var chromeVer = "131";
  var isFirefox = ua.indexOf("Firefox") !== -1;
  var h = {
    "User-Agent": ua,
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
    // FIX MEDIUM-1: Accept-Encoding was missing — its absence flags as non-browser
    "Accept-Encoding": "gzip, deflate, br",
    // FIX MEDIUM-5: Sec-Fetch headers — all missing in original
    "Sec-Fetch-Dest": "document",
    "Sec-Fetch-Mode": "navigate",
    "Sec-Fetch-Site": referer ? "same-origin" : "none",
    "Sec-Fetch-User": "?1",
    "Cache-Control": "max-age=0",
    "Upgrade-Insecure-Requests": "1",
    "Connection": "keep-alive"
  };
  if (!isFirefox) {
    h["sec-ch-ua"] = '"Google Chrome";v="' + chromeVer + '", "Chromium";v="' + chromeVer + '", "Not_A Brand";v="24"';
    h["sec-ch-ua-mobile"] = "?0";
    h["sec-ch-ua-platform"] = '"Windows"';
  }
  if (referer) {
    h["Referer"] = referer;
    h["Origin"] = origin || new URL(referer).origin;
  } else {
    h["Referer"] = MAIN_URL + "/";
    h["Origin"] = MAIN_URL;
  }
  return h;
}
var _cookieJar = {};
function _cookieDomain(url) {
  try {
    return new URL(url).hostname;
  } catch (e) {
    return url;
  }
}
function _saveCookies(url, response) {
  var domain = _cookieDomain(url);
  var raw = "";
  try {
    raw = response.headers.get("set-cookie") || response.headers.get("Set-Cookie") || "";
  } catch (e) {
  }
  if (!raw)
    return;
  var parts = raw.split(",").map(function(c) {
    return c.trim().split(";")[0].trim();
  }).filter(Boolean);
  var existing = _cookieJar[domain] ? _cookieJar[domain].split("; ") : [];
  parts.forEach(function(nv) {
    var name = nv.split("=")[0];
    existing = existing.filter(function(e) {
      return e.split("=")[0] !== name;
    });
    existing.push(nv);
  });
  _cookieJar[domain] = existing.join("; ");
  if (_cookieJar[domain].indexOf("cf_clearance") !== -1) {
    console.log("[COOKIE] cf_clearance saved for", domain);
  }
}
function _getCookies(url) {
  return _cookieJar[_cookieDomain(url)] || "";
}
var sleep = function(ms) {
  return new Promise(function(r) {
    setTimeout(r, ms);
  });
};
function fetchWithTimeout(url, options, timeoutMs) {
  timeoutMs = timeoutMs || 15e3;
  if (typeof AbortController !== "undefined") {
    var ctrl = new AbortController();
    options = Object.assign({}, options, { signal: ctrl.signal });
  }
  var timer;
  var timeoutP = new Promise(function(_, reject) {
    timer = setTimeout(function() {
      if (typeof ctrl !== "undefined")
        ctrl.abort();
      reject(new Error("Timeout after " + timeoutMs + "ms"));
    }, timeoutMs);
  });
  return Promise.race([fetch(url, options), timeoutP]).then(
    function(res) {
      clearTimeout(timer);
      return res;
    },
    function(err) {
      clearTimeout(timer);
      throw err;
    }
  );
}
function _isCFChallenge(response, html) {
  var status = response.status;
  if (status === 403 || status === 503)
    return true;
  var cfMitigated = response.headers.get("cf-mitigated") || "";
  if (cfMitigated === "challenge")
    return true;
  if (html) {
    if (html.indexOf("Just a moment") !== -1)
      return true;
    if (html.indexOf("cf-browser-verification") !== -1)
      return true;
    if (html.indexOf("_cf_chl_opt") !== -1)
      return true;
    if (html.indexOf("Checking your browser") !== -1)
      return true;
  }
  return false;
}
function _jitteredSleep(attempt) {
  var base = 1200 * (attempt + 1);
  var jitter = Math.floor(Math.random() * 800);
  return sleep(base + jitter);
}
function fetchWithRetry(url, customHeaders, maxRetries) {
  return __async(this, null, function* () {
    customHeaders = customHeaders || {};
    maxRetries = maxRetries !== void 0 ? maxRetries : 2;
    for (var attempt = 0; attempt <= maxRetries; attempt++) {
      var headers = Object.assign({}, buildHeaders(customHeaders._referer, customHeaders._origin), customHeaders);
      delete headers._referer;
      delete headers._origin;
      var savedCookies = _getCookies(url);
      if (savedCookies)
        headers["Cookie"] = savedCookies;
      try {
        var response = yield fetchWithTimeout(url, { headers }, 15e3);
        _saveCookies(url, response);
        if (response.status === 429) {
          var retryAfter = parseInt(response.headers.get("retry-after") || "10", 10);
          console.log("[HTTP] 429 rate limited \u2014 waiting", retryAfter + "s for:", url.substring(0, 60));
          yield sleep(retryAfter * 1e3);
          continue;
        }
        if (response.status === 403 || response.status === 503) {
          var cfH = response.headers.get("cf-mitigated") || "";
          if (cfH === "challenge" || response.status === 503) {
            console.log("[CF] Challenge/block detected (status " + response.status + ") \u2014 attempt", attempt + 1);
            if (attempt < maxRetries) {
              yield _jitteredSleep(attempt);
              continue;
            }
            return response;
          }
        }
        if (!response.ok && attempt < maxRetries) {
          console.log("[HTTP] Retry", attempt + 1 + "/" + maxRetries, url.substring(0, 60));
          yield _jitteredSleep(attempt);
          continue;
        }
        return response;
      } catch (error) {
        if (attempt === maxRetries)
          throw error;
        console.log("[HTTP] Attempt", attempt + 1, "failed:", error.message);
        yield _jitteredSleep(attempt);
      }
    }
    throw new Error("Max retries reached: " + url);
  });
}
function fetchText(url, customHeaders) {
  return __async(this, null, function* () {
    try {
      var response = yield fetchWithRetry(url, customHeaders || {});
      var text = yield response.text();
      if (_isCFChallenge(response, text)) {
        console.log("[CF] HTML challenge page received for:", url.substring(0, 60));
        return "";
      }
      return text;
    } catch (err) {
      console.log("[HTTP] Text fetch error:", err.message);
      return "";
    }
  });
}
function fetchJSON(url, customHeaders) {
  return __async(this, null, function* () {
    try {
      var response = yield fetchWithRetry(url, customHeaders || {});
      return yield response.json();
    } catch (err) {
      console.log("[HTTP] JSON fetch error:", err.message);
      return null;
    }
  });
}
function fetchRedirectUrl(url, customHeaders) {
  return __async(this, null, function* () {
    try {
      var headers = Object.assign({}, buildHeaders(), customHeaders || {});
      var cookies = _getCookies(url);
      if (cookies)
        headers["Cookie"] = cookies;
      var response = yield fetchWithTimeout(url, { method: "HEAD", headers, redirect: "manual" }, 1e4);
      _saveCookies(url, response);
      var location = response.headers.get("hx-redirect") || response.headers.get("location") || response.headers.get("Location");
      if (!location)
        return null;
      if (location.startsWith("http"))
        return location;
      return new URL(url).origin + location;
    } catch (err) {
      console.log("[HTTP] Redirect fetch error:", err.message);
      return null;
    }
  });
}
var _domainLastUpdated = 0;
var _domainUpdateRunning = false;
var DOMAIN_UPDATE_INTERVAL = 36e5;
function setMainUrl(newUrl) {
  MAIN_URL = newUrl;
}
function triggerDomainUpdate() {
  var now = Date.now();
  if (now - _domainLastUpdated < DOMAIN_UPDATE_INTERVAL || _domainUpdateRunning)
    return;
  _domainUpdateRunning = true;
  _performDomainUpdate().then(function() {
    _domainUpdateRunning = false;
  }).catch(function(err) {
    console.log("[Domain] Background error:", err.message);
    _domainUpdateRunning = false;
  });
}
function _performDomainUpdate() {
  return __async(this, null, function* () {
    try {
      console.log("[Domain] Checking for new domain...");
      var response = yield fetch(DOMAINS_URL);
      var data = yield response.json();
      if (data && data.HDHUB4u && MAIN_URL !== data.HDHUB4u) {
        console.log("[Domain] Updated:", data.HDHUB4u);
        setMainUrl(data.HDHUB4u);
      } else {
        console.log("[Domain] Unchanged:", MAIN_URL);
      }
      _domainLastUpdated = Date.now();
    } catch (err) {
      console.log("[Domain] Error:", err.message);
    }
  });
}
function _cacheKey(tmdbId, mediaType, season, episode) {
  return tmdbId + "_" + mediaType + "_" + (season || "null") + "_" + (episode || "null");
}
function getCachedStreams(tmdbId, mediaType, season, episode) {
  return __async(this, null, function* () {
    var key = _cacheKey(tmdbId, mediaType, season, episode);
    try {
      console.log("[CACHE] Fetching:", key);
      var response = yield fetch(CACHE_API_BASE + "/" + key, {
        method: "GET",
        headers: { "Content-Type": "application/json" }
      });
      if (response.status === 404) {
        console.log("[CACHE] Miss:", key);
        return null;
      }
      if (!response.ok) {
        console.log("[CACHE] Error:", response.status);
        return null;
      }
      var data = yield response.json();
      if (!data || !data.streams || !Array.isArray(data.streams))
        return null;
      console.log("[CACHE] Hit:", key, "(" + data.streams.length + " streams)");
      return data.streams;
    } catch (err) {
      console.log("[CACHE] Fetch error:", err.message);
      return null;
    }
  });
}
function setCachedStreams(tmdbId, mediaType, season, episode, streams, ttl) {
  return __async(this, null, function* () {
    ttl = ttl || DEFAULT_TTL;
    var key = _cacheKey(tmdbId, mediaType, season, episode);
    try {
      var response = yield fetch(CACHE_API_BASE, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          key,
          streams,
          ttl,
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
        console.log("[CACHE] Save failed:", response.status);
        return false;
      }
      console.log("[CACHE] Saved:", key);
      return true;
    } catch (err) {
      console.log("[CACHE] Save error:", err.message);
      return false;
    }
  });
}
function clearAllCache() {
  return __async(this, null, function* () {
    try {
      var response = yield fetch(CACHE_API_BASE + "/clearall", { method: "POST" });
      if (response.ok) {
        console.log("[CACHE] All cleared");
        return true;
      }
      console.log("[CACHE] Clear failed:", response.status);
      return false;
    } catch (err) {
      console.log("[CACHE] Clear error:", err.message);
      return false;
    }
  });
}
function getCacheStats() {
  return __async(this, null, function* () {
    try {
      var response = yield fetch(CACHE_API_BASE + "/stats", { method: "GET" });
      if (!response.ok)
        return { totalEntries: 0, totalSize: 0 };
      return yield response.json();
    } catch (err) {
      return { totalEntries: 0, totalSize: 0, error: err.message };
    }
  });
}
var B64_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";
function rot13(str) {
  return str.replace(/[a-zA-Z]/g, function(ch) {
    var base = ch <= "Z" ? 65 : 97;
    return String.fromCharCode((ch.charCodeAt(0) - base + 13) % 26 + base);
  });
}
function safeAtob(input) {
  var str = String(input).replace(/[=]+$/, "");
  if (str.length % 4 === 1)
    return input;
  var output = "", bc = 0, bs = 0, i = 0;
  while (i < str.length) {
    var ch = str[i++];
    var idx = B64_CHARS.indexOf(ch);
    if (idx === -1)
      continue;
    bs = bc % 4 ? bs * 64 + idx : idx;
    if (bc++ % 4) {
      output += String.fromCharCode(255 & bs >> (-2 * bc & 6));
    }
  }
  return output;
}
function safeBtoa(input) {
  var str = String(input), output = "";
  for (var block = 0, charCode, i = 0, map = B64_CHARS; str.charAt(i | 0) || (map = "=", i % 1); output += map.charAt(63 & block >> 8 - i % 1 * 8)) {
    charCode = str.charCodeAt(i += 3 / 4);
    if (charCode > 255)
      return input;
    block = block << 8 | charCode;
  }
  return output;
}
function seqRatio(a, b) {
  if (!a || !b)
    return 0;
  var la = a.length, lb = b.length;
  if (la === 0 && lb === 0)
    return 1;
  var dp = [];
  for (var ii = 0; ii <= la; ii++) {
    dp[ii] = [];
    for (var jj = 0; jj <= lb; jj++)
      dp[ii][jj] = 0;
  }
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
  var union = new Set([].concat(Array.from(sa), Array.from(sb))).size;
  return union === 0 ? 0 : inter / union;
}
function calcTitleSim(query, candidate) {
  var norm = function(s) {
    return s.replace(/&amp;/gi, "&").toLowerCase().replace(/\s*&\s*/g, " and ").replace(/[^a-z0-9\s]/g, "").replace(/\s+/g, " ").trim();
  };
  var q = norm(query), c = norm(candidate);
  if (!q || !c)
    return 0;
  if (c.indexOf(q) !== -1)
    return 0.95;
  return Math.max(seqRatio(q, c), jaccardWords(q, c));
}
function parseSize(str) {
  if (!str)
    return 0;
  var match = str.match(/([\d.]+)\s*(GB|MB|KB|TB)/i);
  if (!match)
    return 0;
  var value = parseFloat(match[1]);
  var unit = match[2].toUpperCase();
  var m = { KB: 1024, MB: 1024 * 1024, GB: 1024 * 1024 * 1024, TB: 1024 * 1024 * 1024 * 1024 };
  return value * (m[unit] || 0);
}
function parseSizeToBytes(sizeStr) {
  if (!sizeStr)
    return 0;
  var match = sizeStr.match(/([\d.]+)\s*(GB|MB|KB|B)/i);
  if (!match)
    return 0;
  var value = parseFloat(match[1]);
  var unit = match[2].toUpperCase();
  var m = { B: 1, KB: 1024, MB: 1024 * 1024, GB: 1024 * 1024 * 1024 };
  return value * (m[unit] || 0);
}
function formatBytes(bytes) {
  if (!bytes || bytes === 0)
    return "Unknown";
  var k = 1024;
  var sizes = ["Bytes", "KB", "MB", "GB", "TB"];
  var i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}
function extractText(html) {
  return html.replace(/<[^>]*>/g, "").trim();
}
function extractAllLinks(html) {
  var links = [];
  var regex = new RegExp(`<a[^>]*href=["']([^"']*)["'][^>]*>(.*?)<\\/a>`, "gis");
  var match;
  while ((match = regex.exec(html)) !== null) {
    links.push({ href: match[1], text: extractText(match[2]) });
  }
  return links;
}
function episodeSuffix(season, episode) {
  if (!season || !episode)
    return "";
  var s = String(season).padStart(2, "0");
  var e = String(episode).padStart(2, "0");
  return "S" + s + "E" + e;
}
function shouldProxyUrl(url) {
  if (!ENABLE_GOOGLE_DRIVE_PROXY || !url)
    return false;
  return ["video-downloads.googleusercontent.com", "drive.google.com/uc", "docs.google.com/uc"].some(function(p) {
    return url.indexOf(p) !== -1;
  });
}
function transformToProxyUrl(url) {
  if (!shouldProxyUrl(url))
    return url;
  try {
    return PROXY_WORKER_URL + "?l=" + url;
  } catch (e) {
    return url;
  }
}
function deduplicateByUrl(streams) {
  var seen = /* @__PURE__ */ new Set();
  return streams.filter(function(s) {
    if (seen.has(s.url))
      return false;
    seen.add(s.url);
    return true;
  });
}
function sortAndNumberStreams(streams) {
  var qOrder = { "2160p": 10, "4k": 10, "1080p": 8 };
  var sorted = streams.slice().sort(function(a, b) {
    var ak = (a.name || "").toLowerCase().replace(/\./g, "").replace(/^\d+\s*/, "").trim();
    var bk = (b.name || "").toLowerCase().replace(/\./g, "").replace(/^\d+\s*/, "").trim();
    var diff = (qOrder[bk] || 0) - (qOrder[ak] || 0);
    if (diff !== 0)
      return diff;
    return parseSizeToBytes(b.size) - parseSizeToBytes(a.size);
  });
  return sorted.map(function(s, i) {
    return Object.assign({}, s, { name: i + 1 + ". " + s.name });
  });
}
function extractQuality(streamName) {
  var lower = streamName.toLowerCase();
  var m = lower.match(/(\d{3,4})p/);
  if (m)
    return parseInt(m[1], 10);
  if (lower.indexOf("2160p") !== -1 || lower.indexOf("4k") !== -1 || lower.indexOf("uhd") !== -1)
    return 2160;
  if (lower.indexOf("1080p") !== -1 || lower.indexOf("fhd") !== -1)
    return 1080;
  return 0;
}
function hasBlockedQuality(streamName) {
  for (var i = 0; i < BLOCKED_QUALITY_PATTERNS.length; i++) {
    if (new RegExp("\\b" + BLOCKED_QUALITY_PATTERNS[i] + "\\b", "i").test(streamName))
      return true;
  }
  var q = extractQuality(streamName);
  return q > 0 && q < MIN_QUALITY;
}
function shouldFilterStream(stream) {
  var name = (stream.name || "").toLowerCase();
  var title = (stream.title || "").toLowerCase();
  var combined = name + " " + title;
  var bingeGroup = (stream.behaviorHints && stream.behaviorHints.bingeGroup || "").toLowerCase();
  if (hasBlockedQuality(combined))
    return true;
  var BLOCKED_LANGS = ["telugu", "tamil", "kannada", "malayalam"];
  var ALLOWED_BINGE_CODES = ["_hi", "_gu", "_en"];
  var titleHasBlocked = BLOCKED_LANGS.some(function(l) {
    return title.indexOf(l) !== -1;
  });
  var titleHasAllowed = ALLOWED_LANGUAGES.some(function(l) {
    return title.indexOf(l) !== -1;
  });
  if (titleHasBlocked || titleHasAllowed) {
    if (titleHasBlocked && !titleHasAllowed)
      return true;
  } else {
    var codes = bingeGroup.match(/_([a-z]{2})(?=_|$)/g) || [];
    if (codes.length > 0) {
      var last = codes[codes.length - 1];
      var isDupe = codes.filter(function(c) {
        return c === last;
      }).length > 1;
      if (isDupe && ALLOWED_BINGE_CODES.indexOf(last) === -1)
        return true;
    }
    var hasAllowed = ALLOWED_BINGE_CODES.some(function(c) {
      return bingeGroup.indexOf(c) !== -1;
    });
    if (!hasAllowed)
      return true;
  }
  var q = extractQuality(combined);
  return q < MIN_QUALITY;
}
function cleanStreamMetadata(streams) {
  return streams.map(function(stream) {
    var name = stream.name || "";
    var title = stream.title || "";
    var qm = title.match(/(\d{3,4}p|4k|uhd)/i);
    var cleanName = qm ? qm[1].toLowerCase() : name.match(/\d{3,4}p/i) ? name.match(/\d{3,4}p/i)[0].toLowerCase() : "HD";
    var ym = title.match(/\b(19|20)\d{2}\b/);
    var year = ym ? ym[0] : "";
    var lm = title.match(/hindi|gujarati|english/i);
    var lang = lm ? lm[0].charAt(0).toUpperCase() + lm[0].slice(1).toLowerCase() : "Multi";
    var nm = title.match(/^(.*?)(?=\s*\d{3,4}p|\s*4k|\s*uhd|\s*\b(19|20)\d{2}\b|\n)/i);
    var movieName = nm ? nm[1].replace(/[._]/g, " ").replace(/[()]/g, "").trim() : title.split("\n")[0].trim();
    var cleanTitle = (movieName + "  " + year + "  " + lang).replace(/\s+/g, " ").trim();
    var sm = title.match(/(\d+(?:\.\d+)?\s*[GM]B)/i);
    return Object.assign({}, stream, { name: cleanName, title: cleanTitle, size: sm ? sm[1] : "" });
  });
}
function webstreamrExtractor(imdbId, mediaType, season, episode) {
  return __async(this, null, function* () {
    if (!imdbId)
      return [];
    try {
      var endpoint;
      if (mediaType === "movie") {
        endpoint = "/stream/movie/" + imdbId + ".json";
      } else if (mediaType === "tv" && season && episode) {
        endpoint = "/stream/series/" + imdbId + ":" + season + ":" + episode + ".json";
      } else {
        return [];
      }
      var url = WEBSTREAMR_BASE_URL + endpoint;
      console.log("[WEBSTREAMR] Fetching:", url);
      var response = yield fetchWithRetry(url);
      var data = yield response.json();
      if (!data || !data.streams || !Array.isArray(data.streams)) {
        console.log("[WEBSTREAMR] No streams");
        return [];
      }
      console.log("[WEBSTREAMR] Raw count:", data.streams.length);
      var filtered = data.streams.filter(function(s) {
        return !shouldFilterStream(s);
      });
      console.log("[WEBSTREAMR] After filter:", filtered.length);
      if (!filtered.length)
        return [];
      var cleaned = cleanStreamMetadata(filtered);
      return cleaned.map(function(s) {
        return {
          source: "WebStreamr",
          quality: (s.name || "Unknown") + ".",
          url: s.url,
          size: s.behaviorHints && s.behaviorHints.videoSize || 0,
          filename: s.title,
          sizeText: s.size || ""
        };
      });
    } catch (err) {
      console.log("[WEBSTREAMR] Error:", err.message);
      return [];
    }
  });
}
var AD_DOMAINS = ["bonuscaf.com", "urbanheadline.com", "propellerads", "adsterra", "popads", "popcash", "blogspot.com"];
function isDirectLink(url) {
  return [
    /^https?:\/\/pixeldrain\.com\/api\/file\/.*\?download/i,
    /^https?:\/\/([a-z0-9-]+\.)*video-downloads\.googleusercontent\.com/i,
    /^https?:\/\/drive\.google\.com\/uc\?/i,
    /^https?:\/\/docs\.google\.com.*export/i
  ].some(function(p) {
    return p.test(url);
  });
}
function isRedirectLink(url) {
  return [
    /dl\.php\?link=/i,
    /https?:\/\/[a-z0-9-]+\.hubcdn\.fans\/\?id=/i,
    /https?:\/\/[a-z0-9-]+\.rohitkiskk\.workers\.dev/i,
    /\/go\//i,
    /redirect/i
  ].some(function(p) {
    return p.test(url);
  });
}
function verifyStreamUrl(url) {
  return __async(this, null, function* () {
    if (!url || !url.startsWith("http"))
      return false;
    try {
      var opts = { method: "HEAD", headers: buildHeaders(), redirect: "follow" };
      var cookies = _getCookies(url);
      if (cookies)
        opts.headers["Cookie"] = cookies;
      var res = yield fetchWithTimeout(url, opts, 8e3);
      _saveCookies(url, res);
      if (!res.ok) {
        console.log("[VERIFY] Non-OK:", res.status, url.substring(0, 60));
        return false;
      }
      var ct = res.headers.get("content-type") || "";
      var valid = ct.indexOf("video/") !== -1 || ct.indexOf("application/octet-stream") !== -1 || ct.indexOf("application/x-matroska") !== -1 || ct.indexOf("application/mp4") !== -1;
      console.log("[VERIFY]", valid ? "\u2705" : "\u274C", ct, url.substring(0, 60));
      return valid;
    } catch (err) {
      console.log("[VERIFY] Error:", err.message, url.substring(0, 60));
      return false;
    }
  });
}
function getRedirectLinks(url) {
  return __async(this, null, function* () {
    console.log("[REDIRECT] Processing:", url);
    try {
      var doc = yield fetchText(url);
      var regex = /s\('o','([A-Za-z0-9+\/=]+)'|ck\('_wp_http_\d+','([^']+)'/g;
      var combined = "", match;
      while ((match = regex.exec(doc)) !== null) {
        var val = match[1] || match[2];
        if (val)
          combined += val;
      }
      if (!combined)
        return url;
      var decoded = safeAtob(rot13(safeAtob(safeAtob(combined))));
      var jsonObj = JSON.parse(decoded);
      var encoded = safeAtob(jsonObj.o || "").trim();
      if (encoded) {
        console.log("[REDIRECT] Decoded URL:", encoded);
        return isRedirectLink(encoded) ? resolveRedirectChain(encoded) : encoded;
      }
      var data = safeBtoa(jsonObj.data || "").trim();
      var wpHttp = (jsonObj.blog_url || "").trim();
      if (wpHttp && data) {
        var html = yield fetchText(wpHttp + "?re=" + data);
        var final = extractText(html);
        console.log("[REDIRECT] Final URL:", final);
        return isRedirectLink(final) ? resolveRedirectChain(final) : final;
      }
      return url;
    } catch (err) {
      console.log("[REDIRECT] Error:", err.message);
      return url;
    }
  });
}
function resolveRedirectChain(url, maxHops) {
  return __async(this, null, function* () {
    maxHops = maxHops || 10;
    console.log("[RESOLVE] Starting:", url);
    var current = url;
    for (var hop = 0; hop < maxHops; hop++) {
      console.log("[RESOLVE] Hop", hop + 1, current.substring(0, 80));
      if (current.indexOf("pixel.hubcdn.fans") !== -1) {
        current = current.replace("pixel.hubcdn.fans", "gpdl.hubcdn.fans");
      }
      if (current.indexOf("dl.php?link=") !== -1) {
        try {
          var t = new URL(current).searchParams.get("link");
          if (t && t.startsWith("http")) {
            current = decodeURIComponent(t);
            continue;
          }
        } catch (e) {
        }
      }
      if (isDirectLink(current)) {
        console.log("[RESOLVE] Direct link \u2713");
        return current;
      }
      try {
        var headers = buildHeaders(current, null);
        var cookies = _getCookies(current);
        if (cookies)
          headers["Cookie"] = cookies;
        var response = yield fetchWithTimeout(current, { method: "GET", headers, redirect: "manual" }, 12e3);
        _saveCookies(current, response);
        var location = response.headers.get("location");
        if (location) {
          current = location.startsWith("http") ? location : new URL(location, current).toString();
          hop++;
          continue;
        }
        var ct = response.headers.get("content-type") || "";
        if (ct.indexOf("video/") !== -1 || ct.indexOf("application/octet-stream") !== -1 || ct.indexOf("application/x-matroska") !== -1) {
          console.log("[RESOLVE] Direct file download");
          return current;
        }
        if (ct.indexOf("text/html") !== -1) {
          var html = yield response.text();
          if (_isCFChallenge(response, html)) {
            console.log("[RESOLVE] CF challenge at hop", hop, "\u2014 returning null");
            return null;
          }
          var encRegex = /s\('o','([A-Za-z0-9+\/=]+)'|ck\('_wp_http_\d+','([^']+)'/g;
          var encCombined = "", encMatch;
          while ((encMatch = encRegex.exec(html)) !== null) {
            var ev = encMatch[1] || encMatch[2];
            if (ev)
              encCombined += ev;
          }
          if (encCombined) {
            try {
              var dec = safeAtob(rot13(safeAtob(safeAtob(encCombined))));
              var jobj = JSON.parse(dec);
              var eUrl = safeAtob(jobj.o || "").trim();
              if (eUrl) {
                current = eUrl;
                hop++;
                continue;
              }
            } catch (e) {
              console.log("[RESOLVE] Decode error:", e.message);
            }
          }
          var JS_PATS = [
            /https?:\/\/video-downloads\.googleusercontent\.com\/[^\s"'<>)]+/,
            /https?:\/\/[^\s"'<>]+pixeldrain\.com[^\s"'<>]+/,
            /https?:\/\/drive\.google\.com[^\s"'<>]+/,
            /var\s+(?:download_?url|file_?url|link)\s*=\s*["']([^"']+)["']/i,
            /location\.href\s*=\s*["']([^"']+)["']/i,
            /window\.open\(["']([^"']+)["']/i
          ];
          for (var pi = 0; pi < JS_PATS.length; pi++) {
            var pm = html.match(JS_PATS[pi]);
            if (pm) {
              var found = pm[1] || pm[0];
              if (found && found.startsWith("http")) {
                current = found;
                hop++;
                break;
              }
            }
          }
          var DIRECT_PATS = [
            /https?:\/\/video-downloads\.googleusercontent\.com\/[^\s"'<>)]+/,
            /https?:\/\/pixeldrain\.com\/api\/file\/[^\s"'<>]+/,
            /https?:\/\/drive\.google\.com\/uc\?[^\s"'<>]+/
          ];
          for (var di = 0; di < DIRECT_PATS.length; di++) {
            var dm = html.match(DIRECT_PATS[di]);
            if (dm) {
              console.log("[RESOLVE] Direct URL in HTML");
              return dm[0];
            }
          }
          var linkRx = /<a[^>]*href=["']([^"']*)["'][^>]*>([^<]*)</gi;
          var lm;
          while ((lm = linkRx.exec(html)) !== null) {
            var href = lm[1], text = lm[2];
            if (!href || !href.startsWith("http"))
              continue;
            if (/telegram|zipdisk|ads/i.test(text))
              continue;
            if (href.indexOf("dl.php?link=") !== -1 && href === current)
              continue;
            if (/download|get file|click here|direct link|server/i.test(text)) {
              if (isDirectLink(href))
                return href;
              current = href;
              hop++;
              break;
            }
          }
          var metaM = html.match(/<meta[^>]*http-equiv=["']refresh["'][^>]*content=["'][^"']*url=([^"'\s]+)/i);
          if (metaM && metaM[1]) {
            current = metaM[1];
            hop++;
            continue;
          }
          var jsM = html.match(/(?:window\.location|location\.href)\s*=\s*["']([^"']+)["']/);
          if (jsM) {
            var jsUrl = jsM[1];
            if (!AD_DOMAINS.some(function(d) {
              return jsUrl.indexOf(d) !== -1;
            })) {
              current = jsUrl;
              hop++;
              continue;
            }
          }
          console.log("[RESOLVE] No more redirects");
          if (isRedirectLink(current))
            return null;
          return (yield verifyStreamUrl(current)) ? current : null;
        }
        return (yield verifyStreamUrl(current)) ? current : null;
      } catch (err) {
        console.log("[RESOLVE] Fetch error:", err.message);
        return null;
      }
    }
    console.log("[RESOLVE] Max hops reached");
    if (isRedirectLink(current))
      return null;
    return (yield verifyStreamUrl(current)) ? current : null;
  });
}
function pixelDrainExtractor(url) {
  return __async(this, null, function* () {
    console.log("[PIXELDRAIN] Extracting:", url);
    var match = url.match(/(?:file|u)\/([A-Za-z0-9]+)/);
    var fileId = match ? match[1] : url.split("/").pop();
    if (!fileId)
      return [];
    try {
      var info = yield fetchJSON("https://pixeldrain.com/api/file/" + fileId + "/info");
      if (!info)
        return [];
      var qm = info.name ? info.name.match(/(\d{3,4})p/) : null;
      return [{
        source: "Pixeldrain",
        quality: qm ? qm[0] : "Unknown",
        url: "https://pixeldrain.com/api/file/" + fileId + "?download",
        size: info.size || 0,
        filename: info.name
      }];
    } catch (err) {
      console.log("[PIXELDRAIN] Error:", err.message);
      return [];
    }
  });
}
function hubCloudExtractor(url, referer) {
  return __async(this, null, function* () {
    console.log("[HUBCLOUD] Extracting:", url);
    var currentUrl = url.replace("hubcloud.ink", "hubcloud.dad");
    try {
      var html = yield fetchText(currentUrl, { _referer: referer || MAIN_URL });
      if (!currentUrl.includes("hubcloud.php")) {
        var scriptMatch = html.match(/var url = '([^']*)'/);
        if (scriptMatch && scriptMatch[1]) {
          currentUrl = scriptMatch[1];
          console.log("[HUBCLOUD] Following script URL:", currentUrl);
          html = yield fetchText(currentUrl, { _referer: url });
        }
      }
      var sizeMatch = html.match(/<i[^>]*id=["']size["'][^>]*>([^<]*)<\/i>/i);
      var sizeBytes = parseSize(sizeMatch ? sizeMatch[1].trim() : "");
      var headerMatch = html.match(/<div[^>]*class=["'][^"']*card-header[^"']*["'][^>]*>([^<]*)<\/div>/i);
      var header = headerMatch ? headerMatch[1].trim() : "";
      var qm = header.match(/(\d{3,4})p/);
      var quality = qm ? qm[0] : "Unknown";
      console.log("[HUBCLOUD] Quality:", quality, "Size:", sizeBytes);
      var links = extractAllLinks(html);
      var results = [];
      for (var i = 0; i < links.length; i++) {
        var text = links[i].text;
        var href = links[i].href;
        if (/ZipDisk|Telegram/i.test(text))
          continue;
        if (isRedirectLink(href))
          href = (yield resolveRedirectChain(href)) || "";
        if (/Download File|FSL|S3|10Gbps/i.test(text)) {
          if (href && (yield verifyStreamUrl(href)))
            results.push({ source: "HubCloud [" + text + "]", quality, url: href, size: sizeBytes });
        } else if (/BuzzServer/i.test(text)) {
          var final = yield fetchRedirectUrl(href + "/download", { _referer: href });
          if (final && (yield verifyStreamUrl(final)))
            results.push({ source: "HubCloud [BuzzServer]", quality, url: final, size: sizeBytes });
        } else if (href.indexOf("pixeldra") !== -1) {
          var pd = yield pixelDrainExtractor(href);
          if (pd[0] && (yield verifyStreamUrl(pd[0].url)))
            results.push(pd[0]);
        } else if (/download|server|link/i.test(text)) {
          if (href && (yield verifyStreamUrl(href)))
            results.push({ source: "HubCloud [" + text + "]", quality, url: href, size: sizeBytes });
        }
      }
      console.log("[HUBCLOUD] Extracted", results.length, "streams");
      return results;
    } catch (err) {
      console.log("[HUBCLOUD] Error:", err.message);
      return [];
    }
  });
}
function hubDriveExtractor(url, referer) {
  return __async(this, null, function* () {
    console.log("[HUBDRIVE] Extracting:", url);
    try {
      var html = yield fetchText(url, { _referer: referer || MAIN_URL });
      var m = html.match(new RegExp(`<a[^>]*href=["']([^"']*hubcloud[^"']*)["'][^>]*>.*?\\[HubCloud Server\\]`, "is"));
      if (!m || !m[1]) {
        console.log("[HUBDRIVE] No HubCloud link");
        return [];
      }
      return yield hubCloudExtractor(m[1], url);
    } catch (err) {
      console.log("[HUBDRIVE] Error:", err.message);
      return [];
    }
  });
}
function hubCdnExtractor(url, referer) {
  return __async(this, null, function* () {
    console.log("[HUBCDN] Extracting:", url);
    try {
      var html = yield fetchText(url, { _referer: referer || MAIN_URL });
      var sm = html.match(/<i[^>]*id=["']size["'][^>]*>([^<]*)<\/i>/i);
      var sizeBytes = parseSize(sm ? sm[1].trim() : "");
      var qm = html.match(/(\d{3,4})p/);
      var quality = qm ? qm[0] : "Unknown";
      var links = extractAllLinks(html);
      var results = [];
      for (var i = 0; i < links.length; i++) {
        var text = links[i].text;
        var href = links[i].href;
        if (/Telegram|ZipDisk/i.test(text))
          continue;
        if (!/Download|Server/i.test(text))
          continue;
        if (isRedirectLink(href))
          href = (yield resolveRedirectChain(href)) || "";
        if (href && (yield verifyStreamUrl(href)))
          results.push({ source: "HubCdn", quality, url: href, size: sizeBytes });
      }
      console.log("[HUBCDN] Extracted", results.length, "streams");
      return results;
    } catch (err) {
      console.log("[HUBCDN] Error:", err.message);
      return [];
    }
  });
}
function hubstreamExtractor(url, referer) {
  return __async(this, null, function* () {
    console.log("[HUBSTREAM] Extracting:", url);
    try {
      var html = yield fetchText(url, { _referer: referer || MAIN_URL });
      var qm = html.match(/(\d{3,4})p/);
      var quality = qm ? qm[0] : "Unknown";
      var dlRegex = new RegExp(`<a[^>]*href=["']([^"']*)["'][^>]*>.*?(?:Download|Server|Direct)`, "gis");
      var results = [], match;
      while ((match = dlRegex.exec(html)) !== null) {
        var href = match[1];
        if (!href || !href.startsWith("http"))
          continue;
        if (isRedirectLink(href))
          href = (yield resolveRedirectChain(href)) || "";
        if (href && (yield verifyStreamUrl(href)))
          results.push({ source: "Hubstream", quality, url: href, size: 0 });
      }
      console.log("[HUBSTREAM] Extracted", results.length, "streams");
      return results;
    } catch (err) {
      console.log("[HUBSTREAM] Error:", err.message);
      return [];
    }
  });
}
function loadExtractor(url, referer) {
  return __async(this, null, function* () {
    if (!url)
      return [];
    referer = referer || MAIN_URL;
    console.log("[EXTRACTOR] Processing:", url.substring(0, 80));
    try {
      var hostname = new URL(url).hostname.toLowerCase();
      if (url.indexOf("?id=") !== -1 || hostname.indexOf("techyboy") !== -1 || hostname.indexOf("gdtot") !== -1) {
        var resolved = yield getRedirectLinks(url);
        if (resolved && resolved !== url)
          return loadExtractor(resolved, url);
        return [];
      }
      if (hostname.indexOf("hubcloud") !== -1)
        return hubCloudExtractor(url, referer);
      if (hostname.indexOf("hubcdn") !== -1)
        return hubCdnExtractor(url, referer);
      if (hostname.indexOf("hubdrive") !== -1)
        return hubDriveExtractor(url, referer);
      if (hostname.indexOf("pixeldrain") !== -1)
        return pixelDrainExtractor(url);
      if (hostname.indexOf("hubstream") !== -1)
        return hubstreamExtractor(url, referer);
      if (hostname.indexOf("hblinks") !== -1) {
        var response = yield fetchWithRetry(url, { _referer: referer });
        var html = yield response.text();
        var lx = /<a[^>]*href=["']([^"']*)["'][^>]*>/gi;
        var links = [], lm;
        while ((lm = lx.exec(html)) !== null) {
          var href = lm[1];
          if (!href || !href.startsWith("http"))
            continue;
          if (href.indexOf("hblinks.dad") !== -1 && href.indexOf("/archives/") === -1)
            continue;
          links.push(href);
        }
        console.log("[HBLINKS]", links.length, "links found");
        return extractLinksInBatches(links, url);
      }
      console.log("[EXTRACTOR] No matching extractor for:", hostname);
      return [];
    } catch (err) {
      console.log("[EXTRACTOR] Error:", err.message);
      return [];
    }
  });
}
var BATCH_SIZE = 3;
function extractLinksInBatches(links, referer) {
  return __async(this, null, function* () {
    var all = [];
    for (var i = 0; i < links.length; i += BATCH_SIZE) {
      var batch = links.slice(i, i + BATCH_SIZE);
      var results = yield Promise.all(batch.map(function(l) {
        return loadExtractor(l, referer).catch(function() {
          return [];
        });
      }));
      all = all.concat(results.reduce(function(a, r) {
        return a.concat(r);
      }, []));
      if (i + BATCH_SIZE < links.length) {
        yield sleep(300 + Math.floor(Math.random() * 400));
      }
    }
    return all;
  });
}
function performSingleSearch(query) {
  return __async(this, null, function* () {
    var cleanQuery = query.replace(/Season \d+/i, "").trim();
    var params = new URLSearchParams({
      q: cleanQuery,
      query_by: "post_title",
      sort_by: "sort_by_date:desc"
    });
    try {
      var response = yield fetchWithRetry(PINGORA_API_URL + "?" + params.toString());
      var ct = response.headers.get("content-type") || "";
      if (ct.indexOf("application/json") !== -1) {
        var data = yield response.json();
        console.log("[Search] Pingora hits for", query, ":", (data.hits || []).length);
        if (data.hits && data.hits.length > 0) {
          return data.hits.map(function(hit) {
            return {
              title: hit.document.post_title,
              url: MAIN_URL + hit.document.permalink,
              source: "Pingora",
              searchedTitle: query
            };
          });
        }
      } else {
        console.log("[Search] Pingora non-JSON (" + response.status + ") \u2014 falling back");
      }
    } catch (err) {
      console.log("[Search] Pingora error for", query, ":", err.message);
    }
    try {
      console.log("[Search] Native fallback for:", cleanQuery);
      var nativeRes = yield fetchWithRetry(MAIN_URL + "/?s=" + encodeURIComponent(cleanQuery));
      var html = yield nativeRes.text();
      var articles = html.match(new RegExp("<article[^>]*>.*?<\\/article>", "gis")) || [];
      console.log("[Search] Native articles:", articles.length);
      var results = [];
      articles.forEach(function(article) {
        var m = article.match(/<a[^>]*href=["']([^"']*)["'][^>]*>(.*?)<\/a>/i);
        if (!m)
          return;
        var url = m[1];
        var title = m[2].replace(/<[^>]*>/g, "").trim();
        if (url && title)
          results.push({ title, url, source: "Native", searchedTitle: query });
      });
      return results;
    } catch (err) {
      console.log("[Search] Native error for", query, ":", err.message);
      return [];
    }
  });
}
function performParallelSearch(queries, year) {
  return __async(this, null, function* () {
    console.log("[Search] Queue:", queries);
    var allResults = yield Promise.all(queries.map(performSingleSearch));
    var scored = [];
    for (var i = 0; i < allResults.length; i++) {
      allResults[i].forEach(function(r) {
        var ts = calcTitleSim(queries[i], r.title);
        if (ts < 0.62)
          return;
        var rank = ts;
        if (year) {
          var ry = (r.title.match(/\b(19|20)\d{2}\b/) || [])[0];
          if (ry) {
            var delta = Math.abs(parseInt(year, 10) - parseInt(ry, 10));
            if (delta === 0)
              rank = Math.min(1, rank + 0.1);
            else if (delta > 3)
              rank *= 0.7;
          }
        }
        if (rank < 0.62)
          return;
        scored.push(Object.assign({}, r, { titleScore: ts, rankScore: rank, usedQuery: queries[i] }));
      });
    }
    if (!scored.length)
      return { results: [], usedTitle: "" };
    scored.sort(function(a, b) {
      return b.rankScore - a.rankScore;
    });
    var seen = /* @__PURE__ */ new Set();
    var unique = scored.filter(function(r) {
      if (seen.has(r.url))
        return false;
      seen.add(r.url);
      return true;
    });
    return { results: unique, usedTitle: unique[0].usedQuery };
  });
}
function isValidStreamLink(href, rawText) {
  if (!href)
    return false;
  var hL = href.toLowerCase();
  var t = (rawText || "").replace(/<[^>]+>/g, "").trim().toLowerCase();
  if (hL.startsWith("/") || hL.startsWith("#"))
    return false;
  if (hL.indexOf("hdhub4u") !== -1 || hL.indexOf("4khdhub") !== -1)
    return false;
  if (hL.indexOf("discord") !== -1 || hL.indexOf("themoviedb.org") !== -1 || hL.indexOf("imdb.com") !== -1)
    return false;
  if (hL.indexOf("{{") !== -1 || hL.indexOf("cdn-cgi") !== -1)
    return false;
  if (t.indexOf("watch") !== -1 || t.indexOf("pack") !== -1)
    return false;
  if (t.indexOf("480p") !== -1 || t.indexOf("720p") !== -1 || t === "")
    return false;
  return true;
}
function extractLinksWithMetadata(html, mediaType, season, episode) {
  var result = [];
  if (mediaType === "movie") {
    var rx = new RegExp(`<a[^>]*href=["']([^"']*)["'][^>]*>(.*?)<\\/a>`, "gis"), m;
    while ((m = rx.exec(html)) !== null) {
      if (isValidStreamLink(m[1], m[2]))
        result.push({ url: m[1], requiresQualityCheck: false, preFilteredQuality: true });
    }
  } else if (mediaType === "tv" && season && episode) {
    var targetEp = parseInt(episode, 10);
    var nextEp = targetEp + 1;
    var startRx = new RegExp("<(?:h[1-6]|strong|span|a)[^>]*>\\s*(?:Episode|Ep|E|EPiSODE)\\s*0?" + targetEp + "\\b", "i");
    var nextRx = new RegExp("<(?:h[1-6]|strong|span|a)[^>]*>\\s*(?:Episode|Ep|E|EPiSODE)\\s*0?" + nextEp + "\\b", "i");
    var startM = html.match(startRx);
    if (!startM)
      return _dedup(result);
    var startIdx = startM.index;
    var nextM = html.substring(startIdx + 10).match(nextRx);
    var endIdx = nextM ? startIdx + 10 + nextM.index : startIdx + 6e3;
    var slice = html.substring(startIdx, endIdx);
    console.log("[TV] Episode", targetEp, "slice:", slice.length, "chars");
    if (/\b(1080p|2160p|4k|uhd|720p|480p)\b/i.test(slice)) {
      console.log("[TV] Quality labels in block \u2014 filtering at HTML stage");
      var qRx = /\b(720p|480p|360p|1080p|2160p|4k|uhd)\b/gi;
      var markers = [], qm;
      qRx.lastIndex = 0;
      while ((qm = qRx.exec(slice)) !== null) {
        markers.push({
          quality: qm[1].toLowerCase(),
          index: qm.index,
          isHQ: /1080p|2160p|4k|uhd/i.test(qm[1])
        });
      }
      console.log("[TV]", markers.length, "quality markers");
      for (var mi = 0; mi < markers.length; mi++) {
        if (!markers[mi].isHQ)
          continue;
        var zEnd = markers[mi + 1] ? markers[mi + 1].index : slice.length;
        var zone = slice.substring(markers[mi].index, zEnd);
        var zRx = /<a[^>]*href=["']([^"']+)["'][^>]*>(.*?)<\/a>/gi, zm;
        while ((zm = zRx.exec(zone)) !== null) {
          if (isValidStreamLink(zm[1], zm[2]))
            result.push({ url: zm[1], requiresQualityCheck: false, preFilteredQuality: true });
        }
      }
    } else {
      console.log("[TV] No quality labels \u2014 checking during extraction");
      var lRx = /<a[^>]*href=["']([^"']+)["'][^>]*>(.*?)<\/a>/gi, lm;
      while ((lm = lRx.exec(slice)) !== null) {
        if (isValidStreamLink(lm[1], lm[2]))
          result.push({ url: lm[1], requiresQualityCheck: true, preFilteredQuality: false });
      }
    }
  }
  return _dedup(result);
}
function _dedup(items) {
  var seen = /* @__PURE__ */ new Set();
  return items.filter(function(item) {
    if (seen.has(item.url))
      return false;
    seen.add(item.url);
    return true;
  });
}
function extractLinks(html, mediaType, season, episode) {
  return extractLinksWithMetadata(html, mediaType, season, episode).map(function(m) {
    return m.url;
  });
}
var _inFlight = /* @__PURE__ */ new Map();
function getStreams(tmdbId, mediaType, season, episode) {
  return __async(this, null, function* () {
    var key = tmdbId + "_" + mediaType + "_" + (season || "null") + "_" + (episode || "null");
    if (_inFlight.has(key)) {
      console.log("[HDHub4u] \u23F3 Awaiting in-flight request:", key);
      return _inFlight.get(key);
    }
    var promise = _getStreamsInner(tmdbId, mediaType, season, episode);
    _inFlight.set(key, promise);
    try {
      return yield promise;
    } finally {
      _inFlight.delete(key);
    }
  });
}
function _getStreamsInner(tmdbId, mediaType, season, episode) {
  return __async(this, null, function* () {
    console.log("[HDHub4u] Starting:", tmdbId, mediaType, season, episode);
    if (!DISABLE_CACHE_FOR_TESTING) {
      try {
        var cached = yield getCachedStreams(tmdbId, mediaType, season, episode);
        if (cached) {
          console.log("[HDHub4u] \u26A1 Cache hit:", cached.length, "streams");
          triggerDomainUpdate();
          return cached;
        }
      } catch (err) {
        console.log("[HDHub4u] Cache error, continuing:", err.message);
      }
    }
    triggerDomainUpdate();
    try {
      var tmdbUrl = "https://api.themoviedb.org/3/" + mediaType + "/" + tmdbId + "?api_key=" + TMDB_API_KEY + "&append_to_response=external_ids";
      var tmdbInfo = yield fetch(tmdbUrl).then(function(r) {
        return r.json();
      });
      var imdbId = tmdbInfo.imdb_id || tmdbInfo.external_ids && tmdbInfo.external_ids.imdb_id;
      var displayTitle = mediaType === "tv" ? tmdbInfo.name : tmdbInfo.title;
      var year = mediaType === "movie" ? (tmdbInfo.release_date || "").split("-")[0] : (tmdbInfo.first_air_date || "").split("-")[0];
      var webStreamrP = function() {
        return __async(this, null, function* () {
          if (!imdbId)
            return [];
          console.log("[WebStreamr] Fetching for IMDb:", imdbId);
          return webstreamrExtractor(imdbId, mediaType, season, episode);
        });
      }().catch(function() {
        return [];
      });
      var nativeScrapeP = function() {
        return __async(this, null, function* () {
          try {
            var searchQueue = [];
            var updatedTitle2 = displayTitle;
            if (imdbId) {
              var imdbRes = yield fetch("https://api.imdbapi.dev/titles/" + imdbId).then(function(r) {
                return r.json();
              }).catch(function() {
                return null;
              });
              var akasRes = yield fetch("https://api.imdbapi.dev/titles/" + imdbId + "/akas").then(function(r) {
                return r.json();
              }).catch(function() {
                return { akas: [] };
              });
              if (imdbRes) {
                if (imdbRes.originalTitle)
                  searchQueue.push(imdbRes.originalTitle);
                if (imdbRes.primaryTitle && searchQueue.indexOf(imdbRes.primaryTitle) === -1)
                  searchQueue.push(imdbRes.primaryTitle);
                updatedTitle2 = imdbRes.originalTitle || imdbRes.primaryTitle || displayTitle;
              }
              var akas = akasRes && akasRes.akas ? akasRes.akas : [];
              akas.filter(function(a) {
                return a.country && a.country.code === "IN";
              }).map(function(a) {
                return a.text;
              }).filter(function(t) {
                return /^[\w\s\-':.!&–—(),]+$/.test(t);
              }).forEach(function(t) {
                if (searchQueue.indexOf(t) === -1)
                  searchQueue.push(t);
              });
            }
            if (!searchQueue.length)
              searchQueue.push(updatedTitle2);
            var search = yield performParallelSearch(searchQueue, year);
            if (!search.results.length) {
              console.log("[HDHub4u] No search results");
              return { nativeStreams: [], updatedTitle: updatedTitle2 };
            }
            var bestMatch = search.results.find(function(r) {
              if (mediaType === "tv" && season)
                return r.title.toLowerCase().indexOf("season " + season) !== -1;
              return true;
            });
            if (!bestMatch) {
              console.log("[HDHub4u] No match");
              return { nativeStreams: [], updatedTitle: updatedTitle2 };
            }
            console.log("[HDHub4u] Page:", bestMatch.title);
            var pageHtml = yield fetchText(bestMatch.url, { _referer: MAIN_URL });
            if (!pageHtml) {
              console.log("[HDHub4u] Empty HTML for", bestMatch.url, "\u2014 CF block likely");
              return { nativeStreams: [], updatedTitle: updatedTitle2 };
            }
            var links = extractLinks(pageHtml, mediaType, season, episode);
            console.log("[HDHub4u]", links.length, "candidate links");
            var extracted = yield extractLinksInBatches(links, bestMatch.url);
            var suffix = episodeSuffix(season, episode);
            var nativeStreams2 = [];
            extracted.forEach(function(res) {
              if (!res || !res.url || res.quality === "Unknown")
                return;
              if (res.quality.indexOf("480p") !== -1 || res.quality.indexOf("720p") !== -1)
                return;
              var title = [updatedTitle2, year ? "(" + year + ")" : "", suffix].filter(Boolean).join(" ");
              nativeStreams2.push({
                name: res.quality,
                title,
                url: transformToProxyUrl(res.url),
                size: formatBytes(res.size),
                headers: buildHeaders(MAIN_URL + "/", MAIN_URL)
              });
            });
            return { nativeStreams: nativeStreams2, updatedTitle: updatedTitle2 };
          } catch (err) {
            console.log("[HDHub4u Native Error]:", err.message);
            return { nativeStreams: [], updatedTitle: displayTitle };
          }
        });
      }();
      var results = yield Promise.all([webStreamrP, nativeScrapeP]);
      var wsResults = results[0];
      var nativeData = results[1];
      var nativeStreams = nativeData.nativeStreams;
      var updatedTitle = nativeData.updatedTitle;
      var merged = nativeStreams.slice();
      if (Array.isArray(wsResults)) {
        wsResults.forEach(function(res) {
          if (!res || !res.url)
            return;
          var suffix = episodeSuffix(season, episode);
          var title = [updatedTitle, year ? "(" + year + ")" : "", suffix].filter(Boolean).join(" ");
          merged.push({
            name: res.quality,
            title,
            url: transformToProxyUrl(res.url),
            size: res.sizeText || formatBytes(res.size),
            headers: buildHeaders(MAIN_URL + "/", MAIN_URL)
          });
        });
      }
      if (!merged.length) {
        console.log("[HDHub4u] No streams found");
        return [];
      }
      var deduped = deduplicateByUrl(merged);
      if (deduped.length < merged.length)
        console.log("[HDHub4u] Deduped:", merged.length, "\u2192", deduped.length);
      var final = sortAndNumberStreams(deduped);
      console.log("[HDHub4u] \u2705", final.length, "streams");
      if (!DISABLE_CACHE_FOR_TESTING) {
        setCachedStreams(tmdbId, mediaType, season, episode, final, DEFAULT_TTL).then(function() {
          return getCacheStats();
        }).then(function(stats) {
          console.log("[CACHE] Saved \u2014", stats.totalEntries || 0, "entries");
        }).catch(function(err) {
          console.log("[CACHE] Background save error:", err.message);
        });
      }
      return final;
    } catch (err) {
      console.error("[HDHub4u] Critical Error:", err.message);
      return [];
    }
  });
}
