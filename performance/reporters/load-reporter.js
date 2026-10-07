const fs = require('fs');
const path = require('path');
const { LOAD_CONFIG } = require('../config/load.config');

class LoadReporter {
  constructor(outputDir = LOAD_CONFIG.OUTPUT_DIR) {
    this.outputDir = outputDir;
    this.results = [];
    if (!fs.existsSync(this.outputDir)) {
      fs.mkdirSync(this.outputDir, { recursive: true });
    }
  }

  /**
   * Records an autocannon result object with scenario metadata.
   */
  recordAutocannonResult(scenarioId, scenarioName, targetUrl, result, slo = {}) {
    const totalRequests = result.requests.total;
    const duration = result.duration;
    const achievedRps = Number(result.requests.average.toFixed(2));
    const totalBytesMb = Number((result.throughput.total / (1024 * 1024)).toFixed(2));
    const dataRateMbSec = Number((result.throughput.average / (1024 * 1024)).toFixed(2));
    const successful2xx = result['2xx'] || 0;
    const non2xx = result.non2xx || 0;
    const errors = (result.errors || 0) + (result.timeouts || 0);

    const latencies = {
      avg: Number((result.latency.average || 0).toFixed(2)),
      p50: result.latency.p50 || 0,
      p90: result.latency.p90 || 0,
      p95: result.latency.p97_5 ? Math.round((result.latency.p90 + result.latency.p97_5) / 2) : (result.latency.p90 || 0),
      p97_5: result.latency.p97_5 || 0,
      p99: result.latency.p99 || 0,
      max: result.latency.max || 0,
    };

    const errorRatePercent = totalRequests > 0 ? Number(((non2xx + errors) / totalRequests * 100).toFixed(2)) : 0;

    // Check SLO Compliance
    let passed = true;
    const violations = [];

    if (slo.p95LatencyMs && latencies.p95 > slo.p95LatencyMs) {
      passed = false;
      violations.push(`P95 Latency (${latencies.p95}ms) exceeded target (${slo.p95LatencyMs}ms)`);
    }

    if (slo.p99LatencyMs && latencies.p99 > slo.p99LatencyMs) {
      passed = false;
      violations.push(`P99 Latency (${latencies.p99}ms) exceeded target (${slo.p99LatencyMs}ms)`);
    }

    if (slo.maxErrorRatePercent !== undefined && errorRatePercent > slo.maxErrorRatePercent) {
      passed = false;
      violations.push(`Error rate (${errorRatePercent}%) exceeded allowed limit (${slo.maxErrorRatePercent}%)`);
    }

    const socketErrorRate = totalRequests > 0 ? (errors / totalRequests) * 100 : 0;
    if (slo.max5xxRatePercent !== undefined && socketErrorRate > slo.max5xxRatePercent) {
      passed = false;
      violations.push(`Socket/Fatal error rate (${socketErrorRate.toFixed(2)}%) exceeded allowed limit (${slo.max5xxRatePercent}%)`);
    }

    const isPassed = passed;
    const resultState = isPassed ? 'PASS' : 'FAIL';

    const scenarioReport = {
      scenarioId,
      scenarioName,
      targetUrl,
      timestamp: new Date().toISOString(),
      duration,
      concurrency: result.connections,
      totalRequests,
      achievedRps,
      totalBytesMb,
      dataRateMbSec,
      successful2xx,
      non2xx,
      errors,
      errorRatePercent,
      latencies,
      slo,
      resultState,
      passed: isPassed,
      inconclusive: false,
      failed: !isPassed,
      violations,
      raw: result,
    };

    this.results.push(scenarioReport);

    // Save individual scenario JSON
    const scenarioFile = path.join(this.outputDir, `${scenarioId.toLowerCase().replace(/[^a-z0-9]/g, '-')}.json`);
    fs.writeFileSync(scenarioFile, JSON.stringify(scenarioReport, null, 2));

    return scenarioReport;
  }

  /**
   * Records custom benchmark results (e.g. WebSocket, Rate Limit isolation).
   */
  recordCustomResult(scenarioId, scenarioName, targetUrl, customData, passed = true, violations = []) {
    const resultState = customData.resultState || (passed ? 'PASS' : 'FAIL');
    const isPassed = resultState === 'PASS' || resultState === 'IP_LIMIT_TRIGGERED';
    const isInconclusive = resultState === 'INCONCLUSIVE';
    const isFailed = resultState === 'FAIL' || resultState === 'AUTHENTICATION_FAILURE' || resultState === 'CONFIGURATION_ERROR';

    const scenarioReport = {
      scenarioId,
      scenarioName,
      targetUrl,
      timestamp: new Date().toISOString(),
      ...customData,
      resultState,
      passed: isPassed,
      inconclusive: isInconclusive,
      failed: isFailed,
      violations: customData.violations || violations,
    };

    this.results.push(scenarioReport);

    const scenarioFile = path.join(this.outputDir, `${scenarioId.toLowerCase().replace(/[^a-z0-9]/g, '-')}.json`);
    fs.writeFileSync(scenarioFile, JSON.stringify(scenarioReport, null, 2));

    return scenarioReport;
  }

  /**
   * Generates comprehensive markdown report and consolidated JSON summary.
   */
  generateFinalReport(metadata = {}) {
    const mode = (metadata.mode || 'smoke').toLowerCase();
    const sortedResults = [...this.results].sort((a, b) => (a.scenarioId || '').localeCompare(b.scenarioId || ''));
    const totalScenarios = sortedResults.length;

    let passedScenarios = 0;
    let inconclusiveScenarios = 0;
    let failedScenarios = 0;

    for (const res of sortedResults) {
      const state = res.resultState || (res.passed ? 'PASS' : 'FAIL');
      if (state === 'PASS' || state === 'IP_LIMIT_TRIGGERED') {
        passedScenarios++;
      } else if (state === 'INCONCLUSIVE') {
        inconclusiveScenarios++;
      } else {
        // FAIL, AUTHENTICATION_FAILURE, CONFIGURATION_ERROR, or unhandled errors
        failedScenarios++;
      }
    }

    let overallStatus = 'PASSED';
    let overallStatusBadge = 'PASSED 🟢';
    if (failedScenarios > 0) {
      overallStatus = 'FAILED';
      overallStatusBadge = 'FAILED 🔴';
    } else if (inconclusiveScenarios > 0) {
      overallStatus = 'INCONCLUSIVE';
      overallStatusBadge = 'INCONCLUSIVE ⚪';
    } else {
      overallStatus = 'PASSED';
      overallStatusBadge = 'PASSED 🟢';
    }

    let summaryString = '';
    if (failedScenarios > 0) {
      if (inconclusiveScenarios > 0) {
        summaryString = `${passedScenarios}/${totalScenarios} Passed | ${inconclusiveScenarios}/${totalScenarios} Inconclusive | ${failedScenarios}/${totalScenarios} Failed`;
      } else {
        summaryString = `${passedScenarios}/${totalScenarios} Passed | ${failedScenarios}/${totalScenarios} Failed`;
      }
    } else if (inconclusiveScenarios > 0) {
      summaryString = `${passedScenarios}/${totalScenarios} Passed | ${inconclusiveScenarios}/${totalScenarios} Inconclusive`;
    } else {
      summaryString = `${passedScenarios}/${totalScenarios} Passed`;
    }

    const summaryData = {
      timestamp: new Date().toISOString(),
      mode,
      overallStatus,
      summaryString,
      counts: {
        total: totalScenarios,
        passed: passedScenarios,
        inconclusive: inconclusiveScenarios,
        failed: failedScenarios,
      },
      scenarios: sortedResults,
      results: sortedResults,
      ...metadata,
    };

    const summaryFile = path.join(this.outputDir, 'load-summary.json');
    fs.writeFileSync(summaryFile, JSON.stringify(summaryData, null, 2));

    let markdown = `# ⚡ Eve Vakh Application Load & Performance Test Suite Report

> **Execution Timestamp**: ${new Date().toISOString()}  
> **Execution Mode**: **${mode.toUpperCase()}**  
> **Overall Benchmark Status**: **${overallStatusBadge}** (${summaryString})

---

## 📊 Executive Summary Table

| Scenario ID | Scenario Name | Target | Achieved RPS | P50 (ms) | P95 (ms) | P99 (ms) | Error Rate | Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
`;

    for (const res of sortedResults) {
      const state = res.resultState || (res.passed ? 'PASS' : 'FAIL');
      let statusBadge = '🔴 FAIL';
      if (state === 'PASS') {
        statusBadge = '🟢 PASS';
      } else if (state === 'IP_LIMIT_TRIGGERED') {
        statusBadge = '🟡 IP_LIMIT_TRIGGERED';
      } else if (state === 'INCONCLUSIVE') {
        statusBadge = '⚪ INCONCLUSIVE';
      } else if (state === 'AUTHENTICATION_FAILURE') {
        statusBadge = '🔴 AUTH_FAILURE';
      } else if (state === 'CONFIGURATION_ERROR') {
        statusBadge = '🔴 CONFIG_ERROR';
      } else if (res.passed) {
        statusBadge = '🟢 PASS';
      }

      const rps = res.achievedRps ? `${res.achievedRps} req/s` : 'N/A';
      const p50 = res.latencies ? `${res.latencies.p50}ms` : (res.stats ? `${res.stats.p50}ms` : 'N/A');
      const p95 = res.latencies ? `${res.latencies.p95}ms` : (res.stats ? `${res.stats.p95}ms` : 'N/A');
      const p99 = res.latencies ? `${res.latencies.p99}ms` : (res.stats ? `${res.stats.p99}ms` : 'N/A');
      const errorRate = res.errorRatePercent !== undefined ? `${res.errorRatePercent}%` : `${res.errors || 0} errors`;

      markdown += `| **\`${res.scenarioId}\`** | ${res.scenarioName} | \`${res.targetUrl}\` | **${rps}** | ${p50} | **${p95}** | ${p99} | ${errorRate} | **${statusBadge}** |\n`;
    }

    markdown += `\n---\n\n## 🔍 Detailed Scenario Breakdown\n\n`;

    for (const res of sortedResults) {
      const state = res.resultState || (res.passed ? 'PASS' : 'FAIL');
      markdown += `### ${res.scenarioId}: ${res.scenarioName}\n\n`;
      markdown += `- **Target URL**: \`${res.targetUrl}\`\n`;
      markdown += `- **Evaluation Result**: **${state}**\n`;
      
      if (res.violations && res.violations.length > 0) {
        const headerTitle = state === 'INCONCLUSIVE' ? 'Observations' : 'Violations Detected';
        markdown += `- **${headerTitle}**:\n`;
        for (const v of res.violations) {
          const icon = state === 'INCONCLUSIVE' ? 'ℹ️' : '⚠️';
          markdown += `  - ${icon} ${v}\n`;
        }
      }

      if (res.latencies) {
        markdown += `\n#### ⏱️ Latency & Throughput Metrics\n\n`;
        markdown += `| Metric | Measured Value |\n| :--- | :--- |\n`;
        markdown += `| Total Requests Sent | **${(res.totalRequests || 0).toLocaleString()}** |\n`;
        markdown += `| Achieved Throughput | **${res.achievedRps} req/sec** |\n`;
        markdown += `| Total Data Transferred | **${res.totalBytesMb} MB** (${res.dataRateMbSec} MB/sec) |\n`;
        markdown += `| Successful Responses (2xx) | **${res.successful2xx}** |\n`;
        markdown += `| Non-2xx Responses | **${res.non2xx}** |\n`;
        markdown += `| Errors / Timeouts | **${res.errors}** |\n`;
        markdown += `| Average Latency | **${res.latencies.avg} ms** |\n`;
        markdown += `| P50 Latency (Median) | **${res.latencies.p50} ms** |\n`;
        markdown += `| P90 Latency | **${res.latencies.p90} ms** |\n`;
        markdown += `| P95 Latency | **${res.latencies.p95} ms** |\n`;
        markdown += `| P99 Latency | **${res.latencies.p99} ms** |\n`;
        markdown += `| Maximum Latency | **${res.latencies.max} ms** |\n\n`;
      } else if (res.details) {
        markdown += `\n#### 📋 Custom Scenario Details\n\n\`\`\`json\n${JSON.stringify(res.details, null, 2)}\n\`\`\`\n\n`;
      }
      markdown += `---\n\n`;
    }

    markdown += `*Generated automatically by Eve Vakh Load Testing Suite. Artifacts saved in \`test-reports/load/\`.*\n`;

    const markdownFile = path.join(this.outputDir, 'LOAD_TEST_REPORT.md');
    fs.writeFileSync(markdownFile, markdown);

    return {
      totalScenarios,
      passedScenarios,
      inconclusiveScenarios,
      failedScenarios,
      overallStatus,
      overallStatusBadge,
      summaryString,
      scenarios: sortedResults,
      markdownPath: markdownFile,
      jsonPath: summaryFile,
    };
  }
}

module.exports = { LoadReporter };
