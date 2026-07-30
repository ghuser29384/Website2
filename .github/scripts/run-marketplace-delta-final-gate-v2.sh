#!/usr/bin/env bash
set -euo pipefail

SOURCE_BRANCH="ops/materialize-marketplace-delta-final-20260730"
BASE_SCRIPT="$RUNNER_TEMP/run-marketplace-delta-exact-browser-gate-base.sh"
PATCHED_SCRIPT="$RUNNER_TEMP/run-marketplace-delta-exact-browser-gate-v2.sh"
BROWSER_SOURCE="$RUNNER_TEMP/marketplace-delta-exact-browser-qa-source.mjs"

# Reuse the reviewed, previously exercised gate and browser harness from PR #324,
# but obtain them by immutable branch fetch rather than copying orchestration files
# into the product candidate.
git fetch origin "$SOURCE_BRANCH"
git show "origin/$SOURCE_BRANCH:.github/scripts/run-marketplace-delta-exact-browser-gate.sh" > "$BASE_SCRIPT"
git show "origin/$SOURCE_BRANCH:.github/scripts/marketplace-delta-exact-browser-qa.mjs" > "$BROWSER_SOURCE"

python3 - "$BASE_SCRIPT" "$PATCHED_SCRIPT" "$BROWSER_SOURCE" <<'PY'
from pathlib import Path
import sys

source_path = Path(sys.argv[1])
output_path = Path(sys.argv[2])
browser_path = Path(sys.argv[3])
source = source_path.read_text(encoding="utf-8")

old_browser_copy = '''cp .github/scripts/marketplace-delta-exact-browser-qa.mjs \\
  "$RUNNER_TEMP/marketplace-delta-exact-browser-qa.mjs"
'''
new_browser_copy = f'''cp "{browser_path}" \\
  "$RUNNER_TEMP/marketplace-delta-exact-browser-qa.mjs"
'''
if source.count(old_browser_copy) != 1:
    raise SystemExit(
        f"Expected exactly one browser-harness copy block; found {source.count(old_browser_copy)}."
    )
source = source.replace(old_browser_copy, new_browser_copy, 1)

old_env_proof = '''  npx --yes vercel@latest env pull "$env_file" \\
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

new_env_proof = '''  npx --yes vercel@latest env pull "$env_file" \\
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

  # Vercel deliberately omits sensitive values from `env pull`. Verify only
  # non-secret metadata for the service-role key: exact branch, Preview target,
  # sensitive type, and non-decrypted listing. Never request or print its value.
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

if source.count(old_env_proof) != 1:
    raise SystemExit(
        f"Expected exactly one obsolete sensitive-value proof block; found {source.count(old_env_proof)}."
    )
source = source.replace(old_env_proof, new_env_proof, 1)

output_path.write_text(source, encoding="utf-8")
PY

chmod +x "$PATCHED_SCRIPT"
exec bash "$PATCHED_SCRIPT"
