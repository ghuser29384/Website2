import { expect, test } from "@playwright/test";

const completeProfilePath =
  "/complete-profile?source=walkthrough&cause_area=Animal%20welfare&walkthrough_cause=Factory%20farming&offer_type=Money&match_name=Mina%20Park&match_get=Fund%20a%20verified%20animal-welfare%20review&match_give=Replace%20eight%20car%20trips%20with%20transit";

test("100-Spark Mosaic ranks priorities and preserves the account completion flow", async ({
  page,
}) => {
  await page.goto(completeProfilePath);

  await expect(
    page.getByRole("heading", { name: "Spend 100 sparks of attention." }),
  ).toBeVisible();
  await expect(page.getByText("80/100", { exact: false })).toBeVisible();
  await expect(page.getByText("4 sparks left to place", { exact: true })).toBeVisible();
  await expect(page.getByRole("complementary", { name: "Your ranking" })).toContainText(
    "AI safety",
  );

  const mosaicBox = await page
    .getByLabel("80 of 100 attention points assigned")
    .boundingBox();
  const rankingBox = await page
    .getByRole("complementary", { name: "Your ranking" })
    .boundingBox();
  expect(mosaicBox).not.toBeNull();
  expect(rankingBox).not.toBeNull();
  expect(mosaicBox!.x + mosaicBox!.width).toBeLessThanOrEqual(rankingBox!.x);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
    await page.evaluate(() => window.innerWidth),
  );

  await page.getByRole("button", { name: "Assign one spark to Global poverty" }).click();
  await expect(page.getByText("85/100", { exact: false })).toBeVisible();
  await expect(page.getByText("3 sparks left to place", { exact: true })).toBeVisible();

  await page.getByRole("button", { name: "Save profile" }).click();
  const details = page.getByRole("dialog", { name: "Finish the practical details." });
  await expect(details).toBeVisible();
  await expect(details).toContainText("Factory farming");

  await page.getByLabel("Display name").fill("Alex Morgan");
  await page.getByLabel("Role or short descriptor").fill("Policy researcher");
  await page.getByLabel("Email").fill("alex@example.org");
  await page.getByRole("button", { name: "Verified members" }).click();

  await page.getByRole("button", { name: "Create account & continue" }).click();
  await expect(page).toHaveURL(/\/signup\?method=email&returnTo=/);
  await expect(page).toHaveURL(/complete-profile/);
});

test("all twelve priorities remain reachable on a narrow screen", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(completeProfilePath);

  await expect(page.getByLabel("80 of 100 attention points assigned")).toBeVisible();
  await page.getByRole("button", { name: "Assign one spark to Space governance" }).click();
  await expect(page.getByRole("button", { name: "Assign one spark to Space governance" })).toHaveCount(0);
  await expect(page.getByRole("complementary", { name: "Your ranking" })).toContainText(
    "5 sparks",
  );
});
