-- AAL2 administrator, RLS, RPC, and append-only export QA.
begin;

create temporary table qa_export_auth_actors(
  actor_role text primary key,
  profile_id uuid not null unique
) on commit drop;

insert into qa_export_auth_actors(actor_role, profile_id)
select roles.actor_role, profiles.id
from unnest(array['administrator', 'non_administrator'])
  with ordinality roles(actor_role, position)
join (
  select id, row_number() over(order by id) as position
  from public.profiles
  limit 2
) profiles using(position);

do $test$
begin
  if (select count(*) from qa_export_auth_actors) <> 2 then
    raise exception 'Calibration-export authorization QA requires two existing profiles.';
  end if;
end;
$test$;

insert into public.trade_review_role_grants(
  profile_id, role, active, granted_by
)
select administrator.profile_id, 'administrator', true, administrator.profile_id
from qa_export_auth_actors administrator
where administrator.actor_role = 'administrator'
on conflict(profile_id, role) do update
set active = true,
    revoked_at = null,
    granted_by = excluded.granted_by;

update public.trade_review_role_grants
set active = false,
    revoked_at = now()
where profile_id = (
    select profile_id
    from qa_export_auth_actors
    where actor_role = 'non_administrator'
  )
  and role = 'administrator';

create temporary table qa_export_auth_objects(
  object_name text primary key,
  object_id uuid not null unique
) on commit drop;

with made as (
  insert into public.evidence_credibility_calibration_exports(
    analysis_plan_version,
    analysis_plan_hash,
    source_key,
    source_cutoff_at,
    pseudonymization_key_commitment,
    row_count,
    rows_digest,
    manifest_hash,
    created_by
  )
  select
    'qa-auth-plan-v1',
    repeat('1', 64),
    'qa-export-authorization',
    now() - interval '1 hour',
    repeat('2', 64),
    1,
    repeat('3', 64),
    repeat('4', 64),
    administrator.profile_id
  from qa_export_auth_actors administrator
  where administrator.actor_role = 'administrator'
  returning id
)
insert into qa_export_auth_objects select 'export', id from made;

insert into public.evidence_credibility_calibration_export_rows(
  export_id,
  row_number,
  observation,
  row_hash
)
select
  export_record.object_id,
  1,
  jsonb_build_object(
    'schemaVersion', 'v1-blind-audit-jsonl',
    'observationToken', repeat('5', 64),
    'shadowOnly', true
  ),
  repeat('6', 64)
from qa_export_auth_objects export_record
where export_record.object_name = 'export';

do $test$
begin
  if has_table_privilege(
       'anon',
       'public.evidence_credibility_calibration_exports',
       'SELECT'
     )
     or has_table_privilege(
       'authenticated',
       'public.evidence_credibility_calibration_exports',
       'SELECT'
     )
     or has_table_privilege(
       'authenticated',
       'public.evidence_credibility_calibration_export_rows',
       'SELECT'
     )
     or has_table_privilege(
       'authenticated',
       'public.evidence_credibility_calibration_exports',
       'INSERT'
     ) then
    raise exception 'Ordinary API roles retained direct calibration-export table privileges.';
  end if;
end;
$test$;

-- Anonymous and AAL1 callers fail closed.
select set_config('request.jwt.claim.sub', '', true);
select set_config('request.jwt.claims', '{"role":"anon"}', true);

do $test$
begin
  begin
    perform * from public.list_evidence_credibility_calibration_exports_v1(10, 0);
    raise exception 'Anonymous access unexpectedly reached the calibration export registry.';
  exception when others then
    if sqlerrm not like 'Calibration audit administration requires an AAL2%' then raise; end if;
  end;
end;
$test$;

select set_config(
  'request.jwt.claim.sub',
  (select profile_id::text from qa_export_auth_actors where actor_role = 'administrator'),
  true
);
select set_config(
  'request.jwt.claims',
  jsonb_build_object(
    'role', 'authenticated',
    'aal', 'aal1',
    'sub', (
      select profile_id::text
      from qa_export_auth_actors
      where actor_role = 'administrator'
    )
  )::text,
  true
);

do $test$
begin
  begin
    perform * from public.get_evidence_credibility_calibration_export_manifest_v1(
      (select object_id from qa_export_auth_objects where object_name = 'export')
    );
    raise exception 'An AAL1 administrator unexpectedly read an export manifest.';
  exception when others then
    if sqlerrm not like 'Calibration audit administration requires an AAL2%' then raise; end if;
  end;
end;
$test$;

-- AAL2 without an administrator grant also fails closed.
select set_config(
  'request.jwt.claim.sub',
  (select profile_id::text from qa_export_auth_actors where actor_role = 'non_administrator'),
  true
);
select set_config(
  'request.jwt.claims',
  jsonb_build_object(
    'role', 'authenticated',
    'aal', 'aal2',
    'sub', (
      select profile_id::text
      from qa_export_auth_actors
      where actor_role = 'non_administrator'
    )
  )::text,
  true
);

do $test$
begin
  begin
    perform * from public.list_evidence_credibility_calibration_export_rows_v1(
      (select object_id from qa_export_auth_objects where object_name = 'export'),
      10,
      0
    );
    raise exception 'An AAL2 non-administrator unexpectedly read export rows.';
  exception when others then
    if sqlerrm not like 'Calibration audit administration requires an AAL2%' then raise; end if;
  end;
end;
$test$;

-- The exact AAL2 administrator can use only the mediated RPC projections.
select set_config(
  'request.jwt.claim.sub',
  (select profile_id::text from qa_export_auth_actors where actor_role = 'administrator'),
  true
);
select set_config(
  'request.jwt.claims',
  jsonb_build_object(
    'role', 'authenticated',
    'aal', 'aal2',
    'sub', (
      select profile_id::text
      from qa_export_auth_actors
      where actor_role = 'administrator'
    )
  )::text,
  true
);

do $test$
begin
  if (select count(*) from public.list_evidence_credibility_calibration_exports_v1(10, 0)) <> 1 then
    raise exception 'The AAL2 administrator did not receive the immutable export registry.';
  end if;

  if not exists (
    select 1
    from public.get_evidence_credibility_calibration_export_manifest_v1(
      (select object_id from qa_export_auth_objects where object_name = 'export')
    ) manifest
    where manifest.row_count = 1
      and manifest.analysis_plan_hash = repeat('1', 64)
      and manifest.pseudonymization_key_commitment = repeat('2', 64)
  ) then
    raise exception 'The AAL2 administrator did not receive the exact export manifest.';
  end if;

  if not exists (
    select 1
    from public.list_evidence_credibility_calibration_export_rows_v1(
      (select object_id from qa_export_auth_objects where object_name = 'export'),
      10,
      0
    ) export_row
    where export_row.row_number = 1
      and export_row.row_hash = repeat('6', 64)
      and export_row.observation ->> 'observationToken' = repeat('5', 64)
  ) then
    raise exception 'The AAL2 administrator did not receive the exact export row.';
  end if;

  if exists (
    select 1
    from public.get_evidence_credibility_calibration_export_manifest_v1(gen_random_uuid())
  ) then
    raise exception 'An unknown export identifier returned a manifest.';
  end if;
end;
$test$;

-- Even the service path cannot rewrite or delete the immutable history.
select set_config('request.jwt.claim.sub', '', true);
select set_config('request.jwt.claims', '{"role":"service_role"}', true);

do $test$
begin
  begin
    update public.evidence_credibility_calibration_exports
    set analysis_plan_version = 'tampered'
    where id = (
      select object_id from qa_export_auth_objects where object_name = 'export'
    );
    raise exception 'An immutable calibration export update unexpectedly succeeded.';
  exception when others then
    if sqlerrm not like 'Shadow evidence and credibility history is append-only%' then raise; end if;
  end;

  begin
    delete from public.evidence_credibility_calibration_export_rows
    where export_id = (
      select object_id from qa_export_auth_objects where object_name = 'export'
    );
    raise exception 'An immutable calibration export-row deletion unexpectedly succeeded.';
  exception when others then
    if sqlerrm not like 'Shadow evidence and credibility history is append-only%' then raise; end if;
  end;
end;
$test$;

rollback;
