#!/usr/bin/env bash
set -euo pipefail

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
Path(sys.argv[2]).write_text(text, encoding="utf-8")
PY

chmod +x "$PATCHED"
exec bash "$PATCHED"
