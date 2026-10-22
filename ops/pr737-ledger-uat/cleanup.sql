\set ON_ERROR_STOP on

-- The isolated-QA preflight proves these namespaces contain no Compact or ledger
-- objects before this run. Drop the authoritative-ledger layer first so the
-- existing Compact cleanup can remove its base relations without dependency drift.
do $cleanup$
declare
  routine record;
  relation record;
begin
  for routine in
    select n.nspname, p.proname, pg_catalog.pg_get_function_identity_arguments(p.oid) as args
    from pg_catalog.pg_proc p
    join pg_catalog.pg_namespace n on n.oid = p.pronamespace
    where (
      n.nspname = 'moral_trade_private'
      and (
        p.proname like 'compact_outflow_%'
        or p.proname like 'assign_compact_outflow_%'
        or p.proname like 'reject_compact_outflow_%'
        or p.proname like 'require_compact_outflow_%'
      )
    ) or (
      n.nspname = 'public'
      and (
        p.proname like '%compact_outflow%'
        or p.proname like 'freeze_mpgf_public_goods_financial_cycle%'
      )
    )
  loop
    execute pg_catalog.format(
      'drop function if exists %I.%I(%s) cascade',
      routine.nspname,
      routine.proname,
      routine.args
    );
  end loop;

  for relation in
    select n.nspname, c.relname, c.relkind
    from pg_catalog.pg_class c
    join pg_catalog.pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'moral_trade_private'
      and c.relname like 'compact_outflow_%'
      and c.relkind in ('r', 'p', 'v', 'm')
  loop
    if relation.relkind = 'v' then
      execute pg_catalog.format('drop view if exists %I.%I cascade', relation.nspname, relation.relname);
    elsif relation.relkind = 'm' then
      execute pg_catalog.format('drop materialized view if exists %I.%I cascade', relation.nspname, relation.relname);
    else
      execute pg_catalog.format('drop table if exists %I.%I cascade', relation.nspname, relation.relname);
    end if;
  end loop;
end;
$cleanup$;

\ir ../pr663-uat712/cleanup.sql

-- Remove any ledger-hardened public wrappers or relations that the base cleanup
-- does not know about. The preflight baseline makes this prefix-bounded cleanup
-- exclusive to objects created by this UAT.
do $cleanup$
declare
  routine record;
  relation record;
begin
  for routine in
    select n.nspname, p.proname, pg_catalog.pg_get_function_identity_arguments(p.oid) as args
    from pg_catalog.pg_proc p
    join pg_catalog.pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and (
        p.proname like 'mpgf_public_goods_%'
        or p.proname like 'get_mpgf_public_goods_%'
        or p.proname like 'freeze_mpgf_public_goods_%'
      )
  loop
    execute pg_catalog.format(
      'drop function if exists %I.%I(%s) cascade',
      routine.nspname,
      routine.proname,
      routine.args
    );
  end loop;

  for relation in
    select n.nspname, c.relname, c.relkind
    from pg_catalog.pg_class c
    join pg_catalog.pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relname like 'mpgf_public_goods_%'
      and c.relkind in ('r', 'p', 'v', 'm')
  loop
    if relation.relkind = 'v' then
      execute pg_catalog.format('drop view if exists %I.%I cascade', relation.nspname, relation.relname);
    elsif relation.relkind = 'm' then
      execute pg_catalog.format('drop materialized view if exists %I.%I cascade', relation.nspname, relation.relname);
    else
      execute pg_catalog.format('drop table if exists %I.%I cascade', relation.nspname, relation.relname);
    end if;
  end loop;
end;
$cleanup$;
