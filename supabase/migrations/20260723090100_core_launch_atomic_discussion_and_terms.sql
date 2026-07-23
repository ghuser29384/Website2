create or replace function public.send_trade_message_v3(
  p_actor_id uuid,
  p_thread_id uuid,
  p_body text,
  p_submission_key text
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog
as $function$
declare
  thread_row public.trade_threads%rowtype;
  existing_id uuid;
  message_id_value uuid;
  counterpart_id uuid;
  normalized_body text := btrim(coalesce(p_body, ''));
  normalized_key text := btrim(coalesce(p_submission_key, ''));
begin
  if p_actor_id is null or p_thread_id is null then
    raise exception 'A signed-in participant and thread are required.';
  end if;
  if normalized_body = '' or length(normalized_body) > 4000 then
    raise exception 'Messages must be between 1 and 4,000 characters.';
  end if;
  if normalized_key = '' or length(normalized_key) > 200 then
    raise exception 'A bounded message submission key is required.';
  end if;

  select id into existing_id
  from public.trade_messages
  where sender_id = p_actor_id and submission_key = normalized_key
  limit 1;
  if existing_id is not null then
    return jsonb_build_object('messageId', existing_id, 'created', false);
  end if;

  select * into thread_row
  from public.trade_threads
  where id = p_thread_id
    and p_actor_id in (participant_a, participant_b);
  if not found then
    raise exception 'Thread not found or access denied.';
  end if;

  perform moral_trade_private.lock_pair(thread_row.participant_a, thread_row.participant_b);
  select * into thread_row
  from public.trade_threads
  where id = p_thread_id
    and p_actor_id in (participant_a, participant_b)
  for update;
  if not found or thread_row.status <> 'active' then
    raise exception 'This private thread is not active.';
  end if;
  if moral_trade_private.pair_is_blocked(thread_row.participant_a, thread_row.participant_b) then
    raise exception 'This interaction is blocked.';
  end if;

  insert into public.trade_messages(
    thread_id, sender_id, message_type, body, metadata, submission_key, created_at
  ) values (
    thread_row.id, p_actor_id, 'user', normalized_body, '{}'::jsonb, normalized_key, now()
  )
  returning id into message_id_value;

  update public.trade_threads
  set last_message_at = now(), updated_at = now()
  where id = thread_row.id;

  counterpart_id := case
    when thread_row.participant_a = p_actor_id then thread_row.participant_b
    else thread_row.participant_a
  end;
  begin
    insert into public.trade_notifications(
      user_id, notification_type, title, body, href, dedupe_key, created_at
    ) values (
      counterpart_id,
      'message_received',
      'New private message',
      'A participant sent a message in your private Moral Trade thread.',
      '/messages/' || thread_row.id::text,
      'message_received:' || message_id_value::text || ':' || counterpart_id::text,
      now()
    )
    on conflict (dedupe_key) do nothing;
  exception when others then
    null;
  end;

  return jsonb_build_object('messageId', message_id_value, 'created', true);
end;
$function$;

create or replace function public.create_counterproposal_v3(
  p_actor_id uuid,
  p_thread_id uuid,
  p_submission_key text,
  p_proposed_action text,
  p_requested_action text,
  p_duration text,
  p_start_date date,
  p_evidence_rule text,
  p_evidence_due_date date,
  p_exit_conditions text,
  p_maximum_burden text,
  p_privacy_scope text,
  p_no_trade_baseline text
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog
as $function$
declare
  thread_row public.trade_threads%rowtype;
  proposal_row public.trade_counterproposals%rowtype;
  next_version integer;
  counterpart_id uuid;
  terms_hash_value text;
  normalized_key text := btrim(coalesce(p_submission_key, ''));
begin
  if p_actor_id is null or p_thread_id is null then
    raise exception 'A signed-in participant and thread are required.';
  end if;
  if normalized_key = '' or length(normalized_key) > 200 then
    raise exception 'A bounded counterproposal submission key is required.';
  end if;
  if greatest(
    length(btrim(coalesce(p_proposed_action, ''))),
    length(btrim(coalesce(p_requested_action, ''))),
    length(btrim(coalesce(p_duration, ''))),
    length(btrim(coalesce(p_evidence_rule, ''))),
    length(btrim(coalesce(p_exit_conditions, ''))),
    length(btrim(coalesce(p_maximum_burden, ''))),
    length(btrim(coalesce(p_privacy_scope, ''))),
    length(btrim(coalesce(p_no_trade_baseline, '')))
  ) > 5000
  or btrim(coalesce(p_proposed_action, '')) = ''
  or btrim(coalesce(p_requested_action, '')) = ''
  or btrim(coalesce(p_duration, '')) = ''
  or btrim(coalesce(p_evidence_rule, '')) = ''
  or btrim(coalesce(p_exit_conditions, '')) = ''
  or btrim(coalesce(p_maximum_burden, '')) = ''
  or btrim(coalesce(p_privacy_scope, '')) = ''
  or btrim(coalesce(p_no_trade_baseline, '')) = '' then
    raise exception 'Complete every bounded counterproposal term.';
  end if;

  select * into proposal_row
  from public.trade_counterproposals
  where proposer_id = p_actor_id and submission_key = normalized_key
  limit 1;
  if proposal_row.id is not null then
    if proposal_row.thread_id <> p_thread_id then
      raise exception 'Counterproposal submission key belongs to another thread.';
    end if;
    return jsonb_build_object(
      'counterproposalId', proposal_row.id,
      'version', proposal_row.version,
      'created', false
    );
  end if;

  select * into thread_row
  from public.trade_threads
  where id = p_thread_id
    and p_actor_id in (participant_a, participant_b);
  if not found then
    raise exception 'Thread not found or access denied.';
  end if;
  perform moral_trade_private.lock_pair(thread_row.participant_a, thread_row.participant_b);
  select * into thread_row
  from public.trade_threads
  where id = p_thread_id
    and p_actor_id in (participant_a, participant_b)
  for update;
  if not found or thread_row.status <> 'active' or thread_row.agreement_id is not null then
    raise exception 'This thread is not open for counterproposals.';
  end if;
  if moral_trade_private.pair_is_blocked(thread_row.participant_a, thread_row.participant_b) then
    raise exception 'This interaction is blocked.';
  end if;

  terms_hash_value := public.core_trade_terms_hash(
    btrim(p_proposed_action),
    btrim(p_requested_action),
    btrim(p_duration),
    p_start_date,
    btrim(p_evidence_rule),
    p_evidence_due_date,
    btrim(p_exit_conditions),
    btrim(p_maximum_burden),
    btrim(p_privacy_scope),
    btrim(p_no_trade_baseline)
  );

  select coalesce(max(version), 0) + 1 into next_version
  from public.trade_counterproposals
  where thread_id = p_thread_id;

  update public.trade_counterproposals
  set status = 'superseded', responded_at = now()
  where thread_id = p_thread_id and status = 'proposed';

  insert into public.trade_counterproposals(
    thread_id, offer_id, proposer_id, version, status,
    proposed_action, requested_action, duration, start_date,
    evidence_rule, evidence_due_date, exit_conditions, maximum_burden,
    privacy_scope, no_trade_baseline, terms_hash, submission_key, created_at
  ) values (
    p_thread_id, thread_row.offer_id, p_actor_id, next_version, 'proposed',
    btrim(p_proposed_action), btrim(p_requested_action), btrim(p_duration), p_start_date,
    btrim(p_evidence_rule), p_evidence_due_date, btrim(p_exit_conditions),
    btrim(p_maximum_burden), btrim(p_privacy_scope), btrim(p_no_trade_baseline),
    terms_hash_value, normalized_key, now()
  ) returning * into proposal_row;

  insert into public.trade_messages(
    thread_id, sender_id, message_type, body, metadata, created_at
  ) values (
    thread_row.id,
    null,
    'system',
    'Counterproposal v' || proposal_row.version::text || ' was submitted.',
    jsonb_build_object('counterproposalId', proposal_row.id, 'version', proposal_row.version),
    now()
  );
  update public.trade_threads
  set last_message_at = now(), updated_at = now()
  where id = thread_row.id;

  counterpart_id := case
    when thread_row.participant_a = p_actor_id then thread_row.participant_b
    else thread_row.participant_a
  end;
  begin
    insert into public.trade_notifications(
      user_id, notification_type, title, body, href, dedupe_key, created_at
    ) values (
      counterpart_id,
      'counterproposal_sent',
      'Counterproposal received',
      'A participant proposed a new immutable version of the terms.',
      '/messages/' || thread_row.id::text,
      'counterproposal_sent:' || proposal_row.id::text || ':' || counterpart_id::text,
      now()
    )
    on conflict (dedupe_key) do nothing;
  exception when others then
    null;
  end;

  return jsonb_build_object(
    'counterproposalId', proposal_row.id,
    'version', proposal_row.version,
    'created', true
  );
end;
$function$;

create or replace function public.withdraw_trade_response_v3(
  p_actor_id uuid,
  p_thread_id uuid,
  p_interest_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog
as $function$
declare
  thread_row public.trade_threads%rowtype;
  counterpart_id uuid;
begin
  select * into thread_row
  from public.trade_threads
  where id = p_thread_id
    and p_actor_id in (participant_a, participant_b);
  if not found then
    raise exception 'Thread not found or access denied.';
  end if;
  perform moral_trade_private.lock_pair(thread_row.participant_a, thread_row.participant_b);
  select * into thread_row
  from public.trade_threads
  where id = p_thread_id
    and p_actor_id in (participant_a, participant_b)
  for update;
  if not found then
    raise exception 'Thread not found or access denied.';
  end if;
  if thread_row.agreement_id is not null then
    raise exception 'Use the agreement exit workflow after agreement formation.';
  end if;
  if thread_row.status = 'closed' then
    return jsonb_build_object('threadId', thread_row.id, 'status', 'closed', 'idempotent', true);
  end if;

  if p_interest_id is not null then
    update public.interests
    set status = 'withdrawn', updated_at = now()
    where id = p_interest_id
      and offer_id = thread_row.offer_id
      and user_id = p_actor_id;
    if not found then
      raise exception 'Response not found or access denied.';
    end if;
  else
    update public.interests
    set status = 'withdrawn', updated_at = now()
    where offer_id = thread_row.offer_id
      and user_id = p_actor_id
      and status <> 'accepted';
  end if;

  update public.trade_counterproposals
  set status = 'withdrawn', responded_at = now()
  where thread_id = thread_row.id
    and proposer_id = p_actor_id
    and status = 'proposed';
  update public.trade_threads
  set status = 'closed', updated_at = now()
  where id = thread_row.id;

  counterpart_id := case
    when thread_row.participant_a = p_actor_id then thread_row.participant_b
    else thread_row.participant_a
  end;
  begin
    insert into public.trade_notifications(
      user_id, notification_type, title, body, href, dedupe_key, created_at
    ) values (
      counterpart_id,
      'response_withdrawn',
      'Response withdrawn',
      'The counterparty withdrew before agreement formation. No obligation was created.',
      '/messages/' || thread_row.id::text,
      'response_withdrawn:' || thread_row.id::text || ':' || p_actor_id::text,
      now()
    )
    on conflict (dedupe_key) do nothing;
  exception when others then
    null;
  end;

  return jsonb_build_object('threadId', thread_row.id, 'status', 'closed', 'idempotent', false);
end;
$function$;

create or replace function public.propose_agreement_version_v3(
  p_actor_id uuid,
  p_agreement_id uuid,
  p_submission_key text,
  p_proposed_action text,
  p_requested_action text,
  p_duration text,
  p_start_date date,
  p_evidence_rule text,
  p_evidence_due_date date,
  p_exit_conditions text,
  p_maximum_burden text,
  p_privacy_scope text,
  p_no_trade_baseline text
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog
as $function$
declare
  agreement_row public.agreements%rowtype;
  version_row public.trade_agreement_versions%rowtype;
  existing_row public.trade_agreement_versions%rowtype;
  next_version integer;
  counterpart_id uuid;
  terms_hash_value text;
  normalized_key text := btrim(coalesce(p_submission_key, ''));
begin
  if normalized_key = '' or length(normalized_key) > 200 then
    raise exception 'A bounded agreement version submission key is required.';
  end if;
  if greatest(
    length(btrim(coalesce(p_proposed_action, ''))),
    length(btrim(coalesce(p_requested_action, ''))),
    length(btrim(coalesce(p_duration, ''))),
    length(btrim(coalesce(p_evidence_rule, ''))),
    length(btrim(coalesce(p_exit_conditions, ''))),
    length(btrim(coalesce(p_maximum_burden, ''))),
    length(btrim(coalesce(p_privacy_scope, ''))),
    length(btrim(coalesce(p_no_trade_baseline, '')))
  ) > 5000
  or btrim(coalesce(p_proposed_action, '')) = ''
  or btrim(coalesce(p_requested_action, '')) = ''
  or btrim(coalesce(p_duration, '')) = ''
  or btrim(coalesce(p_evidence_rule, '')) = ''
  or btrim(coalesce(p_exit_conditions, '')) = ''
  or btrim(coalesce(p_maximum_burden, '')) = ''
  or btrim(coalesce(p_privacy_scope, '')) = ''
  or btrim(coalesce(p_no_trade_baseline, '')) = '' then
    raise exception 'Complete every bounded agreement term.';
  end if;

  select * into existing_row
  from public.trade_agreement_versions
  where proposed_by = p_actor_id and submission_key = normalized_key
  limit 1;
  if existing_row.id is not null then
    if existing_row.agreement_id <> p_agreement_id then
      raise exception 'Agreement version submission key belongs to another agreement.';
    end if;
    return jsonb_build_object(
      'agreementId', existing_row.agreement_id,
      'versionId', existing_row.id,
      'version', existing_row.version,
      'created', false
    );
  end if;

  select * into agreement_row
  from public.agreements
  where id = p_agreement_id
    and p_actor_id in (proposer_id, responder_id)
  for update;
  if not found then
    raise exception 'Agreement not found or access denied.';
  end if;
  if agreement_row.lifecycle_status <> 'proposed' then
    raise exception 'Activated agreement terms are immutable. Exit and create a new agreement to change them.';
  end if;

  terms_hash_value := public.core_trade_terms_hash(
    btrim(p_proposed_action), btrim(p_requested_action), btrim(p_duration), p_start_date,
    btrim(p_evidence_rule), p_evidence_due_date, btrim(p_exit_conditions),
    btrim(p_maximum_burden), btrim(p_privacy_scope), btrim(p_no_trade_baseline)
  );

  select * into existing_row
  from public.trade_agreement_versions
  where agreement_id = p_agreement_id and terms_hash = terms_hash_value
  limit 1;
  if existing_row.id is not null then
    if existing_row.id = agreement_row.current_version_id then
      return jsonb_build_object(
        'agreementId', existing_row.agreement_id,
        'versionId', existing_row.id,
        'version', existing_row.version,
        'created', false
      );
    end if;
    raise exception 'These exact terms already exist in the version history. Submit a materially distinct version.';
  end if;

  select coalesce(max(version), 0) + 1 into next_version
  from public.trade_agreement_versions
  where agreement_id = p_agreement_id;

  perform set_config('app.core_trade_linking_agreement', '1', true);
  insert into public.trade_agreement_versions(
    agreement_id, version, proposed_by, proposed_action, requested_action,
    duration, start_date, evidence_rule, evidence_due_date, exit_conditions,
    maximum_burden, privacy_scope, no_trade_baseline, terms_hash, submission_key, created_at
  ) values (
    p_agreement_id, next_version, p_actor_id,
    btrim(p_proposed_action), btrim(p_requested_action), btrim(p_duration), p_start_date,
    btrim(p_evidence_rule), p_evidence_due_date, btrim(p_exit_conditions),
    btrim(p_maximum_burden), btrim(p_privacy_scope), btrim(p_no_trade_baseline),
    terms_hash_value, normalized_key, now()
  ) returning * into version_row;

  perform set_config('app.core_trade_internal', '1', true);
  update public.agreements
  set current_version_id = version_row.id,
      evidence_due_at = version_row.evidence_due_date,
      lifecycle_status = 'proposed',
      status = 'proposed',
      updated_at = now()
  where id = p_agreement_id;

  counterpart_id := case
    when agreement_row.proposer_id = p_actor_id then agreement_row.responder_id
    else agreement_row.proposer_id
  end;
  begin
    insert into public.trade_notifications(
      user_id, notification_type, title, body, href, dedupe_key, created_at
    ) values (
      counterpart_id,
      'agreement_amendment',
      'Agreement amendment proposed',
      'A new immutable term version is awaiting separate confirmation from both participants.',
      '/trade-agreements/' || p_agreement_id::text,
      'agreement_amendment:' || version_row.id::text || ':' || counterpart_id::text,
      now()
    )
    on conflict (dedupe_key) do nothing;
  exception when others then
    null;
  end;

  return jsonb_build_object(
    'agreementId', p_agreement_id,
    'versionId', version_row.id,
    'version', version_row.version,
    'created', true
  );
end;
$function$;

create or replace function public.decline_proposed_agreement_v3(
  p_actor_id uuid,
  p_agreement_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog
as $function$
declare
  agreement_row public.agreements%rowtype;
  counterpart_id uuid;
begin
  select * into agreement_row
  from public.agreements
  where id = p_agreement_id
    and p_actor_id in (proposer_id, responder_id)
  for update;
  if not found then
    raise exception 'Agreement not found or access denied.';
  end if;
  if agreement_row.lifecycle_status = 'cancelled' then
    return jsonb_build_object('agreementId', p_agreement_id, 'status', 'cancelled', 'idempotent', true);
  end if;
  if agreement_row.lifecycle_status <> 'proposed' then
    raise exception 'Use the published exit workflow after activation.';
  end if;

  perform set_config('app.core_trade_internal', '1', true);
  update public.agreements
  set lifecycle_status = 'cancelled',
      status = 'cancelled',
      cancelled_at = coalesce(cancelled_at, now()),
      exit_requested_by = p_actor_id,
      exit_reason = 'Declined before bilateral activation.',
      updated_at = now()
  where id = p_agreement_id;
  update public.trade_threads
  set status = 'closed', updated_at = now()
  where agreement_id = p_agreement_id;

  counterpart_id := case
    when agreement_row.proposer_id = p_actor_id then agreement_row.responder_id
    else agreement_row.proposer_id
  end;
  begin
    insert into public.trade_notifications(
      user_id, notification_type, title, body, href, dedupe_key, created_at
    ) values (
      counterpart_id,
      'agreement_declined',
      'Agreement declined',
      'The proposed agreement was declined before activation. No obligation was created.',
      '/trade-agreements/' || p_agreement_id::text,
      'agreement_declined:' || p_agreement_id::text || ':' || counterpart_id::text,
      now()
    )
    on conflict (dedupe_key) do nothing;
  exception when others then
    null;
  end;

  return jsonb_build_object('agreementId', p_agreement_id, 'status', 'cancelled', 'idempotent', false);
end;
$function$;

revoke all on function public.send_trade_message_v3(uuid, uuid, text, text) from public, anon, authenticated;
revoke all on function public.create_counterproposal_v3(uuid, uuid, text, text, text, text, date, text, date, text, text, text, text) from public, anon, authenticated;
revoke all on function public.withdraw_trade_response_v3(uuid, uuid, uuid) from public, anon, authenticated;
revoke all on function public.propose_agreement_version_v3(uuid, uuid, text, text, text, text, date, text, date, text, text, text, text) from public, anon, authenticated;
revoke all on function public.decline_proposed_agreement_v3(uuid, uuid) from public, anon, authenticated;
grant execute on function public.send_trade_message_v3(uuid, uuid, text, text) to service_role;
grant execute on function public.create_counterproposal_v3(uuid, uuid, text, text, text, text, date, text, date, text, text, text, text) to service_role;
grant execute on function public.withdraw_trade_response_v3(uuid, uuid, uuid) to service_role;
grant execute on function public.propose_agreement_version_v3(uuid, uuid, text, text, text, text, date, text, date, text, text, text, text) to service_role;
grant execute on function public.decline_proposed_agreement_v3(uuid, uuid) to service_role;
