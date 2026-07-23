-- Universal Command workspace: private, resumable conversation and typed tool audit state.
-- Private free text and tool payloads are encrypted by the application before insertion.

create table if not exists public.command_sessions (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  title text not null default '[encrypted private field]',
  title_ciphertext text not null default '',
  title_encryption_version text not null default '',
  summary text not null default '[encrypted private field]',
  summary_ciphertext text not null default '',
  summary_encryption_version text not null default '',
  state text not null default 'active' check (state in ('active', 'archived')),
  version text not null default 'moral-trade-command-v1',
  last_activity_at timestamptz not null default timezone('utc', now()),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.command_messages (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.command_sessions (id) on delete cascade,
  profile_id uuid not null references public.profiles (id) on delete cascade,
  role text not null check (role in ('user', 'assistant', 'system')),
  body text not null default '[encrypted private field]',
  body_ciphertext text not null,
  body_encryption_version text not null,
  message_kind text not null default 'message' check (message_kind in ('message', 'clarification', 'status')),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.command_runs (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.command_sessions (id) on delete cascade,
  profile_id uuid not null references public.profiles (id) on delete cascade,
  user_message_id uuid references public.command_messages (id) on delete set null,
  status text not null default 'planning' check (
    status in ('planning', 'awaiting_clarification', 'awaiting_confirmation', 'completed', 'blocked', 'failed')
  ),
  intent_summary text not null default '[encrypted private field]',
  intent_ciphertext text not null default '',
  plan jsonb not null default '[]'::jsonb,
  plan_ciphertext text not null default '',
  clarification jsonb,
  clarification_ciphertext text not null default '',
  encryption_version text not null default '',
  confidence double precision not null default 0 check (confidence >= 0 and confidence <= 1),
  model_mode text not null check (model_mode in ('deterministic', 'openai')),
  model_name text not null default 'deterministic-v1',
  created_at timestamptz not null default timezone('utc', now()),
  completed_at timestamptz
);

create table if not exists public.command_tool_calls (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references public.command_runs (id) on delete cascade,
  session_id uuid not null references public.command_sessions (id) on delete cascade,
  profile_id uuid not null references public.profiles (id) on delete cascade,
  capability_key text not null,
  permission_tier text not null check (
    permission_tier in ('read_only', 'private_reversible', 'external_consequential', 'financial_strong_confirmation', 'prohibited')
  ),
  confirmation_level text not null check (
    confirmation_level in ('none', 'acknowledge', 'confirm', 'type_exact_phrase')
  ),
  execution_mode text not null check (
    execution_mode in ('immediate', 'private_handoff', 'confirmed_handoff', 'strong_confirmed_handoff', 'blocked')
  ),
  reversible boolean not null default false,
  status text not null default 'proposed' check (
    status in ('proposed', 'ready', 'awaiting_confirmation', 'confirmed', 'completed', 'blocked', 'failed')
  ),
  arguments_summary jsonb not null default '{}'::jsonb,
  payload_ciphertext text not null,
  payload_encryption_version text not null,
  confidence double precision not null default 0 check (confidence >= 0 and confidence <= 1),
  rationale text not null default '[encrypted private field]',
  rationale_ciphertext text not null default '',
  result jsonb,
  confirmed_at timestamptz,
  executed_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.command_audit_events (
  id uuid primary key default gen_random_uuid(),
  seq bigint generated always as identity unique,
  profile_id uuid not null references public.profiles (id) on delete cascade,
  session_id uuid references public.command_sessions (id) on delete cascade,
  run_id uuid references public.command_runs (id) on delete cascade,
  tool_call_id uuid references public.command_tool_calls (id) on delete cascade,
  event_type text not null,
  metadata jsonb not null default '{}'::jsonb,
  prev_hash text,
  entry_hash text not null,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists command_sessions_profile_activity_idx
on public.command_sessions (profile_id, state, last_activity_at desc);

create index if not exists command_messages_session_created_idx
on public.command_messages (session_id, created_at asc);

create index if not exists command_runs_session_created_idx
on public.command_runs (session_id, created_at desc);

create index if not exists command_tool_calls_run_created_idx
on public.command_tool_calls (run_id, created_at asc);

create index if not exists command_tool_calls_profile_status_idx
on public.command_tool_calls (profile_id, status, created_at desc);

create index if not exists command_audit_events_profile_seq_idx
on public.command_audit_events (profile_id, seq desc);

create index if not exists command_audit_events_session_seq_idx
on public.command_audit_events (session_id, seq asc);

drop trigger if exists command_sessions_set_updated_at on public.command_sessions;
create trigger command_sessions_set_updated_at
before update on public.command_sessions
for each row execute function public.set_updated_at();

drop trigger if exists command_tool_calls_set_updated_at on public.command_tool_calls;
create trigger command_tool_calls_set_updated_at
before update on public.command_tool_calls
for each row execute function public.set_updated_at();

alter table public.command_sessions enable row level security;
alter table public.command_messages enable row level security;
alter table public.command_runs enable row level security;
alter table public.command_tool_calls enable row level security;
alter table public.command_audit_events enable row level security;

grant select, insert, update, delete on public.command_sessions to authenticated;
grant select, insert on public.command_messages to authenticated;
grant select, insert, update on public.command_runs to authenticated;
grant select, insert, update on public.command_tool_calls to authenticated;
grant select, insert on public.command_audit_events to authenticated;
grant usage, select on sequence public.command_audit_events_seq_seq to authenticated;

grant all on public.command_sessions to service_role;
grant all on public.command_messages to service_role;
grant all on public.command_runs to service_role;
grant all on public.command_tool_calls to service_role;
grant all on public.command_audit_events to service_role;
grant all on sequence public.command_audit_events_seq_seq to service_role;

drop policy if exists "command_sessions_select_own" on public.command_sessions;
create policy "command_sessions_select_own"
on public.command_sessions for select to authenticated
using (profile_id = (select auth.uid()));

drop policy if exists "command_sessions_insert_own" on public.command_sessions;
create policy "command_sessions_insert_own"
on public.command_sessions for insert to authenticated
with check (profile_id = (select auth.uid()));

drop policy if exists "command_sessions_update_own" on public.command_sessions;
create policy "command_sessions_update_own"
on public.command_sessions for update to authenticated
using (profile_id = (select auth.uid()))
with check (profile_id = (select auth.uid()));

drop policy if exists "command_sessions_delete_own" on public.command_sessions;
create policy "command_sessions_delete_own"
on public.command_sessions for delete to authenticated
using (profile_id = (select auth.uid()));

drop policy if exists "command_messages_select_own" on public.command_messages;
create policy "command_messages_select_own"
on public.command_messages for select to authenticated
using (profile_id = (select auth.uid()));

drop policy if exists "command_messages_insert_own" on public.command_messages;
create policy "command_messages_insert_own"
on public.command_messages for insert to authenticated
with check (
  profile_id = (select auth.uid())
  and exists (
    select 1 from public.command_sessions s
    where s.id = session_id and s.profile_id = (select auth.uid())
  )
);

drop policy if exists "command_runs_select_own" on public.command_runs;
create policy "command_runs_select_own"
on public.command_runs for select to authenticated
using (profile_id = (select auth.uid()));

drop policy if exists "command_runs_insert_own" on public.command_runs;
create policy "command_runs_insert_own"
on public.command_runs for insert to authenticated
with check (
  profile_id = (select auth.uid())
  and exists (
    select 1 from public.command_sessions s
    where s.id = session_id and s.profile_id = (select auth.uid())
  )
);

drop policy if exists "command_runs_update_own" on public.command_runs;
create policy "command_runs_update_own"
on public.command_runs for update to authenticated
using (profile_id = (select auth.uid()))
with check (profile_id = (select auth.uid()));

drop policy if exists "command_tool_calls_select_own" on public.command_tool_calls;
create policy "command_tool_calls_select_own"
on public.command_tool_calls for select to authenticated
using (profile_id = (select auth.uid()));

drop policy if exists "command_tool_calls_insert_own" on public.command_tool_calls;
create policy "command_tool_calls_insert_own"
on public.command_tool_calls for insert to authenticated
with check (
  profile_id = (select auth.uid())
  and exists (
    select 1 from public.command_runs r
    where r.id = run_id and r.session_id = session_id and r.profile_id = (select auth.uid())
  )
);

drop policy if exists "command_tool_calls_update_own" on public.command_tool_calls;
create policy "command_tool_calls_update_own"
on public.command_tool_calls for update to authenticated
using (profile_id = (select auth.uid()))
with check (profile_id = (select auth.uid()));

drop policy if exists "command_audit_events_select_own" on public.command_audit_events;
create policy "command_audit_events_select_own"
on public.command_audit_events for select to authenticated
using (profile_id = (select auth.uid()));

drop policy if exists "command_audit_events_insert_own" on public.command_audit_events;
create policy "command_audit_events_insert_own"
on public.command_audit_events for insert to authenticated
with check (
  profile_id = (select auth.uid())
  and (session_id is null or exists (
    select 1 from public.command_sessions s
    where s.id = session_id and s.profile_id = (select auth.uid())
  ))
);

comment on table public.command_sessions is
  'Private, resumable Moral Trade Command conversations. Human-readable title/summary values are stored encrypted.';
comment on table public.command_tool_calls is
  'Typed Command capability proposals and authoritative execution results; raw arguments are encrypted and model output never bypasses deterministic authorization.';
comment on table public.command_audit_events is
  'Append-only, public-safe audit events for Command planning, confirmation, and execution transitions.';
