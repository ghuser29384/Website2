import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

import { POST as enforceParticipantEligibility } from "@/app/api/moral-trade/participant-eligibility/enforce/route";

import {
  evaluateMoralTradeParticipantEligibility,
  getMoralTradeParticipantEligibilityContract,
  validateMoralTradeParticipantEligibilityContract,
  type MoralTradeParticipantEligibilityPolicySnapshotStatus,
  type MoralTradeParticipantEligibilityRecord,
  type MoralTradeParticipantEligibilityStatus,
} from "./participant-eligibility";

function readRepoFile(path: string) {
  return readFileSync(join(process.cwd(), path), "utf8");
}

function hashFor(seed: string) {
  return `sha256:${createHash("sha256").update(seed).digest("hex")}`;
}

function record(
  overrides: Partial<MoralTradeParticipantEligibilityRecord> = {},
): MoralTradeParticipantEligibilityRecord {
  return {
    participantId: "profile:test",
    eligibilityRecordId: "eligibility:test",
    identityVerificationStatus: "eligible",
    humanUniquenessSybilStatus: "eligible",
    legalCapacityStatus: "eligible",
    sanctionsScreeningStatus: "eligible",
    paymentRailEligibilityStatus: "eligible",
    jurisdictionalEligibilityStatus: "eligible",
    sourceAuthenticationStatus: "eligible",
    rawIdentityArtifactHandlingStatus: "eligible",
    policySnapshotStatus: "resolved_immutable",
    evidenceHash: hashFor("eligibility:test"),
    identityArtifactRefHash: hashFor("artifact:test"),
    reviewedAt: "2026-06-07T12:00:00.000Z",
    expiresAt: "2026-12-07T12:00:00.000Z",
    identityArtifactsPubliclyExposed: false,
    moralWorthScorePublished: false,
    ...overrides,
  };
}

test("participant-eligibility contract validates first-class private eligibility coverage", () => {
  const contract = getMoralTradeParticipantEligibilityContract();
  const validation = validateMoralTradeParticipantEligibilityContract(contract);

  assert.equal(validation.status, "pass");
  assert.deepEqual(validation.blockers, []);
  assert.ok(contract.firstClassRecordTables.includes("moral_trade_participant_eligibility_records"));
  assert.ok(contract.firstClassRecordTables.includes("moral_trade_participant_eligibility_reviews"));
  assert.ok(contract.firstClassRecordTables.includes("moral_trade_identity_artifact_references"));
  assert.ok(contract.policySnapshotSubjects.includes("participant_eligibility"));
  assert.ok(contract.reviewDimensions.includes("identity_verification"));
  assert.ok(contract.reviewDimensions.includes("human_uniqueness_sybil"));
  assert.ok(contract.reviewDimensions.includes("legal_capacity"));
  assert.ok(contract.reviewDimensions.includes("sanctions_screening"));
  assert.ok(contract.reviewDimensions.includes("payment_rail_eligibility"));
  assert.ok(contract.reviewDimensions.includes("jurisdictional_eligibility"));
  assert.ok(contract.reviewDimensions.includes("source_authentication"));
  assert.ok(contract.reviewDimensions.includes("raw_identity_artifact_handling"));
  assert.match(contract.privacyRule, /moral-worth score/);
  assert.ok(contract.sampleEvaluations.some((sample) => sample.transition === "non_money_preview" && sample.status === "pass"));
  assert.ok(contract.sampleEvaluations.some((sample) => sample.transition === "payment_capture" && sample.status === "pass"));
  assert.ok(contract.sampleEvaluations.some((sample) => sample.transition === "matching_clearing" && sample.status === "blocked"));
});

test("real-money capture blocks missing or unverified eligibility dimensions", () => {
  const pass = evaluateMoralTradeParticipantEligibility({
    transition: "payment_capture",
    checkedAt: "2026-06-07T12:00:00.000Z",
    records: [record()],
  });

  assert.equal(pass.status, "pass");
  assert.deepEqual(pass.blockers, []);

  const missing = evaluateMoralTradeParticipantEligibility({
    transition: "payment_capture",
    checkedAt: "2026-06-07T12:00:00.000Z",
    records: [],
  });

  assert.equal(missing.status, "blocked");
  assert.ok(missing.blockers.includes("participant_eligibility_record_required"));

  const blocked = evaluateMoralTradeParticipantEligibility({
    transition: "payment_capture",
    checkedAt: "2026-06-07T12:00:00.000Z",
    records: [
      record({
        identityVerificationStatus: "identity_unverified",
        sanctionsScreeningStatus: "sanctions_potential_match",
        paymentRailEligibilityStatus: "payment_rail_blocked",
        jurisdictionalEligibilityStatus: "jurisdiction_blocked",
      }),
    ],
  });

  assert.equal(blocked.status, "blocked");
  assert.ok(blocked.blockers.includes("participant_eligibility_dimension_not_eligible:identity_verification:identity_unverified"));
  assert.ok(blocked.blockers.includes("participant_eligibility_dimension_not_eligible:sanctions_screening:sanctions_potential_match"));
  assert.ok(blocked.blockers.includes("participant_eligibility_dimension_not_eligible:payment_rail_eligibility:payment_rail_blocked"));
  assert.ok(blocked.blockers.includes("participant_eligibility_dimension_not_eligible:jurisdictional_eligibility:jurisdiction_blocked"));
  assert.deepEqual(blocked.userFacingBlockerCategories, [
    "Participant eligibility needs review before capture",
  ]);
});

test("counted support blocks Sybil risk and public moral-reputation misuse", () => {
  const countedSupport = evaluateMoralTradeParticipantEligibility({
    transition: "counted_support",
    checkedAt: "2026-06-07T12:00:00.000Z",
    records: [
      record({
        humanUniquenessSybilStatus: "sybil_risk",
        moralWorthScorePublished: true,
      }),
    ],
  });

  assert.equal(countedSupport.status, "blocked");
  assert.ok(countedSupport.blockers.includes("participant_eligibility_dimension_not_eligible:human_uniqueness_sybil:sybil_risk"));
  assert.ok(countedSupport.blockers.includes("eligibility_used_as_moral_worth_score:profile:test"));

  const preview = evaluateMoralTradeParticipantEligibility({
    transition: "non_money_preview",
    checkedAt: "2026-06-07T12:00:00.000Z",
    records: [],
  });

  assert.equal(preview.status, "pass");
  assert.equal(preview.requiredRecordCount, 0);
});

test("stale, expired, mutable, source-unauthenticated, and public-artifact records fail closed", () => {
  const evaluate = (
    overrides: Partial<MoralTradeParticipantEligibilityRecord>,
  ) =>
    evaluateMoralTradeParticipantEligibility({
      transition: "release_gate_promotion",
      checkedAt: "2026-06-07T12:00:00.000Z",
      records: [record(overrides)],
    });

  const mutable = evaluate({
    policySnapshotStatus: "mutable" as MoralTradeParticipantEligibilityPolicySnapshotStatus,
  });
  assert.ok(
    mutable.blockers.includes(
      "participant_eligibility_policy_snapshot_not_immutable:mutable",
    ),
  );

  const stale = evaluate({ reviewedAt: "2025-01-01T12:00:00.000Z" });
  assert.ok(stale.blockers.includes("stale_participant_eligibility_review:profile:test"));

  const expired = evaluate({ expiresAt: "2026-01-01T12:00:00.000Z" });
  assert.ok(expired.blockers.includes("expired_participant_eligibility_review:profile:test"));

  const sourceUnauthenticated = evaluate({
    sourceAuthenticationStatus: "source_unauthenticated" as MoralTradeParticipantEligibilityStatus,
  });
  assert.ok(
    sourceUnauthenticated.blockers.includes(
      "participant_eligibility_dimension_not_eligible:source_authentication:source_unauthenticated",
    ),
  );

  const publicArtifact = evaluate({ identityArtifactsPubliclyExposed: true });
  assert.ok(publicArtifact.blockers.includes("identity_artifacts_publicly_exposed:profile:test"));

  const brokenHash = evaluate({
    evidenceHash: "sha256:broken",
    identityArtifactRefHash: "sha256:also-broken",
  });
  assert.ok(brokenHash.blockers.includes("invalid_participant_eligibility_hash:eligibility:test"));
  assert.ok(brokenHash.blockers.includes("invalid_identity_artifact_ref_hash:profile:test"));
});

test("participant-eligibility enforcement rejects invalid JSON without state mutation", async () => {
  const response = await enforceParticipantEligibility(
    new Request("http://localhost/api/moral-trade/participant-eligibility/enforce", {
      method: "POST",
      body: "{",
    }),
  );
  const body = await response.json();

  assert.equal(response.status, 400);
  assert.equal(response.headers.get("Cache-Control"), "private, no-store");
  assert.equal(body.ok, false);
  assert.equal(body.participantEligibilityGateStatus, "blocked");
  assert.equal(body.countedSupportAllowed, false);
  assert.equal(body.matchingClearingAllowed, false);
  assert.equal(body.matchedTradeLockAllowed, false);
  assert.equal(body.paymentAuthorizationAllowed, false);
  assert.equal(body.paymentCaptureAllowed, false);
  assert.equal(body.payoutReleaseAllowed, false);
  assert.equal(body.relianceBearingAgreementAllowed, false);
  assert.equal(body.publicSupportMetricReleaseAllowed, false);
  assert.equal(body.releaseGatePromotionAllowed, false);
  assert.equal(body.stateMutation, false);
  assert.deepEqual(body.blockers, ["invalid_json_body"]);
  assert.deepEqual(body.persistence, {
    requested: true,
    status: "not_recorded",
    recordId: null,
    table: "moral_trade_participant_eligibility_enforcement_records",
  });
  assert.equal(body.contractValidation.status, "pass");
});

test("participant-eligibility route, health, technical spec, API contract, and migration are wired", () => {
  const source = readRepoFile("src/lib/moral-trade/participant-eligibility.ts");
  const route = readRepoFile("src/app/api/moral-trade/participant-eligibility/contract/route.ts");
  const enforceRoute = readRepoFile("src/app/api/moral-trade/participant-eligibility/enforce/route.ts");
  const health = readRepoFile("src/app/api/moral-trade/health/route.ts");
  const spec = readRepoFile("src/app/moral-trade/technical-spec/page.tsx");
  const apiContract = readRepoFile("config/moral-trade/api-contract-profile.json");
  const apiContractSource = readRepoFile("src/lib/moral-trade/api-contract.ts");
  const apiRateLimit = readRepoFile("src/lib/moral-trade/api-rate-limit.ts");
  const operations = readRepoFile("src/lib/moral-trade/operations.ts");
  const operationsProfile = readRepoFile("config/moral-trade/operations-profile.json");
  const migration = readRepoFile(
    "supabase/migrations/20260607_zzzzz_moral_trade_participant_eligibility_records.sql",
  );
  const enforcementMigration = readRepoFile(
    "supabase/migrations/20260613_moral_trade_participant_eligibility_enforcement_records.sql",
  );
  const schema = readRepoFile("supabase/schema.sql");
  const databaseTypes = readRepoFile("src/lib/supabase/database.types.ts");

  assert.match(source, /moral_trade_participant_eligibility_records/);
  assert.match(source, /moral_trade_identity_artifact_references/);
  assert.match(source, /moral-worth score/);
  assert.match(route, /getMoralTradeParticipantEligibilityContract/);
  assert.match(route, /participantEligibilitySampleEvaluationStatuses/);
  assert.match(enforceRoute, /participant_eligibility_enforce/);
  assert.match(enforceRoute, /moral_trade_participant_eligibility_enforcement_records/);
  assert.match(enforceRoute, /paymentCaptureAllowed: false/);
  assert.match(enforceRoute, /releaseGatePromotionAllowed: false/);
  assert.match(enforceRoute, /supabase_unconfigured:participant_eligibility_enforce/);
  assert.match(enforceRoute, /authentication_required:participant_eligibility_enforce/);
  assert.match(health, /participantEligibilityValidation/);
  assert.match(health, /participantEligibilityFirstClassRecordTables/);
  assert.match(spec, /Participant eligibility contract/);
  assert.match(spec, /participant-eligibility\/contract/);
  assert.match(apiContract, /moral_trade_participant_eligibility_contract/);
  assert.match(apiContract, /participant_eligibility_contract_response/);
  assert.match(apiContract, /moral_trade_participant_eligibility_enforce/);
  assert.match(apiContract, /participant_eligibility_enforce_request/);
  assert.match(apiContract, /participant_eligibility_enforce_response/);
  assert.match(apiContract, /participant_eligibility_enforce_route_contract/);
  assert.match(apiContractSource, /moral_trade_participant_eligibility_enforce/);
  assert.match(apiRateLimit, /participant_eligibility_enforce/);
  assert.match(operations, /participant_eligibility_enforce/);
  assert.match(operationsProfile, /participant_eligibility_enforce/);
  assert.match(migration, /moral_trade_participant_eligibility_records/);
  assert.match(migration, /moral_trade_participant_eligibility_reviews/);
  assert.match(migration, /moral_trade_identity_artifact_references/);
  assert.match(enforcementMigration, /moral_trade_participant_eligibility_enforcement_records/);
  assert.match(enforcementMigration, /owner_profile_id = auth\.uid\(\)/);
  assert.match(enforcementMigration, /payment_capture_allowed_bool = false/);
  assert.match(enforcementMigration, /release_gate_promotion_allowed_bool = false/);
  assert.match(schema, /moral_trade_participant_eligibility_records/);
  assert.match(schema, /moral_trade_participant_eligibility_reviews/);
  assert.match(schema, /moral_trade_identity_artifact_references/);
  assert.match(schema, /moral_trade_participant_eligibility_enforcement_records/);
  assert.match(databaseTypes, /moral_trade_participant_eligibility_enforcement_records/);
});
