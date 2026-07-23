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

test("the exact live trade clauses autocomplete causes, charities, and organizations", async ({ page }, testInfo) => {
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
  await expect(
    panel.getByText(/Organization · 501\(c\)\(3\) charity · Washington, DC/),
  ).toBeVisible();
  await page.screenshot({
    path: testInfo.outputPath("organization-autocomplete-visible.png"),
    fullPage: false,
  });

  await panel.getByText("American National Red Cross", { exact: true }).click();
  await expect(recipientToken).toHaveText("American National Red Cross");
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
