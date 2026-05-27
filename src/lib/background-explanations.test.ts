import test from "node:test";
import assert from "node:assert/strict";

import {
  buildMatchExplanationSnapshot,
  buildPrivacySafeMatchAuditMetadata,
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
  assert.equal(explanation.workflowStage.key, "suggested");
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
