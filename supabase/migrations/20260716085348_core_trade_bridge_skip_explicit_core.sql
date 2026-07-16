create or replace function public.bridge_core_agreement_version()
returns trigger
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  offer_row public.offers%rowtype;
  thread_id_value uuid;
  proposal_row public.trade_counterproposals%rowtype;
  version_id_value uuid;
  terms_hash_value text;
  proposer_email text;
  responder_email text;
begin
  if new.notes = 'Created from an accepted structured counterproposal. Both parties must confirm the same immutable version.' then
    return new;
  end if;

  select * into offer_row
  from public.offers
  where id = new.offer_id;

  if not found or offer_row.workflow_status <> 'published' then
    return new;
  end if;

  select id into thread_id_value
  from public.trade_threads
  where offer_id = new.offer_id
    and status <> 'closed'
    and (
      (participant_a = new.proposer_id and participant_b = new.responder_id)
      or
      (participant_a = new.responder_id and participant_b = new.proposer_id)
    )
  order by created_at asc
  limit 1;

  if thread_id_value is null then
    insert into public.trade_threads(
      offer_id,
      agreement_id,
      participant_a,
      participant_b,
      status,
      last_message_at,
      created_at,
      updated_at
    ) values (
      new.offer_id,
      new.id,
      new.proposer_id,
      new.responder_id,
      'active',
      now(),
      now(),
      now()
    )
    on conflict do nothing
    returning id into thread_id_value;

    if thread_id_value is null then
      select id into thread_id_value
      from public.trade_threads
      where offer_id = new.offer_id
        and status <> 'closed'
        and (
          (participant_a = new.proposer_id and participant_b = new.responder_id)
          or
          (participant_a = new.responder_id and participant_b = new.proposer_id)
        )
      order by created_at asc
      limit 1;
    end if;
  end if;

  if thread_id_value is null then
    raise exception 'Unable to create or locate a private thread for agreement %', new.id;
  end if;

  select * into proposal_row
  from public.trade_counterproposals
  where thread_id = thread_id_value
  order by version desc, created_at desc
  limit 1;

  if proposal_row.id is null then
    terms_hash_value := public.core_trade_terms_hash(
      offer_row.offer_action,
      offer_row.request_action,
      offer_row.duration,
      offer_row.start_date,
      offer_row.verification,
      offer_row.evidence_due_date,
      offer_row.exit_conditions,
      offer_row.maximum_burden,
      offer_row.privacy_scope,
      offer_row.no_trade_baseline
    );

    insert into public.trade_agreement_versions(
      agreement_id,
      version,
      proposed_by,
      proposed_action,
      requested_action,
      duration,
      start_date,
      evidence_rule,
      evidence_due_date,
      exit_conditions,
      maximum_burden,
      privacy_scope,
      no_trade_baseline,
      terms_hash,
      created_at
    ) values (
      new.id,
      1,
      new.responder_id,
      offer_row.offer_action,
      offer_row.request_action,
      offer_row.duration,
      offer_row.start_date,
      offer_row.verification,
      offer_row.evidence_due_date,
      offer_row.exit_conditions,
      offer_row.maximum_burden,
      offer_row.privacy_scope,
      offer_row.no_trade_baseline,
      terms_hash_value,
      now()
    )
    returning id into version_id_value;
  else
    insert into public.trade_agreement_versions(
      agreement_id,
      version,
      proposed_by,
      proposed_action,
      requested_action,
      duration,
      start_date,
      evidence_rule,
      evidence_due_date,
      exit_conditions,
      maximum_burden,
      privacy_scope,
      no_trade_baseline,
      terms_hash,
      created_at
    ) values (
      new.id,
      1,
      proposal_row.proposer_id,
      proposal_row.proposed_action,
      proposal_row.requested_action,
      proposal_row.duration,
      proposal_row.start_date,
      proposal_row.evidence_rule,
      proposal_row.evidence_due_date,
      proposal_row.exit_conditions,
      proposal_row.maximum_burden,
      proposal_row.privacy_scope,
      proposal_row.no_trade_baseline,
      proposal_row.terms_hash,
      now()
    )
    returning id into version_id_value;
  end if;

  update public.agreements
  set
    status = 'proposed'::public.agreement_status,
    lifecycle_status = 'proposed',
    current_version_id = version_id_value,
    evidence_due_at = coalesce(proposal_row.evidence_due_date, offer_row.evidence_due_date),
    activated_at = null,
    updated_at = now()
  where id = new.id;

  update public.trade_threads
  set agreement_id = new.id, updated_at = now(), last_message_at = now()
  where id = thread_id_value;

  insert into public.trade_messages(
    thread_id,
    sender_id,
    message_type,
    body,
    metadata,
    created_at
  ) values (
    thread_id_value,
    null,
    'system',
    'The response was accepted, but the agreement remains proposed. Both participants must confirm the same frozen version before it becomes active.',
    jsonb_build_object('agreementId', new.id, 'source', 'legacy_acceptance_bridge'),
    now()
  );

  insert into public.trade_notifications(
    user_id,
    notification_type,
    title,
    body,
    href,
    dedupe_key,
    created_at
  ) values
    (
      new.proposer_id,
      'final_confirmation_required',
      'Final confirmation required',
      'Review and confirm the frozen agreement version. It is not active until both participants confirm.',
      '/trade-agreements/' || new.id::text,
      'legacy_final_confirmation:' || new.id::text || ':' || new.proposer_id::text,
      now()
    ),
    (
      new.responder_id,
      'final_confirmation_required',
      'Final confirmation required',
      'Review and confirm the frozen agreement version. It is not active until both participants confirm.',
      '/trade-agreements/' || new.id::text,
      'legacy_final_confirmation:' || new.id::text || ':' || new.responder_id::text,
      now()
    )
  on conflict (dedupe_key) do nothing;

  select email into proposer_email from public.profiles where id = new.proposer_id;
  select email into responder_email from public.profiles where id = new.responder_id;

  if coalesce(trim(proposer_email), '') <> '' then
    insert into public.email_outbox(
      profile_id, recipient_email, subject, body, status, provider, created_at
    ) values (
      new.proposer_id,
      proposer_email,
      'Moral Trade: final confirmation required',
      'A proposed agreement needs your confirmation. Sign in at https://www.moraltrade.org/trade-agreements/' || new.id::text || '. The agreement is not active until both participants confirm the same version.',
      'queued',
      'core_trade_bridge',
      now()
    );
  end if;

  if coalesce(trim(responder_email), '') <> '' then
    insert into public.email_outbox(
      profile_id, recipient_email, subject, body, status, provider, created_at
    ) values (
      new.responder_id,
      responder_email,
      'Moral Trade: final confirmation required',
      'A proposed agreement needs your confirmation. Sign in at https://www.moraltrade.org/trade-agreements/' || new.id::text || '. The agreement is not active until both participants confirm the same version.',
      'queued',
      'core_trade_bridge',
      now()
    );
  end if;

  return new;
end;
$$;

comment on function public.bridge_core_agreement_version() is
  'Converts legacy one-party acceptance into a proposed bilateral agreement with a frozen version, while explicit core actions manage their own version.';
