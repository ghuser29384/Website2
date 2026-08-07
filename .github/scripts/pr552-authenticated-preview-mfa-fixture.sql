\set ON_ERROR_STOP on
\getenv qa_password PR552_QA_PASSWORD
\getenv qa_user_id PR552_QA_USER_ID
\getenv qa_email PR552_QA_EMAIL
\getenv qa_run_id PR552_QA_RUN_ID

begin;

create temporary table pr552_qa_context (
  user_id uuid primary key,
  email text not null,
  run_id text not null
) on commit drop;

insert into pr552_qa_context (user_id, email, run_id)
values (:'qa_user_id'::uuid, :'qa_email', :'qa_run_id');

do $fixture_guard$
declare
  context_row pr552_qa_context%rowtype;
  existing_count integer;
begin
  select * into strict context_row from pr552_qa_context;

  select count(*)
  into existing_count
  from auth.users
  where id = context_row.user_id
     or lower(email) = lower(context_row.email);

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
)
select
  context_row.user_id,
  '00000000-0000-0000-0000-000000000000'::uuid,
  'authenticated',
  'authenticated',
  context_row.email,
  extensions.crypt(:'qa_password', extensions.gen_salt('bf')),
  now(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  jsonb_build_object(
    'display_name', 'PR552 exact Preview MFA QA',
    'full_name', 'PR552 exact Preview MFA QA',
    'qa_scope', 'pr552_exact_preview_mfa',
    'qa_run_id', context_row.run_id
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
from pr552_qa_context context_row;

insert into auth.identities (
  provider_id,
  user_id,
  identity_data,
  provider,
  last_sign_in_at,
  created_at,
  updated_at
)
select
  context_row.user_id::text,
  context_row.user_id,
  jsonb_build_object(
    'sub', context_row.user_id::text,
    'email', context_row.email,
    'email_verified', true
  ),
  'email',
  now(),
  now(),
  now()
from pr552_qa_context context_row;

do $fixture_proof$
declare
  context_row pr552_qa_context%rowtype;
  auth_count integer;
  identity_count integer;
  profile_count integer;
  factor_count integer;
begin
  select * into strict context_row from pr552_qa_context;

  select count(*) into auth_count
  from auth.users
  where id = context_row.user_id
    and lower(email) = lower(context_row.email)
    and email_confirmed_at is not null
    and raw_user_meta_data ->> 'qa_scope' = 'pr552_exact_preview_mfa'
    and raw_user_meta_data ->> 'qa_run_id' = context_row.run_id;

  select count(*) into identity_count
  from auth.identities
  where user_id = context_row.user_id
    and provider = 'email'
    and provider_id = context_row.user_id::text;

  select count(*) into profile_count
  from public.profiles
  where id = context_row.user_id
    and lower(email) = lower(context_row.email);

  select count(*) into factor_count
  from auth.mfa_factors
  where user_id = context_row.user_id;

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
