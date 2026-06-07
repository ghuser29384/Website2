create table if not exists public.moral_trade_identity_artifact_references (
  id uuid primary key default gen_random_uuid(),
  participant_id uuid not null references public.profiles (id) on delete cascade,
  artifact_kind text not null check (
    artifact_kind in ('identity_document', 'legal_capacity_attestation', 'sanctions_screening', 'payment_rail_check', 'jurisdiction_evidence', 'sybil_linkage_signal', 'provider_source_event', 'other_private_reference')
  ),
  storage_class text not null default 'encrypted_private' check (
    storage_class in ('encrypted_private', 'tokenized_private', 'external_processor_ref')
  ),
  artifact_ref_hash text not null check (artifact_ref_hash ~ '^sha256:[a-f0-9]{64}$'),
  evidence_hash text not null check (evidence_hash ~ '^sha256:[a-f0-9]{64}$'),
  retention_policy_snapshot_id uuid references public.moral_trade_policy_snapshots (id) on delete restrict,
  privacy_grant_id uuid references public.privacy_grants (id) on delete set null,
  public_exposure_allowed boolean not null default false,
  created_at timestamptz not null default timezone('utc', now()),
  check (public_exposure_allowed = false)
);

comment on table public.moral_trade_identity_artifact_references is
  'Hash-only references to private identity, Sybil, legal-capacity, sanctions, payment-rail, and jurisdiction artifacts. Raw artifacts stay outside public contract surfaces.';

create table if not exists public.moral_trade_participant_eligibility_records (
  id uuid primary key default gen_random_uuid(),
  participant_id uuid not null references public.profiles (id) on delete cascade,
  status text not null default 'under_review' check (
    status in ('eligible', 'not_required_for_stage', 'missing', 'under_review', 'failed', 'stale', 'identity_unverified', 'sybil_risk', 'legal_capacity_blocked', 'sanctions_potential_match', 'sanctions_blocked', 'payment_rail_blocked', 'jurisdiction_blocked', 'source_unauthenticated', 'artifact_handling_unverified', 'superseded')
  ),
  identity_verification_status text not null default 'under_review' check (
    identity_verification_status in ('eligible', 'not_required_for_stage', 'missing', 'under_review', 'failed', 'stale', 'identity_unverified', 'sybil_risk', 'legal_capacity_blocked', 'sanctions_potential_match', 'sanctions_blocked', 'payment_rail_blocked', 'jurisdiction_blocked', 'source_unauthenticated', 'artifact_handling_unverified', 'superseded')
  ),
  human_uniqueness_sybil_status text not null default 'under_review' check (
    human_uniqueness_sybil_status in ('eligible', 'not_required_for_stage', 'missing', 'under_review', 'failed', 'stale', 'identity_unverified', 'sybil_risk', 'legal_capacity_blocked', 'sanctions_potential_match', 'sanctions_blocked', 'payment_rail_blocked', 'jurisdiction_blocked', 'source_unauthenticated', 'artifact_handling_unverified', 'superseded')
  ),
  legal_capacity_status text not null default 'under_review' check (
    legal_capacity_status in ('eligible', 'not_required_for_stage', 'missing', 'under_review', 'failed', 'stale', 'identity_unverified', 'sybil_risk', 'legal_capacity_blocked', 'sanctions_potential_match', 'sanctions_blocked', 'payment_rail_blocked', 'jurisdiction_blocked', 'source_unauthenticated', 'artifact_handling_unverified', 'superseded')
  ),
  sanctions_screening_status text not null default 'under_review' check (
    sanctions_screening_status in ('eligible', 'not_required_for_stage', 'missing', 'under_review', 'failed', 'stale', 'identity_unverified', 'sybil_risk', 'legal_capacity_blocked', 'sanctions_potential_match', 'sanctions_blocked', 'payment_rail_blocked', 'jurisdiction_blocked', 'source_unauthenticated', 'artifact_handling_unverified', 'superseded')
  ),
  payment_rail_eligibility_status text not null default 'under_review' check (
    payment_rail_eligibility_status in ('eligible', 'not_required_for_stage', 'missing', 'under_review', 'failed', 'stale', 'identity_unverified', 'sybil_risk', 'legal_capacity_blocked', 'sanctions_potential_match', 'sanctions_blocked', 'payment_rail_blocked', 'jurisdiction_blocked', 'source_unauthenticated', 'artifact_handling_unverified', 'superseded')
  ),
  jurisdictional_eligibility_status text not null default 'under_review' check (
    jurisdictional_eligibility_status in ('eligible', 'not_required_for_stage', 'missing', 'under_review', 'failed', 'stale', 'identity_unverified', 'sybil_risk', 'legal_capacity_blocked', 'sanctions_potential_match', 'sanctions_blocked', 'payment_rail_blocked', 'jurisdiction_blocked', 'source_unauthenticated', 'artifact_handling_unverified', 'superseded')
  ),
  source_authentication_status text not null default 'under_review' check (
    source_authentication_status in ('eligible', 'not_required_for_stage', 'missing', 'under_review', 'failed', 'stale', 'identity_unverified', 'sybil_risk', 'legal_capacity_blocked', 'sanctions_potential_match', 'sanctions_blocked', 'payment_rail_blocked', 'jurisdiction_blocked', 'source_unauthenticated', 'artifact_handling_unverified', 'superseded')
  ),
  raw_identity_artifact_handling_status text not null default 'under_review' check (
    raw_identity_artifact_handling_status in ('eligible', 'not_required_for_stage', 'missing', 'under_review', 'failed', 'stale', 'identity_unverified', 'sybil_risk', 'legal_capacity_blocked', 'sanctions_potential_match', 'sanctions_blocked', 'payment_rail_blocked', 'jurisdiction_blocked', 'source_unauthenticated', 'artifact_handling_unverified', 'superseded')
  ),
  policy_snapshot_id uuid not null references public.moral_trade_policy_snapshots (id) on delete restrict,
  latest_identity_artifact_ref_id uuid references public.moral_trade_identity_artifact_references (id) on delete set null,
  eligibility_hash text not null check (eligibility_hash ~ '^sha256:[a-f0-9]{64}$'),
  evidence_bundle_hash text not null check (evidence_bundle_hash ~ '^sha256:[a-f0-9]{64}$'),
  counted_support_allowed boolean not null default false,
  real_money_allowed boolean not null default false,
  reliance_bearing_allowed boolean not null default false,
  public_moral_reputation_impact text not null default 'none' check (public_moral_reputation_impact in ('none')),
  identity_artifacts_publicly_exposed boolean not null default false,
  reviewed_by uuid references public.profiles (id) on delete set null,
  reviewed_at timestamptz,
  expires_at timestamptz,
  private_review_notes text not null default '',
  superseded_by uuid references public.moral_trade_participant_eligibility_records (id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  check (identity_artifacts_publicly_exposed = false),
  check (
    status <> 'eligible'
    or (
      identity_verification_status = 'eligible'
      and human_uniqueness_sybil_status = 'eligible'
      and legal_capacity_status = 'eligible'
      and sanctions_screening_status = 'eligible'
      and payment_rail_eligibility_status = 'eligible'
      and jurisdictional_eligibility_status = 'eligible'
      and source_authentication_status = 'eligible'
      and raw_identity_artifact_handling_status = 'eligible'
      and reviewed_at is not null
      and identity_artifacts_publicly_exposed = false
      and public_moral_reputation_impact = 'none'
    )
  )
);

comment on table public.moral_trade_participant_eligibility_records is
  'First-class participant eligibility records for identity, human uniqueness/Sybil, legal capacity, sanctions, payment rail, jurisdiction, source authentication, and private artifact handling.';

create table if not exists public.moral_trade_participant_eligibility_reviews (
  id uuid primary key default gen_random_uuid(),
  eligibility_record_id uuid not null references public.moral_trade_participant_eligibility_records (id) on delete cascade,
  participant_id uuid not null references public.profiles (id) on delete cascade,
  review_dimension text not null check (
    review_dimension in ('identity_verification', 'human_uniqueness_sybil', 'legal_capacity', 'sanctions_screening', 'payment_rail_eligibility', 'jurisdictional_eligibility', 'source_authentication', 'raw_identity_artifact_handling')
  ),
  status text not null default 'under_review' check (
    status in ('eligible', 'not_required_for_stage', 'missing', 'under_review', 'failed', 'stale', 'identity_unverified', 'sybil_risk', 'legal_capacity_blocked', 'sanctions_potential_match', 'sanctions_blocked', 'payment_rail_blocked', 'jurisdiction_blocked', 'source_unauthenticated', 'artifact_handling_unverified', 'superseded')
  ),
  evidence_hash text not null check (evidence_hash ~ '^sha256:[a-f0-9]{64}$'),
  source_event_hash text not null default 'sha256:0000000000000000000000000000000000000000000000000000000000000000' check (source_event_hash ~ '^sha256:[a-f0-9]{64}$'),
  policy_snapshot_id uuid not null references public.moral_trade_policy_snapshots (id) on delete restrict,
  identity_artifact_ref_id uuid references public.moral_trade_identity_artifact_references (id) on delete set null,
  reviewer_id uuid references public.profiles (id) on delete set null,
  reviewed_at timestamptz,
  expires_at timestamptz,
  notes text not null default '',
  superseded_by uuid references public.moral_trade_participant_eligibility_reviews (id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  check (
    status <> 'eligible'
    or reviewed_at is not null
  )
);

comment on table public.moral_trade_participant_eligibility_reviews is
  'Review-dimension records for eligibility decisions. Provider identity, sanctions, payment-rail, and jurisdiction feeds must be source-authenticated before approval.';

create index if not exists moral_trade_identity_artifact_refs_participant_idx
  on public.moral_trade_identity_artifact_references (participant_id, artifact_kind, created_at desc);
create index if not exists moral_trade_participant_eligibility_records_participant_idx
  on public.moral_trade_participant_eligibility_records (participant_id, status, created_at desc);
create index if not exists moral_trade_participant_eligibility_reviews_record_idx
  on public.moral_trade_participant_eligibility_reviews (eligibility_record_id, review_dimension, status);

alter table public.moral_trade_identity_artifact_references enable row level security;
alter table public.moral_trade_participant_eligibility_records enable row level security;
alter table public.moral_trade_participant_eligibility_reviews enable row level security;
