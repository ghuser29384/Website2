begin;

alter table public.mpgf_payment_webhook_events
  add column if not exists replay_attempt_count integer not null default 0 check (replay_attempt_count >= 0),
  add column if not exists last_replayed_at timestamptz;

create index if not exists mpgf_payment_webhook_events_replay_attempts_idx
on public.mpgf_payment_webhook_events (last_replayed_at desc)
where replay_attempt_count > 0;

commit;
