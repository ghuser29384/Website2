-- Bridge legacy public-offer actions into the backed two-party core loop and
-- enforce bilateral state transitions at the database boundary.

create or replace function public.core_trade_terms_hash(
  proposed_action text,
  requested_action text,
  duration_value text,
  start_date_value date,
  evidence_rule_value text,
  evidence_due_date_value date,
  exit_conditions_value text,
  maximum_burden_value text,
  privacy_scope_value text,
  no_trade_baseline_value text
)
returns text
language sql
immutable
set search_path = public, extensions
as $$
  select encode(
    digest(
      concat_ws(
        E'\x1f',
        lower(trim(coalesce(proposed_action, ''))),
        lower(trim(coalesce(requested_action, ''))),
        lower(trim(coalesce(duration_value, ''))),
        coalesce(start_date_value::text, ''),
        lower(trim(coalesce(evidence_rule_value, ''))),
        coalesce(evidence_due_date_value::text, ''),
        lower(trim(coalesce(exit_conditions_value, ''))),
        lower(trim(coalesce(maximum_burden_value, ''))),
        lower(trim(coalesce(privacy_scope_value, ''))),
        lower(trim(coalesce(no_trade_baseline_value, '')))
      ),
      'sha256'
    ),
    'hex'
  );
$$;

create or replace function public.bridge_core_interest_to_thread()
returns trigger
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  offer_row public.offers%rowtype;
  thread_id_value uuid;
  proposal_id_value uuid;
  notification_id_value uuid;
  owner_email text;
  terms_hash_value text;
begin
  select * into offer_row
  from public.offers
  where id = new.offer_id;

  if not found
     or offer_row.workflow_status <> 'published'
     or new.user_id = offer_row.owner_id
     or new.status::text not in ('pending', 'accepted') then
    return new;
  end if;

  select id into thread_id_value
  from public.trade_threads
  where offer_id = new.offer_id
    and status <> 'closed'
    and (
      (participant_a = offer_row.owner_id and participant_b = new.user_id)
      or
      (participant_a = new.user_id and participant_b = offer_row.owner_id)
    )
  order by created_at asc
  limit 1;

  if thread_id_value is null then
    insert into public.trade_threads(
      offer_id,
      participant_a,
      participant_b,
      status,
      last_message_at,
      created_at,
      updated_at
    ) values (
      new.offer_id,
      offer_row.owner_id,
      new.user_id,
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
          (participant_a = offer_row.owner_id and participant_b = new.user_id)
          or
          (participant_a = new.user_id and participant_b = offer_row.owner_id)
        )
      order by created_at asc
      limit 1;
    end if;
  end if;

  if thread_id_value is null then
    raise exception 'Unable to create a private trade thread for interest %', new.id;
  end if;

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

  insert into public.trade_counterproposals(
    thread_id,
    offer_id,
    proposer_id,
    version,
    status,
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
  )
  select
    thread_id_value,
    offer_row.id,
    new.user_id,
    1,
    'proposed',
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
  where not exists (
    select 1
    from public.trade_counterproposals
    where thread_id = thread_id_value
  )
  on conflict do nothing
  returning id into proposal_id_value;

  if proposal_id_value is not null then
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
      'A participant responded from the public offer page. Review the bounded terms before accepting or counterproposing.',
      jsonb_build_object('interestId', new.id, 'source', 'legacy_public_offer'),
      now()
    );

    update public.trade_threads
    set last_message_at = now(), updated_at = now()
    where id = thread_id_value;
  end if;

  insert into public.core_loop_events(
    profile_id,
    event_type,
    entity_type,
    entity_id,
    idempotency_key,
    metadata,
    created_at
  ) values (
    new.user_id,
    'response_sent',
    'interest',
    new.id,
    'response_sent:' || new.user_id::text || ':interest:' || new.id::text,
    jsonb_build_object('source', 'legacy_public_offer'),
    now()
  )
  on conflict (idempotency_key) do nothing;

  insert into public.trade_notifications(
    user_id,
    notification_type,
    title,
    body,
    href,
    dedupe_key,
    created_at
  ) values (
    offer_row.owner_id,
    'response_sent',
    'New response',
    'A participant responded to your published proposal. Review the private thread and the current terms.',
    '/messages/' || thread_id_value::text,
    'legacy_response:' || new.id::text || ':' || offer_row.owner_id::text,
    now()
  )
  on conflict (dedupe_key) do nothing
  returning id into notification_id_value;

  if notification_id_value is not null then
    select email into owner_email
    from public.profiles
    where id = offer_row.owner_id;

    if coalesce(trim(owner_email), '') <> '' then
      insert into public.email_outbox(
        profile_id,
        recipient_email,
        subject,
        body,
        status,
        provider,
        created_at
      ) values (
        offer_row.owner_id,
        owner_email,
        'Moral Trade: new response',
        'A private Moral Trade response is ready. Sign in at https://www.moraltrade.org/messages/' || thread_id_value::text || '. This email omits private terms, contact details, payments, and evidence.',
        'queued',
        'core_trade_bridge',
        now()
      );
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists bridge_core_interest_to_thread_trigger on public.interests;
create trigger bridge_core_interest_to_thread_trigger
after insert or update of status, message on public.interests
for each row execute function public.bridge_core_interest_to_thread();

create or replace function public.prepare_core_agreement_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  offer_workflow_status text;
begin
  select workflow_status into offer_workflow_status
  from public.offers
  where id = new.offer_id;

  if offer_workflow_status = 'published' then
    new.status := 'proposed'::public.agreement_status;
    new.lifecycle_status := 'proposed';
    new.current_version_id := null;
    new.activated_at := null;
    new.completed_at := null;
    new.cancelled_at := null;
  end if;

  return new;
end;
$$;

drop trigger if exists prepare_core_agreement_insert_trigger on public.agreements;
create trigger prepare_core_agreement_insert_trigger
before insert on public.agreements
for each row execute function public.prepare_core_agreement_insert();

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

drop trigger if exists bridge_core_agreement_version_trigger on public.agreements;
create trigger bridge_core_agreement_version_trigger
after insert on public.agreements
for each row execute function public.bridge_core_agreement_version();

create or replace function public.guard_core_agreement_transition()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  offer_workflow_status text;
  confirmation_count integer;
  completion_count integer;
  authorized_exit_count integer;
begin
  select workflow_status into offer_workflow_status
  from public.offers
  where id = new.offer_id;

  if offer_workflow_status <> 'published' and old.current_version_id is null then
    return new;
  end if;

  if (
      (new.status::text = 'active' and old.status::text <> 'active')
      or
      (new.lifecycle_status = 'active' and old.lifecycle_status <> 'active')
    ) then
    if new.current_version_id is null then
      raise exception 'A frozen agreement version is required before activation.';
    end if;

    select count(*) into confirmation_count
    from public.trade_agreement_confirmations
    where agreement_version_id = new.current_version_id
      and user_id in (new.proposer_id, new.responder_id);

    if confirmation_count < 2 then
      raise exception 'Both participants must confirm the same frozen agreement version before activation.';
    end if;
  end if;

  if (
      (new.status::text = 'completed' and old.status::text <> 'completed')
      or
      (new.lifecycle_status = 'completed' and old.lifecycle_status <> 'completed')
    ) then
    select count(*) into completion_count
    from public.trade_completion_confirmations
    where agreement_id = new.id
      and user_id in (new.proposer_id, new.responder_id);

    if completion_count < 2 then
      raise exception 'Both participants must confirm completion before the agreement can be completed.';
    end if;
  end if;

  if (
      (new.status::text = 'cancelled' and old.status::text <> 'cancelled')
      or
      (new.lifecycle_status = 'cancelled' and old.lifecycle_status <> 'cancelled')
    ) and old.lifecycle_status in ('active', 'evidence_due', 'disputed', 'confirmed') then
    select count(*) into authorized_exit_count
    from public.trade_exit_requests
    where agreement_id = new.id
      and status in ('accepted', 'executed');

    if authorized_exit_count < 1 then
      raise exception 'Active agreements may be cancelled only through an accepted mutual cancellation or an executed unilateral exit.';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists guard_core_agreement_transition_trigger on public.agreements;
create trigger guard_core_agreement_transition_trigger
before update on public.agreements
for each row execute function public.guard_core_agreement_transition();

comment on function public.bridge_core_interest_to_thread() is
  'Bridges legacy public offer responses into private core trade threads and canonical events.';
comment on function public.bridge_core_agreement_version() is
  'Converts legacy one-party acceptance into a proposed bilateral agreement with a frozen version.';
comment on function public.guard_core_agreement_transition() is
  'Rejects activation, completion, or active cancellation unless bilateral core-loop requirements are satisfied.';
