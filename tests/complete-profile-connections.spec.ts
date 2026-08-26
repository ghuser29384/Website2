import { expect, test } from "@playwright/test";

const completeProfilePath =
  "/complete-profile?source=walkthrough&cause_area=Animal%20welfare&walkthrough_cause=Factory%20farming&offer_type=Money&match_name=Ellen%20Sun&match_get=Fund%20a%20verified%20animal-welfare%20review&match_give=Replace%20eight%20car%20trips%20with%20transit";

test("Complete Profile connection controls stay behind persisted activation", async ({ page }) => {
  await page.goto(completeProfilePath);

  await expect(page).toHaveURL(/\/walkthrough$/);
  await expect(page.getByRole("button", { name: "Sources" })).toHaveCount(0);
  await expect(
    page.getByRole("dialog", { name: "Choose what may inform private suggestions." }),
  ).toHaveCount(0);
});

test("the mobile Complete Profile gate cannot be bypassed by a query draft", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(completeProfilePath);

  await expect(page).toHaveURL(/\/walkthrough$/);
  await expect(page.getByRole("heading", { name: "What do you value?" })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
    await page.evaluate(() => window.innerWidth),
  );
});
