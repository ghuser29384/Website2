alter table public.wish_profiles
  add column if not exists sensitive_ciphertexts jsonb not null default '{}'::jsonb,
  add column if not exists sensitive_encryption_version text not null default '';

alter table public.wish_entries
  add column if not exists body_ciphertext text not null default '',
  add column if not exists body_encryption_version text not null default '';

alter table public.profile_sources
  add column if not exists sensitive_ciphertexts jsonb not null default '{}'::jsonb,
  add column if not exists sensitive_encryption_version text not null default '';

alter table public.source_connections
  add column if not exists sensitive_ciphertexts jsonb not null default '{}'::jsonb,
  add column if not exists sensitive_encryption_version text not null default '';

alter table public.profile_syntheses
  add column if not exists sensitive_ciphertexts jsonb not null default '{}'::jsonb,
  add column if not exists sensitive_encryption_version text not null default '';

create index if not exists wish_profiles_sensitive_encryption_idx
  on public.wish_profiles (sensitive_encryption_version, updated_at desc)
  where sensitive_encryption_version <> '';

create index if not exists wish_entries_body_encryption_idx
  on public.wish_entries (body_encryption_version, updated_at desc)
  where body_encryption_version <> '';

create index if not exists profile_sources_sensitive_encryption_idx
  on public.profile_sources (sensitive_encryption_version, updated_at desc)
  where sensitive_encryption_version <> '';

create index if not exists source_connections_sensitive_encryption_idx
  on public.source_connections (sensitive_encryption_version, updated_at desc)
  where sensitive_encryption_version <> '';

create index if not exists profile_syntheses_sensitive_encryption_idx
  on public.profile_syntheses (sensitive_encryption_version, updated_at desc)
  where sensitive_encryption_version <> '';
