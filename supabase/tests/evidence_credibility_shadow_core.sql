-- Core evidence-decision semantics and shadow-isolation QA; rollback-only.
begin;

create temporary table qa_shadow_actors (
  actor_role text primary key,
  profile_id uuid not null unique
) on commit drop;

insert into qa_shadow_actors(actor_role, profile_id)
select roles.actor_role, profiles.id
from unnest(array['payer','performer','reviewer','other']) with ordinality
  as roles(actor_role, position)
join (
  select id, row_number() over (order by id) as position
  from public.profiles
  limit 4
) profiles using (position);

do $test$
begin
  if (select count(*) from qa_shadow_actors) <> 4 then
    raise exception 'Shadow QA requires four existing QA profiles.';
  end if;
end;
$test$;

create temporary table qa_shadow_objects (
  object_name text primary key,
  object_id uuid not null unique
) on commit drop;

with created as (
  insert into public.agreements(
    proposer_id, responder_id, status, lifecycle_status, source, completion_state
  )
  select payer.profile_id, performer.profile_id,
    'active'::public.agreement_status, 'active', 'manual', 'under_review'
  from qa_shadow_actors payer
  cross join qa_shadow_actors performer
  where payer.actor_role='payer' and performer.actor_role='performer'
  returning id
)
insert into qa_shadow_objects select 'agreement', id from created;

with created as (
  insert into public.trade_agreement_versions(
    agreement_id, version, proposed_by, proposed_action, requested_action,
    duration, evidence_rule, exit_conditions, maximum_burden, privacy_scope,
    no_trade_baseline, terms_hash, requires_milestone_manifest,
    milestone_manifest_hash, complete_terms_hash
  )
  select agreement.object_id, 1, payer.profile_id,
    'Perform reviewed shadow QA milestones', 'Settle reviewed shadow QA milestones',
    'QA only', 'Private evidence', 'Prospective exit', '$100 maximum',
    'Participants and assigned reviewers only', 'No trade', repeat('a',64),
    true, null, null
  from qa_shadow_objects agreement
  cross join qa_shadow_actors payer
  where agreement.object_name='agreement' and payer.actor_role='payer'
  returning id
)
insert into qa_shadow_objects select 'version', id from created;

update public.agreements
set current_version_id=(select object_id from qa_shadow_objects where object_name='version')
where id=(select object_id from qa_shadow_objects where object_name='agreement');

create or replace function pg_temp.make_milestone(
  p_label text,
  p_position integer,
  p_units_total numeric,
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
    (select object_id from qa_shadow_objects where object_name='agreement'),
    (select object_id from qa_shadow_objects where object_name='version'),
    p_position,
    (select profile_id from qa_shadow_actors where actor_role='performer'),
    (select profile_id from qa_shadow_actors where actor_role='payer'),
    p_action_category, p_label, 'unit', p_units_total, false,
    10000, 'USD', 'Private reviewed QA evidence', 'terms'
  ) returning id into milestone_id_value;
  return milestone_id_value;
end;
$function$;

insert into qa_shadow_objects values
  ('partial_milestone', pg_temp.make_milestone('partial completion',1,10::numeric,'service')),
  ('self_milestone', pg_temp.make_milestone('self report',2,1::numeric,'service')),
  ('innocent_milestone', pg_temp.make_milestone('innocent contradiction',3,1::numeric,'research')),
  ('fraud_milestone', pg_temp.make_milestone('forged evidence',4,1::numeric,'service')),
  ('provider_milestone', pg_temp.make_milestone('provider evidence',5,1::numeric,'donation'));

update public.trade_agreement_versions
set milestone_manifest_hash=repeat('b',64), complete_terms_hash=repeat('c',64)
where id=(select object_id from qa_shadow_objects where object_name='version');

create or replace function pg_temp.attach_final_review(
  p_milestone_id uuid,
  p_completion_units numeric,
  p_payout_factor smallint,
  p_review_outcome text default 'graded'
)
returns table(review_id uuid, payout_id uuid)
language plpgsql
as $function$
declare
  bundle_id_value uuid;
  payout_basis integer;
  amount_due bigint;
  units_total_value numeric;
begin
  select units_total into units_total_value
  from public.trade_agreement_milestones where id=p_milestone_id;

  insert into public.trade_evidence_bundles(
    milestone_id, submitted_by, bundle_kind, attempt_number, status, submitted_at, reviewed_at
  ) values (
    p_milestone_id,
    (select profile_id from qa_shadow_actors where actor_role='performer'),
    'initial',1,'accepted',now(),now()
  ) returning id into bundle_id_value;

  select result.payout_basis_points, result.amount_due_cents
  into payout_basis, amount_due
  from public.trade_milestone_payout_v1(
    10000::bigint,
    case when p_review_outcome='rejected' then 0 else p_completion_units end,
    units_total_value,
    case when p_review_outcome='rejected' then 0::smallint else p_payout_factor end
  ) result;

  insert into public.trade_milestone_reviews(
    milestone_id,bundle_id,reviewer_id,review_kind,outcome,
    completion_units,confidence_band,payout_basis_points,amount_due_cents,
    private_reason,appeal_deadline_at,is_final,finalized_at
  ) values (
    p_milestone_id,bundle_id_value,
    (select profile_id from qa_shadow_actors where actor_role='reviewer'),
    'initial',p_review_outcome,
    case when p_review_outcome='rejected' then 0 else p_completion_units end,
    case when p_review_outcome='rejected' then 0 else p_payout_factor end,
    payout_basis,amount_due,'QA final review',now()+interval '7 days',true,now()
  ) returning id into review_id;

  insert into public.trade_milestone_payouts(
    milestone_id,review_id,payer_id,payee_id,maximum_amount_cents,
    completion_units,units_total,confidence_band,payout_basis_points,
    amount_due_cents,currency,is_final,status,finalized_at
  ) values (
    p_milestone_id,review_id,
    (select profile_id from qa_shadow_actors where actor_role='payer'),
    (select profile_id from qa_shadow_actors where actor_role='performer'),
    10000,
    case when p_review_outcome='rejected' then 0 else p_completion_units end,
    units_total_value,
    case when p_review_outcome='rejected' then 0 else p_payout_factor end,
    payout_basis,amount_due,'USD',true,
    case when amount_due=0 then 'not_due' else 'due' end,now()
  ) returning id into payout_id;

  update public.trade_agreement_milestones
  set final_review_id=review_id,
      status='graded'
  where id=p_milestone_id;
  return next;
end;
$function$;

insert into qa_shadow_objects
select 'partial_review', review_id from pg_temp.attach_final_review(
  (select object_id from qa_shadow_objects where object_name='partial_milestone'),
  6::numeric,50::smallint,'graded'
);
insert into qa_shadow_objects
select 'self_review', review_id from pg_temp.attach_final_review(
  (select object_id from qa_shadow_objects where object_name='self_milestone'),
  1::numeric,100::smallint,'graded'
);
insert into qa_shadow_objects
select 'innocent_review', review_id from pg_temp.attach_final_review(
  (select object_id from qa_shadow_objects where object_name='innocent_milestone'),
  1::numeric,100::smallint,'graded'
);
insert into qa_shadow_objects
select 'fraud_review', review_id from pg_temp.attach_final_review(
  (select object_id from qa_shadow_objects where object_name='fraud_milestone'),
  0::numeric,0::smallint,'rejected'
);
insert into qa_shadow_objects
select 'provider_review', review_id from pg_temp.attach_final_review(
  (select object_id from qa_shadow_objects where object_name='provider_milestone'),
  1::numeric,100::smallint,'graded'
);

select set_config('request.jwt.claim.sub','',true);
select set_config('request.jwt.claims','{"role":"service_role"}',true);

create temporary table qa_shadow_baseline as
select
  (select count(*) from public.credibility_events) as active_events,
  (select count(*) from public.credibility_public_aggregates) as active_aggregates,
  (select count(*) from public.credibility_restrictions) as active_restrictions;

create temporary table qa_partial_result as
select public.record_trade_evidence_decision_v1(
  p_milestone_id => (select object_id from qa_shadow_objects where object_name='partial_milestone'),
  p_review_id => (select object_id from qa_shadow_objects where object_name='partial_review'),
  p_decision_confidence_band => 75::smallint,
  p_primary_provenance_class => 'independent_third_party'::text,
  p_provider_authentication_status => 'not_applicable'::text,
  p_provider_authentication_ref => ''::text,
  p_adjudication_class => 'neutral_review_final'::text,
  p_contradiction_status => 'none'::text,
  p_integrity_finding => 'not_assessed'::text,
  p_responsiveness_finding => 'on_time'::text,
  p_dispute_conduct_finding => 'not_assessed'::text,
  p_finality_reason => 'review_final'::text,
  p_exclusion_reason => ''::text,
  p_supersedes_decision_id => null::uuid
) as result;
insert into qa_shadow_objects
select 'partial_decision',(result->>'decisionId')::uuid from qa_partial_result;

do $test$
declare
  decision_id_value uuid := (select object_id from qa_shadow_objects where object_name='partial_decision');
  replay jsonb;
begin
  if not exists (
    select 1 from public.trade_evidence_decisions
    where id=decision_id_value and completion_fraction=0.6
      and payout_factor_band=50 and decision_confidence_band=75
      and additionality_status='not_evaluated'
  ) then
    raise exception 'Partial completion decision did not preserve separate factual and confidence fields.';
  end if;
  if not exists (
    select 1 from public.credibility_shadow_events
    where evidence_decision_id=decision_id_value and dimension='fulfilment'
      and outcome=0.6 and provenance_weight=1 and decision_confidence_weight=0.75
  ) then
    raise exception 'Partial completion was multiplied into confidence or weighted incorrectly.';
  end if;
  if not exists (
    select 1 from public.credibility_shadow_events
    where evidence_decision_id=decision_id_value and dimension='responsiveness' and outcome=1
  ) then
    raise exception 'On-time responsiveness event was not created.';
  end if;
  replay := public.record_trade_evidence_decision_v1(
    p_milestone_id => (select object_id from qa_shadow_objects where object_name='partial_milestone'),
    p_review_id => (select object_id from qa_shadow_objects where object_name='partial_review'),
    p_decision_confidence_band => 75::smallint,
    p_primary_provenance_class => 'independent_third_party'::text,
    p_provider_authentication_status => 'not_applicable'::text,
    p_provider_authentication_ref => ''::text,
    p_adjudication_class => 'neutral_review_final'::text,
    p_contradiction_status => 'none'::text,
    p_integrity_finding => 'not_assessed'::text,
    p_responsiveness_finding => 'on_time'::text,
    p_dispute_conduct_finding => 'not_assessed'::text,
    p_finality_reason => 'review_final'::text,
    p_exclusion_reason => ''::text,
    p_supersedes_decision_id => null::uuid
  );
  if replay->>'status' <> 'replayed'
     or (select count(*) from public.trade_evidence_decisions where id=decision_id_value) <> 1
     or (select count(*) from public.credibility_shadow_events where evidence_decision_id=decision_id_value) <> 2 then
    raise exception 'Evidence-decision replay was not idempotent.';
  end if;
end;
$test$;

create temporary table qa_self_result as
select public.record_trade_evidence_decision_v1(
  p_milestone_id => (select object_id from qa_shadow_objects where object_name='self_milestone'),
  p_review_id => (select object_id from qa_shadow_objects where object_name='self_review'),
  p_decision_confidence_band => 100::smallint,
  p_primary_provenance_class => 'self_report'::text,
  p_provider_authentication_status => 'unverified'::text,
  p_provider_authentication_ref => ''::text,
  p_adjudication_class => 'neutral_review_final'::text,
  p_contradiction_status => 'none'::text,
  p_integrity_finding => 'not_assessed'::text,
  p_responsiveness_finding => 'not_assessed'::text,
  p_dispute_conduct_finding => 'not_assessed'::text,
  p_finality_reason => 'review_final'::text,
  p_exclusion_reason => ''::text,
  p_supersedes_decision_id => null::uuid
) as result;
insert into qa_shadow_objects
select 'self_decision',(result->>'decisionId')::uuid from qa_self_result;

do $test$
begin
  if not exists (
    select 1 from public.credibility_shadow_events
    where evidence_decision_id=(select object_id from qa_shadow_objects where object_name='self_decision')
      and dimension='fulfilment' and primary_provenance_class='self_report'
      and adjudication_class='neutral_review_final' and provenance_weight=0.2
  ) then
    raise exception 'Neutral adjudication incorrectly upgraded self-report provenance.';
  end if;
end;
$test$;

create temporary table qa_innocent_result as
select public.record_trade_evidence_decision_v1(
  p_milestone_id => (select object_id from qa_shadow_objects where object_name='innocent_milestone'),
  p_review_id => (select object_id from qa_shadow_objects where object_name='innocent_review'),
  p_decision_confidence_band => 75::smallint,
  p_primary_provenance_class => 'independent_third_party'::text,
  p_provider_authentication_status => 'not_applicable'::text,
  p_provider_authentication_ref => ''::text,
  p_adjudication_class => 'neutral_review_final'::text,
  p_contradiction_status => 'innocent'::text,
  p_integrity_finding => 'not_assessed'::text,
  p_responsiveness_finding => 'not_assessed'::text,
  p_dispute_conduct_finding => 'not_assessed'::text,
  p_finality_reason => 'review_final'::text,
  p_exclusion_reason => ''::text,
  p_supersedes_decision_id => null::uuid
) as result;
insert into qa_shadow_objects
select 'innocent_decision',(result->>'decisionId')::uuid from qa_innocent_result;

do $test$
begin
  if exists (
    select 1 from public.credibility_shadow_events
    where evidence_decision_id=(select object_id from qa_shadow_objects where object_name='innocent_decision')
      and dimension='evidence_integrity'
  ) then
    raise exception 'Innocent contradiction created an integrity penalty or reward.';
  end if;
end;
$test$;

create temporary table qa_fraud_result as
select public.record_trade_evidence_decision_v1(
  p_milestone_id => (select object_id from qa_shadow_objects where object_name='fraud_milestone'),
  p_review_id => (select object_id from qa_shadow_objects where object_name='fraud_review'),
  p_decision_confidence_band => 100::smallint,
  p_primary_provenance_class => 'self_report'::text,
  p_provider_authentication_status => 'failed'::text,
  p_provider_authentication_ref => ''::text,
  p_adjudication_class => 'neutral_review_final'::text,
  p_contradiction_status => 'deliberate'::text,
  p_integrity_finding => 'deliberate_fabrication'::text,
  p_responsiveness_finding => 'missed_deadline'::text,
  p_dispute_conduct_finding => 'evidence_destruction'::text,
  p_finality_reason => 'terminal_rejection'::text,
  p_exclusion_reason => ''::text,
  p_supersedes_decision_id => null::uuid
) as result;
insert into qa_shadow_objects
select 'fraud_decision',(result->>'decisionId')::uuid from qa_fraud_result;

do $test$
begin
  if not exists (
    select 1 from public.credibility_shadow_events
    where evidence_decision_id=(select object_id from qa_shadow_objects where object_name='fraud_decision')
      and dimension='evidence_integrity' and outcome=0
  ) or not exists (
    select 1 from public.credibility_shadow_restriction_signals
    where evidence_decision_id=(select object_id from qa_shadow_objects where object_name='fraud_decision')
      and signal_type='forged_evidence' and status='review_required'
  ) then
    raise exception 'Deliberate fabrication did not create the required shadow integrity event and signal.';
  end if;
  if (select count(*) from public.credibility_restrictions)
     <> (select active_restrictions from qa_shadow_baseline) then
    raise exception 'Shadow fraud signal mutated active restrictions.';
  end if;
end;
$test$;

create temporary table qa_provider_result as
select public.record_trade_evidence_decision_v1(
  p_milestone_id => (select object_id from qa_shadow_objects where object_name='provider_milestone'),
  p_review_id => (select object_id from qa_shadow_objects where object_name='provider_review'),
  p_decision_confidence_band => 100::smallint,
  p_primary_provenance_class => 'authenticated_provider'::text,
  p_provider_authentication_status => 'authenticated'::text,
  p_provider_authentication_ref => 'provider-auth:qa-1'::text,
  p_adjudication_class => 'neutral_review_final'::text,
  p_contradiction_status => 'none'::text,
  p_integrity_finding => 'supported_honest'::text,
  p_responsiveness_finding => 'on_time'::text,
  p_dispute_conduct_finding => 'cooperative'::text,
  p_finality_reason => 'review_final'::text,
  p_exclusion_reason => ''::text,
  p_supersedes_decision_id => null::uuid
) as result;
insert into qa_shadow_objects
select 'provider_decision',(result->>'decisionId')::uuid from qa_provider_result;

do $test$
begin
  if not exists (
    select 1 from public.trade_evidence_decisions
    where id=(select object_id from qa_shadow_objects where object_name='provider_decision')
      and provider_authentication_status='authenticated'
      and provider_authentication_ref='provider-auth:qa-1'
  ) then
    raise exception 'Authenticated provider status/reference was not preserved.';
  end if;
  if (select count(*) from public.credibility_events)
       <> (select active_events from qa_shadow_baseline)
     or (select count(*) from public.credibility_public_aggregates)
       <> (select active_aggregates from qa_shadow_baseline) then
    raise exception 'Shadow evidence decisions changed the active credibility pipeline.';
  end if;
end;
$test$;

rollback;
