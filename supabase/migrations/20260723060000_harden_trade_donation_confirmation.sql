-- Keep donation-backed bilateral confirmation on the same exact-version,
-- pair-serialized transaction boundary as ordinary core-trade confirmation.

create or replace function public.confirm_trade_donation_version_v2(
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
  donation_term_row public.trade_donation_terms%rowtype;
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

  select * into donation_term_row
  from public.trade_donation_terms
  where agreement_id = p_agreement_id
    and agreement_version_id = p_agreement_version_id;
  if not found then
    raise exception 'Frozen donation terms were not found for this agreement version.';
  end if;

  select * into offer_row
  from public.offers
  where id = agreement_row.offer_id
  for update;
  if not found
     or offer_row.mode::text <> 'pledge'
     or offer_row.workflow_status <> 'published'
     or offer_row.status::text <> 'open' then
    raise exception 'The offer is no longer eligible for confirmation.';
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
      'The other participant confirmed the frozen donation-backed agreement version.',
      '/trade-agreements/' || p_agreement_id::text,
      'pledge_donation_confirmation_waiting:'
        || p_agreement_version_id::text || ':' || counterpart_id::text,
      now()
    )
    on conflict (dedupe_key) do nothing;

    return jsonb_build_object(
      'status', 'proposed',
      'confirmationCount', confirmation_count,
      'awaitingDonation', false
    );
  end if;

  if exists (
    select 1
    from public.agreements a
    where a.offer_id = agreement_row.offer_id
      and a.id <> agreement_row.id
      and a.lifecycle_status in (
        'confirmed',
        'awaiting_donation',
        'active',
        'evidence_due',
        'disputed',
        'completed'
      )
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
      exit_reason = 'Superseded when another agreement reached bilateral confirmation for the same offer.',
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
    status = 'proposed',
    lifecycle_status = 'awaiting_donation',
    activated_at = null,
    evidence_due_at = version_row.evidence_due_date,
    updated_at = now()
  where id = agreement_row.id;

  update public.offers
  set
    status = 'matched',
    workflow_status = 'closed',
    closed_at = now(),
    updated_at = now()
  where id = agreement_row.offer_id;

  perform moral_trade_private.revoke_offer_invitations(
    agreement_row.offer_id,
    'A donation-backed agreement for this offer reached bilateral confirmation.'
  );

  insert into public.trade_notifications(
    user_id, notification_type, title, body, href, dedupe_key, created_at
  ) values
    (
      agreement_row.proposer_id,
      'pledge_donation_required',
      'Donation required before activation',
      'Both parties confirmed. The frozen Every.org donation must be completed before the reciprocal action starts.',
      '/trade-agreements/' || p_agreement_id::text,
      'pledge_donation_required:' || p_agreement_id::text
        || ':' || agreement_row.proposer_id::text
        || ':' || donation_term_row.id::text,
      now()
    ),
    (
      agreement_row.responder_id,
      'pledge_donation_required',
      'Donation required before activation',
      'Both parties confirmed. The frozen Every.org donation must be completed before the reciprocal action starts.',
      '/trade-agreements/' || p_agreement_id::text,
      'pledge_donation_required:' || p_agreement_id::text
        || ':' || agreement_row.responder_id::text
        || ':' || donation_term_row.id::text,
      now()
    )
  on conflict (dedupe_key) do nothing;

  insert into public.trade_messages(
    thread_id, sender_id, message_type, body, metadata, created_at
  )
  select
    t.id,
    null,
    'system',
    'Both participants confirmed the frozen donation-backed agreement. The reciprocal action remains inactive until Every.org confirms the exact donation.',
    jsonb_build_object('source', 'every_org_pledge_donation'),
    now()
  from public.trade_threads t
  where t.agreement_id = agreement_row.id
    and t.status = 'active';

  update public.trade_threads
  set last_message_at = now(), updated_at = now()
  where agreement_id = agreement_row.id
    and status = 'active';

  return jsonb_build_object(
    'status', 'awaiting_donation',
    'confirmationCount', confirmation_count,
    'awaitingDonation', true
  );
end;
$$;

revoke all on function public.confirm_trade_donation_version_v2(
  uuid, uuid, uuid
) from public, anon, authenticated;

grant execute on function public.confirm_trade_donation_version_v2(
  uuid, uuid, uuid
) to service_role;

comment on function public.confirm_trade_donation_version_v2(
  uuid, uuid, uuid
) is
  'Atomically confirms an exact donation-backed version and, after bilateral consent, closes competing negotiations and moves the winner to awaiting_donation.';
