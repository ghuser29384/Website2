\set ON_ERROR_STOP on
\getenv qa_password COMPACT_UAT_PASSWORD

begin;

do $guard$
begin
  if exists (
    select 1
    from auth.users
    where id in (
      '712a0000-0000-4000-8000-000000000001',
      '712b0000-0000-4000-8000-000000000002',
      '712c0000-0000-4000-8000-000000000003'
    )
      or email like 'compact-uat712-%@qa.invalid'
  ) then
    raise exception 'Refusing to overwrite a pre-existing Compact UAT identity.';
  end if;
  if exists (
    select 1
    from public.profiles
    where id in (
      '712a0000-0000-4000-8000-000000000001',
      '712b0000-0000-4000-8000-000000000002',
      '712c0000-0000-4000-8000-000000000003'
    )
      or email like 'compact-uat712-%@qa.invalid'
  ) then
    raise exception 'Refusing to overwrite a pre-existing Compact UAT profile.';
  end if;
end;
$guard$;

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
  actor.id,
  '00000000-0000-0000-0000-000000000000'::uuid,
  'authenticated',
  'authenticated',
  actor.email,
  extensions.crypt(:'qa_password', extensions.gen_salt('bf')),
  pg_catalog.now(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  pg_catalog.jsonb_build_object(
    'display_name', actor.role_label,
    'qa_fixture', 'compact-uat712-isolated-qa',
    'synthetic_only', true
  ),
  '', '', '', '', '', '', false, false, pg_catalog.now(), pg_catalog.now()
from (
  values
    ('712a0000-0000-4000-8000-000000000001'::uuid, 'compact-uat712-member-a@qa.invalid', 'member-a'),
    ('712b0000-0000-4000-8000-000000000002'::uuid, 'compact-uat712-member-b@qa.invalid', 'member-b'),
    ('712c0000-0000-4000-8000-000000000003'::uuid, 'compact-uat712-outsider@qa.invalid', 'outsider')
) as actor(id, email, role_label);

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
  actor.id::text,
  actor.id,
  pg_catalog.jsonb_build_object(
    'sub', actor.id::text,
    'email', actor.email,
    'email_verified', true
  ),
  'email',
  pg_catalog.now(),
  pg_catalog.now(),
  pg_catalog.now()
from (
  values
    ('712a0000-0000-4000-8000-000000000001'::uuid, 'compact-uat712-member-a@qa.invalid'),
    ('712b0000-0000-4000-8000-000000000002'::uuid, 'compact-uat712-member-b@qa.invalid'),
    ('712c0000-0000-4000-8000-000000000003'::uuid, 'compact-uat712-outsider@qa.invalid')
) as actor(id, email);

insert into public.profiles (
  id,
  email,
  display_name,
  bio,
  affiliation
)
values
  ('712a0000-0000-4000-8000-000000000001', 'compact-uat712-member-a@qa.invalid', 'member-a', '', 'Isolated synthetic QA'),
  ('712b0000-0000-4000-8000-000000000002', 'compact-uat712-member-b@qa.invalid', 'member-b', '', 'Isolated synthetic QA'),
  ('712c0000-0000-4000-8000-000000000003', 'compact-uat712-outsider@qa.invalid', 'outsider', '', 'Isolated synthetic QA')
on conflict (id) do update
set email = excluded.email,
    display_name = excluded.display_name,
    bio = excluded.bio,
    affiliation = excluded.affiliation;

do $proof$
begin
  if (
    select count(*)
    from auth.users
    where id in (
      '712a0000-0000-4000-8000-000000000001',
      '712b0000-0000-4000-8000-000000000002',
      '712c0000-0000-4000-8000-000000000003'
    )
      and raw_user_meta_data ->> 'qa_fixture' = 'compact-uat712-isolated-qa'
      and raw_user_meta_data ->> 'synthetic_only' = 'true'
  ) <> 3 then
    raise exception 'The exact three synthetic Auth identities were not created.';
  end if;
  if (
    select count(*)
    from public.profiles
    where id in (
      '712a0000-0000-4000-8000-000000000001',
      '712b0000-0000-4000-8000-000000000002',
      '712c0000-0000-4000-8000-000000000003'
    )
  ) <> 3 then
    raise exception 'The exact three synthetic profiles were not created.';
  end if;
end;
$proof$;

commit;
