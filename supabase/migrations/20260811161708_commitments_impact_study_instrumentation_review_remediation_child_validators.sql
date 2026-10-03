begin;

create or replace function public.impact_study_assert_validator_attestation(
  p_payload jsonb,
  p_study_instance_payload jsonb
)
returns void
language plpgsql
set search_path = public
as $$
declare
  expected_hash text;
begin
  if not public.impact_study_object_has_exact_keys(
    p_payload,
    array[
      'attestationSchemaVersion','schemaKey','schemaRawSha256',
      'validatorKey','validatorRawSha256','studyInstancePayloadHash',
      'evidenceToProductMappingHash','validationResult',
      'instrumentationEnvironment','subjectMode',
      'executionAuthorized','attestationPayloadSha256'
    ]::text[]
  ) then
    raise exception 'Validator attestation shape is invalid'
      using errcode = '23514';
  end if;

  perform public.impact_study_assert_no_real_identifiers(
    p_payload,
    'Validator attestation'
  );

  if p_payload ->> 'attestationSchemaVersion'
      <> 'moral-trade-impact-study-validator-attestation-v2'
    or p_payload ->> 'schemaKey'
      <> 'commitments-impact-study-instance-schema-v2'
    or p_payload ->> 'schemaRawSha256' <> 'sha256:a8650788ed3e0ab6749dcd86342fd9c39dfc829ec23a4afe00d34bd28fa2a859'
    or p_payload ->> 'validatorKey'
      <> 'commitments-impact-study-instance-validator-v2'
    or p_payload ->> 'validatorRawSha256' <> 'sha256:1381fd100964182e1de8c3b276624b2fe51ffbad512505166fed23a7b1396c85'
    or p_payload ->> 'studyInstancePayloadHash'
      <> p_study_instance_payload ->> 'studyInstancePayloadHash'
    or p_payload ->> 'evidenceToProductMappingHash'
      <> p_study_instance_payload ->> 'evidenceToProductMappingHash'
    or p_payload ->> 'validationResult' <> 'valid'
    or p_payload ->> 'instrumentationEnvironment' <> 'qa'
    or p_payload ->> 'subjectMode' <> 'synthetic_only'
    or p_payload -> 'executionAuthorized' is distinct from 'false'::jsonb
  then
    raise exception 'Validator attestation does not bind the exact accepted contract'
      using errcode = '23514';
  end if;

  if not exists (
    select 1
    from public.impact_study_validator_bindings binding
    where binding.schema_key = p_payload ->> 'schemaKey'
      and binding.schema_raw_sha256 = p_payload ->> 'schemaRawSha256'
      and binding.validator_key = p_payload ->> 'validatorKey'
      and binding.validator_raw_sha256 = p_payload ->> 'validatorRawSha256'
      and binding.evidence_mapping_payload_hash =
        p_payload ->> 'evidenceToProductMappingHash'
      and binding.binding_status = 'bound_nonexecuting'
      and not binding.execution_authorized
  ) then
    raise exception 'Validator binding is absent' using errcode = '23514';
  end if;

  expected_hash := public.impact_study_jsonb_sha256(
    p_payload - 'attestationPayloadSha256'
  );
  if expected_hash <> p_payload ->> 'attestationPayloadSha256' then
    raise exception 'Validator attestation hash mismatch'
      using errcode = '23514';
  end if;
end;
$$;

create or replace function public.impact_study_assert_child_payload(
  p_kind text,
  p_payload jsonb
)
returns void
language plpgsql
immutable
set search_path = public
as $$
begin
  perform public.impact_study_assert_no_real_identifiers(
    p_payload,
    p_kind || ' payload'
  );

  if p_kind = 'assignment' then
    if not public.impact_study_object_has_exact_keys(
      p_payload,
      array['fixtureKey','stratumKey','drawIndex']::text[]
    )
      or not public.impact_study_is_synthetic_key(
        p_payload ->> 'fixtureKey'
      )
      or not public.impact_study_is_synthetic_key(
        p_payload ->> 'stratumKey'
      )
      or p_payload ->> 'drawIndex' !~ '^[0-9]+$'
    then
      raise exception 'Synthetic assignment payload is invalid'
        using errcode = '23514';
    end if;
  elsif p_kind = 'exposure' then
    if not public.impact_study_object_has_exact_keys(
      p_payload,
      array['fixtureKey','sourceEventKey']::text[]
    )
      or not public.impact_study_is_synthetic_key(
        p_payload ->> 'fixtureKey'
      )
      or not public.impact_study_is_synthetic_key(
        p_payload ->> 'sourceEventKey'
      )
    then
      raise exception 'Synthetic exposure payload is invalid'
        using errcode = '23514';
    end if;
  elsif p_kind = 'outcome' then
    if not public.impact_study_object_has_exact_keys(
      p_payload,
      array[
        'fixtureKey','adjudicationRuleKey','evidenceResolutionKey'
      ]::text[]
    )
      or not public.impact_study_is_synthetic_key(
        p_payload ->> 'fixtureKey'
      )
      or not public.impact_study_is_synthetic_key(
        p_payload ->> 'adjudicationRuleKey'
      )
      or not public.impact_study_is_synthetic_key(
        p_payload ->> 'evidenceResolutionKey'
      )
    then
      raise exception 'Synthetic outcome payload is invalid'
        using errcode = '23514';
    end if;
  elsif p_kind = 'safety' then
    if not public.impact_study_object_has_exact_keys(
      p_payload,
      array['fixtureKey','detectionRuleKey']::text[]
    )
      or not public.impact_study_is_synthetic_key(
        p_payload ->> 'fixtureKey'
      )
      or not public.impact_study_is_synthetic_key(
        p_payload ->> 'detectionRuleKey'
      )
    then
      raise exception 'Synthetic safety payload is invalid'
        using errcode = '23514';
    end if;
  elsif p_kind = 'calibration' then
    if not public.impact_study_object_has_exact_keys(
      p_payload,
      array['fixtureKey','schemaKey']::text[]
    )
      or not public.impact_study_is_synthetic_key(
        p_payload ->> 'fixtureKey'
      )
      or not public.impact_study_is_synthetic_key(
        p_payload ->> 'schemaKey'
      )
    then
      raise exception 'Synthetic calibration payload is invalid'
        using errcode = '23514';
    end if;
  else
    raise exception 'Unknown child payload kind %', p_kind
      using errcode = '23514';
  end if;
end;
$$;

create or replace function public.impact_study_assert_event_payload(
  p_event_type text,
  p_payload jsonb
)
returns void
language plpgsql
immutable
set search_path = public
as $$
begin
  perform public.impact_study_assert_no_real_identifiers(
    p_payload,
    p_event_type || ' event'
  );

  if p_event_type = 'study_registered' then
    if not public.impact_study_object_has_exact_keys(
      p_payload,
      array[
        'studyKey','studyInstancePayloadHash',
        'validatorAttestationHash','evidenceToProductMappingHash',
        'executionAuthorized','subjectMode'
      ]::text[]
    )
      or not public.impact_study_is_synthetic_key(
        p_payload ->> 'studyKey'
      )
      or not public.impact_study_is_sha256(
        p_payload ->> 'studyInstancePayloadHash'
      )
      or not public.impact_study_is_sha256(
        p_payload ->> 'validatorAttestationHash'
      )
      or not public.impact_study_is_sha256(
        p_payload ->> 'evidenceToProductMappingHash'
      )
      or p_payload -> 'executionAuthorized'
        is distinct from 'false'::jsonb
      or p_payload ->> 'subjectMode' <> 'synthetic_only'
    then
      raise exception 'Study registration event payload is invalid'
        using errcode = '23514';
    end if;
  elsif p_event_type = 'synthetic_assignment_recorded' then
    if not public.impact_study_object_has_exact_keys(
      p_payload,
      array[
        'assignmentId','syntheticSubjectKey','armKey',
        'assignmentProbability','plannedExposureCell'
      ]::text[]
    )
      or p_payload ->> 'assignmentId'
        !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
      or not public.impact_study_is_synthetic_key(
        p_payload ->> 'syntheticSubjectKey'
      )
      or not public.impact_study_is_key(p_payload ->> 'armKey')
      or p_payload ->> 'assignmentProbability'
        !~ '^(0\.[0-9]{1,10}|1(\.0{1,10})?)$'
      or not public.impact_study_is_key(
        p_payload ->> 'plannedExposureCell'
      )
    then
      raise exception 'Assignment event payload is invalid'
        using errcode = '23514';
    end if;
  elsif p_event_type = 'synthetic_exposure_recorded' then
    if not public.impact_study_object_has_exact_keys(
      p_payload,
      array[
        'exposureId','assignmentId','observedExposureCell',
        'contaminationDetected','spilloverDetected'
      ]::text[]
    )
      or p_payload ->> 'exposureId'
        !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
      or p_payload ->> 'assignmentId'
        !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
      or not public.impact_study_is_key(
        p_payload ->> 'observedExposureCell'
      )
      or jsonb_typeof(p_payload -> 'contaminationDetected') <> 'boolean'
      or jsonb_typeof(p_payload -> 'spilloverDetected') <> 'boolean'
    then
      raise exception 'Exposure event payload is invalid'
        using errcode = '23514';
    end if;
  elsif p_event_type = 'synthetic_outcome_recorded' then
    if not public.impact_study_object_has_exact_keys(
      p_payload,
      array[
        'outcomeId','syntheticSubjectKey','outcomeKey','nativeUnit',
        'resolutionStatus','causalClaimAuthorized'
      ]::text[]
    )
      or p_payload ->> 'outcomeId'
        !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
      or not public.impact_study_is_synthetic_key(
        p_payload ->> 'syntheticSubjectKey'
      )
      or not public.impact_study_is_key(p_payload ->> 'outcomeKey')
      or btrim(coalesce(p_payload ->> 'nativeUnit','')) = ''
      or p_payload ->> 'resolutionStatus'
        not in ('reviewed','unresolved','missing','rejected')
      or p_payload -> 'causalClaimAuthorized'
        is distinct from 'false'::jsonb
    then
      raise exception 'Outcome event payload is invalid'
        using errcode = '23514';
    end if;
  elsif p_event_type = 'safety_veto_recorded' then
    if not public.impact_study_object_has_exact_keys(
      p_payload,
      array[
        'safetyEventId','safetyEventKey','safetyOutcomeKey',
        'safetyStatus','blockingVeto'
      ]::text[]
    )
      or p_payload ->> 'safetyEventId'
        !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
      or not public.impact_study_is_synthetic_key(
        p_payload ->> 'safetyEventKey'
      )
      or p_payload ->> 'safetyOutcomeKey' not in (
        'harmful_offer_or_threat',
        'baseline_manufacture_or_worsening',
        'harm_shifted_to_nonparticipants',
        'coercion_harassment_identity_exposure_or_retaliation',
        'concentration_or_exclusion_effect',
        'off_platform_substitution',
        'duplicate_or_overlapping_resource_claim'
      )
      or p_payload ->> 'safetyStatus' not in ('observed','unresolved')
      or p_payload -> 'blockingVeto' is distinct from 'true'::jsonb
    then
      raise exception 'Safety event payload is invalid'
        using errcode = '23514';
    end if;
  elsif p_event_type = 'calibration_manifest_recorded' then
    if not public.impact_study_object_has_exact_keys(
      p_payload,
      array[
        'manifestId','datasetKey','sourceScope',
        'eligibleForEmpiricalCalibration','eligibleForModelActivation'
      ]::text[]
    )
      or p_payload ->> 'manifestId'
        !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
      or not public.impact_study_is_synthetic_key(
        p_payload ->> 'datasetKey'
      )
      or p_payload ->> 'sourceScope' <> 'synthetic_qa_only'
      or p_payload -> 'eligibleForEmpiricalCalibration'
        is distinct from 'false'::jsonb
      or p_payload -> 'eligibleForModelActivation'
        is distinct from 'false'::jsonb
    then
      raise exception 'Calibration event payload is invalid'
        using errcode = '23514';
    end if;
  elsif p_event_type = 'amendment_recorded' then
    if not public.impact_study_object_has_exact_keys(
      p_payload,
      array['amendmentKey','fixtureKey']::text[]
    )
      or not public.impact_study_is_synthetic_key(
        p_payload ->> 'amendmentKey'
      )
      or not public.impact_study_is_synthetic_key(
        p_payload ->> 'fixtureKey'
      )
    then
      raise exception 'Amendment event payload is invalid'
        using errcode = '23514';
    end if;
  elsif p_event_type = 'deviation_recorded' then
    if not public.impact_study_object_has_exact_keys(
      p_payload,
      array['deviationKey','fixtureKey']::text[]
    )
      or not public.impact_study_is_synthetic_key(
        p_payload ->> 'deviationKey'
      )
      or not public.impact_study_is_synthetic_key(
        p_payload ->> 'fixtureKey'
      )
    then
      raise exception 'Deviation event payload is invalid'
        using errcode = '23514';
    end if;
  elsif p_event_type = 'unblinding_recorded' then
    if not public.impact_study_object_has_exact_keys(
      p_payload,
      array['unblindingKey','fixtureKey']::text[]
    )
      or not public.impact_study_is_synthetic_key(
        p_payload ->> 'unblindingKey'
      )
      or not public.impact_study_is_synthetic_key(
        p_payload ->> 'fixtureKey'
      )
    then
      raise exception 'Unblinding event payload is invalid'
        using errcode = '23514';
    end if;
  elsif p_event_type = 'post_assignment_eligibility_change_recorded' then
    if not public.impact_study_object_has_exact_keys(
      p_payload,
      array['changeKey','fixtureKey']::text[]
    )
      or not public.impact_study_is_synthetic_key(
        p_payload ->> 'changeKey'
      )
      or not public.impact_study_is_synthetic_key(
        p_payload ->> 'fixtureKey'
      )
    then
      raise exception 'Eligibility-change event payload is invalid'
        using errcode = '23514';
    end if;
  elsif p_event_type = 'study_cancelled' then
    if not public.impact_study_object_has_exact_keys(
      p_payload,
      array['cancellationKey','fixtureKey','reasonCode']::text[]
    )
      or not public.impact_study_is_synthetic_key(
        p_payload ->> 'cancellationKey'
      )
      or not public.impact_study_is_synthetic_key(
        p_payload ->> 'fixtureKey'
      )
      or not public.impact_study_is_key(p_payload ->> 'reasonCode')
    then
      raise exception 'Cancellation event payload is invalid'
        using errcode = '23514';
    end if;
  else
    raise exception 'Unsupported study event type %', p_event_type
      using errcode = '23514';
  end if;
end;
$$;

create or replace function public.impact_study_is_blocked(
  p_study_instance_id uuid
)
returns boolean
language sql
stable
set search_path = public
as $$
  select exists (
    select 1
    from public.impact_study_registry_events event
    where event.study_instance_id = p_study_instance_id
      and event.event_type = 'study_cancelled'
  )
  or exists (
    select 1
    from public.impact_study_safety_events safety
    where safety.study_instance_id = p_study_instance_id
      and safety.blocking_veto
      and safety.safety_status in ('observed','unresolved')
  );
$$;

create or replace function public.impact_study_reject_mutation()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  raise exception 'Impact-study instrumentation is append-only'
    using errcode = '55000';
end;
$$;

commit;
