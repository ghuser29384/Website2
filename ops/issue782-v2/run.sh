#!/usr/bin/env bash
set -Eeuo pipefail

MODE="${1:-execute}"
: "${GITHUB_WORKSPACE:?}"
: "${RUNNER_TEMP:?}"
: "${GITHUB_REPOSITORY:?}"
: "${GITHUB_RUN_ID:?}"

EXPECTED_MAIN_SHA=26d1fe436dbf9a4440bfafd501ddf8db944a1127
EXPECTED_MAIN_TREE=47fe96dfc881f1c57dea711283fc3db36a44e053
EXPECTED_PROJECT_ID=prj_Em3j7Uj7RatX2R1ZYhla3XSHRde7
VERCEL_TEAM_ID=team_ySu6sF3Uho1E1GnJtCQPVEuJ
RESTORE_DEPLOYMENT_ID=dpl_GbKHA9YfvjEW3iqymgY4uzp7MWsX
BACKUP_RUN_ID=32904854234
BACKUP_ARTIFACT_ID=9584433427
BACKUP_DIGEST=sha256:773149dde3b2512b3854e48c5adf1b1b4c16a627be3ed2c21207d947d9885835
EXPECTED_PROD_REF=jnpoxvalyjtdghnperyu
EXPECTED_PROD_HOST=aws-1-us-west-2.pooler.supabase.com
EXPECTED_PROD_USER=postgres.jnpoxvalyjtdghnperyu
VERCEL_CLI_VERSION=50.38.1
POSTGRES_IMAGE=postgres:17
SOURCE_DIR="$GITHUB_WORKSPACE/source"
CONTROLLER_DIR="$GITHUB_WORKSPACE/controller/issue782"
STATE_DIR="$RUNNER_TEMP/issue782-v2-state"
STATE_ENV="$STATE_DIR/state.env"
EVIDENCE_DIR="$GITHUB_WORKSPACE/issue782-v2-evidence"
mkdir -p "$STATE_DIR" "$EVIDENCE_DIR"
chmod 0700 "$STATE_DIR"
touch "$STATE_ENV"
chmod 0600 "$STATE_ENV"

stage() {
  local value="$1"
  printf 'STAGE=%q\n' "$value" >> "$STATE_ENV"
  printf '%s\n' "$value" > "$EVIDENCE_DIR/current-stage.txt"
  echo "[issue782-v2] stage=$value"
}
load_state() { source "$STATE_ENV" 2>/dev/null || true; }
set_state() { printf '%s=%q\n' "$1" "$2" >> "$STATE_ENV"; export "$1=$2"; }
psql_run() { docker run --rm -i "$POSTGRES_IMAGE" psql "$PROD_SUPABASE_DB_URL" --no-psqlrc --set ON_ERROR_STOP=1 "$@"; }
vercel() { npx --yes "vercel@$VERCEL_CLI_VERSION" "$@"; }

wait_for_prior_v1() {
  stage wait_for_prior_v1
  for attempt in $(seq 1 150); do
    gh api "repos/$GITHUB_REPOSITORY/actions/runs?branch=ops/dac-production-canonical-uat-26d1fe43-20260824&per_page=100" > "$STATE_DIR/runs.json"
    active="$(jq --arg name 'Issue 782 bounded canonical production UAT 20260826' '[.workflow_runs[] | select(.name==$name and .status!="completed")] | length' "$STATE_DIR/runs.json")"
    if test "$active" = 0; then break; fi
    sleep 60
  done
  test "$(jq --arg name 'Issue 782 bounded canonical production UAT 20260826' '[.workflow_runs[] | select(.name==$name and .status!="completed")] | length' "$STATE_DIR/runs.json")" = 0
  success_id="$(jq -r --arg name 'Issue 782 bounded canonical production UAT 20260826' '[.workflow_runs[] | select(.name==$name and .conclusion=="success")] | sort_by(.created_at) | last | .id // empty' "$STATE_DIR/runs.json")"
  if test -n "$success_id"; then
    gh api "repos/$GITHUB_REPOSITORY/actions/runs/$success_id/artifacts" > "$STATE_DIR/prior-artifacts.json"
    jq -e '.total_count>=1 and ([.artifacts[] | select(.expired==false)] | length)>=1' "$STATE_DIR/prior-artifacts.json" >/dev/null
    jq -n --argjson run "$success_id" --arg checkedAt "$(date -u +%FT%TZ)" '{priorSuccessfulRun:$run,reexecutionSkipped:true,checkedAt:$checkedAt}' > "$EVIDENCE_DIR/prior-success.json"
    set_state PREVIOUS_SUCCESS "$success_id"
    return 10
  fi
  return 0
}

exact_guard() {
  stage exact_guard
  test "$GITHUB_REPOSITORY" = ghuser29384/Website2
  test "$(git -C "$SOURCE_DIR" rev-parse HEAD)" = "$EXPECTED_MAIN_SHA"
  test "$(git -C "$SOURCE_DIR" rev-parse HEAD^{tree})" = "$EXPECTED_MAIN_TREE"
  test "$(git -C "$SOURCE_DIR" ls-remote origin refs/heads/main | awk '{print $1}')" = "$EXPECTED_MAIN_SHA"
  for state in in_progress queued; do
    gh api "repos/$GITHUB_REPOSITORY/actions/runs?status=$state&per_page=100" > "$STATE_DIR/actions-$state.json"
    jq -e --argjson current "$GITHUB_RUN_ID" '[.workflow_runs[] | select(.id!=$current) | select((.name//"")|test("(production|vercel|canonical.*uat|alias)";"i"))] | length==0' "$STATE_DIR/actions-$state.json" >/dev/null
  done
  gh api "repos/$GITHUB_REPOSITORY/actions/runs/$BACKUP_RUN_ID" > "$STATE_DIR/backup-run.json"
  gh api "repos/$GITHUB_REPOSITORY/actions/artifacts/$BACKUP_ARTIFACT_ID" > "$STATE_DIR/backup-artifact.json"
  jq -e '.status=="completed" and .conclusion=="success"' "$STATE_DIR/backup-run.json" >/dev/null
  jq -e --argjson id "$BACKUP_ARTIFACT_ID" --arg digest "$BACKUP_DIGEST" '.id==$id and .expired==false and .digest==$digest and (.expires_at|fromdateiso8601)>now' "$STATE_DIR/backup-artifact.json" >/dev/null

  curl -fsS -H "Authorization: Bearer $VERCEL_TOKEN" "https://api.vercel.com/v13/deployments/$RESTORE_DEPLOYMENT_ID?teamId=$VERCEL_TEAM_ID" > "$STATE_DIR/restore.json"
  jq -e --arg id "$RESTORE_DEPLOYMENT_ID" --arg p "$EXPECTED_PROJECT_ID" --arg sha "$EXPECTED_MAIN_SHA" '((.id//.uid)==$id) and ((.projectId//.project.id//"")==$p) and .readyState=="READY" and .target=="production" and .meta.githubCommitSha==$sha and ((.alias//[])|any(.=="moraltrade.org")) and ((.alias//[])|any(.=="www.moraltrade.org"))' "$STATE_DIR/restore.json" >/dev/null
  set_state RESTORE_URL "https://$(jq -r .url "$STATE_DIR/restore.json")"
  for domain in moraltrade.org www.moraltrade.org; do
    curl -fsS -H "Authorization: Bearer $VERCEL_TOKEN" "https://api.vercel.com/v4/aliases/$domain?projectId=$EXPECTED_PROJECT_ID&teamId=$VERCEL_TEAM_ID" | jq -e --arg id "$RESTORE_DEPLOYMENT_ID" '(.deploymentId//.deployment.id//.deployment.uid)==$id' >/dev/null
  done

  curl -fsS -H "Authorization: Bearer $VERCEL_TOKEN" "https://api.vercel.com/v10/projects/$EXPECTED_PROJECT_ID/env?teamId=$VERCEL_TEAM_ID&decrypt=true&source=issue782-v2-preflight" > "$STATE_DIR/env-before.json"
  jq -e '[.envs[]? | select(.key=="ADMIN_EMAILS") | select((.target|type)=="array" and (.target|index("production"))!=null)] | length==0' "$STATE_DIR/env-before.json" >/dev/null
  rm -f "$STATE_DIR/env-before.json"

  URL_TO_CHECK="$PROD_SUPABASE_DB_URL" node <<'NODE'
  const u=new URL(process.env.URL_TO_CHECK);
  if(!(["postgres:","postgresql:"].includes(u.protocol)&&decodeURIComponent(u.username)===process.env.EXPECTED_PROD_USER&&u.hostname===process.env.EXPECTED_PROD_HOST&&u.port==="5432"&&u.pathname==="/postgres"&&u.searchParams.get("sslmode")==="require"&&u.password&&!u.href.includes("hvmxfjjbdcgjjudmthdz"))) throw new Error('wrong production database');
NODE
  docker pull "$POSTGRES_IMAGE" >/dev/null
  cat > "$STATE_DIR/db-guard.sql" <<'SQL'
\set ON_ERROR_STOP on
\pset tuples_only on
\pset format unaligned
set statement_timeout='60s';
begin transaction read only;
do $g$
declare total bigint;
begin
  if (select count(*) from supabase_migrations.schema_migrations where version in ('20260806110000','20260806143000','20260806173000','20260807050000','20260807100000','20260812073000','20260812074500','20260815010000','20260815011000','20260818173000','20260818174000'))<>11 then raise exception 'migration count'; end if;
  if to_regprocedure('public.mpgf_review_dac_pledge_eligibility(uuid,uuid,text,integer,text)') is null or to_regprocedure('public.mpgf_finalize_dac_campaign(text,uuid,text)') is null or to_regprocedure('public.mpgf_public_dac_campaign_terms(text)') is null then raise exception 'functions'; end if;
  if has_table_privilege('anon','public.mpgf_public_goods_campaigns','SELECT') or has_column_privilege('anon','public.mpgf_public_goods_campaigns','published_by','SELECT') or has_column_privilege('authenticated','public.mpgf_dac_campaign_outcomes','outcome_json','SELECT') then raise exception 'privacy'; end if;
  select (select count(*) from public.mpgf_pool_proposals)+(select count(*) from public.mpgf_pool_reviewers)+(select count(*) from public.mpgf_pool_proposal_versions)+(select count(*) from public.mpgf_pool_lifecycle_events)+(select count(*) from public.mpgf_public_goods_match_pools)+(select count(*) from public.mpgf_public_goods_rounds)+(select count(*) from public.mpgf_public_goods_campaigns)+(select count(*) from public.mpgf_public_goods_pledges)+(select count(*) from public.mpgf_dac_pledge_intents)+(select count(*) from public.mpgf_dac_pledge_events)+(select count(*) from public.mpgf_dac_campaign_outcomes) into total;
  if total<>0 then raise exception 'rows %',total; end if;
  if (select count(*) from public.mpgf_public_goods_pledges where payment_intent_ref is not null or status='captured')<>0 then raise exception 'payments'; end if;
end;$g$;
select json_build_object('migrations',11,'rows',0,'paymentReferences',0,'privacy',true);
rollback;
SQL
  psql_run < "$STATE_DIR/db-guard.sql" | grep -E '^\{' | tail -n1 > "$EVIDENCE_DIR/db-preflight.json"
  jq -e '.migrations==11 and .rows==0 and .paymentReferences==0 and .privacy==true' "$EVIDENCE_DIR/db-preflight.json" >/dev/null
}

prepare_namespace() {
  stage prepare_namespace
  export I782_STATE_DIR="$STATE_DIR" I782_SOURCE_ROOT="$SOURCE_DIR" I782_PLANNED_MANIFEST="$STATE_DIR/ownership-planned.json"
  export GITHUB_ENV="$STATE_DIR/generated.env"
  : > "$GITHUB_ENV"
  node "$CONTROLLER_DIR/namespace.mjs" > "$EVIDENCE_DIR/namespace.log"
  source "$GITHUB_ENV"
  for v in I782_NAMESPACE I782_NAMESPACE_SHA256 I782_PLANNED_MANIFEST I782_CREATOR_EMAIL I782_REVIEWER_EMAIL I782_PLEDGER_EMAIL I782_OUTSIDER_EMAIL I782_PROBE_PRE_EMAIL I782_PROBE_CANONICAL_EMAIL; do set_state "$v" "${!v}"; done
  cp "$STATE_DIR/ownership-redacted.json" "$EVIDENCE_DIR/ownership-redacted.json"
  local pw; pw="$(openssl rand -base64 48 | tr -d '\n')"; test -n "$pw"; echo "::add-mask::$pw"; set_state I782_QA_PASSWORD "$pw"
  emails="'$I782_CREATOR_EMAIL','$I782_REVIEWER_EMAIL','$I782_PLEDGER_EMAIL','$I782_OUTSIDER_EMAIL','$I782_PROBE_PRE_EMAIL','$I782_PROBE_CANONICAL_EMAIL'"
  test "$(psql_run --tuples-only --no-align --command "select count(*) from auth.users where email in ($emails);")" = 0
}

source_gates() {
  stage source_gates
  cd "$SOURCE_DIR"
  export ADMIN_EMAILS="$I782_REVIEWER_EMAIL" NEXT_PUBLIC_SITE_URL=https://www.moraltrade.org SITE_URL=https://www.moraltrade.org VERCEL=1 VERCEL_ENV=production
  export CONDITIONAL_PAYMENTS_MODE=disabled TRADE_DONATION_POOL_ENABLED=false TRADE_DONATION_POOL_MODE=disabled DIRECT_DONATION_UPGRADES_ENABLED=false DIRECT_DONATION_UPGRADE_MODE=disabled MPGF_REAL_MONEY_ENABLED=false MPGF_REAL_MONEY_ACCEPTANCE_ENABLED=false MPGF_TEST_PAYMENT_ENABLED=false EVERY_ORG_PLEDGE_DONATIONS_ENABLED=false PLAYWRIGHT_HTML_OPEN=never
  npm test > "$EVIDENCE_DIR/repository-tests.log" 2>&1
  npm run lint -- --quiet > "$EVIDENCE_DIR/lint.log" 2>&1
  npx tsc --noEmit > "$EVIDENCE_DIR/typecheck.log" 2>&1
  npm run build > "$EVIDENCE_DIR/repository-build.log" 2>&1
  npx playwright install --with-deps chromium >/dev/null
  npm run test:e2e:release -- --reporter=line > "$EVIDENCE_DIR/release-browser.log" 2>&1
  git diff --check
}

add_admin_env() {
  stage add_admin_env
  jq -n --arg value "$I782_REVIEWER_EMAIL" '{key:"ADMIN_EMAILS",value:$value,type:"plain",target:["production"]}' > "$STATE_DIR/create-env.json"
  curl -fsS -X POST -H "Authorization: Bearer $VERCEL_TOKEN" -H 'Content-Type: application/json' "https://api.vercel.com/v10/projects/$EXPECTED_PROJECT_ID/env?teamId=$VERCEL_TEAM_ID" --data-binary @"$STATE_DIR/create-env.json" > "$STATE_DIR/create-env-response.json"
  id="$(jq -r '.id//.created[0].id//empty' "$STATE_DIR/create-env-response.json")"; test -n "$id"; set_state ADMIN_ENV_ID "$id"
  curl -fsS -H "Authorization: Bearer $VERCEL_TOKEN" "https://api.vercel.com/v10/projects/$EXPECTED_PROJECT_ID/env?teamId=$VERCEL_TEAM_ID&decrypt=true&source=issue782-v2" > "$STATE_DIR/env-after.json"
  jq -e --arg id "$id" --arg value "$I782_REVIEWER_EMAIL" '[.envs[]? | select(.id==$id and .key=="ADMIN_EMAILS" and .value==$value) | select(.target==["production"])] | length==1' "$STATE_DIR/env-after.json" >/dev/null
  rm -f "$STATE_DIR/create-env.json" "$STATE_DIR/create-env-response.json" "$STATE_DIR/env-after.json"
  jq -n --arg id "$id" --arg namespace "$I782_NAMESPACE" '{envId:$id,target:["production"],syntheticInvalidDomain:true,namespace:$namespace}' > "$EVIDENCE_DIR/admin-env-created.json"
}

build_and_deploy() {
  stage build_and_deploy
  cd "$SOURCE_DIR"
  mkdir -p .vercel
  jq -n --arg orgId "$VERCEL_ORG_ID" --arg projectId "$EXPECTED_PROJECT_ID" '{orgId:$orgId,projectId:$projectId}' > .vercel/project.json
  vercel pull --yes --environment=production --token="$VERCEL_TOKEN" > "$STATE_DIR/vercel-pull.log" 2>&1
  test -f .vercel/.env.production.local
  ENV_FILE=.vercel/.env.production.local node <<'NODE'
  const fs=require('node:fs'),p=process.env.ENV_FILE,t=fs.readFileSync(p,'utf8'),e={};for(const r of t.split(/\r?\n/)){if(!r||r.startsWith('#')||!r.includes('='))continue;const i=r.indexOf('=');let v=r.slice(i+1),k=r.slice(0,i);if(v.startsWith('"')&&v.endsWith('"')){try{v=JSON.parse(v)}catch{v=v.slice(1,-1)}}else if(v.startsWith("'")&&v.endsWith("'"))v=v.slice(1,-1);e[k]=v}if(e.ADMIN_EMAILS!==process.env.I782_REVIEWER_EMAIL)throw new Error('admin env');for(const [k,v] of Object.entries({CONDITIONAL_PAYMENTS_MODE:'disabled',TRADE_DONATION_POOL_ENABLED:'false',TRADE_DONATION_POOL_MODE:'disabled',DIRECT_DONATION_UPGRADES_ENABLED:'false',DIRECT_DONATION_UPGRADE_MODE:'disabled'}))if(e[k]!==v)throw new Error(k);for(const k of ['NEXT_PUBLIC_SUPABASE_URL','NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY','SUPABASE_SERVICE_ROLE_KEY']){if(!e[k])throw new Error(k);console.log(`::add-mask::${e[k]}`);fs.appendFileSync(process.env.STATE_ENV,`${k}=${JSON.stringify(e[k])}\n`)}
NODE
  load_state; export NEXT_PUBLIC_SUPABASE_URL NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY SUPABASE_SERVICE_ROLE_KEY; echo "::add-mask::$SUPABASE_SERVICE_ROLE_KEY"
  rm -rf .next .vercel/output
  export VERCEL_GIT_PROVIDER=github VERCEL_GIT_REPO_OWNER=ghuser29384 VERCEL_GIT_REPO_SLUG=Website2 VERCEL_GIT_COMMIT_REF=main VERCEL_GIT_COMMIT_SHA="$EXPECTED_MAIN_SHA" VERCEL_GIT_COMMIT_MESSAGE='Issue 782 bounded synthetic-admin UAT'
  vercel build --prod --token="$VERCEL_TOKEN" > "$EVIDENCE_DIR/vercel-build.log" 2>&1
  STATIC_SOURCE_DIR=public STATIC_BUILD_DIR=.vercel/output/static STATIC_EVIDENCE_DIR="$EVIDENCE_DIR" STATIC_CRITICAL_ASSET=moral-trade-live-create-router.js node scripts/vercel-static-artifact-integrity.mjs > "$EVIDENCE_DIR/static-integrity.log"
  jq -e '.fileCount>0 and (.critical.sha256|length)==64' "$EVIDENCE_DIR/static-artifact-integrity.json" >/dev/null
  find .vercel/output -type f -print0|sort -z|xargs -0 sha256sum > "$EVIDENCE_DIR/prebuilt-files.sha256"
  vercel deploy --help|grep -q -- '--skip-domain'
  output="$(vercel deploy --prebuilt --prod --skip-domain --yes --token="$VERCEL_TOKEN" 2>"$STATE_DIR/deploy.stderr")"
  url="$(printf '%s\n' "$output"|grep -Eo 'https://[^[:space:]]+\.vercel\.app'|tail -n1)"; [[ "$url" =~ ^https://[A-Za-z0-9.-]+\.vercel\.app$ ]]
  host="${url#https://}"; curl -fsS -H "Authorization: Bearer $VERCEL_TOKEN" "https://api.vercel.com/v13/deployments/$host?teamId=$VERCEL_TEAM_ID" > "$STATE_DIR/temp.json"
  id="$(jq -r '.id//.uid//empty' "$STATE_DIR/temp.json")"; jq -e --arg id "$id" --arg p "$EXPECTED_PROJECT_ID" --arg sha "$EXPECTED_MAIN_SHA" '((.id//.uid)==$id) and ((.projectId//.project.id//"")==$p) and .readyState=="READY" and .target=="production" and .meta.githubCommitSha==$sha and ((.alias//[])|length)==0' "$STATE_DIR/temp.json" >/dev/null
  set_state TEMP_ID "$id"; set_state TEMP_URL "$url"
  curl -fsS -H 'Cache-Control: no-cache' "$url/moral-trade-live-create-router.js?run=$GITHUB_RUN_ID" -o "$STATE_DIR/router.js"; cmp --silent public/moral-trade-live-create-router.js "$STATE_DIR/router.js"
  jq -n --arg id "$id" --arg url "$url" --arg sha "$EXPECTED_MAIN_SHA" '{deploymentId:$id,deploymentUrl:$url,sourceSha:$sha,target:"production",ready:true,aliases:[],criticalAssetExact:true}' > "$EVIDENCE_DIR/temp-deployment.json"
}

create_users_and_files() {
  stage create_users_and_files
  cd "$SOURCE_DIR"; load_state
  export I782_STATE_DIR="$STATE_DIR" I782_SOURCE_ROOT="$SOURCE_DIR" I782_PLANNED_MANIFEST="$STATE_DIR/ownership-planned.json" I782_AUTH_MODE=create I782_AUTH_STATE="$STATE_DIR/auth-state.json" I782_AUTH_EVIDENCE="$STATE_DIR/auth-created.json" GITHUB_ENV="$STATE_DIR/auth.env"
  : > "$GITHUB_ENV"; node "$CONTROLLER_DIR/auth-users.mjs" > "$EVIDENCE_DIR/auth-create.log"; source "$GITHUB_ENV"; for v in I782_CREATOR_ID I782_REVIEWER_ID I782_PLEDGER_ID I782_OUTSIDER_ID I782_PROBE_PRE_ID I782_PROBE_CANONICAL_ID; do set_state "$v" "${!v}"; done
  node "$CONTROLLER_DIR/transform-fixtures-v2.mjs" > "$EVIDENCE_DIR/fixture-transform.log"; cp "$STATE_DIR/transform-evidence.json" "$EVIDENCE_DIR/transform-evidence.json"; cp "$STATE_DIR/auth-created.json" "$EVIDENCE_DIR/auth-created.json"
  psql_run < "$STATE_DIR/collision.sql"|grep -E '^\{'|tail -n1 > "$EVIDENCE_DIR/collision.json"; jq -e '[.[]]|add==0' "$EVIDENCE_DIR/collision.json" >/dev/null
}

fixture_apply() { psql_run --file /state/fixture.sql < /dev/null; }
app_cleanup() { psql_run --file /state/app-cleanup.sql < /dev/null; }
run_fixture_file() { docker run --rm -i -v "$STATE_DIR:/state:ro" "$POSTGRES_IMAGE" psql "$PROD_SUPABASE_DB_URL" --no-psqlrc --set ON_ERROR_STOP=1 --file "/state/$1"; }

run_stage_uat() {
  local phase="$1" bases="$2" probe="$3" dacbase="$4"
  stage "uat_$phase"; cd "$SOURCE_DIR"; load_state
  run_fixture_file fixture.sql > "$EVIDENCE_DIR/$phase-fixture.log" 2>&1; set_state APP_ACTIVE true
  export I782_BASE_URLS="$bases" I782_PROBE_ROLE="$probe" I782_AUTH_STATE="$STATE_DIR/auth-state.json" I782_AUTH_UAT_DIR="$EVIDENCE_DIR/$phase-auth" I782_QA_PASSWORD NEXT_PUBLIC_SUPABASE_URL NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY SUPABASE_SERVICE_ROLE_KEY
  node "$CONTROLLER_DIR/auth-uat-v2.mjs" > "$EVIDENCE_DIR/$phase-auth.log" 2>&1
  export MPGF_DAC_PRODUCT_BASE_URL="$dacbase" PLAYWRIGHT_BASE_URL="$dacbase" NEXT_PUBLIC_SITE_URL="$dacbase" MPGF_DAC_PRODUCT_QA_PASSWORD="$I782_QA_PASSWORD" I782_SCREENSHOT_DIR="$EVIDENCE_DIR/$phase-dac" ADMIN_EMAILS="$I782_REVIEWER_EMAIL" PLAYWRIGHT_HTML_OPEN=never
  npx playwright test tests/create-entry-routing.spec.ts tests/create-route-ui-regression.spec.ts --project=chromium --reporter=line > "$EVIDENCE_DIR/$phase-create.log" 2>&1
  npx playwright test tests/issue782-runtime-dac.spec.ts --project=chromium --reporter=line > "$EVIDENCE_DIR/$phase-dac.log" 2>&1
  run_fixture_file app-cleanup.sql > "$EVIDENCE_DIR/$phase-app-cleanup.log" 2>&1; set_state APP_ACTIVE false
  psql_run < "$STATE_DIR/collision.sql"|grep -E '^\{'|tail -n1 > "$EVIDENCE_DIR/$phase-app-zero.json"; jq -e '[.[]]|add==0' "$EVIDENCE_DIR/$phase-app-zero.json" >/dev/null
}

move_aliases() {
  stage move_aliases; cd "$SOURCE_DIR"; load_state
  test "$(git ls-remote origin refs/heads/main|awk '{print $1}')" = "$EXPECTED_MAIN_SHA"
  set_state ALIAS_START "$(date -u +%s)"; set_state ALIAS_TOUCHED true
  vercel alias set "$TEMP_URL" moraltrade.org --token="$VERCEL_TOKEN" > "$EVIDENCE_DIR/alias-apex.log" 2>&1
  vercel alias set "$TEMP_URL" www.moraltrade.org --token="$VERCEL_TOKEN" > "$EVIDENCE_DIR/alias-www.log" 2>&1
  for d in moraltrade.org www.moraltrade.org; do curl -fsS -H "Authorization: Bearer $VERCEL_TOKEN" "https://api.vercel.com/v4/aliases/$d?projectId=$EXPECTED_PROJECT_ID&teamId=$VERCEL_TEAM_ID"|jq -e --arg id "$TEMP_ID" '(.deploymentId//.deployment.id//.deployment.uid)==$id' >/dev/null; done
}

logs_check() {
  stage logs_check; cd "$SOURCE_DIR"; load_state
  start="$(cat "$EVIDENCE_DIR/prealias-start" 2>/dev/null||echo "$ALIAS_START")"; end="$(date -u +%s)"
  vercel logs "$TEMP_URL" --since "$start" --until "$end" --json --token="$VERCEL_TOKEN" > "$STATE_DIR/logs.jsonl"
  RAW="$STATE_DIR/logs.jsonl" OUT="$EVIDENCE_DIR/log-summary.json" node <<'NODE'
  const fs=require('node:fs'),ls=fs.readFileSync(process.env.RAW,'utf8').split(/\r?\n/);let n=0,e=0,p=0,s=0;for(const l of ls){if(!l.trim())continue;let r;try{r=JSON.parse(l)}catch{continue}n++;const t=JSON.stringify(r),lv=String(r.level||'').toLowerCase(),st=Number(r.statusCode||r.status||0);if(lv==='error'||lv==='fatal'||st>=500)e++;if(/(paymentintent|setupintent|checkout session|stripe|every\.org|charge created|capture succeeded|payout created)/i.test(t))p++;if(/(service_role|postgres(?:ql)?:\/\/|sk_(live|test)_|whsec_|private key|bearer\s+[a-z0-9._-]{20,})/i.test(t))s++}const o={entries:n,errorsOr5xx:e,paymentProviderSignals:p,secretLeakSignals:s};fs.writeFileSync(process.env.OUT,JSON.stringify(o,null,2)+'\n');if(e||p||s)throw new Error(JSON.stringify(o));
NODE
  rm -f "$STATE_DIR/logs.jsonl"
}

cleanup() {
  set +e; load_state; stage cleanup
  if test -n "${RESTORE_URL:-}"; then
    cd "$SOURCE_DIR" 2>/dev/null || true
    vercel alias set "$RESTORE_URL" moraltrade.org --token="$VERCEL_TOKEN" > "$EVIDENCE_DIR/restore-apex.log" 2>&1
    vercel alias set "$RESTORE_URL" www.moraltrade.org --token="$VERCEL_TOKEN" > "$EVIDENCE_DIR/restore-www.log" 2>&1
  fi
  alias_ok=true
  for d in moraltrade.org www.moraltrade.org; do curl -fsS -H "Authorization: Bearer $VERCEL_TOKEN" "https://api.vercel.com/v4/aliases/$d?projectId=$EXPECTED_PROJECT_ID&teamId=$VERCEL_TEAM_ID"|jq -e --arg id "$RESTORE_DEPLOYMENT_ID" '(.deploymentId//.deployment.id//.deployment.uid)==$id' >/dev/null || alias_ok=false; done
  if test "${APP_ACTIVE:-false}" = true && test -f "$STATE_DIR/app-cleanup.sql"; then run_fixture_file app-cleanup.sql > "$EVIDENCE_DIR/final-app-cleanup.log" 2>&1 || true; fi
  if test -f "$STATE_DIR/profile-cleanup.sql"; then run_fixture_file profile-cleanup.sql > "$EVIDENCE_DIR/final-profile-cleanup.log" 2>&1 || true; fi
  if test -f "$STATE_DIR/auth-state.json" && test -n "${NEXT_PUBLIC_SUPABASE_URL:-}" && test -n "${SUPABASE_SERVICE_ROLE_KEY:-}"; then
    cd "$SOURCE_DIR"; export I782_AUTH_MODE=cleanup I782_AUTH_STATE="$STATE_DIR/auth-state.json" I782_AUTH_EVIDENCE="$STATE_DIR/auth-cleanup.json" I782_PLANNED_MANIFEST="$STATE_DIR/ownership-planned.json"; node "$CONTROLLER_DIR/auth-users.mjs" > "$EVIDENCE_DIR/auth-cleanup.log" 2>&1; cp "$STATE_DIR/auth-cleanup.json" "$EVIDENCE_DIR/auth-cleanup.json" 2>/dev/null||true
  fi
  if test -z "${ADMIN_ENV_ID:-}"; then
    curl -fsS -H "Authorization: Bearer $VERCEL_TOKEN" "https://api.vercel.com/v10/projects/$EXPECTED_PROJECT_ID/env?teamId=$VERCEL_TEAM_ID&decrypt=true&source=issue782-v2-cleanup" > "$STATE_DIR/env-lookup.json" 2>/dev/null
    ADMIN_ENV_ID="$(jq -r --arg v "${I782_REVIEWER_EMAIL:-}" '[.envs[]?|select(.key=="ADMIN_EMAILS" and .value==$v and .target==["production"])][0].id//empty' "$STATE_DIR/env-lookup.json" 2>/dev/null)"
  fi
  if test -n "${ADMIN_ENV_ID:-}"; then curl -fsS -X DELETE -H "Authorization: Bearer $VERCEL_TOKEN" "https://api.vercel.com/v9/projects/$EXPECTED_PROJECT_ID/env/$ADMIN_ENV_ID?teamId=$VERCEL_TEAM_ID" > "$STATE_DIR/env-delete.json" 2>/dev/null; fi
  curl -fsS -H "Authorization: Bearer $VERCEL_TOKEN" "https://api.vercel.com/v10/projects/$EXPECTED_PROJECT_ID/env?teamId=$VERCEL_TEAM_ID&decrypt=true&source=issue782-v2-final" > "$STATE_DIR/env-final.json" 2>/dev/null
  env_ok=false; jq -e '[.envs[]?|select(.key=="ADMIN_EMAILS")|select((.target|type)=="array" and (.target|index("production"))!=null)]|length==0' "$STATE_DIR/env-final.json" >/dev/null 2>&1 && env_ok=true
  if test -n "${TEMP_URL:-}"; then cd "$SOURCE_DIR"; vercel remove "$TEMP_URL" --yes --token="$VERCEL_TOKEN" > "$EVIDENCE_DIR/temp-delete.log" 2>&1 || true; fi
  zero_ok=false
  if test -f "$STATE_DIR/zero.sql"; then psql_run < "$STATE_DIR/zero.sql"|grep -E '^\{'|tail -n1 > "$EVIDENCE_DIR/zero-residue.json"; jq -e '.authUsers==0 and .profiles==0 and .personAccounts==0 and .proposals==0 and .campaigns==0 and .pledges==0 and .paymentReferences==0' "$EVIDENCE_DIR/zero-residue.json" >/dev/null 2>&1 && zero_ok=true; fi
  global_pay="$(psql_run --tuples-only --no-align --command "select count(*) from public.mpgf_public_goods_pledges where payment_intent_ref is not null or status='captured';" 2>/dev/null|tr -d '[:space:]')"
  duration=0; if test -n "${ALIAS_START:-}"; then duration="$(( $(date -u +%s)-ALIAS_START ))"; fi
  jq -n --argjson aliases "$alias_ok" --argjson env "$env_ok" --argjson zero "$zero_ok" --arg pay "$global_pay" --argjson seconds "$duration" '{aliasesRestored:$aliases,adminEnvironmentRestored:$env,exactOwnedZeroResidue:$zero,globalPaymentReferences:($pay|tonumber),aliasIntervalSeconds:$seconds,withinNinetyMinutes:($seconds<=5400)}' > "$EVIDENCE_DIR/cleanup-summary.json"
  rm -rf "$SOURCE_DIR/.vercel" "$SOURCE_DIR/.issue782-controller" "$SOURCE_DIR/tests/issue782-runtime-dac.spec.ts" "$STATE_DIR"/password "$STATE_DIR"/env-*.json "$STATE_DIR"/*response*.json "$STATE_DIR"/*.stderr "$STATE_DIR"/router.js
  if $alias_ok && $env_ok && { $zero_ok || test ! -f "$STATE_DIR/zero.sql"; } && test "$global_pay" = 0 && test "$duration" -le 5400; then return 0; else return 1; fi
}

finalize_success() {
  stage finalize_success
  python3 - <<'PY' > "$EVIDENCE_DIR/privacy-scan.json"
from pathlib import Path
import json,re
root=Path('issue782-v2-evidence'); pats=[re.compile(rb'postgres(?:ql)?://',re.I),re.compile(rb'eyJ[A-Za-z0-9_-]{12,}\.'),re.compile(rb'Bearer\s+[A-Za-z0-9._~+/-]{20,}',re.I),re.compile(rb'PRIVATE KEY'),re.compile(rb'(?:sk_(?:live|test)_|whsec_)[A-Za-z0-9_-]{8,}',re.I)]; f=[]; files=[]
for p in root.rglob('*'):
  if not p.is_file() or p.suffix.lower() in {'.png','.jpg','.jpeg','.webp'}: continue
  files.append(p); d=p.read_bytes()
  for x in pats:
    if x.search(d): f.append(str(p))
print(json.dumps({'textFilesScanned':len(files),'findings':sorted(set(f))}))
if f: raise SystemExit(1)
PY
  find "$EVIDENCE_DIR" -type f -print0|sort -z|xargs -0 sha256sum > "$EVIDENCE_DIR/files.sha256"
  sha256sum "$EVIDENCE_DIR/files.sha256"|awk '{print $1}' > "$EVIDENCE_DIR/evidence-tree.sha256"
  body=$(cat <<EOF
## Issue 782 bounded canonical production UAT passed

- exact main: \`$EXPECTED_MAIN_SHA\`
- exact tree: \`$EXPECTED_MAIN_TREE\`
- workflow run: \`$GITHUB_RUN_ID\`
- temporary exact-SHA deployment: created without aliases, accepted, then deleted
- canonical aliases: temporarily exercised and restored to \`$RESTORE_DEPLOYMENT_ID\`
- temporary production ADMIN_EMAILS: removed; final production entries 0
- Auth/Create/strictly-non-payment DAC UAT: passed pre-alias and canonical
- exact-owned synthetic residue: 0
- payment/provider references and signals: 0
- alias interval: within 90 minutes

No migration, runtime change, real-participant access, provider activation, payment, custody, escrow, settlement, transfer, refund, bonus, premium, or payout occurred.
EOF
)
  gh issue comment 782 --repo "$GITHUB_REPOSITORY" --body "$body"; gh issue comment 783 --repo "$GITHUB_REPOSITORY" --body "$body"
  gh issue close 782 --repo "$GITHUB_REPOSITORY" --reason completed
  gh issue close 783 --repo "$GITHUB_REPOSITORY" --reason completed
}

if test "$MODE" = cleanup; then cleanup; exit $?; fi

export EXPECTED_PROD_REF EXPECTED_PROD_HOST EXPECTED_PROD_USER EXPECTED_PROJECT_ID VERCEL_TEAM_ID RESTORE_DEPLOYMENT_ID BACKUP_RUN_ID BACKUP_ARTIFACT_ID BACKUP_DIGEST POSTGRES_IMAGE VERCEL_CLI_VERSION EVIDENCE_DIR STATE_ENV
load_state
if wait_for_prior_v1; then :; else rc=$?; if test "$rc" = 10; then exit 0; else exit "$rc"; fi; fi
exact_guard
prepare_namespace
source "$STATE_ENV"
source_gates
add_admin_env
build_and_deploy
create_users_and_files
printf '%s\n' "$(date -u +%s)" > "$EVIDENCE_DIR/prealias-start"
run_stage_uat prealias "$TEMP_URL" probe_pre "$TEMP_URL"
move_aliases
run_stage_uat canonical "https://www.moraltrade.org,https://moraltrade.org" probe_canonical https://www.moraltrade.org
logs_check
set_state EXECUTION_PASSED true
cleanup
finalize_success
