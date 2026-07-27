#!/usr/bin/env bash
set -euo pipefail

: "${GITHUB_WORKSPACE:?}"
: "${RUNNER_TEMP:?}"
: "${QA_TEST_PASSWORD:?}"
: "${QA_SUPABASE_DB_URL:?}"
: "${VERCEL_TOKEN:?}"

EXPECTED_HEAD_SHA="7df17c6bdd626083f0c68e785237c680dd44e6c3"
EXPECTED_MAIN_SHA="c42d07797554958074945547ec121ab922cebc61"
EXPECTED_QA_REF="hvmxfjjbdcgjjudmthdz"
VERCEL_TEAM_ID="team_ySu6sF3Uho1E1GnJtCQPVEuJ"
WEBSITE2_PROJECT_ID="prj_uhfNhPo00nQrcbG0dk2zLWo7UmdK"
MORALTRADE_PROJECT_ID="prj_Em3j7Uj7RatX2R1ZYhla3XSHRde7"
WEBSITE2_DEPLOYMENT_ID="dpl_H36rnwDR8Lj9SWW4n4MuH75oRZeM"
MORALTRADE_DEPLOYMENT_ID="dpl_3pSi6G5sYCB158SG9vxvszMNRNK2"
OFFER_ID="10000000-0000-4000-8000-000000000158"
ARTIFACT_ROOT="$GITHUB_WORKSPACE/integrated-browser-evidence"
FINAL_ROOT="$GITHUB_WORKSPACE/integrated-browser-final-state"
RESET_SQL="$RUNNER_TEMP/reset-pr158-integrated-fixture.sql"
mkdir -p "$ARTIFACT_ROOT" "$FINAL_ROOT"

if [[ "$(git rev-parse HEAD)" != "$EXPECTED_HEAD_SHA" ]]; then
  echo "Refusing unexpected candidate head: $(git rev-parse HEAD)" >&2
  exit 1
fi
git merge-base --is-ancestor "$EXPECTED_MAIN_SHA" HEAD

python3 - <<'PY'
import os
from urllib.parse import urlparse
parsed = urlparse(os.environ["QA_SUPABASE_DB_URL"])
if "hvmxfjjbdcgjjudmthdz" not in (parsed.username or ""):
    raise SystemExit("Refusing database URL outside MoralTrade QA.")
if parsed.hostname != "aws-0-us-west-1.pooler.supabase.com":
    raise SystemExit("Refusing unexpected QA database host.")
if parsed.port != 5432 or parsed.path != "/postgres":
    raise SystemExit("Refusing unexpected QA database connection parameters.")
PY

wait_for_deployment() {
  local deployment_id="$1"
  local label="$2"
  local url_var="$3"
  local body="$RUNNER_TEMP/${deployment_id}.json"
  local state=""
  local sha=""
  local url=""
  for attempt in $(seq 1 180); do
    curl --fail-with-body --silent --show-error \
      --header "Authorization: Bearer $VERCEL_TOKEN" \
      "https://api.vercel.com/v13/deployments/${deployment_id}?teamId=${VERCEL_TEAM_ID}" \
      --output "$body"
    state="$(jq -r '.readyState // .state // empty' "$body")"
    sha="$(jq -r '.meta.githubCommitSha // empty' "$body")"
    url="$(jq -r '.url // empty' "$body")"
    if [[ "$state" = "READY" && "$sha" = "$EXPECTED_HEAD_SHA" && -n "$url" ]]; then
      printf -v "$url_var" 'https://%s' "$url"
      export "$url_var"
      cp "$body" "$FINAL_ROOT/${label}-deployment.json"
      echo "$label exact-head deployment is READY: $deployment_id"
      return 0
    fi
    if [[ "$state" = "ERROR" || "$state" = "CANCELED" ]]; then
      echo "$label deployment reached terminal state $state." >&2
      return 1
    fi
    echo "$label state=${state:-not-found}, sha=${sha:-missing}; waiting ($attempt/180)."
    sleep 15
  done
  echo "$label deployment did not become READY within 45 minutes." >&2
  return 1
}

wait_for_deployment "$WEBSITE2_DEPLOYMENT_ID" website2 WEBSITE2_PREVIEW_URL
wait_for_deployment "$MORALTRADE_DEPLOYMENT_ID" moraltrade MORALTRADE_PREVIEW_URL

cat > "$RESET_SQL" <<'SQL'
begin;
do $guard$
declare
  fixture_count integer;
  qa_profile_count integer;
begin
  select count(*) into fixture_count
  from public.offers o
  join public.profiles p on p.id=o.owner_id
  where o.id='10000000-0000-4000-8000-000000000158'::uuid
    and o.fingerprint='qa-pr-158-marketplace-fixture-v1'
    and p.email='qa-market-owner@example.com';
  select count(*) into qa_profile_count
  from public.profiles
  where email in ('qa-market-owner@example.com','qa-market-responder@example.com');
  if fixture_count <> 1 or qa_profile_count <> 2 then
    raise exception 'Refusing reset outside the exact MoralTrade QA fixture.';
  end if;
end;
$guard$;

delete from public.offer_comments where offer_id='10000000-0000-4000-8000-000000000158'::uuid;
delete from public.trade_counterproposals where offer_id='10000000-0000-4000-8000-000000000158'::uuid;
delete from public.trade_threads where offer_id='10000000-0000-4000-8000-000000000158'::uuid;
delete from public.trade_review_events where offer_id='10000000-0000-4000-8000-000000000158'::uuid;
delete from public.trade_invitations where offer_id='10000000-0000-4000-8000-000000000158'::uuid;
delete from public.offer_carts where offer_id='10000000-0000-4000-8000-000000000158'::uuid;
delete from public.offer_recommendations
where source_offer_id='10000000-0000-4000-8000-000000000158'::uuid
   or recommended_offer_id='10000000-0000-4000-8000-000000000158'::uuid;
delete from public.performance_bonds where offer_id='10000000-0000-4000-8000-000000000158'::uuid;
delete from public.donation_offset_matches where offer_id='10000000-0000-4000-8000-000000000158'::uuid;
delete from public.fallback_livestream_evidence_routes where offer_id='10000000-0000-4000-8000-000000000158'::uuid;
delete from public.financial_commitment_reservations where offer_id='10000000-0000-4000-8000-000000000158'::uuid;
delete from public.agreements where offer_id='10000000-0000-4000-8000-000000000158'::uuid;
delete from public.interests where offer_id='10000000-0000-4000-8000-000000000158'::uuid;
delete from public.guest_interests where offer_id='10000000-0000-4000-8000-000000000158'::uuid;
delete from public.email_outbox
where profile_id in (
    select id from public.profiles
    where email in ('qa-market-owner@example.com','qa-market-responder@example.com')
  )
   or recipient_email in ('qa-market-owner@example.com','qa-market-responder@example.com');
update public.offers
set status='open', workflow_status='published', closed_at=null, deleted_at=null, updated_at=now()
where id='10000000-0000-4000-8000-000000000158'::uuid;
commit;
SQL

reset_fixture() {
  psql "$QA_SUPABASE_DB_URL" --no-psqlrc --set ON_ERROR_STOP=1 --file "$RESET_SQL"
}

verify_clean() {
  local result="$1"
  psql "$QA_SUPABASE_DB_URL" --no-psqlrc --tuples-only --no-align --set ON_ERROR_STOP=1 <<'SQL' > "$result"
select case
  when not exists (
    select 1 from public.offers
    where id='10000000-0000-4000-8000-000000000158'::uuid
      and fingerprint='qa-pr-158-marketplace-fixture-v1'
      and status='open' and workflow_status='published'
      and closed_at is null and deleted_at is null
  ) then 'FAIL:offer'
  when exists (select 1 from public.interests where offer_id='10000000-0000-4000-8000-000000000158'::uuid) then 'FAIL:interests'
  when exists (select 1 from public.guest_interests where offer_id='10000000-0000-4000-8000-000000000158'::uuid) then 'FAIL:guest_interests'
  when exists (select 1 from public.agreements where offer_id='10000000-0000-4000-8000-000000000158'::uuid) then 'FAIL:agreements'
  when exists (select 1 from public.trade_threads where offer_id='10000000-0000-4000-8000-000000000158'::uuid) then 'FAIL:threads'
  when exists (select 1 from public.trade_counterproposals where offer_id='10000000-0000-4000-8000-000000000158'::uuid) then 'FAIL:counterproposals'
  when exists (select 1 from public.offer_comments where offer_id='10000000-0000-4000-8000-000000000158'::uuid) then 'FAIL:comments'
  when exists (select 1 from public.trade_invitations where offer_id='10000000-0000-4000-8000-000000000158'::uuid) then 'FAIL:invitations'
  when exists (select 1 from public.trade_review_events where offer_id='10000000-0000-4000-8000-000000000158'::uuid) then 'FAIL:review_events'
  when exists (select 1 from public.offer_carts where offer_id='10000000-0000-4000-8000-000000000158'::uuid) then 'FAIL:carts'
  when exists (
    select 1 from public.offer_recommendations
    where source_offer_id='10000000-0000-4000-8000-000000000158'::uuid
       or recommended_offer_id='10000000-0000-4000-8000-000000000158'::uuid
  ) then 'FAIL:recommendations'
  when exists (select 1 from public.performance_bonds where offer_id='10000000-0000-4000-8000-000000000158'::uuid) then 'FAIL:bonds'
  when exists (select 1 from public.donation_offset_matches where offer_id='10000000-0000-4000-8000-000000000158'::uuid) then 'FAIL:donation_matches'
  when exists (select 1 from public.financial_commitment_reservations where offer_id='10000000-0000-4000-8000-000000000158'::uuid) then 'FAIL:reservations'
  when exists (
    select 1 from public.email_outbox
    where profile_id in (
      select id from public.profiles
      where email in ('qa-market-owner@example.com','qa-market-responder@example.com')
    )
       or recipient_email in ('qa-market-owner@example.com','qa-market-responder@example.com')
  ) then 'FAIL:outbox'
  else 'PASS'
end;
SQL
  test "$(tr -d '[:space:]' < "$result")" = "PASS"
}

reset_fixture
verify_clean "$FINAL_ROOT/precondition.txt"

psql "$QA_SUPABASE_DB_URL" --no-psqlrc --set ON_ERROR_STOP=1 \
  --file supabase/tests/marketplace_interest_acceptance_atomicity.sql \
  | tee "$FINAL_ROOT/marketplace-interest-acceptance-atomicity.log"
psql "$QA_SUPABASE_DB_URL" --no-psqlrc --set ON_ERROR_STOP=1 \
  --file supabase/tests/marketplace_bilateral_confirmation.sql \
  | tee "$FINAL_ROOT/marketplace-bilateral-confirmation.log"
reset_fixture

# Require a quiet fixture before browser work.
previous=""
stable=0
for attempt in $(seq 1 24); do
  current="$(psql "$QA_SUPABASE_DB_URL" --no-psqlrc --tuples-only --no-align --set ON_ERROR_STOP=1 <<'SQL'
select concat_ws('|',
  extract(epoch from updated_at)::bigint,
  status::text,
  workflow_status,
  (select count(*) from public.interests where offer_id='10000000-0000-4000-8000-000000000158'::uuid),
  (select count(*) from public.agreements where offer_id='10000000-0000-4000-8000-000000000158'::uuid)
)
from public.offers
where id='10000000-0000-4000-8000-000000000158'::uuid;
SQL
)"
  if [[ "$current" = "$previous" && "$current" == *"|open|published|0|0" ]]; then
    stable=$((stable + 1))
  else
    stable=0
  fi
  previous="$current"
  if [[ "$stable" -ge 3 ]]; then break; fi
  sleep 10
done
test "$stable" -ge 3

# Restore the reviewed runner and its two reviewed patches.
git fetch origin refs/pull/219/head:refs/remotes/origin/pr219-head \
  ops/pr158-final-isolated-qa-20260726 \
  ops/pr158-bilateral-confirmation-gate-20260727
mkdir -p .github/scripts
git show refs/remotes/origin/pr219-head:.github/scripts/pr158-two-account-browser-qa.mjs \
  > .github/scripts/pr158-two-account-browser-qa.mjs
git show refs/remotes/origin/pr219-head:.github/scripts/run-pr158-two-account-browser-qa.mjs \
  > .github/scripts/run-pr158-two-account-browser-qa.mjs
git show origin/ops/pr158-final-isolated-qa-20260726:.github/scripts/patch-pr158-browser-runner.py \
  > "$RUNNER_TEMP/patch-pr158-browser-runner.py"
git show origin/ops/pr158-bilateral-confirmation-gate-20260727:.github/scripts/patch-pr158-browser-runner-diagnostics.py \
  > "$RUNNER_TEMP/patch-pr158-browser-runner-diagnostics.py"
test "$(git hash-object .github/scripts/pr158-two-account-browser-qa.mjs)" = "20ef6ac29ffce2c93a29aeb59dd471132e601a37"
test "$(git hash-object .github/scripts/run-pr158-two-account-browser-qa.mjs)" = "9768b4953032128fcbed22bd3a5d9f92404b52ae"
test "$(git hash-object "$RUNNER_TEMP/patch-pr158-browser-runner.py")" = "cc8b3e28b4cc0823e6e51d3d5d0f1b7581909d62"
test "$(git hash-object "$RUNNER_TEMP/patch-pr158-browser-runner-diagnostics.py")" = "87fe9e91ffab891db71aadd7443411983fed13e6"
python3 "$RUNNER_TEMP/patch-pr158-browser-runner.py"
python3 "$RUNNER_TEMP/patch-pr158-browser-runner-diagnostics.py"
node --check .github/scripts/pr158-two-account-browser-qa.mjs
node --check .github/scripts/run-pr158-two-account-browser-qa.mjs

TEMP_VERCEL_BYPASS_SECRET=""
BYPASS_ACTIVE=0
cleanup() {
  set +e
  reset_fixture >/dev/null 2>&1
  if [[ "$BYPASS_ACTIVE" = "1" && -n "$TEMP_VERCEL_BYPASS_SECRET" ]]; then
    payload="$RUNNER_TEMP/protection-revoke.json"
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
trap cleanup EXIT

TEMP_VERCEL_BYPASS_SECRET="$(openssl rand -hex 16)"
echo "::add-mask::$TEMP_VERCEL_BYPASS_SECRET"
payload="$RUNNER_TEMP/protection-generate.json"
jq -n --arg secret "$TEMP_VERCEL_BYPASS_SECRET" --arg note "Temporary integrated PR #158 exact-head QA" \
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
export TEMP_VERCEL_BYPASS_SECRET WEBSITE2_PREVIEW_URL MORALTRADE_PREVIEW_URL

set +e
BROWSER_QA_ARTIFACT_DIR="$ARTIFACT_ROOT/desktop-1440x900" \
GITHUB_RUN_ID="${GITHUB_RUN_ID}-desktop" \
node .github/scripts/run-pr158-two-account-browser-qa.mjs
DESKTOP_STATUS=$?
set -e

reset_fixture

python3 - <<'PY'
from pathlib import Path
path = Path('.github/scripts/pr158-two-account-browser-qa.mjs')
source = path.read_text(encoding='utf-8')
old = 'viewport: { width: 1440, height: 900 }'
if source.count(old) < 4:
    raise SystemExit(f'Expected at least four desktop viewport declarations; found {source.count(old)}.')
source = source.replace(old, 'viewport: { width: 390, height: 844 }')
replacements = {
    'website2-desktop-public': 'website2-mobile-full-public',
    'moraltrade-desktop-public': 'moraltrade-mobile-full-public',
    'moraltrade-desktop-responder': 'moraltrade-mobile-full-responder',
    'moraltrade-desktop-owner': 'moraltrade-mobile-full-owner',
    'desktop public marketplace, search, constraints, selectors, and single-page bounds':
      'mobile full public marketplace, search, constraints, selectors, and single-page bounds',
    'desktop dealroom': 'mobile full dealroom',
}
for before, after in replacements.items():
    source = source.replace(before, after)
path.write_text(source, encoding='utf-8')
PY
node --check .github/scripts/pr158-two-account-browser-qa.mjs

set +e
BROWSER_QA_ARTIFACT_DIR="$ARTIFACT_ROOT/mobile-390x844" \
GITHUB_RUN_ID="${GITHUB_RUN_ID}-mobile" \
node .github/scripts/run-pr158-two-account-browser-qa.mjs
MOBILE_STATUS=$?
set -e

reset_fixture
verify_clean "$FINAL_ROOT/final-state.txt"

# Revoke explicitly and disable trap revocation after success.
payload="$RUNNER_TEMP/protection-revoke.json"
jq -n --arg secret "$TEMP_VERCEL_BYPASS_SECRET" \
  '{revoke: {secret: $secret, regenerate: false}}' > "$payload"
for project in "$WEBSITE2_PROJECT_ID" "$MORALTRADE_PROJECT_ID"; do
  curl --fail-with-body --silent --show-error --request PATCH \
    --header "Authorization: Bearer $VERCEL_TOKEN" \
    --header "Content-Type: application/json" \
    --data-binary "@$payload" \
    "https://api.vercel.com/v1/projects/$project/protection-bypass?teamId=$VERCEL_TEAM_ID" \
    --output /dev/null
done
BYPASS_ACTIVE=0

{
  echo "integrated_sha=$EXPECTED_HEAD_SHA"
  echo "main_sha=$EXPECTED_MAIN_SHA"
  echo "website2_deployment=$WEBSITE2_DEPLOYMENT_ID"
  echo "website2_preview=$WEBSITE2_PREVIEW_URL"
  echo "moraltrade_deployment=$MORALTRADE_DEPLOYMENT_ID"
  echo "moraltrade_preview=$MORALTRADE_PREVIEW_URL"
  echo "desktop_status=$DESKTOP_STATUS"
  echo "mobile_status=$MOBILE_STATUS"
  echo "final_synthetic_state=clean"
  echo "temporary_bypasses=revoked"
} > "$FINAL_ROOT/exact-head-proof.txt"

if [[ "$DESKTOP_STATUS" != "0" || "$MOBILE_STATUS" != "0" ]]; then
  echo "Desktop status=$DESKTOP_STATUS; mobile status=$MOBILE_STATUS" >&2
  exit 1
fi

echo "PASS: exact integrated desktop and mobile browser gates passed; fixture clean; bypasses revoked."
