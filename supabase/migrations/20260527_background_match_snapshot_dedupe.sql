with ranked_snapshots as (
  select
    id,
    row_number() over (
      partition by
        match_id,
        profile_id,
        explanation_version,
        workflow_stage,
        confidence_band,
        score_bucket,
        source_run_kind,
        source_run_id
      order by created_at asc, id asc
    ) as snapshot_rank
  from public.match_explanation_snapshots
)
delete from public.match_explanation_snapshots
where id in (
  select id
  from ranked_snapshots
  where snapshot_rank > 1
);

create unique index if not exists match_explanation_snapshots_dedupe_idx
  on public.match_explanation_snapshots (
    match_id,
    profile_id,
    explanation_version,
    workflow_stage,
    confidence_band,
    score_bucket,
    source_run_kind,
    source_run_id
  );
