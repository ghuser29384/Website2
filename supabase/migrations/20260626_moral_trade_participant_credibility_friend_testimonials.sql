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
      'pledge_performance_bond',
      'pledge_swap_performance',
      'participant_credibility',
      'friend_testimonial',
      'testimonial_stake'
    )
  );

create table if not exists public.moral_trade_credibility_scoring_policies (
  id uuid primary key default gen_random_uuid(),
  policy_version text not null unique,
  canonical_json jsonb not null,
  policy_hash text not null unique check (policy_hash ~ '^sha256:[a-f0-9]{64}$'),
  status text not null check (status in ('draft', 'active', 'superseded')),
  max_single_testimonial_evidence_quality_delta_decimal numeric(6,5) not null check (max_single_testimonial_evidence_quality_delta_decimal between 0 and 1),
  max_single_testimonial_additionality_delta_decimal numeric(6,5) not null check (max_single_testimonial_additionality_delta_decimal between 0 and 1),
  max_single_testimonial_verification_confidence_delta_decimal numeric(6,5) not null check (max_single_testimonial_verification_confidence_delta_decimal between 0 and 1),
  max_single_testimonial_credibility_delta_decimal numeric(6,5) not null check (max_single_testimonial_credibility_delta_decimal between 0 and 1),
  high_stakes_standalone_testimonial_verification_allowed_bool boolean not null default false,
  privacy_invasive_evidence_overreward_cap_decimal numeric(6,5) not null default 0.04 check (privacy_invasive_evidence_overreward_cap_decimal between 0 and 1),
  created_at timestamptz not null default timezone('utc', now()),
  activated_at timestamptz,
  check (high_stakes_standalone_testimonial_verification_allowed_bool = false)
);

create table if not exists public.moral_trade_testimonial_stake_policies (
  id uuid primary key default gen_random_uuid(),
  policy_version text not null unique,
  canonical_json jsonb not null,
  policy_hash text not null unique check (policy_hash ~ '^sha256:[a-f0-9]{64}$'),
  status text not null check (status in ('draft', 'active', 'superseded')),
  default_stake_required_bool boolean not null default false,
  optional_stake_enabled_bool boolean not null default false,
  minimum_stake_minor integer,
  maximum_stake_minor integer,
  percentage_of_consideration_decimal numeric(6,5),
  destination_policy text not null check (
    destination_policy in ('same_charity', 'neutral_approved_charity', 'random_same_cause_charity', 'no_stake')
  ),
  refund_or_forfeit_policy text,
  legal_compliance_review_ref text,
  created_at timestamptz not null default timezone('utc', now()),
  activated_at timestamptz,
  check (default_stake_required_bool = false),
  check (
    optional_stake_enabled_bool = false
    or (
      minimum_stake_minor is not null
      and maximum_stake_minor is not null
      and percentage_of_consideration_decimal is not null
      and legal_compliance_review_ref is not null
      and minimum_stake_minor >= 0
      and maximum_stake_minor >= minimum_stake_minor
      and percentage_of_consideration_decimal between 0 and 0.02
      and maximum_stake_minor <= 1000
    )
  )
);

create table if not exists public.moral_trade_participant_credibility_profiles (
  participant_user_id uuid primary key references public.profiles (id) on delete cascade,
  credibility_score_decimal numeric(6,5) not null default 0.5 check (credibility_score_decimal between 0 and 1),
  credibility_tier text not null default 'new' check (credibility_tier in ('new', 'limited', 'standard', 'high', 'under_review')),
  expected_completion_probability_decimal numeric(6,5) not null default 0.5 check (expected_completion_probability_decimal between 0 and 1),
  evidence_reliability_decimal numeric(6,5) not null default 0.5 check (evidence_reliability_decimal between 0 and 1),
  fraud_risk_decimal numeric(6,5) not null default 0.1 check (fraud_risk_decimal between 0 and 1),
  future_verification_burden text not null default 'standard' check (future_verification_burden in ('light', 'standard', 'heightened', 'manual_review')),
  last_credibility_event_id uuid,
  appeal_status text not null default 'none' check (appeal_status in ('none', 'appeal_available', 'appealed', 'appeal_resolved', 'appeal_expired')),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.moral_trade_friend_testimonial_invites (
  id uuid primary key default gen_random_uuid(),
  pledge_swap_id text,
  purchase_envelope_type text,
  purchase_envelope_id text,
  participant_action_commitment_id text,
  participant_user_id uuid not null references public.profiles (id) on delete cascade,
  invited_friend_user_id uuid references public.profiles (id) on delete set null,
  invited_friend_email_hash text,
  invite_token_hash text not null unique check (invite_token_hash ~ '^sha256:[a-f0-9]{64}$'),
  invite_status text not null check (invite_status in ('pending', 'accepted', 'declined', 'expired', 'revoked', 'blocked', 'reported')),
  relationship_claimed_by_participant text check (
    relationship_claimed_by_participant in ('friend', 'family', 'roommate', 'romantic_partner', 'classmate', 'coworker', 'other')
  ),
  minimum_necessary_disclosure_json jsonb not null,
  hidden_from_invite text[] not null default '{}',
  expires_at timestamptz not null,
  revoked_at timestamptz,
  abuse_report_count integer not null default 0 check (abuse_report_count >= 0),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  check (invited_friend_user_id is not null or invited_friend_email_hash is not null),
  check (expires_at > created_at)
);

create table if not exists public.moral_trade_friend_testimonials (
  id uuid primary key default gen_random_uuid(),
  invite_id uuid not null references public.moral_trade_friend_testimonial_invites (id) on delete restrict,
  participant_user_id uuid not null references public.profiles (id) on delete cascade,
  friend_user_id uuid not null references public.profiles (id) on delete cascade,
  pledge_swap_id text,
  purchase_envelope_type text,
  purchase_envelope_id text,
  participant_action_commitment_id text,
  action_template_id text not null,
  action_window_start_at timestamptz not null,
  action_window_end_at timestamptz not null,
  relationship_type text not null check (relationship_type in ('friend', 'family', 'roommate', 'romantic_partner', 'classmate', 'coworker', 'other')),
  relationship_context_private text,
  baseline_knowledge_level text not null check (baseline_knowledge_level in ('none', 'low', 'moderate', 'high')),
  completion_knowledge_level text not null check (completion_knowledge_level in ('none', 'low', 'moderate', 'high')),
  baseline_counterfactual_credence_decimal numeric(6,5) check (baseline_counterfactual_credence_decimal between 0 and 1),
  completion_credence_decimal numeric(6,5) check (completion_credence_decimal between 0 and 1),
  baseline_basis_json jsonb not null,
  completion_basis_json jsonb not null,
  concern_flag text not null default 'none' check (
    concern_flag in ('none', 'possible_noncompletion', 'possible_baseline_manipulation', 'possible_pressure', 'possible_side_payment', 'other')
  ),
  concern_notes_private text,
  testimony_text_private text,
  friend_terms_acceptance_id text not null,
  submitted_at timestamptz not null,
  testimonial_status text not null check (testimonial_status in ('submitted', 'under_review', 'accepted', 'partially_accepted', 'rejected', 'disputed', 'blocked')),
  reviewer_user_id uuid references public.profiles (id) on delete set null,
  participant_visible_summary text,
  private_reviewer_notes_ref text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  check (action_window_start_at < action_window_end_at)
);

create table if not exists public.moral_trade_testimonial_quality_assessments (
  id uuid primary key default gen_random_uuid(),
  friend_testimonial_id uuid not null references public.moral_trade_friend_testimonials (id) on delete restrict,
  participant_user_id uuid not null references public.profiles (id) on delete cascade,
  friend_user_id uuid not null references public.profiles (id) on delete cascade,
  source_type text not null default 'friend_testimonial',
  source_id uuid not null,
  relationship_weight_decimal numeric(6,5) not null check (relationship_weight_decimal between 0 and 1),
  friend_credibility_weight_decimal numeric(6,5) not null check (friend_credibility_weight_decimal between 0 and 1),
  specificity_score_decimal numeric(6,5) not null check (specificity_score_decimal between 0 and 1),
  knowledge_basis_score_decimal numeric(6,5) not null check (knowledge_basis_score_decimal between 0 and 1),
  consistency_score_decimal numeric(6,5) not null check (consistency_score_decimal between 0 and 1),
  independence_score_decimal numeric(6,5) not null check (independence_score_decimal between 0 and 1),
  collusion_risk_score_decimal numeric(6,5) not null check (collusion_risk_score_decimal between 0 and 1),
  privacy_sensitivity_score_decimal numeric(6,5) not null check (privacy_sensitivity_score_decimal between 0 and 1),
  baseline_probative_value_score_decimal numeric(6,5) not null check (baseline_probative_value_score_decimal between 0 and 1),
  completion_probative_value_score_decimal numeric(6,5) not null check (completion_probative_value_score_decimal between 0 and 1),
  accepted_for_additionality_bool boolean not null default false,
  accepted_for_completion_verification_bool boolean not null default false,
  accepted_for_credibility_update_bool boolean not null default false,
  reviewer_id uuid references public.profiles (id) on delete set null,
  review_status text not null check (review_status in ('pending', 'accepted', 'rejected', 'needs_more_info', 'disputed')),
  participant_visible_summary text,
  private_notes_ref text,
  risk_review_flags text[] not null default '{}',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  check (source_type = 'friend_testimonial')
);

create table if not exists public.moral_trade_credibility_events (
  id uuid primary key default gen_random_uuid(),
  participant_user_id uuid not null references public.profiles (id) on delete cascade,
  source_type text not null check (source_type in ('pledge_swap', 'friend_testimonial', 'review', 'appeal')),
  source_id text not null,
  event_type text not null check (
    event_type in (
      'pledge_swap_completed',
      'pledge_swap_failed',
      'pledge_swap_withdrawn',
      'pledge_swap_disputed',
      'pledge_swap_appeal_correction',
      'friend_testimonial_consistent',
      'friend_testimonial_contradicted',
      'friend_concern_report_supported'
    )
  ),
  prior_credibility_score_decimal numeric(6,5) not null check (prior_credibility_score_decimal between 0 and 1),
  credibility_delta_decimal numeric(7,5) not null check (credibility_delta_decimal between -1 and 1),
  new_credibility_score_decimal numeric(6,5) not null check (new_credibility_score_decimal between 0 and 1),
  evidence_quality_score_decimal numeric(6,5) not null check (evidence_quality_score_decimal between 0 and 1),
  final_additionality_probability_decimal numeric(6,5) not null check (final_additionality_probability_decimal between 0 and 1),
  verification_confidence_decimal numeric(6,5) not null check (verification_confidence_decimal between 0 and 1),
  policy_snapshot_hash text not null check (policy_snapshot_hash ~ '^sha256:[a-f0-9]{64}$'),
  participant_visible_reason text,
  private_reviewer_notes_ref text,
  appeal_status text not null default 'none' check (appeal_status in ('none', 'appeal_available', 'appealed', 'appeal_resolved', 'appeal_expired')),
  correction_of_event_id uuid references public.moral_trade_credibility_events (id) on delete restrict,
  created_at timestamptz not null default timezone('utc', now())
);

alter table public.moral_trade_participant_credibility_profiles
  add constraint moral_trade_participant_credibility_profiles_last_event_fk
  foreign key (last_credibility_event_id)
  references public.moral_trade_credibility_events (id)
  on delete set null;

create table if not exists public.moral_trade_testimonial_credibility_events (
  id uuid primary key default gen_random_uuid(),
  friend_user_id uuid not null references public.profiles (id) on delete cascade,
  source_friend_testimonial_id uuid not null references public.moral_trade_friend_testimonials (id) on delete restrict,
  related_participant_user_id uuid not null references public.profiles (id) on delete cascade,
  event_type text not null check (
    event_type in (
      'accurate_supportive_testimony',
      'inaccurate_testimony',
      'contradicted_testimony',
      'concern_report_supported',
      'concern_report_not_supported',
      'reckless_or_fraudulent_testimony',
      'appeal_correction'
    )
  ),
  prior_testimonial_credibility_decimal numeric(6,5) not null check (prior_testimonial_credibility_decimal between 0 and 1),
  delta_decimal numeric(7,5) not null check (delta_decimal between -1 and 1),
  new_testimonial_credibility_decimal numeric(6,5) not null check (new_testimonial_credibility_decimal between 0 and 1),
  participant_visible_reason text,
  friend_visible_reason text not null,
  private_reviewer_notes_ref text,
  policy_snapshot_hash text not null check (policy_snapshot_hash ~ '^sha256:[a-f0-9]{64}$'),
  appeal_status text not null default 'none' check (appeal_status in ('none', 'appeal_available', 'appealed', 'appeal_resolved', 'appeal_expired')),
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.moral_trade_credibility_appeals (
  id uuid primary key default gen_random_uuid(),
  participant_user_id uuid not null references public.profiles (id) on delete cascade,
  source_credibility_event_id uuid not null references public.moral_trade_credibility_events (id) on delete restrict,
  appeal_status text not null check (appeal_status in ('available', 'submitted', 'under_review', 'resolved', 'expired')),
  participant_visible_reason text not null,
  private_reviewer_notes_ref text,
  created_at timestamptz not null default timezone('utc', now()),
  resolved_at timestamptz
);

create table if not exists public.moral_trade_testimonial_stakes (
  id uuid primary key default gen_random_uuid(),
  friend_testimonial_id uuid not null references public.moral_trade_friend_testimonials (id) on delete restrict,
  friend_user_id uuid not null references public.profiles (id) on delete cascade,
  amount_minor integer not null check (amount_minor between 0 and 1000),
  currency text not null default 'USD',
  destination_policy text not null check (
    destination_policy in ('same_charity', 'neutral_approved_charity', 'random_same_cause_charity', 'no_stake')
  ),
  donation_recipient_id text,
  stake_status text not null check (stake_status in ('proposed', 'authorized', 'donated', 'released', 'failed', 'cancelled', 'blocked')),
  payment_operation_id text,
  donor_of_record_policy_snapshot_hash text check (donor_of_record_policy_snapshot_hash ~ '^sha256:[a-f0-9]{64}$'),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

comment on table public.moral_trade_participant_credibility_profiles is
  'Private participant credibility profiles estimating future pledge-swap completion, evidence reliability, fraud risk, pricing, selection, and future verification burden. These are not public social credit, credit-score, or reputation-score surfaces.';

comment on table public.moral_trade_friend_testimonials is
  'Private friend testimonials for pledge-swap evidence. Baseline/additionality credence and completion credence are captured separately; raw testimony, concern notes, and friend identity are not public or funder-visible.';

comment on table public.moral_trade_credibility_events is
  'Append-only participant credibility events. Corrections and appeals create new events instead of mutating historical credibility events.';

comment on table public.moral_trade_testimonial_credibility_events is
  'Append-only testimonial-provider credibility events. Later contradiction, corroboration, and appeal corrections are recorded without public social-proof exposure.';

alter table public.moral_trade_participant_credibility_profiles enable row level security;
alter table public.moral_trade_friend_testimonial_invites enable row level security;
alter table public.moral_trade_friend_testimonials enable row level security;
alter table public.moral_trade_testimonial_quality_assessments enable row level security;
alter table public.moral_trade_credibility_events enable row level security;
alter table public.moral_trade_testimonial_credibility_events enable row level security;
alter table public.moral_trade_credibility_appeals enable row level security;
alter table public.moral_trade_testimonial_stakes enable row level security;

drop policy if exists "moral_trade_participant_credibility_profiles_select_owner"
  on public.moral_trade_participant_credibility_profiles;
create policy "moral_trade_participant_credibility_profiles_select_owner"
  on public.moral_trade_participant_credibility_profiles
  for select
  to authenticated
  using (participant_user_id = auth.uid());

drop policy if exists "moral_trade_friend_testimonial_invites_select_party"
  on public.moral_trade_friend_testimonial_invites;
create policy "moral_trade_friend_testimonial_invites_select_party"
  on public.moral_trade_friend_testimonial_invites
  for select
  to authenticated
  using (participant_user_id = auth.uid() or invited_friend_user_id = auth.uid());

drop policy if exists "moral_trade_friend_testimonials_select_party"
  on public.moral_trade_friend_testimonials;
create policy "moral_trade_friend_testimonials_select_party"
  on public.moral_trade_friend_testimonials
  for select
  to authenticated
  using (participant_user_id = auth.uid() or friend_user_id = auth.uid());

drop policy if exists "moral_trade_friend_testimonials_insert_friend"
  on public.moral_trade_friend_testimonials;
create policy "moral_trade_friend_testimonials_insert_friend"
  on public.moral_trade_friend_testimonials
  for insert
  to authenticated
  with check (friend_user_id = auth.uid());

drop policy if exists "moral_trade_credibility_events_select_participant"
  on public.moral_trade_credibility_events;
create policy "moral_trade_credibility_events_select_participant"
  on public.moral_trade_credibility_events
  for select
  to authenticated
  using (participant_user_id = auth.uid());

drop policy if exists "moral_trade_testimonial_credibility_events_select_friend"
  on public.moral_trade_testimonial_credibility_events;
create policy "moral_trade_testimonial_credibility_events_select_friend"
  on public.moral_trade_testimonial_credibility_events
  for select
  to authenticated
  using (friend_user_id = auth.uid());
