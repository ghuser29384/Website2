-- Optional baseline credibility bond pilot for donation-offset offers.
-- No private payment provider identifiers are stored here; payment details remain outside
-- public offer and transparency/audit rows.

alter table public.donation_offset_offers
  add column if not exists offer_expires_at timestamptz,
  add column if not exists baseline_bond_enabled boolean not null default false,
  add column if not exists baseline_bond_amount_cents integer not null default 0,
  add column if not exists baseline_bond_currency text not null default 'USD',
  add column if not exists baseline_bond_forfeit_destination_id text references public.registered_charities (id) on delete restrict,
  add column if not exists baseline_bond_evidence_due_at timestamptz,
  add column if not exists baseline_bond_evidence_standard text not null default '',
  add column if not exists baseline_bond_evidence_url text not null default '',
  add column if not exists baseline_bond_status text not null default 'none',
  add column if not exists baseline_bond_reviewed_by uuid references public.profiles (id) on delete set null,
  add column if not exists baseline_bond_reviewed_at timestamptz,
  add column if not exists baseline_bond_review_notes text not null default '',
  add column if not exists baseline_bond_appeal_window_ends_at timestamptz;

alter table public.donation_offset_offers
  drop constraint if exists donation_offset_offers_baseline_bond_amount_check;
alter table public.donation_offset_offers
  add constraint donation_offset_offers_baseline_bond_amount_check
  check (baseline_bond_amount_cents >= 0);

alter table public.donation_offset_offers
  drop constraint if exists donation_offset_offers_baseline_bond_currency_check;
alter table public.donation_offset_offers
  add constraint donation_offset_offers_baseline_bond_currency_check
  check (baseline_bond_currency ~ '^[A-Z]{3}$');

alter table public.donation_offset_offers
  drop constraint if exists donation_offset_offers_baseline_bond_status_check;
alter table public.donation_offset_offers
  add constraint donation_offset_offers_baseline_bond_status_check
  check (
    baseline_bond_status in (
      'none',
      'pending_payment',
      'posted',
      'refunded_after_match',
      'evidence_due',
      'evidence_submitted',
      'refunded_after_evidence',
      'forfeited',
      'cancelled_by_review'
    )
  );

alter table public.donation_offset_offers
  drop constraint if exists donation_offset_offers_baseline_bond_enabled_fields_check;
alter table public.donation_offset_offers
  add constraint donation_offset_offers_baseline_bond_enabled_fields_check
  check (
    baseline_bond_enabled = false
    or (
      baseline_bond_amount_cents > 0
      and baseline_bond_forfeit_destination_id is not null
      and baseline_bond_evidence_due_at is not null
      and offer_expires_at is not null
      and length(trim(baseline_bond_evidence_standard)) >= 20
      and baseline_bond_status <> 'none'
    )
  );

alter table public.donation_offset_offers
  drop constraint if exists donation_offset_offers_baseline_bond_timing_check;
alter table public.donation_offset_offers
  add constraint donation_offset_offers_baseline_bond_timing_check
  check (
    baseline_bond_enabled = false
    or baseline_bond_evidence_due_at > offer_expires_at
  );

alter table public.donation_offset_offers
  drop constraint if exists donation_offset_offers_baseline_bond_forfeit_destination_check;
alter table public.donation_offset_offers
  add constraint donation_offset_offers_baseline_bond_forfeit_destination_check
  check (
    baseline_bond_forfeit_destination_id is null
    or baseline_bond_forfeit_destination_id not in (
      'platform-operating-account',
      'moraltrade-operating-account',
      'moral-trade-operating-account'
    )
  );

create index if not exists donation_offset_offers_baseline_bond_status_idx
  on public.donation_offset_offers (baseline_bond_status, offer_expires_at)
  where baseline_bond_enabled = true;
