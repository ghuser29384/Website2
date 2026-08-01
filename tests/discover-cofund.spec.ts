import { mkdir } from "node:fs/promises";

import { expect, test, type Page } from "@playwright/test";

function monitorBrowserFailures(page: Page) {
  const consoleErrors: string[] = [];
  const pageErrors: string[] = [];
  const failedRequests: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  page.on("pageerror", (error) => pageErrors.push(error.message));
  page.on("requestfailed", (request) => {
    failedRequests.push(
      `${request.method()} ${request.url()}: ${request.failure()?.errorText ?? "failed"}`,
    );
  });
  return { consoleErrors, pageErrors, failedRequests };
}

async function waitForDiscover(page: Page) {
  await expect(page.locator("body")).not.toContainText("Loading Discover…");
  await expect
    .poll(() =>
      page.evaluate(() =>
        Boolean(
          (window as Window & { __moralTradeSmartQueryLoaded?: boolean })
            .__moralTradeSmartQueryLoaded,
        ),
      ),
    )
    .toBe(true);
}

async function openCoFunds(page: Page) {
  await page.goto("/discover?domain=offers&view=list&offerKind=co-fund", {
    waitUntil: "networkidle",
  });
  await waitForDiscover(page);
  await expect(page.locator('.offer-transaction-row[data-offer-kind="co-fund"]')).toHaveCount(2);
}

test("Discover treats Co-Funds as a first-class Offer subtype with one canonical listing", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1600, height: 1000 });
  const failures = monitorBrowserFailures(page);
  await openCoFunds(page);

  const subtypeSwitcher = page.getByRole("group", { name: "Offer listing type" }).first();
  await expect(subtypeSwitcher.getByRole("button", { name: "Co-Funds" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await expect(subtypeSwitcher.getByRole("button", { name: "All offers" })).toBeVisible();
  await expect(subtypeSwitcher.getByRole("button", { name: "Individual offers" })).toBeVisible();

  const bioSalary = page.locator('[data-row-id="cofund-bio-salary"]');
  await expect(bioSalary).toBeVisible();
  await expect(bioSalary.locator(".cofund-badge")).toHaveText("Co-Fund");
  await expect(bioSalary.locator('[data-exchange-side="offer"]')).toContainText(
    "You + contributors provide",
  );
  await expect(bioSalary.locator('[data-exchange-side="return"]')).toContainText(
    "Counterparty provides",
  );
  await expect(bioSalary.locator('[data-exchange-side="return"]')).toContainText(
    "Verified biosecurity candidate",
  );
  await expect(bioSalary.locator("[data-cofund-progress]")).toHaveAttribute(
    "data-threshold",
    "25000",
  );
  await expect(bioSalary.locator("[data-cofund-progress]")).toHaveAttribute(
    "data-funded",
    "23640",
  );
  await expect(bioSalary.locator("[data-cofund-progress]")).toHaveAttribute(
    "data-contributors",
    "54",
  );
  await expect(bioSalary.locator("[data-cofund-progress]")).toHaveAttribute(
    "data-minimum-contribution",
    "10",
  );
  await expect(bioSalary).toContainText("$1,360 remains");
  await expect(bioSalary).toContainText("Funding closes Jul 22");
  await expect(bioSalary.getByRole("button", { name: "Join Co-Fund" })).toBeVisible();
  await expect(bioSalary.getByRole("button", { name: "Terms", exact: true })).toBeVisible();
  await expect(bioSalary.getByRole("button", { name: "Funding terms" })).toHaveCount(0);
  await expect(bioSalary.getByRole("button", { name: "Counteroffer" })).toHaveCount(0);

  await mkdir("test-results", { recursive: true });
  await page.screenshot({
    path: "test-results/discover-cofund-desktop.png",
    fullPage: true,
  });

  await bioSalary.getByRole("button", { name: "Join Co-Fund" }).click();
  const inspector = page.locator(".inspector").filter({ hasText: "Co-Fund a verified biosecurity salary gap" });
  await expect(inspector).toBeVisible();
  await expect(inspector).toContainText("The reciprocal trade");
  await expect(inspector).toContainText("Threshold and release conditions");
  await expect(inspector).toContainText("If the threshold is missed");
  await expect(inspector).toContainText("No contributor is charged");
  await expect(inspector).toContainText("does not charge or create a payment authorization");
  await expect(inspector.getByRole("button", { name: /Join Co-Fund with \$10/ })).toBeVisible();

  expect(failures.consoleErrors).toEqual([]);
  expect(failures.pageErrors).toEqual([]);
  expect(failures.failedRequests).toEqual([]);
});

test("the Offer subtype switcher includes Co-Funds by default and isolates each subtype", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1600, height: 1000 });
  await page.goto("/discover?domain=offers&view=list", { waitUntil: "networkidle" });
  await waitForDiscover(page);

  const switcher = page.getByRole("group", { name: "Offer listing type" }).first();
  await expect(switcher.getByRole("button", { name: "All offers" })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await expect(page.locator('.offer-transaction-row[data-offer-kind="co-fund"]')).toHaveCount(2);
  expect(await page.locator('.offer-transaction-row[data-offer-kind="individual"]').count()).toBeGreaterThan(0);

  await switcher.getByRole("button", { name: "Individual offers" }).click();
  await expect(page).toHaveURL(/offerKind=individual/);
  await expect(page.locator('.offer-transaction-row[data-offer-kind="co-fund"]')).toHaveCount(0);
  expect(await page.locator('.offer-transaction-row[data-offer-kind="individual"]').count()).toBeGreaterThan(0);

  await switcher.getByRole("button", { name: "Co-Funds" }).click();
  await expect(page).toHaveURL(/offerKind=co-fund/);
  await expect(page.locator('.offer-transaction-row[data-offer-kind="co-fund"]')).toHaveCount(2);
  await expect(page.locator('.offer-transaction-row[data-offer-kind="individual"]')).toHaveCount(0);

  const domainTabs = page.locator('[role="tablist"][aria-label="Discover domain"]').first();
  await expect(domainTabs.getByRole("tab")).toHaveCount(3);
  await expect(domainTabs.getByRole("tab", { name: "Offers" })).toBeVisible();
  await expect(domainTabs.getByRole("tab", { name: "Pools" })).toBeVisible();
  await expect(domainTabs.getByRole("tab", { name: "People" })).toBeVisible();
  await expect(domainTabs.getByRole("tab", { name: "Co-Funds" })).toHaveCount(0);
});

test("legacy saved Pool state migrates to the canonical Co-Fund without resetting preferences", async ({
  page,
}) => {
  await page.addInitScript(() => {
    window.localStorage.setItem(
      "moral-trade-discover-preferences-v3",
      JSON.stringify({
        bookmarked: ["pool-bio-salary"],
        pledgeAmounts: { "pool-bio-salary": 50 },
      }),
    );
  });

  await openCoFunds(page);
  const bioSalary = page.locator('[data-row-id="cofund-bio-salary"]');
  await expect(
    bioSalary.getByRole("button", { name: "Remove saved opportunity" }),
  ).toBeVisible();

  await bioSalary.getByRole("button", { name: "Join Co-Fund" }).click();
  await expect(page.locator('[data-pledge-range][data-pool-id="cofund-bio-salary"]')).toHaveValue(
    "50",
  );
});

test("standalone Pools exclude reciprocal Co-Funds and legacy Pool links migrate", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1600, height: 1000 });
  const failures = monitorBrowserFailures(page);

  await page.goto("/discover?domain=pools&view=list", { waitUntil: "networkidle" });
  await waitForDiscover(page);
  await expect(page.getByRole("heading", { name: "Standalone threshold pools" })).toBeVisible();
  await expect(page.locator('.transaction-row[data-row-id^="pool-"]')).toHaveCount(3);
  await expect(page.locator('[data-row-id="pool-bio-salary"]')).toHaveCount(0);
  await expect(page.locator('[data-row-id="pool-factory-transition"]')).toHaveCount(0);
  await expect(page.locator("body")).not.toContainText("Verified biosecurity salary-gap pool");
  await expect(page.locator("body")).not.toContainText(
    "Factory-farming supplier transition assurance pool",
  );

  await page.goto(
    "/discover?domain=pools&view=threshold&selected=pool-bio-salary&selectedType=pool",
    { waitUntil: "networkidle" },
  );
  await waitForDiscover(page);
  await expect(page).toHaveURL(/domain=offers/);
  await expect(page).toHaveURL(/view=list/);
  await expect(page).toHaveURL(/offerKind=co-fund/);
  await expect(page).toHaveURL(/selected=cofund-bio-salary/);
  await expect(page.locator(".inspector")).toContainText(
    "Co-Fund a verified biosecurity salary gap",
  );

  expect(failures.consoleErrors).toEqual([]);
  expect(failures.pageErrors).toEqual([]);
  expect(failures.failedRequests).toEqual([]);
});

test("Co-Funds remain scan-efficient and overflow-free on mobile", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const failures = monitorBrowserFailures(page);
  await openCoFunds(page);

  const switcher = page.getByRole("group", { name: "Offer listing type" }).first();
  await expect(switcher.getByRole("button", { name: "Co-Funds" })).toBeVisible();
  const row = page.locator('[data-row-id="cofund-bio-salary"]');
  const offerSide = row.locator('[data-exchange-side="offer"]');
  const returnSide = row.locator('[data-exchange-side="return"]');
  await expect(offerSide).toBeVisible();
  await expect(returnSide).toBeVisible();

  const [offerBox, returnBox] = await Promise.all([offerSide.boundingBox(), returnSide.boundingBox()]);
  expect(offerBox).not.toBeNull();
  expect(returnBox).not.toBeNull();
  expect(returnBox!.y).toBeGreaterThanOrEqual(offerBox!.y + offerBox!.height - 1);

  const overflow = await page.evaluate(() => ({
    documentWidth: document.documentElement.scrollWidth,
    bodyWidth: document.body.scrollWidth,
    viewportWidth: window.innerWidth,
  }));
  expect(overflow.documentWidth).toBeLessThanOrEqual(overflow.viewportWidth + 1);
  expect(overflow.bodyWidth).toBeLessThanOrEqual(overflow.viewportWidth + 1);

  await mkdir("test-results", { recursive: true });
  await page.screenshot({
    path: "test-results/discover-cofund-390x844.png",
    fullPage: true,
  });

  expect(failures.consoleErrors).toEqual([]);
  expect(failures.pageErrors).toEqual([]);
  expect(failures.failedRequests).toEqual([]);
});

test("natural-language group-buying searches route to Offers → Co-Funds", async ({ page }) => {
  await page.route("**/api/discover/search", async (route) => {
    const request = route.request().postDataJSON() as { query: string };
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        ok: true,
        checkedAt: "2026-07-31T16:30:00.000Z",
        query: request.query,
        normalizedQuery: request.query,
        domain: "offers",
        offerKind: "co-fund",
        sort: "best-fit",
        requiresSharedInterpretation: false,
        clarification: null,
        constraints: [
          { key: "domain", label: "Domain: Offers", source: "query" },
          { key: "offer-kind", label: "Offer type: Co-Fund", source: "query" },
        ],
        counts: { offers: 1, pools: 0, people: 0 },
        total: 1,
        truncated: false,
        sourceStatus: { offers: "live", pools: "unavailable", people: "live" },
        items: [
          {
            kind: "offer",
            offerKind: "co-fund",
            id: "live-cofund-1",
            title: "Co-Fund a verified biosecurity salary guarantee",
            cause: "Biosecurity",
            status: "Open for contributors",
            youOffer: ["Contribute from $25", "No charge if the threshold is missed"],
            youGet: ["Fund one verified salary-guarantee trade"],
            offerFlexibility: "Threshold terms",
            returnFlexibility: "Fixed",
            providerName: "Biosecurity project",
            providerRole: "Co-Fund counterparty",
            evidenceLabel: "Reviewed milestone plan",
            completionLabel: "Funding closes 2026-08-20",
            href: "/moral-goods-group-buying?pool=live-cofund-1",
            exactMatchLabel: "Join Co-Fund",
            counteroffersAllowed: false,
            createdAt: "2026-07-31T16:00:00.000Z",
            score: 100,
          },
        ],
      }),
    });
  });

  await page.goto("/discover", { waitUntil: "networkidle" });
  await waitForDiscover(page);
  const form = page.locator("#command-form");
  await form.locator("#command-input").fill("group buying a moral trade");
  await form.getByRole("button", { name: "Search" }).click();

  await expect(page).toHaveURL(/domain=offers/);
  await expect(page).toHaveURL(/offerKind=co-fund/);
  await expect(page).toHaveURL(/view=list/);
  const row = page.locator('.offer-transaction-row[data-offer-kind="co-fund"]');
  await expect(row).toHaveCount(1);
  await expect(row).toContainText("Co-Fund a verified biosecurity salary guarantee");
  await expect(row.getByRole("link", { name: /Join Co-Fund/ })).toBeVisible();
  await expect(row.getByRole("link", { name: "Counteroffer" })).toHaveCount(0);
  expect(await page.evaluate(() => performance.getEntriesByType("navigation").length)).toBe(1);
});


test("dominant-assurance searches route to standalone Pools even without a server routing hint", async ({
  page,
}) => {
  await page.route("**/api/discover/search", async (route) => {
    const request = route.request().postDataJSON() as { query: string };
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        ok: true,
        checkedAt: "2026-07-31T16:30:00.000Z",
        query: request.query,
        normalizedQuery: request.query,
        domain: "pools",
        offerKind: "all",
        sort: "best-fit",
        requiresSharedInterpretation: false,
        clarification: null,
        constraints: [{ key: "domain", label: "Domain: Pools", source: "query" }],
        counts: { offers: 0, pools: 1, people: 0 },
        total: 1,
        truncated: false,
        sourceStatus: { offers: "live", pools: "live", people: "live" },
        items: [
          {
            kind: "pool",
            id: "standalone-pool-1",
            title: "Wild-animal welfare dominant-assurance pool",
            cause: "Wild animal suffering",
            status: "Near threshold",
            youOffer: ["Make a conditional pledge from $10"],
            youGet: ["Fund one standalone research tranche"],
            providerName: "Wild Animal Initiative",
            evidenceLabel: "Reviewed milestone plan",
            completionLabel: "Deadline 2026-08-15",
            href: "/pools/standalone-pool-1",
            targetFundingCents: 100000,
            score: 100,
          },
        ],
      }),
    });
  });

  await page.goto("/discover", { waitUntil: "networkidle" });
  await waitForDiscover(page);
  const form = page.locator("#command-form");
  await form.locator("#command-input").fill("dominant assurance contracts");
  await form.getByRole("button", { name: "Search" }).click();

  await expect(page).toHaveURL(/domain=pools/);
  await expect(page).toHaveURL(/view=list/);
  expect(page.url()).not.toContain("offerKind=co-fund");
  await expect(page.getByRole("heading", { name: "Standalone threshold pools" })).toBeVisible();
  await expect(page.locator(".transaction-list")).toContainText(
    "Wild-animal welfare dominant-assurance pool",
  );
  await expect(page.locator('.offer-transaction-row[data-offer-kind="co-fund"]')).toHaveCount(0);
  expect(await page.evaluate(() => performance.getEntriesByType("navigation").length)).toBe(1);
});
