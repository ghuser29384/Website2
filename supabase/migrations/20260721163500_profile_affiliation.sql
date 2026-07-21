alter table public.profiles
  add column if not exists affiliation text not null default '';

alter table public.profiles
  drop constraint if exists profiles_affiliation_length;

alter table public.profiles
  add constraint profiles_affiliation_length
  check (char_length(affiliation) <= 160);

comment on column public.profiles.affiliation is
  'Optional company, organization, or university supplied by the profile owner.';
