-- Donation Cancellation Clearinghouse v0.1 persistent records.
-- Status: NON-MVP. This is a labs/research mechanism, not the current Direct
-- Capped CGPP MVP. Production public registration, provider authorization,
-- capture, donation routing, settlement execution, and public report publishing
-- remain disabled unless a later reviewed promotion changes this classification.

create table if not exists public.donation_cancellation_rounds (
  id text primary key,
  slug text not null unique,
  title text not null,
  description text not null,
  status text not null check (
    status in (
      'draft',
      'preflight',
      'open',
      'closed_to_new_registrations',
      'matching',
      'suggestions_pending',
      'routing',
      'settled',
      'released',
      'non_mvp_disabled',
      'blocked',
      'canceled'
    )
  ),
  currency text not null check (currency ~ '^[a-z]{3}$'),
  opens_at timestamptz not null,
  closes_at timestamptz not null,
  routing_deadline_at timestamptz not null,
  parameters_frozen_at timestamptz not null,
  feature_flag text not null default 'donation_cancellation_clearinghouse_v0_1',
  feature_classification text not null default 'non_mvp' check (feature_classification = 'non_mvp'),
  deployment_stage text not null default 'labs_research_non_mvp' check (deployment_stage = 'labs_research_non_mvp'),
  default_enabled boolean not null default false check (default_enabled = false),
  production_public_enabled boolean not null default false check (production_public_enabled = false),
  production_real_money_enabled boolean not null default false check (production_real_money_enabled = false),
  primary_nav_enabled boolean not null default false check (primary_nav_enabled = false),
  mvp_surface_enabled boolean not null default false check (mvp_surface_enabled = false),
  cgpp_surface_enabled boolean not null default false check (cgpp_surface_enabled = false),
  requires_admin_or_labs_access boolean not null default true check (requires_admin_or_labs_access = true),
  requires_explicit_promotion_record boolean not null default true check (requires_explicit_promotion_record = true),
  payment_mode text not null check (
    payment_mode in (
      'dev_simulated_capture',
      'provider_authorization_then_capture',
      'provider_capture_to_compliant_clearing_account'
    )
  ),
  round_gross_cap_minor integer not null check (round_gross_cap_minor >= 0),
  per_user_gross_min_minor integer not null check (per_user_gross_min_minor >= 0),
  per_user_gross_max_minor integer not null check (per_user_gross_max_minor >= per_user_gross_min_minor),
  rulebook_hash text not null check (rulebook_hash ~ '^sha256:[a-f0-9]{64}$'),
  fee_policy_hash text not null check (fee_policy_hash ~ '^sha256:[a-f0-9]{64}$'),
  matching_algorithm_version text not null,
  suggestion_algorithm_version text not null,
  copy_preflight_state text not null check (copy_preflight_state in ('not_run', 'passed', 'failed')),
  public_progress_mode text not null default 'qualitative_only_before_close',
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  check (opens_at < closes_at),
  check (closes_at <= routing_deadline_at)
);

create table if not exists public.donation_cancellation_feature_promotion_records (
  id text primary key,
  feature_key text not null check (feature_key = 'donation_cancellation_clearinghouse_v0_1'),
  from_classification text not null check (from_classification = 'non_mvp'),
  to_classification text not null,
  requested_by text not null,
  approved_by_product text,
  approved_by_payments text,
  approved_by_legal text,
  approved_by_trust_safety text,
  approved_by_governance text,
  approval_state text not null check (approval_state in ('draft', 'approved', 'rejected', 'revoked')),
  approved_at timestamptz,
  notes text not null default '',
  promotion_hash text not null check (promotion_hash ~ '^sha256:[a-f0-9]{64}$'),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  check (
    approval_state <> 'approved'
    or (
      approved_at is not null
      and approved_by_product is not null
      and approved_by_payments is not null
      and approved_by_legal is not null
      and approved_by_trust_safety is not null
      and approved_by_governance is not null
    )
  )
);

create table if not exists public.donation_cancellation_recipients (
  id text primary key,
  name text not null,
  public_description text not null,
  website_url text,
  recipient_type text not null check (recipient_type in ('charity', 'nonprofit', 'fiscal_host', 'advocacy_non_election', 'other')),
  payment_route_ref text,
  payment_route_state text not null check (payment_route_state in ('verified', 'review', 'blocked')),
  jurisdiction text not null,
  sanctions_aml_state text not null check (sanctions_aml_state in ('clear', 'review', 'blocked')),
  tax_receipt_policy_snapshot_json jsonb,
  review_state text not null check (review_state in ('approved', 'review', 'blocked')),
  cause_area_tags_json jsonb not null default '[]'::jsonb,
  public_good_tags_json jsonb not null default '[]'::jsonb,
  opposition_side_ids_json jsonb not null default '[]'::jsonb,
  is_active boolean not null default false,
  dev_only boolean not null default false,
  production_blocked_reason text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  check (
    review_state <> 'approved'
    or (is_active = true and payment_route_state = 'verified' and sanctions_aml_state = 'clear')
  )
);

create table if not exists public.donation_cancellation_opposition_markets (
  id text primary key,
  title text not null,
  summary text not null,
  status text not null check (status in ('draft', 'review', 'active', 'blocked', 'retired')),
  side_a_label text not null,
  side_b_label text not null,
  side_a_recipient_ids_json jsonb not null default '[]'::jsonb,
  side_b_recipient_ids_json jsonb not null default '[]'::jsonb,
  matching_ratio_bps_a_to_b integer not null default 10000 check (matching_ratio_bps_a_to_b > 0),
  legal_review_state text not null check (legal_review_state in ('approved', 'review', 'blocked')),
  safety_review_state text not null check (safety_review_state in ('approved', 'review', 'blocked')),
  public_copy_review_state text not null check (public_copy_review_state in ('approved', 'review', 'blocked')),
  allowed_redirect_recipient_ids_json jsonb not null default '[]'::jsonb,
  prohibited_recipient_ids_json jsonb not null default '[]'::jsonb,
  rulebook_hash text not null check (rulebook_hash ~ '^sha256:[a-f0-9]{64}$'),
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  check (
    status <> 'active'
    or (
      legal_review_state = 'approved'
      and safety_review_state = 'approved'
      and public_copy_review_state = 'approved'
    )
  )
);

create table if not exists public.donation_cancellation_priority_snapshots (
  id text primary key,
  user_id uuid references public.profiles (id) on delete cascade,
  round_id text not null references public.donation_cancellation_rounds (id) on delete restrict,
  priority_weights_json jsonb not null default '{}'::jsonb,
  acceptable_redirect_recipient_ids_json jsonb not null default '[]'::jsonb,
  unacceptable_redirect_recipient_ids_json jsonb not null default '[]'::jsonb,
  min_common_ground_score numeric,
  auto_accept_suggestions boolean not null default false,
  visibility text not null default 'aggregate_only' check (visibility = 'aggregate_only'),
  snapshot_hash text not null unique check (snapshot_hash ~ '^sha256:[a-f0-9]{64}$'),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.donation_cancellation_registrations (
  id text primary key,
  round_id text not null references public.donation_cancellation_rounds (id) on delete restrict,
  user_id uuid references public.profiles (id) on delete cascade,
  intended_recipient_id text not null references public.donation_cancellation_recipients (id) on delete restrict,
  intended_opposition_market_id text references public.donation_cancellation_opposition_markets (id) on delete set null,
  intended_side text not null check (intended_side in ('side_a', 'side_b', 'none', 'unknown')),
  gross_amount_minor integer not null check (gross_amount_minor > 0),
  estimated_fee_minor integer not null default 0 check (estimated_fee_minor >= 0),
  estimated_net_minor integer not null check (estimated_net_minor >= 0),
  currency text not null check (currency ~ '^[a-z]{3}$'),
  user_attestation_checked boolean not null default false,
  user_attestation_text_version text not null,
  moral_priority_snapshot_id text not null references public.donation_cancellation_priority_snapshots (id) on delete restrict,
  fallback_mode text not null default 'intended_destination' check (fallback_mode = 'intended_destination'),
  redirect_consent_mode text not null check (redirect_consent_mode in ('preconsented_allowed_list', 'require_review_before_routing')),
  registration_state text not null,
  payment_state text not null check (payment_state in ('none', 'payment_failed', 'provider_authorized_exact', 'captured_pending_routing')),
  payment_operation_id text,
  funding_source_commitment_id text,
  identity_snapshot_id text,
  rulebook_hash_at_consent text not null check (rulebook_hash_at_consent ~ '^sha256:[a-f0-9]{64}$'),
  fee_policy_hash_at_consent text not null check (fee_policy_hash_at_consent ~ '^sha256:[a-f0-9]{64}$'),
  final_review_confirmed_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  check (gross_amount_minor = estimated_fee_minor + estimated_net_minor),
  check (
    registration_state not in ('paid_registered', 'authorized_registered')
    or payment_state in ('provider_authorized_exact', 'captured_pending_routing')
  )
);

create table if not exists public.donation_cancellation_match_groups (
  id text primary key,
  round_id text not null references public.donation_cancellation_rounds (id) on delete restrict,
  opposition_market_id text not null references public.donation_cancellation_opposition_markets (id) on delete restrict,
  matching_algorithm_version text not null,
  side_a_total_eligible_minor integer not null default 0 check (side_a_total_eligible_minor >= 0),
  side_b_total_eligible_minor integer not null default 0 check (side_b_total_eligible_minor >= 0),
  side_a_matched_minor integer not null default 0 check (side_a_matched_minor >= 0),
  side_b_matched_minor integer not null default 0 check (side_b_matched_minor >= 0),
  side_a_unmatched_minor integer not null default 0 check (side_a_unmatched_minor >= 0),
  side_b_unmatched_minor integer not null default 0 check (side_b_unmatched_minor >= 0),
  matching_input_hash text not null check (matching_input_hash ~ '^sha256:[a-f0-9]{64}$'),
  matching_output_hash text not null check (matching_output_hash ~ '^sha256:[a-f0-9]{64}$'),
  allocation_by_registration_id_json jsonb not null default '{}'::jsonb,
  status text not null check (status in ('computed', 'suggestions_computed', 'approved', 'routing', 'settled', 'superseded', 'failed', 'blocked')),
  blockers_json jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  check (side_a_matched_minor = side_b_matched_minor)
);

create table if not exists public.donation_cancellation_redirect_suggestions (
  id text primary key,
  round_id text not null references public.donation_cancellation_rounds (id) on delete restrict,
  match_group_id text not null references public.donation_cancellation_match_groups (id) on delete restrict,
  redirect_recipient_id text not null references public.donation_cancellation_recipients (id) on delete restrict,
  suggestion_algorithm_version text not null,
  user_compatibility_summary_hash text not null check (user_compatibility_summary_hash ~ '^sha256:[a-f0-9]{64}$'),
  public_explanation text not null,
  private_score_json_ref text,
  common_ground_score_decimal numeric not null,
  status text not null check (status in ('proposed', 'accepted_by_policy', 'requires_user_review', 'rejected', 'expired', 'blocked')),
  expires_at timestamptz not null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.donation_cancellation_allocation_rows (
  id text primary key,
  round_id text not null references public.donation_cancellation_rounds (id) on delete restrict,
  match_group_id text references public.donation_cancellation_match_groups (id) on delete set null,
  registration_id text not null references public.donation_cancellation_registrations (id) on delete restrict,
  user_id uuid references public.profiles (id) on delete cascade,
  original_intended_recipient_id text not null references public.donation_cancellation_recipients (id) on delete restrict,
  allocated_matched_minor integer not null default 0 check (allocated_matched_minor >= 0),
  allocated_unmatched_minor integer not null default 0 check (allocated_unmatched_minor >= 0),
  redirect_recipient_id text references public.donation_cancellation_recipients (id) on delete set null,
  redirect_suggestion_id text references public.donation_cancellation_redirect_suggestions (id) on delete set null,
  final_intended_route_minor integer not null default 0 check (final_intended_route_minor >= 0),
  final_redirect_route_minor integer not null default 0 check (final_redirect_route_minor >= 0),
  fee_minor integer not null default 0 check (fee_minor >= 0),
  net_to_intended_minor integer not null default 0 check (net_to_intended_minor >= 0),
  net_to_redirect_minor integer not null default 0 check (net_to_redirect_minor >= 0),
  allocation_state text not null check (allocation_state in ('pending', 'suggested', 'accepted', 'rejected', 'route_to_intended', 'route_to_redirect', 'routed', 'failed', 'blocked', 'superseded')),
  allocation_hash text not null check (allocation_hash ~ '^sha256:[a-f0-9]{64}$'),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.donation_cancellation_routing_operations (
  id text primary key,
  round_id text not null references public.donation_cancellation_rounds (id) on delete restrict,
  allocation_row_id text not null references public.donation_cancellation_allocation_rows (id) on delete restrict,
  registration_id text not null references public.donation_cancellation_registrations (id) on delete restrict,
  destination_recipient_id text not null references public.donation_cancellation_recipients (id) on delete restrict,
  destination_type text not null check (destination_type in ('original_intended', 'redirect')),
  gross_minor integer not null check (gross_minor > 0),
  fee_minor integer not null default 0 check (fee_minor >= 0),
  net_minor integer not null check (net_minor >= 0),
  currency text not null check (currency ~ '^[a-z]{3}$'),
  provider_operation_ref text,
  operation_state text not null check (operation_state in ('pending', 'executing', 'succeeded', 'failed', 'retryable', 'blocked', 'reversed')),
  idempotency_key text not null unique,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  check (gross_minor >= fee_minor + net_minor),
  check (provider_operation_ref is null)
);

create table if not exists public.donation_cancellation_audit_reports (
  id text primary key,
  round_id text not null references public.donation_cancellation_rounds (id) on delete restrict,
  gross_registered_minor integer not null default 0,
  gross_matched_minor integer not null default 0,
  gross_redirected_minor integer not null default 0,
  gross_routed_to_intended_minor integer not null default 0,
  fee_minor integer not null default 0,
  net_to_intended_minor integer not null default 0,
  net_to_redirect_minor integer not null default 0,
  registration_count integer not null default 0,
  matched_registration_count integer not null default 0,
  unmatched_registration_count integer not null default 0,
  redirect_recipient_count integer not null default 0,
  intended_recipient_count integer not null default 0,
  payment_failure_count integer not null default 0,
  review_block_count integer not null default 0,
  final_status text not null,
  public_report_json jsonb not null default '{}'::jsonb,
  published_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.donation_cancellation_copy_preflight_reports (
  id text primary key,
  round_id text not null references public.donation_cancellation_rounds (id) on delete restrict,
  status text not null check (status in ('passed', 'failed')),
  blockers_json jsonb not null default '[]'::jsonb,
  checked_copy_hash text not null check (checked_copy_hash ~ '^sha256:[a-f0-9]{64}$'),
  checked_at timestamptz not null default timezone('utc', now()),
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.donation_cancellation_audit_events (
  id text primary key,
  event_type text not null,
  feature_key text not null default 'donation_cancellation_clearinghouse_v0_1',
  record_table text not null,
  record_id text not null,
  reason text not null,
  metadata_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

insert into public.donation_cancellation_audit_events (
  id,
  event_type,
  record_table,
  record_id,
  reason,
  metadata_json
)
select
  'donation-cancellation-non-mvp-disabled:' || id,
  'donation_cancellation_marked_non_mvp_disabled',
  'donation_cancellation_rounds',
  id,
  'feature_non_mvp',
  jsonb_build_object('previous_status', status)
from public.donation_cancellation_rounds
where status in ('open', 'closed_to_new_registrations', 'matching', 'suggestions_pending', 'routing', 'settled', 'released')
on conflict (id) do nothing;

update public.donation_cancellation_rounds
set status = 'non_mvp_disabled',
    production_public_enabled = false,
    production_real_money_enabled = false,
    primary_nav_enabled = false,
    mvp_surface_enabled = false,
    cgpp_surface_enabled = false,
    updated_at = timezone('utc', now())
where status in ('open', 'closed_to_new_registrations', 'matching', 'suggestions_pending', 'routing', 'settled', 'released');

alter table public.donation_cancellation_rounds enable row level security;
alter table public.donation_cancellation_feature_promotion_records enable row level security;
alter table public.donation_cancellation_recipients enable row level security;
alter table public.donation_cancellation_opposition_markets enable row level security;
alter table public.donation_cancellation_priority_snapshots enable row level security;
alter table public.donation_cancellation_registrations enable row level security;
alter table public.donation_cancellation_match_groups enable row level security;
alter table public.donation_cancellation_redirect_suggestions enable row level security;
alter table public.donation_cancellation_allocation_rows enable row level security;
alter table public.donation_cancellation_routing_operations enable row level security;
alter table public.donation_cancellation_audit_reports enable row level security;
alter table public.donation_cancellation_copy_preflight_reports enable row level security;
alter table public.donation_cancellation_audit_events enable row level security;

-- No public read policy is created while the feature remains non-MVP.
-- Admin/reviewer access is expected to use service-role or a future explicit
-- labs policy; ordinary authenticated users can only read their own records.

create policy "Users can read own donation cancellation priority snapshots"
  on public.donation_cancellation_priority_snapshots
  for select
  using (auth.uid() = user_id);

create policy "Users can read own donation cancellation registrations"
  on public.donation_cancellation_registrations
  for select
  using (auth.uid() = user_id);

create policy "Users can read own donation cancellation allocations"
  on public.donation_cancellation_allocation_rows
  for select
  using (auth.uid() = user_id);

create policy "Users can read own donation cancellation routing operations"
  on public.donation_cancellation_routing_operations
  for select
  using (
    exists (
      select 1
      from public.donation_cancellation_registrations registrations
      where registrations.id = donation_cancellation_routing_operations.registration_id
        and registrations.user_id = auth.uid()
    )
  );

comment on table public.donation_cancellation_rounds is
  'Donation Cancellation Clearinghouse rounds. Status NON-MVP: public production display and real-money operations are disabled until a later promotion record is approved.';
comment on table public.donation_cancellation_registrations is
  'Intended-donation registrations for non-MVP labs/research use. Production payment-backed registration is disabled.';
comment on table public.donation_cancellation_audit_reports is
  'Aggregate-only simulated/admin audit reports; must not imply active public product availability or expose counterparty identities, priority weights, private scores, payment refs, or objective-impact claims.';
comment on table public.donation_cancellation_feature_promotion_records is
  'Durable promotion guard. There is intentionally no approved promotion record for Donation Cancellation Clearinghouse in this migration.';
comment on table public.donation_cancellation_audit_events is
  'Append-only audit events, including donation_cancellation_marked_non_mvp_disabled for existing records suppressed from public live use.';
