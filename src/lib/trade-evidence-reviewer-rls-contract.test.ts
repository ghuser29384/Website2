import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const migration = readFileSync(
  join(
    process.cwd(),
    "supabase/migrations/20260814050000_trade_evidence_assigned_reviewer_rls.sql",
  ),
  "utf8",
);

function section(start: string, end?: string) {
  const startIndex = migration.indexOf(start);
  assert.notEqual(startIndex, -1, `Missing section start: ${start}`);
  const endIndex = end ? migration.indexOf(end, startIndex + start.length) : migration.length;
  assert.notEqual(endIndex, -1, `Missing section end: ${end}`);
  return migration.slice(startIndex, endIndex);
}

test("private evidence authorization is identity-bound and reviewer-scoped", () => {
  const helper = section(
    "create or replace function moral_trade_private.can_read_trade_evidence_v1",
    "revoke all on function",
  );

  assert.match(helper, /security definer/i);
  assert.match(helper, /p_actor_id is not null[\s\S]*p_actor_id = auth\.uid\(\)/i);
  assert.match(helper, /p_actor_id in \(agreement\.proposer_id, agreement\.responder_id\)/i);
  assert.match(helper, /milestone\.assigned_reviewer_id = p_actor_id/i);
  assert.match(helper, /appeal\.assigned_reviewer_id = p_actor_id/i);
  assert.match(helper, /current_actor_has_trade_role\('administrator'\)/i);
  assert.doesNotMatch(helper, /trade_payment_review_cases|trade_payment_appeals/i);
});

test("submitted bundles and items use the evidence-specific authorization helper", () => {
  const bundles = section(
    'create policy "trade_evidence_bundles_authorized_select"',
    'drop policy if exists "trade_evidence_bundle_items_authorized_select"',
  );
  const items = section('create policy "trade_evidence_bundle_items_authorized_select"');

  assert.match(
    bundles,
    /submitted_by = \(select auth\.uid\(\)\)[\s\S]*status <> 'draft'[\s\S]*can_read_trade_evidence_v1/i,
  );
  assert.match(
    items,
    /bundle\.status = 'draft'[\s\S]*bundle\.submitted_by = \(select auth\.uid\(\)\)[\s\S]*bundle\.status <> 'draft'[\s\S]*can_read_trade_evidence_v1/i,
  );
  assert.doesNotMatch(bundles, /join public\.agreements/i);
  assert.doesNotMatch(items, /join public\.agreements/i);
});

test("the private helper is unavailable to anonymous callers", () => {
  assert.match(
    migration,
    /revoke all on function[\s\S]*can_read_trade_evidence_v1\(uuid, uuid\)[\s\S]*from public, anon, authenticated/i,
  );
  assert.match(
    migration,
    /grant execute on function[\s\S]*can_read_trade_evidence_v1\(uuid, uuid\)[\s\S]*to authenticated/i,
  );
});
