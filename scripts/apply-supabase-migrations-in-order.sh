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

if [[ -n "${SUPABASE_MIGRATION_BASELINE_SQL:-}" ]]; then
  if [[ ! -f "$SUPABASE_MIGRATION_BASELINE_SQL" ]]; then
    echo "Migration baseline does not exist: $SUPABASE_MIGRATION_BASELINE_SQL" >&2
    exit 1
  fi
  printf 'applying_historical_schema_baseline=%s\n' "$SUPABASE_MIGRATION_BASELINE_SQL"
  psql "$SUPABASE_MIGRATION_TEST_DB_URL" \
    --no-psqlrc \
    --set ON_ERROR_STOP=1 \
    --file "$SUPABASE_MIGRATION_BASELINE_SQL"
fi

migration_rows=()
while IFS= read -r migration_path; do
  migration_name="$(basename "$migration_path")"
  migration_version="${migration_name%%_*}"
  if [[ ! "$migration_version" =~ ^[0-9]{8,14}$ ]]; then
    echo "Migration name does not start with an 8-14 digit version: $migration_name" >&2
    exit 1
  fi

  introduction="$(
    git log --follow --diff-filter=A --format='%ct %H' -- "$migration_path" \
      | tail -n 1
  )"
  if [[ -z "$introduction" ]]; then
    echo "Migration lacks committed introduction history: $migration_path" >&2
    exit 1
  fi
  read -r introduced_at_epoch introduced_commit <<< "$introduction"
  migration_rows+=(
    "$migration_version"$'\t'"$introduced_at_epoch"$'\t'"$migration_path"$'\t'"$introduced_commit"
  )
done < <(find "$migration_dir" -maxdepth 1 -type f -name '*.sql' -print | LC_ALL=C sort)

migration_count="${#migration_rows[@]}"
if [[ "$migration_count" -eq 0 ]]; then
  echo "No SQL migrations were found in $migration_dir." >&2
  exit 1
fi

# Several historical migrations use the same date-only version. Git introduction
# time provides the missing deterministic chronology within each version cohort.
while IFS=$'\t' read -r migration_version introduced_at_epoch migration_path introduced_commit; do
  printf 'applying_migration=%s version=%s introduced_at_epoch=%s introduced_commit=%s\n' \
    "$(basename "$migration_path")" \
    "$migration_version" \
    "$introduced_at_epoch" \
    "$introduced_commit"
  psql "$SUPABASE_MIGRATION_TEST_DB_URL" \
    --no-psqlrc \
    --set ON_ERROR_STOP=1 \
    --file "$migration_path"
done < <(
  printf '%s\n' "${migration_rows[@]}" \
    | LC_ALL=C sort -t $'\t' -k1,1n -k2,2n -k3,3
)

printf 'applied_migration_count=%s\n' "$migration_count"
