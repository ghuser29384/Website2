\set ON_ERROR_STOP on

begin;

do $drop_functions$
declare
  procedure_signature record;
begin
  for procedure_signature in
    select procedure.oid::pg_catalog.regprocedure::text as signature
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
  loop
    execute pg_catalog.format('drop function if exists %s cascade', procedure_signature.signature);
  end loop;
end;
$drop_functions$;

drop table if exists public.mpgf_public_goods_delegation_weight_snapshots cascade;
drop table if exists public.mpgf_public_goods_delegation_snapshots cascade;
drop table if exists public.mpgf_public_goods_delegation_events cascade;
drop table if exists public.mpgf_public_goods_voting_weight_snapshots cascade;
drop table if exists public.mpgf_public_goods_voting_snapshots cascade;
drop table if exists public.mpgf_public_goods_readiness_snapshots cascade;
drop table if exists public.mpgf_public_goods_funding_qualification_snapshots cascade;
drop table if exists public.mpgf_public_goods_settled_contribution_snapshots cascade;
drop table if exists public.mpgf_public_goods_scheduled_amount_snapshots cascade;
drop table if exists public.mpgf_public_goods_allocation_instruction_lines cascade;
drop table if exists public.mpgf_public_goods_allocation_instructions cascade;
drop table if exists public.mpgf_public_goods_obligation_snapshots cascade;
drop table if exists public.mpgf_public_goods_outflow_observations cascade;
drop table if exists public.mpgf_public_goods_outflow_coverage_snapshots cascade;
drop table if exists public.mpgf_public_goods_dormant_authorization_snapshots cascade;
drop table if exists public.mpgf_public_goods_compact_idempotency_keys cascade;
drop table if exists public.mpgf_public_goods_compact_memberships cascade;
drop table if exists public.mpgf_public_goods_compacts cascade;
drop table if exists public.moral_trade_participant_eligibility_records cascade;

do $auth_cleanup$
declare
  auth_table record;
  fixture_ids uuid[] := array[
    '712a0000-0000-4000-8000-000000000001'::uuid,
    '712b0000-0000-4000-8000-000000000002'::uuid,
    '712c0000-0000-4000-8000-000000000003'::uuid
  ];
begin
  for auth_table in
    select column_info.table_schema, column_info.table_name, column_info.column_name
    from information_schema.columns as column_info
    where column_info.table_schema = 'auth'
      and column_info.udt_name = 'uuid'
      and column_info.column_name = 'user_id'
      and column_info.table_name <> 'users'
  loop
    execute pg_catalog.format(
      'delete from %I.%I where %I = any ($1)',
      auth_table.table_schema,
      auth_table.table_name,
      auth_table.column_name
    ) using fixture_ids;
  end loop;

  if pg_catalog.to_regclass('auth.audit_log_entries') is not null then
    delete from auth.audit_log_entries
    where payload::text like any (array[
      '%712a0000-0000-4000-8000-000000000001%',
      '%712b0000-0000-4000-8000-000000000002%',
      '%712c0000-0000-4000-8000-000000000003%',
      '%compact-uat712-member-a@qa.invalid%',
      '%compact-uat712-member-b@qa.invalid%',
      '%compact-uat712-outsider@qa.invalid%'
    ]);
  end if;
end;
$auth_cleanup$;

delete from auth.refresh_tokens
where user_id = any (array[
  '712a0000-0000-4000-8000-000000000001',
  '712b0000-0000-4000-8000-000000000002',
  '712c0000-0000-4000-8000-000000000003'
]::text[]);

delete from moral_trade_private.person_accounts
where profile_id in (
  '712a0000-0000-4000-8000-000000000001',
  '712b0000-0000-4000-8000-000000000002',
  '712c0000-0000-4000-8000-000000000003'
);

delete from public.profiles
where id in (
  '712a0000-0000-4000-8000-000000000001',
  '712b0000-0000-4000-8000-000000000002',
  '712c0000-0000-4000-8000-000000000003'
)
  or email like 'compact-uat712-%@qa.invalid';

delete from auth.users
where id in (
  '712a0000-0000-4000-8000-000000000001',
  '712b0000-0000-4000-8000-000000000002',
  '712c0000-0000-4000-8000-000000000003'
)
  or email like 'compact-uat712-%@qa.invalid';

commit;
