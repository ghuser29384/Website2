import assert from "node:assert/strict";
import test from "node:test";

import {
  evaluateMoralTradeChallengeAppeal,
  getMoralTradeChallengeAppealContract,
  validateMoralTradeChallengeAppealContract,
  validateMoralTradeChallengeAppealDecision,
  type MoralTradeChallengeAppealContract,
  type MoralTradeChallengeAppealDecision,
  type MoralTradeChallengeAppealInput,
} from "./challenge-appeal";

const baseAppeal = {
  requestId: "appeal-001",
  subject: "evidence_row",
  standing: "affected_party",
  trigger: "wrong_scope_evidence",
  claimId: "claim-001",
  evidenceRowId: "evidence-row-001",
  priorDecisionId: "review-decision-001",
  challengeWindowOpen: true,
  summary:
    "The evidence row proves payment only, but the decision used it as baseline evidence.",
  affectedPartyStandingSummary:
    "The public summary names a community affected by the challenged externality review.",
  remedyRequested: "Pause the completion badge and separate factual proof from baseline confidence.",
} satisfies MoralTradeChallengeAppealInput;

test("challenge appeal evaluation scopes wrong-scope evidence for human review", () => {
  const decision = evaluateMoralTradeChallengeAppeal(baseAppeal);

  assert.equal(decision.status, "ready_for_human_review");
  assert.equal(decision.outcome, "open_challenge_window");
  assert.equal(decision.humanReviewRequired, true);
  assert.equal(decision.stateMutation, false);
  assert.equal(decision.standingAccepted, true);
  assert.deepEqual(decision.blockers, []);
  assert.ok(decision.factorCodes.includes("specific_reviewed_claim"));
  assert.ok(decision.factorCodes.includes("affected_party_standing"));
  assert.ok(decision.factorCodes.includes("wrong_scope_evidence_review"));
  assert.ok(decision.factorCodes.includes("challenge_window_required"));
  assert.ok(decision.factorCodes.includes("no_unrelated_moral_disagreement"));
  assert.ok(decision.requiredArtifacts.includes("scoped evidence row and claim linkage"));
  assert.equal(decision.provenanceActivity, "challenge_window_opened");
  assert.equal(decision.traceabilityBusinessStep, "challenge_opened");
  assert.equal(validateMoralTradeChallengeAppealDecision(decision).status, "pass");
});

test("challenge appeal evaluation requires affected-party standing and remedy paths", () => {
  const decision = evaluateMoralTradeChallengeAppeal({
    ...baseAppeal,
    trigger: "externality_remedy_gap",
    subject: "externality_trigger",
    affectedPartyStandingSummary: "",
    remedyRequested: "",
  });

  assert.equal(decision.status, "needs_standing");
  assert.equal(decision.outcome, "route_human_review");
  assert.equal(decision.standingAccepted, false);
  assert.ok(decision.blockers.includes("affected_party_standing_summary_required"));
  assert.ok(decision.blockers.includes("remedy_requested_required"));
  assert.ok(decision.factorCodes.includes("externality_remedy_review"));
  assert.equal(decision.factorCodes.includes("affected_party_standing"), false);
  assert.equal(decision.factorCodes.includes("standing_established"), false);
  assert.ok(decision.requiredArtifacts.includes("affected-party standing summary and remedy path"));
  assert.equal(validateMoralTradeChallengeAppealDecision(decision).status, "pass");
});

test("challenge appeal evaluation blocks private-detail packets until redacted", () => {
  const decision = evaluateMoralTradeChallengeAppeal({
    ...baseAppeal,
    subject: "disclosure_decision",
    trigger: "privacy_disclosure_error",
    containsPrivateDetails: true,
  });

  assert.equal(decision.status, "needs_redaction");
  assert.equal(decision.outcome, "route_human_review");
  assert.ok(decision.blockers.includes("private_details_must_be_redacted_before_review"));
  assert.ok(decision.factorCodes.includes("private_details_redacted"));
  assert.ok(decision.factorCodes.includes("privacy_disclosure_review"));
  assert.match(decision.privacyActions.join(" "), /redact exact wishes/i);
  assert.equal(validateMoralTradeChallengeAppealDecision(decision).status, "pass");
});

test("challenge appeal evaluation honors compatible requested outcomes without state mutation", () => {
  const decision = evaluateMoralTradeChallengeAppeal({
    ...baseAppeal,
    subject: "externality_trigger",
    trigger: "externality_remedy_gap",
    challengeWindowOpen: false,
    requestedOutcome: "record_remedy",
  });

  assert.equal(decision.status, "ready_for_human_review");
  assert.equal(decision.outcome, "record_remedy");
  assert.equal(decision.stateMutation, false);
  assert.deepEqual(decision.blockers, []);
  assert.ok(decision.factorCodes.includes("externality_remedy_review"));
  assert.equal(validateMoralTradeChallengeAppealDecision(decision).status, "pass");
});

test("challenge appeal evaluation rejects incompatible requested outcomes", () => {
  const decision = evaluateMoralTradeChallengeAppeal({
    ...baseAppeal,
    subject: "externality_trigger",
    trigger: "externality_remedy_gap",
    requestedOutcome: "correct_record",
  });

  assert.equal(decision.status, "needs_scope");
  assert.equal(decision.outcome, "request_evidence");
  assert.ok(
    decision.blockers.includes(
      "requested_outcome_not_compatible:correct_record:externality_remedy_gap",
    ),
  );
  assert.equal(validateMoralTradeChallengeAppealDecision(decision).status, "pass");
});

test("challenge appeal decision validation rejects autonomous state changes and broad appeals", () => {
  const decision = evaluateMoralTradeChallengeAppeal(baseAppeal) as MoralTradeChallengeAppealDecision;

  decision.humanReviewRequired = false as MoralTradeChallengeAppealDecision["humanReviewRequired"];
  decision.stateMutation = true as MoralTradeChallengeAppealDecision["stateMutation"];
  decision.factorCodes = ["wrong_scope_evidence_review"];
  decision.appealScopeStatement = "Reopen every moral disagreement.";

  const validation = validateMoralTradeChallengeAppealDecision(decision);

  assert.equal(validation.status, "fail");
  assert.ok(validation.blockers.some((blocker) => blocker.includes("human-review-and-nonmutation")));
  assert.ok(validation.blockers.some((blocker) => blocker.includes("required-factor-codes")));
  assert.ok(validation.blockers.some((blocker) => blocker.includes("appeal-scope-statement")));
});

test("challenge appeal contract validates scope, standing, privacy, provenance, and human control", () => {
  const contract = getMoralTradeChallengeAppealContract();
  const validation = validateMoralTradeChallengeAppealContract(contract);

  assert.equal(validation.status, "pass");
  assert.equal(contract.decisioningMode, "deterministic_challenge_appeal_scope_only");
  assert.equal(contract.stateMutation, false);
  assert.ok(contract.subjects.includes("evidence_row"));
  assert.ok(contract.standingCategories.includes("affected_party"));
  assert.ok(contract.appealTriggers.includes("privacy_disclosure_error"));
  assert.ok(contract.allowedOutcomes.includes("record_remedy"));
  assert.ok(contract.approvedFactorCodes.includes("no_unrelated_moral_disagreement"));
  assert.ok(contract.approvedFactorCodes.includes("provenance_activity_required"));
  assert.ok(contract.contractTests.includes("challenge_appeal_evaluate_route_contract"));
});

test("challenge appeal contract validation fails when safeguards are weakened", () => {
  const contract: MoralTradeChallengeAppealContract = {
    ...getMoralTradeChallengeAppealContract(),
    standingCategories: ["participant"],
    allowedOutcomes: ["uphold_decision"],
    approvedFactorCodes: ["specific_reviewed_claim"],
    invariants: ["Appeals reopen all moral disagreements."],
    sampleDecision: {
      ...getMoralTradeChallengeAppealContract().sampleDecision,
      stateMutation: true as MoralTradeChallengeAppealDecision["stateMutation"],
      humanReviewRequired: false as MoralTradeChallengeAppealDecision["humanReviewRequired"],
      factorCodes: ["wrong_scope_evidence_review"],
    },
    contractTests: [],
  };
  const validation = validateMoralTradeChallengeAppealContract(contract);

  assert.equal(validation.status, "fail");
  assert.ok(validation.blockers.some((blocker) => blocker.includes("standing-coverage")));
  assert.ok(validation.blockers.some((blocker) => blocker.includes("trigger-and-outcome-coverage")));
  assert.ok(validation.blockers.some((blocker) => blocker.includes("sample-decision-validation")));
  assert.ok(validation.blockers.some((blocker) => blocker.includes("narrow-appeal-scope")));
  assert.ok(validation.blockers.some((blocker) => blocker.includes("privacy-and-provenance")));
  assert.ok(validation.blockers.some((blocker) => blocker.includes("contract-tests")));
});
