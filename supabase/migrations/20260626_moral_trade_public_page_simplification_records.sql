create table if not exists public.moral_trade_public_page_plain_language_copy_policies (
  id uuid primary key default gen_random_uuid(),
  policy_ref text not null unique,
  policy_version text not null,
  approval_state text not null check (
    approval_state in ('draft', 'approved', 'superseded', 'revoked')
  ),
  public_page_default_shape jsonb not null,
  approved_status_labels text[] not null default '{}'::text[],
  approved_offer_tab_order text[] not null default '{}'::text[],
  donation_offset_plain_label_map jsonb not null default '{}'::jsonb,
  validation_status_labels text[] not null default '{}'::text[],
  paid_action_safe_alternatives text[] not null default '{}'::text[],
  banned_primary_copy_patterns text[] not null default '{}'::text[],
  approved_at timestamptz,
  expires_at timestamptz,
  reviewer_console_case_ref text,
  created_at timestamptz not null default now()
);

create table if not exists public.moral_trade_route_simplification_audit_records (
  id uuid primary key default gen_random_uuid(),
  audit_ref text not null unique,
  route_key text not null check (
    route_key in (
      'offers_new_offset',
      'offers',
      'donation_offsets',
      'pledge_swaps',
      'moral_trade',
      'how_it_works',
      'validation',
      'paid_action_offers',
      'worked_example_detail',
      'create_similar'
    )
  ),
  route_path text not null,
  source_path text not null,
  copy_policy_ref text not null,
  one_sentence_hero text not null,
  primary_cta text not null,
  secondary_cta text,
  status_strip text[] not null default '{}'::text[],
  qa_contexts text[] not null default '{}'::text[],
  evidence_artifact_refs text[] not null default '{}'::text[],
  user_facing_next_action text not null,
  correction_path text not null,
  details_drawer_label text not null,
  advanced_details_collapsed_by_default_bool boolean not null default true check (advanced_details_collapsed_by_default_bool = true),
  factor_codes_hidden_from_primary_copy_bool boolean not null default true check (factor_codes_hidden_from_primary_copy_bool = true),
  internal_enums_hidden_from_primary_copy_bool boolean not null default true check (internal_enums_hidden_from_primary_copy_bool = true),
  route_fallback_diagnostics_hidden_bool boolean not null default true check (route_fallback_diagnostics_hidden_bool = true),
  no_impact_score_default_surface_bool boolean not null default true check (no_impact_score_default_surface_bool = true),
  no_long_duration_default_pledge_bool boolean not null default true check (no_long_duration_default_pledge_bool = true),
  no_competing_primary_ctas_bool boolean not null default true check (no_competing_primary_ctas_bool = true),
  default_cards_max_facts integer not null default 6 check (default_cards_max_facts between 1 and 6),
  signed_out_local_preview_allowed_bool boolean not null default false,
  route_fallback_copy_ref text,
  created_at timestamptz not null default now()
);

create table if not exists public.moral_trade_public_page_qa_artifacts (
  id uuid primary key default gen_random_uuid(),
  artifact_ref text not null unique,
  audit_ref text not null,
  route_key text not null,
  qa_context text not null check (
    qa_context in (
      'default_desktop',
      'default_mobile',
      'signed_out',
      'signed_in_draft',
      'empty_state',
      'blocked_state',
      'details_drawer',
      'final_confirmation_or_publication'
    )
  ),
  artifact_uri text not null,
  artifact_hash text check (artifact_hash is null or artifact_hash ~ '^sha256:[a-f0-9]{64}$'),
  viewport_width integer check (viewport_width is null or viewport_width > 0),
  viewport_height integer check (viewport_height is null or viewport_height > 0),
  privacy_safe_bool boolean not null default true check (privacy_safe_bool = true),
  captured_at timestamptz not null,
  created_at timestamptz not null default now()
);

create table if not exists public.moral_trade_route_fallback_copy_records (
  id uuid primary key default gen_random_uuid(),
  fallback_copy_ref text not null unique,
  route_key text not null,
  title text not null check (title = 'This page did not load.'),
  body text not null check (body = 'No draft was submitted and no review state changed.'),
  actions text[] not null check (
    cardinality(actions) = 4 and
    actions @> array['Retry', 'Go to examples', 'Go to start', 'Contact support']::text[]
  ),
  route_fallback_diagnostics_hidden_bool boolean not null default true check (route_fallback_diagnostics_hidden_bool = true),
  created_at timestamptz not null default now()
);

create index if not exists moral_trade_route_simplification_audit_route_idx
on public.moral_trade_route_simplification_audit_records (route_key, route_path, created_at desc);

create index if not exists moral_trade_public_page_qa_artifacts_route_idx
on public.moral_trade_public_page_qa_artifacts (route_key, qa_context, captured_at desc);

create index if not exists moral_trade_public_page_plain_language_policy_state_idx
on public.moral_trade_public_page_plain_language_copy_policies (approval_state, policy_version, created_at desc);

alter table public.moral_trade_public_page_plain_language_copy_policies enable row level security;
alter table public.moral_trade_route_simplification_audit_records enable row level security;
alter table public.moral_trade_public_page_qa_artifacts enable row level security;
alter table public.moral_trade_route_fallback_copy_records enable row level security;

comment on table public.moral_trade_public_page_plain_language_copy_policies is
  'Approved route-level plain-language copy policy for Moral Trade public pages. Stores the default page shape, tab order, plain donation-offset labels, validation status labels, paid-action alternatives, and banned primary-copy patterns.';

comment on table public.moral_trade_route_simplification_audit_records is
  'Route simplification audit records for moraltrade82 public pages. Each record binds source path, status strip, primary CTA, details drawer, hidden technical diagnostics, bounded card facts, and signed-out preview state where applicable.';

comment on table public.moral_trade_public_page_qa_artifacts is
  'Privacy-safe QA artifact registry for public-page simplification evidence across desktop, mobile, signed-out, signed-in draft, empty, blocked, details, and final confirmation or publication states.';

comment on table public.moral_trade_route_fallback_copy_records is
  'Short route fallback copy records. Fallbacks must state that the page did not load and that no draft or review state changed, with only retry, examples, start, and support actions.';
