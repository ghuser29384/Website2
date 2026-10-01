import { expect, test } from "@playwright/test";

for (const width of [1440, 390, 320]) {
  for (const available of [false, true]) {
    test(`conditional Evidence navigation at ${width}px: ${available}`, async ({ page }, info) => {
      await page.setViewportSize({ width, height: 1000 });
      await page.route("**/api/navigation/evidence", (route) => route.fulfill({ json: { available } }));
      const errors: string[] = [];
      page.on("pageerror", (error) => errors.push(error.message));
      await page.goto("/contact");
      await expect(page).toHaveTitle(/Contact/);
      const header = page.locator(".mt-site-topbar");
      const trigger = header.locator("summary").filter({ hasText: "More" });
      await trigger.focus();
      await page.keyboard.press("Enter");
      await expect(header.getByRole("link", { name: "Evidence", exact: true })).toHaveCount(available ? 1 : 0);
      await expect(header.getByRole("link", { name: "Tour", exact: true })).toBeVisible();
      await page.keyboard.press("Escape");
      await expect(trigger).toBeFocused();
      const footer = page.locator(".mt-site-footer");
      await expect(footer.locator(".mt-footer-links li a")).toHaveCount(available ? 15 : 14);
      await expect(footer.getByRole("link", { name: "Safety", exact: true })).toBeAttached();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
      await header.screenshot({ path: info.outputPath(`header-${width}-${available}.png`) });
      await footer.screenshot({ path: info.outputPath(`footer-${width}-${available}.png`) });
      await page.goto("/feed");
      await page.locator(".header-more > summary").click();
      await expect(page.locator(".header-more").getByRole("link", { name: "Evidence", exact: true })).toHaveCount(available ? 1 : 0);
      await page.goto("/discover");
      await expect(page.locator(".discover-footer a[href='/evidence']")).toHaveCount(available ? 1 : 0);
      expect(errors).toEqual([]);
    });
  }
}

test("About redirects straight to the feed and Profile retains the existing Dashboard alias", async ({ request, page }) => {
  const response = await request.get("/about", { maxRedirects: 0 });
  expect(response.status()).toBe(308);
  expect(response.headers().location).toBe("/feed");
  const profile = await request.get("/profile?notice=saved", { maxRedirects: 0 });
  expect(profile.status()).toBe(308);
  expect(profile.headers().location).toContain("/dashboard?notice=saved");
  await page.goto("/about");
  await expect(page).toHaveURL(/\/feed$/);
  await expect(page.getByRole("heading", { name: "A service for cooperation across moral disagreement." })).toHaveCount(0);
});

test("failed availability requests hide only Evidence, not native search or account navigation", async ({ page }) => {
  await page.route("**/api/navigation/evidence", (route) => route.abort("failed"));
  await page.goto("/contact");
  const header = page.locator(".mt-site-topbar");
  await header.locator("summary").filter({ hasText: "More" }).click();
  await expect(header.locator("a[href='/evidence']")).toHaveCount(0);
  await expect(header.locator("a[href='/dashboard']")).toBeVisible();
  await expect(header.locator("a[href='/cart']")).toHaveCount(1);
  await expect(header.locator("form[role='search']")).toHaveAttribute("action", "/offers");
});

test("without JavaScript the retired About route and remaining navigation still work", async ({ browser, baseURL }) => {
  const context = await browser.newContext({ javaScriptEnabled: false, baseURL });
  const page = await context.newPage();
  try {
    await page.goto("/contact");
    await expect(page.locator(".mt-site-topbar a[href='/evidence']")).toHaveCount(0);
    await expect(page.locator(".mt-site-footer a[href='/evidence']")).toHaveCount(0);
    await expect(page.locator(".mt-site-topbar a[href='/feed']")).toBeVisible();
  } finally { await context.close(); }
});


test("the real HTTP availability route exposes only one uncached boolean", async ({ request }) => {
  const response = await request.get("/api/navigation/evidence", { headers: { Cookie: "unrelated=1" } });
  expect(response.status()).toBe(200);
  expect(response.headers()["cache-control"]).toContain("no-store");
  const body = await response.json();
  expect(Object.keys(body)).toEqual(["available"]);
  expect(typeof body.available).toBe("boolean");
});

for (const path of ["/contact", "/feed", "/discover"]) {
  test(`Evidence starts hidden and disappears again when availability is withdrawn at ${path}`, async ({ page }) => {
    let available = false;
    await page.route("**/api/navigation/evidence", (route) => route.fulfill({ json: { available } }));
    await page.goto(path);
    const links = path === "/contact" ? page.locator(".mt-site-topbar a[href='/evidence'], .mt-site-footer a[href='/evidence']")
      : path === "/feed" ? page.locator(".header-more a[href='/evidence']")
      : page.locator(".discover-footer a[href='/evidence']");
    await expect(links).toHaveCount(0);
    available = true;
    await expect.poll(async () => {
      await page.evaluate(() => window.dispatchEvent(new Event("focus")));
      return links.count();
    }).toBe(path === "/contact" ? 2 : 1);
    available = false;
    await expect.poll(async () => {
      await page.evaluate(() => window.dispatchEvent(new Event("focus")));
      return links.count();
    }).toBe(0);
  });
}
