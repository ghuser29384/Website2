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

Path(sys.argv[2]).write_text(source, encoding="utf-8")
PY

chmod +x "$PATCHED"
exec bash "$PATCHED"
