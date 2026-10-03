begin;

insert into auth.users(
  id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) values
  ('8a111111-1111-4111-8111-111111111111','authenticated','authenticated','pool-publish-creator@example.test','',now(),'{"provider":"email","providers":["email"]}','{"display_name":"Pool Publish Creator"}',now(),now()),
  ('8b222222-2222-4222-8222-222222222222','authenticated','authenticated','pool-publish-reviewer@example.test','',now(),'{"provider":"email","providers":["email"]}','{"display_name":"Pool Publish Reviewer"}',now(),now()),
  ('8c333333-3333-4333-8333-333333333333','authenticated','authenticated','pool-publish-outsider@example.test','',now(),'{"provider":"email","providers":["email"]}','{"display_name":"Pool Publish Outsider"}',now(),now())
on conflict (id) do nothing;

insert into public.profiles(id, email, display_name, bio, affiliation)
values
  ('8a111111-1111-4111-8111-111111111111','pool-publish-creator@example.test','Pool Publish Creator','',''),
  ('8b222222-2222-4222-8222-222222222222','pool-publish-reviewer@example.test','Pool Publish Reviewer','',''),
  ('8c333333-3333-4333-8333-333333333333','pool-publish-outsider@example.test','Pool Publish Outsider','','')
on conflict (id) do update set email = excluded.email, display_name = excluded.display_name;

insert into public.mpgf_pool_reviewers(
  reviewer_id, active, authorized_by, rationale, expires_at
) values (
  '8b222222-2222-4222-8222-222222222222',
  true,
  '8b222222-2222-4222-8222-222222222222',
  'Transactional publication QA reviewer authorization',
  timezone('utc', now()) + interval '1 hour'
);

insert into public.mpgf_public_goods_match_pools (
  id, funder_type, budget_cents, base_match_ratio, qf_bonus_cents,
  visible_commitment, restrictions_json, status
) values (
  'qa-publish-match-20260806',
  'demo_common_ground_pool',
  0,
  0,
  0,
  'Synthetic rollback-only publication QA match pool.',
  '{"qa":true,"noCustody":true}'::jsonb,
  'active'
);

insert into public.mpgf_public_goods_rounds (
  id, name, starts_at, ends_at, match_pool_id, qf_enabled,
  qf_cap_multiple, supporter_gate, status
) values (
  'qa-publish-round-20260806',
  'Synthetic rollback-only publication QA round',
  timezone('utc', now()) - interval '1 day',
  timezone('utc', now()) + interval '60 days',
  'qa-publish-match-20260806',
  false,
  1.5,
  'demo_self_attestation',
  'open'
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
) values
  (
    '8d444444-4444-4444-8444-444444444444',
    '8a111111-1111-4111-8111-111111111111',
    'QA published pool', 'Synthetic QA problem', 'Synthetic QA intervention',
    'Synthetic QA public-good rationale', 'Synthetic QA recipient',
    'Synthetic QA public summary', 'QA publication', 100000, 50000,
    'One verified QA outcome', 'Synthetic QA effect', 'Synthetic QA timeline',
    '[]'::jsonb, '[]'::jsonb, 'None; transaction rolls back',
    '{"summary":"Synthetic QA team"}'::jsonb,
    'submitted', timezone('utc', now()), 'external_charity', 'qa-publish-recipient',
    50000, 2, timezone('utc', now()) + interval '30 days',
    'Synthetic QA evidence', 'No charge without success', 'Pledges expire on lapse',
    0, false, 1.5, 'external_handoff', false, false
  ),
  (
    '8d555555-5555-4555-8555-555555555555',
    '8a111111-1111-4111-8111-111111111111',
    'QA draft pool', 'Synthetic QA problem', 'Synthetic QA intervention',
    'Synthetic QA public-good rationale', 'Synthetic QA recipient',
    'Synthetic QA draft summary', 'QA publication', 100000, 50000,
    'One verified QA outcome', 'Synthetic QA effect', 'Synthetic QA timeline',
    '[]'::jsonb, '[]'::jsonb, 'None; transaction rolls back',
    '{"summary":"Synthetic QA team"}'::jsonb,
    'draft', null, 'external_charity', 'qa-draft-recipient',
    50000, 2, timezone('utc', now()) + interval '30 days',
    'Synthetic QA evidence', 'No charge without success', 'Pledges expire on lapse',
    0, false, 1.5, 'external_handoff', false, false
  ),
  (
    '8d666666-6666-4666-8666-666666666666',
    '8a111111-1111-4111-8111-111111111111',
    'QA incomplete pool', 'Synthetic QA problem', 'Synthetic QA intervention',
    'Synthetic QA public-good rationale', 'Synthetic QA recipient',
    'Synthetic QA incomplete summary', 'QA publication', 100000, 50000,
    'One verified QA outcome', 'Synthetic QA effect', 'Synthetic QA timeline',
    '[]'::jsonb, '[]'::jsonb, 'None; transaction rolls back',
    '{"summary":"Synthetic QA team"}'::jsonb,
    'submitted', timezone('utc', now()), 'external_charity', 'qa-incomplete-recipient',
    50000, null, timezone('utc', now()) + interval '30 days',
    'Synthetic QA evidence', 'No charge without success', 'Pledges expire on lapse',
    0, false, 1.5, 'external_handoff', false, false
  ),
  (
    '8d777777-7777-4777-8777-777777777777',
    '8a111111-1111-4111-8111-111111111111',
    'QA expired pool', 'Synthetic QA problem', 'Synthetic QA intervention',
    'Synthetic QA public-good rationale', 'Synthetic QA recipient',
    'Synthetic QA expired summary', 'QA publication', 100000, 50000,
    'One verified QA outcome', 'Synthetic QA effect', 'Synthetic QA timeline',
    '[]'::jsonb, '[]'::jsonb, 'None; transaction rolls back',
    '{"summary":"Synthetic QA team"}'::jsonb,
    'submitted', timezone('utc', now()), 'external_charity', 'qa-expired-recipient',
    50000, 2, timezone('utc', now()) - interval '1 day',
    'Synthetic QA evidence', 'No charge without success', 'Pledges expire on lapse',
    0, false, 1.5, 'external_handoff', false, false
  );

insert into public.moral_trade_create_submissions (
  id, owner_profile_id, submission_key, interface_version, submission_kind,
  cause_area, request_kind, requested_action, offered_terms_json, pool_terms_json,
  source_payload_json, source_payload_hash, target_type, target_id, status, canonical_path
) values (
  '8e888888-8888-4888-8888-888888888888',
  '8a111111-1111-4111-8111-111111111111',
  'qa-pool-publication-v1',
  'moral_trade_create_v1',
  'pool_create',
  'QA publication',
  'fund',
  'Fund a synthetic published QA public good',
  '[]'::jsonb,
  '{"thresholdAmountsCents":[50000],"deadlineAt":"2099-01-01T00:00:00Z"}'::jsonb,
  '{"interfaceVersion":"moral_trade_create_v1","submissionKey":"qa-pool-publication-v1","cause":"QA publication","requestKind":"fund","requestAction":"Fund a synthetic published QA public good","offers":[]}'::jsonb,
  repeat('b', 64),
  'mpgf_pool_proposal',
  '8d444444-4444-4444-8444-444444444444',
  'pending_review',
  '/create/submissions/8e888888-8888-4888-8888-888888888888'
);

insert into public.moral_trade_create_pool_terms (
  pool_proposal_id, create_submission_id, threshold_amounts_cents_json,
  deadline_at, failure_bonus_base_type, failure_bonus_base_terms_json,
  failure_bonus_timing_mode, failure_bonus_timing_terms_json, continuation_mode,
  threshold_visibility, progress_visibility, moral_trade_failure_bonus_share_bps,
  additional_activation_rule, reserve_quote_status, review_status
) values (
  '8d444444-4444-4444-8444-444444444444',
  '8e888888-8888-4888-8888-888888888888',
  '[50000]'::jsonb,
  timezone('utc', now()) + interval '30 days',
  'none', '{}'::jsonb, 'all', '{}'::jsonb, 'stop',
  'public_exact', 'exact_amount', 0, '', 'not_applicable', 'pending_review'
);

-- The public publication RPC is never executable by ordinary authenticated users.
do $test$
begin
  if has_function_privilege(
    'authenticated',
    'public.mpgf_publish_pool_proposal(uuid,text,text,uuid,text)',
    'EXECUTE'
  ) then
    raise exception 'Authenticated role unexpectedly has publication execution privilege.';
  end if;
end;
$test$;

-- Draft proposals cannot materialize.
do $test$
begin
  begin
    perform public.mpgf_publish_pool_proposal(
      '8d555555-5555-4555-8555-555555555555',
      'qa-publish-round-20260806',
      'qa-draft-pool',
      '8b222222-2222-4222-8222-222222222222',
      'Draft publication must fail'
    );
    raise exception 'Draft proposal unexpectedly published.';
  exception
    when check_violation then null;
  end;
end;
$test$;

select * from public.mpgf_begin_pool_proposal_review(
  '8d444444-4444-4444-8444-444444444444',
  '8b222222-2222-4222-8222-222222222222',
  'Valid publication QA review started'
);
select * from public.mpgf_approve_and_freeze_pool_proposal(
  '8d444444-4444-4444-8444-444444444444',
  '8b222222-2222-4222-8222-222222222222',
  'Valid publication QA terms approved'
);

select * from public.mpgf_begin_pool_proposal_review(
  '8d666666-6666-4666-8666-666666666666',
  '8b222222-2222-4222-8222-222222222222',
  'Incomplete publication QA review started'
);
select * from public.mpgf_approve_and_freeze_pool_proposal(
  '8d666666-6666-4666-8666-666666666666',
  '8b222222-2222-4222-8222-222222222222',
  'Incomplete publication QA terms approved for publication rejection test'
);

select * from public.mpgf_begin_pool_proposal_review(
  '8d777777-7777-4777-8777-777777777777',
  '8b222222-2222-4222-8222-222222222222',
  'Expired publication QA review started'
);
select * from public.mpgf_approve_and_freeze_pool_proposal(
  '8d777777-7777-4777-8777-777777777777',
  '8b222222-2222-4222-8222-222222222222',
  'Expired publication QA terms approved for publication rejection test'
);

-- An unauthorized actor cannot publish an otherwise approved proposal.
do $test$
begin
  begin
    perform public.mpgf_publish_pool_proposal(
      '8d444444-4444-4444-8444-444444444444',
      'qa-publish-round-20260806',
      'qa-published-pool',
      '8c333333-3333-4333-8333-333333333333',
      'Attempted outsider publication'
    );
    raise exception 'Unauthorized publisher unexpectedly succeeded.';
  exception
    when insufficient_privilege then null;
  end;
end;
$test$;

-- Approved but incomplete and expired proposals remain undiscoverable.
do $test$
begin
  begin
    perform public.mpgf_publish_pool_proposal(
      '8d666666-6666-4666-8666-666666666666',
      'qa-publish-round-20260806',
      'qa-incomplete-pool',
      '8b222222-2222-4222-8222-222222222222',
      'Incomplete publication must fail'
    );
    raise exception 'Incomplete proposal unexpectedly published.';
  exception
    when check_violation then null;
  end;

  begin
    perform public.mpgf_publish_pool_proposal(
      '8d777777-7777-4777-8777-777777777777',
      'qa-publish-round-20260806',
      'qa-expired-pool',
      '8b222222-2222-4222-8222-222222222222',
      'Expired publication must fail'
    );
    raise exception 'Expired proposal unexpectedly published.';
  exception
    when check_violation then null;
  end;
end;
$test$;

select * from public.mpgf_publish_pool_proposal(
  '8d444444-4444-4444-8444-444444444444',
  'qa-publish-round-20260806',
  'qa-published-pool',
  '8b222222-2222-4222-8222-222222222222',
  'Publish the approved rollback-only QA pool'
);

-- Replaying the exact publication is idempotent.
select * from public.mpgf_publish_pool_proposal(
  '8d444444-4444-4444-8444-444444444444',
  'qa-publish-round-20260806',
  'qa-published-pool',
  '8b222222-2222-4222-8222-222222222222',
  'Replay the exact rollback-only QA publication'
);

do $test$
declare
  campaign_row public.mpgf_public_goods_campaigns%rowtype;
  proposal_row public.mpgf_pool_proposals%rowtype;
  campaign_count integer;
  publication_event_count integer;
  create_status text;
  forbidden_object_count integer := 0;
  relation_name text;
  relation_count integer;
begin
  select * into campaign_row
  from public.mpgf_public_goods_campaigns
  where pool_proposal_id = '8d444444-4444-4444-8444-444444444444';
  select * into proposal_row
  from public.mpgf_pool_proposals
  where id = '8d444444-4444-4444-8444-444444444444';

  if campaign_row.id <> 'campaign-8d444444444444448444444444444444'
     or campaign_row.round_id <> 'qa-publish-round-20260806'
     or campaign_row.slug <> 'qa-published-pool'
     or campaign_row.review_status <> 'approved'
     or campaign_row.pool_proposal_id <> proposal_row.id
     or campaign_row.published_terms_version <> proposal_row.approved_terms_version
     or campaign_row.published_terms_sha256 <> proposal_row.operative_terms_sha256
     or campaign_row.published_by <> '8b222222-2222-4222-8222-222222222222'::uuid
     or campaign_row.published_at is null
     or campaign_row.threshold_visibility::text <> 'public_exact'
     or campaign_row.first_accepted_pledge_at is not null then
    raise exception 'Published campaign did not preserve the exact approved proposal version.';
  end if;

  select count(*) into campaign_count
  from public.mpgf_public_goods_campaigns
  where pool_proposal_id = proposal_row.id;
  select count(*) into publication_event_count
  from public.mpgf_pool_lifecycle_events
  where proposal_id = proposal_row.id and event_type = 'pool_published';
  if campaign_count <> 1 or publication_event_count <> 1 then
    raise exception 'Idempotent publication created duplicate campaigns or events.';
  end if;

  select status into create_status
  from public.moral_trade_create_submissions
  where target_id = proposal_row.id;
  if create_status <> 'published' then
    raise exception 'Create submission receipt did not transition to published.';
  end if;

  for relation_name in
    select unnest(array[
      'public.mpgf_public_goods_pledges',
      'public.mpgf_pledge_intents',
      'public.mpgf_conditional_pledges'
    ])
  loop
    if to_regclass(relation_name) is not null then
      execute format(
        'select count(*) from %s where campaign_id = $1',
        relation_name
      )
      into relation_count
      using campaign_row.id;
      forbidden_object_count := forbidden_object_count + relation_count;
    end if;
  end loop;
  if forbidden_object_count <> 0 then
    raise exception 'Publication unexpectedly created a pledge or payment intent.';
  end if;
end;
$test$;

-- The canonical campaign table is publicly readable only after materialization.
set local role anon;
do $test$
declare
  visible_count integer;
begin
  select count(*) into visible_count
  from public.mpgf_public_goods_campaigns
  where slug = 'qa-published-pool'
    and review_status = 'approved'
    and published_terms_sha256 is not null;
  if visible_count <> 1 then
    raise exception 'Published campaign was not visible to the anonymous role.';
  end if;
end;
$test$;
reset role;

-- Published identity and operative terms are immutable while progress/status fields remain separately governed.
do $test$
begin
  begin
    update public.mpgf_public_goods_campaigns
    set title = 'Forbidden published-title mutation'
    where slug = 'qa-published-pool';
    raise exception 'Published campaign operative terms unexpectedly changed.';
  exception
    when check_violation then null;
  end;

  begin
    delete from public.mpgf_public_goods_campaigns
    where slug = 'qa-published-pool';
    raise exception 'Published campaign unexpectedly deleted.';
  exception
    when check_violation then null;
  end;
end;
$test$;

-- Failed publication candidates never materialize.
do $test$
begin
  if exists (
    select 1 from public.mpgf_public_goods_campaigns
    where pool_proposal_id in (
      '8d555555-5555-4555-8555-555555555555',
      '8d666666-6666-4666-8666-666666666666',
      '8d777777-7777-4777-8777-777777777777'
    )
  ) then
    raise exception 'An ineligible proposal became publicly discoverable.';
  end if;
end;
$test$;

rollback;
