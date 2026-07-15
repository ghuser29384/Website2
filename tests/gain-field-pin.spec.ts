import { expect, test } from "@playwright/test";

const selectedPointSelector = '[aria-label^="Proposed agreement."]';

test.describe("Mutual-gain field", () => {
  test("fixes on the first click and releases on the second click", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.goto("/");

    const field = page.getByRole("img", { name: /Mutual-gain field/ });
    const selected = field.locator(selectedPointSelector);
    await expect(field).toBeVisible();

    const bounds = await field.boundingBox();
    if (!bounds) throw new Error("Mutual-gain field has no rendered bounds.");

    const first = { x: bounds.x + bounds.width * 0.36, y: bounds.y + bounds.height * 0.61 };
    const second = { x: bounds.x + bounds.width * 0.78, y: bounds.y + bounds.height * 0.68 };
    const third = { x: bounds.x + bounds.width * 0.43, y: bounds.y + bounds.height * 0.29 };
    const initialTransform = await selected.getAttribute("transform");

    await page.mouse.move(first.x, first.y);
    await expect.poll(() => selected.getAttribute("transform")).not.toBe(initialTransform);

    await page.mouse.click(first.x, first.y);
    await expect(selected).toHaveAttribute("aria-pressed", "true");
    await expect(page.getByText("Point fixed", { exact: true })).toBeVisible();
    const pinnedTransform = await selected.getAttribute("transform");

    await page.mouse.move(second.x, second.y);
    await page.waitForTimeout(80);
    await expect(selected).toHaveAttribute("transform", pinnedTransform ?? "");

    await page.mouse.click(second.x, second.y);
    await expect(selected).toHaveAttribute("aria-pressed", "false");
    await expect(page.getByText("Point fixed", { exact: true })).toHaveCount(0);
    await expect(selected).toHaveAttribute("transform", pinnedTransform ?? "");

    await page.mouse.move(third.x, third.y);
    await expect.poll(() => selected.getAttribute("transform")).not.toBe(pinnedTransform);
  });
});

test.describe("Mutual-gain field touch input", () => {
  test.use({ hasTouch: true, isMobile: true, viewport: { width: 390, height: 844 } });

  test("fixes on the first tap and releases on the second tap", async ({ page }) => {
    await page.goto("/");

    const field = page.getByRole("img", { name: /Mutual-gain field/ });
    const selected = field.locator(selectedPointSelector);
    await field.scrollIntoViewIfNeeded();
    const bounds = await field.boundingBox();
    if (!bounds) throw new Error("Mutual-gain field has no rendered bounds.");

    const first = {
      x: Math.min(340, bounds.x + bounds.width * 0.25),
      y: bounds.y + bounds.height * 0.55,
    };
    const second = {
      x: Math.min(350, bounds.x + bounds.width * 0.72),
      y: bounds.y + bounds.height * 0.68,
    };

    await page.touchscreen.tap(first.x, first.y);
    await expect(selected).toHaveAttribute("aria-pressed", "true");
    await expect(page.getByText("Point fixed", { exact: true })).toBeVisible();
    const pinnedTransform = await selected.getAttribute("transform");

    await page.touchscreen.tap(second.x, second.y);
    await expect(selected).toHaveAttribute("aria-pressed", "false");
    await expect(page.getByText("Point fixed", { exact: true })).toHaveCount(0);
    await expect(selected).toHaveAttribute("transform", pinnedTransform ?? "");
  });
});
