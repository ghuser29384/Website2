begin;

set local statement_timeout = '10s';
set local lock_timeout = '5s';

select case
  when to_regclass('public.mpgf_pledge_impact_forecast_snapshots') is null
    then pg_catalog.set_config('moral_trade.index_test_failure', 'missing forecast snapshots table', true)
  when to_regclass('public.mpgf_pledge_impact_forecast_pool_proposal_idx') is null
    then pg_catalog.set_config('moral_trade.index_test_failure', 'missing pool proposal index', true)
  else pg_catalog.set_config('moral_trade.index_test_failure', '', true)
end;

do $test$
declare
  index_is_valid boolean;
  index_is_ready boolean;
  indexed_columns text[];
  failure_message text := current_setting('moral_trade.index_test_failure', true);
begin
  if coalesce(failure_message, '') <> '' then
    raise exception '%', failure_message;
  end if;

  select
    index_state.indisvalid,
    index_state.indisready,
    array_agg(attribute.attname order by key_position.ordinality)
  into
    index_is_valid,
    index_is_ready,
    indexed_columns
  from pg_catalog.pg_class as index_relation
  join pg_catalog.pg_namespace as index_namespace
    on index_namespace.oid = index_relation.relnamespace
  join pg_catalog.pg_index as index_state
    on index_state.indexrelid = index_relation.oid
  join lateral unnest(index_state.indkey::smallint[]) with ordinality
    as key_position(attribute_number, ordinality)
    on true
  join pg_catalog.pg_attribute as attribute
    on attribute.attrelid = index_state.indrelid
   and attribute.attnum = key_position.attribute_number
  where index_namespace.nspname = 'public'
    and index_relation.relname = 'mpgf_pledge_impact_forecast_pool_proposal_idx'
  group by index_state.indisvalid, index_state.indisready;

  if index_is_valid is distinct from true then
    raise exception 'Pledge-impact pool proposal index is not valid.';
  end if;
  if index_is_ready is distinct from true then
    raise exception 'Pledge-impact pool proposal index is not ready.';
  end if;
  if indexed_columns is distinct from array['pool_proposal_id']::text[] then
    raise exception 'Unexpected indexed columns: %', indexed_columns;
  end if;
end;
$test$;

rollback;
