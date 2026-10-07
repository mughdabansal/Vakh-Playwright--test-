const autocannon = require('autocannon');
const { LOAD_CONFIG } = require('../config/load.config');

/**
 * Scenario 03: API Stateful Write Load
 * Targets: POST /api/posts/create, POST /api/posts/:id/react
 */
async function runApiStatefulWriteScenario(reporter, options = {}) {
  const apiUrl = options.apiUrl || LOAD_CONFIG.API_URL;
  const config = LOAD_CONFIG.getScenarioConfig('API_WRITE', options.mode);
  const slo = LOAD_CONFIG.SLO.API_WRITE;

  console.log(`\n======================================================`);
  console.log(`[SCENARIO 03] API Stateful Write Load`);
  console.log(`Target: ${apiUrl}`);
  console.log(`Concurrency: ${options.connections || config.connections} | Rate: ${options.rate || config.overallRate} req/s | Duration: ${options.duration || config.duration}s`);
  console.log(`======================================================\n`);

  const requests = [
    {
      method: 'POST',
      path: '/api/posts/create',
      headers: {
        'content-type': 'application/json',
        'accept': 'application/json',
        'x-test-author': LOAD_CONFIG.AUTH_USER.username,
        'user-agent': 'EveVakhWriteLoadTest/1.0',
      },
      body: JSON.stringify({
        content: `Synthetic load post payload [${Date.now()}]`,
        author: LOAD_CONFIG.AUTH_USER.username,
        form: 'posts',
        visibility: 'public',
      }),
    },
    {
      method: 'POST',
      path: '/api/posts/benchmark-target/react',
      headers: {
        'content-type': 'application/json',
        'accept': 'application/json',
        'x-test-user': LOAD_CONFIG.AUTH_USER.username,
        'user-agent': 'EveVakhWriteLoadTest/1.0',
      },
      body: JSON.stringify({
        reaction: 'heart',
        delta: 1,
      }),
    },
  ];

  const result = await autocannon({
    url: apiUrl,
    connections: options.connections || config.connections,
    overallRate: options.rate || config.overallRate,
    duration: options.duration || config.duration,
    requests,
    pipelining: 1,
  });

  const report = reporter.recordAutocannonResult(
    'LOAD-03',
    'API Stateful Write Load',
    apiUrl,
    result,
    slo
  );

  console.log(`-> LOAD-03 Finished: ${report.achievedRps} req/s | P95: ${report.latencies.p95}ms | Errors: ${report.errorRatePercent}% | Status: ${report.passed ? 'PASSED 🟢' : 'FAILED 🔴'}`);
  return report;
}

module.exports = { runApiStatefulWriteScenario };
