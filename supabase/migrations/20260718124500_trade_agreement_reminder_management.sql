create table if not exists public.agreement_reminder_preferences (
  id uuid primary key default gen_random_uuid(),
  agreement_id uuid not null references public.agreements(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  timezone text not null default 'UTC',
  quiet_hours_enabled boolean not null default true,
  quiet_hours_start time without time zone not null default time '22:00',
  quiet_hours_end time without time zone not null default time '07:00',
  in_app_enabled boolean not null default true,
  email_enabled boolean not null default false,
  paused boolean not null default false,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  constraint agreement_reminder_preferences_scope_unique unique (agreement_id, user_id),
  constraint agreement_reminder_preferences_timezone_length check (char_length(timezone) between 1 and 100)
);

create table if not exists public.agreement_reminder_rules (
  id uuid primary key default gen_random_uuid(),
  agreement_id uuid not null references public.agreements(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  source text not null default 'agreement',
  milestone_key text not null,
  milestone_label text not null,
  due_at timestamp with time zone not null,
  offset_minutes integer not null default 0,
  remind_at timestamp with time zone not null,
  enabled boolean not null default true,
  in_app_enabled boolean not null default true,
  email_enabled boolean not null default false,
  calendar_enabled boolean not null default true,
  last_sent_at timestamp with time zone,
  last_sent_remind_at timestamp with time zone,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  constraint agreement_reminder_rules_scope_unique unique (
    agreement_id,
    user_id,
    milestone_key,
    offset_minutes
  ),
  constraint agreement_reminder_rules_source_check check (source in ('agreement', 'custom')),
  constraint agreement_reminder_rules_key_length check (char_length(milestone_key) between 1 and 180),
  constraint agreement_reminder_rules_label_length check (char_length(milestone_label) between 1 and 180),
  constraint agreement_reminder_rules_offset_check check (offset_minutes between -43200 and 43200)
);

create table if not exists public.reminder_calendar_feeds (
  user_id uuid primary key references auth.users(id) on delete cascade,
  feed_token uuid not null default gen_random_uuid(),
  enabled boolean not null default true,
  include_commitment_title boolean not null default false,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now(),
  constraint reminder_calendar_feeds_token_unique unique (feed_token)
);

create or replace function public.set_agreement_reminder_occurrence()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  new.remind_at := new.due_at + (new.offset_minutes * interval '1 minute');
  return new;
end;
$$;

drop trigger if exists set_agreement_reminder_occurrence on public.agreement_reminder_rules;
create trigger set_agreement_reminder_occurrence
before insert or update of due_at, offset_minutes
on public.agreement_reminder_rules
for each row
execute function public.set_agreement_reminder_occurrence();

create index if not exists agreement_reminder_preferences_user_idx
  on public.agreement_reminder_preferences (user_id, agreement_id);

create index if not exists agreement_reminder_rules_agreement_user_idx
  on public.agreement_reminder_rules (agreement_id, user_id);

create index if not exists agreement_reminder_rules_due_idx
  on public.agreement_reminder_rules (remind_at, user_id)
  where enabled;

create index if not exists reminder_calendar_feeds_enabled_idx
  on public.reminder_calendar_feeds (feed_token)
  where enabled;

alter table public.agreement_reminder_preferences enable row level security;
alter table public.agreement_reminder_rules enable row level security;
alter table public.reminder_calendar_feeds enable row level security;

create policy agreement_reminder_preferences_select_participant
  on public.agreement_reminder_preferences
  for select
  to authenticated
  using (
    user_id = (select auth.uid())
    and exists (
      select 1
      from public.agreements
      where agreements.id = agreement_reminder_preferences.agreement_id
        and (
          agreements.proposer_id = (select auth.uid())
          or agreements.responder_id = (select auth.uid())
        )
    )
  );

create policy agreement_reminder_preferences_insert_participant
  on public.agreement_reminder_preferences
  for insert
  to authenticated
  with check (
    user_id = (select auth.uid())
    and exists (
      select 1
      from public.agreements
      where agreements.id = agreement_reminder_preferences.agreement_id
        and (
          agreements.proposer_id = (select auth.uid())
          or agreements.responder_id = (select auth.uid())
        )
    )
  );

create policy agreement_reminder_preferences_update_participant
  on public.agreement_reminder_preferences
  for update
  to authenticated
  using (
    user_id = (select auth.uid())
    and exists (
      select 1
      from public.agreements
      where agreements.id = agreement_reminder_preferences.agreement_id
        and (
          agreements.proposer_id = (select auth.uid())
          or agreements.responder_id = (select auth.uid())
        )
    )
  )
  with check (
    user_id = (select auth.uid())
    and exists (
      select 1
      from public.agreements
      where agreements.id = agreement_reminder_preferences.agreement_id
        and (
          agreements.proposer_id = (select auth.uid())
          or agreements.responder_id = (select auth.uid())
        )
    )
  );

create policy agreement_reminder_preferences_delete_participant
  on public.agreement_reminder_preferences
  for delete
  to authenticated
  using (
    user_id = (select auth.uid())
    and exists (
      select 1
      from public.agreements
      where agreements.id = agreement_reminder_preferences.agreement_id
        and (
          agreements.proposer_id = (select auth.uid())
          or agreements.responder_id = (select auth.uid())
        )
    )
  );

create policy agreement_reminder_rules_select_participant
  on public.agreement_reminder_rules
  for select
  to authenticated
  using (
    user_id = (select auth.uid())
    and exists (
      select 1
      from public.agreements
      where agreements.id = agreement_reminder_rules.agreement_id
        and (
          agreements.proposer_id = (select auth.uid())
          or agreements.responder_id = (select auth.uid())
        )
    )
  );

create policy agreement_reminder_rules_insert_participant
  on public.agreement_reminder_rules
  for insert
  to authenticated
  with check (
    user_id = (select auth.uid())
    and exists (
      select 1
      from public.agreements
      where agreements.id = agreement_reminder_rules.agreement_id
        and (
          agreements.proposer_id = (select auth.uid())
          or agreements.responder_id = (select auth.uid())
        )
    )
  );

create policy agreement_reminder_rules_update_participant
  on public.agreement_reminder_rules
  for update
  to authenticated
  using (
    user_id = (select auth.uid())
    and exists (
      select 1
      from public.agreements
      where agreements.id = agreement_reminder_rules.agreement_id
        and (
          agreements.proposer_id = (select auth.uid())
          or agreements.responder_id = (select auth.uid())
        )
    )
  )
  with check (
    user_id = (select auth.uid())
    and exists (
      select 1
      from public.agreements
      where agreements.id = agreement_reminder_rules.agreement_id
        and (
          agreements.proposer_id = (select auth.uid())
          or agreements.responder_id = (select auth.uid())
        )
    )
  );

create policy agreement_reminder_rules_delete_participant
  on public.agreement_reminder_rules
  for delete
  to authenticated
  using (
    user_id = (select auth.uid())
    and exists (
      select 1
      from public.agreements
      where agreements.id = agreement_reminder_rules.agreement_id
        and (
          agreements.proposer_id = (select auth.uid())
          or agreements.responder_id = (select auth.uid())
        )
    )
  );

create policy reminder_calendar_feeds_self_select
  on public.reminder_calendar_feeds
  for select
  to authenticated
  using (user_id = (select auth.uid()));

create policy reminder_calendar_feeds_self_insert
  on public.reminder_calendar_feeds
  for insert
  to authenticated
  with check (user_id = (select auth.uid()));

create policy reminder_calendar_feeds_self_update
  on public.reminder_calendar_feeds
  for update
  to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy reminder_calendar_feeds_self_delete
  on public.reminder_calendar_feeds
  for delete
  to authenticated
  using (user_id = (select auth.uid()));

grant select, insert, update, delete on public.agreement_reminder_preferences to authenticated;
grant select, insert, update, delete on public.agreement_reminder_rules to authenticated;
grant select, insert, update, delete on public.reminder_calendar_feeds to authenticated;

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

  delete from public.agreement_reminder_rules
  where agreement_id = p_agreement_id
    and user_id = p_user_id;

  insert into public.agreement_reminder_rules (
    agreement_id,
    user_id,
    source,
    milestone_key,
    milestone_label,
    due_at,
    offset_minutes,
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
  );
end;
$$;

revoke all on function public.replace_agreement_reminder_configuration(uuid, uuid, jsonb, jsonb)
  from public, anon, authenticated;
grant execute on function public.replace_agreement_reminder_configuration(uuid, uuid, jsonb, jsonb)
  to service_role;
