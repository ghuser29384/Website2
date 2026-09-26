begin;

alter table public.impact_estimate_snapshots
  alter column generated_at set default clock_timestamp();

create or replace function public.publish_impact_estimate_snapshot(
  p_participant_user_id uuid,
  p_subject_ref text,
  p_mechanism_family text,
  p_model_version_id uuid,
  p_methodology_hash text,
  p_input_state_hash text,
  p_state_as_of timestamptz,
  p_expires_at timestamptz,
  p_snapshot jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  prior_snapshot_id uuid;
  inserted_snapshot_id uuid;
  generation_time timestamptz;
begin
  if coalesce(auth.role(), '') <> 'service_role' then
    raise exception 'Service role required to publish impact estimates' using errcode = '42501';
  end if;

  generation_time := clock_timestamp();
  if p_state_as_of > generation_time then
    raise exception 'Impact snapshot state cannot be newer than publication time' using errcode = '23514';
  end if;
  if p_expires_at is not null and p_expires_at <= generation_time then
    raise exception 'Impact snapshot expiry must follow publication time' using errcode = '23514';
  end if;

  select id into prior_snapshot_id
  from public.impact_estimate_snapshots
  where participant_user_id = p_participant_user_id
    and subject_ref = p_subject_ref
    and publication_status = 'current'
  for update;

  if prior_snapshot_id is not null then
    update public.impact_estimate_snapshots
    set publication_status = 'superseded'
    where id = prior_snapshot_id;

    insert into public.impact_estimate_audit_events (
      snapshot_id,
      event_type,
      detail,
      created_at
    ) values (
      prior_snapshot_id,
      'superseded',
      jsonb_build_object('reason', 'replacement_snapshot'),
      generation_time
    );
  end if;

  insert into public.impact_estimate_snapshots (
    participant_user_id,
    subject_ref,
    mechanism_family,
    model_version_id,
    methodology_hash,
    input_state_hash,
    state_as_of,
    generated_at,
    expires_at,
    health_status,
    publication_status,
    snapshot,
    supersedes_snapshot_id
  ) values (
    p_participant_user_id,
    p_subject_ref,
    p_mechanism_family,
    p_model_version_id,
    p_methodology_hash,
    p_input_state_hash,
    p_state_as_of,
    generation_time,
    p_expires_at,
    p_snapshot #>> '{health,status}',
    'current',
    p_snapshot,
    prior_snapshot_id
  ) returning id into inserted_snapshot_id;

  insert into public.impact_estimate_audit_events (
    snapshot_id,
    event_type,
    detail,
    created_at
  ) values (
    inserted_snapshot_id,
    'published',
    jsonb_build_object(
      'modelVersionId', p_model_version_id,
      'inputStateHash', p_input_state_hash
    ),
    generation_time
  );

  return inserted_snapshot_id;
end;
$$;

comment on column public.impact_estimate_snapshots.generated_at is
  'Wall-clock generation time. clock_timestamp is used so long-running transactions cannot predate the state being estimated.';
comment on function public.publish_impact_estimate_snapshot(uuid,text,text,uuid,text,text,timestamptz,timestamptz,jsonb) is
  'Service-role-only atomic publication using one wall-clock generation timestamp for state validation, the immutable snapshot row, and its audit event.';

commit;
