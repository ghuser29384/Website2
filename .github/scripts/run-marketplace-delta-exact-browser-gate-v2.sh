#!/usr/bin/env bash
set -euo pipefail

BASE_GATE_COMMIT="217b504b3e5bcb9fa3120676d509594c016051f3"
SOURCE_SCRIPT="$RUNNER_TEMP/run-marketplace-delta-exact-browser-gate-base.sh"
PATCHED_SCRIPT="$RUNNER_TEMP/run-marketplace-delta-exact-browser-gate-v2.sh"

git show "${BASE_GATE_COMMIT}:.github/scripts/run-marketplace-delta-exact-browser-gate.sh" \
  > "$SOURCE_SCRIPT"

python3 - "$SOURCE_SCRIPT" "$PATCHED_SCRIPT" <<'PY'
from pathlib import Path
import sys

source_path = Path(sys.argv[1])
output_path = Path(sys.argv[2])
source = source_path.read_text(encoding="utf-8")

old_env = '''  npx --yes vercel@latest env pull "$env_file" \\
    --yes --environment=preview --git-branch="$CANDIDATE_BRANCH" \\
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
  printf 'project=%s branch=%s qa_ref=%s url_match=true publishable_key_match=true service_role_match=true\\n' \\
    "$project" "$CANDIDATE_BRANCH" "$EXPECTED_QA_REF" >> "$env_proof"
  rm -rf .vercel
'''

new_env = '''  npx --yes vercel@latest env pull "$env_file" \\
    --yes --environment=preview --git-branch="$CANDIDATE_BRANCH" \\
    --scope "$VERCEL_SCOPE" --token "$VERCEL_TOKEN" >/dev/null
  (
    set -a
    source "$env_file"
    set +a
    [[ "$NEXT_PUBLIC_SUPABASE_URL" == "$QA_URL" ]]
    [[ "$NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY" == "$QA_SUPABASE_PUBLISHABLE_KEY" ]]
  )
  rm -f "$env_file"

  local project_id
  case "$project" in
    website2) project_id="$WEBSITE2_PROJECT_ID" ;;
    moraltrade-site) project_id="$MORALTRADE_PROJECT_ID" ;;
    *) echo "Unexpected Vercel project: $project" >&2; return 1 ;;
  esac

  # Sensitive Vercel variables are intentionally omitted from `env pull`.
  # Verify only non-secret metadata. Never request or print the secret value.
  local metadata="$RUNNER_TEMP/${project}-preview-env-metadata.json"
  curl --fail-with-body --silent --show-error --get \\
    --header "Authorization: Bearer $VERCEL_TOKEN" \\
    --data-urlencode "gitBranch=$CANDIDATE_BRANCH" \\
    --data-urlencode "decrypt=false" \\
    --data-urlencode "teamId=$VERCEL_TEAM_ID" \\
    "https://api.vercel.com/v10/projects/${project_id}/env" \\
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

  printf 'project=%s branch=%s qa_ref=%s url_match=true publishable_key_match=true service_role_present=true service_role_sensitive=true service_role_decrypted=false\\n' \\
    "$project" "$CANDIDATE_BRANCH" "$EXPECTED_QA_REF" >> "$env_proof"
  rm -rf .vercel
'''

if source.count(old_env) != 1:
    raise SystemExit(
        f"Expected exactly one obsolete sensitive-value comparison block; found {source.count(old_env)}."
    )
source = source.replace(old_env, new_env, 1)

old_copy = '''cp .github/scripts/marketplace-delta-exact-browser-qa.mjs \\
  "$RUNNER_TEMP/marketplace-delta-exact-browser-qa.mjs"
'''
new_copy = '''BROWSER_RUNNER="$GITHUB_WORKSPACE/.marketplace-delta-exact-browser-qa.mjs"
cp .github/scripts/marketplace-delta-exact-browser-qa.mjs \\
  "$BROWSER_RUNNER"
'''
if source.count(old_copy) != 1:
    raise SystemExit(f"Expected one browser-harness copy block; found {source.count(old_copy)}.")
source = source.replace(old_copy, new_copy, 1)

old_node = '    node "$RUNNER_TEMP/marketplace-delta-exact-browser-qa.mjs"\n'
new_node = '    node "$BROWSER_RUNNER"\n'
if source.count(old_node) != 1:
    raise SystemExit(f"Expected one browser-harness invocation; found {source.count(old_node)}.")
source = source.replace(old_node, new_node, 1)

wait_start = source.index("wait_deployment() {")
wait_end = source.index("\nIFS=$'\\t' read -r WEBSITE2_DEPLOYMENT_ID", wait_start)
new_wait = r'''wait_deployment() {
  local project_id="$1"
  local project_name="$2"
  local response="$RUNNER_TEMP/${project_name}-deployments.json"
  local detail="$RUNNER_TEMP/${project_name}-deployment-detail.json"
  for _ in $(seq 1 120); do
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
      echo "Waiting for $project_name exact deployment to appear..." >&2
    fi
    sleep 10
  done
  echo "Timed out waiting for $project_name exact deployment." >&2
  return 1
}
'''
source = source[:wait_start] + new_wait + source[wait_end:]

old_prod = '''PRODUCTION_MAIN_SHA="$(jq -r '[.deployments[] | select((.state // .readyState) == "READY")][0].meta.githubCommitSha // ""' "$prod_response")"'''
new_prod = '''PRODUCTION_MAIN_SHA="$(jq -r '[.deployments[] | select((((.state // .readyState // .status // "") | ascii_upcase) == "READY"))][0].meta.githubCommitSha // ""' "$prod_response")"'''
if source.count(old_prod) != 1:
    raise SystemExit(f"Expected one production-state expression; found {source.count(old_prod)}.")
source = source.replace(old_prod, new_prod, 1)

output_path.write_text(source, encoding="utf-8")
PY

chmod +x "$PATCHED_SCRIPT"
exec bash "$PATCHED_SCRIPT"
