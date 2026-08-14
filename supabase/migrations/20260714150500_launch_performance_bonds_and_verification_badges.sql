begin;

create table if not exists public.performance_bonds (
  id uuid primary key default gen_random_uuid(),
  offer_id uuid not null references public.offers(id) on delete cascade,
  swap_id uuid,
  interest_id uuid references public.interests(id) on delete set null,
  party_id uuid not null references public.profiles(id) on delete cascade,
  counterparty_id uuid references public.profiles(id) on delete set null,
  side text not null check (side in ('offerer', 'taker')),
  enabled boolean not null default true,
  amount_cents bigint not null check (amount_cents >= 0),
  currency text not null default 'usd' check (char_length(currency) between 3 and 12),
  evidence_due_at timestamptz,
  challenge_window_days integer not null default 14 check (challenge_window_days in (7, 14, 30)),
  challenge_window_ends_at timestamptz,
  evidence_schema jsonb not null default '{}'::jsonb,
  additionality_statement text not null default '',
  no_trade_baseline text not null default '',
  forfeiture_rule text not null default 'neutral_release'
    check (forfeiture_rule in ('neutral_release', 'counterparty_release', 'split_release')),
  forfeiture_destination text not null default 'mpgf'
    check (forfeiture_destination in ('compromise_charity', 'mpgf', 'counterparty', 'split')),
  forfeiture_destination_id text,
  split_config jsonb not null default '{}'::jsonb,
  reviewer_policy text not null default '',
  status text not null default 'draft'
    check (status in (
      'not_enabled', 'draft', 'awaiting_funding', 'funded', 'active',
      'evidence_due', 'evidence_submitted', 'challenge_window_open',
      'accepted_by_counterparty', 'auto_refund_pending', 'refunded',
      'challenged', 'under_review', 'accepted_after_review',
      'rejected_after_review', 'forfeited', 'split_disbursed',
      'cancelled', 'expired'
    )),
  funding_status text not null default 'not_required'
    check (funding_status in (
      'not_required', 'awaiting_funding', 'payment_pending', 'funded',
      'refund_pending', 'refunded', 'release_pending', 'released', 'failed'
    )),
  payment_provider text not null default '',
  payment_intent_id text,
  counterparty_payout_consent boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  locked_at timestamptz,
  resolved_at timestamptz
);

create index if not exists performance_bonds_offer_id_idx
  on public.performance_bonds (offer_id);
create index if not exists performance_bonds_party_id_idx
  on public.performance_bonds (party_id);
create index if not exists performance_bonds_counterparty_id_idx
  on public.performance_bonds (counterparty_id)
  where counterparty_id is not null;
create index if not exists performance_bonds_status_idx
  on public.performance_bonds (status, updated_at desc);

alter table public.performance_bonds enable row level security;

grant select on public.performance_bonds to anon, authenticated;
grant insert, update, delete on public.performance_bonds to authenticated;

create policy "performance bond participants can read"
  on public.performance_bonds
  for select
  to authenticated
  using (auth.uid() = party_id or auth.uid() = counterparty_id);

create policy "performance bond parties can create"
  on public.performance_bonds
  for insert
  to authenticated
  with check (auth.uid() = party_id);

create policy "performance bond parties can update"
  on public.performance_bonds
  for update
  to authenticated
  using (auth.uid() = party_id)
  with check (auth.uid() = party_id);

create policy "performance bond parties can delete drafts"
  on public.performance_bonds
  for delete
  to authenticated
  using (auth.uid() = party_id and status in ('not_enabled', 'draft', 'cancelled'));

drop trigger if exists performance_bonds_set_updated_at on public.performance_bonds;
create trigger performance_bonds_set_updated_at
  before update on public.performance_bonds
  for each row execute function public.set_updated_at();

create table if not exists public.profile_verification_badges (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  badge_type text not null
    check (badge_type in (
      'identity_verified', 'organization_verified', 'payment_evidence_verified',
      'completion_reviewed', 'repeat_counterparty'
    )),
  status text not null default 'pending'
    check (status in ('pending', 'verified', 'rejected', 'revoked')),
  evidence_summary text not null default '',
  source text not null default '',
  reviewed_by uuid references public.profiles(id) on delete set null,
  reviewed_at timestamptz,
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists profile_verification_badges_profile_id_idx
  on public.profile_verification_badges (profile_id, status);
create index if not exists profile_verification_badges_public_idx
  on public.profile_verification_badges (status, expires_at)
  where status = 'verified';

alter table public.profile_verification_badges enable row level security;

grant select on public.profile_verification_badges to anon, authenticated;

create policy "verified profile badges are public"
  on public.profile_verification_badges
  for select
  to anon, authenticated
  using (status = 'verified' and (expires_at is null or expires_at > now()));

create policy "profile owners can inspect badge history"
  on public.profile_verification_badges
  for select
  to authenticated
  using (auth.uid() = profile_id);

drop trigger if exists profile_verification_badges_set_updated_at on public.profile_verification_badges;
create trigger profile_verification_badges_set_updated_at
  before update on public.profile_verification_badges
  for each row execute function public.set_updated_at();

commit;
