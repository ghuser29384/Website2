import { expect, test } from "@playwright/test";

const completeProfilePath =
  "/complete-profile?source=walkthrough&cause_area=Animal%20welfare&walkthrough_cause=Factory%20farming&offer_type=Money&match_name=Mina%20Park&match_get=Fund%20a%20verified%20animal-welfare%20review&match_give=Replace%20eight%20car%20trips%20with%20transit";

test("a local Walkthrough draft cannot unlock Complete Profile without persisted activation", async ({ page }) => {
  await page.goto(completeProfilePath);

  await expect(page).toHaveURL(/\/walkthrough$/);
  await expect(page.getByLabel("Profile setup: priorities")).toHaveCount(0);
});

test("a first-time Complete Profile visit is still sent to the mandatory Walkthrough", async ({
  context,
  page,
}) => {
  await context.clearCookies();
  await page.goto("/complete-profile");

  await expect(page).toHaveURL(/\/walkthrough$/);
  await expect(page.getByLabel("Profile setup: priorities")).toHaveCount(0);

  const cookies = await context.cookies();
  expect(cookies.find((cookie) => cookie.name === "mt_walkthrough_seen")).toBeUndefined();
});

test("a legacy walkthrough cookie cannot bypass persisted activation", async ({
  context,
  page,
}) => {
  await context.addCookies([{
    domain: "127.0.0.1",
    expires: -1,
    httpOnly: true,
    name: "mt_walkthrough_seen",
    path: "/",
    sameSite: "Lax",
    secure: false,
    value: "1",
  }]);
  await page.goto("/complete-profile");

  await expect(page).toHaveURL(/\/walkthrough$/);
  await expect(page.getByLabel("Profile setup: priorities")).toHaveCount(0);
});
