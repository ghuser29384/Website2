import { expect, test } from "@playwright/test";

const route = "/donation-upgrade";

test("Donation Upgrade explains the baseline, match, fallback, and claim boundary", async ({ page }) => {
  await page.goto(route);

  await expect(page.getByRole("heading", { level: 1 })).toHaveText(
    "The second $10 changes where the first goes.",
  );
  await expect(page.getByText("No match: original $10 proceeds")).toBeVisible();
  await expect(page.getByText("Not “every dollar doubles.”")).toBeVisible();

  const createLink = page.getByRole("link", { name: "Create a Donation Upgrade" }).first();
  await expect(createLink).toHaveAttribute("href", /structure=conditional-donation/);
  await expect(createLink).toHaveAttribute("href", /utm_campaign=donation_upgrade_2026/);

  const diagram = page.getByRole("img", { name: "How a Donation Upgrade changes the outcome" });
  await expect(diagram).toBeVisible();
  await page.screenshot({ fullPage: true, path: "test-results/donation-upgrade-desktop.png" });
});

test("Donation Upgrade does not overflow at a narrow mobile viewport", async ({ page }) => {
  await page.setViewportSize({ height: 844, width: 390 });
  await page.goto(route);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
  expect(overflow).toBe(false);
  await page.screenshot({ fullPage: true, path: "test-results/donation-upgrade-mobile.png" });
});
