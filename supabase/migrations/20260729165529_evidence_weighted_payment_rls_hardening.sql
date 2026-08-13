-- Phase 1D: replace recursive cross-table RLS joins with identity-bound,
-- SECURITY DEFINER predicates. These helpers return only booleans, require the
-- caller to ask about auth.uid(), and remain outside the exposed API schema.

create or replace function moral_trade_private.can_read_trade_milestone_v1(
  p_milestone_id uuid,
  p_actor_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $function$
  select
    p_actor_id is not null
    and p_actor_id = auth.uid()
    and (
      p_actor_id in (agreement.proposer_id, agreement.responder_id)
      or milestone.assigned_reviewer_id = p_actor_id
      or exists (
        select 1
        from public.trade_milestone_appeals appeal
        where appeal.milestone_id = milestone.id
          and appeal.assigned_reviewer_id = p_actor_id
      )
      or exists (
        select 1
        from public.trade_milestone_payouts payout
        join public.trade_payment_review_cases review_case
          on review_case.payout_id = payout.id
        where payout.milestone_id = milestone.id
          and review_case.assigned_reviewer_id = p_actor_id
      )
      or exists (
        select 1
        from public.trade_milestone_payouts payout
        join public.trade_payment_review_cases review_case
          on review_case.payout_id = payout.id
        join public.trade_payment_appeals appeal
          on appeal.case_id = review_case.id
        where payout.milestone_id = milestone.id
          and appeal.assigned_reviewer_id = p_actor_id
      )
      or moral_trade_private.current_actor_has_trade_role('administrator')
    )
  from public.trade_agreement_milestones milestone
  join public.agreements agreement on agreement.id = milestone.agreement_id
  where milestone.id = p_milestone_id;
$function$;

create or replace function moral_trade_private.can_read_trade_payout_v1(
  p_payout_id uuid,
  p_actor_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $function$
  select
    p_actor_id is not null
    and p_actor_id = auth.uid()
    and (
      p_actor_id in (payout.payer_id, payout.payee_id)
      or milestone.assigned_reviewer_id = p_actor_id
      or exists (
        select 1
        from public.trade_milestone_appeals appeal
        where appeal.milestone_id = milestone.id
          and appeal.assigned_reviewer_id = p_actor_id
      )
      or exists (
        select 1
        from public.trade_payment_review_cases review_case
        where review_case.payout_id = payout.id
          and review_case.assigned_reviewer_id = p_actor_id
      )
      or exists (
        select 1
        from public.trade_payment_review_cases review_case
        join public.trade_payment_appeals appeal
          on appeal.case_id = review_case.id
        where review_case.payout_id = payout.id
          and appeal.assigned_reviewer_id = p_actor_id
      )
      or moral_trade_private.current_actor_has_trade_role('administrator')
    )
  from public.trade_milestone_payouts payout
  join public.trade_agreement_milestones milestone
    on milestone.id = payout.milestone_id
  where payout.id = p_payout_id;
$function$;

create or replace function moral_trade_private.can_read_trade_receipt_v1(
  p_receipt_id uuid,
  p_actor_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $function$
  select
    p_actor_id is not null
    and p_actor_id = auth.uid()
    and (
      p_actor_id in (payout.payer_id, payout.payee_id)
      or exists (
        select 1
        from public.trade_payment_review_cases review_case
        where review_case.payout_id = receipt.payout_id
          and review_case.payment_cycle = receipt.payment_cycle
          and review_case.assigned_reviewer_id = p_actor_id
      )
      or exists (
        select 1
        from public.trade_payment_review_cases review_case
        join public.trade_payment_appeals appeal
          on appeal.case_id = review_case.id
        where review_case.payout_id = receipt.payout_id
          and review_case.payment_cycle = receipt.payment_cycle
          and appeal.assigned_reviewer_id = p_actor_id
      )
      or moral_trade_private.current_actor_has_trade_role('administrator')
    )
  from public.trade_external_payment_receipts receipt
  join public.trade_milestone_payouts payout
    on payout.id = receipt.payout_id
  where receipt.id = p_receipt_id;
$function$;

create or replace function
moral_trade_private.is_trade_payment_case_participant_v1(
  p_case_id uuid,
  p_actor_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $function$
  select
    p_actor_id is not null
    and p_actor_id = auth.uid()
    and (
      p_actor_id in (payout.payer_id, payout.payee_id)
      or moral_trade_private.current_actor_has_trade_role('administrator')
    )
  from public.trade_payment_review_cases review_case
  join public.trade_milestone_payouts payout
    on payout.id = review_case.payout_id
  where review_case.id = p_case_id;
$function$;

create or replace function moral_trade_private.can_read_trade_payment_case_v1(
  p_case_id uuid,
  p_actor_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $function$
  select
    p_actor_id is not null
    and p_actor_id = auth.uid()
    and (
      p_actor_id in (payout.payer_id, payout.payee_id)
      or review_case.assigned_reviewer_id = p_actor_id
      or exists (
        select 1
        from public.trade_payment_appeals appeal
        where appeal.case_id = review_case.id
          and appeal.assigned_reviewer_id = p_actor_id
      )
      or moral_trade_private.current_actor_has_trade_role('administrator')
    )
  from public.trade_payment_review_cases review_case
  join public.trade_milestone_payouts payout
    on payout.id = review_case.payout_id
  where review_case.id = p_case_id;
$function$;

create or replace function
moral_trade_private.can_read_trade_payment_decision_v1(
  p_decision_id uuid,
  p_actor_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $function$
  select
    p_actor_id is not null
    and p_actor_id = auth.uid()
    and (
      decision.reviewer_id = p_actor_id
      or moral_trade_private.can_read_trade_payment_case_v1(
        decision.case_id,
        p_actor_id
      )
    )
  from public.trade_payment_review_decisions decision
  where decision.id = p_decision_id;
$function$;

create or replace function
moral_trade_private.can_read_trade_payment_appeal_v1(
  p_appeal_id uuid,
  p_actor_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $function$
  select
    p_actor_id is not null
    and p_actor_id = auth.uid()
    and (
      appeal.assigned_reviewer_id = p_actor_id
      or moral_trade_private.is_trade_payment_case_participant_v1(
        appeal.case_id,
        p_actor_id
      )
    )
  from public.trade_payment_appeals appeal
  where appeal.id = p_appeal_id;
$function$;

drop policy if exists "trade_agreement_milestones_authorized_select"
  on public.trade_agreement_milestones;
create policy "trade_agreement_milestones_authorized_select"
on public.trade_agreement_milestones
for select
to authenticated
using (
  moral_trade_private.can_read_trade_milestone_v1(
    id,
    (select auth.uid())
  )
);

drop policy if exists "trade_milestone_payouts_authorized_select"
  on public.trade_milestone_payouts;
create policy "trade_milestone_payouts_authorized_select"
on public.trade_milestone_payouts
for select
to authenticated
using (
  moral_trade_private.can_read_trade_payout_v1(
    id,
    (select auth.uid())
  )
);

drop policy if exists "trade_external_payment_receipts_participant_select"
  on public.trade_external_payment_receipts;
create policy "trade_external_payment_receipts_participant_select"
on public.trade_external_payment_receipts
for select
to authenticated
using (
  moral_trade_private.can_read_trade_receipt_v1(
    id,
    (select auth.uid())
  )
);

drop policy if exists "trade_payment_review_cases_authorized_select"
  on public.trade_payment_review_cases;
create policy "trade_payment_review_cases_authorized_select"
on public.trade_payment_review_cases
for select
to authenticated
using (
  moral_trade_private.can_read_trade_payment_case_v1(
    id,
    (select auth.uid())
  )
);

drop policy if exists "trade_payment_reviewer_nominations_participant_select"
  on public.trade_payment_reviewer_nominations;
create policy "trade_payment_reviewer_nominations_participant_select"
on public.trade_payment_reviewer_nominations
for select
to authenticated
using (
  moral_trade_private.is_trade_payment_case_participant_v1(
    case_id,
    (select auth.uid())
  )
);

drop policy if exists "trade_payment_review_decisions_authorized_select"
  on public.trade_payment_review_decisions;
create policy "trade_payment_review_decisions_authorized_select"
on public.trade_payment_review_decisions
for select
to authenticated
using (
  moral_trade_private.can_read_trade_payment_decision_v1(
    id,
    (select auth.uid())
  )
);

drop policy if exists "trade_payment_appeals_authorized_select"
  on public.trade_payment_appeals;
create policy "trade_payment_appeals_authorized_select"
on public.trade_payment_appeals
for select
to authenticated
using (
  moral_trade_private.can_read_trade_payment_appeal_v1(
    id,
    (select auth.uid())
  )
);

drop policy if exists
  "trade_payment_appeal_reviewer_nominations_participant_select"
  on public.trade_payment_appeal_reviewer_nominations;
create policy
  "trade_payment_appeal_reviewer_nominations_participant_select"
on public.trade_payment_appeal_reviewer_nominations
for select
to authenticated
using (
  exists (
    select 1
    from public.trade_payment_appeals appeal
    where appeal.id =
      trade_payment_appeal_reviewer_nominations.appeal_id
      and moral_trade_private.is_trade_payment_case_participant_v1(
        appeal.case_id,
        (select auth.uid())
      )
  )
);

revoke all on function
  moral_trade_private.can_read_trade_milestone_v1(uuid, uuid)
from public, anon, authenticated;
revoke all on function
  moral_trade_private.can_read_trade_payout_v1(uuid, uuid)
from public, anon, authenticated;
revoke all on function
  moral_trade_private.can_read_trade_receipt_v1(uuid, uuid)
from public, anon, authenticated;
revoke all on function
  moral_trade_private.is_trade_payment_case_participant_v1(uuid, uuid)
from public, anon, authenticated;
revoke all on function
  moral_trade_private.can_read_trade_payment_case_v1(uuid, uuid)
from public, anon, authenticated;
revoke all on function
  moral_trade_private.can_read_trade_payment_decision_v1(uuid, uuid)
from public, anon, authenticated;
revoke all on function
  moral_trade_private.can_read_trade_payment_appeal_v1(uuid, uuid)
from public, anon, authenticated;

grant execute on function
  moral_trade_private.can_read_trade_milestone_v1(uuid, uuid)
to authenticated;
grant execute on function
  moral_trade_private.can_read_trade_payout_v1(uuid, uuid)
to authenticated;
grant execute on function
  moral_trade_private.can_read_trade_receipt_v1(uuid, uuid)
to authenticated;
grant execute on function
  moral_trade_private.is_trade_payment_case_participant_v1(uuid, uuid)
to authenticated;
grant execute on function
  moral_trade_private.can_read_trade_payment_case_v1(uuid, uuid)
to authenticated;
grant execute on function
  moral_trade_private.can_read_trade_payment_decision_v1(uuid, uuid)
to authenticated;
grant execute on function
  moral_trade_private.can_read_trade_payment_appeal_v1(uuid, uuid)
to authenticated;
