begin;

create table if not exists public.mpgf_stripe_saved_commitments (
  id text primary key,
  round_id text not null references public.mpgf_public_goods_rounds (id) on delete cascade,
  campaign_id text not null references public.mpgf_public_goods_campaigns (id) on delete cascade,
  conditional_pledge_id text references public.mpgf_conditional_pledges (id) on delete set null,
  pledge_intent_id text references public.mpgf_pledge_intents (id) on delete set null,
  profile_id uuid references public.profiles (id) on delete set null,
  user_ref_hash text not null check (user_ref_hash ~ '^sha256:[0-9a-f]{64}$'),
  amount_cents bigint not null check (amount_cents > 0),
  currency text not null default 'usd' check (currency = 'usd'),
  provider_customer_id_hash text check (provider_customer_id_hash is null or provider_customer_id_hash ~ '^sha256:[0-9a-f]{64}$'),
  provider_setup_intent_id_hash text unique check (provider_setup_intent_id_hash is null or provider_setup_intent_id_hash ~ '^sha256:[0-9a-f]{64}$'),
  provider_payment_method_id_hash text check (provider_payment_method_id_hash is null or provider_payment_method_id_hash ~ '^sha256:[0-9a-f]{64}$'),
  setup_status text not null default 'setup_intent_created' check (
    setup_status in ('setup_intent_created', 'setup_succeeded', 'setup_failed', 'revoked')
  ),
  setup_usage text not null default 'off_session' check (setup_usage = 'off_session'),
  future_use_consent_at timestamptz,
  explicit_future_use_consent_required boolean not null default true check (explicit_future_use_consent_required = true),
  creates_charge_immediately boolean not null default false check (creates_charge_immediately = false),
  long_lived_manual_card_hold boolean not null default false check (long_lived_manual_card_hold = false),
  payment_intent_created_before_gates boolean not null default false check (payment_intent_created_before_gates = false),
  raw_card_data_stored boolean not null default false check (raw_card_data_stored = false),
  review_required_before_counting boolean not null default true check (review_required_before_counting = true),
  final_payout_authorized boolean not null default false check (final_payout_authorized = false),
  calc_hash text not null check (calc_hash ~ '^sha256:[0-9a-f]{64}$'),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.mpgf_stripe_saved_commitment_events (
  id text primary key,
  saved_commitment_id text references public.mpgf_stripe_saved_commitments (id) on delete set null,
  conditional_pledge_id text references public.mpgf_conditional_pledges (id) on delete set null,
  pledge_intent_id text references public.mpgf_pledge_intents (id) on delete set null,
  provider_event_id_hash text not null unique check (provider_event_id_hash ~ '^sha256:[0-9a-f]{64}$'),
  provider_object_id_hash text check (provider_object_id_hash is null or provider_object_id_hash ~ '^sha256:[0-9a-f]{64}$'),
  provider_customer_id_hash text check (provider_customer_id_hash is null or provider_customer_id_hash ~ '^sha256:[0-9a-f]{64}$'),
  provider_payment_method_id_hash text check (provider_payment_method_id_hash is null or provider_payment_method_id_hash ~ '^sha256:[0-9a-f]{64}$'),
  event_type text not null check (
    event_type in (
      'setup_intent.created',
      'setup_intent.succeeded',
      'setup_intent.setup_failed',
      'setup_intent.canceled',
      'payment_intent.created',
      'payment_intent.succeeded',
      'payment_intent.payment_failed',
      'payment_intent.canceled',
      'payment_intent.requires_action'
    )
  ),
  event_state text not null,
  status text not null check (status in ('recorded', 'needs_review', 'rejected')),
  signature_verified boolean not null default false,
  structure_verified boolean not null default false,
  payload_hash text not null check (payload_hash ~ '^sha256:[0-9a-f]{64}$'),
  append_only_hash text not null check (append_only_hash ~ '^sha256:[0-9a-f]{64}$'),
  review_required_before_counting boolean not null default true check (review_required_before_counting = true),
  final_payout_authorized boolean not null default false check (final_payout_authorized = false),
  received_at timestamptz not null default timezone('utc', now()),
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.mpgf_stripe_conditional_payment_intent_runs (
  id text primary key,
  round_id text not null references public.mpgf_public_goods_rounds (id) on delete cascade,
  campaign_id text not null references public.mpgf_public_goods_campaigns (id) on delete cascade,
  conditional_pledge_id text references public.mpgf_conditional_pledges (id) on delete set null,
  pledge_intent_id text references public.mpgf_pledge_intents (id) on delete set null,
  provider_customer_id_hash text not null check (provider_customer_id_hash ~ '^sha256:[0-9a-f]{64}$'),
  provider_payment_method_id_hash text not null check (provider_payment_method_id_hash ~ '^sha256:[0-9a-f]{64}$'),
  provider_setup_intent_id_hash text not null check (provider_setup_intent_id_hash ~ '^sha256:[0-9a-f]{64}$'),
  amount_cents bigint not null check (amount_cents > 0),
  currency text not null default 'usd' check (currency = 'usd'),
  gate_state jsonb not null,
  blocked_by text[] not null default '{}',
  payment_intent_creation_allowed boolean not null,
  setup_intent_first boolean not null default true check (setup_intent_first = true),
  confirm_off_session boolean not null default true check (confirm_off_session = true),
  capture_method text not null default 'automatic' check (capture_method = 'automatic'),
  long_lived_manual_card_hold boolean not null default false check (long_lived_manual_card_hold = false),
  requires_stripe_signature_webhook_before_counting boolean not null default true check (requires_stripe_signature_webhook_before_counting = true),
  review_required_before_counting boolean not null default true check (review_required_before_counting = true),
  final_payout_authorized boolean not null default false check (final_payout_authorized = false),
  idempotency_key_hash text not null unique check (idempotency_key_hash ~ '^sha256:[0-9a-f]{64}$'),
  calc_hash text not null check (calc_hash ~ '^sha256:[0-9a-f]{64}$'),
  created_at timestamptz not null default timezone('utc', now()),
  constraint mpgf_stripe_payment_intent_run_requires_clear_gates check (
    payment_intent_creation_allowed = false
    or (
      gate_state ->> 'roundParametersLocked' = 'true'
      and gate_state ->> 'thresholdAmountCleared' = 'true'
      and gate_state ->> 'supporterCountCleared' = 'true'
      and gate_state ->> 'reviewApproved' = 'true'
      and gate_state ->> 'challengeWindowClosed' = 'true'
    )
  )
);

create index if not exists mpgf_stripe_saved_commitments_round_campaign_idx
  on public.mpgf_stripe_saved_commitments (round_id, campaign_id, setup_status, created_at desc);

create index if not exists mpgf_stripe_saved_commitment_events_intent_idx
  on public.mpgf_stripe_saved_commitment_events (conditional_pledge_id, pledge_intent_id, received_at desc);

create index if not exists mpgf_stripe_conditional_payment_runs_round_idx
  on public.mpgf_stripe_conditional_payment_intent_runs (round_id, campaign_id, payment_intent_creation_allowed, created_at desc);

alter table public.mpgf_stripe_saved_commitments enable row level security;
alter table public.mpgf_stripe_saved_commitment_events enable row level security;
alter table public.mpgf_stripe_conditional_payment_intent_runs enable row level security;

drop policy if exists "mpgf_stripe_saved_commitments_select_own" on public.mpgf_stripe_saved_commitments;
create policy "mpgf_stripe_saved_commitments_select_own"
on public.mpgf_stripe_saved_commitments
for select
to authenticated
using (profile_id = auth.uid());

drop policy if exists "mpgf_stripe_saved_commitments_insert_own" on public.mpgf_stripe_saved_commitments;
create policy "mpgf_stripe_saved_commitments_insert_own"
on public.mpgf_stripe_saved_commitments
for insert
to authenticated
with check (profile_id = auth.uid());

grant select, insert on public.mpgf_stripe_saved_commitments to authenticated;
grant all on public.mpgf_stripe_saved_commitments to service_role;
grant all on public.mpgf_stripe_saved_commitment_events to service_role;
grant all on public.mpgf_stripe_conditional_payment_intent_runs to service_role;

comment on table public.mpgf_stripe_saved_commitments is
  'Stripe SetupIntent-first MPGF saved commitments. These records store hashed provider refs, require explicit future-use consent, create no immediate charge, and prohibit long-lived manual card holds.';

comment on table public.mpgf_stripe_saved_commitment_events is
  'Append-only Stripe webhook events for SetupIntent-first MPGF saved commitments. Stripe-Signature verification is required before any state transition, and webhook events never authorize final payout by themselves.';

comment on table public.mpgf_stripe_conditional_payment_intent_runs is
  'Protected threshold-clear worker runs that may create Stripe PaymentIntents only after amount, supporter, review, challenge-window, and parameter-lock gates are true.';

commit;
