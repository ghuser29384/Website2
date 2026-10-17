begin;

do $qa_guard$
begin
  if not exists (
    select 1
    from supabase_migrations.schema_migrations
    where version = '20260810150350'
      and name = 'commitments_impact_methodology_review_remediation'
  ) then
    raise exception
      'QA-only impact-study instrumentation requires the QA methodology-remediation marker and must not be applied to production.'
      using errcode = '55000';
  end if;
end;
$qa_guard$;

create or replace function public.impact_study_is_sha256(p_value text)
returns boolean
language sql
immutable
set search_path = public
as $$
  select coalesce(p_value ~ '^sha256:[0-9a-f]{64}$', false);
$$;

create or replace function public.impact_study_jsonb_sha256(p_value jsonb)
returns text
language sql
immutable
set search_path = public
as $$
  select 'sha256:' || encode(
    extensions.digest(
      convert_to(coalesce(p_value, 'null'::jsonb)::text, 'UTF8'),
      'sha256'
    ),
    'hex'
  );
$$;

create or replace function public.impact_study_is_synthetic_key(p_value text)
returns boolean
language sql
immutable
set search_path = public
as $$
  select coalesce(p_value ~ '^synthetic:[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$', false);
$$;

create or replace function public.impact_study_required_binding_names()
returns text[]
language sql
immutable
set search_path = public
as $$
  select array[
    'studyKey','studyVersion','mechanismFamily','studyVariant',
    'eligiblePopulationSnapshotHash','eligibilityRules','exclusionRules',
    'assignmentUnit','exposureUnit','outcomeUnit','analysisUnit',
    'interferenceClusterDefinition','assignmentDesign','assignmentProbabilities',
    'blockingAndStratificationVariables','exposureMapping','supportedExposureCells',
    'emptyExposureCellAction','primaryEstimand','potentialOutcomeContrast',
    'targetPopulation','primaryOutcome','outcomeWindow','estimator',
    'varianceProcedure','finiteSampleInference','unequalClusterSizeHandling',
    'covariateAdjustmentPolicy','missingnessEstimand','attritionBounds',
    'sensitivityAnalyses','graphDiagnostics','precisionSimulation',
    'fixedHorizonOrSequentialDesign','ethicsDetermination','participantDefinition',
    'consentOrWaiver','controlConditionJustification',
    'vulnerableParticipantProtections','debriefingPolicy',
    'adverseEventMonitoring','stopAndSuspensionRules','privacyRetentionAndDeletion',
    'accessControl','incidentResponse','entropySource','seedGenerationProcedure',
    'seedCommitment','constrainedRandomizationRule','assignmentConcealment',
    'outcomeAdjudicatorBlinding','unblindingLog',
    'postAssignmentEligibilityChangeLog','differentialEvidenceResolutionAudit',
    'blockingSafetyOutcomes','contaminationAndSpilloverMonitoring',
    'offPlatformSubstitutionAudit','resourceClaimDeduplication','analysisCodeHash',
    'protocolPayloadHash','templatePayloadHash','studyInstancePayloadHash',
    'appendOnlyRegistryRecord','protectedTagOrEquivalent','amendmentLog','deviationLog'
  ]::text[];
$$;

create or replace function public.impact_study_payload_has_required_bindings(p_payload jsonb)
returns boolean
language sql
immutable
set search_path = public
as $$
  select jsonb_typeof(p_payload) = 'object'
    and not exists (
      select 1
      from unnest(public.impact_study_required_binding_names()) binding_name
      where not (p_payload ? binding_name)
        or p_payload -> binding_name = 'null'::jsonb
    );
$$;

create or replace function public.impact_study_payload_contains_real_identifiers(p_payload jsonb)
returns boolean
language sql
immutable
set search_path = public
as $$
  select coalesce(
    p_payload::text ~* '"(userId|authUserId|profileId|email|phone|fullName|legalName)"[[:space:]]*:',
    false
  );
$$;

create table public.impact_study_protocol_bindings (
  protocol_key text not null,
  payload_sha256 text not null,
  repository text not null,
  merged_commit_sha text not null,
  accepted_review_id bigint not null,
  binding_status text not null,
  execution_authorized boolean not null default false,
  created_at timestamptz not null default statement_timestamp(),
  primary key (protocol_key, payload_sha256),
  check (public.impact_study_is_sha256(payload_sha256)),
  check (merged_commit_sha ~ '^[0-9a-f]{40}$'),
  check (binding_status = 'accepted_internal_design_contract'),
  check (execution_authorized = false)
);

create table public.impact_study_template_bindings (
  mechanism_family text not null,
  template_key text not null,
  payload_sha256 text not null,
  template_status text not null,
  execution_authorized boolean not null default false,
  created_at timestamptz not null default statement_timestamp(),
  primary key (mechanism_family, template_key, payload_sha256),
  check (mechanism_family in ('trade','co_fund','threshold_funding','donation_upgrade','threshold_sign_on','donation_redirect')),
  check (public.impact_study_is_sha256(payload_sha256)),
  check (template_status = 'bound_nonexecuting'),
  check (execution_authorized = false)
);

insert into public.impact_study_protocol_bindings values (
  'commitments-causal-identification-and-calibration-master-v2',
  'sha256:cd663ae722ee028ddfe3e1b866acab9ef79b5fcf5b5418d053bd3687eca3881a',
  'ghuser29384/Website2','f93acc33c135f34bc28f006842d9e08120d5b859',4905985869,
  'accepted_internal_design_contract',false,statement_timestamp()
);

insert into public.impact_study_template_bindings (
  mechanism_family,template_key,payload_sha256,template_status,execution_authorized
) values
('trade','commitments-trade-study-template-v2','sha256:cf0a7a96294b431dcd79879fa01b7d1031ea50a842cebca6986e13351bcbb1e1','bound_nonexecuting',false),
('co_fund','commitments-co-fund-study-template-v2','sha256:441c6e82335c851e7e5ba80e291473caaf23600af7ca695849f994bc4867195c','bound_nonexecuting',false),
('threshold_funding','commitments-threshold-funding-study-template-v2','sha256:44f934b72fb31f0fb2c2c01235bafffbe6dadc229062ee19da4c7858e70c344a','bound_nonexecuting',false),
('donation_upgrade','commitments-donation-upgrade-study-template-v2','sha256:a0c6ea80a989558070869d87aae41aabe7d34a8e011f41e53427015fc0e95512','bound_nonexecuting',false),
('threshold_sign_on','commitments-threshold-sign-on-study-template-v2','sha256:dec601d3f34a3015cc7829d7a860a37b7f1be7b41112aec6a700833fc24890e8','bound_nonexecuting',false),
('donation_redirect','commitments-donation-redirect-study-template-v2','sha256:f7486aa6d6532a316b2cc7e075dcb6b6e8a1ffe0c85dea345a1d2c6d4fbd756c','bound_nonexecuting',false);

create table public.impact_study_instances (
  id uuid primary key default gen_random_uuid(),
  study_key text not null unique,
  study_version integer not null check (study_version > 0),
  mechanism_family text not null check (mechanism_family in ('trade','co_fund','threshold_funding','donation_upgrade','threshold_sign_on','donation_redirect')),
  study_variant text not null,
  protocol_key text not null,
  protocol_payload_hash text not null,
  template_key text not null,
  template_payload_hash text not null,
  study_instance_payload jsonb not null check (jsonb_typeof(study_instance_payload)='object'),
  study_instance_payload_hash text not null,
  eligible_population_snapshot_hash text not null,
  assignment_code_hash text not null,
  analysis_code_hash text not null,
  seed_commitment text not null,
  append_only_registry_uri text not null check (append_only_registry_uri ~ '^qa-registry://'),
  protected_record_ref text not null,
  environment text not null default 'qa' check (environment='qa'),
  subject_mode text not null default 'synthetic_only' check (subject_mode='synthetic_only'),
  execution_authorized boolean not null default false check (execution_authorized=false),
  real_user_assignment_allowed boolean not null default false check (real_user_assignment_allowed=false),
  registry_status text not null default 'registered_nonexecuting' check (registry_status='registered_nonexecuting'),
  ethics_determination_status text not null default 'required_not_completed',
  precision_simulation_status text not null default 'required_not_completed',
  founder_approval_status text not null default 'not_recorded',
  created_at timestamptz not null default statement_timestamp(),
  created_by_role text not null default current_user,
  check (public.impact_study_is_sha256(protocol_payload_hash) and public.impact_study_is_sha256(template_payload_hash) and public.impact_study_is_sha256(study_instance_payload_hash) and public.impact_study_is_sha256(eligible_population_snapshot_hash) and public.impact_study_is_sha256(assignment_code_hash) and public.impact_study_is_sha256(analysis_code_hash) and public.impact_study_is_sha256(seed_commitment)),
  foreign key (protocol_key,protocol_payload_hash) references public.impact_study_protocol_bindings(protocol_key,payload_sha256),
  foreign key (mechanism_family,template_key,template_payload_hash) references public.impact_study_template_bindings(mechanism_family,template_key,payload_sha256)
);

create table public.impact_study_registry_events (
  id uuid primary key default gen_random_uuid(),
  study_instance_id uuid not null references public.impact_study_instances(id),
  event_sequence bigint generated always as identity,
  event_type text not null check (event_type in ('study_registered','amendment_recorded','deviation_recorded','unblinding_recorded','post_assignment_eligibility_change_recorded','synthetic_assignment_recorded','synthetic_exposure_recorded','synthetic_outcome_recorded','safety_veto_recorded','calibration_manifest_recorded','study_cancelled')),
  event_payload jsonb not null check (jsonb_typeof(event_payload)='object'),
  event_payload_sha256 text not null check (public.impact_study_is_sha256(event_payload_sha256)),
  execution_effect text not null default 'none' check (execution_effect='none'),
  synthetic_only boolean not null default true check (synthetic_only=true),
  recorded_at timestamptz not null default statement_timestamp(),
  recorded_by_role text not null default current_user,
  unique (study_instance_id,event_sequence)
);

create table public.impact_study_synthetic_assignments (
  id uuid primary key default gen_random_uuid(),
  study_instance_id uuid not null references public.impact_study_instances(id),
  synthetic_subject_key text not null check (public.impact_study_is_synthetic_key(synthetic_subject_key)),
  synthetic_cluster_key text not null check (public.impact_study_is_synthetic_key(synthetic_cluster_key)),
  arm_key text not null,
  assignment_probability numeric(12,10) not null check (assignment_probability > 0 and assignment_probability <= 1),
  planned_exposure_cell text not null,
  assignment_payload jsonb not null default '{}'::jsonb check (jsonb_typeof(assignment_payload)='object'),
  assignment_payload_sha256 text not null check (public.impact_study_is_sha256(assignment_payload_sha256)),
  is_real_user boolean not null default false check (is_real_user=false),
  assigned_at timestamptz not null default statement_timestamp(),
  unique (study_instance_id,synthetic_subject_key)
);

create table public.impact_study_synthetic_exposures (
  id uuid primary key default gen_random_uuid(),
  assignment_id uuid not null references public.impact_study_synthetic_assignments(id),
  exposure_event_key text not null,
  observed_exposure_cell text not null,
  contamination_detected boolean not null default false,
  spillover_detected boolean not null default false,
  exposure_payload jsonb not null default '{}'::jsonb check (jsonb_typeof(exposure_payload)='object'),
  exposure_payload_sha256 text not null check (public.impact_study_is_sha256(exposure_payload_sha256)),
  observed_at timestamptz not null default statement_timestamp(),
  unique (assignment_id,exposure_event_key)
);

create table public.impact_study_synthetic_outcomes (
  id uuid primary key default gen_random_uuid(),
  study_instance_id uuid not null references public.impact_study_instances(id),
  synthetic_subject_key text not null check (public.impact_study_is_synthetic_key(synthetic_subject_key)),
  outcome_key text not null,
  native_unit text not null,
  numeric_value numeric,
  resolution_status text not null check (resolution_status in ('reviewed','unresolved','missing','rejected')),
  evidence_refs text[] not null default '{}'::text[],
  outcome_payload jsonb not null default '{}'::jsonb check (jsonb_typeof(outcome_payload)='object'),
  outcome_payload_sha256 text not null check (public.impact_study_is_sha256(outcome_payload_sha256)),
  causal_claim_authorized boolean not null default false,
  additionality_claim_authorized boolean not null default false,
  participant_credit_authorized boolean not null default false,
  recorded_at timestamptz not null default statement_timestamp(),
  unique (study_instance_id,synthetic_subject_key,outcome_key),
  check (resolution_status <> 'reviewed' or (numeric_value is not null and cardinality(evidence_refs)>0)),
  check (causal_claim_authorized=false and additionality_claim_authorized=false and participant_credit_authorized=false)
);

create table public.impact_study_safety_events (
  id uuid primary key default gen_random_uuid(),
  study_instance_id uuid not null references public.impact_study_instances(id),
  synthetic_subject_key text check (synthetic_subject_key is null or public.impact_study_is_synthetic_key(synthetic_subject_key)),
  safety_outcome_key text not null check (safety_outcome_key in ('harmful_offer_or_threat','baseline_manufacture_or_worsening','harm_shifted_to_nonparticipants','coercion_harassment_identity_exposure_or_retaliation','concentration_or_exclusion_effect','off_platform_substitution','duplicate_or_overlapping_resource_claim')),
  safety_status text not null check (safety_status in ('observed','unresolved','cleared')),
  blocking_veto boolean not null default true check (blocking_veto=true),
  safety_payload jsonb not null default '{}'::jsonb check (jsonb_typeof(safety_payload)='object'),
  safety_payload_sha256 text not null check (public.impact_study_is_sha256(safety_payload_sha256)),
  recorded_at timestamptz not null default statement_timestamp()
);

create table public.impact_study_calibration_manifests (
  id uuid primary key default gen_random_uuid(),
  study_instance_id uuid not null references public.impact_study_instances(id),
  dataset_key text not null,
  observation_count integer not null check (observation_count>=0),
  source_scope text not null default 'synthetic_qa_only' check (source_scope='synthetic_qa_only'),
  holdout_status text not null default 'not_applicable_synthetic' check (holdout_status='not_applicable_synthetic'),
  eligible_for_empirical_calibration boolean not null default false,
  eligible_for_model_activation boolean not null default false,
  manifest_payload jsonb not null check (jsonb_typeof(manifest_payload)='object'),
  manifest_payload_sha256 text not null check (public.impact_study_is_sha256(manifest_payload_sha256)),
  created_at timestamptz not null default statement_timestamp(),
  unique (study_instance_id,dataset_key),
  check (eligible_for_empirical_calibration=false and eligible_for_model_activation=false)
);

create or replace function public.impact_study_reject_mutation()
returns trigger language plpgsql set search_path=public as $$
begin
  raise exception 'Impact-study instrumentation is append-only' using errcode='55000';
end; $$;

create or replace function public.impact_study_validate_instance_insert()
returns trigger language plpgsql set search_path=public as $$
declare expected_hash text;
begin
  if not public.impact_study_payload_has_required_bindings(new.study_instance_payload) then raise exception 'Study instance is missing one or more required protocol bindings' using errcode='23514'; end if;
  if public.impact_study_payload_contains_real_identifiers(new.study_instance_payload) then raise exception 'QA study payload contains a prohibited real-person identifier field' using errcode='23514'; end if;
  if new.study_instance_payload->>'studyKey'<>new.study_key or (new.study_instance_payload->>'studyVersion')::integer<>new.study_version or new.study_instance_payload->>'mechanismFamily'<>new.mechanism_family or new.study_instance_payload->>'studyVariant'<>new.study_variant or new.study_instance_payload->>'protocolPayloadHash'<>new.protocol_payload_hash or new.study_instance_payload->>'templatePayloadHash'<>new.template_payload_hash or new.study_instance_payload->>'studyInstancePayloadHash'<>new.study_instance_payload_hash or new.study_instance_payload->>'eligiblePopulationSnapshotHash'<>new.eligible_population_snapshot_hash or new.study_instance_payload->>'assignmentCodeHash'<>new.assignment_code_hash or new.study_instance_payload->>'analysisCodeHash'<>new.analysis_code_hash or new.study_instance_payload->>'seedCommitment'<>new.seed_commitment or new.study_instance_payload->>'appendOnlyRegistryRecord'<>new.append_only_registry_uri or new.study_instance_payload->>'protectedTagOrEquivalent'<>new.protected_record_ref then raise exception 'Study instance columns do not match the immutable payload' using errcode='23514'; end if;
  if new.study_instance_payload->>'instrumentationEnvironment'<>'qa' or new.study_instance_payload->>'subjectMode'<>'synthetic_only' or new.study_instance_payload->'executionAuthorized' is distinct from 'false'::jsonb or new.study_instance_payload->'realUserAssignmentAllowed' is distinct from 'false'::jsonb then raise exception 'Study instrumentation must remain QA-only, synthetic-only, and non-executing' using errcode='23514'; end if;
  expected_hash:=public.impact_study_jsonb_sha256(new.study_instance_payload-'studyInstancePayloadHash');
  if expected_hash<>new.study_instance_payload_hash then raise exception 'Study-instance canonical database payload hash mismatch' using errcode='23514'; end if;
  return new;
exception when invalid_text_representation then raise exception 'Study version must be a positive integer' using errcode='23514';
end; $$;

create or replace function public.impact_study_validate_child_insert()
returns trigger language plpgsql set search_path=public as $$
declare parent_id uuid;
begin
  if tg_table_name='impact_study_synthetic_exposures' then select a.study_instance_id into parent_id from public.impact_study_synthetic_assignments a where a.id=new.assignment_id; else parent_id:=new.study_instance_id; end if;
  if parent_id is null or not exists (select 1 from public.impact_study_instances i where i.id=parent_id and i.environment='qa' and i.subject_mode='synthetic_only' and i.execution_authorized=false and i.real_user_assignment_allowed=false and i.registry_status='registered_nonexecuting') then raise exception 'Child instrumentation requires a registered non-executing QA study instance' using errcode='23514'; end if;
  if tg_table_name='impact_study_synthetic_outcomes' and not exists (select 1 from public.impact_study_synthetic_assignments a where a.study_instance_id=new.study_instance_id and a.synthetic_subject_key=new.synthetic_subject_key) then raise exception 'Synthetic outcome requires a prior synthetic assignment' using errcode='23514'; end if;
  return new;
end; $$;

create trigger impact_study_instances_validate_insert before insert on public.impact_study_instances for each row execute function public.impact_study_validate_instance_insert();
create trigger impact_study_instances_append_only before update or delete on public.impact_study_instances for each row execute function public.impact_study_reject_mutation();
create trigger impact_study_protocol_bindings_append_only before update or delete on public.impact_study_protocol_bindings for each row execute function public.impact_study_reject_mutation();
create trigger impact_study_template_bindings_append_only before update or delete on public.impact_study_template_bindings for each row execute function public.impact_study_reject_mutation();
create trigger impact_study_registry_events_validate_insert before insert on public.impact_study_registry_events for each row execute function public.impact_study_validate_child_insert();
create trigger impact_study_registry_events_append_only before update or delete on public.impact_study_registry_events for each row execute function public.impact_study_reject_mutation();
create trigger impact_study_assignments_validate_insert before insert on public.impact_study_synthetic_assignments for each row execute function public.impact_study_validate_child_insert();
create trigger impact_study_assignments_append_only before update or delete on public.impact_study_synthetic_assignments for each row execute function public.impact_study_reject_mutation();
create trigger impact_study_exposures_validate_insert before insert on public.impact_study_synthetic_exposures for each row execute function public.impact_study_validate_child_insert();
create trigger impact_study_exposures_append_only before update or delete on public.impact_study_synthetic_exposures for each row execute function public.impact_study_reject_mutation();
create trigger impact_study_outcomes_validate_insert before insert on public.impact_study_synthetic_outcomes for each row execute function public.impact_study_validate_child_insert();
create trigger impact_study_outcomes_append_only before update or delete on public.impact_study_synthetic_outcomes for each row execute function public.impact_study_reject_mutation();
create trigger impact_study_safety_validate_insert before insert on public.impact_study_safety_events for each row execute function public.impact_study_validate_child_insert();
create trigger impact_study_safety_append_only before update or delete on public.impact_study_safety_events for each row execute function public.impact_study_reject_mutation();
create trigger impact_study_calibration_validate_insert before insert on public.impact_study_calibration_manifests for each row execute function public.impact_study_validate_child_insert();
create trigger impact_study_calibration_append_only before update or delete on public.impact_study_calibration_manifests for each row execute function public.impact_study_reject_mutation();

create or replace function public.register_qa_impact_study_instance(p_payload jsonb)
returns uuid language plpgsql security definer set search_path=public as $$
declare new_id uuid; registration_event jsonb;
begin
  insert into public.impact_study_instances(study_key,study_version,mechanism_family,study_variant,protocol_key,protocol_payload_hash,template_key,template_payload_hash,study_instance_payload,study_instance_payload_hash,eligible_population_snapshot_hash,assignment_code_hash,analysis_code_hash,seed_commitment,append_only_registry_uri,protected_record_ref)
  values(p_payload->>'studyKey',(p_payload->>'studyVersion')::integer,p_payload->>'mechanismFamily',p_payload->>'studyVariant',p_payload->>'protocolKey',p_payload->>'protocolPayloadHash',p_payload->>'templateKey',p_payload->>'templatePayloadHash',p_payload,p_payload->>'studyInstancePayloadHash',p_payload->>'eligiblePopulationSnapshotHash',p_payload->>'assignmentCodeHash',p_payload->>'analysisCodeHash',p_payload->>'seedCommitment',p_payload->>'appendOnlyRegistryRecord',p_payload->>'protectedTagOrEquivalent') returning id into new_id;
  registration_event:=jsonb_build_object('studyKey',p_payload->>'studyKey','studyInstancePayloadHash',p_payload->>'studyInstancePayloadHash','executionAuthorized',false,'subjectMode','synthetic_only');
  insert into public.impact_study_registry_events(study_instance_id,event_type,event_payload,event_payload_sha256) values(new_id,'study_registered',registration_event,public.impact_study_jsonb_sha256(registration_event));
  return new_id;
end; $$;

create or replace function public.append_qa_impact_study_event(p_study_instance_id uuid,p_event_type text,p_event_payload jsonb)
returns uuid language plpgsql security definer set search_path=public as $$
declare new_id uuid;
begin insert into public.impact_study_registry_events(study_instance_id,event_type,event_payload,event_payload_sha256) values(p_study_instance_id,p_event_type,p_event_payload,public.impact_study_jsonb_sha256(p_event_payload)) returning id into new_id; return new_id; end; $$;

create or replace function public.record_qa_synthetic_assignment(p_study_instance_id uuid,p_synthetic_subject_key text,p_synthetic_cluster_key text,p_arm_key text,p_assignment_probability numeric,p_planned_exposure_cell text,p_assignment_payload jsonb default '{}'::jsonb)
returns uuid language plpgsql security definer set search_path=public as $$
declare new_id uuid;
begin insert into public.impact_study_synthetic_assignments(study_instance_id,synthetic_subject_key,synthetic_cluster_key,arm_key,assignment_probability,planned_exposure_cell,assignment_payload,assignment_payload_sha256) values(p_study_instance_id,p_synthetic_subject_key,p_synthetic_cluster_key,p_arm_key,p_assignment_probability,p_planned_exposure_cell,p_assignment_payload,public.impact_study_jsonb_sha256(p_assignment_payload)) returning id into new_id; perform public.append_qa_impact_study_event(p_study_instance_id,'synthetic_assignment_recorded',jsonb_build_object('assignmentId',new_id,'syntheticSubjectKey',p_synthetic_subject_key,'armKey',p_arm_key)); return new_id; end; $$;

create or replace function public.record_qa_synthetic_exposure(p_assignment_id uuid,p_exposure_event_key text,p_observed_exposure_cell text,p_contamination_detected boolean,p_spillover_detected boolean,p_exposure_payload jsonb default '{}'::jsonb)
returns uuid language plpgsql security definer set search_path=public as $$
declare new_id uuid; study_id uuid;
begin select a.study_instance_id into study_id from public.impact_study_synthetic_assignments a where a.id=p_assignment_id; if study_id is null then raise exception 'Synthetic assignment not found' using errcode='23503'; end if; insert into public.impact_study_synthetic_exposures(assignment_id,exposure_event_key,observed_exposure_cell,contamination_detected,spillover_detected,exposure_payload,exposure_payload_sha256) values(p_assignment_id,p_exposure_event_key,p_observed_exposure_cell,p_contamination_detected,p_spillover_detected,p_exposure_payload,public.impact_study_jsonb_sha256(p_exposure_payload)) returning id into new_id; perform public.append_qa_impact_study_event(study_id,'synthetic_exposure_recorded',jsonb_build_object('exposureId',new_id,'assignmentId',p_assignment_id,'observedExposureCell',p_observed_exposure_cell,'contaminationDetected',p_contamination_detected,'spilloverDetected',p_spillover_detected)); return new_id; end; $$;

create or replace function public.record_qa_synthetic_outcome(p_study_instance_id uuid,p_synthetic_subject_key text,p_outcome_key text,p_native_unit text,p_numeric_value numeric,p_resolution_status text,p_evidence_refs text[],p_outcome_payload jsonb default '{}'::jsonb)
returns uuid language plpgsql security definer set search_path=public as $$
declare new_id uuid;
begin insert into public.impact_study_synthetic_outcomes(study_instance_id,synthetic_subject_key,outcome_key,native_unit,numeric_value,resolution_status,evidence_refs,outcome_payload,outcome_payload_sha256) values(p_study_instance_id,p_synthetic_subject_key,p_outcome_key,p_native_unit,p_numeric_value,p_resolution_status,coalesce(p_evidence_refs,'{}'::text[]),p_outcome_payload,public.impact_study_jsonb_sha256(p_outcome_payload)) returning id into new_id; perform public.append_qa_impact_study_event(p_study_instance_id,'synthetic_outcome_recorded',jsonb_build_object('outcomeId',new_id,'syntheticSubjectKey',p_synthetic_subject_key,'outcomeKey',p_outcome_key,'resolutionStatus',p_resolution_status,'causalClaimAuthorized',false)); return new_id; end; $$;

create or replace function public.record_qa_impact_safety_event(p_study_instance_id uuid,p_synthetic_subject_key text,p_safety_outcome_key text,p_safety_status text,p_safety_payload jsonb default '{}'::jsonb)
returns uuid language plpgsql security definer set search_path=public as $$
declare new_id uuid;
begin insert into public.impact_study_safety_events(study_instance_id,synthetic_subject_key,safety_outcome_key,safety_status,safety_payload,safety_payload_sha256) values(p_study_instance_id,p_synthetic_subject_key,p_safety_outcome_key,p_safety_status,p_safety_payload,public.impact_study_jsonb_sha256(p_safety_payload)) returning id into new_id; perform public.append_qa_impact_study_event(p_study_instance_id,'safety_veto_recorded',jsonb_build_object('safetyEventId',new_id,'safetyOutcomeKey',p_safety_outcome_key,'safetyStatus',p_safety_status,'blockingVeto',true)); return new_id; end; $$;

create or replace function public.register_qa_synthetic_calibration_manifest(p_study_instance_id uuid,p_dataset_key text,p_observation_count integer,p_manifest_payload jsonb)
returns uuid language plpgsql security definer set search_path=public as $$
declare new_id uuid;
begin insert into public.impact_study_calibration_manifests(study_instance_id,dataset_key,observation_count,manifest_payload,manifest_payload_sha256) values(p_study_instance_id,p_dataset_key,p_observation_count,p_manifest_payload,public.impact_study_jsonb_sha256(p_manifest_payload)) returning id into new_id; perform public.append_qa_impact_study_event(p_study_instance_id,'calibration_manifest_recorded',jsonb_build_object('manifestId',new_id,'datasetKey',p_dataset_key,'sourceScope','synthetic_qa_only','eligibleForEmpiricalCalibration',false,'eligibleForModelActivation',false)); return new_id; end; $$;

alter table public.impact_study_protocol_bindings enable row level security;
alter table public.impact_study_template_bindings enable row level security;
alter table public.impact_study_instances enable row level security;
alter table public.impact_study_registry_events enable row level security;
alter table public.impact_study_synthetic_assignments enable row level security;
alter table public.impact_study_synthetic_exposures enable row level security;
alter table public.impact_study_synthetic_outcomes enable row level security;
alter table public.impact_study_safety_events enable row level security;
alter table public.impact_study_calibration_manifests enable row level security;

revoke all on table public.impact_study_protocol_bindings,public.impact_study_template_bindings,public.impact_study_instances,public.impact_study_registry_events,public.impact_study_synthetic_assignments,public.impact_study_synthetic_exposures,public.impact_study_synthetic_outcomes,public.impact_study_safety_events,public.impact_study_calibration_manifests from public,anon,authenticated,service_role;
grant select on table public.impact_study_protocol_bindings,public.impact_study_template_bindings,public.impact_study_instances,public.impact_study_registry_events,public.impact_study_synthetic_assignments,public.impact_study_synthetic_exposures,public.impact_study_synthetic_outcomes,public.impact_study_safety_events,public.impact_study_calibration_manifests to service_role;

revoke execute on function public.register_qa_impact_study_instance(jsonb),public.append_qa_impact_study_event(uuid,text,jsonb),public.record_qa_synthetic_assignment(uuid,text,text,text,numeric,text,jsonb),public.record_qa_synthetic_exposure(uuid,text,text,boolean,boolean,jsonb),public.record_qa_synthetic_outcome(uuid,text,text,text,numeric,text,text[],jsonb),public.record_qa_impact_safety_event(uuid,text,text,text,jsonb),public.register_qa_synthetic_calibration_manifest(uuid,text,integer,jsonb) from public,anon,authenticated;
grant execute on function public.register_qa_impact_study_instance(jsonb),public.append_qa_impact_study_event(uuid,text,jsonb),public.record_qa_synthetic_assignment(uuid,text,text,text,numeric,text,jsonb),public.record_qa_synthetic_exposure(uuid,text,text,boolean,boolean,jsonb),public.record_qa_synthetic_outcome(uuid,text,text,text,numeric,text,text[],jsonb),public.record_qa_impact_safety_event(uuid,text,text,text,jsonb),public.register_qa_synthetic_calibration_manifest(uuid,text,integer,jsonb) to service_role;

commit;