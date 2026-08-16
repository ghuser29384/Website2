begin;

-- Tighten operator AAL, exact replay, late-event selection, and immutable
-- supersession status after the initial ledger objects are present.

create table if not exists moral_trade_private.compact_outflow_coverage_status_events (
  id uuid primary key default gen_random_uuid(),
  coverage_snapshot_id uuid not null
    references public.mpgf_public_goods_outflow_coverage_snapshots(id) on delete restrict,
  authority_status text not null check (authority_status in (
    'unavailable', 'incomplete', 'provisional', 'complete', 'superseded', 'invalidated'
  )),
  reason text not null check (length(btrim(reason)) > 0),
  supersedes_status_event_id uuid unique
    references moral_trade_private.compact_outflow_coverage_status_events(id) on delete restrict,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default pg_catalog.now()
);

create index if not exists compact_outflow_coverage_status_events_snapshot_idx
  on moral_trade_private.compact_outflow_coverage_status_events(
    coverage_snapshot_id, created_at desc, id desc
  );

drop trigger if exists compact_outflow_coverage_status_events_append_only_v1
  on moral_trade_private.compact_outflow_coverage_status_events;
create trigger compact_outflow_coverage_status_events_append_only_v1
before update or delete on moral_trade_private.compact_outflow_coverage_status_events
for each row execute function moral_trade_private.reject_compact_outflow_history_mutation_v1();

create or replace function moral_trade_private.require_compact_outflow_operator_v1()
returns uuid
language plpgsql
stable
security definer
set search_path = ''
as $function$
declare
  actor uuid := (select auth.uid());
  jwt_role text := coalesce(auth.jwt() ->> 'role', '');
  assurance_level text := coalesce(auth.jwt() ->> 'aal', '');
begin
  if jwt_role = 'service_role' then return actor; end if;
  if actor is not null
     and assurance_level = 'aal2'
     and moral_trade_private.current_actor_has_trade_role('administrator') then
    return actor;
  end if;
  raise exception using errcode = '42501',
    message = 'AAL2 administrator or workflow service authority is required.';
end;
$function$;

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

  select observation.*, event_meta.*
  into existing_observation, existing_meta
  from public.mpgf_public_goods_outflow_observations observation
  join moral_trade_private.compact_outflow_event_metadata event_meta
    on event_meta.observation_id = observation.id
  where event_meta.canonical_event_hash = p_source_event_hash;

  if existing_observation.id is not null then
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

create or replace function moral_trade_private.freeze_compact_outflow_coverage_v1(
  p_batch_id uuid,
  p_authority_status text,
  p_coverage_reason text,
  p_source_cutoff_at timestamptz,
  p_source_dispositions jsonb,
  p_request_key text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  actor uuid := moral_trade_private.require_compact_outflow_operator_v1();
  batch public.mpgf_public_goods_outflow_coverage_snapshots%rowtype;
  batch_meta moral_trade_private.compact_outflow_coverage_metadata%rowtype;
  latest_prior uuid;
  previous_status_event_id uuid;
  final_id uuid;
  public_status text;
  unresolved_count integer;
  source_scope_value text[];
  source_hash_value text;
  event_hash_value text;
  snapshot_hash_value text;
  event_count integer;
  existing_id uuid;
  bounds record;
begin
  select * into batch
  from public.mpgf_public_goods_outflow_coverage_snapshots where id = p_batch_id;
  select * into batch_meta
  from moral_trade_private.compact_outflow_coverage_metadata
  where coverage_snapshot_id = p_batch_id;
  if batch.id is null or batch_meta.authority_status <> 'provisional' then
    raise exception using errcode = '55000',
      message = 'A provisional Compact outflow ingest batch is required.';
  end if;
  if p_authority_status not in (
       'unavailable','incomplete','provisional','complete','invalidated'
     )
     or length(btrim(p_coverage_reason)) = 0
     or length(btrim(p_request_key)) not between 8 and 240
     or jsonb_typeof(p_source_dispositions) <> 'array' then
    raise exception using errcode = '22023', message = 'Invalid coverage freeze request.';
  end if;
  select * into bounds
  from public.mpgf_public_goods_cycle_bounds_v2(batch.cycle_key);
  if p_source_cutoff_at < bounds.period_end_exclusive
     or p_source_cutoff_at > pg_catalog.now() then
    raise exception using errcode = '23514',
      message = 'Coverage cutoff must be after the prior UTC month and not in the future.';
  end if;

  select coverage_snapshot_id into existing_id
  from moral_trade_private.compact_outflow_coverage_metadata
  where request_key = btrim(p_request_key);
  if existing_id is not null then
    return pg_catalog.jsonb_build_object(
      'ok', true, 'coverageSnapshotId', existing_id,
      'status', 'replayed', 'moneyMoved', false
    );
  end if;

  create temporary table if not exists compact_outflow_source_request (
    adapter_key text primary key,
    disposition text not null,
    source_watermark text not null,
    evidence_hash text not null
  ) on commit drop;
  truncate compact_outflow_source_request;
  insert into compact_outflow_source_request(
    adapter_key, disposition, source_watermark, evidence_hash
  )
  select btrim(item.adapter_key), item.disposition,
    coalesce(item.source_watermark,''), item.evidence_hash
  from pg_catalog.jsonb_to_recordset(p_source_dispositions) as item(
    adapter_key text, disposition text, source_watermark text, evidence_hash text
  );

  if exists (
    select 1 from compact_outflow_source_request request
    left join moral_trade_private.compact_outflow_adapter_registry adapter
      on adapter.adapter_key = request.adapter_key
    where adapter.adapter_key is null
      or adapter.environment <> batch_meta.environment
      or request.disposition not in (
        'complete','incomplete','provisional','excluded','unavailable'
      )
      or request.evidence_hash !~ '^sha256:[a-f0-9]{64}$'
  ) then
    raise exception using errcode = '22023',
      message = 'Coverage source dispositions contain an invalid or wrong-environment adapter.';
  end if;

  select count(*)::integer into unresolved_count
  from moral_trade_private.compact_outflow_adapter_registry adapter
  left join compact_outflow_source_request request
    on request.adapter_key = adapter.adapter_key
  where adapter.environment = batch_meta.environment
    and adapter.required_for_complete
    and coalesce(request.disposition, 'unavailable') <> 'complete';

  if p_authority_status = 'complete' then
    if unresolved_count <> 0
       or batch_meta.currency <> 'USD'
       or exists (
         select 1
         from compact_outflow_source_request request
         join moral_trade_private.compact_outflow_adapter_registry adapter
           using (adapter_key)
         where request.disposition = 'complete'
           and (
             adapter.authority_capability <> 'complete'
             or (adapter.required_for_complete and length(btrim(request.source_watermark)) = 0)
           )
       )
       or exists (
         select 1
         from public.mpgf_public_goods_outflow_observations observation
         join moral_trade_private.compact_outflow_event_metadata event_meta
           on event_meta.observation_id = observation.id
         where observation.participant_id = batch.participant_id
           and event_meta.cycle_key = batch.cycle_key
           and exists (
             select 1 from compact_outflow_source_request request
             where request.adapter_key = event_meta.adapter_key
           )
           and not exists (
             select 1 from moral_trade_private.compact_outflow_event_metadata successor
             where successor.supersedes_observation_id = observation.id
           )
           and (
             event_meta.currency <> 'USD'
             or event_meta.environment <> batch_meta.environment
             or (observation.settlement_status = 'settled'
               and event_meta.settled_at > p_source_cutoff_at)
             or (batch_meta.environment = 'production' and event_meta.is_synthetic)
           )
       ) then
      raise exception using errcode = '23514',
        message = 'Complete authority requires complete-capable watermarked adapters, USD-only facts, matching environment, and no production-synthetic event.';
    end if;
  end if;

  select coalesce(
    pg_catalog.array_agg(adapter_key order by adapter_key), array[]::text[]
  ) into source_scope_value
  from compact_outflow_source_request;

  select 'sha256:' || public.mpgf_public_goods_hash_v2(
    coalesce(pg_catalog.jsonb_agg(
      pg_catalog.jsonb_build_object(
        'adapterKey', adapter_key,
        'disposition', disposition,
        'sourceWatermark', source_watermark,
        'evidenceHash', evidence_hash
      ) order by adapter_key
    ), '[]'::jsonb)
  ) into source_hash_value
  from compact_outflow_source_request;

  select count(*)::integer,
    'sha256:' || public.mpgf_public_goods_hash_v2(
      coalesce(pg_catalog.jsonb_agg(
        pg_catalog.jsonb_build_object(
          'observationId', observation.id,
          'sourceSystem', observation.source_system,
          'sourceRecordKey', observation.source_record_key,
          'canonicalEventHash', event_meta.canonical_event_hash,
          'sourceSequence', event_meta.source_sequence
        ) order by observation.source_system, observation.source_record_key
      ), '[]'::jsonb)
    )
  into event_count, event_hash_value
  from public.mpgf_public_goods_outflow_observations observation
  join moral_trade_private.compact_outflow_event_metadata event_meta
    on event_meta.observation_id = observation.id
  where observation.participant_id = batch.participant_id
    and event_meta.cycle_key = batch.cycle_key
    and exists (
      select 1 from compact_outflow_source_request request
      where request.adapter_key = event_meta.adapter_key
    )
    and not exists (
      select 1 from moral_trade_private.compact_outflow_event_metadata successor
      where successor.supersedes_observation_id = observation.id
    );

  snapshot_hash_value := 'sha256:' || public.mpgf_public_goods_hash_v2(
    pg_catalog.jsonb_build_object(
      'participantId', batch.participant_id,
      'cycleKey', batch.cycle_key,
      'authorityStatus', p_authority_status,
      'coverageVersion', batch_meta.coverage_version,
      'sourceCutoffAt', p_source_cutoff_at,
      'unresolvedSourceCount', unresolved_count,
      'environment', batch_meta.environment,
      'currency', batch_meta.currency,
      'sourceHash', source_hash_value,
      'eventHash', event_hash_value
    )
  );

  select coverage_snapshot_id into existing_id
  from moral_trade_private.compact_outflow_coverage_metadata
  where snapshot_hash = snapshot_hash_value;
  if existing_id is not null then
    return pg_catalog.jsonb_build_object(
      'ok', true, 'coverageSnapshotId', existing_id,
      'status', 'replayed', 'moneyMoved', false
    );
  end if;

  select metadata.coverage_snapshot_id into latest_prior
  from moral_trade_private.compact_outflow_coverage_metadata metadata
  where metadata.participant_id = batch.participant_id
    and metadata.cycle_key = batch.cycle_key
    and metadata.authority_status <> 'provisional'
  order by metadata.created_at desc, metadata.coverage_snapshot_id desc
  limit 1;

  public_status := case
    when p_authority_status = 'complete' then 'complete'
    when p_authority_status in ('incomplete','provisional') then 'partial'
    else 'unavailable'
  end;

  insert into public.mpgf_public_goods_outflow_coverage_snapshots (
    participant_id, cycle_key, period_start, period_end_exclusive,
    coverage_status, coverage_reason, source_scope,
    source_coverage_attested, evidence_hash, observed_at, supersedes_id
  ) values (
    batch.participant_id, batch.cycle_key,
    bounds.period_start, bounds.period_end_exclusive,
    public_status, btrim(p_coverage_reason), source_scope_value,
    p_authority_status = 'complete', snapshot_hash_value,
    p_source_cutoff_at, latest_prior
  ) returning id into final_id;

  insert into moral_trade_private.compact_outflow_coverage_metadata (
    coverage_snapshot_id, participant_id, cycle_key, authority_status,
    coverage_version, source_cutoff_at, unresolved_source_count,
    environment, currency, snapshot_hash, request_key,
    supersedes_coverage_snapshot_id, created_by
  ) values (
    final_id, batch.participant_id, batch.cycle_key, p_authority_status,
    batch_meta.coverage_version, p_source_cutoff_at, unresolved_count,
    batch_meta.environment, batch_meta.currency, snapshot_hash_value,
    btrim(p_request_key), latest_prior, actor
  );

  insert into moral_trade_private.compact_outflow_coverage_sources (
    coverage_snapshot_id, adapter_key, disposition, source_watermark,
    source_cutoff_at, evidence_hash
  )
  select final_id, adapter_key, disposition, source_watermark,
    p_source_cutoff_at, evidence_hash
  from compact_outflow_source_request;

  insert into moral_trade_private.compact_outflow_coverage_observations (
    coverage_snapshot_id, observation_id, source_system, source_record_key
  )
  select final_id, observation.id,
    observation.source_system, observation.source_record_key
  from public.mpgf_public_goods_outflow_observations observation
  join moral_trade_private.compact_outflow_event_metadata event_meta
    on event_meta.observation_id = observation.id
  where observation.participant_id = batch.participant_id
    and event_meta.cycle_key = batch.cycle_key
    and exists (
      select 1 from compact_outflow_source_request request
      where request.adapter_key = event_meta.adapter_key
    )
    and not exists (
      select 1 from moral_trade_private.compact_outflow_event_metadata successor
      where successor.supersedes_observation_id = observation.id
    );

  if latest_prior is not null then
    select status_event.id into previous_status_event_id
    from moral_trade_private.compact_outflow_coverage_status_events status_event
    where status_event.coverage_snapshot_id = latest_prior
    order by status_event.created_at desc, status_event.id desc limit 1;
    insert into moral_trade_private.compact_outflow_coverage_status_events (
      coverage_snapshot_id, authority_status, reason,
      supersedes_status_event_id, created_by
    ) values (
      latest_prior, 'superseded',
      'A later immutable Compact outflow coverage snapshot supersedes this snapshot.',
      previous_status_event_id, actor
    );
  end if;

  insert into moral_trade_private.compact_outflow_coverage_status_events (
    coverage_snapshot_id, authority_status, reason, created_by
  ) values (
    final_id, p_authority_status, btrim(p_coverage_reason), actor
  );

  return pg_catalog.jsonb_build_object(
    'ok', true, 'coverageSnapshotId', final_id,
    'authorityStatus', p_authority_status,
    'unresolvedSourceCount', unresolved_count,
    'sourceObservationCount', event_count,
    'snapshotHash', snapshot_hash_value,
    'moneyMoved', false, 'paymentMandateCreated', false
  );
end;
$function$;

revoke all on table moral_trade_private.compact_outflow_coverage_status_events
  from public, anon, authenticated;
grant select, insert on moral_trade_private.compact_outflow_coverage_status_events
  to service_role;

commit;
