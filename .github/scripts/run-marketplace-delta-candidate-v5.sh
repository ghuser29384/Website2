#!/usr/bin/env bash
set -euo pipefail

runner="$RUNNER_TEMP/run-marketplace-delta-candidate.sh"
cp .github/scripts/run-marketplace-delta-candidate.sh "$runner"

python3 - <<'PY'
import os
from pathlib import Path

materializer = Path('.github/scripts/materialize-marketplace-delta.py')
source = materializer.read_text(encoding='utf-8')
old = '  const candidateSources = [actions, offersPage, offerDetail, participantGroup, questionForm].join("\\n");'
new = '  const candidateSources = [actions, offersPage, offerDetail, participantGroup, questionForm].join("\\\\n");'
if source.count(old) != 1:
    raise SystemExit(f'Expected one TypeScript newline literal; found {source.count(old)}.')
materializer.write_text(source.replace(old, new, 1), encoding='utf-8')

runner = Path(os.environ['RUNNER_TEMP']) / 'run-marketplace-delta-candidate.sh'
runner_source = runner.read_text(encoding='utf-8')
copy_line = 'cp .github/scripts/materialize-marketplace-delta.py "$RUNNER_TEMP/materialize-marketplace-delta.py"\n'
replacement = copy_line + 'git checkout -- .github/scripts/materialize-marketplace-delta.py\n'
if runner_source.count(copy_line) != 1:
    raise SystemExit(f'Expected one materializer-copy line in runner; found {runner_source.count(copy_line)}.')
runner.write_text(runner_source.replace(copy_line, replacement, 1), encoding='utf-8')
PY

bash "$runner"
