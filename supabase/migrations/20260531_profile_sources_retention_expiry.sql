begin;

alter table public.profile_sources
  add column if not exists retention_expires_at timestamptz;

update public.profile_sources
set retention_expires_at = coalesce(
  retention_expires_at,
  imported_at + interval '90 days',
  created_at + interval '90 days',
  timezone('utc', now()) + interval '90 days'
)
where retention_expires_at is null;

alter table public.profile_sources
  alter column retention_expires_at set default (timezone('utc', now()) + interval '90 days'),
  alter column retention_expires_at set not null;

create index if not exists profile_sources_retention_expires_idx
on public.profile_sources (profile_id, retention_expires_at asc);

commit;
