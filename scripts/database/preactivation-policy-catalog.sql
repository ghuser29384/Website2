\set ON_ERROR_STOP on
\pset tuples_only on
\pset format unaligned
\pset fieldsep '\t'

select
  'POLICY'::text as kind,
  quote_ident(schemaname) || '.' || quote_ident(tablename) || '.' || quote_ident(policyname) as object_key,
  md5(
    concat_ws(
      E'\x1f',
      permissive,
      coalesce((
        select string_agg(role_name, ',' order by role_name)
        from unnest(roles) as role_name
      ), ''),
      cmd,
      coalesce(qual, ''),
      coalesce(with_check, '')
    )
  ) as definition_hash
from pg_policies
where schemaname in ('public', 'moral_trade_private')
order by kind, object_key, definition_hash;
