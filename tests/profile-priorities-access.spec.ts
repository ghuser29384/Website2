import { writeFile } from "node:fs/promises";
import { expect, test } from "@playwright/test";

for (const width of [1440, 390, 320]) {
  for (const route of ["/profile", "/complete-profile"]) {
    test(`100 Sparks is discoverable from ${route} at ${width}px`, async ({ page, context }, testInfo) => {
      await context.clearCookies();
      await page.setViewportSize({ width, height: 900 });
      const errors: string[] = [];
      const consoleErrors: string[] = [];
      page.on("pageerror", (error) => errors.push(error.message));
      page.on("console", (message) => {
        if (message.type() === "error") consoleErrors.push(message.text());
      });

      await page.goto(route, { waitUntil: "domcontentloaded" });
      await expect(page).toHaveURL((url) => url.pathname === route);
      await expect(page).toHaveTitle(/profile.*Moral Trade/i);
      const card = page.getByTestId("profile-priorities-card");
      await expect(card.getByRole("heading", { name: "100 Sparks", exact: true })).toBeVisible();
      const action = card.getByRole("link", { name: "Adjust priorities", exact: true });
      await expect(action).toBeVisible();
      await expect(action).toHaveCSS("color", "rgb(255, 255, 255)");
      await expect(action).toHaveCSS("background-color", "rgb(36, 69, 199)");
      await expect(action).toHaveAttribute("href", `/profile/priorities?returnTo=${encodeURIComponent(route)}`);
      expect(await card.evaluate((node) => node.closest("details, form") === null)).toBe(true);
      expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
      const actionBox = await action.boundingBox();
      expect(actionBox).not.toBeNull();
      expect(actionBox!.height).toBeGreaterThanOrEqual(44);
      await expect(page.locator("nextjs-portal")).toHaveCount(0);
      await page.screenshot({ path: testInfo.outputPath(`100-sparks-${route.slice(1)}-${width}.png`), fullPage: true });

      // The entry is visible to everyone; private allocation still requires authentication.
      await action.focus();
      await page.keyboard.press("Enter");
      await expect(page).toHaveURL((url) => url.pathname === "/login");
      const login = new URL(page.url());
      const editor = new URL(login.searchParams.get("returnTo")!, login.origin);
      expect(editor.pathname).toBe("/profile/priorities");
      expect(editor.searchParams.get("returnTo")).toBe(route);
      expect(errors).toEqual([]);
      await writeFile(testInfo.outputPath("console-errors.json"), JSON.stringify(consoleErrors, null, 2));
      expect(consoleErrors).toEqual([]);
    });
  }
}

for (const target of [undefined, "/complete-profile", "https://example.com", "//example.com"]) {
  test(`100-sparks entry preserves a safe return destination: ${target ?? "default"}`, async ({ page }) => {
    const query = target ? `?returnTo=${encodeURIComponent(target)}` : "";
    await page.goto(`/100-sparks${query}`);
    await expect(page).toHaveURL((url) => url.pathname === "/login");
    const login = new URL(page.url());
    const editor = new URL(login.searchParams.get("returnTo")!, login.origin);
    expect(editor.pathname).toBe("/profile/priorities");
    expect(editor.searchParams.get("returnTo")).toBe(target === "/complete-profile" ? target : "/profile");
  });
}

test("Profile displays returned priority feedback", async ({ page }) => {
  const message = "Priorities saved. Your feed now uses the new 100-spark allocation.";
  await page.goto(`/profile?message=${encodeURIComponent(message)}`);
  await expect(page.getByRole("status").filter({ hasText: message })).toBeVisible();
  await expect(page.getByTestId("profile-priorities-card")).toBeVisible();
});

for (const width of [1440, 390, 320]) {
  test(`Profile account section stays compact and role details remain accessible at ${width}px`, async ({ page, context }, testInfo) => {
    await context.clearCookies();
    await page.setViewportSize({ width, height: 900 });
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    page.on("console", (message) => {
      if (message.type() === "error") errors.push(message.text());
    });
    await page.goto("/profile");
    await expect(page).toHaveTitle("Profile | Moral Trade");
    const account = page.getByTestId("profile-account");
    const heading = account.getByRole("heading", { name: "Account", exact: true });
    await expect(heading).toBeVisible();
    await expect(heading).toHaveCSS("font-size", "18px");
    const details = account.locator("details");
    const summary = details.locator("summary");
    await expect(summary).toHaveText("Role details");
    expect(await details.evaluate((node) => (node as HTMLDetailsElement).open)).toBe(false);
    await expect(account.getByText("Trust data unavailable", { exact: true })).not.toBeVisible();
    await expect(account.locator(".deal-economics-grid, .commitment-status, .button-primary")).toHaveCount(0);
    const settings = account.getByRole("link", { name: "Sign in to continue", exact: true });
    await expect(settings).toHaveAttribute("href", "/login?returnTo=/profile");
    await expect(settings).toHaveCSS("background-color", "rgb(255, 255, 255)");
    await expect(account.getByRole("link", { name: "Back to offers", exact: true })).toHaveAttribute("href", "/offers");
    expect((await settings.boundingBox())!.height).toBeGreaterThanOrEqual(44);
    expect((await account.boundingBox())!.height).toBeLessThan(width > 540 ? 180 : 280);
    const priorities = await page.getByTestId("profile-priorities-card").boundingBox();
    expect((await account.boundingBox())!.y).toBeGreaterThan(priorities!.y + priorities!.height);
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
    await page.screenshot({ path: testInfo.outputPath(`profile-account-${width}-collapsed.png`), fullPage: true });
    await account.screenshot({ path: testInfo.outputPath(`account-${width}-collapsed.png`) });
    await summary.focus();
    await page.keyboard.press("Enter");
    await expect(details).toHaveAttribute("open", "");
    await expect(account.getByText("Trust data unavailable", { exact: true })).toBeVisible();
    await expect(account.getByText("Not used", { exact: true })).toBeVisible();
    await expect(account.getByText("Review when creating", { exact: true })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
    await account.screenshot({ path: testInfo.outputPath(`account-${width}-expanded.png`) });
    await page.keyboard.press("Space");
    expect(await details.evaluate((node) => (node as HTMLDetailsElement).open)).toBe(false);
    await settings.click();
    await expect(page).toHaveURL((url) => url.pathname === "/login" && url.searchParams.get("returnTo") === "/profile");
    await expect(page.locator("nextjs-portal")).toHaveCount(0);
    await writeFile(testInfo.outputPath("account-browser-errors.json"), JSON.stringify(errors, null, 2));
    expect(errors).toEqual([]);
  });
}
