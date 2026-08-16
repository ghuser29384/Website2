#!/usr/bin/env bash
set -euo pipefail

: "${EXPECTED_PRODUCT_HEAD:?}"
: "${TARGET_BRANCH:?}"
: "${CANDIDATE_DIR:?}"
: "${EVIDENCE_DIR:?}"
: "${PROD_SUPABASE_DB_URL:?}"
: "${QA_SUPABASE_DB_URL:?}"
: "${PROD_POOLER_HOST:?}"
: "${PROD_POOLER_USER:?}"
: "${QA_POOLER_HOST:?}"
: "${QA_POOLER_USER:?}"

BASELINE_VERSION="${BASELINE_VERSION:-20260816180000}"
METADATA_VERSION="${METADATA_VERSION:-20260816180100}"
BASELINE_NAME="canonical_schema_baseline"

umask 077
mkdir -p "$EVIDENCE_DIR"/{logs,manifests,raw}
TRANSCRIPT="$EVIDENCE_DIR/command-transcript.txt"
exec > >(tee -a "$TRANSCRIPT") 2>&1

note() { printf '\n===== %s =====\n' "$*"; }
fail() { printf 'FAIL: %s\n' "$*" >&2; exit 1; }

note "Exact target branch preflight"
cd "$CANDIDATE_DIR"
actual_head="$(git rev-parse HEAD)"
actual_branch="$(git symbolic-ref --short HEAD)"
test "$actual_head" = "$EXPECTED_PRODUCT_HEAD"
test "$actual_branch" = "$TARGET_BRANCH"
test -z "$(git status --porcelain)"
printf 'starting_head=%s\ntarget_branch=%s\ntree=%s\n' \
  "$actual_head" "$actual_branch" "$(git rev-parse HEAD^{tree})" \
  | tee "$EVIDENCE_DIR/manifests/git-start.txt"

note "Validate exact read-only long-lived database targets"
echo "::add-mask::$PROD_SUPABASE_DB_URL"
echo "::add-mask::$QA_SUPABASE_DB_URL"
python3 - <<'PY'
import os
from urllib.parse import parse_qs, unquote, urlparse

def check(name: str, expected_host: str, expected_user: str) -> None:
    parsed = urlparse(os.environ[name])
    modes = parse_qs(parsed.query).get("sslmode", ["require"])
    valid = (
        parsed.scheme in {"postgres", "postgresql"}
        and unquote(parsed.username or "") == expected_user
        and parsed.hostname == expected_host
        and parsed.port == 5432
        and parsed.path == "/postgres"
        and modes == ["require"]
        and bool(parsed.password)
    )
    if not valid:
        raise SystemExit(f"Refusing unexpected database target: {name}")

check("PROD_SUPABASE_DB_URL", os.environ["PROD_POOLER_HOST"], os.environ["PROD_POOLER_USER"])
check("QA_SUPABASE_DB_URL", os.environ["QA_POOLER_HOST"], os.environ["QA_POOLER_USER"])
PY

export PGCONNECT_TIMEOUT=15
export PGSSLMODE=require
export PGOPTIONS='-c default_transaction_read_only=on -c statement_timeout=180000 -c lock_timeout=5000'

note "Toolchain"
{
  uname -a
  cat /etc/os-release
  docker version
  node --version
  npm --version
  git --version
} | tee "$EVIDENCE_DIR/toolchain.txt"

docker pull postgres:17.6-alpine > "$EVIDENCE_DIR/logs/docker-pull-postgres.log"
docker image inspect postgres:17.6-alpine \
  --format '{{.Id}} {{index .RepoDigests 0}}' \
  | tee "$EVIDENCE_DIR/manifests/postgres-client-image.txt"

psql_readonly() {
  local url="$1"
  shift
  docker run --rm \
    -e "DATABASE_URL=$url" \
    -e PGCONNECT_TIMEOUT \
    -e PGSSLMODE \
    -e PGOPTIONS \
    postgres:17.6-alpine \
    sh -eu -c 'psql "$DATABASE_URL" -X -v ON_ERROR_STOP=1 "$@"' sh "$@"
}

note "Record production and QA migration-version union"
psql_readonly "$PROD_SUPABASE_DB_URL" -Atq -c \
  "begin read only; select version from supabase_migrations.schema_migrations order by version; commit;" \
  | sed '/^[[:space:]]*$/d' > "$EVIDENCE_DIR/manifests/prod-migration-versions.txt"
psql_readonly "$QA_SUPABASE_DB_URL" -Atq -c \
  "begin read only; select version from supabase_migrations.schema_migrations order by version; commit;" \
  | sed '/^[[:space:]]*$/d' > "$EVIDENCE_DIR/manifests/qa-migration-versions.txt"
cat "$EVIDENCE_DIR/manifests/prod-migration-versions.txt" \
    "$EVIDENCE_DIR/manifests/qa-migration-versions.txt" \
  | sort -u > "$EVIDENCE_DIR/manifests/legacy-version-union.txt"
python3 - "$EVIDENCE_DIR/manifests/legacy-version-union.txt" "$BASELINE_VERSION" "$METADATA_VERSION" <<'PY'
from pathlib import Path
import re, sys
p=Path(sys.argv[1]); baseline=sys.argv[2]; metadata=sys.argv[3]
versions=[x.strip() for x in p.read_text().splitlines() if x.strip()]
invalid=[v for v in versions if not re.fullmatch(r"\d{14}",v)]
if invalid:
    raise SystemExit(f"Non-14-digit long-lived migration versions: {invalid}")
if len(versions)!=len(set(versions)):
    raise SystemExit("Duplicate union versions after sort -u")
if any(v >= baseline for v in versions):
    raise SystemExit("Baseline version is not later than every long-lived version")
if not re.fullmatch(r"\d{14}", baseline) or not re.fullmatch(r"\d{14}", metadata) or metadata <= baseline:
    raise SystemExit("Invalid baseline/metadata versions")
print(f"legacy_version_count={len(versions)}")
PY

note "Read-only production schema dump"
raw_dump="$EVIDENCE_DIR/raw/production-public-private-schema.sql"
docker run --rm \
  -e "DATABASE_URL=$PROD_SUPABASE_DB_URL" \
  -e PGCONNECT_TIMEOUT \
  -e PGSSLMODE \
  -e PGOPTIONS \
  -v "$EVIDENCE_DIR/raw:/out" \
  postgres:17.6-alpine \
  sh -eu -c 'pg_dump "$DATABASE_URL" --schema-only --no-owner --schema=public --schema=moral_trade_private --file=/out/production-public-private-schema.sql'
test -s "$raw_dump"

note "Read-only production catalog fingerprint"
psql_readonly "$PROD_SUPABASE_DB_URL" -Atq > "$EVIDENCE_DIR/manifests/production-catalog-fingerprint.json" <<'SQL'
begin read only;
with
relation_rows as (
  select n.nspname, c.relname, c.relkind, c.relrowsecurity, c.relforcerowsecurity
  from pg_class c join pg_namespace n on n.oid=c.relnamespace
  where n.nspname in ('public','moral_trade_private')
),
function_rows as (
  select n.nspname, p.proname, pg_get_function_identity_arguments(p.oid) as args,
         p.prosecdef, p.provolatile, pg_get_functiondef(p.oid) as definition
  from pg_proc p join pg_namespace n on n.oid=p.pronamespace
  where n.nspname in ('public','moral_trade_private')
),
policy_rows as (
  select schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
  from pg_policies where schemaname in ('public','moral_trade_private')
),
index_rows as (
  select schemaname, tablename, indexname, indexdef
  from pg_indexes where schemaname in ('public','moral_trade_private')
)
select jsonb_pretty(jsonb_build_object(
  'server_version', version(),
  'relations', jsonb_build_object(
    'count',(select count(*) from relation_rows),
    'md5',(select md5(coalesce(string_agg(row_to_json(r)::text,E'\n' order by nspname,relname,relkind),'')) from relation_rows r)
  ),
  'functions', jsonb_build_object(
    'count',(select count(*) from function_rows),
    'md5',(select md5(coalesce(string_agg(row_to_json(f)::text,E'\n' order by nspname,proname,args),'')) from function_rows f)
  ),
  'policies', jsonb_build_object(
    'count',(select count(*) from policy_rows),
    'md5',(select md5(coalesce(string_agg(row_to_json(p)::text,E'\n' order by schemaname,tablename,policyname),'')) from policy_rows p)
  ),
  'indexes', jsonb_build_object(
    'count',(select count(*) from index_rows),
    'md5',(select md5(coalesce(string_agg(row_to_json(i)::text,E'\n' order by schemaname,tablename,indexname),'')) from index_rows i)
  )
));
commit;
SQL

note "Generate fail-closed pool gate defaults"
psql_readonly "$PROD_SUPABASE_DB_URL" -Atq > "$EVIDENCE_DIR/raw/pool-gate-defaults.sql" <<'SQL'
begin read only;
do $$
begin
  if exists (
    select 1 from public.trade_donation_pool_gate_status
    where status not in ('blocked','pending')
       or coalesce(accountable_owner_name,'') <> ''
       or coalesce(accountable_owner_role,'') <> ''
       or coalesce(accountable_owner_email,'') <> ''
       or approved_by is not null or approved_at is not null
       or coalesce(evidence_url,'') <> ''
       or coalesce(evidence_sha256,'') <> ''
       or evidence_recorded_at is not null
  ) then
    raise exception 'Production pool gate rows are not safe baseline defaults';
  end if;
end $$;
select format(
  'insert into public.trade_donation_pool_gate_status (environment,gate_key,status,notes,approved_by,approved_at,updated_at,accountable_owner_name,accountable_owner_role,accountable_owner_email,evidence_url,evidence_sha256,evidence_recorded_at) values (%L,%L,%L,%L,null,null,timezone(''utc'',now()),'''','''','''','''','''',null) on conflict (environment,gate_key) do nothing;',
  environment, gate_key, status, notes
)
from public.trade_donation_pool_gate_status
order by environment, gate_key;
commit;
SQL

note "Generate non-personal registered-charity seed"
psql_readonly "$PROD_SUPABASE_DB_URL" -Atq > "$EVIDENCE_DIR/raw/registered-charities-seed.sql" <<'SQL'
begin read only;
select format(
  'insert into public.registered_charities (id,name,cause_area,website_url,summary,is_active,is_political_campaign,selectable,is_moral_public_good,consensus_label,sort_order) values (%L,%L,%L,%L,%L,%L,%L,%L,%L,%L,%s) on conflict (id) do update set name=excluded.name,cause_area=excluded.cause_area,website_url=excluded.website_url,summary=excluded.summary,is_active=excluded.is_active,is_political_campaign=excluded.is_political_campaign,selectable=excluded.selectable,is_moral_public_good=excluded.is_moral_public_good,consensus_label=excluded.consensus_label,sort_order=excluded.sort_order;',
  id,name,cause_area,website_url,summary,is_active,is_political_campaign,selectable,is_moral_public_good,consensus_label,sort_order
)
from public.registered_charities
order by sort_order,id;
commit;
SQL

note "Archive legacy migration SQL"
test -d supabase/migrations
test ! -e supabase/legacy_migrations
git mv supabase/migrations supabase/legacy_migrations
mkdir -p supabase/migrations supabase/baseline

python3 - <<'PY'
from pathlib import Path
import hashlib, json, re, subprocess
root=Path('supabase/legacy_migrations')
rows=[]
for p in sorted(root.iterdir()):
    if not p.is_file(): continue
    data=p.read_bytes()
    m=re.match(r'^(\d+)_',p.name)
    rows.append({
        'name':p.name,
        'version_prefix':m.group(1) if m else None,
        'sha256':hashlib.sha256(data).hexdigest(),
        'bytes':len(data),
    })
Path('supabase/baseline/legacy-migration-manifest.json').write_text(json.dumps(rows,indent=2,sort_keys=True)+'\n')
PY

note "Create one no-op active history marker per long-lived version"
while IFS= read -r version; do
  [[ -n "$version" ]] || continue
  cat > "supabase/migrations/${version}_legacy_history_marker.sql" <<SQL
-- Legacy history marker for version ${version}.
-- The original SQL is preserved under supabase/legacy_migrations/.
-- This marker is intentionally schema- and data-neutral. Existing databases already
-- record the version; clean databases record it before applying the canonical baseline.
do \$legacy_history_marker\$
begin
  null;
end
\$legacy_history_marker\$;
SQL
done < "$EVIDENCE_DIR/manifests/legacy-version-union.txt"

note "Normalize production dump into guarded canonical baseline"
baseline_file="supabase/migrations/${BASELINE_VERSION}_${BASELINE_NAME}.sql"
python3 - "$raw_dump" "$baseline_file" "$EXPECTED_PRODUCT_HEAD" "$BASELINE_VERSION" <<'PY'
from pathlib import Path
import re, sys
src=Path(sys.argv[1]); dst=Path(sys.argv[2]); product=sys.argv[3]; version=sys.argv[4]
text=src.read_text(encoding='utf-8')
# psql-only pg_dump guard lines are not valid migration SQL.
text='\n'.join(line for line in text.splitlines() if not line.startswith('\\'))+'\n'
text=text.replace('CREATE SCHEMA public;', 'CREATE SCHEMA IF NOT EXISTS public;')
text=text.replace('CREATE SCHEMA "public";', 'CREATE SCHEMA IF NOT EXISTS public;')
text=text.replace('CREATE SCHEMA moral_trade_private;', 'CREATE SCHEMA IF NOT EXISTS moral_trade_private;')
text=text.replace('CREATE SCHEMA "moral_trade_private";', 'CREATE SCHEMA IF NOT EXISTS moral_trade_private;')
if re.search(r'(?i)([A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,})',text):
    raise SystemExit('Email-like material appears in schema-only dump')
if re.search(r'(?i)\bEllen\b',text):
    raise SystemExit('Named-human material appears in schema-only dump')
for forbidden in [
    r'(?i)insert\s+into\s+(?:public\.)?offers',
    r'(?i)copy\s+(?:public\.)?offers',
    r'(?i)insert\s+into\s+auth\.users',
    r'(?i)copy\s+auth\.users',
]:
    if re.search(forbidden,text):
        raise SystemExit(f'Forbidden data-bearing statement in schema dump: {forbidden}')
header=f'''-- Canonical Moral Trade schema baseline.\n-- Generated from the read-only production catalog for product head {product}.\n-- Version: {version}.\n-- This migration is for genuinely empty databases only. Existing databases must use\n-- the separately approved catalog-verification and history-adoption procedure.\n\ndo $canonical_baseline_empty_guard$\nbegin\n  if to_regclass('public.profiles') is not null\n     or to_regclass('public.offers') is not null\n     or exists (select 1 from pg_namespace where nspname = 'moral_trade_private') then\n    raise exception using\n      errcode = 'P0001',\n      message = 'Canonical baseline refuses a non-empty database. Run the read-only adoption verifier; do not apply this migration directly.';\n  end if;\nend\n$canonical_baseline_empty_guard$;\n\ncreate schema if not exists extensions;\ncreate extension if not exists pgcrypto with schema extensions;\ncreate extension if not exists \"uuid-ossp\" with schema extensions;\ncreate extension if not exists pg_trgm with schema extensions;\ncreate extension if not exists supabase_vault with schema vault;\ncreate extension if not exists pg_stat_statements with schema extensions;\n\n'''
dst.write_text(header+text,encoding='utf-8')
PY
cat "$EVIDENCE_DIR/raw/pool-gate-defaults.sql" >> "$baseline_file"

cat > "supabase/migrations/${METADATA_VERSION}_canonical_schema_baseline_metadata.sql" <<SQL
-- Forward-safe metadata for both clean installations and catalog-verified legacy adoption.
create schema if not exists moral_trade_private;
create table if not exists moral_trade_private.schema_baseline_metadata (
  baseline_version text primary key,
  product_head text not null,
  source_environment text not null,
  adopted_at timestamptz not null default timezone('utc', now()),
  adoption_mode text not null check (adoption_mode in ('clean_reconstruction','catalog_verified_legacy'))
);

insert into moral_trade_private.schema_baseline_metadata (
  baseline_version, product_head, source_environment, adoption_mode
)
values (
  '${BASELINE_VERSION}',
  '${EXPECTED_PRODUCT_HEAD}',
  'production_catalog',
  case when current_setting('moral_trade.baseline_adoption_mode', true) = 'catalog_verified_legacy'
       then 'catalog_verified_legacy'
       else 'clean_reconstruction' end
)
on conflict (baseline_version) do nothing;

revoke all on schema moral_trade_private from public, anon, authenticated;
revoke all on table moral_trade_private.schema_baseline_metadata from public, anon, authenticated;
grant usage on schema moral_trade_private to service_role;
grant select on table moral_trade_private.schema_baseline_metadata to service_role;
SQL

note "Create deterministic non-personal seed"
cat > supabase/seed.sql <<'SQL'
-- Canonical non-personal reference seed.
-- User profiles, offers, funded pools, payments, provider events, and operator-owned
-- publication records are deliberately excluded.
SQL
cat "$EVIDENCE_DIR/raw/registered-charities-seed.sql" >> supabase/seed.sql

note "Generate and pin local Supabase config"
rm -f supabase/config.toml
npx --yes supabase@2.110.0 init --force > "$EVIDENCE_DIR/logs/supabase-init.log" 2>&1
python3 - <<'PY'
from pathlib import Path
p=Path('supabase/config.toml')
text=p.read_text()
text=text.replace('project_id = "', 'project_id = "moraltrade-canonical-baseline-') if False else text
# Pin the local PostgreSQL major version while preserving the CLI-generated config.
text=text.replace('major_version = 15','major_version = 17')
text=text.replace('major_version = 17','major_version = 17')
p.write_text(text)
PY

note "Persist production fingerprint and recovery documentation"
cp "$EVIDENCE_DIR/manifests/production-catalog-fingerprint.json" \
  supabase/baseline/production-catalog-fingerprint.json
cp "$EVIDENCE_DIR/manifests/legacy-version-union.txt" \
  supabase/baseline/long-lived-migration-version-union.txt

mkdir -p docs/database scripts
cat > docs/database/canonical-supabase-baseline.md <<DOC
# Canonical Supabase baseline

## Source of truth

The active baseline is generated from a read-only schema-only dump of the deployed
Moral Trade production database and is bound to product head
\`${EXPECTED_PRODUCT_HEAD}\`.

Production is the canonical runtime schema. Permanent QA is not a baseline source:
its catalog and migration history contain additional QA-only and experimental objects.

## Clean reconstruction

Use Supabase CLI 2.110.0 and PostgreSQL 17:

\`\`\`bash
npx supabase@2.110.0 stop --no-backup
npx supabase@2.110.0 start
npx supabase@2.110.0 db reset --local --no-seed
npx supabase@2.110.0 test db
npx supabase@2.110.0 db lint --local --level error
\`\`\`

The active migration directory contains one no-op marker for every version observed in
production or permanent QA, followed by the canonical schema baseline and its metadata
migration. Original SQL is preserved under \`supabase/legacy_migrations/\` but is not
executed by the CLI.

## Existing environments

The baseline deliberately raises an exception on a non-empty database. Do not run
\`db push\`, \`migration repair\`, or apply the baseline to a long-lived environment
until all of the following are separately approved:

1. run the read-only catalog verifier;
2. compare the normalized catalog with the committed production fingerprint;
3. reconcile every material difference;
4. mark the baseline version represented through the approved history-adoption process;
5. apply only the forward-safe metadata migration and no-op history markers.

Permanent QA currently diverges materially and is not approved for adoption.

## Data boundary

Canonical reconstruction excludes all profiles, offers, funded pools, payments,
provider events, and named-human operator publication. \`supabase/seed.sql\` contains
only non-personal registered-charity reference rows. Pooled-settlement gate rows are
created in blocked or pending states by the baseline itself so \`--no-seed\` remains
fail-closed.
DOC

cat > supabase/legacy_migrations/README.md <<'DOC'
# Archived legacy migrations

These files are immutable historical evidence. They are not an executable migration
chain: the collection contains duplicate version prefixes, dependency-order failures,
QA resets, data publication, and environment-specific operations. Do not move them
back into `supabase/migrations`, rename them, or apply them to a database.

The active migration directory contains schema-neutral history markers for versions
observed in the long-lived production/QA histories and a uniquely versioned canonical
baseline for clean reconstruction.
DOC

cat > supabase/migrations/README.md <<'DOC'
# Active canonical migration chain

Only files in this directory are executable by the Supabase CLI.

- `*_legacy_history_marker.sql` files are intentional no-ops preserving version
  compatibility with long-lived environments.
- `20260816180000_canonical_schema_baseline.sql` reconstructs a genuinely empty
  database and refuses a non-empty database.
- `20260816180100_canonical_schema_baseline_metadata.sql` records baseline identity.

Never add a duplicate or non-14-digit version. Never place personal/operator data in
this directory. Historical SQL belongs in `supabase/legacy_migrations/`.
DOC

cat > scripts/check-canonical-baseline-adoption.sql <<'SQL'
\set ON_ERROR_STOP on
begin read only;
select jsonb_pretty(jsonb_build_object(
  'server_version', version(),
  'transaction_read_only', current_setting('transaction_read_only'),
  'profiles_exists', to_regclass('public.profiles') is not null,
  'offers_exists', to_regclass('public.offers') is not null,
  'pool_obligations_exists', to_regclass('public.trade_donation_pool_obligations') is not null,
  'baseline_metadata_exists', to_regclass('moral_trade_private.schema_baseline_metadata') is not null,
  'migration_baseline_recorded', exists(
    select 1 from supabase_migrations.schema_migrations where version='20260816180000'
  )
));
rollback;
SQL

note "Add source-contract and SQL catalog tests"
cat > src/lib/database-baseline-source-contract.test.ts <<'TS'
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const migrationsDir = join(process.cwd(), "supabase", "migrations");
const legacyDir = join(process.cwd(), "supabase", "legacy_migrations");
const activeSql = readdirSync(migrationsDir).filter((name) => name.endsWith(".sql")).sort();

function versionOf(name: string): string {
  const match = /^(\d{14})_/.exec(name);
  assert.ok(match, `active migration must use a 14-digit version: ${name}`);
  return match[1];
}

test("active migration versions are unique, canonical, and history-compatible", () => {
  const versions = activeSql.map(versionOf);
  assert.equal(new Set(versions).size, versions.length);
  assert.ok(activeSql.includes("20260816180000_canonical_schema_baseline.sql"));
  assert.ok(activeSql.includes("20260816180100_canonical_schema_baseline_metadata.sql"));
  assert.ok(activeSql.every((name) =>
    name.endsWith("_legacy_history_marker.sql") ||
    name === "20260816180000_canonical_schema_baseline.sql" ||
    name === "20260816180100_canonical_schema_baseline_metadata.sql"
  ));
});

test("legacy markers are schema- and data-neutral", () => {
  for (const name of activeSql.filter((value) => value.endsWith("_legacy_history_marker.sql"))) {
    const sql = readFileSync(join(migrationsDir, name), "utf8");
    assert.match(sql, /do \$legacy_history_marker\$/i);
    assert.doesNotMatch(sql, /\b(create|alter|drop|insert|update|delete|truncate|grant|revoke|copy)\b/i);
  }
});

test("canonical baseline is empty-only, non-personal, and fail-closed", () => {
  const sql = readFileSync(join(migrationsDir, "20260816180000_canonical_schema_baseline.sql"), "utf8");
  assert.match(sql, /Canonical baseline refuses a non-empty database/i);
  assert.match(sql, /trade_donation_pool_gate_status/i);
  assert.doesNotMatch(sql, /\bEllen\b/i);
  assert.doesNotMatch(sql, /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
  assert.doesNotMatch(sql, /insert\s+into\s+(?:public\.)?offers/i);
  assert.doesNotMatch(sql, /insert\s+into\s+auth\.users/i);
});

test("named-human and transactional data stay out of the canonical seed", () => {
  const seed = readFileSync(join(process.cwd(), "supabase", "seed.sql"), "utf8");
  assert.match(seed, /registered_charities/i);
  assert.doesNotMatch(seed, /\bEllen\b/i);
  assert.doesNotMatch(seed, /insert\s+into\s+(?:public\.)?(profiles|offers|financial_commitment_pools|trade_donation_pool_obligations|trade_donation_pool_bundles)/i);
});

test("archived SQL is outside the active chain", () => {
  const legacySql = readdirSync(legacyDir).filter((name) => name.endsWith(".sql"));
  assert.ok(legacySql.length > 100);
  assert.ok(!activeSql.some((name) => legacySql.includes(name)));
});
TS

cat > supabase/tests/canonical_baseline_pool_security.sql <<'SQL'
begin;
create extension if not exists pgtap with schema extensions;
select plan(18);

select has_table('public','trade_donation_pool_gate_status');
select has_table('public','trade_donation_pool_obligations');
select has_table('public','trade_donation_pool_bundles');
select has_table('public','trade_donation_pool_bundle_items');
select has_table('public','trade_donation_pool_ledger_journals');
select has_table('public','trade_donation_pool_ledger_lines');
select has_table('public','trade_donation_pool_stripe_events');
select has_table('public','trade_donation_pool_audit_events');

select ok((select relrowsecurity from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relname='trade_donation_pool_obligations'),'obligations RLS enabled');
select ok((select relrowsecurity from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relname='trade_donation_pool_bundles'),'bundles RLS enabled');
select ok((select relrowsecurity from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relname='trade_donation_pool_bundle_items'),'bundle items RLS enabled');
select ok((select relrowsecurity from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relname='trade_donation_pool_ledger_journals'),'journals RLS enabled');
select ok((select relrowsecurity from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relname='trade_donation_pool_ledger_lines'),'lines RLS enabled');
select ok((select relrowsecurity from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relname='trade_donation_pool_stripe_events'),'Stripe events RLS enabled');
select ok((select relrowsecurity from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relname='trade_donation_pool_audit_events'),'audit events RLS enabled');

select ok(not has_table_privilege('anon','public.trade_donation_pool_obligations','INSERT,UPDATE,DELETE,TRUNCATE'),'anon cannot mutate obligations');
select ok(not has_table_privilege('authenticated','public.trade_donation_pool_obligations','INSERT,UPDATE,DELETE,TRUNCATE'),'authenticated cannot mutate obligations');
select is((select count(*)::bigint from public.trade_donation_pool_gate_status where status not in ('blocked','pending')),0::bigint,'all pool gates fail closed');

select * from finish();
rollback;
SQL

note "Run deterministic source checks before commit"
node --import tsx --test src/lib/database-baseline-source-contract.test.ts
npx eslint src/lib/database-baseline-source-contract.test.ts

git diff --check

note "Commit and push generated recovery candidate"
git status --short | tee "$EVIDENCE_DIR/manifests/git-status-before-commit.txt"
git config user.name 'github-actions[bot]'
git config user.email '41898282+github-actions[bot]@users.noreply.github.com'
git add -A
git commit -m 'Restore canonical Supabase database baseline'
resulting_head="$(git rev-parse HEAD)"
git push origin "HEAD:${TARGET_BRANCH}"
printf 'starting_head=%s\nresulting_head=%s\n' "$EXPECTED_PRODUCT_HEAD" "$resulting_head" \
  | tee "$EVIDENCE_DIR/manifests/result.txt"
