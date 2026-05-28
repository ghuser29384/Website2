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
  assert.ok(profile.remedyControls.some((control) => control.key === "affected_party_standing"));
  assert.ok(profile.allowedOutcomes.includes("challenge_window"));
});

test("externality profile validation fails when standards or remedy controls are missing", () => {
  const profile = getMoralTradeExternalityProfile();
  const weakenedProfile: MoralTradeExternalityProfile = {
    ...profile,
    reviewStandards: profile.reviewStandards.filter(
      (standard) => standard.key !== "un_guiding_principles",
    ),
    remedyControls: profile.remedyControls.filter(
      (control) => control.key !== "affected_party_standing",
    ),
  };
  const validation = validateMoralTradeExternalityProfile(weakenedProfile);

  assert.equal(validation.status, "fail");
  assert.ok(validation.blockers.some((blocker) => blocker.includes("review-standards")));
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

test("externality review passes through drafts without material externality triggers", () => {
  const decision = evaluateMoralTradeExternalityReview({ triggerCodes: [] });

  assert.equal(decision.status, "pass");
  assert.equal(decision.outcome, "no_externality_review_required");
  assert.deepEqual(decision.requiredStandards, []);
  assert.deepEqual(decision.blockers, []);
});
