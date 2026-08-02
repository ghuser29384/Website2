import { expect, test, type Page } from "@playwright/test";

const discoverUrl = "/discover?domain=pools&view=threshold&query=Find+pools&selected=pool-wild-research&selectedType=pool#discover";

async function setWildResearchPledge(page: Page, amount: number) {
  const slider = page
    .locator('[data-pledge-range][data-pool-id="pool-wild-research"]:visible')
    .last();
  await expect(slider).toBeVisible();
  await slider.evaluate((element, value) => {
    const input = element as HTMLInputElement;
    input.value = String(value);
    input.dispatchEvent(new Event("input", { bubbles: true }));
  }, amount);
}

test("desktop pool inspector shows exact mechanical pledge arithmetic", async ({ page }) => {
  const pageErrors: string[] = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));

  await page.goto(discoverUrl);
  await expect(page.getByRole("heading", { name: /Wild-animal-suffering priority research pool/i })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Preview your conditional pledge" })).toBeVisible();
  await setWildResearchPledge(page, 35);

  await expect(page.getByText("0.43% of current gap", { exact: true }).first()).toBeVisible();
  await expect(page.getByText("$8,165 remains", { exact: true }).first()).toBeVisible();
  await expect(page.getByText("Moving the slider does not save a pledge or authorize payment.", { exact: true })).toBeVisible();
  await expect(page.getByText(/pivotality/i)).toHaveCount(0);
  await expect(page.getByText(/How likely am I to be pivotal/i)).toHaveCount(0);
  expect(pageErrors).toEqual([]);

  await page.screenshot({ path: "test-results/discover-pledge-clarity-desktop.png", fullPage: true });
});

test("mobile selected-pool sheet preserves the same explanation and stays within the viewport", async ({ page }) => {
  const pageErrors: string[] = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(discoverUrl);

  const sheet = page.locator(".inspector.mobile-sheet");
  await expect(sheet).toBeVisible();
  await expect(sheet.getByRole("heading", { name: "Preview your conditional pledge" })).toBeVisible();
  await setWildResearchPledge(page, 35);
  await expect(sheet.getByText("0.43% of current gap", { exact: true }).first()).toBeVisible();
  await expect(sheet.getByText("$8,165 remains", { exact: true }).first()).toBeVisible();
  await expect(sheet.getByText("Moving the slider does not save a pledge or authorize payment.", { exact: true })).toBeVisible();
  await expect(page.getByText(/pivotality/i)).toHaveCount(0);
  expect(pageErrors).toEqual([]);

  const bounds = await sheet.boundingBox();
  expect(bounds).not.toBeNull();
  expect(bounds!.x).toBeGreaterThanOrEqual(-1);
  expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(391);
  const sheetOverflow = await sheet.evaluate(
    (element) => element.scrollWidth - element.clientWidth,
  );
  expect(sheetOverflow).toBeLessThanOrEqual(1);
  const documentOverflow = await page.locator("html").evaluate(
    (element) => element.scrollWidth - element.clientWidth,
  );
  expect(documentOverflow).toBeLessThanOrEqual(1);

  await page.screenshot({ path: "test-results/discover-pledge-clarity-mobile.png", fullPage: true });
});
