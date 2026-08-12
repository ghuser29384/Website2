import { expect, test, type Page } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import path from "node:path";

const captureDirectory = path.join("test-results", "offers-density");
const targetRoute = "/offers?mode=pledge&view=live";

async function stubOfferPlane(page: Page) {
  let requestCount = 0;

  await page.route("**/api/offers/plane", async (route) => {
    requestCount += 1;
    await route.fulfill({
      body: JSON.stringify({ items: [], liveOffersAvailable: false }),
      contentType: "application/json",
      status: 200,
    });
  });

  return () => requestCount;
}

async function capture(page: Page, filename: string) {
  await mkdir(captureDirectory, { recursive: true });
  await page.evaluate(() => {
    if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
    document.querySelectorAll("nextjs-portal").forEach((portal) => portal.remove());
  });
  await page.addStyleTag({
    content: ".skip-link, nextjs-portal { display: none !important; }",
  });
  await page.screenshot({
    fullPage: true,
    path: path.join(captureDirectory, filename),
  });
}

async function expectNoHorizontalOverflow(page: Page) {
  const overflow = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }));
  expect(overflow.scrollWidth).toBeLessThanOrEqual(overflow.clientWidth);
}

test.describe("Offers directory density", () => {
  test("uses one calm editorial hierarchy and keeps advanced analysis optional on desktop", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 1000 });
    const getPlaneRequestCount = await stubOfferPlane(page);
    const consoleErrors: string[] = [];
    page.on("console", (message) => {
      if (message.type() === "error") consoleErrors.push(message.text());
    });

    await page.goto(targetRoute);

    await expect(page).toHaveURL(/\/offers\?mode=pledge&view=live/);
    await expect(
      page.getByRole("heading", {
        level: 1,
        name: "Find a live proposal you can evaluate quickly.",
      }),
    ).toBeVisible();
    await expect(page.getByRole("heading", { level: 2, name: "Open participant proposals" })).toBeVisible();
    await expect(page.getByRole("heading", { level: 2, name: "Coordinate without a bilateral listing" })).toBeVisible();

    await expect(page.locator(".mt-beta-strip")).toBeHidden();
    await expect(page.locator(".mt-explore-side")).toBeHidden();
    await expect(page.getByText(/Hard constraints → semantic relevance/)).toBeHidden();

    const topbarSearch = page.locator(".mt-site-topbar .topbar-search");
    if (await topbarSearch.count()) await expect(topbarSearch).toBeHidden();

    const heroStyle = await page.locator(".mt-explore-hero").evaluate((element) => {
      const style = getComputedStyle(element);
      return {
        backgroundColor: style.backgroundColor,
        borderRadius: style.borderRadius,
        display: style.display,
        minHeight: Number.parseFloat(style.minHeight),
      };
    });
    expect(heroStyle.display).toBe("block");
    expect(heroStyle.backgroundColor).toBe("rgb(247, 243, 235)");
    expect(heroStyle.borderRadius).toBe("0px");
    expect(heroStyle.minHeight).toBeGreaterThan(450);

    const headingStyle = await page.locator("#explore-heading").evaluate((element) => {
      const style = getComputedStyle(element);
      return {
        fontSize: Number.parseFloat(style.fontSize),
        fontWeight: style.fontWeight,
        lineHeight: Number.parseFloat(style.lineHeight),
      };
    });
    expect(headingStyle.fontSize).toBeGreaterThan(56);
    expect(headingStyle.fontWeight).toBe("400");
    expect(headingStyle.lineHeight).toBeLessThan(headingStyle.fontSize);

    const searchForm = page.locator('form[data-smart-query-surface="offers"]');
    await expect(searchForm).toBeVisible();
    await expect(searchForm).toHaveCount(1);
    const formStyle = await searchForm.evaluate((element) => {
      const style = getComputedStyle(element);
      return {
        borderRadius: style.borderRadius,
        boxShadow: style.boxShadow,
        display: style.display,
      };
    });
    expect(formStyle.display).toBe("grid");
    expect(formStyle.borderRadius).toBe("0px");
    expect(formStyle.boxShadow).toBe("none");

    const participantGroups = page.locator("[data-participant-offer-group]");
    const participantOffers = page.locator("[data-participant-offer]");
    await expect(participantGroups.first()).toBeVisible();
    expect(await participantOffers.count()).toBeGreaterThan(0);

    const participantGroupStyle = await participantGroups.first().evaluate((element) => {
      const style = getComputedStyle(element);
      return {
        backgroundColor: style.backgroundColor,
        borderRadius: style.borderRadius,
        boxShadow: style.boxShadow,
      };
    });
    expect(participantGroupStyle.backgroundColor).toBe("rgba(0, 0, 0, 0)");
    expect(participantGroupStyle.borderRadius).toBe("0px");
    expect(participantGroupStyle.boxShadow).toBe("none");
    await expect(page.getByText(/These are the owner's exact published terms/)).toHaveCount(
      await participantGroups.count(),
    );

    const firstOfferStyle = await participantOffers.first().evaluate((element) => {
      const style = getComputedStyle(element);
      return {
        display: style.display,
        gridTemplateAreas: style.gridTemplateAreas,
      };
    });
    expect(firstOfferStyle.display).toBe("grid");
    expect(firstOfferStyle.gridTemplateAreas).toContain("heading");
    expect(firstOfferStyle.gridTemplateAreas).toContain("exchange");
    expect(firstOfferStyle.gridTemplateAreas).toContain("actions");

    const explorer = page.locator("details").filter({ hasText: "Optional visual explorer" });
    const explorerSummary = explorer.locator(":scope > summary");
    await expect(explorer).toBeVisible();
    await expect(explorerSummary).toHaveCount(1);
    expect(await explorer.evaluate((element) => (element as HTMLDetailsElement).open)).toBe(false);

    await page.waitForTimeout(250);
    expect(getPlaneRequestCount()).toBe(0);
    await explorerSummary.click();
    await expect(explorer).toHaveJSProperty("open", true);
    await expect.poll(getPlaneRequestCount).toBe(1);
    await explorerSummary.click();
    await expect(explorer).toHaveJSProperty("open", false);

    await expectNoHorizontalOverflow(page);
    await capture(page, "implementation-desktop.png");

    const searchInput = page.getByRole("searchbox", { name: "Search proposals" });
    await searchInput.fill("verified civic work under $50");
    await page.getByRole("button", { name: "Apply smart search" }).click();
    await expect(page).toHaveURL(/search=verified(?:\+|%20)civic(?:\+|%20)work(?:\+|%20)under(?:\+|%20)%2450/);
    expect(new URL(page.url()).searchParams.get("mode")).toBe("pledge");
    expect(consoleErrors).toEqual([]);
  });

  test("collapses cleanly on a 390px mobile viewport", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    const getPlaneRequestCount = await stubOfferPlane(page);

    await page.goto(targetRoute);

    await expect(
      page.getByRole("heading", {
        level: 1,
        name: "Find a live proposal you can evaluate quickly.",
      }),
    ).toBeVisible();
    await expect(page.getByRole("searchbox", { name: "Search proposals" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Apply smart search" })).toBeVisible();
    await expect(page.getByText("Optional visual explorer")).toBeVisible();

    const topbarBox = await page.locator(".mt-site-topbar").boundingBox();
    expect(topbarBox).not.toBeNull();
    if (topbarBox) expect(topbarBox.height).toBeLessThan(180);

    const navBox = await page.locator(".mt-site-topbar .topbar-links").boundingBox();
    expect(navBox).not.toBeNull();
    if (navBox) expect(navBox.height).toBeLessThan(55);

    const brandMetrics = await page.locator(".mt-site-topbar .brand").evaluate((element) => ({
      clientWidth: element.clientWidth,
      scrollWidth: element.scrollWidth,
    }));
    expect(brandMetrics.scrollWidth).toBeLessThanOrEqual(brandMetrics.clientWidth + 1);

    const viewportWidth = await page.evaluate(() => document.documentElement.clientWidth);
    const controls = page.locator(
      'form[data-smart-query-surface="offers"] input:not([type="hidden"]), form[data-smart-query-surface="offers"] select, form[data-smart-query-surface="offers"] button',
    );
    const controlCount = await controls.count();
    expect(controlCount).toBeGreaterThanOrEqual(4);

    for (let index = 0; index < controlCount; index += 1) {
      const box = await controls.nth(index).boundingBox();
      expect(box, `control ${index + 1} should have a rendered box`).not.toBeNull();
      if (!box) continue;
      expect(box.x).toBeGreaterThanOrEqual(0);
      expect(box.x + box.width).toBeLessThanOrEqual(viewportWidth + 0.5);
    }

    const heroHeadingSize = await page.locator("#explore-heading").evaluate((element) =>
      Number.parseFloat(getComputedStyle(element).fontSize),
    );
    expect(heroHeadingSize).toBeGreaterThanOrEqual(44);
    expect(heroHeadingSize).toBeLessThanOrEqual(76);

    const participantOffers = page.locator("[data-participant-offer]");
    const participantOfferCount = await participantOffers.count();
    expect(participantOfferCount).toBeGreaterThan(0);
    const sampledOfferCount = Math.min(participantOfferCount, 5);
    for (let index = 0; index < sampledOfferCount; index += 1) {
      const box = await participantOffers.nth(index).boundingBox();
      expect(box, `proposal row ${index + 1} should have a rendered box`).not.toBeNull();
      if (box) expect(box.height).toBeLessThan(650);
    }

    const explorer = page.locator("details").filter({ hasText: "Optional visual explorer" });
    const explorerSummary = explorer.locator(":scope > summary");
    await expect(explorerSummary).toHaveCount(1);
    expect(await explorer.evaluate((element) => (element as HTMLDetailsElement).open)).toBe(false);
    expect(getPlaneRequestCount()).toBe(0);
    await explorerSummary.click();
    await expect(explorer).toHaveJSProperty("open", true);
    await expect.poll(getPlaneRequestCount).toBe(1);
    await explorerSummary.click();
    await expect(explorer).toHaveJSProperty("open", false);

    await expectNoHorizontalOverflow(page);
    await capture(page, "implementation-mobile.png");
  });
});
