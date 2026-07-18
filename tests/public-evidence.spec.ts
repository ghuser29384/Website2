import { expect, test } from "@playwright/test";

const externalBase = (process.env.MORALTRADE_BASE_URL ?? "").replace(/\/$/, "");
const route = (path: string) => `${externalBase}${path}`;

test.describe("public evidence desk", () => {
  test("serves the public directory and the clearly labeled example", async ({ page }) => {
    await page.goto(route("/evidence"));
    await expect(page.getByRole("heading", { name: "Inspect the proof behind every trade." })).toBeVisible();
    await expect(page.getByRole("link", { name: /Open the Design 01 evidence stage/i })).toBeVisible();
    await expect(page.getByText("Interface example · not a live trade")).toBeVisible();
  });

  test("switches artifacts, explains privacy, and jumps from the proof timeline", async ({ page }) => {
    await page.goto(route("/evidence/example"));
    await expect(page.locator("[data-pe-desk]")).toBeVisible();

    const receiptArtifact = page.locator('[data-stage-artifact="receipt"]');
    await receiptArtifact.click();
    await expect(receiptArtifact).toHaveAttribute("aria-pressed", "true");
    await expect(page.getByRole("heading", { name: "THE GREEN TABLE" })).toBeVisible();

    await page.getByRole("button", { name: /Privacy-redacted/i }).click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await expect(page.getByText("Order and payment identifiers are masked")).toBeVisible();
    await page.getByRole("button", { name: "Done" }).click();

    const timelineToggle = page.locator("[data-stage-timeline-toggle]");
    await timelineToggle.click();
    await expect(timelineToggle).toHaveAttribute("aria-expanded", "true");
    const timeline = page.locator("[data-stage-timeline]");
    await expect(timeline).toBeVisible();

    const afterEvent = timeline.locator("article").filter({ hasText: "After-meal photo submitted" });
    await afterEvent.getByRole("button", { name: /Inspect linked evidence/i }).click();
    await expect(page.locator('[data-stage-artifact="after"]')).toHaveAttribute("aria-pressed", "true");
    await expect(timeline).toBeHidden();
  });

  test("keeps the immersive review usable on mobile without horizontal overflow", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(route("/evidence/example"));

    const afterArtifact = page.locator('[data-stage-artifact="after"]');
    await afterArtifact.click();
    await expect(afterArtifact).toHaveAttribute("aria-pressed", "true");
    await expect(page.getByRole("heading", { name: /Submitted under the agreed evidence rule/i })).toBeVisible();

    const timelineToggle = page.locator("[data-stage-timeline-toggle]");
    await timelineToggle.click();
    await expect(page.locator("[data-stage-timeline]")).toBeVisible();
    await page.getByRole("button", { name: "Close timeline" }).click();
    await expect(timelineToggle).toHaveAttribute("aria-expanded", "false");

    const dimensions = await page.evaluate(() => ({
      innerWidth: window.innerWidth,
      scrollWidth: document.documentElement.scrollWidth,
    }));
    expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.innerWidth + 1);
  });
});
