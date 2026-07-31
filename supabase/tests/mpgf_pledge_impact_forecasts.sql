begin;

create temporary table pledge_impact_test_state (
  snapshot_id uuid,
  released_at timestamptz,
  expires_at timestamptz,
  pool_state jsonb,
  forecast jsonb
) on commit drop;
grant select on pledge_impact_test_state to anon, authenticated, service_role;

set local role service_role;

do $test$
declare
  released_at_value timestamptz := date_trunc('milliseconds', timezone('utc', now()));
  expires_at_value timestamptz := released_at_value + interval '60 minutes';
  pool_state_value jsonb := jsonb_build_object(
    'poolPublicKey', 'pool-wild-research',
    'campaignId', 'campaign-animal-welfare-transition',
    'title', 'Wild-animal-suffering priority research pool',
    'currency', 'USD',
    'thresholdsCents', jsonb_build_array(2500000),
    'fundedCents', 1680000,
    'contributorCount', 21,
    'deadlineAt', '2026-08-15T23:59:59.000Z',
    'failureBonusEnabled', true
  );
  forecast_value jsonb := jsonb_build_object(
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
      jsonb_build_object('pledgeCents', 0),
      jsonb_build_object('pledgeCents', 3500)
    ),
    'modelPerformance', jsonb_build_object(
      'sampleSize', 1240,
      'evaluationWindowStart', '2026-04-01T00:00:00.000Z',
      'evaluationWindowEnd', '2026-07-30T23:59:59.000Z',
      'brierScore', 0.173,
      'calibrationErrorBps', 42,
      'notes', 'QA fixture; no viewer-level inputs.'
    )
  );
  first_id uuid;
  replay_id uuid;
begin
  first_id := public.release_mpgf_pledge_impact_forecast(
    'pool-wild-research',
    'campaign-animal-welfare-transition',
    'qa-wild-research-v1',
    'qa-pledge-impact-v1',
    released_at_value,
    expires_at_value,
    pool_state_value,
    forecast_value
  );

  replay_id := public.release_mpgf_pledge_impact_forecast(
    'pool-wild-research',
    'campaign-animal-welfare-transition',
    'qa-wild-research-v1',
    'qa-pledge-impact-v1',
    released_at_value,
    expires_at_value,
    pool_state_value,
    forecast_value
  );

  if replay_id <> first_id then
    raise exception 'Idempotent forecast replay returned a different snapshot.';
  end if;
  if (select count(*) from public.mpgf_pledge_impact_forecast_snapshots where id = first_id) <> 1 then
    raise exception 'Forecast release did not persist exactly one snapshot.';
  end if;
  if (select count(*) from public.mpgf_pledge_impact_forecast_audit_events where snapshot_id = first_id) <> 1 then
    raise exception 'Forecast release did not persist exactly one audit event.';
  end if;
  if not exists (
    select 1
    from public.mpgf_pledge_impact_forecast_snapshots
    where id = first_id
      and content_sha256 ~ '^sha256:[a-f0-9]{64}$'
  ) then
    raise exception 'Forecast release did not persist a valid content hash.';
  end if;

  insert into pledge_impact_test_state values (
    first_id,
    released_at_value,
    expires_at_value,
    pool_state_value,
    forecast_value
  );

  begin
    perform public.release_mpgf_pledge_impact_forecast(
      'pool-wild-research',
      'campaign-animal-welfare-transition',
      'qa-wild-research-v1',
      'qa-pledge-impact-v1',
      released_at_value,
      expires_at_value,
      pool_state_value,
      forecast_value || jsonb_build_object('forecastErrorFloorBps', 51)
    );
    raise exception 'Expected conflicting idempotency replay to fail.';
  exception
    when unique_violation then null;
  end;

  begin
    update public.mpgf_pledge_impact_forecast_snapshots
    set model_version = 'mutated'
    where id = first_id;
    raise exception 'Expected released snapshot update to fail.';
  exception
    when check_violation then null;
  end;

  begin
    delete from public.mpgf_pledge_impact_forecast_audit_events
    where snapshot_id = first_id;
    raise exception 'Expected audit deletion to fail.';
  exception
    when check_violation then null;
  end;

  begin
    perform public.release_mpgf_pledge_impact_forecast(
      'pool-wild-research',
      'campaign-public-interest-knowledge',
      'qa-campaign-mismatch-v1',
      'qa-pledge-impact-v1',
      released_at_value,
      expires_at_value,
      pool_state_value,
      forecast_value
    );
    raise exception 'Expected campaign mismatch to fail.';
  exception
    when check_violation then null;
  end;

  begin
    perform public.release_mpgf_pledge_impact_forecast(
      'pool-wild-research',
      'campaign-animal-welfare-transition',
      'qa-stale-v1',
      'qa-pledge-impact-v1',
      released_at_value - interval '16 minutes',
      expires_at_value,
      pool_state_value,
      forecast_value
    );
    raise exception 'Expected stale timestamp to fail.';
  exception
    when invalid_parameter_value then null;
  end;

  begin
    perform public.release_mpgf_pledge_impact_forecast(
      'pool-wild-research',
      'campaign-animal-welfare-transition',
      'qa-personalized-v1',
      'qa-pledge-impact-v1',
      released_at_value,
      expires_at_value,
      pool_state_value,
      forecast_value || jsonb_build_object('viewer_id', 'forbidden')
    );
    raise exception 'Expected personalized forecast to fail.';
  exception
    when invalid_parameter_value then null;
  end;
end;
$test$;

reset role;

set local role authenticated;

do $test$
declare
  target_id uuid := (select snapshot_id from pledge_impact_test_state limit 1);
begin
  if not exists (
    select 1 from public.mpgf_pledge_impact_forecast_snapshots where id = target_id
  ) then
    raise exception 'Authenticated public read policy did not expose the released forecast.';
  end if;

  begin
    insert into public.mpgf_pledge_impact_forecast_snapshots (
      pool_public_key, campaign_id, forecast_version, model_version,
      released_at, expires_at, pool_state_json, forecast_json, content_sha256
    )
    select
      'pool-wild-research', 'campaign-animal-welfare-transition', 'direct-insert',
      'forbidden', released_at, expires_at, pool_state, forecast,
      'sha256:' || repeat('b', 64)
    from pledge_impact_test_state;
    raise exception 'Expected direct authenticated forecast insert to fail.';
  exception
    when insufficient_privilege then null;
  end;

  begin
    perform public.release_mpgf_pledge_impact_forecast(
      'pool-wild-research',
      'campaign-animal-welfare-transition',
      'authenticated-release',
      'forbidden',
      timezone('utc', now()),
      timezone('utc', now()) + interval '60 minutes',
      (select pool_state from pledge_impact_test_state limit 1),
      (select forecast from pledge_impact_test_state limit 1)
    );
    raise exception 'Expected authenticated function execution to fail.';
  exception
    when insufficient_privilege then null;
  end;
end;
$test$;

reset role;
rollback;
