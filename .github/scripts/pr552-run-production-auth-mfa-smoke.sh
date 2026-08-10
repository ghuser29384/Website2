#!/usr/bin/env bash
set -euo pipefail

required=(
  CANDIDATE_SHA DEPLOYMENT_ID DEPLOYMENT_HOST PRODUCTION_ORIGIN EXPECTED_RELEASE_REASON
  EXPECTED_SUPABASE_REF NEXT_PUBLIC_SUPABASE_URL NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  VERCEL_ORG_ID VERCEL_PROJECT_ID VERCEL_TOKEN PROD_SUPABASE_DB_URL
  HARNESS_PATH PRIVATE_STATE_PATH OUTPUT_DIR RUNNER_TEMP
)
for name in "${required[@]}"; do
  if [[ -z "${!name:-}" ]]; then
    echo "Missing required environment variable: $name" >&2
    exit 2
  fi
done

[[ "$CANDIDATE_SHA" =~ ^[0-9a-f]{40}$ ]]
[[ "$DEPLOYMENT_ID" =~ ^dpl_[A-Za-z0-9]+$ ]]
[[ "$DEPLOYMENT_HOST" =~ ^[A-Za-z0-9.-]+\.vercel\.app$ ]]
[[ "$PRODUCTION_ORIGIN" == 'https://www.moraltrade.org' ]]

echo "::add-mask::$PROD_SUPABASE_DB_URL"
mkdir -p "$OUTPUT_DIR" "$(dirname "$PRIVATE_STATE_PATH")"
cleanup_completed=0

export PR552_PREVIEW_ORIGIN="$PRODUCTION_ORIGIN"
export PR552_EXPECTED_SHA="$CANDIDATE_SHA"
export PR552_EXPECTED_DEPLOYMENT_ID="$DEPLOYMENT_ID"
export PR552_EXPECTED_SUPABASE_REF="$EXPECTED_SUPABASE_REF"
export PR552_OUTPUT_DIR="$OUTPUT_DIR"
export PR552_PRIVATE_STATE_PATH="$PRIVATE_STATE_PATH"

run_cleanup_retry() {
  if [[ "$cleanup_completed" -eq 1 ]]; then
    return 0
  fi
  set +e
  node "$HARNESS_PATH" --cleanup-only \
    > >(tee "$OUTPUT_DIR/cleanup-retry.log") \
    2> >(tee "$OUTPUT_DIR/cleanup-retry.stderr.log" >&2)
  local code=$?
  set -e
  printf '%s\n' "$code" > "$OUTPUT_DIR/cleanup-retry-exit-code.txt"
  if [[ "$code" -eq 0 ]]; then
    cleanup_completed=1
  fi
  return 0
}

on_exit() {
  local status="$1"
  trap - EXIT
  run_cleanup_retry || true
  rm -rf .qa-private .qa-runtime
  exit "$status"
}
trap 'on_exit $?' EXIT

capture_aliases() {
  local destination="$1"
  mkdir -p "$destination"
  for alias_name in moraltrade.org www.moraltrade.org; do
    local alias_key="${alias_name//./-}"
    local alias_path="$destination/${alias_key}.json"
    curl -fsS \
      -H "Authorization: Bearer ${VERCEL_TOKEN}" \
      "https://api.vercel.com/v4/aliases/${alias_name}?projectId=${VERCEL_PROJECT_ID}&teamId=${VERCEL_ORG_ID}" \
      > "$alias_path"
    jq -e \
      --arg alias "$alias_name" \
      --arg project "$VERCEL_PROJECT_ID" \
      --arg deployment "$DEPLOYMENT_ID" '
        (.alias == $alias)
        and (.projectId == $project)
        and ((.deploymentId // .deployment.id // .deployment.uid // "") == $deployment)
      ' "$alias_path" >/dev/null
  done
}

curl -fsS \
  -H "Authorization: Bearer ${VERCEL_TOKEN}" \
  "https://api.vercel.com/v13/deployments/${DEPLOYMENT_ID}?teamId=${VERCEL_ORG_ID}&withGitRepoInfo=true" \
  > "$OUTPUT_DIR/exact-deployment-before.json"
jq -e \
  --arg deploymentId "$DEPLOYMENT_ID" \
  --arg projectId "$VERCEL_PROJECT_ID" \
  --arg sha "$CANDIDATE_SHA" \
  --arg host "$DEPLOYMENT_HOST" \
  --arg releaseReason "$EXPECTED_RELEASE_REASON" '
    ((.uid // .id) == $deploymentId)
    and ((.projectId // .project.id // "") == $projectId)
    and ((.readyState // .state // "") == "READY")
    and (.target == "production")
    and ((.aliasError // null) == null)
    and (.url == $host)
    and (.meta.githubCommitOrg == "ghuser29384")
    and (.meta.githubCommitRepo == "Website2")
    and (.meta.githubCommitSha == $sha)
    and (.meta.moralTradeCandidateSha == $sha)
    and (.meta.releaseReason == $releaseReason)
  ' "$OUTPUT_DIR/exact-deployment-before.json" >/dev/null
capture_aliases "$OUTPUT_DIR/aliases-before"

DB_URL="$PROD_SUPABASE_DB_URL" node <<'NODE'
const url = new URL(process.env.DB_URL);
if (url.username !== `postgres.${process.env.EXPECTED_SUPABASE_REF}`) {
  throw new Error("Wrong production database user.");
}
if (!url.hostname.endsWith(".pooler.supabase.com")) {
  throw new Error("Wrong production database host.");
}
if (url.pathname !== "/postgres" || !url.password) {
  throw new Error("Invalid production database target.");
}
if (new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname.split(".")[0] !== process.env.EXPECTED_SUPABASE_REF) {
  throw new Error("Wrong public Supabase project.");
}
NODE
[[ "$(PGCONNECT_TIMEOUT=10 psql "$PROD_SUPABASE_DB_URL" -Atqc 'select current_database()')" == 'postgres' ]]

set +e
node "$HARNESS_PATH" \
  > >(tee "$OUTPUT_DIR/test.log") \
  2> >(tee "$OUTPUT_DIR/test.stderr.log" >&2)
test_code=$?
set -e
printf '%s\n' "$test_code" > "$OUTPUT_DIR/test-exit-code.txt"

run_cleanup_retry
capture_aliases "$OUTPUT_DIR/aliases-after"

curl -fsS \
  -H "Authorization: Bearer ${VERCEL_TOKEN}" \
  "https://api.vercel.com/v13/deployments/${DEPLOYMENT_ID}?teamId=${VERCEL_ORG_ID}&withGitRepoInfo=true" \
  > "$OUTPUT_DIR/exact-deployment-after.json"
jq -e \
  --arg deploymentId "$DEPLOYMENT_ID" \
  --arg sha "$CANDIDATE_SHA" '
    ((.uid // .id) == $deploymentId)
    and ((.readyState // .state // "") == "READY")
    and (.target == "production")
    and ((.aliasError // null) == null)
    and (.meta.githubCommitSha == $sha)
  ' "$OUTPUT_DIR/exact-deployment-after.json" >/dev/null

user_id="$(jq -r '.userId // empty' "$OUTPUT_DIR/state.json")"
run_id="$(jq -r '.runId // empty' "$OUTPUT_DIR/state.json")"
[[ "$user_id" =~ ^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$ ]]
[[ "$run_id" =~ ^[0-9]+$ ]]
PGCONNECT_TIMEOUT=10 psql "$PROD_SUPABASE_DB_URL" --no-psqlrc -Atv ON_ERROR_STOP=1 \
  -c "select jsonb_build_object(
    'userId', '${user_id}',
    'runId', '${run_id}',
    'authRows', (select count(*) from auth.users where id = '${user_id}'::uuid),
    'identityRows', (select count(*) from auth.identities where user_id = '${user_id}'::uuid),
    'factorRows', (select count(*) from auth.mfa_factors where user_id = '${user_id}'::uuid),
    'sessionRows', (select count(*) from auth.sessions where user_id = '${user_id}'::uuid),
    'refreshTokenRows', (select count(*) from auth.refresh_tokens where user_id = '${user_id}'),
    'profileRows', (select count(*) from public.profiles where id = '${user_id}'::uuid),
    'scopedAuthRows', (select count(*) from auth.users where raw_user_meta_data ->> 'qa_scope' = 'pr552-exact-preview-mfa' and raw_user_meta_data ->> 'qa_run_id' = '${run_id}')
  );" > "$OUTPUT_DIR/independent-db-cleanup-proof.json"
jq -e '
  .authRows == 0
  and .identityRows == 0
  and .factorRows == 0
  and .sessionRows == 0
  and .refreshTokenRows == 0
  and .profileRows == 0
  and .scopedAuthRows == 0
' "$OUTPUT_DIR/independent-db-cleanup-proof.json" >/dev/null

node <<'NODE'
const fs = require("node:fs");
const path = require("node:path");
const dir = process.env.OUTPUT_DIR;
const read = (name) => JSON.parse(fs.readFileSync(path.join(dir, name), "utf8"));
const code = (name) => Number.parseInt(fs.readFileSync(path.join(dir, name), "utf8").trim(), 10);
const assert = (value, message) => { if (!value) throw new Error(message); };
const clean = (value) => value && value.consoleErrors.length === 0 &&
  value.pageErrors.length === 0 && value.requestFailures.length === 0 &&
  value.httpErrors.length === 0;

assert(code("test-exit-code.txt") === 0, "Authenticated production lifecycle failed.");
assert(code("cleanup-retry-exit-code.txt") === 0, "Independent cleanup retry failed.");

const state = read("state.json");
const result = read("result.json");
const cleanup = read("cleanup.json");
const retry = read("cleanup-only-result.json");
const dbProof = read("independent-db-cleanup-proof.json");
assert(state.candidateSha === process.env.CANDIDATE_SHA, "Candidate mismatch.");
assert(state.deploymentId === process.env.DEPLOYMENT_ID, "Deployment mismatch.");
assert(state.previewOrigin === process.env.PRODUCTION_ORIGIN, "Canonical production origin mismatch.");
assert(state.userCreated === true && state.beforeFactorIds.length === 0, "Fresh user baseline not proved.");
assert(result.testPassed === true && result.cleanupPassed === true, "Lifecycle or in-process cleanup failed.");
assert(result.desktop?.verifiedFactors === 1 && result.desktop?.sessionLevel === "aal2", "Desktop AAL2 proof failed.");
assert(result.mobile?.verifiedFactors === 1 && result.mobile?.sessionLevel === "aal2", "Mobile AAL2 proof failed.");
assert(result.desktop.horizontalOverflow <= 1 && result.mobile.horizontalOverflow <= 1, "Viewport overflow proof failed.");
assert(clean(result.desktop.diagnostics) && clean(result.mobile.diagnostics), "Browser diagnostics were not empty.");
assert(result.factorLifecycle?.exactSingleNewFactor === true, "Exactly-one-factor proof failed.");
assert(result.factorLifecycle.createdFactorId === state.factorId, "Created factor mismatch.");
assert(cleanup.exactFactorOnly === true, "Exact factor cleanup was not proved.");
assert(cleanup.apiFactorCleanupError === null, "User-level factor cleanup reported an error.");
assert(cleanup.apiFactorCleanup?.deletedFactorId === state.factorId, "Different factor was deleted.");
assert(cleanup.apiFactorCleanup?.factorsAfterCleanup.length === 0, "Factor baseline was not restored.");
assert(cleanup.userAbsent === true && retry.userAbsent === true, "Temporary-user absence was not proved twice.");
assert(dbProof.authRows === 0 && dbProof.identityRows === 0 && dbProof.factorRows === 0 &&
  dbProof.sessionRows === 0 && dbProof.refreshTokenRows === 0 && dbProof.profileRows === 0 &&
  dbProof.scopedAuthRows === 0, "Independent database cleanup proof failed.");

const summary = {
  schemaVersion: 1,
  candidateSha: result.candidateSha,
  deploymentId: result.deploymentId,
  productionOrigin: result.previewOrigin,
  desktop: result.desktop,
  mobile: result.mobile,
  exactSingleNewFactor: true,
  exactFactorDeleted: state.factorId,
  factorSetRestored: [],
  temporaryUserAbsent: true,
  independentCleanupProvedAbsence: true,
  aliasesVerifiedBeforeAndAfter: true,
};
fs.writeFileSync(path.join(dir, "verified-summary.json"), `${JSON.stringify(summary, null, 2)}\n`);
NODE

rm -rf .qa-private .qa-runtime
[[ ! -e "$PRIVATE_STATE_PATH" ]]
[[ ! -e "$HARNESS_PATH" ]]
trap - EXIT
