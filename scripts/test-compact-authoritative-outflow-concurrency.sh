#!/usr/bin/env bash
set -euo pipefail

: "${COMPACT_OUTFLOW_TEST_DB_URL:?COMPACT_OUTFLOW_TEST_DB_URL is required}"
workdir="$(mktemp -d)"
trap 'rm -rf "$workdir"' EXIT

psql "$COMPACT_OUTFLOW_TEST_DB_URL" --no-psqlrc --set ON_ERROR_STOP=1 <<'SQL'
insert into auth.users (
  id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, confirmation_token, recovery_token,
  email_change_token_new, email_change_token_current, reauthentication_token,
  is_sso_user, is_anonymous, created_at, updated_at
) values (
  '6d000000-0000-4000-8000-000000000001','00000000-0000-0000-0000-000000000000',
  'authenticated','authenticated','ledger-concurrency@example.test','',now(),'{}','{}','','','','','',false,false,now(),now()
);
insert into public.profiles (
  id, email, display_name, bio, affiliation, username, account_kind,
  accepts_group_invitations, public_invitation_mentions_enabled
) values (
  '6d000000-0000-4000-8000-000000000001','ledger-concurrency@example.test',
  'Ledger Concurrency','','','ledger-concurrency','individual',true,true
);
set role service_role;
select pg_catalog.set_config('request.jwt.claims','{"role":"service_role"}',false);
with batch as (
  select moral_trade_private.compact_outflow_ingest_batch_v1(
    '6d000000-0000-4000-8000-000000000001','2026-08','qa','USD',
    'compact-authoritative-outflow-ledger/v1','qa.ledger.concurrent.batch'
  ) as id
)
select moral_trade_private.freeze_compact_outflow_coverage_v1(
  batch.id,'complete','Complete synthetic zero coverage for concurrency.',
  '2026-08-01T00:00:00Z',
  '[{"adapter_key":"qa_authoritative_synthetic","disposition":"complete","source_watermark":"qa:concurrency","evidence_hash":"sha256:1212121212121212121212121212121212121212121212121212121212121212"}]'::jsonb,
  'qa.ledger.concurrent.coverage'
) from batch;
reset role;
SQL

cat > "$workdir/freeze.sql" <<'SQL'
\set ON_ERROR_STOP on
set role service_role;
select pg_catalog.set_config('request.jwt.claims','{"role":"service_role"}',false);
select public.freeze_mpgf_public_goods_financial_cycle_v2(
  '6d000000-0000-4000-8000-000000000001','2026-08'
);
SQL

psql "$COMPACT_OUTFLOW_TEST_DB_URL" --no-psqlrc --file "$workdir/freeze.sql" > "$workdir/a.log" 2>&1 &
pid_a=$!
psql "$COMPACT_OUTFLOW_TEST_DB_URL" --no-psqlrc --file "$workdir/freeze.sql" > "$workdir/b.log" 2>&1 &
pid_b=$!
wait "$pid_a"
wait "$pid_b"

cat "$workdir/a.log"
cat "$workdir/b.log"

count="$(psql "$COMPACT_OUTFLOW_TEST_DB_URL" --no-psqlrc --tuples-only --no-align --set ON_ERROR_STOP=1 \
  --command "select count(*) from public.mpgf_public_goods_obligation_snapshots where participant_id='6d000000-0000-4000-8000-000000000001' and cycle_key='2026-08' and state='calculated';")"
if [[ "$count" != "1" ]]; then
  echo "Expected one canonical obligation snapshot after concurrent freeze; found $count" >&2
  exit 1
fi

echo "concurrent_freeze_canonical_snapshot_count=$count"
