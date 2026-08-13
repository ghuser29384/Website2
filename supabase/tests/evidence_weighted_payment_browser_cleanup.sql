\set ON_ERROR_STOP on

begin;

create temporary table qa_browser_cleanup_payouts
on commit drop
as
select payout.id
from public.trade_milestone_payouts payout
join public.trade_agreement_milestones milestone
  on milestone.id = payout.milestone_id
where milestone.agreement_id in (
  '72000000-0000-4000-8000-000000000001',
  '72000000-0000-4000-8000-000000000002'
);

create temporary table qa_browser_cleanup_payment_cases
on commit drop
as
select review_case.id
from public.trade_payment_review_cases review_case
where review_case.payout_id in (
  select payout.id from qa_browser_cleanup_payouts payout
);

delete from public.trade_payment_appeals
where case_id in (
  select review_case.id from qa_browser_cleanup_payment_cases review_case
);

delete from public.trade_payment_review_decisions
where decision_kind = 'appeal'
  and case_id in (
    select review_case.id from qa_browser_cleanup_payment_cases review_case
  );

delete from public.trade_payment_review_decisions
where case_id in (
  select review_case.id from qa_browser_cleanup_payment_cases review_case
);

delete from public.trade_payment_review_cases
where id in (
  select review_case.id from qa_browser_cleanup_payment_cases review_case
);

delete from public.trade_external_payment_receipts
where attempt_number = 2
  and payout_id in (
    select payout.id from qa_browser_cleanup_payouts payout
  );

delete from public.trade_external_payment_receipts
where attempt_number = 1
  and payout_id in (
    select payout.id from qa_browser_cleanup_payouts payout
  );

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

commit;
