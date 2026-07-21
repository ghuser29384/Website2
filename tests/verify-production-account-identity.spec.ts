import { mkdirSync, writeFileSync } from "node:fs";

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
  { name: "live", path: "/moral-trade-live.html", requiresVisibleAvatar: true },
  { name: "discover", path: "/discover", requiresVisibleAvatar: true },
  { name: "walkthrough", path: "/walkthrough", requiresVisibleAvatar: false },
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

    let responseOk = false;
    let navigationError: string | null = null;
    try {
      const response = await page.goto(route.path, { waitUntil: "domcontentloaded" });
      responseOk = response?.ok() === true;
    } catch (error) {
      navigationError = error instanceof Error ? error.message : String(error);
    }

    let bridgeLoaded = false;
    let bridgeError: string | null = null;
    try {
      await page.waitForFunction(
        () =>
          Boolean(
            (window as typeof window & { __MT_ACCOUNT_IDENTITY__?: boolean })
              .__MT_ACCOUNT_IDENTITY__,
          ),
        undefined,
        { timeout: 15_000 },
      );
      bridgeLoaded = true;
    } catch (error) {
      bridgeError = error instanceof Error ? error.message : String(error);
    }

    const avatars = page.locator('[data-mt-account-avatar="true"]');
    let avatarReady = false;
    let avatarWaitError: string | null = null;
    if (route.requiresVisibleAvatar) {
      try {
        await expect.poll(() => avatars.count(), { timeout: 15_000 }).toBeGreaterThan(0);
        avatarReady = true;
      } catch (error) {
        avatarWaitError = error instanceof Error ? error.message : String(error);
      }
    } else {
      avatarReady = true;
    }

    await page.waitForTimeout(250);
    const pathname = new URL(page.url()).pathname;
    const title = await page.title();
    const bodyText = (await page.locator("body").innerText()).trim();
    const overlayCount = await page
      .locator("nextjs-portal,[data-nextjs-dialog-overlay],#webpack-dev-server-client-overlay")
      .count();
    const avatarCount = await avatars.count();
    const avatarTexts: string[] = [];
    const avatarLabels: Array<string | null> = [];
    for (let index = 0; index < avatarCount; index += 1) {
      avatarTexts.push((await avatars.nth(index).innerText()).trim());
      avatarLabels.push(await avatars.nth(index).getAttribute("aria-label"));
    }
    const legacyInitialCount = await page.getByText("AJ", { exact: true }).count();
    const legacyNameCount = await page.getByText("Alex Johnson", { exact: true }).count();

    let screenshotError: string | null = null;
    try {
      await page.screenshot({
        path: `test-results/production-${route.name}-account.png`,
        fullPage: false,
      });
    } catch (error) {
      screenshotError = error instanceof Error ? error.message : String(error);
    }

    let lateAvatarText: string | null = null;
    let lateAvatarLabel: string | null = null;
    let lateAvatarError: string | null = null;
    try {
      await page.evaluate(() => {
        const accountSurface = document.querySelector(".topbar,[role='banner'],header");
        if (!accountSurface) throw new Error("Production account surface was not rendered");

        const lateAvatar = document.createElement("span");
        lateAvatar.id = "late-account-avatar";
        lateAvatar.textContent = "AJ";
        accountSurface.appendChild(lateAvatar);
      });
      await expect(page.locator("#late-account-avatar")).toHaveText("SC");
      lateAvatarText = (await page.locator("#late-account-avatar").innerText()).trim();
      lateAvatarLabel = await page.locator("#late-account-avatar").getAttribute("aria-label");
    } catch (error) {
      lateAvatarError = error instanceof Error ? error.message : String(error);
    }

    const diagnostics = {
      route,
      responseOk,
      navigationError,
      bridgeLoaded,
      bridgeError,
      avatarReady,
      avatarWaitError,
      pathname,
      title,
      bodyHasText: bodyText.length > 0,
      overlayCount,
      avatarCount,
      avatarTexts,
      avatarLabels,
      legacyInitialCount,
      legacyNameCount,
      lateAvatarText,
      lateAvatarLabel,
      lateAvatarError,
      screenshotError,
      pageErrors,
      consoleErrors,
    };
    writeFileSync(
      `test-results/production-${route.name}-diagnostics.json`,
      `${JSON.stringify(diagnostics, null, 2)}\n`,
      "utf8",
    );

    expect(responseOk, navigationError ?? "Production route did not return an OK response").toBe(true);
    expect(bridgeLoaded, bridgeError ?? "Account identity bridge did not load").toBe(true);
    expect(avatarReady, avatarWaitError ?? "Account avatar did not render").toBe(true);
    expect(pathname).toBe(route.path);
    expect(title).toMatch(/Moral Trade/u);
    expect(bodyText.length).toBeGreaterThan(0);
    expect(overlayCount).toBe(0);
    if (route.requiresVisibleAvatar) expect(avatarCount).toBeGreaterThan(0);
    expect(avatarTexts.every((text) => text === "SC")).toBe(true);
    expect(avatarLabels.every((label) => label === "Samira Chen account")).toBe(true);
    expect(legacyInitialCount).toBe(0);
    expect(legacyNameCount).toBe(0);
    expect(lateAvatarText).toBe("SC");
    expect(lateAvatarLabel).toBe("Samira Chen account");
    expect(lateAvatarError).toBeNull();
    expect(screenshotError).toBeNull();
    expect(pageErrors).toEqual([]);
    expect(consoleErrors).toEqual([]);
  });
}
