#!/usr/bin/env bash
set -euo pipefail

: "${MORALTRADE_QA_DATABASE_URL:?MORALTRADE_QA_DATABASE_URL is required}"

DB="$MORALTRADE_QA_DATABASE_URL"
SESSION_A="20000000-0000-4000-8000-000000000001"
SESSION_B="20000000-0000-4000-8000-000000000002"
TOKEN="ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff"
VERIFIED_AT="2026-07-31T12:00:00Z"

cleanup() {
  psql "$DB" -v ON_ERROR_STOP=1 -q <<SQL || true
do \$\$
declare
  subjects uuid[];
begin
  perform set_config('moral_trade.person_identity_internal_write', 'on', true);

  select coalesce(array_agg(distinct identity_subject_id), '{}'::uuid[]) into subjects
  from moral_trade_private.identity_dedupe_keys
  where token_namespace = 'manual_equivalent' and token_version = 1 and token_hmac = '$TOKEN';

  delete from moral_trade_private.account_security_events
  where verification_session_id in ('$SESSION_A'::uuid, '$SESSION_B'::uuid)
     or identity_subject_id = any(subjects);
  delete from moral_trade_private.identity_duplicate_cases
    where verification_session_id in ('$SESSION_A'::uuid, '$SESSION_B'::uuid)
       or subject_a_id = any(subjects) or subject_b_id = any(subjects);
  delete from moral_trade_private.account_recovery_cases where identity_subject_id = any(subjects);
  delete from moral_trade_private.person_registration_grants
    where verification_session_id in ('$SESSION_A'::uuid, '$SESSION_B'::uuid)
       or identity_subject_id = any(subjects);
  delete from moral_trade_private.identity_verification_events
    where verification_session_id in ('$SESSION_A'::uuid, '$SESSION_B'::uuid)
       or identity_subject_id = any(subjects);
  delete from moral_trade_private.identity_tombstones where identity_subject_id = any(subjects);
  delete from moral_trade_private.identity_dedupe_keys where identity_subject_id = any(subjects);
  delete from moral_trade_private.preaccount_verification_sessions
    where id in ('$SESSION_A'::uuid, '$SESSION_B'::uuid);
  delete from moral_trade_private.identity_subjects where id = any(subjects) and canonical_profile_id is null;
end \$\$;
SQL
}
trap cleanup EXIT
cleanup

psql "$DB" -v ON_ERROR_STOP=1 -q <<SQL
select public.create_person_verification_session_v1(
  '$SESSION_A', 'registration', repeat('7',64), repeat('8',64), null,
  'qa_mock', 'MoralTrade QA', repeat('9',64), '/onboarding', timezone('utc',now()) + interval '45 minutes'
);
select public.create_person_verification_session_v1(
  '$SESSION_B', 'registration', repeat('a',64), repeat('b',64), null,
  'qa_mock', 'MoralTrade QA', repeat('c',64), '/onboarding', timezone('utc',now()) + interval '45 minutes'
);
SQL

call_record() {
  local session="$1" event_hash="$2" provider_hash="$3" payload_hash="$4"
  psql "$DB" -v ON_ERROR_STOP=1 -qAt <<SQL
select public.record_person_verification_result_v1(
  '$session', 'MoralTrade QA', '$event_hash', '$provider_hash', '$payload_hash',
  'verified', 'manual_equivalent', 'adult', 'clear',
  jsonb_build_array(jsonb_build_object(
    'namespace','manual_equivalent','version',1,'token','$TOKEN'
  )),
  '$VERIFIED_AT'::timestamptz,
  '$VERIFIED_AT'::timestamptz + interval '1 year',
  timezone('utc',now()) + interval '30 days',
  timezone('utc',now()) + interval '20 minutes'
);
SQL
}

call_record "$SESSION_A" "$(printf 'd%.0s' {1..64})" "$(printf '9%.0s' {1..64})" "$(printf 'e%.0s' {1..64})" > /tmp/one-person-concurrency-a.json &
pid_a=$!
call_record "$SESSION_B" "$(printf 'f%.0s' {1..64})" "$(printf 'c%.0s' {1..64})" "$(printf '0%.0s' {1..64})" > /tmp/one-person-concurrency-b.json &
pid_b=$!
wait "$pid_a"
wait "$pid_b"

result="$(psql "$DB" -v ON_ERROR_STOP=1 -qAt <<SQL
select jsonb_build_object(
  'issuedGrants', (
    select count(*) from moral_trade_private.person_registration_grants
    where verification_session_id in ('$SESSION_A'::uuid, '$SESSION_B'::uuid) and state = 'issued'
  ),
  'verifiedSessions', (
    select count(*) from moral_trade_private.preaccount_verification_sessions
    where id in ('$SESSION_A'::uuid, '$SESSION_B'::uuid) and state = 'verified'
  ),
  'duplicateSessions', (
    select count(*) from moral_trade_private.preaccount_verification_sessions
    where id in ('$SESSION_A'::uuid, '$SESSION_B'::uuid) and state = 'duplicate_recovery'
  ),
  'dedupeKeys', (
    select count(*) from moral_trade_private.identity_dedupe_keys
    where token_namespace = 'manual_equivalent' and token_version = 1 and token_hmac = '$TOKEN'
  )
);
SQL
)"

node - "$result" <<'NODE'
const result = JSON.parse(process.argv[2]);
if (result.issuedGrants !== 1 || result.verifiedSessions !== 1 || result.duplicateSessions !== 1 || result.dedupeKeys !== 1) {
  console.error(result);
  process.exit(1);
}
console.log(JSON.stringify({ ...result, passed: true }));
NODE
