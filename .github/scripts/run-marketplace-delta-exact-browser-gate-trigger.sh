#!/usr/bin/env bash
set -euo pipefail

runner="$RUNNER_TEMP/run-marketplace-delta-exact-browser-gate.sh"
cp .github/scripts/run-marketplace-delta-exact-browser-gate.sh "$runner"

python3 - "$runner" <<'PY'
from pathlib import Path
import sys
path = Path(sys.argv[1])
source = path.read_text(encoding="utf-8")
marker = '''if [[ "$(git rev-parse origin/main)" != "$MAIN_SHA" ]]; then
  echo "Current main changed during integration; refusing a stale gate." >&2
  exit 1
fi

npm ci
'''
replacement = '''if [[ "$(git rev-parse origin/main)" != "$MAIN_SHA" ]]; then
  echo "Current main changed during integration; refusing a stale gate." >&2
  exit 1
fi

# Publish the repaired, current-main-integrated candidate before the long validation.
# The branch remains draft and unmerged if any later gate fails.
git push origin HEAD:"$CANDIDATE_BRANCH"

npm ci
'''
if source.count(marker) != 1:
    raise SystemExit(f"Expected one pre-validation push marker; found {source.count(marker)}.")
path.write_text(source.replace(marker, replacement, 1), encoding="utf-8")
PY

bash "$runner"
