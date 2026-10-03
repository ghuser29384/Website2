import { expect, test } from "@playwright/test";

for (const width of [1440, 390, 320]) {
  test(`review evidence is not silently approved at ${width}px`, async ({ page }, testInfo) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/offers/examples/seed-paul", { waitUntil: "domcontentloaded" });
    await page.locator("summary").filter({ hasText: /^Screening and review context$/ }).click();
    const cards = page.locator(".review-workflow-grid");
    await expect(cards).toBeVisible();
    await expect(cards.locator(".review-workflow-status", { hasText: /^(pass|reviewed|approved)$/i })).toHaveCount(0);
    await expect(cards.getByText("Awaiting reviewer", { exact: true }).first()).toBeVisible();
    await expect(cards).toContainText("Participant-stated context");
    await expect(page.getByText("Review your plan", { exact: true })).toHaveCount(0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
    await cards.screenshot({ path: testInfo.outputPath(`review-assessment-${width}.png`) });
  });
}

test("old plane bookmarks and API clearly retire the inferred ranking", async ({ page, request }) => {
  const retired = await request.get("/api/offers/plane");
  expect(retired.status()).toBe(410); expect(await retired.json()).toEqual({ available: false, reason: "The heuristic offer plane is retired.", browseHref: "/discover" });
  const planeRequests: string[] = [];
  page.on("request", (request) => { if (new URL(request.url()).pathname === "/api/offers/plane") planeRequests.push(request.url()); });
  await page.goto("/offers/plane?minReturn=90");
  await expect(page).toHaveURL((url) => url.pathname === "/discover" && !url.searchParams.has("minReturn"));
  await expect(page.getByRole("heading", { name: "Browse trades" })).toBeVisible();
  await expect(page.locator("#challenge-return-explorer")).toHaveCount(0);
  expect(planeRequests).toEqual([]);
});
