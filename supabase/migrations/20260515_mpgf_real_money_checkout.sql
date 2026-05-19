-- Run this entire file as one query. In the Supabase SQL editor, clear any
-- text selection first; otherwise Supabase runs only the selected fragment.
begin;

create extension if not exists pgcrypto;

create table if not exists public.mpgf_cycles (
  id text primary key,
  label text not null,
  stage text not null check (stage in ('pilot', 'public_beta', 'mature')),
  mode text not null check (mode in ('non_real_money_demo', 'pledge_only', 'test_mode', 'real_money')),
  currency text not null default 'usd' check (currency = 'usd'),
  budget_cents bigint not null default 0 check (budget_cents >= 0),
  protocol_parameter_version text not null,
  terms_version text not null,
  privacy_version text not null,
  status text not null default 'draft',
  proposal_opens_at timestamptz,
  ballot_opens_at timestamptz,
  ballot_closes_at timestamptz,
  summary_published_at timestamptz,
  created_at timestamptz not null default timezone('utc', now())
);

insert into public.mpgf_cycles (
  id,
  label,
  stage,
  mode,
  currency,
  budget_cents,
  protocol_parameter_version,
  terms_version,
  privacy_version,
  status,
  proposal_opens_at,
  ballot_opens_at,
  ballot_closes_at,
  summary_published_at
)
values (
  'mpgf-cycle-demo-2026-05',
  'May 2026 MPGF Direct-Working Demo',
  'pilot',
  'non_real_money_demo',
  'usd',
  100000,
  'mpgf-pilot-v0.3-demo-2026-05',
  'mpgf-demo-terms-v1',
  'mpgf-demo-privacy-v1',
  'active',
  '2026-05-01T00:00:00.000Z',
  '2026-05-07T00:00:00.000Z',
  '2026-05-21T00:00:00.000Z',
  '2026-05-22T00:00:00.000Z'
)
on conflict (id) do update
set
  label = excluded.label,
  stage = excluded.stage,
  mode = excluded.mode,
  currency = excluded.currency,
  budget_cents = excluded.budget_cents,
  protocol_parameter_version = excluded.protocol_parameter_version,
  terms_version = excluded.terms_version,
  privacy_version = excluded.privacy_version,
  status = excluded.status,
  proposal_opens_at = excluded.proposal_opens_at,
  ballot_opens_at = excluded.ballot_opens_at,
  ballot_closes_at = excluded.ballot_closes_at,
  summary_published_at = excluded.summary_published_at;

create table if not exists public.mpgf_recurring_contribution_commitments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  amount_cents bigint not null check (amount_cents > 0),
  currency text not null default 'usd' check (currency = 'usd'),
  cadence text not null check (cadence = 'monthly'),
  mode text not null check (mode in ('pledge_only', 'test_payment', 'real_money')),
  status text not null check (status in ('active', 'paused', 'cancelled', 'expired', 'provider_action_required', 'provider_failed')),
  start_cycle_id text references public.mpgf_cycles (id),
  next_cycle_id text references public.mpgf_cycles (id),
  next_scheduled_at timestamptz,
  provider_subscription_id text,
  provider_customer_id text,
  created_at timestamptz not null default timezone('utc', now()),
  paused_at timestamptz,
  cancelled_at timestamptz
);

alter table public.mpgf_recurring_contribution_commitments
  add column if not exists next_scheduled_at timestamptz,
  add column if not exists provider_subscription_id text,
  add column if not exists provider_customer_id text,
  add column if not exists paused_at timestamptz,
  add column if not exists cancelled_at timestamptz;

alter table public.mpgf_recurring_contribution_commitments
  drop constraint if exists mpgf_recurring_contribution_commitments_status_check,
  add constraint mpgf_recurring_contribution_commitments_status_check
    check (status in ('active', 'paused', 'cancelled', 'expired', 'provider_action_required', 'provider_failed'));

create table if not exists public.mpgf_payment_intents (
  id uuid primary key default gen_random_uuid(),
  intended_cycle_id text references public.mpgf_cycles (id),
  budget_effective_cycle_id text references public.mpgf_cycles (id),
  user_id uuid,
  amount_cents bigint not null check (amount_cents > 0),
  currency text not null default 'usd' check (currency = 'usd'),
  mode text not null check (mode in ('test_payment', 'real_money')),
  provider text,
  provider_payment_intent_id text,
  stripe_payment_intent_id text,
  stripe_checkout_session_id text,
  stripe_subscription_id text,
  stripe_customer_id text,
  cadence text check (cadence in ('one_time', 'monthly')),
  checkout_mode text check (checkout_mode in ('payment', 'subscription')),
  status text not null check (status in ('created', 'requires_action', 'processing', 'succeeded', 'failed', 'cancelled')),
  idempotency_key text,
  metadata_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  confirmed_at timestamptz
);

alter table public.mpgf_payment_intents
  add column if not exists stripe_payment_intent_id text,
  add column if not exists stripe_checkout_session_id text,
  add column if not exists stripe_subscription_id text,
  add column if not exists stripe_customer_id text,
  add column if not exists cadence text check (cadence in ('one_time', 'monthly')),
  add column if not exists checkout_mode text check (checkout_mode in ('payment', 'subscription')),
  add column if not exists metadata_json jsonb not null default '{}'::jsonb,
  add column if not exists confirmed_at timestamptz;

update public.mpgf_payment_intents
set
  stripe_payment_intent_id = coalesce(stripe_payment_intent_id, provider_payment_intent_id),
  status = case status
    when 'requires_provider' then 'requires_action'
    when 'requires_payment_method' then 'requires_action'
    when 'requires_confirmation' then 'requires_action'
    else status
  end;

alter table public.mpgf_payment_intents
  drop constraint if exists mpgf_payment_intents_status_check,
  add constraint mpgf_payment_intents_status_check
    check (status in ('created', 'requires_action', 'processing', 'succeeded', 'failed', 'cancelled'));

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.mpgf_payment_intents'::regclass
      and conname = 'mpgf_payment_intents_idempotency_key_unique'
  ) then
    alter table public.mpgf_payment_intents
      add constraint mpgf_payment_intents_idempotency_key_unique unique (idempotency_key);
  end if;
end $$;

create unique index if not exists mpgf_payment_intents_stripe_payment_intent_unique_idx
on public.mpgf_payment_intents (stripe_payment_intent_id)
where stripe_payment_intent_id is not null;

create unique index if not exists mpgf_payment_intents_checkout_session_unique_idx
on public.mpgf_payment_intents (stripe_checkout_session_id)
where stripe_checkout_session_id is not null;

create table if not exists public.mpgf_contributions (
  id uuid primary key default gen_random_uuid(),
  cycle_id text references public.mpgf_cycles (id),
  budget_effective_cycle_id text references public.mpgf_cycles (id),
  user_id uuid,
  payment_intent_id uuid references public.mpgf_payment_intents (id),
  amount_cents bigint not null check (amount_cents > 0),
  currency text not null default 'usd' check (currency = 'usd'),
  contribution_mode text not null check (contribution_mode in ('test_payment', 'real_money')),
  status text not null check (status in ('pending', 'recorded', 'late_assigned_next_cycle', 'refunded', 'chargeback_disputed', 'chargeback_lost', 'voided')),
  received_at timestamptz,
  budget_effective_at timestamptz,
  stripe_payment_intent_id text,
  stripe_checkout_session_id text,
  stripe_subscription_id text,
  provider_charge_id text,
  refunded_at timestamptz,
  created_at timestamptz not null default timezone('utc', now())
);

alter table public.mpgf_contributions
  add column if not exists stripe_payment_intent_id text,
  add column if not exists stripe_checkout_session_id text,
  add column if not exists stripe_subscription_id text,
  add column if not exists provider_charge_id text,
  add column if not exists refunded_at timestamptz;

alter table public.mpgf_contributions
  drop constraint if exists mpgf_contributions_status_check,
  add constraint mpgf_contributions_status_check
    check (status in ('pending', 'recorded', 'late_assigned_next_cycle', 'refunded', 'chargeback_disputed', 'chargeback_lost', 'voided'));

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.mpgf_contributions'::regclass
      and conname = 'mpgf_contributions_payment_intent_id_unique'
  ) then
    alter table public.mpgf_contributions
      add constraint mpgf_contributions_payment_intent_id_unique unique (payment_intent_id);
  end if;
end $$;

create table if not exists public.mpgf_refunds (
  id uuid primary key default gen_random_uuid(),
  contribution_id uuid references public.mpgf_contributions (id),
  payment_intent_id uuid references public.mpgf_payment_intents (id),
  amount_cents bigint not null check (amount_cents > 0),
  currency text not null default 'usd' check (currency = 'usd'),
  status text not null check (status in ('requested', 'approved', 'submitted_to_provider', 'succeeded', 'failed', 'cancelled')),
  reason text,
  provider_refund_id text,
  requested_by uuid,
  requested_at timestamptz,
  approved_by uuid,
  approved_at timestamptz,
  provider_submitted_at timestamptz,
  processed_at timestamptz,
  evidence_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

alter table public.mpgf_refunds
  add column if not exists provider_refund_id text,
  add column if not exists requested_by uuid,
  add column if not exists requested_at timestamptz,
  add column if not exists approved_by uuid,
  add column if not exists approved_at timestamptz,
  add column if not exists provider_submitted_at timestamptz,
  add column if not exists processed_at timestamptz,
  add column if not exists evidence_json jsonb not null default '{}'::jsonb;

alter table public.mpgf_refunds
  drop constraint if exists mpgf_refunds_status_check,
  add constraint mpgf_refunds_status_check
    check (status in ('requested', 'approved', 'submitted_to_provider', 'succeeded', 'failed', 'cancelled'));

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.mpgf_refunds'::regclass
      and conname = 'mpgf_refunds_provider_refund_id_unique'
  ) then
    alter table public.mpgf_refunds
      add constraint mpgf_refunds_provider_refund_id_unique unique (provider_refund_id);
  end if;
end $$;

create table if not exists public.mpgf_payment_webhook_events (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  provider_event_id text not null,
  stripe_event_id text,
  event_type text not null,
  raw_body_hash text not null,
  payload_json jsonb not null default '{}'::jsonb,
  signature_verified boolean not null default false,
  signature_verified_at timestamptz,
  processed boolean default false,
  processed_at timestamptz,
  processing_error text,
  status text not null default 'received' check (status in ('received', 'processed', 'ignored', 'failed')),
  created_at timestamptz not null default timezone('utc', now()),
  unique (provider, provider_event_id)
);

alter table public.mpgf_payment_webhook_events
  add column if not exists stripe_event_id text,
  add column if not exists raw_body_hash text,
  add column if not exists signature_verified boolean not null default false,
  add column if not exists signature_verified_at timestamptz,
  add column if not exists processed boolean default false,
  add column if not exists processed_at timestamptz,
  add column if not exists processing_error text;

create unique index if not exists mpgf_payment_webhook_events_stripe_event_id_idx
on public.mpgf_payment_webhook_events (stripe_event_id)
where stripe_event_id is not null;

create table if not exists public.mpgf_real_money_gate_status (
  gate_key text primary key,
  status text not null check (status in ('blocked', 'pending_review', 'passed', 'failed')),
  notes text,
  reviewed_by uuid,
  reviewed_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

insert into public.mpgf_real_money_gate_status (gate_key, status, notes)
values
  ('legal_terms_approved', 'pending_review', 'Real-money terms and public copy require operator approval.'),
  ('stripe_live_keys_configured', 'pending_review', 'Production Stripe secret and publishable keys must be configured in Vercel.'),
  ('stripe_webhook_configured', 'pending_review', 'Stripe webhook endpoint and STRIPE_WEBHOOK_SECRET must be configured.'),
  ('refund_policy_approved', 'pending_review', 'Refund policy and review workflow must be approved before accepting real-money MPGF contributions.'),
  ('recipient_compliance_policy_approved', 'pending_review', 'Recipient accreditation and compliance review policy must be approved.'),
  ('payout_profile_approved', 'pending_review', 'Payout profile must be approved before external disbursement can be represented as complete.')
on conflict (gate_key) do nothing;

grant select on public.mpgf_real_money_gate_status to anon, authenticated;
grant select on public.mpgf_payment_intents to authenticated;
grant select on public.mpgf_contributions to authenticated;
grant select on public.mpgf_refunds to authenticated;
grant select on public.mpgf_recurring_contribution_commitments to authenticated;
grant all on public.mpgf_real_money_gate_status to service_role;
grant all on public.mpgf_payment_intents to service_role;
grant all on public.mpgf_contributions to service_role;
grant all on public.mpgf_refunds to service_role;
grant all on public.mpgf_payment_webhook_events to service_role;
grant all on public.mpgf_recurring_contribution_commitments to service_role;

alter table public.mpgf_payment_intents enable row level security;
alter table public.mpgf_contributions enable row level security;
alter table public.mpgf_refunds enable row level security;
alter table public.mpgf_recurring_contribution_commitments enable row level security;
alter table public.mpgf_real_money_gate_status enable row level security;

drop policy if exists mpgf_payment_intents_owner_select on public.mpgf_payment_intents;
create policy mpgf_payment_intents_owner_select
  on public.mpgf_payment_intents
  for select
  to authenticated
  using (user_id = auth.uid());

drop policy if exists mpgf_contributions_owner_select on public.mpgf_contributions;
create policy mpgf_contributions_owner_select
  on public.mpgf_contributions
  for select
  to authenticated
  using (user_id = auth.uid());

drop policy if exists mpgf_refunds_owner_select on public.mpgf_refunds;
create policy mpgf_refunds_owner_select
  on public.mpgf_refunds
  for select
  to authenticated
  using (
    requested_by = auth.uid()
    or exists (
      select 1
      from public.mpgf_contributions contribution
      where contribution.id = mpgf_refunds.contribution_id
        and contribution.user_id = auth.uid()
    )
  );

drop policy if exists mpgf_recurring_commitments_owner_select on public.mpgf_recurring_contribution_commitments;
create policy mpgf_recurring_commitments_owner_select
  on public.mpgf_recurring_contribution_commitments
  for select
  to authenticated
  using (user_id = auth.uid());

drop policy if exists mpgf_recurring_commitments_participant_insert on public.mpgf_recurring_contribution_commitments;
create policy mpgf_recurring_commitments_participant_insert
  on public.mpgf_recurring_contribution_commitments
  for insert
  to authenticated
  with check (
    user_id = auth.uid()
    and mode = 'pledge_only'
    and provider_subscription_id is null
    and provider_customer_id is null
  );

drop policy if exists mpgf_recurring_commitments_participant_update on public.mpgf_recurring_contribution_commitments;
create policy mpgf_recurring_commitments_participant_update
  on public.mpgf_recurring_contribution_commitments
  for update
  to authenticated
  using (user_id = auth.uid())
  with check (
    user_id = auth.uid()
    and mode = 'pledge_only'
    and provider_subscription_id is null
    and provider_customer_id is null
  );

drop policy if exists mpgf_real_money_gate_status_public_select on public.mpgf_real_money_gate_status;
create policy mpgf_real_money_gate_status_public_select
  on public.mpgf_real_money_gate_status
  for select
  to anon, authenticated
  using (true);

commit;
