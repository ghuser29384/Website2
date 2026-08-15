\set ON_ERROR_STOP on

-- Executable, rollback-only RLS proof for the private evidence reader. The
-- surrounding evaluator fixture supplies five synthetic profiles and active
-- reviewer/administrator grants; this transaction creates no durable rows.

begin;

insert into public.agreements (
  id,
  proposer_id,
  responder_id,
  status,
  lifecycle_status,
  source,
  completion_state
)
values (
  '83000000-0000-4000-8000-000000000001',
  '81000000-0000-4000-8000-000000000001',
  '81000000-0000-4000-8000-000000000002',
  'active',
  'active',
  'manual',
  'under_review'
);

insert into public.trade_agreement_versions (
  id,
  agreement_id,
  version,
  proposed_by,
  proposed_action,
  requested_action,
  duration,
  evidence_rule,
  exit_conditions,
  maximum_burden,
  privacy_scope,
  no_trade_baseline,
  terms_hash,
  requires_milestone_manifest,
  milestone_manifest_hash,
  complete_terms_hash
)
values (
  '83000000-0000-4000-8000-000000000002',
  '83000000-0000-4000-8000-000000000001',
  1,
  '81000000-0000-4000-8000-000000000001',
  'Run one rollback-only authorization check.',
  'Submit one private synthetic attestation.',
  'One isolated SQL transaction',
  'Participants and authorized reviewers only.',
  'Either participant may exit prospectively.',
  'Zero dollars',
  'Private isolated QA',
  'No action occurs without this test.',
  repeat('8', 64),
  false,
  null,
  null
);

update public.agreements
set current_version_id = '83000000-0000-4000-8000-000000000002'
where id = '83000000-0000-4000-8000-000000000001';

insert into public.trade_agreement_milestones (
  id,
  agreement_id,
  agreement_version_id,
  position,
  performer_id,
  payer_id,
  action_category,
  description,
  unit_label,
  units_total,
  indivisible,
  maximum_amount_cents,
  currency,
  evidence_rule,
  status,
  assigned_reviewer_id
)
values (
  '83000000-0000-4000-8000-000000000003',
  '83000000-0000-4000-8000-000000000001',
  '83000000-0000-4000-8000-000000000002',
  1,
  '81000000-0000-4000-8000-000000000002',
  '81000000-0000-4000-8000-000000000001',
  'other',
  'Complete the rollback-only private-evidence authorization proof.',
  'checkpoint',
  1,
  true,
  0,
  'USD',
  'One private synthetic attestation.',
  'under_review',
  '81000000-0000-4000-8000-000000000004'
);

insert into public.trade_evidence_bundles (
  id,
  milestone_id,
  submitted_by,
  bundle_kind,
  attempt_number,
  status,
  submitted_at
)
values (
  '83000000-0000-4000-8000-000000000004',
  '83000000-0000-4000-8000-000000000003',
  '81000000-0000-4000-8000-000000000002',
  'initial',
  1,
  'draft',
  null
);

insert into public.trade_evidence_bundle_items (
  id,
  bundle_id,
  evidence_type,
  attestation
)
values (
  '83000000-0000-4000-8000-000000000005',
  '83000000-0000-4000-8000-000000000004',
  'attestation',
  'Rollback-only private QA evidence.'
);

update public.trade_evidence_bundles
set status = 'submitted',
    submitted_at = now()
where id = '83000000-0000-4000-8000-000000000004';

update public.trade_agreement_milestones
set current_bundle_id = '83000000-0000-4000-8000-000000000004'
where id = '83000000-0000-4000-8000-000000000003';

-- A participant who did not submit the packet can still read at AAL1.
select set_config(
  'request.jwt.claim.sub',
  '81000000-0000-4000-8000-000000000001',
  true
);
select set_config(
  'request.jwt.claims',
  jsonb_build_object(
    'sub', '81000000-0000-4000-8000-000000000001',
    'role', 'authenticated',
    'aal', 'aal1'
  )::text,
  true
);
set local role authenticated;
do $test$
begin
  if (
    select count(*)
    from public.trade_evidence_bundles
    where id = '83000000-0000-4000-8000-000000000004'
  ) <> 1 or (
    select count(*)
    from public.trade_evidence_bundle_items
    where id = '83000000-0000-4000-8000-000000000005'
  ) <> 1 then
    raise exception 'An AAL1 participant cannot read submitted private evidence.';
  end if;
end;
$test$;
reset role;

-- Assignment without AAL2 is insufficient.
select set_config(
  'request.jwt.claim.sub',
  '81000000-0000-4000-8000-000000000004',
  true
);
select set_config(
  'request.jwt.claims',
  jsonb_build_object(
    'sub', '81000000-0000-4000-8000-000000000004',
    'role', 'authenticated',
    'aal', 'aal1'
  )::text,
  true
);
set local role authenticated;
do $test$
begin
  if (
    select count(*)
    from public.trade_evidence_bundles
    where id = '83000000-0000-4000-8000-000000000004'
  ) <> 0 or (
    select count(*)
    from public.trade_evidence_bundle_items
    where id = '83000000-0000-4000-8000-000000000005'
  ) <> 0 then
    raise exception 'An assigned AAL1 reviewer can read submitted private evidence.';
  end if;
end;
$test$;
reset role;

-- An active assigned reviewer can read at AAL2 before a decision.
select set_config(
  'request.jwt.claims',
  jsonb_build_object(
    'sub', '81000000-0000-4000-8000-000000000004',
    'role', 'authenticated',
    'aal', 'aal2'
  )::text,
  true
);
set local role authenticated;
do $test$
begin
  if (
    select count(*)
    from public.trade_evidence_bundles
    where id = '83000000-0000-4000-8000-000000000004'
  ) <> 1 or (
    select count(*)
    from public.trade_evidence_bundle_items
    where id = '83000000-0000-4000-8000-000000000005'
  ) <> 1 then
    raise exception 'An active assigned AAL2 reviewer cannot read before review.';
  end if;
end;
$test$;
reset role;

-- Record the decision and retain the same reviewer audit access.
insert into public.trade_milestone_reviews (
  id,
  milestone_id,
  bundle_id,
  reviewer_id,
  review_kind,
  outcome,
  completion_units,
  confidence_band,
  payout_basis_points,
  amount_due_cents,
  private_reason,
  appeal_deadline_at,
  is_final
)
values (
  '83000000-0000-4000-8000-000000000006',
  '83000000-0000-4000-8000-000000000003',
  '83000000-0000-4000-8000-000000000004',
  '81000000-0000-4000-8000-000000000004',
  'initial',
  'graded',
  1,
  100,
  10000,
  0,
  'Rollback-only neutral review.',
  now() + interval '7 days',
  false
);

update public.trade_evidence_bundles
set status = 'accepted',
    reviewed_at = now()
where id = '83000000-0000-4000-8000-000000000004';

update public.trade_agreement_milestones
set status = 'graded'
where id = '83000000-0000-4000-8000-000000000003';

set local role authenticated;
do $test$
begin
  if (
    select count(*)
    from public.trade_evidence_bundles
    where id = '83000000-0000-4000-8000-000000000004'
  ) <> 1 or (
    select count(*)
    from public.trade_evidence_bundle_items
    where id = '83000000-0000-4000-8000-000000000005'
  ) <> 1 then
    raise exception 'The assigned AAL2 reviewer lost private audit access after review.';
  end if;
end;
$test$;
reset role;

-- Exercise the separately assigned appeal-reviewer branch without allowing the
-- original milestone assignment to satisfy the helper.
update public.trade_agreement_milestones
set assigned_reviewer_id = null,
    status = 'appeal_pending'
where id = '83000000-0000-4000-8000-000000000003';

insert into public.trade_milestone_appeals (
  id,
  milestone_id,
  base_review_id,
  opened_by,
  reason,
  status,
  assigned_reviewer_id,
  reviewer_selection_deadline_at
)
values (
  '83000000-0000-4000-8000-000000000007',
  '83000000-0000-4000-8000-000000000003',
  '83000000-0000-4000-8000-000000000006',
  '81000000-0000-4000-8000-000000000001',
  'Rollback-only appeal authorization check.',
  'assigned',
  '81000000-0000-4000-8000-000000000004',
  now() + interval '7 days'
);

set local role authenticated;
do $test$
begin
  if (
    select count(*)
    from public.trade_evidence_bundles
    where id = '83000000-0000-4000-8000-000000000004'
  ) <> 1 or (
    select count(*)
    from public.trade_evidence_bundle_items
    where id = '83000000-0000-4000-8000-000000000005'
  ) <> 1 then
    raise exception 'An active assigned AAL2 appeal reviewer cannot read private evidence.';
  end if;
end;
$test$;
reset role;

-- Revocation takes effect immediately even for an already-AAL2 token.
update public.trade_review_role_grants
set active = false,
    revoked_at = now()
where profile_id = '81000000-0000-4000-8000-000000000004'
  and role = 'reviewer';

set local role authenticated;
do $test$
begin
  if (
    select count(*)
    from public.trade_evidence_bundles
    where id = '83000000-0000-4000-8000-000000000004'
  ) <> 0 or (
    select count(*)
    from public.trade_evidence_bundle_items
    where id = '83000000-0000-4000-8000-000000000005'
  ) <> 0 then
    raise exception 'A revoked assigned AAL2 reviewer can read private evidence.';
  end if;
end;
$test$;
reset role;

-- An unrelated authenticated actor remains denied.
select set_config(
  'request.jwt.claim.sub',
  '81000000-0000-4000-8000-000000000003',
  true
);
select set_config(
  'request.jwt.claims',
  jsonb_build_object(
    'sub', '81000000-0000-4000-8000-000000000003',
    'role', 'authenticated',
    'aal', 'aal2'
  )::text,
  true
);
set local role authenticated;
do $test$
begin
  if (
    select count(*)
    from public.trade_evidence_bundles
    where id = '83000000-0000-4000-8000-000000000004'
  ) <> 0 or (
    select count(*)
    from public.trade_evidence_bundle_items
    where id = '83000000-0000-4000-8000-000000000005'
  ) <> 0 then
    raise exception 'An outsider can read private evidence.';
  end if;
end;
$test$;
reset role;

-- Administrators retain their active-AAL2 access path.
select set_config(
  'request.jwt.claim.sub',
  '81000000-0000-4000-8000-000000000005',
  true
);
select set_config(
  'request.jwt.claims',
  jsonb_build_object(
    'sub', '81000000-0000-4000-8000-000000000005',
    'role', 'authenticated',
    'aal', 'aal2'
  )::text,
  true
);
set local role authenticated;
do $test$
begin
  if (
    select count(*)
    from public.trade_evidence_bundles
    where id = '83000000-0000-4000-8000-000000000004'
  ) <> 1 or (
    select count(*)
    from public.trade_evidence_bundle_items
    where id = '83000000-0000-4000-8000-000000000005'
  ) <> 1 then
    raise exception 'An active AAL2 administrator cannot read private evidence.';
  end if;
end;
$test$;
reset role;

select json_build_object(
  'participantAal1', true,
  'assignedReviewerAal1', false,
  'activeAssignedReviewerAal2BeforeDecision', true,
  'activeAssignedReviewerAal2AfterDecision', true,
  'activeAssignedAppealReviewerAal2', true,
  'revokedAssignedReviewerAal2', false,
  'outsider', false,
  'administratorAal2', true,
  'durableRows', 0
) as evaluator_evidence_authorization;

rollback;
