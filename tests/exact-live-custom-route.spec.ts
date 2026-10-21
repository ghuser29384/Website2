import { expect, test } from "@playwright/test";

for (const width of [1440, 390]) {
  test(`old planner state cannot restore removed homepage tools at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.addInitScript(() => localStorage.setItem("mt-plan-resources", JSON.stringify({ active: true })));
    await page.goto("/feed#plan");
    await expect(page.locator('[data-mt-live-now="adaptive"]')).toBeVisible();
    await expect(page.getByRole("button", { name: "Plan resources" })).toHaveCount(0);
    await expect(page.getByRole("heading", { name: "Suggested routes" })).toHaveCount(0);
    await expect(page.locator('[data-mt-custom-route], [data-mt-live-route-planner]')).toHaveCount(0);
    await page.getByRole("button", { name: "Create a trade" }).click();
    await expect(page).toHaveURL(/\/trades\/new$/);
    await expect(page.locator('iframe[title="Moral Trade Create"]')).toBeVisible();
  });
}

test("retired matching and group-buying entrances resolve into Discover", async ({ page, request }) => {
  for (const path of ["/background-networking", "/wish-registry"]) {
    const response = await request.get(path, { maxRedirects: 0 });
    expect(response.status()).toBe(307);
    expect(new URL(response.headers().location, response.url()).pathname).toBe("/discover");
  }
  await page.goto("/moral-goods-group-buying");
  await expect(page).toHaveURL(url => url.pathname === "/discover" && url.searchParams.get("offerKind") === "co-fund");
  await expect(page.getByLabel("Trade type", { exact: true })).toHaveValue("co-fund");
  await expect(page.getByRole("link", { name: "Private matching" })).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Advanced text directory" })).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Create a trade", exact: true }).first()).toHaveAttribute("href", "/trades/new");
});
