\set ON_ERROR_STOP on

begin;

create temporary table pr737_metrics (
  metric text primary key,
  value bigint not null
) on commit drop;

insert into pr737_metrics(metric, value) values ('payment_provider_refs', 0);

do $scan$
declare
  field record;
  matching bigint;
  total bigint := 0;
  fixture_ids uuid[] := array[
    '712a0000-0000-4000-8000-000000000001'::uuid,
    '712b0000-0000-4000-8000-000000000002'::uuid,
    '712c0000-0000-4000-8000-000000000003'::uuid
  ];
begin
  for field in
    select column_info.table_schema, column_info.table_name, column_info.column_name
    from information_schema.columns column_info
    where column_info.table_schema in ('public', 'moral_trade_private')
      and column_info.udt_name = 'uuid'
      and column_info.column_name in (
        'user_id', 'profile_id', 'participant_id', 'owner_id', 'payer_id',
        'member_id', 'actor_id', 'created_by', 'authorized_by'
      )
      and column_info.table_name ~* '(payment|provider|custody|settlement|reserve|refund|payout|authorization|receipt|collection|charge|stripe|every)'
      and column_info.table_name not like 'compact_outflow_%'
  loop
    execute pg_catalog.format(
      'select count(*) from %I.%I where %I = any ($1)',
      field.table_schema,
      field.table_name,
      field.column_name
    ) into matching using fixture_ids;
    total := total + matching;
  end loop;
  update pr737_metrics set value = total where metric = 'payment_provider_refs';
end;
$scan$;

with counts as (
  select
    (select count(*) from auth.users where id in (
      '712a0000-0000-4000-8000-000000000001',
      '712b0000-0000-4000-8000-000000000002',
      '712c0000-0000-4000-8000-000000000003'
    )) as synthetic_users,
    (select count(*) from public.mpgf_public_goods_compacts
      where status='active' or activation_execution_enabled or activated_at is not null) as active_compacts,
    ((select count(*) from public.mpgf_public_goods_voting_snapshots)
      + (select count(*) from public.mpgf_public_goods_voting_weight_snapshots)
      + (select count(*) from public.mpgf_public_goods_delegation_events)
      + (select count(*) from public.mpgf_public_goods_delegation_snapshots)
      + (select count(*) from public.mpgf_public_goods_delegation_weight_snapshots)) as electorate_records,
    (select count(*) from public.mpgf_public_goods_dormant_authorization_snapshots) as authorization_records,
    (select count(*) from public.mpgf_public_goods_outflow_coverage_snapshots) as coverage_records,
    (select count(*) from public.mpgf_public_goods_outflow_observations) as outflow_records,
    (select count(*) from public.mpgf_public_goods_obligation_snapshots) as obligation_records,
    (select count(*) from public.mpgf_public_goods_scheduled_amount_snapshots) as scheduled_records,
    (select count(*) from public.mpgf_public_goods_settled_contribution_snapshots) as settlement_records,
    (select count(*) from public.mpgf_public_goods_funding_qualification_snapshots) as qualification_records,
    (select count(*) from public.mpgf_public_goods_readiness_snapshots) as readiness_records
)
select 'synthetic_users_before_cleanup=' || synthetic_users from counts
union all
select 'payment_provider_refs_before_cleanup=' || (select value from pr737_metrics where metric='payment_provider_refs') from counts
union all
select 'active_compacts_before_cleanup=' || active_compacts from counts
union all
select 'electorate_records_before_cleanup=' || electorate_records from counts
union all
select 'authorization_records_before_cleanup=' || authorization_records from counts
union all
select 'coverage_records_before_cleanup=' || coverage_records from counts
union all
select 'outflow_records_before_cleanup=' || outflow_records from counts
union all
select 'obligation_records_before_cleanup=' || obligation_records from counts
union all
select 'scheduled_records_before_cleanup=' || scheduled_records from counts
union all
select 'settlement_records_before_cleanup=' || settlement_records from counts
union all
select 'qualification_records_before_cleanup=' || qualification_records from counts
union all
select 'readiness_records_before_cleanup=' || readiness_records from counts;

commit;
