#!/usr/bin/env bash
set -euo pipefail

: "${TARGET_BRANCH:=agent/marketplace-delta-current-main-20260729}"
: "${HISTORICAL_BRANCH:=agent/dynamic-marketplace-clearing-rounds}"
: "${EXPECTED_QA_REF:=hvmxfjjbdcgjjudmthdz}"
: "${EXPECTED_PROD_REF:=jnpoxvalyjtdghnperyu}"
: "${MIGRATION_VERSION:=20260729170000}"
: "${MIGRATION_NAME:=marketplace_atomic_acceptance_current_core}"

for name in QA_SUPABASE_DB_URL PROD_SUPABASE_DB_URL; do
  if [[ -z "${!name:-}" ]]; then
    echo "Missing required secret: $name" >&2
    exit 1
  fi
done

cp .github/scripts/materialize-marketplace-delta.py "$RUNNER_TEMP/materialize-marketplace-delta.py"

python3 - <<'PY'
import os
from pathlib import Path

path = Path(os.environ["RUNNER_TEMP"]) / "materialize-marketplace-delta.py"
source = path.read_text(encoding="utf-8")

replacements = {
    '''    source = replace_between(
        source,
        "function LiveProposalCard({ offer }: { offer: OfferRow }) {",
        "export default async function OffersPage",
        "export default async function OffersPage",
        "legacy one-card-per-offer component",
    )''': '''    source = replace_between(
        source,
        "function LiveProposalCard({ offer }: { offer: OfferRow }) {",
        "export default async function OffersPage",
        "",
        "legacy one-card-per-offer component",
    )''',
    '''    source = replace_once(
        source,
        'import { MarketplaceBottomNav,\\n',
        'import { OfferQuestionForm } from "@/components/marketplace/offer-question-form";\\n'
        'import { MarketplaceBottomNav,\\n',
        "question form component import",
    )''': '''    source = replace_once(
        source,
        'import {\\n  CommitmentSheet,\\n',
        'import { OfferQuestionForm } from "@/components/marketplace/offer-question-form";\\n\\n'
        'import {\\n  CommitmentSheet,\\n',
        "question form component import",
    )''',
}
for old, new in replacements.items():
    if source.count(old) != 1:
        raise SystemExit(f"Expected one materializer marker; found {source.count(old)}.")
    source = source.replace(old, new, 1)

start = source.index("def extract_latest_function(function_name: str) -> tuple[Path, str]:")
end = source.index("\n\ndef write_audit() -> None:", start)
robust = r'''def extract_latest_function(function_name: str) -> tuple[Path, str]:
    marker = f"create or replace function public.{function_name}("
    latest: tuple[Path, str] | None = None
    for path in sorted((ROOT / "supabase/migrations").glob("*.sql")):
        source = path.read_text(encoding="utf-8")
        cursor = 0
        while True:
            start = source.find(marker, cursor)
            if start < 0:
                break
            tag_match = re.search(
                r"\bas\s+(\$[A-Za-z_][A-Za-z0-9_]*\$|\$\$)",
                source[start:],
                flags=re.IGNORECASE,
            )
            if tag_match is None:
                cursor = start + len(marker)
                continue
            tag = tag_match.group(1)
            body_start = start + tag_match.end()
            end_marker = f"\n{tag};"
            end = source.find(end_marker, body_start)
            if end < 0:
                raise RuntimeError(
                    f"Could not find closing {tag} for {function_name} in {path}."
                )
            end += len(end_marker)
            latest = (path, source[start:end])
            cursor = end
    if latest is None:
        raise RuntimeError(f"No migration defines {function_name}.")
    return latest
'''
source = source[:start] + robust + source[end:]
path.write_text(source, encoding="utf-8")
PY

git config user.name "ghuser29384"
git config user.email "262476329+ghuser29384@users.noreply.github.com"
git fetch origin main "$TARGET_BRANCH" "$HISTORICAL_BRANCH"
target_head="$(git rev-parse "origin/$TARGET_BRANCH")"
main_head="$(git rev-parse origin/main)"
if ! git merge-base --is-ancestor "$target_head" "$main_head"; then
  echo "Refusing to overwrite a product branch that is not an ancestor of current main." >&2
  echo "target=$target_head main=$main_head" >&2
  exit 1
fi

git checkout -B "$TARGET_BRANCH" origin/main
export BASE_MAIN_SHA="$main_head"
export HISTORICAL_PR158_SHA="$(git rev-parse "origin/$HISTORICAL_BRANCH")"

echo "Materializing candidate on current main $BASE_MAIN_SHA"
python3 "$RUNNER_TEMP/materialize-marketplace-delta.py"

python3 - <<'PY'
from pathlib import Path

path = Path("src/app/offers/[offerId]/page.tsx")
source = path.read_text(encoding="utf-8")
old = '''          </div>

          {viewer ? (
            <OfferQuestionForm
'''
new = '''          </div>

          {questionResetToken ? (
            <div className="status-banner status-banner-success" role="status">
              Question posted.
            </div>
          ) : null}

          {viewer ? (
            <OfferQuestionForm
'''
if source.count(old) != 1:
    raise SystemExit(f"Expected one anchored question form marker; found {source.count(old)}.")
path.write_text(source.replace(old, new, 1), encoding="utf-8")
PY

npm ci
node --import tsx --test \
  src/lib/marketplace-participant-groups.test.ts \
  src/lib/marketplace-delta-contract.test.ts
npm test
npm run lint
npx tsc --noEmit
npm run build
git diff --check

python3 - <<'PY'
import os
from urllib.parse import urlparse

for url_name, ref_name in (
    ("QA_SUPABASE_DB_URL", "EXPECTED_QA_REF"),
    ("PROD_SUPABASE_DB_URL", "EXPECTED_PROD_REF"),
):
    parsed = urlparse(os.environ[url_name])
    expected = os.environ[ref_name]
    if expected not in (parsed.username or ""):
        raise SystemExit(f"Refusing {url_name}: user does not contain {expected}.")
    if parsed.port != 5432 or parsed.path != "/postgres":
        raise SystemExit(f"Refusing unexpected connection parameters for {url_name}.")
PY

sudo apt-get update
sudo apt-get install --yes postgresql-client

snapshot_sql="$RUNNER_TEMP/production-contract-snapshot.sql"
cat > "$snapshot_sql" <<'SQL'
select jsonb_build_object(
  'member_rpc', to_regprocedure('public.accept_marketplace_interest_v1(uuid,uuid,text)')::text,
  'guest_rpc', to_regprocedure('public.accept_marketplace_guest_interest_v1(uuid,uuid,text)')::text,
  'confirm_hash', (
    select md5(pg_get_functiondef(p.oid))
    from pg_proc p
    join pg_namespace n on n.oid=p.pronamespace
    where n.nspname='public'
      and p.oid='public.confirm_agreement_version_v2(uuid,uuid,uuid)'::regprocedure
  ),
  'migration_recorded', exists(
    select 1 from supabase_migrations.schema_migrations
    where version='20260729170000'
  )
)::text;
SQL

before="$RUNNER_TEMP/production-contract-before.txt"
after="$RUNNER_TEMP/production-contract-after.txt"
psql "$PROD_SUPABASE_DB_URL" --no-psqlrc --tuples-only --no-align \
  --set ON_ERROR_STOP=1 --file "$snapshot_sql" > "$before"

compile_sql="$RUNNER_TEMP/compile-marketplace-delta.sql"
cat > "$compile_sql" <<'SQL'
begin;
\i supabase/migrations/20260729170000_marketplace_atomic_acceptance_current_core.sql
do $verification$
begin
  if to_regprocedure('public.accept_marketplace_interest_v1(uuid,uuid,text)') is null then
    raise exception 'member atomic acceptance RPC missing after migration compile';
  end if;
  if to_regprocedure('public.accept_marketplace_guest_interest_v1(uuid,uuid,text)') is null then
    raise exception 'guest atomic acceptance RPC missing after migration compile';
  end if;
  if to_regprocedure('public.confirm_agreement_version_v2(uuid,uuid,uuid)') is null then
    raise exception 'canonical bilateral confirmation RPC missing after migration compile';
  end if;
  if to_regclass('public.trade_agreement_versions') is null
     or to_regclass('public.trade_agreement_confirmations') is null
     or to_regclass('public.trade_evidence_items') is null then
    raise exception 'current core-trade schema is incomplete';
  end if;
  if exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='agreements' and column_name='completion_state'
  ) then
    raise exception 'candidate unexpectedly depends on completion_state';
  end if;
end;
$verification$;
rollback;
SQL
psql "$PROD_SUPABASE_DB_URL" --no-psqlrc --set ON_ERROR_STOP=1 \
  --file "$compile_sql" | tee "$RUNNER_TEMP/production-compile.log"
psql "$PROD_SUPABASE_DB_URL" --no-psqlrc --tuples-only --no-align \
  --set ON_ERROR_STOP=1 --file "$snapshot_sql" > "$after"
diff --unified "$before" "$after"
echo "PASS: candidate migration compiled against production and left no schema residue." \
  > "$RUNNER_TEMP/production-rollback-result.txt"

migration="supabase/migrations/${MIGRATION_VERSION}_${MIGRATION_NAME}.sql"
migration_sha="$(sha256sum "$migration" | cut -d' ' -f1)"
recorded="$(psql "$QA_SUPABASE_DB_URL" --no-psqlrc --tuples-only --no-align \
  --set ON_ERROR_STOP=1 \
  --command "select exists(select 1 from supabase_migrations.schema_migrations where version='${MIGRATION_VERSION}');")"
if [[ "$recorded" = "f" ]]; then
  apply_file="$RUNNER_TEMP/apply-marketplace-delta.sql"
  cat "$migration" > "$apply_file"
  cat >> "$apply_file" <<SQL

insert into supabase_migrations.schema_migrations(
  version, statements, name, created_by, idempotency_key
) values (
  '${MIGRATION_VERSION}',
  array['Applied from current-main marketplace delta based on ${BASE_MAIN_SHA}; sha256 ${migration_sha}'],
  '${MIGRATION_NAME}',
  'github-actions-marketplace-delta',
  'marketplace-delta-${MIGRATION_VERSION}-${migration_sha}'
);
SQL
  psql "$QA_SUPABASE_DB_URL" --no-psqlrc --set ON_ERROR_STOP=1 \
    --single-transaction --file "$apply_file"
fi

qa_contract="$(psql "$QA_SUPABASE_DB_URL" --no-psqlrc --tuples-only --no-align \
  --set ON_ERROR_STOP=1 --command "select case when to_regprocedure('public.accept_marketplace_interest_v1(uuid,uuid,text)') is null then 'FAIL:member_rpc' when to_regprocedure('public.accept_marketplace_guest_interest_v1(uuid,uuid,text)') is null then 'FAIL:guest_rpc' when to_regprocedure('public.confirm_agreement_version_v2(uuid,uuid,uuid)') is null then 'FAIL:confirm_rpc' when not exists(select 1 from supabase_migrations.schema_migrations where version='20260729170000' and name='marketplace_atomic_acceptance_current_core') then 'FAIL:migration_history' else 'PASS' end;")"
test "$(echo "$qa_contract" | tr -d '[:space:]')" = "PASS"

psql "$QA_SUPABASE_DB_URL" --no-psqlrc --set ON_ERROR_STOP=1 \
  --file supabase/tests/marketplace_atomic_acceptance_current_core.sql \
  | tee "$RUNNER_TEMP/qa-regression.log"
grep -Fq \
  "PASS: member and claimed-guest acceptance are atomic on the existing core-trade schema" \
  "$RUNNER_TEMP/qa-regression.log"

final_state="$(psql "$QA_SUPABASE_DB_URL" --no-psqlrc --tuples-only --no-align \
  --set ON_ERROR_STOP=1 --command "select case when not exists(select 1 from public.offers where id='10000000-0000-4000-8000-000000000158'::uuid and fingerprint='qa-pr-158-marketplace-fixture-v1' and status='open' and workflow_status='published' and closed_at is null and deleted_at is null) then 'FAIL:offer' when exists(select 1 from public.interests where offer_id='10000000-0000-4000-8000-000000000158'::uuid) then 'FAIL:interests' when exists(select 1 from public.guest_interests where offer_id='10000000-0000-4000-8000-000000000158'::uuid) then 'FAIL:guest_interests' when exists(select 1 from public.agreements where offer_id='10000000-0000-4000-8000-000000000158'::uuid) then 'FAIL:agreements' when exists(select 1 from public.trade_threads where offer_id='10000000-0000-4000-8000-000000000158'::uuid) then 'FAIL:threads' else 'PASS' end;")"
test "$(echo "$final_state" | tr -d '[:space:]')" = "PASS"

git add \
  docs/marketplace-pr158-delta-audit.md \
  src/app/actions.ts \
  src/app/offer-question-actions.ts \
  'src/app/offers/[offerId]/page.tsx' \
  src/app/offers/page.tsx \
  src/components/community/comment-thread.tsx \
  src/components/marketplace/offer-question-form.tsx \
  src/components/marketplace/participant-offer-group.module.css \
  src/components/marketplace/participant-offer-group.tsx \
  src/lib/marketplace-delta-contract.test.ts \
  src/lib/marketplace-participant-groups.test.ts \
  src/lib/marketplace-participant-groups.ts \
  "supabase/migrations/${MIGRATION_VERSION}_${MIGRATION_NAME}.sql" \
  supabase/tests/marketplace_atomic_acceptance_current_core.sql

git commit -m "Materialize the current-main marketplace delta"
git push origin HEAD:"$TARGET_BRANCH"
export FINAL_SHA="$(git rev-parse HEAD)"

cat > marketplace-delta-validation.txt <<EOF
base_main_sha=${BASE_MAIN_SHA}
historical_pr158_sha=${HISTORICAL_PR158_SHA}
candidate_sha=${FINAL_SHA}
complete_tests=PASS
eslint=PASS
typescript=PASS
production_build=PASS
production_migration_compile_and_rollback=PASS
qa_atomic_member_and_guest_regression=PASS
qa_fixture_clean=PASS
production_changed=NO
EOF
cp "$RUNNER_TEMP/production-rollback-result.txt" production-rollback-result.txt

echo "Candidate pushed at $FINAL_SHA"
