import { mkdir } from "node:fs/promises";

import { expect, test, type Page, type Route } from "@playwright/test";

interface SearchRequest {
  query: string;
  normalizedQuery?: string;
  domain?: "offers" | "pools" | "people";
  excludedConstraints?: string[];
}

function liveOffer(id: string, cause: string, title = "Wild-animal welfare exchange") {
  return {
    kind: "offer",
    offerKind: "individual",
    id,
    title,
    cause,
    status: "Manual review required",
    youOffer: ["Donate $10 to Wild Animal Initiative", "Complete within 30 days"],
    youGet: ["Read one paper and provide a one-page summary"],
    offerFlexibility: "Fixed",
    returnFlexibility: "Fixed",
    providerName: "Ellen",
    providerRole: "Offer maker",
    evidenceLabel: "Receipt or public link",
    completionLabel: "Complete within 30 days",
    href: `/offers/${id}`,
    exactMatchLabel: "Request exact match",
    counteroffersAllowed: true,
    createdAt: "2026-07-31T08:00:00.000Z",
    score: 100,
  };
}

function livePool(id = "pool-1") {
  return {
    kind: "pool",
    id,
    title: "Wild-animal welfare research pool",
    cause: "Wild animal suffering",
    status: "Near threshold",
    youOffer: ["Make a conditional pledge from $5", "No charge if the threshold is missed"],
    youGet: ["Fund one research tranche", "Research begins after activation"],
    providerName: "Wild Animal Initiative",
    evidenceLabel: "Reviewed milestone plan",
    completionLabel: "Deadline 2026-08-15",
    href: `/pools/${id}`,
    targetFundingCents: 100_000,
    score: 100,
  };
}

function searchResponse({
  query,
  domain = "offers",
  items = [liveOffer("wild-1", "Wild animal suffering")],
  counts = { offers: 1, pools: 1, people: 0 },
}: {
  query: string;
  domain?: "offers" | "pools" | "people";
  items?: unknown[];
  counts?: { offers: number; pools: number; people: number };
}) {
  return {
    ok: true,
    checkedAt: "2026-07-31T09:30:00.000Z",
    query,
    normalizedQuery: query,
    domain,
    offerKind: "all",
    sort: "best-fit",
    requiresSharedInterpretation: false,
    clarification: null,
    constraints: [
      { key: "domain", label: `Domain: ${domain[0].toUpperCase()}${domain.slice(1)}`, source: "query" },
      { key: "cause:wild-animal-suffering", label: "Cause: Wild animal suffering", source: "query" },
    ],
    counts,
    total: items.length,
    items,
    truncated: false,
    sourceStatus: { offers: "live", pools: "live", people: "live" },
  };
}

async function openDiscover(page: Page) {
  await page.goto("/discover?domain=offers&view=list", { waitUntil: "networkidle" });
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
  await expect(page.locator("#command-form")).toBeVisible();
  await expect(page.locator('#command-form button[type="submit"]')).toHaveText("Search");
}

async function fulfillJson(route: Route, body: unknown, status = 200) {
  await route.fulfill({ status, contentType: "application/json", body: JSON.stringify(body) });
}

test("clear cause search updates live results in place without document navigation", async ({ page }) => {
  const searchRequests: SearchRequest[] = [];
  let interpreterCalls = 0;
  await page.route("**/api/query/interpret", async (route) => {
    interpreterCalls += 1;
    await route.abort();
  });
  await page.route("**/api/discover/search", async (route) => {
    const body = route.request().postDataJSON() as SearchRequest;
    searchRequests.push(body);
    await fulfillJson(route, searchResponse({ query: body.query }));
  });

  await openDiscover(page);
  await page.evaluate(() => {
    (window as Window & { __discoverDocumentSentinel?: object }).__discoverDocumentSentinel = {};
  });
  const input = page.locator("#command-input");
  await input.fill("Wild animal suffering");
  await page.getByRole("button", { name: "Search", exact: true }).click();

  await expect(page.locator('.transaction-list [data-live-record="true"]')).toHaveCount(1);
  await expect(page.locator('[data-exchange-side="offer"]')).toContainText("Donate $10");
  await expect(page.locator('[data-exchange-side="return"]')).toContainText("Read one paper");
  await expect(page.locator(".result-count")).toContainText("1 matching offer");
  await expect(page.locator(".match-reason")).toHaveCount(0);
  await expect(page.getByTestId("discover-live-search-state")).toContainText(
    "Cause: Wild animal suffering",
  );
  expect(new URL(page.url()).searchParams.get("q")).toBe("Wild animal suffering");
  expect(await page.evaluate(() => Boolean((window as Window & { __discoverDocumentSentinel?: object }).__discoverDocumentSentinel))).toBe(true);
  expect(interpreterCalls).toBe(0);
  expect(searchRequests).toHaveLength(1);
  await mkdir("test-results", { recursive: true });
  await page.screenshot({ path: "test-results/discover-live-search-desktop.png", fullPage: true });
});

test("Enter and Search use the same in-place submission path", async ({ page }) => {
  const queries: string[] = [];
  await page.route("**/api/discover/search", async (route) => {
    const body = route.request().postDataJSON() as SearchRequest;
    queries.push(body.query);
    await fulfillJson(route, searchResponse({ query: body.query }));
  });
  await openDiscover(page);
  const input = page.locator("#command-input");
  await input.fill("Wild animal suffering");
  await input.press("Enter");
  await expect(page.locator('.transaction-list [data-live-record="true"]')).toHaveCount(1);
  expect(queries).toEqual(["Wild animal suffering"]);
});

test("a newer query cannot be overwritten by a slower stale response", async ({ page }) => {
  await page.route("**/api/discover/search", async (route) => {
    const body = route.request().postDataJSON() as SearchRequest;
    if (body.query === "first query") {
      await new Promise((resolve) => setTimeout(resolve, 700));
      await fulfillJson(route, searchResponse({
        query: body.query,
        items: [liveOffer("first", "Civic infrastructure", "First stale result")],
      }));
      return;
    }
    await fulfillJson(route, searchResponse({
      query: body.query,
      items: [liveOffer("second", "AI safety", "Second current result")],
    }));
  });
  await openDiscover(page);
  const input = page.locator("#command-input");
  await input.fill("first query");
  await page.getByRole("button", { name: "Search", exact: true }).click();
  await input.fill("second query");
  await expect(page.getByRole("button", { name: "Search", exact: true })).toBeEnabled();
  await page.getByRole("button", { name: "Search", exact: true }).click();
  await expect(page.locator(".transaction-list")).toContainText("Second current result");
  await page.waitForTimeout(800);
  await expect(page.locator(".transaction-list")).not.toContainText("First stale result");
});

test("ambiguous money asks one inline clarification and preserves the original query", async ({ page }) => {
  let interpretationCall = 0;
  await page.route("**/api/query/interpret", async (route) => {
    interpretationCall += 1;
    const body = route.request().postDataJSON() as { query: string; clarification?: { answer: string } };
    if (!body.clarification) {
      await fulfillJson(route, {
        interpretation: {
          originalQuery: body.query,
          normalizedQuery: "animal welfare for $50",
          parsedConstraintCount: 1,
          confidence: 0.72,
          needsClarification: true,
          clarification: {
            field: "amount",
            question: "Should the stated amount be a maximum, a minimum, or an exact amount?",
            options: ["Maximum", "Minimum", "Exact amount"],
          },
        },
        target: "/discover",
      });
      return;
    }
    await fulfillJson(route, {
      interpretation: {
        originalQuery: body.query,
        normalizedQuery: "animal welfare under $50",
        parsedConstraintCount: 2,
        confidence: 0.98,
        needsClarification: false,
        clarification: null,
      },
      target: "/discover",
    });
  });
  await page.route("**/api/discover/search", async (route) => {
    const body = route.request().postDataJSON() as SearchRequest;
    await fulfillJson(route, searchResponse({ query: body.query }));
  });
  await openDiscover(page);
  const input = page.locator("#command-input");
  await input.fill("Animal welfare for $50");
  await page.getByRole("button", { name: "Search", exact: true }).click();
  const clarification = page.getByTestId("discover-live-search-state");
  await expect(clarification).toContainText("One detail changes the results.");
  await clarification.getByRole("button", { name: "Maximum" }).click();
  await expect(page.locator('.transaction-list [data-live-record="true"]')).toHaveCount(1);
  await expect(input).toHaveValue("Animal welfare for $50");
  expect(interpretationCall).toBe(2);
});

test("domain routing updates counts and renders the live pool directory in place", async ({ page }) => {
  await page.route("**/api/query/interpret", async (route) => {
    const body = route.request().postDataJSON() as { query: string };
    await fulfillJson(route, {
      interpretation: {
        originalQuery: body.query,
        normalizedQuery: body.query.toLowerCase(),
        parsedConstraintCount: 2,
        confidence: 0.98,
        needsClarification: false,
        clarification: null,
      },
      target: "/discover?domain=pools",
    });
  });
  await page.route("**/api/discover/search", async (route) => {
    const body = route.request().postDataJSON() as SearchRequest;
    await fulfillJson(route, searchResponse({
      query: body.query,
      domain: "pools",
      items: [livePool()],
      counts: { offers: 4, pools: 1, people: 2 },
    }));
  });
  await openDiscover(page);
  await page.locator("#command-input").fill("Pools near threshold for wild animal suffering");
  await page.getByRole("button", { name: "Search", exact: true }).click();
  await expect(page.locator('.transaction-list [data-live-record="true"]')).toHaveCount(1);
  await expect(page.locator(".transaction-list")).toContainText("Wild-animal welfare research pool");
  await expect(page.locator('[data-domain="offers"]').first()).toContainText("4");
  await expect(page.locator('[data-domain="pools"]').first()).toContainText("1");
  await expect(page.locator('[data-domain="people"]').first()).toContainText("2");
  expect(await page.evaluate(() => performance.getEntriesByType("navigation").length)).toBe(1);
});

test("zero and retrieval-failure states are explicit and never relabel unrelated rows as matches", async ({ page }) => {
  let fail = false;
  await page.route("**/api/discover/search", async (route) => {
    const body = route.request().postDataJSON() as SearchRequest;
    if (fail) {
      await fulfillJson(route, {
        ok: false,
        error: {
          kind: "marketplace_retrieval_failed",
          message: "Current marketplace records could not be retrieved.",
        },
      }, 503);
      return;
    }
    await fulfillJson(route, searchResponse({ query: body.query, items: [], counts: { offers: 0, pools: 0, people: 0 } }));
  });
  await openDiscover(page);
  await page.locator("#command-input").fill("No exact live result");
  await page.getByRole("button", { name: "Search", exact: true }).click();
  await expect(page.locator(".state-panel")).toContainText("No active offers match");
  await expect(page.locator(".result-count")).toContainText("0 matching offers");
  fail = true;
  await page.getByRole("button", { name: "Search", exact: true }).click();
  await expect(page.getByTestId("discover-live-search-state")).toContainText(
    "Marketplace retrieval failed.",
  );
  await expect(page.locator(".state-panel")).toContainText("No active offers match");
});

for (const viewport of [
  { width: 390, height: 844 },
  { width: 320, height: 568 },
]) {
  test(`live two-sided search results remain stacked without horizontal overflow at ${viewport.width}×${viewport.height}`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.route("**/api/discover/search", async (route) => {
      const body = route.request().postDataJSON() as SearchRequest;
      await fulfillJson(route, searchResponse({ query: body.query }));
    });
    await openDiscover(page);
    await page.locator("#command-input").fill("Wild animal suffering");
    await page.getByRole("button", { name: "Search", exact: true }).click();
    const liveResult = page.locator('.transaction-list [data-live-record="true"]');
    await expect(liveResult).toHaveCount(1);
    const offerSide = liveResult.locator('[data-exchange-side="offer"]');
    const returnSide = liveResult.locator('[data-exchange-side="return"]');
    await expect(offerSide).toBeVisible();
    await expect(returnSide).toBeVisible();
    const [offerBox, returnBox] = await Promise.all([offerSide.boundingBox(), returnSide.boundingBox()]);
    expect(returnBox!.y).toBeGreaterThanOrEqual(offerBox!.y + offerBox!.height - 1);
    const widths = await page.evaluate(() => ({
      document: document.documentElement.scrollWidth,
      body: document.body.scrollWidth,
      viewport: window.innerWidth,
    }));
    expect(widths.document).toBeLessThanOrEqual(widths.viewport + 1);
    expect(widths.body).toBeLessThanOrEqual(widths.viewport + 1);
    await mkdir("test-results", { recursive: true });
    await page.screenshot({
      path: `test-results/discover-live-search-${viewport.width}x${viewport.height}.png`,
      fullPage: true,
    });
  });
}
