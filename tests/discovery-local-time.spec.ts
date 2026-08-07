import { expect, test, type Page } from "@playwright/test";

const boundaryInstant = new Date("2026-07-20T01:30:00.000Z");

interface DiscoverLocalTimeRuntime {
  formatCalendarDate(value: string, options?: Intl.DateTimeFormatOptions): string;
  parseDatePhrase(text: string, now?: Date): string;
}

async function openOfferList(page: Page) {
  await page.goto("/moral-trade-discover.html?domain=offers&view=list", {
    waitUntil: "domcontentloaded",
  });
  await expect(page.locator(".today-block time[data-mt-discover-local-today]")).toBeVisible({
    timeout: 15_000,
  });
}

async function expectToday(page: Page, dateTime: string, dateLabel: string) {
  const today = page.locator(".today-block time[data-mt-discover-local-today]");
  await expect(today).toHaveAttribute("datetime", dateTime);
  await expect(today).toHaveText(dateLabel);
}

async function expectRedirectDeadlineDays(page: Page, days: number) {
  const redirect = page.locator('[data-row-id="offer-donation-redirect"]');
  await expect(redirect).toBeVisible({ timeout: 15_000 });

  const deadline = redirect.locator(".offer-row-deadline");
  await expect(deadline).toContainText("Complete by Jul 25");
  await expect(deadline).toContainText(`${days} days`);
}

async function expectCurrentCommandSurface(page: Page) {
  const form = page.locator("#command-form");
  await expect(form).toBeVisible();
  await expect(form).toHaveAttribute("aria-busy", "false");
  await expect(form.locator("#command-input")).toBeVisible();
  await expect(form.getByRole("button", { name: "Search", exact: true })).toBeVisible();
}

async function parseDeadlinePhrase(page: Page, command: string, now: string) {
  return page.evaluate(
    ({ commandText, currentInstant }) => {
      const runtime = (
        window as Window & {
          MoralTradeDiscoverLocalTime?: DiscoverLocalTimeRuntime;
        }
      ).MoralTradeDiscoverLocalTime;

      if (!runtime) {
        throw new Error("Discover local-time runtime is unavailable");
      }

      const parsed = runtime.parseDatePhrase(commandText, new Date(currentInstant));
      return {
        parsed,
        label: parsed
          ? runtime.formatCalendarDate(parsed, { month: "short", day: "numeric" })
          : "",
      };
    },
    { commandText: command, currentInstant: now },
  );
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
    const now = "2026-07-20T12:00:00.000Z";
    await page.clock.setFixedTime(new Date(now));
    await openOfferList(page);
    await expectCurrentCommandSurface(page);

    expect(await parseDeadlinePhrase(page, "Find offers before August 1", now)).toEqual({
      parsed: "2026-08-01",
      label: "Aug 1",
    });
    expect(await parseDeadlinePhrase(page, "Find offers before January 5", now)).toEqual({
      parsed: "2027-01-05",
      label: "Jan 5",
    });
  });

  test("preserves an explicit valid ISO calendar date", async ({ page }) => {
    const now = "2026-07-20T12:00:00.000Z";
    await page.clock.setFixedTime(new Date(now));
    await openOfferList(page);
    await expectCurrentCommandSurface(page);

    expect(await parseDeadlinePhrase(page, "Find offers before 2028-03-04", now)).toEqual({
      parsed: "2028-03-04",
      label: "Mar 4",
    });
    expect(await parseDeadlinePhrase(page, "Find offers before 2027-02-29", now)).toEqual({
      parsed: "",
      label: "",
    });
  });
});
