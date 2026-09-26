import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const migration = readFileSync(
  "supabase/migrations/20260814024354_harden_trade_donation_pool_component_trigger_rpc.sql",
  "utf8",
);

test("pooled-settlement component trigger remains service-role-only when present", () => {
  assert.match(
    migration,
    /to_regprocedure\('public\.mark_trade_donation_pool_component_stale\(\)'\) is not null/i,
  );
  assert.match(
    migration,
    /revoke all on function public\.mark_trade_donation_pool_component_stale\(\) from public, anon, authenticated/i,
  );
  assert.match(
    migration,
    /grant execute on function public\.mark_trade_donation_pool_component_stale\(\) to service_role/i,
  );
});
