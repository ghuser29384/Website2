-- Active-pipeline compatibility and future milestone cutover boundary QA.
begin;

create temporary table qa_c2_actors(actor_role text primary key,profile_id uuid not null unique) on commit drop;
insert into qa_c2_actors(actor_role,profile_id)
select roles.actor_role,profiles.id
from unnest(array['a','b','reviewer']) with ordinality roles(actor_role,position)
join (select id,row_number() over(order by id) position from public.profiles limit 3) profiles using(position);
do $t$ begin if (select count(*) from qa_c2_actors)<>3 then raise exception 'C2 QA requires three profiles.'; end if; end;$t$;

create temporary table qa_c2_objects(object_name text primary key,object_id uuid not null unique) on commit drop;

create or replace function pg_temp.c2_make_agreement(p_name text,p_with_milestone boolean)
returns uuid language plpgsql as $f$
declare agreement_id_value uuid;version_id_value uuid;milestone_id_value uuid;bundle_id_value uuid;
 review_id_value uuid;payout_id_value uuid;basis integer;amount bigint;
begin
 insert into public.agreements(proposer_id,responder_id,status,lifecycle_status,source,completion_state)
 values((select profile_id from qa_c2_actors where actor_role='a'),
  (select profile_id from qa_c2_actors where actor_role='b'),
  'active'::public.agreement_status,'active','manual','under_review') returning id into agreement_id_value;
 insert into qa_c2_objects values(p_name,agreement_id_value);

 if p_with_milestone then
  insert into public.trade_agreement_versions(
   agreement_id,version,proposed_by,proposed_action,requested_action,duration,evidence_rule,
   exit_conditions,maximum_burden,privacy_scope,no_trade_baseline,terms_hash,
   requires_milestone_manifest,milestone_manifest_hash,complete_terms_hash)
  values(agreement_id_value,1,(select profile_id from qa_c2_actors where actor_role='a'),
   'Complete compatibility milestone','No payment due','QA','Private evidence','Prospective exit',
   '$0','Private','No trade',encode(extensions.digest(convert_to(p_name||':terms','UTF8'),'sha256'),'hex'),
   true,null,null) returning id into version_id_value;
  update public.agreements set current_version_id=version_id_value where id=agreement_id_value;
  insert into public.trade_agreement_milestones(
   agreement_id,agreement_version_id,position,performer_id,payer_id,action_category,description,
   unit_label,units_total,indivisible,maximum_amount_cents,currency,evidence_rule,status)
  values(agreement_id_value,version_id_value,1,(select profile_id from qa_c2_actors where actor_role='a'),
   (select profile_id from qa_c2_actors where actor_role='b'),'service',p_name||' milestone','unit',1,false,0,
   'USD','Private evidence','terms') returning id into milestone_id_value;
  update public.trade_agreement_versions set
   milestone_manifest_hash=encode(extensions.digest(convert_to(p_name||':manifest','UTF8'),'sha256'),'hex'),
   complete_terms_hash=encode(extensions.digest(convert_to(p_name||':complete','UTF8'),'sha256'),'hex')
  where id=version_id_value;
  insert into public.trade_evidence_bundles(milestone_id,submitted_by,bundle_kind,attempt_number,status,submitted_at,reviewed_at)
  values(milestone_id_value,(select profile_id from qa_c2_actors where actor_role='a'),'initial',1,'accepted',now(),now())
  returning id into bundle_id_value;
  select payout_basis_points,amount_due_cents into basis,amount
  from public.trade_milestone_payout_v1(0::bigint,1::numeric,1::numeric,100::smallint);
  insert into public.trade_milestone_reviews(
   milestone_id,bundle_id,reviewer_id,review_kind,outcome,completion_units,confidence_band,
   payout_basis_points,amount_due_cents,private_reason,appeal_deadline_at,is_final,finalized_at)
  values(milestone_id_value,bundle_id_value,(select profile_id from qa_c2_actors where actor_role='reviewer'),
   'initial','graded',1,100,basis,amount,'C2 final review',now()+interval '7 days',true,now())
  returning id into review_id_value;
  insert into public.trade_milestone_payouts(
   milestone_id,review_id,payer_id,payee_id,maximum_amount_cents,completion_units,units_total,
   confidence_band,payout_basis_points,amount_due_cents,currency,is_final,status,finalized_at)
  values(milestone_id_value,review_id_value,(select profile_id from qa_c2_actors where actor_role='b'),
   (select profile_id from qa_c2_actors where actor_role='a'),0,1,1,100,basis,amount,'USD',true,'not_due',now())
  returning id into payout_id_value;
  update public.trade_agreement_milestones set final_review_id=review_id_value,status='graded'
  where id=milestone_id_value;
 else
  insert into public.trade_completion_confirmations(agreement_id,user_id)
  values(agreement_id_value,(select profile_id from qa_c2_actors where actor_role='a')),
        (agreement_id_value,(select profile_id from qa_c2_actors where actor_role='b'));
 end if;

 return agreement_id_value;
end;$f$;

select set_config('request.jwt.claim.sub','',true);select set_config('request.jwt.claims','{"role":"service_role"}',true);
create temporary table qa_c2_baseline as select count(*)::bigint active_events from public.credibility_events;

-- In shadow mode, the existing active pipeline is unchanged for both legacy and milestone agreements.
select pg_temp.c2_make_agreement('shadow_legacy',false);
select pg_temp.c2_make_agreement('shadow_milestone',true);
update public.agreements set status='completed'::public.agreement_status,lifecycle_status='completed',completion_state='reviewed_complete'
where id in ((select object_id from qa_c2_objects where object_name='shadow_legacy'),
             (select object_id from qa_c2_objects where object_name='shadow_milestone'));
do $t$ begin
 if (select count(*) from public.credibility_events)<>(select active_events+4 from qa_c2_baseline)
 then raise exception 'Shadow mode changed the existing agreement-completion credibility behavior.'; end if;
end;$t$;

-- Simulate a later explicit cutover inside this rollback-only transaction.
update public.credibility_shadow_controls
set mode='active',milestone_cutover_enabled=true,updated_at=now()
where control_key='evidence_decision_v2';
select pg_temp.c2_make_agreement('cutover_legacy',false);
select pg_temp.c2_make_agreement('cutover_milestone',true);
update public.agreements set status='completed'::public.agreement_status,lifecycle_status='completed',completion_state='reviewed_complete'
where id in ((select object_id from qa_c2_objects where object_name='cutover_legacy'),
             (select object_id from qa_c2_objects where object_name='cutover_milestone'));
do $t$ begin
 if (select count(*) from public.credibility_events)<>(select active_events+6 from qa_c2_baseline)
 then raise exception 'Future cutover did not preserve legacy agreements while suppressing milestone blanket events.'; end if;
 if exists(select 1 from public.credibility_events where agreement_id=(select object_id from qa_c2_objects where object_name='cutover_milestone') and source_type='agreement_transition')
 then raise exception 'Milestone agreement produced a blanket active fulfilment event after cutover.'; end if;
 if (select count(*) from public.credibility_events where agreement_id=(select object_id from qa_c2_objects where object_name='cutover_legacy') and source_type='agreement_transition')<>2
 then raise exception 'Legacy agreement lost compatibility after milestone cutover.'; end if;
end;$t$;

-- The same compatibility boundary applies to the existing payment trigger.
with made as (
 insert into public.agreement_payments(agreement_id,payer_id,payee_id,amount_cents,currency,status)
 values((select object_id from qa_c2_objects where object_name='cutover_legacy'),
  (select profile_id from qa_c2_actors where actor_role='a'),
  (select profile_id from qa_c2_actors where actor_role='b'),100,'usd','draft') returning id)
insert into qa_c2_objects select 'legacy_payment',id from made;
with made as (
 insert into public.agreement_payments(agreement_id,payer_id,payee_id,amount_cents,currency,status)
 values((select object_id from qa_c2_objects where object_name='cutover_milestone'),
  (select profile_id from qa_c2_actors where actor_role='a'),
  (select profile_id from qa_c2_actors where actor_role='b'),100,'usd','draft') returning id)
insert into qa_c2_objects select 'milestone_payment',id from made;
update public.agreement_payments set status='paid',paid_at=now(),updated_at=now()
where id in ((select object_id from qa_c2_objects where object_name='legacy_payment'),
             (select object_id from qa_c2_objects where object_name='milestone_payment'));
do $t$ begin
 if (select count(*) from public.credibility_events)<>(select active_events+7 from qa_c2_baseline)
 then raise exception 'Future payment cutover boundary generated the wrong number of active events.'; end if;
 if not exists(select 1 from public.credibility_events where source_id=(select object_id::text from qa_c2_objects where object_name='legacy_payment')||':paid')
 then raise exception 'Legacy payment lost active compatibility.'; end if;
 if exists(select 1 from public.credibility_events where source_id=(select object_id::text from qa_c2_objects where object_name='milestone_payment')||':paid')
 then raise exception 'Milestone payment produced a blanket active settlement event after cutover.'; end if;
end;$t$;

rollback;
