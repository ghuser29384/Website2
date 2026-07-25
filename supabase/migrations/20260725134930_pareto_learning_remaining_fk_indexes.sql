-- Complete covering indexes for profile and owner foreign keys in the
-- Pareto-safe recommendation-learning schema.

create index if not exists recommendation_exposures_owner_idx
  on public.recommendation_exposures (owner_id)
  where owner_id is not null;

create index if not exists recommendation_outcome_feedback_profile_idx
  on public.recommendation_outcome_feedback (profile_id);

create index if not exists recommendation_outcomes_profile_idx
  on public.recommendation_outcomes (profile_id);

create index if not exists recommendation_user_factors_profile_idx
  on public.recommendation_user_factors (profile_id);

create index if not exists recommendation_counterparty_priors_owner_idx
  on public.recommendation_counterparty_priors (owner_id);
