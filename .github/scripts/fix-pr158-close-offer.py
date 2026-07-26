#!/usr/bin/env python3
from __future__ import annotations

from pathlib import Path

INTERNAL_MIGRATION = Path(
    "supabase/migrations/20260726164500_fix_atomic_acceptance_core_internal_write.sql"
)
OFFER_MIGRATION = Path(
    "supabase/migrations/20260726165500_close_offer_on_atomic_acceptance.sql"
)
SQL_REGRESSION = Path("supabase/tests/marketplace_interest_acceptance_atomicity.sql")
SOURCE_TEST = Path("src/app/offers/marketplace-interest-acceptance.test.ts")


def build_offer_migration() -> str:
    source = INTERNAL_MIGRATION.read_text(encoding="utf-8")
    start = source.index("create or replace function public.accept_marketplace_interest_v1")
    end = source.index("notify pgrst, 'reload schema';", start)
    rpc_block = source[start:end]
    old_update = """  update public.offers
  set status = 'matched', updated_at = now()
  where id = offer_row.id;
"""
    new_update = """  update public.offers
  set
    status = 'matched',
    workflow_status = 'closed',
    closed_at = now(),
    updated_at = now()
  where id = offer_row.id;
"""
    if rpc_block.count(old_update) != 2:
        raise RuntimeError(
            f"Expected two legacy matched-offer updates; found {rpc_block.count(old_update)}."
        )
    rpc_block = rpc_block.replace(old_update, new_update)
    migration = (
        "-- Atomic acceptance removes the offer from the public marketplace immediately after\n"
        "-- creating the proposed agreement. The offer guard requires matched offers to leave the\n"
        "-- published workflow state, matching the existing bilateral-confirmation functions.\n\n"
        + rpc_block
        + "notify pgrst, 'reload schema';\n"
    )
    if migration.count("workflow_status = 'closed'") != 2:
        raise RuntimeError("Each acceptance RPC must close the offer workflow once.")
    if migration.count("closed_at = now()") != 2:
        raise RuntimeError("Each acceptance RPC must timestamp offer closure once.")
    return migration


def extend_sql_regression() -> None:
    source = SQL_REGRESSION.read_text(encoding="utf-8")
    declarations_old = """  response_status text;
  offer_status text;
  agreement_row public.agreements%rowtype;
"""
    declarations_new = """  response_status text;
  offer_status text;
  offer_workflow_status text;
  offer_closed_at timestamptz;
  agreement_row public.agreements%rowtype;
"""
    if source.count(declarations_old) != 1:
        raise RuntimeError("Expected one success-assertion declaration block.")
    source = source.replace(declarations_old, declarations_new, 1)

    offer_query_old = """  select status::text into offer_status
  from public.offers
  where id = '10000000-0000-4000-8000-000000000158'::uuid;
"""
    offer_query_new = """  select status::text, workflow_status, closed_at
  into offer_status, offer_workflow_status, offer_closed_at
  from public.offers
  where id = '10000000-0000-4000-8000-000000000158'::uuid;
"""
    if source.count(offer_query_old) != 1:
        raise RuntimeError("Expected one success-assertion offer query.")
    source = source.replace(offer_query_old, offer_query_new, 1)

    assertion_old = """  if offer_status <> 'matched' then
    raise exception 'Success regression: offer status is %, expected matched.', offer_status;
  end if;
"""
    assertion_new = """  if offer_status <> 'matched'
     or offer_workflow_status <> 'closed'
     or offer_closed_at is null then
    raise exception 'Success regression: offer state is status %, workflow %, closed_at %; expected matched, closed, timestamped.',
      offer_status,
      offer_workflow_status,
      offer_closed_at;
  end if;
"""
    if source.count(assertion_old) != 1:
        raise RuntimeError("Expected one matched-offer success assertion.")
    SQL_REGRESSION.write_text(source.replace(assertion_old, assertion_new, 1), encoding="utf-8")


def extend_source_test() -> None:
    source = SOURCE_TEST.read_text(encoding="utf-8")
    declaration_marker = """const sqlRegression = readFileSync(
  path.join(repoRoot, "supabase/tests/marketplace_interest_acceptance_atomicity.sql"),
  "utf8",
);
"""
    offer_declaration = """const offerMigration = readFileSync(
  path.join(
    repoRoot,
    "supabase/migrations/20260726165500_close_offer_on_atomic_acceptance.sql",
  ),
  "utf8",
);
"""
    if source.count(declaration_marker) != 1:
        raise RuntimeError("Expected one SQL regression declaration.")
    source = source.replace(declaration_marker, offer_declaration + declaration_marker, 1)

    assertion_marker = """  assert.equal(
    (internalMigration.match(/set_config\('app\.core_trade_internal', '', true\)/g) ?? []).length,
    2,
  );
"""
    offer_assertions = """  assert.equal((offerMigration.match(/workflow_status = 'closed'/g) ?? []).length, 2);
  assert.equal((offerMigration.match(/closed_at = now\(\)/g) ?? []).length, 2);
"""
    if source.count(assertion_marker) != 1:
        raise RuntimeError("Expected one internal-flag clear assertion.")
    source = source.replace(assertion_marker, assertion_marker + offer_assertions, 1)

    regression_marker = """  assert.match(sqlRegression, /offer_status <> 'open'/);
"""
    regression_assertions = """  assert.match(sqlRegression, /offer_workflow_status <> 'closed'/);
  assert.match(sqlRegression, /offer_closed_at is null/);
"""
    if source.count(regression_marker) != 1:
        raise RuntimeError("Expected one offer rollback assertion marker.")
    SOURCE_TEST.write_text(
        source.replace(regression_marker, regression_marker + regression_assertions, 1),
        encoding="utf-8",
    )


def main() -> None:
    OFFER_MIGRATION.write_text(build_offer_migration(), encoding="utf-8")
    extend_sql_regression()
    extend_source_test()
    print("Generated PR #158 atomic offer-close repair files.")


if __name__ == "__main__":
    main()
