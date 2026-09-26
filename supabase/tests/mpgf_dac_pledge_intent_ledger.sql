begin;

insert into auth.users(
  id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) values
  ('9a111111-1111-4111-8111-111111111111','authenticated','authenticated','dac-creator@example.test','',now(),'{"provider":"email","providers":["email"]}','{"display_name":"DAC Creator"}',now(),now()),
  ('9b222222-2222-4222-8222-222222222222','authenticated','authenticated','dac-reviewer@example.test','',now(),'{"provider":"email","providers":["email"]}','{"display_name":"DAC Reviewer"}',now(),now()),
  ('9c333333-3333-4333-8333-333333333333','authenticated','authenticated','dac-pledger-one@example.test','',now(),'{"provider":"email","providers":["email"]}','{"display_name":"DAC Pledger One"}',now(),now()),
  ('9d444444-4444-4444-8444-444444444444','authenticated','authenticated','dac-pledger-two@example.test','',now(),'{"provider":"email","providers":["email"]}','{"display_name":"DAC Pledger Two"}',now(),now()),
  ('9e555555-5555-4555-8555-555555555555','authenticated','authenticated','dac-outsider@example.test','',now(),'{"provider":"email","providers":["email"]}','{"display_name":"DAC Outsider"}',now(),now())
on conflict (id) do nothing;

insert into public.profiles(id, email, display_name, bio, affiliation)
values
  ('9a111111-1111-4111-8111-111111111111','dac-creator@example.test','DAC Creator','','Moral Trade QA'),
  ('9b222222-2222-4222-8222-222222222222','dac-reviewer@example.test','DAC Reviewer','','Moral Trade QA'),
  ('9c333333-3333-4333-8333-333333333333','dac-pledger-one@example.test','DAC Pledger One','','Moral Trade QA'),
  ('9d444444-4444-4444-8444-444444444444','dac-pledger-two@example.test','DAC Pledger Two','','Moral Trade QA'),
  ('9e555555-5555-4555-8555-555555555555','dac-outsider@example.test','DAC Outsider','','Moral Trade QA')
on conflict (id) do update
set email = excluded.email, display_name = excluded.display_name;

insert into public.mpgf_pool_reviewers(
  reviewer_id, active, authorized_by, rationale, expires_at
) values (
  '9b222222-2222-4222-8222-222222222222',
  true,
  '9b222222-2222-4222-8222-222222222222',
  'Rollback-only DAC pledge lifecycle reviewer',
  timezone('utc', now()) + interval '1 hour'
);

insert into public.mpgf_public_goods_match_pools (
  id, funder_type, budget_cents, base_match_ratio, qf_bonus_cents,
  visible_commitment, restrictions_json, status
) values (
  'qa-dac-pledge-match-20260806',
  'demo_common_ground_pool',
  0,
  0,
  0,
  'Synthetic rollback-only DAC pledge match pool.',
  '{"qa":true,"noCustody":true}'::jsonb,
  'active'
);

insert into public.mpgf_public_goods_rounds (
  id, name, starts_at, ends_at, match_pool_id, qf_enabled,
  qf_cap_multiple, supporter_gate, status
) values (
  'qa-dac-pledge-round-20260806',
  'Synthetic rollback-only DAC pledge round',
  timezone('utc', now()) - interval '1 day',
  timezone('utc', now()) + interval '60 days',
  'qa-dac-pledge-match-20260806',
  false,
  1.5,
  'demo_self_attestation',
  'open'
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
) values (
  '9f666666-6666-4666-8666-666666666666',
  '9a111111-1111-4111-8111-111111111111',
  'QA self-service DAC pool',
  'Synthetic QA problem',
  'Synthetic QA intervention',
  'Synthetic QA moral-public-good rationale',
  'Synthetic QA recipient',
  'Synthetic QA public summary',
  'QA DAC lifecycle',
  1000000,
  500000,
  'One verified QA outcome',
  'No real-world effect; rollback-only database proof',
  'Complete inside this transaction',
  '[]'::jsonb,
  '[]'::jsonb,
  'None; the transaction rolls back',
  '{"summary":"Synthetic QA team"}'::jsonb,
  'submitted',
  timezone('utc', now()),
  'external_charity',
  'qa-dac-pledge-recipient',
  1000000,
  2,
  timezone('utc', now()) + interval '30 days',
  'Synthetic QA evidence',
  'No payment or charge before success',
  'All pledges expire without payment if the DAC lapses',
  0,
  false,
  1.5,
  'signed_intent',
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
      "thresholdId":"qa-dac-threshold-1",
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
    "successProbabilityBps":7500,
    "failureBonusRateBps":1000,
    "expectedEligibleFailureFillBps":4000,
    "expenseLoadBps":25,
    "reserveRiskMarginBps":42
  }'::jsonb
);

select * from public.mpgf_approve_failure_bonus_premium_schedule(
  '9f666666-6666-4666-8666-666666666666',
  '9b222222-2222-4222-8222-222222222222',
  'Approve the rollback-only DAC failure-bonus schedule'
);

select * from public.mpgf_begin_pool_proposal_review(
  '9f666666-6666-4666-8666-666666666666',
  '9b222222-2222-4222-8222-222222222222',
  'Review the rollback-only DAC proposal'
);

select * from public.mpgf_approve_and_freeze_pool_proposal(
  '9f666666-6666-4666-8666-666666666666',
  '9b222222-2222-4222-8222-222222222222',
  'Approve and freeze the rollback-only DAC terms'
);

select * from public.mpgf_publish_pool_proposal(
  '9f666666-6666-4666-8666-666666666666',
  'qa-dac-pledge-round-20260806',
  'qa-self-service-dac-pool',
  '9b222222-2222-4222-8222-222222222222',
  'Publish the rollback-only DAC pool'
);

do $test$
begin
  if not has_function_privilege(
    'authenticated',
    'public.mpgf_create_dac_pledge(text,bigint,text,text,text)',
    'EXECUTE'
  ) then
    raise exception 'Authenticated users cannot execute the DAC pledge RPC.';
  end if;
  if has_function_privilege(
    'anon',
    'public.mpgf_create_dac_pledge(text,bigint,text,text,text)',
    'EXECUTE'
  ) then
    raise exception 'Anonymous users unexpectedly can execute the DAC pledge RPC.';
  end if;
  if to_regclass('public.mpgf_conditional_pledges') is not null then
    raise exception 'A second mutable conditional-pledge ledger exists.';
  end if;
end;
$test$;

select set_config('request.jwt.claim.sub', '9c333333-3333-4333-8333-333333333333', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
set local role authenticated;

do $test$
begin
  begin
    insert into public.mpgf_public_goods_pledges (
      campaign_id, profile_id, user_ref, amount_cents, currency,
      visibility_mode, is_recurring, capture_mode, eligibility_state,
      human_score_bps, status
    ) values (
      'campaign-9f666666666646668666666666666666',
      '9c333333-3333-4333-8333-333333333333',
      'forbidden-direct-dac-pledge',
      1000,
      'usd',
      'private_amount',
      false,
      'signed_intent',
      'pending_review',
      0,
      'pledged'
    );
    raise exception 'Direct insertion into the published DAC campaign unexpectedly succeeded.';
  exception
    when check_violation then null;
  end;
end;
$test$;

select * from public.mpgf_create_dac_pledge(
  'campaign-9f666666666646668666666666666666',
  1000,
  'private_amount',
  null,
  'qa-dac-pledger-one-key'
);

select * from public.mpgf_create_dac_pledge(
  'campaign-9f666666666646668666666666666666',
  1000,
  'private_amount',
  null,
  'qa-dac-pledger-one-key'
);

do $test$
begin
  begin
    perform public.mpgf_create_dac_pledge(
      'campaign-9f666666666646668666666666666666',
      1001,
      'private_amount',
      null,
      'qa-dac-pledger-one-key'
    );
    raise exception 'Conflicting idempotency replay unexpectedly succeeded.';
  exception
    when unique_violation then null;
  end;
end;
$test$;

do $test$
begin
  begin
    update public.mpgf_public_goods_pledges
    set status = 'voided'
    where profile_id = '9c333333-3333-4333-8333-333333333333'
      and pledge_intent_id is not null;
    raise exception 'Pledger directly changed a DAC pledge state.';
  exception
    when insufficient_privilege then null;
  end;
end;
$test$;

reset role;

select set_config('request.jwt.claim.sub', '9d444444-4444-4444-8444-444444444444', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
set local role authenticated;

select * from public.mpgf_create_dac_pledge(
  'campaign-9f666666666646668666666666666666',
  2000,
  'public_supporter',
  null,
  'qa-dac-pledger-two-key'
);

reset role;

select set_config('request.jwt.claim.sub', '9e555555-5555-4555-8555-555555555555', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
set local role authenticated;

do $test$
declare
  visible_intents integer;
  visible_events integer;
begin
  select count(*) into visible_intents from public.mpgf_dac_pledge_intents;
  select count(*) into visible_events from public.mpgf_dac_pledge_events;
  if visible_intents <> 0 or visible_events <> 0 then
    raise exception 'An outsider could read another user''s private DAC consent or event.';
  end if;
end;
$test$;

reset role;

select set_config('request.jwt.claim.sub', '9c333333-3333-4333-8333-333333333333', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
set local role authenticated;

do $test$
declare
  visible_intents integer;
  visible_events integer;
begin
  select count(*) into visible_intents from public.mpgf_dac_pledge_intents;
  select count(*) into visible_events from public.mpgf_dac_pledge_events;
  if visible_intents <> 1 or visible_events <> 1 then
    raise exception 'A pledger could not read exactly their own DAC consent and creation event.';
  end if;
end;
$test$;

reset role;
select set_config('request.jwt.claim.sub', '', true);
select set_config('request.jwt.claim.role', '', true);

update public.mpgf_public_goods_pledges
set eligibility_state = 'eligible',
    human_score_bps = 10000
where campaign_id = 'campaign-9f666666666646668666666666666666'
  and pledge_intent_id is not null;

do $test$
declare
  intent_count integer;
  pledge_count integer;
  event_count integer;
  total_cents bigint;
  supporter_count integer;
  campaign_latch timestamptz;
  proposal_latch timestamptz;
  invalid_binding_count integer;
  payment_object_count integer;
  consent_hash_mismatch integer;
  event_hash_mismatch integer;
begin
  select count(*) into intent_count
  from public.mpgf_dac_pledge_intents
  where campaign_id = 'campaign-9f666666666646668666666666666666';

  select count(*), coalesce(sum(amount_cents), 0), count(distinct profile_id)
  into pledge_count, total_cents, supporter_count
  from public.mpgf_public_goods_pledges
  where campaign_id = 'campaign-9f666666666646668666666666666666'
    and pledge_intent_id is not null
    and eligibility_state = 'eligible'
    and status = 'pledged'
    and expires_at > timezone('utc', now());

  select count(*) into event_count
  from public.mpgf_dac_pledge_events
  where campaign_id = 'campaign-9f666666666646668666666666666666'
    and event_type = 'pledge_created';

  select first_accepted_pledge_at into campaign_latch
  from public.mpgf_public_goods_campaigns
  where id = 'campaign-9f666666666646668666666666666666';

  select first_accepted_pledge_at into proposal_latch
  from public.mpgf_pool_proposals
  where id = '9f666666-6666-4666-8666-666666666666';

  select count(*) into invalid_binding_count
  from public.mpgf_public_goods_pledges as pledge
  join public.mpgf_dac_pledge_intents as intent on intent.id = pledge.pledge_intent_id
  join public.mpgf_public_goods_campaigns as campaign on campaign.id = pledge.campaign_id
  where pledge.campaign_id = 'campaign-9f666666666646668666666666666666'
    and (
      pledge.pool_proposal_id is distinct from campaign.pool_proposal_id
      or pledge.terms_version is distinct from campaign.published_terms_version
      or pledge.terms_sha256 is distinct from campaign.published_terms_sha256
      or intent.pool_proposal_id is distinct from pledge.pool_proposal_id
      or intent.terms_version is distinct from pledge.terms_version
      or intent.terms_sha256 is distinct from pledge.terms_sha256
      or intent.amount_cents is distinct from pledge.amount_cents
      or intent.profile_id is distinct from pledge.profile_id
      or pledge.capture_mode <> 'signed_intent'
      or pledge.is_recurring
    );

  select count(*) into payment_object_count
  from public.mpgf_public_goods_pledges
  where campaign_id = 'campaign-9f666666666646668666666666666666'
    and (
      payment_intent_ref is not null
      or status = 'captured'
    );

  select count(*) into consent_hash_mismatch
  from public.mpgf_dac_pledge_intents
  where campaign_id = 'campaign-9f666666666646668666666666666666'
    and (
      consent_sha256 <> public.mpgf_dac_json_sha256(consent_json)
      or consent_json ->> 'mechanism' <> 'dominant_assurance_contract'
      or consent_json ->> 'pledgeMode' <> 'pledge_only'
      or (consent_json #>> '{payment,authorized}')::boolean
      or (consent_json #>> '{payment,mandateCreated}')::boolean
      or (consent_json #>> '{payment,charged}')::boolean
    );

  select count(*) into event_hash_mismatch
  from public.mpgf_dac_pledge_events
  where campaign_id = 'campaign-9f666666666646668666666666666666'
    and event_sha256 <> public.mpgf_dac_json_sha256(event_json);

  if intent_count <> 2
     or pledge_count <> 2
     or event_count <> 2
     or total_cents <> 3000
     or supporter_count <> 2
     or campaign_latch is null
     or proposal_latch is null
     or invalid_binding_count <> 0
     or payment_object_count <> 0
     or consent_hash_mismatch <> 0
     or event_hash_mismatch <> 0 then
    raise exception
      'DAC pledge invariant failed: intents %, pledges %, events %, cents %, supporters %, campaign latch %, proposal latch %, invalid bindings %, payments %, consent hashes %, event hashes %',
      intent_count, pledge_count, event_count, total_cents, supporter_count,
      campaign_latch, proposal_latch, invalid_binding_count, payment_object_count,
      consent_hash_mismatch, event_hash_mismatch;
  end if;
end;
$test$;

do $test$
declare
  intent_id_value uuid;
  pledge_id_value uuid;
  event_id_value uuid;
begin
  select id into intent_id_value
  from public.mpgf_dac_pledge_intents
  where profile_id = '9c333333-3333-4333-8333-333333333333';

  select id into pledge_id_value
  from public.mpgf_public_goods_pledges
  where profile_id = '9c333333-3333-4333-8333-333333333333'
    and pledge_intent_id = intent_id_value;

  select id into event_id_value
  from public.mpgf_dac_pledge_events
  where pledge_id = pledge_id_value;

  begin
    update public.mpgf_dac_pledge_intents
    set amount_cents = amount_cents + 1
    where id = intent_id_value;
    raise exception 'Immutable DAC pledge intent unexpectedly changed.';
  exception
    when check_violation then null;
  end;

  begin
    update public.mpgf_dac_pledge_events
    set amount_cents = amount_cents + 1
    where id = event_id_value;
    raise exception 'Immutable DAC pledge event unexpectedly changed.';
  exception
    when check_violation then null;
  end;

  begin
    update public.mpgf_public_goods_pledges
    set amount_cents = amount_cents + 1
    where id = pledge_id_value;
    raise exception 'Canonical DAC pledge amount unexpectedly changed.';
  exception
    when check_violation then null;
  end;

  begin
    delete from public.mpgf_public_goods_pledges where id = pledge_id_value;
    raise exception 'Canonical DAC pledge unexpectedly deleted.';
  exception
    when check_violation then null;
  end;
end;
$test$;

rollback;
