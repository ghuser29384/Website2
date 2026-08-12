\set ON_ERROR_STOP on

begin;
set local session_replication_role = replica;

create temporary table qa_decisions(id uuid primary key) on commit drop;
insert into qa_decisions
select id from public.trade_evidence_decisions
where milestone_id in ('74000000-0000-4000-8000-000000000001','74000000-0000-4000-8000-000000000002');
create temporary table qa_settlements(id uuid primary key) on commit drop;
insert into qa_settlements
select id from public.trade_settlement_shadow_decisions
where payout_id in ('77000000-0000-4000-8000-000000000001','77000000-0000-4000-8000-000000000002');
create temporary table qa_draws(id uuid primary key, sampling_run_id uuid not null) on commit drop;
insert into qa_draws
select id,sampling_run_id from public.evidence_credibility_calibration_draws
where evidence_decision_id in (select id from qa_decisions)
   or settlement_decision_id in (select id from qa_settlements);
create temporary table qa_assignments(id uuid primary key) on commit drop;
insert into qa_assignments
select id from public.evidence_credibility_calibration_audit_assignments
where draw_id in (select id from qa_draws);
create temporary table qa_exports(id uuid primary key) on commit drop;
insert into qa_exports
select id from public.evidence_credibility_calibration_exports
where source_key like 'qa-export:%';

delete from public.evidence_credibility_calibration_export_rows where export_id in (select id from qa_exports);
delete from public.evidence_credibility_calibration_exports where id in (select id from qa_exports);
delete from public.evidence_credibility_calibration_labels where assignment_id in (select id from qa_assignments);
delete from public.evidence_credibility_calibration_assignment_events where assignment_id in (select id from qa_assignments);
delete from public.evidence_credibility_calibration_audit_assignments where id in (select id from qa_assignments);
delete from public.evidence_credibility_calibration_draws where id in (select id from qa_draws);
delete from public.evidence_credibility_calibration_sampling_runs r
where r.id in (select distinct sampling_run_id from qa_draws)
  and not exists (select 1 from public.evidence_credibility_calibration_draws d where d.sampling_run_id=r.id);
delete from public.trade_shadow_capture_records
where evidence_decision_id in (select id from qa_decisions)
   or settlement_decision_id in (select id from qa_settlements);
delete from public.credibility_shadow_restriction_signals
where evidence_decision_id in (select id from qa_decisions)
   or profile_id in ('71000000-0000-4000-8000-000000000001','71000000-0000-4000-8000-000000000002','71000000-0000-4000-8000-000000000003','71000000-0000-4000-8000-000000000004','71000000-0000-4000-8000-000000000005','71000000-0000-4000-8000-000000000006');
delete from public.credibility_shadow_events
where evidence_decision_id in (select id from qa_decisions)
   or settlement_decision_id in (select id from qa_settlements)
   or agreement_id in ('72000000-0000-4000-8000-000000000001','72000000-0000-4000-8000-000000000002');
delete from public.credibility_shadow_aggregates
where profile_id in ('71000000-0000-4000-8000-000000000001','71000000-0000-4000-8000-000000000002','71000000-0000-4000-8000-000000000003','71000000-0000-4000-8000-000000000004','71000000-0000-4000-8000-000000000005','71000000-0000-4000-8000-000000000006');
delete from public.trade_evidence_decisions where id in (select id from qa_decisions);
delete from public.trade_settlement_shadow_decisions where id in (select id from qa_settlements);

create temporary table qa_cases(id uuid primary key) on commit drop;
insert into qa_cases
select id from public.trade_payment_review_cases
where payout_id in ('77000000-0000-4000-8000-000000000001','77000000-0000-4000-8000-000000000002');
delete from public.trade_payment_appeals where case_id in (select id from qa_cases);
delete from public.trade_payment_review_decisions where case_id in (select id from qa_cases);
delete from public.trade_payment_reviewer_nominations where case_id in (select id from qa_cases);
delete from public.trade_payment_review_cases where id in (select id from qa_cases);
delete from public.trade_external_payment_receipts where payout_id in ('77000000-0000-4000-8000-000000000001','77000000-0000-4000-8000-000000000002');
delete from public.trade_milestone_appeals where milestone_id in ('74000000-0000-4000-8000-000000000001','74000000-0000-4000-8000-000000000002');
delete from public.trade_milestone_reviewer_nominations where milestone_id in ('74000000-0000-4000-8000-000000000001','74000000-0000-4000-8000-000000000002');
delete from public.trade_evidence_bundle_items where bundle_id in ('75000000-0000-4000-8000-000000000001','75000000-0000-4000-8000-000000000002');
delete from public.trade_milestone_payouts where id in ('77000000-0000-4000-8000-000000000001','77000000-0000-4000-8000-000000000002') or milestone_id in ('74000000-0000-4000-8000-000000000001','74000000-0000-4000-8000-000000000002');
delete from public.trade_milestone_reviews where id in ('76000000-0000-4000-8000-000000000001','76000000-0000-4000-8000-000000000002') or milestone_id in ('74000000-0000-4000-8000-000000000001','74000000-0000-4000-8000-000000000002');
delete from public.trade_evidence_bundles where id in ('75000000-0000-4000-8000-000000000001','75000000-0000-4000-8000-000000000002') or milestone_id in ('74000000-0000-4000-8000-000000000001','74000000-0000-4000-8000-000000000002');
delete from public.trade_agreement_confirmations where agreement_version_id in ('73000000-0000-4000-8000-000000000001','73000000-0000-4000-8000-000000000002');
delete from public.trade_agreement_milestones where id in ('74000000-0000-4000-8000-000000000001','74000000-0000-4000-8000-000000000002') or agreement_id in ('72000000-0000-4000-8000-000000000001','72000000-0000-4000-8000-000000000002');
delete from public.trade_agreement_versions where id in ('73000000-0000-4000-8000-000000000001','73000000-0000-4000-8000-000000000002') or agreement_id in ('72000000-0000-4000-8000-000000000001','72000000-0000-4000-8000-000000000002');
delete from public.agreements where id in ('72000000-0000-4000-8000-000000000001','72000000-0000-4000-8000-000000000002');

delete from public.trade_notifications where user_id in ('71000000-0000-4000-8000-000000000001','71000000-0000-4000-8000-000000000002','71000000-0000-4000-8000-000000000003','71000000-0000-4000-8000-000000000004','71000000-0000-4000-8000-000000000005','71000000-0000-4000-8000-000000000006');
delete from public.trade_review_role_grants where profile_id in ('71000000-0000-4000-8000-000000000001','71000000-0000-4000-8000-000000000002','71000000-0000-4000-8000-000000000003','71000000-0000-4000-8000-000000000004','71000000-0000-4000-8000-000000000005','71000000-0000-4000-8000-000000000006');
delete from auth.mfa_factors where user_id in ('71000000-0000-4000-8000-000000000001','71000000-0000-4000-8000-000000000002','71000000-0000-4000-8000-000000000003','71000000-0000-4000-8000-000000000004','71000000-0000-4000-8000-000000000005','71000000-0000-4000-8000-000000000006');
delete from auth.sessions where user_id in ('71000000-0000-4000-8000-000000000001','71000000-0000-4000-8000-000000000002','71000000-0000-4000-8000-000000000003','71000000-0000-4000-8000-000000000004','71000000-0000-4000-8000-000000000005','71000000-0000-4000-8000-000000000006');
delete from auth.refresh_tokens where user_id in ('71000000-0000-4000-8000-000000000001','71000000-0000-4000-8000-000000000002','71000000-0000-4000-8000-000000000003','71000000-0000-4000-8000-000000000004','71000000-0000-4000-8000-000000000005','71000000-0000-4000-8000-000000000006');
update auth.users
set encrypted_password=extensions.crypt(gen_random_uuid()::text,extensions.gen_salt('bf')),
    banned_until=now()+interval '100 years',
    updated_at=now()
where id in ('71000000-0000-4000-8000-000000000001','71000000-0000-4000-8000-000000000002','71000000-0000-4000-8000-000000000003','71000000-0000-4000-8000-000000000004','71000000-0000-4000-8000-000000000005','71000000-0000-4000-8000-000000000006');

set local session_replication_role = origin;
commit;

do $check$
begin
  if exists(select 1 from public.agreements where id in ('72000000-0000-4000-8000-000000000001','72000000-0000-4000-8000-000000000002'))
     or exists(select 1 from public.trade_agreement_versions where id in ('73000000-0000-4000-8000-000000000001','73000000-0000-4000-8000-000000000002'))
     or exists(select 1 from public.trade_agreement_milestones where id in ('74000000-0000-4000-8000-000000000001','74000000-0000-4000-8000-000000000002'))
     or exists(select 1 from public.trade_evidence_bundles where id in ('75000000-0000-4000-8000-000000000001','75000000-0000-4000-8000-000000000002'))
     or exists(select 1 from public.trade_milestone_reviews where id in ('76000000-0000-4000-8000-000000000001','76000000-0000-4000-8000-000000000002'))
     or exists(select 1 from public.trade_milestone_payouts where id in ('77000000-0000-4000-8000-000000000001','77000000-0000-4000-8000-000000000002'))
     or exists(select 1 from public.evidence_credibility_calibration_exports where source_key like 'qa-export:%')
     or exists(select 1 from auth.mfa_factors where user_id in ('71000000-0000-4000-8000-000000000003','71000000-0000-4000-8000-000000000004','71000000-0000-4000-8000-000000000006')) then
    raise exception 'Exact Preview fixture residue remains.';
  end if;
end;
$check$;
