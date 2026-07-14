create table if not exists public.mpgf_conditional_trade_intents (
  id text primary key,
  budget_id text not null references public.mpgf_user_budgets (id) on delete cascade,
  support_stance_id text not null references public.mpgf_support_stances (id) on delete cascade,
  round_id text not null references public.mpgf_public_goods_rounds (id) on delete cascade,
  campaign_id text not null references public.mpgf_public_goods_campaigns (id) on delete cascade,
  profile_id uuid references public.profiles (id) on delete set null,
  user_ref_hash text not null check (user_ref_hash ~ '^sha256:[0-9a-f]{64}$'),
  intent_state text not null default 'active' check (
    intent_state in ('active', 'inactive_nonallocatable', 'canceled', 'captured', 'released', 'failed')
  ),
  authorization_state text not null default 'not_authorized_no_capture_preview' check (
    authorization_state in (
      'not_authorized_no_capture_preview',
      'authorization_pending_after_clear',
      'authorized_after_clear',
      'captured',
      'released',
      'failed'
    )
  ),
  amount_cents bigint not null check (amount_cents > 0),
  max_exposure_cents bigint not null check (max_exposure_cents >= amount_cents),
  min_counterparty_volume_cents bigint not null check (min_counterparty_volume_cents > 0),
  acceptable_counter_bucket_ids text[] not null check (cardinality(acceptable_counter_bucket_ids) > 0),
  condition_accepted boolean not null default false check (condition_accepted = true),
  fallback_rule text not null check (fallback_rule in ('carry_forward', 'reroute', 'release_hold')),
  rulebook_hash_at_consent text check (
    rulebook_hash_at_consent is null or rulebook_hash_at_consent ~ '^sha256:[0-9a-f]{64}$'
  ),
  terms_snapshot_hash text not null check (terms_snapshot_hash ~ '^sha256:[0-9a-f]{64}$'),
  conditional_intent_policy text not null default 'simple_mode_canonical_conditional_trade_intents_no_capture_v1',
  payment_capture_allowed boolean not null default false check (payment_capture_allowed = false),
  final_review_disclosure_required boolean not null default true check (final_review_disclosure_required = true),
  no_global_moral_ranking boolean not null default true check (no_global_moral_ranking = true),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (round_id, budget_id, campaign_id)
);

create index if not exists mpgf_conditional_trade_intents_round_campaign_idx
  on public.mpgf_conditional_trade_intents (round_id, campaign_id, intent_state, authorization_state);

create index if not exists mpgf_conditional_trade_intents_profile_idx
  on public.mpgf_conditional_trade_intents (profile_id, created_at desc);

alter table public.mpgf_conditional_trade_intents enable row level security;

drop policy if exists "mpgf_conditional_trade_intents_select_own" on public.mpgf_conditional_trade_intents;
create policy "mpgf_conditional_trade_intents_select_own"
on public.mpgf_conditional_trade_intents
for select
to authenticated
using (profile_id = (select auth.uid()));

drop policy if exists "mpgf_conditional_trade_intents_write_own" on public.mpgf_conditional_trade_intents;
create policy "mpgf_conditional_trade_intents_write_own"
on public.mpgf_conditional_trade_intents
for all
to authenticated
using (profile_id = (select auth.uid()))
with check (profile_id = (select auth.uid()));

grant select, insert, update on public.mpgf_conditional_trade_intents to authenticated;
grant all on public.mpgf_conditional_trade_intents to service_role;

comment on table public.mpgf_conditional_trade_intents is
  'No-capture Common Ground Budget conditional intent setup records. Rows bind explicit caps, accepted counterparty buckets, min counterparty volume, fallback rule, terms hash, and final-review disclosure before any later authorization path can use them.';
