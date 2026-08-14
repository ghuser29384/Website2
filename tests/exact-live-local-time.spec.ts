import { expect, test, type Page } from "@playwright/test";

const fixedInstant = new Date("2026-07-17T01:30:00.000Z");

async function installAccountFixture(page: Page) {
  await page.route("**/api/live-account", (route) =>
    route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        authenticated: true,
        account: {
          displayName: "Riley Morgan",
          firstName: "Riley",
          initials: "RM",
          memberSince: "2026-01-01T00:00:00.000Z",
          completedCommitments: 0,
          paymentAccount: { configured: false, label: "Not configured" },
          notifications: { enabled: null, label: "Not configured" },
          publicTrustProfile: { enabled: null, label: "Not configured" },
          defaultPrivacy: "Not configured",
          standardTerms: { href: "/terms", label: "Current site terms" },
        },
      }),
    }),
  );
}

async function expectLocalHeader(
  page: Page,
  expected: { dateTime: string; dateLabel: string; greeting: string },
) {
  const localHeader = page.locator(".head .date");
  await expect(localHeader).toHaveAttribute("data-mt-local-date-time", expected.dateTime);
  await expect(localHeader.locator('time[data-mt-local-date="true"]')).toHaveAttribute(
    "datetime",
    expected.dateTime,
  );
  await expect(localHeader.locator('time[data-mt-local-date="true"]')).toHaveText(
    expected.dateLabel,
  );
  await expect(localHeader.locator('span[data-mt-local-greeting="true"]')).toHaveText(
    expected.greeting,
  );
}

async function expectHeaderAcrossPrimaryPages(
  page: Page,
  expected: { dateTime: string; dateLabel: string; greeting: string },
) {
  for (const pageName of ["now", "activity"]) {
    await page.locator(`.topbar nav button[data-page="${pageName}"]`).click();
    await expectLocalHeader(page, expected);
  }
}

test.describe("exact live interface local time", () => {
  test.describe("America/Los_Angeles", () => {
    test.use({ timezoneId: "America/Los_Angeles" });

    test("uses the visitor's previous local day across Now and Activity", async ({ page }) => {
      await page.clock.setFixedTime(fixedInstant);
      await installAccountFixture(page);
      await page.goto("/moral-trade-live.html", { waitUntil: "domcontentloaded" });

      await expectHeaderAcrossPrimaryPages(page, {
        dateTime: "2026-07-16",
        dateLabel: "Thursday, July 16, 2026",
        greeting: "Good evening, Riley.",
      });
    });
  });

  test.describe("Asia/Tokyo", () => {
    test.use({ timezoneId: "Asia/Tokyo" });

    test("uses the visitor's next local day across Now and Activity", async ({ page }) => {
      await page.clock.setFixedTime(fixedInstant);
      await installAccountFixture(page);
      await page.goto("/moral-trade-live.html", { waitUntil: "domcontentloaded" });

      await expectHeaderAcrossPrimaryPages(page, {
        dateTime: "2026-07-17",
        dateLabel: "Friday, July 17, 2026",
        greeting: "Good morning, Riley.",
      });
    });
  });

  test.describe("refresh", () => {
    test.use({ timezoneId: "UTC" });

    test("refreshes after the local date and greeting period change", async ({ page }) => {
      await page.clock.setFixedTime(new Date("2026-07-16T17:59:00.000Z"));
      await installAccountFixture(page);
      await page.goto("/moral-trade-live.html", { waitUntil: "domcontentloaded" });
      await expectLocalHeader(page, {
        dateTime: "2026-07-16",
        dateLabel: "Thursday, July 16, 2026",
        greeting: "Good afternoon, Riley.",
      });

      await page.clock.setFixedTime(new Date("2026-07-17T00:01:00.000Z"));
      await page.evaluate(() => window.dispatchEvent(new Event("focus")));
      await expectLocalHeader(page, {
        dateTime: "2026-07-17",
        dateLabel: "Friday, July 17, 2026",
        greeting: "Good morning, Riley.",
      });
    });
  });
});
