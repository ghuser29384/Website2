import { expect, test, type Page } from "@playwright/test";

const boundaryInstant = new Date("2026-07-20T01:30:00.000Z");

async function openOfferList(page: Page) {
  await page.goto("/moral-trade-discover.html?domain=offers&view=list", {
    waitUntil: "domcontentloaded",
  });
  await expect(page.locator(".today-block time[data-mt-discover-local-today]")).toBeVisible();
}

async function expectToday(page: Page, dateTime: string, dateLabel: string) {
  const today = page.locator(".today-block time[data-mt-discover-local-today]");
  await expect(today).toHaveAttribute("datetime", dateTime);
  await expect(today).toHaveText(dateLabel);
}

async function expectRedirectDeadlineDays(page: Page, days: number) {
  const redirect = page.locator('[data-row-id="offer-donation-redirect"]');
  await expect(redirect).toBeVisible();
  await expect(redirect.locator(".deadline-cell .cell-secondary")).toContainText(`${days} days`);
}

async function runCommand(page: Page, command: string) {
  await page.locator("#command-input").fill(command);
  await page.locator("#command-form").getByRole("button", { name: "Run search" }).click();
}

test.describe("Discovery local time in America/Los_Angeles", () => {
  test.use({ timezoneId: "America/Los_Angeles" });

  test("uses the visitor's previous calendar date for the header and urgency", async ({ page }) => {
    await page.clock.setFixedTime(boundaryInstant);
    await openOfferList(page);

    await expectToday(page, "2026-07-19", "July 19, 2026");
    await expectRedirectDeadlineDays(page, 6);
  });
});

test.describe("Discovery local time in Asia/Tokyo", () => {
  test.use({ timezoneId: "Asia/Tokyo" });

  test("uses the visitor's next calendar date for the header and urgency", async ({ page }) => {
    await page.clock.setFixedTime(boundaryInstant);
    await openOfferList(page);

    await expectToday(page, "2026-07-20", "July 20, 2026");
    await expectRedirectDeadlineDays(page, 5);
  });
});

test.describe("Discovery local-date refresh", () => {
  test.use({ timezoneId: "UTC" });

  test("rerenders the header and deadline arithmetic after local midnight", async ({ page }) => {
    await page.clock.setFixedTime(new Date("2026-07-20T23:59:00.000Z"));
    await openOfferList(page);
    await expectToday(page, "2026-07-20", "July 20, 2026");
    await expectRedirectDeadlineDays(page, 5);

    await page.clock.setFixedTime(new Date("2026-07-21T00:01:00.000Z"));
    await page.evaluate(() => window.dispatchEvent(new Event("focus")));

    await expectToday(page, "2026-07-21", "July 21, 2026");
    await expectRedirectDeadlineDays(page, 4);
  });
});

test.describe("Discovery deadline parsing", () => {
  test.use({ timezoneId: "UTC" });

  test("resolves named deadlines to the current or next local year", async ({ page }) => {
    await page.clock.setFixedTime(new Date("2026-07-20T12:00:00.000Z"));
    await openOfferList(page);

    await runCommand(page, "Find offers before August 1");
    await expect(page).toHaveURL(/deadline=2026-08-01/);

    await runCommand(page, "Find offers before January 5");
    await expect(page).toHaveURL(/deadline=2027-01-05/);
  });

  test("preserves an explicit ISO calendar date", async ({ page }) => {
    await page.clock.setFixedTime(new Date("2026-07-20T12:00:00.000Z"));
    await openOfferList(page);

    await runCommand(page, "Find offers before 2028-03-04");
    await expect(page).toHaveURL(/deadline=2028-03-04/);
    await expect(page.getByRole("button", { name: /Before Mar 4/ })).toBeVisible();
  });
});
