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
on conflict (id) do nothing;

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
  ('manual_external_payment_evidence_policy_approved', 'pending_review', 'Manual external-payment evidence submission and review policy must be approved.'),
  ('external_payment_destination_approved', 'pending_review', 'The Open Collective, fiscal host, or other external destination must be approved before evidence intake opens.'),
  ('legal_terms_approved', 'pending_review', 'Real-money terms and public copy require operator approval.'),
  ('refund_policy_approved', 'pending_review', 'Refund policy and review workflow must be approved before accepting real-money MPGF records.'),
  ('recipient_compliance_policy_approved', 'pending_review', 'Recipient accreditation and compliance review policy must be approved.'),
  ('payout_profile_approved', 'pending_review', 'Payout profile must be approved before external disbursement can be represented as complete.')
on conflict (gate_key) do nothing;

create table if not exists public.mpgf_manual_external_payment_evidence (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  cycle_id text references public.mpgf_cycles (id) on delete set null,
  amount_cents bigint not null check (amount_cents > 0),
  currency text not null default 'usd' check (currency = 'usd'),
  provider text not null check (provider in ('open_collective', 'fiscal_host', 'bank_transfer', 'paypal', 'other')),
  external_payment_reference text not null,
  evidence_url text,
  evidence_description text not null,
  paid_at timestamptz,
  status text not null default 'submitted' check (status in ('submitted', 'under_review', 'verified', 'rejected', 'converted_to_contribution')),
  contribution_id uuid,
  reviewed_by uuid,
  reviewed_at timestamptz,
  review_notes text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

alter table public.mpgf_manual_external_payment_evidence
  add column if not exists evidence_url text,
  add column if not exists evidence_description text not null default '',
  add column if not exists paid_at timestamptz,
  add column if not exists contribution_id uuid,
  add column if not exists reviewed_by uuid,
  add column if not exists reviewed_at timestamptz,
  add column if not exists review_notes text,
  add column if not exists updated_at timestamptz not null default timezone('utc', now());

alter table public.mpgf_manual_external_payment_evidence
  drop constraint if exists mpgf_manual_external_payment_evidence_provider_check,
  add constraint mpgf_manual_external_payment_evidence_provider_check
    check (provider in ('open_collective', 'fiscal_host', 'bank_transfer', 'paypal', 'other')),
  drop constraint if exists mpgf_manual_external_payment_evidence_status_check,
  add constraint mpgf_manual_external_payment_evidence_status_check
    check (status in ('submitted', 'under_review', 'verified', 'rejected', 'converted_to_contribution'));

do $$
begin
  if to_regclass('public.mpgf_contributions') is not null then
    alter table public.mpgf_contributions
      drop constraint if exists mpgf_contributions_status_check,
      add constraint mpgf_contributions_status_check
        check (status in ('pending', 'recorded', 'late_assigned_next_cycle', 'refunded', 'chargeback_disputed', 'chargeback_lost', 'voided'));

    alter table public.mpgf_contributions
      drop constraint if exists mpgf_contributions_contribution_mode_check,
      add constraint mpgf_contributions_contribution_mode_check
        check (contribution_mode in ('test_payment', 'real_money', 'manual_external'));
  end if;
end $$;

grant select, insert on public.mpgf_manual_external_payment_evidence to authenticated;
grant select on public.mpgf_real_money_gate_status to anon, authenticated;
grant all on public.mpgf_manual_external_payment_evidence to service_role;
grant all on public.mpgf_real_money_gate_status to service_role;

alter table public.mpgf_manual_external_payment_evidence enable row level security;
alter table public.mpgf_real_money_gate_status enable row level security;

drop policy if exists mpgf_manual_evidence_owner_select on public.mpgf_manual_external_payment_evidence;
create policy mpgf_manual_evidence_owner_select
  on public.mpgf_manual_external_payment_evidence
  for select
  to authenticated
  using (user_id = auth.uid());

drop policy if exists mpgf_manual_evidence_owner_insert on public.mpgf_manual_external_payment_evidence;
create policy mpgf_manual_evidence_owner_insert
  on public.mpgf_manual_external_payment_evidence
  for insert
  to authenticated
  with check (
    user_id = auth.uid()
    and status = 'submitted'
    and contribution_id is null
    and reviewed_by is null
    and reviewed_at is null
  );

drop policy if exists mpgf_real_money_gate_status_public_select on public.mpgf_real_money_gate_status;
create policy mpgf_real_money_gate_status_public_select
  on public.mpgf_real_money_gate_status
  for select
  to anon, authenticated
  using (true);

commit;
