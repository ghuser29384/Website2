#!/usr/bin/env python3
from __future__ import annotations

import argparse
from pathlib import Path


def replace_once(source: str, old: str, new: str, label: str) -> str:
    count = source.count(old)
    if count != 1:
        raise RuntimeError(f"Expected exactly one {label}; found {count}.")
    return source.replace(old, new, 1)


def patch_materializer(path: Path) -> None:
    source = path.read_text(encoding="utf-8")
    old = """-- Reset inside the same outer transaction and exercise claimed-guest acceptance.
delete from public.trade_threads where offer_id='10000000-0000-4000-8000-000000000158'::uuid;
delete from public.agreements where offer_id='10000000-0000-4000-8000-000000000158'::uuid;
delete from public.interests where offer_id='10000000-0000-4000-8000-000000000158'::uuid;
delete from public.guest_interests where offer_id='10000000-0000-4000-8000-000000000158'::uuid;
update public.offers
set status='open', workflow_status='published', closed_at=null, deleted_at=null, updated_at=now()
where id='10000000-0000-4000-8000-000000000158'::uuid;
"""
    new = """-- Reset inside the same outer transaction and exercise claimed-guest acceptance.
delete from public.trade_threads where offer_id='10000000-0000-4000-8000-000000000158'::uuid;
delete from public.agreements where offer_id='10000000-0000-4000-8000-000000000158'::uuid;
delete from public.interests where offer_id='10000000-0000-4000-8000-000000000158'::uuid;
delete from public.guest_interests where offer_id='10000000-0000-4000-8000-000000000158'::uuid;

-- The preceding responder confirmation deliberately binds auth.uid() to the responder.
-- Clear that synthetic request identity before restoring the transaction-local fixture;
-- guard_core_offer_mutation correctly forbids an authenticated user from reopening a
-- closed offer, while this postgres-admin test reset is rolled back at the end.
select set_config('request.jwt.claim.sub', '', true);
select set_config(
  'request.jwt.claims',
  jsonb_build_object('role', 'service_role')::text,
  true
);

update public.offers
set status='open', workflow_status='published', closed_at=null, deleted_at=null, updated_at=now()
where id='10000000-0000-4000-8000-000000000158'::uuid;
"""
    path.write_text(
        replace_once(source, old, new, "member-to-guest transaction-local reset"),
        encoding="utf-8",
    )


def patch_runner(path: Path) -> None:
    source = path.read_text(encoding="utf-8")
    old = r'''migration="supabase/migrations/${MIGRATION_VERSION}_${MIGRATION_NAME}.sql"
migration_sha="$(sha256sum "$migration" | cut -d' ' -f1)"
recorded="$(psql "$QA_SUPABASE_DB_URL" --no-psqlrc --tuples-only --no-align \
  --set ON_ERROR_STOP=1 \
  --command "select exists(select 1 from supabase_migrations.schema_migrations where version='${MIGRATION_VERSION}');")"
if [[ "$recorded" = "f" ]]; then
  apply_file="$RUNNER_TEMP/apply-marketplace-delta.sql"
  cat "$migration" > "$apply_file"
  cat >> "$apply_file" <<SQL

insert into supabase_migrations.schema_migrations(
  version, statements, name, created_by, idempotency_key
) values (
  '${MIGRATION_VERSION}',
  array['Applied from current-main marketplace delta based on ${BASE_MAIN_SHA}; sha256 ${migration_sha}'],
  '${MIGRATION_NAME}',
  'github-actions-marketplace-delta',
  'marketplace-delta-${MIGRATION_VERSION}-${migration_sha}'
);
SQL
  psql "$QA_SUPABASE_DB_URL" --no-psqlrc --set ON_ERROR_STOP=1 \
    --single-transaction --file "$apply_file"
fi
'''
    new = r'''migration="supabase/migrations/${MIGRATION_VERSION}_${MIGRATION_NAME}.sql"
migration_sha="$(sha256sum "$migration" | cut -d' ' -f1)"

# QA is disposable and may record this version from an earlier candidate base.
# Reapply the idempotent CREATE OR REPLACE migration generated from this exact
# current-main candidate and update the single QA history row to its exact SHA.
# Production remains compile-and-rollback only.
apply_file="$RUNNER_TEMP/apply-marketplace-delta.sql"
cat "$migration" > "$apply_file"
cat >> "$apply_file" <<SQL

insert into supabase_migrations.schema_migrations(
  version, statements, name, created_by, idempotency_key
) values (
  '${MIGRATION_VERSION}',
  array['Applied from current-main marketplace delta based on ${BASE_MAIN_SHA}; sha256 ${migration_sha}'],
  '${MIGRATION_NAME}',
  'github-actions-marketplace-delta',
  'marketplace-delta-${MIGRATION_VERSION}-${migration_sha}'
)
on conflict (version) do update set
  statements = excluded.statements,
  name = excluded.name,
  created_by = excluded.created_by,
  idempotency_key = excluded.idempotency_key;
SQL
psql "$QA_SUPABASE_DB_URL" --no-psqlrc --set ON_ERROR_STOP=1 \
  --single-transaction --file "$apply_file"

qa_recorded_key="$(psql "$QA_SUPABASE_DB_URL" --no-psqlrc --tuples-only --no-align \
  --set ON_ERROR_STOP=1 \
  --command "select idempotency_key from supabase_migrations.schema_migrations where version='${MIGRATION_VERSION}' and name='${MIGRATION_NAME}';")"
test "$(echo "$qa_recorded_key" | tr -d '[:space:]')" = "marketplace-delta-${MIGRATION_VERSION}-${migration_sha}"
'''
    path.write_text(
        replace_once(source, old, new, "QA migration alignment block"),
        encoding="utf-8",
    )


def main() -> None:
    parser = argparse.ArgumentParser()
    group = parser.add_mutually_exclusive_group(required=True)
    group.add_argument("--materializer", type=Path)
    group.add_argument("--runner", type=Path)
    args = parser.parse_args()

    if args.materializer:
        patch_materializer(args.materializer)
        print(f"Patched transaction-local reset in {args.materializer}.")
    else:
        patch_runner(args.runner)
        print(f"Patched exact QA migration alignment in {args.runner}.")


if __name__ == "__main__":
    main()
