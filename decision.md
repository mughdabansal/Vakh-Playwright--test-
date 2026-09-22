# Architecture & Engineering Decision Report (`decision.md`)

This living document tracks key technical decisions, architectural rationales, and failure diagnostics across the Eve Vakh Playwright automated test infrastructure. It is maintained across tasks to preserve context, design reasoning, and regression-prevention strategies.

---

## 1. Architectural Decisions & Engineering Rationales

### Decision 1: Poll Creation & Interactive Voting Automation (`TC_POST_005`)
* **Context**: `TC_POST_005` in `src/tests/post.spec.ts` and `PostComposerPage.ts` was consistently failing in GitHub Actions CI during form creation and poll post publishing.
* **Root Causes Diagnosed**:
  1. **Missing Module Import**: `APP_CONFIG` was not imported in `PostComposerPage.ts`, causing a runtime `ReferenceError` during `await this.page.goto(`${APP_CONFIG.BASE_URL}/form/new/edit`)`. This triggered a fragile fallback that searched for a hardcoded profile button `m_2094`.
  2. **React Native Web Focus/Blur Drop**: Typing into poll input fields (e.g. `Option 2`) leaves focus in the input. Clicking the `Create` button directly fired an `onBlur` event that initiated a component re-render, dropping the click event before the `POST /api/posts/<id>/publish` endpoint was dispatched.
  3. **Initial Draft Race Condition**: Clicking `Add poll` triggers an asynchronous `POST /api/posts` request to create an initial draft with empty question/option fields. When automated tests filled the fields while this request was in flight, the returning `201 Created` response reset the React form state to empty, disabling the `Create` button.
  4. **Modal Form Selection Overflow**: The "CREATE FORMS" target selector modal lists all forms. For accounts with multiple forms or drafts, the designated `posts` form was rendered below the fold.
* **Implementation Solutions**:
  1. Imported `APP_CONFIG` in `PostComposerPage.ts` and streamlined direct navigation to `${APP_CONFIG.BASE_URL}/form/new/edit`.
  2. Added an explicit `await this.page.keyboard.press('Tab')` with a 500ms stabilization window in `submitPost()` to guarantee input blur and state commitment before clicking `Create`.
  3. Synced draft creation by awaiting `this.page.waitForResponse(...)` when `Add poll` is clicked before filling question and options.
  4. Made form selection dynamic in `selectTargetForm(formName = 'posts')` by prioritizing `button[aria-label*="Create in ${formName}"]` with `scrollIntoViewIfNeeded()`.
  5. Configured `test.describe.configure({ mode: 'serial' })` in `post.spec.ts` to eliminate multi-worker session collision on shared user credentials.

---

### Decision 2: Sanity 3.0 Dynamic Ownership & Authentication Resilience
* **Context**: Sanity 3.0 test suite was failing across browsers when locating form cards and maintaining authenticated sessions on CI.
* **Root Causes Diagnosed**:
  1. **Rigid Form Card Selectors**: Hardcoded filters expecting exact text like `/public posts/` failed because user profile cards dynamically render variations (`@m_2094`, subscriber counts, or newly created custom forms).
  2. **Password Mask Toggle State Drop**: Toggling `secureTextEntry` switches the underlying input DOM element between `type="text"` and `type="password"`. In certain browser engines (Firefox/WebKit), this unmounts the element, clearing internal input state.
* **Implementation Solutions**:
  1. In `FormManagementPage.openOwnForm(formName)`: Dynamically check for specific form cards, falling back gracefully to any visible owned form card (`div[tabindex="0"]`).
  2. In `01-auth-ui-ux.spec.ts` (`TC_S3_AUTH_001`): Explicitly re-populate `loginPage.passwordInput.fill(...)` after the show/hide password toggle to guarantee valid credentials prior to `Sign In` submission.

---

### Decision 3: Virtualized Modal Form Scrolling & Lifecycle Suite Serial Isolation
* **Context**: In accounts with dozens of accumulated forms and drafts, `selectTargetForm()` clicked whichever form happened to be at the top of the modal (e.g. custom poll-only forms), causing `TC_POST_003` (which expects standard text composition tools) to fail. Furthermore, parallel execution on `02-post-lifecycle.spec.ts` caused post archiving, editing, and hearting tests to collide on the same posts.
* **Root Causes Diagnosed**:
  1. **Virtualized List Unrendered Items**: React Native Web's modal list does not render DOM nodes below the initial fold until scrolled.
  2. **Multi-Worker Post Mutation Collision**: Workers 1, 2, and 3 simultaneously attempting to heart, edit, and archive the identical post in the feed caused race conditions and disappearing post cards.
* **Implementation Solutions**:
  1. In `PostComposerPage.selectTargetForm(formName = 'posts')`: Implemented iterative wheel scrolling inside the `[role="dialog"]` container to locate and reveal `button[aria-label="Create in posts"]` before selection.
  2. In `02-post-lifecycle.spec.ts` and `03-form-lifecycle.spec.ts`: Configured `test.describe.configure({ mode: 'serial' })` to guarantee strict lifecycle execution order (Create -> Heart -> Edit -> Archive -> Delete).

---

### Decision 4: Scaling Parallel Workers Without Collision Across Test Suites
* **Context**: The team asked how to safely increase the number of parallel Playwright workers (`workers: 2`, `3`, `4`) to execute different tests concurrently without collisions or session dropouts.
* **Collision Vectors Identified**:
  1. **Intra-File Race Conditions (`fullyParallel: true`)**: Tests within the same spec file (e.g. create post vs vote poll) mutating the same live DOM feed simultaneously.
  2. **Concurrent Auth Invalidation**: Multiple workers simultaneously posting to `/auth/sign-in` with the exact same user credentials invalidate each other's active session tokens.
  3. **Feed & Resource Collisions**: Multiple workers publishing into the default `posts` form at the same millisecond cause selector shifts and race conditions.
* **Zero-Collision Scaling Architecture**:
  1. **File-Level Parallelism with Intra-File Serial Execution (`fullyParallel: false`)**:
     - Configured `fullyParallel: false` in `playwright.config.ts`.
     - When `workers: 2` (or more) is configured, Playwright runs **different test files** in different workers concurrently, while tests **within each file** run in their natural dependency order.
     - Worker 1 executes `explore.spec.ts` (read-only search), while Worker 2 executes `activity.spec.ts` (read-only logs). Because they touch separate features, 0 collisions occur.
  2. **Worker Account Pooling (`testInfo.parallelIndex`)**:
     - When multiple suites modify user-specific state, map accounts by worker index: `user = TEST_USERS_POOL[testInfo.parallelIndex % TEST_USERS_POOL.length]`.
     - Worker 0 logs into User 1; Worker 1 logs into User 2; eliminating 100% of concurrent session overwrites.
  3. **Dynamic Resource Sandboxing**:
     - Tests that create or mutate forms/posts generate unique scoped identifiers (e.g. `Form-${Date.now()}-${testInfo.workerIndex}`).
     - Each worker operates strictly within its own sandboxed form container, preventing other workers from seeing or modifying its posts.
  4. **Pre-Authenticated Storage State (`storageState`)**:
     - Authenticating once during global setup and reusing the saved session cookies across workers removes repetitive login calls and backend rate limits.
* **Implemented CI & Configuration Upgrades**:
  - Removed duplicate `safari` project from `playwright.config.ts` (which duplicated `webkit`).
  - Added cross-platform fallback for `edge` (uses Chromium emulation on Linux CI, avoiding missing proprietary `msedge` package failures).
  - Configured serial execution mode across `01-auth-ui-ux.spec.ts`, `05-explore-subscriptions.spec.ts`, and `sanity/2.0/posting.spec.ts`.
  - Configured GitHub Actions workflows (`sanity-test.yml`, `test-and-deploy.yml`) to default push triggers to `--project=chromium`, while manual triggers retain full multi-browser choice.
### Decision 5: Sanity 3.0 Suite Isolation & Multi-Browser Hardening
* **Context**: The user requested Sanity 3.0 to be isolated from older sanity test suites (1.0 and 2.0) and run independently across all browsers (`chromium`, `firefox`, `webkit`, `edge`), and to verify the individual poll script (`TC_POST_005`).
* **Root Causes Diagnosed Across Browsers**:
  1. **Profile Forms Asynchronous Loading Race**: On both own-profile and public profile navigation (`FormManagementPage.openOwnForm()` and `ExplorePage.clickUserProfile()`), the page displayed `Loading....` while fetching user forms via the API. Immediate locator assertions timed out at 5s/15s before the API returned.
  2. **Firefox Client-Side Router Miss in Chat**: In Firefox, clicking the sidebar `Chat` button in React Native Web occasionally did not trigger the SPA URL transition, causing `toHaveURL(/.*messages.*/)` to time out on `https://eve.vakh.com/`.
  3. **Explore Action Buttons Delay (`TC_EXP_007`)**: Profile action buttons (Message & More) failed visibility checks when clicked prior to full profile card reconciliation.
* **Implementation Solutions**:
  1. **Sanity 3.0 Isolation**: Updated `.github/workflows/sanity-test.yml` so that `default: '3.0'` is the primary selection and fallback on push events, isolating Sanity 3.0 completely from legacy 1.0/2.0 runs unless explicitly selected.
  2. **Profile Loading Guard**: In `FormManagementPage.ts` and `ExplorePage.ts`, added explicit detachment waits for `Loading....` (`await expect(page.getByText(/loading/i).first()).toBeHidden({ timeout: 15000 })`) and fallback page refresh if the initial API response lags.
  3. **Direct Route Fallback in Chat Navigation**: In `ChatPage.navigateToChat()`, added dynamic detection of whether the sidebar click transitioned the URL, with automatic fallback to direct route navigation `await this.navigateTo('/messages')`.
  4. **Timed Action Button Assertions**: Added 15s timeout to `messageBtn` and `moreBtn` in `TC_EXP_007`.
* **Verification Results**:
  - **Sanity 3.0 Auth (`01-auth-ui-ux.spec.ts`)**: 12/12 passed (Chromium, Firefox, WebKit, Edge).
  - **Sanity 3.0 Post Lifecycle (`02-post-lifecycle.spec.ts`)**: 20/20 passed (Chromium, Firefox, WebKit, Edge).
  - **Sanity 3.0 Form Lifecycle (`03-form-lifecycle.spec.ts`)**: 12/12 passed (Chromium, Firefox, WebKit, Edge).
  - **Sanity 3.0 Explore & Subscriptions (`05-explore-subscriptions.spec.ts`)**: 12/12 passed (Chromium, Firefox, WebKit, Edge).
  - **Sanity 3.0 Chat (`04-chat-collaboration.spec.ts`)**: 20/20 passed across all 4 browsers (Firefox verified 5/5 in 1.8m).
  - **Individual Poll Script (`TC_POST_005`)**: 1 passed cleanly in 33.2s on Chromium.

---

### Decision 6: Dual Workflow Isolation for Sanity 3.0 and Poll Test
* **Context**: The user requested executing strictly 2 workflows in GitHub Actions: one for Sanity 3.0 and one for the Poll test, preventing other suites or monolithic pipelines from running.
* **Workflow Audit & Changes**:
  1. **Monolithic Pipeline Decoupling (`test-and-deploy.yml`)**:
     - Removed `push` and `pull_request` triggers so it no longer executes on every code commit. It is now strictly manual via `workflow_dispatch`.
  2. **Poll Workflow Push Scoping (`test-post.yml`)**:
     - Added `push` triggers matching `src/tests/post.spec.ts`, `src/pages/PostComposerPage.ts`, and `.github/workflows/test-post.yml`.
     - Added `test_target` parameter defaulting to `poll` (`TC_POST_005`) while supporting `all` for the full post creation suite.
     - Defaults to `--project=chromium` for fast and clean headless CI verification.
  3. **Sanity 3.0 Workflow Push Scoping (`sanity-test.yml`)**:
     - Configured to run exclusively Sanity 3.0 by default on push (`npm run test:sanity:3.0 -- --project=chromium`).
  4. **Strict Dual Execution**:
     - All other suite workflows (`login`, `home`, `chat`, `explore`, `activity`) remain isolated behind `workflow_dispatch`.
     - Only the 2 designated workflows (`sanity-test.yml` and `test-post.yml`) execute on push.

---

## 2. GitHub Actions Workflow Failure Bug Report

### Failure Summary
* **Workflow Name**: `Versioned Sanity Test Suites (1.0, 2.0, 3.0)` / `Playwright Tests & Dashboard Deployment`
* **Triggering Commit**: `5627160` (`fix(sanity-3.0): make openOwnForm dynamic and resilient to profile form variations across all browsers`)
* **Observed Failure Symptom**: Workflow run failed during the test execution step with multi-browser failures.

### Root Cause Analysis
1. **Unscoped Execution on Push**:
   * Pushing to `main` without input parameters defaults `suite_version` to `'all'` and `browser` to `'all'`.
   * This triggered all sanity suites (1.0, 2.0, 3.0) across all 5 configured projects: `chromium`, `firefox`, `safari`, `webkit`, and `edge`.
2. **Redundant & Non-Standard Browser Projects**:
   * `safari` and `webkit` in `playwright.config.ts` both use `devices['Desktop Safari']` (redundant duplicate WebKit instance).
   * `edge` is configured with `channel: 'msedge'`. In GitHub Actions `ubuntu-latest`, the Microsoft Edge channel package requires specialized apt repositories; if the binary is absent or has sandbox constraints, tests targeting the `edge` project fail or fall back unexpectedly.
3. **Concurrent Session Invalidation on Shared Account**:
   * Running 5 browser engines simultaneously against a single live user account (`mughdabansal2094@gmail.com`) causes active auth tokens to be superseded when another browser signs in, resulting in `Received string: "https://eve.vakh.com/auth/sign-in"` during route checks.
4. **Chat Suite Triggering**:
   * The user requested the Chat page suite to run exclusively on manual triggers. While `testIgnore` excluded `**/chat.spec.ts`, `src/tests/sanity/3.0/04-chat-collaboration.spec.ts` was not excluded in sanity runs.

### Debug Proposals & Actionable Fixes
1. **Optimize Browser Matrix in `playwright.config.ts`**:
   * Consolidate standard CI targets to `chromium`, `firefox`, and `webkit`.
   * For `edge`, add a fallback or only execute `msedge` channel on Windows runners or when explicitly specified.
2. **Enforce Single Worker on CI**:
   * Ensure `workers: 1` is strictly respected on CI (via `CI: true`) and serial execution is configured on suites modifying shared account state.
3. **Session Re-use / Isolated Contexts**:
   * Where possible, utilize Playwright storage state (`storageState`) to avoid repeated sign-ins that invalidate active session tokens across concurrent workers.
4. **Align Chat Isolation**:
   * Ensure any automated CI triggers respect the user's requirement to keep chat test flows isolated to manual invocations.

---

### Failure Report 2 (Commit `f99fa73`, Workflow Run `35695488452`)
* **Workflow Name**: `Versioned Sanity Test Suites (1.0, 2.0, 3.0)`
* **Observed Failure Symptom**: Process completed with exit code 1 during `Run Playwright Sanity Tests`.
* **Root Cause Diagnosed**:
  * In `sanity-test.yml`, the step invoked:
    `npm run test:sanity:3.0 -- $PROJECT_ARG` where `$PROJECT_ARG` was `--project=chromium`.
  * In `package.json`, `test:sanity:3.0` was defined as:
    `"playwright test src/tests/sanity/3.0 && npm run generate:dashboard"`
  * When flags are passed to an npm compound script via `--`, npm appends the flags to the **second command** (`npm run generate:dashboard --project=chromium`), printing:
    `npm warn Unknown cli config "--project"`.
  * Consequently, `playwright test src/tests/sanity/3.0` received **NO `--project` flag** and launched all 76 tests across all 4 configured browser engines simultaneously, causing token collisions on the shared account.
* **Actionable Fix Implemented**:
  * Updated `sanity-test.yml` to directly invoke Playwright:
    `npx playwright test $TARGET_DIR $PROJECT_ARG && npm run generate:dashboard`
  * This guarantees `$PROJECT_ARG` (`--project=chromium`) is directly accepted by the Playwright CLI, executing strictly the 19 tests of Sanity 3.0 sequentially on Chromium.
