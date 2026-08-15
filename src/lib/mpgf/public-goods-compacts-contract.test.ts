import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const root = new URL("../../../", import.meta.url);
const read = (path: string) => readFileSync(new URL(path, root), "utf8");
const base = read("supabase/migrations/20260813163052_mpgf_public_goods_compacts.sql");
const hardening = read("supabase/migrations/20260814031500_mpgf_public_goods_compacts_state_hardening.sql");
const migration = `${base}\n${hardening}`;
const model = read("src/lib/mpgf/public-goods-compacts.ts");
const state = read("src/lib/mpgf/public-goods-compacts-state.ts");
const service = read("src/lib/mpgf/public-goods-compacts-service.ts");
const membershipRoute = read("src/app/api/mpgf/compacts/membership/route.ts");
const allocationRoute = read("src/app/api/mpgf/compacts/allocation/route.ts");
const delegationRoute = read("src/app/api/mpgf/compacts/delegation/route.ts");
const component = read("src/components/mpgf/mpgf-public-goods-compacts.tsx");
const compactPage = read("src/app/mpgf/compacts/page.tsx");
const pageFrame = read("src/components/mpgf/mpgf-page-frame.tsx");
const pagePrimitives = read("src/components/ui/page-primitives.tsx");
const hub = read("src/app/mpgf/page.tsx");
const databaseTypes = read("src/lib/supabase/database.types.ts");

const tables = [
  "compacts", "compact_memberships", "dormant_authorization_snapshots",
  "outflow_coverage_snapshots", "outflow_observations", "obligation_snapshots",
  "allocation_instructions", "allocation_instruction_lines", "scheduled_amount_snapshots",
  "settled_contribution_snapshots", "funding_qualification_snapshots", "readiness_snapshots",
  "voting_snapshots", "voting_weight_snapshots", "delegation_events",
  "delegation_snapshots", "delegation_weight_snapshots", "compact_idempotency_keys",
];

test("every Compact v2 relation has RLS and direct client writes are revoked", () => {
  for (const suffix of tables) {
    assert.match(base, new RegExp(`alter table public\\.mpgf_public_goods_${suffix} enable row level security`));
  }
  assert.match(base, /revoke all on table public\.mpgf_public_goods_compacts,[\s\S]*from public, anon, authenticated/);
  assert.doesNotMatch(base, /grant (?:insert|update|delete|all) on table public\.mpgf_public_goods_[^;]+ to authenticated/i);
});

test("the frozen v2 constitution is encoded without a cap or self-reported spending", () => {
  for (const invariant of [
    "obligation_divisor integer not null default 10",
    "funding_qualification_minimum_cents bigint not null default 100",
    "readiness_threshold_members integer not null default 100",
    "readiness_threshold_scheduled_cents bigint not null default 50000",
    "voting_equal_share_bps integer not null default 7000",
    "voting_sqrt_contribution_share_bps integer not null default 3000",
    "delegate_control_cap_bps integer not null default 1000",
    "allocation_total_bps integer not null default 10000",
  ]) assert.ok(base.includes(invariant), `missing frozen invariant: ${invariant}`);
  assert.match(base, /constitution_version = 'mpgf-public-goods-compact\/transaction-v2'/);
  assert.match(base, /marketplace_checkout_surcharge_enabled boolean not null default false check \(not marketplace_checkout_surcharge_enabled\)/);
  assert.doesNotMatch(migration, /core_marketplace_taxed|coreMarketplaceTaxed/);
  assert.doesNotMatch(migration, /declared_eligible|self[-_ ]declared|monthly_contribution_cap/i);
});

test("coverage, allocation, qualification, readiness, voting, and delegation are separate immutable concepts", () => {
  for (const suffix of [
    "outflow_coverage_snapshots", "obligation_snapshots", "allocation_instructions",
    "scheduled_amount_snapshots", "settled_contribution_snapshots",
    "funding_qualification_snapshots", "readiness_snapshots", "voting_snapshots",
    "delegation_events", "delegation_snapshots",
  ]) assert.match(base, new RegExp(`create table public\\.mpgf_public_goods_${suffix}`));
  assert.match(hardening, /Compact v2 snapshots and events are append-only/);
  assert.match(hardening, /mpgf_public_goods_validate_qualification_snapshot_v2/);
});

test("authenticated RPCs are idempotent, fixed-search-path, and explicitly no-money", () => {
  for (const rpc of [
    "join_mpgf_public_goods_compact_v2", "set_mpgf_public_goods_compact_allocation_v2",
    "request_mpgf_public_goods_compact_exit_v2", "set_mpgf_public_goods_compact_delegation_v2",
    "clear_mpgf_public_goods_compact_delegation_v2",
  ]) {
    assert.match(hardening, new RegExp(`function public\\.${rpc}[\\s\\S]*security definer[\\s\\S]*set search_path = ''`));
    assert.match(hardening, new RegExp(`grant execute on function public\\.${rpc}`));
  }
  assert.match(hardening, /pg_advisory_xact_lock/);
  assert.match(hardening, /already used for a different request/);
  assert.match(hardening, /'moneyMoved', false/);
  assert.match(hardening, /'automaticCollectionEnabled', false/);
});

test("financial-cycle freezing is complete-coverage-only, net-settled, uncapped, and cent exact", () => {
  assert.match(hardening, /if coverage_record\.coverage_status = 'complete'/);
  assert.match(hardening, /direction = 'outgoing'/);
  assert.match(hardening, /payment_kind = 'moral_trade_payment'/);
  assert.match(hardening, /settlement_status = 'settled'/);
  assert.match(hardening, /gross_settled_cents[\s\S]{0,120}- observation\.refunded_cents[\s\S]{0,120}- observation\.reversed_cents[\s\S]{0,120}- observation\.chargeback_cents/);
  assert.match(hardening, /eligible_total_bigint \/ 10/);
  assert.match(hardening, /row_number\(\) over \([\s\S]*remainder_numerator desc, stable_compact_key asc/);
  assert.doesNotMatch(hardening, /least\([^\n]*obligation|monthly_contribution_cap/i);
});

test("readiness, voting, and direct delegation encode the frozen numeric rules", () => {
  assert.match(hardening, /partition by latest\.unique_person_key_hash/);
  assert.match(hardening, /unique_person_count >= 100 and scheduled_total >= 50000/);
  assert.match(hardening, /activation_blocked/);
  assert.match(hardening, /sqrt\(net_settled_contribution_cents::numeric\)/);
  assert.match(hardening, /700000000000/);
  assert.match(hardening, /300000000000/);
  assert.match(hardening, /total_inserted <> 1000000000000/);
  assert.match(hardening, /controlled_weight_units > 100000000000/);
  assert.match(hardening, /directOnly', true/);
  assert.match(hardening, /incomingWeightRedelegated', false/);
});

test("activation is hard-disabled even when a readiness snapshot is threshold-ready", () => {
  assert.match(base, /constraint mpgf_public_goods_compacts_activation_execution_disabled/);
  assert.match(base, /constraint mpgf_public_goods_compacts_active_requires_execution_gate/);
  assert.match(hardening, /Compact activation remains hard-disabled in transaction-v2/);
  assert.doesNotMatch(hardening, /update public\.mpgf_public_goods_compacts[\s\S]{0,200}set status = 'active'/i);
});

test("application routes validate v2 state and expose no capture path", () => {
  for (const route of [membershipRoute, allocationRoute, delegationRoute]) {
    assert.match(route, /getViewer/);
    assert.match(route, /public-goods-compacts-service/);
  }
  assert.match(service, /validateAndNormalizeMpgfPublicGoodsCompactsDatabaseState/);
  assert.match(service, /assertMpgfPublicGoodsCompactMutationSafety/);
  assert.match(state, /hasSafeObligation/);
  assert.match(state, /hasSafeAllocation/);
  const sources = [model, state, service, membershipRoute, allocationRoute, delegationRoute, component, migration].join("\n");
  assert.doesNotMatch(sources, /PaymentIntent|payment_intent|checkout\.sessions|createCheckoutSession|stripe\./i);
});

test("generated database types expose every v2 table and current RPC names", () => {
  for (const suffix of tables) {
    assert.match(databaseTypes, new RegExp(`mpgf_public_goods_${suffix}: \\{`));
  }
  for (const rpc of [
    "get_mpgf_public_goods_compacts_v2_state",
    "join_mpgf_public_goods_compact_v2",
    "set_mpgf_public_goods_compact_allocation_v2",
    "freeze_mpgf_public_goods_financial_cycle_v2",
    "freeze_mpgf_public_goods_readiness_v2",
    "freeze_mpgf_public_goods_voting_v2",
    "freeze_mpgf_public_goods_delegations_v2",
  ]) assert.match(databaseTypes, new RegExp(`${rpc}: \\{`));
  assert.doesNotMatch(databaseTypes, /p_declared_eligible_monthly_spending_cents/);
});

test("seeds publish exactly three current charters and no participant or financial facts", () => {
  const seed = base.slice(base.indexOf("insert into public.mpgf_public_goods_compacts"));
  for (const title of ["Future Flourishing", "Animal Welfare", "Global Health"]) {
    assert.equal(seed.split(`'${title}'`).length - 1, 1);
  }
  assert.doesNotMatch(seed, /insert into public\.mpgf_public_goods_(?:compact_memberships|outflow_|obligation_|scheduled_|settled_|funding_|readiness_|voting_|delegation_)/i);
});

test("the public Compact route remains in the canonical sitemap", () => {
  assert.match(read("src/app/sitemap.ts"), /getAbsoluteUrl\("\/mpgf\/compacts"\)/);
  assert.match(hub, /transaction-based obligation/);
  assert.match(hub, /100-person \+ \$500 readiness/);
  assert.doesNotMatch(hub, /1% contribution rule|\$10 monthly cap|5,000-member/);
});

test("the protected Compact surface does not trigger speculative route prefetches", () => {
  assert.equal(compactPage.match(/<Link\b/g)?.length, compactPage.match(/<Link\s+prefetch=\{false\}/g)?.length);
  assert.match(pageFrame, /<Breadcrumbs prefetch=\{false\}/);
  assert.equal(pageFrame.match(/<Link\b/g)?.length, pageFrame.match(/<Link\s+prefetch=\{false\}/g)?.length);
  assert.match(pagePrimitives, /<Link prefetch=\{prefetch\} href="\/">Home<\/Link>/);
  assert.match(pagePrimitives, /<Link prefetch=\{prefetch\} href=\{item\.href\}>/);
});

test("successful Compact mutations refresh durable private state without cached router props", () => {
  assert.match(component, /useState\(initialState\)/);
  assert.match(component, /fetch\("\/api\/mpgf\/compacts", \{[\s\S]{0,120}cache: "no-store"/);
  assert.match(component, /setState\(await stateRequest\(\)\)/);
  assert.doesNotMatch(component, /router\.refresh\(\)/);
});
