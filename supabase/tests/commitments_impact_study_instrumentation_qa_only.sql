begin;

create temporary table impact_study_remediation_test_state (
  safety_study_id uuid,
  safety_assignment_id uuid,
  cancellation_study_id uuid,
  cancellation_assignment_id uuid
) on commit drop;
grant select, insert, update on impact_study_remediation_test_state to service_role;

do $preflight$
declare
  candidate jsonb;
begin
  if not exists (
    select 1 from moraltrade_qa.environment_identity
    where singleton and environment='qa'
      and project_ref='hvmxfjjbdcgjjudmthdz'
      and sentinel_id='a0244e19-9744-4a82-83e4-57776804cc06'::uuid
      and sentinel_sha256='f7801a29e33764650322ad39e66a2062d9e2f750a9438e74d9fff0c9eeeb8d30'
      and provisioned_out_of_band
  ) then raise exception 'exact QA sentinel missing'; end if;

  if public.impact_study_jsonb_sha256('{"b":2,"a":1}'::jsonb)
    <> 'sha256:43258cff783fe7036d8a43033f830adfc60ec037382473548ac742b888292777'
  then raise exception 'object canonical parity failed'; end if;
  if public.impact_study_jsonb_sha256('{"z":[3,{"b":false,"a":null}],"a":"x"}'::jsonb)
    <> 'sha256:a66b8db42d40689e0b56ff1b8c70ace39d4f9550b11a9897c5aad23a068081dd'
  then raise exception 'nested canonical parity failed'; end if;
  if public.impact_study_jsonb_sha256('{"text":"道德贸易","kind":"synthetic"}'::jsonb)
    <> 'sha256:b4f50929c642e38fff79c4ed47660773d923263e20fa0793898015cb11f3fabb'
  then raise exception 'unicode canonical parity failed'; end if;
  if public.impact_study_jsonb_sha256('{"text":"  line 1\nline 2\t ","ok":true}'::jsonb)
    <> 'sha256:65257c8e6da64cea55c7af62522e450d7c6a362697dbf0ff9407bd5728f095a5'
  then raise exception 'whitespace canonical parity failed'; end if;
  if public.impact_study_jsonb_sha256('{"integer":1.0,"negativeZero":-0,"minimumDecimal":0.000001,"safeInteger":9007199254740991}'::jsonb)
    <> 'sha256:004a64378a386bbffd79726dce3062f99356324f5c9e568d3a33337790791e41'
  then raise exception 'numeric canonical parity failed'; end if;
  if public.impact_study_jsonb_sha256('{"items":[3,2,1],"name":"ordered"}'::jsonb)
    <> 'sha256:b21a1b747fc08235506d817e3b034409935a84f08af7ae93f197fe8010e530e2'
  then raise exception 'array canonical parity failed'; end if;

  begin
    perform public.impact_study_jsonb_sha256('{"value":0.0000001}'::jsonb);
    raise exception 'unsupported small exponent unexpectedly canonicalized';
  exception when invalid_parameter_value then null; end;
  begin
    perform public.impact_study_jsonb_sha256('{"value":9007199254740992}'::jsonb);
    raise exception 'unsafe integer unexpectedly canonicalized';
  exception when invalid_parameter_value then null; end;
  begin
    perform public.impact_study_jsonb_sha256('{"é":1}'::jsonb);
    raise exception 'non-ASCII key unexpectedly canonicalized';
  exception when invalid_parameter_value then null; end;

  if exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name like 'impact_study_%'
      and column_name in ('user_id','auth_user_id','profile_id','email','phone')
  ) then raise exception 'prohibited real identifier column exists'; end if;

  if has_table_privilege('anon','public.impact_study_instances','select')
    or has_table_privilege('authenticated','public.impact_study_instances','select')
    or has_table_privilege('service_role','public.impact_study_instances','insert')
    or not has_table_privilege('service_role','public.impact_study_instances','select')
    or has_function_privilege('anon','public.register_qa_impact_study_instance(jsonb,jsonb)','execute')
    or has_function_privilege('authenticated','public.register_qa_impact_study_instance(jsonb,jsonb)','execute')
    or not has_function_privilege('service_role','public.register_qa_impact_study_instance(jsonb,jsonb)','execute')
  then raise exception 'least-privilege boundary failed'; end if;
end;
$preflight$;

set local role service_role;

do $service_flow$
declare
  safety_id uuid;
  safety_assignment uuid;
  cancellation_id uuid;
  cancellation_assignment uuid;
  invalid_payload jsonb;
  invalid_attestation jsonb;
  safety_payload jsonb := $safety_payload${"studyKey":"synthetic:trade-safety-v2","studyVersion":1,"mechanismFamily":"trade","studyVariant":"graph_cluster_role_2x2_encouragement","protocolKey":"commitments-causal-identification-and-calibration-master-v2","protocolPayloadHash":"sha256:cd663ae722ee028ddfe3e1b866acab9ef79b5fcf5b5418d053bd3687eca3881a","templateKey":"commitments-trade-study-template-v2","templatePayloadHash":"sha256:cf0a7a96294b431dcd79879fa01b7d1031ea50a842cebca6986e13351bcbb1e1","evidenceToProductMappingHash":"sha256:eb4aadae8491c1a6924fca03acdeb9157b07a1439098e736c88e549db16b59b8","studyInstanceSchemaHash":"sha256:a8650788ed3e0ab6749dcd86342fd9c39dfc829ec23a4afe00d34bd28fa2a859","eligiblePopulationSnapshotHash":"sha256:8e670d422de33998f10d4767a240664c37e3ad1ad173fd1283d08fb5b2e11666","eligibilityRules":["synthetic directed dyad is frozen before assignment","both synthetic roles satisfy the template eligibility rule"],"exclusionRules":["exclude any fixture containing a non-synthetic identifier"],"assignmentUnit":"pre-randomization graph cluster","exposureUnit":"frozen eligible directed dyad opportunity","outcomeUnit":"frozen dyad outcome","analysisUnit":"independent randomized graph cluster","interferenceClusterDefinition":"synthetic connected components are frozen before assignment","assignmentDesign":"four-arm cluster-randomized bilateral encouragement fixture","assignmentProbabilities":[{"armKey":"neither_role","probability":"0.25"},{"armKey":"role_a_only","probability":"0.25"},{"armKey":"role_b_only","probability":"0.25"},{"armKey":"both_roles","probability":"0.25"}],"blockingAndStratificationVariables":["synthetic_cluster_size_band"],"exposureMapping":"map assigned bilateral arm and observed synthetic delivery into one registered exposure cell","supportedExposureCells":["neither_role","role_a_only","role_b_only","both_roles"],"emptyExposureCellAction":"no_launch","primaryEstimand":{"estimandKey":"bilateral_encouragement_policy_itt","estimandType":"assignment_policy_itt","claimScope":"policy_level"},"potentialOutcomeContrast":"mean reviewed synthetic outcome under both_roles minus mean under neither_role","targetPopulation":"the frozen synthetic directed-dyad fixture population only","primaryOutcome":{"outcomeKey":"counterparty_native_units","outcomeKind":"scalar_native_unit","nativeUnit":"synthetic_action_unit","role":"primary"},"outcomeRegistry":[{"outcomeKey":"counterparty_native_units","outcomeKind":"scalar_native_unit","nativeUnit":"synthetic_action_unit","role":"primary"},{"outcomeKey":"platform_cost","outcomeKind":"scalar_native_unit","nativeUnit":"synthetic_currency_unit","role":"safety_cost"}],"outcomeWindow":"synthetic fixture resolution window","estimator":{"estimatorKey":"cluster_hajek_itt","family":"cluster-level Horvitz-Thompson or Hájek with randomization inference","designBased":true},"varianceProcedure":{"procedureKey":"cluster_randomization_variance","designBased":true},"finiteSampleInference":{"methodKey":"exact_cluster_randomization_test","randomizationBased":true},"unequalClusterSizeHandling":"use frozen cluster weights and report sensitivity to the largest cluster","covariateAdjustmentPolicy":"precision-only adjustment frozen before assignment","missingnessEstimand":"treat unresolved synthetic evidence as a separate outcome state","attritionBounds":"report worst-case arm-specific bounds","sensitivityAnalyses":["exclude each synthetic cluster in turn","reclassify unresolved outcomes at both bounds"],"graphDiagnostics":{"status":"required_not_completed","noLaunchIfInadequate":true},"precisionSimulation":{"status":"required_not_completed","noLaunchDetermination":"not_assessed"},"fixedHorizonOrSequentialDesign":"fixed synthetic horizon; no optional stopping","ethicsDetermination":{"status":"required_not_completed","independentRequired":true,"gatekeeperPermissionIsConsent":false},"participantDefinition":"no real participant; synthetic QA fixture only","consentOrWaiver":{"status":"not_determined","independentlyApproved":false},"controlConditionJustification":"synthetic control arm exists solely to test the registry contract","vulnerableParticipantProtections":"no real people or vulnerable groups may enter the fixture","debriefingPolicy":"not applicable to synthetic fixtures","adverseEventMonitoring":"record every synthetic safety signal as a blocking veto","stopAndSuspensionRules":["cancel the fixture after any observed or unresolved safety veto"],"privacyRetentionAndDeletion":"retain only synthetic keys and synthetic evidence references in QA","accessControl":"service-role RPC writes only; no direct table writes","incidentResponse":"cancel the fixture and preserve append-only evidence if a boundary fails","entropySource":"synthetic deterministic fixture seed only","seedGenerationProcedure":"hash the frozen synthetic fixture manifest","seedCommitment":"sha256:1b4f36e5993cbbaeef4b203b9ed799dd6e215ac85ec76ec74f776a55ccf48e0c","constrainedRandomizationRule":"accept only the four exact arms with equal frozen probabilities","assignmentConcealment":"fixture assignments remain unavailable outside the QA service role","outcomeAdjudicatorBlinding":"synthetic adjudication fixture is blind to arm labels","unblindingLog":[],"postAssignmentEligibilityChangeLog":[],"differentialEvidenceResolutionAudit":"compare synthetic resolution states by arm","blockingSafetyOutcomes":["harmful_offer_or_threat","baseline_manufacture_or_worsening","harm_shifted_to_nonparticipants","coercion_harassment_identity_exposure_or_retaliation","concentration_or_exclusion_effect","off_platform_substitution","duplicate_or_overlapping_resource_claim"],"contaminationAndSpilloverMonitoring":"record synthetic cross-cluster contamination and spillover flags","offPlatformSubstitutionAudit":"synthetic fixture has no off-platform activity","resourceClaimDeduplication":"one synthetic claim key may appear in at most one additive record","evidenceReferenceSchemes":["qa-evidence://synthetic/"],"assignmentCodeHash":"sha256:041205ed14c4d42f53e7b54c59d437f7e1013137d229331ec5bce005cd223c14","analysisCodeHash":"sha256:3319e6517ad0a8e2e63955e735b00848dcae185af34c99fac38009caf3c87447","appendOnlyRegistryRecord":"qa-registry://synthetic/trade-safety-v2","protectedTagOrEquivalent":"github://ghuser29384/Website2/commit/f93acc33c135f34bc28f006842d9e08120d5b859","amendmentLog":[],"deviationLog":[],"instrumentationEnvironment":"qa","subjectMode":"synthetic_only","executionAuthorized":false,"realUserAssignmentAllowed":false,"studyInstancePayloadHash":"sha256:3fb6d80182a166e3ea9528a974a37df525c72a4751ef6f0dfe58b05d867b2162"}$safety_payload$::jsonb;
  safety_attestation jsonb := $safety_attestation${"attestationSchemaVersion":"moral-trade-impact-study-validator-attestation-v2","schemaKey":"commitments-impact-study-instance-schema-v2","schemaRawSha256":"sha256:a8650788ed3e0ab6749dcd86342fd9c39dfc829ec23a4afe00d34bd28fa2a859","validatorKey":"commitments-impact-study-instance-validator-v2","validatorRawSha256":"sha256:1381fd100964182e1de8c3b276624b2fe51ffbad512505166fed23a7b1396c85","studyInstancePayloadHash":"sha256:3fb6d80182a166e3ea9528a974a37df525c72a4751ef6f0dfe58b05d867b2162","evidenceToProductMappingHash":"sha256:eb4aadae8491c1a6924fca03acdeb9157b07a1439098e736c88e549db16b59b8","validationResult":"valid","instrumentationEnvironment":"qa","subjectMode":"synthetic_only","executionAuthorized":false,"attestationPayloadSha256":"sha256:b954f6437a2103e3f11285379cca4b49fbc35f2bf1aa6c06c5983205a70f6864"}$safety_attestation$::jsonb;
  cancellation_payload jsonb := $cancellation_payload${"studyKey":"synthetic:trade-cancellation-v2","studyVersion":1,"mechanismFamily":"trade","studyVariant":"graph_cluster_role_2x2_encouragement","protocolKey":"commitments-causal-identification-and-calibration-master-v2","protocolPayloadHash":"sha256:cd663ae722ee028ddfe3e1b866acab9ef79b5fcf5b5418d053bd3687eca3881a","templateKey":"commitments-trade-study-template-v2","templatePayloadHash":"sha256:cf0a7a96294b431dcd79879fa01b7d1031ea50a842cebca6986e13351bcbb1e1","evidenceToProductMappingHash":"sha256:eb4aadae8491c1a6924fca03acdeb9157b07a1439098e736c88e549db16b59b8","studyInstanceSchemaHash":"sha256:a8650788ed3e0ab6749dcd86342fd9c39dfc829ec23a4afe00d34bd28fa2a859","eligiblePopulationSnapshotHash":"sha256:8e670d422de33998f10d4767a240664c37e3ad1ad173fd1283d08fb5b2e11666","eligibilityRules":["synthetic directed dyad is frozen before assignment","both synthetic roles satisfy the template eligibility rule"],"exclusionRules":["exclude any fixture containing a non-synthetic identifier"],"assignmentUnit":"pre-randomization graph cluster","exposureUnit":"frozen eligible directed dyad opportunity","outcomeUnit":"frozen dyad outcome","analysisUnit":"independent randomized graph cluster","interferenceClusterDefinition":"synthetic connected components are frozen before assignment","assignmentDesign":"four-arm cluster-randomized bilateral encouragement fixture","assignmentProbabilities":[{"armKey":"neither_role","probability":"0.25"},{"armKey":"role_a_only","probability":"0.25"},{"armKey":"role_b_only","probability":"0.25"},{"armKey":"both_roles","probability":"0.25"}],"blockingAndStratificationVariables":["synthetic_cluster_size_band"],"exposureMapping":"map assigned bilateral arm and observed synthetic delivery into one registered exposure cell","supportedExposureCells":["neither_role","role_a_only","role_b_only","both_roles"],"emptyExposureCellAction":"no_launch","primaryEstimand":{"estimandKey":"bilateral_encouragement_policy_itt","estimandType":"assignment_policy_itt","claimScope":"policy_level"},"potentialOutcomeContrast":"mean reviewed synthetic outcome under both_roles minus mean under neither_role","targetPopulation":"the frozen synthetic directed-dyad fixture population only","primaryOutcome":{"outcomeKey":"counterparty_native_units","outcomeKind":"scalar_native_unit","nativeUnit":"synthetic_action_unit","role":"primary"},"outcomeRegistry":[{"outcomeKey":"counterparty_native_units","outcomeKind":"scalar_native_unit","nativeUnit":"synthetic_action_unit","role":"primary"},{"outcomeKey":"platform_cost","outcomeKind":"scalar_native_unit","nativeUnit":"synthetic_currency_unit","role":"safety_cost"}],"outcomeWindow":"synthetic fixture resolution window","estimator":{"estimatorKey":"cluster_hajek_itt","family":"cluster-level Horvitz-Thompson or Hájek with randomization inference","designBased":true},"varianceProcedure":{"procedureKey":"cluster_randomization_variance","designBased":true},"finiteSampleInference":{"methodKey":"exact_cluster_randomization_test","randomizationBased":true},"unequalClusterSizeHandling":"use frozen cluster weights and report sensitivity to the largest cluster","covariateAdjustmentPolicy":"precision-only adjustment frozen before assignment","missingnessEstimand":"treat unresolved synthetic evidence as a separate outcome state","attritionBounds":"report worst-case arm-specific bounds","sensitivityAnalyses":["exclude each synthetic cluster in turn","reclassify unresolved outcomes at both bounds"],"graphDiagnostics":{"status":"required_not_completed","noLaunchIfInadequate":true},"precisionSimulation":{"status":"required_not_completed","noLaunchDetermination":"not_assessed"},"fixedHorizonOrSequentialDesign":"fixed synthetic horizon; no optional stopping","ethicsDetermination":{"status":"required_not_completed","independentRequired":true,"gatekeeperPermissionIsConsent":false},"participantDefinition":"no real participant; synthetic QA fixture only","consentOrWaiver":{"status":"not_determined","independentlyApproved":false},"controlConditionJustification":"synthetic control arm exists solely to test the registry contract","vulnerableParticipantProtections":"no real people or vulnerable groups may enter the fixture","debriefingPolicy":"not applicable to synthetic fixtures","adverseEventMonitoring":"record every synthetic safety signal as a blocking veto","stopAndSuspensionRules":["cancel the fixture after any observed or unresolved safety veto"],"privacyRetentionAndDeletion":"retain only synthetic keys and synthetic evidence references in QA","accessControl":"service-role RPC writes only; no direct table writes","incidentResponse":"cancel the fixture and preserve append-only evidence if a boundary fails","entropySource":"synthetic deterministic fixture seed only","seedGenerationProcedure":"hash the frozen synthetic fixture manifest","seedCommitment":"sha256:1b4f36e5993cbbaeef4b203b9ed799dd6e215ac85ec76ec74f776a55ccf48e0c","constrainedRandomizationRule":"accept only the four exact arms with equal frozen probabilities","assignmentConcealment":"fixture assignments remain unavailable outside the QA service role","outcomeAdjudicatorBlinding":"synthetic adjudication fixture is blind to arm labels","unblindingLog":[],"postAssignmentEligibilityChangeLog":[],"differentialEvidenceResolutionAudit":"compare synthetic resolution states by arm","blockingSafetyOutcomes":["harmful_offer_or_threat","baseline_manufacture_or_worsening","harm_shifted_to_nonparticipants","coercion_harassment_identity_exposure_or_retaliation","concentration_or_exclusion_effect","off_platform_substitution","duplicate_or_overlapping_resource_claim"],"contaminationAndSpilloverMonitoring":"record synthetic cross-cluster contamination and spillover flags","offPlatformSubstitutionAudit":"synthetic fixture has no off-platform activity","resourceClaimDeduplication":"one synthetic claim key may appear in at most one additive record","evidenceReferenceSchemes":["qa-evidence://synthetic/"],"assignmentCodeHash":"sha256:041205ed14c4d42f53e7b54c59d437f7e1013137d229331ec5bce005cd223c14","analysisCodeHash":"sha256:3319e6517ad0a8e2e63955e735b00848dcae185af34c99fac38009caf3c87447","appendOnlyRegistryRecord":"qa-registry://synthetic/trade-cancellation-v2","protectedTagOrEquivalent":"github://ghuser29384/Website2/commit/f93acc33c135f34bc28f006842d9e08120d5b859","amendmentLog":[],"deviationLog":[],"instrumentationEnvironment":"qa","subjectMode":"synthetic_only","executionAuthorized":false,"realUserAssignmentAllowed":false,"studyInstancePayloadHash":"sha256:da993909ce2373a363baf1e6f5df7f6676162e9b049948e039cd9c056d428764"}$cancellation_payload$::jsonb;
  cancellation_attestation jsonb := $cancellation_attestation${"attestationSchemaVersion":"moral-trade-impact-study-validator-attestation-v2","schemaKey":"commitments-impact-study-instance-schema-v2","schemaRawSha256":"sha256:a8650788ed3e0ab6749dcd86342fd9c39dfc829ec23a4afe00d34bd28fa2a859","validatorKey":"commitments-impact-study-instance-validator-v2","validatorRawSha256":"sha256:1381fd100964182e1de8c3b276624b2fe51ffbad512505166fed23a7b1396c85","studyInstancePayloadHash":"sha256:da993909ce2373a363baf1e6f5df7f6676162e9b049948e039cd9c056d428764","evidenceToProductMappingHash":"sha256:eb4aadae8491c1a6924fca03acdeb9157b07a1439098e736c88e549db16b59b8","validationResult":"valid","instrumentationEnvironment":"qa","subjectMode":"synthetic_only","executionAuthorized":false,"attestationPayloadSha256":"sha256:e57beeb72eb0ada924548f0520ad1f4c16a4184fc9ae4934a26622dd621e6f0b"}$cancellation_attestation$::jsonb;
begin
  begin
    perform public.register_qa_impact_study_instance(safety_payload);
    raise exception 'one-argument registration unexpectedly succeeded';
  exception when insufficient_privilege then null; end;

  invalid_payload := safety_payload;
  invalid_payload := jsonb_set(invalid_payload,'{primaryEstimand,estimandType}','"participant_direct_causal_attribution"'::jsonb);
  begin
    perform public.register_qa_impact_study_instance(invalid_payload,safety_attestation);
    raise exception 'participant causal credit unexpectedly registered';
  exception when check_violation then null; end;

  invalid_payload := safety_payload;
  invalid_payload := jsonb_set(invalid_payload,'{studyVariant}','"unregistered_variant"'::jsonb);
  begin
    perform public.register_qa_impact_study_instance(invalid_payload,safety_attestation);
    raise exception 'unknown variant unexpectedly registered';
  exception when check_violation then null; end;

  invalid_payload := safety_payload;
  invalid_payload := jsonb_set(invalid_payload,'{ethicsDetermination,status}','"approved"'::jsonb);
  begin
    perform public.register_qa_impact_study_instance(invalid_payload,safety_attestation);
    raise exception 'fabricated ethics status unexpectedly registered';
  exception when check_violation then null; end;

  invalid_payload := safety_payload;
  invalid_payload := jsonb_set(invalid_payload,'{precisionSimulation,noLaunchDetermination}','"launch"'::jsonb);
  begin
    perform public.register_qa_impact_study_instance(invalid_payload,safety_attestation);
    raise exception 'invalid precision decision unexpectedly registered';
  exception when check_violation then null; end;

  invalid_payload := safety_payload;
  invalid_payload := jsonb_set(invalid_payload,'{participantDefinition}','"contact researcher@example.com"'::jsonb);
  begin
    perform public.register_qa_impact_study_instance(invalid_payload,safety_attestation);
    raise exception 'real identifier unexpectedly registered';
  exception when check_violation then null; end;

  invalid_attestation := safety_attestation;
  invalid_attestation := jsonb_set(invalid_attestation,'{attestationPayloadSha256}','"sha256:0000000000000000000000000000000000000000000000000000000000000000"'::jsonb);
  begin
    perform public.register_qa_impact_study_instance(safety_payload,invalid_attestation);
    raise exception 'tampered attestation unexpectedly registered';
  exception when check_violation then null; end;

  safety_id := public.register_qa_impact_study_instance(
    safety_payload,
    safety_attestation
  );
  cancellation_id := public.register_qa_impact_study_instance(
    cancellation_payload,
    cancellation_attestation
  );

  if (select count(*) from public.impact_study_validator_attestations where study_instance_id in (safety_id,cancellation_id)) <> 2
  then raise exception 'validator attestations missing'; end if;
  if exists (
    select 1 from public.impact_study_instances
    where id in (safety_id,cancellation_id)
      and evidence_mapping_payload_hash <> 'sha256:eb4aadae8491c1a6924fca03acdeb9157b07a1439098e736c88e549db16b59b8'
  ) then raise exception 'evidence mapping not bound'; end if;
  if (select count(*) from public.impact_study_allowed_arms where study_instance_id=safety_id) <> 4
    or (select count(*) from public.impact_study_allowed_exposure_cells where study_instance_id=safety_id) <> 4
    or (select count(*) from public.impact_study_allowed_outcomes where study_instance_id=safety_id) <> 2
    or (select count(*) from public.impact_study_allowed_evidence_schemes where study_instance_id=safety_id) <> 1
  then raise exception 'frozen child design binding mismatch'; end if;

  begin
    perform public.record_qa_synthetic_assignment(safety_id,'synthetic:bad-arm','synthetic:cluster-x','unknown_arm',0.25,'both_roles','{"fixtureKey":"synthetic:bad-arm","stratumKey":"synthetic:stratum-x","drawIndex":"1"}'::jsonb);
    raise exception 'unknown arm unexpectedly recorded';
  exception when check_violation then null; end;
  begin
    perform public.record_qa_synthetic_assignment(safety_id,'synthetic:bad-probability','synthetic:cluster-x','both_roles',0.5,'both_roles','{"fixtureKey":"synthetic:bad-probability","stratumKey":"synthetic:stratum-x","drawIndex":"1"}'::jsonb);
    raise exception 'wrong assignment probability unexpectedly recorded';
  exception when check_violation then null; end;
  begin
    perform public.record_qa_synthetic_assignment(safety_id,'synthetic:bad-cell','synthetic:cluster-x','both_roles',0.25,'unsupported_cell','{"fixtureKey":"synthetic:bad-cell","stratumKey":"synthetic:stratum-x","drawIndex":"1"}'::jsonb);
    raise exception 'unsupported planned cell unexpectedly recorded';
  exception when check_violation then null; end;
  begin
    perform public.record_qa_synthetic_assignment(safety_id,'synthetic:bad-email','synthetic:cluster-x','both_roles',0.25,'both_roles','{"fixtureKey":"synthetic:bad-email","stratumKey":"synthetic:stratum-x","drawIndex":"1","email":"person@example.com"}'::jsonb);
    raise exception 'child email unexpectedly recorded';
  exception when check_violation then null; end;

  safety_assignment := public.record_qa_synthetic_assignment(
    safety_id,'synthetic:safety-subject-001','synthetic:safety-cluster-001',
    'both_roles',0.25,'both_roles',
    '{"fixtureKey":"synthetic:safety-assignment-001","stratumKey":"synthetic:safety-stratum-001","drawIndex":"1"}'::jsonb
  );
  cancellation_assignment := public.record_qa_synthetic_assignment(
    cancellation_id,'synthetic:cancellation-subject-001','synthetic:cancellation-cluster-001',
    'neither_role',0.25,'neither_role',
    '{"fixtureKey":"synthetic:cancellation-assignment-001","stratumKey":"synthetic:cancellation-stratum-001","drawIndex":"1"}'::jsonb
  );

  begin
    perform public.record_qa_synthetic_exposure(safety_assignment,'synthetic:bad-exposure-cell','unsupported_cell',false,false,'{"fixtureKey":"synthetic:bad-exposure","sourceEventKey":"synthetic:source-bad"}'::jsonb);
    raise exception 'unsupported observed cell unexpectedly recorded';
  exception when check_violation then null; end;

  perform public.record_qa_synthetic_exposure(safety_assignment,'synthetic:safety-exposure-001','both_roles',false,false,'{"fixtureKey":"synthetic:safety-exposure-fixture-001","sourceEventKey":"synthetic:safety-source-event-001"}'::jsonb);

  begin
    perform public.record_qa_synthetic_outcome(safety_id,'synthetic:safety-subject-001','unknown_outcome','synthetic_action_unit',1,'reviewed',array['qa-evidence://synthetic/unknown-outcome'],'{"fixtureKey":"synthetic:bad-outcome","adjudicationRuleKey":"synthetic:adjudication-bad","evidenceResolutionKey":"synthetic:resolution-bad"}'::jsonb);
    raise exception 'unregistered outcome unexpectedly recorded';
  exception when check_violation then null; end;
  begin
    perform public.record_qa_synthetic_outcome(safety_id,'synthetic:safety-subject-001','counterparty_native_units','wrong_unit',1,'reviewed',array['qa-evidence://synthetic/wrong-unit'],'{"fixtureKey":"synthetic:bad-unit","adjudicationRuleKey":"synthetic:adjudication-bad","evidenceResolutionKey":"synthetic:resolution-bad"}'::jsonb);
    raise exception 'wrong native unit unexpectedly recorded';
  exception when check_violation then null; end;
  begin
    perform public.record_qa_synthetic_outcome(safety_id,'synthetic:safety-subject-001','counterparty_native_units','synthetic_action_unit',1,'reviewed',array['https://example.com/receipt'],'{"fixtureKey":"synthetic:bad-evidence","adjudicationRuleKey":"synthetic:adjudication-bad","evidenceResolutionKey":"synthetic:resolution-bad"}'::jsonb);
    raise exception 'real evidence URI unexpectedly recorded';
  exception when check_violation then null; end;

  perform public.record_qa_synthetic_outcome(safety_id,'synthetic:safety-subject-001','counterparty_native_units','synthetic_action_unit',3,'reviewed',array['qa-evidence://synthetic/safety-receipt-001'],'{"fixtureKey":"synthetic:safety-outcome-001","adjudicationRuleKey":"synthetic:safety-adjudication-001","evidenceResolutionKey":"synthetic:safety-resolution-001"}'::jsonb);
  perform public.register_qa_synthetic_calibration_manifest(safety_id,'synthetic:safety-dataset-001',1,'{"fixtureKey":"synthetic:safety-calibration-001","schemaKey":"synthetic:safety-calibration-schema-001"}'::jsonb);

  perform public.record_qa_impact_safety_event(safety_id,'synthetic:safety-veto-001','synthetic:safety-subject-001','off_platform_substitution','observed','{"fixtureKey":"synthetic:safety-veto-fixture-001","detectionRuleKey":"synthetic:safety-detection-001"}'::jsonb);
  if not public.impact_study_is_blocked(safety_id) then raise exception 'safety veto failed to block study'; end if;

  begin
    perform public.record_qa_synthetic_assignment(safety_id,'synthetic:safety-subject-002','synthetic:safety-cluster-001','neither_role',0.25,'neither_role','{"fixtureKey":"synthetic:safety-assignment-002","stratumKey":"synthetic:safety-stratum-001","drawIndex":"2"}'::jsonb);
    raise exception 'assignment after safety veto unexpectedly succeeded';
  exception when object_not_in_prerequisite_state then null; end;
  begin
    perform public.record_qa_synthetic_exposure(safety_assignment,'synthetic:safety-exposure-002','both_roles',false,false,'{"fixtureKey":"synthetic:safety-exposure-fixture-002","sourceEventKey":"synthetic:safety-source-event-002"}'::jsonb);
    raise exception 'exposure after safety veto unexpectedly succeeded';
  exception when object_not_in_prerequisite_state then null; end;
  begin
    perform public.register_qa_synthetic_calibration_manifest(safety_id,'synthetic:safety-dataset-002',1,'{"fixtureKey":"synthetic:safety-calibration-002","schemaKey":"synthetic:safety-calibration-schema-001"}'::jsonb);
    raise exception 'calibration after safety veto unexpectedly succeeded';
  exception when object_not_in_prerequisite_state then null; end;

  begin
    perform public.append_qa_impact_study_event(cancellation_id,'amendment_recorded','{"amendmentKey":"synthetic:late-amendment-001","fixtureKey":"synthetic:cancellation-fixture"}'::jsonb);
    raise exception 'post-assignment amendment unexpectedly succeeded';
  exception when check_violation then null; end;

  perform public.append_qa_impact_study_event(cancellation_id,'study_cancelled','{"cancellationKey":"synthetic:cancellation-001","fixtureKey":"synthetic:cancellation-fixture","reasonCode":"owner_uat_cancel"}'::jsonb);
  if not public.impact_study_is_blocked(cancellation_id) then raise exception 'cancellation failed to block study'; end if;
  begin
    perform public.append_qa_impact_study_event(cancellation_id,'study_cancelled','{"cancellationKey":"synthetic:cancellation-002","fixtureKey":"synthetic:cancellation-fixture","reasonCode":"duplicate_cancel"}'::jsonb);
    raise exception 'duplicate cancellation unexpectedly succeeded';
  exception when check_violation then null; end;
  begin
    perform public.record_qa_synthetic_assignment(cancellation_id,'synthetic:cancellation-subject-002','synthetic:cancellation-cluster-001','both_roles',0.25,'both_roles','{"fixtureKey":"synthetic:cancellation-assignment-002","stratumKey":"synthetic:cancellation-stratum-001","drawIndex":"2"}'::jsonb);
    raise exception 'assignment after cancellation unexpectedly succeeded';
  exception when object_not_in_prerequisite_state then null; end;
  begin
    perform public.record_qa_synthetic_exposure(cancellation_assignment,'synthetic:cancellation-exposure-001','neither_role',false,false,'{"fixtureKey":"synthetic:cancellation-exposure-fixture-001","sourceEventKey":"synthetic:cancellation-source-event-001"}'::jsonb);
    raise exception 'exposure after cancellation unexpectedly succeeded';
  exception when object_not_in_prerequisite_state then null; end;

  if exists (select 1 from public.impact_study_synthetic_outcomes where causal_claim_authorized or additionality_claim_authorized or participant_credit_authorized)
  then raise exception 'synthetic outcome authorized a product claim'; end if;
  if exists (select 1 from public.impact_study_calibration_manifests where eligible_for_empirical_calibration or eligible_for_model_activation)
  then raise exception 'synthetic calibration became eligible'; end if;

  insert into impact_study_remediation_test_state values (safety_id,safety_assignment,cancellation_id,cancellation_assignment);
end;
$service_flow$;

reset role;

do $structural_invariants$
declare
  state impact_study_remediation_test_state%rowtype;
  valid_assignment_payload jsonb := '{"fixtureKey":"synthetic:direct-hash-fixture","stratumKey":"synthetic:direct-stratum","drawIndex":"9"}'::jsonb;
begin
  select * into state from impact_study_remediation_test_state;

  begin
    insert into public.impact_study_synthetic_assignments(
      study_instance_id,synthetic_subject_key,synthetic_cluster_key,
      arm_key,assignment_probability,planned_exposure_cell,
      assignment_payload,assignment_payload_sha256
    ) values (
      state.safety_study_id,'synthetic:direct-hash-subject','synthetic:direct-hash-cluster',
      'both_roles',0.25,'both_roles',valid_assignment_payload,
      'sha256:0000000000000000000000000000000000000000000000000000000000000000'
    );
    raise exception 'mismatched child payload hash unexpectedly inserted';
  exception when check_violation then null; end;

  begin
    insert into public.impact_study_registry_events(
      study_instance_id,event_type,event_payload,event_payload_sha256
    ) values (
      state.cancellation_study_id,'deviation_recorded',
      '{"deviationKey":"synthetic:direct-deviation","fixtureKey":"synthetic:cancellation-fixture"}'::jsonb,
      'sha256:0000000000000000000000000000000000000000000000000000000000000000'
    );
    raise exception 'mismatched event payload hash unexpectedly inserted';
  exception when check_violation then null; end;

  begin
    update public.impact_study_instances set registry_status='registered_nonexecuting' where id=state.safety_study_id;
    raise exception 'append-only instance update unexpectedly succeeded';
  exception when object_not_in_prerequisite_state then null; end;
  begin
    delete from public.impact_study_synthetic_assignments where id=state.safety_assignment_id;
    raise exception 'append-only assignment delete unexpectedly succeeded';
  exception when object_not_in_prerequisite_state then null; end;
end;
$structural_invariants$;

rollback;
