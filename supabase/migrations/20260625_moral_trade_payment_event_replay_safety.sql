create table if not exists public.moral_trade_payment_event_deliveries (
  id uuid primary key default gen_random_uuid(),
  provider text not null check (provider in ('stripe', 'every_org', 'manual_evidence', 'test_provider')),
  provider_event_id_hash text not null check (provider_event_id_hash ~ '^sha256:[a-f0-9]{64}$'),
  idempotency_key_hash text not null check (idempotency_key_hash ~ '^sha256:[a-f0-9]{64}$'),
  transition text not null check (transition in ('authorization', 'capture', 'cancellation', 'refund', 'payout_release')),
  event_type text not null,
  received_at timestamptz not null default now(),
  stored_before_apply_bool boolean not null default true check (stored_before_apply_bool = true),
  duplicate_provider_event_bool boolean not null default false,
  duplicate_idempotency_key_bool boolean not null default false,
  raw_payload_stored_bool boolean not null default false check (raw_payload_stored_bool = false),
  created_at timestamptz not null default now()
);

create table if not exists public.moral_trade_provider_source_authentication_records (
  id uuid primary key default gen_random_uuid(),
  payment_event_delivery_id uuid not null references public.moral_trade_payment_event_deliveries(id) on delete cascade,
  provider_source_authentication_policy_ref text not null,
  policy_snapshot_status text not null check (policy_snapshot_status in ('resolved_immutable', 'missing', 'mutable', 'stale', 'superseded')),
  signature_verified_bool boolean not null default false,
  provider_account_verified_bool boolean not null default false,
  endpoint_verified_bool boolean not null default false,
  event_type_allowed_bool boolean not null default false,
  replay_window_valid_bool boolean not null default false,
  authenticated_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.moral_trade_payment_transition_attempts (
  id uuid primary key default gen_random_uuid(),
  payment_event_delivery_id uuid not null references public.moral_trade_payment_event_deliveries(id) on delete cascade,
  provider text not null,
  provider_event_id_hash text not null check (provider_event_id_hash ~ '^sha256:[a-f0-9]{64}$'),
  idempotency_key_hash text not null check (idempotency_key_hash ~ '^sha256:[a-f0-9]{64}$'),
  locked_agreement_ref text not null,
  locked_terms_snapshot_hash text not null check (locked_terms_snapshot_hash ~ '^sha256:[a-f0-9]{64}$'),
  referenced_terms_snapshot_hash text not null check (referenced_terms_snapshot_hash ~ '^sha256:[a-f0-9]{64}$'),
  locked_participant_confirmation_hash text not null check (locked_participant_confirmation_hash ~ '^sha256:[a-f0-9]{64}$'),
  referenced_participant_confirmation_hash text not null check (referenced_participant_confirmation_hash ~ '^sha256:[a-f0-9]{64}$'),
  server_deadline_at timestamptz not null,
  impossible_transition_bool boolean not null default false,
  database_transaction_used_bool boolean not null default false,
  marketplace_state_event_ref text,
  manual_review_queue_ref text,
  transition_status text not null check (transition_status in ('pending', 'applied', 'ignored_duplicate', 'blocked_manual_review')),
  created_at timestamptz not null default now(),
  unique (provider, provider_event_id_hash),
  unique (idempotency_key_hash)
);

create table if not exists public.moral_trade_marketplace_state_events (
  id uuid primary key default gen_random_uuid(),
  payment_transition_attempt_id uuid references public.moral_trade_payment_transition_attempts(id),
  state_event_ref text not null unique,
  subject_type text not null check (subject_type in ('payment_event', 'cleared_trade_agreement', 'payout_milestone')),
  subject_ref text not null,
  transition text not null check (transition in ('authorization', 'capture', 'cancellation', 'refund', 'payout_release')),
  previous_state text not null,
  next_state text not null,
  event_hash text not null check (event_hash ~ '^sha256:[a-f0-9]{64}$'),
  transaction_group_ref text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.moral_trade_payment_manual_review_queue (
  id uuid primary key default gen_random_uuid(),
  payment_event_delivery_id uuid not null references public.moral_trade_payment_event_deliveries(id) on delete cascade,
  blocker_codes text[] not null default '{}',
  review_status text not null check (review_status in ('queued', 'under_review', 'resolved', 'cancelled')),
  state_change_allowed_bool boolean not null default false check (state_change_allowed_bool = false),
  created_at timestamptz not null default now()
);

create index if not exists moral_trade_payment_event_deliveries_provider_event_idx
on public.moral_trade_payment_event_deliveries (provider, provider_event_id_hash, received_at desc);

create index if not exists moral_trade_payment_transition_attempts_delivery_idx
on public.moral_trade_payment_transition_attempts (payment_event_delivery_id, created_at desc);

alter table public.moral_trade_payment_event_deliveries enable row level security;
alter table public.moral_trade_provider_source_authentication_records enable row level security;
alter table public.moral_trade_payment_transition_attempts enable row level security;
alter table public.moral_trade_marketplace_state_events enable row level security;
alter table public.moral_trade_payment_manual_review_queue enable row level security;

comment on table public.moral_trade_payment_event_deliveries is
  'Append-only Moral Trade payment webhook delivery records. Every provider delivery is stored before application; duplicate provider event IDs and idempotency keys are recorded as deliveries but ignored for state mutation.';

comment on table public.moral_trade_provider_source_authentication_records is
  'Provider source authentication records for Moral Trade payment events. Signature, provider account, endpoint, event type, replay window, and immutable policy snapshot checks are recorded before state mutation.';

comment on table public.moral_trade_payment_transition_attempts is
  'Dedupe and application attempts for Moral Trade payment events. Unique provider-event and idempotency hashes prevent double application while blocked stale, changed, terminal, expired, impossible, or unauthenticated events route to manual review.';

comment on table public.moral_trade_marketplace_state_events is
  'Append-only marketplace state events written in the same transaction as capture, refund, cancellation, authorization, or payout-release application.';
