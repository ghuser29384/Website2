-- Phase 1F: cover the remaining foreign keys reported by the post-migration
-- advisor after Phases 1A-1E were exercised in isolated QA. These definitions
-- are also present in the clean-install Phase 1C migration.

create index if not exists trade_appeal_reviewer_nominations_nominator_idx
  on public.trade_appeal_reviewer_nominations(nominated_by);
create index if not exists trade_appeal_reviewer_nominations_reviewer_idx
  on public.trade_appeal_reviewer_nominations(reviewer_id);
create index if not exists trade_evidence_bundles_submitter_idx
  on public.trade_evidence_bundles(submitted_by);
create index if not exists trade_milestone_appeals_reviewer_idx
  on public.trade_milestone_appeals(assigned_reviewer_id)
  where assigned_reviewer_id is not null;
create index if not exists trade_milestone_appeals_opener_idx
  on public.trade_milestone_appeals(opened_by);
create index if not exists trade_milestone_reviews_base_idx
  on public.trade_milestone_reviews(base_review_id)
  where base_review_id is not null;
create index if not exists trade_milestone_reviews_reviewer_idx
  on public.trade_milestone_reviews(reviewer_id);
