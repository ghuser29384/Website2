-- Reciprocal-role assignment, AAL2 authorization, RLS, and append-only QA.
begin;

create temporary table qa_c1_actors(actor_role text primary key,profile_id uuid not null unique) on commit drop;
insert into qa_c1_actors(actor_role,profile_id)
select roles.actor_role,profiles.id
from unnest(array['a','b','reviewer','unauthorized']) with ordinality roles(actor_role,position)
join (select id,row_number() over(order by id) position from public.profiles limit 4) profiles using(position);
do $t$ begin if (select count(*) from qa_c1_actors)<>4 then raise exception 'C1 QA requires four profiles.'; end if; end;$t$;

create temporary table qa_c1_objects(object_name text primary key,object_id uuid not null unique) on commit drop;
with made as (
 insert into public.agreements(proposer_id,responder_id,status,lifecycle_status,source,completion_state)
 select a.profile_id,b.profile_id,'active'::public.agreement_status,'active','manual','under_review'
 from qa_c1_actors a cross join qa_c1_actors b where a.actor_role='a' and b.actor_role='b' returning id)
insert into qa_c1_objects select 'agreement',id from made;
with made as (
 insert into public.trade_agreement_versions(
  agreement_id,version,proposed_by,proposed_action,requested_action,duration,evidence_rule,
  exit_conditions,maximum_burden,privacy_scope,no_trade_baseline,terms_hash,
  requires_milestone_manifest,milestone_manifest_hash,complete_terms_hash)
 select agreement.object_id,1,a.profile_id,'A and B perform','A and B settle','QA','Private evidence',
  'Prospective exit','$10 maximum','Private','No trade',repeat('b',64),true,null,null
 from qa_c1_objects agreement cross join qa_c1_actors a
 where agreement.object_name='agreement' and a.actor_role='a' returning id)
insert into qa_c1_objects select 'version',id from made;
update public.agreements set current_version_id=(select object_id from qa_c1_objects where object_name='version')
where id=(select object_id from qa_c1_objects where object_name='agreement');

create or replace function pg_temp.c1_milestone(p_name text,p_position integer,p_performer text,p_payer text)
returns uuid language plpgsql as $f$
declare result_id uuid;
begin
 insert into public.trade_agreement_milestones(
  agreement_id,agreement_version_id,position,performer_id,payer_id,action_category,description,
  unit_label,units_total,indivisible,maximum_amount_cents,currency,evidence_rule,status)
 values((select object_id from qa_c1_objects where object_name='agreement'),
  (select object_id from qa_c1_objects where object_name='version'),p_position,
  (select profile_id from qa_c1_actors where actor_role=p_performer),
  (select profile_id from qa_c1_actors where actor_role=p_payer),
  'service',p_name,'unit',1,false,1000,'USD','Private reciprocal QA evidence','terms')
 returning id into result_id;
 insert into qa_c1_objects values(p_name,result_id); return result_id;
end;$f$;
select pg_temp.c1_milestone('a_milestone',1,'a','b');
select pg_temp.c1_milestone('b_milestone',2,'b','a');
select pg_temp.c1_milestone('reviewer_milestone',3,'a','b');
update public.trade_agreement_versions set milestone_manifest_hash=repeat('c',64),complete_terms_hash=repeat('d',64)
where id=(select object_id from qa_c1_objects where object_name='version');

create or replace function pg_temp.c1_review(p_milestone text,p_review text)
returns uuid language plpgsql as $f$
declare m uuid:=(select object_id from qa_c1_objects where object_name=p_milestone);
 b uuid;r uuid;p uuid;basis integer;amount bigint;performer uuid;payer uuid;
begin
 select performer_id,payer_id into performer,payer from public.trade_agreement_milestones where id=m;
 insert into public.trade_evidence_bundles(milestone_id,submitted_by,bundle_kind,attempt_number,status,submitted_at,reviewed_at)
 values(m,performer,'initial',1,'accepted',now(),now()) returning id into b;
 select payout_basis_points,amount_due_cents into basis,amount from public.trade_milestone_payout_v1(1000::bigint,1::numeric,1::numeric,100::smallint);
 insert into public.trade_milestone_reviews(
  milestone_id,bundle_id,reviewer_id,review_kind,outcome,completion_units,confidence_band,payout_basis_points,
  amount_due_cents,private_reason,appeal_deadline_at,is_final,finalized_at)
 values(m,b,(select profile_id from qa_c1_actors where actor_role='reviewer'),'initial','graded',1,100,basis,amount,
  'Reciprocal QA review',now()+interval '7 days',true,now()) returning id into r;
 insert into public.trade_milestone_payouts(
  milestone_id,review_id,payer_id,payee_id,maximum_amount_cents,completion_units,units_total,confidence_band,
  payout_basis_points,amount_due_cents,currency,is_final,status,finalized_at)
 values(m,r,payer,performer,1000,1,1,100,basis,amount,'USD',true,'due',now()) returning id into p;
 update public.trade_agreement_milestones set final_review_id=r,status='graded' where id=m;
 insert into qa_c1_objects values(p_review,r),(p_milestone||'_payout',p); return r;
end;$f$;
select pg_temp.c1_review('a_milestone','a_review');
select pg_temp.c1_review('b_milestone','b_review');
select pg_temp.c1_review('reviewer_milestone','reviewer_review');

create temporary table qa_c1_baseline as select
 (select count(*) from public.credibility_events) active_events,
 (select count(*) from public.credibility_public_aggregates) active_aggregates,
 (select count(*) from public.credibility_restrictions) active_restrictions;

select set_config('request.jwt.claim.sub','',true);
select set_config('request.jwt.claims','{"role":"service_role"}',true);
create or replace function pg_temp.c1_service_record(p_milestone text,p_review text,p_decision text)
returns uuid language plpgsql as $f$
declare response jsonb;result_id uuid;
begin
 response:=public.record_trade_evidence_decision_v1(
  p_milestone_id=>(select object_id from qa_c1_objects where object_name=p_milestone),
  p_review_id=>(select object_id from qa_c1_objects where object_name=p_review),
  p_decision_confidence_band=>100::smallint,p_primary_provenance_class=>'independent_third_party'::text,
  p_provider_authentication_status=>'not_applicable'::text,p_provider_authentication_ref=>''::text,
  p_adjudication_class=>'neutral_review_final'::text,p_contradiction_status=>'none'::text,
  p_integrity_finding=>'not_assessed'::text,p_responsiveness_finding=>'on_time'::text,
  p_dispute_conduct_finding=>'cooperative'::text,p_finality_reason=>'review_final'::text,
  p_exclusion_reason=>''::text,p_supersedes_decision_id=>null::uuid);
 result_id:=(response->>'decisionId')::uuid;insert into qa_c1_objects values(p_decision,result_id);return result_id;
end;$f$;
select pg_temp.c1_service_record('a_milestone','a_review','a_decision');
select pg_temp.c1_service_record('b_milestone','b_review','b_decision');

do $t$
declare a_id uuid:=(select profile_id from qa_c1_actors where actor_role='a');
 b_id uuid:=(select profile_id from qa_c1_actors where actor_role='b');
begin
 if not exists(select 1 from public.credibility_shadow_events where evidence_decision_id=(select object_id from qa_c1_objects where object_name='a_decision') and dimension='fulfilment' and profile_id=a_id and counterparty_id=b_id)
 then raise exception 'A milestone was not scored to its actual performer.'; end if;
 if not exists(select 1 from public.credibility_shadow_events where evidence_decision_id=(select object_id from qa_c1_objects where object_name='b_decision') and dimension='fulfilment' and profile_id=b_id and counterparty_id=a_id)
 then raise exception 'B milestone was not scored to its actual performer.'; end if;
 if exists(select 1 from public.credibility_shadow_events where evidence_decision_id=(select object_id from qa_c1_objects where object_name='a_decision') and profile_id=b_id)
  or exists(select 1 from public.credibility_shadow_events where evidence_decision_id=(select object_id from qa_c1_objects where object_name='b_decision') and profile_id=a_id)
 then raise exception 'Reciprocal milestones awarded fulfilment to the wrong party.'; end if;
end;$t$;

-- Direct table access remains unavailable to ordinary API roles.
do $t$
declare f oid:=to_regprocedure('public.record_trade_evidence_decision_v1(uuid,uuid,smallint,text,text,text,text,text,text,text,text,text,text,uuid)');
begin
 if has_table_privilege('anon','public.trade_evidence_decisions','SELECT')
  or has_table_privilege('authenticated','public.trade_evidence_decisions','SELECT')
  or has_table_privilege('authenticated','public.trade_evidence_decisions','INSERT')
  or has_table_privilege('authenticated','public.credibility_shadow_events','SELECT')
 then raise exception 'Ordinary API roles retained direct shadow-table privileges.'; end if;
 if has_function_privilege('anon',f,'EXECUTE') then raise exception 'Anonymous callers can execute the evidence-decision RPC.'; end if;
 if not has_function_privilege('authenticated',f,'EXECUTE') then raise exception 'Authenticated reviewers cannot reach the guarded RPC.'; end if;
end;$t$;

-- Reviewer role is AAL2-gated, and the final reviewer identity must match.
insert into public.trade_review_role_grants(profile_id,role,active,granted_by)
select reviewer.profile_id,'reviewer',true,a.profile_id from qa_c1_actors reviewer cross join qa_c1_actors a
where reviewer.actor_role='reviewer' and a.actor_role='a'
on conflict(profile_id,role) do update set active=true,revoked_at=null,granted_by=excluded.granted_by;

select set_config('request.jwt.claim.sub',(select profile_id::text from qa_c1_actors where actor_role='reviewer'),true);
select set_config('request.jwt.claims',jsonb_build_object('role','authenticated','aal','aal1','sub',(select profile_id::text from qa_c1_actors where actor_role='reviewer'))::text,true);
do $t$ begin
 begin
  perform public.record_trade_evidence_decision_v1(
   p_milestone_id=>(select object_id from qa_c1_objects where object_name='reviewer_milestone'),
   p_review_id=>(select object_id from qa_c1_objects where object_name='reviewer_review'),
   p_decision_confidence_band=>100::smallint,p_primary_provenance_class=>'independent_third_party'::text,
   p_provider_authentication_status=>'not_applicable'::text,p_provider_authentication_ref=>''::text,
   p_adjudication_class=>'neutral_review_final'::text,p_contradiction_status=>'none'::text,
   p_integrity_finding=>'not_assessed'::text,p_responsiveness_finding=>'on_time'::text,
   p_dispute_conduct_finding=>'cooperative'::text,p_finality_reason=>'review_final'::text,
   p_exclusion_reason=>''::text,p_supersedes_decision_id=>null::uuid);
  raise exception 'AAL1 reviewer unexpectedly created a decision.';
 exception when others then if sqlerrm not like 'Evidence decisions require an active AAL2%' then raise; end if; end;
end;$t$;

select set_config('request.jwt.claims',jsonb_build_object('role','authenticated','aal','aal2','sub',(select profile_id::text from qa_c1_actors where actor_role='reviewer'))::text,true);
create temporary table qa_c1_reviewer_result as select public.record_trade_evidence_decision_v1(
 p_milestone_id=>(select object_id from qa_c1_objects where object_name='reviewer_milestone'),
 p_review_id=>(select object_id from qa_c1_objects where object_name='reviewer_review'),
 p_decision_confidence_band=>100::smallint,p_primary_provenance_class=>'independent_third_party'::text,
 p_provider_authentication_status=>'not_applicable'::text,p_provider_authentication_ref=>''::text,
 p_adjudication_class=>'neutral_review_final'::text,p_contradiction_status=>'none'::text,
 p_integrity_finding=>'not_assessed'::text,p_responsiveness_finding=>'on_time'::text,
 p_dispute_conduct_finding=>'cooperative'::text,p_finality_reason=>'review_final'::text,
 p_exclusion_reason=>''::text,p_supersedes_decision_id=>null::uuid) result;
insert into qa_c1_objects select 'reviewer_decision',(result->>'decisionId')::uuid from qa_c1_reviewer_result;

do $t$ begin
 if not exists(select 1 from public.trade_evidence_decisions where id=(select object_id from qa_c1_objects where object_name='reviewer_decision') and created_by=(select profile_id from qa_c1_actors where actor_role='reviewer'))
 then raise exception 'AAL2 final reviewer did not create the decision.'; end if;
end;$t$;

-- Non-administrator cannot read the operator differential.
do $t$ begin
 begin
  perform * from public.list_credibility_shadow_differential_v1(10,0);
  raise exception 'Reviewer unexpectedly accessed operator differential.';
 exception when others then if sqlerrm not like 'Shadow differential access requires an AAL2 administrator%' then raise; end if; end;
end;$t$;
insert into public.trade_review_role_grants(profile_id,role,active,granted_by)
select reviewer.profile_id,'administrator',true,a.profile_id from qa_c1_actors reviewer cross join qa_c1_actors a
where reviewer.actor_role='reviewer' and a.actor_role='a'
on conflict(profile_id,role) do update set active=true,revoked_at=null,granted_by=excluded.granted_by;
select count(*) from public.list_credibility_shadow_differential_v1(10,0);

-- Append-only history rejects updates and deletion, even for the service path.
select set_config('request.jwt.claim.sub','',true);select set_config('request.jwt.claims','{"role":"service_role"}',true);
do $t$ begin
 begin
  update public.trade_evidence_decisions set exclusion_reason='tampered' where id=(select object_id from qa_c1_objects where object_name='a_decision');
  raise exception 'Evidence decision update unexpectedly succeeded.';
 exception when others then if sqlerrm not like 'Shadow evidence and credibility history is append-only%' then raise; end if; end;
 begin
  delete from public.credibility_shadow_events where evidence_decision_id=(select object_id from qa_c1_objects where object_name='a_decision');
  raise exception 'Shadow event deletion unexpectedly succeeded.';
 exception when others then if sqlerrm not like 'Shadow evidence and credibility history is append-only%' then raise; end if; end;
end;$t$;

do $t$ begin
 if not exists(select 1 from public.credibility_shadow_controls where control_key='evidence_decision_v2' and mode='shadow' and not milestone_cutover_enabled and not public_effects_enabled and not ranking_effects_enabled and not eligibility_effects_enabled)
 then raise exception 'Shadow controls are not fail-closed.'; end if;
 if (select count(*) from public.credibility_events)<>(select active_events from qa_c1_baseline)
  or (select count(*) from public.credibility_public_aggregates)<>(select active_aggregates from qa_c1_baseline)
  or (select count(*) from public.credibility_restrictions)<>(select active_restrictions from qa_c1_baseline)
 then raise exception 'C1 shadow QA changed active credibility state.'; end if;
end;$t$;

rollback;
