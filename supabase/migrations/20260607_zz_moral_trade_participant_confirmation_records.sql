create table if not exists public.moral_trade_consent_quality_records (
  id uuid primary key default gen_random_uuid(),
  participant_id uuid not null references public.profiles (id) on delete cascade,
  subject_type text not null check (
    subject_type in (
      'common_ground_budget',
      'marketplace_round',
      'matched_trade_lock_proposal',
      'cleared_trade_agreement',
      'agreement_amendment_record',
      'project_set_change',
      'payment_capture',
      'payout_release',
      'privacy_grant',
      'exposure_increase'
    )
  ),
  subject_id text not null,
  choice_architecture_policy_snapshot_id uuid references public.moral_trade_policy_snapshots (id) on delete restrict,
  status text not null default 'under_review' check (
    status in ('passed', 'not_required_for_stage', 'missing', 'failed', 'stale', 'under_review')
  ),
  required_disclosures_shown boolean not null default false,
  comprehension_check_status text not null default 'not_required_for_stage' check (
    comprehension_check_status in ('passed', 'not_required_for_stage', 'missing', 'failed')
  ),
  preselected_paid_commitment boolean not null default false,
  countdown_pressure_present boolean not null default false,
  misleading_default_routing_present boolean not null default false,
  dark_pattern_review_notes text not null default '',
  reviewed_by uuid references public.profiles (id) on delete set null,
  reviewed_at timestamptz,
  expires_at timestamptz,
  created_at timestamptz not null default timezone('utc', now())
);

comment on table public.moral_trade_consent_quality_records is
  'Choice-architecture and consent-quality records for high-risk participant confirmations; failed, stale, missing, or under-review records block affected transitions.';

create table if not exists public.moral_trade_participant_confirmation_records (
  id uuid primary key default gen_random_uuid(),
  participant_id uuid not null references public.profiles (id) on delete cascade,
  subject_type text not null check (
    subject_type in (
      'common_ground_budget',
      'marketplace_round',
      'matched_trade_lock_proposal',
      'cleared_trade_agreement',
      'agreement_amendment_record',
      'project_set_change',
      'payment_capture',
      'payout_release',
      'privacy_grant',
      'exposure_increase'
    )
  ),
  subject_id text not null,
  confirmation_scope text not null check (
    confirmation_scope in (
      'budget_activation',
      'round_lock',
      'final_lock',
      'cleared_agreement',
      'renewed_material_change',
      'project_set_change_approval',
      'payment_capture',
      'payout_release',
      'privacy_disclosure',
      'exposure_increase'
    )
  ),
  status text not null default 'draft' check (
    status in ('recorded', 'draft', 'missing', 'expired', 'revoked', 'superseded', 'stale')
  ),
  confirmation_hash text not null check (confirmation_hash ~ '^sha256:[a-f0-9]{64}$'),
  baseline_hash text not null check (baseline_hash ~ '^sha256:[a-f0-9]{64}$'),
  terms_snapshot_hash text not null check (terms_snapshot_hash ~ '^sha256:[a-f0-9]{64}$'),
  policy_snapshot_bundle_hash text not null check (policy_snapshot_bundle_hash ~ '^sha256:[a-f0-9]{64}$'),
  maximum_exposure_cents integer not null check (maximum_exposure_cents >= 0),
  currency text not null default 'usd' check (currency ~ '^[a-z]{3}$'),
  notice_record_status text not null default 'missing' check (
    notice_record_status in ('delivered', 'not_required_for_stage', 'missing', 'failed', 'stale')
  ),
  consent_quality_record_id uuid references public.moral_trade_consent_quality_records (id) on delete restrict,
  consent_quality_status text not null default 'missing' check (
    consent_quality_status in ('passed', 'not_required_for_stage', 'missing', 'failed', 'stale', 'under_review')
  ),
  consent_quality_required boolean not null default true,
  eligible_set_hash text check (eligible_set_hash is null or eligible_set_hash ~ '^sha256:[a-f0-9]{64}$'),
  fallback_policy_hash text check (fallback_policy_hash is null or fallback_policy_hash ~ '^sha256:[a-f0-9]{64}$'),
  supersedes_confirmation_hash text check (
    supersedes_confirmation_hash is null or supersedes_confirmation_hash ~ '^sha256:[a-f0-9]{64}$'
  ),
  material_terms_changed_after_confirmation boolean not null default false,
  recorded_at timestamptz not null default timezone('utc', now()),
  expires_at timestamptz,
  revoked_at timestamptz,
  superseded_by uuid references public.moral_trade_participant_confirmation_records (id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  unique (participant_id, subject_type, subject_id, confirmation_scope, confirmation_hash),
  check (
    confirmation_scope not in ('budget_activation', 'round_lock', 'project_set_change_approval')
    or eligible_set_hash is not null
  ),
  check (
    confirmation_scope <> 'renewed_material_change'
    or supersedes_confirmation_hash is not null
  ),
  check (
    confirmation_scope not in (
      'final_lock',
      'cleared_agreement',
      'renewed_material_change',
      'payment_capture',
      'payout_release',
      'privacy_disclosure',
      'exposure_increase'
    )
    or consent_quality_required
  )
);

comment on table public.moral_trade_participant_confirmation_records is
  'First-class, versioned, hash-backed participant confirmations. Parent-object hashes or JSON summaries alone cannot authorize routing, clearing, capture, payout release, privacy disclosure, or material-term changes.';

create index if not exists moral_trade_participant_confirmations_subject_idx
  on public.moral_trade_participant_confirmation_records (subject_type, subject_id, confirmation_scope, status);
create index if not exists moral_trade_participant_confirmations_participant_idx
  on public.moral_trade_participant_confirmation_records (participant_id, recorded_at desc);
create index if not exists moral_trade_consent_quality_subject_idx
  on public.moral_trade_consent_quality_records (subject_type, subject_id, status);

alter table public.moral_trade_consent_quality_records enable row level security;
alter table public.moral_trade_participant_confirmation_records enable row level security;
