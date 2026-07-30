-- Phase 3B: post-cutover advisor hardening.
--
-- Apply only after:
--   1. 20260729165533_evidence_weighted_privacy_authorization_cutover.sql; and
--   2. the compatible application artifact has passed authenticated QA.
--
-- The retired evidence RPCs trust a caller-supplied profile identifier and
-- belong to the legacy dossier workflow. The Phase 3 application no longer
-- calls them, so no API role may execute them after the privacy cutover.
revoke all on function public.initialize_public_trade_evidence()
  from public, anon, authenticated, service_role;
revoke all on function public.register_trade_evidence_v3(
  uuid, uuid, text, text, text, text, text, uuid
) from public, anon, authenticated, service_role;
revoke all on function public.publish_trade_evidence_v3(
  uuid, uuid, text, text, text, text, text, text, text
) from public, anon, authenticated, service_role;
revoke all on function public.review_trade_evidence_v3(
  uuid, uuid, text, text
) from public, anon, authenticated, service_role;
revoke all on function public.withdraw_trade_evidence_v3(
  uuid, uuid, text
) from public, anon, authenticated, service_role;

-- Cover the remaining release-owned foreign keys reported after the
-- restrictive migration was exercised in isolated QA.
-- The legacy review console is optional in older production lineages.
do $legacy_review_indexes$
begin
  if to_regclass('public.agreement_review_cases') is not null then
    execute 'create index if not exists agreement_review_cases_appeal_requester_idx on public.agreement_review_cases(appeal_requested_by)';
    execute 'create index if not exists agreement_review_cases_assigned_reviewer_idx on public.agreement_review_cases(assigned_reviewer_id)';
    execute 'create index if not exists agreement_review_cases_evidence_item_idx on public.agreement_review_cases(evidence_item_id)';
    execute 'create index if not exists agreement_review_cases_opener_idx on public.agreement_review_cases(opened_by)';
    execute 'create index if not exists agreement_review_cases_reviewer_idx on public.agreement_review_cases(reviewed_by)';
  end if;
end;
$legacy_review_indexes$;

create index if not exists trade_milestone_reviewer_nominations_nominator_idx
  on public.trade_milestone_reviewer_nominations(nominated_by);
create index if not exists trade_milestone_reviewer_nominations_reviewer_idx
  on public.trade_milestone_reviewer_nominations(reviewer_id);
create index if not exists trade_review_role_grants_grantor_idx
  on public.trade_review_role_grants(granted_by);

notify pgrst, 'reload schema';
