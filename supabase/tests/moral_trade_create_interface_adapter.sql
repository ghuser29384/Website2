begin;

create temporary table moral_trade_create_test_ids (
  label text primary key,
  target_id uuid not null
) on commit drop;
grant select, insert on moral_trade_create_test_ids to authenticated;

insert into auth.users (
  id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, confirmation_token, recovery_token,
  email_change_token_new, email_change_token_current, reauthentication_token,
  is_sso_user, is_anonymous, created_at, updated_at
) values
  (
    '5a111111-1111-4111-8111-111111111111',
    '00000000-0000-0000-0000-000000000000',
    'authenticated', 'authenticated', 'create-adapter-owner@example.test', '', now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"display_name":"Create Adapter Owner","qa_fixture":true}'::jsonb,
    '', '', '', '', '', false, false, now(), now()
  ),
  (
    '5b222222-2222-4222-8222-222222222222',
    '00000000-0000-0000-0000-000000000000',
    'authenticated', 'authenticated', 'create-adapter-outsider@example.test', '', now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"display_name":"Create Adapter Outsider","qa_fixture":true}'::jsonb,
    '', '', '', '', '', false, false, now(), now()
  );

insert into public.profiles (id, email, display_name, bio, affiliation)
values
  ('5a111111-1111-4111-8111-111111111111', 'create-adapter-owner@example.test', 'Create Adapter Owner', '', ''),
  ('5b222222-2222-4222-8222-222222222222', 'create-adapter-outsider@example.test', 'Create Adapter Outsider', '', '');

do $test$
declare
  first_result record;
  replay_result record;
  pool_result record;
  deadline_at timestamptz := timezone('utc', now()) + interval '14 days';
begin
  select * into first_result
  from public.moral_trade_create_submit_service(
    '5a111111-1111-4111-8111-111111111111',
    'create-sql-pledge',
    'pledge_swap',
    jsonb_build_object(
      'interfaceVersion', 'moral_trade_create_v1',
      'submissionKey', 'create-sql-pledge',
      'cause', 'Future flourishing',
      'requestKind', 'commitment',
      'fundMode', null,
      'dacPath', null,
      'requestAction', 'Study for five focused hours',
      'existingPoolAmount', '',
      'existingPoolCurrency', 'USD',
      'offers', jsonb_build_array(
        jsonb_build_object(
          'id', 'skill',
          'title', 'Skilled work',
          'options', jsonb_build_array(
            jsonb_build_object('work', 'Research wild animal suffering', 'scope', 'one two-page brief')
          )
        )
      ),
      'pool', null
    ),
    repeat('a', 64),
    'Future flourishing',
    'commitment',
    'Study for five focused hours',
    'Skilled work: Research wild animal suffering; one two-page brief',
    '[{"id":"skill","title":"Skilled work","options":[{"work":"Research wild animal suffering","scope":"one two-page brief"}]}]'::jsonb,
    null,
    '{}'::jsonb
  );

  if first_result.submission_id is null
     or first_result.target_type <> 'offer'
     or first_result.submission_status <> 'pending_review' then
    raise exception 'Pledge-swap submission did not return a durable pending-review offer receipt: %', first_result;
  end if;

  if not exists (
    select 1 from public.offers
    where id = first_result.target_id
      and owner_id = '5a111111-1111-4111-8111-111111111111'
      and workflow_status = 'pending_review'
      and status = 'paused'
      and fingerprint = repeat('a', 64)
  ) then
    raise exception 'Pledge-swap target offer was not persisted exactly once.';
  end if;

  if not exists (
    select 1 from public.moral_trade_create_offer_terms
    where offer_id = first_result.target_id
      and jsonb_array_length(contribution_options_json) = 1
  ) then
    raise exception 'Structured contribution options were not retained.';
  end if;

  select * into replay_result
  from public.moral_trade_create_submit_service(
    '5a111111-1111-4111-8111-111111111111',
    'create-sql-pledge',
    'pledge_swap',
    jsonb_build_object(
      'interfaceVersion', 'moral_trade_create_v1',
      'submissionKey', 'create-sql-pledge',
      'cause', 'Future flourishing',
      'requestKind', 'commitment',
      'fundMode', null,
      'dacPath', null,
      'requestAction', 'Study for five focused hours',
      'existingPoolAmount', '',
      'existingPoolCurrency', 'USD',
      'offers', jsonb_build_array(
        jsonb_build_object(
          'id', 'skill',
          'title', 'Skilled work',
          'options', jsonb_build_array(
            jsonb_build_object('work', 'Research wild animal suffering', 'scope', 'one two-page brief')
          )
        )
      ),
      'pool', null
    ),
    repeat('a', 64),
    'Future flourishing',
    'commitment',
    'Study for five focused hours',
    'Skilled work: Research wild animal suffering; one two-page brief',
    '[{"id":"skill","title":"Skilled work","options":[{"work":"Research wild animal suffering","scope":"one two-page brief"}]}]'::jsonb,
    null,
    '{}'::jsonb
  );

  if replay_result.submission_id <> first_result.submission_id
     or replay_result.target_id <> first_result.target_id then
    raise exception 'Idempotent replay returned a different record.';
  end if;

  begin
    perform public.moral_trade_create_submit_service(
      '5a111111-1111-4111-8111-111111111111',
      'create-sql-pledge',
      'pledge_swap',
      jsonb_build_object(
        'interfaceVersion', 'moral_trade_create_v1',
        'submissionKey', 'create-sql-pledge',
        'cause', 'Future flourishing',
        'requestKind', 'commitment',
        'requestAction', 'Different terms',
        'offers', jsonb_build_array()
      ),
      repeat('d', 64),
      'Future flourishing',
      'commitment',
      'Different terms',
      'Different terms',
      '[]'::jsonb,
      null,
      '{}'::jsonb
    );
    raise exception 'An idempotency key was reused for different terms.';
  exception
    when check_violation then null;
  end;

  select * into pool_result
  from public.moral_trade_create_submit_service(
    '5a111111-1111-4111-8111-111111111111',
    'create-sql-pool',
    'pool_create',
    jsonb_build_object(
      'interfaceVersion', 'moral_trade_create_v1',
      'submissionKey', 'create-sql-pool',
      'cause', 'Future flourishing',
      'requestKind', 'fund',
      'fundMode', 'dac',
      'dacPath', 'create',
      'requestAction', 'Independent research on AI-assisted philosophy',
      'offers', '[]'::jsonb,
      'pool', jsonb_build_object('deadline', deadline_at)
    ),
    repeat('b', 64),
    'Future flourishing',
    'fund',
    'Independent research on AI-assisted philosophy',
    'No reciprocal contribution required.',
    '[]'::jsonb,
    jsonb_build_object(
      'thresholdAmountsCents', jsonb_build_array(100000, 500000),
      'deadlineAt', deadline_at,
      'failureBonusType', 'percentage',
      'failureBonusTerms', jsonb_build_object('type', 'percentage', 'rateBps', 1000),
      'failureTimingMode', 'formula',
      'failureTimingTerms', jsonb_build_object(
        'mode', 'formula',
        'formulaHash', repeat('c', 64),
        'formulaVersion', 'moral_trade_timing_formula_v1'
      ),
      'formula', jsonb_build_object(
        'source', '1 - t',
        'ast', jsonb_build_object(
          'type', 'binary',
          'operator', '-',
          'left', jsonb_build_object('type', 'number', 'value', 1),
          'right', jsonb_build_object('type', 'variable', 'name', 't')
        ),
        'languageVersion', 'moral_trade_timing_formula_v1',
        'hash', repeat('c', 64),
        'variables', jsonb_build_array('t')
      ),
      'continuation', 'continue',
      'thresholdVisibility', 'public_exact',
      'progressVisibility', 'progress_range',
      'moralTradeBonusShareBps', 2500,
      'activationRule', 'Independent verifier confirms implementation readiness'
    ),
    '{}'::jsonb
  );

  if pool_result.submission_id is null
     or pool_result.target_type <> 'mpgf_pool_proposal'
     or pool_result.submission_status <> 'pending_review' then
    raise exception 'Pool submission did not return a durable pending-review proposal receipt: %', pool_result;
  end if;

  if not exists (
    select 1 from public.mpgf_pool_proposals
    where id = pool_result.target_id
      and proposer_id = '5a111111-1111-4111-8111-111111111111'
      and status = 'submitted'
      and requested_maximum_funding_cents = 500000
      and minimum_viable_funding_cents = 100000
      and public_goods_threshold_amount_cents = 100000
      and threshold_visibility = 'public_exact'
      and progress_visibility = 'progress_range'
      and public_goods_failure_bonus_enabled = false
  ) then
    raise exception 'MPGF proposal bridge fields were not persisted correctly.';
  end if;

  if not exists (
    select 1 from public.moral_trade_create_pool_terms
    where pool_proposal_id = pool_result.target_id
      and failure_bonus_base_type = 'percentage'
      and failure_bonus_timing_mode = 'formula'
      and formula_source = '1 - t'
      and formula_hash = repeat('c', 64)
      and reserve_quote_status = 'pending_underwriting'
      and review_status = 'pending_review'
      and progress_visibility = 'progress_range'
      and moral_trade_failure_bonus_share_bps = 2500
  ) then
    raise exception 'Exact pool, formula, visibility, or underwriting-review terms were not retained.';
  end if;

  insert into moral_trade_create_test_ids(label, target_id)
  values ('pool', pool_result.target_id);

end;
$test$;

do $test$
begin
  if to_regprocedure(
    'public.moral_trade_create_submit(text,text,jsonb,text,text,text,text,text,jsonb,jsonb,jsonb)'
  ) is not null then
    raise exception 'The direct authenticated Create RPC still exists.';
  end if;

  if has_function_privilege(
    'authenticated',
    'public.moral_trade_create_submit_service(uuid,text,text,jsonb,text,text,text,text,text,jsonb,jsonb,jsonb)',
    'EXECUTE'
  ) then
    raise exception 'Authenticated clients can execute the service-role Create RPC.';
  end if;
end;
$test$;

set local role authenticated;
set local "request.jwt.claim.sub" = '5a111111-1111-4111-8111-111111111111';
set local "request.jwt.claim.role" = 'authenticated';

do $test$
begin
  if (select count(*) from public.moral_trade_create_submissions
      where submission_key in ('create-sql-pledge', 'create-sql-pool')) <> 2 then
    raise exception 'Owner could not read both durable Create receipts.';
  end if;

  begin
    update public.moral_trade_create_pool_terms
    set progress_visibility = 'exact_amount'
    where pool_proposal_id = (select target_id from moral_trade_create_test_ids where label = 'pool');
    raise exception 'Authenticated clients unexpectedly had direct write access to Create pool terms.';
  exception
    when insufficient_privilege then null;
  end;
end;
$test$;

reset role;

do $test$
declare
  pool_id uuid;
begin
  select target_id into pool_id
  from moral_trade_create_test_ids
  where label = 'pool';

  update public.mpgf_pool_proposals
  set first_accepted_pledge_at = timezone('utc', now())
  where id = pool_id;

  begin
    update public.moral_trade_create_pool_terms
    set progress_visibility = 'exact_amount'
    where pool_proposal_id = pool_id;
    raise exception 'Post-acceptance Create pool terms were mutable.';
  exception
    when check_violation then null;
  end;
end;
$test$;

set local role authenticated;
set local "request.jwt.claim.sub" = '5b222222-2222-4222-8222-222222222222';
set local "request.jwt.claim.role" = 'authenticated';

do $test$
begin
  if exists (select 1 from public.moral_trade_create_submissions) then
    raise exception 'Outsider could read another participant''s Create submissions.';
  end if;
  if exists (select 1 from public.moral_trade_create_pool_terms) then
    raise exception 'Outsider could read another participant''s pool terms.';
  end if;
end;
$test$;

reset role;
rollback;

select 'passed' as moral_trade_create_interface_adapter_test;
