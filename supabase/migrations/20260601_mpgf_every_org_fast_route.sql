begin;

create table if not exists public.mpgf_every_org_partner_events (
  id text primary key,
  round_id text not null references public.mpgf_public_goods_rounds (id) on delete cascade,
  campaign_id text references public.mpgf_public_goods_campaigns (id) on delete set null,
  conditional_pledge_id text references public.mpgf_conditional_pledges (id) on delete set null,
  pledge_intent_id text references public.mpgf_pledge_intents (id) on delete set null,
  contributor_ref_hash text check (contributor_ref_hash is null or contributor_ref_hash ~ '^sha256:[0-9a-f]{64}$'),
  partner_donation_id_hash text check (partner_donation_id_hash is null or partner_donation_id_hash ~ '^sha256:[0-9a-f]{64}$'),
  charge_id_hash text not null unique check (charge_id_hash ~ '^sha256:[0-9a-f]{64}$'),
  nonprofit_ref_hash text check (nonprofit_ref_hash is null or nonprofit_ref_hash ~ '^sha256:[0-9a-f]{64}$'),
  amount_cents bigint not null check (amount_cents >= 0),
  net_amount_cents bigint check (net_amount_cents is null or net_amount_cents >= 0),
  currency text not null default 'USD' check (currency ~ '^[A-Z]{3}$'),
  frequency text,
  donation_date timestamptz,
  status text not null check (status in ('recorded', 'needs_review', 'rejected')),
  structure_verified boolean not null default false,
  webhook_verified boolean not null default false,
  auto_creates_contribution_evidence boolean not null default false,
  evidence_review_state text not null check (evidence_review_state in ('pending_review', 'needs_review', 'rejected')),
  review_required_before_counting boolean not null default true check (review_required_before_counting = true),
  final_payout_authorized boolean not null default false check (final_payout_authorized = false),
  payload_hash text not null check (payload_hash ~ '^sha256:[0-9a-f]{64}$'),
  append_only_hash text not null check (append_only_hash ~ '^sha256:[0-9a-f]{64}$'),
  received_at timestamptz not null default timezone('utc', now()),
  created_at timestamptz not null default timezone('utc', now()),
  constraint mpgf_every_org_events_recorded_requires_verified check (
    status <> 'recorded'
    or (
      structure_verified = true
      and webhook_verified = true
      and partner_donation_id_hash is not null
      and campaign_id is not null
      and amount_cents > 0
    )
  )
);

create index if not exists mpgf_every_org_partner_events_round_campaign_idx
  on public.mpgf_every_org_partner_events (round_id, campaign_id, status, received_at desc);

create index if not exists mpgf_every_org_partner_events_pledge_idx
  on public.mpgf_every_org_partner_events (conditional_pledge_id, pledge_intent_id, received_at desc);

alter table public.mpgf_every_org_partner_events enable row level security;

drop policy if exists "mpgf_every_org_partner_events_service_only" on public.mpgf_every_org_partner_events;
create policy "mpgf_every_org_partner_events_service_only"
on public.mpgf_every_org_partner_events
for all
to service_role
using (true)
with check (true);

grant all on public.mpgf_every_org_partner_events to service_role;

comment on table public.mpgf_every_org_partner_events is
  'Append-only MPGF Every.org partner webhook imports. Dedupe by hashed chargeId, map partner metadata to round/campaign/pledge when present, auto-create reviewable contribution evidence, and never authorize final payout by webhook alone.';

comment on column public.mpgf_every_org_partner_events.charge_id_hash is
  'Hashed Every.org chargeId used as the idempotency key. Raw charge IDs, donor names, donor emails, private notes, and public testimony are not stored in this table.';

comment on column public.mpgf_every_org_partner_events.partner_donation_id_hash is
  'Hashed Donate Link partnerDonationId used to connect redirect-pending state with partner webhook import without exposing private donor references.';

commit;
