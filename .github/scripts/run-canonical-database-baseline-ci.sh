#!/usr/bin/env bash
set -uo pipefail

: "${SUPABASE_CLI_VERSION:=2.110.0}"
: "${EVIDENCE_DIR:?}"

mkdir -p "$EVIDENCE_DIR"/{logs,history,catalog,cleanup}
exec > >(tee -a "$EVIDENCE_DIR/command-transcript.txt") 2>&1
overall=0

supabase() { npx --yes "supabase@${SUPABASE_CLI_VERSION}" "$@"; }
note() { printf '\n===== %s =====\n' "$*"; }
fail() { overall=1; printf 'FAIL: %s\n' "$*"; }

unset SUPABASE_ACCESS_TOKEN SUPABASE_DB_PASSWORD SUPABASE_PROJECT_ID SUPABASE_PROJECT_REF SUPABASE_URL SUPABASE_SERVICE_ROLE_KEY DATABASE_URL DIRECT_URL POSTGRES_URL STRIPE_SECRET_KEY STRIPE_WEBHOOK_SECRET EVERY_ORG_WEBHOOK_SECRET || true

cleanup() {
  set +e
  supabase stop --no-backup > "$EVIDENCE_DIR/logs/final-stop.log" 2>&1
  docker ps -a --format '{{.ID}}\t{{.Names}}\t{{.Image}}\t{{.Status}}' > "$EVIDENCE_DIR/cleanup/containers.tsv"
  docker volume ls --format '{{.Name}}' | grep -E 'supabase|canonical|baseline' > "$EVIDENCE_DIR/cleanup/volumes.txt" || true
  ss -ltnp 2>/dev/null | grep -E ':(5432[0-9]|8000|8443|3000|4000|5000|6543|55432)\b' > "$EVIDENCE_DIR/cleanup/listeners.txt" || true
}
trap cleanup EXIT

local_db_container() {
  docker ps --format '{{.Names}}' | grep '^supabase_db_' | head -1
}

local_psql() {
  local db
  db="$(local_db_container)"
  [[ -n "$db" ]] || return 1
  docker exec "$db" psql -X -v ON_ERROR_STOP=1 -U postgres -d postgres "$@"
}

assert_database() {
  local pass="$1"
  local_psql > "$EVIDENCE_DIR/logs/${pass}-assertions.log" 2>&1 <<'SQL'
do $assertions$
declare
  required_tables text[] := array[
    'trade_donation_pool_gate_status',
    'trade_donation_pool_obligations',
    'trade_donation_pool_bundles',
    'trade_donation_pool_bundle_items',
    'trade_donation_pool_ledger_journals',
    'trade_donation_pool_ledger_lines',
    'trade_donation_pool_stripe_events',
    'trade_donation_pool_audit_events'
  ];
  table_name text;
  rls_on boolean;
begin
  foreach table_name in array required_tables loop
    if to_regclass('public.' || table_name) is null then
      raise exception 'missing pooled-settlement table: %', table_name;
    end if;
    select c.relrowsecurity into rls_on
    from pg_class c join pg_namespace n on n.oid=c.relnamespace
    where n.nspname='public' and c.relname=table_name;
    if not coalesce(rls_on,false) then raise exception 'RLS disabled on %',table_name; end if;
    if has_table_privilege('anon','public.'||table_name,'INSERT')
       or has_table_privilege('anon','public.'||table_name,'UPDATE')
       or has_table_privilege('anon','public.'||table_name,'DELETE')
       or has_table_privilege('anon','public.'||table_name,'TRUNCATE')
       or has_table_privilege('authenticated','public.'||table_name,'INSERT')
       or has_table_privilege('authenticated','public.'||table_name,'UPDATE')
       or has_table_privilege('authenticated','public.'||table_name,'DELETE')
       or has_table_privilege('authenticated','public.'||table_name,'TRUNCATE') then
      raise exception 'browser mutation grant remains on %',table_name;
    end if;
  end loop;
  if not exists (select 1 from public.trade_donation_pool_gate_status) then
    raise exception 'pool gate defaults missing';
  end if;
  if exists (select 1 from public.trade_donation_pool_gate_status where status not in ('blocked','pending')) then
    raise exception 'pool gate is not fail closed';
  end if;
  if to_regprocedure('public.mark_trade_donation_pool_component_stale()') is null then
    raise exception 'component-stale trigger helper missing';
  end if;
  if has_function_privilege('anon','public.mark_trade_donation_pool_component_stale()','EXECUTE')
     or has_function_privilege('authenticated','public.mark_trade_donation_pool_component_stale()','EXECUTE') then
    raise exception 'browser role can execute component-stale helper';
  end if;
  if not has_function_privilege('service_role','public.mark_trade_donation_pool_component_stale()','EXECUTE') then
    raise exception 'service role cannot execute component-stale helper';
  end if;
  if not exists (
    select 1 from pg_proc p join pg_namespace n on n.oid=p.pronamespace
    where n.nspname='moral_trade_private' and p.proname='try_freeze_trade_donation_pool_bundle'
  ) then raise exception 'bundle-freeze function missing'; end if;
  if exists (select 1 from public.trade_donation_pool_obligations)
     or exists (select 1 from public.trade_donation_pool_bundles)
     or exists (select 1 from public.trade_donation_pool_bundle_items)
     or exists (select 1 from public.trade_donation_pool_ledger_journals)
     or exists (select 1 from public.trade_donation_pool_ledger_lines)
     or exists (select 1 from public.trade_donation_pool_stripe_events)
     or exists (select 1 from public.trade_donation_pool_audit_events) then
    raise exception 'transactional pool fixture remains';
  end if;
  if (select count(*) from supabase_migrations.schema_migrations where version='20260816180000') <> 1 then
    raise exception 'canonical baseline not represented exactly once';
  end if;
  if exists (select 1 from supabase_migrations.schema_migrations where version='20260813170151') then
    raise exception 'removed duplicate migration reappeared';
  end if;
  if (select count(*) from supabase_migrations.schema_migrations where version='20260814024354') <> 1 then
    raise exception 'canonical trigger hardening marker not represented exactly once';
  end if;
end
$assertions$;
SQL
}

capture() {
  local pass="$1"
  local_psql -AtF $'\t' -c "select version,name from supabase_migrations.schema_migrations order by version" > "$EVIDENCE_DIR/history/${pass}.tsv"
  local_psql -Atc 'select version()' > "$EVIDENCE_DIR/catalog/${pass}-postgres-version.txt"
  local_psql -AtF $'\t' -c "select n.nspname,c.relname,c.relkind,c.relrowsecurity,c.relforcerowsecurity from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname in ('public','moral_trade_private') order by 1,2,3" > "$EVIDENCE_DIR/catalog/${pass}-relations.tsv"
  local_psql -AtF $'\t' -c "select n.nspname,p.proname,pg_get_function_identity_arguments(p.oid),p.prosecdef,p.provolatile from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname in ('public','moral_trade_private') order by 1,2,3" > "$EVIDENCE_DIR/catalog/${pass}-functions.tsv"
}

note "Toolchain"
uname -a
docker version
node --version
npm --version
supabase --version

note "Pass A: no-volume fresh start"
supabase stop --no-backup > "$EVIDENCE_DIR/logs/pass-a-pre-stop.log" 2>&1 || true
if ! supabase start > "$EVIDENCE_DIR/logs/pass-a-start.log" 2>&1; then
  cat "$EVIDENCE_DIR/logs/pass-a-start.log"; fail 'Pass A start failed'
fi
if [[ $overall -eq 0 ]]; then
  assert_database pass-a || { cat "$EVIDENCE_DIR/logs/pass-a-assertions.log"; fail 'Pass A assertions failed'; }
  capture pass-a || fail 'Pass A capture failed'
  supabase test db > "$EVIDENCE_DIR/logs/pass-a-pgtap.log" 2>&1 || { cat "$EVIDENCE_DIR/logs/pass-a-pgtap.log"; fail 'Pass A pgTAP failed'; }
  supabase db lint --local --level error > "$EVIDENCE_DIR/logs/pass-a-lint.log" 2>&1 || { cat "$EVIDENCE_DIR/logs/pass-a-lint.log"; fail 'Pass A database lint failed'; }
fi

note "Pass B: reset reconstruction"
if [[ $overall -eq 0 ]]; then
  supabase db reset --local --no-seed > "$EVIDENCE_DIR/logs/pass-b-reset.log" 2>&1 || { cat "$EVIDENCE_DIR/logs/pass-b-reset.log"; fail 'Pass B reset failed'; }
  assert_database pass-b || { cat "$EVIDENCE_DIR/logs/pass-b-assertions.log"; fail 'Pass B assertions failed'; }
  capture pass-b || fail 'Pass B capture failed'
  diff -u "$EVIDENCE_DIR/history/pass-a.tsv" "$EVIDENCE_DIR/history/pass-b.tsv" > "$EVIDENCE_DIR/logs/history-a-b.diff" || fail 'Pass A/B history differs'
fi

note "Pass C: independent no-backup fresh start"
if [[ $overall -eq 0 ]]; then
  supabase stop --no-backup > "$EVIDENCE_DIR/logs/pass-c-stop.log" 2>&1 || fail 'Pass C stop failed'
  if docker ps -a --format '{{.Names}}' | grep -q '^supabase_'; then fail 'Supabase container remains before Pass C'; fi
  supabase start > "$EVIDENCE_DIR/logs/pass-c-start.log" 2>&1 || { cat "$EVIDENCE_DIR/logs/pass-c-start.log"; fail 'Pass C start failed'; }
  assert_database pass-c || { cat "$EVIDENCE_DIR/logs/pass-c-assertions.log"; fail 'Pass C assertions failed'; }
  capture pass-c || fail 'Pass C capture failed'
  diff -u "$EVIDENCE_DIR/history/pass-a.tsv" "$EVIDENCE_DIR/history/pass-c.tsv" > "$EVIDENCE_DIR/logs/history-a-c.diff" || fail 'Pass A/C history differs'
  diff -u "$EVIDENCE_DIR/catalog/pass-a-relations.tsv" "$EVIDENCE_DIR/catalog/pass-c-relations.tsv" > "$EVIDENCE_DIR/logs/relations-a-c.diff" || fail 'Pass A/C relations differ'
  diff -u "$EVIDENCE_DIR/catalog/pass-a-functions.tsv" "$EVIDENCE_DIR/catalog/pass-c-functions.tsv" > "$EVIDENCE_DIR/logs/functions-a-c.diff" || fail 'Pass A/C functions differ'
fi

cleanup
trap - EXIT
if grep -q '^supabase_' "$EVIDENCE_DIR/cleanup/containers.tsv"; then fail 'Supabase containers remain after cleanup'; fi
if [[ -s "$EVIDENCE_DIR/cleanup/volumes.txt" ]]; then fail 'Supabase-like volumes remain after cleanup'; fi

# Remove all local credentials and JWTs before artifact creation.
find "$EVIDENCE_DIR" -type f -print0 | xargs -0 sed -i -E \
  -e 's#postgres(ql)?://[^[:space:]]+#[REDACTED_LOCAL_DB_URL]#g' \
  -e 's#eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}#[REDACTED_LOCAL_JWT]#g' \
  -e '/(anon key|service_role key|S3 Access Key|S3 Secret Key|JWT secret|DB URL)/I s#(:|=).*#\1 [REDACTED]#'

if grep -RIlE 'postgres(ql)?://[^[:space:]]+:[^@[:space:]]+@|eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}|sk_(live|test)_' "$EVIDENCE_DIR" > "$EVIDENCE_DIR/credential-scan-hits.txt"; then
  fail 'credential-like material remains in evidence'
else
  : > "$EVIDENCE_DIR/credential-scan-hits.txt"
fi

printf 'overall=%s\n' "$overall" | tee "$EVIDENCE_DIR/result.txt"
exit "$overall"
