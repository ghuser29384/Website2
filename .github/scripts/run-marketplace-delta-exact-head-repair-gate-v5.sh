#!/usr/bin/env bash
set -euo pipefail

SOURCE=".github/scripts/run-marketplace-delta-exact-head-repair-gate-v4.sh"
PATCHED="$RUNNER_TEMP/run-marketplace-delta-exact-head-repair-gate-v5.sh"

python3 - "$SOURCE" "$PATCHED" <<'PY'
from pathlib import Path
import sys

source_path = Path(sys.argv[1])
target_path = Path(sys.argv[2])
text = source_path.read_text(encoding="utf-8")

needle = r'''if source.count(auth_marker) != 1:
    raise SystemExit(f"Expected one harness syntax-check block; found {source.count(auth_marker)}")
source = source.replace(auth_marker, auth_block, 1)

Path(sys.argv[2]).write_text(source, encoding="utf-8")
'''
replacement = r'''if source.count(auth_marker) != 1:
    raise SystemExit(f"Expected one harness syntax-check block; found {source.count(auth_marker)}")
source = source.replace(auth_marker, auth_block, 1)

runtime_auth_marker = """python3 - "$CANDIDATE_DIR/.qa/member.mjs" <<'PY'
"""
runtime_auth_block = """python3 - "$CANDIDATE_DIR/.qa/member.mjs" "$CANDIDATE_DIR/.qa/claimed-guest.mjs" <<'PY_AUTH_RUNTIME'
from pathlib import Path
import sys

old = 'getByRole("link", { name: /Log out/i })'
new = 'getByRole("button", { name: /Log out/i })'
total = 0
for raw_path in sys.argv[1:]:
    path = Path(raw_path)
    content = path.read_text(encoding="utf-8")
    count = content.count(old)
    if count < 1:
        raise SystemExit(f"Expected at least one stale Log out link locator in {path}; found {count}.")
    path.write_text(content.replace(old, new), encoding="utf-8")
    total += count
if total < 2:
    raise SystemExit(f"Expected to repair at least two runtime Log out locators; found {total}.")
PY_AUTH_RUNTIME
python3 - "$CANDIDATE_DIR/.qa/member.mjs" <<'PY'
"""
if source.count(runtime_auth_marker) != 1:
    raise SystemExit(
        f"Expected one actual browser-harness generation block; found {source.count(runtime_auth_marker)}"
    )
source = source.replace(runtime_auth_marker, runtime_auth_block, 1)

Path(sys.argv[2]).write_text(source, encoding="utf-8")
'''

if text.count(needle) != 1:
    raise SystemExit(f"Expected one v4 nested-output marker; found {text.count(needle)}")
text = text.replace(needle, replacement, 1)
target_path.write_text(text, encoding="utf-8")
PY

chmod +x "$PATCHED"
exec bash "$PATCHED"
