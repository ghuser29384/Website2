-- Private capture queue, replay, supersession, and active-isolation QA.
begin;

create temporary table qa_capture_actors (
  actor_role text primary key,
  profile_id uuid not null unique
) on commit drop;

insert into qa_capture_actors(actor_role, profile_id)
select roles.actor_role, profiles.id
from unnest(array['payer','performer','reviewer','appeal_reviewer'])
  with ordinality roles(actor_role, position)
join (
  select id, row_number() over(order by id) as position
  from public.profiles
  limit 4
) profiles using(position);

do $test$
begin
  if (select count(*) from qa_capture_actors) <> 4 then
    raise exception 'Capture QA requires four existing QA profiles.';
  end if;
end;
$test$;

create temporary table qa_capture_objects (
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
  from qa_capture_actors payer
  cross join qa_capture_actors performer
  where payer.actor_role = 'payer'
    and performer.actor_role = 'performer'
  returning id
)
insert into qa_capture_objects
select 'agreement', id from made;

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
    'Perform ten reviewed units',
    'Settle the final external amount',
    'QA only',
    'Provide one private attestation',
    current_date + 7,
    'Prospective exit only',
    '$100 maximum',
    'Participants and assigned reviewers only',
    'No performance without this agreement',
    repeat('1', 64),
    true,
    null,
    null
  from qa_capture_objects agreement
  cross join qa_capture_actors payer
  where agreement.object_name = 'agreement'
    and payer.actor_role = 'payer'
  returning id
)
insert into qa_capture_objects
select 'version', id from made;

update public.agreements
set current_version_id = (
      select object_id from qa_capture_objects where object_name = 'version'
    ),
    evidence_due_at = current_date + 7
where id = (
  select object_id from qa_capture_objects where object_name = 'agreement'
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
    'Complete ten reviewed units',
    'unit',
    10,
    false,
    10000,
    'USD',
    'Provide one private attestation',
    'terms'
  from qa_capture_objects agreement
  cross join qa_capture_objects version
  cross join qa_capture_actors performer
  cross join qa_capture_actors payer
  where agreement.object_name = 'agreement'
    and version.object_name = 'version'
    and performer.actor_role = 'performer'
    and payer.actor_role = 'payer'
  returning id
)
insert into qa_capture_objects
select 'milestone', id from made;

update public.trade_agreement_versions
set milestone_manifest_hash = repeat('2', 64),
    complete_terms_hash = repeat('3', 64)
where id = (
  select object_id from qa_capture_objects where object_name = 'version'
);

with made as (
  insert into public.trade_evidence_bundles(
    milestone_id,
    submitted_by,
    bundle_kind,
    attempt_number,
    status,
    submitted_at,
    reviewed_at
  )
  select
    milestone.object_id,
    performer.profile_id,
    'initial',
    1,
    'draft',
    null,
    null
  from qa_capture_objects milestone
  cross join qa_capture_actors performer
  where milestone.object_name = 'milestone'
    and performer.actor_role = 'performer'
  returning id
)
insert into qa_capture_objects
select 'bundle', id from made;

insert into public.trade_evidence_bundle_items(
  bundle_id, evidence_type, attestation
)
select bundle.object_id, 'attestation', 'QA-only private evidence'
from qa_capture_objects bundle
where bundle.object_name = 'bundle';

update public.trade_evidence_bundles
set status = 'accepted',
    submitted_at = now(),
    reviewed_at = now()
where id = (
  select object_id from qa_capture_objects where object_name = 'bundle'
);

with payout_math as (
  select *
  from public.trade_milestone_payout_v1(
    10000::bigint,
    6::numeric,
    10::numeric,
    50::smallint
  )
),
made as (
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
    'QA initial final review',
    now() + interval '7 days',
    true,
    now()
  from qa_capture_objects milestone
  cross join qa_capture_objects bundle
  cross join qa_capture_actors reviewer
  cross join payout_math
  where milestone.object_name = 'milestone'
    and bundle.object_name = 'bundle'
    and reviewer.actor_role = 'reviewer'
  returning id
)
insert into qa_capture_objects
select 'initial_review', id from made;

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
  from qa_capture_objects milestone
  cross join qa_capture_objects review
  cross join qa_capture_actors payer
  cross join qa_capture_actors performer
  where milestone.object_name = 'milestone'
    and review.object_name = 'initial_review'
    and payer.actor_role = 'payer'
    and performer.actor_role = 'performer'
  returning id
)
insert into qa_capture_objects
select 'payout', id from made;

update public.trade_agreement_milestones
set final_review_id = (
      select object_id from qa_capture_objects where object_name = 'initial_review'
    ),
    current_bundle_id = (
      select object_id from qa_capture_objects where object_name = 'bundle'
    ),
    status = 'graded'
where id = (
  select object_id from qa_capture_objects where object_name = 'milestone'
);

select set_config('request.jwt.claim.sub', '', true);
select set_config('request.jwt.claims', '{"role":"service_role"}', true);

create temporary table qa_capture_baseline as
select
  (select count(*) from public.credibility_events) as active_events,
  (select count(*) from public.credibility_public_aggregates) as active_aggregates,
  (select count(*) from public.credibility_restrictions) as active_restrictions,
  (select count(*) from public.trade_shadow_capture_records) as capture_records;

do $test$
declare
  evidence_row record;
  settlement_row record;
begin
  select * into evidence_row
  from public.list_trade_evidence_shadow_capture_queue_v1(20, 0)
  where milestone_id = (
    select object_id from qa_capture_objects where object_name = 'milestone'
  );

  if evidence_row.milestone_id is null
     or evidence_row.evidence_item_count <> 1
     or (evidence_row.evidence_type_counts ->> 'attestation')::integer <> 1
     or evidence_row.derived_adjudication_class <> 'neutral_review_final'
     or evidence_row.suggested_finality_reason <> 'review_final'
     or evidence_row.requires_supersession then
    raise exception 'The terminal evidence outcome was not projected correctly.';
  end if;

  select * into settlement_row
  from public.list_trade_settlement_shadow_capture_queue_v1(20, 0)
  where payout_id = (
    select object_id from qa_capture_objects where object_name = 'payout'
  );

  if settlement_row.payout_id is null
     or settlement_row.derived_adjudication_class <> 'bilateral_confirmed'
     or settlement_row.suggested_finality_reason <> 'confirmed'
     or settlement_row.requires_supersession then
    raise exception 'The final settlement outcome was not projected correctly.';
  end if;
end;
$test$;

create temporary table qa_evidence_capture_result as
select public.record_trade_evidence_shadow_capture_v1(
  p_milestone_id => (
    select object_id from qa_capture_objects where object_name = 'milestone'
  ),
  p_review_id => (
    select object_id from qa_capture_objects where object_name = 'initial_review'
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
  p_private_rationale => 'QA private evidence-capture rationale',
  p_supersedes_decision_id => null::uuid
) as result;

insert into qa_capture_objects
select 'initial_decision', (result ->> 'decisionId')::uuid
from qa_evidence_capture_result;
insert into qa_capture_objects
select 'initial_capture', (result ->> 'captureId')::uuid
from qa_evidence_capture_result;

create temporary table qa_settlement_capture_result as
select public.record_trade_settlement_shadow_capture_v1(
  p_payout_id => (
    select object_id from qa_capture_objects where object_name = 'payout'
  ),
  p_payment_review_decision_id => null::uuid,
  p_decision_confidence_band => 100::smallint,
  p_primary_provenance_class => 'bilateral_confirmation',
  p_provider_authentication_status => 'not_applicable',
  p_provider_authentication_ref => '',
  p_finality_reason => 'confirmed',
  p_exclusion_reason => '',
  p_private_rationale => 'QA private settlement-capture rationale',
  p_supersedes_decision_id => null::uuid
) as result;

insert into qa_capture_objects
select 'settlement_decision', (result ->> 'decisionId')::uuid
from qa_settlement_capture_result;
insert into qa_capture_objects
select 'settlement_capture', (result ->> 'captureId')::uuid
from qa_settlement_capture_result;

do $test$
declare
  evidence_replay jsonb;
  settlement_replay jsonb;
begin
  if exists (
    select 1
    from public.list_trade_evidence_shadow_capture_queue_v1(20, 0)
    where milestone_id = (
      select object_id from qa_capture_objects where object_name = 'milestone'
    )
  ) then
    raise exception 'Captured evidence outcome remained in the missing-decision queue.';
  end if;

  if exists (
    select 1
    from public.list_trade_settlement_shadow_capture_queue_v1(20, 0)
    where payout_id = (
      select object_id from qa_capture_objects where object_name = 'payout'
    )
  ) then
    raise exception 'Captured settlement outcome remained in the missing-decision queue.';
  end if;

  evidence_replay := public.record_trade_evidence_shadow_capture_v1(
    p_milestone_id => (
      select object_id from qa_capture_objects where object_name = 'milestone'
    ),
    p_review_id => (
      select object_id from qa_capture_objects where object_name = 'initial_review'
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
    p_private_rationale => 'QA private evidence-capture rationale',
    p_supersedes_decision_id => null::uuid
  );

  settlement_replay := public.record_trade_settlement_shadow_capture_v1(
    p_payout_id => (
      select object_id from qa_capture_objects where object_name = 'payout'
    ),
    p_payment_review_decision_id => null::uuid,
    p_decision_confidence_band => 100::smallint,
    p_primary_provenance_class => 'bilateral_confirmation',
    p_provider_authentication_status => 'not_applicable',
    p_provider_authentication_ref => '',
    p_finality_reason => 'confirmed',
    p_exclusion_reason => '',
    p_private_rationale => 'QA private settlement-capture rationale',
    p_supersedes_decision_id => null::uuid
  );

  if (evidence_replay ->> 'decisionId')::uuid <> (
       select object_id from qa_capture_objects where object_name = 'initial_decision'
     )
     or (evidence_replay ->> 'captureId')::uuid <> (
       select object_id from qa_capture_objects where object_name = 'initial_capture'
     )
     or (settlement_replay ->> 'decisionId')::uuid <> (
       select object_id from qa_capture_objects where object_name = 'settlement_decision'
     )
     or (settlement_replay ->> 'captureId')::uuid <> (
       select object_id from qa_capture_objects where object_name = 'settlement_capture'
     ) then
    raise exception 'Identical capture replay was not idempotent.';
  end if;

  begin
    perform public.record_trade_evidence_shadow_capture_v1(
      p_milestone_id => (
        select object_id from qa_capture_objects where object_name = 'milestone'
      ),
      p_review_id => (
        select object_id from qa_capture_objects where object_name = 'initial_review'
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
      p_private_rationale => 'Different rationale must not replace immutable history',
      p_supersedes_decision_id => null::uuid
    );
    raise exception 'A different rationale unexpectedly replaced immutable capture history.';
  exception
    when others then
      if sqlerrm not like 'The immutable private rationale for this capture differs%' then
        raise;
      end if;
  end;
end;
$test$;

-- A changed final appeal result must surface with explicit supersession.
update public.trade_agreement_milestones
set status = 'under_review'
where id = (
  select object_id from qa_capture_objects where object_name = 'milestone'
);

with payout_math as (
  select *
  from public.trade_milestone_payout_v1(
    10000::bigint,
    8::numeric,
    10::numeric,
    75::smallint
  )
),
made as (
  insert into public.trade_milestone_reviews(
    milestone_id,
    bundle_id,
    reviewer_id,
    review_kind,
    base_review_id,
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
    appeal_reviewer.profile_id,
    'appeal',
    base_review.object_id,
    'graded',
    8,
    75,
    payout_math.payout_basis_points,
    payout_math.amount_due_cents,
    'QA final appeal review',
    now() + interval '7 days',
    true,
    now() + interval '1 minute'
  from qa_capture_objects milestone
  cross join qa_capture_objects bundle
  cross join qa_capture_objects base_review
  cross join qa_capture_actors appeal_reviewer
  cross join payout_math
  where milestone.object_name = 'milestone'
    and bundle.object_name = 'bundle'
    and base_review.object_name = 'initial_review'
    and appeal_reviewer.actor_role = 'appeal_reviewer'
  returning id
)
insert into qa_capture_objects
select 'appeal_review', id from made;

update public.trade_milestone_payouts
set review_id = (
      select object_id from qa_capture_objects where object_name = 'appeal_review'
    ),
    completion_units = 8,
    confidence_band = 75,
    payout_basis_points = 6000,
    amount_due_cents = 6000,
    status = 'due',
    updated_at = now()
where id = (
  select object_id from qa_capture_objects where object_name = 'payout'
);

update public.trade_agreement_milestones
set final_review_id = (
      select object_id from qa_capture_objects where object_name = 'appeal_review'
    ),
    status = 'graded'
where id = (
  select object_id from qa_capture_objects where object_name = 'milestone'
);

do $test$
declare
  queue_row record;
begin
  select * into queue_row
  from public.list_trade_evidence_shadow_capture_queue_v1(20, 0)
  where milestone_id = (
    select object_id from qa_capture_objects where object_name = 'milestone'
  );

  if queue_row.milestone_id is null
     or not queue_row.requires_supersession
     or queue_row.current_decision_id <> (
       select object_id from qa_capture_objects where object_name = 'initial_decision'
     )
     or queue_row.derived_adjudication_class <> 'appeal_review_final'
     or queue_row.suggested_finality_reason <> 'appeal_overturned' then
    raise exception 'The changed final appeal was not projected as explicit supersession.';
  end if;
end;
$test$;

create temporary table qa_appeal_capture_result as
select public.record_trade_evidence_shadow_capture_v1(
  p_milestone_id => (
    select object_id from qa_capture_objects where object_name = 'milestone'
  ),
  p_review_id => (
    select object_id from qa_capture_objects where object_name = 'appeal_review'
  ),
  p_decision_confidence_band => 100::smallint,
  p_primary_provenance_class => 'independent_third_party',
  p_provider_authentication_status => 'not_applicable',
  p_provider_authentication_ref => '',
  p_contradiction_status => 'none',
  p_integrity_finding => 'not_assessed',
  p_responsiveness_finding => 'on_time',
  p_dispute_conduct_finding => 'cooperative',
  p_finality_reason => 'appeal_overturned',
  p_exclusion_reason => '',
  p_private_rationale => 'QA private appeal-capture rationale',
  p_supersedes_decision_id => (
    select object_id from qa_capture_objects where object_name = 'initial_decision'
  )
) as result;

insert into qa_capture_objects
select 'appeal_decision', (result ->> 'decisionId')::uuid
from qa_appeal_capture_result;

do $test$
begin
  if not exists (
    select 1
    from public.credibility_shadow_events current_event
    where current_event.evidence_decision_id = (
      select object_id from qa_capture_objects where object_name = 'appeal_decision'
    )
      and current_event.dimension = 'fulfilment'
      and current_event.outcome = 0.8
      and exists (
        select 1
        from public.credibility_shadow_events old_event
        where old_event.id = current_event.supersedes_event_id
          and old_event.evidence_decision_id = (
            select object_id from qa_capture_objects where object_name = 'initial_decision'
          )
          and old_event.outcome = 0.6
      )
  ) then
    raise exception 'Appeal capture did not supersede the prior fulfilment event.';
  end if;

  if exists (
    select 1
    from public.credibility_shadow_events old_event
    where old_event.evidence_decision_id = (
      select object_id from qa_capture_objects where object_name = 'initial_decision'
    )
      and old_event.dimension = 'fulfilment'
      and not exists (
        select 1
        from public.credibility_shadow_events successor
        where successor.supersedes_event_id = old_event.id
      )
  ) then
    raise exception 'The superseded fulfilment event remained terminal.';
  end if;

  if (select count(*) from public.trade_shadow_capture_records)
     <> (select capture_records from qa_capture_baseline) + 3 then
    raise exception 'Capture record count does not match evidence, settlement, and appeal captures.';
  end if;

  if not exists (
    select 1
    from public.credibility_shadow_controls
    where control_key = 'evidence_decision_v2'
      and mode = 'shadow'
      and not milestone_cutover_enabled
      and not public_effects_enabled
      and not ranking_effects_enabled
      and not eligibility_effects_enabled
  ) then
    raise exception 'Capture QA changed the fail-closed control state.';
  end if;

  if (select count(*) from public.credibility_events)
       <> (select active_events from qa_capture_baseline)
     or (select count(*) from public.credibility_public_aggregates)
       <> (select active_aggregates from qa_capture_baseline)
     or (select count(*) from public.credibility_restrictions)
       <> (select active_restrictions from qa_capture_baseline) then
    raise exception 'Private capture mutated active credibility or restrictions.';
  end if;
end;
$test$;

rollback;
