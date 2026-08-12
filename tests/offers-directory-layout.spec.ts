import { mkdir } from "node:fs/promises";

import { expect, test, type Page } from "@playwright/test";

function monitorBrowserFailures(page: Page) {
  const consoleErrors: string[] = [];
  const pageErrors: string[] = [];

  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  page.on("pageerror", (error) => pageErrors.push(error.message));

  return { consoleErrors, pageErrors };
}

async function openLiveOffers(page: Page) {
  await page.goto("/offers?mode=pledge&view=live", { waitUntil: "networkidle" });

  await expect(
    page.getByRole("heading", {
      level: 1,
      name: "Find a live proposal you can evaluate quickly.",
    }),
  ).toBeVisible();
  await expect(page.locator('form[data-smart-query-surface="offers"]')).toBeVisible();
  await expect
    .poll(() => page.locator("#ordinary-offer-plane-host > details").count())
    .toBe(1);
}

async function expectNoHorizontalOverflow(page: Page) {
  const overflow = await page.evaluate(() => ({
    bodyWidth: document.body.scrollWidth,
    documentWidth: document.documentElement.scrollWidth,
    viewportWidth: window.innerWidth,
  }));

  expect(overflow.documentWidth).toBeLessThanOrEqual(overflow.viewportWidth + 1);
  expect(overflow.bodyWidth).toBeLessThanOrEqual(overflow.viewportWidth + 1);
}

test("live Offers uses the calm Walkthrough-style hierarchy on desktop", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  const failures = monitorBrowserFailures(page);
  await openLiveOffers(page);

  const hero = page.locator(".mt-explore-hero");
  const directory = page.locator(".mt-product-section.is-white");
  const visualSearch = page.locator("#ordinary-offer-plane-host > details");
  const visualSearchSummary = visualSearch.locator(":scope > summary");
  const searchForm = page.locator('form[data-smart-query-surface="offers"]');

  await expect(hero).toBeVisible();
  await expect(directory).toBeVisible();
  await expect(visualSearch).not.toHaveAttribute("open", "");
  await expect(visualSearchSummary).toContainText("Explore by challenge and return");
  await expect(visualSearchSummary).toContainText("Optional");
  await expect(searchForm.locator("input, select")).toHaveCount(3);

  const desktopStyles = await page.evaluate(() => {
    const heroElement = document.querySelector<HTMLElement>(".mt-explore-hero");
    const directoryElement = document.querySelector<HTMLElement>(".mt-product-section.is-white");
    const formElement = document.querySelector<HTMLElement>(
      'form[data-smart-query-surface="offers"]',
    );
    if (!heroElement || !directoryElement || !formElement) {
      throw new Error("Missing live Offers hierarchy elements");
    }

    const heroStyle = getComputedStyle(heroElement);
    const directoryStyle = getComputedStyle(directoryElement);
    const formStyle = getComputedStyle(formElement);
    return {
      directoryRadius: Number.parseFloat(directoryStyle.borderRadius),
      formShadow: formStyle.boxShadow,
      heroColumns: heroStyle.gridTemplateColumns.split(" ").filter(Boolean).length,
      heroRadius: Number.parseFloat(heroStyle.borderRadius),
    };
  });

  expect(desktopStyles.heroColumns).toBe(2);
  expect(desktopStyles.heroRadius).toBeGreaterThanOrEqual(20);
  expect(desktopStyles.directoryRadius).toBeGreaterThanOrEqual(20);
  expect(desktopStyles.formShadow).toBe("none");

  await expectNoHorizontalOverflow(page);
  await mkdir("test-results", { recursive: true });
  await page.screenshot({
    path: "test-results/offers-directory-desktop.png",
    fullPage: true,
  });

  expect(failures.consoleErrors).toEqual([]);
  expect(failures.pageErrors).toEqual([]);
});

test("live Offers stays single-column and uncluttered on mobile", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const failures = monitorBrowserFailures(page);
  await openLiveOffers(page);

  const visualSearch = page.locator("#ordinary-offer-plane-host > details");
  const visualSearchSummary = visualSearch.locator(":scope > summary");
  await expect(visualSearch).not.toHaveAttribute("open", "");
  await expect(visualSearchSummary).toBeVisible();

  const mobileStyles = await page.evaluate(() => {
    const heroElement = document.querySelector<HTMLElement>(".mt-explore-hero");
    const filterGrid = document.querySelector<HTMLElement>(
      'form[data-smart-query-surface="offers"] > div:first-of-type',
    );
    if (!heroElement || !filterGrid) throw new Error("Missing mobile Offers hierarchy elements");

    return {
      filterColumns: getComputedStyle(filterGrid).gridTemplateColumns.split(" ").filter(Boolean).length,
      heroColumns: getComputedStyle(heroElement).gridTemplateColumns.split(" ").filter(Boolean).length,
    };
  });

  expect(mobileStyles.heroColumns).toBe(1);
  expect(mobileStyles.filterColumns).toBe(1);
  await expectNoHorizontalOverflow(page);

  await mkdir("test-results", { recursive: true });
  await page.screenshot({
    path: "test-results/offers-directory-mobile.png",
    fullPage: true,
  });

  expect(failures.consoleErrors).toEqual([]);
  expect(failures.pageErrors).toEqual([]);
});
