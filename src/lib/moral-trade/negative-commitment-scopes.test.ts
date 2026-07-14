import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

import { POST as enforceNegativeCommitmentScope } from "@/app/api/moral-trade/negative-commitment-scopes/enforce/route";

import {
  evaluateMoralTradeNegativeCommitmentScopes,
  getMoralTradeNegativeCommitmentScopeContract,
  validateMoralTradeNegativeCommitmentScopeContract,
  type MoralTradeNegativeCommitmentScopeEvaluationInput,
} from "./negative-commitment-scopes";

const CHECKED_AT = "2026-06-13T12:00:00.000Z";

function readRepoFile(path: string) {
  return readFileSync(join(process.cwd(), path), "utf8");
}

function hashFor(seed: string) {
  return `sha256:${createHash("sha256").update(seed).digest("hex")}`;
}

function passingInput(
  overrides: Partial<MoralTradeNegativeCommitmentScopeEvaluationInput> = {},
): MoralTradeNegativeCommitmentScopeEvaluationInput {
  return {
    checkedAt: CHECKED_AT,
    negativeCommitmentScopeRequired: true,
    scopes: [
      {
        abstentionConfidenceState: "high",
        compromiseDonationProofTreatedAsAbstentionProof: false,
        coveredActionBucketRef: "action-bucket:opposed-donation",
        coveredActionDescriptionHash: hashFor("opposed-donation-abstention"),
        createdAt: CHECKED_AT,
        deMinimisExclusionRule:
          "Excludes accidental de minimis conduct below the frozen threshold.",
        evidenceStandardRef: "evidence-standard:abstention:v1",
        expiresAt: "2026-12-13T12:00:00.000Z",
        knownAffiliateOrSubstituteRefs: [
          "substitute-channel:known-affiliate",
          "substitute-channel:alternative-fund",
        ],
        leastIntrusiveEvidencePlanRef: "attestation-plan:least-intrusive",
        negativeCommitmentType: "opposed_donation_abstention",
        policySnapshotRef: "policy:negative-commitment-scope:v1",
        rawPrivateEvidenceRequiredFromCounterparty: false,
        recordId: "negative-commitment-scope:test",
        reviewerDecisionRef: "review:negative-commitment-scope",
        scopeState: "completed",
        subjectRef: "pledge-swap:test",
        subjectType: "pledge_swap",
        substitutesReviewed: true,
        substitutionChannelReviewState: "non_blocking",
        supersededBy: null,
        timeWindowEndAt: "2026-07-13T00:00:00.000Z",
        timeWindowStartAt: "2026-06-13T00:00:00.000Z",
        updatedAt: CHECKED_AT,
      },
    ],
    transition: "completion_count",
    ...overrides,
  };
}

test("negative-commitment scope contract validates substitution and evidence separation", () => {
  const contract = getMoralTradeNegativeCommitmentScopeContract();
  const validation = validateMoralTradeNegativeCommitmentScopeContract(contract);

  assert.equal(validation.status, "pass");
  assert.deepEqual(validation.blockers, []);
  assert.ok(contract.firstClassRecordTables.includes("moral_trade_negative_commitment_scopes"));
  assert.ok(
    contract.firstClassRecordTables.includes(
      "moral_trade_negative_commitment_scope_enforcement_records",
    ),
  );
  assert.ok(contract.policySnapshotSubjects.includes("negative_commitment_scope"));
  assert.ok(contract.policySnapshotSubjects.includes("evidence_standard"));
  assert.ok(contract.releaseGateTestHooks.includes("negative_commitment_substitution_test"));
  assert.match(contract.substitutionRule, /do not prove abstention/i);
  assert.match(contract.evidenceSeparationRule, /separate claim/i);
  assert.match(contract.privacyRule, /raw private evidence/i);
  assert.ok(contract.sampleEvaluations.some((sample) => sample.status === "pass"));
  assert.ok(contract.sampleEvaluations.some((sample) => sample.status === "blocked"));
});

test("bounded high-confidence negative commitment passes completion count", () => {
  const result = evaluateMoralTradeNegativeCommitmentScopes(passingInput());

  assert.equal(result.status, "pass");
  assert.equal(result.scopeCount, 1);
  assert.equal(result.boundedScopeCount, 1);
  assert.equal(result.highConfidenceScopeCount, 1);
  assert.equal(result.substitutionReviewedScopeCount, 1);
  assert.deepEqual(result.blockers, []);
});

test("gross donation proof and unreviewed substitutes block public metrics", () => {
  const result = evaluateMoralTradeNegativeCommitmentScopes(
    passingInput({
      scopes: [
        {
          ...passingInput().scopes[0],
          abstentionConfidenceState: "low",
          compromiseDonationProofTreatedAsAbstentionProof: true,
          leastIntrusiveEvidencePlanRef: "",
          rawPrivateEvidenceRequiredFromCounterparty: true,
          scopeState: "active",
          substitutesReviewed: false,
          substitutionChannelReviewState: "under_review",
        },
      ],
      transition: "public_metric_publication",
    }),
  );

  assert.equal(result.status, "blocked");
  assert.ok(
    result.blockers.includes(
      "negative_commitment_substitutes_not_reviewed:negative-commitment-scope:test",
    ),
  );
  assert.ok(
    result.blockers.includes(
      "negative_commitment_abstention_confidence_not_sufficient:negative-commitment-scope:test:low",
    ),
  );
  assert.ok(
    result.blockers.includes(
      "negative_commitment_high_confidence_required:negative-commitment-scope:test:low",
    ),
  );
  assert.ok(
    result.blockers.includes(
      "compromise_donation_proof_misused_as_abstention_proof:negative-commitment-scope:test",
    ),
  );
  assert.ok(
    result.blockers.includes(
      "negative_commitment_raw_private_evidence_required:negative-commitment-scope:test",
    ),
  );
  assert.ok(
    result.blockers.includes(
      "negative_commitment_scope_not_completion_ready:negative-commitment-scope:test:active",
    ),
  );
});

test("negative-commitment scope enforcement route fails closed on invalid JSON", async () => {
  const response = await enforceNegativeCommitmentScope(
    new Request("http://localhost/api/moral-trade/negative-commitment-scopes/enforce", {
      body: "{",
      headers: { "content-type": "application/json" },
      method: "POST",
    }),
  );
  const body = await response.json();

  assert.equal(response.status, 400);
  assert.equal(body.ok, false);
  assert.equal(body.negativeCommitmentScopeGateStatus, "blocked");
  assert.equal(body.matchedTradeLockAllowed, false);
  assert.equal(body.paymentCaptureAllowed, false);
  assert.equal(body.relianceBearingTransitionAllowed, false);
  assert.equal(body.abstentionEvidenceAccepted, false);
  assert.equal(body.completionCountAllowed, false);
  assert.equal(body.publicMetricPublicationAllowed, false);
  assert.equal(body.releaseGatePromotionAllowed, false);
  assert.equal(body.stateMutation, false);
  assert.deepEqual(body.blockers, ["invalid_json_body"]);
});

test("negative-commitment scope wiring covers API profile, rate limits, database tables, and schema", () => {
  const apiContractSource = readRepoFile("src/lib/moral-trade/api-contract.ts");
  const apiProfile = readRepoFile("config/moral-trade/api-contract-profile.json");
  const rateLimitSource = readRepoFile("src/lib/moral-trade/api-rate-limit.ts");
  const operationsSource = readRepoFile("src/lib/moral-trade/operations.ts");
  const operationsProfile = readRepoFile("config/moral-trade/operations-profile.json");
  const databaseTypes = readRepoFile("src/lib/supabase/database.types.ts");
  const migration = readRepoFile(
    "supabase/migrations/20260613_moral_trade_negative_commitment_scope_enforcement_records.sql",
  );
  const schema = readRepoFile("supabase/schema.sql");
  const releaseGates = readRepoFile("src/lib/moral-trade/release-gates.ts");

  assert.match(apiContractSource, /moral_trade_negative_commitment_scope_contract/);
  assert.match(apiContractSource, /moral_trade_negative_commitment_scope_enforce/);
  assert.match(apiProfile, /negative_commitment_scope_contract_response/);
  assert.match(apiProfile, /negative_commitment_scope_enforce_request/);
  assert.match(apiProfile, /negative_commitment_scope_enforce_response/);
  assert.match(apiProfile, /negative_commitment_scope_enforce_route_contract/);
  assert.match(rateLimitSource, /negative_commitment_scope_enforce/);
  assert.match(operationsSource, /negative_commitment_scope_enforce/);
  assert.match(operationsProfile, /"key": "negative_commitment_scope_enforce"/);
  assert.match(databaseTypes, /moral_trade_negative_commitment_scopes/);
  assert.match(databaseTypes, /moral_trade_negative_commitment_scope_enforcement_records/);
  assert.match(migration, /create table if not exists public\.moral_trade_negative_commitment_scope_enforcement_records/);
  assert.match(migration, /check \(matched_trade_lock_allowed_bool = false\)/);
  assert.match(migration, /check \(abstention_evidence_accepted_bool = false\)/);
  assert.match(schema, /moral_trade_negative_commitment_scopes/);
  assert.match(schema, /moral_trade_negative_commitment_scope_enforcement_records/);
  assert.match(releaseGates, /negative_commitment_substitution_test/);
});
