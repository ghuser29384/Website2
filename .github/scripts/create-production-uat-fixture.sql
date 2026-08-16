\set ON_ERROR_STOP on
\getenv qa_password CREATE_UAT_PASSWORD
\getenv qa_user_id CREATE_UAT_USER_ID
\getenv qa_email CREATE_UAT_EMAIL
\getenv qa_run_id CREATE_UAT_RUN_ID

begin;

create temporary table create_uat_context (
  user_id uuid primary key,
  email text not null,
  run_id text not null
) on commit drop;

insert into create_uat_context (user_id, email, run_id)
values (:'qa_user_id'::uuid, :'qa_email', :'qa_run_id');

do $fixture_guard$
declare
  context_row create_uat_context%rowtype;
  existing_count integer;
begin
  select * into strict context_row from create_uat_context;

  select count(*)
  into existing_count
  from auth.users
  where id = context_row.user_id
     or lower(email) = lower(context_row.email);

  if existing_count <> 0 then
    raise exception 'Refusing to overwrite an existing production auth identity for Create UAT.';
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
    'display_name', 'Create production UAT',
    'full_name', 'Create production UAT',
    'qa_scope', 'create_production_uat',
    'qa_run_id', context_row.run_id
  ),
  '', '', '', '', '', '',
  false,
  false,
  now(),
  now()
from create_uat_context context_row;

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
from create_uat_context context_row;

do $fixture_proof$
declare
  context_row create_uat_context%rowtype;
  auth_count integer;
  identity_count integer;
  profile_count integer;
begin
  select * into strict context_row from create_uat_context;

  select count(*) into auth_count
  from auth.users
  where id = context_row.user_id
    and lower(email) = lower(context_row.email)
    and email_confirmed_at is not null
    and raw_user_meta_data ->> 'qa_scope' = 'create_production_uat'
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

  if auth_count <> 1 or identity_count <> 1 or profile_count <> 1 then
    raise exception
      'Create UAT fixture was not created exactly once (auth %, identity %, profile %).',
      auth_count,
      identity_count,
      profile_count;
  end if;
end;
$fixture_proof$;

commit;

select jsonb_build_object(
  'userId', :'qa_user_id'::uuid,
  'scope', 'create_production_uat',
  'fixturePassed', true
);
