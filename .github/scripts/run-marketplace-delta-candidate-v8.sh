#!/usr/bin/env bash
set -euo pipefail

python3 - <<'PY'
from pathlib import Path

path = Path('.github/scripts/materialize-marketplace-delta.py')
source = path.read_text(encoding='utf-8')

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
if source.count(old_reset) != 1:
    raise SystemExit(f'Expected one member-to-guest reset block; found {source.count(old_reset)}.')
source = source.replace(old_reset, new_reset, 1)
path.write_text(source, encoding='utf-8')
PY

# Ensure the exact migration generated from the latest current main is what QA executes,
# even if this disposable QA project already records the same migration version from an
# earlier materialization attempt. Production remains compile-and-rollback only.
python3 - <<'PY'
from pathlib import Path

path = Path('.github/scripts/run-marketplace-delta-candidate.sh')
source = path.read_text(encoding='utf-8')
old = '''migration="supabase/migrations/${MIGRATION_VERSION}_${MIGRATION_NAME}.sql"
migration_sha="$(sha256sum "$migration" | cut -d' ' -f1)"
recorded="$(psql "$QA_SUPABASE_DB_URL" --no-psqlrc --tuples-only --no-align \\
  --set ON_ERROR_STOP=1 \\
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
  psql "$QA_SUPABASE_DB_URL" --no-psqlrc --set ON_ERROR_STOP=1 \\
    --single-transaction --file "$apply_file"
fi
'''
new = '''migration="supabase/migrations/${MIGRATION_VERSION}_${MIGRATION_NAME}.sql"
migration_sha="$(sha256sum "$migration" | cut -d' ' -f1)"

# QA is disposable and may contain an earlier attempt at this exact migration version.
# Re-apply the idempotent CREATE OR REPLACE migration from this candidate, then make the
# one QA migration-history row identify the exact current-main source and SHA. This is
# never executed against production; production was already tested with rollback above.
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
psql "$QA_SUPABASE_DB_URL" --no-psqlrc --set ON_ERROR_STOP=1 \\
  --single-transaction --file "$apply_file"

qa_recorded_key="$(psql "$QA_SUPABASE_DB_URL" --no-psqlrc --tuples-only --no-align \\
  --set ON_ERROR_STOP=1 \\
  --command "select idempotency_key from supabase_migrations.schema_migrations where version='${MIGRATION_VERSION}' and name='${MIGRATION_NAME}';")"
test "$(echo "$qa_recorded_key" | tr -d '[:space:]')" = "marketplace-delta-${MIGRATION_VERSION}-${migration_sha}"
'''
if source.count(old) != 1:
    raise SystemExit(f'Expected one QA migration application block; found {source.count(old)}.')
path.write_text(source.replace(old, new, 1), encoding='utf-8')
PY

bash .github/scripts/run-marketplace-delta-candidate-v7.sh
