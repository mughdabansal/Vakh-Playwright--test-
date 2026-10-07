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
 * Scenario LOAD-04C: Authenticated User Identity Isolation (Pre-IP Barrier)
 * Validates that user-level limits are not cross-contaminated between distinct users
 * before the shared IP-level defense is triggered.
 */
async function runIdentityIsolationScenario(reporter, options = {}) {
  const apiUrl = options.apiUrl || LOAD_CONFIG.API_URL;
  const mode = (options.mode || 'smoke').toLowerCase();
  const config = LOAD_CONFIG.getRateLimitConfig(mode).IDENTITY_ISOLATION;
  const targetEndpoint = `${apiUrl}/api/auth/get-session`;

  console.log(`\n======================================================`);
  console.log(`[SCENARIO 04C] User Identity Isolation (Pre-IP Barrier)`);
  console.log(`Target: ${targetEndpoint}`);
  console.log(`Mode: ${mode.toUpperCase()} | Calibration: User A (${config.userAAmount} reqs @ ${config.userAConnections} conns) vs User B (${config.userBAmount} reqs)`);
  console.log(`======================================================\n`);

  // Step 1: Authenticate User A and User B Independently
  console.log(`[Step 1] Authenticating User A...`);
  let sessionA, sessionB;
  try {
    sessionA = await authenticateUser(apiUrl);
    console.log(`  -> User A Authenticated. Masked Token: ${maskToken(sessionA.token)}`);

    // Pacing buffer to respect sign-in rate limits
    await new Promise(r => setTimeout(r, 1000));

    console.log(`[Step 2] Authenticating User B independently...`);
    sessionB = await authenticateUser(apiUrl);
    console.log(`  -> User B Authenticated. Masked Token: ${maskToken(sessionB.token)}`);
  } catch (err) {
    console.error(`  -> Authentication error: ${err.message}`);
    return reporter.recordCustomResult(
      'LOAD-04C',
      'Identity Isolation (Pre-IP Barrier)',
      targetEndpoint,
      {
        resultState: 'AUTHENTICATION_FAILURE',
        reason: err.message,
      },
      false,
      ['Authentication failure during dual-identity provisioning.']
    );
  }

  // Step 2: Confirm Distinct Sessions
  const tokensAreDistinct = sessionA.token !== sessionB.token;
  const cookiesAreDistinct = sessionA.cookieHeader !== sessionB.cookieHeader;
  console.log(`\n[Step 3] Verifying Identity Distinction:`);
  console.log(`  - User A Token (Masked): ${maskToken(sessionA.token)}`);
  console.log(`  - User B Token (Masked): ${maskToken(sessionB.token)}`);
  console.log(`  - Distinct tokens verified: ${tokensAreDistinct ? 'CONFIRMED ✅' : 'FAILED ❌'}`);
  console.log(`  - Distinct cookies verified: ${cookiesAreDistinct ? 'CONFIRMED ✅' : 'FAILED ❌'}`);

  if (!tokensAreDistinct || !cookiesAreDistinct) {
    return reporter.recordCustomResult(
      'LOAD-04C',
      'Identity Isolation (Pre-IP Barrier)',
      targetEndpoint,
      {
        resultState: 'CONFIGURATION_ERROR',
        reason: 'User A and User B received identical session credentials.',
      },
      false,
      ['Session collision: tokens or cookies were not distinct.']
    );
  }

  // Step 3: Pre-flight Clean Window Check for User B
  console.log(`\n[Step 4] Checking clean-window baseline for User B...`);
  const windowCheck = await preflightCleanWindowCheck(
    targetEndpoint,
    sessionB.cookieHeader,
    sessionB.apiAccessToken,
    config.cleanWindowMinRemaining || 30
  );

  if (!windowCheck.isClean) {
    return reporter.recordCustomResult(
      'LOAD-04C',
      'Identity Isolation (Pre-IP Barrier)',
      targetEndpoint,
      {
        resultState: 'CONFIGURATION_ERROR',
        reason: `Pre-flight probe returned status ${windowCheck.status}`,
      },
      false,
      [`Pre-flight check failed with status ${windowCheck.status}`]
    );
  }

  // Step 4: Dispatch Calibrated Traffic
  console.log(`\n[Step 5] Launching User A calibrated traffic (${config.userAAmount} reqs @ ${config.userAConnections} conns)...`);
  console.log(`[Step 6] Simultaneously dispatching User B probe traffic (${config.userBAmount} reqs)...`);

  const userABurstPromise = autocannon({
    url: targetEndpoint,
    connections: config.userAConnections,
    amount: config.userAAmount,
    headers: {
      'Cookie': sessionA.cookieHeader,
      'Authorization': `Bearer ${sessionA.apiAccessToken}`,
      'Accept': 'application/json',
      'User-Agent': 'VakhLoadRunner/IsolationUserA',
    },
  });

  // Short delay into the burst before dispatching User B
  await new Promise(r => setTimeout(r, 150));

  const userBPromises = [];
  for (let i = 0; i < config.userBAmount; i++) {
    userBPromises.push(
      sendAuthenticatedRequest(targetEndpoint, sessionB.cookieHeader, sessionB.apiAccessToken, {
        userAgent: 'VakhLoadRunner/IsolationUserB',
      })
    );
  }

  const [userAResult, userBResponses] = await Promise.all([
    userABurstPromise,
    Promise.all(userBPromises),
  ]);

  // Step 5: Dissect Status Code Distribution for User A
  const aStats = userAResult.statusCodeStats || {};
  const userA2xx = userAResult['2xx'] || 0;
  const userA429 = (aStats['429'] && aStats['429'].count) || 0;
  const userA401 = (aStats['401'] && aStats['401'].count) || 0;
  const userA403 = (aStats['403'] && aStats['403'].count) || 0;
  const userA5xx = userAResult['5xx'] || 0;

  console.log(`\n======================================================`);
  console.log(`User A HTTP Status-Code Distribution:`);
  console.log(`  - Total: 2xx: ${userA2xx} | 429: ${userA429} | 401/403: ${userA401 + userA403} | 5xx: ${userA5xx}`);

  // Step 6: Dissect Status Code Distribution and Headers for User B
  let userB2xx = 0;
  let userB429 = 0;
  let userB401 = 0;
  let userB403 = 0;
  let userB5xx = 0;
  const userB429Details = [];
  let userBSampleHeaders = null;

  for (const resp of userBResponses) {
    const s = resp.status;
    if (s >= 200 && s < 300) {
      userB2xx++;
    } else if (s === 429) {
      userB429++;
      userB429Details.push(classify429Response(resp));
    } else if (s === 401) {
      userB401++;
    } else if (s === 403) {
      userB403++;
    } else if (s >= 500) {
      userB5xx++;
    }

    if (!userBSampleHeaders && resp.headers) {
      userBSampleHeaders = extractRateLimitHeaders(resp.headers);
    }
  }

  console.log(`\nUser B HTTP Status-Code Distribution:`);
  console.log(`  - Total Sent:    ${userBResponses.length}`);
  console.log(`  - 2xx (Success): ${userB2xx}`);
  console.log(`  - 429 (Rate-Lim):${userB429}`);
  console.log(`  - 401/403 (Auth):${userB401 + userB403}`);
  console.log(`  - 5xx (Server):  ${userB5xx}`);
  console.log(`  - Observed User B Rate-Limit Headers:`, {
    limit: userBSampleHeaders?.limit,
    remaining: userBSampleHeaders?.remaining,
    reset: userBSampleHeaders?.reset,
    retryAfter: userBSampleHeaders?.retryAfter,
  });

  // Step 7: Evaluate Result State Based on Explicit Evidence
  let resultState = 'FAIL';
  const violations = [];

  if (userB401 > 0 || userB403 > 0) {
    resultState = 'AUTHENTICATION_FAILURE';
    violations.push(`User B experienced authentication failures (401: ${userB401}, 403: ${userB403}).`);
  } else if (userB5xx > 0 || userA5xx > 0) {
    resultState = 'FAIL';
    violations.push(`Server 5xx error observed (User A: ${userA5xx}, User B: ${userB5xx}).`);
  } else if (userB2xx === userBResponses.length) {
    // 100% of User B requests succeeded
    resultState = 'PASS';
    console.log(`  -> User B was completely unaffected by User A's traffic (100% 2xx).`);
  } else if (userB429 > 0) {
    // Inspect User B 429 cause
    const hasCloudflare1015 = userB429Details.some(d => d?.code === 'CLOUDFLARE_1015');
    const hasExhaustedIsolate = userB429Details.some(d => d?.headers?.remaining === '0');

    if (hasCloudflare1015 || hasExhaustedIsolate) {
      resultState = 'IP_LIMIT_TRIGGERED';
      console.log(`  -> User B 429 attributed to shared outer IP barrier: ${hasCloudflare1015 ? 'Cloudflare WAF 1015' : 'Shared Isolate Counter Exhausted'}.`);
    } else {
      resultState = 'FAIL';
      violations.push('User B was throttled due to cross-session quota contamination on an unexhausted IP isolate.');
    }
  }

  const passed = resultState === 'PASS' || resultState === 'IP_LIMIT_TRIGGERED';

  console.log(`\n[LOAD-04C Final Result]: ${resultState} ${passed ? '🟢' : '🔴'}`);
  console.log(`======================================================\n`);

  const report = reporter.recordCustomResult(
    'LOAD-04C',
    'User Identity Isolation (Pre-IP Barrier)',
    targetEndpoint,
    {
      mode,
      resultState,
      userABurst: {
        totalRequests: userAResult.requests.total,
        http2xx: userA2xx,
        http429: userA429,
        http401: userA401,
        http403: userA403,
        http5xx: userA5xx,
      },
      userBIsolated: {
        totalRequests: userBResponses.length,
        http2xx: userB2xx,
        http429: userB429,
        http401: userB401,
        http403: userB403,
        http5xx: userB5xx,
        sampleHeaders: userBSampleHeaders,
        throttlingDetails: userB429Details,
      },
    },
    passed,
    violations
  );

  return report;
}

module.exports = { runIdentityIsolationScenario };
