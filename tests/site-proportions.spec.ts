import { expect, test } from "@playwright/test";

// Cover both ordinary editorial pages and the legacy marketplace frame that
// previously clipped the full-width navigation on desktop.
for (const width of [1440, 390]) {
  for (const route of ["/faq", "/evidence", "/connectors"]) {
    test(`${route} has balanced headings and visible navigation at ${width}px`, async ({ page, context, baseURL }) => {
      await context.addCookies([{ name: "mt_analytics_opt_out", value: "1", url: baseURL!, sameSite: "Lax" }]);
      await page.setViewportSize({ width, height: 1000 });
      await page.goto(route);
      await expect(page.locator("h1")).toBeVisible();
      await expect.poll(() => page.locator("h1").evaluate((heading) => parseFloat(getComputedStyle(heading).fontSize))).toBeLessThanOrEqual(48);
      await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width + 1);

      const brand = page.getByRole("navigation", { name: "Primary" }).getByRole("link", { name: "Moral Trade, home" });
      await expect(brand).toBeVisible();
      expect(await brand.evaluate((element) => {
        const rect = element.getBoundingClientRect();
        const hit = document.elementFromPoint(rect.left + 2, rect.top + rect.height / 2);
        return rect.left >= 0 && rect.right <= innerWidth && hit !== null && element.contains(hit);
      })).toBe(true);

      const more = page.locator(".topbar-menu").filter({ has: page.locator("summary", { hasText: "More" }) });
      await more.locator("summary").click();
      await expect(more.locator(".topbar-menu-panel")).toBeVisible();
      await expect(more.getByRole("link", { name: "Safety", exact: true })).toBeVisible();
    });
  }
}
