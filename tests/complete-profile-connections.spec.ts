import { expect, test } from "@playwright/test";

const completeProfilePath =
  "/complete-profile?source=walkthrough&cause_area=Animal%20welfare&walkthrough_cause=Factory%20farming&offer_type=Money&match_name=Ellen%20Sun&match_get=Fund%20a%20verified%20animal-welfare%20review&match_give=Replace%20eight%20car%20trips%20with%20transit";

test("Complete Profile shows truthful optional account-source states", async ({ page }) => {
  await page.goto(completeProfilePath);
  await page.getByRole("button", { name: "Sources" }).click();

  const dialog = page.getByRole("dialog", {
    name: "Choose what may inform private suggestions.",
  });
  await expect(dialog).toBeVisible();
  await expect(dialog).toContainText("Moral Trade activity");
  await expect(dialog).toContainText("Included by default");
  await expect(dialog).toContainText("Effective Altruism Forum");
  await expect(dialog).toContainText("No simulated Connect button is shown");
  await expect(dialog).toContainText("Substack");
  await expect(dialog).toContainText("Publication-admin tooling is not treated as reader consent");
  await expect(dialog).toContainText("likes, bookmarks, and follow relationships");
  await expect(dialog).toContainText("never move a spark");
  await expect(dialog.getByRole("button", { name: "Connect X" })).toHaveCount(0);
  await expect(dialog.getByRole("link", { name: "Connect X" })).toHaveCount(0);
});

test("account-source dialog has no horizontal overflow on a narrow screen", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(completeProfilePath);
  await page.getByRole("button", { name: "Sources" }).click();

  await expect(
    page.getByRole("dialog", { name: "Choose what may inform private suggestions." }),
  ).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
    await page.evaluate(() => window.innerWidth),
  );
});
