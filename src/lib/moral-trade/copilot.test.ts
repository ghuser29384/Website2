import assert from "node:assert/strict";
import test from "node:test";

import {
  auditMoralTradeCopilotRolloutReadiness,
  buildMoralTradeCopilotOutput,
  getMoralTradeCopilotContract,
  getMoralTradeCopilotRolloutReadinessAudits,
  validateMoralTradeCopilotContract,
  validateMoralTradeCopilotOutput,
  type MoralTradeCopilotContract,
} from "./copilot";
import { GET as contractRoute } from "../../app/api/moral-trade/copilot/contract/route";
import { POST as reviewDraftRoute } from "../../app/api/moral-trade/copilot/review/route";

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
  assert.ok(contract.approvedOutputSections.includes("verification_loop"));
  assert.ok(contract.approvedOutputSections.includes("clarification_questions"));
  assert.ok(contract.approvedOutputSections.includes("cited_evidence_table"));
  assert.ok(contract.approvedOutputSections.includes("reviewer_summary"));
  assert.ok(contract.guardrails.some((guardrail) => guardrail.code === "no_chain_of_thought"));
  assert.ok(contract.guardrails.some((guardrail) => guardrail.code === "no_autonomous_outreach"));
  assert.ok(contract.verificationLoop.some((step) => step.key === "privacy_redaction"));
  assert.ok(contract.trustAxes.includes("party_relative_benefit"));
  assert.ok(contract.trustAxes.includes("privacy_redaction"));
  assert.ok(contract.rolloutStages.some((stage) => stage.key === "shadow_mode"));
  assert.ok(
    contract.rolloutReadinessSignals.some(
      (signal) => signal.key === "human_approval_for_status_changes",
    ),
  );
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

test("copilot rollout readiness starts in shadow and gates assist or automation on evidence", () => {
  const defaultAudits = getMoralTradeCopilotRolloutReadinessAudits();
  const shadowAudit = defaultAudits.find((audit) => audit.targetStage === "shadow_mode");
  const assistAudit = defaultAudits.find((audit) => audit.targetStage === "assist_mode");
  const guardedAudit = defaultAudits.find((audit) => audit.targetStage === "guarded_automation");

  assert.equal(shadowAudit?.status, "pass");
  assert.equal(assistAudit?.status, "blocked");
  assert.equal(guardedAudit?.status, "blocked");
  assert.ok(assistAudit?.blockers.includes("minimum_observed_runs_required:20"));
  assert.ok(guardedAudit?.blockers.includes("minimum_observed_runs_required:100"));

  const readyAssist = auditMoralTradeCopilotRolloutReadiness({
    targetStage: "assist_mode",
    observedRuns: 25,
    validatedOutputRate: 0.96,
    privacyIncidentCount: 0,
    stateMutationDisabled: true,
    fallbackTested: true,
    humanApprovalRequiredForStatusChanges: true,
    evaluationAuditsPassing: true,
    enabledTasks: ["structured_field_prefill", "factor_code_prefill"],
  });

  assert.equal(readyAssist.status, "pass");
  assert.deepEqual(readyAssist.blockers, []);

  const unsafeGuarded = auditMoralTradeCopilotRolloutReadiness({
    targetStage: "guarded_automation",
    observedRuns: 125,
    validatedOutputRate: 0.99,
    privacyIncidentCount: 0,
    stateMutationDisabled: true,
    fallbackTested: true,
    humanApprovalRequiredForStatusChanges: true,
    evaluationAuditsPassing: true,
    enabledTasks: ["missing_field_detection", "safety_blocking"],
  });

  assert.equal(unsafeGuarded.status, "blocked");
  assert.ok(
    unsafeGuarded.blockers.includes("task_not_allowed_for_guarded_automation:safety_blocking"),
  );
});

test("copilot contract route publishes rollout readiness evidence", async () => {
  const response = await contractRoute();
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.ok, true);
  assert.ok(body.publicContract.rolloutReadinessSignals.includes("low_risk_task_scope"));
  assert.equal(body.publicContract.rolloutReadiness[0].targetStage, "shadow_mode");
  assert.equal(body.publicContract.rolloutReadiness[0].status, "pass");
  assert.equal(body.publicContract.rolloutReadiness[1].status, "blocked");
});

test("copilot output uses approved schema and redacted factor-code explanations", () => {
  const output = buildMoralTradeCopilotOutput(completeDraft, ["proposal:local-draft"]);
  const validation = validateMoralTradeCopilotOutput(output);

  assert.equal(validation.status, "pass");
  assert.equal(output.status, "matchable");
  assert.deepEqual(output.completeness.policy_conflicts, []);
  assert.ok(output.match_explanation.factor_codes.includes("terms_complete"));
  assert.ok(output.match_explanation.redactions_applied.includes("exact_private_wishes"));
  assert.equal(output.verification_loop.length, 8);
  assert.equal(
    output.verification_loop.find((step) => step.key === "human_review_routing")?.status,
    "human_review",
  );
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

test("copilot review route returns validated non-mutating draft critique", async () => {
  const response = await reviewDraftRoute(
    new Request("http://localhost/api/moral-trade/copilot/review", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        draft: completeDraft,
        citations: ["proposal:route-test"],
      }),
    }),
  );
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(response.headers.get("cache-control"), "private, no-store");
  assert.equal(body.ok, true);
  assert.equal(body.stateMutation, false);
  assert.equal(body.decisioningMode, "deterministic_draft_review_only");
  assert.equal(body.output.status, "matchable");
  assert.equal(body.output.verification_loop.length, 8);
  assert.equal(
    body.output.verification_loop.find((step: { key: string }) => step.key === "schema_completeness")
      ?.status,
    "pass",
  );
  assert.ok(body.output.match_explanation.redactions_applied.includes("exact_private_wishes"));
  assert.deepEqual(body.output.citations, ["proposal:route-test"]);
  assert.deepEqual(body.blockers, []);
});

test("copilot review route fails closed on malformed or missing draft input", async () => {
  const missingDraftResponse = await reviewDraftRoute(
    new Request("http://localhost/api/moral-trade/copilot/review", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ citations: ["proposal:missing-draft"] }),
    }),
  );
  const missingDraftBody = await missingDraftResponse.json();

  assert.equal(missingDraftResponse.status, 400);
  assert.equal(missingDraftBody.ok, false);
  assert.equal(missingDraftBody.stateMutation, false);
  assert.ok(
    missingDraftBody.blockers.some((blocker: string) =>
      blocker.includes("structured_draft object is required"),
    ),
  );

  const invalidJsonResponse = await reviewDraftRoute(
    new Request("http://localhost/api/moral-trade/copilot/review", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "{",
    }),
  );
  const invalidJsonBody = await invalidJsonResponse.json();

  assert.equal(invalidJsonResponse.status, 400);
  assert.equal(invalidJsonBody.ok, false);
  assert.equal(invalidJsonBody.stateMutation, false);
  assert.ok(invalidJsonBody.blockers.includes("invalid_json_body"));
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
  output.verification_loop = output.verification_loop.filter(
    (step) => step.key !== "schema_completeness",
  );
  output.next_step_checklist = [];
  output.cited_evidence_table = [];
  output.reviewer_summary = Array.from({ length: 181 }, () => "word").join(" ");

  const validation = validateMoralTradeCopilotOutput(output);

  assert.equal(validation.status, "fail");
  assert.ok(validation.blockers.some((blocker) => blocker.includes("clarification_questions")));
  assert.ok(validation.blockers.some((blocker) => blocker.includes("verification_loop")));
  assert.ok(validation.blockers.some((blocker) => blocker.includes("next_step_checklist")));
  assert.ok(validation.blockers.some((blocker) => blocker.includes("cited_evidence_table")));
  assert.ok(validation.blockers.some((blocker) => blocker.includes("reviewer_summary")));
});
