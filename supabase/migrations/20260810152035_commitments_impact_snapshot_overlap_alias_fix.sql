begin;

create or replace function public.impact_accounting_assert_snapshot_payload(
  p_snapshot jsonb
)
returns void
language plpgsql
stable
set search_path = public
as $$
declare
  component jsonb;
  quantity jsonb;
  interval_value jsonb;
  model_value jsonb;
  point_value numeric;
  lower_value numeric;
  upper_value numeric;
  component_count integer;
  distinct_key_count integer;
begin
  if jsonb_typeof(p_snapshot) is distinct from 'object'
    or p_snapshot ->> 'schemaVersion' <> 'moral-trade-impact-accounting-v1'
  then
    raise exception 'Impact snapshot schema is invalid' using errcode = '23514';
  end if;
  if coalesce(btrim(p_snapshot ->> 'subjectRef'), '') = ''
    or p_snapshot ->> 'mechanismFamily' not in (
      'trade','co_fund','threshold_funding','donation_upgrade',
      'threshold_sign_on','donation_redirect'
    )
    or coalesce(p_snapshot ->> 'inputStateHash', '') !~ '^sha256:[a-f0-9]{64}$'
  then
    raise exception 'Impact snapshot identity is invalid' using errcode = '23514';
  end if;
  if jsonb_typeof(p_snapshot -> 'components') is distinct from 'array'
    or jsonb_typeof(p_snapshot -> 'health') is distinct from 'object'
    or jsonb_typeof(p_snapshot -> 'blockers') is distinct from 'array'
    or not public.impact_accounting_nonplaceholder_text(p_snapshot ->> 'explanation')
  then
    raise exception 'Impact snapshot components, health, blockers, and explanation are required'
      using errcode = '23514';
  end if;
  if p_snapshot #>> '{health,status}' not in ('passed','warning','blocked','stale')
    or jsonb_typeof(p_snapshot #> '{health,blockers}') is distinct from 'array'
  then
    raise exception 'Impact snapshot health is invalid' using errcode = '23514';
  end if;

  select count(*), count(distinct entry ->> 'key')
  into component_count, distinct_key_count
  from jsonb_array_elements(p_snapshot -> 'components') entry;
  if component_count <> distinct_key_count then
    raise exception 'Impact component keys must be unique' using errcode = '23514';
  end if;

  for component in select value from jsonb_array_elements(p_snapshot -> 'components')
  loop
    if jsonb_typeof(component) is distinct from 'object'
      or not public.impact_accounting_nonplaceholder_text(component ->> 'key')
      or not public.impact_accounting_nonplaceholder_text(component ->> 'label')
      or not public.impact_accounting_nonplaceholder_text(component ->> 'explanation')
    then
      raise exception 'Impact components require a key, label, and explanation'
        using errcode = '23514';
    end if;
    if coalesce(component ->> 'kind', '') not in (
      'success_case_additional','expected_additional','direct_causal_attribution',
      'verified_outcome','cooperative_allocation','value_adjusted',
      'baseline_redirected','platform_funded_bonus'
    ) then
      raise exception 'Impact component kind is invalid' using errcode = '23514';
    end if;
    if coalesce(component ->> 'status', '') not in ('available','withheld')
      or coalesce(component ->> 'source', '') not in (
        'deterministic_terms','approved_model','reference_class',
        'verified_evidence','platform_subsidy'
      )
      or coalesce(component ->> 'confidence', '') not in ('high','moderate','low','unavailable')
      or public.impact_accounting_string_array(component -> 'evidenceRefs') is not true
      or public.impact_accounting_string_array(component -> 'blockers') is not true
      or public.impact_accounting_string_array(component -> 'resourceClaimRefs') is not true
      or jsonb_typeof(component -> 'additiveToCausedTotal') <> 'boolean'
    then
      raise exception 'Impact component status, source, confidence, or provenance fields are invalid'
        using errcode = '23514';
    end if;

    model_value := component -> 'model';
    if model_value is not null and model_value <> 'null'::jsonb then
      if jsonb_typeof(model_value) <> 'object'
        or not public.impact_accounting_nonplaceholder_text(model_value ->> 'modelKey')
        or jsonb_typeof(model_value -> 'modelVersion') <> 'number'
        or (model_value ->> 'modelVersion')::numeric < 1
        or (model_value ->> 'modelVersion')::numeric
          <> trunc((model_value ->> 'modelVersion')::numeric)
        or coalesce(model_value ->> 'methodologyHash', '') !~ '^sha256:[a-f0-9]{64}$'
        or not public.impact_accounting_nonplaceholder_text(model_value ->> 'approvedAt')
      then
        raise exception 'Impact component model reference is invalid' using errcode = '23514';
      end if;
    end if;

    if component ->> 'status' = 'available' then
      if component ->> 'confidence' = 'unavailable'
        or jsonb_array_length(component -> 'blockers') <> 0
      then
        raise exception 'Available components require confidence and cannot carry blockers'
          using errcode = '23514';
      end if;

      quantity := component -> 'quantity';
      interval_value := component -> 'interval';
      if jsonb_typeof(quantity) <> 'object'
        or jsonb_typeof(interval_value) <> 'object'
        or quantity ->> 'kind' not in ('money','value_adjusted_money','count','duration')
        or jsonb_typeof(quantity -> 'value') <> 'number'
        or jsonb_typeof(interval_value -> 'levelBps') <> 'number'
        or (interval_value ->> 'levelBps')::numeric <> 8000
        or jsonb_typeof(interval_value -> 'lower') <> 'number'
        or jsonb_typeof(interval_value -> 'upper') <> 'number'
      then
        raise exception 'Available impact component quantity or interval is invalid'
          using errcode = '23514';
      end if;
      point_value := (quantity ->> 'value')::numeric;
      lower_value := (interval_value ->> 'lower')::numeric;
      upper_value := (interval_value ->> 'upper')::numeric;
      if point_value < 0
        or lower_value < 0
        or upper_value < 0
        or lower_value > point_value
        or point_value > upper_value
      then
        raise exception 'Impact point estimate must lie inside its nonnegative 80 percent interval'
          using errcode = '23514';
      end if;

      if component ->> 'source' in ('approved_model','reference_class')
        and (model_value is null or model_value = 'null'::jsonb)
      then
        raise exception 'Modeled impact components require a model reference'
          using errcode = '23514';
      end if;

      if component ->> 'kind' = 'verified_outcome'
        and (
          component ->> 'source' <> 'verified_evidence'
          or (component ->> 'additiveToCausedTotal')::boolean
        )
      then
        raise exception 'Verified outcomes establish occurrence, not additive caused impact'
          using errcode = '23514';
      end if;

      if (component ->> 'additiveToCausedTotal')::boolean then
        if component ->> 'kind' not in (
          'expected_additional','direct_causal_attribution','value_adjusted'
        )
          or component ->> 'source' not in ('approved_model','reference_class')
          or jsonb_array_length(component -> 'resourceClaimRefs') = 0
        then
          raise exception 'Additive causal components require a modeled causal kind and unique claim references'
            using errcode = '23514';
        end if;
      end if;
    else
      if component -> 'quantity' is null
        or component -> 'quantity' <> 'null'::jsonb
        or component -> 'interval' is null
        or component -> 'interval' <> 'null'::jsonb
        or component ->> 'confidence' <> 'unavailable'
        or jsonb_array_length(component -> 'blockers') = 0
        or (component ->> 'additiveToCausedTotal')::boolean
        or jsonb_array_length(component -> 'resourceClaimRefs') <> 0
      then
        raise exception 'Withheld components must fail closed with blockers and no quantity or additive claims'
          using errcode = '23514';
      end if;
    end if;
  end loop;

  if exists (
    select claim.value
    from jsonb_array_elements(p_snapshot -> 'components') component_entry
    cross join lateral jsonb_array_elements_text(
      component_entry -> 'resourceClaimRefs'
    ) claim(value)
    where component_entry ->> 'status' = 'available'
      and (component_entry ->> 'additiveToCausedTotal')::boolean
    group by claim.value
    having count(*) > 1
  ) then
    raise exception 'Overlapping additive resource claims are forbidden'
      using errcode = '23514';
  end if;
end;
$$;

do $$
begin
  if not has_function_privilege(
    'service_role',
    'public.impact_accounting_assert_snapshot_payload(jsonb)',
    'execute'
  ) then
    raise exception 'Service role lacks immutable snapshot validation authority';
  end if;

  if has_function_privilege(
    'anon',
    'public.impact_accounting_assert_snapshot_payload(jsonb)',
    'execute'
  ) or has_function_privilege(
    'authenticated',
    'public.impact_accounting_assert_snapshot_payload(jsonb)',
    'execute'
  ) then
    raise exception 'Client roles retain direct immutable snapshot-validator execution';
  end if;
end
$$;

comment on function public.impact_accounting_assert_snapshot_payload(jsonb) is
  'Internal immutable-snapshot validator. Uses a non-conflicting component-entry alias for additive resource-claim overlap detection.';

commit;
