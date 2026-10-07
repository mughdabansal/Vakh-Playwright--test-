# ⚡ Eve Vakh Load & Performance Testing Suite

A high-throughput, scenario-driven load testing framework built for the **Eve Vakh** web client, backend REST API, and WebSocket real-time engine.

---

## 🏗️ Architecture & Scenario Overview

The suite is structured into 7 distinct performance tiers:

| Scenario ID | Name | Script Target | Key Evaluation Metric |
| :--- | :--- | :--- | :--- |
| **`LOAD-01`** | **Frontend SPA Delivery** | `https://eve.vakh.com` (`/`, `/auth/sign-in`, `/explore`, `/activity`) | P95 Latency < 350ms, 0% Error Rate |
| **`LOAD-02`** | **API Core Read Throughput** | `/api/posts/popular`, `/api/profiles/explore/nearby`, `/api/init/users/` | P95 Latency < 450ms, 150+ req/s |
| **`LOAD-03`** | **API Stateful Write Load** | `/api/posts/create`, `/api/posts/:id/react` | P95 Latency < 850ms, Error rate < 1.5% |
| **`LOAD-04`** | **Rate Limiting & Isolation** | In-memory & Durable Object limiters | User A 429 backoff; User B 200 OK |
| **`LOAD-05`** | **WebSocket Real-Time Engine** | `wss://xo.eve.vakh.com/ws` | P95 Handshake < 600ms, 0 dropped frames |
| **`LOAD-06`** | **Spike & Stress Testing** | Stepped ramp: 30 -> 150 -> 300 req/s | Graceful 429 degradation, 0% 5xx crashes |
| **`LOAD-07`** | **Endurance & Soak Test** | Steady-state sustained load | Variance < 25%, 0 memory leaks |

---

## 🚀 Running Load Tests

### 1. Run Complete Suite
```bash
npm run test:load
```

### 2. Run Specific Scenarios
```bash
# Frontend SPA Route Delivery only
npm run test:load:frontend

# Backend REST API Read & Write tests
npm run test:load:api

# Rate Limiting & Identity Isolation
npm run test:load:ratelimit

# WebSocket Real-Time Handshake & Concurrency
npm run test:load:websocket

# Spike & Stress Test
npm run test:load:spike

# Endurance & Soak Test
npm run test:load:soak
```

### 3. Custom CLI Parameters
You can customize the concurrency, duration, and target hostnames on the fly:
```bash
node performance/runner.js --scenario=frontend --concurrency=100 --duration=30
node performance/runner.js --scenario=api --rate=250 --duration=20
node performance/runner.js --scenario=all --no-fail
```

---

## 📊 Reports & Artifacts

All reports are automatically aggregated and stored under:
```
test-reports/load/
├── LOAD_TEST_REPORT.md       # Full executive markdown summary with tables and SLO checks
├── load-summary.json         # Aggregated machine-readable JSON metrics
├── load-01.json              # Scenario 1 raw metrics
├── load-02.json              # Scenario 2 raw metrics
└── ...
```

---

## 🤖 GitHub Actions CI/CD Integration

The suite is integrated into `.github/workflows/load-test.yml` with manual dispatch support (`workflow_dispatch`), allowing parameter selection (`scenario`, `concurrency`, `duration`) directly from GitHub Actions.
