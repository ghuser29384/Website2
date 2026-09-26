begin;

insert into auth.users (
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
) values (
  'fb111111-1111-4111-8111-111111111111',
  'authenticated',
  'authenticated',
  'failure-bonus-reserve-owner@example.test',
  '',
  now(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{"display_name":"Failure Bonus Reserve Owner"}'::jsonb,
  now(),
  now()
);

insert into public.profiles (id, email, display_name, bio, affiliation)
values (
  'fb111111-1111-4111-8111-111111111111',
  'failure-bonus-reserve-owner@example.test',
  'Failure Bonus Reserve Owner',
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
  public_goods_threshold_amount_cents,
  public_goods_threshold_supporters,
  public_goods_failure_bonus_enabled,
  public_goods_failure_bonus_rate_bps,
  public_goods_failure_bonus_eligibility_json,
  public_goods_failure_bonus_max_participants,
  public_goods_failure_bonus_max_per_participant_cents,
  public_goods_threshold_schedule_json,
  public_goods_failure_bonus_schedule_status,
  public_goods_success_premium_rate_bps,
  public_goods_success_premium_cents,
  public_goods_success_premium_payer,
  public_goods_success_premium_policy_version,
  public_goods_success_premium_included_in_net_threshold,
  public_goods_success_premium_provisional,
  public_goods_gross_success_requirement_cents,
  public_goods_success_premium_pricing_json
) values (
  'fb222222-2222-4222-8222-222222222222',
  'fb111111-1111-4111-8111-111111111111',
  'Failure bonus premium QA pool',
  'Synthetic QA-only problem',
  'Synthetic QA-only intervention',
  'Synthetic QA-only public-good rationale',
  'Synthetic QA recipient',
  'Synthetic QA-only summary',
  'QA',
  1000000,
  'One verified QA outcome',
  'Synthetic QA effect',
  'Synthetic QA timeline',
  '[]'::jsonb,
  '[]'::jsonb,
  'None; transaction rolls back',
  'submitted',
  1000000,
  25,
  true,
  1000,
  '{
    "policyVersion":"mpgf_failure_bonus_eligibility_v0_1",
    "contributorIdentityRule":"verified_unique_person",
    "contributionTimingRule":"captured_before_deadline",
    "relatedPartyRule":"exclude_creator_and_related_parties",
    "paymentIntegrityRule":"exclude_duplicate_reversed_disputed_or_fraudulent",
    "bonusBasis":"eligible_contribution",
    "maxParticipants":100,
    "maxBonusPerParticipantCents":2500
  }'::jsonb,
  100,
  2500,
  '{
    "policyVersion":"mpgf_failure_bonus_success_premium_v0_1",
    "premiumPayer":"pool_creator_or_sponsor",
    "premiumIncludedInNetRecipientThreshold":false,
    "eligibilityPolicy":{
      "policyVersion":"mpgf_failure_bonus_eligibility_v0_1",
      "contributorIdentityRule":"verified_unique_person",
      "contributionTimingRule":"captured_before_deadline",
      "relatedPartyRule":"exclude_creator_and_related_parties",
      "paymentIntegrityRule":"exclude_duplicate_reversed_disputed_or_fraudulent",
      "bonusBasis":"eligible_contribution",
      "maxParticipants":100,
      "maxBonusPerParticipantCents":2500
    },
    "thresholds":[{
      "thresholdId":"failure-bonus-qa-threshold-1",
      "thresholdIndex":1,
      "cumulativeNetRecipientThresholdCents":1000000,
      "incrementalNetRecipientCents":1000000,
      "premiumRateBps":201,
      "successPremiumCents":20100,
      "cumulativeSuccessPremiumCents":20100,
      "grossSuccessRequirementCents":1020100,
      "premiumPayer":"pool_creator_or_sponsor",
      "premiumIncludedInNetRecipientThreshold":false,
      "pricingMode":"experience_rated",
      "provisional":true,
      "rationale":"Provisional threshold 1 experience-rated quote; operator approval remains required.",
      "assumptions":{
        "successProbabilityBps":7500,
        "failureBonusRateBps":1000,
        "expectedEligibleFailureFillBps":4000,
        "expenseLoadBps":25,
        "reserveRiskMarginBps":42
      },
      "incrementalFailureBonusExposureCents":100000,
      "maximumFailureBonusExposureCents":100000
    }]
  }'::jsonb,
  'pending_review',
  201,
  20100,
  'pool_creator_or_sponsor',
  'mpgf_failure_bonus_success_premium_v0_1',
  false,
  true,
  1020100,
  '{
    "successProbabilityBps": 7500,
    "failureBonusRateBps": 1000,
    "expectedEligibleFailureFillBps": 4000,
    "expenseLoadBps": 25,
    "reserveRiskMarginBps": 42
  }'::jsonb
);

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
  public_goods_threshold_amount_cents,
  public_goods_threshold_supporters
) values (
  'fb333333-3333-4333-8333-333333333333',
  'fb111111-1111-4111-8111-111111111111',
  'Second QA pool without exposure',
  'Synthetic second QA-only problem',
  'Synthetic second QA-only intervention',
  'Synthetic second QA-only public-good rationale',
  'Synthetic second QA recipient',
  'Synthetic second QA-only summary',
  'QA',
  1000000,
  'One verified QA outcome',
  'Synthetic QA effect',
  'Synthetic QA timeline',
  '[]'::jsonb,
  '[]'::jsonb,
  'None; transaction rolls back',
  'draft',
  1000000,
  25
);

do $test$
declare
  quote_count integer;
  quote_premium bigint;
  quote_gross bigint;
begin
  select count(*), max(success_premium_cents), max(gross_success_requirement_cents)
  into quote_count, quote_premium, quote_gross
  from public.mpgf_failure_bonus_premium_quotes
  where pool_proposal_id = 'fb222222-2222-4222-8222-222222222222'
    and status = 'pending_review';

  if quote_count <> 1 or quote_premium <> 20100 or quote_gross <> 1020100 then
    raise exception 'Proposal did not create the exact pending premium quote: count %, premium %, gross %',
      quote_count,
      quote_premium,
      quote_gross;
  end if;
end;
$test$;

do $test$
declare
  mismatch_blocked boolean := false;
begin
  begin
    update public.mpgf_pool_proposals
    set public_goods_success_premium_cents = 20000
    where id = 'fb222222-2222-4222-8222-222222222222';
  exception
    when check_violation then
      mismatch_blocked := true;
  end;

  if not mismatch_blocked then
    raise exception 'A premium amount inconsistent with the threshold and rate was accepted.';
  end if;
end;
$test$;


do $test$
declare
  contributor_payer_blocked boolean := false;
begin
  begin
    update public.mpgf_pool_proposals
    set public_goods_success_premium_payer = 'contributors_pro_rata'
    where id = 'fb222222-2222-4222-8222-222222222222';
  exception
    when check_violation then
      contributor_payer_blocked := true;
  end;

  if not contributor_payer_blocked then
    raise exception 'Contributor-funded success premiums were accepted by the v0.1 proposal policy.';
  end if;
end;
$test$;

update public.mpgf_failure_bonus_reserves
set status = 'funded', updated_at = timezone('utc', now())
where reserve_key = 'moral-trade-common-failure-bonus-usd';

insert into public.mpgf_failure_bonus_reserve_entries (
  reserve_id,
  event_type,
  cash_delta_cents,
  exposure_delta_cents,
  status,
  idempotency_key,
  source_ref_hash,
  event_hash,
  public_memo,
  approved_by,
  approved_at
)
select
  reserve.id,
  'anchor_capital_credit',
  100000,
  0,
  'posted',
  'qa:failure-bonus:anchor-capital',
  'sha256:' || repeat('a', 64),
  'sha256:' || repeat('b', 64),
  'Synthetic QA anchor capital',
  'fb111111-1111-4111-8111-111111111111',
  timezone('utc', now())
from public.mpgf_failure_bonus_reserves reserve
where reserve.reserve_key = 'moral-trade-common-failure-bonus-usd';

insert into public.mpgf_failure_bonus_reserve_entries (
  reserve_id,
  pool_proposal_id,
  threshold_index,
  event_type,
  cash_delta_cents,
  exposure_delta_cents,
  status,
  idempotency_key,
  source_ref_hash,
  event_hash,
  public_memo,
  approved_by,
  approved_at
)
select
  reserve.id,
  'fb222222-2222-4222-8222-222222222222',
  1,
  'bonus_exposure_allocation',
  0,
  50000,
  'posted',
  'qa:failure-bonus:exposure-allocation',
  'sha256:' || repeat('c', 64),
  'sha256:' || repeat('d', 64),
  'Synthetic QA exposure allocation',
  'fb111111-1111-4111-8111-111111111111',
  timezone('utc', now())
from public.mpgf_failure_bonus_reserves reserve
where reserve.reserve_key = 'moral-trade-common-failure-bonus-usd';

do $test$
declare
  overbooking_blocked boolean := false;
  reserve_id_value uuid;
begin
  select id into reserve_id_value
  from public.mpgf_failure_bonus_reserves
  where reserve_key = 'moral-trade-common-failure-bonus-usd';

  begin
    insert into public.mpgf_failure_bonus_reserve_entries (
      reserve_id,
      pool_proposal_id,
      threshold_index,
      event_type,
      cash_delta_cents,
      exposure_delta_cents,
      status,
      idempotency_key,
      source_ref_hash,
      event_hash,
      approved_by,
      approved_at
    ) values (
      reserve_id_value,
      'fb222222-2222-4222-8222-222222222222',
      1,
      'bonus_exposure_allocation',
      0,
      60000,
      'posted',
      'qa:failure-bonus:overbooking-attempt',
      'sha256:' || repeat('e', 64),
      'sha256:' || repeat('f', 64),
      'fb111111-1111-4111-8111-111111111111',
      timezone('utc', now())
    );
  exception
    when check_violation then
      overbooking_blocked := true;
  end;

  if not overbooking_blocked then
    raise exception 'Reserve overbooking was not blocked.';
  end if;
end;
$test$;

do $test$
declare
  partial_approval_blocked boolean := false;
begin
  begin
    update public.mpgf_failure_bonus_premium_quotes
    set
      status = 'approved',
      provisional = false,
      approved_by = 'fb111111-1111-4111-8111-111111111111',
      approved_at = timezone('utc', now())
    where pool_proposal_id = 'fb222222-2222-4222-8222-222222222222'
      and threshold_index = 1
      and status = 'pending_review';
  exception
    when insufficient_privilege then
      partial_approval_blocked := true;
  end;

  if not partial_approval_blocked then
    raise exception 'A threshold quote was approved outside the atomic schedule function.';
  end if;
end;
$test$;

select *
from public.mpgf_approve_failure_bonus_premium_schedule(
  'fb222222-2222-4222-8222-222222222222',
  'fb111111-1111-4111-8111-111111111111',
  'Synthetic QA operator approval of the complete schedule.'
);

do $test$
declare
  approved_quote_immutable boolean := false;
  approved_proposal_terms_frozen boolean := false;
begin
  begin
    update public.mpgf_failure_bonus_premium_quotes
    set rationale = 'Tampered approved quote'
    where pool_proposal_id = 'fb222222-2222-4222-8222-222222222222'
      and status = 'approved';
  exception
    when check_violation then
      approved_quote_immutable := true;
  end;

  begin
    update public.mpgf_pool_proposals
    set public_goods_success_premium_payer = 'contributors_pro_rata'
    where id = 'fb222222-2222-4222-8222-222222222222';
  exception
    when check_violation then
      approved_proposal_terms_frozen := true;
  end;

  if not approved_quote_immutable then
    raise exception 'An approved premium quote was mutable.';
  end if;

  if not approved_proposal_terms_frozen then
    raise exception 'Approved pool premium terms were mutable in place.';
  end if;
end;
$test$;

insert into public.mpgf_failure_bonus_reserve_entries (
  reserve_id,
  pool_proposal_id,
  premium_quote_id,
  threshold_index,
  event_type,
  cash_delta_cents,
  exposure_delta_cents,
  status,
  idempotency_key,
  source_ref_hash,
  event_hash,
  public_memo,
  approved_by,
  approved_at
)
select
  quote.reserve_id,
  quote.pool_proposal_id,
  quote.id,
  quote.threshold_index,
  'success_premium_credit',
  quote.success_premium_cents,
  0,
  'posted',
  'qa:failure-bonus:success-premium-credit',
  'sha256:' || repeat('1', 64),
  'sha256:' || repeat('2', 64),
  'Synthetic QA successful-pool premium',
  'fb111111-1111-4111-8111-111111111111',
  timezone('utc', now())
from public.mpgf_failure_bonus_premium_quotes quote
where quote.pool_proposal_id = 'fb222222-2222-4222-8222-222222222222'
  and quote.status = 'approved';

do $test$
declare
  cash_balance bigint;
  open_exposure bigint;
  available_backing bigint;
  premium_credits bigint;
  posted_immutable boolean := false;
begin
  select
    posted_cash_balance_cents,
    open_bonus_exposure_cents,
    available_backing_cents,
    success_premiums_credited_cents
  into cash_balance, open_exposure, available_backing, premium_credits
  from public.mpgf_failure_bonus_reserve_public_summary
  where reserve_key = 'moral-trade-common-failure-bonus-usd';

  if cash_balance <> 120100
     or open_exposure <> 50000
     or available_backing <> 70100
     or premium_credits <> 20100 then
    raise exception 'Unexpected reserve summary: cash %, exposure %, available %, premiums %',
      cash_balance,
      open_exposure,
      available_backing,
      premium_credits;
  end if;

  begin
    update public.mpgf_failure_bonus_reserve_entries
    set public_memo = 'Tampered'
    where idempotency_key = 'qa:failure-bonus:success-premium-credit';
  exception
    when check_violation then
      posted_immutable := true;
  end;

  if not posted_immutable then
    raise exception 'Posted reserve entry was mutable.';
  end if;
end;
$test$;

do $test$
declare
  reserve_id_value uuid;
  cross_pool_release_blocked boolean := false;
  malformed_debit_blocked boolean := false;
begin
  select id into reserve_id_value
  from public.mpgf_failure_bonus_reserves
  where reserve_key = 'moral-trade-common-failure-bonus-usd';

  begin
    insert into public.mpgf_failure_bonus_reserve_entries (
      reserve_id,
      pool_proposal_id,
      threshold_index,
      event_type,
      cash_delta_cents,
      exposure_delta_cents,
      status,
      idempotency_key,
      source_ref_hash,
      event_hash,
      approved_by,
      approved_at
    ) values (
      reserve_id_value,
      'fb333333-3333-4333-8333-333333333333',
      1,
      'bonus_exposure_release',
      0,
      -1000,
      'posted',
      'qa:failure-bonus:cross-pool-release-attempt',
      'sha256:' || repeat('3', 64),
      'sha256:' || repeat('4', 64),
      'fb111111-1111-4111-8111-111111111111',
      timezone('utc', now())
    );
  exception
    when check_violation then
      cross_pool_release_blocked := true;
  end;

  begin
    insert into public.mpgf_failure_bonus_reserve_entries (
      reserve_id,
      pool_proposal_id,
      threshold_index,
      event_type,
      cash_delta_cents,
      exposure_delta_cents,
      status,
      idempotency_key,
      source_ref_hash,
      event_hash,
      approved_by,
      approved_at
    ) values (
      reserve_id_value,
      'fb222222-2222-4222-8222-222222222222',
      1,
      'failure_bonus_debit',
      -1000,
      0,
      'posted',
      'qa:failure-bonus:malformed-debit-attempt',
      'sha256:' || repeat('5', 64),
      'sha256:' || repeat('6', 64),
      'fb111111-1111-4111-8111-111111111111',
      timezone('utc', now())
    );
  exception
    when check_violation then
      malformed_debit_blocked := true;
  end;

  if not cross_pool_release_blocked then
    raise exception 'A pool released another pool''s reserved bonus exposure.';
  end if;

  if not malformed_debit_blocked then
    raise exception 'A failure-bonus cash debit did not atomically release equal exposure.';
  end if;
end;
$test$;

insert into public.mpgf_failure_bonus_reserve_entries (
  reserve_id,
  pool_proposal_id,
  threshold_index,
  event_type,
  cash_delta_cents,
  exposure_delta_cents,
  status,
  idempotency_key,
  source_ref_hash,
  event_hash,
  public_memo,
  approved_by,
  approved_at
)
select
  reserve.id,
  'fb222222-2222-4222-8222-222222222222',
  1,
  'failure_bonus_debit',
  -20000,
  -20000,
  'posted',
  'qa:failure-bonus:atomic-failure-debit',
  'sha256:' || repeat('7', 64),
  'sha256:' || repeat('8', 64),
  'Synthetic QA failure payout and exposure release',
  'fb111111-1111-4111-8111-111111111111',
  timezone('utc', now())
from public.mpgf_failure_bonus_reserves reserve
where reserve.reserve_key = 'moral-trade-common-failure-bonus-usd';

insert into public.mpgf_failure_bonus_reserve_entries (
  reserve_id,
  pool_proposal_id,
  threshold_index,
  event_type,
  cash_delta_cents,
  exposure_delta_cents,
  status,
  idempotency_key,
  source_ref_hash,
  event_hash,
  public_memo,
  approved_by,
  approved_at
)
select
  reserve.id,
  'fb222222-2222-4222-8222-222222222222',
  1,
  'bonus_exposure_release',
  0,
  -30000,
  'posted',
  'qa:failure-bonus:unused-exposure-release',
  'sha256:' || repeat('9', 64),
  'sha256:' || repeat('0', 64),
  'Synthetic QA release of unused exposure',
  'fb111111-1111-4111-8111-111111111111',
  timezone('utc', now())
from public.mpgf_failure_bonus_reserves reserve
where reserve.reserve_key = 'moral-trade-common-failure-bonus-usd';

do $test$
declare
  cash_balance bigint;
  open_exposure bigint;
  available_backing bigint;
begin
  select
    posted_cash_balance_cents,
    open_bonus_exposure_cents,
    available_backing_cents
  into cash_balance, open_exposure, available_backing
  from public.mpgf_failure_bonus_reserve_public_summary
  where reserve_key = 'moral-trade-common-failure-bonus-usd';

  if cash_balance <> 100100
     or open_exposure <> 0
     or available_backing <> 100100 then
    raise exception 'Atomic failure settlement produced an invalid reserve state: cash %, exposure %, available %',
      cash_balance,
      open_exposure,
      available_backing;
  end if;
end;
$test$;

rollback;

select 'passed' as mpgf_failure_bonus_success_premium_reserve_test;
