-- Evidence-decision finality, supersession, appeal, and settlement shadow QA.
-- Executes only in a transaction and rolls back every fixture.

begin;

create temporary table qa_shadow_b_actors (
  actor_role text primary key,
  profile_id uuid not null unique
) on commit drop;

insert into qa_shadow_b_actors(actor_role, profile_id)
select roles.actor_role, profiles.id
from unnest(array[
  'payer', 'performer', 'reviewer', 'appeal_reviewer', 'other'
]) with ordinality as roles(actor_role, position)
join (
  select id, row_number() over (order by id) as position
  from public.profiles
  limit 5
) profiles using (position);

do $test$
begin
  if (select count(*) from qa_shadow_b_actors) <> 5 then
    raise exception 'Shadow finality QA requires five existing QA profiles.';
  end if;
end;
$test$;

create temporary table qa_shadow_b_objects (
  object_name text primary key,
  object_id uuid not null unique
) on commit drop;

with created as (
  insert into public.agreements(
    proposer_id, responder_id, status, lifecycle_status, source, completion_state
  )
  select payer.profile_id, performer.profile_id,
    'active'::public.agreement_status, 'active', 'manual', 'under_review'
  from qa_shadow_b_actors payer
  cross join qa_shadow_b_actors performer
  where payer.actor_role = 'payer'
    and performer.actor_role = 'performer'
  returning id
)
insert into qa_shadow_b_objects
select 'agreement', id from created;

with created as (
  insert into public.trade_agreement_versions(
    agreement_id, version, proposed_by, proposed_action, requested_action,
    duration, evidence_rule, exit_conditions, maximum_burden, privacy_scope,
    no_trade_baseline, terms_hash, requires_milestone_manifest,
    milestone_manifest_hash, complete_terms_hash
  )
  select agreement.object_id, 1, payer.profile_id,
    'Perform finality QA milestones', 'Settle finality QA milestones',
    'QA only', 'Private evidence', 'Prospective exit', '$100 maximum',
    'Participants and reviewers only', 'No trade', repeat('1', 64),
    true, null, null
  from qa_shadow_b_objects agreement
  cross join qa_shadow_b_actors payer
  where agreement.object_name = 'agreement'
    and payer.actor_role = 'payer'
  returning id
)
insert into qa_shadow_b_objects
select 'version', id from created;

update public.agreements
set current_version_id = (
  select object_id from qa_shadow_b_objects where object_name = 'version'
)
where id = (
  select object_id from qa_shadow_b_objects where object_name = 'agreement'
);

create or replace function pg_temp.make_shadow_b_milestone(
  p_object_name text,
  p_position integer,
  p_units_total numeric default 1,
  p_maximum_amount_cents bigint default 10000,
  p_action_category text default 'service'
)
returns uuid
language plpgsql
as $function$
declare
  milestone_id_value uuid;
begin
  insert into public.trade_agreement_milestones(
    agreement_id, agreement_version_id, position, performer_id, payer_id,
    action_category, description, unit_label, units_total, indivisible,
    maximum_amount_cents, currency, evidence_rule, status
  ) values (
    (select object_id from qa_shadow_b_objects where object_name = 'agreement'),
    (select object_id from qa_shadow_b_objects where object_name = 'version'),
    p_position,
    (select profile_id from qa_shadow_b_actors where actor_role = 'performer'),
    (select profile_id from qa_shadow_b_actors where actor_role = 'payer'),
    p_action_category,
    p_object_name,
    'unit',
    p_units_total,
    false,
    p_maximum_amount_cents,
    'USD',
    'Private finality QA evidence',
    'terms'
  ) returning id into milestone_id_value;

  insert into qa_shadow_b_objects(object_name, object_id)
  values (p_object_name, milestone_id_value);
  return milestone_id_value;
end;
$function$;

select pg_temp.make_shadow_b_milestone('abandonment_milestone', 1);
select pg_temp.make_shadow_b_milestone('exit_milestone', 2);
select pg_temp.make_shadow_b_milestone('unresolved_milestone', 3);
select pg_temp.make_shadow_b_milestone('replacement_expired_milestone', 4);
select pg_temp.make_shadow_b_milestone('late_cure_milestone', 5);
select pg_temp.make_shadow_b_milestone('terminal_rejection_milestone', 6);
select pg_temp.make_shadow_b_milestone('appeal_affirm_milestone', 7, 10);
select pg_temp.make_shadow_b_milestone('appeal_overturn_milestone', 8);
select pg_temp.make_shadow_b_milestone('settlement_milestone', 9);
select pg_temp.make_shadow_b_milestone('not_due_milestone', 10, 1, 0);
select pg_temp.make_shadow_b_milestone('payment_unresolved_milestone', 11);

update public.trade_agreement_versions
set milestone_manifest_hash = repeat('2', 64),
    complete_terms_hash = repeat('3', 64)
where id = (
  select object_id from qa_shadow_b_objects where object_name = 'version'
);

create or replace function pg_temp.attach_shadow_b_review(
  p_milestone_name text,
  p_review_object_name text,
  p_completion_units numeric,
  p_payout_factor smallint,
  p_review_outcome text default 'graded',
  p_review_kind text default 'initial',
  p_base_review_id uuid default null,
  p_reviewer_role text default 'reviewer'
)
returns uuid
language plpgsql
as $function$
declare
  milestone_id_value uuid := (
    select object_id from qa_shadow_b_objects where object_name = p_milestone_name
  );
  reviewer_id_value uuid := (
    select profile_id from qa_shadow_b_actors where actor_role = p_reviewer_role
  );
  performer_id_value uuid := (
    select profile_id from qa_shadow_b_actors where actor_role = 'performer'
  );
  payer_id_value uuid := (
    select profile_id from qa_shadow_b_actors where actor_role = 'payer'
  );
  bundle_id_value uuid;
  review_id_value uuid;
  payout_id_value uuid;
  units_total_value numeric;
  maximum_amount_value bigint;
  confidence_value smallint;
  completion_value numeric;
  payout_basis integer;
  amount_due bigint;
  bundle_kind_value text;
  attempt_value smallint;
begin
  select units_total, maximum_amount_cents
  into units_total_value, maximum_amount_value
  from public.trade_agreement_milestones
  where id = milestone_id_value;

  completion_value := case when p_review_outcome = 'rejected' then 0 else p_completion_units end;
  confidence_value := case when p_review_outcome = 'rejected' then 0::smallint else p_payout_factor end;
  bundle_kind_value := case when p_review_kind = 'replacement' then 'replacement' else 'initial' end;
  attempt_value := case when bundle_kind_value = 'replacement' then 2 else 1 end;

  select id into bundle_id_value
  from public.trade_evidence_bundles
  where milestone_id = milestone_id_value
    and bundle_kind = bundle_kind_value
  order by attempt_number
  limit 1;

  if bundle_id_value is null then
    insert into public.trade_evidence_bundles(
      milestone_id, submitted_by, bundle_kind, attempt_number,
      status, submitted_at, reviewed_at
    ) values (
      milestone_id_value, performer_id_value, bundle_kind_value, attempt_value,
      'accepted', now(), now()
    ) returning id into bundle_id_value;
  end if;

  select result.payout_basis_points, result.amount_due_cents
  into payout_basis, amount_due
  from public.trade_milestone_payout_v1(
    maximum_amount_value,
    completion_value,
    units_total_value,
    confidence_value
  ) result;

  insert into public.trade_milestone_reviews(
    milestone_id, bundle_id, reviewer_id, review_kind, base_review_id,
    outcome, completion_units, confidence_band, payout_basis_points,
    amount_due_cents, private_reason, appeal_deadline_at, is_final, finalized_at
  ) values (
    milestone_id_value, bundle_id_value, reviewer_id_value, p_review_kind,
    p_base_review_id, p_review_outcome, completion_value, confidence_value,
    payout_basis, amount_due, 'Finality QA review: ' || p_review_object_name,
    now() + interval '7 days', true, now()
  ) returning id into review_id_value;

  select id into payout_id_value
  from public.trade_milestone_payouts
  where milestone_id = milestone_id_value;

  if payout_id_value is null then
    insert into public.trade_milestone_payouts(
      milestone_id, review_id, payer_id, payee_id, maximum_amount_cents,
      completion_units, units_total, confidence_band, payout_basis_points,
      amount_due_cents, currency, is_final, status, finalized_at
    ) values (
      milestone_id_value, review_id_value, payer_id_value, performer_id_value,
      maximum_amount_value, completion_value, units_total_value, confidence_value,
      payout_basis, amount_due, 'USD', true,
      case when amount_due = 0 then 'not_due' else 'due' end,
      now()
    ) returning id into payout_id_value;
  else
    update public.trade_milestone_payouts
    set review_id = review_id_value,
        completion_units = completion_value,
        units_total = units_total_value,
        confidence_band = confidence_value,
        payout_basis_points = payout_basis,
        amount_due_cents = amount_due,
        is_final = true,
        status = case when amount_due = 0 then 'not_due' else 'due' end,
        finalized_at = now(),
        updated_at = now()
    where id = payout_id_value;
  end if;

  update public.trade_agreement_milestones
  set final_review_id = review_id_value,
      status = 'graded'
  where id = milestone_id_value;

  insert into qa_shadow_b_objects(object_name, object_id)
  values (p_review_object_name, review_id_value);

  if not exists (
    select 1 from qa_shadow_b_objects where object_name = p_milestone_name || '_payout'
  ) then
    insert into qa_shadow_b_objects(object_name, object_id)
    values (p_milestone_name || '_payout', payout_id_value);
  end if;

  return review_id_value;
end;
$function$;

-- Attach ordinary final reviews needed before the shadow decisions are recorded.
select pg_temp.attach_shadow_b_review(
  'terminal_rejection_milestone', 'terminal_rejection_review',
  0, 0::smallint, 'rejected'
);
select pg_temp.attach_shadow_b_review(
  'appeal_affirm_milestone', 'appeal_affirm_base_review',
  5, 75::smallint, 'graded'
);
select pg_temp.attach_shadow_b_review(
  'appeal_overturn_milestone', 'appeal_overturn_base_review',
  0, 0::smallint, 'rejected'
);
select pg_temp.attach_shadow_b_review(
  'settlement_milestone', 'settlement_review',
  1, 100::smallint, 'graded'
);
select pg_temp.attach_shadow_b_review(
  'not_due_milestone', 'not_due_review',
  1, 100::smallint, 'graded'
);
select pg_temp.attach_shadow_b_review(
  'payment_unresolved_milestone', 'payment_unresolved_review',
  1, 100::smallint, 'graded'
);

select set_config('request.jwt.claim.sub', '', true);
select set_config('request.jwt.claims', '{"role":"service_role"}', true);

create temporary table qa_shadow_b_baseline as
select
  (select count(*) from public.credibility_events) as active_events,
  (select count(*) from public.credibility_public_aggregates) as active_aggregates,
  (select count(*) from public.credibility_restrictions) as active_restrictions;

create or replace function pg_temp.record_no_review_decision(
  p_milestone_name text,
  p_decision_name text,
  p_confidence smallint,
  p_adjudication text,
  p_responsiveness text,
  p_finality text,
  p_exclusion_reason text default ''
)
returns uuid
language plpgsql
as $function$
declare
  result_value jsonb;
  decision_id_value uuid;
begin
  result_value := public.record_trade_evidence_decision_v1(
    p_milestone_id => (
      select object_id from qa_shadow_b_objects where object_name = p_milestone_name
    ),
    p_review_id => null::uuid,
    p_decision_confidence_band => p_confidence,
    p_primary_provenance_class => 'platform_observed'::text,
    p_provider_authentication_status => 'not_applicable'::text,
    p_provider_authentication_ref => ''::text,
    p_adjudication_class => p_adjudication,
    p_contradiction_status => 'not_assessed'::text,
    p_integrity_finding => 'not_assessed'::text,
    p_responsiveness_finding => p_responsiveness,
    p_dispute_conduct_finding => 'not_assessed'::text,
    p_finality_reason => p_finality,
    p_exclusion_reason => p_exclusion_reason,
    p_supersedes_decision_id => null::uuid
  );
  decision_id_value := (result_value ->> 'decisionId')::uuid;
  insert into qa_shadow_b_objects(object_name, object_id)
  values (p_decision_name, decision_id_value);
  return decision_id_value;
end;
$function$;

select pg_temp.record_no_review_decision(
  'abandonment_milestone', 'abandonment_decision', 100::smallint,
  'platform_established', 'missed_deadline', 'unjustified_abandonment'
);
select pg_temp.record_no_review_decision(
  'exit_milestone', 'exit_decision', 100::smallint,
  'platform_established', 'excused', 'permissible_exit',
  'Participant exercised the frozen permissible exit.'
);
select pg_temp.record_no_review_decision(
  'unresolved_milestone', 'unresolved_decision', 100::smallint,
  'unreviewed', 'not_assessed', 'unresolved_dispute',
  'The factual dispute remains unresolved.'
);
select pg_temp.record_no_review_decision(
  'replacement_expired_milestone', 'replacement_expired_decision', 100::smallint,
  'platform_established', 'missed_deadline', 'replacement_expired'
);
select pg_temp.record_no_review_decision(
  'late_cure_milestone', 'late_cure_failure_decision', 100::smallint,
  'platform_established', 'missed_deadline', 'unjustified_abandonment'
);

do $test$
begin
  if not exists (
    select 1 from public.credibility_shadow_events
    where evidence_decision_id = (
      select object_id from qa_shadow_b_objects where object_name = 'abandonment_decision'
    ) and dimension = 'fulfilment' and scoring_state = 'eligible' and outcome = 0
  ) then
    raise exception 'Unjustified abandonment was not a scored zero fulfilment outcome.';
  end if;
  if not exists (
    select 1 from public.credibility_shadow_events
    where evidence_decision_id = (
      select object_id from qa_shadow_b_objects where object_name = 'exit_decision'
    ) and dimension = 'fulfilment' and scoring_state = 'excluded' and outcome is null
  ) then
    raise exception 'Permissible exit was not excluded.';
  end if;
  if not exists (
    select 1 from public.credibility_shadow_events
    where evidence_decision_id = (
      select object_id from qa_shadow_b_objects where object_name = 'unresolved_decision'
    ) and dimension = 'fulfilment' and scoring_state = 'review_required' and outcome is null
  ) then
    raise exception 'Unresolved dispute created a numerical fulfilment result.';
  end if;
  if not exists (
    select 1 from public.credibility_shadow_events
    where evidence_decision_id = (
      select object_id from qa_shadow_b_objects where object_name = 'replacement_expired_decision'
    ) and dimension = 'fulfilment' and outcome = 0
  ) then
    raise exception 'Replacement expiry was not a scored zero fulfilment outcome.';
  end if;
end;
$test$;

-- Late cure supersedes the factual failure but retains a negative responsiveness result.
select pg_temp.attach_shadow_b_review(
  'late_cure_milestone', 'late_cure_review',
  1, 100::smallint, 'graded'
);

create temporary table qa_late_cure_result as
select public.record_trade_evidence_decision_v1(
  p_milestone_id => (
    select object_id from qa_shadow_b_objects where object_name = 'late_cure_milestone'
  ),
  p_review_id => (
    select object_id from qa_shadow_b_objects where object_name = 'late_cure_review'
  ),
  p_decision_confidence_band => 100::smallint,
  p_primary_provenance_class => 'independent_third_party'::text,
  p_provider_authentication_status => 'not_applicable'::text,
  p_provider_authentication_ref => ''::text,
  p_adjudication_class => 'neutral_review_final'::text,
  p_contradiction_status => 'none'::text,
  p_integrity_finding => 'not_assessed'::text,
  p_responsiveness_finding => 'late_cure'::text,
  p_dispute_conduct_finding => 'cooperative'::text,
  p_finality_reason => 'late_cure'::text,
  p_exclusion_reason => ''::text,
  p_supersedes_decision_id => (
    select object_id from qa_shadow_b_objects where object_name = 'late_cure_failure_decision'
  )
) as result;

insert into qa_shadow_b_objects
select 'late_cure_decision', (result ->> 'decisionId')::uuid
from qa_late_cure_result;

do $test$
declare
  old_id uuid := (
    select object_id from qa_shadow_b_objects where object_name = 'late_cure_failure_decision'
  );
  new_id uuid := (
    select object_id from qa_shadow_b_objects where object_name = 'late_cure_decision'
  );
begin
  if not exists (
    select 1
    from public.credibility_shadow_events current_event
    where current_event.evidence_decision_id = new_id
      and current_event.dimension = 'fulfilment'
      and current_event.outcome = 1
      and exists (
        select 1 from public.credibility_shadow_events old_event
        where old_event.id = current_event.supersedes_event_id
          and old_event.evidence_decision_id = old_id
          and old_event.outcome = 0
      )
  ) then
    raise exception 'Late cure did not supersede zero fulfilment with eventual completion.';
  end if;
  if not exists (
    select 1 from public.credibility_shadow_events
    where evidence_decision_id = new_id
      and dimension = 'responsiveness' and outcome = 0
      and reason_code = 'late_cure'
  ) then
    raise exception 'Late cure erased the missed-deadline responsiveness finding.';
  end if;
  if (
    select count(*)
    from public.credibility_shadow_events old_event
    where old_event.evidence_decision_id = old_id
      and not exists (
        select 1 from public.credibility_shadow_events successor
        where successor.supersedes_event_id = old_event.id
      )
  ) <> 0 then
    raise exception 'A superseded late-cure failure remained terminal.';
  end if;
end;
$test$;

-- Terminal rejected evidence is a factual zero.
create temporary table qa_terminal_rejection_result as
select public.record_trade_evidence_decision_v1(
  p_milestone_id => (
    select object_id from qa_shadow_b_objects where object_name = 'terminal_rejection_milestone'
  ),
  p_review_id => (
    select object_id from qa_shadow_b_objects where object_name = 'terminal_rejection_review'
  ),
  p_decision_confidence_band => 100::smallint,
  p_primary_provenance_class => 'self_report'::text,
  p_provider_authentication_status => 'failed'::text,
  p_provider_authentication_ref => ''::text,
  p_adjudication_class => 'neutral_review_final'::text,
  p_contradiction_status => 'none'::text,
  p_integrity_finding => 'not_assessed'::text,
  p_responsiveness_finding => 'not_assessed'::text,
  p_dispute_conduct_finding => 'not_assessed'::text,
  p_finality_reason => 'terminal_rejection'::text,
  p_exclusion_reason => ''::text,
  p_supersedes_decision_id => null::uuid
) as result;
insert into qa_shadow_b_objects
select 'terminal_rejection_decision', (result ->> 'decisionId')::uuid
from qa_terminal_rejection_result;
rollback;
