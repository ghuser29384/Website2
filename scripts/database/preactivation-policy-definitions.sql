\set ON_ERROR_STOP on
\pset tuples_only on
\pset format unaligned
\pset fieldsep '\t'

select
  schemaname,
  tablename,
  policyname,
  permissive,
  coalesce((
    select string_agg(role_name, ',' order by role_name)
    from unnest(roles) as role_name
  ), '') as sorted_roles,
  cmd,
  coalesce(qual, '') as using_expression,
  coalesce(with_check, '') as with_check_expression
from pg_policies
where schemaname in ('public', 'moral_trade_private')
order by schemaname, tablename, policyname;
