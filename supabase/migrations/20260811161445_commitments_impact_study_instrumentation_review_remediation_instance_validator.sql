begin;

do $qa_guard$
begin
  if not exists (
    select 1
    from moraltrade_qa.environment_identity
    where singleton
      and environment = 'qa'
      and project_ref = 'hvmxfjjbdcgjjudmthdz'
      and sentinel_id = 'a0244e19-9744-4a82-83e4-57776804cc06'::uuid
      and sentinel_sha256 = 'f7801a29e33764650322ad39e66a2062d9e2f750a9438e74d9fff0c9eeeb8d30'
      and provisioned_out_of_band
  ) then
    raise exception 'MoralTrade QA sentinel is absent or incorrect'
      using errcode = '55000';
  end if;
end;
$qa_guard$;

create or replace function public.impact_study_required_binding_names()
returns text[]
language sql
immutable
set search_path = public
as $$
  select array['studyKey','studyVersion','mechanismFamily','studyVariant','protocolKey','protocolPayloadHash','templateKey','templatePayloadHash','evidenceToProductMappingHash','studyInstanceSchemaHash','eligiblePopulationSnapshotHash','eligibilityRules','exclusionRules','assignmentUnit','exposureUnit','outcomeUnit','analysisUnit','interferenceClusterDefinition','assignmentDesign','assignmentProbabilities','blockingAndStratificationVariables','exposureMapping','supportedExposureCells','emptyExposureCellAction','primaryEstimand','potentialOutcomeContrast','targetPopulation','primaryOutcome','outcomeRegistry','outcomeWindow','estimator','varianceProcedure','finiteSampleInference','unequalClusterSizeHandling','covariateAdjustmentPolicy','missingnessEstimand','attritionBounds','sensitivityAnalyses','graphDiagnostics','precisionSimulation','fixedHorizonOrSequentialDesign','ethicsDetermination','participantDefinition','consentOrWaiver','controlConditionJustification','vulnerableParticipantProtections','debriefingPolicy','adverseEventMonitoring','stopAndSuspensionRules','privacyRetentionAndDeletion','accessControl','incidentResponse','entropySource','seedGenerationProcedure','seedCommitment','constrainedRandomizationRule','assignmentConcealment','outcomeAdjudicatorBlinding','unblindingLog','postAssignmentEligibilityChangeLog','differentialEvidenceResolutionAudit','blockingSafetyOutcomes','contaminationAndSpilloverMonitoring','offPlatformSubstitutionAudit','resourceClaimDeduplication','evidenceReferenceSchemes','assignmentCodeHash','analysisCodeHash','studyInstancePayloadHash','appendOnlyRegistryRecord','protectedTagOrEquivalent','amendmentLog','deviationLog','instrumentationEnvironment','subjectMode','executionAuthorized','realUserAssignmentAllowed']::text[];
$$;

create or replace function public.impact_study_assert_no_real_identifiers(
  p_payload jsonb,
  p_label text
)
returns void
language plpgsql
immutable
set search_path = public
as $$
begin
  if public.impact_study_payload_contains_real_identifiers(p_payload) then
    raise exception '% contains a prohibited real-person identifier or external URI',
      p_label
      using errcode = '23514';
  end if;
end;
$$;

create or replace function public.impact_study_assert_outcome_object(
  p_value jsonb,
  p_label text
)
returns void
language plpgsql
immutable
set search_path = public
as $$
begin
  if not public.impact_study_object_has_exact_keys(
    p_value,
    array['outcomeKey','outcomeKind','nativeUnit','role']::text[]
  )
    or not public.impact_study_is_key(p_value ->> 'outcomeKey')
    or p_value ->> 'outcomeKind' not in (
      'scalar_native_unit','prespecified_global_test'
    )
    or btrim(coalesce(p_value ->> 'nativeUnit','')) = ''
    or p_value ->> 'role' not in ('primary','secondary','safety_cost')
  then
    raise exception '% is not a valid registered outcome object', p_label
      using errcode = '23514';
  end if;
end;
$$;

create or replace function public.impact_study_assert_instance_semantics(
  p_payload jsonb
)
returns void
language plpgsql
set search_path = public
as $$
declare
  variant_record public.impact_study_template_variants%rowtype;
  assignment_entry jsonb;
  outcome_entry jsonb;
  probability_sum numeric := 0;
  primary_match_count integer;
  expected_hash text;
begin
  if not public.impact_study_object_has_exact_keys(
    p_payload,
    public.impact_study_required_binding_names()
  ) then
    raise exception 'Study instance does not match the exact v2 top-level schema'
      using errcode = '23514';
  end if;

  perform public.impact_study_assert_no_real_identifiers(
    p_payload,
    'Study instance payload'
  );

  if not public.impact_study_is_synthetic_key(p_payload ->> 'studyKey')
    or jsonb_typeof(p_payload -> 'studyVersion') <> 'number'
    or (p_payload ->> 'studyVersion')::numeric < 1
    or (p_payload ->> 'studyVersion')::numeric
      <> trunc((p_payload ->> 'studyVersion')::numeric)
    or (p_payload ->> 'studyVersion')::numeric > 1000000
    or p_payload ->> 'mechanismFamily' not in (
      'trade','co_fund','threshold_funding','donation_upgrade',
      'threshold_sign_on','donation_redirect'
    )
    or not public.impact_study_is_key(p_payload ->> 'studyVariant')
  then
    raise exception 'Study instance identity is invalid' using errcode = '23514';
  end if;

  if p_payload ->> 'protocolKey'
      <> 'commitments-causal-identification-and-calibration-master-v2'
    or p_payload ->> 'protocolPayloadHash'
      <> 'sha256:cd663ae722ee028ddfe3e1b866acab9ef79b5fcf5b5418d053bd3687eca3881a'
    or p_payload ->> 'evidenceToProductMappingHash'
      <> 'sha256:eb4aadae8491c1a6924fca03acdeb9157b07a1439098e736c88e549db16b59b8'
    or p_payload ->> 'studyInstanceSchemaHash' <> 'sha256:a8650788ed3e0ab6749dcd86342fd9c39dfc829ec23a4afe00d34bd28fa2a859'
  then
    raise exception 'Study instance protocol, mapping, or schema binding is invalid'
      using errcode = '23514';
  end if;

  if not exists (
    select 1
    from public.impact_study_protocol_bindings binding
    where binding.protocol_key = p_payload ->> 'protocolKey'
      and binding.payload_sha256 = p_payload ->> 'protocolPayloadHash'
      and binding.evidence_mapping_payload_hash =
        p_payload ->> 'evidenceToProductMappingHash'
      and binding.binding_status = 'accepted_internal_design_contract'
      and not binding.execution_authorized
  ) then
    raise exception 'Accepted protocol and evidence mapping binding is absent'
      using errcode = '23514';
  end if;

  select *
  into variant_record
  from public.impact_study_template_variants variant
  where variant.mechanism_family = p_payload ->> 'mechanismFamily'
    and variant.template_key = p_payload ->> 'templateKey'
    and variant.template_payload_hash = p_payload ->> 'templatePayloadHash'
    and variant.study_variant = p_payload ->> 'studyVariant';

  if not found then
    raise exception 'Study variant is not present in the exact bound template'
      using errcode = '23514';
  end if;

  if p_payload ->> 'assignmentUnit' <> variant_record.assignment_unit
    or p_payload ->> 'exposureUnit' <> variant_record.exposure_unit
    or p_payload ->> 'outcomeUnit' <> variant_record.outcome_unit
    or p_payload ->> 'analysisUnit' <> variant_record.analysis_unit
    or p_payload #>> '{estimator,family}' <> variant_record.estimator_family
    or variant_record.participant_specific_credit_authorized
  then
    raise exception 'Study instance does not match the fixed template design'
      using errcode = '23514';
  end if;

  if not public.impact_study_is_string_array(
      p_payload -> 'eligibilityRules', 1, false
    )
    or not public.impact_study_is_string_array(
      p_payload -> 'exclusionRules', 0, false
    )
    or not public.impact_study_is_string_array(
      p_payload -> 'blockingAndStratificationVariables', 0, true
    )
    or not public.impact_study_is_string_array(
      p_payload -> 'sensitivityAnalyses', 1, false
    )
    or not public.impact_study_is_string_array(
      p_payload -> 'stopAndSuspensionRules', 1, false
    )
  then
    raise exception 'Study rule arrays are incomplete' using errcode = '23514';
  end if;

  if jsonb_typeof(p_payload -> 'assignmentProbabilities') <> 'array'
    or jsonb_array_length(p_payload -> 'assignmentProbabilities') < 2
    or jsonb_array_length(p_payload -> 'assignmentProbabilities') > 64
  then
    raise exception 'At least two assignment arms are required'
      using errcode = '23514';
  end if;

  for assignment_entry in
    select value
    from jsonb_array_elements(p_payload -> 'assignmentProbabilities')
  loop
    if not public.impact_study_object_has_exact_keys(
      assignment_entry,
      array['armKey','probability']::text[]
    )
      or not public.impact_study_is_key(assignment_entry ->> 'armKey')
      or jsonb_typeof(assignment_entry -> 'probability') <> 'string'
      or assignment_entry ->> 'probability'
        !~ '^(0\.[0-9]{1,10}|1(\.0{1,10})?)$'
      or (assignment_entry ->> 'probability')::numeric <= 0
      or (assignment_entry ->> 'probability')::numeric > 1
    then
      raise exception 'Assignment arm or probability is invalid'
        using errcode = '23514';
    end if;
    probability_sum := probability_sum +
      (assignment_entry ->> 'probability')::numeric;
  end loop;

  if probability_sum <> 1
    or (
      select count(*)
      from jsonb_array_elements(p_payload -> 'assignmentProbabilities')
    ) <> (
      select count(distinct entry ->> 'armKey')
      from jsonb_array_elements(
        p_payload -> 'assignmentProbabilities'
      ) entry
    )
  then
    raise exception 'Assignment probabilities must be unique by arm and sum to one'
      using errcode = '23514';
  end if;

  if not public.impact_study_is_string_array(
      p_payload -> 'supportedExposureCells', 1, true
    )
    or exists (
      select 1
      from jsonb_array_elements_text(
        p_payload -> 'supportedExposureCells'
      ) cell
      where not public.impact_study_is_key(cell)
    )
    or p_payload ->> 'emptyExposureCellAction'
      not in ('withhold_estimand','no_launch')
  then
    raise exception 'Exposure-cell registry is invalid' using errcode = '23514';
  end if;

  if not public.impact_study_object_has_exact_keys(
      p_payload -> 'primaryEstimand',
      array['estimandKey','estimandType','claimScope']::text[]
    )
    or not public.impact_study_is_key(
      p_payload #>> '{primaryEstimand,estimandKey}'
    )
    or p_payload #>> '{primaryEstimand,estimandType}'
      <> 'assignment_policy_itt'
    or p_payload #>> '{primaryEstimand,claimScope}' <> 'policy_level'
  then
    raise exception 'Primary estimand must remain a policy-level assignment-policy ITT'
      using errcode = '23514';
  end if;

  perform public.impact_study_assert_outcome_object(
    p_payload -> 'primaryOutcome',
    'primaryOutcome'
  );
  if p_payload #>> '{primaryOutcome,role}' <> 'primary' then
    raise exception 'Primary outcome must have role primary'
      using errcode = '23514';
  end if;

  if jsonb_typeof(p_payload -> 'outcomeRegistry') <> 'array'
    or jsonb_array_length(p_payload -> 'outcomeRegistry') < 1
  then
    raise exception 'Outcome registry is required' using errcode = '23514';
  end if;

  for outcome_entry in
    select value
    from jsonb_array_elements(p_payload -> 'outcomeRegistry')
  loop
    perform public.impact_study_assert_outcome_object(
      outcome_entry,
      'outcomeRegistry entry'
    );
  end loop;

  if (
    select count(*)
    from jsonb_array_elements(p_payload -> 'outcomeRegistry')
  ) <> (
    select count(distinct entry ->> 'outcomeKey')
    from jsonb_array_elements(p_payload -> 'outcomeRegistry') entry
  ) then
    raise exception 'Outcome registry keys must be unique'
      using errcode = '23514';
  end if;

  select count(*)
  into primary_match_count
  from jsonb_array_elements(p_payload -> 'outcomeRegistry') entry
  where entry = p_payload -> 'primaryOutcome';

  if primary_match_count <> 1 then
    raise exception 'Outcome registry must contain the exact primary outcome once'
      using errcode = '23514';
  end if;

  if not public.impact_study_object_has_exact_keys(
      p_payload -> 'estimator',
      array['estimatorKey','family','designBased']::text[]
    )
    or not public.impact_study_is_key(
      p_payload #>> '{estimator,estimatorKey}'
    )
    or p_payload #> '{estimator,designBased}' is distinct from 'true'::jsonb
    or not public.impact_study_object_has_exact_keys(
      p_payload -> 'varianceProcedure',
      array['procedureKey','designBased']::text[]
    )
    or p_payload #> '{varianceProcedure,designBased}'
      is distinct from 'true'::jsonb
    or not public.impact_study_object_has_exact_keys(
      p_payload -> 'finiteSampleInference',
      array['methodKey','randomizationBased']::text[]
    )
    or p_payload #> '{finiteSampleInference,randomizationBased}'
      is distinct from 'true'::jsonb
  then
    raise exception 'Estimator, variance, or finite-sample inference is invalid'
      using errcode = '23514';
  end if;

  if not public.impact_study_object_has_exact_keys(
      p_payload -> 'graphDiagnostics',
      array['status','noLaunchIfInadequate']::text[]
    )
    or p_payload #>> '{graphDiagnostics,status}'
      not in ('required_not_completed','passed')
    or p_payload #> '{graphDiagnostics,noLaunchIfInadequate}'
      is distinct from 'true'::jsonb
    or not public.impact_study_object_has_exact_keys(
      p_payload -> 'precisionSimulation',
      array['status','noLaunchDetermination']::text[]
    )
    or p_payload #>> '{precisionSimulation,status}'
      not in ('required_not_completed','passed')
    or p_payload #>> '{precisionSimulation,noLaunchDetermination}'
      not in (
        'not_assessed','no_launch','eligible_for_separate_execution_review'
      )
  then
    raise exception 'Graph diagnostics or precision simulation is not fail-closed'
      using errcode = '23514';
  end if;

  if not public.impact_study_object_has_exact_keys(
      p_payload -> 'ethicsDetermination',
      array[
        'status','independentRequired','gatekeeperPermissionIsConsent'
      ]::text[]
    )
    or p_payload #>> '{ethicsDetermination,status}'
      not in (
        'required_not_completed','approved_for_separate_execution_review'
      )
    or p_payload #> '{ethicsDetermination,independentRequired}'
      is distinct from 'true'::jsonb
    or p_payload #> '{ethicsDetermination,gatekeeperPermissionIsConsent}'
      is distinct from 'false'::jsonb
    or not public.impact_study_object_has_exact_keys(
      p_payload -> 'consentOrWaiver',
      array['status','independentlyApproved']::text[]
    )
    or p_payload #>> '{consentOrWaiver,status}'
      not in (
        'not_determined','consent_required','waiver_or_alteration_approved'
      )
    or jsonb_typeof(
      p_payload #> '{consentOrWaiver,independentlyApproved}'
    ) <> 'boolean'
    or (
      p_payload #>> '{consentOrWaiver,status}' = 'not_determined'
      and p_payload #> '{consentOrWaiver,independentlyApproved}'
        is distinct from 'false'::jsonb
    )
  then
    raise exception 'Ethics and consent governance is invalid'
      using errcode = '23514';
  end if;

  if jsonb_typeof(p_payload -> 'unblindingLog') <> 'array'
    or jsonb_array_length(p_payload -> 'unblindingLog') <> 0
    or jsonb_typeof(p_payload -> 'postAssignmentEligibilityChangeLog')
      <> 'array'
    or jsonb_array_length(
      p_payload -> 'postAssignmentEligibilityChangeLog'
    ) <> 0
    or jsonb_typeof(p_payload -> 'amendmentLog') <> 'array'
    or jsonb_array_length(p_payload -> 'amendmentLog') <> 0
    or jsonb_typeof(p_payload -> 'deviationLog') <> 'array'
    or jsonb_array_length(p_payload -> 'deviationLog') <> 0
  then
    raise exception 'Initial append-only logs must be empty'
      using errcode = '23514';
  end if;

  if not public.impact_study_is_string_array(
      p_payload -> 'blockingSafetyOutcomes', 7, true
    )
    or jsonb_array_length(p_payload -> 'blockingSafetyOutcomes') <> 7
    or exists (
      select 1
      from unnest(array['harmful_offer_or_threat','baseline_manufacture_or_worsening','harm_shifted_to_nonparticipants','coercion_harassment_identity_exposure_or_retaliation','concentration_or_exclusion_effect','off_platform_substitution','duplicate_or_overlapping_resource_claim']::text[]) required_outcome
      where not (
        p_payload -> 'blockingSafetyOutcomes'
          ? required_outcome
      )
    )
  then
    raise exception 'Every blocking safety veto must be registered exactly once'
      using errcode = '23514';
  end if;

  if p_payload -> 'evidenceReferenceSchemes'
      <> '["qa-evidence://synthetic/"]'::jsonb
    or p_payload ->> 'appendOnlyRegistryRecord'
      !~ '^qa-registry://synthetic/[A-Za-z0-9._:/-]+$'
    or p_payload ->> 'protectedTagOrEquivalent'
      !~ '^github://ghuser29384/Website2/(commit|tag)/[0-9a-f]{40}$'
  then
    raise exception 'Provenance and evidence-reference bindings are invalid'
      using errcode = '23514';
  end if;

  if p_payload ->> 'instrumentationEnvironment' <> 'qa'
    or p_payload ->> 'subjectMode' <> 'synthetic_only'
    or p_payload -> 'executionAuthorized' is distinct from 'false'::jsonb
    or p_payload -> 'realUserAssignmentAllowed'
      is distinct from 'false'::jsonb
  then
    raise exception 'Instrumentation must remain QA-only, synthetic-only, and non-executing'
      using errcode = '23514';
  end if;

  if exists (
    select 1
    from unnest(array[
      'interferenceClusterDefinition','assignmentDesign',
      'exposureMapping','potentialOutcomeContrast','targetPopulation',
      'outcomeWindow','unequalClusterSizeHandling',
      'covariateAdjustmentPolicy','missingnessEstimand','attritionBounds',
      'fixedHorizonOrSequentialDesign','participantDefinition',
      'controlConditionJustification','vulnerableParticipantProtections',
      'debriefingPolicy','adverseEventMonitoring',
      'privacyRetentionAndDeletion','accessControl','incidentResponse',
      'entropySource','seedGenerationProcedure',
      'constrainedRandomizationRule','assignmentConcealment',
      'outcomeAdjudicatorBlinding',
      'differentialEvidenceResolutionAudit',
      'contaminationAndSpilloverMonitoring',
      'offPlatformSubstitutionAudit','resourceClaimDeduplication'
    ]::text[]) field_name
    where btrim(coalesce(p_payload ->> field_name,'')) = ''
  ) then
    raise exception 'One or more required study semantics are empty'
      using errcode = '23514';
  end if;

  if exists (
    select 1
    from unnest(array[
      'protocolPayloadHash','templatePayloadHash',
      'evidenceToProductMappingHash','studyInstanceSchemaHash',
      'eligiblePopulationSnapshotHash','assignmentCodeHash',
      'analysisCodeHash','seedCommitment','studyInstancePayloadHash'
    ]::text[]) field_name
    where not public.impact_study_is_sha256(p_payload ->> field_name)
  ) then
    raise exception 'One or more study hashes are malformed'
      using errcode = '23514';
  end if;

  expected_hash := public.impact_study_jsonb_sha256(
    p_payload - 'studyInstancePayloadHash'
  );
  if expected_hash <> p_payload ->> 'studyInstancePayloadHash' then
    raise exception 'Study-instance canonical payload hash mismatch: expected %',
      expected_hash
      using errcode = '23514';
  end if;
exception
  when invalid_text_representation or numeric_value_out_of_range then
    raise exception 'Study instance contains an invalid numeric representation'
      using errcode = '23514';
end;
$$;

commit;
