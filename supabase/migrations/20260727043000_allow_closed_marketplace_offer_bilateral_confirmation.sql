-- Marketplace acceptance intentionally removes the source offer from the public
-- marketplace before bilateral confirmation. Preserve the existing open-offer path for
-- core invitations, while allowing a closed matched offer only when this exact proposed
-- agreement is backed by the accepted member or claimed-guest response.

create or replace function public.confirm_agreement_version_v2(
  p_actor_id uuid,
  p_agreement_id uuid,
  p_agreement_version_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog
as $function$
declare
  agreement_row public.agreements%rowtype;
  version_row public.trade_agreement_versions%rowtype;
  offer_row public.offers%rowtype;
  confirmation_count integer;
  counterpart_id uuid;
  loser record;
  offer_confirmation_eligible boolean;
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
  if not found then
    raise exception 'The offer is no longer eligible for this non-financial agreement.';
  end if;

  offer_confirmation_eligible := moral_trade_private.offer_is_invitable(offer_row.id)
    or (
      offer_row.status::text = 'matched'
      and offer_row.workflow_status = 'closed'
      and offer_row.closed_at is not null
      and (
        exists (
          select 1
          from public.interests interest_row
          where interest_row.id = agreement_row.interest_id
            and interest_row.offer_id = agreement_row.offer_id
            and interest_row.user_id = agreement_row.responder_id
            and interest_row.status::text = 'accepted'
        )
        or (
          agreement_row.interest_id is null
          and exists (
            select 1
            from public.guest_interests guest_interest_row
            where guest_interest_row.offer_id = agreement_row.offer_id
              and guest_interest_row.claimed_by_profile_id = agreement_row.responder_id
              and guest_interest_row.status::text = 'accepted'
          )
        )
      )
    );

  if not offer_confirmation_eligible then
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
$function$;

comment on function public.confirm_agreement_version_v2(uuid, uuid, uuid) is
  'Records one participant confirmation for the exact frozen version. Accepted marketplace agreements may confirm after their source offer is closed; only two distinct participant confirmations activate the agreement.';

revoke all on function public.confirm_agreement_version_v2(uuid, uuid, uuid)
  from public, anon;
grant execute on function public.confirm_agreement_version_v2(uuid, uuid, uuid)
  to authenticated, service_role;

notify pgrst, 'reload schema';
