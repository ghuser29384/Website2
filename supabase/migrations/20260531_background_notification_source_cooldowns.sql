alter table public.background_notification_preferences
  add column if not exists source_cooldown_hours smallint;

alter table public.background_notification_preferences
  add column if not exists last_discovery_sent_at timestamptz;

alter table public.background_notification_preferences
  drop constraint if exists background_notification_preferences_source_cooldown_check;

alter table public.background_notification_preferences
  add constraint background_notification_preferences_source_cooldown_check
  check (source_cooldown_hours is null or source_cooldown_hours between 0 and 168);
