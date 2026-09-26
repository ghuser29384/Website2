import { expect, test } from "@playwright/test";

for (const width of [1440, 390, 320]) {
  test(`Get Started presents two clear guest paths at ${width}px`, async ({ page }, testInfo) => {
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    page.on("console", (message) => {
      if (message.type() === "error") errors.push(message.text());
    });

    await page.setViewportSize({ width, height: width === 1440 ? 1000 : 844 });
    const response = await page.goto("/start", { waitUntil: "domcontentloaded" });
    expect(response?.status() ?? 200).toBeLessThan(400);
    await expect(page).toHaveTitle("Get started | Moral Trade");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(
      "Is this your first time here?",
    );

    const chooser = page.getByRole("navigation", { name: "Choose how to continue" });
    const review = chooser.getByRole("link", { name: /Yes — or I want a review/ });
    const login = chooser.getByRole("link", { name: /No — I know the main features/ });
    await expect(chooser.getByRole("link")).toHaveCount(2);
    await expect(review).toHaveAttribute("href", "/walkthrough");
    await expect(login).toHaveAttribute("href", "/login");
    await expect(page.getByRole("link", { name: "Get started", exact: true })).toHaveCount(0);

    for (const link of [review, login]) {
      await expect(link).toBeVisible();
      const box = await link.boundingBox();
      expect(box).not.toBeNull();
      expect(box!.height).toBeGreaterThanOrEqual(44);
      expect(box!.x).toBeGreaterThanOrEqual(0);
      expect(box!.x + box!.width).toBeLessThanOrEqual(width + 1);
    }

    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
      width + 1,
    );
    await expect(page.locator("nextjs-portal")).toHaveCount(0);
    await page.screenshot({ path: testInfo.outputPath(`get-started-${width}.png`), fullPage: true });
    expect(errors).toEqual([]);
  });
}

test("the review choice opens the full walkthrough", async ({ page }) => {
  await page.goto("/start");
  await page.getByRole("link", { name: /Yes — or I want a review/ }).click();
  await expect.poll(() => new URL(page.url()).pathname).toBe("/walkthrough");
});

test("the informed-user choice opens login", async ({ page }) => {
  await page.goto("/start");
  await page.getByRole("link", { name: /No — I know the main features/ }).click();
  await expect.poll(() => new URL(page.url()).pathname).toBe("/login");
});

test("the decision works without client JavaScript", async ({ browser, baseURL }) => {
  const context = await browser.newContext({ baseURL, javaScriptEnabled: false });
  try {
    const page = await context.newPage();
    await page.goto("/start");
    const chooser = page.getByRole("navigation", { name: "Choose how to continue" });
    await expect(chooser.getByRole("link")).toHaveCount(2);
    await chooser.getByRole("link", { name: /No — I know the main features/ }).click();
    await expect(page).toHaveURL(/\/login(?:\?|$)/);
  } finally {
    await context.close();
  }
});
