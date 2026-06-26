create table if not exists public.moral_trade_public_receipt_cards (
  id uuid primary key default gen_random_uuid(),
  receipt_ref text not null unique,
  subject_type text not null check (
    subject_type in ('donation_offset_agreement', 'pledge_swap_agreement')
  ),
  subject_ref text not null,
  owner_profile_id uuid references public.profiles(id) on delete set null,
  claim_kind text not null check (claim_kind in ('donation_offset', 'pledge_swap')),
  visibility_state text not null default 'private_preview' check (
    visibility_state in ('private_preview', 'opt_in_public', 'revoked')
  ),
  correction_status text not null default 'none' check (
    correction_status in ('none', 'correction_requested', 'corrected', 'revoked')
  ),
  causal_wording_state text not null default 'trade_conditioned' check (
    causal_wording_state in ('trade_conditioned', 'trade_unlocked')
  ),
  personal_contribution_state text not null check (
    personal_contribution_state in (
      'verified_new',
      'verified_already_counted',
      'ordinary_verified_not_parity',
      'suppressed_uncertain'
    )
  ),
  public_title text not null,
  public_action_summary text not null,
  claim_copy text not null,
  personal_contribution_line text not null,
  trade_conditioned_contribution_line text not null,
  trade_unlocked_contribution_line text,
  total_verified_recipient_transfer_line text not null,
  direct_donation_parity_note text not null,
  net_attribution_note text not null,
  verification_handle text not null,
  issued_at timestamptz not null,
  current_status text not null default 'current' check (
    current_status in ('current', 'corrected', 'revoked', 'superseded')
  ),
  participant_opt_in_bool boolean not null default false,
  reviewed_bool boolean not null default false,
  sensitive_action_redacted_bool boolean not null default false,
  publication_gate_states_jsonb jsonb not null check (
    jsonb_typeof(publication_gate_states_jsonb) = 'object'
    and publication_gate_states_jsonb ?& array[
      'reconciliation',
      'challenge_window',
      'privacy_publication',
      'recipient_acceptance_adverse_association',
      'content_moderation',
      'public_metric_release'
    ]
    and (publication_gate_states_jsonb ->> 'reconciliation') in (
      'passed',
      'not_required_for_stage',
      'missing',
      'under_review',
      'blocked',
      'stale'
    )
    and (publication_gate_states_jsonb ->> 'challenge_window') in (
      'passed',
      'not_required_for_stage',
      'missing',
      'under_review',
      'blocked',
      'stale'
    )
    and (publication_gate_states_jsonb ->> 'privacy_publication') in (
      'passed',
      'not_required_for_stage',
      'missing',
      'under_review',
      'blocked',
      'stale'
    )
    and (publication_gate_states_jsonb ->> 'recipient_acceptance_adverse_association') in (
      'passed',
      'not_required_for_stage',
      'missing',
      'under_review',
      'blocked',
      'stale'
    )
    and (publication_gate_states_jsonb ->> 'content_moderation') in (
      'passed',
      'not_required_for_stage',
      'missing',
      'under_review',
      'blocked',
      'stale'
    )
    and (publication_gate_states_jsonb ->> 'public_metric_release') in (
      'passed',
      'not_required_for_stage',
      'missing',
      'under_review',
      'blocked',
      'stale'
    )
  ),
  check (
    visibility_state <> 'opt_in_public'
    or (
      participant_opt_in_bool
      and reviewed_bool
      and sensitive_action_redacted_bool
      and (publication_gate_states_jsonb ->> 'reconciliation') in ('passed', 'not_required_for_stage')
      and (publication_gate_states_jsonb ->> 'challenge_window') in ('passed', 'not_required_for_stage')
      and (publication_gate_states_jsonb ->> 'privacy_publication') in ('passed', 'not_required_for_stage')
      and (publication_gate_states_jsonb ->> 'recipient_acceptance_adverse_association') in ('passed', 'not_required_for_stage')
      and (publication_gate_states_jsonb ->> 'content_moderation') in ('passed', 'not_required_for_stage')
      and (publication_gate_states_jsonb ->> 'public_metric_release') in ('passed', 'not_required_for_stage')
    )
  ),
  policy_snapshot_ref text not null,
  policy_snapshot_hash text not null check (policy_snapshot_hash ~ '^sha256:[a-f0-9]{64}$'),
  term_sheet_ref text,
  marketplace_state_event_ref text,
  raw_evidence_public_bool boolean not null default false check (raw_evidence_public_bool = false),
  private_counterparty_public_bool boolean not null default false check (private_counterparty_public_bool = false),
  engagement_counter_public_bool boolean not null default false check (engagement_counter_public_bool = false),
  publication_affects_marketplace_priority_bool boolean not null default false check (
    publication_affects_marketplace_priority_bool = false
  ),
  publication_required_as_trade_term_bool boolean not null default false check (
    publication_required_as_trade_term_bool = false
  ),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.moral_trade_public_receipt_claim_reviews (
  id uuid primary key default gen_random_uuid(),
  receipt_ref text not null references public.moral_trade_public_receipt_cards(receipt_ref) on delete cascade,
  claim_review_ref text not null unique,
  claim_key text not null check (
    claim_key in (
      'verified',
      'recipient_transfer',
      'trade_conditioned',
      'trade_unlocked',
      'additional',
      'matched',
      'completed',
      'impact',
      'personal_contribution',
      'direct_donation_parity'
    )
  ),
  review_state text not null check (
    review_state in ('passed', 'not_required_for_stage', 'missing', 'blocked', 'stale')
  ),
  supporting_record_ref text,
  reviewer_decision_ref text,
  policy_snapshot_ref text not null,
  checked_at timestamptz not null,
  expires_at timestamptz,
  reviewer_notes_public_bool boolean not null default false check (reviewer_notes_public_bool = false),
  raw_evidence_public_bool boolean not null default false check (raw_evidence_public_bool = false),
  created_at timestamptz not null default now(),
  unique (receipt_ref, claim_key, policy_snapshot_ref)
);

create table if not exists public.moral_trade_public_receipt_publication_controls (
  id uuid primary key default gen_random_uuid(),
  receipt_ref text not null references public.moral_trade_public_receipt_cards(receipt_ref) on delete cascade,
  control_ref text not null unique,
  reconciliation_state text not null,
  check (reconciliation_state in ('passed', 'not_required_for_stage', 'missing', 'under_review', 'blocked', 'stale')),
  challenge_window_state text not null,
  check (challenge_window_state in ('passed', 'not_required_for_stage', 'missing', 'under_review', 'blocked', 'stale')),
  privacy_publication_state text not null,
  check (privacy_publication_state in ('passed', 'not_required_for_stage', 'missing', 'under_review', 'blocked', 'stale')),
  recipient_acceptance_adverse_association_state text not null,
  check (
    recipient_acceptance_adverse_association_state in (
      'passed',
      'not_required_for_stage',
      'missing',
      'under_review',
      'blocked',
      'stale'
    )
  ),
  content_moderation_state text not null,
  check (content_moderation_state in ('passed', 'not_required_for_stage', 'missing', 'under_review', 'blocked', 'stale')),
  public_metric_release_state text not null,
  check (public_metric_release_state in ('passed', 'not_required_for_stage', 'missing', 'under_review', 'blocked', 'stale')),
  publication_required_as_trade_term_bool boolean not null default false check (
    publication_required_as_trade_term_bool = false
  ),
  publication_affects_matching_or_review_bool boolean not null default false check (
    publication_affects_matching_or_review_bool = false
  ),
  public_engagement_counters_bool boolean not null default false check (
    public_engagement_counters_bool = false
  ),
  profile_or_search_boost_bool boolean not null default false check (
    profile_or_search_boost_bool = false
  ),
  recommendation_or_priority_boost_bool boolean not null default false check (
    recommendation_or_priority_boost_bool = false
  ),
  sidecar_only_bool boolean not null default true check (sidecar_only_bool = true),
  review_decision_ref text,
  marketplace_state_event_ref text,
  created_at timestamptz not null default now(),
  unique (receipt_ref, control_ref)
);

create table if not exists public.moral_trade_public_receipt_corrections (
  id uuid primary key default gen_random_uuid(),
  receipt_ref text not null references public.moral_trade_public_receipt_cards(receipt_ref) on delete cascade,
  correction_ref text not null unique,
  correction_state text not null check (
    correction_state in ('correction_requested', 'corrected', 'revoked', 'superseded', 'suppressed')
  ),
  safe_public_status text not null,
  reason_category text not null,
  supersedes_receipt_ref text,
  reviewer_decision_ref text,
  notice_record_ref text,
  private_evidence_public_bool boolean not null default false check (private_evidence_public_bool = false),
  counterparty_data_public_bool boolean not null default false check (counterparty_data_public_bool = false),
  created_at timestamptz not null default now()
);

create table if not exists public.moral_trade_public_receipt_verification_events (
  id uuid primary key default gen_random_uuid(),
  receipt_ref text not null references public.moral_trade_public_receipt_cards(receipt_ref) on delete cascade,
  verification_event_ref text not null unique,
  verification_status text not null check (
    verification_status in ('current', 'corrected', 'revoked', 'superseded', 'suppressed', 'not_found')
  ),
  verification_handle text not null,
  checked_at timestamptz not null,
  policy_snapshot_ref text not null,
  safe_public_message text not null,
  raw_evidence_public_bool boolean not null default false check (raw_evidence_public_bool = false),
  private_counterparty_public_bool boolean not null default false check (private_counterparty_public_bool = false),
  created_at timestamptz not null default now()
);

create index if not exists moral_trade_public_receipt_cards_subject_idx
  on public.moral_trade_public_receipt_cards (subject_type, subject_ref, visibility_state, created_at desc);

create index if not exists moral_trade_public_receipt_cards_owner_idx
  on public.moral_trade_public_receipt_cards (owner_profile_id, visibility_state, created_at desc);

create index if not exists moral_trade_public_receipt_claim_reviews_receipt_idx
  on public.moral_trade_public_receipt_claim_reviews (receipt_ref, claim_key, review_state, checked_at desc);

create index if not exists moral_trade_public_receipt_publication_controls_receipt_idx
  on public.moral_trade_public_receipt_publication_controls (receipt_ref, created_at desc);

create index if not exists moral_trade_public_receipt_verification_events_receipt_idx
  on public.moral_trade_public_receipt_verification_events (receipt_ref, verification_status, checked_at desc);

alter table public.moral_trade_public_receipt_cards enable row level security;
alter table public.moral_trade_public_receipt_claim_reviews enable row level security;
alter table public.moral_trade_public_receipt_publication_controls enable row level security;
alter table public.moral_trade_public_receipt_corrections enable row level security;
alter table public.moral_trade_public_receipt_verification_events enable row level security;

comment on table public.moral_trade_public_receipt_cards is
  'Opt-in public receipt card source-of-truth records for completed non-public-goods Moral Trade. Receipt cards are sidecar verification records, not moral scores, rankings, trade terms, matching priority, payout conditions, or platform endorsements.';

comment on table public.moral_trade_public_receipt_claim_reviews is
  'Claim-hygiene review records for public receipt wording. Additional, unlocked, matched, completed, verified, impact, personal-contribution, and parity claims must map to reviewed support before publication.';

comment on table public.moral_trade_public_receipt_publication_controls is
  'Fail-closed public receipt publication controls. Reconciliation, challenge-window, privacy-publication, recipient/adverse-association, content-moderation, and public-metric-release gates must be non-blocking, and publication remains sidecar-only.';

comment on table public.moral_trade_public_receipt_corrections is
  'Correction, revocation, supersession, and suppression records for public receipt cards. Public verification shows safe status without private evidence or counterparty data.';

comment on table public.moral_trade_public_receipt_verification_events is
  'Privacy-safe verification events for public receipt handles. Verification events report current status without exposing raw evidence, private counterparties, exact caps, or private surplus.';
