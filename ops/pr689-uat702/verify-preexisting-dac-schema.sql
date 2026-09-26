begin;
set transaction read only;

do $verify$
declare
  missing_relations text[];
  missing_functions text[];
  status_constraint text;
  lock_constraint text;
  event_constraint text;
  pledge_event_constraint text;
begin
  select array_agg(relation_name order by relation_name)
  into missing_relations
  from unnest(array[
    'public.mpgf_pool_reviewers',
    'public.mpgf_pool_proposal_versions',
    'public.mpgf_pool_lifecycle_events',
    'public.mpgf_dac_pledge_intents',
    'public.mpgf_dac_pledge_events',
    'public.mpgf_dac_campaign_outcomes'
  ]) as required(relation_name)
  where to_regclass(relation_name) is null;

  if missing_relations is not null then
    raise exception 'Missing reviewed DAC relations: %', missing_relations;
  end if;

  select array_agg(function_signature order by function_signature)
  into missing_functions
  from unnest(array[
    'public.mpgf_begin_pool_proposal_review(uuid,uuid,text)',
    'public.mpgf_request_pool_proposal_changes(uuid,uuid,text)',
    'public.mpgf_reject_pool_proposal(uuid,uuid,text)',
    'public.mpgf_approve_and_freeze_pool_proposal(uuid,uuid,text)',
    'public.mpgf_publish_pool_proposal(uuid,text,text,uuid,text)',
    'public.mpgf_create_dac_pledge(text,bigint,text,text,text)',
    'public.mpgf_review_dac_pledge_eligibility(uuid,uuid,text,integer,text)',
    'public.mpgf_finalize_dac_campaign(text,uuid,text)',
    'public.mpgf_public_dac_campaign_terms(text)'
  ]) as required(function_signature)
  where to_regprocedure(function_signature) is null;

  if missing_functions is not null then
    raise exception 'Missing reviewed DAC functions: %', missing_functions;
  end if;

  if not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'mpgf_pool_proposals'
      and column_name = 'operative_terms_sha256'
  ) then
    raise exception 'Frozen-terms schema is absent.';
  end if;

  if not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'mpgf_public_goods_campaigns'
      and column_name = 'pool_proposal_id'
  ) then
    raise exception 'Publication materialization schema is absent.';
  end if;

  select pg_get_constraintdef(oid, true)
  into status_constraint
  from pg_constraint
  where conrelid = 'public.mpgf_pool_proposals'::regclass
    and conname = 'mpgf_pool_proposals_status_check';

  select pg_get_constraintdef(oid, true)
  into lock_constraint
  from pg_constraint
  where conrelid = 'public.mpgf_pool_proposals'::regclass
    and conname = 'mpgf_pool_proposals_lock_complete';

  select pg_get_constraintdef(oid, true)
  into event_constraint
  from pg_constraint
  where conrelid = 'public.mpgf_pool_lifecycle_events'::regclass
    and conname = 'mpgf_pool_lifecycle_events_event_type_check';

  select pg_get_constraintdef(oid, true)
  into pledge_event_constraint
  from pg_constraint
  where conrelid = 'public.mpgf_dac_pledge_events'::regclass
    and conname = 'mpgf_dac_pledge_events_type_valid';

  if status_constraint is null
     or position('succeeded' in status_constraint) = 0
     or position('lapsed' in status_constraint) = 0 then
    raise exception 'Terminal proposal status constraint is not reconciled.';
  end if;

  if lock_constraint is null
     or position('succeeded' in lock_constraint) = 0
     or position('lapsed' in lock_constraint) = 0 then
    raise exception 'Terminal frozen-terms constraint is not reconciled.';
  end if;

  if event_constraint is null
     or position('pool_published' in event_constraint) = 0
     or position('pool_succeeded' in event_constraint) = 0
     or position('pool_lapsed' in event_constraint) = 0 then
    raise exception 'Terminal lifecycle event constraint is not reconciled.';
  end if;

  if pledge_event_constraint is null
     or position('eligibility_reviewed' in pledge_event_constraint) = 0
     or position('pledge_expired' in pledge_event_constraint) = 0 then
    raise exception 'Terminal pledge event constraint is not reconciled.';
  end if;

  if exists (
    select 1
    from unnest(array[
      'public.mpgf_pool_reviewers',
      'public.mpgf_pool_proposal_versions',
      'public.mpgf_pool_lifecycle_events',
      'public.mpgf_dac_pledge_intents',
      'public.mpgf_dac_pledge_events',
      'public.mpgf_dac_campaign_outcomes'
    ]) as required(relation_name)
    join pg_class relation on relation.oid = to_regclass(required.relation_name)
    where relation.relrowsecurity is not true
  ) then
    raise exception 'A reviewed DAC relation does not have row-level security enabled.';
  end if;
end
$verify$;

select jsonb_build_object(
  'verified_preexisting_candidate_migrations', 7,
  'required_relations', 6,
  'required_functions', 9,
  'terminal_constraints', 4,
  'rls_relations', 6,
  'result', 'passed'
) as preexisting_dac_schema_verification;

rollback;
