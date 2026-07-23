create unique index if not exists source_connections_profile_provider_label_unique
  on public.source_connections (profile_id, provider, label);
