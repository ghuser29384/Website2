\set ON_ERROR_STOP on

-- Trigger-safe, exact cleanup for the isolated-QA evidence-credibility Preview
-- acceptance fixture. Production is never a permitted target.
begin;
set local session_replication_role = replica;

create temporary table qa_ec_decisions(id uuid primary key) on commit drop;
insert into qa_ec_decisions(id)
select id
from public.trade_evidence_decisions
where milestone_id in (
  '74000000-0000-4000-8000-000000000001',
  '74000000-0000-4000-8000-000000000002'
);

create temporary table qa_ec_settlements(id uuid primary key) on commit drop;
insert into qa_ec_settlements(id)
select id
from public.trade_settlement_shadow_decisions
where payout_id in (
  '77000000-0000-4000-8000-000000000001',
  '77000000-0000-4000-8000-000000000002'
);

create temporary table qa_ec_draws(
  id uuid primary key,
  sampling_run_id uuid not null
) on commit drop;
insert into qa_ec_draws(id, sampling_run_id)
select id, sampling_run_id
from public.evidence_credibility_calibration_draws
where evidence_decision_id in (select id from qa_ec_decisions)
   or settlement_decision_id in (select id from qa_ec_settlements);

create temporary table qa_ec_assignments(id uuid primary key) on commit drop;
insert into qa_ec_assignments(id)
select id
from public.evidence_credibility_calibration_audit_assignments
where draw_id in (select id from qa_ec_draws);

create temporary table qa_ec_exports(id uuid primary key) on commit drop;
insert into qa_ec_exports(id)
select id
from public.evidence_credibility_calibration_exports
where source_key like 'qa-export:%';

delete from public.evidence_credibility_calibration_export_rows
where export_id in (select id from qa_ec_exports);
delete from public.evidence_credibility_calibration_exports
where id in (select id from qa_ec_exports);
delete from public.evidence_credibility_calibration_labels
where assignment_id in (select id from qa_ec_assignments);
delete from public.evidence_credibility_calibration_assignment_events
where assignment_id in (select id from qa_ec_assignments);
delete from public.evidence_credibility_calibration_audit_assignments
where id in (select id from qa_ec_assignments);
delete from public.evidence_credibility_calibration_draws
where id in (select id from qa_ec_draws);
delete from public.evidence_credibility_calibration_sampling_runs sampling_run
where sampling_run.id in (select distinct sampling_run_id from qa_ec_draws)
  and not exists (
    select 1
    from public.evidence_credibility_calibration_draws remaining_draw
    where remaining_draw.sampling_run_id = sampling_run.id
  );

delete from public.trade_shadow_capture_records
where evidence_decision_id in (select id from qa_ec_decisions)
   or settlement_decision_id in (select id from qa_ec_settlements);
delete from public.credibility_shadow_restriction_signals
where evidence_decision_id in (select id from qa_ec_decisions)
   or profile_id in (
     '71000000-0000-4000-8000-000000000001',
     '71000000-0000-4000-8000-000000000002',
     '71000000-0000-4000-8000-000000000003',
     '71000000-0000-4000-8000-000000000004',
     '71000000-0000-4000-8000-000000000005',
     '71000000-0000-4000-8000-000000000006'
   );
delete from public.credibility_shadow_events
where evidence_decision_id in (select id from qa_ec_decisions)
   or settlement_decision_id in (select id from qa_ec_settlements);
delete from public.credibility_shadow_aggregates
where profile_id in (
  '71000000-0000-4000-8000-000000000001',
  '71000000-0000-4000-8000-000000000002',
  '71000000-0000-4000-8000-000000000003',
  '71000000-0000-4000-8000-000000000004',
  '71000000-0000-4000-8000-000000000005',
  '71000000-0000-4000-8000-000000000006'
);
delete from public.trade_evidence_decisions
where id in (select id from qa_ec_decisions);
delete from public.trade_settlement_shadow_decisions
where id in (select id from qa_ec_settlements);

create temporary table qa_payment_payouts(id uuid primary key) on commit drop;
insert into qa_payment_payouts(id)
select payout.id
from public.trade_milestone_payouts payout
join public.trade_agreement_milestones milestone
  on milestone.id = payout.milestone_id
where milestone.agreement_id in (
  '72000000-0000-4000-8000-000000000001',
  '72000000-0000-4000-8000-000000000002'
);

create temporary table qa_payment_cases(id uuid primary key) on commit drop;
insert into qa_payment_cases(id)
select id
from public.trade_payment_review_cases
where payout_id in (select id from qa_payment_payouts);

delete from public.trade_payment_appeals
where case_id in (select id from qa_payment_cases);
delete from public.trade_payment_review_decisions
where case_id in (select id from qa_payment_cases);
delete from public.trade_payment_review_cases
where id in (select id from qa_payment_cases);
delete from public.trade_external_payment_receipts
where payout_id in (select id from qa_payment_payouts);
delete from public.agreements
where id in (
  '72000000-0000-4000-8000-000000000001',
  '72000000-0000-4000-8000-000000000002'
);
delete from public.trade_notifications
where user_id in (
  '71000000-0000-4000-8000-000000000001',
  '71000000-0000-4000-8000-000000000002',
  '71000000-0000-4000-8000-000000000003',
  '71000000-0000-4000-8000-000000000004',
  '71000000-0000-4000-8000-000000000005',
  '71000000-0000-4000-8000-000000000006'
);
delete from public.trade_review_role_grants
where profile_id in (
  '71000000-0000-4000-8000-000000000001',
  '71000000-0000-4000-8000-000000000002',
  '71000000-0000-4000-8000-000000000003',
  '71000000-0000-4000-8000-000000000004',
  '71000000-0000-4000-8000-000000000005',
  '71000000-0000-4000-8000-000000000006'
);
delete from auth.mfa_factors
where user_id in (
  '71000000-0000-4000-8000-000000000001',
  '71000000-0000-4000-8000-000000000002',
  '71000000-0000-4000-8000-000000000003',
  '71000000-0000-4000-8000-000000000004',
  '71000000-0000-4000-8000-000000000005',
  '71000000-0000-4000-8000-000000000006'
);
delete from auth.sessions
where user_id in (
  '71000000-0000-4000-8000-000000000001',
  '71000000-0000-4000-8000-000000000002',
  '71000000-0000-4000-8000-000000000003',
  '71000000-0000-4000-8000-000000000004',
  '71000000-0000-4000-8000-000000000005',
  '71000000-0000-4000-8000-000000000006'
);
delete from auth.refresh_tokens
where user_id in (
  '71000000-0000-4000-8000-000000000001',
  '71000000-0000-4000-8000-000000000002',
  '71000000-0000-4000-8000-000000000003',
  '71000000-0000-4000-8000-000000000004',
  '71000000-0000-4000-8000-000000000005',
  '71000000-0000-4000-8000-000000000006'
);
update auth.users
set encrypted_password =
      extensions.crypt(gen_random_uuid()::text, extensions.gen_salt('bf')),
    banned_until = now() + interval '100 years',
    updated_at = now()
where id in (
  '71000000-0000-4000-8000-000000000001',
  '71000000-0000-4000-8000-000000000002',
  '71000000-0000-4000-8000-000000000003',
  '71000000-0000-4000-8000-000000000004',
  '71000000-0000-4000-8000-000000000005',
  '71000000-0000-4000-8000-000000000006'
);

set local session_replication_role = origin;
commit;

do $cleanup_check$
begin
  if exists (
    select 1 from public.agreements
    where id in (
      '72000000-0000-4000-8000-000000000001',
      '72000000-0000-4000-8000-000000000002'
    )
  ) or exists (
    select 1 from public.trade_evidence_decisions
    where milestone_id in (
      '74000000-0000-4000-8000-000000000001',
      '74000000-0000-4000-8000-000000000002'
    )
  ) or exists (
    select 1 from public.trade_settlement_shadow_decisions
    where payout_id in (
      '77000000-0000-4000-8000-000000000001',
      '77000000-0000-4000-8000-000000000002'
    )
  ) or exists (
    select 1 from public.evidence_credibility_calibration_exports
    where source_key like 'qa-export:%'
  ) or exists (
    select 1 from auth.mfa_factors
    where user_id in (
      '71000000-0000-4000-8000-000000000003',
      '71000000-0000-4000-8000-000000000004',
      '71000000-0000-4000-8000-000000000006'
    )
  ) then
    raise exception 'Exact evidence-credibility Preview fixture residue remains.';
  end if;
end;
$cleanup_check$;
