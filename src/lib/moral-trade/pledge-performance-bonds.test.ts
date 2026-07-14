import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

import { POST as enforcePledgePerformanceBond } from "@/app/api/moral-trade/pledge-performance-bonds/enforce/route";

import {
  evaluateMoralTradePledgePerformanceBonds,
  getMoralTradePledgePerformanceBondContract,
  validateMoralTradePledgePerformanceBondContract,
  type MoralTradePledgePerformanceBondEvaluationInput,
} from "./pledge-performance-bonds";

const CHECKED_AT = "2026-06-13T12:00:00.000Z";

function readRepoFile(path: string) {
  return readFileSync(join(process.cwd(), path), "utf8");
}

function hashFor(seed: string) {
  return `sha256:${createHash("sha256").update(seed).digest("hex")}`;
}

function passingInput(
  overrides: Partial<MoralTradePledgePerformanceBondEvaluationInput> = {},
): MoralTradePledgePerformanceBondEvaluationInput {
  return {
    checkedAt: CHECKED_AT,
    performanceBondRequired: true,
    policies: [
      {
        allowedReleaseStages: [
          "matched_trade_lock",
          "payment_authorization",
          "payment_capture",
          "performance_release",
          "forfeiture_decision",
          "public_metric_publication",
          "release_gate_promotion",
        ],
        appliesTo: "pledge_swap",
        challengeWindowPolicyRef: "policy:challenge-window:v1",
        counterpartyBenefitFromForfeitureAllowed: true,
        createdAt: CHECKED_AT,
        evidenceStandardRef: "policy:evidence-standard:v1",
        forfeitureConditionPolicyRef: "policy:forfeiture:v1",
        forfeitureDestinationPolicy: "counterparty_only_if_approved",
        highStakesOrIrreversibleActionBehavior: "preview_only",
        maxBondCents: 50000,
        minBondCents: 500,
        neutralReviewRequiredForForfeiture: true,
        noEscrowClaimDisclaimerRequired: true,
        policyId: "pledge-performance-bond-policy:lock",
        policyVersion: "pledge-performance-bond-policy-v1",
        postingMode: "authorization_only",
        refundPolicyRef: "policy:refund:v1",
        returnConditionPolicyRef: "policy:return:v1",
        reviewerDecisionRef: "review:bond-policy",
        settlementCurrency: "USD",
        updatedAt: CHECKED_AT,
      },
    ],
    records: [
      {
        agreementTransferabilityAssessmentRef: "assessment:transferability",
        bondAmountCents: 10000,
        bondState: "authorized",
        challengeWindowPolicyRef: "policy:challenge-window:v1",
        challengeWindowState: "open",
        clearedTradeAgreementRef: null,
        counterpartyBenefitFromForfeitureState: "possible",
        createdAt: CHECKED_AT,
        cyberAbuseDigitalSystemsIntegrityAssessmentRef: "assessment:cyber",
        cyberAbuseReviewState: "not_required",
        digitalSystemsIntegrityReviewState: "not_required",
        evidenceDueAt: "2026-07-13T00:00:00.000Z",
        evidenceRecordRefs: ["evidence:performance"],
        forfeitureConditionSummaryHash: hashFor("forfeiture-condition"),
        forfeitureDestinationRef: "destination:neutral-reviewed",
        hazardousActivityReviewState: "not_required",
        matchedTradeLockProposalRef: "matched-lock:demo",
        neutralReviewRequired: true,
        participantIdHash: hashFor("participant"),
        paymentAuthorizationEventRef: "payment-authorization:bond",
        pledgePerformanceBondPolicyRef: "pledge-performance-bond-policy:lock",
        pledgeSwapOfferId: "pledge-swap:demo",
        postingMode: "authorization_only",
        recordId: "pledge-performance-bond:lock",
        refundPolicyRef: "policy:refund:v1",
        regulatedGoodsHazardousActivityAssessmentRef: "assessment:hazardous",
        regulatedGoodsReviewState: "not_required",
        returnConditionSummaryHash: hashFor("return-condition"),
        reviewerDecisionRef: "review:bond-record",
        settlementCurrency: "USD",
        transferabilityReviewState: "non_blocking",
        updatedAt: CHECKED_AT,
      },
    ],
    transition: "forfeiture_decision",
    ...overrides,
  };
}

test("pledge-performance-bond contract validates neutral-forfeiture hooks and infrastructure", () => {
  const contract = getMoralTradePledgePerformanceBondContract();
  const validation = validateMoralTradePledgePerformanceBondContract(contract);

  assert.equal(validation.status, "pass");
  assert.deepEqual(validation.blockers, []);
  assert.ok(contract.firstClassRecordTables.includes("moral_trade_pledge_performance_bond_policies"));
  assert.ok(contract.firstClassRecordTables.includes("moral_trade_pledge_performance_bond_records"));
  assert.ok(contract.firstClassRecordTables.includes("moral_trade_pledge_performance_bond_enforcement_records"));
  assert.ok(contract.existingInfrastructureTables.includes("performance_bonds"));
  assert.ok(contract.releaseGateTestHooks.includes("pledge_performance_bond_neutral_forfeiture_test"));
  assert.match(contract.neutralForfeitureRule, /final judge/i);
  assert.match(contract.noEscrowNoReputationRule, /not an escrow/i);
  assert.ok(contract.sampleEvaluations.some((sample) => sample.status === "pass"));
  assert.ok(contract.sampleEvaluations.some((sample) => sample.status === "blocked"));
});

test("frozen authorized pledge-performance-bond passes forfeiture decision gate", () => {
  const result = evaluateMoralTradePledgePerformanceBonds(passingInput());

  assert.equal(result.status, "pass");
  assert.equal(result.policyCount, 1);
  assert.equal(result.recordCount, 1);
  assert.equal(result.nonBlockingRecordCount, 1);
  assert.equal(result.neutralReviewRequiredCount, 1);
  assert.equal(result.counterpartyBenefitRecordCount, 1);
  assert.deepEqual(result.blockers, []);
});

test("counterparty-benefiting forfeiture without neutral review fails closed", () => {
  const result = evaluateMoralTradePledgePerformanceBonds(
    passingInput({
      records: [
        {
          ...passingInput().records[0],
          counterpartyBenefitFromForfeitureState: "direct",
          neutralReviewRequired: false,
          reviewerDecisionRef: null,
        },
      ],
    }),
  );

  assert.equal(result.status, "blocked");
  assert.ok(
    result.blockers.includes(
      "pledge_performance_bond_counterparty_benefit_without_neutral_review:pledge-performance-bond:lock",
    ),
  );
  assert.ok(
    result.blockers.includes(
      "pledge_performance_bond_forfeiture_without_neutral_review:pledge-performance-bond:lock",
    ),
  );
  assert.ok(
    result.blockers.includes(
      "pledge_performance_bond_forfeiture_reviewer_decision_missing:pledge-performance-bond:lock",
    ),
  );
});

test("payment capture blocks unfrozen posting and protective-review states", () => {
  const result = evaluateMoralTradePledgePerformanceBonds(
    passingInput({
      records: [
        {
          ...passingInput().records[0],
          bondState: "previewed",
          paymentAuthorizationEventRef: null,
          regulatedGoodsReviewState: "under_review",
          transferabilityReviewState: "blocked",
        },
      ],
      transition: "payment_capture",
    }),
  );

  assert.equal(result.status, "blocked");
  assert.ok(result.blockers.includes("pledge_performance_bond_not_authorized:pledge-performance-bond:lock:previewed"));
  assert.ok(result.blockers.includes("pledge_performance_bond_payment_authorization_missing:pledge-performance-bond:lock"));
  assert.ok(result.blockers.includes("pledge_performance_bond_transferability_review_blocking:pledge-performance-bond:lock:blocked"));
  assert.ok(result.blockers.includes("pledge_performance_bond_regulated_goods_review_blocking:pledge-performance-bond:lock:under_review"));
});

test("pledge-performance-bond enforcement route fails closed on invalid JSON", async () => {
  const response = await enforcePledgePerformanceBond(
    new Request("http://localhost/api/moral-trade/pledge-performance-bonds/enforce", {
      body: "{",
      headers: { "content-type": "application/json" },
      method: "POST",
    }),
  );
  const body = await response.json();

  assert.equal(response.status, 400);
  assert.equal(body.ok, false);
  assert.equal(body.performanceBondGateStatus, "blocked");
  assert.equal(body.runtimeTransitionAllowed, false);
  assert.equal(body.matchedTradeLockAllowed, false);
  assert.equal(body.paymentAuthorizationAllowed, false);
  assert.equal(body.paymentCaptureAllowed, false);
  assert.equal(body.performanceReleaseAllowed, false);
  assert.equal(body.forfeitureDecisionAllowed, false);
  assert.equal(body.publicMetricPublicationAllowed, false);
  assert.equal(body.releaseGatePromotionAllowed, false);
  assert.equal(body.stateMutation, false);
  assert.deepEqual(body.blockers, ["invalid_json_body"]);
});

test("pledge-performance-bond wiring covers API profile, rate limits, database tables, and schema", () => {
  const apiContractSource = readRepoFile("src/lib/moral-trade/api-contract.ts");
  const apiProfile = readRepoFile("config/moral-trade/api-contract-profile.json");
  const rateLimitSource = readRepoFile("src/lib/moral-trade/api-rate-limit.ts");
  const operationsSource = readRepoFile("src/lib/moral-trade/operations.ts");
  const operationsProfile = readRepoFile("config/moral-trade/operations-profile.json");
  const databaseTypes = readRepoFile("src/lib/supabase/database.types.ts");
  const migration = readRepoFile(
    "supabase/migrations/20260613_moral_trade_pledge_performance_bond_records.sql",
  );
  const schema = readRepoFile("supabase/schema.sql");
  const releaseGates = readRepoFile("src/lib/moral-trade/release-gates.ts");

  assert.match(apiContractSource, /moral_trade_pledge_performance_bond_contract/);
  assert.match(apiContractSource, /moral_trade_pledge_performance_bond_enforce/);
  assert.match(apiProfile, /pledge_performance_bond_contract_response/);
  assert.match(apiProfile, /pledge_performance_bond_enforce_request/);
  assert.match(apiProfile, /pledge_performance_bond_enforce_response/);
  assert.match(apiProfile, /pledge_performance_bond_enforce_route_contract/);
  assert.match(rateLimitSource, /pledge_performance_bond_enforce/);
  assert.match(operationsSource, /pledge_performance_bond_enforce/);
  assert.match(operationsProfile, /"key": "pledge_performance_bond_enforce"/);
  assert.match(databaseTypes, /moral_trade_pledge_performance_bond_policies/);
  assert.match(databaseTypes, /moral_trade_pledge_performance_bond_records/);
  assert.match(databaseTypes, /moral_trade_pledge_performance_bond_enforcement_records/);
  assert.match(migration, /create table if not exists public\.moral_trade_pledge_performance_bond_policies/);
  assert.match(migration, /create table if not exists public\.moral_trade_pledge_performance_bond_records/);
  assert.match(migration, /create table if not exists public\.moral_trade_pledge_performance_bond_enforcement_records/);
  assert.match(migration, /'pledge_performance_bond'/);
  assert.match(migration, /check \(no_escrow_claim_disclaimer_required_bool = true\)/);
  assert.match(migration, /check \(forfeiture_decision_allowed_bool = false\)/);
  assert.match(schema, /moral_trade_pledge_performance_bond_enforcement_records/);
  assert.match(schema, /moral_trade_pledge_performance_bond_policies/);
  assert.match(releaseGates, /pledge_performance_bond_neutral_forfeiture_test/);
});
