-- Phase 1E: bind every private payment RLS predicate to the authenticated
-- caller, including the two leaf helpers added in Phase 1D. The functions
-- return booleans only and the moral_trade_private schema is not exposed
-- through the Data API, but caller binding also closes direct SQL oracles.

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

revoke all on function
  moral_trade_private.can_read_trade_payment_decision_v1(uuid, uuid)
from public, anon, authenticated;
revoke all on function
  moral_trade_private.can_read_trade_payment_appeal_v1(uuid, uuid)
from public, anon, authenticated;

grant execute on function
  moral_trade_private.can_read_trade_payment_decision_v1(uuid, uuid)
to authenticated;
grant execute on function
  moral_trade_private.can_read_trade_payment_appeal_v1(uuid, uuid)
to authenticated;
