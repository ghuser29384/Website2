#!/usr/bin/env bash
set -euo pipefail

PRODUCTION_REF="jnpoxvalyjtdghnperyu"
QA_REF="hvmxfjjbdcgjjudmthdz"
QA_OWNER_EMAIL="qa-market-owner@example.com"
QA_RESPONDER_EMAIL="qa-market-responder@example.com"
QA_OFFER_ID="10000000-0000-4000-8000-000000000158"

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

for command_name in supabase psql node diff sha256sum; do
  require_command "$command_name"
done

for env_name in \
  PROD_SUPABASE_DB_URL \
  QA_SUPABASE_DB_URL \
  QA_SUPABASE_URL \
  QA_SUPABASE_SERVICE_ROLE_KEY \
  QA_TEST_PASSWORD; do
  require_env "$env_name"
done

if [[ "$PROD_SUPABASE_DB_URL" != *"$PRODUCTION_REF"* ]]; then
  echo "Refusing to read an unexpected source database. Expected project ref $PRODUCTION_REF." >&2
  exit 1
fi

if [[ "$QA_SUPABASE_DB_URL" != *"$QA_REF"* ]]; then
  echo "Refusing to access an unexpected target database. Expected project ref $QA_REF." >&2
  exit 1
fi

if [[ "$QA_SUPABASE_URL" != "https://$QA_REF.supabase.co" ]]; then
  echo "QA_SUPABASE_URL does not identify the isolated MoralTrade QA project." >&2
  exit 1
fi

work_dir="${QA_BOOTSTRAP_WORK_DIR:-${RUNNER_TEMP:-}/moraltrade-qa-resume}"
if [[ -z "$work_dir" || "$work_dir" == "/moraltrade-qa-resume" ]]; then
  work_dir="$(mktemp -d)/moraltrade-qa-resume"
fi
mkdir -p "$work_dir"
chmod 700 "$work_dir"

schema_file="$work_dir/production-schema.sql"
history_schema_file="$work_dir/migration-history-schema.sql"
history_data_file="$work_dir/migration-history-data.sql"
prod_manifest="$work_dir/production-manifest.txt"
qa_manifest="$work_dir/qa-manifest.txt"
prod_migrations="$work_dir/production-migrations.txt"
qa_migrations="$work_dir/qa-migrations.txt"
verification_file="$work_dir/resume-verification.txt"

cleanup() {
  if [[ "${QA_KEEP_BOOTSTRAP_FILES:-0}" != "1" ]]; then
    rm -rf "$work_dir"
  else
    echo "Kept QA resume files at: $work_dir"
  fi
}
trap cleanup EXIT

scalar() {
  local database_url="$1"
  local query="$2"
  psql "$database_url" -X -A -t -v ON_ERROR_STOP=1 -c "$query"
}

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

migration_manifest_query="
select
  version || '|' || coalesce(name, '') || '|' ||
  md5(coalesce(array_to_string(statements, E'\\n'), '')) || '|' ||
  md5(coalesce(array_to_string(rollback, E'\\n'), ''))
from supabase_migrations.schema_migrations
order by version;
"

echo "Verifying the already-restored QA schema before resuming..."
psql "$PROD_SUPABASE_DB_URL" -X -A -t -v ON_ERROR_STOP=1 -c "$manifest_query" >"$prod_manifest"
psql "$QA_SUPABASE_DB_URL" -X -A -t -v ON_ERROR_STOP=1 -c "$manifest_query" >"$qa_manifest"

if ! diff -u "$prod_manifest" "$qa_manifest"; then
  echo "QA public-object inventory differs from production. Refusing to resume." >&2
  exit 1
fi

psql "$PROD_SUPABASE_DB_URL" -X -A -t -v ON_ERROR_STOP=1 -c "$migration_manifest_query" >"$prod_migrations"
psql "$QA_SUPABASE_DB_URL" -X -A -t -v ON_ERROR_STOP=1 -c "$migration_manifest_query" >"$qa_migrations"

if ! diff -u "$prod_migrations" "$qa_migrations"; then
  echo "QA migration history differs from production. Refusing to resume." >&2
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
  exists="$(scalar "$QA_SUPABASE_DB_URL" "select exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = '$table_name');")"
  if [[ "$exists" != "t" ]]; then
    echo "Required QA table is missing: $table_name" >&2
    exit 1
  fi
done

qa_auth_total="$(scalar "$QA_SUPABASE_DB_URL" "select count(*) from auth.users;")"
qa_auth_fixture="$(scalar "$QA_SUPABASE_DB_URL" "select count(*) from auth.users where lower(email) in ('$QA_OWNER_EMAIL', '$QA_RESPONDER_EMAIL');")"
if [[ "$qa_auth_total" != "$qa_auth_fixture" || "$qa_auth_total" -gt 2 ]]; then
  echo "Refusing to resume because QA Auth contains non-fixture users." >&2
  exit 1
fi

qa_profile_total="$(scalar "$QA_SUPABASE_DB_URL" "select count(*) from public.profiles;")"
qa_profile_fixture="$(scalar "$QA_SUPABASE_DB_URL" "select count(*) from public.profiles where lower(email) in ('$QA_OWNER_EMAIL', '$QA_RESPONDER_EMAIL');")"
if [[ "$qa_profile_total" != "$qa_profile_fixture" || "$qa_profile_total" -gt 2 ]]; then
  echo "Refusing to resume because QA profiles contains non-fixture rows." >&2
  exit 1
fi

qa_offer_total="$(scalar "$QA_SUPABASE_DB_URL" "select count(*) from public.offers;")"
qa_offer_fixture="$(scalar "$QA_SUPABASE_DB_URL" "select count(*) from public.offers where id = '$QA_OFFER_ID';")"
if [[ "$qa_offer_total" != "$qa_offer_fixture" || "$qa_offer_total" -gt 1 ]]; then
  echo "Refusing to resume because QA offers contains non-fixture rows." >&2
  exit 1
fi

qa_storage_object_count="$(scalar "$QA_SUPABASE_DB_URL" "select count(*) from storage.objects;")"
if [[ "$qa_storage_object_count" != "0" ]]; then
  echo "Refusing to resume because QA Storage contains objects." >&2
  exit 1
fi

qa_bucket_total="$(scalar "$QA_SUPABASE_DB_URL" "select count(*) from storage.buckets;")"
qa_trade_bucket="$(scalar "$QA_SUPABASE_DB_URL" "select count(*) from storage.buckets where id = 'trade-evidence';")"
if [[ "$qa_bucket_total" != "1" || "$qa_trade_bucket" != "1" ]]; then
  echo "Refusing to resume because QA Storage bucket metadata is unexpected." >&2
  exit 1
fi

echo "Exporting a fresh reviewable production schema baseline without production rows..."
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

if grep -Eq '^(COPY|INSERT INTO)[[:space:]]+("?(public|auth|storage)"?\.)' "$schema_file"; then
  echo "The schema baseline unexpectedly contains application, Auth, or Storage rows." >&2
  exit 1
fi

if grep -Eq 'COPY[[:space:]]+"?auth"?\."?users"?|INSERT INTO[[:space:]]+"?auth"?\."?users"?' "$history_data_file"; then
  echo "The migration-history export unexpectedly contains Auth user rows." >&2
  exit 1
fi

echo "Creating or reconciling the deterministic synthetic QA fixtures..."
node scripts/seed-moraltrade-qa.mjs

qa_seed_user_count="$(scalar "$QA_SUPABASE_DB_URL" "select count(*) from auth.users where lower(email) in ('$QA_OWNER_EMAIL', '$QA_RESPONDER_EMAIL');")"
qa_all_user_count="$(scalar "$QA_SUPABASE_DB_URL" "select count(*) from auth.users;")"
if [[ "$qa_seed_user_count" != "2" || "$qa_all_user_count" != "2" ]]; then
  echo "Expected exactly two synthetic QA users after seeding." >&2
  exit 1
fi

qa_seed_profile_count="$(scalar "$QA_SUPABASE_DB_URL" "select count(*) from public.profiles where lower(email) in ('$QA_OWNER_EMAIL', '$QA_RESPONDER_EMAIL');")"
qa_all_profile_count="$(scalar "$QA_SUPABASE_DB_URL" "select count(*) from public.profiles;")"
if [[ "$qa_seed_profile_count" != "2" || "$qa_all_profile_count" != "2" ]]; then
  echo "Expected exactly two synthetic QA profiles after seeding." >&2
  exit 1
fi

qa_offer_count="$(scalar "$QA_SUPABASE_DB_URL" "select count(*) from public.offers where id = '$QA_OFFER_ID';")"
qa_all_offer_count="$(scalar "$QA_SUPABASE_DB_URL" "select count(*) from public.offers;")"
if [[ "$qa_offer_count" != "1" || "$qa_all_offer_count" != "1" ]]; then
  echo "Expected exactly the deterministic QA offer after seeding." >&2
  exit 1
fi

qa_storage_object_count="$(scalar "$QA_SUPABASE_DB_URL" "select count(*) from storage.objects;")"
if [[ "$qa_storage_object_count" != "0" ]]; then
  echo "Synthetic fixture creation unexpectedly created Storage objects." >&2
  exit 1
fi

{
  echo "source_project=$PRODUCTION_REF"
  echo "target_project=$QA_REF"
  echo "public_object_manifest_sha256=$(sha256sum "$prod_manifest" | awk '{print $1}')"
  echo "migration_manifest_sha256=$(sha256sum "$prod_migrations" | awk '{print $1}')"
  echo "auth_users=2"
  echo "profiles=2"
  echo "offers=1"
  echo "storage_objects=0"
  echo "deterministic_offer_id=$QA_OFFER_ID"
} >"$verification_file"

artifact_dir="${QA_BASELINE_ARTIFACT_DIR:-}"
if [[ -n "$artifact_dir" ]]; then
  mkdir -p "$artifact_dir"
  cp "$schema_file" "$artifact_dir/production-baseline.sql"
  cp "$history_schema_file" "$artifact_dir/migration-history-schema.sql"
  cp "$history_data_file" "$artifact_dir/migration-history-data.sql"
  cp "$prod_manifest" "$artifact_dir/production-manifest.txt"
  cp "$qa_manifest" "$artifact_dir/qa-manifest.txt"
  cp "$prod_migrations" "$artifact_dir/production-migrations.txt"
  cp "$qa_migrations" "$artifact_dir/qa-migrations.txt"
  cp "$verification_file" "$artifact_dir/resume-verification.txt"
  (
    cd "$artifact_dir"
    sha256sum \
      production-baseline.sql \
      migration-history-schema.sql \
      migration-history-data.sql \
      production-manifest.txt \
      qa-manifest.txt \
      production-migrations.txt \
      qa-migrations.txt \
      resume-verification.txt >SHA256SUMS
  )
  echo "Wrote reviewable baseline artifacts to $artifact_dir"
fi

if [[ -n "${GITHUB_STEP_SUMMARY:-}" ]]; then
  {
    echo "## MoralTrade QA bootstrap resume"
    echo
    echo "- Production and QA public-object manifests: identical"
    echo "- Production and QA migration manifests: identical"
    echo "- Production application rows copied: none"
    echo "- Auth users copied from production: none"
    echo "- Storage objects copied from production: none"
    echo "- Synthetic QA users: 2"
    echo "- Deterministic QA offer: $QA_OFFER_ID"
  } >>"$GITHUB_STEP_SUMMARY"
fi

echo "MoralTrade QA bootstrap resume and synthetic fixture seed completed."
