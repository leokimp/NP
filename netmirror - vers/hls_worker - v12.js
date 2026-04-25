/**
 * ╔══════════════════════════════════════════════════════════════════════════════╗
 * ║        NetMirror HLS Header-Injection Proxy — Cloudflare Worker  v2         ║
 * ╠══════════════════════════════════════════════════════════════════════════════╣
 * ║  v2 fixes:                                                                   ║
 * ║    1. Cookie injection — net52.cc requires hd=on cookie to serve HD video    ║
 * ║       lines in the M3U8. Without it, q=1080p returns audio-only manifest.   ║
 * ║    2. Platform-aware OTT cookie — extracted from URL path (/pv/, /hs/, …)   ║
 * ║    3. Incomplete M3U8 healing — if master has no #EXT-X-STREAM-INF video    ║
 * ║       lines, automatically fetches quality-agnostic master, extracts the    ║
 * ║       matching quality video URL, and injects it into the manifest.          ║
 * ║    4. Range request forwarding — segments need Range forwarded to CDN.       ║
 * ╚══════════════════════════════════════════════════════════════════════════════╝
 */

// ─── Constants (data.md §1 / §14) ────────────────────────────────────────────

const APP_UA  = 'Mozilla/5.0 (Linux; Android 16; CPH2723 Build/AP3A.240617.008; wv) ' +
                'AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 ' +
                'Chrome/146.0.7680.178 Mobile Safari/537.36 /OS.Gatu v3.0';
const NM_BASE = 'https://net52.cc';

// ─── Domain allowlist ─────────────────────────────────────────────────────────

const ALLOWED_PATTERNS = [
  'net52.cc',
  'freecdn',           // freecdn1.top, freecdn2.top, freecdn31.top …
  'subscdn.top',
  'nfmirrorcdn.top',
];

function isAllowed(url) {
  try {
    const host = new URL(url).hostname;
    return ALLOWED_PATTERNS.some(p => host === p || host.endsWith('.' + p) || host.includes(p));
  } catch { return false; }
}

// ─── Header / Cookie builders ─────────────────────────────────────────────────

/**
 * Derive the OTT cookie value from the URL path.
 *   /mobile/pv/hls/ → pv
 *   /mobile/hs/hls/ → hs
 *   /mobile/hls/    → nf  (default)
 *
 * data.md §3: ott cookie drives platform selection on net52.cc.
 */
function ottFromPath(pathname) {
  if (pathname.includes('/pv/')) return 'pv';
  if (pathname.includes('/hs/')) return 'hs';
  return 'nf';
}

/**
 * Build headers for net52.cc/mobile/hls/* requests.
 *
 * KEY FIX (v2): The server checks the `hd=on` COOKIE (not just the URL param)
 * before including 1080p video stream lines in the M3U8 response. Without the
 * cookie, q=1080p returns an audio-only manifest with no #EXT-X-STREAM-INF lines.
 *
 * We also send `lang` and `ott` to match exactly what the real app sends.
 * data.md §2: full cookie jar = t_hash_t + hd + lang + ott.
 * We omit t_hash_t since `in=` token in the URL already handles auth.
 */
function net52Headers(upstreamUrl) {
  const urlObj    = new URL(upstreamUrl);
  const ott       = ottFromPath(urlObj.pathname);
  const langParam = urlObj.searchParams.get('lang') || 'hin';

  return {
    'User-Agent'      : APP_UA,
    'Accept'          : '*/*',
    'Accept-Language' : 'en-IN,en-US;q=0.9,en;q=0.8',
    'X-Requested-With': 'app.netmirror.netmirrornew',
    'Referer'         : NM_BASE + '/mobile/home?app=1',
    'Sec-Fetch-Mode'  : 'cors',
    'Sec-Fetch-Dest'  : 'empty',
    // ↓ THE CRITICAL ADDITION: hd=on cookie unlocks 1080p video lines in M3U8
    'Cookie'          : `hd=on; lang=${langParam}; ott=${ott}`,
  };
}

/**
 * Headers for freecdn*.top CDN requests.
 * data.md §14 CDN block / §20: no cookies on CDN.
 */
function cdnHeaders() {
  return {
    'User-Agent'      : APP_UA,
    'Accept'          : '*/*',
    'Origin'          : NM_BASE,
    'Referer'         : NM_BASE + '/',
    'X-Requested-With': 'app.netmirror.netmirrornew',
    'Sec-Fetch-Site'  : 'cross-site',
    'Sec-Fetch-Mode'  : 'cors',
    'Sec-Fetch-Dest'  : 'empty',
  };
}

/** Headers for subtitle CDNs */
function subHeaders() {
  return {
    'User-Agent': APP_UA,
    'Referer'   : NM_BASE + '/',
    'Origin'    : NM_BASE,
  };
}

function headersForUrl(url) {
  const host = new URL(url).hostname;
  if (host === 'net52.cc' || host.endsWith('.net52.cc')) return net52Headers(url);
  if (host.includes('freecdn'))                           return cdnHeaders();
  return subHeaders();
}

// ─── M3U8 utilities ───────────────────────────────────────────────────────────

function absoluteUrl(raw, base) {
  if (!raw || raw.startsWith('data:')) return raw;
  if (raw.startsWith('https://') || raw.startsWith('http://')) return raw;
  if (raw.startsWith('//')) return 'https:' + raw;
  if (raw.startsWith('/')) return new URL(base).origin + raw;
  const baseDir = base.replace(/\?.*$/, '').replace(/\/[^/]*$/, '/');
  return baseDir + raw;
}

function proxyHref(upstreamUrl, workerOrigin) {
  return workerOrigin + '/proxy?url=' + encodeURIComponent(upstreamUrl);
}

/**
 * Rewrite every URL inside an M3U8 to route through the proxy.
 * Handles:
 *   - URI="…" attributes  (#EXT-X-MEDIA, #EXT-X-I-FRAME-STREAM-INF, …)
 *   - Plain URL lines     (sub-playlists, segments)
 */
function rewriteM3U8(text, finalUpstreamUrl, workerOrigin) {
  return text.split('\n').map(line => {
    const raw = line.trimEnd();

    // Tag with URI= attribute (audio tracks, i-frame playlists …)
    if (raw.startsWith('#') && raw.includes('URI="')) {
      return raw.replace(/URI="([^"]+)"/g, (_m, uri) => {
        const abs = absoluteUrl(uri, finalUpstreamUrl);
        return `URI="${proxyHref(abs, workerOrigin)}"`;
      });
    }

    // Pure directive / comment
    if (raw.startsWith('#') || raw === '') return line;

    // URL line
    const abs = absoluteUrl(raw, finalUpstreamUrl);
    return proxyHref(abs, workerOrigin);
  }).join('\n');
}

/** Does the M3U8 have at least one #EXT-X-STREAM-INF line (= has video)? */
function hasVideoStreams(text) {
  return text.includes('#EXT-X-STREAM-INF');
}

/**
 * Is this URL / content-type likely an M3U8 playlist?
 */
function looksLikeM3U8(url, contentType) {
  const ct = (contentType || '').toLowerCase();
  if (ct.includes('mpegurl') || ct.includes('x-mpegurl')) return true;
  const path = url.split('?')[0].toLowerCase();
  return path.endsWith('.m3u8') || path.endsWith('.m3u');
}

// ─── Incomplete M3U8 healer ───────────────────────────────────────────────────

/**
 * When net52.cc returns an audio-only master (no #EXT-X-STREAM-INF lines) for
 * a quality-specific request (q=1080p), we:
 *   1. Strip q= / hd= from the URL to build the full-quality master URL.
 *   2. Fetch that master (which has ALL quality stream lines).
 *   3. Find the #EXT-X-STREAM-INF + URL pair matching the requested quality.
 *   4. Rewrite the audio-only M3U8 URLs through the proxy.
 *   5. Append the missing video stream lines (also rewritten) at the end.
 *
 * Result: a synthetic master M3U8 that has the correct audio group + exactly
 * one video stream for the requested quality. Any compliant HLS player (mpv,
 * Exoplayer, AVPlayer) will mux them correctly.
 */
async function healIncompleteM3U8(audioOnlyText, originalUrl, finalUpstreamUrl, workerOrigin) {
  let quality = null;
  try {
    const urlObj = new URL(originalUrl);
    quality = urlObj.searchParams.get('q');   // e.g. '1080p'
  } catch {}

  if (!quality) {
    // No quality param — nothing to cross-reference; return what we have rewritten.
    return rewriteM3U8(audioOnlyText, finalUpstreamUrl, workerOrigin);
  }

  console.log(`[NetMirror Proxy] Healing incomplete M3U8 for quality=${quality}`);

  // Build the master URL: same base, strip q= and hd= params.
  let masterUrl;
  try {
    const mu = new URL(originalUrl);
    mu.searchParams.delete('q');
    mu.searchParams.delete('hd');
    masterUrl = mu.toString();
  } catch {
    return rewriteM3U8(audioOnlyText, finalUpstreamUrl, workerOrigin);
  }

  // Fetch the full master M3U8.
  let masterText, masterFinalUrl;
  try {
    const resp = await fetch(masterUrl, {
      headers : headersForUrl(masterUrl),
      redirect: 'follow',
    });
    if (!resp.ok) throw new Error('master HTTP ' + resp.status);
    masterText     = await resp.text();
    masterFinalUrl = resp.url || masterUrl;
  } catch (err) {
    console.log('[NetMirror Proxy] Master fetch failed: ' + err.message);
    return rewriteM3U8(audioOnlyText, finalUpstreamUrl, workerOrigin);
  }

  // If the master also has no video, nothing we can do.
  if (!hasVideoStreams(masterText)) {
    console.log('[NetMirror Proxy] Master also has no video streams — giving up heal');
    return rewriteM3U8(audioOnlyText, finalUpstreamUrl, workerOrigin);
  }

  // Scan master for the matching EXT-X-STREAM-INF + video URL pair.
  const lines           = masterText.split('\n');
  let targetStreamInf   = null;
  let targetVideoUrl    = null;

  for (let i = 0; i < lines.length - 1; i++) {
    const l = lines[i].trim();
    if (!l.startsWith('#EXT-X-STREAM-INF')) continue;

    const nextLine = lines[i + 1].trim();
    if (!nextLine || nextLine.startsWith('#')) continue;

    // Match the quality in the URL: …/1080p/… or …1080p.m3u8
    const qualityPattern = new RegExp('/' + quality.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '[/.]', 'i');
    if (qualityPattern.test(nextLine)) {
      targetStreamInf = l;
      targetVideoUrl  = nextLine;
      break;
    }
  }

  if (!targetVideoUrl) {
    console.log('[NetMirror Proxy] Could not find ' + quality + ' stream in master — using full master rewrite');
    return rewriteM3U8(masterText, masterFinalUrl, workerOrigin);
  }

  // Resolve + proxy the video URL.
  const absVideoUrl    = absoluteUrl(targetVideoUrl, masterFinalUrl);
  const proxiedVideoUrl = proxyHref(absVideoUrl, workerOrigin);

  // Rewrite the audio-only M3U8 (its audio URIs become proxy URLs).
  const rewrittenAudio = rewriteM3U8(audioOnlyText.trimEnd(), finalUpstreamUrl, workerOrigin);

  // Synthesise the complete master:
  //   [audio group definitions — rewritten]
  //   #EXT-X-STREAM-INF:…,AUDIO="aac",…
  //   <proxied 1080p video sub-playlist URL>
  const syntheticMaster = rewrittenAudio + '\n' + targetStreamInf + '\n' + proxiedVideoUrl + '\n';

  console.log('[NetMirror Proxy] Heal OK — injected ' + quality + ' video stream');
  return syntheticMaster;
}

// ─── CORS helpers ─────────────────────────────────────────────────────────────

const CORS = {
  'Access-Control-Allow-Origin' : '*',
  'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
  'Access-Control-Allow-Headers': '*',
  'Access-Control-Max-Age'      : '86400',
};

function err(body, status) {
  return new Response(body, { status, headers: CORS });
}

// ─── Main handler ─────────────────────────────────────────────────────────────

export default {
  async fetch(request, _env) {
    const reqUrl       = new URL(request.url);
    const workerOrigin = reqUrl.origin;

    // CORS preflight
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });

    // Health check
    if (reqUrl.pathname === '/health') {
      return new Response(
        JSON.stringify({ status: 'ok', worker: 'netmirror-hls-proxy', version: 2 }),
        { status: 200, headers: { ...CORS, 'Content-Type': 'application/json' } }
      );
    }

    // Root info
    if (reqUrl.pathname !== '/proxy') {
      return new Response(
        'NetMirror HLS Proxy v2\nGET /proxy?url=<url-encoded upstream URL>',
        { status: 200, headers: { ...CORS, 'Content-Type': 'text/plain' } }
      );
    }

    // ── Parse + validate target URL ───────────────────────────────────────

    const rawParam = reqUrl.searchParams.get('url');
    if (!rawParam) return err('Missing required param: url', 400);

    let upstreamUrl;
    try {
      upstreamUrl = decodeURIComponent(rawParam);
      new URL(upstreamUrl);   // validate
    } catch { return err('Invalid url param — must be a fully URL-encoded absolute URL', 400); }

    if (!isAllowed(upstreamUrl)) {
      return err(
        'Domain not permitted. Allowed: net52.cc, freecdn*.top, subscdn.top, nfmirrorcdn.top',
        403
      );
    }

    // ── Build fetch options ───────────────────────────────────────────────

    const upstreamHeaders = headersForUrl(upstreamUrl);

    // Forward Range header from the player to CDN (needed for segment byte-ranges).
    // Do NOT forward for net52.cc (it serves M3U8, not binary data).
    const rangeHeader = request.headers.get('range');
    const isCDNDomain = new URL(upstreamUrl).hostname.includes('freecdn');
    if (rangeHeader && isCDNDomain) {
      upstreamHeaders['Range'] = rangeHeader;
    }

    // ── Fetch upstream ────────────────────────────────────────────────────

    let upstreamResp;
    try {
      upstreamResp = await fetch(upstreamUrl, {
        method  : request.method === 'HEAD' ? 'HEAD' : 'GET',
        headers : upstreamHeaders,
        redirect: 'follow',
      });
    } catch (e) {
      return err('Upstream fetch failed: ' + e.message, 502);
    }

    if (!upstreamResp.ok && upstreamResp.status !== 206) {
      return err('Upstream ' + upstreamResp.status + ' for ' + upstreamUrl, upstreamResp.status);
    }

    // response.url is the final URL after any redirects (e.g. net52→CDN redirect).
    // Use it as the base for relative URL resolution inside M3U8.
    const finalUpstreamUrl = upstreamResp.url || upstreamUrl;
    const contentType      = upstreamResp.headers.get('content-type') || '';

    // ── M3U8: parse and rewrite ───────────────────────────────────────────

    if (looksLikeM3U8(finalUpstreamUrl, contentType)) {
      let text;
      try { text = await upstreamResp.text(); }
      catch (e) { return err('Failed to read M3U8: ' + e.message, 502); }

      let rewritten;

      if (!hasVideoStreams(text)) {
        // ── Incomplete M3U8 (audio-only) — attempt to heal ───────────────
        // This is the 1080p / hd=on bug: net52.cc omits video stream lines
        // when the hd=on cookie is absent. Even with the cookie fix, this
        // fallback ensures correctness for any edge case content.
        rewritten = await healIncompleteM3U8(text, upstreamUrl, finalUpstreamUrl, workerOrigin);
      } else {
        rewritten = rewriteM3U8(text, finalUpstreamUrl, workerOrigin);
      }

      return new Response(rewritten, {
        status : 200,
        headers: {
          ...CORS,
          'Content-Type'   : 'application/vnd.apple.mpegurl',
          'Cache-Control'  : 'no-cache, no-store',
          'Content-Length' : String(new TextEncoder().encode(rewritten).length),
        },
      });
    }

    // ── Binary segment / subtitle: stream directly ────────────────────────

    const passHeaders = { ...CORS };
    passHeaders['Content-Type'] = contentType || 'video/MP2T';

    // Honour upstream cache headers (segments are very long-lived per data.md §20)
    const cc = upstreamResp.headers.get('cache-control');
    if (cc) passHeaders['Cache-Control'] = cc;

    const cl = upstreamResp.headers.get('content-length');
    if (cl) passHeaders['Content-Length'] = cl;

    // Forward Content-Range if the CDN responded with a 206
    const cr = upstreamResp.headers.get('content-range');
    if (cr) passHeaders['Content-Range'] = cr;

    return new Response(upstreamResp.body, {
      status : upstreamResp.status,
      headers: passHeaders,
    });
  },
};
