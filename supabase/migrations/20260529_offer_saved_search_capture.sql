alter table public.saved_searches
  add column if not exists filters_json jsonb not null default '{}'::jsonb,
  add column if not exists notify_on_live_match boolean not null default true,
  add column if not exists source_route text not null default '/dashboard';

comment on column public.saved_searches.filters_json is
  'Public browse filters captured from /offers saved searches. Must not contain private wishes, contact details, raw source notes, or personalized cart state.';
comment on column public.saved_searches.notify_on_live_match is
  'Whether this saved search should be considered for live-offer notification workflows.';
comment on column public.saved_searches.source_route is
  'Public route that produced the saved search, usually an /offers URL with public filters only.';
