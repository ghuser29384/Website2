-- Executed only inside a workflow-owned transaction that is rolled back.
-- Deliberately contains no BEGIN, COMMIT, or ROLLBACK of its own.

\set ON_ERROR_STOP on

-- Schema, seed, privilege, and SECURITY DEFINER boundaries.
do $test$
declare
  relation_name text;
  function_signature text;
begin
  if (select count(*) from public.mpgf_public_goods_compacts) <> 3 then
    raise exception 'Expected exactly three published compact charters.';
  end if;
  if exists (select 1 from public.mpgf_public_goods_compact_memberships)
    or exists (select 1 from public.mpgf_public_goods_compact_delegations)
    or exists (select 1 from public.mpgf_public_goods_compact_idempotency_keys)
  then
    raise exception 'Compact migrations seeded participant activity.';
  end if;

  foreach relation_name in array array[
    'mpgf_public_goods_compacts',
    'mpgf_public_goods_compact_memberships',
    'mpgf_public_goods_compact_delegations',
    'mpgf_public_goods_compact_idempotency_keys'
  ] loop
    if not exists (
      select 1
      from pg_catalog.pg_class as c
      join pg_catalog.pg_namespace as n on n.oid = c.relnamespace
      where n.nspname = 'public'
        and c.relname = relation_name
        and c.relrowsecurity
    ) then
      raise exception 'RLS is not enabled for %.', relation_name;
    end if;
  end loop;

  if has_table_privilege('authenticated', 'public.mpgf_public_goods_compact_memberships', 'insert')
    or has_table_privilege('authenticated', 'public.mpgf_public_goods_compact_memberships', 'update')
    or has_table_privilege('authenticated', 'public.mpgf_public_goods_compact_memberships', 'delete')
    or has_table_privilege('authenticated', 'public.mpgf_public_goods_compact_delegations', 'insert')
    or has_table_privilege('authenticated', 'public.mpgf_public_goods_compact_delegations', 'update')
    or has_table_privilege('authenticated', 'public.mpgf_public_goods_compact_idempotency_keys', 'select')
  then
    raise exception 'Authenticated clients received a prohibited direct-write or idempotency grant.';
  end if;

  foreach function_signature in array array[
    'public.get_mpgf_public_goods_compacts_state()',
    'public.join_mpgf_public_goods_compact(text,text,bigint,jsonb,text)',
    'public.request_mpgf_public_goods_compact_exit(text,text)',
    'public.set_mpgf_public_goods_compact_delegation(text,text,uuid,text)',
    'public.clear_mpgf_public_goods_compact_delegation(text,text,text)'
  ] loop
    if not has_function_privilege('authenticated', function_signature, 'execute') then
      raise exception 'Authenticated role cannot execute required RPC %.', function_signature;
    end if;
    if not exists (
      select 1
      from pg_catalog.pg_proc as p
      where p.oid = function_signature::regprocedure
        and p.prosecdef
        and coalesce(p.proconfig::text, '') like '%search_path=%'
    ) then
      raise exception 'RPC % lacks SECURITY DEFINER or a fixed search_path.', function_signature;
    end if;
  end loop;

  if has_function_privilege(
    'authenticated',
    'public.mpgf_public_goods_compact_revoke_stale_delegations()',
    'execute'
  ) then
    raise exception 'Authenticated clients can execute the electorate trigger function directly.';
  end if;
end;
$test$;

-- Synthetic users and profiles. The outer transaction removes every fixture.
insert into auth.users (
  id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, confirmation_token, recovery_token,
  email_change_token_new, email_change_token_current, reauthentication_token,
  is_sso_user, is_anonymous, created_at, updated_at
) values
  ('6a000000-0000-4000-8000-000000000001','00000000-0000-0000-0000-000000000000','authenticated','authenticated','compact-a@example.test','',now(),'{}','{}','','','','','',false,false,now(),now()),
  ('6a000000-0000-4000-8000-000000000002','00000000-0000-0000-0000-000000000000','authenticated','authenticated','compact-b@example.test','',now(),'{}','{}','','','','','',false,false,now(),now()),
  ('6a000000-0000-4000-8000-000000000003','00000000-0000-0000-0000-000000000000','authenticated','authenticated','compact-c@example.test','',now(),'{}','{}','','','','','',false,false,now(),now()),
  ('6a000000-0000-4000-8000-000000000004','00000000-0000-0000-0000-000000000000','authenticated','authenticated','compact-d@example.test','',now(),'{}','{}','','','','','',false,false,now(),now());

insert into public.profiles (
  id, email, display_name, bio, affiliation, username, account_kind,
  accepts_group_invitations, public_invitation_mentions_enabled
) values
  ('6a000000-0000-4000-8000-000000000001','compact-a@example.test','Compact A','','','compact-a','individual',true,true),
  ('6a000000-0000-4000-8000-000000000002','compact-b@example.test','Compact B','','','compact-b','individual',true,true),
  ('6a000000-0000-4000-8000-000000000003','compact-c@example.test','Compact C','','','compact-c','individual',true,true),
  ('6a000000-0000-4000-8000-000000000004','compact-d@example.test','Compact D','','','compact-d','individual',true,true);

-- A: acknowledgement/version rejection, exact arithmetic, idempotency, revocation, reacceptance.
set local role authenticated;
select set_config('request.jwt.claim.sub','6a000000-0000-4000-8000-000000000001',true);
select set_config('request.jwt.claim.role','authenticated',true);

do $test$
declare
  response jsonb;
  replay jsonb;
  membership_id uuid;
begin
  begin
    perform public.join_mpgf_public_goods_compact(
      'future-flourishing',
      'mpgf-public-goods-compact/founding-v1',
      12345,
      '{"voluntaryChoice":true,"exactConstitution":true,"activationAndNoProjectOptOut":false,"noPaymentMandate":true}'::jsonb,
      'qa.join.a.bad-ack'
    );
    raise exception 'Join accepted incomplete acknowledgements.';
  exception when invalid_parameter_value then null;
  end;

  begin
    perform public.join_mpgf_public_goods_compact(
      'future-flourishing',
      'mpgf-public-goods-compact/stale-v0',
      12345,
      '{"voluntaryChoice":true,"exactConstitution":true,"activationAndNoProjectOptOut":true,"noPaymentMandate":true}'::jsonb,
      'qa.join.a.bad-version'
    );
    raise exception 'Join accepted a stale constitution version.';
  exception when check_violation then null;
  end;

  response := public.join_mpgf_public_goods_compact(
    'future-flourishing',
    'mpgf-public-goods-compact/founding-v1',
    12345,
    '{"voluntaryChoice":true,"exactConstitution":true,"activationAndNoProjectOptOut":true,"noPaymentMandate":true}'::jsonb,
    'qa.join.a.0001'
  );
  replay := public.join_mpgf_public_goods_compact(
    'future-flourishing',
    'mpgf-public-goods-compact/founding-v1',
    12345,
    '{"voluntaryChoice":true,"exactConstitution":true,"activationAndNoProjectOptOut":true,"noPaymentMandate":true}'::jsonb,
    'qa.join.a.0001'
  );

  if response <> replay
    or response->>'membershipStatus' <> 'pending_activation'
    or (response->>'scheduledMonthlyContributionCents')::bigint <> 123
    or (response->>'bindingNow')::boolean
    or (response->>'moneyMoved')::boolean
    or (response->>'paymentMandateCreated')::boolean
    or (response->>'automaticCollectionEnabled')::boolean
  then
    raise exception 'Recruiting join violated idempotency, arithmetic, binding, or no-money boundaries: %', response;
  end if;

  begin
    perform public.join_mpgf_public_goods_compact(
      'future-flourishing',
      'mpgf-public-goods-compact/founding-v1',
      99999,
      '{"voluntaryChoice":true,"exactConstitution":true,"activationAndNoProjectOptOut":true,"noPaymentMandate":true}'::jsonb,
      'qa.join.a.0001'
    );
    raise exception 'Reused idempotency key accepted a changed request.';
  exception when unique_violation then null;
  end;

  select id into membership_id
  from public.mpgf_public_goods_compact_memberships
  where user_id = '6a000000-0000-4000-8000-000000000001'
    and compact_id = '10000000-0000-4000-8000-000000000001';
  perform set_config('qa.a_membership_id', membership_id::text, true);

  begin
    update public.mpgf_public_goods_compact_memberships
    set scheduled_monthly_contribution_cents = 999
    where id = membership_id;
    raise exception 'Authenticated owner directly mutated compact membership.';
  exception when insufficient_privilege then null;
  end;

  response := public.request_mpgf_public_goods_compact_exit(
    'future-flourishing',
    'qa.exit.a.0001'
  );
  if not (response->>'revokedImmediately')::boolean
    or response->>'membershipStatus' <> 'revoked'
    or (response->>'moneyMoved')::boolean
    or (response->>'paymentMandateChanged')::boolean
    or (response->>'automaticCollectionEnabled')::boolean
  then
    raise exception 'Recruiting revocation violated the immediate or no-money contract: %', response;
  end if;

  response := public.join_mpgf_public_goods_compact(
    'future-flourishing',
    'mpgf-public-goods-compact/founding-v1',
    12345,
    '{"voluntaryChoice":true,"exactConstitution":true,"activationAndNoProjectOptOut":true,"noPaymentMandate":true}'::jsonb,
    'qa.join.a.0002'
  );
  if response->>'membershipStatus' <> 'pending_activation' then
    raise exception 'Explicit reacceptance did not restore pending activation.';
  end if;
end;
$test$;
reset role;

-- Simulate 4,999 acceptances; B must atomically trigger activation and the $10 cap.
update public.mpgf_public_goods_compacts
set accepted_member_count = 4999
where id = '10000000-0000-4000-8000-000000000001';

set local role authenticated;
select set_config('request.jwt.claim.sub','6a000000-0000-4000-8000-000000000002',true);
select set_config('request.jwt.claim.role','authenticated',true);

do $test$
declare
  response jsonb;
  membership_id uuid;
begin
  response := public.join_mpgf_public_goods_compact(
    'future-flourishing',
    'mpgf-public-goods-compact/founding-v1',
    100000,
    '{"voluntaryChoice":true,"exactConstitution":true,"activationAndNoProjectOptOut":true,"noPaymentMandate":true}'::jsonb,
    'qa.join.b.0001'
  );
  if not (response->>'activatedNow')::boolean
    or not (response->>'bindingNow')::boolean
    or response->>'membershipStatus' <> 'active'
    or (response->>'scheduledMonthlyContributionCents')::bigint <> 1000
    or (response->>'moneyMoved')::boolean
    or (response->>'paymentMandateCreated')::boolean
  then
    raise exception 'Threshold join violated activation, cap, or no-money boundaries: %', response;
  end if;

  select id into membership_id
  from public.mpgf_public_goods_compact_memberships
  where user_id = '6a000000-0000-4000-8000-000000000002'
    and compact_id = '10000000-0000-4000-8000-000000000001';
  perform set_config('qa.b_membership_id', membership_id::text, true);
end;
$test$;
reset role;

do $test$
declare
  compact_record public.mpgf_public_goods_compacts%rowtype;
begin
  select * into compact_record
  from public.mpgf_public_goods_compacts
  where id = '10000000-0000-4000-8000-000000000001';

  if compact_record.status <> 'active'
    or compact_record.accepted_member_count <> 5000
    or compact_record.activated_at is null
    or compact_record.constitution_frozen_at is distinct from compact_record.activated_at
    or compact_record.frozen_constitution_version is distinct from compact_record.constitution_version
  then
    raise exception 'Threshold acceptance did not atomically activate and freeze the compact.';
  end if;
  if (select count(*) from public.mpgf_public_goods_compact_memberships
      where compact_id = compact_record.id and status = 'active') <> 2 then
    raise exception 'Threshold activation did not activate every pending fixture membership.';
  end if;

  begin
    update public.mpgf_public_goods_compacts
    set summary = 'Replacement terms after acceptance are prohibited.'
    where id = compact_record.id;
    raise exception 'Accepted constitutional terms remained mutable.';
  exception when check_violation then null;
  end;
end;
$test$;

-- C accepts and revokes Animal Welfare while it is still recruiting.
set local role authenticated;
select set_config('request.jwt.claim.sub','6a000000-0000-4000-8000-000000000003',true);
select set_config('request.jwt.claim.role','authenticated',true);
do $test$
declare
  response jsonb;
begin
  response := public.join_mpgf_public_goods_compact(
    'animal-welfare',
    'mpgf-public-goods-compact/founding-v1',
    50000,
    '{"voluntaryChoice":true,"exactConstitution":true,"activationAndNoProjectOptOut":true,"noPaymentMandate":true}'::jsonb,
    'qa.join.c.pre.0001'
  );
  if response->>'membershipStatus' <> 'pending_activation' then
    raise exception 'Pre-activation acceptance did not remain pending.';
  end if;

  response := public.request_mpgf_public_goods_compact_exit(
    'animal-welfare',
    'qa.exit.c.pre.0001'
  );
  if response->>'membershipStatus' <> 'revoked'
    or not (response->>'revokedImmediately')::boolean
    or (response->>'moneyMoved')::boolean
  then
    raise exception 'Pre-activation revocation was not immediate and no-money.';
  end if;
end;
$test$;
reset role;

-- Activate Animal Welfare in-fixture, then prove the revoked recruiting acceptance can rejoin and bind immediately without moving money.
update public.mpgf_public_goods_compacts
set accepted_member_count = 5000,
    status = 'active',
    activated_at = statement_timestamp(),
    constitution_frozen_at = statement_timestamp(),
    frozen_constitution_version = constitution_version
where id = '10000000-0000-4000-8000-000000000002';

set local role authenticated;
select set_config('request.jwt.claim.sub','6a000000-0000-4000-8000-000000000003',true);
select set_config('request.jwt.claim.role','authenticated',true);
do $test$
declare
  response jsonb;
  membership_id uuid;
begin
  response := public.join_mpgf_public_goods_compact(
    'animal-welfare',
    'mpgf-public-goods-compact/founding-v1',
    50000,
    '{"voluntaryChoice":true,"exactConstitution":true,"activationAndNoProjectOptOut":true,"noPaymentMandate":true}'::jsonb,
    'qa.join.c.0001'
  );
  if response->>'membershipStatus' <> 'active'
    or not (response->>'bindingNow')::boolean
    or (response->>'moneyMoved')::boolean
    or (response->>'paymentMandateCreated')::boolean
  then
    raise exception 'Late active-compact join violated binding or no-money boundaries.';
  end if;
  select id into membership_id
  from public.mpgf_public_goods_compact_memberships
  where user_id = '6a000000-0000-4000-8000-000000000003'
    and compact_id = '10000000-0000-4000-8000-000000000002';
  perform set_config('qa.c_membership_id', membership_id::text, true);
end;
$test$;
reset role;

set local role authenticated;
select set_config('request.jwt.claim.sub','6a000000-0000-4000-8000-000000000004',true);
select set_config('request.jwt.claim.role','authenticated',true);
do $test$
declare
  response jsonb;
  membership_id uuid;
begin
  response := public.join_mpgf_public_goods_compact(
    'future-flourishing',
    'mpgf-public-goods-compact/founding-v1',
    77777,
    '{"voluntaryChoice":true,"exactConstitution":true,"activationAndNoProjectOptOut":true,"noPaymentMandate":true}'::jsonb,
    'qa.join.d.0001'
  );
  if response->>'membershipStatus' <> 'active'
    or not (response->>'bindingNow')::boolean
    or (response->>'moneyMoved')::boolean
    or (response->>'paymentMandateCreated')::boolean
  then
    raise exception 'Second late join violated binding or no-money boundaries.';
  end if;
  select id into membership_id
  from public.mpgf_public_goods_compact_memberships
  where user_id = '6a000000-0000-4000-8000-000000000004'
    and compact_id = '10000000-0000-4000-8000-000000000001';
  perform set_config('qa.d_membership_id', membership_id::text, true);
end;
$test$;
reset role;

-- Open an electorate, test self/cross-compact rejection, and create incoming/outgoing delegation for A.
update public.mpgf_public_goods_compacts
set allocation_electorate_active = true,
    allocation_electorate_key = 'round:future:0001'
where id = '10000000-0000-4000-8000-000000000001';

set local role authenticated;
select set_config('request.jwt.claim.sub','6a000000-0000-4000-8000-000000000001',true);
select set_config('request.jwt.claim.role','authenticated',true);
do $test$
declare
  response jsonb;
begin
  response := public.set_mpgf_public_goods_compact_delegation(
    'future-flourishing',
    'round:future:0001',
    current_setting('qa.b_membership_id')::uuid,
    'qa.delegate.a.0001'
  );
  if (response->>'moneyTransferred')::boolean
    or (response->>'membershipTransferred')::boolean
    or (response->>'reputationTransferred')::boolean
  then
    raise exception 'Delegation transferred money, membership, or reputation.';
  end if;

  begin
    perform public.set_mpgf_public_goods_compact_delegation(
      'future-flourishing',
      'round:future:0001',
      current_setting('qa.a_membership_id')::uuid,
      'qa.delegate.a.self'
    );
    raise exception 'Self-delegation was accepted.';
  exception when check_violation then null;
  end;

  begin
    perform public.set_mpgf_public_goods_compact_delegation(
      'future-flourishing',
      'round:future:0001',
      current_setting('qa.c_membership_id')::uuid,
      'qa.delegate.a.cross'
    );
    raise exception 'Cross-compact delegation was accepted.';
  exception when foreign_key_violation then null;
  end;
end;
$test$;
reset role;

set local role authenticated;
select set_config('request.jwt.claim.sub','6a000000-0000-4000-8000-000000000002',true);
select set_config('request.jwt.claim.role','authenticated',true);
select public.set_mpgf_public_goods_compact_delegation(
  'future-flourishing',
  'round:future:0001',
  current_setting('qa.a_membership_id')::uuid,
  'qa.delegate.b.0001'
);
reset role;

-- A's active exit must revoke both directions and calculate the exact prospective date.
set local role authenticated;
select set_config('request.jwt.claim.sub','6a000000-0000-4000-8000-000000000001',true);
select set_config('request.jwt.claim.role','authenticated',true);
do $test$
declare
  response jsonb;
  membership_record public.mpgf_public_goods_compact_memberships%rowtype;
  compact_record public.mpgf_public_goods_compacts%rowtype;
begin
  response := public.request_mpgf_public_goods_compact_exit(
    'future-flourishing',
    'qa.exit.a.0002'
  );
  select * into membership_record
  from public.mpgf_public_goods_compact_memberships
  where id = current_setting('qa.a_membership_id')::uuid;
  select * into compact_record
  from public.mpgf_public_goods_compacts
  where id = membership_record.compact_id;

  if membership_record.status <> 'exit_notice'
    or membership_record.exit_effective_at is distinct from greatest(
      compact_record.activated_at + make_interval(months => compact_record.minimum_term_months),
      membership_record.exit_requested_at + make_interval(days => compact_record.exit_notice_days)
    )
    or (response->>'delegationsRevoked')::integer <> 2
    or (response->>'moneyMoved')::boolean
    or (response->>'paymentMandateChanged')::boolean
  then
    raise exception 'Prospective exit violated timing, delegation, or no-money boundaries: %', response;
  end if;
  if exists (
    select 1
    from public.mpgf_public_goods_compact_delegations
    where status = 'active'
      and (
        delegator_membership_id = membership_record.id
        or delegatee_membership_id = membership_record.id
      )
  ) then
    raise exception 'Prospective exit left an incoming or outgoing active delegation.';
  end if;
end;
$test$;
reset role;

-- Electorate changes and closure revoke stale delegations.
set local role authenticated;
select set_config('request.jwt.claim.sub','6a000000-0000-4000-8000-000000000002',true);
select set_config('request.jwt.claim.role','authenticated',true);
select public.set_mpgf_public_goods_compact_delegation(
  'future-flourishing',
  'round:future:0001',
  current_setting('qa.d_membership_id')::uuid,
  'qa.delegate.b.0002'
);
reset role;

update public.mpgf_public_goods_compacts
set allocation_electorate_key = 'round:future:0002'
where id = '10000000-0000-4000-8000-000000000001';

do $test$
begin
  if exists (
    select 1
    from public.mpgf_public_goods_compact_delegations
    where compact_id = '10000000-0000-4000-8000-000000000001'
      and status = 'active'
      and electorate_key = 'round:future:0001'
  ) then
    raise exception 'Electorate change left a stale active delegation.';
  end if;
end;
$test$;

set local role authenticated;
select set_config('request.jwt.claim.sub','6a000000-0000-4000-8000-000000000002',true);
select set_config('request.jwt.claim.role','authenticated',true);
select public.set_mpgf_public_goods_compact_delegation(
  'future-flourishing',
  'round:future:0002',
  current_setting('qa.d_membership_id')::uuid,
  'qa.delegate.b.0003'
);
reset role;

update public.mpgf_public_goods_compacts
set allocation_electorate_active = false,
    allocation_electorate_key = null
where id = '10000000-0000-4000-8000-000000000001';

do $test$
begin
  if exists (
    select 1
    from public.mpgf_public_goods_compact_delegations
    where compact_id = '10000000-0000-4000-8000-000000000001'
      and status = 'active'
  ) then
    raise exception 'Electorate closure left an active delegation.';
  end if;
end;
$test$;

-- Owner-only RLS and safe public state projection.
set local role authenticated;
select set_config('request.jwt.claim.sub','6a000000-0000-4000-8000-000000000001',true);
select set_config('request.jwt.claim.role','authenticated',true);
do $test$
declare
  public_state jsonb := public.get_mpgf_public_goods_compacts_state();
begin
  if (select count(*) from public.mpgf_public_goods_compact_memberships
      where user_id = '6a000000-0000-4000-8000-000000000001') <> 1 then
    raise exception 'Owner cannot read their compact membership.';
  end if;
  if exists (
    select 1
    from public.mpgf_public_goods_compact_memberships
    where user_id <> '6a000000-0000-4000-8000-000000000001'
  ) then
    raise exception 'Membership RLS exposed another participant.';
  end if;
  if public_state::text like '%' || current_setting('qa.b_membership_id') || '%'
    or public_state::text like '%' || current_setting('qa.d_membership_id') || '%'
  then
    raise exception 'Public state exposed another participant membership identifier.';
  end if;
  if public_state #>> '{compacts,0,membership,id}' <> current_setting('qa.a_membership_id') then
    raise exception 'Viewer state omitted the authenticated viewer membership.';
  end if;
end;
$test$;
reset role;

set local role anon;
select set_config('request.jwt.claim.sub','',true);
select set_config('request.jwt.claim.role','anon',true);
do $test$
declare
  public_state jsonb := public.get_mpgf_public_goods_compacts_state();
begin
  if public_state #> '{compacts,0,membership}' <> 'null'::jsonb
    or public_state #> '{compacts,1,membership}' <> 'null'::jsonb
    or public_state #> '{compacts,2,membership}' <> 'null'::jsonb
  then
    raise exception 'Anonymous public state exposed a private membership.';
  end if;
  if (public_state #>> '{compacts,0,acceptedMemberCount}')::bigint < 5000 then
    raise exception 'Anonymous state omitted the durable aggregate count.';
  end if;

  begin
    perform * from public.mpgf_public_goods_compact_memberships;
    raise exception 'Anonymous role directly read private memberships.';
  exception when insufficient_privilege then null;
  end;
end;
$test$;
reset role;

-- Recruiting compacts cannot expose an active electorate.
do $test$
begin
  begin
    update public.mpgf_public_goods_compacts
    set allocation_electorate_active = true,
        allocation_electorate_key = 'round:global:0001'
    where id = '10000000-0000-4000-8000-000000000003';
    raise exception 'Recruiting compact accepted an active electorate.';
  exception when check_violation then null;
  end;
end;
$test$;

select 'MPGF public-goods compact rollback-only lifecycle passed.' as result;
