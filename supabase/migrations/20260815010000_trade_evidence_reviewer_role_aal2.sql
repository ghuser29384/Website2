-- Keep participant evidence reads available at AAL1, while requiring every
-- assigned initial or appeal reviewer to hold an active reviewer grant in an
-- AAL2 session. Administrators retain their existing active-AAL2 role path.

create or replace function moral_trade_private.can_read_trade_evidence_v1(
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
      or (
        moral_trade_private.current_actor_has_trade_role('reviewer')
        and (
          milestone.assigned_reviewer_id = p_actor_id
          or exists (
            select 1
            from public.trade_milestone_appeals appeal
            where appeal.milestone_id = milestone.id
              and appeal.assigned_reviewer_id = p_actor_id
          )
        )
      )
      or moral_trade_private.current_actor_has_trade_role('administrator')
    )
  from public.trade_agreement_milestones milestone
  join public.agreements agreement on agreement.id = milestone.agreement_id
  where milestone.id = p_milestone_id;
$function$;

revoke all on function
  moral_trade_private.can_read_trade_evidence_v1(uuid, uuid)
from public, anon, authenticated;
grant execute on function
  moral_trade_private.can_read_trade_evidence_v1(uuid, uuid)
to authenticated;
