create or replace function public.register_trade_evidence_v3(
  p_actor_id uuid,
  p_agreement_id uuid,
  p_submission_key text,
  p_evidence_type text,
  p_storage_path text default '',
  p_evidence_url text default '',
  p_attestation text default '',
  p_replaces_evidence_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog
as $function$
declare
  agreement_row public.agreements%rowtype;
  evidence_row public.trade_evidence_items%rowtype;
  prior_row public.trade_evidence_items%rowtype;
  counterpart_id uuid;
  normalized_key text := btrim(coalesce(p_submission_key, ''));
  normalized_type text := btrim(coalesce(p_evidence_type, ''));
  normalized_storage_path text := btrim(coalesce(p_storage_path, ''));
  normalized_url text := btrim(coalesce(p_evidence_url, ''));
  normalized_attestation text := btrim(coalesce(p_attestation, ''));
  remaining_challenges integer;
begin
  if p_actor_id is null or p_agreement_id is null then
    raise exception 'A signed-in agreement participant is required.';
  end if;
  if normalized_key = '' or length(normalized_key) > 200 then
    raise exception 'A bounded evidence submission key is required.';
  end if;
  if normalized_type not in ('file', 'link', 'attestation') then
    raise exception 'Unsupported evidence type.';
  end if;
  if length(normalized_storage_path) > 2000
     or length(normalized_url) > 2000
     or length(normalized_attestation) > 5000 then
    raise exception 'Evidence fields are too long.';
  end if;

  select * into evidence_row
  from public.trade_evidence_items
  where submitted_by = p_actor_id and submission_key = normalized_key
  limit 1;
  if evidence_row.id is not null then
    if evidence_row.agreement_id <> p_agreement_id then
      raise exception 'Evidence submission key belongs to another agreement.';
    end if;
    return jsonb_build_object(
      'evidenceId', evidence_row.id,
      'status', evidence_row.status,
      'created', false
    );
  end if;

  select * into agreement_row
  from public.agreements
  where id = p_agreement_id
    and p_actor_id in (proposer_id, responder_id)
  for update;
  if not found then
    raise exception 'Agreement not found or access denied.';
  end if;
  if agreement_row.lifecycle_status not in ('active', 'evidence_due', 'disputed') then
    raise exception 'Evidence can be submitted only after bilateral activation.';
  end if;

  if normalized_type = 'file' then
    if normalized_storage_path = ''
       or split_part(normalized_storage_path, '/', 1) <> p_agreement_id::text
       or split_part(normalized_storage_path, '/', 2) <> p_actor_id::text
       or split_part(normalized_storage_path, '/', 3) <> 'private'
       or split_part(normalized_storage_path, '/', 4) = '' then
      raise exception 'Private evidence file path is invalid.';
    end if;
    if normalized_url <> '' or normalized_attestation <> '' then
      raise exception 'Submit one evidence source at a time.';
    end if;
  elsif normalized_type = 'link' then
    if normalized_url !~* '^https?://' then
      raise exception 'Evidence link must use http or https.';
    end if;
    if normalized_storage_path <> '' or normalized_attestation <> '' then
      raise exception 'Submit one evidence source at a time.';
    end if;
  else
    if normalized_attestation = '' then
      raise exception 'Write an attestation before submitting.';
    end if;
    if normalized_storage_path <> '' or normalized_url <> '' then
      raise exception 'Submit one evidence source at a time.';
    end if;
  end if;

  if p_replaces_evidence_id is not null then
    select * into prior_row
    from public.trade_evidence_items
    where id = p_replaces_evidence_id
    for update;
    if prior_row.id is null
       or prior_row.agreement_id <> p_agreement_id
       or prior_row.submitted_by <> p_actor_id
       or prior_row.status not in ('submitted', 'challenged') then
      raise exception 'Replacement evidence must reference an open item from the same submitter and agreement.';
    end if;
  end if;

  insert into public.trade_evidence_items(
    agreement_id,
    submitted_by,
    submission_key,
    evidence_type,
    storage_path,
    evidence_url,
    attestation,
    status,
    public_visibility,
    public_title,
    public_summary,
    public_url,
    public_storage_path,
    public_original_filename,
    public_mime_type,
    public_redaction_note,
    redaction_status,
    public_published_at,
    replaces_evidence_id,
    created_at
  ) values (
    p_agreement_id,
    p_actor_id,
    normalized_key,
    normalized_type,
    normalized_storage_path,
    normalized_url,
    normalized_attestation,
    'submitted',
    'private',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    'withheld',
    null,
    p_replaces_evidence_id,
    now()
  ) returning * into evidence_row;

  if prior_row.id is not null then
    update public.trade_evidence_items
    set status = 'replaced',
        replaced_at = now(),
        reviewed_at = now(),
        public_visibility = 'private',
        public_title = '',
        public_summary = '',
        public_url = '',
        public_storage_path = '',
        public_original_filename = '',
        public_mime_type = '',
        public_redaction_note = '',
        redaction_status = 'withheld',
        public_published_at = null
    where id = prior_row.id;
  end if;

  select count(*) into remaining_challenges
  from public.trade_evidence_items
  where agreement_id = p_agreement_id and status = 'challenged';

  perform set_config('app.core_trade_internal', '1', true);
  update public.agreements
  set lifecycle_status = case when remaining_challenges > 0 then 'disputed' else 'evidence_due' end,
      status = 'active',
      public_evidence_enabled = exists (
        select 1
        from public.trade_evidence_items public_item
        where public_item.agreement_id = p_agreement_id
          and public_item.public_visibility = 'public'
          and public_item.public_published_at is not null
          and public_item.redaction_status in ('redacted', 'not_required')
          and public_item.status not in ('withdrawn', 'replaced')
      ),
      updated_at = now(),
      public_evidence_updated_at = now()
  where id = p_agreement_id;

  begin
    insert into public.core_loop_events(
      profile_id, event_type, entity_type, entity_id, idempotency_key, metadata, created_at
    ) values (
      p_actor_id,
      'evidence_submitted',
      'evidence',
      evidence_row.id,
      'evidence_submitted:' || p_actor_id::text || ':evidence:' || evidence_row.id::text,
      jsonb_build_object(
        'agreementId', p_agreement_id,
        'replacesEvidenceId', p_replaces_evidence_id,
        'visibility', 'private'
      ),
      now()
    )
    on conflict (idempotency_key) do nothing;
  exception when others then
    null;
  end;

  counterpart_id := case
    when agreement_row.proposer_id = p_actor_id then agreement_row.responder_id
    else agreement_row.proposer_id
  end;
  begin
    insert into public.trade_notifications(
      user_id, notification_type, title, body, href, dedupe_key, created_at
    ) values (
      counterpart_id,
      'evidence_submitted',
      'Private evidence submitted',
      case when prior_row.id is null
        then 'A participant submitted private evidence for your review.'
        else 'A participant replaced an evidence item. Review the new private evidence.'
      end,
      '/trade-agreements/' || p_agreement_id::text,
      'evidence_submitted:' || evidence_row.id::text || ':' || counterpart_id::text,
      now()
    )
    on conflict (dedupe_key) do nothing;
  exception when others then
    null;
  end;

  return jsonb_build_object(
    'evidenceId', evidence_row.id,
    'status', evidence_row.status,
    'replacedEvidenceId', prior_row.id,
    'visibility', 'private',
    'created', true
  );
end;
$function$;

create or replace function public.publish_trade_evidence_v3(
  p_actor_id uuid,
  p_evidence_id uuid,
  p_public_title text default '',
  p_public_summary text default '',
  p_public_url text default '',
  p_public_storage_path text default '',
  p_public_original_filename text default '',
  p_public_mime_type text default '',
  p_public_redaction_note text default ''
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog
as $function$
declare
  evidence_row public.trade_evidence_items%rowtype;
  agreement_row public.agreements%rowtype;
  normalized_title text := btrim(coalesce(p_public_title, ''));
  normalized_summary text := btrim(coalesce(p_public_summary, ''));
  normalized_url text := btrim(coalesce(p_public_url, ''));
  normalized_storage_path text := btrim(coalesce(p_public_storage_path, ''));
  normalized_filename text := btrim(coalesce(p_public_original_filename, ''));
  normalized_mime_type text := btrim(coalesce(p_public_mime_type, ''));
  normalized_note text := btrim(coalesce(p_public_redaction_note, ''));
  redaction_state text;
begin
  if p_actor_id is null or p_evidence_id is null then
    raise exception 'A signed-in evidence submitter is required.';
  end if;
  if length(normalized_title) > 300
     or length(normalized_summary) > 5000
     or length(normalized_url) > 2000
     or length(normalized_storage_path) > 2000
     or length(normalized_filename) > 500
     or length(normalized_mime_type) > 200
     or length(normalized_note) > 2000 then
    raise exception 'Public evidence fields are too long.';
  end if;
  if normalized_note = '' then
    raise exception 'Describe what was removed or reviewed before publication.';
  end if;

  select * into evidence_row
  from public.trade_evidence_items
  where id = p_evidence_id
  for update;
  if not found or evidence_row.submitted_by <> p_actor_id then
    raise exception 'Evidence not found or access denied.';
  end if;
  if evidence_row.status in ('withdrawn', 'replaced') then
    raise exception 'Withdrawn or replaced evidence cannot be published.';
  end if;

  select * into agreement_row
  from public.agreements
  where id = evidence_row.agreement_id
    and p_actor_id in (proposer_id, responder_id)
  for update;
  if not found then
    raise exception 'Agreement not found or access denied.';
  end if;

  if evidence_row.evidence_type = 'file' then
    if normalized_storage_path = ''
       or normalized_storage_path = evidence_row.storage_path
       or split_part(normalized_storage_path, '/', 1) <> evidence_row.agreement_id::text
       or split_part(normalized_storage_path, '/', 2) <> p_actor_id::text
       or split_part(normalized_storage_path, '/', 3) <> 'public'
       or split_part(normalized_storage_path, '/', 4) = ''
       or normalized_filename = ''
       or normalized_mime_type = '' then
      raise exception 'A separate reviewed public-safe file is required.';
    end if;
    if normalized_url <> '' then
      raise exception 'Publish either a public file or a public URL, not both.';
    end if;
    redaction_state := 'redacted';
  elsif evidence_row.evidence_type = 'link' then
    if normalized_url !~* '^https?://' then
      raise exception 'A public evidence link must use http or https.';
    end if;
    if normalized_storage_path <> '' then
      raise exception 'Publish either a public file or a public URL, not both.';
    end if;
    redaction_state := 'not_required';
  elsif evidence_row.evidence_type = 'attestation' then
    if normalized_summary = '' then
      raise exception 'Write a public-safe summary instead of publishing the private attestation verbatim.';
    end if;
    if normalized_url <> '' or normalized_storage_path <> '' then
      raise exception 'Attestation publication uses the public-safe summary only.';
    end if;
    redaction_state := 'redacted';
  else
    raise exception 'Provider evidence cannot be published through this participant workflow.';
  end if;

  update public.trade_evidence_items
  set public_visibility = 'public',
      public_title = normalized_title,
      public_summary = normalized_summary,
      public_url = normalized_url,
      public_storage_path = normalized_storage_path,
      public_original_filename = normalized_filename,
      public_mime_type = normalized_mime_type,
      public_redaction_note = normalized_note,
      redaction_status = redaction_state,
      public_published_at = now()
  where id = p_evidence_id;

  perform set_config('app.core_trade_internal', '1', true);
  update public.agreements
  set public_evidence_enabled = true,
      public_evidence_updated_at = now(),
      updated_at = now()
  where id = evidence_row.agreement_id;

  return jsonb_build_object(
    'evidenceId', p_evidence_id,
    'visibility', 'public',
    'redactionStatus', redaction_state,
    'published', true
  );
end;
$function$;

create or replace function public.review_trade_evidence_v3(
  p_actor_id uuid,
  p_evidence_id uuid,
  p_decision text,
  p_challenge_reason text default ''
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog
as $function$
declare
  evidence_row public.trade_evidence_items%rowtype;
  agreement_row public.agreements%rowtype;
  remaining_challenges integer;
  normalized_reason text := btrim(coalesce(p_challenge_reason, ''));
begin
  if p_actor_id is null or p_evidence_id is null then
    raise exception 'A signed-in counterparty is required.';
  end if;
  if p_decision not in ('accept', 'challenge') then
    raise exception 'Choose accept or challenge.';
  end if;
  if length(normalized_reason) > 4000 then
    raise exception 'Challenge reason must be 4,000 characters or fewer.';
  end if;

  select * into evidence_row
  from public.trade_evidence_items
  where id = p_evidence_id
  for update;
  if not found then
    raise exception 'Evidence item is unavailable.';
  end if;

  select * into agreement_row
  from public.agreements
  where id = evidence_row.agreement_id
    and p_actor_id in (proposer_id, responder_id)
  for update;
  if not found or p_actor_id = evidence_row.submitted_by then
    raise exception 'Only the counterparty may review submitted evidence.';
  end if;

  if (p_decision = 'accept' and evidence_row.status = 'accepted')
     or (p_decision = 'challenge' and evidence_row.status = 'challenged') then
    return jsonb_build_object(
      'evidenceId', evidence_row.id,
      'status', evidence_row.status,
      'idempotent', true
    );
  end if;
  if evidence_row.status <> 'submitted' then
    raise exception 'Evidence is no longer awaiting review.';
  end if;

  if p_decision = 'challenge' then
    if evidence_row.challenge_window_ends_at <= now() then
      raise exception 'The challenge window for this evidence item has closed.';
    end if;
    if normalized_reason = '' then
      raise exception 'State the factual or scope issue being challenged.';
    end if;
    update public.trade_evidence_items
    set status = 'challenged',
        challenge_reason = normalized_reason,
        reviewed_at = now()
    where id = evidence_row.id;

    perform set_config('app.core_trade_internal', '1', true);
    update public.agreements
    set lifecycle_status = 'disputed',
        status = 'active',
        updated_at = now()
    where id = agreement_row.id;
  else
    update public.trade_evidence_items
    set status = 'accepted',
        challenge_reason = '',
        reviewed_at = now()
    where id = evidence_row.id;

    select count(*) into remaining_challenges
    from public.trade_evidence_items
    where agreement_id = agreement_row.id and status = 'challenged';
    if agreement_row.lifecycle_status = 'disputed' and remaining_challenges = 0 then
      perform set_config('app.core_trade_internal', '1', true);
      update public.agreements
      set lifecycle_status = 'evidence_due',
          status = 'active',
          updated_at = now()
      where id = agreement_row.id;
    end if;
  end if;

  begin
    insert into public.trade_notifications(
      user_id, notification_type, title, body, href, dedupe_key, created_at
    ) values (
      evidence_row.submitted_by,
      case when p_decision = 'accept' then 'evidence_accepted' else 'evidence_challenged' end,
      case when p_decision = 'accept' then 'Evidence accepted' else 'Evidence challenged' end,
      case when p_decision = 'accept'
        then 'The counterparty accepted the submitted evidence.'
        else 'The counterparty challenged an evidence item. Review the stated reason in the agreement record.'
      end,
      '/trade-agreements/' || agreement_row.id::text,
      case when p_decision = 'accept'
        then 'evidence_accepted:' || evidence_row.id::text
        else 'evidence_challenged:' || evidence_row.id::text
      end,
      now()
    )
    on conflict (dedupe_key) do nothing;
  exception when others then
    null;
  end;

  return jsonb_build_object(
    'evidenceId', evidence_row.id,
    'status', case when p_decision = 'accept' then 'accepted' else 'challenged' end,
    'idempotent', false
  );
end;
$function$;

create or replace function public.withdraw_trade_evidence_v3(
  p_actor_id uuid,
  p_evidence_id uuid,
  p_reason text default ''
)
returns jsonb
language plpgsql
security definer
set search_path = pg_catalog
as $function$
declare
  evidence_row public.trade_evidence_items%rowtype;
  agreement_row public.agreements%rowtype;
  counterpart_id uuid;
  remaining_challenges integer;
  remaining_open_or_accepted integer;
  next_lifecycle text;
  normalized_reason text := btrim(coalesce(p_reason, ''));
begin
  if p_actor_id is null or p_evidence_id is null then
    raise exception 'A signed-in evidence submitter is required.';
  end if;
  if length(normalized_reason) > 4000 then
    raise exception 'Withdrawal reason must be 4,000 characters or fewer.';
  end if;

  select * into evidence_row
  from public.trade_evidence_items
  where id = p_evidence_id
  for update;
  if not found then
    raise exception 'Evidence item is unavailable.';
  end if;
  if evidence_row.status = 'withdrawn' then
    return jsonb_build_object(
      'evidenceId', evidence_row.id,
      'status', 'withdrawn',
      'idempotent', true
    );
  end if;
  if evidence_row.submitted_by <> p_actor_id
     or evidence_row.status not in ('submitted', 'challenged') then
    raise exception 'Only the submitter may withdraw open evidence.';
  end if;

  select * into agreement_row
  from public.agreements
  where id = evidence_row.agreement_id
    and p_actor_id in (proposer_id, responder_id)
  for update;
  if not found then
    raise exception 'Agreement not found or access denied.';
  end if;

  update public.trade_evidence_items
  set status = 'withdrawn',
      withdrawn_at = now(),
      withdrawal_reason = normalized_reason,
      reviewed_at = now(),
      public_visibility = 'private',
      public_title = '',
      public_summary = '',
      public_url = '',
      public_storage_path = '',
      public_original_filename = '',
      public_mime_type = '',
      public_redaction_note = '',
      redaction_status = 'withheld',
      public_published_at = null
  where id = evidence_row.id;

  select count(*) into remaining_challenges
  from public.trade_evidence_items
  where agreement_id = agreement_row.id and status = 'challenged';
  select count(*) into remaining_open_or_accepted
  from public.trade_evidence_items
  where agreement_id = agreement_row.id
    and status in ('submitted', 'accepted', 'challenged');
  next_lifecycle := case
    when remaining_challenges > 0 then 'disputed'
    when remaining_open_or_accepted > 0 then 'evidence_due'
    else 'active'
  end;

  perform set_config('app.core_trade_internal', '1', true);
  update public.agreements
  set lifecycle_status = next_lifecycle,
      status = 'active',
      public_evidence_enabled = exists (
        select 1
        from public.trade_evidence_items public_item
        where public_item.agreement_id = agreement_row.id
          and public_item.public_visibility = 'public'
          and public_item.public_published_at is not null
          and public_item.redaction_status in ('redacted', 'not_required')
          and public_item.status not in ('withdrawn', 'replaced')
      ),
      updated_at = now(),
      public_evidence_updated_at = now()
  where id = agreement_row.id;

  counterpart_id := case
    when agreement_row.proposer_id = p_actor_id then agreement_row.responder_id
    else agreement_row.proposer_id
  end;
  begin
    insert into public.trade_notifications(
      user_id, notification_type, title, body, href, dedupe_key, created_at
    ) values (
      counterpart_id,
      'evidence_withdrawn',
      'Evidence withdrawn',
      'The submitting participant withdrew an open evidence item. The durable activity record remains available.',
      '/trade-agreements/' || agreement_row.id::text,
      'evidence_withdrawn:' || evidence_row.id::text || ':' || counterpart_id::text,
      now()
    )
    on conflict (dedupe_key) do nothing;
  exception when others then
    null;
  end;

  return jsonb_build_object(
    'evidenceId', evidence_row.id,
    'status', 'withdrawn',
    'idempotent', false
  );
end;
$function$;

revoke all on function public.register_trade_evidence_v3(uuid, uuid, text, text, text, text, text, uuid) from public, anon, authenticated;
revoke all on function public.publish_trade_evidence_v3(uuid, uuid, text, text, text, text, text, text, text) from public, anon, authenticated;
revoke all on function public.review_trade_evidence_v3(uuid, uuid, text, text) from public, anon, authenticated;
revoke all on function public.withdraw_trade_evidence_v3(uuid, uuid, text) from public, anon, authenticated;
grant execute on function public.register_trade_evidence_v3(uuid, uuid, text, text, text, text, text, uuid) to service_role;
grant execute on function public.publish_trade_evidence_v3(uuid, uuid, text, text, text, text, text, text, text) to service_role;
grant execute on function public.review_trade_evidence_v3(uuid, uuid, text, text) to service_role;
grant execute on function public.withdraw_trade_evidence_v3(uuid, uuid, text) to service_role;
