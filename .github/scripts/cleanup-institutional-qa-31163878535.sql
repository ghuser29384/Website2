\set ON_ERROR_STOP on
\pset pager off

begin;

create temp table qa_target_profiles on commit drop as
select
  u.id,
  lower(u.email) as email,
  substring(
    lower(u.email)
    from '^institutional-31163878535-(lead|finance|named|verifier|outsider|independent)-[0-9a-f]{8}@example[.]test$'
  ) as role,
  u.raw_user_meta_data
from auth.users u
where lower(u.email) like 'institutional-31163878535-%@example.test';

create temp table qa_target_organizations on commit drop as
select o.id, o.slug, o.display_name, o.created_by
from public.institutional_organizations o
where o.created_by in (select id from qa_target_profiles);

create temp table qa_target_deals on commit drop as
select d.id, d.title, d.created_by, d.lead_organization_id, d.lead_profile_id
from public.institutional_deals d
where d.created_by in (select id from qa_target_profiles);

\copy (select id,email,role,raw_user_meta_data from qa_target_profiles order by role) to 'stale-qa-cleanup-evidence/target-profiles.csv' csv header
\copy (select * from qa_target_organizations order by slug) to 'stale-qa-cleanup-evidence/target-organizations.csv' csv header
\copy (select * from qa_target_deals order by title) to 'stale-qa-cleanup-evidence/target-deals.csv' csv header

DO $guard$
declare
  target_count integer;
  profile_count integer;
  organization_count integer;
  deal_count integer;
  suffix_count integer;
begin
  select count(*) into target_count from qa_target_profiles;
  if target_count <> 6 then
    raise exception 'Expected exactly 6 stale auth users for run 31163878535, found %.', target_count;
  end if;

  if exists (select 1 from qa_target_profiles where role is null) then
    raise exception 'At least one candidate email does not match the exact six-role QA pattern.';
  end if;

  if exists (
    with expected(role) as (
      values ('lead'),('finance'),('named'),('verifier'),('outsider'),('independent')
    ), actual as (
      select role, count(*) as count
      from qa_target_profiles
      group by role
    )
    select 1
    from expected e
    left join actual a using (role)
    where coalesce(a.count, 0) <> 1
  ) then
    raise exception 'The stale QA role set is incomplete or duplicated.';
  end if;

  if exists (
    select 1
    from qa_target_profiles
    where coalesce(raw_user_meta_data->>'qa_fixture', '') <> 'true'
       or coalesce(raw_user_meta_data->>'one_person_qa_run_id', '') <> '31163878535'
  ) then
    raise exception 'A candidate auth user lacks the exact synthetic-fixture metadata for run 31163878535.';
  end if;

  select count(*) into profile_count
  from public.profiles p
  join qa_target_profiles t on t.id = p.id and lower(p.email) = t.email;
  if profile_count <> 6 then
    raise exception 'Expected 6 matching public profiles, found %.', profile_count;
  end if;

  select count(*) into organization_count from qa_target_organizations;
  if organization_count <> 2 then
    raise exception 'Expected exactly 2 stale institutional organizations, found %.', organization_count;
  end if;
  if exists (
    select 1
    from qa_target_organizations
    where slug !~ '^qa-institution-[ab]-31163878535-[0-9a-f]{6}$'
       or display_name !~ '^QA Institution [AB] 31163878535-[0-9a-f]{6}$'
  ) then
    raise exception 'A target organization does not match the exact run-scoped synthetic naming contract.';
  end if;

  select count(*) into deal_count from qa_target_deals;
  if deal_count <> 3 then
    raise exception 'Expected exactly 3 stale institutional deals, found %.', deal_count;
  end if;
  if (select count(*) from qa_target_deals where title ~ '^QA exact-term secondment 31163878535-[0-9a-f]{6}$') <> 1
     or (select count(*) from qa_target_deals where title ~ '^QA moral-public-goods pool 31163878535-[0-9a-f]{6}$') <> 1
     or (select count(*) from qa_target_deals where title ~ '^QA independent grantmaker trade 31163878535-[0-9a-f]{6}$') <> 1 then
    raise exception 'The target deal set does not match the exact three-deal fixture contract.';
  end if;

  select count(distinct suffix) into suffix_count
  from (
    select substring(slug from '(31163878535-[0-9a-f]{6})') as suffix
    from qa_target_organizations
    union all
    select substring(title from '(31163878535-[0-9a-f]{6})') as suffix
    from qa_target_deals
  ) scoped;
  if suffix_count <> 1 then
    raise exception 'The stale organizations and deals do not share one exact fixture suffix.';
  end if;
end
$guard$;

-- Follow the same deletion order as the authenticated institutional QA driver.
delete from public.institutional_audit_events
where deal_id in (select id from qa_target_deals);

delete from public.institutional_deals
where id in (select id from qa_target_deals);

delete from public.institutional_audit_events
where represented_organization_id in (select id from qa_target_organizations);

delete from public.institutional_organizations
where id in (select id from qa_target_organizations);

delete from public.institutional_audit_events
where actor_profile_id in (select id from qa_target_profiles);

DO $cleanup$
declare
  target record;
  result jsonb;
begin
  for target in select id from qa_target_profiles order by id loop
    select public.cleanup_one_person_qa_fixture_v1(
      p_profile_id := target.id,
      p_qa_run_id := '31163878535'
    ) into result;
    if result is null then
      raise exception 'cleanup_one_person_qa_fixture_v1 returned null for profile %.', target.id;
    end if;
  end loop;
end
$cleanup$;

DO $verify$
declare
  target_ids uuid[];
  target_profile_ids uuid[];
  target_organization_ids uuid[];
  target_deal_ids uuid[];
  item record;
  residue_count bigint;
  run_marker text := '31163878535';
begin
  select coalesce(array_agg(id), array[]::uuid[]) into target_profile_ids from qa_target_profiles;
  select coalesce(array_agg(id), array[]::uuid[]) into target_organization_ids from qa_target_organizations;
  select coalesce(array_agg(id), array[]::uuid[]) into target_deal_ids from qa_target_deals;
  target_ids := target_profile_ids || target_organization_ids || target_deal_ids;

  if exists (select 1 from auth.users where id = any(target_profile_ids)) then
    raise exception 'Target auth.users rows remain after cleanup.';
  end if;
  if exists (select 1 from public.profiles where id = any(target_profile_ids)) then
    raise exception 'Target public.profiles rows remain after cleanup.';
  end if;
  if exists (select 1 from public.institutional_organizations where id = any(target_organization_ids)) then
    raise exception 'Target institutional organizations remain after cleanup.';
  end if;
  if exists (select 1 from public.institutional_deals where id = any(target_deal_ids)) then
    raise exception 'Target institutional deals remain after cleanup.';
  end if;

  -- Inspect every UUID column in public/auth base tables for any target profile,
  -- organization, or deal identifier. This catches residue outside the driver's
  -- hand-maintained list without relying on table-name guesses.
  for item in
    select n.nspname as schema_name, c.relname as table_name, a.attname as column_name
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
    join pg_attribute a on a.attrelid = c.oid
    where n.nspname in ('public', 'auth')
      and c.relkind in ('r', 'p')
      and a.attnum > 0
      and not a.attisdropped
      and a.atttypid = 'uuid'::regtype
  loop
    execute format(
      'select count(*) from %I.%I where %I = any($1)',
      item.schema_name,
      item.table_name,
      item.column_name
    ) into residue_count using target_ids;
    if residue_count <> 0 then
      raise exception 'Synthetic UUID residue remains in %.%.%: % row(s).',
        item.schema_name, item.table_name, item.column_name, residue_count;
    end if;
  end loop;

  -- Catch run identifiers retained only in text/JSON institutional records.
  for item in
    select schemaname as schema_name, tablename as table_name
    from pg_tables
    where schemaname = 'public'
      and (tablename like 'institutional\_%' escape '\\' or tablename = 'profiles')
  loop
    execute format(
      'select count(*) from %I.%I row_value where to_jsonb(row_value)::text like $1',
      item.schema_name,
      item.table_name
    ) into residue_count using '%' || run_marker || '%';
    if residue_count <> 0 then
      raise exception 'Synthetic run-marker residue remains in %.%: % row(s).',
        item.schema_name, item.table_name, residue_count;
    end if;
  end loop;
end
$verify$;

commit;
