create table if not exists public.moral_trade_recipient_registry_entries (
  id uuid primary key default gen_random_uuid(),
  canonical_name text not null,
  recipient_kind text not null default 'organization' check (
    recipient_kind in ('organization', 'individual', 'fiscal_host', 'charity', 'project', 'donor_advised_fund', 'other_reviewed')
  ),
  status text not null default 'under_review' check (
    status in ('verified', 'not_required_for_stage', 'missing', 'under_review', 'failed', 'stale', 'impersonation_risk', 'jurisdiction_blocked', 'prohibited_use_blocked', 'superseded')
  ),
  anti_impersonation_status text not null default 'under_review' check (
    anti_impersonation_status in ('verified', 'not_required_for_stage', 'missing', 'under_review', 'failed', 'stale', 'impersonation_risk', 'jurisdiction_blocked', 'prohibited_use_blocked', 'superseded')
  ),
  jurisdiction_status text not null default 'under_review' check (
    jurisdiction_status in ('verified', 'not_required_for_stage', 'missing', 'under_review', 'failed', 'stale', 'impersonation_risk', 'jurisdiction_blocked', 'prohibited_use_blocked', 'superseded')
  ),
  prohibited_use_status text not null default 'under_review' check (
    prohibited_use_status in ('verified', 'not_required_for_stage', 'missing', 'under_review', 'failed', 'stale', 'impersonation_risk', 'jurisdiction_blocked', 'prohibited_use_blocked', 'superseded')
  ),
  evidence_bundle_hash text not null check (evidence_bundle_hash ~ '^sha256:[a-f0-9]{64}$'),
  registry_entry_hash text not null check (registry_entry_hash ~ '^sha256:[a-f0-9]{64}$'),
  policy_snapshot_id uuid not null references public.moral_trade_policy_snapshots (id) on delete restrict,
  verification_action_record_id uuid references public.moral_trade_privileged_action_records (id) on delete restrict,
  reviewed_by uuid references public.profiles (id) on delete set null,
  reviewed_at timestamptz,
  expires_at timestamptz,
  public_safe_summary text not null default '',
  private_review_notes text not null default '',
  superseded_by uuid references public.moral_trade_recipient_registry_entries (id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  check (
    status <> 'verified'
    or (
      anti_impersonation_status = 'verified'
      and jurisdiction_status = 'verified'
      and prohibited_use_status = 'verified'
      and reviewed_at is not null
      and verification_action_record_id is not null
    )
  )
);

comment on table public.moral_trade_recipient_registry_entries is
  'First-class reviewed recipient registry entries. Free-text recipient names are evidence inputs only until resolved here.';

create table if not exists public.moral_trade_payment_destinations (
  id uuid primary key default gen_random_uuid(),
  recipient_registry_entry_id uuid not null references public.moral_trade_recipient_registry_entries (id) on delete restrict,
  destination_kind text not null default 'external_donation_link' check (
    destination_kind in ('external_donation_link', 'fiscal_host_account', 'bank_account', 'wallet_address', 'donor_advised_fund', 'payment_processor_account', 'manual_offline', 'other_reviewed')
  ),
  provider_name text not null default '',
  destination_fingerprint_hash text not null check (destination_fingerprint_hash ~ '^sha256:[a-f0-9]{64}$'),
  destination_evidence_hash text not null check (destination_evidence_hash ~ '^sha256:[a-f0-9]{64}$'),
  status text not null default 'under_review' check (
    status in ('verified', 'not_required_for_stage', 'missing', 'under_review', 'failed', 'stale', 'impersonation_risk', 'jurisdiction_blocked', 'prohibited_use_blocked', 'superseded')
  ),
  identity_match_status text not null default 'under_review' check (
    identity_match_status in ('verified', 'not_required_for_stage', 'missing', 'under_review', 'failed', 'stale', 'impersonation_risk', 'jurisdiction_blocked', 'prohibited_use_blocked', 'superseded')
  ),
  payment_rail_status text not null default 'under_review' check (
    payment_rail_status in ('verified', 'not_required_for_stage', 'missing', 'under_review', 'failed', 'stale', 'impersonation_risk', 'jurisdiction_blocked', 'prohibited_use_blocked', 'superseded')
  ),
  jurisdiction_status text not null default 'under_review' check (
    jurisdiction_status in ('verified', 'not_required_for_stage', 'missing', 'under_review', 'failed', 'stale', 'impersonation_risk', 'jurisdiction_blocked', 'prohibited_use_blocked', 'superseded')
  ),
  prohibited_use_status text not null default 'under_review' check (
    prohibited_use_status in ('verified', 'not_required_for_stage', 'missing', 'under_review', 'failed', 'stale', 'impersonation_risk', 'jurisdiction_blocked', 'prohibited_use_blocked', 'superseded')
  ),
  policy_snapshot_id uuid not null references public.moral_trade_policy_snapshots (id) on delete restrict,
  verification_action_record_id uuid references public.moral_trade_privileged_action_records (id) on delete restrict,
  reviewed_by uuid references public.profiles (id) on delete set null,
  reviewed_at timestamptz,
  expires_at timestamptz,
  live_mode_allowed boolean not null default false,
  currency text not null default 'usd' check (currency ~ '^[a-z]{3}$'),
  private_review_notes text not null default '',
  superseded_by uuid references public.moral_trade_payment_destinations (id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (recipient_registry_entry_id, destination_fingerprint_hash),
  check (
    status <> 'verified'
    or (
      identity_match_status = 'verified'
      and payment_rail_status = 'verified'
      and jurisdiction_status = 'verified'
      and prohibited_use_status = 'verified'
      and reviewed_at is not null
      and verification_action_record_id is not null
    )
  )
);

comment on table public.moral_trade_payment_destinations is
  'First-class reviewed payment destinations. Links, wallet addresses, and bank details cannot authorize capture or payout unless represented here without exposing raw credentials.';

create table if not exists public.moral_trade_recipient_destination_reviews (
  id uuid primary key default gen_random_uuid(),
  recipient_registry_entry_id uuid references public.moral_trade_recipient_registry_entries (id) on delete cascade,
  payment_destination_id uuid references public.moral_trade_payment_destinations (id) on delete cascade,
  review_dimension text not null check (
    review_dimension in ('recipient_identity', 'destination_identity', 'anti_impersonation', 'jurisdiction', 'prohibited_use', 'payment_rail', 'authority_to_receive', 'source_authentication')
  ),
  status text not null default 'under_review' check (
    status in ('verified', 'not_required_for_stage', 'missing', 'under_review', 'failed', 'stale', 'impersonation_risk', 'jurisdiction_blocked', 'prohibited_use_blocked', 'superseded')
  ),
  evidence_hash text not null check (evidence_hash ~ '^sha256:[a-f0-9]{64}$'),
  policy_snapshot_id uuid not null references public.moral_trade_policy_snapshots (id) on delete restrict,
  privileged_action_record_id uuid references public.moral_trade_privileged_action_records (id) on delete restrict,
  reviewer_id uuid references public.profiles (id) on delete set null,
  reviewed_at timestamptz,
  expires_at timestamptz,
  notes text not null default '',
  superseded_by uuid references public.moral_trade_recipient_destination_reviews (id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  check (recipient_registry_entry_id is not null or payment_destination_id is not null),
  check (
    status <> 'verified'
    or (
      reviewed_at is not null
      and privileged_action_record_id is not null
    )
  )
);

comment on table public.moral_trade_recipient_destination_reviews is
  'Review-dimension records for recipient identity, payment destination identity, anti-impersonation, jurisdiction, prohibited-use, payment-rail, authority, and source-authentication checks.';

create index if not exists moral_trade_recipient_registry_entries_status_idx
  on public.moral_trade_recipient_registry_entries (status, canonical_name, created_at desc);
create index if not exists moral_trade_payment_destinations_recipient_status_idx
  on public.moral_trade_payment_destinations (recipient_registry_entry_id, status, created_at desc);
create index if not exists moral_trade_payment_destinations_fingerprint_idx
  on public.moral_trade_payment_destinations (destination_fingerprint_hash, status);
create index if not exists moral_trade_recipient_destination_reviews_subject_idx
  on public.moral_trade_recipient_destination_reviews (recipient_registry_entry_id, payment_destination_id, review_dimension, status);

alter table public.moral_trade_recipient_registry_entries enable row level security;
alter table public.moral_trade_payment_destinations enable row level security;
alter table public.moral_trade_recipient_destination_reviews enable row level security;
