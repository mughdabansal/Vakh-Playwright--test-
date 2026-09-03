# ⚡ API Performance Load Test Report: Vakh Backend API

## Target: `https://xo.eve.vakh.com`
- **Target Throughput**: 200 req/sec
- **Duration**: 15.25 seconds
- **Concurrent Connections**: 50

---

## 📊 Throughput & Response Summary

| Metric | Measured Value |
| :--- | :--- |
| **Total Requests Sent** | **2,328** |
| **Achieved Throughput** | **155.20 req/sec** |
| **Total Bytes Transferred** | **3.57 MB** |
| **Data Rate** | **0.24 MB/sec** |
| **Successful Responses (2xx)** | **1666** |
| **Non-2xx / Error Responses** | **662** |
| **Errors / Timeouts** | **0** |

---

## ⏱️ Latency Distribution

| Percentile / Stat | Latency (ms) |
| :--- | :--- |
| **Average (Mean)** | **323.77 ms** |
| **P50 (Median)** | **184 ms** |
| **P90** | **797 ms** |
| **P97.5** | **1854 ms** |
| **P99** | **2129 ms** |
| **Max Latency** | **2724 ms** |

---

*Report saved to `test-reports/api-performance-report.json`*
