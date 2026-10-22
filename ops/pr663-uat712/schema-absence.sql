\set ON_ERROR_STOP on

with expected_relations(name) as (
  values
    ('mpgf_public_goods_compacts'),
    ('mpgf_public_goods_compact_memberships'),
    ('mpgf_public_goods_dormant_authorization_snapshots'),
    ('mpgf_public_goods_outflow_coverage_snapshots'),
    ('mpgf_public_goods_outflow_observations'),
    ('mpgf_public_goods_obligation_snapshots'),
    ('mpgf_public_goods_allocation_instructions'),
    ('mpgf_public_goods_allocation_instruction_lines'),
    ('mpgf_public_goods_scheduled_amount_snapshots'),
    ('mpgf_public_goods_settled_contribution_snapshots'),
    ('mpgf_public_goods_funding_qualification_snapshots'),
    ('mpgf_public_goods_readiness_snapshots'),
    ('mpgf_public_goods_voting_snapshots'),
    ('mpgf_public_goods_voting_weight_snapshots'),
    ('mpgf_public_goods_delegation_events'),
    ('mpgf_public_goods_delegation_snapshots'),
    ('mpgf_public_goods_delegation_weight_snapshots'),
    ('mpgf_public_goods_compact_idempotency_keys')
),
expected_functions(name) as (
  values
    ('mpgf_public_goods_compact_enforce_constitution_freeze_v2'),
    ('mpgf_public_goods_compact_reject_snapshot_mutation_v2'),
    ('mpgf_public_goods_validate_qualification_snapshot_v2'),
    ('mpgf_public_goods_hash_v2'),
    ('mpgf_public_goods_cycle_bounds_v2'),
    ('mpgf_public_goods_idempotency_replay_v2'),
    ('join_mpgf_public_goods_compact_v2'),
    ('set_mpgf_public_goods_compact_allocation_v2'),
    ('request_mpgf_public_goods_compact_exit_v2'),
    ('freeze_mpgf_public_goods_financial_cycle_v2'),
    ('freeze_mpgf_public_goods_readiness_v2'),
    ('freeze_mpgf_public_goods_voting_v2'),
    ('set_mpgf_public_goods_compact_delegation_v2'),
    ('clear_mpgf_public_goods_compact_delegation_v2'),
    ('freeze_mpgf_public_goods_delegations_v2'),
    ('get_mpgf_public_goods_compacts_v2_state')
),
counts as (
  select
    (select count(*) from expected_relations where pg_catalog.to_regclass('public.' || name) is not null) as relation_count,
    (
      select count(*)
      from pg_catalog.pg_proc as procedure
      join pg_catalog.pg_namespace as namespace on namespace.oid = procedure.pronamespace
      where namespace.nspname = 'public'
        and procedure.proname in (select name from expected_functions)
    ) as function_count,
    (
      select count(*)
      where pg_catalog.to_regclass('public.moral_trade_participant_eligibility_records') is not null
    ) as eligibility_dependency_count,
    (
      select count(*)
      from auth.users
      where id in (
        '712a0000-0000-4000-8000-000000000001',
        '712b0000-0000-4000-8000-000000000002',
        '712c0000-0000-4000-8000-000000000003'
      )
        or email like 'compact-uat712-%@qa.invalid'
    ) as synthetic_users,
    (
      select count(*)
      from public.profiles
      where id in (
        '712a0000-0000-4000-8000-000000000001',
        '712b0000-0000-4000-8000-000000000002',
        '712c0000-0000-4000-8000-000000000003'
      )
        or email like 'compact-uat712-%@qa.invalid'
    ) as synthetic_profiles
)
select 'compact_relations_before=' || relation_count from counts
union all
select 'compact_functions_before=' || function_count from counts
union all
select 'eligibility_dependency_before=' || eligibility_dependency_count from counts
union all
select 'synthetic_users_before=' || synthetic_users from counts
union all
select 'synthetic_profiles_before=' || synthetic_profiles from counts;
