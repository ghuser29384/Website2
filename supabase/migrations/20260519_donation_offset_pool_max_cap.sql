alter table public.donation_offset_pools add column if not exists maximum_cap_cents integer not null default 0;

update public.donation_offset_pools
set maximum_cap_cents = greatest(maximum_cap_cents, assurance_minimum_cents, 1000000)
where maximum_cap_cents = 0;

alter table public.donation_offset_pools drop constraint if exists donation_offset_pools_maximum_cap_cents_check;
alter table public.donation_offset_pools
add constraint donation_offset_pools_maximum_cap_cents_check
check (maximum_cap_cents >= 0);
