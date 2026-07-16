import { expect, test, type Page } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import path from "node:path";

const captureVisuals = process.env.HOME_MODE_CAPTURE === "1";
const captureDirectory = path.join("test-results", "home-mode-visual");

const expectedHoverColors = [
  ["fund", "rgb(241, 240, 235)"],
  ["trade", "rgb(255, 240, 235)"],
  ["offset", "rgb(238, 241, 240)"],
  ["pool", "rgb(242, 240, 232)"],
] as const;

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

test.describe("Homepage mode rail", () => {
  test("shows a distinct restrained hover color for every route", async ({ page }) => {
    await page.setViewportSize({ width: 1560, height: 960 });
    await page.goto("/");

    const rail = page.getByRole("navigation", { name: "Ways to use Moral Trade" });
    const cards = rail.locator(".mt-mode-card");
    await expect(cards).toHaveCount(expectedHoverColors.length);

    const observedColors: string[] = [];

    if (captureVisuals) {
      await mkdir(captureDirectory, { recursive: true });
    }

    for (const [index, [mode, expectedColor]] of expectedHoverColors.entries()) {
      const card = cards.nth(index);
      await card.hover();
      await expect(card).toHaveCSS("background-color", expectedColor);
      observedColors.push(
        await card.evaluate((element) => getComputedStyle(element).backgroundColor),
      );

      if (captureVisuals) {
        await rail.screenshot({
          path: path.join(captureDirectory, `${mode}-hover.png`),
        });
      }
    }

    expect(new Set(observedColors).size).toBe(expectedHoverColors.length);

    if (captureVisuals) {
      await page.mouse.move(0, 0);
      await prepareForVisualCapture(page);
      await page.screenshot({
        fullPage: true,
        path: path.join(captureDirectory, "homepage-desktop.png"),
      });

      await page.setViewportSize({ width: 390, height: 844 });
      await page.goto("/");
      await prepareForVisualCapture(page);
      await page.screenshot({
        fullPage: true,
        path: path.join(captureDirectory, "homepage-mobile.png"),
      });
    }
  });
});
