begin;

create extension if not exists pgcrypto with schema extensions;

create table public.mpgf_public_goods_compacts (
  id uuid primary key default gen_random_uuid(),
  public_key text not null unique check (public_key ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  cause_key text not null unique check (cause_key in (
    'future_flourishing',
    'animal_welfare',
    'global_health'
  )),
  title text not null check (char_length(title) between 3 and 120),
  summary text not null check (char_length(summary) between 20 and 500),
  display_order smallint not null unique check (display_order between 1 and 100),
  constitution_version text not null check (char_length(constitution_version) between 8 and 120),
  constitution_published_at timestamptz not null,
  contribution_rate_bps smallint not null default 100 check (contribution_rate_bps = 100),
  monthly_contribution_cap_cents bigint not null default 1000 check (monthly_contribution_cap_cents = 1000),
  activation_threshold_members integer not null default 5000 check (activation_threshold_members = 5000),
  minimum_term_months smallint not null default 12 check (minimum_term_months = 12),
  exit_notice_days smallint not null default 30 check (exit_notice_days = 30),
  project_selection_rule text not null check (
    project_selection_rule = 'one_member_one_credit_with_revocable_delegation'
  ),
  audit_rule text not null check (
    audit_rule = 'independent_review_additionality_conflicts_minority_reporting_required'
  ),
  opt_in_only boolean not null default true check (opt_in_only),
  random_assignment_allowed boolean not null default false check (not random_assignment_allowed),
  core_marketplace_taxed boolean not null default false check (not core_marketplace_taxed),
  binding_only_after_activation boolean not null default true check (binding_only_after_activation),
  per_project_refusal_allowed_after_activation boolean not null default false check (
    not per_project_refusal_allowed_after_activation
  ),
  exit_prospective_only_after_activation boolean not null default true check (
    exit_prospective_only_after_activation
  ),
  money_moves_on_join boolean not null default false check (not money_moves_on_join),
  automatic_collection_enabled boolean not null default false check (not automatic_collection_enabled),
  collection_state text not null default
    'disabled_pending_legal_fiscal_sponsor_provider_donor_of_record_receipt_custody_sanctions_and_production_release_gates'
    check (
      collection_state =
        'disabled_pending_legal_fiscal_sponsor_provider_donor_of_record_receipt_custody_sanctions_and_production_release_gates'
    ),
  status text not null default 'recruiting' check (status in ('recruiting', 'active')),
  accepted_member_count bigint not null default 0 check (accepted_member_count >= 0),
  activation_identity_gate_state text not null default
    'blocked_pending_person_unique_eligibility_policy'
    check (activation_identity_gate_state in (
      'blocked_pending_person_unique_eligibility_policy',
      'verified_person_unique_eligibility_policy'
    )),
  activated_at timestamptz,
  constitution_frozen_at timestamptz,
  frozen_constitution_version text,
  allocation_electorate_active boolean not null default false,
  allocation_electorate_key text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  check (
    (status = 'recruiting'
      and activated_at is null
      and constitution_frozen_at is null
      and frozen_constitution_version is null)
    or
    (status = 'active'
      and activation_identity_gate_state = 'verified_person_unique_eligibility_policy'
      and activated_at is not null
      and constitution_frozen_at is not null
      and frozen_constitution_version = constitution_version)
  ),
  check (
    (allocation_electorate_active and allocation_electorate_key is not null)
    or (not allocation_electorate_active and allocation_electorate_key is null)
  )
);

comment on table public.mpgf_public_goods_compacts is
  'Published, cause-specific opt-in MPGF constitutions. These are not government jurisdictions, do not tax the core marketplace, and cannot enable automatic collection.';

create table public.mpgf_public_goods_compact_memberships (
  id uuid primary key default gen_random_uuid(),
  compact_id uuid not null references public.mpgf_public_goods_compacts(id) on delete restrict,
  user_id uuid not null references auth.users(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  constitution_version_accepted text not null check (
    char_length(constitution_version_accepted) between 8 and 120
  ),
  acknowledgements jsonb not null check (
    acknowledgements = '{
      "voluntaryChoice": true,
      "exactConstitution": true,
      "activationAndNoProjectOptOut": true,
      "noPaymentMandate": true
    }'::jsonb
  ),
  declared_eligible_monthly_spending_cents bigint not null check (
    declared_eligible_monthly_spending_cents between 0 and 100000000000
  ),
  scheduled_monthly_contribution_cents bigint not null check (
    scheduled_monthly_contribution_cents between 1 and 1000
  ),
  status text not null check (status in (
    'pending_activation',
    'active',
    'exit_notice',
    'revoked',
    'exited'
  )),
  accepted_at timestamptz not null default timezone('utc', now()),
  activated_at timestamptz,
  revoked_at timestamptz,
  exit_requested_at timestamptz,
  exit_effective_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (compact_id, user_id),
  unique (id, compact_id),
  check (user_id = profile_id),
  check (
    (status = 'pending_activation'
      and activated_at is null
      and revoked_at is null
      and exit_requested_at is null
      and exit_effective_at is null)
    or
    (status = 'active'
      and activated_at is not null
      and revoked_at is null
      and exit_requested_at is null
      and exit_effective_at is null)
    or
    (status = 'exit_notice'
      and activated_at is not null
      and revoked_at is null
      and exit_requested_at is not null
      and exit_effective_at is not null
      and exit_effective_at >= exit_requested_at)
    or
    (status = 'revoked'
      and activated_at is null
      and revoked_at is not null
      and exit_requested_at is null
      and exit_effective_at is null)
    or
    (status = 'exited'
      and activated_at is not null
      and revoked_at is null
      and exit_requested_at is not null
      and exit_effective_at is not null)
  )
);

comment on table public.mpgf_public_goods_compact_memberships is
  'Private compact acceptances. Declared spending and scheduled contribution cents are owner-only and never constitute a charge, payment mandate, receipt, custody record, or tax claim.';

create index mpgf_public_goods_compact_memberships_user_idx
  on public.mpgf_public_goods_compact_memberships(user_id, status, compact_id);
create index mpgf_public_goods_compact_memberships_compact_status_idx
  on public.mpgf_public_goods_compact_memberships(compact_id, status, accepted_at);

create table public.mpgf_public_goods_compact_delegations (
  id uuid primary key default gen_random_uuid(),
  compact_id uuid not null references public.mpgf_public_goods_compacts(id) on delete restrict,
  electorate_key text not null check (char_length(electorate_key) between 8 and 160),
  delegator_membership_id uuid not null,
  delegatee_membership_id uuid not null,
  created_by uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'active' check (status in ('active', 'revoked')),
  created_at timestamptz not null default timezone('utc', now()),
  revoked_at timestamptz,
  foreign key (delegator_membership_id, compact_id)
    references public.mpgf_public_goods_compact_memberships(id, compact_id)
    on delete cascade,
  foreign key (delegatee_membership_id, compact_id)
    references public.mpgf_public_goods_compact_memberships(id, compact_id)
    on delete cascade,
  check (delegator_membership_id <> delegatee_membership_id),
  check (
    (status = 'active' and revoked_at is null)
    or (status = 'revoked' and revoked_at is not null)
  )
);

comment on table public.mpgf_public_goods_compact_delegations is
  'Revocable same-compact, same-electorate voting-credit delegation. Delegation never transfers membership, money, or reputation.';

create unique index mpgf_public_goods_compact_delegations_one_active_idx
  on public.mpgf_public_goods_compact_delegations(
    compact_id,
    electorate_key,
    delegator_membership_id
  )
  where status = 'active';
create index mpgf_public_goods_compact_delegations_delegatee_idx
  on public.mpgf_public_goods_compact_delegations(delegatee_membership_id, status);

create table public.mpgf_public_goods_compact_idempotency_keys (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  operation text not null check (operation in (
    'join',
    'request_exit',
    'set_delegation',
    'clear_delegation'
  )),
  idempotency_key text not null check (
    idempotency_key ~ '^[A-Za-z0-9][A-Za-z0-9._:-]{7,199}$'
  ),
  request_hash text not null check (request_hash ~ '^[0-9a-f]{64}$'),
  response_json jsonb not null check (jsonb_typeof(response_json) = 'object'),
  created_at timestamptz not null default timezone('utc', now()),
  unique (user_id, operation, idempotency_key)
);

comment on table public.mpgf_public_goods_compact_idempotency_keys is
  'Private response receipts for compact membership and delegation RPC idempotency. No payment or collection credentials are stored.';

create index mpgf_public_goods_compact_idempotency_keys_created_idx
  on public.mpgf_public_goods_compact_idempotency_keys(created_at);

create or replace function public.mpgf_public_goods_compact_set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $function$
begin
  new.updated_at := pg_catalog.timezone('utc', pg_catalog.now());
  return new;
end;
$function$;

create trigger mpgf_public_goods_compacts_set_updated_at
before update on public.mpgf_public_goods_compacts
for each row execute function public.mpgf_public_goods_compact_set_updated_at();

create trigger mpgf_public_goods_compact_memberships_set_updated_at
before update on public.mpgf_public_goods_compact_memberships
for each row execute function public.mpgf_public_goods_compact_set_updated_at();

create or replace function public.mpgf_public_goods_compact_enforce_constitution_freeze()
returns trigger
language plpgsql
set search_path = ''
as $function$
begin
  if old.status = 'active' and new.status <> 'active' then
    raise exception using
      errcode = '23514',
      message = 'An activated compact cannot return to recruiting.';
  end if;

  if (old.status = 'active' or old.accepted_member_count > 0) and (
    new.public_key is distinct from old.public_key
    or new.cause_key is distinct from old.cause_key
    or new.title is distinct from old.title
    or new.summary is distinct from old.summary
    or new.constitution_version is distinct from old.constitution_version
    or new.constitution_published_at is distinct from old.constitution_published_at
    or new.contribution_rate_bps is distinct from old.contribution_rate_bps
    or new.monthly_contribution_cap_cents is distinct from old.monthly_contribution_cap_cents
    or new.activation_threshold_members is distinct from old.activation_threshold_members
    or new.minimum_term_months is distinct from old.minimum_term_months
    or new.exit_notice_days is distinct from old.exit_notice_days
    or new.project_selection_rule is distinct from old.project_selection_rule
    or new.audit_rule is distinct from old.audit_rule
    or new.opt_in_only is distinct from old.opt_in_only
    or new.random_assignment_allowed is distinct from old.random_assignment_allowed
    or new.core_marketplace_taxed is distinct from old.core_marketplace_taxed
    or new.binding_only_after_activation is distinct from old.binding_only_after_activation
    or new.per_project_refusal_allowed_after_activation is distinct from old.per_project_refusal_allowed_after_activation
    or new.exit_prospective_only_after_activation is distinct from old.exit_prospective_only_after_activation
    or new.money_moves_on_join is distinct from old.money_moves_on_join
    or new.automatic_collection_enabled is distinct from old.automatic_collection_enabled
    or new.collection_state is distinct from old.collection_state
  ) then
    raise exception using
      errcode = '23514',
      message = 'Published compact terms are immutable after the first current acceptance.';
  end if;

  if old.status = 'active' and (
    new.activated_at is distinct from old.activated_at
    or new.constitution_frozen_at is distinct from old.constitution_frozen_at
    or new.frozen_constitution_version is distinct from old.frozen_constitution_version
  ) then
    raise exception using
      errcode = '23514',
      message = 'Activated compact activation snapshot is immutable.';
  end if;

  if old.status = 'recruiting' and new.status = 'active' and (
    new.activated_at is null
    or new.constitution_frozen_at is null
    or new.frozen_constitution_version is distinct from new.constitution_version
  ) then
    raise exception using
      errcode = '23514',
      message = 'Activation must freeze the exact current constitution version.';
  end if;

  return new;
end;
$function$;

create trigger mpgf_public_goods_compacts_enforce_constitution_freeze
before update on public.mpgf_public_goods_compacts
for each row execute function public.mpgf_public_goods_compact_enforce_constitution_freeze();

alter table public.mpgf_public_goods_compacts enable row level security;
alter table public.mpgf_public_goods_compact_memberships enable row level security;
alter table public.mpgf_public_goods_compact_delegations enable row level security;
alter table public.mpgf_public_goods_compact_idempotency_keys enable row level security;

revoke all on table public.mpgf_public_goods_compacts from public, anon, authenticated;
revoke all on table public.mpgf_public_goods_compact_memberships from public, anon, authenticated;
revoke all on table public.mpgf_public_goods_compact_delegations from public, anon, authenticated;
revoke all on table public.mpgf_public_goods_compact_idempotency_keys from public, anon, authenticated;

grant select on table public.mpgf_public_goods_compact_memberships to authenticated;
grant select on table public.mpgf_public_goods_compact_delegations to authenticated;
grant all on table public.mpgf_public_goods_compacts to service_role;
grant all on table public.mpgf_public_goods_compact_memberships to service_role;
grant all on table public.mpgf_public_goods_compact_delegations to service_role;
grant all on table public.mpgf_public_goods_compact_idempotency_keys to service_role;

create policy mpgf_public_goods_compact_memberships_owner_select
on public.mpgf_public_goods_compact_memberships
for select
to authenticated
using ((select auth.uid()) = user_id);

create policy mpgf_public_goods_compact_delegations_participant_select
on public.mpgf_public_goods_compact_delegations
for select
to authenticated
using (
  exists (
    select 1
    from public.mpgf_public_goods_compact_memberships as membership
    where membership.user_id = (select auth.uid())
      and membership.id in (delegator_membership_id, delegatee_membership_id)
  )
);

create or replace function public.mpgf_public_goods_compact_idempotency_lookup(
  p_user_id uuid,
  p_operation text,
  p_idempotency_key text,
  p_request_hash text
)
returns jsonb
language plpgsql
set search_path = ''
as $function$
declare
  prior_record public.mpgf_public_goods_compact_idempotency_keys%rowtype;
begin
  if p_idempotency_key is null
    or p_idempotency_key !~ '^[A-Za-z0-9][A-Za-z0-9._:-]{7,199}$'
  then
    raise exception using
      errcode = '22023',
      message = 'A valid compact idempotency key is required.';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(
      p_user_id::text || ':' || p_operation || ':' || p_idempotency_key,
      0
    )
  );

  select * into prior_record
  from public.mpgf_public_goods_compact_idempotency_keys
  where user_id = p_user_id
    and operation = p_operation
    and idempotency_key = p_idempotency_key;

  if prior_record.id is not null and prior_record.request_hash <> p_request_hash then
    raise exception using
      errcode = '23505',
      message = 'Compact idempotency key was already used for a different request.';
  end if;

  return prior_record.response_json;
end;
$function$;

create or replace function public.mpgf_public_goods_compact_idempotency_store(
  p_user_id uuid,
  p_operation text,
  p_idempotency_key text,
  p_request_hash text,
  p_response jsonb
)
returns void
language sql
set search_path = ''
as $function$
  insert into public.mpgf_public_goods_compact_idempotency_keys (
    user_id,
    operation,
    idempotency_key,
    request_hash,
    response_json
  ) values (
    p_user_id,
    p_operation,
    p_idempotency_key,
    p_request_hash,
    p_response
  );
$function$;

create or replace function public.get_mpgf_public_goods_compacts_state()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $function$
declare
  viewer_id uuid := auth.uid();
  compact_rows jsonb;
begin
  select coalesce(
    pg_catalog.jsonb_agg(
      pg_catalog.jsonb_build_object(
        'id', compact.id::text,
        'publicKey', compact.public_key,
        'causeKey', compact.cause_key,
        'title', compact.title,
        'summary', compact.summary,
        'constitutionVersion', compact.constitution_version,
        'terms', pg_catalog.jsonb_build_object(
          'contributionRateBps', compact.contribution_rate_bps,
          'monthlyContributionCapCents', compact.monthly_contribution_cap_cents,
          'activationThresholdMembers', compact.activation_threshold_members,
          'minimumTermMonths', compact.minimum_term_months,
          'exitNoticeDays', compact.exit_notice_days,
          'projectSelectionRule', 'One member, one voting credit, with revocable delegation under published rules.',
          'auditRule', 'Independent review and audit, additionality checks, conflict and recusal rules, minority protections, and public post-round reporting are required.',
          'noProjectOptOutRule', 'After activation, members may not refuse individual selected projects.'
        ),
        'invariants', pg_catalog.jsonb_build_object(
          'optInOnly', compact.opt_in_only,
          'randomAssignmentAllowed', compact.random_assignment_allowed,
          'coreMarketplaceTaxed', compact.core_marketplace_taxed,
          'bindingOnlyAfterActivation', compact.binding_only_after_activation,
          'perProjectRefusalAllowedAfterActivation', compact.per_project_refusal_allowed_after_activation,
          'exitProspectiveOnlyAfterActivation', compact.exit_prospective_only_after_activation,
          'moneyMovesOnJoin', compact.money_moves_on_join,
          'automaticCollectionEnabled', compact.automatic_collection_enabled
        ),
        'collectionState', compact.collection_state,
        'status', compact.status,
        'acceptedMemberCount', compact.accepted_member_count,
        'memberCountAvailable', true,
        'identityIntegrityGate', pg_catalog.jsonb_build_object(
          'state', compact.activation_identity_gate_state,
          'countUniqueness', 'account_and_profile_only',
          'productionActivationReady',
            compact.activation_identity_gate_state =
              'verified_person_unique_eligibility_policy'
        ),
        'activation', pg_catalog.jsonb_build_object(
          'state', case
            when compact.status = 'active' then 'threshold_reached_constitution_frozen'
            when compact.accepted_member_count >= compact.activation_threshold_members
              then 'threshold_reached_identity_gate_blocked'
            else 'recruiting'
          end,
          'activatedAt', compact.activated_at,
          'constitutionFrozenAt', compact.constitution_frozen_at,
          'frozenConstitutionVersion', compact.frozen_constitution_version,
          'minimumTermEndsAt', case
            when compact.activated_at is null then null
            else compact.activated_at + pg_catalog.make_interval(months => compact.minimum_term_months)
          end
        ),
        'allocationElectorate', pg_catalog.jsonb_build_object(
          'active', compact.allocation_electorate_active,
          'key', compact.allocation_electorate_key
        ),
        'membership', case
          when membership.id is null then null
          else pg_catalog.jsonb_build_object(
            'id', membership.id::text,
            'compactId', membership.compact_id::text,
            'compactPublicKey', compact.public_key,
            'constitutionVersionAccepted', membership.constitution_version_accepted,
            'acknowledgements', membership.acknowledgements,
            'declaredEligibleMonthlySpendingCents', membership.declared_eligible_monthly_spending_cents,
            'scheduledMonthlyContributionCents', membership.scheduled_monthly_contribution_cents,
            'status', membership.status,
            'acceptedAt', membership.accepted_at,
            'activatedAt', membership.activated_at,
            'revokedAt', membership.revoked_at,
            'exitRequestedAt', membership.exit_requested_at,
            'exitEffectiveAt', membership.exit_effective_at
          )
        end,
        'delegation', case
          when delegation.id is null then null
          else pg_catalog.jsonb_build_object(
            'id', delegation.id::text,
            'compactId', delegation.compact_id::text,
            'electorateKey', delegation.electorate_key,
            'delegatorMembershipId', delegation.delegator_membership_id::text,
            'delegateeMembershipId', delegation.delegatee_membership_id::text,
            'state', delegation.status,
            'createdAt', delegation.created_at,
            'revokedAt', delegation.revoked_at
          )
        end
      ) order by compact.display_order
    ),
    '[]'::jsonb
  ) into compact_rows
  from public.mpgf_public_goods_compacts as compact
  left join public.mpgf_public_goods_compact_memberships as membership
    on membership.compact_id = compact.id
    and membership.user_id = viewer_id
  left join lateral (
    select delegation_row.*
    from public.mpgf_public_goods_compact_delegations as delegation_row
    where delegation_row.compact_id = compact.id
      and delegation_row.delegator_membership_id = membership.id
      and delegation_row.status = 'active'
    order by delegation_row.created_at desc
    limit 1
  ) as delegation on true;

  return pg_catalog.jsonb_build_object(
    'available', true,
    'source', 'database',
    'unavailableReason', null,
    'compacts', compact_rows,
    'moneyMovesOnPageAction', false,
    'automaticCollectionEnabled', false
  );
end;
$function$;

create or replace function public.join_mpgf_public_goods_compact(
  p_compact_public_key text,
  p_constitution_version text,
  p_declared_eligible_monthly_spending_cents bigint,
  p_acknowledgements jsonb,
  p_idempotency_key text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  viewer_id uuid := auth.uid();
  compact_record public.mpgf_public_goods_compacts%rowtype;
  membership_record public.mpgf_public_goods_compact_memberships%rowtype;
  request_hash text;
  prior_response jsonb;
  response_json jsonb;
  contribution_cents bigint;
  accepted_count bigint;
  action_at timestamptz := pg_catalog.statement_timestamp();
  activated_now boolean := false;
begin
  if viewer_id is null then
    raise exception using errcode = '42501', message = 'Authentication is required to join a compact.';
  end if;
  if not exists (select 1 from public.profiles where id = viewer_id) then
    raise exception using errcode = '42501', message = 'A Moral Trade profile is required to join a compact.';
  end if;
  if p_declared_eligible_monthly_spending_cents is null
    or p_declared_eligible_monthly_spending_cents < 0
    or p_declared_eligible_monthly_spending_cents > 100000000000
  then
    raise exception using errcode = '22023', message = 'Declared eligible monthly spending cents are invalid.';
  end if;
  if p_acknowledgements is distinct from '{
    "voluntaryChoice": true,
    "exactConstitution": true,
    "activationAndNoProjectOptOut": true,
    "noPaymentMandate": true
  }'::jsonb then
    raise exception using errcode = '22023', message = 'Every required compact acknowledgement must be explicit.';
  end if;

  request_hash := pg_catalog.encode(
    extensions.digest(
      p_compact_public_key || '|' || p_constitution_version || '|' || p_declared_eligible_monthly_spending_cents::text || '|' || p_acknowledgements::text,
      'sha256'
    ),
    'hex'
  );
  prior_response := public.mpgf_public_goods_compact_idempotency_lookup(
    viewer_id,
    'join',
    p_idempotency_key,
    request_hash
  );
  if prior_response is not null then
    return prior_response;
  end if;

  select * into compact_record
  from public.mpgf_public_goods_compacts
  where public_key = p_compact_public_key
  for update;
  if compact_record.id is null then
    raise exception using errcode = 'P0002', message = 'The requested compact does not exist.';
  end if;
  if compact_record.constitution_version <> p_constitution_version then
    raise exception using errcode = '23514', message = 'Acceptance must target the exact current constitution version.';
  end if;
  if not compact_record.opt_in_only
    or compact_record.random_assignment_allowed
    or compact_record.core_marketplace_taxed
    or not compact_record.binding_only_after_activation
    or compact_record.per_project_refusal_allowed_after_activation
    or not compact_record.exit_prospective_only_after_activation
    or compact_record.money_moves_on_join
    or compact_record.automatic_collection_enabled
  then
    raise exception using errcode = '23514', message = 'The compact constitutional invariants are not safe.';
  end if;

  contribution_cents := least(
    p_declared_eligible_monthly_spending_cents / 100,
    compact_record.monthly_contribution_cap_cents
  );
  if contribution_cents = 0 then
    raise exception using
      errcode = '22023',
      message = 'A compact acceptance must schedule at least one cent and cannot count toward activation at zero cents.';
  end if;

  select * into membership_record
  from public.mpgf_public_goods_compact_memberships
  where compact_id = compact_record.id and user_id = viewer_id
  for update;

  if membership_record.id is null then
    insert into public.mpgf_public_goods_compact_memberships (
      compact_id,
      user_id,
      profile_id,
      constitution_version_accepted,
      acknowledgements,
      declared_eligible_monthly_spending_cents,
      scheduled_monthly_contribution_cents,
      status,
      accepted_at,
      activated_at
    ) values (
      compact_record.id,
      viewer_id,
      viewer_id,
      p_constitution_version,
      p_acknowledgements,
      p_declared_eligible_monthly_spending_cents,
      contribution_cents,
      case when compact_record.status = 'active' then 'active' else 'pending_activation' end,
      action_at,
      case when compact_record.status = 'active' then action_at else null end
    ) returning * into membership_record;

    update public.mpgf_public_goods_compacts
    set accepted_member_count = accepted_member_count + 1
    where id = compact_record.id
    returning accepted_member_count into accepted_count;
  elsif membership_record.status = 'revoked' then
    update public.mpgf_public_goods_compact_memberships
    set constitution_version_accepted = p_constitution_version,
        acknowledgements = p_acknowledgements,
        declared_eligible_monthly_spending_cents = p_declared_eligible_monthly_spending_cents,
        scheduled_monthly_contribution_cents = contribution_cents,
        status = case
          when compact_record.status = 'active' then 'active'
          else 'pending_activation'
        end,
        accepted_at = action_at,
        activated_at = case
          when compact_record.status = 'active' then action_at
          else null
        end,
        revoked_at = null,
        exit_requested_at = null,
        exit_effective_at = null
    where id = membership_record.id
    returning * into membership_record;

    update public.mpgf_public_goods_compacts
    set accepted_member_count = accepted_member_count + 1
    where id = compact_record.id
    returning accepted_member_count into accepted_count;
  else
    raise exception using errcode = '23505', message = 'This profile already has a current compact acceptance.';
  end if;

  if compact_record.status = 'recruiting'
    and accepted_count >= compact_record.activation_threshold_members
    and compact_record.activation_identity_gate_state =
      'verified_person_unique_eligibility_policy'
  then
    update public.mpgf_public_goods_compacts
    set status = 'active',
        activated_at = action_at,
        constitution_frozen_at = action_at,
        frozen_constitution_version = constitution_version
    where id = compact_record.id;

    update public.mpgf_public_goods_compact_memberships
    set status = 'active', activated_at = action_at
    where compact_id = compact_record.id and status = 'pending_activation';

    select * into membership_record
    from public.mpgf_public_goods_compact_memberships
    where compact_id = compact_record.id and user_id = viewer_id;
    activated_now := true;
  end if;

  response_json := pg_catalog.jsonb_build_object(
    'ok', true,
    'compactPublicKey', p_compact_public_key,
    'membershipId', membership_record.id::text,
    'membershipStatus', membership_record.status,
    'acknowledgementsRecorded', membership_record.acknowledgements = p_acknowledgements,
    'scheduledMonthlyContributionCents', membership_record.scheduled_monthly_contribution_cents,
    'acceptedMemberCount', accepted_count,
    'identityIntegrityGateState', compact_record.activation_identity_gate_state,
    'activatedNow', activated_now,
    'bindingNow', membership_record.status = 'active',
    'moneyMoved', false,
    'paymentMandateCreated', false,
    'automaticCollectionEnabled', false
  );
  perform public.mpgf_public_goods_compact_idempotency_store(
    viewer_id,
    'join',
    p_idempotency_key,
    request_hash,
    response_json
  );
  return response_json;
end;
$function$;

create or replace function public.request_mpgf_public_goods_compact_exit(
  p_compact_public_key text,
  p_idempotency_key text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  viewer_id uuid := auth.uid();
  compact_record public.mpgf_public_goods_compacts%rowtype;
  membership_record public.mpgf_public_goods_compact_memberships%rowtype;
  request_hash text;
  prior_response jsonb;
  response_json jsonb;
  action_at timestamptz := pg_catalog.statement_timestamp();
  effective_at timestamptz;
  immediate_revocation boolean := false;
  delegations_revoked integer := 0;
begin
  if viewer_id is null then
    raise exception using errcode = '42501', message = 'Authentication is required to leave a compact.';
  end if;

  request_hash := pg_catalog.encode(
    extensions.digest(p_compact_public_key, 'sha256'),
    'hex'
  );
  prior_response := public.mpgf_public_goods_compact_idempotency_lookup(
    viewer_id,
    'request_exit',
    p_idempotency_key,
    request_hash
  );
  if prior_response is not null then
    return prior_response;
  end if;

  select * into compact_record
  from public.mpgf_public_goods_compacts
  where public_key = p_compact_public_key
  for update;
  if compact_record.id is null then
    raise exception using errcode = 'P0002', message = 'The requested compact does not exist.';
  end if;

  select * into membership_record
  from public.mpgf_public_goods_compact_memberships
  where compact_id = compact_record.id and user_id = viewer_id
  for update;
  if membership_record.id is null then
    raise exception using errcode = 'P0002', message = 'No compact membership exists for this profile.';
  end if;

  if compact_record.status = 'recruiting' and membership_record.status = 'pending_activation' then
    update public.mpgf_public_goods_compact_memberships
    set status = 'revoked', revoked_at = action_at
    where id = membership_record.id
    returning * into membership_record;
    update public.mpgf_public_goods_compacts
    set accepted_member_count = greatest(0, accepted_member_count - 1)
    where id = compact_record.id;
    immediate_revocation := true;
  elsif compact_record.status = 'active' and membership_record.status = 'active' then
    effective_at := greatest(
      compact_record.activated_at + pg_catalog.make_interval(months => compact_record.minimum_term_months),
      action_at + pg_catalog.make_interval(days => compact_record.exit_notice_days)
    );
    update public.mpgf_public_goods_compact_memberships
    set status = 'exit_notice',
        exit_requested_at = action_at,
        exit_effective_at = effective_at
    where id = membership_record.id
    returning * into membership_record;

    update public.mpgf_public_goods_compact_delegations
    set status = 'revoked', revoked_at = action_at
    where compact_id = compact_record.id
      and status = 'active'
      and (
        delegator_membership_id = membership_record.id
        or delegatee_membership_id = membership_record.id
      );
    get diagnostics delegations_revoked = row_count;
  elsif membership_record.status = 'exit_notice' then
    effective_at := membership_record.exit_effective_at;
  else
    raise exception using errcode = '23514', message = 'This compact membership cannot request another exit.';
  end if;

  response_json := pg_catalog.jsonb_build_object(
    'ok', true,
    'compactPublicKey', p_compact_public_key,
    'membershipStatus', membership_record.status,
    'revokedImmediately', immediate_revocation,
    'exitEffectiveAt', membership_record.exit_effective_at,
    'delegationsRevoked', delegations_revoked,
    'moneyMoved', false,
    'paymentMandateChanged', false,
    'automaticCollectionEnabled', false
  );
  perform public.mpgf_public_goods_compact_idempotency_store(
    viewer_id,
    'request_exit',
    p_idempotency_key,
    request_hash,
    response_json
  );
  return response_json;
end;
$function$;

create or replace function public.set_mpgf_public_goods_compact_delegation(
  p_compact_public_key text,
  p_electorate_key text,
  p_delegatee_membership_id uuid,
  p_idempotency_key text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  viewer_id uuid := auth.uid();
  compact_record public.mpgf_public_goods_compacts%rowtype;
  delegator_record public.mpgf_public_goods_compact_memberships%rowtype;
  delegatee_record public.mpgf_public_goods_compact_memberships%rowtype;
  delegation_record public.mpgf_public_goods_compact_delegations%rowtype;
  request_hash text;
  prior_response jsonb;
  response_json jsonb;
  action_at timestamptz := pg_catalog.statement_timestamp();
begin
  if viewer_id is null then
    raise exception using errcode = '42501', message = 'Authentication is required to delegate a compact voting credit.';
  end if;

  request_hash := pg_catalog.encode(
    extensions.digest(
      p_compact_public_key || '|' || coalesce(p_electorate_key, '') || '|' || coalesce(p_delegatee_membership_id::text, ''),
      'sha256'
    ),
    'hex'
  );
  prior_response := public.mpgf_public_goods_compact_idempotency_lookup(
    viewer_id,
    'set_delegation',
    p_idempotency_key,
    request_hash
  );
  if prior_response is not null then
    return prior_response;
  end if;

  select * into compact_record
  from public.mpgf_public_goods_compacts
  where public_key = p_compact_public_key
  for update;
  if compact_record.id is null then
    raise exception using errcode = 'P0002', message = 'The requested compact does not exist.';
  end if;
  if compact_record.status <> 'active'
    or not compact_record.allocation_electorate_active
    or compact_record.allocation_electorate_key is distinct from p_electorate_key
  then
    raise exception using errcode = '23514', message = 'Delegation is available only for the active compact allocation electorate.';
  end if;

  select * into delegator_record
  from public.mpgf_public_goods_compact_memberships
  where compact_id = compact_record.id and user_id = viewer_id and status = 'active'
  for update;
  if delegator_record.id is null then
    raise exception using errcode = '42501', message = 'Only an active member may delegate this compact voting credit.';
  end if;

  select * into delegatee_record
  from public.mpgf_public_goods_compact_memberships
  where id = p_delegatee_membership_id
    and compact_id = compact_record.id
    and status = 'active'
  for update;
  if delegatee_record.id is null then
    raise exception using errcode = '23503', message = 'The delegate must be an active member of the same compact.';
  end if;
  if delegatee_record.id = delegator_record.id then
    raise exception using errcode = '23514', message = 'Self-delegation is not allowed.';
  end if;

  update public.mpgf_public_goods_compact_delegations
  set status = 'revoked', revoked_at = action_at
  where compact_id = compact_record.id
    and electorate_key = p_electorate_key
    and delegator_membership_id = delegator_record.id
    and status = 'active';

  insert into public.mpgf_public_goods_compact_delegations (
    compact_id,
    electorate_key,
    delegator_membership_id,
    delegatee_membership_id,
    created_by,
    status,
    created_at
  ) values (
    compact_record.id,
    p_electorate_key,
    delegator_record.id,
    delegatee_record.id,
    viewer_id,
    'active',
    action_at
  ) returning * into delegation_record;

  response_json := pg_catalog.jsonb_build_object(
    'ok', true,
    'delegationId', delegation_record.id::text,
    'compactPublicKey', p_compact_public_key,
    'electorateKey', p_electorate_key,
    'delegateeMembershipId', delegatee_record.id::text,
    'revocable', true,
    'membershipTransferred', false,
    'moneyTransferred', false,
    'reputationTransferred', false
  );
  perform public.mpgf_public_goods_compact_idempotency_store(
    viewer_id,
    'set_delegation',
    p_idempotency_key,
    request_hash,
    response_json
  );
  return response_json;
end;
$function$;

create or replace function public.clear_mpgf_public_goods_compact_delegation(
  p_compact_public_key text,
  p_electorate_key text,
  p_idempotency_key text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  viewer_id uuid := auth.uid();
  compact_record public.mpgf_public_goods_compacts%rowtype;
  delegator_record public.mpgf_public_goods_compact_memberships%rowtype;
  delegation_record public.mpgf_public_goods_compact_delegations%rowtype;
  request_hash text;
  prior_response jsonb;
  response_json jsonb;
  action_at timestamptz := pg_catalog.statement_timestamp();
begin
  if viewer_id is null then
    raise exception using errcode = '42501', message = 'Authentication is required to revoke a compact delegation.';
  end if;

  request_hash := pg_catalog.encode(
    extensions.digest(p_compact_public_key || '|' || coalesce(p_electorate_key, ''), 'sha256'),
    'hex'
  );
  prior_response := public.mpgf_public_goods_compact_idempotency_lookup(
    viewer_id,
    'clear_delegation',
    p_idempotency_key,
    request_hash
  );
  if prior_response is not null then
    return prior_response;
  end if;

  select * into compact_record
  from public.mpgf_public_goods_compacts
  where public_key = p_compact_public_key;
  if compact_record.id is null then
    raise exception using errcode = 'P0002', message = 'The requested compact does not exist.';
  end if;

  select * into delegator_record
  from public.mpgf_public_goods_compact_memberships
  where compact_id = compact_record.id and user_id = viewer_id
  for update;
  if delegator_record.id is null then
    raise exception using errcode = '42501', message = 'No compact membership exists for this profile.';
  end if;

  update public.mpgf_public_goods_compact_delegations
  set status = 'revoked', revoked_at = action_at
  where compact_id = compact_record.id
    and electorate_key = p_electorate_key
    and delegator_membership_id = delegator_record.id
    and status = 'active'
  returning * into delegation_record;
  if delegation_record.id is null then
    raise exception using errcode = 'P0002', message = 'No active delegation exists for this electorate.';
  end if;

  response_json := pg_catalog.jsonb_build_object(
    'ok', true,
    'delegationId', delegation_record.id::text,
    'compactPublicKey', p_compact_public_key,
    'electorateKey', p_electorate_key,
    'revoked', true,
    'membershipTransferred', false,
    'moneyTransferred', false,
    'reputationTransferred', false
  );
  perform public.mpgf_public_goods_compact_idempotency_store(
    viewer_id,
    'clear_delegation',
    p_idempotency_key,
    request_hash,
    response_json
  );
  return response_json;
end;
$function$;

revoke all on function public.mpgf_public_goods_compact_set_updated_at() from public, anon, authenticated;
revoke all on function public.mpgf_public_goods_compact_enforce_constitution_freeze() from public, anon, authenticated;
revoke all on function public.mpgf_public_goods_compact_idempotency_lookup(uuid, text, text, text) from public, anon, authenticated;
revoke all on function public.mpgf_public_goods_compact_idempotency_store(uuid, text, text, text, jsonb) from public, anon, authenticated;
revoke all on function public.get_mpgf_public_goods_compacts_state() from public, anon, authenticated;
revoke all on function public.join_mpgf_public_goods_compact(text, text, bigint, jsonb, text) from public, anon, authenticated;
revoke all on function public.request_mpgf_public_goods_compact_exit(text, text) from public, anon, authenticated;
revoke all on function public.set_mpgf_public_goods_compact_delegation(text, text, uuid, text) from public, anon, authenticated;
revoke all on function public.clear_mpgf_public_goods_compact_delegation(text, text, text) from public, anon, authenticated;

grant execute on function public.get_mpgf_public_goods_compacts_state() to anon, authenticated;
grant execute on function public.join_mpgf_public_goods_compact(text, text, bigint, jsonb, text) to authenticated;
grant execute on function public.request_mpgf_public_goods_compact_exit(text, text) to authenticated;
grant execute on function public.set_mpgf_public_goods_compact_delegation(text, text, uuid, text) to authenticated;
grant execute on function public.clear_mpgf_public_goods_compact_delegation(text, text, text) to authenticated;

insert into public.mpgf_public_goods_compacts (
  id,
  public_key,
  cause_key,
  title,
  summary,
  display_order,
  constitution_version,
  constitution_published_at,
  project_selection_rule,
  audit_rule
) values
  (
    '10000000-0000-4000-8000-000000000001',
    'future-flourishing',
    'future_flourishing',
    'Future Flourishing',
    'Long-horizon public goods that protect the conditions for future people to flourish.',
    1,
    'mpgf-public-goods-compact/founding-v1',
    '2026-08-13T00:00:00Z',
    'one_member_one_credit_with_revocable_delegation',
    'independent_review_additionality_conflicts_minority_reporting_required'
  ),
  (
    '10000000-0000-4000-8000-000000000002',
    'animal-welfare',
    'animal_welfare',
    'Animal Welfare',
    'Evidence-led public goods that reduce severe animal suffering and improve welfare systems.',
    2,
    'mpgf-public-goods-compact/founding-v1',
    '2026-08-13T00:00:00Z',
    'one_member_one_credit_with_revocable_delegation',
    'independent_review_additionality_conflicts_minority_reporting_required'
  ),
  (
    '10000000-0000-4000-8000-000000000003',
    'global-health',
    'global_health',
    'Global Health',
    'Shared health interventions and institutional capacity with independently reviewed evidence.',
    3,
    'mpgf-public-goods-compact/founding-v1',
    '2026-08-13T00:00:00Z',
    'one_member_one_credit_with_revocable_delegation',
    'independent_review_additionality_conflicts_minority_reporting_required'
  );

commit;
