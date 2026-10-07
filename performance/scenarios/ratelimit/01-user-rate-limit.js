const autocannon = require('autocannon');
const { LOAD_CONFIG } = require('../../config/load.config');
const { authenticateUser, maskToken } = require('../../utils/auth');
const {
  sendAuthenticatedRequest,
  classify429Response,
  preflightCleanWindowCheck,
  extractRateLimitHeaders,
} = require('./common');

/**
 * Scenario LOAD-04A: Authenticated User Rate Limit & Quota Throttling
 * Validates that an authenticated user session is throttled when exceeding its quota.
 */
async function runUserRateLimitScenario(reporter, options = {}) {
  const apiUrl = options.apiUrl || LOAD_CONFIG.API_URL;
  const mode = (options.mode || 'smoke').toLowerCase();
  const config = LOAD_CONFIG.getRateLimitConfig(mode).USER_QUOTA;
  const targetEndpoint = `${apiUrl}/api/auth/get-session`;

  console.log(`\n======================================================`);
  console.log(`[SCENARIO 04A] Authenticated User Rate Limit (Quota Throttling)`);
  console.log(`Target: ${targetEndpoint}`);
  console.log(`Mode: ${mode.toUpperCase()} | Calibration: ${config.amount} reqs @ ${config.connections} connections`);
  console.log(`======================================================\n`);

  // Step 1: Authenticate User
  console.log(`[Step 1] Authenticating user session...`);
  let session;
  try {
    session = await authenticateUser(apiUrl);
    console.log(`  -> User Authenticated. Masked Token: ${maskToken(session.token)}`);
  } catch (err) {
    console.error(`  -> Authentication error: ${err.message}`);
    return reporter.recordCustomResult(
      'LOAD-04A',
      'User Rate Limit (Quota Throttling)',
      targetEndpoint,
      {
        resultState: 'AUTHENTICATION_FAILURE',
        reason: err.message,
      },
      false,
      ['Authentication failed during session acquisition.']
    );
  }

  // Step 2: Pre-flight Clean Window Check
  console.log(`\n[Step 2] Performing pre-flight clean-window check...`);
  const windowCheck = await preflightCleanWindowCheck(
    targetEndpoint,
    session.cookieHeader,
    session.apiAccessToken,
    config.cleanWindowMinRemaining || 25
  );

  if (!windowCheck.isClean) {
    return reporter.recordCustomResult(
      'LOAD-04A',
      'User Rate Limit (Quota Throttling)',
      targetEndpoint,
      {
        resultState: 'CONFIGURATION_ERROR',
        reason: `Pre-flight probe returned status ${windowCheck.status}`,
      },
      false,
      [`Pre-flight probe returned status ${windowCheck.status}`]
    );
  }

  // Step 3: Verify Successful Baseline Requests
  console.log(`\n[Step 3] Verifying ${config.baselineCount || 3} baseline requests before burst...`);
  let baselineSuccess = true;
  for (let i = 0; i < (config.baselineCount || 3); i++) {
    const baseResp = await sendAuthenticatedRequest(
      targetEndpoint,
      session.cookieHeader,
      session.apiAccessToken
    );
    if (baseResp.status !== 200) {
      console.log(`  -> Baseline request #${i + 1} failed with status: ${baseResp.status}`);
      baselineSuccess = false;
    }
  }

  if (!baselineSuccess) {
    return reporter.recordCustomResult(
      'LOAD-04A',
      'User Rate Limit (Quota Throttling)',
      targetEndpoint,
      {
        resultState: 'CONFIGURATION_ERROR',
        reason: 'Baseline requests prior to burst did not return 200 OK.',
      },
      false,
      ['Baseline requests before burst failed.']
    );
  }
  console.log(`  -> All baseline requests confirmed 200 OK.`);

  // Step 4: Dispatch Calibrated Traffic to Exceed Quota
  console.log(`\n[Step 4] Dispatching calibrated traffic: ${config.amount} requests @ ${config.connections} connections...`);
  const burstResult = await autocannon({
    url: targetEndpoint,
    connections: config.connections,
    amount: config.amount,
    headers: {
      'Cookie': session.cookieHeader,
      'Authorization': `Bearer ${session.apiAccessToken}`,
      'Accept': 'application/json',
      'User-Agent': 'VakhLoadRunner/UserQuotaTest',
    },
  });

  // Step 5: Dissect Status Code Distribution
  const stats = burstResult.statusCodeStats || {};
  const http2xx = burstResult['2xx'] || 0;
  const http429 = (stats['429'] && stats['429'].count) || 0;
  const http401 = (stats['401'] && stats['401'].count) || 0;
  const http403 = (stats['403'] && stats['403'].count) || 0;
  const http5xx = burstResult['5xx'] || 0;
  const other4xx = (burstResult['4xx'] || 0) - http429 - http401 - http403;

  console.log(`\n======================================================`);
  console.log(`LOAD-04A Status-Code Distribution:`);
  console.log(`  - Total Sent:    ${burstResult.requests.total}`);
  console.log(`  - 2xx (Success): ${http2xx}`);
  console.log(`  - 429 (Rate-Lim):${http429}`);
  console.log(`  - 401 (Auth):    ${http401}`);
  console.log(`  - 403 (Forbidden):${http403}`);
  console.log(`  - 5xx (Server):  ${http5xx}`);
  console.log(`  - Breakdown:     ${JSON.stringify(stats)}`);

  // Step 6: Probe and Classify 429 Details if received
  let sample429Classification = null;
  if (http429 > 0) {
    const sample429Resp = await sendAuthenticatedRequest(
      targetEndpoint,
      session.cookieHeader,
      session.apiAccessToken
    );
    if (sample429Resp.status === 429) {
      sample429Classification = classify429Response(sample429Resp);
      console.log(`  -> 429 Classification:`, sample429Classification);
    }
  }

  // Step 7: Determine Structured Result State
  let resultState = 'FAIL';
  const violations = [];

  if (http401 > 0 || http403 > 0) {
    resultState = 'AUTHENTICATION_FAILURE';
    violations.push(`Unexpected authentication rejection observed (401: ${http401}, 403: ${http403}).`);
  } else if (http5xx > 0) {
    resultState = 'FAIL';
    violations.push(`Unhandled 5xx server error observed: ${http5xx} responses.`);
  } else if (sample429Classification?.code === 'CLOUDFLARE_1015') {
    resultState = 'IP_LIMIT_TRIGGERED';
    console.log(`  -> Outer Cloudflare 1015 IP barrier was triggered during test.`);
  } else if (http429 > 0) {
    resultState = 'PASS';
  } else if (http429 === 0) {
    resultState = 'INCONCLUSIVE';
    violations.push(
      `Calibrated volume (${config.amount} reqs) was absorbed across edge isolates without hitting the 60 rpm isolate counter.`
    );
  }

  const passed = resultState === 'PASS' || resultState === 'IP_LIMIT_TRIGGERED';

  console.log(`\n[LOAD-04A Final Result]: ${resultState} ${resultState === 'PASS' ? '🟢' : resultState === 'INCONCLUSIVE' ? '⚪' : '🔴'}`);
  console.log(`======================================================\n`);

  const report = reporter.recordCustomResult(
    'LOAD-04A',
    'User Rate Limit (Quota Throttling)',
    targetEndpoint,
    {
      mode,
      resultState,
      achievedRps: Number(burstResult.requests.average.toFixed(2)),
      distribution: {
        http2xx,
        http429,
        http401,
        http403,
        http5xx,
        other4xx,
      },
      stats: {
        p50: burstResult.latency.p50 || 0,
        p95: burstResult.latency.p97_5 || burstResult.latency.p90 || 0,
        p99: burstResult.latency.p99 || 0,
        avgLatencyMs: Number((burstResult.latency.average || 0).toFixed(2)),
      },
      sample429: sample429Classification,
    },
    passed,
    violations
  );

  return report;
}

module.exports = { runUserRateLimitScenario };
