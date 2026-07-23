#!/usr/bin/env bash
set -euo pipefail

PRODUCTION_REF="jnpoxvalyjtdghnperyu"
QA_REF="hvmxfjjbdcgjjudmthdz"

require_command() {
  command -v "$1" >/dev/null 2>&1 || {
    echo "Required command is unavailable: $1" >&2
    exit 1
  }
}

require_env() {
  local name="$1"
  if [[ -z "${!name:-}" ]]; then
    echo "Missing required environment variable: $name" >&2
    exit 1
  fi
}

require_command supabase
require_command psql
require_command node

require_env PROD_SUPABASE_DB_URL
require_env QA_SUPABASE_DB_URL
require_env QA_SUPABASE_URL
require_env QA_SUPABASE_SERVICE_ROLE_KEY
require_env QA_TEST_PASSWORD

if [[ "$PROD_SUPABASE_DB_URL" != *"$PRODUCTION_REF"* ]]; then
  echo "Refusing to dump an unexpected source database. Expected project ref $PRODUCTION_REF." >&2
  exit 1
fi

if [[ "$QA_SUPABASE_DB_URL" != *"$QA_REF"* ]]; then
  echo "Refusing to restore an unexpected target database. Expected project ref $QA_REF." >&2
  exit 1
fi

if [[ "$QA_SUPABASE_URL" != "https://$QA_REF.supabase.co" ]]; then
  echo "QA_SUPABASE_URL does not identify the isolated MoralTrade QA project." >&2
  exit 1
fi

work_dir="${QA_BOOTSTRAP_WORK_DIR:-${RUNNER_TEMP:-}/moraltrade-qa-bootstrap}"
if [[ -z "$work_dir" || "$work_dir" == "/moraltrade-qa-bootstrap" ]]; then
  work_dir="$(mktemp -d)/moraltrade-qa-bootstrap"
fi
mkdir -p "$work_dir"
chmod 700 "$work_dir"

schema_file="$work_dir/production-schema.sql"
history_schema_file="$work_dir/migration-history-schema.sql"
history_data_file="$work_dir/migration-history-data.sql"
prod_manifest="$work_dir/production-manifest.txt"
qa_manifest="$work_dir/qa-manifest.txt"

cleanup() {
  if [[ "${QA_KEEP_BOOTSTRAP_FILES:-0}" != "1" ]]; then
    rm -rf "$work_dir"
  else
    echo "Kept QA bootstrap files at: $work_dir"
  fi
}
trap cleanup EXIT

qa_public_table_count="$(
  psql "$QA_SUPABASE_DB_URL" -X -A -t -v ON_ERROR_STOP=1 -c \
    "select count(*) from information_schema.tables where table_schema = 'public' and table_type = 'BASE TABLE';"
)"
if [[ "$qa_public_table_count" != "0" ]]; then
  echo "Refusing to overwrite the QA project because it already has $qa_public_table_count public table(s)." >&2
  exit 1
fi

qa_auth_user_count="$(
  psql "$QA_SUPABASE_DB_URL" -X -A -t -v ON_ERROR_STOP=1 -c \
    "select count(*) from auth.users;"
)"
if [[ "$qa_auth_user_count" != "0" ]]; then
  echo "Refusing to bootstrap QA because auth.users is not empty." >&2
  exit 1
fi

echo "Exporting the production application schema without production rows..."
supabase db dump \
  --db-url "$PROD_SUPABASE_DB_URL" \
  --file "$schema_file"

supabase db dump \
  --db-url "$PROD_SUPABASE_DB_URL" \
  --file "$history_schema_file" \
  --schema supabase_migrations

supabase db dump \
  --db-url "$PROD_SUPABASE_DB_URL" \
  --file "$history_data_file" \
  --data-only \
  --use-copy \
  --schema supabase_migrations

if grep -Eq '^COPY (public|auth|storage)\.' "$schema_file"; then
  echo "The application schema export unexpectedly contains table rows." >&2
  exit 1
fi

if grep -Eq 'COPY auth\.users|INSERT INTO auth\.users' "$history_data_file"; then
  echo "The migration-history export unexpectedly contains Auth user rows." >&2
  exit 1
fi

manifest_query="
select 'table:' || table_name
from information_schema.tables
where table_schema = 'public' and table_type = 'BASE TABLE'
union all
select 'view:' || table_name
from information_schema.views
where table_schema = 'public'
union all
select 'materialized_view:' || matviewname
from pg_matviews
where schemaname = 'public'
union all
select 'enum:' || t.typname
from pg_type t
join pg_namespace n on n.oid = t.typnamespace
where n.nspname = 'public' and t.typtype = 'e'
union all
select 'function:' || p.proname || '(' || pg_get_function_identity_arguments(p.oid) || ')'
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
union all
select 'policy:' || tablename || ':' || policyname || ':' || cmd
from pg_policies
where schemaname = 'public'
order by 1;
"

psql "$PROD_SUPABASE_DB_URL" -X -A -t -v ON_ERROR_STOP=1 -c "$manifest_query" >"$prod_manifest"

echo "Restoring the schema into the isolated QA project..."
psql "$QA_SUPABASE_DB_URL" -X -v ON_ERROR_STOP=1 -c \
  "alter default privileges in schema public revoke all on tables from anon, authenticated;"
psql "$QA_SUPABASE_DB_URL" -X -v ON_ERROR_STOP=1 --single-transaction --file "$schema_file"

qa_history_count="$(
  psql "$QA_SUPABASE_DB_URL" -X -A -t -v ON_ERROR_STOP=1 -c \
    "select count(*) from supabase_migrations.schema_migrations;"
)"
if [[ "$qa_history_count" != "0" ]]; then
  echo "Refusing to replace non-empty QA migration history." >&2
  exit 1
fi
psql "$QA_SUPABASE_DB_URL" -X -v ON_ERROR_STOP=1 --file "$history_data_file"

# Supabase's schema dump intentionally excludes managed Storage schema objects.
# Recreate only the production bucket metadata and the single custom read policy;
# never copy Storage objects.
psql "$QA_SUPABASE_DB_URL" -X -v ON_ERROR_STOP=1 <<'SQL'
insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'trade-evidence',
  'trade-evidence',
  false,
  10485760,
  array[
    'application/pdf',
    'image/png',
    'image/jpeg',
    'image/webp',
    'text/plain'
  ]::text[]
)
on conflict (id) do update
set
  name = excluded.name,
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists public_safe_trade_evidence_read on storage.objects;
create policy public_safe_trade_evidence_read
on storage.objects
for select
to anon, authenticated
using (public.can_read_public_trade_evidence_object_v1(bucket_id, name));
SQL

psql "$QA_SUPABASE_DB_URL" -X -A -t -v ON_ERROR_STOP=1 -c "$manifest_query" >"$qa_manifest"

if ! diff -u "$prod_manifest" "$qa_manifest"; then
  echo "QA schema inventory differs from production. The restore is not accepted." >&2
  exit 1
fi

for table_name in \
  profiles \
  offers \
  interests \
  offer_comments \
  offer_carts \
  agreements \
  agreement_events \
  email_outbox \
  trade_threads \
  trade_messages \
  core_loop_events; do
  exists="$(
    psql "$QA_SUPABASE_DB_URL" -X -A -t -v ON_ERROR_STOP=1 -c \
      "select exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = '$table_name');"
  )"
  if [[ "$exists" != "t" ]]; then
    echo "Required QA table is missing: $table_name" >&2
    exit 1
  fi
done

for relation in profiles offers; do
  row_count="$(
    psql "$QA_SUPABASE_DB_URL" -X -A -t -v ON_ERROR_STOP=1 -c \
      "select count(*) from public.$relation;"
  )"
  if [[ "$row_count" != "0" ]]; then
    echo "Schema-only restore unexpectedly copied rows into public.$relation." >&2
    exit 1
  fi
done

qa_storage_object_count="$(
  psql "$QA_SUPABASE_DB_URL" -X -A -t -v ON_ERROR_STOP=1 -c \
    "select count(*) from storage.objects;"
)"
if [[ "$qa_storage_object_count" != "0" ]]; then
  echo "Schema-only restore unexpectedly copied Storage objects." >&2
  exit 1
fi

if [[ -n "${GITHUB_STEP_SUMMARY:-}" ]]; then
  {
    echo "## MoralTrade QA schema bootstrap"
    echo
    echo "- Source project: \`$PRODUCTION_REF\`"
    echo "- Target project: \`$QA_REF\`"
    echo "- Production and QA public-object manifests: identical"
    echo "- Production application rows copied: none"
    echo "- Auth users copied: none"
    echo "- Storage objects copied: none"
  } >>"$GITHUB_STEP_SUMMARY"
fi

echo "Creating deterministic synthetic QA users and one open proposal..."
node scripts/seed-moraltrade-qa.mjs

qa_seed_user_count="$(
  psql "$QA_SUPABASE_DB_URL" -X -A -t -v ON_ERROR_STOP=1 -c \
    "select count(*) from auth.users where email in ('qa-market-owner@example.com', 'qa-market-responder@example.com');"
)"
if [[ "$qa_seed_user_count" != "2" ]]; then
  echo "Expected two synthetic QA users after seeding; found $qa_seed_user_count." >&2
  exit 1
fi

qa_offer_count="$(
  psql "$QA_SUPABASE_DB_URL" -X -A -t -v ON_ERROR_STOP=1 -c \
    "select count(*) from public.offers where id = '10000000-0000-4000-8000-000000000158';"
)"
if [[ "$qa_offer_count" != "1" ]]; then
  echo "Expected the deterministic QA offer after seeding." >&2
  exit 1
fi

artifact_dir="${QA_BASELINE_ARTIFACT_DIR:-}"
if [[ -n "$artifact_dir" ]]; then
  mkdir -p "$artifact_dir"
  cp "$schema_file" "$artifact_dir/production-baseline.sql"
  cp "$history_schema_file" "$artifact_dir/migration-history-schema.sql"
  cp "$history_data_file" "$artifact_dir/migration-history-data.sql"
  cp "$prod_manifest" "$artifact_dir/production-manifest.txt"
  cp "$qa_manifest" "$artifact_dir/qa-manifest.txt"
  (
    cd "$artifact_dir"
    sha256sum \
      production-baseline.sql \
      migration-history-schema.sql \
      migration-history-data.sql \
      production-manifest.txt \
      qa-manifest.txt >SHA256SUMS
  )
  echo "Wrote reviewable baseline artifacts to $artifact_dir"
fi

echo "MoralTrade QA schema bootstrap and synthetic fixture seed completed."
