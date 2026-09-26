begin;

create or replace function public.impact_study_validate_instance_insert()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  perform public.impact_study_assert_instance_semantics(
    new.study_instance_payload
  );

  if new.study_key <> new.study_instance_payload ->> 'studyKey'
    or new.study_version
      <> (new.study_instance_payload ->> 'studyVersion')::integer
    or new.mechanism_family
      <> new.study_instance_payload ->> 'mechanismFamily'
    or new.study_variant <> new.study_instance_payload ->> 'studyVariant'
    or new.protocol_key <> new.study_instance_payload ->> 'protocolKey'
    or new.protocol_payload_hash
      <> new.study_instance_payload ->> 'protocolPayloadHash'
    or new.template_key <> new.study_instance_payload ->> 'templateKey'
    or new.template_payload_hash
      <> new.study_instance_payload ->> 'templatePayloadHash'
    or new.evidence_mapping_payload_hash
      <> new.study_instance_payload ->> 'evidenceToProductMappingHash'
    or new.study_instance_schema_key
      <> 'commitments-impact-study-instance-schema-v2'
    or new.study_instance_schema_hash
      <> new.study_instance_payload ->> 'studyInstanceSchemaHash'
    or new.validator_key
      <> 'commitments-impact-study-instance-validator-v2'
    or new.validator_hash <> 'sha256:1381fd100964182e1de8c3b276624b2fe51ffbad512505166fed23a7b1396c85'
    or new.study_instance_payload_hash
      <> new.study_instance_payload ->> 'studyInstancePayloadHash'
    or new.eligible_population_snapshot_hash
      <> new.study_instance_payload ->> 'eligiblePopulationSnapshotHash'
    or new.assignment_code_hash
      <> new.study_instance_payload ->> 'assignmentCodeHash'
    or new.analysis_code_hash
      <> new.study_instance_payload ->> 'analysisCodeHash'
    or new.seed_commitment
      <> new.study_instance_payload ->> 'seedCommitment'
    or new.append_only_registry_uri
      <> new.study_instance_payload ->> 'appendOnlyRegistryRecord'
    or new.protected_record_ref
      <> new.study_instance_payload ->> 'protectedTagOrEquivalent'
    or new.environment <> 'qa'
    or new.subject_mode <> 'synthetic_only'
    or new.execution_authorized
    or new.real_user_assignment_allowed
  then
    raise exception 'Study instance columns do not match the exact payload'
      using errcode = '23514';
  end if;

  return new;
end;
$$;

create or replace function public.impact_study_validate_attestation_insert()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  instance_payload jsonb;
begin
  select instance.study_instance_payload
  into instance_payload
  from public.impact_study_instances instance
  where instance.id = new.study_instance_id;

  if instance_payload is null then
    raise exception 'Validator attestation requires a study instance'
      using errcode = '23503';
  end if;

  perform public.impact_study_assert_validator_attestation(
    new.attestation_payload,
    instance_payload
  );

  if new.attestation_payload_sha256
      <> new.attestation_payload ->> 'attestationPayloadSha256'
    or new.schema_key <> new.attestation_payload ->> 'schemaKey'
    or new.schema_raw_sha256
      <> new.attestation_payload ->> 'schemaRawSha256'
    or new.validator_key <> new.attestation_payload ->> 'validatorKey'
    or new.validator_raw_sha256
      <> new.attestation_payload ->> 'validatorRawSha256'
    or new.study_instance_payload_hash
      <> new.attestation_payload ->> 'studyInstancePayloadHash'
    or new.evidence_mapping_payload_hash
      <> new.attestation_payload ->> 'evidenceToProductMappingHash'
    or new.validation_result <> 'valid'
    or new.execution_authorized
  then
    raise exception 'Validator attestation columns do not match the payload'
      using errcode = '23514';
  end if;

  return new;
end;
$$;

create or replace function public.impact_study_validate_child_insert()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  parent_id uuid;
  assignment_record public.impact_study_synthetic_assignments%rowtype;
  allowed_probability numeric;
  allowed_native_unit text;
  payload_value jsonb;
  declared_hash text;
  payload_kind text;
begin
  if tg_table_name = 'impact_study_registry_events' then
    parent_id := new.study_instance_id;
    payload_value := new.event_payload;
    declared_hash := new.event_payload_sha256;
    perform public.impact_study_assert_event_payload(
      new.event_type,
      new.event_payload
    );

    if new.event_type = 'study_cancelled' and exists (
      select 1
      from public.impact_study_registry_events event
      where event.study_instance_id = parent_id
        and event.event_type = 'study_cancelled'
    ) then
      raise exception 'Study cancellation is append-only and may occur once'
        using errcode = '23514';
    end if;

    if new.event_type = 'amendment_recorded' and exists (
      select 1
      from public.impact_study_synthetic_assignments assignment
      where assignment.study_instance_id = parent_id
    ) then
      raise exception 'Pre-assignment amendments are prohibited after assignment'
        using errcode = '23514';
    end if;

    if public.impact_study_is_blocked(parent_id)
      and new.event_type not in (
        'deviation_recorded','unblinding_recorded',
        'post_assignment_eligibility_change_recorded',
        'safety_veto_recorded','study_cancelled'
      )
    then
      raise exception 'Blocked or cancelled studies accept diagnostic events only'
        using errcode = '55000';
    end if;
  elsif tg_table_name = 'impact_study_synthetic_assignments' then
    parent_id := new.study_instance_id;
    payload_value := new.assignment_payload;
    declared_hash := new.assignment_payload_sha256;
    payload_kind := 'assignment';

    select arm.assignment_probability
    into allowed_probability
    from public.impact_study_allowed_arms arm
    where arm.study_instance_id = parent_id
      and arm.arm_key = new.arm_key;

    if allowed_probability is null
      or allowed_probability <> new.assignment_probability
    then
      raise exception 'Assignment arm probability does not match the frozen design'
        using errcode = '23514';
    end if;

    if not exists (
      select 1
      from public.impact_study_allowed_exposure_cells cell
      where cell.study_instance_id = parent_id
        and cell.exposure_cell_key = new.planned_exposure_cell
    ) then
      raise exception 'Planned exposure cell is not registered'
        using errcode = '23514';
    end if;
  elsif tg_table_name = 'impact_study_synthetic_exposures' then
    select *
    into assignment_record
    from public.impact_study_synthetic_assignments assignment
    where assignment.id = new.assignment_id;

    parent_id := assignment_record.study_instance_id;
    payload_value := new.exposure_payload;
    declared_hash := new.exposure_payload_sha256;
    payload_kind := 'exposure';

    if parent_id is null then
      raise exception 'Synthetic exposure requires a prior assignment'
        using errcode = '23503';
    end if;

    if not exists (
      select 1
      from public.impact_study_allowed_exposure_cells cell
      where cell.study_instance_id = parent_id
        and cell.exposure_cell_key = new.observed_exposure_cell
    ) then
      raise exception 'Observed exposure cell is not registered'
        using errcode = '23514';
    end if;
  elsif tg_table_name = 'impact_study_synthetic_outcomes' then
    parent_id := new.study_instance_id;
    payload_value := new.outcome_payload;
    declared_hash := new.outcome_payload_sha256;
    payload_kind := 'outcome';

    if not exists (
      select 1
      from public.impact_study_synthetic_assignments assignment
      where assignment.study_instance_id = parent_id
        and assignment.synthetic_subject_key = new.synthetic_subject_key
    ) then
      raise exception 'Synthetic outcome requires a prior synthetic assignment'
        using errcode = '23514';
    end if;

    select outcome.native_unit
    into allowed_native_unit
    from public.impact_study_allowed_outcomes outcome
    where outcome.study_instance_id = parent_id
      and outcome.outcome_key = new.outcome_key;

    if allowed_native_unit is null
      or allowed_native_unit <> new.native_unit
    then
      raise exception 'Outcome key or native unit is not registered'
        using errcode = '23514';
    end if;

    if exists (
      select 1
      from unnest(new.evidence_refs) evidence_ref
      where not public.impact_study_is_synthetic_evidence_ref(
        evidence_ref
      )
    ) then
      raise exception 'Outcome evidence references must use the synthetic QA scheme'
        using errcode = '23514';
    end if;
  elsif tg_table_name = 'impact_study_safety_events' then
    parent_id := new.study_instance_id;
    payload_value := new.safety_payload;
    declared_hash := new.safety_payload_sha256;
    payload_kind := 'safety';

    if not (
      (
        select instance.study_instance_payload
        from public.impact_study_instances instance
        where instance.id = parent_id
      ) -> 'blockingSafetyOutcomes' ? new.safety_outcome_key
    ) then
      raise exception 'Safety outcome is not registered in the study design'
        using errcode = '23514';
    end if;
  elsif tg_table_name = 'impact_study_calibration_manifests' then
    parent_id := new.study_instance_id;
    payload_value := new.manifest_payload;
    declared_hash := new.manifest_payload_sha256;
    payload_kind := 'calibration';
  else
    raise exception 'Unsupported impact-study child table %', tg_table_name
      using errcode = '23514';
  end if;

  if parent_id is null
    or not exists (
      select 1
      from public.impact_study_instances instance
      where instance.id = parent_id
        and instance.environment = 'qa'
        and instance.subject_mode = 'synthetic_only'
        and not instance.execution_authorized
        and not instance.real_user_assignment_allowed
        and instance.registry_status = 'registered_nonexecuting'
    )
  then
    raise exception 'Child instrumentation requires a non-executing QA study instance'
      using errcode = '23514';
  end if;

  perform public.impact_study_assert_payload_hash(
    payload_value,
    declared_hash
  );

  if payload_kind is not null then
    perform public.impact_study_assert_child_payload(
      payload_kind,
      payload_value
    );
  end if;

  if tg_table_name in (
      'impact_study_synthetic_assignments',
      'impact_study_synthetic_exposures',
      'impact_study_synthetic_outcomes',
      'impact_study_calibration_manifests'
    )
    and public.impact_study_is_blocked(parent_id)
  then
    raise exception 'Cancelled or safety-blocked studies reject new synthetic records'
      using errcode = '55000';
  end if;

  return new;
end;
$$;

create or replace function public.register_qa_impact_study_instance(
  p_payload jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
begin
  raise exception 'Validator attestation is required for study registration'
    using errcode = '42501';
end;
$$;

create or replace function public.register_qa_impact_study_instance(
  p_payload jsonb,
  p_validator_attestation jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  new_id uuid;
  registration_event jsonb;
  arm jsonb;
  cell text;
  outcome jsonb;
  scheme text;
begin
  perform public.impact_study_assert_instance_semantics(p_payload);
  perform public.impact_study_assert_validator_attestation(
    p_validator_attestation,
    p_payload
  );

  insert into public.impact_study_instances (
    study_key, study_version, mechanism_family, study_variant,
    protocol_key, protocol_payload_hash, template_key,
    template_payload_hash, evidence_mapping_payload_hash,
    study_instance_schema_key, study_instance_schema_hash,
    validator_key, validator_hash, study_instance_payload,
    study_instance_payload_hash, eligible_population_snapshot_hash,
    assignment_code_hash, analysis_code_hash, seed_commitment,
    append_only_registry_uri, protected_record_ref
  ) values (
    p_payload ->> 'studyKey',
    (p_payload ->> 'studyVersion')::integer,
    p_payload ->> 'mechanismFamily',
    p_payload ->> 'studyVariant',
    p_payload ->> 'protocolKey',
    p_payload ->> 'protocolPayloadHash',
    p_payload ->> 'templateKey',
    p_payload ->> 'templatePayloadHash',
    p_payload ->> 'evidenceToProductMappingHash',
    'commitments-impact-study-instance-schema-v2',
    p_payload ->> 'studyInstanceSchemaHash',
    'commitments-impact-study-instance-validator-v2',
    'sha256:1381fd100964182e1de8c3b276624b2fe51ffbad512505166fed23a7b1396c85',
    p_payload,
    p_payload ->> 'studyInstancePayloadHash',
    p_payload ->> 'eligiblePopulationSnapshotHash',
    p_payload ->> 'assignmentCodeHash',
    p_payload ->> 'analysisCodeHash',
    p_payload ->> 'seedCommitment',
    p_payload ->> 'appendOnlyRegistryRecord',
    p_payload ->> 'protectedTagOrEquivalent'
  )
  returning id into new_id;

  insert into public.impact_study_validator_attestations (
    study_instance_id, attestation_payload,
    attestation_payload_sha256, schema_key, schema_raw_sha256,
    validator_key, validator_raw_sha256,
    study_instance_payload_hash, evidence_mapping_payload_hash,
    validation_result, execution_authorized
  ) values (
    new_id,
    p_validator_attestation,
    p_validator_attestation ->> 'attestationPayloadSha256',
    p_validator_attestation ->> 'schemaKey',
    p_validator_attestation ->> 'schemaRawSha256',
    p_validator_attestation ->> 'validatorKey',
    p_validator_attestation ->> 'validatorRawSha256',
    p_validator_attestation ->> 'studyInstancePayloadHash',
    p_validator_attestation ->> 'evidenceToProductMappingHash',
    'valid',
    false
  );

  for arm in
    select value
    from jsonb_array_elements(p_payload -> 'assignmentProbabilities')
  loop
    insert into public.impact_study_allowed_arms (
      study_instance_id, arm_key, assignment_probability
    ) values (
      new_id,
      arm ->> 'armKey',
      (arm ->> 'probability')::numeric
    );
  end loop;

  for cell in
    select value
    from jsonb_array_elements_text(p_payload -> 'supportedExposureCells')
  loop
    insert into public.impact_study_allowed_exposure_cells (
      study_instance_id, exposure_cell_key
    ) values (new_id, cell);
  end loop;

  for outcome in
    select value
    from jsonb_array_elements(p_payload -> 'outcomeRegistry')
  loop
    insert into public.impact_study_allowed_outcomes (
      study_instance_id, outcome_key, outcome_kind,
      native_unit, outcome_role
    ) values (
      new_id,
      outcome ->> 'outcomeKey',
      outcome ->> 'outcomeKind',
      outcome ->> 'nativeUnit',
      outcome ->> 'role'
    );
  end loop;

  for scheme in
    select value
    from jsonb_array_elements_text(p_payload -> 'evidenceReferenceSchemes')
  loop
    insert into public.impact_study_allowed_evidence_schemes (
      study_instance_id, scheme_prefix
    ) values (new_id, scheme);
  end loop;

  registration_event := jsonb_build_object(
    'studyKey', p_payload ->> 'studyKey',
    'studyInstancePayloadHash', p_payload ->> 'studyInstancePayloadHash',
    'validatorAttestationHash',
      p_validator_attestation ->> 'attestationPayloadSha256',
    'evidenceToProductMappingHash',
      p_payload ->> 'evidenceToProductMappingHash',
    'executionAuthorized', false,
    'subjectMode', 'synthetic_only'
  );

  insert into public.impact_study_registry_events (
    study_instance_id, event_type,
    event_payload, event_payload_sha256
  ) values (
    new_id,
    'study_registered',
    registration_event,
    public.impact_study_jsonb_sha256(registration_event)
  );

  return new_id;
end;
$$;

create or replace function public.append_qa_impact_study_event(
  p_study_instance_id uuid,
  p_event_type text,
  p_event_payload jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  new_id uuid;
begin
  if p_event_type not in (
    'amendment_recorded','deviation_recorded','unblinding_recorded',
    'post_assignment_eligibility_change_recorded','study_cancelled'
  ) then
    raise exception 'This RPC accepts lifecycle and diagnostic events only'
      using errcode = '23514';
  end if;

  insert into public.impact_study_registry_events (
    study_instance_id, event_type,
    event_payload, event_payload_sha256
  ) values (
    p_study_instance_id,
    p_event_type,
    p_event_payload,
    public.impact_study_jsonb_sha256(p_event_payload)
  )
  returning id into new_id;

  return new_id;
end;
$$;

create or replace function public.record_qa_synthetic_assignment(
  p_study_instance_id uuid,
  p_synthetic_subject_key text,
  p_synthetic_cluster_key text,
  p_arm_key text,
  p_assignment_probability numeric,
  p_planned_exposure_cell text,
  p_assignment_payload jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  new_id uuid;
  event_payload jsonb;
begin
  insert into public.impact_study_synthetic_assignments (
    study_instance_id, synthetic_subject_key, synthetic_cluster_key,
    arm_key, assignment_probability, planned_exposure_cell,
    assignment_payload, assignment_payload_sha256
  ) values (
    p_study_instance_id, p_synthetic_subject_key, p_synthetic_cluster_key,
    p_arm_key, p_assignment_probability, p_planned_exposure_cell,
    p_assignment_payload,
    public.impact_study_jsonb_sha256(p_assignment_payload)
  )
  returning id into new_id;

  event_payload := jsonb_build_object(
    'assignmentId', new_id::text,
    'syntheticSubjectKey', p_synthetic_subject_key,
    'armKey', p_arm_key,
    'assignmentProbability', trim_scale(p_assignment_probability)::text,
    'plannedExposureCell', p_planned_exposure_cell
  );

  insert into public.impact_study_registry_events (
    study_instance_id, event_type,
    event_payload, event_payload_sha256
  ) values (
    p_study_instance_id,
    'synthetic_assignment_recorded',
    event_payload,
    public.impact_study_jsonb_sha256(event_payload)
  );

  return new_id;
end;
$$;

create or replace function public.record_qa_synthetic_exposure(
  p_assignment_id uuid,
  p_exposure_event_key text,
  p_observed_exposure_cell text,
  p_contamination_detected boolean,
  p_spillover_detected boolean,
  p_exposure_payload jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  new_id uuid;
  study_id uuid;
  event_payload jsonb;
begin
  select assignment.study_instance_id
  into study_id
  from public.impact_study_synthetic_assignments assignment
  where assignment.id = p_assignment_id;

  if study_id is null then
    raise exception 'Synthetic assignment not found' using errcode = '23503';
  end if;

  insert into public.impact_study_synthetic_exposures (
    assignment_id, exposure_event_key, observed_exposure_cell,
    contamination_detected, spillover_detected,
    exposure_payload, exposure_payload_sha256
  ) values (
    p_assignment_id, p_exposure_event_key, p_observed_exposure_cell,
    p_contamination_detected, p_spillover_detected,
    p_exposure_payload,
    public.impact_study_jsonb_sha256(p_exposure_payload)
  )
  returning id into new_id;

  event_payload := jsonb_build_object(
    'exposureId', new_id::text,
    'assignmentId', p_assignment_id::text,
    'observedExposureCell', p_observed_exposure_cell,
    'contaminationDetected', p_contamination_detected,
    'spilloverDetected', p_spillover_detected
  );

  insert into public.impact_study_registry_events (
    study_instance_id, event_type,
    event_payload, event_payload_sha256
  ) values (
    study_id,
    'synthetic_exposure_recorded',
    event_payload,
    public.impact_study_jsonb_sha256(event_payload)
  );

  return new_id;
end;
$$;

create or replace function public.record_qa_synthetic_outcome(
  p_study_instance_id uuid,
  p_synthetic_subject_key text,
  p_outcome_key text,
  p_native_unit text,
  p_numeric_value numeric,
  p_resolution_status text,
  p_evidence_refs text[],
  p_outcome_payload jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  new_id uuid;
  event_payload jsonb;
begin
  insert into public.impact_study_synthetic_outcomes (
    study_instance_id, synthetic_subject_key, outcome_key,
    native_unit, numeric_value, resolution_status, evidence_refs,
    outcome_payload, outcome_payload_sha256
  ) values (
    p_study_instance_id, p_synthetic_subject_key, p_outcome_key,
    p_native_unit, p_numeric_value, p_resolution_status,
    coalesce(p_evidence_refs, '{}'::text[]),
    p_outcome_payload,
    public.impact_study_jsonb_sha256(p_outcome_payload)
  )
  returning id into new_id;

  event_payload := jsonb_build_object(
    'outcomeId', new_id::text,
    'syntheticSubjectKey', p_synthetic_subject_key,
    'outcomeKey', p_outcome_key,
    'nativeUnit', p_native_unit,
    'resolutionStatus', p_resolution_status,
    'causalClaimAuthorized', false
  );

  insert into public.impact_study_registry_events (
    study_instance_id, event_type,
    event_payload, event_payload_sha256
  ) values (
    p_study_instance_id,
    'synthetic_outcome_recorded',
    event_payload,
    public.impact_study_jsonb_sha256(event_payload)
  );

  return new_id;
end;
$$;

create or replace function public.record_qa_impact_safety_event(
  p_study_instance_id uuid,
  p_safety_event_key text,
  p_synthetic_subject_key text,
  p_safety_outcome_key text,
  p_safety_status text,
  p_safety_payload jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  new_id uuid;
  event_payload jsonb;
begin
  insert into public.impact_study_safety_events (
    study_instance_id, safety_event_key, synthetic_subject_key,
    safety_outcome_key, safety_status,
    safety_payload, safety_payload_sha256
  ) values (
    p_study_instance_id, p_safety_event_key, p_synthetic_subject_key,
    p_safety_outcome_key, p_safety_status,
    p_safety_payload,
    public.impact_study_jsonb_sha256(p_safety_payload)
  )
  returning id into new_id;

  event_payload := jsonb_build_object(
    'safetyEventId', new_id::text,
    'safetyEventKey', p_safety_event_key,
    'safetyOutcomeKey', p_safety_outcome_key,
    'safetyStatus', p_safety_status,
    'blockingVeto', true
  );

  insert into public.impact_study_registry_events (
    study_instance_id, event_type,
    event_payload, event_payload_sha256
  ) values (
    p_study_instance_id,
    'safety_veto_recorded',
    event_payload,
    public.impact_study_jsonb_sha256(event_payload)
  );

  return new_id;
end;
$$;

create or replace function public.register_qa_synthetic_calibration_manifest(
  p_study_instance_id uuid,
  p_dataset_key text,
  p_observation_count integer,
  p_manifest_payload jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  new_id uuid;
  event_payload jsonb;
begin
  insert into public.impact_study_calibration_manifests (
    study_instance_id, dataset_key, observation_count,
    manifest_payload, manifest_payload_sha256
  ) values (
    p_study_instance_id, p_dataset_key, p_observation_count,
    p_manifest_payload,
    public.impact_study_jsonb_sha256(p_manifest_payload)
  )
  returning id into new_id;

  event_payload := jsonb_build_object(
    'manifestId', new_id::text,
    'datasetKey', p_dataset_key,
    'sourceScope', 'synthetic_qa_only',
    'eligibleForEmpiricalCalibration', false,
    'eligibleForModelActivation', false
  );

  insert into public.impact_study_registry_events (
    study_instance_id, event_type,
    event_payload, event_payload_sha256
  ) values (
    p_study_instance_id,
    'calibration_manifest_recorded',
    event_payload,
    public.impact_study_jsonb_sha256(event_payload)
  );

  return new_id;
end;
$$;

commit;
