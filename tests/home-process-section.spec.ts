import { expect, test, type Page } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import path from "node:path";

const captureVisuals = process.env.HOME_PROCESS_CAPTURE === "1";
const captureDirectory = path.join("test-results", "home-process-visual");

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

test.describe("Homepage process section", () => {
  test("uses a deliberate split layout on desktop", async ({ browser, page }) => {
    await page.setViewportSize({ width: 1560, height: 960 });
    await page.goto("/");

    const section = page.locator("section:has(#process-heading)");

    await expect(
      page.getByRole("heading", { level: 2, name: "Agree on the deal, not the values." }),
    ).toBeVisible();
    await expect(section.locator(".mt-how-step")).toHaveCount(4);
    await expect(section.locator('a[href="/how-it-works"]')).toHaveCount(0);

    const gridColumnCount = await section.evaluate((element) =>
      getComputedStyle(element).gridTemplateColumns.split(" ").filter(Boolean).length,
    );
    expect(gridColumnCount).toBe(2);

    const sectionBox = await section.boundingBox();
    expect(sectionBox).not.toBeNull();
    expect(sectionBox!.height).toBeLessThan(850);

    if (captureVisuals) {
      await mkdir(captureDirectory, { recursive: true });
      await prepareForVisualCapture(page);
      await section.screenshot({
        path: path.join(captureDirectory, "implementation-desktop.png"),
      });

      const liveContext = await browser.newContext({ viewport: { width: 1560, height: 960 } });
      const livePage = await liveContext.newPage();
      await livePage.goto("https://moraltrade.org", { waitUntil: "domcontentloaded" });
      await prepareForVisualCapture(livePage);
      await livePage.locator("section:has(#process-heading)").screenshot({
        path: path.join(captureDirectory, "production-reference-desktop.png"),
      });
      await liveContext.close();
    }
  });

  test("stacks cleanly without horizontal overflow on mobile", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/");

    const section = page.locator("section:has(#process-heading)");
    await expect(section).toBeVisible();
    await expect(section.locator(".mt-how-step")).toHaveCount(4);

    const gridColumnCount = await section.evaluate((element) =>
      getComputedStyle(element).gridTemplateColumns.split(" ").filter(Boolean).length,
    );
    expect(gridColumnCount).toBe(1);

    const hasHorizontalOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
    );
    expect(hasHorizontalOverflow).toBe(false);

    if (captureVisuals) {
      await mkdir(captureDirectory, { recursive: true });
      await prepareForVisualCapture(page);
      await section.screenshot({
        path: path.join(captureDirectory, "implementation-mobile.png"),
      });
    }
  });
});
