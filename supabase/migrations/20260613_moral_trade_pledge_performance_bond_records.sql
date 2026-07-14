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
      'breach_remedy',
      'pledge_performance_bond'
    )
  );

create table if not exists public.moral_trade_pledge_performance_bond_policies (
  id uuid primary key default gen_random_uuid(),
  policy_snapshot_id uuid not null references public.moral_trade_policy_snapshots (id) on delete restrict,
  policy_version text not null,
  applies_to text not null check (
    applies_to in ('pledge_swap', 'compensated_moral_action', 'manual_review')
  ),
  allowed_release_stages text[] not null default '{}',
  max_bond_cents integer not null check (max_bond_cents > 0),
  min_bond_cents integer not null default 0 check (min_bond_cents >= 0),
  settlement_currency text not null,
  posting_mode text not null check (
    posting_mode in (
      'authorization_only',
      'captured_provider_hold',
      'external_proof_only',
      'manual_review'
    )
  ),
  return_condition_policy_ref text not null,
  forfeiture_condition_policy_ref text not null,
  forfeiture_destination_policy text not null check (
    forfeiture_destination_policy in (
      'return_to_poster',
      'neutral_public_good',
      'pre_agreed_non_counterparty_destination',
      'counterparty_only_if_approved',
      'manual_review'
    )
  ),
  counterparty_benefit_from_forfeiture_allowed_bool boolean not null default false,
  neutral_review_required_for_forfeiture_bool boolean not null default true,
  evidence_standard_ref text not null,
  challenge_window_policy_ref text not null,
  refund_policy_ref text not null,
  no_escrow_claim_disclaimer_required_bool boolean not null default true,
  high_stakes_or_irreversible_action_behavior text not null check (
    high_stakes_or_irreversible_action_behavior in (
      'block',
      'preview_only',
      'manual_review'
    )
  ),
  reviewer_decision_ref text not null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  check (min_bond_cents <= max_bond_cents),
  check (posting_mode <> 'manual_review'),
  check (forfeiture_destination_policy <> 'manual_review'),
  check (
    counterparty_benefit_from_forfeiture_allowed_bool = false
    or neutral_review_required_for_forfeiture_bool = true
  ),
  check (no_escrow_claim_disclaimer_required_bool = true),
  check (high_stakes_or_irreversible_action_behavior <> 'manual_review'),
  check (cardinality(allowed_release_stages) > 0)
);

create table if not exists public.moral_trade_pledge_performance_bond_records (
  id uuid primary key default gen_random_uuid(),
  policy_snapshot_id uuid not null references public.moral_trade_policy_snapshots (id) on delete restrict,
  pledge_performance_bond_policy_id uuid not null references public.moral_trade_pledge_performance_bond_policies (id) on delete restrict,
  pledge_performance_bond_policy_ref text not null,
  pledge_swap_offer_id text,
  matched_trade_lock_proposal_ref text,
  cleared_trade_agreement_ref text,
  participant_id_hash text not null check (participant_id_hash ~ '^sha256:[a-f0-9]{64}$'),
  bond_amount_cents integer not null check (bond_amount_cents > 0),
  settlement_currency text not null,
  payment_authorization_event_ref text,
  posting_mode text not null check (
    posting_mode in (
      'authorization_only',
      'captured_provider_hold',
      'external_proof_only'
    )
  ),
  bond_state text not null check (
    bond_state in (
      'draft',
      'previewed',
      'authorized',
      'posted',
      'return_pending',
      'returned',
      'forfeiture_review',
      'forfeited',
      'refunded',
      'cancelled',
      'disputed',
      'superseded'
    )
  ),
  return_condition_summary_hash text not null check (return_condition_summary_hash ~ '^sha256:[a-f0-9]{64}$'),
  forfeiture_condition_summary_hash text not null check (forfeiture_condition_summary_hash ~ '^sha256:[a-f0-9]{64}$'),
  forfeiture_destination_ref text not null,
  counterparty_benefit_from_forfeiture_state text not null check (
    counterparty_benefit_from_forfeiture_state in (
      'none',
      'possible',
      'direct',
      'indirect'
    )
  ),
  neutral_review_required_bool boolean not null default true,
  evidence_due_at timestamptz not null,
  evidence_record_refs text[] not null default '{}',
  challenge_window_policy_ref text not null,
  challenge_window_state text not null check (
    challenge_window_state in (
      'not_open',
      'open',
      'closed',
      'expired'
    )
  ),
  refund_policy_ref text not null,
  agreement_transferability_assessment_ref text,
  transferability_review_state text not null check (
    transferability_review_state in ('not_required', 'non_blocking')
  ),
  regulated_goods_hazardous_activity_assessment_ref text,
  regulated_goods_review_state text not null check (
    regulated_goods_review_state in ('not_required', 'non_blocking')
  ),
  hazardous_activity_review_state text not null check (
    hazardous_activity_review_state in ('not_required', 'non_blocking')
  ),
  cyber_abuse_digital_systems_integrity_assessment_ref text,
  cyber_abuse_review_state text not null check (
    cyber_abuse_review_state in ('not_required', 'non_blocking')
  ),
  digital_systems_integrity_review_state text not null check (
    digital_systems_integrity_review_state in ('not_required', 'non_blocking')
  ),
  reviewer_decision_ref text not null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  check (
    pledge_swap_offer_id is not null
    or matched_trade_lock_proposal_ref is not null
    or cleared_trade_agreement_ref is not null
  ),
  check (
    counterparty_benefit_from_forfeiture_state = 'none'
    or neutral_review_required_bool = true
  )
);

create table if not exists public.moral_trade_pledge_performance_bond_enforcement_records (
  id uuid primary key default gen_random_uuid(),
  owner_profile_id uuid not null references public.profiles (id) on delete cascade,
  transition text not null,
  enforcement_status text not null check (enforcement_status in ('pass', 'blocked')),
  performance_bond_required_bool boolean not null default false,
  policy_count integer not null default 0 check (policy_count >= 0),
  record_count integer not null default 0 check (record_count >= 0),
  non_blocking_record_count integer not null default 0 check (non_blocking_record_count >= 0),
  neutral_review_required_count integer not null default 0 check (neutral_review_required_count >= 0),
  counterparty_benefit_record_count integer not null default 0 check (counterparty_benefit_record_count >= 0),
  enforcement_input_json jsonb not null,
  evaluation_result_json jsonb not null,
  blocker_codes text[] not null default '{}',
  user_facing_blocker_categories text[] not null default '{}',
  contract_version text not null,
  validator_version text not null,
  evaluation_hash text not null check (evaluation_hash ~ '^sha256:[a-f0-9]{64}$'),
  idempotency_key text not null,
  runtime_transition_allowed_bool boolean not null default false,
  matched_trade_lock_allowed_bool boolean not null default false,
  payment_authorization_allowed_bool boolean not null default false,
  payment_capture_allowed_bool boolean not null default false,
  performance_release_allowed_bool boolean not null default false,
  forfeiture_decision_allowed_bool boolean not null default false,
  public_metric_publication_allowed_bool boolean not null default false,
  release_gate_promotion_allowed_bool boolean not null default false,
  superseded_by uuid references public.moral_trade_pledge_performance_bond_enforcement_records (id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  check (non_blocking_record_count <= record_count),
  check (runtime_transition_allowed_bool = false),
  check (matched_trade_lock_allowed_bool = false),
  check (payment_authorization_allowed_bool = false),
  check (payment_capture_allowed_bool = false),
  check (performance_release_allowed_bool = false),
  check (forfeiture_decision_allowed_bool = false),
  check (public_metric_publication_allowed_bool = false),
  check (release_gate_promotion_allowed_bool = false),
  unique (owner_profile_id, idempotency_key)
);

comment on table public.moral_trade_pledge_performance_bond_policies is
  'Frozen pledge-performance-bond policies for optional factual-trust support. Policies freeze amount bounds, posting mode, return and forfeiture terms, destination policy, challenge window, refund policy, no-escrow disclaimer, high-stakes handling, and neutral-review requirements.';

comment on table public.moral_trade_pledge_performance_bond_records is
  'First-class pledge-performance-bond records for pledge swaps and compensated moral actions. Records freeze poster, amount, posting mode, return condition, forfeiture condition, destination, challenge window, protective reviews, evidence schedule, and neutral-review requirement.';

comment on table public.moral_trade_pledge_performance_bond_enforcement_records is
  'Append-only owner-scoped pledge-performance-bond enforcement records. Enforcement rows log deterministic evaluation results while enforcing that this endpoint cannot authorize runtime transitions, locks, payment authorization, payment capture, performance release, forfeiture, public metrics, or release-gate promotion.';

alter table public.moral_trade_pledge_performance_bond_enforcement_records enable row level security;

drop policy if exists "moral_trade_pledge_performance_bond_enforcement_records_select_owner"
  on public.moral_trade_pledge_performance_bond_enforcement_records;
create policy "moral_trade_pledge_performance_bond_enforcement_records_select_owner"
  on public.moral_trade_pledge_performance_bond_enforcement_records
  for select
  to authenticated
  using (owner_profile_id = auth.uid());

drop policy if exists "moral_trade_pledge_performance_bond_enforcement_records_insert_owner"
  on public.moral_trade_pledge_performance_bond_enforcement_records;
create policy "moral_trade_pledge_performance_bond_enforcement_records_insert_owner"
  on public.moral_trade_pledge_performance_bond_enforcement_records
  for insert
  to authenticated
  with check (
    owner_profile_id = auth.uid()
    and runtime_transition_allowed_bool = false
    and matched_trade_lock_allowed_bool = false
    and payment_authorization_allowed_bool = false
    and payment_capture_allowed_bool = false
    and performance_release_allowed_bool = false
    and forfeiture_decision_allowed_bool = false
    and public_metric_publication_allowed_bool = false
    and release_gate_promotion_allowed_bool = false
  );
