\set ON_ERROR_STOP on
\getenv qa_user_id CREATE_UAT_USER_ID
\getenv qa_email CREATE_UAT_EMAIL
\getenv qa_run_id CREATE_UAT_RUN_ID

begin;

create temporary table create_uat_cleanup_context (
  user_id uuid primary key,
  email text not null,
  run_id text not null
) on commit drop;

insert into create_uat_cleanup_context (user_id, email, run_id)
values (:'qa_user_id'::uuid, :'qa_email', :'qa_run_id');

do $cleanup_guard$
declare
  context_row create_uat_cleanup_context%rowtype;
begin
  select * into strict context_row from create_uat_cleanup_context;

  perform 1
  from auth.users
  where id = context_row.user_id
    and lower(email) = lower(context_row.email)
    and raw_user_meta_data ->> 'qa_scope' = 'create_production_uat'
    and raw_user_meta_data ->> 'qa_run_id' = context_row.run_id
  for update;

  if not found and exists (
    select 1 from auth.users
    where id = context_row.user_id
       or lower(email) = lower(context_row.email)
  ) then
    raise exception 'Cleanup refused because the matching auth identity is not the scoped Create UAT user.';
  end if;
end;
$cleanup_guard$;

do $cleanup_user$
declare
  context_row create_uat_cleanup_context%rowtype;
  deleted_count integer;
begin
  select * into strict context_row from create_uat_cleanup_context;

  delete from auth.users
  where id = context_row.user_id
    and lower(email) = lower(context_row.email)
    and raw_user_meta_data ->> 'qa_scope' = 'create_production_uat'
    and raw_user_meta_data ->> 'qa_run_id' = context_row.run_id;

  get diagnostics deleted_count = row_count;
  if deleted_count not in (0, 1) then
    raise exception 'Create UAT cleanup deleted % auth rows instead of zero or one.', deleted_count;
  end if;

  if exists (
    select 1 from auth.users
    where id = context_row.user_id
       or lower(email) = lower(context_row.email)
  ) then
    raise exception 'Create UAT auth-user cleanup proof failed.';
  end if;

  if exists (select 1 from auth.identities where user_id = context_row.user_id) then
    raise exception 'Create UAT auth-identity cleanup proof failed.';
  end if;

  if exists (select 1 from auth.mfa_factors where user_id = context_row.user_id) then
    raise exception 'Create UAT MFA-factor cleanup proof failed.';
  end if;

  if exists (select 1 from auth.sessions where user_id = context_row.user_id) then
    raise exception 'Create UAT auth-session cleanup proof failed.';
  end if;

  if exists (
    select 1 from auth.refresh_tokens
    where user_id = context_row.user_id::text
  ) then
    raise exception 'Create UAT refresh-token cleanup proof failed.';
  end if;

  if exists (select 1 from public.profiles where id = context_row.user_id) then
    raise exception 'Create UAT public-profile cleanup proof failed.';
  end if;
end;
$cleanup_user$;

commit;

select jsonb_build_object(
  'userId', context_row.user_id,
  'authRowsRemaining', (
    select count(*) from auth.users where id = context_row.user_id
  ),
  'identityRowsRemaining', (
    select count(*) from auth.identities where user_id = context_row.user_id
  ),
  'profileRowsRemaining', (
    select count(*) from public.profiles where id = context_row.user_id
  ),
  'sessionRowsRemaining', (
    select count(*) from auth.sessions where user_id = context_row.user_id
  ),
  'refreshTokenRowsRemaining', (
    select count(*) from auth.refresh_tokens where user_id = context_row.user_id::text
  ),
  'cleanupPassed', true
)
from create_uat_cleanup_context context_row;
