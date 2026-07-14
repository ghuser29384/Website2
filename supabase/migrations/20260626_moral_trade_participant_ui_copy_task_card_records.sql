create table if not exists public.moral_trade_plain_language_copy_policies (
  id uuid primary key default gen_random_uuid(),
  policy_ref text not null unique,
  policy_version text not null,
  approval_state text not null check (
    approval_state in ('draft', 'approved', 'superseded', 'revoked')
  ),
  approved_at timestamptz,
  expires_at timestamptz,
  stable_term_map jsonb not null,
  banned_primary_copy_terms text[] not null default '{}'::text[],
  material_disclosure_requirements text[] not null default '{}'::text[],
  reviewer_console_case_ref text,
  created_at timestamptz not null default now()
);

create table if not exists public.moral_trade_participant_ui_render_snapshots (
  id uuid primary key default gen_random_uuid(),
  snapshot_ref text not null unique,
  surface text not null check (
    surface in (
      'intake_triage',
      'template_gallery',
      'guided_builder',
      'draft_preview',
      'review_queue_status',
      'matched_trade_lock_proposal',
      'final_lock_confirmation',
      'participant_dashboard',
      'public_receipt_card_preview',
      'public_receipt_card_publication'
    )
  ),
  copy_policy_ref text not null,
  copy_version text not null,
  language text not null default 'en-US',
  visible_field_set text[] not null default '{}'::text[],
  hidden_redacted_field_set text[] not null default '{}'::text[],
  accessibility_state jsonb not null,
  term_sheet_hash_shown text,
  max_exposure_shown text,
  primary_cta_label text not null,
  secondary_cta_labels text[] not null default '{}'::text[],
  comprehension_prompt_shown text,
  snapshot_hash text not null check (snapshot_hash ~ '^sha256:[a-f0-9]{64}$'),
  private_data_redacted_bool boolean not null default true check (private_data_redacted_bool = true),
  created_at timestamptz not null default now()
);

create table if not exists public.moral_trade_participant_explanation_records (
  id uuid primary key default gen_random_uuid(),
  explanation_ref text not null unique,
  surface text not null check (
    surface in (
      'intake_triage',
      'template_gallery',
      'guided_builder',
      'draft_preview',
      'review_queue_status',
      'matched_trade_lock_proposal',
      'final_lock_confirmation',
      'participant_dashboard',
      'public_receipt_card_preview',
      'public_receipt_card_publication'
    )
  ),
  copy_policy_ref text not null,
  render_snapshot_ref text,
  one_sentence_summary text not null,
  key_facts text[] not null default '{}'::text[] check (cardinality(key_facts) <= 5),
  next_action text not null,
  optional_details_drawer text[] not null default '{}'::text[],
  stable_term_keys text[] not null default '{}'::text[],
  material_disclosures text[] not null default '{}'::text[],
  public_receipt_preview_questions_answered text[] not null default '{}'::text[],
  primary_copy_internal_jargon_bool boolean not null default false check (primary_copy_internal_jargon_bool = false),
  created_at timestamptz not null default now()
);

create table if not exists public.moral_trade_participant_task_cards (
  id uuid primary key default gen_random_uuid(),
  task_card_ref text not null unique,
  surface text not null check (
    surface in (
      'intake_triage',
      'template_gallery',
      'guided_builder',
      'draft_preview',
      'review_queue_status',
      'matched_trade_lock_proposal',
      'final_lock_confirmation',
      'participant_dashboard',
      'public_receipt_card_preview',
      'public_receipt_card_publication'
    )
  ),
  explanation_ref text not null,
  task_card_status_label text not null,
  one_sentence_summary text not null,
  key_facts text[] not null default '{}'::text[] check (cardinality(key_facts) <= 5),
  primary_action text not null,
  secondary_actions text[] not null default '{}'::text[],
  single_primary_action_bool boolean not null default true check (single_primary_action_bool = true),
  safe_template_default_disclosure text,
  safe_template_default_facts_shown text[] not null default '{}'::text[],
  public_display_default_shown_bool boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists moral_trade_plain_language_copy_policies_state_idx
on public.moral_trade_plain_language_copy_policies (approval_state, policy_version, created_at desc);

create index if not exists moral_trade_participant_ui_render_snapshots_surface_idx
on public.moral_trade_participant_ui_render_snapshots (surface, copy_policy_ref, created_at desc);

create index if not exists moral_trade_participant_explanation_records_surface_idx
on public.moral_trade_participant_explanation_records (surface, copy_policy_ref, created_at desc);

create index if not exists moral_trade_participant_task_cards_surface_idx
on public.moral_trade_participant_task_cards (surface, explanation_ref, created_at desc);

alter table public.moral_trade_plain_language_copy_policies enable row level security;
alter table public.moral_trade_participant_ui_render_snapshots enable row level security;
alter table public.moral_trade_participant_explanation_records enable row level security;
alter table public.moral_trade_participant_task_cards enable row level security;

comment on table public.moral_trade_plain_language_copy_policies is
  'Approved participant-facing Moral Trade copy policy. Stores stable term labels, banned primary-copy terms, and material disclosure requirements so user-facing screens translate control-plane states instead of exposing internal jargon.';

comment on table public.moral_trade_participant_ui_render_snapshots is
  'Privacy-safe hash-backed render snapshots for reliance-bearing, money-affecting, privacy-disclosing, evidence-submitting, and public-receipt screens. Snapshots bind visible fields, redacted fields, accessibility state, term-sheet hash, maximum exposure, and CTA labels.';

comment on table public.moral_trade_participant_explanation_records is
  'Participant-facing explanation records for one-sentence summaries, bounded key facts, next actions, details drawers, stable term keys, material disclosures, and public receipt preview question coverage.';

comment on table public.moral_trade_participant_task_cards is
  'Participant task-card records enforcing one status label, one plain-language sentence, no more than five key facts, exactly one primary action, and visible safe-template-default disclosures before preview, lock, or public receipt publication.';
