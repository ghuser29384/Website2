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
copy_replacement = copy_line + 'git checkout -- .github/scripts/materialize-marketplace-delta.py\n'
if runner_source.count(copy_line) != 1:
    raise SystemExit(f'Expected one materializer-copy line; found {runner_source.count(copy_line)}.')
runner_source = runner_source.replace(copy_line, copy_replacement, 1)

old_tsc = 'npx tsc --noEmit\n'
new_tsc = r'''candidate_tsc="$RUNNER_TEMP/candidate-tsc.txt"
base_tsc="$RUNNER_TEMP/base-tsc.txt"
set +e
npx tsc --noEmit --pretty false > "$candidate_tsc" 2>&1
candidate_tsc_status=$?
set -e

base_dir="$RUNNER_TEMP/current-main-tsc"
git worktree add --detach "$base_dir" "$BASE_MAIN_SHA"
ln -s "$GITHUB_WORKSPACE/node_modules" "$base_dir/node_modules"
set +e
(
  cd "$base_dir"
  npx --no-install tsc --noEmit --pretty false > "$base_tsc" 2>&1
)
base_tsc_status=$?
set -e
git worktree remove --force "$base_dir"

CANDIDATE_TSC="$candidate_tsc" BASE_TSC="$base_tsc" \
  CANDIDATE_TSC_STATUS="$candidate_tsc_status" BASE_TSC_STATUS="$base_tsc_status" \
  python3 - <<'PY_TSC'
import os
import re
from pathlib import Path

pattern = re.compile(r"^(.*?\(\d+,\d+\): error TS\d+: .*)$")

def normalized(path: str) -> set[str]:
    rows = set()
    for line in Path(path).read_text(encoding="utf-8", errors="replace").splitlines():
        match = pattern.match(line.strip())
        if match:
            rows.add(match.group(1))
    return rows

candidate = normalized(os.environ["CANDIDATE_TSC"])
base = normalized(os.environ["BASE_TSC"])
candidate_only = sorted(candidate - base)
base_only = sorted(base - candidate)
report = [
    f"current_main_tsc_exit={os.environ['BASE_TSC_STATUS']}",
    f"candidate_tsc_exit={os.environ['CANDIDATE_TSC_STATUS']}",
    f"current_main_errors={len(base)}",
    f"candidate_errors={len(candidate)}",
    f"candidate_only_errors={len(candidate_only)}",
    f"base_only_errors={len(base_only)}",
]
if candidate_only:
    report.extend(["", "Candidate-only TypeScript errors:", *candidate_only])
if base_only:
    report.extend(["", "Base-only TypeScript errors:", *base_only])
Path("typescript-differential.txt").write_text("\n".join(report) + "\n", encoding="utf-8")
print("\n".join(report))
if candidate_only:
    raise SystemExit("The narrow candidate introduced TypeScript errors relative to exact current main.")
PY_TSC
'''
if runner_source.count(old_tsc) != 1:
    raise SystemExit(f'Expected one standalone TypeScript command; found {runner_source.count(old_tsc)}.')
runner_source = runner_source.replace(old_tsc, new_tsc, 1)

validation_marker = 'cp "$RUNNER_TEMP/production-rollback-result.txt" production-rollback-result.txt\n'
validation_replacement = validation_marker + 'test -f typescript-differential.txt\n'
if runner_source.count(validation_marker) != 1:
    raise SystemExit('Expected one validation-artifact marker.')
runner_source = runner_source.replace(validation_marker, validation_replacement, 1)
runner.write_text(runner_source, encoding='utf-8')
PY

bash "$runner"
