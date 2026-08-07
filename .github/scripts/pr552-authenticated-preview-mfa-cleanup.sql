\set ON_ERROR_STOP on
\getenv qa_user_id PR552_QA_USER_ID
\getenv qa_email PR552_QA_EMAIL
\getenv qa_run_id PR552_QA_RUN_ID
\getenv qa_factor_id PR552_QA_FACTOR_ID
\getenv qa_factor_name PR552_QA_FACTOR_NAME

begin;

create temporary table pr552_cleanup_context (
  user_id uuid primary key,
  email text not null,
  run_id text not null,
  expected_factor_id uuid,
  expected_factor_name text not null
) on commit drop;

insert into pr552_cleanup_context (
  user_id,
  email,
  run_id,
  expected_factor_id,
  expected_factor_name
) values (
  :'qa_user_id'::uuid,
  :'qa_email',
  :'qa_run_id',
  nullif(:'qa_factor_id', '')::uuid,
  :'qa_factor_name'
);

do $cleanup_factor$
declare
  context_row pr552_cleanup_context%rowtype;
  factor_count integer;
  observed_factor auth.mfa_factors%rowtype;
  deleted_count integer;
begin
  select * into strict context_row from pr552_cleanup_context;

  perform 1
  from auth.users
  where id = context_row.user_id
    and lower(email) = lower(context_row.email)
    and raw_user_meta_data ->> 'qa_scope' = 'pr552_exact_preview_mfa'
    and raw_user_meta_data ->> 'qa_run_id' = context_row.run_id
  for update;

  if not found then
    if exists (
      select 1 from auth.users
      where id = context_row.user_id
         or lower(email) = lower(context_row.email)
    ) then
      raise exception
        'Cleanup refused because the matching auth identity is not the scoped PR552 synthetic user.';
    end if;

    if exists (
      select 1 from auth.mfa_factors where user_id = context_row.user_id
    ) then
      raise exception
        'Cleanup refused because MFA factors exist without the scoped synthetic auth user.';
    end if;

    return;
  end if;

  select count(*)
  into factor_count
  from auth.mfa_factors
  where user_id = context_row.user_id;

  if factor_count > 1 then
    raise exception
      'Cleanup refused: synthetic user has % factors; expected zero or one run-created factor.',
      factor_count;
  end if;

  if factor_count = 1 then
    select *
    into strict observed_factor
    from auth.mfa_factors
    where user_id = context_row.user_id
    for update;

    if observed_factor.friendly_name is distinct from context_row.expected_factor_name then
      raise exception
        'Cleanup refused: the only factor friendly name does not match the run-created factor.';
    end if;

    if context_row.expected_factor_id is not null
      and observed_factor.id <> context_row.expected_factor_id
    then
      raise exception
        'Cleanup refused: the only factor ID does not match the factor captured by the browser test.';
    end if;

    delete from auth.mfa_factors
    where id = observed_factor.id
      and user_id = context_row.user_id;

    get diagnostics deleted_count = row_count;
    if deleted_count <> 1 then
      raise exception
        'Exact factor cleanup deleted % rows instead of one.',
        deleted_count;
    end if;
  end if;

  if exists (
    select 1 from auth.mfa_factors where user_id = context_row.user_id
  ) then
    raise exception
      'Factor cleanup proof failed: the synthetic user still has an MFA factor.';
  end if;
end;
$cleanup_factor$;

do $cleanup_user$
declare
  context_row pr552_cleanup_context%rowtype;
  deleted_count integer;
begin
  select * into strict context_row from pr552_cleanup_context;

  delete from auth.users
  where id = context_row.user_id
    and lower(email) = lower(context_row.email)
    and raw_user_meta_data ->> 'qa_scope' = 'pr552_exact_preview_mfa'
    and raw_user_meta_data ->> 'qa_run_id' = context_row.run_id;

  get diagnostics deleted_count = row_count;

  if deleted_count not in (0, 1) then
    raise exception
      'Synthetic user cleanup deleted % rows instead of zero or one.',
      deleted_count;
  end if;

  if exists (
    select 1 from auth.users
    where id = context_row.user_id
       or lower(email) = lower(context_row.email)
  ) then
    raise exception 'Synthetic auth user cleanup proof failed.';
  end if;

  if exists (
    select 1 from auth.identities where user_id = context_row.user_id
  ) then
    raise exception 'Synthetic auth identity cleanup proof failed.';
  end if;

  if exists (
    select 1 from auth.mfa_factors where user_id = context_row.user_id
  ) then
    raise exception 'Synthetic MFA factor cleanup proof failed.';
  end if;

  if exists (
    select 1 from auth.sessions where user_id = context_row.user_id
  ) then
    raise exception 'Synthetic auth session cleanup proof failed.';
  end if;

  if exists (
    select 1 from auth.refresh_tokens
    where user_id = context_row.user_id::text
  ) then
    raise exception 'Synthetic refresh-token cleanup proof failed.';
  end if;

  if exists (
    select 1 from public.profiles where id = context_row.user_id
  ) then
    raise exception 'Synthetic public profile cleanup proof failed.';
  end if;
end;
$cleanup_user$;

commit;

select jsonb_build_object(
  'userId', context_row.user_id,
  'factorIdProvided', context_row.expected_factor_id is not null,
  'factorRowsRemaining', (
    select count(*) from auth.mfa_factors where user_id = context_row.user_id
  ),
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
from (
  values (:'qa_user_id'::uuid, nullif(:'qa_factor_id', '')::uuid)
) as context_row(user_id, expected_factor_id);
