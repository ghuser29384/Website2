import { expect, test, type APIRequestContext, type BrowserContext, type Page } from "@playwright/test";

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

async function expectNoHorizontalOverflow(page: Page) {
  const widths = await page.evaluate(() => ({
    body: document.body.scrollWidth,
    document: document.documentElement.scrollWidth,
    viewport: window.innerWidth,
  }));
  expect(widths.body).toBeLessThanOrEqual(widths.viewport + 1);
  expect(widths.document).toBeLessThanOrEqual(widths.viewport + 1);
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
      await expect(page.getByRole("heading", { name: "Commitments", exact: true })).toBeVisible();
      await expect(page.getByText("Track your commitments, proof, outcomes, and impact.", { exact: true })).toBeVisible();
      await expect(page.getByRole("heading", { name: "Sign in to view your commitments." })).toBeVisible();
      await expect(page.locator('[aria-label="Commitment summary"]')).toHaveCount(0);
      await expect(page.getByText("Auth Resolution QA", { exact: false })).toHaveCount(0);
      await expectNoHorizontalOverflow(page);
      await page.screenshot({ path: testInfo.outputPath(`signed-out-${viewport.width}.png`), fullPage: true });
      await page.getByRole("link", { name: "Sign in to continue" }).click();
      await expect(page).toHaveURL(/\/login\?returnTo=(?:%2F|\/)commitments/);
      expect(errors).toEqual([]);
    });

    test("verified fixture session loads the redesigned summary and every portfolio tab", async ({ page, request, context }, testInfo) => {
      const errors: string[] = [];
      page.on("pageerror", (error) => errors.push(error.message));
      await session(request, context, "fast");
      await page.goto("/commitments");
      await expect(page).toHaveTitle(/Commitments/);
      await expect(page.getByRole("heading", { name: "Commitments", exact: true })).toBeVisible();
      await expect(page.getByText("Track your commitments, proof, outcomes, and impact.", { exact: true })).toBeVisible();
      await expect(page.getByRole("heading", { name: "No commitments yet." })).toBeVisible();

      const summary = page.locator('[aria-label="Commitment summary"]');
      await expect(summary).toBeVisible();
      await expect(summary.locator(":scope > div")).toHaveCount(5);
      for (const label of [
        "Active commitments",
        "Active mechanisms",
        "Action needed",
        "Activated this month",
        "Verified to date",
      ]) {
        await expect(summary.getByText(label, { exact: true })).toBeVisible();
      }

      await expect(page.getByText("If everything succeeds", { exact: true })).toBeVisible();
      await expect(page.getByText("Projected if all conditions are met.", { exact: true })).toBeVisible();
      await expect(page.getByText("Additional details", { exact: true })).toBeVisible();
      await expect(page.getByText("Connected record types", { exact: true })).toBeVisible();
      await expect(page.getByText("Some connected record types could not be loaded")).toHaveCount(0);
      await expectNoHorizontalOverflow(page);
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
      await expectNoHorizontalOverflow(page);
      expect(errors).toEqual([]);
    });

    test("loading boundary streams before delayed verification and resolves afterward", async ({ page, request, context }, testInfo) => {
      const errors: string[] = [];
      page.on("pageerror", (error) => errors.push(error.message));
      await session(request, context, "delayed");
      const gate = await request.post(`${fixtureURL}/__fixture/verification-gate`, { headers: fixtureHeaders });
      expect(gate.ok()).toBeTruthy();
      await page.goto("/commitments", { waitUntil: "commit" });
      await expect(page.getByRole("heading", { name: "Commitments", exact: true })).toBeVisible();
      await expect(page.getByRole("status").filter({ hasText: "Loading your commitments" })).toBeVisible();
      await expect(page.locator('[aria-label="Commitment summary"]')).toHaveCount(0);
      await expect(page.getByText("Auth Resolution QA", { exact: false })).toHaveCount(0);
      await expectNoHorizontalOverflow(page);
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
      await expectNoHorizontalOverflow(page);
      expect(errors).toEqual([]);
    });
  });
}
