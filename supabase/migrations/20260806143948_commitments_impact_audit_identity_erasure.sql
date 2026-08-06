begin;

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
  then
    raise exception 'Impact model identity is immutable' using errcode = '55000';
  end if;

  if new.created_by is distinct from old.created_by
    and not (old.created_by is not null and new.created_by is null)
  then
    raise exception 'Impact model creator identity may only be erased after account deletion'
      using errcode = '55000';
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

create or replace function public.impact_accounting_guard_audit_identity_erasure()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  old_payload jsonb;
  new_payload jsonb;
  identity_column text;
  old_identity jsonb;
  new_identity jsonb;
  identity_erased boolean := false;
begin
  if tg_op = 'DELETE' then
    raise exception '% is append-only', tg_table_name using errcode = '55000';
  end if;

  old_payload := to_jsonb(old);
  new_payload := to_jsonb(new);

  foreach identity_column in array tg_argv
  loop
    old_identity := old_payload -> identity_column;
    new_identity := new_payload -> identity_column;

    if old_identity is distinct from new_identity then
      if old_identity is not null
        and old_identity <> 'null'::jsonb
        and new_identity = 'null'::jsonb
      then
        identity_erased := true;
      else
        raise exception '% identity field % may only change from a UUID to null after account deletion',
          tg_table_name, identity_column using errcode = '55000';
      end if;
    end if;

    old_payload := old_payload - identity_column;
    new_payload := new_payload - identity_column;
  end loop;

  if not identity_erased or old_payload is distinct from new_payload then
    raise exception '% is append-only except for deletion-driven identity erasure',
      tg_table_name using errcode = '55000';
  end if;

  return new;
end;
$$;

drop trigger if exists impact_model_approval_events_append_only
  on public.impact_model_approval_events;
create trigger impact_model_approval_events_append_only
before update or delete on public.impact_model_approval_events
for each row execute function public.impact_accounting_guard_audit_identity_erasure(
  'approver_user_id'
);

drop trigger if exists impact_model_approver_events_append_only
  on public.impact_model_approver_events;
create trigger impact_model_approver_events_append_only
before update or delete on public.impact_model_approver_events
for each row execute function public.impact_accounting_guard_audit_identity_erasure(
  'approver_user_id',
  'actor_user_id'
);

drop trigger if exists impact_model_lifecycle_events_append_only
  on public.impact_model_lifecycle_events;
create trigger impact_model_lifecycle_events_append_only
before update or delete on public.impact_model_lifecycle_events
for each row execute function public.impact_accounting_guard_audit_identity_erasure(
  'actor_user_id'
);

drop trigger if exists impact_estimate_audit_events_append_only
  on public.impact_estimate_audit_events;
create trigger impact_estimate_audit_events_append_only
before update or delete on public.impact_estimate_audit_events
for each row execute function public.impact_accounting_guard_audit_identity_erasure(
  'actor_user_id'
);

revoke all on function public.impact_accounting_guard_audit_identity_erasure()
  from public, anon, authenticated, service_role;

comment on function public.impact_accounting_guard_model_version_update() is
  'Preserves model identity and approved methodology while permitting only deletion-driven creator UUID erasure.';
comment on function public.impact_accounting_guard_audit_identity_erasure() is
  'Keeps governance and estimate audit rows append-only while permitting foreign-key identity UUIDs to become null when an auth account is deleted.';

commit;
