import { expect, test } from "@playwright/test";

test.setTimeout(90_000);

test("keeps the desktop Commitments brand inside its navigation column", async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  const response = await page.goto("/commitments", {
    timeout: 60_000,
    waitUntil: "domcontentloaded",
  });

  expect(response?.status() ?? 200).toBeLessThan(400);

  const sidebar = page.locator(".mt-v75-side-nav").first();
  const brand = page.locator(".mt-v75-side-brand .mt-v77-brand-wordmark").first();
  const workspace = page.locator(".mt-v75-route-workspace").first();
  const heading = page.locator("#commitments-heading");

  await expect(sidebar).toBeVisible({ timeout: 45_000 });
  await expect(brand).toBeVisible({ timeout: 45_000 });
  await expect(workspace).toBeVisible({ timeout: 45_000 });
  await expect(heading).toBeVisible({ timeout: 45_000 });
  await page.evaluate(() => document.fonts.ready);

  const geometry = await page.evaluate(() => {
    const rect = (selector: string) => {
      const element = document.querySelector<HTMLElement>(selector);
      if (!element) return null;
      const box = element.getBoundingClientRect();
      return {
        bottom: box.bottom,
        left: box.left,
        right: box.right,
        top: box.top,
      };
    };

    return {
      brand: rect(".mt-v75-side-brand .mt-v77-brand-wordmark"),
      heading: rect("#commitments-heading"),
      sidebar: rect(".mt-v75-side-nav"),
      workspace: rect(".mt-v75-route-workspace"),
    };
  });

  if (!geometry.brand || !geometry.heading || !geometry.sidebar || !geometry.workspace) {
    throw new Error("Commitments layout geometry was unavailable after the route rendered.");
  }

  expect(
    geometry.brand.right,
    "The complete Moral Trade brand must remain inside the desktop sidebar.",
  ).toBeLessThanOrEqual(geometry.sidebar.right + 1);
  expect(
    geometry.sidebar.right,
    "The desktop sidebar must end before the Commitments workspace begins.",
  ).toBeLessThanOrEqual(geometry.workspace.left + 1);
  expect(
    geometry.brand.right,
    "The sidebar brand must not collide with the Commitments heading.",
  ).toBeLessThanOrEqual(geometry.heading.left - 8);

  await page.screenshot({
    path: testInfo.outputPath("commitments-sidebar-spacing.png"),
    fullPage: false,
  });
});
