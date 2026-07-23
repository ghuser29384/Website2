-- Cover the remaining Universal Command foreign keys for cascade maintenance and joins.

create index if not exists command_messages_profile_idx
on public.command_messages (profile_id);

create index if not exists command_runs_profile_idx
on public.command_runs (profile_id);

create index if not exists command_runs_user_message_idx
on public.command_runs (user_message_id)
where user_message_id is not null;

create index if not exists command_tool_calls_session_idx
on public.command_tool_calls (session_id);

create index if not exists command_audit_events_run_idx
on public.command_audit_events (run_id)
where run_id is not null;

create index if not exists command_audit_events_tool_call_idx
on public.command_audit_events (tool_call_id)
where tool_call_id is not null;
