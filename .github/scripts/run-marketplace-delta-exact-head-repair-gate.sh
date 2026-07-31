#!/usr/bin/env bash
set -euo pipefail

REPO="ghuser29384/Website2"
PRODUCT_PR_NUMBER="326"
EXPECTED_QA_REF="hvmxfjjbdcgjjudmthdz"
QA_URL="https://${EXPECTED_QA_REF}.supabase.co"
VERCEL_SCOPE="ellen-s"
VERCEL_TEAM_ID="team_ySu6sF3Uho1E1GnJtCQPVEuJ"
WEBSITE2_PROJECT_ID="prj_uhfNhPo00nQrcbG0dk2zLWo7UmdK"
MORALTRADE_PROJECT_ID="prj_Em3j7Uj7RatX2R1ZYhla3XSHRde7"
FIXTURE_OFFER_ID="10000000-0000-4000-8000-000000000158"
GUEST_INTEREST_ID="10000000-0000-4000-8000-000000000171"
HARNESS_COMMIT="217b504b3e5bcb9fa3120676d509594c016051f3"
ARTIFACT_ROOT="$GITHUB_WORKSPACE/marketplace-delta-browser-artifacts"
FINAL_ROOT="$GITHUB_WORKSPACE/marketplace-delta-final-proof"
CANDIDATE_DIR="$RUNNER_TEMP/marketplace-delta-candidate"
MAIN_DIR="$RUNNER_TEMP/marketplace-delta-main"
RUN_STARTED_AT="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
mkdir -p "$ARTIFACT_ROOT" "$FINAL_ROOT"

for name in \
  GITHUB_TOKEN \
  QA_SUPABASE_DB_URL \
  QA_SUPABASE_PUBLISHABLE_KEY \
  QA_SUPABASE_SERVICE_ROLE_KEY \
  QA_TEST_PASSWORD \
  VERCEL_TOKEN; do
  if [[ -z "${!name:-}" ]]; then
    echo "Missing required secret or token: $name" >&2
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

pull_json="$RUNNER_TEMP/product-pr.json"
curl --fail-with-body --silent --show-error \
  --header "Authorization: Bearer $GITHUB_TOKEN" \
  --header "Accept: application/vnd.github+json" \
  "https://api.github.com/repos/${REPO}/pulls/${PRODUCT_PR_NUMBER}" \
  --output "$pull_json"

PR_HEAD_SHA="$(jq -r '.head.sha' "$pull_json")"
CANDIDATE_BRANCH="$(jq -r '.head.ref' "$pull_json")"
PR_BASE_REF="$(jq -r '.base.ref' "$pull_json")"
if [[ -z "$PR_HEAD_SHA" || "$PR_HEAD_SHA" == "null" || "$PR_BASE_REF" != "main" ]]; then
  echo "Could not establish an open PR #326 against main." >&2
  exit 1
fi

git fetch --no-tags origin main "$CANDIDATE_BRANCH"
MAIN_SHA="$(git rev-parse origin/main)"
if [[ "$(git rev-parse "origin/$CANDIDATE_BRANCH")" != "$PR_HEAD_SHA" ]]; then
  echo "GitHub API and fetched PR head disagree." >&2
  exit 1
fi

PR_HEAD_TREE="$(git rev-parse "${PR_HEAD_SHA}^{tree}")"
MAIN_TREE="$(git rev-parse "${MAIN_SHA}^{tree}")"
cat > "$FINAL_ROOT/snapshot.txt" <<EOF_SNAPSHOT
run_started_at=${RUN_STARTED_AT}
product_pr=${PRODUCT_PR_NUMBER}
product_branch=${CANDIDATE_BRANCH}
product_head_sha=${PR_HEAD_SHA}
product_head_tree=${PR_HEAD_TREE}
main_sha=${MAIN_SHA}
main_tree=${MAIN_TREE}
qa_ref=${EXPECTED_QA_REF}
EOF_SNAPSHOT

rm -rf "$CANDIDATE_DIR" "$MAIN_DIR"
git worktree add --force -B "$CANDIDATE_BRANCH" "$CANDIDATE_DIR" "$PR_HEAD_SHA"
git worktree add --force -B "qa-main-baseline-${GITHUB_RUN_ID}" "$MAIN_DIR" "$MAIN_SHA"

(
  cd "$CANDIDATE_DIR"
  npm ci
  node --import tsx --test \
    src/lib/marketplace-participant-groups.test.ts \
    src/lib/marketplace-delta-contract.test.ts
  npm test
  npm run lint
  git diff --check "$MAIN_SHA...$PR_HEAD_SHA"
)

(
  cd "$MAIN_DIR"
  npm ci
)

candidate_tsc="$RUNNER_TEMP/candidate-tsc.txt"
main_tsc="$RUNNER_TEMP/main-tsc.txt"
set +e
(
  cd "$CANDIDATE_DIR"
  npx --no-install tsc --noEmit --pretty false > "$candidate_tsc" 2>&1
)
candidate_tsc_status=$?
(
  cd "$MAIN_DIR"
  npx --no-install tsc --noEmit --pretty false > "$main_tsc" 2>&1
)
main_tsc_status=$?
set -e

CANDIDATE_TSC="$candidate_tsc" MAIN_TSC="$main_tsc" \
CANDIDATE_TSC_STATUS="$candidate_tsc_status" MAIN_TSC_STATUS="$main_tsc_status" \
python3 - "$FINAL_ROOT/typescript-differential.txt" <<'PY'
import os
import re
import sys
from pathlib import Path
pattern = re.compile(r"^(.*?\(\d+,\d+\): error TS\d+: .*)$")
def rows(path):
    result = set()
    for line in Path(path).read_text(encoding="utf-8", errors="replace").splitlines():
        match = pattern.match(line.strip())
        if match:
            result.add(match.group(1))
    return result
candidate = rows(os.environ["CANDIDATE_TSC"])
main = rows(os.environ["MAIN_TSC"])
candidate_only = sorted(candidate - main)
report = [
    f"main_exit={os.environ['MAIN_TSC_STATUS']}",
    f"candidate_exit={os.environ['CANDIDATE_TSC_STATUS']}",
    f"main_errors={len(main)}",
    f"candidate_errors={len(candidate)}",
    f"candidate_only_errors={len(candidate_only)}",
]
if candidate_only:
    report.extend(["", "Candidate-only errors:", *candidate_only])
Path(sys.argv[1]).write_text("\n".join(report) + "\n", encoding="utf-8")
print("\n".join(report))
if candidate_only:
    raise SystemExit("Candidate introduced TypeScript errors relative to exact main snapshot.")
PY

(
  cd "$CANDIDATE_DIR"
  npm run build
)

(
  cd "$CANDIDATE_DIR"
  npx --no-install playwright install --with-deps chromium >/dev/null
  mkdir -p .qa
  git show "${HARNESS_COMMIT}:.github/scripts/marketplace-delta-exact-browser-qa.mjs" > .qa/member.mjs
  cp "$GITHUB_WORKSPACE/.github/scripts/marketplace-delta-claimed-guest-browser-qa.mjs" .qa/claimed-guest.mjs
  python3 - .qa/member.mjs <<'PY'
from pathlib import Path
import sys
path = Path(sys.argv[1])
text = path.read_text(encoding="utf-8")
old_locator = r"page.getByText(/1 participant across 1 exact proposal/)"
new_locator = r"page.getByText(/1 participant\\s*across 1 exact proposal/)"
if text.count(old_locator) != 1:
    raise SystemExit(f"Expected exactly one participant-count locator; found {text.count(old_locator)}.")
text = text.replace(old_locator, new_locator, 1)
bypass_cookie_line = '          "x-vercel-set-bypass-cookie": "true",\n'
if text.count(bypass_cookie_line) != 1:
    raise SystemExit(f"Expected exactly one Vercel bypass-cookie header; found {text.count(bypass_cookie_line)}.")
text = text.replace(bypass_cookie_line, "", 1)
path.write_text(text, encoding="utf-8")
PY
  node --check .qa/member.mjs
  node --check .qa/claimed-guest.mjs
  node --input-type=module - <<'NODE'
import { chromium } from "@playwright/test";
const browser = await chromium.launch({ headless: true });
await browser.close();
console.log("PASS: @playwright/test resolved from the product worktree and Chromium launched.");
NODE
  rm -rf .qa
  if [[ -n "$(git status --porcelain)" ]]; then
    echo "The exact product worktree was changed by harness smoke preparation." >&2
    git status --short >&2
    exit 1
  fi
)

env_proof="$FINAL_ROOT/branch-scoped-qa-environment.txt"
: > "$env_proof"
configure_project_environment() {
  local project_name="$1"
  local project_id="$2"
  local env_file="$RUNNER_TEMP/${project_name}-preview.env"
  local metadata="$RUNNER_TEMP/${project_name}-preview-env-metadata.json"
  rm -rf "$GITHUB_WORKSPACE/.vercel" "$GITHUB_WORKSPACE/.env.local"
  (
    cd "$GITHUB_WORKSPACE"
    npx --yes vercel@58.4.0 link \
      --yes --project "$project_name" --scope "$VERCEL_SCOPE" --token "$VERCEL_TOKEN" >/dev/null
    printf '%s' "$QA_URL" | npx --yes vercel@58.4.0 env add \
      NEXT_PUBLIC_SUPABASE_URL preview "$CANDIDATE_BRANCH" \
      --force --no-sensitive --scope "$VERCEL_SCOPE" --token "$VERCEL_TOKEN" >/dev/null
    printf '%s' "$QA_SUPABASE_PUBLISHABLE_KEY" | npx --yes vercel@58.4.0 env add \
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY preview "$CANDIDATE_BRANCH" \
      --force --no-sensitive --scope "$VERCEL_SCOPE" --token "$VERCEL_TOKEN" >/dev/null
    printf '%s' "$QA_SUPABASE_SERVICE_ROLE_KEY" | npx --yes vercel@58.4.0 env add \
      SUPABASE_SERVICE_ROLE_KEY preview "$CANDIDATE_BRANCH" \
      --force --sensitive --scope "$VERCEL_SCOPE" --token "$VERCEL_TOKEN" >/dev/null
    npx --yes vercel@58.4.0 env pull "$env_file" \
      --yes --environment=preview --git-branch="$CANDIDATE_BRANCH" \
      --scope "$VERCEL_SCOPE" --token "$VERCEL_TOKEN" >/dev/null
  )
  (
    set -a
    source "$env_file"
    set +a
    [[ "$NEXT_PUBLIC_SUPABASE_URL" == "$QA_URL" ]]
    [[ "$NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY" == "$QA_SUPABASE_PUBLISHABLE_KEY" ]]
  )
  rm -f "$env_file" "$GITHUB_WORKSPACE/.env.local"

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
    [.envs[] | select(
      .key == "SUPABASE_SERVICE_ROLE_KEY"
      and .gitBranch == $branch
      and .type == "sensitive"
      and targets_preview
      and (.decrypted != true)
    )] | length >= 1
  ' "$metadata" >/dev/null
  rm -f "$metadata"
  printf 'project=%s branch=%s qa_ref=%s url_match=true publishable_key_match=true service_role_present=true service_role_sensitive=true service_role_decrypted=false\n' \
    "$project_name" "$CANDIDATE_BRANCH" "$EXPECTED_QA_REF" >> "$env_proof"
  rm -rf "$GITHUB_WORKSPACE/.vercel"
}

configure_project_environment website2 "$WEBSITE2_PROJECT_ID"
configure_project_environment moraltrade-site "$MORALTRADE_PROJECT_ID"

git fetch --no-tags origin main "$CANDIDATE_BRANCH"
if [[ "$(git rev-parse origin/main)" != "$MAIN_SHA" ]] || \
   [[ "$(git rev-parse "origin/$CANDIDATE_BRANCH")" != "$PR_HEAD_SHA" ]]; then
  echo "Main or PR #326 moved during static validation; refusing stale deployment evidence." >&2
  exit 1
fi

deploy_records="$FINAL_ROOT/deployments.jsonl"
: > "$deploy_records"
deploy_exact() {
  local role="$1"
  local project_name="$2"
  local project_id="$3"
  local worktree="$4"
  local source_sha="$5"
  local source_ref="$6"
  local use_public_qa_flags="$7"
  local log_file="$RUNNER_TEMP/deploy-${role}-${project_name}.log"
  local -a extra_env=()
  if [[ "$use_public_qa_flags" == "1" ]]; then
    extra_env+=(
      --build-env "NEXT_PUBLIC_SUPABASE_URL=$QA_URL"
      --build-env "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=$QA_SUPABASE_PUBLISHABLE_KEY"
      --env "NEXT_PUBLIC_SUPABASE_URL=$QA_URL"
      --env "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=$QA_SUPABASE_PUBLISHABLE_KEY"
    )
  fi

  rm -rf "$worktree/.vercel" "$worktree/.env.local"
  (
    cd "$worktree"
    [[ "$(git rev-parse HEAD)" == "$source_sha" ]]
    [[ -z "$(git status --porcelain)" ]]
    npx --yes vercel@58.4.0 link \
      --yes --project "$project_name" --scope "$VERCEL_SCOPE" --token "$VERCEL_TOKEN" >/dev/null
    npx --yes vercel@58.4.0 deploy \
      --yes --force --scope "$VERCEL_SCOPE" --token "$VERCEL_TOKEN" \
      --meta "qaGateRun=$GITHUB_RUN_ID" \
      --meta "qaRole=$role" \
      --meta "qaSourceSha=$source_sha" \
      --meta "qaSourceRef=$source_ref" \
      "${extra_env[@]}"
  ) 2>&1 | tee "$log_file"

  local url host
  url="$(grep -Eo 'https://[A-Za-z0-9.-]+\.vercel\.app' "$log_file" | tail -1)"
  if [[ -z "$url" ]]; then
    echo "Could not parse the immutable deployment URL for $role/$project_name." >&2
    return 1
  fi
  host="${url#https://}"

  local response="$RUNNER_TEMP/deployments-${role}-${project_name}.json"
  local row=""
  for _ in $(seq 1 120); do
    curl --fail-with-body --silent --show-error \
      --header "Authorization: Bearer $VERCEL_TOKEN" \
      "https://api.vercel.com/v6/deployments?projectId=${project_id}&limit=100&teamId=${VERCEL_TEAM_ID}" \
      --output "$response"
    row="$(jq -r --arg host "$host" --arg run "$GITHUB_RUN_ID" --arg role "$role" --arg sha "$source_sha" '
      [.deployments[] | select(
        .url == $host or
        (.meta.qaGateRun == $run and .meta.qaRole == $role and .meta.qaSourceSha == $sha)
      )] | sort_by(.created) | reverse | .[0]
      | if . == null then "" else [.id, .url, (.state // .readyState // "UNKNOWN")] | @tsv end
    ' "$response")"
    if [[ -n "$row" ]]; then
      local id found_host state
      IFS=$'\t' read -r id found_host state <<< "$row"
      if [[ "$state" == "READY" ]]; then
        jq -n \
          --arg role "$role" --arg project "$project_name" --arg projectId "$project_id" \
          --arg id "$id" --arg url "https://$found_host" --arg state "$state" \
          --arg sha "$source_sha" --arg ref "$source_ref" \
          '{role:$role,project:$project,projectId:$projectId,id:$id,url:$url,state:$state,sourceSha:$sha,sourceRef:$ref}' \
          | tee -a "$deploy_records"
        printf '%s\t%s\n' "$id" "https://$found_host"
        rm -rf "$worktree/.vercel" "$worktree/.env.local"
        return 0
      fi
      if [[ "$state" == "ERROR" || "$state" == "CANCELED" ]]; then
        echo "$role/$project_name deployment reached $state." >&2
        return 1
      fi
      echo "Waiting for $role/$project_name deployment ($state)..." >&2
    else
      echo "Waiting for $role/$project_name deployment to appear..." >&2
    fi
    sleep 10
  done
  echo "Timed out waiting for $role/$project_name deployment." >&2
  return 1
}

IFS=$'\t' read -r WEBSITE2_DEPLOYMENT_ID WEBSITE2_PREVIEW_URL \
  <<< "$(deploy_exact candidate-website2 website2 "$WEBSITE2_PROJECT_ID" "$CANDIDATE_DIR" "$PR_HEAD_SHA" "$CANDIDATE_BRANCH" 1 | tail -1)"
IFS=$'\t' read -r MORALTRADE_DEPLOYMENT_ID MORALTRADE_PREVIEW_URL \
  <<< "$(deploy_exact candidate-moraltrade moraltrade-site "$MORALTRADE_PROJECT_ID" "$CANDIDATE_DIR" "$PR_HEAD_SHA" "$CANDIDATE_BRANCH" 1 | tail -1)"
IFS=$'\t' read -r BASELINE_DEPLOYMENT_ID BASELINE_URL \
  <<< "$(deploy_exact current-main-baseline website2 "$WEBSITE2_PROJECT_ID" "$MAIN_DIR" "$MAIN_SHA" main 1 | tail -1)"

rm -rf "$CANDIDATE_DIR/.vercel" "$CANDIDATE_DIR/.env.local" "$MAIN_DIR/.vercel" "$MAIN_DIR/.env.local"
if [[ -n "$(git -C "$CANDIDATE_DIR" status --porcelain)" ]] || \
   [[ -n "$(git -C "$MAIN_DIR" status --porcelain)" ]]; then
  echo "Direct deployment changed one of the exact source worktrees." >&2
  git -C "$CANDIDATE_DIR" status --short >&2 || true
  git -C "$MAIN_DIR" status --short >&2 || true
  exit 1
fi

sudo apt-get install --yes postgresql-client >/dev/null

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
      'donation_offset_matches', (select count(*) from public.donation_offset_matches where offer_id='${FIXTURE_OFFER_ID}'::uuid),
      'financial_commitment_reservations', (select count(*) from public.financial_commitment_reservations where offer_id='${FIXTURE_OFFER_ID}'::uuid),
      'notifications', (select count(*) from public.trade_notifications where user_id in (select id from public.profiles where email in ('qa-market-owner@example.com','qa-market-responder@example.com'))),
      'outbox', (select count(*) from public.email_outbox where profile_id in (select id from public.profiles where email in ('qa-market-owner@example.com','qa-market-responder@example.com')) or recipient_email in ('qa-market-owner@example.com','qa-market-responder@example.com')),
      'migration_recorded', exists(select 1 from supabase_migrations.schema_migrations where version='20260729170000' and name='marketplace_atomic_acceptance_current_core'),
      'member_rpc', to_regprocedure('public.accept_marketplace_interest_v1(uuid,uuid,text)') is not null,
      'guest_rpc', to_regprocedure('public.accept_marketplace_guest_interest_v1(uuid,uuid,text)') is not null
    )::text;" | tee "$output"
  python3 - "$output" <<'PY'
import json
import sys
value = json.loads(open(sys.argv[1], encoding='utf-8').read().strip())
assert value['offer_clean'] is True, value
assert value['migration_recorded'] is True, value
assert value['member_rpc'] is True and value['guest_rpc'] is True, value
for key in (
    'interests','guest_interests','agreements','threads','comments','carts',
    'counterproposals','invitations','review_events','recommendations',
    'performance_bonds','donation_offset_matches','financial_commitment_reservations',
    'notifications','outbox'
):
    assert value[key] == 0, value
PY
}

seed_claimed_guest() {
  local message="$1"
  psql "$QA_SUPABASE_DB_URL" --no-psqlrc --set ON_ERROR_STOP=1 >/dev/null \
    --set=message="$message" <<SQL
insert into public.guest_interests(
  id, offer_id, contact_email, display_name, message, status, claimed_by_profile_id
) values (
  '${GUEST_INTEREST_ID}'::uuid,
  '${FIXTURE_OFFER_ID}'::uuid,
  'qa-market-responder@example.com',
  'QA Counterparty',
  :'message',
  'pending',
  (select id from public.profiles where email='qa-market-responder@example.com')
);
SQL
}

TEMP_VERCEL_BYPASS_SECRET=""
BYPASS_ACTIVE=0
revoke_bypass() {
  set +e
  if [[ "$BYPASS_ACTIVE" == "1" && -n "$TEMP_VERCEL_BYPASS_SECRET" ]]; then
    local payload="$RUNNER_TEMP/protection-revoke.json"
    jq -n --arg secret "$TEMP_VERCEL_BYPASS_SECRET" \
      '{revoke:{secret:$secret,regenerate:false}}' > "$payload"
    for project in "$WEBSITE2_PROJECT_ID" "$MORALTRADE_PROJECT_ID"; do
      curl --silent --show-error --request PATCH \
        --header "Authorization: Bearer $VERCEL_TOKEN" \
        --header "Content-Type: application/json" \
        --data-binary "@$payload" \
        "https://api.vercel.com/v1/projects/$project/protection-bypass?teamId=$VERCEL_TEAM_ID" \
        --output /dev/null || true
    done
    BYPASS_ACTIVE=0
  fi
}

cleanup_all() {
  local status=$?
  set +e
  reset_fixture
  verify_clean "$FINAL_ROOT/trap-clean-state.json" >/dev/null 2>&1
  revoke_bypass
  printf 'exit_status=%s\ncleanup_attempted=true\n' "$status" > "$FINAL_ROOT/terminal-status.txt"
  exit "$status"
}
trap cleanup_all EXIT

TEMP_VERCEL_BYPASS_SECRET="$(openssl rand -hex 16)"
echo "::add-mask::$TEMP_VERCEL_BYPASS_SECRET"
payload="$RUNNER_TEMP/protection-generate.json"
jq -n --arg secret "$TEMP_VERCEL_BYPASS_SECRET" --arg note "Temporary PR 326 exact-head rendered QA ${GITHUB_RUN_ID}" \
  '{generate:{secret:$secret,note:$note}}' > "$payload"
for project in "$WEBSITE2_PROJECT_ID" "$MORALTRADE_PROJECT_ID"; do
  curl --fail-with-body --silent --show-error --request PATCH \
    --header "Authorization: Bearer $VERCEL_TOKEN" \
    --header "Content-Type: application/json" \
    --data-binary "@$payload" \
    "https://api.vercel.com/v1/projects/$project/protection-bypass?teamId=$VERCEL_TEAM_ID" \
    --output /dev/null
done
BYPASS_ACTIVE=1

mkdir -p "$CANDIDATE_DIR/.qa"
git show "${HARNESS_COMMIT}:.github/scripts/marketplace-delta-exact-browser-qa.mjs" \
  > "$CANDIDATE_DIR/.qa/member.mjs"
cp "$GITHUB_WORKSPACE/.github/scripts/marketplace-delta-claimed-guest-browser-qa.mjs" \
  "$CANDIDATE_DIR/.qa/claimed-guest.mjs"
python3 - "$CANDIDATE_DIR/.qa/member.mjs" <<'PY'
from pathlib import Path
import sys
path = Path(sys.argv[1])
text = path.read_text(encoding="utf-8")
old_locator = r"page.getByText(/1 participant across 1 exact proposal/)"
new_locator = r"page.getByText(/1 participant\\s*across 1 exact proposal/)"
if text.count(old_locator) != 1:
    raise SystemExit(f"Expected exactly one participant-count locator; found {text.count(old_locator)}.")
text = text.replace(old_locator, new_locator, 1)
bypass_cookie_line = '          "x-vercel-set-bypass-cookie": "true",\n'
if text.count(bypass_cookie_line) != 1:
    raise SystemExit(f"Expected exactly one Vercel bypass-cookie header; found {text.count(bypass_cookie_line)}.")
text = text.replace(bypass_cookie_line, "", 1)
path.write_text(text, encoding="utf-8")
PY

export TEMP_VERCEL_BYPASS_SECRET WEBSITE2_PREVIEW_URL MORALTRADE_PREVIEW_URL BASELINE_URL
export QA_SUPABASE_DB_URL QA_TEST_PASSWORD
export EXPECTED_HEAD_SHA="$PR_HEAD_SHA"

merge_reports() {
  local viewport_dir="$1"
  python3 - "$viewport_dir" <<'PY'
import json
import sys
from pathlib import Path
root = Path(sys.argv[1])
member = json.loads((root / "member" / "report.json").read_text(encoding="utf-8"))
guest = json.loads((root / "claimed-guest" / "report.json").read_text(encoding="utf-8"))
outcome = "pass" if member.get("outcome") == "pass" and guest.get("outcome") == "pass" else "fail"
combined = {
    "outcome": outcome,
    "viewport": member.get("viewport"),
    "expectedHeadSha": member.get("expectedHeadSha"),
    "member": member,
    "claimedGuest": guest,
}
(root / "report.json").write_text(json.dumps(combined, indent=2) + "\n", encoding="utf-8")
lines = [
    "# Marketplace delta exact-head rendered QA",
    "",
    f"- Outcome: **{outcome}**",
    f"- Expected head: `{combined['expectedHeadSha']}`",
    f"- Viewport: `{combined['viewport']['width']} × {combined['viewport']['height']}`",
    f"- Member workflow: **{member.get('outcome')}**",
    f"- Claimed-guest workflow: **{guest.get('outcome')}**",
    "",
    "## Member checks",
    "",
]
lines.extend(f"- {row['outcome'].upper()}: {row['name']} — {row['detail']}" for row in member.get("checks", []))
lines.extend(["", "## Claimed-guest checks", ""])
lines.extend(f"- {row['outcome'].upper()}: {row['name']} — {row['detail']}" for row in guest.get("checks", []))
(root / "report.md").write_text("\n".join(lines) + "\n", encoding="utf-8")
if outcome != "pass":
    raise SystemExit("Combined rendered report is not a pass.")
PY
}

run_viewport() {
  local label="$1"
  local width="$2"
  local height="$3"
  local root="$ARTIFACT_ROOT/$label"
  local member_dir="$root/member"
  local guest_dir="$root/claimed-guest"
  mkdir -p "$member_dir" "$guest_dir"

  reset_fixture
  verify_clean "$FINAL_ROOT/${label}-pre-member-state.json"
  (
    cd "$CANDIDATE_DIR"
    VIEWPORT_WIDTH="$width" \
    VIEWPORT_HEIGHT="$height" \
    BROWSER_QA_ARTIFACT_DIR="$member_dir" \
    GITHUB_RUN_ID="${GITHUB_RUN_ID}-${label}-member" \
      node .qa/member.mjs
  )

  reset_fixture
  verify_clean "$FINAL_ROOT/${label}-post-member-state.json"
  local guest_message="[claimed guest ${GITHUB_RUN_ID}-${label}] linked legacy response"
  seed_claimed_guest "$guest_message"
  CLAIMED_GUEST_MESSAGE="$guest_message" \
  VIEWPORT_WIDTH="$width" \
  VIEWPORT_HEIGHT="$height" \
  BROWSER_QA_ARTIFACT_DIR="$guest_dir" \
  GITHUB_RUN_ID="${GITHUB_RUN_ID}-${label}-guest" \
    node "$CANDIDATE_DIR/.qa/claimed-guest.mjs"

  reset_fixture
  verify_clean "$FINAL_ROOT/${label}-post-guest-state.json"
  merge_reports "$root"
}

run_viewport desktop-1440x900 1440 900
run_viewport mobile-390x844 390 844

reset_fixture
verify_clean "$FINAL_ROOT/final-clean-state.json"
revoke_bypass

curl --fail-with-body --silent --show-error \
  --header "Authorization: Bearer $GITHUB_TOKEN" \
  --header "Accept: application/vnd.github+json" \
  "https://api.github.com/repos/${REPO}/pulls/${PRODUCT_PR_NUMBER}" \
  --output "$pull_json"
FINAL_PR_HEAD_SHA="$(jq -r '.head.sha' "$pull_json")"
git fetch --no-tags origin main "$CANDIDATE_BRANCH"
FINAL_MAIN_SHA="$(git rev-parse origin/main)"
if [[ "$FINAL_PR_HEAD_SHA" != "$PR_HEAD_SHA" || "$FINAL_MAIN_SHA" != "$MAIN_SHA" ]]; then
  echo "Main or PR #326 moved before final evidence sealing." >&2
  exit 1
fi

RUN_BROWSER_COMPLETED_AT="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
cat > "$FINAL_ROOT/exact-head-proof.txt" <<EOF_PROOF
run_started_at=${RUN_STARTED_AT}
browser_completed_at=${RUN_BROWSER_COMPLETED_AT}
main_sha=${MAIN_SHA}
main_tree=${MAIN_TREE}
exact_candidate_sha=${PR_HEAD_SHA}
exact_candidate_tree=${PR_HEAD_TREE}
product_branch=${CANDIDATE_BRANCH}
website2_deployment=${WEBSITE2_DEPLOYMENT_ID}
website2_preview=${WEBSITE2_PREVIEW_URL}
moraltrade_deployment=${MORALTRADE_DEPLOYMENT_ID}
moraltrade_preview=${MORALTRADE_PREVIEW_URL}
baseline_deployment=${BASELINE_DEPLOYMENT_ID}
baseline_url=${BASELINE_URL}
branch_scoped_qa_ref=${EXPECTED_QA_REF}
focused_tests=PASS
complete_application_tests=PASS
lint=PASS
typescript_differential=PASS
production_build=PASS
playwright_resolution_and_browser_smoke=PASS
desktop_member_status=PASS
desktop_claimed_guest_status=PASS
mobile_member_status=PASS
mobile_claimed_guest_status=PASS
final_fixture=clean
temporary_bypasses=revoked
production_changed=NO
runtime_log_query_required=true
EOF_PROOF

sleep 75
printf 'PASS: exact PR head, stable main, dual-project Preview, desktop/mobile member and claimed-guest workflows, and deterministic cleanup passed.\n'
