#!/usr/bin/env bash
set -euo pipefail

# Do not take the authoritative main/PR snapshot in the middle of an active merge burst.
# Once captured by the underlying gate, either ref moving remains a hard failure.
PRODUCT_BRANCH="agent/marketplace-delta-current-main-20260729"
last_main=""
last_product=""
stable_intervals=0
required_stable_intervals=12
while (( stable_intervals < required_stable_intervals )); do
  main_sha="$(git ls-remote origin refs/heads/main | awk '{print $1}')"
  product_sha="$(git ls-remote origin "refs/heads/${PRODUCT_BRANCH}" | awk '{print $1}')"
  if [[ -z "$main_sha" || -z "$product_sha" ]]; then
    echo "Could not read main or product ref while waiting for a stable audit window." >&2
    exit 1
  fi
  if [[ "$main_sha" == "$last_main" && "$product_sha" == "$last_product" ]]; then
    stable_intervals=$((stable_intervals + 1))
  else
    last_main="$main_sha"
    last_product="$product_sha"
    stable_intervals=0
  fi
  if (( stable_intervals < required_stable_intervals )); then
    echo "Waiting for stable main/product refs: ${stable_intervals}/${required_stable_intervals} intervals." >&2
    sleep 30
  fi
done
printf 'Stable pre-snapshot window established: main=%s product=%s\n' "$last_main" "$last_product"

SOURCE=".github/scripts/run-marketplace-delta-exact-head-repair-gate-v3.sh"
PATCHED="$RUNNER_TEMP/run-marketplace-delta-exact-head-repair-gate-v4.sh"

python3 - "$SOURCE" "$PATCHED" <<'PY'
from pathlib import Path
import sys

path = Path(sys.argv[1])
text = path.read_text(encoding="utf-8")
needle = 'source = Path(sys.argv[1]).read_text(encoding="utf-8")\n'
injection = r'''source = Path(sys.argv[1]).read_text(encoding="utf-8")

bad_locator_line = r'new_locator = r"page.getByText(/1 participant\\s*across 1 exact proposal/)"'
good_locator_line = r'new_locator = r"page.getByText(/1 participant\s*across 1 exact proposal/)"'
bad_locator_count = source.count(bad_locator_line)
if bad_locator_count < 1:
    raise SystemExit("Expected at least one over-escaped participant-count locator patch.")
source = source.replace(bad_locator_line, good_locator_line)
'''
if text.count(needle) != 1:
    raise SystemExit(f"Expected one v3 source-loading line; found {text.count(needle)}")
text = text.replace(needle, injection, 1)

end_needle = 'Path(sys.argv[2]).write_text(source, encoding="utf-8")\n'
end_injection = r'''pinned_marker = """  local existing_response="$RUNNER_TEMP/existing-${role}-${project_name}.json"
"""
pinned_block = """  local pinned_id=""
  local pinned_host=""
  case "$role" in
    candidate-website2)
      pinned_id="dpl_C12PZvk6Pi1tN3MvYUKVtSTKfQTG"
      pinned_host="website2-8n91gglg8-ellen-s.vercel.app"
      ;;
    candidate-moraltrade)
      pinned_id="dpl_Gk2DmL4HfPVtNULXMqDBPai6SZkt"
      pinned_host="moraltrade-site-o3l0m3hzl-ellen-s.vercel.app"
      ;;
  esac
  if [[ -n "$pinned_id" ]]; then
    local pinned_response="$RUNNER_TEMP/pinned-${role}-${project_name}.json"
    curl --fail-with-body --silent --show-error \\
      --header "Authorization: Bearer $VERCEL_TOKEN" \\
      "https://api.vercel.com/v13/deployments/${pinned_id}?teamId=${VERCEL_TEAM_ID}" \\
      --output "$pinned_response"
    if jq -e \\
      --arg id "$pinned_id" --arg host "$pinned_host" --arg project "$project_id" \\
      --arg role "$role" --arg sha "$source_sha" --arg ref "$source_ref" '
        (.id // .uid // "") == $id
        and .url == $host
        and .project.id == $project
        and (.readyState // .state // "") == "READY"
        and .meta.qaRole == $role
        and .meta.qaSourceSha == $sha
        and .meta.qaSourceRef == $ref
        and (.target // "preview") != "production"
      ' "$pinned_response" >/dev/null; then
      local pinned_record pinned_result
      pinned_record="$(jq -cn \\
        --arg role "$role" --arg project "$project_name" --arg projectId "$project_id" \\
        --arg id "$pinned_id" --arg url "https://$pinned_host" --arg state "READY" \\
        --arg sha "$source_sha" --arg ref "$source_ref" \\
        '{role:$role,project:$project,projectId:$projectId,id:$id,url:$url,state:$state,sourceSha:$sha,sourceRef:$ref,reused:true,pinned:true}')"
      printf '%s\\n' "$pinned_record" >> "$deploy_records"
      pinned_result="$(jq -cn --arg id "$pinned_id" --arg url "https://$pinned_host" '{id:$id,url:$url}')"
      printf '__DEPLOY_RESULT__%s\\n' "$pinned_result"
      return 0
    fi
    echo "Pinned deployment no longer matches exact candidate metadata; falling back to a fresh deployment." >&2
  fi

  local existing_response="$RUNNER_TEMP/existing-${role}-${project_name}.json"
"""
if source.count(pinned_marker) != 1:
    raise SystemExit(f"Expected one post-v3 deployment reuse marker; found {source.count(pinned_marker)}")
source = source.replace(pinned_marker, pinned_block, 1)

Path(sys.argv[2]).write_text(source, encoding="utf-8")
'''
if text.count(end_needle) != 1:
    raise SystemExit(f"Expected one v3 output-write line; found {text.count(end_needle)}")
text = text.replace(end_needle, end_injection, 1)
Path(sys.argv[2]).write_text(text, encoding="utf-8")
PY

chmod +x "$PATCHED"
exec bash "$PATCHED"
