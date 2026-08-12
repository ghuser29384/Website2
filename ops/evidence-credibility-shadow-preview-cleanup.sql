\set ON_ERROR_STOP on

-- Exact isolated-QA cleanup for the private evidence-credibility Preview gate.
-- The fixed IDs belong only to the existing evidence-payment browser fixture.
-- Append-only calibration triggers are bypassed only inside this tightly scoped
-- cleanup transaction; production is never a permitted target.

begin;
set local session_replication_role = replica;

create temporary table qa_ec_decisions(id uuid primary key) on commit drop;
insert into qa_ec_decisions(id)
select decision_record.id
from public.trade_evidence_decisions decision_record
where decision_record.milestone_id in (
  '74000000-0000-4000-8000-000000000001',
  '74000000-0000-4000-8000-000000000002'
);

create temporary table qa_ec_settlement_decisions(id uuid primary key) on commit drop;
insert into qa_ec_settlement_decisions(id)
select decision_record.id
from public.trade_settlement_shadow_decisions decision_record
where decision_record.payout_id in (
  '77000000-0000-4000-8000-000000000001',
  '77000000-0000-4000-8000-000000000002'
);

create temporary table qa_ec_draws(
  id uuid primary key,
  sampling_run_id uuid not null
) on commit drop;
insert into qa_ec_draws(id, sampling_run_id)
select draw.id, draw.sampling_run_id
from public.evidence_credibility_calibration_draws draw
where draw.evidence_decision_id in (select id from qa_ec_decisions)
   or draw.settlement_decision_id in (select id from qa_ec_settlement_decisions);

create temporary table qa_ec_assignments(id uuid primary key) on commit drop;
insert into qa_ec_assignments(id)
select assignment.id
from public.evidence_credibility_calibration_audit_assignments assignment
where assignment.draw_id in (select id from qa_ec_draws);

create temporary table qa_ec_exports(id uuid primary key) on commit drop;
insert into qa_ec_exports(id)
select export_record.id
from public.evidence_credibility_calibration_exports export_record
where export_record.source_key like 'qa-export:%';

delete from public.evidence_credibility_calibration_export_rows export_row
where export_row.export_id in (select id from qa_ec_exports);

delete from public.evidence_credibility_calibration_exports export_record
where export_record.id in (select id from qa_ec_exports);

delete from public.evidence_credibility_calibration_labels label
where label.assignment_id in (select id from qa_ec_assignments);

delete from public.evidence_credibility_calibration_assignment_events event_record
where event_record.assignment_id in (select id from qa_ec_assignments);

delete from public.evidence_credibility_calibration_audit_assignments assignment
where assignment.id in (select id from qa_ec_assignments);

delete from public.evidence_credibility_calibration_draws draw
where draw.id in (select id from qa_ec_draws);

delete from public.evidence_credibility_calibration_sampling_runs sampling_run
where sampling_run.id in (select distinct sampling_run_id from qa_ec_draws)
  and not exists (
    select 1
    from public.evidence_credibility_calibration_draws remaining_draw
    where remaining_draw.sampling_run_id = sampling_run.id
  );

delete from public.trade_shadow_capture_records capture_record
where capture_record.evidence_decision_id in (select id from qa_ec_decisions)
   or capture_record.settlement_decision_id in (
     select id from qa_ec_settlement_decisions
   );

delete from public.credibility_shadow_restriction_signals restriction_signal
where restriction_signal.evidence_decision_id in (select id from qa_ec_decisions)
   or restriction_signal.settlement_decision_id in (
     select id from qa_ec_settlement_decisions
   )
   or restriction_signal.profile_id in (
     '71000000-0000-4000-8000-000000000001',
     '71000000-0000-4000-8000-000000000002',
     '71000000-0000-4000-8000-000000000003',
     '71000000-0000-4000-8000-000000000004',
     '71000000-0000-4000-8000-000000000005',
     '71000000-0000-4000-8000-000000000006'
   );

delete from public.credibility_shadow_events shadow_event
where shadow_event.evidence_decision_id in (select id from qa_ec_decisions)
   or shadow_event.settlement_decision_id in (
     select id from qa_ec_settlement_decisions
   );

delete from public.credibility_shadow_aggregates aggregate_record
where aggregate_record.profile_id in (
  '71000000-0000-4000-8000-000000000001',
  '71000000-0000-4000-8000-000000000002',
  '71000000-0000-4000-8000-000000000003',
  '71000000-0000-4000-8000-000000000004',
  '71000000-0000-4000-8000-000000000005',
  '71000000-0000-4000-8000-000000000006'
);

delete from public.trade_evidence_decisions decision_record
where decision_record.id in (select id from qa_ec_decisions);

delete from public.trade_settlement_shadow_decisions decision_record
where decision_record.id in (select id from qa_ec_settlement_decisions);

set local session_replication_role = origin;
commit;

-- Prove the calibration-specific fixture is gone before the existing payment
-- fixture cleanup removes the fixed agreement and Auth identities.
do $cleanup_check$
begin
  if exists (
    select 1
    from public.trade_evidence_decisions decision_record
    where decision_record.milestone_id in (
      '74000000-0000-4000-8000-000000000001',
      '74000000-0000-4000-8000-000000000002'
    )
  ) or exists (
    select 1
    from public.trade_settlement_shadow_decisions decision_record
    where decision_record.payout_id in (
      '77000000-0000-4000-8000-000000000001',
      '77000000-0000-4000-8000-000000000002'
    )
  ) or exists (
    select 1
    from public.evidence_credibility_calibration_exports export_record
    where export_record.source_key like 'qa-export:%'
  ) then
    raise exception 'Evidence-credibility Preview fixture residue remains.';
  end if;
end;
$cleanup_check$;
