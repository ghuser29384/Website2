begin;

create or replace function moral_trade_private.record_compact_outflow_event_v1(
  p_batch_id uuid,
  p_adapter_key text,
  p_source_record_key text,
  p_direction text,
  p_payment_kind text,
  p_settlement_status text,
  p_gross_settled_cents bigint,
  p_refunded_cents bigint,
  p_reversed_cents bigint,
  p_chargeback_cents bigint,
  p_occurred_at timestamptz,
  p_settled_at timestamptz,
  p_source_version text,
  p_source_sequence bigint,
  p_source_event_hash text,
  p_supersedes_observation_id uuid default null,
  p_is_synthetic boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  actor uuid := moral_trade_private.require_compact_outflow_operator_v1();
  batch public.mpgf_public_goods_outflow_coverage_snapshots%rowtype;
  metadata moral_trade_private.compact_outflow_coverage_metadata%rowtype;
  adapter moral_trade_private.compact_outflow_adapter_registry%rowtype;
  predecessor public.mpgf_public_goods_outflow_observations%rowtype;
  predecessor_meta moral_trade_private.compact_outflow_event_metadata%rowtype;
  existing_observation public.mpgf_public_goods_outflow_observations%rowtype;
  existing_meta moral_trade_private.compact_outflow_event_metadata%rowtype;
  observation_id_value uuid;
begin
  select * into batch
  from public.mpgf_public_goods_outflow_coverage_snapshots
  where id = p_batch_id;
  select * into metadata
  from moral_trade_private.compact_outflow_coverage_metadata
  where coverage_snapshot_id = p_batch_id;
  select * into adapter
  from moral_trade_private.compact_outflow_adapter_registry
  where adapter_key = p_adapter_key;

  if batch.id is null or metadata.authority_status <> 'provisional' then
    raise exception using errcode = '55000',
      message = 'A current provisional Compact outflow ingest batch is required.';
  end if;
  if adapter.adapter_key is null or adapter.environment <> metadata.environment then
    raise exception using errcode = '23503',
      message = 'The source adapter is not registered for this environment.';
  end if;
  if metadata.environment = 'production' and p_is_synthetic then
    raise exception using errcode = '23514',
      message = 'Synthetic events cannot be recorded as production facts.';
  end if;
  if p_direction not in ('outgoing','incoming','internal','self')
     or p_payment_kind not in (
       'moral_trade_payment','compact_contribution','wallet_funding','deposit','escrow'
     )
     or p_settlement_status not in ('settled','pending','failed')
     or least(
       p_gross_settled_cents,p_refunded_cents,p_reversed_cents,
       p_chargeback_cents,p_source_sequence
     ) < 0
     or p_refunded_cents + p_reversed_cents + p_chargeback_cents > p_gross_settled_cents
     or length(btrim(p_source_record_key)) not between 1 and 300
     or length(btrim(p_source_version)) not between 1 and 120
     or p_source_event_hash !~ '^sha256:[a-f0-9]{64}$' then
    raise exception using errcode = '22023', message = 'Invalid normalized outflow event.';
  end if;
  if (p_settlement_status = 'settled') <> (p_settled_at is not null) then
    raise exception using errcode = '23514',
      message = 'Only settled events may carry a settlement timestamp.';
  end if;
  if p_occurred_at < batch.period_start or p_occurred_at >= batch.period_end_exclusive then
    raise exception using errcode = '23514',
      message = 'The source event must belong to the exact prior UTC month represented by its ingest batch.';
  end if;

  select observation.* into existing_observation
  from public.mpgf_public_goods_outflow_observations observation
  join moral_trade_private.compact_outflow_event_metadata event_meta
    on event_meta.observation_id = observation.id
  where event_meta.canonical_event_hash = p_source_event_hash;

  if existing_observation.id is not null then
    select * into existing_meta
    from moral_trade_private.compact_outflow_event_metadata
    where observation_id = existing_observation.id;
    if existing_observation.participant_id is distinct from batch.participant_id
       or existing_observation.source_system is distinct from p_adapter_key
       or existing_observation.source_record_key is distinct from btrim(p_source_record_key)
       or existing_observation.direction is distinct from p_direction
       or existing_observation.payment_kind is distinct from p_payment_kind
       or existing_observation.settlement_status is distinct from p_settlement_status
       or existing_observation.gross_settled_cents is distinct from p_gross_settled_cents
       or existing_observation.refunded_cents is distinct from p_refunded_cents
       or existing_observation.reversed_cents is distinct from p_reversed_cents
       or existing_observation.chargeback_cents is distinct from p_chargeback_cents
       or existing_observation.occurred_at is distinct from p_occurred_at
       or existing_meta.cycle_key is distinct from batch.cycle_key
       or existing_meta.adapter_key is distinct from p_adapter_key
       or existing_meta.environment is distinct from metadata.environment
       or existing_meta.currency is distinct from metadata.currency
       or existing_meta.source_version is distinct from btrim(p_source_version)
       or existing_meta.source_sequence is distinct from p_source_sequence
       or existing_meta.settled_at is distinct from p_settled_at
       or existing_meta.is_synthetic is distinct from p_is_synthetic
       or existing_meta.supersedes_observation_id is distinct from p_supersedes_observation_id then
      raise exception using errcode = '23514',
        message = 'The immutable source-event hash replay differs from its recorded payload.';
    end if;
    return pg_catalog.jsonb_build_object(
      'ok', true, 'observationId', existing_observation.id,
      'status', 'replayed', 'moneyMoved', false
    );
  end if;

  if p_supersedes_observation_id is not null then
    select * into predecessor
    from public.mpgf_public_goods_outflow_observations
    where id = p_supersedes_observation_id;
    select * into predecessor_meta
    from moral_trade_private.compact_outflow_event_metadata
    where observation_id = p_supersedes_observation_id;
    if predecessor.id is null
       or predecessor.participant_id <> batch.participant_id
       or predecessor.source_system <> p_adapter_key
       or predecessor.source_record_key <> btrim(p_source_record_key)
       or predecessor_meta.cycle_key <> batch.cycle_key
       or predecessor_meta.environment <> metadata.environment
       or predecessor_meta.currency <> metadata.currency
       or predecessor_meta.source_sequence >= p_source_sequence
       or exists (
         select 1 from moral_trade_private.compact_outflow_event_metadata successor
         where successor.supersedes_observation_id = p_supersedes_observation_id
       ) then
      raise exception using errcode = '23514',
        message = 'Adjustment supersession must target the current matching source event with a higher source sequence.';
    end if;
  elsif exists (
    select 1
    from public.mpgf_public_goods_outflow_observations observation
    join moral_trade_private.compact_outflow_event_metadata event_meta
      on event_meta.observation_id = observation.id
    where observation.participant_id = batch.participant_id
      and event_meta.cycle_key = batch.cycle_key
      and observation.source_system = p_adapter_key
      and observation.source_record_key = btrim(p_source_record_key)
      and not exists (
        select 1 from moral_trade_private.compact_outflow_event_metadata successor
        where successor.supersedes_observation_id = observation.id
      )
  ) then
    raise exception using errcode = '23514',
      message = 'A changed source record must explicitly supersede the current canonical event.';
  end if;

  insert into public.mpgf_public_goods_outflow_observations (
    coverage_snapshot_id, participant_id, source_system, source_record_key,
    direction, payment_kind, settlement_status, gross_settled_cents,
    refunded_cents, reversed_cents, chargeback_cents, occurred_at,
    source_event_hash
  ) values (
    p_batch_id, batch.participant_id, p_adapter_key, btrim(p_source_record_key),
    p_direction, p_payment_kind, p_settlement_status, p_gross_settled_cents,
    p_refunded_cents, p_reversed_cents, p_chargeback_cents, p_occurred_at,
    p_source_event_hash
  ) returning id into observation_id_value;

  insert into moral_trade_private.compact_outflow_event_metadata (
    observation_id, participant_id, cycle_key, adapter_key, environment,
    currency, source_version, source_sequence, settled_at, is_synthetic,
    supersedes_observation_id, canonical_event_hash
  ) values (
    observation_id_value, batch.participant_id, batch.cycle_key,
    p_adapter_key, metadata.environment, metadata.currency,
    btrim(p_source_version), p_source_sequence, p_settled_at,
    p_is_synthetic, p_supersedes_observation_id, p_source_event_hash
  );

  return pg_catalog.jsonb_build_object(
    'ok', true, 'observationId', observation_id_value,
    'status', 'recorded', 'moneyMoved', false, 'actorId', actor
  );
end;
$function$;

-- The base Compact resolver orders public coverage and obligation snapshots by
-- their public creation timestamps. PostgreSQL now() is transaction-stable, so
-- multiple immutable snapshots created in one rollback-only test transaction
-- can otherwise tie and leave UUID order to decide which snapshot is current.
-- These triggers serialize same-participant inserts and assign strictly
-- increasing public ordering timestamps without mutating historical rows.
create or replace function moral_trade_private.assign_compact_outflow_coverage_order_v1()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
declare
  next_created_at timestamptz;
begin
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(
      new.participant_id::text || ':coverage-order:' || new.cycle_key,
      0
    )
  );
  select greatest(
    pg_catalog.clock_timestamp(),
    coalesce(
      max(existing.created_at) + interval '1 microsecond',
      pg_catalog.clock_timestamp()
    )
  ) into next_created_at
  from public.mpgf_public_goods_outflow_coverage_snapshots existing
  where existing.participant_id = new.participant_id
    and existing.cycle_key = new.cycle_key;
  new.created_at := next_created_at;
  return new;
end;
$function$;

create or replace function moral_trade_private.assign_compact_outflow_metadata_order_v1()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
declare
  next_created_at timestamptz;
begin
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(
      new.participant_id::text || ':coverage-order:' || new.cycle_key,
      0
    )
  );
  select greatest(
    pg_catalog.clock_timestamp(),
    coalesce(
      max(existing.created_at) + interval '1 microsecond',
      pg_catalog.clock_timestamp()
    )
  ) into next_created_at
  from moral_trade_private.compact_outflow_coverage_metadata existing
  where existing.participant_id = new.participant_id
    and existing.cycle_key = new.cycle_key;
  new.created_at := next_created_at;
  return new;
end;
$function$;

create or replace function moral_trade_private.assign_compact_outflow_obligation_order_v1()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
declare
  next_frozen_at timestamptz;
begin
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(
      new.participant_id::text || ':financial:' || new.cycle_key,
      0
    )
  );
  select greatest(
    pg_catalog.clock_timestamp(),
    coalesce(
      max(existing.frozen_at) + interval '1 microsecond',
      pg_catalog.clock_timestamp()
    )
  ) into next_frozen_at
  from public.mpgf_public_goods_obligation_snapshots existing
  where existing.participant_id = new.participant_id
    and existing.cycle_key = new.cycle_key;
  new.frozen_at := next_frozen_at;
  new.created_at := next_frozen_at;
  return new;
end;
$function$;

drop trigger if exists compact_outflow_coverage_order_v1
  on public.mpgf_public_goods_outflow_coverage_snapshots;
create trigger compact_outflow_coverage_order_v1
before insert on public.mpgf_public_goods_outflow_coverage_snapshots
for each row execute function moral_trade_private.assign_compact_outflow_coverage_order_v1();

drop trigger if exists compact_outflow_metadata_order_v1
  on moral_trade_private.compact_outflow_coverage_metadata;
create trigger compact_outflow_metadata_order_v1
before insert on moral_trade_private.compact_outflow_coverage_metadata
for each row execute function moral_trade_private.assign_compact_outflow_metadata_order_v1();

drop trigger if exists compact_outflow_obligation_order_v1
  on public.mpgf_public_goods_obligation_snapshots;
create trigger compact_outflow_obligation_order_v1
before insert on public.mpgf_public_goods_obligation_snapshots
for each row execute function moral_trade_private.assign_compact_outflow_obligation_order_v1();

revoke all on function moral_trade_private.assign_compact_outflow_coverage_order_v1()
  from public, anon, authenticated;
revoke all on function moral_trade_private.assign_compact_outflow_metadata_order_v1()
  from public, anon, authenticated;
revoke all on function moral_trade_private.assign_compact_outflow_obligation_order_v1()
  from public, anon, authenticated;

commit;
