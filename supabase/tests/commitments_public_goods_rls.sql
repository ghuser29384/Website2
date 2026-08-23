\set ON_ERROR_STOP on

do $$
declare
  target_table text;
  expected_policy text;
begin
  foreach target_table in array array[
    'mpgf_public_goods_match_pools',
    'mpgf_public_goods_rounds',
    'mpgf_public_goods_campaigns',
    'mpgf_public_goods_allocation_results'
  ]
  loop
    expected_policy := target_table || '_public_read';

    if not exists (
      select 1
      from pg_class c
      join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public'
        and c.relname = target_table
        and c.relkind = 'r'
        and c.relrowsecurity
    ) then
      raise exception 'RLS is disabled on public.%', target_table;
    end if;

    if not has_table_privilege('anon', format('public.%I', target_table), 'SELECT')
       or not has_table_privilege('authenticated', format('public.%I', target_table), 'SELECT') then
      raise exception 'Required read privilege is missing on public.%', target_table;
    end if;

    if has_table_privilege('anon', format('public.%I', target_table), 'INSERT')
       or has_table_privilege('anon', format('public.%I', target_table), 'UPDATE')
       or has_table_privilege('anon', format('public.%I', target_table), 'DELETE')
       or has_table_privilege('authenticated', format('public.%I', target_table), 'INSERT')
       or has_table_privilege('authenticated', format('public.%I', target_table), 'UPDATE')
       or has_table_privilege('authenticated', format('public.%I', target_table), 'DELETE') then
      raise exception 'Direct client write privilege remains on public.%', target_table;
    end if;

    if 1 <> (
      select count(*)
      from pg_policies p
      where p.schemaname = 'public'
        and p.tablename = target_table
        and p.policyname = expected_policy
        and p.cmd = 'SELECT'
        and p.qual = 'true'
        and p.with_check is null
        and p.roles::text[] @> array['anon', 'authenticated']::text[]
    ) then
      raise exception 'Expected public-read policy is missing or drifted on public.%', target_table;
    end if;
  end loop;
end
$$;

select
  c.relname as table_name,
  c.relrowsecurity as rls_enabled,
  has_table_privilege('anon', format('public.%I', c.relname), 'SELECT') as anon_select,
  has_table_privilege('authenticated', format('public.%I', c.relname), 'SELECT') as authenticated_select,
  has_table_privilege('anon', format('public.%I', c.relname), 'INSERT,UPDATE,DELETE') as anon_write,
  has_table_privilege('authenticated', format('public.%I', c.relname), 'INSERT,UPDATE,DELETE') as authenticated_write
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relkind = 'r'
  and c.relname in (
    'mpgf_public_goods_match_pools',
    'mpgf_public_goods_rounds',
    'mpgf_public_goods_campaigns',
    'mpgf_public_goods_allocation_results'
  )
order by c.relname;
