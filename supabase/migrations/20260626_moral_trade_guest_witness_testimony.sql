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
      'baseline_witness_testimony',
      'witness_identity_assurance',
      'witness_additionality_adjustment'
    )
  );

create table if not exists public.guest_witness_identities (
  id uuid primary key default gen_random_uuid(),
  primary_email_hash text check (primary_email_hash is null or primary_email_hash ~ '^sha256:[a-f0-9]{64}$'),
  phone_hash text check (phone_hash is null or phone_hash ~ '^sha256:[a-f0-9]{64}$'),
  converted_user_id uuid references public.profiles (id) on delete set null,
  witness_status text not null default 'active' check (witness_status in ('active', 'restricted', 'blocked', 'deleted')),
  witness_credibility_decimal numeric(5,4) check (witness_credibility_decimal is null or (witness_credibility_decimal >= 0 and witness_credibility_decimal <= 1)),
  witness_credibility_confidence_decimal numeric(5,4) check (witness_credibility_confidence_decimal is null or (witness_credibility_confidence_decimal >= 0 and witness_credibility_confidence_decimal <= 1)),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

comment on table public.guest_witness_identities is
  'Private guest witness identity records for non-user baseline testimony. Contact fields are stored only as hashes, and conversion to a full user account is optional.';

create unique index if not exists guest_witness_identities_email_hash_idx
  on public.guest_witness_identities (primary_email_hash)
  where primary_email_hash is not null;

create unique index if not exists guest_witness_identities_phone_hash_idx
  on public.guest_witness_identities (phone_hash)
  where phone_hash is not null;

create table if not exists public.external_witness_accounts (
  id uuid primary key default gen_random_uuid(),
  guest_witness_identity_id uuid not null references public.guest_witness_identities (id) on delete cascade,
  provider text not null check (provider in ('x', 'facebook', 'instagram', 'google', 'apple', 'email_magic_link', 'manual_review')),
  provider_account_id_hash text not null check (provider_account_id_hash ~ '^sha256:[a-f0-9]{64}$'),
  provider_account_display_snapshot text,
  provider_profile_url_snapshot text,
  provider_verified_at timestamptz not null,
  oauth_scope_snapshot_json jsonb,
  token_storage_policy text not null default 'no_token' check (token_storage_policy in ('no_token', 'short_lived_token', 'long_lived_token_ref', 'manual')),
  token_ref text,
  token_expires_at timestamptz,
  account_status text not null default 'connected' check (account_status in ('connected', 'expired', 'revoked', 'failed', 'blocked')),
  privacy_notice_version text not null,
  terms_acceptance_id text not null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  check (
    token_storage_policy <> 'no_token'
    or (token_ref is null and token_expires_at is null)
  )
);

comment on table public.external_witness_accounts is
  'Optional privacy-minimized external account verification for guest witnesses. Stable provider ids are hashed; posting permissions and raw tokens are not stored by default.';

create unique index if not exists external_witness_accounts_provider_hash_idx
  on public.external_witness_accounts (provider, provider_account_id_hash);

create index if not exists external_witness_accounts_identity_idx
  on public.external_witness_accounts (guest_witness_identity_id, account_status, created_at desc);

create table if not exists public.baseline_witness_invites (
  id uuid primary key default gen_random_uuid(),
  participant_user_id uuid not null references public.profiles (id) on delete cascade,
  pledge_swap_id uuid references public.offers (id) on delete set null,
  purchase_envelope_type text,
  purchase_envelope_id text,
  participant_action_commitment_id text references public.moral_goods_participant_action_commitments (id) on delete set null,
  invited_email_hash text check (invited_email_hash is null or invited_email_hash ~ '^sha256:[a-f0-9]{64}$'),
  invited_phone_hash text check (invited_phone_hash is null or invited_phone_hash ~ '^sha256:[a-f0-9]{64}$'),
  invite_token_hash text not null unique check (invite_token_hash ~ '^sha256:[a-f0-9]{64}$'),
  invite_status text not null default 'pending' check (invite_status in ('pending', 'opened', 'submitted', 'declined', 'expired', 'revoked', 'reported', 'blocked')),
  participant_claimed_relationship text check (
    participant_claimed_relationship is null or participant_claimed_relationship in (
      'friend',
      'family',
      'roommate',
      'romantic_partner',
      'classmate',
      'coworker',
      'dining_companion',
      'other'
    )
  ),
  action_template_id text not null,
  action_window_start_at timestamptz not null,
  action_window_end_at timestamptz not null,
  expires_at timestamptz not null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  check (action_window_end_at > action_window_start_at),
  check (expires_at > created_at),
  check (
    invited_email_hash is not null
    or invited_phone_hash is not null
    or invite_token_hash is not null
  )
);

comment on table public.baseline_witness_invites is
  'Private expiring invites for baseline-only pre-pledge guest witness testimony. Raw invite tokens are never stored.';

create index if not exists baseline_witness_invites_participant_status_idx
  on public.baseline_witness_invites (participant_user_id, invite_status, created_at desc);

create index if not exists baseline_witness_invites_pledge_status_idx
  on public.baseline_witness_invites (pledge_swap_id, invite_status, created_at desc);

create table if not exists public.baseline_witness_testimonials (
  id uuid primary key default gen_random_uuid(),
  invite_id uuid not null references public.baseline_witness_invites (id) on delete restrict,
  guest_witness_identity_id uuid not null references public.guest_witness_identities (id) on delete restrict,
  external_witness_account_id uuid references public.external_witness_accounts (id) on delete set null,
  participant_user_id uuid not null references public.profiles (id) on delete cascade,
  pledge_swap_id uuid references public.offers (id) on delete set null,
  purchase_envelope_type text,
  purchase_envelope_id text,
  participant_action_commitment_id text references public.moral_goods_participant_action_commitments (id) on delete set null,
  relationship_type text not null check (relationship_type in ('friend', 'family', 'roommate', 'romantic_partner', 'classmate', 'coworker', 'dining_companion', 'other')),
  baseline_knowledge_level text not null check (baseline_knowledge_level in ('none', 'low', 'moderate', 'high')),
  recent_meal_observation_frequency text not null check (recent_meal_observation_frequency in ('never', 'once', 'few_times', 'weekly', 'daily', 'lived_together')),
  baseline_counterfactual_credence_decimal numeric(5,4) not null check (baseline_counterfactual_credence_decimal >= 0 and baseline_counterfactual_credence_decimal <= 1),
  basis_json jsonb not null default '{}'::jsonb,
  uncertainty_notes_private text,
  concern_flag text not null default 'none' check (concern_flag in ('none', 'possible_baseline_overstatement', 'possible_pressure', 'possible_side_payment', 'insufficient_knowledge', 'other')),
  concern_notes_private text,
  testimonial_status text not null default 'submitted' check (testimonial_status in ('submitted', 'under_review', 'accepted', 'partially_accepted', 'rejected', 'disputed', 'blocked')),
  reviewer_user_id uuid references public.profiles (id) on delete set null,
  participant_visible_summary text,
  private_reviewer_notes_ref text,
  submitted_at timestamptz not null default timezone('utc', now()),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (invite_id),
  check (jsonb_typeof(basis_json) = 'object')
);

comment on table public.baseline_witness_testimonials is
  'Private baseline/additionality guest witness testimony. It is not completion proof, public testimony, or social proof of truth.';

create unique index if not exists baseline_witness_testimonials_external_pledge_idx
  on public.baseline_witness_testimonials (pledge_swap_id, external_witness_account_id)
  where pledge_swap_id is not null and external_witness_account_id is not null;

create index if not exists baseline_witness_testimonials_review_idx
  on public.baseline_witness_testimonials (testimonial_status, submitted_at desc);

create index if not exists baseline_witness_testimonials_participant_idx
  on public.baseline_witness_testimonials (participant_user_id, pledge_swap_id, submitted_at desc);

create table if not exists public.baseline_witness_quality_assessments (
  id uuid primary key default gen_random_uuid(),
  baseline_witness_testimonial_id uuid not null references public.baseline_witness_testimonials (id) on delete cascade,
  guest_witness_identity_id uuid not null references public.guest_witness_identities (id) on delete restrict,
  participant_user_id uuid not null references public.profiles (id) on delete cascade,
  identity_assurance_level text not null check (identity_assurance_level in ('email_only', 'social_verified', 'prior_user', 'manual_verified', 'weak')),
  relationship_weight_decimal numeric(5,4) not null check (relationship_weight_decimal >= 0 and relationship_weight_decimal <= 1),
  knowledge_basis_score_decimal numeric(5,4) not null check (knowledge_basis_score_decimal >= 0 and knowledge_basis_score_decimal <= 1),
  specificity_score_decimal numeric(5,4) not null check (specificity_score_decimal >= 0 and specificity_score_decimal <= 1),
  independence_score_decimal numeric(5,4) not null check (independence_score_decimal >= 0 and independence_score_decimal <= 1),
  consistency_score_decimal numeric(5,4) not null check (consistency_score_decimal >= 0 and consistency_score_decimal <= 1),
  collusion_risk_score_decimal numeric(5,4) not null check (collusion_risk_score_decimal >= 0 and collusion_risk_score_decimal <= 1),
  baseline_probative_value_score_decimal numeric(5,4) not null check (baseline_probative_value_score_decimal >= 0 and baseline_probative_value_score_decimal <= 1),
  accepted_for_additionality boolean not null default false,
  accepted_for_credibility_update boolean not null default false,
  proposed_additionality_adjustment_decimal numeric(5,4) check (proposed_additionality_adjustment_decimal is null or (proposed_additionality_adjustment_decimal >= 0 and proposed_additionality_adjustment_decimal <= 1)),
  review_status text not null default 'pending' check (review_status in ('pending', 'accepted', 'rejected', 'needs_more_info', 'disputed')),
  reviewer_id uuid references public.profiles (id) on delete set null,
  private_notes_ref text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (baseline_witness_testimonial_id)
);

comment on table public.baseline_witness_quality_assessments is
  'Reviewer-visible witness quality assessment records. Identity assurance is stored separately from claim credibility.';

create index if not exists baseline_witness_quality_assessments_review_idx
  on public.baseline_witness_quality_assessments (review_status, baseline_probative_value_score_decimal desc, created_at desc);

create table if not exists public.baseline_witness_audit_events (
  id uuid primary key default gen_random_uuid(),
  invite_id uuid references public.baseline_witness_invites (id) on delete set null,
  baseline_witness_testimonial_id uuid references public.baseline_witness_testimonials (id) on delete set null,
  baseline_witness_quality_assessment_id uuid references public.baseline_witness_quality_assessments (id) on delete set null,
  event_type text not null check (event_type in ('invite_created', 'invite_opened', 'magic_link_verified', 'testimonial_submitted', 'witness_declined', 'pressure_reported', 'quality_assessed', 'review_decision', 'policy_effect_applied', 'unlink_requested', 'deletion_requested')),
  actor_kind text not null check (actor_kind in ('participant', 'witness', 'reviewer', 'system')),
  actor_id_hash text check (actor_id_hash is null or actor_id_hash ~ '^sha256:[a-f0-9]{64}$'),
  redacted_summary text not null,
  event_payload_redacted jsonb not null default '{}'::jsonb,
  private_ref_hash text check (private_ref_hash is null or private_ref_hash ~ '^sha256:[a-f0-9]{64}$'),
  created_at timestamptz not null default timezone('utc', now()),
  check (jsonb_typeof(event_payload_redacted) = 'object')
);

comment on table public.baseline_witness_audit_events is
  'Append-only redacted audit records for invite, submission, review, risk, and policy-effect guest witness events.';

create index if not exists baseline_witness_audit_events_subject_idx
  on public.baseline_witness_audit_events (invite_id, baseline_witness_testimonial_id, created_at desc);

create table if not exists public.baseline_witness_risk_reports (
  id uuid primary key default gen_random_uuid(),
  invite_id uuid references public.baseline_witness_invites (id) on delete set null,
  baseline_witness_testimonial_id uuid references public.baseline_witness_testimonials (id) on delete set null,
  participant_user_id uuid references public.profiles (id) on delete set null,
  guest_witness_identity_id uuid references public.guest_witness_identities (id) on delete set null,
  report_kind text not null check (report_kind in ('pressure_or_coercion', 'possible_side_payment', 'testimonial_ring', 'duplicate_witness', 'other')),
  review_status text not null default 'open' check (review_status in ('open', 'under_review', 'resolved', 'dismissed', 'escalated')),
  redacted_summary text not null,
  private_report_ref_hash text check (private_report_ref_hash is null or private_report_ref_hash ~ '^sha256:[a-f0-9]{64}$'),
  routed_to text not null default 'risk_review',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

comment on table public.baseline_witness_risk_reports is
  'Private witness pressure, side-payment, duplicate, and testimonial-ring risk reports. Participants never receive raw refusal reasons or pressure notes.';

create index if not exists baseline_witness_risk_reports_status_idx
  on public.baseline_witness_risk_reports (review_status, report_kind, created_at desc);

alter table public.guest_witness_identities enable row level security;
alter table public.external_witness_accounts enable row level security;
alter table public.baseline_witness_invites enable row level security;
alter table public.baseline_witness_testimonials enable row level security;
alter table public.baseline_witness_quality_assessments enable row level security;
alter table public.baseline_witness_audit_events enable row level security;
alter table public.baseline_witness_risk_reports enable row level security;
