-- Random sampling, independent assignment, blinded projection, and label QA.
begin;

create temporary table qa_blind_actors(
  actor_role text primary key,
  profile_id uuid not null unique
) on commit drop;

insert into qa_blind_actors(actor_role, profile_id)
select roles.actor_role, profiles.id
from unnest(array['payer','performer','original_reviewer','audit_reviewer'])
  with ordinality roles(actor_role, position)
join (
  select id, row_number() over(order by id) as position
  from public.profiles
  limit 4
) profiles using(position);

do $test$
begin
  if (select count(*) from qa_blind_actors) <> 4 then
    raise exception 'Blind-audit QA requires four existing QA profiles.';
  end if;
end;
$test$;

create temporary table qa_blind_objects(
  object_name text primary key,
  object_id uuid not null unique
) on commit drop;

with made as (
  insert into public.agreements(
    proposer_id, responder_id, status, lifecycle_status, source, completion_state
  )
  select
    payer.profile_id,
    performer.profile_id,
    'active'::public.agreement_status,
    'active',
    'manual',
    'under_review'
  from qa_blind_actors payer
  cross join qa_blind_actors performer
  where payer.actor_role = 'payer'
    and performer.actor_role = 'performer'
  returning id
)
insert into qa_blind_objects select 'agreement', id from made;

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
    payer.profile_id,
    'Complete ten independently reviewable service units',
    'Settle the externally recorded amount',
    'QA only',
    'Provide a private attestation',
    current_date + 7,
    'Prospective exit only',
    '$100 maximum',
    'Participants and assigned reviewers only',
    'No performance without this agreement',
    repeat('1', 64),
    true,
    null,
    null
  from qa_blind_objects agreement
  cross join qa_blind_actors payer
  where agreement.object_name = 'agreement'
    and payer.actor_role = 'payer'
  returning id
)
insert into qa_blind_objects select 'version', id from made;

update public.agreements
set current_version_id = (
      select object_id from qa_blind_objects where object_name = 'version'
    ),
    evidence_due_at = current_date + 7
where id = (
  select object_id from qa_blind_objects where object_name = 'agreement'
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
    performer.profile_id,
    payer.profile_id,
    'service',
    'Complete ten independently reviewable service units',
    'unit',
    10,
    false,
    10000,
    'USD',
    'Provide a private attestation',
    'terms'
  from qa_blind_objects agreement
  cross join qa_blind_objects version
  cross join qa_blind_actors performer
  cross join qa_blind_actors payer
  where agreement.object_name = 'agreement'
    and version.object_name = 'version'
    and performer.actor_role = 'performer'
    and payer.actor_role = 'payer'
  returning id
)
insert into qa_blind_objects select 'milestone', id from made;

update public.trade_agreement_versions
set milestone_manifest_hash = repeat('2', 64),
    complete_terms_hash = repeat('3', 64)
where id = (
  select object_id from qa_blind_objects where object_name = 'version'
);

with made as (
  insert into public.trade_evidence_bundles(
    milestone_id,
    submitted_by,
    bundle_kind,
    attempt_number,
    status
  )
  select milestone.object_id, performer.profile_id, 'initial', 1, 'draft'
  from qa_blind_objects milestone
  cross join qa_blind_actors performer
  where milestone.object_name = 'milestone'
    and performer.actor_role = 'performer'
  returning id
)
insert into qa_blind_objects select 'bundle', id from made;

insert into public.trade_evidence_bundle_items(
  bundle_id, evidence_type, attestation
)
select bundle.object_id, 'attestation', 'QA-only independent-review evidence'
from qa_blind_objects bundle
where bundle.object_name = 'bundle';

update public.trade_evidence_bundles
set status = 'accepted', submitted_at = now(), reviewed_at = now()
where id = (
  select object_id from qa_blind_objects where object_name = 'bundle'
);

with payout_math as (
  select * from public.trade_milestone_payout_v1(
    10000::bigint, 6::numeric, 10::numeric, 50::smallint
  )
), made as (
  insert into public.trade_milestone_reviews(
    milestone_id,
    bundle_id,
    reviewer_id,
    review_kind,
    outcome,
    completion_units,
    confidence_band,
    payout_basis_points,
    amount_due_cents,
    private_reason,
    appeal_deadline_at,
    is_final,
    finalized_at
  )
  select
    milestone.object_id,
    bundle.object_id,
    reviewer.profile_id,
    'initial',
    'graded',
    6,
    50,
    payout_math.payout_basis_points,
    payout_math.amount_due_cents,
    'QA original review rationale that must stay hidden',
    now() + interval '7 days',
    true,
    now()
  from qa_blind_objects milestone
  cross join qa_blind_objects bundle
  cross join qa_blind_actors reviewer
  cross join payout_math
  where milestone.object_name = 'milestone'
    and bundle.object_name = 'bundle'
    and reviewer.actor_role = 'original_reviewer'
  returning id
)
insert into qa_blind_objects select 'review', id from made;

with made as (
  insert into public.trade_milestone_payouts(
    milestone_id,
    review_id,
    payer_id,
    payee_id,
    maximum_amount_cents,
    completion_units,
    units_total,
    confidence_band,
    payout_basis_points,
    amount_due_cents,
    currency,
    is_final,
    status,
    finalized_at
  )
  select
    milestone.object_id,
    review.object_id,
    payer.profile_id,
    performer.profile_id,
    10000,
    6,
    10,
    50,
    3000,
    3000,
    'USD',
    true,
    'confirmed',
    now()
  from qa_blind_objects milestone
  cross join qa_blind_objects review
  cross join qa_blind_actors payer
  cross join qa_blind_actors performer
  where milestone.object_name = 'milestone'
    and review.object_name = 'review'
    and payer.actor_role = 'payer'
    and performer.actor_role = 'performer'
  returning id
)
insert into qa_blind_objects select 'payout', id from made;

update public.trade_agreement_milestones
set final_review_id = (
      select object_id from qa_blind_objects where object_name = 'review'
    ),
    current_bundle_id = (
      select object_id from qa_blind_objects where object_name = 'bundle'
    ),
    status = 'graded'
where id = (
  select object_id from qa_blind_objects where object_name = 'milestone'
);

create temporary table qa_blind_active_baseline as
select
  (select count(*) from public.credibility_events) as active_events,
  (select count(*) from public.credibility_public_aggregates) as active_aggregates,
  (select count(*) from public.credibility_restrictions) as active_restrictions,
  (select count(*) from public.trade_evidence_decisions) as evidence_decisions,
  (select count(*) from public.trade_settlement_shadow_decisions) as settlement_decisions,
  (select count(*) from public.trade_shadow_capture_records) as capture_records,
  (select count(*) from public.evidence_credibility_calibration_sampling_runs) as sampling_runs,
  (select count(*) from public.evidence_credibility_calibration_draws) as draws,
  (select count(*) from public.evidence_credibility_calibration_audit_assignments) as assignments,
  (select count(*) from public.evidence_credibility_calibration_labels) as labels;

select set_config('request.jwt.claim.sub', '', true);
select set_config('request.jwt.claims', '{"role":"service_role"}', true);

create temporary table qa_blind_evidence_capture as
select public.record_trade_evidence_shadow_capture_v1(
  p_milestone_id => (
    select object_id from qa_blind_objects where object_name = 'milestone'
  ),
  p_review_id => (
    select object_id from qa_blind_objects where object_name = 'review'
  ),
  p_decision_confidence_band => 75::smallint,
  p_primary_provenance_class => 'independent_third_party',
  p_provider_authentication_status => 'not_applicable',
  p_provider_authentication_ref => '',
  p_contradiction_status => 'none',
  p_integrity_finding => 'not_assessed',
  p_responsiveness_finding => 'on_time',
  p_dispute_conduct_finding => 'not_assessed',
  p_finality_reason => 'review_final',
  p_exclusion_reason => '',
  p_private_rationale => 'QA evidence capture rationale',
  p_supersedes_decision_id => null::uuid
) as result;

insert into qa_blind_objects
select 'evidence_decision', (result ->> 'decisionId')::uuid
from qa_blind_evidence_capture;

create temporary table qa_blind_settlement_capture as
select public.record_trade_settlement_shadow_capture_v1(
  p_payout_id => (
    select object_id from qa_blind_objects where object_name = 'payout'
  ),
  p_payment_review_decision_id => null::uuid,
  p_decision_confidence_band => 100::smallint,
  p_primary_provenance_class => 'bilateral_confirmation',
  p_provider_authentication_status => 'not_applicable',
  p_provider_authentication_ref => '',
  p_finality_reason => 'confirmed',
  p_exclusion_reason => '',
  p_private_rationale => 'QA settlement capture rationale',
  p_supersedes_decision_id => null::uuid
) as result;

insert into qa_blind_objects
select 'settlement_decision', (result ->> 'decisionId')::uuid
from qa_blind_settlement_capture;

create temporary table qa_blind_sampling_result as
select public.materialize_evidence_credibility_calibration_draws_v1(
  p_random_floor => 1::numeric,
  p_sampling_seed => repeat('a', 64),
  p_source_key => 'qa-blind-core-run'
) as result;

insert into qa_blind_objects
select 'sampling_run', (result ->> 'samplingRunId')::uuid
from qa_blind_sampling_result;

do $test$
declare
  replay jsonb;
begin
  if (select count(*) from public.evidence_credibility_calibration_draws draw
      where draw.sampling_run_id = (
        select object_id from qa_blind_objects where object_name = 'sampling_run'
      )) <> 2 then
    raise exception 'The sampling run did not record both terminal decisions.';
  end if;

  if exists (
    select 1 from public.evidence_credibility_calibration_draws draw
    where draw.sampling_run_id = (
      select object_id from qa_blind_objects where object_name = 'sampling_run'
    )
      and (
        not draw.selected
        or draw.inclusion_probability <> 1
        or draw.random_unit < 0
        or draw.random_unit >= 1
        or draw.snapshot_hash !~ '^[0-9a-f]{64}$'
      )
  ) then
    raise exception 'The immutable full-inclusion draw is malformed.';
  end if;

  replay := public.materialize_evidence_credibility_calibration_draws_v1(
    1::numeric,
    repeat('a', 64),
    'qa-blind-core-run'
  );
  if replay ->> 'status' <> 'replayed'
     or (replay ->> 'drawCount')::integer <> 2 then
    raise exception 'Sampling replay was not idempotent.';
  end if;

  begin
    perform public.materialize_evidence_credibility_calibration_draws_v1(
      1::numeric,
      repeat('b', 64),
      'qa-blind-core-run'
    );
    raise exception 'A changed seed unexpectedly replaced an immutable sampling run.';
  exception when others then
    if sqlerrm not like 'The immutable sampling run differs%' then raise; end if;
  end;
end;
$test$;

insert into public.trade_review_role_grants(profile_id, role, active, granted_by)
select audit_reviewer.profile_id, 'reviewer', true, payer.profile_id
from qa_blind_actors audit_reviewer
cross join qa_blind_actors payer
where audit_reviewer.actor_role = 'audit_reviewer'
  and payer.actor_role = 'payer'
on conflict(profile_id, role) do update
set active = true, revoked_at = null, granted_by = excluded.granted_by;

create temporary table qa_blind_assignment_results as
select
  draw.id as draw_id,
  public.assign_evidence_credibility_calibration_audit_v1(
    p_draw_id => draw.id,
    p_reviewer_id => (
      select profile_id from qa_blind_actors where actor_role = 'audit_reviewer'
    ),
    p_request_key => 'qa-assignment:' || draw.id::text,
    p_expires_at => now() + interval '14 days'
  ) as result
from public.evidence_credibility_calibration_draws draw
where draw.sampling_run_id = (
  select object_id from qa_blind_objects where object_name = 'sampling_run'
)
order by draw.target_type;

insert into qa_blind_objects
select
  case draw.target_type
    when 'evidence_decision' then 'evidence_assignment'
    else 'settlement_assignment'
  end,
  (assignment.result ->> 'assignmentId')::uuid
from qa_blind_assignment_results assignment
join public.evidence_credibility_calibration_draws draw
  on draw.id = assignment.draw_id;

do $test$
declare
  first_assignment record;
  replay jsonb;
begin
  if (select count(*) from public.evidence_credibility_calibration_audit_assignments assignment
      where assignment.id in (
        select object_id from qa_blind_objects
        where object_name in ('evidence_assignment', 'settlement_assignment')
      )) <> 2 then
    raise exception 'Independent assignments were not recorded.';
  end if;

  select assignment.*, draw.id as draw_id_value
  into first_assignment
  from public.evidence_credibility_calibration_audit_assignments assignment
  join public.evidence_credibility_calibration_draws draw on draw.id = assignment.draw_id
  where assignment.id = (
    select object_id from qa_blind_objects where object_name = 'evidence_assignment'
  );

  replay := public.assign_evidence_credibility_calibration_audit_v1(
    first_assignment.draw_id_value,
    first_assignment.reviewer_id,
    first_assignment.request_key,
    first_assignment.expires_at
  );
  if replay ->> 'status' <> 'replayed'
     or (replay ->> 'assignmentId')::uuid <> first_assignment.id then
    raise exception 'Assignment replay was not idempotent.';
  end if;
end;
$test$;

select set_config(
  'request.jwt.claim.sub',
  (select profile_id::text from qa_blind_actors where actor_role = 'audit_reviewer'),
  true
);
select set_config(
  'request.jwt.claims',
  jsonb_build_object(
    'role', 'authenticated',
    'aal', 'aal2',
    'sub', (select profile_id::text from qa_blind_actors where actor_role = 'audit_reviewer')
  )::text,
  true
);

create temporary table qa_blind_reviewer_projection as
select * from public.list_my_evidence_credibility_calibration_audits_v1(20, 0);

do $test$
begin
  if (select count(*) from qa_blind_reviewer_projection) <> 2 then
    raise exception 'The assigned AAL2 reviewer did not receive both blinded cases.';
  end if;

  if not exists (
    select 1 from qa_blind_reviewer_projection projection
    where projection.target_type = 'evidence_decision'
      and jsonb_array_length(projection.evidence_items) = 1
      and projection.evidence_items #>> '{0,evidenceType}' = 'attestation'
      and projection.payment_receipt = '{}'::jsonb
  ) then
    raise exception 'The blinded evidence packet was not projected correctly.';
  end if;

  if not exists (
    select 1 from qa_blind_reviewer_projection projection
    where projection.target_type = 'settlement_decision'
      and projection.evidence_items = '[]'::jsonb
  ) then
    raise exception 'The blinded settlement case was not projected correctly.';
  end if;
end;
$test$;

create temporary table qa_blind_evidence_label as
select public.record_evidence_credibility_calibration_label_v1(
  p_assignment_id => (
    select object_id from qa_blind_objects where object_name = 'evidence_assignment'
  ),
  p_request_key => 'qa-evidence-label',
  p_final_status => 'eligible',
  p_final_outcome => 0.62::numeric,
  p_final_finality_reason => 'review_final',
  p_final_integrity_finding => 'not_assessed',
  p_final_responsiveness_finding => 'on_time',
  p_final_dispute_conduct_finding => 'not_assessed',
  p_blinding_complete => true,
  p_private_rationale => 'Independent QA evidence review'
) as result;

create temporary table qa_blind_settlement_label as
select public.record_evidence_credibility_calibration_label_v1(
  p_assignment_id => (
    select object_id from qa_blind_objects where object_name = 'settlement_assignment'
  ),
  p_request_key => 'qa-settlement-label',
  p_final_status => 'eligible',
  p_final_outcome => 1::numeric,
  p_final_finality_reason => 'confirmed',
  p_final_integrity_finding => 'not_applicable',
  p_final_responsiveness_finding => 'not_applicable',
  p_final_dispute_conduct_finding => 'not_applicable',
  p_blinding_complete => true,
  p_private_rationale => 'Independent QA settlement review'
) as result;

do $test$
declare
  replay jsonb;
begin
  if not exists (
    select 1
    from public.evidence_credibility_calibration_labels label
    where label.assignment_id = (
      select object_id from qa_blind_objects where object_name = 'evidence_assignment'
    )
      and label.materially_upheld
      and abs(label.absolute_error - 0.02) < 0.000000001
      and label.completed_by = (
        select profile_id from qa_blind_actors where actor_role = 'audit_reviewer'
      )
  ) then
    raise exception 'The evidence label did not preserve continuous error or material uphold.';
  end if;

  if not exists (
    select 1
    from public.evidence_credibility_calibration_labels label
    where label.assignment_id = (
      select object_id from qa_blind_objects where object_name = 'settlement_assignment'
    )
      and label.materially_upheld
      and label.absolute_error = 0
  ) then
    raise exception 'The settlement label was not recorded correctly.';
  end if;

  replay := public.record_evidence_credibility_calibration_label_v1(
    p_assignment_id => (
      select object_id from qa_blind_objects where object_name = 'evidence_assignment'
    ),
    p_request_key => 'qa-evidence-label',
    p_final_status => 'eligible',
    p_final_outcome => 0.62::numeric,
    p_final_finality_reason => 'review_final',
    p_final_integrity_finding => 'not_assessed',
    p_final_responsiveness_finding => 'on_time',
    p_final_dispute_conduct_finding => 'not_assessed',
    p_blinding_complete => true,
    p_private_rationale => 'Independent QA evidence review'
  );
  if replay ->> 'status' <> 'replayed' then
    raise exception 'Independent label replay was not idempotent.';
  end if;

  if exists (
    select 1 from public.list_my_evidence_credibility_calibration_audits_v1(20, 0)
  ) then
    raise exception 'Completed assignments remained in the reviewer queue.';
  end if;

  if not exists (
    select 1 from public.trade_evidence_decisions decision_record
    where decision_record.id = (
      select object_id from qa_blind_objects where object_name = 'evidence_decision'
    )
      and decision_record.completion_fraction = 0.6
      and decision_record.decision_confidence_band = 75
  ) then
    raise exception 'The independent label mutated the participant evidence decision.';
  end if;

  if not exists (
    select 1 from public.trade_settlement_shadow_decisions decision_record
    where decision_record.id = (
      select object_id from qa_blind_objects where object_name = 'settlement_decision'
    )
      and decision_record.outcome = 1
      and decision_record.decision_confidence_band = 100
  ) then
    raise exception 'The independent label mutated the participant settlement decision.';
  end if;

  if (select count(*) from public.credibility_events)
       <> (select active_events from qa_blind_active_baseline)
     or (select count(*) from public.credibility_public_aggregates)
       <> (select active_aggregates from qa_blind_active_baseline)
     or (select count(*) from public.credibility_restrictions)
       <> (select active_restrictions from qa_blind_active_baseline) then
    raise exception 'Blind calibration QA changed active credibility or restrictions.';
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
    raise exception 'Blind calibration QA changed the fail-closed controls.';
  end if;
end;
$test$;

rollback;
