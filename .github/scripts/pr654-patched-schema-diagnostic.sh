#!/usr/bin/env bash
set -euo pipefail

: "${EXPECTED_PRODUCT_HEAD:?}"
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

withheld="$RUNNER_TEMP/pr654-patched-schema-migrations"
cleanup() {
  set +e
  if [[ -d "$withheld" && ! -d supabase/migrations ]]; then
    mv "$withheld" supabase/migrations
  elif [[ -d "$withheld" && -d supabase/migrations && -z "$(find supabase/migrations -mindepth 1 -print -quit 2>/dev/null)" ]]; then
    rmdir supabase/migrations
    mv "$withheld" supabase/migrations
  fi
  supabase stop --no-backup > "$EVIDENCE_DIR/logs/supabase-stop.log" 2>&1 || true
  docker ps -a --format '{{.ID}}\t{{.Names}}\t{{.Image}}\t{{.Status}}' > "$EVIDENCE_DIR/manifests/docker-after-cleanup.tsv"
  docker volume ls --format '{{.Name}}' | grep -E 'supabase|pr654-patched' > "$EVIDENCE_DIR/manifests/volumes-after-cleanup.txt" || true
  ss -ltnp 2>/dev/null | grep -E ':(5432[0-9]|8000|8443|3000|4000|5000|6543|55432)\b' > "$EVIDENCE_DIR/manifests/listeners-after-cleanup.txt" || true
  rm -rf "$withheld" .supabase supabase/config.toml
  git reset --hard HEAD > "$EVIDENCE_DIR/logs/git-reset.log" 2>&1 || true
  git clean -fdx >> "$EVIDENCE_DIR/logs/git-reset.log" 2>&1 || true
  git status --short --branch > "$EVIDENCE_DIR/manifests/git-status-final.txt"
}
trap cleanup EXIT

test "$(git rev-parse HEAD)" = "$EXPECTED_PRODUCT_HEAD"
test -z "$(git symbolic-ref -q --short HEAD || true)"
test -z "$(git status --porcelain)"
for name in SUPABASE_ACCESS_TOKEN SUPABASE_DB_PASSWORD SUPABASE_PROJECT_ID SUPABASE_PROJECT_REF SUPABASE_URL SUPABASE_SERVICE_ROLE_KEY NEXT_PUBLIC_SUPABASE_URL NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY DATABASE_URL DIRECT_URL POSTGRES_URL STRIPE_SECRET_KEY STRIPE_WEBHOOK_SECRET EVERY_ORG_WEBHOOK_SECRET; do unset "$name"; done

{
  uname -a
  cat /etc/os-release
  docker version
  node --version
  npm --version
  git --version
  supabase --version
} > "$EVIDENCE_DIR/toolchain.txt"

rm -rf .supabase "$withheld"
supabase init --force > "$EVIDENCE_DIR/logs/supabase-init.raw.log" 2>&1
sanitize < "$EVIDENCE_DIR/logs/supabase-init.raw.log" > "$EVIDENCE_DIR/logs/supabase-init.log"
rm -f "$EVIDENCE_DIR/logs/supabase-init.raw.log"
mv supabase/migrations "$withheld"
mkdir -p supabase/migrations
set +e
supabase start --debug > "$EVIDENCE_DIR/logs/supabase-start.raw.log" 2>&1
start_status=$?
set -e
printf '%s\n' "$start_status" > "$EVIDENCE_DIR/logs/supabase-start.exit"
sanitize < "$EVIDENCE_DIR/logs/supabase-start.raw.log" > "$EVIDENCE_DIR/logs/supabase-start.log"
rm -f "$EVIDENCE_DIR/logs/supabase-start.raw.log"
test "$start_status" -eq 0

db_container="$(docker ps --format '{{.Names}}' | grep '^supabase_db_' | head -1)"
test -n "$db_container"
docker exec "$db_container" psql -X -U postgres -d postgres -Atc 'select version();' > "$EVIDENCE_DIR/postgresql-version.txt"
rmdir supabase/migrations
mv "$withheld" supabase/migrations

cp supabase/schema.sql "$EVIDENCE_DIR/manifests/patched-schema.sql"
python3 - "$EVIDENCE_DIR/manifests/patched-schema.sql" <<'PY'
from pathlib import Path
import sys
p=Path(sys.argv[1])
text=p.read_text()
needle="create index if not exists wish_profiles_broad_preview_text_search_idx"
if needle not in text:
    raise SystemExit('target index not found')
helper="""create or replace function public.moral_trade_immutable_text_array_search(input_values text[])
returns text
language sql
immutable
strict
parallel safe
set search_path = pg_catalog
as $$
  select coalesce(string_agg(value, ' ' order by ordinal), '')
  from unnest(input_values) with ordinality as item(value, ordinal);
$$;

"""
text=text.replace(needle,helper+needle,1)
old="array_to_string(causes, ' ')"
if old not in text:
    raise SystemExit('array_to_string target not found')
text=text.replace(old,"public.moral_trade_immutable_text_array_search(causes)",1)
p.write_text(text)
PY
sha256sum supabase/schema.sql "$EVIDENCE_DIR/manifests/patched-schema.sql" > "$EVIDENCE_DIR/manifests/schema-digests.txt"
docker cp "$EVIDENCE_DIR/manifests/patched-schema.sql" "$db_container:/tmp/pr654-patched-schema.sql"
set +e
docker exec "$db_container" psql -X -1 -v ON_ERROR_STOP=1 -v VERBOSITY=verbose -a -U postgres -d postgres -f /tmp/pr654-patched-schema.sql > "$EVIDENCE_DIR/logs/patched-schema-full.log" 2>&1
schema_status=$?
set -e
printf '%s\n' "$schema_status" > "$EVIDENCE_DIR/logs/patched-schema.exit"
if [[ "$schema_status" -eq 0 ]]; then
  printf 'PATCHED_SCHEMA_PASSED\n' > "$EVIDENCE_DIR/result.txt"
else
  printf 'PATCHED_SCHEMA_FAILED\n' > "$EVIDENCE_DIR/result.txt"
  grep -n -B120 -A40 -E 'ERROR:|SQL state:|LOCATION:' "$EVIDENCE_DIR/logs/patched-schema-full.log" > "$EVIDENCE_DIR/failures/error-context.txt" || true
  error_line="$(sed -nE 's#^psql:/tmp/pr654-patched-schema\.sql:([0-9]+): ERROR:.*#\1#p' "$EVIDENCE_DIR/logs/patched-schema-full.log" | head -1)"
  printf 'error_line=%s\n' "${error_line:-UNPARSED}" > "$EVIDENCE_DIR/failures/identity.txt"
  if [[ -n "$error_line" ]]; then
    start_line=$((error_line > 60 ? error_line - 60 : 1)); end_line=$((error_line + 40))
    nl -ba "$EVIDENCE_DIR/manifests/patched-schema.sql" | sed -n "${start_line},${end_line}p" > "$EVIDENCE_DIR/failures/source-neighborhood.txt"
  fi
fi

docker exec "$db_container" psql -X -U postgres -d postgres -AtF $'\t' -c "select n.nspname,c.relname,c.relkind from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname in ('public','moral_trade_private') order by n.nspname,c.relname;" > "$EVIDENCE_DIR/manifests/objects-after-attempt.tsv" 2>&1 || true

if grep -RIlE '(^|[^A-Za-z0-9])(eyJ[A-Za-z0-9_-]{20,}|sk_(live|test)_[A-Za-z0-9]|sb_secret_|postgres(ql)?://[^[:space:]]+:[^@[:space:]]+@)' "$EVIDENCE_DIR" > "$EVIDENCE_DIR/manifests/credential-scan-hits.txt"; then exit 1; fi
: > "$EVIDENCE_DIR/manifests/credential-scan-hits.txt"
cleanup
trap - EXIT
test ! -s "$EVIDENCE_DIR/manifests/volumes-after-cleanup.txt"
test ! -s "$EVIDENCE_DIR/manifests/listeners-after-cleanup.txt"
if grep -q 'supabase_' "$EVIDENCE_DIR/manifests/docker-after-cleanup.tsv"; then exit 1; fi
