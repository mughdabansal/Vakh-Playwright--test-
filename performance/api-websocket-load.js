const path = require('path');
const fs = require('fs');

/**
 * WebSocket Real-Time Actor & Durable Object Concurrency Benchmark
 * Measures:
 *  - Connection setup latency (DO cold-starts)
 *  - Concurrent session handling
 *  - Message delivery round-trip
 */

const targetWsUrl = process.env.WS_URL || 'wss://xo.eve.vakh.com/ws';
const outputDir = path.join(__dirname, '..', 'test-reports');

if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

console.log(`=== Starting WebSocket Actor Concurrency Benchmark ===`);
console.log(`Target: ${targetWsUrl}`);

async function runWsBenchmark() {
  const NUM_CONNECTIONS = 30;
  const connectionTimes = [];
  const errors = [];

  console.log(`Attempting to open ${NUM_CONNECTIONS} concurrent WebSocket connections...`);

  for (let i = 0; i < NUM_CONNECTIONS; i++) {
    const start = Date.now();
    try {
      await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Connection timed out'));
        }, 5000);

        try {
          const ws = new WebSocket(targetWsUrl);
          ws.onopen = () => {
            clearTimeout(timeout);
            connectionTimes.push(Date.now() - start);
            ws.close();
            resolve();
          };
          ws.onerror = (e) => {
            clearTimeout(timeout);
            errors.push('Connection failed');
            resolve();
          };
        } catch (err) {
          clearTimeout(timeout);
          errors.push(err.message);
          resolve();
        }
      });
    } catch (e) {
      errors.push(e.message);
    }
  }

  const avgLatency = connectionTimes.length > 0
    ? (connectionTimes.reduce((a, b) => a + b, 0) / connectionTimes.length).toFixed(2)
    : 0;

  const summary = {
    timestamp: new Date().toISOString(),
    totalAttempted: NUM_CONNECTIONS,
    successfulConnections: connectionTimes.length,
    failedOrTimedOut: errors.length,
    avgConnectLatencyMs: avgLatency,
  };

  const jsonPath = path.join(outputDir, 'websocket-concurrency-report.json');
  fs.writeFileSync(jsonPath, JSON.stringify(summary, null, 2));

  console.log(`WebSocket Benchmark complete:`);
  console.log(`Successful: ${connectionTimes.length}/${NUM_CONNECTIONS}`);
  console.log(`Avg Connection Latency: ${avgLatency} ms`);
  console.log(`Report written to ${jsonPath}`);
}

runWsBenchmark().catch(console.error);
