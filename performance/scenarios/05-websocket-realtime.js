const { LOAD_CONFIG } = require('../config/load.config');

/**
 * Scenario 05: WebSocket Real-Time Handshake & Concurrency Benchmark
 * Measures:
 *  - WebSocket connection setup latency (Durable Object cold starts)
 *  - Concurrent persistent connections
 *  - Error rate / timeouts
 */
async function runWebSocketRealtimeScenario(reporter, options = {}) {
  const wsUrl = options.wsUrl || LOAD_CONFIG.WS_URL;
  const config = LOAD_CONFIG.getScenarioConfig('WEBSOCKET', options.mode);
  const slo = LOAD_CONFIG.SLO.WEBSOCKET;
  const numConnections = options.connections || config.numConnections;

  console.log(`\n======================================================`);
  console.log(`[SCENARIO 05] WebSocket Real-Time Concurrency`);
  console.log(`Target: ${wsUrl}`);
  console.log(`Testing ${numConnections} concurrent WebSocket connections...`);
  console.log(`======================================================\n`);

  const connectionTimes = [];
  const timeouts = [];
  const activeSockets = [];
  let authRejections = 0;

  const connectPromise = async (id) => {
    const start = Date.now();
    return new Promise((resolve) => {
      const timeout = setTimeout(() => {
        timeouts.push(`Socket ${id}: Handshake timed out (${config.handshakeTimeoutMs}ms)`);
        resolve(null);
      }, config.handshakeTimeoutMs);

      try {
        const ws = new WebSocket(wsUrl, ['mock-user-session-token']);

        ws.onopen = () => {
          clearTimeout(timeout);
          const elapsed = Date.now() - start;
          connectionTimes.push(elapsed);
          activeSockets.push(ws);
          resolve(ws);
        };

        ws.onerror = () => {
          clearTimeout(timeout);
          const elapsed = Date.now() - start;
          connectionTimes.push(elapsed);
          authRejections++;
          resolve(null);
        };

        ws.onclose = () => {
          clearTimeout(timeout);
        };
      } catch (err) {
        clearTimeout(timeout);
        timeouts.push(`Socket ${id}: ${err.message}`);
        resolve(null);
      }
    });
  };

  // Launch connections in parallel batches
  const batchSize = 10;
  for (let i = 0; i < numConnections; i += batchSize) {
    const batch = [];
    for (let j = 0; j < batchSize && (i + j) < numConnections; j++) {
      batch.push(connectPromise(i + j));
    }
    await Promise.all(batch);
    await new Promise(r => setTimeout(r, 50));
  }

  // Gracefully close active connections
  for (const ws of activeSockets) {
    try {
      ws.close();
    } catch {}
  }

  // Compute statistics
  connectionTimes.sort((a, b) => a - b);
  const total = connectionTimes.length;
  const p50 = total > 0 ? connectionTimes[Math.floor(total * 0.5)] : 0;
  const p90 = total > 0 ? connectionTimes[Math.floor(total * 0.9)] : 0;
  const p95 = total > 0 ? connectionTimes[Math.floor(total * 0.95)] : 0;
  const p99 = total > 0 ? connectionTimes[Math.floor(total * 0.99)] : 0;
  const avg = total > 0 ? Number((connectionTimes.reduce((acc, t) => acc + t, 0) / total).toFixed(2)) : 0;

  const violations = [];
  let passed = true;

  if (p95 > slo.p95HandshakeMs) {
    passed = false;
    violations.push(`P95 Handshake (${p95}ms) exceeded target (${slo.p95HandshakeMs}ms)`);
  }

  if (timeouts.length > slo.maxConnectionErrors) {
    passed = false;
    violations.push(`Encountered ${timeouts.length} handshake timeouts`);
  }

  const report = reporter.recordCustomResult(
    'LOAD-05',
    'WebSocket Real-Time Concurrency',
    wsUrl,
    {
      totalAttempted: numConnections,
      totalConnected: total,
      failedConnections: timeouts.length,
      authRejections,
      stats: {
        avg,
        p50,
        p90,
        p95,
        p99,
        max: total > 0 ? connectionTimes[total - 1] : 0,
      },
      achievedRps: Number((total / (config.handshakeTimeoutMs / 1000)).toFixed(2)),
      errorRatePercent: Number(((timeouts.length / numConnections) * 100).toFixed(1)),
      details: {
        totalAttempted: numConnections,
        totalConnected: total,
        timeoutsSample: timeouts.slice(0, 5),
      },
    },
    passed,
    violations
  );

  console.log(`-> LOAD-05 Finished: ${total}/${numConnections} responsive | P95 Handshake: ${p95}ms | Timeouts: ${timeouts.length} | Status: ${report.passed ? 'PASSED 🟢' : 'FAILED 🔴'}`);
  return report;
}

module.exports = { runWebSocketRealtimeScenario };
