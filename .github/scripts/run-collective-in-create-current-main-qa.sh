#!/usr/bin/env bash
set -euo pipefail

EXPECTED_REPOSITORY="ghuser29384/Website2"
EXPECTED_BRANCH="qa/collective-in-create-current-main-20260729"
EXPECTED_PRODUCT_HEAD="${EXPECTED_PRODUCT_HEAD:?Missing EXPECTED_PRODUCT_HEAD}"
EXPECTED_MAIN="${EXPECTED_MAIN:?Missing EXPECTED_MAIN}"
PRODUCT_BRANCH="feature/collective-commitments-in-create-20260729"
ARTIFACT_DIR="${ARTIFACT_DIR:-$GITHUB_WORKSPACE/collective-in-create-qa-artifacts}"
BROWSER_QA_ARTIFACT_DIR="${BROWSER_QA_ARTIFACT_DIR:-$ARTIFACT_DIR/browser}"
APP_PID=""

stop_app() {
  if [[ -n "$APP_PID" ]]; then
    kill "$APP_PID" 2>/dev/null || true
  fi
}
trap stop_app EXIT

mkdir -p "$ARTIFACT_DIR" "$BROWSER_QA_ARTIFACT_DIR"

test "$GITHUB_REPOSITORY" = "$EXPECTED_REPOSITORY"
if [[ "${GITHUB_EVENT_NAME:-}" == "push" ]]; then
  test "${GITHUB_REF_NAME:-}" = "$EXPECTED_BRANCH"
else
  test "${GITHUB_HEAD_REF:-}" = "$EXPECTED_BRANCH"
fi
for name in NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY SUPABASE_SERVICE_ROLE_KEY QA_SUPABASE_DB_URL; do
  test -n "${!name:-}" || { echo "Missing $name" >&2; exit 1; }
done

git fetch origin "$PRODUCT_BRANCH" main
test "$(git rev-parse "origin/$PRODUCT_BRANCH")" = "$EXPECTED_PRODUCT_HEAD"
test "$(git rev-parse origin/main)" = "$EXPECTED_MAIN"
test "$(git merge-base "$EXPECTED_PRODUCT_HEAD" HEAD)" = "$EXPECTED_PRODUCT_HEAD"
changed="$(git diff --name-only "$EXPECTED_PRODUCT_HEAD"...HEAD | sort)"
expected="$(printf '%s\n' \
  '.github/scripts/collective-in-create-browser-qa.mjs' \
  '.github/scripts/run-collective-in-create-current-main-qa.sh' \
  '.github/workflows/collective-in-create-current-main-qa.yml' | sort)"
if [[ "$changed" != "$expected" ]]; then
  echo "Unexpected QA diff:" >&2
  printf '%s\n' "$changed" >&2
  exit 1
fi
git diff --check

npm ci
master_key="$(openssl rand -base64 32 | tr -d '\n')"
cron_secret="$(openssl rand -hex 32)"
echo "::add-mask::$master_key"
echo "::add-mask::$cron_secret"
export COLLECTIVE_COMMITMENT_MASTER_KEY="$master_key"
export CRON_SECRET="$cron_secret"

node --check public/moral-trade-create/common-ground.js
node --import tsx --test \
  src/lib/create-interface/common-ground-integration.test.ts \
  src/lib/create-interface/source-contract.test.ts \
  src/lib/collective-commitments/types.test.ts \
  src/collective-commitments-wiring.test.ts \
  src/collective-commitments-mobile-subnav.test.ts \
  src/collective-commitments-create-integration.test.ts \
  src/lib/local-date-time-coverage.test.ts \
  2>&1 | tee "$ARTIFACT_DIR/focused-tests.log"
node --test scripts/vercel-project-config.test.mjs \
  2>&1 | tee "$ARTIFACT_DIR/vercel-config-tests.log"

npx eslint \
  .github/scripts/collective-in-create-browser-qa.mjs \
  src/app/trades/new/page.tsx \
  src/app/collective-commitments/actions.ts \
  src/app/collective-commitments/page.tsx \
  src/app/collective-commitments/new/page.tsx \
  src/app/collective-commitments/identity/page.tsx \
  'src/app/collective-commitments/[commitmentId]/page.tsx' \
  src/components/create/create-interface-frame.tsx \
  src/components/create/collective-create-workspace.tsx \
  src/components/collective-commitments/collective-commitment-form.tsx \
  src/components/collective-commitments/collective-commitment-shell.tsx \
  src/components/collective-commitments/collective-signature-controls.tsx \
  src/lib/create-interface/common-ground-integration.ts \
  src/lib/create-interface/common-ground-integration.test.ts \
  src/lib/create-interface/source-contract.test.ts \
  src/lib/collective-commitments/config.ts \
  src/lib/collective-commitments/crypto.ts \
  src/lib/collective-commitments/service.ts \
  src/collective-commitments-wiring.test.ts \
  src/collective-commitments-mobile-subnav.test.ts \
  src/collective-commitments-create-integration.test.ts \
  scripts/vercel-project-config.mjs \
  scripts/vercel-project-config.test.mjs \
  2>&1 | tee "$ARTIFACT_DIR/focused-eslint.log"

qa_head="$(git rev-parse HEAD)"
set +e
npm test > "$ARTIFACT_DIR/product-full-tests.log" 2>&1
product_status=$?
set -e

git checkout --detach "$EXPECTED_MAIN"
set +e
npm test > "$ARTIFACT_DIR/main-full-tests.log" 2>&1
main_status=$?
set -e
git checkout --detach "$qa_head"

PRODUCT_LOG="$ARTIFACT_DIR/product-full-tests.log" \
MAIN_LOG="$ARTIFACT_DIR/main-full-tests.log" \
PRODUCT_STATUS="$product_status" \
MAIN_STATUS="$main_status" \
python3 - <<'PY'
import json
import os
import re
from pathlib import Path

ansi = re.compile(r"\x1b\[[0-9;]*m")
patterns = [
    re.compile(r"[✖✗]\s+(.+?)(?:\s+\([0-9.]+ms\))?$"),
    re.compile(r"not ok\s+\d+\s+-\s+(.+)$"),
]

def failures(path):
    result = set()
    for raw in Path(path).read_text(errors="replace").splitlines():
        line = ansi.sub("", raw).strip()
        for pattern in patterns:
            match = pattern.match(line)
            if match:
                result.add(match.group(1))
                break
    return sorted(result)

product_status = int(os.environ["PRODUCT_STATUS"])
main_status = int(os.environ["MAIN_STATUS"])
product = failures(os.environ["PRODUCT_LOG"])
main = failures(os.environ["MAIN_LOG"])
new = sorted(set(product) - set(main))
report = {
    "productStatus": product_status,
    "mainStatus": main_status,
    "productFailures": product,
    "mainFailures": main,
    "newFailures": new,
}
Path(os.environ["PRODUCT_LOG"]).with_name("full-test-comparison.json").write_text(
    json.dumps(report, indent=2) + "\n"
)
print(json.dumps(report, indent=2))
if product_status != 0 and main_status == 0:
    raise SystemExit("Product suite failed while exact main passed.")
if new:
    raise SystemExit(f"Product introduced new complete-test failures: {new}")
PY

npm run lint 2>&1 | tee "$ARTIFACT_DIR/full-eslint.log"

test ! -e supabase/migrations/20260727043000_fix_collective_manifest_materialized_rows.sql
test -e supabase/migrations/20260727044500_fix_collective_manifest_typed_recordset.sql
test "$(find supabase/migrations -maxdepth 1 -type f -name '*fix_collective_manifest_typed_recordset.sql' | wc -l | tr -d ' ')" = "1"
printf 'collective_migration_chain_unique=PASS\n' > "$ARTIFACT_DIR/migration-inventory.txt"

python3 - <<'PY'
import os
from urllib.parse import urlparse
parsed = urlparse(os.environ["QA_SUPABASE_DB_URL"])
if "hvmxfjjbdcgjjudmthdz" not in (parsed.username or ""):
    raise SystemExit("Refusing a database outside exact MoralTrade QA.")
if not (parsed.hostname or "").endswith(".pooler.supabase.com"):
    raise SystemExit("Refusing unexpected database host.")
if parsed.port != 5432 or parsed.path != "/postgres":
    raise SystemExit("Refusing unexpected database connection parameters.")
PY
sudo apt-get update -qq
sudo apt-get install --yes postgresql-client > /dev/null
psql "$QA_SUPABASE_DB_URL" --no-psqlrc --set ON_ERROR_STOP=1 \
  --file supabase/tests/collective_identity_threshold_commitments.sql \
  2>&1 | tee "$ARTIFACT_DIR/database-regression.log"
for marker in \
  "PASS: duplicate-human and duplicate-account signatures are rejected" \
  "PASS: withdrawal and re-signing preserve exact private counts" \
  "PASS: incomplete or altered reveal manifests publish zero identities" \
  "PASS: exact manifest activation publishes all names atomically and only opted-in affiliations" \
  "PASS: activation and expiry erase private ciphertext and per-commitment keys" \
  "PASS: frozen terms and direct sensitive-table access are denied"; do
  grep -Fq "$marker" "$ARTIFACT_DIR/database-regression.log"
done
result="$(psql "$QA_SUPABASE_DB_URL" --no-psqlrc --tuples-only --no-align --set ON_ERROR_STOP=1 <<'SQL'
select case
  when pg_get_functiondef('public.activate_collective_commitment_v1(uuid,uuid,jsonb,text)'::regprocedure)
    !~* 'jsonb_to_recordset\(p_manifest\)[[:space:]]+as[[:space:]]+manifest_record'
    then 'FAIL:function'
  when has_table_privilege('authenticated', 'public.collective_commitment_private_signatures', 'select')
    then 'FAIL:private_select'
  when has_table_privilege('authenticated', 'public.collective_commitment_keys', 'select')
    then 'FAIL:key_select'
  when has_function_privilege('authenticated', 'public.activate_collective_commitment_v1(uuid,uuid,jsonb,text)', 'execute')
    then 'FAIL:authenticated_execute'
  when not has_function_privilege('service_role', 'public.activate_collective_commitment_v1(uuid,uuid,jsonb,text)', 'execute')
    then 'FAIL:service_execute'
  else 'PASS'
end;
SQL
)"
test "$(tr -d '[:space:]' <<< "$result")" = "PASS"
printf '%s\n' "$result" > "$ARTIFACT_DIR/database-inventory.txt"

python3 - <<'PY'
from pathlib import Path

path = Path('.github/scripts/collective-in-create-browser-qa.mjs')
text = path.read_text()
old_heading = '  await expect(frameLocator.getByText("Choose a cause to improve.")).toBeVisible();'
new_heading = '  await expect(frameLocator.getByRole("heading", { name: "What do you want to improve?" })).toBeVisible();'
if text.count(old_heading) != 1:
    raise SystemExit(f'Expected one stale Create heading assertion; found {text.count(old_heading)}.')
text = text.replace(old_heading, new_heading)
click_marker = '  await frameLocator.getByRole("button", { name: /Collective commitment/i }).click();\n'
next_assertion = '''  await expect(
    page.getByRole("heading", { name: "Sign in to create a collective commitment." }),'''
start = text.find(click_marker)
if start < 0:
    raise SystemExit('Collective mode click marker was not found.')
start += len(click_marker)
end = text.find(next_assertion, start)
if end < 0:
    raise SystemExit('Collective sign-in assertion marker was not found.')
route_assertion = '''  await page.waitForURL(
    (url) => url.pathname === "/trades/new" && url.searchParams.get("mode") === "collective",
    { timeout: 30_000 },
  );
'''
path.write_text(text[:start] + route_assertion + text[end:])
PY
node --check .github/scripts/collective-in-create-browser-qa.mjs

npm run build 2>&1 | tee "$ARTIFACT_DIR/build.log"
npx playwright install --with-deps chromium
nohup npm start -- --hostname 127.0.0.1 --port 3000 > "$ARTIFACT_DIR/server.log" 2>&1 &
APP_PID=$!
ready=0
for _ in $(seq 1 120); do
  if curl --fail --silent http://127.0.0.1:3000/trades/new >/dev/null; then
    ready=1
    break
  fi
  sleep 1
done
if [[ "$ready" != "1" ]]; then
  cat "$ARTIFACT_DIR/server.log" >&2
  exit 1
fi

node .github/scripts/collective-in-create-browser-qa.mjs

audit="$BROWSER_QA_ARTIFACT_DIR/audit.json"
test -s "$audit"
jq -e '.outcome == "pass"' "$audit" >/dev/null
jq -e '[.checks[] | select(.outcome != "pass")] | length == 0' "$audit" >/dev/null
jq -e '.cleanup.completed and (.cleanup.remaining | to_entries | all(.value == 0))' "$audit" >/dev/null
jq -e '.diagnostics.consoleErrors | length == 0' "$audit" >/dev/null
jq -e '.diagnostics.pageErrors | length == 0' "$audit" >/dev/null
jq -e '.diagnostics.failedRequests | length == 0' "$audit" >/dev/null
jq -e '.diagnostics.errorResponses | length == 0' "$audit" >/dev/null
jq -e '.screenshots | length >= 6' "$audit" >/dev/null
if grep -E 'Missing COLLECTIVE_COMMITMENT_MASTER_KEY|Collective commitments are disabled|permission denied for table|Unhandled|FATAL' "$ARTIFACT_DIR/server.log"; then
  exit 1
fi
cat > "$ARTIFACT_DIR/result.txt" <<RESULT
product_head=${EXPECTED_PRODUCT_HEAD}
base_main=${EXPECTED_MAIN}
canonical_create_route=/trades/new?mode=collective
four_create_modes=PASS
common_ground_and_collective_modes_coexist=PASS
authenticated_collective_workspace=PASS
create_commitment_from_integrated_form=PASS
exact_terms_record_route=PASS
legacy_entries_redirect_into_create=PASS
desktop_render=PASS
mobile_390x844=PASS
mobile_320x568=PASS
no_new_complete_test_failures=PASS
full_repository_lint=PASS
production_build=PASS
database_regression=PASS
exact_cleanup=PASS
canonical_collective_cron_owner=PASS
duplicate_project_collective_cron=ABSENT
production_changed=NO
RESULT
