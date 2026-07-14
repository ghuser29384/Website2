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
      'intrapersonal_self_offset'
    )
  );

create table if not exists public.moral_trade_option_set_comparison_records (
  id uuid primary key default gen_random_uuid(),
  policy_snapshot_id uuid not null references public.moral_trade_policy_snapshots (id) on delete restrict,
  subject_type text not null check (
    subject_type in (
      'offset_offer',
      'pledge_swap_offer',
      'matched_trade_lock_proposal',
      'cleared_trade_agreement'
    )
  ),
  subject_id text not null,
  participant_ids_hash text not null check (participant_ids_hash ~ '^sha256:[a-f0-9]{64}$'),
  no_trade_option_hash text not null check (no_trade_option_hash ~ '^sha256:[a-f0-9]{64}$'),
  proposed_trade_option_hash text not null check (proposed_trade_option_hash ~ '^sha256:[a-f0-9]{64}$'),
  alternative_option_hashes_json jsonb not null default '[]'::jsonb,
  option_generation_policy_ref text not null,
  participant_option_judgments_json jsonb not null default '{}'::jsonb,
  preference_comparability_policy_ref text not null,
  participant_option_comparability_json jsonb not null default '{}'::jsonb,
  dominance_applicability_state text not null check (
    dominance_applicability_state in (
      'applicable',
      'not_applicable_incomparable',
      'not_applicable_lexical_block',
      'insufficient_information',
      'manual_review',
      'superseded'
    )
  ),
  cardinal_score_required_bool boolean not null default false,
  cardinal_score_prohibited_bool boolean not null default true,
  incomparability_review_state text not null check (
    incomparability_review_state in (
      'not_required',
      'under_review',
      'non_blocking',
      'blocked',
      'manual_review',
      'superseded'
    )
  ),
  pareto_dominance_review_state text not null check (
    pareto_dominance_review_state in (
      'not_required',
      'under_review',
      'no_known_dominating_option',
      'dominated_option_blocking',
      'alternative_unavailable',
      'incomparable_or_noncardinal_manual_review',
      'manual_review',
      'superseded'
    )
  ),
  unavailable_alternative_reason_codes_json jsonb not null default '[]'::jsonb,
  privacy_redaction_policy_ref text not null,
  reviewer_decision_ref text,
  reviewed_by uuid references public.profiles (id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  check (
    jsonb_typeof(alternative_option_hashes_json) = 'array'
    and jsonb_typeof(participant_option_judgments_json) = 'object'
    and jsonb_typeof(participant_option_comparability_json) = 'object'
    and jsonb_typeof(unavailable_alternative_reason_codes_json) = 'array'
  ),
  check (cardinal_score_required_bool = false),
  check (cardinal_score_prohibited_bool = true),
  check (
    pareto_dominance_review_state <> 'no_known_dominating_option'
    or dominance_applicability_state = 'applicable'
  )
);

comment on table public.moral_trade_option_set_comparison_records is
  'First-class option-set comparison records for non-public-goods moral trade. Records bind no-trade, proposed-trade, and alternative option snapshots while prohibiting cardinal scores and platform-authored public moral rankings.';

create index if not exists moral_trade_option_set_comparison_subject_idx
  on public.moral_trade_option_set_comparison_records (subject_type, subject_id, pareto_dominance_review_state);

alter table public.moral_trade_option_set_comparison_records enable row level security;

create table if not exists public.moral_trade_preference_comparability_records (
  id uuid primary key default gen_random_uuid(),
  policy_snapshot_id uuid not null references public.moral_trade_policy_snapshots (id) on delete restrict,
  subject_type text not null check (
    subject_type in (
      'offset_offer',
      'pledge_swap_offer',
      'matched_trade_lock_proposal',
      'cleared_trade_agreement',
      'compensated_action_terms'
    )
  ),
  subject_id text not null,
  participant_ids_hash text not null check (participant_ids_hash ~ '^sha256:[a-f0-9]{64}$'),
  preference_comparability_policy_ref text not null,
  participant_option_comparability_state text not null check (
    participant_option_comparability_state in (
      'comparable_without_cardinal_score',
      'incomparable_noncardinal',
      'lexical_or_side_constraint_bound',
      'requires_cardinal_score_blocked',
      'unknown',
      'under_review',
      'manual_review',
      'superseded'
    )
  ),
  cardinal_score_prohibited_bool boolean not null default true,
  public_cardinal_score_exposed_bool boolean not null default false,
  public_ranking_exposed_bool boolean not null default false,
  public_exchange_rate_exposed_bool boolean not null default false,
  reviewer_decision_ref text,
  reviewed_by uuid references public.profiles (id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  check (cardinal_score_prohibited_bool = true),
  check (public_cardinal_score_exposed_bool = false),
  check (public_ranking_exposed_bool = false),
  check (public_exchange_rate_exposed_bool = false)
);

comment on table public.moral_trade_preference_comparability_records is
  'Non-cardinal preference comparability records. These records let MoralTrade check incomparability, lexical blocks, and participant-specific option comparability without publishing exact willingness-to-trade scores, exchange rates, or public moral rankings.';

create index if not exists moral_trade_preference_comparability_subject_idx
  on public.moral_trade_preference_comparability_records (subject_type, subject_id, participant_option_comparability_state);

alter table public.moral_trade_preference_comparability_records enable row level security;

create table if not exists public.moral_trade_trade_burden_accounting_records (
  id uuid primary key default gen_random_uuid(),
  policy_snapshot_id uuid not null references public.moral_trade_policy_snapshots (id) on delete restrict,
  subject_type text not null check (
    subject_type in (
      'offset_offer',
      'pledge_swap_offer',
      'matched_trade_lock_proposal',
      'cleared_trade_agreement',
      'participant_confirmation_record'
    )
  ),
  subject_id text not null,
  participant_id_hash text not null check (participant_id_hash ~ '^sha256:[a-f0-9]{64}$'),
  trade_burden_policy_ref text not null,
  monetary_burden_cents integer not null default 0 check (monetary_burden_cents >= 0),
  platform_fee_burden_cents integer not null default 0 check (platform_fee_burden_cents >= 0),
  estimated_time_burden_minutes_bucket text not null,
  evidence_burden_level text not null check (
    evidence_burden_level in ('none', 'low', 'medium', 'high', 'invasive_blocked', 'manual_review')
  ),
  privacy_disclosure_burden_level text not null check (
    privacy_disclosure_burden_level in ('none', 'low', 'medium', 'high', 'manual_review')
  ),
  attention_or_coordination_burden_level text not null check (
    attention_or_coordination_burden_level in ('low', 'medium', 'high', 'manual_review')
  ),
  challenge_or_dispute_burden_level text not null check (
    challenge_or_dispute_burden_level in ('none', 'low', 'medium', 'high', 'manual_review')
  ),
  residual_obligation_summary_hash text not null check (residual_obligation_summary_hash ~ '^sha256:[a-f0-9]{64}$'),
  burden_disclosure_record_ref text not null,
  burden_net_surplus_confirmation_state text not null check (
    burden_net_surplus_confirmation_state in (
      'not_required',
      'requested',
      'confirmed',
      'declined',
      'stale',
      'manual_review',
      'superseded'
    )
  ),
  reviewer_decision_ref text,
  reviewed_by uuid references public.profiles (id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

comment on table public.moral_trade_trade_burden_accounting_records is
  'Participant trade-burden accounting records for money, platform fees, time, evidence, privacy disclosure, attention, coordination, disputes, and residual obligations before non-public-goods trades can lock, charge, count, or release-promote.';

create index if not exists moral_trade_trade_burden_accounting_subject_idx
  on public.moral_trade_trade_burden_accounting_records (subject_type, subject_id, burden_net_surplus_confirmation_state);

alter table public.moral_trade_trade_burden_accounting_records enable row level security;

create table if not exists public.moral_trade_moral_difference_attestation_records (
  id uuid primary key default gen_random_uuid(),
  policy_snapshot_id uuid not null references public.moral_trade_policy_snapshots (id) on delete restrict,
  subject_type text not null check (
    subject_type in (
      'offset_offer',
      'pledge_swap_offer',
      'matched_trade_lock_proposal',
      'cleared_trade_agreement',
      'compensated_action_terms',
      'intrapersonal_self_offset_record'
    )
  ),
  subject_id text not null,
  participant_id_hash text not null check (participant_id_hash ~ '^sha256:[a-f0-9]{64}$'),
  moral_difference_policy_ref text not null,
  asserted_trade_basis text not null check (
    asserted_trade_basis in (
      'moral_view_difference',
      'moral_priority_difference',
      'indexical_obligation_difference',
      'empirical_belief_difference',
      'moral_prudential_asymmetry',
      'ordinary_trade_or_donation',
      'self_offset_only',
      'unclear',
      'manual_review'
    )
  ),
  coarse_moral_reason_codes_json jsonb not null default '[]'::jsonb,
  disclosure_level text not null check (
    disclosure_level in ('reviewer_only', 'counterparty_coarse', 'public_aggregate_only', 'manual_review')
  ),
  full_theory_required_bool boolean not null default false,
  ideology_inference_prohibited_bool boolean not null default true,
  classification_support_state text not null check (
    classification_support_state in (
      'not_required',
      'supports_moral_trade_classification',
      'ordinary_trade_blocking',
      'self_offset_blocking',
      'under_review',
      'manual_review',
      'superseded'
    )
  ),
  inconsistency_or_bad_faith_signal_state text not null check (
    inconsistency_or_bad_faith_signal_state in ('none', 'possible', 'under_review', 'blocking', 'manual_review')
  ),
  reviewer_decision_ref text,
  reviewed_by uuid references public.profiles (id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  check (jsonb_typeof(coarse_moral_reason_codes_json) = 'array'),
  check (full_theory_required_bool = false),
  check (ideology_inference_prohibited_bool = true)
);

comment on table public.moral_trade_moral_difference_attestation_records is
  'Moral-difference attestation records. These records establish whether an interaction is based on moral view, moral priority, indexical obligation, empirical belief, or moral/prudential asymmetry while blocking ordinary trade, self-offset-only, unclear, or bad-faith classifications.';

create index if not exists moral_trade_moral_difference_attestation_subject_idx
  on public.moral_trade_moral_difference_attestation_records (subject_type, subject_id, classification_support_state);

alter table public.moral_trade_moral_difference_attestation_records enable row level security;

create table if not exists public.moral_trade_bargaining_protocols (
  id uuid primary key default gen_random_uuid(),
  policy_snapshot_id uuid not null references public.moral_trade_policy_snapshots (id) on delete restrict,
  policy_version text not null,
  applies_to text not null check (
    applies_to in ('donation_offset', 'pledge_swap', 'compensated_moral_action', 'manual_review')
  ),
  protocol_type text not null check (
    protocol_type in ('posted_template', 'sealed_cap_batch_clearing', 'one_shot_counteroffer', 'neutral_mediator', 'manual_review')
  ),
  private_cap_disclosure_behavior text not null check (
    private_cap_disclosure_behavior in ('never_to_counterparty', 'reviewer_only', 'aggregate_band_only', 'manual_review')
  ),
  dynamic_pricing_allowed_bool boolean not null default false,
  counteroffer_limit integer not null default 0 check (counteroffer_limit >= 0),
  anti_holdup_cooldown_hours integer not null default 24 check (anti_holdup_cooldown_hours >= 1),
  artificial_urgency_prohibited_bool boolean not null default true,
  rejection_nonretaliation_required_bool boolean not null default true,
  renewed_confirmation_required_for_counteroffer_bool boolean not null default true,
  reviewer_decision_ref text,
  reviewed_by uuid references public.profiles (id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  check (dynamic_pricing_allowed_bool = false),
  check (artificial_urgency_prohibited_bool = true),
  check (rejection_nonretaliation_required_bool = true),
  check (renewed_confirmation_required_for_counteroffer_bool = true)
);

comment on table public.moral_trade_bargaining_protocols is
  'Anti-holdup bargaining protocols for donation offsets, pledge swaps, and compensated moral actions. Protocols restrict private cap disclosure, dynamic pricing, artificial urgency, retaliation, and unconfirmed counteroffers.';

create index if not exists moral_trade_bargaining_protocols_policy_idx
  on public.moral_trade_bargaining_protocols (policy_snapshot_id, applies_to, protocol_type);

alter table public.moral_trade_bargaining_protocols enable row level security;

create table if not exists public.moral_trade_bargaining_round_records (
  id uuid primary key default gen_random_uuid(),
  bargaining_protocol_id uuid not null references public.moral_trade_bargaining_protocols (id) on delete restrict,
  subject_type text not null check (
    subject_type in (
      'offset_offer',
      'pledge_swap_offer',
      'matched_trade_lock_proposal',
      'cleared_trade_agreement'
    )
  ),
  subject_id text not null,
  round_index integer not null check (round_index >= 0),
  proposed_by_hash text not null check (proposed_by_hash ~ '^sha256:[a-f0-9]{64}$'),
  terms_snapshot_hash text not null check (terms_snapshot_hash ~ '^sha256:[a-f0-9]{64}$'),
  changed_terms_json jsonb not null default '{}'::jsonb,
  private_cap_disclosure_state text not null check (
    private_cap_disclosure_state in ('none', 'reviewer_only', 'aggregate_band', 'blocked', 'manual_review')
  ),
  holdup_or_pressure_review_state text not null check (
    holdup_or_pressure_review_state in ('not_required', 'under_review', 'non_blocking', 'blocked', 'manual_review', 'superseded')
  ),
  participant_confirmation_record_refs text[] not null default '{}',
  counteroffer_state text not null check (
    counteroffer_state in ('draft', 'presented', 'accepted', 'rejected', 'expired', 'withdrawn', 'superseded')
  ),
  reviewer_decision_ref text,
  reviewed_by uuid references public.profiles (id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  check (jsonb_typeof(changed_terms_json) = 'object'),
  check (
    private_cap_disclosure_state not in ('blocked', 'manual_review')
    and holdup_or_pressure_review_state not in ('under_review', 'blocked', 'manual_review', 'superseded')
  )
);

comment on table public.moral_trade_bargaining_round_records is
  'Per-round bargaining records tied to anti-holdup bargaining protocols. Records capture changed terms, private cap disclosure state, pressure review, confirmation refs, and counteroffer status before reliance or payment transitions.';

create index if not exists moral_trade_bargaining_round_records_subject_idx
  on public.moral_trade_bargaining_round_records (subject_type, subject_id, round_index);

alter table public.moral_trade_bargaining_round_records enable row level security;

create table if not exists public.moral_trade_empirical_assumption_snapshots (
  id uuid primary key default gen_random_uuid(),
  policy_snapshot_id uuid not null references public.moral_trade_policy_snapshots (id) on delete restrict,
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
  participant_id_hash text not null check (participant_id_hash ~ '^sha256:[a-f0-9]{64}$'),
  assumption_type text not null check (
    assumption_type in (
      'relative_charity_effectiveness',
      'action_efficacy',
      'baseline_likelihood',
      'substitution_likelihood',
      'performance_likelihood',
      'causal_route',
      'empirical_belief_difference',
      'other'
    )
  ),
  assumption_summary_hash text not null check (assumption_summary_hash ~ '^sha256:[a-f0-9]{64}$'),
  confidence_level text not null check (confidence_level in ('low', 'medium', 'high')),
  evidence_refs_json jsonb not null default '[]'::jsonb,
  material_to_surplus_confirmation_bool boolean not null default false,
  stale_if_challenged_bool boolean not null default true,
  challenge_state text not null check (challenge_state in ('not_applicable', 'open', 'closed', 'superseded')),
  assumption_review_state text not null check (
    assumption_review_state in ('not_required', 'under_review', 'non_blocking', 'blocked', 'manual_review', 'superseded')
  ),
  reviewer_decision_ref text,
  reviewed_by uuid references public.profiles (id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  check (jsonb_typeof(evidence_refs_json) = 'array'),
  check (
    challenge_state <> 'open'
    or stale_if_challenged_bool = false
  )
);

comment on table public.moral_trade_empirical_assumption_snapshots is
  'Immutable empirical assumption snapshots for material surplus and moral-trade classification assumptions. Open stale challenges, superseded challenges, missing evidence, or blocking reviews prevent reliance, payment, public metrics, and release promotion.';

create index if not exists moral_trade_empirical_assumption_snapshots_subject_idx
  on public.moral_trade_empirical_assumption_snapshots (subject_type, subject_id, assumption_review_state, challenge_state);

alter table public.moral_trade_empirical_assumption_snapshots enable row level security;

create table if not exists public.moral_trade_moral_side_constraint_profiles (
  id uuid primary key default gen_random_uuid(),
  policy_snapshot_id uuid not null references public.moral_trade_policy_snapshots (id) on delete restrict,
  participant_id_hash text not null check (participant_id_hash ~ '^sha256:[a-f0-9]{64}$'),
  subject_type text not null check (
    subject_type in (
      'offset_offer',
      'pledge_swap_offer',
      'matched_trade_lock_proposal',
      'cleared_trade_agreement',
      'compensated_action_terms',
      'negative_commitment_scope'
    )
  ),
  subject_id text not null,
  side_constraint_policy_ref text not null,
  side_constraint_context text not null check (
    side_constraint_context in (
      'none_disclosed',
      'impermissible_action',
      'nondelegable_duty',
      'agent_relative_limit',
      'intention_sensitive_act',
      'personal_integrity_limit',
      'sacred_value_or_taboo',
      'other',
      'unknown'
    )
  ),
  blocked_action_or_term_hash text check (
    blocked_action_or_term_hash is null
    or blocked_action_or_term_hash ~ '^sha256:[a-f0-9]{64}$'
  ),
  waiver_allowed_bool boolean not null default false,
  waiver_confirmation_required_bool boolean not null default false,
  cooling_off_required_bool boolean not null default true,
  side_constraint_review_state text not null check (
    side_constraint_review_state in ('not_required', 'under_review', 'non_blocking', 'blocked', 'manual_review', 'superseded')
  ),
  reviewer_decision_ref text,
  reviewed_by uuid references public.profiles (id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  check (
    side_constraint_context not in ('impermissible_action', 'nondelegable_duty')
    or side_constraint_review_state = 'blocked'
  ),
  check (
    side_constraint_context not in (
      'agent_relative_limit',
      'intention_sensitive_act',
      'personal_integrity_limit',
      'sacred_value_or_taboo'
    )
    or waiver_allowed_bool = false
  )
);

comment on table public.moral_trade_moral_side_constraint_profiles is
  'Participant moral side-constraint profiles for non-public-goods trades. Profiles protect impermissible actions, nondelegable duties, agent-relative limits, intention-sensitive acts, personal integrity limits, and sacred values from waiver-based bypass.';

create index if not exists moral_trade_moral_side_constraint_profiles_subject_idx
  on public.moral_trade_moral_side_constraint_profiles (subject_type, subject_id, side_constraint_context, side_constraint_review_state);

alter table public.moral_trade_moral_side_constraint_profiles enable row level security;

create table if not exists public.moral_trade_intrapersonal_self_offset_records (
  id uuid primary key default gen_random_uuid(),
  policy_snapshot_id uuid not null references public.moral_trade_policy_snapshots (id) on delete restrict,
  subject_type text not null check (
    subject_type in (
      'offset_offer',
      'pledge_swap_offer',
      'cleared_trade_agreement',
      'evidence_record'
    )
  ),
  subject_id text not null,
  participant_id_hash text not null check (participant_id_hash ~ '^sha256:[a-f0-9]{64}$'),
  self_offset_type text not null check (
    self_offset_type in (
      'personal_offset',
      'personal_bookkeeping',
      'internal_moral_trade_like_planning',
      'ordinary_donation',
      'manual_review'
    )
  ),
  external_counterparty_present_bool boolean not null default false,
  represented_moral_perspective_hash text not null check (represented_moral_perspective_hash ~ '^sha256:[a-f0-9]{64}$'),
  classification_state text not null check (
    classification_state in (
      'self_offset_only',
      'ordinary_donation_or_matching',
      'eligible_interpersonal_moral_trade',
      'manual_review',
      'superseded'
    )
  ),
  excluded_from_moral_trade_metrics_bool boolean not null default true,
  reviewer_decision_ref text,
  reviewed_by uuid references public.profiles (id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  check (
    classification_state <> 'eligible_interpersonal_moral_trade'
    or external_counterparty_present_bool = true
  ),
  check (
    classification_state = 'eligible_interpersonal_moral_trade'
    or excluded_from_moral_trade_metrics_bool = true
  )
);

comment on table public.moral_trade_intrapersonal_self_offset_records is
  'Intrapersonal self-offset classification records. Personal offsets, personal bookkeeping, ordinary donations, and internal moral-trade-like planning are excluded from public moral-trade metrics unless classified as eligible interpersonal moral trade with an external counterparty.';

create index if not exists moral_trade_intrapersonal_self_offset_records_subject_idx
  on public.moral_trade_intrapersonal_self_offset_records (subject_type, subject_id, classification_state);

alter table public.moral_trade_intrapersonal_self_offset_records enable row level security;

create table if not exists public.moral_trade_preference_integrity_enforcement_records (
  id uuid primary key default gen_random_uuid(),
  owner_profile_id uuid not null references public.profiles (id) on delete cascade,
  transition text not null check (
    transition in (
      'draft_preview',
      'match_candidate_preview',
      'matched_trade_lock',
      'payment_authorization',
      'payment_capture',
      'reliance_bearing_transition',
      'public_metric_publication',
      'release_gate_promotion'
    )
  ),
  enforcement_status text not null check (enforcement_status in ('pass', 'blocked')),
  integrity_required_bool boolean not null default false,
  reviewed_record_count integer not null default 0 check (reviewed_record_count >= 0),
  non_blocking_record_count integer not null default 0 check (non_blocking_record_count >= 0),
  public_metric_self_offset_block_count integer not null default 0 check (public_metric_self_offset_block_count >= 0),
  public_preference_exposure_block_count integer not null default 0 check (public_preference_exposure_block_count >= 0),
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
  public_metric_publication_allowed_bool boolean not null default false,
  release_gate_promotion_allowed_bool boolean not null default false,
  superseded_by uuid references public.moral_trade_preference_integrity_enforcement_records (id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  check (non_blocking_record_count <= record_count),
  check (runtime_transition_allowed_bool = false),
  check (match_candidate_preview_allowed_bool = false),
  check (matched_trade_lock_allowed_bool = false),
  check (payment_authorization_allowed_bool = false),
  check (payment_capture_allowed_bool = false),
  check (public_metric_publication_allowed_bool = false),
  check (release_gate_promotion_allowed_bool = false),
  unique (owner_profile_id, idempotency_key)
);

comment on table public.moral_trade_preference_integrity_enforcement_records is
  'Append-only user-owned preference-integrity enforcement records. A record stores normalized option-set, non-cardinal comparability, trade-burden, moral-difference, bargaining, empirical-assumption, side-constraint, and self-offset inputs, deterministic evaluation result, blockers, and evaluation hash while enforcing that enforcement records cannot authorize runtime transitions, match preview, matched-trade lock, payment authorization, payment capture, public metric publication, or release-gate promotion.';

create index if not exists moral_trade_preference_integrity_enforcement_records_owner_status_idx
  on public.moral_trade_preference_integrity_enforcement_records (owner_profile_id, enforcement_status, created_at desc);

create index if not exists moral_trade_preference_integrity_enforcement_records_transition_status_idx
  on public.moral_trade_preference_integrity_enforcement_records (transition, enforcement_status, created_at desc);

create index if not exists moral_trade_preference_integrity_enforcement_records_hash_idx
  on public.moral_trade_preference_integrity_enforcement_records (evaluation_hash, created_at desc);

alter table public.moral_trade_preference_integrity_enforcement_records enable row level security;

drop policy if exists "moral_trade_preference_integrity_enforcement_records_select_owner"
  on public.moral_trade_preference_integrity_enforcement_records;
create policy "moral_trade_preference_integrity_enforcement_records_select_owner"
  on public.moral_trade_preference_integrity_enforcement_records
  for select
  to authenticated
  using (owner_profile_id = auth.uid());

drop policy if exists "moral_trade_preference_integrity_enforcement_records_insert_owner"
  on public.moral_trade_preference_integrity_enforcement_records;
create policy "moral_trade_preference_integrity_enforcement_records_insert_owner"
  on public.moral_trade_preference_integrity_enforcement_records
  for insert
  to authenticated
  with check (
    owner_profile_id = auth.uid()
    and runtime_transition_allowed_bool = false
    and match_candidate_preview_allowed_bool = false
    and matched_trade_lock_allowed_bool = false
    and payment_authorization_allowed_bool = false
    and payment_capture_allowed_bool = false
    and public_metric_publication_allowed_bool = false
    and release_gate_promotion_allowed_bool = false
  );
