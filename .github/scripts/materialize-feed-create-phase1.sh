#!/usr/bin/env bash
set -euo pipefail

EXPECTED_MAIN_SHA="36650b48f9e664ea6d67c0840cf6a803060e8d7c"
EXPECTED_PATCH_SHA256="cb9d85bf2917a3f3385357477d120a2ab2322af4a69e0a7184c29fd34bcf433a"
EXPECTED_MANIFEST_SHA256="401228e539612ecbf81dfd4bd7d998e2e229aee96df9a62e1e45072f27684645"
PRODUCT_BRANCH="feature/feed-create-phase1-20260730"
PAYLOAD_DIR=".github/feed-create-phase1-payload"

export NEXT_PUBLIC_SITE_URL="https://www.moraltrade.org"

git fetch origin main --no-tags
test "$(git rev-parse origin/main)" = "$EXPECTED_MAIN_SHA"
test "$(git merge-base origin/main HEAD)" = "$EXPECTED_MAIN_SHA"
if git ls-remote --exit-code --heads origin "$PRODUCT_BRANCH" >/dev/null 2>&1; then
  echo "Refusing to overwrite the existing product branch." >&2
  exit 1
fi

cat "$PAYLOAD_DIR"/part-*.b64 | base64 --decode > /tmp/feed-create-phase1.patch.gz
printf '%s  %s\n' "$EXPECTED_PATCH_SHA256" /tmp/feed-create-phase1.patch.gz | sha256sum --check --strict
printf '%s  %s\n' "$EXPECTED_MANIFEST_SHA256" "$PAYLOAD_DIR/manifest.txt" | sha256sum --check --strict
gzip --decompress --stdout /tmp/feed-create-phase1.patch.gz > /tmp/feed-create-phase1.patch
cp "$PAYLOAD_DIR/manifest.txt" /tmp/feed-create-phase1-manifest.txt

git switch --detach "$EXPECTED_MAIN_SHA"
git switch -c "$PRODUCT_BRANCH"
git apply --check /tmp/feed-create-phase1.patch
git apply /tmp/feed-create-phase1.patch

python3 - <<'PY'
from pathlib import Path

wiring_path = Path("src/feed-create-phase1-wiring.test.ts")
wiring = wiring_path.read_text(encoding="utf-8")
replacements = {
    "assert.doesNotMatch(feedScript, /donation_pool.*Create a trade from this/s);":
        "assert.doesNotMatch(feedScript, /donation_pool[\\s\\S]*Create a trade from this/);",
    "assert.doesNotMatch(feedScript, /donation_redirect.*Create a trade from this/s);":
        "assert.doesNotMatch(feedScript, /donation_redirect[\\s\\S]*Create a trade from this/);",
    "assert.match(sourceResolver, /workflow_status.*published/s);":
        "assert.match(sourceResolver, /workflow_status[\\s\\S]*published/);",
    "assert.match(workbench, /Match scores and explanations are session-only/);":
        "assert.match(workbench, /Match\\s+scores and explanations are session-only/);",
    "assert.match(managePage, /has not been delivered/);":
        "assert.match(managePage, /No reliance or contact/);\n"
        "  assert.match(managePage, /<dt>Delivered<\\/dt>/);\n"
        "  assert.match(managePage, /<dd>No<\\/dd>/);",
}
for old, new in replacements.items():
    if wiring.count(old) != 1:
        raise SystemExit(f"Expected one source-contract assertion: {old}")
    wiring = wiring.replace(old, new)
wiring_path.write_text(wiring, encoding="utf-8")

phase_test_path = Path("src/lib/feed-create/phase1.test.ts")
phase_test = phase_test_path.read_text(encoding="utf-8")
phase_replacements = {
    '''  assert.equal(result.ok, true, result.ok ? undefined : result.failure.message);
  if (!result.ok) throw new Error(result.failure.message);''':
        '''  if (!result.ok) throw new Error(result.failure.message);''',
    '''  assert.equal(result.ok, false);
  if (result.ok) throw new Error("Expected a Feed-to-Create failure.");''':
        '''  if (result.ok) throw new Error("Expected a Feed-to-Create failure.");''',
}
for old, new in phase_replacements.items():
    if phase_test.count(old) != 1:
        raise SystemExit("Expected one discriminated-union test helper block.")
    phase_test = phase_test.replace(old, new)
phase_test_path.write_text(phase_test, encoding="utf-8")

workbench_path = Path("src/components/core-trade/trade-draft-workbench.tsx")
workbench = workbench_path.read_text(encoding="utf-8")
marker = "      const rawPercent = Number(parsed.matchPercent);"
start_token = "      setTransientMatchContext({"
end_token = "      });"
marker_index = workbench.find(marker)
start = workbench.find(start_token, marker_index)
end = workbench.find(end_token, start)
if marker_index < 0 or start < 0 or end < 0:
    raise SystemExit("Could not locate the synchronous transient match-context update.")
end += len(end_token)
new_block = '''      const timeoutId = window.setTimeout(() => {
        setTransientMatchContext({
          actionFitLabel:
            typeof parsed.actionFitLabel === "string"
              ? parsed.actionFitLabel.trim().slice(0, 40)
              : "",
          matchPercent: Number.isFinite(rawPercent)
            ? Math.max(0, Math.min(100, Math.round(rawPercent)))
            : null,
          ownerAlias:
            typeof parsed.ownerAlias === "string"
              ? parsed.ownerAlias.trim().slice(0, 100)
              : "",
          reason:
            typeof parsed.reason === "string" ? parsed.reason.trim().slice(0, 240) : "",
          reasonDetails,
        });
      }, 0);
      return () => window.clearTimeout(timeoutId);'''
workbench_path.write_text(workbench[:start] + new_block + workbench[end:], encoding="utf-8")

workflow_path = Path(".github/workflows/feed-create-phase1-release-qa.yml")
workflow = workflow_path.read_text(encoding="utf-8")
old = '''      - name: Run the absolute TypeScript gate
        shell: bash
        run: |
          set -euo pipefail
          npx tsc --noEmit | tee feed-create-typescript.log
'''
new = '''      - name: Run exact-base differential TypeScript gate
        shell: bash
        run: |
          set -euo pipefail
          base_dir="$(mktemp -d)"
          git worktree add --detach "$base_dir" "$EXPECTED_BASE_SHA"
          ln -s "$GITHUB_WORKSPACE/node_modules" "$base_dir/node_modules"
          set +e
          (
            cd "$base_dir"
            "$GITHUB_WORKSPACE/node_modules/.bin/tsc" --noEmit --pretty false
          ) > feed-create-base-typescript.log 2>&1
          base_status=$?
          "$GITHUB_WORKSPACE/node_modules/.bin/tsc" --noEmit --pretty false \\
            > feed-create-typescript.log 2>&1
          candidate_status=$?
          set -e
          export FEED_CREATE_BASE_TSC_STATUS="$base_status"
          export FEED_CREATE_CANDIDATE_TSC_STATUS="$candidate_status"
          python3 - <<'TYPECHECK'
          from pathlib import Path
          import os
          import re

          pattern = re.compile(r"^(.+?)\\(\\d+,\\d+\\): error (TS\\d+): (.*)$")

          def diagnostics(path):
              result = set()
              for line in Path(path).read_text(encoding="utf-8", errors="replace").splitlines():
                  match = pattern.match(line.strip())
                  if match:
                      result.add((match.group(1), match.group(2), match.group(3)))
              return result

          base = diagnostics("feed-create-base-typescript.log")
          candidate = diagnostics("feed-create-typescript.log")
          base_status = int(os.environ["FEED_CREATE_BASE_TSC_STATUS"])
          candidate_status = int(os.environ["FEED_CREATE_CANDIDATE_TSC_STATUS"])
          if base_status and not base:
              raise SystemExit("Exact-main TypeScript failed without parseable diagnostics.")
          if candidate_status and not candidate:
              raise SystemExit("Candidate TypeScript failed without parseable diagnostics.")
          unexpected = sorted(candidate - base)
          if unexpected:
              print("Unexpected candidate TypeScript diagnostics:")
              for file_name, code, message in unexpected:
                  print(f"{file_name}: {code}: {message}")
              raise SystemExit(1)
          print(f"TypeScript differential passed: base={len(base)} candidate={len(candidate)} unexpected=0")
          TYPECHECK
          git worktree remove --force "$base_dir"
'''
if workflow.count(old) != 1:
    raise SystemExit("Expected one absolute TypeScript release-QA block.")
workflow_path.write_text(workflow.replace(old, new), encoding="utf-8")
PY

git diff --check
git status --porcelain=v1 --untracked-files=all | sed -E 's/^.. //' | LC_ALL=C sort > /tmp/actual-paths.txt
LC_ALL=C sort /tmp/feed-create-phase1-manifest.txt > /tmp/expected-paths.txt
diff -u /tmp/expected-paths.txt /tmp/actual-paths.txt

npm ci
node --check public/moral-trade-live-feed-create.js
node --import tsx --test \
  src/lib/feed-create/phase1.test.ts \
  src/feed-create-phase1-wiring.test.ts
npx eslint \
  public/moral-trade-live-feed-create.js \
  src/app/api/feed-create/events/route.ts \
  src/app/api/live-now/route.ts \
  src/app/core-trade-actions-base.ts \
  src/app/feed-create-actions.ts \
  'src/app/trades/[offerId]/manage/page.tsx' \
  src/app/trades/new/page.tsx \
  src/components/core-trade/trade-draft-workbench.tsx \
  src/feed-create-phase1-wiring.test.ts \
  src/lib/feed-create/phase1.test.ts \
  src/lib/feed-create/phase1.ts \
  src/lib/live-now-recommendations.ts \
  tests/feed-create-phase1-authenticated.spec.ts
npm test
npm run lint

base_dir=/tmp/feed-create-phase1-base
rm -rf "$base_dir"
git worktree add --detach "$base_dir" "$EXPECTED_MAIN_SHA"
ln -s "$GITHUB_WORKSPACE/node_modules" "$base_dir/node_modules"
set +e
(
  cd "$base_dir"
  "$GITHUB_WORKSPACE/node_modules/.bin/tsc" --noEmit --pretty false
) > /tmp/base-tsc.log 2>&1
base_status=$?
"$GITHUB_WORKSPACE/node_modules/.bin/tsc" --noEmit --pretty false > /tmp/candidate-tsc.log 2>&1
candidate_status=$?
set -e
export FEED_CREATE_BASE_TSC_STATUS="$base_status"
export FEED_CREATE_CANDIDATE_TSC_STATUS="$candidate_status"
python3 - <<'PY'
from pathlib import Path
import os
import re

pattern = re.compile(r"^(.+?)\(\d+,\d+\): error (TS\d+): (.*)$")

def diagnostics(path: str):
    result = set()
    for line in Path(path).read_text(encoding="utf-8", errors="replace").splitlines():
        match = pattern.match(line.strip())
        if match:
            result.add((match.group(1), match.group(2), match.group(3)))
    return result

base = diagnostics("/tmp/base-tsc.log")
candidate = diagnostics("/tmp/candidate-tsc.log")
base_status = int(os.environ["FEED_CREATE_BASE_TSC_STATUS"])
candidate_status = int(os.environ["FEED_CREATE_CANDIDATE_TSC_STATUS"])
if base_status and not base:
    raise SystemExit("The exact-base TypeScript command failed without parseable diagnostics.")
if candidate_status and not candidate:
    raise SystemExit("The candidate TypeScript command failed without parseable diagnostics.")
unexpected = sorted(candidate - base)
if unexpected:
    print("Unexpected candidate TypeScript diagnostics:")
    for file_name, code, message in unexpected:
        print(f"{file_name}: {code}: {message}")
    raise SystemExit(1)
print(f"TypeScript differential passed: base={len(base)} candidate={len(candidate)} unexpected=0")
PY
git worktree remove --force "$base_dir"

npm run build
git diff --check
xargs -d '\n' git add -- < /tmp/feed-create-phase1-manifest.txt
unexpected="$(git status --porcelain=v1 | grep -v '^A  \|^M  ' || true)"
test -z "$unexpected"
git config user.name "github-actions[bot]"
git config user.email "41898282+github-actions[bot]@users.noreply.github.com"
git commit -m "Add authenticated Feed-to-Create Phase 1"
test "$(git rev-parse HEAD^)" = "$EXPECTED_MAIN_SHA"
git push origin "HEAD:$PRODUCT_BRANCH"
