import { expect, test } from "@playwright/test";

async function installLiveFixtures(page: import("@playwright/test").Page) {
  await page.route("**/api/live-account", (route) =>
    route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({ authenticated: false }),
    }),
  );
  await page.route("**/api/live-now", (route) =>
    route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        authenticated: false,
        recommendations: [],
        status: "unavailable",
        routePlanner: {
          status: "unavailable",
          checkedAt: "2026-07-23T00:00:00.000Z",
          profile: {},
          needsMoreInput: [],
          routes: [],
          comparison: null,
          candidateCount: 0,
        },
      }),
    }),
  );
}

test("the exact live trade clauses autocomplete their contenteditable terms", async ({ page }, testInfo) => {
  await installLiveFixtures(page);
  await page.goto("/moral-trade-live.html#trade", { waitUntil: "domcontentloaded" });

  const offerClause = page.locator(".clause").filter({
    has: page.locator(".clause-label", { hasText: "I offer" }),
  });
  const amountToken = offerClause.locator('.token[contenteditable="true"]').first();
  const causeToken = offerClause.locator('.token[contenteditable="true"]').nth(1);

  await expect(amountToken).not.toHaveAttribute("data-mt-autocomplete-ready", "true");
  await expect(causeToken).toHaveAttribute("data-mt-autocomplete-ready", "true");
  await expect(causeToken).toHaveAttribute("data-mt-autocomplete-context", "priorities");

  const activationToken = page
    .locator(".clause")
    .filter({ has: page.locator(".clause-label", { hasText: "Activation condition" }) })
    .locator('.token[contenteditable="true"]');
  await expect(activationToken).not.toHaveAttribute("data-mt-autocomplete-ready", "true");

  await causeToken.fill("Animal");

  const panel = page.locator('[data-mt-live-token-panel="true"]');
  await expect(panel).toBeVisible();
  await expect(panel.locator(".mt-input-assist-option strong")).toHaveText([
    "Animal welfare",
    "Wild animal suffering",
    "Factory farming",
  ]);
  await page.screenshot({
    path: testInfo.outputPath("autocomplete-visible.png"),
    fullPage: false,
  });

  await panel.locator(".mt-input-assist-option").first().click();
  await expect(causeToken).toHaveText("Animal welfare");
  await expect(panel).toBeHidden();

  const proofToken = page
    .locator(".clause")
    .filter({ has: page.locator(".clause-label", { hasText: "Proof" }) })
    .locator('.token[contenteditable="true"]')
    .first();
  await proofToken.fill("receipt");
  await expect(panel).toBeVisible();
  await expect(panel.locator(".mt-input-assist-option strong").first()).toHaveText(
    "Redacted donation receipt",
  );
  await page.keyboard.press("Enter");
  await expect(proofToken).toHaveText("Redacted donation receipt");

  await page.locator('[data-ingredient="Time"]').click();
  const timeToken = page
    .locator(".clause")
    .filter({ has: page.locator(".clause-label", { hasText: "Time" }) })
    .locator('.token[contenteditable="true"]');
  await expect(timeToken).toHaveAttribute("data-mt-autocomplete-context", "commitments");

  await page.locator('[data-trade="match"]').click();
  await page.locator('[data-trade="build"]').click();
  await expect(page.locator('.token[data-mt-autocomplete-ready="true"]')).toHaveCount(7);
});
