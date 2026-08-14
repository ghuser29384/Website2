begin;

create table public.mpgf_public_goods_compacts (
  id uuid primary key default gen_random_uuid(),
  public_key text not null unique check (public_key ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  cause_key text not null check (cause_key in ('future_flourishing', 'animal_welfare', 'global_health')),
  title text not null check (length(title) between 3 and 120),
  summary text not null check (length(summary) between 20 and 1000),
  constitution_version text not null check (constitution_version = 'mpgf-public-goods-compact/transaction-v2'),
  is_current boolean not null default true,
  status text not null default 'recruiting' check (status in ('recruiting', 'active')),
  obligation_divisor integer not null default 10 check (obligation_divisor = 10),
  allocation_total_bps integer not null default 10000 check (allocation_total_bps = 10000),
  funding_qualification_minimum_cents bigint not null default 100 check (funding_qualification_minimum_cents = 100),
  readiness_threshold_members integer not null default 100 check (readiness_threshold_members = 100),
  readiness_threshold_scheduled_cents bigint not null default 50000 check (readiness_threshold_scheduled_cents = 50000),
  voting_equal_share_bps integer not null default 7000 check (voting_equal_share_bps = 7000),
  voting_sqrt_contribution_share_bps integer not null default 3000 check (voting_sqrt_contribution_share_bps = 3000),
  delegate_control_cap_bps integer not null default 1000 check (delegate_control_cap_bps = 1000),
  minimum_term_months integer not null default 12 check (minimum_term_months = 12),
  exit_notice_days integer not null default 30 check (exit_notice_days = 30),
  project_selection_rule text not null check (length(project_selection_rule) > 20),
  audit_rule text not null check (length(audit_rule) > 20),
  no_project_opt_out_rule text not null check (length(no_project_opt_out_rule) > 20),
  opt_in_only boolean not null default true check (opt_in_only),
  random_assignment_allowed boolean not null default false check (not random_assignment_allowed),
  core_marketplace_taxed boolean not null default false check (not core_marketplace_taxed),
  binding_only_after_activation boolean not null default true check (binding_only_after_activation),
  per_project_refusal_allowed_after_activation boolean not null default false check (not per_project_refusal_allowed_after_activation),
  exit_prospective_only_after_activation boolean not null default true check (exit_prospective_only_after_activation),
  money_moves_on_join boolean not null default false check (not money_moves_on_join),
  automatic_collection_enabled boolean not null default false check (not automatic_collection_enabled),
  activation_execution_enabled boolean not null default false,
  allocation_requires_complete_coverage boolean not null default true check (allocation_requires_complete_coverage),
  voting_requires_net_settled_contribution boolean not null default true check (voting_requires_net_settled_contribution),
  collection_state text not null default 'disabled_pending_identity_legal_payment_provider_and_production_release_gates' check (collection_state = 'disabled_pending_identity_legal_payment_provider_and_production_release_gates'),
  activated_at timestamptz,
  constitution_frozen_at timestamptz,
  frozen_constitution_version text,
  display_order integer not null unique check (display_order > 0),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  check (
    (status = 'recruiting' and activated_at is null and constitution_frozen_at is null and frozen_constitution_version is null)
    or
    (status = 'active' and activated_at is not null and constitution_frozen_at = activated_at and frozen_constitution_version = constitution_version)
  ),
  constraint mpgf_public_goods_compacts_activation_execution_disabled
    check (not activation_execution_enabled),
  constraint mpgf_public_goods_compacts_active_requires_execution_gate
    check (status <> 'active' or activation_execution_enabled)
);

create unique index mpgf_public_goods_compacts_one_current_per_cause_idx
  on public.mpgf_public_goods_compacts (cause_key)
  where is_current;

comment on table public.mpgf_public_goods_compacts is
  'Published cause-area Compact v2 constitutions. Numerical threshold readiness never changes status to active; activation remains operator-blocked by identity, legal, payment, provider, and production release gates.';

create table public.mpgf_public_goods_compact_memberships (
  id uuid primary key default gen_random_uuid(),
  compact_id uuid not null references public.mpgf_public_goods_compacts (id) on delete restrict,
  participant_id uuid not null references public.profiles (id) on delete cascade,
  constitution_version_accepted text not null check (constitution_version_accepted = 'mpgf-public-goods-compact/transaction-v2'),
  acknowledgements jsonb not null check (acknowledgements = '{"voluntaryChoice":true,"exactConstitution":true,"activationAndNoProjectOptOut":true,"noPaymentMandate":true}'::jsonb),
  status text not null default 'pending_activation' check (status in ('pending_activation', 'active', 'exit_notice', 'revoked', 'exited')),
  accepted_at timestamptz not null default timezone('utc', now()),
  activated_at timestamptz,
  revoked_at timestamptz,
  exit_requested_at timestamptz,
  exit_effective_at timestamptz,
  updated_at timestamptz not null default timezone('utc', now()),
  unique (compact_id, participant_id),
  unique (id, compact_id),
  check (
    (status = 'pending_activation' and activated_at is null and revoked_at is null and exit_requested_at is null and exit_effective_at is null)
    or (status = 'active' and activated_at is not null and revoked_at is null and exit_requested_at is null and exit_effective_at is null)
    or (status = 'exit_notice' and activated_at is not null and revoked_at is null and exit_requested_at is not null and exit_effective_at is not null)
    or (status = 'revoked' and activated_at is null and revoked_at is not null)
    or (status = 'exited' and activated_at is not null and exit_requested_at is not null and exit_effective_at is not null)
  )
);

comment on table public.mpgf_public_goods_compact_memberships is
  'Private charter membership, separate from monthly funding qualification. One verified person may hold one membership in each current cause-area Compact.';

create table public.mpgf_public_goods_dormant_authorization_snapshots (
  id uuid primary key default gen_random_uuid(),
  participant_id uuid not null references public.profiles (id) on delete cascade,
  cycle_key text not null check (cycle_key ~ '^\d{4}-(0[1-9]|1[0-2])$'),
  state text not null check (state in ('unavailable', 'valid')),
  authorization_scope text not null default 'compact_v2' check (authorization_scope = 'compact_v2'),
  provider_reference_hash text,
  authorized_at timestamptz,
  expires_at timestamptz,
  evidence_hash text not null check (evidence_hash ~ '^sha256:[a-f0-9]{64}$'),
  supersedes_id uuid references public.mpgf_public_goods_dormant_authorization_snapshots (id) on delete restrict,
  frozen_at timestamptz not null default timezone('utc', now()),
  check (
    (state = 'unavailable' and provider_reference_hash is null and authorized_at is null and expires_at is null)
    or
    (state = 'valid'
      and provider_reference_hash is not null
      and provider_reference_hash ~ '^sha256:[a-f0-9]{64}$'
      and authorized_at is not null
      and expires_at > authorized_at)
  ),
  unique (participant_id, cycle_key, evidence_hash)
);

comment on table public.mpgf_public_goods_dormant_authorization_snapshots is
  'Private append-only 4A interface. The present prototype creates no provider object and seeds no valid authorization; scheduled readiness remains blocked unless a separately authorized future tranche records a valid snapshot.';

create table public.mpgf_public_goods_outflow_coverage_snapshots (
  id uuid primary key default gen_random_uuid(),
  participant_id uuid not null references public.profiles (id) on delete cascade,
  cycle_key text not null check (cycle_key ~ '^\d{4}-(0[1-9]|1[0-2])$'),
  period_start timestamptz not null,
  period_end_exclusive timestamptz not null,
  coverage_status text not null check (coverage_status in ('unavailable', 'partial', 'complete')),
  coverage_reason text not null check (length(coverage_reason) > 0),
  source_scope text[] not null default '{}',
  source_coverage_attested boolean not null default false,
  evidence_hash text not null check (evidence_hash ~ '^sha256:[a-f0-9]{64}$'),
  observed_at timestamptz not null default timezone('utc', now()),
  supersedes_id uuid references public.mpgf_public_goods_outflow_coverage_snapshots (id) on delete restrict,
  created_at timestamptz not null default timezone('utc', now()),
  check (period_end_exclusive = period_start + interval '1 month'),
  check (coverage_status <> 'complete' or source_coverage_attested)
);

comment on table public.mpgf_public_goods_outflow_coverage_snapshots is
  'Append-only assertion of whether every eligible outgoing Moral Trade payment and later refund, reversal, or chargeback is covered for one participant and prior UTC month. Partial tables never authorize an amount.';

create table public.mpgf_public_goods_outflow_observations (
  id uuid primary key default gen_random_uuid(),
  coverage_snapshot_id uuid not null references public.mpgf_public_goods_outflow_coverage_snapshots (id) on delete restrict,
  participant_id uuid not null references public.profiles (id) on delete cascade,
  source_system text not null check (length(source_system) between 2 and 120),
  source_record_key text not null check (length(source_record_key) between 1 and 300),
  direction text not null check (direction in ('outgoing', 'incoming', 'internal', 'self')),
  payment_kind text not null check (payment_kind in ('moral_trade_payment', 'compact_contribution', 'wallet_funding', 'deposit', 'escrow')),
  settlement_status text not null check (settlement_status in ('settled', 'pending', 'failed')),
  gross_settled_cents bigint not null check (gross_settled_cents >= 0),
  refunded_cents bigint not null default 0 check (refunded_cents >= 0),
  reversed_cents bigint not null default 0 check (reversed_cents >= 0),
  chargeback_cents bigint not null default 0 check (chargeback_cents >= 0),
  occurred_at timestamptz not null,
  source_event_hash text not null check (source_event_hash ~ '^sha256:[a-f0-9]{64}$'),
  created_at timestamptz not null default timezone('utc', now()),
  unique (source_system, source_record_key, source_event_hash)
);

comment on table public.mpgf_public_goods_outflow_observations is
  'Append-only normalized payment observations. Only outgoing settled moral_trade_payment rows inside a complete coverage snapshot enter the obligation; Compact contributions, incoming/internal/self flows, wallet funding, deposits, escrow, pending, and failed rows are excluded.';

create table public.mpgf_public_goods_obligation_snapshots (
  id uuid primary key default gen_random_uuid(),
  participant_id uuid not null references public.profiles (id) on delete cascade,
  cycle_key text not null check (cycle_key ~ '^\d{4}-(0[1-9]|1[0-2])$'),
  coverage_snapshot_id uuid not null references public.mpgf_public_goods_outflow_coverage_snapshots (id) on delete restrict,
  state text not null check (state in ('unavailable', 'calculated')),
  eligible_net_settled_outflow_cents bigint,
  obligation_cents bigint,
  source_observation_count integer not null default 0 check (source_observation_count >= 0),
  calculation_version text not null default 'transaction-v2-floor-divide-by-10',
  snapshot_hash text not null check (snapshot_hash ~ '^sha256:[a-f0-9]{64}$'),
  supersedes_id uuid references public.mpgf_public_goods_obligation_snapshots (id) on delete restrict,
  frozen_at timestamptz not null default timezone('utc', now()),
  created_at timestamptz not null default timezone('utc', now()),
  check (
    (state = 'unavailable' and eligible_net_settled_outflow_cents is null and obligation_cents is null and source_observation_count = 0)
    or
    (state = 'calculated' and eligible_net_settled_outflow_cents >= 0 and obligation_cents = eligible_net_settled_outflow_cents / 10)
  ),
  unique (participant_id, cycle_key, snapshot_hash)
);

comment on table public.mpgf_public_goods_obligation_snapshots is
  'Immutable aggregate obligation snapshots. Calculated state is permitted only from a complete coverage snapshot; otherwise both money fields remain null.';

create table public.mpgf_public_goods_allocation_instructions (
  id uuid primary key default gen_random_uuid(),
  participant_id uuid not null references public.profiles (id) on delete cascade,
  cycle_key text not null check (cycle_key ~ '^\d{4}-(0[1-9]|1[0-2])$'),
  constitution_version text not null check (constitution_version = 'mpgf-public-goods-compact/transaction-v2'),
  basis_points_total integer not null check (basis_points_total = 10000),
  instruction_hash text not null check (instruction_hash ~ '^sha256:[a-f0-9]{64}$'),
  supersedes_id uuid references public.mpgf_public_goods_allocation_instructions (id) on delete restrict,
  submitted_at timestamptz not null default timezone('utc', now()),
  created_at timestamptz not null default timezone('utc', now()),
  unique (participant_id, cycle_key, instruction_hash)
);

create table public.mpgf_public_goods_allocation_instruction_lines (
  id uuid primary key default gen_random_uuid(),
  instruction_id uuid not null references public.mpgf_public_goods_allocation_instructions (id) on delete restrict,
  membership_id uuid not null,
  compact_id uuid not null,
  allocation_bps integer not null check (allocation_bps between 0 and 10000),
  stable_compact_key text not null,
  created_at timestamptz not null default timezone('utc', now()),
  foreign key (membership_id, compact_id) references public.mpgf_public_goods_compact_memberships (id, compact_id) on delete restrict,
  unique (instruction_id, compact_id),
  unique (instruction_id, membership_id)
);

comment on table public.mpgf_public_goods_allocation_instructions is
  'Append-only integer-basis-point allocation instructions. One joined Compact may default to 10000; multiple joined Compacts require an explicit complete map totaling exactly 10000.';

create table public.mpgf_public_goods_scheduled_amount_snapshots (
  id uuid primary key default gen_random_uuid(),
  obligation_snapshot_id uuid not null references public.mpgf_public_goods_obligation_snapshots (id) on delete restrict,
  allocation_instruction_id uuid not null references public.mpgf_public_goods_allocation_instructions (id) on delete restrict,
  participant_id uuid not null references public.profiles (id) on delete cascade,
  cycle_key text not null,
  membership_id uuid not null,
  compact_id uuid not null,
  allocation_bps integer not null check (allocation_bps between 0 and 10000),
  scheduled_contribution_cents bigint not null check (scheduled_contribution_cents >= 0),
  remainder_numerator bigint not null check (remainder_numerator between 0 and 9999),
  largest_remainder_rank integer not null check (largest_remainder_rank > 0),
  snapshot_hash text not null check (snapshot_hash ~ '^sha256:[a-f0-9]{64}$'),
  frozen_at timestamptz not null default timezone('utc', now()),
  foreign key (membership_id, compact_id) references public.mpgf_public_goods_compact_memberships (id, compact_id) on delete restrict,
  unique (obligation_snapshot_id, allocation_instruction_id, compact_id)
);

comment on table public.mpgf_public_goods_scheduled_amount_snapshots is
  'Immutable largest-remainder allocation output. Rows exist only when coverage, obligation, and the complete membership allocation are valid; their cents sum exactly to the aggregate obligation.';

create table public.mpgf_public_goods_settled_contribution_snapshots (
  id uuid primary key default gen_random_uuid(),
  participant_id uuid not null references public.profiles (id) on delete cascade,
  cycle_key text not null check (cycle_key ~ '^\d{4}-(0[1-9]|1[0-2])$'),
  membership_id uuid not null,
  compact_id uuid not null,
  gross_settled_cents bigint not null check (gross_settled_cents >= 0),
  refunded_cents bigint not null default 0 check (refunded_cents >= 0),
  reversed_cents bigint not null default 0 check (reversed_cents >= 0),
  chargeback_cents bigint not null default 0 check (chargeback_cents >= 0),
  net_settled_cents bigint not null check (net_settled_cents >= 0),
  settlement_coverage_status text not null check (settlement_coverage_status in ('unavailable', 'partial', 'complete')),
  source_event_hash text not null check (source_event_hash ~ '^sha256:[a-f0-9]{64}$'),
  supersedes_id uuid references public.mpgf_public_goods_settled_contribution_snapshots (id) on delete restrict,
  frozen_at timestamptz not null default timezone('utc', now()),
  foreign key (membership_id, compact_id) references public.mpgf_public_goods_compact_memberships (id, compact_id) on delete restrict,
  check (net_settled_cents = greatest(0, gross_settled_cents - refunded_cents - reversed_cents - chargeback_cents)),
  check (settlement_coverage_status = 'complete' or net_settled_cents = 0),
  unique (participant_id, cycle_key, membership_id, source_event_hash)
);

create table public.mpgf_public_goods_funding_qualification_snapshots (
  id uuid primary key default gen_random_uuid(),
  participant_id uuid not null references public.profiles (id) on delete cascade,
  cycle_key text not null check (cycle_key ~ '^\d{4}-(0[1-9]|1[0-2])$'),
  membership_id uuid not null,
  compact_id uuid not null,
  identity_eligibility_record_id uuid references public.moral_trade_participant_eligibility_records (id) on delete restrict,
  allocation_instruction_id uuid references public.mpgf_public_goods_allocation_instructions (id) on delete restrict,
  scheduled_amount_snapshot_id uuid references public.mpgf_public_goods_scheduled_amount_snapshots (id) on delete restrict,
  settled_contribution_snapshot_id uuid references public.mpgf_public_goods_settled_contribution_snapshots (id) on delete restrict,
  dormant_authorization_snapshot_id uuid references public.mpgf_public_goods_dormant_authorization_snapshots (id) on delete restrict,
  identity_qualified boolean not null,
  unique_person_gate_state text not null default 'unavailable' check (unique_person_gate_state in ('unavailable', 'verified_unique_person')),
  unique_person_key_hash text,
  allocation_valid boolean not null,
  scheduled_contribution_cents bigint,
  net_settled_contribution_cents bigint,
  qualification_state text not null check (qualification_state in ('unqualified', 'scheduled_qualified', 'settled_qualified')),
  snapshot_hash text not null check (snapshot_hash ~ '^sha256:[a-f0-9]{64}$'),
  frozen_at timestamptz not null default timezone('utc', now()),
  foreign key (membership_id, compact_id) references public.mpgf_public_goods_compact_memberships (id, compact_id) on delete restrict,
  check (
    not identity_qualified
    or (
      identity_eligibility_record_id is not null
      and unique_person_gate_state = 'verified_unique_person'
      and unique_person_key_hash ~ '^sha256:[a-f0-9]{64}$'
    )
  ),
  check (
    (qualification_state = 'unqualified')
    or (qualification_state = 'scheduled_qualified' and identity_qualified and allocation_valid and scheduled_contribution_cents is not null and scheduled_contribution_cents >= 100 and dormant_authorization_snapshot_id is not null)
    or (qualification_state = 'settled_qualified' and identity_qualified and allocation_valid and net_settled_contribution_cents is not null and net_settled_contribution_cents >= 100)
  ),
  unique (participant_id, cycle_key, membership_id, snapshot_hash)
);

comment on table public.mpgf_public_goods_funding_qualification_snapshots is
  'Compact-local monthly qualification. Identity qualification additionally requires a stable privacy-preserving unique-person key; the current product has no writer for that gate. Scheduled qualification also requires a valid dormant authorization, while voting and delegation require settled_qualified based on complete actual net settlement.';

create table public.mpgf_public_goods_readiness_snapshots (
  id uuid primary key default gen_random_uuid(),
  compact_id uuid not null references public.mpgf_public_goods_compacts (id) on delete restrict,
  cycle_key text not null check (cycle_key ~ '^\d{4}-(0[1-9]|1[0-2])$'),
  funding_qualified_unique_person_count integer not null check (funding_qualified_unique_person_count >= 0),
  scheduled_contribution_cents bigint not null check (scheduled_contribution_cents >= 0),
  member_threshold_met boolean not null,
  funding_threshold_met boolean not null,
  threshold_ready boolean not null,
  activation_blocked boolean not null default true check (activation_blocked),
  blockers text[] not null check (cardinality(blockers) > 0),
  source_snapshot_hash text not null check (source_snapshot_hash ~ '^sha256:[a-f0-9]{64}$'),
  supersedes_id uuid references public.mpgf_public_goods_readiness_snapshots (id) on delete restrict,
  frozen_at timestamptz not null default timezone('utc', now()),
  check (member_threshold_met = (funding_qualified_unique_person_count >= 100)),
  check (funding_threshold_met = (scheduled_contribution_cents >= 50000)),
  check (threshold_ready = (member_threshold_met and funding_threshold_met)),
  unique (compact_id, cycle_key, source_snapshot_hash)
);

create table public.mpgf_public_goods_voting_snapshots (
  id uuid primary key default gen_random_uuid(),
  compact_id uuid not null references public.mpgf_public_goods_compacts (id) on delete restrict,
  cycle_key text not null check (cycle_key ~ '^\d{4}-(0[1-9]|1[0-2])$'),
  total_weight_units bigint not null check (total_weight_units = 1000000000000),
  equal_pool_units bigint not null check (equal_pool_units = 700000000000),
  sqrt_pool_units bigint not null check (sqrt_pool_units = 300000000000),
  qualified_member_count integer not null check (qualified_member_count > 0),
  source_snapshot_hash text not null check (source_snapshot_hash ~ '^sha256:[a-f0-9]{64}$'),
  frozen_at timestamptz not null default timezone('utc', now()),
  unique (compact_id, cycle_key, source_snapshot_hash)
);

create table public.mpgf_public_goods_voting_weight_snapshots (
  id uuid primary key default gen_random_uuid(),
  voting_snapshot_id uuid not null references public.mpgf_public_goods_voting_snapshots (id) on delete restrict,
  membership_id uuid not null,
  compact_id uuid not null,
  participant_id uuid not null references public.profiles (id) on delete cascade,
  net_settled_contribution_cents bigint not null check (net_settled_contribution_cents >= 100),
  equal_weight_units bigint not null check (equal_weight_units >= 0),
  sqrt_contribution_weight_units bigint not null check (sqrt_contribution_weight_units >= 0),
  total_weight_units bigint not null check (total_weight_units = equal_weight_units + sqrt_contribution_weight_units),
  frozen_at timestamptz not null,
  foreign key (membership_id, compact_id) references public.mpgf_public_goods_compact_memberships (id, compact_id) on delete restrict,
  unique (voting_snapshot_id, membership_id),
  unique (voting_snapshot_id, participant_id)
);

comment on table public.mpgf_public_goods_voting_weight_snapshots is
  'Immutable high-precision 70 percent equal plus 30 percent square-root actual net-settled contribution weights. Each voting snapshot sums to exactly one trillion units.';

create table public.mpgf_public_goods_delegation_events (
  id uuid primary key default gen_random_uuid(),
  voting_snapshot_id uuid not null references public.mpgf_public_goods_voting_snapshots (id) on delete restrict,
  compact_id uuid not null references public.mpgf_public_goods_compacts (id) on delete restrict,
  cycle_key text not null,
  delegator_membership_id uuid not null,
  delegatee_membership_id uuid,
  event_kind text not null check (event_kind in ('set', 'revoke')),
  direct_only boolean not null default true check (direct_only),
  incoming_weight_redelegated boolean not null default false check (not incoming_weight_redelegated),
  controlled_weight_units_after bigint check (controlled_weight_units_after between 0 and 100000000000),
  supersedes_event_id uuid references public.mpgf_public_goods_delegation_events (id) on delete restrict,
  created_by uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default timezone('utc', now()),
  foreign key (delegator_membership_id, compact_id) references public.mpgf_public_goods_compact_memberships (id, compact_id) on delete restrict,
  foreign key (delegatee_membership_id, compact_id) references public.mpgf_public_goods_compact_memberships (id, compact_id) on delete restrict,
  check ((event_kind = 'set' and delegatee_membership_id is not null and delegatee_membership_id <> delegator_membership_id and controlled_weight_units_after is not null) or (event_kind = 'revoke' and delegatee_membership_id is null and controlled_weight_units_after is null))
);

comment on table public.mpgf_public_goods_delegation_events is
  'Append-only direct delegation events. Only a member own frozen weight moves; incoming delegated weight never follows another delegation. A set event is rejected above ten percent effective control.';

create table public.mpgf_public_goods_delegation_snapshots (
  id uuid primary key default gen_random_uuid(),
  voting_snapshot_id uuid not null unique references public.mpgf_public_goods_voting_snapshots (id) on delete restrict,
  compact_id uuid not null references public.mpgf_public_goods_compacts (id) on delete restrict,
  cycle_key text not null check (cycle_key ~ '^\d{4}-(0[1-9]|1[0-2])$'),
  source_event_cutoff_at timestamptz not null,
  effective_weight_units bigint not null check (effective_weight_units = 1000000000000),
  snapshot_hash text not null check (snapshot_hash ~ '^sha256:[a-f0-9]{64}$'),
  frozen_at timestamptz not null default timezone('utc', now()),
  unique (compact_id, cycle_key, snapshot_hash)
);

create table public.mpgf_public_goods_delegation_weight_snapshots (
  id uuid primary key default gen_random_uuid(),
  delegation_snapshot_id uuid not null references public.mpgf_public_goods_delegation_snapshots (id) on delete restrict,
  membership_id uuid not null,
  compact_id uuid not null,
  participant_id uuid not null references public.profiles (id) on delete cascade,
  delegated_to_membership_id uuid,
  own_weight_units bigint not null check (own_weight_units >= 0),
  controlled_weight_units bigint not null check (controlled_weight_units between 0 and 1000000000000),
  direct_incoming_count integer not null check (direct_incoming_count >= 0),
  frozen_at timestamptz not null,
  foreign key (membership_id, compact_id) references public.mpgf_public_goods_compact_memberships (id, compact_id) on delete restrict,
  foreign key (delegated_to_membership_id, compact_id) references public.mpgf_public_goods_compact_memberships (id, compact_id) on delete restrict,
  unique (delegation_snapshot_id, membership_id),
  unique (delegation_snapshot_id, participant_id)
);

comment on table public.mpgf_public_goods_delegation_snapshots is
  'Immutable ballot-cycle delegation freeze. One row per voting snapshot fixes the event cutoff; weight rows preserve direct-only ownership and must sum to the full electorate without transitive forwarding.';

create table public.mpgf_public_goods_compact_idempotency_keys (
  id uuid primary key default gen_random_uuid(),
  participant_id uuid not null references public.profiles (id) on delete cascade,
  action text not null check (action in ('join_v2', 'set_allocation_v2', 'request_exit_v2', 'set_delegation_v2', 'clear_delegation_v2')),
  idempotency_key text not null check (idempotency_key ~ '^[A-Za-z0-9][A-Za-z0-9._:-]{7,199}$'),
  request_hash text not null check (request_hash ~ '^[a-f0-9]{64}$'),
  response_json jsonb not null,
  created_at timestamptz not null default timezone('utc', now()),
  unique (participant_id, action, idempotency_key)
);

create index mpgf_compact_memberships_participant_idx on public.mpgf_public_goods_compact_memberships (participant_id, status);
create index mpgf_dormant_authorization_latest_idx on public.mpgf_public_goods_dormant_authorization_snapshots (participant_id, cycle_key, frozen_at desc);
create index mpgf_outflow_coverage_latest_idx on public.mpgf_public_goods_outflow_coverage_snapshots (participant_id, cycle_key, created_at desc);
create index mpgf_outflow_observations_coverage_idx on public.mpgf_public_goods_outflow_observations (coverage_snapshot_id, participant_id, occurred_at);
create index mpgf_obligation_latest_idx on public.mpgf_public_goods_obligation_snapshots (participant_id, cycle_key, frozen_at desc);
create index mpgf_allocation_latest_idx on public.mpgf_public_goods_allocation_instructions (participant_id, cycle_key, submitted_at desc);
create index mpgf_scheduled_member_idx on public.mpgf_public_goods_scheduled_amount_snapshots (participant_id, cycle_key, membership_id, frozen_at desc);
create index mpgf_settled_member_idx on public.mpgf_public_goods_settled_contribution_snapshots (participant_id, cycle_key, membership_id, frozen_at desc);
create index mpgf_qualification_compact_idx on public.mpgf_public_goods_funding_qualification_snapshots (compact_id, cycle_key, qualification_state, frozen_at desc);
create index mpgf_readiness_latest_idx on public.mpgf_public_goods_readiness_snapshots (compact_id, cycle_key, frozen_at desc);
create index mpgf_voting_latest_idx on public.mpgf_public_goods_voting_snapshots (compact_id, cycle_key, frozen_at desc);
create index mpgf_delegation_latest_idx on public.mpgf_public_goods_delegation_events (voting_snapshot_id, delegator_membership_id, created_at desc);
create unique index mpgf_delegation_one_root_idx
  on public.mpgf_public_goods_delegation_events (voting_snapshot_id, delegator_membership_id)
  where supersedes_event_id is null;
create unique index mpgf_delegation_one_successor_idx
  on public.mpgf_public_goods_delegation_events (supersedes_event_id)
  where supersedes_event_id is not null;
create index mpgf_delegation_snapshot_cycle_idx on public.mpgf_public_goods_delegation_snapshots (compact_id, cycle_key, frozen_at desc);

alter table public.mpgf_public_goods_compacts enable row level security;
alter table public.mpgf_public_goods_compact_memberships enable row level security;
alter table public.mpgf_public_goods_dormant_authorization_snapshots enable row level security;
alter table public.mpgf_public_goods_outflow_coverage_snapshots enable row level security;
alter table public.mpgf_public_goods_outflow_observations enable row level security;
alter table public.mpgf_public_goods_obligation_snapshots enable row level security;
alter table public.mpgf_public_goods_allocation_instructions enable row level security;
alter table public.mpgf_public_goods_allocation_instruction_lines enable row level security;
alter table public.mpgf_public_goods_scheduled_amount_snapshots enable row level security;
alter table public.mpgf_public_goods_settled_contribution_snapshots enable row level security;
alter table public.mpgf_public_goods_funding_qualification_snapshots enable row level security;
alter table public.mpgf_public_goods_readiness_snapshots enable row level security;
alter table public.mpgf_public_goods_voting_snapshots enable row level security;
alter table public.mpgf_public_goods_voting_weight_snapshots enable row level security;
alter table public.mpgf_public_goods_delegation_events enable row level security;
alter table public.mpgf_public_goods_delegation_snapshots enable row level security;
alter table public.mpgf_public_goods_delegation_weight_snapshots enable row level security;
alter table public.mpgf_public_goods_compact_idempotency_keys enable row level security;

revoke all on table public.mpgf_public_goods_compacts, public.mpgf_public_goods_compact_memberships, public.mpgf_public_goods_dormant_authorization_snapshots, public.mpgf_public_goods_outflow_coverage_snapshots, public.mpgf_public_goods_outflow_observations, public.mpgf_public_goods_obligation_snapshots, public.mpgf_public_goods_allocation_instructions, public.mpgf_public_goods_allocation_instruction_lines, public.mpgf_public_goods_scheduled_amount_snapshots, public.mpgf_public_goods_settled_contribution_snapshots, public.mpgf_public_goods_funding_qualification_snapshots, public.mpgf_public_goods_readiness_snapshots, public.mpgf_public_goods_voting_snapshots, public.mpgf_public_goods_voting_weight_snapshots, public.mpgf_public_goods_delegation_events, public.mpgf_public_goods_delegation_snapshots, public.mpgf_public_goods_delegation_weight_snapshots, public.mpgf_public_goods_compact_idempotency_keys from public, anon, authenticated;

grant select on table public.mpgf_public_goods_compact_memberships, public.mpgf_public_goods_dormant_authorization_snapshots, public.mpgf_public_goods_outflow_coverage_snapshots, public.mpgf_public_goods_outflow_observations, public.mpgf_public_goods_obligation_snapshots, public.mpgf_public_goods_allocation_instructions, public.mpgf_public_goods_allocation_instruction_lines, public.mpgf_public_goods_scheduled_amount_snapshots, public.mpgf_public_goods_settled_contribution_snapshots, public.mpgf_public_goods_funding_qualification_snapshots, public.mpgf_public_goods_voting_weight_snapshots, public.mpgf_public_goods_delegation_events, public.mpgf_public_goods_delegation_weight_snapshots to authenticated;
grant all on table public.mpgf_public_goods_compacts, public.mpgf_public_goods_compact_memberships, public.mpgf_public_goods_dormant_authorization_snapshots, public.mpgf_public_goods_outflow_coverage_snapshots, public.mpgf_public_goods_outflow_observations, public.mpgf_public_goods_obligation_snapshots, public.mpgf_public_goods_allocation_instructions, public.mpgf_public_goods_allocation_instruction_lines, public.mpgf_public_goods_scheduled_amount_snapshots, public.mpgf_public_goods_settled_contribution_snapshots, public.mpgf_public_goods_funding_qualification_snapshots, public.mpgf_public_goods_readiness_snapshots, public.mpgf_public_goods_voting_snapshots, public.mpgf_public_goods_voting_weight_snapshots, public.mpgf_public_goods_delegation_events, public.mpgf_public_goods_delegation_snapshots, public.mpgf_public_goods_delegation_weight_snapshots, public.mpgf_public_goods_compact_idempotency_keys to service_role;

create policy mpgf_compacts_current_public_select on public.mpgf_public_goods_compacts for select to anon, authenticated using (is_current);
create policy mpgf_readiness_public_select on public.mpgf_public_goods_readiness_snapshots for select to anon, authenticated using (true);
create policy mpgf_membership_owner_select on public.mpgf_public_goods_compact_memberships for select to authenticated using (participant_id = auth.uid());
create policy mpgf_dormant_authorization_owner_select on public.mpgf_public_goods_dormant_authorization_snapshots for select to authenticated using (participant_id = (select auth.uid()));
create policy mpgf_coverage_owner_select on public.mpgf_public_goods_outflow_coverage_snapshots for select to authenticated using (participant_id = auth.uid());
create policy mpgf_observation_owner_select on public.mpgf_public_goods_outflow_observations for select to authenticated using (participant_id = auth.uid());
create policy mpgf_obligation_owner_select on public.mpgf_public_goods_obligation_snapshots for select to authenticated using (participant_id = auth.uid());
create policy mpgf_allocation_owner_select on public.mpgf_public_goods_allocation_instructions for select to authenticated using (participant_id = auth.uid());
create policy mpgf_allocation_lines_owner_select on public.mpgf_public_goods_allocation_instruction_lines for select to authenticated using (exists (select 1 from public.mpgf_public_goods_allocation_instructions as instruction where instruction.id = instruction_id and instruction.participant_id = auth.uid()));
create policy mpgf_scheduled_owner_select on public.mpgf_public_goods_scheduled_amount_snapshots for select to authenticated using (participant_id = auth.uid());
create policy mpgf_settled_owner_select on public.mpgf_public_goods_settled_contribution_snapshots for select to authenticated using (participant_id = auth.uid());
create policy mpgf_qualification_owner_select on public.mpgf_public_goods_funding_qualification_snapshots for select to authenticated using (participant_id = auth.uid());
create policy mpgf_voting_weight_owner_select on public.mpgf_public_goods_voting_weight_snapshots for select to authenticated using (participant_id = auth.uid());
create policy mpgf_delegation_participant_select on public.mpgf_public_goods_delegation_events for select to authenticated using (exists (select 1 from public.mpgf_public_goods_compact_memberships as membership where membership.participant_id = auth.uid() and membership.id in (delegator_membership_id, delegatee_membership_id)));
create policy mpgf_delegation_weight_owner_select on public.mpgf_public_goods_delegation_weight_snapshots for select to authenticated using (participant_id = (select auth.uid()));

insert into public.mpgf_public_goods_compacts (
  id, public_key, cause_key, title, summary, constitution_version,
  project_selection_rule, audit_rule,
  no_project_opt_out_rule, display_order
) values
  ('10000000-0000-4000-8000-000000000001', 'future-flourishing', 'future_flourishing', 'Future Flourishing', 'Long-horizon public goods that protect the conditions for future people to flourish.', 'mpgf-public-goods-compact/transaction-v2', 'Seventy percent equal member weight and thirty percent square-root net-settled contribution weight, with direct-only delegation capped at ten percent.', 'Independent review and audit, additionality checks, conflict and recusal rules, minority protections, and public post-round reporting are required.', 'After activation, members may not refuse individual selected projects.', 1),
  ('10000000-0000-4000-8000-000000000002', 'animal-welfare', 'animal_welfare', 'Animal Welfare', 'Evidence-led public goods that reduce severe animal suffering and improve welfare systems.', 'mpgf-public-goods-compact/transaction-v2', 'Seventy percent equal member weight and thirty percent square-root net-settled contribution weight, with direct-only delegation capped at ten percent.', 'Independent review and audit, additionality checks, conflict and recusal rules, minority protections, and public post-round reporting are required.', 'After activation, members may not refuse individual selected projects.', 2),
  ('10000000-0000-4000-8000-000000000003', 'global-health', 'global_health', 'Global Health', 'Shared health interventions and institutional capacity with independently reviewed evidence.', 'mpgf-public-goods-compact/transaction-v2', 'Seventy percent equal member weight and thirty percent square-root net-settled contribution weight, with direct-only delegation capped at ten percent.', 'Independent review and audit, additionality checks, conflict and recusal rules, minority protections, and public post-round reporting are required.', 'After activation, members may not refuse individual selected projects.', 3);

commit;
