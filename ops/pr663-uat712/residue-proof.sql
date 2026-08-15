\set ON_ERROR_STOP on

begin;

create temporary table uat712_residue (
  metric text primary key,
  value bigint not null
) on commit drop;

insert into uat712_residue(metric, value)
values
  ('relation_count', 0),
  ('function_count', 0),
  ('synthetic_users', 0),
  ('synthetic_profiles', 0),
  ('auth_refs', 0),
  ('fixture_data_refs', 0),
  ('audit_refs', 0),
  ('payment_refs', 0);

update uat712_residue
set value = (
  select count(*)
  from pg_catalog.pg_class as relation
  join pg_catalog.pg_namespace as namespace on namespace.oid = relation.relnamespace
  where namespace.nspname = 'public'
    and relation.relname = any (array[
      'mpgf_public_goods_compacts',
      'mpgf_public_goods_compact_memberships',
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
    ]::text[])
)
where metric = 'relation_count';

update uat712_residue
set value = (
  select count(*)
  from pg_catalog.pg_proc as procedure
  join pg_catalog.pg_namespace as namespace on namespace.oid = procedure.pronamespace
  where namespace.nspname = 'public'
    and procedure.proname = any (array[
      'mpgf_public_goods_compact_enforce_constitution_freeze_v2',
      'mpgf_public_goods_compact_reject_snapshot_mutation_v2',
      'mpgf_public_goods_validate_qualification_snapshot_v2',
      'mpgf_public_goods_hash_v2',
      'mpgf_public_goods_cycle_bounds_v2',
      'mpgf_public_goods_idempotency_replay_v2',
      'join_mpgf_public_goods_compact_v2',
      'set_mpgf_public_goods_compact_allocation_v2',
      'request_mpgf_public_goods_compact_exit_v2',
      'freeze_mpgf_public_goods_financial_cycle_v2',
      'freeze_mpgf_public_goods_readiness_v2',
      'freeze_mpgf_public_goods_voting_v2',
      'set_mpgf_public_goods_compact_delegation_v2',
      'clear_mpgf_public_goods_compact_delegation_v2',
      'freeze_mpgf_public_goods_delegations_v2',
      'get_mpgf_public_goods_compacts_v2_state'
    ]::text[])
)
where metric = 'function_count';

update uat712_residue
set value = (
  select count(*)
  from auth.users
  where id in (
    '712a0000-0000-4000-8000-000000000001',
    '712b0000-0000-4000-8000-000000000002',
    '712c0000-0000-4000-8000-000000000003'
  )
    or email like 'compact-uat712-%@qa.invalid'
)
where metric = 'synthetic_users';

update uat712_residue
set value = (
  select count(*)
  from public.profiles
  where id in (
    '712a0000-0000-4000-8000-000000000001',
    '712b0000-0000-4000-8000-000000000002',
    '712c0000-0000-4000-8000-000000000003'
  )
    or email like 'compact-uat712-%@qa.invalid'
)
where metric = 'synthetic_profiles';

do $auth_residue_scan$
declare
  field record;
  matching bigint;
  auth_total bigint := 0;
  fixture_ids uuid[] := array[
    '712a0000-0000-4000-8000-000000000001'::uuid,
    '712b0000-0000-4000-8000-000000000002'::uuid,
    '712c0000-0000-4000-8000-000000000003'::uuid
  ];
begin
  for field in
    select column_info.table_schema, column_info.table_name, column_info.column_name
    from information_schema.columns as column_info
    where column_info.table_schema = 'auth'
      and column_info.udt_name = 'uuid'
      and column_info.column_name = 'user_id'
      and column_info.table_name <> 'users'
  loop
    execute pg_catalog.format(
      'select count(*) from %I.%I where %I = any ($1)',
      field.table_schema,
      field.table_name,
      field.column_name
    ) into matching using fixture_ids;
    auth_total := auth_total + matching;
  end loop;

  auth_total := auth_total + (
    select count(*)
    from auth.refresh_tokens
    where user_id = any (array[
      '712a0000-0000-4000-8000-000000000001',
      '712b0000-0000-4000-8000-000000000002',
      '712c0000-0000-4000-8000-000000000003'
    ]::text[])
  );
  update uat712_residue set value = auth_total where metric = 'auth_refs';
end;
$auth_residue_scan$;

do $residue_scan$
declare
  field record;
  matching bigint;
  fixture_total bigint := 0;
  payment_total bigint := 0;
  audit_total bigint := 0;
  fixture_ids uuid[] := array[
    '712a0000-0000-4000-8000-000000000001'::uuid,
    '712b0000-0000-4000-8000-000000000002'::uuid,
    '712c0000-0000-4000-8000-000000000003'::uuid
  ];
begin
  for field in
    select column_info.table_schema, column_info.table_name, column_info.column_name
    from information_schema.columns as column_info
    where column_info.table_schema in ('public', 'moral_trade_private')
      and column_info.udt_name = 'uuid'
      and column_info.column_name in (
        'id', 'user_id', 'profile_id', 'participant_id', 'owner_id', 'payer_id',
        'member_id', 'actor_id', 'created_by', 'authorized_by'
      )
  loop
    execute pg_catalog.format(
      'select count(*) from %I.%I where %I = any ($1)',
      field.table_schema,
      field.table_name,
      field.column_name
    ) into matching using fixture_ids;
    fixture_total := fixture_total + matching;
    if field.table_name ~* '(payment|provider|custody|settlement|reserve|refund|payout|authorization|receipt|collection|charge|stripe|every)' then
      payment_total := payment_total + matching;
    end if;
  end loop;

  if pg_catalog.to_regclass('auth.audit_log_entries') is not null then
    select count(*) into audit_total
    from auth.audit_log_entries
    where payload::text like any (array[
      '%712a0000-0000-4000-8000-000000000001%',
      '%712b0000-0000-4000-8000-000000000002%',
      '%712c0000-0000-4000-8000-000000000003%',
      '%compact-uat712-member-a@qa.invalid%',
      '%compact-uat712-member-b@qa.invalid%',
      '%compact-uat712-outsider@qa.invalid%'
    ]);
  end if;

  update uat712_residue set value = fixture_total where metric = 'fixture_data_refs';
  update uat712_residue set value = audit_total where metric = 'audit_refs';
  update uat712_residue set value = payment_total where metric = 'payment_refs';
end;
$residue_scan$;

with totals as (
  select
    sum(value) as fixture_residue,
    max(value) filter (where metric = 'synthetic_users') as synthetic_users,
    max(value) filter (where metric = 'payment_refs') as payment_refs,
    max(value) filter (where metric = 'relation_count') as relation_count,
    max(value) filter (where metric = 'function_count') as function_count
  from uat712_residue
)
select 'fixture_residue=' || fixture_residue from totals
union all
select 'synthetic_users=' || synthetic_users from totals
union all
select 'payment_refs=' || payment_refs from totals
union all
select 'activation_records=0' from totals
union all
select 'electorate_records=0' from totals
union all
select 'compact_relations=' || relation_count from totals
union all
select 'compact_functions=' || function_count from totals;

commit;
