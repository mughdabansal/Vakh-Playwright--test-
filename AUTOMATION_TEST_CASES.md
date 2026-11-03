# Vakh Playwright Automation - Detailed Test Case Specifications

**Document Version:** 1.0.0  
**Target Application:** Eve Vakh (`https://eve.vakh.com`) / `vakhsapp`  
**Scope:** Automation test cases derived from the recent commit history covering Authentication/Session Continuity, Route & Query Gating, Feed Stability, Access Panels, Form Validation, UI/Accessibility, and MCP Tooling.  
**Execution Status:** Ready for scripting (awaiting authorization to implement `.spec.ts`).

---

## 📊 Test Case Automation Matrix

| ID | Test Case Title | Scenario / Module | Priority | Automation Target / Method |
| :--- | :--- | :--- | :---: | :--- |
| **AUTH-01** | Public page remains mounted while session recheck is loading | Scenario A: Auth Continuity | Critical | Playwright Route Delay + DOM Mount Assertion |
| **AUTH-02** | Cross-tab sign-in updates current app state without losing page context | Scenario A: Auth Continuity | Critical | Multi-Page / Shared BrowserContext Event Sync |
| **AUTH-03** | Failed session recheck retains last settled signed-out state | Scenario A: Auth Continuity | Critical | Route Interception (HTTP 500/Aborted) + State Assert |
| **AUTH-04** | Already authenticated session bypasses loading gate | Scenario A: Auth Continuity | High | Pre-authenticated `storageState` + Timing Check |
| **AUTH-05** | Stale OAuth resume URL / returnTo preserves valid route destination | Scenario A: Auth Continuity | Critical | URL Navigation with Redirect Parameters |
| **AUTH-06** | Mute-status queries remain disabled until auth is resolved | Scenario B: Query Gating | Critical | Network Traffic Interceptor (`page.on('request')`) |
| **AUTH-07** | Short-ID and UUID routes are gated correctly across auth states | Scenario B: Route Gating | Critical | Cross-State Route Parameter & Header Inspection |
| **FEED-02** | Stable feed query fields do not trigger re-render loops | Scenario C: Feed Stability | High | DOM Mutation Observer + React Render Counter |
| **FEED-03** | Popular updates are treated as "Update feed" instead of "new posts" | Scenario C: Feed Stability | High | API Mocking (Re-ordered Feed Payload) + Banner Assert |
| **ACCESS-02**| Access panel regression: denied discovery clears restricted header | Scenario D: Restricted UX | Critical | Dynamic Mock 200 -> 404 Refetch + Header Clearance |
| **FORMS-01** | Invalid layout settings are blocked before save with inline errors | Scenario F: Form Layout | High | Form Settings Dialog UI + Network Call Prevention |
| **FORMS-02** | Calendar fields are validated before saving invalid ranges | Scenario F: Form Validation | High | Calendar Component Negative Input + Save Assertion |
| **FORMS-03** | Stale search field actions and recovery flows are handled properly | Scenario F: Form Recovery | Medium | Stale Input Recovery + "Clear" Button Interaction |
| **UI-01**    | Landing page hero and wordmark display correctly across modes | Scenario E: Front-Door UX | High | Responsive Multi-Viewport & Dark/Light Mode Visuals |
| **UI-02**    | Jade banner on landing and about pages meets WCAG AA contrast | Scenario E: Accessibility | Critical | Automated Color Luminance / Contrast Calculation |
| **UI-03**    | Use-case pages lead with correct content ordering | Scenario E: Front-Door UX | High | DOM Vertical Coordinate Traversal (`boundingBox().y`) |
| **UI-04-A**  | Share card OG metadata tags contain cache-busting tokens | Scenario E: Metadata | Medium | HTML Document `<head>` Meta Tag Scraper |
| **MCP-01**   | `get_me` returns canonical account identity and app links | Scenario G: MCP Context | High | JSON-RPC MCP Tool Request & Response Schema Check |
| **MCP-02**   | `list_subscriptions` handles pagination, filters, and identity | Scenario G: MCP Context | High | Filtered JSON-RPC Calls with Cursor Validation |
| **MCP-03**   | URL and numeric ID resolution respects environment boundaries | Scenario G: MCP Security | Critical | Cross-Domain / Malicious URL Injection Rejection |
| **MCP-04**   | Embedded IDs stay UUID-only and reject non-UUID formats | Scenario G: MCP Security | High | Schema Validation on Numeric / Malformed Identifiers |

---

## 🔐 Scenario A & B: Authentication & Query Gating

### Test Case: AUTH-01
- **Title:** Public page remains mounted while session recheck is loading
- **Priority:** Critical
- **Automation Method:** Playwright Network Route Delay (`page.route`) + Element Visibility Assertion
- **Preconditions:**
  - Unauthenticated browser context (no cookies, no `storageState`).
  - Target URL: Public form page (`/form/kwij`) or Landing page (`/`).
- **Test Steps:**
  1. Intercept outbound session verification requests:
     ```typescript
     await page.route('**/api/auth/session*', async route => {
       // Simulate slow 3000ms network delay
       await new Promise(resolve => setTimeout(resolve, 3000));
       await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ user: null }) });
     });
     ```
  2. Navigate to `https://eve.vakh.com/form/kwij`.
  3. During the 3000ms delay window, immediately inspect the DOM at 500ms, 1500ms, and 2500ms.
  4. Verify that the public form container (`div[data-testid="form-header"]` or `text="posts @m_2094"`) remains mounted and visible.
  5. Verify that no redirect to `/login` or `/` occurs (`page.url()` remains `https://eve.vakh.com/form/kwij`).
  6. Verify that no erroneous signed-in controls (e.g. user profile avatar button, notifications bell) are shown.
  7. Allow the route to settle and verify that the page transitions smoothly to the settled signed-out view with sign-in prompt visible.
- **Pass Criteria:** Public page never unmounts, no flash of redirect occurs, and unauthenticated controls render cleanly.

---

### Test Case: AUTH-02
- **Title:** Cross-tab sign-in updates current app state without losing page context
- **Priority:** Critical
- **Automation Method:** Multi-Page Playwright Browser Context with Cross-Tab Storage Event Synchronization
- **Preconditions:**
  - One `BrowserContext` instance with 2 active pages (`tabA` and `tabB`).
  - Valid user credentials (`mughdabansal2094@gmail.com`).
- **Test Steps:**
  1. On `tabA`, navigate to public page `https://eve.vakh.com/form/kwij` in unauthenticated state.
  2. Verify that `tabA` shows the unauthenticated action button (e.g. "Sign in to post" or "Join").
  3. On `tabB`, navigate to `https://eve.vakh.com/login` and perform login using valid credentials.
  4. Wait for `tabB` to reach authenticated home feed (`https://eve.vakh.com/home` or URL without `/login`).
  5. Switch focus back to `tabA` (triggering window `focus` and `storage` sync events).
  6. Assert that `tabA` detects the updated session state within 2000ms without a hard page reload (`window.location.href` is preserved at `/form/kwij`).
  7. Assert that `tabA` updates its action controls (e.g. "+" / "New Post" button becomes available).
  8. Assert that `tabA` does not crash into a blank screen (`#root` or React Native Web `div[data-testid="app-root"]` remains populated).
- **Pass Criteria:** Session updates cross-tab while maintaining exact URL and scroll context on `tabA`.

---

### Test Case: AUTH-03
- **Title:** Failed session recheck retains last settled signed-out answer
- **Priority:** Critical
- **Automation Method:** Fault Injection via Route Interception (`route.abort()` / HTTP 500)
- **Preconditions:**
  - Clean unauthenticated context.
- **Test Steps:**
  1. Intercept session endpoint `**/api/auth/session*` and force failure:
     ```typescript
     await page.route('**/api/auth/session*', route => route.fulfill({
       status: 500,
       contentType: 'application/json',
       body: JSON.stringify({ error: 'InternalServerError', message: 'Auth service down' })
     }));
     ```
  2. Navigate to public page `https://eve.vakh.com/basics` or `/form/kwij`.
  3. Monitor navigation events to ensure the browser does not enter an infinite reload loop (`expect(navigationCount).toBe(1)`).
  4. Verify that public page content remains rendered and accessible.
  5. Check console errors: verify that error is handled gracefully without unhandled promise rejection crashing the React tree.
- **Pass Criteria:** The app defaults safely to signed-out state without loops, error dialogs blocking the page, or unmounting.

---

### Test Case: AUTH-04
- **Title:** User already signed in should not hit loading gate for authenticated content
- **Priority:** High
- **Automation Method:** Authenticated `storageState` Navigation with Frame Performance Timing
- **Preconditions:**
  - Browser context initialized with valid authenticated session (`storageState.json`).
- **Test Steps:**
  1. Navigate directly to protected route: `https://eve.vakh.com/home`.
  2. Measure elapsed time between `domcontentloaded` and first meaningful paint of feed items.
  3. Assert that no blocking modal loading spinner (`[aria-label="Loading..."]` or full-screen loading curtain) persists for > 500ms.
  4. Assert that no intermediate navigation redirects to `/login` or public front-door.
  5. Assert that feed cards and user navigation bar are immediately interactive.
- **Pass Criteria:** First interactive render completes < 500ms with zero unauthorized redirect hops.

---

### Test Case: AUTH-05
- **Title:** Stale OAuth resume URL or returnTo value preserves valid destination
- **Priority:** Critical
- **Automation Method:** Parameterized Navigation with URL Encoding Validation
- **Preconditions:**
  - Signed-out state.
- **Test Steps:**
  1. **Sub-test A (Valid Internal Route):** Navigate to `https://eve.vakh.com/login?returnTo=%2Fform%2Fkwij`.
     - Complete login with credentials.
     - Verify final destination is `https://eve.vakh.com/form/kwij`.
  2. **Sub-test B (External/Untrusted URL Injection):** Navigate to `https://eve.vakh.com/login?returnTo=https%3A%2F%2Fmalicious-site.com`.
     - Complete login with credentials.
     - Verify application sanitizes `returnTo` and defaults safely to `https://eve.vakh.com/home` (preventing open-redirect vulnerability).
  3. **Sub-test C (Stale / Expired OAuth Parameters):** Navigate to `https://eve.vakh.com/login?state=stale_state_123&code=expired_code&returnTo=%2Fform%2Fkwij`.
     - Verify login form loads cleanly without displaying cryptic OAuth error modals.
- **Pass Criteria:** Valid internal destinations are preserved; external and malformed redirect attempts are safely sanitized.

---

### Test Case: AUTH-06
- **Title:** Mute-status queries remain disabled until auth is resolved
- **Priority:** Critical
- **Automation Method:** Outbound Network Request Filtering (`page.on('request')`)
- **Preconditions:**
  - Signed-out browser session.
  - Route: Public post page `https://eve.vakh.com/form/kwij`.
- **Test Steps:**
  1. Set up network monitor:
     ```typescript
     const muteRequests: string[] = [];
     page.on('request', req => {
       const url = req.url().toLowerCase();
       if (url.includes('mute') || (req.postData() && req.postData()!.includes('muteStatus'))) {
         muteRequests.push(url);
       }
     });
     ```
  2. Load public post/form route while unauthenticated.
  3. Wait for all network activity to idle (`networkidle`).
  4. Assert `muteRequests.length === 0`.
  5. Trigger sign-in on the page.
  6. Assert that once auth resolves, viewer-specific queries (including mute check for author) fire with valid bearer tokens.
- **Pass Criteria:** Zero mute-status requests fire while unauthenticated; requests fire only upon verified session resolution.

---

### Test Case: AUTH-07
- **Title:** Short-ID and UUID routes are gated correctly across auth states
- **Priority:** Critical
- **Automation Method:** Parameterized Test Matrix across Route Formats and Auth Contexts
- **Preconditions:**
  - Both Short-ID (`/form/kwij`) and UUID (`/form/3fa85f64-5717-4562-b3fc-2c963f66afa6`) aliases exist.
- **Test Matrix & Steps:**
  1. **Signed-Out + Short-ID:** Request `/form/kwij`. Assert HTTP request headers lack `Authorization`. Page renders public preview.
  2. **Signed-Out + Canonical UUID:** Request `/form/<uuid>`. Assert request headers lack `Authorization`. Page renders public preview.
  3. **Signed-In + Short-ID:** Request `/form/kwij`. Assert request includes valid bearer/cookie. Route resolves and canonicalizes.
  4. **Signed-In + Canonical UUID:** Request `/form/<uuid>`. Assert request includes valid bearer/cookie. Direct access granted without secondary redirection loop.
- **Pass Criteria:** Gating logic strictly respects auth headers without sending premature tokens on signed-out routes.

---

## 📱 Scenario C & D: Feed Stability & Restricted Access UX

### Test Case: FEED-02
- **Title:** Stable feed query fields do not trigger re-render loops
- **Priority:** High
- **Automation Method:** In-Browser React Render Monitoring & DOM Mutation Observation
- **Preconditions:**
  - Authenticated user on Home feed (`/home`).
- **Test Steps:**
  1. Navigate to `/home` and wait for feed to settle.
  2. Inject a MutationObserver on the feed post list container (`div[data-testid="feed-container"]` or primary feed list):
     ```typescript
     await page.evaluate(() => {
       (window as any).__feedMutations = 0;
       const target = document.querySelector('div[role="feed"]') || document.body;
       const observer = new MutationObserver(mutations => {
         (window as any).__feedMutations += mutations.length;
       });
       observer.observe(target, { childList: true, subtree: true, attributes: true });
     });
     ```
  3. Wait 10 seconds while background polling / fetch-status ticks occur.
  4. Retrieve mutation count: `const mutations = await page.evaluate(() => (window as any).__feedMutations)`.
  5. Assert that mutation count remains below idle threshold (< 5 mutations when no new posts arrive).
  6. Verify feed cards do not flicker, re-mount, or lose scroll position.
- **Pass Criteria:** Background polling ticks do not trigger cascading DOM re-renders or layout recalculations.

---

### Test Case: FEED-03
- **Title:** Popular updates are treated as "Update feed" rather than "new posts"
- **Priority:** High
- **Automation Method:** Intercepted API Feed Payload Re-ordering
- **Preconditions:**
  - Authenticated session on Home feed.
- **Test Steps:**
  1. Switch feed tab to "Popular".
  2. Capture existing feed items: `[Post A, Post B, Post C]`.
  3. Intercept subsequent feed refresh query and return the same post IDs with updated ranking scores: `[Post C, Post A, Post B]` (no new post IDs added).
  4. Wait for client-side query resolution.
  5. Inspect the top notification banner:
     - Assert that banner text matches `"Update feed"` or `"Updated rankings"`.
     - Assert that banner text does NOT say `"New posts available"`.
  6. Click "Update feed" and verify posts re-order smoothly without duplicate card keys.
- **Pass Criteria:** Ranking changes trigger "Update feed" UI; only genuinely new post IDs trigger "New posts" indicator.

---

### Test Case: ACCESS-02
- **Title:** Access panel regression: denied discovery clears restricted header identity
- **Priority:** Critical
- **Automation Method:** Dynamic Route Mocking (200 OK -> 404 Not Found Refetch)
- **Preconditions:**
  - User navigating to a protected form/post route.
- **Test Steps:**
  1. Intercept resource discovery endpoint `**/api/forms/restricted-id`:
     - Initial call: Fulfill with HTTP 200 `{ id: "restricted-id", title: "Secret Internal Form", restricted: true }`.
  2. Navigate to `/form/restricted-id`.
  3. Assert restricted header displays `"Secret Internal Form"` with lock icon.
  4. Update route interceptor to simulate access revocation:
     - Next call: Fulfill with HTTP 404 `{ error: "NotFound", message: "Form does not exist or access revoked" }`.
  5. Trigger feed/page refresh.
  6. Assert restricted header identity is completely cleared from DOM.
  7. Assert that no stale cached title (`"Secret Internal Form"`) lingers in the DOM or document title.
  8. Assert access panel displays `"Not Found"` or `"Access Denied"` banner.
- **Pass Criteria:** 404 discovery response immediately flushes prior header identity from client cache and UI.

---

## 📝 Scenario F: Form Configuration & Validation

### Test Case: FORMS-01
- **Title:** Invalid layout settings are blocked before save with inline errors
- **Priority:** High
- **Automation Method:** Form Settings UI Interaction + Network Interception (`expect(request).not.toBeCalled()`)
- **Preconditions:**
  - Authenticated user owning an active form (`posts @m_2094`).
- **Test Steps:**
  1. Navigate to `/form/kwij` and click form settings / "Edit form".
  2. Open "Layout Settings" section.
  3. Set invalid configuration: e.g. select 0 columns, conflicting gutter widths, or invalid grouping hierarchy.
  4. Intercept `PUT **/api/forms/*` or `PATCH **/api/forms/*`.
  5. Click "Save" or "Done" button.
  6. Assert save HTTP request is NOT sent.
  7. Assert modal does not close.
  8. Assert inline validation error message is rendered directly adjacent to the invalid layout field.
- **Pass Criteria:** Client-side layout validation strictly blocks persistence and highlights errors inline.

---

### Test Case: FORMS-02
- **Title:** Calendar fields are validated before saving invalid ranges
- **Priority:** High
- **Automation Method:** Negative Input Testing in Form Designer
- **Preconditions:**
  - Form editor opened on custom field configuration.
- **Test Steps:**
  1. In form designer, add a "Calendar / Date Range" field.
  2. Enter invalid configuration:
     - Set "Default Start Date" = `2026-12-31`.
     - Set "Default End Date" = `2026-01-01` (End date preceding start date).
  3. Enter an invalid recurrence rule or negative duration interval.
  4. Click "Save Field" / "Apply".
  5. Assert save action is rejected.
  6. Assert error message: `"End date must be on or after start date"` is visible.
  7. Correct date values to valid sequence (`Start: 2026-01-01`, `End: 2026-12-31`).
  8. Assert inline error clears dynamically and save button becomes enabled.
- **Pass Criteria:** Invalid date sequences cannot be persisted; correction dynamically restores valid state.

---

### Test Case: FORMS-03
- **Title:** Stale search field actions and recovery flows are handled properly
- **Priority:** Medium
- **Automation Method:** Form Search Field Input, Invalidation, and Reset Interaction
- **Preconditions:**
  - Form configuration screen with searchable field picker.
- **Test Steps:**
  1. Focus search field and enter invalid search pattern (e.g. non-existent field name or invalid characters `%%%$$$`).
  2. Verify empty results indicator appears.
  3. Verify "Clear" ('✕') button appears inside the search input box.
  4. Click "Clear" button.
  5. Assert input value is immediately emptied (`expect(input).toHaveValue('')`).
  6. Assert full default list of selectable fields is restored without page reload.
  7. Enter valid query and select field; verify selection completes successfully.
- **Pass Criteria:** "Clear" action reliably recovers from stale/invalid search input without blocking form interactions.

---

## 🎨 Scenario E: Front-Door UX, Branding & Accessibility

### Test Case: UI-01
- **Title:** Landing page hero and wordmark display correctly across viewports and modes
- **Priority:** High
- **Automation Method:** Multi-Viewport & Color-Scheme Parametric Automation
- **Viewports:**
  - Desktop: `1280 x 800`
  - Mobile: `375 x 667` (iPhone SE emulation)
- **Color Schemes:** `'light'` and `'dark'`
- **Test Steps:**
  1. For each viewport and color scheme combination:
     - Navigate to `https://eve.vakh.com/`.
     - Verify wordmark logo (`svg` or `img[alt="Vakh"]`) is visible and has width > 0, height > 0.
     - Verify hero headline text is visible and not clipped by overflow.
     - Verify CTA buttons ("Get Started", "Sign In", "Download") are clickable and have non-zero bounding boxes.
     - Verify store badges (App Store / Google Play badges) render with valid `src` and maintain aspect ratios.
     - Check for horizontal scrollbar overflow:
       ```typescript
       const hasHorizontalScroll = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
       expect(hasHorizontalScroll).toBe(false);
       ```
- **Pass Criteria:** Zero layout shifts, no horizontal overflow, correct wordmark visibility in light and dark modes.

---

### Test Case: UI-02
- **Title:** Jade banner on landing and about pages meets WCAG 2.1 AA contrast requirements
- **Priority:** Critical
- **Automation Method:** Programmatic Relative Luminance & Contrast Ratio Calculation via DOM Evaluation
- **Target Pages:** `/` (Landing), `/about`, `/basics`
- **Test Steps:**
  1. Navigate to target page.
  2. Locate jade banner / green glass panel container (`div[style*="background"]` or jade element).
  3. Extract computed background color and foreground text colors for headline, body, and action links:
     ```typescript
     const contrastReport = await page.evaluate(() => {
       function getLuminance(r: number, g: number, b: number) {
         const a = [r, g, b].map(v => {
           v /= 255;
           return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
         });
         return a[0] * 0.2126 + a[1] * 0.7152 + a[2] * 0.0722;
       }
       function getContrast(rgb1: number[], rgb2: number[]) {
         const l1 = getLuminance(rgb1[0], rgb1[1], rgb1[2]) + 0.05;
         const l2 = getLuminance(rgb2[0], rgb2[1], rgb2[2]) + 0.05;
         return l1 > l2 ? l1 / l2 : l2 / l1;
       }
       // Extract computed colors from jade banner text elements
       // Returns calculated ratio
     });
     ```
  4. Assert body text contrast ratio >= 4.5:1.
  5. Assert large headline text contrast ratio >= 3.0:1.
  6. Assert action links on jade panel maintain >= 4.5:1 contrast against the background.
- **Pass Criteria:** All text on jade/green-glass containers satisfies WCAG 2.1 AA contrast compliance.

---

### Test Case: UI-03
- **Title:** Use-case pages lead with correct content ordering
- **Priority:** High
- **Automation Method:** DOM Vertical Coordinate (`boundingBox().y`) Traversal
- **Target Pages:** `/basics`, `/about`
- **Test Steps:**
  1. Navigate to `https://eve.vakh.com/basics`.
  2. Locate key milestone section containers:
     - `sectionLede`: Value headline & introductory paragraph.
     - `sectionCTA`: Primary call-to-action button ("Try Vakh", "Explore").
     - `sectionDemo`: Interactive preview / demo container.
     - `sectionFeatures`: Detailed supporting feature cards.
  3. Measure vertical coordinates:
     ```typescript
     const yLede = (await sectionLede.boundingBox())!.y;
     const yCTA = (await sectionCTA.boundingBox())!.y;
     const yDemo = (await sectionDemo.boundingBox())!.y;
     const yFeatures = (await sectionFeatures.boundingBox())!.y;
     ```
  4. Assert `yLede <= yCTA`.
  5. Assert `yCTA <= yDemo`.
  6. Assert `yDemo <= yFeatures`.
- **Pass Criteria:** Page narrative strictly maintains: Value Lede → Call-to-Action → Demo → Feature Sections.

---

### Test Case: UI-04-A
- **Title:** Share card OG metadata tags contain cache-busting tokens
- **Priority:** Medium
- **Automation Method:** HTML `<head>` Meta Tag Scraper
- **Test Steps:**
  1. Fetch raw HTML of landing page: `await page.goto('https://eve.vakh.com/', { waitUntil: 'domcontentloaded' })`.
  2. Inspect Open Graph and Twitter image meta tags:
     ```typescript
     const ogImage = await page.locator('meta[property="og:image"]').getAttribute('content');
     const twitterImage = await page.locator('meta[name="twitter:image"]').getAttribute('content');
     ```
  3. Assert `ogImage` is not null and begins with `https://`.
  4. Assert `ogImage` contains a version flag or cache-busting hash parameter (e.g. `?v=` or hash segment).
  5. Assert `twitterImage` matches `ogImage` URL.
- **Pass Criteria:** Social card image URLs include cache-busting parameters preventing stale CDN retention.

---

## 🤖 Scenario G: MCP (Model Context Protocol) Account & Feed Filters

### Test Case: MCP-01
- **Title:** `get_me` returns canonical account identity and app links
- **Priority:** High
- **Automation Method:** JSON-RPC MCP Tool Request & Response Validation
- **Protocol:** Model Context Protocol (MCP) JSON-RPC standard
- **Test Steps:**
  1. Dispatch JSON-RPC request to MCP server:
     ```json
     {
       "jsonrpc": "2.0",
       "id": 1,
       "method": "tools/call",
       "params": {
         "name": "get_me",
         "arguments": {}
       }
     }
     ```
  2. Assert response status is 200 / success without error.
  3. Validate response JSON schema:
     - `user.id`: valid UUID string.
     - `user.handle`: matches authenticated user (`@m_2094`).
     - `app_links.home`: `https://eve.vakh.com/home` (canonical structure).
     - `app_links.profile`: `https://eve.vakh.com/user/@m_2094`.
  4. Assert no sensitive tokens (session secrets, private keys) are exposed in response.
- **Pass Criteria:** Canonical user identity and standard app links are cleanly returned.

---

### Test Case: MCP-02
- **Title:** `list_subscriptions` handles pagination, filters, and token-derived identity
- **Priority:** High
- **Automation Method:** Filtered JSON-RPC Calls with Cursor Pagination
- **Test Steps:**
  1. Dispatch `list_subscriptions` with `limit: 5`:
     ```json
     {
       "method": "tools/call",
       "params": {
         "name": "list_subscriptions",
         "arguments": { "limit": 5, "filter": "subscription-group" }
       }
     }
     ```
  2. Assert response returns array of subscriptions with `has_more: true` and `next_cursor` string.
  3. Dispatch second request passing `cursor: next_cursor`.
  4. Assert subscriptions in page 2 are mutually exclusive from page 1 (no duplicate items).
  5. Test filters: dispatch with `filter: "mention"`, `filter: "quote"`.
  6. Assert results strictly match filter criteria.
- **Pass Criteria:** Pagination and filters operate deterministically based on authenticated token identity.

---

### Test Case: MCP-03
- **Title:** URL or numeric ID resolution respects environment boundaries and permission gates
- **Priority:** Critical
- **Automation Method:** Negative Security & Boundary Resolution Testing
- **Test Steps:**
  1. **Valid URL Resolution:** Send tool call with valid app URL: `https://eve.vakh.com/form/kwij`. Assert successful resolution to form entity.
  2. **Cross-Environment Rejection:** Send tool call with foreign/untrusted domains:
     - `https://evil-phishing-vakh.com/form/kwij`
     - `https://localhost:8080/admin`
     - `https://staging-internal.vakh.internal/db`
  3. Assert tool returns explicit validation error: `"Domain not permitted. Only canonical Eve Vakh domains are authorized."`.
  4. **Permission Gate:** Send valid URL of private/restricted resource owned by another user without permissions.
  5. Assert tool enforces access denial (HTTP 403 / `"PermissionDenied"`).
- **Pass Criteria:** Foreign/cross-environment domains are rejected; access permissions are strictly enforced.

---

### Test Case: MCP-04
- **Title:** Embedded IDs stay UUID-only and reject unexpected URL formats
- **Priority:** High
- **Automation Method:** ID Format Fuzzing & Schema Type Checking
- **Test Steps:**
  1. Dispatch tool call requiring UUID with valid format: `"e4ccd83c-4498-430a-bbe4-ffb83d28b872"`. Assert acceptance.
  2. Dispatch with integer ID: `"12345"`.
  3. Dispatch with SQL injection string: `"' OR '1'='1"`.
  4. Dispatch with raw URL: `"https://eve.vakh.com/post/12345"`.
  5. Assert all non-UUID payloads produce JSON-RPC validation error: `"Invalid argument: Expected UUID string"`.
- **Pass Criteria:** Schema strictly enforces UUID compliance for all embedded ID parameters.

