create table if not exists public.moral_trade_payment_authorization_policies (
  id uuid primary key default gen_random_uuid(),
  policy_ref text not null unique,
  release_stage text not null,
  policy_snapshot_status text not null check (
    policy_snapshot_status in ('resolved_immutable', 'missing', 'mutable', 'stale', 'superseded')
  ),
  real_money_capture_flag_status text not null,
  jurisdiction_policy_status text not null,
  legal_review_status text not null,
  provider_capability_status text not null,
  account_security_status text not null,
  reviewed_at timestamptz not null,
  expires_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.moral_trade_payment_authorization_attempts (
  id uuid primary key default gen_random_uuid(),
  authorization_ref text not null unique,
  subject_type text not null check (
    subject_type in ('donation_offset', 'pledge_swap', 'compensated_moral_action', 'matched_trade_lock_proposal')
  ),
  subject_ref text not null,
  transition text not null check (
    transition in ('authorization_stub_record', 'provider_authorization', 'payment_capture')
  ),
  authorization_mode text not null check (
    authorization_mode in ('manual_review_stub', 'provider_managed_conditional_authorization')
  ),
  idempotency_key_hash text not null check (idempotency_key_hash ~ '^sha256:[a-f0-9]{64}$'),
  frozen_preview_hash text not null check (frozen_preview_hash ~ '^sha256:[a-f0-9]{64}$'),
  locked_terms_snapshot_hash text not null check (locked_terms_snapshot_hash ~ '^sha256:[a-f0-9]{64}$'),
  referenced_terms_snapshot_hash text not null check (referenced_terms_snapshot_hash ~ '^sha256:[a-f0-9]{64}$'),
  term_sheet_hash text not null check (term_sheet_hash ~ '^sha256:[a-f0-9]{64}$'),
  referenced_term_sheet_hash text not null check (referenced_term_sheet_hash ~ '^sha256:[a-f0-9]{64}$'),
  participant_confirmation_hash text not null check (participant_confirmation_hash ~ '^sha256:[a-f0-9]{64}$'),
  referenced_participant_confirmation_hash text not null check (referenced_participant_confirmation_hash ~ '^sha256:[a-f0-9]{64}$'),
  release_gate_policy_snapshot_status text not null check (
    release_gate_policy_snapshot_status in ('resolved_immutable', 'missing', 'mutable', 'stale', 'superseded')
  ),
  payment_authorization_policy_snapshot_status text not null check (
    payment_authorization_policy_snapshot_status in ('resolved_immutable', 'missing', 'mutable', 'stale', 'superseded')
  ),
  real_money_capture_flag_status text not null,
  final_lock_proposal_status text not null,
  participant_confirmation_status text not null,
  jurisdiction_policy_status text not null,
  legal_review_status text not null,
  payment_rail_review_status text not null,
  provider_capability_status text not null,
  account_security_status text not null,
  provider_authorization_allowed_bool boolean not null default false,
  checkout_creation_allowed_bool boolean not null default false check (checkout_creation_allowed_bool = false),
  capture_allowed_bool boolean not null default false check (capture_allowed_bool = false),
  provider_authorization_ref_hash text check (
    provider_authorization_ref_hash is null or provider_authorization_ref_hash ~ '^sha256:[a-f0-9]{64}$'
  ),
  marketplace_state_event_ref text,
  manual_review_queue_ref text,
  raw_provider_payload_public_bool boolean not null default false check (raw_provider_payload_public_bool = false),
  payment_credentials_public_bool boolean not null default false check (payment_credentials_public_bool = false),
  provider_secret_public_bool boolean not null default false check (provider_secret_public_bool = false),
  checked_at timestamptz not null,
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  unique (idempotency_key_hash)
);

create table if not exists public.moral_trade_payment_authorization_manual_review_queue (
  id uuid primary key default gen_random_uuid(),
  authorization_ref text not null,
  blocker_codes text[] not null default '{}',
  review_status text not null check (review_status in ('queued', 'under_review', 'resolved', 'cancelled')),
  provider_authorization_allowed_bool boolean not null default false check (provider_authorization_allowed_bool = false),
  checkout_creation_allowed_bool boolean not null default false check (checkout_creation_allowed_bool = false),
  capture_allowed_bool boolean not null default false check (capture_allowed_bool = false),
  created_at timestamptz not null default now()
);

create index if not exists moral_trade_payment_authorization_attempts_subject_idx
on public.moral_trade_payment_authorization_attempts (subject_type, subject_ref, transition, created_at desc);

alter table public.moral_trade_payment_authorization_policies enable row level security;
alter table public.moral_trade_payment_authorization_attempts enable row level security;
alter table public.moral_trade_payment_authorization_manual_review_queue enable row level security;

comment on table public.moral_trade_payment_authorization_policies is
  'Frozen Moral Trade payment-authorization policy snapshots for non-public-goods previews. Policies bind real-money capture feature flags, legal and jurisdiction review, provider capability, and account-security status before any future conditional provider authorization.';

comment on table public.moral_trade_payment_authorization_attempts is
  'Fail-closed Moral Trade payment authorization attempts. Manual-review stubs are first-class records; provider-managed conditional authorization requires matching frozen preview, locked terms, term-sheet, participant confirmation, jurisdiction, legal, payment-rail, provider-capability, account-security, idempotency, and marketplace_state_event gates. Immediate checkout and capture remain false.';

comment on table public.moral_trade_payment_authorization_manual_review_queue is
  'Manual review queue for blocked or stubbed payment authorization attempts. Queue rows cannot authorize provider authorization, checkout creation, or capture.';
