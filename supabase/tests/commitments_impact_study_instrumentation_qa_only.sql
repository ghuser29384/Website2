begin;

set local role service_role;

do $qa_instrumentation$
declare
  base_payload jsonb := '{}'::jsonb;
  payload jsonb;
  bad_base jsonb;
  bad_payload jsonb;
  study_id uuid;
  assignment_id uuid;
  exposure_id uuid;
  outcome_id uuid;
  safety_id uuid;
  manifest_id uuid;
begin
  base_payload := base_payload || jsonb_build_object(
    'studyKey','qa-synthetic-trade-study-001',
    'studyVersion',1,
    'mechanismFamily','trade',
    'studyVariant','graph_cluster_role_2x2_encouragement',
    'protocolKey','commitments-causal-identification-and-calibration-master-v2',
    'protocolPayloadHash','sha256:cd663ae722ee028ddfe3e1b866acab9ef79b5fcf5b5418d053bd3687eca3881a',
    'templateKey','commitments-trade-study-template-v2',
    'templatePayloadHash','sha256:cf0a7a96294b431dcd79879fa01b7d1031ea50a842cebca6986e13351bcbb1e1',
    'eligiblePopulationSnapshotHash','sha256:1111111111111111111111111111111111111111111111111111111111111111',
    'eligibilityRules',jsonb_build_array('synthetic fixture only'),
    'exclusionRules','[]'::jsonb,
    'assignmentUnit','synthetic graph cluster',
    'exposureUnit','synthetic dyad',
    'outcomeUnit','synthetic dyad outcome',
    'analysisUnit','synthetic independent cluster',
    'interferenceClusterDefinition','synthetic connected component',
    'assignmentDesign','deterministic QA fixture for schema validation only',
    'assignmentProbabilities',jsonb_build_object(
      'neither_role',0.25,'role_a_only',0.25,
      'role_b_only',0.25,'both_roles',0.25
    ),
    'blockingAndStratificationVariables','[]'::jsonb,
    'exposureMapping',jsonb_build_object('mapping','synthetic exact arm to cell')
  );

  base_payload := base_payload || jsonb_build_object(
    'supportedExposureCells',jsonb_build_array(
      'neither_role','role_a_only','role_b_only','both_roles'
    ),
    'emptyExposureCellAction','no_launch',
    'primaryEstimand',jsonb_build_object(
      'type','assignment_policy_itt','scope','policy_level_only'
    ),
    'potentialOutcomeContrast','E[Y(z=both_roles)] - E[Y(z=neither_role)]',
    'targetPopulation','synthetic QA fixtures only',
    'primaryOutcome',jsonb_build_object(
      'type','scalar','nativeUnit','synthetic_actions'
    ),
    'outcomeWindow','synthetic instant window',
    'estimator',jsonb_build_object(
      'family','Horvitz-Thompson','status','not_executed'
    ),
    'varianceProcedure',jsonb_build_object(
      'family','design_based','status','not_executed'
    ),
    'finiteSampleInference',jsonb_build_object(
      'method','randomization_inference','status','not_executed'
    ),
    'unequalClusterSizeHandling','not applicable to one synthetic fixture',
    'covariateAdjustmentPolicy','precision only; none in fixture',
    'missingnessEstimand','all synthetic fixtures retained',
    'attritionBounds','not applicable to synthetic fixture',
    'sensitivityAnalyses',jsonb_build_array('synthetic contamination flag test'),
    'graphDiagnostics',jsonb_build_object('status','not_run','noLaunch',true),
    'precisionSimulation',jsonb_build_object('status','not_run','noLaunch',true),
    'fixedHorizonOrSequentialDesign','fixed synthetic fixture count',
    'ethicsDetermination',jsonb_build_object(
      'status','required_not_completed','realParticipants',false
    ),
    'participantDefinition','no research participants; synthetic records only'
  );

  base_payload := base_payload || jsonb_build_object(
    'consentOrWaiver',jsonb_build_object('status','not_applicable_synthetic'),
    'controlConditionJustification','synthetic fixture only',
    'vulnerableParticipantProtections','no real participants permitted',
    'debriefingPolicy','not applicable to synthetic fixture',
    'adverseEventMonitoring',jsonb_build_object('status','synthetic_only'),
    'stopAndSuspensionRules',jsonb_build_array(
      'any real identifier causes rejection'
    ),
    'privacyRetentionAndDeletion',jsonb_build_object('scope','synthetic_only'),
    'accessControl',jsonb_build_object('writer','service_role_rpc_only'),
    'incidentResponse',jsonb_build_object(
      'action','stop and remove synthetic fixture'
    ),
    'entropySource','fixed QA fixture; not usable for a study',
    'seedGenerationProcedure','not executed',
    'seedCommitment','sha256:2222222222222222222222222222222222222222222222222222222222222222',
    'constrainedRandomizationRule','not executed',
    'assignmentConcealment','not executed',
    'outcomeAdjudicatorBlinding','not executed',
    'unblindingLog','[]'::jsonb,
    'postAssignmentEligibilityChangeLog','[]'::jsonb,
    'differentialEvidenceResolutionAudit',jsonb_build_object(
      'status','synthetic_only'
    ),
    'blockingSafetyOutcomes',jsonb_build_array(
      'harmful_offer_or_threat','duplicate_or_overlapping_resource_claim'
    ),
    'contaminationAndSpilloverMonitoring','record explicit synthetic flags'
  );

  base_payload := base_payload || jsonb_build_object(
    'offPlatformSubstitutionAudit','not applicable to synthetic fixture',
    'resourceClaimDeduplication','stable synthetic keys only',
    'assignmentCodeHash','sha256:3333333333333333333333333333333333333333333333333333333333333333',
    'analysisCodeHash','sha256:4444444444444444444444444444444444444444444444444444444444444444',
    'appendOnlyRegistryRecord','qa-registry://commitments/qa-synthetic-trade-study-001',
    'protectedTagOrEquivalent','qa-nonexecuting:unapproved',
    'amendmentLog','[]'::jsonb,
    'deviationLog','[]'::jsonb,
    'instrumentationEnvironment','qa',
    'subjectMode','synthetic_only',
    'executionAuthorized',false,
    'realUserAssignmentAllowed',false
  );

  payload := base_payload || jsonb_build_object(
    'studyInstancePayloadHash',
    public.impact_study_jsonb_sha256(base_payload)
  );

  study_id := public.register_qa_impact_study_instance(payload);
  assignment_id := public.record_qa_synthetic_assignment(
    study_id,'synthetic:subject-001','synthetic:cluster-001','both_roles',
    0.25,'both_roles',jsonb_build_object('fixture',true)
  );
  exposure_id := public.record_qa_synthetic_exposure(
    assignment_id,'exposure-001','both_roles',false,false,
    jsonb_build_object('fixture',true)
  );
  outcome_id := public.record_qa_synthetic_outcome(
    study_id,'synthetic:subject-001','synthetic_actions_completed',
    'synthetic_actions',1,'reviewed',
    array['qa-evidence://synthetic/outcome-001'],
    jsonb_build_object('fixture',true,'additionalityClaim',false)
  );
  safety_id := public.record_qa_impact_safety_event(
    study_id,'synthetic:subject-001',
    'duplicate_or_overlapping_resource_claim','cleared',
    jsonb_build_object('fixture',true)
  );
  manifest_id := public.register_qa_synthetic_calibration_manifest(
    study_id,'synthetic-dataset-001',1,
    jsonb_build_object('fixture',true,'sourceScope','synthetic_qa_only')
  );

  if assignment_id is null or exposure_id is null or outcome_id is null
     or safety_id is null or manifest_id is null then
    raise exception 'A happy-path synthetic instrumentation write returned null.';
  end if;

  if not exists (
    select 1 from public.impact_study_instances
    where id=study_id and environment='qa' and subject_mode='synthetic_only'
      and execution_authorized=false and real_user_assignment_allowed=false
  ) then
    raise exception 'Study instance did not remain fail closed.';
  end if;

  if not exists (
    select 1 from public.impact_study_calibration_manifests
    where id=manifest_id and source_scope='synthetic_qa_only'
      and eligible_for_empirical_calibration=false
      and eligible_for_model_activation=false
  ) then
    raise exception 'Synthetic calibration manifest was misclassified.';
  end if;

  if (
    select count(*)
    from public.impact_study_registry_events
    where study_instance_id=study_id
  ) < 6 then
    raise exception 'Append-only instrumentation events are incomplete.';
  end if;

  begin
    perform public.record_qa_synthetic_assignment(
      study_id,'7a100000-0000-4000-8000-000000000001',
      'synthetic:cluster-real-key-negative-test','both_roles',0.25,
      'both_roles','{}'::jsonb
    );
    raise exception 'A non-synthetic subject key was unexpectedly accepted.';
  exception when check_violation then null;
  end;

  bad_base := base_payload || jsonb_build_object(
    'studyKey','qa-synthetic-trade-study-execution-negative',
    'appendOnlyRegistryRecord',
      'qa-registry://commitments/qa-synthetic-trade-study-execution-negative',
    'executionAuthorized',true
  );
  bad_payload := bad_base || jsonb_build_object(
    'studyInstancePayloadHash',
    public.impact_study_jsonb_sha256(bad_base)
  );
  begin
    perform public.register_qa_impact_study_instance(bad_payload);
    raise exception 'Execution-authorized payload was unexpectedly accepted.';
  exception when check_violation then null;
  end;

  bad_base := base_payload || jsonb_build_object(
    'studyKey','qa-synthetic-trade-study-identifier-negative',
    'appendOnlyRegistryRecord',
      'qa-registry://commitments/qa-synthetic-trade-study-identifier-negative',
    'email','real-person@example.invalid'
  );
  bad_payload := bad_base || jsonb_build_object(
    'studyInstancePayloadHash',
    public.impact_study_jsonb_sha256(bad_base)
  );
  begin
    perform public.register_qa_impact_study_instance(bad_payload);
    raise exception 'Real-person identifier field was unexpectedly accepted.';
  exception when check_violation then null;
  end;
end;
$qa_instrumentation$;

reset role;

do $append_only$
begin
  begin
    update public.impact_study_instances
    set registry_status='registered_nonexecuting'
    where study_key='qa-synthetic-trade-study-001';
    raise exception 'Append-only study row was unexpectedly mutable.';
  exception when object_not_in_prerequisite_state then null;
  end;

  begin
    delete from public.impact_study_synthetic_outcomes
    where synthetic_subject_key='synthetic:subject-001';
    raise exception 'Append-only outcome row was unexpectedly deletable.';
  exception when object_not_in_prerequisite_state then null;
  end;

  if exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name like 'impact_study_%'
      and column_name in ('user_id','auth_user_id','profile_id','email','phone')
  ) then
    raise exception 'Real-user identifier column exists in QA instrumentation.';
  end if;

  if has_table_privilege(
       'service_role','public.impact_study_instances','insert'
     )
     or has_table_privilege(
       'authenticated','public.impact_study_instances','select'
     )
     or has_table_privilege(
       'anon','public.impact_study_instances','select'
     ) then
    raise exception 'Least-privilege table boundary failed.';
  end if;

  if not has_function_privilege(
    'service_role',
    'public.register_qa_impact_study_instance(jsonb)',
    'execute'
  ) or has_function_privilege(
    'authenticated',
    'public.register_qa_impact_study_instance(jsonb)',
    'execute'
  ) then
    raise exception 'RPC privilege boundary failed.';
  end if;
end;
$append_only$;

rollback;