#!/usr/bin/env bash
set -euo pipefail

: "${EXPECTED_PRODUCT_HEAD:?}"
: "${PRODUCT_DIR:?}"
: "${EVIDENCE_DIR:?}"
: "${PROD_SUPABASE_DB_URL:?}"
: "${QA_SUPABASE_DB_URL:?}"
: "${PROD_POOLER_HOST:?}"
: "${PROD_POOLER_USER:?}"
: "${QA_POOLER_HOST:?}"
: "${QA_POOLER_USER:?}"

umask 077
mkdir -p "$EVIDENCE_DIR"/{prod,qa,logs,manifests}
TRANSCRIPT="$EVIDENCE_DIR/command-transcript.txt"
exec > >(tee -a "$TRANSCRIPT") 2>&1

note() { printf '\n===== %s =====\n' "$*"; }

note "Exact product-head preflight"
cd "$PRODUCT_DIR"
test "$(git rev-parse HEAD)" = "$EXPECTED_PRODUCT_HEAD"
test -z "$(git symbolic-ref -q --short HEAD || true)"
test -z "$(git status --porcelain)"
printf 'product_head=%s\nproduct_tree=%s\n' \
  "$(git rev-parse HEAD)" "$(git rev-parse HEAD^{tree})" \
  | tee "$EVIDENCE_DIR/manifests/product-head.txt"

note "Validate exact TLS-only database targets"
echo "::add-mask::$PROD_SUPABASE_DB_URL"
echo "::add-mask::$QA_SUPABASE_DB_URL"
python3 - <<'PY'
import os
from urllib.parse import parse_qs, unquote, urlparse

def validate(name: str, expected_host: str, expected_user: str) -> None:
    parsed = urlparse(os.environ[name])
    ssl_modes = parse_qs(parsed.query).get("sslmode", ["require"])
    actual_user = unquote(parsed.username or "")
    valid = (
        parsed.scheme in {"postgres", "postgresql"}
        and actual_user == expected_user
        and parsed.hostname == expected_host
        and parsed.port == 5432
        and parsed.path == "/postgres"
        and ssl_modes == ["require"]
        and bool(parsed.password)
    )
    if not valid:
        raise SystemExit(f"Refusing unexpected database target for {name}.")

validate("PROD_SUPABASE_DB_URL", os.environ["PROD_POOLER_HOST"], os.environ["PROD_POOLER_USER"])
validate("QA_SUPABASE_DB_URL", os.environ["QA_POOLER_HOST"], os.environ["QA_POOLER_USER"])
PY

export PGCONNECT_TIMEOUT=15
export PGSSLMODE=require
export PGOPTIONS='-c default_transaction_read_only=on -c statement_timeout=120000 -c lock_timeout=5000'

note "Toolchain"
{
  uname -a
  cat /etc/os-release
  pg_dump --version
  psql --version
  git --version
  python3 --version
} | tee "$EVIDENCE_DIR/toolchain.txt"

query_env() {
  local label="$1" url="$2" out="$EVIDENCE_DIR/$label"

  note "$label read-only preflight"
  psql "$url" -X -v ON_ERROR_STOP=1 -Atq > "$out/connection.json" <<'SQL'
select jsonb_build_object(
  'server_version', version(),
  'server_version_num', current_setting('server_version_num'),
  'default_transaction_read_only', current_setting('default_transaction_read_only'),
  'transaction_read_only', current_setting('transaction_read_only'),
  'database', current_database(),
  'user_class', case
    when current_user like 'postgres.%' then 'supabase_pooler_postgres'
    when current_user in ('postgres','supabase_admin') then current_user
    else 'other'
  end
)::text;
SQL
  python3 - "$out/connection.json" <<'PY'
import json, sys
p=sys.argv[1]
data=json.load(open(p))
assert data['default_transaction_read_only']=='on', data
assert data['transaction_read_only']=='on', data
assert data['database']=='postgres', data
PY

  note "$label schema-only dump with privileges"
  pg_dump "$url" \
    --schema-only \
    --no-owner \
    --no-comments \
    --no-security-labels \
    --schema=public \
    --schema=moral_trade_private \
    --file "$out/schema-with-privileges.raw.sql"

  note "$label portable structural dump"
  pg_dump "$url" \
    --schema-only \
    --no-owner \
    --no-privileges \
    --no-comments \
    --no-security-labels \
    --schema=public \
    --schema=moral_trade_private \
    --file "$out/schema-structure.raw.sql"

  python3 - "$out/schema-with-privileges.raw.sql" "$out/schema-with-privileges.sql" \
               "$out/schema-structure.raw.sql" "$out/schema-structure.sql" <<'PY'
from pathlib import Path
import re, sys
for src_name, dst_name in zip(sys.argv[1::2], sys.argv[2::2]):
    text=Path(src_name).read_text(encoding='utf-8')
    lines=[]
    for line in text.splitlines():
        if re.match(r'^\\(un)?restrict\s+', line):
            continue
        lines.append(line.rstrip())
    normalized='\n'.join(lines).strip()+'\n'
    Path(dst_name).write_text(normalized, encoding='utf-8')
    Path(src_name).unlink()
PY

  note "$label installed extension manifest"
  psql "$url" -X -v ON_ERROR_STOP=1 -AtF $'\t' > "$out/extensions.tsv" <<'SQL'
select e.extname, n.nspname, e.extversion
from pg_extension e
join pg_namespace n on n.oid=e.extnamespace
where e.extname <> 'plpgsql'
order by e.extname;
SQL

  note "$label migration-history inventory"
  psql "$url" -X -v ON_ERROR_STOP=1 -Atq > "$out/migration-history.json" <<'SQL'
select coalesce(jsonb_agg(jsonb_build_object(
  'version', to_jsonb(m)->>'version',
  'name', to_jsonb(m)->>'name',
  'created_by_class', case
    when coalesce(to_jsonb(m)->>'created_by','')='' then null
    when to_jsonb(m)->>'created_by' in ('postgres','supabase_admin') then to_jsonb(m)->>'created_by'
    when to_jsonb(m)->>'created_by' like 'chatgpt:%' then 'chatgpt'
    when to_jsonb(m)->>'created_by' like '%@%' then 'email_principal'
    else 'other_principal'
  end,
  'statement_count', case when jsonb_typeof(to_jsonb(m)->'statements')='array' then jsonb_array_length(to_jsonb(m)->'statements') else null end,
  'statements_md5', md5(coalesce((to_jsonb(m)->'statements')::text,'')),
  'idempotency_key_present', nullif(to_jsonb(m)->>'idempotency_key','') is not null,
  'rollback_count', case when jsonb_typeof(to_jsonb(m)->'rollback')='array' then jsonb_array_length(to_jsonb(m)->'rollback') else null end
) order by to_jsonb(m)->>'version', to_jsonb(m)->>'name'), '[]'::jsonb)::text
from supabase_migrations.schema_migrations m;
SQL

  note "$label migration-history table contract"
  psql "$url" -X -v ON_ERROR_STOP=1 -Atq > "$out/migration-history-contract.json" <<'SQL'
select jsonb_build_object(
  'columns', coalesce((select jsonb_agg(jsonb_build_object(
    'ordinal',ordinal_position,'name',column_name,'data_type',data_type,
    'udt_schema',udt_schema,'udt_name',udt_name,'nullable',is_nullable,
    'default',column_default
  ) order by ordinal_position)
  from information_schema.columns
  where table_schema='supabase_migrations' and table_name='schema_migrations'), '[]'::jsonb),
  'constraints', coalesce((select jsonb_agg(jsonb_build_object(
    'name',con.conname,'type',con.contype,'definition',pg_get_constraintdef(con.oid,true)
  ) order by con.conname)
  from pg_constraint con join pg_class rel on rel.oid=con.conrelid
  join pg_namespace ns on ns.oid=rel.relnamespace
  where ns.nspname='supabase_migrations' and rel.relname='schema_migrations'), '[]'::jsonb),
  'indexes', coalesce((select jsonb_agg(jsonb_build_object('name',indexname,'definition',indexdef) order by indexname)
  from pg_indexes where schemaname='supabase_migrations' and tablename='schema_migrations'), '[]'::jsonb)
)::text;
SQL

  note "$label normalized catalog manifest"
  psql "$url" -X -v ON_ERROR_STOP=1 -AtF $'\t' > "$out/catalog-manifest.tsv" <<'SQL'
with objects as (
  select 'RELATION'::text as kind,
         ns.nspname||'.'||c.relname as key,
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
  select 'INDEX', schemaname||'.'||tablename||'.'||indexname,indexdef
  from pg_indexes where schemaname in ('public','moral_trade_private')
  union all
  select 'FUNCTION', ns.nspname||'.'||p.proname||'('||pg_get_function_identity_arguments(p.oid)||')',
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
select kind,key,encode(digest(definition,'sha256'),'hex')
from objects
order by kind,key;
SQL

  note "$label catalog aggregate fingerprint"
  psql "$url" -X -v ON_ERROR_STOP=1 -Atq > "$out/catalog-fingerprint.json" <<'SQL'
with manifest as (
  select 'RELATION'::text as kind, ns.nspname||'.'||c.relname as key,
         concat_ws('|',c.relkind,c.relrowsecurity,c.relforcerowsecurity,c.relpersistence,coalesce(array_to_string(c.reloptions,','),'')) as definition
  from pg_class c join pg_namespace ns on ns.oid=c.relnamespace
  where ns.nspname in ('public','moral_trade_private') and c.relkind in ('r','p','v','m','S','f')
  union all
  select 'COLUMN', ns.nspname||'.'||c.relname||'.'||lpad(a.attnum::text,5,'0'), concat_ws('|',a.attname,format_type(a.atttypid,a.atttypmod),a.attnotnull,a.attidentity,a.attgenerated,coalesce(pg_get_expr(d.adbin,d.adrelid,true),''))
  from pg_attribute a join pg_class c on c.oid=a.attrelid join pg_namespace ns on ns.oid=c.relnamespace left join pg_attrdef d on d.adrelid=a.attrelid and d.adnum=a.attnum
  where ns.nspname in ('public','moral_trade_private') and c.relkind in ('r','p','v','m','f') and a.attnum>0 and not a.attisdropped
  union all
  select 'CONSTRAINT',ns.nspname||'.'||c.relname||'.'||con.conname,concat_ws('|',con.contype,con.convalidated,pg_get_constraintdef(con.oid,true))
  from pg_constraint con join pg_class c on c.oid=con.conrelid join pg_namespace ns on ns.oid=c.relnamespace where ns.nspname in ('public','moral_trade_private')
  union all select 'INDEX',schemaname||'.'||tablename||'.'||indexname,indexdef from pg_indexes where schemaname in ('public','moral_trade_private')
  union all select 'FUNCTION',ns.nspname||'.'||p.proname||'('||pg_get_function_identity_arguments(p.oid)||')',concat_ws('|',pg_get_function_result(p.oid),l.lanname,p.prosecdef,p.provolatile,p.proparallel,p.proisstrict,coalesce(array_to_string(p.proconfig,','),''),pg_get_functiondef(p.oid)) from pg_proc p join pg_namespace ns on ns.oid=p.pronamespace join pg_language l on l.oid=p.prolang where ns.nspname in ('public','moral_trade_private')
  union all select 'TRIGGER',ns.nspname||'.'||c.relname||'.'||t.tgname,concat_ws('|',t.tgenabled,pg_get_triggerdef(t.oid,true)) from pg_trigger t join pg_class c on c.oid=t.tgrelid join pg_namespace ns on ns.oid=c.relnamespace where ns.nspname in ('public','moral_trade_private') and not t.tgisinternal
  union all select 'POLICY',schemaname||'.'||tablename||'.'||policyname,concat_ws('|',permissive,array_to_string(roles,','),cmd,coalesce(qual,''),coalesce(with_check,'')) from pg_policies where schemaname in ('public','moral_trade_private')
)
select jsonb_object_agg(kind,jsonb_build_object('count',count,'sha256',sha256) order by kind)::text
from (
  select kind,count(*) as count,encode(digest(coalesce(string_agg(key||'='||definition,E'\n' order by key),''),'sha256'),'hex') as sha256
  from manifest group by kind
) s;
SQL

  note "$label aggregate-only data sentinels"
  psql "$url" -X -v ON_ERROR_STOP=1 -Atq > "$out/data-sentinels.json" <<'SQL'
select jsonb_build_object(
  'profiles',(select count(*) from public.profiles),
  'offers',(select count(*) from public.offers),
  'offer_catalog_entries',(select count(*) from public.offer_catalog_entries),
  'financial_commitment_pools',(select count(*) from public.financial_commitment_pools),
  'registered_charities',(select count(*) from public.registered_charities),
  'trade_donation_pool_gate_status',(select count(*) from public.trade_donation_pool_gate_status),
  'recommendation_model_versions',(select count(*) from public.recommendation_model_versions),
  'recommendation_training_slots',(select count(*) from public.recommendation_training_slots),
  'recommendation_guardrail_snapshots',(select count(*) from public.recommendation_guardrail_snapshots),
  'mpgf_failure_bonus_reserves',(select count(*) from public.mpgf_failure_bonus_reserves),
  'published_offer_count',(select count(*) from public.offers where coalesce((to_jsonb(offers)->>'status'),'') in ('published','active','open'))
)::text;
SQL
}

query_env prod "$PROD_SUPABASE_DB_URL"
query_env qa "$QA_SUPABASE_DB_URL"

note "Generate non-personal fail-closed pool gate seed from production"
psql "$PROD_SUPABASE_DB_URL" -X -v ON_ERROR_STOP=1 -Atq > "$EVIDENCE_DIR/prod/trade-donation-pool-gates.json" <<'SQL'
select coalesce(jsonb_agg(jsonb_build_object(
  'environment',environment,
  'gate_key',gate_key,
  'status',status,
  'notes',notes
) order by environment,gate_key), '[]'::jsonb)::text
from public.trade_donation_pool_gate_status;
SQL
python3 - "$EVIDENCE_DIR/prod/trade-donation-pool-gates.json" "$EVIDENCE_DIR/prod/trade-donation-pool-gates.sql" <<'PY'
import json, sys
rows=json.load(open(sys.argv[1]))
def q(value: str) -> str:
    return "'" + value.replace("'", "''") + "'"
with open(sys.argv[2],'w',encoding='utf-8') as f:
    f.write('-- Deterministic non-personal fail-closed seed generated from production gate semantics.\n')
    f.write('insert into public.trade_donation_pool_gate_status (environment, gate_key, status, notes) values\n')
    f.write(',\n'.join(f"  ({q(r['environment'])}, {q(r['gate_key'])}, {q(r['status'])}, {q(r['notes'])})" for r in rows))
    f.write('\non conflict (environment, gate_key) do update set status=excluded.status, notes=excluded.notes, approved_by=null, approved_at=null, accountable_owner_name=\'\', accountable_owner_role=\'\', accountable_owner_email=\'\', evidence_url=\'\', evidence_sha256=\'\', evidence_recorded_at=null;\n')
PY

note "Determinism and credential scan"
for label in prod qa; do
  sha256sum "$EVIDENCE_DIR/$label"/* | sort > "$EVIDENCE_DIR/manifests/$label-sha256.txt"
done
if grep -RIlE 'postgres(ql)?://|eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}|sb_secret_|sk_(live|test)_[A-Za-z0-9]|[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}' "$EVIDENCE_DIR" > "$EVIDENCE_DIR/manifests/credential-scan-hits.txt"; then
  printf 'Credential-like material detected in:\n' >&2
  cat "$EVIDENCE_DIR/manifests/credential-scan-hits.txt" >&2
  exit 1
fi
: > "$EVIDENCE_DIR/manifests/credential-scan-hits.txt"

note "Final exact-head and read-only proof"
test "$(git -C "$PRODUCT_DIR" rev-parse HEAD)" = "$EXPECTED_PRODUCT_HEAD"
test -z "$(git -C "$PRODUCT_DIR" status --porcelain)"
printf 'remote_database_writes=0\nproduct_changes=0\n' > "$EVIDENCE_DIR/manifests/safety-summary.txt"
