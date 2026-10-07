const { runUserRateLimitScenario } = require('./ratelimit/01-user-rate-limit');
const { runIpRateLimitScenario } = require('./ratelimit/02-ip-rate-limit');
const { runIdentityIsolationScenario } = require('./ratelimit/03-identity-isolation');

/**
 * Scenario 04: Rate Limiting & Identity Isolation Orchestrator
 * Sequentially executes:
 *   - LOAD-04A: Authenticated User Rate Limit (Quota Throttling)
 *   - LOAD-04C: User Identity Isolation (Pre-IP Barrier)
 *   - LOAD-04B: Outer IP Rate Limit (Flood Defense Barrier)
 */
async function runRateLimitScenario(reporter, options = {}) {
  const mode = (options.mode || 'smoke').toLowerCase();
  console.log(`\n======================================================`);
  console.log(`🚀 RUNNING RATE LIMIT & MULTI-IDENTITY SUITE`);
  console.log(`Mode: ${mode.toUpperCase()} | Architecture: Outer IP Defense Layer + Inner User Quota`);
  console.log(`======================================================\n`);

  // 1. Run LOAD-04A: User Rate Limit
  const reportA = await runUserRateLimitScenario(reporter, options);

  // Cooldown buffer between scenarios to allow sliding window to settle
  console.log(`[Suite Cooldown] Pausing 3s before next rate-limit scenario...`);
  await new Promise(r => setTimeout(r, 3000));

  // 2. Run LOAD-04C: Identity Isolation (run while window is fresh before 500 flood)
  const reportC = await runIdentityIsolationScenario(reporter, options);

  // Cooldown buffer before flood
  console.log(`[Suite Cooldown] Pausing 3s before IP barrier flood test...`);
  await new Promise(r => setTimeout(r, 3000));

  // 3. Run LOAD-04B: Outer IP Rate Limit
  const reportB = await runIpRateLimitScenario(reporter, options);

  const reports = [
    { id: 'LOAD-04A', state: reportA.resultState },
    { id: 'LOAD-04B', state: reportB.resultState },
    { id: 'LOAD-04C', state: reportC.resultState },
  ];

  let passedCount = 0;
  let inconclusiveCount = 0;
  let failedCount = 0;

  for (const r of reports) {
    if (r.state === 'PASS' || r.state === 'IP_LIMIT_TRIGGERED') {
      passedCount++;
    } else if (r.state === 'INCONCLUSIVE') {
      inconclusiveCount++;
    } else {
      failedCount++;
    }
  }

  let overallSummary = '';
  if (failedCount > 0) {
    overallSummary = inconclusiveCount > 0
      ? `${passedCount}/${reports.length} Passed | ${inconclusiveCount}/${reports.length} Inconclusive | ${failedCount}/${reports.length} Failed`
      : `${passedCount}/${reports.length} Passed | ${failedCount}/${reports.length} Failed`;
  } else if (inconclusiveCount > 0) {
    overallSummary = `${passedCount}/${reports.length} Passed | ${inconclusiveCount}/${reports.length} Inconclusive`;
  } else {
    overallSummary = `${passedCount}/${reports.length} Passed`;
  }

  console.log(`\n======================================================`);
  console.log(`📊 RATE LIMIT SUITE SUMMARY:`);
  console.log(`LOAD-04A: ${reportA.resultState}`);
  console.log(`LOAD-04B: ${reportB.resultState}`);
  console.log(`LOAD-04C: ${reportC.resultState}`);
  console.log(`\nOverall: ${overallSummary}`);
  console.log(`======================================================\n`);

  return {
    scenarioId: 'LOAD-04',
    scenarioName: 'Rate Limiting & Multi-Identity Suite',
    overallStatus: failedCount > 0 ? 'FAILED' : (inconclusiveCount > 0 ? 'INCONCLUSIVE' : 'PASSED'),
    passed: failedCount === 0,
    summaryString: overallSummary,
    subReports: [reportA, reportB, reportC],
  };
}

module.exports = { runRateLimitScenario };
