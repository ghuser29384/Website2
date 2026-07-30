#!/usr/bin/env bash
set -euo pipefail

cp .github/scripts/patch-marketplace-delta-final.py \
  "$RUNNER_TEMP/patch-marketplace-delta-final.py"
python3 "$RUNNER_TEMP/patch-marketplace-delta-final.py" \
  --materializer .github/scripts/materialize-marketplace-delta.py

# Preserve the already reviewed v7/v6 chain outside the worktree. This lets the
# product runner restore orchestration edits before checking out exact current main.
cp .github/scripts/run-marketplace-delta-candidate-v7.sh \
  "$RUNNER_TEMP/run-marketplace-delta-candidate-v7.sh"
cp .github/scripts/run-marketplace-delta-candidate-v6.sh \
  "$RUNNER_TEMP/run-marketplace-delta-candidate-v6.sh"

python3 - <<'PY'
import os
from pathlib import Path

v7 = Path(os.environ['RUNNER_TEMP']) / 'run-marketplace-delta-candidate-v7.sh'
source = v7.read_text(encoding='utf-8')
old = 'bash .github/scripts/run-marketplace-delta-candidate-v6.sh\n'
new = 'bash "$RUNNER_TEMP/run-marketplace-delta-candidate-v6.sh"\n'
if source.count(old) != 1:
    raise SystemExit(f'Expected one v7-to-v6 call; found {source.count(old)}.')
v7.write_text(source.replace(old, new, 1), encoding='utf-8')

v6 = Path(os.environ['RUNNER_TEMP']) / 'run-marketplace-delta-candidate-v6.sh'
source = v6.read_text(encoding='utf-8')
old = 'bash "$runner"\n'
new = '''python3 "$RUNNER_TEMP/patch-marketplace-delta-final.py" --runner "$runner"
bash "$runner"
'''
if source.count(old) != 1:
    raise SystemExit(f'Expected one v6 runner call; found {source.count(old)}.')
v6.write_text(source.replace(old, new, 1), encoding='utf-8')
PY

bash "$RUNNER_TEMP/run-marketplace-delta-candidate-v7.sh"
