import { expect, test, type Page } from "@playwright/test";

const fixedInstant = new Date("2026-07-17T01:30:00.000Z");

async function openHome(page: Page) {
  await page.goto("/", { waitUntil: "domcontentloaded" });
  await expect(page.locator("main#app")).toBeVisible({ timeout: 30_000 });
  await expect(page.locator(".head .date")).toBeVisible({ timeout: 30_000 });
}

async function expectLocalGreeting(
  page: Page,
  expected: { dateTime: string; dateLabel: string; greeting: string },
) {
  const localDate = page.locator(".head .date");
  await expect(localDate).toHaveAttribute("data-mt-local-date-time", expected.dateTime);

  const time = localDate.locator('time[data-mt-local-date="true"]');
  await expect(time).toHaveAttribute("datetime", expected.dateTime);
  await expect(time).toHaveText(expected.dateLabel);

  const greeting = localDate.locator('[data-mt-local-greeting="true"]');
  await expect(greeting).toHaveText(expected.greeting);
}

test.describe("Adaptive homepage in America/Los_Angeles", () => {
  test.use({ timezoneId: "America/Los_Angeles" });

  test("uses the visitor's previous local date and evening greeting", async ({ page }) => {
    await page.clock.setFixedTime(fixedInstant);
    await openHome(page);

    await expectLocalGreeting(page, {
      dateTime: "2026-07-16",
      dateLabel: "Thursday, July 16, 2026",
      greeting: "Good evening.",
    });
  });
});

test.describe("Adaptive homepage in Asia/Tokyo", () => {
  test.use({ timezoneId: "Asia/Tokyo" });

  test("uses the visitor's next local date and morning greeting", async ({ page }) => {
    await page.clock.setFixedTime(fixedInstant);
    await openHome(page);

    await expectLocalGreeting(page, {
      dateTime: "2026-07-17",
      dateLabel: "Friday, July 17, 2026",
      greeting: "Good morning.",
    });
  });
});

test.describe("Adaptive homepage local-time refresh", () => {
  test.use({ timezoneId: "UTC" });

  test("refreshes after the local date and greeting period change", async ({ page }) => {
    await page.clock.setFixedTime(new Date("2026-07-16T17:59:00.000Z"));
    await openHome(page);

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
