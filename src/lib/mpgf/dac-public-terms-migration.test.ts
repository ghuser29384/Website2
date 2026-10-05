import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const migrationPath = "supabase/migrations/20260807100000_mpgf_dac_public_terms_api.sql";
const regressionPath = "supabase/tests/mpgf_dac_public_terms_api.sql";

async function read(path: string) {
  return readFile(path, "utf8");
}

test("public DAC terms derive only from the exact immutable published proposal version", async () => {
  const migration = await read(migrationPath);

  assert.match(migration, /create or replace function public\.mpgf_public_dac_campaign_terms/);
  assert.match(migration, /security definer/);
  assert.match(migration, /from public\.mpgf_public_goods_campaigns as campaign/);
  assert.match(migration, /campaign\.review_status in \('approved', 'finalized'\)/);
  assert.match(migration, /from public\.mpgf_pool_proposal_versions as version/);
  assert.match(migration, /version\.terms_version = campaign_row\.published_terms_version/);
  assert.match(migration, /version\.terms_sha256 = campaign_row\.published_terms_sha256/);
  assert.match(migration, /version\.proposal_terms_json/);
  assert.match(migration, /version\.create_pool_terms_json/);
  assert.match(migration, /proposal_json := proposal_terms_json/);
  assert.match(migration, /jsonb_typeof\(threshold_schedule_json -> 'thresholds'\) is distinct from 'array'/);
  assert.match(migration, /threshold_item\.value ->> 'provisional' is distinct from 'false'/);
  assert.match(migration, /public_goods_success_premium_provisional' is distinct from 'false'/);
  assert.match(migration, /gross_success_requirement_value is distinct from[\s\S]*threshold_amount_value \+ success_premium_amount_value/);
  assert.match(migration, /threshold_amount_value is distinct from campaign_row\.threshold_amount_cents/);
  assert.match(migration, /deadline_value is distinct from campaign_row\.deadline_at/);
});

test("public DAC terms expose the approved failure-bonus contract and explicit no-payment state", async () => {
  const migration = await read(migrationPath);

  for (const fragment of [
    "'schemaVersion', 'mpgf_dac_public_terms_v1'",
    "'mechanism', 'dominant_assurance_contract'",
    "'failureBonus'",
    "'thresholdSchedule'",
    "'eligibilityPolicy'",
    "'failureBonusTimingMode'",
    "'moralTradeFailureBonusShareBps'",
    "'successPremium'",
    "'grossSuccessRequirementCents'",
    "'pledgeMode', 'pledge_only'",
    "'paymentMethodCollected', false",
    "'authorized', false",
    "'charged', false",
    "'captured', false",
    "'settled', false",
    "'failureBonusPaid', false",
  ]) {
    assert.ok(migration.includes(fragment), `Expected migration to include ${fragment}`);
  }

  assert.match(migration, /grant execute on function public\.mpgf_public_dac_campaign_terms\(text\)[\s\S]*to anon, authenticated, service_role/);
  assert.doesNotMatch(migration, /grant select on public\.mpgf_pool_proposal_versions to anon/);
  assert.doesNotMatch(migration, /proposer_id|reviewed_by|review_reason|idempotency_key_hash/);
});

test("rollback-only SQL regression proves public exactness, privacy, and zero payment state", async () => {
  const regression = await read(regressionPath);

  assert.match(regression, /^begin;/);
  assert.match(regression, /rollback;\s*$/);
  assert.match(regression, /set local role anon/);
  assert.match(regression, /mpgf_public_dac_campaign_terms\(/);
  assert.match(regression, /terms_by_slug is distinct from terms_by_id/);
  assert.match(regression, /failureBonus,scheduleStatus/);
  assert.match(regression, /createPoolTerms,failureBonusTimingMode/);
  assert.match(regression, /payment,paymentMethodCollected/);
  assert.match(regression, /serialized ilike '%proposer_id%'/);
  assert.match(regression, /serialized ilike '%pledge_intent%'/);
  assert.match(regression, /payment_rows <> 0/);
});
