begin;

-- Present-stage governance deliberately uses the authenticated, explicitly allowlisted
-- founder account without requiring MFA. The optional require_aal2 argument is retained
-- so a later high-leverage security migration can re-enable AAL2 without changing the
-- approver roster or audit model.
create or replace function public.is_impact_model_approver(require_aal2 boolean default false)
returns boolean
language sql
stable
security definer
set search_path = public, auth
as $$
  select auth.uid() is not null
    and exists (
      select 1
      from public.impact_model_approvers approver
      where approver.user_id = auth.uid()
        and approver.active
    )
    and (
      not require_aal2
      or coalesce(auth.jwt() ->> 'aal', 'aal1') = 'aal2'
    );
$$;

create or replace function public.submit_impact_model_version_for_review(p_model_version_id uuid)
returns public.impact_model_versions
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  model_row public.impact_model_versions%rowtype;
begin
  if not public.is_impact_model_approver(false) then
    raise exception 'Authenticated impact-model approver authorization required' using errcode = '42501';
  end if;

  select * into model_row
  from public.impact_model_versions
  where id = p_model_version_id
  for update;

  if not found then
    raise exception 'Impact model version not found' using errcode = 'P0002';
  end if;

  if model_row.lifecycle_status = 'under_review' then
    return model_row;
  end if;

  if model_row.lifecycle_status <> 'draft' then
    raise exception 'Only draft impact models can enter review' using errcode = '23514';
  end if;
  if cardinality(model_row.approval_blockers) <> 0 then
    raise exception 'Impact methodology still has approval blockers' using errcode = '23514';
  end if;

  perform public.impact_accounting_assert_methodology_for_review(
    model_row.methodology,
    model_row.mechanism_family,
    model_row.model_key
  );

  update public.impact_model_versions
  set lifecycle_status = 'under_review', submitted_at = now()
  where id = model_row.id
  returning * into model_row;

  return model_row;
end;
$$;

create or replace function public.review_impact_model_version(
  p_model_version_id uuid,
  p_decision text,
  p_notes text default null
)
returns public.impact_model_versions
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  model_row public.impact_model_versions%rowtype;
  is_material boolean;
  reviewer_id uuid;
  normalized_notes text;
begin
  if not public.is_impact_model_approver(false) then
    raise exception 'Authenticated impact-model approver authorization required' using errcode = '42501';
  end if;

  reviewer_id := auth.uid();
  if reviewer_id is null then
    raise exception 'Authenticated impact-model approver identity required' using errcode = '42501';
  end if;
  if p_decision not in ('approve','reject') then
    raise exception 'Decision must be approve or reject' using errcode = '22023';
  end if;
  if p_notes is not null and char_length(p_notes) > 5000 then
    raise exception 'Review notes exceed 5000 characters' using errcode = '22001';
  end if;

  normalized_notes := nullif(btrim(p_notes), '');

  select * into model_row
  from public.impact_model_versions
  where id = p_model_version_id
  for update;

  if not found then
    raise exception 'Impact model version not found' using errcode = 'P0002';
  end if;

  if (
    (p_decision = 'approve' and model_row.lifecycle_status = 'approved')
    or (p_decision = 'reject' and model_row.lifecycle_status = 'draft')
  ) and exists (
    select 1
    from public.impact_model_approval_events approval
    where approval.model_version_id = model_row.id
      and approval.approver_user_id = reviewer_id
      and approval.decision = p_decision
      and approval.methodology_hash = model_row.methodology_hash
      and approval.notes is not distinct from normalized_notes
  ) then
    return model_row;
  end if;

  if model_row.lifecycle_status <> 'under_review' then
    raise exception 'Impact model must be under review' using errcode = '23514';
  end if;
  if cardinality(model_row.approval_blockers) <> 0 then
    raise exception 'Impact methodology still has approval blockers' using errcode = '23514';
  end if;

  perform public.impact_accounting_assert_methodology_for_review(
    model_row.methodology,
    model_row.mechanism_family,
    model_row.model_key
  );

  is_material := model_row.material_change_from is not null;
  insert into public.impact_model_approval_events (
    model_version_id,
    approver_user_id,
    approver_user_fingerprint,
    decision,
    methodology_hash,
    material_methodology_change,
    notes
  ) values (
    model_row.id,
    reviewer_id,
    public.impact_accounting_user_fingerprint(reviewer_id),
    p_decision,
    model_row.methodology_hash,
    is_material,
    normalized_notes
  );

  if p_decision = 'approve' then
    update public.impact_model_versions
    set lifecycle_status = 'approved', approved_at = now()
    where id = model_row.id
    returning * into model_row;
  else
    update public.impact_model_versions
    set lifecycle_status = 'draft', submitted_at = null
    where id = model_row.id
    returning * into model_row;
  end if;

  return model_row;
end;
$$;

create or replace function public.activate_impact_model_version(p_model_version_id uuid)
returns public.impact_model_versions
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  model_row public.impact_model_versions%rowtype;
begin
  if not public.is_impact_model_approver(false) then
    raise exception 'Authenticated impact-model approver authorization required' using errcode = '42501';
  end if;

  select * into model_row
  from public.impact_model_versions
  where id = p_model_version_id
  for update;

  if not found then
    raise exception 'Impact model version not found' using errcode = 'P0002';
  end if;

  if model_row.lifecycle_status = 'active' then
    if not public.impact_model_has_current_passing_health(model_row.id) then
      raise exception 'A current passing model-health snapshot is required for an active model' using errcode = '23514';
    end if;
    return model_row;
  end if;

  if model_row.lifecycle_status not in ('approved','inactive') then
    raise exception 'Only approved or inactive impact models can be activated' using errcode = '23514';
  end if;
  if not exists (
    select 1
    from public.impact_model_approval_events approval
    where approval.model_version_id = model_row.id
      and approval.decision = 'approve'
      and approval.methodology_hash = model_row.methodology_hash
  ) then
    raise exception 'Matching founder approval event is required' using errcode = '23514';
  end if;
  if not public.impact_model_has_current_passing_health(model_row.id) then
    raise exception 'A current passing model-health snapshot is required before activation' using errcode = '23514';
  end if;

  update public.impact_model_versions
  set lifecycle_status = 'superseded', superseded_at = now()
  where mechanism_family = model_row.mechanism_family
    and lifecycle_status = 'active'
    and id <> model_row.id;

  update public.impact_model_versions
  set lifecycle_status = 'active', activated_at = coalesce(activated_at, now())
  where id = model_row.id
  returning * into model_row;

  return model_row;
end;
$$;

revoke all on function public.is_impact_model_approver(boolean) from public, anon;
revoke all on function public.submit_impact_model_version_for_review(uuid) from public, anon;
revoke all on function public.review_impact_model_version(uuid,text,text) from public, anon;
revoke all on function public.activate_impact_model_version(uuid) from public, anon;

grant execute on function public.is_impact_model_approver(boolean) to authenticated, service_role;
grant execute on function public.submit_impact_model_version_for_review(uuid) to authenticated, service_role;
grant execute on function public.review_impact_model_version(uuid,text,text) to authenticated, service_role;
grant execute on function public.activate_impact_model_version(uuid) to authenticated, service_role;

comment on function public.is_impact_model_approver(boolean) is
  'Checks authenticated active approval authority. AAL2 can be requested explicitly later, but is not required during the present pre-high-leverage stage.';
comment on function public.submit_impact_model_version_for_review(uuid) is
  'Authenticated allowlisted approver submission. Exact methodology validation and idempotency remain enforced; present-stage MFA is not required.';
comment on function public.review_impact_model_version(uuid,text,text) is
  'Authenticated allowlisted approver exact-hash decision recording. Present-stage MFA is not required; audit identity and idempotency remain enforced.';
comment on function public.activate_impact_model_version(uuid) is
  'Authenticated allowlisted approver activation with exact-hash approval and current model-health gates. Present-stage MFA is not required.';
comment on table public.impact_model_versions is
  'Versioned impact methodologies. No model may become active without an authenticated allowlisted approver event for the exact methodology hash and a current passing health record.';

commit;
