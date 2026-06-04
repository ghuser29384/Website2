import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

import copilotContractSchemaJson from "../../../config/moral-trade/copilot-contract.schema.json";
import {
  auditMoralTradeCopilotStrictInputBundle,
  auditMoralTradeCopilotRolloutReadiness,
  buildMoralTradeCopilotOutput,
  getMoralTradeCopilotContract,
  getMoralTradeCopilotRolloutReadinessAudits,
  normalizeMoralTradeCopilotEvidenceMetadata,
  summarizeMoralTradeCopilotEvidenceMetadata,
  validateMoralTradeCopilotContract,
  validateMoralTradeCopilotOutput,
  validateMoralTradeCopilotReviewRouteImplementation,
  type MoralTradeCopilotContract,
} from "./copilot";
import { GET as contractRoute } from "../../app/api/moral-trade/copilot/contract/route";
import { POST as reviewDraftRoute } from "../../app/api/moral-trade/copilot/review/route";

type JsonSchemaArrayItem = {
  required?: string[];
  properties?: Record<string, unknown>;
  additionalProperties?: boolean;
};

type JsonSchemaProperty = {
  type?: string;
  items?: JsonSchemaArrayItem;
};

type CopilotContractJsonSchema = {
  required: string[];
  properties: Record<string, JsonSchemaProperty>;
  additionalProperties: boolean;
};

const copilotContractSchema = copilotContractSchemaJson as CopilotContractJsonSchema;

function readRepoFile(path: string) {
  return readFileSync(join(process.cwd(), path), "utf8");
}

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
  assert.ok(contract.strictInputBundle.includes("evidence_metadata"));
  assert.ok(contract.strictInputBundle.includes("redacted_profile_pair"));
  assert.ok(contract.strictInputBundle.includes("stated_exclusions"));
  assert.ok(contract.approvedOutputSections.includes("review_instructions"));
  assert.ok(contract.approvedOutputSections.includes("verification_loop"));
  assert.ok(contract.approvedOutputSections.includes("clarification_questions"));
  assert.ok(contract.approvedOutputSections.includes("cited_evidence_table"));
  assert.ok(contract.approvedOutputSections.includes("reviewer_summary"));
  assert.ok(contract.guardrails.some((guardrail) => guardrail.code === "no_chain_of_thought"));
  assert.ok(contract.guardrails.some((guardrail) => guardrail.code === "observable_claims_only"));
  assert.ok(contract.guardrails.some((guardrail) => guardrail.code === "no_false_certainty"));
  assert.ok(
    contract.guardrails.some(
      (guardrail) => guardrail.code === "insufficient_evidence_artifact_requests",
    ),
  );
  assert.ok(
    contract.guardrails.some((guardrail) => guardrail.code === "no_escrow_legal_tax_claims"),
  );
  assert.ok(contract.guardrails.some((guardrail) => guardrail.code === "no_autonomous_outreach"));
  assert.ok(
    contract.guardrails.some(
      (guardrail) => guardrail.code === "verification_loop_matchability_gate",
    ),
  );
  assert.ok(contract.promptTemplates.some((template) => template.key === "system_prompt"));
  assert.ok(contract.promptTemplates.some((template) => template.key === "draft_repair_prompt"));
  assert.ok(contract.promptTemplates.some((template) => template.key === "matching_prompt"));
  assert.ok(contract.promptTemplates.some((template) => template.key === "reviewer_summary_prompt"));
  assert.ok(
    contract.promptTemplates
      .flatMap((template) => template.safetyCodes)
      .includes("no_chain_of_thought"),
  );
  assert.ok(
    contract.promptTemplates
      .flatMap((template) => template.safetyCodes)
      .includes("no_autonomous_outreach"),
  );
  assert.ok(contract.verificationLoop.some((step) => step.key === "privacy_redaction"));
  assert.ok(contract.trustAxes.includes("party_relative_benefit"));
  assert.ok(contract.trustAxes.includes("privacy_redaction"));
  assert.ok(contract.statusValues.includes("challenge_window"));
  assert.ok(contract.rolloutStages.some((stage) => stage.key === "shadow_mode"));
  assert.ok(
    contract.rolloutReadinessSignals.some(
      (signal) => signal.key === "human_approval_for_status_changes",
    ),
  );
});

test("copilot JSON schema covers every published top-level contract field", () => {
  const contract = getMoralTradeCopilotContract();
  const contractKeys = Object.keys(contract);

  assert.equal(copilotContractSchema.additionalProperties, false);

  for (const key of contractKeys) {
    assert.ok(copilotContractSchema.required.includes(key), `${key} missing from schema.required`);
    assert.ok(
      Object.prototype.hasOwnProperty.call(copilotContractSchema.properties, key),
      `${key} missing from schema.properties`,
    );
  }

  for (const schemaKey of Object.keys(copilotContractSchema.properties)) {
    assert.ok(contractKeys.includes(schemaKey), `${schemaKey} is not in the runtime contract`);
  }

  const promptTemplateItems = copilotContractSchema.properties.promptTemplates?.items;
  assert.ok(promptTemplateItems?.required?.includes("instructionSummary"));
  assert.ok(promptTemplateItems?.required?.includes("safetyCodes"));
  assert.ok(promptTemplateItems?.required?.includes("outputRequirements"));
  assert.equal(promptTemplateItems?.additionalProperties, false);

  const readinessSignalItems = copilotContractSchema.properties.rolloutReadinessSignals?.items;
  assert.ok(readinessSignalItems?.required?.includes("stages"));
  assert.ok(readinessSignalItems?.required?.includes("rule"));
  assert.equal(readinessSignalItems?.additionalProperties, false);
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

test("copilot strict input bundle audit rejects broad app context", () => {
  const audit = auditMoralTradeCopilotStrictInputBundle({
    draft: completeDraft,
    evidenceMetadata: [],
    citations: ["proposal:local-draft"],
    rawPrivateFeed: "private feed payload",
    conversationMessages: ["unbounded chat context"],
  });

  assert.deepEqual(audit.acceptedTopLevelKeys, ["draft", "evidenceMetadata", "citations"]);
  assert.ok(
    audit.sourceCoverage.some(
      (entry) => entry.key === "structured_draft" && entry.status === "present",
    ),
  );
  assert.ok(
    audit.sourceCoverage.some(
      (entry) =>
        entry.key === "policy_registry" && entry.status === "provided_by_system",
    ),
  );
  assert.ok(audit.rejectedTopLevelKeys.includes("rawPrivateFeed"));
  assert.ok(audit.rejectedTopLevelKeys.includes("conversationMessages"));
  assert.ok(
    audit.blockers.some((blocker) =>
      blocker.includes("strict_input_bundle:top_level_field_not_allowed:rawPrivateFeed"),
    ),
  );
});

test("copilot contract validation fails when prompt templates lose safety boundaries", () => {
  const contract = {
    ...getMoralTradeCopilotContract(),
    promptTemplates: getMoralTradeCopilotContract()
      .promptTemplates.filter((template) => template.key !== "matching_prompt")
      .map((template) =>
        template.key === "system_prompt"
          ? {
              ...template,
              safetyCodes: template.safetyCodes.filter((code) => code !== "no_autonomous_outreach"),
            }
          : template,
      ),
  } satisfies MoralTradeCopilotContract;
  const validation = validateMoralTradeCopilotContract(contract);

  assert.equal(validation.status, "fail");
  assert.ok(validation.blockers.some((blocker) => blocker.includes("prompt-templates")));
  assert.ok(validation.blockers.some((blocker) => blocker.includes("prompt-template-safety")));
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
  const response = await contractRoute(
    new Request("http://localhost/api/moral-trade/copilot/contract"),
  );
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(body.ok, true);
  assert.ok(
    body.publicContract.promptTemplates.some(
      (template: { key: string }) => template.key === "system_prompt",
    ),
  );
  assert.ok(
    body.publicContract.promptTemplates.some(
      (template: { key: string }) => template.key === "reviewer_summary_prompt",
    ),
  );
  assert.ok(body.publicContract.rolloutReadinessSignals.includes("low_risk_task_scope"));
  assert.ok(
    body.publicContract.guardrails.some(
      (guardrail: { code: string; rule: string }) =>
        guardrail.code === "verification_loop_matchability_gate" &&
        /status matchable is invalid/i.test(guardrail.rule),
    ),
  );
  assert.ok(
    body.publicContract.verificationLoop.some(
      (step: { key: string; blocksMatchable: boolean }) =>
        step.key === "baseline_credibility" && step.blocksMatchable,
    ),
  );
  assert.deepEqual(body.publicContract.verificationMatchabilityGate, {
    guardrailCode: "verification_loop_matchability_gate",
    blockingStepKeys: [
      "schema_completeness",
      "anti_threat",
      "baseline_credibility",
      "evidence_sufficiency",
      "privacy_redaction",
    ],
    requiredStatus: "pass",
    enforcedBy: "validateMoralTradeCopilotOutput",
  });
  assert.equal(body.publicContract.rolloutReadiness[0].targetStage, "shadow_mode");
  assert.equal(body.publicContract.rolloutReadiness[0].status, "pass");
  assert.equal(body.publicContract.rolloutReadiness[1].status, "blocked");
});

test("technical spec exposes the copilot matchability verification gate", () => {
  const technicalSpecPage = readRepoFile("src/app/moral-trade/technical-spec/page.tsx");

  assert.match(technicalSpecPage, /copilotBlockingVerificationSteps/);
  assert.match(technicalSpecPage, /Matchability gate/);
  assert.match(technicalSpecPage, /validateMoralTradeCopilotOutput/);
  assert.match(technicalSpecPage, /blocking verification step has status/);
});

test("copilot review route remains deterministic and non-mutating", () => {
  const validation = validateMoralTradeCopilotReviewRouteImplementation({
    routeSource: readRepoFile("src/app/api/moral-trade/copilot/review/route.ts"),
  });

  assert.equal(validation.status, "pass");
  assert.equal(validation.blockers.length, 0);
  assert.ok(
    validation.checks.some(
      (check) => check.id === "copilot-review-no-live-mutations" && check.status === "pass",
    ),
  );
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

test("copilot output validation makes blocking verification steps hard matchability gates", () => {
  const output = buildMoralTradeCopilotOutput(completeDraft, ["proposal:local-draft"]);

  output.verification_loop = output.verification_loop.map((step) =>
    step.key === "baseline_credibility"
      ? {
          ...step,
          status: "needs_input",
          detail: "Baseline evidence was removed after the draft was marked matchable.",
        }
      : step,
  );

  const validation = validateMoralTradeCopilotOutput(output);

  assert.equal(output.status, "matchable");
  assert.equal(validation.status, "fail");
  assert.ok(
    validation.blockers.some((blocker) =>
      blocker.includes("matchable_verification_loop: blocking steps must pass"),
    ),
  );
});

test("copilot output validation rejects fields outside the approved JSON schema", () => {
  const output = buildMoralTradeCopilotOutput(completeDraft, ["proposal:local-draft"]) as ReturnType<
    typeof buildMoralTradeCopilotOutput
  > &
    Record<string, unknown>;

  output.private_contact_details = "participant@example.org";
  (output.trade_structure as Record<string, unknown>).raw_private_wish_text =
    "exact private wish text";
  (output.verification_loop[0] as Record<string, unknown>).hidden_reasoning =
    "unapproved chain-of-thought field";

  const validation = validateMoralTradeCopilotOutput(output);

  assert.equal(validation.status, "fail");
  assert.ok(validation.blockers.some((blocker) => blocker.includes("approved_json_only:output")));
  assert.ok(
    validation.blockers.some((blocker) =>
      blocker.includes("approved_json_only:trade_structure"),
    ),
  );
  assert.ok(
    validation.blockers.some((blocker) =>
      blocker.includes("approved_json_only:verification_loop:0"),
    ),
  );
});

test("copilot output validation rejects verification-loop contract flag drift", () => {
  const output = buildMoralTradeCopilotOutput(completeDraft, ["proposal:local-draft"]);

  output.verification_loop = output.verification_loop.map((step) =>
    step.key === "privacy_redaction" ? { ...step, blocks_matchable: false } : step,
  );

  const validation = validateMoralTradeCopilotOutput(output);

  assert.equal(validation.status, "fail");
  assert.ok(
    validation.blockers.some((blocker) =>
      blocker.includes("verification_loop_contract_mismatch: privacy_redaction"),
    ),
  );
});

test("copilot output validation requires exact artifact requests when evidence is insufficient", () => {
  const output = buildMoralTradeCopilotOutput(completeDraft, ["proposal:local-draft"]);

  output.status = "needs_evidence";
  output.verification_loop = output.verification_loop.map((step) =>
    step.key === "evidence_sufficiency"
      ? {
          ...step,
          status: "needs_input",
          detail: "Evidence is not specific enough for reliance.",
        }
      : step,
  );
  output.review_instructions.artifacts_to_request = [];
  output.next_step_checklist[0] = "Ask for more information later.";

  const validation = validateMoralTradeCopilotOutput(output);

  assert.equal(validation.status, "fail");
  assert.ok(
    validation.blockers.some((blocker) =>
      blocker.includes("insufficient_evidence_artifact_requests"),
    ),
  );
});

test("copilot evidence metadata accepts only redacted already-submitted evidence fields", () => {
  const normalization = normalizeMoralTradeCopilotEvidenceMetadata([
    {
      id: "receipt-meta-1",
      claim: "Donation receipt confirms the offered pledge amount.",
      evidenceType: "receipt",
      citation: "evidence:receipt-meta-1",
      status: "pending_review",
      scope: "factual_action",
      redactionLevel: "reviewer_only",
      submittedAt: "2026-05-20T12:00:00.000Z",
    },
  ]);
  const summary = summarizeMoralTradeCopilotEvidenceMetadata(normalization);
  const output = buildMoralTradeCopilotOutput(
    completeDraft,
    ["proposal:local-draft"],
    normalization.evidenceMetadata,
  );

  assert.deepEqual(normalization.blockers, []);
  assert.equal(summary.acceptedCount, 1);
  assert.equal(summary.ignoredFieldCount, 0);
  assert.ok(summary.redactionsApplied.includes("raw_artifact_body"));
  assert.ok(
    output.cited_evidence_table.some(
      (row) =>
        row.citation === "evidence:receipt-meta-1" &&
        row.evidence_type === "receipt" &&
        /metadata only/i.test(row.reviewer_note),
    ),
  );
  assert.equal(validateMoralTradeCopilotOutput(output).status, "pass");
});

test("copilot evidence metadata rejects unsupported extra fields", () => {
  const normalization = normalizeMoralTradeCopilotEvidenceMetadata([
    {
      id: "receipt-meta-1",
      claim: "Donation receipt confirms the offered pledge amount.",
      evidenceType: "receipt",
      citation: "evidence:receipt-meta-1",
      status: "pending_review",
      scope: "factual_action",
      redactionLevel: "reviewer_only",
      displayOnly: "extra display field outside the strict metadata bundle",
    },
  ]);

  assert.equal(normalization.acceptedCount, 0);
  assert.equal(normalization.rejectedCount, 1);
  assert.equal(normalization.ignoredFieldCount, 1);
  assert.ok(
    normalization.blockers.some((blocker) =>
      blocker.includes("unsupported_metadata_fields_not_allowed:displayOnly"),
    ),
  );
});

test("copilot evidence metadata rejects raw private fields and contact-like metadata", () => {
  const normalization = normalizeMoralTradeCopilotEvidenceMetadata([
    {
      id: "bad-meta-1",
      claim: "Email reviewer@example.org for the exact private receipt.",
      evidenceType: "receipt",
      citation: "evidence:bad-meta-1",
      status: "pending_review",
      scope: "factual_action",
      redactionLevel: "reviewer_only",
      rawArtifactBody: "private receipt body",
    },
  ]);

  assert.equal(normalization.acceptedCount, 0);
  assert.equal(normalization.rejectedCount, 1);
  assert.ok(
    normalization.blockers.some((blocker) =>
      blocker.includes("raw_or_private_fields_not_allowed:rawArtifactBody"),
    ),
  );
  assert.ok(
    normalization.blockers.some((blocker) => blocker.includes("redacted_claim_required")),
  );
});

test("copilot output validation rejects unsupported or private citation namespaces", () => {
  const output = buildMoralTradeCopilotOutput(completeDraft, ["thread:private-context"]);

  output.cited_evidence_table.push({
    claim: "Invented private evidence.",
    evidence_type: "evidence_locator",
    citation: "private-notes:raw-source",
    status: "submitted",
    reviewer_note: "This should not pass as a public evidence citation.",
  });

  const validation = validateMoralTradeCopilotOutput(output);

  assert.equal(validation.status, "fail");
  assert.ok(
    validation.blockers.some((blocker) =>
      blocker.includes("citations: unsupported or private citation namespace"),
    ),
  );
  assert.ok(validation.blockers.some((blocker) => blocker.includes("private-notes")));
  assert.ok(validation.blockers.some((blocker) => blocker.includes("thread:private-context")));
});

test("copilot review route returns validated non-mutating draft critique", async () => {
  const response = await reviewDraftRoute(
    new Request("http://localhost/api/moral-trade/copilot/review", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        draft: completeDraft,
        citations: ["proposal:route-test"],
        evidenceMetadata: [
          {
            id: "receipt-meta-1",
            claim: "Donation receipt confirms the offered pledge amount.",
            evidenceType: "receipt",
            citation: "evidence:receipt-meta-1",
            status: "pending_review",
            scope: "factual_action",
            redactionLevel: "reviewer_only",
            submittedAt: "2026-05-20T12:00:00.000Z",
          },
        ],
      }),
    }),
  );
  const body = await response.json();

  assert.equal(response.status, 200);
  assert.equal(response.headers.get("cache-control"), "private, no-store");
  assert.equal(body.ok, true);
  assert.equal(body.stateMutation, false);
  assert.equal(body.decisioningMode, "deterministic_draft_review_only");
  assert.deepEqual(body.inputBundleAudit.rejectedTopLevelKeys, []);
  assert.ok(
    body.inputBundleAudit.sourceCoverage.some(
      (entry: { key: string; status: string }) =>
        entry.key === "structured_draft" && entry.status === "present",
    ),
  );
  assert.ok(
    body.inputBundleAudit.sourceCoverage.some(
      (entry: { key: string; status: string }) =>
        entry.key === "policy_registry" && entry.status === "provided_by_system",
    ),
  );
  assert.equal(body.output.status, "matchable");
  assert.equal(body.evidenceMetadataSummary.acceptedCount, 1);
  assert.equal(body.evidenceMetadataSummary.ignoredFieldCount, 0);
  assert.equal(body.output.verification_loop.length, 8);
  assert.equal(
    body.output.verification_loop.find((step: { key: string }) => step.key === "schema_completeness")
      ?.status,
    "pass",
  );
  assert.ok(body.output.match_explanation.redactions_applied.includes("exact_private_wishes"));
  assert.ok(
    body.output.cited_evidence_table.some(
      (row: { citation: string; reviewer_note: string }) =>
        row.citation === "evidence:receipt-meta-1" && /metadata only/i.test(row.reviewer_note),
    ),
  );
  assert.deepEqual(body.output.citations, ["proposal:route-test"]);
  assert.deepEqual(body.blockers, []);
});

test("copilot review route rejects broad top-level context even when draft is valid", async () => {
  const response = await reviewDraftRoute(
    new Request("http://localhost/api/moral-trade/copilot/review", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        draft: completeDraft,
        rawPrivateFeed: "Do not admit this broad private context into the bundle.",
      }),
    }),
  );
  const body = await response.json();

  assert.equal(response.status, 422);
  assert.equal(body.ok, false);
  assert.equal(body.stateMutation, false);
  assert.ok(body.inputBundleAudit.rejectedTopLevelKeys.includes("rawPrivateFeed"));
  assert.ok(
    body.blockers.some((blocker: string) =>
      blocker.includes("strict_input_bundle:top_level_field_not_allowed:rawPrivateFeed"),
    ),
  );
  assert.equal("output" in body, false);
  assert.equal("outputValidation" in body, false);
  assert.match(body.fallback, /without emitting an output packet/i);
});

test("copilot review route fails closed on unsupported private draft fields", async () => {
  const response = await reviewDraftRoute(
    new Request("http://localhost/api/moral-trade/copilot/review", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        draft: {
          ...completeDraft,
          contactDetails: "victoria@example.org",
          rawPrivateNotes: "Exact private wish text should not enter the bundle.",
          protectedTraits: ["religion"],
        },
      }),
    }),
  );
  const body = await response.json();
  const serializedBody = JSON.stringify(body);

  assert.equal(response.status, 422);
  assert.equal(response.headers.get("cache-control"), "private, no-store");
  assert.equal(body.ok, false);
  assert.equal(body.stateMutation, false);
  assert.ok(
    body.blockers.some((blocker: string) =>
      blocker.includes("draft.contactDetails: unsupported structured draft field"),
    ),
  );
  assert.ok(
    body.blockers.some((blocker: string) =>
      blocker.includes("draft.rawPrivateNotes: unsupported structured draft field"),
    ),
  );
  assert.ok(
    body.blockers.some((blocker: string) =>
      blocker.includes("draft.protectedTraits: unsupported structured draft field"),
    ),
  );
  assert.equal("output" in body, false);
  assert.equal("outputValidation" in body, false);
  assert.doesNotMatch(serializedBody, /victoria@example\.org/);
  assert.doesNotMatch(serializedBody, /Exact private wish text/);
  assert.match(body.fallback, /without emitting an output packet/i);
});

test("copilot review route fails closed on private citation labels before output", async () => {
  const response = await reviewDraftRoute(
    new Request("http://localhost/api/moral-trade/copilot/review", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        draft: completeDraft,
        citations: [
          "proposal:route-test",
          "thread:private-context",
          "review:victoria@example.org",
        ],
      }),
    }),
  );
  const body = await response.json();
  const serializedBody = JSON.stringify(body);

  assert.equal(response.status, 422);
  assert.equal(response.headers.get("cache-control"), "private, no-store");
  assert.equal(body.ok, false);
  assert.equal(body.stateMutation, false);
  assert.ok(
    body.blockers.some((blocker: string) =>
      blocker.includes("citations.1: unsupported or private citation label"),
    ),
  );
  assert.ok(
    body.blockers.some((blocker: string) =>
      blocker.includes("citations.2: unsupported or private citation label"),
    ),
  );
  assert.equal("output" in body, false);
  assert.equal("outputValidation" in body, false);
  assert.doesNotMatch(serializedBody, /thread:private-context/);
  assert.doesNotMatch(serializedBody, /victoria@example\.org/);
  assert.match(body.fallback, /without emitting an output packet/i);
});

test("copilot review route fails closed on unsupported evidence metadata fields", async () => {
  const response = await reviewDraftRoute(
    new Request("http://localhost/api/moral-trade/copilot/review", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        draft: completeDraft,
        evidenceMetadata: [
          {
            id: "receipt-meta-1",
            claim: "Donation receipt confirms the offered pledge amount.",
            evidenceType: "receipt",
            citation: "evidence:receipt-meta-1",
            status: "pending_review",
            scope: "factual_action",
            redactionLevel: "reviewer_only",
            displayOnly: "extra display field outside the strict metadata bundle",
          },
        ],
      }),
    }),
  );
  const body = await response.json();
  const serializedBody = JSON.stringify(body);

  assert.equal(response.status, 422);
  assert.equal(response.headers.get("cache-control"), "private, no-store");
  assert.equal(body.ok, false);
  assert.equal(body.stateMutation, false);
  assert.equal(body.evidenceMetadataSummary.acceptedCount, 0);
  assert.equal(body.evidenceMetadataSummary.rejectedCount, 1);
  assert.equal(body.evidenceMetadataSummary.ignoredFieldCount, 1);
  assert.ok(
    body.blockers.some((blocker: string) =>
      blocker.includes("evidence_metadata:0:unsupported_metadata_fields_not_allowed:displayOnly"),
    ),
  );
  assert.equal("output" in body, false);
  assert.equal("outputValidation" in body, false);
  assert.doesNotMatch(serializedBody, /extra display field/);
  assert.match(body.fallback, /without emitting an output packet/i);
});

test("copilot review route fails closed on raw evidence metadata", async () => {
  const response = await reviewDraftRoute(
    new Request("http://localhost/api/moral-trade/copilot/review", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        draft: completeDraft,
        evidenceMetadata: [
          {
            id: "bad-meta-1",
            claim: "Call 415-555-0199 for the private receipt.",
            evidenceType: "receipt",
            citation: "evidence:bad-meta-1",
            status: "pending_review",
            scope: "factual_action",
            redactionLevel: "reviewer_only",
            privateNotes: "raw private reviewer note",
          },
        ],
      }),
    }),
  );
  const body = await response.json();

  assert.equal(response.status, 422);
  assert.equal(body.ok, false);
  assert.equal(body.stateMutation, false);
  assert.equal(body.evidenceMetadataSummary.acceptedCount, 0);
  assert.equal(body.evidenceMetadataSummary.rejectedCount, 1);
  assert.ok(
    body.blockers.some((blocker: string) =>
      blocker.includes("evidence_metadata:0:raw_or_private_fields_not_allowed"),
    ),
  );
  assert.equal("output" in body, false);
  assert.equal("outputValidation" in body, false);
  assert.match(body.fallback, /without emitting an output packet/i);
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

test("copilot output validation requires exact policy reasons for blocked anti-threat outputs", () => {
  const output = buildMoralTradeCopilotOutput({
    ...completeDraft,
    offeredAction: "Pay me or I will start harassing this organization.",
    publicDescription: "Pay me or I will start harassing this organization.",
  });

  output.completeness.policy_conflicts = [];
  output.cited_evidence_table = output.cited_evidence_table.filter(
    (row) => row.evidence_type !== "policy_registry",
  );

  const validation = validateMoralTradeCopilotOutput(output);

  assert.equal(validation.status, "fail");
  assert.ok(validation.blockers.some((blocker) => blocker.includes("anti_threat_escalation")));
});

test("copilot output validation rejects anti-threat blocks without blocked status", () => {
  const output = buildMoralTradeCopilotOutput({
    ...completeDraft,
    offeredAction: "Pay me or I will start harassing this organization.",
    publicDescription: "Pay me or I will start harassing this organization.",
  });

  output.status = "needs_human_review";

  const validation = validateMoralTradeCopilotOutput(output);

  assert.equal(validation.status, "fail");
  assert.ok(
    validation.blockers.some((blocker) =>
      blocker.includes("anti-threat blocks must return blocked status"),
    ),
  );
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

test("copilot output validation rejects hidden reasoning transcript markers", () => {
  const output = buildMoralTradeCopilotOutput(completeDraft);

  output.reviewer_summary =
    "Chain of thought: I privately reasoned through the offer. Public summary: the draft needs review.";
  output.cited_evidence_table[0].reviewer_note =
    "Internal reasoning says this evidence should pass.";

  const validation = validateMoralTradeCopilotOutput(output);

  assert.equal(validation.status, "fail");
  assert.ok(validation.blockers.some((blocker) => blocker.includes("no_chain_of_thought")));
});

test("copilot output validation rejects certainty claims while the record is incomplete", () => {
  const output = buildMoralTradeCopilotOutput({
    ...completeDraft,
    requestedAction: "",
  });

  output.reviewer_summary += " This is guaranteed safe to rely on without review.";
  output.next_step_checklist[0] = "This record is definitively complete.";

  const validation = validateMoralTradeCopilotOutput(output);

  assert.equal(output.status, "needs_clarification");
  assert.ok(output.completeness.missing_required_fields.includes("Requested action"));
  assert.equal(validation.status, "fail");
  assert.ok(validation.blockers.some((blocker) => blocker.includes("no_false_certainty")));
});

test("copilot output validation rejects escrow, legal, tax, custody, or endorsement claims", () => {
  const output = buildMoralTradeCopilotOutput(completeDraft);

  output.reviewer_summary +=
    " This is escrow-backed, legally enforceable, and morally endorsed by the platform.";
  output.cited_evidence_table[0].reviewer_note =
    "This evidence makes the trade tax deductible and completion guaranteed.";

  const validation = validateMoralTradeCopilotOutput(output);

  assert.equal(validation.status, "fail");
  assert.ok(
    validation.blockers.some((blocker) => blocker.includes("no_escrow_legal_tax_claims")),
  );
});

test("copilot output validation rejects invented facts, counterparties, or evidence", () => {
  const output = buildMoralTradeCopilotOutput(completeDraft);

  output.reviewer_summary +=
    " Assume prior behavior without evidence and state as fact that the participant completed the donation.";
  output.next_step_checklist[0] =
    "Create a fake receipt citation for the counterparty if the artifact is missing.";

  const validation = validateMoralTradeCopilotOutput(output);

  assert.equal(validation.status, "fail");
  assert.ok(validation.blockers.some((blocker) => blocker.includes("observable_claims_only")));
});

test("copilot output validation rejects global moral ranking claims", () => {
  const output = buildMoralTradeCopilotOutput(completeDraft);

  output.reviewer_summary += " The platform decides this offer is objectively morally correct.";
  output.next_step_checklist[0] =
    "Score this proposal globally as the morally best trade before reviewer approval.";

  const validation = validateMoralTradeCopilotOutput(output);

  assert.equal(validation.status, "fail");
  assert.ok(validation.blockers.some((blocker) => blocker.includes("no_global_moral_ranking")));
});

test("copilot output validation rejects autonomous outreach or private disclosure instructions", () => {
  const output = buildMoralTradeCopilotOutput(completeDraft);

  output.next_step_checklist[0] =
    "Automatically email the matched counterparty now with the participant's contact details.";
  output.review_instructions.review_scope[0] =
    "Reveal the other participant's email address before consent.";

  const validation = validateMoralTradeCopilotOutput(output);

  assert.equal(validation.status, "fail");
  assert.ok(validation.blockers.some((blocker) => blocker.includes("no_autonomous_outreach")));
});

test("copilot output carries baseline challenge recommendations as structured flags", () => {
  const output = buildMoralTradeCopilotOutput({
    ...completeDraft,
    baselineStatement:
      "Without this trade I would probably keep my current plan and would not make the reciprocal pledge.",
  });

  assert.equal(output.status, "matchable");
  assert.equal(output.trust_assessment.counterfactual_baseline.rating, "medium");
  assert.ok(output.match_explanation.factor_codes.includes("baseline_challenge_recommended"));
  assert.ok(output.uncertainty_flags.includes("baseline_challenge_recommended"));
  assert.ok(
    output.review_instructions.artifacts_to_request.includes(
      "prior-intent note, past behavior record, or dated no-trade baseline statement",
    ),
  );
  assert.equal(validateMoralTradeCopilotOutput(output).status, "pass");
});

test("copilot output preserves challenge-window status for externality triggers", () => {
  const output = buildMoralTradeCopilotOutput({
    ...completeDraft,
    format: "offset",
    offeredCause: "Political reform",
    requestedCause: "Public health",
    publicDescription:
      "A voluntary donation offset where each side is better off than the no-trade baseline and reviewers inspect externality risks before reliance.",
  });
  const validation = validateMoralTradeCopilotOutput(output);

  assert.equal(output.status, "challenge_window");
  assert.equal(output.trust_assessment.externality_review.required, true);
  assert.ok(output.uncertainty_flags.some((flag) => flag.startsWith("externality:")));
  assert.equal(
    output.verification_loop.find((step) => step.key === "human_review_routing")?.status,
    "human_review",
  );
  assert.equal(validation.status, "pass");
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

test("copilot output validation enforces reviewer-summary sections", () => {
  const output = buildMoralTradeCopilotOutput(completeDraft, ["proposal:local-draft"]);

  output.reviewer_summary =
    "What is being offered: a verified pledge. Baseline claim: current intent is documented. Main policy flags: none. What remains unverified: completion evidence.";

  const validation = validateMoralTradeCopilotOutput(output);

  assert.equal(validation.status, "fail");
  assert.ok(
    validation.blockers.some((blocker) =>
      blocker.includes("missing required reviewer sections: What is being requested, What evidence would count"),
    ),
  );
});
