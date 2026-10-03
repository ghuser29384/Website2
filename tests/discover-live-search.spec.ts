import { expect, test } from "@playwright/test";
import { fulfill, liveOffer, mockAccount, mockInventory, responseFor, type BrowseRequest } from "./helpers/discover";

test("initial no-query browsing fetches real records with no prototype payload", async ({ page }) => {
  const requests = await mockInventory(page);
  const resources: string[] = [];
  page.on("request", (request) => resources.push(request.url()));
  await page.goto("/discover");
  await expect(page.getByRole("heading", { name: "Browse trades", exact: true })).toBeVisible();
  await expect(page.locator('[data-live-record="true"]')).toHaveCount(1);
  expect(requests).toHaveLength(1);
  expect(requests[0].query).toBe("");
  expect(requests[0].domain).toBe("offers");
  expect(requests[0].manual.maximumOfferAmountCents).toBeNull();
  expect(resources.some((url) => /discover\/payload|discover-navigation|discover-value-hover/.test(url))).toBe(false);
  await expect(page.getByRole("tab")).toHaveCount(0);
  await expect(page.locator(".result-count")).toHaveText("1 matching trade");
  await expect(page.locator("body")).not.toContainText("Mina Park");
});

test("Search and Enter update the same list without replacing the document", async ({ page }) => {
  const requests = await mockInventory(page, (body) => responseFor(body, { items: [liveOffer("current", body.query || "Initial trade")] }));
  await page.goto("/discover");
  await expect(page.locator('[data-live-record="true"]')).toHaveCount(1);
  await page.evaluate(() => { document.body.dataset.documentSentinel = "same"; });
  await page.locator("#command-input").fill("Animal welfare");
  await page.getByRole("button", { name: "Search", exact: true }).click();
  await expect(page.locator(".trade-row h3")).toHaveText("Animal welfare");
  await page.locator("#command-input").fill("research");
  await page.locator("#command-input").press("Enter");
  await expect(page.locator(".trade-row h3")).toHaveText("research");
  expect(requests.map((request) => request.query)).toEqual(["", "Animal welfare", "research"]);
  await expect(page.locator("body")).toHaveAttribute("data-document-sentinel", "same");
  expect(new URL(page.url()).searchParams.get("q")).toBe("research");
});

test("type and amount filters compose in one request, and clear fetches the same directory", async ({ page }) => {
  const requests = await mockInventory(page);
  await page.goto("/discover");
  await expect(page.locator('[data-live-record="true"]')).toHaveCount(1);
  await page.locator("#maximum-offer").fill("25");
  await page.locator("#offer-kind").selectOption("co-fund");
  await expect.poll(() => requests.at(-1)?.offerKind).toBe("co-fund");
  await expect.poll(() => requests.at(-1)?.manual.maximumOfferAmountCents).toBe(2500);
  await page.getByRole("button", { name: "Clear all" }).click();
  await expect.poll(() => requests.at(-1)?.offerKind).toBe("all");
  expect(requests.at(-1)?.query).toBe("");
  expect(requests.at(-1)?.manual.maximumOfferAmountCents).toBeNull();
  await expect(page.locator("#maximum-offer")).toHaveValue("");
});

test("a zero-dollar cap remains distinct from an absent cap", async ({ page }) => {
  const requests = await mockInventory(page);
  await page.goto("/discover?max=0");
  await expect(page.locator('[data-live-record="true"]')).toHaveCount(1);
  expect(requests[0].manual.maximumOfferAmountCents).toBe(0);
  await expect(page.locator("#maximum-offer")).toHaveValue("0");
  await page.locator("#maximum-offer").fill("");
  await page.getByRole("button", { name: "Search", exact: true }).click();
  await expect.poll(() => requests.at(-1)?.manual.maximumOfferAmountCents).toBeNull();
});

test("deep links, refresh and back preserve search and manual constraints", async ({ page }) => {
  const requests = await mockInventory(page);
  await page.goto("/discover?q=research&max=20&offerKind=individual&causeFilter=ai-safety");
  await expect(page.locator('[data-live-record="true"]')).toHaveCount(1);
  expect(requests[0]).toMatchObject({ query: "research", offerKind: "individual", manual: { maximumOfferAmountCents: 2000, causes: ["ai-safety"] } });
  await page.reload();
  await expect(page.locator('[data-live-record="true"]')).toHaveCount(1);
  expect(requests.at(-1)?.manual.causes).toEqual(["ai-safety"]);
  await page.locator("#command-input").fill("changed");
  await page.locator("#command-input").press("Enter");
  await expect.poll(() => requests.at(-1)?.query).toBe("changed");
  await page.goBack();
  await expect.poll(() => requests.at(-1)?.query).toBe("research");
  await expect(page.locator("#command-input")).toHaveValue("research");
});

test("applied hard constraints can be removed without relaxing other filters", async ({ page }) => {
  const requests = await mockInventory(page, (body) => responseFor(body, {
    constraints: body.manual.maximumOfferAmountCents === null ? [] : [{ key: "manual-offer-max", label: "You offer ≤ $20", source: "manual" }],
  }));
  await page.goto("/discover?q=research&max=20");
  await page.getByRole("button", { name: "Remove You offer ≤ $20" }).click();
  await expect.poll(() => requests.at(-1)?.manual.maximumOfferAmountCents).toBeNull();
  expect(requests.at(-1)?.query).toBe("research");
});

test("pagination returns current rows and preserves the filter state", async ({ page }) => {
  const requests = await mockInventory(page, (body) => responseFor(body, {
    items: [liveOffer(`page-${body.page}`, `Page ${body.page} trade`)], total: 51, hasMore: body.page === 1,
  }));
  await page.goto("/discover?q=research&max=50");
  await expect(page.locator(".trade-row h3")).toHaveText("Page 1 trade");
  await page.getByRole("button", { name: "Next page" }).click();
  await expect(page.locator(".trade-row h3")).toHaveText("Page 2 trade");
  expect(requests.at(-1)).toMatchObject({ page: 2, query: "research", manual: { maximumOfferAmountCents: 5000 } });
  await expect(page.getByRole("button", { name: "Next page" })).toBeDisabled();
  await page.getByRole("button", { name: "Previous page" }).click();
  await expect(page.locator(".trade-row h3")).toHaveText("Page 1 trade");
});

test("a slower previous search cannot overwrite a newer result", async ({ page }) => {
  await mockAccount(page);
  await page.route("**/api/discover/search", async (route) => {
    const body = route.request().postDataJSON() as BrowseRequest;
    if (body.query === "first") await new Promise((resolve) => setTimeout(resolve, 700));
    await fulfill(route, responseFor(body, { items: [liveOffer("current", body.query || "Initial")] }));
  });
  await page.goto("/discover");
  await expect(page.locator(".trade-row h3")).toHaveText("Initial");
  await page.locator("#command-input").fill("first");
  await page.locator("#command-input").press("Enter");
  await page.locator("#command-input").fill("second");
  await page.locator("#command-input").press("Enter");
  await expect(page.locator(".trade-row h3")).toHaveText("second");
  await page.waitForTimeout(850);
  await expect(page.locator(".trade-row h3")).toHaveText("second");
});

test("failed retrieval removes stale action links, preserves the query and retries", async ({ page }) => {
  let fails = false;
  await mockAccount(page);
  await page.route("**/api/discover/search", async (route) => {
    const body = route.request().postDataJSON() as BrowseRequest;
    await fulfill(route, fails ? { ok: false } : responseFor(body), fails ? 503 : 200);
  });
  await page.goto("/discover");
  await expect(page.locator('[data-live-record="true"]')).toHaveCount(1);
  fails = true;
  await page.locator("#command-input").fill("research");
  await page.locator("#command-input").press("Enter");
  await expect(page.getByRole("heading", { name: "Unable to check current trades" })).toBeVisible();
  await expect(page.locator('[data-live-record="true"]')).toHaveCount(0);
  await expect(page.locator(".result-count")).toBeEmpty();
  await expect(page.locator("#command-input")).toHaveValue("research");
  fails = false;
  await page.getByRole("button", { name: "Retry", exact: true }).click();
  await expect(page.locator('[data-live-record="true"]')).toHaveCount(1);
});

for (const availability of ["live", "partial", "unavailable"]) {
  test(`${availability} empty state does not invent inventory or conflate a failed source with zero matches`, async ({ page }) => {
    await mockInventory(page, (body) => responseFor(body, { items: [], total: 0, sourceStatus: { offers: availability } }));
    await page.goto("/discover");
    await expect(page.locator('[data-live-record="true"]')).toHaveCount(0);
    if (availability === "unavailable") {
      await expect(page.getByRole("heading", { name: "Listings are temporarily unavailable" })).toBeVisible();
      await expect(page.locator(".result-count")).toBeEmpty();
      await expect(page.locator("body")).toContainText("This is not a zero-result search");
    } else if (availability === "partial") {
      await expect(page.locator(".result-count")).toHaveText("No matches in the available source");
      await expect(page.locator("#search-status")).toContainText("other listings may be missing");
    } else {
      await expect(page.locator(".result-count")).toHaveText("0 matching trades");
      await expect(page.getByRole("heading", { name: "No current trades to show" })).toBeVisible();
    }
  });
}

test("partial nonempty results identify incomplete coverage", async ({ page }) => {
  await mockInventory(page, (body) => responseFor(body, { sourceStatus: { offers: "partial" } }));
  await page.goto("/discover");
  await expect(page.locator(".result-count")).toContainText("partial directory");
  await expect(page.locator('[data-live-record="true"]')).toHaveCount(1);
});

test("ambiguous amounts require an explicit answer while keeping the original search", async ({ page }) => {
  const requests = await mockInventory(page, (body) => responseFor(body, body.query && !body.normalizedQuery ? {
    items: [], total: 0, clarification: { field: "amount", question: "Should $50 be a maximum, minimum, or exact amount?", options: ["Maximum", "Minimum", "Exact amount"] },
  } : {}));
  await page.goto("/discover?q=animal%20welfare%20for%20%2450");
  await page.getByRole("button", { name: "Maximum", exact: true }).click();
  await expect(page.locator('[data-live-record="true"]')).toHaveCount(1);
  expect(requests.at(-1)?.normalizedQuery).toBe("animal welfare under $50");
  await expect(page.locator("#command-input")).toHaveValue("animal welfare for $50");
});

test("Co-Funds show two-sided terms and link to real review instead of a simulated pledge", async ({ page }) => {
  await mockInventory(page, (body) => responseFor(body, { items: [{ ...liveOffer(), offerKind: "co-fund", href: "/moral-goods-group-buying?pool=test-fund" }] }));
  await page.goto("/discover?offerKind=co-fund");
  await expect(page.locator('[data-exchange-side="offer"]')).toContainText("You provide");
  await expect(page.locator('[data-exchange-side="return"]')).toContainText("Counterparty provides");
  await expect(page.locator(".trade-facts")).toContainText("Manual review required");
  await expect(page.locator('[data-discover-result-link]')).toHaveAttribute("href", "/moral-goods-group-buying?pool=test-fund");
  await expect(page.getByRole("button", { name: /pledge|accept|message/i })).toHaveCount(0);
});

test("review follows the canonical offer route and back rechecks the same query", async ({ page }) => {
  const requests = await mockInventory(page);
  await page.route("**/offers/test-trade", (route) => route.fulfill({ contentType: "text/html", body: "<h1>Published terms for the test trade</h1>" }));
  await page.goto("/discover?q=research");
  await page.locator('[data-discover-result-link]').click();
  await expect(page).toHaveURL(/\/offers\/test-trade$/);
  await expect(page.getByRole("heading", { name: "Published terms for the test trade" })).toBeVisible();
  await page.goBack();
  await expect(page.locator("#command-input")).toHaveValue("research");
  await expect.poll(() => requests.length).toBeGreaterThanOrEqual(2);
});

for (const href of ["javascript:alert(1)", "https://example.org/steal", "/offers/examples/demo"]) {
  test(`unsafe or worked-example destination is not rendered: ${href}`, async ({ page }) => {
    await mockInventory(page, (body) => responseFor(body, { items: [{ ...liveOffer(), href }] }));
    await page.goto("/discover");
    await expect(page.getByRole("heading", { name: "Unable to check current trades" })).toBeVisible();
    await expect(page.locator('[data-live-record="true"]')).toHaveCount(0);
  });
}

test("listing text is escaped rather than interpreted as markup", async ({ page }) => {
  const title = '<img src=x onerror="window.injected=true">';
  await mockInventory(page, (body) => responseFor(body, { items: [liveOffer("safe-id", title)] }));
  await page.goto("/discover");
  await expect(page.locator(".trade-row h3")).toHaveText(title);
  await expect(page.locator(".trade-row img")).toHaveCount(0);
  expect(await page.evaluate(() => Object.hasOwn(window, "injected"))).toBe(false);
});

test("retired graph URLs open the live list with an explicit notice", async ({ page }) => {
  const requests = await mockInventory(page);
  await page.goto("/discover?domain=pools&view=threshold");
  await expect(page.locator("#legacy-notice")).toBeVisible();
  await expect(page.locator('[data-live-record="true"]')).toHaveCount(1);
  expect(requests[0].domain).toBe("offers");
  expect(new URL(page.url()).searchParams.get("view")).toBe("list");
  await expect(page.getByRole("tab")).toHaveCount(0);
});

test("people and standalone-pool query results are not relabeled as trades", async ({ page }) => {
  await mockInventory(page, (body) => responseFor(body, { domain: "people", items: [], total: 0 }));
  await page.goto("/discover?q=people");
  await expect(page.getByRole("heading", { name: "Search for an exchange" })).toBeVisible();
  await expect(page.locator('[data-live-record="true"]')).toHaveCount(0);
  await expect(page.locator(".result-count")).toBeEmpty();
});

test("examples stay outside the directory and browsing has no transaction-write requests", async ({ page }) => {
  await mockInventory(page);
  const writes: string[] = [];
  page.on("request", (request) => {
    if (["POST", "PUT", "PATCH", "DELETE"].includes(request.method())) writes.push(new URL(request.url()).pathname);
  });
  await page.goto("/discover");
  await expect(page.locator('[data-live-record="true"]')).toHaveCount(1);
  await expect(page.locator('.discover-footer a[href="/worked-examples"]')).toBeVisible();
  await expect(page.locator(".discover-footer")).toContainText("illustrations, not available listings");
  expect(writes).toEqual(["/api/discover/search"]);
});


test("an out-of-range saved page does not claim zero matching trades", async ({ page }) => {
  const requests = await mockInventory(page, (body) => responseFor(body, {
    items: body.page === 1 ? [liveOffer()] : [], total: 1, hasMore: false,
  }));
  await page.goto("/discover?q=research&max=50&page=3");
  await expect(page.locator(".result-count")).toHaveText("1 matching trade");
  await expect(page.getByRole("heading", { name: "No trades on this page" })).toBeVisible();
  await page.getByRole("button", { name: "First page", exact: true }).click();
  await expect(page.locator('[data-live-record="true"]')).toHaveCount(1);
  expect(requests.at(-1)).toMatchObject({ page: 1, query: "research", manual: { maximumOfferAmountCents: 5000 } });
});


for (const chooseSuggestion of [false, true]) {
  test(`Enter submits the query with assistance visible; explicit suggestion: ${chooseSuggestion}`, async ({ page }) => {
    const requests = await mockInventory(page);
    await page.route("**/moral-trade-input-standards.json", (route) => fulfill(route, {
      priorities: [{ label: "Research support", description: "Test search completion", aliases: ["research"] }],
    }));
    await page.goto("/discover");
    await expect(page.locator('[data-live-record="true"]')).toHaveCount(1);
    const input = page.locator("#command-input");
    await expect(input).toHaveAttribute("data-mt-autocomplete-ready", "true");
    await input.fill("research");
    await expect(page.locator("#mt-input-assist-listbox")).toBeVisible();
    await expect(input).not.toHaveAttribute("aria-activedescendant", /.+/);
    if (chooseSuggestion) {
      await input.press("ArrowDown");
      await expect(page.locator('[role="option"][aria-selected="true"] strong')).toHaveText("Research support");
    }
    await input.press("Enter");
    await expect.poll(() => requests.at(-1)?.query).toBe(chooseSuggestion ? "Research support" : "research");
    await expect(input).toHaveValue(chooseSuggestion ? "Research support" : "research");
    expect(requests).toHaveLength(2);
  });
}
