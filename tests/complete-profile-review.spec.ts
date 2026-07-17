import { expect, test } from "@playwright/test";

const completeProfilePath =
  "/complete-profile?source=walkthrough&cause_area=Animal%20welfare&walkthrough_cause=Factory%20farming&offer_type=Money&match_name=Mina%20Park&match_get=Fund%20a%20verified%20animal-welfare%20review&match_give=Replace%20eight%20car%20trips%20with%20transit";

test("review and refine preserves walkthrough context and routes to account creation", async ({
  page,
}) => {
  await page.goto(completeProfilePath);

  await expect(
    page.getByRole("heading", { name: "Turn your walkthrough into a profile." }),
  ).toBeVisible();
  await expect(page.getByText("Animal welfare", { exact: true }).first()).toBeVisible();
  await expect(page.getByText("Mina Park match", { exact: true })).toBeVisible();

  await page.getByLabel("Display name").fill("Alex Morgan");
  await page.getByLabel("Role or short descriptor").fill("Policy researcher");
  await page.getByLabel("Email").fill("alex@example.org");
  await page.getByRole("button", { name: "Verified members" }).click();

  await expect(page.getByRole("complementary", { name: "Live profile preview" })).toContainText(
    "Alex Morgan",
  );
  await expect(page.getByRole("complementary", { name: "Live profile preview" })).toContainText(
    "Verified members",
  );

  await page.getByRole("button", { name: "Create account & continue" }).click();
  await expect(page).toHaveURL(/\/signup\?method=email&returnTo=/);
  await expect(page).toHaveURL(/complete-profile/);
});
