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
preflight_gate=0
db_gate=0
repo_gate=0
cleanup_gate=0
db_started=0
db_container=""

note() { printf '\n===== %s =====\n' "$*"; }
fail() { overall=1; printf 'FAIL: %s\n' "$*" | tee -a "$SUMMARY"; }
record() { printf '%s=%s\n' "$1" "$2" | tee -a "$SUMMARY"; }

sanitize_supabase_log() {
  sed -E \
    -e '/(anon key|service_role key|S3 Access Key|S3 Secret Key|JWT secret|DB URL)/I s#(:|=).*#\1 [REDACTED]#' \
    -e 's#postgres(ql)?://[^[:space:]]+#[REDACTED_LOCAL_DB_URL]#g' \
    -e 's#eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}#[REDACTED_LOCAL_JWT]#g' \
    -e 's#sb_(secret|publishable)_[A-Za-z0-9_-]+#[REDACTED_LOCAL_KEY]#g'
}

supabase() {
  npx --yes "supabase@${SUPABASE_CLI_VERSION}" "$@"
}

cleanup() {
  set +e
  note "Final local cleanup"
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
    cleanup_gate=1
    fail "Supabase containers remain after stop --no-backup"
  fi
  if [[ -s "$EVIDENCE_DIR/manifests/docker-volumes-after-cleanup.txt" ]]; then
    cleanup_gate=1
    fail "Supabase-like Docker volumes remain after cleanup"
  fi

  git reset --hard HEAD > "$EVIDENCE_DIR/logs/git-reset-cleanup.log" 2>&1
  git clean -fdx >> "$EVIDENCE_DIR/logs/git-reset-cleanup.log" 2>&1
  git status --short --branch | tee "$EVIDENCE_DIR/manifests/git-status-final.txt"
  if [[ -n "$(git status --porcelain)" ]]; then
    cleanup_gate=1
    fail "disposable product checkout is not clean after cleanup"
  fi
}
trap cleanup EXIT

note "Preflight: exact product head, clean detached checkout, and remote refs"
actual_head="$(git rev-parse HEAD)"
symbolic_head="$(git symbolic-ref -q --short HEAD || true)"
initial_status="$(git status --porcelain)"
printf 'actual_head=%s\nsymbolic_head=%s\n' "$actual_head" "${symbolic_head:-DETACHED}" \
  | tee "$EVIDENCE_DIR/manifests/git-head.txt"
git status --short --branch | tee "$EVIDENCE_DIR/manifests/git-status-initial.txt"

remote_refs="$(git ls-remote origin "refs/heads/${PRODUCT_BRANCH}" refs/heads/main 2>&1)"
remote_status=$?
printf '%s\n' "$remote_refs" | tee "$EVIDENCE_DIR/manifests/remote-refs.txt"
product_remote="$(printf '%s\n' "$remote_refs" | awk -v r="refs/heads/${PRODUCT_BRANCH}" '$2==r{print $1}')"
main_remote="$(printf '%s\n' "$remote_refs" | awk '$2=="refs/heads/main"{print $1}')"
printf 'product_remote=%s\nmain_remote=%s\n' "$product_remote" "$main_remote" \
  | tee -a "$EVIDENCE_DIR/manifests/git-head.txt"

if [[ $remote_status -ne 0 ]]; then preflight_gate=1; fail "could not resolve remote refs"; fi
if [[ "$actual_head" != "$EXPECTED_PRODUCT_HEAD" || "$product_remote" != "$EXPECTED_PRODUCT_HEAD" ]]; then
  preflight_gate=1
  fail "PR #654 product head moved; database gate must not run"
fi
if [[ -n "$symbolic_head" ]]; then preflight_gate=1; fail "product checkout is not detached"; fi
if [[ -n "$initial_status" ]]; then preflight_gate=1; fail "product checkout is not clean before QA"; fi
if [[ -z "$main_remote" ]]; then
  preflight_gate=1
  fail "remote main was not resolved"
else
  git fetch --no-tags origin "+refs/heads/main:refs/remotes/origin/main" \
    > "$EVIDENCE_DIR/logs/fetch-main.log" 2>&1
  fetch_main_status=$?
  record fetch_main_exit "$fetch_main_status"
  if [[ $fetch_main_status -ne 0 ]]; then
    preflight_gate=1
    fail "could not fetch current remote main"
  elif ! git merge-base --is-ancestor "$EXPECTED_BASE" "$main_remote"; then
    preflight_gate=1
    fail "expected base is not an ancestor of current remote main"
  else
    main_advance_count="$(git rev-list --count "$EXPECTED_BASE..$main_remote")"
    record current_main "$main_remote"
    record expected_base "$EXPECTED_BASE"
    record main_advanced_by "$main_advance_count"
  fi
fi

note "Environment safety"
env | cut -d= -f1 | grep -E '^(SUPABASE|POSTGRES|PG|STRIPE|EVERY)' | sort -u \
  | tee "$EVIDENCE_DIR/manifests/relevant-environment-variable-names-before-unset.txt" || true
for name in \
  SUPABASE_ACCESS_TOKEN SUPABASE_DB_PASSWORD SUPABASE_PROJECT_ID SUPABASE_PROJECT_REF \
  SUPABASE_URL SUPABASE_SERVICE_ROLE_KEY NEXT_PUBLIC_SUPABASE_URL \
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY STRIPE_SECRET_KEY STRIPE_WEBHOOK_SECRET \
  EVERY_ORG_WEBHOOK_SECRET DATABASE_URL DIRECT_URL POSTGRES_URL
  do unset "$name"; done
if env | cut -d= -f1 | grep -Eq '^(SUPABASE_ACCESS_TOKEN|SUPABASE_DB_PASSWORD|SUPABASE_PROJECT_ID|SUPABASE_PROJECT_REF|DATABASE_URL|DIRECT_URL|POSTGRES_URL)$'; then
  preflight_gate=1
  fail "remote-capable database environment variable remained set"
fi

note "Toolchain and host inventory"
{
  echo "runner_os=${RUNNER_OS:-unknown}"
  echo "runner_arch=${RUNNER_ARCH:-unknown}"
  uname -a
  cat /etc/os-release
  docker version
  node --version
  npm --version
  git --version
  supabase --version
} | tee "$EVIDENCE_DIR/toolchain.txt"
toolchain_status=${PIPESTATUS[0]}
record toolchain_exit "$toolchain_status"
if [[ $toolchain_status -ne 0 ]]; then preflight_gate=1; fail "toolchain inventory failed"; fi

note "Static migration audit"
python3 - <<'PY' | tee "$EVIDENCE_DIR/migration-inventory.txt"
from __future__ import annotations
from collections import defaultdict
from pathlib import Path
import hashlib, json, os, re
root = Path("supabase/migrations")
entries = sorted(root.iterdir(), key=lambda p: p.name)
files = [p for p in entries if p.is_file()]
rows=[]; versions=defaultdict(list)
for p in files:
    data=p.read_bytes(); m=re.match(r"^(\d+)_", p.name); version=m.group(1) if m else ""
    if version: versions[version].append(p.name)
    rows.append({
      "name":p.name,"version":version,"sql":p.suffix.lower()==".sql",
      "standard_14_digit_version":bool(re.fullmatch(r"\d{14}",version)),
      "size":len(data),"readable":os.access(p,os.R_OK),
      "sha256":hashlib.sha256(data).hexdigest(),
    })
duplicates={k:v for k,v in versions.items() if len(v)>1}
report={
  "total_entries":len(entries),"total_files":len(files),
  "sql_files":sum(r["sql"] for r in rows),"duplicates":duplicates,
  "nonstandard_versions":[r["name"] for r in rows if not r["standard_14_digit_version"]],
  "empty_files":[r["name"] for r in rows if r["size"]==0],
  "unreadable_files":[r["name"] for r in rows if not r["readable"]],
  "non_sql_files":[r["name"] for r in rows if not r["sql"]],
  "canonical_exists":(root/"20260814024354_harden_trade_donation_pool_component_trigger_rpc.sql").is_file(),
  "removed_absent":not (root/"20260813170151_harden_trade_donation_pool_component_trigger_rpc.sql").exists(),
  "files":rows,
}
print(json.dumps({k:v for k,v in report.items() if k!="files"},indent=2,sort_keys=True))
print("\nLEXICAL INVENTORY")
for r in rows:
    print(f"{r['name']}\tversion={r['version'] or 'NONE'}\tsize={r['size']}\tsha256={r['sha256']}")
Path(os.environ["EVIDENCE_DIR"],"manifests","migration-inventory.json").write_text(
  json.dumps(report,indent=2,sort_keys=True)+"\n",encoding="utf-8")
PY
static_status=${PIPESTATUS[0]}
record static_audit_exit "$static_status"
if [[ $static_status -ne 0 ]]; then preflight_gate=1; fail "static migration audit failed"; fi

for required in \
  supabase/migrations/20260727043000_moral_trade_create_service_rpc_hardening.sql \
  supabase/migrations/20260727043000_mpgf_equal_credit_advisory_ballots.sql \
  supabase/migrations/20260814024354_harden_trade_donation_pool_component_trigger_rpc.sql
  do [[ -f "$required" ]] || { preflight_gate=1; fail "required migration missing: $required"; }; done
[[ ! -e supabase/migrations/20260813170151_harden_trade_donation_pool_component_trigger_rpc.sql ]] \
  || { preflight_gate=1; fail "removed migration 20260813170151 is present"; }

{
  echo "### duplicate-version file digests and structural markers"
  for file in \
    supabase/migrations/20260727043000_moral_trade_create_service_rpc_hardening.sql \
    supabase/migrations/20260727043000_mpgf_equal_credit_advisory_ballots.sql
  do
    echo "## $file"; sha256sum "$file"; sed -n '1,40p' "$file"
    grep -Ein 'create (or replace )?(schema|table|function|index)|grant |revoke |drop function' "$file" | head -80 || true
  done
} > "$EVIDENCE_DIR/duplicate-version-source-inspection.txt"

{
  echo "### schema.sql first 100 lines"; sed -n '1,100p' supabase/schema.sql
  echo "### references to schema.sql"; git grep -n -I -E 'supabase/schema\.sql|schema\.sql' -- ':!supabase/schema.sql' || true
  echo "### migration/reset/snapshot documentation"; git grep -n -I -E 'generated schema|schema snapshot|db reset|migration baseline|supabase migrations' -- README.md docs src supabase/tests 2>/dev/null || true
} > "$EVIDENCE_DIR/schema-sql-role-evidence.txt"

if [[ $preflight_gate -ne 0 ]]; then
  db_gate=1
  record database_gate SKIPPED_PRECHECK
else
  note "Initialize ephemeral Supabase config"
  if [[ -f supabase/config.toml ]]; then
    db_gate=1
    fail "exact product head unexpectedly contains supabase/config.toml"
  else
    supabase init --force > "$EVIDENCE_DIR/logs/supabase-init.log" 2>&1
    init_status=$?
    cat "$EVIDENCE_DIR/logs/supabase-init.log"
    record supabase_init_exit "$init_status"
    if [[ $init_status -ne 0 ]]; then db_gate=1; fail "supabase init failed"; fi
  fi
fi

run_start() {
  local pass="$1" raw="$RUNNER_TEMP/${pass}-supabase-start.raw.log"
  supabase start > "$raw" 2>&1
  local status=$?
  sanitize_supabase_log < "$raw" > "$EVIDENCE_DIR/logs/${pass}-supabase-start.log"
  rm -f "$raw"
  cat "$EVIDENCE_DIR/logs/${pass}-supabase-start.log"
  record "${pass}_start_exit" "$status"
  if [[ $status -ne 0 ]]; then
    grep -E 'Applying migration|duplicate|ERROR|Error|SQLSTATE|failed|Failed|FATAL' \
      "$EVIDENCE_DIR/logs/${pass}-supabase-start.log" | tail -300 \
      > "$EVIDENCE_DIR/logs/${pass}-first-failure-extract.log" || true
  fi
  return "$status"
}

write_sql_files() {
cat > "$RUNNER_TEMP/pr654-catalog-assertions.sql" <<'SQL'
\set ON_ERROR_STOP on
DO $$
DECLARE
  t text;
  expected_tables text[] := ARRAY[
    'trade_donation_pool_gate_status','trade_donation_pool_obligations',
    'trade_donation_pool_bundles','trade_donation_pool_bundle_items',
    'trade_donation_pool_ledger_journals','trade_donation_pool_ledger_lines',
    'trade_donation_pool_stripe_events','trade_donation_pool_audit_events'
  ];
  helper_oid oid;
  freeze_oid oid;
  fn regprocedure;
  rls_enabled boolean;
  public_exec boolean;
  actor name;
  owner_name name;
  row_count bigint;
BEGIN
  FOREACH t IN ARRAY expected_tables LOOP
    IF to_regclass(format('public.%I', t)) IS NULL THEN RAISE EXCEPTION 'missing table %',t; END IF;
    SELECT c.relrowsecurity, pg_get_userbyid(c.relowner) INTO STRICT rls_enabled, owner_name
      FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
      WHERE n.nspname='public' AND c.relname=t;
    IF NOT rls_enabled THEN RAISE EXCEPTION 'RLS disabled on %',t; END IF;
    IF owner_name IN ('anon','authenticated') THEN RAISE EXCEPTION 'browser role owns %',t; END IF;
    FOREACH actor IN ARRAY ARRAY['anon'::name,'authenticated'::name] LOOP
      IF has_table_privilege(actor,format('public.%I',t),'INSERT')
        OR has_table_privilege(actor,format('public.%I',t),'UPDATE')
        OR has_table_privilege(actor,format('public.%I',t),'DELETE')
        OR has_table_privilege(actor,format('public.%I',t),'TRUNCATE')
      THEN RAISE EXCEPTION '% has DML on %',actor,t; END IF;
    END LOOP;
  END LOOP;

  SELECT p.oid INTO helper_oid FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
   WHERE n.nspname='public' AND p.proname='mark_trade_donation_pool_component_stale'
     AND pg_get_function_identity_arguments(p.oid)='';
  IF helper_oid IS NULL THEN RAISE EXCEPTION 'missing component-stale helper'; END IF;
  IF NOT (SELECT prosecdef FROM pg_proc WHERE oid=helper_oid) THEN RAISE EXCEPTION 'helper not SECURITY DEFINER'; END IF;
  IF NOT EXISTS (SELECT 1 FROM unnest(coalesce((SELECT proconfig FROM pg_proc WHERE oid=helper_oid),ARRAY[]::text[])) x WHERE x='search_path=pg_catalog')
    THEN RAISE EXCEPTION 'helper lacks search_path=pg_catalog'; END IF;
  SELECT EXISTS(SELECT 1 FROM pg_proc p,LATERAL aclexplode(coalesce(p.proacl,acldefault('f',p.proowner))) a
                WHERE p.oid=helper_oid AND a.grantee=0 AND a.privilege_type='EXECUTE') INTO public_exec;
  IF public_exec OR has_function_privilege('anon',helper_oid,'EXECUTE')
     OR has_function_privilege('authenticated',helper_oid,'EXECUTE')
     OR NOT has_function_privilege('service_role',helper_oid,'EXECUTE')
    THEN RAISE EXCEPTION 'helper ACL is not service-role-only'; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger tg JOIN pg_class c ON c.oid=tg.tgrelid JOIN pg_namespace n ON n.oid=c.relnamespace
                 WHERE n.nspname='public' AND c.relname='agreements'
                   AND tg.tgname='mark_trade_donation_pool_component_stale_trigger'
                   AND tg.tgfoid=helper_oid AND NOT tg.tgisinternal)
    THEN RAISE EXCEPTION 'component-stale trigger missing'; END IF;

  SELECT p.oid INTO freeze_oid FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
   WHERE n.nspname='moral_trade_private' AND p.proname='try_freeze_trade_donation_pool_bundle'
     AND pg_get_functiondef(p.oid) LIKE '%pg_advisory_xact_lock(hashtextextended(bundle_key_value, 0))%';
  IF freeze_oid IS NULL THEN RAISE EXCEPTION 'missing advisory-locked freeze function'; END IF;

  FOREACH fn IN ARRAY ARRAY[
    'public.create_trade_donation_pool_obligation(uuid,uuid,uuid,text,text,text,boolean)'::regprocedure,
    'public.attach_trade_donation_pool_checkout(uuid,uuid,text)'::regprocedure,
    'public.record_trade_donation_pool_stripe_success(text,text,boolean,text,boolean,uuid,text,text,text,integer,text,text)'::regprocedure,
    'public.record_trade_donation_pool_stripe_failure(text,text,boolean,text,boolean,uuid,text,text)'::regprocedure,
    'public.prepare_trade_donation_pool_refund(uuid,uuid)'::regprocedure,
    'public.record_trade_donation_pool_refund_or_dispute(text,text,boolean,text,boolean,uuid,boolean,integer,text)'::regprocedure,
    'public.start_trade_donation_pool_bundle_checkout(uuid,uuid,text)'::regprocedure,
    'public.complete_every_org_trade_donation_pool_bundle(uuid,text,text,text,integer,text,text,text,timestamptz,text,boolean,text,text)'::regprocedure
  ] LOOP
    IF has_function_privilege('PUBLIC',fn,'EXECUTE') OR has_function_privilege('anon',fn,'EXECUTE')
       OR has_function_privilege('authenticated',fn,'EXECUTE') OR NOT has_function_privilege('service_role',fn,'EXECUTE')
      THEN RAISE EXCEPTION 'unsafe function ACL for %',fn; END IF;
  END LOOP;

  IF to_regprocedure('public.moral_trade_create_submit_service(uuid,text,text,jsonb,text,text,text,text,text,jsonb,jsonb,jsonb)') IS NULL
    THEN RAISE EXCEPTION 'first duplicate-version migration effect missing'; END IF;
  IF to_regclass('public.mpgf_phase_one_rounds') IS NULL
    THEN RAISE EXCEPTION 'second duplicate-version migration effect missing'; END IF;

  FOREACH t IN ARRAY ARRAY[
    'trade_donation_pool_obligations','trade_donation_pool_bundles','trade_donation_pool_bundle_items',
    'trade_donation_pool_ledger_journals','trade_donation_pool_ledger_lines',
    'trade_donation_pool_stripe_events','trade_donation_pool_audit_events'
  ] LOOP
    EXECUTE format('select count(*) from public.%I',t) INTO row_count;
    IF row_count<>0 THEN RAISE EXCEPTION 'unexpected persisted rows in %: %',t,row_count; END IF;
  END LOOP;
END $$;
SELECT 'catalog_assertions_passed';
SQL

cat > "$RUNNER_TEMP/pr654-manifest.sql" <<'SQL'
\set ON_ERROR_STOP on
SELECT 'TABLE',n.nspname,c.relname,format('rls=%s owner=%s acl=%s',c.relrowsecurity,pg_get_userbyid(c.relowner),coalesce(c.relacl::text,'DEFAULT'))
FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
WHERE n.nspname='public' AND c.relname LIKE 'trade_donation_pool_%' ORDER BY c.relname;
SELECT 'FUNCTION',n.nspname,p.proname,format('args=%s security_definer=%s config=%s acl=%s',pg_get_function_identity_arguments(p.oid),p.prosecdef,coalesce(array_to_string(p.proconfig,','),''),coalesce(p.proacl::text,'DEFAULT'))
FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
WHERE (n.nspname='public' AND p.proname LIKE '%trade_donation_pool%') OR (n.nspname='moral_trade_private' AND p.proname LIKE '%trade_donation_pool%')
ORDER BY n.nspname,p.proname,pg_get_function_identity_arguments(p.oid);
SELECT 'TRIGGER',n.nspname,c.relname,format('%s -> %s',tg.tgname,tg.tgfoid::regprocedure)
FROM pg_trigger tg JOIN pg_class c ON c.oid=tg.tgrelid JOIN pg_namespace n ON n.oid=c.relnamespace
WHERE NOT tg.tgisinternal AND (c.relname LIKE 'trade_donation_pool_%' OR tg.tgname LIKE '%trade_donation_pool%')
ORDER BY n.nspname,c.relname,tg.tgname;
SELECT 'CONSTRAINT',n.nspname,c.relname,format('%s %s',con.conname,pg_get_constraintdef(con.oid,true))
FROM pg_constraint con JOIN pg_class c ON c.oid=con.conrelid JOIN pg_namespace n ON n.oid=c.relnamespace
WHERE n.nspname='public' AND c.relname LIKE 'trade_donation_pool_%' ORDER BY c.relname,con.conname;
SELECT 'INDEX',schemaname,tablename,format('%s %s',indexname,indexdef)
FROM pg_indexes WHERE schemaname='public' AND tablename LIKE 'trade_donation_pool_%' ORDER BY tablename,indexname;
SQL
}

run_db_assertions() {
  local pass="$1"
  note "$pass: database history, security, manifest, pgTAP, and lint"
  docker exec "$db_container" psql -X -v ON_ERROR_STOP=1 -U postgres -d postgres -At \
    -c "select row_to_json(x) from (select * from supabase_migrations.schema_migrations order by version) x" \
    | tee "$EVIDENCE_DIR/manifests/migration-history-${pass}.jsonl"
  local history_status=${PIPESTATUS[0]}

  docker exec -i "$db_container" psql -X -v ON_ERROR_STOP=1 -U postgres -d postgres \
    < "$RUNNER_TEMP/pr654-catalog-assertions.sql" \
    | tee "$EVIDENCE_DIR/logs/catalog-assertions-${pass}.log"
  local catalog_status=${PIPESTATUS[0]}

  docker exec -i "$db_container" psql -X -v ON_ERROR_STOP=1 -U postgres -d postgres -AtF $'\t' \
    < "$RUNNER_TEMP/pr654-manifest.sql" \
    | tee "$EVIDENCE_DIR/manifests/pooled-settlement-schema-${pass}.tsv"
  local manifest_status=${PIPESTATUS[0]}

  docker exec "$db_container" psql -X -v ON_ERROR_STOP=1 -U postgres -d postgres -AtF $'\t' \
    -c "select '20260727043000',count(*) from supabase_migrations.schema_migrations where version='20260727043000'; select '20260814024354',count(*) from supabase_migrations.schema_migrations where version='20260814024354'; select '20260813170151',count(*) from supabase_migrations.schema_migrations where version='20260813170151';" \
    | tee "$EVIDENCE_DIR/manifests/special-migration-history-${pass}.tsv"
  local special_status=${PIPESTATUS[0]}

  supabase test db > "$EVIDENCE_DIR/logs/pgtap-${pass}.log" 2>&1
  local pgtap_status=$?; cat "$EVIDENCE_DIR/logs/pgtap-${pass}.log"
  supabase db lint --local --level error > "$EVIDENCE_DIR/logs/db-lint-${pass}.log" 2>&1
  local lint_status=$?; cat "$EVIDENCE_DIR/logs/db-lint-${pass}.log"

  record "${pass}_history_exit" "$history_status"
  record "${pass}_catalog_exit" "$catalog_status"
  record "${pass}_manifest_exit" "$manifest_status"
  record "${pass}_special_history_exit" "$special_status"
  record "${pass}_pgtap_exit" "$pgtap_status"
  record "${pass}_db_lint_exit" "$lint_status"
  (( history_status || catalog_status || manifest_status || special_status || pgtap_status || lint_status )) && return 1
  return 0
}

if [[ $db_gate -eq 0 ]]; then
  note "Pass A: no-volume fresh local Supabase start"
  supabase stop --no-backup > "$EVIDENCE_DIR/logs/pre-pass-a-stop.log" 2>&1 || true
  docker ps -a --format '{{.ID}}\t{{.Names}}\t{{.Image}}\t{{.Status}}' | tee "$EVIDENCE_DIR/manifests/docker-before-pass-a.tsv"
  docker volume ls --format '{{.Name}}' | grep -E 'supabase|pr654|baseline|product' \
    | tee "$EVIDENCE_DIR/manifests/docker-volumes-before-pass-a.txt" || true
  if ! run_start pass-a; then
    db_gate=1; fail "Pass A empty-database migration replay failed"
  else
    db_started=1
  fi
fi

if [[ $db_started -eq 1 ]]; then
  note "Record local images and actual PostgreSQL version"
  docker ps --format '{{.ID}}\t{{.Names}}\t{{.Image}}\t{{.Status}}' | tee "$EVIDENCE_DIR/manifests/docker-pass-a.tsv"
  : > "$EVIDENCE_DIR/manifests/docker-image-identities.txt"
  while IFS=$'\t' read -r id name image status; do
    [[ -z "$id" ]] && continue
    docker inspect --format '{{.Name}}\t{{.Config.Image}}\t{{.Image}}' "$id" >> "$EVIDENCE_DIR/manifests/docker-image-identities.txt"
    docker image inspect --format '{{json .RepoDigests}}' "$image" >> "$EVIDENCE_DIR/manifests/docker-image-identities.txt" 2>/dev/null || true
  done < "$EVIDENCE_DIR/manifests/docker-pass-a.tsv"
  cat "$EVIDENCE_DIR/manifests/docker-image-identities.txt"
  db_container="$(docker ps --format '{{.Names}}' | grep '^supabase_db_' | head -1)"
  if [[ -z "$db_container" ]]; then
    db_gate=1; fail "local Supabase database container not found"
  else
    docker exec "$db_container" psql -X -v ON_ERROR_STOP=1 -U postgres -d postgres -Atc 'select version();' \
      | tee "$EVIDENCE_DIR/postgresql-version.txt"
    pg_status=${PIPESTATUS[0]}; record postgres_version_query_exit "$pg_status"
    if [[ $pg_status -ne 0 ]]; then db_gate=1; fail "PostgreSQL version query failed"; fi
  fi
fi

if [[ $db_started -eq 1 && -n "$db_container" ]]; then
  write_sql_files
  run_db_assertions pass-a || { db_gate=1; fail "Pass A assertions failed"; }
fi

if [[ $db_gate -eq 0 ]]; then
  note "Pass B: destructive local db reset and deterministic replay"
  supabase db reset --local --no-seed > "$EVIDENCE_DIR/logs/pass-b-reset.log" 2>&1
  reset_status=$?; cat "$EVIDENCE_DIR/logs/pass-b-reset.log"; record pass_b_reset_exit "$reset_status"
  if [[ $reset_status -ne 0 ]]; then
    db_gate=1; fail "Pass B db reset failed"
    grep -E 'Applying migration|duplicate|ERROR|Error|SQLSTATE|failed|Failed|FATAL' "$EVIDENCE_DIR/logs/pass-b-reset.log" | tail -300 > "$EVIDENCE_DIR/logs/pass-b-first-failure-extract.log" || true
  else
    run_db_assertions pass-b || { db_gate=1; fail "Pass B assertions failed"; }
  fi
fi

if [[ -f "$EVIDENCE_DIR/manifests/migration-history-pass-a.jsonl" && -f "$EVIDENCE_DIR/manifests/migration-history-pass-b.jsonl" ]]; then
  diff -u "$EVIDENCE_DIR/manifests/migration-history-pass-a.jsonl" "$EVIDENCE_DIR/manifests/migration-history-pass-b.jsonl" \
    | tee "$EVIDENCE_DIR/manifests/migration-history-pass-a-vs-b.diff"
  hist_diff=${PIPESTATUS[0]}; record migration_history_a_b_diff_exit "$hist_diff"
  if [[ $hist_diff -ne 0 ]]; then db_gate=1; fail "Pass A and Pass B migration histories differ"; fi
fi

if [[ $db_gate -eq 0 ]]; then
  note "Pass C: stop without backup, fresh start, and repeat"
  supabase stop --no-backup > "$EVIDENCE_DIR/logs/pass-c-stop.log" 2>&1
  stop_c=$?; record pass_c_stop_exit "$stop_c"
  if [[ $stop_c -ne 0 ]]; then db_gate=1; fail "Pass C stop failed";
  elif ! run_start pass-c; then db_gate=1; fail "Pass C fresh start failed";
  else
    db_container="$(docker ps --format '{{.Names}}' | grep '^supabase_db_' | head -1)"
    run_db_assertions pass-c || { db_gate=1; fail "Pass C assertions failed"; }
  fi
fi

if [[ $db_gate -eq 0 ]]; then record database_gate PASS; else overall=1; record database_gate FAIL; fi

note "Repository gates on exact product head"
required_paths=(
  src/lib/trade-donation-pool.test.ts
  src/lib/trade-donation-pool-source-contract.test.ts
  src/lib/moral-trade/pooled-settlement-trigger-privilege-migration.test.ts
  src/lib/trade-donation-pool.ts
  src/app/trade-donation-pool-actions.ts
  src/lib/payments/trade-donation-pool-webhook.ts
)
for path in "${required_paths[@]}"; do [[ -f "$path" ]] || { repo_gate=1; fail "required gate path missing: $path"; }; done

if [[ $repo_gate -eq 0 ]]; then npm ci > "$EVIDENCE_DIR/logs/npm-ci.log" 2>&1; s=$?; cat "$EVIDENCE_DIR/logs/npm-ci.log"; record npm_ci_exit "$s"; ((s)) && repo_gate=1; fi
if [[ $repo_gate -eq 0 ]]; then node --import tsx --test \
  src/lib/trade-donation-pool.test.ts src/lib/trade-donation-pool-source-contract.test.ts \
  src/lib/moral-trade/pooled-settlement-trigger-privilege-migration.test.ts \
  > "$EVIDENCE_DIR/logs/focused-tests.log" 2>&1; s=$?; cat "$EVIDENCE_DIR/logs/focused-tests.log"; record focused_tests_exit "$s"; ((s)) && repo_gate=1; fi
if [[ $repo_gate -eq 0 ]]; then npm test > "$EVIDENCE_DIR/logs/npm-test.log" 2>&1; s=$?; cat "$EVIDENCE_DIR/logs/npm-test.log"; record npm_test_exit "$s"; ((s)) && repo_gate=1; fi
if [[ $repo_gate -eq 0 ]]; then npx tsc --noEmit > "$EVIDENCE_DIR/logs/tsc.log" 2>&1; s=$?; cat "$EVIDENCE_DIR/logs/tsc.log"; record tsc_exit "$s"; ((s)) && repo_gate=1; fi
if [[ $repo_gate -eq 0 ]]; then npx eslint \
  src/lib/trade-donation-pool.ts src/lib/trade-donation-pool.test.ts \
  src/lib/trade-donation-pool-source-contract.test.ts \
  src/lib/moral-trade/pooled-settlement-trigger-privilege-migration.test.ts \
  src/app/trade-donation-pool-actions.ts src/lib/payments/trade-donation-pool-webhook.ts \
  > "$EVIDENCE_DIR/logs/eslint.log" 2>&1; s=$?; cat "$EVIDENCE_DIR/logs/eslint.log"; record eslint_exit "$s"; ((s)) && repo_gate=1; fi

git diff --check > "$EVIDENCE_DIR/logs/git-diff-check.log" 2>&1; s=$?; cat "$EVIDENCE_DIR/logs/git-diff-check.log"; record git_diff_check_exit "$s"; ((s)) && repo_gate=1
if [[ $repo_gate -eq 0 ]]; then npm run build > "$EVIDENCE_DIR/logs/npm-build.log" 2>&1; s=$?; cat "$EVIDENCE_DIR/logs/npm-build.log"; record npm_build_exit "$s"; ((s)) && repo_gate=1; fi
if [[ $repo_gate -eq 0 ]]; then record repository_gate PASS; else overall=1; record repository_gate FAIL; fi

note "Product diff and pre-cleanup state"
git diff --stat "$EXPECTED_BASE...$EXPECTED_PRODUCT_HEAD" | tee "$EVIDENCE_DIR/manifests/product-diff-stat.txt"
git diff --name-status "$EXPECTED_BASE...$EXPECTED_PRODUCT_HEAD" | tee "$EVIDENCE_DIR/manifests/product-diff-files.txt"
git status --short --branch | tee "$EVIDENCE_DIR/manifests/git-status-pre-cleanup.txt"

cleanup
trap - EXIT
if [[ $cleanup_gate -ne 0 ]]; then overall=1; fi

note "Credential scan and archive"
if grep -RIlE '(^|[^A-Za-z0-9])(eyJ[A-Za-z0-9_-]{20,}|sk_(live|test)_[A-Za-z0-9]|sb_secret_|postgres(ql)?://[^[:space:]]+:[^@[:space:]]+@)' "$EVIDENCE_DIR" \
  > "$EVIDENCE_DIR/manifests/credential-scan-hits.txt"; then
  overall=1; fail "credential-like material detected in evidence"
else
  : > "$EVIDENCE_DIR/manifests/credential-scan-hits.txt"
fi
record final_overall "$overall"
archive="$GITHUB_WORKSPACE/pr654-migration-baseline-v2-evidence.tar.gz"
tar -C "$(dirname "$EVIDENCE_DIR")" -czf "$archive" "$(basename "$EVIDENCE_DIR")"
sha256sum "$archive" | tee "$archive.sha256"
cp "$SUMMARY" "$GITHUB_WORKSPACE/pr654-migration-baseline-v2-summary.txt"
exit "$overall"
