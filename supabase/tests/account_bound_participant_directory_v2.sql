begin;

-- Synthetic fixtures. The surrounding transaction rolls every record and DDL change back.
insert into auth.users (
  id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, confirmation_token, recovery_token,
  email_change_token_new, email_change_token_current, reauthentication_token,
  is_sso_user, is_anonymous, created_at, updated_at
) values
  ('8a000000-0000-4000-8000-000000000001','00000000-0000-0000-0000-000000000000','authenticated','authenticated','abpp-actor@example.test','',now(),'{}','{}','','','','','',false,false,now(),now()),
  ('8a000000-0000-4000-8000-000000000002','00000000-0000-0000-0000-000000000000','authenticated','authenticated','abpp-person@example.test','',now(),'{}','{}','','','','','',false,false,now(),now()),
  ('8a000000-0000-4000-8000-000000000003','00000000-0000-0000-0000-000000000000','authenticated','authenticated','abpp-org@example.test','',now(),'{}','{}','','','','','',false,false,now(),now()),
  ('8a000000-0000-4000-8000-000000000004','00000000-0000-0000-0000-000000000000','authenticated','authenticated','abpp-blocked@example.test','',now(),'{}','{}','','','','','',false,false,now(),now()),
  ('8a000000-0000-4000-8000-000000000005','00000000-0000-0000-0000-000000000000','authenticated','authenticated','abpp-safety@example.test','',now(),'{}','{}','','','','','',false,false,now(),now()),
  ('8a000000-0000-4000-8000-000000000006','00000000-0000-0000-0000-000000000000','authenticated','authenticated','abpp-noinvites@example.test','',now(),'{}','{}','','','','','',false,false,now(),now()),
  ('8a000000-0000-4000-8000-000000000007','00000000-0000-0000-0000-000000000000','authenticated','authenticated','abpp-contact@example.test','',now(),'{}','{}','','','','','',false,false,now(),now()),
  ('8a000000-0000-4000-8000-000000000008','00000000-0000-0000-0000-000000000000','authenticated','authenticated','abpp-phone@example.test','',now(),'{}','{}','','','','','',false,false,now(),now()),
  ('8a000000-0000-4000-8000-000000000009','00000000-0000-0000-0000-000000000000','authenticated','authenticated','abpp-nousername@example.test','',now(),'{}','{}','','','','','',false,false,now(),now()),
  ('8a000000-0000-4000-8000-000000000010','00000000-0000-0000-0000-000000000000','authenticated','authenticated','abpp-reuse@example.test','',now(),'{}','{}','','','','','',false,false,now(),now());

insert into public.profiles (
  id, email, display_name, bio, affiliation, username, account_kind,
  accepts_group_invitations, public_invitation_mentions_enabled
) values
  ('8a000000-0000-4000-8000-000000000001','abpp-actor@example.test','Actor Person','','','@Actor-One','individual',true,true),
  ('8a000000-0000-4000-8000-000000000002','abpp-person@example.test','Alex Person','','','Alex-Person','individual',true,true),
  ('8a000000-0000-4000-8000-000000000003','abpp-org@example.test','Future Org','','','future-org','organization',true,false),
  ('8a000000-0000-4000-8000-000000000004','abpp-blocked@example.test','Blocked Person','','','blocked-person','individual',true,true),
  ('8a000000-0000-4000-8000-000000000005','abpp-safety@example.test','Safety Blocked','','','safety-blocked','individual',true,true),
  ('8a000000-0000-4000-8000-000000000006','abpp-noinvites@example.test','No Invites','','','no-invites','individual',false,true),
  ('8a000000-0000-4000-8000-000000000007','abpp-contact@example.test','private@example.test','','','private-name','individual',true,true),
  ('8a000000-0000-4000-8000-000000000008','abpp-phone@example.test','+1 (555) 123-4567','','','phone-person','individual',true,true),
  ('8a000000-0000-4000-8000-000000000009','abpp-nousername@example.test','No Username','','',null,'individual',true,true);

insert into public.wish_profiles (profile_id, participant_kind, safety_status)
values
  ('8a000000-0000-4000-8000-000000000003','institution','clear'),
  ('8a000000-0000-4000-8000-000000000005','individual','blocked');

insert into public.profile_verification_badges (profile_id, badge_type, status)
values
  ('8a000000-0000-4000-8000-000000000002','identity_verified','verified'),
  ('8a000000-0000-4000-8000-000000000003','organization_verified','verified');

insert into public.trade_blocks (blocker_id, blocked_id, reason)
values ('8a000000-0000-4000-8000-000000000001','8a000000-0000-4000-8000-000000000004','abpp-preflight');

do $test$
declare
  v_count integer;
  v_text text;
  denied boolean := false;
begin
  if (select username from public.profiles where id='8a000000-0000-4000-8000-000000000001') <> 'actor-one' then
    raise exception 'explicit username was not normalized';
  end if;
  if (select username from public.profiles where id='8a000000-0000-4000-8000-000000000009') is not null then
    raise exception 'missing username was generated';
  end if;
  if exists (select 1 from public.profile_username_claims where profile_id='8a000000-0000-4000-8000-000000000009') then
    raise exception 'missing username received a claim';
  end if;
  if (select count(*) from public.profile_username_claims where profile_id='8a000000-0000-4000-8000-000000000001' and username='actor-one' and is_current) <> 1 then
    raise exception 'initial username claim missing';
  end if;

  begin
    update public.profiles set username='admin' where id='8a000000-0000-4000-8000-000000000001';
    raise exception 'reserved username was accepted';
  exception when check_violation then null;
  end;

  begin
    update public.profiles set username='bad--name' where id='8a000000-0000-4000-8000-000000000001';
    raise exception 'malformed username was accepted';
  exception when check_violation then null;
  end;

  begin
    update public.profiles set username='alex-person' where id='8a000000-0000-4000-8000-000000000001';
    raise exception 'duplicate current username was accepted';
  exception when unique_violation then null;
  end;

  update public.profiles set username='actor-two' where id='8a000000-0000-4000-8000-000000000001';
  if not exists (select 1 from public.profile_username_claims where username='actor-one' and profile_id='8a000000-0000-4000-8000-000000000001' and not is_current and superseded_at is not null) then
    raise exception 'former username was not reserved';
  end if;
  if not exists (select 1 from public.profile_username_claims where username='actor-two' and profile_id='8a000000-0000-4000-8000-000000000001' and is_current and superseded_at is null) then
    raise exception 'renamed username was not current';
  end if;

  begin
    insert into public.profiles (id,email,display_name,bio,affiliation,username)
    values ('8a000000-0000-4000-8000-000000000010','abpp-reuse@example.test','Reuse Attempt','','','actor-one');
    raise exception 'former username was reusable by a different profile';
  exception when unique_violation then null;
  end;

  if has_table_privilege('authenticated','public.profile_username_claims','select')
     or has_table_privilege('anon','public.profile_username_claims','select') then
    raise exception 'username claim ledger is publicly readable';
  end if;
  if not has_table_privilege('service_role','public.profile_username_claims','select') then
    raise exception 'service role cannot read username claim ledger';
  end if;
  if has_function_privilege('authenticated','public.search_create_participants_v2(uuid,text,integer)','execute')
     or has_function_privilege('anon','public.search_create_participants_v2(uuid,text,integer)','execute') then
    raise exception 'participant search RPC is exposed to clients';
  end if;
  if not has_function_privilege('service_role','public.search_create_participants_v2(uuid,text,integer)','execute') then
    raise exception 'service role cannot execute participant search';
  end if;
  if not has_function_privilege('authenticated','public.normalize_profile_username_v1(text)','execute')
     or not has_function_privilege('authenticated','public.profile_username_is_reserved_v1(text)','execute') then
    raise exception 'authenticated profile owners cannot execute username constraint helpers';
  end if;
  if has_function_privilege('anon','public.normalize_profile_username_v1(text)','execute')
     or has_function_privilege('anon','public.profile_username_is_reserved_v1(text)','execute') then
    raise exception 'anonymous role can execute username constraint helpers';
  end if;
  if to_regprocedure('public.search_create_participants_v1(uuid,text,text,uuid,integer)') is not null
     or to_regprocedure('public.resolve_create_participants_v1(uuid,uuid[])') is not null then
    raise exception 'retired v1 participant RPCs remain';
  end if;
end;
$test$;

-- Prove RLS limits profile username changes to the authenticated owner.
set local role authenticated;
select set_config('request.jwt.claim.sub','8a000000-0000-4000-8000-000000000001',true);
select set_config('request.jwt.claim.role','authenticated',true);
update public.profiles set username='hijacked-name' where id='8a000000-0000-4000-8000-000000000002';
update public.profiles set username='actor-three' where id='8a000000-0000-4000-8000-000000000001';
reset role;

do $test$
begin
  if (select username from public.profiles where id='8a000000-0000-4000-8000-000000000002') <> 'alex-person' then
    raise exception 'RLS allowed cross-profile username mutation';
  end if;
  if (select username from public.profiles where id='8a000000-0000-4000-8000-000000000001') <> 'actor-three' then
    raise exception 'RLS prevented owner username mutation';
  end if;
  if not exists (select 1 from public.profile_username_claims where username='actor-two' and not is_current) then
    raise exception 'owner rename did not reserve prior username';
  end if;
end;
$test$;

-- The function must deny non-service JWT roles even when invoked by the migration owner.
select set_config('request.jwt.claim.role','authenticated',true);
do $test$
begin
  begin
    perform * from public.search_create_participants_v2('8a000000-0000-4000-8000-000000000001','alex',12);
    raise exception 'participant search accepted authenticated role';
  exception when insufficient_privilege then null;
  end;
end;
$test$;

select set_config('request.jwt.claim.role','service_role',true);

do $test$
declare
  row_record record;
  v_count integer;
begin
  select * into row_record
  from public.search_create_participants_v2('8a000000-0000-4000-8000-000000000001','alex',12);
  if row_record.profile_id <> '8a000000-0000-4000-8000-000000000002'::uuid
     or row_record.username <> 'alex-person'
     or row_record.display_name <> 'Alex Person'
     or row_record.account_type <> 'individual'
     or row_record.verification <> 'identity-verified'
     or row_record.public_invitation_mentions_enabled is not true then
    raise exception 'individual participant search returned wrong public identity: %', row_record;
  end if;

  select * into row_record
  from public.search_create_participants_v2('8a000000-0000-4000-8000-000000000001','future',12);
  if row_record.profile_id <> '8a000000-0000-4000-8000-000000000003'::uuid
     or row_record.account_type <> 'organization'
     or row_record.verification <> 'organization-verified'
     or row_record.public_invitation_mentions_enabled is not false then
    raise exception 'organization or private-mention search contract failed: %', row_record;
  end if;

  select * into row_record
  from public.search_create_participants_v2('8a000000-0000-4000-8000-000000000001','private',12);
  if row_record.display_name <> '@private-name' or position('@example' in row_record.display_name) > 0 then
    raise exception 'email-like display name leaked: %', row_record;
  end if;

  select * into row_record
  from public.search_create_participants_v2('8a000000-0000-4000-8000-000000000001','phone',12);
  if row_record.display_name <> '@phone-person' or row_record.display_name ~ '[0-9]{7}' then
    raise exception 'phone-like display name leaked: %', row_record;
  end if;

  select count(*) into v_count
  from public.search_create_participants_v2('8a000000-0000-4000-8000-000000000001','a',12);
  if v_count <> 0 then raise exception 'short query returned candidates'; end if;

  select count(*) into v_count
  from public.search_create_participants_v2('8a000000-0000-4000-8000-000000000001','actor-three',12);
  if v_count <> 0 then raise exception 'participant search returned creator'; end if;

  select count(*) into v_count
  from public.search_create_participants_v2('8a000000-0000-4000-8000-000000000001','blocked',12);
  if v_count <> 0 then raise exception 'trade-blocked participant remained searchable'; end if;

  select count(*) into v_count
  from public.search_create_participants_v2('8a000000-0000-4000-8000-000000000001','safety',12);
  if v_count <> 0 then raise exception 'safety-blocked participant remained searchable'; end if;

  select count(*) into v_count
  from public.search_create_participants_v2('8a000000-0000-4000-8000-000000000001','no-invites',12);
  if v_count <> 0 then raise exception 'invitation-disabled participant remained searchable'; end if;

  select count(*) into v_count
  from public.search_create_participants_v2('8a000000-0000-4000-8000-000000000001','no username',12);
  if v_count <> 0 then raise exception 'account without username remained searchable'; end if;

  select count(*) into v_count
  from public.resolve_create_participants_v2(
    '8a000000-0000-4000-8000-000000000001',
    array[
      '8a000000-0000-4000-8000-000000000001'::uuid,
      '8a000000-0000-4000-8000-000000000002'::uuid,
      '8a000000-0000-4000-8000-000000000004'::uuid,
      '8a000000-0000-4000-8000-000000000005'::uuid,
      '8a000000-0000-4000-8000-000000000006'::uuid
    ]
  );
  if v_count <> 2 then
    raise exception 'canonical resolver did not retain exactly creator and available account: %', v_count;
  end if;

  if exists (
    select 1
    from information_schema.columns
    where table_schema='public'
      and table_name in ('public_profile_cards_v1')
      and column_name in ('email','phone')
  ) then
    raise exception 'public profile card exposes contact fields';
  end if;
end;
$test$;

rollback;
