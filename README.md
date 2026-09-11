# 🎭 Eve Vakh — Playwright E2E, Sanity & Performance Test Suite

Comprehensive, enterprise-grade End-to-End (E2E) testing framework, automated Sanity suite, Staging API validation, high-throughput Autocannon performance benchmarks, and an interactive 5-tab dynamic team dashboard for [Eve Vakh](https://eve.vakh.com/) and its Staging Backend API ([https://xo.eve.vakh.com](https://xo.eve.vakh.com)).

Built with **Playwright Test**, **TypeScript**, **Autocannon**, and **GitHub Actions**.

---

## 📌 Table of Contents

- [Overview & Quick Links](#-overview--quick-links)
- [Architecture & Repository Structure](#-architecture--repository-structure)
- [Comprehensive Test Suites & Matrix (30 Tests)](#-comprehensive-test-suites--matrix-30-tests)
  - [1. Explore Page Test Suite (9 Tests)](#1-explore-page-test-suite-9-tests)
  - [2. Login & Authentication Suite (4 Tests)](#2-login--authentication-suite-4-tests)
  - [3. Staging Backend API Suites (16 Tests)](#3-staging-backend-api-suites-16-tests)
  - [4. Navigation Suite (1 Test)](#4-navigation-suite-1-test)
- [Sanity Testing Workflow](#-sanity-testing-workflow)
- [Multi-Browser Cross-Platform Coverage](#-multi-browser-cross-platform-coverage)
- [Dynamic Team Quality Dashboard](#-dynamic-team-quality-dashboard)
- [Performance & High-Throughput Load Benchmarks](#-performance--high-throughput-load-benchmarks)
- [CI/CD & GitHub Actions Pipelines](#-cicd--github-actions-pipelines)
- [Available Commands & Scripts](#-available-commands--scripts)
- [Test Reports & Artifacts](#-test-reports--artifacts)

---

## 🚀 Overview & Quick Links

- **GitHub Repository**: [`https://github.com/mughdabansal/Vakh-Playwright--test-`](https://github.com/mughdabansal/Vakh-Playwright--test-)
- **Live Team Dashboard**: [**https://mughdabansal.github.io/Vakh-Playwright--test-/**](https://mughdabansal.github.io/Vakh-Playwright--test-/)
- **Target Web Frontend**: `https://eve.vakh.com/`
- **Sign-In Route**: `https://eve.vakh.com/auth/sign-in`
- **Explore Route**: `https://eve.vakh.com/explore`
- **Staging Backend API**: `https://xo.eve.vakh.com` (Health check, Auth, Database, Storage, Realtime)
- **CI Pipelines**: Automated on push to `main`, Pull Requests, and manual dispatch.

---

## 🧱 Architecture & Repository Structure

```text
Vakh-Playwright--test-/
├── .github/
│   └── workflows/
│       ├── test-and-deploy.yml    # Full regression suite run & GitHub Pages dashboard deployment
│       └── sanity-test.yml        # Fast-feedback Sanity workflow (Login + Explore) with browser selector
├── docs/                          # Live Team Quality Dashboard (GitHub Pages)
│   └── index.html                 # Interactive 5-tab dashboard with Chart.js analytics & metrics
├── performance/                   # Performance & load benchmark runners
│   ├── login-loadtest.js          # Autocannon 200 req/sec benchmark for Web Login Portal
│   └── api-loadtest.js            # Autocannon 200 req/sec benchmark for Staging Backend API
├── scripts/                       # Automation, inspection & data generation utilities
│   ├── generate-dashboard.js      # Compiles test results and metrics into docs/index.html
│   ├── explore-inspector.js       # Live DOM locator extractor for Explore page
│   ├── profile-inspector.js       # Profile modal DOM element auditor
│   └── inspect-forms.js           # Modal tabs, forms & subscribe state probe
├── src/
│   ├── config/
│   │   └── constants.ts           # Centralized endpoints, timeout tolerances, test credentials
│   ├── pages/                     # Page Object Model (POM) layer
│   │   ├── BasePage.ts            # Abstract base page with shared navigation & waits
│   │   ├── HomePage.ts            # Landing page actions & header locators
│   │   ├── LoginPage.ts           # Sign-in UI, mode toggling, OTP, 2FA, masking, legal links
│   │   ├── ExplorePage.ts         # Explore grid, search, filter modals, user profile view & forms
│   │   ├── PostComposerPage.ts    # Home "New Post", form selector modal, composer tools, post submit
│   │   └── ModerationPage.ts      # Form owner moderation queue, post approve (publish) & reject review
│   └── tests/                     # Playwright Test Spec definitions
│       ├── sanity/                # Versioned Sanity Testing Suites
│       │   ├── 1.0/               # Sanity 1.0: Core Authentication & Discovery (13 Tests)
│       │   │   ├── login.spec.ts   # 4 Login UI/UX, OTP/Password toggles, masking & auth tests
│       │   │   └── explore.spec.ts # 9 Explore UI/UX, modals, profile, forms & subscribe tests
│       │   └── 2.0/               # Sanity 2.0: Home Posting & Form Owner Moderation (8 Tests)
│       │       ├── posting.spec.ts # 4 Home New Post, form selector, composer tools, post submit
│       │       └── moderation.spec.ts # 4 Form queue, approve review, reject review, security guards
│       ├── explore.spec.ts        # Explore regression suite (9 Tests)
│       ├── login.spec.ts          # Login regression suite (4 Tests)
│       ├── api.spec.ts            # 16 Staging backend API tests (6 Core Gateway + 10 Auth /api/auth/*)
│       └── navigation.spec.ts     # 1 Home to Auth navigation smoke test
├── test-reports/                  # Test artifacts & performance telemetry
│   ├── html-report/               # Interactive Playwright HTML Report
│   ├── performance-summary.md     # Web Portal benchmark summary
│   ├── performance-report.json    # Web Portal raw telemetry
│   ├── api-performance-summary.md # Staging API benchmark summary
│   └── api-performance-report.json# Staging API raw telemetry
├── LOGIN_PAGE_REPORT.txt          # Dedicated Login Page inspection & audit report
├── playwright.config.ts           # Multi-project browser matrix & execution configuration
├── package.json                   # NPM dependencies & runner scripts
└── tsconfig.json                  # TypeScript compiler settings & path aliases
```

---

## 🧪 Comprehensive Test Suites & Matrix (56 Regression Tests)

The framework houses **56 automated regression test cases** plus **21 versioned sanity test cases** (77 Total Scenarios). When executed across all 4 browser engines, this yields **308 total multi-browser assertions**.

### 1. Chat & Messaging Comprehensive Suite (16 Tests)
Located in [`src/tests/chat.spec.ts`](file:///c:/Users/Mughda%20Bansal/Vakh-Playwright--test-/src/tests/chat.spec.ts) and backed by [`src/pages/ChatPage.ts`](file:///c:/Users/Mughda%20Bansal/Vakh-Playwright--test-/src/pages/ChatPage.ts):

| Test ID | Scenario Description | Expected Outcome |
| :--- | :--- | :--- |
| **`TC_CHAT_001`** | **Chat Page UI Layout, Header & Active Stream** | Asserts Messages heading, New Message CTA, and conversation cards stream container. |
| **`TC_CHAT_002`** | **1-on-1 Direct Messaging & Real-Time Delivery** | Initiates 1-on-1 DM with `@happy_badger_2312`, transmits unique timestamped text, verifies bubble rendering. |
| **`TC_CHAT_003`** | **Multi-Peer Group Chat Creation** | Searches & selects multiple allowed peers (`@happy_badger_2312`, `@mughdabansal1414`), triggers "Create Group". |
| **`TC_CHAT_004`** | **Group Chat Name Editing by Admin / Owner** | Opens Conversation Settings, clicks "Edit group name", updates group title and asserts real-time heading reflection. |
| **`TC_CHAT_005`** | **Adding Allowed Member to Existing Group Chat** | Opens group settings, clicks "Add members", searches for allowed contact and confirms roster expansion. |
| **`TC_CHAT_006`** | **Promoting Eligible Member to Group Admin Role** | Selects eligible member in roster, clicks "Make admin", asserts admin role assignment in settings. |
| **`TC_CHAT_007`** | **Demoting Admin Back to Regular Member** | Selects admin user, executes "Remove admin", asserts privilege revocation back to regular member. |
| **`TC_CHAT_008`** | **Removing Member from Group Chat** | Group admin clicks "Remove [user]" to evict regular member from conversation. |
| **`TC_CHAT_009`** | **Photo / Image Attachment Upload** | Opens attachment drawer, triggers "Attach photos", and uploads sample PNG image binary. |
| **`TC_CHAT_010`** | **Document File Attachment Upload** | Opens attachment drawer, triggers "Attach files", and uploads sample text document fixture. |
| **`TC_CHAT_011`** | **Cleanly Leaving Group Conversation** | Clicks "Leave conversation" in group settings, confirms exit and validates graceful navigation. |
| **`TC_CHAT_012`** | **[Negative] Empty & Whitespace Message Submission Block** | Enforces that typing whitespace or leaving input empty disables send CTA or blocks empty dispatch. |
| **`TC_CHAT_013`** | **[Negative] Group Creator Protection from Admin Removal** | Validates CREATOR badge on `@m_2094` and verifies other admins cannot remove or demote the owner. |
| **`TC_CHAT_014`** | **[Negative] Regular Members Cannot Remove Admins** | Asserts non-admin members lack moderation actions over admins in the conversation roster. |
| **`TC_CHAT_015`** | **[Negative] Admin Promotion Requires Accepted Membership** | Enforces that pending invitees cannot be elevated to admin status before joining the group. |
| **`TC_CHAT_016`** | **[Edge] Rich Text, Emojis & Multi-Line Linebreaks** | Transmits multi-line messages with emojis (🚀, 🧪) and symbols (@#$%^&*) without escaping errors. |

---

### 2. Home Page Full UI, Feed, Posting & Settings Suite (10 Tests)
Located in [`src/tests/home.spec.ts`](file:///c:/Users/Mughda%20Bansal/Vakh-Playwright--test-/src/tests/home.spec.ts) and backed by [`src/pages/HomePage.ts`](file:///c:/Users/Mughda%20Bansal/Vakh-Playwright--test-/src/pages/HomePage.ts):

| Test ID | Scenario Description | Expected Outcome |
| :--- | :--- | :--- |
| **`TC_HOME_001`** | **Home Page UI Layout & Sidebar Navigation** | Asserts Home section header branding, sidebar navigation menu items (Home, Chat, Activity, Explore), New Post CTA, profile button (`@m_2094`), and sidebar More menu are visible. |
| **`TC_HOME_002`** | **Allowed Creator Feed Filtering & Form Exclusion** | Asserts feed renders posts strictly from allowed creators (`happy_badger_2312`, `mughdabansal1414`) and enforces exclusion of tracking boards ("bug tracker", "test tracker"). |
| **`TC_HOME_003`** | **Home Post Creation Flow in User's Own Form** | Launches New Post modal from Home page, selects target form (`@m_2094 / posts`), enters body content, and submits without session disruption. |
| **`TC_HOME_004`** | **Click Post & Validate Text, Media & Interactive Links** | Clicks allowed post card to open detail view; verifies text readability, media elements (images/videos), and hyperlink `href` attributes. |
| **`TC_HOME_005`** | **Post Selection & Quote Composer Flow** | Selects post using action toolbar, clicks "Quote selected posts", verifies modal launcher and cleanly dismisses without error. |
| **`TC_HOME_006`** | **Post Sharing Flow Through Chat** | Selects allowed post and triggers "Chat about selected posts" to open conversation sharing dialog. |
| **`TC_HOME_007`** | **Visit Post Author Profile Page** | Navigates from post view to author's profile page (`/user/happy_badger_2312`) and asserts profile handle. |
| **`TC_HOME_008`** | **Navigation to Own Profile Page (@m_2094)** | Clicks profile button in sidebar, verifies navigation to user's profile view and handle badge rendering. |
| **`TC_HOME_009`** | **Navigation to Settings Page via More Menu** | Opens sidebar More menu, clicks "Settings", asserts navigation to `/settings` and settings configuration sections. |
| **`TC_HOME_010`** | **Navigation to Subscriptions Page via More Menu** | Opens sidebar More menu, clicks "Subscriptions", asserts navigation to subscriptions view and preferences. |

---

### 2. Explore Page Test Suite (9 Tests)
Located in [`src/tests/explore.spec.ts`](file:///c:/Users/Mughda%20Bansal/Vakh-Playwright--test-/src/tests/explore.spec.ts) and backed by [`src/pages/ExplorePage.ts`](file:///c:/Users/Mughda%20Bansal/Vakh-Playwright--test-/src/pages/ExplorePage.ts):

| Test ID | Scenario Description | Expected Outcome |
| :--- | :--- | :--- |
| **`TC_EXP_001`** | **Header, Search Bar & Core Controls** | Logo renders, search bar has accessible placeholder, Active 24h toggle is interactive, Filter & Sort buttons render. |
| **`TC_EXP_002`** | **User Profile Cards Grid & Attributes** | Multiple user cards render, displaying avatar, display name, handle (`@...`), and subscription rate (`/month`). |
| **`TC_EXP_003`** | **Nearby Filter Modal & Actions** | Clicking Nearby opens modal with slider (`0 km - 100 km`), displays Clear / Apply filters buttons, and dismisses cleanly. |
| **`TC_EXP_004`** | **Tags Filter Modal & Chip Selection** | Clicking Tags opens modal, displays category chips (e.g. `Tech`, `Fashion`), and allows selecting chips. |
| **`TC_EXP_005`** | **Active 24h Filter Toggle & State** | Toggling switch changes aria-checked / active visual styling without crashing the page or unmounting grid. |
| **`TC_EXP_006`** | **Profile View on User Card Click** | Clicking any user card opens the comprehensive profile view with banner, avatar, bio, and stats. |
| **`TC_EXP_007`** | **Profile Action Buttons & Interactivity** | Verifies Chat/Message, Tip, Share, and Subscribe CTAs are visible and enabled on the user profile. |
| **`TC_EXP_008`** | **Forms / Content Sections on Profile** | Validates Posts, Media, and Forms/Tabs section render on the user profile modal. |
| **`TC_EXP_009`** | **Subscribe Button State & Toggle** | Validates Subscribe CTA (`$X.XX/month`), clicks to trigger confirmation or subscription modal/state. |

---

### 3. Login & Authentication Suite (4 Tests)
Located in [`src/tests/login.spec.ts`](file:///c:/Users/Mughda%20Bansal/Vakh-Playwright--test-/src/tests/login.spec.ts) and backed by [`src/pages/LoginPage.ts`](file:///c:/Users/Mughda%20Bansal/Vakh-Playwright--test-/src/pages/LoginPage.ts):

| Test ID | Scenario Description | Expected Outcome |
| :--- | :--- | :--- |
| **`TC-01`** | **Sign-In Page UI/UX & Initial State** | Eve Vakh branding, email input with placeholder, and "Send Login Code" CTA render in pristine state. |
| **`TC-02`** | **Authentication Mode Toggle (OTP vs Password)** | Seamlessly switches between Password and OTP modes; input types toggle between `type="text"` and `type="password"`. |
| **`TC-03`** | **Password Visibility Masking & Legal Links** | Eye toggle switches input between `password` and `text`; Terms of Service & Privacy Policy links point to valid targets. |
| **`TC-04`** | **Login Submission & MFA/Code Navigation** | Submitting valid test email (`mughdabansal2094@gmail.com`) triggers loading state and advances to verification/MFA view. |

---

### 4. Staging Backend API Suites (16 Tests)
Located in [`src/tests/api.spec.ts`](file:///c:/Users/Mughda%20Bansal/Vakh-Playwright--test-/src/tests/api.spec.ts) targeting `https://xo.eve.vakh.com`:

#### A. Core Gateway & Storage Suite (6 Tests)
| Test ID | Endpoint | Method | Expected Outcome |
| :--- | :--- | :---: | :--- |
| **`API_TC_001`** | `/health` | `GET` | HTTP 200 OK, returns `{ status: "ready" }` within latency threshold. |
| **`API_TC_002`** | `/` | `GET` | HTTP 200 OK, gateway root responds with valid JSON payload. |
| **`API_TC_003`** | `/api` | `GET` | HTTP 401 Unauthorized, enforces security guard on unauthenticated access. |
| **`API_TC_004`** | `/api/health` | `GET` | HTTP 401 Unauthorized, protects internal health route against unauthorized probes. |
| **`API_TC_005`** | `/api/storage/avatar/...` | `GET` | HTTP 200 OK, serves public avatar with valid `image/*` Content-Type. |
| **`API_TC_006`** | `/health` | `GET` | HTTP 200 OK, verifies presence of essential HTTP security headers. |

#### B. Dedicated Authentication API Suite — ALL `/api/auth/*` (10 Tests)
| Test ID | Endpoint | Method | Scenario & Expected Validation |
| :--- | :--- | :---: | :--- |
| **`API_AUTH_001`** | `/api/auth/get-session` | `GET` | Asserts unauthenticated session probe returns `200 OK` with body `null`. |
| **`API_AUTH_002`** | `/api/auth/sign-in/email` | `POST` | Submits empty payload `{}`; validates `400 Bad Request` with `VALIDATION_ERROR` for email/password. |
| **`API_AUTH_003`** | `/api/auth/sign-in/email` | `POST` | Submits invalid credentials; validates `401 Unauthorized` with `INVALID_EMAIL_OR_PASSWORD`. |
| **`API_AUTH_004`** | `/api/auth/sign-in/email` | `OPTIONS` | Validates CORS preflight returns `204 No Content` with appropriate CORS directives. |
| **`API_AUTH_005`** | `/api/auth/sign-in/email-otp` | `POST` | Submits empty payload; validates `400 Bad Request` requiring `email` and `otp`. |
| **`API_AUTH_006`** | `/api/auth/email-otp/send-verification-otp` | `POST` | Validates `400 Bad Request` enforcing `email` and allowed `type` enum (`"email-verification" \| "sign-in" \| "forget-password" \| "change-email"`). |
| **`API_AUTH_007`** | `/api/auth/phone-number/send-otp` | `POST` | Validates `400 Bad Request` with `VALIDATION_ERROR` when `phoneNumber` is omitted. |
| **`API_AUTH_008`** | `/api/auth/phone-number/verify` | `POST` | Validates `400 Bad Request` with `VALIDATION_ERROR` when `phoneNumber` or `code` are omitted. |
| **`API_AUTH_009`** | `/api/auth/oauth2/consent-meta` | `GET` | Validates `400 Bad Request` requiring `consent_code` parameter. |
| **`API_AUTH_010`** | `/api/auth/*` | `POST` | Validates security error schemas, JSON standards, and rate limiting resilience (`429 RATE_LIMIT_EXCEEDED`). |

---

### 5. Navigation Suite (1 Test)
Located in [`src/tests/navigation.spec.ts`](file:///c:/Users/Mughda%20Bansal/Vakh-Playwright--test-/src/tests/navigation.spec.ts):

| Test ID | Scenario Description | Expected Outcome |
| :--- | :--- | :--- |
| **`NAV-01`** | **Home to Sign-In Navigation Flow** | Navigates from landing page via "Sign In" button and verifies destination URL and form presence. |

---

## ⚡ Versioned Sanity Testing Workflow (1.0, 2.0, ...)

Sanity testing in Eve Vakh is organized into dedicated, versioned releases under `src/tests/sanity/<version>/` to provide targeted fast-feedback gates as the platform evolves:

```text
src/tests/sanity/
├── 1.0/                          # Sanity Release 1.0 (13 Tests)
│   ├── login.spec.ts             # 4 Tests: Sign-in UI/UX, OTP vs Password, Masking, Submission
│   └── explore.spec.ts           # 9 Tests: Explore Header, Grid, Nearby/Tags Modals, Profile, Forms, Subscribe
└── 2.0/                          # Sanity Release 2.0 (8 Tests)
    ├── posting.spec.ts           # 4 Tests: Home New Post CTA, Form Picker, Composer Tools, Submission
    └── moderation.spec.ts        # 4 Tests: Form History Queue, Post Approve Review, Reject Review, Auth Guards
```

---

### 📦 Sanity 1.0: Core Authentication & Discovery (13 Tests)
- **Directory**: [`src/tests/sanity/1.0/`](file:///c:/Users/Mughda%20Bansal/Vakh-Playwright--test-/src/tests/sanity/1.0/)
- **Command**: `npm run test:sanity:1.0`
- **Scope**:
  1. **Authentication (`login.spec.ts` - 4 Tests)**: Sign-in UI layout (`TC-01`), OTP vs Password mode switching (`TC-02`), password masking eye toggle & legal links (`TC-03`), credentials submission & MFA code view (`TC-04`).
  2. **Explore Discovery (`explore.spec.ts` - 9 Tests)**: Header controls (`TC_EXP_001`), user card attributes (`TC_EXP_002`), Nearby filter slider (`TC_EXP_003`), category tags chips (`TC_EXP_004`), 24h active toggle (`TC_EXP_005`), user profile view (`TC_EXP_006`), profile CTAs (`TC_EXP_007`), profile forms & content sections (`TC_EXP_008`), subscription button toggle (`TC_EXP_009`).

---

### 🚀 Sanity 2.0: Home Posting & Form Owner Moderation (8 Tests)
- **Directory**: [`src/tests/sanity/2.0/`](file:///c:/Users/Mughda%20Bansal/Vakh-Playwright--test-/src/tests/sanity/2.0/)
- **Command**: `npm run test:sanity:2.0`
- **Scope**:

#### A. Home Posting & Composer Suite (`posting.spec.ts` - 4 Tests)
Backed by [`src/pages/PostComposerPage.ts`](file:///c:/Users/Mughda%20Bansal/Vakh-Playwright--test-/src/pages/PostComposerPage.ts):

| Test ID | Scenario Description | Target Locators & Actions | Expected Outcome |
| :--- | :--- | :--- | :--- |
| **`TC_POST_001`** | **Home New Post Button & Modal Launch** | `button[aria-label="New Post"]` &rarr; `[role="dialog"]` | Visible "New Post" button on authenticated home page launches the "CREATE FORMS" selection modal. |
| **`TC_POST_002`** | **Target Form Selection & Composer View** | `button[aria-label="Create in posts"]` | Clicking target form transitions dialog into post composer view (`NEW POST IN @user / form`). |
| **`TC_POST_003`** | **Composition Tools & Controls** | `Add Text`, `Add Media`, `Add Longform`, `Create` | Displays all composition block actions ("Add Text", "Add Media", "Add Longform", "Add Link", "Add Quote", "Add Mention") and Create button. |
| **`TC_POST_004`** | **Text Content Entry & Post Submission** | `textarea / [contenteditable]` &rarr; `submitPost()` | Inputs text content, executes submission, and ensures clean lifecycle execution without auth redirects. |

#### B. Form Owner Moderation & History Suite (`moderation.spec.ts` - 4 Tests)
Backed by [`src/pages/ModerationPage.ts`](file:///c:/Users/Mughda%20Bansal/Vakh-Playwright--test-/src/pages/ModerationPage.ts):

| Test ID | Scenario Description | Target Endpoint & Method | Expected Outcome |
| :--- | :--- | :---: | :--- |
| **`TC_MOD_001`** | **Form Moderation Queue Query** | `GET /api/forms/:formId/moderation-posts` | Queries pending posts in form history queue and validates JSON response structure and headers. |
| **`TC_MOD_002`** | **Moderator Post Approval Review Contract** | `POST /api/posts/:postId/review/publish` | Validates form owner acceptance & publishing action contracts on queued posts. |
| **`TC_MOD_003`** | **Moderator Post Rejection Review Contract** | `POST /api/posts/:postId/review/reject` | Validates form owner rejection review contract with optional feedback rationale payload. |
| **`TC_MOD_004`** | **Strict Authentication & Security Guards** | `POST /api/posts/*/review/*` | Enforces HTTP 401/403 security protections preventing unauthenticated moderation. |

---

### Running Sanity Tests Locally:
```powershell
# Run ALL Sanity test suites (1.0 + 2.0 = 21 Tests) across all browsers
npm run test:sanity

# Run Sanity 1.0 (Login + Explore - 13 Tests)
npm run test:sanity:1.0

# Run Sanity 2.0 (Home Posting + Form Moderation - 8 Tests)
npm run test:sanity:2.0

# Run Sanity 2.0 targeted on Google Chromium
npx playwright test src/tests/sanity/2.0 --project=chromium

# Run Sanity 2.0 in headed browser mode for visual inspection
npx playwright test src/tests/sanity/2.0 --headed --project=chromium
```

### GitHub Actions Sanity Workflow:
Provided in [`.github/workflows/sanity-test.yml`](file:///c:/Users/Mughda%20Bansal/Vakh-Playwright--test-/.github/workflows/sanity-test.yml):
- **Automatic Triggers**: Runs on `push` or `pull_request` whenever sanity tests or page objects are modified.
- **Manual Trigger (`workflow_dispatch`)**:
  - `suite_version`: Choose between `all`, `1.0`, or `2.0`.
  - `browser`: Choose between `all`, `chromium`, `firefox`, `webkit`, or `edge`.
- **Rich Summary**: Generates a GitHub Step Summary and publishes Playwright HTML artifacts on completion.

---

## 🌐 Multi-Browser Cross-Platform Coverage

Playwright is configured in [`playwright.config.ts`](file:///c:/Users/Mughda%20Bansal/Vakh-Playwright--test-/playwright.config.ts) to test against 4 modern browser engines:

| Project Name | Browser Engine | User Agent / Device Emulation | Viewport |
| :--- | :--- | :--- | :--- |
| **`chromium`** | Google Chromium (Desktop) | Chrome 122+ Desktop | 1280 × 720 |
| **`firefox`** | Mozilla Firefox | Firefox Gecko Engine | 1280 × 720 |
| **`safari`** | WebKit (Apple Safari) | Safari WebKit Engine | 1280 × 720 |
| **`edge`** | Microsoft Edge | Chromium MS Edge Engine | 1280 × 720 |

---

## 📊 Dynamic Team Quality Dashboard

The repository includes a self-contained, responsive team dashboard built with HTML5 and Chart.js, hosted live via GitHub Pages:

👉 **[https://mughdabansal.github.io/Vakh-Playwright--test-/](https://mughdabansal.github.io/Vakh-Playwright--test-/)**

### Dashboard Features:
1. **Overview Tab**: Live automated test coverage KPIs (51 scenarios / 100% pass rate), cross-browser distribution charts, web & backend API benchmarks, and direct-action module cards.
2. **Sanity Suites Tab (NEW ⚡)**: Dedicated interactive presentation of versioned sanity releases with instant version filtering (`All`, `Sanity 1.0`, `Sanity 2.0`), 21 test case breakdown tables, multi-browser timing matrix, and copyable CLI runner snippets.
3. **Login Page Tab**: Full pass/fail breakdown for `TC-01` through `TC-04`, dual-mode OTP vs Password inspection, eye masking toggle, and auth submission audit.
4. **Home Page Tab**: Public landing hero branding verification, desktop/mobile header navigation, and `/auth/sign-in` gateway routing smoke tests.
5. **Explore Page Tab**: Comprehensive status for `TC_EXP_001` through `TC_EXP_009`, modal verification, interactive user simulator, and subscription state checks.
6. **Chat Page Tab**: Real-time messaging channels, direct message buttons, and unread counters backend sync tracker.
7. **Activity Page Tab**: Social feed, heart milestones, creator mentions, and activity timeline verification.
8. **GitHub Actions CI/CD Tab**: High-throughput Autocannon benchmark charts comparing Web Portal vs Staging Backend API, pipeline step timeline, and direct GitHub Actions workflow links.

---

## ⚡ Performance & High-Throughput Load Benchmarks

Performance tests are executed using **Autocannon** at a target throughput of **200 requests/sec**:

### 1. 🌐 Web Login Portal (`https://eve.vakh.com/auth/sign-in`)
- **Achieved Throughput**: **200.07 req/sec** (100.0% of target)
- **Total Requests Processed**: **3,001 requests** over 15.00 seconds
- **Success Rate**: **100% (3,001 / 3,001)** — 0 dropped requests, 0 timeouts, 0 non-2xx codes
- **Average Latency**: **48.68 ms**
- **P50 (Median) Latency**: **24.00 ms**
- **P99 Latency**: **148.00 ms**

### 2. ⚡ Staging Backend API (`https://xo.eve.vakh.com`)
- **Achieved Throughput**: **164.47 req/sec**
- **Total Requests Processed**: **2,467 requests** over 15.00 seconds
- **Success Rate**: **100%** (all health checks responded with HTTP 200 `{ "status": "ready" }`)
- **Average Latency**: **186.76 ms**
- **P50 (Median) Latency**: **164.00 ms**
- **P99 Latency**: **493.00 ms**

---

## 🔄 CI/CD & GitHub Actions Pipelines

The project maintains two production CI/CD workflows:

| Workflow | File | Triggers | Responsibilities |
| :--- | :--- | :--- | :--- |
| **E2E Tests & Dashboard** | [`.github/workflows/test-and-deploy.yml`](file:///c:/Users/Mughda%20Bansal/Vakh-Playwright--test-/.github/workflows/test-and-deploy.yml) | Push to `main`, Pull Requests, `workflow_dispatch` | Runs full test suite, regenerates `docs/index.html`, auto-commits metrics, deploys to GitHub Pages. |
| **Sanity Test Suite** | [`.github/workflows/sanity-test.yml`](file:///c:/Users/Mughda%20Bansal/Vakh-Playwright--test-/.github/workflows/sanity-test.yml) | Push/PR on Sanity & Page files, `workflow_dispatch` | Runs versioned sanity suites (`all`, `1.0`, or `2.0`) on selected browser engine with step summaries. |

---

## 📜 Available Commands & Scripts

| Command | Description |
| :--- | :--- |
| **`npm test`** | Runs all 30 Playwright E2E and API tests across configured engines. |
| **`npm run test:sanity`** | Runs all Sanity test suites (1.0 + 2.0 = 21 Tests) across all browsers. |
| **`npm run test:sanity:1.0`** | Runs Sanity 1.0 (Login + Explore - 13 Tests). |
| **`npm run test:sanity:2.0`** | Runs Sanity 2.0 (Home Posting + Form Moderation - 8 Tests). |
| **`npm run test:api`** | Runs all 16 Staging Backend API tests (Core + Auth) against `https://xo.eve.vakh.com`. |
| **`npm run test:api:auth`** | Runs the 10 dedicated Authentication API tests for ALL `/api/auth/*` endpoints. |
| **`npm run test:headed`** | Runs Playwright tests in visible headed browser mode. |
| **`npm run test:ui`** | Launches interactive Playwright UI mode with time-travel debugger. |
| **`npm run test:report`** | Opens the Playwright HTML test report in the default web browser. |
| **`npm run test:perf`** | Runs the 200 req/sec Autocannon benchmark against the Web Login portal. |
| **`npm run test:perf:api`** | Runs the 200 req/sec Autocannon benchmark against the Staging Backend API. |
| **`npm run generate:dashboard`** | Re-compiles `docs/index.html` from the latest test results. |

---

## 📁 Test Reports & Artifacts

All outputs and telemetry are archived locally in `test-reports/` and uploaded in GitHub Actions:
- **Interactive Team Dashboard**: [`docs/index.html`](file:///c:/Users/Mughda%20Bansal/Vakh-Playwright--test-/docs/index.html)
- **Playwright HTML Report**: `test-reports/html-report/index.html`
- **Login Page Inspection Audit**: [`LOGIN_PAGE_REPORT.txt`](file:///c:/Users/Mughda%20Bansal/Vakh-Playwright--test-/LOGIN_PAGE_REPORT.txt)
- **Web Performance Telemetry**: `test-reports/performance-report.json` & `test-reports/performance-summary.md`
- **API Performance Telemetry**: `test-reports/api-performance-report.json` & `test-reports/api-performance-summary.md`

---

*Authored and maintained for the Eve Vakh Quality Assurance & Automation Engineering Team.*
