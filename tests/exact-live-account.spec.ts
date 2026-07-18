import { expect, test } from "@playwright/test";

const accountFixture = {
  authenticated: true,
  account: {
    displayName: "Samira Chen",
    firstName: "Samira",
    initials: "SC",
    memberSince: "2025-04-10T12:00:00.000Z",
    completedCommitments: 7,
    currency: null,
    monthlySafeCap: null,
    paymentAccount: {
      configured: true,
      label: "Payments and payouts enabled",
    },
    notifications: {
      enabled: true,
      label: "In-app and email",
    },
    publicTrustProfile: {
      enabled: false,
      label: "Private",
    },
    defaultPrivacy: "Strict",
    disputeResolution: null,
    standardTerms: {
      href: "/terms",
      label: "Current site terms",
    },
  },
};

test.describe("exact live interface account data", () => {
  test("uses authenticated profile and persisted settings instead of placeholders", async ({ page }) => {
    await page.route("**/api/live-account", (route) =>
      route.fulfill({
        contentType: "application/json",
        body: JSON.stringify(accountFixture),
      }),
    );

    await page.goto("/moral-trade-live.html", { waitUntil: "domcontentloaded" });

    const avatar = page.locator('[data-mt-live-account-avatar="true"]');
    await expect(avatar).toHaveText("SC");
    await expect(avatar).toHaveAttribute("aria-label", "Samira Chen account");
    await expect(page.locator('[data-mt-live-account-greeting="true"]')).toHaveText(
      /Good (?:morning|afternoon|evening), Samira\./,
    );

    await avatar.click();

    await expect(page.locator('[data-mt-live-account-name="true"]')).toHaveText("Samira Chen");
    await expect(page.locator('[data-mt-live-account-summary="true"]')).toHaveText(
      "Member since Apr 2025 · 7 completed commitments",
    );
    await expect(
      page.locator('[data-mt-live-account-row="currency"] [data-mt-live-account-detail="true"]'),
    ).toHaveText("Not configured");
    await expect(
      page.locator('[data-mt-live-account-row="safe-cap"] [data-mt-live-account-detail="true"]'),
    ).toHaveText("Not configured");
    await expect(
      page.locator(
        '[data-mt-live-account-row="payment-account"] [data-mt-live-account-label="true"]',
      ),
    ).toHaveText("Payment account");
    await expect(
      page.locator(
        '[data-mt-live-account-row="payment-account"] [data-mt-live-account-detail="true"]',
      ),
    ).toHaveText("Payments and payouts enabled");
    await expect(
      page.locator(
        '[data-mt-live-account-row="notifications"] [data-mt-live-account-detail="true"]',
      ),
    ).toHaveText("In-app and email");
    await expect(page.locator('[data-mt-live-account-row="notifications"] button')).toHaveText("On");
    await expect(
      page.locator(
        '[data-mt-live-account-row="public-trust"] [data-mt-live-account-detail="true"]',
      ),
    ).toHaveText("Private");
    await expect(page.locator('[data-mt-live-account-row="public-trust"] button')).toHaveText(
      "Off",
    );
    await expect(
      page.locator('[data-mt-live-account-row="privacy"] [data-mt-live-account-detail="true"]'),
    ).toHaveText("Strict");
    await expect(
      page.locator('[data-mt-live-account-row="dispute"] [data-mt-live-account-detail="true"]'),
    ).toHaveText("No default resolver selected");
    await expect(
      page.locator('[data-mt-live-account-row="terms"] [data-mt-live-account-detail="true"]'),
    ).toHaveText("Current site terms");

    await expect(page.getByText("Alex Johnson", { exact: true })).toHaveCount(0);
    await expect(page.getByText("$250 · 6h · 12 trips", { exact: true })).toHaveCount(0);
    await expect(page.getByText("Frontier Bio Ethics Council", { exact: true })).toHaveCount(0);
    await expect(page.getByText("Moral Trade v1.4", { exact: true })).toHaveCount(0);
  });

  test("renders a neutral account state when no viewer is authenticated", async ({ page }) => {
    await page.route("**/api/live-account", (route) =>
      route.fulfill({
        contentType: "application/json",
        body: JSON.stringify({ authenticated: false }),
      }),
    );

    await page.goto("/moral-trade-live.html", { waitUntil: "domcontentloaded" });

    const avatar = page.locator('[data-mt-live-account-avatar="true"]');
    await expect(avatar).toHaveAttribute("aria-label", "Account");
    await expect(page.locator('[data-mt-live-account-greeting="true"]')).toHaveText(
      /Good (?:morning|afternoon|evening)\./,
    );

    await avatar.click();

    await expect(page.locator('[data-mt-live-account-name="true"]')).toHaveText("Account");
    await expect(page.locator('[data-mt-live-account-summary="true"]')).toHaveText(
      "Sign in to view account details.",
    );
    await expect(
      page.locator('[data-mt-live-account-row="currency"] [data-mt-live-account-detail="true"]'),
    ).toHaveText("Sign in to view");
    await expect(page.getByText("Alex Johnson", { exact: true })).toHaveCount(0);
  });
});
