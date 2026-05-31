-- Structured connector permissions for background networking.

alter table public.source_connections
  add column if not exists allowed_field_keys text[] not null default '{}',
  add column if not exists retention_expires_at timestamptz,
  add column if not exists ai_shadow_mode_allowed boolean not null default false,
  add column if not exists raw_ingestion_allowed boolean not null default false;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'source_connections_allowed_field_keys_check'
  ) then
    alter table public.source_connections
      add constraint source_connections_allowed_field_keys_check
      check (
        allowed_field_keys <@ array[
          'cause_priorities',
          'capability_tags',
          'offer_ask_terms',
          'verification_preferences',
          'availability_context',
          'safety_constraints'
        ]::text[]
      );
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'source_connections_raw_ingestion_disabled_check'
  ) then
    alter table public.source_connections
      add constraint source_connections_raw_ingestion_disabled_check
      check (raw_ingestion_allowed = false);
  end if;
end
$$;

create index if not exists source_connections_retention_expires_idx
on public.source_connections (retention_expires_at asc)
where retention_expires_at is not null;

create index if not exists source_connections_ai_shadow_idx
on public.source_connections (profile_id, ai_shadow_mode_allowed, updated_at desc);
