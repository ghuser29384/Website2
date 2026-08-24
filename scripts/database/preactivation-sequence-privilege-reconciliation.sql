with
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
sequences as (
  select
    c.oid as sequence_oid,
    n.nspname,
    c.relname,
    c.relowner,
    c.relacl
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname in ('public', 'moral_trade_private')
    and c.relkind = 'S'
    and not exists (
      select 1
      from pg_depend d
      where d.deptype = 'e'
        and d.classid = 'pg_class'::regclass
        and d.objid = c.oid
        and d.objsubid = 0
    )
),
sequence_privileges(privilege_name, privilege_order) as (
  values
    ('USAGE'::text, 1),
    ('SELECT'::text, 2),
    ('UPDATE'::text, 3)
),
public_sequence_privileges as (
  select s.sequence_oid, acl.privilege_type
  from sequences s
  cross join lateral aclexplode(coalesce(s.relacl, acldefault('S', s.relowner))) acl
  where acl.grantee = 0
),
statements as (
  select
    10 as phase,
    format('%I.%I', s.nspname, s.relname) as object_key,
    0 as role_order,
    0 as privilege_order,
    format(
      'REVOKE ALL PRIVILEGES ON SEQUENCE %I.%I FROM PUBLIC, anon, authenticated, service_role;',
      s.nspname,
      s.relname
    ) as statement
  from sequences s

  union all

  select
    20,
    format('%I.%I', s.nspname, s.relname),
    0,
    p.privilege_order,
    format(
      'GRANT %s ON SEQUENCE %I.%I TO PUBLIC;',
      p.privilege_name,
      s.nspname,
      s.relname
    )
  from sequences s
  join sequence_privileges p on exists (
    select 1
    from public_sequence_privileges granted
    where granted.sequence_oid = s.sequence_oid
      and granted.privilege_type = p.privilege_name
  )

  union all

  select
    30,
    format('%I.%I', s.nspname, s.relname),
    role.role_order,
    p.privilege_order,
    format(
      'GRANT %s ON SEQUENCE %I.%I TO %I;',
      p.privilege_name,
      s.nspname,
      s.relname,
      role.rolname
    )
  from sequences s
  cross join application_roles role
  cross join sequence_privileges p
  where has_sequence_privilege(role.role_oid, s.sequence_oid, p.privilege_name)
)
select statement
from statements
order by phase, object_key, role_order, privilege_order, statement;
