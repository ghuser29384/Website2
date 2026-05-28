import assert from "node:assert/strict";
import test from "node:test";

import {
  buildMoralTradeCopilotOutput,
  getMoralTradeCopilotContract,
  validateMoralTradeCopilotContract,
  validateMoralTradeCopilotOutput,
  type MoralTradeCopilotContract,
} from "./copilot";

const completeDraft = {
  format: "pledge_swap",
  offeredCause: "animal welfare",
  requestedCause: "global health",
  offeredAction: "I will make a public donation pledge and log completion after the review period.",
  requestedAction: "The counterparty will redirect an equivalent pledge to a global health charity.",
  baselineStatement:
    "My prior donation history and dated intent record show that I have normally donated to animal welfare charities, and absent this trade I would continue that plan with the same budget.",
  duration: "90 days",
  exitConditions:
    "Either party can pause before matching if evidence is unresolved, a review conflict is found, or the challenge window flags duplicate proof.",
  verificationMethod: "Annual receipt plus public pledge log and manual reviewer check.",
  publicDescription:
    "A bounded pledge swap where each side is better off than the no-trade baseline using participant-relative priorities, with no hidden outreach.",
  participantImportance: 4,
  counterpartyThreshold: 3,
};

test("copilot contract requires strict bundle, approved output, guardrails, and rollout stages", () => {
  const contract = getMoralTradeCopilotContract();
  const validation = validateMoralTradeCopilotContract();

  assert.equal(validation.status, "pass");
  assert.equal(validation.blockers.length, 0);
  assert.ok(contract.strictInputBundle.includes("structured_draft"));
  assert.ok(contract.strictInputBundle.includes("redaction_policy"));
  assert.ok(contract.strictInputBundle.includes("redacted_profile_pair"));
  assert.ok(contract.strictInputBundle.includes("stated_exclusions"));
  assert.ok(contract.approvedOutputSections.includes("review_instructions"));
  assert.ok(contract.approvedOutputSections.includes("clarification_questions"));
  assert.ok(contract.approvedOutputSections.includes("cited_evidence_table"));
  assert.ok(contract.approvedOutputSections.includes("reviewer_summary"));
  assert.ok(contract.guardrails.some((guardrail) => guardrail.code === "no_chain_of_thought"));
  assert.ok(contract.guardrails.some((guardrail) => guardrail.code === "no_autonomous_outreach"));
  assert.ok(contract.verificationLoop.some((step) => step.key === "privacy_redaction"));
  assert.ok(contract.trustAxes.includes("party_relative_benefit"));
  assert.ok(contract.trustAxes.includes("privacy_redaction"));
  assert.ok(contract.rolloutStages.some((stage) => stage.key === "shadow_mode"));
});

test("copilot contract validation fails when required input sources are missing", () => {
  const contract = {
    ...getMoralTradeCopilotContract(),
    strictInputBundle: ["structured_draft"],
  } satisfies MoralTradeCopilotContract;
  const validation = validateMoralTradeCopilotContract(contract);

  assert.equal(validation.status, "fail");
  assert.ok(validation.blockers.some((blocker) => blocker.includes("strict-input-bundle")));
});

test("copilot output uses approved schema and redacted factor-code explanations", () => {
  const output = buildMoralTradeCopilotOutput(completeDraft, ["proposal:local-draft"]);
  const validation = validateMoralTradeCopilotOutput(output);

  assert.equal(validation.status, "pass");
  assert.equal(output.status, "matchable");
  assert.deepEqual(output.completeness.policy_conflicts, []);
  assert.ok(output.match_explanation.factor_codes.includes("terms_complete"));
  assert.ok(output.match_explanation.redactions_applied.includes("exact_private_wishes"));
  assert.equal(output.trust_assessment.factual_trust.rating, "medium");
  assert.equal(output.trust_assessment.counterfactual_baseline.rating, "high");
  assert.equal(output.trust_assessment.party_relative_benefit.rating, "high");
  assert.equal(output.trust_assessment.privacy_redaction.rating, "high");
  assert.equal(output.clarification_questions.length, 0);
  assert.ok(output.next_step_checklist.some((step) => /redacted/i.test(step)));
  assert.ok(output.cited_evidence_table.some((row) => row.citation === "draft.offered_action"));
  assert.match(output.reviewer_summary, /What is being offered/);
  assert.equal(output.reviewer_summary.split(/\s+/).filter(Boolean).length <= 180, true);
  assert.deepEqual(output.citations, ["proposal:local-draft"]);
});

test("copilot output blocks threat-like drafts without making them matchable", () => {
  const output = buildMoralTradeCopilotOutput({
    ...completeDraft,
    offeredAction: "Pay me or I will start harassing this organization.",
    publicDescription: "Pay me or I will start harassing this organization.",
  });

  assert.equal(output.status, "blocked");
  assert.ok(output.completeness.policy_conflicts.includes("anti_threat_baseline"));
  assert.notEqual(output.status, "matchable");
  assert.equal(validateMoralTradeCopilotOutput(output).status, "pass");
});

test("copilot output blocks public contact details through the privacy-redaction gate", () => {
  const output = buildMoralTradeCopilotOutput({
    ...completeDraft,
    publicDescription:
      "Each side is better off than the no-trade baseline using participant-relative priorities. Email victoria@example.org for private coordination.",
  });

  assert.equal(output.status, "needs_clarification");
  assert.ok(output.completeness.underspecified_fields.includes("Privacy redaction"));
  assert.equal(output.trust_assessment.privacy_redaction.rating, "low");
  assert.ok(output.uncertainty_flags.includes("privacy_redaction_low"));
  assert.ok(output.uncertainty_flags.includes("privacy:contact_email_in_public_draft"));
  assert.ok(!output.match_explanation.factor_codes.includes("privacy_safe_preview"));
  assert.equal(output.match_explanation.confidence_band, "low");
  assert.equal(validateMoralTradeCopilotOutput(output).status, "pass");
});

test("copilot output keeps incomplete drafts in clarification rather than matchable", () => {
  const output = buildMoralTradeCopilotOutput({
    format: "pledge_swap",
    offeredAction: "Too short",
    requestedAction: "",
    baselineStatement: "",
    duration: "",
    exitConditions: "",
    verificationMethod: "",
    publicDescription: "",
  });

  assert.equal(output.status, "needs_clarification");
  assert.ok(output.completeness.missing_required_fields.includes("Requested action"));
  assert.ok(output.clarification_questions.some((item) => item.field === "Requested action"));
  assert.ok(output.clarification_questions.length <= 5);
  assert.ok(output.uncertainty_flags.includes("required_fields_incomplete"));
  assert.equal(validateMoralTradeCopilotOutput(output).status, "pass");
});

test("copilot output validation enforces bounded draft-repair packets", () => {
  const output = buildMoralTradeCopilotOutput({
    format: "pledge_swap",
    offeredAction: "Too short",
    requestedAction: "",
    baselineStatement: "",
    duration: "",
    exitConditions: "",
    verificationMethod: "",
    publicDescription: "",
  });

  output.clarification_questions = [];
  output.next_step_checklist = [];
  output.cited_evidence_table = [];
  output.reviewer_summary = Array.from({ length: 181 }, () => "word").join(" ");

  const validation = validateMoralTradeCopilotOutput(output);

  assert.equal(validation.status, "fail");
  assert.ok(validation.blockers.some((blocker) => blocker.includes("clarification_questions")));
  assert.ok(validation.blockers.some((blocker) => blocker.includes("next_step_checklist")));
  assert.ok(validation.blockers.some((blocker) => blocker.includes("cited_evidence_table")));
  assert.ok(validation.blockers.some((blocker) => blocker.includes("reviewer_summary")));
});
