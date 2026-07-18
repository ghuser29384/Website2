import { expect, test, type Page } from "@playwright/test";

const fixedInstant = new Date("2026-07-17T01:30:00.000Z");

async function expectLocalGreeting(
  page: Page,
  expected: { dateTime: string; dateLabel: string; greeting: string },
) {
  const localGreeting = page.getByTestId("local-date-greeting");
  await expect(localGreeting).toHaveAttribute("data-ready", "true");
  await expect(localGreeting.locator("time")).toHaveAttribute("datetime", expected.dateTime);
  await expect(localGreeting.locator("time")).toHaveText(expected.dateLabel);
  await expect(localGreeting.getByText(expected.greeting, { exact: true })).toBeVisible();
}

test.describe("Returning homepage in America/Los_Angeles", () => {
  test.use({ timezoneId: "America/Los_Angeles" });

  test("uses the visitor's previous local date and evening greeting", async ({ page }) => {
    await page.clock.setFixedTime(fixedInstant);
    await page.goto("/", { waitUntil: "domcontentloaded" });

    await expectLocalGreeting(page, {
      dateTime: "2026-07-16",
      dateLabel: "Thursday, July 16, 2026",
      greeting: "Good evening.",
    });
  });
});

test.describe("Returning homepage in Asia/Tokyo", () => {
  test.use({ timezoneId: "Asia/Tokyo" });

  test("uses the visitor's next local date and morning greeting", async ({ page }) => {
    await page.clock.setFixedTime(fixedInstant);
    await page.goto("/", { waitUntil: "domcontentloaded" });

    await expectLocalGreeting(page, {
      dateTime: "2026-07-17",
      dateLabel: "Friday, July 17, 2026",
      greeting: "Good morning.",
    });
  });
});

test.describe("Returning homepage local-time refresh", () => {
  test.use({ timezoneId: "UTC" });

  test("refreshes after the local date and greeting period change", async ({ page }) => {
    await page.clock.setFixedTime(new Date("2026-07-16T17:59:00.000Z"));
    await page.goto("/", { waitUntil: "domcontentloaded" });

    await expectLocalGreeting(page, {
      dateTime: "2026-07-16",
      dateLabel: "Thursday, July 16, 2026",
      greeting: "Good afternoon.",
    });

    await page.clock.setFixedTime(new Date("2026-07-17T00:01:00.000Z"));
    await page.evaluate(() => window.dispatchEvent(new Event("focus")));

    await expectLocalGreeting(page, {
      dateTime: "2026-07-17",
      dateLabel: "Friday, July 17, 2026",
      greeting: "Good morning.",
    });
  });
});
