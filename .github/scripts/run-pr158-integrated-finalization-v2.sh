#!/usr/bin/env bash
set -euo pipefail

: "${GITHUB_WORKSPACE:?}"
: "${RUNNER_TEMP:?}"
: "${PROD_SUPABASE_DB_URL:?}"

PR_BRANCH="agent/dynamic-marketplace-clearing-rounds"
EXPECTED_PR_HEAD="5d14b8bdde08d7e8880109741b6c3a75bc308728"
EXPECTED_MAIN_SHA="c42d07797554958074945547ec121ab922cebc61"
EVIDENCE_DIR="$GITHUB_WORKSPACE/integrated-final-v2-evidence"
PATCH_SCRIPT="$RUNNER_TEMP/apply-pr158-integrated-lint-fixes.py"
mkdir -p "$EVIDENCE_DIR"

python3 - <<'PY'
import os
from urllib.parse import urlparse
parsed = urlparse(os.environ["PROD_SUPABASE_DB_URL"])
if "jnpoxvalyjtdghnperyu" not in (parsed.username or ""):
    raise SystemExit("Refusing non-production database user.")
if parsed.hostname != "aws-1-us-west-2.pooler.supabase.com":
    raise SystemExit("Refusing unexpected production pooler host.")
if parsed.port != 5432 or parsed.path != "/postgres":
    raise SystemExit("Refusing unexpected production database connection parameters.")
PY

git config user.name "ghuser29384"
git config user.email "262476329+ghuser29384@users.noreply.github.com"
git fetch origin main "$PR_BRANCH"
test "$(git rev-parse origin/main)" = "$EXPECTED_MAIN_SHA"
test "$(git rev-parse "origin/$PR_BRANCH")" = "$EXPECTED_PR_HEAD"
test "$(git rev-list --count "$EXPECTED_PR_HEAD..$EXPECTED_MAIN_SHA")" = "8"

git worktree add "$RUNNER_TEMP/main-baseline-v2" "$EXPECTED_MAIN_SHA"
git checkout -B "$PR_BRANCH" "origin/$PR_BRANCH"
git merge --no-ff --no-edit "$EXPECTED_MAIN_SHA"
test "$(git rev-parse HEAD^1)" = "$EXPECTED_PR_HEAD"
test "$(git rev-parse HEAD^2)" = "$EXPECTED_MAIN_SHA"
python3 "$PATCH_SCRIPT"
git add \
  src/app/offers/offer-plane-inline-mount.tsx \
  src/app/offers/offer-visual-directory-mount.tsx \
  src/components/profile/complete-profile-connections.tsx
git commit -m "Repair current-main React effect lint regressions"
INTEGRATED_SHA="$(git rev-parse HEAD)"
export INTEGRATED_SHA EXPECTED_MAIN_SHA EXPECTED_PR_HEAD
git merge-base --is-ancestor "$EXPECTED_MAIN_SHA" HEAD
git diff --check "$EXPECTED_PR_HEAD" HEAD

cd "$RUNNER_TEMP/main-baseline-v2"
npm ci > "$EVIDENCE_DIR/main-npm-ci.log" 2>&1
set +e
npx tsc --noEmit > "$EVIDENCE_DIR/main-typescript.log" 2>&1
MAIN_TSC_STATUS=$?
set -e

cd "$GITHUB_WORKSPACE"
npm ci > "$EVIDENCE_DIR/candidate-npm-ci.log" 2>&1
set +e
npx tsc --noEmit > "$EVIDENCE_DIR/candidate-typescript.log" 2>&1
CANDIDATE_TSC_STATUS=$?
set -e
printf '%s\n' "$MAIN_TSC_STATUS" > "$EVIDENCE_DIR/main-typescript.status"
printf '%s\n' "$CANDIDATE_TSC_STATUS" > "$EVIDENCE_DIR/candidate-typescript.status"

python3 - <<'PY'
import json
import os
import re
from pathlib import Path
root = Path(os.environ["GITHUB_WORKSPACE"]) / "integrated-final-v2-evidence"

def errors(path: Path):
    result = []
    for line in path.read_text(encoding="utf-8", errors="replace").splitlines():
        value = line.strip()
        if "error TS" not in value:
            continue
        value = re.sub(r"^.*?/(src/)", r"\1", value)
        result.append(value)
    return sorted(set(result))

main_status = int((root / "main-typescript.status").read_text().strip())
candidate_status = int((root / "candidate-typescript.status").read_text().strip())
main_errors = errors(root / "main-typescript.log")
candidate_errors = errors(root / "candidate-typescript.log")
candidate_only = sorted(set(candidate_errors) - set(main_errors))
main_only = sorted(set(main_errors) - set(candidate_errors))
payload = {
    "main_sha": os.environ["EXPECTED_MAIN_SHA"],
    "integrated_sha": os.environ["INTEGRATED_SHA"],
    "main_status": main_status,
    "candidate_status": candidate_status,
    "main_errors": main_errors,
    "candidate_errors": candidate_errors,
    "candidate_only_errors": candidate_only,
    "main_only_errors": main_only,
}
(root / "typescript-comparison.json").write_text(json.dumps(payload, indent=2) + "\n")
summary = [
    "# Standalone TypeScript comparison",
    "",
    f"- Current main status: `{main_status}`",
    f"- Integrated candidate status: `{candidate_status}`",
    f"- Current-main errors: `{len(main_errors)}`",
    f"- Integrated errors: `{len(candidate_errors)}`",
    f"- Candidate-only errors: `{len(candidate_only)}`",
    f"- Main-only errors: `{len(main_only)}`",
]
(root / "typescript-comparison.md").write_text("\n".join(summary) + "\n")
print("\n".join(summary))
if candidate_only or main_only or candidate_status != main_status:
    raise SystemExit("Integrated candidate does not match current main's standalone TypeScript baseline.")
PY

node --import tsx --test \
  'src/app/deals/[agreementId]/dealroom-bilateral-confirmation.test.ts' \
  src/app/offers/marketplace-interest-acceptance.test.ts \
  src/app/offers/dynamic-marketplace.test.ts \
  src/lib/marketplace-clearing-round.test.ts \
  src/lib/marketplace-offer-families.test.ts \
  | tee "$EVIDENCE_DIR/focused-tests.log"

npm run lint 2>&1 | tee "$EVIDENCE_DIR/full-lint.log"
npm run build 2>&1 | tee "$EVIDENCE_DIR/production-build.log"
git diff --check "$EXPECTED_PR_HEAD" HEAD

migrations=(
  supabase/migrations/20260726143000_restore_agreement_completion_contract_and_atomic_acceptance.sql
  supabase/migrations/20260726163500_fix_atomic_acceptance_core_version_linking.sql
  supabase/migrations/20260726164500_fix_atomic_acceptance_core_internal_write.sql
  supabase/migrations/20260726165500_close_offer_on_atomic_acceptance.sql
  supabase/migrations/20260727050000_allow_closed_marketplace_offer_bilateral_confirmation.sql
)
versions=(20260726143000 20260726163500 20260726164500 20260726165500 20260727050000)
for migration in "${migrations[@]}"; do
  test -f "$migration"
  ! grep -Ein '^[[:space:]]*(begin|commit|rollback)[[:space:]]*;' "$migration"
  ! grep -Ein 'create[[:space:]]+index[[:space:]]+concurrently' "$migration"
done
version_list="'$(IFS="','"; echo "${versions[*]}")'"
before_count="$(psql "$PROD_SUPABASE_DB_URL" --no-psqlrc --tuples-only --no-align --set ON_ERROR_STOP=1 --command "select count(*) from supabase_migrations.schema_migrations where version in (${version_list});")"
test "$(tr -d '[:space:]' <<< "$before_count")" = "0"

pg_dump "$PROD_SUPABASE_DB_URL" --schema-only --no-owner --no-privileges --schema=public \
  > "$EVIDENCE_DIR/production-schema-before.raw.sql"
sed -E '/^\\(un)?restrict /d' "$EVIDENCE_DIR/production-schema-before.raw.sql" \
  > "$EVIDENCE_DIR/production-schema-before.sql"

compile="$RUNNER_TEMP/compile-pr158-migrations-v2.sql"
{
  echo '\set ON_ERROR_STOP on'
  echo 'begin;'
  echo "set local lock_timeout = '3s';"
  echo "set local statement_timeout = '90s';"
  echo "set local idle_in_transaction_session_timeout = '120s';"
  for migration in "${migrations[@]}"; do
    echo "-- BEGIN $migration"
    cat "$migration"
    echo "-- END $migration"
  done
  cat <<'SQL'
do $verify$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='agreements' and column_name='completion_state'
  ) then raise exception 'completion_state missing after compile'; end if;
  if to_regclass('public.agreement_evidence_items') is null then raise exception 'agreement_evidence_items missing'; end if;
  if to_regclass('public.agreement_review_cases') is null then raise exception 'agreement_review_cases missing'; end if;
  if to_regprocedure('public.accept_marketplace_interest_v1(uuid,uuid,text,text,text)') is null then raise exception 'member acceptance RPC missing'; end if;
  if to_regprocedure('public.accept_marketplace_guest_interest_v1(uuid,uuid,text)') is null then raise exception 'guest acceptance RPC missing'; end if;
  if position(
    'offer_row.status::text = ''matched''' in
    pg_get_functiondef('public.confirm_agreement_version_v2(uuid,uuid,uuid)'::regprocedure)
  ) = 0 then raise exception 'closed-offer confirmation path missing'; end if;
end;
$verify$;
rollback;
SQL
} > "$compile"

psql "$PROD_SUPABASE_DB_URL" --no-psqlrc --set ON_ERROR_STOP=1 --file "$compile" \
  2>&1 | tee "$EVIDENCE_DIR/production-migration-rollback-compile.log"

pg_dump "$PROD_SUPABASE_DB_URL" --schema-only --no-owner --no-privileges --schema=public \
  > "$EVIDENCE_DIR/production-schema-after.raw.sql"
sed -E '/^\\(un)?restrict /d' "$EVIDENCE_DIR/production-schema-after.raw.sql" \
  > "$EVIDENCE_DIR/production-schema-after.sql"
diff -u "$EVIDENCE_DIR/production-schema-before.sql" "$EVIDENCE_DIR/production-schema-after.sql" \
  > "$EVIDENCE_DIR/production-schema-post-rollback.diff"
after_count="$(psql "$PROD_SUPABASE_DB_URL" --no-psqlrc --tuples-only --no-align --set ON_ERROR_STOP=1 --command "select count(*) from supabase_migrations.schema_migrations where version in (${version_list});")"
test "$(tr -d '[:space:]' <<< "$after_count")" = "0"
echo "PASS: five ordered migrations compiled against production and rolled back without schema residue." \
  | tee "$EVIDENCE_DIR/production-migration-rollback-result.txt"

cat > "$EVIDENCE_DIR/migration-before-application-release-order.md" <<EOF
# PR #158 migration-before-application release order

Exact integrated candidate: \`${INTEGRATED_SHA}\`

1. Freeze application deployment at the current production revision.
2. Apply, in order, \`20260726143000\`, \`20260726163500\`, \`20260726164500\`, \`20260726165500\`, and \`20260727050000\` from exact candidate \`${INTEGRATED_SHA}\`.
3. Verify all five migration-history rows, agreement completion fields, evidence/review tables, both atomic acceptance RPCs, and the matched/closed-offer bilateral-confirmation path.
4. Only after database verification, merge and deploy exact application candidate \`${INTEGRATED_SHA}\`.
5. Run signed-out and authenticated production smoke checks for offers, response acceptance, commitments, and the dealroom.
6. If any migration or verification fails, stop before application deployment and do not merge.

This gate only compiled the migrations in a transaction that was rolled back. It did not apply production migrations or deploy application code.
EOF

git fetch origin main "$PR_BRANCH"
test "$(git rev-parse origin/main)" = "$EXPECTED_MAIN_SHA"
test "$(git rev-parse "origin/$PR_BRANCH")" = "$EXPECTED_PR_HEAD"
test "$(git rev-parse HEAD)" = "$INTEGRATED_SHA"
git push origin HEAD:"$PR_BRANCH"

{
  echo "integrated_sha=$INTEGRATED_SHA"
  echo "main_sha=$EXPECTED_MAIN_SHA"
  echo "previous_pr_sha=$EXPECTED_PR_HEAD"
} > "$EVIDENCE_DIR/integrated-candidate.txt"
printf '%s\n' "$INTEGRATED_SHA" > "$GITHUB_WORKSPACE/integrated-sha-v2.txt"
echo "Pushed exact integrated candidate $INTEGRATED_SHA to $PR_BRANCH."
