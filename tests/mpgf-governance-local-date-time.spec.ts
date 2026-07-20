import { expect, test } from "@playwright/test";

const roundStart = 'time[datetime="2026-05-01T00:00:00.000Z"]';

test.describe("MPGF governance dates in America/Los_Angeles", () => {
  test.use({ timezoneId: "America/Los_Angeles" });

  test("renders the public round start on the visitor's prior calendar day", async ({ page }) => {
    await page.goto("/mpgf/governance", { waitUntil: "domcontentloaded" });

    const start = page.locator(roundStart);
    await expect(start).toHaveCount(1);
    await expect(start).toHaveAttribute("datetime", "2026-05-01T00:00:00.000Z");
    await expect(start).toHaveText("Apr 30, 2026");
  });
});

test.describe("MPGF governance dates in Asia/Tokyo", () => {
  test.use({ timezoneId: "Asia/Tokyo" });

  test("renders the public round start on the visitor's local calendar day", async ({ page }) => {
    await page.goto("/mpgf/governance", { waitUntil: "domcontentloaded" });

    const start = page.locator(roundStart);
    await expect(start).toHaveCount(1);
    await expect(start).toHaveAttribute("datetime", "2026-05-01T00:00:00.000Z");
    await expect(start).toHaveText("May 1, 2026");
  });
});
