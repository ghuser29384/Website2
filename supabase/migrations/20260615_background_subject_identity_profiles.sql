create table if not exists public.background_subject_identity_profiles (
  id uuid primary key default gen_random_uuid(),
  participant_id uuid not null references public.profiles (id) on delete cascade,
  subject_kind text not null check (
    subject_kind in (
      'individual',
      'organisation',
      'collective',
      'automated_agent',
      'service_account',
      'partner_operator'
    )
  ),
  sanitized_subject_label text not null check (
    sanitized_subject_label in (
      'individual',
      'organisation',
      'collective',
      'automated helper',
      'service account',
      'partner/operator seat'
    )
  ),
  human_accountable_owner_id uuid references public.profiles (id) on delete set null,
  representative_authority_state text not null default 'not_required' check (
    representative_authority_state in (
      'not_required',
      'pending',
      'confirmed',
      'disputed',
      'expired',
      'revoked'
    )
  ),
  representative_authority_scope jsonb not null default '{}'::jsonb,
  automation_disclosure_state text not null default 'not_automated' check (
    automation_disclosure_state in (
      'not_automated',
      'disclosed_broadly',
      'pending_review',
      'blocked'
    )
  ),
  authority_expires_at timestamptz,
  subject_identity_version text not null,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (participant_id),
  constraint background_subject_identity_individual_shape_check check (
    (
      subject_kind = 'individual'
      and sanitized_subject_label = 'individual'
      and human_accountable_owner_id is null
      and representative_authority_state = 'not_required'
      and representative_authority_scope = '{}'::jsonb
      and automation_disclosure_state = 'not_automated'
      and authority_expires_at is null
    )
    or
    (
      subject_kind <> 'individual'
      and human_accountable_owner_id is not null
      and representative_authority_state <> 'not_required'
      and representative_authority_scope ? 'purposeCodes'
      and representative_authority_scope ? 'surfaces'
      and authority_expires_at is not null
    )
  ),
  constraint background_subject_identity_automation_shape_check check (
    (
      subject_kind in ('automated_agent', 'service_account')
      and automation_disclosure_state = 'disclosed_broadly'
    )
    or subject_kind not in ('automated_agent', 'service_account')
  )
);

create index if not exists background_subject_identity_participant_idx
on public.background_subject_identity_profiles (participant_id, subject_kind, updated_at desc);

create index if not exists background_subject_identity_authority_idx
on public.background_subject_identity_profiles (
  participant_id,
  representative_authority_state,
  automation_disclosure_state,
  authority_expires_at
);

drop trigger if exists background_subject_identity_set_updated_at on public.background_subject_identity_profiles;
create trigger background_subject_identity_set_updated_at
before update on public.background_subject_identity_profiles
for each row execute function public.set_updated_at();

alter table public.background_subject_identity_profiles enable row level security;

drop policy if exists "background_subject_identity_select_own" on public.background_subject_identity_profiles;
create policy "background_subject_identity_select_own"
on public.background_subject_identity_profiles
for select
to authenticated
using (participant_id = (select auth.uid()));

drop policy if exists "background_subject_identity_insert_own" on public.background_subject_identity_profiles;
create policy "background_subject_identity_insert_own"
on public.background_subject_identity_profiles
for insert
to authenticated
with check (participant_id = (select auth.uid()));

drop policy if exists "background_subject_identity_update_own" on public.background_subject_identity_profiles;
create policy "background_subject_identity_update_own"
on public.background_subject_identity_profiles
for update
to authenticated
using (participant_id = (select auth.uid()))
with check (participant_id = (select auth.uid()));

grant all on public.background_subject_identity_profiles to service_role;
