import { expect, test } from "@playwright/test";

for (const width of [1440, 390, 320]) {
  test(`Messages protects private content and fits ${width}px`, async ({ page, context }) => {
    await context.clearCookies();
    await page.setViewportSize({ width, height: 900 });
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));

    await page.goto("/messages?view=updates");
    await expect(page).toHaveTitle(/Messages.*Moral Trade/);
    await expect(page.getByRole("heading", { name: "Messages", exact: true })).toBeVisible();
    await expect(page.getByRole("navigation", { name: "Marketplace sections" })).toHaveCount(0);
    await expect(page.getByRole("list", { name: "Conversations", exact: true })).toHaveCount(0);
    await expect(page.getByRole("list", { name: "Recent trade updates" })).toHaveCount(0);
    await expect(page.locator("[data-nextjs-dialog-overlay]")).toHaveCount(0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);

    const main = page.locator("main");
    const signIn = main.getByRole("link", { name: "Sign in", exact: true });
    if (await signIn.count()) {
      const href = await signIn.getAttribute("href");
      expect(new URL(href!, "https://example.test").searchParams.get("returnTo")).toBe("/messages?view=updates");
      await signIn.click();
      await expect(page).toHaveURL(/\/login\?/);
    } else {
      await expect(main.getByRole("heading", { name: "Messages unavailable" })).toBeVisible();
      await expect(main.getByRole("link", { name: "Browse offers" })).toHaveAttribute("href", "/offers");
    }
    expect(errors).toEqual([]);
  });
}
