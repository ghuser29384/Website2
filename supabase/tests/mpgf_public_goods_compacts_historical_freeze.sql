-- Runs after the main compact lifecycle in the same rollback-only workflow transaction.

insert into auth.users (
  id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, confirmation_token, recovery_token,
  email_change_token_new, email_change_token_current, reauthentication_token,
  is_sso_user, is_anonymous, created_at, updated_at
) values (
  '6a000000-0000-4000-8000-000000000005',
  '00000000-0000-0000-0000-000000000000',
  'authenticated',
  'authenticated',
  'compact-e@example.test',
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
);

insert into public.profiles (
  id, email, display_name, bio, affiliation, username, account_kind,
  accepts_group_invitations, public_invitation_mentions_enabled
) values (
  '6a000000-0000-4000-8000-000000000005',
  'compact-e@example.test',
  'Compact E',
  '',
  '',
  'compact-e',
  'individual',
  true,
  true
);

set local role authenticated;
select set_config('request.jwt.claim.sub','6a000000-0000-4000-8000-000000000005',true);
select set_config('request.jwt.claim.role','authenticated',true);

do $test$
declare
  join_response jsonb;
  exit_response jsonb;
begin
  join_response := public.join_mpgf_public_goods_compact(
    'global-health',
    'mpgf-public-goods-compact/founding-v1',
    25000,
    '{"voluntaryChoice":true,"exactConstitution":true,"activationAndNoProjectOptOut":true,"noPaymentMandate":true}'::jsonb,
    'qa.join.e.0001'
  );
  exit_response := public.request_mpgf_public_goods_compact_exit(
    'global-health',
    'qa.exit.e.0001'
  );

  if join_response->>'membershipStatus' <> 'pending_activation'
    or exit_response->>'membershipStatus' <> 'revoked'
    or not (exit_response->>'revokedImmediately')::boolean
  then
    raise exception 'Historical-freeze fixture did not complete join and recruiting revocation.';
  end if;
end;
$test$;
reset role;

do $test$
begin
  if (
    select accepted_member_count
    from public.mpgf_public_goods_compacts
    where public_key = 'global-health'
  ) <> 0 then
    raise exception 'Revoked recruiting acceptance did not return the current count to zero.';
  end if;
  if not exists (
    select 1
    from public.mpgf_public_goods_compact_memberships
    where user_id = '6a000000-0000-4000-8000-000000000005'
      and status = 'revoked'
  ) then
    raise exception 'Revoked acceptance history was not retained.';
  end if;

  begin
    update public.mpgf_public_goods_compacts
    set summary = 'A replacement summary after all current members revoked.'
    where public_key = 'global-health';
    raise exception 'Historically accepted constitutional terms became mutable at zero current members.';
  exception when check_violation then null;
  end;
end;
$test$;

select 'Historical compact acceptance permanently freezes published terms.' as result;
