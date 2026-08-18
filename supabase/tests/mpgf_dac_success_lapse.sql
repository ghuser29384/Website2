begin;

insert into auth.users(
  id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) values
  ('aa111111-1111-4111-8111-111111111111','authenticated','authenticated','dac-terminal-creator@example.test','',now(),'{"provider":"email","providers":["email"]}','{"display_name":"DAC Terminal Creator"}',now(),now()),
  ('ab222222-2222-4222-8222-222222222222','authenticated','authenticated','dac-terminal-reviewer@example.test','',now(),'{"provider":"email","providers":["email"]}','{"display_name":"DAC Terminal Reviewer"}',now(),now()),
  ('ac333333-3333-4333-8333-333333333333','authenticated','authenticated','dac-terminal-pledger-one@example.test','',now(),'{"provider":"email","providers":["email"]}','{"display_name":"DAC Terminal Pledger One"}',now(),now()),
  ('ad444444-4444-4444-8444-444444444444','authenticated','authenticated','dac-terminal-pledger-two@example.test','',now(),'{"provider":"email","providers":["email"]}','{"display_name":"DAC Terminal Pledger Two"}',now(),now()),
  ('ae555555-5555-4555-8555-555555555555','authenticated','authenticated','dac-terminal-outsider@example.test','',now(),'{"provider":"email","providers":["email"]}','{"display_name":"DAC Terminal Outsider"}',now(),now())
on conflict (id) do nothing;

insert into public.profiles(id, email, display_name, bio, affiliation)
values
  ('aa111111-1111-4111-8111-111111111111','dac-terminal-creator@example.test','DAC Terminal Creator','','Moral Trade QA'),
  ('ab222222-2222-4222-8222-222222222222','dac-terminal-reviewer@example.test','DAC Terminal Reviewer','','Moral Trade QA'),
  ('ac333333-3333-4333-8333-333333333333','dac-terminal-pledger-one@example.test','DAC Terminal Pledger One','','Moral Trade QA'),
  ('ad444444-4444-4444-8444-444444444444','dac-terminal-pledger-two@example.test','DAC Terminal Pledger Two','','Moral Trade QA'),
  ('ae555555-5555-4555-8555-555555555555','dac-terminal-outsider@example.test','DAC Terminal Outsider','','Moral Trade QA')
on conflict (id) do update
set email = excluded.email, display_name = excluded.display_name;

insert into public.mpgf_pool_reviewers(
  reviewer_id, active, authorized_by, rationale, expires_at
) values (
  'ab222222-2222-4222-8222-222222222222',
  true,
  'ab222222-2222-4222-8222-222222222222',
  'Rollback-only DAC terminal lifecycle reviewer',
  clock_timestamp() + interval '1 hour'
);

insert into public.mpgf_public_goods_match_pools (
  id, funder_type, budget_cents, base_match_ratio, qf_bonus_cents,
  visible_commitment, restrictions_json, status
) values (
  'qa-dac-terminal-match-20260807',
  'demo_common_ground_pool',
  0,
  0,
  0,
  'Synthetic rollback-only DAC terminal match pool.',
  '{"qa":true,"noCustody":true}'::jsonb,
  'active'
);

insert into public.mpgf_public_goods_rounds (
  id, name, starts_at, ends_at, match_pool_id, qf_enabled,
  qf_cap_multiple, supporter_gate, status
) values (
  'qa-dac-terminal-round-20260807',
  'Synthetic rollback-only DAC terminal round',
  timezone('utc', now()) - interval '1 day',
  timezone('utc', now()) + interval '60 days',
  'qa-dac-terminal-match-20260807',
  false,
  1.5,
  'demo_self_attestation',
  'open'
);

with shared as (
  select
    '{
      "policyVersion":"mpgf_failure_bonus_eligibility_v0_1",
      "contributorIdentityRule":"verified_unique_person",
      "contributionTimingRule":"captured_before_deadline",
      "relatedPartyRule":"exclude_creator_and_related_parties",
      "paymentIntegrityRule":"exclude_duplicate_reversed_disputed_or_fraudulent",
      "bonusBasis":"eligible_contribution",
      "maxParticipants":100,
      "maxBonusPerParticipantCents":2500
    }'::jsonb as eligibility_json,
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
        "thresholdId":"qa-dac-terminal-threshold-1",
        "thresholdIndex":1,
        "cumulativeNetRecipientThresholdCents":10000,
        "incrementalNetRecipientCents":10000,
        "premiumRateBps":201,
        "successPremiumCents":201,
        "cumulativeSuccessPremiumCents":201,
        "grossSuccessRequirementCents":10201,
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
        "incrementalFailureBonusExposureCents":1000,
        "maximumFailureBonusExposureCents":1000
      }]
    }'::jsonb as threshold_schedule_json,
    '{
      "successProbabilityBps":7500,
      "failureBonusRateBps":1000,
      "expectedEligibleFailureFillBps":4000,
      "expenseLoadBps":25,
      "reserveRiskMarginBps":42
    }'::jsonb as pricing_json
),
scenarios(
  id,
  title,
  destination_ref,
  deadline_at
) as (
  values
    (
      'af666666-6666-4666-8666-666666666666'::uuid,
      'QA DAC succeeds',
      'qa-dac-success-recipient',
      timezone('utc', now()) + interval '30 days'
    ),
    (
      'af777777-7777-4777-8777-777777777777'::uuid,
      'QA DAC lapses',
      'qa-dac-lapse-recipient',
      timezone('utc', now()) + interval '25 seconds'
    )
)
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
  minimum_viable_funding_cents,
  outcome_units_summary,
  expected_effect_vs_funding,
  timeline,
  milestones_json,
  risks_json,
  misuse_pathways,
  implementing_team_json,
  status,
  submitted_at,
  public_goods_destination_type,
  public_goods_destination_ref,
  public_goods_threshold_amount_cents,
  public_goods_threshold_supporters,
  public_goods_deadline_at,
  public_goods_verification_method,
  public_goods_baseline_rule,
  public_goods_exit_rule,
  public_goods_base_match_ratio,
  public_goods_qf_enabled,
  public_goods_qf_cap_multiple,
  public_goods_payout_method,
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
)
select
  scenarios.id,
  'aa111111-1111-4111-8111-111111111111',
  scenarios.title,
  'Synthetic QA problem',
  'Synthetic QA intervention',
  'Synthetic QA moral-public-good rationale',
  'Synthetic QA recipient',
  'Synthetic QA public summary',
  'QA DAC terminal lifecycle',
  10000,
  10000,
  'One verified QA terminal outcome',
  'No real-world effect; rollback-only database proof',
  'Complete inside this transaction',
  '[]'::jsonb,
  '[]'::jsonb,
  'None; the transaction rolls back',
  '{"summary":"Synthetic QA team"}'::jsonb,
  'submitted',
  timezone('utc', now()),
  'external_charity',
  scenarios.destination_ref,
  10000,
  2,
  scenarios.deadline_at,
  'Synthetic QA evidence',
  'No payment or charge before a terminal outcome',
  'All signed pledge intents expire without payment if the DAC lapses',
  0,
  false,
  1.5,
  'signed_intent',
  true,
  1000,
  shared.eligibility_json,
  100,
  2500,
  shared.threshold_schedule_json,
  'pending_review',
  201,
  201,
  'pool_creator_or_sponsor',
  'mpgf_failure_bonus_success_premium_v0_1',
  false,
  true,
  10201,
  shared.pricing_json
from scenarios
cross join shared;

select * from public.mpgf_approve_failure_bonus_premium_schedule(
  'af666666-6666-4666-8666-666666666666',
  'ab222222-2222-4222-8222-222222222222',
  'Approve the rollback-only success DAC premium schedule'
);
select * from public.mpgf_approve_failure_bonus_premium_schedule(
  'af777777-7777-4777-8777-777777777777',
  'ab222222-2222-4222-8222-222222222222',
  'Approve the rollback-only lapse DAC premium schedule'
);

select * from public.mpgf_begin_pool_proposal_review(
  'af666666-6666-4666-8666-666666666666',
  'ab222222-2222-4222-8222-222222222222',
  'Review the rollback-only success DAC'
);
select * from public.mpgf_approve_and_freeze_pool_proposal(
  'af666666-6666-4666-8666-666666666666',
  'ab222222-2222-4222-8222-222222222222',
  'Approve and freeze the rollback-only success DAC'
);
select * from public.mpgf_publish_pool_proposal(
  'af666666-6666-4666-8666-666666666666',
  'qa-dac-terminal-round-20260807',
  'qa-dac-succeeds',
  'ab222222-2222-4222-8222-222222222222',
  'Publish the rollback-only success DAC'
);

select * from public.mpgf_begin_pool_proposal_review(
  'af777777-7777-4777-8777-777777777777',
  'ab222222-2222-4222-8222-222222222222',
  'Review the rollback-only lapse DAC'
);
select * from public.mpgf_approve_and_freeze_pool_proposal(
  'af777777-7777-4777-8777-777777777777',
  'ab222222-2222-4222-8222-222222222222',
  'Approve and freeze the rollback-only lapse DAC'
);
select * from public.mpgf_publish_pool_proposal(
  'af777777-7777-4777-8777-777777777777',
  'qa-dac-terminal-round-20260807',
  'qa-dac-lapses',
  'ab222222-2222-4222-8222-222222222222',
  'Publish the rollback-only lapse DAC'
);

select set_config('request.jwt.claim.sub', 'ae555555-5555-4555-8555-555555555555', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
set local role authenticated;

do $test$
begin
  begin
    update public.mpgf_public_goods_campaigns
    set review_status = 'blocked'
    where id = 'campaign-af666666666646668666666666666666';
    raise exception 'An authenticated outsider unexpectedly changed published campaign status.';
  exception
    when insufficient_privilege then null;
  end;
end;
$test$;

reset role;
select set_config('request.jwt.claim.sub', '', true);
select set_config('request.jwt.claim.role', '', true);

do $test$
begin
  if has_function_privilege(
    'authenticated',
    'public.mpgf_review_dac_pledge_eligibility(uuid,uuid,text,integer,text)',
    'EXECUTE'
  ) then
    raise exception 'Authenticated users unexpectedly can decide DAC pledge eligibility.';
  end if;
  if has_function_privilege(
    'authenticated',
    'public.mpgf_finalize_dac_campaign(text,uuid,text)',
    'EXECUTE'
  ) then
    raise exception 'Authenticated users unexpectedly can finalize a DAC campaign.';
  end if;
  if has_function_privilege(
    'anon',
    'public.mpgf_finalize_dac_campaign(text,uuid,text)',
    'EXECUTE'
  ) then
    raise exception 'Anonymous users unexpectedly can finalize a DAC campaign.';
  end if;
  if not has_function_privilege(
    'service_role',
    'public.mpgf_finalize_dac_campaign(text,uuid,text)',
    'EXECUTE'
  ) then
    raise exception 'Service role cannot execute the DAC terminal function.';
  end if;
  if has_table_privilege(
    'service_role',
    'public.mpgf_dac_campaign_outcomes',
    'INSERT'
  ) or has_table_privilege(
    'service_role',
    'public.mpgf_dac_campaign_outcomes',
    'UPDATE'
  ) or has_table_privilege(
    'service_role',
    'public.mpgf_dac_campaign_outcomes',
    'DELETE'
  ) or has_table_privilege(
    'service_role',
    'public.mpgf_dac_campaign_outcomes',
    'TRUNCATE'
  ) then
    raise exception 'Service role unexpectedly has direct DAC outcome mutation privileges.';
  end if;
  if not has_table_privilege(
    'service_role',
    'public.mpgf_dac_campaign_outcomes',
    'SELECT'
  ) then
    raise exception 'Service role cannot read DAC terminal outcomes.';
  end if;
  if to_regclass('public.mpgf_conditional_pledges') is not null then
    raise exception 'A second mutable conditional-pledge ledger exists.';
  end if;
end;
$test$;

select set_config('request.jwt.claim.sub', 'ac333333-3333-4333-8333-333333333333', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
set local role authenticated;

select * from public.mpgf_create_dac_pledge(
  'campaign-af666666666646668666666666666666',
  6000,
  'private_amount',
  null,
  'qa-dac-terminal-success-pledger-one'
);
select * from public.mpgf_create_dac_pledge(
  'campaign-af777777777747778777777777777777',
  1000,
  'public_supporter',
  null,
  'qa-dac-terminal-lapse-pledger-one'
);
select * from public.mpgf_create_dac_pledge(
  'campaign-af666666666646668666666666666666',
  100,
  'private_amount',
  null,
  'qa-dac-terminal-success-pending-extra'
);

reset role;

select set_config('request.jwt.claim.sub', 'ad444444-4444-4444-8444-444444444444', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
set local role authenticated;

select * from public.mpgf_create_dac_pledge(
  'campaign-af666666666646668666666666666666',
  5000,
  'public_supporter',
  null,
  'qa-dac-terminal-success-pledger-two'
);

reset role;
select set_config('request.jwt.claim.sub', '', true);
select set_config('request.jwt.claim.role', '', true);

do $test$
declare
  pledge_id_value uuid;
begin
  select id into pledge_id_value
  from public.mpgf_public_goods_pledges
  where campaign_id = 'campaign-af666666666646668666666666666666'
    and profile_id = 'ac333333-3333-4333-8333-333333333333'
    and amount_cents = 6000
    and pledge_intent_id is not null;

  begin
    perform public.mpgf_review_dac_pledge_eligibility(
      pledge_id_value,
      'ae555555-5555-4555-8555-555555555555',
      'eligible',
      10000,
      'Unauthorized outsider review must fail'
    );
    raise exception 'Unauthorized outsider unexpectedly reviewed DAC pledge eligibility.';
  exception
    when insufficient_privilege then null;
  end;
end;
$test$;

select * from public.mpgf_review_dac_pledge_eligibility(
  (
    select id from public.mpgf_public_goods_pledges
    where campaign_id = 'campaign-af666666666646668666666666666666'
      and profile_id = 'ac333333-3333-4333-8333-333333333333'
      and amount_cents = 6000
      and pledge_intent_id is not null
  ),
  'ab222222-2222-4222-8222-222222222222',
  'eligible',
  10000,
  'Verify the first success pledger as a unique eligible person'
);
select * from public.mpgf_review_dac_pledge_eligibility(
  (
    select id from public.mpgf_public_goods_pledges
    where campaign_id = 'campaign-af666666666646668666666666666666'
      and profile_id = 'ad444444-4444-4444-8444-444444444444'
      and pledge_intent_id is not null
  ),
  'ab222222-2222-4222-8222-222222222222',
  'eligible',
  9000,
  'Verify the second success pledger as a unique eligible person'
);
do $test$
begin
  begin
    perform public.mpgf_finalize_dac_campaign(
      'campaign-af666666666646668666666666666666',
      'ab222222-2222-4222-8222-222222222222',
      'A threshold-met DAC with a pending eligibility decision must not finalize'
    );
    raise exception 'A DAC campaign finalized while one pledge still awaited eligibility review.';
  exception
    when check_violation then null;
  end;
end;
$test$;

select * from public.mpgf_review_dac_pledge_eligibility(
  (
    select id from public.mpgf_public_goods_pledges
    where campaign_id = 'campaign-af666666666646668666666666666666'
      and profile_id = 'ac333333-3333-4333-8333-333333333333'
      and amount_cents = 100
      and pledge_intent_id is not null
  ),
  'ab222222-2222-4222-8222-222222222222',
  'blocked',
  0,
  'Resolve the extra success pledge as ineligible before terminal evaluation'
);

select * from public.mpgf_review_dac_pledge_eligibility(
  (
    select id from public.mpgf_public_goods_pledges
    where campaign_id = 'campaign-af777777777747778777777777777777'
      and profile_id = 'ac333333-3333-4333-8333-333333333333'
      and pledge_intent_id is not null
  ),
  'ab222222-2222-4222-8222-222222222222',
  'eligible',
  10000,
  'Verify the lone lapse pledger as a unique eligible person'
);

-- Exact eligibility replay returns the immutable original decision and event.
select * from public.mpgf_review_dac_pledge_eligibility(
  (
    select id from public.mpgf_public_goods_pledges
    where campaign_id = 'campaign-af666666666646668666666666666666'
      and profile_id = 'ac333333-3333-4333-8333-333333333333'
      and amount_cents = 6000
      and pledge_intent_id is not null
  ),
  'ab222222-2222-4222-8222-222222222222',
  'eligible',
  10000,
  'Replay the exact first eligibility decision'
);

do $test$
declare
  pledge_id_value uuid;
begin
  select id into pledge_id_value
  from public.mpgf_public_goods_pledges
  where campaign_id = 'campaign-af666666666646668666666666666666'
    and profile_id = 'ac333333-3333-4333-8333-333333333333'
    and amount_cents = 6000
    and pledge_intent_id is not null;

  begin
    perform public.mpgf_review_dac_pledge_eligibility(
      pledge_id_value,
      'ab222222-2222-4222-8222-222222222222',
      'blocked',
      0,
      'Conflicting final eligibility decision must fail'
    );
    raise exception 'A final DAC eligibility decision unexpectedly changed.';
  exception
    when check_violation then null;
  end;
end;
$test$;

do $test$
begin
  begin
    perform public.mpgf_finalize_dac_campaign(
      'campaign-af777777777747778777777777777777',
      'ab222222-2222-4222-8222-222222222222',
      'Premature lapse must fail'
    );
    raise exception 'An unmet DAC lapsed before its deadline.';
  exception
    when check_violation then null;
  end;
end;
$test$;

select * from public.mpgf_finalize_dac_campaign(
  'campaign-af666666666646668666666666666666',
  'ab222222-2222-4222-8222-222222222222',
  'Both exact thresholds are met; record success without payment execution'
);

-- Exact terminal replay returns the one immutable outcome.
select * from public.mpgf_finalize_dac_campaign(
  'campaign-af666666666646668666666666666666',
  'ab222222-2222-4222-8222-222222222222',
  'Replay the exact successful terminal transition'
);

select set_config('request.jwt.claim.sub', 'ac333333-3333-4333-8333-333333333333', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
set local role authenticated;

do $test$
begin
  begin
    perform public.mpgf_create_dac_pledge(
      'campaign-af666666666646668666666666666666',
      100,
      'private_amount',
      null,
      'qa-dac-terminal-after-success-must-fail'
    );
    raise exception 'A finalized successful DAC unexpectedly accepted another pledge.';
  exception
    when check_violation then null;
  end;
end;
$test$;

reset role;
select set_config('request.jwt.claim.sub', '', true);
select set_config('request.jwt.claim.role', '', true);

select pg_sleep(
  greatest(
    0,
    extract(
      epoch from (
        (
          select deadline_at
          from public.mpgf_public_goods_campaigns
          where id = 'campaign-af777777777747778777777777777777'
        ) - clock_timestamp()
      )
    ) + 1
  )
);

select * from public.mpgf_finalize_dac_campaign(
  'campaign-af777777777747778777777777777777',
  'ab222222-2222-4222-8222-222222222222',
  'The deadline passed below both thresholds; expire signed intents without payment'
);

-- Exact lapse replay creates no duplicate outcome, expiry, or lifecycle event.
select * from public.mpgf_finalize_dac_campaign(
  'campaign-af777777777747778777777777777777',
  'ab222222-2222-4222-8222-222222222222',
  'Replay the exact lapsed terminal transition'
);

do $test$
declare
  outcome_count integer;
  success_outcome public.mpgf_dac_campaign_outcomes%rowtype;
  lapse_outcome public.mpgf_dac_campaign_outcomes%rowtype;
  success_lifecycle_count integer;
  lapse_lifecycle_count integer;
  success_pledged_count integer;
  success_eligible_count integer;
  success_blocked_count integer;
  lapse_expired_count integer;
  creation_event_count integer;
  eligibility_event_count integer;
  expiry_event_count integer;
  payment_object_count integer;
  outcome_hash_mismatch integer;
  event_hash_mismatch integer;
begin
  select count(*) into outcome_count
  from public.mpgf_dac_campaign_outcomes
  where campaign_id in (
    'campaign-af666666666646668666666666666666',
    'campaign-af777777777747778777777777777777'
  );

  select * into success_outcome
  from public.mpgf_dac_campaign_outcomes
  where campaign_id = 'campaign-af666666666646668666666666666666';

  select * into lapse_outcome
  from public.mpgf_dac_campaign_outcomes
  where campaign_id = 'campaign-af777777777747778777777777777777';

  select count(*) into success_lifecycle_count
  from public.mpgf_pool_lifecycle_events
  where proposal_id = 'af666666-6666-4666-8666-666666666666'
    and event_type = 'pool_succeeded';

  select count(*) into lapse_lifecycle_count
  from public.mpgf_pool_lifecycle_events
  where proposal_id = 'af777777-7777-4777-8777-777777777777'
    and event_type = 'pool_lapsed';

  select count(*) into success_pledged_count
  from public.mpgf_public_goods_pledges
  where campaign_id = 'campaign-af666666666646668666666666666666'
    and pledge_intent_id is not null
    and status = 'pledged';

  select count(*) into success_eligible_count
  from public.mpgf_public_goods_pledges
  where campaign_id = 'campaign-af666666666646668666666666666666'
    and pledge_intent_id is not null
    and status = 'pledged'
    and eligibility_state = 'eligible';

  select count(*) into success_blocked_count
  from public.mpgf_public_goods_pledges
  where campaign_id = 'campaign-af666666666646668666666666666666'
    and pledge_intent_id is not null
    and status = 'pledged'
    and eligibility_state = 'blocked';

  select count(*) into lapse_expired_count
  from public.mpgf_public_goods_pledges
  where campaign_id = 'campaign-af777777777747778777777777777777'
    and pledge_intent_id is not null
    and status = 'expired';

  select count(*) into creation_event_count
  from public.mpgf_dac_pledge_events
  where campaign_id in (
    'campaign-af666666666646668666666666666666',
    'campaign-af777777777747778777777777777777'
  )
    and event_type = 'pledge_created';

  select count(*) into eligibility_event_count
  from public.mpgf_dac_pledge_events
  where campaign_id in (
    'campaign-af666666666646668666666666666666',
    'campaign-af777777777747778777777777777777'
  )
    and event_type = 'eligibility_reviewed';

  select count(*) into expiry_event_count
  from public.mpgf_dac_pledge_events
  where campaign_id = 'campaign-af777777777747778777777777777777'
    and event_type = 'pledge_expired';

  select count(*) into payment_object_count
  from public.mpgf_public_goods_pledges
  where campaign_id in (
    'campaign-af666666666646668666666666666666',
    'campaign-af777777777747778777777777777777'
  )
    and (
      payment_intent_ref is not null
      or status = 'captured'
    );

  select count(*) into outcome_hash_mismatch
  from public.mpgf_dac_campaign_outcomes
  where campaign_id in (
    'campaign-af666666666646668666666666666666',
    'campaign-af777777777747778777777777777777'
  )
    and (
      outcome_sha256 <> public.mpgf_dac_json_sha256(outcome_json)
      or (outcome_json #>> '{payment,authorized}')::boolean
      or (outcome_json #>> '{payment,mandateCreated}')::boolean
      or (outcome_json #>> '{payment,charged}')::boolean
      or (outcome_json #>> '{payment,captured}')::boolean
      or (outcome_json #>> '{payment,settled}')::boolean
      or (outcome_json #>> '{payment,failureBonusPaid}')::boolean
    );

  select count(*) into event_hash_mismatch
  from public.mpgf_dac_pledge_events
  where campaign_id in (
    'campaign-af666666666646668666666666666666',
    'campaign-af777777777747778777777777777777'
  )
    and event_sha256 <> public.mpgf_dac_json_sha256(event_json);

  if outcome_count <> 2
     or success_outcome.outcome_status <> 'succeeded'
     or success_outcome.eligible_amount_cents <> 11000
     or success_outcome.eligible_supporter_count <> 2
     or success_outcome.threshold_amount_cents <> 10000
     or success_outcome.threshold_supporters <> 2
     or lapse_outcome.outcome_status <> 'lapsed'
     or lapse_outcome.eligible_amount_cents <> 1000
     or lapse_outcome.eligible_supporter_count <> 1
     or lapse_outcome.evaluated_at < lapse_outcome.deadline_at
     or success_lifecycle_count <> 1
     or lapse_lifecycle_count <> 1
     or success_pledged_count <> 3
     or success_eligible_count <> 2
     or success_blocked_count <> 1
     or lapse_expired_count <> 1
     or creation_event_count <> 4
     or eligibility_event_count <> 4
     or expiry_event_count <> 1
     or payment_object_count <> 0
     or outcome_hash_mismatch <> 0
     or event_hash_mismatch <> 0 then
    raise exception
      'DAC terminal invariant failed: outcomes %, success %/%/%/%/%, lapse %/%/%/%, lifecycle %/%, pledge disposition %/%/%/%, events %/%/%, payments %, outcome hashes %, event hashes %',
      outcome_count,
      success_outcome.outcome_status,
      success_outcome.eligible_amount_cents,
      success_outcome.eligible_supporter_count,
      success_outcome.threshold_amount_cents,
      success_outcome.threshold_supporters,
      lapse_outcome.outcome_status,
      lapse_outcome.eligible_amount_cents,
      lapse_outcome.eligible_supporter_count,
      lapse_outcome.evaluated_at,
      success_lifecycle_count,
      lapse_lifecycle_count,
      success_pledged_count,
      success_eligible_count,
      success_blocked_count,
      lapse_expired_count,
      creation_event_count,
      eligibility_event_count,
      expiry_event_count,
      payment_object_count,
      outcome_hash_mismatch,
      event_hash_mismatch;
  end if;

  if (select status from public.mpgf_pool_proposals where id = 'af666666-6666-4666-8666-666666666666') <> 'succeeded'
     or (select status from public.mpgf_pool_proposals where id = 'af777777-7777-4777-8777-777777777777') <> 'lapsed'
     or (select review_status from public.mpgf_public_goods_campaigns where id = 'campaign-af666666666646668666666666666666') <> 'finalized'
     or (select review_status from public.mpgf_public_goods_campaigns where id = 'campaign-af777777777747778777777777777777') <> 'finalized' then
    raise exception 'Campaign or proposal terminal state did not match the immutable outcome.';
  end if;
end;
$test$;

set local role anon;
do $test$
declare
  visible_outcomes integer;
begin
  select count(*) into visible_outcomes
  from public.mpgf_dac_campaign_outcomes
  where campaign_id in (
    'campaign-af666666666646668666666666666666',
    'campaign-af777777777747778777777777777777'
  );
  if visible_outcomes <> 2 then
    raise exception 'Public audit readers could not see both aggregate DAC terminal outcomes.';
  end if;
end;
$test$;
reset role;

select set_config('request.jwt.claim.sub', 'ae555555-5555-4555-8555-555555555555', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
set local role authenticated;
do $test$
declare
  visible_private_events integer;
begin
  select count(*) into visible_private_events
  from public.mpgf_dac_pledge_events
  where campaign_id in (
    'campaign-af666666666646668666666666666666',
    'campaign-af777777777747778777777777777777'
  );
  if visible_private_events <> 0 then
    raise exception 'An outsider could read private DAC eligibility or expiry evidence.';
  end if;
end;
$test$;
reset role;
select set_config('request.jwt.claim.sub', '', true);
select set_config('request.jwt.claim.role', '', true);

do $test$
declare
  outcome_id_value uuid;
begin
  select id into outcome_id_value
  from public.mpgf_dac_campaign_outcomes
  where campaign_id = 'campaign-af666666666646668666666666666666';

  begin
    update public.mpgf_dac_campaign_outcomes
    set reason = 'Forbidden outcome mutation'
    where id = outcome_id_value;
    raise exception 'Immutable DAC outcome unexpectedly changed.';
  exception
    when check_violation then null;
  end;

  begin
    delete from public.mpgf_dac_campaign_outcomes
    where id = outcome_id_value;
    raise exception 'Immutable DAC outcome unexpectedly deleted.';
  exception
    when check_violation then null;
  end;

  begin
    update public.mpgf_public_goods_campaigns
    set review_status = 'approved'
    where id = 'campaign-af666666666646668666666666666666';
    raise exception 'Finalized DAC campaign unexpectedly reopened.';
  exception
    when check_violation then null;
  end;

  begin
    update public.mpgf_pool_proposals
    set status = 'approved_as_candidate'
    where id = 'af666666-6666-4666-8666-666666666666';
    raise exception 'Terminal DAC proposal unexpectedly reopened.';
  exception
    when insufficient_privilege then null;
  end;
end;
$test$;

rollback;
