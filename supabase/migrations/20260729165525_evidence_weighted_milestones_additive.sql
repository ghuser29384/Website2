-- Phase 1A: additive evidence-weighted, noncustodial milestone settlement for
-- the canonical core trade loop.
--
-- This phase intentionally preserves the existing participant write policies,
-- public-evidence reads, profile reads, and service-role-compatible core RPCs.
-- The compatible application must be deployed before the separate restrictive
-- cutover migration is applied.
--
-- Product policy frozen before this migration:
--   * independently priced, version-bound milestones;
--   * evidence confidence bands of 100, 75, 50, 25, or 0 percent;
--   * one consolidated replacement packet;
--   * one appeal by either participant within seven days;
--   * the appeal reviewer must differ from the original reviewer;
--   * an appeal pauses the replacement clock and an upheld rejection resumes
--     the unused time;
--   * payout is floored to the nearest whole cent;
--   * Moral Trade records external payment only and never holds or releases it;
--   * public output is limited to the six approved aggregate metadata fields.

create extension if not exists pgcrypto;

alter table public.trade_agreement_versions
  add column if not exists requires_milestone_manifest boolean not null default false,
  add column if not exists milestone_manifest_hash text,
  add column if not exists complete_terms_hash text;

alter table public.trade_agreement_versions
  drop constraint if exists trade_agreement_versions_milestone_manifest_hash_check;
alter table public.trade_agreement_versions
  add constraint trade_agreement_versions_milestone_manifest_hash_check check (
    milestone_manifest_hash is null
    or milestone_manifest_hash ~ '^[0-9a-f]{64}$'
  );

alter table public.trade_agreement_versions
  drop constraint if exists trade_agreement_versions_complete_terms_hash_check;
alter table public.trade_agreement_versions
  add constraint trade_agreement_versions_complete_terms_hash_check check (
    complete_terms_hash is null
    or complete_terms_hash ~ '^[0-9a-f]{64}$'
  );

alter table public.trade_agreement_versions
  drop constraint if exists trade_agreement_versions_agreement_id_terms_hash_key;
create unique index if not exists trade_agreement_versions_complete_terms_uidx
  on public.trade_agreement_versions(agreement_id, complete_terms_hash)
  where complete_terms_hash is not null;

alter table public.trade_counterproposals
  add column if not exists milestone_terms jsonb not null default '[]'::jsonb;
alter table public.trade_counterproposals
  drop constraint if exists trade_counterproposals_milestone_terms_array_check;
alter table public.trade_counterproposals
  add constraint trade_counterproposals_milestone_terms_array_check
  check (jsonb_typeof(milestone_terms) = 'array');

alter table public.agreements
  add column if not exists future_obligations_paused_at timestamptz,
  add column if not exists future_obligations_pause_reason text not null default '';

-- The v2 core RPCs predate request-scoped participant writes and trusted a
-- caller-supplied actor UUID. Preserve their reviewed transactional bodies
-- behind uncallable internal names, then expose identity-bound wrappers.
alter function public.create_trade_invitation_v2(
  uuid, uuid, uuid, text, text, text, text, text, text
) rename to create_trade_invitation_v2_unbound_legacy;
alter function public.revoke_trade_invitation_v2(uuid, uuid, uuid)
  rename to revoke_trade_invitation_v2_unbound_legacy;
alter function public.respond_trade_invitation_v2(
  uuid, text, text, text, text, text, text, date, text, date, text, text, text, text
) rename to respond_trade_invitation_v2_unbound_legacy;
alter function public.decide_counterproposal_v2(uuid, uuid, uuid, text)
  rename to decide_counterproposal_v2_unbound_legacy;
alter function public.confirm_agreement_version_v2(uuid, uuid, uuid)
  rename to confirm_agreement_version_v2_unbound_legacy;
alter function public.block_trade_pair_v2(uuid, uuid, text)
  rename to block_trade_pair_v2_unbound_legacy;

revoke all on function public.create_trade_invitation_v2_unbound_legacy(
  uuid, uuid, uuid, text, text, text, text, text, text
) from public, anon, authenticated, service_role;
revoke all on function public.revoke_trade_invitation_v2_unbound_legacy(
  uuid, uuid, uuid
) from public, anon, authenticated, service_role;
revoke all on function public.respond_trade_invitation_v2_unbound_legacy(
  uuid, text, text, text, text, text, text, date, text, date, text, text, text, text
) from public, anon, authenticated, service_role;
revoke all on function public.decide_counterproposal_v2_unbound_legacy(
  uuid, uuid, uuid, text
) from public, anon, authenticated, service_role;
revoke all on function public.confirm_agreement_version_v2_unbound_legacy(
  uuid, uuid, uuid
) from public, anon, authenticated, service_role;
revoke all on function public.block_trade_pair_v2_unbound_legacy(
  uuid, uuid, text
) from public, anon, authenticated, service_role;

create or replace function moral_trade_private.require_bound_trade_actor(
  p_actor_id uuid
)
returns void
language plpgsql
stable
security definer
set search_path = ''
as $function$
begin
  if auth.uid() is null
     and coalesce(auth.jwt() ->> 'role', '') <> 'service_role' then
    raise exception 'The actor must match the authenticated profile.';
  end if;
  if auth.uid() is not null and p_actor_id is distinct from auth.uid() then
    raise exception 'The actor must match the authenticated profile.';
  end if;
end;
$function$;

create or replace function public.create_trade_invitation_v2(
  p_actor_id uuid,
  p_offer_id uuid,
  p_invitation_id uuid,
  p_token_hash text,
  p_token_ciphertext text,
  p_recipient_email text,
  p_message text,
  p_email_subject text,
  p_email_body text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
begin
  perform moral_trade_private.require_bound_trade_actor(p_actor_id);
  return public.create_trade_invitation_v2_unbound_legacy(
    p_actor_id, p_offer_id, p_invitation_id, p_token_hash,
    p_token_ciphertext, p_recipient_email, p_message,
    p_email_subject, p_email_body
  );
end;
$function$;

create or replace function public.revoke_trade_invitation_v2(
  p_actor_id uuid,
  p_invitation_id uuid,
  p_offer_id uuid
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $function$
begin
  perform moral_trade_private.require_bound_trade_actor(p_actor_id);
  return public.revoke_trade_invitation_v2_unbound_legacy(
    p_actor_id, p_invitation_id, p_offer_id
  );
end;
$function$;

create or replace function public.respond_trade_invitation_v2(
  p_actor_id uuid,
  p_token_hash text,
  p_decision text,
  p_message text,
  p_proposed_action text,
  p_requested_action text,
  p_duration text,
  p_start_date date,
  p_evidence_rule text,
  p_evidence_due_date date,
  p_exit_conditions text,
  p_maximum_burden text,
  p_privacy_scope text,
  p_no_trade_baseline text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
begin
  perform moral_trade_private.require_bound_trade_actor(p_actor_id);
  return public.respond_trade_invitation_v2_unbound_legacy(
    p_actor_id, p_token_hash, p_decision, p_message, p_proposed_action,
    p_requested_action, p_duration, p_start_date, p_evidence_rule,
    p_evidence_due_date, p_exit_conditions, p_maximum_burden,
    p_privacy_scope, p_no_trade_baseline
  );
end;
$function$;

create or replace function public.decide_counterproposal_v2(
  p_actor_id uuid,
  p_thread_id uuid,
  p_proposal_id uuid,
  p_decision text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
begin
  perform moral_trade_private.require_bound_trade_actor(p_actor_id);
  return public.decide_counterproposal_v2_unbound_legacy(
    p_actor_id, p_thread_id, p_proposal_id, p_decision
  );
end;
$function$;

create or replace function public.confirm_agreement_version_v2(
  p_actor_id uuid,
  p_agreement_id uuid,
  p_agreement_version_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
begin
  perform moral_trade_private.require_bound_trade_actor(p_actor_id);
  return public.confirm_agreement_version_v2_unbound_legacy(
    p_actor_id, p_agreement_id, p_agreement_version_id
  );
end;
$function$;

create or replace function public.block_trade_pair_v2(
  p_actor_id uuid,
  p_thread_id uuid,
  p_reason text
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $function$
begin
  perform moral_trade_private.require_bound_trade_actor(p_actor_id);
  return public.block_trade_pair_v2_unbound_legacy(
    p_actor_id, p_thread_id, p_reason
  );
end;
$function$;

revoke all on function moral_trade_private.require_bound_trade_actor(uuid)
  from public, anon, authenticated, service_role;
revoke all on function public.create_trade_invitation_v2(
  uuid, uuid, uuid, text, text, text, text, text, text
) from public, anon, authenticated, service_role;
revoke all on function public.revoke_trade_invitation_v2(uuid, uuid, uuid)
  from public, anon, authenticated, service_role;
revoke all on function public.respond_trade_invitation_v2(
  uuid, text, text, text, text, text, text, date, text, date, text, text, text, text
) from public, anon, authenticated, service_role;
revoke all on function public.decide_counterproposal_v2(uuid, uuid, uuid, text)
  from public, anon, authenticated, service_role;
revoke all on function public.confirm_agreement_version_v2(uuid, uuid, uuid)
  from public, anon, authenticated, service_role;
revoke all on function public.block_trade_pair_v2(uuid, uuid, text)
  from public, anon, authenticated, service_role;

grant execute on function public.create_trade_invitation_v2(
  uuid, uuid, uuid, text, text, text, text, text, text
) to authenticated;
grant execute on function public.revoke_trade_invitation_v2(uuid, uuid, uuid)
  to authenticated;
grant execute on function public.respond_trade_invitation_v2(
  uuid, text, text, text, text, text, text, date, text, date, text, text, text, text
) to authenticated;
grant execute on function public.decide_counterproposal_v2(
  uuid, uuid, uuid, text
) to authenticated;
grant execute on function public.confirm_agreement_version_v2(uuid, uuid, uuid)
  to authenticated;
grant execute on function public.block_trade_pair_v2(uuid, uuid, text)
  to authenticated;

create table if not exists public.trade_review_role_grants (
  profile_id uuid not null references public.profiles(id) on delete cascade,
  role text not null check (role in ('reviewer', 'administrator')),
  active boolean not null default true,
  granted_by uuid references public.profiles(id) on delete set null,
  granted_at timestamptz not null default now(),
  revoked_at timestamptz,
  primary key (profile_id, role),
  constraint trade_review_role_grants_active_state_check check (
    (active and revoked_at is null)
    or (not active and revoked_at is not null)
  )
);

-- The approved production administrator/reviewer. Conditional seeding keeps
-- branch and test databases deterministic without fabricating a profile.
insert into public.trade_review_role_grants (
  profile_id, role, active, granted_by, granted_at
)
select p.id, role_name, true, p.id, now()
from public.profiles p
cross join (
  values ('administrator'::text), ('reviewer'::text)
) as approved_roles(role_name)
where p.id = '9e51db47-92d1-4d75-80ce-cf10de1121f1'::uuid
on conflict (profile_id, role) do update
set active = true,
    revoked_at = null;

create table if not exists public.trade_agreement_milestones (
  id uuid primary key default gen_random_uuid(),
  agreement_id uuid not null references public.agreements(id) on delete cascade,
  agreement_version_id uuid not null references public.trade_agreement_versions(id) on delete cascade,
  position integer not null check (position between 1 and 100),
  performer_id uuid not null references public.profiles(id) on delete restrict,
  payer_id uuid not null references public.profiles(id) on delete restrict,
  action_category text not null check (action_category in (
    'donation', 'service', 'advocacy', 'research', 'lifestyle', 'other'
  )),
  description text not null check (
    length(btrim(description)) between 1 and 5000
  ),
  unit_label text not null check (
    length(btrim(unit_label)) between 1 and 120
  ),
  units_total numeric(20, 6) not null check (units_total > 0),
  indivisible boolean not null default true,
  maximum_amount_cents bigint not null check (
    maximum_amount_cents between 0 and 9007199254740991
  ),
  currency text not null check (currency ~ '^[A-Z]{3}$'),
  evidence_rule text not null check (
    length(btrim(evidence_rule)) between 1 and 5000
  ),
  status text not null default 'terms' check (status in (
    'terms', 'evidence_due', 'under_review', 'replacement_due',
    'appeal_pending', 'graded', 'paid', 'cancelled'
  )),
  reviewer_selection_opened_at timestamptz,
  assigned_reviewer_id uuid references public.profiles(id) on delete set null,
  current_bundle_id uuid,
  final_review_id uuid,
  replacement_packet_used boolean not null default false,
  replacement_deadline_at timestamptz,
  replacement_seconds_remaining integer check (
    replacement_seconds_remaining is null
    or replacement_seconds_remaining between 0 and 604800
  ),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (agreement_version_id, position),
  constraint trade_agreement_milestones_distinct_roles_check
    check (performer_id <> payer_id),
  constraint trade_agreement_milestones_indivisible_units_check
    check (not indivisible or units_total = 1)
);

create index if not exists trade_agreement_milestones_agreement_idx
  on public.trade_agreement_milestones(agreement_id, position);
create index if not exists trade_agreement_milestones_reviewer_idx
  on public.trade_agreement_milestones(assigned_reviewer_id, status)
  where assigned_reviewer_id is not null;

create table if not exists public.trade_milestone_reviewer_nominations (
  milestone_id uuid not null references public.trade_agreement_milestones(id) on delete cascade,
  nominated_by uuid not null references public.profiles(id) on delete cascade,
  reviewer_id uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  primary key (milestone_id, nominated_by)
);

create table if not exists public.trade_evidence_bundles (
  id uuid primary key default gen_random_uuid(),
  milestone_id uuid not null references public.trade_agreement_milestones(id) on delete cascade,
  submitted_by uuid not null references public.profiles(id) on delete restrict,
  bundle_kind text not null check (bundle_kind in ('initial', 'replacement')),
  attempt_number smallint not null check (attempt_number in (1, 2)),
  status text not null default 'draft' check (status in (
    'draft', 'submitted', 'superseded', 'invalid', 'accepted'
  )),
  created_at timestamptz not null default now(),
  submitted_at timestamptz,
  reviewed_at timestamptz,
  unique (milestone_id, attempt_number),
  constraint trade_evidence_bundles_kind_attempt_check check (
    (bundle_kind = 'initial' and attempt_number = 1)
    or (bundle_kind = 'replacement' and attempt_number = 2)
  )
);

create unique index if not exists trade_evidence_bundles_one_replacement_idx
  on public.trade_evidence_bundles(milestone_id)
  where bundle_kind = 'replacement';

with duplicate_pending_exits as (
  select
    request.id,
    row_number() over (
      partition by request.agreement_id, request.requested_by
      order by request.created_at, request.id
    ) as pending_rank
  from public.trade_exit_requests request
  where request.status = 'pending'
)
update public.trade_exit_requests request
set status = 'declined',
    resolved_at = coalesce(request.resolved_at, now())
from duplicate_pending_exits duplicate
where duplicate.id = request.id
  and duplicate.pending_rank > 1;

create unique index if not exists trade_exit_requests_one_pending_actor_idx
  on public.trade_exit_requests(agreement_id, requested_by)
  where status = 'pending';

create table if not exists public.trade_evidence_bundle_items (
  id uuid primary key default gen_random_uuid(),
  bundle_id uuid not null references public.trade_evidence_bundles(id) on delete cascade,
  evidence_type text not null check (evidence_type in ('file', 'link', 'attestation')),
  storage_path text not null default '',
  evidence_url text not null default '',
  attestation text not null default '',
  created_at timestamptz not null default now(),
  constraint trade_evidence_bundle_items_payload_check check (
    (evidence_type = 'file' and storage_path <> '' and evidence_url = '' and attestation = '')
    or (evidence_type = 'link' and storage_path = '' and evidence_url ~* '^https?://' and attestation = '')
    or (evidence_type = 'attestation' and storage_path = '' and evidence_url = '' and btrim(attestation) <> '')
  )
);

create index if not exists trade_evidence_bundle_items_bundle_idx
  on public.trade_evidence_bundle_items(bundle_id, created_at, id);

create table if not exists public.trade_milestone_reviews (
  id uuid primary key default gen_random_uuid(),
  milestone_id uuid not null references public.trade_agreement_milestones(id) on delete cascade,
  bundle_id uuid not null references public.trade_evidence_bundles(id) on delete restrict,
  reviewer_id uuid not null references public.profiles(id) on delete restrict,
  review_kind text not null check (review_kind in ('initial', 'replacement', 'appeal')),
  base_review_id uuid references public.trade_milestone_reviews(id) on delete restrict,
  outcome text not null check (outcome in ('graded', 'rejected')),
  completion_units numeric(20, 6) not null check (completion_units >= 0),
  confidence_band smallint not null check (confidence_band in (0, 25, 50, 75, 100)),
  payout_basis_points integer not null check (payout_basis_points between 0 and 10000),
  amount_due_cents bigint not null check (amount_due_cents >= 0),
  private_reason text not null check (
    length(btrim(private_reason)) between 1 and 4000
  ),
  appeal_deadline_at timestamptz not null,
  is_final boolean not null default false,
  finalized_at timestamptz,
  created_at timestamptz not null default now(),
  constraint trade_milestone_reviews_rejected_values_check check (
    (outcome = 'rejected' and completion_units = 0 and confidence_band = 0
      and payout_basis_points = 0 and amount_due_cents = 0)
    or outcome = 'graded'
  ),
  constraint trade_milestone_reviews_final_state_check check (
    (is_final and finalized_at is not null)
    or (not is_final and finalized_at is null)
  ),
  constraint trade_milestone_reviews_appeal_link_check check (
    (review_kind = 'appeal' and base_review_id is not null)
    or (review_kind <> 'appeal' and base_review_id is null)
  )
);

create unique index if not exists trade_milestone_reviews_one_bundle_review_idx
  on public.trade_milestone_reviews(bundle_id)
  where review_kind in ('initial', 'replacement');
create unique index if not exists trade_milestone_reviews_one_appeal_idx
  on public.trade_milestone_reviews(milestone_id)
  where review_kind = 'appeal';

create table if not exists public.trade_milestone_appeals (
  id uuid primary key default gen_random_uuid(),
  milestone_id uuid not null unique references public.trade_agreement_milestones(id) on delete cascade,
  base_review_id uuid not null unique references public.trade_milestone_reviews(id) on delete restrict,
  opened_by uuid not null references public.profiles(id) on delete restrict,
  reason text not null check (length(btrim(reason)) between 1 and 4000),
  status text not null default 'reviewer_selection' check (status in (
    'reviewer_selection', 'assigned', 'resolved'
  )),
  assigned_reviewer_id uuid references public.profiles(id) on delete set null,
  reviewer_selection_deadline_at timestamptz not null,
  replacement_seconds_remaining integer check (
    replacement_seconds_remaining is null
    or replacement_seconds_remaining between 0 and 604800
  ),
  created_at timestamptz not null default now(),
  resolved_at timestamptz,
  constraint trade_milestone_appeals_resolved_state_check check (
    (status = 'resolved' and resolved_at is not null)
    or (status <> 'resolved' and resolved_at is null)
  )
);

create table if not exists public.trade_appeal_reviewer_nominations (
  appeal_id uuid not null references public.trade_milestone_appeals(id) on delete cascade,
  nominated_by uuid not null references public.profiles(id) on delete cascade,
  reviewer_id uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  primary key (appeal_id, nominated_by)
);

create table if not exists public.trade_milestone_payouts (
  id uuid primary key default gen_random_uuid(),
  milestone_id uuid not null unique references public.trade_agreement_milestones(id) on delete cascade,
  review_id uuid not null unique references public.trade_milestone_reviews(id) on delete restrict,
  payer_id uuid not null references public.profiles(id) on delete restrict,
  payee_id uuid not null references public.profiles(id) on delete restrict,
  maximum_amount_cents bigint not null check (maximum_amount_cents >= 0),
  completion_units numeric(20, 6) not null check (completion_units >= 0),
  units_total numeric(20, 6) not null check (units_total > 0),
  confidence_band smallint not null check (confidence_band in (0, 25, 50, 75, 100)),
  payout_basis_points integer not null check (payout_basis_points between 0 and 10000),
  amount_due_cents bigint not null check (
    amount_due_cents between 0 and maximum_amount_cents
  ),
  currency text not null check (currency ~ '^[A-Z]{3}$'),
  is_final boolean not null default false,
  status text not null default 'provisional' check (status in (
    'provisional', 'not_due', 'due', 'reported_paid', 'confirmed', 'disputed'
  )),
  finalized_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint trade_milestone_payouts_final_state_check check (
    (not is_final and status = 'provisional' and finalized_at is null)
    or (is_final and status <> 'provisional' and finalized_at is not null)
  )
);

create table if not exists public.trade_external_payment_receipts (
  id uuid primary key default gen_random_uuid(),
  payout_id uuid not null unique references public.trade_milestone_payouts(id) on delete cascade,
  reported_by uuid not null references public.profiles(id) on delete restrict,
  provider text not null check (length(btrim(provider)) between 1 and 120),
  provider_reference text not null check (
    length(btrim(provider_reference)) between 1 and 500
  ),
  reference_fingerprint text not null unique check (
    reference_fingerprint ~ '^[0-9a-f]{64}$'
  ),
  amount_cents bigint not null check (amount_cents >= 0),
  currency text not null check (currency ~ '^[A-Z]{3}$'),
  paid_on date not null,
  receipt_storage_path text not null default '',
  status text not null default 'reported' check (status in (
    'reported', 'confirmed', 'disputed'
  )),
  counterparty_note text not null default '',
  reported_at timestamptz not null default now(),
  responded_at timestamptz
);

alter table public.trade_agreement_milestones
  drop constraint if exists trade_agreement_milestones_current_bundle_id_fkey;
alter table public.trade_agreement_milestones
  add constraint trade_agreement_milestones_current_bundle_id_fkey
  foreign key (current_bundle_id) references public.trade_evidence_bundles(id) on delete set null;

alter table public.trade_agreement_milestones
  drop constraint if exists trade_agreement_milestones_final_review_id_fkey;
alter table public.trade_agreement_milestones
  add constraint trade_agreement_milestones_final_review_id_fkey
  foreign key (final_review_id) references public.trade_milestone_reviews(id) on delete set null;

create or replace function public.trade_milestone_manifest_hash_v1(
  p_agreement_version_id uuid
)
returns text
language sql
stable
set search_path = ''
as $function$
  select encode(
    extensions.digest(
      convert_to(
        coalesce(
          jsonb_agg(
            jsonb_build_object(
              'position', m.position,
              'performerId', m.performer_id,
              'payerId', m.payer_id,
              'actionCategory', btrim(m.action_category),
              'description', btrim(m.description),
              'unitLabel', btrim(m.unit_label),
              'unitsTotal', m.units_total,
              'indivisible', m.indivisible,
              'maximumAmountCents', m.maximum_amount_cents,
              'currency', m.currency,
              'evidenceRule', btrim(m.evidence_rule),
              'confidenceBands', jsonb_build_array(100, 75, 50, 25, 0),
              'replacementWindowDays', 7,
              'appealWindowDays', 7,
              'payoutRounding', 'floor_to_cent'
            )
            order by m.position
          ),
          '[]'::jsonb
        )::text,
        'UTF8'
      ),
      'sha256'
    ),
    'hex'
  )
  from public.trade_agreement_milestones m
  where m.agreement_version_id = p_agreement_version_id;
$function$;

create or replace function public.trade_milestone_payout_v1(
  p_maximum_amount_cents bigint,
  p_completion_units numeric,
  p_units_total numeric,
  p_confidence_band smallint
)
returns table (
  payout_basis_points integer,
  amount_due_cents bigint
)
language sql
immutable
set search_path = ''
as $function$
  select
    floor(
      least(greatest(p_completion_units, 0), p_units_total)
      / p_units_total
      * p_confidence_band
      * 100
    )::integer,
    floor(
      p_maximum_amount_cents::numeric
      * least(greatest(p_completion_units, 0), p_units_total)
      / p_units_total
      * p_confidence_band
      / 100
    )::bigint
  where p_maximum_amount_cents >= 0
    and p_units_total > 0
    and p_confidence_band in (0, 25, 50, 75, 100);
$function$;

create or replace function moral_trade_private.current_actor_has_trade_role(
  p_role text
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $function$
  select
    auth.uid() is not null
    and coalesce(auth.jwt() ->> 'aal', '') = 'aal2'
    and exists (
      select 1
      from public.trade_review_role_grants grant_row
      where grant_row.profile_id = auth.uid()
        and grant_row.role = p_role
        and grant_row.active
        and grant_row.revoked_at is null
    );
$function$;

create or replace function moral_trade_private.guard_frozen_trade_milestone()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
declare
  version_id uuid := coalesce(new.agreement_version_id, old.agreement_version_id);
  version_hash text;
begin
  select v.milestone_manifest_hash
  into version_hash
  from public.trade_agreement_versions v
  where v.id = version_id
  for update;

  if (
    version_hash is not null
    or exists (
       select 1
       from public.trade_agreement_confirmations c
       where c.agreement_version_id = version_id
    )
  ) and (
    tg_op <> 'UPDATE'
    or new.agreement_id is distinct from old.agreement_id
    or new.agreement_version_id is distinct from old.agreement_version_id
    or new.position is distinct from old.position
    or new.performer_id is distinct from old.performer_id
    or new.payer_id is distinct from old.payer_id
    or new.action_category is distinct from old.action_category
    or new.description is distinct from old.description
    or new.unit_label is distinct from old.unit_label
    or new.units_total is distinct from old.units_total
    or new.indivisible is distinct from old.indivisible
    or new.maximum_amount_cents is distinct from old.maximum_amount_cents
    or new.currency is distinct from old.currency
    or new.evidence_rule is distinct from old.evidence_rule
  ) then
    raise exception 'Milestone terms are frozen. Create a new agreement version to amend them.';
  end if;

  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$function$;

drop trigger if exists guard_frozen_trade_milestone_trigger
  on public.trade_agreement_milestones;
create trigger guard_frozen_trade_milestone_trigger
before insert or update or delete on public.trade_agreement_milestones
for each row execute function moral_trade_private.guard_frozen_trade_milestone();

create or replace function moral_trade_private.require_final_trade_milestone_manifest()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
declare
  version_row public.trade_agreement_versions%rowtype;
  actual_hash text;
  actual_complete_hash text;
begin
  select *
  into version_row
  from public.trade_agreement_versions v
  where v.id = new.agreement_version_id
  for update;

  if version_row.requires_milestone_manifest then
    actual_hash := public.trade_milestone_manifest_hash_v1(new.agreement_version_id);
    actual_complete_hash := encode(
      extensions.digest(
        convert_to(version_row.terms_hash || chr(31) || actual_hash, 'UTF8'),
        'sha256'
      ),
      'hex'
    );
    if version_row.milestone_manifest_hash is null
       or version_row.milestone_manifest_hash <> actual_hash
       or version_row.complete_terms_hash is null
       or version_row.complete_terms_hash <> actual_complete_hash then
      raise exception 'Finalize and review the milestone manifest before confirming this agreement version.';
    end if;
  end if;
  return new;
end;
$function$;

create or replace function moral_trade_private.bind_trade_confirmation_actor()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
begin
  if auth.uid() is null
     and coalesce(auth.jwt() ->> 'role', '') <> 'service_role' then
    raise exception 'A confirmation must belong to the authenticated participant.';
  end if;
  if auth.uid() is not null and new.user_id is distinct from auth.uid() then
    raise exception 'A confirmation must belong to the authenticated participant.';
  end if;
  return new;
end;
$function$;

drop trigger if exists bind_trade_confirmation_actor_trigger
  on public.trade_agreement_confirmations;
create trigger bind_trade_confirmation_actor_trigger
before insert on public.trade_agreement_confirmations
for each row execute function moral_trade_private.bind_trade_confirmation_actor();

drop trigger if exists require_final_trade_milestone_manifest_trigger
  on public.trade_agreement_confirmations;
create trigger require_final_trade_milestone_manifest_trigger
before insert on public.trade_agreement_confirmations
for each row execute function moral_trade_private.require_final_trade_milestone_manifest();

create or replace function moral_trade_private.activate_confirmed_trade_milestones()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
declare
  agreement_row public.agreements%rowtype;
  participant_confirmation_count integer;
begin
  select agreement.*
  into agreement_row
  from public.trade_agreement_versions version
  join public.agreements agreement on agreement.id = version.agreement_id
  where version.id = new.agreement_version_id
  for update of agreement;

  if not found or agreement_row.current_version_id <> new.agreement_version_id then
    return new;
  end if;

  select count(distinct confirmation.user_id)
  into participant_confirmation_count
  from public.trade_agreement_confirmations confirmation
  where confirmation.agreement_version_id = new.agreement_version_id
    and confirmation.user_id in (agreement_row.proposer_id, agreement_row.responder_id);

  if participant_confirmation_count = 2 then
    update public.trade_agreement_milestones milestone
    set status = 'evidence_due',
        updated_at = now()
    where milestone.agreement_version_id = new.agreement_version_id
      and milestone.agreement_id = agreement_row.id
      and milestone.status = 'terms';
  end if;

  return new;
end;
$function$;

drop trigger if exists activate_confirmed_trade_milestones_trigger
  on public.trade_agreement_confirmations;
create trigger activate_confirmed_trade_milestones_trigger
after insert on public.trade_agreement_confirmations
for each row execute function moral_trade_private.activate_confirmed_trade_milestones();

create or replace function moral_trade_private.guard_submitted_evidence_bundle_item()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
declare
  bundle_status text;
begin
  select b.status
  into bundle_status
  from public.trade_evidence_bundles b
  where b.id = coalesce(new.bundle_id, old.bundle_id)
  for update;

  if bundle_status is distinct from 'draft' then
    raise exception 'Submitted evidence packets are immutable.';
  end if;
  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$function$;

drop trigger if exists guard_submitted_evidence_bundle_item_trigger
  on public.trade_evidence_bundle_items;
create trigger guard_submitted_evidence_bundle_item_trigger
before insert or update or delete on public.trade_evidence_bundle_items
for each row execute function moral_trade_private.guard_submitted_evidence_bundle_item();

create or replace function public.create_trade_agreement_milestone_v1(
  p_agreement_version_id uuid,
  p_position integer,
  p_performer_id uuid,
  p_payer_id uuid,
  p_action_category text,
  p_description text,
  p_unit_label text,
  p_units_total numeric,
  p_indivisible boolean,
  p_maximum_amount_cents bigint,
  p_currency text,
  p_evidence_rule text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $function$
declare
  actor_id uuid := auth.uid();
  version_row public.trade_agreement_versions%rowtype;
  agreement_row public.agreements%rowtype;
  milestone_id uuid;
  position_value integer;
begin
  if actor_id is null then
    raise exception 'Sign in before defining milestone terms.';
  end if;

  select *
  into version_row
  from public.trade_agreement_versions v
  where v.id = p_agreement_version_id;
  if not found then
    raise exception 'Agreement version not found.';
  end if;

  select *
  into agreement_row
  from public.agreements a
  where a.id = version_row.agreement_id
  for update;

  select *
  into version_row
  from public.trade_agreement_versions v
  where v.id = p_agreement_version_id
    and v.agreement_id = agreement_row.id
  for update;

  if not found
     or actor_id not in (agreement_row.proposer_id, agreement_row.responder_id)
     or agreement_row.current_version_id <> version_row.id
     or agreement_row.lifecycle_status <> 'proposed' then
    raise exception 'Milestone terms may be added only to the current proposed version by a participant.';
  end if;
  if version_row.milestone_manifest_hash is not null
     or exists (
       select 1
       from public.trade_agreement_confirmations c
       where c.agreement_version_id = version_row.id
     ) then
    raise exception 'Milestone terms are already frozen.';
  end if;
  if p_performer_id not in (agreement_row.proposer_id, agreement_row.responder_id)
     or p_payer_id not in (agreement_row.proposer_id, agreement_row.responder_id)
     or p_performer_id = p_payer_id then
    raise exception 'The performer and payer must be the two distinct agreement participants.';
  end if;
  position_value := coalesce(
    p_position,
    (
      select coalesce(max(m.position), 0) + 1
      from public.trade_agreement_milestones m
      where m.agreement_version_id = version_row.id
    )
  );

  if position_value not between 1 and 100
     or p_units_total is null
     or p_units_total <= 0
     or (coalesce(p_indivisible, true) and p_units_total <> 1)
     or p_maximum_amount_cents is null
     or p_maximum_amount_cents < 0
     or upper(btrim(coalesce(p_currency, ''))) !~ '^[A-Z]{3}$'
     or lower(btrim(coalesce(p_action_category, ''))) not in (
       'donation', 'service', 'advocacy', 'research', 'lifestyle', 'other'
     )
     or length(btrim(coalesce(p_description, ''))) not between 1 and 5000
     or length(btrim(coalesce(p_unit_label, ''))) not between 1 and 120
     or length(btrim(coalesce(p_evidence_rule, ''))) not between 1 and 5000 then
    raise exception 'Complete every bounded milestone term.';
  end if;

  insert into public.trade_agreement_milestones (
    agreement_id,
    agreement_version_id,
    position,
    performer_id,
    payer_id,
    action_category,
    description,
    unit_label,
    units_total,
    indivisible,
    maximum_amount_cents,
    currency,
    evidence_rule
  ) values (
    agreement_row.id,
    version_row.id,
    position_value,
    p_performer_id,
    p_payer_id,
    lower(btrim(p_action_category)),
    btrim(p_description),
    btrim(p_unit_label),
    p_units_total,
    coalesce(p_indivisible, true),
    p_maximum_amount_cents,
    upper(btrim(p_currency)),
    btrim(p_evidence_rule)
  )
  returning id into milestone_id;

  update public.trade_agreement_versions
  set requires_milestone_manifest = true
  where id = version_row.id;

  return milestone_id;
end;
$function$;

create or replace function public.finalize_trade_milestone_manifest_v1(
  p_agreement_version_id uuid
)
returns text
language plpgsql
security definer
set search_path = ''
as $function$
declare
  actor_id uuid := auth.uid();
  version_row public.trade_agreement_versions%rowtype;
  agreement_row public.agreements%rowtype;
  manifest_hash text;
  complete_hash text;
begin
  if actor_id is null then
    raise exception 'Sign in before finalizing milestone terms.';
  end if;

  select *
  into version_row
  from public.trade_agreement_versions v
  where v.id = p_agreement_version_id;

  select *
  into agreement_row
  from public.agreements a
  where a.id = version_row.agreement_id
  for update;

  select *
  into version_row
  from public.trade_agreement_versions v
  where v.id = p_agreement_version_id
    and v.agreement_id = agreement_row.id
  for update;

  if not found
     or actor_id not in (agreement_row.proposer_id, agreement_row.responder_id)
     or agreement_row.current_version_id <> version_row.id
     or agreement_row.lifecycle_status <> 'proposed' then
    raise exception 'Only a participant may finalize the current proposed version.';
  end if;
  if exists (
    select 1
    from public.trade_agreement_confirmations c
    where c.agreement_version_id = version_row.id
  ) then
    raise exception 'A confirmed version cannot be changed.';
  end if;
  if not exists (
    select 1
    from public.trade_agreement_milestones m
    where m.agreement_version_id = version_row.id
  ) then
    raise exception 'Add at least one independently priced milestone.';
  end if;

  manifest_hash := public.trade_milestone_manifest_hash_v1(version_row.id);
  complete_hash := encode(
    extensions.digest(
      convert_to(version_row.terms_hash || chr(31) || manifest_hash, 'UTF8'),
      'sha256'
    ),
    'hex'
  );

  update public.trade_agreement_versions
  set requires_milestone_manifest = true,
      milestone_manifest_hash = manifest_hash,
      complete_terms_hash = complete_hash
  where id = version_row.id;

  return complete_hash;
end;
$function$;

create or replace function public.start_trade_milestone_amendment_v1(
  p_agreement_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $function$
declare
  actor_id uuid := auth.uid();
  agreement_row public.agreements%rowtype;
  current_version public.trade_agreement_versions%rowtype;
  next_version_number integer;
  next_version_id uuid;
begin
  if actor_id is null then
    raise exception 'Sign in before proposing amended milestone terms.';
  end if;

  select *
  into agreement_row
  from public.agreements agreement
  where agreement.id = p_agreement_id
  for update;

  if not found
     or actor_id not in (agreement_row.proposer_id, agreement_row.responder_id)
     or agreement_row.lifecycle_status <> 'proposed'
     or agreement_row.current_version_id is null then
    raise exception 'Only a participant may amend an unactivated proposed agreement.';
  end if;

  select *
  into current_version
  from public.trade_agreement_versions version
  where version.id = agreement_row.current_version_id
    and version.agreement_id = agreement_row.id
  for update;

  if not found then
    raise exception 'The current frozen agreement version is unavailable.';
  end if;
  if current_version.milestone_manifest_hash is null
     and not exists (
       select 1
       from public.trade_agreement_confirmations confirmation
       where confirmation.agreement_version_id = current_version.id
     ) then
    raise exception 'The current milestone draft is still editable; amend it before finalizing.';
  end if;

  select coalesce(max(version.version), 0) + 1
  into next_version_number
  from public.trade_agreement_versions version
  where version.agreement_id = agreement_row.id;

  insert into public.trade_agreement_versions (
    agreement_id,
    version,
    proposed_by,
    proposed_action,
    requested_action,
    duration,
    start_date,
    evidence_rule,
    evidence_due_date,
    exit_conditions,
    maximum_burden,
    privacy_scope,
    no_trade_baseline,
    terms_hash,
    requires_milestone_manifest,
    milestone_manifest_hash,
    complete_terms_hash,
    created_at
  ) values (
    agreement_row.id,
    next_version_number,
    actor_id,
    current_version.proposed_action,
    current_version.requested_action,
    current_version.duration,
    current_version.start_date,
    current_version.evidence_rule,
    current_version.evidence_due_date,
    current_version.exit_conditions,
    current_version.maximum_burden,
    current_version.privacy_scope,
    current_version.no_trade_baseline,
    current_version.terms_hash,
    true,
    null,
    null,
    now()
  )
  returning id into next_version_id;

  update public.agreements
  set current_version_id = next_version_id,
      status = 'proposed',
      lifecycle_status = 'proposed',
      evidence_due_at = current_version.evidence_due_date,
      updated_at = now()
  where id = agreement_row.id;

  insert into public.trade_notifications (
    user_id, notification_type, title, body, href, dedupe_key, created_at
  )
  select
    participant_id,
    'milestone_amendment_started',
    'Milestone amendment started',
    'A new proposed version is ready for milestone terms. Earlier confirmations do not apply.',
    '/trade-agreements/' || agreement_row.id::text,
    'milestone_amendment:' || next_version_id::text || ':' || participant_id::text,
    now()
  from unnest(
    array[agreement_row.proposer_id, agreement_row.responder_id]
  ) as participants(participant_id)
  on conflict (dedupe_key) do nothing;

  return next_version_id;
end;
$function$;

create or replace function public.open_trade_evidence_bundle_v1(
  p_milestone_id uuid,
  p_bundle_kind text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $function$
declare
  actor_id uuid := auth.uid();
  milestone_row public.trade_agreement_milestones%rowtype;
  agreement_row public.agreements%rowtype;
  attempt_value smallint;
  bundle_id uuid;
begin
  if actor_id is null or p_bundle_kind not in ('initial', 'replacement') then
    raise exception 'Choose an initial or replacement evidence packet.';
  end if;

  select *
  into milestone_row
  from public.trade_agreement_milestones m
  where m.id = p_milestone_id
  for update;
  if not found or milestone_row.performer_id <> actor_id then
    raise exception 'Only the milestone performer may submit evidence.';
  end if;

  select *
  into agreement_row
  from public.agreements a
  where a.id = milestone_row.agreement_id
  for update;
  if agreement_row.current_version_id <> milestone_row.agreement_version_id
     or agreement_row.lifecycle_status not in ('active', 'evidence_due', 'disputed') then
    raise exception 'Evidence is unavailable for this agreement version.';
  end if;

  select b.id
  into bundle_id
  from public.trade_evidence_bundles b
  where b.milestone_id = milestone_row.id
    and b.bundle_kind = p_bundle_kind
    and b.submitted_by = actor_id
    and b.status = 'draft'
  order by b.created_at, b.id
  limit 1;
  if bundle_id is not null then
    return bundle_id;
  end if;

  if p_bundle_kind = 'initial' then
    if exists (
      select 1
      from public.trade_evidence_bundles b
      where b.milestone_id = milestone_row.id
        and b.bundle_kind = 'initial'
    ) then
      raise exception 'The initial evidence packet already exists.';
    end if;
    attempt_value := 1;
  else
    if milestone_row.status <> 'replacement_due'
       or milestone_row.replacement_packet_used
       or milestone_row.replacement_deadline_at is null
       or milestone_row.replacement_deadline_at <= now()
       or exists (
         select 1
         from public.trade_milestone_appeals appeal
         where appeal.milestone_id = milestone_row.id
           and appeal.status <> 'resolved'
       ) then
      raise exception 'The one replacement packet is unavailable or its clock is paused.';
    end if;
    attempt_value := 2;
    update public.trade_agreement_milestones
    set replacement_packet_used = true,
        updated_at = now()
    where id = milestone_row.id;
  end if;

  insert into public.trade_evidence_bundles (
    milestone_id,
    submitted_by,
    bundle_kind,
    attempt_number
  ) values (
    milestone_row.id,
    actor_id,
    p_bundle_kind,
    attempt_value
  )
  returning id into bundle_id;

  return bundle_id;
end;
$function$;

create or replace function public.add_trade_evidence_bundle_item_v1(
  p_bundle_id uuid,
  p_evidence_type text,
  p_storage_path text,
  p_evidence_url text,
  p_attestation text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $function$
declare
  actor_id uuid := auth.uid();
  bundle_row public.trade_evidence_bundles%rowtype;
  item_id uuid;
  normalized_path text := btrim(coalesce(p_storage_path, ''));
  normalized_url text := btrim(coalesce(p_evidence_url, ''));
  normalized_attestation text := btrim(coalesce(p_attestation, ''));
begin
  select *
  into bundle_row
  from public.trade_evidence_bundles b
  where b.id = p_bundle_id
  for update;

  if actor_id is null
     or not found
     or bundle_row.submitted_by <> actor_id
     or bundle_row.status <> 'draft' then
    raise exception 'This evidence packet cannot be edited.';
  end if;
  if (
    select count(*)
    from public.trade_evidence_bundle_items item
    where item.bundle_id = bundle_row.id
  ) >= 50 then
    raise exception 'An evidence packet may contain at most 50 items.';
  end if;
  if p_evidence_type not in ('file', 'link', 'attestation')
     or length(normalized_path) > 1000
     or length(normalized_url) > 2000
     or length(normalized_attestation) > 10000 then
    raise exception 'Evidence item is invalid or too long.';
  end if;
  if p_evidence_type = 'file'
     and normalized_path not like actor_id::text || '/%' then
    raise exception 'Evidence files must stay in the performer''s private storage prefix.';
  end if;

  insert into public.trade_evidence_bundle_items (
    bundle_id,
    evidence_type,
    storage_path,
    evidence_url,
    attestation
  ) values (
    bundle_row.id,
    p_evidence_type,
    normalized_path,
    normalized_url,
    normalized_attestation
  )
  returning id into item_id;

  return item_id;
end;
$function$;

create or replace function public.submit_trade_evidence_bundle_v1(
  p_bundle_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  actor_id uuid := auth.uid();
  bundle_row public.trade_evidence_bundles%rowtype;
  milestone_row public.trade_agreement_milestones%rowtype;
begin
  select *
  into bundle_row
  from public.trade_evidence_bundles b
  where b.id = p_bundle_id;
  if actor_id is null
     or not found
     or bundle_row.submitted_by <> actor_id
     or bundle_row.status <> 'draft' then
    raise exception 'This evidence packet cannot be submitted.';
  end if;

  select *
  into milestone_row
  from public.trade_agreement_milestones m
  where m.id = bundle_row.milestone_id
  for update;

  select *
  into bundle_row
  from public.trade_evidence_bundles b
  where b.id = p_bundle_id
    and b.milestone_id = milestone_row.id
  for update;
  if not found
     or bundle_row.submitted_by <> actor_id
     or bundle_row.status <> 'draft' then
    raise exception 'This evidence packet cannot be submitted.';
  end if;

  if not exists (
    select 1
    from public.trade_evidence_bundle_items item
    where item.bundle_id = bundle_row.id
  ) then
    raise exception 'Add at least one evidence item.';
  end if;
  if bundle_row.bundle_kind = 'replacement'
     and (
       milestone_row.replacement_deadline_at is null
       or milestone_row.replacement_deadline_at <= now()
     ) then
    raise exception 'The replacement window has expired or is paused.';
  end if;

  update public.trade_evidence_bundles
  set status = 'submitted',
      submitted_at = now()
  where id = bundle_row.id;

  update public.trade_agreement_milestones
  set current_bundle_id = bundle_row.id,
      status = 'under_review',
      reviewer_selection_opened_at = coalesce(reviewer_selection_opened_at, now()),
      updated_at = now()
  where id = milestone_row.id;

  if milestone_row.assigned_reviewer_id is not null then
    insert into public.trade_notifications (
      user_id, notification_type, title, body, href, dedupe_key, created_at
    ) values (
      milestone_row.assigned_reviewer_id,
      'milestone_evidence_review',
      'Milestone evidence is ready',
      'A private evidence packet is ready for neutral review.',
      '/trade-review/' || milestone_row.id::text,
      'milestone_review:' || bundle_row.id::text,
      now()
    )
    on conflict (dedupe_key) do nothing;
  end if;

  return jsonb_build_object(
    'bundleId', bundle_row.id,
    'milestoneId', milestone_row.id,
    'status', 'under_review'
  );
end;
$function$;

create or replace function public.nominate_trade_milestone_reviewer_v1(
  p_milestone_id uuid,
  p_reviewer_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  actor_id uuid := auth.uid();
  milestone_row public.trade_agreement_milestones%rowtype;
  agreement_row public.agreements%rowtype;
  agreed_reviewer uuid;
begin
  select *
  into milestone_row
  from public.trade_agreement_milestones m
  where m.id = p_milestone_id
  for update;
  select *
  into agreement_row
  from public.agreements a
  where a.id = milestone_row.agreement_id
  for update;

  if actor_id is null
     or not found
     or actor_id not in (agreement_row.proposer_id, agreement_row.responder_id)
     or p_reviewer_id in (agreement_row.proposer_id, agreement_row.responder_id)
     or milestone_row.assigned_reviewer_id is not null then
    raise exception 'Reviewer nomination is unavailable.';
  end if;
  if not exists (
    select 1
    from public.trade_review_role_grants grant_row
    where grant_row.profile_id = p_reviewer_id
      and grant_row.role = 'reviewer'
      and grant_row.active
      and grant_row.revoked_at is null
  ) then
    raise exception 'Choose an active neutral reviewer.';
  end if;

  update public.trade_agreement_milestones
  set reviewer_selection_opened_at = coalesce(reviewer_selection_opened_at, now()),
      updated_at = now()
  where id = milestone_row.id;

  insert into public.trade_milestone_reviewer_nominations (
    milestone_id, nominated_by, reviewer_id
  ) values (
    milestone_row.id, actor_id, p_reviewer_id
  )
  on conflict (milestone_id, nominated_by) do update
  set reviewer_id = excluded.reviewer_id,
      created_at = now();

  select n.reviewer_id
  into agreed_reviewer
  from public.trade_milestone_reviewer_nominations n
  where n.milestone_id = milestone_row.id
    and n.nominated_by in (agreement_row.proposer_id, agreement_row.responder_id)
  group by n.reviewer_id
  having count(*) = 2
  limit 1;

  if agreed_reviewer is not null then
    update public.trade_agreement_milestones
    set assigned_reviewer_id = agreed_reviewer,
        updated_at = now()
    where id = milestone_row.id
      and assigned_reviewer_id is null;
  end if;

  return jsonb_build_object(
    'milestoneId', milestone_row.id,
    'assignedReviewerId', agreed_reviewer,
    'status', case when agreed_reviewer is null then 'awaiting_consensus' else 'assigned' end
  );
end;
$function$;

create or replace function public.admin_assign_trade_milestone_reviewer_v1(
  p_milestone_id uuid,
  p_reviewer_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  milestone_row public.trade_agreement_milestones%rowtype;
  agreement_row public.agreements%rowtype;
begin
  if not moral_trade_private.current_actor_has_trade_role('administrator') then
    raise exception 'Administrator assignment requires an active profile role and AAL2.';
  end if;

  select *
  into milestone_row
  from public.trade_agreement_milestones m
  where m.id = p_milestone_id
  for update;
  select *
  into agreement_row
  from public.agreements a
  where a.id = milestone_row.agreement_id
  for update;

  if not found
     or milestone_row.assigned_reviewer_id is not null
     or milestone_row.reviewer_selection_opened_at is null
     or milestone_row.reviewer_selection_opened_at + interval '7 days' > now()
     or p_reviewer_id in (agreement_row.proposer_id, agreement_row.responder_id)
     or not exists (
       select 1
       from public.trade_review_role_grants grant_row
       where grant_row.profile_id = p_reviewer_id
         and grant_row.role = 'reviewer'
         and grant_row.active
         and grant_row.revoked_at is null
     ) then
    raise exception 'Reviewer fallback is unavailable before the seven-day deadline.';
  end if;

  update public.trade_agreement_milestones
  set assigned_reviewer_id = p_reviewer_id,
      updated_at = now()
  where id = milestone_row.id;

  insert into public.trade_notifications (
    user_id, notification_type, title, body, href, dedupe_key, created_at
  ) values (
    p_reviewer_id,
    'milestone_reviewer_assigned',
    'Neutral review assigned',
    'An administrator assigned you after the participant selection deadline.',
    '/trade-review/' || milestone_row.id::text,
    'milestone_reviewer_assignment:' || milestone_row.id::text,
    now()
  )
  on conflict (dedupe_key) do nothing;

  return jsonb_build_object(
    'milestoneId', milestone_row.id,
    'assignedReviewerId', p_reviewer_id,
    'status', 'assigned'
  );
end;
$function$;

create or replace function public.list_trade_reviewer_candidates_v1()
returns table (
  profile_id uuid,
  display_name text
)
language sql
stable
security definer
set search_path = ''
as $function$
  select
    grant_row.profile_id,
    coalesce(nullif(btrim(profile.display_name), ''), 'Neutral reviewer') as display_name
  from public.trade_review_role_grants grant_row
  join public.profiles profile on profile.id = grant_row.profile_id
  where auth.uid() is not null
    and grant_row.role = 'reviewer'
    and grant_row.active
    and grant_row.revoked_at is null
    and grant_row.profile_id <> auth.uid()
  order by lower(coalesce(profile.display_name, '')), grant_row.profile_id
  limit 100;
$function$;

create or replace function public.grade_trade_milestone_v1(
  p_milestone_id uuid,
  p_bundle_id uuid,
  p_completion_units numeric,
  p_confidence_band smallint,
  p_outcome text,
  p_private_reason text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  actor_id uuid := auth.uid();
  milestone_row public.trade_agreement_milestones%rowtype;
  agreement_row public.agreements%rowtype;
  bundle_row public.trade_evidence_bundles%rowtype;
  completion_value numeric(20, 6);
  band_value smallint;
  basis_points_value integer;
  amount_due_value bigint;
  review_kind_value text;
  appeal_already_used boolean;
  final_value boolean;
  review_id uuid;
begin
  if not moral_trade_private.current_actor_has_trade_role('reviewer') then
    raise exception 'Neutral review requires an active profile role and AAL2.';
  end if;

  select *
  into milestone_row
  from public.trade_agreement_milestones m
  where m.id = p_milestone_id
  for update;
  select *
  into agreement_row
  from public.agreements a
  where a.id = milestone_row.agreement_id
  for update;
  select *
  into bundle_row
  from public.trade_evidence_bundles b
  where b.id = p_bundle_id
    and b.milestone_id = milestone_row.id
  for update;

  if not found
     or actor_id <> milestone_row.assigned_reviewer_id
     or actor_id in (agreement_row.proposer_id, agreement_row.responder_id)
     or milestone_row.current_bundle_id <> bundle_row.id
     or milestone_row.status <> 'under_review'
     or bundle_row.status <> 'submitted'
     or p_outcome not in ('graded', 'rejected')
     or p_confidence_band not in (0, 25, 50, 75, 100)
     or length(btrim(coalesce(p_private_reason, ''))) not between 1 and 4000 then
    raise exception 'This evidence packet cannot be graded.';
  end if;

  if p_outcome = 'rejected' then
    completion_value := 0;
    band_value := 0;
  else
    completion_value := p_completion_units;
    band_value := p_confidence_band;
    if completion_value is null
       or completion_value < 0
       or completion_value > milestone_row.units_total
       or (
         milestone_row.indivisible
         and completion_value not in (0, milestone_row.units_total)
       ) then
      raise exception 'Completion must follow the pre-agreed milestone units.';
    end if;
  end if;

  select calculation.payout_basis_points, calculation.amount_due_cents
  into basis_points_value, amount_due_value
  from public.trade_milestone_payout_v1(
    milestone_row.maximum_amount_cents,
    completion_value,
    milestone_row.units_total,
    band_value
  ) calculation;

  review_kind_value := case
    when bundle_row.bundle_kind = 'replacement' then 'replacement'
    else 'initial'
  end;
  appeal_already_used := exists (
    select 1
    from public.trade_milestone_appeals appeal
    where appeal.milestone_id = milestone_row.id
  );
  final_value := appeal_already_used;

  insert into public.trade_milestone_reviews (
    milestone_id,
    bundle_id,
    reviewer_id,
    review_kind,
    outcome,
    completion_units,
    confidence_band,
    payout_basis_points,
    amount_due_cents,
    private_reason,
    appeal_deadline_at,
    is_final,
    finalized_at
  ) values (
    milestone_row.id,
    bundle_row.id,
    actor_id,
    review_kind_value,
    p_outcome,
    completion_value,
    band_value,
    basis_points_value,
    amount_due_value,
    btrim(p_private_reason),
    now() + interval '7 days',
    final_value,
    case when final_value then now() else null end
  )
  returning id into review_id;

  update public.trade_evidence_bundles
  set status = case when p_outcome = 'rejected' then 'invalid' else 'accepted' end,
      reviewed_at = now()
  where id = bundle_row.id;

  insert into public.trade_milestone_payouts (
    milestone_id,
    review_id,
    payer_id,
    payee_id,
    maximum_amount_cents,
    completion_units,
    units_total,
    confidence_band,
    payout_basis_points,
    amount_due_cents,
    currency,
    is_final,
    status,
    finalized_at
  ) values (
    milestone_row.id,
    review_id,
    milestone_row.payer_id,
    milestone_row.performer_id,
    milestone_row.maximum_amount_cents,
    completion_value,
    milestone_row.units_total,
    band_value,
    basis_points_value,
    amount_due_value,
    milestone_row.currency,
    final_value,
    case
      when not final_value then 'provisional'
      when amount_due_value = 0 then 'not_due'
      else 'due'
    end,
    case when final_value then now() else null end
  )
  on conflict (milestone_id) do update
  set review_id = excluded.review_id,
      completion_units = excluded.completion_units,
      confidence_band = excluded.confidence_band,
      payout_basis_points = excluded.payout_basis_points,
      amount_due_cents = excluded.amount_due_cents,
      is_final = excluded.is_final,
      status = excluded.status,
      finalized_at = excluded.finalized_at,
      updated_at = now();

  if p_outcome = 'rejected' then
    update public.trade_agreement_milestones
    set status = case when final_value then 'evidence_due' else 'replacement_due' end,
        final_review_id = case when final_value then review_id else null end,
        replacement_deadline_at = case
          when final_value or replacement_packet_used then null
          else now() + interval '7 days'
        end,
        replacement_seconds_remaining = case
          when final_value or replacement_packet_used then null
          else 604800
        end,
        updated_at = now()
    where id = milestone_row.id;

    update public.agreements
    set lifecycle_status = 'evidence_due',
        future_obligations_paused_at = coalesce(future_obligations_paused_at, now()),
        future_obligations_pause_reason = 'Evidence was rejected; replacement evidence or prospective exit is required.',
        updated_at = now()
    where id = agreement_row.id;
  else
    update public.trade_agreement_milestones
    set status = 'graded',
        final_review_id = case when final_value then review_id else null end,
        replacement_deadline_at = null,
        replacement_seconds_remaining = null,
        updated_at = now()
    where id = milestone_row.id;

    if final_value
       and not exists (
         select 1
         from public.trade_agreement_milestones other
         where other.agreement_id = agreement_row.id
           and other.id <> milestone_row.id
           and other.status in ('replacement_due', 'appeal_pending', 'evidence_due')
       ) then
      update public.agreements
      set lifecycle_status = case
            when lifecycle_status = 'evidence_due' then 'active'
            else lifecycle_status
          end,
          future_obligations_paused_at = null,
          future_obligations_pause_reason = '',
          updated_at = now()
      where id = agreement_row.id;
    end if;
  end if;

  insert into public.trade_notifications (
    user_id, notification_type, title, body, href, dedupe_key, created_at
  )
  select
    participant_id,
    'milestone_reviewed',
    'Milestone review recorded',
    case
      when p_outcome = 'rejected'
        then 'Evidence was rejected. Replacement and appeal rules are now active.'
      else 'A neutral reviewer recorded the pre-agreed completion and confidence band.'
    end,
    '/trade-agreements/' || agreement_row.id::text,
    'milestone_reviewed:' || review_id::text || ':' || participant_id::text,
    now()
  from unnest(
    array[agreement_row.proposer_id, agreement_row.responder_id]
  ) as participants(participant_id)
  on conflict (dedupe_key) do nothing;

  return jsonb_build_object(
    'reviewId', review_id,
    'milestoneId', milestone_row.id,
    'outcome', p_outcome,
    'completionUnits', completion_value,
    'confidenceBand', band_value,
    'payoutBasisPoints', basis_points_value,
    'amountDueCents', amount_due_value,
    'currency', milestone_row.currency,
    'isFinal', final_value,
    'appealDeadlineAt', now() + interval '7 days'
  );
end;
$function$;

create or replace function public.finalize_trade_milestone_review_v1(
  p_milestone_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  actor_id uuid := auth.uid();
  milestone_row public.trade_agreement_milestones%rowtype;
  agreement_row public.agreements%rowtype;
  review_row public.trade_milestone_reviews%rowtype;
  payout_row public.trade_milestone_payouts%rowtype;
begin
  select *
  into milestone_row
  from public.trade_agreement_milestones m
  where m.id = p_milestone_id
  for update;
  select *
  into agreement_row
  from public.agreements a
  where a.id = milestone_row.agreement_id
  for update;
  select *
  into payout_row
  from public.trade_milestone_payouts payout
  where payout.milestone_id = milestone_row.id
  for update;
  select *
  into review_row
  from public.trade_milestone_reviews review
  where review.id = payout_row.review_id
  for update;

  if actor_id is null
     or not found
     or actor_id not in (agreement_row.proposer_id, agreement_row.responder_id)
     or payout_row.is_final
     or review_row.appeal_deadline_at > now()
     or exists (
       select 1
       from public.trade_milestone_appeals appeal
       where appeal.milestone_id = milestone_row.id
     )
     or (
       review_row.outcome = 'rejected'
       and not milestone_row.replacement_packet_used
       and milestone_row.replacement_deadline_at > now()
     ) then
    raise exception 'The review is not ready for finality.';
  end if;

  update public.trade_milestone_reviews
  set is_final = true,
      finalized_at = now()
  where id = review_row.id;

  update public.trade_milestone_payouts
  set is_final = true,
      status = case when amount_due_cents = 0 then 'not_due' else 'due' end,
      finalized_at = now(),
      updated_at = now()
  where id = payout_row.id
  returning * into payout_row;

  update public.trade_agreement_milestones
  set final_review_id = review_row.id,
      status = case when review_row.outcome = 'rejected' then 'evidence_due' else 'graded' end,
      replacement_deadline_at = null,
      replacement_seconds_remaining = null,
      updated_at = now()
  where id = milestone_row.id;

  if review_row.outcome = 'graded'
     and not exists (
       select 1
       from public.trade_agreement_milestones other
       where other.agreement_id = agreement_row.id
         and other.id <> milestone_row.id
         and other.status in ('replacement_due', 'appeal_pending', 'evidence_due')
     ) then
    update public.agreements
    set lifecycle_status = case
          when lifecycle_status = 'evidence_due' then 'active'
          else lifecycle_status
        end,
        future_obligations_paused_at = null,
        future_obligations_pause_reason = '',
        updated_at = now()
    where id = agreement_row.id;
  end if;

  return jsonb_build_object(
    'milestoneId', milestone_row.id,
    'reviewId', review_row.id,
    'payoutId', payout_row.id,
    'status', payout_row.status,
    'isFinal', true
  );
end;
$function$;

create or replace function public.open_trade_milestone_appeal_v1(
  p_milestone_id uuid,
  p_reason text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $function$
declare
  actor_id uuid := auth.uid();
  milestone_row public.trade_agreement_milestones%rowtype;
  agreement_row public.agreements%rowtype;
  payout_row public.trade_milestone_payouts%rowtype;
  review_row public.trade_milestone_reviews%rowtype;
  remaining_seconds integer;
  appeal_id uuid;
begin
  select *
  into milestone_row
  from public.trade_agreement_milestones m
  where m.id = p_milestone_id
  for update;
  select *
  into agreement_row
  from public.agreements a
  where a.id = milestone_row.agreement_id
  for update;
  select *
  into payout_row
  from public.trade_milestone_payouts payout
  where payout.milestone_id = milestone_row.id
  for update;
  select *
  into review_row
  from public.trade_milestone_reviews review
  where review.id = payout_row.review_id
  for update;

  if actor_id is null
     or not found
     or actor_id not in (agreement_row.proposer_id, agreement_row.responder_id)
     or review_row.is_final
     or review_row.appeal_deadline_at <= now()
     or exists (
       select 1
       from public.trade_milestone_appeals appeal
       where appeal.milestone_id = milestone_row.id
     )
     or exists (
       select 1
       from public.trade_evidence_bundles replacement
       where replacement.milestone_id = milestone_row.id
         and replacement.bundle_kind = 'replacement'
         and replacement.status <> 'draft'
         and replacement.id <> review_row.bundle_id
     )
     or length(btrim(coalesce(p_reason, ''))) not between 1 and 4000 then
    raise exception 'The single appeal is unavailable or its seven-day window has closed.';
  end if;

  remaining_seconds := case
    when milestone_row.replacement_deadline_at is null then null
    else greatest(
      0,
      least(
        604800,
        floor(extract(epoch from milestone_row.replacement_deadline_at - now()))::integer
      )
    )
  end;

  insert into public.trade_milestone_appeals (
    milestone_id,
    base_review_id,
    opened_by,
    reason,
    reviewer_selection_deadline_at,
    replacement_seconds_remaining
  ) values (
    milestone_row.id,
    review_row.id,
    actor_id,
    btrim(p_reason),
    now() + interval '7 days',
    remaining_seconds
  )
  returning id into appeal_id;

  update public.trade_agreement_milestones
  set status = 'appeal_pending',
      replacement_deadline_at = null,
      replacement_seconds_remaining = remaining_seconds,
      updated_at = now()
  where id = milestone_row.id;

  return appeal_id;
end;
$function$;

create or replace function public.nominate_trade_appeal_reviewer_v1(
  p_appeal_id uuid,
  p_reviewer_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  actor_id uuid := auth.uid();
  appeal_row public.trade_milestone_appeals%rowtype;
  milestone_row public.trade_agreement_milestones%rowtype;
  agreement_row public.agreements%rowtype;
  base_reviewer_id uuid;
  agreed_reviewer uuid;
begin
  select *
  into appeal_row
  from public.trade_milestone_appeals appeal
  where appeal.id = p_appeal_id
  for update;
  select *
  into milestone_row
  from public.trade_agreement_milestones milestone
  where milestone.id = appeal_row.milestone_id
  for update;
  select *
  into agreement_row
  from public.agreements agreement
  where agreement.id = milestone_row.agreement_id
  for update;
  select review.reviewer_id
  into base_reviewer_id
  from public.trade_milestone_reviews review
  where review.id = appeal_row.base_review_id;

  if actor_id is null
     or not found
     or actor_id not in (agreement_row.proposer_id, agreement_row.responder_id)
     or appeal_row.status <> 'reviewer_selection'
     or p_reviewer_id = base_reviewer_id
     or p_reviewer_id in (agreement_row.proposer_id, agreement_row.responder_id)
     or not exists (
       select 1
       from public.trade_review_role_grants grant_row
       where grant_row.profile_id = p_reviewer_id
         and grant_row.role = 'reviewer'
         and grant_row.active
         and grant_row.revoked_at is null
     ) then
    raise exception 'Choose a different active neutral appeal reviewer.';
  end if;

  insert into public.trade_appeal_reviewer_nominations (
    appeal_id, nominated_by, reviewer_id
  ) values (
    appeal_row.id, actor_id, p_reviewer_id
  )
  on conflict (appeal_id, nominated_by) do update
  set reviewer_id = excluded.reviewer_id,
      created_at = now();

  select nomination.reviewer_id
  into agreed_reviewer
  from public.trade_appeal_reviewer_nominations nomination
  where nomination.appeal_id = appeal_row.id
    and nomination.nominated_by in (agreement_row.proposer_id, agreement_row.responder_id)
  group by nomination.reviewer_id
  having count(*) = 2
  limit 1;

  if agreed_reviewer is not null then
    update public.trade_milestone_appeals
    set assigned_reviewer_id = agreed_reviewer,
        status = 'assigned'
    where id = appeal_row.id;
  end if;

  return jsonb_build_object(
    'appealId', appeal_row.id,
    'assignedReviewerId', agreed_reviewer,
    'status', case when agreed_reviewer is null then 'awaiting_consensus' else 'assigned' end
  );
end;
$function$;

create or replace function public.admin_assign_trade_appeal_reviewer_v1(
  p_appeal_id uuid,
  p_reviewer_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  appeal_row public.trade_milestone_appeals%rowtype;
  milestone_row public.trade_agreement_milestones%rowtype;
  agreement_row public.agreements%rowtype;
  base_reviewer_id uuid;
begin
  if not moral_trade_private.current_actor_has_trade_role('administrator') then
    raise exception 'Administrator assignment requires an active profile role and AAL2.';
  end if;

  select *
  into appeal_row
  from public.trade_milestone_appeals appeal
  where appeal.id = p_appeal_id
  for update;
  select *
  into milestone_row
  from public.trade_agreement_milestones milestone
  where milestone.id = appeal_row.milestone_id
  for update;
  select *
  into agreement_row
  from public.agreements agreement
  where agreement.id = milestone_row.agreement_id
  for update;
  select review.reviewer_id
  into base_reviewer_id
  from public.trade_milestone_reviews review
  where review.id = appeal_row.base_review_id;

  if not found
     or appeal_row.status <> 'reviewer_selection'
     or appeal_row.reviewer_selection_deadline_at > now()
     or p_reviewer_id = base_reviewer_id
     or p_reviewer_id in (agreement_row.proposer_id, agreement_row.responder_id)
     or not exists (
       select 1
       from public.trade_review_role_grants grant_row
       where grant_row.profile_id = p_reviewer_id
         and grant_row.role = 'reviewer'
         and grant_row.active
         and grant_row.revoked_at is null
     ) then
    raise exception 'Appeal reviewer fallback is unavailable before the seven-day deadline.';
  end if;

  update public.trade_milestone_appeals
  set assigned_reviewer_id = p_reviewer_id,
      status = 'assigned'
  where id = appeal_row.id;

  insert into public.trade_notifications (
    user_id, notification_type, title, body, href, dedupe_key, created_at
  ) values (
    p_reviewer_id,
    'appeal_reviewer_assigned',
    'Appeal review assigned',
    'An administrator assigned you after the participant selection deadline.',
    '/trade-review/' || milestone_row.id::text,
    'appeal_reviewer_assignment:' || appeal_row.id::text,
    now()
  )
  on conflict (dedupe_key) do nothing;

  return jsonb_build_object(
    'appealId', appeal_row.id,
    'assignedReviewerId', p_reviewer_id,
    'status', 'assigned'
  );
end;
$function$;

create or replace function public.resolve_trade_milestone_appeal_v1(
  p_appeal_id uuid,
  p_completion_units numeric,
  p_confidence_band smallint,
  p_outcome text,
  p_private_reason text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  actor_id uuid := auth.uid();
  appeal_row public.trade_milestone_appeals%rowtype;
  milestone_row public.trade_agreement_milestones%rowtype;
  agreement_row public.agreements%rowtype;
  base_review_row public.trade_milestone_reviews%rowtype;
  bundle_row public.trade_evidence_bundles%rowtype;
  completion_value numeric(20, 6);
  band_value smallint;
  final_outcome text;
  basis_points_value integer;
  amount_due_value bigint;
  appeal_review_id uuid;
  resume_seconds integer;
begin
  if not moral_trade_private.current_actor_has_trade_role('reviewer') then
    raise exception 'Appeal review requires an active profile role and AAL2.';
  end if;

  select *
  into appeal_row
  from public.trade_milestone_appeals appeal
  where appeal.id = p_appeal_id
  for update;
  select *
  into milestone_row
  from public.trade_agreement_milestones milestone
  where milestone.id = appeal_row.milestone_id
  for update;
  select *
  into agreement_row
  from public.agreements agreement
  where agreement.id = milestone_row.agreement_id
  for update;
  select *
  into base_review_row
  from public.trade_milestone_reviews review
  where review.id = appeal_row.base_review_id
  for update;
  select *
  into bundle_row
  from public.trade_evidence_bundles bundle
  where bundle.id = base_review_row.bundle_id
  for update;

  if not found
     or appeal_row.status <> 'assigned'
     or appeal_row.assigned_reviewer_id <> actor_id
     or base_review_row.reviewer_id = actor_id
     or actor_id in (agreement_row.proposer_id, agreement_row.responder_id)
     or p_outcome not in ('upheld', 'regraded', 'graded', 'rejected')
     or length(btrim(coalesce(p_private_reason, ''))) not between 1 and 4000 then
    raise exception 'This appeal cannot be resolved by the current reviewer.';
  end if;

  if p_outcome = 'upheld' then
    completion_value := base_review_row.completion_units;
    band_value := base_review_row.confidence_band;
    final_outcome := base_review_row.outcome;
  elsif p_outcome = 'rejected' then
    completion_value := 0;
    band_value := 0;
    final_outcome := 'rejected';
  else
    completion_value := p_completion_units;
    band_value := p_confidence_band;
    final_outcome := 'graded';
    if band_value not in (0, 25, 50, 75, 100)
       or completion_value is null
       or completion_value < 0
       or completion_value > milestone_row.units_total
       or (
         milestone_row.indivisible
         and completion_value not in (0, milestone_row.units_total)
       ) then
      raise exception 'Appeal grading must follow the frozen units and confidence bands.';
    end if;
  end if;

  select calculation.payout_basis_points, calculation.amount_due_cents
  into basis_points_value, amount_due_value
  from public.trade_milestone_payout_v1(
    milestone_row.maximum_amount_cents,
    completion_value,
    milestone_row.units_total,
    band_value
  ) calculation;

  insert into public.trade_milestone_reviews (
    milestone_id,
    bundle_id,
    reviewer_id,
    review_kind,
    base_review_id,
    outcome,
    completion_units,
    confidence_band,
    payout_basis_points,
    amount_due_cents,
    private_reason,
    appeal_deadline_at,
    is_final,
    finalized_at
  ) values (
    milestone_row.id,
    bundle_row.id,
    actor_id,
    'appeal',
    base_review_row.id,
    final_outcome,
    completion_value,
    band_value,
    basis_points_value,
    amount_due_value,
    btrim(p_private_reason),
    now(),
    true,
    now()
  )
  returning id into appeal_review_id;

  update public.trade_milestone_appeals
  set status = 'resolved',
      resolved_at = now()
  where id = appeal_row.id;

  update public.trade_evidence_bundles
  set status = case when final_outcome = 'rejected' then 'invalid' else 'accepted' end,
      reviewed_at = now()
  where id = bundle_row.id;

  update public.trade_milestone_payouts
  set review_id = appeal_review_id,
      completion_units = completion_value,
      confidence_band = band_value,
      payout_basis_points = basis_points_value,
      amount_due_cents = amount_due_value,
      is_final = true,
      status = case when amount_due_value = 0 then 'not_due' else 'due' end,
      finalized_at = now(),
      updated_at = now()
  where milestone_id = milestone_row.id;

  if final_outcome = 'rejected' then
    resume_seconds := case
      when exists (
        select 1
        from public.trade_evidence_bundles replacement
        where replacement.milestone_id = milestone_row.id
          and replacement.bundle_kind = 'replacement'
          and replacement.status <> 'draft'
      ) then 0
      else coalesce(appeal_row.replacement_seconds_remaining, 0)
    end;

    update public.trade_agreement_milestones
    set final_review_id = appeal_review_id,
        status = case when resume_seconds > 0 then 'replacement_due' else 'evidence_due' end,
        replacement_deadline_at = case
          when resume_seconds > 0 then now() + make_interval(secs => resume_seconds)
          else null
        end,
        replacement_seconds_remaining = case
          when resume_seconds > 0 then resume_seconds
          else null
        end,
        updated_at = now()
    where id = milestone_row.id;

    update public.agreements
    set lifecycle_status = 'evidence_due',
        future_obligations_paused_at = coalesce(future_obligations_paused_at, now()),
        future_obligations_pause_reason = 'Evidence rejection was upheld; unused replacement time resumed.',
        updated_at = now()
    where id = agreement_row.id;
  else
    update public.trade_agreement_milestones
    set final_review_id = appeal_review_id,
        status = 'graded',
        replacement_deadline_at = null,
        replacement_seconds_remaining = null,
        updated_at = now()
    where id = milestone_row.id;

    if not exists (
      select 1
      from public.trade_agreement_milestones other
      where other.agreement_id = agreement_row.id
        and other.id <> milestone_row.id
        and other.status in ('replacement_due', 'appeal_pending', 'evidence_due')
    ) then
      update public.agreements
      set lifecycle_status = case
            when lifecycle_status = 'evidence_due' then 'active'
            else lifecycle_status
          end,
          future_obligations_paused_at = null,
          future_obligations_pause_reason = '',
          updated_at = now()
      where id = agreement_row.id;
    end if;
  end if;

  insert into public.trade_notifications (
    user_id, notification_type, title, body, href, dedupe_key, created_at
  )
  select
    participant_id,
    'milestone_appeal_resolved',
    'Milestone appeal resolved',
    'A different neutral reviewer recorded the final milestone decision.',
    '/trade-agreements/' || agreement_row.id::text,
    'milestone_appeal_resolved:' || appeal_row.id::text || ':' || participant_id::text,
    now()
  from unnest(
    array[agreement_row.proposer_id, agreement_row.responder_id]
  ) as participants(participant_id)
  on conflict (dedupe_key) do nothing;

  return jsonb_build_object(
    'appealId', appeal_row.id,
    'reviewId', appeal_review_id,
    'milestoneId', milestone_row.id,
    'outcome', final_outcome,
    'completionUnits', completion_value,
    'confidenceBand', band_value,
    'payoutBasisPoints', basis_points_value,
    'amountDueCents', amount_due_value,
    'currency', milestone_row.currency,
    'isFinal', true
  );
end;
$function$;

create or replace function public.report_trade_external_payment_v1(
  p_payout_id uuid,
  p_provider text,
  p_provider_reference text,
  p_amount_cents bigint,
  p_currency text,
  p_paid_on date,
  p_receipt_storage_path text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $function$
declare
  actor_id uuid := auth.uid();
  payout_row public.trade_milestone_payouts%rowtype;
  normalized_provider text := btrim(coalesce(p_provider, ''));
  normalized_reference text := btrim(coalesce(p_provider_reference, ''));
  normalized_currency text := upper(btrim(coalesce(p_currency, '')));
  normalized_path text := btrim(coalesce(p_receipt_storage_path, ''));
  fingerprint text;
  receipt_id uuid;
  existing_receipt public.trade_external_payment_receipts%rowtype;
begin
  fingerprint := encode(
    extensions.digest(
      convert_to(
        lower(normalized_provider) || chr(31) || normalized_reference,
        'UTF8'
      ),
      'sha256'
    ),
    'hex'
  );

  select *
  into payout_row
  from public.trade_milestone_payouts payout
  where payout.id = p_payout_id
  for update;

  select *
  into existing_receipt
  from public.trade_external_payment_receipts receipt
  where receipt.payout_id = p_payout_id
  for update;

  if found then
    if existing_receipt.reported_by = actor_id
       and existing_receipt.provider = normalized_provider
       and existing_receipt.reference_fingerprint = fingerprint
       and existing_receipt.amount_cents = p_amount_cents
       and existing_receipt.currency = normalized_currency
       and existing_receipt.paid_on = p_paid_on
       and existing_receipt.receipt_storage_path = normalized_path then
      return existing_receipt.id;
    end if;
    raise exception 'A different external payment report already exists for this payout.';
  end if;

  if actor_id is null
     or payout_row.id is null
     or payout_row.payer_id <> actor_id
     or not payout_row.is_final
     or payout_row.status <> 'due'
     or p_amount_cents <> payout_row.amount_due_cents
     or normalized_currency <> payout_row.currency
     or p_paid_on is null
     or p_paid_on < payout_row.finalized_at::date
     or p_paid_on > current_date
     or length(normalized_provider) not between 1 and 120
     or length(normalized_reference) not between 1 and 500
     or length(normalized_path) > 1000
     or (
       normalized_path <> ''
       and normalized_path not like actor_id::text || '/%'
     ) then
    raise exception 'External payment must exactly match the final private amount due.';
  end if;

  insert into public.trade_external_payment_receipts (
    payout_id,
    reported_by,
    provider,
    provider_reference,
    reference_fingerprint,
    amount_cents,
    currency,
    paid_on,
    receipt_storage_path
  ) values (
    payout_row.id,
    actor_id,
    normalized_provider,
    normalized_reference,
    fingerprint,
    p_amount_cents,
    normalized_currency,
    p_paid_on,
    normalized_path
  )
  returning id into receipt_id;

  update public.trade_milestone_payouts
  set status = 'reported_paid',
      updated_at = now()
  where id = payout_row.id;

  insert into public.trade_notifications (
    user_id, notification_type, title, body, href, dedupe_key, created_at
  )
  select
    payout_row.payee_id,
    'external_payment_reported',
    'External payment reported',
    'The payer recorded an external payment. Review the private receipt and confirm or dispute it.',
    '/trade-agreements/' || milestone.agreement_id::text,
    'external_payment_reported:' || receipt_id::text,
    now()
  from public.trade_agreement_milestones milestone
  where milestone.id = payout_row.milestone_id
  on conflict (dedupe_key) do nothing;

  return receipt_id;
end;
$function$;

create or replace function public.respond_trade_external_payment_v1(
  p_receipt_id uuid,
  p_response text,
  p_note text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  actor_id uuid := auth.uid();
  receipt_row public.trade_external_payment_receipts%rowtype;
  payout_row public.trade_milestone_payouts%rowtype;
  milestone_id_value uuid;
begin
  select *
  into receipt_row
  from public.trade_external_payment_receipts receipt
  where receipt.id = p_receipt_id
  for update;
  select *
  into payout_row
  from public.trade_milestone_payouts payout
  where payout.id = receipt_row.payout_id
  for update;

  if actor_id is null
     or not found
     or payout_row.payee_id <> actor_id
     or receipt_row.status <> 'reported'
     or payout_row.status <> 'reported_paid'
     or p_response not in ('confirm', 'dispute')
     or length(btrim(coalesce(p_note, ''))) > 2000 then
    raise exception 'This external payment response is unavailable.';
  end if;

  update public.trade_external_payment_receipts
  set status = case when p_response = 'confirm' then 'confirmed' else 'disputed' end,
      counterparty_note = btrim(coalesce(p_note, '')),
      responded_at = now()
  where id = receipt_row.id;

  update public.trade_milestone_payouts
  set status = case when p_response = 'confirm' then 'confirmed' else 'disputed' end,
      updated_at = now()
  where id = payout_row.id;

  update public.trade_agreement_milestones
  set status = case when p_response = 'confirm' then 'paid' else status end,
      updated_at = now()
  where id = payout_row.milestone_id
  returning id into milestone_id_value;

  return jsonb_build_object(
    'receiptId', receipt_row.id,
    'payoutId', payout_row.id,
    'milestoneId', milestone_id_value,
    'status', case when p_response = 'confirm' then 'confirmed' else 'disputed' end
  );
end;
$function$;

-- Exact policy-4A projection. The record object deliberately contains no
-- identifier, identity, amount, currency, provider, receipt, exact timestamp,
-- evidence text, filename, or object path.
create or replace function public.list_public_moral_trade_outcomes_v2(
  p_limit integer default 24,
  p_offset integer default 0
)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $function$
  with eligible as (
    select
      milestone.action_category,
      case
        when payout.status = 'confirmed' then 'paid'
        when payout.status = 'disputed' then 'payment_disputed'
        when review.outcome = 'rejected' then 'evidence_due'
        else 'graded'
      end as lifecycle_status,
      review.confidence_band,
      round(review.completion_units / milestone.units_total, 6) as completion_fraction,
      (review.payout_basis_points::numeric / 100)::numeric(7, 2) as payout_percentage,
      review.finalized_at::date as outcome_date,
      review.finalized_at,
      milestone.id
    from public.trade_agreement_milestones milestone
    join public.trade_milestone_reviews review
      on review.id = milestone.final_review_id
     and review.is_final
     and review.finalized_at is not null
    join public.trade_milestone_payouts payout
      on payout.milestone_id = milestone.id
     and payout.review_id = review.id
     and payout.is_final
    where milestone.status in ('graded', 'paid', 'evidence_due')
       or (
         milestone.status = 'replacement_due'
         and milestone.replacement_deadline_at <= now()
       )
  ),
  outcome_page as (
    select *
    from eligible
    order by finalized_at desc, id desc
    limit least(greatest(coalesce(p_limit, 24), 1), 50)
    offset least(greatest(coalesce(p_offset, 0), 0), 100000)
  )
  select jsonb_build_object(
    'totalRecords', (select count(*) from eligible),
    'records', coalesce(
      (
        select jsonb_agg(
          jsonb_build_object(
            'actionCategory', outcome_page.action_category,
            'lifecycleStatus', outcome_page.lifecycle_status,
            'confidenceBand', outcome_page.confidence_band,
            'completionFraction', outcome_page.completion_fraction,
            'payoutPercentage', outcome_page.payout_percentage,
            'date', outcome_page.outcome_date
          )
          order by outcome_page.finalized_at desc, outcome_page.id desc
        )
        from outcome_page
      ),
      '[]'::jsonb
    )
  );
$function$;

create or replace function public.get_safe_profile_labels_v1(
  p_profile_ids uuid[]
)
returns table (
  id uuid,
  display_name text
)
language sql
stable
security definer
set search_path = ''
as $function$
  select
    profile.id,
    coalesce(nullif(btrim(profile.display_name), ''), 'Moral Trade participant')
  from public.profiles profile
  join (
    select distinct candidate.profile_id
    from unnest(coalesce(p_profile_ids, array[]::uuid[])) as candidate(profile_id)
    limit 100
  ) requested on requested.profile_id = profile.id
  where cardinality(coalesce(p_profile_ids, array[]::uuid[])) <= 100
  order by profile.id;
$function$;

drop view if exists public.public_profile_cards_v1;
create view public.public_profile_cards_v1
with (security_barrier = true)
as
select
  profile.id,
  profile.display_name,
  profile.bio,
  profile.follower_count,
  profile.following_count,
  profile.karma,
  profile.comment_count,
  profile.rating_avg,
  profile.rating_count,
  profile.offer_count,
  profile.created_at,
  profile.public_location_granularity,
  case
    when profile.public_location_granularity = 'city' then profile.city
    else null
  end as city,
  case
    when profile.public_location_granularity in ('city', 'region') then profile.region
    else null
  end as region,
  case
    when profile.public_location_granularity <> 'hidden' then profile.country
    else null
  end as country
from public.profiles profile;

alter view public.public_profile_cards_v1 owner to postgres;
revoke all on table public.public_profile_cards_v1 from public, anon, authenticated;
grant select on table public.public_profile_cards_v1 to anon, authenticated;

comment on view public.public_profile_cards_v1 is
  'Sanitized public profile cards. Email and location detail beyond the participant-selected granularity are never projected.';

alter table public.trade_review_role_grants enable row level security;
alter table public.trade_agreement_milestones enable row level security;
alter table public.trade_milestone_reviewer_nominations enable row level security;
alter table public.trade_evidence_bundles enable row level security;
alter table public.trade_evidence_bundle_items enable row level security;
alter table public.trade_milestone_reviews enable row level security;
alter table public.trade_milestone_appeals enable row level security;
alter table public.trade_appeal_reviewer_nominations enable row level security;
alter table public.trade_milestone_payouts enable row level security;
alter table public.trade_external_payment_receipts enable row level security;

drop policy if exists "trade_review_role_grants_self_select"
  on public.trade_review_role_grants;
create policy "trade_review_role_grants_self_select"
on public.trade_review_role_grants
for select
to authenticated
using (profile_id = (select auth.uid()));

drop policy if exists "trade_agreement_milestones_authorized_select"
  on public.trade_agreement_milestones;
create policy "trade_agreement_milestones_authorized_select"
on public.trade_agreement_milestones
for select
to authenticated
using (
  exists (
    select 1
    from public.agreements agreement
    where agreement.id = trade_agreement_milestones.agreement_id
      and (select auth.uid()) in (agreement.proposer_id, agreement.responder_id)
  )
  or assigned_reviewer_id = (select auth.uid())
  or exists (
    select 1
    from public.trade_milestone_appeals appeal
    where appeal.milestone_id = trade_agreement_milestones.id
      and appeal.assigned_reviewer_id = (select auth.uid())
  )
  or moral_trade_private.current_actor_has_trade_role('administrator')
);

drop policy if exists "trade_milestone_reviewer_nominations_participant_select"
  on public.trade_milestone_reviewer_nominations;
create policy "trade_milestone_reviewer_nominations_participant_select"
on public.trade_milestone_reviewer_nominations
for select
to authenticated
using (
  exists (
    select 1
    from public.trade_agreement_milestones milestone
    join public.agreements agreement on agreement.id = milestone.agreement_id
    where milestone.id = trade_milestone_reviewer_nominations.milestone_id
      and (select auth.uid()) in (agreement.proposer_id, agreement.responder_id)
  )
  or moral_trade_private.current_actor_has_trade_role('administrator')
);

drop policy if exists "trade_evidence_bundles_authorized_select"
  on public.trade_evidence_bundles;
create policy "trade_evidence_bundles_authorized_select"
on public.trade_evidence_bundles
for select
to authenticated
using (
  submitted_by = (select auth.uid())
  or (
    status <> 'draft'
    and (
      exists (
    select 1
    from public.trade_agreement_milestones milestone
    join public.agreements agreement on agreement.id = milestone.agreement_id
    where milestone.id = trade_evidence_bundles.milestone_id
      and (
        (select auth.uid()) in (agreement.proposer_id, agreement.responder_id)
        or milestone.assigned_reviewer_id = (select auth.uid())
        or exists (
          select 1
          from public.trade_milestone_appeals appeal
          where appeal.milestone_id = milestone.id
            and appeal.assigned_reviewer_id = (select auth.uid())
        )
      )
      )
      or moral_trade_private.current_actor_has_trade_role('administrator')
    )
  )
);

drop policy if exists "trade_evidence_bundle_items_authorized_select"
  on public.trade_evidence_bundle_items;
create policy "trade_evidence_bundle_items_authorized_select"
on public.trade_evidence_bundle_items
for select
to authenticated
using (
  exists (
    select 1
    from public.trade_evidence_bundles bundle
    join public.trade_agreement_milestones milestone on milestone.id = bundle.milestone_id
    join public.agreements agreement on agreement.id = milestone.agreement_id
    where bundle.id = trade_evidence_bundle_items.bundle_id
      and (
        (bundle.status = 'draft' and bundle.submitted_by = (select auth.uid()))
        or (
          bundle.status <> 'draft'
          and (
            (select auth.uid()) in (agreement.proposer_id, agreement.responder_id)
            or milestone.assigned_reviewer_id = (select auth.uid())
            or exists (
              select 1
              from public.trade_milestone_appeals appeal
              where appeal.milestone_id = milestone.id
                and appeal.assigned_reviewer_id = (select auth.uid())
            )
            or moral_trade_private.current_actor_has_trade_role('administrator')
          )
        )
      )
  )
);

drop policy if exists "trade_milestone_reviews_authorized_select"
  on public.trade_milestone_reviews;
create policy "trade_milestone_reviews_authorized_select"
on public.trade_milestone_reviews
for select
to authenticated
using (
  reviewer_id = (select auth.uid())
  or exists (
    select 1
    from public.trade_agreement_milestones milestone
    join public.agreements agreement on agreement.id = milestone.agreement_id
    where milestone.id = trade_milestone_reviews.milestone_id
      and (
        (select auth.uid()) in (agreement.proposer_id, agreement.responder_id)
        or exists (
          select 1
          from public.trade_milestone_appeals appeal
          where appeal.milestone_id = milestone.id
            and appeal.assigned_reviewer_id = (select auth.uid())
        )
      )
  )
  or moral_trade_private.current_actor_has_trade_role('administrator')
);

drop policy if exists "trade_milestone_appeals_authorized_select"
  on public.trade_milestone_appeals;
create policy "trade_milestone_appeals_authorized_select"
on public.trade_milestone_appeals
for select
to authenticated
using (
  assigned_reviewer_id = (select auth.uid())
  or exists (
    select 1
    from public.trade_agreement_milestones milestone
    join public.agreements agreement on agreement.id = milestone.agreement_id
    where milestone.id = trade_milestone_appeals.milestone_id
      and (select auth.uid()) in (agreement.proposer_id, agreement.responder_id)
  )
  or moral_trade_private.current_actor_has_trade_role('administrator')
);

drop policy if exists "trade_appeal_reviewer_nominations_participant_select"
  on public.trade_appeal_reviewer_nominations;
create policy "trade_appeal_reviewer_nominations_participant_select"
on public.trade_appeal_reviewer_nominations
for select
to authenticated
using (
  exists (
    select 1
    from public.trade_milestone_appeals appeal
    join public.trade_agreement_milestones milestone on milestone.id = appeal.milestone_id
    join public.agreements agreement on agreement.id = milestone.agreement_id
    where appeal.id = trade_appeal_reviewer_nominations.appeal_id
      and (select auth.uid()) in (agreement.proposer_id, agreement.responder_id)
  )
  or moral_trade_private.current_actor_has_trade_role('administrator')
);

drop policy if exists "trade_milestone_payouts_authorized_select"
  on public.trade_milestone_payouts;
create policy "trade_milestone_payouts_authorized_select"
on public.trade_milestone_payouts
for select
to authenticated
using (
  (select auth.uid()) in (payer_id, payee_id)
  or exists (
    select 1
    from public.trade_agreement_milestones milestone
    where milestone.id = trade_milestone_payouts.milestone_id
      and (
        milestone.assigned_reviewer_id = (select auth.uid())
        or exists (
          select 1
          from public.trade_milestone_appeals appeal
          where appeal.milestone_id = milestone.id
            and appeal.assigned_reviewer_id = (select auth.uid())
        )
      )
  )
  or moral_trade_private.current_actor_has_trade_role('administrator')
);

drop policy if exists "trade_external_payment_receipts_participant_select"
  on public.trade_external_payment_receipts;
create policy "trade_external_payment_receipts_participant_select"
on public.trade_external_payment_receipts
for select
to authenticated
using (
  exists (
    select 1
    from public.trade_milestone_payouts payout
    where payout.id = trade_external_payment_receipts.payout_id
      and (select auth.uid()) in (payout.payer_id, payout.payee_id)
  )
  or moral_trade_private.current_actor_has_trade_role('administrator')
);

revoke all on table
  public.trade_review_role_grants,
  public.trade_agreement_milestones,
  public.trade_milestone_reviewer_nominations,
  public.trade_evidence_bundles,
  public.trade_evidence_bundle_items,
  public.trade_milestone_reviews,
  public.trade_milestone_appeals,
  public.trade_appeal_reviewer_nominations,
  public.trade_milestone_payouts,
  public.trade_external_payment_receipts
from anon, authenticated;

grant select on table
  public.trade_review_role_grants,
  public.trade_agreement_milestones,
  public.trade_milestone_reviewer_nominations,
  public.trade_evidence_bundles,
  public.trade_evidence_bundle_items,
  public.trade_milestone_reviews,
  public.trade_milestone_appeals,
  public.trade_appeal_reviewer_nominations,
  public.trade_milestone_payouts,
  public.trade_external_payment_receipts
to authenticated;

grant all on table
  public.trade_review_role_grants,
  public.trade_agreement_milestones,
  public.trade_milestone_reviewer_nominations,
  public.trade_evidence_bundles,
  public.trade_evidence_bundle_items,
  public.trade_milestone_reviews,
  public.trade_milestone_appeals,
  public.trade_appeal_reviewer_nominations,
  public.trade_milestone_payouts,
  public.trade_external_payment_receipts
to service_role;

create or replace function moral_trade_private.guard_counterproposal_milestone_terms()
returns trigger
language plpgsql
set search_path = ''
as $function$
begin
  if new.milestone_terms is distinct from old.milestone_terms then
    raise exception 'Counterproposal milestone terms are immutable; create a new proposal round.';
  end if;
  return new;
end;
$function$;

drop trigger if exists guard_counterproposal_milestone_terms_trigger
  on public.trade_counterproposals;
create trigger guard_counterproposal_milestone_terms_trigger
before update on public.trade_counterproposals
for each row execute function moral_trade_private.guard_counterproposal_milestone_terms();

revoke all on function public.trade_milestone_manifest_hash_v1(uuid)
  from public, anon, authenticated;
revoke all on function public.trade_milestone_payout_v1(bigint, numeric, numeric, smallint)
  from public, anon, authenticated;
revoke all on function moral_trade_private.current_actor_has_trade_role(text)
  from public, anon;
revoke all on function moral_trade_private.guard_frozen_trade_milestone()
  from public, anon, authenticated;
revoke all on function moral_trade_private.require_final_trade_milestone_manifest()
  from public, anon, authenticated;
revoke all on function moral_trade_private.bind_trade_confirmation_actor()
  from public, anon, authenticated;
revoke all on function moral_trade_private.activate_confirmed_trade_milestones()
  from public, anon, authenticated;
revoke all on function moral_trade_private.guard_submitted_evidence_bundle_item()
  from public, anon, authenticated;
revoke all on function moral_trade_private.guard_counterproposal_milestone_terms()
  from public, anon, authenticated;

grant execute on function moral_trade_private.current_actor_has_trade_role(text)
  to authenticated;

revoke all on function public.create_trade_agreement_milestone_v1(
  uuid, integer, uuid, uuid, text, text, text, numeric, boolean, bigint, text, text
) from public, anon, authenticated;
grant execute on function public.create_trade_agreement_milestone_v1(
  uuid, integer, uuid, uuid, text, text, text, numeric, boolean, bigint, text, text
) to authenticated;

revoke all on function public.finalize_trade_milestone_manifest_v1(uuid)
  from public, anon, authenticated;
grant execute on function public.finalize_trade_milestone_manifest_v1(uuid)
  to authenticated;

revoke all on function public.start_trade_milestone_amendment_v1(uuid)
  from public, anon, authenticated;
grant execute on function public.start_trade_milestone_amendment_v1(uuid)
  to authenticated;

revoke all on function public.open_trade_evidence_bundle_v1(uuid, text)
  from public, anon, authenticated;
grant execute on function public.open_trade_evidence_bundle_v1(uuid, text)
  to authenticated;

revoke all on function public.add_trade_evidence_bundle_item_v1(
  uuid, text, text, text, text
) from public, anon, authenticated;
grant execute on function public.add_trade_evidence_bundle_item_v1(
  uuid, text, text, text, text
) to authenticated;

revoke all on function public.submit_trade_evidence_bundle_v1(uuid)
  from public, anon, authenticated;
grant execute on function public.submit_trade_evidence_bundle_v1(uuid)
  to authenticated;

revoke all on function public.nominate_trade_milestone_reviewer_v1(uuid, uuid)
  from public, anon, authenticated;
grant execute on function public.nominate_trade_milestone_reviewer_v1(uuid, uuid)
  to authenticated;

revoke all on function public.admin_assign_trade_milestone_reviewer_v1(uuid, uuid)
  from public, anon, authenticated;
grant execute on function public.admin_assign_trade_milestone_reviewer_v1(uuid, uuid)
  to authenticated;

revoke all on function public.list_trade_reviewer_candidates_v1()
  from public, anon, authenticated;
grant execute on function public.list_trade_reviewer_candidates_v1()
  to authenticated;

revoke all on function public.grade_trade_milestone_v1(
  uuid, uuid, numeric, smallint, text, text
) from public, anon, authenticated;
grant execute on function public.grade_trade_milestone_v1(
  uuid, uuid, numeric, smallint, text, text
) to authenticated;

revoke all on function public.finalize_trade_milestone_review_v1(uuid)
  from public, anon, authenticated;
grant execute on function public.finalize_trade_milestone_review_v1(uuid)
  to authenticated;

revoke all on function public.open_trade_milestone_appeal_v1(uuid, text)
  from public, anon, authenticated;
grant execute on function public.open_trade_milestone_appeal_v1(uuid, text)
  to authenticated;

revoke all on function public.nominate_trade_appeal_reviewer_v1(uuid, uuid)
  from public, anon, authenticated;
grant execute on function public.nominate_trade_appeal_reviewer_v1(uuid, uuid)
  to authenticated;

revoke all on function public.admin_assign_trade_appeal_reviewer_v1(uuid, uuid)
  from public, anon, authenticated;
grant execute on function public.admin_assign_trade_appeal_reviewer_v1(uuid, uuid)
  to authenticated;

revoke all on function public.resolve_trade_milestone_appeal_v1(
  uuid, numeric, smallint, text, text
) from public, anon, authenticated;
grant execute on function public.resolve_trade_milestone_appeal_v1(
  uuid, numeric, smallint, text, text
) to authenticated;

revoke all on function public.report_trade_external_payment_v1(
  uuid, text, text, bigint, text, date, text
) from public, anon, authenticated;
grant execute on function public.report_trade_external_payment_v1(
  uuid, text, text, bigint, text, date, text
) to authenticated;

revoke all on function public.respond_trade_external_payment_v1(uuid, text, text)
  from public, anon, authenticated;
grant execute on function public.respond_trade_external_payment_v1(uuid, text, text)
  to authenticated;

revoke all on function public.list_public_moral_trade_outcomes_v2(integer, integer)
  from public, anon, authenticated;
grant execute on function public.list_public_moral_trade_outcomes_v2(integer, integer)
  to anon, authenticated;

revoke all on function public.get_safe_profile_labels_v1(uuid[])
  from public, anon, authenticated;
grant execute on function public.get_safe_profile_labels_v1(uuid[])
  to anon, authenticated;

comment on table public.trade_agreement_milestones is
  'Immutable, version-bound and independently priced Moral Trade milestones. Lifecycle state changes only through trusted RPCs.';
comment on table public.trade_evidence_bundles is
  'Private initial or one-time consolidated replacement evidence packets.';
comment on table public.trade_milestone_reviews is
  'Append-only neutral decisions using fixed confidence bands and pre-agreed completion units.';
comment on table public.trade_milestone_payouts is
  'Private deterministic noncustodial amounts due; no custody, capture, or release authority.';
comment on table public.trade_external_payment_receipts is
  'Private participant-reported evidence of an external payment.';
comment on function public.list_public_moral_trade_outcomes_v2(integer, integer) is
  'Returns exactly action category, lifecycle status, confidence band, completion fraction, payout percentage, and calendar date.';

create or replace function public.can_read_private_trade_evidence_object_v1(
  p_bucket_id text,
  p_object_name text
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $function$
  select
    auth.uid() is not null
    and p_bucket_id = 'trade-evidence'
    and (
      (storage.foldername(p_object_name))[1] = auth.uid()::text
      or exists (
        select 1
        from public.trade_evidence_bundle_items item
        join public.trade_evidence_bundles bundle on bundle.id = item.bundle_id
        join public.trade_agreement_milestones milestone on milestone.id = bundle.milestone_id
        join public.agreements agreement on agreement.id = milestone.agreement_id
        where item.storage_path = p_object_name
          and bundle.status <> 'draft'
          and (
            auth.uid() in (agreement.proposer_id, agreement.responder_id)
            or milestone.assigned_reviewer_id = auth.uid()
            or exists (
              select 1
              from public.trade_milestone_appeals appeal
              where appeal.milestone_id = milestone.id
                and appeal.assigned_reviewer_id = auth.uid()
            )
            or moral_trade_private.current_actor_has_trade_role('administrator')
          )
      )
      or exists (
        select 1
        from public.trade_evidence_items item
        join public.agreements agreement on agreement.id = item.agreement_id
        where item.storage_path = p_object_name
          and auth.uid() in (agreement.proposer_id, agreement.responder_id)
      )
      or exists (
        select 1
        from public.trade_external_payment_receipts receipt
        join public.trade_milestone_payouts payout on payout.id = receipt.payout_id
        where receipt.receipt_storage_path = p_object_name
          and (
            auth.uid() in (payout.payer_id, payout.payee_id)
            or moral_trade_private.current_actor_has_trade_role('administrator')
          )
      )
    );
$function$;

create or replace function public.can_mutate_private_trade_evidence_object_v1(
  p_bucket_id text,
  p_object_name text
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $function$
  select
    auth.uid() is not null
    and p_bucket_id = 'trade-evidence'
    and (storage.foldername(p_object_name))[1] = auth.uid()::text
    and not exists (
      select 1
      from public.trade_evidence_bundle_items item
      join public.trade_evidence_bundles bundle on bundle.id = item.bundle_id
      where item.storage_path = p_object_name
        and bundle.status <> 'draft'
    )
    and not exists (
      select 1
      from public.trade_external_payment_receipts receipt
      where receipt.receipt_storage_path = p_object_name
    )
    and not exists (
      select 1
      from public.trade_evidence_items item
      where item.storage_path = p_object_name
    );
$function$;

drop policy if exists "private_trade_evidence_insert_own_prefix" on storage.objects;
create policy "private_trade_evidence_insert_own_prefix"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'trade-evidence'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

drop policy if exists "private_trade_evidence_authorized_read" on storage.objects;
create policy "private_trade_evidence_authorized_read"
on storage.objects
for select
to authenticated
using (public.can_read_private_trade_evidence_object_v1(bucket_id, name));

drop policy if exists "private_trade_evidence_update_draft" on storage.objects;
create policy "private_trade_evidence_update_draft"
on storage.objects
for update
to authenticated
using (public.can_mutate_private_trade_evidence_object_v1(bucket_id, name))
with check (public.can_mutate_private_trade_evidence_object_v1(bucket_id, name));

drop policy if exists "private_trade_evidence_delete_draft" on storage.objects;
create policy "private_trade_evidence_delete_draft"
on storage.objects
for delete
to authenticated
using (public.can_mutate_private_trade_evidence_object_v1(bucket_id, name));

revoke all on function public.can_read_private_trade_evidence_object_v1(text, text)
  from public, anon, authenticated;
grant execute on function public.can_read_private_trade_evidence_object_v1(text, text)
  to authenticated;
revoke all on function public.can_mutate_private_trade_evidence_object_v1(text, text)
  from public, anon, authenticated;
grant execute on function public.can_mutate_private_trade_evidence_object_v1(text, text)
  to authenticated;
