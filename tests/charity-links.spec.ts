import { expect, test } from "@playwright/test";

import { getEligibleCharityLinks } from "../src/lib/charity-links";

const charities = getEligibleCharityLinks();

// The flow under test is: /donate -> official charity link -> new external tab,
// with click-only analytics and no payment/trade mutation or return-state claim.
for (const width of [1440, 390]) {
  test(`charity directory renders official sources without setup at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/donate?status=paid&target=unverified-person&amount=999", { waitUntil: "networkidle" });
    await expect(page).toHaveTitle(/Donate to a charity/);
    await expect(page.locator("h1")).toHaveText("Donate on a charity’s own website.");
    await expect(page.locator('[data-charity-id]')).toHaveCount(charities.length);
    await expect(page.getByText("Opening a link or returning here is not proof of payment.", { exact: false })).toBeVisible();
    await expect(page.locator("main")).not.toContainText("unverified-person");
    await expect(page.locator('script[src*="every.org"]')).toHaveCount(0);
    await expect(page.locator('main a[href*="/donate/confirm"], main a[href*="/dashboard/payments"], main form')).toHaveCount(0);
    if (!charities.length) {
      await expect(page.getByRole("status")).toContainText("No reviewed charity links are available");
    }
    for (const charity of charities) {
      const card = page.locator(`[data-charity-id="${charity.id}"]`);
      await expect(card).toContainText(charity.registration.number);
      await expect(card).toContainText(charity.review.checkedOn);
      const link = card.getByRole("link", { name: /donation page \(new tab\)/ });
      await expect(link).toHaveAttribute("href", charity.donationUrl);
      await expect(link).toHaveAttribute("target", "_blank");
      await expect(link).toHaveAttribute("rel", "noopener noreferrer");
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
    await page.screenshot({ path: `/tmp/charity-links-${width}.png`, fullPage: true });
  });
}

test("repeated clicks and returning cannot create a payment or completion", async ({ page, context }) => {
  test.skip(!charities.length, "Directory is fail-closed until a charity review is current");
  const events: Array<{ eventType: string; metadata: Record<string, unknown> }> = [];
  const mutations: string[] = [];
  const consoleErrors: string[] = [];
  page.on("pageerror", (error) => consoleErrors.push(error.message));
  await context.route("**/api/funnel-events", async (route) => {
    const payload = route.request().postDataJSON();
    events.push(payload);
    await route.fulfill({ status: 204 });
  });
  await context.route(charities[0].donationUrl, (route) => route.fulfill({
    status: 200, contentType: "text/html", body: "<h1>External navigation fixture</h1>",
  }));
  page.on("request", (request) => {
    if (request.method() !== "GET" && !request.url().includes("/api/funnel-events")) {
      mutations.push(request.url());
    }
  });
  await page.goto("/donate", { waitUntil: "networkidle" });
  const destination = page.locator('[data-charity-id]').first().getByRole("link", { name: /donation page \(new tab\)/ });
  for (let index = 0; index < 2; index += 1) {
    const popupPromise = context.waitForEvent("page");
    await destination.click();
    const popup = await popupPromise;
    await expect(popup).toHaveURL(charities[0].donationUrl);
    await popup.close();
  }
  await expect.poll(() => events.filter((event) => event.eventType === "donation_route_clicked").length).toBe(2);
  for (const event of events.filter((item) => item.eventType === "donation_route_clicked")) {
    expect(event.metadata).toMatchObject({ mode: "direct_charity_link", resultStatus: "donation_unverified", liveMetricEligible: false });
  }
  expect(events.some((event) => /donation_logged|pair_completed/.test(event.eventType))).toBe(false);
  await page.goto("/donate?status=completed&receipt=fake&target=unverified-person");
  await expect(page.locator("main")).not.toContainText("unverified-person");
  await page.goBack();
  await page.goForward();
  await expect(page.locator("h1")).toHaveText("Donate on a charity’s own website.");
  expect(mutations).toEqual([]);
  expect(consoleErrors).toEqual([]);
});

test("analytics opt-out does not prevent the direct link from opening", async ({ page, context }) => {
  test.skip(!charities.length, "Directory is fail-closed until a charity review is current");
  const events: string[] = [];
  await context.addCookies([{ name: "mt_analytics_opt_out", value: "1", domain: "127.0.0.1", path: "/" }]);
  await context.route("**/api/funnel-events", async (route) => {
    events.push(route.request().postData() ?? "");
    await route.fulfill({ status: 204 });
  });
  await context.route(charities[0].donationUrl, (route) => route.fulfill({ status: 200, body: "External fixture" }));
  await page.goto("/donate", { waitUntil: "networkidle" });
  const popupPromise = context.waitForEvent("page");
  await page.locator('[data-charity-id]').first().getByRole("link", { name: /donation page \(new tab\)/ }).click();
  const popup = await popupPromise;
  await expect(popup).toHaveURL(charities[0].donationUrl);
  await popup.close();
  expect(events).toEqual([]);
});
