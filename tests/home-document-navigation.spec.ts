import { expect, test, type Page } from "@playwright/test";

function observeNavigation(page: Page) {
  const errors: string[] = [];
  const failedResponses: string[] = [];
  const homepageRsc: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  page.on("response", (response) => {
    if (response.status() >= 400) failedResponses.push(`${response.status()} ${response.url()}`);
  });
  page.on("request", (request) => {
    const url = new URL(request.url());
    if (url.pathname === "/" && (url.searchParams.has("_rsc") || request.headers().rsc === "1")) {
      homepageRsc.push(request.url());
    }
  });
  return { errors, failedResponses, homepageRsc };
}

const homeEntries = [
  { name: "breadcrumb", route: "/faq", selector: '.breadcrumbs a[href="/"]', title: /FAQ/ },
  { name: "header brand", route: "/contact", selector: '.mt-brand-link[href="/"]', title: /Contact/ },
  { name: "footer brand", route: "/contact", selector: '.mt-footer-brand[href="/"]', title: /Contact/ },
  { name: "login brand", route: "/login", selector: 'a[aria-label="Moral Trade, home"]:visible', title: /Log in/ },
];

for (const width of [1440, 390, 320]) {
  for (const entry of homeEntries) {
    test(`${entry.name} uses clean homepage document navigation at ${width}px`, async ({ page }, testInfo) => {
      await page.setViewportSize({ width, height: 900 });
      const observed = observeNavigation(page);
      await page.goto(entry.route);
      await expect(page).toHaveTitle(entry.title);
      await expect(page.locator("h1")).toBeVisible();
      const home = page.locator(entry.selector).first();
      await expect(home).toBeVisible();
      await home.hover();
      // Negative assertion: allow the production idle/hover prefetch queue to run.
      await page.waitForTimeout(2000);
      expect(observed.homepageRsc).toEqual([]);
      const navigation = page.waitForRequest((request) => request.isNavigationRequest()
        && request.frame() === page.mainFrame() && new URL(request.url()).pathname === "/");
      if (width === 320) { await home.focus(); await home.press("Enter"); }
      else await home.click();
      const request = await navigation;
      expect(request.resourceType()).toBe("document");
      await expect(page).toHaveURL((url) => url.pathname === "/" && !url.searchParams.has("_rsc"));
      await expect(page.locator(".mt-refined-header").first()).toBeVisible();
      await expect(page.locator('button[data-now="focus"]')).toBeVisible();
      await page.locator('button[data-now="plan"]').click();
      await expect(page.locator('button[data-now="plan"]')).toHaveClass(/active/);
      await expect(page.locator("nextjs-portal")).toHaveCount(0);
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
      await page.screenshot({ path: testInfo.outputPath(`home-${entry.name.replaceAll(" ", "-")}-${width}.png`) });
      await page.goBack();
      await expect(page).toHaveURL((url) => url.pathname === entry.route);
      await expect(page).toHaveTitle(entry.title);
      await testInfo.attach("navigation-observations", { body: JSON.stringify(observed), contentType: "application/json" });
      expect(observed.homepageRsc).toEqual([]);
      expect(observed.failedResponses).toEqual([]);
      expect(observed.errors).toEqual([]);
    });
  }

  test(`Profile and login remain console-clean at ${width}px`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height: 900 });
    const observed = observeNavigation(page);
    await page.goto("/profile");
    await expect(page).toHaveURL((url) => url.pathname === "/login" && url.searchParams.get("returnTo") === "/dashboard");
    await expect(page.getByRole("heading", { name: "Welcome back", exact: true })).toBeVisible();
    await page.waitForTimeout(2000);
    await page.goto("/contact");
    const header = page.locator(".mt-refined-header").first();
    const profile = header.getByRole("link", { name: "Profile", exact: true });
    await expect(profile).toHaveCount(1);
    await expect(profile).toHaveAttribute("href", "/dashboard");
    await profile.click();
    await expect(page).toHaveURL((url) => url.pathname === "/login" && url.searchParams.get("returnTo") === "/dashboard");
    await expect(page).toHaveTitle(/Log in/);
    await page.waitForTimeout(2000);
    await expect(page.locator("nextjs-portal")).toHaveCount(0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
    await page.screenshot({ path: testInfo.outputPath(`profile-login-${width}.png`) });
    await testInfo.attach("navigation-observations", { body: JSON.stringify(observed), contentType: "application/json" });
    expect(observed.homepageRsc).toEqual([]);
    expect(observed.failedResponses).toEqual([]);
    expect(observed.errors).toEqual([]);
  });
}
