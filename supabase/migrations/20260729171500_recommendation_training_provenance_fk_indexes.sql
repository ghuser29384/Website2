-- Cover every foreign key introduced for A1 training provenance and slot ownership.

create index if not exists recommendation_training_runs_duplicate_idx
  on public.recommendation_training_runs (duplicate_of)
  where duplicate_of is not null;

create index if not exists recommendation_model_versions_duplicate_idx
  on public.recommendation_model_versions (duplicate_of)
  where duplicate_of is not null;

create index if not exists recommendation_guardrail_snapshots_duplicate_idx
  on public.recommendation_guardrail_snapshots (duplicate_of)
  where duplicate_of is not null;

create index if not exists recommendation_training_slots_run_idx
  on public.recommendation_training_slots (run_id)
  where run_id is not null;

create index if not exists recommendation_training_slots_model_idx
  on public.recommendation_training_slots (model_version_id)
  where model_version_id is not null;
