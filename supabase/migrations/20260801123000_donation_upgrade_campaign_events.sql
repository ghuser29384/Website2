-- Privacy-minimized campaign measurement for the Donation Upgrade billboard.
-- No IP address, user agent, email, profile id, or raw browser identifier is stored.

create table if not exists public.campaign_events (
  id uuid primary key default gen_random_uuid(),
  campaign text not null check (char_length(campaign) between 1 and 100),
  variant text not null check (variant in ('changes_where', 'changes_first', 'counterfactual_ea')),
  event_type text not null check (event_type in ('landing_view', 'create_click')),
  source text not null check (source = 'billboard'),
  medium text not null check (medium = 'out_of_home'),
  anonymous_id_hash text not null check (anonymous_id_hash ~ '^[0-9a-f]{64}$'),
  idempotency_key text not null unique,
  created_at timestamptz not null default now()
);

create index if not exists campaign_events_campaign_created_idx
  on public.campaign_events(campaign, created_at desc);

create index if not exists campaign_events_variant_event_idx
  on public.campaign_events(variant, event_type, created_at desc);

alter table public.campaign_events enable row level security;

-- No public or authenticated policies are intentionally created. The public API validates
-- a fixed allow-list and writes only through the server-side service client.
revoke all on table public.campaign_events from anon, authenticated;
grant select, insert, update, delete on table public.campaign_events to service_role;

create or replace view public.donation_upgrade_campaign_summary
with (security_invoker = true)
as
with unique_counts as (
  select
    campaign,
    variant,
    count(distinct anonymous_id_hash) filter (where event_type = 'landing_view')
      as unique_landing_views,
    count(distinct anonymous_id_hash) filter (where event_type = 'create_click')
      as unique_create_clicks,
    min(created_at) as first_seen_at,
    max(created_at) as last_seen_at
  from public.campaign_events
  where campaign = 'donation_upgrade_billboard_2026'
  group by campaign, variant
)
select
  campaign,
  variant,
  unique_landing_views,
  unique_create_clicks,
  case
    when unique_landing_views = 0 then 0
    else round(100.0 * unique_create_clicks / unique_landing_views, 2)
  end as click_through_percent,
  first_seen_at,
  last_seen_at
from unique_counts;

revoke all on table public.donation_upgrade_campaign_summary from anon, authenticated;
grant select on table public.donation_upgrade_campaign_summary to service_role;

comment on table public.campaign_events is
  'Privacy-minimized, idempotent campaign landing and CTA events. Raw identifiers and request metadata are not stored.';
comment on view public.donation_upgrade_campaign_summary is
  'Unique landing and create-click counts for the 2026 Donation Upgrade billboard campaign.';
