begin;

create or replace function public.profile_priority_allocation_is_valid(value jsonb)
returns boolean
language plpgsql
immutable
strict
set search_path = pg_catalog
as $$
declare
  item jsonb;
  item_id text;
  item_sparks integer;
  seen_ids text[] := '{}'::text[];
  total_sparks integer := 0;
  allowed_ids constant text[] := array[
    'ai-safety',
    'global-health',
    'factory-farming',
    'future-flourishing',
    'biosecurity',
    'democratic-institutions',
    'wild-animal-welfare',
    'climate',
    'global-poverty',
    's-risks',
    'cause-prioritization',
    'space-governance'
  ]::text[];
begin
  if jsonb_typeof(value) <> 'array'
     or jsonb_array_length(value) < 1
     or jsonb_array_length(value) > 12 then
    return false;
  end if;

  for item in select element from jsonb_array_elements(value) as entries(element)
  loop
    if jsonb_typeof(item) <> 'object'
       or not (item ? 'id')
       or not (item ? 'sparks')
       or jsonb_typeof(item -> 'sparks') <> 'number'
       or (item ->> 'sparks') !~ '^[0-9]+$' then
      return false;
    end if;

    item_id := item ->> 'id';
    item_sparks := (item ->> 'sparks')::integer;
    if not (item_id = any(allowed_ids))
       or item_id = any(seen_ids)
       or item_sparks < 1
       or item_sparks > 20 then
      return false;
    end if;

    seen_ids := array_append(seen_ids, item_id);
    total_sparks := total_sparks + item_sparks;
  end loop;

  return total_sparks between 1 and 20;
end;
$$;

revoke all on function public.profile_priority_allocation_is_valid(jsonb)
  from public, anon;
grant execute on function public.profile_priority_allocation_is_valid(jsonb)
  to authenticated, service_role;

create table if not exists public.profile_priority_resource_allocations (
  profile_id uuid not null references public.profiles(id) on delete cascade,
  resource_type text not null check (
    resource_type in ('money', 'ordinary_action', 'skilled_work', 'career')
  ),
  allocation jsonb not null,
  allocation_version smallint not null default 1 check (allocation_version = 1),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  primary key (profile_id, resource_type),
  constraint profile_priority_resource_allocation_valid
    check (public.profile_priority_allocation_is_valid(allocation))
);

comment on table public.profile_priority_resource_allocations is
  'Private, owner-controlled resource-specific 100-Sparks overrides. A missing resource row means the resource inherits the general cohort_onboarding_profiles.priority_allocations vector.';
comment on column public.profile_priority_resource_allocations.allocation is
  'Normalized explicit override only. Never expose complete vectors to counterparties, public HTML, analytics, logs, or recommendation payloads.';

drop trigger if exists profile_priority_resource_allocations_set_updated_at
  on public.profile_priority_resource_allocations;
create trigger profile_priority_resource_allocations_set_updated_at
before update on public.profile_priority_resource_allocations
for each row execute function public.set_updated_at();

alter table public.profile_priority_resource_allocations enable row level security;

drop policy if exists profile_priority_resource_allocations_select_own
  on public.profile_priority_resource_allocations;
create policy profile_priority_resource_allocations_select_own
on public.profile_priority_resource_allocations
for select
to authenticated
using ((select auth.uid()) = profile_id);

drop policy if exists profile_priority_resource_allocations_insert_own
  on public.profile_priority_resource_allocations;
create policy profile_priority_resource_allocations_insert_own
on public.profile_priority_resource_allocations
for insert
to authenticated
with check ((select auth.uid()) = profile_id);

drop policy if exists profile_priority_resource_allocations_update_own
  on public.profile_priority_resource_allocations;
create policy profile_priority_resource_allocations_update_own
on public.profile_priority_resource_allocations
for update
to authenticated
using ((select auth.uid()) = profile_id)
with check ((select auth.uid()) = profile_id);

drop policy if exists profile_priority_resource_allocations_delete_own
  on public.profile_priority_resource_allocations;
create policy profile_priority_resource_allocations_delete_own
on public.profile_priority_resource_allocations
for delete
to authenticated
using ((select auth.uid()) = profile_id);

revoke all on table public.profile_priority_resource_allocations from public, anon;
grant select, insert, update, delete
  on table public.profile_priority_resource_allocations
  to authenticated;
grant all on table public.profile_priority_resource_allocations to service_role;

create or replace function public.replace_profile_priority_allocations_v1(
  p_general_allocation jsonb,
  p_general_cause_areas text[],
  p_resource_overrides jsonb
)
returns integer
language plpgsql
security invoker
set search_path = pg_catalog, public
as $$
declare
  actor_id uuid := auth.uid();
  item jsonb;
  item_resource_type text;
  seen_resource_types text[] := '{}'::text[];
  override_count integer := 0;
  allowed_cause_areas constant text[] := array[
    'Animal welfare',
    'Climate',
    'Existential risk',
    'Future flourishing',
    'Global poverty',
    'Public health',
    'Cause prioritization',
    'Community service'
  ]::text[];
begin
  if actor_id is null then
    raise exception using errcode = '42501', message = 'Authentication required.';
  end if;
  if p_general_allocation is null
     or not public.profile_priority_allocation_is_valid(p_general_allocation) then
    raise exception using errcode = '23514', message = 'Invalid general priority allocation.';
  end if;
  if p_general_cause_areas is null
     or cardinality(p_general_cause_areas) < 1
     or cardinality(p_general_cause_areas) > cardinality(allowed_cause_areas)
     or exists (
       select 1
       from unnest(p_general_cause_areas) as cause_area(value)
       where value is null or not (value = any(allowed_cause_areas))
     ) then
    raise exception using errcode = '23514', message = 'Invalid general cause areas.';
  end if;
  if p_resource_overrides is null
     or jsonb_typeof(p_resource_overrides) <> 'array'
     or jsonb_array_length(p_resource_overrides) > 4 then
    raise exception using errcode = '23514', message = 'Invalid resource override set.';
  end if;

  for item in
    select element from jsonb_array_elements(p_resource_overrides) as entries(element)
  loop
    if jsonb_typeof(item) <> 'object' then
      raise exception using errcode = '23514', message = 'Invalid resource override.';
    end if;
    item_resource_type := item ->> 'resourceType';
    if item_resource_type is null
       or not (item_resource_type = any(array[
         'money', 'ordinary_action', 'skilled_work', 'career'
       ]::text[]))
       or item_resource_type = any(seen_resource_types)
       or item -> 'allocation' is null
       or not public.profile_priority_allocation_is_valid(item -> 'allocation') then
      raise exception using errcode = '23514', message = 'Invalid resource override.';
    end if;
    seen_resource_types := array_append(seen_resource_types, item_resource_type);
  end loop;

  insert into public.cohort_onboarding_profiles (
    profile_id,
    primary_goal,
    participant_kind,
    cause_areas,
    first_action,
    invite_target,
    referral_source,
    status,
    completed_at,
    priority_allocations
  ) values (
    actor_id,
    'find_counterparty',
    'individual',
    p_general_cause_areas,
    'clone_example',
    '',
    'Profile priorities',
    'completed',
    timezone('utc', now()),
    p_general_allocation
  )
  on conflict (profile_id) do update
  set cause_areas = excluded.cause_areas,
      priority_allocations = excluded.priority_allocations,
      updated_at = timezone('utc', now());

  delete from public.profile_priority_resource_allocations current_override
  where current_override.profile_id = actor_id
    and not exists (
      select 1
      from jsonb_array_elements(p_resource_overrides) as incoming_override(element)
      where incoming_override.element ->> 'resourceType' = current_override.resource_type
    );

  for item in
    select element from jsonb_array_elements(p_resource_overrides) as entries(element)
  loop
    insert into public.profile_priority_resource_allocations (
      profile_id,
      resource_type,
      allocation,
      allocation_version
    ) values (
      actor_id,
      item ->> 'resourceType',
      item -> 'allocation',
      1
    )
    on conflict (profile_id, resource_type) do update
    set allocation = excluded.allocation,
        allocation_version = excluded.allocation_version,
        updated_at = timezone('utc', now());
    override_count := override_count + 1;
  end loop;

  return override_count;
end;
$$;

revoke all on function public.replace_profile_priority_allocations_v1(jsonb, text[], jsonb)
  from public, anon;
grant execute on function public.replace_profile_priority_allocations_v1(jsonb, text[], jsonb)
  to authenticated, service_role;

commit;
