\set ON_ERROR_STOP on
\set VERBOSITY verbose

begin;
set local role service_role;
select pg_catalog.set_config('request.jwt.claims', '{"role":"service_role"}', true);

do $fixture$
declare
  batch_a uuid;
  event_a1 uuid;
  event_b1 uuid;
  replay_result jsonb;
  coverage_result jsonb;
  cycle_result jsonb;
  batch_b uuid;
begin
  batch_a := moral_trade_private.compact_outflow_ingest_batch_v1(
    '712a0000-0000-4000-8000-000000000001',
    '2026-08',
    'qa',
    'USD',
    'compact-authoritative-outflow-ledger/v1',
    'qa.pr737.ledger.batch.member-a.0001'
  );

  event_a1 := (moral_trade_private.record_compact_outflow_event_v1(
    batch_a,
    'qa_authoritative_synthetic',
    'member-a-payment-a',
    'outgoing',
    'moral_trade_payment',
    'settled',
    10000,
    0,
    0,
    0,
    '2026-07-05T12:00:00Z',
    '2026-07-05T12:01:00Z',
    'qa-pr737-v1',
    1,
    'sha256:1000000000000000000000000000000000000000000000000000000000000001',
    null,
    true
  )->>'observationId')::uuid;

  perform moral_trade_private.record_compact_outflow_event_v1(
    batch_a,
    'qa_authoritative_synthetic',
    'member-a-payment-a',
    'outgoing',
    'moral_trade_payment',
    'settled',
    10000,
    2000,
    0,
    0,
    '2026-07-05T12:00:00Z',
    '2026-07-20T12:00:00Z',
    'qa-pr737-v1',
    2,
    'sha256:2000000000000000000000000000000000000000000000000000000000000002',
    event_a1,
    true
  );

  event_b1 := (moral_trade_private.record_compact_outflow_event_v1(
    batch_a,
    'qa_authoritative_synthetic',
    'member-a-payment-b',
    'outgoing',
    'moral_trade_payment',
    'settled',
    5000,
    0,
    1000,
    0,
    '2026-07-10T12:00:00Z',
    '2026-07-11T12:00:00Z',
    'qa-pr737-v1',
    1,
    'sha256:3000000000000000000000000000000000000000000000000000000000000003',
    null,
    true
  )->>'observationId')::uuid;

  perform moral_trade_private.record_compact_outflow_event_v1(
    batch_a,
    'qa_authoritative_synthetic',
    'member-a-payment-c',
    'outgoing',
    'moral_trade_payment',
    'settled',
    7000,
    0,
    0,
    3000,
    '2026-07-15T12:00:00Z',
    '2026-07-16T12:00:00Z',
    'qa-pr737-v1',
    1,
    'sha256:4000000000000000000000000000000000000000000000000000000000000004',
    null,
    true
  );

  replay_result := moral_trade_private.record_compact_outflow_event_v1(
    batch_a,
    'qa_authoritative_synthetic',
    'member-a-payment-b',
    'outgoing',
    'moral_trade_payment',
    'settled',
    5000,
    0,
    1000,
    0,
    '2026-07-10T12:00:00Z',
    '2026-07-11T12:00:00Z',
    'qa-pr737-v1',
    1,
    'sha256:3000000000000000000000000000000000000000000000000000000000000003',
    null,
    true
  );

  if replay_result->>'status' <> 'replayed'
     or (replay_result->>'observationId')::uuid <> event_b1
     or (replay_result->>'moneyMoved')::boolean then
    raise exception 'Exact immutable event replay failed: %', replay_result;
  end if;

  coverage_result := moral_trade_private.freeze_compact_outflow_coverage_v1(
    batch_a,
    'complete',
    'Synthetic isolated-QA coverage is complete through the exact prior UTC month.',
    '2026-08-01T00:00:00Z',
    '[{"adapter_key":"qa_authoritative_synthetic","disposition":"complete","source_watermark":"qa:pr737:2026-08-01","evidence_hash":"sha256:5000000000000000000000000000000000000000000000000000000000000005"}]'::jsonb,
    'qa.pr737.ledger.coverage.member-a.0001'
  );

  if (coverage_result->>'moneyMoved')::boolean then
    raise exception 'Coverage freeze incorrectly reported money movement: %', coverage_result;
  end if;

  cycle_result := public.freeze_mpgf_public_goods_financial_cycle_v2(
    '712a0000-0000-4000-8000-000000000001',
    '2026-08'
  );

  if cycle_result->>'authorityStatus' <> 'complete'
     or (cycle_result->>'eligibleNetSettledOutflowCents')::bigint <> 16000
     or (cycle_result->>'obligationCents')::bigint <> 1600
     or (cycle_result->>'moneyMoved')::boolean
     or (cycle_result->>'paymentMandateCreated')::boolean then
    raise exception 'Complete coverage did not produce the exact shadow-only result: %', cycle_result;
  end if;

  batch_b := moral_trade_private.compact_outflow_ingest_batch_v1(
    '712b0000-0000-4000-8000-000000000002',
    '2026-08',
    'qa',
    'USD',
    'compact-authoritative-outflow-ledger/v1',
    'qa.pr737.ledger.batch.member-b.0001'
  );

  coverage_result := moral_trade_private.freeze_compact_outflow_coverage_v1(
    batch_b,
    'incomplete',
    'The isolated-QA source watermark is intentionally incomplete for fail-closed UAT.',
    '2026-08-01T00:00:00Z',
    '[{"adapter_key":"qa_authoritative_synthetic","disposition":"incomplete","source_watermark":"","evidence_hash":"sha256:6000000000000000000000000000000000000000000000000000000000000006"}]'::jsonb,
    'qa.pr737.ledger.coverage.member-b.0001'
  );

  if (coverage_result->>'moneyMoved')::boolean then
    raise exception 'Incomplete coverage freeze incorrectly reported money movement: %', coverage_result;
  end if;

  cycle_result := public.freeze_mpgf_public_goods_financial_cycle_v2(
    '712b0000-0000-4000-8000-000000000002',
    '2026-08'
  );

  if cycle_result->>'obligationState' <> 'unavailable'
     or cycle_result->>'eligibleNetSettledOutflowCents' is not null
     or cycle_result->>'obligationCents' is not null
     or (cycle_result->>'moneyMoved')::boolean
     or (cycle_result->>'paymentMandateCreated')::boolean then
    raise exception 'Incomplete coverage failed to remain amountless and unavailable: %', cycle_result;
  end if;
end;
$fixture$;

commit;
