-- Enforce the application-encryption contract even when an authenticated owner
-- writes through PostgREST instead of the route-profile API.

create or replace function public.route_profile_ciphertexts_valid(value jsonb)
returns boolean
language plpgsql
immutable
set search_path = pg_catalog
as $$
declare
  entry record;
  ciphertext text;
begin
  if value is null
     or jsonb_typeof(value) <> 'object'
     or octet_length(value::text) > 50000
  then
    return false;
  end if;

  for entry in select item.key, item.value from jsonb_each(value) as item
  loop
    if entry.key <> all (array[
      'route_recommendation_profiles.goal',
      'route_recommendation_profiles.cause_priorities',
      'route_recommendation_profiles.otherwise_baseline'
    ])
       or jsonb_typeof(entry.value) <> 'string'
    then
      return false;
    end if;

    ciphertext := entry.value #>> '{}';
    if octet_length(ciphertext) > 12000
       or ciphertext !~ '^bgenc:v(1|2):'
    then
      return false;
    end if;
  end loop;

  return true;
exception when others then
  return false;
end;
$$;

create or replace function public.route_profile_pairwise_answers_valid(value jsonb)
returns boolean
language plpgsql
immutable
set search_path = pg_catalog
as $$
declare
  entry record;
  answer jsonb;
  left_format text;
  right_format text;
  answer_choice text;
  canonical_key text;
  unordered_pair text;
  seen_pairs text[] := '{}'::text[];
  answer_count integer := 0;
begin
  if value is null
     or jsonb_typeof(value) <> 'object'
     or octet_length(value::text) > 30000
  then
    return false;
  end if;

  for entry in select item.key, item.value from jsonb_each(value) as item
  loop
    answer_count := answer_count + 1;
    if answer_count > 10 or jsonb_typeof(entry.value) <> 'object' then
      return false;
    end if;

    answer := entry.value;
    if answer - array['choice', 'leftFormat', 'rightFormat', 'answeredAt'] <> '{}'::jsonb then
      return false;
    end if;
    if jsonb_typeof(answer -> 'leftFormat') is distinct from 'string'
       or jsonb_typeof(answer -> 'rightFormat') is distinct from 'string'
       or jsonb_typeof(answer -> 'choice') is distinct from 'string'
       or jsonb_typeof(answer -> 'answeredAt') is distinct from 'string'
    then
      return false;
    end if;

    left_format := answer ->> 'leftFormat';
    right_format := answer ->> 'rightFormat';
    answer_choice := answer ->> 'choice';
    canonical_key := 'route-format:' || left_format || ':' || right_format;
    unordered_pair := least(left_format, right_format) || ':' || greatest(left_format, right_format);

    if left_format not in ('direct', 'threshold', 'redirect', 'personal', 'coalition')
       or right_format not in ('direct', 'threshold', 'redirect', 'personal', 'coalition')
       or left_format = right_format
       or answer_choice not in ('left', 'right', 'equal', 'neither', 'unsure')
       or entry.key <> canonical_key
       or unordered_pair = any (seen_pairs)
       or char_length(answer ->> 'answeredAt') > 40
    then
      return false;
    end if;

    seen_pairs := array_append(seen_pairs, unordered_pair);
  end loop;

  return true;
exception when others then
  return false;
end;
$$;

create or replace function public.route_profile_interview_answers_valid(value jsonb)
returns boolean
language plpgsql
immutable
set search_path = pg_catalog
as $$
begin
  if value is null
     or jsonb_typeof(value) <> 'object'
     or octet_length(value::text) > 1000
     or value - array['confirmed', 'version', 'confirmedAt'] <> '{}'::jsonb
  then
    return false;
  end if;

  if value = '{}'::jsonb then
    return true;
  end if;

  if jsonb_typeof(value -> 'confirmed') is distinct from 'boolean'
     or jsonb_typeof(value -> 'version') is distinct from 'string'
     or jsonb_typeof(value -> 'confirmedAt') is distinct from 'string'
  then
    return false;
  end if;

  return (value ->> 'confirmed')::boolean = true
    and (value ->> 'version') = 'guided-route-interview-v1'
    and char_length(value ->> 'confirmedAt') <= 40;
exception when others then
  return false;
end;
$$;

alter table public.route_recommendation_profiles
  alter column planned_donation_baseline drop not null,
  alter column planned_donation_baseline set default null;

alter table public.route_recommendation_profiles
  drop constraint if exists route_profiles_goal_ciphertext_shape,
  drop constraint if exists route_profiles_cause_ciphertext_shape,
  drop constraint if exists route_profiles_baseline_ciphertext_shape,
  drop constraint if exists route_profiles_ciphertexts_valid,
  drop constraint if exists route_profiles_pairwise_answers_valid,
  drop constraint if exists route_profiles_interview_answers_valid,
  drop constraint if exists route_profiles_encryption_version_valid,
  drop constraint if exists route_profiles_planned_donation_state_valid;

alter table public.route_recommendation_profiles
  add constraint route_profiles_goal_ciphertext_shape check (
    (goal = '' and not (sensitive_ciphertexts ? 'route_recommendation_profiles.goal'))
    or (
      goal = '[encrypted private field]'
      and sensitive_ciphertexts ? 'route_recommendation_profiles.goal'
    )
  ),
  add constraint route_profiles_cause_ciphertext_shape check (
    cause_priorities = '{}'::text[]
  ),
  add constraint route_profiles_baseline_ciphertext_shape check (
    (otherwise_baseline = '' and not (
      sensitive_ciphertexts ? 'route_recommendation_profiles.otherwise_baseline'
    ))
    or (
      otherwise_baseline = '[encrypted private field]'
      and sensitive_ciphertexts ? 'route_recommendation_profiles.otherwise_baseline'
    )
  ),
  add constraint route_profiles_ciphertexts_valid check (
    public.route_profile_ciphertexts_valid(sensitive_ciphertexts)
  ),
  add constraint route_profiles_pairwise_answers_valid check (
    public.route_profile_pairwise_answers_valid(pairwise_answers)
  ),
  add constraint route_profiles_interview_answers_valid check (
    public.route_profile_interview_answers_valid(interview_answers)
  ),
  add constraint route_profiles_encryption_version_valid check (
    (
      sensitive_ciphertexts = '{}'::jsonb
      and sensitive_encryption_version = ''
    )
    or (
      sensitive_ciphertexts <> '{}'::jsonb
      and sensitive_encryption_version in ('bg-field-v1', 'bg-field-v2')
    )
  ),
  add constraint route_profiles_planned_donation_state_valid check (
    planned_donation_baseline is true or planned_donation_cents = 0
  );

create index if not exists offers_live_recommendation_inventory_idx
  on public.offers (updated_at desc, id)
  where status = 'open'
    and workflow_status = 'published'
    and published_at is not null
    and closed_at is null
    and deleted_at is null;

revoke all on function public.route_profile_ciphertexts_valid(jsonb) from public;
revoke all on function public.route_profile_pairwise_answers_valid(jsonb) from public;
revoke all on function public.route_profile_interview_answers_valid(jsonb) from public;
revoke all on function public.route_profile_ciphertexts_valid(jsonb) from anon;
revoke all on function public.route_profile_pairwise_answers_valid(jsonb) from anon;
revoke all on function public.route_profile_interview_answers_valid(jsonb) from anon;
grant execute on function public.route_profile_ciphertexts_valid(jsonb) to authenticated, service_role;
grant execute on function public.route_profile_pairwise_answers_valid(jsonb) to authenticated, service_role;
grant execute on function public.route_profile_interview_answers_valid(jsonb) to authenticated, service_role;
