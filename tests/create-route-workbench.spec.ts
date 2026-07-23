import { expect, test, type Page } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import path from "node:path";

const captureVisuals = process.env.CREATE_ROUTE_CAPTURE === "1";
const captureDirectory = path.join("test-results", "create-route-visual");

async function prepareForVisualCapture(page: Page) {
  await page.evaluate(() => {
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }

    document.querySelectorAll("nextjs-portal").forEach((portal) => portal.remove());
  });
  await page.addStyleTag({
    content: ".skip-link, nextjs-portal { display: none !important; }",
  });
}

test.describe("Create route workbench", () => {
  test("compares routes without creating a commitment", async ({ browser, page }) => {
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.goto("/create");

    await expect(page.getByRole("heading", { level: 1, name: "Create." })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Swap commitments." })).toBeVisible();
    await expect(
      page.getByText("Choose a route. Nothing happens until you confirm.", { exact: true }),
    ).toBeVisible();
    await expect(page.locator('[data-create-mode="trade"]')).toHaveAttribute(
      "aria-pressed",
      "true",
    );

    if (captureVisuals) {
      await mkdir(captureDirectory, { recursive: true });
      await prepareForVisualCapture(page);
      await page.screenshot({
        fullPage: true,
        path: path.join(captureDirectory, "implementation-default-desktop.png"),
      });
    }

    await page.locator('[data-create-mode="offset"]').click();

    await expect(page).toHaveURL(/\?mode=offset$/);
    await expect(page.locator('[data-create-mode="offset"]')).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    await expect(page.getByRole("heading", { name: "Redirect planned gifts." })).toBeVisible();
    await expect(page.getByText("Plans stay", { exact: true })).toBeVisible();
    await expect(page.getByRole("link", { name: "Review offset safeguards" })).toHaveAttribute(
      "href",
      "/donation-offsets",
    );

    await page.locator('[data-create-mode="pool"]').click();

    await expect(page).toHaveURL(/\?mode=pool$/);
    await expect(page.getByRole("heading", { name: "Pay only if the pool fills." })).toBeVisible();
    await expect(page.getByLabel("Pool process")).toBeVisible();
    await expect(page.getByText("Set your cap", { exact: true })).toBeVisible();
    await expect(page.getByText("Pay ≤ cap", { exact: true })).toBeVisible();
    await expect(page.getByText("Pay $0", { exact: true })).toBeVisible();
    await expect(page.getByRole("link", { name: "Explore pools" })).toHaveAttribute(
      "href",
      "/pools",
    );

    const selectedRouteWords = (await page.locator("#selected-route-panel").innerText())
      .trim()
      .split(/\s+/);
    expect(selectedRouteWords.length).toBeLessThanOrEqual(40);

    await expect(page.getByText("How it works", { exact: true })).toHaveCount(0);
    await expect(page.getByText("Who this is for", { exact: true })).toHaveCount(0);
    await expect(page.getByText("Next step", { exact: true })).toHaveCount(0);

    const preservesDraftBoundary = await page.evaluate(() =>
      document.body.textContent?.includes("Nothing happens until you confirm."),
    );
    expect(preservesDraftBoundary).toBe(true);

    if (captureVisuals) {
      await prepareForVisualCapture(page);
      await page.screenshot({
        fullPage: true,
        path: path.join(captureDirectory, "implementation-selected-pool-desktop.png"),
      });

      const liveContext = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
      const livePage = await liveContext.newPage();
      await livePage.goto("https://moraltrade.org/create", { waitUntil: "domcontentloaded" });
      await prepareForVisualCapture(livePage);
      await livePage.screenshot({
        fullPage: true,
        path: path.join(captureDirectory, "production-reference-desktop.png"),
      });
      await liveContext.close();
    }
  });

  test("shows a distinct hover color for each route", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.goto("/create");

    const expectedHoverColors = [
      ["trade", "rgb(220, 239, 253)"],
      ["offset", "rgb(236, 234, 255)"],
      ["pool", "rgb(241, 247, 204)"],
      ["back", "rgb(231, 239, 229)"],
    ] as const;
    const observedHoverColors: string[] = [];

    for (const [mode, expectedColor] of expectedHoverColors) {
      const routeButton = page.locator(`[data-create-mode="${mode}"]`);
      await routeButton.hover();
      await expect(routeButton).toHaveCSS("background-color", expectedColor);
      observedHoverColors.push(
        await routeButton.evaluate((element) => getComputedStyle(element).backgroundColor),
      );
    }

    expect(new Set(observedHoverColors).size).toBe(expectedHoverColors.length);
  });

  test("keeps the route chooser usable without horizontal overflow on mobile", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/create?mode=offset");

    await expect(page.locator('[data-create-mode="offset"]')).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    await page.locator('[data-create-mode="back"]').click();
    await expect(page.getByRole("heading", { name: "Fund a verified gap." })).toBeVisible();
    await expect(page.getByText("No funds move", { exact: true })).toBeVisible();
    await expect(page.getByRole("link", { name: "Start review" })).toHaveAttribute(
      "href",
      "/create?mode=back",
    );

    const hasHorizontalOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
    );
    expect(hasHorizontalOverflow).toBe(false);

    if (captureVisuals) {
      await mkdir(captureDirectory, { recursive: true });
      await prepareForVisualCapture(page);
      await page.screenshot({
        fullPage: true,
        path: path.join(captureDirectory, "implementation-mobile.png"),
      });
    }
  });

  test("opens a bounded Back intake without publishing or authorizing it", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/create?mode=back");

    await expect(
      page.getByRole("heading", { level: 1, name: "Close a verified compensation gap." }),
    ).toBeVisible();
    await expect(page.getByRole("heading", { name: "Back preview" })).toBeVisible();
    await expect(page.getByLabel("No-deal baseline")).toBeVisible();
    await expect(page.getByLabel("Maximum backing requested")).toBeVisible();
    await expect(page.getByLabel("Exit and fallback rule")).toBeVisible();
    await expect(page.getByRole("link", { name: "Create account before drafting" })).toHaveAttribute(
      "href",
      "/signup?returnTo=%2Fcreate%3Fmode%3Dback",
    );
    await expect(page.getByRole("button", { name: "Request review" })).toHaveCount(0);

    const hasHorizontalOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
    );
    expect(hasHorizontalOverflow).toBe(false);

    if (captureVisuals) {
      await mkdir(captureDirectory, { recursive: true });
      await prepareForVisualCapture(page);
      await page.screenshot({
        fullPage: true,
        path: path.join(captureDirectory, "back-draft-mobile.png"),
      });
    }
  });
});
