const autocannon = require('autocannon');
const { LOAD_CONFIG } = require('../../config/load.config');
const { authenticateUser, maskToken } = require('../../utils/auth');
const {
  sendAuthenticatedRequest,
  classify429Response,
  extractRateLimitHeaders,
} = require('./common');

/**
 * Scenario LOAD-04B: Outer IP Rate Limit & Flood Defense
 * Validates that the outer IP protection layer protects the origin from excessive traffic from a single IP.
 */
async function runIpRateLimitScenario(reporter, options = {}) {
  const apiUrl = options.apiUrl || LOAD_CONFIG.API_URL;
  const mode = (options.mode || 'smoke').toLowerCase();
  const config = LOAD_CONFIG.getRateLimitConfig(mode).IP_BARRIER;
  const targetEndpoint = `${apiUrl}/api/auth/get-session`;

  console.log(`\n======================================================`);
  console.log(`[SCENARIO 04B] Outer IP Rate Limit & Flood Defense`);
  console.log(`Target: ${targetEndpoint}`);
  console.log(`Mode: ${mode.toUpperCase()} | Calibration: ${config.amount} reqs @ ${config.connections} connections`);
  console.log(`======================================================\n`);

  // Step 1: Authenticate Session
  console.log(`[Step 1] Authenticating session for outer IP barrier test...`);
  let session;
  try {
    session = await authenticateUser(apiUrl);
    console.log(`  -> Authenticated. Masked Token: ${maskToken(session.token)}`);
  } catch (err) {
    console.error(`  -> Authentication error: ${err.message}`);
    return reporter.recordCustomResult(
      'LOAD-04B',
      'IP Rate Limit (Flood Defense)',
      targetEndpoint,
      {
        resultState: 'AUTHENTICATION_FAILURE',
        reason: err.message,
      },
      false,
      ['Authentication failed.']
    );
  }

  // Step 2: Dispatch High-Volume Traffic
  console.log(`\n[Step 2] Dispatching flood traffic: ${config.amount} requests @ ${config.connections} connections...`);
  const floodResult = await autocannon({
    url: targetEndpoint,
    connections: config.connections,
    amount: config.amount,
    headers: {
      'Cookie': session.cookieHeader,
      'Authorization': `Bearer ${session.apiAccessToken}`,
      'Accept': 'application/json',
      'User-Agent': 'VakhLoadRunner/IpBarrierTest',
    },
  });

  // Step 3: Dissect HTTP Status Codes
  const stats = floodResult.statusCodeStats || {};
  const http2xx = floodResult['2xx'] || 0;
  const http429 = (stats['429'] && stats['429'].count) || 0;
  const http401 = (stats['401'] && stats['401'].count) || 0;
  const http403 = (stats['403'] && stats['403'].count) || 0;
  const http5xx = floodResult['5xx'] || 0;
  const other4xx = (floodResult['4xx'] || 0) - http429 - http401 - http403;

  console.log(`\n======================================================`);
  console.log(`LOAD-04B Status-Code Distribution:`);
  console.log(`  - Total Sent:    ${floodResult.requests.total}`);
  console.log(`  - 2xx (Success): ${http2xx}`);
  console.log(`  - 429 (Rate-Lim):${http429}`);
  console.log(`  - 401 (Auth):    ${http401}`);
  console.log(`  - 403 (Forbidden):${http403}`);
  console.log(`  - 5xx (Server):  ${http5xx}`);
  console.log(`  - Breakdown:     ${JSON.stringify(stats)}`);

  // Step 4: Classify 429 Mechanism
  let ipDefenseLayer = 'NONE_TRIGGERED';
  let sample429Classification = null;

  if (http429 > 0) {
    const probe = await sendAuthenticatedRequest(
      targetEndpoint,
      session.cookieHeader,
      session.apiAccessToken
    );
    if (probe.status === 429) {
      sample429Classification = classify429Response(probe);
      ipDefenseLayer = sample429Classification.layer;
      console.log(`  -> 429 Defense Layer Identified: ${sample429Classification.layer} (${sample429Classification.code})`);
      console.log(`  -> Details: ${sample429Classification.message}`);
    }
  }

  // Step 5: Evaluate Result State
  let resultState = 'FAIL';
  const violations = [];

  if (http5xx > 0) {
    resultState = 'FAIL';
    violations.push(`Unhandled 5xx server errors detected during flood: ${http5xx}`);
  } else if (http429 > 0) {
    resultState = 'PASS';
    console.log(`  -> Outer IP rate-limiting engaged successfully as expected (${http429} 429s).`);
  } else {
    resultState = 'INCONCLUSIVE';
    violations.push(`Flood of ${config.amount} requests did not trigger IP-level 429 response.`);
  }

  const passed = resultState === 'PASS';

  console.log(`\n[LOAD-04B Final Result]: ${resultState} ${passed ? '🟢' : '🔴'}`);
  console.log(`======================================================\n`);

  const report = reporter.recordCustomResult(
    'LOAD-04B',
    'IP Rate Limit (Flood Defense)',
    targetEndpoint,
    {
      mode,
      resultState,
      defenseLayer: ipDefenseLayer,
      achievedRps: Number(floodResult.requests.average.toFixed(2)),
      distribution: {
        http2xx,
        http429,
        http401,
        http403,
        http5xx,
        other4xx,
      },
      stats: {
        p50: floodResult.latency.p50 || 0,
        p95: floodResult.latency.p97_5 || floodResult.latency.p90 || 0,
        p99: floodResult.latency.p99 || 0,
        avgLatencyMs: Number((floodResult.latency.average || 0).toFixed(2)),
      },
      sample429: sample429Classification,
    },
    passed,
    violations
  );

  return report;
}

module.exports = { runIpRateLimitScenario };
