-- Conditional payments and donation-offset settlement.
-- This migration is additive. Payment card data remains in Stripe; the database stores provider IDs,
-- immutable condition snapshots, state transitions, and audit-safe metadata only.

create table if not exists public.conditional_payment_customers (
  profile_id uuid primary key references public.profiles(id) on delete cascade,
  stripe_customer_id text not null unique,
  stripe_default_payment_method_id text,
  livemode boolean not null default false,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.conditional_payment_destinations (
  id uuid primary key default gen_random_uuid(),
  registered_charity_id text references public.registered_charities(id) on delete restrict,
  display_name text not null,
  stripe_connected_account_id text not null,
  livemode boolean not null default false,
  status text not null default 'pending' check (status in ('pending', 'active', 'blocked')),
  capabilities_snapshot jsonb not null default '{}'::jsonb,
  test_only boolean not null default false,
  reviewed_by uuid references public.profiles(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (registered_charity_id, livemode),
  unique (stripe_connected_account_id, livemode),
  check (not livemode or not test_only)
);

create table if not exists public.conditional_payment_mandates (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  purpose text not null check (purpose in ('donation_offset', 'public_goods_pool')),
  subject_type text not null check (subject_type in ('donation_offset_match', 'donation_offset_pool', 'mpgf_campaign')),
  subject_id text not null,
  participant_role text not null check (participant_role in ('owner', 'counterparty', 'pledger')),
  amount_cents integer not null check (amount_cents > 0),
  currency text not null default 'usd' check (currency ~ '^[a-z]{3}$'),
  condition_snapshot jsonb not null,
  condition_hash text not null check (condition_hash ~ '^[0-9a-f]{64}$'),
  livemode boolean not null default false,
  status text not null default 'setup_pending' check (
    status in (
      'setup_pending',
      'ready',
      'charge_pending',
      'requires_action',
      'charged',
      'failed',
      'cancelled',
      'refunded',
      'disputed'
    )
  ),
  stripe_customer_id text,
  stripe_checkout_session_id text,
  stripe_setup_intent_id text,
  stripe_payment_method_id text,
  consent_terms_version text not null,
  consented_at timestamptz not null,
  ready_at timestamptz,
  expires_at timestamptz,
  cancelled_at timestamptz,
  failure_code text,
  failure_message text,
  superseded_by uuid references public.conditional_payment_mandates(id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (profile_id, purpose, subject_type, subject_id, participant_role, condition_hash, livemode)
);

create unique index if not exists conditional_payment_mandates_setup_intent_uidx
  on public.conditional_payment_mandates (stripe_setup_intent_id)
  where stripe_setup_intent_id is not null;

create unique index if not exists conditional_payment_mandates_checkout_session_uidx
  on public.conditional_payment_mandates (stripe_checkout_session_id)
  where stripe_checkout_session_id is not null;

create table if not exists public.conditional_settlement_batches (
  id uuid primary key default gen_random_uuid(),
  purpose text not null check (purpose in ('donation_offset', 'public_goods_pool')),
  subject_type text not null check (subject_type in ('donation_offset_match', 'donation_offset_pool', 'mpgf_campaign')),
  subject_id text not null,
  condition_hash text not null check (condition_hash ~ '^[0-9a-f]{64}$'),
  condition_snapshot jsonb not null,
  destination_id uuid not null references public.conditional_payment_destinations(id) on delete restrict,
  livemode boolean not null default false,
  currency text not null default 'usd' check (currency ~ '^[a-z]{3}$'),
  total_amount_cents integer not null check (total_amount_cents > 0),
  expected_mandate_count integer not null default 2 check (expected_mandate_count > 0),
  transfer_group text not null unique,
  status text not null default 'pending_authorizations' check (
    status in (
      'pending_authorizations',
      'ready',
      'charging',
      'requires_action',
      'charged',
      'transferring',
      'transferred',
      'failed',
      'refunding',
      'refunded',
      'disputed',
      'cancelled'
    )
  ),
  processing_token uuid,
  processing_started_at timestamptz,
  next_retry_at timestamptz,
  failure_code text,
  failure_message text,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (purpose, subject_type, subject_id, condition_hash, livemode)
);

create table if not exists public.conditional_payment_attempts (
  id uuid primary key default gen_random_uuid(),
  mandate_id uuid not null references public.conditional_payment_mandates(id) on delete restrict,
  settlement_batch_id uuid references public.conditional_settlement_batches(id) on delete set null,
  attempt_number integer not null check (attempt_number > 0),
  idempotency_key text not null unique,
  stripe_payment_intent_id text,
  stripe_charge_id text,
  amount_cents integer not null check (amount_cents > 0),
  currency text not null default 'usd' check (currency ~ '^[a-z]{3}$'),
  status text not null default 'created' check (
    status in ('created', 'processing', 'requires_action', 'succeeded', 'failed', 'refunded', 'disputed')
  ),
  receipt_url text,
  failure_code text,
  decline_code text,
  failure_message text,
  refunded_amount_cents integer not null default 0 check (refunded_amount_cents >= 0),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (mandate_id, attempt_number)
);

create unique index if not exists conditional_payment_attempts_payment_intent_uidx
  on public.conditional_payment_attempts (stripe_payment_intent_id)
  where stripe_payment_intent_id is not null;

create table if not exists public.conditional_settlement_transfers (
  id uuid primary key default gen_random_uuid(),
  settlement_batch_id uuid not null references public.conditional_settlement_batches(id) on delete restrict,
  mandate_id uuid not null references public.conditional_payment_mandates(id) on delete restrict,
  payment_attempt_id uuid not null references public.conditional_payment_attempts(id) on delete restrict,
  destination_id uuid not null references public.conditional_payment_destinations(id) on delete restrict,
  amount_cents integer not null check (amount_cents > 0),
  currency text not null default 'usd' check (currency ~ '^[a-z]{3}$'),
  idempotency_key text not null unique,
  stripe_transfer_id text,
  stripe_transfer_reversal_id text,
  status text not null default 'created' check (
    status in ('created', 'transferred', 'failed', 'reversing', 'reversed')
  ),
  failure_code text,
  failure_message text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (settlement_batch_id, mandate_id)
);

create unique index if not exists conditional_settlement_transfers_transfer_uidx
  on public.conditional_settlement_transfers (stripe_transfer_id)
  where stripe_transfer_id is not null;

create table if not exists public.conditional_payment_webhook_events (
  stripe_event_id text primary key,
  event_type text not null,
  object_id text,
  livemode boolean not null,
  signature_verified boolean not null,
  payload_sha256 text not null check (payload_sha256 ~ '^[0-9a-f]{64}$'),
  status text not null default 'processing' check (status in ('processing', 'processed', 'ignored', 'failed')),
  error_message text,
  received_at timestamptz not null default timezone('utc', now()),
  processed_at timestamptz
);

create table if not exists public.conditional_payment_audit_events (
  id uuid primary key default gen_random_uuid(),
  actor_profile_id uuid references public.profiles(id) on delete set null,
  actor_kind text not null default 'system' check (actor_kind in ('participant', 'operator', 'system', 'stripe')),
  event_type text not null,
  object_type text not null,
  object_id text not null,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.conditional_payment_gate_status (
  environment text not null check (environment in ('test', 'live')),
  gate_key text not null,
  status text not null default 'blocked' check (status in ('passed', 'pending', 'blocked')),
  notes text not null default '',
  reviewed_by uuid references public.profiles(id) on delete set null,
  reviewed_at timestamptz,
  updated_at timestamptz not null default timezone('utc', now()),
  primary key (environment, gate_key)
);

insert into public.conditional_payment_gate_status (environment, gate_key, status, notes)
values
  ('test', 'test_mode_notice', 'passed', 'All test-mode surfaces must state that no real money moves.'),
  ('test', 'webhook_signature', 'pending', 'Mark passed after a signed Stripe test webhook is processed.'),
  ('test', 'test_destination', 'pending', 'Mark passed after a test connected account is mapped.'),
  ('live', 'stripe_account_ready', 'blocked', 'Platform charges and payouts must be enabled.'),
  ('live', 'webhook_signature', 'blocked', 'A live webhook signing secret must be configured and verified.'),
  ('live', 'terms_approved', 'blocked', 'Off-session mandate and settlement terms require approval.'),
  ('live', 'refund_policy_approved', 'blocked', 'Compensating refund and transfer-reversal policy requires approval.'),
  ('live', 'destination_approved', 'blocked', 'At least one live compliant recipient destination is required.'),
  ('live', 'operator_runbook_approved', 'blocked', 'Dispute, reconciliation, and incident runbooks require approval.')
on conflict (environment, gate_key) do nothing;

create or replace function public.conditional_payments_set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

do $$
begin
  if not exists (select 1 from pg_trigger where tgname = 'conditional_payment_customers_set_updated_at') then
    create trigger conditional_payment_customers_set_updated_at
      before update on public.conditional_payment_customers
      for each row execute function public.conditional_payments_set_updated_at();
  end if;
  if not exists (select 1 from pg_trigger where tgname = 'conditional_payment_destinations_set_updated_at') then
    create trigger conditional_payment_destinations_set_updated_at
      before update on public.conditional_payment_destinations
      for each row execute function public.conditional_payments_set_updated_at();
  end if;
  if not exists (select 1 from pg_trigger where tgname = 'conditional_payment_mandates_set_updated_at') then
    create trigger conditional_payment_mandates_set_updated_at
      before update on public.conditional_payment_mandates
      for each row execute function public.conditional_payments_set_updated_at();
  end if;
  if not exists (select 1 from pg_trigger where tgname = 'conditional_settlement_batches_set_updated_at') then
    create trigger conditional_settlement_batches_set_updated_at
      before update on public.conditional_settlement_batches
      for each row execute function public.conditional_payments_set_updated_at();
  end if;
  if not exists (select 1 from pg_trigger where tgname = 'conditional_payment_attempts_set_updated_at') then
    create trigger conditional_payment_attempts_set_updated_at
      before update on public.conditional_payment_attempts
      for each row execute function public.conditional_payments_set_updated_at();
  end if;
  if not exists (select 1 from pg_trigger where tgname = 'conditional_settlement_transfers_set_updated_at') then
    create trigger conditional_settlement_transfers_set_updated_at
      before update on public.conditional_settlement_transfers
      for each row execute function public.conditional_payments_set_updated_at();
  end if;
end;
$$;

create or replace function public.claim_conditional_settlement_batch(
  p_batch_id uuid,
  p_processing_token uuid
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  claimed boolean := false;
begin
  update public.conditional_settlement_batches
  set
    status = 'charging',
    processing_token = p_processing_token,
    processing_started_at = timezone('utc', now()),
    started_at = coalesce(started_at, timezone('utc', now())),
    failure_code = null,
    failure_message = null
  where id = p_batch_id
    and (
      status in ('pending_authorizations', 'ready', 'failed')
      or (
        status = 'charging'
        and processing_started_at < timezone('utc', now()) - interval '10 minutes'
      )
    )
    and (next_retry_at is null or next_retry_at <= timezone('utc', now()));

  get diagnostics claimed = row_count;
  return claimed;
end;
$$;

revoke all on function public.claim_conditional_settlement_batch(uuid, uuid) from public;
revoke all on function public.claim_conditional_settlement_batch(uuid, uuid) from anon;
revoke all on function public.claim_conditional_settlement_batch(uuid, uuid) from authenticated;
grant execute on function public.claim_conditional_settlement_batch(uuid, uuid) to service_role;

alter table public.conditional_payment_customers enable row level security;
alter table public.conditional_payment_destinations enable row level security;
alter table public.conditional_payment_mandates enable row level security;
alter table public.conditional_settlement_batches enable row level security;
alter table public.conditional_payment_attempts enable row level security;
alter table public.conditional_settlement_transfers enable row level security;
alter table public.conditional_payment_webhook_events enable row level security;
alter table public.conditional_payment_audit_events enable row level security;
alter table public.conditional_payment_gate_status enable row level security;

revoke all on table public.conditional_payment_customers from anon, authenticated;
revoke all on table public.conditional_payment_destinations from anon, authenticated;
revoke all on table public.conditional_payment_mandates from anon, authenticated;
revoke all on table public.conditional_settlement_batches from anon, authenticated;
revoke all on table public.conditional_payment_attempts from anon, authenticated;
revoke all on table public.conditional_settlement_transfers from anon, authenticated;
revoke all on table public.conditional_payment_webhook_events from anon, authenticated;
revoke all on table public.conditional_payment_audit_events from anon, authenticated;
revoke all on table public.conditional_payment_gate_status from anon, authenticated;

grant all on table public.conditional_payment_customers to service_role;
grant all on table public.conditional_payment_destinations to service_role;
grant all on table public.conditional_payment_mandates to service_role;
grant all on table public.conditional_settlement_batches to service_role;
grant all on table public.conditional_payment_attempts to service_role;
grant all on table public.conditional_settlement_transfers to service_role;
grant all on table public.conditional_payment_webhook_events to service_role;
grant all on table public.conditional_payment_audit_events to service_role;
grant all on table public.conditional_payment_gate_status to service_role;

create index if not exists conditional_payment_mandates_subject_idx
  on public.conditional_payment_mandates (purpose, subject_type, subject_id, condition_hash, livemode, status);
create index if not exists conditional_payment_mandates_profile_idx
  on public.conditional_payment_mandates (profile_id, created_at desc);
create index if not exists conditional_payment_attempts_batch_idx
  on public.conditional_payment_attempts (settlement_batch_id, created_at);
create index if not exists conditional_payment_audit_object_idx
  on public.conditional_payment_audit_events (object_type, object_id, created_at desc);
