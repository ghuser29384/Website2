#!/usr/bin/env bash
set -euo pipefail

SOURCE=".github/scripts/run-marketplace-delta-exact-head-repair-gate.sh"
PATCHED="$RUNNER_TEMP/run-marketplace-delta-exact-head-repair-gate-v3.sh"

python3 - "$SOURCE" "$PATCHED" <<'PY'
from pathlib import Path
import sys

source = Path(sys.argv[1]).read_text(encoding="utf-8")

old_deploy = '''  rm -rf "$worktree/.vercel" "$worktree/.env.local"
  (
    cd "$worktree"
    [[ "$(git rev-parse HEAD)" == "$source_sha" ]]
    [[ -z "$(git status --porcelain)" ]]
    npx --yes vercel@58.4.0 link \\
      --yes --project "$project_name" --scope "$VERCEL_SCOPE" --token "$VERCEL_TOKEN" >/dev/null
    npx --yes vercel@58.4.0 deploy \\
      --yes --force --scope "$VERCEL_SCOPE" --token "$VERCEL_TOKEN" \\
      --meta "qaGateRun=$GITHUB_RUN_ID" \\
      --meta "qaRole=$role" \\
      --meta "qaSourceSha=$source_sha" \\
      --meta "qaSourceRef=$source_ref" \\
      "${extra_env[@]}"
  ) 2>&1 | tee "$log_file"
'''
new_deploy = '''  rm -rf "$worktree/.vercel" "$worktree/.env.local"
  (
    cd "$worktree"
    [[ "$(git rev-parse HEAD)" == "$source_sha" ]]
    [[ -z "$(git status --porcelain)" ]]
    VERCEL_ORG_ID="$VERCEL_TEAM_ID" \\
    VERCEL_PROJECT_ID="$project_id" \\
    npx --yes vercel@58.4.0 deploy \\
      --yes --force --target=preview --project "$project_id" \\
      --scope "$VERCEL_SCOPE" --token "$VERCEL_TOKEN" \\
      --meta "qaGateRun=$GITHUB_RUN_ID" \\
      --meta "qaRole=$role" \\
      --meta "qaSourceSha=$source_sha" \\
      --meta "qaSourceRef=$source_ref" \\
      "${extra_env[@]}"
  ) 2>&1 | tee "$log_file"
'''
if source.count(old_deploy) != 1:
    raise SystemExit(f"Expected one linked exact deployment block, found {source.count(old_deploy)}")
source = source.replace(old_deploy, new_deploy, 1)

reuse_marker = '''  local log_file="$RUNNER_TEMP/deploy-${role}-${project_name}.log"
  local -a extra_env=()
'''
reuse_block = '''  local log_file="$RUNNER_TEMP/deploy-${role}-${project_name}.log"
  local existing_response="$RUNNER_TEMP/existing-${role}-${project_name}.json"
  local existing_row=""
  curl --fail-with-body --silent --show-error \\
    --header "Authorization: Bearer $VERCEL_TOKEN" \\
    "https://api.vercel.com/v6/deployments?projectId=${project_id}&limit=100&teamId=${VERCEL_TEAM_ID}" \\
    --output "$existing_response"
  existing_row="$(jq -r --arg role "$role" --arg sha "$source_sha" --arg ref "$source_ref" '
    [.deployments[] | select(
      (.state // .readyState) == "READY"
      and .meta.qaRole == $role
      and .meta.qaSourceSha == $sha
      and .meta.qaSourceRef == $ref
      and (.meta.gitDirty // "0") != "1"
      and (.target // "preview") != "production"
    )] | sort_by(.created) | reverse | .[0]
    | if . == null then "" else [.id, .url, (.state // .readyState // "UNKNOWN")] | @tsv end
  ' "$existing_response")"
  if [[ -n "$existing_row" ]]; then
    local existing_id existing_host existing_state
    IFS=$'\\t' read -r existing_id existing_host existing_state <<< "$existing_row"
    jq -n \\
      --arg role "$role" --arg project "$project_name" --arg projectId "$project_id" \\
      --arg id "$existing_id" --arg url "https://$existing_host" --arg state "$existing_state" \\
      --arg sha "$source_sha" --arg ref "$source_ref" \\
      '{role:$role,project:$project,projectId:$projectId,id:$id,url:$url,state:$state,sourceSha:$sha,sourceRef:$ref,reused:true}' \\
      | tee -a "$deploy_records"
    printf '%s\\t%s\\n' "$existing_id" "https://$existing_host"
    return 0
  fi

  local -a extra_env=()
'''
if source.count(reuse_marker) != 1:
    raise SystemExit(f"Expected one deploy function insertion point, found {source.count(reuse_marker)}")
source = source.replace(reuse_marker, reuse_block, 1)

old_filter = '''      [.deployments[] | select(
        .url == $host or
        (.meta.qaGateRun == $run and .meta.qaRole == $role and .meta.qaSourceSha == $sha)
      )] | sort_by(.created) | reverse | .[0]
'''
new_filter = '''      [.deployments[] | select(
        (
          .url == $host or
          (.meta.qaGateRun == $run and .meta.qaRole == $role and .meta.qaSourceSha == $sha)
        )
        and (.meta.gitDirty // "0") != "1"
      )] | sort_by(.created) | reverse | .[0]
'''
if source.count(old_filter) != 1:
    raise SystemExit(f"Expected one deployment filter, found {source.count(old_filter)}")
source = source.replace(old_filter, new_filter, 1)

old_calls = '''IFS=$'\\t' read -r WEBSITE2_DEPLOYMENT_ID WEBSITE2_PREVIEW_URL \\
  <<< "$(deploy_exact candidate-website2 website2 "$WEBSITE2_PROJECT_ID" "$CANDIDATE_DIR" "$PR_HEAD_SHA" "$CANDIDATE_BRANCH" 1 | tail -1)"
IFS=$'\\t' read -r MORALTRADE_DEPLOYMENT_ID MORALTRADE_PREVIEW_URL \\
  <<< "$(deploy_exact candidate-moraltrade moraltrade-site "$MORALTRADE_PROJECT_ID" "$CANDIDATE_DIR" "$PR_HEAD_SHA" "$CANDIDATE_BRANCH" 1 | tail -1)"
IFS=$'\\t' read -r BASELINE_DEPLOYMENT_ID BASELINE_URL \\
  <<< "$(deploy_exact current-main-baseline website2 "$WEBSITE2_PROJECT_ID" "$MAIN_DIR" "$MAIN_SHA" main 1 | tail -1)"
'''
new_calls = '''website2_result="$RUNNER_TEMP/candidate-website2-result.txt"
moraltrade_result="$RUNNER_TEMP/candidate-moraltrade-result.txt"
baseline_result="$RUNNER_TEMP/current-main-baseline-result.txt"

(deploy_exact candidate-website2 website2 "$WEBSITE2_PROJECT_ID" "$CANDIDATE_DIR" "$PR_HEAD_SHA" "$CANDIDATE_BRANCH" 1 | tail -1 > "$website2_result") &
website2_pid=$!
(deploy_exact candidate-moraltrade moraltrade-site "$MORALTRADE_PROJECT_ID" "$CANDIDATE_DIR" "$PR_HEAD_SHA" "$CANDIDATE_BRANCH" 1 | tail -1 > "$moraltrade_result") &
moraltrade_pid=$!
(deploy_exact current-main-baseline website2 "$WEBSITE2_PROJECT_ID" "$MAIN_DIR" "$MAIN_SHA" main 1 | tail -1 > "$baseline_result") &
baseline_pid=$!

wait "$website2_pid"
wait "$moraltrade_pid"
wait "$baseline_pid"

IFS=$'\\t' read -r WEBSITE2_DEPLOYMENT_ID WEBSITE2_PREVIEW_URL < "$website2_result"
IFS=$'\\t' read -r MORALTRADE_DEPLOYMENT_ID MORALTRADE_PREVIEW_URL < "$moraltrade_result"
IFS=$'\\t' read -r BASELINE_DEPLOYMENT_ID BASELINE_URL < "$baseline_result"
'''
if source.count(old_calls) != 1:
    raise SystemExit(f"Expected one sequential deployment caller block, found {source.count(old_calls)}")
source = source.replace(old_calls, new_calls, 1)

harness_write = '''text = text.replace(bypass_cookie_line, "", 1)
path.write_text(text, encoding="utf-8")'''
harness_write_with_baseline = '''text = text.replace(bypass_cookie_line, "", 1)
baseline_protection = "    protectedPreview: false,\\n"
if text.count(baseline_protection) != 1:
    raise SystemExit(f"Expected exactly one unprotected baseline session; found {text.count(baseline_protection)}.")
text = text.replace(baseline_protection, "    protectedPreview: true,\\n", 1)
path.write_text(text, encoding="utf-8")'''
if source.count(harness_write) != 2:
    raise SystemExit(f"Expected two member-harness patch sites; found {source.count(harness_write)}")
source = source.replace(harness_write, harness_write_with_baseline)

Path(sys.argv[2]).write_text(source, encoding="utf-8")
PY

chmod +x "$PATCHED"
exec bash "$PATCHED"
