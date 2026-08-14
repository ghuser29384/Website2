import { expect, test } from "@playwright/test";

test.describe("Retired explainer navigation", () => {
  test("omits How It Works and Trust from primary and footer navigation", async ({ page }) => {
    await page.goto("/what-is-moral-trade");

    const primary = page.getByRole("navigation", { name: "Primary" });
    await expect(primary.getByRole("link", { name: /how it works/i })).toHaveCount(0);
    await expect(primary.getByRole("link", { name: /^trust$/i })).toHaveCount(0);

    const footer = page.getByRole("navigation", { name: "Footer" });
    await expect(footer.getByRole("link", { name: /how it works/i })).toHaveCount(0);
    await expect(footer.getByRole("link", { name: /^trust$/i })).toHaveCount(0);
    await expect(footer.getByRole("heading", { name: /^trust$/i })).toHaveCount(0);
  });

  test("redirects the legacy Trust URL to Safety", async ({ page }) => {
    await page.goto("/trust");

    await expect(page).toHaveURL(/\/safety$/);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  });
});
