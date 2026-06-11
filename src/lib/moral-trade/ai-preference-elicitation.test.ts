import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

import {
  evaluateMoralTradeAiPreferenceElicitation,
  getMoralTradeAiPreferenceElicitationContract,
  validateMoralTradeAiPreferenceElicitationContract,
  type MoralTradeAiPreferenceElicitationPolicyRecord,
  type MoralTradeAiPreferenceElicitationRecord,
} from "./ai-preference-elicitation";

function readRepoFile(path: string) {
  return readFileSync(join(process.cwd(), path), "utf8");
}

function hashFor(seed: string) {
  return `sha256:${createHash("sha256").update(seed).digest("hex")}`;
}

function policyRecord(
  overrides: Partial<MoralTradeAiPreferenceElicitationPolicyRecord> = {},
): MoralTradeAiPreferenceElicitationPolicyRecord {
  return {
    policyId: "ai-preference-elicitation-policy:tier-1",
    releaseStage: "tier_1_money_only_donation_offset",
    policyStatus: "resolved_immutable",
    policyHash: hashFor("ai-preference-elicitation-policy"),
    allowedScopes: [
      "baseline",
      "caps",
      "side_constraints",
      "empirical_assumptions",
      "cause_buckets",
      "evidence_preferences",
      "fallback_rules",
      "manual_review",
    ],
    allowedSubjectTypes: [
      "offset_offer",
      "pledge_swap_offer",
      "matched_trade_lock_proposal",
      "common_ground_budget",
      "participant_confirmation_record",
    ],
    reviewedAt: "2026-06-11T12:00:00.000Z",
    expiresAt: "2026-10-11T12:00:00.000Z",
    supersededBy: null,
    allowsPreferenceStructuring: true,
    prohibitsHiddenWillingnessToPayInference: true,
    prohibitsAutonomousCounteroffers: true,
    prohibitsStateChangeFromAiOutput: true,
    requiresUserEditedStructuredInputForStateChange: true,
    ...overrides,
  };
}

function elicitationRecord(
  overrides: Partial<MoralTradeAiPreferenceElicitationRecord> = {},
): MoralTradeAiPreferenceElicitationRecord {
  return {
    recordId: "ai-preference-elicitation:offset-offer-demo",
    subjectType: "offset_offer",
    subjectRef: "offset-offer:demo",
    participantIdHash: hashFor("participant"),
    policyRef: "ai-preference-elicitation-policy:tier-1",
    scope: "baseline",
    aiOutputHash: hashFor("ai-output"),
    userEditedStructuredInputHash: hashFor("user-edited-structured-input"),
    hiddenWillingnessToPayInferenceProhibited: true,
    autonomousCounterofferOrAcceptance: false,
    stateChangeAllowed: false,
    participantConfirmationRecordRef: "participant-confirmation:demo",
    reviewerDecisionRef: null,
    elicitationState: "converted_to_structured_input",
    createdAt: "2026-06-11T12:00:00.000Z",
    updatedAt: "2026-06-11T12:00:00.000Z",
    rawPromptPublic: false,
    rawAiOutputPublic: false,
    hiddenWillingnessToPayEstimatePublic: false,
    hiddenNegotiationMovesPublic: false,
    privateParticipantNotesPublic: false,
    reviewerNotesPublic: false,
    ...overrides,
  };
}

test("AI preference-elicitation contract validates first-class records and prohibited uses", () => {
  const contract = getMoralTradeAiPreferenceElicitationContract();
  const validation = validateMoralTradeAiPreferenceElicitationContract(contract);

  assert.equal(validation.status, "pass");
  assert.deepEqual(validation.blockers, []);
  assert.ok(
    contract.firstClassRecordTables.includes(
      "moral_trade_ai_preference_elicitation_policies",
    ),
  );
  assert.ok(
    contract.firstClassRecordTables.includes(
      "moral_trade_ai_preference_elicitation_records",
    ),
  );
  assert.ok(contract.policySnapshotSubjects.includes("ai_preference_elicitation"));
  assert.ok(contract.scopes.includes("baseline"));
  assert.ok(contract.scopes.includes("caps"));
  assert.ok(contract.scopes.includes("cause_buckets"));
  assert.ok(contract.scopes.includes("fallback_rules"));
  assert.ok(contract.elicitationStates.includes("converted_to_structured_input"));
  assert.ok(
    contract.prohibitedUseBlockers.includes(
      "hidden_willingness_to_pay_inference_not_prohibited",
    ),
  );
  assert.match(contract.failClosedRule, /hidden willingness to pay/i);
  assert.match(contract.failClosedRule, /user-edited structured input/i);
  assert.match(contract.privacyBoundary, /raw AI outputs/i);
});

test("AI drafting can be absent, but AI-shaped lock input requires policy and record", () => {
  const unusedDraft = evaluateMoralTradeAiPreferenceElicitation({
    transition: "draft_preference_elicitation",
    aiPreferenceElicitationUsed: false,
    checkedAt: "2026-06-11T12:00:00.000Z",
    policies: [],
    records: [],
  });

  assert.equal(unusedDraft.status, "pass");
  assert.equal(unusedDraft.requiredRecordCount, 0);

  const lock = evaluateMoralTradeAiPreferenceElicitation({
    transition: "matched_trade_lock",
    aiPreferenceElicitationUsed: true,
    checkedAt: "2026-06-11T12:00:00.000Z",
    policies: [],
    records: [],
  });

  assert.equal(lock.status, "blocked");
  assert.ok(lock.blockers.includes("ai_preference_elicitation_policy_required"));
  assert.ok(lock.blockers.includes("ai_preference_elicitation_record_required"));
  assert.ok(lock.blockers.includes("ai_preference_elicitation_converted_record_required"));
});

test("converted user-edited structured input can pass lock and payment capture", () => {
  const lock = evaluateMoralTradeAiPreferenceElicitation({
    transition: "matched_trade_lock",
    aiPreferenceElicitationUsed: true,
    checkedAt: "2026-06-11T12:00:00.000Z",
    policies: [policyRecord()],
    records: [elicitationRecord()],
  });

  assert.equal(lock.status, "pass");
  assert.equal(lock.convertedStructuredInputCount, 1);
  assert.equal(lock.confirmationOrReviewerDecisionCount, 1);

  const capture = evaluateMoralTradeAiPreferenceElicitation({
    transition: "payment_capture",
    aiPreferenceElicitationUsed: true,
    checkedAt: "2026-06-11T12:00:00.000Z",
    policies: [policyRecord()],
    records: [elicitationRecord({ reviewerDecisionRef: "review-decision:demo" })],
  });

  assert.equal(capture.status, "pass");
});

test("hidden WTP inference, autonomous counteroffer, or AI state change blocks", () => {
  const result = evaluateMoralTradeAiPreferenceElicitation({
    transition: "payment_capture",
    aiPreferenceElicitationUsed: true,
    checkedAt: "2026-06-11T12:00:00.000Z",
    policies: [policyRecord()],
    records: [
      elicitationRecord({
        hiddenWillingnessToPayInferenceProhibited: false,
        autonomousCounterofferOrAcceptance: true,
        stateChangeAllowed: true,
      }),
    ],
  });

  assert.equal(result.status, "blocked");
  assert.ok(
    result.blockers.includes(
      "hidden_willingness_to_pay_inference_not_prohibited:ai-preference-elicitation:offset-offer-demo",
    ),
  );
  assert.ok(
    result.blockers.includes(
      "autonomous_counteroffer_or_acceptance_attempted:ai-preference-elicitation:offset-offer-demo",
    ),
  );
  assert.ok(
    result.blockers.includes(
      "ai_output_state_change_allowed:ai-preference-elicitation:offset-offer-demo",
    ),
  );
});

test("sandbox or user-reviewed AI output cannot affect matching before conversion", () => {
  const result = evaluateMoralTradeAiPreferenceElicitation({
    transition: "clearing_run_input",
    aiPreferenceElicitationUsed: true,
    checkedAt: "2026-06-11T12:00:00.000Z",
    policies: [policyRecord()],
    records: [
      elicitationRecord({
        elicitationState: "user_reviewed",
        userEditedStructuredInputHash: null,
        participantConfirmationRecordRef: null,
        reviewerDecisionRef: null,
      }),
    ],
  });

  assert.equal(result.status, "blocked");
  assert.ok(
    result.blockers.includes(
      "ai_output_not_converted_to_user_edited_structured_input:ai-preference-elicitation:offset-offer-demo:user_reviewed",
    ),
  );
  assert.ok(
    result.blockers.includes(
      "user_edited_structured_input_hash_missing:ai-preference-elicitation:offset-offer-demo",
    ),
  );
  assert.ok(
    result.blockers.includes(
      "ai_preference_confirmation_or_reviewer_decision_missing:ai-preference-elicitation:offset-offer-demo",
    ),
  );
});

test("AI preference-elicitation privacy fields fail closed", () => {
  const result = evaluateMoralTradeAiPreferenceElicitation({
    transition: "public_metric_publication",
    aiPreferenceElicitationUsed: true,
    checkedAt: "2026-06-11T12:00:00.000Z",
    policies: [policyRecord()],
    records: [
      elicitationRecord({
        rawPromptPublic: true,
        rawAiOutputPublic: true,
        hiddenWillingnessToPayEstimatePublic: true,
        hiddenNegotiationMovesPublic: true,
        privateParticipantNotesPublic: true,
        reviewerNotesPublic: true,
      }),
    ],
  });

  assert.equal(result.status, "blocked");
  assert.ok(
    result.blockers.includes(
      "raw_ai_preference_elicitation_prompt_public:ai-preference-elicitation:offset-offer-demo",
    ),
  );
  assert.ok(
    result.blockers.includes(
      "raw_ai_preference_elicitation_output_public:ai-preference-elicitation:offset-offer-demo",
    ),
  );
  assert.ok(
    result.blockers.includes(
      "hidden_willingness_to_pay_estimate_public:ai-preference-elicitation:offset-offer-demo",
    ),
  );
  assert.ok(
    result.blockers.includes(
      "hidden_negotiation_moves_public:ai-preference-elicitation:offset-offer-demo",
    ),
  );
});

test("AI preference-elicitation contract is wired through route, health, spec, API profile, and migrations", () => {
  const route = readRepoFile(
    "src/app/api/moral-trade/ai-preference-elicitation/contract/route.ts",
  );
  const health = readRepoFile("src/app/api/moral-trade/health/route.ts");
  const spec = readRepoFile("src/app/moral-trade/technical-spec/page.tsx");
  const apiContract = readRepoFile("src/lib/moral-trade/api-contract.ts");
  const apiProfile = readRepoFile("config/moral-trade/api-contract-profile.json");
  const migration = readRepoFile(
    "supabase/migrations/20260611_moral_trade_ai_preference_elicitation_records.sql",
  );
  const schema = readRepoFile("supabase/schema.sql");
  const databaseTypes = readRepoFile("src/lib/supabase/database.types.ts");

  assert.match(route, /getMoralTradeAiPreferenceElicitationContract/);
  assert.match(route, /aiPreferenceElicitationSampleEvaluationStatuses/);
  assert.match(health, /aiPreferenceElicitationValidation/);
  assert.match(health, /aiPreferenceElicitationFirstClassRecordTables/);
  assert.match(spec, /aiPreferenceElicitationContract\.firstClassRecordTables/);
  assert.match(spec, /\/api\/moral-trade\/ai-preference-elicitation\/contract/);
  assert.match(apiContract, /moral_trade_ai_preference_elicitation_contract/);
  assert.match(apiProfile, /ai_preference_elicitation_contract_response/);
  assert.match(apiProfile, /AI-preference-elicitation governance/);
  assert.match(migration, /moral_trade_ai_preference_elicitation_policies/);
  assert.match(migration, /moral_trade_ai_preference_elicitation_records/);
  assert.match(migration, /hidden_willingness_to_pay_inference_prohibited_bool/);
  assert.match(migration, /autonomous_counteroffer_or_acceptance_bool/);
  assert.match(migration, /ai_preference_elicitation/);
  assert.match(schema, /moral_trade_ai_preference_elicitation_records/);
  assert.match(schema, /hidden_wtp_estimate_public_bool/);
  assert.match(databaseTypes, /moral_trade_ai_preference_elicitation_policies/);
  assert.match(databaseTypes, /ai_preference_elicitation/);
});
