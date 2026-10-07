const autocannon = require('autocannon');
const { LOAD_CONFIG } = require('../config/load.config');

/**
 * Scenario 01: Frontend SPA Route Delivery & Asset Caching
 * Targets: /, /auth/sign-in, /explore, /activity
 */
async function runFrontendPagesScenario(reporter, options = {}) {
  const targetUrl = options.targetUrl || LOAD_CONFIG.TARGET_URL;
  const config = LOAD_CONFIG.getScenarioConfig('FRONTEND', options.mode);
  const slo = LOAD_CONFIG.SLO.FRONTEND;

  console.log(`\n======================================================`);
  console.log(`[SCENARIO 01] Frontend SPA Route Delivery`);
  console.log(`Target: ${targetUrl}`);
  console.log(`Concurrency: ${options.connections || config.connections} | Rate: ${options.rate || config.overallRate} req/s | Duration: ${options.duration || config.duration}s`);
  console.log(`======================================================\n`);

  const requests = config.routes.map(route => ({
    method: 'GET',
    path: route,
    headers: {
      'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) EveVakhLoadTest/1.0',
      'accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    },
  }));

  const result = await autocannon({
    url: targetUrl,
    connections: options.connections || config.connections,
    overallRate: options.rate || config.overallRate,
    duration: options.duration || config.duration,
    requests,
    pipelining: 1,
  });

  const report = reporter.recordAutocannonResult(
    'LOAD-01',
    'Frontend SPA Route Delivery',
    targetUrl,
    result,
    slo
  );

  console.log(`-> LOAD-01 Finished: ${report.achievedRps} req/s | P95: ${report.latencies.p95}ms | Errors: ${report.errorRatePercent}% | Status: ${report.passed ? 'PASSED 🟢' : 'FAILED 🔴'}`);
  return report;
}

module.exports = { runFrontendPagesScenario };
