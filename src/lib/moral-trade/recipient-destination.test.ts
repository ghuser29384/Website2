import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

import {
  evaluateMoralTradeRecipientDestination,
  getMoralTradeRecipientDestinationContract,
  validateMoralTradeRecipientDestinationContract,
  type MoralTradeRecipientDestinationPolicySnapshotStatus,
  type MoralTradeRecipientDestinationPrivilegedActionStatus,
  type MoralTradeRecipientDestinationRecord,
  type MoralTradeRecipientDestinationStatus,
} from "./recipient-destination";

function readRepoFile(path: string) {
  return readFileSync(join(process.cwd(), path), "utf8");
}

function hashFor(seed: string) {
  return `sha256:${createHash("sha256").update(seed).digest("hex")}`;
}

function record(
  overrides: Partial<MoralTradeRecipientDestinationRecord> = {},
): MoralTradeRecipientDestinationRecord {
  return {
    recipientRegistryEntryId: "recipient:test",
    paymentDestinationId: "destination:test",
    recipientRegistryStatus: "verified",
    paymentDestinationStatus: "verified",
    antiImpersonationStatus: "verified",
    jurisdictionStatus: "verified",
    prohibitedUseStatus: "verified",
    policySnapshotStatus: "resolved_immutable",
    privilegedActionStatus: "approved",
    registryEntryHash: hashFor("recipient:test"),
    paymentDestinationHash: hashFor("destination:test"),
    reviewedAt: "2026-06-07T12:00:00.000Z",
    expiresAt: "2026-12-07T12:00:00.000Z",
    ...overrides,
  };
}

test("recipient-destination contract validates first-class registry and destination coverage", () => {
  const contract = getMoralTradeRecipientDestinationContract();
  const validation = validateMoralTradeRecipientDestinationContract(contract);

  assert.equal(validation.status, "pass");
  assert.deepEqual(validation.blockers, []);
  assert.ok(contract.firstClassRecordTables.includes("moral_trade_recipient_registry_entries"));
  assert.ok(contract.firstClassRecordTables.includes("moral_trade_payment_destinations"));
  assert.ok(contract.firstClassRecordTables.includes("moral_trade_recipient_destination_reviews"));
  assert.ok(contract.policySnapshotSubjects.includes("recipient_destination_verification"));
  assert.ok(contract.reviewDimensions.includes("recipient_identity"));
  assert.ok(contract.reviewDimensions.includes("destination_identity"));
  assert.ok(contract.reviewDimensions.includes("anti_impersonation"));
  assert.ok(contract.reviewDimensions.includes("jurisdiction"));
  assert.ok(contract.reviewDimensions.includes("prohibited_use"));
  assert.ok(contract.reviewDimensions.includes("payment_rail"));
  assert.ok(contract.reviewDimensions.includes("authority_to_receive"));
  assert.ok(contract.reviewDimensions.includes("source_authentication"));
  assert.ok(contract.failClosedStatuses.includes("missing"));
  assert.ok(contract.failClosedStatuses.includes("under_review"));
  assert.ok(contract.failClosedStatuses.includes("impersonation_risk"));
  assert.ok(contract.sampleEvaluations.some((sample) => sample.transition === "non_money_preview" && sample.status === "pass"));
  assert.ok(contract.sampleEvaluations.some((sample) => sample.transition === "payment_capture" && sample.status === "pass"));
  assert.ok(contract.sampleEvaluations.some((sample) => sample.transition === "payout_release" && sample.status === "blocked"));
});

test("payment capture blocks free-text or unverified recipient and destination records", () => {
  const pass = evaluateMoralTradeRecipientDestination({
    transition: "payment_capture",
    checkedAt: "2026-06-07T12:00:00.000Z",
    records: [record()],
  });

  assert.equal(pass.status, "pass");
  assert.deepEqual(pass.blockers, []);

  const missing = evaluateMoralTradeRecipientDestination({
    transition: "payment_capture",
    checkedAt: "2026-06-07T12:00:00.000Z",
    records: [],
  });

  assert.equal(missing.status, "blocked");
  assert.ok(missing.blockers.includes("recipient_destination_record_required"));

  const blocked = evaluateMoralTradeRecipientDestination({
    transition: "payment_capture",
    checkedAt: "2026-06-07T12:00:00.000Z",
    records: [
      record({
        recipientRegistryStatus: "under_review",
        paymentDestinationStatus: "missing",
        antiImpersonationStatus: "impersonation_risk",
      }),
    ],
  });

  assert.equal(blocked.status, "blocked");
  assert.ok(blocked.blockers.includes("recipient_registry_not_verified:recipient:test:under_review"));
  assert.ok(blocked.blockers.includes("payment_destination_not_verified:destination:test:missing"));
  assert.ok(blocked.blockers.includes("recipient_destination_review_not_verified:anti_impersonation:impersonation_risk"));
  assert.deepEqual(blocked.userFacingBlockerCategories, [
    "Recipient or payment destination needs review before payment",
  ]);
});

test("payout release blocks stale, expired, mutable, unapproved, or hash-broken records", () => {
  const evaluate = (
    overrides: Partial<MoralTradeRecipientDestinationRecord>,
  ) =>
    evaluateMoralTradeRecipientDestination({
      transition: "payout_release",
      checkedAt: "2026-06-07T12:00:00.000Z",
      records: [record(overrides)],
    });

  const mutablePolicy = evaluate({
    policySnapshotStatus: "mutable" as MoralTradeRecipientDestinationPolicySnapshotStatus,
  });
  assert.ok(
    mutablePolicy.blockers.includes(
      "recipient_destination_policy_snapshot_not_immutable:mutable",
    ),
  );

  const missingAction = evaluate({
    privilegedActionStatus: "missing" as MoralTradeRecipientDestinationPrivilegedActionStatus,
  });
  assert.ok(
    missingAction.blockers.includes(
      "recipient_destination_privileged_action_not_approved:missing",
    ),
  );

  const stale = evaluate({ reviewedAt: "2025-01-01T12:00:00.000Z" });
  assert.ok(
    stale.blockers.includes(
      "stale_recipient_destination_review:recipient:test:destination:test",
    ),
  );

  const expired = evaluate({ expiresAt: "2026-01-01T12:00:00.000Z" });
  assert.ok(
    expired.blockers.includes(
      "expired_recipient_destination_review:recipient:test:destination:test",
    ),
  );

  const brokenHash = evaluate({
    registryEntryHash: "sha256:broken",
    paymentDestinationHash: "sha256:also-broken",
  });
  assert.ok(brokenHash.blockers.includes("invalid_recipient_registry_hash:recipient:test"));
  assert.ok(brokenHash.blockers.includes("invalid_payment_destination_hash:destination:test"));
});

test("non-money preview stays preview-only without pretending destination verification exists", () => {
  const preview = evaluateMoralTradeRecipientDestination({
    transition: "non_money_preview",
    checkedAt: "2026-06-07T12:00:00.000Z",
    records: [],
  });

  assert.equal(preview.status, "pass");
  assert.equal(preview.requiredRecordCount, 0);

  const lock = evaluateMoralTradeRecipientDestination({
    transition: "matched_trade_lock",
    checkedAt: "2026-06-07T12:00:00.000Z",
    records: [record({ prohibitedUseStatus: "prohibited_use_blocked" as MoralTradeRecipientDestinationStatus })],
  });

  assert.equal(lock.status, "blocked");
  assert.ok(
    lock.blockers.includes(
      "recipient_destination_review_not_verified:prohibited_use:prohibited_use_blocked",
    ),
  );
});

test("recipient-destination route, health, technical spec, API contract, and migration are wired", () => {
  const source = readRepoFile("src/lib/moral-trade/recipient-destination.ts");
  const route = readRepoFile("src/app/api/moral-trade/recipient-destinations/contract/route.ts");
  const health = readRepoFile("src/app/api/moral-trade/health/route.ts");
  const spec = readRepoFile("src/app/moral-trade/technical-spec/page.tsx");
  const apiContract = readRepoFile("config/moral-trade/api-contract-profile.json");
  const migration = readRepoFile(
    "supabase/migrations/20260607_zzzz_moral_trade_recipient_destination_records.sql",
  );
  const schema = readRepoFile("supabase/schema.sql");

  assert.match(source, /moral_trade_recipient_registry_entries/);
  assert.match(source, /moral_trade_payment_destinations/);
  assert.match(source, /recipient_destination_verification/);
  assert.match(route, /getMoralTradeRecipientDestinationContract/);
  assert.match(route, /recipientDestinationSampleEvaluationStatuses/);
  assert.match(health, /recipientDestinationValidation/);
  assert.match(health, /recipientDestinationFirstClassRecordTables/);
  assert.match(spec, /Recipient and destination contract/);
  assert.match(spec, /recipient-destinations\/contract/);
  assert.match(apiContract, /moral_trade_recipient_destination_contract/);
  assert.match(apiContract, /recipient_destination_contract_response/);
  assert.match(migration, /moral_trade_recipient_registry_entries/);
  assert.match(migration, /moral_trade_payment_destinations/);
  assert.match(migration, /moral_trade_recipient_destination_reviews/);
  assert.match(schema, /moral_trade_recipient_registry_entries/);
  assert.match(schema, /moral_trade_payment_destinations/);
  assert.match(schema, /moral_trade_recipient_destination_reviews/);
});
