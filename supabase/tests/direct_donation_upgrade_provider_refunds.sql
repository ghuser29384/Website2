-- Rollback-only regression for authoritative Every.org provider refunds.
-- No provider request, checkout, donation, or production write occurs. Provider
-- confirmation and refund facts are injected only through service-role database
-- RPCs inside this transaction.

begin;

insert into public.profiles (id, email, display_name, bio)
select id, email, display_name, ''
from (values
  ('dc210000-0000-4000-8000-000000000001'::uuid, 'refund-operator@example.test', 'Refund QA Operator'),
  ('dc210000-0000-4000-8000-000000000002'::uuid, 'refund-creator@example.test', 'Refund QA Creator'),
  ('dc210000-0000-4000-8000-000000000003'::uuid, 'refund-matcher@example.test', 'Refund QA Matcher')
) as fixture(id, email, display_name)
on conflict (id) do update set
  email = excluded.email,
  display_name = excluded.display_name;

create temp table direct_upgrade_refund_fixture_ids (
  key text primary key,
  value uuid not null
) on commit drop;

do $setup$
declare
  operator_id constant uuid := 'dc210000-0000-4000-8000-000000000001';
  creator_id constant uuid := 'dc210000-0000-4000-8000-000000000002';
  matcher_id constant uuid := 'dc210000-0000-4000-8000-000000000003';
  baseline_version constant text :=
    'direct-donation-upgrade-baseline-v1-2026-08-01';
  matcher_version constant text :=
    'direct-donation-upgrade-matcher-v1-2026-08-01';
  original_recipient jsonb := jsonb_build_object(
    'schemaVersion', 'moral-trade-every-org-nonprofit-identity-v1',
    'provider', 'every_org',
    'providerNonprofitId', 'refund-qa-original-recipient',
    'name', 'Refund QA Original Recipient',
    'primarySlug', 'refund-qa-original',
    'ein', '111111111',
    'isDisbursable', true,
    'profileUrl', 'https://www.every.org/refund-qa-original',
    'websiteUrl', 'https://example.test/original',
    'locationAddress', 'QA only',
    'description', 'Rollback-only provider-refund fixture.',
    'logoUrl', '',
    'identityHash', repeat('1', 64)
  );
  upgraded_recipient jsonb := jsonb_build_object(
    'schemaVersion', 'moral-trade-every-org-nonprofit-identity-v1',
    'provider', 'every_org',
    'providerNonprofitId', 'refund-qa-upgraded-recipient',
    'name', 'Refund QA Upgraded Recipient',
    'primarySlug', 'refund-qa-upgraded',
    'ein', '222222222',
    'isDisbursable', true,
    'profileUrl', 'https://www.every.org/refund-qa-upgraded',
    'websiteUrl', 'https://example.test/upgraded',
    'locationAddress', 'QA only',
    'description', 'Rollback-only provider-refund fixture.',
    'logoUrl', '',
    'identityHash', repeat('2', 64)
  );
  match_deadline timestamptz := timezone('utc', now()) + interval '7 days';
  donation_date timestamptz := timezone('utc', now()) - interval '2 days';
  result jsonb;
  offer_one uuid;
  offer_two uuid;
  candidate_one uuid;
  candidate_two uuid;
  creator_one uuid;
  matcher_one uuid;
  creator_two uuid;
  matcher_two uuid;
begin
  if to_regclass(
       'public.direct_donation_upgrade_provider_reversals'
     ) is null
     or to_regprocedure(
       'public.record_direct_donation_upgrade_provider_reversal(uuid,uuid,text,text,text,text,integer,text,timestamptz,text,text)'
     ) is null
     or to_regprocedure(
       'public.direct_donation_upgrade_complete_obligation_20260820(uuid,boolean,text,text,text,text,integer,integer,text,text,text,timestamptz,text,text)'
     ) is null then
    raise exception 'The provider-refund schema or frozen completion boundary is missing.';
  end if;

  result := public.create_direct_donation_upgrade_offer(
    creator_id,
    'staging',
    1000,
    500,
    match_deadline,
    'private_until_completed',
    original_recipient,
    upgraded_recipient,
    baseline_version,
    'The first rollback-only refund fixture had a pre-existing planned donation.',
    public.direct_donation_upgrade_terms_hash_v2(
      creator_id,
      1000,
      10000,
      500,
      repeat('1', 64),
      repeat('2', 64),
      match_deadline,
      'private_until_completed',
      'staging',
      'The first rollback-only refund fixture had a pre-existing planned donation.'
    ),
    10000
  );
  offer_one := (result->>'id')::uuid;
  result := public.join_direct_donation_upgrade_offer(
    matcher_id,
    offer_one,
    matcher_version,
    'staging'
  );
  candidate_one := (result->>'id')::uuid;

  select id into creator_one
  from public.direct_donation_upgrade_obligations
  where offer_id = offer_one
    and obligation_kind = 'creator_redirected';
  select id into matcher_one
  from public.direct_donation_upgrade_obligations
  where candidate_id = candidate_one
    and obligation_kind = 'matcher_incremental';

  perform public.complete_direct_donation_upgrade_obligation(
    creator_one,
    true,
    '',
    '',
    repeat('a', 64),
    repeat('e', 64),
    1000,
    950,
    'USD',
    'refund-qa-upgraded',
    '222222222',
    donation_date,
    'rollback-test',
    'staging'
  );
  perform public.complete_direct_donation_upgrade_obligation(
    matcher_one,
    true,
    '',
    '',
    repeat('b', 64),
    repeat('f', 64),
    500,
    475,
    'USD',
    'refund-qa-upgraded',
    '222222222',
    donation_date,
    'rollback-test',
    'staging'
  );

  if not exists (
    select 1
    from public.direct_donation_upgrade_offers
    where id = offer_one and status = 'completed'
  ) then
    raise exception 'The first provider-refund fixture did not complete.';
  end if;

  result := public.create_direct_donation_upgrade_offer(
    creator_id,
    'staging',
    1200,
    600,
    match_deadline,
    'public',
    original_recipient,
    upgraded_recipient,
    baseline_version,
    'The second rollback-only refund fixture had a separate planned donation.',
    public.direct_donation_upgrade_terms_hash_v2(
      creator_id,
      1200,
      10000,
      600,
      repeat('1', 64),
      repeat('2', 64),
      match_deadline,
      'public',
      'staging',
      'The second rollback-only refund fixture had a separate planned donation.'
    ),
    10000
  );
  offer_two := (result->>'id')::uuid;
  result := public.join_direct_donation_upgrade_offer(
    matcher_id,
    offer_two,
    matcher_version,
    'staging'
  );
  candidate_two := (result->>'id')::uuid;

  select id into creator_two
  from public.direct_donation_upgrade_obligations
  where offer_id = offer_two
    and obligation_kind = 'creator_redirected';
  select id into matcher_two
  from public.direct_donation_upgrade_obligations
  where candidate_id = candidate_two
    and obligation_kind = 'matcher_incremental';

  perform public.complete_direct_donation_upgrade_obligation(
    creator_two,
    true,
    '',
    '',
    repeat('c', 64),
    repeat('g', 64),
    1200,
    1140,
    'USD',
    'refund-qa-upgraded',
    '222222222',
    donation_date,
    'rollback-test',
    'staging'
  );
  perform public.complete_direct_donation_upgrade_obligation(
    matcher_two,
    true,
    '',
    '',
    repeat('d', 64),
    repeat('h', 64),
    600,
    570,
    'USD',
    'refund-qa-upgraded',
    '222222222',
    donation_date,
    'rollback-test',
    'staging'
  );

  if not exists (
    select 1
    from public.direct_donation_upgrade_offers
    where id = offer_two and status = 'completed'
  ) then
    raise exception 'The second provider-refund fixture did not complete.';
  end if;

  insert into direct_upgrade_refund_fixture_ids(key, value) values
    ('operator', operator_id),
    ('offer_one', offer_one),
    ('offer_two', offer_two),
    ('creator_one', creator_one),
    ('matcher_one', matcher_one),
    ('creator_two', creator_two),
    ('matcher_two', matcher_two);
end;
$setup$;

-- Each altered provider-refund field must fail closed without a reversal row.
savepoint refund_amount_mismatch;
do $amount_mismatch$
declare
  result jsonb;
  operator_id uuid := (
    select value from direct_upgrade_refund_fixture_ids where key = 'operator'
  );
  target_obligation_id uuid := (
    select value from direct_upgrade_refund_fixture_ids where key = 'matcher_one'
  );
begin
  result := public.record_direct_donation_upgrade_provider_reversal(
    operator_id,
    target_obligation_id,
    'staging',
    repeat('b', 64),
    (
      select partner_donation_id
      from public.direct_donation_upgrade_obligations
      where id = target_obligation_id
    ),
    repeat('2', 64),
    499,
    'USD',
    timezone('utc', now()) - interval '1 day',
    'every_org_dashboard',
    repeat('9', 64)
  );
  if result->>'outcome' <> 'needs_review'
     or result->>'reason' <> 'provider_reversal_amount_mismatch'
     or exists (
       select 1 from public.direct_donation_upgrade_provider_reversals
       where obligation_id = target_obligation_id
     ) then
    raise exception 'Altered refund amount did not fail closed: %', result;
  end if;
end;
$amount_mismatch$;
rollback to savepoint refund_amount_mismatch;

savepoint refund_recipient_mismatch;
do $recipient_mismatch$
declare
  result jsonb;
  operator_id uuid := (
    select value from direct_upgrade_refund_fixture_ids where key = 'operator'
  );
  target_obligation_id uuid := (
    select value from direct_upgrade_refund_fixture_ids where key = 'matcher_one'
  );
begin
  result := public.record_direct_donation_upgrade_provider_reversal(
    operator_id,
    target_obligation_id,
    'staging',
    repeat('b', 64),
    (
      select partner_donation_id
      from public.direct_donation_upgrade_obligations
      where id = target_obligation_id
    ),
    repeat('1', 64),
    500,
    'USD',
    timezone('utc', now()) - interval '1 day',
    'every_org_dashboard',
    repeat('9', 64)
  );
  if result->>'outcome' <> 'needs_review'
     or result->>'reason' <> 'provider_reversal_recipient_mismatch'
     or exists (
       select 1 from public.direct_donation_upgrade_provider_reversals
       where obligation_id = target_obligation_id
     ) then
    raise exception 'Altered refund recipient did not fail closed: %', result;
  end if;
end;
$recipient_mismatch$;
rollback to savepoint refund_recipient_mismatch;

savepoint refund_environment_mismatch;
do $environment_mismatch$
declare
  result jsonb;
  operator_id uuid := (
    select value from direct_upgrade_refund_fixture_ids where key = 'operator'
  );
  target_obligation_id uuid := (
    select value from direct_upgrade_refund_fixture_ids where key = 'matcher_one'
  );
begin
  result := public.record_direct_donation_upgrade_provider_reversal(
    operator_id,
    target_obligation_id,
    'live',
    repeat('b', 64),
    (
      select partner_donation_id
      from public.direct_donation_upgrade_obligations
      where id = target_obligation_id
    ),
    repeat('2', 64),
    500,
    'USD',
    timezone('utc', now()) - interval '1 day',
    'every_org_dashboard',
    repeat('9', 64)
  );
  if result->>'outcome' <> 'needs_review'
     or result->>'reason' <> 'provider_reversal_environment_mismatch'
     or exists (
       select 1 from public.direct_donation_upgrade_provider_reversals
       where obligation_id = target_obligation_id
     ) then
    raise exception 'Cross-environment refund did not fail closed: %', result;
  end if;
end;
$environment_mismatch$;
rollback to savepoint refund_environment_mismatch;

savepoint refund_charge_mismatch;
do $charge_mismatch$
declare
  result jsonb;
  operator_id uuid := (
    select value from direct_upgrade_refund_fixture_ids where key = 'operator'
  );
  target_obligation_id uuid := (
    select value from direct_upgrade_refund_fixture_ids where key = 'matcher_one'
  );
begin
  result := public.record_direct_donation_upgrade_provider_reversal(
    operator_id,
    target_obligation_id,
    'staging',
    repeat('8', 64),
    (
      select partner_donation_id
      from public.direct_donation_upgrade_obligations
      where id = target_obligation_id
    ),
    repeat('2', 64),
    500,
    'USD',
    timezone('utc', now()) - interval '1 day',
    'every_org_dashboard',
    repeat('9', 64)
  );
  if result->>'outcome' <> 'needs_review'
     or result->>'reason' <> 'provider_reversal_charge_mismatch'
     or exists (
       select 1 from public.direct_donation_upgrade_provider_reversals
       where obligation_id = target_obligation_id
     ) then
    raise exception 'Altered refund charge did not fail closed: %', result;
  end if;
end;
$charge_mismatch$;
rollback to savepoint refund_charge_mismatch;

savepoint refund_donation_id_mismatch;
do $donation_id_mismatch$
declare
  result jsonb;
  operator_id uuid := (
    select value from direct_upgrade_refund_fixture_ids where key = 'operator'
  );
  target_obligation_id uuid := (
    select value from direct_upgrade_refund_fixture_ids where key = 'matcher_one'
  );
begin
  result := public.record_direct_donation_upgrade_provider_reversal(
    operator_id,
    target_obligation_id,
    'staging',
    repeat('b', 64),
    'altered-partner-donation-id',
    repeat('2', 64),
    500,
    'USD',
    timezone('utc', now()) - interval '1 day',
    'every_org_dashboard',
    repeat('9', 64)
  );
  if result->>'outcome' <> 'needs_review'
     or result->>'reason' <> 'provider_reversal_donation_id_mismatch'
     or exists (
       select 1 from public.direct_donation_upgrade_provider_reversals
       where obligation_id = target_obligation_id
     ) then
    raise exception 'Altered donation ID did not fail closed: %', result;
  end if;
end;
$donation_id_mismatch$;
rollback to savepoint refund_donation_id_mismatch;

savepoint refund_currency_mismatch;
do $currency_mismatch$
declare
  blocked boolean := false;
  operator_id uuid := (
    select value from direct_upgrade_refund_fixture_ids where key = 'operator'
  );
  target_obligation_id uuid := (
    select value from direct_upgrade_refund_fixture_ids where key = 'matcher_one'
  );
begin
  begin
    perform public.record_direct_donation_upgrade_provider_reversal(
      operator_id,
      target_obligation_id,
      'staging',
      repeat('b', 64),
      (
        select partner_donation_id
        from public.direct_donation_upgrade_obligations
        where id = target_obligation_id
      ),
      repeat('2', 64),
      500,
      'EUR',
      timezone('utc', now()) - interval '1 day',
      'every_org_dashboard',
      repeat('9', 64)
    );
  exception when others then
    blocked := position(
      'full usd provider refund amount and timestamp' in lower(sqlerrm)
    ) > 0;
  end;
  if not blocked
     or exists (
       select 1 from public.direct_donation_upgrade_provider_reversals
       where obligation_id = target_obligation_id
     ) then
    raise exception 'Altered currency did not fail closed.';
  end if;
end;
$currency_mismatch$;
rollback to savepoint refund_currency_mismatch;

savepoint refund_cross_obligation_charge;
do $cross_obligation_charge$
declare
  result jsonb;
  operator_id uuid := (
    select value from direct_upgrade_refund_fixture_ids where key = 'operator'
  );
  target_obligation_id uuid := (
    select value from direct_upgrade_refund_fixture_ids where key = 'matcher_one'
  );
begin
  result := public.record_direct_donation_upgrade_provider_reversal(
    operator_id,
    target_obligation_id,
    'staging',
    repeat('d', 64),
    (
      select partner_donation_id
      from public.direct_donation_upgrade_obligations
      where id = target_obligation_id
    ),
    repeat('2', 64),
    500,
    'USD',
    timezone('utc', now()) - interval '1 day',
    'every_org_dashboard',
    repeat('9', 64)
  );
  if result->>'outcome' <> 'needs_review'
     or result->>'reason' <> 'provider_reversal_cross_obligation_charge'
     or exists (
       select 1 from public.direct_donation_upgrade_provider_reversals
       where obligation_id = target_obligation_id
     ) then
    raise exception 'Cross-obligation refund charge did not fail closed: %', result;
  end if;
end;
$cross_obligation_charge$;
rollback to savepoint refund_cross_obligation_charge;

savepoint refund_invalid_authority;
do $invalid_authority$
declare
  blocked boolean := false;
  operator_id uuid := (
    select value from direct_upgrade_refund_fixture_ids where key = 'operator'
  );
  target_obligation_id uuid := (
    select value from direct_upgrade_refund_fixture_ids where key = 'matcher_one'
  );
begin
  begin
    perform public.record_direct_donation_upgrade_provider_reversal(
      operator_id,
      target_obligation_id,
      'staging',
      repeat('b', 64),
      (
        select partner_donation_id
        from public.direct_donation_upgrade_obligations
        where id = target_obligation_id
      ),
      repeat('2', 64),
      500,
      'USD',
      timezone('utc', now()) - interval '1 day',
      'participant_screenshot',
      repeat('9', 64)
    );
  exception when others then
    blocked := position(
      'every.org dashboard or every.org support' in lower(sqlerrm)
    ) > 0;
  end;
  if not blocked then
    raise exception 'Participant screenshot was accepted as sole refund authority.';
  end if;
end;
$invalid_authority$;
rollback to savepoint refund_invalid_authority;

savepoint refund_unknown_obligation;
do $unknown_obligation$
declare
  blocked boolean := false;
  operator_id uuid := (
    select value from direct_upgrade_refund_fixture_ids where key = 'operator'
  );
begin
  begin
    perform public.record_direct_donation_upgrade_provider_reversal(
      operator_id,
      'dc219999-9999-4999-8999-999999999999'::uuid,
      'staging',
      repeat('b', 64),
      'unknown-donation-id',
      repeat('2', 64),
      500,
      'USD',
      timezone('utc', now()) - interval '1 day',
      'every_org_support',
      repeat('9', 64)
    );
  exception when others then
    blocked := position('obligation not found' in lower(sqlerrm)) > 0;
  end;
  if not blocked then
    raise exception 'Unknown refund obligation did not fail closed.';
  end if;
end;
$unknown_obligation$;
rollback to savepoint refund_unknown_obligation;

-- Record the exact authoritative full refund.
do $record_refund$
declare
  result jsonb;
  replay jsonb;
  completion_replay jsonb;
  operator_id uuid := (
    select value from direct_upgrade_refund_fixture_ids where key = 'operator'
  );
  target_offer_id uuid := (
    select value from direct_upgrade_refund_fixture_ids where key = 'offer_one'
  );
  target_obligation_id uuid := (
    select value from direct_upgrade_refund_fixture_ids where key = 'matcher_one'
  );
  partner_donation_id text := (
    select obligation.partner_donation_id
    from public.direct_donation_upgrade_obligations obligation
    where obligation.id = target_obligation_id
  );
  original_donation_date timestamptz := (
    select obligation.provider_donation_date
    from public.direct_donation_upgrade_obligations obligation
    where obligation.id = target_obligation_id
  );
  refunded_at timestamptz := timezone('utc', now()) - interval '1 day';
  reversal_id uuid;
  blocked boolean := false;
  forbidden_execute integer;
  missing_execute integer;
  forbidden_mutation integer;
  missing_read integer;
begin
  result := public.record_direct_donation_upgrade_provider_reversal(
    operator_id,
    target_obligation_id,
    'staging',
    repeat('b', 64),
    partner_donation_id,
    repeat('2', 64),
    500,
    'USD',
    refunded_at,
    'every_org_dashboard',
    repeat('9', 64)
  );

  if result->>'outcome' <> 'provider_reversed' then
    raise exception 'The exact authoritative refund was not recorded: %', result;
  end if;

  select id into reversal_id
  from public.direct_donation_upgrade_provider_reversals
  where obligation_id = target_obligation_id;

  if reversal_id is null
     or not exists (
       select 1
       from public.direct_donation_upgrade_obligations
       where id = target_obligation_id
         and status = 'provider_reversed'
         and provider_reversed_at = refunded_at
         and provider_charge_id_hash = repeat('b', 64)
         and verified_at is not null
     )
     or not exists (
       select 1
       from public.direct_donation_upgrade_offers
       where id = target_offer_id
         and status = 'post_completion_exception'
         and completed_at is not null
         and failure_code = 'provider_refund_recorded'
     )
     or (
       select count(*)
       from public.direct_donation_upgrade_impact_credits
       where obligation_id = target_obligation_id
     ) <> 1 then
    raise exception 'Refund state did not preserve confirmation history and create one reversal.';
  end if;

  if not exists (
    select 1
    from public.direct_donation_upgrade_public_offers
    where id = target_offer_id
      and status = 'post_completion_exception'
      and creator_display_name = 'Refund QA Creator'
      and matcher_display_name = 'Refund QA Matcher'
      and verified_obligation_count = 2
      and verified_gross_amount_cents = 1500
      and verified_net_amount_cents = 1425
      and current_unreversed_gross_amount_cents = 1000
      and current_unreversed_net_amount_cents = 950
      and current_incremental_net_amount_cents = 0
      and current_redirected_net_amount_cents = 950
      and provider_reversed_obligation_count = 1
  ) then
    raise exception 'Public gross-versus-current refund accounting is incorrect.';
  end if;

  replay := public.record_direct_donation_upgrade_provider_reversal(
    operator_id,
    target_obligation_id,
    'staging',
    repeat('b', 64),
    partner_donation_id,
    repeat('2', 64),
    500,
    'USD',
    refunded_at,
    'every_org_dashboard',
    repeat('9', 64)
  );
  if replay->>'outcome' <> 'already_recorded'
     or (
       select count(*)
       from public.direct_donation_upgrade_provider_reversals
       where obligation_id = target_obligation_id
     ) <> 1 then
    raise exception 'Identical refund replay was not idempotent: %', replay;
  end if;

  completion_replay := public.complete_direct_donation_upgrade_obligation(
    target_obligation_id,
    true,
    '',
    '',
    repeat('b', 64),
    repeat('f', 64),
    500,
    475,
    'USD',
    'refund-qa-upgraded',
    '222222222',
    original_donation_date,
    'rollback-test',
    'staging'
  );
  if completion_replay->>'outcome' <> 'already_provider_reversed'
     or (
       select count(*)
       from public.direct_donation_upgrade_impact_credits
       where obligation_id = target_obligation_id
     ) <> 1
     or (
       select count(*)
       from public.direct_donation_upgrade_provider_reversals
       where obligation_id = target_obligation_id
     ) <> 1
     or (
       select status
       from public.direct_donation_upgrade_obligations
       where id = target_obligation_id
     ) <> 'provider_reversed' then
    raise exception 'Completion replay after refund recreated credit or restored state: %',
      completion_replay;
  end if;

  begin
    update public.direct_donation_upgrade_provider_reversals
    set evidence_reference_hash = repeat('8', 64)
    where id = reversal_id;
  exception when others then
    blocked := position('append-only' in lower(sqlerrm)) > 0;
  end;
  if not blocked then
    raise exception 'Provider-refund evidence was mutable.';
  end if;

  select count(*) into forbidden_execute
  from information_schema.routine_privileges
  where specific_schema = 'public'
    and routine_name = 'record_direct_donation_upgrade_provider_reversal'
    and grantee in ('PUBLIC', 'anon', 'authenticated');
  select count(*) into missing_execute
  from information_schema.routine_privileges
  where specific_schema = 'public'
    and routine_name = 'record_direct_donation_upgrade_provider_reversal'
    and grantee = 'service_role'
    and privilege_type = 'EXECUTE';
  select count(*) into forbidden_mutation
  from information_schema.role_table_grants
  where table_schema = 'public'
    and table_name = 'direct_donation_upgrade_provider_reversals'
    and grantee in ('PUBLIC', 'anon', 'authenticated', 'service_role')
    and privilege_type in ('INSERT', 'UPDATE', 'DELETE', 'TRUNCATE');
  select count(*) into missing_read
  from information_schema.role_table_grants
  where table_schema = 'public'
    and table_name = 'direct_donation_upgrade_provider_reversals'
    and grantee = 'service_role'
    and privilege_type = 'SELECT';

  if forbidden_execute <> 0
     or missing_execute <> 1
     or forbidden_mutation <> 0
     or missing_read <> 1 then
    raise exception
      'Refund RPC/table privilege boundary is invalid: forbidden_execute %, missing_execute %, forbidden_mutation %, missing_read %',
      forbidden_execute, missing_execute, forbidden_mutation, missing_read;
  end if;

  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'direct_donation_upgrade_provider_reversals'
      and (
        lower(column_name) like '%donor%'
        or lower(column_name) like '%email%'
        or lower(column_name) like '%raw%'
        or lower(column_name) like '%card%'
        or lower(column_name) like '%bank%'
        or lower(column_name) like '%credential%'
        or lower(column_name) = 'provider_payload'
      )
  ) then
    raise exception 'The refund evidence table persists prohibited donor PII or raw payment data.';
  end if;
end;
$record_refund$;

savepoint altered_completion_after_refund;
do $altered_completion$
declare
  result jsonb;
  target_obligation_id uuid := (
    select value from direct_upgrade_refund_fixture_ids where key = 'matcher_one'
  );
  target_offer_id uuid := (
    select value from direct_upgrade_refund_fixture_ids where key = 'offer_one'
  );
  original_donation_date timestamptz := (
    select provider_donation_date
    from public.direct_donation_upgrade_obligations
    where id = target_obligation_id
  );
begin
  result := public.complete_direct_donation_upgrade_obligation(
    target_obligation_id,
    true,
    '',
    '',
    repeat('b', 64),
    repeat('f', 64),
    500,
    474,
    'USD',
    'refund-qa-upgraded',
    '222222222',
    original_donation_date,
    'rollback-test',
    'staging'
  );
  if result->>'outcome' <> 'needs_review'
     or result->>'reason' <> 'post_refund_completion_replay_mismatch'
     or (
       select count(*)
       from public.direct_donation_upgrade_impact_credits
       where obligation_id = target_obligation_id
     ) <> 1
     or (
       select count(*)
       from public.direct_donation_upgrade_provider_reversals
       where obligation_id = target_obligation_id
     ) <> 1
     or not exists (
       select 1
       from public.direct_donation_upgrade_offers
       where id = target_offer_id and status = 'needs_review'
     ) then
    raise exception 'Altered completion replay after refund did not fail closed: %', result;
  end if;
end;
$altered_completion$;
rollback to savepoint altered_completion_after_refund;

rollback;
