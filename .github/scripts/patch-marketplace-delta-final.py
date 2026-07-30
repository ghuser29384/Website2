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

    old_write_migration_start = '''def write_migration() -> None:
    source_path, confirm_function = extract_latest_function("confirm_agreement_version_v2")
    old_eligibility = "if not found or not moral_trade_private.offer_is_invitable(offer_row.id) then"
'''
    new_write_migration_start = r'''def write_migration() -> None:
    old_eligibility = "if not found or not moral_trade_private.offer_is_invitable(offer_row.id) then"

    # Current main identity-binds the public confirmation RPC and moves the reviewed
    # transactional body behind confirm_agreement_version_v2_unbound_legacy. Find the
    # latest historical full body containing the offer-eligibility guard, then target
    # that internal function. The public wrapper and its auth.uid() binding remain intact.
    marker = "create or replace function public.confirm_agreement_version_v2("
    latest_compatible: tuple[Path, str] | None = None
    for candidate_path in sorted((ROOT / "supabase/migrations").glob("*.sql")):
        candidate_source = candidate_path.read_text(encoding="utf-8")
        cursor = 0
        while True:
            start = candidate_source.find(marker, cursor)
            if start < 0:
                break
            tag_match = re.search(
                r"\bas\s+(\$[A-Za-z_][A-Za-z0-9_]*\$|\$\$)",
                candidate_source[start:],
                flags=re.IGNORECASE,
            )
            if tag_match is None:
                cursor = start + len(marker)
                continue
            tag = tag_match.group(1)
            body_start = start + tag_match.end()
            end_marker = f"\n{tag};"
            end = candidate_source.find(end_marker, body_start)
            if end < 0:
                raise RuntimeError(
                    f"Could not find closing {tag} for confirm_agreement_version_v2 "
                    f"in {candidate_path}."
                )
            end += len(end_marker)
            fragment = candidate_source[start:end]
            if old_eligibility in fragment:
                latest_compatible = (candidate_path, fragment)
            cursor = end

    if latest_compatible is None:
        raise RuntimeError(
            "No historical full confirm_agreement_version_v2 body contains the "
            "canonical offer-eligibility guard."
        )

    source_path, confirm_function = latest_compatible
    confirm_function = replace_once(
        confirm_function,
        "create or replace function public.confirm_agreement_version_v2(",
        "create or replace function public.confirm_agreement_version_v2_unbound_legacy(",
        "unbound confirmation implementation target",
    )
'''
    source = replace_once(
        source,
        old_write_migration_start,
        new_write_migration_start,
        "current-core confirmation migration prelude",
    )

    old_reset = '''-- Reset inside the same outer transaction and exercise claimed-guest acceptance.
delete from public.trade_threads where offer_id='10000000-0000-4000-8000-000000000158'::uuid;
delete from public.agreements where offer_id='10000000-0000-4000-8000-000000000158'::uuid;
delete from public.interests where offer_id='10000000-0000-4000-8000-000000000158'::uuid;
delete from public.guest_interests where offer_id='10000000-0000-4000-8000-000000000158'::uuid;
update public.offers
set status='open', workflow_status='published', closed_at=null, deleted_at=null, updated_at=now()
where id='10000000-0000-4000-8000-000000000158'::uuid;
'''
    new_reset = '''-- Reset inside the same outer transaction and exercise claimed-guest acceptance.
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
'''
    source = replace_once(
        source,
        old_reset,
        new_reset,
        "member-to-guest transaction-local reset",
    )

    path.write_text(source, encoding="utf-8")


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
        replace_once(source, old, new, "exact QA migration alignment block"),
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
        print(f"Patched materializer for current core-trade identity binding: {args.materializer}")
    else:
        patch_runner(args.runner)
        print(f"Patched runner for exact QA migration alignment: {args.runner}")


if __name__ == "__main__":
    main()
