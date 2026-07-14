create table if not exists public.moral_trade_opportunity_constraint_policies (
  id uuid primary key default gen_random_uuid(),
  policy_version text not null unique,
  canonical_json jsonb not null,
  policy_hash text not null unique check (policy_hash ~ '^sha256:[a-f0-9]{64}$'),
  status text not null check (status in ('draft', 'active', 'superseded')),
  base_self_attestation_completion_confidence_decimal numeric(6,5) not null check (base_self_attestation_completion_confidence_decimal between 0 and 1),
  seed_posterior_completion_confidence_decimal numeric(6,5) not null check (seed_posterior_completion_confidence_decimal between 0 and 1),
  max_completion_confidence_decimal numeric(6,5) not null check (max_completion_confidence_decimal between 0 and 1),
  max_completion_confidence_with_contrary_evidence_decimal numeric(6,5) not null check (max_completion_confidence_with_contrary_evidence_decimal between 0 and 1),
  max_completion_confidence_without_direct_observer_decimal numeric(6,5) not null check (max_completion_confidence_without_direct_observer_decimal between 0 and 1),
  max_additionality_adjustment_decimal numeric(6,5) not null check (max_additionality_adjustment_decimal between 0 and 1),
  privacy_invasive_evidence_overreward_cap_decimal numeric(6,5) not null check (privacy_invasive_evidence_overreward_cap_decimal between 0 and 1),
  weights_json jsonb not null,
  fixed_consideration_adjustment_allowed_bool boolean not null default false,
  created_at timestamptz not null default timezone('utc', now()),
  activated_at timestamptz,
  check (fixed_consideration_adjustment_allowed_bool = false)
);

create table if not exists public.moral_trade_opportunity_meal_evidence_bundles (
  id uuid primary key default gen_random_uuid(),
  participant_user_id uuid not null references public.profiles (id) on delete cascade,
  pledge_swap_id text,
  purchase_envelope_type text,
  purchase_envelope_id text,
  participant_action_commitment_id text,
  action_template_id text not null,
  meal_label text not null check (meal_label in ('breakfast', 'lunch', 'dinner', 'snack', 'other')),
  meal_window_start_at timestamptz not null,
  meal_window_end_at timestamptz not null,
  ordinary_meal_venue_type text not null check (
    ordinary_meal_venue_type in ('school_cafeteria', 'employer_cafeteria', 'dining_hall', 'home', 'restaurant', 'other')
  ),
  ordinary_meal_venue_description_private text,
  venue_access_model text not null check (
    venue_access_model in ('swipe_based', 'meal_plan', 'cash_register', 'open_access', 'unknown', 'other')
  ),
  participant_claims_usual_venue_for_meal_bool boolean not null,
  participant_claims_usually_eats_once_for_meal_bool boolean not null,
  post_meal_commitment_claimed_bool boolean not null,
  post_meal_commitment_type text check (
    post_meal_commitment_type in ('class', 'exam', 'work_shift', 'meeting', 'travel', 'appointment', 'other')
  ),
  post_meal_commitment_start_at timestamptz,
  post_meal_commitment_evidence_ref text,
  cafeteria_or_venue_record_ref text,
  co_diner_count integer not null default 0 check (co_diner_count >= 0),
  baseline_witness_count integer not null default 0 check (baseline_witness_count >= 0),
  direct_observer_testimonial_count integer not null default 0 check (direct_observer_testimonial_count >= 0),
  contrary_report_count integer not null default 0 check (contrary_report_count >= 0),
  bundle_status text not null check (
    bundle_status in ('draft', 'submitted', 'under_review', 'accepted', 'partially_accepted', 'rejected', 'disputed')
  ),
  reviewer_user_id uuid references public.profiles (id) on delete set null,
  participant_visible_summary text,
  private_reviewer_notes_ref text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  check (meal_window_start_at < meal_window_end_at),
  check (
    post_meal_commitment_claimed_bool = false
    or post_meal_commitment_type is not null
  )
);

create table if not exists public.moral_trade_meal_witness_testimonials (
  id uuid primary key default gen_random_uuid(),
  evidence_bundle_id uuid not null references public.moral_trade_opportunity_meal_evidence_bundles (id) on delete cascade,
  participant_user_id uuid not null references public.profiles (id) on delete cascade,
  witness_user_id uuid references public.profiles (id) on delete set null,
  witness_identity_ref text,
  witness_role text not null check (
    witness_role in ('baseline_witness', 'co_diner_direct_observer', 'schedule_constraint_witness')
  ),
  meal_label text not null check (meal_label in ('breakfast', 'lunch', 'dinner', 'snack', 'other')),
  observed_meal_venue_private text,
  observation_coverage text not null check (
    observation_coverage in ('whole_meal', 'most_of_meal', 'part_of_meal', 'not_observed')
  ),
  directly_observed_meal_bool boolean not null default false,
  participant_left_and_returned_during_meal_bool boolean not null default false,
  saw_participant_eat_meat_or_fish_bool boolean not null default false,
  reason_to_think_ate_meat_fish_before_or_after_bool boolean not null default false,
  no_meat_fish_completion_credence_decimal numeric(6,5) check (no_meat_fish_completion_credence_decimal between 0 and 1),
  baseline_counterfactual_credence_decimal numeric(6,5) check (baseline_counterfactual_credence_decimal between 0 and 1),
  knows_usual_venue_for_meal_bool boolean,
  knows_usually_eats_once_for_meal_bool boolean,
  basis_text_private text not null,
  pressured_to_submit_bool boolean not null default false,
  side_payment_concern_bool boolean not null default false,
  misleading_evidence_concern_bool boolean not null default false,
  testimonial_status text not null check (
    testimonial_status in ('submitted', 'under_review', 'accepted', 'partially_accepted', 'rejected', 'disputed')
  ),
  reviewer_user_id uuid references public.profiles (id) on delete set null,
  participant_visible_summary text,
  private_reviewer_notes_ref text,
  submitted_at timestamptz not null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  check (
    witness_role <> 'co_diner_direct_observer'
    or directly_observed_meal_bool = true
  )
);

create table if not exists public.moral_trade_opportunity_constraint_assessments (
  id uuid primary key default gen_random_uuid(),
  evidence_bundle_id uuid not null references public.moral_trade_opportunity_meal_evidence_bundles (id) on delete cascade,
  participant_user_id uuid not null references public.profiles (id) on delete cascade,
  source_type text not null,
  source_id text not null,
  ordinary_venue_support_score_decimal numeric(6,5) not null check (ordinary_venue_support_score_decimal between 0 and 1),
  swipe_or_access_constraint_score_decimal numeric(6,5) not null check (swipe_or_access_constraint_score_decimal between 0 and 1),
  co_diner_observation_score_decimal numeric(6,5) not null check (co_diner_observation_score_decimal between 0 and 1),
  post_meal_commitment_score_decimal numeric(6,5) not null check (post_meal_commitment_score_decimal between 0 and 1),
  usual_single_meal_habit_score_decimal numeric(6,5) not null check (usual_single_meal_habit_score_decimal between 0 and 1),
  baseline_witness_score_decimal numeric(6,5) not null check (baseline_witness_score_decimal between 0 and 1),
  independence_score_decimal numeric(6,5) not null check (independence_score_decimal between 0 and 1),
  consistency_score_decimal numeric(6,5) not null check (consistency_score_decimal between 0 and 1),
  collusion_risk_score_decimal numeric(6,5) not null check (collusion_risk_score_decimal between 0 and 1),
  contrary_evidence_score_decimal numeric(6,5) not null check (contrary_evidence_score_decimal between 0 and 1),
  privacy_sensitivity_score_decimal numeric(6,5) not null check (privacy_sensitivity_score_decimal between 0 and 1),
  proposed_completion_confidence_decimal numeric(6,5) not null check (proposed_completion_confidence_decimal between 0 and 1),
  proposed_additionality_adjustment_decimal numeric(6,5) check (proposed_additionality_adjustment_decimal between 0 and 1),
  cap_applied_decimal numeric(6,5) check (cap_applied_decimal between 0 and 1),
  accepted_for_completion_verification_bool boolean not null default false,
  accepted_for_additionality_bool boolean not null default false,
  reviewer_id uuid references public.profiles (id) on delete set null,
  review_status text not null check (review_status in ('pending', 'accepted', 'rejected', 'needs_more_info', 'disputed')),
  participant_visible_summary text,
  private_notes_ref text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.moral_trade_opportunity_meal_audit_events (
  id uuid primary key default gen_random_uuid(),
  evidence_bundle_id uuid references public.moral_trade_opportunity_meal_evidence_bundles (id) on delete cascade,
  opportunity_constraint_assessment_id uuid references public.moral_trade_opportunity_constraint_assessments (id) on delete cascade,
  actor_user_id uuid references public.profiles (id) on delete set null,
  actor_kind text not null check (actor_kind in ('participant', 'witness', 'reviewer', 'system')),
  event_type text not null check (
    event_type in (
      'bundle_submitted',
      'witness_testimony_submitted',
      'assessment_created',
      'risk_review_flagged',
      'review_decision_recorded',
      'policy_evaluation_trace_created',
      'public_summary_generated'
    )
  ),
  policy_hash text check (policy_hash ~ '^sha256:[a-f0-9]{64}$'),
  material_effects text[] not null default '{}',
  redacted_summary text not null,
  private_notes_ref text,
  created_at timestamptz not null default timezone('utc', now())
);

comment on table public.moral_trade_opportunity_meal_evidence_bundles is
  'Private opportunity-constrained meal evidence bundles for optional one-meal or one-day no-meat pledge-swap verification. Private venue, schedule, and raw context are review-scoped and not public or funder-visible.';

comment on table public.moral_trade_meal_witness_testimonials is
  'Private meal witness testimonials with separate baseline, co-diner/direct-observer, and schedule-constraint roles. Baseline testimony affects additionality; direct meal observation affects completion verification.';

comment on table public.moral_trade_opportunity_constraint_assessments is
  'Reviewer-scoped opportunity-constraint assessments that can feed verification confidence and additionality only through a frozen policy, without retroactive fixed-consideration changes.';

alter table public.moral_trade_opportunity_constraint_policies enable row level security;
alter table public.moral_trade_opportunity_meal_evidence_bundles enable row level security;
alter table public.moral_trade_meal_witness_testimonials enable row level security;
alter table public.moral_trade_opportunity_constraint_assessments enable row level security;
alter table public.moral_trade_opportunity_meal_audit_events enable row level security;

drop policy if exists "moral_trade_opportunity_meal_bundles_select_participant"
  on public.moral_trade_opportunity_meal_evidence_bundles;
create policy "moral_trade_opportunity_meal_bundles_select_participant"
  on public.moral_trade_opportunity_meal_evidence_bundles
  for select
  to authenticated
  using (participant_user_id = auth.uid());

drop policy if exists "moral_trade_opportunity_meal_bundles_insert_participant"
  on public.moral_trade_opportunity_meal_evidence_bundles;
create policy "moral_trade_opportunity_meal_bundles_insert_participant"
  on public.moral_trade_opportunity_meal_evidence_bundles
  for insert
  to authenticated
  with check (participant_user_id = auth.uid());

drop policy if exists "moral_trade_meal_witness_testimonials_select_party"
  on public.moral_trade_meal_witness_testimonials;
create policy "moral_trade_meal_witness_testimonials_select_party"
  on public.moral_trade_meal_witness_testimonials
  for select
  to authenticated
  using (participant_user_id = auth.uid() or witness_user_id = auth.uid());

drop policy if exists "moral_trade_meal_witness_testimonials_insert_witness"
  on public.moral_trade_meal_witness_testimonials;
create policy "moral_trade_meal_witness_testimonials_insert_witness"
  on public.moral_trade_meal_witness_testimonials
  for insert
  to authenticated
  with check (witness_user_id = auth.uid() or witness_user_id is null);

drop policy if exists "moral_trade_opportunity_assessments_select_participant"
  on public.moral_trade_opportunity_constraint_assessments;
create policy "moral_trade_opportunity_assessments_select_participant"
  on public.moral_trade_opportunity_constraint_assessments
  for select
  to authenticated
  using (participant_user_id = auth.uid());
