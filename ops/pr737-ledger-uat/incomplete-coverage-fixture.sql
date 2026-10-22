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
begin
  if not exists (select 1 from public.profiles where id = fixture_participant_id) then
    raise exception 'Hosted incomplete-coverage participant is absent.';
  end if;

  batch_id := moral_trade_private.compact_outflow_ingest_batch_v1(
    fixture_participant_id,
    '2026-08',
    'qa',
    'USD',
    'compact-authoritative-outflow-ledger/v1',
    'hosted-ledger-uat-batch-incomplete-v1'
  );

  coverage_result := moral_trade_private.freeze_compact_outflow_coverage_v1(
    batch_id,
    'incomplete',
    'Synthetic hosted-QA source watermark is intentionally incomplete.',
    '2026-08-01T00:00:00Z',
    pg_catalog.jsonb_build_array(
      pg_catalog.jsonb_build_object(
        'adapter_key', 'qa_authoritative_synthetic',
        'disposition', 'incomplete',
        'source_watermark', '',
        'evidence_hash', 'sha256:' || repeat('a', 64)
      )
    ),
    'hosted-ledger-coverage-incomplete-v1'
  );

  coverage_id := (coverage_result ->> 'coverageSnapshotId')::uuid;
  if coverage_id is null
     or coverage_result ->> 'authorityStatus' <> 'incomplete'
     or (coverage_result ->> 'unresolvedSourceCount')::integer <> 1
     or (coverage_result ->> 'sourceObservationCount')::integer <> 0
     or coalesce((coverage_result ->> 'moneyMoved')::boolean, true)
     or coalesce((coverage_result ->> 'paymentMandateCreated')::boolean, true) then
    raise exception 'Incomplete hosted coverage did not freeze exactly: %', coverage_result;
  end if;

  result := public.freeze_mpgf_public_goods_financial_cycle_v2(
    fixture_participant_id,
    '2026-08'
  );

  if result ->> 'authorityStatus' <> 'incomplete'
     or result ->> 'obligationState' <> 'unavailable'
     or result ->> 'eligibleNetSettledOutflowCents' is not null
     or result ->> 'obligationCents' is not null
     or coalesce((result ->> 'moneyMoved')::boolean, true)
     or coalesce((result ->> 'paymentMandateCreated')::boolean, true) then
    raise exception 'Incomplete coverage fabricated an amount or side effect: %', result;
  end if;

  if not exists (
    select 1
    from public.mpgf_public_goods_obligation_snapshots obligation
    where obligation.participant_id = fixture_participant_id
      and obligation.cycle_key = '2026-08'
      and obligation.coverage_snapshot_id = coverage_id
      and obligation.state = 'unavailable'
      and obligation.eligible_net_settled_outflow_cents is null
      and obligation.obligation_cents is null
      and obligation.source_observation_count = 0
  ) then
    raise exception 'No immutable unavailable obligation snapshot was created.';
  end if;
end;
$fixture$;

commit;

select 'hosted_incomplete_coverage|' || count(*)
from moral_trade_private.compact_outflow_coverage_metadata
where participant_id = '712a0000-0000-4000-8000-000000000001'::uuid
  and cycle_key = '2026-08'
  and authority_status = 'incomplete';

select 'hosted_incomplete_obligation|' || count(*)
from public.mpgf_public_goods_obligation_snapshots
where participant_id = '712a0000-0000-4000-8000-000000000001'::uuid
  and cycle_key = '2026-08'
  and state = 'unavailable'
  and eligible_net_settled_outflow_cents is null
  and obligation_cents is null;
