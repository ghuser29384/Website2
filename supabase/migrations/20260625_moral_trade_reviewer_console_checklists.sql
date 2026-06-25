create table if not exists public.moral_trade_reviewer_console_cases (
  id uuid primary key default gen_random_uuid(),
  case_ref text not null unique,
  surface text not null check (
    surface in (
      'matched_trade_lock_review',
      'participant_ui_copy_review',
      'template_default_review',
      'public_receipt_publication_review',
      'appeal_or_dispute_review'
    )
  ),
  subject_type text not null,
  subject_ref text not null,
  policy_snapshot_status text not null check (
    policy_snapshot_status in ('resolved_immutable', 'missing', 'mutable', 'stale', 'superseded')
  ),
  reviewer_conflict_state text not null check (
    reviewer_conflict_state in (
      'none_declared',
      'disclosed_nonblocking',
      'missing',
      'unresolved',
      'conflicted',
      'superseded'
    )
  ),
  neutral_assignment_state text not null check (
    neutral_assignment_state in (
      'neutral_reviewer_assigned',
      'panel_assigned',
      'not_required_for_stage',
      'missing',
      'conflicted',
      'stale',
      'superseded'
    )
  ),
  neutral_assignment_ref text,
  review_decision_ref text,
  marketplace_state_event_ref text,
  checked_at timestamptz not null,
  expires_at timestamptz,
  reviewer_identity_public_bool boolean not null default false check (reviewer_identity_public_bool = false),
  reviewer_notes_public_bool boolean not null default false check (reviewer_notes_public_bool = false),
  conflict_facts_public_bool boolean not null default false check (conflict_facts_public_bool = false),
  created_at timestamptz not null default now()
);

create table if not exists public.moral_trade_reviewer_console_check_results (
  id uuid primary key default gen_random_uuid(),
  reviewer_console_case_id uuid not null references public.moral_trade_reviewer_console_cases(id) on delete cascade,
  case_ref text not null,
  check_key text not null check (
    check_key in (
      'plain_language_copy',
      'material_omission',
      'task_card_single_primary_action',
      'safe_template_default_disclosure',
      'privacy_publication',
      'recipient_association',
      'content_moderation',
      'verified_claims',
      'direct_donation_parity_non_preference',
      'net_personal_contribution',
      'reimbursement_subsidy_disclosure',
      'sensitive_action_redaction',
      'publication_pressure',
      'no_moral_score_language',
      'anti_gamification',
      'no_publicity_as_trade_term',
      'verification_url_status',
      'correction_revocation'
    )
  ),
  check_status text not null check (
    check_status in ('passed', 'not_required_for_stage', 'missing', 'under_review', 'failed', 'stale', 'superseded')
  ),
  policy_snapshot_status text not null check (
    policy_snapshot_status in ('resolved_immutable', 'missing', 'mutable', 'stale', 'superseded')
  ),
  review_decision_ref text,
  user_facing_category text not null,
  checked_at timestamptz not null,
  expires_at timestamptz,
  reviewer_notes_public_bool boolean not null default false check (reviewer_notes_public_bool = false),
  raw_evidence_public_bool boolean not null default false check (raw_evidence_public_bool = false),
  created_at timestamptz not null default now(),
  unique (case_ref, check_key)
);

create table if not exists public.moral_trade_reviewer_console_panel_assignments (
  id uuid primary key default gen_random_uuid(),
  assignment_ref text not null unique,
  case_ref text not null,
  assignment_state text not null check (
    assignment_state in (
      'neutral_reviewer_assigned',
      'panel_assigned',
      'not_required_for_stage',
      'missing',
      'conflicted',
      'stale',
      'superseded'
    )
  ),
  neutral_reviewer_count integer not null default 0 check (neutral_reviewer_count >= 0),
  panel_member_count integer not null default 0 check (panel_member_count >= 0),
  conflict_screening_state text not null check (
    conflict_screening_state in (
      'none_declared',
      'disclosed_nonblocking',
      'missing',
      'unresolved',
      'conflicted',
      'superseded'
    )
  ),
  reviewer_identity_public_bool boolean not null default false check (reviewer_identity_public_bool = false),
  conflict_facts_public_bool boolean not null default false check (conflict_facts_public_bool = false),
  created_at timestamptz not null default now()
);

create table if not exists public.moral_trade_public_receipt_publication_reviews (
  id uuid primary key default gen_random_uuid(),
  case_ref text not null unique,
  receipt_ref text not null,
  privacy_publication_status text not null,
  recipient_association_status text not null,
  content_moderation_status text not null,
  verified_claims_status text not null,
  direct_donation_parity_non_preference_status text not null,
  net_personal_contribution_status text not null,
  reimbursement_subsidy_disclosure_status text not null,
  sensitive_action_redaction_status text not null,
  publication_pressure_status text not null,
  no_moral_score_language_status text not null,
  anti_gamification_status text not null,
  no_publicity_as_trade_term_status text not null,
  verification_url_status text not null,
  correction_revocation_status text not null,
  review_decision_ref text not null,
  marketplace_state_event_ref text not null,
  reviewer_notes_public_bool boolean not null default false check (reviewer_notes_public_bool = false),
  raw_evidence_public_bool boolean not null default false check (raw_evidence_public_bool = false),
  created_at timestamptz not null default now()
);

create index if not exists moral_trade_reviewer_console_cases_surface_idx
on public.moral_trade_reviewer_console_cases (surface, policy_snapshot_status, reviewer_conflict_state, neutral_assignment_state, created_at desc);

create index if not exists moral_trade_reviewer_console_check_results_case_idx
on public.moral_trade_reviewer_console_check_results (case_ref, check_key, check_status, created_at desc);

alter table public.moral_trade_reviewer_console_cases enable row level security;
alter table public.moral_trade_reviewer_console_check_results enable row level security;
alter table public.moral_trade_reviewer_console_panel_assignments enable row level security;
alter table public.moral_trade_public_receipt_publication_reviews enable row level security;

comment on table public.moral_trade_reviewer_console_cases is
  'Fail-closed Moral Trade reviewer-console case records. Cases bind conflict state, neutral reviewer or panel assignment, immutable policy snapshot, review decision, marketplace state event, and private-boundary flags before reviewer outcomes can affect reliance-bearing or publication surfaces.';

comment on table public.moral_trade_reviewer_console_check_results is
  'Reviewer-console checklist results for plain-language copy, material omission, task-card single-primary-action, safe-template-default disclosure, and public receipt publication checks. Reviewer notes and raw evidence stay private.';

comment on table public.moral_trade_public_receipt_publication_reviews is
  'Public receipt card publication review sidecar. Publication checks include privacy, recipient association, content moderation, verified claims, direct-donation parity non-preference, net personal contribution, reimbursement or subsidy disclosure, sensitive-action redaction, publication pressure, no moral-score language, anti-gamification, no publicity as a trade term, verification URL/status, and correction or revocation behavior.';
