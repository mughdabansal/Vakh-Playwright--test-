# Vakh QA - Non-Automatable & Manual Test Cases Specification

**Document Version:** 1.0.0  
**Target Application:** Eve Vakh (`https://eve.vakh.com`) / `vakhsapp`  
**Scope:** Test scenarios from the recent commit history that **cannot** be reliably or practically verified via external black-box Playwright automation, requiring internal unit/mock harnesses in `vakhsapp` or manual exploratory QA.  
**Execution Status:** Manual / White-Box testing guide (do not automate in Playwright E2E).

---

## 📋 Summary of Non-Automatable Test Scenarios

| ID | Test Scenario | Primary Category | Why Automation Fails / Is Infeasible | Recommended Verification Strategy |
| :--- | :--- | :--- | :--- | :--- |
| **ACCESS-01** | 404 denial does not leak stale success state through `related()` results | Internal Mock Leakage | `related()` is an internal unit test mock/resolver in `vakhsapp` source; invisible to external E2E browser runner. | Unit / Integration Test in `vakhsapp` repo using Jest/Vitest. |
| **FEED-01** | Group read acknowledgements event-driven synchronization & arrival races | Race Condition / WebSockets | Micro-tick concurrency race between WebSocket feed arrival and read acknowledgement cannot be reliably scheduled over public cloud latency without flaky false-positives. | Internal EventEmitter / WebSocket mock harness + Manual exploratory testing. |
| **FEED-04** | Fallback polling in disconnected mode does not race with group read sync | Network Fault Injection | Requires half-open network state (WebSocket severed while HTTP fallback poll remains reachable). Playwright `setOffline` drops both. | Network proxy simulation (Charles / Proxyman / Toxiproxy) + Manual QA. |
| **UI-04-B** | Social share card CDN cache invalidation across external platforms | Third-Party Crawlers | External crawler CDNs (Twitter, Facebook, LinkedIn, WhatsApp) have closed proprietary caches outside the test harness. | Manual QA inspection via official developer debuggers. |
| **UX-RESTRICT** | Mobile restriction banner chrome overlap & virtual keyboard interaction | Mobile Ergonomics | Physical hardware constraints (iOS Home Bar, Dynamic Island, soft keyboard viewport resizing) require real device feel. | Physical device lab testing (iOS / Android). |

---

## 🔍 Detailed Test Cases & Manual Verification Procedures

---

### Test Case: ACCESS-01
- **Title:** 404 denial does not leak stale success state through `related()` results
- **Priority:** Critical
- **Category:** Internal Unit Mock Isolation & Cache Invalidation

#### Technical Justification (Why this cannot be automated in Playwright):
In the `vakhsapp` core repository, `related()` is an internal data-fetching helper/mock resolver (e.g. inside React Query cache, GraphQL fragment resolver, or Prisma ORM integration). This regression test checks that when a mocked resource transitions from allowed (200 OK) to denied (404 Not Found), the internal memory cache of `related()` does not preserve the previous identity and leak it into subsequent function calls.
Because Playwright is an external, black-box browser automation tool communicating over HTTP, it has no access to internal JavaScript heap objects, private closure variables, or test mock registries (`jest.mock` / `vi.mock`). Testing this in Playwright would only test what the final HTTP response returns, missing the exact internal regression.

#### Required White-Box / Unit Test Specification (to run in `vakhsapp` repository):
- **Framework:** Jest / Vitest
- **Test File Location:** `vakhsapp/src/data/__tests__/accessGating.test.ts`
- **Unit Test Implementation Blueprint:**
  ```typescript
  describe('Access Gating & related() Resolver Cache Isolation', () => {
    it('should clear old resource identity upon 404 refetch and prevent stale leak', async () => {
      // Step 1: Mock related() to return successful resource identity on initial call
      const mockResource = { id: 'uuid-res-001', name: 'Authorized Project Space', access: 'granted' };
      const relatedMock = jest.fn().mockResolvedValueOnce(mockResource);

      const client = new AccessClient({ resolver: relatedMock });
      const initialResult = await client.resolveResource('uuid-res-001');
      expect(initialResult.access).toBe('granted');
      expect(initialResult.name).toBe('Authorized Project Space');

      // Step 2: Inject subsequent refetch returning 404 Not Found / Access Denied
      relatedMock.mockRejectedValueOnce(new ResourceNotFoundError('Resource revoked'));

      // Step 3: Perform refetch and assert rejection
      await expect(client.resolveResource('uuid-res-001')).rejects.toThrow('Resource revoked');

      // Step 4: Inject an additional unrelated call before invalidation settles
      await client.resolveResource('uuid-unrelated-999').catch(() => {});

      // Step 5: Assert stale identity is completely flushed from memory cache
      const cachedEntry = client.getCachedEntry('uuid-res-001');
      expect(cachedEntry).toBeUndefined();
      expect(client.getLastSettledIdentity('uuid-res-001')).toBeNull();
    });
  });
  ```

---

### Test Case: FEED-01
- **Title:** Group read acknowledgements event-driven synchronization & arrival races
- **Priority:** Critical
- **Category:** WebSocket Real-Time Synchronization & State Deduplication

#### Technical Justification (Why this cannot be automated in Playwright):
This test case addresses an event-driven race condition: when new feed posts arrive over a persistent WebSocket connection at the exact same millisecond that a user triggers a "Mark Group as Read" acknowledgement.
In automated E2E testing:
1. Public cloud latency between the test runner and the server introduces 50ms - 200ms of non-deterministic network jitter, making it impossible to guarantee exact event collision timing.
2. Generating genuine real-time inbound feed arrivals requires an external secondary user sending posts in the background. In CI, this creates test cross-talk, pollutes the production database, and frequently fails due to timing drift rather than application defects.

#### Manual QA / Network Proxy Test Procedure:
- **Tools Required:** Charles Proxy / Proxyman / Chrome DevTools Protocol (CDP) WebSocket tab.
- **Preconditions:**
  - Authenticated user account with 2 active subscriptions belonging to a group (e.g. Group "Work Forms").
  - Target group shows an unread badge indicator (e.g. `(3)` unread).
- **Test Steps:**
  1. Open Eve Vakh in Chrome with DevTools open to the **Network -> WS** tab.
  2. Select the active WebSocket connection (`wss://eve.vakh.com/socket` or similar).
  3. In Charles Proxy / DevTools, set a throttle on WebSocket inbound frames to 200ms delay.
  4. In a secondary browser (or via API client), publish a new post to the target group.
  5. Concurrently, click the "Mark group as read" / "Acknowledge" button in the primary browser.
  6. Observe WebSocket message sequence:
     - Inbound frame: `FEED_POST_ARRIVED` (payload includes post ID).
     - Outbound frame: `ACK_GROUP_READ` (payload includes group ID and timestamp).
  7. Observe the UI:
     - Verify that the unread badge counter updates cleanly: does it show `(1)` for the post arriving after the read marker, or `(0)` if arriving prior?
     - Verify that the unread badge counter does **not** flash negative numbers (e.g. `-1`) or duplicate badges.
     - Verify that the post is displayed in the feed without requiring a hard browser refresh.
  8. Repeat test 5 times to confirm state determinism under concurrent actions.

---

### Test Case: FEED-04
- **Title:** Fallback polling in disconnected mode does not race with group read synchronization
- **Priority:** High
- **Category:** Half-Open Network Transitions & Polling Concurrency

#### Technical Justification (Why this cannot be automated in Playwright):
This scenario validates that when a client's WebSocket drops (disconnected state) and triggers fallback HTTP polling, the polling requests do not race with or overwrite in-flight group read acknowledgements.
In Playwright:
- Running `page.setOffline(true)` shuts down the entire browser networking layer (both WebSockets and HTTP). Consequently, fallback HTTP polling calls are immediately blocked with `ERR_INTERNET_DISCONNECTED`.
- Simulating a half-open state (where WebSockets are blocked/closed by a corporate proxy or firewall, but standard HTTP polling endpoints remain operational) requires deep network layer interception or a dedicated proxy daemon (e.g. Toxiproxy).

#### Manual QA Test Procedure:
- **Tools Required:** Proxyman or Charles Proxy with WebSocket Block Rule enabled.
- **Preconditions:**
  - Authenticated user viewing active feed.
- **Test Steps:**
  1. Launch the application in browser through Charles Proxy.
  2. In Charles Proxy, configure a rewrite rule to block all WebSocket handshake requests (return HTTP 502 to `wss://*` or abort connection).
  3. Observe application transitioning to disconnected fallback mode:
     - Non-intrusive status indicator may appear ("Reconnecting..." or yellow dot).
     - App starts issuing periodic fallback polling requests (`GET /api/feed/poll?since=...`).
  4. While fallback polling is actively cycling, click "Mark all as read" in the group header.
  5. Wait for the next polling cycle to complete.
  6. Verify that the subsequent poll response does **not** resurrect the read items as "unread".
  7. Verify that no duplicate arrival notifications or read markers are registered.
  8. Remove the WebSocket block rule in the proxy to allow reconnection.
  9. Verify that the WebSocket reconnects seamlessly and synchronizes group read state without losing user actions taken during fallback mode.

---

### Test Case: UI-04-B
- **Title:** Third-Party Social Platform Share Card CDN Cache Invalidation
- **Priority:** Medium
- **Category:** External Crawler & Social Graph Verification

#### Technical Justification (Why this cannot be automated in Playwright):
While Playwright can easily parse `<meta property="og:image" content="...">` on the local page (automated in `UI-04-A`), it cannot interact with third-party social crawler backends:
- Twitter/X, Meta/Facebook, LinkedIn, and messaging services (WhatsApp, Telegram, Slack, iMessage) independently scrape open graph metadata and cache the rendered preview image on their proprietary Edge CDNs for 24 to 72 hours.
- These scrapers ignore standard browser cache-control headers and must be tested via the platforms' authenticated developer debugging consoles.

#### Manual QA Test Procedure:
- **Tools Required:**
  1. [Meta Sharing Debugger](https://developers.facebook.com/tools/debug/)
  2. [LinkedIn Post Inspector](https://www.linkedin.com/post-inspector/)
  3. [Twitter Card Validator / Tweet Composer Preview](https://twitter.com/)
  4. Telegram / WhatsApp client.
- **Preconditions:**
  - New landing page share card image deployed with updated copy/graphics and cache-busting token (`?v=20261102`).
- **Test Steps:**
  1. **Meta Sharing Debugger:**
     - Paste `https://eve.vakh.com/` into the debugger input.
     - Click "Debug" / "Scrape Again".
     - Inspect "Preview": verify new image and headline are rendered.
     - Confirm "Response Code" is 200.
     - Confirm "og:image" URL contains the updated version parameter.
  2. **LinkedIn Post Inspector:**
     - Enter `https://eve.vakh.com/`.
     - Click "Inspect".
     - Verify the newly updated image thumbnail is displayed in the card preview.
  3. **Messaging App Link Unfurling:**
     - Send the link `https://eve.vakh.com/` in a test Slack channel or WhatsApp chat.
     - Verify that the link unfurl thumbnail loads within 3 seconds and displays the latest high-contrast graphics without distortion.

---

### Test Case: UX-RESTRICT
- **Title:** Mobile restriction messaging does not overlap page chrome or navigation controls
- **Priority:** High
- **Category:** Mobile Viewport Ergonomics & Responsive Safe-Area Insets

#### Technical Justification (Why this cannot be automated in Playwright):
While Playwright can emulate mobile viewports (e.g. `375x667`), headless desktop browsers do not emulate physical device touch ergonomics, native iOS safe-area insets (`env(safe-area-inset-bottom)`), Dynamic Island cutouts, and soft virtual keyboard layout compression.
Verifying that restriction alerts remain readable and dismissible when a user taps an input on a physical mobile device requires hands-on device verification.

#### Manual QA Test Procedure:
- **Devices Required:**
  - Physical iPhone (iOS 17/18 with Safari)
  - Physical Android Device (Android 14/15 with Chrome)
- **Preconditions:**
  - Access a restricted post or private form link (`https://eve.vakh.com/form/<restricted-id>`) while unauthenticated.
- **Test Steps:**
  1. Open the link on the physical mobile device.
  2. Observe the restriction messaging banner ("Restricted Content - Please sign in to request access"):
     - Verify the banner is positioned with proper padding above the bottom navigation bar or iOS Home Indicator bar.
     - Verify banner text does not overlap header breadcrumbs or back button.
  3. Tap the "Sign in" or "Request Access" button within the restriction panel.
  4. If a modal opens, tap an input field to invoke the virtual soft keyboard.
  5. Observe the viewport adjustment:
     - Verify that the restriction panel or modal scrolls cleanly above the virtual keyboard.
     - Verify the "Cancel" or "Close" button remains accessible and is not pushed offscreen.
  6. Rotate the device between portrait and landscape modes.
  7. Verify that restriction messaging adjusts dynamically without clipping or overlapping surrounding controls.

