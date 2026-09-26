\set ON_ERROR_STOP on
\pset tuples_only on
\pset format unaligned
\pset fieldsep '\t'

with
application_schemas as (
  select unnest(array['public'::text, 'moral_trade_private'::text]) as nspname
),
roles as (
  select oid, rolname
  from pg_roles
  where rolname in ('anon', 'authenticated', 'service_role')
),
extension_members as (
  select d.classid, d.objid, d.objsubid
  from pg_depend d
  where d.deptype = 'e'
),
relations as (
  select
    'RELATION'::text as kind,
    quote_ident(n.nspname) || '.' || quote_ident(c.relname) as object_key,
    concat_ws(
      E'\x1f',
      c.relkind,
      c.relpersistence,
      c.relrowsecurity,
      c.relforcerowsecurity,
      coalesce(array_to_string(c.reloptions, ','), '')
    ) as definition
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  join application_schemas a on a.nspname = n.nspname
  where c.relkind in ('r', 'p', 'v', 'm', 'S', 'f')
    and not exists (
      select 1
      from extension_members e
      where e.classid = 'pg_class'::regclass
        and e.objid = c.oid
        and e.objsubid = 0
    )
),
columns as (
  select
    'COLUMN'::text as kind,
    quote_ident(n.nspname) || '.' || quote_ident(c.relname) || '.' || lpad(a.attnum::text, 5, '0') as object_key,
    concat_ws(
      E'\x1f',
      a.attname,
      format_type(a.atttypid, a.atttypmod),
      a.attnotnull,
      a.attidentity,
      a.attgenerated,
      coalesce(pg_get_expr(d.adbin, d.adrelid, true), '')
    ) as definition
  from pg_attribute a
  join pg_class c on c.oid = a.attrelid
  join pg_namespace n on n.oid = c.relnamespace
  join application_schemas s on s.nspname = n.nspname
  left join pg_attrdef d on d.adrelid = a.attrelid and d.adnum = a.attnum
  where c.relkind in ('r', 'p', 'v', 'm', 'f')
    and a.attnum > 0
    and not a.attisdropped
    and not exists (
      select 1
      from extension_members e
      where e.classid = 'pg_class'::regclass
        and e.objid = c.oid
        and e.objsubid = 0
    )
),
constraints as (
  select
    'CONSTRAINT'::text as kind,
    quote_ident(n.nspname) || '.' || quote_ident(c.relname) || '.' || quote_ident(con.conname) as object_key,
    concat_ws(E'\x1f', con.contype, con.convalidated, pg_get_constraintdef(con.oid, true)) as definition
  from pg_constraint con
  join pg_class c on c.oid = con.conrelid
  join pg_namespace n on n.oid = c.relnamespace
  join application_schemas s on s.nspname = n.nspname
  where not exists (
    select 1
    from extension_members e
    where e.classid = 'pg_constraint'::regclass
      and e.objid = con.oid
      and e.objsubid = 0
  )
),
indexes as (
  select
    'INDEX'::text as kind,
    quote_ident(n.nspname) || '.' || quote_ident(c.relname) as object_key,
    pg_get_indexdef(c.oid) as definition
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  join application_schemas s on s.nspname = n.nspname
  where c.relkind = 'i'
    and not exists (
      select 1
      from extension_members e
      where e.classid = 'pg_class'::regclass
        and e.objid = c.oid
        and e.objsubid = 0
    )
),
views as (
  select
    'VIEW'::text as kind,
    quote_ident(n.nspname) || '.' || quote_ident(c.relname) as object_key,
    pg_get_viewdef(c.oid, true) as definition
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  join application_schemas s on s.nspname = n.nspname
  where c.relkind in ('v', 'm')
    and not exists (
      select 1
      from extension_members e
      where e.classid = 'pg_class'::regclass
        and e.objid = c.oid
        and e.objsubid = 0
    )
),
sequences as (
  select
    'SEQUENCE'::text as kind,
    quote_ident(schemaname) || '.' || quote_ident(sequencename) as object_key,
    concat_ws(
      E'\x1f',
      data_type,
      start_value,
      min_value,
      max_value,
      increment_by,
      cycle,
      cache_size
    ) as definition
  from pg_sequences
  where schemaname in ('public', 'moral_trade_private')
),
functions as (
  select
    'FUNCTION'::text as kind,
    quote_ident(n.nspname) || '.' || quote_ident(p.proname) || '(' || pg_get_function_identity_arguments(p.oid) || ')' as object_key,
    concat_ws(
      E'\x1f',
      pg_get_function_result(p.oid),
      l.lanname,
      p.prosecdef,
      p.provolatile,
      p.proparallel,
      p.proisstrict,
      coalesce(array_to_string(p.proconfig, ','), ''),
      pg_get_functiondef(p.oid)
    ) as definition
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  join application_schemas s on s.nspname = n.nspname
  join pg_language l on l.oid = p.prolang
  where not exists (
    select 1
    from extension_members e
    where e.classid = 'pg_proc'::regclass
      and e.objid = p.oid
      and e.objsubid = 0
  )
),
types as (
  select
    'TYPE'::text as kind,
    quote_ident(n.nspname) || '.' || quote_ident(t.typname) as object_key,
    concat_ws(
      E'\x1f',
      t.typtype,
      t.typcategory,
      t.typnotnull,
      coalesce(pg_get_expr(t.typdefaultbin, 0, true), t.typdefault, ''),
      coalesce((
        select string_agg(e.enumlabel, ',' order by e.enumsortorder)
        from pg_enum e
        where e.enumtypid = t.oid
      ), '')
    ) as definition
  from pg_type t
  join pg_namespace n on n.oid = t.typnamespace
  join application_schemas s on s.nspname = n.nspname
  where t.typtype in ('e', 'd', 'c', 'r')
    and not exists (
      select 1
      from extension_members e
      where e.classid = 'pg_type'::regclass
        and e.objid = t.oid
        and e.objsubid = 0
    )
),
triggers as (
  select
    'TRIGGER'::text as kind,
    quote_ident(n.nspname) || '.' || quote_ident(c.relname) || '.' || quote_ident(t.tgname) as object_key,
    concat_ws(E'\x1f', t.tgenabled, pg_get_triggerdef(t.oid, true)) as definition
  from pg_trigger t
  join pg_class c on c.oid = t.tgrelid
  join pg_namespace n on n.oid = c.relnamespace
  join application_schemas s on s.nspname = n.nspname
  where not t.tgisinternal
    and not exists (
      select 1
      from extension_members e
      where e.classid = 'pg_trigger'::regclass
        and e.objid = t.oid
        and e.objsubid = 0
    )
),
cross_schema_triggers as (
  select
    'CROSS_SCHEMA_TRIGGER'::text as kind,
    quote_ident(n.nspname) || '.' || quote_ident(c.relname) || '.' || quote_ident(t.tgname) as object_key,
    concat_ws(E'\x1f', t.tgenabled, pg_get_triggerdef(t.oid, true), pg_get_functiondef(p.oid)) as definition
  from pg_trigger t
  join pg_class c on c.oid = t.tgrelid
  join pg_namespace n on n.oid = c.relnamespace
  join pg_proc p on p.oid = t.tgfoid
  join pg_namespace pn on pn.oid = p.pronamespace
  where not t.tgisinternal
    and n.nspname = 'auth'
    and c.relname = 'users'
    and pn.nspname in ('public', 'moral_trade_private')
),
policies as (
  select
    'POLICY'::text as kind,
    quote_ident(schemaname) || '.' || quote_ident(tablename) || '.' || quote_ident(policyname) as object_key,
    concat_ws(
      E'\x1f',
      permissive,
      array_to_string(roles, ','),
      cmd,
      coalesce(qual, ''),
      coalesce(with_check, '')
    ) as definition
  from pg_policies
  where schemaname in ('public', 'moral_trade_private')
),
schema_privileges as (
  select
    'SCHEMA_PRIVILEGE'::text as kind,
    quote_ident(n.nspname) || '.' || quote_ident(r.rolname) as object_key,
    concat_ws(
      E'\x1f',
      has_schema_privilege(r.oid, n.oid, 'USAGE'),
      has_schema_privilege(r.oid, n.oid, 'CREATE')
    ) as definition
  from pg_namespace n
  join application_schemas s on s.nspname = n.nspname
  cross join roles r
),
table_privileges as (
  select
    'TABLE_PRIVILEGE'::text as kind,
    quote_ident(n.nspname) || '.' || quote_ident(c.relname) || '.' || quote_ident(r.rolname) as object_key,
    concat_ws(
      E'\x1f',
      has_table_privilege(r.oid, c.oid, 'SELECT'),
      has_table_privilege(r.oid, c.oid, 'INSERT'),
      has_table_privilege(r.oid, c.oid, 'UPDATE'),
      has_table_privilege(r.oid, c.oid, 'DELETE'),
      has_table_privilege(r.oid, c.oid, 'TRUNCATE'),
      has_table_privilege(r.oid, c.oid, 'REFERENCES'),
      has_table_privilege(r.oid, c.oid, 'TRIGGER')
    ) as definition
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  join application_schemas s on s.nspname = n.nspname
  cross join roles r
  where c.relkind in ('r', 'p', 'v', 'm', 'S', 'f')
    and not exists (
      select 1
      from extension_members e
      where e.classid = 'pg_class'::regclass
        and e.objid = c.oid
        and e.objsubid = 0
    )
),
column_privileges as (
  select
    'COLUMN_PRIVILEGE'::text as kind,
    quote_ident(n.nspname) || '.' || quote_ident(c.relname) || '.' || quote_ident(a.attname) || '.' || quote_ident(r.rolname) as object_key,
    concat_ws(
      E'\x1f',
      has_column_privilege(r.oid, c.oid, a.attnum, 'SELECT'),
      has_column_privilege(r.oid, c.oid, a.attnum, 'INSERT'),
      has_column_privilege(r.oid, c.oid, a.attnum, 'UPDATE'),
      has_column_privilege(r.oid, c.oid, a.attnum, 'REFERENCES')
    ) as definition
  from pg_attribute a
  join pg_class c on c.oid = a.attrelid
  join pg_namespace n on n.oid = c.relnamespace
  join application_schemas s on s.nspname = n.nspname
  cross join roles r
  where c.relkind in ('r', 'p', 'v', 'm', 'f')
    and a.attnum > 0
    and not a.attisdropped
    and not exists (
      select 1
      from extension_members e
      where e.classid = 'pg_class'::regclass
        and e.objid = c.oid
        and e.objsubid = 0
    )
),
function_privileges as (
  select
    'FUNCTION_PRIVILEGE'::text as kind,
    quote_ident(n.nspname) || '.' || quote_ident(p.proname) || '(' || pg_get_function_identity_arguments(p.oid) || ').' || quote_ident(r.rolname) as object_key,
    has_function_privilege(r.oid, p.oid, 'EXECUTE')::text as definition
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  join application_schemas s on s.nspname = n.nspname
  cross join roles r
  where not exists (
    select 1
    from extension_members e
    where e.classid = 'pg_proc'::regclass
      and e.objid = p.oid
      and e.objsubid = 0
  )
),
default_table_privileges as (
  select
    'DEFAULT_TABLE_PRIVILEGE'::text as kind,
    quote_ident(n.nspname) || '.' || quote_ident(owner_role.rolname) || '.' || quote_ident(grantee_role.rolname) || '.' || acl.privilege_type as object_key,
    acl.is_grantable::text as definition
  from pg_default_acl d
  join pg_namespace n on n.oid = d.defaclnamespace
  join pg_roles owner_role on owner_role.oid = d.defaclrole
  cross join lateral aclexplode(d.defaclacl) acl
  join pg_roles grantee_role on grantee_role.oid = acl.grantee
  where n.nspname in ('public', 'moral_trade_private')
    and d.defaclobjtype = 'r'
    and grantee_role.rolname in ('anon', 'authenticated', 'service_role')
),
default_function_privileges as (
  select
    'DEFAULT_FUNCTION_PRIVILEGE'::text as kind,
    quote_ident(n.nspname) || '.' || quote_ident(owner_role.rolname) || '.' || quote_ident(grantee_role.rolname) || '.' || acl.privilege_type as object_key,
    acl.is_grantable::text as definition
  from pg_default_acl d
  join pg_namespace n on n.oid = d.defaclnamespace
  join pg_roles owner_role on owner_role.oid = d.defaclrole
  cross join lateral aclexplode(d.defaclacl) acl
  join pg_roles grantee_role on grantee_role.oid = acl.grantee
  where n.nspname in ('public', 'moral_trade_private')
    and d.defaclobjtype = 'f'
    and grantee_role.rolname in ('anon', 'authenticated', 'service_role')
),
all_objects as (
  select * from relations
  union all select * from columns
  union all select * from constraints
  union all select * from indexes
  union all select * from views
  union all select * from sequences
  union all select * from functions
  union all select * from types
  union all select * from triggers
  union all select * from cross_schema_triggers
  union all select * from policies
  union all select * from schema_privileges
  union all select * from table_privileges
  union all select * from column_privileges
  union all select * from function_privileges
  union all select * from default_table_privileges
  union all select * from default_function_privileges
)
select kind, object_key, md5(definition)
from all_objects
order by kind, object_key, md5(definition);
