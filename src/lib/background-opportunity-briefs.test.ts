import assert from "node:assert/strict";
import test from "node:test";

import {
  BACKGROUND_BRIEF_HIDDEN_FIELDS_NOTICE,
  buildIntroPacketRow,
  buildOpportunityBriefRow,
  buildSourceSummaryRows,
  getBackgroundSourceRetentionExpiresAt,
  getGrantReceiptStatus,
  serializeOpportunityBriefCard,
  validateIntroPacketInput,
} from "@/lib/background-opportunity-briefs";

test("opportunity brief serialization keeps exact private wishes out of broad cards", () => {
  const exactPrivateWish = "exact private wish: pay Alice $123 for secret outreach";
  const row = buildOpportunityBriefRow({
    canRevealIdentity: false,
    candidateProfileId: "counterparty-1",
    counterpartyConsented: false,
    generatedBy: "rule-based",
    matchBasis: [
      "Compatibility tag: cause_overlap",
      "Compatibility tag: payment_compatible",
      exactPrivateWish,
    ],
    matchId: "match-1",
    profileId: "profile-1",
    riskNotes: "Do not reveal contact details.",
    score: 78,
    sharedCauses: ["Global health"],
    status: "suggested",
    suggestedFirstStep: "Prepare a reviewed intro packet.",
    viewerConsented: false,
  });
  const serialized = serializeOpportunityBriefCard({
    confidence_band: row.confidence_band ?? "Exploratory",
    factor_codes: row.factor_codes ?? [],
    hidden_fields_notice: row.hidden_fields_notice ?? "",
    id: "brief-1",
    next_step_type: row.next_step_type ?? "review_profile",
    profile_id: row.profile_id,
    reveal_consequence_notice: row.reveal_consequence_notice ?? "",
    status: row.status ?? "open",
    title: row.title ?? "",
    why_text: row.why_text ?? "",
  });
  const rendered = JSON.stringify(serialized);

  assert.equal(rendered.includes(exactPrivateWish), false);
  assert.match(rendered, /Exact wishes/);
  assert.deepEqual(row.factor_codes?.sort(), [
    "cause_overlap",
    "deterministic_scan",
    "payment_compatible",
  ]);
});

test("opportunity brief creation never advances disclosure or introduction state", () => {
  const row = buildOpportunityBriefRow({
    canRevealIdentity: false,
    counterpartyConsented: false,
    generatedBy: "saved-search-cron",
    matchBasis: ["Compatibility tag: saved_search_hit"],
    matchId: "match-2",
    profileId: "profile-2",
    riskNotes: "",
    score: 62,
    sharedCauses: [],
    status: "suggested",
    suggestedFirstStep: "Ask for detail only after consent.",
    viewerConsented: false,
  });

  assert.equal(row.status, "open");
  assert.equal(row.next_step_type, "request_intro_packet");
  assert.equal(row.hidden_fields_notice, BACKGROUND_BRIEF_HIDDEN_FIELDS_NOTICE);
  assert.equal("access_level" in row, false);
  assert.equal("identity_revealed" in row, false);
});

test("intro packets require purpose and bounded requested fields", () => {
  const invalid = validateIntroPacketInput({ purpose: "thin", requestedFieldKeys: [] });

  assert.ok(invalid.errors.length >= 2);

  const packet = buildIntroPacketRow({
    counterpartyProfileId: "counterparty-3",
    matchId: "match-3",
    opportunityBriefId: "brief-3",
    purpose: "Decide whether a first bounded conversation is worth reviewing.",
    requestedFieldKeys: ["exact_wish", "source_summary", "exact_wish"],
    requesterProfileId: "profile-3",
  });

  assert.deepEqual(packet.requested_field_keys, ["exact_wish", "source_summary"]);
  assert.equal(packet.review_state, "requested");
  assert.match(packet.reveal_capsule ?? "", /no contact details/i);
  assert.ok(packet.mutual_questions.some((question) => /no trade/i.test(question)));
});

test("source summaries are scoped, expiring, and raw-ingestion disabled", () => {
  const { receipt, sourceSummary, validationErrors } = buildSourceSummaryRows({
    allowedFieldKeys: ["cause_priorities", "raw_free_text", "capability_tags"],
    label: "Reviewed notes",
    now: new Date("2026-05-31T00:00:00.000Z"),
    profileId: "profile-4",
    purpose: "Improve broad matching without storing raw feed content.",
    retentionDays: 30,
  });

  assert.deepEqual(validationErrors, []);
  assert.equal(sourceSummary.raw_ingestion_allowed, false);
  assert.deepEqual(sourceSummary.allowed_field_keys, ["cause_priorities", "capability_tags"]);
  assert.equal(sourceSummary.retention_expires_at, "2026-06-30T00:00:00.000Z");
  assert.equal(receipt.receipt_kind, "source_summary");
  assert.equal(receipt.expires_at, sourceSummary.retention_expires_at);
});

test("source retention expiry normalizes unsupported windows to ninety days", () => {
  assert.equal(
    getBackgroundSourceRetentionExpiresAt("17", new Date("2026-05-31T00:00:00.000Z")),
    "2026-08-29T00:00:00.000Z",
  );
});

test("grant receipt status follows revocation before expiry", () => {
  assert.equal(
    getGrantReceiptStatus({
      expiresAt: "2026-06-01T00:00:00.000Z",
      now: new Date("2026-05-31T00:00:00.000Z"),
    }),
    "active",
  );
  assert.equal(
    getGrantReceiptStatus({
      expiresAt: "2026-05-01T00:00:00.000Z",
      now: new Date("2026-05-31T00:00:00.000Z"),
    }),
    "expired",
  );
  assert.equal(
    getGrantReceiptStatus({
      expiresAt: "2026-06-01T00:00:00.000Z",
      now: new Date("2026-05-31T00:00:00.000Z"),
      revokedAt: "2026-05-30T00:00:00.000Z",
    }),
    "revoked",
  );
});
