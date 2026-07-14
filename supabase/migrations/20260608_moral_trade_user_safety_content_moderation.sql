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
      'prohibited_use'
    )
  );

create table if not exists public.moral_trade_user_safety_policies (
  id uuid primary key default gen_random_uuid(),
  policy_snapshot_id uuid not null references public.moral_trade_policy_snapshots (id) on delete restrict,
  policy_version text not null default 'moral-trade-user-safety-v0.1-2026-06',
  surface text not null check (
    surface in (
      'contact_attempt',
      'invite_link',
      'profile_message',
      'support_message',
      'discussion_surface',
      'reliance_bearing_preview',
      'public_profile_amplification',
      'release_gate_promotion'
    )
  ),
  status text not null default 'under_review' check (
    status in ('passed', 'not_required_for_stage', 'under_review', 'blocked', 'stale', 'superseded')
  ),
  consent_required_bool boolean not null default true,
  rate_limit_required_bool boolean not null default true,
  block_decline_withdrawal_required_bool boolean not null default true,
  abuse_report_resolution_required_bool boolean not null default true,
  retaliation_prevention_required_bool boolean not null default true,
  minor_vulnerable_contact_review_required_bool boolean not null default true,
  policy_hash text not null check (policy_hash ~ '^sha256:[a-f0-9]{64}$'),
  reviewed_by uuid references public.profiles (id) on delete set null,
  reviewed_at timestamptz,
  superseded_by uuid references public.moral_trade_user_safety_policies (id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (policy_snapshot_id, surface)
);

comment on table public.moral_trade_user_safety_policies is
  'Frozen user-safety policies for contact attempts, invite links, blocking, decline handling, abuse reporting, and retaliation prevention. Contact-enabling transitions fail closed without an immutable policy snapshot.';

create table if not exists public.moral_trade_contact_interaction_records (
  id uuid primary key default gen_random_uuid(),
  user_safety_policy_ref uuid not null references public.moral_trade_user_safety_policies (id) on delete restrict,
  interaction_type text not null check (
    interaction_type in ('contact_attempt', 'invite_link', 'profile_message', 'support_message', 'discussion_surface')
  ),
  subject_type text not null check (
    subject_type in (
      'donation_offset',
      'pledge_swap',
      'compensated_moral_action',
      'common_ground_budget',
      'public_goods_round',
      'profile',
      'support_case',
      'discussion_thread'
    )
  ),
  subject_ref text not null,
  status text not null default 'under_review' check (
    status in ('non_blocking', 'not_required_for_stage', 'missing', 'under_review', 'blocked', 'serious_unresolved', 'stale', 'superseded')
  ),
  initiator_hash text not null check (initiator_hash ~ '^sha256:[a-f0-9]{64}$'),
  recipient_hash text not null check (recipient_hash ~ '^sha256:[a-f0-9]{64}$'),
  contact_channel_hash text not null check (contact_channel_hash ~ '^sha256:[a-f0-9]{64}$'),
  contact_attempt_hash text not null check (contact_attempt_hash ~ '^sha256:[a-f0-9]{64}$'),
  consent_status text not null default 'missing' check (
    consent_status in ('consented', 'not_required_for_stage', 'missing', 'declined', 'blocked', 'withdrawn', 'stale')
  ),
  rate_limit_status text not null default 'missing' check (
    rate_limit_status in ('within_limit', 'not_required_for_stage', 'missing', 'exceeded', 'stale')
  ),
  block_decline_withdrawal_status text not null default 'missing' check (
    block_decline_withdrawal_status in ('respected', 'not_required_for_stage', 'missing', 'violated', 'stale')
  ),
  abuse_report_resolution_status text not null default 'none' check (
    abuse_report_resolution_status in ('none', 'resolved_non_blocking', 'not_required_for_stage', 'missing', 'open', 'under_review', 'serious_unresolved', 'retaliation_risk', 'stale')
  ),
  retaliation_prevention_status text not null default 'missing' check (
    retaliation_prevention_status in ('non_blocking', 'not_required_for_stage', 'missing', 'retaliation_risk', 'stale')
  ),
  contact_payload_stored_bool boolean not null default false,
  private_message_public_bool boolean not null default false,
  user_facing_reason_category text not null default 'Contact safety and abuse-report review',
  reviewed_by uuid references public.profiles (id) on delete set null,
  reviewed_at timestamptz,
  expires_at timestamptz,
  superseded_by uuid references public.moral_trade_contact_interaction_records (id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  check (contact_payload_stored_bool = false),
  check (private_message_public_bool = false),
  check (
    status <> 'non_blocking'
    or (
      consent_status in ('consented', 'not_required_for_stage')
      and rate_limit_status in ('within_limit', 'not_required_for_stage')
      and block_decline_withdrawal_status in ('respected', 'not_required_for_stage')
      and abuse_report_resolution_status in ('none', 'resolved_non_blocking', 'not_required_for_stage')
      and retaliation_prevention_status in ('non_blocking', 'not_required_for_stage')
      and reviewed_at is not null
      and private_message_public_bool = false
    )
  )
);

comment on table public.moral_trade_contact_interaction_records is
  'First-class contact interaction records. User-initiated contact, invite links, profile messages, support messages, and discussion surfaces must respect consent, rate limits, blocks, declines, withdrawals, abuse reports, and non-retaliation before introductions or amplification.';

create table if not exists public.moral_trade_abuse_report_records (
  id uuid primary key default gen_random_uuid(),
  user_safety_policy_ref uuid not null references public.moral_trade_user_safety_policies (id) on delete restrict,
  contact_interaction_record_id uuid references public.moral_trade_contact_interaction_records (id) on delete set null,
  subject_type text not null check (
    subject_type in (
      'contact_interaction',
      'invite_link',
      'profile',
      'support_case',
      'discussion_thread',
      'offer',
      'agreement',
      'release_gate'
    )
  ),
  subject_ref text not null,
  reporter_hash text not null check (reporter_hash ~ '^sha256:[a-f0-9]{64}$'),
  target_hash text not null check (target_hash ~ '^sha256:[a-f0-9]{64}$'),
  severity text not null default 'medium' check (
    severity in ('none', 'low', 'medium', 'serious', 'critical')
  ),
  resolution_status text not null default 'under_review' check (
    resolution_status in ('none', 'resolved_non_blocking', 'not_required_for_stage', 'missing', 'open', 'under_review', 'serious_unresolved', 'retaliation_risk', 'stale')
  ),
  retaliation_risk_status text not null default 'missing' check (
    retaliation_risk_status in ('non_blocking', 'not_required_for_stage', 'missing', 'retaliation_risk', 'stale')
  ),
  evidence_hash text not null check (evidence_hash ~ '^sha256:[a-f0-9]{64}$'),
  report_payload_public_bool boolean not null default false,
  reporter_identity_public_bool boolean not null default false,
  target_identity_public_bool boolean not null default false,
  reviewed_by uuid references public.profiles (id) on delete set null,
  reviewed_at timestamptz,
  resolved_at timestamptz,
  superseded_by uuid references public.moral_trade_abuse_report_records (id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  check (report_payload_public_bool = false),
  check (reporter_identity_public_bool = false),
  check (target_identity_public_bool = false),
  check (
    severity not in ('serious', 'critical')
    or resolution_status in ('resolved_non_blocking', 'not_required_for_stage', 'serious_unresolved', 'under_review', 'open')
  )
);

comment on table public.moral_trade_abuse_report_records is
  'First-class abuse report records. Unresolved serious abuse reports block contact introductions, reliance-bearing previews, and public-profile amplification without exposing reporter or target identities.';

create table if not exists public.moral_trade_content_moderation_policies (
  id uuid primary key default gen_random_uuid(),
  policy_snapshot_id uuid not null references public.moral_trade_policy_snapshots (id) on delete restrict,
  policy_version text not null default 'moral-trade-content-moderation-v0.1-2026-06',
  content_type text not null check (
    content_type in (
      'offer_text',
      'template_text',
      'profile_copy',
      'public_description',
      'evidence_filename_preview',
      'reviewer_visible_note',
      'invite_link_text',
      'impact_claim_copy',
      'contact_message',
      'support_message',
      'discussion_reply',
      'abuse_report',
      'appeal_text'
    )
  ),
  status text not null default 'under_review' check (
    status in ('approved', 'not_required_for_stage', 'missing', 'under_review', 'blocked', 'stale', 'superseded')
  ),
  viewpoint_neutrality_required_bool boolean not null default true,
  not_moral_ranking_bool boolean not null default true,
  reviewer_quality_required_bool boolean not null default true,
  prohibited_use_dimensions text[] not null default array[
    'illegal_activity',
    'coercion_threat',
    'deception_fraud_impersonation',
    'hate_harassment',
    'doxxing_privacy_violation',
    'self_harm_exploitation',
    'malware_cyber_abuse',
    'sexual_exploitation',
    'extremist_or_terror_finance',
    'spam_platform_abuse',
    'viewpoint_neutrality'
  ]::text[],
  policy_hash text not null check (policy_hash ~ '^sha256:[a-f0-9]{64}$'),
  reviewed_by uuid references public.profiles (id) on delete set null,
  reviewed_at timestamptz,
  superseded_by uuid references public.moral_trade_content_moderation_policies (id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (policy_snapshot_id, content_type),
  check (not_moral_ranking_bool = true),
  check (
    prohibited_use_dimensions <@ array[
      'illegal_activity',
      'coercion_threat',
      'deception_fraud_impersonation',
      'hate_harassment',
      'doxxing_privacy_violation',
      'self_harm_exploitation',
      'malware_cyber_abuse',
      'sexual_exploitation',
      'extremist_or_terror_finance',
      'spam_platform_abuse',
      'viewpoint_neutrality'
    ]::text[]
  )
);

comment on table public.moral_trade_content_moderation_policies is
  'Frozen content-moderation and prohibited-use policies for public, reviewer-visible, reliance-bearing, payable, invite, support, discussion, and impact-claim copy. The policy is viewpoint-neutral and not a moral-ranking system.';

create table if not exists public.moral_trade_content_moderation_records (
  id uuid primary key default gen_random_uuid(),
  content_moderation_policy_ref uuid not null references public.moral_trade_content_moderation_policies (id) on delete restrict,
  subject_type text not null check (
    subject_type in (
      'offer',
      'template',
      'profile',
      'public_description',
      'evidence_preview',
      'reviewer_note',
      'invite_link',
      'impact_claim',
      'contact_message',
      'support_message',
      'discussion_reply',
      'abuse_report',
      'appeal'
    )
  ),
  subject_ref text not null,
  content_type text not null check (
    content_type in (
      'offer_text',
      'template_text',
      'profile_copy',
      'public_description',
      'evidence_filename_preview',
      'reviewer_visible_note',
      'invite_link_text',
      'impact_claim_copy',
      'contact_message',
      'support_message',
      'discussion_reply',
      'abuse_report',
      'appeal_text'
    )
  ),
  moderation_status text not null default 'under_review' check (
    moderation_status in ('approved', 'not_required_for_stage', 'missing', 'under_review', 'blocked', 'stale', 'superseded')
  ),
  moderation_reason_code text not null default 'none' check (
    moderation_reason_code in (
      'none',
      'illegal_activity',
      'coercion_threat',
      'deception_fraud_impersonation',
      'hate_harassment',
      'doxxing_privacy_violation',
      'self_harm_exploitation',
      'malware_cyber_abuse',
      'sexual_exploitation',
      'extremist_or_terror_finance',
      'spam_platform_abuse',
      'viewpoint_neutrality',
      'unpopular_moral_view'
    )
  ),
  prohibited_use_categories text[] not null default '{}'::text[] check (
    prohibited_use_categories <@ array[
      'illegal_activity',
      'coercion_threat',
      'deception_fraud_impersonation',
      'hate_harassment',
      'doxxing_privacy_violation',
      'self_harm_exploitation',
      'malware_cyber_abuse',
      'sexual_exploitation',
      'extremist_or_terror_finance',
      'spam_platform_abuse',
      'viewpoint_neutrality'
    ]::text[]
  ),
  viewpoint_neutrality_status text not null default 'missing' check (
    viewpoint_neutrality_status in ('confirmed_neutral', 'not_required_for_stage', 'missing', 'viewpoint_ranked', 'unpopular_view_blocked', 'stale')
  ),
  viewpoint_ranked_bool boolean not null default false,
  content_hash text not null check (content_hash ~ '^sha256:[a-f0-9]{64}$'),
  reviewer_quality_status text not null default 'missing' check (
    reviewer_quality_status in ('authorized', 'not_required_for_stage', 'missing', 'failed', 'stale')
  ),
  raw_content_stored_bool boolean not null default false,
  raw_content_public_bool boolean not null default false,
  user_facing_reason_category text not null default 'Content safety and prohibited-use review',
  reviewed_by uuid references public.profiles (id) on delete set null,
  reviewed_at timestamptz,
  expires_at timestamptz,
  superseded_by uuid references public.moral_trade_content_moderation_records (id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  check (raw_content_public_bool = false),
  check (viewpoint_ranked_bool = false),
  check (
    moderation_status <> 'approved'
    or (
      viewpoint_neutrality_status in ('confirmed_neutral', 'not_required_for_stage')
      and reviewer_quality_status in ('authorized', 'not_required_for_stage')
      and moderation_reason_code <> 'unpopular_moral_view'
      and reviewed_at is not null
      and raw_content_public_bool = false
    )
  )
);

comment on table public.moral_trade_content_moderation_records is
  'First-class content-moderation and prohibited-use records. Public, reviewer-actionable, reliance-bearing, payable, invite, support, discussion, and impact-claim copy cannot proceed while missing, under review, blocked, stale, superseded, viewpoint-ranked, or blocked for an unpopular moral view.';

create index if not exists moral_trade_user_safety_policies_surface_idx
  on public.moral_trade_user_safety_policies (surface, status, created_at desc);

create index if not exists moral_trade_contact_interaction_subject_idx
  on public.moral_trade_contact_interaction_records (subject_type, subject_ref, interaction_type, status);

create index if not exists moral_trade_contact_interaction_participant_hash_idx
  on public.moral_trade_contact_interaction_records (initiator_hash, recipient_hash, created_at desc);

create index if not exists moral_trade_abuse_report_subject_idx
  on public.moral_trade_abuse_report_records (subject_type, subject_ref, severity, resolution_status);

create index if not exists moral_trade_abuse_report_target_idx
  on public.moral_trade_abuse_report_records (target_hash, severity, resolution_status, created_at desc);

create index if not exists moral_trade_content_moderation_policies_type_idx
  on public.moral_trade_content_moderation_policies (content_type, status, created_at desc);

create index if not exists moral_trade_content_moderation_records_subject_idx
  on public.moral_trade_content_moderation_records (subject_type, subject_ref, content_type, moderation_status);

create index if not exists moral_trade_content_moderation_records_hash_idx
  on public.moral_trade_content_moderation_records (content_hash, moderation_status, created_at desc);

alter table public.moral_trade_user_safety_policies enable row level security;
alter table public.moral_trade_contact_interaction_records enable row level security;
alter table public.moral_trade_abuse_report_records enable row level security;
alter table public.moral_trade_content_moderation_policies enable row level security;
alter table public.moral_trade_content_moderation_records enable row level security;
