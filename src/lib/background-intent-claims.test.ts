import assert from "node:assert/strict";
import test from "node:test";

import {
  BACKGROUND_INTENT_CLAIM_VERSION,
  buildBackgroundIntentClaims,
  formatBackgroundIntentClaimType,
} from "@/lib/background-intent-claims";
import type { Database } from "@/lib/supabase/database.types";

type WishProfileRow = Database["public"]["Tables"]["wish_profiles"]["Row"];
type SourceConnectionRow = Database["public"]["Tables"]["source_connections"]["Row"];
type BackgroundSourceSummaryRow =
  Database["public"]["Tables"]["background_source_summaries"]["Row"];

const baseProfile: Pick<
  WishProfileRow,
  | "background_search_enabled"
  | "causes"
  | "match_frequency"
  | "openness_to_payment"
  | "openness_to_pledges"
  | "participant_kind"
  | "privacy_stage"
  | "profile_id"
  | "share_public_preview"
> = {
  background_search_enabled: true,
  causes: ["Animal welfare", "Global health"],
  match_frequency: "weekly",
  openness_to_payment: true,
  openness_to_pledges: false,
  participant_kind: "individual",
  privacy_stage: "broad",
  profile_id: "00000000-0000-0000-0000-000000000001",
  share_public_preview: true,
};

test("background intent claims are deterministic and generated from explicit surfaces", () => {
  const claims = buildBackgroundIntentClaims({
    profile: baseProfile,
    synthesis: {
      ask_terms: ["vegetarian", "introductions"],
      capability_tags: ["funding"],
      confidence_score: 82,
      constraint_flags: ["privacy"],
      missing_fields: ["verification_preferences"],
      offer_terms: ["donation"],
      source_count: 1,
      uncertainty_flags: ["needs_evidence"],
    },
  });
  const keys = claims.map((claim) => claim.claim_key);

  assert.ok(keys.includes("cause_priority:animal_welfare"));
  assert.ok(keys.includes("ask_term:vegetarian"));
  assert.ok(keys.includes("offer_term:donation"));
  assert.ok(keys.includes("missing_field:verification_preferences"));
  assert.equal(new Set(keys).size, keys.length);
  assert.ok(claims.every((claim) => claim.claim_version === BACKGROUND_INTENT_CLAIM_VERSION));
  assert.ok(claims.every((claim) => claim.profile_id === baseProfile.profile_id));
  assert.equal(
    claims.find((claim) => claim.claim_key === "ask_term:vegetarian")?.confidence_band,
    "high",
  );
});

test("background intent claims redact contact-like values and skip raw source text", () => {
  const sourceConnection: Pick<
    SourceConnectionRow,
    "access_status" | "allowed_field_keys" | "id" | "provider" | "retention_expires_at"
  > = {
    access_status: "connected",
    allowed_field_keys: ["cause_priorities", "capability_tags"],
    id: "00000000-0000-0000-0000-000000000002",
    provider: "blog",
    retention_expires_at: "2099-01-01T00:00:00.000Z",
  };
  const sourceSummary: Pick<
    BackgroundSourceSummaryRow,
    "allowed_field_keys" | "id" | "retention_expires_at" | "source_type" | "status"
  > = {
    allowed_field_keys: ["verification_preferences"],
    id: "00000000-0000-0000-0000-000000000003",
    retention_expires_at: "2099-01-01T00:00:00.000Z",
    source_type: "manual",
    status: "active",
  };
  const claims = buildBackgroundIntentClaims({
    profile: baseProfile,
    sourceConnections: [sourceConnection],
    sourceSummaries: [sourceSummary],
    synthesis: {
      ask_terms: ["person@example.org", "https://private.example/path"],
      confidence_score: 60,
    },
  });
  const serialized = JSON.stringify(claims);

  assert.equal(serialized.includes("person@example.org"), false);
  assert.equal(serialized.includes("https://private.example/path"), false);
  assert.ok(serialized.includes("[redacted-email]"));
  assert.ok(serialized.includes("[redacted-url]"));
  assert.ok(
    claims.some(
      (claim) =>
        claim.claim_type === "source_permission" &&
        claim.claim_value === "blog:cause_priorities",
    ),
  );
  assert.ok(
    claims.some(
      (claim) =>
        claim.claim_type === "source_permission" &&
        claim.claim_value === "manual:verification_preferences",
    ),
  );
});

test("expired or unreviewed source surfaces do not become intent claims", () => {
  const claims = buildBackgroundIntentClaims({
    profile: baseProfile,
    sourceConnections: [
      {
        access_status: "needs_review",
        allowed_field_keys: ["cause_priorities"],
        id: "00000000-0000-0000-0000-000000000004",
        provider: "email",
        retention_expires_at: "2099-01-01T00:00:00.000Z",
      },
    ],
    sourceSummaries: [
      {
        allowed_field_keys: ["capability_tags"],
        id: "00000000-0000-0000-0000-000000000005",
        retention_expires_at: "2000-01-01T00:00:00.000Z",
        source_type: "chat_history",
        status: "active",
      },
    ],
  });

  assert.equal(
    claims.some((claim) => claim.claim_value?.includes("email:cause_priorities") ?? false),
    false,
  );
  assert.equal(
    claims.some((claim) => claim.claim_value?.includes("chat_history:capability_tags") ?? false),
    false,
  );
});

test("intent claim labels are stable for dashboard display", () => {
  assert.equal(formatBackgroundIntentClaimType("ask_term"), "Ask signal");
  assert.equal(formatBackgroundIntentClaimType("source_permission"), "Source permission");
  assert.equal(formatBackgroundIntentClaimType("unknown_kind"), "unknown kind");
});
