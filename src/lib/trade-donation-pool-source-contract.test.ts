import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const migration = readFileSync(
  "supabase/migrations/20260725152000_cross_user_pooled_trade_donations.sql",
  "utf8",
);
const hardeningMigration = readFileSync(
  "supabase/migrations/20260814024354_harden_trade_donation_pool_component_trigger_rpc.sql",
  "utf8",
);
const poolLibrary = readFileSync("src/lib/trade-donation-pool.ts", "utf8");
const poolActions = readFileSync("src/app/trade-donation-pool-actions.ts", "utf8");
const poolStripeWebhook = readFileSync(
  "src/lib/payments/trade-donation-pool-webhook.ts",
  "utf8",
);
const stripeWebhookRoute = readFileSync("src/app/api/stripe/webhook/route.ts", "utf8");
const everyOrgWebhookRoute = readFileSync(
  "src/app/api/connectors/every-org/[secret]/route.ts",
  "utf8",
);
const poolStage = readFileSync(
  "src/components/core-trade/trade-donation-pool-agreement-stage.tsx",
  "utf8",
);
const runbook = readFileSync("docs/trade-donation-pooled-settlement-runbook.md", "utf8");

const normalizeSql = (sql: string) =>
  sql
    .replace(/--.*$/gm, " ")
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/\s+/g, " ")
    .trim();

test("the agreement-change trigger helper is callable only by service_role", () => {
  const hardeningSql = normalizeSql(hardeningMigration);
  const originalSql = normalizeSql(migration);

  assert.match(
    hardeningSql,
    /revoke all on function public\.mark_trade_donation_pool_component_stale\(\) from public\s*,\s*anon\s*,\s*authenticated\s*;/i,
  );
  assert.match(
    hardeningSql,
    /grant execute on function public\.mark_trade_donation_pool_component_stale\(\) to service_role\s*;/i,
  );
  assert.doesNotMatch(
    hardeningSql,
    /grant execute on function public\.mark_trade_donation_pool_component_stale\(\) to [^;]*\b(?:public|anon|authenticated)\b[^;]*;/i,
  );
  assert.match(
    originalSql,
    /create or replace function public\.mark_trade_donation_pool_component_stale\(\) returns trigger language plpgsql security definer set search_path = pg_catalog as \$\$/i,
  );
  assert.match(
    originalSql,
    /create trigger mark_trade_donation_pool_component_stale_trigger after update of current_version_id\s*,\s*lifecycle_status on public\.agreements for each row execute function public\.mark_trade_donation_pool_component_stale\(\)\s*;/i,
  );
});

test("pooled settlement persistence is private and privileged writes are service-role only", () => {
  for (const table of [
    "trade_donation_pool_gate_status",
    "trade_donation_pool_obligations",
    "trade_donation_pool_bundles",
    "trade_donation_pool_bundle_items",
    "trade_donation_pool_ledger_journals",
    "trade_donation_pool_ledger_lines",
    "trade_donation_pool_stripe_events",
    "trade_donation_pool_audit_events",
  ]) {
    assert.match(migration, new RegExp(`alter table public\\.${table} enable row level security`, "i"));
    assert.match(migration, new RegExp(`revoke all on public\\.${table} from anon, authenticated`, "i"));
  }
  assert.match(
    migration,
    /revoke all on function public\.complete_every_org_trade_donation_pool_bundle\([\s\S]*?from public, anon, authenticated/i,
  );
  assert.match(
    migration,
    /grant execute on function public\.complete_every_org_trade_donation_pool_bundle\([\s\S]*?to service_role/i,
  );
});

test("bundle freezing serializes compatible obligations and locks a minimal threshold prefix", () => {
  assert.match(migration, /pg_advisory_xact_lock\(hashtextextended\(bundle_key_value, 0\)\)/);
  assert.match(migration, /where status = 'funded' and bundle_id is null/i);
  assert.match(migration, /if total_cents < 1000 or manifest_items is null then/i);
  assert.match(migration, /cumulative_cents - amount_cents < 1000/i);
  assert.match(migration, /bundle could not lock every component atomically/i);
  assert.match(migration, /schemaVersion', 'moral-trade-pooled-settlement-manifest-v1'/i);
  assert.match(migration, /'payerUserId'/i);
  assert.match(migration, /'allocationCents'/i);
});

test("the ledger is immutable double-entry and posted journals balance at commit", () => {
  assert.match(migration, /create table if not exists public\.trade_donation_pool_ledger_journals/i);
  assert.match(migration, /create table if not exists public\.trade_donation_pool_ledger_lines/i);
  assert.match(migration, /deferrable initially deferred/i);
  assert.match(migration, /Pooled-settlement journal .* is not balanced/i);
  assert.match(migration, /platform_cash_asset/i);
  assert.match(migration, /participant_settlement_liability/i);
  assert.match(migration, /chargeback_loss_expense/i);
  assert.match(migration, /Posted pooled-settlement ledger journals are immutable/i);
  assert.match(migration, /Pooled-settlement ledger lines are immutable/i);
  assert.match(migration, /Pooled-settlement bundle manifests are immutable/i);
  assert.match(migration, /Pooled-settlement bundle items are immutable/i);
});

test("Stripe funding is exact-version bound and signed-webhook authoritative", () => {
  assert.match(poolActions, /buildTradeDonationPoolConditionHash/);
  assert.match(poolActions, /mode: "payment"/);
  assert.match(poolActions, /payment_intent_data: \{ metadata \}/);
  assert.match(poolActions, /Moral Trade—not you—will make the consolidated Every\.org gift/);
  assert.match(poolActions, /not represented as (?:your|a) direct tax-deductible (?:charitable )?donation/);
  assert.match(poolActions, /Moral Trade absorbs processing fees/);
  assert.match(poolStripeWebhook, /record_trade_donation_pool_stripe_success/);
  assert.match(poolStripeWebhook, /checkout\.session\.expired/);
  assert.match(poolStripeWebhook, /payment_intent\.payment_failed/);
  assert.match(poolStripeWebhook, /charge\.refunded/);
  assert.match(poolStripeWebhook, /charge\.dispute\.created/);
  assert.match(stripeWebhookRoute, /handleTradeDonationPoolStripeWebhookEvent/);
  assert.match(stripeWebhookRoute, /signatureVerified: true/);
});

test("refunds are self-service only before freeze and post-bundle reversals require review", () => {
  assert.match(migration, /can be self-service refunded only before bundle freeze/i);
  assert.match(migration, /status = 'refund_pending'/i);
  assert.match(migration, /component_dispute_after_bundle/i);
  assert.match(migration, /component_refund_after_bundle/i);
  assert.match(migration, /status = 'needs_review'/i);
  assert.match(poolActions, /requestTradeDonationPoolRefundAction/);
  assert.match(poolActions, /refunds\.create/);
});

test("Every.org settlement validates the aggregate and every frozen component before atomic activation", () => {
  assert.match(poolLibrary, /aggregateAmountCents/);
  assert.match(poolLibrary, /manifestHash/);
  assert.match(poolLibrary, /partnerDonationId/);
  assert.match(poolLibrary, /metadata_signature_invalid/);
  assert.match(poolLibrary, /amount_mismatch/);
  assert.match(poolLibrary, /recipient_mismatch/);
  assert.match(everyOrgWebhookRoute, /complete_every_org_trade_donation_pool_bundle/);
  assert.match(migration, /p_provider_amount_cents <> bundle_row\.amount_cents/);
  assert.match(migration, /p_manifest_hash/);
  assert.match(migration, /a\.current_version_id <> i\.agreement_version_id/);
  assert.match(migration, /select count\(\*\), coalesce\(sum\(i\.allocation_cents\), 0\)/i);
  assert.match(migration, /item_count = 0[\s\S]*?item_count <> manifest_item_count[\s\S]*?allocation_total <> bundle_row\.amount_cents/i);
  assert.match(migration, /manifest_mismatch_count > 0/i);
  assert.match(migration, /recomputed_manifest_hash <> bundle_row\.manifest_hash/i);
  assert.match(migration, /update public\.agreements[\s\S]*?lifecycle_status = 'active'/i);
  assert.match(migration, /return jsonb_build_object\(\s*'outcome', 'activated'/i);
});

test("any provider or component mismatch activates zero agreements", () => {
  assert.match(
    migration,
    /update public\.trade_donation_pool_bundles[\s\S]*?status = 'needs_review'[\s\S]*?return jsonb_build_object\('outcome', 'needs_review'/i,
  );
  assert.match(
    migration,
    /update public\.trade_donation_pool_obligations[\s\S]*?status = 'needs_review'[\s\S]*?where bundle_id = bundle_row\.id/i,
  );
  const mismatchReturnIndex = migration.indexOf("return jsonb_build_object('outcome', 'needs_review'");
  const activationIndex = migration.indexOf("lifecycle_status = 'active'", mismatchReturnIndex);
  assert.ok(mismatchReturnIndex >= 0 && activationIndex > mismatchReturnIndex);
});

test("direct Every.org checkout remains available only at or above its $10 floor", () => {
  assert.match(migration, /if current_term\.amount_cents < 1000 then/);
  assert.match(migration, /Sub-\$10 obligations must use pooled settlement/);
  assert.match(poolLibrary, /EVERY_ORG_DIRECT_MINIMUM_CENTS = 1_000/);
  assert.match(poolActions, /isPooledTradeDonationTerm/);
});

test("participant and operator surfaces disclose custody and donor-of-record boundaries", () => {
  assert.match(poolStage, /participant pays Moral Trade toward a pooled settlement/i);
  assert.match(poolStage, /Moral Trade is the presumptive provider-facing donor of record/);
  assert.match(poolStage, /not represented as (?:your|a) direct tax-deductible (?:charitable )?donation/);
  assert.match(poolStage, /Refund before bundle freeze/);
  assert.match(poolStage, /After freeze/);
  assert.match(runbook, /double-entry/i);
  assert.match(runbook, /Every\.org approval/i);
  assert.match(runbook, /chargeback/i);
  assert.match(runbook, /Four users fund \$2\.50 each/i);
  assert.match(runbook, /Any mismatch activates zero components/i);
});

test("feature mode is separately fail-closed in production configuration", () => {
  assert.match(poolLibrary, /TRADE_DONATION_POOL_ENABLED/);
  assert.match(poolLibrary, /TRADE_DONATION_POOL_MODE/);
  assert.match(poolLibrary, /test mode requires a Stripe test secret key/);
  assert.match(poolLibrary, /live mode requires a Stripe live secret key/);
  assert.match(poolLibrary, /Live pooled settlement is restricted to the canonical production deployment/);
});
