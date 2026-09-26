import { expect, test, type Page } from "@playwright/test";

async function expectCanonicalBrand(page: Page) {
  const brand = page.locator('[data-mt-brand-canonical="true"]').first();
  await expect(brand).toBeVisible({ timeout: 10_000 });
  await expect(brand.locator(".mt-canonical-wordmark-label")).toHaveText("Moral Trade");
  await expect(brand.locator(".mt-canonical-compact-mark")).toBeVisible();
  await expect(brand.locator('path[d="M160 784 784 160 864 240 240 864Z"]')).toHaveCount(1);
  await expect(brand.locator('path[d="M80 784h160v160H80z"]')).toHaveCount(1);
  await expect(brand.locator('path[d="M784 80h160v160H784z"]')).toHaveAttribute("fill", "#3158ff");

  const typography = await brand.locator(".mt-canonical-wordmark-label").evaluate((element) => {
    const styles = getComputedStyle(element);
    return {
      family: styles.fontFamily.toLowerCase(),
      weight: styles.fontWeight,
      decoration: styles.textDecorationLine,
    };
  });

  expect(typography.family).not.toContain("mono");
  expect(typography.weight).toBe("400");
  expect(typography.decoration).toBe("none");
}

test.describe("canonical Moral Trade brand", () => {
  test("replaces the legacy live-interface wordmark", async ({ page }) => {
    await page.goto("/moral-trade-live.html", { waitUntil: "domcontentloaded" });
    await expectCanonicalBrand(page);
  });

  test("replaces the legacy Discover wordmark", async ({ page }) => {
    await page.goto("/moral-trade-discover.html", { waitUntil: "domcontentloaded" });
    await expectCanonicalBrand(page);
  });

  test("adapts the compact mark and sans wordmark to dark and light headers", async ({ page }) => {
    await page.setContent(`
      <header style="background:#050505;color:#1f3ee7;padding:20px">
        <a class="brand" href="/"><span aria-hidden="true"></span><span>Moral Trade</span></a>
      </header>
      <header style="background:#ffffff;color:#1f3ee7;padding:20px">
        <a class="brand" href="/"><span aria-hidden="true"></span><span>Moral Trade</span></a>
      </header>
    `);
    await page.addScriptTag({ url: "http://127.0.0.1:3210/moral-trade-brand.js" });

    const brands = page.locator('[data-mt-brand-canonical="true"]');
    await expect(brands).toHaveCount(2);
    await expect(brands.nth(0)).toHaveCSS("color", "rgb(255, 255, 255)");
    await expect(brands.nth(1)).toHaveCSS("color", "rgb(23, 24, 21)");
  });
});
