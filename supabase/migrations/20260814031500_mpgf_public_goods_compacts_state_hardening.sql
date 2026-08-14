begin;

create or replace function public.mpgf_public_goods_compact_enforce_constitution_freeze_v2()
returns trigger
language plpgsql
set search_path = ''
as $function$
declare
  historically_accepted boolean;
  old_constitution jsonb;
  new_constitution jsonb;
begin
  if new.activation_execution_enabled or new.status = 'active' then
    raise exception using
      errcode = '23514',
      message = 'Compact activation remains hard-disabled in transaction-v2.';
  end if;

  select exists (
    select 1
    from public.mpgf_public_goods_compact_memberships as membership
    where membership.compact_id = old.id
  ) into historically_accepted;

  old_constitution := pg_catalog.to_jsonb(old) - array[
    'display_order',
    'updated_at'
  ];
  new_constitution := pg_catalog.to_jsonb(new) - array[
    'display_order',
    'updated_at'
  ];

  if historically_accepted and new_constitution is distinct from old_constitution then
    raise exception using
      errcode = '55000',
      message = 'Published Compact v2 terms are immutable after the first acceptance.';
  end if;

  new.updated_at := pg_catalog.timezone('utc', pg_catalog.now());
  return new;
end;
$function$;

drop trigger if exists mpgf_public_goods_compacts_constitution_freeze_v2
  on public.mpgf_public_goods_compacts;
create trigger mpgf_public_goods_compacts_constitution_freeze_v2
before update on public.mpgf_public_goods_compacts
for each row execute function public.mpgf_public_goods_compact_enforce_constitution_freeze_v2();

revoke all on function public.mpgf_public_goods_compact_enforce_constitution_freeze_v2()
  from public, anon, authenticated;

create or replace function public.mpgf_public_goods_compact_reject_snapshot_mutation_v2()
returns trigger
language plpgsql
set search_path = ''
as $function$
begin
  raise exception using
    errcode = '55000',
    message = 'Compact v2 snapshots and events are append-only.';
end;
$function$;

do $block$
declare
  table_name text;
begin
  foreach table_name in array array[
    'mpgf_public_goods_dormant_authorization_snapshots',
    'mpgf_public_goods_outflow_coverage_snapshots',
    'mpgf_public_goods_outflow_observations',
    'mpgf_public_goods_obligation_snapshots',
    'mpgf_public_goods_allocation_instructions',
    'mpgf_public_goods_allocation_instruction_lines',
    'mpgf_public_goods_scheduled_amount_snapshots',
    'mpgf_public_goods_settled_contribution_snapshots',
    'mpgf_public_goods_funding_qualification_snapshots',
    'mpgf_public_goods_readiness_snapshots',
    'mpgf_public_goods_voting_snapshots',
    'mpgf_public_goods_voting_weight_snapshots',
    'mpgf_public_goods_delegation_events',
    'mpgf_public_goods_delegation_snapshots',
    'mpgf_public_goods_delegation_weight_snapshots',
    'mpgf_public_goods_compact_idempotency_keys'
  ] loop
    execute pg_catalog.format(
      'create trigger %I before update or delete on public.%I for each row execute function public.mpgf_public_goods_compact_reject_snapshot_mutation_v2()',
      table_name || '_append_only_v2',
      table_name
    );
  end loop;
end;
$block$;

revoke all on function public.mpgf_public_goods_compact_reject_snapshot_mutation_v2()
  from public, anon, authenticated;

create or replace function public.mpgf_public_goods_validate_qualification_snapshot_v2()
returns trigger
language plpgsql
set search_path = ''
as $function$
declare
  eligibility_record public.moral_trade_participant_eligibility_records%rowtype;
  allocation_record public.mpgf_public_goods_allocation_instructions%rowtype;
  authorization_record public.mpgf_public_goods_dormant_authorization_snapshots%rowtype;
  scheduled_record public.mpgf_public_goods_scheduled_amount_snapshots%rowtype;
  settled_record public.mpgf_public_goods_settled_contribution_snapshots%rowtype;
  joined_membership_count integer;
  allocation_line_count integer;
  allocation_bps_total integer;
begin
  if new.identity_qualified then
    select * into eligibility_record
    from public.moral_trade_participant_eligibility_records as candidate
    where candidate.id = new.identity_eligibility_record_id
      and candidate.participant_id = new.participant_id;

    if eligibility_record.id is null
      or eligibility_record.status <> 'eligible'
      or eligibility_record.identity_verification_status <> 'eligible'
      or eligibility_record.human_uniqueness_sybil_status <> 'eligible'
      or eligibility_record.reviewed_at is null
      or (eligibility_record.expires_at is not null and eligibility_record.expires_at <= new.frozen_at)
      or new.unique_person_gate_state <> 'verified_unique_person'
      or new.unique_person_key_hash is null
    then
      raise exception using
        errcode = '23514',
        message = 'Identity qualification requires a current reviewed eligibility record and a stable unique-person key.';
    end if;
  end if;

  if new.allocation_valid then
    select * into allocation_record
    from public.mpgf_public_goods_allocation_instructions as candidate
    where candidate.id = new.allocation_instruction_id
      and candidate.participant_id = new.participant_id
      and candidate.cycle_key = new.cycle_key
      and exists (
        select 1
        from public.mpgf_public_goods_allocation_instruction_lines as line
        where line.instruction_id = candidate.id
          and line.membership_id = new.membership_id
          and line.compact_id = new.compact_id
      );
    select count(*)::integer
    into joined_membership_count
    from public.mpgf_public_goods_compact_memberships as membership
    where membership.participant_id = new.participant_id
      and membership.status in ('pending_activation', 'active', 'exit_notice');
    select count(*)::integer, coalesce(sum(line.allocation_bps), 0)::integer
    into allocation_line_count, allocation_bps_total
    from public.mpgf_public_goods_allocation_instruction_lines as line
    join public.mpgf_public_goods_compact_memberships as membership
      on membership.id = line.membership_id
     and membership.compact_id = line.compact_id
    where line.instruction_id = allocation_record.id
      and membership.participant_id = new.participant_id
      and membership.status in ('pending_activation', 'active', 'exit_notice');
    if allocation_record.id is null
      or joined_membership_count = 0
      or allocation_line_count <> joined_membership_count
      or allocation_bps_total <> 10000
    then
      raise exception using
        errcode = '23514',
        message = 'Allocation qualification requires one complete 10000-bps map for every joined Compact in the participant cycle.';
    end if;
  end if;

  if new.qualification_state = 'scheduled_qualified' then
    select * into authorization_record
    from public.mpgf_public_goods_dormant_authorization_snapshots as candidate
    where candidate.id = new.dormant_authorization_snapshot_id
      and candidate.participant_id = new.participant_id
      and candidate.cycle_key = new.cycle_key
      and candidate.state = 'valid'
      and candidate.expires_at > new.frozen_at;
    select * into scheduled_record
    from public.mpgf_public_goods_scheduled_amount_snapshots as candidate
    where candidate.id = new.scheduled_amount_snapshot_id
      and candidate.participant_id = new.participant_id
      and candidate.cycle_key = new.cycle_key
      and candidate.membership_id = new.membership_id
      and candidate.compact_id = new.compact_id;
    if authorization_record.id is null
      or scheduled_record.id is null
      or scheduled_record.allocation_instruction_id is distinct from new.allocation_instruction_id
      or scheduled_record.scheduled_contribution_cents is distinct from new.scheduled_contribution_cents
    then
      raise exception using
        errcode = '23514',
        message = 'Scheduled qualification requires matching cent-exact scheduling and a valid dormant authorization snapshot.';
    end if;
  elsif new.qualification_state = 'settled_qualified' then
    select * into settled_record
    from public.mpgf_public_goods_settled_contribution_snapshots as candidate
    where candidate.id = new.settled_contribution_snapshot_id
      and candidate.participant_id = new.participant_id
      and candidate.cycle_key = new.cycle_key
      and candidate.membership_id = new.membership_id
      and candidate.compact_id = new.compact_id
      and candidate.settlement_coverage_status = 'complete';
    if settled_record.id is null
      or settled_record.net_settled_cents is distinct from new.net_settled_contribution_cents
    then
      raise exception using
        errcode = '23514',
        message = 'Settled qualification requires matching complete net-settlement evidence.';
    end if;
  end if;
  return new;
end;
$function$;

create trigger mpgf_public_goods_validate_qualification_snapshot_v2
before insert on public.mpgf_public_goods_funding_qualification_snapshots
for each row execute function public.mpgf_public_goods_validate_qualification_snapshot_v2();

revoke all on function public.mpgf_public_goods_validate_qualification_snapshot_v2()
  from public, anon, authenticated;

create or replace function public.mpgf_public_goods_hash_v2(value jsonb)
returns text
language sql
immutable
strict
set search_path = ''
as $function$
  select pg_catalog.encode(
    extensions.digest(pg_catalog.convert_to(value::text, 'UTF8'), 'sha256'),
    'hex'
  );
$function$;

create or replace function public.mpgf_public_goods_cycle_bounds_v2(cycle_key text)
returns table (period_start timestamptz, period_end_exclusive timestamptz)
language plpgsql
immutable
strict
set search_path = ''
as $function$
declare
  year_value integer;
  month_value integer;
begin
  if cycle_key !~ '^\d{4}-(0[1-9]|1[0-2])$' then
    raise exception using errcode = '22023', message = 'A valid UTC Compact cycle key is required.';
  end if;
  year_value := pg_catalog.substr(cycle_key, 1, 4)::integer;
  month_value := pg_catalog.substr(cycle_key, 6, 2)::integer;
  period_start := pg_catalog.make_timestamptz(year_value, month_value, 1, 0, 0, 0, 'UTC') - interval '1 month';
  period_end_exclusive := pg_catalog.make_timestamptz(year_value, month_value, 1, 0, 0, 0, 'UTC');
  return next;
end;
$function$;

revoke all on function public.mpgf_public_goods_hash_v2(jsonb)
  from public, anon, authenticated;
revoke all on function public.mpgf_public_goods_cycle_bounds_v2(text)
  from public, anon, authenticated;

create or replace function public.mpgf_public_goods_idempotency_replay_v2(
  participant uuid,
  action_name text,
  key_value text,
  request_hash_value text
)
returns jsonb
language plpgsql
set search_path = ''
as $function$
declare
  stored public.mpgf_public_goods_compact_idempotency_keys%rowtype;
begin
  select * into stored
  from public.mpgf_public_goods_compact_idempotency_keys as candidate
  where candidate.participant_id = participant
    and candidate.action = action_name
    and candidate.idempotency_key = key_value;
  if stored.id is null then return null; end if;
  if stored.request_hash <> request_hash_value then
    raise exception using
      errcode = '23505',
      message = 'The Compact idempotency key was already used for a different request.';
  end if;
  return stored.response_json;
end;
$function$;

revoke all on function public.mpgf_public_goods_idempotency_replay_v2(uuid,text,text,text)
  from public, anon, authenticated;

create or replace function public.join_mpgf_public_goods_compact_v2(
  p_compact_public_key text,
  p_constitution_version text,
  p_acknowledgements jsonb,
  p_idempotency_key text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  participant uuid := (select auth.uid());
  action_at timestamptz := pg_catalog.now();
  cycle_key_value text := pg_catalog.to_char(pg_catalog.timezone('UTC', action_at), 'YYYY-MM');
  compact_record public.mpgf_public_goods_compacts%rowtype;
  membership_record public.mpgf_public_goods_compact_memberships%rowtype;
  instruction_id uuid;
  joined_count integer;
  request_hash_value text;
  replay jsonb;
  response jsonb;
begin
  if participant is null then
    raise exception using errcode = '42501', message = 'Authentication is required.';
  end if;
  if not exists (select 1 from public.profiles where id = participant) then
    raise exception using errcode = '42501', message = 'A Moral Trade profile is required.';
  end if;
  if p_idempotency_key !~ '^[A-Za-z0-9][A-Za-z0-9._:-]{7,199}$' then
    raise exception using errcode = '22023', message = 'A valid Compact idempotency key is required.';
  end if;

  request_hash_value := public.mpgf_public_goods_hash_v2(pg_catalog.jsonb_build_object(
    'compactPublicKey', p_compact_public_key,
    'constitutionVersion', p_constitution_version,
    'acknowledgements', p_acknowledgements
  ));
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(participant::text || ':join_v2:' || p_idempotency_key, 0));
  replay := public.mpgf_public_goods_idempotency_replay_v2(participant, 'join_v2', p_idempotency_key, request_hash_value);
  if replay is not null then return replay; end if;

  select * into compact_record
  from public.mpgf_public_goods_compacts as compact
  where compact.public_key = p_compact_public_key and compact.is_current
  for update;
  if compact_record.id is null then
    raise exception using errcode = '22023', message = 'Choose a published current Compact.';
  end if;
  if p_constitution_version <> compact_record.constitution_version
    or p_constitution_version <> 'mpgf-public-goods-compact/transaction-v2'
  then
    raise exception using errcode = '23514', message = 'Accept the exact current Compact constitution version.';
  end if;
  if p_acknowledgements is distinct from '{"voluntaryChoice":true,"exactConstitution":true,"activationAndNoProjectOptOut":true,"noPaymentMandate":true}'::jsonb then
    raise exception using errcode = '22023', message = 'Every required Compact acknowledgement must be explicit.';
  end if;

  select * into membership_record
  from public.mpgf_public_goods_compact_memberships as membership
  where membership.compact_id = compact_record.id
    and membership.participant_id = participant
  for update;

  if membership_record.id is null then
    insert into public.mpgf_public_goods_compact_memberships (
      compact_id, participant_id, constitution_version_accepted,
      acknowledgements, status, accepted_at, updated_at
    ) values (
      compact_record.id, participant, p_constitution_version,
      p_acknowledgements, 'pending_activation', action_at, action_at
    ) returning * into membership_record;
  elsif membership_record.status in ('revoked', 'exited') then
    update public.mpgf_public_goods_compact_memberships
    set constitution_version_accepted = p_constitution_version,
        acknowledgements = p_acknowledgements,
        status = 'pending_activation',
        accepted_at = action_at,
        activated_at = null,
        revoked_at = null,
        exit_requested_at = null,
        exit_effective_at = null,
        updated_at = action_at
    where id = membership_record.id
    returning * into membership_record;
  end if;

  select count(*)::integer into joined_count
  from public.mpgf_public_goods_compact_memberships
  where participant_id = participant
    and status in ('pending_activation', 'active', 'exit_notice');

  if joined_count = 1 then
    select instruction.id into instruction_id
    from public.mpgf_public_goods_allocation_instructions as instruction
    where instruction.participant_id = participant
      and instruction.cycle_key = cycle_key_value
      and instruction.instruction_hash = 'sha256:' || public.mpgf_public_goods_hash_v2(
        pg_catalog.jsonb_build_object('cycleKey', cycle_key_value, 'allocationBps', pg_catalog.jsonb_build_object(p_compact_public_key, 10000))
      );
    if instruction_id is null then
      insert into public.mpgf_public_goods_allocation_instructions (
        participant_id, cycle_key, constitution_version, basis_points_total,
        instruction_hash, submitted_at
      ) values (
        participant, cycle_key_value, p_constitution_version, 10000,
        'sha256:' || public.mpgf_public_goods_hash_v2(
          pg_catalog.jsonb_build_object('cycleKey', cycle_key_value, 'allocationBps', pg_catalog.jsonb_build_object(p_compact_public_key, 10000))
        ),
        action_at
      ) returning id into instruction_id;
      insert into public.mpgf_public_goods_allocation_instruction_lines (
        instruction_id, membership_id, compact_id, allocation_bps,
        stable_compact_key
      ) values (
        instruction_id, membership_record.id, compact_record.id, 10000,
        compact_record.public_key
      );
    end if;
  end if;

  response := pg_catalog.jsonb_build_object(
    'ok', true,
    'membershipId', membership_record.id,
    'membershipStatus', membership_record.status,
    'allocationDefaulted', joined_count = 1,
    'activationState', 'activation_blocked',
    'bindingNow', false,
    'moneyMoved', false,
    'paymentMandateCreated', false,
    'automaticCollectionEnabled', false
  );
  insert into public.mpgf_public_goods_compact_idempotency_keys (
    participant_id, action, idempotency_key, request_hash, response_json
  ) values (participant, 'join_v2', p_idempotency_key, request_hash_value, response);
  return response;
end;
$function$;

create or replace function public.set_mpgf_public_goods_compact_allocation_v2(
  p_allocation_bps jsonb,
  p_idempotency_key text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  participant uuid := (select auth.uid());
  action_at timestamptz := pg_catalog.now();
  cycle_key_value text := pg_catalog.to_char(pg_catalog.timezone('UTC', action_at), 'YYYY-MM');
  joined_count integer;
  supplied_count integer;
  supplied_total integer;
  invalid_count integer;
  instruction_id uuid;
  request_hash_value text;
  replay jsonb;
  response jsonb;
begin
  if participant is null then raise exception using errcode = '42501', message = 'Authentication is required.'; end if;
  if p_idempotency_key !~ '^[A-Za-z0-9][A-Za-z0-9._:-]{7,199}$' then
    raise exception using errcode = '22023', message = 'A valid Compact idempotency key is required.';
  end if;
  if pg_catalog.jsonb_typeof(p_allocation_bps) <> 'object' then
    raise exception using errcode = '22023', message = 'Submit a complete Compact allocation map.';
  end if;

  request_hash_value := public.mpgf_public_goods_hash_v2(pg_catalog.jsonb_build_object('cycleKey', cycle_key_value, 'allocationBps', p_allocation_bps));
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(participant::text || ':set_allocation_v2:' || p_idempotency_key, 0));
  replay := public.mpgf_public_goods_idempotency_replay_v2(participant, 'set_allocation_v2', p_idempotency_key, request_hash_value);
  if replay is not null then return replay; end if;

  select count(*)::integer into joined_count
  from public.mpgf_public_goods_compact_memberships
  where participant_id = participant and status in ('pending_activation', 'active', 'exit_notice');
  select count(*)::integer into supplied_count
  from pg_catalog.jsonb_each(p_allocation_bps);
  select
    coalesce(sum(case when value ~ '^\d{1,5}$' then value::integer else 0 end), 0)::integer,
    count(*) filter (
      where value !~ '^\d{1,5}$'
        or (case when value ~ '^\d{1,5}$' then value::integer else -1 end) not between 0 and 10000
        or not exists (
          select 1
          from public.mpgf_public_goods_compact_memberships as membership
          join public.mpgf_public_goods_compacts as compact on compact.id = membership.compact_id
          where membership.participant_id = participant
            and membership.status in ('pending_activation', 'active', 'exit_notice')
            and compact.public_key = key
        )
    )::integer
  into supplied_total, invalid_count
  from pg_catalog.jsonb_each_text(p_allocation_bps);

  if joined_count = 0
    or supplied_count <> joined_count
    or invalid_count <> 0
    or supplied_total <> 10000
  then
    raise exception using
      errcode = '23514',
      message = 'Allocation must name every joined Compact and no others, use integer basis points, and total exactly 10000.';
  end if;

  select instruction.id into instruction_id
  from public.mpgf_public_goods_allocation_instructions as instruction
  where instruction.participant_id = participant
    and instruction.cycle_key = cycle_key_value
    and instruction.instruction_hash = 'sha256:' || request_hash_value;

  if instruction_id is null then
    insert into public.mpgf_public_goods_allocation_instructions (
      participant_id, cycle_key, constitution_version, basis_points_total,
      instruction_hash, submitted_at
    ) values (
      participant, cycle_key_value, 'mpgf-public-goods-compact/transaction-v2',
      10000, 'sha256:' || request_hash_value, action_at
    ) returning id into instruction_id;

    insert into public.mpgf_public_goods_allocation_instruction_lines (
      instruction_id, membership_id, compact_id, allocation_bps,
      stable_compact_key
    )
    select instruction_id, membership.id, compact.id, allocation.value::integer,
           compact.public_key
    from pg_catalog.jsonb_each_text(p_allocation_bps) as allocation(key, value)
    join public.mpgf_public_goods_compacts as compact on compact.public_key = allocation.key and compact.is_current
    join public.mpgf_public_goods_compact_memberships as membership
      on membership.compact_id = compact.id
     and membership.participant_id = participant
     and membership.status in ('pending_activation', 'active', 'exit_notice')
    order by compact.public_key;
  end if;

  response := pg_catalog.jsonb_build_object(
    'ok', true,
    'cycleKey', cycle_key_value,
    'instructionId', instruction_id,
    'basisPointsTotal', 10000,
    'schedulingReady', false,
    'reason', 'Authoritative outflow coverage, stable unique-person evidence, and dormant payment authorization remain unavailable.',
    'moneyMoved', false,
    'paymentMandateCreated', false,
    'automaticCollectionEnabled', false
  );
  insert into public.mpgf_public_goods_compact_idempotency_keys (
    participant_id, action, idempotency_key, request_hash, response_json
  ) values (participant, 'set_allocation_v2', p_idempotency_key, request_hash_value, response);
  return response;
end;
$function$;

create or replace function public.request_mpgf_public_goods_compact_exit_v2(
  p_compact_public_key text,
  p_idempotency_key text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  participant uuid := (select auth.uid());
  action_at timestamptz := pg_catalog.now();
  compact_record public.mpgf_public_goods_compacts%rowtype;
  membership_record public.mpgf_public_goods_compact_memberships%rowtype;
  request_hash_value text;
  replay jsonb;
  response jsonb;
  exit_effective timestamptz;
  delegations_revoked integer := 0;
begin
  if participant is null then raise exception using errcode = '42501', message = 'Authentication is required.'; end if;
  if p_idempotency_key !~ '^[A-Za-z0-9][A-Za-z0-9._:-]{7,199}$' then
    raise exception using errcode = '22023', message = 'A valid Compact idempotency key is required.';
  end if;
  request_hash_value := public.mpgf_public_goods_hash_v2(pg_catalog.jsonb_build_object('compactPublicKey', p_compact_public_key));
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(participant::text || ':request_exit_v2:' || p_idempotency_key, 0));
  replay := public.mpgf_public_goods_idempotency_replay_v2(participant, 'request_exit_v2', p_idempotency_key, request_hash_value);
  if replay is not null then return replay; end if;

  select * into compact_record from public.mpgf_public_goods_compacts
  where public_key = p_compact_public_key and is_current;
  select * into membership_record
  from public.mpgf_public_goods_compact_memberships
  where compact_id = compact_record.id and participant_id = participant
  for update;
  if membership_record.id is null then raise exception using errcode = 'P0002', message = 'No Compact membership exists.'; end if;

  if membership_record.status = 'pending_activation' then
    update public.mpgf_public_goods_compact_memberships
    set status = 'revoked', revoked_at = action_at, updated_at = action_at
    where id = membership_record.id returning * into membership_record;
    response := pg_catalog.jsonb_build_object(
      'ok', true, 'membershipStatus', 'revoked', 'revokedImmediately', true,
      'exitEffectiveAt', null, 'moneyMoved', false,
      'paymentMandateChanged', false, 'automaticCollectionEnabled', false,
      'delegationsRevoked', 0
    );
  elsif membership_record.status in ('active', 'exit_notice') then
    perform pg_catalog.pg_advisory_xact_lock(
      pg_catalog.hashtextextended(compact_record.id::text || ':delegation-mutations', 0)
    );
    with latest_events as (
      select event.*
      from public.mpgf_public_goods_delegation_events as event
      join public.mpgf_public_goods_voting_snapshots as voting
        on voting.id = event.voting_snapshot_id
       and voting.compact_id = compact_record.id
      left join public.mpgf_public_goods_delegation_snapshots as frozen
        on frozen.voting_snapshot_id = event.voting_snapshot_id
      where event.compact_id = compact_record.id
        and frozen.id is null
        and not exists (
          select 1
          from public.mpgf_public_goods_delegation_events as successor
          where successor.supersedes_event_id = event.id
        )
    ), effective_delegations as (
      select latest.*
      from latest_events as latest
      where latest.event_kind = 'set'
        and (
          latest.delegator_membership_id = membership_record.id
          or latest.delegatee_membership_id = membership_record.id
        )
    )
    insert into public.mpgf_public_goods_delegation_events (
      voting_snapshot_id, compact_id, cycle_key, delegator_membership_id,
      delegatee_membership_id, event_kind, controlled_weight_units_after,
      supersedes_event_id, created_by
    )
    select effective.voting_snapshot_id, effective.compact_id,
      effective.cycle_key, effective.delegator_membership_id,
      null, 'revoke', null, effective.id, participant
    from effective_delegations as effective;
    get diagnostics delegations_revoked = row_count;

    exit_effective := greatest(
      compact_record.activated_at + pg_catalog.make_interval(months => compact_record.minimum_term_months),
      action_at + pg_catalog.make_interval(days => compact_record.exit_notice_days)
    );
    update public.mpgf_public_goods_compact_memberships
    set status = 'exit_notice', exit_requested_at = coalesce(exit_requested_at, action_at),
        exit_effective_at = coalesce(exit_effective_at, exit_effective), updated_at = action_at
    where id = membership_record.id returning * into membership_record;
    response := pg_catalog.jsonb_build_object(
      'ok', true, 'membershipStatus', 'exit_notice', 'revokedImmediately', false,
      'exitEffectiveAt', membership_record.exit_effective_at, 'moneyMoved', false,
      'paymentMandateChanged', false, 'automaticCollectionEnabled', false,
      'delegationsRevoked', delegations_revoked
    );
  else
    response := pg_catalog.jsonb_build_object(
      'ok', true, 'membershipStatus', membership_record.status,
      'revokedImmediately', membership_record.status = 'revoked',
      'exitEffectiveAt', membership_record.exit_effective_at,
      'moneyMoved', false, 'paymentMandateChanged', false,
      'automaticCollectionEnabled', false, 'delegationsRevoked', 0
    );
  end if;

  insert into public.mpgf_public_goods_compact_idempotency_keys (
    participant_id, action, idempotency_key, request_hash, response_json
  ) values (participant, 'request_exit_v2', p_idempotency_key, request_hash_value, response);
  return response;
end;
$function$;

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

  select * into coverage_record
  from public.mpgf_public_goods_outflow_coverage_snapshots as coverage
  where coverage.participant_id = p_participant_id
    and coverage.cycle_key = p_cycle_key
  order by coverage.created_at desc, coverage.id desc
  limit 1;

  if coverage_record.id is null then
    return pg_catalog.jsonb_build_object(
      'ok', true,
      'cycleKey', p_cycle_key,
      'state', 'unavailable',
      'reason', 'No authoritative outflow coverage snapshot exists.',
      'moneyMoved', false,
      'paymentMandateCreated', false
    );
  end if;

  if coverage_record.coverage_status = 'complete' and (
    not coverage_record.source_coverage_attested
    or coverage_record.period_start <> period_start_value
    or coverage_record.period_end_exclusive <> period_end_value
    or not ('authoritative_moral_trade_settlements' = any(coverage_record.source_scope))
    or not ('refunds_reversals_chargebacks' = any(coverage_record.source_scope))
  ) then
    raise exception using
      errcode = '23514',
      message = 'Complete coverage requires the exact prior UTC month and authoritative settlement plus refund/reversal/chargeback scopes.';
  end if;

  if coverage_record.coverage_status = 'complete' then
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
    from public.mpgf_public_goods_outflow_observations as observation
    where observation.coverage_snapshot_id = coverage_record.id
      and observation.participant_id = p_participant_id
      and observation.direction = 'outgoing'
      and observation.payment_kind = 'moral_trade_payment'
      and observation.settlement_status = 'settled'
      and observation.occurred_at >= period_start_value
      and observation.occurred_at < period_end_value;

    if eligible_total > 9223372036854775807::numeric then
      raise exception using errcode = '22003', message = 'Eligible outflow exceeds the supported bigint range.';
    end if;
    eligible_total_bigint := eligible_total::bigint;
    snapshot_hash_value := 'sha256:' || public.mpgf_public_goods_hash_v2(
      pg_catalog.jsonb_build_object(
        'coverageSnapshotId', coverage_record.id,
        'eligibleNetSettledOutflowCents', eligible_total_bigint,
        'obligationCents', eligible_total_bigint / 10,
        'sourceObservationCount', observation_count
      )
    );
    select * into obligation_record
    from public.mpgf_public_goods_obligation_snapshots as obligation
    where obligation.participant_id = p_participant_id
      and obligation.cycle_key = p_cycle_key
      and obligation.snapshot_hash = snapshot_hash_value;
    if obligation_record.id is null then
      insert into public.mpgf_public_goods_obligation_snapshots (
        participant_id, cycle_key, coverage_snapshot_id, state,
        eligible_net_settled_outflow_cents, obligation_cents,
        source_observation_count, snapshot_hash
      ) values (
        p_participant_id, p_cycle_key, coverage_record.id, 'calculated',
        eligible_total_bigint, eligible_total_bigint / 10,
        observation_count, snapshot_hash_value
      ) returning * into obligation_record;
    end if;
  else
    snapshot_hash_value := 'sha256:' || public.mpgf_public_goods_hash_v2(
      pg_catalog.jsonb_build_object(
        'coverageSnapshotId', coverage_record.id,
        'state', 'unavailable'
      )
    );
    select * into obligation_record
    from public.mpgf_public_goods_obligation_snapshots as obligation
    where obligation.participant_id = p_participant_id
      and obligation.cycle_key = p_cycle_key
      and obligation.snapshot_hash = snapshot_hash_value;
    if obligation_record.id is null then
      insert into public.mpgf_public_goods_obligation_snapshots (
        participant_id, cycle_key, coverage_snapshot_id, state,
        eligible_net_settled_outflow_cents, obligation_cents,
        source_observation_count, snapshot_hash
      ) values (
        p_participant_id, p_cycle_key, coverage_record.id, 'unavailable',
        null, null, 0, snapshot_hash_value
      ) returning * into obligation_record;
    end if;
  end if;

  select count(*)::integer into joined_count
  from public.mpgf_public_goods_compact_memberships
  where participant_id = p_participant_id
    and status in ('pending_activation', 'active', 'exit_notice');
  select * into allocation_record
  from public.mpgf_public_goods_allocation_instructions as instruction
  where instruction.participant_id = p_participant_id
    and instruction.cycle_key = p_cycle_key
  order by instruction.submitted_at desc, instruction.id desc
  limit 1;
  if allocation_record.id is not null then
    select count(*)::integer, coalesce(sum(line.allocation_bps), 0)::integer
    into allocation_count, allocation_total
    from public.mpgf_public_goods_allocation_instruction_lines as line
    join public.mpgf_public_goods_compact_memberships as membership
      on membership.id = line.membership_id
     and membership.compact_id = line.compact_id
    where line.instruction_id = allocation_record.id
      and membership.participant_id = p_participant_id
      and membership.status in ('pending_activation', 'active', 'exit_notice');
  end if;
  select * into authorization_record
  from public.mpgf_public_goods_dormant_authorization_snapshots as dormant_auth
  where dormant_auth.participant_id = p_participant_id
    and dormant_auth.cycle_key = p_cycle_key
  order by dormant_auth.frozen_at desc, dormant_auth.id desc
  limit 1;

  if obligation_record.state = 'calculated'
    and allocation_record.id is not null
    and joined_count > 0
    and allocation_count = joined_count
    and allocation_total = 10000
    and authorization_record.state = 'valid'
    and authorization_record.expires_at > pg_catalog.now()
  then
    schedule_hash_value := 'sha256:' || public.mpgf_public_goods_hash_v2(
      pg_catalog.jsonb_build_object(
        'obligationSnapshotId', obligation_record.id,
        'allocationInstructionId', allocation_record.id,
        'authorizationSnapshotId', authorization_record.id
      )
    );
    with allocation_base as (
      select
        line.membership_id,
        line.compact_id,
        line.allocation_bps,
        line.stable_compact_key,
        pg_catalog.floor(
          obligation_record.obligation_cents::numeric * line.allocation_bps::numeric / 10000::numeric
        )::bigint as base_cents,
        pg_catalog.mod(
          obligation_record.obligation_cents::numeric * line.allocation_bps::numeric,
          10000::numeric
        )::bigint as remainder_numerator
      from public.mpgf_public_goods_allocation_instruction_lines as line
      where line.instruction_id = allocation_record.id
    ), ranked as (
      select allocation_base.*,
        pg_catalog.row_number() over (
          order by remainder_numerator desc, stable_compact_key asc
        )::integer as remainder_rank,
        obligation_record.obligation_cents
          - sum(base_cents) over () as cents_left
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
    from ranked
    on conflict (obligation_snapshot_id, allocation_instruction_id, compact_id)
    do nothing;

    select coalesce(sum(scheduled_contribution_cents), 0)::bigint
    into scheduled_total
    from public.mpgf_public_goods_scheduled_amount_snapshots
    where obligation_snapshot_id = obligation_record.id
      and allocation_instruction_id = allocation_record.id;
    if scheduled_total <> obligation_record.obligation_cents then
      raise exception using errcode = '23514', message = 'Largest-remainder scheduling did not preserve the aggregate obligation exactly.';
    end if;
  end if;

  return pg_catalog.jsonb_build_object(
    'ok', true,
    'cycleKey', p_cycle_key,
    'coverageStatus', coverage_record.coverage_status,
    'obligationState', obligation_record.state,
    'eligibleNetSettledOutflowCents', obligation_record.eligible_net_settled_outflow_cents,
    'obligationCents', obligation_record.obligation_cents,
    'scheduledTotalCents', case when scheduled_total > 0 or obligation_record.obligation_cents = 0 then scheduled_total else null end,
    'moneyMoved', false,
    'paymentMandateCreated', false
  );
end;
$function$;

create or replace function public.freeze_mpgf_public_goods_readiness_v2(
  p_compact_id uuid,
  p_cycle_key text
)
returns jsonb
language plpgsql
set search_path = ''
as $function$
declare
  unique_person_count integer;
  scheduled_total bigint;
  source_qualification_hash text;
  snapshot_hash_value text;
  snapshot_record public.mpgf_public_goods_readiness_snapshots%rowtype;
  supersedes_value uuid;
begin
  perform * from public.mpgf_public_goods_cycle_bounds_v2(p_cycle_key);
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(p_compact_id::text || ':readiness:' || p_cycle_key, 0)
  );
  if not exists (select 1 from public.mpgf_public_goods_compacts where id = p_compact_id and is_current) then
    raise exception using errcode = 'P0002', message = 'The current Compact does not exist.';
  end if;

  with latest as (
    select distinct on (qualification.membership_id)
      qualification.*
    from public.mpgf_public_goods_funding_qualification_snapshots as qualification
    where qualification.compact_id = p_compact_id
      and qualification.cycle_key = p_cycle_key
    order by qualification.membership_id, qualification.frozen_at desc, qualification.id desc
  ), deduplicated as (
    select latest.*,
      pg_catalog.row_number() over (
        partition by latest.unique_person_key_hash
        order by latest.membership_id
      ) as person_rank
    from latest
    where latest.qualification_state = 'scheduled_qualified'
      and latest.identity_qualified
      and latest.unique_person_gate_state = 'verified_unique_person'
      and latest.unique_person_key_hash is not null
      and latest.allocation_valid
      and latest.scheduled_contribution_cents >= 100
  )
  select count(*)::integer,
         coalesce(sum(scheduled_contribution_cents), 0)::bigint,
         'sha256:' || public.mpgf_public_goods_hash_v2(
           coalesce(
             pg_catalog.jsonb_agg(
               pg_catalog.jsonb_build_object(
                 'membershipId', membership_id,
                 'personKeyHash', unique_person_key_hash,
                 'qualificationSnapshotHash', snapshot_hash
               ) order by unique_person_key_hash, membership_id
             ),
             '[]'::jsonb
           )
         )
  into unique_person_count, scheduled_total, source_qualification_hash
  from deduplicated
  where person_rank = 1;

  snapshot_hash_value := 'sha256:' || public.mpgf_public_goods_hash_v2(
    pg_catalog.jsonb_build_object(
      'compactId', p_compact_id,
      'cycleKey', p_cycle_key,
      'fundingQualifiedUniquePersonCount', unique_person_count,
      'scheduledContributionCents', scheduled_total,
      'sourceQualificationHash', source_qualification_hash
    )
  );
  select * into snapshot_record
  from public.mpgf_public_goods_readiness_snapshots as readiness
  where readiness.compact_id = p_compact_id
    and readiness.cycle_key = p_cycle_key
    and readiness.source_snapshot_hash = snapshot_hash_value;
  if snapshot_record.id is null then
    select readiness.id into supersedes_value
    from public.mpgf_public_goods_readiness_snapshots as readiness
    where readiness.compact_id = p_compact_id
      and readiness.cycle_key = p_cycle_key
    order by readiness.frozen_at desc, readiness.id desc
    limit 1;
    insert into public.mpgf_public_goods_readiness_snapshots (
      compact_id, cycle_key, funding_qualified_unique_person_count,
      scheduled_contribution_cents, member_threshold_met,
      funding_threshold_met, threshold_ready, activation_blocked,
      blockers, source_snapshot_hash, supersedes_id
    ) values (
      p_compact_id, p_cycle_key, unique_person_count, scheduled_total,
      unique_person_count >= 100, scheduled_total >= 50000,
      unique_person_count >= 100 and scheduled_total >= 50000,
      true,
      array[
        'verified_unique_person_primitive_unavailable',
        'dormant_payment_authorization_unavailable',
        'collection_provider_unapproved',
        'legal_and_fiscal_sponsor_review_incomplete',
        'production_release_not_approved'
      ]::text[],
      snapshot_hash_value, supersedes_value
    ) returning * into snapshot_record;
  end if;
  return pg_catalog.jsonb_build_object(
    'ok', true,
    'readinessSnapshotId', snapshot_record.id,
    'fundingQualifiedUniquePersonCount', snapshot_record.funding_qualified_unique_person_count,
    'scheduledContributionCents', snapshot_record.scheduled_contribution_cents,
    'thresholdReady', snapshot_record.threshold_ready,
    'activationBlocked', true,
    'compactActivated', false,
    'moneyMoved', false
  );
end;
$function$;

create or replace function public.freeze_mpgf_public_goods_voting_v2(
  p_compact_id uuid,
  p_cycle_key text
)
returns jsonb
language plpgsql
set search_path = ''
as $function$
declare
  compact_record public.mpgf_public_goods_compacts%rowtype;
  qualified_count integer;
  source_hash_value text;
  voting_record public.mpgf_public_goods_voting_snapshots%rowtype;
  total_inserted bigint;
begin
  perform * from public.mpgf_public_goods_cycle_bounds_v2(p_cycle_key);
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(p_compact_id::text || ':voting:' || p_cycle_key, 0)
  );
  select * into compact_record
  from public.mpgf_public_goods_compacts
  where id = p_compact_id and is_current;
  if compact_record.id is null or compact_record.status <> 'active' then
    raise exception using
      errcode = '55000',
      message = 'A voting snapshot requires a separately authorized active Compact; transaction-v2 cannot activate one.';
  end if;

  with latest as (
    select distinct on (qualification.membership_id)
      qualification.*
    from public.mpgf_public_goods_funding_qualification_snapshots as qualification
    where qualification.compact_id = p_compact_id
      and qualification.cycle_key = p_cycle_key
    order by qualification.membership_id, qualification.frozen_at desc, qualification.id desc
  ), deduplicated as (
    select latest.*,
      pg_catalog.row_number() over (
        partition by latest.unique_person_key_hash
        order by latest.membership_id
      ) as person_rank
    from latest
    where latest.qualification_state = 'settled_qualified'
      and latest.identity_qualified
      and latest.unique_person_gate_state = 'verified_unique_person'
      and latest.unique_person_key_hash is not null
      and latest.allocation_valid
      and latest.net_settled_contribution_cents >= 100
      and exists (
        select 1
        from public.mpgf_public_goods_compact_memberships as membership
        where membership.id = latest.membership_id
          and membership.compact_id = p_compact_id
          and membership.status in ('active', 'exit_notice')
      )
  )
  select count(*)::integer into qualified_count
  from deduplicated where person_rank = 1;
  if qualified_count = 0 then
    return pg_catalog.jsonb_build_object(
      'ok', true,
      'cycleKey', p_cycle_key,
      'qualifiedMemberCount', 0,
      'votingSnapshotId', null,
      'reason', 'No settled-qualified unique-person members exist.',
      'moneyMoved', false
    );
  end if;

  with latest as (
    select distinct on (qualification.membership_id)
      qualification.*
    from public.mpgf_public_goods_funding_qualification_snapshots as qualification
    where qualification.compact_id = p_compact_id
      and qualification.cycle_key = p_cycle_key
    order by qualification.membership_id, qualification.frozen_at desc, qualification.id desc
  ), eligible as (
    select latest.*,
      pg_catalog.row_number() over (
        partition by latest.unique_person_key_hash
        order by latest.membership_id
      ) as person_rank
    from latest
    where latest.qualification_state = 'settled_qualified'
      and latest.identity_qualified
      and latest.unique_person_gate_state = 'verified_unique_person'
      and latest.unique_person_key_hash is not null
      and latest.allocation_valid
      and latest.net_settled_contribution_cents >= 100
      and exists (
        select 1
        from public.mpgf_public_goods_compact_memberships as membership
        where membership.id = latest.membership_id
          and membership.compact_id = p_compact_id
          and membership.status in ('active', 'exit_notice')
      )
  )
  select 'sha256:' || public.mpgf_public_goods_hash_v2(
    coalesce(
      pg_catalog.jsonb_agg(
        pg_catalog.jsonb_build_object(
          'membershipId', membership_id,
          'netSettledContributionCents', net_settled_contribution_cents,
          'snapshotHash', snapshot_hash
        ) order by membership_id
      ),
      '[]'::jsonb
    )
  ) into source_hash_value
  from eligible where person_rank = 1;

  select * into voting_record
  from public.mpgf_public_goods_voting_snapshots as voting
  where voting.compact_id = p_compact_id
    and voting.cycle_key = p_cycle_key
    and voting.source_snapshot_hash = source_hash_value;
  if voting_record.id is null then
    insert into public.mpgf_public_goods_voting_snapshots (
      compact_id, cycle_key, total_weight_units, equal_pool_units,
      sqrt_pool_units, qualified_member_count, source_snapshot_hash
    ) values (
      p_compact_id, p_cycle_key, 1000000000000, 700000000000,
      300000000000, qualified_count, source_hash_value
    ) returning * into voting_record;

    with latest as (
      select distinct on (qualification.membership_id)
        qualification.*
      from public.mpgf_public_goods_funding_qualification_snapshots as qualification
      where qualification.compact_id = p_compact_id
        and qualification.cycle_key = p_cycle_key
      order by qualification.membership_id, qualification.frozen_at desc, qualification.id desc
    ), deduplicated as (
      select latest.*,
        pg_catalog.row_number() over (
          partition by latest.unique_person_key_hash
          order by latest.membership_id
        ) as person_rank
      from latest
      where latest.qualification_state = 'settled_qualified'
        and latest.identity_qualified
        and latest.unique_person_gate_state = 'verified_unique_person'
        and latest.unique_person_key_hash is not null
        and latest.allocation_valid
        and latest.net_settled_contribution_cents >= 100
        and exists (
          select 1
          from public.mpgf_public_goods_compact_memberships as membership
          where membership.id = latest.membership_id
            and membership.compact_id = p_compact_id
            and membership.status in ('active', 'exit_notice')
        )
    ), eligible as (
      select deduplicated.*,
        pg_catalog.sqrt(net_settled_contribution_cents::numeric) as sqrt_score
      from deduplicated where person_rank = 1
    ), raw as (
      select eligible.*,
        pg_catalog.floor(700000000000::numeric / qualified_count)::bigint as equal_base,
        700000000000::bigint
          - pg_catalog.floor(700000000000::numeric / qualified_count)::bigint * qualified_count as equal_left,
        pg_catalog.floor(
          300000000000::numeric * sqrt_score / sum(sqrt_score) over ()
        )::bigint as sqrt_base,
        300000000000::numeric * sqrt_score / sum(sqrt_score) over ()
          - pg_catalog.floor(300000000000::numeric * sqrt_score / sum(sqrt_score) over ()) as sqrt_fraction
      from eligible
    ), ranked as (
      select raw.*,
        pg_catalog.row_number() over (order by membership_id)::bigint as equal_rank,
        pg_catalog.row_number() over (order by sqrt_fraction desc, membership_id)::bigint as sqrt_rank,
        300000000000::bigint - sum(sqrt_base) over () as sqrt_left
      from raw
    )
    insert into public.mpgf_public_goods_voting_weight_snapshots (
      voting_snapshot_id, membership_id, compact_id, participant_id,
      net_settled_contribution_cents, equal_weight_units,
      sqrt_contribution_weight_units, total_weight_units, frozen_at
    )
    select voting_record.id, membership_id, compact_id, participant_id,
      net_settled_contribution_cents,
      equal_base + case when equal_rank <= equal_left then 1 else 0 end,
      sqrt_base + case when sqrt_rank <= sqrt_left then 1 else 0 end,
      equal_base + case when equal_rank <= equal_left then 1 else 0 end
        + sqrt_base + case when sqrt_rank <= sqrt_left then 1 else 0 end,
      voting_record.frozen_at
    from ranked;
  end if;

  select sum(total_weight_units)::bigint into total_inserted
  from public.mpgf_public_goods_voting_weight_snapshots
  where voting_snapshot_id = voting_record.id;
  if total_inserted <> 1000000000000 then
    raise exception using errcode = '23514', message = 'Voting weights failed exact one-trillion-unit normalization.';
  end if;
  return pg_catalog.jsonb_build_object(
    'ok', true,
    'votingSnapshotId', voting_record.id,
    'qualifiedMemberCount', voting_record.qualified_member_count,
    'totalWeightUnits', voting_record.total_weight_units,
    'moneyMoved', false
  );
end;
$function$;

create or replace function public.set_mpgf_public_goods_compact_delegation_v2(
  p_compact_public_key text,
  p_cycle_key text,
  p_delegatee_membership_id uuid,
  p_idempotency_key text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  participant uuid := (select auth.uid());
  compact_record public.mpgf_public_goods_compacts%rowtype;
  voting_record public.mpgf_public_goods_voting_snapshots%rowtype;
  delegator_id_value uuid;
  previous_event_id uuid;
  controlled_after bigint;
  cap_violation boolean;
  request_hash_value text;
  replay jsonb;
  response jsonb;
begin
  if participant is null then raise exception using errcode = '42501', message = 'Authentication is required.'; end if;
  if p_idempotency_key !~ '^[A-Za-z0-9][A-Za-z0-9._:-]{7,199}$' then
    raise exception using errcode = '22023', message = 'A valid Compact idempotency key is required.';
  end if;
  perform * from public.mpgf_public_goods_cycle_bounds_v2(p_cycle_key);
  request_hash_value := public.mpgf_public_goods_hash_v2(pg_catalog.jsonb_build_object(
    'compactPublicKey', p_compact_public_key,
    'cycleKey', p_cycle_key,
    'delegateeMembershipId', p_delegatee_membership_id
  ));
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(participant::text || ':set_delegation_v2:' || p_idempotency_key, 0)
  );
  replay := public.mpgf_public_goods_idempotency_replay_v2(participant, 'set_delegation_v2', p_idempotency_key, request_hash_value);
  if replay is not null then return replay; end if;

  select * into compact_record
  from public.mpgf_public_goods_compacts
  where public_key = p_compact_public_key and is_current;
  if compact_record.id is null or compact_record.status <> 'active' then
    raise exception using errcode = '55000', message = 'Delegation requires a separately authorized active Compact.';
  end if;
  select * into voting_record
  from public.mpgf_public_goods_voting_snapshots as voting
  where voting.compact_id = compact_record.id and voting.cycle_key = p_cycle_key
  order by voting.frozen_at desc, voting.id desc limit 1;
  if voting_record.id is null then raise exception using errcode = '55000', message = 'No frozen voting snapshot exists for this Compact cycle.'; end if;
  if exists (select 1 from public.mpgf_public_goods_delegation_snapshots where voting_snapshot_id = voting_record.id) then
    raise exception using errcode = '55000', message = 'Delegations are frozen with the ballot snapshot.';
  end if;
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(compact_record.id::text || ':delegation-mutations', 0)
  );
  if exists (select 1 from public.mpgf_public_goods_delegation_snapshots where voting_snapshot_id = voting_record.id) then
    raise exception using errcode = '55000', message = 'Delegations are frozen with the ballot snapshot.';
  end if;

  select weight.membership_id into delegator_id_value
  from public.mpgf_public_goods_voting_weight_snapshots as weight
  join public.mpgf_public_goods_compact_memberships as membership
    on membership.id = weight.membership_id
   and membership.compact_id = weight.compact_id
   and membership.status = 'active'
  where weight.voting_snapshot_id = voting_record.id
    and weight.participant_id = participant;
  if delegator_id_value is null then raise exception using errcode = '42501', message = 'Only a funding-qualified member may delegate her own cycle weight.'; end if;
  if p_delegatee_membership_id = delegator_id_value then raise exception using errcode = '23514', message = 'Self-delegation is not allowed.'; end if;
  if not exists (
    select 1
    from public.mpgf_public_goods_voting_weight_snapshots as weight
    join public.mpgf_public_goods_compact_memberships as membership
      on membership.id = weight.membership_id
     and membership.compact_id = weight.compact_id
     and membership.status = 'active'
    where weight.voting_snapshot_id = voting_record.id
      and weight.membership_id = p_delegatee_membership_id
      and weight.compact_id = compact_record.id
  ) then
    raise exception using errcode = '23503', message = 'The delegatee must be funding-qualified in the same frozen Compact cycle.';
  end if;

  with latest_events as (
    select
      event.delegator_membership_id, event.delegatee_membership_id, event.event_kind
    from public.mpgf_public_goods_delegation_events as event
    where event.voting_snapshot_id = voting_record.id
      and not exists (
        select 1
        from public.mpgf_public_goods_delegation_events as successor
        where successor.supersedes_event_id = event.id
      )
  ), effective_delegations as (
    select latest.delegator_membership_id, latest.delegatee_membership_id
    from latest_events as latest
    where latest.event_kind = 'set'
      and latest.delegator_membership_id <> delegator_id_value
    union all
    select delegator_id_value, p_delegatee_membership_id
  ), holdings as (
    select weight.membership_id,
      coalesce(delegation.delegatee_membership_id, weight.membership_id) as holder_membership_id,
      weight.total_weight_units,
      delegation.delegatee_membership_id is not null as delegated
    from public.mpgf_public_goods_voting_weight_snapshots as weight
    left join effective_delegations as delegation
      on delegation.delegator_membership_id = weight.membership_id
    where weight.voting_snapshot_id = voting_record.id
  ), controlled as (
    select holder_membership_id,
      sum(total_weight_units)::bigint as controlled_weight_units,
      count(*) filter (where delegated)::integer as direct_incoming_count
    from holdings group by holder_membership_id
  )
  select
    coalesce(bool_or(direct_incoming_count > 0 and controlled_weight_units > 100000000000), false),
    coalesce(max(controlled_weight_units) filter (where holder_membership_id = p_delegatee_membership_id), 0)
  into cap_violation, controlled_after
  from controlled;
  if cap_violation then
    raise exception using errcode = '23514', message = 'Delegation rejected: a proxy would control more than 10 percent of total effective electorate weight.';
  end if;

  select event.id into previous_event_id
  from public.mpgf_public_goods_delegation_events as event
  where event.voting_snapshot_id = voting_record.id
    and event.delegator_membership_id = delegator_id_value
    and not exists (
      select 1
      from public.mpgf_public_goods_delegation_events as successor
      where successor.supersedes_event_id = event.id
    );
  insert into public.mpgf_public_goods_delegation_events (
    voting_snapshot_id, compact_id, cycle_key, delegator_membership_id,
    delegatee_membership_id, event_kind, controlled_weight_units_after,
    supersedes_event_id, created_by
  ) values (
    voting_record.id, compact_record.id, p_cycle_key, delegator_id_value,
    p_delegatee_membership_id, 'set', controlled_after,
    previous_event_id, participant
  );
  response := pg_catalog.jsonb_build_object(
    'ok', true, 'cycleKey', p_cycle_key,
    'delegatorMembershipId', delegator_id_value,
    'delegateeMembershipId', p_delegatee_membership_id,
    'controlledWeightUnitsAfter', controlled_after,
    'directOnly', true, 'incomingWeightRedelegated', false,
    'membershipTransferred', false, 'moneyTransferred', false,
    'reputationTransferred', false
  );
  insert into public.mpgf_public_goods_compact_idempotency_keys (
    participant_id, action, idempotency_key, request_hash, response_json
  ) values (participant, 'set_delegation_v2', p_idempotency_key, request_hash_value, response);
  return response;
end;
$function$;

create or replace function public.clear_mpgf_public_goods_compact_delegation_v2(
  p_compact_public_key text,
  p_cycle_key text,
  p_idempotency_key text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  participant uuid := (select auth.uid());
  compact_record public.mpgf_public_goods_compacts%rowtype;
  voting_record public.mpgf_public_goods_voting_snapshots%rowtype;
  delegator_membership_id uuid;
  previous_event public.mpgf_public_goods_delegation_events%rowtype;
  request_hash_value text;
  replay jsonb;
  response jsonb;
begin
  if participant is null then raise exception using errcode = '42501', message = 'Authentication is required.'; end if;
  if p_idempotency_key !~ '^[A-Za-z0-9][A-Za-z0-9._:-]{7,199}$' then
    raise exception using errcode = '22023', message = 'A valid Compact idempotency key is required.';
  end if;
  perform * from public.mpgf_public_goods_cycle_bounds_v2(p_cycle_key);
  request_hash_value := public.mpgf_public_goods_hash_v2(pg_catalog.jsonb_build_object('compactPublicKey', p_compact_public_key, 'cycleKey', p_cycle_key));
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(participant::text || ':clear_delegation_v2:' || p_idempotency_key, 0)
  );
  replay := public.mpgf_public_goods_idempotency_replay_v2(participant, 'clear_delegation_v2', p_idempotency_key, request_hash_value);
  if replay is not null then return replay; end if;
  select * into compact_record from public.mpgf_public_goods_compacts
  where public_key = p_compact_public_key and is_current;
  select * into voting_record from public.mpgf_public_goods_voting_snapshots
  where compact_id = compact_record.id and cycle_key = p_cycle_key
  order by frozen_at desc, id desc limit 1;
  if voting_record.id is null then raise exception using errcode = '55000', message = 'No frozen voting snapshot exists for this Compact cycle.'; end if;
  if exists (select 1 from public.mpgf_public_goods_delegation_snapshots where voting_snapshot_id = voting_record.id) then
    raise exception using errcode = '55000', message = 'Delegations are frozen with the ballot snapshot.';
  end if;
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(compact_record.id::text || ':delegation-mutations', 0)
  );
  if exists (select 1 from public.mpgf_public_goods_delegation_snapshots where voting_snapshot_id = voting_record.id) then
    raise exception using errcode = '55000', message = 'Delegations are frozen with the ballot snapshot.';
  end if;
  select membership_id into delegator_membership_id
  from public.mpgf_public_goods_voting_weight_snapshots
  where voting_snapshot_id = voting_record.id and participant_id = participant;
  select * into previous_event
  from public.mpgf_public_goods_delegation_events as event
  where event.voting_snapshot_id = voting_record.id
    and event.delegator_membership_id = delegator_membership_id
    and not exists (
      select 1
      from public.mpgf_public_goods_delegation_events as successor
      where successor.supersedes_event_id = event.id
    );
  if previous_event.id is not null and previous_event.event_kind = 'set' then
    insert into public.mpgf_public_goods_delegation_events (
      voting_snapshot_id, compact_id, cycle_key, delegator_membership_id,
      delegatee_membership_id, event_kind, controlled_weight_units_after,
      supersedes_event_id, created_by
    ) values (
      voting_record.id, compact_record.id, p_cycle_key, delegator_membership_id,
      null, 'revoke', null, previous_event.id, participant
    );
  end if;
  response := pg_catalog.jsonb_build_object(
    'ok', true, 'cycleKey', p_cycle_key, 'delegationState', 'revoked',
    'membershipTransferred', false, 'moneyTransferred', false,
    'reputationTransferred', false
  );
  insert into public.mpgf_public_goods_compact_idempotency_keys (
    participant_id, action, idempotency_key, request_hash, response_json
  ) values (participant, 'clear_delegation_v2', p_idempotency_key, request_hash_value, response);
  return response;
end;
$function$;

create or replace function public.freeze_mpgf_public_goods_delegations_v2(
  p_voting_snapshot_id uuid
)
returns jsonb
language plpgsql
set search_path = ''
as $function$
declare
  voting_record public.mpgf_public_goods_voting_snapshots%rowtype;
  delegation_record public.mpgf_public_goods_delegation_snapshots%rowtype;
  cutoff_at timestamptz;
  source_hash_value text;
  cap_violation boolean;
  total_controlled bigint;
begin
  select * into voting_record
  from public.mpgf_public_goods_voting_snapshots where id = p_voting_snapshot_id;
  if voting_record.id is null then raise exception using errcode = 'P0002', message = 'Voting snapshot not found.'; end if;
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(voting_record.compact_id::text || ':delegation-mutations', 0)
  );
  cutoff_at := pg_catalog.clock_timestamp();
  select * into delegation_record
  from public.mpgf_public_goods_delegation_snapshots
  where voting_snapshot_id = voting_record.id;
  if delegation_record.id is not null then
    return pg_catalog.jsonb_build_object('ok', true, 'delegationSnapshotId', delegation_record.id, 'frozenAt', delegation_record.frozen_at, 'moneyMoved', false);
  end if;

  with latest_events as (
    select
      event.delegator_membership_id, event.delegatee_membership_id, event.event_kind
    from public.mpgf_public_goods_delegation_events as event
    where event.voting_snapshot_id = voting_record.id
      and event.created_at <= cutoff_at
      and not exists (
        select 1
        from public.mpgf_public_goods_delegation_events as successor
        where successor.supersedes_event_id = event.id
          and successor.created_at <= cutoff_at
      )
  ), effective as (
    select delegator_membership_id, delegatee_membership_id
    from latest_events where event_kind = 'set'
  ), holdings as (
    select weight.membership_id,
      coalesce(effective.delegatee_membership_id, weight.membership_id) as holder_membership_id,
      weight.total_weight_units,
      effective.delegatee_membership_id is not null as delegated
    from public.mpgf_public_goods_voting_weight_snapshots as weight
    left join effective on effective.delegator_membership_id = weight.membership_id
    where weight.voting_snapshot_id = voting_record.id
  ), controlled as (
    select holder_membership_id,
      sum(total_weight_units)::bigint as controlled_weight_units,
      count(*) filter (where delegated)::integer as direct_incoming_count
    from holdings group by holder_membership_id
  )
  select coalesce(bool_or(direct_incoming_count > 0 and controlled_weight_units > 100000000000), false)
  into cap_violation from controlled;
  if cap_violation then raise exception using errcode = '23514', message = 'Delegation freeze rejected a proxy above the 10 percent cap.'; end if;

  with latest_events as (
    select
      event.delegator_membership_id, event.delegatee_membership_id, event.event_kind
    from public.mpgf_public_goods_delegation_events as event
    where event.voting_snapshot_id = voting_record.id and event.created_at <= cutoff_at
      and not exists (
        select 1
        from public.mpgf_public_goods_delegation_events as successor
        where successor.supersedes_event_id = event.id
          and successor.created_at <= cutoff_at
      )
  )
  select 'sha256:' || public.mpgf_public_goods_hash_v2(
    pg_catalog.jsonb_build_object(
      'votingSnapshotId', voting_record.id,
      'cutoffAt', cutoff_at,
      'events', coalesce(pg_catalog.jsonb_agg(
        pg_catalog.jsonb_build_object(
          'delegatorMembershipId', delegator_membership_id,
          'delegateeMembershipId', delegatee_membership_id,
          'eventKind', event_kind
        ) order by delegator_membership_id
      ), '[]'::jsonb)
    )
  ) into source_hash_value
  from latest_events;
  insert into public.mpgf_public_goods_delegation_snapshots (
    voting_snapshot_id, compact_id, cycle_key, source_event_cutoff_at,
    effective_weight_units, snapshot_hash, frozen_at
  ) values (
    voting_record.id, voting_record.compact_id, voting_record.cycle_key,
    cutoff_at, 1000000000000, source_hash_value, cutoff_at
  ) returning * into delegation_record;

  with latest_events as (
    select
      event.delegator_membership_id, event.delegatee_membership_id, event.event_kind
    from public.mpgf_public_goods_delegation_events as event
    where event.voting_snapshot_id = voting_record.id and event.created_at <= cutoff_at
      and not exists (
        select 1
        from public.mpgf_public_goods_delegation_events as successor
        where successor.supersedes_event_id = event.id
          and successor.created_at <= cutoff_at
      )
  ), effective as (
    select delegator_membership_id, delegatee_membership_id
    from latest_events where event_kind = 'set'
  ), holdings as (
    select weight.membership_id,
      coalesce(effective.delegatee_membership_id, weight.membership_id) as holder_membership_id,
      weight.total_weight_units,
      effective.delegatee_membership_id
    from public.mpgf_public_goods_voting_weight_snapshots as weight
    left join effective on effective.delegator_membership_id = weight.membership_id
    where weight.voting_snapshot_id = voting_record.id
  ), controlled as (
    select holder_membership_id,
      sum(total_weight_units)::bigint as controlled_weight_units,
      count(*) filter (where delegatee_membership_id is not null)::integer as direct_incoming_count
    from holdings group by holder_membership_id
  )
  insert into public.mpgf_public_goods_delegation_weight_snapshots (
    delegation_snapshot_id, membership_id, compact_id, participant_id,
    delegated_to_membership_id, own_weight_units, controlled_weight_units,
    direct_incoming_count, frozen_at
  )
  select delegation_record.id, weight.membership_id, weight.compact_id,
    weight.participant_id, holdings.delegatee_membership_id,
    weight.total_weight_units, coalesce(controlled.controlled_weight_units, 0),
    coalesce(controlled.direct_incoming_count, 0), cutoff_at
  from public.mpgf_public_goods_voting_weight_snapshots as weight
  join holdings on holdings.membership_id = weight.membership_id
  left join controlled on controlled.holder_membership_id = weight.membership_id
  where weight.voting_snapshot_id = voting_record.id;
  select sum(controlled_weight_units)::bigint into total_controlled
  from public.mpgf_public_goods_delegation_weight_snapshots
  where delegation_snapshot_id = delegation_record.id;
  if total_controlled <> 1000000000000 then
    raise exception using errcode = '23514', message = 'Direct delegation snapshot double-counted or lost electorate weight.';
  end if;
  return pg_catalog.jsonb_build_object(
    'ok', true, 'delegationSnapshotId', delegation_record.id,
    'frozenAt', delegation_record.frozen_at,
    'effectiveWeightUnits', total_controlled,
    'moneyMoved', false
  );
end;
$function$;

create or replace function public.get_mpgf_public_goods_compacts_v2_state()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $function$
declare
  viewer_id uuid := (select auth.uid());
  cycle_key_value text := pg_catalog.to_char(pg_catalog.timezone('UTC', pg_catalog.now()), 'YYYY-MM');
  period_start_value timestamptz;
  period_end_value timestamptz;
  coverage_record public.mpgf_public_goods_outflow_coverage_snapshots%rowtype;
  obligation_record public.mpgf_public_goods_obligation_snapshots%rowtype;
  allocation_record public.mpgf_public_goods_allocation_instructions%rowtype;
  authorization_record public.mpgf_public_goods_dormant_authorization_snapshots%rowtype;
  compact_record public.mpgf_public_goods_compacts%rowtype;
  membership_record public.mpgf_public_goods_compact_memberships%rowtype;
  readiness_record public.mpgf_public_goods_readiness_snapshots%rowtype;
  allocation_line_record public.mpgf_public_goods_allocation_instruction_lines%rowtype;
  scheduled_record public.mpgf_public_goods_scheduled_amount_snapshots%rowtype;
  settled_record public.mpgf_public_goods_settled_contribution_snapshots%rowtype;
  qualification_record public.mpgf_public_goods_funding_qualification_snapshots%rowtype;
  voting_record public.mpgf_public_goods_voting_snapshots%rowtype;
  delegation_event_record public.mpgf_public_goods_delegation_events%rowtype;
  joined_count integer := 0;
  instruction_line_count integer := 0;
  instruction_bps_total integer := 0;
  scheduled_count integer := 0;
  scheduled_total bigint := 0;
  accepted_count integer;
  instruction_valid boolean := false;
  scheduling_ready boolean := false;
  coverage_state text := 'unavailable';
  coverage_reason text := 'No repository table proves complete coverage of all eligible Moral Trade outflows, refunds, reversals, and chargebacks.';
  allocations_json jsonb := '[]'::jsonb;
  compacts_json jsonb := '[]'::jsonb;
  membership_json jsonb;
  delegation_json jsonb;
  readiness_json jsonb;
  electorate_json jsonb;
begin
  select bounds.period_start, bounds.period_end_exclusive
  into period_start_value, period_end_value
  from public.mpgf_public_goods_cycle_bounds_v2(cycle_key_value) as bounds;

  if viewer_id is not null then
    select * into coverage_record
    from public.mpgf_public_goods_outflow_coverage_snapshots as coverage
    where coverage.participant_id = viewer_id
      and coverage.cycle_key = cycle_key_value
    order by coverage.created_at desc, coverage.id desc
    limit 1;
    select * into obligation_record
    from public.mpgf_public_goods_obligation_snapshots as obligation
    where obligation.participant_id = viewer_id
      and obligation.cycle_key = cycle_key_value
    order by obligation.frozen_at desc, obligation.id desc
    limit 1;
    select * into authorization_record
    from public.mpgf_public_goods_dormant_authorization_snapshots as dormant_auth
    where dormant_auth.participant_id = viewer_id
      and dormant_auth.cycle_key = cycle_key_value
    order by dormant_auth.frozen_at desc, dormant_auth.id desc
    limit 1;
    select * into allocation_record
    from public.mpgf_public_goods_allocation_instructions as instruction
    where instruction.participant_id = viewer_id
      and instruction.cycle_key = cycle_key_value
    order by instruction.submitted_at desc, instruction.id desc
    limit 1;
    select count(*)::integer into joined_count
    from public.mpgf_public_goods_compact_memberships
    where participant_id = viewer_id
      and status in ('pending_activation', 'active', 'exit_notice');

    if allocation_record.id is not null then
      select count(*)::integer, coalesce(sum(line.allocation_bps), 0)::integer
      into instruction_line_count, instruction_bps_total
      from public.mpgf_public_goods_allocation_instruction_lines as line
      join public.mpgf_public_goods_compact_memberships as membership
        on membership.id = line.membership_id
       and membership.compact_id = line.compact_id
      where line.instruction_id = allocation_record.id
        and membership.participant_id = viewer_id
        and membership.status in ('pending_activation', 'active', 'exit_notice');
    end if;
    instruction_valid := joined_count > 0
      and instruction_line_count = joined_count
      and instruction_bps_total = 10000;

    if obligation_record.id is not null and allocation_record.id is not null then
      select count(*)::integer, coalesce(sum(scheduled.scheduled_contribution_cents), 0)::bigint
      into scheduled_count, scheduled_total
      from public.mpgf_public_goods_scheduled_amount_snapshots as scheduled
      where scheduled.obligation_snapshot_id = obligation_record.id
        and scheduled.allocation_instruction_id = allocation_record.id;
    end if;
    scheduling_ready := instruction_valid
      and obligation_record.state = 'calculated'
      and authorization_record.state = 'valid'
      and authorization_record.expires_at > pg_catalog.now()
      and scheduled_count = joined_count
      and scheduled_total = obligation_record.obligation_cents;

    if coverage_record.coverage_status = 'complete'
      and obligation_record.state = 'calculated'
      and coverage_record.id = obligation_record.coverage_snapshot_id
    then
      coverage_state := 'complete';
      coverage_reason := coverage_record.coverage_reason;
    elsif coverage_record.coverage_status = 'partial' then
      coverage_state := 'partial';
      coverage_reason := coverage_record.coverage_reason;
    elsif coverage_record.id is not null then
      coverage_reason := coverage_record.coverage_reason;
    end if;

    if instruction_valid then
      select coalesce(pg_catalog.jsonb_agg(
        pg_catalog.jsonb_build_object(
          'compactPublicKey', line.stable_compact_key,
          'allocationBps', line.allocation_bps,
          'scheduledContributionCents', case when scheduling_ready then scheduled.scheduled_contribution_cents else null end
        ) order by line.stable_compact_key
      ), '[]'::jsonb)
      into allocations_json
      from public.mpgf_public_goods_allocation_instruction_lines as line
      left join public.mpgf_public_goods_scheduled_amount_snapshots as scheduled
        on scheduled.allocation_instruction_id = allocation_record.id
       and scheduled.obligation_snapshot_id = obligation_record.id
       and scheduled.membership_id = line.membership_id
       and scheduled.compact_id = line.compact_id
      where line.instruction_id = allocation_record.id;
    end if;
  end if;

  for compact_record in
    select * from public.mpgf_public_goods_compacts
    where is_current order by display_order
  loop
    membership_record := null;
    readiness_record := null;
    allocation_line_record := null;
    scheduled_record := null;
    settled_record := null;
    qualification_record := null;
    voting_record := null;
    delegation_event_record := null;
    membership_json := null;
    delegation_json := null;

    select count(*)::integer into accepted_count
    from public.mpgf_public_goods_compact_memberships
    where compact_id = compact_record.id
      and status in ('pending_activation', 'active', 'exit_notice');
    select * into readiness_record
    from public.mpgf_public_goods_readiness_snapshots as readiness
    where readiness.compact_id = compact_record.id
      and readiness.cycle_key = cycle_key_value
    order by readiness.frozen_at desc, readiness.id desc
    limit 1;

    if readiness_record.id is null then
      readiness_json := pg_catalog.jsonb_build_object(
        'cycleKey', cycle_key_value,
        'frozenAt', null,
        'fundingQualifiedUniquePersonCount', 0,
        'scheduledContributionCents', 0,
        'memberThresholdMet', false,
        'fundingThresholdMet', false,
        'thresholdReady', false,
        'activationBlocked', true,
        'blockers', pg_catalog.to_jsonb(array[
          'authoritative_outflow_coverage_unavailable',
          'verified_unique_person_primitive_unavailable',
          'dormant_payment_authorization_unavailable',
          'collection_provider_unapproved',
          'legal_and_fiscal_sponsor_review_incomplete',
          'donor_of_record_receipt_and_custody_review_incomplete',
          'sanctions_and_jurisdiction_release_gate_incomplete',
          'production_release_not_approved'
        ]::text[])
      );
    else
      readiness_json := pg_catalog.jsonb_build_object(
        'cycleKey', readiness_record.cycle_key,
        'frozenAt', readiness_record.frozen_at,
        'fundingQualifiedUniquePersonCount', readiness_record.funding_qualified_unique_person_count,
        'scheduledContributionCents', readiness_record.scheduled_contribution_cents,
        'memberThresholdMet', readiness_record.member_threshold_met,
        'fundingThresholdMet', readiness_record.funding_threshold_met,
        'thresholdReady', readiness_record.threshold_ready,
        'activationBlocked', true,
        'blockers', pg_catalog.to_jsonb(readiness_record.blockers)
      );
    end if;

    if viewer_id is not null then
      select * into membership_record
      from public.mpgf_public_goods_compact_memberships as membership
      where membership.compact_id = compact_record.id
        and membership.participant_id = viewer_id;
      if membership_record.id is not null then
        if instruction_valid then
          select * into allocation_line_record
          from public.mpgf_public_goods_allocation_instruction_lines as line
          where line.instruction_id = allocation_record.id
            and line.membership_id = membership_record.id;
        end if;
        if scheduling_ready then
          select * into scheduled_record
          from public.mpgf_public_goods_scheduled_amount_snapshots as scheduled
          where scheduled.obligation_snapshot_id = obligation_record.id
            and scheduled.allocation_instruction_id = allocation_record.id
            and scheduled.membership_id = membership_record.id;
        end if;
        select * into settled_record
        from public.mpgf_public_goods_settled_contribution_snapshots as settled
        where settled.participant_id = viewer_id
          and settled.cycle_key = cycle_key_value
          and settled.membership_id = membership_record.id
        order by settled.frozen_at desc, settled.id desc
        limit 1;
        select * into qualification_record
        from public.mpgf_public_goods_funding_qualification_snapshots as qualification
        where qualification.participant_id = viewer_id
          and qualification.cycle_key = cycle_key_value
          and qualification.membership_id = membership_record.id
        order by qualification.frozen_at desc, qualification.id desc
        limit 1;
        membership_json := pg_catalog.jsonb_build_object(
          'id', membership_record.id,
          'compactId', membership_record.compact_id,
          'compactPublicKey', compact_record.public_key,
          'constitutionVersionAccepted', membership_record.constitution_version_accepted,
          'acknowledgements', membership_record.acknowledgements,
          'status', membership_record.status,
          'acceptedAt', membership_record.accepted_at,
          'activatedAt', membership_record.activated_at,
          'revokedAt', membership_record.revoked_at,
          'exitRequestedAt', membership_record.exit_requested_at,
          'exitEffectiveAt', membership_record.exit_effective_at,
          'allocationBps', allocation_line_record.allocation_bps,
          'scheduledContributionCents', scheduled_record.scheduled_contribution_cents,
          'netSettledContributionCents', case when settled_record.settlement_coverage_status = 'complete' then settled_record.net_settled_cents else null end,
          'fundingQualificationState', case
            when compact_record.status = 'active' and qualification_record.qualification_state = 'settled_qualified' then 'settled_qualified'
            when compact_record.status = 'recruiting' and qualification_record.qualification_state = 'scheduled_qualified' then 'scheduled_qualified'
            else 'unqualified'
          end,
          'fundingQualified', case
            when compact_record.status = 'active' then qualification_record.qualification_state = 'settled_qualified'
            else qualification_record.qualification_state = 'scheduled_qualified'
          end,
          'identityQualified', coalesce(qualification_record.identity_qualified, false)
        );
      end if;
    end if;

    if compact_record.status = 'active' then
      select * into voting_record
      from public.mpgf_public_goods_voting_snapshots as voting
      where voting.compact_id = compact_record.id and voting.cycle_key = cycle_key_value
      order by voting.frozen_at desc, voting.id desc limit 1;
    end if;
    electorate_json := pg_catalog.jsonb_build_object(
      'active', voting_record.id is not null and not exists (
        select 1 from public.mpgf_public_goods_delegation_snapshots
        where voting_snapshot_id = voting_record.id
      ),
      'key', case when voting_record.id is not null then voting_record.cycle_key else null end
    );
    if membership_record.id is not null and voting_record.id is not null then
      select * into delegation_event_record
      from public.mpgf_public_goods_delegation_events as event
      where event.voting_snapshot_id = voting_record.id
        and event.delegator_membership_id = membership_record.id
        and not exists (
          select 1
          from public.mpgf_public_goods_delegation_events as successor
          where successor.supersedes_event_id = event.id
        );
      if delegation_event_record.event_kind = 'set' then
        delegation_json := pg_catalog.jsonb_build_object(
          'id', delegation_event_record.id,
          'compactId', delegation_event_record.compact_id,
          'cycleKey', delegation_event_record.cycle_key,
          'delegatorMembershipId', delegation_event_record.delegator_membership_id,
          'delegateeMembershipId', delegation_event_record.delegatee_membership_id,
          'state', 'active',
          'createdAt', delegation_event_record.created_at,
          'revokedAt', null
        );
      end if;
    end if;

    compacts_json := compacts_json || pg_catalog.jsonb_build_array(
      pg_catalog.jsonb_build_object(
        'id', compact_record.id,
        'publicKey', compact_record.public_key,
        'causeKey', compact_record.cause_key,
        'title', compact_record.title,
        'summary', compact_record.summary,
        'constitutionVersion', compact_record.constitution_version,
        'terms', pg_catalog.jsonb_build_object(
          'obligationDivisor', compact_record.obligation_divisor,
          'allocationTotalBps', compact_record.allocation_total_bps,
          'fundingQualificationMinimumCents', compact_record.funding_qualification_minimum_cents,
          'readinessThresholdMembers', compact_record.readiness_threshold_members,
          'readinessThresholdScheduledCents', compact_record.readiness_threshold_scheduled_cents,
          'votingEqualShareBps', compact_record.voting_equal_share_bps,
          'votingSqrtContributionShareBps', compact_record.voting_sqrt_contribution_share_bps,
          'delegateControlCapBps', compact_record.delegate_control_cap_bps,
          'minimumTermMonths', compact_record.minimum_term_months,
          'exitNoticeDays', compact_record.exit_notice_days,
          'projectSelectionRule', compact_record.project_selection_rule,
          'auditRule', compact_record.audit_rule,
          'noProjectOptOutRule', compact_record.no_project_opt_out_rule
        ),
        'invariants', pg_catalog.jsonb_build_object(
          'optInOnly', compact_record.opt_in_only,
          'randomAssignmentAllowed', compact_record.random_assignment_allowed,
          'coreMarketplaceTaxed', compact_record.core_marketplace_taxed,
          'bindingOnlyAfterActivation', compact_record.binding_only_after_activation,
          'perProjectRefusalAllowedAfterActivation', compact_record.per_project_refusal_allowed_after_activation,
          'exitProspectiveOnlyAfterActivation', compact_record.exit_prospective_only_after_activation,
          'moneyMovesOnJoin', compact_record.money_moves_on_join,
          'automaticCollectionEnabled', compact_record.automatic_collection_enabled,
          'allocationRequiresCompleteCoverage', compact_record.allocation_requires_complete_coverage,
          'votingRequiresNetSettledContribution', compact_record.voting_requires_net_settled_contribution
        ),
        'collectionState', compact_record.collection_state,
        'status', compact_record.status,
        'acceptedMemberCount', accepted_count,
        'memberCountAvailable', true,
        'activation', pg_catalog.jsonb_build_object(
          'state', case
            when compact_record.status = 'active' then 'active'
            when readiness_record.threshold_ready then 'threshold_ready_activation_blocked'
            else 'recruiting'
          end,
          'activatedAt', compact_record.activated_at,
          'constitutionFrozenAt', compact_record.constitution_frozen_at,
          'frozenConstitutionVersion', compact_record.frozen_constitution_version,
          'minimumTermEndsAt', case when compact_record.activated_at is not null then compact_record.activated_at + pg_catalog.make_interval(months => compact_record.minimum_term_months) else null end
        ),
        'readiness', readiness_json,
        'allocationElectorate', electorate_json,
        'membership', membership_json,
        'delegation', delegation_json
      )
    );
  end loop;

  return pg_catalog.jsonb_build_object(
    'available', true,
    'source', 'database',
    'unavailableReason', null,
    'obligation', pg_catalog.jsonb_build_object(
      'cycleKey', cycle_key_value,
      'priorMonthStart', period_start_value,
      'priorMonthEndExclusive', period_end_value,
      'coverage', coverage_state,
      'coverageReason', coverage_reason,
      'eligibleNetSettledOutflowCents', case when coverage_state = 'complete' then obligation_record.eligible_net_settled_outflow_cents else null end,
      'obligationCents', case when coverage_state = 'complete' then obligation_record.obligation_cents else null end,
      'sourceObservationCount', case when coverage_state = 'complete' then obligation_record.source_observation_count else 0 end
    ),
    'allocation', pg_catalog.jsonb_build_object(
      'cycleKey', cycle_key_value,
      'instructionValid', instruction_valid,
      'schedulingReady', scheduling_ready,
      'reason', case
        when scheduling_ready then null
        when instruction_valid then 'Allocation percentages are complete, but authoritative coverage and a valid dormant authorization are required before planned cents exist.'
        when joined_count = 0 then 'Join at least one Compact before allocating.'
        else 'Every joined Compact must appear in one allocation map totaling exactly 10000 basis points.'
      end,
      'allocations', allocations_json,
      'scheduledTotalCents', case when scheduling_ready then scheduled_total else null end
    ),
    'compacts', compacts_json,
    'moneyMovesOnPageAction', false,
    'automaticCollectionEnabled', false
  );
end;
$function$;

revoke all on function public.join_mpgf_public_goods_compact_v2(text,text,jsonb,text)
  from public, anon;
revoke all on function public.set_mpgf_public_goods_compact_allocation_v2(jsonb,text)
  from public, anon;
revoke all on function public.request_mpgf_public_goods_compact_exit_v2(text,text)
  from public, anon;
revoke all on function public.set_mpgf_public_goods_compact_delegation_v2(text,text,uuid,text)
  from public, anon;
revoke all on function public.clear_mpgf_public_goods_compact_delegation_v2(text,text,text)
  from public, anon;
grant execute on function public.join_mpgf_public_goods_compact_v2(text,text,jsonb,text)
  to authenticated;
grant execute on function public.set_mpgf_public_goods_compact_allocation_v2(jsonb,text)
  to authenticated;
grant execute on function public.request_mpgf_public_goods_compact_exit_v2(text,text)
  to authenticated;
grant execute on function public.set_mpgf_public_goods_compact_delegation_v2(text,text,uuid,text)
  to authenticated;
grant execute on function public.clear_mpgf_public_goods_compact_delegation_v2(text,text,text)
  to authenticated;

revoke all on function public.get_mpgf_public_goods_compacts_v2_state()
  from public;
grant execute on function public.get_mpgf_public_goods_compacts_v2_state()
  to anon, authenticated;

revoke all on function public.freeze_mpgf_public_goods_financial_cycle_v2(uuid,text)
  from public, anon, authenticated;
revoke all on function public.freeze_mpgf_public_goods_readiness_v2(uuid,text)
  from public, anon, authenticated;
revoke all on function public.freeze_mpgf_public_goods_voting_v2(uuid,text)
  from public, anon, authenticated;
revoke all on function public.freeze_mpgf_public_goods_delegations_v2(uuid)
  from public, anon, authenticated;
grant execute on function public.freeze_mpgf_public_goods_financial_cycle_v2(uuid,text)
  to service_role;
grant execute on function public.freeze_mpgf_public_goods_readiness_v2(uuid,text)
  to service_role;
grant execute on function public.freeze_mpgf_public_goods_voting_v2(uuid,text)
  to service_role;
grant execute on function public.freeze_mpgf_public_goods_delegations_v2(uuid)
  to service_role;
grant execute on function public.mpgf_public_goods_hash_v2(jsonb)
  to service_role;
grant execute on function public.mpgf_public_goods_cycle_bounds_v2(text)
  to service_role;

comment on function public.get_mpgf_public_goods_compacts_v2_state() is
  'Fail-closed Compact v2 projection. Private data is limited to auth.uid(); absent ledger coverage, unique-person keys, dormant authorization, settlement, or active snapshots remain explicitly unavailable.';

commit;
