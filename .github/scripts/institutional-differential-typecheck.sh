#!/usr/bin/env bash
set -euo pipefail

artifacts_dir="institutional-qa-artifacts"
generated_types="${artifacts_dir}/database.types.ts"
feature_types="src/lib/supabase/database.types.ts"
base_dir="/tmp/institutional-pr-base-typecheck"
base_log="${artifacts_dir}/typecheck-base.log"
feature_log="${artifacts_dir}/typecheck-feature.log"
report="${artifacts_dir}/typecheck-differential.json"

mkdir -p "$artifacts_dir"
test -s "$generated_types"
cmp --silent "$generated_types" "$feature_types" || {
  echo "The feature worktree is not using the exact generated isolated-QA database types." >&2
  exit 1
}

git fetch --no-tags origin main:refs/remotes/origin/main
base_sha="$(git merge-base HEAD origin/main)"
printf '%s\n' "$base_sha" | tee "${artifacts_dir}/typecheck-base.sha"

if ! git diff --quiet "$base_sha" HEAD -- package.json package-lock.json; then
  echo "Package manifests differ from the exact PR base; the typecheck comparison would not be controlled." >&2
  exit 1
fi

rm -rf "$base_dir"
git worktree prune
git worktree add --detach "$base_dir" "$base_sha"
cleanup_base_worktree() {
  git worktree remove --force "$base_dir" >/dev/null 2>&1 || true
}
trap cleanup_base_worktree EXIT

cp "$generated_types" "$base_dir/src/lib/supabase/database.types.ts"
rm -rf "$base_dir/node_modules"
ln -s "$GITHUB_WORKSPACE/node_modules" "$base_dir/node_modules"

set +e
(
  cd "$base_dir"
  npx tsc --noEmit --pretty false
) >"$base_log" 2>&1
base_status=$?
npx tsc --noEmit --pretty false >"$feature_log" 2>&1
feature_status=$?
set -e

printf '%s\n' "$base_status" > "${artifacts_dir}/typecheck-base.status"
printf '%s\n' "$feature_status" > "${artifacts_dir}/typecheck-feature.status"

python - "$base_log" "$feature_log" "$base_status" "$feature_status" "$base_sha" "$report" <<'PY'
from __future__ import annotations

from collections import Counter
import json
import os
from pathlib import Path
import re
import sys

base_log, feature_log, base_status_raw, feature_status_raw, base_sha, report_path = sys.argv[1:]
base_status = int(base_status_raw)
feature_status = int(feature_status_raw)
ansi = re.compile(r"\x1b\[[0-9;]*[A-Za-z]")
diagnostic = re.compile(
    r"(?P<path>[^\s].*?)\((?P<line>\d+),(?P<column>\d+)\): error "
    r"(?P<code>TS\d+): (?P<message>.*)$"
)

def parse(path: str) -> Counter[str]:
    diagnostics: Counter[str] = Counter()
    for raw in Path(path).read_text(errors="replace").splitlines():
        line = ansi.sub("", raw).replace("\ufeff", "")
        match = diagnostic.search(line)
        if not match:
            continue
        key = "|".join(
            (
                match.group("path").strip(),
                match.group("code"),
                match.group("message").strip(),
            )
        )
        diagnostics[key] += 1
    return diagnostics

base = parse(base_log)
feature = parse(feature_log)
for label, status, diagnostics in (
    ("exact base", base_status, base),
    ("feature", feature_status, feature),
):
    if status == 0 and diagnostics:
        raise SystemExit(f"{label} typecheck exited zero despite parsed diagnostics.")
    if status != 0 and not diagnostics:
        raise SystemExit(
            f"{label} typecheck exited {status} without parseable TypeScript diagnostics; "
            "treating this as an infrastructure failure."
        )

feature_only = feature - base
base_only = base - feature
shared = feature & base
payload = {
    "base_sha": base_sha,
    "feature_sha": os.environ.get("GITHUB_SHA", ""),
    "base_exit_status": base_status,
    "feature_exit_status": feature_status,
    "base_diagnostic_count": sum(base.values()),
    "feature_diagnostic_count": sum(feature.values()),
    "shared_diagnostic_count": sum(shared.values()),
    "feature_only_diagnostic_count": sum(feature_only.values()),
    "base_only_diagnostic_count": sum(base_only.values()),
    "feature_only_diagnostics": sorted(feature_only.elements()),
    "base_only_diagnostics": sorted(base_only.elements()),
}
Path(report_path).write_text(json.dumps(payload, indent=2, ensure_ascii=False) + "\n")
print(json.dumps(payload, indent=2, ensure_ascii=False))
if feature_only:
    raise SystemExit(
        "The feature branch introduced generated-schema TypeScript diagnostics "
        "that are absent from the exact PR base."
    )
PY

echo "Exact-base differential generated-schema typecheck passed."
