#!/usr/bin/env bash
set -euo pipefail

: "${SOURCE_HEAD:?}"
: "${SOURCE_MAIN:?}"
: "${TARGET_BRANCH:?}"
: "${PROD_SUPABASE_DB_URL:?}"
: "${PROD_POOLER_HOST:?}"
: "${PROD_POOLER_USER:?}"

ROOT="$(git rev-parse --show-toplevel)"
BASELINE_DIR="$ROOT/supabase/baseline/pre_activation"
CATALOG_SQL="$ROOT/scripts/database/preactivation-catalog.sql"
EVIDENCE_ROOT="${RUNNER_TEMP:-/tmp}/preactivation-baseline-${GITHUB_RUN_ID:-local}"
WORK_DIR="$(mktemp -d)"
DUMP_RAW="$WORK_DIR/production-schema.raw.sql"
DUMP_NORMALIZED="$WORK_DIR/production-schema.normalized.sql"
SOURCE_CATALOG_BEFORE="$WORK_DIR/source-catalog-before.tsv"
SOURCE_CATALOG="$WORK_DIR/source-catalog.tsv"
SOURCE_CATALOG_AFTER="$WORK_DIR/source-catalog-after.tsv"
MIGRATION_HISTORY="$WORK_DIR/migration-history.tsv"
EXTENSIONS_SQL="$WORK_DIR/extensions.sql"
EXTENSIONS_TSV="$WORK_DIR/extensions.tsv"
AUTH_TRIGGERS="$WORK_DIR/auth-user-triggers.sql"
BASELINE_TMP="$WORK_DIR/schema.sql"
MANIFEST_TMP="$WORK_DIR/manifest.json"
TYPE_TEST_TMP="$WORK_DIR/database-preactivation-baseline-contract.test.ts"

cleanup() {
  rm -rf "$WORK_DIR"
}
trap cleanup EXIT

mkdir -p "$EVIDENCE_ROOT/manifests" "$EVIDENCE_ROOT/logs"

fail() {
  printf 'FAIL: %s\n' "$*" >&2
  exit 1
}

if [[ "$(git rev-parse HEAD)" != "$SOURCE_HEAD" ]]; then
  fail "Expected SOURCE_HEAD $SOURCE_HEAD, got $(git rev-parse HEAD)."
fi

git fetch --no-tags origin main "$TARGET_BRANCH"
if [[ "$(git rev-parse origin/main)" != "$SOURCE_MAIN" ]]; then
  fail "Live main drifted from SOURCE_MAIN."
fi
if ! git merge-base --is-ancestor "$SOURCE_MAIN" "$SOURCE_HEAD"; then
  fail "SOURCE_MAIN is not an ancestor of SOURCE_HEAD."
fi
if [[ "$(git rev-parse "origin/$TARGET_BRANCH")" != "$SOURCE_HEAD" ]]; then
  fail "The published target branch drifted before generation."
fi
if [[ -n "$(git status --porcelain)" ]]; then
  fail "Generation checkout is not clean."
fi

python3 - <<'PY'
import os
from urllib.parse import parse_qs, unquote, urlparse

parsed = urlparse(os.environ["PROD_SUPABASE_DB_URL"])
ssl_modes = parse_qs(parsed.query).get("sslmode", ["require"])
valid = (
    parsed.scheme in {"postgres", "postgresql"}
    and unquote(parsed.username or "") == os.environ["PROD_POOLER_USER"]
    and parsed.hostname == os.environ["PROD_POOLER_HOST"]
    and parsed.port == 5432
    and parsed.path == "/postgres"
    and ssl_modes == ["require"]
    and bool(parsed.password)
)
if not valid:
    raise SystemExit("Refusing an unexpected production database target.")
PY

READONLY_DB_URL="$(python3 - <<'PY_URL'
import os
from urllib.parse import parse_qsl, quote, urlencode, urlsplit, urlunsplit

parsed = urlsplit(os.environ["PROD_SUPABASE_DB_URL"])
query = [
    (key, value)
    for key, value in parse_qsl(parsed.query, keep_blank_values=True)
    if key != "options"
]
query.append((
    "options",
    "-c default_transaction_read_only=on -c statement_timeout=180000 -c lock_timeout=5000",
))
print(urlunsplit(parsed._replace(query=urlencode(query, quote_via=quote))))
PY_URL
)"
echo "::add-mask::$PROD_SUPABASE_DB_URL"
echo "::add-mask::$READONLY_DB_URL"
export PGCONNECT_TIMEOUT=15
export PGSSLMODE=require
unset PGOPTIONS || true

psql "$READONLY_DB_URL" -X -v ON_ERROR_STOP=1 -AtF $'\t' -c \
  "select current_setting('default_transaction_read_only'), current_setting('transaction_read_only'), current_database()" \
  > "$EVIDENCE_ROOT/manifests/source-session.txt"
if ! grep -qx $'on\ton\tpostgres' "$EVIDENCE_ROOT/manifests/source-session.txt"; then
  fail "The source session is not the expected read-only production database."
fi

psql "$READONLY_DB_URL" -X -v ON_ERROR_STOP=1 -Atqc "
select json_build_object(
  'auth_users', (select count(*) from auth.users),
  'profiles', case when to_regclass('public.profiles') is null then null else (select count(*) from public.profiles) end,
  'activation_stage_present', exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'profiles' and column_name = 'activation_stage'
  ),
  'activation_transition_functions_present', exists (
    select 1
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname in ('complete_walkthrough_activation_v1', 'complete_profile_activation_v1')
  ),
  'application_relations', (
    select count(*)
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname in ('public', 'moral_trade_private')
      and c.relkind in ('r', 'p', 'v', 'm', 'S', 'f')
  )
)::text;
" > "$EVIDENCE_ROOT/manifests/source-counts.json"

if jq -e '.activation_stage_present == true or .activation_transition_functions_present == true' \
  "$EVIDENCE_ROOT/manifests/source-counts.json" >/dev/null; then
  fail "Production is no longer a pre-activation source."
fi

psql "$READONLY_DB_URL" -X -v ON_ERROR_STOP=1 -f "$CATALOG_SQL" \
  > "$SOURCE_CATALOG_BEFORE"
LC_ALL=C sort -u "$SOURCE_CATALOG_BEFORE" > "$SOURCE_CATALOG"
if [[ ! -s "$SOURCE_CATALOG" ]]; then
  fail "The production application catalog is empty."
fi

psql "$READONLY_DB_URL" -X -v ON_ERROR_STOP=1 -AtF $'\t' -c "
select
  to_jsonb(m) ->> 'version' as migration_version,
  coalesce(to_jsonb(m) ->> 'name', '') as migration_name,
  case
    when coalesce(to_jsonb(m) ->> 'created_by', '') = '' then ''
    when to_jsonb(m) ->> 'created_by' in ('postgres', 'supabase_admin')
      then to_jsonb(m) ->> 'created_by'
    when to_jsonb(m) ->> 'created_by' like 'chatgpt:%' then 'chatgpt'
    when to_jsonb(m) ->> 'created_by' like '%@%' then 'email_principal'
    else 'other_principal'
  end as created_by_class,
  case
    when jsonb_typeof(to_jsonb(m) -> 'statements') = 'array'
      then jsonb_array_length(to_jsonb(m) -> 'statements')
    else null
  end as statement_count,
  md5(coalesce((to_jsonb(m) -> 'statements')::text, '')) as statements_md5
from supabase_migrations.schema_migrations m
order by 1, 2;
" > "$MIGRATION_HISTORY"
if [[ ! -s "$MIGRATION_HISTORY" ]]; then
  fail "The production migration history is empty."
fi

psql "$READONLY_DB_URL" -X -v ON_ERROR_STOP=1 -AtF $'\t' -c "
select e.extname, n.nspname, e.extversion
from pg_extension e
join pg_namespace n on n.oid = e.extnamespace
where e.extname <> 'plpgsql'
order by e.extname;
" > "$EXTENSIONS_TSV"

psql "$READONLY_DB_URL" -X -v ON_ERROR_STOP=1 -Atqc "
select format(
  'create schema if not exists %I; create extension if not exists %I with schema %I;',
  n.nspname,
  e.extname,
  n.nspname
)
from pg_extension e
join pg_namespace n on n.oid = e.extnamespace
where e.extname <> 'plpgsql'
order by e.extname;
" > "$EXTENSIONS_SQL"

psql "$READONLY_DB_URL" -X -v ON_ERROR_STOP=1 -Atqc "
select format(
  'drop trigger if exists %I on auth.users;%s%s;',
  t.tgname,
  E'\\n',
  pg_get_triggerdef(t.oid, true)
)
from pg_trigger t
join pg_class c on c.oid = t.tgrelid
join pg_namespace n on n.oid = c.relnamespace
join pg_proc p on p.oid = t.tgfoid
join pg_namespace pn on pn.oid = p.pronamespace
where not t.tgisinternal
  and n.nspname = 'auth'
  and c.relname = 'users'
  and pn.nspname in ('public', 'moral_trade_private')
order by t.tgname;
" > "$AUTH_TRIGGERS"
if [[ ! -s "$AUTH_TRIGGERS" ]]; then
  fail "The production auth-to-profile trigger boundary is empty."
fi

npx --yes supabase@2.110.0 db dump \
  --db-url "$READONLY_DB_URL" \
  --schema public,moral_trade_private \
  --file "$DUMP_RAW" \
  > "$EVIDENCE_ROOT/logs/supabase-db-dump.log" 2>&1
test -s "$DUMP_RAW"

python3 - "$DUMP_RAW" "$DUMP_NORMALIZED" <<'PY'
from pathlib import Path
import re
import sys

source = Path(sys.argv[1]).read_text()
output: list[str] = []
skip_statement = False
for raw_line in source.splitlines():
    line = raw_line.rstrip()
    if not line:
        output.append("")
        continue
    if line.startswith("--") or line.startswith("\\") or line.startswith("SET "):
        continue
    if line.startswith("SELECT pg_catalog.set_config"):
        continue
    if line.startswith("COMMENT ON ") or line.startswith("SECURITY LABEL FOR "):
        skip_statement = True
    if skip_statement:
        if line.endswith(";"):
            skip_statement = False
        continue
    if re.match(r"^(CREATE|ALTER) EXTENSION ", line):
        continue
    if line in {"CREATE SCHEMA public;", 'CREATE SCHEMA "public";'}:
        output.extend(["create schema if not exists public;", ""])
        continue
    if line in {"CREATE SCHEMA moral_trade_private;", 'CREATE SCHEMA "moral_trade_private";'}:
        output.extend(["create schema if not exists moral_trade_private;", ""])
        continue
    output.append(line)

normalized = "\n".join(output).strip() + "\n"
for pattern, label in (
    (r"(?i)\bCOPY\s+(?:public|moral_trade_private)\.", "COPY data"),
    (r"(?i)\bINSERT\s+INTO\s+(?:public|moral_trade_private)\.", "application data"),
    (r"(?i)\bINSERT\s+INTO\s+auth\.users\b", "Auth user data"),
    (r"(?i)\bCREATE\s+DATABASE\b", "database creation"),
    (r"(?i)\bALTER\s+DATABASE\b", "database mutation"),
    (r"(?i)\bactivation_stage\b", "post-boundary activation schema"),
    (r"(?i)\bcomplete_(?:walkthrough|profile)_activation_v1\b", "post-boundary activation RPC"),
    (r"(?i)\bMoral Trade operator\s+[—-]\s+Ellen\b", "named-human seed"),
):
    if re.search(pattern, normalized):
        raise SystemExit(f"Forbidden {label} in schema-only dump.")
Path(sys.argv[2]).write_text(normalized)
PY

psql "$READONLY_DB_URL" -X -v ON_ERROR_STOP=1 -f "$CATALOG_SQL" \
  > "$SOURCE_CATALOG_AFTER"
LC_ALL=C sort -u "$SOURCE_CATALOG_AFTER" > "$WORK_DIR/source-catalog-after.sorted.tsv"
if ! cmp "$SOURCE_CATALOG" "$WORK_DIR/source-catalog-after.sorted.tsv"; then
  fail "The production catalog drifted during baseline capture."
fi

cat > "$BASELINE_TMP" <<'SQL'
-- Moral Trade authoritative pre-activation Supabase application-schema baseline.
--
-- Generated from the production application catalog under an enforced read-only
-- session. This file is data-free and valid only for an empty Supabase database.
-- The exact post-boundary activation migration is bound in manifest.json.
-- Do not edit by hand; regenerate through generate-preactivation-baseline.yml.

begin;

set local lock_timeout = '5s';
set local statement_timeout = '10min';

DO $baseline_guard$
DECLARE
  application_relation_count integer;
  application_function_count integer;
  application_auth_trigger_count integer;
BEGIN
  SELECT count(*)
    INTO application_relation_count
  FROM pg_class c
  JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname IN ('public', 'moral_trade_private')
    AND c.relkind IN ('r', 'p', 'v', 'm', 'S', 'f')
    AND NOT EXISTS (
      SELECT 1
      FROM pg_depend d
      WHERE d.deptype = 'e'
        AND d.classid = 'pg_class'::regclass
        AND d.objid = c.oid
        AND d.objsubid = 0
    );

  SELECT count(*)
    INTO application_function_count
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname IN ('public', 'moral_trade_private')
    AND NOT EXISTS (
      SELECT 1
      FROM pg_depend d
      WHERE d.deptype = 'e'
        AND d.classid = 'pg_proc'::regclass
        AND d.objid = p.oid
        AND d.objsubid = 0
    );

  SELECT count(*)
    INTO application_auth_trigger_count
  FROM pg_trigger t
  JOIN pg_class c ON c.oid = t.tgrelid
  JOIN pg_namespace n ON n.oid = c.relnamespace
  JOIN pg_proc p ON p.oid = t.tgfoid
  JOIN pg_namespace pn ON pn.oid = p.pronamespace
  WHERE NOT t.tgisinternal
    AND n.nspname = 'auth'
    AND c.relname = 'users'
    AND pn.nspname IN ('public', 'moral_trade_private');

  IF application_relation_count <> 0
     OR application_function_count <> 0
     OR application_auth_trigger_count <> 0 THEN
    RAISE EXCEPTION
      USING
        ERRCODE = 'object_not_in_prerequisite_state',
        MESSAGE = format(
          'Pre-activation baseline requires an empty application schema; found %s relations, %s functions, and %s auth triggers.',
          application_relation_count,
          application_function_count,
          application_auth_trigger_count
        );
  END IF;
END;
$baseline_guard$;
SQL

cat "$EXTENSIONS_SQL" >> "$BASELINE_TMP"
printf '\n' >> "$BASELINE_TMP"
cat "$DUMP_NORMALIZED" >> "$BASELINE_TMP"
printf '\n-- Application-owned trigger(s) on Supabase-managed auth.users.\n' >> "$BASELINE_TMP"
cat "$AUTH_TRIGGERS" >> "$BASELINE_TMP"
cat >> "$BASELINE_TMP" <<'SQL'

commit;
SQL

for forbidden in \
  'COPY public.' \
  'COPY moral_trade_private.' \
  'INSERT INTO public.' \
  'INSERT INTO moral_trade_private.' \
  'activation_stage' \
  'complete_walkthrough_activation_v1' \
  'complete_profile_activation_v1'; do
  if grep -Fq "$forbidden" "$BASELINE_TMP"; then
    fail "Generated baseline contains forbidden content: $forbidden"
  fi
done

if grep -Eiq \
    '(^|[^A-Za-z0-9_])(eyJ[A-Za-z0-9_-]{20,}|postgres(ql)?://|sk_(live|test)_[A-Za-z0-9]+|whsec_[A-Za-z0-9]+|re_[A-Za-z0-9]{20,})([^A-Za-z0-9_]|$)' \
    "$BASELINE_TMP"; then
  fail "Generated baseline contains credential-shaped text."
fi

python3 - \
  "$SOURCE_HEAD" \
  "$SOURCE_MAIN" \
  "$BASELINE_TMP" \
  "$SOURCE_CATALOG" \
  "$MIGRATION_HISTORY" \
  "$EXTENSIONS_TSV" \
  "$MANIFEST_TMP" <<'PY'
from hashlib import sha256
from pathlib import Path
from datetime import datetime, timezone
import json
import sys

source_head, source_main, baseline_path, catalog_path, history_path, extensions_path, manifest_path = sys.argv[1:]

def digest(path: str) -> str:
    return sha256(Path(path).read_bytes()).hexdigest()

history_lines = [line for line in Path(history_path).read_text().splitlines() if line]
catalog_lines = [line for line in Path(catalog_path).read_text().splitlines() if line]
extension_lines = [line for line in Path(extensions_path).read_text().splitlines() if line]
manifest = {
    "format_version": 1,
    "baseline_id": "moraltrade-pre-activation-production-2026-08-18",
    "boundary": "pre_activation",
    "source": {
        "repository": "ghuser29384/Website2",
        "source_head": source_head,
        "source_main": source_main,
        "captured_at_utc": datetime.now(timezone.utc).replace(microsecond=0).isoformat(),
        "production_project_ref": "jnpoxvalyjtdghnperyu",
        "production_access": "schema-only; enforced read-only transaction",
    },
    "scope": {
        "schemas": ["public", "moral_trade_private"],
        "cross_schema_objects": ["application-owned triggers on auth.users"],
        "privilege_roles": ["anon", "authenticated", "service_role", "authenticator", "supabase_auth_admin"],
        "excludes": [
            "table data",
            "Auth user data",
            "Supabase-managed schema internals",
            "database role passwords and secrets",
            "comments and security labels",
        ],
    },
    "cutover": {
        "baseline_state": "production immediately before activation_stage",
        "next_migration": "20260814042516_account_activation_stage.sql",
        "legacy_migrations_replayed_after_baseline": [],
    },
    "files": {
        "schema.sql": digest(baseline_path),
        "source_catalog.tsv": digest(catalog_path),
        "source_migration_history.tsv": digest(history_path),
        "source_extensions.tsv": digest(extensions_path),
    },
    "counts": {
        "catalog_rows": len(catalog_lines),
        "migration_history_rows": len(history_lines),
        "extension_rows": len(extension_lines),
    },
}
Path(manifest_path).write_text(json.dumps(manifest, indent=2, sort_keys=True) + "\n")
PY

cat > "$TYPE_TEST_TMP" <<'TS'
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import test from "node:test";

const root = "supabase/baseline/pre_activation";
const manifest = JSON.parse(readFileSync(`${root}/manifest.json`, "utf8")) as {
  baseline_id: string;
  boundary: string;
  cutover: { next_migration: string; legacy_migrations_replayed_after_baseline: string[] };
  files: Record<string, string>;
  scope: { excludes: string[]; cross_schema_objects: string[] };
};

function digest(path: string) {
  return createHash("sha256").update(readFileSync(path)).digest("hex");
}

test("pre-activation baseline manifest binds every authoritative artifact", () => {
  assert.match(manifest.baseline_id, /^moraltrade-pre-activation-production-/);
  assert.equal(manifest.boundary, "pre_activation");
  assert.equal(manifest.cutover.next_migration, "20260814042516_account_activation_stage.sql");
  assert.deepEqual(manifest.cutover.legacy_migrations_replayed_after_baseline, []);
  for (const [name, expected] of Object.entries(manifest.files)) {
    assert.equal(digest(`${root}/${name}`), expected, name);
  }
});

test("pre-activation baseline is data-free, guarded, portable, and activation-free", () => {
  const sql = readFileSync(`${root}/schema.sql`, "utf8");
  assert.match(sql, /Pre-activation baseline requires an empty application schema/);
  assert.doesNotMatch(sql, /COPY (?:public|moral_trade_private)\./);
  assert.doesNotMatch(sql, /INSERT INTO (?:public|moral_trade_private)\./);
  assert.doesNotMatch(sql, /activation_stage/);
  assert.doesNotMatch(sql, /complete_(?:walkthrough|profile)_activation_v1/);
  assert.doesNotMatch(sql, /^\\(?:un)?restrict\b/m);
  assert.match(sql, /CREATE TRIGGER on_auth_profile_created/i);
  assert.match(sql, /ON auth\.users/i);
  assert.doesNotMatch(sql, /postgres(?:ql)?:\/\//);
  assert.doesNotMatch(sql, /eyJ[A-Za-z0-9_-]{20,}/);
  assert.ok(manifest.scope.excludes.includes("table data"));
  assert.ok(manifest.scope.excludes.includes("Auth user data"));
  assert.ok(manifest.scope.cross_schema_objects.includes("application-owned triggers on auth.users"));
});
TS

mkdir -p "$BASELINE_DIR"
install -m 0644 "$BASELINE_TMP" "$BASELINE_DIR/schema.sql"
install -m 0644 "$SOURCE_CATALOG" "$BASELINE_DIR/source_catalog.tsv"
install -m 0644 "$MIGRATION_HISTORY" "$BASELINE_DIR/source_migration_history.tsv"
install -m 0644 "$EXTENSIONS_TSV" "$BASELINE_DIR/source_extensions.tsv"
install -m 0644 "$MANIFEST_TMP" "$BASELINE_DIR/manifest.json"
install -m 0644 "$TYPE_TEST_TMP" "$ROOT/src/lib/database-preactivation-baseline-contract.test.ts"

cp "$SOURCE_CATALOG" "$EVIDENCE_ROOT/manifests/source-catalog.tsv"
cp "$MIGRATION_HISTORY" "$EVIDENCE_ROOT/manifests/source-migration-history.tsv"
cp "$EXTENSIONS_TSV" "$EVIDENCE_ROOT/manifests/source-extensions.tsv"
cp "$MANIFEST_TMP" "$EVIDENCE_ROOT/manifests/manifest.json"
printf 'schema_sha256=%s\n' "$(sha256sum "$BASELINE_DIR/schema.sql" | awk '{print $1}')" \
  > "$EVIDENCE_ROOT/manifests/generated-files.txt"
printf 'catalog_sha256=%s\n' "$(sha256sum "$BASELINE_DIR/source_catalog.tsv" | awk '{print $1}')" \
  >> "$EVIDENCE_ROOT/manifests/generated-files.txt"
printf 'migration_history_sha256=%s\n' "$(sha256sum "$BASELINE_DIR/source_migration_history.tsv" | awk '{print $1}')" \
  >> "$EVIDENCE_ROOT/manifests/generated-files.txt"
printf 'extensions_sha256=%s\n' "$(sha256sum "$BASELINE_DIR/source_extensions.tsv" | awk '{print $1}')" \
  >> "$EVIDENCE_ROOT/manifests/generated-files.txt"
printf 'manifest_sha256=%s\n' "$(sha256sum "$BASELINE_DIR/manifest.json" | awk '{print $1}')" \
  >> "$EVIDENCE_ROOT/manifests/generated-files.txt"

node --import tsx --test "$ROOT/src/lib/database-preactivation-baseline-contract.test.ts" \
  2>&1 | tee "$EVIDENCE_ROOT/logs/source-contract.log"
git diff --check

printf 'source_head=%s\nsource_main=%s\n' "$SOURCE_HEAD" "$SOURCE_MAIN" \
  > "$EVIDENCE_ROOT/manifests/git-source.txt"
