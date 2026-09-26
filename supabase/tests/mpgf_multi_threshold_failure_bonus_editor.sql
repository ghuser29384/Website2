begin;

insert into auth.users (
  id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) values
(
  'fc111111-1111-4111-8111-111111111111',
  'authenticated', 'authenticated', 'multi-threshold-owner@example.test', '', now(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{"display_name":"Multi-threshold Owner"}'::jsonb,
  now(), now()
),
(
  'fc222222-2222-4222-8222-222222222222',
  'authenticated', 'authenticated', 'multi-threshold-contributor@example.test', '', now(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{"display_name":"Multi-threshold Contributor"}'::jsonb,
  now(), now()
);

insert into public.profiles (id, email, display_name, bio, affiliation)
values
(
  'fc111111-1111-4111-8111-111111111111',
  'multi-threshold-owner@example.test',
  'Multi-threshold Owner', '', 'MoralTrade QA'
),
(
  'fc222222-2222-4222-8222-222222222222',
  'multi-threshold-contributor@example.test',
  'Multi-threshold Contributor', '', 'MoralTrade QA'
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
  'fc333333-3333-4333-8333-333333333333',
  'fc111111-1111-4111-8111-111111111111',
  'Two-threshold failure-bonus QA pool',
  'Synthetic QA problem for cumulative threshold validation.',
  'Synthetic QA intervention with no live payment.',
  'Synthetic QA moral public-good rationale.',
  'Synthetic QA recipient',
  'Synthetic QA schedule',
  'QA',
  3000000,
  'One validated multi-threshold contract',
  'No real-world effect; database regression only.',
  'Complete within this transaction.',
  '["quotes generated","schedule approved","terms frozen"]'::jsonb,
  '["accidental non-QA persistence"]'::jsonb,
  'Transaction rolls back.',
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
    "thresholds":[
      {
        "thresholdId":"multi-threshold-1",
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
      },
      {
        "thresholdId":"multi-threshold-2",
        "thresholdIndex":2,
        "cumulativeNetRecipientThresholdCents":2500000,
        "incrementalNetRecipientCents":1500000,
        "premiumRateBps":601,
        "successPremiumCents":90150,
        "cumulativeSuccessPremiumCents":110250,
        "grossSuccessRequirementCents":2610250,
        "premiumPayer":"pool_creator_or_sponsor",
        "premiumIncludedInNetRecipientThreshold":false,
        "pricingMode":"experience_rated",
        "provisional":true,
        "rationale":"Provisional threshold 2 experience-rated quote; operator approval remains required.",
        "assumptions":{
          "successProbabilityBps":6000,
          "failureBonusRateBps":1000,
          "expectedEligibleFailureFillBps":8000,
          "expenseLoadBps":25,
          "reserveRiskMarginBps":42
        },
        "incrementalFailureBonusExposureCents":150000,
        "maximumFailureBonusExposureCents":250000
      }
    ]
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
    "successProbabilityBps":7500,
    "failureBonusRateBps":1000,
    "expectedEligibleFailureFillBps":4000,
    "expenseLoadBps":25,
    "reserveRiskMarginBps":42
  }'::jsonb
);

do $test$
declare
  pending_count integer;
  threshold_one record;
  threshold_two record;
begin
  select count(*) into pending_count
  from public.mpgf_failure_bonus_premium_quotes
  where pool_proposal_id = 'fc333333-3333-4333-8333-333333333333'
    and status = 'pending_review';

  select * into threshold_one
  from public.mpgf_failure_bonus_premium_quotes
  where pool_proposal_id = 'fc333333-3333-4333-8333-333333333333'
    and threshold_index = 1
    and status = 'pending_review';

  select * into threshold_two
  from public.mpgf_failure_bonus_premium_quotes
  where pool_proposal_id = 'fc333333-3333-4333-8333-333333333333'
    and threshold_index = 2
    and status = 'pending_review';

  if pending_count <> 2
     or threshold_one.incremental_net_recipient_cents <> 1000000
     or threshold_one.success_premium_cents <> 20100
     or threshold_one.cumulative_success_premium_cents <> 20100
     or threshold_one.gross_success_requirement_cents <> 1020100
     or threshold_one.incremental_failure_bonus_exposure_cents <> 100000
     or threshold_one.maximum_failure_bonus_exposure_cents <> 100000
     or threshold_two.incremental_net_recipient_cents <> 1500000
     or threshold_two.premium_rate_bps <> 601
     or threshold_two.success_premium_cents <> 90150
     or threshold_two.cumulative_success_premium_cents <> 110250
     or threshold_two.gross_success_requirement_cents <> 2610250
     or threshold_two.incremental_failure_bonus_exposure_cents <> 150000
     or threshold_two.maximum_failure_bonus_exposure_cents <> 250000 then
    raise exception 'Initial two-threshold quote set was not reproduced exactly.';
  end if;
end;
$test$;

-- Reprice only threshold 2 with more conservative risk assumptions. Threshold 1 remains
-- economically identical; threshold 2 receives a new quote and the stale quote is superseded.
update public.mpgf_pool_proposals
set public_goods_threshold_schedule_json = jsonb_set(
  public_goods_threshold_schedule_json,
  '{thresholds}',
  '[
    {
      "thresholdId":"multi-threshold-1",
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
    },
    {
      "thresholdId":"multi-threshold-2",
      "thresholdIndex":2,
      "cumulativeNetRecipientThresholdCents":2500000,
      "incrementalNetRecipientCents":1500000,
      "premiumRateBps":804,
      "successPremiumCents":120600,
      "cumulativeSuccessPremiumCents":140700,
      "grossSuccessRequirementCents":2640700,
      "premiumPayer":"pool_creator_or_sponsor",
      "premiumIncludedInNetRecipientThreshold":false,
      "pricingMode":"experience_rated",
      "provisional":true,
      "rationale":"Provisional threshold 2 experience-rated quote; operator approval remains required.",
      "assumptions":{
        "successProbabilityBps":5500,
        "failureBonusRateBps":1000,
        "expectedEligibleFailureFillBps":9000,
        "expenseLoadBps":25,
        "reserveRiskMarginBps":42
      },
      "incrementalFailureBonusExposureCents":150000,
      "maximumFailureBonusExposureCents":250000
    }
  ]'::jsonb,
  false
)
where id = 'fc333333-3333-4333-8333-333333333333';

do $test$
declare
  pending_count integer;
  superseded_count integer;
  current_threshold_two record;
begin
  select count(*) into pending_count
  from public.mpgf_failure_bonus_premium_quotes
  where pool_proposal_id = 'fc333333-3333-4333-8333-333333333333'
    and status = 'pending_review';

  select count(*) into superseded_count
  from public.mpgf_failure_bonus_premium_quotes
  where pool_proposal_id = 'fc333333-3333-4333-8333-333333333333'
    and status = 'superseded';

  select * into current_threshold_two
  from public.mpgf_failure_bonus_premium_quotes
  where pool_proposal_id = 'fc333333-3333-4333-8333-333333333333'
    and threshold_index = 2
    and status = 'pending_review';

  if pending_count <> 2
     or superseded_count <> 1
     or current_threshold_two.premium_rate_bps <> 804
     or current_threshold_two.success_premium_cents <> 120600
     or current_threshold_two.cumulative_success_premium_cents <> 140700
     or current_threshold_two.gross_success_requirement_cents <> 2640700 then
    raise exception 'Schedule editing did not invalidate and replace the stale tranche quote.';
  end if;
end;
$test$;

do $test$
declare
  partial_approval_blocked boolean := false;
begin
  begin
    update public.mpgf_failure_bonus_premium_quotes
    set status = 'approved',
        provisional = false,
        approved_by = 'fc111111-1111-4111-8111-111111111111',
        approved_at = timezone('utc', now())
    where pool_proposal_id = 'fc333333-3333-4333-8333-333333333333'
      and threshold_index = 1
      and status = 'pending_review';
  exception
    when insufficient_privilege then
      partial_approval_blocked := true;
  end;

  if not partial_approval_blocked then
    raise exception 'Partial threshold approval was not blocked.';
  end if;
end;
$test$;

set local role authenticated;
set local "request.jwt.claim.sub" = 'fc222222-2222-4222-8222-222222222222';
set local "request.jwt.claim.role" = 'authenticated';

do $test$
declare
  unapproved_pledge_blocked boolean := false;
begin
  begin
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
      'fc555555-5555-4555-8555-555555555555',
      'fc333333-3333-4333-8333-333333333333',
      'fc222222-2222-4222-8222-222222222222',
      'fc222222-2222-4222-8222-222222222222',
      'Multi-threshold Contributor',
      10000,
      'usd',
      'one_time',
      'pledged',
      'pledge_only',
      false
    );
  exception
    when check_violation then
      unapproved_pledge_blocked := true;
  end;

  if not unapproved_pledge_blocked then
    raise exception 'A failure-bonus pledge was accepted before operator approval.';
  end if;
end;
$test$;

reset role;

select *
from public.mpgf_approve_failure_bonus_premium_schedule(
  'fc333333-3333-4333-8333-333333333333',
  'fc111111-1111-4111-8111-111111111111',
  'QA operator approved the complete two-threshold schedule.'
);

do $test$
declare
  approved_quote_count integer;
  pending_quote_count integer;
  proposal_status text;
  proposal_provisional boolean;
  threshold_one_provisional boolean;
  threshold_two_provisional boolean;
begin
  select count(*) into approved_quote_count
  from public.mpgf_failure_bonus_premium_quotes
  where pool_proposal_id = 'fc333333-3333-4333-8333-333333333333'
    and status = 'approved';

  select count(*) into pending_quote_count
  from public.mpgf_failure_bonus_premium_quotes
  where pool_proposal_id = 'fc333333-3333-4333-8333-333333333333'
    and status = 'pending_review';

  select
    public_goods_failure_bonus_schedule_status,
    public_goods_success_premium_provisional,
    (public_goods_threshold_schedule_json #>> '{thresholds,0,provisional}')::boolean,
    (public_goods_threshold_schedule_json #>> '{thresholds,1,provisional}')::boolean
  into proposal_status, proposal_provisional, threshold_one_provisional, threshold_two_provisional
  from public.mpgf_pool_proposals
  where id = 'fc333333-3333-4333-8333-333333333333';

  if approved_quote_count <> 2
     or pending_quote_count <> 0
     or proposal_status <> 'approved'
     or proposal_provisional <> false
     or threshold_one_provisional <> false
     or threshold_two_provisional <> false then
    raise exception 'Atomic operator approval did not finalize the complete schedule.';
  end if;
end;
$test$;

-- Approval is required before acceptance. Once approved, an accepted pledge permanently
-- latches the contract and later edits to formula, eligibility, caps, or thresholds are rejected.
set local role authenticated;
set local "request.jwt.claim.sub" = 'fc222222-2222-4222-8222-222222222222';
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
  'fc444444-4444-4444-8444-444444444444',
  'fc333333-3333-4333-8333-333333333333',
  'fc222222-2222-4222-8222-222222222222',
  'fc222222-2222-4222-8222-222222222222',
  'Multi-threshold Contributor',
  10000,
  'usd',
  'one_time',
  'pledged',
  'pledge_only',
  false
);

reset role;

do $test$
declare
  terms_change_blocked boolean := false;
  approved_quote_change_blocked boolean := false;
begin
  if not exists (
    select 1 from public.mpgf_pool_proposals
    where id = 'fc333333-3333-4333-8333-333333333333'
      and first_accepted_pledge_at is not null
  ) then
    raise exception 'Accepted pledge did not latch the failure-bonus contract.';
  end if;

  begin
    update public.mpgf_pool_proposals
    set public_goods_failure_bonus_max_participants = 101
    where id = 'fc333333-3333-4333-8333-333333333333';
  exception
    when check_violation then
      terms_change_blocked := true;
  end;

  begin
    update public.mpgf_failure_bonus_premium_quotes
    set rationale = 'Changed after approval'
    where pool_proposal_id = 'fc333333-3333-4333-8333-333333333333'
      and status = 'approved';
  exception
    when check_violation then
      approved_quote_change_blocked := true;
  end;

  if not terms_change_blocked then
    raise exception 'Failure-bonus caps changed after the first accepted pledge.';
  end if;
  if not approved_quote_change_blocked then
    raise exception 'Approved threshold quote was mutable.';
  end if;
end;
$test$;

rollback;

select 'passed' as mpgf_multi_threshold_failure_bonus_editor_test;
