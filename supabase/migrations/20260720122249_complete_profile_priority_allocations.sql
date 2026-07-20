alter table public.cohort_onboarding_profiles
  add column if not exists priority_allocations jsonb not null default '[]'::jsonb;

alter table public.cohort_onboarding_profiles
  drop constraint if exists cohort_onboarding_priority_allocations_shape;

alter table public.cohort_onboarding_profiles
  add constraint cohort_onboarding_priority_allocations_shape
  check (
    case
      when jsonb_typeof(priority_allocations) = 'array'
        then jsonb_array_length(priority_allocations) <= 12
      else false
    end
  );

comment on column public.cohort_onboarding_profiles.priority_allocations is
  'Private, owner-controlled Complete Profile mosaic allocations. Each entry stores a canonical priority id, coarse five-point block count, derived share, and display rank. Unassigned remainder is intentional and is not opposition.';
