begin;

-- Synthetic fixtures only. The surrounding transaction removes every row.
insert into auth.users (
  id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, confirmation_token, recovery_token,
  email_change_token_new, email_change_token_current, reauthentication_token,
  is_sso_user, is_anonymous, created_at, updated_at
) values
  ('68100000-0000-4000-8000-000000000001','00000000-0000-0000-0000-000000000000','authenticated','authenticated','sparks-owner@example.test','',now(),'{}','{}','','','','','',false,false,now(),now()),
  ('68100000-0000-4000-8000-000000000002','00000000-0000-0000-0000-000000000000','authenticated','authenticated','sparks-other@example.test','',now(),'{}','{}','','','','','',false,false,now(),now());

insert into public.profiles (id, email, display_name)
values
  ('68100000-0000-4000-8000-000000000001','sparks-owner@example.test','Sparks Owner'),
  ('68100000-0000-4000-8000-000000000002','sparks-other@example.test','Sparks Other');

do $test$
declare
  general_allocation jsonb := '[
    {"id":"ai-safety","label":"AI safety","causeArea":"Existential risk","sparks":10,"share":50,"rank":1},
    {"id":"global-health","label":"Global health","causeArea":"Public health","sparks":10,"share":50,"rank":1}
  ]'::jsonb;
begin
  if not public.profile_priority_allocation_is_valid(general_allocation) then
    raise exception 'valid allocation was rejected';
  end if;
  if public.profile_priority_allocation_is_valid('[{"id":"ai-safety","sparks":21}]'::jsonb)
     or public.profile_priority_allocation_is_valid('[{"id":"unknown","sparks":1}]'::jsonb)
     or public.profile_priority_allocation_is_valid('[{"id":"ai-safety","sparks":1},{"id":"ai-safety","sparks":1}]'::jsonb)
     or public.profile_priority_allocation_is_valid('[{"id":"ai-safety","sparks":1.5}]'::jsonb) then
    raise exception 'malformed allocation was accepted';
  end if;
  if has_table_privilege('anon','public.profile_priority_resource_allocations','select')
     or has_table_privilege('anon','public.profile_priority_resource_allocations','insert') then
    raise exception 'anonymous role can access private resource allocations';
  end if;
  if not has_table_privilege('authenticated','public.profile_priority_resource_allocations','select')
     or not has_function_privilege('authenticated','public.replace_profile_priority_allocations_v1(jsonb,text[],jsonb)','execute') then
    raise exception 'authenticated owner cannot use the allocation contract';
  end if;
end;
$test$;

set local role authenticated;
select set_config('request.jwt.claim.sub','68100000-0000-4000-8000-000000000001',true);
select set_config('request.jwt.claim.role','authenticated',true);

select public.replace_profile_priority_allocations_v1(
  '[
    {"id":"ai-safety","label":"AI safety","causeArea":"Existential risk","sparks":10,"share":50,"rank":1},
    {"id":"global-health","label":"Global health","causeArea":"Public health","sparks":10,"share":50,"rank":1}
  ]'::jsonb,
  array['Existential risk','Public health'],
  '[
    {"resourceType":"money","allocation":[
      {"id":"global-health","label":"Global health","causeArea":"Public health","sparks":12,"share":60,"rank":1},
      {"id":"ai-safety","label":"AI safety","causeArea":"Existential risk","sparks":8,"share":40,"rank":2}
    ]},
    {"resourceType":"career","allocation":[
      {"id":"future-flourishing","label":"Future flourishing","causeArea":"Future flourishing","sparks":20,"share":100,"rank":1}
    ]}
  ]'::jsonb
);

do $test$
begin
  if (select count(*) from public.profile_priority_resource_allocations) <> 2 then
    raise exception 'owner did not receive exactly two explicit overrides';
  end if;
  if exists (
    select 1 from public.profile_priority_resource_allocations
    where resource_type = 'ordinary_action'
  ) then
    raise exception 'inherited resource was persisted as a duplicate row';
  end if;
  begin
    insert into public.profile_priority_resource_allocations (
      profile_id, resource_type, allocation
    ) values (
      '68100000-0000-4000-8000-000000000002',
      'skilled_work',
      '[{"id":"ai-safety","sparks":1}]'::jsonb
    );
    raise exception 'cross-profile insert was accepted';
  exception when insufficient_privilege then null;
  end;
end;
$test$;

-- Removing money from the replacement set proves reset deletes the stale override.
select public.replace_profile_priority_allocations_v1(
  '[
    {"id":"ai-safety","label":"AI safety","causeArea":"Existential risk","sparks":11,"share":55,"rank":1},
    {"id":"global-health","label":"Global health","causeArea":"Public health","sparks":9,"share":45,"rank":2}
  ]'::jsonb,
  array['Existential risk','Public health'],
  '[
    {"resourceType":"career","allocation":[
      {"id":"future-flourishing","label":"Future flourishing","causeArea":"Future flourishing","sparks":20,"share":100,"rank":1}
    ]}
  ]'::jsonb
);

do $test$
begin
  if exists (
    select 1 from public.profile_priority_resource_allocations
    where resource_type = 'money'
  ) then
    raise exception 'reset retained a hidden stale money override';
  end if;

  begin
    perform public.replace_profile_priority_allocations_v1(
      '[{"id":"ai-safety","sparks":20}]'::jsonb,
      array['Existential risk'],
      '[{"resourceType":"career","allocation":[{"id":"ai-safety","sparks":21}]}]'::jsonb
    );
    raise exception 'invalid override replacement was accepted';
  exception when check_violation then null;
  end;

  if (select priority_allocations -> 0 ->> 'sparks'
      from public.cohort_onboarding_profiles
      where profile_id = '68100000-0000-4000-8000-000000000001') <> '11' then
    raise exception 'failed replacement partially changed the general allocation';
  end if;
  if (select count(*) from public.profile_priority_resource_allocations) <> 1 then
    raise exception 'failed replacement partially changed the override set';
  end if;
end;
$test$;

reset role;

insert into public.profile_priority_resource_allocations (
  profile_id, resource_type, allocation
) values (
  '68100000-0000-4000-8000-000000000002',
  'money',
  '[{"id":"ai-safety","sparks":1}]'::jsonb
);

set local role authenticated;
select set_config('request.jwt.claim.sub','68100000-0000-4000-8000-000000000001',true);
select set_config('request.jwt.claim.role','authenticated',true);

do $test$
begin
  if exists (
    select 1 from public.profile_priority_resource_allocations
    where profile_id = '68100000-0000-4000-8000-000000000002'
  ) then
    raise exception 'owner-only select leaked another profile vector';
  end if;
end;
$test$;

rollback;
