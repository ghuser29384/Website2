import assert from "node:assert/strict";
import test from "node:test";

import {
  BACKGROUND_AI_SHADOW_ALLOWED_USE,
  BACKGROUND_AI_SHADOW_EVALUATION_VERSION,
  buildBackgroundAiShadowEvaluation,
  getBackgroundAiShadowBlockers,
  getBackgroundAiShadowContract,
  redactBackgroundAiShadowSummary,
  summarizeBackgroundAiShadowReadiness,
  validateBackgroundAiShadowContract,
} from "@/lib/background-ai-shadow";

const NOW = new Date("2026-05-31T12:00:00.000Z");

test("background AI shadow evaluation only uses approved summaries from consented sources", () => {
  const evaluation = buildBackgroundAiShadowEvaluation({
    now: NOW,
    sourceConnection: {
      access_status: "connected",
      ai_shadow_mode_allowed: true,
      allowed_field_keys: ["cause_priorities", "capability_tags", "unknown"],
      label: "Public essay",
      last_sync_summary:
        "Essay mentions climate adaptation work. Contact alex@example.org or https://example.org/team for details.",
      raw_ingestion_allowed: false,
      retention_expires_at: "2026-08-31T12:00:00.000Z",
    },
  });

  assert.equal(evaluation.evaluationVersion, BACKGROUND_AI_SHADOW_EVALUATION_VERSION);
  assert.equal(evaluation.allowedUse, BACKGROUND_AI_SHADOW_ALLOWED_USE);
  assert.equal(evaluation.status, "ready_for_shadow");
  assert.deepEqual(evaluation.approvedFieldKeys, ["cause_priorities", "capability_tags"]);
  assert.match(evaluation.redactedApprovedSummary, /\[redacted-email\]/);
  assert.match(evaluation.redactedApprovedSummary, /\[redacted-url\]/);
  assert.doesNotMatch(evaluation.redactedApprovedSummary, /alex@example\.org/);
  assert.doesNotMatch(evaluation.redactedApprovedSummary, /https:\/\/example\.org/);
});

test("background AI shadow evaluation refuses live or expired connector material", () => {
  const blockers = getBackgroundAiShadowBlockers(
    {
      access_status: "revoked",
      ai_shadow_mode_allowed: true,
      allowed_field_keys: ["offer_ask_terms"],
      last_sync_summary: "Approved summary",
      raw_ingestion_allowed: true,
      retention_expires_at: "2026-05-30T12:00:00.000Z",
    },
    NOW,
  );

  assert.ok(blockers.some((blocker) => blocker.includes("Raw ingestion")));
  assert.ok(blockers.some((blocker) => blocker.includes("connected")));
  assert.ok(blockers.some((blocker) => blocker.includes("expired")));
});

test("background AI shadow readiness counts enabled, ready, blocked, and expired sources", () => {
  const summary = summarizeBackgroundAiShadowReadiness(
    [
      {
        access_status: "connected",
        ai_shadow_mode_allowed: true,
        allowed_field_keys: ["availability_context"],
        last_sync_summary: "Approved summary",
        raw_ingestion_allowed: false,
        retention_expires_at: "2026-08-31T12:00:00.000Z",
      },
      {
        access_status: "connected",
        ai_shadow_mode_allowed: true,
        allowed_field_keys: ["capability_tags"],
        last_sync_summary: "Stale summary",
        raw_ingestion_allowed: false,
        retention_expires_at: "2026-05-30T12:00:00.000Z",
      },
      {
        access_status: "not_connected",
        ai_shadow_mode_allowed: false,
        allowed_field_keys: [],
        last_sync_summary: "",
        raw_ingestion_allowed: false,
      },
    ],
    NOW,
  );

  assert.deepEqual(summary, {
    blocked: 2,
    expired: 1,
    ready: 1,
    shadowEnabled: 2,
    total: 3,
  });
});

test("background AI shadow redaction strips phone-like contact details and truncates summaries", () => {
  const redacted = redactBackgroundAiShadowSummary(
    "Call +1 (555) 123-4567 about " + "coordination ".repeat(100),
    80,
  );

  assert.match(redacted, /\[redacted-phone\]/);
  assert.ok(redacted.length <= 82);
  assert.ok(redacted.endsWith("..."));
});

test("background AI shadow contract is public, nonmutating, and summary-only", () => {
  const contract = getBackgroundAiShadowContract();
  const validation = validateBackgroundAiShadowContract(contract);

  assert.equal(validation.status, "pass");
  assert.deepEqual(validation.blockers, []);
  assert.equal(contract.stateMutation, false);
  assert.equal(contract.decisioningMode, "approved_summary_shadow_evaluation_only");
  assert.ok(contract.requiredSourceFields.includes("last_sync_summary"));
  assert.ok(contract.requiredSourceFields.includes("ai_shadow_mode_allowed"));
  assert.ok(contract.prohibitedEffects.includes("live_match_suggestion"));
  assert.ok(contract.prohibitedEffects.includes("analytics_copy_of_raw_content"));
  assert.equal(contract.sampleReadyEvaluation.status, "ready_for_shadow");
  assert.equal(contract.sampleBlockedEvaluation.status, "not_allowed");
  assert.match(contract.sampleReadyEvaluation.redactedApprovedSummary, /\[redacted-email\]/);
});
