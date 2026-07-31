#!/usr/bin/env bash
set -euo pipefail

REPO="ghuser29384/Website2"
CANDIDATE_BRANCH="agent/marketplace-delta-current-main-20260729"
HARNESS_COMMIT="217b504b3e5bcb9fa3120676d509594c016051f3"
EXPECTED_QA_REF="hvmxfjjbdcgjjudmthdz"
QA_URL="https://${EXPECTED_QA_REF}.supabase.co"
VERCEL_SCOPE="ellen-s"
VERCEL_TEAM_ID="team_ySu6sF3Uho1E1GnJtCQPVEuJ"
WEBSITE2_PROJECT_ID="prj_uhfNhPo00nQrcbG0dk2zLWo7UmdK"
MORALTRADE_PROJECT_ID="prj_Em3j7Uj7RatX2R1ZYhla3XSHRde7"
FIXTURE_OFFER_ID="10000000-0000-4000-8000-000000000158"
ARTIFACT_ROOT="$GITHUB_WORKSPACE/marketplace-delta-browser-artifacts"
FINAL_ROOT="$GITHUB_WORKSPACE/marketplace-delta-final-proof"
BROWSER_RUNNER="$GITHUB_WORKSPACE/.marketplace-delta-terminal-browser.mjs"
mkdir -p "$ARTIFACT_ROOT" "$FINAL_ROOT"

for name in \
  QA_SUPABASE_DB_URL \
  QA_SUPABASE_PUBLISHABLE_KEY \
  QA_SUPABASE_SERVICE_ROLE_KEY \
  QA_TEST_PASSWORD \
  VERCEL_TOKEN; do
  if [[ -z "${!name:-}" ]]; then
    echo "Missing required secret: $name" >&2
    exit 1
  fi
done

python3 - <<'PY'
import os
from urllib.parse import urlparse
parsed = urlparse(os.environ["QA_SUPABASE_DB_URL"])
if "hvmxfjjbdcgjjudmthdz" not in (parsed.username or ""):
    raise SystemExit("Refusing unexpected QA database user.")
if parsed.port != 5432 or parsed.path != "/postgres":
    raise SystemExit("Refusing unexpected QA database connection parameters.")
PY

git fetch origin main "$CANDIDATE_BRANCH"
MAIN_SHA="$(git rev-parse origin/main)"
EXACT_HEAD_SHA="$(git rev-parse "origin/$CANDIDATE_BRANCH")"
if [[ -z "$MAIN_SHA" || -z "$EXACT_HEAD_SHA" ]]; then
  echo "Could not resolve exact main and candidate revisions." >&2
  exit 1
fi

git show "${HARNESS_COMMIT}:.github/scripts/marketplace-delta-exact-browser-qa.mjs" \
  > "$BROWSER_RUNNER"

npm ci

ENV_PROOF="$FINAL_ROOT/branch-scoped-qa-environment.txt"
: > "$ENV_PROOF"
verify_project_environment() {
  local project_name="$1"
  local project_id="$2"
  local env_file="$RUNNER_TEMP/${project_name}-preview.env"
  local metadata="$RUNNER_TEMP/${project_name}-preview-env-metadata.json"

  rm -rf .vercel .env.local
  npx --yes vercel@latest link \
    --yes \
    --project "$project_name" \
    --scope "$VERCEL_SCOPE" \
    --token "$VERCEL_TOKEN" >/dev/null
  npx --yes vercel@latest env pull "$env_file" \
    --yes --environment=preview --git-branch="$CANDIDATE_BRANCH" \
    --scope "$VERCEL_SCOPE" --token "$VERCEL_TOKEN" >/dev/null
  (
    set -a
    source "$env_file"
    set +a
    [[ "$NEXT_PUBLIC_SUPABASE_URL" == "$QA_URL" ]]
    [[ "$NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY" == "$QA_SUPABASE_PUBLISHABLE_KEY" ]]
  )
  rm -f "$env_file" .env.local

  curl --fail-with-body --silent --show-error --get \
    --header "Authorization: Bearer $VERCEL_TOKEN" \
    --data-urlencode "gitBranch=$CANDIDATE_BRANCH" \
    --data-urlencode "decrypt=false" \
    --data-urlencode "teamId=$VERCEL_TEAM_ID" \
    "https://api.vercel.com/v10/projects/${project_id}/env" \
    --output "$metadata"
  jq -e --arg branch "$CANDIDATE_BRANCH" '
    def targets_preview:
      if (.target | type) == "array"
      then (.target | index("preview")) != null
      else .target == "preview"
      end;
    [
      .envs[]
      | select(
          .key == "SUPABASE_SERVICE_ROLE_KEY"
          and .gitBranch == $branch
          and .type == "sensitive"
          and targets_preview
          and (.decrypted != true)
        )
    ]
    | length >= 1
  ' "$metadata" >/dev/null
  rm -f "$metadata"
  printf 'project=%s branch=%s qa_ref=%s url_match=true publishable_key_match=true service_role_present=true service_role_sensitive=true service_role_decrypted=false\n' \
    "$project_name" "$CANDIDATE_BRANCH" "$EXPECTED_QA_REF" >> "$ENV_PROOF"
  rm -rf .vercel
}

verify_project_environment website2 "$WEBSITE2_PROJECT_ID"
verify_project_environment moraltrade-site "$MORALTRADE_PROJECT_ID"

wait_exact_deployment() {
  local project_id="$1"
  local project_name="$2"
  local response="$RUNNER_TEMP/${project_name}-deployments.json"
  local detail="$RUNNER_TEMP/${project_name}-deployment-detail.json"
  for _ in $(seq 1 180); do
    curl --fail-with-body --silent --show-error \
      --header "Authorization: Bearer $VERCEL_TOKEN" \
      "https://api.vercel.com/v6/deployments?projectId=${project_id}&limit=100&teamId=${VERCEL_TEAM_ID}" \
      --output "$response"
    local id url state
    id="$(jq -r --arg sha "$EXACT_HEAD_SHA" --arg ref "$CANDIDATE_BRANCH" '
      [.deployments[] | select(.meta.githubCommitSha == $sha and .meta.githubCommitRef == $ref)]
      | sort_by(.created // .createdAt // 0) | reverse | .[0].id // ""
    ' "$response")"
    if [[ -n "$id" ]]; then
      curl --fail-with-body --silent --show-error \
        --header "Authorization: Bearer $VERCEL_TOKEN" \
        "https://api.vercel.com/v13/deployments/${id}?teamId=${VERCEL_TEAM_ID}" \
        --output "$detail"
      url="$(jq -r '.url // ""' "$detail")"
      state="$(jq -r '(.readyState // .state // .status // "UNKNOWN") | ascii_upcase' "$detail")"
      if [[ "$state" == "READY" && -n "$url" ]]; then
        printf '%s\t%s\t%s\n' "$id" "$url" "$state"
        return 0
      fi
      if [[ "$state" == "ERROR" || "$state" == "CANCELED" || "$state" == "CANCELLED" ]]; then
        echo "$project_name exact deployment reached $state." >&2
        return 1
      fi
      echo "Waiting for $project_name exact deployment ($state)..." >&2
    else
      echo "Waiting for $project_name deployment for $EXACT_HEAD_SHA..." >&2
    fi
    sleep 10
  done
  echo "Timed out waiting for $project_name exact deployment." >&2
  return 1
}

IFS=$'\t' read -r WEBSITE2_DEPLOYMENT_ID WEBSITE2_HOST _ \
  <<< "$(wait_exact_deployment "$WEBSITE2_PROJECT_ID" website2)"
IFS=$'\t' read -r MORALTRADE_DEPLOYMENT_ID MORALTRADE_HOST _ \
  <<< "$(wait_exact_deployment "$MORALTRADE_PROJECT_ID" moraltrade-site)"
WEBSITE2_PREVIEW_URL="https://${WEBSITE2_HOST}"
MORALTRADE_PREVIEW_URL="https://${MORALTRADE_HOST}"

prod_response="$RUNNER_TEMP/production-deployments.json"
curl --fail-with-body --silent --show-error \
  --header "Authorization: Bearer $VERCEL_TOKEN" \
  "https://api.vercel.com/v6/deployments?projectId=${MORALTRADE_PROJECT_ID}&target=production&limit=20&teamId=${VERCEL_TEAM_ID}" \
  --output "$prod_response"
PRODUCTION_DEPLOYMENT_ID="$(jq -r '.deployments[0].id // ""' "$prod_response")"
if [[ -z "$PRODUCTION_DEPLOYMENT_ID" ]]; then
  echo "Could not resolve the production comparison deployment." >&2
  exit 1
fi
prod_detail="$RUNNER_TEMP/production-deployment-detail.json"
curl --fail-with-body --silent --show-error \
  --header "Authorization: Bearer $VERCEL_TOKEN" \
  "https://api.vercel.com/v13/deployments/${PRODUCTION_DEPLOYMENT_ID}?teamId=${VERCEL_TEAM_ID}" \
  --output "$prod_detail"
PRODUCTION_MAIN_SHA="$(jq -r '.meta.githubCommitSha // ""' "$prod_detail")"
PRODUCTION_STATE="$(jq -r '(.readyState // .state // .status // "UNKNOWN") | ascii_upcase' "$prod_detail")"
if [[ "$PRODUCTION_STATE" != "READY" || "$PRODUCTION_MAIN_SHA" != "$MAIN_SHA" ]]; then
  echo "Production is not the exact current-main comparison baseline. expected=$MAIN_SHA actual=$PRODUCTION_MAIN_SHA state=$PRODUCTION_STATE" >&2
  exit 1
fi
BASELINE_URL="https://www.moraltrade.org"

sudo apt-get update >/dev/null
sudo apt-get install --yes postgresql-client >/dev/null
npx playwright install --with-deps chromium >/dev/null

reset_fixture() {
  psql "$QA_SUPABASE_DB_URL" --no-psqlrc --set ON_ERROR_STOP=1 >/dev/null <<SQL
begin;
select set_config('request.jwt.claim.sub', '', true);
select set_config('request.jwt.claims', jsonb_build_object('role','service_role')::text, true);
select set_config('app.core_trade_internal', '1', true);
delete from public.trade_threads where offer_id='${FIXTURE_OFFER_ID}'::uuid;
delete from public.agreements where offer_id='${FIXTURE_OFFER_ID}'::uuid;
delete from public.interests where offer_id='${FIXTURE_OFFER_ID}'::uuid;
delete from public.guest_interests where offer_id='${FIXTURE_OFFER_ID}'::uuid;
delete from public.offer_comments where offer_id='${FIXTURE_OFFER_ID}'::uuid;
delete from public.offer_carts where offer_id='${FIXTURE_OFFER_ID}'::uuid;
delete from public.trade_counterproposals where offer_id='${FIXTURE_OFFER_ID}'::uuid;
delete from public.trade_invitations where offer_id='${FIXTURE_OFFER_ID}'::uuid;
delete from public.trade_review_events where offer_id='${FIXTURE_OFFER_ID}'::uuid;
delete from public.offer_recommendations where source_offer_id='${FIXTURE_OFFER_ID}'::uuid or recommended_offer_id='${FIXTURE_OFFER_ID}'::uuid;
delete from public.performance_bonds where offer_id='${FIXTURE_OFFER_ID}'::uuid;
delete from public.donation_offset_matches where offer_id='${FIXTURE_OFFER_ID}'::uuid;
delete from public.financial_commitment_reservations where offer_id='${FIXTURE_OFFER_ID}'::uuid;
delete from public.trade_notifications where user_id in (
  select id from public.profiles where email in ('qa-market-owner@example.com','qa-market-responder@example.com')
);
delete from public.email_outbox where profile_id in (
  select id from public.profiles where email in ('qa-market-owner@example.com','qa-market-responder@example.com')
) or recipient_email in ('qa-market-owner@example.com','qa-market-responder@example.com');
update public.offers
set status='open', workflow_status='published', closed_at=null, deleted_at=null, updated_at=now()
where id='${FIXTURE_OFFER_ID}'::uuid
  and fingerprint='qa-pr-158-marketplace-fixture-v1';
commit;
SQL
}

verify_clean() {
  local output="$1"
  psql "$QA_SUPABASE_DB_URL" --no-psqlrc --tuples-only --no-align --set ON_ERROR_STOP=1 \
    --command "select jsonb_build_object(
      'offer_clean', exists(select 1 from public.offers where id='${FIXTURE_OFFER_ID}'::uuid and fingerprint='qa-pr-158-marketplace-fixture-v1' and status='open' and workflow_status='published' and closed_at is null and deleted_at is null),
      'interests', (select count(*) from public.interests where offer_id='${FIXTURE_OFFER_ID}'::uuid),
      'guest_interests', (select count(*) from public.guest_interests where offer_id='${FIXTURE_OFFER_ID}'::uuid),
      'agreements', (select count(*) from public.agreements where offer_id='${FIXTURE_OFFER_ID}'::uuid),
      'threads', (select count(*) from public.trade_threads where offer_id='${FIXTURE_OFFER_ID}'::uuid),
      'comments', (select count(*) from public.offer_comments where offer_id='${FIXTURE_OFFER_ID}'::uuid),
      'carts', (select count(*) from public.offer_carts where offer_id='${FIXTURE_OFFER_ID}'::uuid),
      'counterproposals', (select count(*) from public.trade_counterproposals where offer_id='${FIXTURE_OFFER_ID}'::uuid),
      'invitations', (select count(*) from public.trade_invitations where offer_id='${FIXTURE_OFFER_ID}'::uuid),
      'review_events', (select count(*) from public.trade_review_events where offer_id='${FIXTURE_OFFER_ID}'::uuid),
      'recommendations', (select count(*) from public.offer_recommendations where source_offer_id='${FIXTURE_OFFER_ID}'::uuid or recommended_offer_id='${FIXTURE_OFFER_ID}'::uuid),
      'performance_bonds', (select count(*) from public.performance_bonds where offer_id='${FIXTURE_OFFER_ID}'::uuid),
      'donation_matches', (select count(*) from public.donation_offset_matches where offer_id='${FIXTURE_OFFER_ID}'::uuid),
      'financial_reservations', (select count(*) from public.financial_commitment_reservations where offer_id='${FIXTURE_OFFER_ID}'::uuid),
      'notifications', (select count(*) from public.trade_notifications where user_id in (select id from public.profiles where email in ('qa-market-owner@example.com','qa-market-responder@example.com'))),
      'outbox', (select count(*) from public.email_outbox where profile_id in (select id from public.profiles where email in ('qa-market-owner@example.com','qa-market-responder@example.com')) or recipient_email in ('qa-market-owner@example.com','qa-market-responder@example.com')),
      'migration_recorded', exists(select 1 from supabase_migrations.schema_migrations where version='20260729170000' and name='marketplace_atomic_acceptance_current_core'),
      'member_rpc', to_regprocedure('public.accept_marketplace_interest_v1(uuid,uuid,text)') is not null,
      'guest_rpc', to_regprocedure('public.accept_marketplace_guest_interest_v1(uuid,uuid,text)') is not null
    )::text;" | tee "$output"
  python3 - "$output" <<'PY'
import json, sys
value = json.loads(open(sys.argv[1], encoding='utf-8').read().strip())
assert value['offer_clean'] is True, value
assert value['migration_recorded'] is True, value
assert value['member_rpc'] is True and value['guest_rpc'] is True, value
for key in (
    'interests','guest_interests','agreements','threads','comments','carts',
    'counterproposals','invitations','review_events','recommendations',
    'performance_bonds','donation_matches','financial_reservations',
    'notifications','outbox'
):
    assert value[key] == 0, value
PY
}

TEMP_VERCEL_BYPASS_SECRET=""
BYPASS_ACTIVE=0
revoke_bypass() {
  set +e
  if [[ "$BYPASS_ACTIVE" = "1" && -n "$TEMP_VERCEL_BYPASS_SECRET" ]]; then
    local payload="$RUNNER_TEMP/protection-revoke.json"
    jq -n --arg secret "$TEMP_VERCEL_BYPASS_SECRET" \
      '{revoke: {secret: $secret, regenerate: false}}' > "$payload"
    for project in "$WEBSITE2_PROJECT_ID" "$MORALTRADE_PROJECT_ID"; do
      curl --silent --show-error --request PATCH \
        --header "Authorization: Bearer $VERCEL_TOKEN" \
        --header "Content-Type: application/json" \
        --data-binary "@$payload" \
        "https://api.vercel.com/v1/projects/$project/protection-bypass?teamId=$VERCEL_TEAM_ID" \
        --output /dev/null || true
    done
  fi
}
cleanup_all() {
  set +e
  reset_fixture
  revoke_bypass
}
trap cleanup_all EXIT

TEMP_VERCEL_BYPASS_SECRET="$(openssl rand -hex 16)"
echo "::add-mask::$TEMP_VERCEL_BYPASS_SECRET"
payload="$RUNNER_TEMP/protection-generate.json"
jq -n --arg secret "$TEMP_VERCEL_BYPASS_SECRET" --arg note "Temporary terminal marketplace delta browser QA" \
  '{generate: {secret: $secret, note: $note}}' > "$payload"
for project in "$WEBSITE2_PROJECT_ID" "$MORALTRADE_PROJECT_ID"; do
  curl --fail-with-body --silent --show-error --request PATCH \
    --header "Authorization: Bearer $VERCEL_TOKEN" \
    --header "Content-Type: application/json" \
    --data-binary "@$payload" \
    "https://api.vercel.com/v1/projects/$project/protection-bypass?teamId=$VERCEL_TEAM_ID" \
    --output /dev/null
done
BYPASS_ACTIVE=1

reset_fixture
verify_clean "$FINAL_ROOT/pre-browser-state.json"

export TEMP_VERCEL_BYPASS_SECRET WEBSITE2_PREVIEW_URL MORALTRADE_PREVIEW_URL BASELINE_URL
export QA_SUPABASE_DB_URL QA_TEST_PASSWORD EXACT_HEAD_SHA

run_browser() {
  local label="$1"
  local width="$2"
  local height="$3"
  local destination="$ARTIFACT_ROOT/$label"
  mkdir -p "$destination"
  VIEWPORT_WIDTH="$width" \
  VIEWPORT_HEIGHT="$height" \
  BROWSER_QA_ARTIFACT_DIR="$destination" \
  EXPECTED_HEAD_SHA="$EXACT_HEAD_SHA" \
  GITHUB_RUN_ID="${GITHUB_RUN_ID}-${label}" \
    node "$BROWSER_RUNNER"
}

run_browser desktop-1440x900 1440 900
reset_fixture
run_browser mobile-390x844 390 844
reset_fixture
verify_clean "$FINAL_ROOT/post-browser-state.json"

if [[ "$(git ls-remote origin "refs/heads/$CANDIDATE_BRANCH" | cut -f1)" != "$EXACT_HEAD_SHA" ]]; then
  echo "Candidate branch changed during exact-head QA; refusing stale evidence." >&2
  exit 1
fi

revoke_bypass
BYPASS_ACTIVE=0

cat > "$FINAL_ROOT/exact-head-proof.txt" <<EOF_PROOF
main_sha=${MAIN_SHA}
exact_candidate_sha=${EXACT_HEAD_SHA}
website2_deployment=${WEBSITE2_DEPLOYMENT_ID}
website2_preview=${WEBSITE2_PREVIEW_URL}
moraltrade_deployment=${MORALTRADE_DEPLOYMENT_ID}
moraltrade_preview=${MORALTRADE_PREVIEW_URL}
production_deployment=${PRODUCTION_DEPLOYMENT_ID}
baseline_url=${BASELINE_URL}
baseline_main_sha=${PRODUCTION_MAIN_SHA}
branch_scoped_qa_ref=${EXPECTED_QA_REF}
desktop_status=PASS
mobile_status=PASS
post_browser_fixture=clean
temporary_bypasses=revoked
production_changed=NO
EOF_PROOF

printf 'PASS: exact-head environment, rendered comparison, desktop/mobile workflows, and deterministic cleanup passed.\n'
