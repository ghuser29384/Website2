-- LOCAL CANDIDATE ONLY. Generate/review an ordered migration before any release.
-- Existing 200-agreement job; no table, RLS, provider or schedule changes.
begin;
create function public.apply_trade_reminder_batch_v1(
  p_reminders jsonb,
  p_updated_at timestamptz
)
returns jsonb
language plpgsql
security invoker
set search_path = pg_catalog
as $$
declare
  reminder jsonb;
  recipient jsonb;
  notification jsonb;
  email jsonb;
  notification_id uuid;
  marked integer := 0;
  notified integer := 0;
  queued integer := 0;
begin
  if current_user <> 'service_role' then
    raise exception 'Service role required.' using errcode = '42501';
  end if;
  if p_reminders is null or jsonb_typeof(p_reminders) <> 'array'
     or jsonb_array_length(p_reminders) > 200 or p_updated_at is null then
    raise exception 'Invalid reminder batch.' using errcode = '22023';
  end if;

  for reminder in select value from jsonb_array_elements(p_reminders)
  loop
    if jsonb_typeof(reminder->'recipients') is distinct from 'array'
       or jsonb_array_length(reminder->'recipients') <> 2 then
      raise exception 'Expected both agreement participants.' using errcode = '22023';
    end if;
    if (reminder->>'mark_due')::boolean then
      begin
        update public.agreements
        set lifecycle_status = 'evidence_due', updated_at = p_updated_at
        where id = (reminder->>'agreement_id')::uuid and lifecycle_status = 'active';
        -- Match the existing successful-request counter, including a concurrent no-op.
        marked := marked + 1;
      exception when others then
        -- Same best-effort update as the existing route; still notify participants.
        null;
      end;
    end if;

    for recipient in select value from jsonb_array_elements(reminder->'recipients')
    loop
      notification := recipient->'notification';
      email := recipient->'email';
      notification_id := null;
      begin
        insert into public.trade_notifications(user_id, notification_type, title, body, href, dedupe_key)
        values (
          (notification->>'user_id')::uuid, notification->>'notification_type',
          notification->>'title', notification->>'body', notification->>'href', notification->>'dedupe_key'
        ) returning id into notification_id;
      exception when others then
        -- Includes duplicate keys and individual constraint failures. No email in either case.
        continue;
      end;
      if notification_id is null then continue; end if;
      notified := notified + 1;

      if email is not null and email <> 'null'::jsonb then
        begin
          insert into public.email_outbox(profile_id, recipient_email, subject, body, status, provider)
          values (
            (email->>'profile_id')::uuid, email->>'recipient_email', email->>'subject',
            email->>'body', 'queued', 'core_trade_reminder'
          );
          queued := queued + 1;
        exception when others then
          -- Preserve the notification when queueing fails, as the existing route does.
          null;
        end;
      end if;
    end loop;
  end loop;
  return jsonb_build_object(
    'notificationsCreated', notified, 'emailsQueued', queued, 'agreementsMarkedDue', marked
  );
end;
$$;
revoke all on function public.apply_trade_reminder_batch_v1(jsonb, timestamptz) from public, anon, authenticated;
grant execute on function public.apply_trade_reminder_batch_v1(jsonb, timestamptz) to service_role;
commit;
