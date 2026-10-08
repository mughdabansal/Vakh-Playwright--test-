# ⚡ Eve Vakh Application Load & Performance Test Suite Report

> **Execution Timestamp**: 2026-10-07T05:53:15.819Z  
> **Execution Mode**: **SMOKE**  
> **Overall Benchmark Status**: **INCONCLUSIVE ⚪** (2/3 Passed | 1/3 Inconclusive)

---

## 📊 Executive Summary Table

| Scenario ID | Scenario Name | Target | Achieved RPS | P50 (ms) | P95 (ms) | P99 (ms) | Error Rate | Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **`LOAD-04A`** | User Rate Limit (Quota Throttling) | `https://xo.eve.vakh.com/api/auth/get-session` | **20 req/s** | 372ms | **1274ms** | 1470ms | 0 errors | **⚪ INCONCLUSIVE** |
| **`LOAD-04B`** | IP Rate Limit (Flood Defense) | `https://xo.eve.vakh.com/api/auth/get-session` | **71.43 req/s** | 335ms | **1222ms** | 1345ms | 0 errors | **🟢 PASS** |
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
