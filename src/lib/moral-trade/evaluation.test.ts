import assert from "node:assert/strict";
import test from "node:test";

import {
  auditMoralTradeSurfacingParity,
  auditMoralTradeUxReadiness,
  getMoralTradeEvaluationSampleAudits,
  getMoralTradeEvaluationProfile,
  MORAL_TRADE_SURFACING_PARITY_DEFAULTS,
  MORAL_TRADE_UX_READINESS_DEFAULTS,
  validateMoralTradeEvaluationProfile,
  type MoralTradeEvaluationProfile,
} from "@/lib/moral-trade/evaluation";

test("evaluation profile publishes Codex quality, privacy, fairness, and reviewer metrics", () => {
  const profile = getMoralTradeEvaluationProfile();
  const validation = validateMoralTradeEvaluationProfile(profile);

  assert.equal(validation.status, "pass");
  assert.ok(profile.metrics.some((metric) => metric.key === "draft_completion_rate"));
  assert.ok(profile.metrics.some((metric) => metric.key === "time_to_valid_draft"));
  assert.ok(profile.metrics.some((metric) => metric.key === "privacy_leakage_incidents"));
  assert.ok(profile.metrics.some((metric) => metric.key === "subgroup_surfacing_parity"));
  assert.ok(profile.metrics.some((metric) => metric.key === "human_overrule_rate"));
  assert.ok(profile.metrics.some((metric) => metric.key === "reviewer_efficiency_minutes"));
  assert.ok(profile.privacyBoundaries.includes("no_raw_private_wish_text"));
  assert.ok(profile.privacyBoundaries.includes("small_cell_suppression"));
  assert.ok(profile.privacyBoundaries.includes("deviation_review_log_redacted"));
  assert.ok(profile.cohortSlices.includes("privacy_stage"));
  assert.ok(profile.cohortSlices.includes("geography_bucket"));
  assert.ok(profile.cohortSlices.includes("optional_governed_sensitive_attribute"));
  assert.ok(profile.evaluationTests.includes("surfacing_parity_audit"));
  assert.ok(profile.evaluationTests.includes("surfacing_deviation_review_log"));
  assert.ok(profile.evaluationTests.includes("ux_readiness_audit"));
  assert.ok(profile.promotionGates.some((gate) => gate.stage === "human_controlled_decisions"));
});

test("evaluation contract publishes executable sample audit evidence", () => {
  const validation = validateMoralTradeEvaluationProfile();
  const sampleAudits = getMoralTradeEvaluationSampleAudits();
  const sampleAuditCheck = validation.checks.find((check) => check.id === "sample-audits");

  assert.equal(validation.status, "pass");
  assert.equal(sampleAuditCheck?.status, "pass");
  assert.equal(sampleAudits.surfacingParityAudit.status, "pass");
  assert.equal(sampleAudits.surfacingParityAudit.overallSurfacingRate, 0.45);
  assert.equal(sampleAudits.surfacingParityAudit.reviewedDeviationCount, 2);
  assert.equal(sampleAudits.surfacingParityAudit.unreviewedDeviationCount, 0);
  assert.equal(sampleAudits.surfacingParityAudit.deviationReviews.length, 2);
  assert.equal(sampleAudits.uxReadinessAudit.status, "pass");
  assert.deepEqual(sampleAudits.uxReadinessAudit.blockers, []);
});

test("evaluation validation fails when privacy metrics or human control gates are missing", () => {
  const profile = getMoralTradeEvaluationProfile();
  const weakenedProfile: MoralTradeEvaluationProfile = {
    ...profile,
    metrics: profile.metrics.filter((metric) => metric.key !== "privacy_leakage_incidents"),
    promotionGates: profile.promotionGates.filter(
      (gate) => gate.stage !== "human_controlled_decisions",
    ),
  };
  const validation = validateMoralTradeEvaluationProfile(weakenedProfile);

  assert.equal(validation.status, "fail");
  assert.ok(validation.blockers.some((blocker) => blocker.includes("required-metrics")));
  assert.ok(validation.blockers.some((blocker) => blocker.includes("promotion-gates")));
});

test("surfacing parity audit passes balanced thresholded match-preview slices", () => {
  const audit = auditMoralTradeSurfacingParity({
    events: [
      ...Array.from({ length: 5 }, (_, index) => ({
        id: `pledge-sf-${index}`,
        eligible: true,
        surfaced: index < 3,
        slices: {
          trade_format: "pledge",
          cause_area_pair: "animal_welfare__global_poverty",
          geography_bucket: "US-CA",
          privacy_stage: "broad_preview",
          optional_governed_sensitive_attribute: "consented_group_a",
        },
      })),
      ...Array.from({ length: 5 }, (_, index) => ({
        id: `offset-ny-${index}`,
        eligible: true,
        surfaced: index < 3,
        slices: {
          trade_format: "offset",
          cause_area_pair: "climate__global_health",
          geography_bucket: "US-NY",
          privacy_stage: "broad_preview",
          optional_governed_sensitive_attribute: "consented_group_b",
        },
      })),
    ],
  });

  assert.equal(audit.status, "pass");
  assert.equal(audit.overallSurfacingRate, 0.6);
  assert.ok(audit.cells.every((cell) => cell.status === "pass" || cell.status === "suppressed"));
  assert.equal(MORAL_TRADE_SURFACING_PARITY_DEFAULTS.minCellSize, 5);
});

test("surfacing parity audit requires review for material unexplained slice gaps", () => {
  const events = [
    ...Array.from({ length: 10 }, (_, index) => ({
      id: `high-${index}`,
      eligible: true,
      surfaced: index < 8,
      slices: {
        trade_format: "pledge",
        cause_area_pair: "animal_welfare__global_poverty",
        geography_bucket: "US-CA",
        privacy_stage: "broad_preview",
        optional_governed_sensitive_attribute: "consented_group_a",
      },
    })),
    ...Array.from({ length: 10 }, (_, index) => ({
      id: `low-${index}`,
      eligible: true,
      surfaced: index < 1,
      slices: {
        trade_format: "offset",
        cause_area_pair: "climate__global_health",
        geography_bucket: "US-NY",
        privacy_stage: "broad_preview",
        optional_governed_sensitive_attribute: "consented_group_b",
      },
    })),
  ];
  const audit = auditMoralTradeSurfacingParity({ events, maxAbsoluteGap: 0.2 });

  assert.equal(audit.status, "fail");
  assert.ok(audit.blockers.includes("unreviewed_surfacing_gap:trade_format:offset"));

  const reviewedAudit = auditMoralTradeSurfacingParity({
    events,
    maxAbsoluteGap: 0.2,
    deviationReviews: audit.cells
      .filter((cell) => cell.status === "needs_review")
      .map((cell, index) => ({
        cellKey: cell.key,
        reviewerRole: index % 2 ? "external_reviewer" : "operator",
        reviewedAt: `2026-05-2${index}T12:00:00.000Z`,
        outcome: index % 2 ? "accepted_with_monitoring" : "remediated",
        reasonCode: `sample_gap_review_${index}`,
        summary: "Reviewer logged a redacted parity-gap disposition before rollout.",
      })),
  });

  assert.equal(reviewedAudit.status, "pass");
  assert.ok(reviewedAudit.cells.some((cell) => cell.status === "reviewed"));
  assert.equal(
    reviewedAudit.reviewedDeviationCount,
    audit.cells.filter((cell) => cell.status === "needs_review").length,
  );
  assert.equal(reviewedAudit.unreviewedDeviationCount, 0);
  assert.ok(
    reviewedAudit.cells.every((cell) => cell.status !== "reviewed" || cell.deviationReview),
  );
});

test("surfacing parity audit rejects incomplete or unscoped deviation review logs", () => {
  const events = [
    ...Array.from({ length: 10 }, (_, index) => ({
      id: `high-${index}`,
      eligible: true,
      surfaced: index < 8,
      slices: {
        trade_format: "pledge",
        cause_area_pair: "animal_welfare__global_poverty",
        geography_bucket: "US-CA",
        privacy_stage: "broad_preview",
        optional_governed_sensitive_attribute: "consented_group_a",
      },
    })),
    ...Array.from({ length: 10 }, (_, index) => ({
      id: `low-${index}`,
      eligible: true,
      surfaced: index < 1,
      slices: {
        trade_format: "offset",
        cause_area_pair: "climate__global_health",
        geography_bucket: "US-NY",
        privacy_stage: "broad_preview",
        optional_governed_sensitive_attribute: "consented_group_b",
      },
    })),
  ];
  const audit = auditMoralTradeSurfacingParity({
    deviationReviews: [
      {
        cellKey: "trade_format:offset",
        reviewerRole: "operator",
        reviewedAt: "",
        outcome: "explained",
        reasonCode: "ok",
        summary: "Email reviewer@example.com for the private details.",
      },
      {
        cellKey: "trade_format:not_a_material_gap",
        reviewerRole: "operator",
        reviewedAt: "2026-05-20T12:00:00.000Z",
        outcome: "explained",
        reasonCode: "sample_unscoped_review",
        summary: "Reviewer logged a redacted but unscoped parity disposition.",
      },
    ],
    events,
    maxAbsoluteGap: 0.2,
  });

  assert.equal(audit.status, "fail");
  assert.ok(
    audit.blockers.some((blocker) =>
      blocker.includes("invalid_surfacing_deviation_review:trade_format:offset"),
    ),
  );
  assert.ok(
    audit.blockers.includes(
      "unscoped_surfacing_deviation_review:trade_format:not_a_material_gap",
    ),
  );
  assert.ok(audit.blockers.includes("unreviewed_surfacing_gap:trade_format:offset"));
});

test("surfacing parity audit suppresses small cells and redacts raw contact-like slice values", () => {
  const audit = auditMoralTradeSurfacingParity({
    events: [
      {
        id: "private-1",
        eligible: true,
        surfaced: true,
        slices: {
          trade_format: "pledge",
          cause_area_pair: "exact-email@example.com",
          geography_bucket: "Hyperlocal block with too much identifying precision",
          privacy_stage: "detail_request",
          optional_governed_sensitive_attribute: "rare sensitive cell",
        },
      },
    ],
  });

  assert.equal(audit.status, "pass");
  assert.ok(audit.cells.every((cell) => cell.status === "suppressed"));
  assert.ok(audit.cells.some((cell) => cell.value === "redacted_value"));
  assert.equal(
    audit.cells.find((cell) => cell.key === "cause_area_pair:redacted_value")?.surfacingRate,
    null,
  );
});

test("UX readiness audit passes when valid-draft, explanation, and reviewer metrics improve", () => {
  const audit = auditMoralTradeUxReadiness({
    previous: {
      period: "2026-04",
      startedDraftCount: 12,
      validDraftCount: 6,
      medianTimeToValidDraftMinutes: 24,
      explanationHelpfulMedianRating: 4.1,
      reviewerMedianMinutesPerDecision: 16,
      reviewerOverruleRate: 0.18,
    },
    current: {
      period: "2026-05",
      startedDraftCount: 14,
      validDraftCount: 9,
      medianTimeToValidDraftMinutes: 18,
      explanationHelpfulMedianRating: 4.4,
      reviewerMedianMinutesPerDecision: 12,
      reviewerOverruleRate: 0.17,
    },
  });

  assert.equal(audit.status, "pass");
  assert.deepEqual(audit.blockers, []);
  assert.ok(audit.checks.every((check) => check.status === "pass"));
  assert.equal(MORAL_TRADE_UX_READINESS_DEFAULTS.minExplanationHelpfulMedianRating, 4);
});

test("UX readiness audit blocks promotion when guidance gets slower or less useful", () => {
  const audit = auditMoralTradeUxReadiness({
    previous: {
      period: "2026-04",
      startedDraftCount: 10,
      validDraftCount: 5,
      medianTimeToValidDraftMinutes: 20,
      explanationHelpfulMedianRating: 4.5,
      reviewerMedianMinutesPerDecision: 10,
      reviewerOverruleRate: 0.12,
    },
    current: {
      period: "2026-05",
      startedDraftCount: 10,
      validDraftCount: 5,
      medianTimeToValidDraftMinutes: 32,
      explanationHelpfulMedianRating: 3.5,
      reviewerMedianMinutesPerDecision: 22,
      reviewerOverruleRate: 0.21,
    },
  });

  assert.equal(audit.status, "fail");
  assert.ok(audit.blockers.includes("time_to_valid_draft_not_improving"));
  assert.ok(audit.blockers.includes("explanation_helpfulness_not_improving"));
  assert.ok(audit.blockers.includes("reviewer_efficiency_not_improving"));
  assert.ok(audit.blockers.includes("human_overrule_rate_unstable"));
});

test("UX readiness audit reports insufficient data before drawing rollout conclusions", () => {
  const audit = auditMoralTradeUxReadiness({
    current: {
      period: "2026-05",
      startedDraftCount: 2,
      validDraftCount: 0,
      medianTimeToValidDraftMinutes: null,
      explanationHelpfulMedianRating: null,
      reviewerMedianMinutesPerDecision: null,
      reviewerOverruleRate: null,
    },
  });

  assert.equal(audit.status, "insufficient_data");
  assert.ok(audit.blockers.includes("ux_sample_too_small"));
});
