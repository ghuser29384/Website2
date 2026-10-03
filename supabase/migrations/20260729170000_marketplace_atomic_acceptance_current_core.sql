-- Narrow marketplace integrity delta for the existing core-trade schema.
-- This migration deliberately does not add a second evidence/review state machine.

create or replace function public.accept_marketplace_interest_v1(
  p_interest_id uuid,
  p_offer_id uuid,
  p_notes text default ''
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, auth
as $function$
declare
  actor_id uuid := auth.uid();
  offer_row public.offers%rowtype;
  interest_row public.interests%rowtype;
  existing_agreement public.agreements%rowtype;
  agreement_row public.agreements%rowtype;
  agreement_id_value uuid;
  normalized_notes text := btrim(coalesce(p_notes, ''));
begin
  if actor_id is null then
    raise exception using errcode = '42501', message = 'A signed-in offer owner is required.';
  end if;
  if p_interest_id is null or p_offer_id is null then
    raise exception using errcode = '22023', message = 'Interest ID and offer ID are required.';
  end if;

  select * into offer_row
  from public.offers
  where id = p_offer_id
  for update;
  if not found then
    raise exception using errcode = 'P0002', message = 'Offer not found.';
  end if;
  if offer_row.owner_id <> actor_id then
    raise exception using errcode = '42501', message = 'Only the offer owner can accept interest.';
  end if;

  select * into interest_row
  from public.interests
  where id = p_interest_id
  for update;
  if not found then
    raise exception using errcode = 'P0002', message = 'Interest not found.';
  end if;
  if interest_row.offer_id <> offer_row.id then
    raise exception using errcode = '23514', message = 'That interest is not attached to this offer.';
  end if;
  if interest_row.user_id = actor_id then
    raise exception using errcode = '23514', message = 'An offer owner cannot accept their own response.';
  end if;

  select * into existing_agreement
  from public.agreements
  where interest_id = interest_row.id
  limit 1;
  if existing_agreement.id is not null then
    if existing_agreement.offer_id is distinct from offer_row.id
       or existing_agreement.proposer_id is distinct from actor_id
       or existing_agreement.responder_id is distinct from interest_row.user_id then
      raise exception using errcode = '23514', message = 'The existing agreement does not match this response.';
    end if;
    return jsonb_build_object('agreement', to_jsonb(existing_agreement), 'created', false);
  end if;

  if offer_row.status::text <> 'open' or offer_row.workflow_status <> 'published' then
    raise exception using errcode = '23514', message = 'This offer is not open for acceptance.';
  end if;
  if interest_row.status::text <> 'pending' then
    raise exception using errcode = '23514', message = 'Only a pending response can be accepted.';
  end if;
  if offer_row.mode::text = 'offset' and exists (
    select 1 from public.donation_offset_offers offset_offer
    where offset_offer.offer_id = offer_row.id
      and offset_offer.participation_mode = 'pool'
  ) then
    raise exception using errcode = '23514', message = 'Pool commitments cannot be accepted one-to-one.';
  end if;

  update public.interests
  set status = 'accepted', updated_at = now()
  where id = interest_row.id;

  perform set_config('app.core_trade_linking_agreement', '1', true);
  perform set_config('app.core_trade_internal', '1', true);

  insert into public.agreements(
    offer_id,
    interest_id,
    proposer_id,
    responder_id,
    status,
    lifecycle_status,
    notes,
    evidence_due_at,
    created_at,
    updated_at
  ) values (
    offer_row.id,
    interest_row.id,
    actor_id,
    interest_row.user_id,
    'proposed',
    'proposed',
    normalized_notes,
    offer_row.evidence_due_date,
    now(),
    now()
  ) returning id into agreement_id_value;

  perform set_config('app.core_trade_linking_agreement', '', true);
  perform set_config('app.core_trade_internal', '', true);

  update public.interests
  set status = 'declined', updated_at = now()
  where offer_id = offer_row.id
    and id <> interest_row.id
    and status::text = 'pending';

  update public.guest_interests
  set status = 'declined', updated_at = now()
  where offer_id = offer_row.id
    and status::text = 'pending';

  update public.offers
  set status = 'matched', workflow_status = 'closed', closed_at = now(), updated_at = now()
  where id = offer_row.id;

  select * into agreement_row
  from public.agreements
  where id = agreement_id_value;
  if agreement_row.id is null or agreement_row.current_version_id is null then
    raise exception 'The agreement could not be linked to one frozen version.';
  end if;

  return jsonb_build_object('agreement', to_jsonb(agreement_row), 'created', true);
end;
$function$;

comment on function public.accept_marketplace_interest_v1(uuid, uuid, text) is
  'Atomically accepts one signed-in response, creates one proposed core agreement and frozen version, declines competing responses, and removes a non-repeatable offer from public inventory. Any failure rolls back every mutation in this function and its synchronous triggers.';
revoke all on function public.accept_marketplace_interest_v1(uuid, uuid, text) from public, anon;
grant execute on function public.accept_marketplace_interest_v1(uuid, uuid, text) to authenticated;

create or replace function public.accept_marketplace_guest_interest_v1(
  p_guest_interest_id uuid,
  p_offer_id uuid,
  p_notes text default ''
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog, public, auth
as $function$
declare
  actor_id uuid := auth.uid();
  offer_row public.offers%rowtype;
  guest_interest_row public.guest_interests%rowtype;
  existing_agreement public.agreements%rowtype;
  agreement_row public.agreements%rowtype;
  agreement_id_value uuid;
  normalized_notes text := btrim(coalesce(p_notes, ''));
begin
  if actor_id is null then
    raise exception using errcode = '42501', message = 'A signed-in offer owner is required.';
  end if;
  if p_guest_interest_id is null or p_offer_id is null then
    raise exception using errcode = '22023', message = 'Guest response ID and offer ID are required.';
  end if;

  select * into offer_row
  from public.offers
  where id = p_offer_id
  for update;
  if not found then
    raise exception using errcode = 'P0002', message = 'Offer not found.';
  end if;
  if offer_row.owner_id <> actor_id then
    raise exception using errcode = '42501', message = 'Only the offer owner can accept responses.';
  end if;

  select * into guest_interest_row
  from public.guest_interests
  where id = p_guest_interest_id
  for update;
  if not found then
    raise exception using errcode = 'P0002', message = 'Guest response not found.';
  end if;
  if guest_interest_row.offer_id <> offer_row.id then
    raise exception using errcode = '23514', message = 'That guest response is not attached to this offer.';
  end if;
  if guest_interest_row.claimed_by_profile_id is null then
    raise exception using errcode = '23514', message = 'The guest respondent must claim the response with an account first.';
  end if;
  if guest_interest_row.claimed_by_profile_id = actor_id then
    raise exception using errcode = '23514', message = 'An offer owner cannot accept their own response.';
  end if;

  select * into existing_agreement
  from public.agreements
  where offer_id = offer_row.id
    and proposer_id = actor_id
    and responder_id = guest_interest_row.claimed_by_profile_id
  order by created_at asc
  limit 1;
  if existing_agreement.id is not null then
    return jsonb_build_object('agreement', to_jsonb(existing_agreement), 'created', false);
  end if;

  if offer_row.status::text <> 'open' or offer_row.workflow_status <> 'published' then
    raise exception using errcode = '23514', message = 'This offer is not open for acceptance.';
  end if;
  if guest_interest_row.status::text <> 'pending' then
    raise exception using errcode = '23514', message = 'Only a pending guest response can be accepted.';
  end if;
  if offer_row.mode::text = 'offset' and exists (
    select 1 from public.donation_offset_offers offset_offer
    where offset_offer.offer_id = offer_row.id
      and offset_offer.participation_mode = 'pool'
  ) then
    raise exception using errcode = '23514', message = 'Pool commitments cannot be accepted one-to-one.';
  end if;
  if offer_row.mode::text = 'pledge' and exists (
    select 1 from public.performance_bonds bond
    where bond.offer_id = offer_row.id
      and bond.side = 'offerer'
      and bond.enabled is true
      and bond.status not in ('not_enabled', 'cancelled', 'expired', 'refunded')
  ) then
    raise exception using errcode = '23514', message = 'Bonded pledge swaps require a signed-in member response.';
  end if;

  update public.guest_interests
  set status = 'accepted', updated_at = now()
  where id = guest_interest_row.id;

  perform set_config('app.core_trade_linking_agreement', '1', true);
  perform set_config('app.core_trade_internal', '1', true);

  insert into public.agreements(
    offer_id,
    interest_id,
    proposer_id,
    responder_id,
    status,
    lifecycle_status,
    notes,
    evidence_due_at,
    created_at,
    updated_at
  ) values (
    offer_row.id,
    null,
    actor_id,
    guest_interest_row.claimed_by_profile_id,
    'proposed',
    'proposed',
    normalized_notes,
    offer_row.evidence_due_date,
    now(),
    now()
  ) returning id into agreement_id_value;

  perform set_config('app.core_trade_linking_agreement', '', true);
  perform set_config('app.core_trade_internal', '', true);

  update public.guest_interests
  set status = 'declined', updated_at = now()
  where offer_id = offer_row.id
    and id <> guest_interest_row.id
    and status::text = 'pending';

  update public.interests
  set status = 'declined', updated_at = now()
  where offer_id = offer_row.id
    and status::text = 'pending';

  update public.offers
  set status = 'matched', workflow_status = 'closed', closed_at = now(), updated_at = now()
  where id = offer_row.id;

  select * into agreement_row
  from public.agreements
  where id = agreement_id_value;
  if agreement_row.id is null or agreement_row.current_version_id is null then
    raise exception 'The agreement could not be linked to one frozen version.';
  end if;

  return jsonb_build_object('agreement', to_jsonb(agreement_row), 'created', true);
end;
$function$;

comment on function public.accept_marketplace_guest_interest_v1(uuid, uuid, text) is
  'Atomically accepts one claimed guest response, creates one proposed core agreement and frozen version, declines competing responses, and removes a non-repeatable offer from public inventory. Any failure rolls back every mutation in this function and its synchronous triggers.';
revoke all on function public.accept_marketplace_guest_interest_v1(uuid, uuid, text) from public, anon;
grant execute on function public.accept_marketplace_guest_interest_v1(uuid, uuid, text) to authenticated;

-- Preserve the canonical agreement confirmation path while allowing the exact accepted
-- response-backed proposed agreement to confirm after atomic acceptance closes its source offer.

create or replace function public.confirm_agreement_version_v2_unbound_legacy(
  p_actor_id uuid,
  p_agreement_id uuid,
  p_agreement_version_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  agreement_row public.agreements%rowtype;
  version_row public.trade_agreement_versions%rowtype;
  offer_row public.offers%rowtype;
  confirmation_count integer;
  counterpart_id uuid;
  loser record;
begin
  select * into agreement_row
  from public.agreements
  where id = p_agreement_id
    and p_actor_id in (proposer_id, responder_id);

  if not found
     or agreement_row.lifecycle_status <> 'proposed'
     or agreement_row.current_version_id is null then
    raise exception 'Agreement is unavailable or can no longer be confirmed.';
  end if;

  perform moral_trade_private.lock_pair(
    agreement_row.proposer_id,
    agreement_row.responder_id
  );

  select * into agreement_row
  from public.agreements
  where id = p_agreement_id
    and p_actor_id in (proposer_id, responder_id)
  for update;

  if not found
     or agreement_row.lifecycle_status <> 'proposed'
     or agreement_row.current_version_id is null then
    raise exception 'Agreement is unavailable or can no longer be confirmed.';
  end if;
  if agreement_row.current_version_id <> p_agreement_version_id then
    raise exception 'The agreement changed after you reviewed it. Review the current frozen version.';
  end if;

  select * into version_row
  from public.trade_agreement_versions
  where id = p_agreement_version_id
    and agreement_id = p_agreement_id;
  if not found then
    raise exception 'Frozen agreement version not found.';
  end if;

  select * into offer_row
  from public.offers
  where id = agreement_row.offer_id
  for update;
  if not found or (
    not moral_trade_private.offer_is_invitable(offer_row.id)
    and not (
      offer_row.status::text = 'matched'
      and offer_row.workflow_status = 'closed'
      and offer_row.closed_at is not null
      and agreement_row.lifecycle_status = 'proposed'
      and (
        exists (
          select 1
          from public.interests accepted_interest
          where accepted_interest.id = agreement_row.interest_id
            and accepted_interest.offer_id = agreement_row.offer_id
            and accepted_interest.user_id = agreement_row.responder_id
            and accepted_interest.status::text = 'accepted'
        )
        or (
          agreement_row.interest_id is null
          and exists (
            select 1
            from public.guest_interests accepted_guest
            where accepted_guest.offer_id = agreement_row.offer_id
              and accepted_guest.claimed_by_profile_id = agreement_row.responder_id
              and accepted_guest.status::text = 'accepted'
          )
        )
      )
    )
  ) then
    raise exception 'The offer is no longer eligible for this non-financial agreement.';
  end if;

  if moral_trade_private.pair_is_blocked(
    agreement_row.proposer_id,
    agreement_row.responder_id
  ) then
    raise exception 'This interaction is blocked.';
  end if;

  insert into public.trade_agreement_confirmations(
    agreement_version_id, user_id, confirmed_at
  ) values (
    p_agreement_version_id, p_actor_id, now()
  )
  on conflict (agreement_version_id, user_id) do nothing;

  select count(distinct c.user_id) into confirmation_count
  from public.trade_agreement_confirmations c
  where c.agreement_version_id = p_agreement_version_id
    and c.user_id in (agreement_row.proposer_id, agreement_row.responder_id);

  counterpart_id := case
    when agreement_row.proposer_id = p_actor_id then agreement_row.responder_id
    else agreement_row.proposer_id
  end;

  if confirmation_count < 2 then
    insert into public.trade_notifications(
      user_id, notification_type, title, body, href, dedupe_key, created_at
    ) values (
      counterpart_id,
      'final_confirmation_required',
      'Your confirmation is required',
      'The other participant confirmed the frozen agreement version.',
      '/trade-agreements/' || p_agreement_id::text,
      'confirmation_waiting:' || p_agreement_version_id::text || ':' || counterpart_id::text,
      now()
    )
    on conflict (dedupe_key) do nothing;
    return jsonb_build_object(
      'status', 'proposed',
      'confirmationCount', confirmation_count,
      'active', false
    );
  end if;

  if exists (
    select 1
    from public.agreements a
    where a.offer_id = agreement_row.offer_id
      and a.id <> agreement_row.id
      and a.lifecycle_status in ('active', 'evidence_due', 'disputed', 'completed')
  ) then
    raise exception 'Another agreement already activated for this offer.';
  end if;

  perform set_config('app.core_trade_internal', '1', true);
  for loser in
    update public.agreements
    set
      status = 'cancelled',
      lifecycle_status = 'cancelled',
      cancelled_at = now(),
      exit_reason = 'Superseded when another agreement activated for the same offer.',
      updated_at = now()
    where offer_id = agreement_row.offer_id
      and id <> agreement_row.id
      and lifecycle_status = 'proposed'
    returning id
  loop
    update public.trade_threads
    set status = 'closed', updated_at = now()
    where agreement_id = loser.id;
  end loop;

  update public.agreements
  set
    status = 'active',
    lifecycle_status = 'active',
    activated_at = now(),
    evidence_due_at = version_row.evidence_due_date,
    updated_at = now()
  where id = agreement_row.id;

  update public.offers
  set
    status = 'matched',
    workflow_status = 'closed',
    closed_at = coalesce(closed_at, now()),
    updated_at = now()
  where id = agreement_row.offer_id;

  perform moral_trade_private.revoke_offer_invitations(
    agreement_row.offer_id,
    'Another invitation for this offer reached bilateral confirmation.'
  );

  insert into public.trade_notifications(
    user_id, notification_type, title, body, href, dedupe_key, created_at
  ) values
    (
      agreement_row.proposer_id,
      'agreement_active',
      'Agreement active',
      'Both participants confirmed the frozen terms. Evidence and exit rules are now active.',
      '/trade-agreements/' || p_agreement_id::text,
      'agreement_active:' || p_agreement_id::text || ':' || agreement_row.proposer_id::text,
      now()
    ),
    (
      agreement_row.responder_id,
      'agreement_active',
      'Agreement active',
      'Both participants confirmed the frozen terms. Evidence and exit rules are now active.',
      '/trade-agreements/' || p_agreement_id::text,
      'agreement_active:' || p_agreement_id::text || ':' || agreement_row.responder_id::text,
      now()
    )
  on conflict (dedupe_key) do nothing;

  return jsonb_build_object(
    'status', 'active',
    'confirmationCount', confirmation_count,
    'active', true
  );
end;
$$;

comment on function public.confirm_agreement_version_v2(uuid, uuid, uuid) is
  'Records one participant confirmation for the exact current frozen version. A proposed agreement created from an accepted member or claimed-guest response remains confirmable after its source offer is matched and closed.';

notify pgrst, 'reload schema';
