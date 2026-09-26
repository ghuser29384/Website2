begin;

-- This test is intentionally transactional. It exercises both the database
-- invariant and the authenticated contributor/creator paths, then rolls back.
do $test$
declare
  progress_labels text[];
  threshold_labels text[];
begin
  select array_agg(e.enumlabel order by e.enumsortorder)
  into progress_labels
  from pg_enum e
  join pg_type t on t.oid = e.enumtypid
  join pg_namespace n on n.oid = t.typnamespace
  where n.nspname = 'public'
    and t.typname = 'mpgf_progress_visibility';

  if progress_labels is distinct from array[
    'exact_amount',
    'progress_range',
    'threshold_status_only',
    'sealed_progress'
  ]::text[] then
    raise exception 'Unexpected mpgf_progress_visibility labels: %', progress_labels;
  end if;

  select array_agg(e.enumlabel order by e.enumsortorder)
  into threshold_labels
  from pg_enum e
  join pg_type t on t.oid = e.enumtypid
  join pg_namespace n on n.oid = t.typnamespace
  where n.nspname = 'public'
    and t.typname = 'mpgf_threshold_visibility';

  if threshold_labels is distinct from array['public_exact']::text[] then
    raise exception 'Unexpected mpgf_threshold_visibility labels: %', threshold_labels;
  end if;
end;
$test$;

insert into auth.users(
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at
) values
  (
    '6a111111-1111-4111-8111-111111111111',
    'authenticated',
    'authenticated',
    'pool-visibility-owner@example.test',
    '',
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"display_name":"Pool Visibility Owner"}'::jsonb,
    now(),
    now()
  ),
  (
    '6b222222-2222-4222-8222-222222222222',
    'authenticated',
    'authenticated',
    'pool-visibility-contributor@example.test',
    '',
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"display_name":"Pool Visibility Contributor"}'::jsonb,
    now(),
    now()
  );

insert into public.profiles(id, email, display_name, bio, affiliation)
values
  (
    '6a111111-1111-4111-8111-111111111111',
    'pool-visibility-owner@example.test',
    'Pool Visibility Owner',
    '',
    ''
  ),
  (
    '6b222222-2222-4222-8222-222222222222',
    'pool-visibility-contributor@example.test',
    'Pool Visibility Contributor',
    '',
    ''
  )
on conflict (id) do update set
  email = excluded.email,
  display_name = excluded.display_name;

insert into public.mpgf_pool_proposals (
  id,
  proposer_id,
  title,
  problem,
  intervention,
  moral_public_good_rationale,
  proposed_recipient_name,
  summary,
  cause_area,
  requested_maximum_funding_cents,
  outcome_units_summary,
  expected_effect_vs_funding,
  timeline,
  milestones_json,
  risks_json,
  misuse_pathways,
  status,
  progress_visibility
) values (
  '6c333333-3333-4333-8333-333333333333',
  '6a111111-1111-4111-8111-111111111111',
  'Authenticated visibility trigger QA pool',
  'Synthetic QA-only problem',
  'Synthetic QA-only intervention',
  'Synthetic QA-only public-good rationale',
  'Synthetic QA recipient',
  'Synthetic QA-only summary',
  'QA',
  100000,
  'One verified QA outcome',
  'Synthetic QA effect',
  'Synthetic QA timeline',
  '[]'::jsonb,
  '[]'::jsonb,
  'None; transaction rolls back',
  'draft',
  'sealed_progress'
);

do $test$
begin
  if not exists (
    select 1
    from public.mpgf_pool_proposals
    where id = '6c333333-3333-4333-8333-333333333333'
      and threshold_visibility = 'public_exact'
      and progress_visibility = 'sealed_progress'
      and first_accepted_pledge_at is null
  ) then
    raise exception 'Pool visibility defaults or pre-acceptance selection were not persisted.';
  end if;
end;
$test$;

-- A contributor who does not own the proposal must still be able to create an
-- accepted pledge. The SECURITY DEFINER trigger must latch the owner-only pool
-- row without weakening the pool RLS policy.
set local role authenticated;
set local "request.jwt.claim.sub" = '6b222222-2222-4222-8222-222222222222';
set local "request.jwt.claim.role" = 'authenticated';

insert into public.mpgf_pledges (
  id,
  pool_proposal_id,
  profile_id,
  user_id,
  contributor_label,
  amount_cents,
  currency,
  cadence,
  status,
  pledge_mode,
  real_money
) values (
  '6d444444-4444-4444-8444-444444444444',
  '6c333333-3333-4333-8333-333333333333',
  '6b222222-2222-4222-8222-222222222222',
  '6b222222-2222-4222-8222-222222222222',
  'Pool Visibility Contributor',
  2500,
  'usd',
  'one_time',
  'pledged',
  'pledge_only',
  false
);

reset role;

do $test$
begin
  if not exists (
    select 1
    from public.mpgf_pool_proposals
    where id = '6c333333-3333-4333-8333-333333333333'
      and first_accepted_pledge_at is not null
  ) then
    raise exception 'Accepted pledge did not latch first_accepted_pledge_at.';
  end if;
end;
$test$;

-- The creator can make reporting more transparent after acceptance.
set local role authenticated;
set local "request.jwt.claim.sub" = '6a111111-1111-4111-8111-111111111111';
set local "request.jwt.claim.role" = 'authenticated';

update public.mpgf_pool_proposals
set progress_visibility = 'threshold_status_only'
where id = '6c333333-3333-4333-8333-333333333333';

update public.mpgf_pool_proposals
set progress_visibility = 'progress_range'
where id = '6c333333-3333-4333-8333-333333333333';

update public.mpgf_pool_proposals
set progress_visibility = 'exact_amount'
where id = '6c333333-3333-4333-8333-333333333333';

-- The creator cannot make reporting less transparent after acceptance.
do $test$
declare
  blocked boolean := false;
begin
  begin
    update public.mpgf_pool_proposals
    set progress_visibility = 'progress_range'
    where id = '6c333333-3333-4333-8333-333333333333';
  exception
    when check_violation then
      blocked := true;
  end;

  if not blocked then
    raise exception 'Post-acceptance transparency downgrade was not blocked.';
  end if;
end;
$test$;

reset role;

-- Cancelling the pledge does not erase the historical acceptance latch.
update public.mpgf_pledges
set status = 'cancelled', cancelled_at = timezone('utc', now())
where id = '6d444444-4444-4444-8444-444444444444';

do $test$
declare
  downgrade_blocked boolean := false;
  latch_clear_blocked boolean := false;
begin
  begin
    update public.mpgf_pool_proposals
    set progress_visibility = 'sealed_progress'
    where id = '6c333333-3333-4333-8333-333333333333';
  exception
    when check_violation then
      downgrade_blocked := true;
  end;

  begin
    update public.mpgf_pool_proposals
    set first_accepted_pledge_at = null
    where id = '6c333333-3333-4333-8333-333333333333';
  exception
    when check_violation then
      latch_clear_blocked := true;
  end;

  if not downgrade_blocked then
    raise exception 'A cancelled pledge incorrectly released the transparency lock.';
  end if;

  if not latch_clear_blocked then
    raise exception 'first_accepted_pledge_at was mutable after acceptance.';
  end if;

  if public.mpgf_progress_visibility_rank('sealed_progress') <> 1
     or public.mpgf_progress_visibility_rank('threshold_status_only') <> 2
     or public.mpgf_progress_visibility_rank('progress_range') <> 3
     or public.mpgf_progress_visibility_rank('exact_amount') <> 4 then
    raise exception 'Progress-visibility ranking is incorrect.';
  end if;
end;
$test$;

rollback;

select 'passed' as mpgf_pool_visibility_controls_test;
