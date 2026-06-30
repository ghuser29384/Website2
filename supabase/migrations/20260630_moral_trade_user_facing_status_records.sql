create table if not exists moral_trade_user_facing_status_policies (
  id uuid primary key default gen_random_uuid(),
  policy_ref text not null unique,
  policy_snapshot_ref text not null,
  policy_snapshot_status text not null check (
    policy_snapshot_status in (
      'resolved_immutable',
      'missing',
      'mutable',
      'stale',
      'superseded'
    )
  ),
  status text not null default 'active' check (status in ('active', 'draft', 'superseded')),
  max_key_facts integer not null default 6 check (max_key_facts between 1 and 6),
  forbidden_primary_copy_terms text[] not null default array[
    'reviewer_note',
    'source_hash',
    'provider_payload',
    'policy_snapshot_json',
    'exact_private_cap',
    'private_surplus',
    'security_signal',
    'raw_evidence',
    'counterparty_identity'
  ],
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists moral_trade_user_facing_status_records (
  id uuid primary key default gen_random_uuid(),
  status_record_ref text not null unique,
  subject_type text not null check (
    subject_type in (
      'offset_offer',
      'pledge_swap_offer',
      'cleared_trade_agreement',
      'payout_milestone',
      'evidence_record',
      'dispute_case',
      'appeal_case',
      'payment_event',
      'privacy_grant',
      'contact_interaction_record',
      'abuse_report_record',
      'public_receipt_card_record'
    )
  ),
  subject_ref text not null,
  status_policy_ref text not null,
  policy_snapshot_status text not null check (
    policy_snapshot_status in (
      'resolved_immutable',
      'missing',
      'mutable',
      'stale',
      'superseded'
    )
  ),
  status text not null check (
    status in (
      'ready_to_preview',
      'needs_your_confirmation',
      'waiting_for_review',
      'blocked_safety_legal_privacy',
      'payment_not_authorized',
      'payout_not_releasable_yet',
      'closed_refunded_cancelled'
    )
  ),
  safe_reason_category text not null,
  summary text not null check (char_length(summary) between 1 and 180),
  key_facts_jsonb jsonb not null default '[]'::jsonb check (
    jsonb_typeof(key_facts_jsonb) = 'array'
    and jsonb_array_length(key_facts_jsonb) between 1 and 6
  ),
  next_action text not null,
  correction_path text,
  appeal_path text,
  money_effect text not null check (
    money_effect in (
      'none',
      'authorization_not_started',
      'authorization_pending',
      'authorization_blocked',
      'captured_not_releasable',
      'refund_or_cancellation_pending',
      'closed_no_money_movement'
    )
  ),
  obligation_effect text not null check (
    obligation_effect in (
      'none',
      'draft_only',
      'confirmation_required',
      'locked_but_not_releasable',
      'released_from_future_obligations',
      'closed_no_future_obligations'
    )
  ),
  maximum_exposure_shown_bool boolean not null default false,
  no_trade_comparison_shown_bool boolean not null default false,
  privacy_change_shown_bool boolean not null default false,
  evidence_burden_shown_bool boolean not null default false,
  failure_refund_behavior_shown_bool boolean not null default false,
  remaining_uncertainty_shown_bool boolean not null default false,
  private_details_redacted_bool boolean not null default true check (
    private_details_redacted_bool = true
  ),
  details_drawer_available_bool boolean not null default true check (
    details_drawer_available_bool = true
  ),
  source_control_refs text[] not null default '{}' check (cardinality(source_control_refs) > 0),
  forbidden_terms_present text[] not null default '{}' check (
    cardinality(forbidden_terms_present) = 0
  ),
  primary_copy_contains_internal_codes_bool boolean not null default false check (
    primary_copy_contains_internal_codes_bool = false
  ),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint moral_trade_user_facing_status_policy_immutable check (
    policy_snapshot_status = 'resolved_immutable'
  ),
  constraint moral_trade_user_facing_adverse_status_has_paths check (
    status not in (
      'blocked_safety_legal_privacy',
      'payment_not_authorized',
      'payout_not_releasable_yet'
    )
    or (correction_path is not null and appeal_path is not null)
  ),
  constraint moral_trade_user_facing_material_disclosures_present check (
    (
      status not in ('needs_your_confirmation')
      and money_effect = 'none'
      and obligation_effect = 'none'
    )
    or (
      maximum_exposure_shown_bool = true
      and no_trade_comparison_shown_bool = true
      and privacy_change_shown_bool = true
      and evidence_burden_shown_bool = true
      and failure_refund_behavior_shown_bool = true
      and remaining_uncertainty_shown_bool = true
    )
  )
);

create index if not exists moral_trade_user_facing_status_subject_idx
  on moral_trade_user_facing_status_records (subject_type, subject_ref);

create index if not exists moral_trade_user_facing_status_status_idx
  on moral_trade_user_facing_status_records (status);

alter table moral_trade_user_facing_status_policies enable row level security;
alter table moral_trade_user_facing_status_records enable row level security;

comment on table moral_trade_user_facing_status_policies is
  'Immutable policy snapshot references for participant-facing status copy, blocker explanation, next action, and disclosure rules.';

comment on table moral_trade_user_facing_status_records is
  'First-class participant-facing status records that translate control-plane state into plain-language summaries, key facts, next action, material disclosures, and appeal or correction paths without exposing internal codes or private details.';
