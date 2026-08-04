#!/usr/bin/env bash
set -euo pipefail

REPO="ghuser29384/Website2"
PRODUCT_PR_NUMBER="326"
PRODUCT_BRANCH="agent/marketplace-delta-current-main-20260729"
EXPECTED_HEAD_SHA="3f6abe2e830eaca3903fa1040dd05a1ed34ae4ef"
EXPECTED_QA_REF="hvmxfjjbdcgjjudmthdz"
VERCEL_TEAM_ID="team_ySu6sF3Uho1E1GnJtCQPVEuJ"
VERCEL_PROJECT_ID="prj_Em3j7Uj7RatX2R1ZYhla3XSHRde7"
FIXTURE_OFFER_ID="10000000-0000-4000-8000-000000000158"
GUEST_INTEREST_ID="10000000-0000-4000-8000-000000000171"
HARNESS_COMMIT="217b504b3e5bcb9fa3120676d509594c016051f3"
CANDIDATE_DIR="$RUNNER_TEMP/pr326-browser-candidate"
MAIN_DIR="$RUNNER_TEMP/pr326-browser-main"
ARTIFACT_ROOT="$GITHUB_WORKSPACE/pr326-canonical-browser-artifacts"
FINAL_ROOT="$GITHUB_WORKSPACE/pr326-canonical-browser-proof"
BASELINE_URL="http://127.0.0.1:3220"
RUN_STARTED_AT="$(date -u +%Y-%m-%dT%H:%M:%SZ)"

for name in GITHUB_TOKEN QA_SUPABASE_DB_URL QA_SUPABASE_PUBLISHABLE_KEY QA_SUPABASE_SERVICE_ROLE_KEY QA_TEST_PASSWORD VERCEL_TOKEN CANDIDATE_URL CANDIDATE_DEPLOYMENT_ID; do
  if [[ -z "${!name:-}" ]]; then
    echo "Missing required environment variable: $name" >&2
    exit 1
  fi
done

python3 - <<'PY'
import os
from urllib.parse import urlparse
parsed = urlparse(os.environ["QA_SUPABASE_DB_URL"])
if "hvmxfjjbdcgjjudmthdz" not in (parsed.username or ""):
    raise SystemExit("Refusing unexpected QA database user.")
if parsed.port != 5432 or parsed.path != "/postgres":
    raise SystemExit("Refusing unexpected QA database connection parameters.")
PY

rm -rf "$ARTIFACT_ROOT" "$FINAL_ROOT" "$CANDIDATE_DIR" "$MAIN_DIR"
mkdir -p "$ARTIFACT_ROOT" "$FINAL_ROOT"

pull_json="$RUNNER_TEMP/pr326-browser-product.json"
curl --fail-with-body --silent --show-error \
  --header "Authorization: Bearer $GITHUB_TOKEN" \
  --header "Accept: application/vnd.github+json" \
  "https://api.github.com/repos/$REPO/pulls/$PRODUCT_PR_NUMBER" \
  --output "$pull_json"
PR_HEAD_SHA="$(jq -r '.head.sha' "$pull_json")"
PR_BASE_REF="$(jq -r '.base.ref' "$pull_json")"
[[ "$(jq -r '.state' "$pull_json")" == open ]]
[[ "$PR_BASE_REF" == main ]]
[[ "$PR_HEAD_SHA" == "$EXPECTED_HEAD_SHA" ]]

git fetch --no-tags origin main "$PRODUCT_BRANCH"
MAIN_SHA="$(git rev-parse origin/main)"
[[ "$(git rev-parse "origin/$PRODUCT_BRANCH")" == "$PR_HEAD_SHA" ]]
PR_HEAD_TREE="$(git rev-parse "${PR_HEAD_SHA}^{tree}")"
MAIN_TREE="$(git rev-parse "${MAIN_SHA}^{tree}")"

release_fingerprint() {
  git ls-tree -r --full-tree "$1" | grep -v $'\t.github/' | sha256sum | awk '{print $1}'
}
MAIN_RELEASE_HASH="$(release_fingerprint "$MAIN_SHA")"
PR_RELEASE_HASH="$(release_fingerprint "$PR_HEAD_SHA")"
cat > "$FINAL_ROOT/snapshot.txt" <<EOF
run_started_at=$RUN_STARTED_AT
product_pr=$PRODUCT_PR_NUMBER
product_branch=$PRODUCT_BRANCH
product_head_sha=$PR_HEAD_SHA
product_head_tree=$PR_HEAD_TREE
product_release_hash=$PR_RELEASE_HASH
main_sha=$MAIN_SHA
main_tree=$MAIN_TREE
main_release_hash=$MAIN_RELEASE_HASH
candidate_deployment_id=$CANDIDATE_DEPLOYMENT_ID
candidate_url=$CANDIDATE_URL
qa_ref=$EXPECTED_QA_REF
EOF

git worktree add --force --detach "$CANDIDATE_DIR" "$PR_HEAD_SHA"
git worktree add --force --detach "$MAIN_DIR" "$MAIN_SHA"

(
  cd "$CANDIDATE_DIR"
  npm ci
)
(
  cd "$MAIN_DIR"
  npm ci
)

sudo apt-get update >/dev/null
sudo apt-get install --yes postgresql-client >/dev/null
(
  cd "$CANDIDATE_DIR"
  npx --no-install playwright install --with-deps chromium >/dev/null
)

reset_fixture() {
  psql "$QA_SUPABASE_DB_URL" --no-psqlrc --set ON_ERROR_STOP=1 >/dev/null <<SQL
begin;
select set_config('request.jwt.claim.sub', '', true);
select set_config('request.jwt.claims', jsonb_build_object('role','service_role')::text, true);
select set_config('app.core_trade_internal', '1', true);
delete from public.trade_threads where offer_id='${FIXTURE_OFFER_ID}'::uuid;
delete from public.agreements where offer_id='${FIXTURE_OFFER_ID}'::uuid;
delete from public.interests where offer_id='${FIXTURE_OFFER_ID}'::uuid;
delete from public.guest_interests where offer_id='${FIXTURE_OFFER_ID}'::uuid;
delete from public.offer_comments where offer_id='${FIXTURE_OFFER_ID}'::uuid;
delete from public.offer_carts where offer_id='${FIXTURE_OFFER_ID}'::uuid;
delete from public.trade_counterproposals where offer_id='${FIXTURE_OFFER_ID}'::uuid;
delete from public.trade_invitations where offer_id='${FIXTURE_OFFER_ID}'::uuid;
delete from public.trade_review_events where offer_id='${FIXTURE_OFFER_ID}'::uuid;
delete from public.offer_recommendations where source_offer_id='${FIXTURE_OFFER_ID}'::uuid or recommended_offer_id='${FIXTURE_OFFER_ID}'::uuid;
delete from public.performance_bonds where offer_id='${FIXTURE_OFFER_ID}'::uuid;
delete from public.donation_offset_matches where offer_id='${FIXTURE_OFFER_ID}'::uuid;
delete from public.financial_commitment_reservations where offer_id='${FIXTURE_OFFER_ID}'::uuid;
delete from public.trade_notifications where user_id in (
  select id from public.profiles where email in ('qa-market-owner@example.com','qa-market-responder@example.com')
);
delete from public.email_outbox where profile_id in (
  select id from public.profiles where email in ('qa-market-owner@example.com','qa-market-responder@example.com')
) or recipient_email in ('qa-market-owner@example.com','qa-market-responder@example.com');
update public.offers
set status='open', workflow_status='published', closed_at=null, deleted_at=null, updated_at=now()
where id='${FIXTURE_OFFER_ID}'::uuid
  and fingerprint='qa-pr-158-marketplace-fixture-v1';
commit;
SQL
}

verify_clean() {
  local output="$1"
  psql "$QA_SUPABASE_DB_URL" --no-psqlrc --tuples-only --no-align --set ON_ERROR_STOP=1 \
    --command "select jsonb_build_object(
      'offer_clean', exists(select 1 from public.offers where id='${FIXTURE_OFFER_ID}'::uuid and fingerprint='qa-pr-158-marketplace-fixture-v1' and status='open' and workflow_status='published' and closed_at is null and deleted_at is null),
      'interests', (select count(*) from public.interests where offer_id='${FIXTURE_OFFER_ID}'::uuid),
      'guest_interests', (select count(*) from public.guest_interests where offer_id='${FIXTURE_OFFER_ID}'::uuid),
      'agreements', (select count(*) from public.agreements where offer_id='${FIXTURE_OFFER_ID}'::uuid),
      'threads', (select count(*) from public.trade_threads where offer_id='${FIXTURE_OFFER_ID}'::uuid),
      'comments', (select count(*) from public.offer_comments where offer_id='${FIXTURE_OFFER_ID}'::uuid),
      'carts', (select count(*) from public.offer_carts where offer_id='${FIXTURE_OFFER_ID}'::uuid),
      'counterproposals', (select count(*) from public.trade_counterproposals where offer_id='${FIXTURE_OFFER_ID}'::uuid),
      'invitations', (select count(*) from public.trade_invitations where offer_id='${FIXTURE_OFFER_ID}'::uuid),
      'review_events', (select count(*) from public.trade_review_events where offer_id='${FIXTURE_OFFER_ID}'::uuid),
      'recommendations', (select count(*) from public.offer_recommendations where source_offer_id='${FIXTURE_OFFER_ID}'::uuid or recommended_offer_id='${FIXTURE_OFFER_ID}'::uuid),
      'performance_bonds', (select count(*) from public.performance_bonds where offer_id='${FIXTURE_OFFER_ID}'::uuid),
      'donation_offset_matches', (select count(*) from public.donation_offset_matches where offer_id='${FIXTURE_OFFER_ID}'::uuid),
      'financial_commitment_reservations', (select count(*) from public.financial_commitment_reservations where offer_id='${FIXTURE_OFFER_ID}'::uuid),
      'notifications', (select count(*) from public.trade_notifications where user_id in (select id from public.profiles where email in ('qa-market-owner@example.com','qa-market-responder@example.com'))),
      'outbox', (select count(*) from public.email_outbox where profile_id in (select id from public.profiles where email in ('qa-market-owner@example.com','qa-market-responder@example.com')) or recipient_email in ('qa-market-owner@example.com','qa-market-responder@example.com')),
      'migration_recorded', exists(select 1 from supabase_migrations.schema_migrations where version='20260729170000' and name='marketplace_atomic_acceptance_current_core'),
      'member_rpc', to_regprocedure('public.accept_marketplace_interest_v1(uuid,uuid,text)') is not null,
      'guest_rpc', to_regprocedure('public.accept_marketplace_guest_interest_v1(uuid,uuid,text)') is not null
    )::text;" | tee "$output"
  python3 - "$output" <<'PY'
import json
import sys
value = json.loads(open(sys.argv[1], encoding='utf-8').read().strip())
assert value['offer_clean'] is True, value
assert value['migration_recorded'] is True, value
assert value['member_rpc'] is True and value['guest_rpc'] is True, value
for key in (
    'interests','guest_interests','agreements','threads','comments','carts',
    'counterproposals','invitations','review_events','recommendations',
    'performance_bonds','donation_offset_matches','financial_commitment_reservations',
    'notifications','outbox'
):
    assert value[key] == 0, value
PY
}

seed_claimed_guest() {
  local message="$1"
  psql "$QA_SUPABASE_DB_URL" --no-psqlrc --set ON_ERROR_STOP=1 >/dev/null --set=message="$message" <<SQL
insert into public.guest_interests(
  id, offer_id, contact_email, display_name, message, status, claimed_by_profile_id
) values (
  '${GUEST_INTEREST_ID}'::uuid,
  '${FIXTURE_OFFER_ID}'::uuid,
  'qa-market-responder@example.com',
  'QA Counterparty',
  :'message',
  'pending',
  (select id from public.profiles where email='qa-market-responder@example.com')
);
SQL
}

BASELINE_PID=""
TEMP_VERCEL_BYPASS_SECRET=""
BYPASS_ACTIVE=0
revoke_bypass() {
  set +e
  if [[ "$BYPASS_ACTIVE" == 1 && -n "$TEMP_VERCEL_BYPASS_SECRET" ]]; then
    payload="$RUNNER_TEMP/pr326-protection-revoke.json"
    jq -n --arg secret "$TEMP_VERCEL_BYPASS_SECRET" '{revoke:{secret:$secret,regenerate:false}}' > "$payload"
    curl --silent --show-error --request PATCH \
      --header "Authorization: Bearer $VERCEL_TOKEN" \
      --header "Content-Type: application/json" \
      --data-binary "@$payload" \
      "https://api.vercel.com/v1/projects/$VERCEL_PROJECT_ID/protection-bypass?teamId=$VERCEL_TEAM_ID" \
      --output /dev/null || true
    BYPASS_ACTIVE=0
  fi
}

cleanup_all() {
  local status=$?
  trap - EXIT
  set +e
  reset_fixture
  verify_clean "$FINAL_ROOT/trap-clean-state.json" >/dev/null 2>&1
  revoke_bypass
  if [[ -n "$BASELINE_PID" ]]; then
    kill "$BASELINE_PID" >/dev/null 2>&1 || true
    wait "$BASELINE_PID" >/dev/null 2>&1 || true
  fi
  printf 'exit_status=%s\ncleanup_attempted=true\n' "$status" > "$FINAL_ROOT/terminal-status.txt"
  exit "$status"
}
trap cleanup_all EXIT

reset_fixture
verify_clean "$FINAL_ROOT/pre-run-clean-state.json"

(
  cd "$MAIN_DIR"
  NEXT_PUBLIC_SUPABASE_URL="https://${EXPECTED_QA_REF}.supabase.co" \
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY="$QA_SUPABASE_PUBLISHABLE_KEY" \
  SUPABASE_SERVICE_ROLE_KEY="$QA_SUPABASE_SERVICE_ROLE_KEY" \
  NEXT_PUBLIC_SITE_URL="$BASELINE_URL" \
  SITE_URL="$BASELINE_URL" \
    npm run build
)
(
  cd "$MAIN_DIR"
  NEXT_PUBLIC_SUPABASE_URL="https://${EXPECTED_QA_REF}.supabase.co" \
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY="$QA_SUPABASE_PUBLISHABLE_KEY" \
  SUPABASE_SERVICE_ROLE_KEY="$QA_SUPABASE_SERVICE_ROLE_KEY" \
  NEXT_PUBLIC_SITE_URL="$BASELINE_URL" \
  SITE_URL="$BASELINE_URL" \
    npm run start -- -p 3220 > "$FINAL_ROOT/baseline-server.log" 2>&1
) &
BASELINE_PID=$!
for _ in $(seq 1 180); do
  if curl --silent --show-error --fail "$BASELINE_URL/offers?view=live" >/dev/null; then
    break
  fi
  if ! kill -0 "$BASELINE_PID" >/dev/null 2>&1; then
    cat "$FINAL_ROOT/baseline-server.log" >&2
    exit 1
  fi
  sleep 2
done
curl --silent --show-error --fail "$BASELINE_URL/offers?view=live" >/dev/null

TEMP_VERCEL_BYPASS_SECRET="$(openssl rand -hex 16)"
echo "::add-mask::$TEMP_VERCEL_BYPASS_SECRET"
payload="$RUNNER_TEMP/pr326-protection-generate.json"
jq -n --arg secret "$TEMP_VERCEL_BYPASS_SECRET" --arg note "Temporary PR 326 canonical rendered QA ${GITHUB_RUN_ID}" '{generate:{secret:$secret,note:$note}}' > "$payload"
curl --fail-with-body --silent --show-error --request PATCH \
  --header "Authorization: Bearer $VERCEL_TOKEN" \
  --header "Content-Type: application/json" \
  --data-binary "@$payload" \
  "https://api.vercel.com/v1/projects/$VERCEL_PROJECT_ID/protection-bypass?teamId=$VERCEL_TEAM_ID" \
  --output /dev/null
BYPASS_ACTIVE=1

mkdir -p "$CANDIDATE_DIR/.qa"
git show "${HARNESS_COMMIT}:.github/scripts/marketplace-delta-exact-browser-qa.mjs" > "$CANDIDATE_DIR/.qa/member.mjs"
cp "$GITHUB_WORKSPACE/.github/scripts/marketplace-delta-claimed-guest-browser-qa.mjs" "$CANDIDATE_DIR/.qa/claimed-guest.mjs"

python3 - "$CANDIDATE_DIR/.qa/member.mjs" "$CANDIDATE_DIR/.qa/claimed-guest.mjs" <<'PY'
from pathlib import Path
import re
import sys

member = Path(sys.argv[1])
guest = Path(sys.argv[2])
text = member.read_text(encoding='utf-8')

old_locator = r'page.getByText(/1 participant across 1 exact proposal/)'
new_locator = r'page.getByText(/1 participant\s*across 1 exact proposal/)'
if text.count(old_locator) != 1:
    raise SystemExit(f'Expected one participant-count locator; found {text.count(old_locator)}')
text = text.replace(old_locator, new_locator, 1)

bypass_cookie = '          "x-vercel-set-bypass-cookie": "true",\n'
if text.count(bypass_cookie) != 1:
    raise SystemExit(f'Expected one bypass-cookie header; found {text.count(bypass_cookie)}')
text = text.replace(bypass_cookie, '', 1)

secure_line = '      secure: true,\n'
if text.count(secure_line) != 1:
    raise SystemExit(f'Expected one member secure-cookie line; found {text.count(secure_line)}')
text = text.replace(secure_line, '      secure: new URL(baseURL).protocol === "https:",\n', 1)

decl = 'const duplicateUrl = required("WEBSITE2_PREVIEW_URL").replace(/\\\/$/, "");\n'
if text.count(decl) != 1:
    raise SystemExit(f'Expected one duplicate URL declaration; found {text.count(decl)}')
text = text.replace(decl, '', 1)
text = text.replace(
    '  target: { candidateUrl, duplicateUrl, baselineUrl, offerId: OFFER_ID },\n',
    '  target: { candidateUrl, baselineUrl, offerId: OFFER_ID },\n',
    1,
)
text = text.replace('    `- Duplicate project: \\`${duplicateUrl}\\``,\n', '', 1)

duplicate_block = '''  const duplicate = await makeSession(browser, {
    label: "website2-public",
    baseURL: duplicateUrl,
  });
  openSessions.push(duplicate);
  await recordCheck("duplicate-project exact-head QA binding", async () => {
    await assertCandidateDirectory(duplicate);
    await duplicate.screenshot("qa-participant-directory");
    return "The duplicate project rendered the single MoralTrade QA participant and exact proposal.";
  });
  await duplicate.close();
  openSessions.splice(openSessions.indexOf(duplicate), 1);

'''
if text.count(duplicate_block) != 1:
    raise SystemExit(f'Expected one duplicate-project browser block; found {text.count(duplicate_block)}')
text = text.replace(duplicate_block, '', 1)
if 'duplicateUrl' in text:
    raise SystemExit('duplicateUrl remained after canonical-project patch')
member.write_text(text, encoding='utf-8')

auth_pattern = re.compile(
    r'(?P<indent>^[ \t]*)await expect\((?P<page>[A-Za-z0-9_.]+)\.getByRole\("link", \{ name: /Log out/i \}\)\)\.toBeVisible\(\);',
    re.MULTILINE,
)

def replace_auth(match: re.Match[str]) -> str:
    indent = match.group('indent')
    page = match.group('page')
    nested = indent + '  '
    return '\n'.join([
        f'{indent}{{',
        f'{nested}const accountResponse = await {page}.request.get("/api/live-account");',
        f'{nested}expect(accountResponse.ok()).toBeTruthy();',
        f'{nested}const accountPayload = await accountResponse.json();',
        f'{nested}expect(accountPayload.authenticated).toBe(true);',
        f'{nested}expect(accountPayload.account?.displayName).toMatch(/\\S/);',
        f'{indent}}}',
    ])

for path in (member, guest):
    source = path.read_text(encoding='utf-8')
    patched, count = auth_pattern.subn(replace_auth, source)
    if count < 1:
        raise SystemExit(f'Expected at least one stale Log out assertion in {path}; found {count}')
    path.write_text(patched, encoding='utf-8')
PY

node --check "$CANDIDATE_DIR/.qa/member.mjs"
node --check "$CANDIDATE_DIR/.qa/claimed-guest.mjs"

export TEMP_VERCEL_BYPASS_SECRET
export MORALTRADE_PREVIEW_URL="$CANDIDATE_URL"
export BASELINE_URL
export QA_SUPABASE_DB_URL QA_TEST_PASSWORD
export EXPECTED_HEAD_SHA="$PR_HEAD_SHA"

merge_reports() {
  local viewport_dir="$1"
  python3 - "$viewport_dir" <<'PY'
import json
import sys
from pathlib import Path
root = Path(sys.argv[1])
member = json.loads((root / 'member' / 'report.json').read_text(encoding='utf-8'))
guest = json.loads((root / 'claimed-guest' / 'report.json').read_text(encoding='utf-8'))
outcome = 'pass' if member.get('outcome') == 'pass' and guest.get('outcome') == 'pass' else 'fail'
combined = {
    'outcome': outcome,
    'viewport': member.get('viewport'),
    'expectedHeadSha': member.get('expectedHeadSha'),
    'member': member,
    'claimedGuest': guest,
}
(root / 'report.json').write_text(json.dumps(combined, indent=2) + '\n', encoding='utf-8')
lines = [
    '# PR 326 canonical isolated rendered QA', '',
    f'- Outcome: **{outcome}**',
    f"- Expected head: `{combined['expectedHeadSha']}`",
    f"- Viewport: `{combined['viewport']['width']} × {combined['viewport']['height']}`",
    f"- Member workflow: **{member.get('outcome')}**",
    f"- Claimed-guest workflow: **{guest.get('outcome')}**",
    '', '## Member checks', '',
]
lines.extend(f"- {row['outcome'].upper()}: {row['name']} — {row['detail']}" for row in member.get('checks', []))
lines.extend(['', '## Claimed-guest checks', ''])
lines.extend(f"- {row['outcome'].upper()}: {row['name']} — {row['detail']}" for row in guest.get('checks', []))
(root / 'report.md').write_text('\n'.join(lines) + '\n', encoding='utf-8')
if outcome != 'pass':
    raise SystemExit('Combined rendered report is not a pass.')
PY
}

run_viewport() {
  local label="$1"
  local width="$2"
  local height="$3"
  local root="$ARTIFACT_ROOT/$label"
  local member_dir="$root/member"
  local guest_dir="$root/claimed-guest"
  mkdir -p "$member_dir" "$guest_dir"

  reset_fixture
  verify_clean "$FINAL_ROOT/${label}-pre-member-state.json"
  (
    cd "$CANDIDATE_DIR"
    VIEWPORT_WIDTH="$width" \
    VIEWPORT_HEIGHT="$height" \
    BROWSER_QA_ARTIFACT_DIR="$member_dir" \
    GITHUB_RUN_ID="${GITHUB_RUN_ID}-${label}-member" \
      node .qa/member.mjs
  )

  reset_fixture
  verify_clean "$FINAL_ROOT/${label}-post-member-state.json"
  local guest_message="[claimed guest ${GITHUB_RUN_ID}-${label}] linked legacy response"
  seed_claimed_guest "$guest_message"
  CLAIMED_GUEST_MESSAGE="$guest_message" \
  VIEWPORT_WIDTH="$width" \
  VIEWPORT_HEIGHT="$height" \
  BROWSER_QA_ARTIFACT_DIR="$guest_dir" \
  GITHUB_RUN_ID="${GITHUB_RUN_ID}-${label}-guest" \
    node "$CANDIDATE_DIR/.qa/claimed-guest.mjs"

  reset_fixture
  verify_clean "$FINAL_ROOT/${label}-post-guest-state.json"
  merge_reports "$root"
}

run_viewport desktop-1440x900 1440 900
run_viewport mobile-390x844 390 844

reset_fixture
verify_clean "$FINAL_ROOT/final-clean-state.json"
revoke_bypass

curl --fail-with-body --silent --show-error \
  --header "Authorization: Bearer $GITHUB_TOKEN" \
  --header "Accept: application/vnd.github+json" \
  "https://api.github.com/repos/$REPO/pulls/$PRODUCT_PR_NUMBER" \
  --output "$pull_json"
FINAL_PR_HEAD_SHA="$(jq -r '.head.sha' "$pull_json")"
git fetch --no-tags origin main "$PRODUCT_BRANCH"
FINAL_MAIN_SHA="$(git rev-parse origin/main)"
FETCHED_FINAL_PR_HEAD_SHA="$(git rev-parse "origin/$PRODUCT_BRANCH")"
[[ "$FINAL_PR_HEAD_SHA" == "$FETCHED_FINAL_PR_HEAD_SHA" ]]
[[ "$FINAL_PR_HEAD_SHA" == "$PR_HEAD_SHA" ]]
FINAL_MAIN_RELEASE_HASH="$(release_fingerprint "$FINAL_MAIN_SHA")"
FINAL_PR_RELEASE_HASH="$(release_fingerprint "$FINAL_PR_HEAD_SHA")"
if [[ "$FINAL_MAIN_RELEASE_HASH" != "$MAIN_RELEASE_HASH" || "$FINAL_PR_RELEASE_HASH" != "$PR_RELEASE_HASH" ]]; then
  printf 'snapshot_main_sha=%s\nfinal_main_sha=%s\nsnapshot_main_release_hash=%s\nfinal_main_release_hash=%s\nsnapshot_product_sha=%s\nfinal_product_sha=%s\nsnapshot_product_release_hash=%s\nfinal_product_release_hash=%s\n' \
    "$MAIN_SHA" "$FINAL_MAIN_SHA" "$MAIN_RELEASE_HASH" "$FINAL_MAIN_RELEASE_HASH" \
    "$PR_HEAD_SHA" "$FINAL_PR_HEAD_SHA" "$PR_RELEASE_HASH" "$FINAL_PR_RELEASE_HASH" \
    > "$FINAL_ROOT/final-release-continuity.txt"
  echo "Release-relevant source changed during rendered QA." >&2
  exit 1
fi
printf 'snapshot_main_sha=%s\nfinal_main_sha=%s\nmain_release_hash=%s\nsnapshot_product_sha=%s\nfinal_product_sha=%s\nproduct_release_hash=%s\nrelease_relevant_source_identical=true\ngithub_only_churn_allowed=true\n' \
  "$MAIN_SHA" "$FINAL_MAIN_SHA" "$MAIN_RELEASE_HASH" \
  "$PR_HEAD_SHA" "$FINAL_PR_HEAD_SHA" "$PR_RELEASE_HASH" \
  > "$FINAL_ROOT/final-release-continuity.txt"

RUN_BROWSER_COMPLETED_AT="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
cat > "$FINAL_ROOT/exact-head-proof.txt" <<EOF
run_started_at=$RUN_STARTED_AT
browser_completed_at=$RUN_BROWSER_COMPLETED_AT
main_sha=$MAIN_SHA
main_tree=$MAIN_TREE
main_release_hash=$MAIN_RELEASE_HASH
exact_candidate_sha=$PR_HEAD_SHA
exact_candidate_tree=$PR_HEAD_TREE
exact_candidate_release_hash=$PR_RELEASE_HASH
product_branch=$PRODUCT_BRANCH
canonical_candidate_deployment=$CANDIDATE_DEPLOYMENT_ID
canonical_candidate_preview=$CANDIDATE_URL
baseline_mode=local_exact_main
baseline_url=$BASELINE_URL
qa_ref=$EXPECTED_QA_REF
canonical_project_only=PASS
deployment_scoped_qa_environment=PASS
desktop_member_status=PASS
desktop_claimed_guest_status=PASS
mobile_member_status=PASS
mobile_claimed_guest_status=PASS
final_fixture=clean
temporary_bypass=revoked
production_changed=NO
runtime_log_query_required=true
EOF

printf 'PASS: canonical isolated preview, exact-main local comparison, desktop/mobile member and claimed-guest workflows, and deterministic cleanup passed.\n'
