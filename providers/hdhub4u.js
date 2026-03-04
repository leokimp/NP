/**
 * hdhub4u - Built from src/hdhub4u/
 * Generated: 2026-03-02T20:33:08.617Z
 */
var __defProp = Object.defineProperty;
var __defProps = Object.defineProperties;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropDescs = Object.getOwnPropertyDescriptors;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getOwnPropSymbols = Object.getOwnPropertySymbols;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __propIsEnum = Object.prototype.propertyIsEnumerable;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __spreadValues = (a, b) => {
  for (var prop in b || (b = {}))
    if (__hasOwnProp.call(b, prop))
      __defNormalProp(a, prop, b[prop]);
  if (__getOwnPropSymbols)
    for (var prop of __getOwnPropSymbols(b)) {
      if (__propIsEnum.call(b, prop))
        __defNormalProp(a, prop, b[prop]);
    }
  return a;
};
var __spreadProps = (a, b) => __defProps(a, __getOwnPropDescs(b));
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
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

// src/hdhub4u/index.js
var hdhub4u_exports = {};
__export(hdhub4u_exports, {
  clearAllCache: () => clearAllCache,
  getCacheStats: () => getCacheStats,
  getStreams: () => getStreams
});
module.exports = __toCommonJS(hdhub4u_exports);

// src/hdhub4u/config.js
var MAIN_URL = "https://hdhub4u.frl";
var PINGORA_API_URL = "https://search.pingora.fyi/collections/post/documents/search";
var DOMAINS_URL = "https://raw.githubusercontent.com/phisher98/TVVVV/refs/heads/main/domains.json";
var PROXY_WORKER_URL = "https://stream.leokimpese.workers.dev/";
var ENABLE_GOOGLE_DRIVE_PROXY = true;
var PIXELDRAIN_PROXY_URL = "https://brave-hedgehog-25.leokimp.deno.net";
var ENABLE_PIXELDRAIN_PROXY = true;
var HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
  "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.9"
};
function setMainUrl(newUrl) {
  MAIN_URL = newUrl;
  HEADERS.Referer = MAIN_URL + "/";
  HEADERS.Origin = MAIN_URL;
}
function shouldProxyUrl(url) {
  if (!ENABLE_GOOGLE_DRIVE_PROXY || !url)
    return false;
  const proxyPatterns = [
    "video-downloads.googleusercontent.com",
    "drive.google.com/uc",
    "docs.google.com/uc"
  ];
  return proxyPatterns.some((pattern) => url.includes(pattern));
}
function shouldPixeldrainUrl(url) {
  if (!ENABLE_PIXELDRAIN_PROXY || !url) return false;
  const pixeldrainPatterns = [
    "pixeldrain.com/api/file/",
    "pixeldrain.dev/api/file/"
  ];
  return pixeldrainPatterns.some((pattern) => url.includes(pattern));
}
function transformToProxyUrl(url) {
  if (!shouldProxyUrl(url)) {
    return url;
  }
  try {
    const proxiedUrl = `${PROXY_WORKER_URL}?l=${url}`;
    console.log("[PROXY] Transformed URL to use seeking-enabled proxy");
    console.log("[PROXY] Original:", url.substring(0, 1000) + "...");
    console.log("[PROXY] Proxied:", proxiedUrl.substring(0, 1000) + "...");
    return proxiedUrl;
  } catch (error) {
    console.log("[PROXY] Error transforming URL:", error.message);
    return url;
  }
}
if (shouldPixeldrainUrl(url)) {
    try {
      const proxiedUrl = `${PIXELDRAIN_PROXY_URL}?url=${encodeURIComponent(url)}`;
      console.log("[PROXY] Transformed Pixeldrain URL to use seeking-enabled Deno proxy");
      console.log("[PROXY] Original:", url);
      console.log("[PROXY] Proxied:", proxiedUrl);
      return proxiedUrl;
    } catch (error) {
      console.log("[PROXY] Error transforming Pixeldrain URL:", error.message);
      return url;
    }
  }

  return url;
}
function formatBytes(bytes) {
  if (!bytes || bytes === 0)
    return "Unknown";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}
function rot13(str) {
  return str.replace(
    /[a-zA-Z]/g,
    (c) => String.fromCharCode((c <= "Z" ? 90 : 122) >= (c = c.charCodeAt(0) + 13) ? c : c - 26)
  );
}
const b64chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';

function safeAtob(input) {
  const str = String(input).replace(/[=]+$/, '');
  if (str.length % 4 === 1) return input;
  
  let output = '';
  for (
    let bc = 0, bs = 0, buffer, i = 0;
    buffer = str.charAt(i++);
    ~buffer && (bs = bc % 4 ? bs * 64 + buffer : buffer, bc++ % 4) 
      ? output += String.fromCharCode(255 & bs >> (-2 * bc & 6)) 
      : 0
  ) {
    buffer = b64chars.indexOf(buffer);
  }
  return output;
}

function safeBtoa(input) {
  const str = String(input);
  let output = '';
  for (
    let block = 0, charCode, i = 0, map = b64chars;
    str.charAt(i | 0) || (map = '=', i % 1);
    output += map.charAt(63 & block >> 8 - i % 1 * 8)
  ) {
    charCode = str.charCodeAt(i += 3 / 4);
    if (charCode > 0xFF) return input;
    block = block << 8 | charCode;
  }
  return output;
}


function seqRatio(a, b) {
  if (!a || !b) return 0;
  const la = a.length, lb = b.length;
  if (la === 0 && lb === 0) return 1;
  const dp = Array.from({ length: la + 1 }, () => new Array(lb + 1).fill(0));
  let best = 0;
  for (let i = 1; i <= la; i++)
    for (let j = 1; j <= lb; j++) {
      dp[i][j] = a[i-1] === b[j-1] ? dp[i-1][j-1] + 1 : 0;
      if (dp[i][j] > best) best = dp[i][j];
    }
  return (2 * best) / (la + lb);
}

function jaccardWords(a, b) {
  const sa = new Set(a.split(/\s+/).filter(Boolean));
  const sb = new Set(b.split(/\s+/).filter(Boolean));
  let inter = 0;
  for (const w of sa) if (sb.has(w)) inter++;
  const union = new Set([...sa, ...sb]).size;
  return union === 0 ? 0 : inter / union;
}

function calcTitleSim(query, candidate) {
  const norm = s => s.toLowerCase().replace(/[^a-z0-9\s]/g, "").replace(/\s+/g, " ").trim();
  const q = norm(query), c = norm(candidate);
  if (!q || !c) return 0;
  // Exact or substring check first
  if (c.includes(q)) return 0.95;
  return Math.max(seqRatio(q, c), jaccardWords(q, c));
}


function isTitleMatch(query, title, threshold = 0.62) {
 return calcTitleSim(query, title) >= threshold;
}



function parseSize(str) {
  const match = str.match(/([\d.]+)\s*(GB|MB|KB|TB)/i);
  if (!match)
    return 0;
  const value = parseFloat(match[1]);
  const unit = match[2].toUpperCase();
  const multipliers = {
    "KB": 1024,
    "MB": 1024 ** 2,
    "GB": 1024 ** 3,
    "TB": 1024 ** 4
  };
  return value * (multipliers[unit] || 0);
}
function extractText(html) {
  return html.replace(/<[^>]*>/g, "").trim();
}
function extractAllLinks(html) {
  const links = [];
  const regex = new RegExp(`<a[^>]*href=["']([^"']*)["'][^>]*>(.*?)<\\/a>`, "gis");
  let match;
  while ((match = regex.exec(html)) !== null) {
    links.push({
      href: match[1],
      text: extractText(match[2])
    });
  }
  return links;
}

// src/hdhub4u/http.js
var domainLastUpdated = 0;
var domainUpdateInProgress = false;
var DOMAIN_UPDATE_INTERVAL = 36e5;
function triggerDomainUpdate() {
  const now = Date.now();
  if (now - domainLastUpdated < DOMAIN_UPDATE_INTERVAL || domainUpdateInProgress) {
    return;
  }
  domainUpdateInProgress = true;
  performDomainUpdate().then(() => {
    domainUpdateInProgress = false;
  }).catch((error) => {
    console.log("[Domain Update] Background error:", error.message);
    domainUpdateInProgress = false;
  });
}
function performDomainUpdate() {
  return __async(this, null, function* () {
    try {
      console.log("[Domain Update] Checking for new domain (background)...");
      const response = yield fetch(DOMAINS_URL);
      const data = yield response.json();
      if (data && data.HDHUB4u && MAIN_URL !== data.HDHUB4u) {
        console.log("[Domain Update] \u2713 Domain updated:", data.HDHUB4u);
        setMainUrl(data.HDHUB4u);
        domainLastUpdated = Date.now();
      } else {
        console.log("[Domain Update] \u2713 Domain unchanged");
        domainLastUpdated = Date.now();
        HEADERS.Referer = MAIN_URL + "/";
        HEADERS.Origin = MAIN_URL;
      }
    } catch (error) {
      console.log("[Domain Update] Error:", error.message);
      HEADERS.Referer = MAIN_URL + "/";
      HEADERS.Origin = MAIN_URL;
    }
  });
}
function initializeHeaders() {
  HEADERS.Referer = MAIN_URL + "/";
  HEADERS.Origin = MAIN_URL;
}
initializeHeaders();
function fetchWithRetry(_0) {
  return __async(this, arguments, function* (url, customHeaders = {}, maxRetries = 2) {
    const headers = __spreadValues(__spreadValues({}, HEADERS), customHeaders);
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const response = yield fetch(url, { headers });
        if (!response.ok && attempt < maxRetries) {
          console.log(`[HTTP] Retry ${attempt + 1}/${maxRetries} for:`, url);
          yield sleep(1e3 * (attempt + 1));
          continue;
        }
        return response;
      } catch (error) {
        if (attempt === maxRetries) {
          throw error;
        }
        console.log(`[HTTP] Error on attempt ${attempt + 1}, retrying:`, error.message);
        yield sleep(1e3 * (attempt + 1));
      }
    }
    throw new Error("Max retries reached");
  });
}
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
function fetchRedirectUrl(_0) {
  return __async(this, arguments, function* (url, customHeaders = {}) {
    try {
      const headers = __spreadValues(__spreadValues({}, HEADERS), customHeaders);
      const response = yield fetch(url, {
        method: "HEAD",
        headers,
        redirect: "manual"
      });
      const location = response.headers.get("hx-redirect") || response.headers.get("location") || response.headers.get("Location");
      if (location) {
        if (location.startsWith("http")) {
          return location;
        } else {
          const baseUrl = new URL(url);
          return baseUrl.origin + location;
        }
      }
      return null;
    } catch (error) {
      console.log("[HTTP] Redirect fetch error:", error.message);
      return null;
    }
  });
}
function fetchJSON(_0) {
  return __async(this, arguments, function* (url, customHeaders = {}) {
    try {
      const response = yield fetchWithRetry(url, customHeaders);
      return yield response.json();
    } catch (error) {
      console.log("[HTTP] JSON fetch error:", error.message);
      return null;
    }
  });
}
function fetchText(_0) {
  return __async(this, arguments, function* (url, customHeaders = {}) {
    try {
      const response = yield fetchWithRetry(url, customHeaders);
      return yield response.text();
    } catch (error) {
      console.log("[HTTP] Text fetch error:", error.message);
      return "";
    }
  });
}

// src/hdhub4u/webstreamr.js
var WEBSTREAMR_BASE_URL = "https://webstreamr.hayd.uk/%7B%22gu%22%3A%22on%22%2C%22hi%22%3A%22on%22%2C%22mediaFlowProxyUrl%22%3A%22%22%2C%22mediaFlowProxyPassword%22%3A%22%22%2C%22disableExtractor_doodstream%22%3A%22on%22%2C%22disableExtractor_dropload%22%3A%22on%22%2C%22disableExtractor_fastream%22%3A%22on%22%2C%22disableExtractor_kinoger%22%3A%22on%22%2C%22disableExtractor_lulustream%22%3A%22on%22%2C%22disableExtractor_mixdrop%22%3A%22on%22%2C%22disableExtractor_savefiles%22%3A%22on%22%2C%22disableExtractor_streamembed%22%3A%22on%22%2C%22disableExtractor_streamtape%22%3A%22on%22%2C%22disableExtractor_streamup%22%3A%22on%22%2C%22disableExtractor_supervideo%22%3A%22on%22%2C%22disableExtractor_uqload%22%3A%22on%22%2C%22disableExtractor_vidora%22%3A%22on%22%2C%22disableExtractor_vidsrc%22%3A%22on%22%2C%22disableExtractor_vixsrc%22%3A%22on%22%2C%22disableExtractor_voe%22%3A%22on%22%2C%22disableExtractor_youtube%22%3A%22on%22%7D";
var ALLOWED_LANGUAGES = ["hindi", "gujarati", "english"];
var BLOCKED_LANGUAGES = [
  "kannada",
  "tamil",
  "telugu",
  "malayalam",
  "bengali",
  "marathi",
  "punjabi",
  "odia",
  "assamese",
  "urdu",
  "bhojpuri",
  "rajasthani",
  "konkani",
  "sindhi",
  "nepali",
  "kashmiri",
  "manipuri",
  "sanskrit",
  "maithili"
];
var MIN_QUALITY = 1080;
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
function extractQuality(streamName) {
  const nameLower = streamName.toLowerCase();
  const qualityMatch = nameLower.match(/(\d{3,4})p/);
  if (qualityMatch) {
    return parseInt(qualityMatch[1]);
  }
  if (nameLower.includes("2160p") || nameLower.includes("4k") || nameLower.includes("uhd")) {
    return 2160;
  }
  if (nameLower.includes("1080p") || nameLower.includes("fhd")) {
    return 1080;
  }
  return 0;
}
function hasBlockedQuality(streamName) {
  const nameLower = streamName.toLowerCase();
  for (const pattern of BLOCKED_QUALITY_PATTERNS) {
    const regex = new RegExp(`\\b${pattern}\\b`, "i");
    if (regex.test(streamName)) {
      return true;
    }
  }
  const quality = extractQuality(streamName);
  if (quality > 0 && quality < MIN_QUALITY) {
    return true;
  }
  return false;
}
function shouldFilterStream(stream) {
  const streamName = (stream.name || "").toLowerCase();
  const streamTitle = (stream.title || "").toLowerCase();
  const combinedText = `${streamName} ${streamTitle}`;
  if (hasBlockedQuality(combinedText))
    return true;
  for (const lang of BLOCKED_LANGUAGES) {
    if (combinedText.includes(lang))
      return true;
  }
  for (const lang of ALLOWED_LANGUAGES) {
    if (combinedText.includes(lang))
      return false;
  }
  const quality = extractQuality(combinedText);
  if (quality >= MIN_QUALITY)
    return false;
  return true;
}
function cleanStreamMetadata(streams) {
  return streams.map((stream) => {
    let name = stream.name || "";
    let title = stream.title || "";
    const qualityMatch = title.match(/(\d{3,4}p|4k|uhd)/i);
    const cleanName = qualityMatch ? qualityMatch[1].toLowerCase() : name.match(/\d{3,4}p/i) ? name.match(/\d{3,4}p/i)[0].toLowerCase() : "HD";
    const yearMatch = title.match(/\b(19|20)\d{2}\b/);
    const year = yearMatch ? yearMatch[0] : "";
    const langMatch = title.match(/hindi|gujarati|english/i);
    let lang = "";
    if (langMatch) {
      lang = langMatch[0].charAt(0).toUpperCase() + langMatch[0].slice(1).toLowerCase();
    } else {
      lang = "Multi";
    }
    const nameRegex = /^(.*?)(?=\s*\d{3,4}p|\s*4k|\s*uhd|\s*\b(19|20)\d{2}\b|\n)/i;
    const nameMatch = title.match(nameRegex);
    let movieName = nameMatch ? nameMatch[1].replace(/[._]/g, " ").replace(/\(|\)/g, "").trim() : title.split("\n")[0].trim();
    const cleanTitleLine = `${movieName}  ${year}  ${lang}`.replace(/\s+/g, " ").trim();
    const sizeMatch = title.match(/(\d+(?:\.\d+)?\s*[GM]B)/i);
    const cleanSize = sizeMatch ? sizeMatch[1] : "";
    return __spreadProps(__spreadValues({}, stream), {
      name: cleanName,
      title: cleanTitleLine.trim(),
      size: cleanSize
    });
  });
}
function webstreamrExtractor(imdbId, mediaType, season, episode) {
  return __async(this, null, function* () {
    console.log("[WEBSTREAMR] Starting extraction:", { imdbId, mediaType, season, episode });
    if (!imdbId) {
      console.log("[WEBSTREAMR] No IMDb ID provided");
      return [];
    }
    try {
      let endpoint;
      if (mediaType === "movie") {
        endpoint = `/stream/movie/${imdbId}.json`;
      } else if (mediaType === "tv" && season && episode) {
        endpoint = `/stream/series/${imdbId}:${season}:${episode}.json`;
      } else {
        console.log("[WEBSTREAMR] Invalid mediaType or missing season/episode");
        return [];
      }
      const url = `${WEBSTREAMR_BASE_URL}${endpoint}`;
      console.log("[WEBSTREAMR] Fetching:", url);
      const response = yield fetchWithRetry(url);
      const data = yield response.json();
      if (!data.streams || !Array.isArray(data.streams)) {
        console.log("[WEBSTREAMR] No streams found in response");
        return [];
      }
      console.log(`[WEBSTREAMR] Raw streams: ${data.streams.length}`);
      const filteredStreams = data.streams.filter((stream) => !shouldFilterStream(stream));
      console.log(`[WEBSTREAMR] After filtering: ${filteredStreams.length} streams`);
      if (filteredStreams.length === 0) {
        console.log("[WEBSTREAMR] All streams filtered out");
        return [];
      }
      const cleanedStreams = cleanStreamMetadata(filteredStreams);
      const results = cleanedStreams.map((stream) => {
        var _a;
        return {
          source: "WebStreamr",
          quality: `${stream.name || "Unknown"}.`,
          url: stream.url,
          size: ((_a = stream.behaviorHints) == null ? void 0 : _a.videoSize) || 0,
          filename: stream.title,
          sizeText: stream.size || ""
        };
      });
      console.log(`[WEBSTREAMR] Returning ${results.length} streams`);
      return results;
    } catch (error) {
      console.log("[WEBSTREAMR] Error:", error.message);
      return [];
    }
  });
}

// src/hdhub4u/extractors.js
function isDirectLink(url) {
  const directPatterns = [
    /^https?:\/\/pixeldrain\.com\/api\/file\/.*\?download/i,
    /^https?:\/\/pixeldrain\.dev\/api\/file\//i,
    /^https?:\/\/([a-z0-9-]+\.)*video-downloads\.googleusercontent\.com/i,
    /^https?:\/\/drive\.google\.com\/uc\?/i,
    /^https?:\/\/docs\.google\.com.*export/i
  ];
  return directPatterns.some((pattern) => pattern.test(url));
}
function isRedirectLink(url) {
  const redirectPatterns = [
    /dl\.php\?link=/i,
    // dl.php redirects
    /https?:\/\/[a-z0-9-]+\.hubcdn\.fans\/\?id=/i,
    // Catches pixel.hubcdn, gpdl.hubcdn, etc.
    /https?:\/\/[a-z0-9-]+\.rohitkiskk\.workers\.dev/i,
    // Catches any rohitkiskk workers
    /\/go\//i,
    // Generic /go/ redirects
    /redirect/i
    // URLs with 'redirect' in them
  ];
  return redirectPatterns.some((pattern) => pattern.test(url));
}
function resolveRedirectChain(url, maxHops = 10) {
  return __async(this, null, function* () {
    console.log("[RESOLVE] Starting redirect resolution for:", url);
    let currentUrl = url;
    let hopCount = 0;
    const adDomains = [
      "bonuscaf.com",
      "urbanheadline.com",
      "propellerads",
      "adsterra",
      "popads",
      "popcash",
      "blogspot.com"
    ];
    while (hopCount < maxHops) {
      console.log(`[RESOLVE] Hop ${hopCount + 1}:`, currentUrl);
      if (currentUrl.includes("pixel.hubcdn.fans")) {
        console.log("[RESOLVE] Swapping pixel.hubcdn.fans → gpdl.hubcdn.fans");
        currentUrl = currentUrl.replace("pixel.hubcdn.fans", "gpdl.hubcdn.fans");
        console.log("[RESOLVE] Swapped URL:", currentUrl);
      }

      if (currentUrl.includes("dl.php?link=")) {
        try {
          const urlObj = new URL(currentUrl);
          const targetLink = urlObj.searchParams.get("link");
          if (targetLink && targetLink.startsWith("http")) {
            console.log("[RESOLVE] Extracted direct link from parameter");
            currentUrl = decodeURIComponent(targetLink);
            hopCount++;
            continue;
          }
        } catch (err) {
          console.log("[RESOLVE] Failed to parse link parameter:", err.message);
        }
      }
      if (isDirectLink(currentUrl)) {
        console.log("[RESOLVE] Found direct link!");
        return currentUrl;
      }
      try {
        const response = yield fetch(currentUrl, {
          method: "GET",
          headers: HEADERS,
          redirect: "manual"
        });
        const location = response.headers.get("location");
        if (location) {
          currentUrl = location.startsWith("http") ? location : new URL(location, currentUrl).toString();
          hopCount++;
          continue;
        }
        const contentType = response.headers.get("content-type") || "";
        if (contentType.includes("video/") || contentType.includes("application/octet-stream") || contentType.includes("application/x-matroska")) {
          console.log("[RESOLVE] Found direct file download");
          return currentUrl;
        }
        if (contentType.includes("text/html")) {
          const html = yield response.text();
          const regex = /s\('o','([A-Za-z0-9+/=]+)'|ck\('_wp_http_\d+','([^']+)'/g;
          let combinedString = "";
          let match;
          while ((match = regex.exec(html)) !== null) {
            const extractedValue = match[1] || match[2];
            if (extractedValue)
              combinedString += extractedValue;
          }
          if (combinedString) {
            console.log("[RESOLVE] Found encoded data, decoding...");
            try {
              const decodedString = safeAtob(rot13(safeAtob(safeAtob(combinedString))));
              const jsonObject = JSON.parse(decodedString);
              const encodedUrl = safeAtob(jsonObject.o || "").trim();
              if (encodedUrl) {
                console.log("[RESOLVE] Decoded URL from encoded data");
                currentUrl = encodedUrl;
                hopCount++;
                continue;
              }
            } catch (err) {
              console.log("[RESOLVE] Decode failed:", err.message);
            }
          }
          const buttonMatch = html.match(/<button[^>]*id=["']?(downloadbtn|download-btn|btn-download)[^"']*["']?[^>]*>/i);
          if (buttonMatch) {
            console.log("[RESOLVE] Found download button, extracting URL from JS...");
            const urlPatterns = [
              /https?:\/\/video-downloads\.googleusercontent\.com\/[^\s"'<>)]+/,
              /https?:\/\/[^\s"'<>]+pixeldrain\.(com|dev)[^\s"'<>]+/,
              /https?:\/\/drive\.google\.com[^\s"'<>]+/,
              /var\s+(?:download_?url|file_?url|link)\s*=\s*["']([^"']+)["']/i,
              /location\.href\s*=\s*["']([^"']+)["']/i,
              /window\.open\(["']([^"']+)["']/i
            ];
            for (const pattern of urlPatterns) {
              const urlMatch = html.match(pattern);
              if (urlMatch) {
                const foundUrl = urlMatch[1] || urlMatch[0];
                if (foundUrl && foundUrl.startsWith("http")) {
                  console.log("[RESOLVE] Extracted URL from button JS");
                  currentUrl = foundUrl;
                  hopCount++;
                  continue;
                }
              }
            }
          }
          const directUrlPatterns = [
            /https?:\/\/video-downloads\.googleusercontent\.com\/[^\s"'<>)]+/,
            /https?:\/\/pixeldrain\.com\/api\/file\/[^\s"'<>]+/,
            /https?:\/\/pixeldrain\.dev\/api\/file\/[^\s"'<>]+/,
            /https?:\/\/drive\.google\.com\/uc\?[^\s"'<>]+/
          ];
          for (const pattern of directUrlPatterns) {
            const urlMatch = html.match(pattern);
            if (urlMatch) {
              console.log("[RESOLVE] Found direct URL in HTML");
              return urlMatch[0];
            }
          }
          const linkRegex = /<a[^>]*href=["']([^"']*)["'][^>]*>([^<]*)</gi;
          let linkMatch;
          while ((linkMatch = linkRegex.exec(html)) !== null) {
            const href = linkMatch[1];
            const text = linkMatch[2];
            if (!href || !href.startsWith("http"))
              continue;
            if (text.match(/telegram|zipdisk|ads/i))
              continue;
            if (href.includes("dl.php?link=") && href === currentUrl)
              continue;
            if (text.match(/download|get file|click here|direct link|server/i)) {
              console.log("[RESOLVE] Found download link:", text);
              if (isDirectLink(href)) {
                return href;
              }
              currentUrl = href;
              hopCount++;
              break;
            }
          }
          const metaMatch = html.match(/<meta[^>]*http-equiv=["']refresh["'][^>]*content=["'][^"']*url=([^"'\s]+)/i);
          if (metaMatch && metaMatch[1]) {
            console.log("[RESOLVE] Following meta refresh");
            currentUrl = metaMatch[1];
            hopCount++;
            continue;
          }
          const jsMatch = html.match(/(?:window\.location|location\.href)\s*=\s*["']([^"']+)["']/);
          if (jsMatch) {
            const jsUrl = jsMatch[1];
            const isAd = adDomains.some((domain) => jsUrl.includes(domain));
            if (!isAd) {
              console.log("[RESOLVE] Following JS redirect");
              currentUrl = jsUrl;
              hopCount++;
              continue;
            } else {
              console.log("[RESOLVE] Skipping ad redirect");
            }
          }
          console.log("[RESOLVE] No more redirects found on this page");
          if (isRedirectLink(currentUrl)) {
            console.log("[RESOLVE] WARNING: Stopped on redirect link, not direct download");
            console.log("[RESOLVE] Returning original URL instead");
            return url;
          }
          return currentUrl;
        }
        return currentUrl;
      } catch (err) {
        console.log("[RESOLVE] Error:", err.message);
        if (isRedirectLink(currentUrl)) {
          console.log("[RESOLVE] Error occurred on redirect link, returning original");
          return url;
        }
        return currentUrl;
      }
    }
    console.log("[RESOLVE] Max hops reached");
    if (isRedirectLink(currentUrl)) {
      console.log("[RESOLVE] WARNING: Max hops reached but still on redirect link!");
      console.log("[RESOLVE] Returning original URL instead");
      return url;
    }
    return currentUrl;
  });
}
function getRedirectLinks(url) {
  return __async(this, null, function* () {
    console.log("[REDIRECT] Processing:", url);
    try {
      const doc = yield fetchText(url);
      const regex = /s\('o','([A-Za-z0-9+/=]+)'|ck\('_wp_http_\d+','([^']+)'/g;
      let combinedString = "";
      let match;
      while ((match = regex.exec(doc)) !== null) {
        const extractedValue = match[1] || match[2];
        if (extractedValue)
          combinedString += extractedValue;
      }
      if (!combinedString) {
        console.log("[REDIRECT] No encoded data found");
        return url;
      }
      const decodedString = safeAtob(rot13(safeAtob(safeAtob(combinedString))));
      const jsonObject = JSON.parse(decodedString);
      const encodedUrl = safeAtob(jsonObject.o || "").trim();
      if (encodedUrl) {
        console.log("[REDIRECT] Decoded URL:", encodedUrl);
        if (isRedirectLink(encodedUrl)) {
          return yield resolveRedirectChain(encodedUrl);
        }
        return encodedUrl;
      }
      const data = safeBtoa(jsonObject.data || "").trim();
      const wpHttp = (jsonObject.blog_url || "").trim();
      if (wpHttp && data) {
        console.log("[REDIRECT] Fetching from wpHttp");
        const html = yield fetchText(`${wpHttp}?re=${data}`);
        const finalUrl = extractText(html);
        console.log("[REDIRECT] Final URL:", finalUrl);
        if (isRedirectLink(finalUrl)) {
          return yield resolveRedirectChain(finalUrl);
        }
        return finalUrl;
      }
      return url;
    } catch (err) {
      console.log("[REDIRECT] Error:", err.message);
      return url;
    }
  });
}
function pixelDrainExtractor(url) {
  return __async(this, null, function* () {
    console.log("[PIXELDRAIN] Extracting from:", url);
    const match = url.match(/(?:file|u)\/([A-Za-z0-9]+)/);
    const fileId = match ? match[1] : url.split("/").pop();
    if (!fileId) {
      console.log("[PIXELDRAIN] No file ID found");
      return [];
    }
    try {
      console.log("[PIXELDRAIN] File ID:", fileId);
      const info = yield fetchJSON(`https://pixeldrain.com/api/file/${fileId}/info`);
      if (!info) {
        console.log("[PIXELDRAIN] Failed to fetch file info");
        return [];
      }
      const qualityMatch = info.name ? info.name.match(/(\d{3,4})p/) : null;
      const quality = qualityMatch ? qualityMatch[0] : "Unknown";
      return [{
        source: "Pixeldrain",
        quality,
        url: `https://pixeldrain.com/api/file/${fileId}?download`,
        size: info.size || 0,
        filename: info.name
      }];
    } catch (err) {
      console.log("[PIXELDRAIN] Error:", err.message);
      return [];
    }
  });
}
function hubDriveExtractor(url, referer) {
  return __async(this, null, function* () {
    console.log("[HUBDRIVE] Extracting from:", url);
    try {
      const html = yield fetchText(url, { Referer: referer });
      const hubcloudMatch = html.match(new RegExp(`<a[^>]*href=["']([^"']*hubcloud[^"']*)["'][^>]*>.*?\\[HubCloud Server\\]`, "is"));
      if (hubcloudMatch && hubcloudMatch[1]) {
        const href = hubcloudMatch[1];
        console.log("[HUBDRIVE] Found HubCloud link:", href);
        return yield hubCloudExtractor(href, url);
      }
      console.log("[HUBDRIVE] No HubCloud link found");
      return [];
    } catch (err) {
      console.log("[HUBDRIVE] Error:", err.message);
      return [];
    }
  });
}
function hubCloudExtractor(url, referer) {
  return __async(this, null, function* () {
    console.log("[HUBCLOUD] Extracting from:", url);
    let currentUrl = url;
    if (currentUrl.includes("hubcloud.ink")) {
      currentUrl = currentUrl.replace("hubcloud.ink", "hubcloud.dad");
    }
    try {
      let html = yield fetchText(currentUrl, { Referer: referer });
      if (!currentUrl.includes("hubcloud.php")) {
        const scriptUrlMatch = html.match(/var url = '([^']*)'/);
        if (scriptUrlMatch && scriptUrlMatch[1]) {
          currentUrl = scriptUrlMatch[1];
          console.log("[HUBCLOUD] Following script URL:", currentUrl);
          html = yield fetchText(currentUrl, { Referer: url });
        }
      }
      const sizeMatch = html.match(/<i[^>]*id=["']size["'][^>]*>([^<]*)<\/i>/i);
      const sizeText = sizeMatch ? sizeMatch[1].trim() : "";
      const sizeBytes = parseSize(sizeText);
      const headerMatch = html.match(/<div[^>]*class=["'][^"']*card-header[^"']*["'][^>]*>([^<]*)<\/div>/i);
      const header = headerMatch ? headerMatch[1].trim() : "";
      const qualityMatch = header.match(/(\d{3,4})p/);
      const quality = qualityMatch ? qualityMatch[0] : "Unknown";
      console.log("[HUBCLOUD] Size:", sizeText, "Quality:", quality);
      const links = extractAllLinks(html);
      const results = [];
      for (const link of links) {
        const text = link.text;
        let href = link.href;
        if (text.includes("ZipDisk") || text.includes("Telegram")) {
          console.log("[HUBCLOUD] Skipping:", text);
          continue;
        }
        const sourceBase = `HubCloud [${text}]`;
        if (isRedirectLink(href)) {
          console.log("[HUBCLOUD] Resolving redirect link:", href);
          href = yield resolveRedirectChain(href);
          console.log("[HUBCLOUD] Resolved to:", href);
        }
        if (text.includes("Download File") || text.includes("FSL") || text.includes("S3") || text.includes("10Gbps")) {
          console.log("[HUBCLOUD] Direct server:", text);
          results.push({
            source: sourceBase,
            quality,
            url: href,
            size: sizeBytes
          });
        } else if (text.includes("BuzzServer")) {
          console.log("[HUBCLOUD] Processing BuzzServer");
          const finalUrl = yield fetchRedirectUrl(`${href}/download`, { Referer: href });
          if (finalUrl) {
            console.log("[HUBCLOUD] BuzzServer URL:", finalUrl);
            results.push({
              source: sourceBase,
              quality,
              url: finalUrl,
              size: sizeBytes
            });
          }
        } else if (href.includes("pixeldra")) {
          console.log("[HUBCLOUD] Found Pixeldrain link");
          const pdResults = yield pixelDrainExtractor(href);
          if (pdResults[0])
            results.push(pdResults[0]);
        } else if (text.match(/download|server|link/i)) {
          console.log("[HUBCLOUD] Other download link:", text);
          results.push({
            source: sourceBase,
            quality,
            url: href,
            size: sizeBytes
          });
        }
      }
      console.log(`[HUBCLOUD] Extracted ${results.length} direct download links`);
      return results;
    } catch (err) {
      console.log("[HUBCLOUD] Error:", err.message);
      return [];
    }
  });
}
function hubCdnExtractor(url, referer) {
  return __async(this, null, function* () {
    console.log("[HUBCDN] Extracting from:", url);
    try {
      const html = yield fetchText(url, { Referer: referer });
      const sizeMatch = html.match(/<i[^>]*id=["']size["'][^>]*>([^<]*)<\/i>/i);
      const sizeText = sizeMatch ? sizeMatch[1].trim() : "";
      const sizeBytes = parseSize(sizeText);
      const qualityMatch = html.match(/(\d{3,4})p/);
      const quality = qualityMatch ? qualityMatch[0] : "Unknown";
      console.log("[HUBCDN] Size:", sizeText, "Quality:", quality);
      const links = extractAllLinks(html);
      const results = [];
      for (const link of links) {
        const text = link.text;
        let href = link.href;
        if (text.includes("Telegram") || text.includes("ZipDisk")) {
          continue;
        }
        if (text.includes("Download") || text.includes("Server")) {
          console.log("[HUBCDN] Found download link:", text);
          if (isRedirectLink(href)) {
            console.log("[HUBCDN] Resolving redirect...");
            href = yield resolveRedirectChain(href);
            console.log("[HUBCDN] Resolved to:", href);
          }
          results.push({
            source: "HubCdn",
            quality,
            url: href,
            size: sizeBytes
          });
        }
      }
      console.log(`[HUBCDN] Extracted ${results.length} direct download links`);
      return results;
    } catch (err) {
      console.log("[HUBCDN] Error:", err.message);
      return [];
    }
  });
}
function hubstreamExtractor(url, referer) {
  return __async(this, null, function* () {
    console.log("[HUBSTREAM] Extracting from:", url);
    try {
      const html = yield fetchText(url, { Referer: referer });
      const qualityMatch = html.match(/(\d{3,4})p/);
      const quality = qualityMatch ? qualityMatch[0] : "Unknown";
      const downloadRegex = new RegExp(`<a[^>]*href=["']([^"']*)["'][^>]*>.*?(?:Download|Server|Direct)`, "gis");
      const results = [];
      let match;
      while ((match = downloadRegex.exec(html)) !== null) {
        let href = match[1];
        if (href && href.startsWith("http")) {
          console.log("[HUBSTREAM] Found download link");
          if (isRedirectLink(href)) {
            console.log("[HUBSTREAM] Resolving redirect...");
            href = yield resolveRedirectChain(href);
            console.log("[HUBSTREAM] Resolved to:", href);
          }
          results.push({
            source: "Hubstream",
            quality,
            url: href,
            size: 0
          });
        }
      }
      console.log(`[HUBSTREAM] Extracted ${results.length} direct download links`);
      return results;
    } catch (err) {
      console.log("[HUBSTREAM] Error:", err.message);
      return [];
    }
  });
}

// src/hdhub4u/api-cache.js
var CACHE_API_BASE = "https://cache.leokimpese.workers.dev";
var DEFAULT_TTL = 3600;
function generateCacheKey(tmdbId, mediaType, season, episode) {
  return `${tmdbId}_${mediaType}_${season || "null"}_${episode || "null"}`;
}
function getCachedStreams(tmdbId, mediaType, season, episode) {
  return __async(this, null, function* () {
    const key = generateCacheKey(tmdbId, mediaType, season, episode);
    try {
      console.log("[API-CACHE] Fetching:", key);
      const response = yield fetch(`${CACHE_API_BASE}/${key}`, {
        // ✅ Changed from /v1/cache/${key}
        method: "GET",
        headers: {
          "Content-Type": "application/json"
        }
      });
      if (response.status === 404) {
        console.log("[API-CACHE] Miss:", key);
        return null;
      }
      if (!response.ok) {
        console.log("[API-CACHE] Error:", response.status);
        return null;
      }
      const data = yield response.json();
      if (!data || !data.streams || !Array.isArray(data.streams)) {
        console.log("[API-CACHE] Invalid response format");
        return null;
      }
      console.log(`[API-CACHE] Hit: ${key} (${data.streams.length} streams)`);
      return data.streams;
    } catch (error) {
      console.log("[API-CACHE] Fetch error:", error.message);
      return null;
    }
  });
}
function setCachedStreams(_0, _1, _2, _3, _4) {
  return __async(this, arguments, function* (tmdbId, mediaType, season, episode, streams, ttl = DEFAULT_TTL) {
    const key = generateCacheKey(tmdbId, mediaType, season, episode);
    try {
      console.log(`[API-CACHE] Saving: ${key} (${streams.length} streams, TTL: ${ttl}s)`);
      const response = yield fetch(CACHE_API_BASE, {
        // ✅ Already correct - POST to base URL
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
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
        console.log("[API-CACHE] Save failed:", response.status);
        return false;
      }
      console.log("[API-CACHE] Saved successfully");
      return true;
    } catch (error) {
      console.log("[API-CACHE] Save error:", error.message);
      return false;
    }
  });
}
function clearAllCache() {
  return __async(this, null, function* () {
    try {
      console.log("[API-CACHE] Clearing all cache...");
      const response = yield fetch(`${CACHE_API_BASE}/clearall`, {
        // ✅ Changed from /v1/cache/clear
        method: "POST"
      });
      if (response.ok) {
        console.log("[API-CACHE] All cache cleared");
        return true;
      }
      console.log("[API-CACHE] Clear failed:", response.status);
      return false;
    } catch (error) {
      console.log("[API-CACHE] Clear error:", error.message);
      return false;
    }
  });
}
function getCacheStats() {
  return __async(this, null, function* () {
    try {
      const response = yield fetch(`${CACHE_API_BASE}/stats`, {
        // ✅ Changed from /v1/cache/stats
        method: "GET"
      });
      if (!response.ok) {
        return {
          totalEntries: 0,
          totalSize: 0,
          error: "Failed to fetch stats"
        };
      }
      const stats = yield response.json();
      return stats;
    } catch (error) {
      console.log("[API-CACHE] Stats error:", error.message);
      return {
        totalEntries: 0,
        totalSize: 0,
        error: error.message
      };
    }
  });
}

// src/hdhub4u/index.js
var DISABLE_CACHE_FOR_TESTING = false;
function performSingleSearch(query) {
  return __async(this, null, function* () {
    const cleanQuery = query.replace(/Season \d+/i, "").trim();
    const params = new URLSearchParams({
      q: cleanQuery,
      query_by: "post_title",
      sort_by: "sort_by_date:desc"
    });
    try {
      const response = yield fetchWithRetry(`${PINGORA_API_URL}?${params.toString()}`);
      const data = yield response.json();
      const results = [];
      if (data.hits && data.hits.length > 0) {
        data.hits.forEach((hit) => {
          results.push({
            title: hit.document.post_title,
            url: MAIN_URL + hit.document.permalink,
            source: "Pingora",
            searchedTitle: query
          });
        });
        return results;
      }
      console.log(`[Search] "${query}" - Pingora returned 0 results, trying Native Search`);
      const nativeUrl = `${MAIN_URL}/?s=${encodeURIComponent(cleanQuery)}`;
      const nativeResponse = yield fetchWithRetry(nativeUrl);
      const html = yield nativeResponse.text();
      const nativeResults = [];
      const articleRegex = new RegExp("<article[^>]*>.*?<\\/article>", "gis");
      const articles = html.match(articleRegex) || [];
      articles.forEach((article) => {
        const linkMatch = article.match(/<a[^>]*href=["']([^"']*)["'][^>]*>(.*?)<\/a>/i);
        if (linkMatch) {
          const url = linkMatch[1];
          const titleMatch = linkMatch[2].replace(/<[^>]*>/g, "").trim();
          if (url && titleMatch) {
            nativeResults.push({
              title: titleMatch,
              url,
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
  });
}
async function performParallelSearch(queries, year) {
  const allResults = await Promise.all(queries.map(q => performSingleSearch(q)));

  const scored = [];

  for (let i = 0; i < allResults.length; i++) {
    for (const r of allResults[i]) {
      const titleScore = calcTitleSim(queries[i], r.title);
      if (titleScore < 0.62) continue; // pre-filter noise

      let rankScore = titleScore;
      if (year) {
        const rYear = (r.title.match(/\b(19|20)\d{2}\b/) || [])[0];
        if (rYear) {
          const delta = Math.abs(parseInt(year) - parseInt(rYear));
          if (delta === 0) rankScore = Math.min(1, rankScore + 0.1);
          else if (delta > 3) rankScore *= 0.7;
        }
      }

      // re-filter after year penalty (could drop below 0.62)
      if (rankScore < 0.62) continue;

      scored.push({ ...r, titleScore, rankScore, usedQuery: queries[i] });
    }
  }

  if (!scored.length) return { results: [], usedTitle: "" };

  // Sort best-first, deduplicate by URL
  scored.sort((a, b) => b.rankScore - a.rankScore);
  const seen = new Set();
  const unique = scored.filter(r => {
    if (seen.has(r.url)) return false;
    seen.add(r.url);
    return true;
  });

  return { results: unique, usedTitle: unique[0].usedQuery };
}
function loadExtractor(_0) {
  return __async(this, arguments, function* (url, referer = MAIN_URL) {
    if (!url) {
      console.log("[EXTRACTOR] Empty URL");
      return [];
    }
    console.log("[EXTRACTOR] Processing:", url);
    try {
      const hostname = new URL(url).hostname.toLowerCase();
      if (url.includes("?id=") || hostname.includes("techyboy") || hostname.includes("gdtot")) {
        const resolved = yield getRedirectLinks(url);
        if (resolved && resolved !== url) {
          return yield loadExtractor(resolved, url);
        }
        return [];
      }
      if (hostname.includes("hubcloud")) {
        return yield hubCloudExtractor(url, referer);
      }
      if (hostname.includes("hubcdn")) {
        return yield hubCdnExtractor(url, referer);
      }
      if (hostname.includes("hubdrive")) {
        return yield hubDriveExtractor(url, referer);
      }
      if (hostname.includes("pixeldrain")) {
        return yield pixelDrainExtractor(url);
      }
      if (hostname.includes("hubstream")) {
        return yield hubstreamExtractor(url, referer);
      }
      if (hostname.includes("hblinks")) {
        const response = yield fetchWithRetry(url, { Referer: referer });
        const html = yield response.text();
        const linkRegex = /<a[^>]*href=["']([^"']*)["'][^>]*>/gi;
        const links = [];
        let match;
        while ((match = linkRegex.exec(html)) !== null) {
          const href = match[1];
          if (href && href.startsWith("http")) {
            if (href.includes("hblinks.dad") && !href.includes("/archives/")) {
              continue;
            }
            links.push(href);
          }
        }
        console.log(`[HBLINKS] Found ${links.length} valid links - processing in parallel`);
        const extractionPromises = links.map((link) => loadExtractor(link, url));
        const allResults = yield Promise.all(extractionPromises);
        return allResults.flat();
      }
      console.log("[EXTRACTOR] No matching extractor");
      return [];
    } catch (err) {
      console.log("[EXTRACTOR] Error:", err.message);
      return [];
    }
  });
}
function extractLinksInParallel(links, referer) {
  return __async(this, null, function* () {
    console.log(`[Parallel Extraction] Processing ${links.length} links simultaneously...`);
    const startTime = Date.now();
    const extractionPromises = links.map(
      (link) => loadExtractor(link, referer).catch((err) => {
        console.log(`[Parallel Extraction] Error on ${link}:`, err.message);
        return [];
      })
    );
    const allResults = yield Promise.all(extractionPromises);
    const elapsed = Date.now() - startTime;
    const totalStreams = allResults.flat().length;
    console.log(`[Parallel Extraction] Completed in ${elapsed}ms - Found ${totalStreams} streams`);
    return allResults.flat();
  });
}
function extractLinksWithMetadata(html, mediaType, season, episode) {
  const linksWithMetadata = [];
  const isValidStreamLink = (href, rawText) => {
    if (!href)
      return false;
    const hrefLower = href.toLowerCase();
    const cleanText = (rawText || "").replace(/<[^>]+>/g, "").trim();
    const textLower = cleanText.toLowerCase();
    const isRelative = hrefLower.startsWith("/") || hrefLower.startsWith("#");
    const isSelfHost = hrefLower.includes("hdhub4u") || hrefLower.includes("4khdhub");
    const isSocialOrDB = hrefLower.includes("discord") || hrefLower.includes("themoviedb.org") || hrefLower.includes("imdb.com");
    const isTemplate = hrefLower.includes("{{") || hrefLower.includes("cdn-cgi");
    const isBadUrl = isRelative || isSelfHost || isSocialOrDB || isTemplate;
    const hasWatch = textLower.includes("watch");
    const hasPack = textLower.includes("pack");
    const has480p = textLower.includes("480p");
    const has720p = textLower.includes("720p");
    const isEmpty = cleanText === "";
    const isBadText = hasWatch || hasPack || has480p || has720p || isEmpty;
    return !isBadUrl && !isBadText;
  };
  if (mediaType === "movie") {
    const linkRegex = new RegExp(`<a[^>]*href=["']([^"']*)["'][^>]*>(.*?)<\\/a>`, "gis");
    let match;
    while ((match = linkRegex.exec(html)) !== null) {
      const href = match[1];
      const rawText = match[2];
      if (isValidStreamLink(href, rawText)) {
        linksWithMetadata.push({
          url: href,
          requiresQualityCheck: false,
          preFilteredQuality: true
        });
      }
    }
  } else if (mediaType === "tv" && season && episode) {
    const targetEp = parseInt(episode);
    const nextEp = targetEp + 1;
    const currentEpRegex = new RegExp(`<(?:h[1-6]|strong|span|a)[^>]*>\\s*(?:Episode|Ep|E|EPiSODE)\\s*0?${targetEp}\\b`, "i");
    const nextEpRegex = new RegExp(`<(?:h[1-6]|strong|span|a)[^>]*>\\s*(?:Episode|Ep|E|EPiSODE)\\s*0?${nextEp}\\b`, "i");
    const startMatch = html.match(currentEpRegex);
    if (startMatch) {
      const startIndex = startMatch.index;
      const nextMatch = html.substring(startIndex + 10).match(nextEpRegex);
      const endIndex = nextMatch ? startIndex + 10 + nextMatch.index : startIndex + 6e3;
      const episodeSlice = html.substring(startIndex, endIndex);
      console.log(`[TV] Analyzing slice for Episode ${targetEp} (${episodeSlice.length} chars)`);
      if (/\b(1080p|2160p|4k|uhd|720p|480p)\b/i.test(episodeSlice)) {
        console.log("[TV] Quality labels found in episode block. Filtering at HTML stage.");
        const qualityMarkerRegex = /\b(720p|480p|360p|1080p|2160p|4k|uhd)\b/gi;
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
          const zoneLinks = /<a[^>]*href=["']([^"']+)["'][^>]*>(.*?)<\/a>/gi;
          let linkMatch;
          let foundLinks = 0;
          while ((linkMatch = zoneLinks.exec(searchZone)) !== null) {
            const href = linkMatch[1];
            const rawText = linkMatch[2];
            if (isValidStreamLink(href, rawText)) {
              console.log(`[TV]   \u2192 Found valid link: ${href}`);
              foundLinks++;
              linksWithMetadata.push({
                url: href,
                requiresQualityCheck: false,
                preFilteredQuality: true
              });
            }
          }
          if (foundLinks === 0) {
            console.log("[TV]   \u2192 No links found in this zone");
          }
        }
      } else {
        console.log("[TV] No quality labels in episode block. Will check quality during extraction.");
        const linkRegex = /<a[^>]*href=["']([^"']+)["'][^>]*>(.*?)<\/a>/gi;
        let match;
        while ((match = linkRegex.exec(episodeSlice)) !== null) {
          const href = match[1];
          const rawText = match[2];
          if (isValidStreamLink(href, rawText)) {
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
  const seen = /* @__PURE__ */ new Set();
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
  return linksWithMetadata.map((meta) => meta.url);
}
function getStreams(tmdbId, mediaType, season, episode) {
  return __async(this, null, function* () {
    console.log("[HDHub4u] Starting:", tmdbId, mediaType, season, episode);
    if (!DISABLE_CACHE_FOR_TESTING) {
      try {
        const cachedResult = yield getCachedStreams(tmdbId, mediaType, season, episode);
        if (cachedResult) {
          console.log(`[HDHub4u] \u26A1 Returning ${cachedResult.length} cached streams from API`);
          triggerDomainUpdate();
          return cachedResult;
        }
      } catch (error) {
        console.log("[HDHub4u] Cache fetch error, continuing with fresh fetch:", error.message);
      }
    } else {
      console.log("[CACHE] \u26A0\uFE0F  DISABLED FOR TESTING - Fresh fetch every time");
    }
    try {
      let parseSizeToBytes = function(sizeStr) {
        if (!sizeStr)
          return 0;
        const match = sizeStr.match(/([\d.]+)\s*(GB|MB|KB|B)/i);
        if (!match)
          return 0;
        const value = parseFloat(match[1]);
        const unit = match[2].toUpperCase();
        const multipliers = {
          "B": 1,
          "KB": 1024,
          "MB": 1024 * 1024,
          "GB": 1024 * 1024 * 1024
        };
        return value * (multipliers[unit] || 0);
      };
      triggerDomainUpdate();
      const tmdbUrl = `https://api.themoviedb.org/3/${mediaType}/${tmdbId}?api_key=342c3872f1357c6e1da3a5ac1ccc3605&append_to_response=external_ids`;
      const tmdbInfo = yield fetch(tmdbUrl).then((r) => r.json());
      const imdbId = tmdbInfo.imdb_id || tmdbInfo.external_ids && tmdbInfo.external_ids.imdb_id;
      let displayTitle = mediaType === "tv" ? tmdbInfo.name : tmdbInfo.title;
      let year = "";
      if (mediaType === "movie" && tmdbInfo.release_date) {
        year = tmdbInfo.release_date.split("-")[0];
      } else if (mediaType === "tv" && tmdbInfo.first_air_date) {
        year = tmdbInfo.first_air_date.split("-")[0];
      }
      const webStreamrPromise = (() => __async(this, null, function* () {
        if (!imdbId)
          return [];
        console.log("[WebStreamr] Fetching streams for IMDb:", imdbId);
        return yield webstreamrExtractor(imdbId, mediaType, season, episode);
      }))();
      const nativeScrapePromise = (() => __async(this, null, function* () {
        try {
          const searchQueue = [];
          let updatedTitle2 = displayTitle;
          if (imdbId) {
            console.log("[HDHub4u] IMDb ID found:", imdbId);
            const [imdbRes, akasRes] = yield Promise.all([
              fetch(`https://api.imdbapi.dev/titles/${imdbId}`).then((r) => r.json()).catch(() => null),
              fetch(`https://api.imdbapi.dev/titles/${imdbId}/akas`).then((r) => r.json()).catch(() => ({ akas: [] }))
            ]);
            if (imdbRes) {
              if (imdbRes.originalTitle)
                searchQueue.push(imdbRes.originalTitle);
              if (imdbRes.primaryTitle && !searchQueue.includes(imdbRes.primaryTitle))
                searchQueue.push(imdbRes.primaryTitle);
              updatedTitle2 = imdbRes.originalTitle || imdbRes.primaryTitle;
            }
            if (akasRes && akasRes.akas) {
              const indianAkas = akasRes.akas.filter((aka) => aka.country && aka.country.code === "IN").map((aka) => aka.text).filter(text => /^[\w\s\-':.!&–—(),]+$/.test(text));
              indianAkas.forEach((aka) => {
                if (!searchQueue.includes(aka))
                  searchQueue.push(aka);
              });
            }
          }
          if (searchQueue.length === 0)
            searchQueue.push(updatedTitle2);
          const { results: searchResults, usedTitle: usedTitleForMatch } = yield performParallelSearch(searchQueue, year);
          if (searchResults.length === 0) {
            console.log("[HDHub4u] No search results - NOT caching empty result");
            return { nativeStreams: [], updatedTitle: updatedTitle2 };
          }
          const bestMatch = searchResults.find((r) => {
            if (mediaType === "tv" && season) {
              return r.title.toLowerCase().includes(`season ${season}`);
            }
            return true;
          });
          if (!bestMatch) {
            console.log("[HDHub4u] No valid match found - NOT caching empty result");
            return { nativeStreams: [], updatedTitle: updatedTitle2 };
          }
          console.log("[HDHub4u] Found Page:", bestMatch.title);
          const pageHtml = yield fetchText(bestMatch.url);
          const linksToProcess = extractLinks(pageHtml, mediaType, season, episode);
          console.log(`[HDHub4u] Found ${linksToProcess.length} candidate links`);
          const extractedResults = yield extractLinksInParallel(linksToProcess, bestMatch.url);
          const nativeStreams2 = [];
          extractedResults.forEach((res) => {
            if (!res || !res.url || res.quality === "Unknown")
              return;
            if (res.quality.includes("480p") || res.quality.includes("720p"))
              return;
            const finalUrl = transformToProxyUrl(res.url);
            nativeStreams2.push({
              name: res.quality,
              title: `${updatedTitle2}${year ? ` (${year})` : ""} ${mediaType === "tv" ? `S${season}E${episode}` : ""}`,
              url: finalUrl,
              size: formatBytes(res.size),
              headers: HEADERS
            });
          });
          return { nativeStreams: nativeStreams2, updatedTitle: updatedTitle2 };
        } catch (err) {
          console.log("[HDHub4u Native Scrape Error]:", err.message);
          return { nativeStreams: [], updatedTitle: displayTitle };
        }
      }))();
      const [webstreamrResults, { nativeStreams, updatedTitle }] = yield Promise.all([
        webStreamrPromise.catch(() => []),
        // Catch WebStreamr errors so it doesn't crash everything
        nativeScrapePromise
      ]);
      const finalStreams = [...nativeStreams];
      if (Array.isArray(webstreamrResults)) {
        webstreamrResults.forEach((res) => {
          if (!res || !res.url)
            return;
          finalStreams.push({
            name: res.quality,
            title: `${updatedTitle}${year ? ` (${year})` : ""} ${mediaType === "tv" ? `S${season}E${episode}` : ""}`,
            url: transformToProxyUrl(res.url),
            size: res.sizeText || formatBytes(res.size),
            headers: HEADERS
          });
        });
      }
      const sortedStreams = finalStreams.sort((a, b) => {
        const qOrder = { "2160p": 10, "4k": 10, "1080p": 8 };
        const aCleanName = a.name.toLowerCase().replace(/\./g, "").trim();
        const bCleanName = b.name.toLowerCase().replace(/\./g, "").trim();
        const aOrder = qOrder[aCleanName] || 0;
        const bOrder = qOrder[bCleanName] || 0;
        if (bOrder !== aOrder) {
          return bOrder - aOrder;
        }
        return parseSizeToBytes(b.size) - parseSizeToBytes(a.size);
      });
      const numberedStreams = sortedStreams.map((stream, index) => __spreadProps(__spreadValues({}, stream), {
        name: `${index + 1}. ${stream.name}`
        // "1. 1080p", "2. 2160p", etc.
      }));
      if (numberedStreams.length === 0) {
        console.log("[HDHub4u] No valid streams extracted - NOT caching empty result");
        return [];
      }
      if (!DISABLE_CACHE_FOR_TESTING) {
        setCachedStreams(tmdbId, mediaType, season, episode, numberedStreams, 3600).then(() => {
          console.log(`[API-CACHE] \u2705 Cached ${numberedStreams.length} streams in background`);
          return getCacheStats();
        }).then((stats) => {
          console.log(`[API-CACHE] Stats: ${stats.totalEntries || 0} entries, ${stats.totalSize || 0} total streams`);
        }).catch((error) => {
          console.log("[API-CACHE] Background save error (non-critical):", error.message);
        });
      } else {
        console.log("[CACHE] \u26A0\uFE0F  Not saving to cache (testing mode)");
      }
      console.log(`[HDHub4u] \u2705 Returning ${numberedStreams.length} streams to user`);
      return numberedStreams;
    } catch (error) {
      console.error("[HDHub4u] Critical Error:", error);
      return [];
    }
  });
}
