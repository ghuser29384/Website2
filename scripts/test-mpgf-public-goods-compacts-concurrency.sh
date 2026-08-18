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

# Build one exact threshold snapshot: 100 unique synthetic people, each with a complete
# sole-Compact allocation, a valid dormant authorization, and $5 scheduled. This database is an
# ephemeral CI runtime and is erased after the job; no provider or payment object is created.
psql "$MPGF_COMPACT_TEST_DB_URL" --no-psqlrc --set ON_ERROR_STOP=1 <<'SQL'
insert into auth.users (
  id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, confirmation_token, recovery_token,
  email_change_token_new, email_change_token_current, reauthentication_token,
  is_sso_user, is_anonymous, created_at, updated_at
)
select
  ('7a000000-0000-4000-8000-' || lpad(to_hex(person), 12, '0'))::uuid,
  '00000000-0000-0000-0000-000000000000'::uuid,
  'authenticated', 'authenticated', 'compact-concurrency-' || person || '@example.test',
  '', now(), '{}', '{}', '', '', '', '', '', false, false, now(), now()
from generate_series(1, 100) as person;

insert into public.profiles (
  id, email, display_name, bio, affiliation, username, account_kind,
  accepts_group_invitations, public_invitation_mentions_enabled
)
select
  ('7a000000-0000-4000-8000-' || lpad(to_hex(person), 12, '0'))::uuid,
  'compact-concurrency-' || person || '@example.test',
  'Compact concurrency ' || person, '', '', 'compactconcurrency' || person,
  'individual', true, true
from generate_series(1, 100) as person
on conflict (id) do update
set email = excluded.email,
    display_name = excluded.display_name,
    bio = excluded.bio,
    affiliation = excluded.affiliation,
    username = excluded.username,
    account_kind = excluded.account_kind,
    accepts_group_invitations = excluded.accepts_group_invitations,
    public_invitation_mentions_enabled = excluded.public_invitation_mentions_enabled;

insert into public.moral_trade_policy_snapshots (
  id, subject_kind, subject_key, version_label, status, snapshot_hash,
  snapshot_payload, approved_at, immutable_after
) values (
  '7f000000-0000-4000-8000-000000000001', 'participant_eligibility',
  'compact-v2-concurrency', 'compact-v2-concurrency', 'immutable',
  'sha256:7777777777777777777777777777777777777777777777777777777777777777',
  '{"qaSynthetic":true}', now(), now()
);

insert into public.moral_trade_participant_eligibility_records (
  participant_id, status, identity_verification_status, human_uniqueness_sybil_status,
  legal_capacity_status, sanctions_screening_status, payment_rail_eligibility_status,
  jurisdictional_eligibility_status, source_authentication_status,
  raw_identity_artifact_handling_status, policy_snapshot_id, eligibility_hash,
  evidence_bundle_hash, reviewed_at, expires_at
)
select profile.id, 'eligible', 'eligible', 'eligible', 'eligible', 'eligible', 'eligible',
  'eligible', 'eligible', 'eligible', '7f000000-0000-4000-8000-000000000001',
  'sha256:' || public.mpgf_public_goods_hash_v2(jsonb_build_object('eligibility', profile.id)),
  'sha256:' || public.mpgf_public_goods_hash_v2(jsonb_build_object('evidence', profile.id)),
  now(), now() + interval '2 months'
from public.profiles as profile
where profile.email like 'compact-concurrency-%@example.test';

insert into public.mpgf_public_goods_compact_memberships (
  compact_id, participant_id, constitution_version_accepted, acknowledgements
)
select '10000000-0000-4000-8000-000000000001', profile.id,
  'mpgf-public-goods-compact/transaction-v2',
  '{"voluntaryChoice":true,"exactConstitution":true,"activationAndNoProjectOptOut":true,"noPaymentMandate":true}'
from public.profiles as profile
where profile.email like 'compact-concurrency-%@example.test';

insert into public.mpgf_public_goods_outflow_coverage_snapshots (
  participant_id, cycle_key, period_start, period_end_exclusive, coverage_status,
  coverage_reason, source_scope, source_coverage_attested, evidence_hash
)
select profile.id, '2099-01', bounds.period_start, bounds.period_end_exclusive, 'complete',
  'Ephemeral concurrent readiness fixture', array['qa_ephemeral_authoritative'], true,
  'sha256:' || public.mpgf_public_goods_hash_v2(jsonb_build_object('coverage', profile.id))
from public.profiles as profile
cross join public.mpgf_public_goods_cycle_bounds_v2('2099-01') as bounds
where profile.email like 'compact-concurrency-%@example.test';

insert into public.mpgf_public_goods_obligation_snapshots (
  participant_id, cycle_key, coverage_snapshot_id, state,
  eligible_net_settled_outflow_cents, obligation_cents,
  source_observation_count, snapshot_hash
)
select coverage.participant_id, coverage.cycle_key, coverage.id, 'calculated',
  5000, 500, 1,
  'sha256:' || public.mpgf_public_goods_hash_v2(jsonb_build_object('obligation', coverage.participant_id))
from public.mpgf_public_goods_outflow_coverage_snapshots as coverage
join public.profiles as profile on profile.id = coverage.participant_id
where profile.email like 'compact-concurrency-%@example.test';

insert into public.mpgf_public_goods_allocation_instructions (
  participant_id, cycle_key, constitution_version, basis_points_total, instruction_hash
)
select profile.id, '2099-01', 'mpgf-public-goods-compact/transaction-v2', 10000,
  'sha256:' || public.mpgf_public_goods_hash_v2(jsonb_build_object('allocation', profile.id))
from public.profiles as profile
where profile.email like 'compact-concurrency-%@example.test';

insert into public.mpgf_public_goods_allocation_instruction_lines (
  instruction_id, membership_id, compact_id, allocation_bps, stable_compact_key
)
select instruction.id, membership.id, membership.compact_id, 10000, 'future-flourishing'
from public.mpgf_public_goods_allocation_instructions as instruction
join public.mpgf_public_goods_compact_memberships as membership
  on membership.participant_id = instruction.participant_id
join public.profiles as profile on profile.id = instruction.participant_id
where profile.email like 'compact-concurrency-%@example.test';

insert into public.mpgf_public_goods_dormant_authorization_snapshots (
  participant_id, cycle_key, state, provider_reference_hash, authorized_at,
  expires_at, evidence_hash
)
select profile.id, '2099-01', 'valid',
  'sha256:' || public.mpgf_public_goods_hash_v2(jsonb_build_object('provider', profile.id)),
  now(), now() + interval '2 months',
  'sha256:' || public.mpgf_public_goods_hash_v2(jsonb_build_object('authorization', profile.id))
from public.profiles as profile
where profile.email like 'compact-concurrency-%@example.test';

insert into public.mpgf_public_goods_scheduled_amount_snapshots (
  obligation_snapshot_id, allocation_instruction_id, participant_id, cycle_key,
  membership_id, compact_id, allocation_bps, scheduled_contribution_cents,
  remainder_numerator, largest_remainder_rank, snapshot_hash
)
select obligation.id, instruction.id, membership.participant_id, '2099-01',
  membership.id, membership.compact_id, 10000, 500, 0, 1,
  'sha256:' || public.mpgf_public_goods_hash_v2(jsonb_build_object('schedule', membership.participant_id))
from public.mpgf_public_goods_compact_memberships as membership
join public.profiles as profile on profile.id = membership.participant_id
join public.mpgf_public_goods_obligation_snapshots as obligation
  on obligation.participant_id = membership.participant_id and obligation.cycle_key = '2099-01'
join public.mpgf_public_goods_allocation_instructions as instruction
  on instruction.participant_id = membership.participant_id and instruction.cycle_key = '2099-01'
where profile.email like 'compact-concurrency-%@example.test';

insert into public.mpgf_public_goods_funding_qualification_snapshots (
  participant_id, cycle_key, membership_id, compact_id,
  identity_eligibility_record_id, allocation_instruction_id, scheduled_amount_snapshot_id,
  dormant_authorization_snapshot_id, identity_qualified, unique_person_gate_state,
  unique_person_key_hash, allocation_valid, scheduled_contribution_cents,
  qualification_state, snapshot_hash
)
select membership.participant_id, '2099-01', membership.id, membership.compact_id,
  eligibility.id, instruction.id, schedule.id, auth_snapshot.id, true,
  'verified_unique_person',
  'sha256:' || public.mpgf_public_goods_hash_v2(jsonb_build_object('person', membership.participant_id)),
  true, 500, 'scheduled_qualified',
  'sha256:' || public.mpgf_public_goods_hash_v2(jsonb_build_object('qualified', membership.participant_id))
from public.mpgf_public_goods_compact_memberships as membership
join public.profiles as profile on profile.id = membership.participant_id
join public.moral_trade_participant_eligibility_records as eligibility
  on eligibility.participant_id = membership.participant_id
join public.mpgf_public_goods_allocation_instructions as instruction
  on instruction.participant_id = membership.participant_id and instruction.cycle_key = '2099-01'
join public.mpgf_public_goods_scheduled_amount_snapshots as schedule
  on schedule.membership_id = membership.id and schedule.cycle_key = '2099-01'
join public.mpgf_public_goods_dormant_authorization_snapshots as auth_snapshot
  on auth_snapshot.participant_id = membership.participant_id and auth_snapshot.cycle_key = '2099-01'
where profile.email like 'compact-concurrency-%@example.test';
SQL

# Hold the exact advisory lock long enough for both independent sessions to queue. Each freeze
# must then resolve to the same immutable source-bound readiness snapshot.
psql "$MPGF_COMPACT_TEST_DB_URL" --no-psqlrc --set ON_ERROR_STOP=1 \
  >"$work_dir/blocker.log" 2>&1 <<'SQL' &
begin;
select pg_catalog.pg_advisory_xact_lock(
  pg_catalog.hashtextextended('10000000-0000-4000-8000-000000000001:readiness:2099-01', 0)
);
select pg_sleep(3);
commit;
SQL
blocker_pid=$!

sleep 1

run_freeze() {
  local output_path="$1"
  psql "$MPGF_COMPACT_TEST_DB_URL" --no-psqlrc --tuples-only --no-align \
    --set ON_ERROR_STOP=1 >"$output_path" <<'SQL'
select public.freeze_mpgf_public_goods_readiness_v2(
  '10000000-0000-4000-8000-000000000001', '2099-01'
)->>'readinessSnapshotId';
SQL
}

run_freeze "$work_dir/freeze-a.txt" &
freeze_a_pid=$!
run_freeze "$work_dir/freeze-b.txt" &
freeze_b_pid=$!

wait "$freeze_a_pid"
wait "$freeze_b_pid"
wait "$blocker_pid"

freeze_a="$(tr -d '[:space:]' < "$work_dir/freeze-a.txt")"
freeze_b="$(tr -d '[:space:]' < "$work_dir/freeze-b.txt")"
if [[ -z "$freeze_a" || "$freeze_a" != "$freeze_b" ]]; then
  echo "Concurrent readiness freezes did not return one shared snapshot: $freeze_a / $freeze_b" >&2
  exit 1
fi

psql "$MPGF_COMPACT_TEST_DB_URL" --no-psqlrc --set ON_ERROR_STOP=1 <<'SQL'
do $test$
declare readiness public.mpgf_public_goods_readiness_snapshots%rowtype;
begin
  select * into readiness
  from public.mpgf_public_goods_readiness_snapshots
  where compact_id = '10000000-0000-4000-8000-000000000001'
    and cycle_key = '2099-01';

  if (select count(*) from public.mpgf_public_goods_readiness_snapshots
      where compact_id = readiness.compact_id and cycle_key = readiness.cycle_key) <> 1
    or readiness.funding_qualified_unique_person_count <> 100
    or readiness.scheduled_contribution_cents <> 50000
    or not readiness.threshold_ready
    or not readiness.activation_blocked
  then
    raise exception 'Concurrent readiness freeze was not unique, exact, threshold-ready, and blocked.';
  end if;

  if exists (
    select 1 from public.mpgf_public_goods_compacts
    where status <> 'recruiting' or activation_execution_enabled or automatic_collection_enabled
  ) or exists (select 1 from public.mpgf_public_goods_settled_contribution_snapshots)
    or exists (select 1 from public.mpgf_public_goods_voting_snapshots)
    or exists (select 1 from public.mpgf_public_goods_delegation_snapshots)
  then
    raise exception 'Concurrent readiness QA activated a Compact, moved money, or fabricated governance.';
  end if;
end;
$test$;

select 'Genuinely concurrent 100-person/$500 readiness froze once without activation or money.' as result;
SQL
