begin;

create or replace function public.impact_accounting_user_fingerprint(p_user_id uuid)
returns text
language sql
immutable
set search_path = public, extensions
as $$
  select case
    when p_user_id is null then null
    else 'sha256:' || encode(digest(convert_to(p_user_id::text, 'UTF8'), 'sha256'), 'hex')
  end;
$$;

alter table public.impact_model_approval_events
  add column if not exists approver_user_fingerprint text;
update public.impact_model_approval_events
set approver_user_fingerprint = public.impact_accounting_user_fingerprint(approver_user_id)
where approver_user_fingerprint is null;
alter table public.impact_model_approval_events
  alter column approver_user_fingerprint set not null;
alter table public.impact_model_approval_events
  alter column approver_user_id drop not null;
alter table public.impact_model_approval_events
  drop constraint if exists impact_model_approval_events_approver_user_id_fkey;
alter table public.impact_model_approval_events
  add constraint impact_model_approval_events_approver_user_id_fkey
  foreign key (approver_user_id) references auth.users(id) on delete set null;
alter table public.impact_model_approval_events
  add constraint impact_model_approval_events_approver_fingerprint_check
  check (approver_user_fingerprint ~ '^sha256:[a-f0-9]{64}$');

alter table public.impact_model_approver_events
  add column if not exists approver_user_fingerprint text;
update public.impact_model_approver_events
set approver_user_fingerprint = public.impact_accounting_user_fingerprint(approver_user_id)
where approver_user_fingerprint is null;
alter table public.impact_model_approver_events
  alter column approver_user_fingerprint set not null;
alter table public.impact_model_approver_events
  alter column approver_user_id drop not null;
alter table public.impact_model_approver_events
  drop constraint if exists impact_model_approver_events_approver_user_id_fkey;
alter table public.impact_model_approver_events
  add constraint impact_model_approver_events_approver_user_id_fkey
  foreign key (approver_user_id) references auth.users(id) on delete set null;
alter table public.impact_model_approver_events
  drop constraint if exists impact_model_approver_events_type_check;
alter table public.impact_model_approver_events
  add constraint impact_model_approver_events_type_check check (
    event_type in ('granted','revoked','reactivated','details_updated','account_deleted')
  );
alter table public.impact_model_approver_events
  add constraint impact_model_approver_events_fingerprint_check
  check (approver_user_fingerprint ~ '^sha256:[a-f0-9]{64}$');

create index if not exists impact_model_approval_events_approver_fingerprint_idx
  on public.impact_model_approval_events (approver_user_fingerprint, created_at desc);
create index if not exists impact_model_approver_events_fingerprint_idx
  on public.impact_model_approver_events (approver_user_fingerprint, created_at desc);

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
begin
  if not public.is_impact_model_approver(true) then
    raise exception 'AAL2 impact-model approver authorization required' using errcode = '42501';
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
  select * into model_row
  from public.impact_model_versions
  where id = p_model_version_id
  for update;
  if not found then
    raise exception 'Impact model version not found' using errcode = 'P0002';
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
    nullif(btrim(p_notes), '')
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

create or replace function public.impact_accounting_log_approver_change()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  event_name text;
  actor_id uuid;
  subject_id uuid;
  subject_fingerprint text;
  event_active boolean;
  event_note text;
begin
  actor_id := auth.uid();

  if tg_op = 'DELETE' then
    event_name := 'account_deleted';
    subject_id := null;
    subject_fingerprint := public.impact_accounting_user_fingerprint(old.user_id);
    event_active := false;
    event_note := old.note;
  else
    subject_id := new.user_id;
    subject_fingerprint := public.impact_accounting_user_fingerprint(new.user_id);
    event_active := new.active;
    event_note := new.note;
    actor_id := coalesce(actor_id, new.granted_by);

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
  end if;

  insert into public.impact_model_approver_events (
    approver_user_id,
    approver_user_fingerprint,
    event_type,
    active,
    actor_user_id,
    note
  ) values (
    subject_id,
    subject_fingerprint,
    event_name,
    event_active,
    actor_id,
    event_note
  );

  return case when tg_op = 'DELETE' then old else new end;
end;
$$;

comment on column public.impact_model_approval_events.approver_user_fingerprint is
  'Immutable pseudonymous reviewer identifier retained when the auth account is deleted.';
comment on column public.impact_model_approver_events.approver_user_fingerprint is
  'Immutable pseudonymous approval-authority identifier retained when the auth account is deleted.';
comment on function public.impact_accounting_user_fingerprint(uuid) is
  'One-way stable UUID fingerprint used only to preserve governance audit continuity after account deletion.';

revoke all on function public.impact_accounting_user_fingerprint(uuid)
  from public, anon, authenticated, service_role;

commit;
