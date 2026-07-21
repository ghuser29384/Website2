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
  test(`${path} uses the authenticated account instead of the legacy AJ identity`, async ({ page }) => {
    await page.route("**/api/live-account", (route) =>
      route.fulfill({
        contentType: "application/json",
        body: JSON.stringify(accountFixture),
      }),
    );

    await page.goto(path, { waitUntil: "domcontentloaded" });

    const avatars = page.locator('[data-mt-account-avatar="true"]');
    await expect.poll(() => avatars.count(), { timeout: 15_000 }).toBeGreaterThan(0);

    const avatarCount = await avatars.count();
    for (let index = 0; index < avatarCount; index += 1) {
      await expect(avatars.nth(index)).toHaveText("SC");
      await expect(avatars.nth(index)).toHaveAttribute("aria-label", "Samira Chen account");
    }

    await expect(page.getByText("AJ", { exact: true })).toHaveCount(0);
    await expect(page.getByText("Alex Johnson", { exact: true })).toHaveCount(0);

    await page.evaluate(() => {
      const lateAvatar = document.createElement("span");
      lateAvatar.id = "late-account-avatar";
      lateAvatar.textContent = "AJ";
      const accountSurface = document.querySelector(".topbar,[role='banner'],header");
      if (!accountSurface) throw new Error("Account surface was not rendered");
      accountSurface.appendChild(lateAvatar);
    });

    await expect(page.locator("#late-account-avatar")).toHaveText("SC");
    await expect(page.locator("#late-account-avatar")).toHaveAttribute(
      "aria-label",
      "Samira Chen account",
    );
  });
}
