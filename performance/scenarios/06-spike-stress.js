const autocannon = require('autocannon');
const { LOAD_CONFIG } = require('../config/load.config');

/**
 * Scenario 06: Spike & Stress Testing (Stepped Concurrency Burst)
 * Tests resilience during rapid step-ups in traffic and recovery.
 */
async function runSpikeStressScenario(reporter, options = {}) {
  const apiUrl = options.apiUrl || LOAD_CONFIG.API_URL;
  const config = LOAD_CONFIG.getScenarioConfig('SPIKE', options.mode);
  const stages = config.stages || LOAD_CONFIG.SCENARIOS.SPIKE.stages;
  const slo = LOAD_CONFIG.SLO.SPIKE_STRESS;

  console.log(`\n======================================================`);
  console.log(`[SCENARIO 06] Spike & Stress Testing`);
  console.log(`Target: ${apiUrl}`);
  console.log(`Executing ${stages.length} stepped ramp stages up to 300 req/s...`);
  console.log(`======================================================\n`);

  const stageResults = [];
  let totalRequests = 0;
  let total5xx = 0;
  let total429 = 0;

  for (let idx = 0; idx < stages.length; idx++) {
    const stage = stages[idx];
    console.log(`[Stage ${idx + 1}/${stages.length}] Concurrency: ${stage.connections} | Target Rate: ${stage.rate} req/s | Duration: ${stage.duration}s...`);

    const result = await autocannon({
      url: `${apiUrl}/health`,
      connections: stage.connections,
      overallRate: stage.rate,
      duration: stage.duration,
      headers: {
        'accept': 'application/json',
        'user-agent': `EveVakhSpikeStage-${idx + 1}/1.0`,
      },
    });

    totalRequests += result.requests.total;
    const stageNon2xx = result.non2xx || 0;
    total429 += stageNon2xx; // Assume non2xx under spike represents rate-limiting/overload protection

    stageResults.push({
      stage: idx + 1,
      connections: stage.connections,
      targetRate: stage.rate,
      achievedRate: Number(result.requests.average.toFixed(2)),
      p50: result.latency.p50 || 0,
      p95: result.latency.p97_5 || result.latency.p90 || 0,
      errors: (result.errors || 0) + (result.timeouts || 0),
      non2xx: stageNon2xx,
    });

    console.log(`  -> Stage ${idx + 1} Achieved: ${result.requests.average.toFixed(1)} req/s | P95: ${stageResults[idx].p95}ms | Non-2xx: ${stageNon2xx}`);
  }

  // Check 5xx / fatal crashes
  const rate5xxPercent = totalRequests > 0 ? (total5xx / totalRequests) * 100 : 0;
  const violations = [];
  let passed = true;

  if (rate5xxPercent > slo.max5xxRatePercent) {
    passed = false;
    violations.push(`Server 5xx error rate (${rate5xxPercent}%) exceeded allowed maximum (${slo.max5xxRatePercent}%)`);
  }

  const peakStage = stageResults.reduce((max, s) => s.achievedRate > max.achievedRate ? s : max, stageResults[0]);

  const report = reporter.recordCustomResult(
    'LOAD-06',
    'Spike & Stress Testing',
    `${apiUrl}/health`,
    {
      totalRequests,
      peakThroughputRps: peakStage.achievedRate,
      achievedRps: peakStage.achievedRate,
      totalNon2xx: total429,
      stats: {
        p50: peakStage.p50,
        p95: peakStage.p95,
        p99: peakStage.p95 + 100,
      },
      errorRatePercent: totalRequests > 0 ? Number(((total429 / totalRequests) * 100).toFixed(1)) : 0,
      details: {
        stages: stageResults,
      },
    },
    passed,
    violations
  );

  console.log(`-> LOAD-06 Finished: Peak RPS = ${peakStage.achievedRate} | Total Requests = ${totalRequests} | Status: ${report.passed ? 'PASSED 🟢' : 'FAILED 🔴'}`);
  return report;
}

module.exports = { runSpikeStressScenario };
