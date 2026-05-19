-- Run this entire file as one query. In the Supabase SQL editor, clear any
-- text selection first; otherwise Supabase runs only the selected fragment.
begin;

create extension if not exists pgcrypto;

create table if not exists public.mpgf_state_transition_logs (
  id uuid primary key default gen_random_uuid(),
  object_type text not null,
  object_id text not null,
  from_status text,
  to_status text not null,
  actor_user_id uuid,
  reason text,
  trace_id uuid,
  transition_trace_id uuid,
  metadata_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

alter table public.mpgf_state_transition_logs
  add column if not exists transition_trace_id uuid,
  add column if not exists metadata_json jsonb not null default '{}'::jsonb;

create table if not exists public.mpgf_idempotency_keys (
  id uuid primary key default gen_random_uuid(),
  scope text not null,
  idempotency_key text not null,
  actor_user_id uuid,
  action text not null default 'unknown',
  request_hash text not null,
  cycle_id text,
  status text not null default 'received',
  response_reference_json jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  expires_at timestamptz not null default (timezone('utc', now()) + interval '30 days'),
  unique (scope, idempotency_key)
);

alter table public.mpgf_idempotency_keys
  add column if not exists actor_user_id uuid,
  add column if not exists action text not null default 'unknown',
  add column if not exists request_hash text not null default '',
  add column if not exists cycle_id text,
  add column if not exists response_reference_json jsonb,
  add column if not exists expires_at timestamptz not null default (timezone('utc', now()) + interval '30 days');

update public.mpgf_idempotency_keys
set
  action = coalesce(action, 'unknown'),
  request_hash = coalesce(nullif(request_hash, ''), 'legacy-unhashed-request'),
  expires_at = coalesce(expires_at, timezone('utc', now()) + interval '30 days'),
  status = case status
    when 'reserved' then 'received'
    when 'succeeded' then 'completed'
    else status
  end;

alter table public.mpgf_idempotency_keys
  drop constraint if exists mpgf_idempotency_keys_status_check,
  add constraint mpgf_idempotency_keys_status_check
    check (status in ('received', 'completed', 'failed', 'conflict', 'expired'));

create unique index if not exists mpgf_idempotency_keys_scope_key_idx
  on public.mpgf_idempotency_keys (scope, idempotency_key);

create index if not exists mpgf_idempotency_keys_actor_idx
  on public.mpgf_idempotency_keys (actor_user_id, created_at desc);

create table if not exists public.mpgf_operational_events (
  id uuid primary key default gen_random_uuid(),
  event_type text not null,
  cycle_id text,
  status text not null default 'recorded',
  event_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

alter table public.mpgf_operational_events
  drop constraint if exists mpgf_operational_events_status_check,
  add constraint mpgf_operational_events_status_check
    check (status in ('recorded', 'voided', 'superseded'));

grant select, insert, update on public.mpgf_idempotency_keys to authenticated;
grant insert on public.mpgf_state_transition_logs to authenticated;
grant insert on public.mpgf_operational_events to authenticated;
grant all on public.mpgf_idempotency_keys to service_role;
grant all on public.mpgf_state_transition_logs to service_role;
grant all on public.mpgf_operational_events to service_role;

alter table public.mpgf_idempotency_keys enable row level security;
alter table public.mpgf_state_transition_logs enable row level security;
alter table public.mpgf_operational_events enable row level security;

drop policy if exists mpgf_idempotency_keys_owner_select on public.mpgf_idempotency_keys;
create policy mpgf_idempotency_keys_owner_select
  on public.mpgf_idempotency_keys
  for select
  to authenticated
  using (actor_user_id = auth.uid());

drop policy if exists mpgf_idempotency_keys_owner_insert on public.mpgf_idempotency_keys;
create policy mpgf_idempotency_keys_owner_insert
  on public.mpgf_idempotency_keys
  for insert
  to authenticated
  with check (actor_user_id = auth.uid());

drop policy if exists mpgf_idempotency_keys_owner_update on public.mpgf_idempotency_keys;
create policy mpgf_idempotency_keys_owner_update
  on public.mpgf_idempotency_keys
  for update
  to authenticated
  using (actor_user_id = auth.uid())
  with check (actor_user_id = auth.uid());

drop policy if exists mpgf_state_transition_logs_owner_insert on public.mpgf_state_transition_logs;
create policy mpgf_state_transition_logs_owner_insert
  on public.mpgf_state_transition_logs
  for insert
  to authenticated
  with check (actor_user_id = auth.uid());

drop policy if exists mpgf_operational_events_authenticated_insert on public.mpgf_operational_events;
create policy mpgf_operational_events_authenticated_insert
  on public.mpgf_operational_events
  for insert
  to authenticated
  with check (true);

commit;
