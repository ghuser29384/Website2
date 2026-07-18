import { expect, test, type Page } from "@playwright/test";

const storageKey = "mt_live_itinerary_v1";

async function openCleanNow(page: Page) {
  await page.goto("/moral-trade-live.html#now", { waitUntil: "domcontentloaded" });
  await page.evaluate((key) => window.localStorage.removeItem(key), storageKey);
  await page.reload({ waitUntil: "domcontentloaded" });
  await expect(page.locator(".itinerary")).toBeVisible();
}

async function openEditor(page: Page) {
  const itinerary = page.locator(".itinerary");
  await itinerary.getByRole("button", { name: "Edit", exact: true }).click();
  await expect(itinerary).toHaveClass(/mt-itinerary-editing/);
  await expect(itinerary.locator(".mt-itinerary-edit-step")).toHaveCount(3);
  return itinerary;
}

test.describe("exact live inline itinerary editor", () => {
  test("edits in place, supports draft controls, and cancels without changing the plan", async ({ page }) => {
    await openCleanNow(page);
    const itinerary = await openEditor(page);

    await expect(itinerary.getByRole("heading", { name: "Your itinerary" })).toBeVisible();
    await expect(itinerary.getByText("All changes saved", { exact: true })).toBeVisible();

    const firstTitle = itinerary.locator('[data-mt-itinerary-field="title"]').first();
    await firstTitle.fill("Temporary redirected donation");
    await expect(itinerary.getByText("Unsaved changes", { exact: true })).toBeVisible();

    await itinerary.getByRole("button", { name: "Add an action" }).click();
    await expect(itinerary.locator(".mt-itinerary-edit-step")).toHaveCount(4);
    await itinerary.getByRole("button", { name: "Delete action 4" }).click();
    await expect(itinerary.locator(".mt-itinerary-edit-step")).toHaveCount(3);

    await itinerary.getByRole("button", { name: "Cancel" }).click();
    await expect(itinerary).not.toHaveClass(/mt-itinerary-editing/);
    await expect(itinerary.getByText("Redirect $20 of political donations", { exact: true })).toBeVisible();
    await expect(itinerary.getByText("Temporary redirected donation", { exact: true })).toHaveCount(0);
  });

  test("saves titles, amounts, dates, proof rules, and order across reloads", async ({ page }) => {
    await openCleanNow(page);
    let itinerary = await openEditor(page);

    const titles = itinerary.locator('[data-mt-itinerary-field="title"]');
    await titles.nth(0).fill("Redirect $25 of political donations");
    await itinerary.locator('[data-mt-itinerary-field="amount"]').nth(0).fill("25");
    await itinerary.locator('[data-mt-itinerary-field="date"]').nth(0).fill("2026-08-02");

    const firstRule = itinerary.locator(".mt-itinerary-proof").first();
    await firstRule.locator("summary").click();
    await firstRule.locator('[data-mt-itinerary-field="proof"]').fill("A dated donation redirect receipt.");

    await itinerary.getByRole("button", { name: "Move action 2 up" }).click();
    await expect(itinerary.locator('[data-mt-itinerary-field="title"]').first()).toHaveValue(
      "Fund a verified research review",
    );

    await itinerary.getByRole("button", { name: "Save itinerary" }).click();
    await expect(itinerary).not.toHaveClass(/mt-itinerary-editing/);
    await expect(itinerary.locator(".mt-itinerary-read-copy h4").first()).toHaveText(
      "Fund a verified research review",
    );
    await expect(itinerary.getByText("Redirect $25 of political donations", { exact: true })).toBeVisible();
    await expect(itinerary.getByText("$25 · Aug 2", { exact: true })).toBeVisible();

    const stored = await page.evaluate((key) => JSON.parse(window.localStorage.getItem(key) || "null"), storageKey);
    expect(stored).toMatchObject({
      version: 1,
      steps: expect.arrayContaining([
        expect.objectContaining({
          title: "Redirect $25 of political donations",
          amount: 25,
          date: "2026-08-02",
          proof: "A dated donation redirect receipt.",
        }),
      ]),
    });

    await page.reload({ waitUntil: "domcontentloaded" });
    itinerary = page.locator(".itinerary");
    await expect(itinerary.locator(".mt-itinerary-read-list")).toBeVisible();
    await expect(itinerary.locator(".mt-itinerary-read-copy h4").first()).toHaveText(
      "Fund a verified research review",
    );
    await expect(itinerary.getByText("Redirect $25 of political donations", { exact: true })).toBeVisible();
  });

  test("uses the compact in-card editor without horizontal overflow", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await openCleanNow(page);
    const itinerary = await openEditor(page);

    await expect(itinerary.getByRole("button", { name: "Save itinerary" })).toBeVisible();
    await expect(itinerary.locator('[data-mt-itinerary-field="amount"]').first()).toBeVisible();
    await expect(itinerary.locator('[data-mt-itinerary-field="date"]').first()).toBeVisible();

    const overflow = await page.evaluate(() => ({
      page: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      card: (() => {
        const card = document.querySelector(".itinerary");
        return card ? card.scrollWidth - card.clientWidth : 999;
      })(),
    }));
    expect(overflow.page).toBeLessThanOrEqual(1);
    expect(overflow.card).toBeLessThanOrEqual(1);
  });
});
