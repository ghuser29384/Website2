-- Pareto-safe outcome learning for the Moral Trade opportunity Feed.
-- The learning store accepts numeric/public-safe feature snapshots only. It must
-- never contain raw private profile prose or sensitive demographic attributes.

create table if not exists public.recommendation_model_versions (
  id uuid primary key default gen_random_uuid(),
  model_key text not null unique,
  status text not null check (status in ('cold_start', 'shadow', 'active', 'rejected', 'superseded')),
  objective text not null default 'pareto_safe_additionality'
    check (objective = 'pareto_safe_additionality'),
  algorithm_version text not null,
  trained_at timestamptz not null default now(),
  training_window_start timestamptz,
  training_window_end timestamptz,
  sample_count integer not null default 0 check (sample_count >= 0),
  profile_count integer not null default 0 check (profile_count >= 0),
  opportunity_count integer not null default 0 check (opportunity_count >= 0),
  proposal_count integer not null default 0 check (proposal_count >= 0),
  acceptance_count integer not null default 0 check (acceptance_count >= 0),
  completion_count integer not null default 0 check (completion_count >= 0),
  outcome_feedback_count integer not null default 0 check (outcome_feedback_count >= 0),
  artifact jsonb not null default '{}'::jsonb check (jsonb_typeof(artifact) = 'object'),
  metrics jsonb not null default '{}'::jsonb check (jsonb_typeof(metrics) = 'object'),
  activation_reason text not null default '',
  superseded_at timestamptz,
  created_at timestamptz not null default now()
);

create unique index if not exists recommendation_model_versions_one_active_idx
  on public.recommendation_model_versions ((status))
  where status = 'active';
create index if not exists recommendation_model_versions_status_created_idx
  on public.recommendation_model_versions (status, created_at desc);

create table if not exists public.recommendation_experiment_assignments (
  profile_id uuid not null,
  experiment_key text not null,
  assignment_day date not null,
  arm text not null check (arm in ('treatment', 'holdout')),
  stable_bucket integer not null check (stable_bucket between 0 and 9999),
  assignment_probability numeric(8,7) not null check (assignment_probability > 0 and assignment_probability <= 1),
  candidate_probability numeric(12,11) not null check (candidate_probability > 0 and candidate_probability <= 1),
  joint_propensity numeric(14,13) not null check (joint_propensity > 0 and joint_propensity <= 1),
  affected_candidate_key text not null,
  created_at timestamptz not null default now(),
  primary key (profile_id, experiment_key, assignment_day)
);

create table if not exists public.recommendation_exposures (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null,
  request_id uuid not null,
  opportunity_type text not null check (opportunity_type in ('offer', 'donation_redirect', 'donation_pool')),
  opportunity_id text not null,
  owner_id uuid,
  rank integer check (rank is null or rank between 1 and 1000),
  match_class text not null check (match_class in ('direct', 'near', 'adjacent', 'discovery')),
  was_shown boolean not null default true,
  model_version_id uuid,
  model_key text not null,
  model_mode text not null check (model_mode in ('heuristic', 'shadow', 'active')),
  objective text not null default 'pareto_safe_additionality'
    check (objective = 'pareto_safe_additionality'),
  prediction jsonb not null default '{}'::jsonb check (jsonb_typeof(prediction) = 'object'),
  feature_snapshot jsonb not null default '{}'::jsonb check (jsonb_typeof(feature_snapshot) = 'object'),
  experiment_key text not null default '',
  assignment_arm text not null default 'not_assigned'
    check (assignment_arm in ('not_assigned', 'treatment', 'holdout')),
  assignment_probability numeric(8,7) not null default 1
    check (assignment_probability > 0 and assignment_probability <= 1),
  candidate_probability numeric(12,11) not null default 1
    check (candidate_probability > 0 and candidate_probability <= 1),
  joint_propensity numeric(14,13) not null default 1
    check (joint_propensity > 0 and joint_propensity <= 1),
  stable_bucket integer not null default 0 check (stable_bucket between 0 and 9999),
  occurred_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (profile_id, request_id, opportunity_type, opportunity_id)
);

comment on column public.recommendation_exposures.feature_snapshot is
  'Numeric and public-safe inference features only. Never store raw private profile prose, connector content, or sensitive demographic attributes.';

create index if not exists recommendation_exposures_profile_time_idx
  on public.recommendation_exposures (profile_id, occurred_at desc);
create index if not exists recommendation_exposures_opportunity_time_idx
  on public.recommendation_exposures (opportunity_type, opportunity_id, occurred_at desc);
create index if not exists recommendation_exposures_experiment_idx
  on public.recommendation_exposures (experiment_key, assignment_arm, occurred_at desc)
  where experiment_key <> '';

create table if not exists public.recommendation_outcome_feedback (
  agreement_id uuid not null,
  profile_id uuid not null,
  own_lights_gain smallint not null check (own_lights_gain between 1 and 5),
  satisfaction smallint not null check (satisfaction between 1 and 5),
  would_happen_without_trade_percent smallint not null
    check (would_happen_without_trade_percent between 0 and 100),
  externality_concern text not null check (externality_concern in ('none', 'low', 'medium', 'high')),
  notes text not null default '' check (char_length(notes) <= 2000),
  submitted_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (agreement_id, profile_id)
);

comment on table public.recommendation_outcome_feedback is
  'Private participant-by-participant reports of own-lights gain, satisfaction, counterfactual additionality, and externality concern after bilateral completion.';

create table if not exists public.recommendation_outcomes (
  exposure_id uuid primary key,
  profile_id uuid not null,
  opportunity_type text not null,
  opportunity_id text not null,
  owner_id uuid,
  agreement_id uuid,
  proposed boolean not null default false,
  accepted boolean not null default false,
  completed boolean not null default false,
  verified_completion boolean not null default false,
  viewer_gain_positive boolean,
  counterparty_gain_positive boolean,
  additionality_score numeric(6,5) check (additionality_score is null or additionality_score between 0 and 1),
  satisfaction_score numeric(6,5) check (satisfaction_score is null or satisfaction_score between 0 and 1),
  externality_safe boolean,
  report_count integer not null default 0 check (report_count >= 0),
  cancellation boolean not null default false,
  label_available boolean not null default false,
  reconciled_at timestamptz not null default now()
);

create index if not exists recommendation_outcomes_owner_idx
  on public.recommendation_outcomes (owner_id, reconciled_at desc);
create index if not exists recommendation_outcomes_agreement_idx
  on public.recommendation_outcomes (agreement_id)
  where agreement_id is not null;

create table if not exists public.recommendation_graph_edges (
  profile_id uuid not null,
  opportunity_key text not null,
  aggregate_weight numeric not null default 0,
  positive_weight numeric not null default 0 check (positive_weight >= 0),
  negative_weight numeric not null default 0 check (negative_weight >= 0),
  observation_count integer not null default 0 check (observation_count >= 0),
  last_event_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (profile_id, opportunity_key)
);

create index if not exists recommendation_graph_edges_opportunity_idx
  on public.recommendation_graph_edges (opportunity_key, aggregate_weight desc);

create table if not exists public.recommendation_user_factors (
  model_version_id uuid not null,
  profile_id uuid not null,
  factors jsonb not null default '[]'::jsonb check (jsonb_typeof(factors) = 'array'),
  graph_factors jsonb not null default '[]'::jsonb check (jsonb_typeof(graph_factors) = 'array'),
  observation_count integer not null default 0 check (observation_count >= 0),
  created_at timestamptz not null default now(),
  primary key (model_version_id, profile_id)
);

create table if not exists public.recommendation_opportunity_factors (
  model_version_id uuid not null,
  opportunity_key text not null,
  factors jsonb not null default '[]'::jsonb check (jsonb_typeof(factors) = 'array'),
  graph_factors jsonb not null default '[]'::jsonb check (jsonb_typeof(graph_factors) = 'array'),
  observation_count integer not null default 0 check (observation_count >= 0),
  created_at timestamptz not null default now(),
  primary key (model_version_id, opportunity_key)
);

create table if not exists public.recommendation_counterparty_priors (
  model_version_id uuid not null,
  owner_id uuid not null,
  proposal_count integer not null default 0 check (proposal_count >= 0),
  acceptance_count integer not null default 0 check (acceptance_count >= 0),
  completion_count integer not null default 0 check (completion_count >= 0),
  report_count integer not null default 0 check (report_count >= 0),
  platform_acceptance_prior numeric(6,5) not null check (platform_acceptance_prior between 0 and 1),
  platform_completion_prior numeric(6,5) not null check (platform_completion_prior between 0 and 1),
  created_at timestamptz not null default now(),
  primary key (model_version_id, owner_id)
);

create table if not exists public.recommendation_training_runs (
  id uuid primary key default gen_random_uuid(),
  status text not null check (status in ('running', 'succeeded', 'failed')),
  stage text not null default 'start',
  objective text not null default 'pareto_safe_additionality',
  model_version_id uuid,
  counts jsonb not null default '{}'::jsonb check (jsonb_typeof(counts) = 'object'),
  metrics jsonb not null default '{}'::jsonb check (jsonb_typeof(metrics) = 'object'),
  error_code text not null default '',
  error_detail text not null default '',
  started_at timestamptz not null default now(),
  completed_at timestamptz
);

create index if not exists recommendation_training_runs_started_idx
  on public.recommendation_training_runs (started_at desc);

create table if not exists public.recommendation_guardrail_snapshots (
  id uuid primary key default gen_random_uuid(),
  measured_at timestamptz not null default now(),
  window_days integer not null check (window_days between 1 and 3650),
  exposure_count integer not null default 0 check (exposure_count >= 0),
  report_rate numeric(8,7) not null default 0 check (report_rate between 0 and 1),
  cancellation_rate numeric(8,7) not null default 0 check (cancellation_rate between 0 and 1),
  average_satisfaction numeric(8,7)
    check (average_satisfaction is null or average_satisfaction between 0 and 1),
  stop_experiment boolean not null default false,
  reasons text[] not null default '{}',
  experiment_key text not null default 'pareto-nondirect-holdout-v1'
);

create index if not exists recommendation_guardrail_snapshots_time_idx
  on public.recommendation_guardrail_snapshots (measured_at desc);

do $$
begin
  if to_regclass('public.profiles') is not null then
    if not exists (select 1 from pg_constraint where conname = 'recommendation_experiment_assignments_profile_fk') then
      alter table public.recommendation_experiment_assignments
        add constraint recommendation_experiment_assignments_profile_fk
        foreign key (profile_id) references public.profiles(id) on delete cascade;
    end if;
    if not exists (select 1 from pg_constraint where conname = 'recommendation_exposures_profile_fk') then
      alter table public.recommendation_exposures
        add constraint recommendation_exposures_profile_fk
        foreign key (profile_id) references public.profiles(id) on delete cascade;
    end if;
    if not exists (select 1 from pg_constraint where conname = 'recommendation_exposures_owner_fk') then
      alter table public.recommendation_exposures
        add constraint recommendation_exposures_owner_fk
        foreign key (owner_id) references public.profiles(id) on delete set null;
    end if;
    if not exists (select 1 from pg_constraint where conname = 'recommendation_outcome_feedback_profile_fk') then
      alter table public.recommendation_outcome_feedback
        add constraint recommendation_outcome_feedback_profile_fk
        foreign key (profile_id) references public.profiles(id) on delete cascade;
    end if;
    if not exists (select 1 from pg_constraint where conname = 'recommendation_outcomes_profile_fk') then
      alter table public.recommendation_outcomes
        add constraint recommendation_outcomes_profile_fk
        foreign key (profile_id) references public.profiles(id) on delete cascade;
    end if;
    if not exists (select 1 from pg_constraint where conname = 'recommendation_outcomes_owner_fk') then
      alter table public.recommendation_outcomes
        add constraint recommendation_outcomes_owner_fk
        foreign key (owner_id) references public.profiles(id) on delete set null;
    end if;
    if not exists (select 1 from pg_constraint where conname = 'recommendation_graph_edges_profile_fk') then
      alter table public.recommendation_graph_edges
        add constraint recommendation_graph_edges_profile_fk
        foreign key (profile_id) references public.profiles(id) on delete cascade;
    end if;
    if not exists (select 1 from pg_constraint where conname = 'recommendation_user_factors_profile_fk') then
      alter table public.recommendation_user_factors
        add constraint recommendation_user_factors_profile_fk
        foreign key (profile_id) references public.profiles(id) on delete cascade;
    end if;
    if not exists (select 1 from pg_constraint where conname = 'recommendation_counterparty_priors_owner_fk') then
      alter table public.recommendation_counterparty_priors
        add constraint recommendation_counterparty_priors_owner_fk
        foreign key (owner_id) references public.profiles(id) on delete cascade;
    end if;
  end if;

  if to_regclass('public.agreements') is not null then
    if not exists (select 1 from pg_constraint where conname = 'recommendation_outcome_feedback_agreement_fk') then
      alter table public.recommendation_outcome_feedback
        add constraint recommendation_outcome_feedback_agreement_fk
        foreign key (agreement_id) references public.agreements(id) on delete cascade;
    end if;
    if not exists (select 1 from pg_constraint where conname = 'recommendation_outcomes_agreement_fk') then
      alter table public.recommendation_outcomes
        add constraint recommendation_outcomes_agreement_fk
        foreign key (agreement_id) references public.agreements(id) on delete set null;
    end if;
  end if;

  if not exists (select 1 from pg_constraint where conname = 'recommendation_exposures_model_fk') then
    alter table public.recommendation_exposures
      add constraint recommendation_exposures_model_fk
      foreign key (model_version_id) references public.recommendation_model_versions(id) on delete set null;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'recommendation_outcomes_exposure_fk') then
    alter table public.recommendation_outcomes
      add constraint recommendation_outcomes_exposure_fk
      foreign key (exposure_id) references public.recommendation_exposures(id) on delete cascade;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'recommendation_user_factors_model_fk') then
    alter table public.recommendation_user_factors
      add constraint recommendation_user_factors_model_fk
      foreign key (model_version_id) references public.recommendation_model_versions(id) on delete cascade;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'recommendation_opportunity_factors_model_fk') then
    alter table public.recommendation_opportunity_factors
      add constraint recommendation_opportunity_factors_model_fk
      foreign key (model_version_id) references public.recommendation_model_versions(id) on delete cascade;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'recommendation_counterparty_priors_model_fk') then
    alter table public.recommendation_counterparty_priors
      add constraint recommendation_counterparty_priors_model_fk
      foreign key (model_version_id) references public.recommendation_model_versions(id) on delete cascade;
  end if;
  if not exists (select 1 from pg_constraint where conname = 'recommendation_training_runs_model_fk') then
    alter table public.recommendation_training_runs
      add constraint recommendation_training_runs_model_fk
      foreign key (model_version_id) references public.recommendation_model_versions(id) on delete set null;
  end if;
end $$;

alter table public.recommendation_model_versions enable row level security;
alter table public.recommendation_experiment_assignments enable row level security;
alter table public.recommendation_exposures enable row level security;
alter table public.recommendation_outcome_feedback enable row level security;
alter table public.recommendation_outcomes enable row level security;
alter table public.recommendation_graph_edges enable row level security;
alter table public.recommendation_user_factors enable row level security;
alter table public.recommendation_opportunity_factors enable row level security;
alter table public.recommendation_counterparty_priors enable row level security;
alter table public.recommendation_training_runs enable row level security;
alter table public.recommendation_guardrail_snapshots enable row level security;

revoke all on table public.recommendation_model_versions from anon, authenticated;
revoke all on table public.recommendation_experiment_assignments from anon, authenticated;
revoke all on table public.recommendation_exposures from anon, authenticated;
revoke all on table public.recommendation_outcome_feedback from anon, authenticated;
revoke all on table public.recommendation_outcomes from anon, authenticated;
revoke all on table public.recommendation_graph_edges from anon, authenticated;
revoke all on table public.recommendation_user_factors from anon, authenticated;
revoke all on table public.recommendation_opportunity_factors from anon, authenticated;
revoke all on table public.recommendation_counterparty_priors from anon, authenticated;
revoke all on table public.recommendation_training_runs from anon, authenticated;
revoke all on table public.recommendation_guardrail_snapshots from anon, authenticated;

grant all on table public.recommendation_model_versions to service_role;
grant all on table public.recommendation_experiment_assignments to service_role;
grant all on table public.recommendation_exposures to service_role;
grant all on table public.recommendation_outcome_feedback to service_role;
grant all on table public.recommendation_outcomes to service_role;
grant all on table public.recommendation_graph_edges to service_role;
grant all on table public.recommendation_user_factors to service_role;
grant all on table public.recommendation_opportunity_factors to service_role;
grant all on table public.recommendation_counterparty_priors to service_role;
grant all on table public.recommendation_training_runs to service_role;
grant all on table public.recommendation_guardrail_snapshots to service_role;

grant select on table public.recommendation_exposures to authenticated;
grant select, insert, update on table public.recommendation_outcome_feedback to authenticated;

drop policy if exists recommendation_exposures_select_own on public.recommendation_exposures;
create policy recommendation_exposures_select_own
  on public.recommendation_exposures
  for select
  to authenticated
  using (profile_id = auth.uid());

do $$
begin
  if to_regclass('public.agreements') is not null then
    execute 'drop policy if exists recommendation_outcome_feedback_select_own on public.recommendation_outcome_feedback';
    execute $policy$
      create policy recommendation_outcome_feedback_select_own
        on public.recommendation_outcome_feedback
        for select
        to authenticated
        using (
          profile_id = auth.uid()
          and exists (
            select 1 from public.agreements a
            where a.id = agreement_id
              and auth.uid() in (a.proposer_id, a.responder_id)
          )
        )
    $policy$;
    execute 'drop policy if exists recommendation_outcome_feedback_insert_own on public.recommendation_outcome_feedback';
    execute $policy$
      create policy recommendation_outcome_feedback_insert_own
        on public.recommendation_outcome_feedback
        for insert
        to authenticated
        with check (
          profile_id = auth.uid()
          and exists (
            select 1 from public.agreements a
            where a.id = agreement_id
              and auth.uid() in (a.proposer_id, a.responder_id)
              and coalesce(a.lifecycle_status, a.status::text) = 'completed'
          )
        )
    $policy$;
    execute 'drop policy if exists recommendation_outcome_feedback_update_own on public.recommendation_outcome_feedback';
    execute $policy$
      create policy recommendation_outcome_feedback_update_own
        on public.recommendation_outcome_feedback
        for update
        to authenticated
        using (
          profile_id = auth.uid()
          and exists (
            select 1 from public.agreements a
            where a.id = agreement_id
              and auth.uid() in (a.proposer_id, a.responder_id)
          )
        )
        with check (
          profile_id = auth.uid()
          and exists (
            select 1 from public.agreements a
            where a.id = agreement_id
              and auth.uid() in (a.proposer_id, a.responder_id)
              and coalesce(a.lifecycle_status, a.status::text) = 'completed'
          )
        )
    $policy$;
  end if;
end $$;
