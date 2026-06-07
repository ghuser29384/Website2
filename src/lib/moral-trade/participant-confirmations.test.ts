import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import test from "node:test";

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

test("participant-confirmation route, health, technical spec, and migration are wired", () => {
  const route = readFileSync(
    "src/app/api/moral-trade/participant-confirmations/contract/route.ts",
    "utf8",
  );
  const health = readFileSync("src/app/api/moral-trade/health/route.ts", "utf8");
  const technicalSpec = readFileSync("src/app/moral-trade/technical-spec/page.tsx", "utf8");
  const migration = readFileSync(
    "supabase/migrations/20260607_zz_moral_trade_participant_confirmation_records.sql",
    "utf8",
  );

  assert.match(route, /validateMoralTradeParticipantConfirmationContract/);
  assert.match(health, /participantConfirmationValidation/);
  assert.match(health, /participantConfirmationScopes/);
  assert.match(technicalSpec, /Participant confirmation contract/);
  assert.match(technicalSpec, /participantConfirmationContract\.firstClassRecordTables/);
  assert.match(migration, /moral_trade_participant_confirmation_records/);
  assert.match(migration, /moral_trade_consent_quality_records/);
});
