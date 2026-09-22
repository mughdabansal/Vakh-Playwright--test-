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
