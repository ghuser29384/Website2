#!/usr/bin/env bash
set -euo pipefail

: "${SUPABASE_CLI_VERSION:=2.110.0}"
: "${EVIDENCE_DIR:?EVIDENCE_DIR is required}"

mkdir -p "$EVIDENCE_DIR"/{logs,cases,manifests}
TRANSCRIPT="$EVIDENCE_DIR/command-transcript.txt"
: > "$TRANSCRIPT"
exec > >(tee -a "$TRANSCRIPT") 2>&1

supabase() {
  npx --yes "supabase@${SUPABASE_CLI_VERSION}" "$@"
}

sanitize() {
  sed -E \
    -e '/(anon key|service_role key|S3 Access Key|S3 Secret Key|JWT secret|DB URL)/I s#(:|=).*#\1 [REDACTED]#' \
    -e 's#postgres(ql)?://[^[:space:]]+#[REDACTED_LOCAL_DB_URL]#g' \
    -e 's#eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}#[REDACTED_LOCAL_JWT]#g' \
    -e 's#sb_(secret|publishable)_[A-Za-z0-9_-]+#[REDACTED_LOCAL_KEY]#g'
}

case_dir() {
  printf '%s/pr654-synthetic-%s' "${RUNNER_TEMP:?}" "$1"
}

case_out() {
  printf '%s/cases/%s' "$EVIDENCE_DIR" "$1"
}

find_db_container() {
  local project_dir="$1"
  local project_id
  project_id="$(basename "$project_dir" | tr '[:upper:]' '[:lower:]' | tr -cd 'a-z0-9_-')"
  docker ps --format '{{.Names}}' \
    | grep -E "^supabase_db_${project_id}$" \
    | head -1
}

query_database() {
  local project_dir="$1"
  local output="$2"
  local sql="$3"
  local db
  db="$(find_db_container "$project_dir")"
  if [[ -z "$db" ]]; then
    printf 'NO_DATABASE_CONTAINER\n' > "$output"
    return 1
  fi
  docker exec "$db" psql -X -v ON_ERROR_STOP=1 -U postgres -d postgres -AtF $'\t' \
    -c "$sql" > "$output" 2>&1
}

capture_history() {
  local project_dir="$1"
  local output="$2"
  query_database "$project_dir" "$output" "
select 'COLUMN', ordinal_position::text, column_name, data_type, is_nullable
from information_schema.columns
where table_schema='supabase_migrations' and table_name='schema_migrations'
order by ordinal_position;
select 'CONSTRAINT', c.conname, pg_get_constraintdef(c.oid)
from pg_constraint c
join pg_class r on r.oid=c.conrelid
join pg_namespace n on n.oid=r.relnamespace
where n.nspname='supabase_migrations' and r.relname='schema_migrations'
order by c.conname;
select 'INDEX', indexname, indexdef
from pg_indexes
where schemaname='supabase_migrations' and tablename='schema_migrations'
order by indexname;
select 'ROW', row_to_json(m)::text
from supabase_migrations.schema_migrations m
order by version;
" || true
}

capture_tables() {
  local project_dir="$1"
  local output="$2"
  query_database "$project_dir" "$output" "
select n.nspname, c.relname, c.relkind
from pg_class c join pg_namespace n on n.oid=c.relnamespace
where n.nspname='public' and c.relname like 'synthetic_%'
order by c.relname;
select table_name, column_name, data_type, is_nullable, column_default
from information_schema.columns
where table_schema='public' and table_name like 'synthetic_%'
order by table_name, ordinal_position;
" || true
}

init_case() {
  local name="$1"
  local dir out
  dir="$(case_dir "$name")"
  out="$(case_out "$name")"
  rm -rf "$dir" "$out"
  mkdir -p "$dir" "$out"
  (
    cd "$dir"
    supabase init --force > "$out/init.raw.log" 2>&1
  )
  sanitize < "$out/init.raw.log" > "$out/init.log"
  rm -f "$out/init.raw.log"
  mkdir -p "$dir/supabase/migrations"
  cp "$dir/supabase/config.toml" "$out/generated-config.toml"
}

run_start() {
  local name="$1"
  local label="$2"
  local dir out status
  dir="$(case_dir "$name")"
  out="$(case_out "$name")"
  set +e
  (
    cd "$dir"
    supabase start --debug
  ) > "$out/${label}.raw.log" 2>&1
  status=$?
  set -e
  printf '%s\n' "$status" > "$out/${label}.exit"
  sanitize < "$out/${label}.raw.log" > "$out/${label}.log"
  rm -f "$out/${label}.raw.log"
  return 0
}

run_cli() {
  local name="$1"
  local label="$2"
  shift 2
  local dir out status
  dir="$(case_dir "$name")"
  out="$(case_out "$name")"
  set +e
  (
    cd "$dir"
    supabase "$@"
  ) > "$out/${label}.raw.log" 2>&1
  status=$?
  set -e
  printf '%s\n' "$status" > "$out/${label}.exit"
  sanitize < "$out/${label}.raw.log" > "$out/${label}.log"
  rm -f "$out/${label}.raw.log"
}

stop_case() {
  local name="$1"
  local dir out status
  dir="$(case_dir "$name")"
  out="$(case_out "$name")"
  [[ -d "$dir" ]] || return 0
  set +e
  (
    cd "$dir"
    supabase stop --no-backup
  ) > "$out/stop.raw.log" 2>&1
  status=$?
  set -e
  printf '%s\n' "$status" > "$out/stop.exit"
  sanitize < "$out/stop.raw.log" > "$out/stop.log"
  rm -f "$out/stop.raw.log"
}

cleanup() {
  set +e
  for dir in "$RUNNER_TEMP"/pr654-synthetic-*; do
    [[ -d "$dir" ]] || continue
    (
      cd "$dir"
      supabase stop --no-backup >/dev/null 2>&1 || true
    )
  done
  docker ps -a --format '{{.ID}}\t{{.Names}}\t{{.Image}}\t{{.Status}}' \
    > "$EVIDENCE_DIR/manifests/docker-after-cleanup.tsv"
  docker volume ls --format '{{.Name}}' \
    | grep -E 'supabase|pr654-synthetic' \
    > "$EVIDENCE_DIR/manifests/volumes-after-cleanup.txt" || true
  ss -ltnp 2>/dev/null \
    | grep -E ':(5432[0-9]|8000|8443|3000|4000|5000|6543|55432)\b' \
    > "$EVIDENCE_DIR/manifests/listeners-after-cleanup.txt" || true
  rm -rf "$RUNNER_TEMP"/pr654-synthetic-*
}
trap cleanup EXIT

printf '===== toolchain =====\n'
{
  uname -a
  cat /etc/os-release
  docker version
  node --version
  npm --version
  git --version
  supabase --version
  supabase migration up --help
} | tee "$EVIDENCE_DIR/toolchain-and-help.txt"

printf '===== case: schema_paths ordering and reset =====\n'
init_case schema-paths
schema_dir="$(case_dir schema-paths)"
schema_out="$(case_out schema-paths)"
mkdir -p "$schema_dir/supabase/schemas"
cat > "$schema_dir/supabase/schemas/00-base.sql" <<'SQL'
create table public.synthetic_base (
  id integer primary key,
  marker text not null default 'base'
);
SQL
cat > "$schema_dir/supabase/migrations/20260101000000_depends_on_base.sql" <<'SQL'
create table public.synthetic_depends (
  id integer primary key,
  base_id integer not null references public.synthetic_base(id)
);
SQL
python3 - "$schema_dir/supabase/config.toml" <<'PY'
from pathlib import Path
import sys
path=Path(sys.argv[1])
text=path.read_text()
needle='schema_paths = []'
if needle not in text:
    raise SystemExit('generated config lacks schema_paths = []')
path.write_text(text.replace(needle, 'schema_paths = ["./schemas/00-base.sql"]', 1))
PY
cp "$schema_dir/supabase/config.toml" "$schema_out/config-with-schema-path.toml"
run_start schema-paths start
capture_history "$schema_dir" "$schema_out/history-after-start.tsv"
capture_tables "$schema_dir" "$schema_out/tables-after-start.tsv"
run_cli schema-paths db-reset db reset --local --no-seed
capture_history "$schema_dir" "$schema_out/history-after-reset.tsv"
capture_tables "$schema_dir" "$schema_out/tables-after-reset.tsv"
stop_case schema-paths

printf '===== case: duplicate version prefixes =====\n'
init_case duplicate
duplicate_dir="$(case_dir duplicate)"
duplicate_out="$(case_out duplicate)"
cat > "$duplicate_dir/supabase/migrations/20260101000000_first.sql" <<'SQL'
create table public.synthetic_first(id integer primary key);
SQL
cat > "$duplicate_dir/supabase/migrations/20260101000000_second.sql" <<'SQL'
create table public.synthetic_second(id integer primary key);
SQL
run_start duplicate start
capture_history "$duplicate_dir" "$duplicate_out/history.tsv"
capture_tables "$duplicate_dir" "$duplicate_out/tables.tsv"
stop_case duplicate

printf '===== case: non-14-digit version =====\n'
init_case nonstandard
nonstandard_dir="$(case_dir nonstandard)"
nonstandard_out="$(case_out nonstandard)"
cat > "$nonstandard_dir/supabase/migrations/20260101_short.sql" <<'SQL'
create table public.synthetic_short(id integer primary key);
SQL
run_start nonstandard start
capture_history "$nonstandard_dir" "$nonstandard_out/history.tsv"
capture_tables "$nonstandard_dir" "$nonstandard_out/tables.tsv"
stop_case nonstandard

printf '===== case: backdated migration added after later version =====\n'
init_case backdated
backdated_dir="$(case_dir backdated)"
backdated_out="$(case_out backdated)"
cat > "$backdated_dir/supabase/migrations/20260102000000_later.sql" <<'SQL'
create table public.synthetic_later(id integer primary key);
SQL
run_start backdated start-later
capture_history "$backdated_dir" "$backdated_out/history-before.tsv"
capture_tables "$backdated_dir" "$backdated_out/tables-before.tsv"
cat > "$backdated_dir/supabase/migrations/20260101000000_earlier.sql" <<'SQL'
create table public.synthetic_earlier(id integer primary key);
SQL
run_cli backdated migration-list migration list --local
run_cli backdated migration-up migration up --local
capture_history "$backdated_dir" "$backdated_out/history-after-up.tsv"
capture_tables "$backdated_dir" "$backdated_out/tables-after-up.tsv"
run_cli backdated migration-up-include-all migration up --local --include-all
capture_history "$backdated_dir" "$backdated_out/history-after-include-all.tsv"
capture_tables "$backdated_dir" "$backdated_out/tables-after-include-all.tsv"
stop_case backdated

printf '===== case: changed contents under recorded version =====\n'
init_case changed
changed_dir="$(case_dir changed)"
changed_out="$(case_out changed)"
cat > "$changed_dir/supabase/migrations/20260101000000_change.sql" <<'SQL'
create table public.synthetic_change(id integer primary key);
SQL
run_start changed start
capture_history "$changed_dir" "$changed_out/history-before.tsv"
capture_tables "$changed_dir" "$changed_out/tables-before.tsv"
cat > "$changed_dir/supabase/migrations/20260101000000_change.sql" <<'SQL'
create table public.synthetic_change(
  id integer primary key,
  changed text not null default 'yes'
);
SQL
run_cli changed migration-list-after-edit migration list --local
run_cli changed migration-up-after-edit migration up --local
capture_history "$changed_dir" "$changed_out/history-after.tsv"
capture_tables "$changed_dir" "$changed_out/tables-after.tsv"
stop_case changed

printf '===== summarize exits =====\n'
find "$EVIDENCE_DIR/cases" -type f -name '*.exit' -print0 \
  | sort -z \
  | xargs -0 -I{} sh -c 'printf "%s=" "{}"; cat "{}"' \
  | sed "s#${EVIDENCE_DIR}/##" \
  | tee "$EVIDENCE_DIR/exit-summary.txt"

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
