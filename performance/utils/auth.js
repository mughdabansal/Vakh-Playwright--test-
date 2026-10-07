const https = require('https');
const http = require('http');
const { LOAD_CONFIG } = require('../config/load.config');

/**
 * Mask a token for secure logging (never logs complete token).
 */
function maskToken(token) {
  if (!token || typeof token !== 'string') return '[REDACTED]';
  if (token.length <= 8) return token.slice(0, 2) + '***';
  return token.slice(0, 4) + '...' + token.slice(-4);
}

/**
 * Authenticate a user via Better Auth email/password endpoint.
 * Extracts session cookie, JWT api_access_token, and session token.
 * Credentials resolved from environment variables or config.
 */
function authenticateUser(apiUrl = LOAD_CONFIG.API_URL, credentials = null) {
  return new Promise((resolve, reject) => {
    const creds = {
      email: process.env.VAKH_TEST_EMAIL || credentials?.email || LOAD_CONFIG.AUTH_USER.email,
      password: process.env.VAKH_TEST_PASSWORD || credentials?.password || LOAD_CONFIG.AUTH_USER.password,
    };

    if (!creds.email || !creds.password) {
      return reject(new Error('Authentication failed: Missing VAKH_TEST_EMAIL or VAKH_TEST_PASSWORD credentials.'));
    }

    const payload = JSON.stringify({
      email: creds.email,
      password: creds.password,
    });

    const parsed = new URL(apiUrl);
    const client = parsed.protocol === 'https:' ? https : http;

    const req = client.request({
      hostname: parsed.hostname,
      port: parsed.port || (parsed.protocol === 'https:' ? 443 : 80),
      path: '/api/auth/sign-in/email',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload),
        'Accept': 'application/json',
      },
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (res.statusCode !== 200) {
          return reject(new Error(`Authentication failed with status ${res.statusCode}: ${data}`));
        }

        const rawCookies = res.headers['set-cookie'] || [];
        const sessionCookiePart = rawCookies
          .map(c => c.split(';')[0].trim())
          .filter(part => part && part.includes('='))
          .join('; ');

        try {
          const body = JSON.parse(data);
          resolve({
            status: res.statusCode,
            cookieHeader: sessionCookiePart,
            token: body.token,
            apiAccessToken: body.api_access_token?.token,
            user: body.user,
          });
        } catch (err) {
          reject(new Error(`Failed to parse auth response JSON: ${err.message}`));
        }
      });
    });

    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

module.exports = { authenticateUser, maskToken };
