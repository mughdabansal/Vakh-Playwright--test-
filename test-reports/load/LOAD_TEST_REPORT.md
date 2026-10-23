# ⚡ Eve Vakh Application Load & Performance Test Suite Report

> **Execution Timestamp**: 2026-10-23T00:47:27.715Z  
> **Execution Mode**: **SMOKE**  
> **Overall Benchmark Status**: **INCONCLUSIVE ⚪** (2/3 Passed | 1/3 Inconclusive)

---

## 📊 Executive Summary Table

| Scenario ID | Scenario Name | Target | Achieved RPS | P50 (ms) | P95 (ms) | P99 (ms) | Error Rate | Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **`LOAD-04A`** | User Rate Limit (Quota Throttling) | `https://xo.eve.vakh.com/api/auth/get-session` | **17 req/s** | 347ms | **2533ms** | 2620ms | 0 errors | **⚪ INCONCLUSIVE** |
| **`LOAD-04B`** | IP Rate Limit (Flood Defense) | `https://xo.eve.vakh.com/api/auth/get-session` | **83.34 req/s** | 319ms | **859ms** | 896ms | 0 errors | **🟢 PASS** |
| **`LOAD-04C`** | User Identity Isolation (Pre-IP Barrier) | `https://xo.eve.vakh.com/api/auth/get-session` | **N/A** | N/A | **N/A** | N/A | 0 errors | **🟢 PASS** |

---

## 🔍 Detailed Scenario Breakdown

### LOAD-04A: User Rate Limit (Quota Throttling)

- **Target URL**: `https://xo.eve.vakh.com/api/auth/get-session`
- **Evaluation Result**: **INCONCLUSIVE**
- **Observations**:
  - ℹ️ Calibrated volume (120 reqs) was absorbed across edge isolates without hitting the 60 rpm isolate counter.
---

### LOAD-04B: IP Rate Limit (Flood Defense)

- **Target URL**: `https://xo.eve.vakh.com/api/auth/get-session`
- **Evaluation Result**: **PASS**
---

### LOAD-04C: User Identity Isolation (Pre-IP Barrier)

- **Target URL**: `https://xo.eve.vakh.com/api/auth/get-session`
- **Evaluation Result**: **PASS**
---

*Generated automatically by Eve Vakh Load Testing Suite. Artifacts saved in `test-reports/load/`.*
