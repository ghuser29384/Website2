-- Add append-only persistence for Moral Trade provenance-first evidence bundles.
-- The public contract already names PROV-style entities, activities, and agents;
-- these tables make that contract durable without exposing private artifacts.

create table if not exists public.moral_trade_provenance_agents (
  id uuid primary key default gen_random_uuid(),
  owner_profile_id uuid not null references public.profiles (id) on delete cascade,
  agent_key text not null,
  kind text not null check (kind in ('participant', 'counterparty', 'operator', 'external_reviewer', 'payment_or_evidence_provider')),
  label text not null default '',
  redaction_level text not null default 'participant_private' check (redaction_level in ('public', 'participant_private', 'reviewer_only')),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  unique (owner_profile_id, agent_key)
);
comment on table public.moral_trade_provenance_agents is
  'Append-only W3C PROV-style agents for Moral Trade evidence bundles; public reads require redaction_level=public.';

create table if not exists public.moral_trade_evidence_artifacts (
  id uuid primary key default gen_random_uuid(),
  owner_profile_id uuid not null references public.profiles (id) on delete cascade,
  agreement_id uuid references public.agreements (id) on delete cascade,
  offer_id uuid references public.offers (id) on delete set null,
  subject_kind text not null default 'proposal_record' check (subject_kind in ('proposal_record', 'agreement', 'offer', 'match_signal', 'traceability_event')),
  subject_id text not null,
  kind text not null check (kind in ('receipt', 'public_log', 'attestation', 'payment_event', 'prior_intent')),
  normalized_locator text not null default '',
  media_type text not null default 'text/plain',
  claim_scopes text[] not null default '{}',
  submitted_at timestamptz not null default timezone('utc', now()),
  submitted_by_agent_id uuid references public.moral_trade_provenance_agents (id) on delete restrict,
  redaction_level text not null default 'participant_private' check (redaction_level in ('public', 'participant_private', 'reviewer_only')),
  sha256 text not null check (sha256 ~ '^[a-f0-9]{64}$'),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  check (claim_scopes <@ array['factual_action', 'counterfactual_baseline', 'externality_review', 'payment_or_donation_record', 'identity_or_authority']::text[])
);
comment on table public.moral_trade_evidence_artifacts is
  'Provenance-first evidence artifact entities. Raw artifacts stay private unless explicitly redacted for public display.';

create table if not exists public.moral_trade_evidence_claims (
  id uuid primary key default gen_random_uuid(),
  owner_profile_id uuid not null references public.profiles (id) on delete cascade,
  agreement_id uuid references public.agreements (id) on delete cascade,
  offer_id uuid references public.offers (id) on delete set null,
  subject_kind text not null default 'proposal_record' check (subject_kind in ('proposal_record', 'agreement', 'offer', 'match_signal')),
  subject_id text not null,
  claim_type text not null check (claim_type in ('receipt', 'public_log', 'attestation', 'payment_event', 'prior_intent')),
  claim_scope text not null check (claim_scope in ('factual_action', 'counterfactual_baseline', 'externality_review', 'payment_or_donation_record', 'identity_or_authority')),
  reviewer_confidence text not null default 'low' check (reviewer_confidence in ('low', 'medium', 'high')),
  uniqueness_checked boolean not null default false,
  reuse_justification text not null default '',
  redaction_level text not null default 'participant_private' check (redaction_level in ('public', 'participant_private', 'reviewer_only')),
  created_at timestamptz not null default timezone('utc', now())
);
comment on table public.moral_trade_evidence_claims is
  'One reviewed claim per scoped evidence question; artifact links live in moral_trade_evidence_claim_artifacts.';

create table if not exists public.moral_trade_evidence_claim_artifacts (
  claim_id uuid not null references public.moral_trade_evidence_claims (id) on delete cascade,
  artifact_id uuid not null references public.moral_trade_evidence_artifacts (id) on delete cascade,
  owner_profile_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default timezone('utc', now()),
  primary key (claim_id, artifact_id)
);

create table if not exists public.moral_trade_external_entity_references (
  id uuid primary key default gen_random_uuid(),
  owner_profile_id uuid not null references public.profiles (id) on delete cascade,
  entity_type text not null check (entity_type in ('charity', 'payment_provider', 'supplier', 'public_registry', 'platform')),
  label text not null default '',
  identifier_system text not null check (identifier_system in ('domain', 'ein', 'every_org_slug', 'gs1_gln', 'open_supply_hub_id', 'platform_internal_id', 'unknown_review_required')),
  normalized_identifier text not null,
  dedupe_key text not null,
  verification_status text not null default 'unverified' check (verification_status in ('unverified', 'reviewer_confirmed', 'external_registry_matched')),
  normalized_source_locator text,
  redaction_level text not null default 'participant_private' check (redaction_level in ('public', 'participant_private', 'reviewer_only')),
  sha256 text not null check (sha256 ~ '^[a-f0-9]{64}$'),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  unique (owner_profile_id, dedupe_key)
);
comment on table public.moral_trade_external_entity_references is
  'Stable external charity, provider, registry, or supplier-style references for traceability events.';

create table if not exists public.moral_trade_review_decisions (
  id uuid primary key default gen_random_uuid(),
  owner_profile_id uuid not null references public.profiles (id) on delete cascade,
  agreement_id uuid references public.agreements (id) on delete cascade,
  offer_id uuid references public.offers (id) on delete set null,
  subject_kind text not null default 'proposal_record' check (subject_kind in ('proposal_record', 'agreement', 'offer', 'evidence_claim')),
  subject_id text not null,
  outcome text not null check (outcome in ('pass', 'needs_more', 'challenge', 'block')),
  reason_codes text[] not null default '{}',
  summary text not null default '',
  reviewer_agent_id uuid references public.moral_trade_provenance_agents (id) on delete restrict,
  idempotency_key text not null,
  decision_hash text not null check (decision_hash ~ '^[a-f0-9]{64}$'),
  redaction_level text not null default 'participant_private' check (redaction_level in ('public', 'participant_private', 'reviewer_only')),
  created_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.moral_trade_provenance_activities (
  id uuid primary key default gen_random_uuid(),
  owner_profile_id uuid not null references public.profiles (id) on delete cascade,
  subject_kind text not null default 'proposal_record' check (subject_kind in ('proposal_record', 'agreement', 'offer', 'evidence_claim', 'traceability_event')),
  subject_id text not null,
  kind text not null check (kind in ('draft_created', 'draft_updated', 'evidence_submitted', 'traceability_event_recorded', 'risk_screened', 'challenge_window_opened', 'review_completed')),
  activity_at timestamptz not null default timezone('utc', now()),
  used_entity_ids text[] not null default '{}',
  generated_entity_ids text[] not null default '{}',
  agent_ids uuid[] not null default '{}',
  idempotency_key text not null,
  previous_activity_hash text check (previous_activity_hash is null or previous_activity_hash ~ '^[a-f0-9]{64}$'),
  activity_hash text not null check (activity_hash ~ '^[a-f0-9]{64}$'),
  redaction_level text not null default 'participant_private' check (redaction_level in ('public', 'participant_private', 'reviewer_only')),
  created_at timestamptz not null default timezone('utc', now()),
  unique (owner_profile_id, idempotency_key),
  unique (activity_hash)
);
comment on table public.moral_trade_provenance_activities is
  'Append-only activity records linking evidence entities to agents and state changes.';

create table if not exists public.moral_trade_traceability_events (
  id uuid primary key default gen_random_uuid(),
  owner_profile_id uuid not null references public.profiles (id) on delete cascade,
  subject_kind text not null default 'proposal_record' check (subject_kind in ('proposal_record', 'agreement', 'offer', 'evidence_claim')),
  subject_id text not null,
  event_time timestamptz not null,
  recorded_at timestamptz not null default timezone('utc', now()),
  action text not null check (action in ('ADD', 'OBSERVE', 'DELETE')),
  business_step text not null check (business_step in ('proposal_submitted', 'evidence_uploaded', 'donation_initiated', 'payment_recorded', 'receipt_verified', 'review_decision_recorded', 'challenge_opened', 'completion_reviewed')),
  disposition text not null check (disposition in ('draft', 'in_review', 'verified', 'disputed', 'blocked', 'completed')),
  what jsonb not null default '{}'::jsonb,
  where_recorded jsonb not null default '{}'::jsonb,
  why jsonb not null default '{}'::jsonb,
  agent_ids uuid[] not null default '{}',
  external_entity_reference_id uuid references public.moral_trade_external_entity_references (id) on delete set null,
  redaction_level text not null default 'participant_private' check (redaction_level in ('public', 'participant_private', 'reviewer_only')),
  sha256 text not null check (sha256 ~ '^[a-f0-9]{64}$'),
  created_at timestamptz not null default timezone('utc', now()),
  unique (sha256)
);
comment on table public.moral_trade_traceability_events is
  'EPCIS-oriented what/where/why event records for payment, charity routing, or external evidence traceability.';

create table if not exists public.moral_trade_state_transition_events (
  id uuid primary key default gen_random_uuid(),
  owner_profile_id uuid not null references public.profiles (id) on delete cascade,
  subject_kind text not null default 'proposal_record' check (subject_kind in ('proposal_record', 'agreement', 'offer')),
  subject_id text not null,
  from_status text not null,
  to_status text not null,
  provenance_activity text not null,
  recorded_at timestamptz not null default timezone('utc', now()),
  actor_agent_id uuid references public.moral_trade_provenance_agents (id) on delete restrict,
  actor_agent_kind text not null check (actor_agent_kind in ('participant', 'counterparty', 'operator', 'external_reviewer', 'payment_or_evidence_provider')),
  used_entity_ids text[] not null default '{}',
  generated_entity_ids text[] not null default '{}',
  idempotency_key text not null,
  previous_event_hash text check (previous_event_hash is null or previous_event_hash ~ '^[a-f0-9]{64}$'),
  event_hash text not null check (event_hash ~ '^[a-f0-9]{64}$'),
  redaction_level text not null default 'participant_private' check (redaction_level in ('public', 'participant_private', 'reviewer_only')),
  created_at timestamptz not null default timezone('utc', now()),
  unique (owner_profile_id, idempotency_key),
  unique (event_hash)
);
comment on table public.moral_trade_state_transition_events is
  'Immutable state transition event records used before matchable or reviewed-completion reliance states.';

create index if not exists moral_trade_provenance_agents_owner_idx on public.moral_trade_provenance_agents (owner_profile_id, created_at desc);
create index if not exists moral_trade_evidence_artifacts_owner_subject_idx on public.moral_trade_evidence_artifacts (owner_profile_id, subject_kind, subject_id, created_at desc);
create index if not exists moral_trade_evidence_artifacts_agreement_idx on public.moral_trade_evidence_artifacts (agreement_id, created_at desc);
create unique index if not exists moral_trade_evidence_artifacts_sha256_idx on public.moral_trade_evidence_artifacts (sha256);
create index if not exists moral_trade_evidence_claims_owner_subject_idx on public.moral_trade_evidence_claims (owner_profile_id, subject_kind, subject_id, created_at desc);
create index if not exists moral_trade_evidence_claim_artifacts_artifact_idx on public.moral_trade_evidence_claim_artifacts (artifact_id, created_at desc);
create index if not exists moral_trade_external_entity_references_owner_idx on public.moral_trade_external_entity_references (owner_profile_id, entity_type, created_at desc);
create index if not exists moral_trade_review_decisions_owner_subject_idx on public.moral_trade_review_decisions (owner_profile_id, subject_kind, subject_id, created_at desc);
create index if not exists moral_trade_provenance_activities_owner_subject_idx on public.moral_trade_provenance_activities (owner_profile_id, subject_kind, subject_id, activity_at desc);
create index if not exists moral_trade_traceability_events_owner_subject_idx on public.moral_trade_traceability_events (owner_profile_id, subject_kind, subject_id, recorded_at desc);
create index if not exists moral_trade_state_transition_events_owner_subject_idx on public.moral_trade_state_transition_events (owner_profile_id, subject_kind, subject_id, recorded_at desc);

alter table public.moral_trade_provenance_agents enable row level security;
alter table public.moral_trade_evidence_artifacts enable row level security;
alter table public.moral_trade_evidence_claims enable row level security;
alter table public.moral_trade_evidence_claim_artifacts enable row level security;
alter table public.moral_trade_external_entity_references enable row level security;
alter table public.moral_trade_review_decisions enable row level security;
alter table public.moral_trade_provenance_activities enable row level security;
alter table public.moral_trade_traceability_events enable row level security;
alter table public.moral_trade_state_transition_events enable row level security;

drop policy if exists "moral_trade_provenance_agents_select_visible" on public.moral_trade_provenance_agents;
create policy "moral_trade_provenance_agents_select_visible"
on public.moral_trade_provenance_agents
for select
to anon, authenticated
using (redaction_level = 'public' or owner_profile_id = (select auth.uid()));

drop policy if exists "moral_trade_provenance_agents_insert_owner" on public.moral_trade_provenance_agents;
create policy "moral_trade_provenance_agents_insert_owner"
on public.moral_trade_provenance_agents
for insert
to authenticated
with check (owner_profile_id = (select auth.uid()));

drop policy if exists "moral_trade_evidence_artifacts_select_visible" on public.moral_trade_evidence_artifacts;
create policy "moral_trade_evidence_artifacts_select_visible"
on public.moral_trade_evidence_artifacts
for select
to anon, authenticated
using (redaction_level = 'public' or owner_profile_id = (select auth.uid()));

drop policy if exists "moral_trade_evidence_artifacts_insert_owner" on public.moral_trade_evidence_artifacts;
create policy "moral_trade_evidence_artifacts_insert_owner"
on public.moral_trade_evidence_artifacts
for insert
to authenticated
with check (
  owner_profile_id = (select auth.uid())
  and (
    submitted_by_agent_id is null
    or exists (
      select 1
      from public.moral_trade_provenance_agents
      where moral_trade_provenance_agents.id = moral_trade_evidence_artifacts.submitted_by_agent_id
        and moral_trade_provenance_agents.owner_profile_id = (select auth.uid())
    )
  )
);

drop policy if exists "moral_trade_evidence_claims_select_visible" on public.moral_trade_evidence_claims;
create policy "moral_trade_evidence_claims_select_visible"
on public.moral_trade_evidence_claims
for select
to anon, authenticated
using (redaction_level = 'public' or owner_profile_id = (select auth.uid()));

drop policy if exists "moral_trade_evidence_claims_insert_owner" on public.moral_trade_evidence_claims;
create policy "moral_trade_evidence_claims_insert_owner"
on public.moral_trade_evidence_claims
for insert
to authenticated
with check (owner_profile_id = (select auth.uid()));

drop policy if exists "moral_trade_evidence_claim_artifacts_select_visible" on public.moral_trade_evidence_claim_artifacts;
create policy "moral_trade_evidence_claim_artifacts_select_visible"
on public.moral_trade_evidence_claim_artifacts
for select
to anon, authenticated
using (
  owner_profile_id = (select auth.uid())
  or (
    exists (
      select 1
      from public.moral_trade_evidence_claims
      where moral_trade_evidence_claims.id = moral_trade_evidence_claim_artifacts.claim_id
        and moral_trade_evidence_claims.redaction_level = 'public'
    )
    and exists (
      select 1
      from public.moral_trade_evidence_artifacts
      where moral_trade_evidence_artifacts.id = moral_trade_evidence_claim_artifacts.artifact_id
        and moral_trade_evidence_artifacts.redaction_level = 'public'
    )
  )
);

drop policy if exists "moral_trade_evidence_claim_artifacts_insert_owner" on public.moral_trade_evidence_claim_artifacts;
create policy "moral_trade_evidence_claim_artifacts_insert_owner"
on public.moral_trade_evidence_claim_artifacts
for insert
to authenticated
with check (
  owner_profile_id = (select auth.uid())
  and exists (
    select 1
    from public.moral_trade_evidence_claims
    where moral_trade_evidence_claims.id = moral_trade_evidence_claim_artifacts.claim_id
      and moral_trade_evidence_claims.owner_profile_id = (select auth.uid())
  )
  and exists (
    select 1
    from public.moral_trade_evidence_artifacts
    where moral_trade_evidence_artifacts.id = moral_trade_evidence_claim_artifacts.artifact_id
      and moral_trade_evidence_artifacts.owner_profile_id = (select auth.uid())
  )
);

drop policy if exists "moral_trade_external_entity_references_select_visible" on public.moral_trade_external_entity_references;
create policy "moral_trade_external_entity_references_select_visible"
on public.moral_trade_external_entity_references
for select
to anon, authenticated
using (redaction_level = 'public' or owner_profile_id = (select auth.uid()));

drop policy if exists "moral_trade_external_entity_references_insert_owner" on public.moral_trade_external_entity_references;
create policy "moral_trade_external_entity_references_insert_owner"
on public.moral_trade_external_entity_references
for insert
to authenticated
with check (owner_profile_id = (select auth.uid()));

drop policy if exists "moral_trade_review_decisions_select_visible" on public.moral_trade_review_decisions;
create policy "moral_trade_review_decisions_select_visible"
on public.moral_trade_review_decisions
for select
to anon, authenticated
using (redaction_level = 'public' or owner_profile_id = (select auth.uid()));

drop policy if exists "moral_trade_review_decisions_insert_owner" on public.moral_trade_review_decisions;
create policy "moral_trade_review_decisions_insert_owner"
on public.moral_trade_review_decisions
for insert
to authenticated
with check (
  owner_profile_id = (select auth.uid())
  and (
    reviewer_agent_id is null
    or exists (
      select 1
      from public.moral_trade_provenance_agents
      where moral_trade_provenance_agents.id = moral_trade_review_decisions.reviewer_agent_id
        and moral_trade_provenance_agents.owner_profile_id = (select auth.uid())
    )
  )
);

drop policy if exists "moral_trade_provenance_activities_select_visible" on public.moral_trade_provenance_activities;
create policy "moral_trade_provenance_activities_select_visible"
on public.moral_trade_provenance_activities
for select
to anon, authenticated
using (redaction_level = 'public' or owner_profile_id = (select auth.uid()));

drop policy if exists "moral_trade_provenance_activities_insert_owner" on public.moral_trade_provenance_activities;
create policy "moral_trade_provenance_activities_insert_owner"
on public.moral_trade_provenance_activities
for insert
to authenticated
with check (owner_profile_id = (select auth.uid()));

drop policy if exists "moral_trade_traceability_events_select_visible" on public.moral_trade_traceability_events;
create policy "moral_trade_traceability_events_select_visible"
on public.moral_trade_traceability_events
for select
to anon, authenticated
using (redaction_level = 'public' or owner_profile_id = (select auth.uid()));

drop policy if exists "moral_trade_traceability_events_insert_owner" on public.moral_trade_traceability_events;
create policy "moral_trade_traceability_events_insert_owner"
on public.moral_trade_traceability_events
for insert
to authenticated
with check (
  owner_profile_id = (select auth.uid())
  and (
    external_entity_reference_id is null
    or exists (
      select 1
      from public.moral_trade_external_entity_references
      where moral_trade_external_entity_references.id = moral_trade_traceability_events.external_entity_reference_id
        and moral_trade_external_entity_references.owner_profile_id = (select auth.uid())
    )
  )
);

drop policy if exists "moral_trade_state_transition_events_select_visible" on public.moral_trade_state_transition_events;
create policy "moral_trade_state_transition_events_select_visible"
on public.moral_trade_state_transition_events
for select
to anon, authenticated
using (redaction_level = 'public' or owner_profile_id = (select auth.uid()));

drop policy if exists "moral_trade_state_transition_events_insert_owner" on public.moral_trade_state_transition_events;
create policy "moral_trade_state_transition_events_insert_owner"
on public.moral_trade_state_transition_events
for insert
to authenticated
with check (
  owner_profile_id = (select auth.uid())
  and (
    actor_agent_id is null
    or exists (
      select 1
      from public.moral_trade_provenance_agents
      where moral_trade_provenance_agents.id = moral_trade_state_transition_events.actor_agent_id
        and moral_trade_provenance_agents.owner_profile_id = (select auth.uid())
    )
  )
);
