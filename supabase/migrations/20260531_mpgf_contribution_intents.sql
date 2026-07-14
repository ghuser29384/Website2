begin;

create table if not exists public.mpgf_pledge_intents (
  id text primary key,
  round_id text not null references public.mpgf_public_goods_rounds (id) on delete cascade,
  campaign_id text not null references public.mpgf_public_goods_campaigns (id) on delete cascade,
  profile_id uuid references public.profiles (id) on delete set null,
  user_ref_hash text not null check (user_ref_hash ~ '^sha256:[0-9a-f]{64}$'),
  idempotency_key_hash text not null unique check (idempotency_key_hash ~ '^sha256:[0-9a-f]{64}$'),
  amount_cents bigint not null check (amount_cents > 0),
  currency text not null default 'usd' check (currency = 'usd'),
  visibility_pref text not null default 'private_amount' check (
    visibility_pref in ('private_amount', 'public_supporter', 'public_reason')
  ),
  payment_state text not null default 'intent_created' check (
    payment_state in (
      'intent_created',
      'identity_verified',
      'identity_pending_review',
      'authorization_pending',
      'authorized',
      'manual_evidence_required',
      'provider_event_received',
      'captured',
      'voided',
      'expired'
    )
  ),
  counting_state text not null default 'preview_only' check (
    counting_state in ('not_counted', 'preview_only', 'eligible_pending_thresholds', 'counted_after_review', 'excluded')
  ),
  fallback_rule jsonb not null default jsonb_build_object(
    'manualEvidencePath', '/api/mpgf/evidence/manual',
    'providerUnavailableMode', 'manual_evidence_after_review'
  ),
  capture_policy text not null default 'capture_only_after_threshold_review_and_challenge_window' check (
    capture_policy = 'capture_only_after_threshold_review_and_challenge_window'
  ),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.mpgf_identity_verifications (
  id text primary key,
  pledge_intent_id text not null references public.mpgf_pledge_intents (id) on delete cascade,
  provider text not null check (
    provider in ('demo_self_attestation', 'repository_profile', 'external_proof_of_personhood')
  ),
  status text not null check (status in ('verified', 'pending_review', 'duplicate_identity', 'blocked')),
  human_score_bps integer not null check (human_score_bps between 0 and 10000),
  redacted_reference text not null,
  duplicate_proof_hash text check (duplicate_proof_hash is null or duplicate_proof_hash ~ '^sha256:[0-9a-f]{64}$'),
  counts_for_matching boolean not null default false,
  verified_at timestamptz,
  expires_at timestamptz not null,
  created_at timestamptz not null default timezone('utc', now()),
  unique (pledge_intent_id, provider)
);

create table if not exists public.mpgf_payment_authorizations (
  id text primary key,
  pledge_intent_id text not null references public.mpgf_pledge_intents (id) on delete cascade,
  provider text not null check (provider in ('stripe', 'fiscal_host', 'external_provider', 'manual_evidence')),
  provider_ref_hash text check (provider_ref_hash is null or provider_ref_hash ~ '^sha256:[0-9a-f]{64}$'),
  amount_cents bigint not null check (amount_cents > 0),
  currency text not null default 'usd' check (currency = 'usd'),
  status text not null check (
    status in (
      'requires_identity',
      'authorized',
      'manual_fallback_required',
      'provider_event_received',
      'captured',
      'failed',
      'voided',
      'expired'
    )
  ),
  capture_policy text not null default 'capture_only_after_threshold_review_and_challenge_window' check (
    capture_policy = 'capture_only_after_threshold_review_and_challenge_window'
  ),
  manual_evidence_path text,
  authorized_at timestamptz,
  captured_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  constraint mpgf_payment_authorizations_provider_or_manual check (
    (provider = 'manual_evidence' and manual_evidence_path = '/api/mpgf/evidence/manual')
    or (provider <> 'manual_evidence' and provider_ref_hash is not null)
  )
);

create table if not exists public.mpgf_provider_payment_events (
  id text primary key,
  payment_authorization_id text not null references public.mpgf_payment_authorizations (id) on delete cascade,
  pledge_intent_id text not null references public.mpgf_pledge_intents (id) on delete cascade,
  provider text not null check (provider in ('stripe', 'fiscal_host', 'external_provider', 'manual_evidence')),
  provider_event_ref_hash text not null unique check (provider_event_ref_hash ~ '^sha256:[0-9a-f]{64}$'),
  event_type text not null check (
    event_type in (
      'authorization_created',
      'authorization_failed',
      'capture_succeeded',
      'capture_failed',
      'refund_succeeded',
      'payment_expired'
    )
  ),
  amount_cents bigint not null check (amount_cents >= 0),
  status text not null check (status in ('recorded', 'needs_review', 'rejected')),
  signature_verified boolean not null default false,
  payload_hash text check (payload_hash is null or payload_hash ~ '^sha256:[0-9a-f]{64}$'),
  final_payout_authorized boolean not null default false check (final_payout_authorized = false),
  append_only_hash text not null check (append_only_hash ~ '^sha256:[0-9a-f]{64}$'),
  received_at timestamptz not null default timezone('utc', now()),
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists mpgf_pledge_intents_round_campaign_idx
  on public.mpgf_pledge_intents (round_id, campaign_id, payment_state, counting_state);

create index if not exists mpgf_pledge_intents_profile_idx
  on public.mpgf_pledge_intents (profile_id, created_at desc);

create index if not exists mpgf_identity_verifications_intent_idx
  on public.mpgf_identity_verifications (pledge_intent_id, status);

create index if not exists mpgf_payment_authorizations_intent_idx
  on public.mpgf_payment_authorizations (pledge_intent_id, status);

create index if not exists mpgf_provider_payment_events_intent_idx
  on public.mpgf_provider_payment_events (pledge_intent_id, received_at desc);

alter table public.mpgf_pledge_intents enable row level security;
alter table public.mpgf_identity_verifications enable row level security;
alter table public.mpgf_payment_authorizations enable row level security;
alter table public.mpgf_provider_payment_events enable row level security;

drop policy if exists "mpgf_pledge_intents_select_own" on public.mpgf_pledge_intents;
create policy "mpgf_pledge_intents_select_own"
on public.mpgf_pledge_intents
for select
to authenticated
using (profile_id = auth.uid());

drop policy if exists "mpgf_pledge_intents_insert_own" on public.mpgf_pledge_intents;
create policy "mpgf_pledge_intents_insert_own"
on public.mpgf_pledge_intents
for insert
to authenticated
with check (profile_id = auth.uid());

drop policy if exists "mpgf_identity_verifications_select_own" on public.mpgf_identity_verifications;
create policy "mpgf_identity_verifications_select_own"
on public.mpgf_identity_verifications
for select
to authenticated
using (
  exists (
    select 1
    from public.mpgf_pledge_intents
    where mpgf_pledge_intents.id = mpgf_identity_verifications.pledge_intent_id
      and mpgf_pledge_intents.profile_id = auth.uid()
  )
);

drop policy if exists "mpgf_payment_authorizations_select_own" on public.mpgf_payment_authorizations;
create policy "mpgf_payment_authorizations_select_own"
on public.mpgf_payment_authorizations
for select
to authenticated
using (
  exists (
    select 1
    from public.mpgf_pledge_intents
    where mpgf_pledge_intents.id = mpgf_payment_authorizations.pledge_intent_id
      and mpgf_pledge_intents.profile_id = auth.uid()
  )
);

grant select, insert, update on public.mpgf_pledge_intents to authenticated;
grant select on public.mpgf_identity_verifications to authenticated;
grant select on public.mpgf_payment_authorizations to authenticated;
grant all on public.mpgf_pledge_intents to service_role;
grant all on public.mpgf_identity_verifications to service_role;
grant all on public.mpgf_payment_authorizations to service_role;
grant all on public.mpgf_provider_payment_events to service_role;

comment on table public.mpgf_pledge_intents is
  'First-class MPGF pledge_intent records for the production flow: verify identity, authorize conditionally, fall back to manual evidence only when provider integration is unavailable.';

comment on table public.mpgf_identity_verifications is
  'First-class MPGF identity_verification records; public and participant surfaces store redacted references and duplicate-proof hashes, not raw identity evidence.';

comment on table public.mpgf_payment_authorizations is
  'First-class MPGF payment_authorization records. Provider authorizations are conditional and capture only after threshold, review, and challenge gates.';

comment on table public.mpgf_provider_payment_events is
  'Append-only MPGF provider_payment_event records. Webhooks provide evidence but cannot authorize final payout by themselves.';

commit;
