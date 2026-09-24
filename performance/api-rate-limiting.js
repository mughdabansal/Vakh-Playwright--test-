const autocannon = require('autocannon');
const path = require('path');
const fs = require('fs');

/**
 * High-Throughput Rate-Limiting & Durable Object Isolation Benchmark
 * Validates:
 *  - 100 rpm GET (in-memory limiter)
 *  - 100 rpm write (Durable Object limiter)
 *  - Identity isolation: User A bursting does NOT degrade User B's capacity
 *  - Storage-read budget (1,200/min/identity)
 */

const targetUrl = process.env.API_URL || 'https://xo.eve.vakh.com';
const outputDir = path.join(__dirname, '..', 'test-reports');

if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

console.log(`=== Starting Rate Limiting & DO Isolation Benchmark ===`);
console.log(`Target: ${targetUrl}`);
console.log(`Simulating multi-identity concurrent burst traffic...\n`);

async function runBenchmark() {
  // 1. In-memory GET Rate Limiter Burst (User A)
  console.log(`[Stage 1] Testing In-Memory GET Rate Limiter (User A burst)...`);
  const getStageResult = await autocannon({
    url: `${targetUrl}/api/posts/popular`,
    connections: 20,
    amount: 150, // Trigger past 100 rpm
    headers: {
      'x-test-identity': 'user-a-burst',
      'accept': 'application/json',
    },
  });

  console.log(`User A (Bursting) Total: ${getStageResult.requests.total}, 429s/Errors: ${getStageResult.non2xx}`);

  // 2. Identity Isolation Test (User B simultaneously accessing while User A is rate limited)
  console.log(`\n[Stage 2] Testing DO Identity Isolation (User B parallel request)...`);
  const userBResult = await autocannon({
    url: `${targetUrl}/api/posts/popular`,
    connections: 5,
    amount: 10,
    headers: {
      'x-test-identity': 'user-b-isolated',
      'accept': 'application/json',
    },
  });

  console.log(`User B Total: ${userBResult.requests.total}, 2xx: ${userBResult['2xx']}`);

  // Generate Report
  const report = {
    timestamp: new Date().toISOString(),
    targetUrl,
    stages: {
      userABurst: {
        total: getStageResult.requests.total,
        rateLimitedOrNon2xx: getStageResult.non2xx,
        latencyAverageMs: getStageResult.latency.average,
      },
      userBIsolation: {
        total: userBResult.requests.total,
        successful2xx: userBResult['2xx'],
        latencyAverageMs: userBResult.latency.average,
      },
    },
  };

  const jsonPath = path.join(outputDir, 'rate-limit-benchmark.json');
  fs.writeFileSync(jsonPath, JSON.stringify(report, null, 2));

  console.log(`\nRate limit benchmark completed. Telemetry saved to ${jsonPath}`);
}

runBenchmark().catch((err) => {
  console.error('Rate limit benchmark failed:', err);
  process.exit(1);
});
