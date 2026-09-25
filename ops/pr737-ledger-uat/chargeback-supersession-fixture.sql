\set ON_ERROR_STOP on

begin;
set local role service_role;
select pg_catalog.set_config(
  'request.jwt.claims',
  '{"sub":"712a0000-0000-4000-8000-000000000001","role":"service_role"}',
  true
);

do $fixture$
declare
  fixture_participant_id constant uuid := '712a0000-0000-4000-8000-000000000001'::uuid;
  prior_observation_id uuid;
  batch_id uuid;
  coverage_id uuid;
  coverage_result jsonb;
  result jsonb;
  obligation public.mpgf_public_goods_obligation_snapshots%rowtype;
begin
  select observation.id into prior_observation_id
  from public.mpgf_public_goods_outflow_observations observation
  join moral_trade_private.compact_outflow_event_metadata event_meta
    on event_meta.observation_id = observation.id
  where observation.participant_id = fixture_participant_id
    and event_meta.cycle_key = '2026-08'
    and observation.source_system = 'qa_authoritative_synthetic'
    and observation.source_record_key = 'hosted-ledger-payment-a'
    and not exists (
      select 1
      from moral_trade_private.compact_outflow_event_metadata successor
      where successor.supersedes_observation_id = observation.id
    )
  order by event_meta.source_sequence desc, observation.id desc
  limit 1;

  if prior_observation_id is null then
    raise exception 'The refund-adjusted observation required for chargeback supersession is absent.';
  end if;

  batch_id := moral_trade_private.compact_outflow_ingest_batch_v1(
    fixture_participant_id,
    '2026-08',
    'qa',
    'USD',
    'compact-authoritative-outflow-ledger/v1',
    'hosted-ledger-uat-batch-chargeback-v3'
  );

  result := moral_trade_private.record_compact_outflow_event_v1(
    batch_id,
    'qa_authoritative_synthetic',
    'hosted-ledger-payment-a',
    'outgoing',
    'moral_trade_payment',
    'settled',
    12345,
    2345,
    0,
    1000,
    '2026-07-10T12:00:00Z',
    '2026-08-22T12:00:00Z',
    'hosted-qa-v3-chargeback',
    3,
    'sha256:' || repeat('f', 64),
    prior_observation_id,
    true
  );

  if result ->> 'status' <> 'recorded' then
    raise exception 'Chargeback adjustment was not recorded: %', result;
  end if;

  coverage_result := moral_trade_private.freeze_compact_outflow_coverage_v1(
    batch_id,
    'complete',
    'Synthetic hosted-QA chargeback reconciled in a superseding complete snapshot.',
    '2026-08-23T00:00:00Z',
    pg_catalog.jsonb_build_array(
      pg_catalog.jsonb_build_object(
        'adapter_key', 'qa_authoritative_synthetic',
        'disposition', 'complete',
        'source_watermark', 'hosted-ledger-watermark-chargeback-v3',
        'evidence_hash', 'sha256:' || repeat('9', 64)
      )
    ),
    'hosted-ledger-coverage-chargeback-v3'
  );

  coverage_id := (coverage_result ->> 'coverageSnapshotId')::uuid;
  if coverage_id is null
     or coverage_result ->> 'authorityStatus' <> 'complete'
     or (coverage_result ->> 'sourceObservationCount')::integer <> 1
     or coalesce((coverage_result ->> 'moneyMoved')::boolean, true)
     or coalesce((coverage_result ->> 'paymentMandateCreated')::boolean, true) then
    raise exception 'Chargeback coverage did not freeze exactly: %', coverage_result;
  end if;

  result := public.freeze_mpgf_public_goods_financial_cycle_v2(
    fixture_participant_id,
    '2026-08'
  );

  if result ->> 'authorityStatus' <> 'complete'
     or result ->> 'obligationState' <> 'calculated'
     or (result ->> 'eligibleNetSettledOutflowCents')::bigint <> 9000
     or (result ->> 'obligationCents')::bigint <> 900
     or coalesce((result ->> 'moneyMoved')::boolean, true)
     or coalesce((result ->> 'paymentMandateCreated')::boolean, true) then
    raise exception 'Chargeback supersession did not yield the exact shadow result: %', result;
  end if;

  select * into obligation
  from public.mpgf_public_goods_obligation_snapshots candidate
  where candidate.participant_id = fixture_participant_id
    and candidate.cycle_key = '2026-08'
  order by candidate.frozen_at desc, candidate.id desc
  limit 1;

  if obligation.id is null
     or obligation.coverage_snapshot_id <> coverage_id
     or obligation.eligible_net_settled_outflow_cents <> 9000
     or obligation.obligation_cents <> 900
     or obligation.supersedes_id is null then
    raise exception 'Chargeback obligation did not preserve explicit supersession.';
  end if;

  if (
    select count(*)
    from public.mpgf_public_goods_obligation_snapshots snapshots
    where snapshots.participant_id = fixture_participant_id
      and snapshots.cycle_key = '2026-08'
      and snapshots.supersedes_id is not null
  ) < 3 then
    raise exception 'The unavailable, complete, refund, and chargeback obligation lineage is incomplete.';
  end if;
end;
$fixture$;

commit;

select 'hosted_chargeback_active_observation|' || count(*)
from public.mpgf_public_goods_outflow_observations observation
join moral_trade_private.compact_outflow_event_metadata event_meta
  on event_meta.observation_id = observation.id
where observation.participant_id = '712a0000-0000-4000-8000-000000000001'::uuid
  and observation.source_record_key = 'hosted-ledger-payment-a'
  and event_meta.source_sequence = 3
  and not exists (
    select 1
    from moral_trade_private.compact_outflow_event_metadata successor
    where successor.supersedes_observation_id = observation.id
  );

select 'hosted_chargeback_shadow_obligation|' || count(*)
from public.mpgf_public_goods_obligation_snapshots
where participant_id = '712a0000-0000-4000-8000-000000000001'::uuid
  and cycle_key = '2026-08'
  and eligible_net_settled_outflow_cents = 9000
  and obligation_cents = 900
  and supersedes_id is not null;
