begin;

create or replace function public.impact_accounting_string_array(p_value jsonb)
returns boolean
language sql
immutable
set search_path = public
as $$
  select jsonb_typeof(p_value) = 'array'
    and not exists (
      select 1
      from jsonb_array_elements(p_value) entry
      where jsonb_typeof(entry) <> 'string'
        or not public.impact_accounting_nonplaceholder_text(entry #>> '{}')
    );
$$;

create or replace function public.impact_accounting_assert_methodology_shape(
  p_methodology jsonb,
  p_mechanism_family text,
  p_model_key text
)
returns void
language plpgsql
immutable
set search_path = public
as $$
begin
  if jsonb_typeof(p_methodology) is distinct from 'object' then
    raise exception 'Impact methodology must be a JSON object' using errcode = '23514';
  end if;
  if p_methodology ->> 'schemaVersion' <> 'moral-trade-impact-model-methodology-v1' then
    raise exception 'Impact methodology schema version is invalid' using errcode = '23514';
  end if;
  if p_methodology ->> 'mechanismFamily' <> p_mechanism_family then
    raise exception 'Impact methodology mechanism family must match its model row' using errcode = '23514';
  end if;
  if p_methodology ->> 'modelKey' <> p_model_key then
    raise exception 'Impact methodology model key must match its model row' using errcode = '23514';
  end if;

  if jsonb_typeof(p_methodology -> 'displayName') is distinct from 'string'
    or jsonb_typeof(p_methodology -> 'estimands') is distinct from 'array'
    or jsonb_typeof(p_methodology -> 'estimandDefinitions') is distinct from 'object'
    or jsonb_typeof(p_methodology -> 'baselineDefinition') is distinct from 'string'
    or jsonb_typeof(p_methodology -> 'causalIdentificationPolicy') is distinct from 'object'
    or jsonb_typeof(p_methodology -> 'evidenceSemanticsPolicy') is distinct from 'object'
    or jsonb_typeof(p_methodology -> 'strategicBehaviorPolicy') is distinct from 'object'
    or jsonb_typeof(p_methodology -> 'algorithmDescription') is distinct from 'string'
    or jsonb_typeof(p_methodology -> 'referenceClassPolicy') is distinct from 'object'
    or jsonb_typeof(p_methodology -> 'uncertaintyPolicy') is distinct from 'object'
    or jsonb_typeof(p_methodology -> 'validationPolicy') is distinct from 'object'
    or jsonb_typeof(p_methodology -> 'freshnessPolicy') is distinct from 'object'
    or jsonb_typeof(p_methodology -> 'healthPolicy') is distinct from 'object'
    or jsonb_typeof(p_methodology -> 'sourceDataRequirements') is distinct from 'array'
    or jsonb_typeof(p_methodology -> 'conceptualBasisRefs') is distinct from 'array'
    or jsonb_typeof(p_methodology -> 'calibrationEvidenceRefs') is distinct from 'array'
    or jsonb_typeof(p_methodology -> 'knownFailureModes') is distinct from 'array'
    or jsonb_typeof(p_methodology -> 'outOfDomainConditions') is distinct from 'array'
    or jsonb_typeof(p_methodology -> 'materialChangeTriggers') is distinct from 'array'
    or jsonb_typeof(p_methodology -> 'aggregationPolicy') is distinct from 'object'
    or jsonb_typeof(p_methodology -> 'shapleyPolicy') is distinct from 'object'
    or jsonb_typeof(p_methodology -> 'parameters') is distinct from 'object'
  then
    raise exception 'Impact methodology payload shape is incomplete' using errcode = '23514';
  end if;
end;
$$;

create or replace function public.impact_accounting_assert_methodology_for_review(
  p_methodology jsonb,
  p_mechanism_family text,
  p_model_key text
)
returns void
language plpgsql
immutable
set search_path = public
as $$
declare
  estimand jsonb;
  reference_policy jsonb;
  causal_policy jsonb;
  evidence_policy jsonb;
  strategic_policy jsonb;
  uncertainty_policy jsonb;
  validation_policy jsonb;
  freshness_policy jsonb;
  health_policy jsonb;
  aggregation_policy jsonb;
  shapley_policy jsonb;
  exact_player_limit numeric;
begin
  perform public.impact_accounting_assert_methodology_shape(
    p_methodology,
    p_mechanism_family,
    p_model_key
  );

  if not public.impact_accounting_nonplaceholder_text(p_methodology ->> 'displayName')
    or not public.impact_accounting_nonplaceholder_text(p_methodology ->> 'baselineDefinition')
    or not public.impact_accounting_nonplaceholder_text(p_methodology ->> 'algorithmDescription')
  then
    raise exception 'Impact methodology identity, baseline, and algorithm must be complete before review'
      using errcode = '23514';
  end if;

  if jsonb_array_length(p_methodology -> 'estimands') = 0 then
    raise exception 'Impact methodology requires at least one estimand' using errcode = '23514';
  end if;
  for estimand in select value from jsonb_array_elements(p_methodology -> 'estimands')
  loop
    if jsonb_typeof(estimand) <> 'string'
      or estimand #>> '{}' not in (
        'success_case_additional','expected_additional','direct_causal_attribution',
        'verified_outcome','cooperative_allocation','value_adjusted',
        'baseline_redirected','platform_funded_bonus'
      )
      or not public.impact_accounting_nonplaceholder_text(
        p_methodology #>> array['estimandDefinitions', estimand #>> '{}']
      )
    then
      raise exception 'Every impact estimand requires a valid definition' using errcode = '23514';
    end if;
  end loop;

  causal_policy := p_methodology -> 'causalIdentificationPolicy';
  if not public.impact_accounting_nonplaceholder_text(causal_policy ->> 'estimand')
    or coalesce(causal_policy ->> 'designStatus', '') not in ('specified_not_validated','validated')
    or not public.impact_accounting_nonempty_string_array(causal_policy -> 'admissibleDesigns')
    or not public.impact_accounting_nonplaceholder_text(causal_policy ->> 'interferencePolicy')
    or not public.impact_accounting_nonplaceholder_text(causal_policy ->> 'overlapAndPositivityPolicy')
    or not public.impact_accounting_nonplaceholder_text(causal_policy ->> 'sensitivityAnalysisPolicy')
    or causal_policy ->> 'noDefensibleDesignAction' <> 'withhold_causal_components'
  then
    raise exception 'Causal-identification policy is incomplete or does not fail closed'
      using errcode = '23514';
  end if;

  evidence_policy := p_methodology -> 'evidenceSemanticsPolicy';
  if evidence_policy ->> 'outcomeEvidenceLabel' <> 'verified_outcome'
    or evidence_policy ->> 'additionalityLabel' <> 'assessed_additionality'
    or evidence_policy -> 'receiptAloneEstablishesAdditionality' <> 'false'::jsonb
    or not public.impact_accounting_nonplaceholder_text(evidence_policy ->> 'publicCopyRule')
  then
    raise exception 'Outcome evidence must remain separate from assessed additionality'
      using errcode = '23514';
  end if;

  strategic_policy := p_methodology -> 'strategicBehaviorPolicy';
  if not public.impact_accounting_nonplaceholder_text(strategic_policy ->> 'baselineAntecedenceRule')
    or not public.impact_accounting_nonplaceholder_text(strategic_policy ->> 'strategicTimingRule')
    or not public.impact_accounting_nonplaceholder_text(strategic_policy ->> 'interferenceRule')
    or not public.impact_accounting_nonplaceholder_text(strategic_policy ->> 'perverseIncentiveRule')
    or not public.impact_accounting_nonempty_string_array(strategic_policy -> 'manipulationChecks')
  then
    raise exception 'Strategic-behavior and perverse-incentive policy is incomplete'
      using errcode = '23514';
  end if;

  reference_policy := p_methodology -> 'referenceClassPolicy';
  if reference_policy ->> 'strategy' <> 'hierarchical'
    or reference_policy ->> 'noDefensibleClassAction' <> 'withhold'
    or not public.impact_accounting_nonempty_string_array(reference_policy -> 'narrowFields')
    or not public.impact_accounting_nonempty_string_array(reference_policy -> 'broadeningOrder')
    or jsonb_typeof(reference_policy -> 'minimumSampleSize') <> 'number'
    or (reference_policy ->> 'minimumSampleSize')::numeric < 1
    or (reference_policy ->> 'minimumSampleSize')::numeric
      <> trunc((reference_policy ->> 'minimumSampleSize')::numeric)
    or not public.impact_accounting_nonplaceholder_text(
      reference_policy ->> 'uncertaintyExpansionRule'
    )
  then
    raise exception 'Hierarchical reference-class policy is incomplete' using errcode = '23514';
  end if;

  uncertainty_policy := p_methodology -> 'uncertaintyPolicy';
  if jsonb_typeof(uncertainty_policy -> 'intervalLevelBps') <> 'number'
    or (uncertainty_policy ->> 'intervalLevelBps')::numeric <> 8000
    or not public.impact_accounting_nonplaceholder_text(uncertainty_policy ->> 'method')
    or not public.impact_accounting_nonplaceholder_text(uncertainty_policy ->> 'confidencePolicy')
    or not public.impact_accounting_nonempty_string_array(uncertainty_policy -> 'drivers')
  then
    raise exception 'Impact uncertainty policy must specify the approved 80 percent interval and confidence rules'
      using errcode = '23514';
  end if;

  validation_policy := p_methodology -> 'validationPolicy';
  if coalesce(validation_policy ->> 'thresholdStatus', '') not in ('provisional','validated')
    or jsonb_typeof(validation_policy -> 'highConfidenceAllowed') is distinct from 'boolean'
    or (
      validation_policy ->> 'thresholdStatus' = 'provisional'
      and validation_policy -> 'highConfidenceAllowed' <> 'false'::jsonb
    )
    or not public.impact_accounting_nonempty_string_array(
      validation_policy -> 'requiredBeforeHighConfidence'
    )
  then
    raise exception 'Confidence-threshold validation policy is incomplete or unsafe'
      using errcode = '23514';
  end if;

  freshness_policy := p_methodology -> 'freshnessPolicy';
  if jsonb_typeof(freshness_policy -> 'maxAgeSeconds') <> 'number'
    or (freshness_policy ->> 'maxAgeSeconds')::numeric < 1
    or (freshness_policy ->> 'maxAgeSeconds')::numeric
      <> trunc((freshness_policy ->> 'maxAgeSeconds')::numeric)
    or freshness_policy -> 'requireStateHash' <> 'true'::jsonb
    or not public.impact_accounting_nonempty_string_array(freshness_policy -> 'requiredStateFields')
    or not public.impact_accounting_nonempty_string_array(freshness_policy -> 'invalidateOnLifecycleStates')
  then
    raise exception 'Impact freshness policy is incomplete' using errcode = '23514';
  end if;

  health_policy := p_methodology -> 'healthPolicy';
  if not public.impact_accounting_nonempty_string_array(health_policy -> 'requiredCalibrationMetrics')
    or not public.impact_accounting_nonempty_string_array(health_policy -> 'blockedConditions')
    or not public.impact_accounting_nonempty_string_array(health_policy -> 'warningConditions')
  then
    raise exception 'Impact model-health policy is incomplete' using errcode = '23514';
  end if;

  if not public.impact_accounting_nonempty_string_array(p_methodology -> 'sourceDataRequirements')
    or not public.impact_accounting_nonempty_string_array(p_methodology -> 'conceptualBasisRefs')
    or not public.impact_accounting_string_array(p_methodology -> 'calibrationEvidenceRefs')
    or not public.impact_accounting_nonempty_string_array(p_methodology -> 'knownFailureModes')
    or not public.impact_accounting_nonempty_string_array(p_methodology -> 'outOfDomainConditions')
    or not public.impact_accounting_nonempty_string_array(p_methodology -> 'materialChangeTriggers')
  then
    raise exception 'Impact methodology evidence, provenance, failure, domain, and material-change documentation is incomplete'
      using errcode = '23514';
  end if;

  if exists (
    select 1
    from jsonb_array_elements_text(p_methodology -> 'calibrationEvidenceRefs') reference
    where reference ~* '^(source:|github-actions:)'
  ) then
    raise exception 'Conceptual sources and software tests are not empirical calibration evidence'
      using errcode = '23514';
  end if;

  aggregation_policy := p_methodology -> 'aggregationPolicy';
  if aggregation_policy -> 'directAndCooperativeNeverSummed' <> 'true'::jsonb
    or aggregation_policy -> 'heterogeneousNativeUnitsRemainSeparate' <> 'true'::jsonb
    or aggregation_policy -> 'directMarginalEffectsDefaultNonAdditive' <> 'true'::jsonb
    or not public.impact_accounting_nonplaceholder_text(
      aggregation_policy ->> 'additiveClaimRequirement'
    )
    or not public.impact_accounting_nonplaceholder_text(
      aggregation_policy ->> 'overlapHandling'
    )
  then
    raise exception 'Impact aggregation policy violates causal and overlap separation'
      using errcode = '23514';
  end if;

  shapley_policy := p_methodology -> 'shapleyPolicy';
  if jsonb_typeof(shapley_policy -> 'enabled') is distinct from 'boolean' then
    raise exception 'Impact Shapley policy requires an enabled flag' using errcode = '23514';
  end if;
  if (shapley_policy ->> 'enabled')::boolean then
    if not public.impact_accounting_nonplaceholder_text(
      shapley_policy ->> 'characteristicFunctionDefinition'
    ) then
      raise exception 'Enabled cooperative allocation requires a characteristic function'
        using errcode = '23514';
    end if;

    if shapley_policy -> 'maximumExactPlayers' is not null
      and shapley_policy -> 'maximumExactPlayers' <> 'null'::jsonb
    then
      if jsonb_typeof(shapley_policy -> 'maximumExactPlayers') <> 'number' then
        raise exception 'Exact Shapley player limit must be numeric' using errcode = '23514';
      end if;
      exact_player_limit := (shapley_policy ->> 'maximumExactPlayers')::numeric;
      if exact_player_limit < 1 or exact_player_limit > 15
        or exact_player_limit <> trunc(exact_player_limit)
      then
        raise exception 'Exact Shapley player limit must be an integer from 1 through 15'
          using errcode = '23514';
      end if;
    elsif not public.impact_accounting_nonplaceholder_text(
      shapley_policy ->> 'approximationMethod'
    ) then
      raise exception 'Enabled cooperative allocation requires an approved execution policy'
        using errcode = '23514';
    end if;
  end if;
end;
$$;

create or replace function public.impact_accounting_assert_methodology_for_approval(
  p_methodology jsonb,
  p_mechanism_family text,
  p_model_key text
)
returns void
language plpgsql
immutable
set search_path = public
as $$
begin
  perform public.impact_accounting_assert_methodology_for_review(
    p_methodology,
    p_mechanism_family,
    p_model_key
  );

  if p_methodology #>> '{causalIdentificationPolicy,designStatus}' <> 'validated' then
    raise exception 'Causal-identification design must be validated before approval'
      using errcode = '23514';
  end if;
  if p_methodology #>> '{validationPolicy,thresholdStatus}' <> 'validated' then
    raise exception 'Confidence thresholds must be validated before approval'
      using errcode = '23514';
  end if;
  if jsonb_array_length(p_methodology -> 'calibrationEvidenceRefs') = 0 then
    raise exception 'Eligible empirical calibration evidence is required before approval'
      using errcode = '23514';
  end if;
end;
$$;

create or replace function public.impact_accounting_validate_model_version()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  perform public.impact_accounting_assert_methodology_shape(
    new.methodology,
    new.mechanism_family,
    new.model_key
  );

  if new.lifecycle_status <> 'draft' then
    perform public.impact_accounting_assert_methodology_for_review(
      new.methodology,
      new.mechanism_family,
      new.model_key
    );
  end if;

  if new.lifecycle_status in ('approved','active','inactive','superseded') then
    perform public.impact_accounting_assert_methodology_for_approval(
      new.methodology,
      new.mechanism_family,
      new.model_key
    );
    if cardinality(new.approval_blockers) <> 0 then
      raise exception 'Approved or active impact methodologies cannot retain approval blockers'
        using errcode = '23514';
    end if;
  end if;

  return new;
end;
$$;

create or replace function public.impact_accounting_guard_model_version_update()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  transition_allowed boolean;
begin
  if new.id <> old.id
    or new.mechanism_family <> old.mechanism_family
    or new.model_key <> old.model_key
    or new.version <> old.version
    or new.created_at <> old.created_at
    or new.created_by is distinct from old.created_by
  then
    raise exception 'Impact model identity is immutable' using errcode = '55000';
  end if;

  if old.lifecycle_status in ('approved','active','inactive','superseded')
    and (
      new.methodology is distinct from old.methodology
      or new.methodology_hash <> old.methodology_hash
      or new.approval_blockers is distinct from old.approval_blockers
      or new.material_change_from is distinct from old.material_change_from
    )
  then
    raise exception 'Approved impact methodology is immutable; create a new version'
      using errcode = '55000';
  end if;

  transition_allowed := case old.lifecycle_status
    when 'draft' then new.lifecycle_status in ('draft','under_review')
    when 'under_review' then new.lifecycle_status in ('under_review','draft','approved')
    when 'approved' then new.lifecycle_status in ('approved','active','inactive','superseded')
    when 'active' then new.lifecycle_status in ('active','inactive','superseded')
    when 'inactive' then new.lifecycle_status in ('inactive','active','superseded')
    when 'superseded' then new.lifecycle_status = 'superseded'
    else false
  end;

  if not transition_allowed then
    raise exception 'Invalid impact model lifecycle transition: % -> %',
      old.lifecycle_status, new.lifecycle_status using errcode = '23514';
  end if;

  if new.lifecycle_status = 'under_review' then
    perform public.impact_accounting_assert_methodology_for_review(
      new.methodology,
      new.mechanism_family,
      new.model_key
    );
  elsif new.lifecycle_status = 'approved'
    and old.lifecycle_status <> 'approved'
  then
    perform public.impact_accounting_assert_methodology_for_approval(
      new.methodology,
      new.mechanism_family,
      new.model_key
    );
    if cardinality(new.approval_blockers) <> 0 then
      raise exception 'Impact methodology still has approval blockers'
        using errcode = '23514';
    end if;
  end if;

  new.updated_at := now();
  return new;
end;
$$;

create or replace function public.submit_impact_model_version_for_review(
  p_model_version_id uuid
)
returns public.impact_model_versions
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  model_row public.impact_model_versions%rowtype;
begin
  if not public.is_impact_model_approver(false) then
    raise exception 'Authenticated impact-model approver authorization required'
      using errcode = '42501';
  end if;

  select * into model_row
  from public.impact_model_versions
  where id = p_model_version_id
  for update;

  if not found then
    raise exception 'Impact model version not found' using errcode = 'P0002';
  end if;
  if model_row.lifecycle_status = 'under_review' then
    return model_row;
  end if;
  if model_row.lifecycle_status <> 'draft' then
    raise exception 'Only draft impact models can enter review' using errcode = '23514';
  end if;

  perform public.impact_accounting_assert_methodology_for_review(
    model_row.methodology,
    model_row.mechanism_family,
    model_row.model_key
  );

  update public.impact_model_versions
  set lifecycle_status = 'under_review',
      submitted_at = now()
  where id = model_row.id
  returning * into model_row;

  return model_row;
end;
$$;

create or replace function public.review_impact_model_version(
  p_model_version_id uuid,
  p_decision text,
  p_notes text default null
)
returns public.impact_model_versions
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  model_row public.impact_model_versions%rowtype;
  is_material boolean;
  reviewer_id uuid;
  normalized_notes text;
begin
  if not public.is_impact_model_approver(false) then
    raise exception 'Authenticated impact-model approver authorization required'
      using errcode = '42501';
  end if;

  reviewer_id := auth.uid();
  if reviewer_id is null then
    raise exception 'Authenticated impact-model approver identity required'
      using errcode = '42501';
  end if;
  if p_decision not in ('approve','reject') then
    raise exception 'Decision must be approve or reject' using errcode = '22023';
  end if;
  if p_notes is not null and char_length(p_notes) > 5000 then
    raise exception 'Review notes exceed 5000 characters' using errcode = '22001';
  end if;

  normalized_notes := nullif(btrim(p_notes), '');

  select * into model_row
  from public.impact_model_versions
  where id = p_model_version_id
  for update;

  if not found then
    raise exception 'Impact model version not found' using errcode = 'P0002';
  end if;

  if (
    (p_decision = 'approve' and model_row.lifecycle_status = 'approved')
    or (p_decision = 'reject' and model_row.lifecycle_status = 'draft')
  ) and exists (
    select 1
    from public.impact_model_approval_events approval
    where approval.model_version_id = model_row.id
      and approval.approver_user_id = reviewer_id
      and approval.decision = p_decision
      and approval.methodology_hash = model_row.methodology_hash
      and approval.notes is not distinct from normalized_notes
  ) then
    return model_row;
  end if;

  if model_row.lifecycle_status <> 'under_review' then
    raise exception 'Impact model must be under review' using errcode = '23514';
  end if;

  if p_decision = 'approve' then
    if cardinality(model_row.approval_blockers) <> 0 then
      raise exception 'Impact methodology still has approval blockers'
        using errcode = '23514';
    end if;
    perform public.impact_accounting_assert_methodology_for_approval(
      model_row.methodology,
      model_row.mechanism_family,
      model_row.model_key
    );
  else
    perform public.impact_accounting_assert_methodology_for_review(
      model_row.methodology,
      model_row.mechanism_family,
      model_row.model_key
    );
  end if;

  is_material := model_row.material_change_from is not null;
  insert into public.impact_model_approval_events (
    model_version_id,
    approver_user_id,
    approver_user_fingerprint,
    decision,
    methodology_hash,
    material_methodology_change,
    notes
  ) values (
    model_row.id,
    reviewer_id,
    public.impact_accounting_user_fingerprint(reviewer_id),
    p_decision,
    model_row.methodology_hash,
    is_material,
    normalized_notes
  );

  if p_decision = 'approve' then
    update public.impact_model_versions
    set lifecycle_status = 'approved',
        approved_at = now()
    where id = model_row.id
    returning * into model_row;
  else
    update public.impact_model_versions
    set lifecycle_status = 'draft',
        submitted_at = null
    where id = model_row.id
    returning * into model_row;
  end if;

  return model_row;
end;
$$;

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
    from jsonb_array_elements(p_snapshot -> 'components') component
    cross join lateral jsonb_array_elements_text(
      component -> 'resourceClaimRefs'
    ) claim(value)
    where component ->> 'status' = 'available'
      and (component ->> 'additiveToCausedTotal')::boolean
    group by claim.value
    having count(*) > 1
  ) then
    raise exception 'Overlapping additive resource claims are forbidden'
      using errcode = '23514';
  end if;
end;
$$;

create or replace function public.impact_accounting_validate_snapshot()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  model_row public.impact_model_versions%rowtype;
  payload_state_as_of timestamptz;
  payload_expires_at timestamptz;
  available_modeled_count integer;
begin
  perform public.impact_accounting_assert_snapshot_payload(new.snapshot);

  if new.snapshot ->> 'schemaVersion' <> new.schema_version
    or new.snapshot ->> 'subjectRef' <> new.subject_ref
    or new.snapshot ->> 'mechanismFamily' <> new.mechanism_family
    or new.snapshot ->> 'inputStateHash' <> new.input_state_hash
    or new.snapshot #>> '{health,status}' <> new.health_status
  then
    raise exception 'Impact snapshot columns must match the immutable JSON payload'
      using errcode = '23514';
  end if;

  begin
    payload_state_as_of := (new.snapshot ->> 'stateAsOf')::timestamptz;
  exception when invalid_datetime_format then
    raise exception 'Impact snapshot stateAsOf is invalid' using errcode = '23514';
  end;
  if payload_state_as_of <> new.state_as_of then
    raise exception 'Impact snapshot stateAsOf must match its immutable column'
      using errcode = '23514';
  end if;

  if new.expires_at is null then
    if new.snapshot -> 'expiresAt' is null
      or new.snapshot -> 'expiresAt' <> 'null'::jsonb
    then
      raise exception 'Impact snapshot expiresAt must be explicit null when unbounded'
        using errcode = '23514';
    end if;
  else
    begin
      payload_expires_at := (new.snapshot ->> 'expiresAt')::timestamptz;
    exception when invalid_datetime_format then
      raise exception 'Impact snapshot expiresAt is invalid' using errcode = '23514';
    end;
    if payload_expires_at <> new.expires_at then
      raise exception 'Impact snapshot expiresAt must match its immutable column'
        using errcode = '23514';
    end if;
  end if;

  if new.state_as_of > new.generated_at then
    raise exception 'Impact snapshot state cannot be newer than generation time'
      using errcode = '23514';
  end if;

  select count(*)
  into available_modeled_count
  from jsonb_array_elements(new.snapshot -> 'components') component
  where component ->> 'status' = 'available'
    and component ->> 'source' in ('approved_model','reference_class');

  if new.publication_status = 'current'
    and (
      new.health_status <> 'passed'
      or (new.expires_at is not null and new.expires_at <= clock_timestamp())
    )
    and available_modeled_count > 0
  then
    raise exception 'Modeled impact components must be withheld under non-passing or stale health'
      using errcode = '23514';
  end if;

  if new.model_version_id is null then
    if available_modeled_count > 0 then
      raise exception 'Available modeled components require a matching active model'
        using errcode = '23514';
    end if;
  else
    select * into model_row
    from public.impact_model_versions
    where id = new.model_version_id;

    if not found
      or model_row.lifecycle_status <> 'active'
      or model_row.methodology_hash <> new.methodology_hash
      or model_row.mechanism_family <> new.mechanism_family
    then
      raise exception 'Modeled impact snapshots require the matching active model'
        using errcode = '23514';
    end if;

    if exists (
      select 1
      from jsonb_array_elements(new.snapshot -> 'components') component
      where component ->> 'status' = 'available'
        and component ->> 'source' in ('approved_model','reference_class')
        and (
          component #>> '{model,modelKey}' <> model_row.model_key
          or (component #>> '{model,modelVersion}')::integer <> model_row.version
          or component #>> '{model,methodologyHash}' <> model_row.methodology_hash
        )
    ) then
      raise exception 'Available modeled component does not match the active model'
        using errcode = '23514';
    end if;
  end if;

  return new;
end;
$$;

comment on function public.impact_accounting_assert_methodology_for_review(jsonb,text,text) is
  'Validates review-ready methodology structure, causal-identification policy, evidence semantics, strategic behavior, provenance, and non-additive overlap rules.';
comment on function public.impact_accounting_assert_methodology_for_approval(jsonb,text,text) is
  'Requires validated causal identification, validated confidence thresholds, and eligible empirical calibration evidence before exact-hash approval.';
comment on table public.impact_model_versions is
  'Versioned impact methodologies. Under-review versions may retain explicit blockers. Approval requires validated identification and calibration; activation additionally requires current passing model health.';
comment on table public.impact_estimate_snapshots is
  'Immutable participant-scoped snapshots. Deterministic terms and verified outcomes may remain current under blocked or stale model health only when all modeled components are withheld.';

commit;
