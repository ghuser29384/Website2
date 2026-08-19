begin;

insert into auth.users(
  id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) values
  ('7a111111-1111-4111-8111-111111111111','authenticated','authenticated','pool-review-creator@example.test','',now(),'{"provider":"email","providers":["email"]}','{"display_name":"Pool Review Creator"}',now(),now()),
  ('7b222222-2222-4222-8222-222222222222','authenticated','authenticated','pool-review-reviewer@example.test','',now(),'{"provider":"email","providers":["email"]}','{"display_name":"Pool Review Reviewer"}',now(),now()),
  ('7c333333-3333-4333-8333-333333333333','authenticated','authenticated','pool-review-outsider@example.test','',now(),'{"provider":"email","providers":["email"]}','{"display_name":"Pool Review Outsider"}',now(),now())
on conflict (id) do nothing;

insert into public.profiles(id, email, display_name, bio, affiliation)
values
  ('7a111111-1111-4111-8111-111111111111','pool-review-creator@example.test','Pool Review Creator','',''),
  ('7b222222-2222-4222-8222-222222222222','pool-review-reviewer@example.test','Pool Review Reviewer','',''),
  ('7c333333-3333-4333-8333-333333333333','pool-review-outsider@example.test','Pool Review Outsider','','')
on conflict (id) do update set email = excluded.email, display_name = excluded.display_name;

insert into public.mpgf_pool_reviewers(
  reviewer_id, active, authorized_by, rationale, expires_at
) values (
  '7b222222-2222-4222-8222-222222222222',
  true,
  '7b222222-2222-4222-8222-222222222222',
  'Transactional QA reviewer authorization',
  timezone('utc', now()) + interval '1 hour'
);

insert into public.mpgf_pool_proposals (
  id, proposer_id, title, problem, intervention, moral_public_good_rationale,
  proposed_recipient_name, summary, cause_area, requested_maximum_funding_cents,
  minimum_viable_funding_cents, outcome_units_summary, expected_effect_vs_funding,
  timeline, milestones_json, risks_json, misuse_pathways, implementing_team_json,
  status, submitted_at, public_goods_destination_type, public_goods_destination_ref,
  public_goods_threshold_amount_cents, public_goods_threshold_supporters,
  public_goods_deadline_at, public_goods_verification_method, public_goods_baseline_rule,
  public_goods_exit_rule, public_goods_base_match_ratio, public_goods_qf_enabled,
  public_goods_qf_cap_multiple, public_goods_payout_method,
  public_goods_failure_bonus_enabled, public_goods_success_premium_included_in_net_threshold
) values (
  '7d444444-4444-4444-8444-444444444444',
  '7a111111-1111-4111-8111-111111111111',
  'QA pool review and freeze',
  'Synthetic QA problem',
  'Synthetic QA intervention',
  'Synthetic QA public-good rationale',
  'Synthetic QA recipient',
  'Synthetic QA summary',
  'QA',
  100000,
  50000,
  'One verified QA outcome',
  'Synthetic QA effect',
  'Synthetic QA timeline',
  '[]'::jsonb,
  '[]'::jsonb,
  'None; transaction rolls back',
  '{"summary":"Synthetic QA team"}'::jsonb,
  'submitted',
  timezone('utc', now()),
  'external_charity',
  'qa-recipient-reference',
  50000,
  2,
  timezone('utc', now()) + interval '30 days',
  'Synthetic QA evidence',
  'No charge without success',
  'Pledges expire on lapse',
  0,
  false,
  1.5,
  'external_handoff',
  false,
  false
);

-- Direct MPGF proposal path: no linked Moral Trade Create terms.
insert into public.mpgf_pool_proposals (
  id, proposer_id, title, problem, intervention, moral_public_good_rationale,
  proposed_recipient_name, summary, cause_area, requested_maximum_funding_cents,
  minimum_viable_funding_cents, outcome_units_summary, expected_effect_vs_funding,
  timeline, milestones_json, risks_json, misuse_pathways, implementing_team_json,
  status, submitted_at, public_goods_destination_type, public_goods_destination_ref,
  public_goods_threshold_amount_cents, public_goods_threshold_supporters,
  public_goods_deadline_at, public_goods_verification_method, public_goods_baseline_rule,
  public_goods_exit_rule, public_goods_base_match_ratio, public_goods_qf_enabled,
  public_goods_qf_cap_multiple, public_goods_payout_method,
  public_goods_failure_bonus_enabled, public_goods_success_premium_included_in_net_threshold
) values (
  '7d666666-6666-4666-8666-666666666666',
  '7a111111-1111-4111-8111-111111111111',
  'QA direct pool review and freeze',
  'Synthetic direct QA problem',
  'Synthetic direct QA intervention',
  'Synthetic direct QA public-good rationale',
  'Synthetic direct QA recipient',
  'Synthetic direct QA summary',
  'QA',
  100000,
  50000,
  'One verified direct QA outcome',
  'Synthetic direct QA effect',
  'Synthetic direct QA timeline',
  '[]'::jsonb,
  '[]'::jsonb,
  'None; transaction rolls back',
  '{"summary":"Synthetic direct QA team"}'::jsonb,
  'submitted',
  timezone('utc', now()),
  'external_charity',
  'qa-direct-recipient-reference',
  50000,
  2,
  timezone('utc', now()) + interval '30 days',
  'Synthetic direct QA evidence',
  'No charge without success',
  'Pledges expire on lapse',
  0,
  false,
  1.5,
  'external_handoff',
  false,
  false
);

insert into public.moral_trade_create_submissions (
  id, owner_profile_id, submission_key, interface_version, submission_kind,
  cause_area, request_kind, requested_action, offered_terms_json, pool_terms_json,
  source_payload_json, source_payload_hash, target_type, target_id, status, canonical_path
) values (
  '7e555555-5555-4555-8555-555555555555',
  '7a111111-1111-4111-8111-111111111111',
  'qa-pool-review-freeze-v1',
  'moral_trade_create_v1',
  'pool_create',
  'QA',
  'fund',
  'Fund a synthetic QA public good',
  '[]'::jsonb,
  '{"thresholdAmountsCents":[50000],"deadlineAt":"2099-01-01T00:00:00Z"}'::jsonb,
  '{"interfaceVersion":"moral_trade_create_v1","submissionKey":"qa-pool-review-freeze-v1","cause":"QA","requestKind":"fund","requestAction":"Fund a synthetic QA public good","offers":[]}'::jsonb,
  repeat('a', 64),
  'mpgf_pool_proposal',
  '7d444444-4444-4444-8444-444444444444',
  'pending_review',
  '/create/submissions/7e555555-5555-4555-8555-555555555555'
);

insert into public.moral_trade_create_pool_terms (
  pool_proposal_id, create_submission_id, threshold_amounts_cents_json,
  deadline_at, failure_bonus_base_type, failure_bonus_base_terms_json,
  failure_bonus_timing_mode, failure_bonus_timing_terms_json, continuation_mode,
  threshold_visibility, progress_visibility, moral_trade_failure_bonus_share_bps,
  additional_activation_rule, reserve_quote_status, review_status
) values (
  '7d444444-4444-4444-8444-444444444444',
  '7e555555-5555-4555-8555-555555555555',
  '[50000]'::jsonb,
  timezone('utc', now()) + interval '30 days',
  'none',
  '{}'::jsonb,
  'all',
  '{}'::jsonb,
  'stop',
  'public_exact',
  'exact_amount',
  0,
  '',
  'not_applicable',
  'pending_review'
);

-- Ordinary authenticated users cannot self-approve or alter review status.
set local role authenticated;
set local "request.jwt.claim.sub" = '7a111111-1111-4111-8111-111111111111';
set local "request.jwt.claim.role" = 'authenticated';
do $test$
begin
  begin
    update public.mpgf_pool_proposals
    set status = 'approved_as_candidate'
    where id = '7d444444-4444-4444-8444-444444444444';
    raise exception 'Creator unexpectedly changed pool review status.';
  exception
    when insufficient_privilege then null;
  end;

  begin
    update public.mpgf_pool_proposals
    set first_accepted_pledge_at = timezone('utc', now())
    where id = '7d444444-4444-4444-8444-444444444444';
    raise exception 'Creator unexpectedly forged the first-pledge latch.';
  exception
    when insufficient_privilege then null;
  end;
end;
$test$;
reset role;

-- An outsider cannot mutate even the one owner-editable visibility field.
set local role authenticated;
set local "request.jwt.claim.sub" = '7c333333-3333-4333-8333-333333333333';
set local "request.jwt.claim.role" = 'authenticated';
do $test$
declare
  affected integer;
begin
  update public.mpgf_pool_proposals
  set progress_visibility = 'progress_range'
  where id = '7d444444-4444-4444-8444-444444444444';
  get diagnostics affected = row_count;
  if affected <> 0 then
    raise exception 'Outsider unexpectedly changed the creator pool.';
  end if;
end;
$test$;
reset role;

-- An unauthorized profile cannot begin review.
do $test$
begin
  begin
    perform public.mpgf_begin_pool_proposal_review(
      '7d444444-4444-4444-8444-444444444444',
      '7c333333-3333-4333-8333-333333333333',
      'Attempted outsider review'
    );
    raise exception 'Unauthorized review unexpectedly succeeded.';
  exception
    when insufficient_privilege then null;
  end;
end;
$test$;

-- A proposer cannot review their own record, even if someone mistakenly grants reviewer authorization.
insert into public.mpgf_pool_reviewers(reviewer_id, active, authorized_by, rationale)
values (
  '7a111111-1111-4111-8111-111111111111', true,
  '7b222222-2222-4222-8222-222222222222', 'QA self-review rejection check'
);
do $test$
begin
  begin
    perform public.mpgf_begin_pool_proposal_review(
      '7d444444-4444-4444-8444-444444444444',
      '7a111111-1111-4111-8111-111111111111',
      'Attempted self review'
    );
    raise exception 'Self review unexpectedly succeeded.';
  exception
    when insufficient_privilege then null;
  end;
end;
$test$;

-- A supported direct MPGF proposal without linked Create terms can still be versioned,
-- independently reviewed, and frozen. Its optional Create snapshot must be SQL null,
-- not JSON null.
select * from public.mpgf_begin_pool_proposal_review(
  '7d666666-6666-4666-8666-666666666666',
  '7b222222-2222-4222-8222-222222222222',
  'QA direct proposal review started'
);
select * from public.mpgf_approve_and_freeze_pool_proposal(
  '7d666666-6666-4666-8666-666666666666',
  '7b222222-2222-4222-8222-222222222222',
  'QA direct proposal terms approved and frozen'
);

do $test$
declare
  direct_status text;
  direct_create_terms jsonb;
begin
  select proposal.status, version.create_pool_terms_json
  into direct_status, direct_create_terms
  from public.mpgf_pool_proposals as proposal
  join public.mpgf_pool_proposal_versions as version
    on version.proposal_id = proposal.id
   and version.terms_version = proposal.approved_terms_version
  where proposal.id = '7d666666-6666-4666-8666-666666666666';

  if direct_status <> 'approved_as_candidate' then
    raise exception 'Direct proposal did not reach approved frozen status.';
  end if;
  if direct_create_terms is not null then
    raise exception 'Direct proposal version stored JSON null instead of SQL null.';
  end if;
end;
$test$;

select * from public.mpgf_begin_pool_proposal_review(
  '7d444444-4444-4444-8444-444444444444',
  '7b222222-2222-4222-8222-222222222222',
  'QA review started'
);

-- Proposal fields are immutable once review begins.
do $test$
begin
  begin
    update public.mpgf_pool_proposals
    set title = 'Forbidden under-review drift'
    where id = '7d444444-4444-4444-8444-444444444444';
    raise exception 'Under-review proposal unexpectedly changed.';
  exception
    when check_violation then null;
  end;
end;
$test$;

-- Approval also fails closed against drift in the service-controlled linked terms.
update public.moral_trade_create_pool_terms
set additional_activation_rule = 'Drifted linked term that must not be approved'
where pool_proposal_id = '7d444444-4444-4444-8444-444444444444';
do $test$
begin
  begin
    perform public.mpgf_approve_and_freeze_pool_proposal(
      '7d444444-4444-4444-8444-444444444444',
      '7b222222-2222-4222-8222-222222222222',
      'Should reject linked-term drift'
    );
    raise exception 'Drifted linked terms unexpectedly approved.';
  exception
    when check_violation then null;
  end;
end;
$test$;

update public.moral_trade_create_pool_terms
set additional_activation_rule = ''
where pool_proposal_id = '7d444444-4444-4444-8444-444444444444';

select * from public.mpgf_approve_and_freeze_pool_proposal(
  '7d444444-4444-4444-8444-444444444444',
  '7b222222-2222-4222-8222-222222222222',
  'QA terms approved and frozen'
);

do $test$
declare
  proposal_row public.mpgf_pool_proposals%rowtype;
  version_count integer;
  event_types text[];
begin
  select * into proposal_row
  from public.mpgf_pool_proposals
  where id = '7d444444-4444-4444-8444-444444444444';

  if proposal_row.status <> 'approved_as_candidate'
     or proposal_row.approved_terms_version <> 1
     or proposal_row.operative_terms_sha256 !~ '^sha256:[a-f0-9]{64}$'
     or proposal_row.terms_locked_at is null
     or proposal_row.reviewed_by <> '7b222222-2222-4222-8222-222222222222'::uuid then
    raise exception 'Approved proposal did not persist complete frozen review metadata.';
  end if;

  select count(*) into version_count
  from public.mpgf_pool_proposal_versions
  where proposal_id = proposal_row.id and terms_version = 1;
  if version_count <> 1 then
    raise exception 'Expected exactly one immutable version, found %.', version_count;
  end if;

  select array_agg(event_type order by event_sequence) into event_types
  from public.mpgf_pool_lifecycle_events
  where proposal_id = proposal_row.id;
  if event_types is distinct from array['review_started','terms_approved_and_frozen']::text[] then
    raise exception 'Unexpected lifecycle event sequence: %', event_types;
  end if;
end;
$test$;

-- Frozen operative terms reject even service-role drift.
do $test$
begin
  begin
    update public.mpgf_pool_proposals
    set title = 'Forbidden post-approval drift'
    where id = '7d444444-4444-4444-8444-444444444444';
    raise exception 'Frozen proposal unexpectedly changed.';
  exception
    when check_violation then null;
  end;

  begin
    update public.moral_trade_create_pool_terms
    set additional_activation_rule = 'Forbidden post-approval drift'
    where pool_proposal_id = '7d444444-4444-4444-8444-444444444444';
    raise exception 'Frozen Create pool terms unexpectedly changed.';
  exception
    when check_violation then null;
  end;

  begin
    delete from public.mpgf_pool_lifecycle_events
    where proposal_id = '7d444444-4444-4444-8444-444444444444';
    raise exception 'Lifecycle audit event unexpectedly deleted.';
  exception
    when check_violation then null;
  end;

  begin
    update public.mpgf_pool_proposal_versions
    set recorded_reason = 'Forbidden mutation'
    where proposal_id = '7d444444-4444-4444-8444-444444444444';
    raise exception 'Version snapshot unexpectedly changed.';
  exception
    when check_violation then null;
  end;
end;
$test$;

rollback;
