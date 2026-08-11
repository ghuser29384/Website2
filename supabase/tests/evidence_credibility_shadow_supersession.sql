-- Replacement and appeal supersession QA; rollback-only.
begin;

create temporary table qa_b1b_actors(actor_role text primary key, profile_id uuid not null unique) on commit drop;
insert into qa_b1b_actors(actor_role, profile_id)
select roles.actor_role, profiles.id
from unnest(array['payer','performer','reviewer','appeal_reviewer']) with ordinality roles(actor_role, position)
join (select id, row_number() over(order by id) position from public.profiles limit 4) profiles using(position);

do $test$ begin
  if (select count(*) from qa_b1b_actors) <> 4 then raise exception 'Appeal QA requires four profiles.'; end if;
end; $test$;

create temporary table qa_b1b_objects(object_name text primary key, object_id uuid not null unique) on commit drop;
with made as (
 insert into public.agreements(proposer_id,responder_id,status,lifecycle_status,source,completion_state)
 select payer.profile_id,performer.profile_id,'active'::public.agreement_status,'active','manual','under_review'
 from qa_b1b_actors payer cross join qa_b1b_actors performer
 where payer.actor_role='payer' and performer.actor_role='performer' returning id)
insert into qa_b1b_objects select 'agreement',id from made;
with made as (
 insert into public.trade_agreement_versions(
  agreement_id,version,proposed_by,proposed_action,requested_action,duration,evidence_rule,
  exit_conditions,maximum_burden,privacy_scope,no_trade_baseline,terms_hash,
  requires_milestone_manifest,milestone_manifest_hash,complete_terms_hash)
 select agreement.object_id,1,payer.profile_id,'Perform QA','Settle QA','QA only','Private evidence',
  'Prospective exit','$10 maximum','Private','No trade',repeat('4',64),true,null,null
 from qa_b1b_objects agreement cross join qa_b1b_actors payer
 where agreement.object_name='agreement' and payer.actor_role='payer' returning id)
insert into qa_b1b_objects select 'version',id from made;
update public.agreements set current_version_id=(select object_id from qa_b1b_objects where object_name='version')
where id=(select object_id from qa_b1b_objects where object_name='agreement');

create or replace function pg_temp.b1b_milestone(p_name text,p_position integer,p_units numeric)
returns uuid language plpgsql as $f$
declare result_id uuid;
begin
 insert into public.trade_agreement_milestones(
  agreement_id,agreement_version_id,position,performer_id,payer_id,action_category,
  description,unit_label,units_total,indivisible,maximum_amount_cents,currency,evidence_rule,status)
 values(
  (select object_id from qa_b1b_objects where object_name='agreement'),
  (select object_id from qa_b1b_objects where object_name='version'),p_position,
  (select profile_id from qa_b1b_actors where actor_role='performer'),
  (select profile_id from qa_b1b_actors where actor_role='payer'),
  'service',p_name,'unit',p_units,false,1000,'USD','Private QA evidence','terms')
 returning id into result_id;
 insert into qa_b1b_objects values(p_name,result_id);
 return result_id;
end;$f$;
select pg_temp.b1b_milestone('replacement_milestone',1,1);
select pg_temp.b1b_milestone('affirm_milestone',2,10);
select pg_temp.b1b_milestone('overturn_milestone',3,1);
update public.trade_agreement_versions set milestone_manifest_hash=repeat('5',64),complete_terms_hash=repeat('6',64)
where id=(select object_id from qa_b1b_objects where object_name='version');

create or replace function pg_temp.b1b_review(
 p_milestone_name text,p_review_name text,p_kind text,p_base_review uuid,
 p_outcome text,p_completion numeric,p_factor smallint,p_reviewer_role text default 'reviewer')
returns uuid language plpgsql as $f$
declare
 milestone_value uuid:=(select object_id from qa_b1b_objects where object_name=p_milestone_name);
 units_value numeric; bundle_value uuid; review_value uuid; payout_value uuid;
 completion_value numeric; factor_value smallint; basis integer; amount bigint;
 bundle_kind_value text; attempt_value smallint;
begin
 select units_total into units_value from public.trade_agreement_milestones where id=milestone_value;
 completion_value:=case when p_outcome='rejected' then 0 else p_completion end;
 factor_value:=case when p_outcome='rejected' then 0::smallint else p_factor end;
 bundle_kind_value:=case when p_kind='replacement' then 'replacement' else 'initial' end;
 attempt_value:=case when bundle_kind_value='replacement' then 2 else 1 end;
 select id into bundle_value from public.trade_evidence_bundles
 where milestone_id=milestone_value and bundle_kind=bundle_kind_value limit 1;
 if bundle_value is null then
  insert into public.trade_evidence_bundles(milestone_id,submitted_by,bundle_kind,attempt_number,status,submitted_at,reviewed_at)
  values(milestone_value,(select profile_id from qa_b1b_actors where actor_role='performer'),bundle_kind_value,attempt_value,'accepted',now(),now())
  returning id into bundle_value;
 end if;
 select payout_basis_points,amount_due_cents into basis,amount
 from public.trade_milestone_payout_v1(1000::bigint,completion_value,units_value,factor_value);
 insert into public.trade_milestone_reviews(
  milestone_id,bundle_id,reviewer_id,review_kind,base_review_id,outcome,completion_units,
  confidence_band,payout_basis_points,amount_due_cents,private_reason,appeal_deadline_at,is_final,finalized_at)
 values(milestone_value,bundle_value,(select profile_id from qa_b1b_actors where actor_role=p_reviewer_role),
  p_kind,p_base_review,p_outcome,completion_value,factor_value,basis,amount,'QA review '||p_review_name,
  now()+interval '7 days',true,now()) returning id into review_value;
 select id into payout_value from public.trade_milestone_payouts where milestone_id=milestone_value;
 if payout_value is null then
  insert into public.trade_milestone_payouts(
   milestone_id,review_id,payer_id,payee_id,maximum_amount_cents,completion_units,units_total,
   confidence_band,payout_basis_points,amount_due_cents,currency,is_final,status,finalized_at)
  values(milestone_value,review_value,
   (select profile_id from qa_b1b_actors where actor_role='payer'),
   (select profile_id from qa_b1b_actors where actor_role='performer'),
   1000,completion_value,units_value,factor_value,basis,amount,'USD',true,
   case when amount=0 then 'not_due' else 'due' end,now()) returning id into payout_value;
 else
  update public.trade_milestone_payouts set review_id=review_value,completion_units=completion_value,
   units_total=units_value,confidence_band=factor_value,payout_basis_points=basis,amount_due_cents=amount,
   status=case when amount=0 then 'not_due' else 'due' end,finalized_at=now(),updated_at=now()
  where id=payout_value;
 end if;
 update public.trade_agreement_milestones set final_review_id=review_value,status='graded' where id=milestone_value;
 insert into qa_b1b_objects values(p_review_name,review_value);
 return review_value;
end;$f$;

-- Initial base reviews.
select pg_temp.b1b_review('replacement_milestone','replacement_base_review','initial',null::uuid,'rejected',0,0::smallint);
select pg_temp.b1b_review('affirm_milestone','affirm_base_review','initial',null::uuid,'graded',5,75::smallint);
select pg_temp.b1b_review('overturn_milestone','overturn_base_review','initial',null::uuid,'rejected',0,0::smallint);

select set_config('request.jwt.claim.sub','',true);
select set_config('request.jwt.claims','{"role":"service_role"}',true);

create or replace function pg_temp.b1b_record(
 p_milestone text,p_review text,p_name text,p_conf smallint,p_provenance text,p_adjudication text,
 p_integrity text,p_finality text,p_supersedes uuid default null)
returns uuid language plpgsql as $f$
declare response jsonb; result_id uuid;
begin
 response:=public.record_trade_evidence_decision_v1(
  p_milestone_id=>(select object_id from qa_b1b_objects where object_name=p_milestone),
  p_review_id=>(select object_id from qa_b1b_objects where object_name=p_review),
  p_decision_confidence_band=>p_conf,p_primary_provenance_class=>p_provenance,
  p_provider_authentication_status=>case when p_provenance='self_report' then 'failed' else 'not_applicable' end,
  p_provider_authentication_ref=>''::text,p_adjudication_class=>p_adjudication,
  p_contradiction_status=>'none'::text,p_integrity_finding=>p_integrity,
  p_responsiveness_finding=>'not_assessed'::text,p_dispute_conduct_finding=>'cooperative'::text,
  p_finality_reason=>p_finality,p_exclusion_reason=>''::text,p_supersedes_decision_id=>p_supersedes);
 result_id:=(response->>'decisionId')::uuid;
 insert into qa_b1b_objects values(p_name,result_id);
 return result_id;
end;$f$;

select pg_temp.b1b_record('replacement_milestone','replacement_base_review','replacement_base_decision',
 100::smallint,'self_report','neutral_review_final','not_assessed','terminal_rejection');
select pg_temp.b1b_record('affirm_milestone','affirm_base_review','affirm_base_decision',
 75::smallint,'independent_third_party','neutral_review_final','not_assessed','review_final');
select pg_temp.b1b_record('overturn_milestone','overturn_base_review','overturn_base_decision',
 100::smallint,'self_report','neutral_review_final','not_assessed','terminal_rejection');

-- Successful replacement must supersede, not double-count, the rejection.
select pg_temp.b1b_review('replacement_milestone','replacement_review','replacement',null::uuid,'graded',1,100::smallint);
select pg_temp.b1b_record('replacement_milestone','replacement_review','replacement_decision',
 100::smallint,'independent_third_party','neutral_review_final','supported_honest','replacement_success',
 (select object_id from qa_b1b_objects where object_name='replacement_base_decision'));

-- Affirmed and overturned appeals.
select pg_temp.b1b_review('affirm_milestone','affirm_appeal_review','appeal',
 (select object_id from qa_b1b_objects where object_name='affirm_base_review'),
 'graded',5,75::smallint,'appeal_reviewer');
select pg_temp.b1b_record('affirm_milestone','affirm_appeal_review','affirm_appeal_decision',
 100::smallint,'independent_third_party','appeal_review_final','not_assessed','appeal_affirmed',
 (select object_id from qa_b1b_objects where object_name='affirm_base_decision'));

select pg_temp.b1b_review('overturn_milestone','overturn_appeal_review','appeal',
 (select object_id from qa_b1b_objects where object_name='overturn_base_review'),
 'graded',1,100::smallint,'appeal_reviewer');
select pg_temp.b1b_record('overturn_milestone','overturn_appeal_review','overturn_appeal_decision',
 100::smallint,'independent_third_party','appeal_review_final','supported_honest','appeal_overturned',
 (select object_id from qa_b1b_objects where object_name='overturn_base_decision'));

do $test$
begin
 if not exists(
  select 1 from public.credibility_shadow_events current_event
  where current_event.evidence_decision_id=(select object_id from qa_b1b_objects where object_name='replacement_decision')
   and current_event.dimension='fulfilment' and current_event.outcome=1
   and exists(select 1 from public.credibility_shadow_events old_event
    where old_event.id=current_event.supersedes_event_id
     and old_event.evidence_decision_id=(select object_id from qa_b1b_objects where object_name='replacement_base_decision')
     and old_event.outcome=0)
 ) then raise exception 'Successful replacement did not supersede terminal rejection.'; end if;
 if not exists(
  select 1 from public.credibility_shadow_events current_event
  where current_event.evidence_decision_id=(select object_id from qa_b1b_objects where object_name='affirm_appeal_decision')
   and current_event.dimension='fulfilment' and current_event.outcome=0.5
   and current_event.supersedes_event_id is not null
 ) then raise exception 'Affirmed appeal did not preserve and supersede the base result.'; end if;
 if not exists(
  select 1 from public.credibility_shadow_events current_event
  where current_event.evidence_decision_id=(select object_id from qa_b1b_objects where object_name='overturn_appeal_decision')
   and current_event.dimension='fulfilment' and current_event.outcome=1
   and exists(select 1 from public.credibility_shadow_events old_event
    where old_event.id=current_event.supersedes_event_id and old_event.outcome=0)
 ) then raise exception 'Overturned appeal did not replace the rejected result.'; end if;
 if exists(
  select 1 from public.credibility_shadow_events old_event
  where old_event.evidence_decision_id in (
   (select object_id from qa_b1b_objects where object_name='replacement_base_decision'),
   (select object_id from qa_b1b_objects where object_name='affirm_base_decision'),
   (select object_id from qa_b1b_objects where object_name='overturn_base_decision'))
   and not exists(select 1 from public.credibility_shadow_events successor where successor.supersedes_event_id=old_event.id)
 ) then raise exception 'A superseded base event remained terminal.'; end if;
end;$test$;

rollback;
