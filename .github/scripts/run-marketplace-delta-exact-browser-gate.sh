#!/usr/bin/env bash
set -euo pipefail

REPO="ghuser29384/Website2"
CANDIDATE_BRANCH="agent/marketplace-delta-current-main-20260729"
ORCHESTRATION_BRANCH="ops/materialize-marketplace-delta-final-20260730"
EXPECTED_QA_REF="hvmxfjjbdcgjjudmthdz"
QA_URL="https://${EXPECTED_QA_REF}.supabase.co"
VERCEL_SCOPE="ellen-s"
VERCEL_TEAM_ID="team_ySu6sF3Uho1E1GnJtCQPVEuJ"
WEBSITE2_PROJECT_ID="prj_uhfNhPo00nQrcbG0dk2zLWo7UmdK"
MORALTRADE_PROJECT_ID="prj_Em3j7Uj7RatX2R1ZYhla3XSHRde7"
FIXTURE_OFFER_ID="10000000-0000-4000-8000-000000000158"
CORRUPTED_ACTIONS_COMMIT="7cbf72a5460afb3f857f9c486175032f4eed3e2a"
RESTORE_ACTIONS_COMMIT="44442bcf9a5a339bdf4feb55b2bb770ab396af79"
ARTIFACT_ROOT="$GITHUB_WORKSPACE/marketplace-delta-browser-artifacts"
FINAL_ROOT="$GITHUB_WORKSPACE/marketplace-delta-final-proof"
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

cp .github/scripts/marketplace-delta-exact-browser-qa.mjs \
  "$RUNNER_TEMP/marketplace-delta-exact-browser-qa.mjs"

git config user.name "ghuser29384"
git config user.email "262476329+ghuser29384@users.noreply.github.com"
git fetch origin main "$CANDIDATE_BRANCH" "$ORCHESTRATION_BRANCH"
git checkout -B "$CANDIDATE_BRANCH" "origin/$CANDIDATE_BRANCH"

candidate_before="$(git rev-parse HEAD)"
if [[ "$(cat src/app/actions.ts 2>/dev/null || true)" == "__TOO_LARGE__" ]]; then
  if [[ "$candidate_before" != "$CORRUPTED_ACTIONS_COMMIT" ]]; then
    echo "The actions file is corrupted at an unexpected commit: $candidate_before" >&2
    exit 1
  fi
  git checkout "$RESTORE_ACTIONS_COMMIT" -- src/app/actions.ts
fi

python3 - <<'PY'
from pathlib import Path

path = Path("src/app/actions.ts")
source = path.read_text(encoding="utf-8")
start = source.index("async function queueEmailOutbox")
end = source.index("\nasync function requireAdminViewer", start)
block = source[start:end]
old = "  const supabase = await createClient();\n"
new = "  const supabase = createServiceClient();\n"
if old in block:
    block = block.replace(old, new, 1)
elif new not in block:
    raise SystemExit("Could not establish the server-only email-outbox client.")
source = source[:start] + block + source[end:]
path.write_text(source, encoding="utf-8")

contract = Path("src/lib/marketplace-delta-contract.test.ts")
text = contract.read_text(encoding="utf-8")
marker = 'test("member and guest acceptance call atomic database boundaries", () => {'
insert = '''test("email outbox writes remain server-only", () => {
  const outbox = between(
    actions,
    "async function queueEmailOutbox",
    "async function requireAdminViewer",
  );
  assert.match(outbox, /createServiceClient\\(\\)/);
  assert.doesNotMatch(outbox, /await createClient\\(\\)/);
});

'''
if insert not in text:
    if marker not in text:
        raise SystemExit("Missing marketplace delta contract insertion marker.")
    text = text.replace(marker, insert + marker, 1)
    contract.write_text(text, encoding="utf-8")
PY

if ! git diff --quiet; then
  git add src/app/actions.ts src/lib/marketplace-delta-contract.test.ts
  git commit -m "Restore actions and keep marketplace email outbox writes server-only"
fi

MAIN_SHA="$(git rev-parse origin/main)"
if ! git merge-base --is-ancestor "$MAIN_SHA" HEAD; then
  set +e
  git merge --no-ff --no-commit origin/main
  merge_status=$?
  set -e
  conflicts="$(git diff --name-only --diff-filter=U | sort)"
  if [[ -n "$conflicts" ]]; then
    if [[ "$conflicts" != "src/app/trades/new/page.tsx" ]]; then
      echo "Unexpected merge conflicts:" >&2
      echo "$conflicts" >&2
      git merge --abort || true
      exit 1
    fi
    git checkout --ours -- src/app/trades/new/page.tsx
    git add src/app/trades/new/page.tsx
  elif [[ "$merge_status" != "0" ]]; then
    echo "Merge failed without a resolvable conflict." >&2
    git merge --abort || true
    exit 1
  fi

  python3 - <<'PY'
from pathlib import Path
path = Path("src/app/trades/new/page.tsx")
source = path.read_text(encoding="utf-8")
source = source.replace(
    "Create a pledge-swap, donation redirect, conditional donation, existing-pool contribution offer, or moral public-goods pool through one interface.",
    "Create a pledge-swap, donation redirect, Donation Upgrade, existing-pool contribution offer, or moral public-goods pool through one interface.",
)
path.write_text(source, encoding="utf-8")
PY
  git add src/app/trades/new/page.tsx
  if [[ -n "$(git diff --name-only --diff-filter=U)" ]]; then
    echo "Unresolved merge conflicts remain." >&2
    exit 1
  fi
  git commit -m "Integrate current main into the marketplace delta"
fi

if [[ "$(git rev-parse origin/main)" != "$MAIN_SHA" ]]; then
  echo "Current main changed during integration; refusing a stale gate." >&2
  exit 1
fi

npm ci
node --import tsx --test \
  src/lib/marketplace-participant-groups.test.ts \
  src/lib/marketplace-delta-contract.test.ts
npm test
npm run lint

git diff --check

candidate_tsc="$RUNNER_TEMP/candidate-tsc.txt"
base_tsc="$RUNNER_TEMP/base-tsc.txt"
set +e
npx tsc --noEmit --pretty false > "$candidate_tsc" 2>&1
candidate_tsc_status=$?
set -e
base_dir="$RUNNER_TEMP/current-main-tsc"
git worktree add --detach "$base_dir" "$MAIN_SHA"
ln -s "$GITHUB_WORKSPACE/node_modules" "$base_dir/node_modules"
set +e
(
  cd "$base_dir"
  npx --no-install tsc --noEmit --pretty false > "$base_tsc" 2>&1
)
base_tsc_status=$?
set -e
git worktree remove --force "$base_dir"

CANDIDATE_TSC="$candidate_tsc" BASE_TSC="$base_tsc" \
CANDIDATE_TSC_STATUS="$candidate_tsc_status" BASE_TSC_STATUS="$base_tsc_status" \
python3 - <<'PY'
import os
import re
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
base = rows(os.environ["BASE_TSC"])
candidate_only = sorted(candidate - base)
report = [
    f"main_exit={os.environ['BASE_TSC_STATUS']}",
    f"candidate_exit={os.environ['CANDIDATE_TSC_STATUS']}",
    f"main_errors={len(base)}",
    f"candidate_errors={len(candidate)}",
    f"candidate_only_errors={len(candidate_only)}",
]
if candidate_only:
    report.extend(["", "Candidate-only errors:", *candidate_only])
Path("marketplace-delta-typescript-differential.txt").write_text("\n".join(report) + "\n", encoding="utf-8")
print("\n".join(report))
if candidate_only:
    raise SystemExit("Candidate introduced TypeScript errors relative to exact current main.")
PY

npm run build

git push origin HEAD:"$CANDIDATE_BRANCH"

env_proof="$FINAL_ROOT/branch-scoped-qa-environment.txt"
: > "$env_proof"
configure_project() {
  local project="$1"
  local env_file="$RUNNER_TEMP/${project}-preview.env"
  rm -rf .vercel
  npx --yes vercel@latest link \
    --yes \
    --project "$project" \
    --scope "$VERCEL_SCOPE" \
    --token "$VERCEL_TOKEN" >/dev/null

  printf '%s' "$QA_URL" | npx --yes vercel@latest env add \
    NEXT_PUBLIC_SUPABASE_URL preview "$CANDIDATE_BRANCH" \
    --force --no-sensitive --scope "$VERCEL_SCOPE" --token "$VERCEL_TOKEN" >/dev/null
  printf '%s' "$QA_SUPABASE_PUBLISHABLE_KEY" | npx --yes vercel@latest env add \
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY preview "$CANDIDATE_BRANCH" \
    --force --no-sensitive --scope "$VERCEL_SCOPE" --token "$VERCEL_TOKEN" >/dev/null
  printf '%s' "$QA_SUPABASE_SERVICE_ROLE_KEY" | npx --yes vercel@latest env add \
    SUPABASE_SERVICE_ROLE_KEY preview "$CANDIDATE_BRANCH" \
    --force --sensitive --scope "$VERCEL_SCOPE" --token "$VERCEL_TOKEN" >/dev/null

  npx --yes vercel@latest env pull "$env_file" \
    --yes --environment=preview --git-branch="$CANDIDATE_BRANCH" \
    --scope "$VERCEL_SCOPE" --token "$VERCEL_TOKEN" >/dev/null
  (
    set -a
    source "$env_file"
    set +a
    [[ "$NEXT_PUBLIC_SUPABASE_URL" == "$QA_URL" ]]
    [[ "$NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY" == "$QA_SUPABASE_PUBLISHABLE_KEY" ]]
    [[ "$SUPABASE_SERVICE_ROLE_KEY" == "$QA_SUPABASE_SERVICE_ROLE_KEY" ]]
  )
  rm -f "$env_file"
  printf 'project=%s branch=%s qa_ref=%s url_match=true publishable_key_match=true service_role_match=true\n' \
    "$project" "$CANDIDATE_BRANCH" "$EXPECTED_QA_REF" >> "$env_proof"
  rm -rf .vercel
}

configure_project website2
configure_project moraltrade-site

product_tree="$(git rev-parse HEAD^{tree})"
git commit --allow-empty -m "Redeploy exact marketplace delta with QA Preview bindings"
EXACT_HEAD_SHA="$(git rev-parse HEAD)"
[[ "$(git rev-parse HEAD^{tree})" == "$product_tree" ]]
git push origin HEAD:"$CANDIDATE_BRANCH"

if [[ "$(git ls-remote origin refs/heads/main | cut -f1)" != "$MAIN_SHA" ]]; then
  echo "Current main changed before Preview deployment; refusing a stale exact-head gate." >&2
  exit 1
fi

wait_deployment() {
  local project_id="$1"
  local project_name="$2"
  local response="$RUNNER_TEMP/${project_name}-deployments.json"
  for _ in $(seq 1 120); do
    curl --fail-with-body --silent --show-error \
      --header "Authorization: Bearer $VERCEL_TOKEN" \
      "https://api.vercel.com/v6/deployments?projectId=${project_id}&limit=100&teamId=${VERCEL_TEAM_ID}" \
      --output "$response"
    local row
    row="$(jq -r --arg sha "$EXACT_HEAD_SHA" --arg ref "$CANDIDATE_BRANCH" '
      [.deployments[] | select(.meta.githubCommitSha == $sha and .meta.githubCommitRef == $ref)]
      | sort_by(.created) | reverse | .[0]
      | if . == null then "" else [.id, .url, (.state // .readyState // "UNKNOWN")] | @tsv end
    ' "$response")"
    if [[ -n "$row" ]]; then
      local id url state
      IFS=$'\t' read -r id url state <<< "$row"
      if [[ "$state" == "READY" ]]; then
        printf '%s\t%s\t%s\n' "$id" "$url" "$state"
        return 0
      fi
      if [[ "$state" == "ERROR" || "$state" == "CANCELED" ]]; then
        echo "$project_name exact deployment reached $state." >&2
        return 1
      fi
      echo "Waiting for $project_name exact deployment ($state)..." >&2
    else
      echo "Waiting for $project_name exact deployment to appear..." >&2
    fi
    sleep 10
  done
  echo "Timed out waiting for $project_name exact deployment." >&2
  return 1
}

IFS=$'\t' read -r WEBSITE2_DEPLOYMENT_ID WEBSITE2_HOST _ \
  <<< "$(wait_deployment "$WEBSITE2_PROJECT_ID" website2)"
IFS=$'\t' read -r MORALTRADE_DEPLOYMENT_ID MORALTRADE_HOST _ \
  <<< "$(wait_deployment "$MORALTRADE_PROJECT_ID" moraltrade-site)"
WEBSITE2_PREVIEW_URL="https://${WEBSITE2_HOST}"
MORALTRADE_PREVIEW_URL="https://${MORALTRADE_HOST}"

prod_response="$RUNNER_TEMP/production-deployments.json"
curl --fail-with-body --silent --show-error \
  --header "Authorization: Bearer $VERCEL_TOKEN" \
  "https://api.vercel.com/v6/deployments?projectId=${MORALTRADE_PROJECT_ID}&target=production&limit=20&teamId=${VERCEL_TEAM_ID}" \
  --output "$prod_response"
PRODUCTION_MAIN_SHA="$(jq -r '[.deployments[] | select((.state // .readyState) == "READY")][0].meta.githubCommitSha // ""' "$prod_response")"
if [[ "$PRODUCTION_MAIN_SHA" != "$MAIN_SHA" ]]; then
  echo "Production is not the exact current-main baseline. expected=$MAIN_SHA actual=$PRODUCTION_MAIN_SHA" >&2
  exit 1
fi
BASELINE_URL="https://www.moraltrade.org"

TEMP_VERCEL_BYPASS_SECRET=""
BYPASS_ACTIVE=0
cleanup_bypass() {
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
trap cleanup_bypass EXIT
TEMP_VERCEL_BYPASS_SECRET="$(openssl rand -hex 16)"
echo "::add-mask::$TEMP_VERCEL_BYPASS_SECRET"
payload="$RUNNER_TEMP/protection-generate.json"
jq -n --arg secret "$TEMP_VERCEL_BYPASS_SECRET" --arg note "Temporary marketplace delta exact-head browser QA" \
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
for key in ('interests','guest_interests','agreements','threads','comments','carts','counterproposals','invitations','review_events','notifications','outbox'):
    assert value[key] == 0, value
PY
}

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
    node "$RUNNER_TEMP/marketplace-delta-exact-browser-qa.mjs"
}

run_browser desktop-1440x900 1440 900
reset_fixture
run_browser mobile-390x844 390 844
reset_fixture
verify_clean "$FINAL_ROOT/post-browser-state.json"

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

cat > "$FINAL_ROOT/exact-head-proof.txt" <<EOF_PROOF
main_sha=${MAIN_SHA}
exact_candidate_sha=${EXACT_HEAD_SHA}
product_tree=${product_tree}
website2_deployment=${WEBSITE2_DEPLOYMENT_ID}
website2_preview=${WEBSITE2_PREVIEW_URL}
moraltrade_deployment=${MORALTRADE_DEPLOYMENT_ID}
moraltrade_preview=${MORALTRADE_PREVIEW_URL}
baseline_url=${BASELINE_URL}
baseline_main_sha=${PRODUCTION_MAIN_SHA}
branch_scoped_qa_ref=${EXPECTED_QA_REF}
desktop_status=PASS
mobile_status=PASS
post_browser_fixture=clean
temporary_bypasses=revoked
production_changed=NO
EOF_PROOF
cp marketplace-delta-typescript-differential.txt "$FINAL_ROOT/"

printf 'PASS: exact-head QA environment, rendered comparison, desktop/mobile workflows, and cleanup passed.\n'
