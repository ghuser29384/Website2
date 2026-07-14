import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

import { POST as enforcePreferenceIntegrity } from "@/app/api/moral-trade/preference-integrity/enforce/route";

import {
  evaluateMoralTradePreferenceIntegrity,
  getMoralTradePreferenceIntegrityContract,
  validateMoralTradePreferenceIntegrityContract,
  type MoralTradePreferenceIntegrityEvaluationInput,
} from "./preference-integrity";

const CHECKED_AT = "2026-06-13T12:00:00.000Z";

function readRepoFile(path: string) {
  return readFileSync(join(process.cwd(), path), "utf8");
}

function hashFor(seed: string) {
  return `sha256:${createHash("sha256").update(seed).digest("hex")}`;
}

function passingInput(
  overrides: Partial<MoralTradePreferenceIntegrityEvaluationInput> = {},
): MoralTradePreferenceIntegrityEvaluationInput {
  return {
    bargainingProtocols: [
      {
        antiHoldupCooldownHours: 24,
        appliesTo: "donation_offset",
        artificialUrgencyProhibited: true,
        counterofferLimit: 1,
        createdAt: CHECKED_AT,
        dynamicPricingAllowed: false,
        policyVersion: "bargaining-protocol:v1",
        privateCapDisclosureBehavior: "reviewer_only",
        protocolType: "posted_template",
        recordId: "bargaining-protocol:lock",
        rejectionNonretaliationRequired: true,
        renewedConfirmationRequiredForCounteroffer: true,
        reviewerDecisionRef: "review:bargaining-protocol",
        updatedAt: CHECKED_AT,
      },
    ],
    bargainingRoundRecords: [],
    checkedAt: CHECKED_AT,
    empiricalAssumptionSnapshots: [
      {
        assumptionReviewState: "non_blocking",
        assumptionSummaryHash: hashFor("assumption"),
        assumptionType: "empirical_belief_difference",
        challengeState: "closed",
        confidenceLevel: "medium",
        createdAt: CHECKED_AT,
        evidenceRefs: ["evidence:assumption"],
        materialToSurplusConfirmation: true,
        participantIdHash: hashFor("participant"),
        recordId: "empirical-assumption:lock",
        reviewerDecisionRef: "review:empirical-assumption",
        staleIfChallenged: true,
        subjectId: "matched-lock:demo",
        subjectType: "matched_trade_lock_proposal",
        updatedAt: CHECKED_AT,
      },
    ],
    integrityRequired: true,
    intrapersonalSelfOffsetRecords: [
      {
        classificationState: "eligible_interpersonal_moral_trade",
        createdAt: CHECKED_AT,
        excludedFromMoralTradeMetrics: true,
        externalCounterpartyPresent: true,
        participantIdHash: hashFor("participant"),
        recordId: "self-offset:lock",
        representedMoralPerspectiveHash: hashFor("moral-perspective"),
        reviewerDecisionRef: "review:self-offset",
        selfOffsetType: "personal_offset",
        subjectId: "matched-lock:demo",
        subjectType: "matched_trade_lock_proposal",
        updatedAt: CHECKED_AT,
      },
    ],
    moralDifferenceAttestations: [
      {
        assertedTradeBasis: "moral_view_difference",
        classificationSupportState: "supports_moral_trade_classification",
        coarseMoralReasonCodes: ["cause-priority"],
        createdAt: CHECKED_AT,
        disclosureLevel: "counterparty_coarse",
        fullTheoryRequired: false,
        ideologyInferenceProhibited: true,
        inconsistencyOrBadFaithSignalState: "none",
        moralDifferencePolicyRef: "policy:moral-difference:v1",
        participantIdHash: hashFor("participant"),
        recordId: "moral-difference:lock",
        reviewerDecisionRef: "review:moral-difference",
        subjectId: "matched-lock:demo",
        subjectType: "matched_trade_lock_proposal",
        updatedAt: CHECKED_AT,
      },
    ],
    moralSideConstraintProfiles: [
      {
        blockedActionOrTermHash: null,
        coolingOffRequired: true,
        createdAt: CHECKED_AT,
        participantIdHash: hashFor("participant"),
        recordId: "side-constraint:lock",
        reviewerDecisionRef: "review:side-constraint",
        sideConstraintContext: "none_disclosed",
        sideConstraintPolicyRef: "policy:side-constraint:v1",
        sideConstraintReviewState: "non_blocking",
        subjectId: "matched-lock:demo",
        subjectType: "matched_trade_lock_proposal",
        updatedAt: CHECKED_AT,
        waiverAllowed: false,
        waiverConfirmationRequired: false,
      },
    ],
    optionSetComparisons: [
      {
        alternativeOptionHashes: [hashFor("alternative")],
        cardinalScoreProhibited: true,
        cardinalScoreRequired: false,
        createdAt: CHECKED_AT,
        dominanceApplicabilityState: "applicable",
        incomparabilityReviewState: "not_required",
        noTradeOptionHash: hashFor("no-trade"),
        optionGenerationPolicyRef: "policy:option-set:v1",
        paretoDominanceReviewState: "no_known_dominating_option",
        participantIdsHash: hashFor("participants"),
        participantOptionComparability: { state: "comparable_without_cardinal_score" },
        participantOptionJudgments: { redacted: true },
        preferenceComparabilityPolicyRef: "policy:preference-comparability:v1",
        privacyRedactionPolicyRef: "policy:privacy-redaction:v1",
        proposedTradeOptionHash: hashFor("proposed-trade"),
        recordId: "option-set:lock",
        reviewerDecisionRef: "review:option-set",
        subjectId: "matched-lock:demo",
        subjectType: "matched_trade_lock_proposal",
        unavailableAlternativeReasonCodes: [],
        updatedAt: CHECKED_AT,
      },
    ],
    preferenceComparabilityRecords: [
      {
        cardinalScoreProhibited: true,
        createdAt: CHECKED_AT,
        participantIdsHash: hashFor("participants"),
        participantOptionComparabilityState: "comparable_without_cardinal_score",
        preferenceComparabilityPolicyRef: "policy:preference-comparability:v1",
        publicCardinalScoreExposed: false,
        publicExchangeRateExposed: false,
        publicRankingExposed: false,
        recordId: "preference-comparability:lock",
        reviewerDecisionRef: "review:preference-comparability",
        subjectId: "matched-lock:demo",
        subjectType: "matched_trade_lock_proposal",
        updatedAt: CHECKED_AT,
      },
    ],
    tradeBurdenAccountingRecords: [
      {
        attentionOrCoordinationBurdenLevel: "medium",
        burdenDisclosureRecordRef: "burden-disclosure:lock",
        burdenNetSurplusConfirmationState: "confirmed",
        challengeOrDisputeBurdenLevel: "low",
        createdAt: CHECKED_AT,
        estimatedTimeBurdenMinutesBucket: "15-30",
        evidenceBurdenLevel: "medium",
        monetaryBurdenCents: 5000,
        participantIdHash: hashFor("participant"),
        platformFeeBurdenCents: 0,
        privacyDisclosureBurdenLevel: "low",
        recordId: "trade-burden:lock",
        residualObligationSummaryHash: hashFor("residual"),
        reviewerDecisionRef: "review:trade-burden",
        subjectId: "matched-lock:demo",
        subjectType: "matched_trade_lock_proposal",
        tradeBurdenPolicyRef: "policy:trade-burden:v1",
        updatedAt: CHECKED_AT,
      },
    ],
    transition: "matched_trade_lock",
    ...overrides,
  };
}

test("preference-integrity contract validates moraltrade68 record tables and release-gate hooks", () => {
  const contract = getMoralTradePreferenceIntegrityContract();
  const validation = validateMoralTradePreferenceIntegrityContract(contract);

  assert.equal(validation.status, "pass");
  assert.deepEqual(validation.blockers, []);
  assert.ok(contract.firstClassRecordTables.includes("moral_trade_option_set_comparison_records"));
  assert.ok(contract.firstClassRecordTables.includes("moral_trade_preference_comparability_records"));
  assert.ok(contract.firstClassRecordTables.includes("moral_trade_trade_burden_accounting_records"));
  assert.ok(contract.firstClassRecordTables.includes("moral_trade_moral_difference_attestation_records"));
  assert.ok(contract.firstClassRecordTables.includes("moral_trade_bargaining_protocols"));
  assert.ok(contract.firstClassRecordTables.includes("moral_trade_empirical_assumption_snapshots"));
  assert.ok(contract.firstClassRecordTables.includes("moral_trade_moral_side_constraint_profiles"));
  assert.ok(contract.firstClassRecordTables.includes("moral_trade_intrapersonal_self_offset_records"));
  assert.ok(contract.releaseGateTestHooks.includes("option_set_pareto_comparison_test"));
  assert.ok(contract.releaseGateTestHooks.includes("preference_incomparability_noncardinal_test"));
  assert.ok(contract.releaseGateTestHooks.includes("intrapersonal_self_offset_classification_test"));
  assert.ok(contract.sampleEvaluations.some((sample) => sample.status === "pass"));
  assert.ok(contract.sampleEvaluations.some((sample) => sample.status === "blocked"));
});

test("complete reviewed preference-integrity bundle can pass matched-trade lock", () => {
  const result = evaluateMoralTradePreferenceIntegrity(passingInput());

  assert.equal(result.status, "pass");
  assert.equal(result.reviewedRecordCount, 8);
  assert.equal(result.nonBlockingRecordCount, 8);
  assert.deepEqual(result.blockers, []);
});

test("public metrics block intrapersonal self-offsets that are not excluded", () => {
  const input = passingInput({
    intrapersonalSelfOffsetRecords: [
      {
        ...passingInput().intrapersonalSelfOffsetRecords[0],
        classificationState: "self_offset_only",
        excludedFromMoralTradeMetrics: false,
      },
    ],
    transition: "public_metric_publication",
  });
  const result = evaluateMoralTradePreferenceIntegrity(input);

  assert.equal(result.status, "blocked");
  assert.ok(result.blockers.includes("self_offset_classification_blocking:self-offset:lock:self_offset_only"));
  assert.ok(result.blockers.includes("self_offset_metrics_exclusion_missing:self-offset:lock"));
  assert.ok(result.blockers.includes("public_metric_publication_self_offset_not_excluded"));
  assert.ok(result.publicMetricSelfOffsetBlockCount >= 2);
});

test("public cardinal rankings and exchange-rate exposure fail closed", () => {
  const input = passingInput({
    preferenceComparabilityRecords: [
      {
        ...passingInput().preferenceComparabilityRecords[0],
        publicCardinalScoreExposed: true,
        publicExchangeRateExposed: true,
        publicRankingExposed: true,
      },
    ],
  });
  const result = evaluateMoralTradePreferenceIntegrity(input);

  assert.equal(result.status, "blocked");
  assert.ok(result.blockers.includes("preference_comparability_public_cardinal_score_exposed:preference-comparability:lock"));
  assert.ok(result.blockers.includes("preference_comparability_public_exchange_rate_exposed:preference-comparability:lock"));
  assert.ok(result.blockers.includes("preference_comparability_public_ranking_exposed:preference-comparability:lock"));
  assert.equal(result.publicPreferenceExposureBlockCount, 3);
});

test("open stale empirical assumptions and agent-relative waivers fail closed", () => {
  const input = passingInput({
    empiricalAssumptionSnapshots: [
      {
        ...passingInput().empiricalAssumptionSnapshots[0],
        challengeState: "open",
        staleIfChallenged: true,
      },
    ],
    moralSideConstraintProfiles: [
      {
        ...passingInput().moralSideConstraintProfiles[0],
        sideConstraintContext: "agent_relative_limit",
        waiverAllowed: true,
      },
    ],
  });
  const result = evaluateMoralTradePreferenceIntegrity(input);

  assert.equal(result.status, "blocked");
  assert.ok(result.blockers.includes("empirical_assumption_open_challenge_stale:empirical-assumption:lock"));
  assert.ok(result.blockers.includes("moral_side_constraint_agent_relative_waiver_blocking:side-constraint:lock"));
});

test("missing bargaining protocol and side-constraint records fail closed for release promotion", () => {
  const result = evaluateMoralTradePreferenceIntegrity(
    passingInput({
      bargainingProtocols: [],
      moralSideConstraintProfiles: [],
      transition: "release_gate_promotion",
    }),
  );

  assert.equal(result.status, "blocked");
  assert.ok(result.blockers.includes("bargaining_protocol_records_missing"));
  assert.ok(result.blockers.includes("moral_side_constraint_profile_records_missing"));
});

test("preference-integrity enforcement route fails closed on invalid JSON", async () => {
  const response = await enforcePreferenceIntegrity(
    new Request("http://localhost/api/moral-trade/preference-integrity/enforce", {
      body: "{",
      headers: { "content-type": "application/json" },
      method: "POST",
    }),
  );
  const body = await response.json();

  assert.equal(response.status, 400);
  assert.equal(body.ok, false);
  assert.equal(body.preferenceIntegrityGateStatus, "blocked");
  assert.equal(body.runtimeTransitionAllowed, false);
  assert.equal(body.matchedTradeLockAllowed, false);
  assert.equal(body.paymentAuthorizationAllowed, false);
  assert.equal(body.paymentCaptureAllowed, false);
  assert.equal(body.publicMetricPublicationAllowed, false);
  assert.equal(body.releaseGatePromotionAllowed, false);
  assert.equal(body.stateMutation, false);
  assert.deepEqual(body.blockers, ["invalid_json_body"]);
});

test("preference-integrity wiring covers API profile, rate limits, database tables, and migration schema", () => {
  const apiContractSource = readRepoFile("src/lib/moral-trade/api-contract.ts");
  const apiProfile = readRepoFile("config/moral-trade/api-contract-profile.json");
  const rateLimitSource = readRepoFile("src/lib/moral-trade/api-rate-limit.ts");
  const operationsSource = readRepoFile("src/lib/moral-trade/operations.ts");
  const operationsProfile = readRepoFile("config/moral-trade/operations-profile.json");
  const databaseTypes = readRepoFile("src/lib/supabase/database.types.ts");
  const migration = readRepoFile(
    "supabase/migrations/20260613_moral_trade_preference_integrity_records.sql",
  );
  const schema = readRepoFile("supabase/schema.sql");
  const releaseGates = readRepoFile("src/lib/moral-trade/release-gates.ts");

  assert.match(apiContractSource, /moral_trade_preference_integrity_contract/);
  assert.match(apiContractSource, /moral_trade_preference_integrity_enforce/);
  assert.match(apiProfile, /preference_integrity_contract_response/);
  assert.match(apiProfile, /preference_integrity_enforce_request/);
  assert.match(apiProfile, /preference_integrity_enforce_response/);
  assert.match(apiProfile, /preference_integrity_enforce_route_contract/);
  assert.match(rateLimitSource, /preference_integrity_enforce/);
  assert.match(operationsSource, /preference_integrity_enforce/);
  assert.match(operationsProfile, /"key": "preference_integrity_enforce"/);
  assert.match(databaseTypes, /moral_trade_option_set_comparison_records/);
  assert.match(databaseTypes, /moral_trade_preference_integrity_enforcement_records/);
  assert.match(migration, /create table if not exists public\.moral_trade_option_set_comparison_records/);
  assert.match(migration, /create table if not exists public\.moral_trade_preference_integrity_enforcement_records/);
  assert.match(migration, /public_cardinal_score_exposed_bool boolean not null default false/);
  assert.match(migration, /check \(public_exchange_rate_exposed_bool = false\)/);
  assert.match(migration, /check \(runtime_transition_allowed_bool = false\)/);
  assert.match(migration, /moral_trade_moral_side_constraint_profiles/);
  assert.match(schema, /moral_trade_preference_integrity_enforcement_records/);
  assert.match(schema, /moral_trade_intrapersonal_self_offset_records/);
  assert.match(releaseGates, /option_set_pareto_comparison_test/);
  assert.match(releaseGates, /preference_incomparability_noncardinal_test/);
  assert.match(releaseGates, /moral_side_constraint_agent_relative_test/);
});
