# Exact rendered browser-gate diagnostic

- Candidate: `067908e87e7bbb4894d35f0d3afd430fabdf5f3b`
- Candidate tree: `772066fa8e3c6bef3c68657ca9f0dab5f3b816b0`
- Source gated-release run: `31259851667`
- Source release job: `93108859875`
- Reproduction run: `31271075139`
- Browser-gate exit code: `1`
- Command: `npm run test:e2e -- --reporter=line,json`
- Runtime origin: `http://127.0.0.1:3210`

## Reporter totals

- expected: 139
- unexpected: 37
- flaky: 0
- skipped: 5
- duration_ms: 568309

## Failed tests (37)

### 1. commitments-live-portfolio.spec.ts › Commitments exposes truthful live-data sections and no visual-fixture values

- Location: `commitments-live-portfolio.spec.ts:69`
- Status: `failed`

```text
Error: expect(received).toEqual(expected) // deep equality

- Expected  - 1
+ Received  + 4

- Array []
+ Array [
+   "GET http://127.0.0.1:3210/_next/static/chunks/main-app.js?v=1786212419155: net::ERR_ABORTED",
+   "GET http://127.0.0.1:3210/moral-trade-input-standards.json: net::ERR_ABORTED",
+ ]

  111 |   expect(failures.consoleErrors).toEqual([]);
  112 |   expect(failures.pageErrors).toEqual([]);
> 113 |   expect(failures.failedRequests).toEqual([]);
      |                                   ^
  114 | });
  115 |
  116 | for (const viewport of [
    at /home/runner/work/Website2/Website2/candidate/tests/commitments-live-portfolio.spec.ts:113:35
```

### 2. exact-live-account.spec.ts › exact live interface account data › uses authenticated profile and persisted settings instead of placeholders

- Location: `exact-live-account.spec.ts:35`
- Status: `failed`

```text
Error: expect(locator).toHaveText(expected) failed

Locator: locator('[data-mt-live-account-row="currency"] [data-mt-live-account-detail="true"]')
Expected: "Not configured"
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toHaveText" with timeout 5000ms
  - waiting for locator('[data-mt-live-account-row="currency"] [data-mt-live-account-detail="true"]')


  58 |     await expect(
  59 |       page.locator('[data-mt-live-account-row="currency"] [data-mt-live-account-detail="true"]'),
> 60 |     ).toHaveText("Not configured");
     |       ^
  61 |     await expect(
  62 |       page.locator('[data-mt-live-account-row="safe-cap"] [data-mt-live-account-detail="true"]'),
  63 |     ).toHaveText("Not configured");
    at /home/runner/work/Website2/Website2/candidate/tests/exact-live-account.spec.ts:60:7
```

### 3. exact-live-account.spec.ts › exact live interface account data › renders a neutral account state when no viewer is authenticated

- Location: `exact-live-account.spec.ts:104`
- Status: `failed`

```text
Error: expect(locator).toHaveText(expected) failed

Locator: locator('[data-mt-live-account-row="currency"] [data-mt-live-account-detail="true"]')
Expected: "Sign in to view"
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toHaveText" with timeout 5000ms
  - waiting for locator('[data-mt-live-account-row="currency"] [data-mt-live-account-detail="true"]')


  126 |     await expect(
  127 |       page.locator('[data-mt-live-account-row="currency"] [data-mt-live-account-detail="true"]'),
> 128 |     ).toHaveText("Sign in to view");
      |       ^
  129 |     await expect(page.getByText("Alex Johnson", { exact: true })).toHaveCount(0);
  130 |   });
  131 | });
    at /home/runner/work/Website2/Website2/candidate/tests/exact-live-account.spec.ts:128:7
```

### 4. exact-live-autocomplete.spec.ts › the exact live trade clauses autocomplete causes, charities, and organizations

- Location: `exact-live-autocomplete.spec.ts:58`
- Status: `failed`

```text
Error: expect(locator).not.toHaveAttribute(expected) failed

Locator: locator('.clause').filter({ has: locator('.clause-label').filter({ hasText: 'I offer' }) }).locator('.token[contenteditable="true"]').first()
Expected: not "true"
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "not toHaveAttribute" with timeout 5000ms
  - waiting for locator('.clause').filter({ has: locator('.clause-label').filter({ hasText: 'I offer' }) }).locator('.token[contenteditable="true"]').first()


  68 |   const recipientToken = offerClause.locator('.token[contenteditable="true"]').nth(1);
  69 |
> 70 |   await expect(amountToken).not.toHaveAttribute("data-mt-autocomplete-ready", "true");
     |                                 ^
  71 |   await expect(recipientToken).toHaveAttribute("data-mt-autocomplete-ready", "true");
  72 |   await expect(recipientToken).toHaveAttribute("data-mt-autocomplete-context", "recipients");
  73 |
    at /home/runner/work/Website2/Website2/candidate/tests/exact-live-autocomplete.spec.ts:70:33
```

### 5. exact-live-autocomplete.spec.ts › the exact live commitment field composes topic-specific semantic matches

- Location: `exact-live-autocomplete.spec.ts:137`
- Status: `timedOut`

```text
Test timeout of 30000ms exceeded.
```

### 6. exact-live-autocomplete.spec.ts › the exact live offer palette uses three offer types and collects shared attributes

- Location: `exact-live-autocomplete.spec.ts:185`
- Status: `failed`

```text
Error: expect(locator).toHaveText(expected) failed

Locator: locator('[data-mt-offer-type] .mt-offer-ingredient-label')
Timeout: 5000ms
- Expected  - 5
+ Received  + 1

- Array [
-   "Money",
-   "Behavior or commitment",
-   "Help or service",
- ]
+ Array []

Call log:
  - Expect "toHaveText" with timeout 5000ms
  - waiting for locator('[data-mt-offer-type] .mt-offer-ingredient-label')
    11 × locator resolved to 0 elements


  192 |     '[data-mt-offer-type] .mt-offer-ingredient-label',
  193 |   );
> 194 |   await expect(offerTypeLabels).toHaveText([
      |                                 ^
  195 |     "Money",
  196 |     "Behavior or commitment",
  197 |     "Help or service",
    at /home/runner/work/Website2/Website2/candidate/tests/exact-live-autocomplete.spec.ts:194:33
```

### 7. exact-live-command-center.spec.ts › live Command Center › hands the command to the real private draft editor without a false success

- Location: `exact-live-command-center.spec.ts:7`
- Status: `failed`

```text
Error: expect(page).toHaveURL(expected) failed

Expected pattern: /\/trades\/new\?handoff=command-center$/
Received string:  "http://127.0.0.1:3210/trades/new"
Timeout: 5000ms

Call log:
  - Expect "toHaveURL" with timeout 5000ms
    12 × unexpected value "http://127.0.0.1:3210/trades/new"


  18 |     await page.getByRole("button", { name: "Build this offer" }).click();
  19 |
> 20 |     await expect(page).toHaveURL(/\/trades\/new\?handoff=command-center$/);
     |                        ^
  21 |     await expect(
  22 |       page.getByRole("heading", { name: "Sign in to build a trade." }),
  23 |     ).toBeVisible();
    at /home/runner/work/Website2/Website2/candidate/tests/exact-live-command-center.spec.ts:20:24
```

### 8. exact-live-custom-route.spec.ts › Exact live Custom Route workbench › separates planned donation flow from added-resource accounting

- Location: `exact-live-custom-route.spec.ts:14`
- Status: `timedOut`

```text
Test timeout of 30000ms exceeded while running "beforeEach" hook.

  2 |
  3 | test.describe("Exact live Custom Route workbench", () => {
> 4 |   test.beforeEach(async ({ page }) => {
    |        ^
  5 |     await page.addInitScript(() => {
  6 |       window.localStorage.removeItem("moraltrade.plan-resources.v1");
  7 |     });
    at /home/runner/work/Website2/Website2/candidate/tests/exact-live-custom-route.spec.ts:4:8
```

### 9. exact-live-custom-route.spec.ts › Exact live Custom Route workbench › keeps top-ups, fees, setup time, and actions inside added resources

- Location: `exact-live-custom-route.spec.ts:37`
- Status: `timedOut`

```text
Test timeout of 30000ms exceeded while running "beforeEach" hook.

  2 |
  3 | test.describe("Exact live Custom Route workbench", () => {
> 4 |   test.beforeEach(async ({ page }) => {
    |        ^
  5 |     await page.addInitScript(() => {
  6 |       window.localStorage.removeItem("moraltrade.plan-resources.v1");
  7 |     });
    at /home/runner/work/Website2/Website2/candidate/tests/exact-live-custom-route.spec.ts:4:8
```

### 10. exact-live-custom-route.spec.ts › Exact live Custom Route workbench › keeps weekly and monthly declarations and limits independent

- Location: `exact-live-custom-route.spec.ts:64`
- Status: `timedOut`

```text
Test timeout of 30000ms exceeded while running "beforeEach" hook.

  2 |
  3 | test.describe("Exact live Custom Route workbench", () => {
> 4 |   test.beforeEach(async ({ page }) => {
    |        ^
  5 |     await page.addInitScript(() => {
  6 |       window.localStorage.removeItem("moraltrade.plan-resources.v1");
  7 |     });
    at /home/runner/work/Website2/Website2/candidate/tests/exact-live-custom-route.spec.ts:4:8
```

### 11. exact-live-custom-route.spec.ts › Exact live Custom Route workbench › itemizes the route before a fail-closed review confirmation

- Location: `exact-live-custom-route.spec.ts:81`
- Status: `timedOut`

```text
Test timeout of 30000ms exceeded while running "beforeEach" hook.

  2 |
  3 | test.describe("Exact live Custom Route workbench", () => {
> 4 |   test.beforeEach(async ({ page }) => {
    |        ^
  5 |     await page.addInitScript(() => {
  6 |       window.localStorage.removeItem("moraltrade.plan-resources.v1");
  7 |     });
    at /home/runner/work/Website2/Website2/candidate/tests/exact-live-custom-route.spec.ts:4:8
```

### 12. exact-live-custom-route.spec.ts › Exact live Custom Route workbench › returns to Routes and stays free of horizontal overflow on mobile

- Location: `exact-live-custom-route.spec.ts:104`
- Status: `timedOut`

```text
Test timeout of 30000ms exceeded while running "beforeEach" hook.

  2 |
  3 | test.describe("Exact live Custom Route workbench", () => {
> 4 |   test.beforeEach(async ({ page }) => {
    |        ^
  5 |     await page.addInitScript(() => {
  6 |       window.localStorage.removeItem("moraltrade.plan-resources.v1");
  7 |     });
    at /home/runner/work/Website2/Website2/candidate/tests/exact-live-custom-route.spec.ts:4:8
```

### 13. exact-live-itinerary-editor.spec.ts › exact live inline itinerary editor › edits in place, supports draft controls, and cancels without changing the plan

- Location: `exact-live-itinerary-editor.spec.ts:22`
- Status: `failed`

```text
Error: expect(locator).toBeVisible() failed

Locator: locator('.itinerary')
Expected: visible
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 5000ms
  - waiting for locator('.itinerary')


   8 |   await page.evaluate((key) => window.localStorage.removeItem(key), storageKey);
   9 |   await page.reload({ waitUntil: "domcontentloaded" });
> 10 |   await expect(page.locator(".itinerary")).toBeVisible();
     |                                            ^
  11 | }
  12 |
  13 | async function openEditor(page: Page) {
    at openCleanNow (/home/runner/work/Website2/Website2/candidate/tests/exact-live-itinerary-editor.spec.ts:10:44)
    at /home/runner/work/Website2/Website2/candidate/tests/exact-live-itinerary-editor.spec.ts:23:5
```

### 14. exact-live-itinerary-editor.spec.ts › exact live inline itinerary editor › saves titles, amounts, dates, proof rules, and order across reloads

- Location: `exact-live-itinerary-editor.spec.ts:44`
- Status: `failed`

```text
Error: expect(locator).toBeVisible() failed

Locator: locator('.itinerary')
Expected: visible
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 5000ms
  - waiting for locator('.itinerary')


   8 |   await page.evaluate((key) => window.localStorage.removeItem(key), storageKey);
   9 |   await page.reload({ waitUntil: "domcontentloaded" });
> 10 |   await expect(page.locator(".itinerary")).toBeVisible();
     |                                            ^
  11 | }
  12 |
  13 | async function openEditor(page: Page) {
    at openCleanNow (/home/runner/work/Website2/Website2/candidate/tests/exact-live-itinerary-editor.spec.ts:10:44)
    at /home/runner/work/Website2/Website2/candidate/tests/exact-live-itinerary-editor.spec.ts:45:5
```

### 15. exact-live-itinerary-editor.spec.ts › exact live inline itinerary editor › uses the compact in-card editor without horizontal overflow

- Location: `exact-live-itinerary-editor.spec.ts:92`
- Status: `failed`

```text
Error: expect(locator).toBeVisible() failed

Locator: locator('.itinerary')
Expected: visible
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 5000ms
  - waiting for locator('.itinerary')


   8 |   await page.evaluate((key) => window.localStorage.removeItem(key), storageKey);
   9 |   await page.reload({ waitUntil: "domcontentloaded" });
> 10 |   await expect(page.locator(".itinerary")).toBeVisible();
     |                                            ^
  11 | }
  12 |
  13 | async function openEditor(page: Page) {
    at openCleanNow (/home/runner/work/Website2/Website2/candidate/tests/exact-live-itinerary-editor.spec.ts:10:44)
    at /home/runner/work/Website2/Website2/candidate/tests/exact-live-itinerary-editor.spec.ts:94:5
```

### 16. exact-live-local-time.spec.ts › exact live interface local time › America/Los_Angeles › uses the visitor's previous local day across Now, Trade, and Activity

- Location: `exact-live-local-time.spec.ts:60`
- Status: `failed`

```text
Error: expect(locator).toHaveAttribute(expected) failed

Locator: locator('.head .date')
Expected: "2026-07-16"
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toHaveAttribute" with timeout 5000ms
  - waiting for locator('.head .date')


  31 | ) {
  32 |   const localHeader = page.locator(".head .date");
> 33 |   await expect(localHeader).toHaveAttribute("data-mt-local-date-time", expected.dateTime);
     |                             ^
  34 |   await expect(localHeader.locator('time[data-mt-local-date="true"]')).toHaveAttribute(
  35 |     "datetime",
  36 |     expected.dateTime,
    at expectLocalHeader (/home/runner/work/Website2/Website2/candidate/tests/exact-live-local-time.spec.ts:33:29)
    at expectHeaderAcrossPrimaryPages (/home/runner/work/Website2/Website2/candidate/tests/exact-live-local-time.spec.ts:52:11)
    at /home/runner/work/Website2/Website2/candidate/tests/exact-live-local-time.spec.ts:65:7
```

### 17. exact-live-local-time.spec.ts › exact live interface local time › Asia/Tokyo › uses the visitor's next local day across Now, Trade, and Activity

- Location: `exact-live-local-time.spec.ts:76`
- Status: `failed`

```text
Error: expect(locator).toHaveAttribute(expected) failed

Locator: locator('.head .date')
Expected: "2026-07-17"
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toHaveAttribute" with timeout 5000ms
  - waiting for locator('.head .date')


  31 | ) {
  32 |   const localHeader = page.locator(".head .date");
> 33 |   await expect(localHeader).toHaveAttribute("data-mt-local-date-time", expected.dateTime);
     |                             ^
  34 |   await expect(localHeader.locator('time[data-mt-local-date="true"]')).toHaveAttribute(
  35 |     "datetime",
  36 |     expected.dateTime,
    at expectLocalHeader (/home/runner/work/Website2/Website2/candidate/tests/exact-live-local-time.spec.ts:33:29)
    at expectHeaderAcrossPrimaryPages (/home/runner/work/Website2/Website2/candidate/tests/exact-live-local-time.spec.ts:52:11)
    at /home/runner/work/Website2/Website2/candidate/tests/exact-live-local-time.spec.ts:81:7
```

### 18. exact-live-plan-resources.spec.ts › exact live Plan Resources controls › all five controls update the route and remain set after rerender

- Location: `exact-live-plan-resources.spec.ts:12`
- Status: `timedOut`

```text
Test timeout of 30000ms exceeded.
```

### 19. exact-live-plan-resources.spec.ts › exact live Plan Resources controls › Reset restores every control and the allocation table

- Location: `exact-live-plan-resources.spec.ts:58`
- Status: `timedOut`

```text
Test timeout of 30000ms exceeded.
```

### 20. exact-live-route-recommendations.spec.ts › live route recommendation planner › saves the progressive composer and refreshes the authoritative routePlanner in place

- Location: `exact-live-route-recommendations.spec.ts:188`
- Status: `failed`

```text
Error: locator.fill: Error: strict mode violation: locator('[data-mt-live-route-composer]').getByLabel('Goal') resolved to 2 elements:
    1) <input value="" name="goal" required="" maxlength="180" id="mt-lrp-goal" aria-haspopup="listbox" aria-autocomplete="list" placeholder="What should change?" data-mt-autocomplete-ready="true" data-mt-autocomplete-context="commitments"/> aka getByRole('textbox', { name: 'Goal', exact: true })
    2) <input required="" maxlength="120" id="mt-lrp-cause" name="causePriority" value="Animal welfare" aria-haspopup="listbox" aria-autocomplete="list" data-mt-autocomplete-ready="true" data-mt-autocomplete-context="priorities" placeholder="For example: Farmed-animal welfare"/> aka getByRole('textbox', { name: 'Cause area used for matching' })

Call log:
  - waiting for locator('[data-mt-live-route-composer]').getByLabel('Goal')


  207 |
  208 |     const composer = page.locator("[data-mt-live-route-composer]");
> 209 |     await composer.getByLabel("Goal").fill("Reduce preventable animal suffering");
      |                                       ^
  210 |     await composer.getByLabel("Cause area used for matching").fill("Farmed-animal welfare");
  211 |     await composer.getByLabel("Money").fill("35");
  212 |     await composer.getByLabel("Minutes").fill("45");
    at /home/runner/work/Website2/Website2/candidate/tests/exact-live-route-recommendations.spec.ts:209:39
```

### 21. exact-live-route-recommendations.spec.ts › live route recommendation planner › reviews and confirms the guided interview before posting it

- Location: `exact-live-route-recommendations.spec.ts:281`
- Status: `failed`

```text
Error: expect(locator).toBeVisible() failed

Locator: getByText('interview confirmed')
Expected: visible
Error: strict mode violation: getByText('interview confirmed') resolved to 2 elements:
    1) <small>0 comparisons saved · interview confirmed</small> aka getByText('0 comparisons saved ·')
    2) <p aria-live="polite" class="mt-lrp-request-status">Interview confirmed. Routes refreshed.</p> aka getByText('Interview confirmed. Routes')

Call log:
  - Expect "toBeVisible" with timeout 5000ms
  - waiting for getByText('interview confirmed')


  307 |     await dialog.getByRole("button", { name: "Confirm profile" }).click();
  308 |
> 309 |     await expect(page.getByText("interview confirmed", { exact: false })).toBeVisible();
      |                                                                           ^
  310 |     expect(posts).toHaveLength(1);
  311 |     expect(posts[0]).toEqual({
  312 |       action: "save_interview",
    at /home/runner/work/Website2/Website2/candidate/tests/exact-live-route-recommendations.spec.ts:309:75
```

### 22. exact-live-templates.spec.ts › live Trade template system › opens from the Trade control and uses a template in one click

- Location: `exact-live-templates.spec.ts:4`
- Status: `failed`

```text
Error: expect(locator).toBeVisible() failed

Locator: locator('.compose-grid')
Expected: visible
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 5000ms
  - waiting for locator('.compose-grid')


   5 |     await page.setViewportSize({ width: 1440, height: 1000 });
   6 |     await page.goto("/moral-trade-live.html#trade", { waitUntil: "domcontentloaded" });
>  7 |     await expect(page.locator(".compose-grid")).toBeVisible();
     |                                                 ^
   8 |
   9 |     const obsoleteOverflowControl = page
  10 |       .locator(".compose-grid button, .compose-grid a")
    at /home/runner/work/Website2/Website2/candidate/tests/exact-live-templates.spec.ts:7:49
```

### 23. exact-live-templates.spec.ts › live Trade template system › completes all three guided questions and hands pledge templates to the safe editor

- Location: `exact-live-templates.spec.ts:37`
- Status: `timedOut`

```text
Test timeout of 30000ms exceeded.
```

### 24. exact-live-templates.spec.ts › live Trade template system › keeps the library and guide usable without horizontal overflow on mobile

- Location: `exact-live-templates.spec.ts:66`
- Status: `failed`

```text
Error: expect(locator).toBeVisible() failed

Locator: getByRole('heading', { name: 'Choose a template.' })
Expected: visible
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 5000ms
  - waiting for getByRole('heading', { name: 'Choose a template.' })


  67 |     await page.setViewportSize({ width: 390, height: 844 });
  68 |     await page.goto("/offers?view=templates");
> 69 |     await expect(page.getByRole("heading", { name: "Choose a template." })).toBeVisible();
     |                                                                             ^
  70 |
  71 |     const libraryOverflow = await page.evaluate(
  72 |       () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    at /home/runner/work/Website2/Website2/candidate/tests/exact-live-templates.spec.ts:69:77
```

### 25. exact-live-verification.spec.ts › complete verification › routes the existing calendar action into the verification workflow

- Location: `exact-live-verification.spec.ts:75`
- Status: `failed`

```text
Error: expect(locator).toBeVisible() failed

Locator: locator('[data-mt-complete-verification="true"], button:has-text("Complete verification"), a:has-text("Complete verification")').first()
Expected: visible
Timeout: 20000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 20000ms
  - waiting for locator('[data-mt-complete-verification="true"], button:has-text("Complete verification"), a:has-text("Complete verification")').first()


  79 |     ).first();
  80 |
> 81 |     await expect(completeVerification).toBeVisible({ timeout: 20_000 });
     |                                        ^
  82 |     await completeVerification.click();
  83 |     await expect(page).toHaveURL(/\/complete-verification\.html\?/);
  84 |     await expect(page.getByRole("heading", { name: "Complete verification" })).toBeVisible();
    at /home/runner/work/Website2/Website2/candidate/tests/exact-live-verification.spec.ts:81:40
```

### 26. feed-create-phase1-authenticated.spec.ts › authenticated Feed-to-Create Phase 1 › two users receive distinct receipt-bound source drafts on desktop and 390px mobile

- Location: `feed-create-phase1-authenticated.spec.ts:564`
- Status: `failed`

```text
Error: FEED_CREATE_QA_PASSWORD is required.

  268 |
  269 | async function signIn(email: string) {
> 270 |   if (!QA_PASSWORD) throw new Error("FEED_CREATE_QA_PASSWORD is required.");
      |                           ^
  271 |   const client = authClient();
  272 |   const { data, error } = await client.auth.signInWithPassword({
  273 |     email,
    at signIn (/home/runner/work/Website2/Website2/candidate/tests/feed-create-phase1-authenticated.spec.ts:270:27)
    at finishSourceFlow (/home/runner/work/Website2/Website2/candidate/tests/feed-create-phase1-authenticated.spec.ts:498:25)
    at /home/runner/work/Website2/Website2/candidate/tests/feed-create-phase1-authenticated.spec.ts:567:11
```

### 27. meta-explanatory-copy.spec.ts › renders concise states on the affected routes

- Location: `meta-explanatory-copy.spec.ts:39`
- Status: `failed`

```text
Error: expect(locator).toBeVisible() failed

Locator: getByRole('heading', { name: /Test one moral trade/, level: 1 })
Expected: visible
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 5000ms
  - waiting for getByRole('heading', { name: /Test one moral trade/, level: 1 })
    - waiting for" http://127.0.0.1:3210/start" navigation to finish...
    - navigated to "http://127.0.0.1:3210/start"


  47 |
  48 |   await page.goto("/pilot");
> 49 |   await expect(page.getByRole("heading", { level: 1, name: /Test one moral trade/ })).toBeVisible();
     |                                                                                       ^
  50 |   await expect(page.locator("body")).not.toContainText("distinguish a serious first user");
  51 | });
  52 |
    at /home/runner/work/Website2/Website2/candidate/tests/meta-explanatory-copy.spec.ts:49:87
```

### 28. moral-trade-brand.spec.ts › canonical Moral Trade brand › adapts the compact mark and sans wordmark to dark and light headers

- Location: `moral-trade-brand.spec.ts:37`
- Status: `failed`

```text
Error: expect(locator).toHaveCount(expected) failed

Locator:  locator('[data-mt-brand-canonical="true"]')
Expected: 2
Received: 0
Timeout:  5000ms

Call log:
  - Expect "toHaveCount" with timeout 5000ms
  - waiting for locator('[data-mt-brand-canonical="true"]')
    14 × locator resolved to 0 elements
       - unexpected value "0"


  47 |
  48 |     const brands = page.locator('[data-mt-brand-canonical="true"]');
> 49 |     await expect(brands).toHaveCount(2);
     |                          ^
  50 |     await expect(brands.nth(0)).toHaveCSS("color", "rgb(255, 255, 255)");
  51 |     await expect(brands.nth(1)).toHaveCSS("color", "rgb(23, 24, 21)");
  52 |   });
    at /home/runner/work/Website2/Website2/candidate/tests/moral-trade-brand.spec.ts:49:26
```

### 29. returning-homepage-timezone.spec.ts › Returning homepage in America/Los_Angeles › uses the visitor's previous local date and evening greeting

- Location: `returning-homepage-timezone.spec.ts:19`
- Status: `failed`

```text
Error: expect(locator).toHaveAttribute(expected) failed

Locator: getByTestId('local-date-greeting')
Expected: "true"
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toHaveAttribute" with timeout 5000ms
  - waiting for getByTestId('local-date-greeting')


   8 | ) {
   9 |   const localGreeting = page.getByTestId("local-date-greeting");
> 10 |   await expect(localGreeting).toHaveAttribute("data-ready", "true");
     |                               ^
  11 |   await expect(localGreeting.locator("time")).toHaveAttribute("datetime", expected.dateTime);
  12 |   await expect(localGreeting.locator("time")).toHaveText(expected.dateLabel);
  13 |   await expect(localGreeting.getByText(expected.greeting, { exact: true })).toBeVisible();
    at expectLocalGreeting (/home/runner/work/Website2/Website2/candidate/tests/returning-homepage-timezone.spec.ts:10:31)
    at /home/runner/work/Website2/Website2/candidate/tests/returning-homepage-timezone.spec.ts:23:11
```

### 30. returning-homepage-timezone.spec.ts › Returning homepage in Asia/Tokyo › uses the visitor's next local date and morning greeting

- Location: `returning-homepage-timezone.spec.ts:34`
- Status: `failed`

```text
Error: expect(locator).toHaveAttribute(expected) failed

Locator: getByTestId('local-date-greeting')
Expected: "true"
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toHaveAttribute" with timeout 5000ms
  - waiting for getByTestId('local-date-greeting')


   8 | ) {
   9 |   const localGreeting = page.getByTestId("local-date-greeting");
> 10 |   await expect(localGreeting).toHaveAttribute("data-ready", "true");
     |                               ^
  11 |   await expect(localGreeting.locator("time")).toHaveAttribute("datetime", expected.dateTime);
  12 |   await expect(localGreeting.locator("time")).toHaveText(expected.dateLabel);
  13 |   await expect(localGreeting.getByText(expected.greeting, { exact: true })).toBeVisible();
    at expectLocalGreeting (/home/runner/work/Website2/Website2/candidate/tests/returning-homepage-timezone.spec.ts:10:31)
    at /home/runner/work/Website2/Website2/candidate/tests/returning-homepage-timezone.spec.ts:38:11
```

### 31. returning-homepage-timezone.spec.ts › Returning homepage local-time refresh › refreshes after the local date and greeting period change

- Location: `returning-homepage-timezone.spec.ts:49`
- Status: `failed`

```text
Error: expect(locator).toHaveAttribute(expected) failed

Locator: getByTestId('local-date-greeting')
Expected: "true"
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toHaveAttribute" with timeout 5000ms
  - waiting for getByTestId('local-date-greeting')


   8 | ) {
   9 |   const localGreeting = page.getByTestId("local-date-greeting");
> 10 |   await expect(localGreeting).toHaveAttribute("data-ready", "true");
     |                               ^
  11 |   await expect(localGreeting.locator("time")).toHaveAttribute("datetime", expected.dateTime);
  12 |   await expect(localGreeting.locator("time")).toHaveText(expected.dateLabel);
  13 |   await expect(localGreeting.getByText(expected.greeting, { exact: true })).toBeVisible();
    at expectLocalGreeting (/home/runner/work/Website2/Website2/candidate/tests/returning-homepage-timezone.spec.ts:10:31)
    at /home/runner/work/Website2/Website2/candidate/tests/returning-homepage-timezone.spec.ts:53:11
```

### 32. returning-homepage.spec.ts › Returning-user homepage › matches the approved desktop trade-deck contract

- Location: `returning-homepage.spec.ts:21`
- Status: `failed`

```text
Error: expect(locator).toHaveText(expected) failed

Locator: getByRole('navigation', { name: 'Primary' }).getByRole('link')
Timeout: 5000ms
- Expected  - 8
+ Received  + 1

- Array [
-   "Feed",
-   "Now",
-   "Discover",
-   "Activity",
-   "Evidence",
-   "Account",
- ]
+ Array []

Call log:
  - Expect "toHaveText" with timeout 5000ms
  - waiting for getByRole('navigation', { name: 'Primary' }).getByRole('link')
    14 × locator resolved to 0 elements


  26 |
  27 |     const primary = page.getByRole("navigation", { name: "Primary" });
> 28 |     await expect(primary.getByRole("link")).toHaveText([
     |                                             ^
  29 |       "Feed",
  30 |       "Now",
  31 |       "Discover",
    at /home/runner/work/Website2/Website2/candidate/tests/returning-homepage.spec.ts:28:45
```

### 33. returning-homepage.spec.ts › Returning-user homepage › keeps the approved controls interactive

- Location: `returning-homepage.spec.ts:170`
- Status: `timedOut`

```text
Test timeout of 30000ms exceeded.
```

### 34. returning-homepage.spec.ts › Returning-user homepage › stacks the trade deck without horizontal overflow on mobile

- Location: `returning-homepage.spec.ts:211`
- Status: `failed`

```text
Error: expect(locator).toHaveAttribute(expected) failed

Locator: getByTestId('home-offer-trade')
Expected: "/offers?view=templates"
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toHaveAttribute" with timeout 5000ms
  - waiting for getByTestId('home-offer-trade')


  215 |     await expect(page.getByText("A trade worth considering.", { exact: true })).toHaveCount(0);
  216 |     await expect(page.getByRole("navigation", { name: "Primary" })).toBeHidden();
> 217 |     await expect(page.getByTestId("home-offer-trade")).toHaveAttribute(
      |                                                        ^
  218 |       "href",
  219 |       "/offers?view=templates",
  220 |     );
    at /home/runner/work/Website2/Website2/candidate/tests/returning-homepage.spec.ts:217:56
```

### 35. trade-controls.spec.ts › trade controls previews integrity and a complete multi-party circle

- Location: `trade-controls.spec.ts:3`
- Status: `failed`

```text
Error: expect(locator).toBeVisible() failed

Locator: getByRole('heading', { name: 'Ready for human review.' })
Expected: visible
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 5000ms
  - waiting for getByRole('heading', { name: 'Ready for human review.' })


  19 |   }
  20 |
> 21 |   await expect(page.getByRole("heading", { name: "Ready for human review." })).toBeVisible();
     |                                                                                ^
  22 |
  23 |   await controlsNavigation.getByRole("button", { name: /Trade circles/ }).click();
  24 |   await expect(page.getByRole("heading", { name: "Multi-party Trade Circles" })).toBeVisible();
    at /home/runner/work/Website2/Website2/candidate/tests/trade-controls.spec.ts:21:80
```

### 36. your-match-viewport.spec.ts › Your Match keeps its title, cards, and action visible at the reported 1662x934 viewport

- Location: `your-match-viewport.spec.ts:9`
- Status: `failed`

```text
Error: expect(locator).toBeVisible() failed

Locator: getByRole('tab', { name: /Your match/i })
Expected: visible
Timeout: 15000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 15000ms
  - waiting for getByRole('tab', { name: /Your match/i })


  15 |
  16 |     const matchTab = page.getByRole("tab", { name: /Your match/i });
> 17 |     await expect(matchTab).toBeVisible({ timeout: 15_000 });
     |                            ^
  18 |     await matchTab.click();
  19 |     await page.getByRole("button", { name: /^Money\b/ }).click();
  20 |
    at /home/runner/work/Website2/Website2/candidate/tests/your-match-viewport.spec.ts:17:28
```

### 37. your-match-viewport.spec.ts › Your Match keeps its title, cards, and action visible at the compact 1366x768 viewport

- Location: `your-match-viewport.spec.ts:9`
- Status: `failed`

```text
Error: expect(locator).toBeVisible() failed

Locator: getByRole('tab', { name: /Your match/i })
Expected: visible
Timeout: 15000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 15000ms
  - waiting for getByRole('tab', { name: /Your match/i })


  15 |
  16 |     const matchTab = page.getByRole("tab", { name: /Your match/i });
> 17 |     await expect(matchTab).toBeVisible({ timeout: 15_000 });
     |                            ^
  18 |     await matchTab.click();
  19 |     await page.getByRole("button", { name: /^Money\b/ }).click();
  20 |
    at /home/runner/work/Website2/Website2/candidate/tests/your-match-viewport.spec.ts:17:28
```

## Evidence files

- `browser-gate.clean.log`: complete ANSI-free browser-gate output
- `playwright-results.json`: structured Playwright report when emitted
- `selected-traces/`: representative Playwright traces selected deterministically from the failing run
- Full `test-results/` and reporter outputs are retained in the workflow artifact.
