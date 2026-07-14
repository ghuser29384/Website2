import assert from "node:assert/strict";
import test from "node:test";

import {
  evaluateMoralTradeExternalityReview,
  getMoralTradeExternalityProfile,
  validateMoralTradeExternalityProfile,
  type MoralTradeExternalityProfile,
} from "@/lib/moral-trade/externality";

test("externality profile publishes due-diligence steps, standards, remedies, and tests", () => {
  const profile = getMoralTradeExternalityProfile();
  const validation = validateMoralTradeExternalityProfile(profile);

  assert.equal(validation.status, "pass");
  assert.equal(validation.blockers.length, 0);
  assert.ok(profile.dueDiligenceSteps.some((step) => step.key === "identify_impacts"));
  assert.ok(profile.dueDiligenceSteps.some((step) => step.key === "remediate"));
  assert.ok(profile.triggerCodes.some((trigger) => trigger.key === "labor_or_supply_chain"));
  assert.ok(profile.reviewStandards.some((standard) => standard.key === "oecd_due_diligence"));
  assert.ok(profile.reviewStandards.some((standard) => standard.key === "un_guiding_principles"));
  assert.ok(profile.reviewStandards.some((standard) => standard.key === "open_supply_hub"));
  assert.ok(
    profile.triggerStandardMatrix.some(
      (entry) =>
        entry.triggerCode === "labor_or_supply_chain" &&
        entry.requiredStandards.includes("ilo_fundamental_principles") &&
        entry.requiredStandards.includes("eti_base_code") &&
        entry.requiredStandards.includes("open_supply_hub"),
    ),
  );
  assert.ok(
    profile.triggerStandardMatrix.every(
      (entry) =>
        entry.requiredStandards.includes("oecd_due_diligence") &&
        entry.requiredStandards.includes("un_guiding_principles") &&
        entry.evidenceExpectations.length > 0,
    ),
  );
  assert.ok(profile.remedyControls.some((control) => control.key === "affected_party_standing"));
  assert.ok(profile.allowedOutcomes.includes("challenge_window"));
});

test("externality profile validation fails when standards, trigger mappings, or remedy controls are missing", () => {
  const profile = getMoralTradeExternalityProfile();
  const weakenedProfile: MoralTradeExternalityProfile = {
    ...profile,
    reviewStandards: profile.reviewStandards.filter(
      (standard) => standard.key !== "un_guiding_principles",
    ),
    triggerStandardMatrix: profile.triggerStandardMatrix.map((entry) =>
      entry.triggerCode === "environment_or_community_impact"
        ? {
            ...entry,
            requiredStandards: ["missing_standard"],
            evidenceExpectations: [],
          }
        : entry,
    ),
    remedyControls: profile.remedyControls.filter(
      (control) => control.key !== "affected_party_standing",
    ),
  };
  const validation = validateMoralTradeExternalityProfile(weakenedProfile);

  assert.equal(validation.status, "fail");
  assert.ok(validation.blockers.some((blocker) => blocker.includes("review-standards")));
  assert.ok(validation.blockers.some((blocker) => blocker.includes("trigger-standard-matrix")));
  assert.ok(validation.blockers.some((blocker) => blocker.includes("remedy-controls")));
});

test("externality review routes material triggers to challenge window only after human-reviewed remedy evidence", () => {
  const decision = evaluateMoralTradeExternalityReview({
    triggerCodes: ["unrepresented_third_party", "perverse_incentive"],
    affectedPartyStandingDocumented: true,
    remediationPlanDocumented: true,
    privacySafeReportingPlanned: true,
    humanReviewApproved: true,
    sourceStandards: ["oecd_due_diligence", "un_guiding_principles"],
  });

  assert.equal(decision.status, "pass");
  assert.equal(decision.outcome, "challenge_window");
  assert.deepEqual(decision.blockers, []);
  assert.ok(decision.requiredStandards.includes("oecd_due_diligence"));
  assert.ok(decision.reasonCodes.includes("challenge_window_required"));
});

test("externality review blocks silent matchability when affected-party, remedy, or standard evidence is missing", () => {
  const decision = evaluateMoralTradeExternalityReview({
    triggerCodes: ["labor_or_supply_chain"],
    affectedPartyStandingDocumented: false,
    remediationPlanDocumented: false,
    privacySafeReportingPlanned: false,
    humanReviewApproved: false,
    sourceStandards: ["oecd_due_diligence"],
  });

  assert.equal(decision.status, "fail");
  assert.equal(decision.outcome, "needs_human_review");
  assert.ok(decision.blockers.includes("affected_party_standing_required"));
  assert.ok(decision.blockers.includes("remediation_plan_required"));
  assert.ok(decision.blockers.includes("privacy_safe_reporting_required"));
  assert.ok(decision.blockers.includes("human_review_required_before_externality_clearance"));
  assert.ok(decision.blockers.includes("source_standard_required:un_guiding_principles"));
  assert.ok(decision.blockers.includes("source_standard_required:ilo_fundamental_principles"));
  assert.ok(decision.blockers.includes("source_standard_required:eti_base_code"));
  assert.ok(decision.blockers.includes("source_standard_required:open_supply_hub"));
});

test("externality review uses trigger-standard matrix for destination and community risks", () => {
  const decision = evaluateMoralTradeExternalityReview({
    triggerCodes: ["recipient_or_destination_risk", "environment_or_community_impact"],
    affectedPartyStandingDocumented: true,
    remediationPlanDocumented: true,
    privacySafeReportingPlanned: true,
    humanReviewApproved: true,
    sourceStandards: ["oecd_due_diligence", "un_guiding_principles"],
  });

  assert.equal(decision.status, "fail");
  assert.equal(decision.outcome, "needs_human_review");
  assert.ok(decision.requiredStandards.includes("fairtrade_standards"));
  assert.ok(decision.blockers.includes("source_standard_required:fairtrade_standards"));
});

test("externality review passes through drafts without material externality triggers", () => {
  const decision = evaluateMoralTradeExternalityReview({ triggerCodes: [] });

  assert.equal(decision.status, "pass");
  assert.equal(decision.outcome, "no_externality_review_required");
  assert.deepEqual(decision.requiredStandards, []);
  assert.deepEqual(decision.blockers, []);
});
