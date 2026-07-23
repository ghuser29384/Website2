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

  await page.locator('[data-trade="match"]').click();
  await page.locator('[data-trade="build"]').click();
  await expect(page.locator('.token[data-mt-autocomplete-ready="true"]')).toHaveCount(6);
});

test("the exact live offer palette uses three offer types and collects shared attributes", async ({
  page,
}, testInfo) => {
  await installLiveFixtures(page);
  await page.goto("/moral-trade-live.html#trade", { waitUntil: "domcontentloaded" });

  const offerTypeLabels = page.locator(
    '[data-mt-offer-type] .mt-offer-ingredient-label',
  );
  await expect(offerTypeLabels).toHaveText([
    "Money",
    "Behavior or commitment",
    "Help or service",
  ]);
  await expect(page.locator('[data-ingredient="Time"]')).toHaveCount(0);
  await expect(page.locator('[data-ingredient="Behavior"]')).toHaveCount(0);
  await expect(page.locator('[data-ingredient="Skill"]')).toHaveCount(0);
  await expect(page.locator(".mt-offer-group-label")).toHaveText([
    "Offer type",
    "Conditions and safeguards",
  ]);

  await page.locator('[data-mt-offer-type="behavior"]').click();
  const behaviorClause = page.locator(".clause").filter({
    has: page.locator(".clause-label", { hasText: "Behavior or commitment" }),
  });
  await expect(behaviorClause.locator(".mt-offer-attribute-label")).toHaveText([
    "Estimated time",
    "Relevant skills",
    "Deliverable or completion condition",
    "Verification method",
  ]);
  const behaviorTokens = behaviorClause.locator('.token[contenteditable="true"]');
  await expect(behaviorTokens).toHaveCount(5);
  await expect(behaviorTokens.first()).toHaveAttribute(
    "data-mt-autocomplete-context",
    "commitments",
  );
  await expect(behaviorTokens.last()).toHaveAttribute(
    "data-mt-autocomplete-context",
    "evidence",
  );
  await expect(behaviorTokens).toHaveAttribute("data-mt-autocomplete-ready", "true");

  await page.locator('[data-mt-offer-type="service"]').click();
  const serviceClause = page.locator(".clause").filter({
    has: page.locator(".clause-label", { hasText: "Help or service" }),
  });
  await expect(serviceClause.locator(".mt-offer-attribute-label")).toHaveText([
    "Estimated time",
    "Relevant skills",
    "Deliverable or completion condition",
    "Verification method",
  ]);
  await expect(serviceClause.locator('.token[contenteditable="true"]')).toHaveCount(5);

  await page.locator('[data-mt-offer-type="money"]').click();
  const moneyClause = page.locator(".clause").filter({
    has: page.locator(".clause-label", { hasText: "Money" }),
  });
  await expect(moneyClause.locator(".mt-offer-attribute-label")).toHaveText([
    "Estimated time",
    "Relevant skills",
    "Deliverable or completion condition",
    "Verification method",
  ]);
  await expect(
    moneyClause.locator('[data-mt-autocomplete-disabled="true"]'),
  ).toHaveCount(1);
  await expect(
    moneyClause.locator('[data-mt-autocomplete-context="priorities"]'),
  ).toHaveCount(1);

  await page.screenshot({
    path: testInfo.outputPath("structured-offer-types.png"),
    fullPage: true,
  });

  await page.locator('[data-trade="match"]').click();
  await page.locator('[data-trade="build"]').click();
  await expect(offerTypeLabels).toHaveText([
    "Money",
    "Behavior or commitment",
    "Help or service",
  ]);
  await expect(behaviorClause.locator(".mt-offer-attribute-label")).toHaveCount(4);
  await expect(serviceClause.locator(".mt-offer-attribute-label")).toHaveCount(4);
  await expect(moneyClause.locator(".mt-offer-attribute-label")).toHaveCount(4);
});
