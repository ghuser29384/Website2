create or replace function public.replace_agreement_reminder_configuration(
  p_agreement_id uuid,
  p_user_id uuid,
  p_preferences jsonb,
  p_rules jsonb
)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if not exists (
    select 1
    from public.agreements
    where id = p_agreement_id
      and (proposer_id = p_user_id or responder_id = p_user_id)
  ) then
    raise exception 'Agreement not found or reminder access denied.';
  end if;

  insert into public.agreement_reminder_preferences (
    agreement_id,
    user_id,
    timezone,
    quiet_hours_enabled,
    quiet_hours_start,
    quiet_hours_end,
    in_app_enabled,
    email_enabled,
    paused,
    updated_at
  )
  values (
    p_agreement_id,
    p_user_id,
    coalesce(nullif(p_preferences ->> 'timezone', ''), 'UTC'),
    coalesce((p_preferences ->> 'quietHoursEnabled')::boolean, true),
    coalesce(nullif(p_preferences ->> 'quietHoursStart', '')::time, time '22:00'),
    coalesce(nullif(p_preferences ->> 'quietHoursEnd', '')::time, time '07:00'),
    coalesce((p_preferences ->> 'inAppEnabled')::boolean, true),
    coalesce((p_preferences ->> 'emailEnabled')::boolean, false),
    coalesce((p_preferences ->> 'paused')::boolean, false),
    now()
  )
  on conflict (agreement_id, user_id)
  do update set
    timezone = excluded.timezone,
    quiet_hours_enabled = excluded.quiet_hours_enabled,
    quiet_hours_start = excluded.quiet_hours_start,
    quiet_hours_end = excluded.quiet_hours_end,
    in_app_enabled = excluded.in_app_enabled,
    email_enabled = excluded.email_enabled,
    paused = excluded.paused,
    updated_at = now();

  insert into public.agreement_reminder_rules (
    agreement_id,
    user_id,
    source,
    milestone_key,
    milestone_label,
    due_at,
    offset_minutes,
    remind_at,
    enabled,
    in_app_enabled,
    email_enabled,
    calendar_enabled,
    created_at,
    updated_at
  )
  select
    p_agreement_id,
    p_user_id,
    coalesce(nullif(rule.source, ''), 'agreement'),
    rule.milestone_key,
    rule.milestone_label,
    rule.due_at,
    rule.offset_minutes,
    rule.due_at + (rule.offset_minutes * interval '1 minute'),
    coalesce(rule.enabled, true),
    coalesce(rule.in_app_enabled, true),
    coalesce(rule.email_enabled, false),
    coalesce(rule.calendar_enabled, true),
    now(),
    now()
  from jsonb_to_recordset(coalesce(p_rules, '[]'::jsonb)) as rule(
    source text,
    milestone_key text,
    milestone_label text,
    due_at timestamp with time zone,
    offset_minutes integer,
    enabled boolean,
    in_app_enabled boolean,
    email_enabled boolean,
    calendar_enabled boolean
  )
  on conflict (agreement_id, user_id, milestone_key, offset_minutes)
  do update set
    source = excluded.source,
    milestone_label = excluded.milestone_label,
    due_at = excluded.due_at,
    enabled = excluded.enabled,
    in_app_enabled = excluded.in_app_enabled,
    email_enabled = excluded.email_enabled,
    calendar_enabled = excluded.calendar_enabled,
    updated_at = now();

  delete from public.agreement_reminder_rules existing
  where existing.agreement_id = p_agreement_id
    and existing.user_id = p_user_id
    and not exists (
      select 1
      from jsonb_to_recordset(coalesce(p_rules, '[]'::jsonb)) as incoming(
        source text,
        milestone_key text,
        milestone_label text,
        due_at timestamp with time zone,
        offset_minutes integer,
        enabled boolean,
        in_app_enabled boolean,
        email_enabled boolean,
        calendar_enabled boolean
      )
      where incoming.milestone_key = existing.milestone_key
        and incoming.offset_minutes = existing.offset_minutes
    );
end;
$$;

revoke all on function public.replace_agreement_reminder_configuration(uuid, uuid, jsonb, jsonb)
  from public, anon, authenticated;
grant execute on function public.replace_agreement_reminder_configuration(uuid, uuid, jsonb, jsonb)
  to service_role;
