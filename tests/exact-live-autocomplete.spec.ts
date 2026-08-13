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
  await page.route("**/api/nonprofits/search**", (route) => {
    const query = new URL(route.request().url()).searchParams.get("q") ?? "";
    const results = /red cross/i.test(query)
      ? [
          {
            label: "American National Red Cross",
            description: "501(c)(3) charity · Washington, DC · EIN 53-0196605",
            aliases: ["American Red Cross"],
            kind: "organization",
            source: "ProPublica Nonprofit Explorer / IRS",
            ein: "53-0196605",
            profileUrl: "https://projects.propublica.org/nonprofits/organizations/530196605",
            subsection: 3,
            score: 120,
          },
        ]
      : [];

    return route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        query,
        results,
        source: "ProPublica Nonprofit Explorer / IRS",
      }),
    });
  });
}

test("the exact live trade clauses autocomplete causes, charities, and organizations", async ({
  page,
}, testInfo) => {
  await installLiveFixtures(page);
  await page.goto("/moral-trade-live.html#trade", { waitUntil: "domcontentloaded" });

  const offerClause = page.locator(".clause").filter({
    has: page.locator(".clause-label", { hasText: "I offer" }),
  });
  const amountToken = offerClause.locator('.token[contenteditable="true"]').first();
  const recipientToken = offerClause.locator('.token[contenteditable="true"]').nth(1);

  await expect(amountToken).not.toHaveAttribute("data-mt-autocomplete-ready", "true");
  await expect(recipientToken).toHaveAttribute("data-mt-autocomplete-ready", "true");
  await expect(recipientToken).toHaveAttribute("data-mt-autocomplete-context", "recipients");

  await recipientToken.fill("Globla poverty");
  await expect(recipientToken).toHaveText("Global poverty", { timeout: 2_000 });
  const correctionNotice = page.locator(".mt-input-assist-correction");
  await expect(correctionNotice).toContainText(
    "Changed “Globla poverty” to “Global poverty”.",
  );
  await correctionNotice.getByRole("button", { name: "Undo" }).click();
  await expect(recipientToken).toHaveText("Globla poverty");
  await page.waitForTimeout(800);
  await expect(recipientToken).toHaveText("Globla poverty");

  const activationToken = page
    .locator(".clause")
    .filter({ has: page.locator(".clause-label", { hasText: "Activation condition" }) })
    .locator('.token[contenteditable="true"]');
  await expect(activationToken).not.toHaveAttribute("data-mt-autocomplete-ready", "true");

  const panel = page.locator('[data-mt-live-token-panel="true"]');
  await recipientToken.fill("Animal");
  await expect(panel).toBeVisible();
  await expect(panel.getByText("Animal welfare", { exact: true })).toBeVisible();
  await expect(panel.getByText("ACE Recommended Charity Fund", { exact: true })).toBeVisible();
  await expect(panel.locator('[data-mt-suggestion-kind="cause"]')).not.toHaveCount(0);
  await expect(panel.locator('[data-mt-suggestion-kind="organization"]')).not.toHaveCount(0);

  await recipientToken.fill("Longterm Futures Fund");
  await expect(panel.getByText("EA Long-Term Future Fund", { exact: true })).toBeVisible();

  await recipientToken.fill("Red Cross");
  await expect(panel.getByText("American National Red Cross", { exact: true })).toBeVisible();
  await expect(panel.locator('[data-mt-suggestion-kind="cause"]')).toHaveCount(0);
  await expect(
    panel.getByText(/Organization · 501\(c\)\(3\) charity · Washington, DC/),
  ).toBeVisible();
  await page.screenshot({
    path: testInfo.outputPath("organization-autocomplete-visible.png"),
    fullPage: false,
  });

  await panel.getByText("American National Red Cross", { exact: true }).click();
  await expect(recipientToken).toHaveText("American National Red Cross");
  await expect(recipientToken).toHaveAttribute("data-mt-selected-kind", "organization");
  await expect(recipientToken).toHaveAttribute("data-mt-selected-ein", "53-0196605");
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

test("the exact live commitment field composes topic-specific semantic matches", async ({
  page,
}, testInfo) => {
  await installLiveFixtures(page);
  await page.goto("/moral-trade-live.html#trade", { waitUntil: "domcontentloaded" });
  await page.locator('[data-mt-offer-type="behavior"]').click();

  const behaviorClause = page.locator(".clause").filter({
    has: page.locator(".clause-label", { hasText: "Behavior or commitment" }),
  });
  const commitmentToken = behaviorClause.locator(
    '.mt-offer-primary [data-mt-autocomplete-context="commitments"]',
  );
  const panel = page.locator('[data-mt-live-token-panel="true"]');

  await commitmentToken.fill("I'll do wild-animal-suffering research");
  await expect(panel).toBeVisible();
  const optionLabels = panel.locator(".mt-input-assist-option strong");
  await expect(optionLabels.nth(0)).toHaveText(
    "Research wild animal suffering for fixed hours",
  );
  await expect(optionLabels.nth(1)).toHaveText(
    "Complete a defined wild animal suffering research deliverable",
  );
  await expect(optionLabels.nth(2)).toHaveText(
    "Complete a wild animal suffering literature review",
  );
  await expect(optionLabels.nth(3)).toHaveText(
    "Publish a wild animal suffering research output",
  );

  await page.keyboard.press("Enter");
  await expect(commitmentToken).toHaveText(
    "Research wild animal suffering for fixed hours",
  );

  await commitmentToken.fill("I'll do insect consciousness reserch");
  await expect(
    panel.getByText("Research insect consciousness for fixed hours", {
      exact: true,
    }),
  ).toBeVisible();
  await page.screenshot({
    path: testInfo.outputPath("semantic-commitment-options.png"),
    fullPage: false,
  });
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
  for (let index = 0; index < 5; index += 1) {
    await expect(behaviorTokens.nth(index)).toHaveAttribute(
      "data-mt-autocomplete-ready",
      "true",
    );
  }

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
    moneyClause.locator('[data-mt-autocomplete-context="recipients"]'),
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
