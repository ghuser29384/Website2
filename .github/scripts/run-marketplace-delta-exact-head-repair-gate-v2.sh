#!/usr/bin/env bash
set -euo pipefail

SOURCE=".github/scripts/run-marketplace-delta-exact-head-repair-gate.sh"
PATCHED="$RUNNER_TEMP/run-marketplace-delta-exact-head-repair-gate-v2.sh"

python3 - "$SOURCE" "$PATCHED" <<'PY'
from pathlib import Path
import sys

source_path = Path(sys.argv[1])
output_path = Path(sys.argv[2])
source = source_path.read_text(encoding="utf-8")

old = '''  rm -rf "$worktree/.vercel" "$worktree/.env.local"
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

new = '''  rm -rf "$worktree/.vercel" "$worktree/.env.local"
  (
    cd "$worktree"
    [[ "$(git rev-parse HEAD)" == "$source_sha" ]]
    [[ -z "$(git status --porcelain)" ]]
    # In CI, Vercel supports project selection through VERCEL_ORG_ID and
    # VERCEL_PROJECT_ID. Avoid `vercel link`: it writes .vercel and can edit
    # .gitignore, causing an otherwise exact source worktree to be reported as
    # gitDirty and weakening the exact-head proof.
    VERCEL_ORG_ID="$VERCEL_TEAM_ID" \\
    VERCEL_PROJECT_ID="$project_id" \\
    npx --yes vercel@58.4.0 deploy \\
      --yes --force --project "$project_id" \\
      --scope "$VERCEL_SCOPE" --token "$VERCEL_TOKEN" \\
      --meta "qaGateRun=$GITHUB_RUN_ID" \\
      --meta "qaRole=$role" \\
      --meta "qaSourceSha=$source_sha" \\
      --meta "qaSourceRef=$source_ref" \\
      "${extra_env[@]}"
  ) 2>&1 | tee "$log_file"
'''

if source.count(old) != 1:
    raise SystemExit(f"Expected exactly one exact-worktree link/deploy block; found {source.count(old)}.")
source = source.replace(old, new, 1)

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
    raise SystemExit(f"Expected exactly one deployment-match filter; found {source.count(old_filter)}.")
source = source.replace(old_filter, new_filter, 1)

output_path.write_text(source, encoding="utf-8")
PY

chmod +x "$PATCHED"
exec bash "$PATCHED"
