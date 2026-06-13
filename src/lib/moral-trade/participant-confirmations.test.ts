import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import test from "node:test";

import { POST as enforceParticipantConfirmation } from "@/app/api/moral-trade/participant-confirmations/enforce/route";
import {
  evaluateMoralTradeParticipantConfirmation,
  getMoralTradeParticipantConfirmationContract,
  validateMoralTradeParticipantConfirmationContract,
  type MoralTradeParticipantConfirmationRecord,
} from "./participant-confirmations";

function hash(seed: string) {
  return `sha256:${createHash("sha256").update(seed).digest("hex")}`;
}

function makeRecord(
  overrides: Partial<MoralTradeParticipantConfirmationRecord> = {},
): MoralTradeParticipantConfirmationRecord {
  return {
    subjectType: "matched_trade_lock_proposal",
    subjectId: "proposal:test-final-lock",
    participantId: "profile:test-participant",
    confirmationScope: "final_lock",
    confirmationStatus: "recorded",
    confirmationHash: hash("a"),
    baselineHash: hash("b"),
    termsSnapshotHash: hash("c"),
    policySnapshotBundleHash: hash("d"),
    maximumExposureCents: 5000,
    currency: "usd",
    noticeRecordStatus: "delivered",
    consentQualityStatus: "passed",
    consentQualityRequired: true,
    eligibleSetHash: null,
    fallbackPolicyHash: hash("e"),
    supersedesConfirmationHash: null,
    materialTermsChangedAfterConfirmation: false,
    recordedAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString(),
    ...overrides,
  };
}

test("participant-confirmation contract validates first-class record coverage", () => {
  const contract = getMoralTradeParticipantConfirmationContract();
  const validation = validateMoralTradeParticipantConfirmationContract(contract);

  assert.equal(validation.status, "pass");
  assert.equal(validation.blockers.length, 0);
  assert.ok(contract.firstClassRecordTables.includes("moral_trade_participant_confirmation_records"));
  assert.ok(contract.firstClassRecordTables.includes("moral_trade_consent_quality_records"));
  assert.ok(contract.subjectTypes.includes("cleared_trade_agreement"));
  assert.ok(contract.confirmationScopes.includes("renewed_material_change"));
  assert.ok(contract.failClosedStatuses.includes("superseded"));
});

test("fresh final-lock confirmation can authorize clearing but not capture or payout release", () => {
  const evaluation = evaluateMoralTradeParticipantConfirmation(makeRecord());

  assert.equal(evaluation.status, "pass");
  assert.equal(evaluation.canAuthorizeClearing, true);
  assert.equal(evaluation.canAuthorizeCapture, false);
  assert.equal(evaluation.canAuthorizePayoutRelease, false);
  assert.equal(evaluation.canAuthorizePrivacyDisclosure, false);
});

test("missing, stale, expired, and weak consent-quality confirmations fail closed", () => {
  const evaluation = evaluateMoralTradeParticipantConfirmation(makeRecord({
    confirmationStatus: "missing",
    consentQualityStatus: "under_review",
    noticeRecordStatus: "failed",
    expiresAt: new Date(Date.now() - 1000).toISOString(),
  }));

  assert.equal(evaluation.status, "blocked");
  assert.ok(evaluation.blockers.includes("confirmation_not_recorded:missing"));
  assert.ok(evaluation.blockers.includes("consent_quality_not_passed:under_review"));
  assert.ok(evaluation.blockers.includes("notice_not_non_blocking:failed"));
  assert.ok(evaluation.blockers.includes("confirmation_expired"));
});

test("hash binding and material change checks block stale parent-object summaries", () => {
  const evaluation = evaluateMoralTradeParticipantConfirmation(makeRecord({
    baselineHash: "parent-json-only",
    termsSnapshotHash: "",
    policySnapshotBundleHash: hash("d"),
    materialTermsChangedAfterConfirmation: true,
  }));

  assert.equal(evaluation.status, "blocked");
  assert.ok(evaluation.blockers.includes("invalid_or_missing_hash:baselineHash"));
  assert.ok(evaluation.blockers.includes("invalid_or_missing_hash:termsSnapshotHash"));
  assert.ok(evaluation.blockers.includes("material_terms_changed_after_confirmation"));
});

test("budget activation and project-set changes require eligible-set hashes", () => {
  const blocked = evaluateMoralTradeParticipantConfirmation(makeRecord({
    subjectType: "common_ground_budget",
    subjectId: "budget:test",
    confirmationScope: "budget_activation",
    eligibleSetHash: null,
    consentQualityRequired: false,
    consentQualityStatus: "not_required_for_stage",
  }));

  assert.equal(blocked.status, "blocked");
  assert.ok(blocked.blockers.includes("eligible_set_hash_required:budget_activation"));

  const passed = evaluateMoralTradeParticipantConfirmation(makeRecord({
    subjectType: "common_ground_budget",
    subjectId: "budget:test",
    confirmationScope: "project_set_change_approval",
    eligibleSetHash: hash("eligible"),
    consentQualityRequired: false,
    consentQualityStatus: "not_required_for_stage",
  }));

  assert.equal(passed.status, "pass");
  assert.equal(passed.canAuthorizeRouting, true);
});

test("renewed material changes must supersede a prior confirmation hash", () => {
  const blocked = evaluateMoralTradeParticipantConfirmation(makeRecord({
    subjectType: "agreement_amendment_record",
    subjectId: "amendment:test",
    confirmationScope: "renewed_material_change",
    supersedesConfirmationHash: null,
  }));

  assert.equal(blocked.status, "blocked");
  assert.ok(blocked.blockers.includes("renewed_confirmation_must_supersede_prior_hash"));

  const passed = evaluateMoralTradeParticipantConfirmation(makeRecord({
    subjectType: "agreement_amendment_record",
    subjectId: "amendment:test",
    confirmationScope: "renewed_material_change",
    supersedesConfirmationHash: hash("prior"),
  }));

  assert.equal(passed.status, "pass");
  assert.equal(passed.canAuthorizeMaterialChange, true);
});

test("participant-confirmation enforcement rejects invalid JSON without state mutation", async () => {
  const response = await enforceParticipantConfirmation(
    new Request("http://localhost/api/moral-trade/participant-confirmations/enforce", {
      method: "POST",
      body: "{",
    }),
  );
  const body = await response.json();

  assert.equal(response.status, 400);
  assert.equal(body.ok, false);
  assert.equal(body.stateMutation, false);
  assert.equal(body.routingAllowed, false);
  assert.equal(body.clearingAllowed, false);
  assert.equal(body.captureAllowed, false);
  assert.equal(body.payoutReleaseAllowed, false);
  assert.equal(body.privacyDisclosureAllowed, false);
  assert.equal(body.materialChangeAllowed, false);
  assert.deepEqual(body.blockers, ["invalid_json_body"]);
  assert.deepEqual(body.persistence, {
    requested: true,
    status: "not_recorded",
    recordId: null,
    table: "moral_trade_participant_confirmation_enforcement_records",
  });
  assert.equal(body.contractValidation.status, "pass");
});

test("participant-confirmation route, health, technical spec, and migration are wired", () => {
  const route = readFileSync(
    "src/app/api/moral-trade/participant-confirmations/contract/route.ts",
    "utf8",
  );
  const enforceRoute = readFileSync(
    "src/app/api/moral-trade/participant-confirmations/enforce/route.ts",
    "utf8",
  );
  const health = readFileSync("src/app/api/moral-trade/health/route.ts", "utf8");
  const technicalSpec = readFileSync("src/app/moral-trade/technical-spec/page.tsx", "utf8");
  const apiContract = readFileSync("config/moral-trade/api-contract-profile.json", "utf8");
  const apiContractSource = readFileSync("src/lib/moral-trade/api-contract.ts", "utf8");
  const apiRateLimit = readFileSync("src/lib/moral-trade/api-rate-limit.ts", "utf8");
  const operations = readFileSync("src/lib/moral-trade/operations.ts", "utf8");
  const operationsProfile = readFileSync("config/moral-trade/operations-profile.json", "utf8");
  const migration = readFileSync(
    "supabase/migrations/20260607_zz_moral_trade_participant_confirmation_records.sql",
    "utf8",
  );
  const enforcementMigration = readFileSync(
    "supabase/migrations/20260613_moral_trade_participant_confirmation_enforcement_records.sql",
    "utf8",
  );
  const schema = readFileSync("supabase/schema.sql", "utf8");
  const databaseTypes = readFileSync("src/lib/supabase/database.types.ts", "utf8");

  assert.match(route, /validateMoralTradeParticipantConfirmationContract/);
  assert.match(enforceRoute, /participant_confirmation_enforce/);
  assert.match(enforceRoute, /moral_trade_participant_confirmation_enforcement_records/);
  assert.match(enforceRoute, /routingAllowed: false/);
  assert.match(enforceRoute, /clearingAllowed: false/);
  assert.match(enforceRoute, /captureAllowed: false/);
  assert.match(enforceRoute, /payoutReleaseAllowed: false/);
  assert.match(enforceRoute, /privacyDisclosureAllowed: false/);
  assert.match(enforceRoute, /materialChangeAllowed: false/);
  assert.match(enforceRoute, /supabase_unconfigured:participant_confirmation_enforce/);
  assert.match(enforceRoute, /authentication_required:participant_confirmation_enforce/);
  assert.match(health, /participantConfirmationValidation/);
  assert.match(health, /participantConfirmationScopes/);
  assert.match(technicalSpec, /Participant confirmation contract/);
  assert.match(technicalSpec, /participantConfirmationContract\.firstClassRecordTables/);
  assert.match(apiContract, /moral_trade_participant_confirmation_enforce/);
  assert.match(apiContract, /participant_confirmation_enforce_request/);
  assert.match(apiContract, /participant_confirmation_enforce_response/);
  assert.match(apiContract, /participant_confirmation_enforce_route_contract/);
  assert.match(apiContractSource, /moral_trade_participant_confirmation_enforce/);
  assert.match(apiRateLimit, /participant_confirmation_enforce/);
  assert.match(operations, /participant_confirmation_enforce/);
  assert.match(operationsProfile, /participant_confirmation_enforce/);
  assert.match(migration, /moral_trade_participant_confirmation_records/);
  assert.match(migration, /moral_trade_consent_quality_records/);
  assert.match(enforcementMigration, /moral_trade_participant_confirmation_enforcement_records/);
  assert.match(enforcementMigration, /owner_profile_id = auth\.uid\(\)/);
  assert.match(enforcementMigration, /routing_allowed_bool = false/);
  assert.match(enforcementMigration, /clearing_allowed_bool = false/);
  assert.match(enforcementMigration, /capture_allowed_bool = false/);
  assert.match(enforcementMigration, /payout_release_allowed_bool = false/);
  assert.match(enforcementMigration, /privacy_disclosure_allowed_bool = false/);
  assert.match(enforcementMigration, /material_change_allowed_bool = false/);
  assert.match(enforcementMigration, /release_gate_promotion_allowed_bool = false/);
  assert.match(schema, /moral_trade_participant_confirmation_enforcement_records/);
  assert.match(databaseTypes, /moral_trade_participant_confirmation_enforcement_records/);
});
