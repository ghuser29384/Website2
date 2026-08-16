#!/usr/bin/env bash
set -euo pipefail

: "${EXPECTED_PRODUCT_HEAD:?}"
: "${HISTORICAL_BASE_COMMIT:?}"
: "${SUPABASE_CLI_VERSION:=2.110.0}"
: "${EVIDENCE_DIR:?}"

mkdir -p "$EVIDENCE_DIR"/{logs,manifests,failures}
TRANSCRIPT="$EVIDENCE_DIR/command-transcript.txt"
: > "$TRANSCRIPT"
exec > >(tee -a "$TRANSCRIPT") 2>&1

supabase() { npx --yes "supabase@${SUPABASE_CLI_VERSION}" "$@"; }

sanitize() {
  sed -E \
    -e '/(anon key|service_role key|S3 Access Key|S3 Secret Key|JWT secret|DB URL)/I s#(:|=).*#\1 [REDACTED]#' \
    -e 's#postgres(ql)?://[^[:space:]]+#[REDACTED_LOCAL_DB_URL]#g' \
    -e 's#eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}#[REDACTED_LOCAL_JWT]#g' \
    -e 's#sb_(secret|publishable)_[A-Za-z0-9_-]+#[REDACTED_LOCAL_KEY]#g'
}

withheld="$RUNNER_TEMP/pr654-historical-chain-migrations"
db_container=""

cleanup() {
  set +e
  if [[ -d "$withheld" && ! -d supabase/migrations ]]; then
    mv "$withheld" supabase/migrations
  elif [[ -d "$withheld" && -d supabase/migrations && -z "$(find supabase/migrations -mindepth 1 -print -quit 2>/dev/null)" ]]; then
    rmdir supabase/migrations
    mv "$withheld" supabase/migrations
  fi
  supabase stop --no-backup > "$EVIDENCE_DIR/logs/supabase-stop.log" 2>&1 || true
  docker ps -a --format '{{.ID}}\t{{.Names}}\t{{.Image}}\t{{.Status}}' \
    > "$EVIDENCE_DIR/manifests/docker-after-cleanup.tsv"
  docker volume ls --format '{{.Name}}' \
    | grep -E 'supabase|pr654-historical' \
    > "$EVIDENCE_DIR/manifests/volumes-after-cleanup.txt" || true
  ss -ltnp 2>/dev/null \
    | grep -E ':(5432[0-9]|8000|8443|3000|4000|5000|6543|55432)\b' \
    > "$EVIDENCE_DIR/manifests/listeners-after-cleanup.txt" || true
  rm -rf "$withheld" .supabase supabase/config.toml
  git reset --hard HEAD > "$EVIDENCE_DIR/logs/git-reset.log" 2>&1 || true
  git clean -fdx >> "$EVIDENCE_DIR/logs/git-reset.log" 2>&1 || true
  git status --short --branch > "$EVIDENCE_DIR/manifests/git-status-final.txt"
}
trap cleanup EXIT

printf '===== preflight =====\n'
test "$(git rev-parse HEAD)" = "$EXPECTED_PRODUCT_HEAD"
test -z "$(git symbolic-ref -q --short HEAD || true)"
test -z "$(git status --porcelain)"
git cat-file -e "$HISTORICAL_BASE_COMMIT:supabase/schema.sql"

printf '===== environment safety =====\n'
env | cut -d= -f1 | grep -E '^(SUPABASE|POSTGRES|PG|STRIPE|EVERY|DATABASE|DIRECT)' | sort -u \
  > "$EVIDENCE_DIR/manifests/relevant-env-names-before-unset.txt" || true
for name in SUPABASE_ACCESS_TOKEN SUPABASE_DB_PASSWORD SUPABASE_PROJECT_ID SUPABASE_PROJECT_REF SUPABASE_URL SUPABASE_SERVICE_ROLE_KEY NEXT_PUBLIC_SUPABASE_URL NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY DATABASE_URL DIRECT_URL POSTGRES_URL STRIPE_SECRET_KEY STRIPE_WEBHOOK_SECRET EVERY_ORG_WEBHOOK_SECRET; do
  unset "$name"
done

printf '===== toolchain =====\n'
{
  uname -a
  cat /etc/os-release
  docker version
  node --version
  npm --version
  git --version
  supabase --version
} | tee "$EVIDENCE_DIR/toolchain.txt"

printf '===== initialize empty local Supabase stack =====\n'
rm -rf .supabase "$withheld"
supabase init --force > "$EVIDENCE_DIR/logs/supabase-init.raw.log" 2>&1
sanitize < "$EVIDENCE_DIR/logs/supabase-init.raw.log" > "$EVIDENCE_DIR/logs/supabase-init.log"
rm -f "$EVIDENCE_DIR/logs/supabase-init.raw.log"
mv supabase/migrations "$withheld"
mkdir -p supabase/migrations
if [[ -f supabase/seed.sql ]]; then
  mv supabase/seed.sql "$RUNNER_TEMP/pr654-historical-chain-seed.withheld"
fi
set +e
supabase start --debug > "$EVIDENCE_DIR/logs/supabase-start.raw.log" 2>&1
start_status=$?
set -e
printf '%s\n' "$start_status" > "$EVIDENCE_DIR/logs/supabase-start.exit"
sanitize < "$EVIDENCE_DIR/logs/supabase-start.raw.log" > "$EVIDENCE_DIR/logs/supabase-start.log"
rm -f "$EVIDENCE_DIR/logs/supabase-start.raw.log"
test "$start_status" -eq 0

docker ps --format '{{.ID}}\t{{.Names}}\t{{.Image}}\t{{.Status}}' \
  > "$EVIDENCE_DIR/manifests/docker-running.tsv"
db_container="$(docker ps --format '{{.Names}}' | grep '^supabase_db_' | head -1)"
test -n "$db_container"
docker inspect "$db_container" > "$EVIDENCE_DIR/manifests/database-container-inspect.json"
docker exec "$db_container" psql -X -v ON_ERROR_STOP=1 -U postgres -d postgres -Atc 'select version();' \
  > "$EVIDENCE_DIR/postgresql-version.txt"

printf '===== restore repository migration files for direct lexical replay =====\n'
rmdir supabase/migrations
mv "$withheld" supabase/migrations

printf '===== extract and apply historical base =====\n'
git show "$HISTORICAL_BASE_COMMIT:supabase/schema.sql" \
  > "$EVIDENCE_DIR/manifests/historical-base.sql"
sha256sum "$EVIDENCE_DIR/manifests/historical-base.sql" \
  > "$EVIDENCE_DIR/manifests/historical-base.sql.sha256"
docker cp "$EVIDENCE_DIR/manifests/historical-base.sql" "$db_container:/tmp/pr654-historical-base.sql"
set +e
docker exec "$db_container" psql -X -1 -v ON_ERROR_STOP=1 -v VERBOSITY=verbose \
  -U postgres -d postgres -f /tmp/pr654-historical-base.sql \
  > "$EVIDENCE_DIR/logs/historical-base-apply.log" 2>&1
base_status=$?
set -e
printf '%s\n' "$base_status" > "$EVIDENCE_DIR/logs/historical-base-apply.exit"
if [[ "$base_status" -ne 0 ]]; then
  grep -n -B80 -A30 -E 'ERROR:|SQL state:|LOCATION:' \
    "$EVIDENCE_DIR/logs/historical-base-apply.log" \
    > "$EVIDENCE_DIR/failures/historical-base-error-context.txt" || true
  printf 'BASE_FAILED\n' > "$EVIDENCE_DIR/result.txt"
else
  printf 'BASE_PASSED\n' > "$EVIDENCE_DIR/result.txt"
fi

if [[ "$base_status" -eq 0 ]]; then
  docker exec "$db_container" psql -X -v ON_ERROR_STOP=1 -U postgres -d postgres -AtF $'\t' \
    -c "select n.nspname,c.relname,c.relkind from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' order by c.relname;" \
    > "$EVIDENCE_DIR/manifests/public-objects-after-base.tsv"

  printf '===== apply all checked-in migrations in exact lexical order =====\n'
  : > "$EVIDENCE_DIR/manifests/migration-replay.tsv"
  mapfile -t migrations < <(find supabase/migrations -maxdepth 1 -type f -name '*.sql' -print | LC_ALL=C sort)
  printf 'migration_count=%s\n' "${#migrations[@]}" \
    > "$EVIDENCE_DIR/manifests/migration-count.txt"
  previous='HISTORICAL_BASE'
  failure=''
  index=0
  for migration in "${migrations[@]}"; do
    index=$((index+1))
    name="$(basename "$migration")"
    digest="$(sha256sum "$migration" | awk '{print $1}')"
    printf '%04d\tSTART\t%s\t%s\n' "$index" "$name" "$digest" \
      | tee -a "$EVIDENCE_DIR/manifests/migration-replay.tsv"
    docker cp "$migration" "$db_container:/tmp/pr654-current-migration.sql"
    set +e
    docker exec "$db_container" psql -X -1 -v ON_ERROR_STOP=1 -v VERBOSITY=verbose \
      -U postgres -d postgres -f /tmp/pr654-current-migration.sql \
      > "$EVIDENCE_DIR/logs/migration-${index}.log" 2>&1
    status=$?
    set -e
    if [[ "$status" -eq 0 ]]; then
      printf '%04d\tPASS\t%s\t%s\n' "$index" "$name" "$digest" \
        | tee -a "$EVIDENCE_DIR/manifests/migration-replay.tsv"
      previous="$name"
      rm -f "$EVIDENCE_DIR/logs/migration-${index}.log"
      continue
    fi

    printf '%04d\tFAIL\t%s\t%s\n' "$index" "$name" "$digest" \
      | tee -a "$EVIDENCE_DIR/manifests/migration-replay.tsv"
    failure="$name"
    printf 'first_failed_migration=%s\npreceding_success=%s\nlexical_index=%s\n' \
      "$failure" "$previous" "$index" \
      > "$EVIDENCE_DIR/failures/first-failure.txt"
    cp "$migration" "$EVIDENCE_DIR/failures/$name"
    grep -n -B120 -A40 -E 'ERROR:|SQL state:|LOCATION:' \
      "$EVIDENCE_DIR/logs/migration-${index}.log" \
      > "$EVIDENCE_DIR/failures/error-context.txt" || true
    error_line="$(sed -nE 's#^psql:/tmp/pr654-current-migration\.sql:([0-9]+): ERROR:.*#\1#p' "$EVIDENCE_DIR/logs/migration-${index}.log" | head -1)"
    if [[ -n "$error_line" ]]; then
      start_line=$((error_line > 50 ? error_line - 50 : 1))
      end_line=$((error_line + 30))
      nl -ba "$migration" | sed -n "${start_line},${end_line}p" \
        > "$EVIDENCE_DIR/failures/source-neighborhood.txt"
    fi
    break
  done

  if [[ -z "$failure" ]]; then
    printf 'ALL_MIGRATIONS_PASSED\n' >> "$EVIDENCE_DIR/result.txt"
  else
    printf 'MIGRATION_FAILED=%s\n' "$failure" >> "$EVIDENCE_DIR/result.txt"
  fi

  docker exec "$db_container" psql -X -U postgres -d postgres -AtF $'\t' \
    -c "select n.nspname,c.relname,c.relkind from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname in ('public','moral_trade_private') order by n.nspname,c.relname;" \
    > "$EVIDENCE_DIR/manifests/objects-after-replay.tsv" 2>&1 || true
fi

printf '===== credential scan =====\n'
if grep -RIlE '(^|[^A-Za-z0-9])(eyJ[A-Za-z0-9_-]{20,}|sk_(live|test)_[A-Za-z0-9]|sb_secret_|postgres(ql)?://[^[:space:]]+:[^@[:space:]]+@)' \
  "$EVIDENCE_DIR" > "$EVIDENCE_DIR/manifests/credential-scan-hits.txt"; then
  printf 'Credential-like material detected in retained evidence.\n'
  exit 1
fi
: > "$EVIDENCE_DIR/manifests/credential-scan-hits.txt"

cleanup
trap - EXIT

test ! -s "$EVIDENCE_DIR/manifests/volumes-after-cleanup.txt"
test ! -s "$EVIDENCE_DIR/manifests/listeners-after-cleanup.txt"
if grep -q 'supabase_' "$EVIDENCE_DIR/manifests/docker-after-cleanup.tsv"; then
  printf 'Supabase containers remain after cleanup.\n'
  exit 1
fi
