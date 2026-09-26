-- The prelude starts the transaction and installs transaction-scoped cleanup.
create temporary table impact_phase1_test_state (
  snapshot_id uuid,
  state_as_of timestamptz,
  expires_at timestamptz
) on commit drop;
grant select, insert, update on impact_phase1_test_state to service_role, authenticated;

do $schema$
declare
  missing_migrations text[];
begin
  select array_agg(expected.version || ':' || expected.name order by expected.version)
  into missing_migrations
  from (
    values
      ('20260806105809', 'commitments_impact_accounting_foundation'),
      ('20260806105950', 'commitments_impact_accounting_foundation_schema_v1'),
      ('20260806111657', 'commitments_impact_model_health_activation_guard'),
      ('20260806111933', 'commitments_impact_refresh_queue_rpcs'),
      ('20260806114145', 'commitments_impact_accounting_integrity_hardening'),
      ('20260806115641', 'commitments_impact_methodology_guard_and_governance_audit'),
      ('20260806120552', 'commitments_impact_approver_audit_identity_hardening'),
      ('20260806134107', 'commitments_impact_initial_approver'),
      ('20260806135201', 'commitments_impact_approver_event_comment_fix'),
      ('20260810013845', 'commitments_impact_present_stage_authenticated_approver'),
      ('20260810150350', 'commitments_impact_methodology_review_remediation'),
      ('20260810151733', 'commitments_impact_methodology_remediation_privileges'),
      ('20260810152035', 'commitments_impact_snapshot_overlap_alias_fix')
  ) as expected(version, name)
  where not exists (
    select 1
    from supabase_migrations.schema_migrations migration
    where migration.version = expected.version
      and migration.name = expected.name
  );

  if missing_migrations is not null then
    raise exception 'Missing Phase 1 migrations: %', missing_migrations;
  end if;

  if to_regprocedure('public.impact_accounting_assert_methodology_for_approval(jsonb,text,text)') is null
    or to_regprocedure('public.publish_impact_estimate_snapshot(uuid,text,text,uuid,text,text,timestamp with time zone,timestamp with time zone,jsonb)') is null
    or to_regprocedure('public.set_impact_model_approver(uuid,boolean,text,uuid)') is null
  then
    raise exception 'A required remediation RPC is missing.';
  end if;
end;
$schema$;

insert into auth.users (
  id,
  email,
  email_confirmed_at,
  aud,
  role,
  created_at,
  updated_at,
  raw_app_meta_data,
  raw_user_meta_data,
  is_sso_user,
  is_anonymous
) values
  (
    '7a100000-0000-4000-8000-000000000001',
    'impact-approver-qa@example.invalid',
    now(),
    'authenticated',
    'authenticated',
    now(),
    now(),
    '{}'::jsonb,
    '{}'::jsonb,
    false,
    false
  ),
  (
    '7a100000-0000-4000-8000-000000000002',
    'impact-participant-qa@example.invalid',
    now(),
    'authenticated',
    'authenticated',
    now(),
    now(),
    '{}'::jsonb,
    '{}'::jsonb,
    false,
    false
  ),
  (
    '7a100000-0000-4000-8000-000000000003',
    'impact-outsider-qa@example.invalid',
    now(),
    'authenticated',
    'authenticated',
    now(),
    now(),
    '{}'::jsonb,
    '{}'::jsonb,
    false,
    false
  );

select set_config(
  'request.jwt.claims',
  jsonb_build_object(
    'sub', '7a100000-0000-4000-8000-000000000001',
    'role', 'service_role',
    'aal', 'aal1'
  )::text,
  true
);
set local role service_role;

select (public.set_impact_model_approver(
  '7a100000-0000-4000-8000-000000000001',
  true,
  'Transactional methodology-remediation QA approver.',
  '7a100000-0000-4000-8000-000000000001'
)).*;

insert into public.impact_model_versions (
  id,
  mechanism_family,
  model_key,
  version,
  lifecycle_status,
  methodology,
  methodology_hash,
  approval_blockers,
  created_by
) values (
  '7a100000-0000-4000-8000-000000000010',
  'threshold_funding',
  'qa-threshold-impact-v2',
  2,
  'draft',
  $methodology${"schemaVersion":"moral-trade-impact-model-methodology-v1","mechanismFamily":"threshold_funding","modelKey":"qa-threshold-impact-v2","displayName":"QA threshold-funding methodology-remediation fixture","estimands":["success_case_additional","expected_additional","direct_causal_attribution","verified_outcome","cooperative_allocation","platform_funded_bonus"],"estimandDefinitions":{"success_case_additional":"Other eligible participant funding activated on success, excluding the focal pledge, unconditional baseline funding, refunds, duplicates, and platform-funded bonuses.","expected_additional":"The validated with-pledge versus without-pledge change in threshold-success probability multiplied by other eligible funding. It is withheld without an interference-aware causal design.","direct_causal_attribution":"The focal pledge's marginal effect under the validated pledge-arrival design, capped at other eligible funding and defaulting to non-additive across participants.","verified_outcome":"Eligible funding captured or externally verified after resolution, net of refunds and duplicates. This verifies funding occurrence, not the focal pledge's causal effect.","cooperative_allocation":"A non-additive Shapley allocation of coalition-created eligible funding under the frozen threshold ledger.","platform_funded_bonus":"A failure bonus or subsidy paid by Moral Trade or a sponsor, labeled separately and excluded from participant-caused totals."},"baselineDefinition":"Immediately before pledge exposure, freeze threshold, deadline, eligibility, supporter rule, ledger, funded amount, pledge, payment state, refund rules, failure-bonus design, and off-platform funding.","causalIdentificationPolicy":{"estimand":"The causal estimand is the difference in threshold success and other eligible funding captured under the focal pledge's presence versus absence at the same pre-exposure pool state.","designStatus":"specified_not_validated","admissibleDesigns":["randomized pledge invitation or reminder with noncompliance and spillover analysis","pre-specified discontinuity or randomized bonus-design arm with interference-aware analysis"],"interferencePolicy":"Represent how the focal pledge changes later pledge arrivals, withdrawals, and payment behavior. Use an exposure mapping or cluster design; do not assume independent pledges.","overlapAndPositivityPolicy":"Estimate causal effects only in states with empirical support for both the with-participant and without-participant conditions. Fail closed when overlap or positivity is materially violated.","sensitivityAnalysisPolicy":"Report pre-specified sensitivity analyses for unmeasured confounding, baseline misclassification, and interference. Withhold causal components when conclusions are not robust to the approved bounds.","noDefensibleDesignAction":"withhold_causal_components"},"evidenceSemanticsPolicy":{"outcomeEvidenceLabel":"verified_outcome","additionalityLabel":"assessed_additionality","receiptAloneEstablishesAdditionality":false,"publicCopyRule":"Evidence may establish that an outcome occurred and its quantity. It must not be described as verified impact or verified additionality; causal additionality remains an assessed model output."},"strategicBehaviorPolicy":{"baselineAntecedenceRule":"A baseline can support additionality only when its material evidence predates the participant-facing offer or commitment and survives post-resolution consistency checks.","strategicTimingRule":"Freeze the ledger before exposure and detect pledge splitting, strategic delay, coordinated timing, and post-deadline edits.","interferenceRule":"Represent how the focal pledge changes later pledge arrivals, withdrawals, and payment behavior. Use an exposure mapping or cluster design; do not assume independent pledges.","perverseIncentiveRule":"Reject designs that reward manufactured shortfalls or threats; keep failure bonuses outside participant-caused accounting.","manipulationChecks":["identity and pledge deduplication","off-platform funding reconciliation","bonus-arm balance check","strategic timing diagnostic"]},"algorithmDescription":"Compute deterministic other eligible funding. Predict threshold success and payment capture separately. Estimate with-pledge versus without-pledge effects only through a pre-specified interference-aware pledge-arrival design. Treat failure-bonus design as a treatment feature whose sign and magnitude require identification; never assume a beneficial response. Record captured funding and platform bonuses as separate outcomes.","referenceClassPolicy":{"strategy":"hierarchical","narrowFields":["threshold band","progress band","deadline band","supporter-count band","pledge-size distribution","cause area","bonus-design arm"],"broadeningOrder":["cause area","pledge-size distribution","supporter-count band","threshold band","mechanism family"],"minimumSampleSize":60,"noDefensibleClassAction":"withhold","uncertaintyExpansionRule":"Reference classes support outcome prediction, not causal identification. Expand the 80% predictive interval at every approved broadening step and withhold when no defensible class remains."},"uncertaintyPolicy":{"intervalLevelBps":8000,"method":"Use a pre-specified hierarchical predictive model and propagate parameter, outcome, baseline, interference, and measurement uncertainty by posterior or repeated-sampling simulation.","confidencePolicy":"The initial sample-size and calibration cutoffs are provisional governance floors. Low or moderate confidence may be shown only after a current health pass. High confidence is forbidden until temporal or otherwise independent holdout validation and uncertainty-aware calibration criteria are approved.","drivers":["causal-design validity","reference-class fit","baseline credibility","interference and strategic response","outcome measurement","state freshness"]},"validationPolicy":{"thresholdStatus":"provisional","highConfidenceAllowed":false,"requiredBeforeHighConfidence":["pre-registered temporal or otherwise independent holdout evaluation","uncertainty intervals for calibration intercept, slope, and interval coverage","out-of-sample sample-size and reference-class justification","documented robustness to approved confounding and interference sensitivity analyses"]},"freshnessPolicy":{"maxAgeSeconds":900,"requireStateHash":true,"requiredStateFields":["threshold terms","deadline","eligible pledge ledger","funded amount","supporter count","focal pledge","payment and refund state","bonus design","pool lifecycle"],"invalidateOnLifecycleStates":["succeeded","lapsed","cancelled","settled","refunded","superseded"]},"healthPolicy":{"requiredCalibrationMetrics":["eligible resolved-observation count","out-of-sample 80% interval coverage with uncertainty","out-of-sample probability calibration intercept and slope with uncertainty","out-of-sample Brier or proper scoring-rule result","causal-design status and sensitivity-analysis result","overlap or positivity diagnostics","out-of-domain input rate","required-state-field missingness rate"],"blockedConditions":["no current exact-hash methodology approval","no current passing model-health snapshot","causal identification design is not validated","empirical calibration evidence is absent or ineligible","required state is missing or does not match the immutable state hash","input is outside the approved domain","unresolved evidence-integrity, duplication, or overlap failure","available modeled component would be published under blocked, warning, or stale health"],"warningConditions":["reference class broadened beyond the narrowest approved class","provisional confidence thresholds remain unvalidated","material reliance on participant attestation rather than independent outcome evidence","calibration drift remains within a non-blocking warning band"]},"sourceDataRequirements":["immutable threshold, deadline, eligibility, refund, and bonus rules","participant-scoped pledge and payment ledger with deduplication keys","off-platform and unconditional funding baseline","resolution, capture, refund, and external receipt evidence","separate platform or sponsor subsidy ledger","audited resolved threshold and dominant-assurance outcomes"],"conceptualBasisRefs":["source:toby-ord-moral-trade-2015","source:forethought-convergence-and-compromise-2025","source:forethought-moral-public-goods-2026"],"calibrationEvidenceRefs":[],"knownFailureModes":["predictive pledge-arrival model is treated as causal pivotality","strategic timing or pledge splitting changes other arrivals","duplicate or ineligible supporters inflate the ledger","off-platform funding is omitted","bonus response is assumed positive without identification","platform bonus is mislabeled as participant impact"],"outOfDomainConditions":["mutable threshold, deadline, or eligibility terms","private pool whose ledger cannot be audited","non-monetary threshold without a separate native-unit model","threat, coercion, or perverse-incentive design","no interference-aware pledge-arrival identification design"],"materialChangeTriggers":["threshold or bonus semantics change","pledge-arrival design changes","coalition characteristic function changes","causal-identification design or sensitivity-analysis policy changes","evidence semantics or public outcome-label changes","strategic-behavior or interference policy changes","provisional validation thresholds or high-confidence rule changes"],"aggregationPolicy":{"directAndCooperativeNeverSummed":true,"heterogeneousNativeUnitsRemainSeparate":true,"directMarginalEffectsDefaultNonAdditive":true,"additiveClaimRequirement":"A causal component may enter an additive caused-total only when every underlying resource or action has a stable unique claim reference and no claim reference appears in another additive component.","overlapHandling":"Outcome quantities may appear in explanatory views but verified outcomes are not caused totals. Direct marginal effects default to non-additive. Cooperative allocation is an alternative lens. Any additive causal aggregate requires unique claim references and must reject overlap."},"shapleyPolicy":{"enabled":true,"characteristicFunctionDefinition":"For each eligible participant subset, coalition value is other eligible funding activated under the frozen threshold, deadline, payment, refund, and bonus rules, excluding unconditional funding and platform subsidies.","maximumExactPlayers":10,"approximationMethod":"Above 10 participants, use deterministic seeded permutations and withhold when Monte Carlo error or coalition monotonicity diagnostics fail."},"parameters":{"minimumEligibleResolvedObservations":60,"minimumSampleStatus":"provisional_governance_floor","publicationRule":"render deterministic terms and verified outcomes when valid; withhold every modeled causal component unless the exact active model has a current passing health snapshot","successCaseExcludesParticipantOwnPledge":true,"successCaseExcludesPlatformFundedBonus":true,"bonusEffectSignAssumed":false,"qaOnly":true}}$methodology$::jsonb,
  'sha256:1111111111111111111111111111111111111111111111111111111111111111',
  array[
    'causal_identification_design_not_validated',
    'empirical_calibration_evidence_not_registered',
    'provisional_confidence_thresholds_not_validated'
  ],
  '7a100000-0000-4000-8000-000000000001'
);

reset role;

-- An authenticated outsider cannot submit or review.
select set_config(
  'request.jwt.claims',
  jsonb_build_object(
    'sub', '7a100000-0000-4000-8000-000000000003',
    'role', 'authenticated',
    'aal', 'aal1'
  )::text,
  true
);
set local role authenticated;

do $outsider$
begin
  begin
    perform public.submit_impact_model_version_for_review(
      '7a100000-0000-4000-8000-000000000010'
    );
    raise exception 'An outsider unexpectedly submitted a methodology.';
  exception
    when insufficient_privilege then null;
  end;
end;
$outsider$;

reset role;

-- Present-stage AAL1 allowlisted approval authority can submit a blocked draft.
select set_config(
  'request.jwt.claims',
  jsonb_build_object(
    'sub', '7a100000-0000-4000-8000-000000000001',
    'role', 'authenticated',
    'aal', 'aal1'
  )::text,
  true
);
set local role authenticated;

select (public.submit_impact_model_version_for_review(
  '7a100000-0000-4000-8000-000000000010'
)).*;

do $under_review$
begin
  if not exists (
    select 1
    from public.impact_model_versions
    where id = '7a100000-0000-4000-8000-000000000010'
      and lifecycle_status = 'under_review'
      and cardinality(approval_blockers) = 3
  ) then
    raise exception 'Under-review methodology did not retain explicit blockers.';
  end if;

  begin
    perform public.review_impact_model_version(
      '7a100000-0000-4000-8000-000000000010',
      'approve',
      'Must remain blocked.'
    );
    raise exception 'A blocked or unvalidated methodology was unexpectedly approved.';
  exception
    when check_violation then null;
  end;
end;
$under_review$;

reset role;

-- Simulate later empirical validation without changing the production candidates.
select set_config(
  'request.jwt.claims',
  jsonb_build_object(
    'sub', '7a100000-0000-4000-8000-000000000001',
    'role', 'service_role',
    'aal', 'aal1'
  )::text,
  true
);
set local role service_role;

update public.impact_model_versions
set methodology = jsonb_set(
      jsonb_set(
        jsonb_set(
          methodology,
          '{causalIdentificationPolicy,designStatus}',
          to_jsonb('validated'::text)
        ),
        '{validationPolicy,thresholdStatus}',
        to_jsonb('validated'::text)
      ),
      '{calibrationEvidenceRefs}',
      jsonb_build_array('registry:qa-threshold-holdout:v1')
    ),
    methodology_hash = 'sha256:2222222222222222222222222222222222222222222222222222222222222222',
    approval_blockers = '{}'::text[]
where id = '7a100000-0000-4000-8000-000000000010';

reset role;

select set_config(
  'request.jwt.claims',
  jsonb_build_object(
    'sub', '7a100000-0000-4000-8000-000000000001',
    'role', 'authenticated',
    'aal', 'aal1'
  )::text,
  true
);
set local role authenticated;

select (public.review_impact_model_version(
  '7a100000-0000-4000-8000-000000000010',
  'approve',
  'QA-only validated exact-hash methodology.'
)).*;

reset role;

select set_config(
  'request.jwt.claims',
  jsonb_build_object(
    'sub', '7a100000-0000-4000-8000-000000000001',
    'role', 'service_role',
    'aal', 'aal1'
  )::text,
  true
);
set local role service_role;

insert into public.impact_model_health_snapshots (
  model_version_id,
  health_status,
  checked_at,
  data_as_of,
  expires_at,
  metrics,
  blockers,
  warnings
) values (
  '7a100000-0000-4000-8000-000000000010',
  'passed',
  clock_timestamp(),
  clock_timestamp(),
  clock_timestamp() + interval '2 hours',
  jsonb_build_object(
    'qaOnly', true,
    'holdout', 'passed',
    'causalDesign', 'validated'
  ),
  '{}'::text[],
  '{}'::text[]
);

reset role;

select set_config(
  'request.jwt.claims',
  jsonb_build_object(
    'sub', '7a100000-0000-4000-8000-000000000001',
    'role', 'authenticated',
    'aal', 'aal1'
  )::text,
  true
);
set local role authenticated;

select (public.activate_impact_model_version(
  '7a100000-0000-4000-8000-000000000010'
)).*;

reset role;

-- Deterministic terms and reviewed outcomes remain publishable under blocked health.
select set_config(
  'request.jwt.claims',
  jsonb_build_object(
    'sub', '7a100000-0000-4000-8000-000000000001',
    'role', 'service_role',
    'aal', 'aal1'
  )::text,
  true
);
set local role service_role;

do $snapshots$
declare
  state_time timestamptz := clock_timestamp();
  expiry_time timestamptz := clock_timestamp() + interval '1 hour';
  approved_time timestamptz;
  deterministic_snapshot jsonb;
  passing_snapshot jsonb;
  invalid_modeled_snapshot jsonb;
  invalid_verified_snapshot jsonb;
  invalid_overlap_snapshot jsonb;
begin
  select approved_at
  into approved_time
  from public.impact_model_versions
  where id = '7a100000-0000-4000-8000-000000000010';

  deterministic_snapshot := jsonb_build_object(
    'schemaVersion', 'moral-trade-impact-accounting-v1',
    'subjectRef', 'qa:trade:phase1:blocked',
    'mechanismFamily', 'trade',
    'inputStateHash', 'sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
    'stateAsOf', state_time,
    'expiresAt', expiry_time,
    'health', jsonb_build_object(
      'status', 'blocked',
      'checkedAt', state_time,
      'expiresAt', expiry_time,
      'blockers', jsonb_build_array('causal_identification_not_validated')
    ),
    'components', jsonb_build_array(
      jsonb_build_object(
        'key', 'terms',
        'kind', 'success_case_additional',
        'label', 'Conditional counterparty commitment',
        'status', 'available',
        'quantity', jsonb_build_object('kind', 'count', 'value', 1, 'unit', 'commitment'),
        'interval', jsonb_build_object('levelBps', 8000, 'lower', 1, 'upper', 1),
        'confidence', 'high',
        'source', 'deterministic_terms',
        'model', null,
        'explanation', 'Frozen terms specify one counterparty commitment.',
        'evidenceRefs', jsonb_build_array(),
        'blockers', jsonb_build_array(),
        'additiveToCausedTotal', false,
        'resourceClaimRefs', jsonb_build_array()
      ),
      jsonb_build_object(
        'key', 'outcome',
        'kind', 'verified_outcome',
        'label', 'Reviewed completed action',
        'status', 'available',
        'quantity', jsonb_build_object('kind', 'count', 'value', 1, 'unit', 'completed action'),
        'interval', jsonb_build_object('levelBps', 8000, 'lower', 1, 'upper', 1),
        'confidence', 'high',
        'source', 'verified_evidence',
        'model', null,
        'explanation', 'Reviewed evidence establishes occurrence, not additionality.',
        'evidenceRefs', jsonb_build_array('qa:evidence:action:1'),
        'blockers', jsonb_build_array(),
        'additiveToCausedTotal', false,
        'resourceClaimRefs', jsonb_build_array()
      ),
      jsonb_build_object(
        'key', 'expected',
        'kind', 'expected_additional',
        'label', 'Expected assessed additionality',
        'status', 'withheld',
        'quantity', null,
        'interval', null,
        'confidence', 'unavailable',
        'source', 'approved_model',
        'model', null,
        'explanation', 'No validated trade causal design is active.',
        'evidenceRefs', jsonb_build_array(),
        'blockers', jsonb_build_array('causal_identification_not_validated'),
        'additiveToCausedTotal', false,
        'resourceClaimRefs', jsonb_build_array()
      )
    ),
    'explanation', 'Deterministic and reviewed records remain visible while modeled impact is withheld.',
    'blockers', jsonb_build_array('causal_identification_not_validated')
  );

  perform public.publish_impact_estimate_snapshot(
    '7a100000-0000-4000-8000-000000000002',
    'qa:trade:phase1:blocked',
    'trade',
    null,
    null,
    'sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
    state_time,
    expiry_time,
    deterministic_snapshot
  );

  passing_snapshot := jsonb_build_object(
    'schemaVersion', 'moral-trade-impact-accounting-v1',
    'subjectRef', 'qa:threshold:phase1:passing',
    'mechanismFamily', 'threshold_funding',
    'inputStateHash', 'sha256:bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
    'stateAsOf', state_time,
    'expiresAt', expiry_time,
    'health', jsonb_build_object(
      'status', 'passed',
      'checkedAt', state_time,
      'expiresAt', expiry_time,
      'blockers', jsonb_build_array()
    ),
    'components', jsonb_build_array(
      jsonb_build_object(
        'key', 'expected',
        'kind', 'expected_additional',
        'label', 'Expected assessed additionality',
        'status', 'available',
        'quantity', jsonb_build_object('kind', 'money', 'value', 25, 'currency', 'USD'),
        'interval', jsonb_build_object('levelBps', 8000, 'lower', 5, 'upper', 45),
        'confidence', 'low',
        'source', 'approved_model',
        'model', jsonb_build_object(
          'modelKey', 'qa-threshold-impact-v2',
          'modelVersion', 2,
          'methodologyHash', 'sha256:2222222222222222222222222222222222222222222222222222222222222222',
          'approvedAt', approved_time
        ),
        'explanation', 'QA-only validated causal estimate.',
        'evidenceRefs', jsonb_build_array('registry:qa-threshold-holdout:v1'),
        'blockers', jsonb_build_array(),
        'additiveToCausedTotal', true,
        'resourceClaimRefs', jsonb_build_array('qa:funding:claim:1')
      )
    ),
    'explanation', 'QA-only passing modeled snapshot.',
    'blockers', jsonb_build_array()
  );

  perform public.publish_impact_estimate_snapshot(
    '7a100000-0000-4000-8000-000000000002',
    'qa:threshold:phase1:passing',
    'threshold_funding',
    '7a100000-0000-4000-8000-000000000010',
    'sha256:2222222222222222222222222222222222222222222222222222222222222222',
    'sha256:bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
    state_time,
    expiry_time,
    passing_snapshot
  );

  invalid_modeled_snapshot := jsonb_set(
    jsonb_set(
      passing_snapshot,
      '{subjectRef}',
      to_jsonb('qa:threshold:phase1:blocked-modeled'::text)
    ),
    '{health}',
    jsonb_build_object(
      'status', 'blocked',
      'checkedAt', state_time,
      'expiresAt', expiry_time,
      'blockers', jsonb_build_array('model_health_blocked')
    )
  );

  begin
    perform public.publish_impact_estimate_snapshot(
      '7a100000-0000-4000-8000-000000000002',
      'qa:threshold:phase1:blocked-modeled',
      'threshold_funding',
      '7a100000-0000-4000-8000-000000000010',
      'sha256:2222222222222222222222222222222222222222222222222222222222222222',
      'sha256:bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
      state_time,
      expiry_time,
      invalid_modeled_snapshot
    );
    raise exception 'A modeled component was published under blocked health.';
  exception
    when check_violation then null;
  end;

  invalid_verified_snapshot := jsonb_set(
    deterministic_snapshot,
    '{components,1,additiveToCausedTotal}',
    'true'::jsonb
  );
  begin
    perform public.publish_impact_estimate_snapshot(
      '7a100000-0000-4000-8000-000000000002',
      'qa:trade:phase1:invalid-verified',
      'trade',
      null,
      null,
      'sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
      state_time,
      expiry_time,
      jsonb_set(
        invalid_verified_snapshot,
        '{subjectRef}',
        to_jsonb('qa:trade:phase1:invalid-verified'::text)
      )
    );
    raise exception 'A verified outcome was incorrectly accepted as additive caused impact.';
  exception
    when check_violation then null;
  end;

  invalid_overlap_snapshot := jsonb_set(
    passing_snapshot,
    '{components}',
    (passing_snapshot -> 'components') || jsonb_build_array(
      jsonb_set(
        jsonb_set(
          passing_snapshot #> '{components,0}',
          '{key}',
          to_jsonb('expected-duplicate'::text)
        ),
        '{label}',
        to_jsonb('Duplicate additive claim'::text)
      )
    )
  );
  begin
    perform public.publish_impact_estimate_snapshot(
      '7a100000-0000-4000-8000-000000000002',
      'qa:threshold:phase1:overlap',
      'threshold_funding',
      '7a100000-0000-4000-8000-000000000010',
      'sha256:2222222222222222222222222222222222222222222222222222222222222222',
      'sha256:bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
      state_time,
      expiry_time,
      jsonb_set(
        invalid_overlap_snapshot,
        '{subjectRef}',
        to_jsonb('qa:threshold:phase1:overlap'::text)
      )
    );
    raise exception 'Overlapping additive resource claims were unexpectedly accepted.';
  exception
    when check_violation then null;
  end;
end;
$snapshots$;

reset role;

do $final_assertions$
begin
  if not exists (
    select 1
    from public.impact_model_versions
    where id = '7a100000-0000-4000-8000-000000000010'
      and lifecycle_status = 'active'
      and methodology_hash = 'sha256:2222222222222222222222222222222222222222222222222222222222222222'
  ) then
    raise exception 'Validated QA methodology did not become active.';
  end if;

  if (
    select count(*)
    from public.impact_model_approval_events
    where model_version_id = '7a100000-0000-4000-8000-000000000010'
      and decision = 'approve'
      and methodology_hash = 'sha256:2222222222222222222222222222222222222222222222222222222222222222'
  ) <> 1 then
    raise exception 'Exact-hash approval audit event is missing or duplicated.';
  end if;

  if (
    select count(*)
    from public.impact_estimate_snapshots
    where participant_user_id = '7a100000-0000-4000-8000-000000000002'
      and publication_status = 'current'
  ) <> 2 then
    raise exception 'Expected exactly two valid current QA snapshots.';
  end if;
end;
$final_assertions$;

rollback;
