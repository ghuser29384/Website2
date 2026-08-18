import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const migrationPath =
  "supabase/migrations/20260818173000_mpgf_dac_public_goods_foundation_reconciliation.sql";

async function migration() {
  return readFile(migrationPath, "utf8");
}

test("public-goods foundation reconciliation restores exactly the four canonical DAC prerequisites", async () => {
  const source = await migration();

  assert.match(source, /^begin;/);
  assert.match(source, /commit;\s*$/);

  for (const table of [
    "mpgf_public_goods_match_pools",
    "mpgf_public_goods_rounds",
    "mpgf_public_goods_campaigns",
    "mpgf_public_goods_pledges",
  ]) {
    assert.match(
      source,
      new RegExp(`create table if not exists public\\.${table} \\(`),
      `Expected additive creation for ${table}.`,
    );
    assert.match(
      source,
      new RegExp(`alter table public\\.${table} enable row level security;`),
      `Expected RLS on ${table}.`,
    );
    assert.match(
      source,
      new RegExp(`grant all on table public\\.${table} to service_role;`),
      `Expected explicit service-only mutation authority on ${table}.`,
    );
  }

  for (const prerequisite of [
    "public.profiles",
    "public.mpgf_pool_proposals",
    "public.mpgf_candidate_alternatives",
    "public.mpgf_threshold_visibility",
    "public.mpgf_progress_visibility",
  ]) {
    assert.ok(
      source.includes(prerequisite),
      `Expected fail-closed prerequisite guard for ${prerequisite}.`,
    );
  }

  assert.match(
    source,
    /mpgf_public_goods_campaigns_public_read[\s\S]*for select to anon, authenticated[\s\S]*using \(true\);/,
  );
  assert.match(
    source,
    /mpgf_public_goods_pledges_select_own[\s\S]*for select to authenticated[\s\S]*using \(profile_id = auth\.uid\(\)\);/,
  );
  assert.match(
    source,
    /mpgf_public_goods_pledges_insert_own[\s\S]*for insert to authenticated[\s\S]*with check \(profile_id = auth\.uid\(\)\);/,
  );
  assert.match(
    source,
    /mpgf_public_goods_pledges_update_own[\s\S]*for update to authenticated[\s\S]*using \(profile_id = auth\.uid\(\)\)[\s\S]*with check \(profile_id = auth\.uid\(\)\);/,
  );

  assert.match(
    source,
    /revoke all on table public\.mpgf_public_goods_pledges[\s\S]*from public, anon, authenticated;/,
  );
  assert.match(
    source,
    /grant select, insert, update on table public\.mpgf_public_goods_pledges[\s\S]*to authenticated;/,
  );
  assert.doesNotMatch(
    source,
    /grant\s+(?:all|insert|update|delete)[^;]*mpgf_public_goods_(?:match_pools|rounds|campaigns)[^;]*to\s+(?:anon|authenticated)/i,
  );
});

test("public-goods foundation reconciliation is seedless and cannot execute payments", async () => {
  const source = await migration();

  assert.doesNotMatch(source, /insert\s+into\s+public\./i);
  assert.doesNotMatch(source, /update\s+public\.|delete\s+from\s+public\./i);
  assert.doesNotMatch(
    source,
    /stripe|checkout[_ ]?session|setup[_ ]?intent|payment[_ ]?intent|mandate|charge|capture\s*\(|settle\s*\(|refund\s*\(|transfer\s*\(|payout\s*\(/i,
  );

  assert.match(
    source,
    /Production rounds require a separate governance configuration; this migration inserts none\./,
  );
  assert.match(
    source,
    /Payment execution remains disabled\./,
  );
});

test("public-goods foundation reconciliation preserves the reviewed base-table contract", async () => {
  const source = await migration();

  for (const requiredToken of [
    "references public.mpgf_public_goods_match_pools (id)",
    "references public.mpgf_public_goods_rounds (id) on delete set null",
    "references public.mpgf_candidate_alternatives (id) on delete set null",
    "references public.mpgf_public_goods_campaigns (id) on delete cascade",
    "references public.profiles (id) on delete set null",
    "'external_charity'",
    "'fiscal_host'",
    "'internal_demo_pool'",
    "'signed_sponsor_route'",
    "'private_amount'",
    "'public_supporter'",
    "'public_reason'",
    "'external_handoff'",
    "'stored_payment_method'",
    "'signed_intent'",
    "'eligible'",
    "'pending_review'",
    "'duplicate_identity'",
    "'below_minimum'",
    "'blocked'",
  ]) {
    assert.ok(
      source.includes(requiredToken),
      `Expected canonical contract token ${requiredToken}.`,
    );
  }

  assert.match(source, /if column_contract_count <> 52 then/);
  assert.match(source, /Canonical public-goods foundation column contract is incomplete/);
});
