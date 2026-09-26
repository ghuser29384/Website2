import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const migrationPath =
  "supabase/migrations/20260818174000_mpgf_dac_public_aggregate_column_privacy.sql";

async function migration() {
  return readFile(migrationPath, "utf8");
}

function grantBlock(source: string, table: string, roleClause: string) {
  const expression = new RegExp(
    `grant select \\(([\\s\\S]*?)\\) on table public\\.${table}\\s+to ${roleClause};`,
    "i",
  );
  const match = source.match(expression);
  assert.ok(match, `Expected a column-level SELECT grant for ${table}.`);
  return match[1];
}

test("public DAC aggregate privacy grants only the reviewed application columns", async () => {
  const source = await migration();

  assert.match(source, /^begin;/);
  assert.match(source, /commit;\s*$/);
  assert.match(
    source,
    /revoke all privileges on table public\.mpgf_public_goods_campaigns\s+from public, anon, authenticated;/,
  );
  assert.match(
    source,
    /revoke all privileges on table public\.mpgf_dac_campaign_outcomes\s+from public, anon, authenticated;/,
  );

  const campaignGrant = grantBlock(
    source,
    "mpgf_public_goods_campaigns",
    "anon, authenticated",
  );
  for (const safeColumn of [
    "id",
    "round_id",
    "slug",
    "title",
    "destination_type",
    "destination_ref",
    "cause_tags",
    "public_summary",
    "threshold_amount_cents",
    "threshold_supporters",
    "deadline_at",
    "verification_method",
    "baseline_rule",
    "exit_rule",
    "review_status",
    "pool_proposal_id",
    "threshold_visibility",
    "progress_visibility",
    "published_terms_version",
    "published_terms_sha256",
    "published_at",
    "created_at",
  ]) {
    assert.match(campaignGrant, new RegExp(`\\b${safeColumn}\\b`));
  }
  for (const privateColumn of [
    "pool_alternative_id",
    "challenge_window_ends_at",
    "first_accepted_pledge_at",
    "published_by",
  ]) {
    assert.doesNotMatch(campaignGrant, new RegExp(`\\b${privateColumn}\\b`));
  }

  const outcomeGrant = grantBlock(
    source,
    "mpgf_dac_campaign_outcomes",
    "anon, authenticated",
  );
  for (const safeColumn of [
    "id",
    "campaign_id",
    "pool_proposal_id",
    "terms_version",
    "terms_sha256",
    "outcome_status",
    "eligible_amount_cents",
    "eligible_supporter_count",
    "threshold_amount_cents",
    "threshold_supporters",
    "deadline_at",
    "evaluated_at",
    "outcome_sha256",
    "created_at",
  ]) {
    assert.match(outcomeGrant, new RegExp(`\\b${safeColumn}\\b`));
  }
  for (const privateColumn of ["finalized_by", "reason", "outcome_json"]) {
    assert.doesNotMatch(outcomeGrant, new RegExp(`\\b${privateColumn}\\b`));
  }
});

test("public DAC aggregate privacy verifies RLS, policies, and effective column privileges", async () => {
  const source = await migration();

  for (const policy of [
    "mpgf_public_goods_campaigns_public_read",
    "mpgf_dac_campaign_outcomes_public_select",
  ]) {
    assert.ok(source.includes(policy), `Expected fail-closed policy guard for ${policy}.`);
  }
  assert.match(source, /information_schema\.role_table_grants/);
  assert.match(source, /has_column_privilege\(/);
  assert.match(source, /private_campaign_columns constant text\[\]/);
  assert.match(source, /private_outcome_columns constant text\[\]/);
  assert.match(source, /grant all on table public\.mpgf_public_goods_campaigns to service_role;/);
  assert.match(source, /grant select on table public\.mpgf_dac_campaign_outcomes to service_role;/);
});

test("public DAC aggregate privacy is grant-only and cannot mutate data or execute payments", async () => {
  const source = await migration();

  assert.doesNotMatch(source, /insert\s+into\s+public\./i);
  assert.doesNotMatch(source, /update\s+public\.|delete\s+from\s+public\./i);
  assert.doesNotMatch(
    source,
    /stripe|checkout[_ ]?session|setup[_ ]?intent|payment[_ ]?intent|mandate|charge\s*\(|capture\s*\(|settle\s*\(|refund\s*\(|transfer\s*\(|payout\s*\(/i,
  );
});
