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
      'backup_recovery',
      'deployment_release',
      'configuration_snapshot',
      'schema_migration',
      'environment_data_isolation',
      'financial_reconciliation',
      'audit_integrity',
      'data_security',
      'reviewer_quality',
      'anti_enumeration',
      'privacy_disclosure',
      'impact_claim_methodology',
      'matching_clearing',
      'matched_trade_lock',
      'baseline_integrity',
      'baseline_manufacturing',
      'agreement_amendment',
      'appeal_case',
      'side_agreement_disclosure',
      'side_agreement_review',
      'trade_classification',
      'compensated_moral_action',
      'ordinary_service_procurement',
      'protective_assessment',
      'negative_commitment_scope',
      'action_reversibility_assessment',
      'donor_of_record_tax_receipt',
      'third_party_obligation_assessment',
      'representative_authority_assessment',
      'reporting_integrity_assessment',
      'civil_rights_discrimination_assessment',
      'participant_autonomy_assessment',
      'confidentiality_privacy_rights_assessment',
      'evidence_authenticity_assessment',
      'financial_crime_fraud_assessment',
      'agreement_transferability_assessment',
      'regulated_goods_hazardous_activity_assessment',
      'cyber_abuse_digital_integrity_assessment',
      'anti_corruption_assessment',
      'least_intrusive_evidence_assessment',
      'performance_bond_neutral_review',
      'user_safety',
      'contact_interaction',
      'abuse_report',
      'content_moderation',
      'prohibited_use',
      'challenge_window',
      'payout_milestone',
      'approved_trade_template',
      'template_parameter',
      'review_capacity',
      'review_queue_admission',
      'participant_term_sheet',
      'counterparty_blinding',
      'staged_counterparty_disclosure'
    )
  );

create table if not exists public.moral_trade_counterparty_blinding_policies (
  id uuid primary key default gen_random_uuid(),
  policy_snapshot_id uuid not null references public.moral_trade_policy_snapshots (id) on delete restrict,
  release_stage text not null,
  subject_type text not null check (
    subject_type in (
      'donation_offset',
      'pledge_swap',
      'compensated_moral_action',
      'matched_trade_lock_proposal',
      'cleared_trade_agreement'
    )
  ),
  policy_status text not null default 'missing' check (
    policy_status in ('resolved_immutable', 'missing', 'mutable', 'stale', 'superseded')
  ),
  allowed_disclosure_stages text[] not null default array[]::text[],
  policy_hash text not null check (policy_hash ~ '^sha256:[a-f0-9]{64}$'),
  raw_counterparty_identity_public_bool boolean not null default false,
  raw_contact_public_bool boolean not null default false,
  private_wish_public_bool boolean not null default false,
  exact_private_constraint_public_bool boolean not null default false,
  hidden_match_reasoning_public_bool boolean not null default false,
  reviewed_by uuid references public.profiles (id) on delete set null,
  reviewed_at timestamptz,
  expires_at timestamptz,
  superseded_by uuid references public.moral_trade_counterparty_blinding_policies (id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (release_stage, subject_type, policy_snapshot_id),
  check (
    policy_status <> 'resolved_immutable'
    or (
      cardinality(allowed_disclosure_stages) > 0
      and reviewed_at is not null
      and raw_counterparty_identity_public_bool = false
      and raw_contact_public_bool = false
      and private_wish_public_bool = false
      and exact_private_constraint_public_bool = false
      and hidden_match_reasoning_public_bool = false
    )
  ),
  check (
    allowed_disclosure_stages <@ array[
      'none',
      'cohort_count',
      'redacted_counterparty',
      'mutual_consent',
      'post_lock_public_summary'
    ]::text[]
  )
);

comment on table public.moral_trade_counterparty_blinding_policies is
  'Immutable counterparty blinding policies for participant term sheets. Public contract surfaces expose only status categories, stage names, and volume buckets, never raw identities, contact details, private wishes, exact constraints, or hidden match reasoning.';

create table if not exists public.moral_trade_participant_term_sheet_records (
  id uuid primary key default gen_random_uuid(),
  counterparty_blinding_policy_id uuid not null references public.moral_trade_counterparty_blinding_policies (id) on delete restrict,
  subject_type text not null check (
    subject_type in (
      'donation_offset',
      'pledge_swap',
      'compensated_moral_action',
      'matched_trade_lock_proposal',
      'cleared_trade_agreement'
    )
  ),
  subject_ref text not null,
  term_sheet_state text not null default 'draft' check (
    term_sheet_state in (
      'draft',
      'participant_confirmed',
      'counterparty_confirmed',
      'mutually_confirmed',
      'mismatch',
      'expired',
      'superseded',
      'blocked'
    )
  ),
  participant_term_hash text not null check (participant_term_hash ~ '^sha256:[a-f0-9]{64}$'),
  counterparty_term_hash text check (counterparty_term_hash is null or counterparty_term_hash ~ '^sha256:[a-f0-9]{64}$'),
  normalized_term_hash text not null check (normalized_term_hash ~ '^sha256:[a-f0-9]{64}$'),
  participant_confirmation_id uuid references public.moral_trade_participant_confirmation_records (id) on delete set null,
  counterparty_confirmation_id uuid references public.moral_trade_participant_confirmation_records (id) on delete set null,
  mutual_confirmation_hash text check (mutual_confirmation_hash is null or mutual_confirmation_hash ~ '^sha256:[a-f0-9]{64}$'),
  free_text_creates_new_obligations_bool boolean not null default false,
  free_text_creates_side_payments_bool boolean not null default false,
  free_text_creates_new_counterparties_bool boolean not null default false,
  raw_private_terms_public_bool boolean not null default false,
  reviewer_notes_public_bool boolean not null default false,
  reviewed_by uuid references public.profiles (id) on delete set null,
  reviewed_at timestamptz,
  expires_at timestamptz,
  superseded_by uuid references public.moral_trade_participant_term_sheet_records (id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (subject_type, subject_ref, counterparty_blinding_policy_id),
  check (
    term_sheet_state <> 'participant_confirmed'
    or (
      participant_confirmation_id is not null
      and participant_term_hash = normalized_term_hash
      and reviewed_at is not null
      and free_text_creates_new_obligations_bool = false
      and free_text_creates_side_payments_bool = false
      and free_text_creates_new_counterparties_bool = false
      and raw_private_terms_public_bool = false
      and reviewer_notes_public_bool = false
    )
  ),
  check (
    term_sheet_state <> 'mutually_confirmed'
    or (
      participant_confirmation_id is not null
      and counterparty_confirmation_id is not null
      and participant_term_hash = normalized_term_hash
      and counterparty_term_hash = normalized_term_hash
      and mutual_confirmation_hash is not null
      and reviewed_at is not null
      and free_text_creates_new_obligations_bool = false
      and free_text_creates_side_payments_bool = false
      and free_text_creates_new_counterparties_bool = false
      and raw_private_terms_public_bool = false
      and reviewer_notes_public_bool = false
    )
  )
);

comment on table public.moral_trade_participant_term_sheet_records is
  'Hash-backed participant term sheet records. Live, matchable, payable, reliance-bearing, and public metric transitions fail closed on mismatched hashes, missing confirmations, new side obligations, side payments, new counterparties, stale records, or public private terms.';

create table if not exists public.moral_trade_staged_counterparty_disclosure_records (
  id uuid primary key default gen_random_uuid(),
  participant_term_sheet_record_id uuid not null references public.moral_trade_participant_term_sheet_records (id) on delete restrict,
  counterparty_blinding_policy_id uuid not null references public.moral_trade_counterparty_blinding_policies (id) on delete restrict,
  disclosure_state text not null default 'not_disclosed' check (
    disclosure_state in (
      'not_disclosed',
      'stage_eligible',
      'redacted_disclosed',
      'mutually_consented',
      'over_disclosed',
      'expired',
      'superseded',
      'blocked'
    )
  ),
  visible_user_disclosure_status text not null check (
    visible_user_disclosure_status in (
      'not_disclosed',
      'volume_bucket_only',
      'redacted_counterparty',
      'mutual_consent_ready',
      'mutually_disclosed',
      'expired_stale',
      'blocked_needs_review'
    )
  ),
  disclosure_stage text not null default 'none' check (
    disclosure_stage in (
      'none',
      'cohort_count',
      'redacted_counterparty',
      'mutual_consent',
      'post_lock_public_summary'
    )
  ),
  counterparty_volume_bucket text not null,
  redaction_hash text not null check (redaction_hash ~ '^sha256:[a-f0-9]{64}$'),
  mutual_consent_hash text check (mutual_consent_hash is null or mutual_consent_hash ~ '^sha256:[a-f0-9]{64}$'),
  raw_counterparty_identity_public_bool boolean not null default false,
  raw_contact_public_bool boolean not null default false,
  private_wish_public_bool boolean not null default false,
  exact_private_constraint_public_bool boolean not null default false,
  hidden_match_reasoning_public_bool boolean not null default false,
  reviewer_notes_public_bool boolean not null default false,
  reviewed_by uuid references public.profiles (id) on delete set null,
  reviewed_at timestamptz,
  expires_at timestamptz,
  superseded_by uuid references public.moral_trade_staged_counterparty_disclosure_records (id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (participant_term_sheet_record_id, counterparty_blinding_policy_id),
  check (
    disclosure_state not in ('stage_eligible', 'redacted_disclosed', 'mutually_consented')
    or (
      visible_user_disclosure_status in (
        'volume_bucket_only',
        'redacted_counterparty',
        'mutual_consent_ready',
        'mutually_disclosed'
      )
      and counterparty_volume_bucket <> ''
      and reviewed_at is not null
      and raw_counterparty_identity_public_bool = false
      and raw_contact_public_bool = false
      and private_wish_public_bool = false
      and exact_private_constraint_public_bool = false
      and hidden_match_reasoning_public_bool = false
      and reviewer_notes_public_bool = false
    )
  ),
  check (
    disclosure_state <> 'mutually_consented'
    or (
      mutual_consent_hash is not null
      and disclosure_stage in ('mutual_consent', 'post_lock_public_summary')
    )
  )
);

comment on table public.moral_trade_staged_counterparty_disclosure_records is
  'Staged counterparty disclosure records for participant term sheets. Public status may show only stage, broad volume bucket, and safe category; raw counterparty identity, contact details, private wishes, exact constraints, hidden match reasoning, and reviewer notes remain private.';

create table if not exists public.moral_trade_participant_term_sheet_enforcement_records (
  id uuid primary key default gen_random_uuid(),
  owner_profile_id uuid not null references public.profiles (id) on delete cascade,
  transition text not null check (
    transition in (
      'draft_preview',
      'counterparty_preview',
      'live_offer_publication',
      'matchable_publication',
      'matched_trade_lock',
      'payment_authorization',
      'payment_capture',
      'reliance_bearing_transition',
      'public_metric_publication',
      'release_gate_promotion'
    )
  ),
  enforcement_status text not null check (enforcement_status in ('pass', 'blocked')),
  required_policy_count integer not null default 0 check (required_policy_count >= 0),
  required_term_sheet_count integer not null default 0 check (required_term_sheet_count >= 0),
  required_disclosure_count integer not null default 0 check (required_disclosure_count >= 0),
  immutable_policy_count integer not null default 0 check (immutable_policy_count >= 0),
  passing_term_sheet_count integer not null default 0 check (passing_term_sheet_count >= 0),
  staged_disclosure_count integer not null default 0 check (staged_disclosure_count >= 0),
  policy_record_count integer not null default 0 check (policy_record_count >= 0),
  term_sheet_record_count integer not null default 0 check (term_sheet_record_count >= 0),
  disclosure_record_count integer not null default 0 check (disclosure_record_count >= 0),
  enforcement_input_json jsonb not null,
  evaluation_result_json jsonb not null,
  blocker_codes text[] not null default '{}',
  user_facing_blocker_categories text[] not null default '{}',
  contract_version text not null,
  validator_version text not null,
  evaluation_hash text not null check (evaluation_hash ~ '^sha256:[a-f0-9]{64}$'),
  idempotency_key text not null,
  counterparty_disclosure_allowed_bool boolean not null default false,
  live_publication_allowed_bool boolean not null default false,
  matchable_publication_allowed_bool boolean not null default false,
  lock_transition_allowed_bool boolean not null default false,
  payment_authorization_allowed_bool boolean not null default false,
  payment_capture_allowed_bool boolean not null default false,
  reliance_bearing_transition_allowed_bool boolean not null default false,
  public_metric_publication_allowed_bool boolean not null default false,
  release_gate_promotion_allowed_bool boolean not null default false,
  superseded_by uuid references public.moral_trade_participant_term_sheet_enforcement_records (id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  check (immutable_policy_count <= policy_record_count),
  check (passing_term_sheet_count <= term_sheet_record_count),
  check (staged_disclosure_count <= disclosure_record_count),
  check (counterparty_disclosure_allowed_bool = false),
  check (live_publication_allowed_bool = false),
  check (matchable_publication_allowed_bool = false),
  check (lock_transition_allowed_bool = false),
  check (payment_authorization_allowed_bool = false),
  check (payment_capture_allowed_bool = false),
  check (reliance_bearing_transition_allowed_bool = false),
  check (public_metric_publication_allowed_bool = false),
  check (release_gate_promotion_allowed_bool = false),
  unique (owner_profile_id, idempotency_key)
);

comment on table public.moral_trade_participant_term_sheet_enforcement_records is
  'Append-only user-owned participant-term-sheet enforcement records. A record stores normalized counterparty-blinding, term-sheet, and staged-disclosure evaluation input, deterministic evaluation result, blockers, and evaluation hash while enforcing that enforcement records cannot authorize counterparty disclosure, live publication, matching, lock, payment authorization, payment capture, reliance, public metric publication, or release-gate promotion.';

create index if not exists moral_trade_counterparty_blinding_policies_stage_idx
  on public.moral_trade_counterparty_blinding_policies (release_stage, subject_type, policy_status);

create index if not exists moral_trade_participant_term_sheet_records_subject_idx
  on public.moral_trade_participant_term_sheet_records (subject_type, subject_ref, term_sheet_state, created_at desc);

create index if not exists moral_trade_participant_term_sheet_records_policy_idx
  on public.moral_trade_participant_term_sheet_records (counterparty_blinding_policy_id, term_sheet_state, reviewed_at desc);

create index if not exists moral_trade_staged_counterparty_disclosure_records_term_sheet_idx
  on public.moral_trade_staged_counterparty_disclosure_records (participant_term_sheet_record_id, disclosure_state, reviewed_at desc);

create index if not exists moral_trade_staged_counterparty_disclosure_records_policy_idx
  on public.moral_trade_staged_counterparty_disclosure_records (counterparty_blinding_policy_id, disclosure_stage, visible_user_disclosure_status);
create index if not exists moral_trade_participant_term_sheet_enforcement_records_owner_status_idx
  on public.moral_trade_participant_term_sheet_enforcement_records (owner_profile_id, enforcement_status, created_at desc);
create index if not exists moral_trade_participant_term_sheet_enforcement_records_transition_status_idx
  on public.moral_trade_participant_term_sheet_enforcement_records (transition, enforcement_status, created_at desc);
create index if not exists moral_trade_participant_term_sheet_enforcement_records_hash_idx
  on public.moral_trade_participant_term_sheet_enforcement_records (evaluation_hash, created_at desc);

alter table public.moral_trade_counterparty_blinding_policies enable row level security;
alter table public.moral_trade_participant_term_sheet_records enable row level security;
alter table public.moral_trade_staged_counterparty_disclosure_records enable row level security;
alter table public.moral_trade_participant_term_sheet_enforcement_records enable row level security;

drop policy if exists "moral_trade_participant_term_sheet_enforcement_records_select_owner"
  on public.moral_trade_participant_term_sheet_enforcement_records;
create policy "moral_trade_participant_term_sheet_enforcement_records_select_owner"
  on public.moral_trade_participant_term_sheet_enforcement_records
  for select
  to authenticated
  using (owner_profile_id = auth.uid());

drop policy if exists "moral_trade_participant_term_sheet_enforcement_records_insert_owner"
  on public.moral_trade_participant_term_sheet_enforcement_records;
create policy "moral_trade_participant_term_sheet_enforcement_records_insert_owner"
  on public.moral_trade_participant_term_sheet_enforcement_records
  for insert
  to authenticated
  with check (
    owner_profile_id = auth.uid()
    and counterparty_disclosure_allowed_bool = false
    and live_publication_allowed_bool = false
    and matchable_publication_allowed_bool = false
    and lock_transition_allowed_bool = false
    and payment_authorization_allowed_bool = false
    and payment_capture_allowed_bool = false
    and reliance_bearing_transition_allowed_bool = false
    and public_metric_publication_allowed_bool = false
    and release_gate_promotion_allowed_bool = false
  );
