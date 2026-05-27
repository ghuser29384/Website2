import test from "node:test";
import assert from "node:assert/strict";

import {
  buildMatchExplanation,
  formatGrantExpiry,
  getMatchWorkflowStage,
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
    "waiting_for_counterparty",
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
});

test("grant expiry text distinguishes expiring grants from revocation-only grants", () => {
  assert.equal(formatGrantExpiry(null), "until revoked");
  assert.match(formatGrantExpiry("2030-01-02T00:00:00.000Z"), /expires/);
});
