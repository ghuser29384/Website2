\set ON_ERROR_STOP on

begin;

do $drop_functions$
declare
  procedure_signature record;
begin
  for procedure_signature in
    select procedure.oid::pg_catalog.regprocedure::text as signature
    from pg_catalog.pg_proc procedure
    join pg_catalog.pg_namespace namespace on namespace.oid = procedure.pronamespace
    where namespace.nspname = 'moral_trade_private'
      and (
        procedure.proname like 'compact_outflow_%'
        or procedure.proname like 'assign_compact_outflow_%'
        or procedure.proname like 'reject_compact_outflow_%'
        or procedure.proname like 'require_compact_outflow_%'
      )
  loop
    execute pg_catalog.format('drop function if exists %s cascade', procedure_signature.signature);
  end loop;
end;
$drop_functions$;

drop table if exists moral_trade_private.compact_outflow_coverage_status_events cascade;
drop table if exists moral_trade_private.compact_outflow_coverage_observations cascade;
drop table if exists moral_trade_private.compact_outflow_event_metadata cascade;
drop table if exists moral_trade_private.compact_outflow_coverage_sources cascade;
drop table if exists moral_trade_private.compact_outflow_coverage_metadata cascade;
drop table if exists moral_trade_private.compact_outflow_adapter_registry cascade;

commit;
