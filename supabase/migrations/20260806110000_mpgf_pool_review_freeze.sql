begin;

create extension if not exists pgcrypto with schema extensions;

alter table public.mpgf_pool_proposals
  drop constraint if exists mpgf_pool_proposals_status_check;
alter table public.mpgf_pool_proposals
  add constraint mpgf_pool_proposals_status_check check (
    status in (
      'draft',
      'submitted',
      'under_review',
      'changes_requested',
      'approved_as_candidate',
      'rejected',
      'withdrawn'
    )
  );

alter table public.mpgf_pool_proposals
  drop constraint if exists mpgf_pool_proposals_approved_version_valid,
  drop constraint if exists mpgf_pool_proposals_terms_hash_valid,
  drop constraint if exists mpgf_pool_proposals_lock_complete,
  drop constraint if exists mpgf_pool_proposals_not_self_revision;

alter table public.mpgf_pool_proposals
  add column if not exists terms_version integer not null default 1 check (terms_version > 0),
  add column if not exists approved_terms_version integer,
  add column if not exists operative_terms_sha256 text,
  add column if not exists terms_locked_at timestamptz,
  add column if not exists reviewed_by uuid references public.profiles(id) on delete set null,
  add column if not exists reviewed_at timestamptz,
  add column if not exists review_reason text,
  add column if not exists supersedes_proposal_id uuid references public.mpgf_pool_proposals(id) on delete restrict,
  add constraint mpgf_pool_proposals_approved_version_valid check (
    approved_terms_version is null
    or approved_terms_version = terms_version
  ),
  add constraint mpgf_pool_proposals_terms_hash_valid check (
    operative_terms_sha256 is null
    or operative_terms_sha256 ~ '^sha256:[a-f0-9]{64}$'
  ),
  add constraint mpgf_pool_proposals_lock_complete check (
    (status = 'approved_as_candidate') = (
      approved_terms_version is not null
      and operative_terms_sha256 is not null
      and terms_locked_at is not null
      and reviewed_by is not null
      and reviewed_at is not null
    )
  ) not valid,
  add constraint mpgf_pool_proposals_not_self_revision check (
    supersedes_proposal_id is null or supersedes_proposal_id <> id
  );

create unique index if not exists mpgf_pool_proposals_one_direct_revision_idx
  on public.mpgf_pool_proposals(supersedes_proposal_id)
  where supersedes_proposal_id is not null;

create table if not exists public.mpgf_pool_reviewers (
  reviewer_id uuid primary key references public.profiles(id) on delete cascade,
  active boolean not null default true,
  scope text not null default 'pool_review' check (scope = 'pool_review'),
  authorized_by uuid references public.profiles(id) on delete set null,
  rationale text not null,
  authorized_at timestamptz not null default timezone('utc', now()),
  expires_at timestamptz,
  check (btrim(rationale) <> ''),
  check (expires_at is null or expires_at > authorized_at)
);

create table if not exists public.mpgf_pool_proposal_versions (
  proposal_id uuid not null references public.mpgf_pool_proposals(id) on delete restrict,
  terms_version integer not null check (terms_version > 0),
  supersedes_proposal_id uuid references public.mpgf_pool_proposals(id) on delete restrict,
  terms_sha256 text not null check (terms_sha256 ~ '^sha256:[a-f0-9]{64}$'),
  proposal_terms_json jsonb not null,
  create_pool_terms_json jsonb,
  recorded_by uuid references public.profiles(id) on delete set null,
  recorded_reason text not null,
  recorded_at timestamptz not null default timezone('utc', now()),
  primary key (proposal_id, terms_version),
  check (jsonb_typeof(proposal_terms_json) = 'object'),
  check (create_pool_terms_json is null or jsonb_typeof(create_pool_terms_json) = 'object'),
  check (btrim(recorded_reason) <> '')
);

create table if not exists public.mpgf_pool_lifecycle_events (
  id uuid primary key default gen_random_uuid(),
  proposal_id uuid not null references public.mpgf_pool_proposals(id) on delete restrict,
  terms_version integer not null check (terms_version > 0),
  event_type text not null check (event_type in (
    'review_started',
    'changes_requested',
    'revision_submitted',
    'proposal_rejected',
    'terms_approved_and_frozen'
  )),
  actor_user_id uuid references public.profiles(id) on delete set null,
  from_status text,
  to_status text not null,
  terms_sha256 text check (terms_sha256 is null or terms_sha256 ~ '^sha256:[a-f0-9]{64}$'),
  reason text not null,
  metadata_json jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  foreign key (proposal_id, terms_version)
    references public.mpgf_pool_proposal_versions(proposal_id, terms_version)
    on delete restrict,
  check (btrim(reason) <> ''),
  check (jsonb_typeof(metadata_json) = 'object')
);

create index if not exists mpgf_pool_lifecycle_events_proposal_idx
  on public.mpgf_pool_lifecycle_events(proposal_id, created_at, id);

create or replace function public.mpgf_pool_append_only()
returns trigger
language plpgsql
security definer
set search_path = pg_catalog, public
as $function$
begin
  raise exception using errcode = '23514', message = 'MPGF pool lifecycle versions and events are append-only.';
end;
$function$;

revoke all on function public.mpgf_pool_append_only() from public, anon, authenticated;

drop trigger if exists mpgf_pool_proposal_versions_append_only on public.mpgf_pool_proposal_versions;
create trigger mpgf_pool_proposal_versions_append_only
before update or delete on public.mpgf_pool_proposal_versions
for each row execute function public.mpgf_pool_append_only();

drop trigger if exists mpgf_pool_lifecycle_events_append_only on public.mpgf_pool_lifecycle_events;
create trigger mpgf_pool_lifecycle_events_append_only
before update or delete on public.mpgf_pool_lifecycle_events
for each row execute function public.mpgf_pool_append_only();

create or replace function public.mpgf_pool_proposal_terms_snapshot(p_proposal_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = pg_catalog, public
as $function$
declare
  proposal_row public.mpgf_pool_proposals%rowtype;
  create_terms_json jsonb;
begin
  select * into proposal_row
  from public.mpgf_pool_proposals
  where id = p_proposal_id;

  if proposal_row.id is null then
    raise exception using errcode = 'P0002', message = 'Pool proposal was not found.';
  end if;

  select to_jsonb(pool_terms)
    - 'review_status'
    - 'reserve_quote_status'
    - 'terms_locked_at'
    - 'created_at'
    - 'updated_at'
  into create_terms_json
  from public.moral_trade_create_pool_terms as pool_terms
  where pool_terms.pool_proposal_id = p_proposal_id;

  return jsonb_build_object(
    'proposal',
      to_jsonb(proposal_row)
      - 'status'
      - 'candidate_alternative_id'
      - 'created_at'
      - 'submitted_at'
      - 'first_accepted_pledge_at'
      - 'progress_visibility'
      - 'public_goods_failure_bonus_schedule_status'
      - 'terms_version'
      - 'approved_terms_version'
      - 'operative_terms_sha256'
      - 'terms_locked_at'
      - 'reviewed_by'
      - 'reviewed_at'
      - 'review_reason'
      - 'supersedes_proposal_id',
    'createPoolTerms', create_terms_json
  );
end;
$function$;

create or replace function public.mpgf_pool_proposal_terms_sha256(p_proposal_id uuid)
returns text
language sql
stable
security definer
set search_path = pg_catalog, public, extensions
as $function$
  select 'sha256:' || encode(
    extensions.digest(
      convert_to(public.mpgf_pool_proposal_terms_snapshot(p_proposal_id)::text, 'UTF8'),
      'sha256'
    ),
    'hex'
  );
$function$;

revoke all on function public.mpgf_pool_proposal_terms_snapshot(uuid) from public, anon, authenticated;
revoke all on function public.mpgf_pool_proposal_terms_sha256(uuid) from public, anon, authenticated;

create or replace function public.mpgf_assert_authorized_pool_reviewer(
  p_reviewer_id uuid,
  p_proposal_id uuid
)
returns void
language plpgsql
stable
security definer
set search_path = pg_catalog, public
as $function$
begin
  if p_reviewer_id is null
     or not exists (
       select 1
       from public.mpgf_pool_reviewers reviewer
       where reviewer.reviewer_id = p_reviewer_id
         and reviewer.active = true
         and (reviewer.expires_at is null or reviewer.expires_at > timezone('utc', now()))
     ) then
    raise exception using errcode = '42501', message = 'An active authorized pool reviewer is required.';
  end if;

  if exists (
    select 1
    from public.mpgf_pool_proposals proposal
    where proposal.id = p_proposal_id
      and proposal.proposer_id = p_reviewer_id
  ) then
    raise exception using errcode = '42501', message = 'A pool proposer cannot review their own proposal.';
  end if;
end;
$function$;

revoke all on function public.mpgf_assert_authorized_pool_reviewer(uuid, uuid)
  from public, anon, authenticated;

create or replace function public.mpgf_record_pool_proposal_version(
  p_proposal_id uuid,
  p_actor_id uuid,
  p_reason text
)
returns text
language plpgsql
security definer
set search_path = pg_catalog, public
as $function$
declare
  proposal_row public.mpgf_pool_proposals%rowtype;
  snapshot_json jsonb;
  create_terms_json jsonb;
  terms_hash text;
  existing_hash text;
begin
  if btrim(coalesce(p_reason, '')) = '' then
    raise exception using errcode = '22023', message = 'A version-record reason is required.';
  end if;

  select * into proposal_row
  from public.mpgf_pool_proposals
  where id = p_proposal_id
  for update;

  if proposal_row.id is null then
    raise exception using errcode = 'P0002', message = 'Pool proposal was not found.';
  end if;

  snapshot_json := public.mpgf_pool_proposal_terms_snapshot(p_proposal_id);
  terms_hash := public.mpgf_pool_proposal_terms_sha256(p_proposal_id);
  create_terms_json := snapshot_json -> 'createPoolTerms';

  select terms_sha256 into existing_hash
  from public.mpgf_pool_proposal_versions
  where proposal_id = p_proposal_id
    and terms_version = proposal_row.terms_version;

  if existing_hash is not null then
    if existing_hash <> terms_hash then
      raise exception using
        errcode = '23514',
        message = 'Recorded pool proposal version differs from current terms; create a new proposal revision.';
    end if;
    return existing_hash;
  end if;

  insert into public.mpgf_pool_proposal_versions (
    proposal_id,
    terms_version,
    supersedes_proposal_id,
    terms_sha256,
    proposal_terms_json,
    create_pool_terms_json,
    recorded_by,
    recorded_reason
  ) values (
    p_proposal_id,
    proposal_row.terms_version,
    proposal_row.supersedes_proposal_id,
    terms_hash,
    snapshot_json -> 'proposal',
    create_terms_json,
    p_actor_id,
    btrim(p_reason)
  );

  return terms_hash;
end;
$function$;

revoke all on function public.mpgf_record_pool_proposal_version(uuid, uuid, text)
  from public, anon, authenticated;

create or replace function public.mpgf_guard_pool_review_fields_and_frozen_terms()
returns trigger
language plpgsql
security invoker
set search_path = pg_catalog, public
as $function$
declare
  transition_authorized boolean :=
    current_user not in ('anon', 'authenticated')
    and current_setting('app.mpgf_pool_review_transition', true) = old.id::text;
  old_material jsonb;
  new_material jsonb;
begin
  if new.id is distinct from old.id
     or new.proposer_id is distinct from old.proposer_id
     or new.created_at is distinct from old.created_at
     or new.submitted_at is distinct from old.submitted_at then
    raise exception using errcode = '42501', message = 'Pool proposal identity and submission metadata are immutable.';
  end if;

  if current_user in ('anon', 'authenticated') and (
    new.first_accepted_pledge_at is distinct from old.first_accepted_pledge_at
    or new.candidate_alternative_id is distinct from old.candidate_alternative_id
  ) then
    raise exception using errcode = '42501', message = 'Pool system fields may change only through an authorized service path.';
  end if;

  if not transition_authorized and (
    new.status is distinct from old.status
    or new.terms_version is distinct from old.terms_version
    or new.approved_terms_version is distinct from old.approved_terms_version
    or new.operative_terms_sha256 is distinct from old.operative_terms_sha256
    or new.terms_locked_at is distinct from old.terms_locked_at
    or new.reviewed_by is distinct from old.reviewed_by
    or new.reviewed_at is distinct from old.reviewed_at
    or new.review_reason is distinct from old.review_reason
    or new.supersedes_proposal_id is distinct from old.supersedes_proposal_id
  ) then
    raise exception using errcode = '42501', message = 'Pool review state may change only through an authorized lifecycle function.';
  end if;

  if old.status in ('under_review', 'changes_requested', 'approved_as_candidate', 'rejected')
     or old.terms_locked_at is not null then
    old_material := to_jsonb(old)
      - 'status'
      - 'candidate_alternative_id'
      - 'first_accepted_pledge_at'
      - 'progress_visibility'
      - 'reviewed_by'
      - 'reviewed_at'
      - 'review_reason';
    new_material := to_jsonb(new)
      - 'status'
      - 'candidate_alternative_id'
      - 'first_accepted_pledge_at'
      - 'progress_visibility'
      - 'reviewed_by'
      - 'reviewed_at'
      - 'review_reason';

    if new_material is distinct from old_material then
      raise exception using errcode = '23514', message = 'Pool proposal terms are immutable after review begins; submit a new version instead.';
    end if;
  end if;

  return new;
end;
$function$;

revoke all on function public.mpgf_guard_pool_review_fields_and_frozen_terms()
  from public, anon, authenticated;

drop trigger if exists mpgf_pool_review_fields_and_frozen_terms on public.mpgf_pool_proposals;
create trigger mpgf_pool_review_fields_and_frozen_terms
before update on public.mpgf_pool_proposals
for each row execute function public.mpgf_guard_pool_review_fields_and_frozen_terms();

create or replace function public.mpgf_begin_pool_proposal_review(
  p_proposal_id uuid,
  p_reviewer_id uuid,
  p_reason text
)
returns table (proposal_id uuid, terms_version integer, terms_sha256 text, status text)
language plpgsql
security definer
set search_path = pg_catalog, public
as $function$
declare
  proposal_row public.mpgf_pool_proposals%rowtype;
  terms_hash text;
begin
  if btrim(coalesce(p_reason, '')) = '' then
    raise exception using errcode = '22023', message = 'A review rationale is required.';
  end if;
  perform public.mpgf_assert_authorized_pool_reviewer(p_reviewer_id, p_proposal_id);

  select * into proposal_row
  from public.mpgf_pool_proposals
  where id = p_proposal_id
  for update;

  if proposal_row.status <> 'submitted' then
    raise exception using errcode = '23514', message = 'Only a submitted pool proposal can enter review.';
  end if;

  terms_hash := public.mpgf_record_pool_proposal_version(
    p_proposal_id,
    p_reviewer_id,
    'review_started: ' || btrim(p_reason)
  );

  perform set_config('app.mpgf_pool_review_transition', p_proposal_id::text, true);
  update public.mpgf_pool_proposals
  set status = 'under_review',
      reviewed_by = p_reviewer_id,
      reviewed_at = timezone('utc', now()),
      review_reason = btrim(p_reason)
  where id = p_proposal_id;
  perform set_config('app.mpgf_pool_review_transition', '', true);

  insert into public.mpgf_pool_lifecycle_events (
    proposal_id, terms_version, event_type, actor_user_id,
    from_status, to_status, terms_sha256, reason
  ) values (
    p_proposal_id, proposal_row.terms_version, 'review_started', p_reviewer_id,
    'submitted', 'under_review', terms_hash, btrim(p_reason)
  );

  return query select p_proposal_id, proposal_row.terms_version, terms_hash, 'under_review'::text;
end;
$function$;

create or replace function public.mpgf_request_pool_proposal_changes(
  p_proposal_id uuid,
  p_reviewer_id uuid,
  p_reason text
)
returns table (proposal_id uuid, terms_version integer, status text)
language plpgsql
security definer
set search_path = pg_catalog, public
as $function$
declare
  proposal_row public.mpgf_pool_proposals%rowtype;
begin
  if btrim(coalesce(p_reason, '')) = '' then
    raise exception using errcode = '22023', message = 'A change request is required.';
  end if;
  perform public.mpgf_assert_authorized_pool_reviewer(p_reviewer_id, p_proposal_id);

  select * into proposal_row
  from public.mpgf_pool_proposals
  where id = p_proposal_id
  for update;
  if proposal_row.status <> 'under_review' then
    raise exception using errcode = '23514', message = 'Only a pool proposal under review can receive a change request.';
  end if;

  perform set_config('app.mpgf_pool_review_transition', p_proposal_id::text, true);
  update public.mpgf_pool_proposals
  set status = 'changes_requested',
      reviewed_by = p_reviewer_id,
      reviewed_at = timezone('utc', now()),
      review_reason = btrim(p_reason)
  where id = p_proposal_id;
  perform set_config('app.mpgf_pool_review_transition', '', true);

  update public.moral_trade_create_pool_terms
  set review_status = 'revision_required'
  where pool_proposal_id = p_proposal_id;

  insert into public.mpgf_pool_lifecycle_events (
    proposal_id, terms_version, event_type, actor_user_id,
    from_status, to_status, terms_sha256, reason
  ) values (
    p_proposal_id, proposal_row.terms_version, 'changes_requested', p_reviewer_id,
    'under_review', 'changes_requested',
    public.mpgf_pool_proposal_terms_sha256(p_proposal_id), btrim(p_reason)
  );

  return query select p_proposal_id, proposal_row.terms_version, 'changes_requested'::text;
end;
$function$;

create or replace function public.mpgf_reject_pool_proposal(
  p_proposal_id uuid,
  p_reviewer_id uuid,
  p_reason text
)
returns table (proposal_id uuid, terms_version integer, status text)
language plpgsql
security definer
set search_path = pg_catalog, public
as $function$
declare
  proposal_row public.mpgf_pool_proposals%rowtype;
  terms_hash text;
begin
  if btrim(coalesce(p_reason, '')) = '' then
    raise exception using errcode = '22023', message = 'A rejection rationale is required.';
  end if;
  perform public.mpgf_assert_authorized_pool_reviewer(p_reviewer_id, p_proposal_id);

  select * into proposal_row
  from public.mpgf_pool_proposals
  where id = p_proposal_id
  for update;
  if proposal_row.status not in ('submitted', 'under_review') then
    raise exception using errcode = '23514', message = 'Only a submitted or under-review pool proposal can be rejected.';
  end if;

  terms_hash := public.mpgf_record_pool_proposal_version(
    p_proposal_id,
    p_reviewer_id,
    'proposal_rejected: ' || btrim(p_reason)
  );

  perform set_config('app.mpgf_pool_review_transition', p_proposal_id::text, true);
  update public.mpgf_pool_proposals
  set status = 'rejected',
      reviewed_by = p_reviewer_id,
      reviewed_at = timezone('utc', now()),
      review_reason = btrim(p_reason)
  where id = p_proposal_id;
  perform set_config('app.mpgf_pool_review_transition', '', true);

  update public.moral_trade_create_pool_terms
  set review_status = 'rejected'
  where pool_proposal_id = p_proposal_id;

  insert into public.mpgf_pool_lifecycle_events (
    proposal_id, terms_version, event_type, actor_user_id,
    from_status, to_status, terms_sha256, reason
  ) values (
    p_proposal_id, proposal_row.terms_version, 'proposal_rejected', p_reviewer_id,
    proposal_row.status, 'rejected',
    terms_hash, btrim(p_reason)
  );

  return query select p_proposal_id, proposal_row.terms_version, 'rejected'::text;
end;
$function$;

create or replace function public.mpgf_approve_and_freeze_pool_proposal(
  p_proposal_id uuid,
  p_reviewer_id uuid,
  p_reason text
)
returns table (proposal_id uuid, terms_version integer, terms_sha256 text, status text)
language plpgsql
security definer
set search_path = pg_catalog, public
as $function$
declare
  proposal_row public.mpgf_pool_proposals%rowtype;
  recorded_hash text;
  current_hash text;
  create_terms_row public.moral_trade_create_pool_terms%rowtype;
begin
  if btrim(coalesce(p_reason, '')) = '' then
    raise exception using errcode = '22023', message = 'An approval rationale is required.';
  end if;
  perform public.mpgf_assert_authorized_pool_reviewer(p_reviewer_id, p_proposal_id);

  select * into proposal_row
  from public.mpgf_pool_proposals
  where id = p_proposal_id
  for update;
  if proposal_row.status <> 'under_review' then
    raise exception using errcode = '23514', message = 'Only a pool proposal under review can be approved.';
  end if;

  select * into create_terms_row
  from public.moral_trade_create_pool_terms
  where pool_proposal_id = p_proposal_id
  for update;

  if create_terms_row.pool_proposal_id is not null
     and create_terms_row.reserve_quote_status not in ('not_applicable', 'approved') then
    raise exception using errcode = '23514', message = 'Pool reserve underwriting must be approved before proposal approval.';
  end if;
  if proposal_row.public_goods_failure_bonus_enabled = true
     and proposal_row.public_goods_failure_bonus_schedule_status <> 'approved' then
    raise exception using errcode = '23514', message = 'Failure-bonus schedule approval is required before proposal approval.';
  end if;

  select terms_sha256 into recorded_hash
  from public.mpgf_pool_proposal_versions
  where proposal_id = p_proposal_id
    and terms_version = proposal_row.terms_version;
  current_hash := public.mpgf_pool_proposal_terms_sha256(p_proposal_id);

  if recorded_hash is null or recorded_hash <> current_hash then
    raise exception using errcode = '23514', message = 'Pool terms changed after review began; submit a new proposal revision.';
  end if;

  perform set_config('app.mpgf_pool_review_transition', p_proposal_id::text, true);
  update public.mpgf_pool_proposals
  set status = 'approved_as_candidate',
      approved_terms_version = terms_version,
      operative_terms_sha256 = current_hash,
      terms_locked_at = timezone('utc', now()),
      reviewed_by = p_reviewer_id,
      reviewed_at = timezone('utc', now()),
      review_reason = btrim(p_reason)
  where id = p_proposal_id;
  perform set_config('app.mpgf_pool_review_transition', '', true);

  update public.moral_trade_create_pool_terms
  set review_status = 'approved',
      terms_locked_at = timezone('utc', now())
  where pool_proposal_id = p_proposal_id;

  insert into public.mpgf_pool_lifecycle_events (
    proposal_id, terms_version, event_type, actor_user_id,
    from_status, to_status, terms_sha256, reason
  ) values (
    p_proposal_id, proposal_row.terms_version, 'terms_approved_and_frozen', p_reviewer_id,
    'under_review', 'approved_as_candidate', current_hash, btrim(p_reason)
  );

  return query select p_proposal_id, proposal_row.terms_version, current_hash, 'approved_as_candidate'::text;
end;
$function$;

create or replace function public.mpgf_link_pool_proposal_revision(
  p_prior_proposal_id uuid,
  p_new_proposal_id uuid,
  p_actor_id uuid,
  p_reason text
)
returns table (proposal_id uuid, terms_version integer, terms_sha256 text, status text)
language plpgsql
security definer
set search_path = pg_catalog, public
as $function$
declare
  prior_row public.mpgf_pool_proposals%rowtype;
  new_row public.mpgf_pool_proposals%rowtype;
  terms_hash text;
begin
  if btrim(coalesce(p_reason, '')) = '' then
    raise exception using errcode = '22023', message = 'A revision rationale is required.';
  end if;

  select * into prior_row
  from public.mpgf_pool_proposals
  where id = p_prior_proposal_id
  for update;
  select * into new_row
  from public.mpgf_pool_proposals
  where id = p_new_proposal_id
  for update;

  if prior_row.id is null or new_row.id is null then
    raise exception using errcode = 'P0002', message = 'Both prior and new pool proposals are required.';
  end if;
  if prior_row.status <> 'changes_requested'
     or new_row.status <> 'submitted'
     or prior_row.proposer_id <> p_actor_id
     or new_row.proposer_id <> p_actor_id
     or new_row.supersedes_proposal_id is not null
     or prior_row.first_accepted_pledge_at is not null
     or new_row.first_accepted_pledge_at is not null then
    raise exception using errcode = '23514', message = 'Pool proposal revision linkage is not allowed for these records.';
  end if;

  perform set_config('app.mpgf_pool_review_transition', p_new_proposal_id::text, true);
  update public.mpgf_pool_proposals
  set supersedes_proposal_id = p_prior_proposal_id,
      terms_version = prior_row.terms_version + 1
  where id = p_new_proposal_id;
  perform set_config('app.mpgf_pool_review_transition', '', true);

  terms_hash := public.mpgf_record_pool_proposal_version(
    p_new_proposal_id,
    p_actor_id,
    'revision_submitted: ' || btrim(p_reason)
  );

  insert into public.mpgf_pool_lifecycle_events (
    proposal_id, terms_version, event_type, actor_user_id,
    from_status, to_status, terms_sha256, reason,
    metadata_json
  ) values (
    p_new_proposal_id, prior_row.terms_version + 1, 'revision_submitted', p_actor_id,
    'changes_requested', 'submitted', terms_hash, btrim(p_reason),
    jsonb_build_object('supersedesProposalId', p_prior_proposal_id)
  );

  return query select p_new_proposal_id, prior_row.terms_version + 1, terms_hash, 'submitted'::text;
end;
$function$;

revoke all on function public.mpgf_begin_pool_proposal_review(uuid, uuid, text)
  from public, anon, authenticated;
revoke all on function public.mpgf_request_pool_proposal_changes(uuid, uuid, text)
  from public, anon, authenticated;
revoke all on function public.mpgf_reject_pool_proposal(uuid, uuid, text)
  from public, anon, authenticated;
revoke all on function public.mpgf_approve_and_freeze_pool_proposal(uuid, uuid, text)
  from public, anon, authenticated;
revoke all on function public.mpgf_link_pool_proposal_revision(uuid, uuid, uuid, text)
  from public, anon, authenticated;

grant execute on function public.mpgf_begin_pool_proposal_review(uuid, uuid, text) to service_role;
grant execute on function public.mpgf_request_pool_proposal_changes(uuid, uuid, text) to service_role;
grant execute on function public.mpgf_reject_pool_proposal(uuid, uuid, text) to service_role;
grant execute on function public.mpgf_approve_and_freeze_pool_proposal(uuid, uuid, text) to service_role;
grant execute on function public.mpgf_link_pool_proposal_revision(uuid, uuid, uuid, text) to service_role;

alter table public.mpgf_pool_reviewers enable row level security;
alter table public.mpgf_pool_proposal_versions enable row level security;
alter table public.mpgf_pool_lifecycle_events enable row level security;

revoke all on public.mpgf_pool_reviewers from public, anon, authenticated;
revoke all on public.mpgf_pool_proposal_versions from public, anon, authenticated;
revoke all on public.mpgf_pool_lifecycle_events from public, anon, authenticated;
grant all on public.mpgf_pool_reviewers to service_role;
grant all on public.mpgf_pool_proposal_versions to service_role;
grant all on public.mpgf_pool_lifecycle_events to service_role;
grant select on public.mpgf_pool_proposal_versions to authenticated;
grant select on public.mpgf_pool_lifecycle_events to authenticated;

drop policy if exists mpgf_pool_proposal_versions_owner_select
  on public.mpgf_pool_proposal_versions;
create policy mpgf_pool_proposal_versions_owner_select
  on public.mpgf_pool_proposal_versions
  for select to authenticated
  using (
    exists (
      select 1 from public.mpgf_pool_proposals proposal
      where proposal.id = proposal_id
        and proposal.proposer_id = auth.uid()
    )
  );

drop policy if exists mpgf_pool_lifecycle_events_owner_select
  on public.mpgf_pool_lifecycle_events;
create policy mpgf_pool_lifecycle_events_owner_select
  on public.mpgf_pool_lifecycle_events
  for select to authenticated
  using (
    exists (
      select 1 from public.mpgf_pool_proposals proposal
      where proposal.id = proposal_id
        and proposal.proposer_id = auth.uid()
    )
  );

grant update on public.mpgf_pool_proposals to authenticated;

drop policy if exists mpgf_pool_proposals_participant_update on public.mpgf_pool_proposals;
drop policy if exists mpgf_pool_proposals_participant_progress_update on public.mpgf_pool_proposals;
create policy mpgf_pool_proposals_participant_progress_update
  on public.mpgf_pool_proposals
  for update to authenticated
  using (proposer_id = auth.uid())
  with check (proposer_id = auth.uid());

comment on table public.mpgf_pool_reviewers is
  'Service-managed authorization registry for reviewers allowed to make pool proposal review decisions.';
comment on table public.mpgf_pool_proposal_versions is
  'Append-only canonical snapshots of submitted pool proposal terms. Material changes use a linked successor proposal and a higher terms version.';
comment on table public.mpgf_pool_lifecycle_events is
  'Append-only review and terms-freeze events with actor, status transition, version, hash, reason, and timestamp.';
comment on function public.mpgf_approve_and_freeze_pool_proposal(uuid, uuid, text) is
  'Reviewer-only approval that rejects post-review drift and atomically freezes the exact versioned terms.';

commit;
