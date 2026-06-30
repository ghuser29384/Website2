-- Generalize provider source authentication beyond payment webhooks for moraltrade82.

alter table public.moral_trade_provider_source_authentication_records
  alter column payment_event_delivery_id drop not null;

alter table public.moral_trade_provider_source_authentication_records
  add column if not exists provider_subject_type text not null default 'payment_webhook'
    check (
      provider_subject_type in (
        'payment_webhook',
        'third_party_evidence_feed',
        'identity_check',
        'payment_rail_check',
        'destination_verification_feed',
        'recipient_registry_feed',
        'sanctions_screening_feed',
        'manual_provider_attestation'
      )
    ),
  add column if not exists source_event_ref text,
  add column if not exists source_event_hash text
    check (source_event_hash is null or source_event_hash ~ '^sha256:[a-f0-9]{64}$'),
  add column if not exists provider_name text,
  add column if not exists provider_account_ref text,
  add column if not exists provider_event_id_hash text
    check (provider_event_id_hash is null or provider_event_id_hash ~ '^sha256:[a-f0-9]{64}$'),
  add column if not exists idempotency_key_hash text
    check (idempotency_key_hash is null or idempotency_key_hash ~ '^sha256:[a-f0-9]{64}$'),
  add column if not exists authentication_method text not null default 'provider_signature'
    check (
      authentication_method in (
        'provider_signature',
        'signed_api_response',
        'manual_reviewer_attestation',
        'test_mode_signature',
        'none'
      )
    ),
  add column if not exists state_change_surface text not null default 'payment_capture'
    check (
      state_change_surface in (
        'payment_capture',
        'payout_release',
        'evidence_acceptance',
        'eligibility_approval',
        'destination_verification',
        'release_gate_promotion',
        'marketplace_state_transition',
        'public_metric_release'
      )
    ),
  add column if not exists downstream_state_event_ref text,
  add column if not exists replay_window_expires_at timestamptz,
  add column if not exists duplicate_provider_event_bool boolean not null default false,
  add column if not exists stored_before_apply_bool boolean not null default true
    check (stored_before_apply_bool = true),
  add column if not exists raw_payload_stored_bool boolean not null default false
    check (raw_payload_stored_bool = false);

alter table public.moral_trade_provider_source_authentication_records
  drop constraint if exists moral_trade_provider_source_auth_records_subject_ref_check;

alter table public.moral_trade_provider_source_authentication_records
  add constraint moral_trade_provider_source_auth_records_subject_ref_check
  check (payment_event_delivery_id is not null or source_event_ref is not null);

create table if not exists public.moral_trade_provider_source_authentication_manual_review_queue (
  id uuid primary key default gen_random_uuid(),
  provider_source_authentication_record_id uuid
    references public.moral_trade_provider_source_authentication_records (id) on delete cascade,
  provider_subject_type text not null check (
    provider_subject_type in (
      'payment_webhook',
      'third_party_evidence_feed',
      'identity_check',
      'payment_rail_check',
      'destination_verification_feed',
      'recipient_registry_feed',
      'sanctions_screening_feed',
      'manual_provider_attestation'
    )
  ),
  source_event_ref text not null,
  blocker_codes text[] not null default '{}',
  review_status text not null default 'queued'
    check (review_status in ('queued', 'under_review', 'resolved', 'cancelled')),
  state_change_allowed_bool boolean not null default false
    check (state_change_allowed_bool = false),
  release_gate_promotion_allowed_bool boolean not null default false
    check (release_gate_promotion_allowed_bool = false),
  public_metric_publication_allowed_bool boolean not null default false
    check (public_metric_publication_allowed_bool = false),
  created_at timestamptz not null default now()
);

create index if not exists moral_trade_provider_source_auth_subject_idx
  on public.moral_trade_provider_source_authentication_records
  (provider_subject_type, provider_name, created_at desc);

create index if not exists moral_trade_provider_source_auth_manual_review_idx
  on public.moral_trade_provider_source_authentication_manual_review_queue
  (provider_subject_type, review_status, created_at desc);

alter table public.moral_trade_provider_source_authentication_manual_review_queue
  enable row level security;

comment on table public.moral_trade_provider_source_authentication_records is
  'Provider source authentication records for Moral Trade provider webhooks, third-party evidence feeds, identity checks, payment-rail checks, destination-verification feeds, recipient registry feeds, sanctions screening feeds, and manual provider attestations. Signature/source proof, provider account, endpoint, event type, replay window, immutable policy snapshot, and server-side authentication time are recorded before any downstream state event, evidence acceptance, eligibility approval, destination verification, release-gate promotion, public metric, capture, or payout-release transition.';

comment on column public.moral_trade_provider_source_authentication_records.raw_payload_stored_bool is
  'Always false: source authentication records store hashes, policy refs, source refs, and safe status fields, not raw provider payloads, provider secrets, payment credentials, identity artifacts, private evidence, or account-binding secrets.';

comment on table public.moral_trade_provider_source_authentication_manual_review_queue is
  'Fail-closed manual-review queue for unsigned, wrong-account, wrong-endpoint, stale, replayed, endpoint-mismatched, duplicate, or unallowed provider sources. Queue rows cannot authorize state changes, release-gate promotion, or public metric publication.';
