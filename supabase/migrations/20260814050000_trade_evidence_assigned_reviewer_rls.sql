-- Permit only participants, assigned evidence reviewers, assigned appeal
-- reviewers, and administrators to read submitted private milestone evidence.
-- The prior policies joined agreements inside the RLS predicate. Because an
-- independent reviewer cannot read the participant-only agreement row, that
-- join silently hid the submitted packet even after reviewer assignment.

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
      or milestone.assigned_reviewer_id = p_actor_id
      or exists (
        select 1
        from public.trade_milestone_appeals appeal
        where appeal.milestone_id = milestone.id
          and appeal.assigned_reviewer_id = p_actor_id
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

drop policy if exists "trade_evidence_bundles_authorized_select"
  on public.trade_evidence_bundles;
create policy "trade_evidence_bundles_authorized_select"
on public.trade_evidence_bundles
for select
to authenticated
using (
  submitted_by = (select auth.uid())
  or (
    status <> 'draft'
    and moral_trade_private.can_read_trade_evidence_v1(
      milestone_id,
      (select auth.uid())
    )
  )
);

drop policy if exists "trade_evidence_bundle_items_authorized_select"
  on public.trade_evidence_bundle_items;
create policy "trade_evidence_bundle_items_authorized_select"
on public.trade_evidence_bundle_items
for select
to authenticated
using (
  exists (
    select 1
    from public.trade_evidence_bundles bundle
    where bundle.id = trade_evidence_bundle_items.bundle_id
      and (
        (
          bundle.status = 'draft'
          and bundle.submitted_by = (select auth.uid())
        )
        or (
          bundle.status <> 'draft'
          and moral_trade_private.can_read_trade_evidence_v1(
            bundle.milestone_id,
            (select auth.uid())
          )
        )
      )
  )
);
