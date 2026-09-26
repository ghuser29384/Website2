with
application_schemas as (
  select n.oid as schema_oid, n.nspname, n.nspowner, n.nspacl
  from pg_namespace n
  where n.nspname in ('public', 'moral_trade_private')
),
application_roles as (
  select r.oid as role_oid, r.rolname, role_order
  from (
    values
      ('anon'::text, 1),
      ('authenticated'::text, 2),
      ('service_role'::text, 3)
  ) wanted(rolname, role_order)
  join pg_roles r using (rolname)
),
relations as (
  select
    c.oid as relation_oid,
    n.nspname,
    c.relname,
    c.relowner,
    c.relacl
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname in ('public', 'moral_trade_private')
    and c.relkind in ('r', 'p', 'v', 'm', 'f')
    and not exists (
      select 1
      from pg_depend d
      where d.deptype = 'e'
        and d.classid = 'pg_class'::regclass
        and d.objid = c.oid
        and d.objsubid = 0
    )
),
functions as (
  select
    p.oid as function_oid,
    n.nspname,
    p.proname,
    p.proowner,
    p.proacl,
    pg_get_function_identity_arguments(p.oid) as identity_arguments
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  where n.nspname in ('public', 'moral_trade_private')
    and not exists (
      select 1
      from pg_depend d
      where d.deptype = 'e'
        and d.classid = 'pg_proc'::regclass
        and d.objid = p.oid
        and d.objsubid = 0
    )
),
table_privileges(privilege_name, privilege_order) as (
  values
    ('SELECT'::text, 1),
    ('INSERT'::text, 2),
    ('UPDATE'::text, 3),
    ('DELETE'::text, 4),
    ('TRUNCATE'::text, 5),
    ('REFERENCES'::text, 6),
    ('TRIGGER'::text, 7),
    ('MAINTAIN'::text, 8)
),
column_privileges(privilege_name, privilege_order) as (
  values
    ('SELECT'::text, 1),
    ('INSERT'::text, 2),
    ('UPDATE'::text, 3),
    ('REFERENCES'::text, 4)
),
schema_privileges(privilege_name, privilege_order) as (
  values
    ('USAGE'::text, 1),
    ('CREATE'::text, 2)
),
public_schema_privileges as (
  select s.schema_oid, acl.privilege_type
  from application_schemas s
  cross join lateral aclexplode(coalesce(s.nspacl, acldefault('n', s.nspowner))) acl
  where acl.grantee = 0
),
public_relation_privileges as (
  select r.relation_oid, acl.privilege_type
  from relations r
  cross join lateral aclexplode(coalesce(r.relacl, acldefault('r', r.relowner))) acl
  where acl.grantee = 0
),
public_column_privileges as (
  select a.attrelid as relation_oid, a.attnum, acl.privilege_type
  from pg_attribute a
  join relations r on r.relation_oid = a.attrelid
  cross join lateral aclexplode(a.attacl) acl
  where a.attnum > 0
    and not a.attisdropped
    and acl.grantee = 0
),
public_function_privileges as (
  select f.function_oid, acl.privilege_type
  from functions f
  cross join lateral aclexplode(coalesce(f.proacl, acldefault('f', f.proowner))) acl
  where acl.grantee = 0
),
relation_columns as (
  select
    r.relation_oid,
    string_agg(quote_ident(a.attname), ', ' order by a.attnum) as all_columns
  from relations r
  join pg_attribute a on a.attrelid = r.relation_oid
  where a.attnum > 0
    and not a.attisdropped
  group by r.relation_oid
),
statements as (
  select
    10 as phase,
    format('%I', s.nspname) as object_key,
    0 as role_order,
    0 as privilege_order,
    format(
      'REVOKE ALL PRIVILEGES ON SCHEMA %I FROM PUBLIC, anon, authenticated, service_role;',
      s.nspname
    ) as statement
  from application_schemas s

  union all

  select
    20,
    format('%I', s.nspname),
    0,
    p.privilege_order,
    format('GRANT %s ON SCHEMA %I TO PUBLIC;', p.privilege_name, s.nspname)
  from application_schemas s
  join schema_privileges p on exists (
    select 1
    from public_schema_privileges granted
    where granted.schema_oid = s.schema_oid
      and granted.privilege_type = p.privilege_name
  )

  union all

  select
    30,
    format('%I', s.nspname),
    r.role_order,
    p.privilege_order,
    format('GRANT %s ON SCHEMA %I TO %I;', p.privilege_name, s.nspname, r.rolname)
  from application_schemas s
  cross join application_roles r
  cross join schema_privileges p
  where has_schema_privilege(r.role_oid, s.schema_oid, p.privilege_name)

  union all

  select
    40,
    format('%I.%I', r.nspname, r.relname),
    0,
    0,
    format(
      'REVOKE ALL PRIVILEGES ON TABLE %I.%I FROM PUBLIC, anon, authenticated, service_role;',
      r.nspname,
      r.relname
    )
  from relations r

  union all

  select
    50,
    format('%I.%I', r.nspname, r.relname),
    0,
    p.privilege_order,
    format(
      'REVOKE %s (%s) ON TABLE %I.%I FROM PUBLIC, anon, authenticated, service_role;',
      p.privilege_name,
      cols.all_columns,
      r.nspname,
      r.relname
    )
  from relations r
  join relation_columns cols using (relation_oid)
  cross join column_privileges p

  union all

  select
    60,
    format('%I.%I', r.nspname, r.relname),
    0,
    p.privilege_order,
    format('GRANT %s ON TABLE %I.%I TO PUBLIC;', p.privilege_name, r.nspname, r.relname)
  from relations r
  join table_privileges p on exists (
    select 1
    from public_relation_privileges granted
    where granted.relation_oid = r.relation_oid
      and granted.privilege_type = p.privilege_name
  )

  union all

  select
    70,
    format('%I.%I', rel.nspname, rel.relname),
    role.role_order,
    p.privilege_order,
    format(
      'GRANT %s ON TABLE %I.%I TO %I;',
      p.privilege_name,
      rel.nspname,
      rel.relname,
      role.rolname
    )
  from relations rel
  cross join application_roles role
  cross join table_privileges p
  where has_table_privilege(role.role_oid, rel.relation_oid, p.privilege_name)

  union all

  select
    80,
    format('%I.%I', rel.nspname, rel.relname),
    0,
    p.privilege_order,
    format(
      'GRANT %s (%s) ON TABLE %I.%I TO PUBLIC;',
      p.privilege_name,
      string_agg(quote_ident(a.attname), ', ' order by a.attnum),
      rel.nspname,
      rel.relname
    )
  from relations rel
  join pg_attribute a on a.attrelid = rel.relation_oid
  cross join column_privileges p
  where a.attnum > 0
    and not a.attisdropped
    and exists (
      select 1
      from public_column_privileges granted
      where granted.relation_oid = rel.relation_oid
        and granted.attnum = a.attnum
        and granted.privilege_type = p.privilege_name
    )
    and not exists (
      select 1
      from public_relation_privileges granted
      where granted.relation_oid = rel.relation_oid
        and granted.privilege_type = p.privilege_name
    )
  group by rel.relation_oid, rel.nspname, rel.relname, p.privilege_name, p.privilege_order

  union all

  select
    90,
    format('%I.%I', rel.nspname, rel.relname),
    role.role_order,
    p.privilege_order,
    format(
      'GRANT %s (%s) ON TABLE %I.%I TO %I;',
      p.privilege_name,
      string_agg(quote_ident(a.attname), ', ' order by a.attnum),
      rel.nspname,
      rel.relname,
      role.rolname
    )
  from relations rel
  join pg_attribute a on a.attrelid = rel.relation_oid
  cross join application_roles role
  cross join column_privileges p
  where a.attnum > 0
    and not a.attisdropped
    and not has_table_privilege(role.role_oid, rel.relation_oid, p.privilege_name)
    and has_column_privilege(role.role_oid, rel.relation_oid, a.attnum, p.privilege_name)
  group by
    rel.relation_oid,
    rel.nspname,
    rel.relname,
    role.rolname,
    role.role_order,
    p.privilege_name,
    p.privilege_order

  union all

  select
    100,
    format('%I.%I(%s)', f.nspname, f.proname, f.identity_arguments),
    0,
    0,
    format(
      'REVOKE ALL PRIVILEGES ON FUNCTION %I.%I(%s) FROM PUBLIC, anon, authenticated, service_role;',
      f.nspname,
      f.proname,
      f.identity_arguments
    )
  from functions f

  union all

  select
    110,
    format('%I.%I(%s)', f.nspname, f.proname, f.identity_arguments),
    0,
    1,
    format(
      'GRANT EXECUTE ON FUNCTION %I.%I(%s) TO PUBLIC;',
      f.nspname,
      f.proname,
      f.identity_arguments
    )
  from functions f
  where exists (
    select 1
    from public_function_privileges granted
    where granted.function_oid = f.function_oid
      and granted.privilege_type = 'EXECUTE'
  )

  union all

  select
    120,
    format('%I.%I(%s)', f.nspname, f.proname, f.identity_arguments),
    role.role_order,
    1,
    format(
      'GRANT EXECUTE ON FUNCTION %I.%I(%s) TO %I;',
      f.nspname,
      f.proname,
      f.identity_arguments,
      role.rolname
    )
  from functions f
  cross join application_roles role
  where has_function_privilege(role.role_oid, f.function_oid, 'EXECUTE')
)
select statement
from statements
order by phase, object_key, role_order, privilege_order, statement;
