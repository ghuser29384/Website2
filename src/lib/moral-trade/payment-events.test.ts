import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

import { GET as paymentEventContractRoute } from "@/app/api/moral-trade/payment-events/contract/route";

import {
  evaluateMoralTradePaymentEvents,
  getMoralTradePaymentEventContract,
  validateMoralTradePaymentEventContract,
  type MoralTradePaymentEventEvaluationInput,
  type MoralTradePaymentEventRecord,
} from "./payment-events";

const CHECKED_AT = "2026-06-25T12:05:00.000Z";

function hash(seed: string) {
  return `sha256:${seed.padEnd(64, "0").slice(0, 64)}`;
}

function passingEvent(
  overrides: Partial<MoralTradePaymentEventRecord> = {},
): MoralTradePaymentEventRecord {
  return {
    agreementState: "locked",
    databaseTransactionUsed: true,
    deliveryId: "payment-event-delivery:pass",
    duplicateIdempotencyKey: false,
    duplicateProviderEvent: false,
    eventType: "payment_intent.succeeded",
    idempotencyKeyHash: hash("2"),
    lockedAgreementRef: "agreement:locked",
    lockedParticipantConfirmationHash: hash("3"),
    lockedTermsSnapshotHash: hash("1"),
    manualReviewQueueRef: null,
    marketplaceStateEventRef: "marketplace-state-event:capture",
    provider: "stripe",
    providerEventIdHash: hash("4"),
    receivedAt: "2026-06-25T12:00:00.000Z",
    referencedParticipantConfirmationHash: hash("3"),
    referencedTermsSnapshotHash: hash("1"),
    serverDeadlineAt: "2026-06-25T12:10:00.000Z",
    sourceAuthentication: {
      authenticatedAt: "2026-06-25T12:00:01.000Z",
      endpointVerified: true,
      eventTypeAllowed: true,
      policySnapshotStatus: "resolved_immutable",
      providerAccountVerified: true,
      providerSourceAuthenticationPolicyRef: "policy:provider-source-authentication:v1",
      replayWindowValid: true,
      signatureVerified: true,
    },
    storedBeforeApply: true,
    transition: "capture",
    impossibleTransition: false,
    ...overrides,
  };
}

function passingInput(
  overrides: Partial<MoralTradePaymentEventEvaluationInput> = {},
): MoralTradePaymentEventEvaluationInput {
  return {
    checkedAt: CHECKED_AT,
    events: [passingEvent()],
    providerEventRequired: true,
    transition: "capture",
    ...overrides,
  };
}

test("moraltrade82 payment-event contract validates replay-safety hooks", () => {
  const contract = getMoralTradePaymentEventContract();
  const validation = validateMoralTradePaymentEventContract(contract);

  assert.equal(validation.status, "pass");
  assert.deepEqual(validation.blockers, []);
  assert.ok(contract.firstClassRecordTables.includes("moral_trade_payment_event_deliveries"));
  assert.ok(contract.firstClassRecordTables.includes("moral_trade_payment_transition_attempts"));
  assert.ok(contract.firstClassRecordTables.includes("moral_trade_marketplace_state_events"));
  assert.ok(contract.releaseGateTestHooks.includes("payment_replay_tests"));
  assert.match(contract.storageBeforeApplyRule, /stored before application/i);
  assert.match(contract.idempotencyRule, /stored as deliveries but ignored/i);
  assert.match(contract.providerAuthenticationRule, /verified signature/i);
  assert.match(contract.lockedSnapshotRule, /participant confirmation hash/i);
  assert.match(contract.transactionRule, /marketplace_state_event/i);
  assert.match(contract.nonEscrowClaim, /not a legal escrow/i);
});

test("authenticated matching provider event can apply with transactional state event", () => {
  const result = evaluateMoralTradePaymentEvents(passingInput());

  assert.equal(result.status, "pass");
  assert.equal(result.eventCount, 1);
  assert.equal(result.applicableEventCount, 1);
  assert.equal(result.ignoredDuplicateCount, 0);
  assert.equal(result.stateMutationAllowed, true);
  assert.deepEqual(result.blockers, []);
});

test("duplicate provider event is stored but ignored without state mutation", () => {
  const result = evaluateMoralTradePaymentEvents(
    passingInput({
      events: [
        passingEvent({
          duplicateIdempotencyKey: true,
          duplicateProviderEvent: true,
          marketplaceStateEventRef: null,
        }),
      ],
    }),
  );

  assert.equal(result.status, "pass");
  assert.equal(result.eventCount, 1);
  assert.equal(result.applicableEventCount, 0);
  assert.equal(result.ignoredDuplicateCount, 1);
  assert.equal(result.stateMutationAllowed, false);
  assert.deepEqual(result.blockers, []);
});

test("failed authentication, stale snapshot, expired deadline, terminal agreement, and unaudited writes block", () => {
  const result = evaluateMoralTradePaymentEvents(
    passingInput({
      events: [
        passingEvent({
          agreementState: "terminal",
          databaseTransactionUsed: false,
          manualReviewQueueRef: null,
          marketplaceStateEventRef: null,
          referencedParticipantConfirmationHash: hash("5"),
          referencedTermsSnapshotHash: hash("6"),
          serverDeadlineAt: "2026-06-25T11:00:00.000Z",
          sourceAuthentication: {
            ...passingEvent().sourceAuthentication,
            replayWindowValid: false,
            signatureVerified: false,
          },
          storedBeforeApply: false,
        }),
      ],
    }),
  );

  assert.equal(result.status, "blocked");
  assert.equal(result.blockedEventCount, 1);
  assert.equal(result.stateMutationAllowed, false);
  assert.ok(result.blockers.includes("payment_event_not_stored_before_apply:payment-event-delivery:pass"));
  assert.ok(result.blockers.includes("payment_event_signature_unverified:payment-event-delivery:pass"));
  assert.ok(result.blockers.includes("payment_event_replay_window_invalid:payment-event-delivery:pass"));
  assert.ok(result.blockers.includes("payment_event_terms_snapshot_mismatch:payment-event-delivery:pass"));
  assert.ok(result.blockers.includes("payment_event_confirmation_hash_mismatch:payment-event-delivery:pass"));
  assert.ok(result.blockers.includes("payment_event_terminal_agreement:payment-event-delivery:pass:terminal"));
  assert.ok(result.blockers.includes("payment_event_deadline_expired:payment-event-delivery:pass"));
  assert.ok(result.blockers.includes("payment_event_database_transaction_missing:payment-event-delivery:pass"));
  assert.ok(result.blockers.includes("payment_event_marketplace_state_event_missing:payment-event-delivery:pass"));
  assert.ok(result.blockers.includes("payment_event_manual_review_queue_missing:payment-event-delivery:pass"));
});

test("payment-event contract route exposes safe public metadata", async () => {
  const response = await paymentEventContractRoute(
    new Request("http://localhost/api/moral-trade/payment-events/contract"),
  );
  const body = await response.json();
  const serialized = JSON.stringify(body);

  assert.equal(response.status, 200);
  assert.equal(response.headers.get("Cache-Control"), "no-store");
  assert.equal(body.ok, true);
  assert.equal(body.validation.status, "pass");
  assert.ok(body.publicContract.releaseGateTestHooks.includes("payment_replay_tests"));
  assert.ok(body.publicContract.firstClassRecordTables.includes("moral_trade_payment_event_deliveries"));
  assert.ok(body.publicContract.firstClassRecordTables.includes("moral_trade_marketplace_state_events"));
  assert.match(body.publicContract.nonEscrowClaim, /not a legal escrow/i);
  assert.equal(serialized.includes("raw_payload"), false);
  assert.equal(serialized.includes("provider_secret"), false);
  assert.equal(serialized.includes("payment_method"), false);
  assert.equal(serialized.includes("reviewer_notes"), false);
});

test("payment-event migration records delivery, dedupe attempts, and marketplace state events", () => {
  const migration = readFileSync(
    join(
      process.cwd(),
      "supabase/migrations/20260625_moral_trade_payment_event_replay_safety.sql",
    ),
    "utf8",
  );

  assert.match(migration, /create table if not exists public\.moral_trade_payment_event_deliveries/);
  assert.match(migration, /create table if not exists public\.moral_trade_payment_transition_attempts/);
  assert.match(migration, /create table if not exists public\.moral_trade_marketplace_state_events/);
  assert.match(migration, /stored_before_apply_bool boolean not null default true check \(stored_before_apply_bool = true\)/);
  assert.match(migration, /raw_payload_stored_bool boolean not null default false check \(raw_payload_stored_bool = false\)/);
  assert.match(migration, /unique \(provider, provider_event_id_hash\)/);
  assert.match(migration, /unique \(idempotency_key_hash\)/);
  assert.match(migration, /database_transaction_used_bool boolean not null default false/);
  assert.match(migration, /state_change_allowed_bool boolean not null default false check \(state_change_allowed_bool = false\)/);
  assert.match(migration, /provider source authentication/i);
  assert.match(migration, /not authorize final payout|state mutation|double application|provider delivery|same transaction|marketplace state events/i);
});
