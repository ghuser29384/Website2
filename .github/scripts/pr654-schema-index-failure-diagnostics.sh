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
withheld_migrations="$RUNNER_TEMP/pr654-schema-diag-migrations"

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
    | grep -E 'supabase|pr654|baseline|product|schema-diag' \
    | tee "$EVIDENCE_DIR/manifests/docker-volumes-after-cleanup.txt" || true
  ss -ltnp 2>/dev/null \
    | grep -E ':(5432[0-9]|8000|8443|3000|4000|5000|6543|55432)\b' \
    | tee "$EVIDENCE_DIR/manifests/listeners-after-cleanup.txt" || true
  if grep -q 'supabase_' "$EVIDENCE_DIR/manifests/docker-containers-after-cleanup.tsv"; then
    cleanup_gate=1
    fail "Supabase containers remain after cleanup"
  fi
  if [[ -s "$EVIDENCE_DIR/manifests/docker-volumes-after-cleanup.txt" ]]; then
    cleanup_gate=1
    fail "Supabase-like volumes remain after cleanup"
  fi
  rm -rf "$withheld_migrations"
  git reset --hard HEAD > "$EVIDENCE_DIR/logs/git-cleanup.log" 2>&1
  git clean -fdx >> "$EVIDENCE_DIR/logs/git-cleanup.log" 2>&1
  git status --short --branch | tee "$EVIDENCE_DIR/manifests/git-status-final.txt"
  if [[ -n "$(git status --porcelain)" ]]; then
    cleanup_gate=1
    fail "product checkout not clean after cleanup"
  fi
}
trap cleanup EXIT

note "Exact-head and current-main preflight"
actual_head="$(git rev-parse HEAD)"
symbolic_head="$(git symbolic-ref -q --short HEAD || true)"
initial_status="$(git status --porcelain)"
remote_refs="$(git ls-remote origin "refs/heads/${PRODUCT_BRANCH}" refs/heads/main 2>&1)"
remote_status=$?
product_remote="$(printf '%s\n' "$remote_refs" | awk -v r="refs/heads/${PRODUCT_BRANCH}" '$2==r{print $1}')"
main_remote="$(printf '%s\n' "$remote_refs" | awk '$2=="refs/heads/main"{print $1}')"
printf '%s\n' "$remote_refs" | tee "$EVIDENCE_DIR/manifests/remote-refs.txt"
printf 'actual_head=%s\nsymbolic_head=%s\nproduct_remote=%s\nmain_remote=%s\n' \
  "$actual_head" "${symbolic_head:-DETACHED}" "$product_remote" "$main_remote" \
  | tee "$EVIDENCE_DIR/manifests/git-head.txt"
if [[ $remote_status -ne 0 || "$actual_head" != "$EXPECTED_PRODUCT_HEAD" || "$product_remote" != "$EXPECTED_PRODUCT_HEAD" || -n "$symbolic_head" || -n "$initial_status" ]]; then
  fail "exact clean detached product-head preflight failed"
  exit 1
fi
git fetch --no-tags origin "+refs/heads/main:refs/remotes/origin/main" > "$EVIDENCE_DIR/logs/fetch-main.log" 2>&1
fetch_status=$?
record fetch_main_exit "$fetch_status"
if [[ $fetch_status -ne 0 || -z "$main_remote" ]]; then
  fail "current main could not be fetched"
  exit 1
fi
if ! git merge-base --is-ancestor "$EXPECTED_BASE" "$main_remote"; then
  fail "expected base is not an ancestor of current main"
  exit 1
fi
record expected_base "$EXPECTED_BASE"
record current_main "$main_remote"
record main_advanced_by "$(git rev-list --count "$EXPECTED_BASE..$main_remote")"

note "Unset remote-capable environment"
env | cut -d= -f1 | grep -E '^(SUPABASE|POSTGRES|PG|STRIPE|EVERY|DATABASE|DIRECT)' | sort -u \
  | tee "$EVIDENCE_DIR/manifests/relevant-environment-variable-names.txt" || true
for name in SUPABASE_ACCESS_TOKEN SUPABASE_DB_PASSWORD SUPABASE_PROJECT_ID SUPABASE_PROJECT_REF SUPABASE_URL SUPABASE_SERVICE_ROLE_KEY NEXT_PUBLIC_SUPABASE_URL NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY STRIPE_SECRET_KEY STRIPE_WEBHOOK_SECRET EVERY_ORG_WEBHOOK_SECRET DATABASE_URL DIRECT_URL POSTGRES_URL; do
  unset "$name"
done

note "Toolchain"
{
  uname -a
  cat /etc/os-release
  docker version
  node --version
  npm --version
  git --version
  supabase --version
} | tee "$EVIDENCE_DIR/toolchain.txt"
record toolchain_exit "${PIPESTATUS[0]}"

note "Start a local Supabase base with repository migrations withheld"
rm -rf .supabase "$withheld_migrations"
supabase init --force > "$EVIDENCE_DIR/logs/supabase-init.log" 2>&1
init_status=$?
cat "$EVIDENCE_DIR/logs/supabase-init.log"
record supabase_init_exit "$init_status"
if [[ $init_status -ne 0 ]]; then
  fail "supabase init failed"
  exit 1
fi
mv supabase/migrations "$withheld_migrations"
mkdir -p supabase/migrations
if [[ -f supabase/seed.sql ]]; then
  mv supabase/seed.sql "$RUNNER_TEMP/pr654-schema-diag-seed.sql.withheld"
fi
raw_start="$RUNNER_TEMP/pr654-schema-diag-start.raw.log"
supabase start --debug > "$raw_start" 2>&1
start_status=$?
sanitize < "$raw_start" > "$EVIDENCE_DIR/logs/supabase-start.log"
rm -f "$raw_start"
cat "$EVIDENCE_DIR/logs/supabase-start.log"
record supabase_start_exit "$start_status"
if [[ $start_status -ne 0 ]]; then
  fail "could not start local Supabase without repository migrations"
  exit 1
fi

docker ps --format '{{.ID}}\t{{.Names}}\t{{.Image}}\t{{.Status}}' \
  | tee "$EVIDENCE_DIR/manifests/docker-containers.tsv"
db_container="$(docker ps --format '{{.Names}}' | grep '^supabase_db_' | head -1)"
if [[ -z "$db_container" ]]; then
  fail "local database container not found"
  exit 1
fi
docker exec "$db_container" psql -X -v ON_ERROR_STOP=1 -U postgres -d postgres -Atc 'select version();' \
  | tee "$EVIDENCE_DIR/postgresql-version.txt"
record postgres_version_query_exit "${PIPESTATUS[0]}"

note "Apply schema.sql with filename-aware psql diagnostics"
docker cp supabase/schema.sql "$db_container:/tmp/pr654-schema.sql" > "$EVIDENCE_DIR/logs/docker-cp-schema.log" 2>&1
copy_status=$?
record docker_cp_schema_exit "$copy_status"
if [[ $copy_status -ne 0 ]]; then
  fail "could not copy schema.sql into local database container"
  exit 1
fi

docker exec "$db_container" psql -X -v ON_ERROR_STOP=1 -v VERBOSITY=verbose -a -U postgres -d postgres -f /tmp/pr654-schema.sql \
  > "$EVIDENCE_DIR/logs/schema-sql-verbose-full.log" 2>&1
schema_status=$?
record schema_sql_apply_exit "$schema_status"

# Preserve the exact error, preceding statement, and source-line neighborhood without
# flooding the public Actions log with the full one-megabyte schema transcript.
grep -n -B80 -A20 -E 'ERROR:|42P17|functions in index expression' \
  "$EVIDENCE_DIR/logs/schema-sql-verbose-full.log" \
  | tail -220 \
  | tee "$EVIDENCE_DIR/logs/schema-sql-error-context.log"

error_line="$(sed -nE 's#^psql:/tmp/pr654-schema\.sql:([0-9]+): ERROR:.*#\1#p' "$EVIDENCE_DIR/logs/schema-sql-verbose-full.log" | head -1)"
record schema_error_line "${error_line:-UNPARSED}"
if [[ -n "$error_line" ]]; then
  start_line=$(( error_line > 35 ? error_line - 35 : 1 ))
  end_line=$(( error_line + 20 ))
  nl -ba supabase/schema.sql | sed -n "${start_line},${end_line}p" \
    | tee "$EVIDENCE_DIR/logs/schema-source-error-neighborhood.log"
fi

docker exec "$db_container" psql -X -v ON_ERROR_STOP=1 -U postgres -d postgres -AtF $'\t' \
  -c "select 'profiles',coalesce(to_regclass('public.profiles')::text,'NULL'); select 'pool_tables',count(*)::text from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relname like 'trade_donation_pool_%' and c.relkind='r';" \
  | tee "$EVIDENCE_DIR/manifests/post-schema-failure-state.tsv"
record post_schema_probe_exit "${PIPESTATUS[0]}"

# Extract every index statement near the failure and report volatility of functions
# explicitly named by that statement where PostgreSQL can resolve them.
if [[ -n "$error_line" ]]; then
  python3 - "$error_line" <<'PY' | tee "$EVIDENCE_DIR/manifests/failing-statement-extraction.txt"
from pathlib import Path
import sys
line=int(sys.argv[1])
text=Path('supabase/schema.sql').read_text(encoding='utf-8')
lines=text.splitlines()
pos=sum(len(x)+1 for x in lines[:line-1])
start=text.rfind(';',0,pos)+1
end=text.find(';',pos)
if end<0: end=len(text)-1
statement=text[start:end+1].strip()
print(statement)
PY
fi

note "Credential scan"
if grep -RIlE '(^|[^A-Za-z0-9])(eyJ[A-Za-z0-9_-]{20,}|sk_(live|test)_[A-Za-z0-9]|sb_secret_|postgres(ql)?://[^[:space:]]+:[^@[:space:]]+@)' "$EVIDENCE_DIR" \
  > "$EVIDENCE_DIR/manifests/credential-scan-hits.txt"; then
  fail "credential-like material detected in schema diagnostic evidence"
else
  : > "$EVIDENCE_DIR/manifests/credential-scan-hits.txt"
fi

cleanup
trap - EXIT
if [[ $cleanup_gate -ne 0 ]]; then overall=1; fi
record final_overall "$overall"
archive="$GITHUB_WORKSPACE/pr654-schema-index-failure-diagnostics.tar.gz"
tar -C "$(dirname "$EVIDENCE_DIR")" -czf "$archive" "$(basename "$EVIDENCE_DIR")"
sha256sum "$archive" | tee "$archive.sha256"
cp "$SUMMARY" "$GITHUB_WORKSPACE/pr654-schema-index-failure-diagnostics-summary.txt"
exit "$overall"
