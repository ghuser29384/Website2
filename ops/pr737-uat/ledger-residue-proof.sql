\set ON_ERROR_STOP on

with counts as (
  select
    (
      select count(*)
      from pg_catalog.pg_class relation
      join pg_catalog.pg_namespace namespace on namespace.oid = relation.relnamespace
      where namespace.nspname = 'moral_trade_private'
        and relation.relname like 'compact_outflow_%'
    ) as private_relations,
    (
      select count(*)
      from pg_catalog.pg_proc procedure
      join pg_catalog.pg_namespace namespace on namespace.oid = procedure.pronamespace
      where namespace.nspname = 'moral_trade_private'
        and (
          procedure.proname like 'compact_outflow_%'
          or procedure.proname like 'assign_compact_outflow_%'
          or procedure.proname like 'reject_compact_outflow_%'
          or procedure.proname like 'require_compact_outflow_%'
        )
    ) as private_functions,
    (
      select count(*)
      from pg_catalog.pg_trigger trigger_row
      where not trigger_row.tgisinternal
        and trigger_row.tgname like 'compact_outflow_%'
    ) as ledger_triggers
)
select 'ledger_private_relations_after=' || private_relations from counts
union all
select 'ledger_private_functions_after=' || private_functions from counts
union all
select 'ledger_triggers_after=' || ledger_triggers from counts;
