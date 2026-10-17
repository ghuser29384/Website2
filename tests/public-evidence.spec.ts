import { expect, test, type Page } from "@playwright/test";

const externalBase = (process.env.MORALTRADE_BASE_URL ?? "").replace(/\/$/, "");
const route = (path: string) => `${externalBase}${path}`;

const publishedFields = [
  "Action category",
  "Lifecycle status",
  "Confidence band",
  "Completion fraction",
  "Payout percentage",
  "Calendar date",
] as const;

async function openEvidenceRoute(page: Page, path: "/evidence" | "/evidence/example") {
  const response = await page.goto(route(path), { waitUntil: "domcontentloaded" });
  expect(response?.status() ?? 200).toBeLessThan(500);
  await page.waitForLoadState("load").catch(() => undefined);
  await expect(
    page.getByRole("heading", {
      level: 1,
      name: "Verified outcomes, without public evidence dossiers.",
    }),
  ).toBeVisible({ timeout: 15_000 });
}

async function expectPrivacySafeLedgerShell(page: Page) {
  await expect(page.locator(".evidence-outcomes-shell")).toHaveCount(1);
  await expect(page.getByText("Privacy-safe outcome ledger", { exact: true })).toBeVisible();
  await expect(
    page.getByText(
      /Original evidence, participant identities, private descriptions, amounts, currency, payment provider, receipts, links, files, and exact timestamps remain private\./,
    ),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", {
      level: 2,
      name: "Exactly six fields leave the private workflow.",
    }),
  ).toBeVisible();

  const fieldLabels = await page.locator(".source-pill").allTextContents();
  expect(fieldLabels.map((label) => label.trim())).toEqual(publishedFields);

  await expect(page.locator("[data-stage-evidence-viewer]")).toHaveCount(0);
  await expect(page.getByText("Interface guide · no live data", { exact: true })).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Open illustrated viewer →" })).toHaveCount(0);
  await expect(
    page.locator(
      'a[href*="green-table-receipt"], a[href*="meal-before"], a[href*="meal-after"]',
    ),
  ).toHaveCount(0);
}

async function expectLedgerResultState(page: Page) {
  const recordCards = page.locator(".data-grid .data-card");
  const emptyState = page.getByText("No finalized public outcomes yet.", { exact: true });
  const unavailableState = page.getByRole("alert").filter({ hasText: "Outcome ledger unavailable" });

  await expect
    .poll(
      async () =>
        (await recordCards.count()) +
        (await emptyState.count()) +
        (await unavailableState.count()),
      { timeout: 15_000 },
    )
    .toBeGreaterThan(0);

  if (externalBase) {
    await expect(unavailableState).toHaveCount(0);
  }
}

async function expectNoHorizontalOverflow(page: Page) {
  const dimensions = await page.evaluate(() => ({
    innerWidth: window.innerWidth,
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }));

  expect(dimensions.clientWidth).toBe(dimensions.innerWidth);
  expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.innerWidth + 1);
}

test.describe("public Evidence outcome ledger", () => {
  test("serves only the privacy-safe outcome directory", async ({ page }) => {
    await openEvidenceRoute(page, "/evidence");
    await expectPrivacySafeLedgerShell(page);
    await expectLedgerResultState(page);

    await expect(
      page.getByText("Individual public dossier links have been retired.", { exact: true }),
    ).toHaveCount(0);
  });

  test("retires record-specific public dossiers without exposing source artifacts", async ({
    page,
  }) => {
    await openEvidenceRoute(page, "/evidence/example");
    await expectPrivacySafeLedgerShell(page);
    await expectLedgerResultState(page);

    await expect(
      page.getByText("Individual public dossier links have been retired.", { exact: true }),
    ).toBeVisible();
    await expect(
      page.getByText(
        "The outcome ledger no longer exposes record identifiers or source artifacts. This page shows the privacy-safe aggregate record instead.",
        { exact: true },
      ),
    ).toBeVisible();
    await expect(page.getByRole("tab")).toHaveCount(0);
    await expect(page.getByRole("dialog")).toHaveCount(0);
  });

  test("keeps the privacy-safe ledger readable on mobile", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await openEvidenceRoute(page, "/evidence");
    await expectPrivacySafeLedgerShell(page);
    await expectLedgerResultState(page);
    await expectNoHorizontalOverflow(page);
  });

  test("keeps the retired-record notice readable on mobile without artifact controls", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await openEvidenceRoute(page, "/evidence/example");
    await expectPrivacySafeLedgerShell(page);

    await expect(
      page.getByText("Individual public dossier links have been retired.", { exact: true }),
    ).toBeVisible();
    await expect(page.getByRole("tab")).toHaveCount(0);
    await expect(page.locator("[data-stage-artifact]")).toHaveCount(0);
    await expectNoHorizontalOverflow(page);
  });
});
