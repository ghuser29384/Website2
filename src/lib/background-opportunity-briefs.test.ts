import assert from "node:assert/strict";
import test from "node:test";

import {
  BACKGROUND_BRIEF_HIDDEN_FIELDS_NOTICE,
  buildIntroPacketRow,
  buildOpportunityBriefRow,
  buildSourceSummaryRows,
  getBackgroundSourceRetentionExpiresAt,
  getGrantReceiptStatus,
  getOpportunityBriefDeliveryStateForFeedback,
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
    delivery_state: row.delivery_state ?? "pending",
    factor_codes: row.factor_codes ?? [],
    hidden_fields_notice: row.hidden_fields_notice ?? "",
    human_review_required: row.human_review_required ?? true,
    id: "brief-1",
    next_step_type: row.next_step_type ?? "review_profile",
    profile_id: row.profile_id,
    redacted_fields: row.redacted_fields ?? [],
    reveal_consequence_notice: row.reveal_consequence_notice ?? "",
    review_status: row.review_status ?? "human_review_required",
    safe_summary: row.safe_summary ?? "",
    shared_counts: row.shared_counts ?? {},
    status: row.status ?? "open",
    title: row.title ?? "",
    why_text: row.why_text ?? "",
  });
  const rendered = JSON.stringify(serialized);

  assert.equal(rendered.includes(exactPrivateWish), false);
  assert.match(rendered, /Exact wishes/);
  assert.ok(serialized.redactedFields.length > 0);
  assert.deepEqual(serialized.actions, [
    "request_more_detail",
    "maybe_later",
    "dismiss",
    "report_concern",
  ]);
  assert.equal(serialized.deliveryState, "pending");
  assert.equal(serialized.humanReviewRequired, true);
  assert.equal(serialized.reviewStatus, "human_review_required");
  assert.equal(serialized.sharedCounts.sharedCauseCount, 1);
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
  assert.equal(row.delivery_state, "pending");
  assert.equal(row.review_status, "human_review_required");
  assert.equal(row.human_review_required, true);
  assert.equal(row.next_step_type, "request_intro_packet");
  assert.equal(row.hidden_fields_notice, BACKGROUND_BRIEF_HIDDEN_FIELDS_NOTICE);
  assert.equal("access_level" in row, false);
  assert.equal("identity_revealed" in row, false);
});

test("opportunity brief feedback maps to bg12 delivery lifecycle states", () => {
  assert.equal(getOpportunityBriefDeliveryStateForFeedback("interested"), "interested");
  assert.equal(getOpportunityBriefDeliveryStateForFeedback("maybe_later"), "maybe_later");
  assert.equal(getOpportunityBriefDeliveryStateForFeedback("dismissed"), "dismissed");
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
  assert.ok((packet.mutual_questions ?? []).some((question) => /no trade/i.test(question)));
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
