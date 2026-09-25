import { readFileSync } from "node:fs";
import { expect, test, type Page } from "@playwright/test";

const core = readFileSync("public/moral-trade-live-core.txt", "utf8");
const styles = core.match(/<style>([\s\S]*?)<\/style>/)?.[1];
const drawer = core.match(/function profileDrawer\(\) \{[\s\S]*?(?=\nfunction commandDrawer)/)?.[0];
const bridge = readFileSync("public/moral-trade-live-account.js", "utf8");
if (!styles || !drawer) throw new Error("The live account drawer fixture could not be extracted.");

const account = {
  displayName: "Test Member", firstName: "Test", initials: "TM",
  memberSince: "2026-04-01T12:00:00Z", completedCommitments: 0,
  paymentAccount: { configured: true, label: "Setup incomplete" },
  notifications: { enabled: false, label: "Off" },
  publicTrustProfile: { enabled: false, label: "Private" },
  defaultPrivacy: "Strict", standardTerms: { href: "/terms", label: "Current site terms" },
};

async function mountAccount(page: Page, authenticated = true) {
  // Isolated DOM integration, not an authenticated server or payment test.
  // All navigation is recorded and prevented before it leaves this fixture.
  await page.setContent(`<!doctype html><html lang="en"><head>
    <title>Account controls — isolated regression fixture</title><style>${styles}</style>
    </head><body><header class="topbar"><span>Moral Trade</span>
    <button class="avatar" data-action="profile" aria-label="Account">•</button></header>
    <div id="overlay" class="overlay"><aside id="drawer" class="drawer"></aside></div>
    </body></html>`);
  await page.evaluate((payload) => {
    Object.assign(window, {
      __MT_LIVE_ACCOUNT_BOOTSTRAP__: payload,
      __accountFrames: 0,
      __accountNavigation: [],
    });
    const target = window as typeof window & { __accountFrames: number; __accountNavigation: string[] };
    const original = window.requestAnimationFrame.bind(window);
    window.requestAnimationFrame = (callback) => {
      target.__accountFrames += 1;
      return original(callback);
    };
    document.addEventListener("click", (event) => {
      const link = event.target instanceof Element ? event.target.closest("a[href]") : null;
      if (link) {
        event.preventDefault();
        target.__accountNavigation.push(link.getAttribute("href")!);
      }
    }, true);
  }, { authenticated, account: authenticated ? account : {} });
  await page.addScriptTag({ content: `${drawer}
    function openAccount() {
      document.getElementById('drawer').innerHTML = profileDrawer();
      document.getElementById('overlay').classList.add('open');
    }
    document.querySelector('[data-action="profile"]').addEventListener('click', openAccount);
    document.addEventListener('click', (event) => {
      if (event.target instanceof Element && event.target.closest('[data-action="close"]')) {
        document.getElementById('overlay').classList.remove('open');
      }
    });` });
  await page.addScriptTag({ content: bridge });
  await page.locator('[data-action="profile"]').click();
  await expect(page.locator('[data-mt-live-account-action="payment-account"]')).toBeVisible();
}

const destinations = {
  "payment-account": "/dashboard#payment-setup",
  notifications: "/dashboard#privacy-controls",
  "public-trust": "/dashboard#wish-profile",
  privacy: "/dashboard#privacy-controls",
  terms: "/terms",
};

test("account readouts stay truthful and every destination action responds", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await mountAccount(page);
  await expect(page).toHaveTitle("Account controls — isolated regression fixture");
  await expect(page.locator('[data-mt-live-account-row="notifications"]')).toContainText("Off");
  await expect(page.locator('[data-mt-live-account-row="public-trust"]')).toContainText("Private");
  await expect(page.locator('[data-mt-live-account-panel] [disabled]')).toHaveCount(0);
  for (const [key, href] of Object.entries(destinations)) {
    const link = page.locator(`[data-mt-live-account-action="${key}"]`);
    await expect(link).toHaveAttribute("href", href);
    await link.click();
  }
  await page.getByRole("link", { name: "Manage account", exact: true }).press("Enter");
  expect(await page.evaluate(() => Reflect.get(window, "__accountNavigation")))
    .toEqual([...Object.values(destinations), "/dashboard"]);
  expect(errors).toEqual([]);
});

test("unavailable controls explain their limits with pointer and keyboard", async ({ page }) => {
  await mountAccount(page);
  for (const key of ["currency", "safe-cap", "dispute"]) {
    const action = page.locator(`[data-mt-live-account-action="${key}"]`);
    const help = page.locator(`[data-mt-live-account-help="${key}"]`);
    await expect(help).toBeHidden();
    await action.click();
    await expect(action).toHaveAttribute("aria-expanded", "true");
    await expect(help).toBeVisible();
    await action.press("Space");
    await expect(help).toBeHidden();
    await action.press("Enter");
    await expect(help).toBeVisible();
  }
  await expect(page.locator('[data-mt-live-account-help="safe-cap"]'))
    .toContainText("No monthly spending limit is enforced");
});

test("signed-out users get sign-in links without losing the return destination", async ({ page }) => {
  await mountAccount(page, false);
  for (const [key, href] of Object.entries(destinations)) {
    await expect(page.locator(`[data-mt-live-account-action="${key}"]`))
      .toHaveAttribute("href", key === "terms" ? href : `/login?returnTo=${encodeURIComponent(href)}`);
  }
  await expect(page.locator('[data-mt-live-account-manage]'))
    .toHaveAttribute("href", "/login?returnTo=%2Fdashboard");
  await expect(page.locator('[data-mt-live-account-name]')).toHaveText("Account");
});

test("patching settles, preserves focus, and tolerates drawer reopening", async ({ page }) => {
  await mountAccount(page);
  const action = page.locator('[data-mt-live-account-action="safe-cap"]');
  await action.focus();
  await page.waitForTimeout(250);
  const frames = await page.evaluate(() => Reflect.get(window, "__accountFrames"));
  await page.waitForTimeout(250);
  expect(await page.evaluate(() => Reflect.get(window, "__accountFrames"))).toBe(frames);
  await expect(action).toBeFocused();
  await page.getByRole("button", { name: "Close account", exact: true }).click();
  await page.locator('[data-action="profile"]').click();
  await expect(page.locator('[data-mt-live-account-help]')).toHaveCount(3);
  await action.click();
  await expect(page.locator('[data-mt-live-account-help="safe-cap"]')).toBeVisible();
});

for (const width of [320, 390, 768, 1440]) {
  test(`account actions remain reachable at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await mountAccount(page);
    const drawer = page.locator("#drawer");
    expect(await drawer.evaluate((element) => element.scrollWidth <= element.clientWidth)).toBe(true);
    await page.locator('[data-mt-live-account-action="safe-cap"]').click();
    await expect(page.locator('[data-mt-live-account-help="safe-cap"]')).toBeVisible();
    await page.getByRole("link", { name: "Manage account", exact: true }).click();
  });
}
