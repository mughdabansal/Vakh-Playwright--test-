#!/usr/bin/env node

const { LoadReporter } = require('./reporters/load-reporter');
const { runFrontendPagesScenario } = require('./scenarios/01-frontend-pages');
const { runApiCoreReadScenario } = require('./scenarios/02-api-core-read');
const { runApiStatefulWriteScenario } = require('./scenarios/03-api-stateful-write');
const { runRateLimitScenario } = require('./scenarios/04-rate-limit-resilience');
const { runUserRateLimitScenario } = require('./scenarios/ratelimit/01-user-rate-limit');
const { runIpRateLimitScenario } = require('./scenarios/ratelimit/02-ip-rate-limit');
const { runIdentityIsolationScenario } = require('./scenarios/ratelimit/03-identity-isolation');
const { runWebSocketRealtimeScenario } = require('./scenarios/05-websocket-realtime');
const { runSpikeStressScenario } = require('./scenarios/06-spike-stress');
const { runEnduranceSoakScenario } = require('./scenarios/07-endurance-soak');

/**
 * Parses CLI arguments into an options map.
 */
function parseArgs(args) {
  const options = {
    scenario: 'all',
    mode: 'smoke',
  };

  for (const arg of args) {
    if (arg.startsWith('--scenario=')) {
      options.scenario = arg.split('=')[1].toLowerCase();
    } else if (arg.startsWith('--mode=')) {
      options.mode = arg.split('=')[1].toLowerCase();
    } else if (arg.startsWith('--concurrency=')) {
      options.connections = parseInt(arg.split('=')[1], 10);
    } else if (arg.startsWith('--duration=')) {
      options.duration = parseInt(arg.split('=')[1], 10);
    } else if (arg.startsWith('--rate=')) {
      options.rate = parseInt(arg.split('=')[1], 10);
    } else if (arg.startsWith('--target=')) {
      options.targetUrl = arg.split('=')[1];
    } else if (arg.startsWith('--api=')) {
      options.apiUrl = arg.split('=')[1];
    } else if (arg.startsWith('--ws=')) {
      options.wsUrl = arg.split('=')[1];
    } else if (arg === '--no-fail') {
      options.noFail = true;
    }
  }

  return options;
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const reporter = new LoadReporter();

  console.log(`\n======================================================`);
  console.log(`   🚀 EVE VAKH APPLICATION LOAD TESTING SUITE`);
  console.log(`   Selected Scenario: ${options.scenario.toUpperCase()}`);
  console.log(`   Execution Mode:    ${options.mode.toUpperCase()}`);
  console.log(`======================================================\n`);

  const runAll = options.scenario === 'all';

  try {
    // Scenario 1: Frontend SPA
    if (runAll || options.scenario === 'frontend' || options.scenario === 'spa') {
      await runFrontendPagesScenario(reporter, options);
    }

    // Scenario 2: API Core Read
    if (runAll || options.scenario === 'api' || options.scenario === 'read' || options.scenario === 'core') {
      await runApiCoreReadScenario(reporter, options);
    }

    // Scenario 3: API Stateful Write
    if (runAll || options.scenario === 'api' || options.scenario === 'write') {
      await runApiStatefulWriteScenario(reporter, options);
    }

    // Scenario 4: Rate Limiting & Isolation
    if (runAll || options.scenario === 'ratelimit') {
      await runRateLimitScenario(reporter, options);
    } else if (options.scenario === 'user-rate-limit' || options.scenario === 'user') {
      await runUserRateLimitScenario(reporter, options);
    } else if (options.scenario === 'ip-rate-limit' || options.scenario === 'ip') {
      await runIpRateLimitScenario(reporter, options);
    } else if (options.scenario === 'identity-isolation' || options.scenario === 'isolation') {
      await runIdentityIsolationScenario(reporter, options);
    }

    // Scenario 5: WebSocket Real-Time
    if (runAll || options.scenario === 'websocket' || options.scenario === 'ws') {
      await runWebSocketRealtimeScenario(reporter, options);
    }

    // Scenario 6: Spike & Stress
    if (runAll || options.scenario === 'spike' || options.scenario === 'stress') {
      await runSpikeStressScenario(reporter, options);
    }

    // Scenario 7: Endurance / Soak
    if (runAll || options.scenario === 'soak' || options.scenario === 'endurance') {
      await runEnduranceSoakScenario(reporter, options);
    }

    // Generate Final Reports
    console.log(`\n======================================================`);
    console.log(`   📊 COMPILING FINAL LOAD TESTING BENCHMARK REPORT`);
    console.log(`======================================================\n`);

    const summary = reporter.generateFinalReport({ mode: options.mode });

    try {
      const { loadLoadTestData } = require('../scripts/load-dashboard-helper');
      loadLoadTestData(path.join(__dirname, '..', 'test-reports'));
    } catch (e) {
      // Non-fatal if helper unavailable
    }

    console.log(`Report successfully generated:`);
    console.log(` - Markdown: ${summary.markdownPath}`);
    console.log(` - JSON:     ${summary.jsonPath}`);
    console.log(` - Mode:     ${options.mode.toUpperCase()}`);
    console.log(` - Overall:  ${summary.overallStatus}`);
    console.log(` - Result:   ${summary.summaryString}\n`);

    console.log(`Scenario Results Breakdown:`);
    for (const res of summary.scenarios) {
      console.log(`   * ${res.scenarioId}: ${res.resultState || (res.passed ? 'PASS' : 'FAIL')}`);
    }

    if (summary.failedScenarios > 0 && !options.noFail) {
      console.error(`\n❌ Error: ${summary.failedScenarios} load scenario(s) failed or violated acceptance criteria.`);
      process.exit(1);
    } else if (summary.inconclusiveScenarios > 0) {
      console.log(`\n⚪ Inconclusive: Benchmark completed with ${summary.inconclusiveScenarios} inconclusive scenario(s). No failures occurred.`);
      process.exit(0);
    } else {
      console.log(`\n✅ Success: All executed scenarios met their defined SLO thresholds!`);
      process.exit(0);
    }
  } catch (err) {
    console.error('Fatal load suite runner error:', err);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { main };
