begin;

create temporary table pledge_impact_live_test_state (
  proposal_id uuid,
  snapshot_id uuid,
  released_at timestamptz,
  expires_at timestamptz,
  forecast_json jsonb
) on commit drop;
grant select, insert, update on pledge_impact_live_test_state
  to service_role, authenticated;

insert into public.mpgf_pool_proposals (
  id,
  title,
  proposed_recipient_name,
  problem,
  intervention,
  moral_public_good_rationale,
  summary,
  cause_area,
  requested_maximum_funding_cents,
  minimum_viable_funding_cents,
  outcome_units_summary,
  expected_effect_vs_funding,
  timeline,
  misuse_pathways,
  status,
  threshold_visibility,
  progress_visibility,
  public_goods_destination_type,
  public_goods_destination_ref,
  public_goods_threshold_amount_cents,
  public_goods_threshold_supporters,
  public_goods_deadline_at,
  public_goods_failure_bonus_enabled
) values (
  '11111111-1111-4111-8111-111111111111',
  'QA wild-animal-suffering priority research pool',
  'QA research recipient',
  'Important research is underfunded.',
  'Fund an independently reviewed priority study.',
  'Several moral views value reducing severe suffering.',
  'QA-only production-shaped pledge-impact fixture.',
  'Animal welfare',
  2500000,
  2500000,
  'One independently reviewed research programme',
  'Additional funding purchases additional reviewed research capacity.',
  'Complete within twelve months of threshold activation.',
  'No operational misuse pathway in this QA-only fixture.',
  'approved_as_candidate',
  'public_exact',
  'exact_amount',
  'external_charity',
  'https://qa.example.org/approved-charity',
  2500000,
  2,
  timezone('utc', now()) + interval '30 days',
  false
);

insert into public.mpgf_pledge_impact_pool_map (
  pool_public_key,
  pool_proposal_id,
  mapping_version,
  release_environment,
  active
) values (
  'qa-pool-wild-research',
  '11111111-1111-4111-8111-111111111111',
  'qa-live-foundation-v1',
  'qa',
  true
);

insert into public.mpgf_pledges (
  id,
  pool_proposal_id,
  amount_cents,
  cadence,
  status,
  pledge_mode,
  real_money,
  contributor_label
) values
  (
    '33333333-3333-4333-8333-333333333331',
    '11111111-1111-4111-8111-111111111111',
    1000000,
    'one_time',
    'pledged',
    'pledge_only',
    false,
    'QA contributor one'
  ),
  (
    '33333333-3333-4333-8333-333333333332',
    '11111111-1111-4111-8111-111111111111',
    680000,
    'one_time',
    'pledged',
    'pledge_only',
    false,
    'QA contributor two'
  );

insert into pledge_impact_live_test_state (
  proposal_id,
  released_at,
  expires_at,
  forecast_json
) values (
  '11111111-1111-4111-8111-111111111111',
  date_trunc('milliseconds', clock_timestamp()),
  date_trunc('milliseconds', clock_timestamp()) + interval '60 minutes',
  jsonb_build_object(
    'schemaVersion', 'mpgf_pledge_impact_forecast_v1',
    'audience', 'pool_state',
    'experimental', true,
    'currency', 'USD',
    'forecastErrorFloorBps', 50,
    'followOnEffect', jsonb_build_object(
      'included', false,
      'evidenceType', 'none',
      'evidenceReference', null
    ),
    'points', jsonb_build_array(
      jsonb_build_object(
        'pledgeCents', 0,
        'additionalFundingFromOthers', jsonb_build_object(
          'estimateCents', 0,
          'lower90Cents', 0,
          'upper90Cents', 0
        ),
        'allocatedFundingCredit', jsonb_build_object(
          'estimateCents', 0,
          'lower90Cents', 0,
          'upper90Cents', 0
        ),
        'thresholds', jsonb_build_array(jsonb_build_object(
          'thresholdIndex', 1,
          'thresholdCents', 2500000,
          'probabilityWithoutPledgeBps', 4200,
          'probabilityWithPledgeBps', 4200,
          'lower90ChangeBps', 0,
          'upper90ChangeBps', 0
        )),
        'failureBonusConditionalOnFailure', null,
        'decomposition', jsonb_build_object(
          'directThresholdEffectCents', 0,
          'followOnContributionEffectCents', 0,
          'settlementAdjustmentCents', 0,
          'timingEffectCents', 0
        )
      ),
      jsonb_build_object(
        'pledgeCents', 3500,
        'additionalFundingFromOthers', jsonb_build_object(
          'estimateCents', 10200,
          'lower90Cents', 1200,
          'upper90Cents', 28600
        ),
        'allocatedFundingCredit', jsonb_build_object(
          'estimateCents', 8900,
          'lower90Cents', 1000,
          'upper90Cents', 20000
        ),
        'thresholds', jsonb_build_array(jsonb_build_object(
          'thresholdIndex', 1,
          'thresholdCents', 2500000,
          'probabilityWithoutPledgeBps', 4200,
          'probabilityWithPledgeBps', 4260,
          'lower90ChangeBps', 12,
          'upper90ChangeBps', 110
        )),
        'failureBonusConditionalOnFailure', null,
        'decomposition', jsonb_build_object(
          'directThresholdEffectCents', 11100,
          'followOnContributionEffectCents', 0,
          'settlementAdjustmentCents', -900,
          'timingEffectCents', 0
        )
      ),
      jsonb_build_object(
        'pledgeCents', 8500,
        'additionalFundingFromOthers', jsonb_build_object(
          'estimateCents', 30600,
          'lower90Cents', 9500,
          'upper90Cents', 62000
        ),
        'allocatedFundingCredit', jsonb_build_object(
          'estimateCents', 22000,
          'lower90Cents', 7000,
          'upper90Cents', 45000
        ),
        'thresholds', jsonb_build_array(jsonb_build_object(
          'thresholdIndex', 1,
          'thresholdCents', 2500000,
          'probabilityWithoutPledgeBps', 4200,
          'probabilityWithPledgeBps', 4390,
          'lower90ChangeBps', 65,
          'upper90ChangeBps', 300
        )),
        'failureBonusConditionalOnFailure', null,
        'decomposition', jsonb_build_object(
          'directThresholdEffectCents', 32000,
          'followOnContributionEffectCents', 0,
          'settlementAdjustmentCents', -1400,
          'timingEffectCents', 0
        )
      )
    ),
    'modelPerformance', jsonb_build_object(
      'sampleSize', 1240,
      'evaluationWindowStart', '2026-04-01T00:00:00.000Z',
      'evaluationWindowEnd', '2026-07-30T23:59:59.000Z',
      'brierScore', 0.173,
      'calibrationErrorBps', 42,
      'notes', 'QA-only production-shaped fixture; no viewer-level inputs.'
    )
  )
);

do $test$
declare
  bundle jsonb;
begin
  bundle := public.get_mpgf_pledge_impact_bundle('qa-pool-wild-research');
  if bundle ->> 'status' <> 'forecast_not_released' then
    raise exception 'Expected a live pool without a released forecast.';
  end if;
  if (bundle #>> '{poolState,fundedCents}')::bigint <> 1680000 then
    raise exception 'Live funded amount was not derived from linked pledges.';
  end if;
  if (bundle #>> '{poolState,contributorCount}')::integer <> 2 then
    raise exception 'Live contributor count was not derived from linked pledges.';
  end if;
  if bundle #>> '{poolState,poolProposalId}' <>
     '11111111-1111-4111-8111-111111111111' then
    raise exception 'Live state was not bound to the mapped MPGF proposal.';
  end if;
end;
$test$;

set local role service_role;

do $test$
declare
  state_row pledge_impact_live_test_state%rowtype;
  first_id uuid;
  replay_id uuid;
begin
  select * into state_row from pledge_impact_live_test_state limit 1;
  first_id := public.release_mpgf_pledge_impact_forecast(
    'qa-pool-wild-research',
    'qa-live-forecast-v1',
    'qa-live-model-v1',
    state_row.released_at,
    state_row.expires_at,
    state_row.forecast_json
  );
  replay_id := public.release_mpgf_pledge_impact_forecast(
    'qa-pool-wild-research',
    'qa-live-forecast-v1',
    'qa-live-model-v1',
    state_row.released_at,
    state_row.expires_at,
    state_row.forecast_json
  );
  if replay_id <> first_id then
    raise exception 'Idempotent replay returned a different snapshot.';
  end if;
  update pledge_impact_live_test_state set snapshot_id = first_id;

  begin
    perform public.release_mpgf_pledge_impact_forecast(
      'qa-pool-wild-research',
      'qa-live-forecast-v1',
      'qa-live-model-v1',
      state_row.released_at,
      state_row.expires_at,
      state_row.forecast_json || jsonb_build_object('forecastErrorFloorBps', 51)
    );
    raise exception 'Expected conflicting idempotency replay to fail.';
  exception
    when unique_violation then null;
  end;

  begin
    perform public.release_mpgf_pledge_impact_forecast(
      'qa-pool-wild-research',
      'qa-personalized-v1',
      'qa-live-model-v1',
      state_row.released_at,
      state_row.expires_at,
      state_row.forecast_json || jsonb_build_object('viewer_id', 'forbidden')
    );
    raise exception 'Expected viewer-personalized forecast to fail.';
  exception
    when invalid_parameter_value then null;
  end;
end;
$test$;

reset role;

do $test$
declare
  state_row pledge_impact_live_test_state%rowtype;
  bundle jsonb;
begin
  select * into state_row from pledge_impact_live_test_state limit 1;
  bundle := public.get_mpgf_pledge_impact_bundle('qa-pool-wild-research');
  if bundle ->> 'status' <> 'available' then
    raise exception 'Released forecast was not available against unchanged live state.';
  end if;
  if bundle #>> '{forecastRelease,forecastVersion}' <> 'qa-live-forecast-v1' then
    raise exception 'Available bundle omitted the exact forecast version.';
  end if;
  if bundle #>> '{forecastRelease,poolStateSha256}' <>
     bundle ->> 'poolStateSha256' then
    raise exception 'Available bundle was not bound to the current state hash.';
  end if;

  if (
    select count(*)
    from public.mpgf_pledge_impact_forecast_audit_events
    where snapshot_id = state_row.snapshot_id
  ) <> 1 then
    raise exception 'Forecast release did not create exactly one audit event.';
  end if;
  if not exists (
    select 1
    from public.mpgf_pledge_impact_forecast_snapshots
    where id = state_row.snapshot_id
      and pool_state_sha256 ~ '^sha256:[a-f0-9]{64}$'
      and content_sha256 ~ '^sha256:[a-f0-9]{64}$'
  ) then
    raise exception 'Forecast release did not persist valid content hashes.';
  end if;

  update public.mpgf_pledges
  set amount_cents = amount_cents + 100
  where id = '33333333-3333-4333-8333-333333333332';
  bundle := public.get_mpgf_pledge_impact_bundle('qa-pool-wild-research');
  if bundle ->> 'status' <> 'pool_state_mismatch' then
    raise exception 'Changed pledge ledger did not invalidate the forecast.';
  end if;
  update public.mpgf_pledges
  set amount_cents = amount_cents - 100
  where id = '33333333-3333-4333-8333-333333333332';

  bundle := public.mpgf_pledge_impact_bundle_at(
    'qa-pool-wild-research',
    state_row.expires_at + interval '1 minute'
  );
  if bundle ->> 'status' <> 'forecast_stale' then
    raise exception 'Expired forecast was not withheld.';
  end if;

  update public.mpgf_pledge_impact_pool_map
  set active = false
  where pool_public_key = 'qa-pool-wild-research';
  bundle := public.get_mpgf_pledge_impact_bundle('qa-pool-wild-research');
  if bundle ->> 'status' <> 'pool_not_live' then
    raise exception 'Inactive mapping remained publicly forecastable.';
  end if;
  update public.mpgf_pledge_impact_pool_map
  set active = true
  where pool_public_key = 'qa-pool-wild-research';
end;
$test$;

set local role authenticated;

do $test$
declare
  state_row pledge_impact_live_test_state%rowtype;
  bundle jsonb;
begin
  select * into state_row from pledge_impact_live_test_state limit 1;
  bundle := public.get_mpgf_pledge_impact_bundle('qa-pool-wild-research');
  if bundle ->> 'status' <> 'available' then
    raise exception 'Authenticated users could not read the sanitized live bundle.';
  end if;

  begin
    perform count(*) from public.mpgf_pledge_impact_forecast_snapshots;
    raise exception 'Authenticated direct snapshot reads should be denied.';
  exception
    when insufficient_privilege then null;
  end;

  begin
    perform public.release_mpgf_pledge_impact_forecast(
      'qa-pool-wild-research',
      'forbidden-auth-release',
      'forbidden',
      state_row.released_at,
      state_row.expires_at,
      state_row.forecast_json
    );
    raise exception 'Authenticated users should not publish forecasts.';
  exception
    when insufficient_privilege then null;
  end;
end;
$test$;

reset role;

do $test$
declare
  target_id uuid := (
    select snapshot_id from pledge_impact_live_test_state limit 1
  );
begin
  begin
    update public.mpgf_pledge_impact_forecast_snapshots
    set model_version = 'mutated'
    where id = target_id;
    raise exception 'Expected snapshot immutability trigger to reject update.';
  exception
    when check_violation then null;
  end;

  begin
    delete from public.mpgf_pledge_impact_forecast_audit_events
    where snapshot_id = target_id;
    raise exception 'Expected audit immutability trigger to reject deletion.';
  exception
    when check_violation then null;
  end;
end;
$test$;

rollback;
