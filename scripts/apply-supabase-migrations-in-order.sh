#!/usr/bin/env bash

set -euo pipefail

if [[ -z "${SUPABASE_MIGRATION_TEST_DB_URL:-}" ]]; then
  echo "SUPABASE_MIGRATION_TEST_DB_URL is required." >&2
  exit 1
fi

migration_dir="${1:-supabase/migrations}"
if [[ ! -d "$migration_dir" ]]; then
  echo "Migration directory does not exist: $migration_dir" >&2
  exit 1
fi

migration_count=0
while IFS= read -r migration_path; do
  migration_count=$((migration_count + 1))
  printf 'applying_migration=%s\n' "$(basename "$migration_path")"
  psql "$SUPABASE_MIGRATION_TEST_DB_URL" \
    --no-psqlrc \
    --set ON_ERROR_STOP=1 \
    --file "$migration_path"
done < <(find "$migration_dir" -maxdepth 1 -type f -name '*.sql' -print | LC_ALL=C sort)

if [[ "$migration_count" -eq 0 ]]; then
  echo "No SQL migrations were found in $migration_dir." >&2
  exit 1
fi

printf 'applied_migration_count=%s\n' "$migration_count"
