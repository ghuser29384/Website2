#!/usr/bin/env bash
set -euo pipefail

# Patch only generated candidate/test content in the checked-out orchestration worktree.
# The downstream runner already copies this materializer outside the worktree and restores
# it before switching to current main.
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
path.write_text(source.replace(old_reset, new_reset, 1), encoding='utf-8')
PY

# Work with temporary copies of v7 and v6 so no runner-file edit can block the
# downstream checkout of the clean current-main product branch.
cp .github/scripts/run-marketplace-delta-candidate-v7.sh \
  "$RUNNER_TEMP/run-marketplace-delta-candidate-v7.sh"
cp .github/scripts/run-marketplace-delta-candidate-v6.sh \
  "$RUNNER_TEMP/run-marketplace-delta-candidate-v6.sh"

python3 - <<'PY'
import os
from pathlib import Path

v7 = Path(os.environ['RUNNER_TEMP']) / 'run-marketplace-delta-candidate-v7.sh'
v7_source = v7.read_text(encoding='utf-8')
old_v7_call = 'bash .github/scripts/run-marketplace-delta-candidate-v6.sh\n'
new_v7_call = 'bash "$RUNNER_TEMP/run-marketplace-delta-candidate-v6.sh"\n'
if v7_source.count(old_v7_call) != 1:
    raise SystemExit(f'Expected one v7-to-v6 call; found {v7_source.count(old_v7_call)}.')
v7.write_text(v7_source.replace(old_v7_call, new_v7_call, 1), encoding='utf-8')

v6 = Path(os.environ['RUNNER_TEMP']) / 'run-marketplace-delta-candidate-v6.sh'
v6_source = v6.read_text(encoding='utf-8')
old_tail = 'bash "$runner"\n'
patch_and_run = r'''python3 - <<'PY_QA_RUNNER'
import os
from pathlib import Path

runner = Path(os.environ['RUNNER_TEMP']) / 'run-marketplace-delta-candidate.sh'
source = runner.read_text(encoding='utf-8')
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
psql "$QA_SUPABASE_DB_URL" --no-psqlrc --set ON_ERROR_STOP=1 \\
  --single-transaction --file "$apply_file"

qa_recorded_key="$(psql "$QA_SUPABASE_DB_URL" --no-psqlrc --tuples-only --no-align \\
  --set ON_ERROR_STOP=1 \\
  --command "select idempotency_key from supabase_migrations.schema_migrations where version='${MIGRATION_VERSION}' and name='${MIGRATION_NAME}';")"
test "$(echo "$qa_recorded_key" | tr -d '[:space:]')" = "marketplace-delta-${MIGRATION_VERSION}-${migration_sha}"
'''
if source.count(old) != 1:
    raise SystemExit(f'Expected one QA migration application block; found {source.count(old)}.')
runner.write_text(source.replace(old, new, 1), encoding='utf-8')
PY_QA_RUNNER

bash "$runner"
'''
if v6_source.count(old_tail) != 1:
    raise SystemExit(f'Expected one v6 runner call; found {v6_source.count(old_tail)}.')
v6.write_text(v6_source.replace(old_tail, patch_and_run, 1), encoding='utf-8')
PY

bash "$RUNNER_TEMP/run-marketplace-delta-candidate-v7.sh"
