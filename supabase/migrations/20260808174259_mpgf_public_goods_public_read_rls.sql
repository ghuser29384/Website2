-- Enable row-level security on the four public moral-public-goods summary tables.
-- Preserve the existing anonymous/authenticated read surface while removing all
-- direct client write privileges. Service-role and database-owner paths remain unchanged.

begin;

revoke insert, update, delete, truncate, references, trigger on table
  public.mpgf_public_goods_match_pools,
  public.mpgf_public_goods_rounds,
  public.mpgf_public_goods_campaigns,
  public.mpgf_public_goods_allocation_results
from anon, authenticated;

grant select on table
  public.mpgf_public_goods_match_pools,
  public.mpgf_public_goods_rounds,
  public.mpgf_public_goods_campaigns,
  public.mpgf_public_goods_allocation_results
to anon, authenticated;

alter table public.mpgf_public_goods_match_pools enable row level security;
alter table public.mpgf_public_goods_rounds enable row level security;
alter table public.mpgf_public_goods_campaigns enable row level security;
alter table public.mpgf_public_goods_allocation_results enable row level security;

drop policy if exists mpgf_public_goods_match_pools_public_read on public.mpgf_public_goods_match_pools;
create policy mpgf_public_goods_match_pools_public_read
on public.mpgf_public_goods_match_pools
for select
to anon, authenticated
using (true);

drop policy if exists mpgf_public_goods_rounds_public_read on public.mpgf_public_goods_rounds;
create policy mpgf_public_goods_rounds_public_read
on public.mpgf_public_goods_rounds
for select
to anon, authenticated
using (true);

drop policy if exists mpgf_public_goods_campaigns_public_read on public.mpgf_public_goods_campaigns;
create policy mpgf_public_goods_campaigns_public_read
on public.mpgf_public_goods_campaigns
for select
to anon, authenticated
using (true);

drop policy if exists mpgf_public_goods_allocation_results_public_read on public.mpgf_public_goods_allocation_results;
create policy mpgf_public_goods_allocation_results_public_read
on public.mpgf_public_goods_allocation_results
for select
to anon, authenticated
using (true);

do $$
declare
  target_table text;
begin
  foreach target_table in array array[
    'mpgf_public_goods_match_pools',
    'mpgf_public_goods_rounds',
    'mpgf_public_goods_campaigns',
    'mpgf_public_goods_allocation_results'
  ]
  loop
    if not exists (
      select 1
      from pg_class c
      join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public'
        and c.relname = target_table
        and c.relkind = 'r'
        and c.relrowsecurity
    ) then
      raise exception 'RLS remains disabled on public.%', target_table;
    end if;

    if not has_table_privilege('anon', format('public.%I', target_table), 'SELECT')
       or not has_table_privilege('authenticated', format('public.%I', target_table), 'SELECT') then
      raise exception 'Required public read privilege is missing on public.%', target_table;
    end if;

    if has_table_privilege('anon', format('public.%I', target_table), 'INSERT')
       or has_table_privilege('anon', format('public.%I', target_table), 'UPDATE')
       or has_table_privilege('anon', format('public.%I', target_table), 'DELETE')
       or has_table_privilege('authenticated', format('public.%I', target_table), 'INSERT')
       or has_table_privilege('authenticated', format('public.%I', target_table), 'UPDATE')
       or has_table_privilege('authenticated', format('public.%I', target_table), 'DELETE') then
      raise exception 'A direct client write privilege remains on public.%', target_table;
    end if;
  end loop;
end
$$;

commit;
