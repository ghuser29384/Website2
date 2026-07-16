import { expect, test } from "@playwright/test";
import { mkdir } from "node:fs/promises";
import path from "node:path";

const captureVisuals = process.env.HOME_MODE_CAPTURE === "1";
const captureDirectory = path.join("test-results", "home-mode-visual");

const expectedHoverColors = [
  ["trade", "rgb(220, 239, 253)"],
  ["offset", "rgb(236, 234, 255)"],
  ["pool", "rgb(241, 247, 204)"],
  ["back", "rgb(231, 239, 229)"],
] as const;

test.describe("Homepage mode rail", () => {
  test("shows a distinct hover color for every route", async ({ page }) => {
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
