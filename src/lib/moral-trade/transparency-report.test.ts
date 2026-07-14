import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  MORAL_TRADE_TRANSPARENCY_MIN_PUBLIC_COUNT,
  auditMoralTradeTransparencyMetricSourceTables,
  buildMoralTradeTransparencyReportSnapshot,
  getMoralTradeTransparencyReportContract,
  getMoralTradeTransparencyReportPeriod,
  validateMoralTradeTransparencyReportContract,
  validateMoralTradeTransparencyReportSnapshot,
} from "@/lib/moral-trade/transparency-report";

test("transparency report contract publishes required aggregate-only metrics", () => {
  const contract = getMoralTradeTransparencyReportContract();
  const validation = validateMoralTradeTransparencyReportContract(contract);
  const metricKeys = contract.metricDefinitions.map((metric) => metric.key);

  assert.equal(validation.status, "pass");
  assert.equal(contract.publicationCadence, "quarterly");
  assert.equal(contract.minimumPublicCount, MORAL_TRADE_TRANSPARENCY_MIN_PUBLIC_COUNT);
  assert.ok(contract.contractTests.includes("transparency_report_metric_source_schema_audit"));
  assert.ok(metricKeys.includes("reviewed_match_suggestions"));
  assert.ok(metricKeys.includes("opportunity_briefs_opened"));
  assert.ok(metricKeys.includes("opportunity_feedback_submitted"));
  assert.ok(metricKeys.includes("opportunity_briefs_dismissed"));
  assert.ok(metricKeys.includes("opportunity_briefs_deferred"));
  assert.ok(metricKeys.includes("opportunity_interest_marked"));
  assert.ok(metricKeys.includes("declined_intro_requests"));
  assert.ok(metricKeys.includes("disclosure_grants_created"));
  assert.ok(metricKeys.includes("concierge_appeals_requested"));
  assert.ok(metricKeys.includes("median_concierge_review_hours"));
  assert.ok(
    contract.privacyRules.some((rule) =>
      /no ids, emails, names, profile text, report bodies, source notes, or exact wishes/i.test(
        rule,
      ),
    ),
  );
});

test("transparency report metric sources are backed by schema tables", () => {
  const schemaSql = readFileSync("supabase/schema.sql", "utf8");
  const contract = getMoralTradeTransparencyReportContract();
  const audit = auditMoralTradeTransparencyMetricSourceTables({ contract, schemaSql });
  const allSourceTables = contract.metricDefinitions.flatMap((metric) => metric.sourceTables);

  assert.equal(audit.status, "pass");
  assert.deepEqual(audit.missingTables, []);
  assert.ok(audit.checkedTables.includes("background_opportunity_briefs"));
  assert.ok(audit.checkedTables.includes("background_intro_packets"));
  assert.equal(allSourceTables.includes("background_intro_requests"), false);
});

test("transparency report suppresses small nonzero samples but publishes zero", () => {
  const period = getMoralTradeTransparencyReportPeriod(new Date("2026-05-31T12:00:00.000Z"));
  const snapshot = buildMoralTradeTransparencyReportSnapshot({
    generatedAt: "2026-05-31T12:00:00.000Z",
    metricInputs: [
      { key: "reviewed_match_suggestions", value: 2 },
      { key: "declined_intro_requests", value: 0 },
      { key: "median_concierge_review_hours", sampleSize: 2, value: 4.2 },
      { key: "concierge_sla_attainment_percent", sampleSize: 3, value: 66.6 },
    ],
    period,
    reportMode: "live_aggregate",
  });
  const reviewedMatches = snapshot.metrics.find(
    (metric) => metric.key === "reviewed_match_suggestions",
  );
  const declinedIntros = snapshot.metrics.find(
    (metric) => metric.key === "declined_intro_requests",
  );
  const medianConcierge = snapshot.metrics.find(
    (metric) => metric.key === "median_concierge_review_hours",
  );
  const sla = snapshot.metrics.find(
    (metric) => metric.key === "concierge_sla_attainment_percent",
  );

  assert.equal(snapshot.periodLabel, "2026 Q2");
  assert.equal(reviewedMatches?.publishedValue, null);
  assert.equal(reviewedMatches?.suppressed, true);
  assert.equal(declinedIntros?.publishedValue, 0);
  assert.equal(declinedIntros?.suppressed, false);
  assert.equal(medianConcierge?.publishedValue, null);
  assert.equal(medianConcierge?.suppressed, true);
  assert.equal(sla?.publishedValue, 66.6);
  assert.equal(sla?.displayValue, "67%");
});

test("transparency report snapshot validator rejects private-field shaped metrics", () => {
  const snapshot = buildMoralTradeTransparencyReportSnapshot({
    generatedAt: "2026-05-31T12:00:00.000Z",
    metricInputs: [{ key: "reviewed_match_suggestions", value: 5 }],
    reportMode: "live_aggregate",
  });
  const valid = validateMoralTradeTransparencyReportSnapshot(snapshot);

  assert.equal(valid.status, "pass");

  const invalid = validateMoralTradeTransparencyReportSnapshot({
    ...snapshot,
    metrics: [
      ...snapshot.metrics,
      {
        description: "Should not include reporter_profile_id or notes.",
        displayValue: "1",
        key: "private_debug_metric",
        kind: "count",
        label: "Private debug",
        publishedValue: 1,
        sampleSize: 1,
        sourceTables: ["match_reports"],
        suppressed: false,
        suppressionReason: null,
      },
    ],
  });

  assert.equal(invalid.status, "fail");
  assert.ok(invalid.blockers.some((blocker) => blocker.includes("small_sample_not_suppressed")));
  assert.ok(invalid.blockers.some((blocker) => blocker.includes("private_field_leak")));
});
