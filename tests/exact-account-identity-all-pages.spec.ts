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
    paymentAccount: { configured: true, label: "Payments and payouts enabled" },
    notifications: { enabled: true, label: "In-app and email" },
    publicTrustProfile: { enabled: false, label: "Private" },
    defaultPrivacy: "Strict",
    disputeResolution: null,
    standardTerms: { href: "/terms", label: "Current site terms" },
  },
};

for (const path of ["/moral-trade-live.html", "/discover", "/walkthrough"] as const) {
  test(`${path} never exposes the legacy AJ account`, async ({ page }) => {
    await page.route("**/api/live-account", (route) =>
      route.fulfill({
        contentType: "application/json",
        body: JSON.stringify(accountFixture),
      }),
    );

    await page.goto(path, { waitUntil: "domcontentloaded" });
    await expect(page.getByText("AJ", { exact: true })).toHaveCount(0);

    const avatars = page.locator('[data-mt-account-avatar="true"]');
    const avatarCount = await avatars.count();
    for (let index = 0; index < avatarCount; index += 1) {
      await expect(avatars.nth(index)).toHaveText("SC");
      await expect(avatars.nth(index)).toHaveAttribute("aria-label", "Samira Chen account");
    }
  });
}
