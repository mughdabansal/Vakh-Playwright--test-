# ⚡ API Performance Load Test Report: Vakh Backend API

## Target: `https://xo.eve.vakh.com`
- **Target Throughput**: 200 req/sec
- **Duration**: 15.2 seconds
- **Concurrent Connections**: 50

---

## 📊 Throughput & Response Summary

| Metric | Measured Value |
| :--- | :--- |
| **Total Requests Sent** | **1,777** |
| **Achieved Throughput** | **118.47 req/sec** |
| **Total Bytes Transferred** | **2.75 MB** |
| **Data Rate** | **0.18 MB/sec** |
| **Successful Responses (2xx)** | **1467** |
| **Non-2xx / Error Responses** | **310** |
| **Errors / Timeouts** | **0** |

---

## ⏱️ Latency Distribution

| Percentile / Stat | Latency (ms) |
| :--- | :--- |
| **Average (Mean)** | **245.06 ms** |
| **P50 (Median)** | **210 ms** |
| **P90** | **461 ms** |
| **P97.5** | **833 ms** |
| **P99** | **1045 ms** |
| **Max Latency** | **1664 ms** |

---

*Report saved to `test-reports/api-performance-report.json`*
