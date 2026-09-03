const autocannon = require('autocannon');
const fs = require('fs');
const path = require('path');

const targetUrl = 'https://xo.vakh.com';
const outputDir = path.join(__dirname, '..', 'test-reports');

if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

console.log(`Starting API performance benchmark for ${targetUrl}...`);
console.log(`Target Throughput: 200 req/sec | Duration: 15s`);

const instance = autocannon({
  url: targetUrl,
  connections: 50,
  overallRate: 200, // 200 requests/sec throughput target
  duration: 15,     // 15 seconds benchmark run
  headers: {
    'accept': 'application/json',
    'user-agent': 'VakhApiPerfTest/1.0',
  }
}, (err, result) => {
  if (err) {
    console.error('Error running API performance test:', err);
    process.exit(1);
  }

  // Save raw JSON report
  const jsonPath = path.join(outputDir, 'api-performance-report.json');
  fs.writeFileSync(jsonPath, JSON.stringify(result, null, 2));

  // Generate Markdown Summary
  const summaryMarkdown = `# ⚡ API Performance Load Test Report: Vakh Backend API

## Target: \`${targetUrl}\`
- **Target Throughput**: 200 req/sec
- **Duration**: ${result.duration} seconds
- **Concurrent Connections**: ${result.connections}

---

## 📊 Throughput & Response Summary

| Metric | Measured Value |
| :--- | :--- |
| **Total Requests Sent** | **${result.requests.total.toLocaleString()}** |
| **Achieved Throughput** | **${result.requests.average.toFixed(2)} req/sec** |
| **Total Bytes Transferred** | **${(result.throughput.total / (1024 * 1024)).toFixed(2)} MB** |
| **Data Rate** | **${(result.throughput.average / (1024 * 1024)).toFixed(2)} MB/sec** |
| **Successful Responses (2xx)** | **${result['2xx']}** |
| **Non-2xx / Error Responses** | **${result.non2xx || 0}** |
| **Errors / Timeouts** | **${result.errors + result.timeouts}** |

---

## ⏱️ Latency Distribution

| Percentile / Stat | Latency (ms) |
| :--- | :--- |
| **Average (Mean)** | **${result.latency.average.toFixed(2)} ms** |
| **P50 (Median)** | **${result.latency.p50} ms** |
| **P90** | **${result.latency.p90 || result.latency.p97_5} ms** |
| **P97.5** | **${result.latency.p97_5} ms** |
| **P99** | **${result.latency.p99} ms** |
| **Max Latency** | **${result.latency.max} ms** |

---

*Report saved to \`test-reports/api-performance-report.json\`*
`;

  const mdPath = path.join(outputDir, 'api-performance-summary.md');
  fs.writeFileSync(mdPath, summaryMarkdown);

  console.log('\n--- API Benchmark Completed Successfully ---');
  console.log(`Total Requests: ${result.requests.total}`);
  console.log(`Achieved Throughput: ${result.requests.average.toFixed(2)} req/sec`);
  console.log(`Average Latency: ${result.latency.average.toFixed(2)} ms`);
  console.log(`P99 Latency: ${result.latency.p99} ms`);
  console.log(`Full API report saved to: ${jsonPath}`);
  console.log(`Summary API report saved to: ${mdPath}`);
});

autocannon.track(instance, { renderProgressBar: true });
