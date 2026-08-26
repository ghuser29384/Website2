begin;

insert into auth.users (
  id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, confirmation_token, recovery_token,
  email_change_token_new, email_change_token_current, reauthentication_token,
  is_sso_user, is_anonymous, created_at, updated_at
) values
  (
    'a6750000-0000-4000-8000-000000000001',
    '00000000-0000-0000-0000-000000000000',
    'authenticated', 'authenticated', 'activation-a@example.test', '', now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"display_name":"Activation A","qa_fixture":true}'::jsonb,
    '', '', '', '', '', false, false, now(), now()
  ),
  (
    'b6750000-0000-4000-8000-000000000002',
    '00000000-0000-0000-0000-000000000000',
    'authenticated', 'authenticated', 'activation-b@example.test', '', now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"display_name":"Activation B","qa_fixture":true}'::jsonb,
    '', '', '', '', '', false, false, now(), now()
  );

do $test$
begin
  if exists (
    select 1
    from public.profiles
    where id in (
      'a6750000-0000-4000-8000-000000000001',
      'b6750000-0000-4000-8000-000000000002'
    )
      and activation_stage <> 'walkthrough_required'
  ) then
    raise exception 'Post-migration profiles did not receive walkthrough_required.';
  end if;

  if has_column_privilege('authenticated', 'public.profiles', 'activation_stage', 'INSERT')
     or has_column_privilege('authenticated', 'public.profiles', 'activation_stage', 'UPDATE')
     or has_column_privilege('anon', 'public.profiles', 'activation_stage', 'INSERT')
     or has_column_privilege('anon', 'public.profiles', 'activation_stage', 'UPDATE') then
    raise exception 'A direct client role can write profiles.activation_stage.';
  end if;

  if has_function_privilege(
    'authenticated',
    'public.complete_walkthrough_activation_v1(uuid,uuid)',
    'EXECUTE'
  ) or has_function_privilege(
    'authenticated',
    'public.complete_profile_activation_v1(uuid,uuid)',
    'EXECUTE'
  ) then
    raise exception 'Authenticated clients can execute a service-only activation transition.';
  end if;

  if not has_function_privilege(
    'service_role',
    'public.complete_walkthrough_activation_v1(uuid,uuid)',
    'EXECUTE'
  ) or not has_function_privilege(
    'service_role',
    'public.complete_profile_activation_v1(uuid,uuid)',
    'EXECUTE'
  ) then
    raise exception 'The service role cannot execute the narrow activation transitions.';
  end if;
end;
$test$;

set local role authenticated;
select set_config(
  'request.jwt.claim.sub',
  'a6750000-0000-4000-8000-000000000001',
  true
);

do $test$
declare
  denied boolean := false;
begin
  begin
    update public.profiles
    set activation_stage = 'setup_complete'
    where id = 'a6750000-0000-4000-8000-000000000001';
  exception
    when insufficient_privilege then denied := true;
  end;

  if not denied then
    raise exception 'An authenticated direct activation update did not fail.';
  end if;

  denied := false;
  begin
    perform public.complete_walkthrough_activation_v1(
      'a6750000-0000-4000-8000-000000000001',
      'a6750000-0000-4000-8000-000000000001'
    );
  exception
    when insufficient_privilege then denied := true;
  end;

  if not denied then
    raise exception 'An authenticated direct transition RPC did not fail.';
  end if;
end;
$test$;

reset role;
set local role anon;

do $test$
declare
  denied boolean := false;
begin
  begin
    update public.profiles
    set activation_stage = 'setup_complete'
    where id = 'a6750000-0000-4000-8000-000000000001';
  exception
    when insufficient_privilege then denied := true;
  end;

  if not denied then
    raise exception 'An anonymous direct activation update did not fail.';
  end if;

  denied := false;
  begin
    perform public.complete_walkthrough_activation_v1(
      'a6750000-0000-4000-8000-000000000001',
      'a6750000-0000-4000-8000-000000000001'
    );
  exception
    when insufficient_privilege then denied := true;
  end;

  if not denied then
    raise exception 'An anonymous direct transition RPC did not fail.';
  end if;
end;
$test$;

reset role;
set local role service_role;

do $test$
declare
  result_stage text;
begin
  begin
    perform public.complete_walkthrough_activation_v1(
      'a6750000-0000-4000-8000-000000000001',
      'b6750000-0000-4000-8000-000000000002'
    );
    raise exception 'A service transition targeted another profile.';
  exception
    when insufficient_privilege then null;
  end;

  begin
    perform public.complete_profile_activation_v1(
      'b6750000-0000-4000-8000-000000000002',
      'b6750000-0000-4000-8000-000000000002'
    );
    raise exception 'Complete Profile skipped walkthrough_required.';
  exception
    when invalid_parameter_value then null;
  end;

  result_stage := public.complete_walkthrough_activation_v1(
    'a6750000-0000-4000-8000-000000000001',
    'a6750000-0000-4000-8000-000000000001'
  );
  if result_stage <> 'sparks_required' then
    raise exception 'Walkthrough transition returned %.', result_stage;
  end if;

  result_stage := public.complete_walkthrough_activation_v1(
    'a6750000-0000-4000-8000-000000000001',
    'a6750000-0000-4000-8000-000000000001'
  );
  if result_stage <> 'sparks_required' then
    raise exception 'Walkthrough retry was not idempotent.';
  end if;

  result_stage := public.complete_profile_activation_v1(
    'a6750000-0000-4000-8000-000000000001',
    'a6750000-0000-4000-8000-000000000001'
  );
  if result_stage <> 'setup_complete' then
    raise exception 'Complete Profile transition returned %.', result_stage;
  end if;

  result_stage := public.complete_profile_activation_v1(
    'a6750000-0000-4000-8000-000000000001',
    'a6750000-0000-4000-8000-000000000001'
  );
  if result_stage <> 'setup_complete' then
    raise exception 'Complete Profile retry was not idempotent.';
  end if;

  begin
    perform public.complete_walkthrough_activation_v1(
      'a6750000-0000-4000-8000-000000000001',
      'a6750000-0000-4000-8000-000000000001'
    );
    raise exception 'A stale walkthrough transition regressed setup_complete.';
  exception
    when invalid_parameter_value then null;
  end;
end;
$test$;

reset role;

do $test$
begin
  if (select activation_stage from public.profiles where id = 'a6750000-0000-4000-8000-000000000001')
     <> 'setup_complete' then
    raise exception 'The full activation lifecycle did not persist setup_complete.';
  end if;

  if (select activation_stage from public.profiles where id = 'b6750000-0000-4000-8000-000000000002')
     <> 'walkthrough_required' then
    raise exception 'A rejected cross-profile or skip attempt changed the second profile.';
  end if;
end;
$test$;

rollback;
