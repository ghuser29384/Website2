-- Executed only inside a workflow-owned transaction that is rolled back.
-- Deliberately contains no BEGIN, COMMIT, or ROLLBACK of its own.

\set ON_ERROR_STOP on

-- Schema, seed, privilege, and SECURITY DEFINER boundaries.
do $test$
declare
  relation_name text;
  function_signature text;
  role_name text;
  definition_text text;
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

  foreach role_name in array array['anon', 'authenticated'] loop
    foreach relation_name in array array[
      'mpgf_public_goods_compacts',
      'mpgf_public_goods_compact_memberships',
      'mpgf_public_goods_compact_delegations',
      'mpgf_public_goods_compact_idempotency_keys'
    ] loop
      if has_table_privilege(
        role_name,
        'public.' || relation_name,
        'insert, update, delete, truncate, references, trigger'
      ) then
        raise exception '% received a prohibited direct-write grant on %.', role_name, relation_name;
      end if;
    end loop;
  end loop;

  if has_table_privilege('anon', 'public.mpgf_public_goods_compacts', 'select')
    or has_table_privilege('authenticated', 'public.mpgf_public_goods_compacts', 'select')
    or has_table_privilege('anon', 'public.mpgf_public_goods_compact_memberships', 'select')
    or has_table_privilege('anon', 'public.mpgf_public_goods_compact_delegations', 'select')
    or has_table_privilege('anon', 'public.mpgf_public_goods_compact_idempotency_keys', 'select')
    or has_table_privilege('authenticated', 'public.mpgf_public_goods_compact_idempotency_keys', 'select')
  then
    raise exception 'A client role received a prohibited direct-read grant.';
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
    if function_signature <> 'public.get_mpgf_public_goods_compacts_state()'
      and has_function_privilege('anon', function_signature, 'execute')
    then
      raise exception 'Anonymous role can execute authenticated mutation RPC %.', function_signature;
    end if;
    if not exists (
      select 1
      from pg_catalog.pg_proc as p
      where p.oid = function_signature::regprocedure
        and p.prosecdef
        and pg_catalog.pg_get_functiondef(p.oid) like '%SET search_path TO ''''%'
    ) then
      raise exception 'RPC % lacks SECURITY DEFINER or a fixed search_path.', function_signature;
    end if;
    if exists (
      select 1
      from pg_catalog.pg_proc as p,
        lateral pg_catalog.aclexplode(
          coalesce(p.proacl, pg_catalog.acldefault('f', p.proowner))
        ) as acl
      where p.oid = function_signature::regprocedure
        and acl.grantee = 0
        and acl.privilege_type = 'EXECUTE'
    ) then
      raise exception 'PUBLIC retains EXECUTE on %.', function_signature;
    end if;
  end loop;

  if has_function_privilege(
    'authenticated',
    'public.mpgf_public_goods_compact_revoke_stale_delegations()',
    'execute'
  ) then
    raise exception 'Authenticated clients can execute the electorate trigger function directly.';
  end if;
  if not exists (
    select 1
    from pg_catalog.pg_proc as p
    where p.oid = 'public.mpgf_public_goods_compact_revoke_stale_delegations()'::regprocedure
      and p.prosecdef
      and pg_catalog.pg_get_functiondef(p.oid) like '%SET search_path TO ''''%'
  ) then
    raise exception 'Electorate trigger function lacks SECURITY DEFINER or a fixed search_path.';
  end if;
  if exists (
    select 1
    from pg_catalog.pg_proc as p,
      lateral pg_catalog.aclexplode(
        coalesce(p.proacl, pg_catalog.acldefault('f', p.proowner))
      ) as acl
    where p.oid = 'public.mpgf_public_goods_compact_revoke_stale_delegations()'::regprocedure
      and acl.grantee = 0
      and acl.privilege_type = 'EXECUTE'
  ) then
    raise exception 'PUBLIC retains EXECUTE on the electorate trigger function.';
  end if;

  foreach function_signature in array array[
    'public.get_mpgf_public_goods_compacts_state()',
    'public.join_mpgf_public_goods_compact(text,text,bigint,jsonb,text)',
    'public.request_mpgf_public_goods_compact_exit(text,text)',
    'public.set_mpgf_public_goods_compact_delegation(text,text,uuid,text)',
    'public.clear_mpgf_public_goods_compact_delegation(text,text,text)',
    'public.mpgf_public_goods_compact_revoke_stale_delegations()'
  ] loop
    select p.prosrc into definition_text
    from pg_catalog.pg_proc as p
    where p.oid = function_signature::regprocedure;

    foreach relation_name in array array[
      'mpgf_public_goods_compacts',
      'mpgf_public_goods_compact_memberships',
      'mpgf_public_goods_compact_delegations',
      'mpgf_public_goods_compact_idempotency_keys',
      'profiles'
    ] loop
      if pg_catalog.strpos(
        pg_catalog.replace(
          definition_text,
          'public.' || relation_name,
          ''
        ),
        relation_name
      ) > 0 then
        raise exception 'SECURITY DEFINER function % has an unqualified reference to %.',
          function_signature,
          relation_name;
      end if;
    end loop;
  end loop;
end;
$test$;

-- Snapshot money-moving and payment-adjacent tables. Every compact mutation below must leave
-- the counts exactly unchanged.
create temporary table qa_compact_money_table_counts (
  relation_name text primary key,
  row_count bigint not null
) on commit drop;

do $test$
declare
  relation_name text;
  observed_count bigint;
begin
  foreach relation_name in array array[
    'conditional_payment_mandates',
    'conditional_payment_attempts',
    'trade_donation_intents',
    'agreement_payments',
    'mpgf_payment_intents',
    'mpgf_payment_authorizations',
    'mpgf_provider_payment_events',
    'mpgf_external_payment_evidence',
    'mpgf_manual_external_payment_evidence',
    'mpgf_receipts',
    'mpgf_custody_holds',
    'mpgf_phase_one_checkout_handoffs'
  ] loop
    if pg_catalog.to_regclass('public.' || relation_name) is not null then
      execute pg_catalog.format('select count(*) from public.%I', relation_name)
        into observed_count;
      insert into qa_compact_money_table_counts values (relation_name, observed_count);
    end if;
  end loop;
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

insert into auth.users (
  id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, confirmation_token, recovery_token,
  email_change_token_new, email_change_token_current, reauthentication_token,
  is_sso_user, is_anonymous, created_at, updated_at
) values
  ('6a000000-0000-4000-8000-000000000006','00000000-0000-0000-8000-000000000000','authenticated','authenticated','compact-no-profile@example.test','',now(),'{}','{}','','','','','',false,false,now(),now());

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
  acknowledgement_key text;
begin
  foreach acknowledgement_key in array array[
    'voluntaryChoice',
    'exactConstitution',
    'activationAndNoProjectOptOut',
    'noPaymentMandate'
  ] loop
    begin
      perform public.join_mpgf_public_goods_compact(
        'future-flourishing',
        'mpgf-public-goods-compact/founding-v1',
        12345,
        '{"voluntaryChoice":true,"exactConstitution":true,"activationAndNoProjectOptOut":true,"noPaymentMandate":true}'::jsonb
          - acknowledgement_key,
        'qa.join.a.missing.' || acknowledgement_key
      );
      raise exception 'Join accepted an acknowledgement payload missing %.', acknowledgement_key;
    exception when invalid_parameter_value then null;
    end;
  end loop;

  begin
    perform public.join_mpgf_public_goods_compact(
      'future-flourishing',
      'mpgf-public-goods-compact/founding-v1',
      99,
      '{"voluntaryChoice":true,"exactConstitution":true,"activationAndNoProjectOptOut":true,"noPaymentMandate":true}'::jsonb,
      'qa.join.a.zero'
    );
    raise exception 'A zero-cent scheduled contribution created a compact acceptance.';
  exception when invalid_parameter_value then null;
  end;

  begin
    perform public.join_mpgf_public_goods_compact(
      'future-flourishing',
      'mpgf-public-goods-compact/founding-v1',
      -1,
      '{"voluntaryChoice":true,"exactConstitution":true,"activationAndNoProjectOptOut":true,"noPaymentMandate":true}'::jsonb,
      'qa.join.a.negative'
    );
    raise exception 'Join accepted negative eligible spending.';
  exception when invalid_parameter_value then null;
  end;

  begin
    perform public.join_mpgf_public_goods_compact(
      'future-flourishing',
      'mpgf-public-goods-compact/founding-v1',
      100000000001,
      '{"voluntaryChoice":true,"exactConstitution":true,"activationAndNoProjectOptOut":true,"noPaymentMandate":true}'::jsonb,
      'qa.join.a.too-large'
    );
    raise exception 'Join accepted eligible spending above the explicit maximum.';
  exception when invalid_parameter_value then null;
  end;

  begin
    execute $sql$
      select public.join_mpgf_public_goods_compact(
        'future-flourishing',
        'mpgf-public-goods-compact/founding-v1',
        1.5,
        '{"voluntaryChoice":true,"exactConstitution":true,"activationAndNoProjectOptOut":true,"noPaymentMandate":true}'::jsonb,
        'qa.join.a.fractional'
      )
    $sql$;
    raise exception 'Join accepted fractional-cent eligible spending.';
  exception
    when undefined_function or datatype_mismatch or invalid_text_representation
      or numeric_value_out_of_range or invalid_parameter_value then null;
  end;

  begin
    perform '9223372036854775808'::bigint;
    raise exception 'PostgreSQL accepted an overflowing bigint spending value.';
  exception when numeric_value_out_of_range then null;
  end;

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

do $test$
begin
  if not exists (
    select 1
    from public.mpgf_public_goods_compact_memberships
    where user_id = '6a000000-0000-4000-8000-000000000001'
      and compact_id = '10000000-0000-4000-8000-000000000001'
      and constitution_version_accepted =
        'mpgf-public-goods-compact/founding-v1'
      and acknowledgements = '{
        "voluntaryChoice": true,
        "exactConstitution": true,
        "activationAndNoProjectOptOut": true,
        "noPaymentMandate": true
      }'::jsonb
      and declared_eligible_monthly_spending_cents = 12345
      and scheduled_monthly_contribution_cents = 123
  ) or (
    select count(*)
    from public.mpgf_public_goods_compact_memberships
    where user_id = '6a000000-0000-4000-8000-000000000001'
      and compact_id = '10000000-0000-4000-8000-000000000001'
  ) <> 1 or (
    select count(*)
    from public.mpgf_public_goods_compact_idempotency_keys
    where user_id = '6a000000-0000-4000-8000-000000000001'
      and operation = 'join'
      and idempotency_key = 'qa.join.a.0001'
  ) <> 1 or exists (
    select 1 from public.mpgf_public_goods_compact_memberships
    where user_id = '6a000000-0000-4000-8000-000000000001'
      and declared_eligible_monthly_spending_cents = 99
  ) or exists (
    select 1 from public.mpgf_public_goods_compact_idempotency_keys
    where user_id = '6a000000-0000-4000-8000-000000000001'
      and operation = 'join'
      and idempotency_key = 'qa.join.a.zero'
  ) or (
    select accepted_member_count from public.mpgf_public_goods_compacts
    where public_key = 'future-flourishing'
  ) <> 1 then
    raise exception 'Join durability, replay, or zero-cent residue invariant failed.';
  end if;
end;
$test$;

do $test$
begin
  if exists (
    select 1
    from (values
      (100::bigint, 1::bigint),
      (12345::bigint, 123::bigint),
      (99999::bigint, 999::bigint),
      (100000::bigint, 1000::bigint),
      (9000000::bigint, 1000::bigint)
    ) as boundary(declared_spending_cents, expected_contribution_cents)
    where least(declared_spending_cents / 100, 1000::bigint)
      <> expected_contribution_cents
  ) then
    raise exception 'PostgreSQL contribution arithmetic drifted from the TypeScript boundary matrix.';
  end if;
end;
$test$;

set local role authenticated;
select set_config('request.jwt.claim.sub','6a000000-0000-4000-8000-000000000006',true);
select set_config('request.jwt.claim.role','authenticated',true);
do $test$
begin
  begin
    perform public.join_mpgf_public_goods_compact(
      'future-flourishing',
      'mpgf-public-goods-compact/founding-v1',
      100,
      '{"voluntaryChoice":true,"exactConstitution":true,"activationAndNoProjectOptOut":true,"noPaymentMandate":true}'::jsonb,
      'qa.join.no-profile'
    );
    raise exception 'A user without a Moral Trade profile joined a compact.';
  exception when insufficient_privilege then null;
  end;
end;
$test$;
reset role;

-- Account/profile uniqueness is not person uniqueness. The explicit gate therefore remains
-- blocked by default, even if the numeric threshold is reached.
update public.mpgf_public_goods_compacts
set accepted_member_count = 5000
where id = '10000000-0000-4000-8000-000000000001';

do $test$
declare
  compact_record public.mpgf_public_goods_compacts%rowtype;
  public_state jsonb;
begin
  select * into compact_record
  from public.mpgf_public_goods_compacts
  where id = '10000000-0000-4000-8000-000000000001';
  public_state := public.get_mpgf_public_goods_compacts_state();

  if compact_record.status <> 'recruiting'
    or compact_record.activation_identity_gate_state <>
      'blocked_pending_person_unique_eligibility_policy'
    or public_state #>> '{compacts,0,activation,state}' <>
      'threshold_reached_identity_gate_blocked'
    or (public_state #>> '{compacts,0,identityIntegrityGate,productionActivationReady}')::boolean
  then
    raise exception 'Person-unique identity gate did not fail closed at the numeric threshold.';
  end if;
end;
$test$;

-- The privileged test administrator now simulates a future, separately approved person-unique
-- policy solely to exercise the activation engine in this disposable transaction.
update public.mpgf_public_goods_compacts
set accepted_member_count = 4999,
    activation_identity_gate_state = 'verified_person_unique_eligibility_policy'
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

  begin
    update public.mpgf_public_goods_compacts
    set activation_identity_gate_state =
      'blocked_pending_person_unique_eligibility_policy'
    where id = compact_record.id;
    raise exception 'An active compact accepted a post-activation identity-gate downgrade.';
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
    activation_identity_gate_state = 'verified_person_unique_eligibility_policy',
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

-- An active compact alone is not an authoritative electorate.
set local role authenticated;
select set_config('request.jwt.claim.sub','6a000000-0000-4000-8000-000000000001',true);
select set_config('request.jwt.claim.role','authenticated',true);
do $test$
begin
  begin
    perform public.set_mpgf_public_goods_compact_delegation(
      'future-flourishing',
      'round:future:0001',
      current_setting('qa.b_membership_id')::uuid,
      'qa.delegate.a.no-electorate'
    );
    raise exception 'Active compact was treated as an authoritative active electorate.';
  exception when check_violation then null;
  end;
end;
$test$;
reset role;

-- Open a privileged test electorate, test nonmember/self/cross-compact rejection, and create
-- incoming/outgoing delegation for A.
update public.mpgf_public_goods_compacts
set allocation_electorate_active = true,
    allocation_electorate_key = 'round:future:0001'
where id = '10000000-0000-4000-8000-000000000001';

set local role authenticated;
select set_config('request.jwt.claim.sub','6a000000-0000-4000-8000-000000000003',true);
select set_config('request.jwt.claim.role','authenticated',true);
do $test$
begin
  begin
    perform public.set_mpgf_public_goods_compact_delegation(
      'future-flourishing',
      'round:future:0001',
      current_setting('qa.b_membership_id')::uuid,
      'qa.delegate.c.nonmember'
    );
    raise exception 'A nonmember delegated in the compact electorate.';
  exception when insufficient_privilege then null;
  end;
end;
$test$;
reset role;

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

-- Delegation is explicitly revocable and replay-safe.
set local role authenticated;
select set_config('request.jwt.claim.sub','6a000000-0000-4000-8000-000000000004',true);
select set_config('request.jwt.claim.role','authenticated',true);
do $test$
declare
  created jsonb;
  cleared jsonb;
  replay jsonb;
begin
  created := public.set_mpgf_public_goods_compact_delegation(
    'future-flourishing',
    'round:future:0001',
    current_setting('qa.b_membership_id')::uuid,
    'qa.delegate.d.revocable'
  );
  cleared := public.clear_mpgf_public_goods_compact_delegation(
    'future-flourishing',
    'round:future:0001',
    'qa.clear.d.revocable'
  );
  replay := public.clear_mpgf_public_goods_compact_delegation(
    'future-flourishing',
    'round:future:0001',
    'qa.clear.d.revocable'
  );

  if created->>'delegationId' is null
    or not (cleared->>'revoked')::boolean
    or cleared <> replay
    or (cleared->>'moneyTransferred')::boolean
    or (cleared->>'membershipTransferred')::boolean
    or (cleared->>'reputationTransferred')::boolean
  then
    raise exception 'Delegation clear was not revocable, idempotent, and transfer-inert.';
  end if;

  begin
    perform public.clear_mpgf_public_goods_compact_delegation(
      'future-flourishing',
      'round:future:changed',
      'qa.clear.d.revocable'
    );
    raise exception 'Changed delegation clear reused an idempotency key.';
  exception when unique_violation then null;
  end;
end;
$test$;
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

-- Repeated exit requests cannot shorten the prospective date, even under a new idempotency key.
set local role authenticated;
select set_config('request.jwt.claim.sub','6a000000-0000-4000-8000-000000000001',true);
select set_config('request.jwt.claim.role','authenticated',true);
do $test$
declare
  replay jsonb;
  second_key jsonb;
  effective_at timestamptz;
begin
  select exit_effective_at into effective_at
  from public.mpgf_public_goods_compact_memberships
  where id = current_setting('qa.a_membership_id')::uuid;

  replay := public.request_mpgf_public_goods_compact_exit(
    'future-flourishing',
    'qa.exit.a.0002'
  );
  second_key := public.request_mpgf_public_goods_compact_exit(
    'future-flourishing',
    'qa.exit.a.0003'
  );

  if (replay->>'exitEffectiveAt')::timestamptz is distinct from effective_at
    or (second_key->>'exitEffectiveAt')::timestamptz is distinct from effective_at
    or (select exit_effective_at
        from public.mpgf_public_goods_compact_memberships
        where id = current_setting('qa.a_membership_id')::uuid) is distinct from effective_at
  then
    raise exception 'Repeated exit shortened or changed the existing prospective exit date.';
  end if;

  begin
    perform public.request_mpgf_public_goods_compact_exit(
      'animal-welfare',
      'qa.exit.a.0002'
    );
    raise exception 'Changed exit request reused an idempotency key.';
  exception when unique_violation then null;
  end;
end;
$test$;
reset role;

-- Exit-notice memberships are inactive delegation endpoints in both directions.
set local role authenticated;
select set_config('request.jwt.claim.sub','6a000000-0000-4000-8000-000000000001',true);
select set_config('request.jwt.claim.role','authenticated',true);
do $test$
begin
  begin
    perform public.set_mpgf_public_goods_compact_delegation(
      'future-flourishing',
      'round:future:0001',
      current_setting('qa.d_membership_id')::uuid,
      'qa.delegate.a.inactive'
    );
    raise exception 'An inactive exit-notice member delegated.';
  exception when insufficient_privilege then null;
  end;
end;
$test$;
reset role;

set local role authenticated;
select set_config('request.jwt.claim.sub','6a000000-0000-4000-8000-000000000002',true);
select set_config('request.jwt.claim.role','authenticated',true);
do $test$
begin
  begin
    perform public.set_mpgf_public_goods_compact_delegation(
      'future-flourishing',
      'round:future:0001',
      current_setting('qa.a_membership_id')::uuid,
      'qa.delegate.b.inactive-target'
    );
    raise exception 'An inactive exit-notice member received delegation.';
  exception when foreign_key_violation then null;
  end;
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
  if public_state::text like '%6a000000-0000-4000-8000-00000000000%'
    or public_state::text like '%compact-a@example.test%'
    or public_state::text like '%declaredEligibleMonthlySpendingCents%'
    or public_state::text like '%scheduledMonthlyContributionCents%'
    or public_state::text like '%acknowledgements%'
  then
    raise exception 'Anonymous public state exposed participant-level private data.';
  end if;

  begin
    perform * from public.mpgf_public_goods_compact_memberships;
    raise exception 'Anonymous role directly read private memberships.';
  exception when insufficient_privilege then null;
  end;

  begin
    perform * from public.mpgf_public_goods_compacts;
    raise exception 'Anonymous role directly read the compact backing table.';
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

-- The compact schema contains no post-activation project-refusal or opt-out state.
do $test$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name like 'mpgf_public_goods_compact%'
      and (
        column_name like '%project%opt%out%'
        or column_name like '%project%refusal%'
      )
  ) then
    raise exception 'Compact schema contains project-level refusal or opt-out state.';
  end if;
end;
$test$;

-- Every compact lifecycle operation remained money-inert across payment-adjacent tables.
do $test$
declare
  snapshot record;
  observed_count bigint;
begin
  for snapshot in select * from qa_compact_money_table_counts loop
    execute pg_catalog.format('select count(*) from public.%I', snapshot.relation_name)
      into observed_count;
    if observed_count is distinct from snapshot.row_count then
      raise exception 'Compact lifecycle changed payment-adjacent table % from % to % rows.',
        snapshot.relation_name,
        snapshot.row_count,
        observed_count;
    end if;
  end loop;
end;
$test$;

select 'MPGF public-goods compact rollback-only lifecycle passed.' as result;
