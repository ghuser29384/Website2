import { expect, test, type Page } from "@playwright/test";

const liveDirectoryPath = "/offers?mode=pledge&view=live";

async function waitForDirectory(page: Page) {
  await expect(page.getByRole("heading", {
    level: 2,
    name: "Open participant proposals",
  })).toBeVisible();
  await expect(page.getByTestId("proposal-row").first()).toBeVisible();
}

function collectRuntimeProblems(page: Page) {
  const problems: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error" || message.type() === "warning") {
      problems.push(`${message.type()}: ${message.text()}`);
    }
  });
  page.on("pageerror", (error) => problems.push(`pageerror: ${error.message}`));
  return problems;
}

test.describe("Live Offers directory", () => {
  test.setTimeout(240_000);

  test("renders one compact authoritative surface with all first-page proposals", async ({ page }) => {
    const runtimeProblems = collectRuntimeProblems(page);
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(liveDirectoryPath);
    await waitForDirectory(page);

    await expect(page.locator('[data-authoritative-directory="true"]')).toHaveCount(1);
    await expect(page.locator("#ordinary-offer-plane-host")).toHaveCount(0);
    await expect(page.locator("#visual-offer-directory-host")).toHaveCount(0);
    const rows = page.getByTestId("proposal-row");
    await expect(rows).toHaveCount(24);
    const offerIds = await rows.evaluateAll((elements) => (
      elements.map((element) => element.getAttribute("data-offer-id"))
    ));
    expect(offerIds.every(Boolean)).toBe(true);
    expect(new Set(offerIds).size).toBe(24);

    const groups = page.getByTestId("participant-offer-group");
    const truthNotes = page.locator('[id$="-truth-note"]');
    await expect(truthNotes).toHaveCount(await groups.count());
    const describedByIds = await rows.evaluateAll((elements) => (
      elements.map((element) => element.getAttribute("aria-describedby"))
    ));
    expect(new Set(describedByIds).size).toBe(await groups.count());
    for (const describedById of new Set(describedByIds)) {
      if (!describedById) throw new Error("Proposal row is missing its participant truth note reference.");
      await expect(page.locator(`#${describedById}`)).toHaveCount(1);
    }
    await expect(page.getByTestId("proposal-primary-action").first()).toHaveText("Respond");

    const thirdRowBounds = await rows.nth(2).boundingBox();
    expect(thirdRowBounds).not.toBeNull();
    expect(thirdRowBounds!.y).toBeGreaterThanOrEqual(0);
    expect(thirdRowBounds!.y + thirdRowBounds!.height).toBeLessThanOrEqual(900);

    await page.setViewportSize({ width: 1024, height: 768 });
    const compactFirstRowBounds = await rows.first().boundingBox();
    const compactPrimaryActionBounds = await rows.first().getByRole("link", { name: "Respond" }).boundingBox();
    expect(compactFirstRowBounds).not.toBeNull();
    expect(compactPrimaryActionBounds).not.toBeNull();
    expect(compactFirstRowBounds!.x).toBeGreaterThanOrEqual(0);
    expect(compactFirstRowBounds!.x + compactFirstRowBounds!.width).toBeLessThanOrEqual(1024);
    expect(compactPrimaryActionBounds!.y + compactPrimaryActionBounds!.height).toBeLessThanOrEqual(768);

    const hasHorizontalOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
    );
    expect(hasHorizontalOverflow).toBe(false);
    expect(runtimeProblems).toEqual([]);
  });

  test("keeps exact terms and signed-out actions in a keyboard disclosure", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(liveDirectoryPath);
    await waitForDirectory(page);

    const row = page.getByTestId("proposal-row").first();
    const offerId = await row.getAttribute("data-offer-id");
    expect(offerId).toBeTruthy();

    await expect(row.getByRole("link", { name: "Respond" })).toHaveAttribute(
      "href",
      new RegExp(`^/login\\?returnTo=.*${offerId}.*respond`),
    );

    const disclosure = row.getByTestId("proposal-disclosure");
    const summary = disclosure.locator(":scope > summary");
    await expect(disclosure).not.toHaveAttribute("open", "");

    await summary.click();
    await expect(disclosure).toHaveAttribute("open", "");
    await summary.click();
    await expect(disclosure).not.toHaveAttribute("open", "");

    await summary.focus();
    await summary.press("Enter");
    await expect(disclosure).toHaveAttribute("open", "");

    await expect(row.getByText("Exact offer", { exact: true })).toBeVisible();
    await expect(row.getByText("Exact request", { exact: true })).toBeVisible();
    await expect(row.getByRole("link", { name: "Counteroffer" })).toHaveAttribute(
      "href",
      new RegExp(`^/signup\\?returnTo=.*source_offer.*${offerId}`),
    );
    await expect(row.getByRole("link", { name: "Ask" })).toHaveAttribute(
      "href",
      `/offers/${offerId}#discussion`,
    );
    await expect(row.getByRole("link", { name: "Save" })).toHaveAttribute(
      "href",
      `/login?returnTo=%2Foffers%2F${offerId}`,
    );
    await expect(row.getByRole("link", { name: /Open full terms/ })).toHaveAttribute(
      "href",
      `/offers/${offerId}`,
    );

    await summary.press("Space");
    await expect(disclosure).not.toHaveAttribute("open", "");
  });

  test("preserves search, filter, sort, clear, and pagination query state", async ({ page }) => {
    await page.route("**/api/query/interpret", async (route) => {
      if (route.request().method() !== "POST") {
        await route.continue();
        return;
      }

      await route.fulfill({
        body: JSON.stringify({
          interpretation: { needsClarification: false },
          target: "/offers?view=live&search=animal%20welfare&smart=1",
        }),
        contentType: "application/json",
        status: 200,
      });
    });

    await page.goto(liveDirectoryPath);
    await waitForDirectory(page);

    await page.getByRole("searchbox", { name: "Search proposals" }).fill("animal welfare");
    await page.getByRole("button", { name: "Search" }).click();
    await page.waitForURL("**/offers?**search=animal+welfare**");
    const searchUrl = new URL(page.url());
    expect(searchUrl.searchParams.get("view")).toBe("live");
    expect(searchUrl.searchParams.get("search")).toBe("animal welfare");
    expect(searchUrl.searchParams.get("mode")).toBe("pledge");
    expect(searchUrl.searchParams.get("smart")).toBe("1");

    await page.getByRole("link", { name: "Clear all" }).click();
    await expect(page).toHaveURL((url) => (
      url.pathname === "/offers" &&
      url.searchParams.get("view") === "live" &&
      url.searchParams.size === 1
    ));
    await waitForDirectory(page);

    const filterDisclosure = page.locator("details").filter({
      has: page.locator('select[name="mode"]'),
    }).first();
    await filterDisclosure.locator(":scope > summary").click();
    const modeSelect = page.locator('select[name="mode"]');
    const sortSelect = page.locator('select[name="sort"]');
    await modeSelect.waitFor({ state: "visible", timeout: 30_000 });
    await modeSelect.selectOption("pledge");
    await sortSelect.selectOption("most_verified");
    await page.getByRole("button", { name: "Apply filters" }).click();
    await expect(page).toHaveURL((url) => (
      url.searchParams.get("view") === "live" &&
      url.searchParams.get("mode") === "pledge" &&
      url.searchParams.get("sort") === "most_verified"
    ));
    await waitForDirectory(page);

    const next = page.getByRole("link", { name: "Next" });
    const nextHref = await next.getAttribute("href");
    expect(nextHref).toBeTruthy();
    const nextUrl = new URL(nextHref!, "http://127.0.0.1:3210");
    expect(nextUrl.searchParams.get("view")).toBe("live");
    expect(nextUrl.searchParams.get("mode")).toBe("pledge");
    expect(nextUrl.searchParams.get("sort")).toBe("most_verified");
    expect(nextUrl.searchParams.get("page")).toBe("2");

    await next.click();
    await expect(page).toHaveURL((url) => url.searchParams.get("page") === "2");
    await expect(page.getByText(/Page 2 of/)).toBeVisible();
    await expect(page.getByTestId("proposal-row").first()).toBeVisible();
    await expect(page.locator("main").getByRole("alert")).toHaveCount(0);
    const previousHref = await page.getByRole("link", { name: "Previous" }).getAttribute("href");
    expect(previousHref).toContain("mode=pledge");
    expect(previousHref).toContain("sort=most_verified");
    expect(previousHref).toContain("view=live");
  });

  test("keeps the first proposal and its primary action accessible on mobile", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(liveDirectoryPath);
    await waitForDirectory(page);

    const firstRow = page.getByTestId("proposal-row").first();
    const firstRowBounds = await firstRow.boundingBox();
    expect(firstRowBounds).not.toBeNull();
    expect(firstRowBounds!.x).toBeGreaterThanOrEqual(0);
    expect(firstRowBounds!.x + firstRowBounds!.width).toBeLessThanOrEqual(390);
    expect(firstRowBounds!.y).toBeLessThan(844);
    await expect(firstRow.getByText("Offers", { exact: true })).toBeVisible();
    await expect(firstRow.getByText("Requests", { exact: true })).toBeVisible();
    await expect(firstRow.getByRole("link", { name: "Respond" })).toBeVisible();
    const primaryActionBounds = await firstRow.getByRole("link", { name: "Respond" }).boundingBox();
    expect(primaryActionBounds).not.toBeNull();
    expect(primaryActionBounds!.y + primaryActionBounds!.height).toBeLessThanOrEqual(844);
    await expect(page.getByText("Filter & sort", { exact: true })).toBeVisible();

    const searchBounds = await page.getByRole("searchbox", { name: "Search proposals" }).boundingBox();
    expect(searchBounds).not.toBeNull();
    expect(searchBounds!.x).toBeGreaterThanOrEqual(0);
    expect(searchBounds!.x + searchBounds!.width).toBeLessThanOrEqual(390);

    const hasHorizontalOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
    );
    expect(hasHorizontalOverflow).toBe(false);
  });

  test("keeps form messages and worked-example truth boundaries explicit", async ({ page }) => {
    await page.goto(`${liveDirectoryPath}&message=Proposal%20saved`);
    await waitForDirectory(page);
    await expect(page.getByText("Proposal saved", { exact: true })).toBeVisible();

    await page.goto(`${liveDirectoryPath}&error=Proposal%20could%20not%20be%20saved`);
    await waitForDirectory(page);
    await expect(page.getByText("Proposal could not be saved", { exact: true })).toBeVisible();

    await page.goto("/offers?view=examples&search=offset");
    await expect(page).toHaveURL(/\/worked-examples$/);
    await expect(page.getByRole("heading", {
      level: 1,
      name: "Public examples for reviewable moral trades.",
    })).toBeVisible();
    await expect(page.getByText("They are not live marketplace demand.", { exact: false })).toBeVisible();

    await page.goto("/offers?tab=worked_examples");
    await expect(page).toHaveURL(/\/worked-examples$/);
  });

  test("preserves directory access and URL state without JavaScript", async ({ browser }) => {
    const context = await browser.newContext({
      baseURL: "http://127.0.0.1:3210",
      javaScriptEnabled: false,
      viewport: { width: 1024, height: 768 },
    });
    await context.addCookies([
      {
        domain: "127.0.0.1",
        expires: -1,
        httpOnly: true,
        name: "mt_walkthrough_seen",
        path: "/",
        sameSite: "Lax",
        secure: false,
        value: "1",
      },
    ]);
    const page = await context.newPage();

    try {
      await page.goto(`${liveDirectoryPath}&sort=most_verified`, {
        waitUntil: "networkidle",
      });
      await waitForDirectory(page);
      await expect(page.getByTestId("proposal-row")).toHaveCount(24);
      await expect(page.locator('select[name="mode"]')).toHaveValue("pledge");
      await expect(page.locator('select[name="sort"]')).toHaveValue("most_verified");

      await page.getByRole("searchbox", { name: "Search proposals" }).fill("animal welfare");
      await page.getByRole("button", { name: "Search" }).click();
      await page.waitForURL("**/offers?**search=animal+welfare**");
      const submittedUrl = new URL(page.url());
      expect(submittedUrl.searchParams.get("view")).toBe("live");
      expect(submittedUrl.searchParams.get("search")).toBe("animal welfare");
      expect(submittedUrl.searchParams.get("mode")).toBe("pledge");
      expect(submittedUrl.searchParams.get("sort")).toBe("most_verified");
      await waitForDirectory(page);

      await page.goto("/what-is-moral-trade", { waitUntil: "networkidle" });
      await expect(page.getByRole("heading", { level: 1, name: "What is moral trade?" })).toBeVisible();
    } finally {
      await context.close();
    }
  });
});
