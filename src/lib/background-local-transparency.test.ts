import assert from "node:assert/strict";
import test from "node:test";

import {
  BACKGROUND_LOCAL_TRANSPARENCY_RECEIPT_VERSION,
  buildLocalConsentGrantReceipt,
  buildLocalMatchExplanationReceipt,
  getBackgroundLocalTransparencyReceiptKey,
  summarizeLocalTransparencyReceipts,
} from "@/lib/background-local-transparency";
import {
  buildTransparencyReceiptEntry,
  verifyTransparencyReceiptChain,
} from "@/lib/background-transparency-receipts";

test("local match explanation receipts keep only compact safe provenance metadata", () => {
  const receipt = buildLocalMatchExplanationReceipt({
    confidenceBand: "Moderate",
    createdAt: "2026-05-31T12:00:00.000Z",
    explanationVersion: "background-explanation-v1",
    factorCodes: [
      "cause_overlap",
      "verification_ready",
      "cause_overlap",
      "privacy_aligned",
      "source_supported",
      "saved_search_hit",
      "deterministic_scan",
      "payment_compatible",
      "pledge_compatible",
      "extra_factor",
    ],
    id: "snapshot-1",
    matchId: "match-1",
    scoreBucket: "60-74",
    workflowStage: "intro_review",
  });

  assert.equal(receipt.kind, "match_explanation");
  assert.equal(receipt.receiptVersion, BACKGROUND_LOCAL_TRANSPARENCY_RECEIPT_VERSION);
  assert.equal(receipt.factorCodes?.length, 8);
  assert.deepEqual(receipt.factorCodes?.slice(0, 2), ["cause_overlap", "verification_ready"]);
  assert.equal("summary" in receipt, false);
  assert.equal("privacyNote" in receipt, false);
});

test("local consent receipts label fields without copying grant notes", () => {
  const receipt = buildLocalConsentGrantReceipt({
    accessLevel: "specific",
    audienceStage: "consent",
    expiresAt: "2026-06-30T12:00:00.000Z",
    fieldKey: "exact_wish",
    id: "grant-1",
    matchId: "match-1",
    status: "granted",
    updatedAt: "2026-05-31T12:00:00.000Z",
  });

  assert.equal(receipt.kind, "consent_grant");
  assert.equal(receipt.fieldLabel, "Exact wish");
  assert.equal("notes" in receipt, false);
});

test("local transparency receipt keys sanitize record ids", () => {
  assert.equal(
    getBackgroundLocalTransparencyReceiptKey({
      kind: "consent_grant",
      recordId: "grant 1 / private@example.org",
    }),
    "consent_grant:grant1privateexampleorg",
  );
});

test("local transparency summary counts explanation, grant, and revoked receipts", () => {
  const summary = summarizeLocalTransparencyReceipts([
    buildLocalMatchExplanationReceipt({
      confidenceBand: "High",
      createdAt: "2026-05-31T12:00:00.000Z",
      explanationVersion: "background-explanation-v1",
      factorCodes: ["cause_overlap"],
      id: "snapshot-1",
      matchId: "match-1",
      scoreBucket: "75-100",
      workflowStage: "suggested",
    }),
    buildLocalConsentGrantReceipt({
      accessLevel: "specific",
      audienceStage: "consent",
      expiresAt: null,
      fieldKey: "capabilities",
      id: "grant-1",
      matchId: null,
      status: "revoked",
      updatedAt: "2026-05-31T12:00:00.000Z",
    }),
  ]);

  assert.deepEqual(summary, {
    consentGrants: 1,
    matchExplanations: 1,
    revokedConsentReceipts: 1,
  });
});

test("transparency receipts form a tamper-evident redacted hash chain", () => {
  const first = buildTransparencyReceiptEntry({
    actorScope: "profile:profile-1",
    eventType: "background_private_overlap_check",
    redactedPayload: {
      namespace: "exact_capability_tag",
      resultBucket: "1",
      storedRawTags: false,
    },
  });
  const second = buildTransparencyReceiptEntry({
    actorScope: "profile:profile-1",
    eventType: "background_private_overlap_check",
    previousEntryHash: first.entry_hash,
    redactedPayload: {
      namespace: "exact_verification_tag",
      resultBucket: "none",
      storedRawTags: false,
    },
  });

  assert.equal(first.prev_hash, null);
  assert.equal(second.prev_hash, first.entry_hash);
  assert.equal(
    verifyTransparencyReceiptChain([
      {
        actor_scope: first.actor_scope,
        entry_hash: first.entry_hash,
        event_type: first.event_type,
        prev_hash: first.prev_hash ?? null,
        redacted_payload: first.redacted_payload,
      },
      {
        actor_scope: second.actor_scope,
        entry_hash: second.entry_hash,
        event_type: second.event_type,
        prev_hash: second.prev_hash ?? null,
        redacted_payload: second.redacted_payload,
      },
    ]),
    true,
  );
  assert.equal(
    verifyTransparencyReceiptChain([
      {
        actor_scope: first.actor_scope,
        entry_hash: first.entry_hash,
        event_type: first.event_type,
        prev_hash: first.prev_hash ?? null,
        redacted_payload: { ...first.redacted_payload, resultBucket: "4_plus" },
      },
    ]),
    false,
  );
});

test("transparency receipts reject unredacted private payloads", () => {
  assert.throws(
    () =>
      buildTransparencyReceiptEntry({
        actorScope: "profile:profile-1",
        eventType: "background_private_overlap_check",
        redactedPayload: {
          note: "exact private wish: contact alex@example.org",
        },
      }),
    /redacted payloads only/,
  );
});
