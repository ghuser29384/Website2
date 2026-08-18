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
SOURCE_CATALOG="$WORK_DIR/source-catalog.tsv"
SOURCE_CATALOG_NORMALIZED="$WORK_DIR/source-catalog.normalized.tsv"
MIGRATION_HISTORY="$WORK_DIR/migration-history.tsv"
EXTENSIONS="$WORK_DIR/extensions.sql"
BASELINE_TMP="$WORK_DIR/schema.sql"
MANIFEST_TMP="$WORK_DIR/manifest.json"
TYPE_TEST_TMP="$WORK_DIR/database-preactivation-baseline-contract.test.ts"

cleanup() {
  rm -rf "$WORK_DIR"
}
trap cleanup EXIT

mkdir -p "$EVIDENCE_ROOT/manifests" "$EVIDENCE_ROOT/logs"

if [[ "$(git rev-parse HEAD)" != "$SOURCE_HEAD" ]]; then
  echo "Expected SOURCE_HEAD $SOURCE_HEAD, got $(git rev-parse HEAD)." >&2
  exit 1
fi

git fetch --no-tags origin main "$TARGET_BRANCH"
if [[ "$(git rev-parse origin/main)" != "$SOURCE_MAIN" ]]; then
  echo "Live main drifted from SOURCE_MAIN." >&2
  exit 1
fi
if ! git merge-base --is-ancestor "$SOURCE_MAIN" "$SOURCE_HEAD"; then
  echo "SOURCE_MAIN is not an ancestor of SOURCE_HEAD." >&2
  exit 1
fi
if [[ "$(git rev-parse "origin/$TARGET_BRANCH")" != "$SOURCE_HEAD" ]]; then
  echo "The published target branch drifted before generation." >&2
  exit 1
fi
if [[ -n "$(git status --porcelain)" ]]; then
  echo "Generation checkout is not clean." >&2
  exit 1
fi

case "$PROD_SUPABASE_DB_URL" in
  *"$PROD_POOLER_HOST"*"$PROD_POOLER_USER"*) ;;
  *)
    echo "The configured production database URL does not match the pinned read-only source identity." >&2
    exit 1
    ;;
esac

export PGOPTIONS="-c default_transaction_read_only=on -c statement_timeout=120000 -c lock_timeout=5000"

psql "$PROD_SUPABASE_DB_URL" -X -v ON_ERROR_STOP=1 -Atqc \
  "select current_setting('transaction_read_only'), current_user, current_database()" \
  > "$EVIDENCE_ROOT/manifests/source-session.txt"
if ! grep -qx $'on\tpostgres\tpostgres' "$EVIDENCE_ROOT/manifests/source-session.txt"; then
  echo "The source session is not the expected read-only production database session." >&2
  exit 1
fi

psql "$PROD_SUPABASE_DB_URL" -X -v ON_ERROR_STOP=1 -Atqc "
select json_build_object(
  'auth_users', (select count(*) from auth.users),
  'profiles', case when to_regclass('public.profiles') is null then null else (select count(*) from public.profiles) end,
  'activation_stage_present', exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'profiles' and column_name = 'activation_stage'
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

if jq -e '.activation_stage_present == true' "$EVIDENCE_ROOT/manifests/source-counts.json" >/dev/null; then
  echo "Production already contains activation_stage; it is no longer a pre-activation source." >&2
  exit 1
fi

psql "$PROD_SUPABASE_DB_URL" -X -v ON_ERROR_STOP=1 -f "$CATALOG_SQL" \
  > "$SOURCE_CATALOG"
LC_ALL=C sort -u "$SOURCE_CATALOG" > "$SOURCE_CATALOG_NORMALIZED"
if [[ ! -s "$SOURCE_CATALOG_NORMALIZED" ]]; then
  echo "The production application catalog is empty." >&2
  exit 1
fi

psql "$PROD_SUPABASE_DB_URL" -X -v ON_ERROR_STOP=1 -AtF $'\t' -c "
select version, name
from supabase_migrations.schema_migrations
order by version, name;
" > "$MIGRATION_HISTORY"
if [[ ! -s "$MIGRATION_HISTORY" ]]; then
  echo "The production migration history is empty." >&2
  exit 1
fi

psql "$PROD_SUPABASE_DB_URL" -X -v ON_ERROR_STOP=1 -Atqc "
select format(
  'create extension if not exists %I with schema %I;',
  e.extname,
  n.nspname
)
from pg_extension e
join pg_namespace n on n.oid = e.extnamespace
where e.extname not in ('plpgsql')
order by e.extname;
" > "$EXTENSIONS"

if ! command -v pg_dump >/dev/null 2>&1; then
  echo "pg_dump is required." >&2
  exit 1
fi

pg_dump "$PROD_SUPABASE_DB_URL" \
  --schema-only \
  --no-owner \
  --no-comments \
  --no-security-labels \
  --no-publications \
  --no-subscriptions \
  --schema=public \
  --schema=moral_trade_private \
  > "$DUMP_RAW"

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
    if line.startswith("--"):
        continue
    if line.startswith("\\"):
        continue
    if line.startswith("SET "):
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
    if line.startswith("CREATE SCHEMA public;"):
        output.extend([
            "create schema if not exists public;",
            "",
        ])
        continue
    if line.startswith("CREATE SCHEMA moral_trade_private;"):
        output.extend([
            "create schema if not exists moral_trade_private;",
            "",
        ])
        continue
    output.append(line)

normalized = "\n".join(output).strip() + "\n"
for forbidden in (
    "COPY public.",
    "COPY moral_trade_private.",
    "INSERT INTO public.",
    "INSERT INTO moral_trade_private.",
    "CREATE DATABASE",
    "ALTER DATABASE",
):
    if forbidden in normalized:
        raise SystemExit(f"Forbidden baseline content: {forbidden}")
Path(sys.argv[2]).write_text(normalized)
PY

cat > "$BASELINE_TMP" <<'SQL'
-- Moral Trade authoritative pre-activation Supabase application-schema baseline.
--
-- This file is generated from the production application catalog under an enforced
-- read-only session. It is data-free and is valid only for an empty Supabase database.
-- It intentionally precedes 20260814042516_account_activation_stage.sql.
-- Do not edit by hand; regenerate through generate-preactivation-baseline.yml.

\set ON_ERROR_STOP on

begin;

set local lock_timeout = '5s';
set local statement_timeout = '10min';

DO $baseline_guard$
DECLARE
  application_relation_count integer;
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

  IF application_relation_count <> 0 THEN
    RAISE EXCEPTION
      USING
        ERRCODE = 'object_not_in_prerequisite_state',
        MESSAGE = format(
          'Pre-activation baseline requires an empty application schema; found %s application relations.',
          application_relation_count
        );
  END IF;
END;
$baseline_guard$;
SQL

cat "$EXTENSIONS" >> "$BASELINE_TMP"
printf '\n' >> "$BASELINE_TMP"
cat "$DUMP_NORMALIZED" >> "$BASELINE_TMP"
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
    echo "Generated baseline contains forbidden content: $forbidden" >&2
    exit 1
  fi
done

if grep -Eiq \
    '(^|[^A-Za-z0-9_])(eyJ[A-Za-z0-9_-]{20,}|postgres(ql)?://|sk_(live|test)_[A-Za-z0-9]+|whsec_[A-Za-z0-9]+|re_[A-Za-z0-9]{20,})([^A-Za-z0-9_]|$)' \
    "$BASELINE_TMP"; then
  echo "Generated baseline contains credential-shaped text." >&2
  exit 1
fi

python3 - \
  "$SOURCE_HEAD" \
  "$SOURCE_MAIN" \
  "$BASELINE_TMP" \
  "$SOURCE_CATALOG_NORMALIZED" \
  "$MIGRATION_HISTORY" \
  "$MANIFEST_TMP" <<'PY'
from hashlib import sha256
from pathlib import Path
import json
import sys

source_head, source_main, baseline_path, catalog_path, history_path, manifest_path = sys.argv[1:]

def digest(path: str) -> str:
    return sha256(Path(path).read_bytes()).hexdigest()

history_lines = [line for line in Path(history_path).read_text().splitlines() if line]
catalog_lines = [line for line in Path(catalog_path).read_text().splitlines() if line]
manifest = {
    "format_version": 1,
    "boundary": "pre_activation",
    "source": {
        "repository": "ghuser29384/Website2",
        "source_head": source_head,
        "source_main": source_main,
        "production_project_ref": "jnpoxvalyjtdghnperyu",
        "production_access": "schema-only; enforced read-only transaction",
    },
    "scope": {
        "schemas": ["public", "moral_trade_private"],
        "cross_schema_objects": ["application-owned triggers on auth.users"],
        "excludes": [
            "table data",
            "Auth user data",
            "Supabase-managed schema internals",
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
    },
    "counts": {
        "catalog_rows": len(catalog_lines),
        "migration_history_rows": len(history_lines),
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
  boundary: string;
  cutover: { next_migration: string; legacy_migrations_replayed_after_baseline: string[] };
  files: Record<string, string>;
  scope: { excludes: string[] };
};

function digest(path: string) {
  return createHash("sha256").update(readFileSync(path)).digest("hex");
}

test("pre-activation baseline manifest binds every authoritative artifact", () => {
  assert.equal(manifest.boundary, "pre_activation");
  assert.equal(
    manifest.cutover.next_migration,
    "20260814042516_account_activation_stage.sql",
  );
  assert.deepEqual(manifest.cutover.legacy_migrations_replayed_after_baseline, []);
  for (const [name, expected] of Object.entries(manifest.files)) {
    assert.equal(digest(`${root}/${name}`), expected, name);
  }
});

test("pre-activation baseline is data-free, guarded, and activation-free", () => {
  const sql = readFileSync(`${root}/schema.sql`, "utf8");
  assert.match(sql, /Pre-activation baseline requires an empty application schema/);
  assert.doesNotMatch(sql, /COPY (?:public|moral_trade_private)\./);
  assert.doesNotMatch(sql, /INSERT INTO (?:public|moral_trade_private)\./);
  assert.doesNotMatch(sql, /activation_stage/);
  assert.doesNotMatch(sql, /complete_(?:walkthrough|profile)_activation_v1/);
  assert.doesNotMatch(sql, /postgres(?:ql)?:\/\//);
  assert.doesNotMatch(sql, /eyJ[A-Za-z0-9_-]{20,}/);
  assert.ok(manifest.scope.excludes.includes("table data"));
  assert.ok(manifest.scope.excludes.includes("Auth user data"));
});
TS

mkdir -p "$BASELINE_DIR"
install -m 0644 "$BASELINE_TMP" "$BASELINE_DIR/schema.sql"
install -m 0644 "$SOURCE_CATALOG_NORMALIZED" "$BASELINE_DIR/source_catalog.tsv"
install -m 0644 "$MIGRATION_HISTORY" "$BASELINE_DIR/source_migration_history.tsv"
install -m 0644 "$MANIFEST_TMP" "$BASELINE_DIR/manifest.json"
install -m 0644 "$TYPE_TEST_TMP" "$ROOT/src/lib/database-preactivation-baseline-contract.test.ts"

cp "$EVIDENCE_ROOT/manifests/source-session.txt" "$EVIDENCE_ROOT/manifests/"
cp "$EVIDENCE_ROOT/manifests/source-counts.json" "$EVIDENCE_ROOT/manifests/"
cp "$SOURCE_CATALOG_NORMALIZED" "$EVIDENCE_ROOT/manifests/source-catalog.tsv"
cp "$MIGRATION_HISTORY" "$EVIDENCE_ROOT/manifests/source-migration-history.tsv"
cp "$MANIFEST_TMP" "$EVIDENCE_ROOT/manifests/manifest.json"
printf 'schema_sha256=%s\n' "$(sha256sum "$BASELINE_DIR/schema.sql" | awk '{print $1}')" \
  > "$EVIDENCE_ROOT/manifests/generated-files.txt"
printf 'catalog_sha256=%s\n' "$(sha256sum "$BASELINE_DIR/source_catalog.tsv" | awk '{print $1}')" \
  >> "$EVIDENCE_ROOT/manifests/generated-files.txt"
printf 'migration_history_sha256=%s\n' "$(sha256sum "$BASELINE_DIR/source_migration_history.tsv" | awk '{print $1}')" \
  >> "$EVIDENCE_ROOT/manifests/generated-files.txt"
printf 'manifest_sha256=%s\n' "$(sha256sum "$BASELINE_DIR/manifest.json" | awk '{print $1}')" \
  >> "$EVIDENCE_ROOT/manifests/generated-files.txt"

node --import tsx --test "$ROOT/src/lib/database-preactivation-baseline-contract.test.ts" \
  2>&1 | tee "$EVIDENCE_ROOT/logs/source-contract.log"
git diff --check

printf 'source_head=%s\nsource_main=%s\n' "$SOURCE_HEAD" "$SOURCE_MAIN" \
  > "$EVIDENCE_ROOT/manifests/git-source.txt"
