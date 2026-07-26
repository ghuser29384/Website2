-- The legacy agreement bridge creates the initial frozen core-trade version in an
-- AFTER INSERT trigger. The version guard deliberately requires the transaction-local
-- linking flag for system-created versions whose proposed_by participant may differ
-- from the authenticated actor accepting the response. Keep the entire acceptance,
-- agreement insert, version bridge, competing-response updates, and offer close in one
-- transaction.

create or replace function public.accept_marketplace_interest_v1(
  p_interest_id uuid,
  p_offer_id uuid,
  p_notes text default '',
  p_no_trade_baseline text default '',
  p_counterfactual_declaration text default ''
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
  normalized_baseline text := btrim(coalesce(p_no_trade_baseline, ''));
  normalized_counterfactual text := btrim(coalesce(p_counterfactual_declaration, ''));
begin
  if actor_id is null then
    raise exception using
      errcode = '42501',
      message = 'A signed-in offer owner is required.';
  end if;

  if p_interest_id is null or p_offer_id is null then
    raise exception using
      errcode = '22023',
      message = 'Interest ID and offer ID are required.';
  end if;

  select * into offer_row
  from public.offers
  where id = p_offer_id
  for update;

  if not found then
    raise exception using errcode = 'P0002', message = 'Offer not found.';
  end if;

  if offer_row.owner_id <> actor_id then
    raise exception using
      errcode = '42501',
      message = 'Only the offer owner can accept interest.';
  end if;

  select * into interest_row
  from public.interests
  where id = p_interest_id
  for update;

  if not found then
    raise exception using errcode = 'P0002', message = 'Interest not found.';
  end if;

  if interest_row.offer_id <> offer_row.id then
    raise exception using
      errcode = '23514',
      message = 'That interest is not attached to this offer.';
  end if;

  if interest_row.user_id = actor_id then
    raise exception using
      errcode = '23514',
      message = 'An offer owner cannot accept their own response.';
  end if;

  select * into existing_agreement
  from public.agreements
  where interest_id = interest_row.id
  limit 1;

  if existing_agreement.id is not null then
    if existing_agreement.offer_id is distinct from offer_row.id
       or existing_agreement.proposer_id is distinct from actor_id
       or existing_agreement.responder_id is distinct from interest_row.user_id then
      raise exception using
        errcode = '23514',
        message = 'The existing agreement does not match this response.';
    end if;

    return jsonb_build_object(
      'agreement', to_jsonb(existing_agreement),
      'created', false
    );
  end if;

  if offer_row.status::text <> 'open'
     or offer_row.workflow_status <> 'published' then
    raise exception using
      errcode = '23514',
      message = 'This offer is not open for acceptance.';
  end if;

  if interest_row.status::text <> 'pending' then
    raise exception using
      errcode = '23514',
      message = 'Only a pending response can be accepted.';
  end if;

  if offer_row.mode::text = 'offset'
     and exists (
       select 1
       from public.donation_offset_offers offset_offer
       where offset_offer.offer_id = offer_row.id
         and offset_offer.participation_mode = 'pool'
     ) then
    raise exception using
      errcode = '23514',
      message = 'Pool commitments cannot be accepted one-to-one.';
  end if;

  -- The selected response is deliberately updated before the agreement insert.
  -- PostgreSQL rolls this update and all trigger side effects back if any later
  -- statement in this function fails.
  update public.interests
  set status = 'accepted', updated_at = now()
  where id = interest_row.id;

  perform set_config('app.core_trade_linking_agreement', '1', true);

  insert into public.agreements (
    offer_id,
    interest_id,
    proposer_id,
    responder_id,
    status,
    notes,
    source,
    structured_terms,
    no_trade_baseline,
    counterfactual_declaration,
    duration_terms,
    exit_conditions,
    evidence_rule,
    privacy_scope,
    disclosure_scope,
    completion_state
  ) values (
    offer_row.id,
    interest_row.id,
    actor_id,
    interest_row.user_id,
    'active',
    normalized_notes,
    'offer',
    concat_ws(' ', offer_row.offer_action, 'for', offer_row.request_action),
    coalesce(nullif(normalized_baseline, ''), nullif(btrim(offer_row.no_trade_baseline), ''), ''),
    normalized_counterfactual,
    offer_row.duration,
    offer_row.exit_conditions,
    offer_row.verification,
    coalesce(
      nullif(btrim(offer_row.privacy_scope), ''),
      'Agreement participants can see this room. Broader publication waits for reviewed completion.'
    ),
    'Share only the details needed to verify this agreement and resolve disputes.',
    'pending_evidence'
  )
  returning id into agreement_id_value;

  update public.interests
  set status = 'declined', updated_at = now()
  where offer_id = offer_row.id
    and id <> interest_row.id
    and status = 'pending';

  update public.guest_interests
  set status = 'declined', updated_at = now()
  where offer_id = offer_row.id
    and status = 'pending';

  update public.offers
  set status = 'matched', updated_at = now()
  where id = offer_row.id;

  select * into agreement_row
  from public.agreements
  where id = agreement_id_value;

  return jsonb_build_object(
    'agreement', to_jsonb(agreement_row),
    'created', true
  );
end;
$function$;

comment on function public.accept_marketplace_interest_v1(uuid, uuid, text, text, text) is
  'Atomically accepts one signed-in member response, creates its proposed agreement and frozen version, declines competing responses, and closes the public offer. Any failure rolls back every mutation.';

revoke all on function public.accept_marketplace_interest_v1(uuid, uuid, text, text, text)
  from public, anon;
grant execute on function public.accept_marketplace_interest_v1(uuid, uuid, text, text, text)
  to authenticated;

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
    raise exception using
      errcode = '42501',
      message = 'A signed-in offer owner is required.';
  end if;

  if p_guest_interest_id is null or p_offer_id is null then
    raise exception using
      errcode = '22023',
      message = 'Guest response ID and offer ID are required.';
  end if;

  select * into offer_row
  from public.offers
  where id = p_offer_id
  for update;

  if not found then
    raise exception using errcode = 'P0002', message = 'Offer not found.';
  end if;

  if offer_row.owner_id <> actor_id then
    raise exception using
      errcode = '42501',
      message = 'Only the offer owner can accept responses.';
  end if;

  select * into guest_interest_row
  from public.guest_interests
  where id = p_guest_interest_id
  for update;

  if not found then
    raise exception using errcode = 'P0002', message = 'Guest response not found.';
  end if;

  if guest_interest_row.offer_id <> offer_row.id then
    raise exception using
      errcode = '23514',
      message = 'That guest response is not attached to this offer.';
  end if;

  if guest_interest_row.claimed_by_profile_id is null then
    raise exception using
      errcode = '23514',
      message = 'The guest respondent must claim the response with an account first.';
  end if;

  if guest_interest_row.claimed_by_profile_id = actor_id then
    raise exception using
      errcode = '23514',
      message = 'An offer owner cannot accept their own response.';
  end if;

  select * into existing_agreement
  from public.agreements
  where offer_id = offer_row.id
  order by created_at asc
  limit 1;

  if existing_agreement.id is not null then
    if existing_agreement.proposer_id = actor_id
       and existing_agreement.responder_id = guest_interest_row.claimed_by_profile_id then
      return jsonb_build_object(
        'agreement', to_jsonb(existing_agreement),
        'created', false
      );
    end if;

    raise exception using
      errcode = '23514',
      message = 'This offer already has an agreement.';
  end if;

  if offer_row.status::text <> 'open'
     or offer_row.workflow_status <> 'published' then
    raise exception using
      errcode = '23514',
      message = 'This offer is not open for acceptance.';
  end if;

  if guest_interest_row.status::text <> 'pending' then
    raise exception using
      errcode = '23514',
      message = 'Only a pending guest response can be accepted.';
  end if;

  if offer_row.mode::text = 'offset'
     and exists (
       select 1
       from public.donation_offset_offers offset_offer
       where offset_offer.offer_id = offer_row.id
         and offset_offer.participation_mode = 'pool'
     ) then
    raise exception using
      errcode = '23514',
      message = 'Pool commitments cannot be accepted one-to-one.';
  end if;

  if offer_row.mode::text = 'pledge'
     and exists (
       select 1
       from public.performance_bonds bond
       where bond.offer_id = offer_row.id
         and bond.side = 'offerer'
         and bond.enabled = true
     ) then
    raise exception using
      errcode = '23514',
      message = 'Bonded pledge swaps require a signed-in member response.';
  end if;

  update public.guest_interests
  set status = 'accepted', updated_at = now()
  where id = guest_interest_row.id;

  perform set_config('app.core_trade_linking_agreement', '1', true);

  insert into public.agreements (
    offer_id,
    interest_id,
    proposer_id,
    responder_id,
    status,
    notes,
    source,
    structured_terms,
    no_trade_baseline,
    counterfactual_declaration,
    duration_terms,
    exit_conditions,
    evidence_rule,
    privacy_scope,
    disclosure_scope,
    completion_state
  ) values (
    offer_row.id,
    null,
    actor_id,
    guest_interest_row.claimed_by_profile_id,
    'active',
    normalized_notes,
    'offer',
    concat_ws(' ', offer_row.offer_action, 'for', offer_row.request_action),
    offer_row.no_trade_baseline,
    '',
    offer_row.duration,
    offer_row.exit_conditions,
    offer_row.verification,
    coalesce(
      nullif(btrim(offer_row.privacy_scope), ''),
      'Agreement participants can see this room. Broader publication waits for reviewed completion.'
    ),
    'Share only the details needed to verify this agreement and resolve disputes.',
    'pending_evidence'
  )
  returning id into agreement_id_value;

  update public.guest_interests
  set status = 'declined', updated_at = now()
  where offer_id = offer_row.id
    and id <> guest_interest_row.id
    and status = 'pending';

  update public.interests
  set status = 'declined', updated_at = now()
  where offer_id = offer_row.id
    and status = 'pending';

  update public.offers
  set status = 'matched', updated_at = now()
  where id = offer_row.id;

  select * into agreement_row
  from public.agreements
  where id = agreement_id_value;

  return jsonb_build_object(
    'agreement', to_jsonb(agreement_row),
    'created', true
  );
end;
$function$;

comment on function public.accept_marketplace_guest_interest_v1(uuid, uuid, text) is
  'Atomically accepts a claimed guest response, creates its proposed agreement and frozen version, declines competing responses, and closes the public offer. Any failure rolls back every mutation.';

revoke all on function public.accept_marketplace_guest_interest_v1(uuid, uuid, text)
  from public, anon;
grant execute on function public.accept_marketplace_guest_interest_v1(uuid, uuid, text)
  to authenticated;

notify pgrst, 'reload schema';
