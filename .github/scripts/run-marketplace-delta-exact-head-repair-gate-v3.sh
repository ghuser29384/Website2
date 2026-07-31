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
  local existing_json=""
  curl --fail-with-body --silent --show-error \\
    --header "Authorization: Bearer $VERCEL_TOKEN" \\
    "https://api.vercel.com/v6/deployments?projectId=${project_id}&limit=100&teamId=${VERCEL_TEAM_ID}" \\
    --output "$existing_response"
  existing_json="$(jq -c --arg role "$role" --arg sha "$source_sha" --arg ref "$source_ref" '
    [.deployments[] | select(
      (.state // .readyState) == "READY"
      and .meta.qaRole == $role
      and .meta.qaSourceSha == $sha
      and .meta.qaSourceRef == $ref
      and (.meta.gitDirty // "0") != "1"
      and (.target // "preview") != "production"
    )] | sort_by(.created) | reverse | .[0]
    | if . == null then empty else {
        id: (.uid // .id // ""),
        host: (.url // ""),
        state: (.state // .readyState // "UNKNOWN")
      } end
  ' "$existing_response")"
  if [[ -n "$existing_json" ]]; then
    local existing_id existing_host existing_state existing_record existing_result
    existing_id="$(jq -r '.id' <<< "$existing_json")"
    existing_host="$(jq -r '.host' <<< "$existing_json")"
    existing_state="$(jq -r '.state' <<< "$existing_json")"
    if [[ "$existing_id" != dpl_* || "$existing_host" != *.vercel.app || "$existing_state" != "READY" ]]; then
      echo "Refusing malformed reusable deployment for $role/$project_name: $existing_json" >&2
      return 1
    fi
    existing_record="$(jq -cn \\
      --arg role "$role" --arg project "$project_name" --arg projectId "$project_id" \\
      --arg id "$existing_id" --arg url "https://$existing_host" --arg state "$existing_state" \\
      --arg sha "$source_sha" --arg ref "$source_ref" \\
      '{role:$role,project:$project,projectId:$projectId,id:$id,url:$url,state:$state,sourceSha:$sha,sourceRef:$ref,reused:true}')"
    printf '%s\\n' "$existing_record" >> "$deploy_records"
    existing_result="$(jq -cn --arg id "$existing_id" --arg url "https://$existing_host" '{id:$id,url:$url}')"
    printf '__DEPLOY_RESULT__%s\\n' "$existing_result"
    return 0
  fi

  local -a extra_env=()
'''
if source.count(reuse_marker) != 1:
    raise SystemExit(f"Expected one deploy function insertion point, found {source.count(reuse_marker)}")
source = source.replace(reuse_marker, reuse_block, 1)

old_poll = '''    row="$(jq -r --arg host "$host" --arg run "$GITHUB_RUN_ID" --arg role "$role" --arg sha "$source_sha" '
      [.deployments[] | select(
        .url == $host or
        (.meta.qaGateRun == $run and .meta.qaRole == $role and .meta.qaSourceSha == $sha)
      )] | sort_by(.created) | reverse | .[0]
      | if . == null then "" else [.id, .url, (.state // .readyState // "UNKNOWN")] | @tsv end
    ' "$response")"
    if [[ -n "$row" ]]; then
      local id found_host state
      IFS=$'\\t' read -r id found_host state <<< "$row"
      if [[ "$state" == "READY" ]]; then
        jq -n \\
          --arg role "$role" --arg project "$project_name" --arg projectId "$project_id" \\
          --arg id "$id" --arg url "https://$found_host" --arg state "$state" \\
          --arg sha "$source_sha" --arg ref "$source_ref" \\
          '{role:$role,project:$project,projectId:$projectId,id:$id,url:$url,state:$state,sourceSha:$sha,sourceRef:$ref}' \\
          | tee -a "$deploy_records"
        printf '%s\\t%s\\n' "$id" "https://$found_host"
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
'''
new_poll = '''    row="$(jq -c --arg host "$host" --arg run "$GITHUB_RUN_ID" --arg role "$role" --arg sha "$source_sha" '
      [.deployments[] | select(
        (
          .url == $host or
          (.meta.qaGateRun == $run and .meta.qaRole == $role and .meta.qaSourceSha == $sha)
        )
        and (.meta.gitDirty // "0") != "1"
      )] | sort_by(.created) | reverse | .[0]
      | if . == null then empty else {
          id: (.uid // .id // ""),
          host: (.url // ""),
          state: (.state // .readyState // "UNKNOWN")
        } end
    ' "$response")"
    if [[ -n "$row" ]]; then
      local id found_host state record_json result_json
      id="$(jq -r '.id' <<< "$row")"
      found_host="$(jq -r '.host' <<< "$row")"
      state="$(jq -r '.state' <<< "$row")"
      if [[ -z "$id" || "$found_host" != *.vercel.app ]]; then
        echo "Refusing malformed deployment API response for $role/$project_name: $row" >&2
        return 1
      fi
      if [[ "$state" == "READY" ]]; then
        if [[ "$id" != dpl_* ]]; then
          echo "Refusing non-deployment ID for $role/$project_name: $id" >&2
          return 1
        fi
        record_json="$(jq -cn \\
          --arg role "$role" --arg project "$project_name" --arg projectId "$project_id" \\
          --arg id "$id" --arg url "https://$found_host" --arg state "$state" \\
          --arg sha "$source_sha" --arg ref "$source_ref" \\
          '{role:$role,project:$project,projectId:$projectId,id:$id,url:$url,state:$state,sourceSha:$sha,sourceRef:$ref,reused:false}')"
        printf '%s\\n' "$record_json" >> "$deploy_records"
        result_json="$(jq -cn --arg id "$id" --arg url "https://$found_host" '{id:$id,url:$url}')"
        printf '__DEPLOY_RESULT__%s\\n' "$result_json"
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
'''
if source.count(old_poll) != 1:
    raise SystemExit(f"Expected one deployment polling block, found {source.count(old_poll)}")
source = source.replace(old_poll, new_poll, 1)

old_calls = '''IFS=$'\\t' read -r WEBSITE2_DEPLOYMENT_ID WEBSITE2_PREVIEW_URL \\
  <<< "$(deploy_exact candidate-website2 website2 "$WEBSITE2_PROJECT_ID" "$CANDIDATE_DIR" "$PR_HEAD_SHA" "$CANDIDATE_BRANCH" 1 | tail -1)"
IFS=$'\\t' read -r MORALTRADE_DEPLOYMENT_ID MORALTRADE_PREVIEW_URL \\
  <<< "$(deploy_exact candidate-moraltrade moraltrade-site "$MORALTRADE_PROJECT_ID" "$CANDIDATE_DIR" "$PR_HEAD_SHA" "$CANDIDATE_BRANCH" 1 | tail -1)"
IFS=$'\\t' read -r BASELINE_DEPLOYMENT_ID BASELINE_URL \\
  <<< "$(deploy_exact current-main-baseline website2 "$WEBSITE2_PROJECT_ID" "$MAIN_DIR" "$MAIN_SHA" main 1 | tail -1)"
'''
new_calls = '''website2_result="$RUNNER_TEMP/candidate-website2-result.json"
moraltrade_result="$RUNNER_TEMP/candidate-moraltrade-result.json"
baseline_result="$RUNNER_TEMP/current-main-baseline-result.json"

capture_deploy() {
  local result_file="$1"
  shift
  local output_file="${result_file}.output"
  deploy_exact "$@" > "$output_file"
  local marker
  marker="$(grep -F '__DEPLOY_RESULT__' "$output_file" | tail -1 || true)"
  if [[ -z "$marker" ]]; then
    echo "Deployment helper returned no structured result: $*" >&2
    cat "$output_file" >&2
    return 1
  fi
  printf '%s\\n' "${marker#__DEPLOY_RESULT__}" > "$result_file"
  if ! jq -e '
    (.id | type) == "string"
    and (.id | startswith("dpl_"))
    and (.url | type) == "string"
    and (.url | test("^https://[A-Za-z0-9.-]+\\\\.vercel\\\\.app$"))
  ' "$result_file" >/dev/null; then
    echo "Deployment helper returned malformed structured result: $marker" >&2
    return 1
  fi
}

capture_deploy "$website2_result" candidate-website2 website2 "$WEBSITE2_PROJECT_ID" "$CANDIDATE_DIR" "$PR_HEAD_SHA" "$CANDIDATE_BRANCH" 1 &
website2_pid=$!
capture_deploy "$moraltrade_result" candidate-moraltrade moraltrade-site "$MORALTRADE_PROJECT_ID" "$CANDIDATE_DIR" "$PR_HEAD_SHA" "$CANDIDATE_BRANCH" 1 &
moraltrade_pid=$!
capture_deploy "$baseline_result" current-main-baseline website2 "$WEBSITE2_PROJECT_ID" "$MAIN_DIR" "$MAIN_SHA" main 1 &
baseline_pid=$!

wait "$website2_pid"
wait "$moraltrade_pid"
wait "$baseline_pid"

WEBSITE2_DEPLOYMENT_ID="$(jq -r '.id' "$website2_result")"
WEBSITE2_PREVIEW_URL="$(jq -r '.url' "$website2_result")"
MORALTRADE_DEPLOYMENT_ID="$(jq -r '.id' "$moraltrade_result")"
MORALTRADE_PREVIEW_URL="$(jq -r '.url' "$moraltrade_result")"
BASELINE_DEPLOYMENT_ID="$(jq -r '.id' "$baseline_result")"
BASELINE_URL="$(jq -r '.url' "$baseline_result")"
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
