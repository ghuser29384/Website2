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
      'ai_preference_elicitation'
    )
  );

create table if not exists public.moral_trade_ai_preference_elicitation_policies (
  id uuid primary key default gen_random_uuid(),
  policy_snapshot_id uuid not null references public.moral_trade_policy_snapshots (id) on delete restrict,
  release_stage text not null,
  policy_status text not null default 'missing' check (
    policy_status in ('resolved_immutable', 'missing', 'mutable', 'stale', 'superseded')
  ),
  policy_hash text not null check (policy_hash ~ '^sha256:[a-f0-9]{64}$'),
  allowed_scopes text[] not null default array[
    'baseline',
    'caps',
    'side_constraints',
    'empirical_assumptions',
    'cause_buckets',
    'evidence_preferences',
    'fallback_rules',
    'manual_review'
  ],
  allowed_subject_types text[] not null default array[
    'offset_offer',
    'pledge_swap_offer',
    'matched_trade_lock_proposal',
    'common_ground_budget',
    'participant_confirmation_record'
  ],
  allows_preference_structuring_bool boolean not null default true,
  prohibits_hidden_wtp_inference_bool boolean not null default true,
  prohibits_autonomous_counteroffer_bool boolean not null default true,
  prohibits_state_change_from_ai_output_bool boolean not null default true,
  requires_user_edited_structured_input_for_state_change_bool boolean not null default true,
  reviewed_by uuid references public.profiles (id) on delete set null,
  reviewed_at timestamptz,
  expires_at timestamptz,
  superseded_by uuid references public.moral_trade_ai_preference_elicitation_policies (id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (release_stage, policy_snapshot_id),
  check (
    allowed_scopes <@ array[
      'baseline',
      'caps',
      'side_constraints',
      'empirical_assumptions',
      'cause_buckets',
      'evidence_preferences',
      'fallback_rules',
      'manual_review'
    ]
  ),
  check (
    allowed_subject_types <@ array[
      'offset_offer',
      'pledge_swap_offer',
      'matched_trade_lock_proposal',
      'common_ground_budget',
      'participant_confirmation_record'
    ]
  ),
  check (
    policy_status <> 'resolved_immutable'
    or (
      reviewed_at is not null
      and allows_preference_structuring_bool = true
      and prohibits_hidden_wtp_inference_bool = true
      and prohibits_autonomous_counteroffer_bool = true
      and prohibits_state_change_from_ai_output_bool = true
      and requires_user_edited_structured_input_for_state_change_bool = true
    )
  )
);

comment on table public.moral_trade_ai_preference_elicitation_policies is
  'Frozen AI preference-elicitation policies. AI may help structure baselines, caps, side constraints, empirical assumptions, cause buckets, evidence preferences, fallback rules, or manual review, but policy must prohibit hidden WTP inference, autonomous counteroffers, accepted matches, private disclosure, payment authorization, and AI state changes.';

create table if not exists public.moral_trade_ai_preference_elicitation_records (
  id uuid primary key default gen_random_uuid(),
  ai_preference_elicitation_policy_id uuid not null references public.moral_trade_ai_preference_elicitation_policies (id) on delete restrict,
  subject_type text not null check (
    subject_type in (
      'offset_offer',
      'pledge_swap_offer',
      'matched_trade_lock_proposal',
      'common_ground_budget',
      'participant_confirmation_record'
    )
  ),
  subject_ref text not null,
  participant_id_hash text not null check (participant_id_hash ~ '^sha256:[a-f0-9]{64}$'),
  elicitation_scope text not null check (
    elicitation_scope in (
      'baseline',
      'caps',
      'side_constraints',
      'empirical_assumptions',
      'cause_buckets',
      'evidence_preferences',
      'fallback_rules',
      'manual_review'
    )
  ),
  ai_output_hash text not null check (ai_output_hash ~ '^sha256:[a-f0-9]{64}$'),
  user_edited_structured_input_hash text check (
    user_edited_structured_input_hash is null
    or user_edited_structured_input_hash ~ '^sha256:[a-f0-9]{64}$'
  ),
  hidden_willingness_to_pay_inference_prohibited_bool boolean not null default true check (
    hidden_willingness_to_pay_inference_prohibited_bool = true
  ),
  autonomous_counteroffer_or_acceptance_bool boolean not null default false check (
    autonomous_counteroffer_or_acceptance_bool = false
  ),
  state_change_allowed_bool boolean not null default false check (
    state_change_allowed_bool = false
  ),
  participant_confirmation_record_ref text,
  reviewer_decision_ref text,
  elicitation_state text not null default 'sandbox' check (
    elicitation_state in (
      'sandbox',
      'user_reviewed',
      'converted_to_structured_input',
      'discarded',
      'blocked',
      'superseded'
    )
  ),
  raw_prompt_public_bool boolean not null default false,
  raw_ai_output_public_bool boolean not null default false,
  hidden_wtp_estimate_public_bool boolean not null default false,
  hidden_negotiation_moves_public_bool boolean not null default false,
  private_participant_notes_public_bool boolean not null default false,
  reviewer_notes_public_bool boolean not null default false,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (subject_type, subject_ref, participant_id_hash, elicitation_scope, ai_preference_elicitation_policy_id),
  check (
    elicitation_state <> 'converted_to_structured_input'
    or (
      user_edited_structured_input_hash is not null
      and (
        participant_confirmation_record_ref is not null
        or reviewer_decision_ref is not null
      )
    )
  ),
  check (
    raw_prompt_public_bool = false
    and raw_ai_output_public_bool = false
    and hidden_wtp_estimate_public_bool = false
    and hidden_negotiation_moves_public_bool = false
    and private_participant_notes_public_bool = false
    and reviewer_notes_public_bool = false
  )
);

comment on table public.moral_trade_ai_preference_elicitation_records is
  'Hash-backed AI preference-elicitation records. Records preserve a boundary between AI drafting and user-edited structured input, prohibit hidden willingness-to-pay inference, autonomous counteroffers, accepted matches, private disclosure, and state changes, and keep raw AI material private.';

create table if not exists public.moral_trade_ai_preference_elicitation_enforcement_records (
  id uuid primary key default gen_random_uuid(),
  owner_profile_id uuid not null references public.profiles (id) on delete cascade,
  transition text not null check (
    transition in (
      'draft_preference_elicitation',
      'structured_input_conversion',
      'match_candidate_preview',
      'matched_trade_lock',
      'clearing_run_input',
      'counterparty_disclosure',
      'payment_authorization',
      'payment_capture',
      'public_metric_publication',
      'release_gate_promotion'
    )
  ),
  enforcement_status text not null check (enforcement_status in ('pass', 'blocked')),
  ai_preference_elicitation_used_bool boolean not null default false,
  required_policy_count integer not null default 0 check (required_policy_count >= 0),
  required_record_count integer not null default 0 check (required_record_count >= 0),
  immutable_policy_count integer not null default 0 check (immutable_policy_count >= 0),
  converted_structured_input_count integer not null default 0 check (converted_structured_input_count >= 0),
  confirmation_or_reviewer_decision_count integer not null default 0 check (confirmation_or_reviewer_decision_count >= 0),
  policy_record_count integer not null default 0 check (policy_record_count >= 0),
  elicitation_record_count integer not null default 0 check (elicitation_record_count >= 0),
  enforcement_input_json jsonb not null,
  evaluation_result_json jsonb not null,
  blocker_codes text[] not null default '{}',
  user_facing_blocker_categories text[] not null default '{}',
  contract_version text not null,
  validator_version text not null,
  evaluation_hash text not null check (evaluation_hash ~ '^sha256:[a-f0-9]{64}$'),
  idempotency_key text not null,
  structured_input_conversion_allowed_bool boolean not null default false,
  match_candidate_preview_allowed_bool boolean not null default false,
  lock_transition_allowed_bool boolean not null default false,
  clearing_run_input_allowed_bool boolean not null default false,
  counterparty_disclosure_allowed_bool boolean not null default false,
  payment_authorization_allowed_bool boolean not null default false,
  payment_capture_allowed_bool boolean not null default false,
  public_metric_publication_allowed_bool boolean not null default false,
  release_gate_promotion_allowed_bool boolean not null default false,
  superseded_by uuid references public.moral_trade_ai_preference_elicitation_enforcement_records (id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  check (immutable_policy_count <= policy_record_count),
  check (converted_structured_input_count <= elicitation_record_count),
  check (confirmation_or_reviewer_decision_count <= elicitation_record_count),
  check (structured_input_conversion_allowed_bool = false),
  check (match_candidate_preview_allowed_bool = false),
  check (lock_transition_allowed_bool = false),
  check (clearing_run_input_allowed_bool = false),
  check (counterparty_disclosure_allowed_bool = false),
  check (payment_authorization_allowed_bool = false),
  check (payment_capture_allowed_bool = false),
  check (public_metric_publication_allowed_bool = false),
  check (release_gate_promotion_allowed_bool = false),
  unique (owner_profile_id, idempotency_key)
);

comment on table public.moral_trade_ai_preference_elicitation_enforcement_records is
  'Append-only user-owned AI preference-elicitation enforcement records. A record stores normalized AI preference-elicitation policy and record input, deterministic evaluation result, blockers, and evaluation hash while enforcing that enforcement records cannot authorize structured input conversion, matching, clearing, counterparty disclosure, payment authorization, payment capture, public metric publication, or release-gate promotion.';

create index if not exists moral_trade_ai_preference_elicitation_policies_stage_idx
  on public.moral_trade_ai_preference_elicitation_policies (release_stage, policy_status);

create index if not exists moral_trade_ai_preference_elicitation_records_subject_idx
  on public.moral_trade_ai_preference_elicitation_records (subject_type, subject_ref, elicitation_state, created_at desc);

create index if not exists moral_trade_ai_preference_elicitation_records_participant_idx
  on public.moral_trade_ai_preference_elicitation_records (participant_id_hash, elicitation_scope, updated_at desc);
create index if not exists moral_trade_ai_preference_elicitation_enforcement_records_owner_status_idx
  on public.moral_trade_ai_preference_elicitation_enforcement_records (owner_profile_id, enforcement_status, created_at desc);
create index if not exists moral_trade_ai_preference_elicitation_enforcement_records_transition_status_idx
  on public.moral_trade_ai_preference_elicitation_enforcement_records (transition, enforcement_status, created_at desc);
create index if not exists moral_trade_ai_preference_elicitation_enforcement_records_hash_idx
  on public.moral_trade_ai_preference_elicitation_enforcement_records (evaluation_hash, created_at desc);

alter table public.moral_trade_ai_preference_elicitation_policies enable row level security;
alter table public.moral_trade_ai_preference_elicitation_records enable row level security;
alter table public.moral_trade_ai_preference_elicitation_enforcement_records enable row level security;

drop policy if exists "moral_trade_ai_preference_elicitation_enforcement_records_select_owner"
  on public.moral_trade_ai_preference_elicitation_enforcement_records;
create policy "moral_trade_ai_preference_elicitation_enforcement_records_select_owner"
  on public.moral_trade_ai_preference_elicitation_enforcement_records
  for select
  to authenticated
  using (owner_profile_id = auth.uid());

drop policy if exists "moral_trade_ai_preference_elicitation_enforcement_records_insert_owner"
  on public.moral_trade_ai_preference_elicitation_enforcement_records;
create policy "moral_trade_ai_preference_elicitation_enforcement_records_insert_owner"
  on public.moral_trade_ai_preference_elicitation_enforcement_records
  for insert
  to authenticated
  with check (
    owner_profile_id = auth.uid()
    and structured_input_conversion_allowed_bool = false
    and match_candidate_preview_allowed_bool = false
    and lock_transition_allowed_bool = false
    and clearing_run_input_allowed_bool = false
    and counterparty_disclosure_allowed_bool = false
    and payment_authorization_allowed_bool = false
    and payment_capture_allowed_bool = false
    and public_metric_publication_allowed_bool = false
    and release_gate_promotion_allowed_bool = false
  );
