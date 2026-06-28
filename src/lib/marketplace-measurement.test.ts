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
  assert.ok(eventTypes.includes("marketplace_route_simplification_audited"));
  assert.ok(eventTypes.includes("marketplace_plain_language_copy_blocked"));
  assert.ok(eventTypes.includes("marketplace_publication_pressure_reported"));
  assert.ok(eventTypes.includes("marketplace_verification_status_checked"));
  assert.ok(contract.firstClassRecordTables.includes("funnel_events"));
  assert.ok(
    contract.firstClassRecordTables.includes(
      "moral_trade_route_simplification_audit_records",
    ),
  );
  assert.ok(
    contract.firstClassRecordTables.includes(
      "moral_trade_participant_ui_render_snapshots",
    ),
  );
  assert.ok(
    contract.firstClassRecordTables.includes(
      "moral_trade_public_receipt_publication_reviews",
    ),
  );
  assert.ok(kpiKeys.includes("public_receipt_preview_count"));
  assert.ok(kpiKeys.includes("claim_correction_resolution_count"));
  assert.ok(kpiKeys.includes("route_simplification_audit_fail_count"));
  assert.ok(kpiKeys.includes("plain_language_copy_omission_block_count"));
  assert.ok(kpiKeys.includes("publication_pressure_report_count"));
  assert.ok(kpiKeys.includes("verification_url_status_check_count"));
  assert.ok(receiptPreviewSpec?.allowedMetadata.includes("publicationState"));
  assert.ok(
    contract.eventSpecs.every((event) =>
      event.allowedMetadata.every(
        (key) =>
          !/(profile|user|email|phone|contact|private|raw|message|note|source|evidence|receipt|counterparty|prompt|text)/i.test(
            key,
          ),
      ),
    ),
  );
  assert.ok(contract.minimumPublicCount >= 3);
  assert.ok(contract.privacyRules.some((rule) => /raw wishes, private evidence, source notes/i.test(rule)));
  assert.ok(contract.contractTests.includes("marketplace_live_metric_exclusion"));
});

test("marketplace measurement covers moraltrade82 route and receipt quality signals", () => {
  const contract = getMarketplaceMeasurementContract();
  const eventTypes = new Set(contract.eventSpecs.map((event) => event.eventType));
  const kpiKeys = new Set(contract.kpiDefinitions.map((kpi) => kpi.key));

  for (const eventType of [
    "marketplace_signed_out_offset_builder_blocked",
    "marketplace_factor_code_primary_copy_blocked",
    "marketplace_impact_score_default_surface_blocked",
    "marketplace_worked_example_card_overload_blocked",
    "marketplace_long_duration_default_example_blocked",
    "marketplace_safe_template_default_hidden_fact_blocked",
    "marketplace_term_map_inconsistency_blocked",
    "marketplace_direct_donation_parity_non_preference_blocked",
    "marketplace_sensitive_action_redacted",
    "marketplace_moral_score_language_blocked",
    "marketplace_anti_gamification_blocked",
    "marketplace_publication_as_trade_term_blocked",
  ] as const) {
    assert.equal(eventTypes.has(eventType), true, eventType);
  }

  for (const kpiKey of [
    "signed_out_offset_builder_dead_end_block_count",
    "factor_code_internal_enum_primary_copy_block_count",
    "impact_score_default_surface_block_count",
    "worked_example_card_overload_block_count",
    "long_duration_default_example_block_count",
    "safe_template_default_hidden_material_fact_block_count",
    "term_map_inconsistency_block_count",
    "direct_donation_parity_non_preference_block_count",
    "sensitive_action_redaction_count",
    "moral_score_language_block_count",
    "anti_gamification_block_count",
    "publication_as_trade_term_block_count",
  ] as const) {
    assert.equal(kpiKeys.has(kpiKey), true, kpiKey);
  }

  const routeAuditKpi = contract.kpiDefinitions.find(
    (kpi) => kpi.key === "route_simplification_audit_fail_count",
  );
  const taskCardKpi = contract.kpiDefinitions.find(
    (kpi) => kpi.key === "task_card_single_primary_action_block_count",
  );
  const receiptPublicationKpi = contract.kpiDefinitions.find(
    (kpi) => kpi.key === "publication_as_trade_term_block_count",
  );

  assert.ok(
    routeAuditKpi?.sourceTables.includes(
      "moral_trade_route_simplification_audit_records",
    ),
  );
  assert.ok(
    taskCardKpi?.sourceTables.includes(
      "moral_trade_participant_ui_render_snapshots",
    ),
  );
  assert.ok(
    taskCardKpi?.sourceTables.includes("moral_trade_participant_task_cards"),
  );
  assert.ok(
    receiptPublicationKpi?.sourceTables.includes(
      "moral_trade_public_receipt_publication_reviews",
    ),
  );
  assert.equal(
    contract.kpiDefinitions.some((kpi) =>
      kpi.sourceTables.includes("public_route_audit_records"),
    ),
    false,
  );
  assert.equal(
    contract.kpiDefinitions.some((kpi) =>
      kpi.sourceTables.includes("participant_ui_render_snapshots"),
    ),
    false,
  );
});

test("marketplace KPI snapshot excludes seed templates, worked examples, moral public goods module, and demo records from live metrics", () => {
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
  assert.ok(snapshot.excludedNonLiveInputs.some((entry) => entry.source === "public_goods" && entry.count === 1));
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
