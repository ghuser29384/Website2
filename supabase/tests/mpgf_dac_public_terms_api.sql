begin;

insert into auth.users(
  id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) values
  ('ba111111-1111-4111-8111-111111111111','authenticated','authenticated','dac-public-terms-creator@example.test','',now(),'{}','{}',now(),now()),
  ('bb222222-2222-4222-8222-222222222222','authenticated','authenticated','dac-public-terms-reviewer@example.test','',now(),'{}','{}',now(),now())
on conflict (id) do nothing;

insert into public.profiles(id, email, display_name, bio, affiliation)
values
  ('ba111111-1111-4111-8111-111111111111','dac-public-terms-creator@example.test','DAC Public Terms Creator','','Moral Trade QA'),
  ('bb222222-2222-4222-8222-222222222222','dac-public-terms-reviewer@example.test','DAC Public Terms Reviewer','','Moral Trade QA')
on conflict (id) do update
set email = excluded.email, display_name = excluded.display_name;

insert into public.mpgf_pool_reviewers(
  reviewer_id, active, authorized_by, rationale, expires_at
) values (
  'bb222222-2222-4222-8222-222222222222',
  true,
  'bb222222-2222-4222-8222-222222222222',
  'Rollback-only public DAC terms reviewer',
  clock_timestamp() + interval '1 hour'
);

insert into public.mpgf_public_goods_match_pools (
  id, funder_type, budget_cents, base_match_ratio, qf_bonus_cents,
  visible_commitment, restrictions_json, status
) values (
  'qa-dac-public-terms-match-20260807',
  'demo_common_ground_pool',
  0,
  0,
  0,
  'Synthetic rollback-only public terms match pool.',
  '{"qa":true,"noCustody":true}'::jsonb,
  'active'
);

insert into public.mpgf_public_goods_rounds (
  id, name, starts_at, ends_at, match_pool_id, qf_enabled,
  qf_cap_multiple, supporter_gate, status
) values (
  'qa-dac-public-terms-round-20260807',
  'Synthetic rollback-only public terms round',
  timezone('utc', now()) - interval '1 day',
  timezone('utc', now()) + interval '60 days',
  'qa-dac-public-terms-match-20260807',
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
  'bc333333-3333-4333-8333-333333333333',
  'ba111111-1111-4111-8111-111111111111',
  'QA public exact DAC terms',
  'Synthetic QA problem',
  'Synthetic QA intervention',
  'Synthetic QA public-good rationale',
  'Synthetic QA recipient',
  'Synthetic QA public summary',
  'QA DAC public terms',
  10000,
  10000,
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
  'qa-dac-public-terms-recipient',
  10000,
  2,
  timezone('utc', now()) + interval '30 days',
  'Synthetic QA evidence review',
  'Only incremental support counts',
  'Signed intents expire without payment after lapse',
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
      "thresholdId":"qa-public-terms-threshold-1",
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
  }'::jsonb,
  'pending_review',
  201,
  201,
  'pool_creator_or_sponsor',
  'mpgf_failure_bonus_success_premium_v0_1',
  false,
  true,
  10201,
  '{
    "successProbabilityBps":7500,
    "failureBonusRateBps":1000,
    "expectedEligibleFailureFillBps":4000,
    "expenseLoadBps":25,
    "reserveRiskMarginBps":42
  }'::jsonb
);

insert into public.moral_trade_create_submissions (
  id, owner_profile_id, submission_key, interface_version, submission_kind,
  cause_area, request_kind, requested_action, offered_terms_json,
  pool_terms_json, source_payload_json, source_payload_hash,
  target_type, target_id, status, canonical_path
) values (
  'bd444444-4444-4444-8444-444444444444',
  'ba111111-1111-4111-8111-111111111111',
  'qa-public-dac-terms-submission',
  'moral_trade_create_v1',
  'pool_create',
  'QA DAC public terms',
  'fund',
  'Fund the synthetic QA recipient only under the exact DAC thresholds',
  '[]'::jsonb,
  '{"qa":true}'::jsonb,
  '{"qa":true,"mechanism":"dominant_assurance_contract"}'::jsonb,
  repeat('d', 64),
  'mpgf_pool_proposal',
  'bc333333-3333-4333-8333-333333333333',
  'pending_review',
  '/mpgf/pools/proposals/bc333333-3333-4333-8333-333333333333'
);

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
) values (
  'bc333333-3333-4333-8333-333333333333',
  'bd444444-4444-4444-8444-444444444444',
  '[10000]'::jsonb,
  (select public_goods_deadline_at from public.mpgf_pool_proposals where id = 'bc333333-3333-4333-8333-333333333333'),
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
);

select * from public.mpgf_approve_failure_bonus_premium_schedule(
  'bc333333-3333-4333-8333-333333333333',
  'bb222222-2222-4222-8222-222222222222',
  'Approve the rollback-only public terms premium schedule'
);
select * from public.mpgf_begin_pool_proposal_review(
  'bc333333-3333-4333-8333-333333333333',
  'bb222222-2222-4222-8222-222222222222',
  'Begin exact public terms review'
);
select * from public.mpgf_approve_and_freeze_pool_proposal(
  'bc333333-3333-4333-8333-333333333333',
  'bb222222-2222-4222-8222-222222222222',
  'Approve and freeze the exact public DAC terms'
);
select * from public.mpgf_publish_pool_proposal(
  'bc333333-3333-4333-8333-333333333333',
  'qa-dac-public-terms-round-20260807',
  'qa-dac-public-exact-terms',
  'bb222222-2222-4222-8222-222222222222',
  'Publish the exact public DAC terms'
);

set local role anon;

do $test$
declare
  terms_by_id jsonb;
  terms_by_slug jsonb;
  serialized text;
  campaign_hash text;
begin
  terms_by_id := public.mpgf_public_dac_campaign_terms(
    'campaign-bc333333333343338333333333333333'
  );
  terms_by_slug := public.mpgf_public_dac_campaign_terms(
    'qa-dac-public-exact-terms'
  );

  select published_terms_sha256 into campaign_hash
  from public.mpgf_public_goods_campaigns
  where id = 'campaign-bc333333333343338333333333333333';

  serialized := terms_by_id::text;

  if terms_by_id is null
     or terms_by_slug is distinct from terms_by_id
     or terms_by_id ->> 'schemaVersion' <> 'mpgf_dac_public_terms_v1'
     or terms_by_id ->> 'mechanism' <> 'dominant_assurance_contract'
     or terms_by_id ->> 'campaignId' <> 'campaign-bc333333333343338333333333333333'
     or terms_by_id ->> 'poolProposalId' <> 'bc333333-3333-4333-8333-333333333333'
     or (terms_by_id ->> 'termsVersion')::integer <> 1
     or terms_by_id ->> 'termsSha256' <> campaign_hash
     or (terms_by_id #>> '{threshold,netRecipientAmountCents}')::bigint <> 10000
     or (terms_by_id #>> '{threshold,minimumSupporters}')::integer <> 2
     or (terms_by_id #>> '{failureBonus,rateBps}')::integer <> 1000
     or terms_by_id #>> '{failureBonus,scheduleStatus}' <> 'approved'
     or (terms_by_id #>> '{successPremium,amountCents}')::bigint <> 201
     or (terms_by_id #>> '{successPremium,grossSuccessRequirementCents}')::bigint <> 10201
     or (terms_by_id #>> '{successPremium,provisional}')::boolean
     or terms_by_id #>> '{createPoolTerms,failureBonusBaseType}' <> 'percentage'
     or terms_by_id #>> '{createPoolTerms,failureBonusTimingMode}' <> 'all'
     or (terms_by_id #>> '{createPoolTerms,moralTradeFailureBonusShareBps}')::integer <> 500
     or terms_by_id #>> '{createPoolTerms,additionalActivationRule}' <> 'The synthetic recipient must remain independently verifiable.'
     or (terms_by_id #>> '{payment,paymentMethodCollected}')::boolean
     or (terms_by_id #>> '{payment,authorized}')::boolean
     or (terms_by_id #>> '{payment,charged}')::boolean
     or (terms_by_id #>> '{payment,captured}')::boolean
     or (terms_by_id #>> '{payment,settled}')::boolean
     or (terms_by_id #>> '{payment,failureBonusPaid}')::boolean
     or serialized ilike '%proposer_id%'
     or serialized ilike '%reviewed_by%'
     or serialized ilike '%review_reason%'
     or serialized ilike '%idempotency%'
     or serialized ilike '%pledge_intent%'
     or serialized ilike '%@example.test%'
     or public.mpgf_public_dac_campaign_terms('does-not-exist') is not null then
    raise exception 'Public exact DAC terms were incomplete, mismatched, payment-claiming, or privacy-unsafe: %', terms_by_id;
  end if;
end;
$test$;

reset role;

do $test$
declare
  payment_rows integer;
begin
  if not has_function_privilege(
    'anon',
    'public.mpgf_public_dac_campaign_terms(text)',
    'EXECUTE'
  ) or not has_function_privilege(
    'authenticated',
    'public.mpgf_public_dac_campaign_terms(text)',
    'EXECUTE'
  ) then
    raise exception 'Public readers cannot execute the sanitized exact DAC terms function.';
  end if;

  if has_table_privilege('anon', 'public.mpgf_pool_proposal_versions', 'SELECT') then
    raise exception 'Anonymous readers unexpectedly can select private immutable proposal-version rows.';
  end if;

  select count(*) into payment_rows
  from public.mpgf_public_goods_pledges
  where campaign_id = 'campaign-bc333333333343338333333333333333'
    and (payment_intent_ref is not null or status = 'captured');

  if payment_rows <> 0 then
    raise exception 'Publishing or reading exact DAC terms unexpectedly created payment state.';
  end if;
end;
$test$;

rollback;
