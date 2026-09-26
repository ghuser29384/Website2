-- Settlement shadow decisions, current-final review binding, and late cure QA.
begin;

create temporary table qa_b2_actors(actor_role text primary key, profile_id uuid not null unique) on commit drop;
insert into qa_b2_actors(actor_role,profile_id)
select roles.actor_role,profiles.id
from unnest(array['payer','performer','reviewer','appeal_reviewer']) with ordinality roles(actor_role,position)
join (select id,row_number() over(order by id) position from public.profiles limit 4) profiles using(position);
do $test$ begin if (select count(*) from qa_b2_actors)<>4 then raise exception 'Settlement QA requires four profiles.'; end if; end;$test$;

create temporary table qa_b2_objects(object_name text primary key,object_id uuid not null unique) on commit drop;
with made as (
 insert into public.agreements(proposer_id,responder_id,status,lifecycle_status,source,completion_state)
 select payer.profile_id,performer.profile_id,'active'::public.agreement_status,'active','manual','under_review'
 from qa_b2_actors payer cross join qa_b2_actors performer
 where payer.actor_role='payer' and performer.actor_role='performer' returning id)
insert into qa_b2_objects select 'agreement',id from made;
with made as (
 insert into public.trade_agreement_versions(
  agreement_id,version,proposed_by,proposed_action,requested_action,duration,evidence_rule,
  exit_conditions,maximum_burden,privacy_scope,no_trade_baseline,terms_hash,
  requires_milestone_manifest,milestone_manifest_hash,complete_terms_hash)
 select agreement.object_id,1,payer.profile_id,'Perform settlement QA','Settle settlement QA',
  'QA only','Private evidence','Prospective exit','$10 maximum','Private','No trade',
  repeat('7',64),true,null,null
 from qa_b2_objects agreement cross join qa_b2_actors payer
 where agreement.object_name='agreement' and payer.actor_role='payer' returning id)
insert into qa_b2_objects select 'version',id from made;
update public.agreements set current_version_id=(select object_id from qa_b2_objects where object_name='version')
where id=(select object_id from qa_b2_objects where object_name='agreement');

create or replace function pg_temp.b2_milestone(p_name text,p_position integer,p_max bigint)
returns uuid language plpgsql as $f$
declare result_id uuid;
begin
 insert into public.trade_agreement_milestones(
  agreement_id,agreement_version_id,position,performer_id,payer_id,action_category,
  description,unit_label,units_total,indivisible,maximum_amount_cents,currency,evidence_rule,status)
 values((select object_id from qa_b2_objects where object_name='agreement'),
  (select object_id from qa_b2_objects where object_name='version'),p_position,
  (select profile_id from qa_b2_actors where actor_role='performer'),
  (select profile_id from qa_b2_actors where actor_role='payer'),
  'service',p_name,'unit',1,false,p_max,'USD','Private settlement QA evidence','terms')
 returning id into result_id;
 insert into qa_b2_objects values(p_name,result_id); return result_id;
end;$f$;
select pg_temp.b2_milestone('settlement_milestone',1,1000);
select pg_temp.b2_milestone('not_due_milestone',2,0);
select pg_temp.b2_milestone('unresolved_milestone',3,1000);
select pg_temp.b2_milestone('zero_confidence_milestone',4,1000);
update public.trade_agreement_versions set milestone_manifest_hash=repeat('8',64),complete_terms_hash=repeat('9',64)
where id=(select object_id from qa_b2_objects where object_name='version');

create or replace function pg_temp.b2_attach_review(p_milestone text,p_review text)
returns uuid language plpgsql as $f$
declare m uuid:=(select object_id from qa_b2_objects where object_name=p_milestone);
 b uuid;r uuid;p uuid;basis integer;amount bigint;max_amount bigint;
begin
 select maximum_amount_cents into max_amount from public.trade_agreement_milestones where id=m;
 insert into public.trade_evidence_bundles(milestone_id,submitted_by,bundle_kind,attempt_number,status,submitted_at,reviewed_at)
 values(m,(select profile_id from qa_b2_actors where actor_role='performer'),'initial',1,'accepted',now(),now()) returning id into b;
 select payout_basis_points,amount_due_cents into basis,amount from public.trade_milestone_payout_v1(max_amount,1::numeric,1::numeric,100::smallint);
 insert into public.trade_milestone_reviews(
  milestone_id,bundle_id,reviewer_id,review_kind,outcome,completion_units,confidence_band,
  payout_basis_points,amount_due_cents,private_reason,appeal_deadline_at,is_final,finalized_at)
 values(m,b,(select profile_id from qa_b2_actors where actor_role='reviewer'),'initial','graded',1,100,
  basis,amount,'Settlement QA review',now()+interval '7 days',true,now()) returning id into r;
 insert into public.trade_milestone_payouts(
  milestone_id,review_id,payer_id,payee_id,maximum_amount_cents,completion_units,units_total,
  confidence_band,payout_basis_points,amount_due_cents,currency,is_final,status,finalized_at)
 values(m,r,(select profile_id from qa_b2_actors where actor_role='payer'),
  (select profile_id from qa_b2_actors where actor_role='performer'),max_amount,1,1,100,basis,amount,'USD',true,
  case when amount=0 then 'not_due' else 'due' end,now()) returning id into p;
 update public.trade_agreement_milestones set final_review_id=r,status='graded' where id=m;
 insert into qa_b2_objects values(p_review,r),(p_milestone||'_payout',p);
 return r;
end;$f$;
select pg_temp.b2_attach_review('settlement_milestone','settlement_review');
select pg_temp.b2_attach_review('not_due_milestone','not_due_review');
select pg_temp.b2_attach_review('unresolved_milestone','unresolved_review');
select pg_temp.b2_attach_review('zero_confidence_milestone','zero_confidence_review');

select set_config('request.jwt.claim.sub','',true);
select set_config('request.jwt.claims','{"role":"service_role"}',true);
create temporary table qa_b2_baseline as select
 (select count(*) from public.credibility_events) active_events,
 (select count(*) from public.credibility_public_aggregates) active_aggregates,
 (select count(*) from public.credibility_restrictions) active_restrictions;

-- Initial disputed receipt and final still-due decision.
update public.trade_milestone_payouts set status='still_due',updated_at=now()
where id=(select object_id from qa_b2_objects where object_name='settlement_milestone_payout');
with made as (
 insert into public.trade_external_payment_receipts(
  payout_id,reported_by,provider,provider_reference,reference_fingerprint,amount_cents,currency,
  paid_on,receipt_storage_path,status,response_outcome)
 select payout.object_id,payer.profile_id,'QA provider','qa-settlement-unpaid',repeat('a',64),1000,'USD',
  current_date,'','under_review','disputed'
 from qa_b2_objects payout cross join qa_b2_actors payer
 where payout.object_name='settlement_milestone_payout' and payer.actor_role='payer' returning id)
insert into qa_b2_objects select 'payment_receipt',id from made;
with made as (
 insert into public.trade_payment_review_cases(
  payout_id,payment_cycle,initial_receipt_id,assigned_reviewer_id,status,
  reviewer_selection_opened_at,reviewer_selection_deadline_at)
 select payout.object_id,1,receipt.object_id,reviewer.profile_id,'decision_pending',
  now()-interval '8 days',now()-interval '1 day'
 from qa_b2_objects payout cross join qa_b2_objects receipt cross join qa_b2_actors reviewer
 where payout.object_name='settlement_milestone_payout' and receipt.object_name='payment_receipt'
  and reviewer.actor_role='reviewer' returning id)
insert into qa_b2_objects select 'payment_case',id from made;
with made as (
 insert into public.trade_payment_review_decisions(
  case_id,receipt_id,reviewer_id,decision_kind,outcome,private_reason,appeal_deadline_at,is_final,finalized_at)
 select case_row.object_id,receipt.object_id,reviewer.profile_id,'final','still_due',
  'Payment remained due in QA',now()+interval '7 days',true,now()
 from qa_b2_objects case_row cross join qa_b2_objects receipt cross join qa_b2_actors reviewer
 where case_row.object_name='payment_case' and receipt.object_name='payment_receipt'
  and reviewer.actor_role='reviewer' returning id)
insert into qa_b2_objects select 'unpaid_review_decision',id from made;
update public.trade_payment_review_cases set final_decision_id=(select object_id from qa_b2_objects where object_name='unpaid_review_decision'),status='resolved',updated_at=now()
where id=(select object_id from qa_b2_objects where object_name='payment_case');

create temporary table qa_b2_unpaid as select public.record_trade_settlement_shadow_decision_v1(
 p_payout_id=>(select object_id from qa_b2_objects where object_name='settlement_milestone_payout'),
 p_payment_review_decision_id=>(select object_id from qa_b2_objects where object_name='unpaid_review_decision'),
 p_decision_confidence_band=>100::smallint,p_primary_provenance_class=>'independent_third_party'::text,
 p_provider_authentication_status=>'not_applicable'::text,p_provider_authentication_ref=>''::text,
 p_adjudication_class=>'neutral_review_final'::text,p_finality_reason=>'adjudicated_unpaid'::text,
 p_exclusion_reason=>''::text,p_supersedes_decision_id=>null::uuid) result;
insert into qa_b2_objects select 'unpaid_shadow_decision',(result->>'decisionId')::uuid from qa_b2_unpaid;

-- Appeal confirms late payment, superseding the still-due result.
update public.trade_milestone_payouts set status='adjudicated_paid',updated_at=now()
where id=(select object_id from qa_b2_objects where object_name='settlement_milestone_payout');
with made as (
 insert into public.trade_payment_review_decisions(
  case_id,receipt_id,reviewer_id,decision_kind,base_decision_id,outcome,private_reason,
  appeal_deadline_at,is_final,finalized_at)
 select case_row.object_id,receipt.object_id,reviewer.profile_id,'appeal',base.object_id,'confirm_paid',
  'Payment was later established in QA',now()+interval '7 days',true,now()
 from qa_b2_objects case_row cross join qa_b2_objects receipt cross join qa_b2_actors reviewer cross join qa_b2_objects base
 where case_row.object_name='payment_case' and receipt.object_name='payment_receipt'
  and reviewer.actor_role='appeal_reviewer' and base.object_name='unpaid_review_decision' returning id)
insert into qa_b2_objects select 'paid_appeal_decision',id from made;
update public.trade_payment_review_cases set final_decision_id=(select object_id from qa_b2_objects where object_name='paid_appeal_decision'),status='resolved',updated_at=now()
where id=(select object_id from qa_b2_objects where object_name='payment_case');

-- The superseded payment review can no longer create a decision.
do $test$
begin
 begin
  perform public.record_trade_settlement_shadow_decision_v1(
   p_payout_id=>(select object_id from qa_b2_objects where object_name='settlement_milestone_payout'),
   p_payment_review_decision_id=>(select object_id from qa_b2_objects where object_name='unpaid_review_decision'),
   p_decision_confidence_band=>100::smallint,p_primary_provenance_class=>'independent_third_party'::text,
   p_provider_authentication_status=>'not_applicable'::text,p_provider_authentication_ref=>''::text,
   p_adjudication_class=>'neutral_review_final'::text,p_finality_reason=>'adjudicated_unpaid'::text,
   p_exclusion_reason=>''::text,p_supersedes_decision_id=>(select object_id from qa_b2_objects where object_name='unpaid_shadow_decision'));
  raise exception 'Superseded payment review unexpectedly remained recordable.';
 exception when others then
  if sqlerrm not like 'Only the current final payment review%' then raise; end if;
 end;
end;$test$;

create temporary table qa_b2_cure as select public.record_trade_settlement_shadow_decision_v1(
 p_payout_id=>(select object_id from qa_b2_objects where object_name='settlement_milestone_payout'),
 p_payment_review_decision_id=>(select object_id from qa_b2_objects where object_name='paid_appeal_decision'),
 p_decision_confidence_band=>100::smallint,p_primary_provenance_class=>'independent_third_party'::text,
 p_provider_authentication_status=>'not_applicable'::text,p_provider_authentication_ref=>''::text,
 p_adjudication_class=>'appeal_review_final'::text,p_finality_reason=>'late_payment_cure'::text,
 p_exclusion_reason=>''::text,
 p_supersedes_decision_id=>(select object_id from qa_b2_objects where object_name='unpaid_shadow_decision')) result;
insert into qa_b2_objects select 'cure_shadow_decision',(result->>'decisionId')::uuid from qa_b2_cure;

-- Not due is excluded.
create temporary table qa_b2_not_due as select public.record_trade_settlement_shadow_decision_v1(
 p_payout_id=>(select object_id from qa_b2_objects where object_name='not_due_milestone_payout'),
 p_payment_review_decision_id=>null::uuid,p_decision_confidence_band=>100::smallint,
 p_primary_provenance_class=>'platform_observed'::text,p_provider_authentication_status=>'not_applicable'::text,
 p_provider_authentication_ref=>''::text,p_adjudication_class=>'platform_established'::text,
 p_finality_reason=>'not_due'::text,p_exclusion_reason=>'No settlement was due.'::text,
 p_supersedes_decision_id=>null::uuid) result;
insert into qa_b2_objects select 'not_due_shadow_decision',(result->>'decisionId')::uuid from qa_b2_not_due;

-- An unresolved pending payment dispute has no numerical result.
update public.trade_milestone_payouts set status='payment_review_pending',updated_at=now()
where id=(select object_id from qa_b2_objects where object_name='unresolved_milestone_payout');
create temporary table qa_b2_unresolved as select public.record_trade_settlement_shadow_decision_v1(
 p_payout_id=>(select object_id from qa_b2_objects where object_name='unresolved_milestone_payout'),
 p_payment_review_decision_id=>null::uuid,p_decision_confidence_band=>100::smallint,
 p_primary_provenance_class=>'self_report'::text,p_provider_authentication_status=>'unverified'::text,
 p_provider_authentication_ref=>''::text,p_adjudication_class=>'unreviewed'::text,
 p_finality_reason=>'unresolved_dispute'::text,p_exclusion_reason=>'Payment dispute remains unresolved.'::text,
 p_supersedes_decision_id=>null::uuid) result;
insert into qa_b2_objects select 'unresolved_shadow_decision',(result->>'decisionId')::uuid from qa_b2_unresolved;

-- Zero evidential confidence turns a confirmed platform state into review-required, not outcome 1.
update public.trade_milestone_payouts set status='confirmed',updated_at=now()
where id=(select object_id from qa_b2_objects where object_name='zero_confidence_milestone_payout');
create temporary table qa_b2_zero_conf as select public.record_trade_settlement_shadow_decision_v1(
 p_payout_id=>(select object_id from qa_b2_objects where object_name='zero_confidence_milestone_payout'),
 p_payment_review_decision_id=>null::uuid,p_decision_confidence_band=>0::smallint,
 p_primary_provenance_class=>'platform_observed'::text,p_provider_authentication_status=>'not_applicable'::text,
 p_provider_authentication_ref=>''::text,p_adjudication_class=>'platform_established'::text,
 p_finality_reason=>'confirmed'::text,p_exclusion_reason=>'No usable factual confidence.'::text,
 p_supersedes_decision_id=>null::uuid) result;
insert into qa_b2_objects select 'zero_conf_shadow_decision',(result->>'decisionId')::uuid from qa_b2_zero_conf;

do $test$
declare unpaid uuid:=(select object_id from qa_b2_objects where object_name='unpaid_shadow_decision');
 cure uuid:=(select object_id from qa_b2_objects where object_name='cure_shadow_decision');
begin
 if not exists(select 1 from public.credibility_shadow_events current_event
  where current_event.settlement_decision_id=cure and current_event.dimension='settlement' and current_event.outcome=1
   and exists(select 1 from public.credibility_shadow_events old_event where old_event.id=current_event.supersedes_event_id
    and old_event.settlement_decision_id=unpaid and old_event.outcome=0))
 then raise exception 'Late payment cure did not supersede still-due outcome.'; end if;
 if not exists(select 1 from public.credibility_shadow_events where settlement_decision_id=cure
  and dimension='responsiveness' and outcome=0 and reason_code='late_payment_cure')
 then raise exception 'Late payment cure did not retain responsiveness failure.'; end if;
 if not exists(select 1 from public.credibility_shadow_events where settlement_decision_id=(select object_id from qa_b2_objects where object_name='not_due_shadow_decision')
  and dimension='settlement' and scoring_state='excluded' and outcome is null)
 then raise exception 'Not-due settlement was not excluded.'; end if;
 if not exists(select 1 from public.credibility_shadow_events where settlement_decision_id=(select object_id from qa_b2_objects where object_name='unresolved_shadow_decision')
  and dimension='settlement' and scoring_state='review_required' and outcome is null)
 then raise exception 'Unresolved dispute created a numerical settlement result.'; end if;
 if not exists(select 1 from public.trade_settlement_shadow_decisions where id=(select object_id from qa_b2_objects where object_name='zero_conf_shadow_decision')
  and decision_status='review_required' and outcome is null)
 then raise exception 'Zero confidence did not fail closed to review-required.'; end if;
 if (select count(*) from public.credibility_events)<>(select active_events from qa_b2_baseline)
  or (select count(*) from public.credibility_public_aggregates)<>(select active_aggregates from qa_b2_baseline)
  or (select count(*) from public.credibility_restrictions)<>(select active_restrictions from qa_b2_baseline)
 then raise exception 'Settlement shadow QA changed active credibility state.'; end if;
end;$test$;

rollback;
