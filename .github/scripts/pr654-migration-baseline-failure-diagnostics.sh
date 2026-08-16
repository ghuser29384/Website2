#!/usr/bin/env bash
set +e

: "${EXPECTED_PRODUCT_HEAD:?}"
: "${EXPECTED_BASE:?}"
: "${PRODUCT_BRANCH:?}"
: "${SUPABASE_CLI_VERSION:?}"
: "${EVIDENCE_DIR:?}"

mkdir -p "$EVIDENCE_DIR/logs" "$EVIDENCE_DIR/manifests"
TRANSCRIPT="$EVIDENCE_DIR/command-transcript.txt"
SUMMARY="$EVIDENCE_DIR/summary.txt"
: > "$TRANSCRIPT"
: > "$SUMMARY"
exec > >(tee -a "$TRANSCRIPT") 2>&1

overall=0
cleanup_gate=0
db_container=""
checked_migrations="$RUNNER_TEMP/pr654-checked-in-migrations"

note() { printf '\n===== %s =====\n' "$*"; }
record() { printf '%s=%s\n' "$1" "$2" | tee -a "$SUMMARY"; }
fail() { overall=1; printf 'FAIL: %s\n' "$*" | tee -a "$SUMMARY"; }

supabase() { npx --yes "supabase@${SUPABASE_CLI_VERSION}" "$@"; }

sanitize() {
  sed -E \
    -e '/(anon key|service_role key|S3 Access Key|S3 Secret Key|JWT secret|DB URL)/I s#(:|=).*#\1 [REDACTED]#' \
    -e 's#postgres(ql)?://[^[:space:]]+#[REDACTED_LOCAL_DB_URL]#g' \
    -e 's#eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}#[REDACTED_LOCAL_JWT]#g' \
    -e 's#sb_(secret|publishable)_[A-Za-z0-9_-]+#[REDACTED_LOCAL_KEY]#g'
}

cleanup() {
  set +e
  note "Cleanup"
  supabase stop --no-backup > "$EVIDENCE_DIR/logs/supabase-stop.log" 2>&1
  record supabase_stop_exit "$?"
  docker ps -a --format '{{.ID}}\t{{.Names}}\t{{.Image}}\t{{.Status}}' \
    | tee "$EVIDENCE_DIR/manifests/docker-containers-after-cleanup.tsv"
  docker volume ls --format '{{.Name}}' \
    | grep -E 'supabase|pr654|baseline|product' \
    | tee "$EVIDENCE_DIR/manifests/docker-volumes-after-cleanup.txt" || true
  ss -ltnp 2>/dev/null \
    | grep -E ':(5432[0-9]|8000|8443|3000|4000|5000|6543|55432)\b' \
    | tee "$EVIDENCE_DIR/manifests/listeners-after-cleanup.txt" || true
  if grep -q 'supabase_' "$EVIDENCE_DIR/manifests/docker-containers-after-cleanup.tsv"; then
    cleanup_gate=1; fail "Supabase containers remain after cleanup"
  fi
  if [[ -s "$EVIDENCE_DIR/manifests/docker-volumes-after-cleanup.txt" ]]; then
    cleanup_gate=1; fail "Supabase-like volumes remain after cleanup"
  fi
  rm -rf "$checked_migrations"
  git reset --hard HEAD > "$EVIDENCE_DIR/logs/git-cleanup.log" 2>&1
  git clean -fdx >> "$EVIDENCE_DIR/logs/git-cleanup.log" 2>&1
  git status --short --branch | tee "$EVIDENCE_DIR/manifests/git-status-final.txt"
  if [[ -n "$(git status --porcelain)" ]]; then cleanup_gate=1; fail "product checkout not clean after cleanup"; fi
}
trap cleanup EXIT

note "Preflight"
actual_head="$(git rev-parse HEAD)"
symbolic_head="$(git symbolic-ref -q --short HEAD || true)"
initial_status="$(git status --porcelain)"
remote_refs="$(git ls-remote origin "refs/heads/${PRODUCT_BRANCH}" refs/heads/main 2>&1)"
remote_status=$?
printf '%s\n' "$remote_refs" | tee "$EVIDENCE_DIR/manifests/remote-refs.txt"
product_remote="$(printf '%s\n' "$remote_refs" | awk -v r="refs/heads/${PRODUCT_BRANCH}" '$2==r{print $1}')"
main_remote="$(printf '%s\n' "$remote_refs" | awk '$2=="refs/heads/main"{print $1}')"
printf 'actual_head=%s\nsymbolic_head=%s\nproduct_remote=%s\nmain_remote=%s\n' \
  "$actual_head" "${symbolic_head:-DETACHED}" "$product_remote" "$main_remote" \
  | tee "$EVIDENCE_DIR/manifests/git-head.txt"
if [[ $remote_status -ne 0 || "$actual_head" != "$EXPECTED_PRODUCT_HEAD" || "$product_remote" != "$EXPECTED_PRODUCT_HEAD" || -n "$symbolic_head" || -n "$initial_status" ]]; then
  fail "exact clean detached product-head preflight failed"
  exit 1
fi
git fetch --no-tags origin "+refs/heads/main:refs/remotes/origin/main" > "$EVIDENCE_DIR/logs/fetch-main.log" 2>&1
fetch_status=$?; record fetch_main_exit "$fetch_status"
if [[ $fetch_status -ne 0 || -z "$main_remote" ]]; then fail "current main could not be fetched"; exit 1; fi
if ! git merge-base --is-ancestor "$EXPECTED_BASE" "$main_remote"; then fail "expected base is not an ancestor of current main"; exit 1; fi
record expected_base "$EXPECTED_BASE"
record current_main "$main_remote"
record main_advanced_by "$(git rev-list --count "$EXPECTED_BASE..$main_remote")"

note "Unset remote-capable environment"
env | cut -d= -f1 | grep -E '^(SUPABASE|POSTGRES|PG|STRIPE|EVERY|DATABASE|DIRECT)' | sort -u \
  | tee "$EVIDENCE_DIR/manifests/relevant-environment-variable-names.txt" || true
for name in SUPABASE_ACCESS_TOKEN SUPABASE_DB_PASSWORD SUPABASE_PROJECT_ID SUPABASE_PROJECT_REF SUPABASE_URL SUPABASE_SERVICE_ROLE_KEY NEXT_PUBLIC_SUPABASE_URL NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY STRIPE_SECRET_KEY STRIPE_WEBHOOK_SECRET EVERY_ORG_WEBHOOK_SECRET DATABASE_URL DIRECT_URL POSTGRES_URL; do unset "$name"; done

note "Toolchain"
{
  uname -a; cat /etc/os-release; docker version; node --version; npm --version; git --version; supabase --version
} | tee "$EVIDENCE_DIR/toolchain.txt"
record toolchain_exit "${PIPESTATUS[0]}"

note "Initialize local project with migrations withheld"
rm -rf .supabase "$checked_migrations"
supabase init --force > "$EVIDENCE_DIR/logs/supabase-init.log" 2>&1
init_status=$?; cat "$EVIDENCE_DIR/logs/supabase-init.log"; record supabase_init_exit "$init_status"
if [[ $init_status -ne 0 ]]; then fail "supabase init failed"; exit 1; fi
mv supabase/migrations "$checked_migrations"
mkdir -p supabase/migrations
if [[ -f supabase/seed.sql ]]; then mv supabase/seed.sql "$RUNNER_TEMP/pr654-seed.sql.withheld"; fi

raw="$RUNNER_TEMP/local-base-start.raw.log"
supabase start --debug > "$raw" 2>&1
start_status=$?
sanitize < "$raw" > "$EVIDENCE_DIR/logs/local-base-start.log"
rm -f "$raw"
cat "$EVIDENCE_DIR/logs/local-base-start.log"
record local_base_start_exit "$start_status"
if [[ $start_status -ne 0 ]]; then fail "could not start local Supabase without repository migrations"; exit 1; fi

docker ps --format '{{.ID}}\t{{.Names}}\t{{.Image}}\t{{.Status}}' | tee "$EVIDENCE_DIR/manifests/docker-containers.tsv"
: > "$EVIDENCE_DIR/manifests/docker-image-identities.txt"
while IFS=$'\t' read -r id name image status; do
  [[ -z "$id" ]] && continue
  docker inspect --format '{{.Name}}\t{{.Config.Image}}\t{{.Image}}' "$id" >> "$EVIDENCE_DIR/manifests/docker-image-identities.txt"
  docker image inspect --format '{{json .RepoDigests}}' "$image" >> "$EVIDENCE_DIR/manifests/docker-image-identities.txt" 2>/dev/null || true
done < "$EVIDENCE_DIR/manifests/docker-containers.tsv"
cat "$EVIDENCE_DIR/manifests/docker-image-identities.txt"
db_container="$(docker ps --format '{{.Names}}' | grep '^supabase_db_' | head -1)"
if [[ -z "$db_container" ]]; then fail "local database container not found"; exit 1; fi

docker exec "$db_container" psql -X -v ON_ERROR_STOP=1 -U postgres -d postgres -Atc 'select version();' \
  | tee "$EVIDENCE_DIR/postgresql-version.txt"
record postgres_version_query_exit "${PIPESTATUS[0]}"

docker exec "$db_container" psql -X -v ON_ERROR_STOP=1 -U postgres -d postgres -AtF $'\t' \
  -c "select 'profiles',coalesce(to_regclass('public.profiles')::text,'NULL'); select 'migration_rows',count(*)::text from supabase_migrations.schema_migrations;" \
  | tee "$EVIDENCE_DIR/manifests/empty-base-state.tsv"
record empty_base_probe_exit "${PIPESTATUS[0]}"

note "Directly reproduce the first checked-in migration failure with verbose SQLSTATE"
first_migration="$checked_migrations/20260422_background_networking_non_ai.sql"
docker exec -i "$db_container" psql -X -v ON_ERROR_STOP=1 -v VERBOSITY=verbose -U postgres -d postgres \
  < "$first_migration" > "$EVIDENCE_DIR/logs/first-migration-direct.log" 2>&1
first_status=$?
cat "$EVIDENCE_DIR/logs/first-migration-direct.log"
record first_migration_direct_exit "$first_status"
docker exec "$db_container" psql -X -v ON_ERROR_STOP=1 -U postgres -d postgres -AtF $'\t' \
  -c "select 'profiles',coalesce(to_regclass('public.profiles')::text,'NULL'); select 'migration_rows',count(*)::text from supabase_migrations.schema_migrations;" \
  | tee "$EVIDENCE_DIR/manifests/post-first-failure-state.tsv"

note "Probe supabase/schema.sql as the repository's documented full rebuilt schema"
docker exec -i "$db_container" psql -X -v ON_ERROR_STOP=1 -v VERBOSITY=verbose -U postgres -d postgres \
  < supabase/schema.sql > "$EVIDENCE_DIR/logs/schema-sql-apply.log" 2>&1
schema_status=$?
tail -200 "$EVIDENCE_DIR/logs/schema-sql-apply.log"
record schema_sql_apply_exit "$schema_status"

docker exec "$db_container" psql -X -v ON_ERROR_STOP=1 -U postgres -d postgres -AtF $'\t' \
  -c "select 'profiles',coalesce(to_regclass('public.profiles')::text,'NULL'); select 'pool_tables',count(*)::text from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relname like 'trade_donation_pool_%' and c.relkind='r'; select 'migration_rows',count(*)::text from supabase_migrations.schema_migrations;" \
  | tee "$EVIDENCE_DIR/manifests/post-schema-state.tsv"
record post_schema_probe_exit "${PIPESTATUS[0]}"

if [[ $schema_status -eq 0 ]]; then
  note "Reapply the first migration after schema.sql to test the declared base-schema dependency"
  docker exec -i "$db_container" psql -X -v ON_ERROR_STOP=1 -v VERBOSITY=verbose -U postgres -d postgres \
    < "$first_migration" > "$EVIDENCE_DIR/logs/first-migration-after-schema.log" 2>&1
  first_after_schema=$?
  cat "$EVIDENCE_DIR/logs/first-migration-after-schema.log"
  record first_migration_after_schema_exit "$first_after_schema"

  note "Restore all checked-in migrations and test schema.sql plus canonical migration-up"
  rmdir supabase/migrations
  mv "$checked_migrations" supabase/migrations
  raw_up="$RUNNER_TEMP/schema-plus-migrations-up.raw.log"
  supabase migration up --local --debug > "$raw_up" 2>&1
  up_status=$?
  sanitize < "$raw_up" > "$EVIDENCE_DIR/logs/schema-plus-migrations-up.log"
  rm -f "$raw_up"
  cat "$EVIDENCE_DIR/logs/schema-plus-migrations-up.log"
  record schema_plus_migrations_up_exit "$up_status"
  grep -E 'Applying migration|duplicate|ERROR|Error|SQLSTATE|failed|Failed|FATAL' "$EVIDENCE_DIR/logs/schema-plus-migrations-up.log" | tail -300 \
    > "$EVIDENCE_DIR/logs/schema-plus-migrations-first-failure-extract.log" || true
  docker exec "$db_container" psql -X -v ON_ERROR_STOP=1 -U postgres -d postgres -At \
    -c "select row_to_json(x) from (select * from supabase_migrations.schema_migrations order by version) x" \
    | tee "$EVIDENCE_DIR/manifests/schema-plus-migrations-history.jsonl"
fi

note "Credential scan and cleanup"
if grep -RIlE '(^|[^A-Za-z0-9])(eyJ[A-Za-z0-9_-]{20,}|sk_(live|test)_[A-Za-z0-9]|sb_secret_|postgres(ql)?://[^[:space:]]+:[^@[:space:]]+@)' "$EVIDENCE_DIR" \
  > "$EVIDENCE_DIR/manifests/credential-scan-hits.txt"; then
  fail "credential-like material detected in diagnostic evidence"
else
  : > "$EVIDENCE_DIR/manifests/credential-scan-hits.txt"
fi

cleanup
trap - EXIT
if [[ $cleanup_gate -ne 0 ]]; then overall=1; fi
record final_overall "$overall"
archive="$GITHUB_WORKSPACE/pr654-migration-baseline-failure-diagnostics.tar.gz"
tar -C "$(dirname "$EVIDENCE_DIR")" -czf "$archive" "$(basename "$EVIDENCE_DIR")"
sha256sum "$archive" | tee "$archive.sha256"
cp "$SUMMARY" "$GITHUB_WORKSPACE/pr654-migration-baseline-failure-diagnostics-summary.txt"
exit "$overall"
