#!/usr/bin/env bash

set -euo pipefail

if [[ -z "${MPGF_COMPACT_TEST_DB_URL:-}" ]]; then
  echo "MPGF_COMPACT_TEST_DB_URL is required." >&2
  exit 1
fi

work_dir="$(mktemp -d "${RUNNER_TEMP:-/tmp}/mpgf-compact-concurrency.XXXXXX")"
cleanup() {
  rm -rf "$work_dir"
}
trap cleanup EXIT

psql "$MPGF_COMPACT_TEST_DB_URL" --no-psqlrc --set ON_ERROR_STOP=1 <<'SQL'
update public.mpgf_public_goods_compacts
set activation_identity_gate_state = 'verified_person_unique_eligibility_policy'
where public_key = 'future-flourishing';

insert into auth.users (
  id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, confirmation_token, recovery_token,
  email_change_token_new, email_change_token_current, reauthentication_token,
  is_sso_user, is_anonymous, created_at, updated_at
)
select
  ('7a000000-0000-4000-8000-' || lpad(to_hex(sequence_number), 12, '0'))::uuid,
  '00000000-0000-0000-0000-000000000000'::uuid,
  'authenticated',
  'authenticated',
  'compact-concurrency-' || sequence_number || '@example.test',
  '',
  now(),
  '{}',
  '{}',
  '',
  '',
  '',
  '',
  '',
  false,
  false,
  now(),
  now()
from generate_series(1, 5001) as sequence_number;

insert into public.profiles (
  id, email, display_name, bio, affiliation, username, account_kind,
  accepts_group_invitations, public_invitation_mentions_enabled
)
select
  ('7a000000-0000-4000-8000-' || lpad(to_hex(sequence_number), 12, '0'))::uuid,
  'compact-concurrency-' || sequence_number || '@example.test',
  'Compact concurrency ' || sequence_number,
  '',
  '',
  'compactconcurrency' || sequence_number,
  'individual',
  true,
  true
from generate_series(1, 5001) as sequence_number;

insert into public.mpgf_public_goods_compact_memberships (
  compact_id,
  user_id,
  profile_id,
  constitution_version_accepted,
  acknowledgements,
  declared_eligible_monthly_spending_cents,
  scheduled_monthly_contribution_cents,
  status,
  accepted_at,
  revoked_at
)
select
  '10000000-0000-4000-8000-000000000001'::uuid,
  ('7a000000-0000-4000-8000-' || lpad(to_hex(sequence_number), 12, '0'))::uuid,
  ('7a000000-0000-4000-8000-' || lpad(to_hex(sequence_number), 12, '0'))::uuid,
  'mpgf-public-goods-compact/founding-v1',
  '{"voluntaryChoice":true,"exactConstitution":true,"activationAndNoProjectOptOut":true,"noPaymentMandate":true}'::jsonb,
  100,
  1,
  case when sequence_number = 4999 then 'revoked' else 'pending_activation' end,
  statement_timestamp(),
  case when sequence_number = 4999 then statement_timestamp() else null end
from generate_series(1, 4999) as sequence_number;

update public.mpgf_public_goods_compacts
set accepted_member_count = 4998
where public_key = 'future-flourishing';
SQL

# Hold the compact row lock long enough for both independent join sessions to block on it. When
# this transaction releases the lock, the RPCs must serialize without double activation.
psql "$MPGF_COMPACT_TEST_DB_URL" --no-psqlrc --set ON_ERROR_STOP=1 \
  >"$work_dir/blocker.log" 2>&1 <<'SQL' &
begin;
select id
from public.mpgf_public_goods_compacts
where public_key = 'future-flourishing'
for update;
select pg_sleep(3);
commit;
SQL
blocker_pid=$!

sleep 1

run_join() {
  local user_id="$1"
  local idempotency_key="$2"
  local output_path="$3"

  psql "$MPGF_COMPACT_TEST_DB_URL" \
    --no-psqlrc \
    --tuples-only \
    --no-align \
    --set ON_ERROR_STOP=1 \
    --set user_id="$user_id" \
    --set idempotency_key="$idempotency_key" \
    >"$output_path" <<'SQL'
begin;
set local role authenticated;
select set_config('request.jwt.claim.sub', :'user_id', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
select public.join_mpgf_public_goods_compact(
  'future-flourishing',
  'mpgf-public-goods-compact/founding-v1',
  100,
  '{"voluntaryChoice":true,"exactConstitution":true,"activationAndNoProjectOptOut":true,"noPaymentMandate":true}'::jsonb,
  :'idempotency_key'
);
commit;
SQL
}

run_join \
  "7a000000-0000-4000-8000-000000001388" \
  "qa.concurrent.join.5000" \
  "$work_dir/join-5000.json" &
join_5000_pid=$!

run_join \
  "7a000000-0000-4000-8000-000000001389" \
  "qa.concurrent.join.5001" \
  "$work_dir/join-5001.json" &
join_5001_pid=$!

wait "$join_5000_pid"
wait "$join_5001_pid"
wait "$blocker_pid"

activated_responses="$({ grep -c '"activatedNow": true' "$work_dir/join-5000.json" || true; grep -c '"activatedNow": true' "$work_dir/join-5001.json" || true; } | awk '{ total += $1 } END { print total + 0 }')"
if [[ "$activated_responses" != "1" ]]; then
  echo "Expected exactly one concurrent join response to report activation; observed $activated_responses." >&2
  exit 1
fi

psql "$MPGF_COMPACT_TEST_DB_URL" --no-psqlrc --set ON_ERROR_STOP=1 <<'SQL'
do $test$
declare
  compact_record public.mpgf_public_goods_compacts%rowtype;
begin
  select * into compact_record
  from public.mpgf_public_goods_compacts
  where public_key = 'future-flourishing';

  if compact_record.status <> 'active'
    or compact_record.accepted_member_count <> 5000
    or compact_record.activated_at is null
    or compact_record.constitution_frozen_at is distinct from compact_record.activated_at
    or compact_record.frozen_constitution_version is distinct from compact_record.constitution_version
  then
    raise exception 'Concurrent threshold joins did not activate exactly once at 5,000.';
  end if;

  if (select count(*)
      from public.mpgf_public_goods_compact_memberships
      where compact_id = compact_record.id
        and status = 'active'
        and activated_at is not distinct from compact_record.activated_at) <> 5000 then
    raise exception 'Qualifying pending memberships did not receive one shared activation timestamp.';
  end if;

  if (select count(*)
      from public.mpgf_public_goods_compact_memberships
      where compact_id = compact_record.id
        and status = 'revoked'
        and activated_at is null) <> 1 then
    raise exception 'Revoked recruiting membership was counted or activated.';
  end if;
end;
$test$;

select 'Genuinely concurrent 4,998 + 2 join activation passed exactly once.' as result;
SQL
