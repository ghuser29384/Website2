begin;

-- Issue #675 activation authority. The ACCESS EXCLUSIVE lock acquired by the
-- first ALTER is held through COMMIT, so an auth-trigger profile insert cannot
-- land between the grandfathering update and the new-row default.
alter table public.profiles
  add column activation_stage text;

update public.profiles
set activation_stage = 'setup_complete';

alter table public.profiles
  alter column activation_stage set default 'walkthrough_required',
  alter column activation_stage set not null,
  add constraint profiles_activation_stage_check
    check (
      activation_stage in (
        'walkthrough_required',
        'sparks_required',
        'setup_complete'
      )
    );

comment on column public.profiles.activation_stage is
  'Sole persisted authority for account activation routing. Existing rows were grandfathered to setup_complete by migration 20260814042516.';

-- Preserve the existing owner-scoped profile writes without allowing a client
-- to name activation_stage in INSERT or UPDATE. Table-level privileges would
-- include future columns, so replace them with an explicit column allow-list.
revoke insert, update on table public.profiles from anon, authenticated;

grant insert (
  id,
  email,
  display_name,
  username,
  public_invitation_mentions_enabled,
  avatar_url,
  account_kind,
  accepts_group_invitations,
  organization_approval_count,
  affiliation,
  city,
  region,
  country,
  public_location_granularity,
  bio,
  follower_count,
  following_count,
  karma,
  comment_count,
  rating_avg,
  rating_count,
  offer_count,
  created_at
) on public.profiles to authenticated;

grant update (
  email,
  display_name,
  username,
  public_invitation_mentions_enabled,
  avatar_url,
  account_kind,
  accepts_group_invitations,
  organization_approval_count,
  affiliation,
  city,
  region,
  country,
  public_location_granularity,
  bio,
  follower_count,
  following_count,
  karma,
  comment_count,
  rating_avg,
  rating_count,
  offer_count,
  created_at
) on public.profiles to authenticated;

grant all on table public.profiles to service_role;

create function public.complete_walkthrough_activation_v1(
  p_actor_profile_id uuid,
  p_profile_id uuid
)
returns text
language plpgsql
security definer
set search_path = ''
as $function$
declare
  current_stage text;
begin
  if p_actor_profile_id is null or p_profile_id is null then
    raise exception using
      errcode = '22004',
      message = 'Actor and target profile ids are required.';
  end if;

  if p_actor_profile_id is distinct from p_profile_id then
    raise exception using
      errcode = '42501',
      message = 'An activation transition cannot target another profile.';
  end if;

  select profiles.activation_stage
  into current_stage
  from public.profiles as profiles
  where profiles.id = p_profile_id
  for update;

  if not found then
    raise exception using
      errcode = 'P0002',
      message = 'The activation profile was not found.';
  end if;

  if current_stage = 'sparks_required' then
    return current_stage;
  end if;

  if current_stage <> 'walkthrough_required' then
    raise exception using
      errcode = '22023',
      message = 'Walkthrough completion cannot advance this activation stage.';
  end if;

  update public.profiles as profiles
  set activation_stage = 'sparks_required'
  where profiles.id = p_profile_id
    and profiles.activation_stage = 'walkthrough_required';

  if not found then
    raise exception using
      errcode = '40001',
      message = 'The activation stage changed concurrently. Retry from persisted state.';
  end if;

  return 'sparks_required';
end;
$function$;

create function public.complete_profile_activation_v1(
  p_actor_profile_id uuid,
  p_profile_id uuid
)
returns text
language plpgsql
security definer
set search_path = ''
as $function$
declare
  current_stage text;
begin
  if p_actor_profile_id is null or p_profile_id is null then
    raise exception using
      errcode = '22004',
      message = 'Actor and target profile ids are required.';
  end if;

  if p_actor_profile_id is distinct from p_profile_id then
    raise exception using
      errcode = '42501',
      message = 'An activation transition cannot target another profile.';
  end if;

  select profiles.activation_stage
  into current_stage
  from public.profiles as profiles
  where profiles.id = p_profile_id
  for update;

  if not found then
    raise exception using
      errcode = 'P0002',
      message = 'The activation profile was not found.';
  end if;

  if current_stage = 'setup_complete' then
    return current_stage;
  end if;

  if current_stage <> 'sparks_required' then
    raise exception using
      errcode = '22023',
      message = 'Profile completion cannot skip the walkthrough stage.';
  end if;

  update public.profiles as profiles
  set activation_stage = 'setup_complete'
  where profiles.id = p_profile_id
    and profiles.activation_stage = 'sparks_required';

  if not found then
    raise exception using
      errcode = '40001',
      message = 'The activation stage changed concurrently. Retry from persisted state.';
  end if;

  return 'setup_complete';
end;
$function$;

revoke all on function public.complete_walkthrough_activation_v1(uuid, uuid)
  from public, anon, authenticated;
revoke all on function public.complete_profile_activation_v1(uuid, uuid)
  from public, anon, authenticated;
grant execute on function public.complete_walkthrough_activation_v1(uuid, uuid)
  to service_role;
grant execute on function public.complete_profile_activation_v1(uuid, uuid)
  to service_role;

comment on function public.complete_walkthrough_activation_v1(uuid, uuid) is
  'Service-only, row-locked walkthrough_required to sparks_required transition for Issue #675.';
comment on function public.complete_profile_activation_v1(uuid, uuid) is
  'Service-only, row-locked sparks_required to setup_complete transition for Issue #675.';

commit;
