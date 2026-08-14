import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const root = new URL("../../../", import.meta.url);
const read = (path: string) => readFileSync(new URL(path, root), "utf8");

const hardeningMigration = read(
  "supabase/migrations/20260814023000_mpgf_public_goods_compacts_state_hardening.sql",
);
const service = read("src/lib/mpgf/public-goods-compacts-service.ts");
const stateValidation = read("src/lib/mpgf/public-goods-compacts-state.ts");
const page = read("src/app/mpgf/compacts/page.tsx");
const getRoute = read("src/app/api/mpgf/compacts/route.ts");
const membershipRoute = read(
  "src/app/api/mpgf/compacts/membership/route.ts",
);
const delegationRoute = read(
  "src/app/api/mpgf/compacts/delegation/route.ts",
);

test("electorates require active compacts and stale delegations are revoked", () => {
  assert.match(
    hardeningMigration,
    /not allocation_electorate_active[\s\S]*or status = 'active'/,
  );
  assert.match(
    hardeningMigration,
    /status = 'active'[\s\S]*accepted_member_count >= activation_threshold_members/,
  );
  assert.match(
    hardeningMigration,
    /update public\.mpgf_public_goods_compact_delegations[\s\S]*electorate_key is distinct from new\.allocation_electorate_key/,
  );
  assert.match(
    hardeningMigration,
    /security definer[\s\S]*set search_path = ''/,
  );
  assert.match(
    hardeningMigration,
    /revoke all on function public\.mpgf_public_goods_compact_revoke_stale_delegations/,
  );
});

test("all product routes use the complete validated compact service", () => {
  for (const source of [page, getRoute, membershipRoute, delegationRoute]) {
    assert.match(source, /public-goods-compacts-service/);
    assert.doesNotMatch(source, /public-goods-compacts-server/);
  }

  assert.match(service, /validateAndNormalizeMpgfPublicGoodsCompactsDatabaseState/);
  assert.match(service, /assertMpgfPublicGoodsCompactMutationSafety/);
});

test("state validation covers activation, electorate, delegation, exit, and mutation boundaries", () => {
  for (const required of [
    "value.summary !== foundingCharter.summary",
    "acceptedMemberCount <",
    "hasSafeActivation",
    "hasSafeElectorate",
    "hasSafeMembership",
    "hasSafeDelegation",
    "normalizeEffectiveExits",
    "paymentMandateCreated",
    "moneyTransferred",
  ]) {
    assert.ok(
      stateValidation.includes(required),
      `missing complete state-validation boundary: ${required}`,
    );
  }
});
