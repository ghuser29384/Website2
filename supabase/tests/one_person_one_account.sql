\set ON_ERROR_STOP on
begin;

set local statement_timeout = '30s';
set local lock_timeout = '5s';

-- Release starts inert.
do $$
declare gate record;
begin
  select * into gate
  from moral_trade_private.person_account_release_gates
  where gate_key = 'one_person_account_v1';
  if gate.registration_enforcement_enabled or gate.participation_enforcement_enabled then
    raise exception 'release gates must start disabled';
  end if;
end $$;

-- Existing auth users have one authoritative account row and no destructive migration occurred.
do $$
declare missing_count integer;
begin
  select count(*) into missing_count
  from auth.users u
  left join moral_trade_private.person_accounts a on a.profile_id = u.id
  where a.profile_id is null;
  if missing_count <> 0 then
    raise exception 'missing person-account backfill rows: %', missing_count;
  end if;
end $$;

select public.create_person_verification_session_v1(
  '10000000-0000-4000-8000-000000000001',
  'registration',
  repeat('1', 64),
  repeat('a', 64),
  null,
  'qa_mock',
  'MoralTrade QA',
  repeat('b', 64),
  '/onboarding',
  timezone('utc', now()) + interval '45 minutes'
);

select public.create_person_verification_session_v1(
  '10000000-0000-4000-8000-000000000002',
  'registration',
  repeat('2', 64),
  repeat('c', 64),
  null,
  'qa_mock',
  'MoralTrade QA',
  repeat('d', 64),
  '/onboarding',
  timezone('utc', now()) + interval '45 minutes'
);

-- The first high-confidence identity claim receives the only registration grant.
select public.record_person_verification_result_v1(
  '10000000-0000-4000-8000-000000000001',
  'MoralTrade QA',
  repeat('3', 64),
  repeat('b', 64),
  repeat('4', 64),
  'verified',
  'manual_equivalent',
  'adult',
  'clear',
  jsonb_build_array(jsonb_build_object(
    'namespace', 'manual_equivalent',
    'version', 1,
    'token', repeat('e', 64)
  )),
  timezone('utc', now()),
  timezone('utc', now()) + interval '1 year',
  timezone('utc', now()) + interval '30 days',
  timezone('utc', now()) + interval '20 minutes'
);

do $$
declare grant_count integer; session_state text;
begin
  select count(*) into grant_count
  from moral_trade_private.person_registration_grants
  where verification_session_id = '10000000-0000-4000-8000-000000000001'
    and state = 'issued';
  select state into session_state
  from moral_trade_private.preaccount_verification_sessions
  where id = '10000000-0000-4000-8000-000000000001';
  if grant_count <> 1 or session_state <> 'verified' then
    raise exception 'first identity did not receive exactly one grant';
  end if;
end $$;

-- Replaying an identical provider event is idempotent.
do $$
declare result jsonb;
begin
  result := public.record_person_verification_result_v1(
    '10000000-0000-4000-8000-000000000001',
    'MoralTrade QA', repeat('3', 64), repeat('b', 64), repeat('4', 64),
    'verified', 'manual_equivalent', 'adult', 'clear',
    jsonb_build_array(jsonb_build_object(
      'namespace', 'manual_equivalent', 'version', 1, 'token', repeat('e', 64)
    )),
    timezone('utc', now()),
    timezone('utc', now()) + interval '1 year',
    timezone('utc', now()) + interval '30 days',
    timezone('utc', now()) + interval '20 minutes'
  );
  -- Timestamps are compared exactly, so the second call above may conflict when now() changes only
  -- between transactions. This block runs in one transaction where now() is stable.
  if coalesce((result ->> 'idempotent')::boolean, false) is not true then
    raise exception 'provider replay was not idempotent';
  end if;
end $$;

-- The same protected human key cannot produce a second canonical account grant.
select public.record_person_verification_result_v1(
  '10000000-0000-4000-8000-000000000002',
  'MoralTrade QA',
  repeat('5', 64),
  repeat('d', 64),
  repeat('6', 64),
  'verified',
  'manual_equivalent',
  'adult',
  'clear',
  jsonb_build_array(jsonb_build_object(
    'namespace', 'manual_equivalent',
    'version', 1,
    'token', repeat('e', 64)
  )),
  timezone('utc', now()),
  timezone('utc', now()) + interval '1 year',
  timezone('utc', now()) + interval '30 days',
  timezone('utc', now()) + interval '20 minutes'
);

do $$
declare second_state text; second_grants integer;
begin
  select state into second_state
  from moral_trade_private.preaccount_verification_sessions
  where id = '10000000-0000-4000-8000-000000000002';
  select count(*) into second_grants
  from moral_trade_private.person_registration_grants
  where verification_session_id = '10000000-0000-4000-8000-000000000002';
  if second_state <> 'duplicate_recovery' or second_grants <> 0 then
    raise exception 'duplicate identity was allowed a second registration grant';
  end if;
end $$;

-- With participation enforcement enabled, an unverified/unknown profile retains only low-risk access.
select public.configure_person_account_release_v1('qa_mock', true, false, true, null);
do $$
declare low jsonb; high jsonb;
begin
  low := public.person_capability_decision_v1('90000000-0000-4000-8000-000000000001', 'private_draft');
  high := public.person_capability_decision_v1('90000000-0000-4000-8000-000000000001', 'publish');
  if coalesce((low ->> 'allowed')::boolean, false) is not true then
    raise exception 'low-risk capability was blocked';
  end if;
  if coalesce((high ->> 'allowed')::boolean, true) is not false then
    raise exception 'unverified high-risk capability was allowed';
  end if;
end $$;

-- Private schema remains inaccessible to browser roles.
do $$
begin
  if has_schema_privilege('anon', 'moral_trade_private', 'USAGE')
     or has_schema_privilege('authenticated', 'moral_trade_private', 'USAGE') then
    raise exception 'browser role can access private identity schema';
  end if;
end $$;

rollback;

select 'one-person-account SQL regression passed' as result;
