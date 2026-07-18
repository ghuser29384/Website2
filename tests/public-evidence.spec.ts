import { expect, test } from "@playwright/test";

const externalBase = (process.env.MORALTRADE_BASE_URL ?? "").replace(/\/$/, "");
const route = (path: string) => `${externalBase}${path}`;

test.describe("public evidence desk", () => {
  test("serves the public directory and the clearly labeled example", async ({ page }) => {
    await page.goto(route("/evidence"));
    await expect(page.getByRole("heading", { name: "Inspect the proof behind every trade." })).toBeVisible();
    await expect(page.getByRole("link", { name: /Open the example evidence desk/i })).toBeVisible();
    await expect(page.getByText("Interface example · not a live trade")).toBeVisible();
  });

  test("opens the proof timeline as a layer and jumps to linked evidence", async ({ page }) => {
    await page.goto(route("/evidence/example"));
    await expect(page.locator("[data-pe-desk]")).toBeVisible();

    const timelineToggle = page.locator("[data-pe-timeline-toggle]");
    const timeline = page.locator("[data-pe-timeline]");
    await timelineToggle.click();
    await expect(timelineToggle).toHaveAttribute("aria-expanded", "true");
    await expect(timeline).toHaveClass(/open/);

    await page.locator('[data-pe-open-evidence="payment"]').first().click();
    await expect(page.locator('[data-pe-document="payment"]')).toHaveClass(/active/);
    await expect(page.locator('[data-pe-inspector="payment"]')).toHaveClass(/active/);
    await expect(timelineToggle).toHaveAttribute("aria-expanded", "false");
    await expect(timeline).not.toHaveClass(/open/);

    await page.locator('.pe-desktop-list [data-pe-select="transit"]').click();
    await expect(page.locator('[data-pe-document="transit"]')).toHaveClass(/active/);
    await expect(page.locator('[data-pe-inspector="transit"]')).toHaveClass(/active/);
  });

  test("supports document selection and timeline interaction on mobile without horizontal overflow", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(route("/evidence/example"));

    await expect(page.locator(".pe-mobile-strip")).toBeVisible();
    await page.locator('.pe-mobile-strip [data-pe-select="routes"]').click();
    await expect(page.locator('[data-pe-document="routes"]')).toHaveClass(/active/);
    await expect(page.locator('[data-pe-inspector="routes"]')).toHaveClass(/active/);

    const timelineToggle = page.locator("[data-pe-timeline-toggle]");
    await timelineToggle.click();
    await expect(page.locator("[data-pe-timeline]")).toHaveClass(/open/);
    await page.keyboard.press("Escape");
    await expect(timelineToggle).toHaveAttribute("aria-expanded", "false");

    const dimensions = await page.evaluate(() => ({
      innerWidth: window.innerWidth,
      scrollWidth: document.documentElement.scrollWidth,
    }));
    expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.innerWidth + 1);
  });
});
