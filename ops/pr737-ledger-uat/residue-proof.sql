\set ON_ERROR_STOP on
\pset tuples_only on
\pset format unaligned

select 'public_compact_relations=' || count(*)
from pg_catalog.pg_class c
join pg_catalog.pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relname like 'mpgf_public_goods_%'
  and c.relkind in ('r', 'p', 'v', 'm');

select 'public_compact_functions=' || count(*)
from pg_catalog.pg_proc p
join pg_catalog.pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and (
    p.proname like 'mpgf_public_goods_%'
    or p.proname like 'get_mpgf_public_goods_%'
    or p.proname like 'freeze_mpgf_public_goods_%'
  );

select 'private_ledger_relations=' || count(*)
from pg_catalog.pg_class c
join pg_catalog.pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'moral_trade_private'
  and c.relname like 'compact_outflow_%'
  and c.relkind in ('r', 'p', 'v', 'm');

select 'private_ledger_functions=' || count(*)
from pg_catalog.pg_proc p
join pg_catalog.pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'moral_trade_private'
  and (
    p.proname like 'compact_outflow_%'
    or p.proname like 'assign_compact_outflow_%'
    or p.proname like 'reject_compact_outflow_%'
    or p.proname like 'require_compact_outflow_%'
  );

select 'fixture_users=' || count(*)
from auth.users
where id in (
  '712a0000-0000-4000-8000-000000000001'::uuid,
  '712b0000-0000-4000-8000-000000000002'::uuid,
  '712c0000-0000-4000-8000-000000000003'::uuid
)
  or email like 'compact-uat712-%@qa.invalid';

select 'fixture_profiles=' || count(*)
from public.profiles
where id in (
  '712a0000-0000-4000-8000-000000000001'::uuid,
  '712b0000-0000-4000-8000-000000000002'::uuid,
  '712c0000-0000-4000-8000-000000000003'::uuid
)
  or email like 'compact-uat712-%@qa.invalid';
