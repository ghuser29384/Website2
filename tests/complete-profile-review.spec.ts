import { expect, test } from "@playwright/test";

const privateQueryKeys = [
  "source",
  "cause_area",
  "walkthrough_cause",
  "offer_type",
  "match_name",
  "match_get",
  "match_give",
];
const legacyCompleteProfilePath =
  "/complete-profile?source=walkthrough&cause_area=private-sentinel-a&walkthrough_cause=private-sentinel-b&offer_type=Money&match_name=private-sentinel-c&match_get=private-sentinel-d&match_give=private-sentinel-e";

test("a legacy query-bearing Walkthrough draft is normalized and cannot unlock Complete Profile", async ({ page }) => {
  const navigations: string[] = [];
  page.on("request", (request) => {
    if (request.isNavigationRequest() && request.frame() === page.mainFrame()) {
      navigations.push(request.url());
    }
  });

  await page.goto(legacyCompleteProfilePath);

  await expect(page).toHaveURL(/\/walkthrough$/);
  await expect(page.getByLabel("Profile setup: priorities")).toHaveCount(0);
  expect(navigations[0]).toContain("/complete-profile?");
  expect(navigations.length).toBeGreaterThanOrEqual(2);

  for (const navigation of navigations.slice(1)) {
    for (const key of privateQueryKeys) {
      expect(navigation).not.toContain(`${key}=`);
    }
    expect(navigation).not.toContain("private-sentinel");
  }

  const referrer = await page.evaluate(() => document.referrer);
  for (const key of privateQueryKeys) {
    expect(referrer).not.toContain(`${key}=`);
  }
  expect(referrer).not.toContain("private-sentinel");

  const hrefs = await page.locator("a[href]").evaluateAll((links) =>
    links.map((link) => (link as HTMLAnchorElement).href),
  );
  for (const href of hrefs) {
    for (const key of privateQueryKeys) {
      expect(href).not.toContain(`${key}=`);
    }
    expect(href).not.toContain("private-sentinel");
  }
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
