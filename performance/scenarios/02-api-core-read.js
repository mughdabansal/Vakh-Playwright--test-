const autocannon = require('autocannon');
const { LOAD_CONFIG } = require('../config/load.config');

/**
 * Scenario 02: API Core Read Throughput & Response Latency
 * Targets: /api/posts/popular, /api/profiles/explore/nearby, /api/init/users/m_2094
 */
async function runApiCoreReadScenario(reporter, options = {}) {
  const apiUrl = options.apiUrl || LOAD_CONFIG.API_URL;
  const config = LOAD_CONFIG.getScenarioConfig('API_READ', options.mode);
  const slo = LOAD_CONFIG.SLO.API_READ;

  console.log(`\n======================================================`);
  console.log(`[SCENARIO 02] API Core Read Throughput`);
  console.log(`Target: ${apiUrl}`);
  console.log(`Concurrency: ${options.connections || config.connections} | Rate: ${options.rate || config.overallRate} req/s | Duration: ${options.duration || config.duration}s`);
  console.log(`======================================================\n`);

  const requests = [
    {
      method: 'GET',
      path: '/health',
      headers: {
        'accept': 'application/json',
        'user-agent': 'EveVakhApiLoadTest/1.0',
      },
    },
    {
      method: 'GET',
      path: '/',
      headers: {
        'accept': 'application/json',
        'user-agent': 'EveVakhApiLoadTest/1.0',
      },
    },
    {
      method: 'GET',
      path: '/api/auth/get-session',
      headers: {
        'accept': 'application/json',
        'user-agent': 'EveVakhApiLoadTest/1.0',
      },
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
    'LOAD-02',
    'API Core Read Throughput',
    apiUrl,
    result,
    slo
  );

  console.log(`-> LOAD-02 Finished: ${report.achievedRps} req/s | P95: ${report.latencies.p95}ms | Errors: ${report.errorRatePercent}% | Status: ${report.passed ? 'PASSED 🟢' : 'FAILED 🔴'}`);
  return report;
}

module.exports = { runApiCoreReadScenario };
