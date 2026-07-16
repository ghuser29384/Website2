import { expect, test } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import path from "node:path";

const captureVisuals = process.env.HOME_MODE_CAPTURE === "1";
const captureDirectory = path.join("test-results", "home-mode-visual");

const expectedHoverColors = [
  ["trade", "rgb(231, 236, 234)"],
  ["offset", "rgb(238, 229, 225)"],
  ["pool", "rgb(238, 233, 220)"],
  ["back", "rgb(228, 232, 223)"],
] as const;

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
  });
});
