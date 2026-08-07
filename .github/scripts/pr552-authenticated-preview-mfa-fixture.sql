\set ON_ERROR_STOP on
\getenv qa_password PR552_QA_PASSWORD
\getenv qa_user_id PR552_QA_USER_ID
\getenv qa_email PR552_QA_EMAIL
\getenv qa_run_id PR552_QA_RUN_ID

begin;

do $fixture_guard$
declare
  existing_count integer;
begin
  select count(*)
  into existing_count
  from auth.users
  where id = :'qa_user_id'::uuid
     or lower(email) = lower(:'qa_email');

  if existing_count <> 0 then
    raise exception
      'Refusing to overwrite an existing auth identity for PR552 synthetic MFA QA.';
  end if;
end;
$fixture_guard$;

insert into auth.users (
  id,
  instance_id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  confirmation_token,
  recovery_token,
  email_change,
  email_change_token_new,
  email_change_token_current,
  reauthentication_token,
  is_sso_user,
  is_anonymous,
  created_at,
  updated_at
) values (
  :'qa_user_id'::uuid,
  '00000000-0000-0000-0000-000000000000'::uuid,
  'authenticated',
  'authenticated',
  :'qa_email',
  extensions.crypt(:'qa_password', extensions.gen_salt('bf')),
  now(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  jsonb_build_object(
    'display_name', 'PR552 exact Preview MFA QA',
    'full_name', 'PR552 exact Preview MFA QA',
    'qa_scope', 'pr552_exact_preview_mfa',
    'qa_run_id', :'qa_run_id'
  ),
  '',
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

insert into auth.identities (
  provider_id,
  user_id,
  identity_data,
  provider,
  last_sign_in_at,
  created_at,
  updated_at
) values (
  :'qa_user_id',
  :'qa_user_id'::uuid,
  jsonb_build_object(
    'sub', :'qa_user_id',
    'email', :'qa_email',
    'email_verified', true
  ),
  'email',
  now(),
  now(),
  now()
);

do $fixture_proof$
declare
  auth_count integer;
  identity_count integer;
  profile_count integer;
  factor_count integer;
begin
  select count(*) into auth_count
  from auth.users
  where id = :'qa_user_id'::uuid
    and lower(email) = lower(:'qa_email')
    and email_confirmed_at is not null
    and raw_user_meta_data ->> 'qa_scope' = 'pr552_exact_preview_mfa'
    and raw_user_meta_data ->> 'qa_run_id' = :'qa_run_id';

  select count(*) into identity_count
  from auth.identities
  where user_id = :'qa_user_id'::uuid
    and provider = 'email'
    and provider_id = :'qa_user_id';

  select count(*) into profile_count
  from public.profiles
  where id = :'qa_user_id'::uuid
    and lower(email) = lower(:'qa_email');

  select count(*) into factor_count
  from auth.mfa_factors
  where user_id = :'qa_user_id'::uuid;

  if auth_count <> 1 or identity_count <> 1 or profile_count <> 1 then
    raise exception
      'Synthetic PR552 auth fixture was not created exactly once (auth %, identity %, profile %).',
      auth_count,
      identity_count,
      profile_count;
  end if;

  if factor_count <> 0 then
    raise exception
      'Fresh PR552 synthetic auth fixture unexpectedly has % MFA factor(s).',
      factor_count;
  end if;
end;
$fixture_proof$;

commit;
