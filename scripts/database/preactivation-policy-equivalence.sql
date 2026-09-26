\set ON_ERROR_STOP on
\pset tuples_only on
\pset format unaligned
\pset fieldsep '\t'

with
actual as (
  select
    schemaname,
    tablename,
    policyname,
    '__mt_baseline_probe_' || substr(
      md5(schemaname || E'\x1f' || tablename || E'\x1f' || policyname),
      1,
      24
    ) as expected_probe_name,
    permissive,
    coalesce((
      select string_agg(role_name, ',' order by role_name)
      from unnest(roles) as role_name
    ), '') as sorted_roles,
    cmd,
    coalesce(qual, '') as qual,
    coalesce(with_check, '') as with_check
  from pg_policies
  where schemaname in ('public', 'moral_trade_private')
    and policyname not like '__mt_baseline_probe_%'
),
probes as (
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
    coalesce(qual, '') as qual,
    coalesce(with_check, '') as with_check
  from pg_policies
  where schemaname in ('public', 'moral_trade_private')
    and policyname like '__mt_baseline_probe_%'
),
missing_or_different as (
  select
    'missing_or_different_probe'::text as reason,
    a.schemaname,
    a.tablename,
    a.policyname as source_policy,
    a.expected_probe_name as probe_policy,
    concat_ws(
      E'\x1f',
      a.permissive,
      a.sorted_roles,
      a.cmd,
      a.qual,
      a.with_check
    ) as source_definition,
    concat_ws(
      E'\x1f',
      p.permissive,
      p.sorted_roles,
      p.cmd,
      p.qual,
      p.with_check
    ) as probe_definition
  from actual a
  left join probes p
    on p.schemaname = a.schemaname
   and p.tablename = a.tablename
   and p.policyname = a.expected_probe_name
  where p.policyname is null
     or a.permissive is distinct from p.permissive
     or a.sorted_roles is distinct from p.sorted_roles
     or a.cmd is distinct from p.cmd
     or a.qual is distinct from p.qual
     or a.with_check is distinct from p.with_check
),
unexpected_probes as (
  select
    'unexpected_probe'::text as reason,
    p.schemaname,
    p.tablename,
    null::text as source_policy,
    p.policyname as probe_policy,
    ''::text as source_definition,
    concat_ws(
      E'\x1f',
      p.permissive,
      p.sorted_roles,
      p.cmd,
      p.qual,
      p.with_check
    ) as probe_definition
  from probes p
  left join actual a
    on a.schemaname = p.schemaname
   and a.tablename = p.tablename
   and a.expected_probe_name = p.policyname
  where a.policyname is null
)
select * from missing_or_different
union all
select * from unexpected_probes
order by reason, schemaname, tablename, source_policy, probe_policy;
