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
  batch_id uuid;
  coverage_id uuid;
  coverage_result jsonb;
  result jsonb;
  obligation public.mpgf_public_goods_obligation_snapshots%rowtype;
begin
  if not exists (select 1 from public.profiles where id = fixture_participant_id) then
    raise exception 'Hosted ledger fixture participant is absent.';
  end if;

  batch_id := moral_trade_private.compact_outflow_ingest_batch_v1(
    fixture_participant_id,
    '2026-08',
    'qa',
    'USD',
    'compact-authoritative-outflow-ledger/v1',
    'hosted-ledger-uat-batch-member-a-v1'
  );

  result := moral_trade_private.record_compact_outflow_event_v1(
    batch_id,
    'qa_authoritative_synthetic',
    'hosted-ledger-payment-a',
    'outgoing',
    'moral_trade_payment',
    'settled',
    12345,
    0,
    0,
    0,
    '2026-07-10T12:00:00Z',
    '2026-07-10T12:05:00Z',
    'hosted-qa-v1',
    1,
    'sha256:' || repeat('d', 64),
    null,
    true
  );

  if result ->> 'status' <> 'recorded' then
    raise exception 'Hosted ledger fixture event was not recorded: %', result;
  end if;

  coverage_result := moral_trade_private.freeze_compact_outflow_coverage_v1(
    batch_id,
    'complete',
    'Synthetic hosted-QA coverage complete through the exact prior UTC month.',
    '2026-08-01T00:00:00Z',
    pg_catalog.jsonb_build_array(
      pg_catalog.jsonb_build_object(
        'adapter_key', 'qa_authoritative_synthetic',
        'disposition', 'complete',
        'source_watermark', 'hosted-ledger-watermark-member-a-v1',
        'evidence_hash', 'sha256:' || repeat('e', 64)
      )
    ),
    'hosted-ledger-coverage-member-a-v1'
  );

  coverage_id := (coverage_result ->> 'coverageSnapshotId')::uuid;
  if coverage_id is null
     or coverage_result ->> 'authorityStatus' <> 'complete'
     or (coverage_result ->> 'sourceObservationCount')::integer <> 1
     or coalesce((coverage_result ->> 'moneyMoved')::boolean, true)
     or coalesce((coverage_result ->> 'paymentMandateCreated')::boolean, true) then
    raise exception 'Hosted ledger fixture coverage did not freeze exactly: %', coverage_result;
  end if;

  result := public.freeze_mpgf_public_goods_financial_cycle_v2(
    fixture_participant_id,
    '2026-08'
  );

  if result ->> 'authorityStatus' <> 'complete'
     or result ->> 'obligationState' <> 'calculated'
     or (result ->> 'eligibleNetSettledOutflowCents')::bigint <> 12345
     or (result ->> 'obligationCents')::bigint <> 1234
     or coalesce((result ->> 'moneyMoved')::boolean, true)
     or coalesce((result ->> 'paymentMandateCreated')::boolean, true) then
    raise exception 'Hosted ledger fixture obligation was not the exact shadow-only result: %', result;
  end if;

  select * into obligation
  from public.mpgf_public_goods_obligation_snapshots candidate
  where candidate.participant_id = fixture_participant_id
    and candidate.cycle_key = '2026-08'
  order by candidate.frozen_at desc, candidate.id desc
  limit 1;

  if obligation.id is null
     or obligation.coverage_snapshot_id <> coverage_id
     or obligation.state <> 'calculated'
     or obligation.eligible_net_settled_outflow_cents <> 12345
     or obligation.obligation_cents <> 1234
     or obligation.source_observation_count <> 1
     or obligation.supersedes_id is null then
    raise exception 'The complete obligation did not supersede the prior unavailable snapshot.';
  end if;
end;
$fixture$;

commit;

select 'hosted_complete_coverage|' || count(*)
from moral_trade_private.compact_outflow_coverage_metadata
where participant_id = '712a0000-0000-4000-8000-000000000001'::uuid
  and cycle_key = '2026-08'
  and authority_status = 'complete';

select 'hosted_outflow_observations|' || count(*)
from public.mpgf_public_goods_outflow_observations
where participant_id = '712a0000-0000-4000-8000-000000000001'::uuid
  and cycle_key = '2026-08';

select 'hosted_shadow_obligation|' || count(*)
from public.mpgf_public_goods_obligation_snapshots
where participant_id = '712a0000-0000-4000-8000-000000000001'::uuid
  and cycle_key = '2026-08'
  and eligible_net_settled_outflow_cents = 12345
  and obligation_cents = 1234;
