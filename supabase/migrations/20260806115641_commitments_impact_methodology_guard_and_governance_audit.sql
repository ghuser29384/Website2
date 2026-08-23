begin;

create or replace function public.impact_accounting_nonplaceholder_text(p_value text)
returns boolean
language sql
immutable
set search_path = public
as $$
  select coalesce(btrim(p_value), '') <> ''
    and btrim(p_value) !~* '\[(required|replace|todo)[^]]*\]';
$$;

create or replace function public.impact_accounting_nonempty_string_array(p_value jsonb)
returns boolean
language sql
immutable
set search_path = public
as $$
  select jsonb_typeof(p_value) = 'array'
    and jsonb_array_length(p_value) > 0
    and not exists (
      select 1
      from jsonb_array_elements(p_value) entry
      where jsonb_typeof(entry) <> 'string'
        or not public.impact_accounting_nonplaceholder_text(entry #>> '{}')
    );
$$;

create or replace function public.impact_accounting_assert_methodology_shape(
  p_methodology jsonb,
  p_mechanism_family text,
  p_model_key text
)
returns void
language plpgsql
immutable
set search_path = public
as $$
begin
  if jsonb_typeof(p_methodology) <> 'object' then
    raise exception 'Impact methodology must be a JSON object' using errcode = '23514';
  end if;
  if p_methodology ->> 'schemaVersion' <> 'moral-trade-impact-model-methodology-v1' then
    raise exception 'Impact methodology schema version is invalid' using errcode = '23514';
  end if;
  if p_methodology ->> 'mechanismFamily' <> p_mechanism_family then
    raise exception 'Impact methodology mechanism family must match its model row' using errcode = '23514';
  end if;
  if p_methodology ->> 'modelKey' <> p_model_key then
    raise exception 'Impact methodology model key must match its model row' using errcode = '23514';
  end if;

  if jsonb_typeof(p_methodology -> 'displayName') <> 'string'
    or jsonb_typeof(p_methodology -> 'estimands') <> 'array'
    or jsonb_typeof(p_methodology -> 'estimandDefinitions') <> 'object'
    or jsonb_typeof(p_methodology -> 'baselineDefinition') <> 'string'
    or jsonb_typeof(p_methodology -> 'algorithmDescription') <> 'string'
    or jsonb_typeof(p_methodology -> 'referenceClassPolicy') <> 'object'
    or jsonb_typeof(p_methodology -> 'uncertaintyPolicy') <> 'object'
    or jsonb_typeof(p_methodology -> 'freshnessPolicy') <> 'object'
    or jsonb_typeof(p_methodology -> 'healthPolicy') <> 'object'
    or jsonb_typeof(p_methodology -> 'sourceDataRequirements') <> 'array'
    or jsonb_typeof(p_methodology -> 'calibrationEvidenceRefs') <> 'array'
    or jsonb_typeof(p_methodology -> 'knownFailureModes') <> 'array'
    or jsonb_typeof(p_methodology -> 'outOfDomainConditions') <> 'array'
    or jsonb_typeof(p_methodology -> 'materialChangeTriggers') <> 'array'
    or jsonb_typeof(p_methodology -> 'aggregationPolicy') <> 'object'
    or jsonb_typeof(p_methodology -> 'shapleyPolicy') <> 'object'
    or jsonb_typeof(p_methodology -> 'parameters') <> 'object'
  then
    raise exception 'Impact methodology payload shape is incomplete' using errcode = '23514';
  end if;
end;
$$;

create or replace function public.impact_accounting_assert_methodology_for_review(
  p_methodology jsonb,
  p_mechanism_family text,
  p_model_key text
)
returns void
language plpgsql
immutable
set search_path = public
as $$
declare
  estimand jsonb;
  reference_policy jsonb;
  uncertainty_policy jsonb;
  freshness_policy jsonb;
  health_policy jsonb;
  aggregation_policy jsonb;
  shapley_policy jsonb;
  exact_player_limit numeric;
begin
  perform public.impact_accounting_assert_methodology_shape(
    p_methodology,
    p_mechanism_family,
    p_model_key
  );

  if not public.impact_accounting_nonplaceholder_text(p_methodology ->> 'displayName')
    or not public.impact_accounting_nonplaceholder_text(p_methodology ->> 'baselineDefinition')
    or not public.impact_accounting_nonplaceholder_text(p_methodology ->> 'algorithmDescription')
  then
    raise exception 'Impact methodology identity, baseline, and algorithm must be complete before review'
      using errcode = '23514';
  end if;

  if jsonb_array_length(p_methodology -> 'estimands') = 0 then
    raise exception 'Impact methodology requires at least one estimand' using errcode = '23514';
  end if;
  for estimand in select value from jsonb_array_elements(p_methodology -> 'estimands')
  loop
    if jsonb_typeof(estimand) <> 'string'
      or estimand #>> '{}' not in (
        'success_case_additional','expected_additional','direct_causal_attribution',
        'verified_additional','cooperative_allocation','value_adjusted',
        'baseline_redirected','platform_funded_bonus'
      )
      or not public.impact_accounting_nonplaceholder_text(
        p_methodology #>> array['estimandDefinitions', estimand #>> '{}']
      )
    then
      raise exception 'Every impact estimand requires a valid definition' using errcode = '23514';
    end if;
  end loop;

  reference_policy := p_methodology -> 'referenceClassPolicy';
  if reference_policy ->> 'strategy' <> 'hierarchical'
    or reference_policy ->> 'noDefensibleClassAction' <> 'withhold'
    or not public.impact_accounting_nonempty_string_array(reference_policy -> 'narrowFields')
    or not public.impact_accounting_nonempty_string_array(reference_policy -> 'broadeningOrder')
    or jsonb_typeof(reference_policy -> 'minimumSampleSize') <> 'number'
    or (reference_policy ->> 'minimumSampleSize')::numeric < 1
    or (reference_policy ->> 'minimumSampleSize')::numeric
      <> trunc((reference_policy ->> 'minimumSampleSize')::numeric)
    or not public.impact_accounting_nonplaceholder_text(
      reference_policy ->> 'uncertaintyExpansionRule'
    )
  then
    raise exception 'Hierarchical reference-class policy is incomplete' using errcode = '23514';
  end if;

  uncertainty_policy := p_methodology -> 'uncertaintyPolicy';
  if jsonb_typeof(uncertainty_policy -> 'intervalLevelBps') <> 'number'
    or (uncertainty_policy ->> 'intervalLevelBps')::numeric <> 8000
    or not public.impact_accounting_nonplaceholder_text(uncertainty_policy ->> 'method')
    or not public.impact_accounting_nonplaceholder_text(uncertainty_policy ->> 'confidencePolicy')
    or not public.impact_accounting_nonempty_string_array(uncertainty_policy -> 'drivers')
  then
    raise exception 'Impact uncertainty policy must specify the approved 80 percent interval and confidence rules'
      using errcode = '23514';
  end if;

  freshness_policy := p_methodology -> 'freshnessPolicy';
  if jsonb_typeof(freshness_policy -> 'maxAgeSeconds') <> 'number'
    or (freshness_policy ->> 'maxAgeSeconds')::numeric < 1
    or (freshness_policy ->> 'maxAgeSeconds')::numeric
      <> trunc((freshness_policy ->> 'maxAgeSeconds')::numeric)
    or freshness_policy -> 'requireStateHash' <> 'true'::jsonb
    or not public.impact_accounting_nonempty_string_array(freshness_policy -> 'requiredStateFields')
    or not public.impact_accounting_nonempty_string_array(freshness_policy -> 'invalidateOnLifecycleStates')
  then
    raise exception 'Impact freshness policy is incomplete' using errcode = '23514';
  end if;

  health_policy := p_methodology -> 'healthPolicy';
  if not public.impact_accounting_nonempty_string_array(health_policy -> 'requiredCalibrationMetrics')
    or not public.impact_accounting_nonempty_string_array(health_policy -> 'blockedConditions')
    or not public.impact_accounting_nonempty_string_array(health_policy -> 'warningConditions')
  then
    raise exception 'Impact model-health policy is incomplete' using errcode = '23514';
  end if;

  if not public.impact_accounting_nonempty_string_array(p_methodology -> 'sourceDataRequirements')
    or not public.impact_accounting_nonempty_string_array(p_methodology -> 'calibrationEvidenceRefs')
    or not public.impact_accounting_nonempty_string_array(p_methodology -> 'knownFailureModes')
    or not public.impact_accounting_nonempty_string_array(p_methodology -> 'outOfDomainConditions')
    or not public.impact_accounting_nonempty_string_array(p_methodology -> 'materialChangeTriggers')
  then
    raise exception 'Impact methodology evidence, failure, domain, and material-change documentation is incomplete'
      using errcode = '23514';
  end if;

  aggregation_policy := p_methodology -> 'aggregationPolicy';
  if aggregation_policy -> 'directAndCooperativeNeverSummed' <> 'true'::jsonb
    or aggregation_policy -> 'heterogeneousNativeUnitsRemainSeparate' <> 'true'::jsonb
    or not public.impact_accounting_nonplaceholder_text(aggregation_policy ->> 'overlapHandling')
  then
    raise exception 'Impact aggregation policy violates the approved accounting separation'
      using errcode = '23514';
  end if;

  shapley_policy := p_methodology -> 'shapleyPolicy';
  if jsonb_typeof(shapley_policy -> 'enabled') <> 'boolean' then
    raise exception 'Impact Shapley policy requires an enabled flag' using errcode = '23514';
  end if;
  if (shapley_policy ->> 'enabled')::boolean then
    if not public.impact_accounting_nonplaceholder_text(
      shapley_policy ->> 'characteristicFunctionDefinition'
    ) then
      raise exception 'Enabled cooperative allocation requires a characteristic function'
        using errcode = '23514';
    end if;

    if shapley_policy -> 'maximumExactPlayers' is not null
      and shapley_policy -> 'maximumExactPlayers' <> 'null'::jsonb
    then
      if jsonb_typeof(shapley_policy -> 'maximumExactPlayers') <> 'number' then
        raise exception 'Exact Shapley player limit must be numeric' using errcode = '23514';
      end if;
      exact_player_limit := (shapley_policy ->> 'maximumExactPlayers')::numeric;
      if exact_player_limit < 1 or exact_player_limit > 15
        or exact_player_limit <> trunc(exact_player_limit)
      then
        raise exception 'Exact Shapley player limit must be an integer from 1 through 15'
          using errcode = '23514';
      end if;
    elsif not public.impact_accounting_nonplaceholder_text(
      shapley_policy ->> 'approximationMethod'
    ) then
      raise exception 'Enabled cooperative allocation requires an approved execution policy'
        using errcode = '23514';
    end if;
  end if;
end;
$$;

create or replace function public.impact_accounting_validate_model_version()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  perform public.impact_accounting_assert_methodology_shape(
    new.methodology,
    new.mechanism_family,
    new.model_key
  );

  if new.lifecycle_status <> 'draft' then
    perform public.impact_accounting_assert_methodology_for_review(
      new.methodology,
      new.mechanism_family,
      new.model_key
    );
    if cardinality(new.approval_blockers) <> 0 then
      raise exception 'Non-draft impact methodologies cannot retain approval blockers'
        using errcode = '23514';
    end if;
  end if;

  return new;
end;
$$;

create or replace function public.impact_accounting_guard_model_version_update()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  transition_allowed boolean;
begin
  if new.id <> old.id
    or new.mechanism_family <> old.mechanism_family
    or new.model_key <> old.model_key
    or new.version <> old.version
    or new.created_at <> old.created_at
    or new.created_by is distinct from old.created_by
  then
    raise exception 'Impact model identity is immutable' using errcode = '55000';
  end if;

  if old.lifecycle_status in ('approved','active','inactive','superseded')
    and (
      new.methodology is distinct from old.methodology
      or new.methodology_hash <> old.methodology_hash
      or new.approval_blockers is distinct from old.approval_blockers
      or new.material_change_from is distinct from old.material_change_from
    )
  then
    raise exception 'Approved impact methodology is immutable; create a new version' using errcode = '55000';
  end if;

  transition_allowed := case old.lifecycle_status
    when 'draft' then new.lifecycle_status in ('draft','under_review')
    when 'under_review' then new.lifecycle_status in ('under_review','draft','approved')
    when 'approved' then new.lifecycle_status in ('approved','active','inactive','superseded')
    when 'active' then new.lifecycle_status in ('active','inactive','superseded')
    when 'inactive' then new.lifecycle_status in ('inactive','active','superseded')
    when 'superseded' then new.lifecycle_status = 'superseded'
    else false
  end;

  if not transition_allowed then
    raise exception 'Invalid impact model lifecycle transition: % -> %',
      old.lifecycle_status, new.lifecycle_status using errcode = '23514';
  end if;

  if new.lifecycle_status = 'under_review'
    and old.lifecycle_status <> 'under_review'
  then
    perform public.impact_accounting_assert_methodology_for_review(
      new.methodology,
      new.mechanism_family,
      new.model_key
    );
    if cardinality(new.approval_blockers) <> 0 then
      raise exception 'Impact methodology still has approval blockers' using errcode = '23514';
    end if;
  end if;

  new.updated_at := now();
  return new;
end;
$$;

create table if not exists public.impact_model_approver_events (
  id uuid primary key default gen_random_uuid(),
  approver_user_id uuid not null references auth.users(id) on delete restrict,
  event_type text not null,
  active boolean not null,
  actor_user_id uuid references auth.users(id) on delete set null,
  note text,
  created_at timestamptz not null default now(),
  constraint impact_model_approver_events_type_check check (
    event_type in ('granted','revoked','reactivated','details_updated')
  ),
  constraint impact_model_approver_events_note_length check (
    note is null or char_length(note) <= 1000
  )
);
create index if not exists impact_model_approver_events_approver_idx
  on public.impact_model_approver_events (approver_user_id, created_at desc);
create index if not exists impact_model_approver_events_actor_idx
  on public.impact_model_approver_events (actor_user_id, created_at desc)
  where actor_user_id is not null;

create table if not exists public.impact_model_lifecycle_events (
  id uuid primary key default gen_random_uuid(),
  model_version_id uuid not null references public.impact_model_versions(id) on delete restrict,
  from_status text,
  to_status text not null,
  methodology_hash text not null,
  actor_user_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  constraint impact_model_lifecycle_events_from_status_check check (
    from_status is null or from_status in ('draft','under_review','approved','active','inactive','superseded')
  ),
  constraint impact_model_lifecycle_events_to_status_check check (
    to_status in ('draft','under_review','approved','active','inactive','superseded')
  ),
  constraint impact_model_lifecycle_events_hash_check check (
    methodology_hash ~ '^sha256:[a-f0-9]{64}$'
  )
);
create index if not exists impact_model_lifecycle_events_model_idx
  on public.impact_model_lifecycle_events (model_version_id, created_at);
create index if not exists impact_model_lifecycle_events_actor_idx
  on public.impact_model_lifecycle_events (actor_user_id, created_at desc)
  where actor_user_id is not null;

create or replace function public.impact_accounting_log_approver_change()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  event_name text;
  actor_id uuid;
begin
  if tg_op = 'DELETE' then
    raise exception 'Impact model approvers must be revoked, not deleted' using errcode = '55000';
  end if;

  actor_id := coalesce(auth.uid(), new.granted_by);
  if tg_op = 'INSERT' then
    event_name := case when new.active then 'granted' else 'revoked' end;
  elsif old.active and not new.active then
    event_name := 'revoked';
  elsif not old.active and new.active then
    event_name := 'reactivated';
  elsif old.note is distinct from new.note
    or old.granted_by is distinct from new.granted_by
  then
    event_name := 'details_updated';
  else
    return new;
  end if;

  insert into public.impact_model_approver_events (
    approver_user_id,
    event_type,
    active,
    actor_user_id,
    note
  ) values (
    new.user_id,
    event_name,
    new.active,
    actor_id,
    new.note
  );
  return new;
end;
$$;

create or replace function public.impact_accounting_log_model_lifecycle()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  if tg_op = 'INSERT' or old.lifecycle_status is distinct from new.lifecycle_status then
    insert into public.impact_model_lifecycle_events (
      model_version_id,
      from_status,
      to_status,
      methodology_hash,
      actor_user_id
    ) values (
      new.id,
      case when tg_op = 'INSERT' then null else old.lifecycle_status end,
      new.lifecycle_status,
      new.methodology_hash,
      auth.uid()
    );
  end if;
  return new;
end;
$$;

create or replace function public.set_impact_model_approver(
  p_user_id uuid,
  p_active boolean,
  p_note text default null,
  p_actor_user_id uuid default null
)
returns public.impact_model_approvers
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  approver public.impact_model_approvers%rowtype;
begin
  if coalesce(auth.role(), '') <> 'service_role' then
    raise exception 'Service role required to configure impact-model approvers'
      using errcode = '42501';
  end if;
  if p_user_id is null then
    raise exception 'Impact-model approver user id is required' using errcode = '22023';
  end if;
  if p_note is not null and char_length(p_note) > 1000 then
    raise exception 'Impact-model approver note exceeds 1000 characters' using errcode = '22001';
  end if;
  if not exists (select 1 from auth.users where id = p_user_id) then
    raise exception 'Impact-model approver user does not exist' using errcode = '23503';
  end if;
  if p_actor_user_id is not null
    and not exists (select 1 from auth.users where id = p_actor_user_id)
  then
    raise exception 'Impact-model approver actor does not exist' using errcode = '23503';
  end if;

  select * into approver
  from public.impact_model_approvers
  where user_id = p_user_id
  for update;

  if not found and not p_active then
    raise exception 'A new impact-model approver must be granted before being revoked'
      using errcode = '23514';
  end if;

  if found then
    update public.impact_model_approvers
    set active = p_active,
        granted_at = case when not approver.active and p_active then now() else granted_at end,
        granted_by = coalesce(p_actor_user_id, granted_by),
        note = nullif(btrim(p_note), '')
    where user_id = p_user_id
    returning * into approver;
  else
    insert into public.impact_model_approvers (
      user_id,
      active,
      granted_at,
      granted_by,
      note
    ) values (
      p_user_id,
      true,
      now(),
      p_actor_user_id,
      nullif(btrim(p_note), '')
    ) returning * into approver;
  end if;

  return approver;
end;
$$;

drop trigger if exists impact_model_versions_validate on public.impact_model_versions;
create trigger impact_model_versions_validate
before insert or update of mechanism_family, model_key, lifecycle_status,
  methodology, methodology_hash, approval_blockers
on public.impact_model_versions
for each row execute function public.impact_accounting_validate_model_version();

drop trigger if exists impact_model_approvers_audit on public.impact_model_approvers;
create trigger impact_model_approvers_audit
after insert or update or delete on public.impact_model_approvers
for each row execute function public.impact_accounting_log_approver_change();

drop trigger if exists impact_model_versions_lifecycle_audit on public.impact_model_versions;
create trigger impact_model_versions_lifecycle_audit
after insert or update of lifecycle_status on public.impact_model_versions
for each row execute function public.impact_accounting_log_model_lifecycle();

alter table public.impact_model_approver_events enable row level security;
alter table public.impact_model_lifecycle_events enable row level security;

create policy impact_model_approver_events_select_approver
  on public.impact_model_approver_events
  for select to authenticated
  using (public.is_impact_model_approver(false));
create policy impact_model_lifecycle_events_select_approver
  on public.impact_model_lifecycle_events
  for select to authenticated
  using (public.is_impact_model_approver(false));

revoke all on table public.impact_model_approver_events from anon, authenticated;
revoke all on table public.impact_model_lifecycle_events from anon, authenticated;
grant select on table public.impact_model_approver_events to authenticated;
grant select on table public.impact_model_lifecycle_events to authenticated;
grant all on table public.impact_model_approver_events to service_role;
grant all on table public.impact_model_lifecycle_events to service_role;

revoke insert, update, delete on table public.impact_model_approvers from service_role;
grant select on table public.impact_model_approvers to service_role;

revoke all on function public.impact_accounting_nonplaceholder_text(text)
  from public, anon, authenticated, service_role;
revoke all on function public.impact_accounting_nonempty_string_array(jsonb)
  from public, anon, authenticated, service_role;
revoke all on function public.impact_accounting_assert_methodology_shape(jsonb,text,text)
  from public, anon, authenticated, service_role;
revoke all on function public.impact_accounting_assert_methodology_for_review(jsonb,text,text)
  from public, anon, authenticated, service_role;
revoke all on function public.impact_accounting_validate_model_version()
  from public, anon, authenticated, service_role;
revoke all on function public.impact_accounting_log_approver_change()
  from public, anon, authenticated, service_role;
revoke all on function public.impact_accounting_log_model_lifecycle()
  from public, anon, authenticated, service_role;
revoke all on function public.set_impact_model_approver(uuid,boolean,text,uuid)
  from public, anon, authenticated;
grant execute on function public.set_impact_model_approver(uuid,boolean,text,uuid)
  to service_role;

comment on function public.impact_accounting_assert_methodology_for_review(jsonb,text,text) is
  'Fail-closed database validation for founder-review-ready methodologies. It enforces approved accounting invariants but chooses no model parameters.';
comment on table public.impact_model_approver_events is
  'Append-only history of impact-model approval authority grants, revocations, and reactivations.';
comment on table public.impact_model_lifecycle_events is
  'Append-only history of every impact-model lifecycle transition and exact methodology hash.';
comment on function public.set_impact_model_approver(uuid,boolean,text,uuid) is
  'Service-role-only approver bootstrap and revocation. No user is granted authority automatically.';

commit;
