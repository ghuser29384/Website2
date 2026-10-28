begin;

create or replace function public.queue_impact_refresh_job(
  p_participant_user_id uuid,
  p_subject_ref text,
  p_mechanism_family text,
  p_reason text,
  p_not_before timestamptz default now()
)
returns uuid
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  existing_job public.impact_refresh_queue%rowtype;
  queued_job_id uuid;
begin
  if coalesce(auth.role(), '') <> 'service_role' then
    raise exception 'Service role required to queue impact refresh jobs' using errcode = '42501';
  end if;
  if p_participant_user_id is null then
    raise exception 'Participant user id is required' using errcode = '22023';
  end if;
  if p_subject_ref is null or char_length(btrim(p_subject_ref)) not between 3 and 240 then
    raise exception 'Subject reference is invalid' using errcode = '22023';
  end if;
  if p_mechanism_family not in (
    'trade','co_fund','threshold_funding','donation_upgrade','threshold_sign_on','donation_redirect'
  ) then
    raise exception 'Mechanism family is invalid' using errcode = '22023';
  end if;
  if p_reason is null or char_length(btrim(p_reason)) not between 3 and 240 then
    raise exception 'Refresh reason is invalid' using errcode = '22023';
  end if;

  select * into existing_job
  from public.impact_refresh_queue
  where participant_user_id = p_participant_user_id
    and subject_ref = btrim(p_subject_ref)
    and status in ('queued','running')
  for update;

  if found then
    if existing_job.status = 'queued' then
      update public.impact_refresh_queue
      set mechanism_family = p_mechanism_family,
          reason = btrim(p_reason),
          not_before = least(existing_job.not_before, coalesce(p_not_before, now())),
          requested_at = now(),
          last_error = null
      where id = existing_job.id;
    end if;
    return existing_job.id;
  end if;

  insert into public.impact_refresh_queue (
    participant_user_id,
    subject_ref,
    mechanism_family,
    reason,
    status,
    requested_at,
    not_before
  ) values (
    p_participant_user_id,
    btrim(p_subject_ref),
    p_mechanism_family,
    btrim(p_reason),
    'queued',
    now(),
    coalesce(p_not_before, now())
  ) returning id into queued_job_id;

  return queued_job_id;
end;
$$;

create or replace function public.claim_impact_refresh_jobs(
  p_limit integer default 10,
  p_lock_timeout_seconds integer default 900
)
returns setof public.impact_refresh_queue
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  if coalesce(auth.role(), '') <> 'service_role' then
    raise exception 'Service role required to claim impact refresh jobs' using errcode = '42501';
  end if;
  if p_limit not between 1 and 100 then
    raise exception 'Refresh claim limit must be between 1 and 100' using errcode = '22023';
  end if;
  if p_lock_timeout_seconds not between 60 and 86400 then
    raise exception 'Refresh lock timeout must be between 60 and 86400 seconds' using errcode = '22023';
  end if;

  update public.impact_refresh_queue
  set status = 'failed',
      locked_at = null,
      not_before = now(),
      last_error = 'worker_lock_expired'
  where status = 'running'
    and locked_at < now() - make_interval(secs => p_lock_timeout_seconds);

  return query
  with candidates as (
    select queue.id
    from public.impact_refresh_queue queue
    where queue.status in ('queued','failed')
      and queue.not_before <= now()
    order by queue.not_before, queue.requested_at, queue.id
    for update skip locked
    limit p_limit
  )
  update public.impact_refresh_queue queue
  set status = 'running',
      locked_at = now(),
      completed_at = null,
      attempt_count = queue.attempt_count + 1,
      last_error = null
  from candidates
  where queue.id = candidates.id
  returning queue.*;
end;
$$;

create or replace function public.finish_impact_refresh_job(
  p_job_id uuid,
  p_outcome text,
  p_error text default null,
  p_retry_at timestamptz default null
)
returns public.impact_refresh_queue
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  job public.impact_refresh_queue%rowtype;
begin
  if coalesce(auth.role(), '') <> 'service_role' then
    raise exception 'Service role required to finish impact refresh jobs' using errcode = '42501';
  end if;
  if p_outcome not in ('completed','failed','cancelled') then
    raise exception 'Refresh outcome must be completed, failed, or cancelled' using errcode = '22023';
  end if;
  if p_error is not null and char_length(p_error) > 5000 then
    raise exception 'Refresh error exceeds 5000 characters' using errcode = '22001';
  end if;
  if p_outcome = 'failed' and nullif(btrim(p_error), '') is null then
    raise exception 'Failed refresh jobs require an error' using errcode = '22023';
  end if;

  select * into job
  from public.impact_refresh_queue
  where id = p_job_id
  for update;
  if not found then
    raise exception 'Impact refresh job not found' using errcode = 'P0002';
  end if;
  if job.status <> 'running' then
    raise exception 'Only running impact refresh jobs can be finished' using errcode = '23514';
  end if;

  update public.impact_refresh_queue
  set status = p_outcome,
      locked_at = null,
      completed_at = case when p_outcome in ('completed','cancelled') then now() else null end,
      not_before = case
        when p_outcome = 'failed' then coalesce(p_retry_at, now() + interval '5 minutes')
        else not_before
      end,
      last_error = case when p_outcome = 'failed' then btrim(p_error) else null end
  where id = p_job_id
  returning * into job;

  return job;
end;
$$;

revoke all on function public.queue_impact_refresh_job(uuid,text,text,text,timestamptz) from public, anon, authenticated;
revoke all on function public.claim_impact_refresh_jobs(integer,integer) from public, anon, authenticated;
revoke all on function public.finish_impact_refresh_job(uuid,text,text,timestamptz) from public, anon, authenticated;

grant execute on function public.queue_impact_refresh_job(uuid,text,text,text,timestamptz) to service_role;
grant execute on function public.claim_impact_refresh_jobs(integer,integer) to service_role;
grant execute on function public.finish_impact_refresh_job(uuid,text,text,timestamptz) to service_role;

comment on function public.queue_impact_refresh_job(uuid,text,text,text,timestamptz) is
  'Service-role-only idempotent queueing for participant impact refreshes. It does not calculate or publish an estimate.';
comment on function public.claim_impact_refresh_jobs(integer,integer) is
  'Service-role-only SKIP LOCKED job claiming with stale-lock recovery.';
comment on function public.finish_impact_refresh_job(uuid,text,text,timestamptz) is
  'Service-role-only completion, cancellation, or retry scheduling for a claimed impact refresh job.';

commit;
