#!/usr/bin/env bash
set -euo pipefail

: "${EXPECTED_PRODUCT_HEAD:?}"
: "${PRODUCT_DIR:?}"
: "${SOURCE_EXPORT_DIR:?}"
: "${EVIDENCE_DIR:?}"
: "${SUPABASE_CLI_VERSION:=2.110.0}"

WORK_DIR="$RUNNER_TEMP/pr654-canonical-prototype"
PROJECT_ID="pr654-canonical-prototype"
MIGRATION_VERSION="20260816160000"
SOURCE_ROOT="$SOURCE_EXPORT_DIR/pr654-canonical-baseline-export"

mkdir -p "$EVIDENCE_DIR"/{logs,manifests,pass-a,pass-b,pass-c}
TRANSCRIPT="$EVIDENCE_DIR/command-transcript.txt"
: > "$TRANSCRIPT"
exec > >(tee -a "$TRANSCRIPT") 2>&1

note() { printf '\n===== %s =====\n' "$*"; }
supabase() { (cd "$WORK_DIR" && npx --yes "supabase@${SUPABASE_CLI_VERSION}" "$@"); }

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
  if [[ -d "$WORK_DIR" ]]; then
    supabase stop --no-backup > "$EVIDENCE_DIR/logs/final-stop.log" 2>&1 || true
  fi
  docker ps -a --format '{{.ID}}\t{{.Names}}\t{{.Image}}\t{{.Status}}' \
    | tee "$EVIDENCE_DIR/manifests/docker-after-cleanup.tsv"
  docker volume ls --format '{{.Name}}' \
    | grep -E 'supabase|pr654-canonical-prototype' \
    | tee "$EVIDENCE_DIR/manifests/volumes-after-cleanup.txt" || true
  ss -ltnp 2>/dev/null \
    | grep -E ':(5432[0-9]|8000|8443|3000|4000|5000|6543|55432)\b' \
    | tee "$EVIDENCE_DIR/manifests/listeners-after-cleanup.txt" || true
  rm -rf "$WORK_DIR"
}
trap cleanup EXIT

note "Exact product and source-export preflight"
test "$(git -C "$PRODUCT_DIR" rev-parse HEAD)" = "$EXPECTED_PRODUCT_HEAD"
test -z "$(git -C "$PRODUCT_DIR" symbolic-ref -q --short HEAD || true)"
test -z "$(git -C "$PRODUCT_DIR" status --porcelain)"
for file in \
  "$SOURCE_ROOT/prod/schema-with-privileges.sql" \
  "$SOURCE_ROOT/prod/catalog-manifest.tsv" \
  "$SOURCE_ROOT/prod/extensions.tsv" \
  "$SOURCE_ROOT/prod/trade-donation-pool-gates.sql" \
  "$SOURCE_ROOT/prod/catalog-fingerprint.json"
do
  test -s "$file"
done
printf 'product_head=%s\nproduct_tree=%s\nsource_export_sha256=%s\n' \
  "$(git -C "$PRODUCT_DIR" rev-parse HEAD)" \
  "$(git -C "$PRODUCT_DIR" rev-parse HEAD^{tree})" \
  "$(sha256sum "$SOURCE_ROOT/prod/schema-with-privileges.sql" | awk '{print $1}')" \
  | tee "$EVIDENCE_DIR/manifests/preflight.txt"

note "Toolchain"
{
  uname -a
  cat /etc/os-release
  docker version
  node --version
  npm --version
  git --version
  npx --yes "supabase@${SUPABASE_CLI_VERSION}" --version
} | tee "$EVIDENCE_DIR/toolchain.txt"

note "Initialize disposable canonical Supabase workdir"
rm -rf "$WORK_DIR"
mkdir -p "$WORK_DIR"
(cd "$WORK_DIR" && npx --yes "supabase@${SUPABASE_CLI_VERSION}" init --force)
python3 - "$WORK_DIR/supabase/config.toml" <<'PY'
from pathlib import Path
import re, sys
p=Path(sys.argv[1])
text=p.read_text(encoding='utf-8')
text=re.sub(r'^project_id\s*=.*$', 'project_id = "pr654-canonical-prototype"', text, flags=re.M)
text=re.sub(r'^major_version\s*=\s*\d+\s*$', 'major_version = 17', text, flags=re.M)
p.write_text(text, encoding='utf-8')
PY
mkdir -p "$WORK_DIR/supabase/migrations" "$WORK_DIR/supabase/tests"

note "Generate uniquely versioned production-derived canonical baseline"
python3 - \
  "$SOURCE_ROOT/prod/schema-with-privileges.sql" \
  "$SOURCE_ROOT/prod/extensions.tsv" \
  "$SOURCE_ROOT/prod/trade-donation-pool-gates.sql" \
  "$WORK_DIR/supabase/migrations/${MIGRATION_VERSION}_canonical_schema.sql" <<'PY'
from pathlib import Path
import re, sys
schema_path, extensions_path, gates_path, out_path = map(Path, sys.argv[1:])
schema=schema_path.read_text(encoding='utf-8')
schema=schema.replace('CREATE SCHEMA moral_trade_private;', 'CREATE SCHEMA IF NOT EXISTS moral_trade_private;')
schema=schema.replace('CREATE SCHEMA public;', 'CREATE SCHEMA IF NOT EXISTS public;')
if 'CREATE SCHEMA public;' in schema or 'CREATE SCHEMA moral_trade_private;' in schema:
    raise SystemExit('schema transformation incomplete')
extensions=[]
for raw in extensions_path.read_text(encoding='utf-8').splitlines():
    if not raw.strip():
        continue
    name, namespace, version = raw.split('\t')
    qname='"'+name.replace('"','""')+'"'
    qnamespace='"'+namespace.replace('"','""')+'"'
    extensions.append(f'create schema if not exists {qnamespace};')
    extensions.append(f'create extension if not exists {qname} with schema {qnamespace};')
prelude='''-- Canonical Moral Trade schema baseline.\n-- Generated from the read-only production catalog for PR #654 recovery.\n-- This file contains schema and privilege state only; it excludes user data and\n-- the named-human offer-bank publication. The appended gate rows are non-personal\n-- and deliberately fail closed.\n\n'''
prelude+='\n'.join(dict.fromkeys(extensions))+'\n\n'
prelude+='revoke all on schema public from public;\n\n'
gates=gates_path.read_text(encoding='utf-8').strip()+'\n'
out=prelude+schema.rstrip()+'\n\n-- Essential fail-closed operational configuration.\n'+gates
if re.search(r'(?i)Moral Trade operator|\bEllen\b|[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}', out):
    raise SystemExit('personal or named-operator literal detected in canonical baseline')
Path(out_path).write_text(out, encoding='utf-8')
PY
sha256sum "$WORK_DIR/supabase/migrations/${MIGRATION_VERSION}_canonical_schema.sql" \
  | tee "$EVIDENCE_DIR/manifests/canonical-migration.sha256"
wc -l -c "$WORK_DIR/supabase/migrations/${MIGRATION_VERSION}_canonical_schema.sql" \
  | tee "$EVIDENCE_DIR/manifests/canonical-migration-size.txt"

cat > "$WORK_DIR/supabase/tests/canonical_pool_security.sql" <<'SQL'
begin;
create extension if not exists pgtap with schema extensions;
select plan(12);
select ok((select count(*)=8 from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relkind='r' and c.relname in (
  'trade_donation_pool_gate_status','trade_donation_pool_obligations','trade_donation_pool_bundles','trade_donation_pool_bundle_items','trade_donation_pool_ledger_journals','trade_donation_pool_ledger_lines','trade_donation_pool_stripe_events','trade_donation_pool_audit_events'
)), 'all eight pooled-settlement tables exist');
select ok((select count(*)=8 from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relrowsecurity and c.relname in (
  'trade_donation_pool_gate_status','trade_donation_pool_obligations','trade_donation_pool_bundles','trade_donation_pool_bundle_items','trade_donation_pool_ledger_journals','trade_donation_pool_ledger_lines','trade_donation_pool_stripe_events','trade_donation_pool_audit_events'
)), 'RLS is enabled on all pool tables');
select ok(not has_function_privilege('anon','public.mark_trade_donation_pool_component_stale()','EXECUTE'), 'anon cannot execute stale helper');
select ok(not has_function_privilege('authenticated','public.mark_trade_donation_pool_component_stale()','EXECUTE'), 'authenticated cannot execute stale helper');
select ok(has_function_privilege('service_role','public.mark_trade_donation_pool_component_stale()','EXECUTE'), 'service role can execute stale helper');
select ok(exists(select 1 from pg_trigger t join pg_class c on c.oid=t.tgrelid join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relname='agreements' and t.tgname='mark_trade_donation_pool_component_stale_trigger' and not t.tgisinternal), 'stale trigger remains attached');
select ok(position('pg_advisory_xact_lock' in pg_get_functiondef('moral_trade_private.try_freeze_trade_donation_pool_bundle(text,text,text,text,text)'::regprocedure))>0, 'freeze function uses advisory transaction lock');
select is((select count(*)::bigint from public.trade_donation_pool_gate_status), 11::bigint, 'eleven fail-closed gate rows are present');
select is((select count(*)::bigint from public.trade_donation_pool_gate_status where status='passed'), 0::bigint, 'no gate is pre-approved');
select is((select count(*)::bigint from public.profiles), 0::bigint, 'no user profile is seeded');
select is((select count(*)::bigint from public.offers), 0::bigint, 'no named-human offer bank is seeded');
select is((select count(*)::bigint from public.trade_donation_pool_obligations), 0::bigint, 'no pooled obligation fixture remains');
select * from finish();
rollback;
SQL

cat > "$RUNNER_TEMP/pr654-catalog-manifest.sql" <<'SQL'
with objects as (
  select 'RELATION'::text as kind, ns.nspname||'.'||c.relname as key,
         concat_ws('|',c.relkind,c.relrowsecurity,c.relforcerowsecurity,c.relpersistence,coalesce(array_to_string(c.reloptions,','),'')) as definition
  from pg_class c join pg_namespace ns on ns.oid=c.relnamespace
  where ns.nspname in ('public','moral_trade_private') and c.relkind in ('r','p','v','m','S','f')
  union all
  select 'COLUMN', ns.nspname||'.'||c.relname||'.'||lpad(a.attnum::text,5,'0'),
         concat_ws('|',a.attname,format_type(a.atttypid,a.atttypmod),a.attnotnull,a.attidentity,a.attgenerated,coalesce(pg_get_expr(d.adbin,d.adrelid,true),''))
  from pg_attribute a join pg_class c on c.oid=a.attrelid join pg_namespace ns on ns.oid=c.relnamespace
  left join pg_attrdef d on d.adrelid=a.attrelid and d.adnum=a.attnum
  where ns.nspname in ('public','moral_trade_private') and c.relkind in ('r','p','v','m','f') and a.attnum>0 and not a.attisdropped
  union all
  select 'CONSTRAINT', ns.nspname||'.'||c.relname||'.'||con.conname,
         concat_ws('|',con.contype,con.convalidated,pg_get_constraintdef(con.oid,true))
  from pg_constraint con join pg_class c on c.oid=con.conrelid join pg_namespace ns on ns.oid=c.relnamespace
  where ns.nspname in ('public','moral_trade_private')
  union all
  select 'INDEX',schemaname||'.'||tablename||'.'||indexname,indexdef
  from pg_indexes where schemaname in ('public','moral_trade_private')
  union all
  select 'FUNCTION',ns.nspname||'.'||p.proname||'('||pg_get_function_identity_arguments(p.oid)||')',
         concat_ws('|',pg_get_function_result(p.oid),l.lanname,p.prosecdef,p.provolatile,p.proparallel,p.proisstrict,coalesce(array_to_string(p.proconfig,','),''),pg_get_functiondef(p.oid))
  from pg_proc p join pg_namespace ns on ns.oid=p.pronamespace join pg_language l on l.oid=p.prolang
  where ns.nspname in ('public','moral_trade_private')
  union all
  select 'TRIGGER',ns.nspname||'.'||c.relname||'.'||t.tgname,concat_ws('|',t.tgenabled,pg_get_triggerdef(t.oid,true))
  from pg_trigger t join pg_class c on c.oid=t.tgrelid join pg_namespace ns on ns.oid=c.relnamespace
  where ns.nspname in ('public','moral_trade_private') and not t.tgisinternal
  union all
  select 'POLICY',schemaname||'.'||tablename||'.'||policyname,concat_ws('|',permissive,array_to_string(roles,','),cmd,coalesce(qual,''),coalesce(with_check,''))
  from pg_policies where schemaname in ('public','moral_trade_private')
  union all
  select 'TABLE_PRIVILEGE',ns.nspname||'.'||c.relname||'.'||r.rolname,
         concat_ws('|',has_table_privilege(r.oid,c.oid,'SELECT'),has_table_privilege(r.oid,c.oid,'INSERT'),has_table_privilege(r.oid,c.oid,'UPDATE'),has_table_privilege(r.oid,c.oid,'DELETE'),has_table_privilege(r.oid,c.oid,'TRUNCATE'),has_table_privilege(r.oid,c.oid,'REFERENCES'),has_table_privilege(r.oid,c.oid,'TRIGGER'))
  from pg_class c join pg_namespace ns on ns.oid=c.relnamespace cross join pg_roles r
  where ns.nspname in ('public','moral_trade_private') and c.relkind in ('r','p','v','m','S','f') and r.rolname in ('anon','authenticated','service_role')
  union all
  select 'FUNCTION_PRIVILEGE',ns.nspname||'.'||p.proname||'('||pg_get_function_identity_arguments(p.oid)||').'||r.rolname,
         has_function_privilege(r.oid,p.oid,'EXECUTE')::text
  from pg_proc p join pg_namespace ns on ns.oid=p.pronamespace cross join pg_roles r
  where ns.nspname in ('public','moral_trade_private') and r.rolname in ('anon','authenticated','service_role')
)
select kind,key,encode(extensions.digest(definition,'sha256'),'hex') from objects order by kind,key;
SQL

cat > "$RUNNER_TEMP/pr654-canonical-assertions.sql" <<'SQL'
do $$
declare
  table_name text;
  role_name text;
  function_signature text;
begin
  foreach table_name in array array[
    'trade_donation_pool_gate_status','trade_donation_pool_obligations','trade_donation_pool_bundles','trade_donation_pool_bundle_items','trade_donation_pool_ledger_journals','trade_donation_pool_ledger_lines','trade_donation_pool_stripe_events','trade_donation_pool_audit_events'
  ] loop
    if to_regclass('public.'||table_name) is null then raise exception 'missing table %',table_name; end if;
    if not (select relrowsecurity from pg_class where oid=to_regclass('public.'||table_name)) then raise exception 'RLS disabled on %',table_name; end if;
    foreach role_name in array array['anon','authenticated'] loop
      if has_table_privilege(role_name,to_regclass('public.'||table_name),'INSERT')
         or has_table_privilege(role_name,to_regclass('public.'||table_name),'UPDATE')
         or has_table_privilege(role_name,to_regclass('public.'||table_name),'DELETE')
         or has_table_privilege(role_name,to_regclass('public.'||table_name),'TRUNCATE') then
        raise exception '% has direct mutation privilege on %',role_name,table_name;
      end if;
    end loop;
  end loop;

  foreach function_signature in array array[
    'public.create_trade_donation_pool_obligation(uuid,uuid,uuid,text,text,text,boolean)',
    'public.attach_trade_donation_pool_checkout(uuid,uuid,text)',
    'public.record_trade_donation_pool_stripe_success(text,text,boolean,text,boolean,uuid,text,text,text,integer,text,text)',
    'public.record_trade_donation_pool_stripe_failure(text,text,boolean,text,boolean,uuid,text,text)',
    'public.prepare_trade_donation_pool_refund(uuid,uuid)',
    'public.record_trade_donation_pool_refund_or_dispute(text,text,boolean,text,boolean,uuid,boolean,integer,text)',
    'public.start_trade_donation_pool_bundle_checkout(uuid,uuid,text)',
    'public.complete_every_org_trade_donation_pool_bundle(uuid,text,text,text,integer,text,text,text,timestamp with time zone,text,boolean,text,text)'
  ] loop
    if to_regprocedure(function_signature) is null then raise exception 'missing function %',function_signature; end if;
    if has_function_privilege('anon',to_regprocedure(function_signature),'EXECUTE') or has_function_privilege('authenticated',to_regprocedure(function_signature),'EXECUTE') then raise exception 'browser execution granted on %',function_signature; end if;
    if not has_function_privilege('service_role',to_regprocedure(function_signature),'EXECUTE') then raise exception 'service role lacks execution on %',function_signature; end if;
  end loop;

  if has_function_privilege('anon','public.mark_trade_donation_pool_component_stale()','EXECUTE') or has_function_privilege('authenticated','public.mark_trade_donation_pool_component_stale()','EXECUTE') then raise exception 'stale helper exposed to browser role'; end if;
  if not has_function_privilege('service_role','public.mark_trade_donation_pool_component_stale()','EXECUTE') then raise exception 'service role lacks stale helper'; end if;
  if position('pg_advisory_xact_lock' in pg_get_functiondef('moral_trade_private.try_freeze_trade_donation_pool_bundle(text,text,text,text,text)'::regprocedure))=0 then raise exception 'freeze function lacks advisory lock'; end if;
  if (select count(*) from public.trade_donation_pool_gate_status) <> 11 then raise exception 'unexpected gate count'; end if;
  if exists(select 1 from public.trade_donation_pool_gate_status where status='passed') then raise exception 'gate pre-approved'; end if;
  if exists(select 1 from public.profiles) or exists(select 1 from public.offers) then raise exception 'personal/operator data seeded'; end if;
  if exists(select 1 from public.trade_donation_pool_obligations) or exists(select 1 from public.trade_donation_pool_bundles) or exists(select 1 from public.trade_donation_pool_bundle_items) or exists(select 1 from public.trade_donation_pool_ledger_journals) or exists(select 1 from public.trade_donation_pool_ledger_lines) or exists(select 1 from public.trade_donation_pool_stripe_events) or exists(select 1 from public.trade_donation_pool_audit_events) then raise exception 'pool fixture persisted'; end if;
end $$;
SQL

find_db_container() {
  docker ps --format '{{.Names}}' | grep '^supabase_db_' | head -1
}

capture_pass() {
  local label="$1" out="$EVIDENCE_DIR/$label" db
  db="$(find_db_container)"
  test -n "$db"
  docker exec "$db" psql -X -v ON_ERROR_STOP=1 -U postgres -d postgres -Atc 'select version();' > "$out/postgresql-version.txt"
  docker exec -i "$db" psql -X -v ON_ERROR_STOP=1 -U postgres -d postgres < "$RUNNER_TEMP/pr654-canonical-assertions.sql" > "$out/assertions.log"
  docker exec -i "$db" psql -X -v ON_ERROR_STOP=1 -U postgres -d postgres -AtF $'\t' < "$RUNNER_TEMP/pr654-catalog-manifest.sql" > "$out/catalog-manifest.tsv"
  docker exec "$db" psql -X -v ON_ERROR_STOP=1 -U postgres -d postgres -AtF $'\t' -c "select version,name from supabase_migrations.schema_migrations order by version;" > "$out/migration-history.tsv"
  docker exec "$db" psql -X -v ON_ERROR_STOP=1 -U postgres -d postgres -Atq -c "select jsonb_build_object('profiles',(select count(*) from public.profiles),'offers',(select count(*) from public.offers),'gate_rows',(select count(*) from public.trade_donation_pool_gate_status),'passed_gates',(select count(*) from public.trade_donation_pool_gate_status where status='passed'))::text;" > "$out/data-sentinels.json"
  diff -u "$SOURCE_ROOT/prod/catalog-manifest.tsv" "$out/catalog-manifest.tsv" > "$out/catalog-diff.txt" || {
    sed -n '1,240p' "$out/catalog-diff.txt"
    return 1
  }
  test "$(wc -l < "$out/migration-history.tsv")" -eq 1
  grep -q "^${MIGRATION_VERSION}[[:space:]]" "$out/migration-history.tsv"
  sha256sum "$out"/* | sort > "$out/sha256.txt"
}

note "Pass A: true fresh start"
raw="$RUNNER_TEMP/pass-a-start.raw.log"
set +e
supabase start --debug > "$raw" 2>&1
status=$?
set -e
sanitize < "$raw" > "$EVIDENCE_DIR/logs/pass-a-start.log"
rm -f "$raw"
test "$status" -eq 0
docker ps --format '{{.Names}}\t{{.Image}}\t{{.ID}}' | tee "$EVIDENCE_DIR/manifests/docker-pass-a.tsv"
docker inspect "$(find_db_container)" --format '{{.Image}}' | tee "$EVIDENCE_DIR/manifests/database-image-id.txt"
capture_pass pass-a

note "pgTAP and database lint"
supabase test db | tee "$EVIDENCE_DIR/logs/pgtap.log"
supabase db lint --local --level error | tee "$EVIDENCE_DIR/logs/db-lint.log"

note "Pass B: canonical db reset"
supabase db reset --local --no-seed | tee "$EVIDENCE_DIR/logs/pass-b-reset.log"
capture_pass pass-b
diff -u "$EVIDENCE_DIR/pass-a/catalog-manifest.tsv" "$EVIDENCE_DIR/pass-b/catalog-manifest.tsv" > "$EVIDENCE_DIR/manifests/pass-a-b-catalog.diff"
diff -u "$EVIDENCE_DIR/pass-a/migration-history.tsv" "$EVIDENCE_DIR/pass-b/migration-history.tsv" > "$EVIDENCE_DIR/manifests/pass-a-b-history.diff"

note "Pass C: independent fresh start"
supabase stop --no-backup | tee "$EVIDENCE_DIR/logs/pass-c-pre-stop.log"
if docker ps -a --format '{{.Names}}' | grep -q 'supabase_.*pr654-canonical-prototype'; then
  echo 'Supabase container remained before pass C' >&2
  exit 1
fi
raw="$RUNNER_TEMP/pass-c-start.raw.log"
set +e
supabase start --debug > "$raw" 2>&1
status=$?
set -e
sanitize < "$raw" > "$EVIDENCE_DIR/logs/pass-c-start.log"
rm -f "$raw"
test "$status" -eq 0
capture_pass pass-c
diff -u "$EVIDENCE_DIR/pass-a/catalog-manifest.tsv" "$EVIDENCE_DIR/pass-c/catalog-manifest.tsv" > "$EVIDENCE_DIR/manifests/pass-a-c-catalog.diff"
diff -u "$EVIDENCE_DIR/pass-a/migration-history.tsv" "$EVIDENCE_DIR/pass-c/migration-history.tsv" > "$EVIDENCE_DIR/manifests/pass-a-c-history.diff"

note "Credential scan and final proof"
if grep -RIlE 'postgres(ql)?://|eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}|sb_secret_|sk_(live|test)_[A-Za-z0-9]|[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}' "$EVIDENCE_DIR" > "$EVIDENCE_DIR/manifests/credential-scan-hits.txt"; then
  cat "$EVIDENCE_DIR/manifests/credential-scan-hits.txt" >&2
  exit 1
fi
: > "$EVIDENCE_DIR/manifests/credential-scan-hits.txt"
test "$(git -C "$PRODUCT_DIR" rev-parse HEAD)" = "$EXPECTED_PRODUCT_HEAD"
test -z "$(git -C "$PRODUCT_DIR" status --porcelain)"
printf 'pass_a=passed\npass_b=passed\npass_c=passed\nproduction_catalog_match=exact\nnamed_human_seed=absent\n' \
  | tee "$EVIDENCE_DIR/summary.txt"

cleanup
trap - EXIT
