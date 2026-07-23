create or replace function public.confirm_trade_completion_v3(
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
  confirmation_count integer;
  counterpart_id uuid;
begin
  if p_actor_id is null or p_agreement_id is null then
    raise exception 'A signed-in agreement participant is required.';
  end if;

  select * into agreement_row
  from public.agreements
  where id = p_agreement_id
    and p_actor_id in (proposer_id, responder_id)
  for update;
  if not found then
    raise exception 'Agreement not found or access denied.';
  end if;
  if agreement_row.lifecycle_status = 'completed' then
    return jsonb_build_object(
      'agreementId', agreement_row.id,
      'confirmationCount', 2,
      'lifecycleStatus', 'completed',
      'completed', true,
      'idempotent', true
    );
  end if;
  if agreement_row.lifecycle_status not in ('active', 'evidence_due') then
    raise exception 'Completion cannot be confirmed in the current state.';
  end if;
  if not exists (
    select 1
    from public.trade_evidence_items evidence
    where evidence.agreement_id = agreement_row.id
      and evidence.status = 'accepted'
  ) then
    raise exception 'Accepted evidence is required before completion.';
  end if;

  insert into public.trade_completion_confirmations(
    agreement_id, user_id, confirmed_at
  ) values (
    agreement_row.id, p_actor_id, now()
  )
  on conflict (agreement_id, user_id) do nothing;

  select count(distinct user_id) into confirmation_count
  from public.trade_completion_confirmations
  where agreement_id = agreement_row.id
    and user_id in (agreement_row.proposer_id, agreement_row.responder_id);

  counterpart_id := case
    when agreement_row.proposer_id = p_actor_id then agreement_row.responder_id
    else agreement_row.proposer_id
  end;

  if confirmation_count < 2 then
    begin
      insert into public.trade_notifications(
        user_id, notification_type, title, body, href, dedupe_key, created_at
      ) values (
        counterpart_id,
        'completion_confirmation_required',
        'Completion confirmation required',
        'The other participant confirmed completion. Review the accepted evidence and confirm or challenge.',
        '/trade-agreements/' || agreement_row.id::text,
        'completion_confirmation:' || agreement_row.id::text || ':' || counterpart_id::text,
        now()
      )
      on conflict (dedupe_key) do nothing;
    exception when others then
      null;
    end;

    return jsonb_build_object(
      'agreementId', agreement_row.id,
      'confirmationCount', confirmation_count,
      'lifecycleStatus', agreement_row.lifecycle_status,
      'completed', false,
      'idempotent', false
    );
  end if;

  perform set_config('app.core_trade_internal', '1', true);
  update public.agreements
  set lifecycle_status = 'completed',
      status = 'completed',
      completed_at = coalesce(completed_at, now()),
      updated_at = now(),
      public_evidence_updated_at = now()
  where id = agreement_row.id;
  update public.trade_threads
  set status = 'closed', updated_at = now()
  where agreement_id = agreement_row.id;

  begin
    insert into public.core_loop_events(
      profile_id, event_type, entity_type, entity_id, idempotency_key, metadata, created_at
    ) values
      (
        agreement_row.proposer_id,
        'agreement_completed',
        'agreement',
        agreement_row.id,
        'agreement_completed:' || agreement_row.proposer_id::text || ':agreement:' || agreement_row.id::text,
        '{}'::jsonb,
        now()
      ),
      (
        agreement_row.responder_id,
        'agreement_completed',
        'agreement',
        agreement_row.id,
        'agreement_completed:' || agreement_row.responder_id::text || ':agreement:' || agreement_row.id::text,
        '{}'::jsonb,
        now()
      )
    on conflict (idempotency_key) do nothing;
  exception when others then
    null;
  end;

  begin
    insert into public.trade_notifications(
      user_id, notification_type, title, body, href, dedupe_key, created_at
    ) values
      (
        agreement_row.proposer_id,
        'agreement_completed',
        'Agreement completed',
        'Both participants confirmed completion. The final Deal Receipt is available.',
        '/trade-agreements/' || agreement_row.id::text,
        'agreement_completed:' || agreement_row.id::text || ':' || agreement_row.proposer_id::text,
        now()
      ),
      (
        agreement_row.responder_id,
        'agreement_completed',
        'Agreement completed',
        'Both participants confirmed completion. The final Deal Receipt is available.',
        '/trade-agreements/' || agreement_row.id::text,
        'agreement_completed:' || agreement_row.id::text || ':' || agreement_row.responder_id::text,
        now()
      )
    on conflict (dedupe_key) do nothing;
  exception when others then
    null;
  end;

  return jsonb_build_object(
    'agreementId', agreement_row.id,
    'confirmationCount', confirmation_count,
    'lifecycleStatus', 'completed',
    'completed', true,
    'idempotent', false
  );
end;
$function$;

create or replace function public.request_trade_exit_v3(
  p_actor_id uuid,
  p_agreement_id uuid,
  p_request_type text,
  p_reason text
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog
as $function$
declare
  agreement_row public.agreements%rowtype;
  request_row public.trade_exit_requests%rowtype;
  counterpart_id uuid;
  normalized_reason text := btrim(coalesce(p_reason, ''));
begin
  if p_actor_id is null or p_agreement_id is null then
    raise exception 'A signed-in agreement participant is required.';
  end if;
  if p_request_type not in ('mutual_cancel', 'unilateral_exit') then
    raise exception 'Choose mutual cancellation or unilateral exit.';
  end if;
  if normalized_reason = '' or length(normalized_reason) > 4000 then
    raise exception 'A bounded exit reason is required.';
  end if;

  select * into agreement_row
  from public.agreements
  where id = p_agreement_id
    and p_actor_id in (proposer_id, responder_id)
  for update;
  if not found then
    raise exception 'Agreement not found or access denied.';
  end if;

  select * into request_row
  from public.trade_exit_requests
  where agreement_id = agreement_row.id
    and requested_by = p_actor_id
    and request_type = p_request_type
    and status in ('pending', 'executed')
  order by created_at desc
  limit 1;
  if request_row.id is not null then
    return jsonb_build_object(
      'requestId', request_row.id,
      'requestStatus', request_row.status,
      'lifecycleStatus', agreement_row.lifecycle_status,
      'created', false
    );
  end if;

  if agreement_row.lifecycle_status in ('completed', 'cancelled', 'expired') then
    raise exception 'This agreement is already final.';
  end if;

  insert into public.trade_exit_requests(
    agreement_id, requested_by, request_type, reason, status, created_at, resolved_at
  ) values (
    agreement_row.id,
    p_actor_id,
    p_request_type,
    normalized_reason,
    case when p_request_type = 'unilateral_exit' then 'executed' else 'pending' end,
    now(),
    case when p_request_type = 'unilateral_exit' then now() else null end
  ) returning * into request_row;

  counterpart_id := case
    when agreement_row.proposer_id = p_actor_id then agreement_row.responder_id
    else agreement_row.proposer_id
  end;

  if p_request_type = 'unilateral_exit' then
    perform set_config('app.core_trade_internal', '1', true);
    update public.agreements
    set lifecycle_status = 'cancelled',
        status = 'cancelled',
        cancelled_at = coalesce(cancelled_at, now()),
        exit_requested_by = p_actor_id,
        exit_reason = normalized_reason,
        updated_at = now()
    where id = agreement_row.id;
    update public.trade_threads
    set status = 'closed', updated_at = now()
    where agreement_id = agreement_row.id;
  end if;

  begin
    insert into public.trade_notifications(
      user_id, notification_type, title, body, href, dedupe_key, created_at
    ) values (
      counterpart_id,
      case when p_request_type = 'unilateral_exit'
        then 'unilateral_exit'
        else 'mutual_cancel_requested'
      end,
      case when p_request_type = 'unilateral_exit'
        then 'Agreement exited'
        else 'Mutual cancellation requested'
      end,
      case when p_request_type = 'unilateral_exit'
        then 'The other participant used the published unilateral exit rule. Future obligations ended; completed periods remain recorded.'
        else 'The other participant requested mutual cancellation. Accept or decline in the agreement record.'
      end,
      '/trade-agreements/' || agreement_row.id::text,
      case when p_request_type = 'unilateral_exit'
        then 'unilateral_exit:' || request_row.id::text || ':' || counterpart_id::text
        else 'mutual_cancel:' || request_row.id::text || ':' || counterpart_id::text
      end,
      now()
    )
    on conflict (dedupe_key) do nothing;
  exception when others then
    null;
  end;

  return jsonb_build_object(
    'requestId', request_row.id,
    'requestStatus', request_row.status,
    'lifecycleStatus', case
      when p_request_type = 'unilateral_exit' then 'cancelled'
      else agreement_row.lifecycle_status
    end,
    'created', true
  );
end;
$function$;

create or replace function public.respond_trade_exit_v3(
  p_actor_id uuid,
  p_request_id uuid,
  p_decision text
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog
as $function$
declare
  request_row public.trade_exit_requests%rowtype;
  agreement_row public.agreements%rowtype;
  accepted boolean;
begin
  if p_actor_id is null or p_request_id is null then
    raise exception 'A signed-in counterparty and cancellation request are required.';
  end if;
  if p_decision not in ('accept', 'decline') then
    raise exception 'Choose accept or decline.';
  end if;

  select * into request_row
  from public.trade_exit_requests
  where id = p_request_id
  for update;
  if not found or request_row.request_type <> 'mutual_cancel' then
    raise exception 'Cancellation request is unavailable.';
  end if;

  select * into agreement_row
  from public.agreements
  where id = request_row.agreement_id
    and p_actor_id in (proposer_id, responder_id)
  for update;
  if not found or p_actor_id = request_row.requested_by then
    raise exception 'Only the other participant may decide this request.';
  end if;

  accepted := p_decision = 'accept';
  if request_row.status <> 'pending' then
    if (accepted and request_row.status = 'accepted')
       or (not accepted and request_row.status = 'declined') then
      return jsonb_build_object(
        'requestId', request_row.id,
        'requestStatus', request_row.status,
        'lifecycleStatus', agreement_row.lifecycle_status,
        'idempotent', true
      );
    end if;
    raise exception 'This cancellation request was already decided.';
  end if;
  if agreement_row.lifecycle_status in ('completed', 'cancelled', 'expired') then
    raise exception 'The agreement is already final.';
  end if;

  update public.trade_exit_requests
  set status = case when accepted then 'accepted' else 'declined' end,
      resolved_at = now()
  where id = request_row.id;

  if accepted then
    perform set_config('app.core_trade_internal', '1', true);
    update public.agreements
    set lifecycle_status = 'cancelled',
        status = 'cancelled',
        cancelled_at = coalesce(cancelled_at, now()),
        exit_requested_by = request_row.requested_by,
        exit_reason = request_row.reason,
        updated_at = now()
    where id = agreement_row.id;
    update public.trade_threads
    set status = 'closed', updated_at = now()
    where agreement_id = agreement_row.id;
  end if;

  begin
    insert into public.trade_notifications(
      user_id, notification_type, title, body, href, dedupe_key, created_at
    ) values (
      request_row.requested_by,
      case when accepted then 'mutual_cancel_accepted' else 'mutual_cancel_declined' end,
      case when accepted then 'Mutual cancellation accepted' else 'Mutual cancellation declined' end,
      case when accepted
        then 'Both participants agreed to cancel future obligations. Completed periods remain recorded.'
        else 'The mutual cancellation request was declined. The published unilateral exit rule remains available.'
      end,
      '/trade-agreements/' || agreement_row.id::text,
      'mutual_cancel_decision:' || request_row.id::text || ':' || p_decision,
      now()
    )
    on conflict (dedupe_key) do nothing;
  exception when others then
    null;
  end;

  return jsonb_build_object(
    'requestId', request_row.id,
    'requestStatus', case when accepted then 'accepted' else 'declined' end,
    'lifecycleStatus', case when accepted then 'cancelled' else agreement_row.lifecycle_status end,
    'idempotent', false
  );
end;
$function$;

revoke all on function public.confirm_trade_completion_v3(uuid, uuid) from public, anon, authenticated;
revoke all on function public.request_trade_exit_v3(uuid, uuid, text, text) from public, anon, authenticated;
revoke all on function public.respond_trade_exit_v3(uuid, uuid, text) from public, anon, authenticated;
grant execute on function public.confirm_trade_completion_v3(uuid, uuid) to service_role;
grant execute on function public.request_trade_exit_v3(uuid, uuid, text, text) to service_role;
grant execute on function public.respond_trade_exit_v3(uuid, uuid, text) to service_role;
