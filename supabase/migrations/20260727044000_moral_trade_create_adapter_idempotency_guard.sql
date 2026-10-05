-- Make Create submissions race-safe and reject idempotency-key reuse with changed terms.
begin;

do $migration$
declare
  function_definition text;
  old_block text := $old$
  select * into existing_submission
  from public.moral_trade_create_submissions
  where owner_profile_id = actor_id
    and (submission_key = p_submission_key or source_payload_hash = p_payload_hash)
  order by created_at
  limit 1;

  if existing_submission.id is not null then
    return query select
      existing_submission.id,
      existing_submission.target_type,
      existing_submission.target_id,
      existing_submission.status,
      existing_submission.canonical_path;
    return;
  end if;
$old$;
  new_block text := $new$
  perform pg_advisory_xact_lock(
    hashtextextended(actor_id::text || ':create-key:' || p_submission_key, 0)
  );
  perform pg_advisory_xact_lock(
    hashtextextended(actor_id::text || ':create-hash:' || p_payload_hash, 0)
  );

  select * into existing_submission
  from public.moral_trade_create_submissions
  where owner_profile_id = actor_id
    and submission_key = p_submission_key
  limit 1;

  if existing_submission.id is not null then
    if existing_submission.source_payload_hash <> p_payload_hash
       or existing_submission.source_payload_json is distinct from p_source_payload then
      raise exception using
        errcode = '23514',
        message = 'This Create submission key was already used for different terms.';
    end if;

    return query select
      existing_submission.id,
      existing_submission.target_type,
      existing_submission.target_id,
      existing_submission.status,
      existing_submission.canonical_path;
    return;
  end if;

  select * into existing_submission
  from public.moral_trade_create_submissions
  where owner_profile_id = actor_id
    and source_payload_hash = p_payload_hash
  limit 1;

  if existing_submission.id is not null then
    if existing_submission.source_payload_json is distinct from p_source_payload then
      raise exception using
        errcode = '23514',
        message = 'A Create payload hash collision was detected.';
    end if;

    return query select
      existing_submission.id,
      existing_submission.target_type,
      existing_submission.target_id,
      existing_submission.status,
      existing_submission.canonical_path;
    return;
  end if;

  if p_source_payload ->> 'interfaceVersion' <> 'moral_trade_create_v1'
     or p_source_payload ->> 'submissionKey' <> p_submission_key
     or btrim(coalesce(p_source_payload ->> 'cause', '')) <> btrim(p_cause_area)
     or p_source_payload ->> 'requestKind' <> p_request_kind
     or btrim(coalesce(p_source_payload ->> 'requestAction', '')) <> btrim(p_requested_action)
     or coalesce(p_source_payload -> 'offers', '[]'::jsonb) is distinct from p_offered_terms then
    raise exception using
      errcode = '23514',
      message = 'The Create payload does not match its validated persistence fields.';
  end if;

  if jsonb_typeof(p_target_fields) <> 'object' then
    raise exception using errcode = '22023', message = 'Create target fields must be an object.';
  end if;
  if p_submission_kind = 'pool_create' and jsonb_typeof(p_pool_terms) <> 'object' then
    raise exception using errcode = '22023', message = 'Direct pool submissions require validated pool terms.';
  end if;
  if p_submission_kind <> 'pool_create' and p_pool_terms is not null then
    raise exception using errcode = '22023', message = 'Only direct pool submissions may include pool terms.';
  end if;
$new$;
begin
  select pg_get_functiondef(
    'public.moral_trade_create_submit_service(uuid,text,text,jsonb,text,text,text,text,text,jsonb,jsonb,jsonb)'::regprocedure
  ) into function_definition;

  if position(new_block in function_definition) > 0 then
    return;
  end if;
  if position(old_block in function_definition) = 0 then
    raise exception using
      errcode = 'P0001',
      message = 'Could not locate the Create adapter idempotency block to harden.';
  end if;

  execute replace(function_definition, old_block, new_block);
end;
$migration$;

commit;
