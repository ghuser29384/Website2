begin;

alter table public.moral_trade_feed_create_links
  add column if not exists delivered_thread_id uuid references public.trade_threads(id) on delete set null,
  add column if not exists delivered_counterproposal_id uuid references public.trade_counterproposals(id) on delete set null,
  add column if not exists delivered_at timestamptz,
  add column if not exists reviewed_by uuid references public.profiles(id) on delete set null;

create unique index if not exists moral_trade_feed_create_links_delivered_proposal_uidx
  on public.moral_trade_feed_create_links(delivered_counterproposal_id)
  where delivered_counterproposal_id is not null;

create or replace function public.moral_trade_feed_create_guard_offer_update()
returns trigger
language plpgsql
set search_path = pg_catalog, public
as $function$
declare
  link_row public.moral_trade_feed_create_links%rowtype;
  source_row public.offers%rowtype;
begin
  select * into link_row
  from public.moral_trade_feed_create_links
  where derived_offer_id = old.id
  limit 1;
  if link_row.id is null then return new; end if;

  if new.owner_id is distinct from old.owner_id or new.mode::text <> 'pledge' then
    raise exception using errcode = '23514', message = 'A Feed-derived counteroffer cannot change its creator or trade mode.';
  end if;
  if current_setting('app.feed_create_private_delivery', true) = '1' then return new; end if;
  if new.workflow_status = 'published' or new.status::text = 'open' or new.published_at is not null then
    raise exception using errcode = '42501', message = 'Feed-derived counteroffers are delivered privately through review; they are never published as public inventory.';
  end if;

  if new.workflow_status = 'pending_review' then
    select * into source_row from public.offers where id = link_row.source_offer_id;
    if source_row.id is null
       or source_row.owner_id <> link_row.source_owner_profile_id
       or source_row.mode::text <> 'pledge'
       or source_row.status::text <> 'open'
       or source_row.workflow_status <> 'published'
       or source_row.closed_at is not null
       or source_row.deleted_at is not null
       or source_row.terms_version <> link_row.source_terms_version then
      raise exception using errcode = '23514', message = 'The original Feed offer changed or closed. This counteroffer cannot be resubmitted from the stale source revision.';
    end if;
  end if;
  return new;
end;
$function$;

create or replace function public.moral_trade_feed_create_deliver_service(
  p_reviewer_id uuid,
  p_derived_offer_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, auth
as $function$
declare
  link_row public.moral_trade_feed_create_links%rowtype;
  derived_row public.offers%rowtype;
  source_row public.offers%rowtype;
  thread_row public.trade_threads%rowtype;
  proposal_row public.trade_counterproposals%rowtype;
  next_version integer;
  now_value timestamptz := timezone('utc', now());
  proposal_key text;
begin
  if auth.role() <> 'service_role' then
    raise exception using errcode = '42501', message = 'service_role_required';
  end if;
  if p_reviewer_id is null or p_derived_offer_id is null then
    raise exception using errcode = '22023', message = 'Reviewer and derived offer are required.';
  end if;

  perform pg_advisory_xact_lock(hashtextextended('feed-create-delivery:' || p_derived_offer_id::text, 0));
  select * into link_row from public.moral_trade_feed_create_links
  where derived_offer_id = p_derived_offer_id for update;
  if link_row.id is null then
    raise exception using errcode = 'P0002', message = 'Feed-derived proposal link not found.';
  end if;
  if link_row.delivered_counterproposal_id is not null then
    return jsonb_build_object('created', false, 'threadId', link_row.delivered_thread_id, 'counterproposalId', link_row.delivered_counterproposal_id);
  end if;

  select * into derived_row from public.offers where id = p_derived_offer_id for update;
  select * into source_row from public.offers where id = link_row.source_offer_id for update;
  if derived_row.id is null
     or derived_row.owner_id <> link_row.creator_profile_id
     or derived_row.mode::text <> 'pledge'
     or derived_row.workflow_status <> 'pending_review'
     or derived_row.status::text <> 'paused'
     or derived_row.published_at is not null
     or derived_row.deleted_at is not null then
    raise exception using errcode = '23514', message = 'The Feed-derived proposal is not awaiting operator review.';
  end if;
  if source_row.id is null
     or source_row.owner_id <> link_row.source_owner_profile_id
     or source_row.owner_id <> link_row.counterparty_profile_id
     or source_row.owner_id = link_row.creator_profile_id
     or source_row.mode::text <> 'pledge'
     or source_row.status::text <> 'open'
     or source_row.workflow_status <> 'published'
     or source_row.published_at is null
     or source_row.closed_at is not null
     or source_row.deleted_at is not null
     or source_row.terms_version <> link_row.source_terms_version then
    raise exception using errcode = '23514', message = 'The original Feed opportunity changed or closed. Review cannot deliver a stale counterproposal.';
  end if;
  if moral_trade_private.pair_is_blocked(link_row.creator_profile_id, link_row.source_owner_profile_id) then
    raise exception using errcode = '42501', message = 'This interaction is blocked.';
  end if;

  perform moral_trade_private.lock_pair(link_row.creator_profile_id, link_row.source_owner_profile_id);
  select * into thread_row from public.trade_threads
  where offer_id = source_row.id and status <> 'closed'
    and least(participant_a, participant_b) = least(link_row.creator_profile_id, link_row.source_owner_profile_id)
    and greatest(participant_a, participant_b) = greatest(link_row.creator_profile_id, link_row.source_owner_profile_id)
  order by created_at asc limit 1 for update;
  if thread_row.id is null then
    insert into public.trade_threads(offer_id, participant_a, participant_b, status, last_message_at, created_at, updated_at)
    values (source_row.id, source_row.owner_id, link_row.creator_profile_id, 'active', now_value, now_value, now_value)
    returning * into thread_row;
  end if;

  update public.trade_counterproposals set status = 'superseded', responded_at = now_value
  where thread_id = thread_row.id and status = 'proposed';
  select coalesce(max(version), 0) + 1 into next_version from public.trade_counterproposals where thread_id = thread_row.id;
  proposal_key := 'feed-create-private-delivery:' || link_row.id::text;

  insert into public.trade_counterproposals(
    thread_id, offer_id, proposer_id, version, status, proposed_action, requested_action,
    duration, start_date, evidence_rule, evidence_due_date, exit_conditions, maximum_burden,
    privacy_scope, no_trade_baseline, terms_hash, created_at, submission_key, milestone_terms
  ) values (
    thread_row.id, source_row.id, link_row.creator_profile_id, next_version, 'proposed',
    derived_row.offer_action, derived_row.request_action, derived_row.duration, derived_row.start_date,
    derived_row.verification, derived_row.evidence_due_date, derived_row.exit_conditions,
    derived_row.maximum_burden, derived_row.privacy_scope, derived_row.no_trade_baseline,
    public.core_trade_terms_hash(
      derived_row.offer_action, derived_row.request_action, derived_row.duration, derived_row.start_date,
      derived_row.verification, derived_row.evidence_due_date, derived_row.exit_conditions,
      derived_row.maximum_burden, derived_row.privacy_scope, derived_row.no_trade_baseline
    ),
    now_value, proposal_key, '[]'::jsonb
  ) returning * into proposal_row;

  update public.trade_threads set last_message_at = now_value, updated_at = now_value where id = thread_row.id;
  perform set_config('app.feed_create_private_delivery', '1', true);
  update public.offers set status = 'closed', workflow_status = 'closed',
    moderation_reason = 'Approved and delivered privately as a source-bound counterproposal.',
    published_at = null, closed_at = now_value, updated_at = now_value
  where id = derived_row.id;
  perform set_config('app.feed_create_private_delivery', '', true);

  update public.moral_trade_feed_create_links set delivered_thread_id = thread_row.id,
    delivered_counterproposal_id = proposal_row.id, delivered_at = now_value,
    reviewed_by = p_reviewer_id, updated_at = now_value where id = link_row.id;

  insert into public.trade_review_events(offer_id, reviewer_id, action, reason, metadata)
  values (derived_row.id, p_reviewer_id, 'approved_private_delivery',
    'Approved and delivered to the exact Feed counterparty without public publication.',
    jsonb_build_object('sourceOfferId', source_row.id, 'feedCreateLinkId', link_row.id,
      'threadId', thread_row.id, 'counterproposalId', proposal_row.id,
      'sourceTermsVersion', link_row.source_terms_version));

  insert into public.core_loop_events(profile_id, event_type, entity_type, entity_id, idempotency_key, metadata)
  values (link_row.creator_profile_id, 'counterproposal_sent', 'trade_counterproposal', proposal_row.id,
    'feed_create_counterproposal_sent:' || link_row.id::text,
    jsonb_build_object('source', 'feed_create_v1', 'sourceOfferId', source_row.id, 'threadId', thread_row.id))
  on conflict (idempotency_key) do nothing;

  insert into public.trade_notifications(user_id, notification_type, title, body, href, dedupe_key, created_at)
  values
    (source_row.owner_id, 'counterproposal_received', 'New counterproposal',
      'A participant responded to your published offer with reviewed private terms.',
      '/messages/' || thread_row.id::text,
      'feed_create_counterproposal_received:' || proposal_row.id::text || ':' || source_row.owner_id::text, now_value),
    (link_row.creator_profile_id, 'counterproposal_delivered', 'Counterproposal delivered',
      'Operator review passed. Your proposal was delivered privately to the exact counterparty and was not published as a separate public offer.',
      '/messages/' || thread_row.id::text,
      'feed_create_counterproposal_delivered:' || proposal_row.id::text || ':' || link_row.creator_profile_id::text, now_value)
  on conflict (dedupe_key) do nothing;

  return jsonb_build_object('created', true, 'threadId', thread_row.id,
    'counterproposalId', proposal_row.id, 'sourceOfferId', source_row.id);
end;
$function$;

comment on function public.moral_trade_feed_create_deliver_service(uuid, uuid) is
  'Service-only atomic operator approval path for Feed-derived counteroffers. Revalidates the exact source revision, creates or reuses the private source thread, inserts one reviewed counterproposal, closes the private derived draft, and never publishes it as public inventory.';
revoke all on function public.moral_trade_feed_create_deliver_service(uuid, uuid) from public, anon, authenticated;
grant execute on function public.moral_trade_feed_create_deliver_service(uuid, uuid) to service_role;

notify pgrst, 'reload schema';
commit;
