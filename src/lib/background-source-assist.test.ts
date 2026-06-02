import assert from "node:assert/strict";
import test from "node:test";

import {
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

test("approved source draft signals become active profile signal rows", () => {
  const draft = buildReviewedSourceDraftSummary({
    allowedFieldKeys: ["verification_preferences"],
    rawText: "Evidence, proof, receipts, and independent review would make this credible.",
  });
  const rows = buildBackgroundProfileSignalRows({
    draft,
    expiresAt: "2099-01-01T00:00:00.000Z",
    profileId: "profile-1",
    sourceConnectionId: "connection-1",
    sourceSummaryId: "summary-1",
  });

  assert.ok(rows.length > 0);
  assert.equal(rows[0]?.profile_id, "profile-1");
  assert.equal(rows[0]?.source, "approved_source_summary");
  assert.equal(rows[0]?.source_connection_id, "connection-1");
  assert.equal(rows[0]?.source_summary_id, "summary-1");
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
