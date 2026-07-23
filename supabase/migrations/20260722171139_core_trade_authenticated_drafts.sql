drop policy if exists "core_loop_events_owner_insert" on public.core_loop_events;
create policy "core_loop_events_owner_insert"
on public.core_loop_events
for insert
to authenticated
with check (
  profile_id = (select auth.uid())
  and event_type in ('offer_draft_saved', 'offer_submitted')
  and entity_type = 'offer'
  and entity_id is not null
  and exists (
    select 1
    from public.offers offer
    where offer.id = core_loop_events.entity_id
      and offer.owner_id = (select auth.uid())
  )
  and idempotency_key = concat(
    event_type,
    ':',
    profile_id::text,
    ':offer:',
    entity_id::text
  )
);

drop policy if exists "trade_review_events_owner_insert" on public.trade_review_events;
create policy "trade_review_events_owner_insert"
on public.trade_review_events
for insert
to authenticated
with check (
  reviewer_id is null
  and action in ('submitted', 'duplicate_flagged')
  and exists (
    select 1
    from public.offers offer
    where offer.id = trade_review_events.offer_id
      and offer.owner_id = (select auth.uid())
  )
);

grant insert on public.core_loop_events to authenticated;
grant insert on public.trade_review_events to authenticated;

comment on policy "core_loop_events_owner_insert" on public.core_loop_events is
  'Lets a signed-in participant write only idempotent draft/submission analytics for an offer they own.';

comment on policy "trade_review_events_owner_insert" on public.trade_review_events is
  'Lets an offer owner enqueue their own submission or record a duplicate attempt without reviewer authority.';
