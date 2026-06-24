import assert from "node:assert/strict";
import test from "node:test";

import {
  MARKETPLACE_KPI_KEYS,
  MARKETPLACE_MEASUREMENT_FUNNEL_EVENTS,
  buildMarketplaceKpiSnapshot,
  getMarketplaceMeasurementContract,
  validateMarketplaceKpiSnapshot,
  validateMarketplaceMeasurementContract,
} from "./marketplace-measurement";
import { buildPublicOffersCollectionPayload } from "./public-offers";

test("marketplace measurement contract covers privacy-safe events and KPI keys", () => {
  const contract = getMarketplaceMeasurementContract();
  const validation = validateMarketplaceMeasurementContract();
  const eventTypes = contract.eventSpecs.map((event) => event.eventType);
  const kpiKeys = contract.kpiDefinitions.map((kpi) => kpi.key);
  const receiptPreviewSpec = contract.eventSpecs.find(
    (event) => event.eventType === "marketplace_public_receipt_previewed",
  );

  assert.equal(validation.status, "pass");
  assert.deepEqual(validation.blockers, []);
  assert.ok(MARKETPLACE_MEASUREMENT_FUNNEL_EVENTS.every((eventType) => eventTypes.includes(eventType)));
  assert.ok(MARKETPLACE_KPI_KEYS.every((key) => kpiKeys.includes(key)));
  assert.ok(eventTypes.includes("marketplace_intake_triage_routed"));
  assert.ok(eventTypes.includes("marketplace_claim_correction_resolved"));
  assert.ok(kpiKeys.includes("public_receipt_preview_count"));
  assert.ok(kpiKeys.includes("claim_correction_resolution_count"));
  assert.ok(receiptPreviewSpec?.allowedMetadata.includes("publicationState"));
  assert.ok(contract.minimumPublicCount >= 3);
  assert.ok(contract.privacyRules.some((rule) => /raw wishes, private evidence, source notes/i.test(rule)));
  assert.ok(contract.contractTests.includes("marketplace_live_metric_exclusion"));
});

test("marketplace KPI snapshot excludes seed templates, worked examples, external CRECM module, and demo records from live metrics", () => {
  const publicOffersPayload = buildPublicOffersCollectionPayload({
    liveOffers: [],
    searchParams: new URLSearchParams("tab=all"),
  });
  const snapshot = buildMarketplaceKpiSnapshot({
    generatedAt: "2026-06-07T12:00:00.000Z",
    publicOffersPayload,
  });
  const validation = validateMarketplaceKpiSnapshot(snapshot);
  const liveOfferCount = snapshot.kpis.find((kpi) => kpi.key === "live_offer_count");
  const reviewableOfferCount = snapshot.kpis.find((kpi) => kpi.key === "reviewable_offer_count");

  assert.equal(validation.status, "pass");
  assert.equal(snapshot.reportMode, "aggregate");
  assert.equal(liveOfferCount?.publishedValue, 0);
  assert.equal(reviewableOfferCount?.publishedValue, 0);
  assert.ok(snapshot.excludedNonLiveInputs.some((entry) => entry.source === "seed_templates" && entry.count === 4));
  assert.ok(snapshot.excludedNonLiveInputs.some((entry) => entry.source === "worked_examples" && entry.count === 8));
  assert.ok(snapshot.excludedNonLiveInputs.some((entry) => entry.source === "external_crecm" && entry.count === 1));
  assert.ok(snapshot.excludedNonLiveInputs.every((entry) => entry.includedInLiveMetrics === false));
});

test("marketplace KPI snapshot suppresses nonzero small samples", () => {
  const snapshot = buildMarketplaceKpiSnapshot({
    metricInputs: [
      {
        key: "completed_agreement_count",
        sampleSize: 2,
        source: "marketplace_state_events",
        value: 2,
      },
      {
        key: "threshold_clear_rate",
        sampleSize: 2,
        source: "matching_clearing_runs",
        value: 7500,
      },
    ],
  });
  const validation = validateMarketplaceKpiSnapshot(snapshot);
  const completedAgreements = snapshot.kpis.find(
    (kpi) => kpi.key === "completed_agreement_count",
  );
  const thresholdClearRate = snapshot.kpis.find(
    (kpi) => kpi.key === "threshold_clear_rate",
  );

  assert.equal(validation.status, "pass");
  assert.equal(completedAgreements?.status, "suppressed");
  assert.equal(completedAgreements?.publishedValue, null);
  assert.equal(thresholdClearRate?.status, "suppressed");
  assert.equal(thresholdClearRate?.publishedValue, null);
});

test("marketplace KPI snapshot remains aggregate-only", () => {
  const snapshot = buildMarketplaceKpiSnapshot({
    metricInputs: [
      {
        key: "privacy_leakage_incidents_target_zero",
        sampleSize: 0,
        source: "review_quality_audits",
        value: 0,
      },
    ],
  });
  const serialized = JSON.stringify(snapshot);

  assert.equal(validateMarketplaceKpiSnapshot(snapshot).status, "pass");
  assert.equal(serialized.includes("profile_id"), false);
  assert.equal(serialized.includes("user_id"), false);
  assert.equal(serialized.includes("private_evidence"), false);
  assert.equal(serialized.includes("source_note"), false);
  assert.equal(serialized.includes("counterparty_message"), false);
});
