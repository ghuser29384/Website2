create table if not exists public.background_intent_claims (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  claim_key text not null,
  claim_type text not null check (
    claim_type in (
      'ask_term',
      'capability_tag',
      'cause_priority',
      'constraint_flag',
      'missing_field',
      'offer_term',
      'profile_state',
      'source_permission',
      'trade_preference',
      'uncertainty_item'
    )
  ),
  claim_value text not null default '',
  claim_version text not null default 'background-intent-claims-v1',
  confidence_band text not null default 'medium' check (confidence_band in ('high', 'medium', 'low')),
  source_kind text not null default 'wish_profile' check (
    source_kind in (
      'wish_profile',
      'profile_synthesis',
      'source_connection',
      'source_summary',
      'profile_interview'
    )
  ),
  source_record_id uuid,
  surface_label text not null default '',
  preview_safe boolean not null default false,
  explanation text not null default '',
  status text not null default 'active' check (status in ('active', 'superseded', 'withdrawn')),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (profile_id, claim_key)
);

create index if not exists background_intent_claims_profile_status_idx
on public.background_intent_claims (profile_id, status, claim_type, updated_at desc);

create index if not exists background_intent_claims_preview_idx
on public.background_intent_claims (preview_safe, claim_type, updated_at desc)
where status = 'active';

-- PostgreSQL rejects the former wish-profile GIN expression because
-- array_to_string is STABLE rather than IMMUTABLE. The canonical rebuilt schema
-- intentionally omits that invalid index as well.

drop trigger if exists background_intent_claims_set_updated_at on public.background_intent_claims;
create trigger background_intent_claims_set_updated_at
before update on public.background_intent_claims
for each row execute function public.set_updated_at();

alter table public.background_intent_claims enable row level security;

grant select, insert, update, delete on public.background_intent_claims to authenticated;
grant all on public.background_intent_claims to service_role;

drop policy if exists "background_intent_claims_select_own" on public.background_intent_claims;
create policy "background_intent_claims_select_own"
on public.background_intent_claims
for select
to authenticated
using (profile_id = (select auth.uid()));

drop policy if exists "background_intent_claims_insert_own" on public.background_intent_claims;
create policy "background_intent_claims_insert_own"
on public.background_intent_claims
for insert
to authenticated
with check (profile_id = (select auth.uid()));

drop policy if exists "background_intent_claims_update_own" on public.background_intent_claims;
create policy "background_intent_claims_update_own"
on public.background_intent_claims
for update
to authenticated
using (profile_id = (select auth.uid()))
with check (profile_id = (select auth.uid()));

drop policy if exists "background_intent_claims_delete_own" on public.background_intent_claims;
create policy "background_intent_claims_delete_own"
on public.background_intent_claims
for delete
to authenticated
using (profile_id = (select auth.uid()));
