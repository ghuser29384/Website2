-- Immutable de-identified export content, replay, and integrity QA.
begin;

create temporary table qa_export_actors(
  actor_role text primary key,
  profile_id uuid not null unique
) on commit drop;

insert into qa_export_actors(actor_role, profile_id)
select roles.actor_role, profiles.id
from unnest(array[
  'administrator', 'subject', 'counterparty', 'original_reviewer', 'audit_reviewer'
]) with ordinality roles(actor_role, position)
join (
  select id, row_number() over(order by id) as position
  from public.profiles
  limit 5
) profiles using(position);

do $test$
begin
  if (select count(*) from qa_export_actors) <> 5 then
    raise exception 'Calibration-export QA requires five existing QA profiles.';
  end if;
end;
$test$;

create temporary table qa_export_objects(
  object_name text primary key,
  object_id uuid not null unique
) on commit drop;

with made as (
  insert into public.agreements(
    proposer_id, responder_id, status, lifecycle_status, source, completion_state
  )
  select
    counterparty.profile_id,
    subject.profile_id,
    'active'::public.agreement_status,
    'active',
    'manual',
    'under_review'
  from qa_export_actors counterparty
  cross join qa_export_actors subject
  where counterparty.actor_role = 'counterparty'
    and subject.actor_role = 'subject'
  returning id
)
insert into qa_export_objects select 'agreement', id from made;

with made as (
  insert into public.trade_agreement_versions(
    agreement_id,
    version,
    proposed_by,
    proposed_action,
    requested_action,
    duration,
    evidence_rule,
    evidence_due_date,
    exit_conditions,
    maximum_burden,
    privacy_scope,
    no_trade_baseline,
    terms_hash,
    requires_milestone_manifest,
    milestone_manifest_hash,
    complete_terms_hash
  )
  select
    agreement.object_id,
    1,
    counterparty.profile_id,
    'Complete ten private QA service units',
    'Settle the reviewed obligation externally',
    'QA only',
    'Private evidence under the frozen rule',
    current_date + 7,
    'Prospective exit only',
    '$100 maximum',
    'Participants and authorized reviewers only',
    'No performance without this agreement',
    repeat('1', 64),
    true,
    null,
    null
  from qa_export_objects agreement
  cross join qa_export_actors counterparty
  where agreement.object_name = 'agreement'
    and counterparty.actor_role = 'counterparty'
  returning id
)
insert into qa_export_objects select 'version', id from made;

update public.agreements
set current_version_id = (
      select object_id from qa_export_objects where object_name = 'version'
    ),
    evidence_due_at = current_date + 7
where id = (
  select object_id from qa_export_objects where object_name = 'agreement'
);

with made as (
  insert into public.trade_agreement_milestones(
    agreement_id,
    agreement_version_id,
    position,
    performer_id,
    payer_id,
    action_category,
    description,
    unit_label,
    units_total,
    indivisible,
    maximum_amount_cents,
    currency,
    evidence_rule,
    status
  )
  select
    agreement.object_id,
    version.object_id,
    1,
    subject.profile_id,
    counterparty.profile_id,
    'service',
    'Complete ten private QA service units',
    'unit',
    10,
    false,
    10000,
    'USD',
    'Private evidence under the frozen rule',
    'terms'
  from qa_export_objects agreement
  cross join qa_export_objects version
  cross join qa_export_actors subject
  cross join qa_export_actors counterparty
  where agreement.object_name = 'agreement'
    and version.object_name = 'version'
    and subject.actor_role = 'subject'
    and counterparty.actor_role = 'counterparty'
  returning id
)
insert into qa_export_objects select 'milestone', id from made;

update public.trade_agreement_versions
set milestone_manifest_hash = repeat('2', 64),
    complete_terms_hash = repeat('3', 64)
where id = (
  select object_id from qa_export_objects where object_name = 'version'
);

with made as (
  insert into public.trade_evidence_decisions(
    milestone_id,
    agreement_id,
    agreement_version_id,
    review_id,
    base_review_id,
    supersedes_decision_id,
    performer_id,
    payer_id,
    decision_status,
    completion_units,
    units_total,
    completion_fraction,
    payout_factor_band,
    decision_confidence_band,
    primary_provenance_class,
    provider_authentication_status,
    provider_authentication_ref,
    adjudication_class,
    contradiction_status,
    integrity_finding,
    responsiveness_finding,
    dispute_conduct_finding,
    finality_reason,
    exclusion_reason,
    terms_hash,
    decision_hash,
    source_key,
    occurred_at,
    finalized_at,
    created_by,
    metadata
  )
  select
    milestone.object_id,
    agreement.object_id,
    version.object_id,
    null,
    null,
    null,
    subject.profile_id,
    counterparty.profile_id,
    'eligible',
    6,
    10,
    0.6,
    50,
    75,
    'independent_third_party',
    'not_applicable',
    '',
    'neutral_review_final',
    'none',
    'not_assessed',
    'on_time',
    'not_assessed',
    'review_final',
    '',
    repeat('4', 64),
    repeat('5', 64),
    'qa-export-evidence-decision',
    now() - interval '2 days',
    now() - interval '2 days',
    original_reviewer.profile_id,
    jsonb_build_object('qa', true)
  from qa_export_objects milestone
  cross join qa_export_objects agreement
  cross join qa_export_objects version
  cross join qa_export_actors subject
  cross join qa_export_actors counterparty
  cross join qa_export_actors original_reviewer
  where milestone.object_name = 'milestone'
    and agreement.object_name = 'agreement'
    and version.object_name = 'version'
    and subject.actor_role = 'subject'
    and counterparty.actor_role = 'counterparty'
    and original_reviewer.actor_role = 'original_reviewer'
  returning id
)
insert into qa_export_objects select 'evidence_decision', id from made;

with made as (
  insert into public.credibility_shadow_events(
    evidence_decision_id,
    settlement_decision_id,
    supersedes_event_id,
    profile_id,
    agreement_id,
    milestone_id,
    counterparty_id,
    role,
    category,
    dimension,
    scoring_state,
    outcome,
    primary_provenance_class,
    adjudication_class,
    decision_confidence_band,
    provenance_weight,
    decision_confidence_weight,
    context_similarity,
    stake_units,
    source_type,
    source_id,
    reason_code,
    occurred_at,
    model_version,
    metadata
  )
  select
    decision.object_id,
    null,
    null,
    subject.profile_id,
    agreement.object_id,
    milestone.object_id,
    counterparty.profile_id,
    'committer',
    'service',
    'fulfilment',
    'eligible',
    0.6,
    'independent_third_party',
    'neutral_review_final',
    75,
    1,
    0.75,
    1,
    6,
    'evidence_decision',
    'qa-export-shadow-event',
    'final_completion_fraction',
    now() - interval '2 days',
    'v2-evidence-decision-shadow',
    jsonb_build_object('qa', true)
  from qa_export_objects decision
  cross join qa_export_objects agreement
  cross join qa_export_objects milestone
  cross join qa_export_actors subject
  cross join qa_export_actors counterparty
  where decision.object_name = 'evidence_decision'
    and agreement.object_name = 'agreement'
    and milestone.object_name = 'milestone'
    and subject.actor_role = 'subject'
    and counterparty.actor_role = 'counterparty'
  returning id
)
insert into qa_export_objects select 'shadow_event', id from made;

with made as (
  insert into public.evidence_credibility_calibration_sampling_runs(
    random_floor,
    seed_material,
    seed_commitment,
    source_key,
    created_by
  )
  select
    1,
    repeat('6', 64),
    repeat('7', 64),
    'qa-export-sampling-run',
    administrator.profile_id
  from qa_export_actors administrator
  where administrator.actor_role = 'administrator'
  returning id
)
insert into qa_export_objects select 'sampling_run', id from made;

with made as (
  insert into public.evidence_credibility_calibration_draws(
    sampling_run_id,
    target_type,
    evidence_decision_id,
    settlement_decision_id,
    subject_profile_id,
    counterparty_profile_id,
    original_reviewer_id,
    agreement_id,
    milestone_id,
    model_version,
    role,
    category,
    dimension,
    original_status,
    original_outcome,
    original_confidence_band,
    original_provenance_class,
    original_adjudication_class,
    original_finality_reason,
    original_integrity_finding,
    original_responsiveness_finding,
    original_dispute_conduct_finding,
    provenance_weight,
    decision_confidence_weight,
    context_similarity,
    stake_units,
    decision_finalized_at,
    sampling_stratum,
    inclusion_probability,
    random_unit,
    selected,
    selected_reason,
    snapshot_hash
  )
  select
    sampling_run.object_id,
    'evidence_decision',
    decision.object_id,
    null,
    subject.profile_id,
    counterparty.profile_id,
    original_reviewer.profile_id,
    agreement.object_id,
    milestone.object_id,
    'v2-evidence-decision-shadow',
    'committer',
    'service',
    'fulfilment',
    'eligible',
    0.6,
    75,
    'independent_third_party',
    'neutral_review_final',
    'review_final',
    'not_assessed',
    'on_time',
    'not_assessed',
    1,
    0.75,
    1,
    6,
    now() - interval '2 days',
    'evidence|service|committer|independent_third_party|75|review_final',
    1,
    0.25,
    true,
    'random_selected',
    repeat('8', 64)
  from qa_export_objects sampling_run
  cross join qa_export_objects decision
  cross join qa_export_objects agreement
  cross join qa_export_objects milestone
  cross join qa_export_actors subject
  cross join qa_export_actors counterparty
  cross join qa_export_actors original_reviewer
  where sampling_run.object_name = 'sampling_run'
    and decision.object_name = 'evidence_decision'
    and agreement.object_name = 'agreement'
    and milestone.object_name = 'milestone'
    and subject.actor_role = 'subject'
    and counterparty.actor_role = 'counterparty'
    and original_reviewer.actor_role = 'original_reviewer'
  returning id
)
insert into qa_export_objects select 'draw', id from made;

with made as (
  insert into public.evidence_credibility_calibration_audit_assignments(
    draw_id,
    reviewer_id,
    assigned_by,
    request_key,
    blinding_mode,
    assigned_at,
    expires_at
  )
  select
    draw.object_id,
    audit_reviewer.profile_id,
    administrator.profile_id,
    'qa-export-assignment',
    'procedural_partial',
    now() - interval '1 day',
    now() + interval '13 days'
  from qa_export_objects draw
  cross join qa_export_actors audit_reviewer
  cross join qa_export_actors administrator
  where draw.object_name = 'draw'
    and audit_reviewer.actor_role = 'audit_reviewer'
    and administrator.actor_role = 'administrator'
  returning id
)
insert into qa_export_objects select 'assignment', id from made;

insert into public.evidence_credibility_calibration_assignment_events(
  assignment_id,
  sequence_number,
  event_type,
  actor_id,
  created_at
)
select assignment.object_id, 1, 'assigned', administrator.profile_id, now() - interval '1 day'
from qa_export_objects assignment
cross join qa_export_actors administrator
where assignment.object_name = 'assignment'
  and administrator.actor_role = 'administrator';

with made as (
  insert into public.evidence_credibility_calibration_labels(
    assignment_id,
    request_key,
    final_status,
    final_outcome,
    final_finality_reason,
    final_integrity_finding,
    final_responsiveness_finding,
    final_dispute_conduct_finding,
    materially_upheld,
    absolute_error,
    blinding_complete,
    private_rationale,
    label_hash,
    completed_by,
    completed_at
  )
  select
    assignment.object_id,
    'qa-export-label',
    'eligible',
    0.62,
    'review_final',
    'not_assessed',
    'on_time',
    'not_assessed',
    true,
    0.02,
    true,
    'This private QA rationale must never appear in the export.',
    repeat('9', 64),
    audit_reviewer.profile_id,
    now() - interval '1 hour'
  from qa_export_objects assignment
  cross join qa_export_actors audit_reviewer
  where assignment.object_name = 'assignment'
    and audit_reviewer.actor_role = 'audit_reviewer'
  returning id
)
insert into qa_export_objects select 'label', id from made;

insert into public.evidence_credibility_calibration_assignment_events(
  assignment_id,
  sequence_number,
  event_type,
  actor_id,
  created_at
)
select assignment.object_id, 2, 'completed', audit_reviewer.profile_id, now() - interval '1 hour'
from qa_export_objects assignment
cross join qa_export_actors audit_reviewer
where assignment.object_name = 'assignment'
  and audit_reviewer.actor_role = 'audit_reviewer';

create temporary table qa_export_active_baseline as
select
  (select count(*) from public.credibility_events) as active_events,
  (select count(*) from public.credibility_public_aggregates) as active_aggregates,
  (select count(*) from public.credibility_restrictions) as active_restrictions;

select set_config('request.jwt.claim.sub', '', true);
select set_config('request.jwt.claims', '{"role":"service_role"}', true);

create temporary table qa_export_result as
select public.create_evidence_credibility_calibration_export_v1(
  p_source_key => 'qa-export-core',
  p_source_cutoff_at => now(),
  p_analysis_plan_version => 'qa-analysis-v1',
  p_analysis_plan_hash => repeat('a', 64),
  p_pseudonymization_secret => repeat('b', 64)
) as result;

insert into qa_export_objects
select 'export', (result ->> 'exportId')::uuid
from qa_export_result;

do $test$
declare
  export_row record;
  manifest_row public.evidence_credibility_calibration_exports%rowtype;
  observation_text text;
  expected_rows_digest text;
  expected_manifest_hash text;
  replay jsonb;
  raw_identifier text;
begin
  select row_record.* into export_row
  from public.evidence_credibility_calibration_export_rows row_record
  where row_record.export_id = (
    select object_id from qa_export_objects where object_name = 'export'
  );
  if not found then
    raise exception 'The immutable export did not contain its completed blind-audit label.';
  end if;

  select * into manifest_row
  from public.evidence_credibility_calibration_exports export_record
  where export_record.id = (
    select object_id from qa_export_objects where object_name = 'export'
  );

  if manifest_row.row_count <> 1
     or manifest_row.analysis_plan_hash <> repeat('a', 64)
     or manifest_row.rows_digest !~ '^[0-9a-f]{64}$'
     or manifest_row.manifest_hash !~ '^[0-9a-f]{64}$'
     or manifest_row.pseudonymization_key_commitment !~ '^[0-9a-f]{64}$' then
    raise exception 'The immutable export manifest is malformed.';
  end if;

  if export_row.row_hash <> encode(
       extensions.digest(convert_to(export_row.observation::text, 'UTF8'), 'sha256'),
       'hex'
     ) then
    raise exception 'The observation row hash is not reproducible.';
  end if;

  expected_rows_digest := encode(
    extensions.digest(convert_to(export_row.row_hash, 'UTF8'), 'sha256'),
    'hex'
  );
  if manifest_row.rows_digest <> expected_rows_digest then
    raise exception 'The ordered rows digest is not reproducible.';
  end if;

  expected_manifest_hash := encode(
    extensions.digest(
      convert_to(
        jsonb_build_object(
          'exportSchemaVersion', manifest_row.export_schema_version,
          'analysisPlanVersion', manifest_row.analysis_plan_version,
          'analysisPlanHash', manifest_row.analysis_plan_hash,
          'sourceCutoffAt', manifest_row.source_cutoff_at,
          'pseudonymizationKeyCommitment', manifest_row.pseudonymization_key_commitment,
          'rowCount', manifest_row.row_count,
          'rowsDigest', manifest_row.rows_digest,
          'rawEvidenceIncluded', false,
          'rawIdentityIncluded', false,
          'exactPaymentDataIncluded', false,
          'shadowOnly', true
        )::text,
        'UTF8'
      ),
      'sha256'
    ),
    'hex'
  );
  if manifest_row.manifest_hash <> expected_manifest_hash then
    raise exception 'The export manifest hash is not reproducible.';
  end if;

  if export_row.observation ->> 'originalOutcome' <> '0.6000000000'
     or export_row.observation ->> 'finalOutcome' <> '0.6200000000'
     or export_row.observation ->> 'absoluteError' <> '0.0200000000'
     or export_row.observation ->> 'additionalityStatus' <> 'not_evaluated'
     or export_row.observation ->> 'samplingKind' <> 'random'
     or export_row.observation ->> 'decisionDateUtc' is null
     or export_row.observation ->> 'auditCompletedDateUtc' is null then
    raise exception 'The export did not preserve the required frozen prediction and label fields.';
  end if;

  if export_row.observation ->> 'observationToken' !~ '^[0-9a-f]{64}$'
     or export_row.observation ->> 'agreementGroupToken' !~ '^[0-9a-f]{64}$'
     or export_row.observation ->> 'decisionChainGroupToken' !~ '^[0-9a-f]{64}$'
     or export_row.observation ->> 'subjectGroupToken' !~ '^[0-9a-f]{64}$'
     or export_row.observation ->> 'counterpartyGroupToken' !~ '^[0-9a-f]{64}$'
     or export_row.observation ->> 'participantPairGroupToken' !~ '^[0-9a-f]{64}$'
     or export_row.observation ->> 'originalReviewerGroupToken' !~ '^[0-9a-f]{64}$'
     or export_row.observation ->> 'auditReviewerGroupToken' !~ '^[0-9a-f]{64}$'
     or export_row.observation ->> 'samplingRunGroupToken' !~ '^[0-9a-f]{64}$' then
    raise exception 'The de-identified grouping tokens are malformed.';
  end if;

  if export_row.observation ->> 'subjectGroupToken'
       = export_row.observation ->> 'auditReviewerGroupToken' then
    raise exception 'Domain separation did not distinguish grouping-token domains.';
  end if;

  foreach raw_identifier in array array[
    (select profile_id::text from qa_export_actors where actor_role = 'administrator'),
    (select profile_id::text from qa_export_actors where actor_role = 'subject'),
    (select profile_id::text from qa_export_actors where actor_role = 'counterparty'),
    (select profile_id::text from qa_export_actors where actor_role = 'original_reviewer'),
    (select profile_id::text from qa_export_actors where actor_role = 'audit_reviewer'),
    (select object_id::text from qa_export_objects where object_name = 'agreement'),
    (select object_id::text from qa_export_objects where object_name = 'milestone'),
    (select object_id::text from qa_export_objects where object_name = 'evidence_decision'),
    (select object_id::text from qa_export_objects where object_name = 'sampling_run'),
    (select object_id::text from qa_export_objects where object_name = 'draw'),
    (select object_id::text from qa_export_objects where object_name = 'assignment')
  ] loop
    observation_text := export_row.observation::text;
    if position(raw_identifier in observation_text) > 0 then
      raise exception 'A raw identifier leaked into the de-identified observation.';
    end if;
  end loop;

  if export_row.observation ?| array[
       'profileId', 'agreementId', 'milestoneId', 'evidenceDecisionId',
       'settlementDecisionId', 'assignmentId', 'reviewerId', 'samplingRunId',
       'storagePath', 'evidenceUrl', 'attestation', 'privateRationale',
       'providerAuthenticationRef', 'receiptId', 'amountCents', 'currency',
       'provider', 'stakeUnits'
     ] then
    raise exception 'A forbidden identity, evidence, rationale, payment, or stake field leaked.';
  end if;

  if position('This private QA rationale' in export_row.observation::text) > 0
     or not (export_row.observation ? 'stakeWeight')
     or export_row.observation ? 'stakeUnits' then
    raise exception 'The export privacy projection is inconsistent.';
  end if;

  replay := public.create_evidence_credibility_calibration_export_v1(
    'qa-export-core',
    manifest_row.source_cutoff_at,
    'qa-analysis-v1',
    repeat('a', 64),
    repeat('c', 64)
  );
  if replay ->> 'status' <> 'replayed'
     or (replay ->> 'exportId')::uuid <> manifest_row.id then
    raise exception 'The immutable export request did not replay idempotently.';
  end if;

  begin
    perform public.create_evidence_credibility_calibration_export_v1(
      'qa-export-core',
      manifest_row.source_cutoff_at,
      'qa-analysis-v1',
      repeat('d', 64),
      repeat('c', 64)
    );
    raise exception 'A changed plan hash unexpectedly replaced an immutable export.';
  exception when others then
    if sqlerrm not like 'The immutable calibration-export request differs%' then raise; end if;
  end;

  if (select count(*) from public.credibility_events)
       <> (select active_events from qa_export_active_baseline)
     or (select count(*) from public.credibility_public_aggregates)
       <> (select active_aggregates from qa_export_active_baseline)
     or (select count(*) from public.credibility_restrictions)
       <> (select active_restrictions from qa_export_active_baseline) then
    raise exception 'Calibration export creation changed active credibility or restrictions.';
  end if;

  if not exists (
    select 1 from public.credibility_shadow_controls control
    where control.control_key = 'evidence_decision_v2'
      and control.mode = 'shadow'
      and not control.milestone_cutover_enabled
      and not control.public_effects_enabled
      and not control.ranking_effects_enabled
      and not control.eligibility_effects_enabled
  ) then
    raise exception 'Calibration export creation changed the fail-closed controls.';
  end if;
end;
$test$;

do $test$
declare
  projected_manifest record;
  projected_row record;
  export_id_value uuid := (
    select object_id from qa_export_objects where object_name = 'export'
  );
begin
  select * into projected_manifest
  from public.get_evidence_credibility_calibration_export_manifest_v1(export_id_value);
  if not found
     or projected_manifest.manifest_payload is null
     or encode(
       extensions.digest(
         convert_to(projected_manifest.manifest_payload, 'UTF8'),
         'sha256'
       ),
       'hex'
     ) <> projected_manifest.manifest_hash then
    raise exception 'The downloaded canonical manifest payload is not self-verifying.';
  end if;

  select * into projected_row
  from public.list_evidence_credibility_calibration_export_rows_v1(
    export_id_value, 1000, 0
  );
  if not found
     or projected_row.observation_text is null
     or projected_row.observation_text::jsonb is distinct from projected_row.observation
     or encode(
       extensions.digest(
         convert_to(projected_row.observation_text, 'UTF8'),
         'sha256'
       ),
       'hex'
     ) <> projected_row.row_hash then
    raise exception 'The downloaded canonical observation payload is not self-verifying.';
  end if;
end;
$test$;

rollback;
