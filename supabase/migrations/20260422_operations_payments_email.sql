-- Operational tables and columns for payments, reminders, admin review, and email delivery.

alter table public.agreement_payments drop constraint if exists agreement_payments_status_check;
alter table public.agreement_payments
add constraint agreement_payments_status_check check (
  status in (
    'draft',
    'checkout_created',
    'paid',
    'failed',
    'refund_requested',
    'refunded',
    'disputed',
    'cancelled'
  )
);

create table if not exists public.agreement_payment_schedules (
  id uuid primary key default gen_random_uuid(),
  agreement_id uuid not null references public.agreements (id) on delete cascade,
  payer_id uuid not null references public.profiles (id) on delete cascade,
  payee_id uuid not null references public.profiles (id) on delete cascade,
  amount_cents integer not null check (amount_cents > 0),
  currency text not null default 'usd' check (currency ~ '^[a-z]{3}$'),
  cadence_interval_value integer not null default 1 check (cadence_interval_value > 0),
  cadence_interval_unit text not null check (
    cadence_interval_unit in ('day', 'month', 'year', 'custom_days')
  ),
  next_due_at timestamptz not null,
  status text not null default 'active' check (status in ('active', 'paused', 'cancelled')),
  last_reminded_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  check (payer_id <> payee_id)
);

alter table public.email_outbox add column if not exists attempt_count integer not null default 0;
alter table public.email_outbox add column if not exists last_error text not null default '';
alter table public.saved_searches add column if not exists last_scanned_at timestamptz;

create index if not exists agreement_payment_schedules_agreement_id_idx
on public.agreement_payment_schedules (agreement_id, next_due_at asc);

create index if not exists agreement_payment_schedules_due_idx
on public.agreement_payment_schedules (status, next_due_at asc);

create index if not exists saved_searches_scan_idx
on public.saved_searches (status, cadence, last_scanned_at asc nulls first);

create index if not exists offers_text_search_idx on public.offers using gin (
  to_tsvector(
    'english',
    coalesce(offered_cause, '') || ' ' ||
    coalesce(requested_cause, '') || ' ' ||
    coalesce(offer_action, '') || ' ' ||
    coalesce(request_action, '') || ' ' ||
    coalesce(notes, '')
  )
);

create index if not exists wish_entries_text_search_idx on public.wish_entries using gin (
  to_tsvector(
    'english',
    coalesce(cause_area, '') || ' ' ||
    coalesce(title, '') || ' ' ||
    coalesce(body, '')
  )
);

drop trigger if exists agreement_payment_schedules_set_updated_at on public.agreement_payment_schedules;
create trigger agreement_payment_schedules_set_updated_at
before update on public.agreement_payment_schedules
for each row execute procedure public.set_updated_at();

alter table public.agreement_payment_schedules enable row level security;

drop policy if exists "agreement_payment_schedules_select_participants" on public.agreement_payment_schedules;
create policy "agreement_payment_schedules_select_participants"
on public.agreement_payment_schedules
for select
to authenticated
using (
  payer_id = (select auth.uid())
  or payee_id = (select auth.uid())
);

drop policy if exists "agreement_payment_schedules_insert_participants" on public.agreement_payment_schedules;
create policy "agreement_payment_schedules_insert_participants"
on public.agreement_payment_schedules
for insert
to authenticated
with check (
  payer_id = (select auth.uid())
  or payee_id = (select auth.uid())
);

drop policy if exists "agreement_payment_schedules_update_participants" on public.agreement_payment_schedules;
create policy "agreement_payment_schedules_update_participants"
on public.agreement_payment_schedules
for update
to authenticated
using (
  payer_id = (select auth.uid())
  or payee_id = (select auth.uid())
)
with check (
  payer_id = (select auth.uid())
  or payee_id = (select auth.uid())
);
