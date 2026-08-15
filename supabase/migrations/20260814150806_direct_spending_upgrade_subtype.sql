-- Spending Upgrade is an additive subtype of the direct Donation Upgrade
-- product family. It deliberately uses sibling tables because a prospective
-- nonessential expense has no original nonprofit recipient. Existing Donation
-- Upgrade columns, rows, hashes, obligations, and migrations keep their exact
-- planned-donation meaning.
--
-- Every.org remains the sole donation-fulfilment authority. Private baseline
-- and spending-change evidence is reviewed separately. No creator converted-
-- spending credit exists until both the creator donation and the scoped
-- spending-change review are accepted.

create extension if not exists pgcrypto;

create or replace function public.direct_spending_upgrade_diversion_basis_points(
  p_planned_spend_amount_cents integer,
  p_creator_diversion_amount_cents integer
)
returns integer
language sql
immutable
strict
set search_path = pg_catalog
as $$
  select floor(
    (
      p_creator_diversion_amount_cents::bigint * 10000
      + floor(p_planned_spend_amount_cents::numeric / 2)::bigint
    )::numeric / p_planned_spend_amount_cents::numeric
  )::integer;
$$;

create or replace function public.direct_spending_upgrade_evidence_hash_v1(
  p_payload jsonb,
  p_captured_at timestamptz
)
returns text
language sql
immutable
strict
set search_path = pg_catalog
as $$
  select encode(
    extensions.digest(
      convert_to(
        public.direct_donation_upgrade_canonical_json(
          jsonb_build_object(
            'schemaVersion', 'direct-spending-upgrade-private-evidence-v1-2026-08-14',
            'payload', p_payload,
            'capturedAt', to_char(
              p_captured_at at time zone 'UTC',
              'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'
            )
          )
        ),
        'UTF8'
      ),
      'sha256'
    ),
    'hex'
  );
$$;

create or replace function public.direct_spending_upgrade_change_evidence_hash_v1(
  p_offer_id uuid,
  p_payload jsonb,
  p_captured_at timestamptz
)
returns text
language sql
immutable
strict
set search_path = pg_catalog
as $$
  select encode(
    extensions.digest(
      convert_to(
        public.direct_donation_upgrade_canonical_json(
          jsonb_build_object(
            'schemaVersion', 'direct-spending-upgrade-private-evidence-v1-2026-08-14',
            'evidenceKind', 'spending_change',
            'offerId', p_offer_id::text,
            'capturedAt', to_char(
              p_captured_at at time zone 'UTC',
              'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'
            ),
            'payload', p_payload
          )
        ),
        'UTF8'
      ),
      'sha256'
    ),
    'hex'
  );
$$;

create or replace function public.direct_spending_upgrade_terms_hash_v1(
  p_creator_profile_id uuid,
  p_category text,
  p_planned_action text,
  p_planned_spend_amount_cents integer,
  p_creator_diversion_amount_cents integer,
  p_matcher_amount_cents integer,
  p_upgraded_recipient_hash text,
  p_match_deadline_at timestamptz,
  p_privacy_mode text,
  p_environment text,
  p_evidence_hash text,
  p_evidence_captured_at timestamptz,
  p_baseline_fingerprint text
)
returns text
language sql
immutable
strict
set search_path = pg_catalog
as $$
  select encode(
    extensions.digest(
      convert_to(
        public.direct_donation_upgrade_canonical_json(
          jsonb_build_object(
            'schemaVersion', 'direct-spending-upgrade-terms-v1-2026-08-14',
            'baselineSourceType', 'nonessential_spending',
            'baselineSchemaVersion', 'direct-spending-upgrade-baseline-v1-2026-08-14',
            'evidenceSchemaVersion', 'direct-spending-upgrade-private-evidence-v1-2026-08-14',
            'safetyAttestationVersion', 'direct-spending-upgrade-safety-v1-2026-08-14',
            'consentVersion', 'direct-spending-upgrade-consent-v1-2026-08-14',
            'creatorProfileId', p_creator_profile_id::text,
            'category', p_category,
            'plannedAction', p_planned_action,
            'plannedSpendAmountCents', p_planned_spend_amount_cents,
            'creatorDiversionAmountCents', p_creator_diversion_amount_cents,
            'retainedSpendingAmountCents',
              p_planned_spend_amount_cents - p_creator_diversion_amount_cents,
            'diversionBasisPoints',
              public.direct_spending_upgrade_diversion_basis_points(
                p_planned_spend_amount_cents,
                p_creator_diversion_amount_cents
              ),
            'matcherAmountCents', p_matcher_amount_cents,
            'currency', 'USD',
            'upgradedRecipientHash', lower(trim(p_upgraded_recipient_hash)),
            'matchDeadlineAt', to_char(
              p_match_deadline_at at time zone 'UTC',
              'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'
            ),
            'privacyMode', p_privacy_mode,
            'environment', p_environment,
            'baselineEvidenceHash', lower(trim(p_evidence_hash)),
            'baselineEvidenceCapturedAt', to_char(
              p_evidence_captured_at at time zone 'UTC',
              'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'
            ),
            'baselineFingerprint', lower(trim(p_baseline_fingerprint)),
            'matcherCommitmentVersion', 'direct-spending-upgrade-matcher-v1-2026-08-14',
            'proposalCommitmentVersion', 'direct-spending-upgrade-proposal-v1-2026-08-14'
          )
        ),
        'UTF8'
      ),
      'sha256'
    ),
    'hex'
  );
$$;

create table if not exists public.direct_spending_upgrade_baselines (
  id uuid primary key default gen_random_uuid(),
  creator_profile_id uuid not null references public.profiles(id) on delete restrict,
  schema_version text not null check (
    schema_version = 'direct-spending-upgrade-baseline-v1-2026-08-14'
  ),
  category text not null check (
    category in (
      'recurring_subscription',
      'cancellable_reservation_or_service',
      'pending_order_or_upgrade'
    )
  ),
  private_merchant_label text not null check (
    char_length(trim(private_merchant_label)) between 2 and 180
  ),
  private_description text not null check (
    char_length(trim(private_description)) between 20 and 1200
  ),
  planned_spend_amount_cents integer not null check (
    planned_spend_amount_cents between 100 and 5000000
  ),
  planned_action text not null check (
    planned_action in ('cancel', 'reduce', 'downgrade')
  ),
  evidence_schema_version text not null check (
    evidence_schema_version = 'direct-spending-upgrade-private-evidence-v1-2026-08-14'
  ),
  evidence_payload jsonb not null check (jsonb_typeof(evidence_payload) = 'object'),
  evidence_hash text not null check (evidence_hash ~ '^[0-9a-f]{64}$'),
  evidence_captured_at timestamptz not null,
  baseline_fingerprint text not null unique check (
    baseline_fingerprint ~ '^[0-9a-f]{64}$'
  ),
  safety_attestation_version text not null check (
    safety_attestation_version = 'direct-spending-upgrade-safety-v1-2026-08-14'
  ),
  consent_version text not null check (
    consent_version = 'direct-spending-upgrade-consent-v1-2026-08-14'
  ),
  nonessential_attested boolean not null check (nonessential_attested = true),
  no_material_harm_attested boolean not null check (no_material_harm_attested = true),
  preexisting_plan_attested boolean not null check (preexisting_plan_attested = true),
  not_already_cancelled_attested boolean not null check (
    not_already_cancelled_attested = true
  ),
  available_funds_attested boolean not null check (available_funds_attested = true),
  not_otherwise_donating_attested boolean not null check (
    not_otherwise_donating_attested = true
  ),
  review_status text not null default 'review_required' check (
    review_status in (
      'submitted', 'review_required', 'accepted', 'rejected', 'disputed', 'unavailable'
    )
  ),
  reviewed_at timestamptz,
  failure_code text not null default '',
  failure_message text not null default '',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  check (evidence_captured_at <= created_at + interval '5 minutes'),
  check (
    evidence_hash = public.direct_spending_upgrade_evidence_hash_v1(
      evidence_payload,
      evidence_captured_at
    )
  )
);

create index if not exists direct_spending_upgrade_baselines_creator_idx
  on public.direct_spending_upgrade_baselines(creator_profile_id, created_at desc);
create index if not exists direct_spending_upgrade_baselines_review_idx
  on public.direct_spending_upgrade_baselines(review_status, created_at)
  where review_status in ('submitted', 'review_required', 'disputed');

create table if not exists public.direct_spending_upgrade_offers (
  id uuid primary key default gen_random_uuid(),
  baseline_id uuid not null references public.direct_spending_upgrade_baselines(id) on delete restrict,
  creator_profile_id uuid not null references public.profiles(id) on delete restrict,
  environment text not null check (environment in ('staging', 'live')),
  status text not null default 'review_required' check (
    status in (
      'review_required', 'open', 'matched', 'completed', 'defaulted',
      'expired', 'cancelled', 'needs_review', 'superseded'
    )
  ),
  privacy_mode text not null default 'public' check (
    privacy_mode in ('public', 'private_until_completed')
  ),
  creator_diversion_amount_cents integer not null check (
    creator_diversion_amount_cents between 100 and 5000000
  ),
  retained_spending_amount_cents integer not null check (
    retained_spending_amount_cents between 0 and 4999900
  ),
  diversion_basis_points integer not null check (
    diversion_basis_points between 1 and 10000
  ),
  matcher_amount_cents integer not null check (matcher_amount_cents between 100 and 5000000),
  currency text not null default 'USD' check (currency = 'USD'),
  match_deadline_at timestamptz not null,
  fulfillment_deadline_at timestamptz,
  webhook_grace_ends_at timestamptz,
  upgraded_recipient jsonb not null check (jsonb_typeof(upgraded_recipient) = 'object'),
  upgraded_recipient_hash text not null check (upgraded_recipient_hash ~ '^[0-9a-f]{64}$'),
  spending_change_review_status text check (
    spending_change_review_status is null or spending_change_review_status in (
      'submitted', 'review_required', 'accepted', 'rejected', 'disputed', 'unavailable'
    )
  ),
  terms_hash text not null check (terms_hash ~ '^[0-9a-f]{64}$'),
  winning_candidate_id uuid,
  supersedes_offer_id uuid references public.direct_spending_upgrade_offers(id) on delete restrict,
  superseded_by_offer_id uuid references public.direct_spending_upgrade_offers(id) on delete restrict,
  match_locked_at timestamptz,
  completed_at timestamptz,
  defaulted_at timestamptz,
  cancellation_reason text not null default '',
  failure_code text not null default '',
  failure_message text not null default '',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  check (match_deadline_at > created_at),
  check (
    supersedes_offer_id is null or supersedes_offer_id <> id
  ),
  check (
    superseded_by_offer_id is null or superseded_by_offer_id <> id
  )
);

create index if not exists direct_spending_upgrade_offers_public_idx
  on public.direct_spending_upgrade_offers(status, created_at desc);
create index if not exists direct_spending_upgrade_offers_creator_idx
  on public.direct_spending_upgrade_offers(creator_profile_id, created_at desc);
create index if not exists direct_spending_upgrade_offers_baseline_idx
  on public.direct_spending_upgrade_offers(baseline_id, created_at);
create index if not exists direct_spending_upgrade_offers_deadline_idx
  on public.direct_spending_upgrade_offers(match_deadline_at)
  where status in ('review_required', 'open');
create unique index if not exists direct_spending_upgrade_one_successor_idx
  on public.direct_spending_upgrade_offers(supersedes_offer_id)
  where supersedes_offer_id is not null;
create unique index if not exists direct_spending_upgrade_one_current_offer_per_baseline_idx
  on public.direct_spending_upgrade_offers(baseline_id)
  where status not in ('superseded', 'cancelled', 'expired');

create table if not exists public.direct_spending_upgrade_candidates (
  id uuid primary key default gen_random_uuid(),
  offer_id uuid not null references public.direct_spending_upgrade_offers(id) on delete restrict,
  profile_id uuid not null references public.profiles(id) on delete restrict,
  status text not null default 'primary' check (
    status in ('primary', 'fulfilled', 'defaulted', 'withdrawn', 'closed')
  ),
  commitment_version text not null check (
    commitment_version = 'direct-spending-upgrade-matcher-v1-2026-08-14'
  ),
  commitment_accepted_at timestamptz not null default timezone('utc', now()),
  fulfilled_at timestamptz,
  defaulted_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (offer_id, profile_id)
);

do $$
begin
  if not exists (
    select 1
    from pg_catalog.pg_constraint
    where conname = 'direct_spending_upgrade_winner_fk'
      and conrelid = 'public.direct_spending_upgrade_offers'::regclass
  ) then
    alter table public.direct_spending_upgrade_offers
      add constraint direct_spending_upgrade_winner_fk
      foreign key (winning_candidate_id)
      references public.direct_spending_upgrade_candidates(id)
      on delete restrict;
  end if;
end;
$$;

create unique index if not exists direct_spending_upgrade_one_matcher_idx
  on public.direct_spending_upgrade_candidates(offer_id)
  where status in ('primary', 'fulfilled');
create index if not exists direct_spending_upgrade_candidates_profile_idx
  on public.direct_spending_upgrade_candidates(profile_id, created_at desc);

create table if not exists public.direct_spending_upgrade_proposals (
  id uuid primary key default gen_random_uuid(),
  offer_id uuid not null references public.direct_spending_upgrade_offers(id) on delete restrict,
  proposer_profile_id uuid not null references public.profiles(id) on delete restrict,
  status text not null default 'pending' check (
    status in ('pending', 'accepted', 'rejected', 'withdrawn', 'superseded', 'expired')
  ),
  base_terms_hash text not null check (base_terms_hash ~ '^[0-9a-f]{64}$'),
  proposed_creator_diversion_amount_cents integer not null check (
    proposed_creator_diversion_amount_cents between 100 and 5000000
  ),
  proposed_diversion_basis_points integer not null check (
    proposed_diversion_basis_points between 1 and 10000
  ),
  proposed_matcher_amount_cents integer not null check (
    proposed_matcher_amount_cents between 100 and 5000000
  ),
  currency text not null default 'USD' check (currency = 'USD'),
  message text not null default '' check (char_length(message) <= 600),
  response_message text not null default '' check (char_length(response_message) <= 600),
  commitment_version text not null check (
    commitment_version = 'direct-spending-upgrade-proposal-v1-2026-08-14'
  ),
  commitment_accepted_at timestamptz not null default timezone('utc', now()),
  responded_at timestamptz,
  accepted_offer_id uuid references public.direct_spending_upgrade_offers(id) on delete restrict,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  check (
    (status = 'accepted' and accepted_offer_id is not null and responded_at is not null)
    or (status <> 'accepted' and accepted_offer_id is null)
  )
);

create unique index if not exists direct_spending_upgrade_pending_proposal_idx
  on public.direct_spending_upgrade_proposals(offer_id, proposer_profile_id)
  where status = 'pending';
create unique index if not exists direct_spending_upgrade_accepted_offer_idx
  on public.direct_spending_upgrade_proposals(accepted_offer_id)
  where accepted_offer_id is not null;
create index if not exists direct_spending_upgrade_proposals_offer_idx
  on public.direct_spending_upgrade_proposals(offer_id, status, created_at desc);

create table if not exists public.direct_spending_upgrade_evidence_records (
  id uuid primary key default gen_random_uuid(),
  offer_id uuid not null references public.direct_spending_upgrade_offers(id) on delete restrict,
  submitted_by_profile_id uuid not null references public.profiles(id) on delete restrict,
  evidence_kind text not null check (evidence_kind = 'spending_change'),
  schema_version text not null check (
    schema_version = 'direct-spending-upgrade-private-evidence-v1-2026-08-14'
  ),
  private_payload jsonb not null check (jsonb_typeof(private_payload) = 'object'),
  evidence_hash text not null check (evidence_hash ~ '^[0-9a-f]{64}$'),
  captured_at timestamptz not null,
  status text not null default 'review_required' check (
    status in ('submitted', 'review_required', 'accepted', 'rejected', 'disputed', 'unavailable')
  ),
  idempotency_key text not null,
  created_at timestamptz not null default timezone('utc', now()),
  unique (offer_id, idempotency_key),
  unique (offer_id, evidence_hash),
  check (
    evidence_hash = public.direct_spending_upgrade_change_evidence_hash_v1(
      offer_id,
      private_payload,
      captured_at
    )
  )
);

create index if not exists direct_spending_upgrade_evidence_offer_idx
  on public.direct_spending_upgrade_evidence_records(offer_id, created_at desc);
create index if not exists direct_spending_upgrade_evidence_review_idx
  on public.direct_spending_upgrade_evidence_records(status, created_at)
  where status in ('submitted', 'review_required', 'disputed');
create unique index if not exists direct_spending_upgrade_one_active_evidence_idx
  on public.direct_spending_upgrade_evidence_records(offer_id)
  where status in ('submitted', 'review_required', 'disputed');

create table if not exists public.direct_spending_upgrade_review_assignments (
  id uuid primary key default gen_random_uuid(),
  baseline_id uuid not null references public.direct_spending_upgrade_baselines(id) on delete restrict,
  offer_id uuid references public.direct_spending_upgrade_offers(id) on delete restrict,
  review_scope text not null check (review_scope in ('baseline', 'spending_change')),
  reviewer_profile_id uuid not null references public.profiles(id) on delete restrict,
  status text not null default 'assigned' check (
    status in ('assigned', 'completed', 'recused', 'revoked')
  ),
  authority_version text not null check (
    authority_version = 'direct-spending-upgrade-assigned-reviewer-v1-2026-08-14'
  ),
  conflict_attested_at timestamptz not null,
  assigned_at timestamptz not null default timezone('utc', now()),
  completed_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  check (
    (review_scope = 'baseline' and offer_id is null)
    or (review_scope = 'spending_change' and offer_id is not null)
  )
);

create unique index if not exists direct_spending_upgrade_active_assignment_idx
  on public.direct_spending_upgrade_review_assignments(
    baseline_id,
    coalesce(offer_id, '00000000-0000-0000-0000-000000000000'::uuid),
    review_scope
  )
  where status = 'assigned';
create index if not exists direct_spending_upgrade_reviewer_queue_idx
  on public.direct_spending_upgrade_review_assignments(
    reviewer_profile_id,
    status,
    assigned_at
  );

create table if not exists public.direct_spending_upgrade_review_decisions (
  id uuid primary key default gen_random_uuid(),
  assignment_id uuid not null references public.direct_spending_upgrade_review_assignments(id) on delete restrict,
  baseline_id uuid not null references public.direct_spending_upgrade_baselines(id) on delete restrict,
  offer_id uuid references public.direct_spending_upgrade_offers(id) on delete restrict,
  evidence_record_id uuid references public.direct_spending_upgrade_evidence_records(id) on delete restrict,
  review_scope text not null check (review_scope in ('baseline', 'spending_change')),
  reviewer_profile_id uuid not null references public.profiles(id) on delete restrict,
  outcome text not null check (
    outcome in ('accepted', 'rejected', 'review_required', 'unavailable')
  ),
  reason_codes text[] not null default '{}',
  private_notes text not null default '' check (char_length(private_notes) <= 2000),
  idempotency_key text not null,
  decision_hash text not null check (decision_hash ~ '^[0-9a-f]{64}$'),
  created_at timestamptz not null default timezone('utc', now()),
  unique (assignment_id, idempotency_key),
  unique (decision_hash),
  check (
    (review_scope = 'baseline' and offer_id is null and evidence_record_id is null)
    or (
      review_scope = 'spending_change'
      and offer_id is not null
      and evidence_record_id is not null
    )
  )
);

create index if not exists direct_spending_upgrade_decisions_baseline_idx
  on public.direct_spending_upgrade_review_decisions(baseline_id, created_at);
create index if not exists direct_spending_upgrade_decisions_offer_idx
  on public.direct_spending_upgrade_review_decisions(offer_id, created_at)
  where offer_id is not null;

create table if not exists public.direct_spending_upgrade_obligations (
  id uuid primary key default gen_random_uuid(),
  offer_id uuid not null references public.direct_spending_upgrade_offers(id) on delete restrict,
  candidate_id uuid references public.direct_spending_upgrade_candidates(id) on delete restrict,
  participant_profile_id uuid not null references public.profiles(id) on delete restrict,
  participant_role text not null check (participant_role in ('creator', 'matcher')),
  branch text not null default 'matched' check (branch = 'matched'),
  obligation_kind text not null check (
    obligation_kind in ('creator_converted_spending', 'matcher_incremental')
  ),
  environment text not null check (environment in ('staging', 'live')),
  provider text not null default 'every_org' check (provider = 'every_org'),
  expected_recipient jsonb not null check (jsonb_typeof(expected_recipient) = 'object'),
  expected_recipient_hash text not null check (expected_recipient_hash ~ '^[0-9a-f]{64}$'),
  expected_amount_cents integer not null check (expected_amount_cents between 100 and 5000000),
  expected_currency text not null default 'USD' check (expected_currency = 'USD'),
  expected_frequency text not null default 'ONCE' check (expected_frequency = 'ONCE'),
  terms_hash text not null check (terms_hash ~ '^[0-9a-f]{64}$'),
  partner_donation_id text not null unique,
  status text not null default 'pending' check (
    status in ('pending', 'checkout_started', 'verified', 'defaulted', 'cancelled', 'needs_review')
  ),
  due_at timestamptz not null,
  webhook_grace_ends_at timestamptz not null,
  checkout_started_at timestamptz,
  provider_charge_id_hash text not null default '' check (
    provider_charge_id_hash = '' or provider_charge_id_hash ~ '^[0-9a-f]{64}$'
  ),
  provider_payload_hash text not null default '' check (
    provider_payload_hash = '' or provider_payload_hash ~ '^[0-9a-f]{64}$'
  ),
  provider_gross_amount_cents integer,
  provider_net_amount_cents integer,
  provider_currency text not null default '',
  provider_nonprofit_slug text not null default '',
  provider_nonprofit_ein text not null default '',
  provider_donation_date timestamptz,
  provider_payment_method text not null default '',
  failure_code text not null default '',
  failure_message text not null default '',
  verified_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  check (webhook_grace_ends_at > due_at),
  check (
    (
      obligation_kind = 'creator_converted_spending'
      and participant_role = 'creator'
      and candidate_id is null
    )
    or (
      obligation_kind = 'matcher_incremental'
      and participant_role = 'matcher'
      and candidate_id is not null
    )
  ),
  check (
    status <> 'verified'
    or (
      provider_charge_id_hash <> ''
      and provider_payload_hash <> ''
      and provider_gross_amount_cents = expected_amount_cents
      and provider_net_amount_cents between 0 and provider_gross_amount_cents
      and provider_currency = expected_currency
      and provider_donation_date is not null
      and verified_at is not null
    )
  )
);

create unique index if not exists direct_spending_upgrade_obligation_kind_idx
  on public.direct_spending_upgrade_obligations(offer_id, obligation_kind);
create unique index if not exists direct_spending_upgrade_provider_charge_idx
  on public.direct_spending_upgrade_obligations(provider_charge_id_hash)
  where provider_charge_id_hash <> '';
create index if not exists direct_spending_upgrade_obligations_participant_idx
  on public.direct_spending_upgrade_obligations(participant_profile_id, created_at desc);
create index if not exists direct_spending_upgrade_obligations_due_idx
  on public.direct_spending_upgrade_obligations(webhook_grace_ends_at)
  where status in ('pending', 'checkout_started');

create table if not exists public.direct_spending_upgrade_impact_credits (
  id uuid primary key default gen_random_uuid(),
  offer_id uuid not null references public.direct_spending_upgrade_offers(id) on delete restrict,
  obligation_id uuid not null unique references public.direct_spending_upgrade_obligations(id) on delete restrict,
  profile_id uuid not null references public.profiles(id) on delete restrict,
  credit_kind text not null check (
    credit_kind in ('converted_spending', 'matcher_incremental')
  ),
  provider text not null default 'every_org' check (provider = 'every_org'),
  recipient_hash text not null check (recipient_hash ~ '^[0-9a-f]{64}$'),
  verified_gross_amount_cents integer not null check (verified_gross_amount_cents >= 0),
  verified_net_amount_cents integer not null check (verified_net_amount_cents >= 0),
  converted_spending_gross_amount_cents integer not null default 0 check (
    converted_spending_gross_amount_cents >= 0
  ),
  converted_spending_net_amount_cents integer not null default 0 check (
    converted_spending_net_amount_cents >= 0
  ),
  incremental_gross_amount_cents integer not null default 0 check (
    incremental_gross_amount_cents >= 0
  ),
  incremental_net_amount_cents integer not null default 0 check (
    incremental_net_amount_cents >= 0
  ),
  provider_charge_id_hash text not null check (provider_charge_id_hash ~ '^[0-9a-f]{64}$'),
  evidence_decision_id uuid references public.direct_spending_upgrade_review_decisions(id) on delete restrict,
  verified_at timestamptz not null,
  created_at timestamptz not null default timezone('utc', now()),
  check (verified_net_amount_cents <= verified_gross_amount_cents),
  check (
    (
      credit_kind = 'converted_spending'
      and converted_spending_gross_amount_cents = verified_gross_amount_cents
      and converted_spending_net_amount_cents = verified_net_amount_cents
      and incremental_gross_amount_cents = 0
      and incremental_net_amount_cents = 0
      and evidence_decision_id is not null
    )
    or (
      credit_kind = 'matcher_incremental'
      and incremental_gross_amount_cents = verified_gross_amount_cents
      and incremental_net_amount_cents = verified_net_amount_cents
      and converted_spending_gross_amount_cents = 0
      and converted_spending_net_amount_cents = 0
      and evidence_decision_id is null
    )
  )
);

create index if not exists direct_spending_upgrade_impact_profile_idx
  on public.direct_spending_upgrade_impact_credits(profile_id, verified_at desc);
create index if not exists direct_spending_upgrade_impact_offer_idx
  on public.direct_spending_upgrade_impact_credits(offer_id, verified_at);

create table if not exists public.direct_spending_upgrade_audit_events (
  id uuid primary key default gen_random_uuid(),
  offer_id uuid references public.direct_spending_upgrade_offers(id) on delete restrict,
  baseline_id uuid references public.direct_spending_upgrade_baselines(id) on delete restrict,
  obligation_id uuid references public.direct_spending_upgrade_obligations(id) on delete restrict,
  candidate_id uuid references public.direct_spending_upgrade_candidates(id) on delete restrict,
  actor_profile_id uuid references public.profiles(id) on delete set null,
  event_type text not null,
  details jsonb not null default '{}'::jsonb check (jsonb_typeof(details) = 'object'),
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists direct_spending_upgrade_audit_offer_idx
  on public.direct_spending_upgrade_audit_events(offer_id, created_at);
create index if not exists direct_spending_upgrade_audit_baseline_idx
  on public.direct_spending_upgrade_audit_events(baseline_id, created_at);

create or replace function public.direct_spending_upgrade_set_updated_at()
returns trigger
language plpgsql
set search_path = pg_catalog
as $$
begin
  new.updated_at := timezone('utc', now());
  return new;
end;
$$;

create or replace function public.direct_spending_upgrade_prevent_mutation()
returns trigger
language plpgsql
set search_path = pg_catalog
as $$
begin
  raise exception 'Spending Upgrade audit, decision, and credit records are append-only.';
end;
$$;

create or replace function public.direct_spending_upgrade_guard_baseline()
returns trigger
language plpgsql
set search_path = pg_catalog
as $$
begin
  if tg_op = 'UPDATE' and (
    to_jsonb(new) - array[
      'review_status', 'reviewed_at', 'failure_code', 'failure_message', 'updated_at'
    ]
    is distinct from
    to_jsonb(old) - array[
      'review_status', 'reviewed_at', 'failure_code', 'failure_message', 'updated_at'
    ]
  ) then
    raise exception 'The prospective Spending Upgrade baseline is immutable.';
  end if;
  return new;
end;
$$;

create or replace function public.direct_spending_upgrade_guard_offer()
returns trigger
language plpgsql
set search_path = pg_catalog
as $$
declare
  baseline_row public.direct_spending_upgrade_baselines%rowtype;
  predecessor public.direct_spending_upgrade_offers%rowtype;
  expected_terms_hash text;
  matched_obligation_count integer;
  matching_credit_count integer;
begin
  select * into baseline_row
  from public.direct_spending_upgrade_baselines
  where id = new.baseline_id;
  if not found then
    raise exception 'Spending Upgrade baseline not found.';
  end if;
  if baseline_row.creator_profile_id is distinct from new.creator_profile_id then
    raise exception 'The Spending Upgrade creator does not own the baseline.';
  end if;
  if new.creator_diversion_amount_cents > baseline_row.planned_spend_amount_cents then
    raise exception 'The creator donation cannot exceed the frozen planned expense.';
  end if;
  if new.retained_spending_amount_cents is distinct from
     baseline_row.planned_spend_amount_cents - new.creator_diversion_amount_cents then
    raise exception 'The retained spending remainder is not exact.';
  end if;
  if new.diversion_basis_points is distinct from
     public.direct_spending_upgrade_diversion_basis_points(
       baseline_row.planned_spend_amount_cents,
       new.creator_diversion_amount_cents
     ) then
    raise exception 'The Spending Upgrade basis-point derivation is not exact.';
  end if;
  perform public.direct_donation_upgrade_validate_recipient(
    new.upgraded_recipient,
    new.upgraded_recipient_hash
  );
  expected_terms_hash := public.direct_spending_upgrade_terms_hash_v1(
    new.creator_profile_id,
    baseline_row.category,
    baseline_row.planned_action,
    baseline_row.planned_spend_amount_cents,
    new.creator_diversion_amount_cents,
    new.matcher_amount_cents,
    new.upgraded_recipient_hash,
    new.match_deadline_at,
    new.privacy_mode,
    new.environment,
    baseline_row.evidence_hash,
    baseline_row.evidence_captured_at,
    baseline_row.baseline_fingerprint
  );
  if lower(new.terms_hash) is distinct from expected_terms_hash then
    raise exception 'The Spending Upgrade terms hash does not match the frozen subtype terms.';
  end if;
  if tg_op = 'UPDATE' and (
    (old.winning_candidate_id is not null
      and new.winning_candidate_id is distinct from old.winning_candidate_id)
    or (old.match_locked_at is not null
      and new.match_locked_at is distinct from old.match_locked_at)
    or (old.fulfillment_deadline_at is not null
      and new.fulfillment_deadline_at is distinct from old.fulfillment_deadline_at)
    or (old.webhook_grace_ends_at is not null
      and new.webhook_grace_ends_at is distinct from old.webhook_grace_ends_at)
  ) then
    raise exception 'Matched Spending Upgrade identity and deadlines are immutable.';
  end if;
  if tg_op = 'UPDATE'
     and old.status in ('matched', 'completed', 'defaulted', 'needs_review')
     and new.status in ('review_required', 'open', 'expired', 'cancelled', 'superseded') then
    raise exception 'A matched Spending Upgrade cannot return to an unmatched state.';
  end if;
  if tg_op = 'UPDATE'
     and old.status in ('expired', 'cancelled', 'superseded')
     and new.status is distinct from old.status then
    raise exception 'A terminal unmatched Spending Upgrade cannot be reopened.';
  end if;
  if new.status in ('open', 'matched', 'completed', 'defaulted', 'superseded')
     and baseline_row.review_status <> 'accepted' then
    raise exception 'A Spending Upgrade cannot rely on an unaccepted prospective baseline.';
  end if;
  if new.status = 'completed'
     and new.spending_change_review_status is distinct from 'accepted' then
    raise exception 'A Spending Upgrade cannot complete before spending-change evidence is accepted.';
  end if;
  if new.status in ('matched', 'completed', 'defaulted', 'needs_review') then
    select count(*)::integer into matched_obligation_count
    from public.direct_spending_upgrade_obligations obligation
    where obligation.offer_id = new.id;
    if new.winning_candidate_id is null
       or new.match_locked_at is null
       or new.fulfillment_deadline_at is null
       or new.webhook_grace_ends_at is null
       or matched_obligation_count <> 2
       or exists (
         select 1
         from public.direct_spending_upgrade_obligations obligation
         where obligation.offer_id = new.id
           and (
             obligation.due_at is distinct from new.fulfillment_deadline_at
             or obligation.webhook_grace_ends_at is distinct from new.webhook_grace_ends_at
           )
       )
       or not exists (
         select 1
         from public.direct_spending_upgrade_candidates candidate
         join public.direct_spending_upgrade_obligations obligation
           on obligation.offer_id = candidate.offer_id
          and obligation.candidate_id = candidate.id
          and obligation.participant_role = 'matcher'
          and obligation.obligation_kind = 'matcher_incremental'
          and obligation.participant_profile_id = candidate.profile_id
         where candidate.id = new.winning_candidate_id
           and candidate.offer_id = new.id
       ) then
      raise exception 'A matched Spending Upgrade requires one winner and exactly two frozen obligations.';
    end if;
  end if;
  if new.status = 'completed' then
    select count(*)::integer into matching_credit_count
    from public.direct_spending_upgrade_impact_credits credit
    join public.direct_spending_upgrade_obligations obligation
      on obligation.id = credit.obligation_id
     and obligation.offer_id = credit.offer_id
     and obligation.participant_profile_id = credit.profile_id
     and obligation.expected_recipient_hash = credit.recipient_hash
     and obligation.provider_charge_id_hash = credit.provider_charge_id_hash
     and obligation.provider_gross_amount_cents = credit.verified_gross_amount_cents
     and obligation.provider_net_amount_cents = credit.verified_net_amount_cents
     and obligation.verified_at = credit.verified_at
    where credit.offer_id = new.id
      and obligation.status = 'verified';
    if matching_credit_count <> 2 then
      raise exception 'A completed Spending Upgrade requires two current provider-bound credits.';
    end if;
  end if;

  if new.supersedes_offer_id is not null then
    select * into predecessor
    from public.direct_spending_upgrade_offers
    where id = new.supersedes_offer_id;
    if not found then
      raise exception 'The Spending Upgrade predecessor does not exist.';
    end if;
    if predecessor.baseline_id is distinct from new.baseline_id
       or predecessor.creator_profile_id is distinct from new.creator_profile_id
       or predecessor.environment is distinct from new.environment
       or predecessor.privacy_mode is distinct from new.privacy_mode
       or predecessor.match_deadline_at is distinct from new.match_deadline_at
       or predecessor.upgraded_recipient_hash is distinct from new.upgraded_recipient_hash then
      raise exception 'A Spending Upgrade revision may change only diversion and matcher amounts.';
    end if;
  end if;

  if tg_op = 'UPDATE' and (
    new.baseline_id is distinct from old.baseline_id
    or new.creator_profile_id is distinct from old.creator_profile_id
    or new.environment is distinct from old.environment
    or new.privacy_mode is distinct from old.privacy_mode
    or new.creator_diversion_amount_cents is distinct from old.creator_diversion_amount_cents
    or new.retained_spending_amount_cents is distinct from old.retained_spending_amount_cents
    or new.diversion_basis_points is distinct from old.diversion_basis_points
    or new.matcher_amount_cents is distinct from old.matcher_amount_cents
    or new.currency is distinct from old.currency
    or new.match_deadline_at is distinct from old.match_deadline_at
    or new.upgraded_recipient is distinct from old.upgraded_recipient
    or new.upgraded_recipient_hash is distinct from old.upgraded_recipient_hash
    or new.terms_hash is distinct from old.terms_hash
    or new.supersedes_offer_id is distinct from old.supersedes_offer_id
  ) then
    raise exception 'Published Spending Upgrade terms are immutable.';
  end if;
  return new;
end;
$$;

create or replace function public.direct_spending_upgrade_guard_candidate()
returns trigger
language plpgsql
set search_path = pg_catalog
as $$
declare
  candidate_baseline_id uuid;
begin
  select baseline_id into candidate_baseline_id
  from public.direct_spending_upgrade_offers
  where id = new.offer_id;
  if not found then
    raise exception 'Spending Upgrade offer not found for matcher commitment.';
  end if;
  if exists (
    select 1
    from public.direct_spending_upgrade_review_assignments assignment
    where assignment.baseline_id = candidate_baseline_id
      and assignment.reviewer_profile_id = new.profile_id
  ) then
    raise exception 'An assigned Spending Upgrade reviewer cannot become a counterparty for the same baseline.';
  end if;
  if tg_op = 'UPDATE' and (
    new.offer_id is distinct from old.offer_id
    or new.profile_id is distinct from old.profile_id
    or new.commitment_version is distinct from old.commitment_version
    or new.commitment_accepted_at is distinct from old.commitment_accepted_at
  ) then
    raise exception 'Spending Upgrade matcher identity and commitment are immutable.';
  end if;
  return new;
end;
$$;

create or replace function public.direct_spending_upgrade_guard_proposal()
returns trigger
language plpgsql
set search_path = pg_catalog
as $$
declare
  proposal_baseline_id uuid;
begin
  select baseline_id into proposal_baseline_id
  from public.direct_spending_upgrade_offers
  where id = new.offer_id;
  if not found then
    raise exception 'Spending Upgrade offer not found for counteroffer.';
  end if;
  if exists (
    select 1
    from public.direct_spending_upgrade_review_assignments assignment
    where assignment.baseline_id = proposal_baseline_id
      and assignment.reviewer_profile_id = new.proposer_profile_id
  ) then
    raise exception 'An assigned Spending Upgrade reviewer cannot become a counterparty for the same baseline.';
  end if;
  if tg_op = 'UPDATE' and (
    new.offer_id is distinct from old.offer_id
    or new.proposer_profile_id is distinct from old.proposer_profile_id
    or new.base_terms_hash is distinct from old.base_terms_hash
    or new.proposed_creator_diversion_amount_cents is distinct from old.proposed_creator_diversion_amount_cents
    or new.proposed_diversion_basis_points is distinct from old.proposed_diversion_basis_points
    or new.proposed_matcher_amount_cents is distinct from old.proposed_matcher_amount_cents
    or new.currency is distinct from old.currency
    or new.message is distinct from old.message
    or new.commitment_version is distinct from old.commitment_version
    or new.commitment_accepted_at is distinct from old.commitment_accepted_at
  ) then
    raise exception 'Spending Upgrade counteroffer terms are immutable.';
  end if;
  return new;
end;
$$;

create or replace function public.direct_spending_upgrade_guard_evidence()
returns trigger
language plpgsql
set search_path = pg_catalog
as $$
begin
  if tg_op = 'UPDATE' and (
    to_jsonb(new) - 'status'
    is distinct from
    to_jsonb(old) - 'status'
  ) then
    raise exception 'Private Spending Upgrade evidence is immutable after submission.';
  end if;
  return new;
end;
$$;

create or replace function public.direct_spending_upgrade_guard_assignment()
returns trigger
language plpgsql
set search_path = pg_catalog
as $$
declare
  baseline_creator uuid;
  offer_baseline uuid;
begin
  select creator_profile_id into baseline_creator
  from public.direct_spending_upgrade_baselines
  where id = new.baseline_id;
  if not found then
    raise exception 'Spending Upgrade baseline not found for review assignment.';
  end if;
  if new.reviewer_profile_id = baseline_creator then
    raise exception 'A creator cannot review their own Spending Upgrade evidence.';
  end if;
  if exists (
    select 1
    from public.direct_spending_upgrade_candidates candidate
    join public.direct_spending_upgrade_offers offer
      on offer.id = candidate.offer_id
    where offer.baseline_id = new.baseline_id
      and candidate.profile_id = new.reviewer_profile_id
  ) or exists (
    select 1
    from public.direct_spending_upgrade_proposals proposal
    join public.direct_spending_upgrade_offers offer
      on offer.id = proposal.offer_id
    where offer.baseline_id = new.baseline_id
      and proposal.proposer_profile_id = new.reviewer_profile_id
  ) then
    raise exception 'A Spending Upgrade counterparty cannot review evidence for the same baseline.';
  end if;
  if new.review_scope = 'spending_change' then
    select baseline_id into offer_baseline
    from public.direct_spending_upgrade_offers
    where id = new.offer_id;
    if offer_baseline is distinct from new.baseline_id then
      raise exception 'The review assignment does not match the Spending Upgrade baseline.';
    end if;
  end if;
  if new.conflict_attested_at > timezone('utc', now()) + interval '5 minutes' then
    raise exception 'Reviewer conflict attestation time is invalid.';
  end if;
  if tg_op = 'UPDATE' and (
    to_jsonb(new) - array['status', 'completed_at']
    is distinct from
    to_jsonb(old) - array['status', 'completed_at']
  ) then
    raise exception 'Spending Upgrade reviewer authority cannot be reassigned in place.';
  end if;
  return new;
end;
$$;

create or replace function public.direct_spending_upgrade_guard_obligation()
returns trigger
language plpgsql
set search_path = pg_catalog
as $$
declare
  offer_row public.direct_spending_upgrade_offers%rowtype;
  candidate_row public.direct_spending_upgrade_candidates%rowtype;
begin
  select * into offer_row
  from public.direct_spending_upgrade_offers
  where id = new.offer_id;
  if not found then
    raise exception 'Spending Upgrade offer not found for donation obligation.';
  end if;
  if new.environment is distinct from offer_row.environment
     or new.expected_recipient is distinct from offer_row.upgraded_recipient
     or new.expected_recipient_hash is distinct from offer_row.upgraded_recipient_hash
     or new.terms_hash is distinct from offer_row.terms_hash then
    raise exception 'The Spending Upgrade obligation does not match frozen offer identity.';
  end if;
  if new.partner_donation_id is distinct from
     'direct-spending-upgrade:' || new.environment || ':' || new.id::text then
    raise exception 'The Spending Upgrade provider donation ID does not match the obligation identity.';
  end if;
  if new.obligation_kind = 'creator_converted_spending' then
    if new.participant_role <> 'creator'
       or new.participant_profile_id is distinct from offer_row.creator_profile_id
       or new.candidate_id is not null
       or new.expected_amount_cents is distinct from offer_row.creator_diversion_amount_cents then
      raise exception 'The creator Spending Upgrade obligation does not match frozen terms.';
    end if;
  elsif new.obligation_kind = 'matcher_incremental' then
    select * into candidate_row
    from public.direct_spending_upgrade_candidates
    where id = new.candidate_id
      and offer_id = offer_row.id;
    if not found
       or new.participant_role <> 'matcher'
       or new.participant_profile_id is distinct from candidate_row.profile_id
       or new.expected_amount_cents is distinct from offer_row.matcher_amount_cents then
      raise exception 'The matcher Spending Upgrade obligation does not match frozen terms.';
    end if;
  else
    raise exception 'Invalid Spending Upgrade obligation kind.';
  end if;
  if tg_op = 'UPDATE' and (
    to_jsonb(new) - array[
      'status', 'checkout_started_at', 'provider_charge_id_hash',
      'provider_payload_hash', 'provider_gross_amount_cents',
      'provider_net_amount_cents', 'provider_currency',
      'provider_nonprofit_slug', 'provider_nonprofit_ein',
      'provider_donation_date', 'provider_payment_method',
      'failure_code', 'failure_message', 'verified_at', 'updated_at'
    ]
    is distinct from
    to_jsonb(old) - array[
      'status', 'checkout_started_at', 'provider_charge_id_hash',
      'provider_payload_hash', 'provider_gross_amount_cents',
      'provider_net_amount_cents', 'provider_currency',
      'provider_nonprofit_slug', 'provider_nonprofit_ein',
      'provider_donation_date', 'provider_payment_method',
      'failure_code', 'failure_message', 'verified_at', 'updated_at'
    ]
  ) then
    raise exception 'Spending Upgrade donation obligation terms are immutable.';
  end if;
  return new;
end;
$$;

create or replace function public.direct_spending_upgrade_guard_credit()
returns trigger
language plpgsql
set search_path = pg_catalog
as $$
declare
  obligation_row public.direct_spending_upgrade_obligations%rowtype;
  offer_row public.direct_spending_upgrade_offers%rowtype;
  decision_row public.direct_spending_upgrade_review_decisions%rowtype;
begin
  select * into obligation_row
  from public.direct_spending_upgrade_obligations
  where id = new.obligation_id;
  if not found or obligation_row.status <> 'verified' then
    raise exception 'A Spending Upgrade credit requires a verified donation obligation.';
  end if;
  select * into offer_row
  from public.direct_spending_upgrade_offers
  where id = obligation_row.offer_id;
  if not found
     or new.offer_id is distinct from obligation_row.offer_id
     or new.profile_id is distinct from obligation_row.participant_profile_id
     or new.recipient_hash is distinct from obligation_row.expected_recipient_hash
     or new.provider_charge_id_hash is distinct from obligation_row.provider_charge_id_hash
     or new.verified_gross_amount_cents is distinct from obligation_row.provider_gross_amount_cents
     or new.verified_net_amount_cents is distinct from obligation_row.provider_net_amount_cents
     or new.verified_at is distinct from obligation_row.verified_at then
    raise exception 'The Spending Upgrade credit does not match provider-verified identity.';
  end if;
  if new.credit_kind = 'converted_spending' then
    select * into decision_row
    from public.direct_spending_upgrade_review_decisions
    where id = new.evidence_decision_id
      and offer_id = offer_row.id
      and review_scope = 'spending_change'
      and outcome = 'accepted';
    if obligation_row.obligation_kind <> 'creator_converted_spending'
       or offer_row.spending_change_review_status <> 'accepted'
       or not found then
      raise exception 'Converted-spending credit requires accepted scoped evidence.';
    end if;
  elsif new.credit_kind = 'matcher_incremental' then
    if obligation_row.obligation_kind <> 'matcher_incremental'
       or new.evidence_decision_id is not null then
      raise exception 'Matcher incremental credit must bind the matcher donation only.';
    end if;
  else
    raise exception 'Invalid Spending Upgrade credit kind.';
  end if;
  return new;
end;
$$;

create or replace function public.direct_spending_upgrade_audit(
  p_offer_id uuid,
  p_baseline_id uuid,
  p_obligation_id uuid,
  p_candidate_id uuid,
  p_actor_profile_id uuid,
  p_event_type text,
  p_details jsonb default '{}'::jsonb
)
returns void
language plpgsql
security definer
set search_path = pg_catalog
as $$
begin
  insert into public.direct_spending_upgrade_audit_events(
    offer_id,
    baseline_id,
    obligation_id,
    candidate_id,
    actor_profile_id,
    event_type,
    details
  ) values (
    p_offer_id,
    p_baseline_id,
    p_obligation_id,
    p_candidate_id,
    p_actor_profile_id,
    left(coalesce(p_event_type, ''), 160),
    coalesce(p_details, '{}'::jsonb)
  );
end;
$$;

drop trigger if exists direct_spending_upgrade_baselines_updated_at
  on public.direct_spending_upgrade_baselines;
create trigger direct_spending_upgrade_baselines_updated_at
before update on public.direct_spending_upgrade_baselines
for each row execute function public.direct_spending_upgrade_set_updated_at();

drop trigger if exists direct_spending_upgrade_baseline_immutable
  on public.direct_spending_upgrade_baselines;
create trigger direct_spending_upgrade_baseline_immutable
before update on public.direct_spending_upgrade_baselines
for each row execute function public.direct_spending_upgrade_guard_baseline();

drop trigger if exists direct_spending_upgrade_offers_updated_at
  on public.direct_spending_upgrade_offers;
create trigger direct_spending_upgrade_offers_updated_at
before update on public.direct_spending_upgrade_offers
for each row execute function public.direct_spending_upgrade_set_updated_at();

drop trigger if exists direct_spending_upgrade_offer_consistency
  on public.direct_spending_upgrade_offers;
create trigger direct_spending_upgrade_offer_consistency
before insert or update on public.direct_spending_upgrade_offers
for each row execute function public.direct_spending_upgrade_guard_offer();

drop trigger if exists direct_spending_upgrade_candidates_updated_at
  on public.direct_spending_upgrade_candidates;
create trigger direct_spending_upgrade_candidates_updated_at
before update on public.direct_spending_upgrade_candidates
for each row execute function public.direct_spending_upgrade_set_updated_at();

drop trigger if exists direct_spending_upgrade_candidate_immutable
  on public.direct_spending_upgrade_candidates;
create trigger direct_spending_upgrade_candidate_immutable
before insert or update on public.direct_spending_upgrade_candidates
for each row execute function public.direct_spending_upgrade_guard_candidate();

drop trigger if exists direct_spending_upgrade_proposals_updated_at
  on public.direct_spending_upgrade_proposals;
create trigger direct_spending_upgrade_proposals_updated_at
before update on public.direct_spending_upgrade_proposals
for each row execute function public.direct_spending_upgrade_set_updated_at();

drop trigger if exists direct_spending_upgrade_proposal_immutable
  on public.direct_spending_upgrade_proposals;
create trigger direct_spending_upgrade_proposal_immutable
before insert or update on public.direct_spending_upgrade_proposals
for each row execute function public.direct_spending_upgrade_guard_proposal();

drop trigger if exists direct_spending_upgrade_evidence_immutable
  on public.direct_spending_upgrade_evidence_records;
create trigger direct_spending_upgrade_evidence_immutable
before update on public.direct_spending_upgrade_evidence_records
for each row execute function public.direct_spending_upgrade_guard_evidence();

drop trigger if exists direct_spending_upgrade_assignment_consistency
  on public.direct_spending_upgrade_review_assignments;
create trigger direct_spending_upgrade_assignment_consistency
before insert or update on public.direct_spending_upgrade_review_assignments
for each row execute function public.direct_spending_upgrade_guard_assignment();

drop trigger if exists direct_spending_upgrade_obligations_updated_at
  on public.direct_spending_upgrade_obligations;
create trigger direct_spending_upgrade_obligations_updated_at
before update on public.direct_spending_upgrade_obligations
for each row execute function public.direct_spending_upgrade_set_updated_at();

drop trigger if exists direct_spending_upgrade_obligation_immutable
  on public.direct_spending_upgrade_obligations;
create trigger direct_spending_upgrade_obligation_immutable
before insert or update on public.direct_spending_upgrade_obligations
for each row execute function public.direct_spending_upgrade_guard_obligation();

drop trigger if exists direct_spending_upgrade_decisions_append_only
  on public.direct_spending_upgrade_review_decisions;
create trigger direct_spending_upgrade_decisions_append_only
before update or delete on public.direct_spending_upgrade_review_decisions
for each row execute function public.direct_spending_upgrade_prevent_mutation();

drop trigger if exists direct_spending_upgrade_credits_append_only
  on public.direct_spending_upgrade_impact_credits;
create trigger direct_spending_upgrade_credits_append_only
before update or delete on public.direct_spending_upgrade_impact_credits
for each row execute function public.direct_spending_upgrade_prevent_mutation();

drop trigger if exists direct_spending_upgrade_credit_consistency
  on public.direct_spending_upgrade_impact_credits;
create trigger direct_spending_upgrade_credit_consistency
before insert on public.direct_spending_upgrade_impact_credits
for each row execute function public.direct_spending_upgrade_guard_credit();

drop trigger if exists direct_spending_upgrade_audit_append_only
  on public.direct_spending_upgrade_audit_events;
create trigger direct_spending_upgrade_audit_append_only
before update or delete on public.direct_spending_upgrade_audit_events
for each row execute function public.direct_spending_upgrade_prevent_mutation();

create or replace function public.direct_spending_upgrade_mint_credit(
  p_offer_id uuid,
  p_evidence_decision_id uuid default null
)
returns void
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  offer_row public.direct_spending_upgrade_offers%rowtype;
  obligation_row public.direct_spending_upgrade_obligations%rowtype;
begin
  select * into offer_row
  from public.direct_spending_upgrade_offers
  where id = p_offer_id
  for update;
  if not found then
    raise exception 'Spending Upgrade offer not found while minting credit.';
  end if;

  if offer_row.spending_change_review_status = 'accepted' then
    select * into obligation_row
    from public.direct_spending_upgrade_obligations
    where offer_id = offer_row.id
      and obligation_kind = 'creator_converted_spending'
    for update;
    if found and obligation_row.status = 'verified' then
      if p_evidence_decision_id is null then
        select decision.id into p_evidence_decision_id
        from public.direct_spending_upgrade_review_decisions decision
        where decision.offer_id = offer_row.id
          and decision.review_scope = 'spending_change'
          and decision.outcome = 'accepted'
        order by decision.created_at desc
        limit 1;
      end if;
      if p_evidence_decision_id is null then
        raise exception 'Accepted spending evidence decision is required for creator credit.';
      end if;
      insert into public.direct_spending_upgrade_impact_credits(
        offer_id,
        obligation_id,
        profile_id,
        credit_kind,
        recipient_hash,
        verified_gross_amount_cents,
        verified_net_amount_cents,
        converted_spending_gross_amount_cents,
        converted_spending_net_amount_cents,
        incremental_gross_amount_cents,
        incremental_net_amount_cents,
        provider_charge_id_hash,
        evidence_decision_id,
        verified_at
      ) values (
        offer_row.id,
        obligation_row.id,
        obligation_row.participant_profile_id,
        'converted_spending',
        obligation_row.expected_recipient_hash,
        obligation_row.provider_gross_amount_cents,
        obligation_row.provider_net_amount_cents,
        obligation_row.provider_gross_amount_cents,
        obligation_row.provider_net_amount_cents,
        0,
        0,
        obligation_row.provider_charge_id_hash,
        p_evidence_decision_id,
        obligation_row.verified_at
      ) on conflict (obligation_id) do nothing;
    end if;
  end if;

  select * into obligation_row
  from public.direct_spending_upgrade_obligations
  where offer_id = offer_row.id
    and obligation_kind = 'matcher_incremental'
  for update;
  if found and obligation_row.status = 'verified' then
    insert into public.direct_spending_upgrade_impact_credits(
      offer_id,
      obligation_id,
      profile_id,
      credit_kind,
      recipient_hash,
      verified_gross_amount_cents,
      verified_net_amount_cents,
      converted_spending_gross_amount_cents,
      converted_spending_net_amount_cents,
      incremental_gross_amount_cents,
      incremental_net_amount_cents,
      provider_charge_id_hash,
      evidence_decision_id,
      verified_at
    ) values (
      offer_row.id,
      obligation_row.id,
      obligation_row.participant_profile_id,
      'matcher_incremental',
      obligation_row.expected_recipient_hash,
      obligation_row.provider_gross_amount_cents,
      obligation_row.provider_net_amount_cents,
      0,
      0,
      obligation_row.provider_gross_amount_cents,
      obligation_row.provider_net_amount_cents,
      obligation_row.provider_charge_id_hash,
      null,
      obligation_row.verified_at
    ) on conflict (obligation_id) do nothing;
  end if;
end;
$$;

create or replace function public.direct_spending_upgrade_refresh_completion(
  p_offer_id uuid
)
returns void
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  offer_row public.direct_spending_upgrade_offers%rowtype;
  verified_count integer;
  credit_count integer;
begin
  select * into offer_row
  from public.direct_spending_upgrade_offers
  where id = p_offer_id
  for update;
  if not found then
    raise exception 'Spending Upgrade offer not found while refreshing completion.';
  end if;
  select count(*)::integer into verified_count
  from public.direct_spending_upgrade_obligations
  where offer_id = offer_row.id
    and status = 'verified';
  select count(*)::integer into credit_count
  from public.direct_spending_upgrade_impact_credits credit
  join public.direct_spending_upgrade_obligations obligation
    on obligation.id = credit.obligation_id
   and obligation.offer_id = credit.offer_id
   and obligation.participant_profile_id = credit.profile_id
   and obligation.expected_recipient_hash = credit.recipient_hash
   and obligation.provider_charge_id_hash = credit.provider_charge_id_hash
   and obligation.provider_gross_amount_cents = credit.verified_gross_amount_cents
   and obligation.provider_net_amount_cents = credit.verified_net_amount_cents
   and obligation.verified_at = credit.verified_at
  where credit.offer_id = offer_row.id
    and credit.credit_kind in ('converted_spending', 'matcher_incremental')
    and obligation.status = 'verified';
  if offer_row.spending_change_review_status = 'accepted'
     and verified_count = 2
     and credit_count = 2 then
    update public.direct_spending_upgrade_offers
    set status = 'completed',
        completed_at = coalesce(completed_at, timezone('utc', now())),
        failure_code = '',
        failure_message = ''
    where id = offer_row.id;
    update public.direct_spending_upgrade_candidates
    set status = 'fulfilled',
        fulfilled_at = coalesce(fulfilled_at, timezone('utc', now()))
    where id = offer_row.winning_candidate_id
      and status = 'primary';
  end if;
end;
$$;

create or replace function public.create_direct_spending_upgrade_offer(
  p_creator_profile_id uuid,
  p_environment text,
  p_category text,
  p_private_merchant_label text,
  p_private_description text,
  p_planned_spend_amount_cents integer,
  p_creator_diversion_amount_cents integer,
  p_planned_action text,
  p_evidence_payload jsonb,
  p_evidence_hash text,
  p_evidence_captured_at timestamptz,
  p_baseline_fingerprint text,
  p_matcher_amount_cents integer,
  p_match_deadline_at timestamptz,
  p_privacy_mode text,
  p_upgraded_recipient jsonb,
  p_upgraded_recipient_hash text,
  p_terms_hash text,
  p_nonessential_attested boolean,
  p_no_material_harm_attested boolean,
  p_preexisting_plan_attested boolean,
  p_not_already_cancelled_attested boolean,
  p_available_funds_attested boolean,
  p_not_otherwise_donating_attested boolean
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  baseline_row public.direct_spending_upgrade_baselines%rowtype;
  offer_row public.direct_spending_upgrade_offers%rowtype;
  expected_evidence_hash text;
  expected_terms_hash text;
  now_utc timestamptz := timezone('utc', now());
begin
  if p_creator_profile_id is null then
    raise exception 'A Spending Upgrade creator is required.';
  end if;
  if p_environment not in ('staging', 'live') then
    raise exception 'Invalid Spending Upgrade environment.';
  end if;
  if p_category not in (
    'recurring_subscription',
    'cancellable_reservation_or_service',
    'pending_order_or_upgrade'
  ) then
    raise exception 'The baseline category is excluded from Spending Upgrade.';
  end if;
  if p_planned_action not in ('cancel', 'reduce', 'downgrade') then
    raise exception 'Invalid Spending Upgrade action.';
  end if;
  if p_planned_spend_amount_cents not between 100 and 5000000
     or p_creator_diversion_amount_cents not between 100 and p_planned_spend_amount_cents
     or p_matcher_amount_cents not between 100 and 5000000 then
    raise exception 'Spending Upgrade exact-cent amounts are invalid.';
  end if;
  if p_match_deadline_at < now_utc + interval '1 hour'
     or p_match_deadline_at > now_utc + interval '30 days' then
    raise exception 'Spending Upgrade match deadline is outside the allowed window.';
  end if;
  if p_evidence_captured_at is null
     or p_evidence_captured_at > now_utc + interval '5 minutes' then
    raise exception 'Prospective baseline evidence capture time is invalid.';
  end if;
  if jsonb_typeof(p_evidence_payload) is distinct from 'object' then
    raise exception 'Private baseline evidence must be an object.';
  end if;
  if lower(coalesce(p_baseline_fingerprint, '')) !~ '^[0-9a-f]{64}$' then
    raise exception 'A stable private baseline fingerprint is required.';
  end if;
  if not coalesce(p_nonessential_attested, false)
     or not coalesce(p_no_material_harm_attested, false)
     or not coalesce(p_preexisting_plan_attested, false)
     or not coalesce(p_not_already_cancelled_attested, false)
     or not coalesce(p_available_funds_attested, false)
     or not coalesce(p_not_otherwise_donating_attested, false) then
    raise exception 'Every Spending Upgrade safety attestation is required.';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(lower(p_baseline_fingerprint), 0)
  );
  perform public.direct_donation_upgrade_lock_profile_eligibility(
    p_creator_profile_id
  );
  if public.direct_donation_upgrade_temporarily_restricted(p_creator_profile_id) then
    raise exception 'This profile is temporarily restricted from donation commitments.';
  end if;

  expected_evidence_hash := public.direct_spending_upgrade_evidence_hash_v1(
    p_evidence_payload,
    p_evidence_captured_at
  );
  if lower(coalesce(p_evidence_hash, '')) is distinct from expected_evidence_hash then
    raise exception 'The private baseline evidence hash is invalid.';
  end if;
  perform public.direct_donation_upgrade_validate_recipient(
    p_upgraded_recipient,
    p_upgraded_recipient_hash
  );
  expected_terms_hash := public.direct_spending_upgrade_terms_hash_v1(
    p_creator_profile_id,
    p_category,
    p_planned_action,
    p_planned_spend_amount_cents,
    p_creator_diversion_amount_cents,
    p_matcher_amount_cents,
    p_upgraded_recipient_hash,
    p_match_deadline_at,
    p_privacy_mode,
    p_environment,
    expected_evidence_hash,
    p_evidence_captured_at,
    p_baseline_fingerprint
  );
  if lower(coalesce(p_terms_hash, '')) is distinct from expected_terms_hash then
    raise exception 'The Spending Upgrade subtype terms hash is invalid.';
  end if;

  insert into public.direct_spending_upgrade_baselines(
    creator_profile_id,
    schema_version,
    category,
    private_merchant_label,
    private_description,
    planned_spend_amount_cents,
    planned_action,
    evidence_schema_version,
    evidence_payload,
    evidence_hash,
    evidence_captured_at,
    baseline_fingerprint,
    safety_attestation_version,
    consent_version,
    nonessential_attested,
    no_material_harm_attested,
    preexisting_plan_attested,
    not_already_cancelled_attested,
    available_funds_attested,
    not_otherwise_donating_attested,
    review_status
  ) values (
    p_creator_profile_id,
    'direct-spending-upgrade-baseline-v1-2026-08-14',
    p_category,
    left(trim(p_private_merchant_label), 180),
    left(trim(p_private_description), 1200),
    p_planned_spend_amount_cents,
    p_planned_action,
    'direct-spending-upgrade-private-evidence-v1-2026-08-14',
    p_evidence_payload,
    expected_evidence_hash,
    p_evidence_captured_at,
    lower(p_baseline_fingerprint),
    'direct-spending-upgrade-safety-v1-2026-08-14',
    'direct-spending-upgrade-consent-v1-2026-08-14',
    true,
    true,
    true,
    true,
    true,
    true,
    'review_required'
  ) returning * into baseline_row;

  insert into public.direct_spending_upgrade_offers(
    baseline_id,
    creator_profile_id,
    environment,
    status,
    privacy_mode,
    creator_diversion_amount_cents,
    retained_spending_amount_cents,
    diversion_basis_points,
    matcher_amount_cents,
    match_deadline_at,
    upgraded_recipient,
    upgraded_recipient_hash,
    spending_change_review_status,
    terms_hash
  ) values (
    baseline_row.id,
    p_creator_profile_id,
    p_environment,
    'review_required',
    p_privacy_mode,
    p_creator_diversion_amount_cents,
    p_planned_spend_amount_cents - p_creator_diversion_amount_cents,
    public.direct_spending_upgrade_diversion_basis_points(
      p_planned_spend_amount_cents,
      p_creator_diversion_amount_cents
    ),
    p_matcher_amount_cents,
    p_match_deadline_at,
    p_upgraded_recipient,
    lower(p_upgraded_recipient_hash),
    null,
    expected_terms_hash
  ) returning * into offer_row;

  perform public.direct_spending_upgrade_audit(
    offer_row.id,
    baseline_row.id,
    null,
    null,
    p_creator_profile_id,
    'spending_upgrade_baseline_frozen',
    jsonb_build_object(
      'category', baseline_row.category,
      'plannedAction', baseline_row.planned_action,
      'plannedSpendAmountCents', baseline_row.planned_spend_amount_cents,
      'creatorDiversionAmountCents', offer_row.creator_diversion_amount_cents,
      'matcherAmountCents', offer_row.matcher_amount_cents,
      'reviewStatus', baseline_row.review_status
    )
  );
  return jsonb_build_object(
    'outcome', 'review_required',
    'baseline', to_jsonb(baseline_row) - array[
      'private_merchant_label', 'private_description', 'evidence_payload',
      'evidence_hash', 'baseline_fingerprint'
    ],
    'offer', to_jsonb(offer_row)
  );
end;
$$;

create or replace function public.assign_direct_spending_upgrade_reviewer(
  p_baseline_id uuid,
  p_offer_id uuid,
  p_review_scope text,
  p_reviewer_profile_id uuid,
  p_conflict_attested boolean,
  p_authority_version text
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  assignment_row public.direct_spending_upgrade_review_assignments%rowtype;
  baseline_row public.direct_spending_upgrade_baselines%rowtype;
  offer_row public.direct_spending_upgrade_offers%rowtype;
begin
  if p_baseline_id is null or p_reviewer_profile_id is null then
    raise exception 'A Spending Upgrade baseline and reviewer are required.';
  end if;
  if p_review_scope not in ('baseline', 'spending_change') then
    raise exception 'Invalid Spending Upgrade review scope.';
  end if;
  if p_authority_version is distinct from
     'direct-spending-upgrade-assigned-reviewer-v1-2026-08-14' then
    raise exception 'Invalid Spending Upgrade reviewer authority version.';
  end if;
  if not coalesce(p_conflict_attested, false) then
    raise exception 'A scoped reviewer conflict attestation is required.';
  end if;
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(
      'moraltrade:direct-spending-upgrade-review-conflict:' || p_baseline_id::text,
      0
    )
  );
  select * into baseline_row
  from public.direct_spending_upgrade_baselines
  where id = p_baseline_id;
  if not found then
    raise exception 'Spending Upgrade baseline not found for review assignment.';
  end if;
  if exists (
    select 1
    from public.direct_spending_upgrade_candidates candidate
    join public.direct_spending_upgrade_offers offer
      on offer.id = candidate.offer_id
    where offer.baseline_id = baseline_row.id
      and candidate.profile_id = p_reviewer_profile_id
  ) or exists (
    select 1
    from public.direct_spending_upgrade_proposals proposal
    join public.direct_spending_upgrade_offers offer
      on offer.id = proposal.offer_id
    where offer.baseline_id = baseline_row.id
      and proposal.proposer_profile_id = p_reviewer_profile_id
  ) then
    raise exception 'A Spending Upgrade counterparty cannot review evidence for the same baseline.';
  end if;
  if p_review_scope = 'baseline' then
    if p_offer_id is not null then
      raise exception 'Baseline review authority cannot be scoped to an offer.';
    end if;
    if baseline_row.review_status = 'accepted' then
      raise exception 'An accepted Spending Upgrade baseline requires an append-only correction process.';
    end if;
  else
    select * into offer_row
    from public.direct_spending_upgrade_offers
    where id = p_offer_id
      and baseline_id = p_baseline_id;
    if not found then
      raise exception 'Spending Upgrade offer not found for review assignment.';
    end if;
    if offer_row.spending_change_review_status = 'accepted'
       or exists (
         select 1
         from public.direct_spending_upgrade_impact_credits credit
         where credit.offer_id = offer_row.id
           and credit.credit_kind = 'converted_spending'
       ) then
      raise exception 'Accepted Spending Upgrade evidence requires an append-only correction process.';
    end if;
    if not exists (
      select 1
      from public.direct_spending_upgrade_evidence_records evidence
      where evidence.offer_id = offer_row.id
        and evidence.status in ('submitted', 'review_required', 'disputed')
    ) then
      raise exception 'No review-required Spending Upgrade evidence exists for this offer.';
    end if;
  end if;
  select * into assignment_row
  from public.direct_spending_upgrade_review_assignments
  where baseline_id = p_baseline_id
    and coalesce(offer_id, '00000000-0000-0000-0000-000000000000'::uuid)
      = coalesce(p_offer_id, '00000000-0000-0000-0000-000000000000'::uuid)
    and review_scope = p_review_scope
    and status = 'assigned'
  for update;
  if found then
    if assignment_row.reviewer_profile_id is distinct from p_reviewer_profile_id then
      raise exception 'This evidence scope already has another assigned reviewer.';
    end if;
    return jsonb_build_object('outcome', 'already_assigned', 'assignment', to_jsonb(assignment_row));
  end if;
  insert into public.direct_spending_upgrade_review_assignments(
    baseline_id,
    offer_id,
    review_scope,
    reviewer_profile_id,
    authority_version,
    conflict_attested_at
  ) values (
    p_baseline_id,
    case when p_review_scope = 'baseline' then null else p_offer_id end,
    p_review_scope,
    p_reviewer_profile_id,
    p_authority_version,
    timezone('utc', now())
  ) returning * into assignment_row;
  perform public.direct_spending_upgrade_audit(
    p_offer_id,
    p_baseline_id,
    null,
    null,
    null,
    'scoped_reviewer_assigned',
    jsonb_build_object('scope', p_review_scope, 'authorityVersion', p_authority_version)
  );
  return jsonb_build_object('outcome', 'assigned', 'assignment', to_jsonb(assignment_row));
end;
$$;

create or replace function public.direct_spending_upgrade_create_obligations(
  p_offer_id uuid,
  p_candidate_id uuid
)
returns void
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  offer_row public.direct_spending_upgrade_offers%rowtype;
  candidate_row public.direct_spending_upgrade_candidates%rowtype;
  creator_obligation_id uuid := gen_random_uuid();
  matcher_obligation_id uuid := gen_random_uuid();
  due_at timestamptz := timezone('utc', now()) + interval '7 days';
  grace_at timestamptz := timezone('utc', now()) + interval '8 days';
begin
  select * into offer_row
  from public.direct_spending_upgrade_offers
  where id = p_offer_id
  for update;
  select * into candidate_row
  from public.direct_spending_upgrade_candidates
  where id = p_candidate_id
    and offer_id = p_offer_id
  for update;
  if not found then
    raise exception 'Spending Upgrade matcher not found.';
  end if;
  if exists (
    select 1 from public.direct_spending_upgrade_obligations
    where offer_id = offer_row.id
  ) then
    raise exception 'Spending Upgrade donation obligations already exist.';
  end if;

  insert into public.direct_spending_upgrade_obligations(
    id,
    offer_id,
    candidate_id,
    participant_profile_id,
    participant_role,
    obligation_kind,
    environment,
    expected_recipient,
    expected_recipient_hash,
    expected_amount_cents,
    terms_hash,
    partner_donation_id,
    due_at,
    webhook_grace_ends_at
  ) values
  (
    creator_obligation_id,
    offer_row.id,
    null,
    offer_row.creator_profile_id,
    'creator',
    'creator_converted_spending',
    offer_row.environment,
    offer_row.upgraded_recipient,
    offer_row.upgraded_recipient_hash,
    offer_row.creator_diversion_amount_cents,
    offer_row.terms_hash,
    'direct-spending-upgrade:' || offer_row.environment || ':' || creator_obligation_id::text,
    due_at,
    grace_at
  ),
  (
    matcher_obligation_id,
    offer_row.id,
    candidate_row.id,
    candidate_row.profile_id,
    'matcher',
    'matcher_incremental',
    offer_row.environment,
    offer_row.upgraded_recipient,
    offer_row.upgraded_recipient_hash,
    offer_row.matcher_amount_cents,
    offer_row.terms_hash,
    'direct-spending-upgrade:' || offer_row.environment || ':' || matcher_obligation_id::text,
    due_at,
    grace_at
  );

  update public.direct_spending_upgrade_offers
  set status = 'matched',
      winning_candidate_id = candidate_row.id,
      match_locked_at = timezone('utc', now()),
      fulfillment_deadline_at = due_at,
      webhook_grace_ends_at = grace_at,
      spending_change_review_status = 'review_required'
  where id = offer_row.id;
  perform public.direct_spending_upgrade_audit(
    offer_row.id,
    offer_row.baseline_id,
    null,
    candidate_row.id,
    candidate_row.profile_id,
    'spending_upgrade_matched',
    jsonb_build_object(
      'creatorDonationCents', offer_row.creator_diversion_amount_cents,
      'matcherDonationCents', offer_row.matcher_amount_cents,
      'donationObligationCount', 2,
      'spendingEvidenceRequired', true
    )
  );
end;
$$;

create or replace function public.join_direct_spending_upgrade_offer(
  p_actor_profile_id uuid,
  p_offer_id uuid,
  p_commitment_version text,
  p_expected_environment text
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  offer_row public.direct_spending_upgrade_offers%rowtype;
  baseline_row public.direct_spending_upgrade_baselines%rowtype;
  candidate_row public.direct_spending_upgrade_candidates%rowtype;
begin
  perform pg_catalog.pg_advisory_xact_lock_shared(
    pg_catalog.hashtextextended('moraltrade:direct-spending-upgrade-lifecycle', 0)
  );
  select * into offer_row
  from public.direct_spending_upgrade_offers
  where id = p_offer_id
  for update;
  if not found then
    raise exception 'Spending Upgrade offer not found.';
  end if;
  select * into baseline_row
  from public.direct_spending_upgrade_baselines
  where id = offer_row.baseline_id
  for share;
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(
      'moraltrade:direct-spending-upgrade-review-conflict:' || offer_row.baseline_id::text,
      0
    )
  );
  if exists (
    select 1
    from public.direct_spending_upgrade_review_assignments assignment
    where assignment.baseline_id = offer_row.baseline_id
      and assignment.reviewer_profile_id = p_actor_profile_id
  ) then
    raise exception 'An assigned Spending Upgrade reviewer cannot become a counterparty for the same baseline.';
  end if;
  if offer_row.environment is distinct from p_expected_environment then
    raise exception 'The Spending Upgrade belongs to another environment.';
  end if;
  if offer_row.status <> 'open' or offer_row.match_deadline_at <= timezone('utc', now()) then
    raise exception 'The Spending Upgrade is not open for matching.';
  end if;
  if baseline_row.review_status <> 'accepted' then
    raise exception 'The prospective spending baseline is not accepted.';
  end if;
  if p_actor_profile_id = offer_row.creator_profile_id then
    raise exception 'A creator cannot match their own Spending Upgrade.';
  end if;
  if p_commitment_version is distinct from
     'direct-spending-upgrade-matcher-v1-2026-08-14' then
    raise exception 'The Spending Upgrade matcher commitment version is invalid.';
  end if;
  perform public.direct_donation_upgrade_lock_profile_eligibility(p_actor_profile_id);
  if public.direct_donation_upgrade_temporarily_restricted(p_actor_profile_id) then
    raise exception 'This profile is temporarily restricted from donation commitments.';
  end if;
  insert into public.direct_spending_upgrade_candidates(
    offer_id,
    profile_id,
    status,
    commitment_version
  ) values (
    offer_row.id,
    p_actor_profile_id,
    'primary',
    p_commitment_version
  ) returning * into candidate_row;
  perform public.direct_spending_upgrade_create_obligations(
    offer_row.id,
    candidate_row.id
  );
  select * into offer_row
  from public.direct_spending_upgrade_offers
  where id = offer_row.id;
  return jsonb_build_object(
    'outcome', 'matched',
    'offer', to_jsonb(offer_row),
    'candidate', to_jsonb(candidate_row)
  );
end;
$$;

create or replace function public.propose_direct_spending_upgrade_terms(
  p_actor_profile_id uuid,
  p_offer_id uuid,
  p_creator_diversion_amount_cents integer,
  p_matcher_amount_cents integer,
  p_message text,
  p_commitment_version text,
  p_expected_environment text
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  offer_row public.direct_spending_upgrade_offers%rowtype;
  baseline_row public.direct_spending_upgrade_baselines%rowtype;
  proposal_row public.direct_spending_upgrade_proposals%rowtype;
begin
  select * into offer_row
  from public.direct_spending_upgrade_offers
  where id = p_offer_id
  for update;
  if not found then
    raise exception 'Spending Upgrade offer not found.';
  end if;
  select * into baseline_row
  from public.direct_spending_upgrade_baselines
  where id = offer_row.baseline_id;
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(
      'moraltrade:direct-spending-upgrade-review-conflict:' || offer_row.baseline_id::text,
      0
    )
  );
  if exists (
    select 1
    from public.direct_spending_upgrade_review_assignments assignment
    where assignment.baseline_id = offer_row.baseline_id
      and assignment.reviewer_profile_id = p_actor_profile_id
  ) then
    raise exception 'An assigned Spending Upgrade reviewer cannot become a counterparty for the same baseline.';
  end if;
  if offer_row.environment is distinct from p_expected_environment
     or offer_row.status <> 'open'
     or offer_row.match_deadline_at <= timezone('utc', now())
     or baseline_row.review_status <> 'accepted' then
    raise exception 'The Spending Upgrade is not open for counteroffers.';
  end if;
  if p_actor_profile_id = offer_row.creator_profile_id then
    raise exception 'A creator cannot propose to their own Spending Upgrade.';
  end if;
  if p_creator_diversion_amount_cents not between 100 and baseline_row.planned_spend_amount_cents
     or p_matcher_amount_cents not between 100 and 5000000 then
    raise exception 'The Spending Upgrade counteroffer amounts are invalid.';
  end if;
  if p_commitment_version is distinct from
     'direct-spending-upgrade-proposal-v1-2026-08-14' then
    raise exception 'The Spending Upgrade proposal commitment version is invalid.';
  end if;
  perform public.direct_donation_upgrade_lock_profile_eligibility(p_actor_profile_id);
  if public.direct_donation_upgrade_temporarily_restricted(p_actor_profile_id) then
    raise exception 'This profile is temporarily restricted from donation commitments.';
  end if;
  insert into public.direct_spending_upgrade_proposals(
    offer_id,
    proposer_profile_id,
    base_terms_hash,
    proposed_creator_diversion_amount_cents,
    proposed_diversion_basis_points,
    proposed_matcher_amount_cents,
    message,
    commitment_version
  ) values (
    offer_row.id,
    p_actor_profile_id,
    offer_row.terms_hash,
    p_creator_diversion_amount_cents,
    public.direct_spending_upgrade_diversion_basis_points(
      baseline_row.planned_spend_amount_cents,
      p_creator_diversion_amount_cents
    ),
    p_matcher_amount_cents,
    left(trim(coalesce(p_message, '')), 600),
    p_commitment_version
  ) returning * into proposal_row;
  perform public.direct_spending_upgrade_audit(
    offer_row.id,
    offer_row.baseline_id,
    null,
    null,
    p_actor_profile_id,
    'spending_upgrade_counteroffer_created',
    jsonb_build_object(
      'proposalId', proposal_row.id,
      'creatorDonationCents', proposal_row.proposed_creator_diversion_amount_cents,
      'matcherDonationCents', proposal_row.proposed_matcher_amount_cents
    )
  );
  return to_jsonb(proposal_row);
end;
$$;

create or replace function public.accept_direct_spending_upgrade_proposal(
  p_actor_profile_id uuid,
  p_proposal_id uuid,
  p_new_terms_hash text,
  p_expected_environment text
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  proposal_offer_id uuid;
  offer_row public.direct_spending_upgrade_offers%rowtype;
  baseline_row public.direct_spending_upgrade_baselines%rowtype;
  proposal_row public.direct_spending_upgrade_proposals%rowtype;
  successor_row public.direct_spending_upgrade_offers%rowtype;
  join_result jsonb;
begin
  perform pg_catalog.pg_advisory_xact_lock_shared(
    pg_catalog.hashtextextended('moraltrade:direct-spending-upgrade-lifecycle', 0)
  );
  select offer_id into proposal_offer_id
  from public.direct_spending_upgrade_proposals
  where id = p_proposal_id;
  if not found then
    raise exception 'Spending Upgrade counteroffer not found.';
  end if;
  select * into offer_row
  from public.direct_spending_upgrade_offers
  where id = proposal_offer_id
  for update;
  select * into proposal_row
  from public.direct_spending_upgrade_proposals
  where id = p_proposal_id
    and offer_id = offer_row.id
  for update;
  select * into baseline_row
  from public.direct_spending_upgrade_baselines
  where id = offer_row.baseline_id
  for share;
  if offer_row.creator_profile_id is distinct from p_actor_profile_id then
    raise exception 'Only the Spending Upgrade creator may accept a counteroffer.';
  end if;
  if offer_row.environment is distinct from p_expected_environment
     or offer_row.status <> 'open'
     or offer_row.match_deadline_at <= timezone('utc', now())
     or proposal_row.status <> 'pending'
     or proposal_row.base_terms_hash is distinct from offer_row.terms_hash then
    raise exception 'The Spending Upgrade counteroffer is no longer acceptable.';
  end if;

  update public.direct_spending_upgrade_offers
  set status = 'superseded'
  where id = offer_row.id;

  insert into public.direct_spending_upgrade_offers(
    baseline_id,
    creator_profile_id,
    environment,
    status,
    privacy_mode,
    creator_diversion_amount_cents,
    retained_spending_amount_cents,
    diversion_basis_points,
    matcher_amount_cents,
    match_deadline_at,
    upgraded_recipient,
    upgraded_recipient_hash,
    spending_change_review_status,
    terms_hash,
    supersedes_offer_id
  ) values (
    offer_row.baseline_id,
    offer_row.creator_profile_id,
    offer_row.environment,
    'open',
    offer_row.privacy_mode,
    proposal_row.proposed_creator_diversion_amount_cents,
    baseline_row.planned_spend_amount_cents - proposal_row.proposed_creator_diversion_amount_cents,
    proposal_row.proposed_diversion_basis_points,
    proposal_row.proposed_matcher_amount_cents,
    offer_row.match_deadline_at,
    offer_row.upgraded_recipient,
    offer_row.upgraded_recipient_hash,
    null,
    lower(p_new_terms_hash),
    offer_row.id
  ) returning * into successor_row;

  update public.direct_spending_upgrade_offers
  set superseded_by_offer_id = successor_row.id
  where id = offer_row.id;
  update public.direct_spending_upgrade_proposals
  set status = case when id = proposal_row.id then 'accepted' else 'superseded' end,
      responded_at = timezone('utc', now()),
      accepted_offer_id = case when id = proposal_row.id then successor_row.id else null end
  where offer_id = offer_row.id
    and status = 'pending';

  join_result := public.join_direct_spending_upgrade_offer(
    proposal_row.proposer_profile_id,
    successor_row.id,
    'direct-spending-upgrade-matcher-v1-2026-08-14',
    p_expected_environment
  );
  perform public.direct_spending_upgrade_audit(
    successor_row.id,
    successor_row.baseline_id,
    null,
    null,
    p_actor_profile_id,
    'spending_upgrade_counteroffer_accepted',
    jsonb_build_object(
      'proposalId', proposal_row.id,
      'supersedesOfferId', offer_row.id
    )
  );
  return jsonb_build_object(
    'outcome', 'accepted',
    'offer', join_result->'offer',
    'candidate', join_result->'candidate',
    'proposalId', proposal_row.id
  );
end;
$$;

create or replace function public.submit_direct_spending_upgrade_change_evidence(
  p_actor_profile_id uuid,
  p_offer_id uuid,
  p_private_payload jsonb,
  p_evidence_hash text,
  p_captured_at timestamptz,
  p_idempotency_key text,
  p_expected_environment text
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  offer_row public.direct_spending_upgrade_offers%rowtype;
  evidence_row public.direct_spending_upgrade_evidence_records%rowtype;
  expected_hash text;
begin
  select * into offer_row
  from public.direct_spending_upgrade_offers
  where id = p_offer_id
  for update;
  if not found then
    raise exception 'Spending Upgrade offer not found.';
  end if;
  if offer_row.creator_profile_id is distinct from p_actor_profile_id then
    raise exception 'Only the creator may submit spending-change evidence.';
  end if;
  if offer_row.environment is distinct from p_expected_environment
     or offer_row.status not in ('matched', 'needs_review') then
    raise exception 'Spending-change evidence is not available for this offer.';
  end if;
  if p_captured_at < offer_row.match_locked_at
     or p_captured_at > timezone('utc', now()) + interval '5 minutes' then
    raise exception 'Spending-change evidence must be captured after matching.';
  end if;
  if jsonb_typeof(p_private_payload) is distinct from 'object' then
    raise exception 'Private spending-change evidence must be an object.';
  end if;
  expected_hash := public.direct_spending_upgrade_change_evidence_hash_v1(
    offer_row.id,
    p_private_payload,
    p_captured_at
  );
  if lower(coalesce(p_evidence_hash, '')) is distinct from expected_hash then
    raise exception 'The spending-change evidence hash is invalid.';
  end if;
  select * into evidence_row
  from public.direct_spending_upgrade_evidence_records
  where offer_id = offer_row.id
    and idempotency_key = left(trim(p_idempotency_key), 180);
  if found then
    if evidence_row.evidence_hash is distinct from expected_hash then
      raise exception 'The evidence idempotency key was reused for different evidence.';
    end if;
    return jsonb_build_object('outcome', 'already_submitted', 'evidenceId', evidence_row.id);
  end if;
  if offer_row.spending_change_review_status = 'accepted'
     or exists (
       select 1
       from public.direct_spending_upgrade_impact_credits credit
       where credit.offer_id = offer_row.id
         and credit.credit_kind = 'converted_spending'
     ) then
    raise exception 'Accepted Spending Upgrade evidence requires an append-only correction process.';
  end if;
  if exists (
    select 1
    from public.direct_spending_upgrade_evidence_records evidence
    where evidence.offer_id = offer_row.id
      and evidence.status in ('submitted', 'review_required', 'disputed')
  ) then
    raise exception 'A Spending Upgrade evidence record is already awaiting scoped review.';
  end if;
  insert into public.direct_spending_upgrade_evidence_records(
    offer_id,
    submitted_by_profile_id,
    evidence_kind,
    schema_version,
    private_payload,
    evidence_hash,
    captured_at,
    status,
    idempotency_key
  ) values (
    offer_row.id,
    p_actor_profile_id,
    'spending_change',
    'direct-spending-upgrade-private-evidence-v1-2026-08-14',
    p_private_payload,
    expected_hash,
    p_captured_at,
    'review_required',
    left(trim(p_idempotency_key), 180)
  ) returning * into evidence_row;
  update public.direct_spending_upgrade_offers
  set spending_change_review_status = 'review_required',
      status = case
        when exists (
          select 1
          from public.direct_spending_upgrade_obligations obligation
          where obligation.offer_id = offer_row.id
            and obligation.status = 'needs_review'
        ) then 'needs_review'
        else 'matched'
      end,
      failure_code = case
        when exists (
          select 1
          from public.direct_spending_upgrade_obligations obligation
          where obligation.offer_id = offer_row.id
            and obligation.status = 'needs_review'
        ) then failure_code
        else ''
      end,
      failure_message = case
        when exists (
          select 1
          from public.direct_spending_upgrade_obligations obligation
          where obligation.offer_id = offer_row.id
            and obligation.status = 'needs_review'
        ) then failure_message
        else ''
      end
  where id = offer_row.id;
  perform public.direct_spending_upgrade_audit(
    offer_row.id,
    offer_row.baseline_id,
    null,
    offer_row.winning_candidate_id,
    p_actor_profile_id,
    'spending_change_evidence_submitted',
    jsonb_build_object('evidenceId', evidence_row.id, 'status', evidence_row.status)
  );
  return jsonb_build_object(
    'outcome', 'review_required',
    'evidenceId', evidence_row.id,
    'status', evidence_row.status
  );
end;
$$;

create or replace function public.start_direct_spending_upgrade_checkout(
  p_actor_profile_id uuid,
  p_obligation_id uuid,
  p_expected_environment text
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  obligation_row public.direct_spending_upgrade_obligations%rowtype;
  offer_row public.direct_spending_upgrade_offers%rowtype;
begin
  select * into obligation_row
  from public.direct_spending_upgrade_obligations
  where id = p_obligation_id
  for update;
  if not found then
    raise exception 'Spending Upgrade donation obligation not found.';
  end if;
  select * into offer_row
  from public.direct_spending_upgrade_offers
  where id = obligation_row.offer_id
  for share;
  if obligation_row.participant_profile_id is distinct from p_actor_profile_id then
    raise exception 'This Spending Upgrade obligation belongs to another participant.';
  end if;
  if obligation_row.environment is distinct from p_expected_environment
     or offer_row.environment is distinct from p_expected_environment
     or offer_row.status not in ('matched', 'needs_review')
     or obligation_row.status not in ('pending', 'checkout_started')
     or timezone('utc', now()) > obligation_row.due_at then
    raise exception 'This Spending Upgrade checkout is unavailable.';
  end if;
  update public.direct_spending_upgrade_obligations
  set status = 'checkout_started',
      checkout_started_at = coalesce(checkout_started_at, timezone('utc', now()))
  where id = obligation_row.id
  returning * into obligation_row;
  perform public.direct_spending_upgrade_audit(
    offer_row.id,
    offer_row.baseline_id,
    obligation_row.id,
    obligation_row.candidate_id,
    p_actor_profile_id,
    'spending_upgrade_checkout_started',
    jsonb_build_object('obligationKind', obligation_row.obligation_kind)
  );
  return to_jsonb(obligation_row);
end;
$$;

create or replace function public.direct_spending_upgrade_review_decision_hash_v1(
  p_assignment_id uuid,
  p_baseline_id uuid,
  p_offer_id uuid,
  p_evidence_record_id uuid,
  p_review_scope text,
  p_reviewer_profile_id uuid,
  p_outcome text,
  p_reason_codes text[],
  p_private_notes text,
  p_idempotency_key text
)
returns text
language sql
immutable
set search_path = pg_catalog
as $$
  select encode(
    extensions.digest(
      convert_to(
        public.direct_donation_upgrade_canonical_json(
          jsonb_build_object(
            'schemaVersion', 'direct-spending-upgrade-review-decision-v1-2026-08-14',
            'assignmentId', p_assignment_id::text,
            'baselineId', p_baseline_id::text,
            'offerId', coalesce(p_offer_id::text, ''),
            'evidenceRecordId', coalesce(p_evidence_record_id::text, ''),
            'reviewScope', p_review_scope,
            'reviewerProfileId', p_reviewer_profile_id::text,
            'outcome', p_outcome,
            'reasonCodes', to_jsonb(coalesce(p_reason_codes, '{}'::text[])),
            'privateNotesHash', encode(
              extensions.digest(
                convert_to(trim(coalesce(p_private_notes, '')), 'UTF8'),
                'sha256'
              ),
              'hex'
            ),
            'idempotencyKey', trim(coalesce(p_idempotency_key, ''))
          )
        ),
        'UTF8'
      ),
      'sha256'
    ),
    'hex'
  );
$$;

create or replace function public.record_direct_spending_upgrade_review_decision(
  p_actor_profile_id uuid,
  p_assignment_id uuid,
  p_evidence_record_id uuid,
  p_outcome text,
  p_reason_codes text[],
  p_private_notes text,
  p_idempotency_key text,
  p_decision_hash text
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  assignment_row public.direct_spending_upgrade_review_assignments%rowtype;
  baseline_row public.direct_spending_upgrade_baselines%rowtype;
  offer_row public.direct_spending_upgrade_offers%rowtype;
  evidence_row public.direct_spending_upgrade_evidence_records%rowtype;
  decision_row public.direct_spending_upgrade_review_decisions%rowtype;
  expected_hash text;
  normalized_notes text := left(trim(coalesce(p_private_notes, '')), 2000);
  normalized_key text := left(trim(coalesce(p_idempotency_key, '')), 180);
  now_utc timestamptz := timezone('utc', now());
begin
  select * into assignment_row
  from public.direct_spending_upgrade_review_assignments
  where id = p_assignment_id
  for update;
  if not found then
    raise exception 'Spending Upgrade review assignment not found.';
  end if;
  select * into decision_row
  from public.direct_spending_upgrade_review_decisions
  where assignment_id = assignment_row.id
    and idempotency_key = normalized_key;
  if found then
    if decision_row.decision_hash is distinct from lower(p_decision_hash) then
      raise exception 'The review decision idempotency key was reused.';
    end if;
    return jsonb_build_object('outcome', 'already_recorded', 'decision', to_jsonb(decision_row));
  end if;
  if assignment_row.status <> 'assigned'
     or assignment_row.reviewer_profile_id is distinct from p_actor_profile_id then
    raise exception 'Only the explicitly assigned scoped reviewer may decide this evidence.';
  end if;
  if p_outcome not in ('accepted', 'rejected', 'review_required', 'unavailable') then
    raise exception 'Invalid Spending Upgrade review outcome.';
  end if;

  select * into baseline_row
  from public.direct_spending_upgrade_baselines
  where id = assignment_row.baseline_id
  for update;
  if assignment_row.review_scope = 'spending_change' then
    select * into offer_row
    from public.direct_spending_upgrade_offers
    where id = assignment_row.offer_id
      and baseline_id = assignment_row.baseline_id
    for update;
    if not found then
      raise exception 'Spending Upgrade offer not found for the review assignment.';
    end if;
    select * into evidence_row
    from public.direct_spending_upgrade_evidence_records
    where id = p_evidence_record_id
      and offer_id = offer_row.id
    for update;
    if not found then
      raise exception 'Spending-change evidence not found for the assigned offer.';
    end if;
    if evidence_row.status not in ('submitted', 'review_required', 'disputed') then
      raise exception 'This Spending Upgrade evidence record is no longer reviewable.';
    end if;
  elsif p_evidence_record_id is not null then
    raise exception 'Baseline review does not accept a spending-change evidence ID.';
  end if;

  expected_hash := public.direct_spending_upgrade_review_decision_hash_v1(
    assignment_row.id,
    assignment_row.baseline_id,
    assignment_row.offer_id,
    p_evidence_record_id,
    assignment_row.review_scope,
    p_actor_profile_id,
    p_outcome,
    coalesce(p_reason_codes, '{}'::text[]),
    normalized_notes,
    normalized_key
  );
  if lower(coalesce(p_decision_hash, '')) is distinct from expected_hash then
    raise exception 'The Spending Upgrade review decision hash is invalid.';
  end if;

  insert into public.direct_spending_upgrade_review_decisions(
    assignment_id,
    baseline_id,
    offer_id,
    evidence_record_id,
    review_scope,
    reviewer_profile_id,
    outcome,
    reason_codes,
    private_notes,
    idempotency_key,
    decision_hash
  ) values (
    assignment_row.id,
    assignment_row.baseline_id,
    assignment_row.offer_id,
    p_evidence_record_id,
    assignment_row.review_scope,
    p_actor_profile_id,
    p_outcome,
    coalesce(p_reason_codes, '{}'::text[]),
    normalized_notes,
    normalized_key,
    expected_hash
  ) returning * into decision_row;

  if assignment_row.review_scope = 'baseline' then
    update public.direct_spending_upgrade_baselines
    set review_status = p_outcome,
        reviewed_at = case
          when p_outcome in ('accepted', 'rejected', 'unavailable') then now_utc
          else reviewed_at
        end,
        failure_code = case when p_outcome = 'accepted' then '' else p_outcome end,
        failure_message = case
          when p_outcome = 'accepted' then ''
          else 'Prospective baseline evidence has not been accepted.'
        end
    where id = baseline_row.id;

    update public.direct_spending_upgrade_offers
    set status = case
          when p_outcome = 'accepted' and match_deadline_at > now_utc then 'open'
          when p_outcome = 'accepted' then 'expired'
          else 'review_required'
        end,
        failure_code = case when p_outcome = 'accepted' then '' else p_outcome end,
        failure_message = case
          when p_outcome = 'accepted' then ''
          else 'Prospective baseline evidence has not been accepted.'
        end
    where baseline_id = baseline_row.id
      and status = 'review_required';
  else
    update public.direct_spending_upgrade_evidence_records
    set status = p_outcome
    where id = evidence_row.id;
    update public.direct_spending_upgrade_offers
    set spending_change_review_status = p_outcome,
        status = case
          when p_outcome in ('rejected', 'unavailable') then 'needs_review'
          when p_outcome = 'accepted'
            and status = 'needs_review'
            and not exists (
              select 1
              from public.direct_spending_upgrade_obligations obligation
              where obligation.offer_id = offer_row.id
                and obligation.status = 'needs_review'
            ) then 'matched'
          else status
        end,
        failure_code = case
          when p_outcome = 'accepted' and exists (
            select 1
            from public.direct_spending_upgrade_obligations obligation
            where obligation.offer_id = offer_row.id
              and obligation.status = 'needs_review'
          ) then failure_code
          when p_outcome = 'accepted' then ''
          else p_outcome
        end,
        failure_message = case
          when p_outcome = 'accepted' and exists (
            select 1
            from public.direct_spending_upgrade_obligations obligation
            where obligation.offer_id = offer_row.id
              and obligation.status = 'needs_review'
          ) then failure_message
          when p_outcome = 'accepted' then ''
          else 'Spending-change evidence has not been accepted.'
        end
    where id = offer_row.id;
  end if;

  if p_outcome in ('accepted', 'rejected', 'unavailable') then
    update public.direct_spending_upgrade_review_assignments
    set status = 'completed',
        completed_at = now_utc
    where id = assignment_row.id;
  end if;

  if assignment_row.review_scope = 'spending_change' and p_outcome = 'accepted' then
    perform public.direct_spending_upgrade_mint_credit(
      offer_row.id,
      decision_row.id
    );
    perform public.direct_spending_upgrade_refresh_completion(offer_row.id);
  end if;
  perform public.direct_spending_upgrade_audit(
    assignment_row.offer_id,
    assignment_row.baseline_id,
    null,
    null,
    p_actor_profile_id,
    'scoped_evidence_review_decided',
    jsonb_build_object(
      'scope', assignment_row.review_scope,
      'outcome', p_outcome,
      'decisionId', decision_row.id
    )
  );
  return jsonb_build_object('outcome', p_outcome, 'decision', to_jsonb(decision_row) - 'private_notes');
end;
$$;

create or replace function public.dispute_direct_spending_upgrade_evidence(
  p_actor_profile_id uuid,
  p_baseline_id uuid,
  p_offer_id uuid,
  p_review_scope text,
  p_reason text
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  baseline_row public.direct_spending_upgrade_baselines%rowtype;
  offer_row public.direct_spending_upgrade_offers%rowtype;
  evidence_id uuid;
begin
  select * into baseline_row
  from public.direct_spending_upgrade_baselines
  where id = p_baseline_id
  for update;
  if not found or baseline_row.creator_profile_id is distinct from p_actor_profile_id then
    raise exception 'Only the creator may dispute their Spending Upgrade evidence result.';
  end if;
  if p_review_scope = 'baseline' then
    if baseline_row.review_status not in ('rejected', 'unavailable', 'review_required') then
      raise exception 'This baseline review cannot be disputed in its current state.';
    end if;
    update public.direct_spending_upgrade_baselines
    set review_status = 'disputed',
        failure_code = 'disputed',
        failure_message = 'The creator disputed the prospective baseline review.'
    where id = baseline_row.id;
    update public.direct_spending_upgrade_offers
    set status = 'review_required',
        failure_code = 'baseline_disputed',
        failure_message = 'Prospective baseline review is disputed.'
    where baseline_id = baseline_row.id
      and status = 'review_required';
  elsif p_review_scope = 'spending_change' then
    select * into offer_row
    from public.direct_spending_upgrade_offers
    where id = p_offer_id
      and baseline_id = baseline_row.id
    for update;
    if not found then
      raise exception 'Spending Upgrade offer not found for dispute.';
    end if;
    if exists (
      select 1 from public.direct_spending_upgrade_impact_credits
      where offer_id = offer_row.id and credit_kind = 'converted_spending'
    ) then
      raise exception 'A credited decision requires a separate append-only correction process.';
    end if;
    if offer_row.spending_change_review_status not in (
      'rejected', 'unavailable', 'review_required'
    ) then
      raise exception 'This spending-change review cannot be disputed in its current state.';
    end if;
    select id into evidence_id
    from public.direct_spending_upgrade_evidence_records
    where offer_id = offer_row.id
    order by created_at desc
    limit 1;
    update public.direct_spending_upgrade_evidence_records
    set status = 'disputed'
    where id = evidence_id;
    update public.direct_spending_upgrade_offers
    set spending_change_review_status = 'disputed',
        status = 'needs_review',
        failure_code = 'spending_change_disputed',
        failure_message = 'Spending-change evidence review is disputed.'
    where id = offer_row.id;
  else
    raise exception 'Invalid Spending Upgrade dispute scope.';
  end if;
  perform public.direct_spending_upgrade_audit(
    p_offer_id,
    baseline_row.id,
    null,
    null,
    p_actor_profile_id,
    'evidence_review_disputed',
    jsonb_build_object(
      'scope', p_review_scope,
      'reasonProvided', char_length(trim(coalesce(p_reason, ''))) > 0
    )
  );
  return jsonb_build_object('outcome', 'disputed', 'scope', p_review_scope);
end;
$$;

create or replace function public.complete_direct_spending_upgrade_obligation(
  p_obligation_id uuid,
  p_valid boolean,
  p_failure_code text,
  p_failure_message text,
  p_provider_charge_id_hash text,
  p_provider_payload_hash text,
  p_provider_gross_amount_cents integer,
  p_provider_net_amount_cents integer,
  p_provider_currency text,
  p_provider_nonprofit_slug text,
  p_provider_nonprofit_ein text,
  p_provider_donation_date timestamptz,
  p_provider_payment_method text,
  p_expected_environment text
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  obligation_row public.direct_spending_upgrade_obligations%rowtype;
  offer_row public.direct_spending_upgrade_offers%rowtype;
  credit_row public.direct_spending_upgrade_impact_credits%rowtype;
  normalized_charge_hash text := lower(coalesce(p_provider_charge_id_hash, ''));
  exact_replay boolean;
  prior_use_count integer;
begin
  if p_expected_environment not in ('staging', 'live') then
    raise exception 'Invalid expected Spending Upgrade environment.';
  end if;
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('moraltrade:direct-spending-upgrade-lifecycle', 0)
  );
  if normalized_charge_hash ~ '^[0-9a-f]{64}$' then
    perform pg_catalog.pg_advisory_xact_lock(
      pg_catalog.hashtextextended(normalized_charge_hash, 0)
    );
  end if;
  select * into obligation_row
  from public.direct_spending_upgrade_obligations
  where id = p_obligation_id
  for update;
  if not found then
    raise exception 'Spending Upgrade obligation not found.';
  end if;
  select * into offer_row
  from public.direct_spending_upgrade_offers
  where id = obligation_row.offer_id
  for update;
  if obligation_row.environment is distinct from p_expected_environment
     or offer_row.environment is distinct from p_expected_environment then
    raise exception 'The Spending Upgrade obligation belongs to another environment.';
  end if;

  if obligation_row.status = 'verified' then
    exact_replay := coalesce(p_valid, false)
      and obligation_row.provider_charge_id_hash = normalized_charge_hash
      and obligation_row.provider_payload_hash = lower(coalesce(p_provider_payload_hash, ''))
      and obligation_row.provider_gross_amount_cents is not distinct from p_provider_gross_amount_cents
      and obligation_row.provider_net_amount_cents is not distinct from p_provider_net_amount_cents
      and obligation_row.provider_currency = upper(coalesce(p_provider_currency, ''))
      and obligation_row.provider_nonprofit_slug = lower(coalesce(p_provider_nonprofit_slug, ''))
      and obligation_row.provider_nonprofit_ein = regexp_replace(
        coalesce(p_provider_nonprofit_ein, ''), '[^0-9]', '', 'g'
      )
      and obligation_row.provider_donation_date is not distinct from p_provider_donation_date
      and obligation_row.provider_payment_method = left(coalesce(p_provider_payment_method, ''), 120);
    if exact_replay then
      return jsonb_build_object(
        'outcome', 'already_verified',
        'obligation', to_jsonb(obligation_row),
        'offer', to_jsonb(offer_row)
      );
    end if;
    update public.direct_spending_upgrade_obligations
    set status = 'needs_review',
        failure_code = 'altered_replay',
        failure_message = 'A non-identical provider replay followed verification.'
    where id = obligation_row.id;
    update public.direct_spending_upgrade_offers
    set status = 'needs_review',
        failure_code = 'altered_replay',
        failure_message = 'A non-identical provider replay followed verification.'
    where id = offer_row.id;
    perform public.direct_spending_upgrade_audit(
      offer_row.id,
      offer_row.baseline_id,
      obligation_row.id,
      obligation_row.candidate_id,
      null,
      'provider_webhook_altered_replay',
      jsonb_build_object('obligationKind', obligation_row.obligation_kind)
    );
    return jsonb_build_object('outcome', 'needs_review', 'reason', 'altered_replay');
  end if;

  if normalized_charge_hash ~ '^[0-9a-f]{64}$' then
    select (
      (select count(*) from public.direct_spending_upgrade_obligations
       where provider_charge_id_hash = normalized_charge_hash and id <> obligation_row.id)
      +
      (select count(*) from public.direct_donation_upgrade_obligations
       where provider_charge_id_hash = normalized_charge_hash)
    )::integer into prior_use_count;
  else
    prior_use_count := 0;
  end if;

  if not coalesce(p_valid, false)
     or normalized_charge_hash !~ '^[0-9a-f]{64}$'
     or lower(coalesce(p_provider_payload_hash, '')) !~ '^[0-9a-f]{64}$'
     or p_provider_gross_amount_cents is distinct from obligation_row.expected_amount_cents
     or p_provider_net_amount_cents is null
     or p_provider_net_amount_cents not between 0 and obligation_row.expected_amount_cents
     or upper(coalesce(p_provider_currency, '')) is distinct from obligation_row.expected_currency
     or lower(coalesce(p_provider_nonprofit_slug, '')) is distinct from
        lower(obligation_row.expected_recipient->>'primarySlug')
     or (
       coalesce(obligation_row.expected_recipient->>'ein', '') <> ''
       and regexp_replace(coalesce(p_provider_nonprofit_ein, ''), '[^0-9]', '', 'g')
         is distinct from regexp_replace(
           coalesce(obligation_row.expected_recipient->>'ein', ''), '[^0-9]', '', 'g'
         )
     )
     or p_provider_donation_date is null
     or p_provider_donation_date > obligation_row.due_at + interval '5 minutes'
     or prior_use_count > 0 then
    update public.direct_spending_upgrade_obligations
    set status = 'needs_review',
        failure_code = case
          when prior_use_count > 0 then 'provider_charge_reused'
          else left(coalesce(p_failure_code, 'provider_evidence_invalid'), 120)
        end,
        failure_message = case
          when prior_use_count > 0 then 'One provider charge cannot fulfil multiple donation obligations.'
          else left(coalesce(p_failure_message, 'Provider evidence did not match frozen terms.'), 500)
        end
    where id = obligation_row.id;
    update public.direct_spending_upgrade_offers
    set status = 'needs_review',
        failure_code = case
          when prior_use_count > 0 then 'provider_charge_reused'
          else 'provider_evidence_invalid'
        end,
        failure_message = 'A donation webhook did not satisfy the frozen Spending Upgrade obligation.'
    where id = offer_row.id;
    perform public.direct_spending_upgrade_audit(
      offer_row.id,
      offer_row.baseline_id,
      obligation_row.id,
      obligation_row.candidate_id,
      null,
      'provider_webhook_rejected',
      jsonb_build_object(
        'obligationKind', obligation_row.obligation_kind,
        'failureCode', case when prior_use_count > 0 then 'provider_charge_reused' else p_failure_code end
      )
    );
    return jsonb_build_object('outcome', 'needs_review');
  end if;

  select * into credit_row
  from public.direct_spending_upgrade_impact_credits credit
  where credit.obligation_id = obligation_row.id;
  if found and (
    credit_row.offer_id is distinct from obligation_row.offer_id
    or credit_row.profile_id is distinct from obligation_row.participant_profile_id
    or credit_row.recipient_hash is distinct from obligation_row.expected_recipient_hash
    or credit_row.provider_charge_id_hash is distinct from normalized_charge_hash
    or credit_row.verified_gross_amount_cents is distinct from p_provider_gross_amount_cents
    or credit_row.verified_net_amount_cents is distinct from p_provider_net_amount_cents
    or credit_row.provider_charge_id_hash is distinct from obligation_row.provider_charge_id_hash
    or credit_row.verified_gross_amount_cents is distinct from obligation_row.provider_gross_amount_cents
    or credit_row.verified_net_amount_cents is distinct from obligation_row.provider_net_amount_cents
    or credit_row.verified_at is distinct from obligation_row.verified_at
    or obligation_row.provider_payload_hash is distinct from lower(coalesce(p_provider_payload_hash, ''))
    or obligation_row.provider_currency is distinct from upper(coalesce(p_provider_currency, ''))
    or obligation_row.provider_nonprofit_slug is distinct from lower(coalesce(p_provider_nonprofit_slug, ''))
    or obligation_row.provider_nonprofit_ein is distinct from regexp_replace(
      coalesce(p_provider_nonprofit_ein, ''), '[^0-9]', '', 'g'
    )
    or obligation_row.provider_donation_date is distinct from p_provider_donation_date
    or obligation_row.provider_payment_method is distinct from left(
      coalesce(p_provider_payment_method, ''),
      120
    )
  ) then
    update public.direct_spending_upgrade_obligations
    set status = 'needs_review',
        failure_code = 'credited_provider_identity_changed',
        failure_message = 'Provider evidence changed after append-only impact credit was recorded.'
    where id = obligation_row.id;
    update public.direct_spending_upgrade_offers
    set status = 'needs_review',
        failure_code = 'credited_provider_identity_changed',
        failure_message = 'Provider evidence changed after append-only impact credit was recorded.'
    where id = offer_row.id;
    perform public.direct_spending_upgrade_audit(
      offer_row.id,
      offer_row.baseline_id,
      obligation_row.id,
      obligation_row.candidate_id,
      null,
      'credited_provider_identity_change_rejected',
      jsonb_build_object('obligationKind', obligation_row.obligation_kind)
    );
    return jsonb_build_object(
      'outcome', 'needs_review',
      'reason', 'credited_provider_identity_changed'
    );
  end if;

  update public.direct_spending_upgrade_obligations
  set status = 'verified',
      provider_charge_id_hash = normalized_charge_hash,
      provider_payload_hash = lower(p_provider_payload_hash),
      provider_gross_amount_cents = p_provider_gross_amount_cents,
      provider_net_amount_cents = p_provider_net_amount_cents,
      provider_currency = upper(p_provider_currency),
      provider_nonprofit_slug = lower(p_provider_nonprofit_slug),
      provider_nonprofit_ein = regexp_replace(
        coalesce(p_provider_nonprofit_ein, ''), '[^0-9]', '', 'g'
      ),
      provider_donation_date = p_provider_donation_date,
      provider_payment_method = left(coalesce(p_provider_payment_method, ''), 120),
      failure_code = '',
      failure_message = '',
      verified_at = case
        when credit_row.id is not null then credit_row.verified_at
        else timezone('utc', now())
      end
  where id = obligation_row.id
  returning * into obligation_row;

  update public.direct_spending_upgrade_offers
  set status = 'matched',
      failure_code = '',
      failure_message = ''
  where id = offer_row.id
    and status = 'needs_review'
    and spending_change_review_status is distinct from 'rejected'
    and spending_change_review_status is distinct from 'unavailable'
    and spending_change_review_status is distinct from 'disputed'
    and not exists (
      select 1
      from public.direct_spending_upgrade_obligations pending_review
      where pending_review.offer_id = offer_row.id
        and pending_review.status = 'needs_review'
    );
  perform public.direct_spending_upgrade_mint_credit(offer_row.id, null);
  perform public.direct_spending_upgrade_refresh_completion(offer_row.id);
  select * into offer_row
  from public.direct_spending_upgrade_offers
  where id = offer_row.id;
  perform public.direct_spending_upgrade_audit(
    offer_row.id,
    offer_row.baseline_id,
    obligation_row.id,
    obligation_row.candidate_id,
    null,
    'provider_donation_verified',
    jsonb_build_object(
      'obligationKind', obligation_row.obligation_kind,
      'verifiedGrossAmountCents', obligation_row.provider_gross_amount_cents,
      'verifiedNetAmountCents', obligation_row.provider_net_amount_cents,
      'creatorCreditMinted', exists (
        select 1 from public.direct_spending_upgrade_impact_credits credit
        where credit.obligation_id = obligation_row.id
          and credit.credit_kind = 'converted_spending'
      )
    )
  );
  return jsonb_build_object(
    'outcome', case
      when offer_row.status = 'completed' then 'completed'
      when obligation_row.obligation_kind = 'creator_converted_spending'
        and offer_row.spending_change_review_status <> 'accepted'
        then 'donation_verified_waiting_for_spending_review'
      else 'donation_verified'
    end,
    'obligation', to_jsonb(obligation_row),
    'offer', to_jsonb(offer_row)
  );
end;
$$;

create or replace function public.run_direct_spending_upgrade_lifecycle(
  p_now timestamptz,
  p_expected_environment text
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  expired_count integer := 0;
  defaulted_count integer := 0;
begin
  if p_now is null or p_expected_environment not in ('staging', 'live') then
    raise exception 'A valid Spending Upgrade lifecycle boundary is required.';
  end if;
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended('moraltrade:direct-spending-upgrade-lifecycle', 0)
  );

  update public.direct_spending_upgrade_proposals proposal
  set status = 'expired',
      responded_at = p_now
  from public.direct_spending_upgrade_offers offer
  where proposal.offer_id = offer.id
    and proposal.status = 'pending'
    and offer.environment = p_expected_environment
    and offer.match_deadline_at <= p_now;

  update public.direct_spending_upgrade_offers
  set status = 'expired',
      failure_code = '',
      failure_message = ''
  where environment = p_expected_environment
    and status in ('review_required', 'open')
    and match_deadline_at <= p_now;
  get diagnostics expired_count = row_count;

  update public.direct_spending_upgrade_obligations obligation
  set status = 'defaulted',
      failure_code = 'fulfilment_deadline_missed',
      failure_message = 'The direct donation was not provider-verified before the grace window closed.'
  from public.direct_spending_upgrade_offers offer
  where obligation.offer_id = offer.id
    and offer.environment = p_expected_environment
    and offer.status in ('matched', 'needs_review')
    and offer.webhook_grace_ends_at <= p_now
    and obligation.status in ('pending', 'checkout_started');

  update public.direct_spending_upgrade_candidates candidate
  set status = 'defaulted',
      defaulted_at = p_now
  from public.direct_spending_upgrade_obligations obligation
  where obligation.candidate_id = candidate.id
    and obligation.obligation_kind = 'matcher_incremental'
    and obligation.status = 'defaulted'
    and candidate.status = 'primary';

  update public.direct_spending_upgrade_offers offer
  set status = 'defaulted',
      defaulted_at = coalesce(defaulted_at, p_now),
      failure_code = 'unfulfilled_spending_upgrade',
      failure_message = 'At least one required direct donation or spending-change review did not complete.'
  where offer.environment = p_expected_environment
    and offer.status in ('matched', 'needs_review')
    and offer.webhook_grace_ends_at <= p_now
    and (
      offer.spending_change_review_status is distinct from 'accepted'
      or exists (
        select 1 from public.direct_spending_upgrade_obligations obligation
        where obligation.offer_id = offer.id
          and obligation.status <> 'verified'
      )
    );
  get diagnostics defaulted_count = row_count;
  return jsonb_build_object(
    'outcome', 'processed',
    'expiredOffers', expired_count,
    'defaultedOffers', defaulted_count
  );
end;
$$;

create or replace function public.cancel_direct_spending_upgrade_offer(
  p_actor_profile_id uuid,
  p_offer_id uuid,
  p_expected_environment text
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog
as $$
declare
  offer_row public.direct_spending_upgrade_offers%rowtype;
begin
  select * into offer_row
  from public.direct_spending_upgrade_offers
  where id = p_offer_id
  for update;
  if not found then
    raise exception 'Spending Upgrade offer not found.';
  end if;
  if offer_row.creator_profile_id is distinct from p_actor_profile_id
     or offer_row.environment is distinct from p_expected_environment then
    raise exception 'The Spending Upgrade cannot be cancelled by this participant.';
  end if;
  if offer_row.status not in ('review_required', 'open')
     or exists (
       select 1 from public.direct_spending_upgrade_obligations
       where offer_id = offer_row.id
     ) then
    raise exception 'Only an unmatched Spending Upgrade may be cancelled.';
  end if;
  update public.direct_spending_upgrade_offers
  set status = 'cancelled',
      cancellation_reason = 'creator_cancelled_before_match'
  where id = offer_row.id
  returning * into offer_row;
  update public.direct_spending_upgrade_proposals
  set status = 'superseded',
      responded_at = timezone('utc', now())
  where offer_id = offer_row.id and status = 'pending';
  perform public.direct_spending_upgrade_audit(
    offer_row.id,
    offer_row.baseline_id,
    null,
    null,
    p_actor_profile_id,
    'unmatched_spending_upgrade_cancelled',
    jsonb_build_object(
      'creatorDonationObligations', 0,
      'providerCheckouts', 0,
      'impactCredits', 0,
      'purchaseObligations', 0
    )
  );
  return to_jsonb(offer_row);
end;
$$;

create or replace function public.direct_spending_upgrade_guard_cross_subtype_charge()
returns trigger
language plpgsql
set search_path = pg_catalog
as $$
begin
  if new.provider_charge_id_hash = ''
     or (
       tg_op = 'UPDATE'
       and new.provider_charge_id_hash is not distinct from old.provider_charge_id_hash
     ) then
    return new;
  end if;
  if tg_table_name = 'direct_spending_upgrade_obligations' and exists (
    select 1
    from public.direct_donation_upgrade_obligations obligation
    where obligation.provider_charge_id_hash = new.provider_charge_id_hash
  ) then
    raise exception 'The provider charge is already bound to a planned-donation upgrade.';
  end if;
  if tg_table_name = 'direct_donation_upgrade_obligations' and exists (
    select 1
    from public.direct_spending_upgrade_obligations obligation
    where obligation.provider_charge_id_hash = new.provider_charge_id_hash
  ) then
    raise exception 'The provider charge is already bound to a Spending Upgrade.';
  end if;
  return new;
end;
$$;

drop trigger if exists direct_spending_upgrade_cross_subtype_charge
  on public.direct_spending_upgrade_obligations;
create trigger direct_spending_upgrade_cross_subtype_charge
before insert or update of provider_charge_id_hash
on public.direct_spending_upgrade_obligations
for each row execute function public.direct_spending_upgrade_guard_cross_subtype_charge();

drop trigger if exists direct_donation_upgrade_cross_subtype_charge
  on public.direct_donation_upgrade_obligations;
create trigger direct_donation_upgrade_cross_subtype_charge
before insert or update of provider_charge_id_hash
on public.direct_donation_upgrade_obligations
for each row execute function public.direct_spending_upgrade_guard_cross_subtype_charge();

create or replace view public.direct_spending_upgrade_public_offers
with (security_barrier = true, security_invoker = true)
as
select
  offer.id,
  'spending_upgrade'::text as mechanism_subtype,
  offer.environment,
  offer.status,
  offer.privacy_mode,
  baseline.category,
  baseline.planned_action,
  baseline.planned_spend_amount_cents,
  offer.creator_diversion_amount_cents,
  offer.retained_spending_amount_cents,
  offer.diversion_basis_points,
  offer.matcher_amount_cents,
  offer.currency,
  offer.match_deadline_at,
  offer.fulfillment_deadline_at,
  offer.webhook_grace_ends_at,
  offer.upgraded_recipient,
  offer.terms_hash,
  baseline.review_status as baseline_review_status,
  offer.spending_change_review_status,
  offer.created_at,
  offer.completed_at,
  offer.supersedes_offer_id,
  offer.superseded_by_offer_id,
  case
    when offer.privacy_mode = 'public' or offer.status = 'completed'
      then coalesce(creator.display_name, 'Moral Trade participant')
    else null
  end as creator_display_name,
  case
    when (offer.privacy_mode = 'public' or offer.status = 'completed')
      and matcher.id is not null
      then coalesce(matcher.display_name, 'Moral Trade participant')
    else null
  end as matcher_display_name,
  case when winner.id is null then 0 else 1 end::integer as matcher_count,
  (
    select count(*)::integer
    from public.direct_spending_upgrade_obligations obligation
    where obligation.offer_id = offer.id
      and obligation.status = 'verified'
  ) as verified_obligation_count,
  coalesce((
    select sum(obligation.provider_gross_amount_cents)::integer
    from public.direct_spending_upgrade_obligations obligation
    where obligation.offer_id = offer.id
      and obligation.status = 'verified'
  ), 0) as verified_gross_amount_cents,
  coalesce((
    select sum(obligation.provider_net_amount_cents)::integer
    from public.direct_spending_upgrade_obligations obligation
    where obligation.offer_id = offer.id
      and obligation.status = 'verified'
  ), 0) as verified_net_amount_cents,
  coalesce((
    select sum(credit.converted_spending_gross_amount_cents)::integer
    from public.direct_spending_upgrade_impact_credits credit
    join public.direct_spending_upgrade_obligations obligation
      on obligation.id = credit.obligation_id
    where credit.offer_id = offer.id
      and obligation.status = 'verified'
      and obligation.offer_id = credit.offer_id
      and obligation.participant_profile_id = credit.profile_id
      and obligation.expected_recipient_hash = credit.recipient_hash
      and obligation.provider_charge_id_hash = credit.provider_charge_id_hash
      and obligation.provider_gross_amount_cents = credit.verified_gross_amount_cents
      and obligation.provider_net_amount_cents = credit.verified_net_amount_cents
      and obligation.verified_at = credit.verified_at
  ), 0) as converted_spending_gross_amount_cents,
  coalesce((
    select sum(credit.converted_spending_net_amount_cents)::integer
    from public.direct_spending_upgrade_impact_credits credit
    join public.direct_spending_upgrade_obligations obligation
      on obligation.id = credit.obligation_id
    where credit.offer_id = offer.id
      and obligation.status = 'verified'
      and obligation.offer_id = credit.offer_id
      and obligation.participant_profile_id = credit.profile_id
      and obligation.expected_recipient_hash = credit.recipient_hash
      and obligation.provider_charge_id_hash = credit.provider_charge_id_hash
      and obligation.provider_gross_amount_cents = credit.verified_gross_amount_cents
      and obligation.provider_net_amount_cents = credit.verified_net_amount_cents
      and obligation.verified_at = credit.verified_at
  ), 0) as converted_spending_net_amount_cents,
  coalesce((
    select sum(credit.incremental_gross_amount_cents)::integer
    from public.direct_spending_upgrade_impact_credits credit
    join public.direct_spending_upgrade_obligations obligation
      on obligation.id = credit.obligation_id
    where credit.offer_id = offer.id
      and obligation.status = 'verified'
      and obligation.offer_id = credit.offer_id
      and obligation.participant_profile_id = credit.profile_id
      and obligation.expected_recipient_hash = credit.recipient_hash
      and obligation.provider_charge_id_hash = credit.provider_charge_id_hash
      and obligation.provider_gross_amount_cents = credit.verified_gross_amount_cents
      and obligation.provider_net_amount_cents = credit.verified_net_amount_cents
      and obligation.verified_at = credit.verified_at
  ), 0) as incremental_gross_amount_cents,
  coalesce((
    select sum(credit.incremental_net_amount_cents)::integer
    from public.direct_spending_upgrade_impact_credits credit
    join public.direct_spending_upgrade_obligations obligation
      on obligation.id = credit.obligation_id
    where credit.offer_id = offer.id
      and obligation.status = 'verified'
      and obligation.offer_id = credit.offer_id
      and obligation.participant_profile_id = credit.profile_id
      and obligation.expected_recipient_hash = credit.recipient_hash
      and obligation.provider_charge_id_hash = credit.provider_charge_id_hash
      and obligation.provider_gross_amount_cents = credit.verified_gross_amount_cents
      and obligation.provider_net_amount_cents = credit.verified_net_amount_cents
      and obligation.verified_at = credit.verified_at
  ), 0) as incremental_net_amount_cents
from public.direct_spending_upgrade_offers offer
join public.direct_spending_upgrade_baselines baseline
  on baseline.id = offer.baseline_id
join public.profiles creator
  on creator.id = offer.creator_profile_id
left join public.direct_spending_upgrade_candidates winner
  on winner.id = offer.winning_candidate_id
left join public.profiles matcher
  on matcher.id = winner.profile_id
where baseline.review_status = 'accepted'
  and offer.status not in ('review_required', 'cancelled', 'superseded');

alter table public.direct_spending_upgrade_baselines enable row level security;
alter table public.direct_spending_upgrade_offers enable row level security;
alter table public.direct_spending_upgrade_candidates enable row level security;
alter table public.direct_spending_upgrade_proposals enable row level security;
alter table public.direct_spending_upgrade_evidence_records enable row level security;
alter table public.direct_spending_upgrade_review_assignments enable row level security;
alter table public.direct_spending_upgrade_review_decisions enable row level security;
alter table public.direct_spending_upgrade_obligations enable row level security;
alter table public.direct_spending_upgrade_impact_credits enable row level security;
alter table public.direct_spending_upgrade_audit_events enable row level security;

revoke all on public.direct_spending_upgrade_baselines
  from public, anon, authenticated, service_role;
revoke all on public.direct_spending_upgrade_offers
  from public, anon, authenticated, service_role;
revoke all on public.direct_spending_upgrade_candidates
  from public, anon, authenticated, service_role;
revoke all on public.direct_spending_upgrade_proposals
  from public, anon, authenticated, service_role;
revoke all on public.direct_spending_upgrade_evidence_records
  from public, anon, authenticated, service_role;
revoke all on public.direct_spending_upgrade_review_assignments
  from public, anon, authenticated, service_role;
revoke all on public.direct_spending_upgrade_review_decisions
  from public, anon, authenticated, service_role;
revoke all on public.direct_spending_upgrade_obligations
  from public, anon, authenticated, service_role;
revoke all on public.direct_spending_upgrade_impact_credits
  from public, anon, authenticated, service_role;
revoke all on public.direct_spending_upgrade_audit_events
  from public, anon, authenticated, service_role;
revoke all on public.direct_spending_upgrade_public_offers
  from public, anon, authenticated, service_role;

grant select on public.direct_spending_upgrade_baselines,
  public.direct_spending_upgrade_offers,
  public.direct_spending_upgrade_candidates,
  public.direct_spending_upgrade_proposals,
  public.direct_spending_upgrade_evidence_records,
  public.direct_spending_upgrade_review_assignments,
  public.direct_spending_upgrade_review_decisions,
  public.direct_spending_upgrade_obligations,
  public.direct_spending_upgrade_impact_credits,
  public.direct_spending_upgrade_audit_events,
  public.direct_spending_upgrade_public_offers
  to service_role;

revoke execute on function public.direct_spending_upgrade_diversion_basis_points(integer, integer)
  from public, anon, authenticated, service_role;
revoke execute on function public.direct_spending_upgrade_evidence_hash_v1(jsonb, timestamptz)
  from public, anon, authenticated, service_role;
revoke execute on function public.direct_spending_upgrade_change_evidence_hash_v1(uuid, jsonb, timestamptz)
  from public, anon, authenticated, service_role;
revoke execute on function public.direct_spending_upgrade_terms_hash_v1(uuid, text, text, integer, integer, integer, text, timestamptz, text, text, text, timestamptz, text)
  from public, anon, authenticated, service_role;
revoke execute on function public.direct_spending_upgrade_review_decision_hash_v1(uuid, uuid, uuid, uuid, text, uuid, text, text[], text, text)
  from public, anon, authenticated, service_role;
revoke execute on function public.direct_spending_upgrade_set_updated_at()
  from public, anon, authenticated, service_role;
revoke execute on function public.direct_spending_upgrade_prevent_mutation()
  from public, anon, authenticated, service_role;
revoke execute on function public.direct_spending_upgrade_guard_baseline()
  from public, anon, authenticated, service_role;
revoke execute on function public.direct_spending_upgrade_guard_offer()
  from public, anon, authenticated, service_role;
revoke execute on function public.direct_spending_upgrade_guard_candidate()
  from public, anon, authenticated, service_role;
revoke execute on function public.direct_spending_upgrade_guard_proposal()
  from public, anon, authenticated, service_role;
revoke execute on function public.direct_spending_upgrade_guard_evidence()
  from public, anon, authenticated, service_role;
revoke execute on function public.direct_spending_upgrade_guard_assignment()
  from public, anon, authenticated, service_role;
revoke execute on function public.direct_spending_upgrade_guard_obligation()
  from public, anon, authenticated, service_role;
revoke execute on function public.direct_spending_upgrade_guard_credit()
  from public, anon, authenticated, service_role;
revoke execute on function public.direct_spending_upgrade_guard_cross_subtype_charge()
  from public, anon, authenticated, service_role;
revoke execute on function public.direct_spending_upgrade_audit(uuid, uuid, uuid, uuid, uuid, text, jsonb)
  from public, anon, authenticated, service_role;
revoke execute on function public.direct_spending_upgrade_mint_credit(uuid, uuid)
  from public, anon, authenticated, service_role;
revoke execute on function public.direct_spending_upgrade_refresh_completion(uuid)
  from public, anon, authenticated, service_role;
revoke execute on function public.direct_spending_upgrade_create_obligations(uuid, uuid)
  from public, anon, authenticated, service_role;

revoke execute on function public.create_direct_spending_upgrade_offer(uuid, text, text, text, text, integer, integer, text, jsonb, text, timestamptz, text, integer, timestamptz, text, jsonb, text, text, boolean, boolean, boolean, boolean, boolean, boolean)
  from public, anon, authenticated, service_role;
revoke execute on function public.assign_direct_spending_upgrade_reviewer(uuid, uuid, text, uuid, boolean, text)
  from public, anon, authenticated, service_role;
revoke execute on function public.join_direct_spending_upgrade_offer(uuid, uuid, text, text)
  from public, anon, authenticated, service_role;
revoke execute on function public.propose_direct_spending_upgrade_terms(uuid, uuid, integer, integer, text, text, text)
  from public, anon, authenticated, service_role;
revoke execute on function public.accept_direct_spending_upgrade_proposal(uuid, uuid, text, text)
  from public, anon, authenticated, service_role;
revoke execute on function public.submit_direct_spending_upgrade_change_evidence(uuid, uuid, jsonb, text, timestamptz, text, text)
  from public, anon, authenticated, service_role;
revoke execute on function public.start_direct_spending_upgrade_checkout(uuid, uuid, text)
  from public, anon, authenticated, service_role;
revoke execute on function public.record_direct_spending_upgrade_review_decision(uuid, uuid, uuid, text, text[], text, text, text)
  from public, anon, authenticated, service_role;
revoke execute on function public.dispute_direct_spending_upgrade_evidence(uuid, uuid, uuid, text, text)
  from public, anon, authenticated, service_role;
revoke execute on function public.complete_direct_spending_upgrade_obligation(uuid, boolean, text, text, text, text, integer, integer, text, text, text, timestamptz, text, text)
  from public, anon, authenticated, service_role;
revoke execute on function public.run_direct_spending_upgrade_lifecycle(timestamptz, text)
  from public, anon, authenticated, service_role;
revoke execute on function public.cancel_direct_spending_upgrade_offer(uuid, uuid, text)
  from public, anon, authenticated, service_role;

grant execute on function public.create_direct_spending_upgrade_offer(uuid, text, text, text, text, integer, integer, text, jsonb, text, timestamptz, text, integer, timestamptz, text, jsonb, text, text, boolean, boolean, boolean, boolean, boolean, boolean)
  to service_role;
grant execute on function public.assign_direct_spending_upgrade_reviewer(uuid, uuid, text, uuid, boolean, text)
  to service_role;
grant execute on function public.join_direct_spending_upgrade_offer(uuid, uuid, text, text)
  to service_role;
grant execute on function public.propose_direct_spending_upgrade_terms(uuid, uuid, integer, integer, text, text, text)
  to service_role;
grant execute on function public.accept_direct_spending_upgrade_proposal(uuid, uuid, text, text)
  to service_role;
grant execute on function public.submit_direct_spending_upgrade_change_evidence(uuid, uuid, jsonb, text, timestamptz, text, text)
  to service_role;
grant execute on function public.start_direct_spending_upgrade_checkout(uuid, uuid, text)
  to service_role;
grant execute on function public.record_direct_spending_upgrade_review_decision(uuid, uuid, uuid, text, text[], text, text, text)
  to service_role;
grant execute on function public.dispute_direct_spending_upgrade_evidence(uuid, uuid, uuid, text, text)
  to service_role;
grant execute on function public.complete_direct_spending_upgrade_obligation(uuid, boolean, text, text, text, text, integer, integer, text, text, text, timestamptz, text, text)
  to service_role;
grant execute on function public.run_direct_spending_upgrade_lifecycle(timestamptz, text)
  to service_role;
grant execute on function public.cancel_direct_spending_upgrade_offer(uuid, uuid, text)
  to service_role;

comment on table public.direct_spending_upgrade_baselines is
  'Owner-private prospective nonessential-spending baselines. Merchant labels, descriptions, evidence payloads, evidence hashes, and fingerprints never enter public projections.';
comment on table public.direct_spending_upgrade_obligations is
  'Exactly two direct Every.org donation obligations per matched Spending Upgrade; Moral Trade never receives, combines, redirects, or disburses participant funds.';
comment on table public.direct_spending_upgrade_review_assignments is
  'Narrow evidence-only reviewer authority. Assignment does not confer donation-verification authority and is not a claim of neutrality or independence.';
comment on table public.direct_spending_upgrade_impact_credits is
  'Append-only matcher-incremental or creator converted-spending credits. Creator credit requires both provider verification and an accepted scoped spending-change evidence decision.';
comment on view public.direct_spending_upgrade_public_offers is
  'Privacy projection containing broad category, frozen amounts, recipient, and coarse evidence states only; no merchant, order, invoice, private explanation, raw evidence, fingerprint, or reviewer note.';
