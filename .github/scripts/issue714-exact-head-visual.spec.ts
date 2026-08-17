import { expect, test, type Page, type TestInfo } from "@playwright/test";

const privateKeys = [
  "source",
  "cause_area",
  "walkthrough_cause",
  "offer_type",
  "match_name",
  "match_get",
  "match_give",
  "participant_kind",
  "primary_goal",
  "first_action",
];

const readyPayload = {
  authenticated: true,
  generatedAt: "2026-08-17T00:00:00.000Z",
  matchingOpportunityCount: 1,
  ownedOpportunities: [],
  ownedOpportunityCount: 0,
  profile: { causes: ["Global health"], weightedCauses: [], learningEnabled: false },
  recentChanges: [],
  recommendations: [
    {
      id: "synthetic-review-opportunity",
      opportunityType: "offer",
      href: "/offers/1c6b0e57-bfed-3f29-c51f-6f8c23d1960b",
      ctaLabel: "Review proposal",
      ownerAlias: "Synthetic participant",
      offeredCause: "Global health",
      requestedCause: "Climate action",
      offerAction: "Fund a reviewed health project.",
      requestAction: "Replace one short car trip.",
      verification: "Review the stated receipt terms.",
      duration: "One month",
      reason: "Matches a saved priority",
      reasonDetails: ["Matches Global health"],
    },
  ],
  routePlanner: {
    status: "ready",
    checkedAt: "2026-08-17T00:00:00.000Z",
    profile: {},
    needsMoreInput: [],
    routes: [],
    comparison: null,
    candidateCount: 1,
  },
  status: "ready",
};

function monitor(page: Page) {
  const consoleErrors: string[] = [];
  const pageErrors: string[] = [];
  const failedRequests: string[] = [];
  const serverErrors: string[] = [];

  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  page.on("pageerror", (error) => pageErrors.push(error.message));
  page.on("requestfailed", (request) => {
    const reason = request.failure()?.errorText ?? "unknown";
    if (!/ERR_ABORTED|NS_BINDING_ABORTED|cancelled/i.test(reason)) {
      failedRequests.push(`${request.method()} ${new URL(request.url()).pathname}: ${reason}`);
    }
  });
  page.on("response", (response) => {
    if (response.status() >= 500) {
      serverErrors.push(`${response.status()} ${new URL(response.url()).pathname}`);
    }
  });

  return async () => {
    expect(consoleErrors, "console errors").toEqual([]);
    expect(pageErrors, "page errors").toEqual([]);
    expect(failedRequests, "unexpected failed requests").toEqual([]);
    expect(serverErrors, "HTTP 5xx responses").toEqual([]);
  };
}

async function expectNoOverflow(page: Page) {
  const geometry = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }));
  expect(geometry.scrollWidth).toBeLessThanOrEqual(geometry.clientWidth + 1);
}

async function expectNoPrivateData(value: string) {
  for (const key of privateKeys) expect(value).not.toContain(`${key}=`);
  expect(value).not.toContain("synthetic-private-sentinel");
}

async function screenshot(page: Page, testInfo: TestInfo, label: string) {
  await page.screenshot({
    animations: "disabled",
    fullPage: true,
    path: testInfo.outputPath(`${label}.png`),
  });
}

for (const viewport of [
  { name: "desktop-1440x1000", width: 1440, height: 1000 },
  { name: "tablet-1024x768", width: 1024, height: 768 },
  { name: "mobile-390x844", width: 390, height: 844 },
]) {
  test.describe(viewport.name, () => {
    test.use({ viewport: { width: viewport.width, height: viewport.height } });

    test("signed-out root reaches Discover and Walkthrough remains voluntarily accessible", async ({ context, page }, testInfo) => {
      const assertCleanRuntime = monitor(page);
      await context.clearCookies();
      await page.goto("/", { waitUntil: "domcontentloaded" });
      await expect.poll(() => new URL(page.url()).pathname).toBe("/discover");
      await expectNoOverflow(page);

      await page.goto("/walkthrough", { waitUntil: "domcontentloaded" });
      await expect(page.locator('[data-walkthrough-ready="true"]')).toBeVisible({ timeout: 20_000 });
      await expect(page.getByRole("heading", { name: "What do you value?" })).toBeVisible();
      await page.keyboard.press("Tab");
      const focus = await page.evaluate(() => {
        const element = document.activeElement as HTMLElement | null;
        if (!element || element === document.body) return null;
        const box = element.getBoundingClientRect();
        return {
          tag: element.tagName,
          width: box.width,
          height: box.height,
          visible: box.bottom > 0 && box.right > 0 && box.top < innerHeight && box.left < innerWidth,
        };
      });
      expect(focus).not.toBeNull();
      expect(focus?.visible).toBe(true);
      expect(focus?.width).toBeGreaterThan(0);
      expect(focus?.height).toBeGreaterThan(0);
      await expectNoOverflow(page);
      await screenshot(page, testInfo, `${viewport.name}-walkthrough`);
      await assertCleanRuntime();
    });

    test("Feed owns the truthful ready recommendation workspace", async ({ page }, testInfo) => {
      const assertCleanRuntime = monitor(page);
      await page.route("**/api/live-now", async (route) => {
        await route.fulfill({ contentType: "application/json", body: JSON.stringify(readyPayload) });
      });
      await page.goto("/feed", { waitUntil: "domcontentloaded" });
      await expect(page).toHaveURL(/\/feed$/);
      await expect(page.locator('[data-mt-live-now-state="ready"]')).toBeVisible({ timeout: 30_000 });
      await expect(page.locator("#mt-live-document-heading")).toHaveText(
        "Current opportunities and next actions",
      );
      await expect(page.getByRole("note", { name: "Recommendation status" })).toHaveText(
        "Recommendations to review — not agreements, commitments, payments, or verified outcomes.",
      );
      await expectNoOverflow(page);
      await screenshot(page, testInfo, `${viewport.name}-feed-review-boundary`);
      await assertCleanRuntime();
    });

    test("account-state-unavailable is truthful, private, noindex, and bounded", async ({ page }, testInfo) => {
      const assertCleanRuntime = monitor(page);
      const response = await page.goto("/account-state-unavailable", { waitUntil: "domcontentloaded" });
      expect(response).not.toBeNull();
      const cacheControl = response?.headers()["cache-control"] ?? "";
      expect(cacheControl).toMatch(/private/i);
      expect(cacheControl).toMatch(/no-store/i);
      await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/i);
      const retry = page.getByRole("link", { name: "Retry account check" });
      const discover = page.getByRole("link", { name: "Browse Discover" });
      await expect(retry).toBeVisible();
      await expect(retry).toHaveAttribute("href", "/");
      await expect(discover).toBeVisible();
      await expect(discover).toHaveAttribute("href", "/discover");
      const actionPaths = await page.locator("main a[href]").evaluateAll((elements) =>
        elements.map((element) => new URL((element as HTMLAnchorElement).href).pathname),
      );
      expect(new Set(actionPaths)).toEqual(new Set(["/", "/discover"]));
      await expectNoOverflow(page);
      await screenshot(page, testInfo, `${viewport.name}-account-state-unavailable`);
      await assertCleanRuntime();
    });

    test("legacy private query fields are normalized before later navigation or referrer use", async ({ page }) => {
      const assertCleanRuntime = monitor(page);
      const mainNavigations: string[] = [];
      page.on("request", (request) => {
        if (request.isNavigationRequest() && request.frame() === page.mainFrame()) {
          mainNavigations.push(request.url());
        }
      });
      const legacyPath =
        "/complete-profile?source=walkthrough&cause_area=synthetic-private-sentinel-a" +
        "&walkthrough_cause=synthetic-private-sentinel-b&offer_type=Money" +
        "&match_name=synthetic-private-sentinel-c&match_get=synthetic-private-sentinel-d" +
        "&match_give=synthetic-private-sentinel-e";
      await page.goto(legacyPath, { waitUntil: "domcontentloaded" });
      await expect.poll(() => new URL(page.url()).pathname).toBe("/walkthrough");
      expect(mainNavigations.length).toBeGreaterThanOrEqual(2);
      for (const navigation of mainNavigations.slice(1)) await expectNoPrivateData(navigation);
      await expectNoPrivateData(page.url());
      await expectNoPrivateData(await page.evaluate(() => document.referrer));
      const links = await page.locator("a[href]").evaluateAll((elements) =>
        elements.map((element) => (element as HTMLAnchorElement).href),
      );
      for (const link of links) await expectNoPrivateData(link);
      await assertCleanRuntime();
    });
  });
}
