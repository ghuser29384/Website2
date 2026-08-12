import { mkdir } from "node:fs/promises";

import { expect, test, type Page } from "@playwright/test";

async function waitForDiscoverReady(page: Page) {
  await expect(page.locator("body")).not.toContainText("Loading Discover…");
  await expect
    .poll(() =>
      page.evaluate(() =>
        Boolean(
          (window as Window & { __moralTradeDiscoverSearchLoaded?: boolean })
            .__moralTradeDiscoverSearchLoaded,
        ),
      ),
    )
    .toBe(true);
}

async function openDiscoverList(page: Page) {
  await page.goto("/discover?domain=offers&view=list", { waitUntil: "domcontentloaded" });
  await waitForDiscoverReady(page);
  await expect(page.locator(".offer-transaction-row").first()).toBeVisible();
}

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

test("Discover shows the complete two-sided exchange at a glance on desktop", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  const failures = monitorBrowserFailures(page);
  await openDiscoverList(page);

  const rows = page.locator(".offer-transaction-row");
  expect(await rows.count()).toBeGreaterThan(0);
  const row = rows.first();
  const offerSide = row.locator('[data-exchange-side="offer"]');
  const returnSide = row.locator('[data-exchange-side="return"]');

  await expect(offerSide).toContainText("You offer");
  await expect(returnSide).toContainText("You get");
  await expect(offerSide.locator(".exchange-obligations li").first()).not.toBeEmpty();
  await expect(returnSide.locator(".exchange-obligations li").first()).not.toBeEmpty();
  await expect(returnSide.locator(".exchange-provider")).toContainText("Provided by");
  await expect(offerSide.locator(".exchange-flexibility")).toBeVisible();
  await expect(returnSide.locator(".exchange-flexibility")).toBeVisible();

  await expect(row.locator(".requester-cell, .mechanism-cell, .deadline-cell")).toHaveCount(0);
  await expect(row.getByRole("button", { name: /Request exact match|Accept & match/ })).toBeVisible();
  await expect(row.getByRole("button", { name: "Counteroffer" })).toBeVisible();
  await expect(row.getByRole("button", { name: /Full terms/ })).toBeVisible();

  const hierarchy = await row.evaluate((element) => {
    const primary = element.querySelector<HTMLElement>(".exchange-obligations li:first-child");
    const secondary = element.querySelector<HTMLElement>(".offer-context-title");
    if (!primary || !secondary) throw new Error("Missing exchange hierarchy elements");
    return {
      primary: Number.parseFloat(getComputedStyle(primary).fontSize),
      secondary: Number.parseFloat(getComputedStyle(secondary).fontSize),
    };
  });
  expect(hierarchy.primary).toBeGreaterThan(hierarchy.secondary);

  await mkdir("test-results", { recursive: true });
  await page.screenshot({
    path: "test-results/discover-two-sided-desktop.png",
    fullPage: true,
  });

  await row.getByRole("button", { name: /Request exact match|Accept & match/ }).click();
  await expect(page.locator(".response-intent-note")).toContainText("Exact terms selected");
  await expect(page.locator(".response-intent-note")).toContainText(
    "must approve before an agreement forms",
  );

  await page.goBack();
  await expect(page.locator(".response-intent-note")).toHaveCount(0);
  const refreshedRow = page.locator(".offer-transaction-row").first();
  await refreshedRow.getByRole("button", { name: "Counteroffer" }).click();
  await expect(page.locator(".response-intent-note")).toContainText("Counteroffer selected");
  await expect(page.locator(".response-intent-note")).toContainText("changes to either side");

  await page.goBack();
  const rowControl = page.locator(".offer-row-content").first();
  await rowControl.focus();
  await rowControl.press("Enter");
  await expect(page.locator(".inspector")).toContainText("The exchange");
  await expect(page.locator(".response-intent-note")).toHaveCount(0);

  expect(failures.consoleErrors).toEqual([]);
  expect(failures.pageErrors).toEqual([]);
  expect(failures.failedRequests).toEqual([]);
});

for (const viewport of [
  { width: 390, height: 844 },
  { width: 320, height: 568 },
]) {
  test(`Discover stacks both exchange sides without horizontal overflow at ${viewport.width}×${viewport.height}`, async ({
    page,
  }) => {
    await page.setViewportSize(viewport);
    const failures = monitorBrowserFailures(page);
    await openDiscoverList(page);

    const row = page.locator(".offer-transaction-row").first();
    const offerSide = row.locator('[data-exchange-side="offer"]');
    const returnSide = row.locator('[data-exchange-side="return"]');
    await expect(offerSide).toContainText("You offer");
    await expect(returnSide).toContainText("You get");

    const [offerBox, returnBox] = await Promise.all([
      offerSide.boundingBox(),
      returnSide.boundingBox(),
    ]);
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
      path: `test-results/discover-two-sided-${viewport.width}x${viewport.height}.png`,
      fullPage: true,
    });

    expect(failures.consoleErrors).toEqual([]);
    expect(failures.pageErrors).toEqual([]);
    expect(failures.failedRequests).toEqual([]);
  });
}

test("Discover filters and indexes the two exchange sides separately", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await openDiscoverList(page);

  const filters = page.locator('[data-details="filters"]');
  await filters.locator("summary").click();
  await filters.locator('[data-filter="return-type"][value="payment"]').check();
  await expect(filters).toHaveAttribute("open", "");

  let rows = page.locator(".offer-transaction-row");
  await expect(rows).toHaveCount(3);
  const monetaryReturns = await rows
    .locator('[data-exchange-side="return"] .exchange-obligations li:first-child')
    .allTextContents();
  for (const value of monetaryReturns) expect(value).toMatch(/paid to you|stipend/i);

  await filters.locator('[data-filter="min-return"]').evaluate((element) => {
    const input = element as HTMLInputElement;
    input.value = "100";
    input.dispatchEvent(new Event("input", { bubbles: true }));
  });
  await expect(rows).toHaveCount(1);
  await expect(
    rows.locator('[data-exchange-side="return"] .exchange-obligations li:first-child'),
  ).toContainText("$180");
  await expect(filters).toHaveAttribute("open", "");

  await page.goto(
    "/discover?domain=offers&view=list&recipient=You&evidence=audit",
    { waitUntil: "domcontentloaded" },
  );
  await waitForDiscoverReady(page);
  rows = page.locator(".offer-transaction-row");
  await expect(rows).toHaveCount(2);
  const resultIds = await rows.evaluateAll((elements) =>
    elements.map((element) => element.getAttribute("data-row-id")),
  );
  expect(resultIds.sort()).toEqual(["offer-civic-audit", "offer-global-audit"]);

  await page.goto(
    "/discover?domain=offers&view=list&offerType=skill&returnType=credit&minReturn=50",
    { waitUntil: "domcontentloaded" },
  );
  await waitForDiscoverReady(page);
  rows = page.locator(".offer-transaction-row");
  await expect(rows).toHaveCount(2);
  for (const side of await rows.locator('[data-exchange-side="offer"]').allTextContents()) {
    expect(side).toMatch(/review/i);
  }
  for (const side of await rows.locator('[data-exchange-side="return"]').allTextContents()) {
    expect(side).toMatch(/credit/i);
  }
});

test("Discover sends natural-language queries through the shared interpreter", async ({ page }) => {
  const requests: Array<Record<string, unknown>> = [];

  await page.route("**/api/query/interpret", async (route) => {
    const body = route.request().postDataJSON() as Record<string, unknown>;
    requests.push(body);
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        interpretation: {
          originalQuery: body.query,
          normalizedQuery: "verified animal welfare work for $50",
          parsedConstraintCount: 2,
          confidence: 0.72,
          reasonCodes: ["ambiguous_amount"],
          needsClarification: true,
          clarification: {
            field: "amount",
            question: "Should $50 be a maximum, a minimum, or an exact amount?",
            options: ["Maximum", "Minimum", "Exact"],
          },
        },
        target: "/discover?q=verified%20animal%20welfare%20work%20for%20%2450",
        usedLlm: false,
      }),
    });
  });

  await page.goto("/discover", { waitUntil: "domcontentloaded" });
  await waitForDiscoverReady(page);

  const form = page.locator("#command-form");
  await expect(form).toBeVisible();
  const queryInput = form.locator('input[name="q"], input[name="command"], #command-input');
  await expect(queryInput).toBeVisible();
  await queryInput.fill("Verified animal welfare work for $50");
  await form.locator('button[type="submit"]').click();

  const clarification = page.getByTestId("discover-live-search-state");
  await expect(clarification).toContainText("One detail changes the results.");
  await expect(clarification).toContainText("Should $50 be a maximum, a minimum, or an exact amount?");
  await expect(clarification.getByRole("button", { name: "Maximum" })).toBeVisible();
  await expect.poll(() => requests.length).toBe(1);
  expect(requests[0]).toMatchObject({
    query: "Verified animal welfare work for $50",
    surface: "discover",
  });
});
