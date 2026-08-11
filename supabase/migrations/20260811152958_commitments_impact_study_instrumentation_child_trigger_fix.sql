create or replace function public.impact_study_validate_child_insert()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  parent_id uuid;
  outcome_subject_key text;
begin
  if tg_table_name = 'impact_study_synthetic_exposures' then
    select assignment.study_instance_id
    into parent_id
    from public.impact_study_synthetic_assignments assignment
    where assignment.id = new.assignment_id;
  elsif tg_table_name = 'impact_study_synthetic_outcomes' then
    parent_id := new.study_instance_id;
    outcome_subject_key := new.synthetic_subject_key;
  else
    parent_id := new.study_instance_id;
  end if;

  if parent_id is null or not exists (
    select 1
    from public.impact_study_instances instance
    where instance.id = parent_id
      and instance.environment = 'qa'
      and instance.subject_mode = 'synthetic_only'
      and instance.execution_authorized = false
      and instance.real_user_assignment_allowed = false
      and instance.registry_status = 'registered_nonexecuting'
  ) then
    raise exception
      'Child instrumentation requires a registered non-executing QA study instance'
      using errcode = '23514';
  end if;

  if tg_table_name = 'impact_study_synthetic_outcomes'
    and not exists (
      select 1
      from public.impact_study_synthetic_assignments assignment
      where assignment.study_instance_id = parent_id
        and assignment.synthetic_subject_key = outcome_subject_key
    )
  then
    raise exception 'Synthetic outcome requires a prior synthetic assignment'
      using errcode = '23514';
  end if;

  return new;
end;
$$;