\set ON_ERROR_STOP on
\pset tuples_only on
\pset format unaligned

select format(
  'create policy %I on %I.%I as %s for %s to %s%s%s;',
  '__mt_baseline_probe_' || substr(
    md5(schemaname || E'\x1f' || tablename || E'\x1f' || policyname),
    1,
    24
  ),
  schemaname,
  tablename,
  permissive,
  cmd,
  coalesce((
    select string_agg(
      case when role_name = 'public' then 'PUBLIC' else quote_ident(role_name) end,
      ', ' order by role_name
    )
    from unnest(roles) as role_name
  ), 'PUBLIC'),
  case when qual is null then '' else format(' using (%s)', qual) end,
  case when with_check is null then '' else format(' with check (%s)', with_check) end
)
from pg_policies
where schemaname in ('public', 'moral_trade_private')
order by schemaname, tablename, policyname;
