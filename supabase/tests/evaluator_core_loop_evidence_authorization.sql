\set ON_ERROR_STOP on
\getenv owner_id EVIDENCE_PAYMENT_QA_PAYER_ID
\getenv responder_id EVIDENCE_PAYMENT_QA_PAYEE_ID
\getenv reviewer_id EVIDENCE_PAYMENT_QA_REVIEWER_ID
\getenv appeal_reviewer_id EVIDENCE_PAYMENT_QA_APPEAL_REVIEWER_ID
\getenv outsider_id EVIDENCE_PAYMENT_QA_OUTSIDER_ID
\getenv admin_id EVIDENCE_PAYMENT_QA_ADMIN_ID
\getenv agreement_id EVIDENCE_PAYMENT_QA_AGREEMENT_ID
\getenv agreement_version_id EVIDENCE_PAYMENT_QA_AGREEMENT_VERSION_ID
\getenv milestone_id EVIDENCE_PAYMENT_QA_MILESTONE_ID
\getenv evidence_bundle_id EVIDENCE_PAYMENT_QA_EVIDENCE_BUNDLE_ID
\getenv evidence_item_id EVIDENCE_PAYMENT_QA_EVIDENCE_ITEM_INITIAL_ID
\getenv milestone_review_id EVIDENCE_PAYMENT_QA_MILESTONE_REVIEW_ID
\getenv milestone_appeal_id EVIDENCE_PAYMENT_QA_MILESTONE_APPEAL_ID

-- Executable rollback-only RLS proof for six distinct run-owned identities.
-- The surrounding fixture supplies profiles and active reviewer/admin grants.
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
  :'agreement_id'::uuid,
  :'owner_id'::uuid,
  :'responder_id'::uuid,
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
  :'agreement_version_id'::uuid,
  :'agreement_id'::uuid,
  1,
  :'owner_id'::uuid,
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
set current_version_id = :'agreement_version_id'::uuid
where id = :'agreement_id'::uuid;

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
  :'milestone_id'::uuid,
  :'agreement_id'::uuid,
  :'agreement_version_id'::uuid,
  1,
  :'responder_id'::uuid,
  :'owner_id'::uuid,
  'other',
  'Complete the rollback-only private-evidence authorization proof.',
  'checkpoint',
  1,
  true,
  0,
  'USD',
  'One private synthetic attestation.',
  'under_review',
  :'reviewer_id'::uuid
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
  :'evidence_bundle_id'::uuid,
  :'milestone_id'::uuid,
  :'responder_id'::uuid,
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
  :'evidence_item_id'::uuid,
  :'evidence_bundle_id'::uuid,
  'attestation',
  'Rollback-only private QA evidence.'
);

update public.trade_evidence_bundles
set status = 'submitted',
    submitted_at = now()
where id = :'evidence_bundle_id'::uuid;

update public.trade_agreement_milestones
set current_bundle_id = :'evidence_bundle_id'::uuid
where id = :'milestone_id'::uuid;

-- A participant who did not submit the packet can read at AAL1.
select set_config('request.jwt.claim.sub', :'owner_id', true);
select set_config(
  'request.jwt.claims',
  jsonb_build_object(
    'sub', :'owner_id',
    'role', 'authenticated',
    'aal', 'aal1'
  )::text,
  true
);
set local role authenticated;
do $test$
begin
  if (
    select count(*) from public.trade_evidence_bundles
    where id = :'evidence_bundle_id'::uuid
  ) <> 1 or (
    select count(*) from public.trade_evidence_bundle_items
    where id = :'evidence_item_id'::uuid
  ) <> 1 then
    raise exception 'An AAL1 participant cannot read submitted private evidence.';
  end if;
end;
$test$;
reset role;

-- Assignment without AAL2 is insufficient.
select set_config('request.jwt.claim.sub', :'reviewer_id', true);
select set_config(
  'request.jwt.claims',
  jsonb_build_object(
    'sub', :'reviewer_id',
    'role', 'authenticated',
    'aal', 'aal1'
  )::text,
  true
);
set local role authenticated;
do $test$
begin
  if (
    select count(*) from public.trade_evidence_bundles
    where id = :'evidence_bundle_id'::uuid
  ) <> 0 or (
    select count(*) from public.trade_evidence_bundle_items
    where id = :'evidence_item_id'::uuid
  ) <> 0 then
    raise exception 'An assigned AAL1 reviewer can read submitted private evidence.';
  end if;
end;
$test$;
reset role;

-- The active initial reviewer can read at AAL2 before a decision.
select set_config(
  'request.jwt.claims',
  jsonb_build_object(
    'sub', :'reviewer_id',
    'role', 'authenticated',
    'aal', 'aal2'
  )::text,
  true
);
set local role authenticated;
do $test$
begin
  if (
    select count(*) from public.trade_evidence_bundles
    where id = :'evidence_bundle_id'::uuid
  ) <> 1 or (
    select count(*) from public.trade_evidence_bundle_items
    where id = :'evidence_item_id'::uuid
  ) <> 1 then
    raise exception 'An active assigned AAL2 initial reviewer cannot read before review.';
  end if;
end;
$test$;
reset role;

-- Record the initial decision and retain read-only audit access.
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
  :'milestone_review_id'::uuid,
  :'milestone_id'::uuid,
  :'evidence_bundle_id'::uuid,
  :'reviewer_id'::uuid,
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
set status = 'accepted', reviewed_at = now()
where id = :'evidence_bundle_id'::uuid;

update public.trade_agreement_milestones
set status = 'graded'
where id = :'milestone_id'::uuid;

set local role authenticated;
do $test$
begin
  if (
    select count(*) from public.trade_evidence_bundles
    where id = :'evidence_bundle_id'::uuid
  ) <> 1 or (
    select count(*) from public.trade_evidence_bundle_items
    where id = :'evidence_item_id'::uuid
  ) <> 1 then
    raise exception 'The initial AAL2 reviewer lost retained private audit access.';
  end if;
end;
$test$;
reset role;

-- A distinct appeal reviewer, not the original reviewer, receives the appeal.
update public.trade_agreement_milestones
set assigned_reviewer_id = null,
    status = 'appeal_pending'
where id = :'milestone_id'::uuid;

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
  :'milestone_appeal_id'::uuid,
  :'milestone_id'::uuid,
  :'milestone_review_id'::uuid,
  :'owner_id'::uuid,
  'Rollback-only appeal authorization check.',
  'assigned',
  :'appeal_reviewer_id'::uuid,
  now() + interval '7 days'
);

select set_config('request.jwt.claim.sub', :'appeal_reviewer_id', true);
select set_config(
  'request.jwt.claims',
  jsonb_build_object(
    'sub', :'appeal_reviewer_id',
    'role', 'authenticated',
    'aal', 'aal2'
  )::text,
  true
);
set local role authenticated;
do $test$
begin
  if (
    select count(*) from public.trade_evidence_bundles
    where id = :'evidence_bundle_id'::uuid
  ) <> 1 or (
    select count(*) from public.trade_evidence_bundle_items
    where id = :'evidence_item_id'::uuid
  ) <> 1 then
    raise exception 'The distinct active assigned AAL2 appeal reviewer cannot read private evidence.';
  end if;
end;
$test$;
reset role;

-- Revocation takes effect immediately for the appeal reviewer even with an
-- already-issued AAL2 token.
update public.trade_review_role_grants
set active = false, revoked_at = now()
where profile_id = :'appeal_reviewer_id'::uuid
  and role = 'reviewer';

set local role authenticated;
do $test$
begin
  if (
    select count(*) from public.trade_evidence_bundles
    where id = :'evidence_bundle_id'::uuid
  ) <> 0 or (
    select count(*) from public.trade_evidence_bundle_items
    where id = :'evidence_item_id'::uuid
  ) <> 0 then
    raise exception 'A revoked assigned appeal reviewer can read private evidence.';
  end if;
end;
$test$;
reset role;

-- An unrelated authenticated actor remains denied.
select set_config('request.jwt.claim.sub', :'outsider_id', true);
select set_config(
  'request.jwt.claims',
  jsonb_build_object(
    'sub', :'outsider_id',
    'role', 'authenticated',
    'aal', 'aal2'
  )::text,
  true
);
set local role authenticated;
do $test$
begin
  if (
    select count(*) from public.trade_evidence_bundles
    where id = :'evidence_bundle_id'::uuid
  ) <> 0 or (
    select count(*) from public.trade_evidence_bundle_items
    where id = :'evidence_item_id'::uuid
  ) <> 0 then
    raise exception 'An outsider can read private evidence.';
  end if;
end;
$test$;
reset role;

-- Administrators retain their active-AAL2 path.
select set_config('request.jwt.claim.sub', :'admin_id', true);
select set_config(
  'request.jwt.claims',
  jsonb_build_object(
    'sub', :'admin_id',
    'role', 'authenticated',
    'aal', 'aal2'
  )::text,
  true
);
set local role authenticated;
do $test$
begin
  if (
    select count(*) from public.trade_evidence_bundles
    where id = :'evidence_bundle_id'::uuid
  ) <> 1 or (
    select count(*) from public.trade_evidence_bundle_items
    where id = :'evidence_item_id'::uuid
  ) <> 1 then
    raise exception 'An active AAL2 administrator cannot read private evidence.';
  end if;
end;
$test$;
reset role;

select json_build_object(
  'participantAal1', true,
  'assignedInitialReviewerAal1', false,
  'activeInitialReviewerAal2BeforeDecision', true,
  'retainedInitialReviewerAal2AfterDecision', true,
  'distinctActiveAppealReviewerAal2', true,
  'revokedAppealReviewerAal2', false,
  'outsider', false,
  'administratorAal2', true,
  'distinctReviewerIds', :'reviewer_id' <> :'appeal_reviewer_id',
  'durableRows', 0
) as evaluator_evidence_authorization;

rollback;
