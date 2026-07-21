import { mkdirSync } from "node:fs";

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

const productionRoutes = [
  { name: "live", path: "/moral-trade-live.html" },
  { name: "discover", path: "/discover" },
  { name: "walkthrough", path: "/walkthrough" },
] as const;

mkdirSync("test-results", { recursive: true });

for (const route of productionRoutes) {
  test(`${route.name} production shell resolves the authenticated account cleanly`, async ({ page }) => {
    const consoleErrors: string[] = [];
    const pageErrors: string[] = [];

    page.on("console", (message) => {
      if (message.type() === "error") consoleErrors.push(message.text());
    });
    page.on("pageerror", (error) => pageErrors.push(error.message));

    await page.route("**/api/live-account", (request) =>
      request.fulfill({
        contentType: "application/json",
        body: JSON.stringify(accountFixture),
      }),
    );

    const response = await page.goto(route.path, { waitUntil: "domcontentloaded" });
    expect(response?.ok()).toBe(true);

    await page.waitForFunction(
      () =>
        Boolean(
          (window as typeof window & { __MT_ACCOUNT_IDENTITY__?: boolean })
            .__MT_ACCOUNT_IDENTITY__,
        ),
      undefined,
      { timeout: 15_000 },
    );

    expect(new URL(page.url()).pathname).toBe(route.path);
    await expect(page).toHaveTitle(/Moral Trade/u);
    await expect(page.locator("body")).toContainText(/\S/u);
    await expect(
      page.locator("nextjs-portal,[data-nextjs-dialog-overlay],#webpack-dev-server-client-overlay"),
    ).toHaveCount(0);

    const avatars = page.locator('[data-mt-account-avatar="true"]');
    await expect.poll(() => avatars.count()).toBeGreaterThan(0);
    const avatarCount = await avatars.count();
    for (let index = 0; index < avatarCount; index += 1) {
      await expect(avatars.nth(index)).toHaveText("SC");
      await expect(avatars.nth(index)).toHaveAttribute("aria-label", "Samira Chen account");
    }

    await expect(page.getByText("AJ", { exact: true })).toHaveCount(0);
    await expect(page.getByText("Alex Johnson", { exact: true })).toHaveCount(0);

    await page.screenshot({
      path: `test-results/production-${route.name}-account.png`,
      fullPage: false,
    });

    await page.evaluate(() => {
      const accountSurface = document.querySelector(".topbar,[role='banner'],header");
      if (!accountSurface) throw new Error("Production account surface was not rendered");

      const lateAvatar = document.createElement("span");
      lateAvatar.id = "late-account-avatar";
      lateAvatar.textContent = "AJ";
      accountSurface.appendChild(lateAvatar);
    });
    await expect(page.locator("#late-account-avatar")).toHaveText("SC");
    await expect(page.locator("#late-account-avatar")).toHaveAttribute(
      "aria-label",
      "Samira Chen account",
    );

    expect(pageErrors).toEqual([]);
    expect(consoleErrors).toEqual([]);
  });
}
