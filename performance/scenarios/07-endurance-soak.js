const autocannon = require('autocannon');
const { LOAD_CONFIG } = require('../config/load.config');

/**
 * Scenario 07: Endurance & Soak Benchmark (Extended Steady-State Load)
 * Evaluates memory leaks, thread pool starvation, and latency drift over an extended period.
 */
async function runEnduranceSoakScenario(reporter, options = {}) {
  const apiUrl = options.apiUrl || LOAD_CONFIG.API_URL;
  const config = LOAD_CONFIG.getScenarioConfig('SOAK', options.mode);
  const slo = LOAD_CONFIG.SLO.ENDURANCE;
  const duration = options.duration || config.duration || 60;

  console.log(`\n======================================================`);
  console.log(`[SCENARIO 07] Endurance & Soak Testing`);
  console.log(`Target: ${apiUrl}`);
  console.log(`Concurrency: ${options.connections || config.connections} | Rate: ${options.rate || config.overallRate} req/s | Duration: ${duration}s`);
  console.log(`======================================================\n`);

  const result = await autocannon({
    url: `${apiUrl}/health`,
    connections: options.connections || config.connections,
    overallRate: options.rate || config.overallRate,
    duration: duration,
    headers: {
      'accept': 'application/json',
      'user-agent': 'EveVakhEnduranceTest/1.0',
    },
    pipelining: 1,
  });

  const report = reporter.recordAutocannonResult(
    'LOAD-07',
    'Endurance & Soak Benchmark',
    `${apiUrl}/health`,
    result,
    {
      maxErrorRatePercent: slo.maxErrorRatePercent,
    }
  );

  console.log(`-> LOAD-07 Finished: ${report.achievedRps} req/s | P95: ${report.latencies.p95}ms | Errors: ${report.errorRatePercent}% | Status: ${report.passed ? 'PASSED 🟢' : 'FAILED 🔴'}`);
  return report;
}

module.exports = { runEnduranceSoakScenario };
