import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const root = new URL("../../../", import.meta.url);
const read = (path: string) => readFileSync(new URL(path, root), "utf8");

const migration = read(
  "supabase/migrations/20260813163052_mpgf_public_goods_compacts.sql",
);
const model = read("src/lib/mpgf/public-goods-compacts.ts");
const server = read("src/lib/mpgf/public-goods-compacts-server.ts");
const getRoute = read("src/app/api/mpgf/compacts/route.ts");
const membershipRoute = read(
  "src/app/api/mpgf/compacts/membership/route.ts",
);
const delegationRoute = read(
  "src/app/api/mpgf/compacts/delegation/route.ts",
);
const component = read(
  "src/components/mpgf/mpgf-public-goods-compacts.tsx",
);

test("compact tables use RLS and deny direct client writes", () => {
  for (const table of [
    "mpgf_public_goods_compacts",
    "mpgf_public_goods_compact_memberships",
    "mpgf_public_goods_compact_delegations",
    "mpgf_public_goods_compact_idempotency_keys",
  ]) {
    assert.match(
      migration,
      new RegExp(`alter table public\\.${table} enable row level security`),
    );
    assert.match(
      migration,
      new RegExp(
        `revoke all on table public\\.${table} from public, anon, authenticated`,
      ),
    );
  }
  assert.doesNotMatch(
    migration,
    /grant (insert|update|delete|all) on table public\.mpgf_public_goods_compact_(memberships|delegations|idempotency_keys) to authenticated/i,
  );
  assert.match(migration, /memberships_owner_select[\s\S]*auth\.uid\(\)[\s\S]*user_id/);
});

test("authenticated security-definer RPCs are versioned, idempotent, and search-path safe", () => {
  for (const rpc of [
    "join_mpgf_public_goods_compact",
    "request_mpgf_public_goods_compact_exit",
    "set_mpgf_public_goods_compact_delegation",
    "clear_mpgf_public_goods_compact_delegation",
  ]) {
    assert.match(
      migration,
      new RegExp(
        `function public\\.${rpc}[\\s\\S]*security definer[\\s\\S]*set search_path = ''`,
      ),
    );
    assert.match(
      migration,
      new RegExp(`grant execute on function public\\.${rpc}`),
    );
  }
  assert.match(migration, /auth\.uid\(\)/);
  assert.match(migration, /A Moral Trade profile is required/);
  assert.match(migration, /exact current constitution version/);
  assert.match(migration, /mpgf_public_goods_compact_idempotency_lookup/);
  assert.match(migration, /different request/);
});

test("constitutional database checks prohibit assignment, marketplace tax, project refusal, and collection", () => {
  for (const required of [
    "opt_in_only boolean not null default true check (opt_in_only)",
    "random_assignment_allowed boolean not null default false check (not random_assignment_allowed)",
    "core_marketplace_taxed boolean not null default false check (not core_marketplace_taxed)",
    "binding_only_after_activation boolean not null default true check (binding_only_after_activation)",
    "not per_project_refusal_allowed_after_activation",
    "exit_prospective_only_after_activation",
    "money_moves_on_join boolean not null default false check (not money_moves_on_join)",
    "automatic_collection_enabled boolean not null default false check (not automatic_collection_enabled)",
  ]) {
    assert.ok(migration.includes(required), `missing database invariant: ${required}`);
  }
  assert.match(migration, /accepted_count >= compact_record\.activation_threshold_members/);
  assert.match(migration, /frozen_constitution_version = constitution_version/);
  assert.match(migration, /set status = 'active', activated_at = action_at/);
  assert.match(migration, /greatest\([\s\S]*make_interval\(months[\s\S]*make_interval\(days/);
});

test("delegation is same-compact, active-only, non-self, and revocable", () => {
  assert.match(migration, /compact_record\.status <> 'active'/);
  assert.match(migration, /allocation_electorate_active/);
  assert.match(migration, /delegatee_record[\s\S]*compact_id = compact_record\.id[\s\S]*status = 'active'/);
  assert.match(migration, /Self-delegation is not allowed/);
  assert.match(migration, /membershipTransferred', false/);
  assert.match(migration, /moneyTransferred', false/);
  assert.match(migration, /reputationTransferred', false/);
});

test("seeds contain exactly the three published charters and no members or activity", () => {
  const insertTail = migration.slice(
    migration.indexOf("insert into public.mpgf_public_goods_compacts"),
  );
  for (const title of ["Future Flourishing", "Animal Welfare", "Global Health"]) {
    assert.equal(insertTail.split(`'${title}'`).length - 1, 1);
  }
  assert.doesNotMatch(
    insertTail,
    /insert into public\.mpgf_public_goods_compact_(memberships|delegations|idempotency_keys)/i,
  );
});

test("server and APIs fail closed and reuse authenticated MPGF no-store patterns", () => {
  assert.match(server, /hasSupabaseEnv/);
  assert.match(server, /buildMpgfPublicGoodsCompactPublishedExamplesState/);
  assert.match(server, /moneyMovesOnPageAction !== false/);
  assert.match(server, /automaticCollectionEnabled !== false/);
  assert.match(getRoute, /MPGF_PUBLIC_GOODS_API_HEADERS/);
  assert.match(membershipRoute, /getViewer/);
  assert.match(membershipRoute, /parseMpgfPublicGoodsCompactConstitutionVersion/);
  assert.match(delegationRoute, /getViewer/);
  assert.match(delegationRoute, /parseMpgfPublicGoodsCompactMembershipId/);
});

test("new compact sources contain no payment capture or fake-success path", () => {
  const newSources = [
    model,
    server,
    getRoute,
    membershipRoute,
    delegationRoute,
    component,
    migration,
  ].join("\n");

  assert.doesNotMatch(
    newSources,
    /PaymentIntent|payment_intent|stripe|capture_method|checkout\.sessions|createCheckoutSession/i,
  );
  assert.match(newSources, /moneyMoved/);
  assert.match(newSources, /automaticCollectionEnabled/);
  assert.match(component, /No compact allocation electorate is active/);
});

test("the public compact route is included in the canonical sitemap", () => {
  const sitemapSource = read("src/app/sitemap.ts");

  assert.match(sitemapSource, /getAbsoluteUrl\("\/mpgf\/compacts"\)/);
});
