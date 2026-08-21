\set ON_ERROR_STOP on

begin;

select pg_catalog.set_config('request.jwt.claim.role', 'service_role', true);
select pg_catalog.set_config(
  'request.jwt.claim.sub',
  '712a0000-0000-4000-8000-000000000001',
  true
);

do $fixture$
declare
  participant_id constant uuid := '712a0000-0000-4000-8000-000000000001'::uuid;
  batch_id uuid;
  coverage_id uuid;
  result jsonb;
begin
  if not exists (select 1 from public.profiles where id = participant_id) then
    raise exception 'Hosted ledger fixture participant is absent.';
  end if;

  batch_id := moral_trade_private.compact_outflow_ingest_batch_v1(
    participant_id,
    '2026-08',
    'qa',
    'USD',
    'hosted-ledger-uat-v1',
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
    'v1',
    1,
    'sha256:' || repeat('d', 64),
    null,
    true
  );

  if result ->> 'status' <> 'inserted' then
    raise exception 'Hosted ledger fixture event was not inserted: %', result;
  end if;

  coverage_id := moral_trade_private.compact_outflow_freeze_coverage_v1(
    batch_id,
    '2026-08-01T00:00:00Z',
    pg_catalog.jsonb_build_array(
      pg_catalog.jsonb_build_object(
        'adapterKey', 'qa_authoritative_synthetic',
        'disposition', 'complete',
        'sourceWatermark', 'hosted-ledger-watermark-member-a-v1',
        'sourceCutoffAt', '2026-08-01T00:00:00Z',
        'evidenceHash', 'sha256:' || repeat('e', 64)
      )
    )
  );

  result := moral_trade_private.freeze_compact_outflow_obligation_v1(
    participant_id,
    '2026-08',
    coverage_id,
    'hosted-ledger-obligation-member-a-v1'
  );

  if result ->> 'authorityStatus' <> 'complete'
     or (result ->> 'eligibleNetSettledOutflowCents')::bigint <> 12345
     or (result ->> 'obligationCents')::bigint <> 1234
     or coalesce((result ->> 'moneyMoved')::boolean, true) then
    raise exception 'Hosted ledger fixture obligation was not the exact shadow-only result: %', result;
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
  and obligation_cents = 1234
  and collection_attempted = false;
