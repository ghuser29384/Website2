alter table public.moral_trade_policy_snapshots
  drop constraint if exists moral_trade_policy_snapshots_subject_kind_check;

alter table public.moral_trade_policy_snapshots
  add constraint moral_trade_policy_snapshots_subject_kind_check
  check (
    subject_kind in (
      'release_gate',
      'state_interpretation',
      'payment_capture',
      'payout_release',
      'refund_cancellation',
      'provider_source_authentication',
      'time_authority',
      'notification',
      'fx',
      'platform_fee',
      'public_metrics',
      'data_retention',
      'participant_eligibility',
      'recipient_destination_verification',
      'account_security',
      'reviewer_quality',
      'anti_enumeration',
      'privacy_disclosure',
      'backup_recovery',
      'deployment_release',
      'configuration_snapshot',
      'schema_migration',
      'environment_data_isolation',
      'financial_reconciliation',
      'audit_integrity',
      'data_security'
    )
  );

create table if not exists public.moral_trade_privacy_grant_policies (
  id uuid primary key default gen_random_uuid(),
  policy_snapshot_id uuid not null references public.moral_trade_policy_snapshots (id) on delete restrict,
  policy_version text not null default 'moral-trade-privacy-governance-policy-v0.1-2026-06',
  surface text not null check (
    surface in (
      'reviewer_access',
      'counterparty_preview',
      'contact_introduction',
      'evidence_review',
      'profile_export',
      'public_redacted_publication'
    )
  ),
  status text not null default 'under_review' check (
    status in ('passed', 'not_required_for_stage', 'missing', 'under_review', 'failed', 'stale', 'superseded')
  ),
  grant_required_bool boolean not null default true,
  access_log_required_bool boolean not null default true,
  role_limit_required_bool boolean not null default true,
  purpose_limit_required_bool boolean not null default true,
  revocable_grant_required_bool boolean not null default true,
  expiry_required_bool boolean not null default true,
  data_security_review_required_bool boolean not null default true,
  confidentiality_review_required_bool boolean not null default true,
  reviewer_quality_required_bool boolean not null default true,
  account_security_required_bool boolean not null default true,
  participant_confirmation_required_bool boolean not null default true,
  external_authority_required_bool boolean not null default false,
  redaction_required_bool boolean not null default false,
  public_redaction_policy_required_bool boolean not null default false,
  max_access_log_age_days integer not null default 30 check (max_access_log_age_days >= 0),
  policy_hash text not null check (policy_hash ~ '^sha256:[a-f0-9]{64}$'),
  reviewed_by uuid references public.profiles (id) on delete set null,
  reviewed_at timestamptz,
  superseded_by uuid references public.moral_trade_privacy_grant_policies (id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (policy_snapshot_id, surface)
);

comment on table public.moral_trade_privacy_grant_policies is
  'Frozen privacy-disclosure policies for private-data access. Missing grants, access logs, purpose limits, role limits, data-security review, confidentiality review, or required participant/reviewer/account checks fail closed before disclosure.';

alter table public.privacy_grants
  add column if not exists privacy_policy_ref uuid references public.moral_trade_privacy_grant_policies (id) on delete set null,
  add column if not exists purpose_code text not null default '',
  add column if not exists grant_hash text check (grant_hash is null or grant_hash ~ '^sha256:[a-f0-9]{64}$'),
  add column if not exists revoked_at timestamptz,
  add column if not exists superseded_by uuid references public.privacy_grants (id) on delete set null;

create table if not exists public.moral_trade_privacy_access_logs (
  id uuid primary key default gen_random_uuid(),
  privacy_grant_id uuid not null references public.privacy_grants (id) on delete restrict,
  privacy_policy_ref uuid not null references public.moral_trade_privacy_grant_policies (id) on delete restrict,
  surface text not null check (
    surface in (
      'reviewer_access',
      'counterparty_preview',
      'contact_introduction',
      'evidence_review',
      'profile_export',
      'public_redacted_publication'
    )
  ),
  owner_profile_id_hash text not null check (owner_profile_id_hash ~ '^sha256:[a-f0-9]{64}$'),
  actor_id_hash text check (actor_id_hash is null or actor_id_hash ~ '^sha256:[a-f0-9]{64}$'),
  actor_role text not null default '',
  purpose_code text not null default '',
  field_key text not null,
  access_decision text not null default 'blocked' check (access_decision in ('allowed', 'blocked', 'redacted')),
  private_data_returned_bool boolean not null default false,
  raw_private_artifact_returned_bool boolean not null default false,
  redaction_applied_bool boolean not null default false,
  role_limited_bool boolean not null default false,
  purpose_limited_bool boolean not null default false,
  counterparty_disclosure_bool boolean not null default false,
  public_disclosure_bool boolean not null default false,
  access_reason text not null default '',
  access_hash text not null check (access_hash ~ '^sha256:[a-f0-9]{64}$'),
  occurred_at timestamptz not null default timezone('utc', now()),
  expires_at timestamptz,
  superseded_by uuid references public.moral_trade_privacy_access_logs (id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

comment on table public.moral_trade_privacy_access_logs is
  'Purpose-limited and role-limited privacy access log ledger for reviewer, counterparty, contact, evidence, export, and redacted-public disclosure. Logs record hashes and controls, not raw private artifacts.';

create table if not exists public.moral_trade_privacy_disclosure_reviews (
  id uuid primary key default gen_random_uuid(),
  privacy_grant_id uuid not null references public.privacy_grants (id) on delete restrict,
  privacy_policy_ref uuid not null references public.moral_trade_privacy_grant_policies (id) on delete restrict,
  surface text not null check (
    surface in (
      'reviewer_access',
      'counterparty_preview',
      'contact_introduction',
      'evidence_review',
      'profile_export',
      'public_redacted_publication'
    )
  ),
  review_status text not null default 'under_review' check (
    review_status in ('passed', 'not_required_for_stage', 'missing', 'under_review', 'failed', 'stale', 'superseded')
  ),
  confidentiality_review_status text not null default 'under_review' check (
    confidentiality_review_status in ('passed', 'not_required_for_stage', 'missing', 'under_review', 'failed', 'stale', 'superseded')
  ),
  data_security_status text not null default 'under_review' check (
    data_security_status in ('passed', 'not_required_for_stage', 'missing', 'under_review', 'failed', 'stale', 'superseded')
  ),
  reviewer_quality_status text not null default 'under_review' check (
    reviewer_quality_status in ('passed', 'not_required_for_stage', 'missing', 'under_review', 'failed', 'stale', 'superseded')
  ),
  account_security_status text not null default 'under_review' check (
    account_security_status in ('passed', 'not_required_for_stage', 'missing', 'under_review', 'failed', 'stale', 'superseded')
  ),
  participant_confirmation_status text not null default 'under_review' check (
    participant_confirmation_status in ('passed', 'not_required_for_stage', 'missing', 'under_review', 'failed', 'stale', 'superseded')
  ),
  external_authority_status text not null default 'not_required_for_stage' check (
    external_authority_status in ('passed', 'not_required_for_stage', 'missing', 'under_review', 'failed', 'stale', 'superseded')
  ),
  review_hash text not null check (review_hash ~ '^sha256:[a-f0-9]{64}$'),
  reviewed_by uuid references public.profiles (id) on delete set null,
  reviewed_at timestamptz,
  expires_at timestamptz,
  superseded_by uuid references public.moral_trade_privacy_disclosure_reviews (id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

comment on table public.moral_trade_privacy_disclosure_reviews is
  'Disclosure review rows for confidentiality/privacy-rights, data security, reviewer quality, account security, participant confirmation, and external authority checks before private-data access.';

create index if not exists moral_trade_privacy_grant_policies_surface_idx
  on public.moral_trade_privacy_grant_policies (surface, status, created_at desc);

create index if not exists privacy_grants_privacy_policy_ref_idx
  on public.privacy_grants (privacy_policy_ref, status, updated_at desc)
  where privacy_policy_ref is not null;

create index if not exists moral_trade_privacy_access_logs_grant_idx
  on public.moral_trade_privacy_access_logs (privacy_grant_id, surface, occurred_at desc);

create index if not exists moral_trade_privacy_access_logs_actor_idx
  on public.moral_trade_privacy_access_logs (actor_id_hash, surface, occurred_at desc)
  where actor_id_hash is not null;

create index if not exists moral_trade_privacy_disclosure_reviews_grant_idx
  on public.moral_trade_privacy_disclosure_reviews (privacy_grant_id, surface, review_status, created_at desc);

alter table public.moral_trade_privacy_grant_policies enable row level security;
alter table public.moral_trade_privacy_access_logs enable row level security;
alter table public.moral_trade_privacy_disclosure_reviews enable row level security;
