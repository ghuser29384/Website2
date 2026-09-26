import { expect, test, type APIRequestContext, type BrowserContext } from "@playwright/test";

const fixtureURL = "http://127.0.0.1:3231";
const fixtureHeaders = { "x-auth-resolution-fixture-control": "auth-resolution-local-control-fixture" };

async function session(request: APIRequestContext, context: BrowserContext, mode: "fast" | "delayed") {
  const response = await request.get(`${fixtureURL}/__fixture/session?mode=${mode}`, { headers: fixtureHeaders });
  expect(response.ok()).toBeTruthy();
  const fixture = await response.json();
  await context.addCookies([{
    domain: "127.0.0.1", httpOnly: true, name: fixture.cookieName, path: "/",
    sameSite: "Lax", secure: false, value: fixture.cookieValue,
  }]);
}

for (const viewport of [{ width: 1440, height: 1000 }, { width: 390, height: 844 }]) {
  test.describe(`Commitments production renderer ${viewport.width}px`, () => {
    test.use({ viewport });
    test.beforeEach(async ({ request, context }) => {
      const reset = await request.post(`${fixtureURL}/__fixture/reset`, { headers: fixtureHeaders });
      expect(reset.ok()).toBeTruthy();
      await context.addCookies([{
        domain: "127.0.0.1", httpOnly: false, name: "mt_analytics_opt_out", path: "/",
        sameSite: "Lax", secure: false, value: "1",
      }]);
    });

    test("signed-out page discloses no portfolio and sign-in navigation works", async ({ page }, testInfo) => {
      const errors: string[] = [];
      page.on("pageerror", (error) => errors.push(error.message));
      await page.goto("/commitments");
      await expect(page).toHaveTitle(/Commitments/);
      await expect(page.getByRole("heading", { name: "Sign in to view your commitments." })).toBeVisible();
      await expect(page.locator('[aria-label="Commitment summary"]')).toHaveCount(0);
      await expect(page.getByText("Auth Resolution QA", { exact: false })).toHaveCount(0);
      await page.screenshot({ path: testInfo.outputPath(`signed-out-${viewport.width}.png`), fullPage: true });
      await page.getByRole("link", { name: "Sign in to continue" }).click();
      await expect(page).toHaveURL(/\/login\?returnTo=(?:%2F|\/)commitments/);
      expect(errors).toEqual([]);
    });

    test("verified fixture session loads empty records and every portfolio tab", async ({ page, request, context }, testInfo) => {
      const errors: string[] = [];
      page.on("pageerror", (error) => errors.push(error.message));
      await session(request, context, "fast");
      await page.goto("/commitments");
      await expect(page).toHaveTitle(/Commitments/);
      await expect(page.locator("#commitments-heading")).toBeVisible();
      await expect(page.getByRole("heading", { name: "No commitments yet." })).toBeVisible();
      await expect(page.locator('[aria-label="Commitment summary"]')).toBeVisible();
      await expect(page.getByText("Some records unavailable")).toHaveCount(0);
      await page.screenshot({ path: testInfo.outputPath(`loaded-empty-${viewport.width}.png`), fullPage: true });
      const tabs = page.getByRole("navigation", { name: "Commitments sections" });
      for (const [label, state] of [
        ["Ledger", "No ledger events exist for this account."],
        ["Completed", "No completed, returned, cancelled, or expired commitments yet."],
        ["Calendar", "No dates match this calendar view."],
      ]) {
        await tabs.getByRole("link", { name: label, exact: true }).click();
        await expect(page).toHaveURL(new RegExp(`tab=${label.toLowerCase()}`));
        await expect(page.getByText(state, { exact: true })).toBeVisible();
        await expect(tabs.getByRole("link", { name: label, exact: true })).toHaveAttribute("aria-current", "page");
      }
      const allDates = page.getByRole("navigation", { name: "Calendar scope" }).getByRole("link", { name: "All dates" });
      await allDates.click();
      await expect(page).toHaveURL(/calendar=all/);
      // URL commitment precedes the streamed view. Finish this transition before
      // issuing another navigation, as for each of the tab transitions above.
      await expect(allDates).toHaveAttribute("aria-current", "page");
      await expect(page.getByText("No dates match this calendar view.", { exact: true })).toBeVisible();
      const portfolio = tabs.getByRole("link", { name: "Portfolio", exact: true });
      await portfolio.click();
      await expect(page).toHaveURL(/\/commitments$/);
      await expect(portfolio).toHaveAttribute("aria-current", "page");
      await expect(page.getByRole("heading", { name: "No commitments yet." })).toBeVisible();
      const mechanism = page.getByRole("navigation", { name: "Group portfolio by" }).getByRole("link", { name: "Mechanism", exact: true });
      await mechanism.click();
      await expect(page).toHaveURL(/group=mechanism/);
      await expect(mechanism).toHaveAttribute("aria-current", "page");
      await expect(page.getByRole("heading", { name: "No commitments yet." })).toBeVisible();
      expect(errors).toEqual([]);
    });


    test("compact layout keeps real quantities and disclosures usable", async ({ page, request, context }, testInfo) => {
      const errors: string[] = [];
      page.on("pageerror", (error) => errors.push(error.message));
      await session(request, context, "fast");
      const scenario = await request.post(`${fixtureURL}/__fixture/commitments-layout?scenario=populated`, { headers: fixtureHeaders });
      expect(scenario.ok()).toBeTruthy();
      await page.goto("/commitments");
      const heading = page.getByRole("heading", { name: "Commitments", exact: true });
      await expect(heading).toBeVisible();
      expect(await heading.evaluate((el) => parseFloat(getComputedStyle(el).fontSize))).toBeLessThanOrEqual(32);
      await expect(page.locator(".mt-v75-side-brand")).toHaveCount(0);
      await expect(page.locator(".mt-v75-side-plan")).toHaveCount(0);
      const summary = page.locator('[aria-label="Commitment summary"]');
      await expect(summary.locator("strong")).toHaveText(["1", "1", "1", "0"]);
      const record = page.locator('article[class*="recordRow"]');
      await expect(record.getByRole("heading", { name: "Private agreement" })).toBeVisible();
      await expect(record.getByText("$1,250", { exact: true }).first()).toBeVisible();
      await expect(record.getByText("€70", { exact: true }).first()).toBeVisible();
      // Evidence and review share a definition; exact text also includes the review child.
      const evidence = record.getByRole("definition").filter({ hasText: "No evidence submitted" });
      await expect(evidence).toBeVisible();
      await expect(evidence).toContainText("No evidence submitted");
      await expect(evidence.locator("small")).toHaveText("No review case");
      await expect(record.getByRole("link", { name: /Resolve payment authorization/ })).toHaveAttribute("href", /\/agreements\//);
      await expect(page.getByText("Some records unavailable", { exact: false })).toHaveCount(0);
      const resources = page.locator('details').filter({ has: page.locator('summary', { hasText: /^Resource totals$/ }) });
      await expect(resources).not.toHaveAttribute("open");
      await resources.locator("summary").focus();
      await page.keyboard.press("Enter");
      await expect(resources).toHaveAttribute("open", "");
      await expect(resources.getByText("$1,250", { exact: true }).first()).toBeVisible();
      await expect(resources.getByText("€70", { exact: true }).first()).toBeVisible();
      await resources.locator("summary").press("Enter");
      const calculation = page.locator('details').filter({ has: page.locator('summary', { hasText: /^How this is calculated$/ }) });
      await expect(calculation.locator("p")).not.toBeVisible();
      await calculation.locator("summary").press("Enter");
      await expect(calculation.locator("p")).toContainText("not an expected-value estimate");
      await calculation.locator("summary").press("Enter");
      const totals = page.locator('details').filter({ has: page.locator('summary', { hasText: /Group totals/ }) });
      await totals.locator("summary").press("Enter");
      await expect(totals.locator("dl")).toBeVisible();
      await totals.locator("summary").press("Enter");
      if (viewport.width > 979) {
        expect((await page.locator(".mt-v75-side-nav").boundingBox())!.width).toBeLessThanOrEqual(180);
        expect((await record.boundingBox())!.y).toBeLessThan(650);
      }
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
      await page.screenshot({ path: testInfo.outputPath(`compact-populated-${viewport.width}.png`), fullPage: true });
      expect(errors).toEqual([]);
    });

    test("partial records remain visibly qualified above the compact counts", async ({ page, request, context }, testInfo) => {
      await session(request, context, "fast");
      const scenario = await request.post(`${fixtureURL}/__fixture/commitments-layout?scenario=partial`, { headers: fixtureHeaders });
      expect(scenario.ok()).toBeTruthy();
      await page.goto("/commitments");
      const warning = page.locator("summary", { hasText: "Some records unavailable — totals may be incomplete" });
      await expect(warning).toBeVisible();
      const summary = page.locator('[aria-label="Commitment summary"]');
      expect((await warning.boundingBox())!.y).toBeLessThan((await summary.boundingBox())!.y);
      await warning.press("Enter");
      await expect(page.getByText("Donation redirects: Layout fixture: redirects unavailable", { exact: true })).toBeVisible();
      await page.screenshot({ path: testInfo.outputPath(`compact-partial-${viewport.width}.png`), fullPage: true });
    });

    test("loading boundary streams before delayed verification and resolves afterward", async ({ page, request, context }, testInfo) => {
      const errors: string[] = [];
      page.on("pageerror", (error) => errors.push(error.message));
      await session(request, context, "delayed");
      const gate = await request.post(`${fixtureURL}/__fixture/verification-gate`, { headers: fixtureHeaders });
      expect(gate.ok()).toBeTruthy();
      await page.goto("/commitments", { waitUntil: "commit" });
      await expect(page.getByRole("status").filter({ hasText: "Loading your commitments" })).toBeVisible();
      await expect(page.locator('[aria-label="Commitment summary"]')).toHaveCount(0);
      await expect(page.getByText("Auth Resolution QA", { exact: false })).toHaveCount(0);
      await page.screenshot({ path: testInfo.outputPath(`streaming-${viewport.width}.png`), fullPage: true });
      let gateId: string | undefined;
      await expect.poll(async () => {
        const response = await request.get(`${fixtureURL}/__fixture/events`, { headers: fixtureHeaders });
        const result = await response.json();
        gateId = result.verificationEvents.find((event: { result: string; gateId?: string }) => event.result === "pending_verified_user")?.gateId;
        return Boolean(gateId);
      }).toBe(true);
      const release = await request.post(`${fixtureURL}/__fixture/verification-gate/release?gateId=${encodeURIComponent(gateId!)}`, { headers: fixtureHeaders });
      expect(release.ok()).toBeTruthy();
      await expect(page.getByRole("heading", { name: "No commitments yet." })).toBeVisible();
      await expect(page.getByRole("status").filter({ hasText: "Loading your commitments" })).toHaveCount(0);
      expect(errors).toEqual([]);
    });
  });
}
