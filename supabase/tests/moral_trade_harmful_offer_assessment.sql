-- Included inside a transaction after the two harmful-offer migrations.
insert into auth.users (
  id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, confirmation_token, recovery_token,
  email_change_token_new, email_change_token_current, reauthentication_token,
  is_sso_user, is_anonymous, created_at, updated_at
) values (
  '5c333333-3333-4333-8333-333333333333',
  '00000000-0000-0000-0000-000000000000',
  'authenticated', 'authenticated', 'harm-assessment-owner@example.test', '', now(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{"display_name":"Harm Assessment Owner","qa_fixture":true}'::jsonb,
  '', '', '', '', '', false, false, now(), now()
) on conflict (id) do nothing;

insert into public.profiles (id, email, display_name, bio, affiliation)
values (
  '5c333333-3333-4333-8333-333333333333',
  'harm-assessment-owner@example.test',
  'Harm Assessment Owner',
  '',
  ''
) on conflict (id) do nothing;

do $test$
declare
  actor_id constant uuid := '5c333333-3333-4333-8333-333333333333';
  safe_payload jsonb;
  blocked_payload jsonb;
  safe_assessment jsonb;
  blocked_assessment jsonb;
  model_only_block jsonb;
  review_assessment jsonb;
  blocked_result record;
  safe_result record;
  review_result record;
  appeal_result record;
  rate_result record;
  allowed_count integer := 0;
  index_value integer;
begin
  safe_payload := jsonb_build_object(
    'interfaceVersion', 'moral_trade_create_v1',
    'submissionKey', 'harm-sql-safe',
    'cause', 'Global health',
    'requestKind', 'commitment',
    'fundMode', null,
    'dacPath', null,
    'requestAction', 'Volunteer at a food bank for one hour',
    'existingPoolAmount', '',
    'existingPoolCurrency', 'USD',
    'offers', jsonb_build_array(
      jsonb_build_object(
        'id', 'skill',
        'title', 'Skilled work',
        'options', jsonb_build_array(
          jsonb_build_object('work', 'Proofread one public-health brief', 'scope', 'one hour')
        )
      )
    ),
    'pool', null
  );
  blocked_payload := jsonb_set(
    jsonb_set(safe_payload, '{submissionKey}', '"harm-sql-blocked"'::jsonb),
    '{requestAction}',
    '"Pay us or else we will harm a person"'::jsonb
  );

  safe_assessment := jsonb_build_object(
    'schemaVersion', 'moral-trade-harmful-offer-assessment-v2',
    'policyVersion', 'pluralist-harm-policy-2026-08-06-v2',
    'trigger', 'publication',
    'route', 'allow',
    'enforcementBasis', 'completed_low_risk_assessment',
    'summary', 'Every automatic-permission criterion passed.',
    'sourceHash', repeat('1', 64),
    'assessedAt', timezone('utc', now()),
    'findings', '[]'::jsonb,
    'unresolvedQuestions', '[]'::jsonb,
    'recommendedControls', '[]'::jsonb,
    'lowRiskAssessment', jsonb_build_object(
      'overallConfidence', 0.96,
      'evidenceQuality', 'strong',
      'reversibilityConcern', 'low',
      'contestedMoralFrame', false,
      'thirdPartyEffectSeverity', 'low',
      'legitimateVetoHolderIdentified', false,
      'humanOnlySensitiveDomain', false,
      'baselineComparison', 'better_or_equal',
      'plausibleSevereHarm', false,
      'dependentPartyRisk', false,
      'opaqueCoercionIncentives', false
    ),
    'automaticPermitCriteria', jsonb_build_object('passed', true, 'failedCriteria', '[]'::jsonb),
    'ruleAssessment', jsonb_build_object('status', 'completed', 'findingCount', 0, 'hardPolicyBlockCount', 0),
    'modelAssessment', jsonb_build_object('status', 'completed', 'model', 'qa', 'findingCount', 0, 'note', null)
  );

  blocked_assessment := jsonb_build_object(
    'schemaVersion', 'moral-trade-harmful-offer-assessment-v2',
    'policyVersion', 'pluralist-harm-policy-2026-08-06-v2',
    'trigger', 'publication',
    'route', 'block',
    'enforcementBasis', 'deterministic_hard_policy',
    'summary', 'Categorical deterministic rule.',
    'sourceHash', repeat('2', 64),
    'assessedAt', timezone('utc', now()),
    'findings', jsonb_build_array(jsonb_build_object(
      'id', 'rule:qa',
      'reasonCode', 'HARD_EXTORTION_OR_VALUE_DESTROYING_THREAT',
      'dimension', 'coercion_threats_extortion',
      'severity', 'critical',
      'confidence', 0.99,
      'title', 'Extortion',
      'explanation', 'Direct operational threat.',
      'evidence', jsonb_build_array('$.requestAction'),
      'affectedFields', jsonb_build_array('$.requestAction'),
      'policyBasis', 'Categorical threat policy.',
      'recommendedControls', jsonb_build_array('Remove the threat.'),
      'source', 'rule',
      'hardPolicyBlock', true
    )),
    'unresolvedQuestions', '[]'::jsonb,
    'recommendedControls', jsonb_build_array('Remove the threat.'),
    'lowRiskAssessment', jsonb_build_object(
      'overallConfidence', 0,
      'evidenceQuality', 'thin',
      'reversibilityConcern', 'high',
      'contestedMoralFrame', true,
      'thirdPartyEffectSeverity', 'high',
      'legitimateVetoHolderIdentified', true,
      'humanOnlySensitiveDomain', false,
      'baselineComparison', 'worse',
      'plausibleSevereHarm', true,
      'dependentPartyRisk', true,
      'opaqueCoercionIncentives', true
    ),
    'automaticPermitCriteria', jsonb_build_object(
      'passed', false,
      'failedCriteria', jsonb_build_array('DETERMINISTIC_HARD_POLICY_FINDING')
    ),
    'ruleAssessment', jsonb_build_object('status', 'completed', 'findingCount', 1, 'hardPolicyBlockCount', 1),
    'modelAssessment', jsonb_build_object('status', 'not_requested', 'model', null, 'findingCount', 0, 'note', null)
  );

  select * into blocked_result
  from public.moral_trade_create_submit_with_harm_assessment_service(
    actor_id,
    'harm-sql-blocked',
    'pledge_swap',
    blocked_payload,
    repeat('b', 64),
    'Global health',
    'commitment',
    'Pay us or else we will harm a person',
    'Skilled work: Proofread one public-health brief',
    safe_payload -> 'offers',
    null,
    '{}'::jsonb,
    blocked_assessment
  );
  if blocked_result.harm_route <> 'block'
     or blocked_result.submission_id is not null
     or blocked_result.harm_assessment_id is null then
    raise exception 'Deterministic block did not return a private assessment-only receipt: %', blocked_result;
  end if;
  if exists (
    select 1 from public.moral_trade_create_submissions
    where owner_profile_id = actor_id and submission_key = 'harm-sql-blocked'
  ) then
    raise exception 'A new deterministic block created a target submission.';
  end if;

  select * into safe_result
  from public.moral_trade_create_submit_with_harm_assessment_service(
    actor_id,
    'harm-sql-safe',
    'pledge_swap',
    safe_payload,
    repeat('c', 64),
    'Global health',
    'commitment',
    'Volunteer at a food bank for one hour',
    'Skilled work: Proofread one public-health brief',
    safe_payload -> 'offers',
    null,
    '{}'::jsonb,
    safe_assessment
  );
  if safe_result.harm_route <> 'allow'
     or safe_result.submission_id is null
     or safe_result.submission_status <> 'pending_review' then
    raise exception 'Safe assessment did not create the expected private pending-review target: %', safe_result;
  end if;

  model_only_block := jsonb_set(
    jsonb_set(blocked_assessment, '{findings,0,source}', '"model"'::jsonb),
    '{sourceHash}',
    to_jsonb(repeat('3', 64))
  );
  begin
    perform public.moral_trade_create_submit_with_harm_assessment_service(
      actor_id,
      'harm-sql-model-block',
      'pledge_swap',
      jsonb_set(safe_payload, '{submissionKey}', '"harm-sql-model-block"'::jsonb),
      repeat('d', 64),
      'Global health',
      'commitment',
      'Volunteer at a food bank for one hour',
      'Skilled work: Proofread one public-health brief',
      safe_payload -> 'offers',
      null,
      '{}'::jsonb,
      model_only_block
    );
    raise exception 'A model-only finding was allowed to create an automatic block.';
  exception when check_violation then null;
  end;

  review_assessment := jsonb_set(
    jsonb_set(
      jsonb_set(blocked_assessment, '{route}', '"human_review"'::jsonb),
      '{enforcementBasis}',
      '"human_review_required"'::jsonb
    ),
    '{ruleAssessment,hardPolicyBlockCount}',
    '0'::jsonb
  );
  review_assessment := jsonb_set(review_assessment, '{findings,0,hardPolicyBlock}', 'false'::jsonb);
  review_assessment := jsonb_set(review_assessment, '{findings,0,reasonCode}', '"REVIEW_SEXUAL_OR_ROMANTIC_EXCHANGE"'::jsonb);
  review_assessment := jsonb_set(review_assessment, '{findings,0,dimension}', '"sexual_or_romantic_relationship_exchange"'::jsonb);
  review_assessment := jsonb_set(review_assessment, '{lowRiskAssessment,humanOnlySensitiveDomain}', 'true'::jsonb);
  review_assessment := jsonb_set(review_assessment, '{sourceHash}', to_jsonb(repeat('4', 64)));

  select * into review_result
  from public.moral_trade_create_submit_with_harm_assessment_service(
    actor_id,
    'harm-sql-review',
    'pledge_swap',
    jsonb_set(safe_payload, '{submissionKey}', '"harm-sql-review"'::jsonb),
    repeat('e', 64),
    'Global health',
    'commitment',
    'Volunteer at a food bank for one hour',
    'Skilled work: Proofread one public-health brief',
    safe_payload -> 'offers',
    null,
    '{}'::jsonb,
    review_assessment
  );
  if review_result.harm_route <> 'human_review' or review_result.submission_id is null then
    raise exception 'Human-only sensitive review did not remain private with a durable target: %', review_result;
  end if;

  select * into appeal_result
  from public.moral_trade_request_harm_assessment_appeal_service(
    actor_id,
    blocked_result.harm_assessment_id,
    'ordinary',
    'The operational text was classified incorrectly and should be reconsidered.',
    '{}'::jsonb
  );
  if appeal_result.appeal_id is null or appeal_result.appeal_status <> 'pending' then
    raise exception 'Ordinary reconsideration did not create a durable pending receipt: %', appeal_result;
  end if;
  begin
    perform public.moral_trade_request_harm_assessment_appeal_service(
      actor_id,
      blocked_result.harm_assessment_id,
      'ordinary',
      'A duplicate ordinary reconsideration should not be accepted by the service.',
      '{}'::jsonb
    );
    raise exception 'A second ordinary appeal was accepted.';
  exception when unique_violation then null;
  end;

  for index_value in 1..13 loop
    select * into rate_result
    from public.moral_trade_claim_harm_assessment_rate_limit_service(actor_id, 'live_draft');
    if rate_result.allowed then
      allowed_count := allowed_count + 1;
    end if;
  end loop;
  if allowed_count <> 12 then
    raise exception 'Rate-limit service allowed % of 13 requests; expected 12.', allowed_count;
  end if;
end;
$test$;

select 'moral_trade_harmful_offer_assessment_sql_ok' as result;
