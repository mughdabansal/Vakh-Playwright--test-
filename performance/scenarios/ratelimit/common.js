const https = require('https');
const http = require('http');

/**
 * Dispatches a single HTTP request using session credentials.
 */
function sendAuthenticatedRequest(url, cookieHeader, bearerToken, options = {}) {
  return new Promise((resolve) => {
    const parsed = new URL(url);
    const client = parsed.protocol === 'https:' ? https : http;

    const headers = {
      'Accept': 'application/json',
      'User-Agent': options.userAgent || 'VakhLoadRunner/1.0',
    };
    if (cookieHeader) headers['Cookie'] = cookieHeader;
    if (bearerToken) headers['Authorization'] = `Bearer ${bearerToken}`;

    const req = client.request({
      hostname: parsed.hostname,
      port: parsed.port || (parsed.protocol === 'https:' ? 443 : 80),
      path: parsed.pathname + parsed.search,
      method: options.method || 'GET',
      headers,
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        resolve({
          status: res.statusCode,
          headers: res.headers,
          body: data,
        });
      });
    });

    req.on('error', (err) => {
      resolve({ status: 0, headers: {}, body: '', error: err.message });
    });
    req.end();
  });
}

/**
 * Normalizes rate-limit headers.
 */
function extractRateLimitHeaders(headers = {}) {
  return {
    retryAfter: headers['retry-after'],
    limit: headers['x-ratelimit-limit'],
    remaining: headers['x-ratelimit-remaining'],
    reset: headers['x-ratelimit-reset'],
    cfRay: headers['cf-ray'],
    server: headers['server'],
    contentType: headers['content-type'],
  };
}

/**
 * Classifies an HTTP 429 response to identify whether it originated from:
 * 1. Cloudflare Edge WAF (Error 1015)
 * 2. Application-level middleware (Hono/Better-Auth RATE_LIMIT_EXCEEDED)
 * 3. Unknown edge layer
 */
function classify429Response(response) {
  if (!response || response.status !== 429) return null;

  const bodyStr = typeof response.body === 'string' ? response.body : '';
  const contentType = response.headers?.['content-type'] || '';
  const headers = extractRateLimitHeaders(response.headers);

  // Cloudflare Edge WAF 1015
  if (bodyStr.includes('error code: 1015') || (contentType.includes('text/plain') && bodyStr.includes('1015'))) {
    return {
      layer: 'CLOUDFLARE_EDGE_WAF',
      code: 'CLOUDFLARE_1015',
      message: 'Cloudflare WAF Error 1015 (IP-level rate limit exceeded at CDN edge)',
      headers,
    };
  }

  // Application Middleware JSON error
  if (contentType.includes('application/json')) {
    try {
      const parsed = JSON.parse(bodyStr);
      return {
        layer: 'APPLICATION_MIDDLEWARE',
        code: parsed.code || 'RATE_LIMIT_EXCEEDED',
        requestId: parsed.requestId,
        message: parsed.message || 'Application middleware rate limit exceeded',
        headers,
      };
    } catch {
      // JSON parse error fallback
    }
  }

  return {
    layer: 'UNKNOWN_EDGE',
    code: 'UNKNOWN_429',
    message: bodyStr.slice(0, 150),
    headers,
  };
}

/**
 * Performs a pre-flight probe and waits for a fresh window if quota is already degraded.
 */
async function preflightCleanWindowCheck(url, cookieHeader, bearerToken, minRemaining = 25) {
  console.log(`  -> Running pre-flight clean-window check on ${url}...`);
  const probe = await sendAuthenticatedRequest(url, cookieHeader, bearerToken);

  if (probe.status !== 200) {
    console.log(`  -> Pre-flight probe returned non-200 status: ${probe.status}`);
    return { isClean: false, status: probe.status, remaining: null };
  }

  const remaining = probe.headers['x-ratelimit-remaining'];
  const reset = probe.headers['x-ratelimit-reset'];

  if (remaining !== undefined && Number(remaining) < minRemaining) {
    const currentEpoch = Math.floor(Date.now() / 1000);
    const waitSec = Math.min(60, Math.max(2, (Number(reset) - currentEpoch) + 2));
    console.log(`  -> Window exhausted/low (Remaining: ${remaining} < ${minRemaining}). Pausing ${waitSec}s for window reset...`);
    await new Promise(r => setTimeout(r, waitSec * 1000));
    
    // Re-verify
    const secondProbe = await sendAuthenticatedRequest(url, cookieHeader, bearerToken);
    const newRemaining = secondProbe.headers['x-ratelimit-remaining'];
    console.log(`  -> Window refreshed. New Remaining: ${newRemaining}`);
    return { isClean: true, status: secondProbe.status, remaining: newRemaining };
  }

  console.log(`  -> Window is clean (Remaining: ${remaining || 'unmetered'}). Ready.`);
  return { isClean: true, status: probe.status, remaining };
}

module.exports = {
  sendAuthenticatedRequest,
  extractRateLimitHeaders,
  classify429Response,
  preflightCleanWindowCheck,
};
