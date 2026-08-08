#!/usr/bin/env bash
set -uo pipefail

required=(
  CANDIDATE_SHA DEPLOYMENT_ID PREVIEW_ORIGIN EXPECTED_SUPABASE_REF
  VERCEL_ORG_ID VERCEL_PROJECT_ID VERCEL_TOKEN PROD_SUPABASE_DB_URL
  HARNESS_PATH PRIVATE_STATE_PATH OUTPUT_DIR RUNNER_TEMP
)
for name in "${required[@]}"; do
  if [[ -z "${!name:-}" ]]; then
    echo "Missing required environment variable: $name" >&2
    exit 2
  fi
done

echo "::add-mask::$PROD_SUPABASE_DB_URL"
mkdir -p "$OUTPUT_DIR" "$(dirname "$PRIVATE_STATE_PATH")"

secret_file="$RUNNER_TEMP/pr552-v9-vercel-bypass-secret"
cleanup_attempted=0
revoke_attempted=0

run_cleanup_retry() {
  if [[ "$cleanup_attempted" -eq 1 ]]; then
    return 0
  fi
  cleanup_attempted=1
  export PR552_PREVIEW_ORIGIN="$PREVIEW_ORIGIN"
  export PR552_EXPECTED_SHA="$CANDIDATE_SHA"
  export PR552_EXPECTED_DEPLOYMENT_ID="$DEPLOYMENT_ID"
  export PR552_EXPECTED_SUPABASE_REF="$EXPECTED_SUPABASE_REF"
  export PR552_OUTPUT_DIR="$OUTPUT_DIR"
  export PR552_PRIVATE_STATE_PATH="$PRIVATE_STATE_PATH"
  set +e
  node "$HARNESS_PATH" --cleanup-only \
    > >(tee "$OUTPUT_DIR/cleanup-retry.log") \
    2> >(tee "$OUTPUT_DIR/cleanup-retry.stderr.log" >&2)
  local code=$?
  set -e
  printf '%s\n' "$code" > "$OUTPUT_DIR/cleanup-retry-exit-code.txt"
  return 0
}

revoke_bypass() {
  if [[ "$revoke_attempted" -eq 1 ]]; then
    return 0
  fi
  revoke_attempted=1
  if [[ ! -s "$secret_file" ]]; then
    jq -n '{schemaVersion:1,generated:false,revoked:false}' \
      > "$OUTPUT_DIR/vercel-bypass-revocation-proof.json"
    return 0
  fi

  local secret request_file response_file code post_count pre_count
  secret="$(cat "$secret_file")"
  echo "::add-mask::$secret"
  request_file="$RUNNER_TEMP/pr552-v9-vercel-bypass-revoke-request.json"
  response_file="$RUNNER_TEMP/pr552-v9-vercel-bypass-revoke-response.json"
  jq -n --arg secret "$secret" '{revoke:{secret:$secret,regenerate:false}}' > "$request_file"
  code="$(curl -sS -o "$response_file" -w '%{http_code}' -X PATCH \
    -H "Authorization: Bearer ${VERCEL_TOKEN}" \
    -H 'Content-Type: application/json' \
    "https://api.vercel.com/v1/projects/${VERCEL_PROJECT_ID}/protection-bypass?teamId=${VERCEL_ORG_ID}" \
    --data-binary @"$request_file" || true)"
  if [[ "$code" != '200' ]]; then
    echo "Vercel bypass revocation returned HTTP $code" >&2
    rm -f "$request_file" "$response_file"
    return 1
  fi
  if ! jq -e --arg secret "$secret" \
    '((.protectionBypass // {}) | has($secret)) | not' "$response_file" >/dev/null; then
    echo "Generated Vercel bypass still exists after revocation." >&2
    return 1
  fi
  post_count="$(jq '(.protectionBypass // {}) | length' "$response_file")"
  pre_count="$(jq -r '.preexistingBypassCount' "$OUTPUT_DIR/vercel-bypass-generation-proof.json")"
  if [[ "$post_count" -ne "$pre_count" ]]; then
    echo "Vercel bypass count was not restored." >&2
    return 1
  fi
  jq -n \
    --argjson preexistingBypassCount "$pre_count" \
    --argjson postRevocationBypassCount "$post_count" \
    '{schemaVersion:1,generated:true,revoked:true,exactGeneratedSecretAbsent:true,preexistingBypassCount:$preexistingBypassCount,postRevocationBypassCount:$postRevocationBypassCount}' \
    > "$OUTPUT_DIR/vercel-bypass-revocation-proof.json"
  rm -f "$secret_file" "$request_file" "$response_file"
  return 0
}

on_exit() {
  local status="$1"
  trap - EXIT
  run_cleanup_retry || true
  revoke_bypass || true
  rm -rf .qa-private .qa-runtime
  rm -f "$secret_file" \
    "$RUNNER_TEMP/pr552-v9-vercel-bypass-generate-request.json" \
    "$RUNNER_TEMP/pr552-v9-vercel-bypass-generate-response.json" \
    "$RUNNER_TEMP/pr552-v9-vercel-bypass-revoke-request.json" \
    "$RUNNER_TEMP/pr552-v9-vercel-bypass-revoke-response.json"
  exit "$status"
}
trap 'on_exit $?' EXIT

curl -fsS \
  -H "Authorization: Bearer ${VERCEL_TOKEN}" \
  "https://api.vercel.com/v13/deployments/${DEPLOYMENT_ID}?teamId=${VERCEL_ORG_ID}" \
  > exact-deployment.json
jq -e \
  --arg deploymentId "$DEPLOYMENT_ID" \
  --arg projectId "$VERCEL_PROJECT_ID" \
  --arg sha "$CANDIDATE_SHA" \
  --arg url "${PREVIEW_ORIGIN#https://}" '
    ((.uid // .id) == $deploymentId)
    and ((.projectId // .project.id // "") == $projectId)
    and ((.readyState // .state // "") == "READY")
    and ((.target // null) == null)
    and ((.aliasError // null) == null)
    and (.url == $url)
    and (.meta.githubCommitOrg == "ghuser29384")
    and (.meta.githubCommitRepo == "Website2")
    and (.meta.githubCommitSha == $sha)
    and (.meta.moralTradeCandidateSha == $sha)
    and (.meta.releaseReason == "pr552-dashboard-account-security-preview-final")
  ' exact-deployment.json >/dev/null

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
NODE
[[ "$(PGCONNECT_TIMEOUT=10 psql "$PROD_SUPABASE_DB_URL" -Atqc 'select current_database()')" == 'postgres' ]]

secret="$(openssl rand -hex 16)"
[[ "$secret" =~ ^[A-Za-z0-9]{32}$ ]]
echo "::add-mask::$secret"
printf '%s' "$secret" > "$secret_file"
chmod 600 "$secret_file"
request_file="$RUNNER_TEMP/pr552-v9-vercel-bypass-generate-request.json"
response_file="$RUNNER_TEMP/pr552-v9-vercel-bypass-generate-response.json"
jq -n \
  --arg secret "$secret" \
  --arg note "PR552 exact Preview MFA QA v9 run ${GITHUB_RUN_ID:-unknown}" \
  '{generate:{secret:$secret,note:$note}}' > "$request_file"
code="$(curl -sS -o "$response_file" -w '%{http_code}' -X PATCH \
  -H "Authorization: Bearer ${VERCEL_TOKEN}" \
  -H 'Content-Type: application/json' \
  "https://api.vercel.com/v1/projects/${VERCEL_PROJECT_ID}/protection-bypass?teamId=${VERCEL_ORG_ID}" \
  --data-binary @"$request_file")"
[[ "$code" == '200' ]]
jq -e --arg secret "$secret" '(.protectionBypass // {}) | has($secret)' "$response_file" >/dev/null
post_count="$(jq '(.protectionBypass // {}) | length' "$response_file")"
pre_count="$((post_count - 1))"
[[ "$pre_count" -ge 0 ]]
jq -n \
  --arg projectId "$VERCEL_PROJECT_ID" \
  --arg deploymentId "$DEPLOYMENT_ID" \
  --argjson preexistingBypassCount "$pre_count" \
  --argjson postGenerationBypassCount "$post_count" \
  '{schemaVersion:1,projectId:$projectId,deploymentId:$deploymentId,generated:true,preexistingBypassCount:$preexistingBypassCount,postGenerationBypassCount:$postGenerationBypassCount}' \
  > "$OUTPUT_DIR/vercel-bypass-generation-proof.json"
rm -f "$request_file" "$response_file"

export VERCEL_AUTOMATION_BYPASS_SECRET="$secret"
export PR552_PREVIEW_ORIGIN="$PREVIEW_ORIGIN"
export PR552_EXPECTED_SHA="$CANDIDATE_SHA"
export PR552_EXPECTED_DEPLOYMENT_ID="$DEPLOYMENT_ID"
export PR552_EXPECTED_SUPABASE_REF="$EXPECTED_SUPABASE_REF"
export PR552_OUTPUT_DIR="$OUTPUT_DIR"
export PR552_PRIVATE_STATE_PATH="$PRIVATE_STATE_PATH"

set +e
node "$HARNESS_PATH" \
  > >(tee "$OUTPUT_DIR/test.log") \
  2> >(tee "$OUTPUT_DIR/test.stderr.log" >&2)
test_code=$?
set -e
printf '%s\n' "$test_code" > "$OUTPUT_DIR/test-exit-code.txt"

run_cleanup_retry
revoke_bypass

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

const generation = read("vercel-bypass-generation-proof.json");
const revocation = read("vercel-bypass-revocation-proof.json");
assert(generation.generated === true, "Bypass generation not proved.");
assert(revocation.revoked === true && revocation.exactGeneratedSecretAbsent === true, "Bypass revocation not proved.");
assert(revocation.postRevocationBypassCount === generation.preexistingBypassCount, "Bypass count not restored.");
assert(code("test-exit-code.txt") === 0, "Authenticated Preview lifecycle failed.");
assert(code("cleanup-retry-exit-code.txt") === 0, "Independent cleanup retry failed.");

const state = read("state.json");
const result = read("result.json");
const cleanup = read("cleanup.json");
const retry = read("cleanup-only-result.json");
assert(state.candidateSha === process.env.CANDIDATE_SHA, "Candidate mismatch.");
assert(state.deploymentId === process.env.DEPLOYMENT_ID, "Deployment mismatch.");
assert(state.userCreated === true && state.beforeFactorIds.length === 0, "Fresh user baseline not proved.");
assert(result.testPassed === true && result.cleanupPassed === true, "Lifecycle or in-process cleanup failed.");
assert(result.desktop?.verifiedFactors === 1 && result.desktop?.sessionLevel === "aal2", "Desktop AAL2 proof failed.");
assert(result.mobile?.verifiedFactors === 1 && result.mobile?.sessionLevel === "aal2", "Mobile AAL2 proof failed.");
assert(result.desktop.horizontalOverflow <= 1 && result.mobile.horizontalOverflow <= 1, "Viewport overflow proof failed.");
assert(clean(result.desktop.diagnostics) && clean(result.mobile.diagnostics), "Browser diagnostics were not empty.");
assert(result.factorLifecycle?.exactSingleNewFactor === true, "Exactly-one-factor proof failed.");
assert(result.factorLifecycle.createdFactorId === state.factorId, "Created factor mismatch.");
assert(cleanup.exactFactorOnly === true && cleanup.apiFactorCleanupError === null, "Exact factor cleanup failed.");
assert(cleanup.apiFactorCleanup?.deletedFactorId === state.factorId, "Different factor deleted.");
assert(cleanup.apiFactorCleanup?.factorsAfterCleanup.length === 0, "Factor baseline not restored.");
assert(cleanup.userAbsent === true && retry.userAbsent === true, "Temporary-user absence not proved twice.");

const summary = {
  schemaVersion: 1,
  candidateSha: result.candidateSha,
  deploymentId: result.deploymentId,
  desktop: result.desktop,
  mobile: result.mobile,
  exactSingleNewFactor: true,
  exactFactorDeleted: state.factorId,
  factorSetRestored: [],
  temporaryUserAbsent: true,
  independentCleanupProvedAbsence: true,
  vercelBypassRevoked: true,
  vercelBypassCountRestored: revocation.postRevocationBypassCount,
};
fs.writeFileSync(path.join(dir, "verified-summary.json"), `${JSON.stringify(summary, null, 2)}\n`);
NODE

rm -rf .qa-private .qa-runtime
rm -f "$secret_file"
[[ ! -e "$PRIVATE_STATE_PATH" ]]
[[ ! -e "$HARNESS_PATH" ]]
trap - EXIT
