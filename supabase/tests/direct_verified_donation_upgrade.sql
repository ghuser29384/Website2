begin;

insert into auth.users (
  id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, confirmation_token, recovery_token,
  email_change_token_new, email_change_token_current, reauthentication_token,
  is_sso_user, is_anonymous, created_at, updated_at
) values
  (
    'da111111-1111-4111-8111-111111111111',
    '00000000-0000-0000-0000-000000000000',
    'authenticated', 'authenticated', 'direct-upgrade-creator@example.test', '', now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"display_name":"Direct Upgrade Creator","qa_fixture":true}'::jsonb,
    '', '', '', '', '', false, false, now(), now()
  ),
  (
    'da222222-2222-4222-8222-222222222222',
    '00000000-0000-0000-0000-000000000000',
    'authenticated', 'authenticated', 'direct-upgrade-matcher@example.test', '', now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"display_name":"Direct Upgrade Matcher","qa_fixture":true}'::jsonb,
    '', '', '', '', '', false, false, now(), now()
  ),
  (
    'da333333-3333-4333-8333-333333333333',
    '00000000-0000-0000-0000-000000000000',
    'authenticated', 'authenticated', 'direct-upgrade-backup@example.test', '', now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"display_name":"Direct Upgrade Backup","qa_fixture":true}'::jsonb,
    '', '', '', '', '', false, false, now(), now()
  ),
  (
    'da444444-4444-4444-8444-444444444444',
    '00000000-0000-0000-0000-000000000000',
    'authenticated', 'authenticated', 'direct-upgrade-second-creator@example.test', '', now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{"display_name":"Direct Upgrade Second Creator","qa_fixture":true}'::jsonb,
    '', '', '', '', '', false, false, now(), now()
  );

insert into public.profiles (id, email, display_name, bio)
values
  ('da111111-1111-4111-8111-111111111111', 'direct-upgrade-creator@example.test', 'Direct Upgrade Creator', ''),
  ('da222222-2222-4222-8222-222222222222', 'direct-upgrade-matcher@example.test', 'Direct Upgrade Matcher', ''),
  ('da333333-3333-4333-8333-333333333333', 'direct-upgrade-backup@example.test', 'Direct Upgrade Backup', ''),
  ('da444444-4444-4444-8444-444444444444', 'direct-upgrade-second-creator@example.test', 'Direct Upgrade Second Creator', '')
on conflict (id) do update set
  email = excluded.email,
  display_name = excluded.display_name;

do $test$
declare
  original_recipient jsonb := jsonb_build_object(
    'schemaVersion', 'moral-trade-every-org-nonprofit-identity-v1',
    'provider', 'every_org',
    'providerNonprofitId', '75924760-cd27-4ecc-a9d4-c0660c08961a',
    'name', 'Homeward Pet Adoption Center',
    'primarySlug', 'homewardpet',
    'ein', '911526803',
    'isDisbursable', true,
    'profileUrl', 'https://www.every.org/homewardpet',
    'websiteUrl', 'https://www.homewardpet.org',
    'locationAddress', 'WOODINVILLE, WA',
    'description', 'Rollback-only QA fixture.',
    'logoUrl', '',
    'identityHash', repeat('1', 64)
  );
  upgraded_recipient jsonb := jsonb_build_object(
    'schemaVersion', 'moral-trade-every-org-nonprofit-identity-v1',
    'provider', 'every_org',
    'providerNonprofitId', 'qa-givewell-top-charities-fund',
    'name', 'GiveWell Top Charities Fund',
    'primarySlug', 'givewell-top-charities-fund',
    'ein', '',
    'isDisbursable', true,
    'profileUrl', 'https://www.every.org/givewell-top-charities-fund',
    'websiteUrl', 'https://www.givewell.org/top-charities-fund',
    'locationAddress', 'United States',
    'description', 'Rollback-only QA fixture.',
    'logoUrl', '',
    'identityHash', repeat('2', 64)
  );
  offer_result jsonb;
  v_offer_id uuid;
  primary_result jsonb;
  primary_id uuid;
  backup_result jsonb;
  backup_id uuid;
  creator_obligation_id uuid;
  matcher_obligation_id uuid;
  lifecycle_result jsonb;
  same_recipient_blocked boolean := false;
  immutable_terms_blocked boolean := false;
  replay_offer_result jsonb;
  replay_offer_id uuid;
  replay_candidate_result jsonb;
  replay_candidate_id uuid;
  replay_matcher_obligation_id uuid;
  replay_first jsonb;
  replay_second jsonb;
  replay_altered jsonb;
  promotion_offer_result jsonb;
  promotion_offer_id uuid;
  promotion_primary_result jsonb;
  promotion_primary_id uuid;
  promotion_backup_result jsonb;
  promotion_backup_id uuid;
  promotion_creator_obligation_id uuid;
  promotion_matcher_obligation_id uuid;
  promoted_obligation_id uuid;
begin
  begin
    perform public.create_direct_donation_upgrade_offer(
      'da111111-1111-4111-8111-111111111111',
      'staging', 1000, 1000, timezone('utc', now()) + interval '7 days',
      'public', original_recipient, original_recipient,
      'direct-donation-upgrade-baseline-v1-2026-08-01',
      'This is a sufficiently detailed, frozen baseline attestation for rollback-only QA.',
      repeat('a', 64)
    );
  exception when others then
    same_recipient_blocked := position('must be different nonprofits' in sqlerrm) > 0;
  end;
  if not same_recipient_blocked then
    raise exception 'The same Every.org nonprofit was accepted for both branches.';
  end if;

  offer_result := public.create_direct_donation_upgrade_offer(
    'da111111-1111-4111-8111-111111111111',
    'staging', 1000, 1000, timezone('utc', now()) + interval '7 days',
    'private_until_completed', original_recipient, upgraded_recipient,
    'direct-donation-upgrade-baseline-v1-2026-08-01',
    'I had independently budgeted the original Homeward Pet donation before this QA offer.',
    repeat('b', 64)
  );
  v_offer_id := (offer_result->>'id')::uuid;

  primary_result := public.join_direct_donation_upgrade_offer(
    'da222222-2222-4222-8222-222222222222',
    v_offer_id,
    'direct-donation-upgrade-matcher-v1-2026-08-01'
  );
  primary_id := (primary_result->>'id')::uuid;
  backup_result := public.join_direct_donation_upgrade_offer(
    'da333333-3333-4333-8333-333333333333',
    v_offer_id,
    'direct-donation-upgrade-matcher-v1-2026-08-01'
  );
  backup_id := (backup_result->>'id')::uuid;

  if primary_result->>'status' <> 'primary' or backup_result->>'status' <> 'backup' then
    raise exception 'Primary/backup assignment failed: %, %', primary_result, backup_result;
  end if;

  select id into creator_obligation_id
  from public.direct_donation_upgrade_obligations
  where direct_donation_upgrade_obligations.offer_id = v_offer_id
    and participant_role = 'creator'
    and branch = 'matched';
  select id into matcher_obligation_id
  from public.direct_donation_upgrade_obligations
  where candidate_id = primary_id and participant_role = 'matcher';

  perform public.complete_direct_donation_upgrade_obligation(
    matcher_obligation_id, true, '', '', repeat('c', 64), repeat('d', 64),
    1000, 970, 'USD', 'givewell-top-charities-fund', '',
    timezone('utc', now()) + interval '1 day', 'card'
  );

  if not exists (
    select 1 from public.direct_donation_upgrade_candidates
    where id = primary_id and status = 'fulfilled'
  ) then
    raise exception 'Matcher-first verification did not mark the selected matcher fulfilled.';
  end if;
  if not exists (
    select 1 from public.direct_donation_upgrade_impact_credits
    where obligation_id = matcher_obligation_id
      and verified_gross_amount_cents = 1000
      and verified_net_amount_cents = 970
      and incremental_gross_amount_cents = 1000
      and incremental_net_amount_cents = 970
      and redirected_gross_amount_cents = 0
  ) then
    raise exception 'Matcher incremental impact credit was not recorded exactly.';
  end if;
  if exists (
    select 1 from public.direct_donation_upgrade_public_offers
    where id = v_offer_id and (creator_display_name is not null or matcher_display_name is not null)
  ) then
    raise exception 'Private participant identities were exposed before successful completion.';
  end if;

  begin
    update public.direct_donation_upgrade_offers
    set creator_amount_cents = 1100
    where id = v_offer_id;
  exception when others then
    immutable_terms_blocked := position('immutable' in lower(sqlerrm)) > 0;
  end;
  if not immutable_terms_blocked then
    raise exception 'Published Donation Upgrade terms were mutable.';
  end if;

  lifecycle_result := public.run_direct_donation_upgrade_lifecycle(
    timezone('utc', now()) + interval '9 days'
  );
  if not exists (
    select 1 from public.direct_donation_upgrade_offers
    where id = v_offer_id and status = 'defaulted' and failure_code = 'creator_matched_default'
  ) then
    raise exception 'Creator default after matcher-first verification did not terminate the offer correctly: %', lifecycle_result;
  end if;
  if not exists (
    select 1 from public.direct_donation_upgrade_obligations
    where id = creator_obligation_id and status = 'defaulted'
  ) then
    raise exception 'Creator obligation did not default.';
  end if;
  if not exists (
    select 1 from public.direct_donation_upgrade_obligations
    where id = matcher_obligation_id and status = 'verified'
  ) then
    raise exception 'Verified matcher obligation was not preserved.';
  end if;
  if not exists (
    select 1 from public.direct_donation_upgrade_candidates
    where id = primary_id and status = 'fulfilled'
  ) then
    raise exception 'Fulfilled matcher was overwritten after creator default.';
  end if;
  if not exists (
    select 1 from public.direct_donation_upgrade_candidates
    where id = backup_id and status = 'closed'
  ) then
    raise exception 'Backup candidates were not closed after creator default.';
  end if;
  if not exists (
    select 1 from public.credibility_restrictions
    where profile_id = 'da111111-1111-4111-8111-111111111111'
      and reason_code = 'direct_donation_upgrade_default'
      and status = 'active'
  ) then
    raise exception 'Creator default did not create the temporary restriction.';
  end if;
  if exists (
    select 1 from public.credibility_restrictions
    where profile_id = 'da222222-2222-4222-8222-222222222222'
      and reason_code = 'direct_donation_upgrade_default'
      and status = 'active'
  ) then
    raise exception 'Fulfilled matcher incorrectly received a default restriction.';
  end if;
  if exists (
    select 1 from public.direct_donation_upgrade_public_offers
    where id = v_offer_id and (creator_display_name is not null or matcher_display_name is not null)
  ) then
    raise exception 'Private identities were exposed after default rather than completion.';
  end if;

  -- Exact replay is idempotent; altered replay freezes the offer for review.
  replay_offer_result := public.create_direct_donation_upgrade_offer(
    'da444444-4444-4444-8444-444444444444',
    'staging', 1000, 1000, timezone('utc', now()) + interval '7 days',
    'public', original_recipient, upgraded_recipient,
    'direct-donation-upgrade-baseline-v1-2026-08-01',
    'A separate exact replay test with a pre-existing original donation baseline.',
    repeat('e', 64)
  );
  replay_offer_id := (replay_offer_result->>'id')::uuid;
  replay_candidate_result := public.join_direct_donation_upgrade_offer(
    'da333333-3333-4333-8333-333333333333', replay_offer_id,
    'direct-donation-upgrade-matcher-v1-2026-08-01'
  );
  replay_candidate_id := (replay_candidate_result->>'id')::uuid;
  select id into replay_matcher_obligation_id
  from public.direct_donation_upgrade_obligations
  where candidate_id = replay_candidate_id and participant_role = 'matcher';

  replay_first := public.complete_direct_donation_upgrade_obligation(
    replay_matcher_obligation_id, true, '', '', repeat('3', 64), repeat('4', 64),
    1000, 965, 'USD', 'givewell-top-charities-fund', '',
    timezone('utc', now()) + interval '1 day', 'bank'
  );
  replay_second := public.complete_direct_donation_upgrade_obligation(
    replay_matcher_obligation_id, true, '', '', repeat('3', 64), repeat('4', 64),
    1000, 965, 'USD', 'givewell-top-charities-fund', '',
    timezone('utc', now()) + interval '1 day', 'bank'
  );
  if replay_second->>'outcome' <> 'already_verified' then
    raise exception 'Identical replay was not idempotent: %', replay_second;
  end if;
  replay_altered := public.complete_direct_donation_upgrade_obligation(
    replay_matcher_obligation_id, true, '', '', repeat('3', 64), repeat('5', 64),
    1000, 965, 'USD', 'givewell-top-charities-fund', '',
    timezone('utc', now()) + interval '1 day', 'bank'
  );
  if replay_altered->>'outcome' <> 'needs_review'
     or not exists (
       select 1 from public.direct_donation_upgrade_offers
       where id = replay_offer_id and status = 'needs_review' and failure_code = 'altered_replay'
     ) then
    raise exception 'Altered replay did not freeze the offer for review: %', replay_altered;
  end if;

  -- Creator verifies first, primary defaults, and the first backup is promoted.
  promotion_offer_result := public.create_direct_donation_upgrade_offer(
    'da444444-4444-4444-8444-444444444444',
    'staging', 1000, 1000, timezone('utc', now()) + interval '7 days',
    'public', original_recipient, upgraded_recipient,
    'direct-donation-upgrade-baseline-v1-2026-08-01',
    'A separate backup-promotion test with a pre-existing original donation baseline.',
    repeat('6', 64)
  );
  promotion_offer_id := (promotion_offer_result->>'id')::uuid;
  promotion_primary_result := public.join_direct_donation_upgrade_offer(
    'da333333-3333-4333-8333-333333333333', promotion_offer_id,
    'direct-donation-upgrade-matcher-v1-2026-08-01'
  );
  promotion_primary_id := (promotion_primary_result->>'id')::uuid;
  promotion_backup_result := public.join_direct_donation_upgrade_offer(
    'da222222-2222-4222-8222-222222222222', promotion_offer_id,
    'direct-donation-upgrade-matcher-v1-2026-08-01'
  );
  promotion_backup_id := (promotion_backup_result->>'id')::uuid;
  select id into promotion_creator_obligation_id
  from public.direct_donation_upgrade_obligations
  where offer_id = promotion_offer_id and participant_role = 'creator' and branch = 'matched';
  select id into promotion_matcher_obligation_id
  from public.direct_donation_upgrade_obligations
  where candidate_id = promotion_primary_id and participant_role = 'matcher';

  perform public.complete_direct_donation_upgrade_obligation(
    promotion_creator_obligation_id, true, '', '', repeat('7', 64), repeat('8', 64),
    1000, 960, 'USD', 'givewell-top-charities-fund', '',
    timezone('utc', now()) + interval '1 day', 'card'
  );
  perform public.run_direct_donation_upgrade_lifecycle(timezone('utc', now()) + interval '9 days');

  if not exists (
    select 1 from public.direct_donation_upgrade_candidates
    where id = promotion_primary_id and status = 'defaulted'
  ) then
    raise exception 'Unfulfilled primary matcher did not default.';
  end if;
  if not exists (
    select 1 from public.direct_donation_upgrade_candidates
    where id = promotion_backup_id and status = 'promoted'
  ) then
    raise exception 'First backup matcher was not promoted.';
  end if;
  select id into promoted_obligation_id
  from public.direct_donation_upgrade_obligations
  where candidate_id = promotion_backup_id and participant_role = 'matcher';
  if promoted_obligation_id is null then
    raise exception 'Promoted backup did not receive a new direct donation obligation.';
  end if;
  if not exists (
    select 1 from public.direct_donation_upgrade_obligations
    where id = promotion_creator_obligation_id and status = 'verified'
  ) then
    raise exception 'Creator verification was not preserved during backup promotion.';
  end if;
  if not exists (
    select 1 from public.direct_donation_upgrade_offers
    where id = promotion_offer_id and status = 'matched'
      and winning_candidate_id = promotion_backup_id
  ) then
    raise exception 'Offer did not remain matched to the promoted backup.';
  end if;
end;
$test$;

rollback;
