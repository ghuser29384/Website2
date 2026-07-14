-- Production v1 pledge performance bonds for personal pledge swaps.
-- Payment custody is represented by a provider-neutral ledger and funding status.
-- Public copy must not claim escrow-backed custody unless a real provider is wired and verified.

create table if not exists public.performance_bonds (
  id uuid primary key default gen_random_uuid(),
  offer_id uuid not null references public.offers (id) on delete cascade,
  swap_id uuid references public.agreements (id) on delete set null,
  interest_id uuid references public.interests (id) on delete set null,
  party_id uuid not null references public.profiles (id) on delete cascade,
  counterparty_id uuid references public.profiles (id) on delete set null,
  side text not null check (side in ('offerer', 'taker')),
  enabled boolean not null default true,
  amount_cents integer not null check (amount_cents >= 0),
  currency text not null default 'USD' check (currency ~ '^[A-Z]{3}$'),
  evidence_due_at timestamptz,
  challenge_window_days integer not null default 7 check (challenge_window_days in (7, 14, 30)),
  challenge_window_ends_at timestamptz,
  evidence_schema jsonb not null default '{}'::jsonb,
  additionality_statement text not null default '',
  no_trade_baseline text not null default '',
  forfeiture_rule text not null default 'neutral_release' check (
    forfeiture_rule in ('neutral_release', 'counterparty_release', 'split_release')
  ),
  forfeiture_destination text not null default 'compromise_charity' check (
    forfeiture_destination in ('compromise_charity', 'mpgf', 'counterparty', 'split')
  ),
  forfeiture_destination_id text references public.registered_charities (id) on delete restrict,
  split_config jsonb not null default '{"counterpartyPercent":0,"neutralCausePercent":50,"mpgfPercent":50}'::jsonb,
  reviewer_policy text not null default 'Counterparty may accept or challenge; platform arbitration if disputed',
  status text not null default 'draft' check (
    status in (
      'not_enabled',
      'draft',
      'awaiting_funding',
      'funded',
      'active',
      'evidence_due',
      'evidence_submitted',
      'challenge_window_open',
      'accepted_by_counterparty',
      'auto_refund_pending',
      'refunded',
      'challenged',
      'under_review',
      'accepted_after_review',
      'rejected_after_review',
      'forfeited',
      'split_disbursed',
      'cancelled',
      'expired'
    )
  ),
  funding_status text not null default 'awaiting_funding' check (
    funding_status in (
      'not_required',
      'awaiting_funding',
      'payment_pending',
      'funded',
      'refund_pending',
      'refunded',
      'release_pending',
      'released',
      'failed'
    )
  ),
  payment_provider text not null default 'manual_review',
  payment_intent_id text,
  counterparty_payout_consent boolean not null default false,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  locked_at timestamptz,
  resolved_at timestamptz,
  check (
    enabled = false
    or (
      amount_cents > 0
      and evidence_due_at is not null
      and challenge_window_days in (7, 14, 30)
      and length(trim(additionality_statement)) > 0
      and length(trim(no_trade_baseline)) > 0
      and jsonb_typeof(evidence_schema) = 'object'
      and length(coalesce(evidence_schema ->> 'actionToProve', '')) >= 12
      and length(coalesce(evidence_schema ->> 'acceptedEvidenceTypes', '')) >= 12
      and length(coalesce(evidence_schema ->> 'minimumDetail', '')) >= 12
      and length(coalesce(evidence_schema ->> 'reviewStandard', '')) >= 12
    )
  ),
  check (
    forfeiture_destination <> 'counterparty'
    or counterparty_payout_consent = true
  ),
  check (
    forfeiture_destination <> 'split'
    or (
      ((split_config ->> 'counterpartyPercent')::integer)
      + ((split_config ->> 'neutralCausePercent')::integer)
      + ((split_config ->> 'mpgfPercent')::integer)
    ) = 100
  )
);

create table if not exists public.bond_evidence (
  id uuid primary key default gen_random_uuid(),
  bond_id uuid not null references public.performance_bonds (id) on delete cascade,
  submitted_by uuid not null references public.profiles (id) on delete cascade,
  submitted_at timestamptz not null default timezone('utc', now()),
  evidence_text text not null default '',
  evidence_urls text[] not null default '{}',
  attachments jsonb not null default '[]'::jsonb,
  visibility text not null default 'counterparty_only' check (
    visibility in ('counterparty_only', 'platform_reviewer_only', 'public_proof', 'mixed_redacted')
  ),
  redaction_notes text not null default '',
  attestation boolean not null default false,
  status text not null default 'submitted' check (
    status in (
      'submitted',
      'accepted_by_counterparty',
      'challenged',
      'more_evidence_requested',
      'accepted_after_review',
      'rejected_after_review'
    )
  ),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  check (attestation = true),
  check (length(trim(evidence_text)) > 0 or cardinality(evidence_urls) > 0)
);

create table if not exists public.bond_challenges (
  id uuid primary key default gen_random_uuid(),
  bond_id uuid not null references public.performance_bonds (id) on delete cascade,
  challenged_by uuid not null references public.profiles (id) on delete cascade,
  challenged_at timestamptz not null default timezone('utc', now()),
  reason text not null,
  specific_objection text not null,
  requested_outcome text not null default 'platform_review',
  bad_faith_flag boolean not null default false,
  status text not null default 'open' check (
    status in (
      'open',
      'under_review',
      'accepted',
      'rejected',
      'more_evidence_requested',
      'closed',
      'bad_faith_flagged'
    )
  ),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.bond_adjudications (
  id uuid primary key default gen_random_uuid(),
  bond_id uuid not null references public.performance_bonds (id) on delete cascade,
  challenge_id uuid references public.bond_challenges (id) on delete set null,
  reviewer_id uuid not null references public.profiles (id) on delete restrict,
  decision text not null check (decision in ('accept', 'reject', 'request_more_evidence')),
  decision_reason text not null,
  decided_at timestamptz not null default timezone('utc', now()),
  appeal_allowed boolean not null default false,
  appeal_deadline timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  check (length(trim(decision_reason)) > 0)
);

create table if not exists public.bond_ledger_entries (
  id uuid primary key default gen_random_uuid(),
  bond_id uuid not null references public.performance_bonds (id) on delete cascade,
  type text not null check (type in ('fund', 'refund', 'release', 'split_release', 'adjustment')),
  amount_cents integer not null check (amount_cents >= 0),
  currency text not null default 'USD' check (currency ~ '^[A-Z]{3}$'),
  destination_type text not null check (
    destination_type in ('party', 'counterparty', 'compromise_charity', 'mpgf', 'platform_manual_review')
  ),
  destination_id text,
  status text not null default 'pending' check (
    status in (
      'pending',
      'completed',
      'not_required',
      'awaiting_funding',
      'payment_pending',
      'funded',
      'refund_pending',
      'refunded',
      'release_pending',
      'released',
      'failed'
    )
  ),
  idempotency_key text not null,
  created_at timestamptz not null default timezone('utc', now()),
  unique (bond_id, idempotency_key)
);

create table if not exists public.performance_bond_audit_events (
  id uuid primary key default gen_random_uuid(),
  bond_id uuid not null references public.performance_bonds (id) on delete cascade,
  actor_id uuid references public.profiles (id) on delete set null,
  actor_role text not null check (actor_role in ('party', 'counterparty', 'reviewer', 'system')),
  event_type text not null,
  from_status text not null,
  to_status text not null,
  reason text not null,
  metadata jsonb not null default '{}'::jsonb,
  idempotency_key text not null,
  created_at timestamptz not null default timezone('utc', now()),
  unique (bond_id, idempotency_key)
);

drop trigger if exists performance_bonds_set_updated_at on public.performance_bonds;
create trigger performance_bonds_set_updated_at
before update on public.performance_bonds
for each row execute procedure public.set_updated_at();

drop trigger if exists bond_evidence_set_updated_at on public.bond_evidence;
create trigger bond_evidence_set_updated_at
before update on public.bond_evidence
for each row execute procedure public.set_updated_at();

drop trigger if exists bond_challenges_set_updated_at on public.bond_challenges;
create trigger bond_challenges_set_updated_at
before update on public.bond_challenges
for each row execute procedure public.set_updated_at();

create index if not exists performance_bonds_offer_id_idx on public.performance_bonds (offer_id);
create index if not exists performance_bonds_swap_id_idx on public.performance_bonds (swap_id);
create index if not exists performance_bonds_interest_id_idx on public.performance_bonds (interest_id);
create index if not exists performance_bonds_party_id_idx on public.performance_bonds (party_id);
create index if not exists performance_bonds_counterparty_id_idx on public.performance_bonds (counterparty_id);
create index if not exists performance_bonds_status_idx on public.performance_bonds (status);
create index if not exists performance_bonds_funding_status_idx on public.performance_bonds (funding_status);
create index if not exists performance_bonds_evidence_due_idx on public.performance_bonds (evidence_due_at);
create index if not exists performance_bonds_review_queue_idx
  on public.performance_bonds (status, evidence_due_at, updated_at)
  where status in ('challenged', 'under_review', 'rejected_after_review', 'evidence_due');
create unique index if not exists performance_bonds_offerer_unique_idx
  on public.performance_bonds (offer_id, side)
  where side = 'offerer';
create unique index if not exists performance_bonds_taker_interest_unique_idx
  on public.performance_bonds (interest_id, side)
  where interest_id is not null and side = 'taker';

create index if not exists bond_evidence_bond_idx on public.bond_evidence (bond_id, submitted_at desc);
create index if not exists bond_evidence_submitted_by_idx on public.bond_evidence (submitted_by, submitted_at desc);
create index if not exists bond_challenges_bond_status_idx on public.bond_challenges (bond_id, status, challenged_at desc);
create index if not exists bond_challenges_review_queue_idx
  on public.bond_challenges (status, challenged_at)
  where status in ('open', 'under_review');
create index if not exists bond_adjudications_bond_idx on public.bond_adjudications (bond_id, decided_at desc);
create index if not exists bond_ledger_entries_bond_idx on public.bond_ledger_entries (bond_id, created_at desc);
create index if not exists performance_bond_audit_events_bond_idx on public.performance_bond_audit_events (bond_id, created_at desc);

alter table public.performance_bonds enable row level security;
alter table public.bond_evidence enable row level security;
alter table public.bond_challenges enable row level security;
alter table public.bond_adjudications enable row level security;
alter table public.bond_ledger_entries enable row level security;
alter table public.performance_bond_audit_events enable row level security;

drop policy if exists "performance_bonds_select_visible" on public.performance_bonds;
create policy "performance_bonds_select_visible"
on public.performance_bonds
for select
to anon, authenticated
using (
  exists (
    select 1
    from public.offers
    where offers.id = performance_bonds.offer_id
      and offers.status = 'open'
  )
  or party_id = (select auth.uid())
  or counterparty_id = (select auth.uid())
  or exists (
    select 1
    from public.agreements
    where agreements.id = performance_bonds.swap_id
      and (
        agreements.proposer_id = (select auth.uid())
        or agreements.responder_id = (select auth.uid())
      )
  )
);

drop policy if exists "performance_bonds_insert_own_draft" on public.performance_bonds;
create policy "performance_bonds_insert_own_draft"
on public.performance_bonds
for insert
to authenticated
with check (
  party_id = (select auth.uid())
  and locked_at is null
  and status = 'draft'
);

drop policy if exists "performance_bonds_update_own_unlocked_draft" on public.performance_bonds;
create policy "performance_bonds_update_own_unlocked_draft"
on public.performance_bonds
for update
to authenticated
using (
  party_id = (select auth.uid())
  and locked_at is null
  and status = 'draft'
)
with check (
  party_id = (select auth.uid())
  and locked_at is null
  and status = 'draft'
);

drop policy if exists "bond_evidence_select_participants" on public.bond_evidence;
create policy "bond_evidence_select_participants"
on public.bond_evidence
for select
to authenticated
using (
  exists (
    select 1
    from public.performance_bonds
    where performance_bonds.id = bond_evidence.bond_id
      and (
        performance_bonds.party_id = (select auth.uid())
        or performance_bonds.counterparty_id = (select auth.uid())
      )
  )
);

drop policy if exists "bond_evidence_insert_party" on public.bond_evidence;
create policy "bond_evidence_insert_party"
on public.bond_evidence
for insert
to authenticated
with check (
  submitted_by = (select auth.uid())
  and exists (
    select 1
    from public.performance_bonds
    where performance_bonds.id = bond_evidence.bond_id
      and performance_bonds.party_id = (select auth.uid())
  )
);

drop policy if exists "bond_challenges_select_participants" on public.bond_challenges;
create policy "bond_challenges_select_participants"
on public.bond_challenges
for select
to authenticated
using (
  exists (
    select 1
    from public.performance_bonds
    where performance_bonds.id = bond_challenges.bond_id
      and (
        performance_bonds.party_id = (select auth.uid())
        or performance_bonds.counterparty_id = (select auth.uid())
      )
  )
);

drop policy if exists "bond_challenges_insert_counterparty" on public.bond_challenges;
create policy "bond_challenges_insert_counterparty"
on public.bond_challenges
for insert
to authenticated
with check (
  challenged_by = (select auth.uid())
  and exists (
    select 1
    from public.performance_bonds
    where performance_bonds.id = bond_challenges.bond_id
      and performance_bonds.counterparty_id = (select auth.uid())
  )
);

drop policy if exists "bond_adjudications_select_participants" on public.bond_adjudications;
create policy "bond_adjudications_select_participants"
on public.bond_adjudications
for select
to authenticated
using (
  exists (
    select 1
    from public.performance_bonds
    where performance_bonds.id = bond_adjudications.bond_id
      and (
        performance_bonds.party_id = (select auth.uid())
        or performance_bonds.counterparty_id = (select auth.uid())
      )
  )
);

drop policy if exists "bond_ledger_entries_select_participants" on public.bond_ledger_entries;
create policy "bond_ledger_entries_select_participants"
on public.bond_ledger_entries
for select
to authenticated
using (
  exists (
    select 1
    from public.performance_bonds
    where performance_bonds.id = bond_ledger_entries.bond_id
      and (
        performance_bonds.party_id = (select auth.uid())
        or performance_bonds.counterparty_id = (select auth.uid())
      )
  )
);

drop policy if exists "performance_bond_audit_events_select_participants" on public.performance_bond_audit_events;
create policy "performance_bond_audit_events_select_participants"
on public.performance_bond_audit_events
for select
to authenticated
using (
  exists (
    select 1
    from public.performance_bonds
    where performance_bonds.id = performance_bond_audit_events.bond_id
      and (
        performance_bonds.party_id = (select auth.uid())
        or performance_bonds.counterparty_id = (select auth.uid())
      )
  )
);
