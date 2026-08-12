import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const root = process.cwd();
const migration = readFileSync(
  join(
    root,
    "supabase/migrations/20260812020000_evidence_credibility_shadow_collection_queue.sql",
  ),
  "utf8",
);
const actions = readFileSync(
  join(root, "src/app/admin/evidence-credibility-shadow-actions.ts"),
  "utf8",
);
const page = readFileSync(
  join(root, "src/app/admin/evidence-credibility-shadow/page.tsx"),
  "utf8",
);
const documentation = readFileSync(
  join(root, "docs/moral-trade/evidence-credibility-shadow-collection-v1.md"),
  "utf8",
);

test("the collection surface is private, AAL2-admin-only, and append-only", () => {
  assert.match(
    migration,
    /create table if not exists public\.credibility_shadow_collection_audit/i,
  );
  assert.match(
    migration,
    /alter table public\.credibility_shadow_collection_audit enable row level security/i,
  );
  assert.match(
    migration,
    /revoke all on table public\.credibility_shadow_collection_audit[\s\S]*from public, anon, authenticated/i,
  );
  assert.match(
    migration,
    /credibility_shadow_collection_audit_append_only[\s\S]*reject_credibility_shadow_history_mutation/i,
  );
  assert.match(
    migration,
    /auth\.uid\(\) is null[\s\S]*auth\.jwt\(\) ->> 'aal'[\s\S]*'aal2'[\s\S]*current_actor_has_trade_role\('administrator'\)/i,
  );
  assert.match(
    migration,
    /Private shadow collection requires an active AAL2 administrator\./i,
  );
  assert.doesNotMatch(
    migration,
    /grant execute on function public\.list_credibility_shadow_collection_queue_v1\([\s\S]*to (?:anon|service_role)/i,
  );
});

test("the queue identifies missing or stale final evidence and settlement sources", () => {
  assert.match(
    migration,
    /create or replace function public\.list_credibility_shadow_collection_queue_v1/i,
  );
  assert.match(
    migration,
    /not exists \([\s\S]*successor\.supersedes_decision_id = decision_record\.id/i,
  );
  assert.match(
    migration,
    /current_review_id is distinct from source_review_id/i,
  );
  assert.match(
    migration,
    /current_payment_review_decision_id[\s\S]*is distinct from payment_review_decision_id/i,
  );
  assert.match(migration, /'requiresSupersession'/i);
  assert.match(migration, /'allowedFinalityReasons'/i);
  assert.match(migration, /'derivedAdjudicationClass'/i);
});

test("collection wrappers reuse the existing decision RPCs and preserve idempotency", () => {
  assert.match(
    migration,
    /create or replace function public\.record_credibility_shadow_evidence_collection_v1/i,
  );
  assert.match(
    migration,
    /result_value := public\.record_trade_evidence_decision_v1\(/i,
  );
  assert.match(
    migration,
    /create or replace function public\.record_credibility_shadow_settlement_collection_v1/i,
  );
  assert.match(
    migration,
    /result_value := public\.record_trade_settlement_shadow_decision_v1\(/i,
  );
  assert.match(
    migration,
    /on conflict \(evidence_decision_id\)[\s\S]*do nothing/i,
  );
  assert.match(
    migration,
    /on conflict \(settlement_decision_id\)[\s\S]*do nothing/i,
  );
  assert.match(
    migration,
    /supersedes_decision_id is not distinct from p_supersedes_decision_id/i,
  );
  assert.match(
    migration,
    /already collected with a different private rationale/i,
  );
});

test("the private page and actions use the authenticated session rather than service credentials", () => {
  assert.match(page, /robots: \{ index: false, follow: false \}/i);
  assert.match(page, /requireViewer\("\/admin\/evidence-credibility-shadow"\)/i);
  assert.match(page, /trade_review_role_grants/i);
  assert.match(page, /security\?\.currentLevel === "aal2"/i);
  assert.match(page, /list_credibility_shadow_collection_queue_v1/i);
  assert.match(page, /Inspect frozen private source/i);
  assert.match(actions, /record_credibility_shadow_evidence_collection_v1/i);
  assert.match(actions, /record_credibility_shadow_settlement_collection_v1/i);
  assert.match(actions, /await createClient\(\)/i);
  assert.doesNotMatch(`${page}\n${actions}`, /createServiceClient/i);
});

test("the collection tranche cannot activate public credibility or model effects", () => {
  assert.doesNotMatch(
    migration,
    /insert into public\.credibility_events|update public\.credibility_public_aggregates|insert into public\.credibility_restrictions/i,
  );
  assert.doesNotMatch(
    migration,
    /update public\.credibility_shadow_controls[\s\S]*(?:public_effects_enabled|ranking_effects_enabled|eligibility_effects_enabled|milestone_cutover_enabled)/i,
  );
  assert.match(
    migration,
    /'activePublicCredibilityUnaffected', true/i,
  );
  assert.match(documentation, /private, administrator-only, and shadow-only/i);
  assert.match(documentation, /Production remains out of scope/i);
});
