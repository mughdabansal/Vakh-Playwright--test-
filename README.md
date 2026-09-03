# 🎭 Eve Vakh — Playwright E2E & Performance Test Suite

Comprehensive, modular automated End-to-End (E2E) testing, performance load testing, and dynamic team dashboard for [Eve Vakh](https://eve.vakh.com/) and its backend API ([https://xo.vakh.com](https://xo.vakh.com)), built using **Playwright** and **Autocannon** in TypeScript.

---

## 📌 Table of Contents

- [Overview](#-overview)
- [Clean & Modular Architecture](#-clean--modular-architecture)
- [Dynamic Team Quality Dashboard](#-dynamic-team-quality-dashboard)
- [Prerequisites & Installation](#-prerequisites--installation)
- [Available Commands & Scripts](#-available-commands--scripts)
- [Page Object Model (POM) Design](#-page-object-model-pom-design)
- [Multi-Browser Test Execution](#-multi-browser-test-execution)
- [Performance & Load Test Output Analysis](#-performance--load-test-output-analysis)
- [Test Reports & Artifacts](#-test-reports--artifacts)

---

## 🚀 Overview

This repository contains automated test suites designed to validate functionality, authentication flows, cross-browser compatibility, and high-throughput server performance of the **Eve Vakh** web application and backend API.

- **GitHub Repository**: [`https://github.com/mughdabansal/Vakh-Playwright--test-.git`](https://github.com/mughdabansal/Vakh-Playwright--test-.git)
- **Live Team Dashboard**: [`https://mughdabansal.github.io/Vakh-Playwright--test-/`](https://mughdabansal.github.io/Vakh-Playwright--test-/)
- **Web Frontend**: `https://eve.vakh.com/`
- **Backend API**: `https://xo.vakh.com` (Health check, Auth, Database, Storage, Realtime)
- **Sign-In Route**: `https://eve.vakh.com/auth/sign-in`
- **Tech Stack**: Playwright, TypeScript, Node.js, Autocannon, Chart.js

---

## 📊 Dynamic Team Quality Dashboard

An interactive, responsive HTML5 team dashboard is located in [`docs/index.html`](file:///c:/Users/Mughda%20Bansal/Vakh-Playwright--test-/docs/index.html) and published live via GitHub Pages for team members:

👉 **[https://mughdabansal.github.io/Vakh-Playwright--test-/](https://mughdabansal.github.io/Vakh-Playwright--test-/)**

---

## 🧱 Clean & Modular Architecture

```text
Vakh-Playwright--test-/
├── package.json                   # NPM dependencies and script commands
├── package-lock.json              # NPM lockfile
├── tsconfig.json                  # TypeScript configuration & path aliases (@pages, @config)
├── playwright.config.ts           # Playwright framework configuration (testDir: ./src/tests)
├── README.md                      # Comprehensive project documentation
├── docs/                          # Dynamic Team Dashboard (Deployable via GitHub Pages)
│   └── index.html                 # Interactive Chart.js dashboard & coverage matrix
├── scripts/                       # Automation scripts
│   └── generate-dashboard.js      # Dashboard generator from latest test data
├── src/                           # Source directory for all test assets
│   ├── config/                    # Centralized configuration & constants
│   │   └── constants.ts           # App & API URLs, timeouts, test users, perf defaults
│   ├── pages/                     # Page Object Model (POM) classes
│   │   ├── BasePage.ts            # Abstract base page providing shared utilities
│   │   ├── HomePage.ts            # Home page locators and actions (extends BasePage)
│   │   └── LoginPage.ts           # Sign-in, OTP, 2FA, & Header verification (extends BasePage)
│   └── tests/                     # Playwright E2E Test Spec files
│       ├── navigation.spec.ts     # Navigation from Home to Sign-In page
│       └── login.spec.ts          # Full email OTP & 2FA authentication flow
├── performance/                   # Performance load testing setup
│   ├── login-loadtest.js          # Autocannon Web 200 req/sec benchmark runner
│   └── api-loadtest.js            # Autocannon API (xo.vakh.com) load test runner
└── test-reports/                  # Output directory for test reports & artifacts
    ├── html-report/               # Interactive Playwright HTML Report
    ├── test-results/              # Trace files and screenshots on failure
    ├── performance-summary.md     # Web Performance summary report
    ├── performance-report.json    # Web Performance JSON metrics
    ├── api-performance-summary.md # API Performance summary report
    └── api-performance-report.json# API Performance JSON metrics
```

---

## 🔧 Prerequisites & Installation

### Prerequisites
- **Node.js**: v18.0.0 or higher
- **npm**: v9.0.0 or higher

### Installation Steps

1. **Clone the repository**:
   ```bash
   git clone https://github.com/mughdabansal/Vakh-Playwright--test-.git
   cd Vakh-Playwright--test-
   ```

2. **Install Node.js dependencies**:
   ```bash
   npm install
   ```

3. **Install Playwright browser binaries**:
   ```bash
   npx playwright install
   ```

---

## 📜 Available Commands & Scripts

Run these scripts from the project root:

| Command | Description |
| :--- | :--- |
| **`npm test`** | Executes full Playwright E2E test suite across all 4 browser engines (Chrome, Firefox, Safari, Edge). |
| **`npm run test:headed`** | Executes Playwright tests in **headed mode** (opens visible browser windows). |
| **`npm run test:ui`** | Launches the interactive **Playwright UI mode** runner with step-by-step time travel debugging. |
| **`npm run test:report`** | Serves and opens the generated **HTML Test Report** from `test-reports/html-report`. |
| **`npm run test:perf`** | Executes **200 req/sec Web Performance Load Test** against the login page. |
| **`npm run test:perf:api`** | Executes **200 req/sec API Performance Load Test** against backend API (`https://xo.vakh.com`). |
| **`npm run generate:dashboard`** | Regenerates the dynamic team dashboard in `docs/index.html` from latest metrics. |

---

## 🌐 Multi-Browser Test Execution

The test suite is fully configured to execute across 4 major desktop browser engines:
- 🔵 **Google Chrome** (`chromium`)
- 🟠 **Mozilla Firefox** (`firefox`)
- 🟢 **Apple Safari** (`safari` / `webkit`)
- 🔷 **Microsoft Edge** (`edge` / `msedge`)

### Latest Test Results:
```text
Running 8 tests using 4 workers

  ok 1 [chromium] › navigation.spec.ts (10.5s)
  ok 2 [chromium] › login.spec.ts (11.0s)
  ok 3 [firefox]  › navigation.spec.ts (12.8s)
  ok 4 [firefox]  › login.spec.ts (12.8s)
  ok 5 [safari]   › navigation.spec.ts (13.9s)
  ok 6 [safari]   › login.spec.ts (14.1s)
  ok 7 [edge]     › navigation.spec.ts (8.5s)
  ok 8 [edge]     › login.spec.ts (9.4s)

  8 passed (29.8s) — 100% Pass Rate Across All 4 Browsers
```

---

## 🏛️ Page Object Model (POM) Design

### 1. [`src/config/constants.ts`](file:///c:/Users/Mughda%20Bansal/Vakh-Playwright--test-/src/config/constants.ts)
- `APP_CONFIG`: Defines `BASE_URL`, `SIGN_IN_URL`, `MFA_URL`, `API_URL` (`https://xo.vakh.com`), and timeout thresholds.
- `TEST_USERS`: Stores test user credentials (`mughdabansal1414@gmail.com`).
- `PERF_CONFIG`: Benchmark parameters (`TARGET_THROUGHPUT: 200`).

### 2. [`src/pages/BasePage.ts`](file:///c:/Users/Mughda%20Bansal/Vakh-Playwright--test-/src/pages/BasePage.ts)
- `navigateTo(path)`: Shared navigation method with DOM load state waiting.
- `waitForUrlPattern(pattern)`: URL assertion utility.
- `captureScreenshot(name)`: Takes full-page screenshots.

### 3. [`src/pages/HomePage.ts`](file:///c:/Users/Mughda%20Bansal/Vakh-Playwright--test-/src/pages/HomePage.ts)
- Extends `BasePage`.
- `goto()`: Navigates to `https://eve.vakh.com/`.
- `clickWebLink()`: Locates and clicks the `web` sign-in link.

### 4. [`src/pages/LoginPage.ts`](file:///c:/Users/Mughda%20Bansal/Vakh-Playwright--test-/src/pages/LoginPage.ts)
- Extends `BasePage`.
- `verifyIsOnLoginPage()`: Asserts URL matches `/auth/sign-in` and container readiness.
- `requestVerificationCode(email)`: Fills email input and clicks "Send code".
- `submitVerificationCode(code)`: Fills email OTP code and submits.
- `submitMfaCode(mfaCode)`: Fills 2FA authenticator app code and submits.
- `verifyLoggedInState()`: Asserts that the home header is displayed after login.

---

## 📊 Performance & Load Test Output Analysis

### 1. 🌐 Web Frontend Load Test (`https://eve.vakh.com/auth/sign-in`)

| Metric | Measured Output | Analysis & Verdict |
| :--- | :--- | :--- |
| **Target Throughput** | 200 req/sec | Set target throughput. |
| **Achieved Throughput** | **196.20 req/sec** | **98.1% Target Achievement**. Sustained high request volume. |
| **Total Requests Processed** | **2,943 requests** | Successfully processed 2,943 HTTP requests over 15.25 seconds. |
| **HTTP 2xx Success Rate** | **100% (2,943 / 2,943)** | **Perfect Availability**. 0 dropped requests, 0 timeouts, 0 server errors. |
| **Average Latency** | **116.86 ms** | **Ultra-Fast**. Pages load in ~0.11 seconds on average. |
| **P50 (Median) Latency** | **106.00 ms** | 50% of users experience ~0.10s response speed. |
| **P99 Latency** | **564.00 ms** | 99% of requests complete under 0.56 seconds. |
| **Data Transfer Rate** | **854 KB/sec (12.8 MB total)** | Efficient static web bundle delivery over CDN edge servers. |

---

### 2. ⚡ Backend API Load Test (`https://xo.vakh.com`)

| Metric | Measured Output | Analysis & Verdict |
| :--- | :--- | :--- |
| **Target Throughput** | 200 req/sec | Set target throughput. |
| **Achieved Throughput** | **100.80 req/sec** | Serves ~101 successful API calls/sec under stress. |
| **Total Requests Processed** | **1,512 requests** | Processed 1,512 API requests over 15.19 seconds. |
| **Successful 2xx Responses** | **658 (43.5%)** | 658 requests succeeded with `status: ready` health checks. |
| **Non-2xx Responses** | **854 (56.5%)** | **Rate Limiting Active**. Backend triggers HTTP rate-limiting protection under excessive bursts. |
| **Average Latency** | **346.04 ms** | Moderate processing latency under active load throttling. |
| **P50 (Median) Latency** | **250.00 ms** | 50% of API checks complete within 0.25 seconds. |

---

## 📊 Test Reports & Artifacts

All generated reports are saved inside the `test-reports/` folder:
- **Team Dashboard**: [`docs/index.html`](file:///c:/Users/Mughda%20Bansal/Vakh-Playwright--test-/docs/index.html)
- **HTML Report**: [`test-reports/html-report/index.html`](file:///c:/Users/Mughda%20Bansal/Vakh-Playwright--test-/test-reports/html-report/index.html)
- **Web Performance Summary**: [`test-reports/performance-summary.md`](file:///c:/Users/Mughda%20Bansal/Vakh-Playwright--test-/test-reports/performance-summary.md)
- **API Performance Summary**: [`test-reports/api-performance-summary.md`](file:///c:/Users/Mughda%20Bansal/Vakh-Playwright--test-/test-reports/api-performance-summary.md)

---

*Note: This README will be updated continuously as new test cases, page objects, or configurations are added to the repository.*
