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

skip_migration_basenames=()
if [[ -n "${SUPABASE_MIGRATION_SKIP_BASENAMES:-}" ]]; then
  IFS=',' read -r -a skip_migration_basenames <<< "$SUPABASE_MIGRATION_SKIP_BASENAMES"
  for skip_name in "${skip_migration_basenames[@]}"; do
    if [[ ! "$skip_name" =~ ^[0-9]{8,14}_[A-Za-z0-9_.-]+\.sql$ ]]; then
      echo "Invalid migration skip basename: $skip_name" >&2
      exit 1
    fi
  done
fi

should_skip_migration() {
  local candidate="$1"
  local skip_name
  for skip_name in "${skip_migration_basenames[@]}"; do
    if [[ "$candidate" == "$skip_name" ]]; then
      return 0
    fi
  done
  return 1
}

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
  history_path="$migration_path"
  if ! git ls-files --error-unmatch "$history_path" > /dev/null 2>&1; then
    history_path="supabase/migrations/$migration_name"
  fi
  if ! git ls-files --error-unmatch "$history_path" > /dev/null 2>&1; then
    echo "Migration lacks a canonical tracked source path: $migration_path" >&2
    exit 1
  fi
  if [[ ! "$migration_version" =~ ^[0-9]{8,14}$ ]]; then
    echo "Migration name does not start with an 8-14 digit version: $migration_name" >&2
    exit 1
  fi

  introduction="$(
    git log --all --follow --diff-filter=A --format='%ct %H' -- "$history_path" \
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
applied_migration_count=0
skipped_migration_count=0
skipped_migrations_seen=()
while IFS=$'\t' read -r migration_version introduced_at_epoch migration_path introduced_commit; do
  migration_basename="$(basename "$migration_path")"
  if should_skip_migration "$migration_basename"; then
    printf 'skipping_environment_bound_migration=%s reason=explicit_exact_allowlist\n' \
      "$migration_basename"
    skipped_migrations_seen+=("$migration_basename")
    skipped_migration_count=$((skipped_migration_count + 1))
    continue
  fi
  printf 'applying_migration=%s version=%s introduced_at_epoch=%s introduced_commit=%s\n' \
    "$migration_basename" \
    "$migration_version" \
    "$introduced_at_epoch" \
    "$introduced_commit"
  # Supabase applies one migration file atomically. Preserve that boundary so
  # historical ON COMMIT DROP fixtures remain available for the whole file.
  psql "$SUPABASE_MIGRATION_TEST_DB_URL" \
    --no-psqlrc \
    --single-transaction \
    --set ON_ERROR_STOP=1 \
    --file "$migration_path"
  applied_migration_count=$((applied_migration_count + 1))
done < <(
  printf '%s\n' "${migration_rows[@]}" \
    | LC_ALL=C sort -t $'\t' -k1,1n -k2,2n -k3,3
)

for skip_name in "${skip_migration_basenames[@]}"; do
  skip_was_seen=false
  for seen_name in "${skipped_migrations_seen[@]}"; do
    if [[ "$skip_name" == "$seen_name" ]]; then
      skip_was_seen=true
      break
    fi
  done
  if [[ "$skip_was_seen" != true ]]; then
    echo "Configured migration skip was not found: $skip_name" >&2
    exit 1
  fi
done

printf 'discovered_migration_count=%s\n' "$migration_count"
printf 'applied_migration_count=%s\n' "$applied_migration_count"
printf 'skipped_environment_bound_migration_count=%s\n' "$skipped_migration_count"
