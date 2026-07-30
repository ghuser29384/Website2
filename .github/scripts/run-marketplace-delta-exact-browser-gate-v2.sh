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

old = '''  npx --yes vercel@latest env pull "$env_file" \\
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

new = '''  npx --yes vercel@latest env pull "$env_file" \\
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

  # Sensitive Vercel variables are intentionally not returned by `env pull`.
  # Verify only non-secret metadata: key, branch, target, type, and that the
  # list response was not decrypted. Never request or print the secret value.
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

count = source.count(old)
if count != 1:
    raise SystemExit(f"Expected exactly one obsolete sensitive-value comparison block; found {count}.")

output_path.write_text(source.replace(old, new, 1), encoding="utf-8")
PY

chmod +x "$PATCHED_SCRIPT"
exec bash "$PATCHED_SCRIPT"
