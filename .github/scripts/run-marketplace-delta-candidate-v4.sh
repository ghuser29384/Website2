#!/usr/bin/env bash
set -euo pipefail

python3 - <<'PY'
from pathlib import Path

path = Path('.github/scripts/materialize-marketplace-delta.py')
source = path.read_text(encoding='utf-8')
old = '  const candidateSources = [actions, offersPage, offerDetail, participantGroup, questionForm].join("\\n");'
new = '  const candidateSources = [actions, offersPage, offerDetail, participantGroup, questionForm].join("\\\\n");'
if source.count(old) != 1:
    raise SystemExit(f'Expected one TypeScript newline literal in the materializer; found {source.count(old)}.')
path.write_text(source.replace(old, new, 1), encoding='utf-8')
PY

bash .github/scripts/run-marketplace-delta-candidate.sh
