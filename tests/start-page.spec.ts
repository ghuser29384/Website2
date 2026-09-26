import { expect, test } from "@playwright/test";

const expectedPaths = [
  { title: "Make a donation", href: "/donate" },
  { title: "Create a trade", href: "/signup?returnTo=/create" },
  { title: "Explore funding pools", href: "/pools" },
  { title: "Browse trades", href: "/offers?view=live" },
];

test.beforeEach(async ({ context, baseURL }) => {
  if (!baseURL) throw new Error("The Start page tests require the configured app origin.");
  await context.addCookies([{ name: "mt_analytics_opt_out", value: "1", url: baseURL, sameSite: "Lax" }]);
});

for (const width of [1440, 390, 320]) {
  test(`the compact Start chooser is readable and keyboard-operable at ${width}px`, async ({ page }, testInfo) => {
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
    await page.setViewportSize({ width, height: 900 });
    const response = await page.goto("/start");
    expect(response?.status()).toBe(200);
    await expect(page).toHaveTitle("Get started | Moral Trade");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Get started");
    const main = page.getByRole("main");
    const choices = page.getByRole("navigation", { name: "Ways to get started" });
    await expect(choices.getByRole("link")).toHaveCount(4);
    for (const path of expectedPaths) {
      const link = choices.getByRole("link", { name: path.title, exact: true });
      await expect(link).toHaveAttribute("href", path.href);
      await expect(link).toBeVisible();
      const box = await link.boundingBox();
      expect(box!.height).toBeGreaterThanOrEqual(44);
      expect(box!.x).toBeGreaterThanOrEqual(0);
      expect(box!.x + box!.width).toBeLessThanOrEqual(width + 1);
    }
    await expect(page.getByRole("complementary", { name: "Current service state" })).toHaveCount(0);
    await expect(page.locator(".growth-progress-card, .growth-start-grid, .mt-site-footer")).toHaveCount(0);
    await expect(main).not.toContainText("Four live paths");
    await expect(main).not.toContainText("Use the strongest current route");
    expect((await main.innerText()).split(/\s+/).length).toBeLessThan(100);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width + 1);
    await expect(page.locator("nextjs-portal")).toHaveCount(0);

    const details = main.locator("details");
    const summary = details.locator("summary");
    const serviceLink = details.getByRole("link", { name: "Review service boundaries" });
    await expect(serviceLink).toBeHidden();
    await page.screenshot({ path: testInfo.outputPath(`start-${width}.png`), fullPage: true });
    await summary.focus();
    await page.keyboard.press("Enter");
    await expect(serviceLink).toBeVisible();
    await expect(details).toContainText("Moral Trade does not hold funds");
    await expect(details).toContainText("cancellation rules before accepting");
    await expect(details).toContainText("not automatically reviewed or verified");
    await page.keyboard.press("Enter");
    await expect(serviceLink).toBeHidden();

    const browse = choices.getByRole("link", { name: "Browse trades", exact: true });
    await browse.focus();
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(/\/discover(?:\?|$)/);
    await expect(page.getByRole("heading", { level: 1, name: "Browse trades" })).toBeVisible();
    expect(errors).toEqual([]);
  });
}

test("the four paths and safeguards work without client JavaScript", async ({ browser, baseURL }) => {
  const context = await browser.newContext({ javaScriptEnabled: false, baseURL });
  try {
    const page = await context.newPage();
    await page.goto("/start");
    const choices = page.getByRole("navigation", { name: "Ways to get started" });
    await expect(choices.getByRole("link")).toHaveCount(4);
    await page.getByText("Before you commit", { exact: true }).click();
    await expect(page.getByRole("link", { name: "Review service boundaries" })).toBeVisible();
    await choices.getByRole("link", { name: "Create a trade", exact: true }).click();
    await expect(page).toHaveURL(/\/signup\?returnTo=\/create$/);
  } finally {
    await context.close();
  }
});
