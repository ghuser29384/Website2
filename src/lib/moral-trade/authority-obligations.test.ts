import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

import { POST as enforceAuthorityObligations } from "@/app/api/moral-trade/authority-obligations/enforce/route";

import {
  evaluateMoralTradeAuthorityObligations,
  getMoralTradeAuthorityObligationContract,
  validateMoralTradeAuthorityObligationContract,
  type MoralTradeAuthorityObligationEvaluationInput,
} from "./authority-obligations";

const CHECKED_AT = "2026-06-13T12:00:00.000Z";

function readRepoFile(path: string) {
  return readFileSync(join(process.cwd(), path), "utf8");
}

function hashFor(seed: string) {
  return `sha256:${createHash("sha256").update(seed).digest("hex")}`;
}

function passingInput(
  overrides: Partial<MoralTradeAuthorityObligationEvaluationInput> = {},
): MoralTradeAuthorityObligationEvaluationInput {
  return {
    authorityObligationRequired: true,
    checkedAt: CHECKED_AT,
    records: [
      {
        affectedPartyClassRefs: ["affected-party:family", "affected-party:employer"],
        assessmentType: "third_party_obligation",
        authorityEvidenceHash: null,
        authorityScopeHash: null,
        conflictReviewState: "passed",
        createdAt: CHECKED_AT,
        disclosedToCounterparty: true,
        expiresAt: "2026-12-13T12:00:00.000Z",
        obligationsHash: hashFor("third-party-obligation"),
        participantConfirmationState: "confirmed",
        policySnapshotRef: "policy:authority-obligation:v1",
        recordId: "authority-obligation:third-party-test",
        recordState: "approved",
        representativePrincipalRef: null,
        reviewState: "passed",
        reviewerDecisionRef: "review:authority-obligation",
        standingReviewState: "passed",
        subjectRef: "pledge-swap:test",
        subjectType: "pledge_swap",
        supersededBy: null,
        updatedAt: CHECKED_AT,
      },
      {
        affectedPartyClassRefs: [],
        assessmentType: "representative_authority",
        authorityEvidenceHash: hashFor("authority-evidence"),
        authorityScopeHash: hashFor("authority-scope"),
        conflictReviewState: "passed",
        createdAt: CHECKED_AT,
        disclosedToCounterparty: true,
        expiresAt: "2026-12-13T12:00:00.000Z",
        obligationsHash: null,
        participantConfirmationState: "confirmed",
        policySnapshotRef: "policy:representative-authority:v1",
        recordId: "authority-obligation:representative-test",
        recordState: "approved",
        representativePrincipalRef: "principal:recipient-org",
        reviewState: "passed",
        reviewerDecisionRef: "review:representative-authority",
        standingReviewState: "passed",
        subjectRef: "recipient:controversial-offset-project",
        subjectType: "donation_offset",
        supersededBy: null,
        updatedAt: CHECKED_AT,
      },
    ],
    transition: "matched_trade_lock",
    ...overrides,
  };
}

test("authority/obligation contract validates third-party and representative gates", () => {
  const contract = getMoralTradeAuthorityObligationContract();
  const validation = validateMoralTradeAuthorityObligationContract(contract);

  assert.equal(validation.status, "pass");
  assert.deepEqual(validation.blockers, []);
  assert.ok(contract.firstClassRecordTables.includes("moral_trade_authority_obligation_assessments"));
  assert.ok(
    contract.firstClassRecordTables.includes(
      "moral_trade_authority_obligation_enforcement_records",
    ),
  );
  assert.ok(contract.policySnapshotSubjects.includes("third_party_obligation_assessment"));
  assert.ok(contract.policySnapshotSubjects.includes("representative_authority_assessment"));
  assert.ok(contract.releaseGateTestHooks.includes("third_party_obligation_assessment_test"));
  assert.ok(contract.releaseGateTestHooks.includes("representative_authority_verification_test"));
  assert.ok(contract.assessmentTypes.includes("third_party_obligation"));
  assert.ok(contract.assessmentTypes.includes("representative_authority"));
  assert.match(contract.thirdPartyObligationRule, /duties owed to nonparticipants/i);
  assert.match(contract.representativeAuthorityRule, /cannot bind another person/i);
  assert.ok(contract.sampleEvaluations.some((sample) => sample.status === "pass"));
  assert.ok(contract.sampleEvaluations.some((sample) => sample.status === "blocked"));
});

test("disclosed obligation and verified authority pass matched-trade lock", () => {
  const result = evaluateMoralTradeAuthorityObligations(passingInput());

  assert.equal(result.status, "pass");
  assert.equal(result.recordCount, 2);
  assert.equal(result.nonBlockingRecordCount, 2);
  assert.equal(result.thirdPartyObligationRecordCount, 1);
  assert.equal(result.representativeAuthorityRecordCount, 1);
  assert.equal(result.verifiedAuthorityRecordCount, 1);
  assert.equal(result.disclosedObligationRecordCount, 1);
  assert.deepEqual(result.blockers, []);
});

test("undisclosed obligations and unverified representative authority block reliance", () => {
  const result = evaluateMoralTradeAuthorityObligations(
    passingInput({
      records: [
        {
          ...passingInput().records[0],
          affectedPartyClassRefs: [],
          conflictReviewState: "disputed",
          disclosedToCounterparty: false,
          obligationsHash: null,
          participantConfirmationState: "under_review",
          reviewState: "under_review",
          standingReviewState: "blocked",
        },
        {
          ...passingInput().records[1],
          authorityEvidenceHash: null,
          authorityScopeHash: null,
          representativePrincipalRef: null,
        },
      ],
      transition: "reliance_bearing_transition",
    }),
  );

  assert.equal(result.status, "blocked");
  assert.ok(
    result.blockers.includes(
      "third_party_obligation_hash_missing:authority-obligation:third-party-test",
    ),
  );
  assert.ok(
    result.blockers.includes(
      "third_party_obligation_affected_party_scope_missing:authority-obligation:third-party-test",
    ),
  );
  assert.ok(
    result.blockers.includes(
      "third_party_obligation_not_disclosed:authority-obligation:third-party-test",
    ),
  );
  assert.ok(
    result.blockers.includes(
      "authority_obligation_conflict_review_not_non_blocking:authority-obligation:third-party-test:disputed",
    ),
  );
  assert.ok(
    result.blockers.includes(
      "authority_obligation_standing_review_not_non_blocking:authority-obligation:third-party-test:blocked",
    ),
  );
  assert.ok(
    result.blockers.includes(
      "authority_obligation_participant_confirmation_not_ready:authority-obligation:third-party-test:under_review",
    ),
  );
  assert.ok(
    result.blockers.includes(
      "representative_authority_scope_hash_missing:authority-obligation:representative-test",
    ),
  );
  assert.ok(
    result.blockers.includes(
      "representative_authority_principal_missing:authority-obligation:representative-test",
    ),
  );
  assert.ok(
    result.blockers.includes(
      "representative_authority_evidence_hash_missing:authority-obligation:representative-test",
    ),
  );
});

test("authority/obligation enforcement route fails closed on invalid JSON", async () => {
  const response = await enforceAuthorityObligations(
    new Request("http://localhost/api/moral-trade/authority-obligations/enforce", {
      body: "{",
      headers: { "content-type": "application/json" },
      method: "POST",
    }),
  );
  const body = await response.json();

  assert.equal(response.status, 400);
  assert.equal(body.ok, false);
  assert.equal(body.authorityObligationGateStatus, "blocked");
  assert.equal(body.matchedTradeLockAllowed, false);
  assert.equal(body.paymentCaptureAllowed, false);
  assert.equal(body.performanceStartAllowed, false);
  assert.equal(body.relianceBearingTransitionAllowed, false);
  assert.equal(body.publicMetricPublicationAllowed, false);
  assert.equal(body.releaseGatePromotionAllowed, false);
  assert.equal(body.authorityDelegationAccepted, false);
  assert.equal(body.thirdPartyObligationTransferAllowed, false);
  assert.equal(body.stateMutation, false);
  assert.deepEqual(body.blockers, ["invalid_json_body"]);
});

test("authority/obligation wiring covers API profile, rate limits, database tables, and schema", () => {
  const apiContractSource = readRepoFile("src/lib/moral-trade/api-contract.ts");
  const apiProfile = readRepoFile("config/moral-trade/api-contract-profile.json");
  const rateLimitSource = readRepoFile("src/lib/moral-trade/api-rate-limit.ts");
  const operationsSource = readRepoFile("src/lib/moral-trade/operations.ts");
  const operationsProfile = readRepoFile("config/moral-trade/operations-profile.json");
  const databaseTypes = readRepoFile("src/lib/supabase/database.types.ts");
  const migration = readRepoFile(
    "supabase/migrations/20260613_moral_trade_authority_obligation_enforcement_records.sql",
  );
  const schema = readRepoFile("supabase/schema.sql");
  const releaseGates = readRepoFile("src/lib/moral-trade/release-gates.ts");

  assert.match(apiContractSource, /moral_trade_authority_obligation_contract/);
  assert.match(apiContractSource, /moral_trade_authority_obligation_enforce/);
  assert.match(apiProfile, /authority_obligation_contract_response/);
  assert.match(apiProfile, /authority_obligation_enforce_request/);
  assert.match(apiProfile, /authority_obligation_enforce_response/);
  assert.match(apiProfile, /authority_obligation_enforce_route_contract/);
  assert.match(rateLimitSource, /authority_obligation_enforce/);
  assert.match(operationsSource, /authority_obligation_enforce/);
  assert.match(operationsProfile, /"key": "authority_obligation_enforce"/);
  assert.match(databaseTypes, /moral_trade_authority_obligation_assessments/);
  assert.match(databaseTypes, /moral_trade_authority_obligation_enforcement_records/);
  assert.match(migration, /create table if not exists public\.moral_trade_authority_obligation_enforcement_records/);
  assert.match(migration, /check \(authority_delegation_accepted_bool = false\)/);
  assert.match(migration, /check \(third_party_obligation_transfer_allowed_bool = false\)/);
  assert.match(schema, /moral_trade_authority_obligation_assessments/);
  assert.match(schema, /moral_trade_authority_obligation_enforcement_records/);
  assert.match(releaseGates, /third_party_obligation_assessment_test/);
  assert.match(releaseGates, /representative_authority_verification_test/);
});
