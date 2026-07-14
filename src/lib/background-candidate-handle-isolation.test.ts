import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  buildBackgroundCandidateReferenceHandle,
  canResolveBackgroundCandidateHandle,
  redactBackgroundCandidateHandleMapping,
  serializeBackgroundCandidateHandleForDiagnostics,
} from "@/lib/background-identity-boundaries";

const RUN_A = "11111111-1111-4111-8111-111111111111";
const RUN_B = "22222222-2222-4222-8222-222222222222";
const CANDIDATE_ID = "33333333-3333-4333-8333-333333333333";
const NOW = new Date("2026-06-15T00:00:00.000Z");

test("candidate handles are scoped per run and do not expose stable candidate identifiers in diagnostics", () => {
  const first = buildBackgroundCandidateReferenceHandle({
    candidateProfileId: CANDIDATE_ID,
    delegateRunId: RUN_A,
    now: NOW,
    purposeCode: "moral_trade_offer",
    salt: "per-run-secret-salt-a",
  });
  const secondRun = buildBackgroundCandidateReferenceHandle({
    candidateProfileId: CANDIDATE_ID,
    delegateRunId: RUN_B,
    now: NOW,
    purposeCode: "moral_trade_offer",
    salt: "per-run-secret-salt-a",
  });
  const diagnostics = serializeBackgroundCandidateHandleForDiagnostics({
    handle_state: "active",
    handle_token: first.handle_token,
    purpose_code: "moral_trade_offer",
  });

  assert.match(first.handle_token, /^bgch_[0-9a-f]{32}$/);
  assert.notEqual(first.handle_token, secondRun.handle_token);
  assert.equal(JSON.stringify(diagnostics).includes(CANDIDATE_ID), false);
  assert.equal(diagnostics.stableIdentityReturned, false);
});

test("candidate handle resolution requires an allowed reason and fresh policy decision", () => {
  const handle = {
    allowed_resolution_reasons: ["operator_review", "mutual_consent"] as Array<
      "operator_review" | "mutual_consent"
    >,
    candidate_profile_id: CANDIDATE_ID,
    handle_state: "active" as const,
    policy_decision_id: null,
    retention_expires_at: "2099-01-01T00:00:00.000Z",
  };
  const allowed = canResolveBackgroundCandidateHandle({
    handle,
    policyDecisionId: "bgpd_1234567890abcdef12345678",
    reason: "operator_review",
  });
  const analytics = canResolveBackgroundCandidateHandle({
    handle,
    policyDecisionId: "bgpd_1234567890abcdef12345678",
    reason: "analytics",
  });
  const missingPolicy = canResolveBackgroundCandidateHandle({
    handle,
    reason: "operator_review",
  });

  assert.equal(allowed.allowed, true);
  assert.equal(analytics.allowed, false);
  assert.ok(analytics.blockerCodes.includes("candidate_handle_resolution_reason_not_allowed"));
  assert.ok(missingPolicy.blockerCodes.includes("fresh_policy_decision_required"));
});

test("candidate handle redaction clears stable mappings for privacy and retention events", () => {
  const redaction = redactBackgroundCandidateHandleMapping(NOW, "redacted");

  assert.equal(redaction.candidate_profile_id, null);
  assert.equal(redaction.policy_decision_id, null);
  assert.equal(redaction.handle_state, "redacted");
  assert.equal(redaction.redacted_at, NOW.toISOString());
});

test("candidate reference handle storage stays service-role-only and internal", () => {
  const migrationSource = readFileSync(
    "supabase/migrations/20260615_background_identity_boundary_controls.sql",
    "utf8",
  );
  const typesSource = readFileSync("src/lib/supabase/database.types.ts", "utf8");

  assert.match(migrationSource, /background_candidate_reference_handles/);
  assert.match(migrationSource, /enable row level security/);
  assert.match(migrationSource, /grant all on public\.background_candidate_reference_handles to service_role/);
  assert.doesNotMatch(
    migrationSource,
    /background_candidate_reference_handles[\s\S]{0,500}to authenticated/,
  );
  assert.match(typesSource, /background_candidate_reference_handles/);
  assert.match(typesSource, /allowed_resolution_reasons/);
});
