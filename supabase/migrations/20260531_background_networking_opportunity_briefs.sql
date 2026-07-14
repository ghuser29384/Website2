create table if not exists public.background_opportunity_briefs (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  candidate_profile_id uuid references public.profiles (id) on delete set null,
  match_id uuid references public.match_suggestions (id) on delete set null,
  title text not null default 'Opportunity brief',
  confidence_band text not null default 'Exploratory' check (confidence_band in ('High', 'Moderate', 'Tentative', 'Exploratory')),
  factor_codes text[] not null default '{}',
  why_text text not null default '',
  next_step_type text not null default 'review_profile' check (next_step_type in ('answer_questions', 'request_intro_packet', 'request_detail', 'review_profile', 'mute_or_dismiss')),
  hidden_fields_notice text not null default 'Exact wishes, private asks, contact details, raw source notes, and sensitive constraints stay hidden until a purpose-bound grant or mutual consent.',
  reveal_consequence_notice text not null default 'Requesting more detail queues a reviewed, field-bound step; it does not send contact details or introduce anyone automatically.',
  status text not null default 'open' check (status in ('open', 'opened', 'dismissed', 'muted', 'packet_requested', 'expired')),
  expires_at timestamptz not null default (timezone('utc', now()) + interval '14 days'),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (profile_id, match_id)
);

create table if not exists public.background_intro_packets (
  id uuid primary key default gen_random_uuid(),
  opportunity_brief_id uuid references public.background_opportunity_briefs (id) on delete set null,
  match_id uuid references public.match_suggestions (id) on delete set null,
  requester_profile_id uuid not null references public.profiles (id) on delete cascade,
  counterparty_profile_id uuid references public.profiles (id) on delete set null,
  purpose text not null default '',
  requester_answers jsonb not null default '{}'::jsonb,
  mutual_questions text[] not null default '{}',
  requested_field_keys text[] not null default '{}',
  reveal_capsule text not null default '',
  review_state text not null default 'requested' check (review_state in ('draft', 'requested', 'under_review', 'approved', 'changes_requested', 'declined', 'sent')),
  reviewer_notes text not null default '',
  sla_due_at timestamptz not null default (timezone('utc', now()) + interval '24 hours'),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  check (counterparty_profile_id is null or requester_profile_id <> counterparty_profile_id)
);

create table if not exists public.background_grant_receipts (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  counterparty_id uuid references public.profiles (id) on delete set null,
  grant_id uuid references public.privacy_grants (id) on delete set null,
  receipt_kind text not null default 'disclosure_grant' check (receipt_kind in ('disclosure_grant', 'source_summary', 'connector_consent')),
  purpose text not null default '',
  field_keys text[] not null default '{}',
  audience_stage text not null default 'consent' check (audience_stage in ('registry', 'consent', 'introduced')),
  status text not null default 'active' check (status in ('active', 'revoked', 'expired')),
  expires_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.background_source_summaries (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  source_connection_id uuid references public.source_connections (id) on delete set null,
  consent_receipt_id uuid references public.background_grant_receipts (id) on delete set null,
  source_type text not null default 'manual' check (source_type in ('manual', 'social', 'blog', 'email', 'calendar', 'chat_history', 'search_profile', 'other')),
  label text not null,
  summary_text text not null default '',
  allowed_field_keys text[] not null default '{}',
  purpose text not null default '',
  retention_expires_at timestamptz not null,
  status text not null default 'active' check (status in ('draft', 'reviewed', 'active', 'expired', 'revoked')),
  raw_ingestion_allowed boolean not null default false check (raw_ingestion_allowed = false),
  sensitive_ciphertexts jsonb not null default '{}'::jsonb,
  sensitive_encryption_version text not null default '',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.background_profile_interview_answers (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  question_key text not null,
  question_text text not null default '',
  answer text not null default '',
  uncertainty_flags text[] not null default '{}',
  broad_preview_update text not null default '',
  private_intent_update text not null default '',
  status text not null default 'saved' check (status in ('draft', 'saved', 'dismissed')),
  sensitive_ciphertexts jsonb not null default '{}'::jsonb,
  sensitive_encryption_version text not null default '',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (profile_id, question_key)
);

create table if not exists public.background_collective_policies (
  id uuid primary key default gen_random_uuid(),
  collective_id uuid not null unique references public.collectives (id) on delete cascade,
  approval_threshold smallint not null default 1 check (approval_threshold between 1 and 20),
  approver_roles text[] not null default array['owner', 'admin']::text[],
  max_auto_grant_stage text not null default 'consent' check (max_auto_grant_stage in ('registry', 'consent', 'introduced')),
  group_public_preview text not null default '',
  default_retention_days smallint not null default 90 check (default_retention_days in (30, 90, 180, 365)),
  disclosure_rules jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.background_mute_rules (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  candidate_profile_id uuid references public.profiles (id) on delete set null,
  factor_code_pattern text not null default '',
  cause_pair text[] not null default '{}',
  status text not null default 'active' check (status in ('active', 'expired', 'revoked')),
  muted_until timestamptz not null default (timezone('utc', now()) + interval '30 days'),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (profile_id, candidate_profile_id, factor_code_pattern)
);

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'background_source_summaries_allowed_field_keys_check'
  ) then
    alter table public.background_source_summaries
      add constraint background_source_summaries_allowed_field_keys_check
      check (
        allowed_field_keys <@ array[
          'cause_priorities',
          'capability_tags',
          'offer_ask_terms',
          'verification_preferences',
          'availability_context',
          'safety_constraints'
        ]::text[]
      );
  end if;
end
$$;

create index if not exists background_opportunity_briefs_profile_status_idx
on public.background_opportunity_briefs (profile_id, status, expires_at asc, created_at desc);

create index if not exists background_opportunity_briefs_match_idx
on public.background_opportunity_briefs (match_id, profile_id);

create index if not exists background_intro_packets_requester_idx
on public.background_intro_packets (requester_profile_id, review_state, created_at desc);

create index if not exists background_intro_packets_counterparty_idx
on public.background_intro_packets (counterparty_profile_id, review_state, created_at desc)
where counterparty_profile_id is not null;

create index if not exists background_source_summaries_profile_status_idx
on public.background_source_summaries (profile_id, status, retention_expires_at asc);

create index if not exists background_profile_interview_answers_profile_status_idx
on public.background_profile_interview_answers (profile_id, status, updated_at desc);

create index if not exists background_grant_receipts_profile_status_idx
on public.background_grant_receipts (profile_id, status, expires_at asc);

create index if not exists background_collective_policies_collective_idx
on public.background_collective_policies (collective_id);

create index if not exists background_mute_rules_profile_status_idx
on public.background_mute_rules (profile_id, status, muted_until asc);

drop trigger if exists background_opportunity_briefs_set_updated_at on public.background_opportunity_briefs;
create trigger background_opportunity_briefs_set_updated_at
before update on public.background_opportunity_briefs
for each row execute function public.set_updated_at();

drop trigger if exists background_intro_packets_set_updated_at on public.background_intro_packets;
create trigger background_intro_packets_set_updated_at
before update on public.background_intro_packets
for each row execute function public.set_updated_at();

drop trigger if exists background_source_summaries_set_updated_at on public.background_source_summaries;
create trigger background_source_summaries_set_updated_at
before update on public.background_source_summaries
for each row execute function public.set_updated_at();

drop trigger if exists background_profile_interview_answers_set_updated_at on public.background_profile_interview_answers;
create trigger background_profile_interview_answers_set_updated_at
before update on public.background_profile_interview_answers
for each row execute function public.set_updated_at();

drop trigger if exists background_collective_policies_set_updated_at on public.background_collective_policies;
create trigger background_collective_policies_set_updated_at
before update on public.background_collective_policies
for each row execute function public.set_updated_at();

drop trigger if exists background_mute_rules_set_updated_at on public.background_mute_rules;
create trigger background_mute_rules_set_updated_at
before update on public.background_mute_rules
for each row execute function public.set_updated_at();

alter table public.background_opportunity_briefs enable row level security;
alter table public.background_intro_packets enable row level security;
alter table public.background_grant_receipts enable row level security;
alter table public.background_source_summaries enable row level security;
alter table public.background_profile_interview_answers enable row level security;
alter table public.background_collective_policies enable row level security;
alter table public.background_mute_rules enable row level security;

drop policy if exists "background_opportunity_briefs_select_own" on public.background_opportunity_briefs;
create policy "background_opportunity_briefs_select_own"
on public.background_opportunity_briefs
for select
to authenticated
using (profile_id = (select auth.uid()));

drop policy if exists "background_opportunity_briefs_insert_own" on public.background_opportunity_briefs;
create policy "background_opportunity_briefs_insert_own"
on public.background_opportunity_briefs
for insert
to authenticated
with check (profile_id = (select auth.uid()));

drop policy if exists "background_opportunity_briefs_update_own" on public.background_opportunity_briefs;
create policy "background_opportunity_briefs_update_own"
on public.background_opportunity_briefs
for update
to authenticated
using (profile_id = (select auth.uid()))
with check (profile_id = (select auth.uid()));

drop policy if exists "background_opportunity_briefs_delete_own" on public.background_opportunity_briefs;
create policy "background_opportunity_briefs_delete_own"
on public.background_opportunity_briefs
for delete
to authenticated
using (profile_id = (select auth.uid()));

drop policy if exists "background_intro_packets_select_relevant" on public.background_intro_packets;
create policy "background_intro_packets_select_relevant"
on public.background_intro_packets
for select
to authenticated
using (
  requester_profile_id = (select auth.uid())
  or counterparty_profile_id = (select auth.uid())
);

drop policy if exists "background_intro_packets_insert_requester" on public.background_intro_packets;
create policy "background_intro_packets_insert_requester"
on public.background_intro_packets
for insert
to authenticated
with check (
  requester_profile_id = (select auth.uid())
  and (
    match_id is null
    or public.profile_participates_in_match(match_id, (select auth.uid()))
  )
);

drop policy if exists "background_intro_packets_update_relevant" on public.background_intro_packets;
create policy "background_intro_packets_update_relevant"
on public.background_intro_packets
for update
to authenticated
using (
  requester_profile_id = (select auth.uid())
  or counterparty_profile_id = (select auth.uid())
)
with check (
  requester_profile_id = (select auth.uid())
  or counterparty_profile_id = (select auth.uid())
);

drop policy if exists "background_grant_receipts_select_relevant" on public.background_grant_receipts;
create policy "background_grant_receipts_select_relevant"
on public.background_grant_receipts
for select
to authenticated
using (
  profile_id = (select auth.uid())
  or counterparty_id = (select auth.uid())
);

drop policy if exists "background_grant_receipts_insert_own" on public.background_grant_receipts;
create policy "background_grant_receipts_insert_own"
on public.background_grant_receipts
for insert
to authenticated
with check (profile_id = (select auth.uid()));

drop policy if exists "background_grant_receipts_update_own" on public.background_grant_receipts;
create policy "background_grant_receipts_update_own"
on public.background_grant_receipts
for update
to authenticated
using (profile_id = (select auth.uid()))
with check (profile_id = (select auth.uid()));

drop policy if exists "background_source_summaries_select_own" on public.background_source_summaries;
create policy "background_source_summaries_select_own"
on public.background_source_summaries
for select
to authenticated
using (profile_id = (select auth.uid()));

drop policy if exists "background_source_summaries_insert_own" on public.background_source_summaries;
create policy "background_source_summaries_insert_own"
on public.background_source_summaries
for insert
to authenticated
with check (profile_id = (select auth.uid()));

drop policy if exists "background_source_summaries_update_own" on public.background_source_summaries;
create policy "background_source_summaries_update_own"
on public.background_source_summaries
for update
to authenticated
using (profile_id = (select auth.uid()))
with check (profile_id = (select auth.uid()));

drop policy if exists "background_source_summaries_delete_own" on public.background_source_summaries;
create policy "background_source_summaries_delete_own"
on public.background_source_summaries
for delete
to authenticated
using (profile_id = (select auth.uid()));

drop policy if exists "background_profile_interview_answers_select_own" on public.background_profile_interview_answers;
create policy "background_profile_interview_answers_select_own"
on public.background_profile_interview_answers
for select
to authenticated
using (profile_id = (select auth.uid()));

drop policy if exists "background_profile_interview_answers_insert_own" on public.background_profile_interview_answers;
create policy "background_profile_interview_answers_insert_own"
on public.background_profile_interview_answers
for insert
to authenticated
with check (profile_id = (select auth.uid()));

drop policy if exists "background_profile_interview_answers_update_own" on public.background_profile_interview_answers;
create policy "background_profile_interview_answers_update_own"
on public.background_profile_interview_answers
for update
to authenticated
using (profile_id = (select auth.uid()))
with check (profile_id = (select auth.uid()));

drop policy if exists "background_profile_interview_answers_delete_own" on public.background_profile_interview_answers;
create policy "background_profile_interview_answers_delete_own"
on public.background_profile_interview_answers
for delete
to authenticated
using (profile_id = (select auth.uid()));

drop policy if exists "background_collective_policies_select_accessible" on public.background_collective_policies;
create policy "background_collective_policies_select_accessible"
on public.background_collective_policies
for select
to authenticated
using (public.viewer_can_access_collective(collective_id));

drop policy if exists "background_collective_policies_insert_accessible" on public.background_collective_policies;
create policy "background_collective_policies_insert_accessible"
on public.background_collective_policies
for insert
to authenticated
with check (public.viewer_can_access_collective(collective_id));

drop policy if exists "background_collective_policies_update_accessible" on public.background_collective_policies;
create policy "background_collective_policies_update_accessible"
on public.background_collective_policies
for update
to authenticated
using (public.viewer_can_access_collective(collective_id))
with check (public.viewer_can_access_collective(collective_id));

drop policy if exists "background_mute_rules_select_own" on public.background_mute_rules;
create policy "background_mute_rules_select_own"
on public.background_mute_rules
for select
to authenticated
using (profile_id = (select auth.uid()));

drop policy if exists "background_mute_rules_insert_own" on public.background_mute_rules;
create policy "background_mute_rules_insert_own"
on public.background_mute_rules
for insert
to authenticated
with check (profile_id = (select auth.uid()));

drop policy if exists "background_mute_rules_update_own" on public.background_mute_rules;
create policy "background_mute_rules_update_own"
on public.background_mute_rules
for update
to authenticated
using (profile_id = (select auth.uid()))
with check (profile_id = (select auth.uid()));
