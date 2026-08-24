begin;

-- Compact authoritative eligible-outflow ledger v1.
-- Extends the existing Compact v2 placeholder relations without creating a
-- competing public source of truth. Public observations remain append-only;
-- private metadata supplies environment, currency, sequence, supersession,
-- adapter coverage, and immutable freeze provenance.

create table if not exists moral_trade_private.compact_outflow_adapter_registry (
  adapter_key text primary key check (adapter_key ~ '^[a-z0-9]+(?:_[a-z0-9]+)*$'),
  environment text not null check (environment in ('qa', 'preview', 'staging', 'production')),
  disposition text not null check (disposition in ('eligible', 'excluded', 'unavailable')),
  required_for_complete boolean not null default false,
  authority_capability text not null check (authority_capability in ('complete', 'provisional', 'none')),
  description text not null check (length(btrim(description)) between 10 and 2000),
  created_at timestamptz not null default pg_catalog.now()
);

insert into moral_trade_private.compact_outflow_adapter_registry (
  adapter_key, environment, disposition, required_for_complete,
  authority_capability, description
) values
  ('core_trade_external_payment_evidence', 'production', 'unavailable', true, 'provisional',
   'Participant-reported and independently reviewable external-payment evidence; no provider-complete refund, reversal, or chargeback stream exists.'),
  ('donation_redirect_external_provider', 'production', 'unavailable', true, 'none',
   'Donation Redirect and Donation Upgrade are provider-handoff or preview surfaces; no authoritative provider settlement adapter exists.'),
  ('cofund_coact_external_provider', 'production', 'unavailable', true, 'none',
   'Co-Fund and Co-Act monetary legs do not yet expose an authoritative complete settlement and adjustment adapter.'),
  ('threshold_pool_external_provider', 'production', 'unavailable', true, 'none',
   'DAC and threshold-pool payment execution remains unavailable; commitments and previews are not settlement facts.'),
  ('compact_contribution', 'production', 'excluded', false, 'none',
   'Compact contributions are excluded from the Compact outflow base to prevent recursive assessment.'),
  ('internal_wallet_transfer', 'production', 'excluded', false, 'none',
   'Wallet top-ups, deposits, escrow, reserves, and internal or same-owner transfers are excluded.'),
  ('qa_authoritative_synthetic', 'qa', 'eligible', true, 'complete',
   'Synthetic isolated-QA adapter used only to execute deterministic authority, privacy, supersession, and rollback tests.')
on conflict (adapter_key) do nothing;

create table if not exists moral_trade_private.compact_outflow_coverage_metadata (
  coverage_snapshot_id uuid primary key
    references public.mpgf_public_goods_outflow_coverage_snapshots(id) on delete restrict,
  participant_id uuid not null references public.profiles(id) on delete cascade,
  cycle_key text not null check (cycle_key ~ '^\d{4}-(0[1-9]|1[0-2])$'),
  authority_status text not null check (authority_status in (
    'unavailable', 'incomplete', 'provisional', 'complete', 'superseded', 'invalidated'
  )),
  coverage_version text not null check (length(btrim(coverage_version)) between 1 and 120),
  source_cutoff_at timestamptz not null,
  unresolved_source_count integer not null check (unresolved_source_count >= 0),
  environment text not null check (environment in ('qa', 'preview', 'staging', 'production')),
  currency text not null check (currency ~ '^[A-Z]{3}$'),
  snapshot_hash text not null unique check (snapshot_hash ~ '^sha256:[a-f0-9]{64}$'),
  request_key text not null unique check (length(request_key) between 8 and 240),
  supersedes_coverage_snapshot_id uuid
    references public.mpgf_public_goods_outflow_coverage_snapshots(id) on delete restrict,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default pg_catalog.now(),
  check (
    (authority_status = 'complete' and unresolved_source_count = 0)
    or authority_status <> 'complete'
  )
);

create table if not exists moral_trade_private.compact_outflow_coverage_sources (
  coverage_snapshot_id uuid not null
    references public.mpgf_public_goods_outflow_coverage_snapshots(id) on delete restrict,
  adapter_key text not null
    references moral_trade_private.compact_outflow_adapter_registry(adapter_key) on delete restrict,
  disposition text not null check (disposition in (
    'complete', 'incomplete', 'provisional', 'excluded', 'unavailable'
  )),
  source_watermark text not null default '',
  source_cutoff_at timestamptz not null,
  evidence_hash text not null check (evidence_hash ~ '^sha256:[a-f0-9]{64}$'),
  created_at timestamptz not null default pg_catalog.now(),
  primary key (coverage_snapshot_id, adapter_key)
);

create table if not exists moral_trade_private.compact_outflow_event_metadata (
  observation_id uuid primary key
    references public.mpgf_public_goods_outflow_observations(id) on delete restrict,
  participant_id uuid not null references public.profiles(id) on delete cascade,
  cycle_key text not null check (cycle_key ~ '^\d{4}-(0[1-9]|1[0-2])$'),
  adapter_key text not null
    references moral_trade_private.compact_outflow_adapter_registry(adapter_key) on delete restrict,
  environment text not null check (environment in ('qa', 'preview', 'staging', 'production')),
  currency text not null check (currency ~ '^[A-Z]{3}$'),
  source_version text not null check (length(btrim(source_version)) between 1 and 120),
  source_sequence bigint not null check (source_sequence >= 0),
  settled_at timestamptz,
  is_synthetic boolean not null default false,
  supersedes_observation_id uuid unique
    references public.mpgf_public_goods_outflow_observations(id) on delete restrict,
  canonical_event_hash text not null unique check (canonical_event_hash ~ '^sha256:[a-f0-9]{64}$'),
  created_at timestamptz not null default pg_catalog.now()
);

create table if not exists moral_trade_private.compact_outflow_coverage_observations (
  coverage_snapshot_id uuid not null
    references public.mpgf_public_goods_outflow_coverage_snapshots(id) on delete restrict,
  observation_id uuid not null
    references public.mpgf_public_goods_outflow_observations(id) on delete restrict,
  source_system text not null,
  source_record_key text not null,
  linked_at timestamptz not null default pg_catalog.now(),
  primary key (coverage_snapshot_id, observation_id),
  unique (coverage_snapshot_id, source_system, source_record_key)
);

create index if not exists compact_outflow_event_metadata_participant_cycle_idx
  on moral_trade_private.compact_outflow_event_metadata(participant_id, cycle_key, adapter_key);
create index if not exists compact_outflow_coverage_metadata_participant_cycle_idx
  on moral_trade_private.compact_outflow_coverage_metadata(participant_id, cycle_key, created_at desc);

comment on table moral_trade_private.compact_outflow_adapter_registry is
  'Frozen source-of-truth map for Compact outflow authority. Production adapters remain unavailable until a provider-complete settlement and adjustment feed exists.';
comment on table moral_trade_private.compact_outflow_event_metadata is
  'Private append-only provenance for normalized public Compact outflow observations, including environment, currency, sequence, synthetic status, and supersession.';
comment on table moral_trade_private.compact_outflow_coverage_metadata is
  'Private immutable coverage authority status, cutoff, version, currency, environment, unresolved count, and snapshot identity.';

create or replace function moral_trade_private.reject_compact_outflow_history_mutation_v1()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
begin
  raise exception using errcode = '55000', message = 'Compact outflow authority history is append-only.';
end;
$function$;

do $block$
declare
  relation_name text;
begin
  foreach relation_name in array array[
    'compact_outflow_adapter_registry',
    'compact_outflow_coverage_metadata',
    'compact_outflow_coverage_sources',
    'compact_outflow_event_metadata',
    'compact_outflow_coverage_observations'
  ] loop
    execute pg_catalog.format(
      'drop trigger if exists %I on moral_trade_private.%I',
      relation_name || '_append_only_v1', relation_name
    );
    execute pg_catalog.format(
      'create trigger %I before update or delete on moral_trade_private.%I for each row execute function moral_trade_private.reject_compact_outflow_history_mutation_v1()',
      relation_name || '_append_only_v1', relation_name
    );
  end loop;
end;
$block$;

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
begin
  if jwt_role = 'service_role' then return actor; end if;
  if moral_trade_private.current_actor_has_trade_role('administrator') then return actor; end if;
  raise exception using errcode = '42501', message = 'AAL2 administrator or workflow service authority is required.';
end;
$function$;

create or replace function moral_trade_private.compact_outflow_ingest_batch_v1(
  p_participant_id uuid,
  p_cycle_key text,
  p_environment text,
  p_currency text,
  p_coverage_version text,
  p_request_key text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $function$
declare
  actor uuid := moral_trade_private.require_compact_outflow_operator_v1();
  bounds record;
  existing_id uuid;
  batch_id uuid;
  evidence_hash_value text;
begin
  if p_participant_id is null or not exists (select 1 from public.profiles where id = p_participant_id) then
    raise exception using errcode = '23503', message = 'A valid participant profile is required.';
  end if;
  if p_environment not in ('qa', 'preview', 'staging', 'production')
     or upper(btrim(p_currency)) !~ '^[A-Z]{3}$'
     or length(btrim(p_coverage_version)) not between 1 and 120
     or length(btrim(p_request_key)) not between 8 and 240 then
    raise exception using errcode = '22023', message = 'Invalid outflow batch parameters.';
  end if;
  select * into bounds from public.mpgf_public_goods_cycle_bounds_v2(p_cycle_key);
  select metadata.coverage_snapshot_id into existing_id
  from moral_trade_private.compact_outflow_coverage_metadata metadata
  where metadata.request_key = btrim(p_request_key);
  if existing_id is not null then return existing_id; end if;

  evidence_hash_value := 'sha256:' || public.mpgf_public_goods_hash_v2(
    pg_catalog.jsonb_build_object(
      'participantId', p_participant_id,
      'cycleKey', p_cycle_key,
      'environment', p_environment,
      'currency', upper(btrim(p_currency)),
      'coverageVersion', btrim(p_coverage_version),
      'requestKey', btrim(p_request_key),
      'kind', 'ingest_batch'
    )
  );
  insert into public.mpgf_public_goods_outflow_coverage_snapshots (
    participant_id, cycle_key, period_start, period_end_exclusive,
    coverage_status, coverage_reason, source_scope,
    source_coverage_attested, evidence_hash, observed_at
  ) values (
    p_participant_id, p_cycle_key, bounds.period_start, bounds.period_end_exclusive,
    'partial', 'Provisional operator ingest batch; not authoritative coverage.',
    array[]::text[], false, evidence_hash_value, pg_catalog.now()
  ) returning id into batch_id;
  insert into moral_trade_private.compact_outflow_coverage_metadata (
    coverage_snapshot_id, participant_id, cycle_key, authority_status,
    coverage_version, source_cutoff_at, unresolved_source_count,
    environment, currency, snapshot_hash, request_key,
    supersedes_coverage_snapshot_id, created_by
  ) values (
    batch_id, p_participant_id, p_cycle_key, 'provisional',
    btrim(p_coverage_version), pg_catalog.now(), 1,
    p_environment, upper(btrim(p_currency)), evidence_hash_value,
    btrim(p_request_key), null, actor
  );
  return batch_id;
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
  existing_id uuid;
  observation_id_value uuid;
  canonical_hash text;
begin
  select * into batch from public.mpgf_public_goods_outflow_coverage_snapshots where id = p_batch_id;
  select * into metadata from moral_trade_private.compact_outflow_coverage_metadata where coverage_snapshot_id = p_batch_id;
  select * into adapter from moral_trade_private.compact_outflow_adapter_registry where adapter_key = p_adapter_key;
  if batch.id is null or metadata.authority_status <> 'provisional' then
    raise exception using errcode = '55000', message = 'A current provisional Compact outflow ingest batch is required.';
  end if;
  if adapter.adapter_key is null or adapter.environment <> metadata.environment then
    raise exception using errcode = '23503', message = 'The source adapter is not registered for this environment.';
  end if;
  if metadata.environment = 'production' and p_is_synthetic then
    raise exception using errcode = '23514', message = 'Synthetic events cannot be recorded as production facts.';
  end if;
  if p_direction not in ('outgoing','incoming','internal','self')
     or p_payment_kind not in ('moral_trade_payment','compact_contribution','wallet_funding','deposit','escrow')
     or p_settlement_status not in ('settled','pending','failed')
     or least(p_gross_settled_cents,p_refunded_cents,p_reversed_cents,p_chargeback_cents,p_source_sequence) < 0
     or p_refunded_cents + p_reversed_cents + p_chargeback_cents > p_gross_settled_cents
     or length(btrim(p_source_record_key)) not between 1 and 300
     or length(btrim(p_source_version)) not between 1 and 120
     or p_source_event_hash !~ '^sha256:[a-f0-9]{64}$' then
    raise exception using errcode = '22023', message = 'Invalid normalized outflow event.';
  end if;
  if p_settlement_status = 'settled' and p_settled_at is null then
    raise exception using errcode = '23514', message = 'Settled events require a settlement timestamp.';
  end if;
  if p_occurred_at < batch.period_start or p_occurred_at >= batch.period_end_exclusive then
    raise exception using errcode = '23514', message = 'The source event must belong to the exact prior UTC month represented by its ingest batch.';
  end if;

  select observation.id into existing_id
  from public.mpgf_public_goods_outflow_observations observation
  join moral_trade_private.compact_outflow_event_metadata event_meta
    on event_meta.observation_id = observation.id
  where event_meta.canonical_event_hash = p_source_event_hash;
  if existing_id is not null then
    return pg_catalog.jsonb_build_object('ok', true, 'observationId', existing_id, 'status', 'replayed', 'moneyMoved', false);
  end if;

  if p_supersedes_observation_id is not null then
    select * into predecessor from public.mpgf_public_goods_outflow_observations where id = p_supersedes_observation_id;
    select * into predecessor_meta from moral_trade_private.compact_outflow_event_metadata where observation_id = p_supersedes_observation_id;
    if predecessor.id is null
       or predecessor.participant_id <> batch.participant_id
       or predecessor.source_system <> p_adapter_key
       or predecessor.source_record_key <> btrim(p_source_record_key)
       or predecessor_meta.source_sequence >= p_source_sequence
       or exists (
         select 1 from moral_trade_private.compact_outflow_event_metadata successor
         where successor.supersedes_observation_id = p_supersedes_observation_id
       ) then
      raise exception using errcode = '23514', message = 'Adjustment supersession must target the current matching source event with a higher source sequence.';
    end if;
  elsif exists (
    select 1
    from public.mpgf_public_goods_outflow_observations observation
    join moral_trade_private.compact_outflow_event_metadata event_meta on event_meta.observation_id = observation.id
    where observation.participant_id = batch.participant_id
      and observation.source_system = p_adapter_key
      and observation.source_record_key = btrim(p_source_record_key)
      and not exists (
        select 1 from moral_trade_private.compact_outflow_event_metadata successor
        where successor.supersedes_observation_id = observation.id
      )
  ) then
    raise exception using errcode = '23514', message = 'A changed source record must explicitly supersede the current canonical event.';
  end if;

  canonical_hash := p_source_event_hash;
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
    p_is_synthetic, p_supersedes_observation_id, canonical_hash
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
  select * into batch from public.mpgf_public_goods_outflow_coverage_snapshots where id = p_batch_id;
  select * into batch_meta from moral_trade_private.compact_outflow_coverage_metadata where coverage_snapshot_id = p_batch_id;
  if batch.id is null or batch_meta.authority_status <> 'provisional' then
    raise exception using errcode = '55000', message = 'A provisional Compact outflow ingest batch is required.';
  end if;
  if p_authority_status not in ('unavailable','incomplete','provisional','complete','invalidated')
     or length(btrim(p_coverage_reason)) = 0
     or length(btrim(p_request_key)) not between 8 and 240
     or jsonb_typeof(p_source_dispositions) <> 'array' then
    raise exception using errcode = '22023', message = 'Invalid coverage freeze request.';
  end if;
  select * into bounds from public.mpgf_public_goods_cycle_bounds_v2(batch.cycle_key);
  if p_source_cutoff_at < bounds.period_end_exclusive then
    raise exception using errcode = '23514', message = 'Coverage cutoff must be at or after the end of the prior complete UTC month.';
  end if;
  select coverage_snapshot_id into existing_id
  from moral_trade_private.compact_outflow_coverage_metadata
  where request_key = btrim(p_request_key);
  if existing_id is not null then
    return pg_catalog.jsonb_build_object('ok', true, 'coverageSnapshotId', existing_id, 'status', 'replayed', 'moneyMoved', false);
  end if;

  create temporary table if not exists compact_outflow_source_request (
    adapter_key text primary key,
    disposition text not null,
    source_watermark text not null,
    evidence_hash text not null
  ) on commit drop;
  truncate compact_outflow_source_request;
  insert into compact_outflow_source_request(adapter_key, disposition, source_watermark, evidence_hash)
  select btrim(item.adapter_key), item.disposition, coalesce(item.source_watermark,''), item.evidence_hash
  from pg_catalog.jsonb_to_recordset(p_source_dispositions) as item(
    adapter_key text, disposition text, source_watermark text, evidence_hash text
  );
  if exists (
    select 1 from compact_outflow_source_request request
    left join moral_trade_private.compact_outflow_adapter_registry adapter
      on adapter.adapter_key = request.adapter_key
    where adapter.adapter_key is null
      or adapter.environment <> batch_meta.environment
      or request.disposition not in ('complete','incomplete','provisional','excluded','unavailable')
      or request.evidence_hash !~ '^sha256:[a-f0-9]{64}$'
  ) then
    raise exception using errcode = '22023', message = 'Coverage source dispositions contain an invalid or wrong-environment adapter.';
  end if;

  select count(*)::integer into unresolved_count
  from moral_trade_private.compact_outflow_adapter_registry adapter
  left join compact_outflow_source_request request on request.adapter_key = adapter.adapter_key
  where adapter.environment = batch_meta.environment
    and adapter.required_for_complete
    and coalesce(request.disposition, 'unavailable') <> 'complete';

  if p_authority_status = 'complete' then
    if unresolved_count <> 0
       or batch_meta.currency <> 'USD'
       or exists (
         select 1 from compact_outflow_source_request request
         join moral_trade_private.compact_outflow_adapter_registry adapter using (adapter_key)
         where request.disposition = 'complete' and adapter.authority_capability <> 'complete'
       )
       or exists (
         select 1
         from public.mpgf_public_goods_outflow_observations observation
         join moral_trade_private.compact_outflow_event_metadata event_meta on event_meta.observation_id = observation.id
         where observation.participant_id = batch.participant_id
           and event_meta.cycle_key = batch.cycle_key
           and not exists (
             select 1 from moral_trade_private.compact_outflow_event_metadata successor
             where successor.supersedes_observation_id = observation.id
           )
           and (event_meta.currency <> 'USD'
             or event_meta.environment <> batch_meta.environment
             or (observation.settlement_status = 'settled' and event_meta.settled_at > p_source_cutoff_at)
             or (batch_meta.environment = 'production' and event_meta.is_synthetic))
       ) then
      raise exception using errcode = '23514', message = 'Complete authority requires every required complete-capable adapter, USD-only facts, matching environment, and no production-synthetic event.';
    end if;
  end if;

  select coalesce(pg_catalog.array_agg(adapter_key order by adapter_key), array[]::text[])
  into source_scope_value from compact_outflow_source_request;
  select 'sha256:' || public.mpgf_public_goods_hash_v2(
    coalesce(pg_catalog.jsonb_agg(
      pg_catalog.jsonb_build_object(
        'adapterKey', adapter_key,
        'disposition', disposition,
        'sourceWatermark', source_watermark,
        'evidenceHash', evidence_hash
      ) order by adapter_key
    ), '[]'::jsonb)
  ) into source_hash_value from compact_outflow_source_request;

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
  join moral_trade_private.compact_outflow_event_metadata event_meta on event_meta.observation_id = observation.id
  where observation.participant_id = batch.participant_id
    and event_meta.cycle_key = batch.cycle_key
    and event_meta.created_at <= p_source_cutoff_at
    and not exists (
      select 1 from moral_trade_private.compact_outflow_event_metadata successor
      where successor.supersedes_observation_id = observation.id
        and successor.created_at <= p_source_cutoff_at
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
    return pg_catalog.jsonb_build_object('ok', true, 'coverageSnapshotId', existing_id, 'status', 'replayed', 'moneyMoved', false);
  end if;

  select metadata.coverage_snapshot_id into latest_prior
  from moral_trade_private.compact_outflow_coverage_metadata metadata
  where metadata.participant_id = batch.participant_id
    and metadata.cycle_key = batch.cycle_key
    and metadata.authority_status <> 'provisional'
  order by metadata.created_at desc, metadata.coverage_snapshot_id desc limit 1;
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
    batch.participant_id, batch.cycle_key, bounds.period_start, bounds.period_end_exclusive,
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
  ) select final_id, adapter_key, disposition, source_watermark,
      p_source_cutoff_at, evidence_hash
    from compact_outflow_source_request;
  insert into moral_trade_private.compact_outflow_coverage_observations (
    coverage_snapshot_id, observation_id, source_system, source_record_key
  )
  select final_id, observation.id, observation.source_system, observation.source_record_key
  from public.mpgf_public_goods_outflow_observations observation
  join moral_trade_private.compact_outflow_event_metadata event_meta on event_meta.observation_id = observation.id
  where observation.participant_id = batch.participant_id
    and event_meta.cycle_key = batch.cycle_key
    and event_meta.created_at <= p_source_cutoff_at
    and not exists (
      select 1 from moral_trade_private.compact_outflow_event_metadata successor
      where successor.supersedes_observation_id = observation.id
        and successor.created_at <= p_source_cutoff_at
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

commit;
