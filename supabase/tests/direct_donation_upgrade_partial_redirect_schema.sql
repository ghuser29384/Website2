-- Rollback-only behavioral regression for partial Donation Upgrade redirection
-- and binding counteroffers. No checkout or provider call is made: provider
-- webhook results are injected only through the service-only database RPC.

begin;

insert into auth.users (
  id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, confirmation_token, recovery_token,
  email_change_token_new, email_change_token_current, reauthentication_token,
  is_sso_user, is_anonymous, created_at, updated_at
)
select
  fixture.id,
  '00000000-0000-0000-0000-000000000000'::uuid,
  'authenticated',
  'authenticated',
  fixture.email,
  '',
  timezone('utc', now()),
  '{"provider":"email","providers":["email"]}'::jsonb,
  jsonb_build_object('display_name', fixture.display_name, 'qa_fixture', true),
  '', '', '', '', '', false, false,
  timezone('utc', now()),
  timezone('utc', now())
from (values
  ('db110000-0000-4000-8000-000000000001'::uuid, 'partial-upgrade-creator@example.test', 'Partial Upgrade Creator'),
  ('db110000-0000-4000-8000-000000000002'::uuid, 'partial-upgrade-matcher@example.test', 'Partial Upgrade Matcher'),
  ('db110000-0000-4000-8000-000000000003'::uuid, 'partial-upgrade-default-creator@example.test', 'Partial Default Creator'),
  ('db110000-0000-4000-8000-000000000004'::uuid, 'partial-upgrade-promotion-creator@example.test', 'Partial Promotion Creator'),
  ('db110000-0000-4000-8000-000000000005'::uuid, 'partial-upgrade-default-matcher@example.test', 'Partial Default Matcher'),
  ('db110000-0000-4000-8000-000000000006'::uuid, 'partial-upgrade-backup@example.test', 'Partial Backup Matcher'),
  ('db110000-0000-4000-8000-000000000007'::uuid, 'partial-upgrade-replay-creator@example.test', 'Partial Replay Creator'),
  ('db110000-0000-4000-8000-000000000008'::uuid, 'partial-upgrade-replay-matcher@example.test', 'Partial Replay Matcher'),
  ('db110000-0000-4000-8000-000000000009'::uuid, 'partial-upgrade-negotiation-creator@example.test', 'Partial Negotiation Creator'),
  ('db110000-0000-4000-8000-00000000000a'::uuid, 'partial-upgrade-proposer-a@example.test', 'Partial Proposer A'),
  ('db110000-0000-4000-8000-00000000000b'::uuid, 'partial-upgrade-proposer-b@example.test', 'Partial Proposer B')
) as fixture(id, email, display_name);

insert into public.profiles (id, email, display_name, bio)
select id, email, display_name, ''
from (values
  ('db110000-0000-4000-8000-000000000001'::uuid, 'partial-upgrade-creator@example.test', 'Partial Upgrade Creator'),
  ('db110000-0000-4000-8000-000000000002'::uuid, 'partial-upgrade-matcher@example.test', 'Partial Upgrade Matcher'),
  ('db110000-0000-4000-8000-000000000003'::uuid, 'partial-upgrade-default-creator@example.test', 'Partial Default Creator'),
  ('db110000-0000-4000-8000-000000000004'::uuid, 'partial-upgrade-promotion-creator@example.test', 'Partial Promotion Creator'),
  ('db110000-0000-4000-8000-000000000005'::uuid, 'partial-upgrade-default-matcher@example.test', 'Partial Default Matcher'),
  ('db110000-0000-4000-8000-000000000006'::uuid, 'partial-upgrade-backup@example.test', 'Partial Backup Matcher'),
  ('db110000-0000-4000-8000-000000000007'::uuid, 'partial-upgrade-replay-creator@example.test', 'Partial Replay Creator'),
  ('db110000-0000-4000-8000-000000000008'::uuid, 'partial-upgrade-replay-matcher@example.test', 'Partial Replay Matcher'),
  ('db110000-0000-4000-8000-000000000009'::uuid, 'partial-upgrade-negotiation-creator@example.test', 'Partial Negotiation Creator'),
  ('db110000-0000-4000-8000-00000000000a'::uuid, 'partial-upgrade-proposer-a@example.test', 'Partial Proposer A'),
  ('db110000-0000-4000-8000-00000000000b'::uuid, 'partial-upgrade-proposer-b@example.test', 'Partial Proposer B')
) as fixture(id, email, display_name)
on conflict (id) do update set
  email = excluded.email,
  display_name = excluded.display_name;

do $test$
declare
  creator_id constant uuid := 'db110000-0000-4000-8000-000000000001';
  matcher_id constant uuid := 'db110000-0000-4000-8000-000000000002';
  default_creator_id constant uuid := 'db110000-0000-4000-8000-000000000003';
  promotion_creator_id constant uuid := 'db110000-0000-4000-8000-000000000004';
  default_matcher_id constant uuid := 'db110000-0000-4000-8000-000000000005';
  backup_matcher_id constant uuid := 'db110000-0000-4000-8000-000000000006';
  replay_creator_id constant uuid := 'db110000-0000-4000-8000-000000000007';
  replay_matcher_id constant uuid := 'db110000-0000-4000-8000-000000000008';
  negotiation_creator_id constant uuid := 'db110000-0000-4000-8000-000000000009';
  proposer_a_id constant uuid := 'db110000-0000-4000-8000-00000000000a';
  proposer_b_id constant uuid := 'db110000-0000-4000-8000-00000000000b';
  baseline_version constant text := 'direct-donation-upgrade-baseline-v1-2026-08-01';
  matcher_version constant text := 'direct-donation-upgrade-matcher-v1-2026-08-01';
  proposal_version constant text := 'direct-donation-upgrade-proposal-v1-2026-08-12';
  match_deadline timestamptz := timezone('utc', now()) + interval '7 days';
  isolated_live_offer_id uuid;
  original_recipient jsonb := jsonb_build_object(
    'schemaVersion', 'moral-trade-every-org-nonprofit-identity-v1',
    'provider', 'every_org',
    'providerNonprofitId', 'partial-qa-original-recipient',
    'name', 'Partial QA Original Recipient',
    'primarySlug', 'partial-qa-original',
    'ein', '111111111',
    'isDisbursable', true,
    'profileUrl', 'https://www.every.org/partial-qa-original',
    'websiteUrl', 'https://example.test/original',
    'locationAddress', 'QA only',
    'description', 'Rollback-only partial Donation Upgrade fixture.',
    'logoUrl', '',
    'identityHash', repeat('1', 64)
  );
  upgraded_recipient jsonb := jsonb_build_object(
    'schemaVersion', 'moral-trade-every-org-nonprofit-identity-v1',
    'provider', 'every_org',
    'providerNonprofitId', 'partial-qa-upgraded-recipient',
    'name', 'Partial QA Upgraded Recipient',
    'primarySlug', 'partial-qa-upgraded',
    'ein', '222222222',
    'isDisbursable', true,
    'profileUrl', 'https://www.every.org/partial-qa-upgraded',
    'websiteUrl', 'https://example.test/upgraded',
    'locationAddress', 'QA only',
    'description', 'Rollback-only partial Donation Upgrade fixture.',
    'logoUrl', '',
    'identityHash', repeat('2', 64)
  );
  result jsonb;
  replay_result jsonb;
  altered_result jsonb;
  cross_reuse_result jsonb;
  offer_20_id uuid;
  offer_20_candidate_id uuid;
  retained_20_id uuid;
  redirected_20_id uuid;
  matcher_20_id uuid;
  creator_default_offer_id uuid;
  creator_default_candidate_id uuid;
  creator_default_retained_id uuid;
  creator_default_redirected_id uuid;
  creator_default_matcher_obligation_id uuid;
  promotion_offer_id uuid;
  promotion_primary_id uuid;
  promotion_backup_id uuid;
  withdrawn_backup_id uuid;
  promotion_retained_id uuid;
  promotion_redirected_id uuid;
  promotion_primary_obligation_id uuid;
  promotion_promoted_obligation_id uuid;
  offer_100_id uuid;
  offer_100_candidate_id uuid;
  offer_100_matcher_obligation_id uuid;
  cross_offer_id uuid;
  cross_candidate_id uuid;
  cross_obligation_id uuid;
  negotiation_offer_id uuid;
  withdrawn_proposal_id uuid;
  rejected_proposal_id uuid;
  accepted_proposal_id uuid;
  superseded_proposal_id uuid;
  accepted_revision_id uuid;
  accepted_candidate_id uuid;
  accepted_commitment_at timestamptz;
  accepted_terms_hash text;
  superseded_terms_hash text;
  cancelled_offer_id uuid;
  cancelled_proposal_id uuid;
  blocked boolean;
  forbidden_privileges integer;
  old_service_privileges integer;
  missing_service_privileges integer;
  forbidden_table_mutations integer;
  missing_table_reads integer;
  insecure_definers integer;
  before_creator_obligations integer;
  before_creator_credits integer;
  before_matcher_obligations integer;
begin
  -- Schema and deterministic split prerequisites.
  if to_regclass('public.direct_donation_upgrade_proposals') is null
     or to_regprocedure('public.create_direct_donation_upgrade_offer(uuid,text,integer,integer,timestamptz,text,jsonb,jsonb,text,text,text,integer)') is null
     or to_regprocedure('public.propose_direct_donation_upgrade_terms(uuid,uuid,integer,integer,integer,integer,text,text,text)') is null
     or to_regprocedure('public.accept_direct_donation_upgrade_proposal(uuid,uuid,text,text)') is null
     or to_regprocedure('public.run_direct_donation_upgrade_lifecycle(timestamptz,text)') is null then
    raise exception 'The partial Donation Upgrade schema or RPC surface is incomplete.';
  end if;

  if public.direct_donation_upgrade_redirected_amount(1000, 2000) <> 200
     or public.direct_donation_upgrade_redirected_amount(1001, 3333) <> 334
     or public.direct_donation_upgrade_redirected_amount(1000, 10000) <> 1000 then
    raise exception 'Deterministic integer-cent split rounding is incorrect.';
  end if;
  perform public.direct_donation_upgrade_validate_split(1000, 2000, 200, 800);
  perform public.direct_donation_upgrade_validate_split(1000, 10000, 1000, 0);

  blocked := false;
  begin
    perform public.direct_donation_upgrade_validate_split(1000, 2000, 201, 799);
  exception when others then
    blocked := position('do not match' in lower(sqlerrm)) > 0;
  end;
  if not blocked then
    raise exception 'A nondeterministic split was accepted.';
  end if;

  blocked := false;
  begin
    perform public.direct_donation_upgrade_validate_split(1000, 1, 0, 1000);
  exception when others then
    blocked := position('at least $1' in lower(sqlerrm)) > 0;
  end;
  if not blocked then
    raise exception 'A redirected leg below $1 was accepted.';
  end if;

  blocked := false;
  begin
    perform public.direct_donation_upgrade_validate_split(1000, 9900, 990, 10);
  exception when others then
    blocked := position('either $0 or at least $1' in lower(sqlerrm)) > 0;
  end;
  if not blocked then
    raise exception 'A nonzero retained leg below $1 was accepted.';
  end if;

  -- A live fixture in the same transaction proves that the staging lifecycle
  -- cannot cross the environment boundary.
  result := public.create_direct_donation_upgrade_offer(
    creator_id, 'live', 1000, 500,
    match_deadline,
    'public', original_recipient, upgraded_recipient,
    baseline_version,
    'A live-environment isolation fixture used only inside this rollback-only test.',
    public.direct_donation_upgrade_terms_hash_v2(
      creator_id, 1000, 2000, 500, repeat('1', 64), repeat('2', 64),
      match_deadline, 'public', 'live',
      'A live-environment isolation fixture used only inside this rollback-only test.'
    ), 2000
  );
  isolated_live_offer_id := (result->>'id')::uuid;

  -- 20% direct acceptance: $8 retained, $2 redirected, plus a separate matcher leg.
  result := public.create_direct_donation_upgrade_offer(
    creator_id, 'staging', 1000, 500,
    match_deadline,
    'private_until_completed', original_recipient, upgraded_recipient,
    baseline_version,
    'The full $10 original donation was independently planned before this rollback-only test.',
    public.direct_donation_upgrade_terms_hash_v2(
      creator_id, 1000, 2000, 500, repeat('1', 64), repeat('2', 64),
      match_deadline, 'private_until_completed', 'staging',
      'The full $10 original donation was independently planned before this rollback-only test.'
    ), 2000
  );
  offer_20_id := (result->>'id')::uuid;

  blocked := false;
  begin
    perform public.join_direct_donation_upgrade_offer(
      matcher_id,
      offer_20_id,
      matcher_version,
      'live'
    );
  exception when others then
    blocked := position('different environment' in lower(sqlerrm)) > 0;
  end;
  if not blocked
     or exists (
       select 1 from public.direct_donation_upgrade_candidates
       where offer_id = offer_20_id and profile_id = matcher_id
     ) then
    raise exception 'Join did not fail closed before mutation on an environment mismatch.';
  end if;

  result := public.join_direct_donation_upgrade_offer(matcher_id, offer_20_id, matcher_version, 'staging');
  offer_20_candidate_id := (result->>'id')::uuid;

  if (select count(*) from public.direct_donation_upgrade_obligations where offer_id = offer_20_id) <> 3 then
    raise exception 'The 20%% matched branch did not create exactly three obligations.';
  end if;
  select id into retained_20_id
  from public.direct_donation_upgrade_obligations
  where offer_id = offer_20_id
    and obligation_kind = 'creator_retained'
    and expected_amount_cents = 800
    and expected_recipient_hash = repeat('1', 64)
    and expected_recipient->>'primarySlug' = 'partial-qa-original'
    and incremental_amount_cents = 0
    and redirected_amount_cents = 0;
  select id into redirected_20_id
  from public.direct_donation_upgrade_obligations
  where offer_id = offer_20_id
    and obligation_kind = 'creator_redirected'
    and expected_amount_cents = 200
    and expected_recipient_hash = repeat('2', 64)
    and expected_recipient->>'primarySlug' = 'partial-qa-upgraded'
    and incremental_amount_cents = 0
    and redirected_amount_cents = 200;
  select id into matcher_20_id
  from public.direct_donation_upgrade_obligations
  where offer_id = offer_20_id
    and candidate_id = offer_20_candidate_id
    and obligation_kind = 'matcher_incremental'
    and expected_amount_cents = 500
    and expected_recipient_hash = repeat('2', 64)
    and expected_recipient->>'primarySlug' = 'partial-qa-upgraded'
    and incremental_amount_cents = 500
    and redirected_amount_cents = 0;
  if retained_20_id is null or redirected_20_id is null or matcher_20_id is null then
    raise exception 'The 20%% obligation amounts, kinds, or recipients are incorrect.';
  end if;

  blocked := false;
  begin
    perform public.start_direct_donation_upgrade_checkout(
      creator_id,
      retained_20_id,
      'live'
    );
  exception when others then
    blocked := position('different environment' in lower(sqlerrm)) > 0;
  end;
  if not blocked
     or (select status from public.direct_donation_upgrade_obligations where id = retained_20_id) <> 'pending' then
    raise exception 'Checkout did not fail closed before mutation on an environment mismatch.';
  end if;
  result := public.start_direct_donation_upgrade_checkout(
    creator_id,
    retained_20_id,
    'staging'
  );
  if result->>'status' <> 'checkout_started' then
    raise exception 'The environment-bound checkout did not preserve the payable obligation transition.';
  end if;

  if exists (
    select 1 from public.direct_donation_upgrade_public_offers
    where id = offer_20_id
      and (creator_display_name is not null or matcher_display_name is not null)
  ) then
    raise exception 'Private participant identities were exposed before completion.';
  end if;

  blocked := false;
  begin
    update public.direct_donation_upgrade_obligations
    set status = 'verified'
    where id = redirected_20_id;
  exception when others then
    blocked := position('provider webhook evidence' in lower(sqlerrm)) > 0;
  end;
  if not blocked
     or (select status from public.direct_donation_upgrade_obligations where id = redirected_20_id) <> 'pending' then
    raise exception 'A direct write could verify an obligation without complete provider webhook evidence.';
  end if;

  -- Matcher alone must not complete.
  blocked := false;
  begin
    perform public.complete_direct_donation_upgrade_obligation(
      matcher_20_id, true, '', '', repeat('3', 64), repeat('4', 64),
      500, 475, 'USD', 'partial-qa-upgraded', '222222222',
      timezone('utc', now()) + interval '1 day', 'rollback-test', 'live'
    );
  exception when others then
    blocked := position('different environment' in lower(sqlerrm)) > 0;
  end;
  if not blocked
     or (select status from public.direct_donation_upgrade_obligations where id = matcher_20_id) <> 'pending' then
    raise exception 'Webhook completion did not fail closed before mutation on an environment mismatch.';
  end if;

  result := public.complete_direct_donation_upgrade_obligation(
    matcher_20_id, true, '', '', repeat('3', 64), repeat('4', 64),
    500, 475, 'USD', 'partial-qa-upgraded', '222222222',
    timezone('utc', now()) + interval '1 day', 'rollback-test', 'staging'
  );
  if not exists (select 1 from public.direct_donation_upgrade_offers where id = offer_20_id and status = 'matched') then
    raise exception 'The matched offer completed after only the matcher obligation.';
  end if;

  -- Matcher plus redirected creator leg must still not complete without retained.
  result := public.complete_direct_donation_upgrade_obligation(
    redirected_20_id, true, '', '', repeat('5', 64), repeat('6', 64),
    200, 190, 'USD', 'partial-qa-upgraded', '222222222',
    timezone('utc', now()) + interval '1 day', 'rollback-test', 'staging'
  );
  if not exists (select 1 from public.direct_donation_upgrade_offers where id = offer_20_id and status = 'matched') then
    raise exception 'The matched offer completed without the retained creator obligation.';
  end if;

  result := public.complete_direct_donation_upgrade_obligation(
    retained_20_id, true, '', '', repeat('7', 64), repeat('8', 64),
    800, 760, 'USD', 'partial-qa-original', '111111111',
    timezone('utc', now()) + interval '1 day', 'rollback-test', 'staging'
  );
  if not exists (select 1 from public.direct_donation_upgrade_offers where id = offer_20_id and status = 'completed') then
    raise exception 'The 20%% offer did not complete after every required leg was verified.';
  end if;

  if not exists (
    select 1 from public.direct_donation_upgrade_impact_credits
    where obligation_id = retained_20_id
      and verified_gross_amount_cents = 800
      and verified_net_amount_cents = 760
      and incremental_gross_amount_cents = 0
      and incremental_net_amount_cents = 0
      and redirected_gross_amount_cents = 0
      and redirected_net_amount_cents = 0
  ) then
    raise exception 'The retained creator leg received incorrect impact accounting.';
  end if;
  if not exists (
    select 1 from public.direct_donation_upgrade_impact_credits
    where obligation_id = redirected_20_id
      and verified_gross_amount_cents = 200
      and verified_net_amount_cents = 190
      and incremental_gross_amount_cents = 0
      and incremental_net_amount_cents = 0
      and redirected_gross_amount_cents = 200
      and redirected_net_amount_cents = 190
  ) then
    raise exception 'The redirected creator leg received incorrect impact accounting.';
  end if;
  if not exists (
    select 1 from public.direct_donation_upgrade_impact_credits
    where obligation_id = matcher_20_id
      and verified_gross_amount_cents = 500
      and verified_net_amount_cents = 475
      and incremental_gross_amount_cents = 500
      and incremental_net_amount_cents = 475
      and redirected_gross_amount_cents = 0
      and redirected_net_amount_cents = 0
  ) then
    raise exception 'The matcher leg received incorrect incremental accounting.';
  end if;
  if not exists (
    select 1 from public.direct_donation_upgrade_public_offers
    where id = offer_20_id
      and creator_display_name = 'Partial Upgrade Creator'
      and matcher_display_name = 'Partial Upgrade Matcher'
      and verified_gross_amount_cents = 1500
      and verified_net_amount_cents = 1425
      and incremental_net_amount_cents = 475
      and redirected_net_amount_cents = 190
  ) then
    raise exception 'Successful completion did not reveal identities or aggregate gross/net impact correctly.';
  end if;

  blocked := false;
  begin
    update public.direct_donation_upgrade_offers
    set status = 'matched'
    where id = offer_20_id;
  exception when others then
    blocked := position('invalid donation upgrade offer status transition' in lower(sqlerrm)) > 0;
  end;
  if not blocked then
    raise exception 'A completed Donation Upgrade offer could be reopened.';
  end if;

  blocked := false;
  begin
    update public.direct_donation_upgrade_obligations
    set status = 'pending'
    where id = retained_20_id;
  exception when others then
    blocked := position('invalid direct donation upgrade obligation status transition' in lower(sqlerrm)) > 0;
  end;
  if not blocked then
    raise exception 'A verified obligation could be demoted to pending.';
  end if;

  blocked := false;
  begin
    update public.direct_donation_upgrade_candidates
    set status = 'primary'
    where id = offer_20_candidate_id;
  exception when others then
    blocked := position('invalid donation upgrade matcher status transition' in lower(sqlerrm)) > 0;
  end;
  if not blocked then
    raise exception 'A fulfilled matcher candidate could be revived as primary.';
  end if;

  -- Creator default: retained alone does not complete; a fulfilled matcher stays fulfilled.
  result := public.create_direct_donation_upgrade_offer(
    default_creator_id, 'staging', 1000, 550,
    match_deadline,
    'public', original_recipient, upgraded_recipient,
    baseline_version,
    'A separate creator-default baseline for the rollback-only partial regression.',
    public.direct_donation_upgrade_terms_hash_v2(
      default_creator_id, 1000, 2000, 550, repeat('1', 64), repeat('2', 64),
      match_deadline, 'public', 'staging',
      'A separate creator-default baseline for the rollback-only partial regression.'
    ), 2000
  );
  creator_default_offer_id := (result->>'id')::uuid;
  result := public.join_direct_donation_upgrade_offer(matcher_id, creator_default_offer_id, matcher_version, 'staging');
  creator_default_candidate_id := (result->>'id')::uuid;
  select id into creator_default_retained_id from public.direct_donation_upgrade_obligations
    where offer_id = creator_default_offer_id and obligation_kind = 'creator_retained';
  select id into creator_default_redirected_id from public.direct_donation_upgrade_obligations
    where offer_id = creator_default_offer_id and obligation_kind = 'creator_redirected';
  select id into creator_default_matcher_obligation_id from public.direct_donation_upgrade_obligations
    where candidate_id = creator_default_candidate_id and obligation_kind = 'matcher_incremental';

  perform public.complete_direct_donation_upgrade_obligation(
    creator_default_retained_id, true, '', '', repeat('a', 64), repeat('b', 64),
    800, 752, 'USD', 'partial-qa-original', '111111111',
    timezone('utc', now()) + interval '1 day', 'rollback-test', 'staging'
  );
  if not exists (select 1 from public.direct_donation_upgrade_offers where id = creator_default_offer_id and status = 'matched') then
    raise exception 'The retained creator leg alone completed a matched offer.';
  end if;
  perform public.complete_direct_donation_upgrade_obligation(
    creator_default_matcher_obligation_id, true, '', '', repeat('c', 64), repeat('d', 64),
    550, 520, 'USD', 'partial-qa-upgraded', '222222222',
    timezone('utc', now()) + interval '1 day', 'rollback-test', 'staging'
  );
  if not exists (select 1 from public.direct_donation_upgrade_offers where id = creator_default_offer_id and status = 'matched') then
    raise exception 'The creator-default offer completed with its redirected leg missing.';
  end if;

  result := public.run_direct_donation_upgrade_lifecycle(timezone('utc', now()) + interval '9 days', 'staging');
  if result->>'environment' <> 'staging'
     or not exists (
       select 1 from public.direct_donation_upgrade_offers
       where id = isolated_live_offer_id and environment = 'live' and status = 'open'
     ) then
    raise exception 'The staging lifecycle crossed into a live Donation Upgrade offer: %', result;
  end if;
  if not exists (
    select 1 from public.direct_donation_upgrade_offers
    where id = creator_default_offer_id
      and status = 'defaulted'
      and failure_code = 'creator_matched_default'
  ) then
    raise exception 'A missing required creator leg did not default the offer: %', result;
  end if;
  if not exists (
    select 1 from public.direct_donation_upgrade_obligations
    where id = creator_default_redirected_id and status = 'defaulted'
  ) or not exists (
    select 1 from public.direct_donation_upgrade_obligations
    where id = creator_default_retained_id and status = 'verified'
  ) or not exists (
    select 1 from public.direct_donation_upgrade_obligations
    where id = creator_default_matcher_obligation_id and status = 'verified'
  ) or not exists (
    select 1 from public.direct_donation_upgrade_candidates
    where id = creator_default_candidate_id and status = 'fulfilled'
  ) then
    raise exception 'Creator default did not preserve verified creator and fulfilled matcher evidence.';
  end if;
  if (select count(*) from public.direct_donation_upgrade_impact_credits
      where obligation_id in (creator_default_retained_id, creator_default_matcher_obligation_id)) <> 2 then
    raise exception 'Creator default removed or duplicated already-verified impact credit.';
  end if;
  if (select count(*) from public.credibility_restrictions
      where profile_id = default_creator_id
        and reason_code = 'direct_donation_upgrade_default'
        and status = 'active') <> 1
     or (select count(*) from public.credibility_events
         where profile_id = default_creator_id
           and source_type = 'direct_donation_upgrade'
           and reason_code = 'direct_donation_upgrade_default'
           and outcome = 0) <> 1 then
    raise exception 'Creator default did not create exactly one restriction and credibility event.';
  end if;
  perform public.run_direct_donation_upgrade_lifecycle(timezone('utc', now()) + interval '9 days', 'staging');
  if (select count(*) from public.credibility_restrictions
      where profile_id = default_creator_id and reason_code = 'direct_donation_upgrade_default') <> 1
     or (select count(*) from public.credibility_events
         where profile_id = default_creator_id
           and source_type = 'direct_donation_upgrade'
           and reason_code = 'direct_donation_upgrade_default') <> 1 then
    raise exception 'Lifecycle retry duplicated creator default consequences.';
  end if;

  -- Matcher default: redirected alone does not complete; verified creator evidence survives promotion.
  result := public.create_direct_donation_upgrade_offer(
    promotion_creator_id, 'staging', 1000, 600,
    match_deadline,
    'public', original_recipient, upgraded_recipient,
    baseline_version,
    'A separate matcher-promotion baseline for the rollback-only partial regression.',
    public.direct_donation_upgrade_terms_hash_v2(
      promotion_creator_id, 1000, 2000, 600, repeat('1', 64), repeat('2', 64),
      match_deadline, 'public', 'staging',
      'A separate matcher-promotion baseline for the rollback-only partial regression.'
    ), 2000
  );
  promotion_offer_id := (result->>'id')::uuid;
  result := public.join_direct_donation_upgrade_offer(default_matcher_id, promotion_offer_id, matcher_version, 'staging');
  promotion_primary_id := (result->>'id')::uuid;
  result := public.join_direct_donation_upgrade_offer(backup_matcher_id, promotion_offer_id, matcher_version, 'staging');
  promotion_backup_id := (result->>'id')::uuid;
  result := public.join_direct_donation_upgrade_offer(
    proposer_a_id,
    promotion_offer_id,
    matcher_version,
    'staging'
  );
  withdrawn_backup_id := (result->>'id')::uuid;
  blocked := false;
  begin
    perform public.withdraw_direct_donation_upgrade_backup(
      proposer_a_id,
      promotion_offer_id,
      'live'
    );
  exception when others then
    blocked := position('different environment' in lower(sqlerrm)) > 0;
  end;
  if not blocked
     or (select status from public.direct_donation_upgrade_candidates where id = withdrawn_backup_id) <> 'backup' then
    raise exception 'Backup withdrawal did not fail closed before mutation on an environment mismatch.';
  end if;
  result := public.withdraw_direct_donation_upgrade_backup(
    proposer_a_id,
    promotion_offer_id,
    'staging'
  );
  if result->>'status' <> 'withdrawn' then
    raise exception 'The environment-bound backup withdrawal did not retain the backup lifecycle semantics.';
  end if;
  select id into promotion_retained_id from public.direct_donation_upgrade_obligations
    where offer_id = promotion_offer_id and obligation_kind = 'creator_retained';
  select id into promotion_redirected_id from public.direct_donation_upgrade_obligations
    where offer_id = promotion_offer_id and obligation_kind = 'creator_redirected';
  select id into promotion_primary_obligation_id from public.direct_donation_upgrade_obligations
    where candidate_id = promotion_primary_id and obligation_kind = 'matcher_incremental';

  perform public.complete_direct_donation_upgrade_obligation(
    promotion_redirected_id, true, '', '', repeat('f', 64), repeat('0', 64),
    200, 188, 'USD', 'partial-qa-upgraded', '222222222',
    timezone('utc', now()) + interval '1 day', 'rollback-test', 'staging'
  );
  if not exists (select 1 from public.direct_donation_upgrade_offers where id = promotion_offer_id and status = 'matched') then
    raise exception 'The redirected creator leg alone completed a matched offer.';
  end if;
  perform public.complete_direct_donation_upgrade_obligation(
    promotion_retained_id, true, '', '', repeat('0', 64), repeat('f', 64),
    800, 744, 'USD', 'partial-qa-original', '111111111',
    timezone('utc', now()) + interval '1 day', 'rollback-test', 'staging'
  );
  select count(*) into before_creator_obligations from public.direct_donation_upgrade_obligations
    where offer_id = promotion_offer_id and participant_role = 'creator';
  select count(*) into before_creator_credits from public.direct_donation_upgrade_impact_credits
    where offer_id = promotion_offer_id and profile_id = promotion_creator_id;
  select count(*) into before_matcher_obligations from public.direct_donation_upgrade_obligations
    where offer_id = promotion_offer_id and participant_role = 'matcher';

  result := public.run_direct_donation_upgrade_lifecycle(timezone('utc', now()) + interval '9 days', 'staging');
  if not exists (select 1 from public.direct_donation_upgrade_candidates
                 where id = promotion_primary_id and status = 'defaulted')
     or not exists (select 1 from public.direct_donation_upgrade_candidates
                    where id = promotion_backup_id and status = 'promoted')
     or not exists (select 1 from public.direct_donation_upgrade_offers
                    where id = promotion_offer_id and status = 'matched'
                      and winning_candidate_id = promotion_backup_id) then
    raise exception 'Matcher default did not promote the next backup: %', result;
  end if;
  select id into promotion_promoted_obligation_id
  from public.direct_donation_upgrade_obligations
  where candidate_id = promotion_backup_id and obligation_kind = 'matcher_incremental';
  if promotion_promoted_obligation_id is null
     or (select count(*) from public.direct_donation_upgrade_obligations
         where offer_id = promotion_offer_id and participant_role = 'creator') <> before_creator_obligations
     or (select count(*) from public.direct_donation_upgrade_impact_credits
         where offer_id = promotion_offer_id and profile_id = promotion_creator_id) <> before_creator_credits
     or (select count(*) from public.direct_donation_upgrade_obligations
         where offer_id = promotion_offer_id and participant_role = 'matcher') <> before_matcher_obligations + 1 then
    raise exception 'Backup promotion duplicated creator evidence or failed to create exactly one matcher obligation.';
  end if;
  if not exists (select 1 from public.direct_donation_upgrade_obligations
                 where id = promotion_retained_id and status = 'verified')
     or not exists (select 1 from public.direct_donation_upgrade_obligations
                    where id = promotion_redirected_id and status = 'verified')
     or not exists (select 1 from public.direct_donation_upgrade_obligations
                    where id = promotion_primary_obligation_id and status = 'defaulted') then
    raise exception 'Backup promotion did not preserve creator verification or default the old matcher obligation.';
  end if;
  perform public.run_direct_donation_upgrade_lifecycle(timezone('utc', now()) + interval '9 days', 'staging');
  if (select count(*) from public.direct_donation_upgrade_obligations
      where offer_id = promotion_offer_id and participant_role = 'creator') <> before_creator_obligations
     or (select count(*) from public.direct_donation_upgrade_obligations
         where offer_id = promotion_offer_id and participant_role = 'matcher') <> before_matcher_obligations + 1
     or (select count(*) from public.credibility_restrictions
         where profile_id = default_matcher_id
           and reason_code = 'direct_donation_upgrade_default') <> 1
     or (select count(*) from public.credibility_events
         where profile_id = default_matcher_id
           and source_type = 'direct_donation_upgrade'
           and reason_code = 'direct_donation_upgrade_default') <> 1 then
    raise exception 'Lifecycle retry duplicated promotion or matcher-default consequences.';
  end if;

  -- 100% compatibility and provider replay behavior.
  result := public.create_direct_donation_upgrade_offer(
    replay_creator_id, 'staging', 1000, 700,
    match_deadline,
    'public', original_recipient, upgraded_recipient,
    baseline_version,
    'A full-redirection compatibility and provider replay rollback-only baseline.',
    public.direct_donation_upgrade_terms_hash_v2(
      replay_creator_id, 1000, 10000, 700, repeat('1', 64), repeat('2', 64),
      match_deadline, 'public', 'staging',
      'A full-redirection compatibility and provider replay rollback-only baseline.'
    ), 10000
  );
  offer_100_id := (result->>'id')::uuid;
  result := public.join_direct_donation_upgrade_offer(replay_matcher_id, offer_100_id, matcher_version, 'staging');
  offer_100_candidate_id := (result->>'id')::uuid;
  if not exists (
    select 1 from public.direct_donation_upgrade_offers
    where id = offer_100_id
      and redirect_basis_points = 10000
      and redirected_amount_cents = 1000
      and retained_amount_cents = 0
  ) or (select count(*) from public.direct_donation_upgrade_obligations where offer_id = offer_100_id) <> 2
     or exists (select 1 from public.direct_donation_upgrade_obligations
                where offer_id = offer_100_id and obligation_kind = 'creator_retained') then
    raise exception 'A 100%% redirect did not preserve the original two-obligation behavior.';
  end if;
  select id into offer_100_matcher_obligation_id
  from public.direct_donation_upgrade_obligations
  where candidate_id = offer_100_candidate_id and obligation_kind = 'matcher_incremental';

  result := public.complete_direct_donation_upgrade_obligation(
    offer_100_matcher_obligation_id, true, '', '', repeat('4', 64), repeat('5', 64),
    700, 665, 'USD', 'partial-qa-upgraded', '222222222',
    timezone('utc', now()) + interval '1 day', 'rollback-test', 'staging'
  );
  replay_result := public.complete_direct_donation_upgrade_obligation(
    offer_100_matcher_obligation_id, true, '', '', repeat('4', 64), repeat('5', 64),
    700, 665, 'USD', 'partial-qa-upgraded', '222222222',
    timezone('utc', now()) + interval '1 day', 'rollback-test', 'staging'
  );
  if result->>'outcome' <> 'verified'
     or replay_result->>'outcome' <> 'already_verified'
     or (select count(*) from public.direct_donation_upgrade_impact_credits
         where obligation_id = offer_100_matcher_obligation_id) <> 1 then
    raise exception 'Identical provider replay was not idempotent: %, %', result, replay_result;
  end if;
  altered_result := public.complete_direct_donation_upgrade_obligation(
    offer_100_matcher_obligation_id, true, '', '', repeat('4', 64), repeat('5', 64),
    700, 664, 'USD', 'partial-qa-upgraded', '222222222',
    timezone('utc', now()) + interval '1 day', 'rollback-test', 'staging'
  );
  if altered_result->>'outcome' <> 'needs_review'
     or altered_result->>'reason' <> 'altered_replay'
     or not exists (select 1 from public.direct_donation_upgrade_offers
                    where id = offer_100_id and status = 'needs_review'
                      and failure_code = 'altered_replay')
     or (select count(*) from public.direct_donation_upgrade_impact_credits
         where obligation_id = offer_100_matcher_obligation_id) <> 1 then
    raise exception 'Altered provider replay did not fail closed without duplicate credit: %', altered_result;
  end if;

  result := public.create_direct_donation_upgrade_offer(
    creator_id, 'staging', 1000, 750,
    match_deadline,
    'public', original_recipient, upgraded_recipient,
    baseline_version,
    'A separate cross-obligation provider-charge reuse rollback-only baseline.',
    public.direct_donation_upgrade_terms_hash_v2(
      creator_id, 1000, 10000, 750, repeat('1', 64), repeat('2', 64),
      match_deadline, 'public', 'staging',
      'A separate cross-obligation provider-charge reuse rollback-only baseline.'
    ), 10000
  );
  cross_offer_id := (result->>'id')::uuid;
  result := public.join_direct_donation_upgrade_offer(proposer_b_id, cross_offer_id, matcher_version, 'staging');
  cross_candidate_id := (result->>'id')::uuid;
  select id into cross_obligation_id from public.direct_donation_upgrade_obligations
    where candidate_id = cross_candidate_id and obligation_kind = 'matcher_incremental';
  cross_reuse_result := public.complete_direct_donation_upgrade_obligation(
    cross_obligation_id, true, '', '', repeat('4', 64), repeat('7', 64),
    750, 710, 'USD', 'partial-qa-upgraded', '222222222',
    timezone('utc', now()) + interval '1 day', 'rollback-test', 'staging'
  );
  if cross_reuse_result->>'outcome' <> 'needs_review'
     or cross_reuse_result->>'reason' <> 'provider_charge_reused'
     or exists (select 1 from public.direct_donation_upgrade_impact_credits
                where obligation_id = cross_obligation_id)
     or (select count(*) from public.direct_donation_upgrade_obligations
         where provider_charge_id_hash = repeat('4', 64)) <> 1
     or (select count(*) from public.direct_donation_upgrade_impact_credits
         where provider_charge_id_hash = repeat('4', 64)) <> 1 then
    raise exception 'One provider charge could satisfy more than one obligation: %', cross_reuse_result;
  end if;

  -- Binding counteroffer lifecycle and immutable revision acceptance.
  result := public.create_direct_donation_upgrade_offer(
    negotiation_creator_id, 'staging', 1000, 500,
    match_deadline,
    'public', original_recipient, upgraded_recipient,
    baseline_version,
    'A negotiation-specific full no-match baseline frozen before this rollback-only test.',
    public.direct_donation_upgrade_terms_hash_v2(
      negotiation_creator_id, 1000, 2000, 500, repeat('1', 64), repeat('2', 64),
      match_deadline, 'public', 'staging',
      'A negotiation-specific full no-match baseline frozen before this rollback-only test.'
    ), 2000
  );
  negotiation_offer_id := (result->>'id')::uuid;
  blocked := false;
  begin
    perform public.propose_direct_donation_upgrade_terms(
      proposer_a_id, negotiation_offer_id, 3000, 300, 700, 650,
      'This cross-environment proposal must fail.', proposal_version, 'live'
    );
  exception when others then
    blocked := position('different environment' in lower(sqlerrm)) > 0;
  end;
  if not blocked
     or exists (
       select 1 from public.direct_donation_upgrade_proposals
       where offer_id = negotiation_offer_id and proposer_profile_id = proposer_a_id
     ) then
    raise exception 'Counteroffer creation did not fail closed before mutation on an environment mismatch.';
  end if;
  result := public.propose_direct_donation_upgrade_terms(
    proposer_a_id, negotiation_offer_id, 3000, 300, 700, 650,
    'Please consider a 30% redirect.', proposal_version, 'staging'
  );
  withdrawn_proposal_id := (result->>'id')::uuid;

  blocked := false;
  begin
    perform public.propose_direct_donation_upgrade_terms(
      proposer_a_id, negotiation_offer_id, 3500, 350, 650, 675,
      'This duplicate pending proposal must be rejected.', proposal_version, 'staging'
    );
  exception when others then
    blocked := position('withdraw your pending counteroffer' in lower(sqlerrm)) > 0
      or position('duplicate key' in lower(sqlerrm)) > 0;
  end;
  if not blocked then
    raise exception 'A proposer could create two pending counteroffers for one offer.';
  end if;
  blocked := false;
  begin
    perform public.withdraw_direct_donation_upgrade_proposal(
      proposer_a_id,
      withdrawn_proposal_id,
      'live'
    );
  exception when others then
    blocked := position('different environment' in lower(sqlerrm)) > 0;
  end;
  if not blocked
     or (select status from public.direct_donation_upgrade_proposals where id = withdrawn_proposal_id) <> 'pending' then
    raise exception 'Counteroffer withdrawal did not fail closed before mutation on an environment mismatch.';
  end if;
  result := public.withdraw_direct_donation_upgrade_proposal(
    proposer_a_id,
    withdrawn_proposal_id,
    'staging'
  );
  if result->>'status' <> 'withdrawn' then
    raise exception 'The proposer could not withdraw a pending counteroffer.';
  end if;

  result := public.propose_direct_donation_upgrade_terms(
    proposer_a_id, negotiation_offer_id, 2500, 250, 750, 675,
    'Revised to a 25% redirect.', proposal_version, 'staging'
  );
  rejected_proposal_id := (result->>'id')::uuid;
  blocked := false;
  begin
    perform public.reject_direct_donation_upgrade_proposal(
      negotiation_creator_id,
      rejected_proposal_id,
      'This cross-environment rejection must fail.',
      'live'
    );
  exception when others then
    blocked := position('different environment' in lower(sqlerrm)) > 0;
  end;
  if not blocked
     or (select status from public.direct_donation_upgrade_proposals where id = rejected_proposal_id) <> 'pending' then
    raise exception 'Counteroffer rejection did not fail closed before mutation on an environment mismatch.';
  end if;
  result := public.reject_direct_donation_upgrade_proposal(
    negotiation_creator_id,
    rejected_proposal_id,
    'Please keep more with the original recipient.',
    'staging'
  );
  if result->>'status' <> 'rejected'
     or result->>'response_message' <> 'Please keep more with the original recipient.'
     or result->>'responded_at' is null then
    raise exception 'Creator rejection did not retain its short response.';
  end if;

  result := public.propose_direct_donation_upgrade_terms(
    proposer_a_id, negotiation_offer_id, 4000, 400, 600, 900,
    'Binding 40% redirect and $9 matcher commitment.', proposal_version, 'staging'
  );
  accepted_proposal_id := (result->>'id')::uuid;
  accepted_commitment_at := (result->>'commitment_accepted_at')::timestamptz;
  result := public.propose_direct_donation_upgrade_terms(
    proposer_b_id, negotiation_offer_id, 5000, 500, 500, 1000,
    'Alternative pending proposal that must become superseded.', proposal_version, 'staging'
  );
  superseded_proposal_id := (result->>'id')::uuid;

  accepted_terms_hash := public.direct_donation_upgrade_terms_hash_v2(
    negotiation_creator_id,
    1000,
    4000,
    900,
    repeat('1', 64),
    repeat('2', 64),
    match_deadline,
    'public',
    'staging',
    'A negotiation-specific full no-match baseline frozen before this rollback-only test.'
  );
  superseded_terms_hash := public.direct_donation_upgrade_terms_hash_v2(
    negotiation_creator_id,
    1000,
    5000,
    1000,
    repeat('1', 64),
    repeat('2', 64),
    match_deadline,
    'public',
    'staging',
    'A negotiation-specific full no-match baseline frozen before this rollback-only test.'
  );
  blocked := false;
  begin
    perform public.accept_direct_donation_upgrade_proposal(
      negotiation_creator_id, accepted_proposal_id, accepted_terms_hash, 'live'
    );
  exception when others then
    blocked := position('different environment' in lower(sqlerrm)) > 0;
  end;
  if not blocked
     or exists (
       select 1 from public.direct_donation_upgrade_offers
       where supersedes_offer_id = negotiation_offer_id
     ) then
    raise exception 'Counteroffer acceptance did not fail closed before mutation on an environment mismatch.';
  end if;
  blocked := false;
  begin
    perform public.accept_direct_donation_upgrade_proposal(
      negotiation_creator_id, accepted_proposal_id, superseded_terms_hash, 'staging'
    );
  exception when others then
    blocked := position('does not match the exact proposed terms' in lower(sqlerrm)) > 0;
  end;
  if not blocked
     or exists (select 1 from public.direct_donation_upgrade_offers
                where supersedes_offer_id = negotiation_offer_id) then
    raise exception 'An acceptance with a caller-supplied mismatched revision hash did not fail closed.';
  end if;

  result := public.accept_direct_donation_upgrade_proposal(
    negotiation_creator_id, accepted_proposal_id, accepted_terms_hash, 'staging'
  );
  accepted_revision_id := (result->'offer'->>'id')::uuid;
  accepted_candidate_id := (result->'candidate'->>'id')::uuid;
  if accepted_revision_id is null or accepted_candidate_id is null then
    raise exception 'Counteroffer acceptance did not return the matched revision and primary candidate: %', result;
  end if;
  if not exists (
    select 1 from public.direct_donation_upgrade_offers
    where id = negotiation_offer_id
      and status = 'cancelled'
      and superseded_by_offer_id = accepted_revision_id
      and cancellation_reason = 'Superseded by an accepted counteroffer.'
  ) or not exists (
    select 1 from public.direct_donation_upgrade_offers
    where id = accepted_revision_id
      and status = 'matched'
      and selected_branch = 'matched'
      and supersedes_offer_id = negotiation_offer_id
      and winning_candidate_id = accepted_candidate_id
      and creator_amount_cents = 1000
      and redirect_basis_points = 4000
      and redirected_amount_cents = 400
      and retained_amount_cents = 600
      and matcher_amount_cents = 900
      and terms_hash = accepted_terms_hash
      and original_recipient_hash = repeat('1', 64)
      and upgraded_recipient_hash = repeat('2', 64)
  ) then
    raise exception 'Accepted counteroffer revision links or immutable terms are incorrect.';
  end if;
  if not exists (
    select 1 from public.direct_donation_upgrade_proposals
    where id = accepted_proposal_id
      and status = 'accepted'
      and accepted_offer_id = accepted_revision_id
      and responded_at is not null
  ) or not exists (
    select 1 from public.direct_donation_upgrade_proposals
    where id = superseded_proposal_id
      and status = 'superseded'
      and accepted_offer_id is null
      and responded_at is not null
  ) then
    raise exception 'Accepted and unaccepted pending proposal states are incorrect.';
  end if;
  if not exists (
    select 1 from public.direct_donation_upgrade_candidates
    where id = accepted_candidate_id
      and offer_id = accepted_revision_id
      and profile_id = proposer_a_id
      and rank = 1
      and status = 'primary'
      and commitment_version = proposal_version
      and commitment_accepted_at = accepted_commitment_at
  ) then
    raise exception 'Acceptance did not preserve the proposer commitment version and timestamp.';
  end if;
  if (select count(*) from public.direct_donation_upgrade_obligations where offer_id = accepted_revision_id) <> 3
     or not exists (select 1 from public.direct_donation_upgrade_obligations
                    where offer_id = accepted_revision_id and obligation_kind = 'creator_retained'
                      and expected_amount_cents = 600 and expected_recipient_hash = repeat('1', 64))
     or not exists (select 1 from public.direct_donation_upgrade_obligations
                    where offer_id = accepted_revision_id and obligation_kind = 'creator_redirected'
                      and expected_amount_cents = 400 and expected_recipient_hash = repeat('2', 64))
     or not exists (select 1 from public.direct_donation_upgrade_obligations
                    where offer_id = accepted_revision_id and obligation_kind = 'matcher_incremental'
                      and expected_amount_cents = 900 and expected_recipient_hash = repeat('2', 64)) then
    raise exception 'Accepted revision obligations do not exactly match the proposal.';
  end if;

  blocked := false;
  begin
    update public.direct_donation_upgrade_offers
    set creator_amount_cents = 1100
    where id = negotiation_offer_id;
  exception when others then
    blocked := position('immutable' in lower(sqlerrm)) > 0;
  end;
  if not blocked then raise exception 'The superseded offer terms were mutable.'; end if;

  blocked := false;
  begin
    update public.direct_donation_upgrade_offers
    set matcher_amount_cents = 901
    where id = accepted_revision_id;
  exception when others then
    blocked := position('immutable' in lower(sqlerrm)) > 0;
  end;
  if not blocked then raise exception 'The accepted revision terms were mutable.'; end if;

  blocked := false;
  begin
    update public.direct_donation_upgrade_proposals
    set message = 'Rewritten after acceptance'
    where id = accepted_proposal_id;
  exception when others then
    blocked := position('immutable' in lower(sqlerrm)) > 0;
  end;
  if not blocked then raise exception 'Accepted proposal terms were mutable.'; end if;

  blocked := false;
  begin
    perform public.accept_direct_donation_upgrade_proposal(
      negotiation_creator_id, superseded_proposal_id, superseded_terms_hash, 'staging'
    );
  exception when others then
    blocked := position('no longer open' in lower(sqlerrm)) > 0
      or position('pending counteroffer not found' in lower(sqlerrm)) > 0;
  end;
  if not blocked
     or (select count(*) from public.direct_donation_upgrade_offers
         where supersedes_offer_id = negotiation_offer_id) <> 1
     or (select count(*) from public.direct_donation_upgrade_proposals
         where offer_id = negotiation_offer_id and status = 'accepted') <> 1 then
    raise exception 'More than one accepted revision could be created for the same offer.';
  end if;

  result := public.create_direct_donation_upgrade_offer(
    negotiation_creator_id, 'staging', 1000, 500,
    match_deadline,
    'public', original_recipient, upgraded_recipient,
    baseline_version,
    'A separate cancellation baseline used only to verify pending proposal expiry.',
    public.direct_donation_upgrade_terms_hash_v2(
      negotiation_creator_id, 1000, 2000, 500, repeat('1', 64), repeat('2', 64),
      match_deadline, 'public', 'staging',
      'A separate cancellation baseline used only to verify pending proposal expiry.'
    ), 2000
  );
  cancelled_offer_id := (result->>'id')::uuid;
  result := public.propose_direct_donation_upgrade_terms(
    proposer_a_id, cancelled_offer_id, 3000, 300, 700, 650,
    'This pending proposal must expire when its base offer is cancelled.', proposal_version, 'staging'
  );
  cancelled_proposal_id := (result->>'id')::uuid;
  if not exists (
    select 1 from public.direct_donation_upgrade_public_offers
    where id = cancelled_offer_id and proposal_count = 0
  ) then
    raise exception 'The public offer view leaked private negotiation activity.';
  end if;
  blocked := false;
  begin
    perform public.cancel_direct_donation_upgrade_offer(
      negotiation_creator_id,
      cancelled_offer_id,
      'live'
    );
  exception when others then
    blocked := position('different environment' in lower(sqlerrm)) > 0;
  end;
  if not blocked
     or (select status from public.direct_donation_upgrade_offers where id = cancelled_offer_id) <> 'open'
     or (select status from public.direct_donation_upgrade_proposals where id = cancelled_proposal_id) <> 'pending' then
    raise exception 'Offer cancellation did not fail closed before mutation on an environment mismatch.';
  end if;
  result := public.cancel_direct_donation_upgrade_offer(
    negotiation_creator_id,
    cancelled_offer_id,
    'staging'
  );
  if result->>'status' <> 'cancelled'
     or not exists (select 1 from public.direct_donation_upgrade_proposals
                    where id = cancelled_proposal_id
                      and status = 'expired'
                      and responded_at is not null) then
    raise exception 'Cancelling an open offer did not expire its pending proposal.';
  end if;

  -- Privacy, RLS, search-path, and service-only mutation boundaries.
  if not exists (
    select 1 from pg_class
    where oid = 'public.direct_donation_upgrade_proposals'::regclass
      and relrowsecurity
  ) then
    raise exception 'Proposal RLS is not enabled.';
  end if;
  if has_table_privilege('anon', 'public.direct_donation_upgrade_proposals', 'select')
     or has_table_privilege('authenticated', 'public.direct_donation_upgrade_proposals', 'select')
     or exists (
       select 1 from information_schema.table_privileges
       where table_schema = 'public'
         and table_name = 'direct_donation_upgrade_proposals'
         and grantee = 'PUBLIC'
         and privilege_type = 'SELECT'
     ) then
    raise exception 'Private counteroffers are directly readable by a public user role.';
  end if;
  select count(*) into missing_table_reads
  from unnest(array[
    'public.direct_donation_upgrade_offers',
    'public.direct_donation_upgrade_candidates',
    'public.direct_donation_upgrade_obligations',
    'public.direct_donation_upgrade_impact_credits',
    'public.direct_donation_upgrade_audit_events',
    'public.direct_donation_upgrade_proposals'
  ]) as relation(value)
  where not has_table_privilege('service_role', relation.value, 'select');
  select count(*) into forbidden_table_mutations
  from information_schema.table_privileges
  where table_schema = 'public'
    and table_name in (
      'direct_donation_upgrade_offers',
      'direct_donation_upgrade_candidates',
      'direct_donation_upgrade_obligations',
      'direct_donation_upgrade_impact_credits',
      'direct_donation_upgrade_audit_events',
      'direct_donation_upgrade_proposals'
    )
    and grantee in ('PUBLIC', 'anon', 'authenticated', 'service_role')
    and privilege_type <> 'SELECT';
  if missing_table_reads <> 0 or forbidden_table_mutations <> 0 then
    raise exception 'Donation Upgrade state/evidence tables are not service-readable and owner-only for mutation.';
  end if;

  select count(*) into forbidden_privileges
  from information_schema.routine_privileges
  where routine_schema = 'public'
    and routine_name in (
      'create_direct_donation_upgrade_offer',
      'join_direct_donation_upgrade_offer',
      'withdraw_direct_donation_upgrade_backup',
      'cancel_direct_donation_upgrade_offer',
      'start_direct_donation_upgrade_checkout',
      'complete_direct_donation_upgrade_obligation',
      'direct_donation_upgrade_complete_obligation_20260801',
      'run_direct_donation_upgrade_lifecycle',
      'propose_direct_donation_upgrade_terms',
      'withdraw_direct_donation_upgrade_proposal',
      'reject_direct_donation_upgrade_proposal',
      'accept_direct_donation_upgrade_proposal'
    )
    and grantee in ('PUBLIC', 'anon', 'authenticated');
  if forbidden_privileges <> 0 then
    raise exception 'A counteroffer RPC is executable by a public user role; the complete mutating RPC set must remain service-only.';
  end if;

  select count(*) into insecure_definers
  from pg_proc procedure
  join pg_namespace namespace on namespace.oid = procedure.pronamespace
  where namespace.nspname = 'public'
    and procedure.proname in (
      'create_direct_donation_upgrade_offer',
      'join_direct_donation_upgrade_offer',
      'withdraw_direct_donation_upgrade_backup',
      'cancel_direct_donation_upgrade_offer',
      'start_direct_donation_upgrade_checkout',
      'complete_direct_donation_upgrade_obligation',
      'run_direct_donation_upgrade_lifecycle',
      'propose_direct_donation_upgrade_terms',
      'withdraw_direct_donation_upgrade_proposal',
      'reject_direct_donation_upgrade_proposal',
      'accept_direct_donation_upgrade_proposal'
    )
    and (
      not procedure.prosecdef
      or not coalesce(procedure.proconfig, array[]::text[]) @> array['search_path=pg_catalog']::text[]
    );
  if insecure_definers <> 0 then
    raise exception 'A mutating security-definer RPC lacks the exact safe search_path.';
  end if;

  select count(*) into old_service_privileges
  from unnest(array[
    'public.create_direct_donation_upgrade_offer(uuid,text,integer,integer,timestamptz,text,jsonb,jsonb,text,text,text)',
    'public.join_direct_donation_upgrade_offer(uuid,uuid,text)',
    'public.withdraw_direct_donation_upgrade_backup(uuid,uuid)',
    'public.cancel_direct_donation_upgrade_offer(uuid,uuid)',
    'public.start_direct_donation_upgrade_checkout(uuid,uuid)',
    'public.complete_direct_donation_upgrade_obligation(uuid,boolean,text,text,text,text,integer,integer,text,text,text,timestamptz,text)',
    'public.run_direct_donation_upgrade_lifecycle(timestamptz)',
    'public.propose_direct_donation_upgrade_terms(uuid,uuid,integer,integer,integer,integer,text,text)',
    'public.withdraw_direct_donation_upgrade_proposal(uuid,uuid)',
    'public.reject_direct_donation_upgrade_proposal(uuid,uuid,text)',
    'public.accept_direct_donation_upgrade_proposal(uuid,uuid,text)'
  ]) as signature(value)
  where to_regprocedure(signature.value) is not null
    and has_function_privilege(
      'service_role',
      to_regprocedure(signature.value),
      'execute'
    );
  if old_service_privileges <> 0
     or has_function_privilege(
       'service_role',
       'public.direct_donation_upgrade_complete_obligation_20260801(uuid,boolean,text,text,text,text,integer,integer,text,text,text,timestamptz,text)',
       'execute'
     ) then
    raise exception 'An environment-unbound or internal Donation Upgrade RPC remains executable by service_role.';
  end if;

  select count(*) into missing_service_privileges
  from unnest(array[
    'public.create_direct_donation_upgrade_offer(uuid,text,integer,integer,timestamptz,text,jsonb,jsonb,text,text,text,integer)',
    'public.join_direct_donation_upgrade_offer(uuid,uuid,text,text)',
    'public.withdraw_direct_donation_upgrade_backup(uuid,uuid,text)',
    'public.cancel_direct_donation_upgrade_offer(uuid,uuid,text)',
    'public.start_direct_donation_upgrade_checkout(uuid,uuid,text)',
    'public.complete_direct_donation_upgrade_obligation(uuid,boolean,text,text,text,text,integer,integer,text,text,text,timestamptz,text,text)',
    'public.run_direct_donation_upgrade_lifecycle(timestamptz,text)',
    'public.propose_direct_donation_upgrade_terms(uuid,uuid,integer,integer,integer,integer,text,text,text)',
    'public.withdraw_direct_donation_upgrade_proposal(uuid,uuid,text)',
    'public.reject_direct_donation_upgrade_proposal(uuid,uuid,text,text)',
    'public.accept_direct_donation_upgrade_proposal(uuid,uuid,text,text)'
  ]) as signature(value)
  where to_regprocedure(signature.value) is null
     or not coalesce(
       has_function_privilege(
         'service_role',
         to_regprocedure(signature.value),
         'execute'
       ),
       false
     );
  if missing_service_privileges <> 0 then
    raise exception 'The service role lacks a required mutation grant.';
  end if;
end;
$test$;

-- Force the deferred two-way revision-provenance constraint before rollback.
set constraints direct_donation_upgrade_revision_links_consistent immediate;

rollback;

-- Prove that rollback removed every fixture-bearing entity, including evidence
-- and participant side effects outside the Donation Upgrade tables.
do $residue$
declare
  fixture_ids uuid[] := array[
    'db110000-0000-4000-8000-000000000001'::uuid,
    'db110000-0000-4000-8000-000000000002'::uuid,
    'db110000-0000-4000-8000-000000000003'::uuid,
    'db110000-0000-4000-8000-000000000004'::uuid,
    'db110000-0000-4000-8000-000000000005'::uuid,
    'db110000-0000-4000-8000-000000000006'::uuid,
    'db110000-0000-4000-8000-000000000007'::uuid,
    'db110000-0000-4000-8000-000000000008'::uuid,
    'db110000-0000-4000-8000-000000000009'::uuid,
    'db110000-0000-4000-8000-00000000000a'::uuid,
    'db110000-0000-4000-8000-00000000000b'::uuid
  ];
begin
  if exists (select 1 from auth.users where id = any(fixture_ids))
     or exists (select 1 from public.profiles where id = any(fixture_ids))
     or exists (select 1 from public.direct_donation_upgrade_offers where creator_profile_id = any(fixture_ids))
     or exists (select 1 from public.direct_donation_upgrade_proposals where proposer_profile_id = any(fixture_ids))
     or exists (select 1 from public.direct_donation_upgrade_candidates where profile_id = any(fixture_ids))
     or exists (select 1 from public.direct_donation_upgrade_obligations where participant_profile_id = any(fixture_ids))
     or exists (select 1 from public.direct_donation_upgrade_impact_credits where profile_id = any(fixture_ids))
     or exists (select 1 from public.trade_notifications where user_id = any(fixture_ids))
     or exists (select 1 from public.credibility_restrictions where profile_id = any(fixture_ids))
     or exists (select 1 from public.credibility_events where profile_id = any(fixture_ids))
     or exists (select 1 from public.direct_donation_upgrade_audit_events where actor_profile_id = any(fixture_ids)) then
    raise exception 'Rollback-only partial Donation Upgrade regression left persistent synthetic residue.';
  end if;
end;
$residue$;

select jsonb_build_object(
  'rollbackOnly', true,
  'syntheticResidue', 0,
  'providerCheckoutInvoked', false,
  'realDonationCreated', false
) as direct_donation_upgrade_partial_regression;
