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
      'staged_counterparty_disclosure',
      'recipient_acceptance',
      'adverse_association',
      'ai_preference_elicitation',
      'post_clear_audit',
      'non_public_goods_subsidy',
      'subsidy_schedule',
      'cause_bucket_taxonomy',
      'resource_compatibility',
      'net_offset_accounting',
      'offer_validity',
      'direct_pair_clearing',
      'private_exchange_rate_quote',
      'noncompensable_blocker',
      'batch_clearing_objective',
      'sensitive_evidence_attestation',
      'pilot_evidence',
      'option_set_comparison',
      'preference_comparability',
      'trade_burden_accounting',
      'moral_difference_attestation',
      'bargaining_protocol',
      'empirical_assumption',
      'moral_side_constraint',
      'intrapersonal_self_offset',
      'commitment_inventory',
      'atomic_settlement',
      'breach_remedy'
    )
  );

create table if not exists public.moral_trade_commitment_inventory_records (
  id uuid primary key default gen_random_uuid(),
  policy_snapshot_id uuid not null references public.moral_trade_policy_snapshots (id) on delete restrict,
  participant_id_hash text not null check (participant_id_hash ~ '^sha256:[a-f0-9]{64}$'),
  commitment_type text not null check (
    commitment_type in (
      'planned_donation',
      'opposed_donation_abstention',
      'pledged_action',
      'abstention',
      'payment_authorization',
      'evidence_artifact',
      'other'
    )
  ),
  subject_type text not null check (
    subject_type in (
      'offset_offer',
      'pledge_swap_offer',
      'matched_trade_lock_proposal',
      'cleared_trade_agreement',
      'evidence_record'
    )
  ),
  subject_id text not null,
  no_trade_baseline_snapshot_hash text not null check (no_trade_baseline_snapshot_hash ~ '^sha256:[a-f0-9]{64}$'),
  negative_commitment_scope_ref text,
  action_unit text not null,
  amount_cents integer not null default 0 check (amount_cents >= 0),
  currency text not null,
  performance_window_start timestamptz not null,
  performance_window_end timestamptz not null,
  total_capacity_units numeric not null check (total_capacity_units >= 0),
  reserved_capacity_units numeric not null default 0 check (reserved_capacity_units >= 0),
  fulfilled_capacity_units numeric not null default 0 check (fulfilled_capacity_units >= 0),
  commitment_inventory_policy_ref text not null,
  reuse_policy text not null check (
    reuse_policy in ('exclusive', 'pooled_if_preconfirmed', 'reusable_evidence_only', 'manual_review')
  ),
  inventory_state text not null check (
    inventory_state in ('draft', 'available', 'reserved', 'locked', 'fulfilled', 'released', 'expired', 'disputed', 'superseded')
  ),
  privacy_grant_refs text[] not null default '{}',
  reviewer_decision_ref text,
  reviewed_by uuid references public.profiles (id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  check (performance_window_start < performance_window_end),
  check (reserved_capacity_units <= total_capacity_units),
  check (fulfilled_capacity_units <= total_capacity_units),
  check (reserved_capacity_units + fulfilled_capacity_units <= total_capacity_units),
  check (
    reuse_policy <> 'reusable_evidence_only'
    or commitment_type = 'evidence_artifact'
  )
);

comment on table public.moral_trade_commitment_inventory_records is
  'First-class commitment inventory records for non-public-goods moral trade. Inventory capacity prevents double-counting planned donations, abstentions, pledged actions, payment authorizations, and evidence artifacts across lock proposals, payment authorizations, evidence claims, and performance obligations.';

create index if not exists moral_trade_commitment_inventory_subject_idx
  on public.moral_trade_commitment_inventory_records (subject_type, subject_id, inventory_state);

create index if not exists moral_trade_commitment_inventory_participant_idx
  on public.moral_trade_commitment_inventory_records (participant_id_hash, commitment_type, inventory_state);

alter table public.moral_trade_commitment_inventory_records enable row level security;

create table if not exists public.moral_trade_commitment_reservation_records (
  id uuid primary key default gen_random_uuid(),
  commitment_inventory_record_id uuid not null references public.moral_trade_commitment_inventory_records (id) on delete restrict,
  matched_trade_lock_proposal_ref text,
  cleared_trade_agreement_ref text,
  reserved_units numeric not null check (reserved_units > 0),
  reserved_amount_cents integer not null default 0 check (reserved_amount_cents >= 0),
  reservation_scope text not null check (
    reservation_scope in ('lock_proposal', 'payment_authorization', 'evidence_claim', 'performance_obligation')
  ),
  reservation_state text not null check (
    reservation_state in ('pending', 'reserved', 'locked', 'fulfilled', 'released', 'expired', 'cancelled', 'superseded')
  ),
  double_count_check_state text not null check (
    double_count_check_state in ('not_required', 'passed', 'blocked', 'manual_review')
  ),
  release_reason text,
  reviewer_decision_ref text,
  reviewed_by uuid references public.profiles (id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  check (
    matched_trade_lock_proposal_ref is not null
    or cleared_trade_agreement_ref is not null
  ),
  check (double_count_check_state in ('not_required', 'passed'))
);

comment on table public.moral_trade_commitment_reservation_records is
  'Commitment reservation records bind inventory capacity to lock proposals, payment authorizations, evidence claims, or performance obligations and require double-count checks to pass before reliance-bearing settlement transitions.';

create index if not exists moral_trade_commitment_reservation_inventory_idx
  on public.moral_trade_commitment_reservation_records (commitment_inventory_record_id, reservation_state, double_count_check_state);

alter table public.moral_trade_commitment_reservation_records enable row level security;

create table if not exists public.moral_trade_atomic_settlement_groups (
  id uuid primary key default gen_random_uuid(),
  trade_type text not null check (trade_type in ('donation_offset', 'pledge_swap')),
  matched_trade_lock_proposal_refs text[] not null default '{}',
  required_participant_count integer not null check (required_participant_count >= 2),
  required_final_confirmation_refs text[] not null default '{}',
  required_payment_authorization_refs text[] not null default '{}',
  commitment_reservation_refs text[] not null default '{}',
  atomic_settlement_policy_ref text not null,
  all_or_none_state text not null check (
    all_or_none_state in (
      'draft',
      'waiting_for_confirmations',
      'waiting_for_authorizations',
      'locked',
      'failed',
      'released',
      'cancelled',
      'superseded'
    )
  ),
  failed_member_behavior text not null check (
    failed_member_behavior in ('expire_group', 'recompute_group', 'manual_review')
  ),
  no_partial_capture_bool boolean not null default true,
  no_partial_disclosure_bool boolean not null default true,
  no_irreversible_performance_before_lock_bool boolean not null default true,
  reviewer_decision_ref text,
  reviewed_by uuid references public.profiles (id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  check (cardinality(matched_trade_lock_proposal_refs) > 0),
  check (cardinality(required_final_confirmation_refs) >= required_participant_count),
  check (cardinality(commitment_reservation_refs) > 0),
  check (failed_member_behavior <> 'manual_review'),
  check (no_partial_capture_bool = true),
  check (no_partial_disclosure_bool = true),
  check (no_irreversible_performance_before_lock_bool = true)
);

comment on table public.moral_trade_atomic_settlement_groups is
  'Atomic all-or-none settlement groups for non-public-goods donation offsets and pledge swaps. Groups bind lock proposals, final confirmations, payment authorizations, and commitment reservations while prohibiting partial capture, partial disclosure, and irreversible performance before lock.';

create index if not exists moral_trade_atomic_settlement_groups_state_idx
  on public.moral_trade_atomic_settlement_groups (trade_type, all_or_none_state, created_at desc);

alter table public.moral_trade_atomic_settlement_groups enable row level security;

create table if not exists public.moral_trade_commitment_settlement_enforcement_records (
  id uuid primary key default gen_random_uuid(),
  owner_profile_id uuid not null references public.profiles (id) on delete cascade,
  transition text not null check (
    transition in (
      'draft_preview',
      'match_candidate_preview',
      'matched_trade_lock',
      'payment_authorization',
      'payment_capture',
      'performance_release',
      'public_metric_publication',
      'release_gate_promotion'
    )
  ),
  enforcement_status text not null check (enforcement_status in ('pass', 'blocked')),
  commitment_settlement_required_bool boolean not null default false,
  reviewed_record_count integer not null default 0 check (reviewed_record_count >= 0),
  non_blocking_record_count integer not null default 0 check (non_blocking_record_count >= 0),
  reserved_commitment_count integer not null default 0 check (reserved_commitment_count >= 0),
  atomic_settlement_group_count integer not null default 0 check (atomic_settlement_group_count >= 0),
  record_count integer not null default 0 check (record_count >= 0),
  enforcement_input_json jsonb not null,
  evaluation_result_json jsonb not null,
  blocker_codes text[] not null default '{}',
  user_facing_blocker_categories text[] not null default '{}',
  contract_version text not null,
  validator_version text not null,
  evaluation_hash text not null check (evaluation_hash ~ '^sha256:[a-f0-9]{64}$'),
  idempotency_key text not null,
  runtime_transition_allowed_bool boolean not null default false,
  match_candidate_preview_allowed_bool boolean not null default false,
  matched_trade_lock_allowed_bool boolean not null default false,
  payment_authorization_allowed_bool boolean not null default false,
  payment_capture_allowed_bool boolean not null default false,
  performance_release_allowed_bool boolean not null default false,
  public_metric_publication_allowed_bool boolean not null default false,
  release_gate_promotion_allowed_bool boolean not null default false,
  superseded_by uuid references public.moral_trade_commitment_settlement_enforcement_records (id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  check (non_blocking_record_count <= record_count),
  check (runtime_transition_allowed_bool = false),
  check (match_candidate_preview_allowed_bool = false),
  check (matched_trade_lock_allowed_bool = false),
  check (payment_authorization_allowed_bool = false),
  check (payment_capture_allowed_bool = false),
  check (performance_release_allowed_bool = false),
  check (public_metric_publication_allowed_bool = false),
  check (release_gate_promotion_allowed_bool = false),
  unique (owner_profile_id, idempotency_key)
);

comment on table public.moral_trade_commitment_settlement_enforcement_records is
  'Append-only user-owned commitment-settlement enforcement records. A record stores normalized commitment inventory, reservation, and atomic settlement input, deterministic evaluation result, blockers, and evaluation hash while enforcing that enforcement records cannot authorize runtime transitions, match preview, matched-trade lock, payment authorization, payment capture, performance release, public metric publication, or release-gate promotion.';

create index if not exists moral_trade_commitment_settlement_enforcement_records_owner_status_idx
  on public.moral_trade_commitment_settlement_enforcement_records (owner_profile_id, enforcement_status, created_at desc);

create index if not exists moral_trade_commitment_settlement_enforcement_records_transition_status_idx
  on public.moral_trade_commitment_settlement_enforcement_records (transition, enforcement_status, created_at desc);

create index if not exists moral_trade_commitment_settlement_enforcement_records_hash_idx
  on public.moral_trade_commitment_settlement_enforcement_records (evaluation_hash, created_at desc);

alter table public.moral_trade_commitment_settlement_enforcement_records enable row level security;

drop policy if exists "moral_trade_commitment_settlement_enforcement_records_select_owner"
  on public.moral_trade_commitment_settlement_enforcement_records;
create policy "moral_trade_commitment_settlement_enforcement_records_select_owner"
  on public.moral_trade_commitment_settlement_enforcement_records
  for select
  to authenticated
  using (owner_profile_id = auth.uid());

drop policy if exists "moral_trade_commitment_settlement_enforcement_records_insert_owner"
  on public.moral_trade_commitment_settlement_enforcement_records;
create policy "moral_trade_commitment_settlement_enforcement_records_insert_owner"
  on public.moral_trade_commitment_settlement_enforcement_records
  for insert
  to authenticated
  with check (
    owner_profile_id = auth.uid()
    and runtime_transition_allowed_bool = false
    and match_candidate_preview_allowed_bool = false
    and matched_trade_lock_allowed_bool = false
    and payment_authorization_allowed_bool = false
    and payment_capture_allowed_bool = false
    and performance_release_allowed_bool = false
    and public_metric_publication_allowed_bool = false
    and release_gate_promotion_allowed_bool = false
  );
