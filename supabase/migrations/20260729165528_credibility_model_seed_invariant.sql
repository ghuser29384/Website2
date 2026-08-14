-- QA drift repair: the contextual-credibility migration defines this active
-- baseline model, but an isolated environment can lose data rows while keeping
-- its schema migration history. Restore the intended seed only when the model
-- table is completely empty; never override a deliberate draft/retired state.

insert into public.credibility_model_versions (
  version,
  status,
  prior_success,
  prior_failure,
  lower_quantile,
  minimum_effective_observations,
  recency_half_life_days,
  activated_at
)
select
  'v1-beta-contextual',
  'active',
  4,
  1,
  0.10,
  3,
  365,
  now()
where not exists (
  select 1
  from public.credibility_model_versions
);
