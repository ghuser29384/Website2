begin;

create table if not exists public.mpgf_public_goods_procedural_badges (
  id text primary key,
  round_id text not null references public.mpgf_public_goods_rounds (id) on delete cascade,
  campaign_id text references public.mpgf_public_goods_campaigns (id) on delete set null,
  profile_id uuid references public.profiles (id) on delete set null,
  user_ref_hash text not null check (user_ref_hash ~ '^sha256:[0-9a-f]{64}$'),
  badge_type text not null check (
    badge_type in (
      'verified_supporter',
      'fulfilled_pledge',
      'sponsor_contributor',
      'appeal_cleared_contribution',
      'early_supporter'
    )
  ),
  source_record_hash text not null check (source_record_hash ~ '^sha256:[0-9a-f]{64}$'),
  status text not null default 'verified' check (status in ('verified', 'pending_review', 'revoked')),
  evidence_summary text not null,
  no_score_issued boolean not null default true check (no_score_issued = true),
  issued_at timestamptz not null,
  created_at timestamptz not null default timezone('utc', now()),
  unique (round_id, user_ref_hash, badge_type, source_record_hash)
);

create index if not exists mpgf_public_goods_procedural_badges_round_idx
  on public.mpgf_public_goods_procedural_badges (round_id, badge_type, status, issued_at desc);

create index if not exists mpgf_public_goods_procedural_badges_profile_idx
  on public.mpgf_public_goods_procedural_badges (profile_id, badge_type, status);

alter table public.mpgf_public_goods_procedural_badges enable row level security;

drop policy if exists "mpgf_public_goods_procedural_badges_public_select"
on public.mpgf_public_goods_procedural_badges;
create policy "mpgf_public_goods_procedural_badges_public_select"
on public.mpgf_public_goods_procedural_badges
for select
to anon, authenticated
using (status = 'verified');

grant select on public.mpgf_public_goods_procedural_badges to anon, authenticated;
grant all on public.mpgf_public_goods_procedural_badges to service_role;

comment on table public.mpgf_public_goods_procedural_badges is
  'Record-based MPGF procedural badges: verified supporter, fulfilled pledge, sponsor contributor, appeal-cleared contribution, and early supporter. These badges issue no moral karma, score, token, or transferable governance weight.';

comment on column public.mpgf_public_goods_procedural_badges.user_ref_hash is
  'Hashed participant reference for public badge summaries; raw profile, donor, payment, and provider identifiers are private by default.';

commit;
