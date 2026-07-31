import { mkdir } from "node:fs/promises";

import { expect, test, type Page, type Route } from "@playwright/test";

const wildPool = "pool-wild-research";
const wildCampaign = "campaign-animal-welfare-transition";

function availableEstimate(pledgeCents: number) {
  const additional = Math.round(pledgeCents * 2.9);
  const gap = 820_000;
  const without = 4_200;
  const change = Math.round((pledgeCents / 8_500) * 150);
  return {
    status: "available",
    experimental: true,
    poolPublicKey: wildPool,
    campaignId: wildCampaign,
    pledgeCents,
    currency: "USD",
    additionalFundingFromOthers: {
      estimateCents: additional,
      lower90Cents: Math.round(additional * 0.2),
      upper90Cents: Math.round(additional * 2.8),
    },
    fundingMultiplier: pledgeCents ? 2.9 : 0,
    allocatedFundingCredit: {
      estimateCents: Math.round(additional * 0.34),
      lower90Cents: Math.round(additional * 0.18),
      upper90Cents: Math.round(additional * 0.52),
    },
    thresholds: [
      {
        thresholdIndex: 1,
        thresholdCents: 2_500_000,
        probabilityWithoutPledgeBps: without,
        probabilityWithPledgeBps: without + change,
        lower90ChangeBps: pledgeCents >= 8_500 ? 70 : 20,
        upper90ChangeBps: change + 80,
      },
    ],
    failureBonusConditionalOnFailure: {
      projectedCents: Math.round(pledgeCents * 0.04),
      lower90Cents: Math.round(pledgeCents * 0.02),
      upper90Cents: Math.round(pledgeCents * 0.06),
      guaranteedMinimumCents: Math.round(pledgeCents * 0.01),
    },
    decomposition: {
      directThresholdEffectCents: Math.round(additional * 0.8),
      followOnContributionEffectCents: 0,
      settlementAdjustmentCents: -Math.round(additional * 0.05),
      timingEffectCents: Math.round(additional * 0.25),
    },
    mechanicalEffect: {
      currentGapCents: gap,
      remainingAfterPledgeCents: Math.max(0, gap - pledgeCents),
      shareOfCurrentGapBps: Math.round((pledgeCents * 10_000) / gap),
    },
    recommendation: {
      pledgeCents: 8_500,
      thresholdIndex: 1,
      lower90ChangeBps: 70,
      forecastErrorFloorBps: 50,
    },
    followOnEffect: {
      included: false,
      evidenceType: "none",
      evidenceReference: null,
    },
    modelPerformance: {
      sampleSize: 1_240,
      evaluationWindowStart: "2026-04-01T00:00:00.000Z",
      evaluationWindowEnd: "2026-07-30T23:59:59.000Z",
      brierScore: 0.173,
      calibrationErrorBps: 42,
      notes: "QA fixture; no viewer-level inputs.",
    },
    forecastVersion: "qa-wild-v1",
    modelVersion: "qa-model-v1",
    releasedAt: "2026-07-31T12:00:00.000Z",
    expiresAt: "2026-07-31T14:00:00.000Z",
    explanation: {
      causalEstimatesMayOverlap: true,
      allocatedCreditIsNotCausal: true,
      failureBonusIsConditionalOnFailure: true,
    },
  };
}

function unavailableEstimate(
  pledgeCents: number,
  reason: "forecast_not_released" | "forecast_stale" | "pool_state_mismatch",
) {
  const message = {
    forecast_not_released: "No approved forecast has been released for this pool. Only the mechanical gap change is shown.",
    forecast_stale: "The latest released forecast has expired. Only the mechanical gap change is shown until the model refreshes.",
    pool_state_mismatch: "The pool changed after this forecast was released. The estimate is withheld until the model refreshes.",
  }[reason];
  return {
    status: "unavailable",
    experimental: true,
    poolPublicKey: wildPool,
    campaignId: wildCampaign,
    pledgeCents,
    reason,
    message,
    mechanicalEffect: {
      currentGapCents: 820_000,
      remainingAfterPledgeCents: Math.max(0, 820_000 - pledgeCents),
      shareOfCurrentGapBps: Math.round((pledgeCents * 10_000) / 820_000),
    },
  };
}

async function mockPledgeImpact(
  page: Page,
  mode: "available" | "forecast_not_released" | "forecast_stale" | "pool_state_mismatch" = "available",
) {
  await page.route("**/api/mpgf/pledge-impact?**", async (route: Route) => {
    const url = new URL(route.request().url());
    const pledgeCents = Number(url.searchParams.get("pledgeCents") || 0);
    const payload = mode === "available"
      ? availableEstimate(pledgeCents)
      : unavailableEstimate(pledgeCents, mode);
    await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(payload) });
  });
}

function monitorBrowserFailures(page: Page) {
  const consoleErrors: string[] = [];
  const pageErrors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  page.on("pageerror", (error) => pageErrors.push(error.message));
  return { consoleErrors, pageErrors };
}

async function selectWildCampaign(page: Page) {
  await page.getByTestId("threshold-campaign-wild").click();
  await expect(
    page.getByRole("heading", { name: /Wild-animal suffering research pool/i }),
  ).toBeVisible();
}

test("React radar shows available estimates, slider recalculation, recommendation, disclosure, and exact CTA", async ({ page }) => {
  await page.setViewportSize({ width: 1487, height: 1058 });
  const failures = monitorBrowserFailures(page);
  await mockPledgeImpact(page);
  await page.goto("/pools/radar", { waitUntil: "networkidle" });
  await selectWildCampaign(page);

  const estimate = page.getByTestId("pledge-impact-estimate");
  await expect(estimate).toContainText("Estimated additional funding from others");
  await expect(page.getByTestId("pledge-impact-multiplier")).toContainText("2.9×");
  await expect(page.getByTestId("pledge-impact-pass-probability")).toContainText("42.0% →");

  const slider = page.getByRole("slider", { name: "Conditional pledge amount" });
  await slider.fill("2");
  await expect(slider).toHaveAttribute("aria-valuetext", "$25");
  await expect(page.getByTestId("pledge-impact-additional-funding")).toContainText("$73");

  await page.getByTestId("pledge-impact-recommendation").click();
  await expect(slider).toHaveAttribute("aria-valuetext", "$85");
  await expect(page.getByTestId("pledge-impact-additional-funding")).toContainText("$247");

  await page.getByTestId("pledge-impact-method-button").click();
  const dialog = page.getByTestId("pledge-impact-dialog");
  await expect(dialog).toContainText("1. Direct threshold effect");
  await expect(dialog).toContainText("2. Follow-on contribution effect");
  await expect(dialog).toContainText("3. Settlement adjustment");
  await expect(dialog).toContainText("4. Timing effect");
  await expect(dialog).toContainText("5. Credit allocation");
  await expect(dialog).toContainText("6. Uncertainty and model performance");
  await dialog.getByRole("button", { name: "Close calculation" }).click();

  const cta = page.getByRole("link", { name: /Make a conditional \$85 pledge/i });
  await expect(cta).toHaveAttribute(
    "href",
    "/mpgf/contribute?campaign=campaign-animal-welfare-transition&amount=85&pool=pool-wild-research&source=threshold-radar",
  );

  await mkdir("test-results", { recursive: true });
  await page.screenshot({ path: "test-results/pledge-impact-react-desktop.png", fullPage: true });
  expect(failures.consoleErrors).toEqual([]);
  expect(failures.pageErrors).toEqual([]);
});

for (const reason of ["forecast_not_released", "forecast_stale", "pool_state_mismatch"] as const) {
  test(`React radar fails closed for ${reason}`, async ({ page }) => {
    await mockPledgeImpact(page, reason);
    await page.goto("/pools/radar", { waitUntil: "networkidle" });
    await selectWildCampaign(page);
    await expect(page.getByTestId(`pledge-impact-unavailable-${reason}`)).toBeVisible();
    await expect(page.getByTestId(`pledge-impact-unavailable-${reason}`)).toContainText("Mechanical effect");
  });
}

test("static Discover threshold uses the same estimate, recommendation, disclosure, and contribution route", async ({ page }) => {
  await page.setViewportSize({ width: 1600, height: 1000 });
  const failures = monitorBrowserFailures(page);
  await mockPledgeImpact(page);
  await page.goto(
    "/discover?domain=pools&view=threshold&query=Find+pools&selected=pool-wild-research&selectedType=pool#discover",
    { waitUntil: "networkidle" },
  );
  await expect(page.locator("body")).not.toContainText("Loading Discover…");

  const inspector = page.locator(".inspector");
  await expect(inspector).toContainText("Preview your pledge impact");
  const estimate = inspector.locator('[data-pledge-impact-root][data-pool-key="pool-wild-research"]');
  await expect(estimate).toHaveAttribute("data-impact-status", "available");
  await expect(estimate.locator("[data-impact-multiplier]")).toContainText("2.9×");

  const slider = inspector.locator('[data-pledge-range][data-pool-id="pool-wild-research"]');
  await slider.fill("35");
  const refreshedEstimate = page.locator('.inspector [data-pledge-impact-root][data-pool-key="pool-wild-research"]');
  await expect(refreshedEstimate).toHaveAttribute("data-impact-status", "available");
  await expect(refreshedEstimate.locator("[data-impact-additional]")).toContainText("$102");

  await refreshedEstimate.locator("[data-impact-recommend]").click();
  await expect(page.locator('.inspector [data-pledge-range][data-pool-id="pool-wild-research"]')).toHaveValue("85");

  const latestEstimate = page.locator('.inspector [data-pledge-impact-root][data-pool-key="pool-wild-research"]');
  await latestEstimate.locator("[data-pledge-impact-method]").click();
  const dialog = page.locator("[data-pledge-impact-dialog]");
  await expect(dialog).toContainText("1. Direct threshold effect");
  await expect(dialog).toContainText("6. Uncertainty and model performance");
  await dialog.locator("[data-impact-close]").click();

  await expect(page.locator('.inspector a.primary-btn[href*="/mpgf/contribute"]')).toHaveAttribute(
    "href",
    "/mpgf/contribute?campaign=campaign-animal-welfare-transition&amount=85&pool=pool-wild-research&source=discover-threshold",
  );

  await mkdir("test-results", { recursive: true });
  await page.screenshot({ path: "test-results/pledge-impact-discover-desktop.png", fullPage: true });
  expect(failures.consoleErrors).toEqual([]);
  expect(failures.pageErrors).toEqual([]);
});

test("React and static Discover pledge-impact surfaces remain usable on mobile", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await mockPledgeImpact(page);

  await page.goto("/pools/radar", { waitUntil: "networkidle" });
  await selectWildCampaign(page);
  await expect(page.getByTestId("pledge-impact-estimate")).toBeVisible();
  await mkdir("test-results", { recursive: true });
  await page.screenshot({ path: "test-results/pledge-impact-react-mobile.png", fullPage: true });

  await page.goto(
    "/discover?domain=pools&view=threshold&selected=pool-wild-research&selectedType=pool#discover",
    { waitUntil: "networkidle" },
  );
  await expect(page.locator("body")).not.toContainText("Loading Discover…");
  await expect(page.locator('[data-pledge-impact-root][data-pool-key="pool-wild-research"]').first()).toHaveAttribute(
    "data-impact-status",
    "available",
  );
  const overflow = await page.evaluate(() => ({
    documentWidth: document.documentElement.scrollWidth,
    viewportWidth: window.innerWidth,
  }));
  expect(overflow.documentWidth).toBeLessThanOrEqual(overflow.viewportWidth + 1);
  await page.screenshot({ path: "test-results/pledge-impact-discover-mobile.png", fullPage: true });
});

test("exact contribution CTA prefill selects the mapped campaign and amount without creating state", async ({ page }) => {
  await page.goto(
    "/mpgf/contribute?campaign=campaign-animal-welfare-transition&amount=85&pool=pool-wild-research&source=threshold-radar",
    { waitUntil: "networkidle" },
  );

  await expect(page.getByTestId("mpgf-contribution-prefill")).toContainText(
    "No pledge has been saved and no payment has been authorized",
  );
  await expect(page.getByLabel("Campaign")).toHaveValue("campaign-animal-welfare-transition");
  await expect(page.getByLabel("Conditional pledge amount")).toHaveValue("85");
});
