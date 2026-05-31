import test from "node:test";
import assert from "node:assert/strict";

import {
  buildMatchInboxBadges,
  buildMatchExplanationSnapshot,
  buildPrivacySafeMatchAuditMetadata,
  buildPrivacySafeMatchAuditSummary,
  buildPrivacySafeMatchDigestLine,
  buildMatchExplanation,
  formatGrantExpiry,
  getMatchWorkflowStage,
  getMatchScoreBucket,
  getPrivacySafeFactorCodes,
} from "@/lib/background-explanations";

test("privacy-safe factor codes summarize match basis without raw explanation text", () => {
  const codes = getPrivacySafeFactorCodes(
    [
      "Compatibility tag: cause_overlap",
      "Shared terms: private-never-email-this",
      "Saved search hit",
      "Both sides have verification preferences recorded",
    ],
    "saved-search-cron",
  );

  assert.deepEqual(codes.sort(), [
    "cause_overlap",
    "deterministic_scan",
    "saved_search_hit",
    "verification_ready",
  ]);
});

test("match explanations list safe surfaces and redact sensitive surfaces", () => {
  const explanation = buildMatchExplanation({
    canRevealIdentity: false,
    counterpartyConsented: false,
    generatedBy: "rule-based",
    matchBasis: ["Compatibility tag: source_supported", "Compatibility tag: privacy_aligned"],
    riskNotes: "",
    score: 68,
    sharedCauses: ["Animal welfare"],
    status: "suggested",
    suggestedFirstStep: "Compare a bounded trade sketch.",
    viewerConsented: false,
  });

  assert.equal(explanation.confidenceBand, "Moderate");
  assert.ok(explanation.scannedSurfaces.includes("Saved wish profile"));
  assert.ok(explanation.scannedSurfaces.includes("Manual source summaries"));
  assert.ok(explanation.redactedSurfaces.includes("Exact wishes"));
  assert.match(explanation.provenance, /confidence band is a review prompt/);
  assert.deepEqual(explanation.reasonCodes.sort(), [
    "Deterministic scan",
    "Privacy aligned",
    "Source supported",
  ]);
  assert.equal(explanation.workflowStage.key, "suggested");
});

test("match inbox badges expose trust, risk, and safe action labels", () => {
  const badges = buildMatchInboxBadges({
    canRevealIdentity: false,
    counterpartyConsented: false,
    generatedBy: "rule-based",
    hasConciergeReview: true,
    matchBasis: ["Compatibility tag: privacy_aligned"],
    riskNotes: "Needs operator check before introduction.",
    score: 64,
    sharedCauses: ["Climate"],
    status: "suggested",
    suggestedFirstStep: "Ask one narrow mutual question.",
    viewerConsented: true,
  });

  assert.equal(badges.trustBadge.key, "operator_triage");
  assert.equal(badges.riskBadge.key, "risk_note_present");
  assert.ok(badges.participantActions.includes("Request narrower disclosure"));
  assert.ok(badges.participantActions.includes("Report"));
});

test("match inbox badges pause reported suggestions before more disclosure", () => {
  const badges = buildMatchInboxBadges({
    canRevealIdentity: true,
    counterpartyConsented: true,
    generatedBy: "saved-search-cron",
    hasOpenReport: true,
    matchBasis: ["Compatibility tag: verification_ready"],
    riskNotes: "",
    score: 82,
    sharedCauses: ["Animal welfare"],
    status: "suggested",
    suggestedFirstStep: "Compare a bounded proposal.",
    viewerConsented: true,
  });

  assert.equal(badges.trustBadge.key, "review_paused");
  assert.equal(badges.riskBadge.key, "report_open");
  assert.equal(badges.trustBadge.tone, "blocked");
  assert.equal(badges.riskBadge.tone, "blocked");
});

test("workflow stages reflect consent state", () => {
  assert.equal(
    getMatchWorkflowStage({
      canRevealIdentity: false,
      counterpartyConsented: false,
      status: "suggested",
      viewerConsented: true,
    }).key,
    "grant_pending",
  );

  assert.equal(
    getMatchWorkflowStage({
      canRevealIdentity: true,
      counterpartyConsented: true,
      status: "suggested",
      viewerConsented: true,
    }).key,
    "intro_ready",
  );

  assert.equal(
    getMatchWorkflowStage({
      canRevealIdentity: false,
      counterpartyConsented: false,
      hasOpenDetailRequest: true,
      status: "suggested",
      viewerConsented: false,
    }).key,
    "detail_requested",
  );
});

test("grant expiry text distinguishes expiring grants from revocation-only grants", () => {
  assert.equal(formatGrantExpiry(null), "until revoked");
  assert.match(formatGrantExpiry("2030-01-02T00:00:00.000Z"), /expires/);
});

test("match explanation snapshots use buckets and durable version labels", () => {
  const snapshot = buildMatchExplanationSnapshot({
    canRevealIdentity: false,
    counterpartyConsented: false,
    generatedBy: "saved-search-cron",
    matchBasis: ["Saved search hit", "Compatibility tag: cause_overlap"],
    matchId: "match-1",
    profileId: "profile-1",
    riskNotes: "",
    score: 77,
    sharedCauses: ["Private cause name"],
    sourceRunKind: "saved_search_scan",
    status: "suggested",
    suggestedFirstStep: "Compare a bounded proposal.",
    viewerConsented: false,
  });

  assert.equal(snapshot.explanation_version, "background-explanation-v1");
  assert.equal(snapshot.score_bucket, "75-100");
  assert.equal(snapshot.workflow_stage, "suggested");
  assert.deepEqual(snapshot.factor_codes.sort(), [
    "cause_overlap",
    "deterministic_scan",
    "saved_search_hit",
  ]);
});

test("privacy-safe audit metadata keeps counts instead of raw shared terms", () => {
  const metadata = buildPrivacySafeMatchAuditMetadata({
    compatibilityTags: ["cause_overlap", "source_supported"],
    runReason: "manual-refresh",
    sharedCauseCount: 2,
    sharedTokenCount: 4,
  });

  assert.deepEqual(metadata.compatibilityTags.sort(), ["cause_overlap", "source_supported"]);
  assert.equal(metadata.sharedCauseCount, 2);
  assert.equal(metadata.sharedTokenCount, 4);
  assert.equal(getMatchScoreBucket(30), "25-44");
});

test("privacy-safe match run summaries expose confidence bands without exact scores", () => {
  const auditSummary = buildPrivacySafeMatchAuditSummary({
    score: 83,
    sourceLabel: "Saved-search scan",
  });
  const digestLine = buildPrivacySafeMatchDigestLine({
    publicPreview: "Broad animal welfare preview for a possible pledge swap.",
    score: 83,
  });

  assert.match(auditSummary, /high confidence compatibility/);
  assert.match(auditSummary, /no automatic introduction or moral ranking/);
  assert.doesNotMatch(auditSummary, /83|score|\/100/);
  assert.match(digestLine, /high confidence/);
  assert.match(digestLine, /broad-preview only/);
  assert.doesNotMatch(digestLine, /83|score|\/100/);
});
