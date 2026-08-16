begin;

-- Replace only the body of the existing public freeze RPC. Its signature and
-- generated type remain unchanged. It now consumes the immutable private
-- coverage links and latest canonical event versions.
create or replace function public.freeze_mpgf_public_goods_financial_cycle_v2(
  p_participant_id uuid,
  p_cycle_key text
)
returns jsonb
language plpgsql
set search_path = ''
as $function$
declare
  period_start_value timestamptz;
  period_end_value timestamptz;
  coverage_record public.mpgf_public_goods_outflow_coverage_snapshots%rowtype;
  coverage_meta moral_trade_private.compact_outflow_coverage_metadata%rowtype;
  authorization_record public.mpgf_public_goods_dormant_authorization_snapshots%rowtype;
  obligation_record public.mpgf_public_goods_obligation_snapshots%rowtype;
  allocation_record public.mpgf_public_goods_allocation_instructions%rowtype;
  eligible_total numeric := 0;
  eligible_total_bigint bigint;
  observation_count integer := 0;
  joined_count integer := 0;
  allocation_count integer := 0;
  allocation_total integer := 0;
  scheduled_total bigint := 0;
  snapshot_hash_value text;
  schedule_hash_value text;
  supersedes_obligation_id uuid;
begin
  if p_participant_id is null then
    raise exception using errcode = '22023', message = 'A participant is required.';
  end if;
  select bounds.period_start, bounds.period_end_exclusive
  into period_start_value, period_end_value
  from public.mpgf_public_goods_cycle_bounds_v2(p_cycle_key) as bounds;
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(p_participant_id::text || ':financial:' || p_cycle_key, 0)
  );

  select coverage, metadata into coverage_record, coverage_meta
  from public.mpgf_public_goods_outflow_coverage_snapshots coverage
  join moral_trade_private.compact_outflow_coverage_metadata metadata
    on metadata.coverage_snapshot_id = coverage.id
  where coverage.participant_id = p_participant_id
    and coverage.cycle_key = p_cycle_key
    and metadata.authority_status <> 'provisional'
  order by metadata.created_at desc, coverage.id desc limit 1;

  if coverage_record.id is null then
    return pg_catalog.jsonb_build_object(
      'ok', true, 'cycleKey', p_cycle_key, 'state', 'unavailable',
      'reason', 'No authoritative outflow coverage snapshot exists.',
      'moneyMoved', false, 'paymentMandateCreated', false
    );
  end if;

  select obligation.id into supersedes_obligation_id
  from public.mpgf_public_goods_obligation_snapshots obligation
  where obligation.participant_id = p_participant_id
    and obligation.cycle_key = p_cycle_key
  order by obligation.frozen_at desc, obligation.id desc limit 1;

  if coverage_meta.authority_status = 'complete'
     and coverage_record.coverage_status = 'complete'
     and coverage_meta.unresolved_source_count = 0
     and coverage_meta.currency = 'USD'
     and coverage_meta.source_cutoff_at >= period_end_value
     and coverage_record.period_start = period_start_value
     and coverage_record.period_end_exclusive = period_end_value then
    select
      coalesce(sum(greatest(
        0,
        observation.gross_settled_cents
          - observation.refunded_cents
          - observation.reversed_cents
          - observation.chargeback_cents
      )), 0),
      count(*)::integer
    into eligible_total, observation_count
    from moral_trade_private.compact_outflow_coverage_observations link
    join public.mpgf_public_goods_outflow_observations observation
      on observation.id = link.observation_id
    join moral_trade_private.compact_outflow_event_metadata event_meta
      on event_meta.observation_id = observation.id
    where link.coverage_snapshot_id = coverage_record.id
      and observation.participant_id = p_participant_id
      and observation.direction = 'outgoing'
      and observation.payment_kind = 'moral_trade_payment'
      and observation.settlement_status = 'settled'
      and observation.occurred_at >= period_start_value
      and observation.occurred_at < period_end_value
      and event_meta.settled_at is not null
      and event_meta.currency = 'USD'
      and event_meta.environment = coverage_meta.environment
      and (coverage_meta.environment <> 'production' or not event_meta.is_synthetic);
    if eligible_total > 9223372036854775807::numeric then
      raise exception using errcode = '22003', message = 'Eligible outflow exceeds the supported bigint range.';
    end if;
    eligible_total_bigint := eligible_total::bigint;
    snapshot_hash_value := 'sha256:' || public.mpgf_public_goods_hash_v2(
      pg_catalog.jsonb_build_object(
        'coverageSnapshotHash', coverage_meta.snapshot_hash,
        'eligibleNetSettledOutflowCents', eligible_total_bigint,
        'obligationCents', eligible_total_bigint / 10,
        'sourceObservationCount', observation_count
      )
    );
    select * into obligation_record
    from public.mpgf_public_goods_obligation_snapshots obligation
    where obligation.participant_id = p_participant_id
      and obligation.cycle_key = p_cycle_key
      and obligation.snapshot_hash = snapshot_hash_value;
    if obligation_record.id is null then
      insert into public.mpgf_public_goods_obligation_snapshots (
        participant_id, cycle_key, coverage_snapshot_id, state,
        eligible_net_settled_outflow_cents, obligation_cents,
        source_observation_count, snapshot_hash, supersedes_id
      ) values (
        p_participant_id, p_cycle_key, coverage_record.id, 'calculated',
        eligible_total_bigint, eligible_total_bigint / 10,
        observation_count, snapshot_hash_value, supersedes_obligation_id
      ) returning * into obligation_record;
    end if;
  else
    snapshot_hash_value := 'sha256:' || public.mpgf_public_goods_hash_v2(
      pg_catalog.jsonb_build_object(
        'coverageSnapshotHash', coverage_meta.snapshot_hash,
        'authorityStatus', coverage_meta.authority_status,
        'state', 'unavailable'
      )
    );
    select * into obligation_record
    from public.mpgf_public_goods_obligation_snapshots obligation
    where obligation.participant_id = p_participant_id
      and obligation.cycle_key = p_cycle_key
      and obligation.snapshot_hash = snapshot_hash_value;
    if obligation_record.id is null then
      insert into public.mpgf_public_goods_obligation_snapshots (
        participant_id, cycle_key, coverage_snapshot_id, state,
        eligible_net_settled_outflow_cents, obligation_cents,
        source_observation_count, snapshot_hash, supersedes_id
      ) values (
        p_participant_id, p_cycle_key, coverage_record.id, 'unavailable',
        null, null, 0, snapshot_hash_value, supersedes_obligation_id
      ) returning * into obligation_record;
    end if;
  end if;

  select count(*)::integer into joined_count
  from public.mpgf_public_goods_compact_memberships
  where participant_id = p_participant_id
    and status in ('pending_activation', 'active', 'exit_notice');
  select * into allocation_record
  from public.mpgf_public_goods_allocation_instructions instruction
  where instruction.participant_id = p_participant_id
    and instruction.cycle_key = p_cycle_key
  order by instruction.submitted_at desc, instruction.id desc limit 1;
  if allocation_record.id is not null then
    select count(*)::integer, coalesce(sum(line.allocation_bps), 0)::integer
    into allocation_count, allocation_total
    from public.mpgf_public_goods_allocation_instruction_lines line
    join public.mpgf_public_goods_compact_memberships membership
      on membership.id = line.membership_id
     and membership.compact_id = line.compact_id
    where line.instruction_id = allocation_record.id
      and membership.participant_id = p_participant_id
      and membership.status in ('pending_activation', 'active', 'exit_notice');
  end if;
  select * into authorization_record
  from public.mpgf_public_goods_dormant_authorization_snapshots dormant_auth
  where dormant_auth.participant_id = p_participant_id
    and dormant_auth.cycle_key = p_cycle_key
  order by dormant_auth.frozen_at desc, dormant_auth.id desc limit 1;

  if obligation_record.state = 'calculated'
    and allocation_record.id is not null
    and joined_count > 0
    and allocation_count = joined_count
    and allocation_total = 10000
    and authorization_record.state = 'valid'
    and authorization_record.expires_at > pg_catalog.now() then
    schedule_hash_value := 'sha256:' || public.mpgf_public_goods_hash_v2(
      pg_catalog.jsonb_build_object(
        'obligationSnapshotId', obligation_record.id,
        'allocationInstructionId', allocation_record.id,
        'authorizationSnapshotId', authorization_record.id
      )
    );
    with allocation_base as (
      select line.membership_id, line.compact_id, line.allocation_bps,
        line.stable_compact_key,
        pg_catalog.floor(obligation_record.obligation_cents::numeric * line.allocation_bps::numeric / 10000)::bigint as base_cents,
        pg_catalog.mod(obligation_record.obligation_cents::numeric * line.allocation_bps::numeric, 10000)::bigint as remainder_numerator
      from public.mpgf_public_goods_allocation_instruction_lines line
      where line.instruction_id = allocation_record.id
    ), ranked as (
      select allocation_base.*,
        pg_catalog.row_number() over (order by remainder_numerator desc, stable_compact_key asc)::integer as remainder_rank,
        obligation_record.obligation_cents - sum(base_cents) over () as cents_left
      from allocation_base
    )
    insert into public.mpgf_public_goods_scheduled_amount_snapshots (
      obligation_snapshot_id, allocation_instruction_id, participant_id,
      cycle_key, membership_id, compact_id, allocation_bps,
      scheduled_contribution_cents, remainder_numerator,
      largest_remainder_rank, snapshot_hash, frozen_at
    )
    select obligation_record.id, allocation_record.id, p_participant_id,
      p_cycle_key, membership_id, compact_id, allocation_bps,
      base_cents + case when remainder_rank <= cents_left then 1 else 0 end,
      remainder_numerator, remainder_rank, schedule_hash_value, pg_catalog.now()
    from ranked on conflict (obligation_snapshot_id, allocation_instruction_id, compact_id) do nothing;
    select coalesce(sum(scheduled_contribution_cents),0)::bigint into scheduled_total
    from public.mpgf_public_goods_scheduled_amount_snapshots
    where obligation_snapshot_id = obligation_record.id
      and allocation_instruction_id = allocation_record.id;
    if scheduled_total <> obligation_record.obligation_cents then
      raise exception using errcode = '23514', message = 'Largest-remainder scheduling did not preserve the aggregate obligation exactly.';
    end if;
  end if;

  return pg_catalog.jsonb_build_object(
    'ok', true, 'cycleKey', p_cycle_key,
    'coverageStatus', coverage_record.coverage_status,
    'authorityStatus', coverage_meta.authority_status,
    'obligationState', obligation_record.state,
    'eligibleNetSettledOutflowCents', obligation_record.eligible_net_settled_outflow_cents,
    'obligationCents', obligation_record.obligation_cents,
    'scheduledTotalCents', case when scheduled_total > 0 or obligation_record.obligation_cents = 0 then scheduled_total else null end,
    'moneyMoved', false, 'paymentMandateCreated', false
  );
end;
$function$;

revoke all on schema moral_trade_private from public, anon, authenticated;
revoke all on all tables in schema moral_trade_private from public, anon, authenticated;
revoke all on all functions in schema moral_trade_private from public, anon, authenticated;
grant usage on schema moral_trade_private to authenticated, service_role;
grant select, insert on
  moral_trade_private.compact_outflow_coverage_metadata,
  moral_trade_private.compact_outflow_coverage_sources,
  moral_trade_private.compact_outflow_event_metadata,
  moral_trade_private.compact_outflow_coverage_observations
  to service_role;
grant select on moral_trade_private.compact_outflow_adapter_registry to service_role;
grant execute on function moral_trade_private.compact_outflow_ingest_batch_v1(uuid,text,text,text,text,text) to authenticated, service_role;
grant execute on function moral_trade_private.record_compact_outflow_event_v1(uuid,text,text,text,text,text,bigint,bigint,bigint,bigint,timestamptz,timestamptz,text,bigint,text,uuid,boolean) to authenticated, service_role;
grant execute on function moral_trade_private.freeze_compact_outflow_coverage_v1(uuid,text,text,timestamptz,jsonb,text) to authenticated, service_role;

comment on function public.freeze_mpgf_public_goods_financial_cycle_v2(uuid,text) is
  'Shadow-only Compact calculation from immutable complete-coverage links and latest canonical USD events. It never creates a charge, mandate, settlement, electorate, or activation.';

commit;
