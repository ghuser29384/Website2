-- Phase 1C: covering indexes for the foreign-key and authorization paths
-- introduced by the additive milestone and payment lifecycle.

create index if not exists trade_agreement_milestones_current_bundle_idx
  on public.trade_agreement_milestones(current_bundle_id)
  where current_bundle_id is not null;
create index if not exists trade_agreement_milestones_final_review_idx
  on public.trade_agreement_milestones(final_review_id)
  where final_review_id is not null;
create index if not exists trade_agreement_milestones_payer_idx
  on public.trade_agreement_milestones(payer_id);
create index if not exists trade_agreement_milestones_performer_idx
  on public.trade_agreement_milestones(performer_id);
create index if not exists trade_milestone_payouts_payer_idx
  on public.trade_milestone_payouts(payer_id);
create index if not exists trade_milestone_payouts_payee_idx
  on public.trade_milestone_payouts(payee_id);
create index if not exists trade_external_payment_receipts_reporter_idx
  on public.trade_external_payment_receipts(reported_by);
create index if not exists trade_payment_review_cases_final_decision_idx
  on public.trade_payment_review_cases(final_decision_id)
  where final_decision_id is not null;
create index if not exists trade_payment_reviewer_nominations_nominator_idx
  on public.trade_payment_reviewer_nominations(nominated_by);
create index if not exists trade_payment_review_decisions_receipt_idx
  on public.trade_payment_review_decisions(receipt_id);
create index if not exists trade_payment_review_decisions_base_idx
  on public.trade_payment_review_decisions(base_decision_id)
  where base_decision_id is not null;
create index if not exists trade_payment_appeals_opener_idx
  on public.trade_payment_appeals(opened_by);
create index if not exists trade_payment_appeal_nominations_nominator_idx
  on public.trade_payment_appeal_reviewer_nominations(nominated_by);
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
