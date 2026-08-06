begin;

create temporary table impact_phase1_test_state (
  snapshot_id uuid,
  refresh_job_id uuid,
  state_as_of timestamptz,
  expires_at timestamptz
) on commit drop;
grant select, insert, update on impact_phase1_test_state to service_role, authenticated;

do $schema$
declare
  missing_migrations text[];
  missing_tables text[];
  rls_missing text[];
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
      ('20260806135201', 'commitments_impact_approver_event_comment_fix')
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

  select array_agg(expected.table_name order by expected.table_name)
  into missing_tables
  from (
    values
      ('impact_model_approvers'),
      ('impact_model_approver_events'),
      ('impact_model_versions'),
      ('impact_model_approval_events'),
      ('impact_model_lifecycle_events'),
      ('impact_model_health_snapshots'),
      ('impact_reference_observations'),
      ('impact_estimate_snapshots'),
      ('impact_estimate_audit_events'),
      ('impact_refresh_queue')
  ) as expected(table_name)
  where to_regclass('public.' || expected.table_name) is null;

  if missing_tables is not null then
    raise exception 'Missing Phase 1 tables: %', missing_tables;
  end if;

  select array_agg(c.relname order by c.relname)
  into rls_missing
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public'
    and c.relname = any(array[
      'impact_model_approvers',
      'impact_model_approver_events',
      'impact_model_versions',
      'impact_model_approval_events',
      'impact_model_lifecycle_events',
      'impact_model_health_snapshots',
      'impact_reference_observations',
      'impact_estimate_snapshots',
      'impact_estimate_audit_events',
      'impact_refresh_queue'
    ])
    and not c.relrowsecurity;

  if rls_missing is not null then
    raise exception 'RLS is disabled on Phase 1 tables: %', rls_missing;
  end if;

  if to_regprocedure('public.publish_impact_estimate_snapshot(uuid,text,text,uuid,text,text,timestamp with time zone,timestamp with time zone,jsonb)') is null
    or to_regprocedure('public.get_my_impact_accounting_snapshots()') is null
    or to_regprocedure('public.set_impact_model_approver(uuid,boolean,text,uuid)') is null
    or to_regprocedure('public.queue_impact_refresh_job(uuid,text,text,text,timestamp with time zone)') is null
  then
    raise exception 'A required Phase 1 RPC is missing.';
  end if;

  if has_function_privilege(
    'authenticated',
    'public.publish_impact_estimate_snapshot(uuid,text,text,uuid,text,text,timestamp with time zone,timestamp with time zone,jsonb)',
    'execute'
  ) then
    raise exception 'Authenticated users unexpectedly retain estimate-publication authority.';
  end if;

  if not has_function_privilege(
    'service_role',
    'public.publish_impact_estimate_snapshot(uuid,text,text,uuid,text,text,timestamp with time zone,timestamp with time zone,jsonb)',
    'execute'
  ) then
    raise exception 'Service role lacks estimate-publication authority.';
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
    'impact-observer-qa@example.invalid',
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
    'aal', 'aal2'
  )::text,
  true
);
set local role service_role;

select (public.set_impact_model_approver(
  '7a100000-0000-4000-8000-000000000001',
  true,
  'Transactional Phase 1 QA approver.',
  '7a100000-0000-4000-8000-000000000001'
)).*;

reset role;

do $approver_bootstrap$
begin
  if not exists (
    select 1
    from public.impact_model_approvers
    where user_id = '7a100000-0000-4000-8000-000000000001'
      and active
  ) then
    raise exception 'Synthetic Phase 1 approver was not activated.';
  end if;

  if (
    select count(*)
    from public.impact_model_approver_events
    where approver_user_id = '7a100000-0000-4000-8000-000000000001'
      and event_type = 'granted'
      and active
  ) <> 1 then
    raise exception 'Approver grant did not create exactly one audit event.';
  end if;
end;
$approver_bootstrap$;

select set_config(
  'request.jwt.claims',
  jsonb_build_object(
    'sub', '7a100000-0000-4000-8000-000000000001',
    'role', 'service_role',
    'aal', 'aal2'
  )::text,
  true
);
set local role service_role;

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
  'qa-threshold-impact-v1',
  1,
  'draft',
  jsonb_build_object(
    'schemaVersion', 'moral-trade-impact-model-methodology-v1',
    'mechanismFamily', 'threshold_funding',
    'modelKey', 'qa-threshold-impact-v1',
    'displayName', 'QA threshold-funding impact model',
    'estimands', jsonb_build_array(
      'success_case_additional',
      'expected_additional',
      'direct_causal_attribution',
      'cooperative_allocation',
      'platform_funded_bonus'
    ),
    'estimandDefinitions', jsonb_build_object(
      'success_case_additional', 'Additional eligible funding conditional on the threshold being met.',
      'expected_additional', 'Probability-weighted additional eligible funding relative to the frozen no-pledge baseline.',
      'direct_causal_attribution', 'Resources causally attributable to the participant under the approved pivotality model.',
      'cooperative_allocation', 'A non-additive allocation of coalition-created resources under the approved characteristic function.',
      'platform_funded_bonus', 'A separately labeled platform-funded failure bonus, excluded from participant-caused totals.'
    ),
    'baselineDefinition', 'Freeze the pool terms, eligible pledge ledger, participant set, funded amount, threshold, and deadline immediately before the tested pledge.',
    'algorithmDescription', 'Estimate success with and without the tested pledge from a hierarchical reference class, multiply the probability change by eligible funding, and report cooperative allocation separately.',
    'referenceClassPolicy', jsonb_build_object(
      'strategy', 'hierarchical',
      'narrowFields', jsonb_build_array('cause area', 'threshold size', 'deadline horizon', 'funding progress'),
      'broadeningOrder', jsonb_build_array('deadline horizon', 'cause area', 'mechanism family'),
      'minimumSampleSize', 30,
      'noDefensibleClassAction', 'withhold',
      'uncertaintyExpansionRule', 'Expand the interval at every approved broadening step and withhold when calibration coverage is unavailable.'
    ),
    'uncertaintyPolicy', jsonb_build_object(
      'intervalLevelBps', 8000,
      'method', 'Bootstrap reference-class outcome distributions with calibrated hierarchical shrinkage.',
      'confidencePolicy', 'Confidence is high only with adequate sample size, stable calibration, in-domain state, and current health evidence.',
      'drivers', jsonb_build_array('pivotality uncertainty', 'reference-class fit', 'state freshness', 'sample size')
    ),
    'freshnessPolicy', jsonb_build_object(
      'maxAgeSeconds', 3600,
      'requireStateHash', true,
      'requiredStateFields', jsonb_build_array('funded amount', 'threshold amount', 'deadline', 'participant set', 'eligible pledge ledger'),
      'invalidateOnLifecycleStates', jsonb_build_array('succeeded', 'lapsed', 'cancelled')
    ),
    'healthPolicy', jsonb_build_object(
      'requiredCalibrationMetrics', jsonb_build_array('sample size', 'interval coverage error', 'Brier score'),
      'blockedConditions', jsonb_build_array('no active model', 'expired health record', 'calibration failure', 'out-of-domain input'),
      'warningConditions', jsonb_build_array('small sample', 'reference class broadened', 'calibration drift')
    ),
    'sourceDataRequirements', jsonb_build_array('immutable pool terms', 'current eligible pledge ledger', 'audited historical pool outcomes'),
    'calibrationEvidenceRefs', jsonb_build_array('qa:calibration:threshold-funding:v1'),
    'knownFailureModes', jsonb_build_array('strategic pledging', 'unobserved off-platform contributions', 'selection into published pools'),
    'outOfDomainConditions', jsonb_build_array('non-monetary threshold', 'private unverified pool', 'mutable threshold terms'),
    'materialChangeTriggers', jsonb_build_array('estimand definition change', 'reference-class policy change', 'uncertainty method change', 'characteristic-function change'),
    'aggregationPolicy', jsonb_build_object(
      'directAndCooperativeNeverSummed', true,
      'heterogeneousNativeUnitsRemainSeparate', true,
      'overlapHandling', 'Direct causal attribution and cooperative allocation remain separate, and overlapping resource claims are never added.'
    ),
    'shapleyPolicy', jsonb_build_object(
      'enabled', true,
      'characteristicFunctionDefinition', 'Coalition value equals verified additional eligible funding caused by that coalition relative to the frozen no-participant baseline.',
      'maximumExactPlayers', 10,
      'approximationMethod', 'Use deterministic seeded permutation sampling above the exact-player limit.'
    ),
    'parameters', jsonb_build_object(
      'qaOnly', true,
      'minimumReferenceOutcomes', 30
    )
  ),
  'sha256:1111111111111111111111111111111111111111111111111111111111111111',
  '{}'::text[],
  '7a100000-0000-4000-8000-000000000001'
);

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
)
select
  '7a100000-0000-4000-8000-000000000011',
  mechanism_family,
  'qa-threshold-placeholder-v1',
  1,
  'draft',
  jsonb_set(
    jsonb_set(
      methodology,
      '{modelKey}',
      to_jsonb('qa-threshold-placeholder-v1'::text)
    ),
    '{algorithmDescription}',
    to_jsonb('[REQUIRED: replace this placeholder]'::text)
  ),
  'sha256:3333333333333333333333333333333333333333333333333333333333333333',
  '{}'::text[],
  '7a100000-0000-4000-8000-000000000001'
from public.impact_model_versions
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

do $aal1_guard$
begin
  if not public.is_impact_model_approver(false) then
    raise exception 'The configured account was not recognized as an approver.';
  end if;
  if public.is_impact_model_approver(true) then
    raise exception 'AAL1 unexpectedly satisfied the AAL2 approval gate.';
  end if;

  begin
    perform public.submit_impact_model_version_for_review(
      '7a100000-0000-4000-8000-000000000010'
    );
    raise exception 'AAL1 unexpectedly submitted an impact model for review.';
  exception
    when insufficient_privilege then null;
  end;
end;
$aal1_guard$;

reset role;

select set_config(
  'request.jwt.claims',
  jsonb_build_object(
    'sub', '7a100000-0000-4000-8000-000000000001',
    'role', 'authenticated',
    'aal', 'aal2'
  )::text,
  true
);
set local role authenticated;

do $methodology_guard$
begin
  begin
    perform public.submit_impact_model_version_for_review(
      '7a100000-0000-4000-8000-000000000011'
    );
    raise exception 'A placeholder methodology unexpectedly entered review.';
  exception
    when check_violation then null;
  end;
end;
$methodology_guard$;

select (public.submit_impact_model_version_for_review(
  '7a100000-0000-4000-8000-000000000010'
)).*;

select (public.review_impact_model_version(
  '7a100000-0000-4000-8000-000000000010',
  'approve',
  'Transactional QA approval of the exact synthetic methodology hash.'
)).*;

do $activation_health_guard$
begin
  begin
    perform public.activate_impact_model_version(
      '7a100000-0000-4000-8000-000000000010'
    );
    raise exception 'A model without current passing health unexpectedly activated.';
  exception
    when check_violation then null;
  end;
end;
$activation_health_guard$;

reset role;

select set_config(
  'request.jwt.claims',
  jsonb_build_object(
    'sub', '7a100000-0000-4000-8000-000000000001',
    'role', 'service_role',
    'aal', 'aal2'
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
  clock_timestamp() - interval '1 second',
  clock_timestamp() - interval '1 minute',
  clock_timestamp() + interval '2 hours',
  jsonb_build_object(
    'sampleSize', 240,
    'intervalCoverageErrorBps', 120,
    'brierScore', 0.17
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
    'aal', 'aal2'
  )::text,
  true
);
set local role authenticated;

select (public.activate_impact_model_version(
  '7a100000-0000-4000-8000-000000000010'
)).*;

reset role;

do $governance_audit$
begin
  if not exists (
    select 1
    from public.impact_model_versions
    where id = '7a100000-0000-4000-8000-000000000010'
      and lifecycle_status = 'active'
      and activated_at is not null
  ) then
    raise exception 'Approved healthy impact model did not become active.';
  end if;

  if (
    select count(*)
    from public.impact_model_approval_events
    where model_version_id = '7a100000-0000-4000-8000-000000000010'
      and decision = 'approve'
      and methodology_hash = 'sha256:1111111111111111111111111111111111111111111111111111111111111111'
  ) <> 1 then
    raise exception 'Exact-hash founder approval event is missing.';
  end if;

  if not exists (
    select 1
    from public.impact_model_lifecycle_events
    where model_version_id = '7a100000-0000-4000-8000-000000000010'
      and from_status = 'approved'
      and to_status = 'active'
  ) then
    raise exception 'Activation lifecycle transition was not audited.';
  end if;

  begin
    update public.impact_model_versions
    set methodology = jsonb_set(
      methodology,
      '{algorithmDescription}',
      to_jsonb('Mutated after approval.'::text)
    )
    where id = '7a100000-0000-4000-8000-000000000010';
    raise exception 'Approved methodology unexpectedly remained mutable.';
  exception
    when sqlstate '55000' then null;
  end;
end;
$governance_audit$;

select set_config(
  'request.jwt.claims',
  jsonb_build_object(
    'sub', '7a100000-0000-4000-8000-000000000001',
    'role', 'service_role',
    'aal', 'aal2'
  )::text,
  true
);
set local role service_role;

do $publish_valid_snapshot$
declare
  state_time timestamptz := date_trunc('milliseconds', clock_timestamp());
  expiry_time timestamptz := date_trunc('milliseconds', clock_timestamp()) + interval '30 minutes';
  approved_time timestamptz;
  snapshot_payload jsonb;
  published_id uuid;
begin
  select approved_at
  into approved_time
  from public.impact_model_versions
  where id = '7a100000-0000-4000-8000-000000000010';

  snapshot_payload := jsonb_build_object(
    'schemaVersion', 'moral-trade-impact-accounting-v1',
    'subjectRef', 'qa:threshold-pool:phase1',
    'mechanismFamily', 'threshold_funding',
    'inputStateHash', 'sha256:2222222222222222222222222222222222222222222222222222222222222222',
    'stateAsOf', state_time,
    'expiresAt', expiry_time,
    'components', jsonb_build_array(
      jsonb_build_object(
        'key', 'expected-additional-funding',
        'label', 'Expected additional funding',
        'kind', 'expected_additional',
        'status', 'available',
        'source', 'approved_model',
        'confidence', 'moderate',
        'quantity', jsonb_build_object(
          'kind', 'money',
          'value', 125.00,
          'currency', 'USD'
        ),
        'interval', jsonb_build_object(
          'levelBps', 8000,
          'lower', 40.00,
          'upper', 260.00
        ),
        'model', jsonb_build_object(
          'modelKey', 'qa-threshold-impact-v1',
          'modelVersion', 1,
          'methodologyHash', 'sha256:1111111111111111111111111111111111111111111111111111111111111111',
          'approvedAt', approved_time
        ),
        'evidenceRefs', jsonb_build_array('qa:reference-class:threshold-funding:v1'),
        'blockers', '[]'::jsonb,
        'additiveToCausedTotal', true,
        'explanation', 'Probability-weighted additional funding relative to the frozen no-pledge baseline.'
      ),
      jsonb_build_object(
        'key', 'cooperative-allocation',
        'label', 'Cooperative allocation',
        'kind', 'cooperative_allocation',
        'status', 'available',
        'source', 'approved_model',
        'confidence', 'moderate',
        'quantity', jsonb_build_object(
          'kind', 'money',
          'value', 90.00,
          'currency', 'USD'
        ),
        'interval', jsonb_build_object(
          'levelBps', 8000,
          'lower', 25.00,
          'upper', 210.00
        ),
        'model', jsonb_build_object(
          'modelKey', 'qa-threshold-impact-v1',
          'modelVersion', 1,
          'methodologyHash', 'sha256:1111111111111111111111111111111111111111111111111111111111111111',
          'approvedAt', approved_time
        ),
        'evidenceRefs', jsonb_build_array('qa:coalition:threshold-pool:phase1'),
        'blockers', '[]'::jsonb,
        'additiveToCausedTotal', false,
        'explanation', 'Non-additive cooperative allocation under the approved characteristic function.'
      ),
      jsonb_build_object(
        'key', 'direct-causal-withheld',
        'label', 'Direct causal attribution',
        'kind', 'direct_causal_attribution',
        'status', 'withheld',
        'source', 'reference_class',
        'confidence', 'unavailable',
        'quantity', null,
        'interval', null,
        'model', jsonb_build_object(
          'modelKey', 'qa-threshold-impact-v1',
          'modelVersion', 1,
          'methodologyHash', 'sha256:1111111111111111111111111111111111111111111111111111111111111111',
          'approvedAt', approved_time
        ),
        'evidenceRefs', '[]'::jsonb,
        'blockers', jsonb_build_array('insufficient_direct-attribution_evidence'),
        'additiveToCausedTotal', false,
        'explanation', 'Withheld because the synthetic fixture does not provide a defensible direct-attribution reference class.'
      ),
      jsonb_build_object(
        'key', 'platform-failure-bonus',
        'label', 'Platform-funded failure bonus',
        'kind', 'platform_funded_bonus',
        'status', 'available',
        'source', 'platform_subsidy',
        'confidence', 'high',
        'quantity', jsonb_build_object(
          'kind', 'money',
          'value', 5.00,
          'currency', 'USD'
        ),
        'interval', jsonb_build_object(
          'levelBps', 8000,
          'lower', 5.00,
          'upper', 5.00
        ),
        'model', null,
        'evidenceRefs', jsonb_build_array('qa:platform-bonus-ledger:phase1'),
        'blockers', '[]'::jsonb,
        'additiveToCausedTotal', false,
        'explanation', 'Platform-funded compensation is displayed separately and never counted as participant-caused resources.'
      )
    ),
    'health', jsonb_build_object(
      'status', 'passed',
      'checkedAt', state_time - interval '1 minute',
      'expiresAt', expiry_time,
      'blockers', '[]'::jsonb
    ),
    'blockers', '[]'::jsonb,
    'explanation', 'QA-only state-bound impact snapshot for the Phase 1 accounting contract.'
  );

  published_id := public.publish_impact_estimate_snapshot(
    '7a100000-0000-4000-8000-000000000002',
    'qa:threshold-pool:phase1',
    'threshold_funding',
    '7a100000-0000-4000-8000-000000000010',
    'sha256:1111111111111111111111111111111111111111111111111111111111111111',
    'sha256:2222222222222222222222222222222222222222222222222222222222222222',
    state_time,
    expiry_time,
    snapshot_payload
  );

  insert into impact_phase1_test_state (
    snapshot_id,
    state_as_of,
    expires_at
  ) values (
    published_id,
    state_time,
    expiry_time
  );
end;
$publish_valid_snapshot$;

do $snapshot_validation_guards$
declare
  state_time timestamptz := date_trunc('milliseconds', clock_timestamp());
  expiry_time timestamptz := date_trunc('milliseconds', clock_timestamp()) + interval '30 minutes';
  approved_time timestamptz;
  invalid_payload jsonb;
begin
  select approved_at
  into approved_time
  from public.impact_model_versions
  where id = '7a100000-0000-4000-8000-000000000010';

  invalid_payload := jsonb_build_object(
    'schemaVersion', 'moral-trade-impact-accounting-v1',
    'subjectRef', 'qa:invalid:cooperative-additive',
    'mechanismFamily', 'threshold_funding',
    'inputStateHash', 'sha256:4444444444444444444444444444444444444444444444444444444444444444',
    'stateAsOf', state_time,
    'expiresAt', expiry_time,
    'components', jsonb_build_array(
      jsonb_build_object(
        'key', 'invalid-cooperative-allocation',
        'label', 'Invalid cooperative allocation',
        'kind', 'cooperative_allocation',
        'status', 'available',
        'source', 'approved_model',
        'confidence', 'moderate',
        'quantity', jsonb_build_object('kind', 'money', 'value', 10, 'currency', 'USD'),
        'interval', jsonb_build_object('levelBps', 8000, 'lower', 5, 'upper', 20),
        'model', jsonb_build_object(
          'modelKey', 'qa-threshold-impact-v1',
          'modelVersion', 1,
          'methodologyHash', 'sha256:1111111111111111111111111111111111111111111111111111111111111111',
          'approvedAt', approved_time
        ),
        'evidenceRefs', '[]'::jsonb,
        'blockers', '[]'::jsonb,
        'additiveToCausedTotal', true,
        'explanation', 'This fixture must be rejected because cooperative allocation is non-additive.'
      )
    ),
    'health', jsonb_build_object(
      'status', 'passed',
      'checkedAt', state_time - interval '1 minute',
      'expiresAt', expiry_time,
      'blockers', '[]'::jsonb
    ),
    'blockers', '[]'::jsonb,
    'explanation', 'Intentionally invalid cooperative-allocation fixture.'
  );

  begin
    perform public.publish_impact_estimate_snapshot(
      '7a100000-0000-4000-8000-000000000002',
      'qa:invalid:cooperative-additive',
      'threshold_funding',
      '7a100000-0000-4000-8000-000000000010',
      'sha256:1111111111111111111111111111111111111111111111111111111111111111',
      'sha256:4444444444444444444444444444444444444444444444444444444444444444',
      state_time,
      expiry_time,
      invalid_payload
    );
    raise exception 'Additive cooperative allocation unexpectedly published.';
  exception
    when check_violation then null;
  end;

  invalid_payload := jsonb_set(
    jsonb_set(
      invalid_payload,
      '{subjectRef}',
      to_jsonb('qa:invalid:interval-level'::text)
    ),
    '{components,0,additiveToCausedTotal}',
    'false'::jsonb
  );
  invalid_payload := jsonb_set(
    invalid_payload,
    '{components,0,interval,levelBps}',
    '9000'::jsonb
  );
  invalid_payload := jsonb_set(
    invalid_payload,
    '{inputStateHash}',
    to_jsonb('sha256:5555555555555555555555555555555555555555555555555555555555555555'::text)
  );

  begin
    perform public.publish_impact_estimate_snapshot(
      '7a100000-0000-4000-8000-000000000002',
      'qa:invalid:interval-level',
      'threshold_funding',
      '7a100000-0000-4000-8000-000000000010',
      'sha256:1111111111111111111111111111111111111111111111111111111111111111',
      'sha256:5555555555555555555555555555555555555555555555555555555555555555',
      state_time,
      expiry_time,
      invalid_payload
    );
    raise exception 'A non-80-percent impact interval unexpectedly published.';
  exception
    when check_violation then null;
  end;
end;
$snapshot_validation_guards$;

do $refresh_queue$
declare
  first_job uuid;
  replay_job uuid;
begin
  first_job := public.queue_impact_refresh_job(
    '7a100000-0000-4000-8000-000000000002',
    'qa:threshold-pool:phase1',
    'threshold_funding',
    'qa_state_changed',
    now()
  );
  replay_job := public.queue_impact_refresh_job(
    '7a100000-0000-4000-8000-000000000002',
    'qa:threshold-pool:phase1',
    'threshold_funding',
    'qa_state_changed_again',
    now()
  );

  if replay_job <> first_job then
    raise exception 'Open refresh-job replay was not idempotent.';
  end if;

  perform public.claim_impact_refresh_jobs(100, 900);

  if not exists (
    select 1
    from public.impact_refresh_queue
    where id = first_job
      and status = 'running'
      and attempt_count = 1
      and locked_at is not null
  ) then
    raise exception 'Queued impact refresh job was not claimed.';
  end if;

  perform public.finish_impact_refresh_job(
    first_job,
    'completed',
    null,
    null
  );

  if not exists (
    select 1
    from public.impact_refresh_queue
    where id = first_job
      and status = 'completed'
      and completed_at is not null
  ) then
    raise exception 'Claimed impact refresh job was not completed.';
  end if;

  update impact_phase1_test_state
  set refresh_job_id = first_job;
end;
$refresh_queue$;

reset role;

do $snapshot_persistence$
declare
  target_snapshot uuid := (
    select snapshot_id
    from impact_phase1_test_state
    limit 1
  );
begin
  if target_snapshot is null then
    raise exception 'Valid impact snapshot id was not recorded.';
  end if;

  if not exists (
    select 1
    from public.impact_estimate_snapshots
    where id = target_snapshot
      and participant_user_id = '7a100000-0000-4000-8000-000000000002'
      and publication_status = 'current'
      and health_status = 'passed'
      and methodology_hash = 'sha256:1111111111111111111111111111111111111111111111111111111111111111'
      and snapshot #>> '{components,1,kind}' = 'cooperative_allocation'
      and (snapshot #>> '{components,1,additiveToCausedTotal}')::boolean = false
  ) then
    raise exception 'Valid state-bound impact snapshot was not persisted correctly.';
  end if;

  if (
    select count(*)
    from public.impact_estimate_audit_events
    where snapshot_id = target_snapshot
      and event_type = 'published'
  ) <> 1 then
    raise exception 'Impact snapshot publication did not create exactly one audit event.';
  end if;

  begin
    update public.impact_estimate_snapshots
    set snapshot = jsonb_set(
      snapshot,
      '{explanation}',
      to_jsonb('Mutated after publication.'::text)
    )
    where id = target_snapshot;
    raise exception 'Published impact snapshot unexpectedly remained mutable.';
  exception
    when sqlstate '55000' then null;
  end;

  begin
    delete from public.impact_estimate_audit_events
    where snapshot_id = target_snapshot;
    raise exception 'Impact estimate audit history unexpectedly remained deletable.';
  exception
    when sqlstate '55000' then null;
  end;
end;
$snapshot_persistence$;

select set_config(
  'request.jwt.claims',
  jsonb_build_object(
    'sub', '7a100000-0000-4000-8000-000000000002',
    'role', 'authenticated',
    'aal', 'aal1'
  )::text,
  true
);
set local role authenticated;

do $participant_scope$
begin
  if (
    select count(*)
    from public.get_my_impact_accounting_snapshots()
  ) <> 1 then
    raise exception 'Participant did not receive exactly one current impact snapshot.';
  end if;

  if (
    select count(*)
    from public.impact_estimate_snapshots
  ) <> 1 then
    raise exception 'Participant-scoped RLS did not expose exactly the participant snapshot.';
  end if;

  begin
    perform public.publish_impact_estimate_snapshot(
      '7a100000-0000-4000-8000-000000000002',
      'qa:forbidden:authenticated-publish',
      'threshold_funding',
      '7a100000-0000-4000-8000-000000000010',
      'sha256:1111111111111111111111111111111111111111111111111111111111111111',
      'sha256:6666666666666666666666666666666666666666666666666666666666666666',
      now(),
      now() + interval '30 minutes',
      '{}'::jsonb
    );
    raise exception 'Authenticated user unexpectedly published an impact snapshot.';
  exception
    when insufficient_privilege then null;
  end;

  begin
    perform public.queue_impact_refresh_job(
      '7a100000-0000-4000-8000-000000000002',
      'qa:forbidden:authenticated-queue',
      'threshold_funding',
      'forbidden_request',
      now()
    );
    raise exception 'Authenticated user unexpectedly queued an impact refresh.';
  exception
    when insufficient_privilege then null;
  end;
end;
$participant_scope$;

reset role;

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

do $observer_scope$
begin
  if (
    select count(*)
    from public.get_my_impact_accounting_snapshots()
  ) <> 0 then
    raise exception 'Unrelated authenticated user received another participant snapshot.';
  end if;

  if (
    select count(*)
    from public.impact_estimate_snapshots
  ) <> 0 then
    raise exception 'RLS leaked participant impact snapshots to an unrelated user.';
  end if;
end;
$observer_scope$;

reset role;

select set_config(
  'request.jwt.claims',
  jsonb_build_object(
    'sub', '7a100000-0000-4000-8000-000000000001',
    'role', 'service_role',
    'aal', 'aal2'
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
  'blocked',
  clock_timestamp(),
  clock_timestamp(),
  clock_timestamp() + interval '2 hours',
  jsonb_build_object('reason', 'synthetic calibration failure'),
  array['synthetic_calibration_failure'],
  '{}'::text[]
);

reset role;

select set_config(
  'request.jwt.claims',
  jsonb_build_object(
    'sub', '7a100000-0000-4000-8000-000000000002',
    'role', 'authenticated',
    'aal', 'aal1'
  )::text,
  true
);
set local role authenticated;

do $health_fail_closed$
begin
  if (
    select count(*)
    from public.get_my_impact_accounting_snapshots()
  ) <> 0 then
    raise exception 'Participant snapshot remained visible after the latest model health became blocked.';
  end if;
end;
$health_fail_closed$;

reset role;

select set_config('request.jwt.claims', '{}'::jsonb::text, true);

delete from auth.users
where id = '7a100000-0000-4000-8000-000000000001';

do $deleted_approver_audit$
declare
  expected_fingerprint text := public.impact_accounting_user_fingerprint(
    '7a100000-0000-4000-8000-000000000001'
  );
begin
  if exists (
    select 1
    from public.impact_model_approvers
    where user_id = '7a100000-0000-4000-8000-000000000001'
  ) then
    raise exception 'Deleted auth account remained in the current approver roster.';
  end if;

  if not exists (
    select 1
    from public.impact_model_approval_events
    where model_version_id = '7a100000-0000-4000-8000-000000000010'
      and decision = 'approve'
      and approver_user_id is null
      and approver_user_fingerprint = expected_fingerprint
  ) then
    raise exception 'Approval audit identity was not preserved after auth-account deletion.';
  end if;

  if not exists (
    select 1
    from public.impact_model_approver_events
    where event_type = 'account_deleted'
      and approver_user_id is null
      and approver_user_fingerprint = expected_fingerprint
  ) then
    raise exception 'Approver account deletion was not appended to governance history.';
  end if;
end;
$deleted_approver_audit$;

rollback;
