import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  BACKGROUND_BRIEF_HIDDEN_FIELDS_NOTICE,
  BACKGROUND_OPPORTUNITY_BRIEF_CARD_SCHEMA_VERSION,
  BACKGROUND_OPPORTUNITY_BRIEF_LIST_RESPONSE_SCHEMA_VERSION,
  buildBackgroundDelegateReceiptRow,
  buildOpportunityBriefListResponse,
  buildIntroPacketRow,
  buildOpportunityBriefRow,
  buildSourceSummaryRows,
  getBackgroundSourceRetentionExpiresAt,
  getGrantReceiptStatus,
  getOpportunityBriefDeliveryStateForFeedback,
  serializeOpportunityBriefCard,
  validateOpportunityBriefListResponse,
  validateIntroPacketInput,
  validateRequesterOpportunityBriefCard,
} from "@/lib/background-opportunity-briefs";
import { BACKGROUND_PURPOSE_POLICY_VERSION } from "@/lib/background-purpose-registry";

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
    purposeCode: "research_collaboration",
    purposePolicyVersion: BACKGROUND_PURPOSE_POLICY_VERSION,
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
    expires_at: "2099-01-01T00:00:00.000Z",
    factor_codes: row.factor_codes ?? [],
    hidden_fields_notice: row.hidden_fields_notice ?? "",
    human_review_required: row.human_review_required ?? true,
    id: "brief-1",
    next_step_type: row.next_step_type ?? "review_profile",
    purpose_code: row.purpose_code,
    purpose_policy_version: row.purpose_policy_version,
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
  assert.equal(serialized.schemaVersion, BACKGROUND_OPPORTUNITY_BRIEF_CARD_SCHEMA_VERSION);
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
  assert.equal(serialized.purposeLabel, "Research collaboration");
  assert.equal(serialized.visibleCounts.sharedCauses, "1");
  assert.equal("candidate_profile_id" in serialized, false);
  assert.equal("match_id" in serialized, false);
  assert.equal("profile_id" in serialized, false);
  assert.equal("sharedCounts" in serialized, false);
  assert.deepEqual(row.factor_codes?.sort(), [
    "cause_overlap",
    "deterministic_scan",
    "payment_compatible",
  ]);
});

test("requester opportunity brief cards reject extra or internal keys", () => {
  const card = serializeOpportunityBriefCard({
    confidence_band: "Exploratory",
    delivery_state: "pending",
    expires_at: "2099-01-01T00:00:00.000Z",
    factor_codes: ["cause_overlap"],
    hidden_fields_notice: BACKGROUND_BRIEF_HIDDEN_FIELDS_NOTICE,
    human_review_required: true,
    id: "brief-extra-key",
    next_step_type: "request_intro_packet",
    redacted_fields: ["exact wish"],
    reveal_consequence_notice: "Reviewed request required.",
    review_status: "human_review_required",
    safe_summary: "Broad preview compatibility.",
    shared_counts: { factorCodeCount: 1, redactedSurfaceCount: 1, sharedCauseCount: 1 },
    status: "open",
    title: "Opportunity brief",
    why_text: "Broad preview compatibility.",
  });

  assert.equal(
    validateRequesterOpportunityBriefCard(card as unknown as Record<string, unknown>).status,
    "pass",
  );

  const validation = validateRequesterOpportunityBriefCard({
    ...card,
    candidate_profile_id: "counterparty-1",
  });

  assert.equal(validation.status, "fail");
  assert.deepEqual(validation.extraKeys, ["candidate_profile_id"]);
  assert.deepEqual(validation.unsafeKeys, ["candidate_profile_id"]);
});

test("requester opportunity brief list responses are versioned and exact-key validated", () => {
  const card = serializeOpportunityBriefCard({
    confidence_band: "Exploratory",
    delivery_state: "pending",
    expires_at: "2099-01-01T00:00:00.000Z",
    factor_codes: ["cause_overlap"],
    hidden_fields_notice: BACKGROUND_BRIEF_HIDDEN_FIELDS_NOTICE,
    human_review_required: true,
    id: "brief-list-response",
    next_step_type: "request_intro_packet",
    redacted_fields: ["exact wish"],
    reveal_consequence_notice: "Reviewed request required.",
    review_status: "human_review_required",
    safe_summary: "Broad preview compatibility.",
    shared_counts: { factorCodeCount: 1, redactedSurfaceCount: 1, sharedCauseCount: 1 },
    status: "open",
    title: "Opportunity brief",
    why_text: "Broad preview compatibility.",
  });
  const response = buildOpportunityBriefListResponse({
    briefs: [card],
    privacyNotice: "Broad previews only.",
    rollout: { enabled: true },
  });

  assert.equal(
    response.schemaVersion,
    BACKGROUND_OPPORTUNITY_BRIEF_LIST_RESPONSE_SCHEMA_VERSION,
  );
  assert.equal(
    validateOpportunityBriefListResponse(response as unknown as Record<string, unknown>).status,
    "pass",
  );
  assert.equal(
    validateOpportunityBriefListResponse({ ...response, debug: { candidateProfileId: "hidden" } })
      .status,
    "fail",
  );
});

test("requester opportunity brief surfaces avoid wildcard selects and hidden target fields", () => {
  const apiSource = readFileSync("src/app/api/background/opportunity-briefs/route.ts", "utf8");
  const appDataSource = readFileSync("src/lib/app-data.ts", "utf8");
  const dashboardSource = readFileSync("src/app/dashboard/page.tsx", "utf8");

  assert.doesNotMatch(
    apiSource,
    /from\("background_opportunity_briefs"\)[\s\S]{0,220}\.select\("\*"\)/,
  );
  assert.doesNotMatch(apiSource, /candidate_profile_id|match_id/);
  assert.doesNotMatch(
    appDataSource,
    /from\("background_opportunity_briefs"\)[\s\S]{0,220}\.select\("\*"\)/,
  );
  assert.doesNotMatch(dashboardSource, /brief\.candidate_profile_id/);
  assert.doesNotMatch(dashboardSource, /name="counterparty_profile_id"/);
});

test("background scan artifacts stay requester-owned until consent gates pass", () => {
  const savedSearchSource = readFileSync("src/app/api/jobs/saved-searches/route.ts", "utf8");
  const delegateSource = readFileSync("src/app/api/jobs/delegates/route.ts", "utf8");
  const actionsSource = readFileSync("src/app/actions.ts", "utf8");
  const schemaSource = readFileSync("supabase/schema.sql", "utf8");
  const migrationSource = readFileSync(
    "supabase/migrations/20260607_background_networking_bg50_purpose_receipts.sql",
    "utf8",
  );

  assert.match(savedSearchSource, /background_owner_profile_id:\s*search\.profile_id/);
  assert.match(delegateSource, /background_owner_profile_id:\s*delegate\.profile_id/);
  assert.match(actionsSource, /background_owner_profile_id:\s*profileId/);
  assert.doesNotMatch(savedSearchSource, /profileId:\s*preview\.profile_id/);
  assert.doesNotMatch(savedSearchSource, /profile_id:\s*preview\.profile_id/);
  assert.doesNotMatch(delegateSource, /profileId:\s*preview\.profile_id/);
  assert.doesNotMatch(delegateSource, /profile_id:\s*preview\.profile_id/);
  assert.doesNotMatch(actionsSource, /profileId:\s*preview\.profile_id/);
  assert.doesNotMatch(actionsSource, /profile_id:\s*preview\.profile_id/);
  assert.match(schemaSource, /match_suggestions\.background_owner_profile_id = auth\.uid\(\)/);
  assert.match(
    migrationSource,
    /match_suggestions\.background_owner_profile_id = auth\.uid\(\)/,
  );
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
    purposeCode: "pledge_swap",
    purposePolicyVersion: BACKGROUND_PURPOSE_POLICY_VERSION,
    requestedFieldKeys: ["exact_wish", "source_summary", "exact_wish"],
    requesterProfileId: "profile-3",
  });

  assert.deepEqual(packet.requested_field_keys, ["exact_wish", "source_summary"]);
  assert.equal(packet.purpose_code, "pledge_swap");
  assert.equal(packet.purpose_policy_version, BACKGROUND_PURPOSE_POLICY_VERSION);
  assert.equal(packet.review_state, "requested");
  assert.match(packet.reveal_capsule ?? "", /no contact details/i);
  assert.ok((packet.mutual_questions ?? []).some((question) => /no trade/i.test(question)));
});

test("delegate receipt rows are redacted and purpose-bound", () => {
  const receipt = buildBackgroundDelegateReceiptRow({
    factorCount: 2,
    profileId: "profile-5",
    publicSummary:
      "Reviewed introduction request submitted. No outreach or private detail was sent.",
    purposeCode: "community_intro",
    purposePolicyVersion: BACKGROUND_PURPOSE_POLICY_VERSION,
    receiptKind: "intro_request",
    subjectId: "00000000-0000-0000-0000-000000000001",
    subjectKind: "intro_packet",
  });
  const rendered = JSON.stringify(receipt);

  assert.equal(receipt.purpose_code, "community_intro");
  assert.equal(receipt.purpose_policy_version, BACKGROUND_PURPOSE_POLICY_VERSION);
  assert.equal(receipt.factor_count_bucket, "2_to_3");
  assert.equal(rendered.includes("counterparty"), false);
  assert.equal(rendered.includes("exact private wish"), false);
  assert.match(rendered, /privateDetailsReturned":false/);
});

test("intro packet validation rejects unsupported disclosure field keys", () => {
  const invalid = validateIntroPacketInput({
    purpose: "Decide whether a first bounded conversation is worth reviewing.",
    requestedFieldKeys: [
      "exact_wish",
      "contactDetails",
      "rawPrivateNotes",
      "protectedTraits",
    ],
  });

  assert.deepEqual(invalid.requestedFieldKeys, ["exact_wish"]);
  assert.ok(
    invalid.errors.some((error) =>
      error.includes(
        "Unsupported disclosure field keys are not allowed: contactDetails, rawPrivateNotes, protectedTraits.",
      ),
    ),
  );
});

test("intro packet validation rejects unsupported requester answer keys", () => {
  const invalid = validateIntroPacketInput({
    purpose: "Decide whether a first bounded conversation is worth reviewing.",
    requestedFieldKeys: ["exact_wish"],
    requesterAnswers: {
      contactDetails: "victoria@example.org",
      firstQuestion: "Can we review a bounded intro?",
      privacyConstraints: {
        contactDetails: "private@example.org",
        reviewBoundaries: "Broad previews only.",
      },
      proposedTradeShape: {
        format: "pledge_swap",
        rawPrivateNotes: "Exact private wish text",
      },
      protectedTraits: ["religion"],
      rawPrivateNotes: "Exact private wish text",
    },
  });
  const renderedErrors = invalid.errors.join(" ");

  assert.deepEqual(invalid.requesterAnswers, {
    firstQuestion: "Can we review a bounded intro?",
    privacyConstraints: { reviewBoundaries: "Broad previews only." },
    proposedTradeShape: { format: "pledge_swap" },
  });
  assert.match(renderedErrors, /privacyConstraints\.contactDetails/);
  assert.match(renderedErrors, /proposedTradeShape\.rawPrivateNotes/);
  assert.match(renderedErrors, /contactDetails, protectedTraits, rawPrivateNotes/);
  assert.equal(renderedErrors.includes("victoria@example.org"), false);
  assert.equal(renderedErrors.includes("Exact private wish text"), false);
});

test("intro packet rows store only approved structured requester answers", () => {
  const packet = buildIntroPacketRow({
    counterpartyProfileId: "counterparty-4",
    matchId: "match-4",
    opportunityBriefId: "brief-4",
    purpose: "Decide whether a first bounded conversation is worth reviewing.",
    requestedFieldKeys: ["exact_wish"],
    requesterAnswers: {
      firstQuestion: "Would a reviewed pledge swap intro be useful?",
      privacyConstraints: {
        allowedUse: ["reviewer triage"],
        reviewBoundaries: "Broad previews only.",
      },
      proposedTradeShape: {
        format: "pledge_swap",
        verificationMethod: "Reviewed receipt.",
      },
    },
    requesterProfileId: "profile-4",
  });

  assert.deepEqual(packet.requester_answers, {
    firstQuestion: "Would a reviewed pledge swap intro be useful?",
    privacyConstraints: {
      allowedUse: ["reviewer triage"],
      reviewBoundaries: "Broad previews only.",
    },
    proposedTradeShape: {
      format: "pledge_swap",
      verificationMethod: "Reviewed receipt.",
    },
  });
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
