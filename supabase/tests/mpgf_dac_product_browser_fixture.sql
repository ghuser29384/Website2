\set ON_ERROR_STOP on
\getenv qa_password MPGF_DAC_PRODUCT_QA_PASSWORD

begin;

insert into auth.users (
  id,
  instance_id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  confirmation_token,
  recovery_token,
  email_change,
  email_change_token_new,
  email_change_token_current,
  reauthentication_token,
  is_sso_user,
  is_anonymous,
  created_at,
  updated_at
)
select
  actor.id,
  '00000000-0000-0000-0000-000000000000'::uuid,
  'authenticated',
  'authenticated',
  actor.email,
  extensions.crypt(:'qa_password', extensions.gen_salt('bf')),
  now(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  jsonb_build_object('display_name', actor.display_name, 'qa_fixture', 'mpgf_dac_product_browser'),
  '', '', '', '', '', '', false, false, now(), now()
from (
  values
    ('ca111111-1111-4111-8111-111111111111'::uuid, 'dac-product-creator@qa.invalid', 'QA DAC Product Creator'),
    ('cb222222-2222-4222-8222-222222222222'::uuid, 'dac-product-reviewer@qa.invalid', 'QA DAC Product Reviewer'),
    ('cc333333-3333-4333-8333-333333333333'::uuid, 'dac-product-pledger@qa.invalid', 'QA DAC Product Pledger'),
    ('cd444444-4444-4444-8444-444444444444'::uuid, 'dac-product-outsider@qa.invalid', 'QA DAC Product Outsider')
) as actor(id, email, display_name);

insert into auth.identities (
  provider_id,
  user_id,
  identity_data,
  provider,
  last_sign_in_at,
  created_at,
  updated_at
)
select
  actor.id::text,
  actor.id,
  jsonb_build_object('sub', actor.id::text, 'email', actor.email, 'email_verified', true),
  'email',
  now(),
  now(),
  now()
from (
  values
    ('ca111111-1111-4111-8111-111111111111'::uuid, 'dac-product-creator@qa.invalid'),
    ('cb222222-2222-4222-8222-222222222222'::uuid, 'dac-product-reviewer@qa.invalid'),
    ('cc333333-3333-4333-8333-333333333333'::uuid, 'dac-product-pledger@qa.invalid'),
    ('cd444444-4444-4444-8444-444444444444'::uuid, 'dac-product-outsider@qa.invalid')
) as actor(id, email);

insert into public.profiles(id, email, display_name, bio, affiliation)
values
  ('ca111111-1111-4111-8111-111111111111','dac-product-creator@qa.invalid','QA DAC Product Creator','','Isolated QA'),
  ('cb222222-2222-4222-8222-222222222222','dac-product-reviewer@qa.invalid','QA DAC Product Reviewer','','Isolated QA'),
  ('cc333333-3333-4333-8333-333333333333','dac-product-pledger@qa.invalid','QA DAC Product Pledger','','Isolated QA'),
  ('cd444444-4444-4444-8444-444444444444','dac-product-outsider@qa.invalid','QA DAC Product Outsider','','Isolated QA')
on conflict (id) do update
set email = excluded.email,
    display_name = excluded.display_name,
    bio = excluded.bio,
    affiliation = excluded.affiliation;

insert into public.mpgf_pool_reviewers(
  reviewer_id, active, authorized_by, rationale, expires_at
) values (
  'cb222222-2222-4222-8222-222222222222',
  true,
  'cb222222-2222-4222-8222-222222222222',
  'Ephemeral isolated-QA reviewer for DAC product lifecycle proof',
  clock_timestamp() + interval '2 hours'
);

insert into public.mpgf_public_goods_match_pools (
  id, funder_type, budget_cents, base_match_ratio, qf_bonus_cents,
  visible_commitment, restrictions_json, status
) values (
  'qa-dac-product-match-20260807',
  'demo_common_ground_pool',
  0,
  0,
  0,
  'Synthetic isolated-QA DAC product match pool.',
  '{"qa":true,"noCustody":true}'::jsonb,
  'active'
);

insert into public.mpgf_public_goods_rounds (
  id, name, starts_at, ends_at, match_pool_id, qf_enabled,
  qf_cap_multiple, supporter_gate, status
) values (
  'qa-dac-product-round-20260807',
  'Synthetic isolated-QA DAC product round',
  timezone('utc', now()) - interval '1 day',
  timezone('utc', now()) + interval '60 days',
  'qa-dac-product-match-20260807',
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
        "thresholdId":"qa-dac-product-threshold-1",
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
scenarios(id, title, summary, destination_ref, deadline_at, slug, submission_id, submission_key, source_hash) as (
  values
    (
      'ce555555-5555-4555-8555-555555555555'::uuid,
      'QA DAC open for conditional pledges',
      'A synthetic open dominant assurance contract for authenticated browser proof.',
      'qa-dac-product-open-recipient',
      timezone('utc', now()) + interval '30 days',
      'qa-dac-product-open',
      'd1111111-1111-4111-8111-111111111111'::uuid,
      'qa-dac-product-open-submission',
      repeat('1', 64)
    ),
    (
      'cf666666-6666-4666-8666-666666666666'::uuid,
      'QA DAC succeeded',
      'A synthetic dominant assurance contract with an immutable successful outcome.',
      'qa-dac-product-success-recipient',
      timezone('utc', now()) + interval '30 days',
      'qa-dac-product-succeeded',
      'd2222222-2222-4222-8222-222222222222'::uuid,
      'qa-dac-product-success-submission',
      repeat('2', 64)
    ),
    (
      'c0777777-7777-4777-8777-777777777777'::uuid,
      'QA DAC lapsed',
      'A synthetic dominant assurance contract with an immutable lapsed outcome.',
      'qa-dac-product-lapse-recipient',
      timezone('utc', now()) + interval '8 seconds',
      'qa-dac-product-lapsed',
      'd3333333-3333-4333-8333-333333333333'::uuid,
      'qa-dac-product-lapse-submission',
      repeat('3', 64)
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
  threshold_visibility,
  progress_visibility,
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
  'ca111111-1111-4111-8111-111111111111',
  scenarios.title,
  'Synthetic isolated-QA problem',
  'Synthetic isolated-QA intervention',
  'Synthetic isolated-QA moral-public-good rationale',
  'Synthetic isolated-QA recipient',
  scenarios.summary,
  'QA DAC product lifecycle',
  10000,
  10000,
  'One verified isolated-QA outcome',
  'No real-world effect; this is isolated QA',
  'Complete during the exact-head browser gate',
  '[]'::jsonb,
  '[]'::jsonb,
  'None; fixed synthetic IDs are removed after the gate',
  '{"summary":"Synthetic isolated-QA team"}'::jsonb,
  'submitted',
  timezone('utc', now()),
  'public_exact',
  'sealed_progress',
  'external_charity',
  scenarios.destination_ref,
  10000,
  2,
  scenarios.deadline_at,
  'Independent synthetic receipt review',
  'Only incremental verified support counts',
  'Signed pledge intents expire without payment if the DAC lapses',
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

with scenarios(id, submission_id, submission_key, source_hash) as (
  values
    ('ce555555-5555-4555-8555-555555555555'::uuid, 'd1111111-1111-4111-8111-111111111111'::uuid, 'qa-dac-product-open-submission', repeat('1', 64)),
    ('cf666666-6666-4666-8666-666666666666'::uuid, 'd2222222-2222-4222-8222-222222222222'::uuid, 'qa-dac-product-success-submission', repeat('2', 64)),
    ('c0777777-7777-4777-8777-777777777777'::uuid, 'd3333333-3333-4333-8333-333333333333'::uuid, 'qa-dac-product-lapse-submission', repeat('3', 64))
)
insert into public.moral_trade_create_submissions (
  id, owner_profile_id, submission_key, interface_version, submission_kind,
  cause_area, request_kind, requested_action, offered_terms_json,
  pool_terms_json, source_payload_json, source_payload_hash,
  target_type, target_id, status, canonical_path
)
select
  scenarios.submission_id,
  'ca111111-1111-4111-8111-111111111111',
  scenarios.submission_key,
  'moral_trade_create_v1',
  'pool_create',
  'QA DAC product lifecycle',
  'fund',
  'Fund the synthetic public good only under the exact dominant assurance contract terms',
  '[]'::jsonb,
  '{"mechanism":"dominant_assurance_contract","qa":true}'::jsonb,
  jsonb_build_object('qa', true, 'proposalId', scenarios.id),
  scenarios.source_hash,
  'mpgf_pool_proposal',
  scenarios.id,
  'pending_review',
  '/mpgf/pools/proposals/' || scenarios.id::text
from scenarios;

with scenarios(id, submission_id) as (
  values
    ('ce555555-5555-4555-8555-555555555555'::uuid, 'd1111111-1111-4111-8111-111111111111'::uuid),
    ('cf666666-6666-4666-8666-666666666666'::uuid, 'd2222222-2222-4222-8222-222222222222'::uuid),
    ('c0777777-7777-4777-8777-777777777777'::uuid, 'd3333333-3333-4333-8333-333333333333'::uuid)
)
insert into public.moral_trade_create_pool_terms (
  pool_proposal_id,
  create_submission_id,
  threshold_amounts_cents_json,
  deadline_at,
  failure_bonus_base_type,
  failure_bonus_base_terms_json,
  failure_bonus_timing_mode,
  failure_bonus_timing_terms_json,
  continuation_mode,
  threshold_visibility,
  progress_visibility,
  moral_trade_failure_bonus_share_bps,
  additional_activation_rule,
  reserve_quote_status,
  review_status
)
select
  scenarios.id,
  scenarios.submission_id,
  '[10000]'::jsonb,
  proposal.public_goods_deadline_at,
  'percentage',
  '{"rateBps":1000}'::jsonb,
  'all',
  '{"appliesTo":"all_eligible_pledges"}'::jsonb,
  'stop',
  'public_exact',
  'sealed_progress',
  500,
  'The synthetic recipient must remain independently verifiable.',
  'approved',
  'pending_review'
from scenarios
join public.mpgf_pool_proposals proposal on proposal.id = scenarios.id;

select * from public.mpgf_approve_failure_bonus_premium_schedule(
  'ce555555-5555-4555-8555-555555555555',
  'cb222222-2222-4222-8222-222222222222',
  'Approve the isolated-QA open DAC premium schedule'
);
select * from public.mpgf_approve_failure_bonus_premium_schedule(
  'cf666666-6666-4666-8666-666666666666',
  'cb222222-2222-4222-8222-222222222222',
  'Approve the isolated-QA success DAC premium schedule'
);
select * from public.mpgf_approve_failure_bonus_premium_schedule(
  'c0777777-7777-4777-8777-777777777777',
  'cb222222-2222-4222-8222-222222222222',
  'Approve the isolated-QA lapse DAC premium schedule'
);

select * from public.mpgf_begin_pool_proposal_review('ce555555-5555-4555-8555-555555555555','cb222222-2222-4222-8222-222222222222','Begin exact review of the isolated-QA open DAC');
select * from public.mpgf_approve_and_freeze_pool_proposal('ce555555-5555-4555-8555-555555555555','cb222222-2222-4222-8222-222222222222','Approve and freeze the isolated-QA open DAC');
select * from public.mpgf_publish_pool_proposal('ce555555-5555-4555-8555-555555555555','qa-dac-product-round-20260807','qa-dac-product-open','cb222222-2222-4222-8222-222222222222','Publish the isolated-QA open DAC');

select * from public.mpgf_begin_pool_proposal_review('cf666666-6666-4666-8666-666666666666','cb222222-2222-4222-8222-222222222222','Begin exact review of the isolated-QA success DAC');
select * from public.mpgf_approve_and_freeze_pool_proposal('cf666666-6666-4666-8666-666666666666','cb222222-2222-4222-8222-222222222222','Approve and freeze the isolated-QA success DAC');
select * from public.mpgf_publish_pool_proposal('cf666666-6666-4666-8666-666666666666','qa-dac-product-round-20260807','qa-dac-product-succeeded','cb222222-2222-4222-8222-222222222222','Publish the isolated-QA success DAC');

select * from public.mpgf_begin_pool_proposal_review('c0777777-7777-4777-8777-777777777777','cb222222-2222-4222-8222-222222222222','Begin exact review of the isolated-QA lapse DAC');
select * from public.mpgf_approve_and_freeze_pool_proposal('c0777777-7777-4777-8777-777777777777','cb222222-2222-4222-8222-222222222222','Approve and freeze the isolated-QA lapse DAC');
select * from public.mpgf_publish_pool_proposal('c0777777-7777-4777-8777-777777777777','qa-dac-product-round-20260807','qa-dac-product-lapsed','cb222222-2222-4222-8222-222222222222','Publish the isolated-QA lapse DAC');

select set_config('request.jwt.claim.sub', 'cc333333-3333-4333-8333-333333333333', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
set local role authenticated;
select * from public.mpgf_create_dac_pledge('campaign-cf666666666646668666666666666666',6000,'private_amount',null,'qa-dac-product-success-pledger-one');
select * from public.mpgf_create_dac_pledge('campaign-c0777777777747778777777777777777',1000,'private_amount',null,'qa-dac-product-lapse-pledger-one');
reset role;

select set_config('request.jwt.claim.sub', 'cd444444-4444-4444-8444-444444444444', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
set local role authenticated;
select * from public.mpgf_create_dac_pledge('campaign-cf666666666646668666666666666666',5000,'public_supporter',null,'qa-dac-product-success-pledger-two');
reset role;
select set_config('request.jwt.claim.sub', '', true);
select set_config('request.jwt.claim.role', '', true);

select * from public.mpgf_review_dac_pledge_eligibility(
  (select id from public.mpgf_public_goods_pledges where campaign_id = 'campaign-cf666666666646668666666666666666' and profile_id = 'cc333333-3333-4333-8333-333333333333'),
  'cb222222-2222-4222-8222-222222222222',
  'eligible',
  10000,
  'Verify the first isolated-QA success supporter'
);
select * from public.mpgf_review_dac_pledge_eligibility(
  (select id from public.mpgf_public_goods_pledges where campaign_id = 'campaign-cf666666666646668666666666666666' and profile_id = 'cd444444-4444-4444-8444-444444444444'),
  'cb222222-2222-4222-8222-222222222222',
  'eligible',
  9000,
  'Verify the second isolated-QA success supporter'
);
select * from public.mpgf_review_dac_pledge_eligibility(
  (select id from public.mpgf_public_goods_pledges where campaign_id = 'campaign-c0777777777747778777777777777777' and profile_id = 'cc333333-3333-4333-8333-333333333333'),
  'cb222222-2222-4222-8222-222222222222',
  'eligible',
  10000,
  'Verify the isolated-QA lapse supporter'
);

select * from public.mpgf_finalize_dac_campaign(
  'campaign-cf666666666646668666666666666666',
  'cb222222-2222-4222-8222-222222222222',
  'Both exact isolated-QA thresholds are met; record success without payment execution'
);

select pg_sleep(
  greatest(
    0,
    extract(epoch from ((select deadline_at from public.mpgf_public_goods_campaigns where id = 'campaign-c0777777777747778777777777777777') - clock_timestamp())) + 1
  )
);

select * from public.mpgf_finalize_dac_campaign(
  'campaign-c0777777777747778777777777777777',
  'cb222222-2222-4222-8222-222222222222',
  'The isolated-QA deadline passed below both exact thresholds; expire without payment'
);

do $fixture$
declare
  campaign_count integer;
  outcome_count integer;
  payment_count integer;
  public_terms_count integer;
begin
  select count(*) into campaign_count
  from public.mpgf_public_goods_campaigns
  where id in (
    'campaign-ce555555555545558555555555555555',
    'campaign-cf666666666646668666666666666666',
    'campaign-c0777777777747778777777777777777'
  );

  select count(*) into outcome_count
  from public.mpgf_dac_campaign_outcomes
  where campaign_id in (
    'campaign-cf666666666646668666666666666666',
    'campaign-c0777777777747778777777777777777'
  );

  select count(*) into payment_count
  from public.mpgf_public_goods_pledges
  where campaign_id in (
    'campaign-ce555555555545558555555555555555',
    'campaign-cf666666666646668666666666666666',
    'campaign-c0777777777747778777777777777777'
  ) and (payment_intent_ref is not null or status = 'captured');

  select count(*) into public_terms_count
  from (values
    (public.mpgf_public_dac_campaign_terms('qa-dac-product-open')),
    (public.mpgf_public_dac_campaign_terms('qa-dac-product-succeeded')),
    (public.mpgf_public_dac_campaign_terms('qa-dac-product-lapsed'))
  ) terms(value)
  where value is not null;

  if campaign_count <> 3
     or outcome_count <> 2
     or payment_count <> 0
     or public_terms_count <> 3
     or (select review_status from public.mpgf_public_goods_campaigns where slug = 'qa-dac-product-open') <> 'approved'
     or (select outcome_status from public.mpgf_dac_campaign_outcomes where campaign_id = 'campaign-cf666666666646668666666666666666') <> 'succeeded'
     or (select outcome_status from public.mpgf_dac_campaign_outcomes where campaign_id = 'campaign-c0777777777747778777777777777777') <> 'lapsed' then
    raise exception 'DAC product browser fixture invariant failed: campaigns %, outcomes %, payments %, public terms %', campaign_count, outcome_count, payment_count, public_terms_count;
  end if;
end;
$fixture$;

commit;
