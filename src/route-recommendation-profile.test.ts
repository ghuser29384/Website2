import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const profileRoute = readFileSync(
  "src/app/api/live-now/route-profile/route.ts",
  "utf8",
);
const migration = readFileSync(
  "supabase/migrations/20260718205245_route_recommendation_profiles.sql",
  "utf8",
);
const storageGuards = readFileSync(
  "supabase/migrations/20260722171951_route_profile_storage_guards.sql",
  "utf8",
);
const validatorGrants = readFileSync(
  "supabase/migrations/20260722172139_route_profile_validator_grants.sql",
  "utf8",
);
const databaseTypes = readFileSync("src/lib/supabase/database.types.ts", "utf8");

test("route preference writes require the authenticated owner and remain private", () => {
  assert.match(profileRoute, /hasSupabaseAuthCookie/);
  assert.match(profileRoute, /getViewer\(\)/);
  assert.match(profileRoute, /profileId = viewer\.authUser\.id/);
  assert.match(profileRoute, /from\("route_recommendation_profiles"\)/);
  assert.match(profileRoute, /Cache-Control[\s\S]*private, no-store/);
  assert.match(profileRoute, /Vary: "Cookie"/);
  assert.match(profileRoute, /isSameOriginMutation\(request\)/);
  assert.match(profileRoute, /content-type/);
  assert.doesNotMatch(profileRoute, /service.role|serviceRole|SUPABASE_SERVICE_ROLE_KEY/i);
});

test("free-text route inputs are encrypted and plaintext columns receive placeholders", () => {
  for (const field of [
    "route_recommendation_profiles.goal",
    "route_recommendation_profiles.cause_priorities",
    "route_recommendation_profiles.otherwise_baseline",
  ]) {
    assert.match(profileRoute, new RegExp(field.replaceAll(".", "\\.")));
  }
  assert.match(profileRoute, /encryptBackgroundSensitiveText/);
  assert.match(profileRoute, /decryptBackgroundSensitiveText/);
  assert.match(profileRoute, /BACKGROUND_ENCRYPTED_TEXT_PLACEHOLDER/);
  assert.match(profileRoute, /cause_priorities: \[\]/);
  assert.match(profileRoute, /ciphertexts\[fieldKey\] && !wasProvided/);
  assert.match(storageGuards, /goal = '\[encrypted private field\]'/);
  assert.match(storageGuards, /cause_priorities = '\{\}'::text\[\]/);
  assert.match(storageGuards, /route_profile_ciphertexts_valid/);
  assert.match(storageGuards, /from anon/);
  assert.match(validatorGrants, /from anon/);
  assert.doesNotMatch(profileRoute, /hardConstraints|hard_constraints/);
  assert.doesNotMatch(storageGuards, /route_recommendation_profiles\.hard_constraints/);
});

test("calibration stores bounded structured choices rather than arbitrary interview text", () => {
  assert.match(profileRoute, /PAIRWISE_CHOICES/);
  for (const choice of ["left", "right", "equal", "neither", "unsure"]) {
    assert.match(profileRoute, new RegExp(`"${choice}"`));
  }
  assert.match(profileRoute, /guided-route-interview-v1/);
  assert.match(profileRoute, /confirmedAt/);
  assert.match(profileRoute, /updatePairwiseAnswers/);
  assert.match(profileRoute, /comparison_limit/);
  assert.doesNotMatch(profileRoute, /interview_answers:\s*(body|input|profileInput)/);
});

test("route profiles are owner-only under database RLS and are represented in generated types", () => {
  assert.match(migration, /enable row level security/i);
  assert.match(migration, /revoke all on table public\.route_recommendation_profiles from anon/i);
  assert.match(migration, /to authenticated\s+using \(\(select auth\.uid\(\)\) = profile_id\)/i);
  assert.match(migration, /with check \(\(select auth\.uid\(\)\) = profile_id\)/i);
  assert.match(databaseTypes, /route_recommendation_profiles:/);
  assert.match(databaseTypes, /planned_donation_baseline: boolean/);
  assert.match(databaseTypes, /pairwise_answers: Json/);
});
