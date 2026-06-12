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
      'direct_pair_clearing'
    )
  );

create table if not exists public.moral_trade_cause_bucket_taxonomies (
  id uuid primary key default gen_random_uuid(),
  policy_snapshot_id uuid not null references public.moral_trade_policy_snapshots (id) on delete restrict,
  policy_version text not null,
  taxonomy_type text not null check (
    taxonomy_type in ('offered_cause', 'opposed_cause', 'compromise_destination', 'action_bucket', 'counterparty_bucket', 'manual_review')
  ),
  allowed_bucket_codes text[] not null default '{}',
  bucket_definition_hashes text[] not null default '{}',
  protected_trait_proxy_review_state text not null default 'under_review' check (
    protected_trait_proxy_review_state in ('not_required', 'under_review', 'non_blocking', 'blocked', 'manual_review', 'superseded')
  ),
  ideology_or_psychology_inference_prohibited_bool boolean not null default true check (ideology_or_psychology_inference_prohibited_bool = true),
  plural_reviewer_panel_ref text,
  public_summary_hash text not null check (public_summary_hash ~ '^sha256:[a-f0-9]{64}$'),
  taxonomy_version_hash text not null check (taxonomy_version_hash ~ '^sha256:[a-f0-9]{64}$'),
  taxonomy_state text not null default 'draft' check (
    taxonomy_state in ('draft', 'active', 'deprecated', 'superseded', 'blocked')
  ),
  reviewer_decision_ref text,
  public_moral_ranking_bool boolean not null default false check (public_moral_ranking_bool = false),
  public_ideology_label_bool boolean not null default false check (public_ideology_label_bool = false),
  protected_trait_proxy_allowed_bool boolean not null default false check (protected_trait_proxy_allowed_bool = false),
  inferred_psychology_allowed_bool boolean not null default false check (inferred_psychology_allowed_bool = false),
  reviewed_by uuid references public.profiles (id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  check (cardinality(allowed_bucket_codes) = cardinality(bucket_definition_hashes)),
  check (
    taxonomy_state <> 'active'
    or (
      cardinality(allowed_bucket_codes) >= 2
      and protected_trait_proxy_review_state = 'non_blocking'
      and length(trim(coalesce(plural_reviewer_panel_ref, ''))) > 0
      and reviewer_decision_ref is not null
    )
  )
);

comment on table public.moral_trade_cause_bucket_taxonomies is
  'Versioned, plural-reviewed, non-ranking cause-bucket taxonomy records for offered causes, opposed causes, compromise destinations, action buckets, and counterparty buckets. Taxonomies are coordination interfaces, not ideology maps, moral rankings, protected-trait proxies, or inferred-psychology labels.';

create table if not exists public.moral_trade_cause_bucket_assignments (
  id uuid primary key default gen_random_uuid(),
  cause_bucket_taxonomy_id uuid references public.moral_trade_cause_bucket_taxonomies (id) on delete restrict,
  subject_type text not null check (
    subject_type in ('offset_offer', 'pledge_swap_offer', 'matched_trade_lock_proposal', 'cleared_trade_agreement', 'seed_template', 'worked_example')
  ),
  subject_id text not null,
  participant_id_hash text not null check (participant_id_hash ~ '^sha256:[a-f0-9]{64}$'),
  cause_bucket_taxonomy_ref text not null,
  participant_selected_bucket_codes text[] not null default '{}',
  reviewer_normalized_bucket_codes text[] not null default '{}',
  assignment_confidence_state text not null default 'self_attested' check (
    assignment_confidence_state in ('self_attested', 'reviewer_normalized', 'disputed', 'blocked', 'manual_review', 'superseded')
  ),
  assignment_visibility text not null default 'participant_only' check (
    assignment_visibility in ('participant_only', 'reviewer_only', 'counterparty_band_only', 'public_coarse')
  ),
  affects_counterparty_distinctness_bool boolean not null default false,
  affects_trade_classification_bool boolean not null default false,
  affects_clearing_eligibility_bool boolean not null default false,
  assignment_state text not null default 'draft' check (
    assignment_state in ('draft', 'previewed', 'locked', 'disputed', 'superseded', 'blocked')
  ),
  reviewer_decision_ref text,
  taxonomy_version_hash text not null check (taxonomy_version_hash ~ '^sha256:[a-f0-9]{64}$'),
  participant_visible_dependency_notice_bool boolean not null default false,
  taxonomy_change_material_bool boolean not null default false,
  preview_renewal_confirmation_ref text,
  public_participant_identity_bool boolean not null default false check (public_participant_identity_bool = false),
  public_detailed_bucket_narrative_bool boolean not null default false check (public_detailed_bucket_narrative_bool = false),
  public_protected_trait_facts_bool boolean not null default false check (public_protected_trait_facts_bool = false),
  public_inferred_ideology_or_psychology_bool boolean not null default false check (public_inferred_ideology_or_psychology_bool = false),
  reviewed_by uuid references public.profiles (id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  check (
    taxonomy_change_material_bool = false
    or preview_renewal_confirmation_ref is not null
  ),
  check (
    not (
      affects_counterparty_distinctness_bool
      or affects_trade_classification_bool
      or affects_clearing_eligibility_bool
    )
    or (
      assignment_confidence_state = 'reviewer_normalized'
      and assignment_state in ('previewed', 'locked')
      and participant_visible_dependency_notice_bool = true
      and reviewer_decision_ref is not null
    )
  )
);

comment on table public.moral_trade_cause_bucket_assignments is
  'Privacy-safe cause-bucket assignment records. Effect-bearing assignments must be reviewer-normalized, non-disputed, version-hash linked, visible to participants as a dependency, and renewed after material taxonomy changes before they affect distinctness, classification, clearing, metrics, or release gates.';

create index if not exists moral_trade_cause_bucket_taxonomies_state_idx
  on public.moral_trade_cause_bucket_taxonomies (taxonomy_state, taxonomy_type, updated_at desc);

create index if not exists moral_trade_cause_bucket_taxonomies_policy_idx
  on public.moral_trade_cause_bucket_taxonomies (policy_snapshot_id, taxonomy_state);

create index if not exists moral_trade_cause_bucket_assignments_subject_idx
  on public.moral_trade_cause_bucket_assignments (subject_type, subject_id, assignment_state, updated_at desc);

create index if not exists moral_trade_cause_bucket_assignments_taxonomy_idx
  on public.moral_trade_cause_bucket_assignments (cause_bucket_taxonomy_ref, assignment_confidence_state, assignment_state);

alter table public.moral_trade_cause_bucket_taxonomies enable row level security;
alter table public.moral_trade_cause_bucket_assignments enable row level security;
