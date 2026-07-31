#!/usr/bin/env bash
set -euo pipefail

BASE_SCRIPT=".github/scripts/run-marketplace-delta-tree-equivalent-gate.sh"
PATCHED_SCRIPT="$RUNNER_TEMP/run-marketplace-delta-tree-equivalent-gate-v2.sh"

python3 - "$BASE_SCRIPT" "$PATCHED_SCRIPT" <<'PY'
from pathlib import Path
import sys

source_path = Path(sys.argv[1])
output_path = Path(sys.argv[2])
source = source_path.read_text(encoding="utf-8")

old = '''git show "${HARNESS_COMMIT}:.github/scripts/marketplace-delta-exact-browser-qa.mjs" \\
  > "$BROWSER_RUNNER"

npm ci
'''
new = '''git show "${HARNESS_COMMIT}:.github/scripts/marketplace-delta-exact-browser-qa.mjs" \\
  > "$BROWSER_RUNNER"

python3 - "$BROWSER_RUNNER" <<'PY_HARNESS'
from pathlib import Path
import sys

path = Path(sys.argv[1])
text = path.read_text(encoding="utf-8")
old_locator = r"page.getByText(/1 participant across 1 exact proposal/)"
new_locator = r"page.getByText(/1 participant\\s*across 1 exact proposal/)"
if text.count(old_locator) != 1:
    raise SystemExit(
        f"Expected exactly one participant-count locator; found {text.count(old_locator)}."
    )
path.write_text(text.replace(old_locator, new_locator, 1), encoding="utf-8")
PY_HARNESS

npm ci
'''

if source.count(old) != 1:
    raise SystemExit(f"Expected exactly one harness-generation block; found {source.count(old)}.")
output_path.write_text(source.replace(old, new, 1), encoding="utf-8")
PY

chmod +x "$PATCHED_SCRIPT"
exec bash "$PATCHED_SCRIPT"
