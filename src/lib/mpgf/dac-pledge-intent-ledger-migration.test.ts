import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const migrationPath =
  "supabase/migrations/20260806173000_mpgf_dac_pledge_intent_ledger.sql";
const regressionPath =
  "supabase/tests/mpgf_dac_pledge_intent_ledger.sql";
const workflowPath =
  ".github/workflows/mpgf-dac-pledge-intent-ledger-gates.yml";

async function read(path: string) {
  return readFile(path, "utf8");
}

test("DAC pledge architecture keeps immutable consent separate from one canonical active ledger", async () => {
  const migration = await read(migrationPath);

  assert.match(migration, /create table if not exists public\.mpgf_dac_pledge_intents/);
  assert.match(migration, /create table if not exists public\.mpgf_dac_pledge_events/);
  assert.match(migration, /alter table public\.mpgf_public_goods_pledges/);
  assert.match(migration, /add column if not exists pledge_intent_id uuid/);
  assert.match(migration, /create unique index if not exists mpgf_public_goods_pledges_intent_unique_idx/);
  assert.match(migration, /create or replace function public\.mpgf_create_dac_pledge/);
  assert.match(migration, /'mechanism', 'dominant_assurance_contract'/);
  assert.match(migration, /'pledgeMode', 'pledge_only'/);
  assert.match(migration, /'signed_intent'/);
  assert.match(migration, /'pending_review'/);
  assert.match(migration, /payment_intent_ref,[\s\S]*null,/);
  assert.match(migration, /DAC pledge consent and audit records are immutable/);
  assert.match(migration, /Published DAC campaigns accept pledges only through an immutable pledge intent/);
  assert.doesNotMatch(
    migration,
    /create table(?: if not exists)? public\.mpgf_pledge_intents/i,
  );
  assert.doesNotMatch(
    migration,
    /create table(?: if not exists)? public\.mpgf_conditional_pledges/i,
  );
  assert.doesNotMatch(
    migration,
    /insert into public\.mpgf_conditional_pledges/i,
  );
});

test("DAC pledge creation is version-bound, idempotent, private, and non-authorizing", async () => {
  const migration = await read(migrationPath);

  assert.match(
    migration,
    /foreign key \(pool_proposal_id, terms_version\)[\s\S]*mpgf_pool_proposal_versions/,
  );
  assert.match(migration, /published_terms_version/);
  assert.match(migration, /published_terms_sha256/);
  assert.match(migration, /idempotency_key_hash/);
  assert.match(migration, /pg_advisory_xact_lock/);
  assert.match(migration, /The idempotency key was already used for different DAC pledge terms/);
  assert.match(migration, /profile_id = auth\.uid\(\)/);
  assert.match(migration, /revoke all on table public\.mpgf_dac_pledge_intents/);
  assert.match(migration, /grant select on table public\.mpgf_dac_pledge_intents to authenticated/);
  assert.match(
    migration,
    /It creates no payment authorization, mandate, charge, capture, success, or lapse outcome/,
  );
});

test("rollback-only QA regression proves two users, no double count, RLS, immutability, and zero payment", async () => {
  const regression = await read(regressionPath);

  assert.match(regression, /^begin;/);
  assert.match(regression, /rollback;\s*$/);
  assert.match(regression, /DAC Pledger One/);
  assert.match(regression, /DAC Pledger Two/);
  assert.match(regression, /DAC Outsider/);
  assert.match(regression, /mpgf_approve_failure_bonus_premium_schedule/);
  assert.match(regression, /mpgf_approve_and_freeze_pool_proposal/);
  assert.match(regression, /mpgf_publish_pool_proposal/);
  assert.match(regression, /mpgf_create_dac_pledge/g);
  assert.match(regression, /Conflicting idempotency replay unexpectedly succeeded/);
  assert.match(regression, /total_cents <> 3000/);
  assert.match(regression, /supporter_count <> 2/);
  assert.match(regression, /payment_object_count <> 0/);
  assert.match(regression, /to_regclass\('public\.mpgf_conditional_pledges'\) is not null/);
  assert.match(regression, /An outsider could read another user''s private DAC consent or event/);
  assert.match(regression, /Immutable DAC pledge intent unexpectedly changed/);
  assert.match(regression, /Canonical DAC pledge unexpectedly deleted/);
});

test("permanent gate runs exact source and isolated QA without production mutation", async () => {
  const workflow = await read(workflowPath);

  assert.match(workflow, /mpgf-dac-pledge-intent-ledger/);
  assert.match(workflow, /npm test/);
  assert.match(workflow, /npm run lint/);
  assert.match(workflow, /npx tsc --noEmit/);
  assert.match(workflow, /npm run build/);
  assert.match(workflow, /QA_SUPABASE_DB_URL/);
  assert.match(workflow, /hvmxfjjbdcgjjudmthdz/);
  assert.match(workflow, /mpgf_dac_pledge_intent_ledger\.sql/);
  assert.match(workflow, /zero fixture residue/i);
  assert.doesNotMatch(workflow, /PRODUCTION_SUPABASE_DB_URL/);
  assert.doesNotMatch(workflow, /vercel deploy/);
});
