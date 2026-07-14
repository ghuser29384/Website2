import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

import { GET as paymentAuthorizationContractRoute } from "@/app/api/moral-trade/payment-authorizations/contract/route";

import {
  evaluateMoralTradePaymentAuthorizations,
  getMoralTradePaymentAuthorizationContract,
  validateMoralTradePaymentAuthorizationContract,
  type MoralTradePaymentAuthorizationRecord,
} from "./payment-authorizations";

const CHECKED_AT = "2026-06-25T12:05:00.000Z";

function hash(seed: string) {
  return `sha256:${createHash("sha256").update(seed).digest("hex")}`;
}

function passingStub(
  overrides: Partial<MoralTradePaymentAuthorizationRecord> = {},
): MoralTradePaymentAuthorizationRecord {
  return {
    accountSecurityStatus: "not_required_for_stage",
    authorizationId: "payment-authorization:test",
    authorizationMode: "manual_review_stub",
    captureAllowed: false,
    checkedAt: "2026-06-25T12:00:00.000Z",
    checkoutCreationAllowed: false,
    expiresAt: "2026-06-25T12:30:00.000Z",
    finalLockProposalStatus: "missing",
    frozenPreviewHash: hash("preview"),
    idempotencyKeyHash: hash("idempotency"),
    jurisdictionPolicyStatus: "under_review",
    legalReviewStatus: "under_review",
    lockedTermsSnapshotHash: hash("terms"),
    manualReviewQueueRef: "manual-review:payment-authorization",
    marketplaceStateEventRef: "marketplace-state-event:payment-authorization",
    participantConfirmationHash: hash("confirmation"),
    participantConfirmationStatus: "missing",
    paymentAuthorizationPolicySnapshotStatus: "resolved_immutable",
    paymentCredentialsPublic: false,
    paymentRailReviewStatus: "under_review",
    providerAuthorizationAllowed: false,
    providerAuthorizationRefHash: null,
    providerCapabilityStatus: "missing",
    providerSecretPublic: false,
    rawProviderPayloadPublic: false,
    realMoneyCaptureFlagStatus: "blocked",
    referencedParticipantConfirmationHash: hash("confirmation"),
    referencedTermSheetHash: hash("term-sheet"),
    referencedTermsSnapshotHash: hash("terms"),
    releaseGatePolicySnapshotStatus: "resolved_immutable",
    subjectRef: "matched-trade-lock:test",
    subjectType: "donation_offset",
    termSheetHash: hash("term-sheet"),
    transition: "authorization_stub_record",
    ...overrides,
  };
}

test("moraltrade82 payment-authorization contract validates stub and provider gates", () => {
  const contract = getMoralTradePaymentAuthorizationContract();
  const validation = validateMoralTradePaymentAuthorizationContract(contract);

  assert.equal(validation.status, "pass");
  assert.deepEqual(validation.blockers, []);
  assert.ok(contract.firstClassRecordTables.includes("moral_trade_payment_authorization_attempts"));
  assert.ok(contract.releaseGateTestHooks.includes("payment_authorization_stub_test"));
  assert.ok(contract.releaseGateTestHooks.includes("payment_replay_tests"));
  assert.match(contract.manualStubRule, /checkout creation, and capture are false/i);
  assert.match(contract.conditionalProviderRule, /final-lock proposal/i);
  assert.match(contract.captureRule, /never authorizes payment capture/i);
  assert.ok(contract.requiredProviderAuthorizationGates.includes("legal review non-blocking"));
  assert.ok(contract.requiredProviderAuthorizationGates.includes("provider conditional-authorization capability"));
});

test("manual-review payment authorization stub can pass while blocking checkout and capture", () => {
  const result = evaluateMoralTradePaymentAuthorizations({
    checkedAt: CHECKED_AT,
    records: [passingStub()],
    transition: "authorization_stub_record",
  });

  assert.equal(result.status, "pass");
  assert.equal(result.stubRecordCount, 1);
  assert.equal(result.providerAuthorizationCount, 0);
  assert.deepEqual(result.blockers, []);
});

test("conditional provider authorization requires all current gates and still blocks capture", () => {
  const result = evaluateMoralTradePaymentAuthorizations({
    checkedAt: CHECKED_AT,
    records: [
      passingStub({
        accountSecurityStatus: "passed",
        authorizationMode: "provider_managed_conditional_authorization",
        finalLockProposalStatus: "passed",
        jurisdictionPolicyStatus: "passed",
        legalReviewStatus: "passed",
        manualReviewQueueRef: null,
        participantConfirmationStatus: "passed",
        paymentRailReviewStatus: "passed",
        providerAuthorizationAllowed: true,
        providerAuthorizationRefHash: hash("provider-authorization"),
        providerCapabilityStatus: "passed",
        realMoneyCaptureFlagStatus: "passed",
        transition: "provider_authorization",
      }),
    ],
    transition: "provider_authorization",
  });

  assert.equal(result.status, "pass");
  assert.equal(result.providerAuthorizationCount, 1);
  assert.deepEqual(result.blockers, []);
});

test("payment authorization blocks stale hashes, capture, checkout, private leaks, and missing manual review", () => {
  const result = evaluateMoralTradePaymentAuthorizations({
    checkedAt: CHECKED_AT,
    records: [
      passingStub({
        captureAllowed: true,
        checkoutCreationAllowed: true,
        manualReviewQueueRef: null,
        marketplaceStateEventRef: null,
        paymentCredentialsPublic: true,
        providerSecretPublic: true,
        rawProviderPayloadPublic: true,
        referencedParticipantConfirmationHash: hash("changed-confirmation"),
        referencedTermSheetHash: hash("changed-term-sheet"),
        referencedTermsSnapshotHash: hash("changed-terms"),
      }),
    ],
    transition: "authorization_stub_record",
  });

  assert.equal(result.status, "blocked");
  assert.ok(result.blockers.includes("payment_authorization_terms_snapshot_mismatch:payment-authorization:test"));
  assert.ok(result.blockers.includes("payment_authorization_term_sheet_hash_mismatch:payment-authorization:test"));
  assert.ok(result.blockers.includes("payment_authorization_participant_confirmation_hash_mismatch:payment-authorization:test"));
  assert.ok(result.blockers.includes("payment_authorization_marketplace_state_event_missing:payment-authorization:test"));
  assert.ok(result.blockers.includes("payment_authorization_checkout_creation_allowed:payment-authorization:test"));
  assert.ok(result.blockers.includes("payment_authorization_capture_allowed:payment-authorization:test"));
  assert.ok(result.blockers.includes("payment_authorization_raw_provider_payload_public:payment-authorization:test"));
  assert.ok(result.blockers.includes("payment_authorization_credentials_public:payment-authorization:test"));
  assert.ok(result.blockers.includes("payment_authorization_provider_secret_public:payment-authorization:test"));
  assert.ok(result.blockers.includes("payment_authorization_manual_review_queue_missing:payment-authorization:test"));
});

test("payment-authorization contract route exposes safe public metadata", async () => {
  const response = await paymentAuthorizationContractRoute(
    new Request("http://localhost/api/moral-trade/payment-authorizations/contract"),
  );
  const body = await response.json();
  const serialized = JSON.stringify(body);

  assert.equal(response.status, 200);
  assert.equal(response.headers.get("Cache-Control"), "no-store");
  assert.equal(body.ok, true);
  assert.equal(body.validation.status, "pass");
  assert.ok(body.publicContract.firstClassRecordTables.includes("moral_trade_payment_authorization_attempts"));
  assert.ok(body.publicContract.releaseGateTestHooks.includes("payment_authorization_stub_test"));
  assert.equal(serialized.includes("provider_customer"), false);
  assert.equal(serialized.includes("payment_method"), false);
  assert.equal(serialized.includes("provider_secret"), false);
  assert.equal(serialized.includes("raw_provider_payload"), false);
  assert.equal(serialized.includes("participant_identity_hash"), false);
});

test("payment-authorization migration creates stubs, idempotency, and no-capture privacy constraints", () => {
  const migration = readFileSync(
    join(
      process.cwd(),
      "supabase/migrations/20260625_moral_trade_payment_authorization_contract.sql",
    ),
    "utf8",
  );

  assert.match(migration, /create table if not exists public\.moral_trade_payment_authorization_policies/);
  assert.match(migration, /create table if not exists public\.moral_trade_payment_authorization_attempts/);
  assert.match(migration, /create table if not exists public\.moral_trade_payment_authorization_manual_review_queue/);
  assert.match(migration, /unique \(idempotency_key_hash\)/);
  assert.match(migration, /checkout_creation_allowed_bool boolean not null default false check \(checkout_creation_allowed_bool = false\)/);
  assert.match(migration, /capture_allowed_bool boolean not null default false check \(capture_allowed_bool = false\)/);
  assert.match(migration, /raw_provider_payload_public_bool boolean not null default false check \(raw_provider_payload_public_bool = false\)/);
  assert.match(migration, /payment_credentials_public_bool boolean not null default false check \(payment_credentials_public_bool = false\)/);
  assert.match(migration, /provider_secret_public_bool boolean not null default false check \(provider_secret_public_bool = false\)/);
  assert.match(migration, /manual_review_stub/);
  assert.match(migration, /provider_managed_conditional_authorization/);
  assert.match(migration, /marketplace_state_event_ref/);
});
