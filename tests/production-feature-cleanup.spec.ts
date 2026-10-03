import { expect, test } from "@playwright/test";

for (const width of [1440, 390, 320]) {
  test(`retired radar and learning-only controls at ${width}px`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height: 900 });
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto("/pools/radar?campaign=priya&amount=10", { waitUntil: "domcontentloaded" });
    await expect(page).toHaveURL(/\/pools$/);
    await expect(page.locator("main")).toBeVisible();
    await expect(page.getByText("Campaigns updating in real time", { exact: true })).toHaveCount(0);
    await expect(page.getByText("$23,640", { exact: true })).toHaveCount(0);

    await page.goto("/trade-controls", { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("heading", { name: "Counterfactual Integrity Check" })).toBeVisible();
    await expect(page.getByText("Learning demonstration only.", { exact: true })).toBeVisible();
    await expect(page.getByText(/These exercises do not configure a trade/)).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
    await page.screenshot({ path: testInfo.outputPath(`learning-${width}.png`), fullPage: true });
    expect(errors).toEqual([]);
  });

  test(`worked examples have a real draft link and no pretend checkout at ${width}px`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/offers/examples/seed-paul", { waitUntil: "domcontentloaded" });
    const summary = page.locator(".mt-v75-detail-object");
    await expect(summary).toBeVisible();
    await expect(summary.getByRole("link", { name: "Create a draft from this example" })).toHaveAttribute("href", /.+/);
    await expect(page.getByText("Review your plan", { exact: true })).toHaveCount(0);
    await expect(page.getByRole("button", { name: /preview amount/ })).toHaveCount(0);
    await expect(summary.getByRole("link", { name: /^(Save|Compare|Add to planner)$/ })).toHaveCount(0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
    for (const glyph of await summary.locator(".mt-v75-status-glyph").all()) {
      const bounds = await glyph.boundingBox();
      expect(bounds).not.toBeNull();
      expect(bounds!.width).toBeLessThanOrEqual(14);
      expect(bounds!.height).toBeLessThanOrEqual(14);
    }
    await summary.screenshot({ path: testInfo.outputPath(`example-${width}.png`) });
  });
}

test("review notes keep functional filters and distinct learning destinations", async ({ page }, testInfo) => {
  await page.goto("/reasoning-center", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { level: 1, name: "Worked-example review notes" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Draft review note" })).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Ask", exact: true })).toHaveCount(0);
  const paths = await page.getByRole("navigation", { name: "Learning navigation" }).locator("a").evaluateAll((links) => links.map((link) => link.getAttribute("href")));
  expect(new Set(paths).size).toBe(paths.length);
  expect(paths).toContain("/worked-examples");
  const filter = page.locator(".reasoning-tabs a").nth(1);
  const target = await filter.getAttribute("href");
  await filter.click();
  await expect(page).toHaveURL(new RegExp(target!.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "$"));
  await expect(page.locator(".reasoning-filter-summary")).toContainText("Showing");
  await page.screenshot({ path: testInfo.outputPath("review-notes.png"), fullPage: true });
});

test("fund presents experiment boundaries before operational records", async ({ page }, testInfo) => {
  await page.goto("/priority-correction-fund", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: "A separate allocation experiment." })).toBeVisible();
  const boundaries = page.locator("#experiment-terms");
  await expect(boundaries).toContainText("not consent to contribute");
  await expect(boundaries).toContainText("separately agreed terms");
  await expect(boundaries).toContainText("does not certify");
  await expect(boundaries.getByRole("link", { name: "Browse trades instead" })).toHaveAttribute("href", "/discover");
  await page.screenshot({ path: testInfo.outputPath("allocation-experiment.png"), fullPage: false });
});
