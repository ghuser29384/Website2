import { expect, test } from "@playwright/test";

for (const query of ["", "?message=Saved%20%26%20ready&tone=success", "?view=controls&filter=one&filter=two"]) {
  test(`Profile is a one-hop permanent alias preserving ${query || "the default view"}`, async ({ request }) => {
    const response = await request.get(`/profile${query}`, { maxRedirects: 0 });
    expect(response.status()).toBe(308);
    const target = new URL(response.headers().location, "http://127.0.0.1:3210");
    expect(target.pathname).toBe("/dashboard");
    expect([...target.searchParams.entries()]).toEqual([...new URLSearchParams(query).entries()]);
    expect(await response.text()).not.toContain('data-testid="profile-account"');
  });
}

for (const width of [1440, 390, 320]) {
  test(`signed-out Profile preserves Dashboard login destination at ${width}px`, async ({ page, context }, testInfo) => {
    await context.clearCookies();
    await page.setViewportSize({ width, height: 900 });
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto("/profile");
    await expect(page).toHaveURL((url) => url.pathname === "/login" && url.searchParams.get("returnTo") === "/dashboard");
    await expect(page).toHaveTitle(/Log in/);
    await expect(page.getByRole("heading", { name: "Welcome back", exact: true })).toBeVisible();
    await expect(page.getByTestId("profile-account")).toHaveCount(0);
    await expect(page.locator("nextjs-portal")).toHaveCount(0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
    await page.screenshot({ path: testInfo.outputPath(`profile-login-${width}.png`) });
    expect(errors).toEqual([]);
  });
}

test("the nested priority editor remains a separate supported endpoint", async ({ page }) => {
  await page.goto("/profile/priorities?returnTo=%2Ffeed");
  await expect(page).toHaveURL((url) => url.pathname === "/login");
  const editor = new URL(new URL(page.url()).searchParams.get("returnTo")!, "http://127.0.0.1:3210");
  expect(editor.pathname).toBe("/profile/priorities");
  expect(editor.searchParams.get("returnTo")).toBe("/feed");
});

test("Profile navigation opens the canonical account page", async ({ page }) => {
  await page.goto("/contact");
  const header = page.locator(".mt-refined-header").first();
  const profile = header.getByRole("link", { name: "Profile", exact: true });
  await expect(profile).toHaveCount(1);
  await expect(profile).toHaveAttribute("href", "/dashboard");
  await expect(header.getByRole("link", { name: "Dashboard", exact: true })).toHaveCount(0);
  await profile.click();
  await expect(page).toHaveURL((url) => url.pathname === "/login" && url.searchParams.get("returnTo") === "/dashboard");
});
