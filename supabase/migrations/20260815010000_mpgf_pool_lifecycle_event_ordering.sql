begin;

alter table public.mpgf_pool_lifecycle_events
  add column if not exists event_sequence bigint generated always as identity;

create unique index if not exists mpgf_pool_lifecycle_events_event_sequence_idx
  on public.mpgf_pool_lifecycle_events(event_sequence);

create index if not exists mpgf_pool_lifecycle_events_proposal_sequence_idx
  on public.mpgf_pool_lifecycle_events(proposal_id, event_sequence);

comment on column public.mpgf_pool_lifecycle_events.event_sequence is
  'Database-assigned append order for deterministic lifecycle rendering when multiple events share a transaction timestamp.';

commit;
