#!/usr/bin/env bash
set -euo pipefail

BRANCH="qa/home-authenticated-feed-20260727"
BASE_SHA="eebf509a970cb69f0586dd990987b486f7db1584"
BUNDLE_SHA256="ed4c7c637288e9e7e0123503648ef9a7dbc02fdf3d9c506cc986ed8d1d0f6d08"
BUNDLE_ROOT="/tmp/home-feed-v4-bundle"
BUNDLE_DIR="${BUNDLE_ROOT}/moraltrade-home-authenticated-feed-eebf509a"
TOOLS_DIR="/tmp/home-feed-v4-tools"
LOG_DIR="/tmp/home-feed-v4-logs"

mkdir -p "${BUNDLE_ROOT}" "${TOOLS_DIR}" "${LOG_DIR}"
cp .qa/home-feed-v4/*.py "${TOOLS_DIR}/"
cat .qa/home-authenticated-feed-bundle/part-* > /tmp/home-feed-v4-bundle.b64
base64 --decode /tmp/home-feed-v4-bundle.b64 > /tmp/home-feed-v4-bundle.zip
echo "${BUNDLE_SHA256}  /tmp/home-feed-v4-bundle.zip" | sha256sum -c -
unzip -q /tmp/home-feed-v4-bundle.zip -d "${BUNDLE_ROOT}"
chmod +x "${BUNDLE_DIR}/apply.sh" "${BUNDLE_DIR}/verify.sh"
unzip -t /tmp/home-feed-v4-bundle.zip | tee "${LOG_DIR}/bundle-integrity.log"

capture_status() {
  local log_path="$1"
  local status_path="$2"
  shift 2
  set +e
  "$@" 2>&1 | tee "${log_path}"
  local command_status=${PIPESTATUS[0]}
  set -e
  echo "${command_status}" > "${status_path}"
}

compare_tap() {
  python "${TOOLS_DIR}/compare-tap.py" "$@"
}

compare_eslint() {
  python "${TOOLS_DIR}/compare-eslint.py" "$@"
}

write_expected_paths() {
  cat > "${LOG_DIR}/expected-paths.txt" <<'EOF'
package.json
public/moral-trade-live-now.js
src/app/api/live-now-a1/route.ts
src/app/page.tsx
src/components/home/home-page.tsx
src/components/home/returning-home.module.css
src/home-feed-contract.test.ts
src/lib/action-first-positioning.test.ts
src/lib/home-feed-snapshot.test.ts
src/lib/home-feed-snapshot.ts
src/lib/live-now-a1-response.ts
src/lib/pareto-feed-runtime.ts
src/lib/public-route-smoke.test.ts
src/pareto-recommendation-wiring.test.ts
tests/returning-homepage.spec.ts
EOF
}

# Exact reviewed base: establish the existing repository baselines first.
git reset --hard "${BASE_SHA}"
git clean -fdx
test "$(git rev-parse HEAD)" = "${BASE_SHA}"
npm ci --no-audit --no-fund 2>&1 | tee "${LOG_DIR}/npm-ci-baseline-exact.log"
capture_status "${LOG_DIR}/test-baseline-exact.log" "${LOG_DIR}/test-baseline-exact.status" npm test
capture_status "${LOG_DIR}/lint-baseline-exact.log" "${LOG_DIR}/lint-baseline-exact.status" npm run lint

# Apply the exact reviewed bundle, then migrate two obsolete fixture-only assertions.
"${BUNDLE_DIR}/apply.sh" "${GITHUB_WORKSPACE}" 2>&1 | tee "${LOG_DIR}/apply.log"
python "${TOOLS_DIR}/update-legacy-tests.py"

write_expected_paths
{
  git diff --name-only
  git ls-files --others --exclude-standard
} | LC_ALL=C sort -u > "${LOG_DIR}/actual-paths.txt"
LC_ALL=C sort -o "${LOG_DIR}/expected-paths.txt" "${LOG_DIR}/expected-paths.txt"
diff -u "${LOG_DIR}/expected-paths.txt" "${LOG_DIR}/actual-paths.txt" | tee "${LOG_DIR}/changed-paths.diff"
git diff --check

npm ci --no-audit --no-fund 2>&1 | tee "${LOG_DIR}/npm-ci-exact.log"
npx playwright install --with-deps chromium 2>&1 | tee "${LOG_DIR}/playwright-install.log"

npm run verify:pareto 2>&1 | tee "${LOG_DIR}/verify-pareto-exact.log"
capture_status "${LOG_DIR}/verify-exact.log" "${LOG_DIR}/verify-exact.status" "${BUNDLE_DIR}/verify.sh" "${GITHUB_WORKSPACE}"
compare_tap \
  "${LOG_DIR}/test-baseline-exact.log" "${LOG_DIR}/test-baseline-exact.status" \
  "${LOG_DIR}/verify-exact.log" "${LOG_DIR}/verify-exact.status" \
  "${LOG_DIR}/exact-baseline-comparison.txt"

capture_status "${LOG_DIR}/lint-exact.log" "${LOG_DIR}/lint-exact.status" npm run lint
compare_eslint \
  "${LOG_DIR}/lint-baseline-exact.log" "${LOG_DIR}/lint-baseline-exact.status" \
  "${LOG_DIR}/lint-exact.log" "${LOG_DIR}/lint-exact.status" \
  "${LOG_DIR}/exact-lint-comparison.txt"

npm run build 2>&1 | tee "${LOG_DIR}/build-exact.log"
npx playwright test tests/returning-homepage.spec.ts 2>&1 | tee "${LOG_DIR}/playwright-exact.log"

# Commit only the product and durable test changes.
git config user.name "github-actions[bot]"
git config user.email "41898282+github-actions[bot]@users.noreply.github.com"
git add \
  package.json \
  public/moral-trade-live-now.js \
  src/app/api/live-now-a1/route.ts \
  src/app/page.tsx \
  src/components/home/home-page.tsx \
  src/components/home/returning-home.module.css \
  src/home-feed-contract.test.ts \
  src/lib/action-first-positioning.test.ts \
  src/lib/home-feed-snapshot.test.ts \
  src/lib/home-feed-snapshot.ts \
  src/lib/live-now-a1-response.ts \
  src/lib/pareto-feed-runtime.ts \
  src/lib/public-route-smoke.test.ts \
  src/pareto-recommendation-wiring.test.ts \
  tests/returning-homepage.spec.ts
git diff --cached --check
git commit -m "Use the authenticated Feed snapshot on Home"
git show --stat --oneline HEAD | tee "${LOG_DIR}/implementation-commit.txt"

# Establish the current-main baselines in an isolated worktree.
git fetch origin main
rm -rf /tmp/home-feed-v4-main-baseline
git worktree add --detach /tmp/home-feed-v4-main-baseline origin/main
pushd /tmp/home-feed-v4-main-baseline
npm ci --no-audit --no-fund 2>&1 | tee "${LOG_DIR}/npm-ci-baseline-main.log"
capture_status "${LOG_DIR}/test-baseline-main.log" "${LOG_DIR}/test-baseline-main.status" npm test
capture_status "${LOG_DIR}/lint-baseline-main.log" "${LOG_DIR}/lint-baseline-main.status" npm run lint
popd
git worktree remove --force /tmp/home-feed-v4-main-baseline

# Rebase the one verified implementation commit and repeat every gate.
git rebase origin/main 2>&1 | tee "${LOG_DIR}/rebase.log"
git merge-base --is-ancestor origin/main HEAD
test "$(git rev-list --count origin/main..HEAD)" = "1"
npm ci --no-audit --no-fund 2>&1 | tee "${LOG_DIR}/npm-ci-rebased.log"

npm run verify:pareto 2>&1 | tee "${LOG_DIR}/verify-pareto-rebased.log"
capture_status "${LOG_DIR}/verify-rebased.log" "${LOG_DIR}/verify-rebased.status" "${BUNDLE_DIR}/verify.sh" "${GITHUB_WORKSPACE}"
compare_tap \
  "${LOG_DIR}/test-baseline-main.log" "${LOG_DIR}/test-baseline-main.status" \
  "${LOG_DIR}/verify-rebased.log" "${LOG_DIR}/verify-rebased.status" \
  "${LOG_DIR}/rebased-baseline-comparison.txt"

capture_status "${LOG_DIR}/lint-rebased.log" "${LOG_DIR}/lint-rebased.status" npm run lint
compare_eslint \
  "${LOG_DIR}/lint-baseline-main.log" "${LOG_DIR}/lint-baseline-main.status" \
  "${LOG_DIR}/lint-rebased.log" "${LOG_DIR}/lint-rebased.status" \
  "${LOG_DIR}/rebased-lint-comparison.txt"

npm run build 2>&1 | tee "${LOG_DIR}/build-rebased.log"
npx playwright test tests/returning-homepage.spec.ts 2>&1 | tee "${LOG_DIR}/playwright-rebased.log"
git diff --exit-code
git diff --cached --exit-code
git rev-parse HEAD | tee "${LOG_DIR}/final-head-sha.txt"
