import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  BACKGROUND_SOURCE_TAG_CONFIRMATION_VERSION,
  BACKGROUND_SOURCE_ASSIST_ALLOWED_USE,
  buildBackgroundProfileSignalRows,
  buildReviewedSourceDraftSummary,
  redactBackgroundSourceAssistRawText,
  validateBackgroundSourceAssistLane,
} from "@/lib/background-source-assist";

test("source-assisted draft summaries redact contact payloads before persistence", () => {
  const rawText =
    'Email alex@example.org or call +1 415 555 0199 after reading "this exact private sentence should not be retained" at 123 Market Street. Climate grantmaking proof and weekly review are relevant.';

  const { redactedText, redactionReport } = redactBackgroundSourceAssistRawText(rawText);

  assert.equal(redactionReport.removedEmails, 1);
  assert.equal(redactionReport.removedPhones, 1);
  assert.equal(redactionReport.removedDirectQuotes, 1);
  assert.equal(redactionReport.removedPreciseLocations, 1);
  assert.doesNotMatch(redactedText, /alex@example\.org/);
  assert.doesNotMatch(redactedText, /415 555 0199/);
  assert.doesNotMatch(redactedText, /exact private sentence/);
  assert.doesNotMatch(redactedText, /123 Market Street/);
});

test("source-assisted drafts produce only review-first allowed-field signals", () => {
  const draft = buildReviewedSourceDraftSummary({
    allowedFieldKeys: ["cause_priorities", "capability_tags", "not_allowed"],
    rawText:
      "Climate adaptation research and grantmaking review capacity could support a donor circle.",
  });

  assert.equal(draft.allowedUse, BACKGROUND_SOURCE_ASSIST_ALLOWED_USE);
  assert.deepEqual(draft.allowedFieldKeys, ["cause_priorities", "capability_tags"]);
  assert.ok(draft.extractedSignals.length > 0);
  assert.ok(
    draft.extractedSignals.every((signal) =>
      ["cause_priorities", "capability_tags"].includes(signal.allowedFieldKey),
    ),
  );
});

test("explicitly confirmed source draft signals become active profile signal rows", () => {
  const draft = buildReviewedSourceDraftSummary({
    allowedFieldKeys: ["verification_preferences"],
    rawText: "Evidence, proof, receipts, and independent review would make this credible.",
  });
  const rows = buildBackgroundProfileSignalRows({
    draft,
    expiresAt: "2099-01-01T00:00:00.000Z",
    profileId: "profile-1",
    purposeCode: "moral_trade_offer",
    purposePolicyVersion: "background-purpose-policy-v1",
    sourceConnectionId: "connection-1",
    sourceSummaryId: "summary-1",
    sourceSummaryVersion: 2,
  });

  assert.ok(rows.length > 0);
  assert.equal(rows[0]?.profile_id, "profile-1");
  assert.equal(rows[0]?.source, "approved_source_summary");
  assert.equal(rows[0]?.source_connection_id, "connection-1");
  assert.equal(rows[0]?.source_summary_id, "summary-1");
  assert.equal(rows[0]?.source_summary_version, 2);
  assert.equal(rows[0]?.confirmation_kind, "explicit_participant_confirmation");
  assert.equal(rows[0]?.confirmation_actor_profile_id, "profile-1");
  assert.equal(rows[0]?.confirmation_policy_version, BACKGROUND_SOURCE_TAG_CONFIRMATION_VERSION);
  assert.equal(rows[0]?.lineage_status, "active");
  assert.match(rows[0]?.signal_fingerprint ?? "", /^sha256:[a-f0-9]{64}$/);
  assert.equal(rows[0]?.status, "active");
});

test("source-assisted lane forbids raw ingestion and continuous sync", () => {
  const validation = validateBackgroundSourceAssistLane({
    allowedFieldKeys: ["cause_priorities", "not_allowed"],
    consentNote: "Use this export only for broad matching context.",
    continuousSyncRequested: true,
    rawIngestionAllowed: true,
    retentionDays: 90,
    sourceKind: "email_export",
  });

  assert.equal(validation.rawIngestionAllowed, false);
  assert.equal(validation.sourceKind, "email_export");
  assert.deepEqual(validation.allowedFieldKeys, ["cause_priorities"]);
  assert.ok(validation.errors.some((error) => /raw source ingestion/i.test(error)));
  assert.ok(validation.errors.some((error) => /continuous/i.test(error)));
});

test("source-summary approval and tag confirmation stay separate", () => {
  const approvalRoute = readFileSync(
    "src/app/api/background/source-summaries/[id]/approve/route.ts",
    "utf8",
  );
  const confirmRoute = readFileSync(
    "src/app/api/background/source-summaries/[id]/confirm-tags/route.ts",
    "utf8",
  );

  assert.doesNotMatch(approvalRoute, /\.from\("background_profile_signals"\)\.insert/);
  assert.match(approvalRoute, /source_summary_approved_without_match_inputs/);
  assert.match(confirmRoute, /background\.source_summary\.confirm_tags/);
  assert.match(confirmRoute, /\.from\("background_profile_signals"\)[\s\S]{0,180}\.insert/);
  assert.match(confirmRoute, /privateThirdPartyDataReviewed/);
  assert.match(confirmRoute, /containsPrivateThirdPartyData/);
});
