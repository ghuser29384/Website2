-- Harden the private blind-audit calibration workflow before any release.
--
-- This migration narrows reviewer conflicts to the full review lineage,
-- prevents stale superseded targets from being assigned or labelled, limits
-- private receipt-file access to the exact receipt projected in the blinded
-- workspace, makes label replay payload-exact, and records expired or stale
-- assignments without touching any participant-facing or active-credibility
-- state.

create or replace function moral_trade_private.calibration_draw_is_current_v1(
  p_draw_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $function$
  select coalesce((
    select case draw.target_type
      when 'evidence_decision' then
        draw.evidence_decision_id is not null
        and not exists (
          select 1
          from public.trade_evidence_decisions successor
          where successor.supersedes_decision_id = draw.evidence_decision_id
        )
      when 'settlement_decision' then
        draw.settlement_decision_id is not null
        and not exists (
          select 1
          from public.trade_settlement_shadow_decisions successor
          where successor.supersedes_decision_id = draw.settlement_decision_id
        )
      else false
    end
    from public.evidence_credibility_calibration_draws draw
    where draw.id = p_draw_id
  ), false);
$function$;

create or replace function moral_trade_private.calibration_conflicted_reviewer_ids_v1(
  p_draw_id uuid
)
returns uuid[]
language sql
stable
security definer
set search_path = ''
as $function$
  with target as (
    select draw.*
    from public.evidence_credibility_calibration_draws draw
    where draw.id = p_draw_id
  ), candidates as (
    select target.subject_profile_id as profile_id from target
    union all
    select target.counterparty_profile_id from target
    union all
    select review.reviewer_id
    from target
    join public.trade_milestone_reviews review
      on review.milestone_id = target.milestone_id
    union all
    select payment_decision.reviewer_id
    from target
    join public.trade_milestone_payouts payout
      on payout.milestone_id = target.milestone_id
    join public.trade_payment_review_cases review_case
      on review_case.payout_id = payout.id
    join public.trade_payment_review_decisions payment_decision
      on payment_decision.case_id = review_case.id
  )
  select coalesce(
    array_agg(distinct candidates.profile_id order by candidates.profile_id)
      filter (where candidates.profile_id is not null),
    array[]::uuid[]
  )
  from candidates;
$function$;

create or replace function moral_trade_private.calibration_projected_receipt_id_v1(
  p_draw_id uuid
)
returns uuid
language sql
stable
security definer
set search_path = ''
as $function$
  select receipt.id
  from public.evidence_credibility_calibration_draws draw
  join public.trade_settlement_shadow_decisions settlement_decision
    on settlement_decision.id = draw.settlement_decision_id
  left join public.trade_payment_review_decisions payment_decision
    on payment_decision.id = settlement_decision.payment_review_decision_id
  join lateral (
    select candidate_receipt.id
    from public.trade_external_payment_receipts candidate_receipt
    where candidate_receipt.payout_id = settlement_decision.payout_id
      and (
        payment_decision.receipt_id is null
        or candidate_receipt.id = payment_decision.receipt_id
      )
    order by candidate_receipt.payment_cycle desc,
      candidate_receipt.attempt_number desc,
      candidate_receipt.reported_at desc,
      candidate_receipt.id desc
    limit 1
  ) receipt on true
  where draw.id = p_draw_id
    and draw.target_type = 'settlement_decision';
$function$;

revoke all on function moral_trade_private.calibration_draw_is_current_v1(uuid)
  from public, anon, authenticated, service_role;
revoke all on function moral_trade_private.calibration_conflicted_reviewer_ids_v1(uuid)
  from public, anon, authenticated, service_role;
revoke all on function moral_trade_private.calibration_projected_receipt_id_v1(uuid)
  from public, anon, authenticated, service_role;

create or replace function public.reconcile_evidence_credibility_calibration_assignments_v1()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  assignment_row public.evidence_credibility_calibration_audit_assignments%rowtype;
  current_target boolean;
  event_type_value text;
  reason_value text;
  next_sequence integer;
  expired_count integer := 0;
  excluded_count integer := 0;
begin
  perform moral_trade_private.require_calibration_audit_administrator();

  for assignment_row in
    select assignment.*
    from public.evidence_credibility_calibration_audit_assignments assignment
    where not exists (
        select 1
        from public.evidence_credibility_calibration_labels label
        where label.assignment_id = assignment.id
      )
      and not exists (
        select 1
        from public.evidence_credibility_calibration_assignment_events terminal_event
        where terminal_event.assignment_id = assignment.id
          and terminal_event.event_type in ('completed', 'expired', 'excluded')
      )
      and (
        assignment.expires_at <= now()
        or not moral_trade_private.calibration_draw_is_current_v1(assignment.draw_id)
      )
    order by assignment.assigned_at, assignment.id
    for update of assignment
  loop
    current_target := moral_trade_private.calibration_draw_is_current_v1(
      assignment_row.draw_id
    );
    if not current_target then
      event_type_value := 'excluded';
      reason_value := 'target_superseded';
      excluded_count := excluded_count + 1;
    else
      event_type_value := 'expired';
      reason_value := 'assignment_window_expired';
      expired_count := expired_count + 1;
    end if;

    select coalesce(max(event.sequence_number), 0) + 1
    into next_sequence
    from public.evidence_credibility_calibration_assignment_events event
    where event.assignment_id = assignment_row.id;

    insert into public.evidence_credibility_calibration_assignment_events(
      assignment_id,
      sequence_number,
      event_type,
      reason,
      actor_id
    ) values (
      assignment_row.id,
      next_sequence,
      event_type_value,
      reason_value,
      auth.uid()
    );
  end loop;

  return jsonb_build_object(
    'expiredCount', expired_count,
    'excludedCount', excluded_count,
    'shadowOnly', true
  );
end;
$function$;

create or replace function public.list_evidence_credibility_calibration_assignment_queue_v1(
  p_limit integer default 100,
  p_offset integer default 0
)
returns table (
  draw_id uuid,
  case_code text,
  target_type text,
  sampling_stratum text,
  inclusion_probability numeric,
  selected_reason text,
  action_category text,
  role text,
  decision_finalized_at timestamptz,
  excluded_reviewer_ids uuid[]
)
language plpgsql
stable
security definer
set search_path = ''
as $function$
begin
  perform moral_trade_private.require_calibration_audit_administrator();
  if p_limit < 1 or p_limit > 500 or p_offset < 0 then
    raise exception 'Invalid calibration-assignment queue page.';
  end if;

  return query
  select
    draw.id,
    'AUD-' || upper(substr(replace(draw.id::text, '-', ''), 1, 12)),
    draw.target_type,
    draw.sampling_stratum,
    draw.inclusion_probability,
    draw.selected_reason,
    draw.category,
    draw.role,
    draw.decision_finalized_at,
    moral_trade_private.calibration_conflicted_reviewer_ids_v1(draw.id)
  from public.evidence_credibility_calibration_draws draw
  where draw.selected
    and moral_trade_private.calibration_draw_is_current_v1(draw.id)
    and not exists (
      select 1
      from public.evidence_credibility_calibration_audit_assignments assignment
      where assignment.draw_id = draw.id
    )
  order by draw.decision_finalized_at, draw.id
  limit p_limit
  offset p_offset;
end;
$function$;

create or replace function public.assign_evidence_credibility_calibration_audit_v1(
  p_draw_id uuid,
  p_reviewer_id uuid,
  p_request_key text,
  p_expires_at timestamptz default (now() + interval '14 days')
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  actor_id uuid := auth.uid();
  draw_row public.evidence_credibility_calibration_draws%rowtype;
  existing_assignment public.evidence_credibility_calibration_audit_assignments%rowtype;
  assignment_id_value uuid;
begin
  perform moral_trade_private.require_calibration_audit_administrator();
  if length(btrim(coalesce(p_request_key, ''))) not between 1 and 500 then
    raise exception 'Audit-assignment request key is invalid.';
  end if;
  if p_expires_at <= now() or p_expires_at > now() + interval '90 days' then
    raise exception 'Audit-assignment expiry must be within the next 90 days.';
  end if;

  select * into existing_assignment
  from public.evidence_credibility_calibration_audit_assignments assignment
  where assignment.request_key = p_request_key;
  if found then
    if existing_assignment.draw_id is distinct from p_draw_id
       or existing_assignment.reviewer_id is distinct from p_reviewer_id then
      raise exception 'The immutable audit-assignment request differs from this request.';
    end if;
    return jsonb_build_object(
      'assignmentId', existing_assignment.id,
      'status', 'replayed',
      'shadowOnly', true
    );
  end if;

  select * into draw_row
  from public.evidence_credibility_calibration_draws draw
  where draw.id = p_draw_id
  for share;
  if not found or not draw_row.selected then
    raise exception 'Only a selected calibration draw may be assigned.';
  end if;
  if not moral_trade_private.calibration_draw_is_current_v1(draw_row.id) then
    raise exception 'This calibration draw no longer represents the current terminal decision.';
  end if;
  if exists (
    select 1
    from public.evidence_credibility_calibration_audit_assignments assignment
    where assignment.draw_id = draw_row.id
  ) then
    raise exception 'This selected calibration draw is already assigned.';
  end if;
  if p_reviewer_id = any(
    moral_trade_private.calibration_conflicted_reviewer_ids_v1(draw_row.id)
  ) then
    raise exception 'The calibration reviewer must be independent of every reviewer in the decision lineage and both parties.';
  end if;
  if not exists (
    select 1
    from public.trade_review_role_grants reviewer_grant
    where reviewer_grant.profile_id = p_reviewer_id
      and reviewer_grant.role = 'reviewer'
      and reviewer_grant.active
      and reviewer_grant.revoked_at is null
  ) then
    raise exception 'The assigned profile is not an active Moral Trade reviewer.';
  end if;

  insert into public.evidence_credibility_calibration_audit_assignments(
    draw_id,
    reviewer_id,
    assigned_by,
    request_key,
    blinding_mode,
    expires_at
  ) values (
    draw_row.id,
    p_reviewer_id,
    actor_id,
    btrim(p_request_key),
    'procedural_partial',
    p_expires_at
  ) returning id into assignment_id_value;

  insert into public.evidence_credibility_calibration_assignment_events(
    assignment_id,
    sequence_number,
    event_type,
    actor_id
  ) values (
    assignment_id_value,
    1,
    'assigned',
    actor_id
  );

  return jsonb_build_object(
    'assignmentId', assignment_id_value,
    'status', 'assigned',
    'caseCode', 'AUD-' || upper(substr(replace(draw_row.id::text, '-', ''), 1, 12)),
    'shadowOnly', true
  );
end;
$function$;

create or replace function public.list_my_evidence_credibility_calibration_audits_v1(
  p_limit integer default 50,
  p_offset integer default 0
)
returns table (
  assignment_id uuid,
  case_code text,
  target_type text,
  assigned_at timestamptz,
  expires_at timestamptz,
  blinding_mode text,
  action_category text,
  obligation_description text,
  unit_label text,
  units_total numeric,
  indivisible boolean,
  evidence_rule text,
  no_trade_baseline text,
  maximum_amount_cents bigint,
  currency text,
  evidence_items jsonb,
  payment_receipt jsonb
)
language plpgsql
stable
security definer
set search_path = ''
as $function$
declare
  reviewer_id_value uuid := moral_trade_private.require_calibration_audit_reviewer();
begin
  if p_limit < 1 or p_limit > 100 or p_offset < 0 then
    raise exception 'Invalid blinded-audit page.';
  end if;

  return query
  select
    assignment.id,
    'AUD-' || upper(substr(replace(draw.id::text, '-', ''), 1, 12)),
    draw.target_type,
    assignment.assigned_at,
    assignment.expires_at,
    assignment.blinding_mode,
    milestone.action_category,
    milestone.description,
    milestone.unit_label,
    milestone.units_total,
    milestone.indivisible,
    milestone.evidence_rule,
    version.no_trade_baseline,
    milestone.maximum_amount_cents,
    milestone.currency,
    case when draw.target_type = 'evidence_decision' then coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'itemId', item.id,
          'evidenceType', item.evidence_type,
          'attestation', case when item.evidence_type = 'attestation'
            then item.attestation else '' end,
          'evidenceUrl', case when item.evidence_type = 'link'
            then item.evidence_url else '' end,
          'hasPrivateFile', item.evidence_type = 'file'
        ) order by item.created_at, item.id
      )
      from public.trade_evidence_decisions evidence_decision
      join public.trade_milestone_reviews review
        on review.id = evidence_decision.review_id
      join public.trade_evidence_bundle_items item
        on item.bundle_id = review.bundle_id
      where evidence_decision.id = draw.evidence_decision_id
    ), '[]'::jsonb) else '[]'::jsonb end,
    case when draw.target_type = 'settlement_decision' then coalesce((
      select jsonb_build_object(
        'receiptId', receipt.id,
        'provider', receipt.provider,
        'amountCents', receipt.amount_cents,
        'currency', receipt.currency,
        'paidOn', receipt.paid_on,
        'hasPrivateFile', length(btrim(receipt.receipt_storage_path)) > 0
      )
      from public.trade_external_payment_receipts receipt
      where receipt.id =
        moral_trade_private.calibration_projected_receipt_id_v1(draw.id)
    ), '{}'::jsonb) else '{}'::jsonb end
  from public.evidence_credibility_calibration_audit_assignments assignment
  join public.evidence_credibility_calibration_draws draw
    on draw.id = assignment.draw_id
  join public.trade_agreement_milestones milestone
    on milestone.id = draw.milestone_id
  join public.trade_agreement_versions version
    on version.id = milestone.agreement_version_id
   and version.agreement_id = milestone.agreement_id
  where assignment.reviewer_id = reviewer_id_value
    and assignment.expires_at > now()
    and moral_trade_private.calibration_draw_is_current_v1(draw.id)
    and not exists (
      select 1
      from public.evidence_credibility_calibration_labels label
      where label.assignment_id = assignment.id
    )
    and not exists (
      select 1
      from public.evidence_credibility_calibration_assignment_events terminal_event
      where terminal_event.assignment_id = assignment.id
        and terminal_event.event_type in ('completed', 'expired', 'excluded')
    )
  order by assignment.assigned_at, assignment.id
  limit p_limit
  offset p_offset;
end;
$function$;

create or replace function public.record_evidence_credibility_calibration_label_v1(
  p_assignment_id uuid,
  p_request_key text,
  p_final_status text,
  p_final_outcome numeric,
  p_final_finality_reason text,
  p_final_integrity_finding text,
  p_final_responsiveness_finding text,
  p_final_dispute_conduct_finding text,
  p_blinding_complete boolean,
  p_private_rationale text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  reviewer_id_value uuid := moral_trade_private.require_calibration_audit_reviewer();
  assignment_row public.evidence_credibility_calibration_audit_assignments%rowtype;
  draw_row public.evidence_credibility_calibration_draws%rowtype;
  existing_label public.evidence_credibility_calibration_labels%rowtype;
  label_id_value uuid;
  material_upheld_value boolean;
  absolute_error_value numeric(12, 10);
  label_hash_value text;
  next_sequence integer;
begin
  if length(btrim(coalesce(p_request_key, ''))) not between 1 and 500 then
    raise exception 'Calibration-label request key is invalid.';
  end if;
  if length(btrim(coalesce(p_private_rationale, ''))) not between 1 and 4000 then
    raise exception 'A private independent-review rationale is required.';
  end if;
  if p_final_status is null
     or p_final_status not in ('eligible', 'excluded', 'review_required') then
    raise exception 'Choose a permitted independent final status.';
  end if;
  if (p_final_status = 'eligible'
        and (p_final_outcome is null or p_final_outcome < 0 or p_final_outcome > 1))
     or (p_final_status <> 'eligible' and p_final_outcome is not null) then
    raise exception 'Independent outcome is inconsistent with the final status.';
  end if;

  select * into existing_label
  from public.evidence_credibility_calibration_labels label
  where label.request_key = p_request_key;
  if found then
    if existing_label.assignment_id is distinct from p_assignment_id
       or existing_label.final_status is distinct from p_final_status
       or existing_label.final_outcome is distinct from p_final_outcome
       or existing_label.final_finality_reason is distinct from btrim(p_final_finality_reason)
       or existing_label.final_integrity_finding is distinct from btrim(p_final_integrity_finding)
       or existing_label.final_responsiveness_finding is distinct from btrim(p_final_responsiveness_finding)
       or existing_label.final_dispute_conduct_finding is distinct from btrim(p_final_dispute_conduct_finding)
       or existing_label.blinding_complete is distinct from p_blinding_complete
       or existing_label.private_rationale is distinct from btrim(p_private_rationale)
       or existing_label.completed_by is distinct from reviewer_id_value then
      raise exception 'The immutable calibration-label request differs from this request.';
    end if;
    return jsonb_build_object(
      'labelId', existing_label.id,
      'status', 'replayed',
      'materiallyUpheld', existing_label.materially_upheld,
      'absoluteError', existing_label.absolute_error,
      'shadowOnly', true
    );
  end if;

  select * into assignment_row
  from public.evidence_credibility_calibration_audit_assignments assignment
  where assignment.id = p_assignment_id
  for update;
  if not found or assignment_row.reviewer_id <> reviewer_id_value then
    raise exception 'This blind calibration assignment is unavailable to the current reviewer.';
  end if;
  if assignment_row.expires_at <= now() then
    raise exception 'This blind calibration assignment has expired.';
  end if;
  if exists (
    select 1
    from public.evidence_credibility_calibration_assignment_events terminal_event
    where terminal_event.assignment_id = assignment_row.id
      and terminal_event.event_type in ('expired', 'excluded')
  ) then
    raise exception 'This blind calibration assignment is no longer eligible for review.';
  end if;
  if exists (
    select 1
    from public.evidence_credibility_calibration_labels label
    where label.assignment_id = assignment_row.id
  ) then
    raise exception 'This blind calibration assignment already has a terminal label.';
  end if;

  select * into draw_row
  from public.evidence_credibility_calibration_draws draw
  where draw.id = assignment_row.draw_id;
  if not found
     or not moral_trade_private.calibration_draw_is_current_v1(draw_row.id) then
    raise exception 'This blind calibration assignment no longer represents the current terminal decision.';
  end if;

  if draw_row.target_type = 'evidence_decision' then
    if p_final_finality_reason is null
       or p_final_finality_reason not in (
         'review_final', 'replacement_success', 'terminal_rejection',
         'replacement_expired', 'appeal_affirmed', 'appeal_overturned',
         'permissible_exit', 'force_majeure', 'mutual_cancellation',
         'unjustified_abandonment', 'unresolved_dispute', 'late_cure',
         'administrative_correction'
       ) then
      raise exception 'Choose a permitted independent evidence finality.';
    end if;
    if p_final_integrity_finding is null
       or p_final_integrity_finding not in (
         'not_assessed', 'supported_honest', 'reckless_misleading',
         'deliberate_fabrication'
       )
       or p_final_responsiveness_finding is null
       or p_final_responsiveness_finding not in (
         'not_assessed', 'on_time', 'late_cure', 'missed_deadline', 'excused'
       )
       or p_final_dispute_conduct_finding is null
       or p_final_dispute_conduct_finding not in (
         'not_assessed', 'cooperative', 'obstructive', 'retaliatory',
         'evidence_destruction', 'abusive_appeal'
       ) then
      raise exception 'Choose permitted independent evidence findings.';
    end if;
  elsif draw_row.target_type = 'settlement_decision' then
    if p_final_finality_reason is null
       or p_final_finality_reason not in (
         'confirmed', 'adjudicated_paid', 'adjudicated_unpaid', 'not_due',
         'unresolved_dispute', 'permissible_cancellation',
         'late_payment_cure', 'administrative_correction'
       ) then
      raise exception 'Choose a permitted independent settlement finality.';
    end if;
    if p_final_integrity_finding <> 'not_applicable'
       or p_final_responsiveness_finding <> 'not_applicable'
       or p_final_dispute_conduct_finding <> 'not_applicable' then
      raise exception 'Settlement labels must leave evidence-conduct findings not applicable.';
    end if;
    if p_final_status = 'eligible' and p_final_outcome not in (0, 1) then
      raise exception 'Independent settlement outcomes must be paid or still due.';
    end if;
  else
    raise exception 'The calibration target type is invalid.';
  end if;

  absolute_error_value := case
    when draw_row.original_outcome is not null and p_final_outcome is not null
      then abs(draw_row.original_outcome - p_final_outcome)
    else null
  end;

  material_upheld_value :=
    p_final_status = draw_row.original_status
    and p_final_finality_reason = draw_row.original_finality_reason
    and (
      (draw_row.original_outcome is null and p_final_outcome is null)
      or (
        draw_row.original_outcome is not null
        and p_final_outcome is not null
        and abs(draw_row.original_outcome - p_final_outcome) <= 0.05
      )
    )
    and (
      draw_row.target_type = 'settlement_decision'
      or (
        p_final_integrity_finding = draw_row.original_integrity_finding
        and p_final_responsiveness_finding = draw_row.original_responsiveness_finding
        and p_final_dispute_conduct_finding = draw_row.original_dispute_conduct_finding
      )
    );

  label_hash_value := encode(
    extensions.digest(
      convert_to(
        jsonb_build_object(
          'assignmentId', assignment_row.id,
          'snapshotHash', draw_row.snapshot_hash,
          'finalStatus', p_final_status,
          'finalOutcome', p_final_outcome,
          'finalFinalityReason', btrim(p_final_finality_reason),
          'finalIntegrityFinding', btrim(p_final_integrity_finding),
          'finalResponsivenessFinding', btrim(p_final_responsiveness_finding),
          'finalDisputeConductFinding', btrim(p_final_dispute_conduct_finding),
          'materiallyUpheld', material_upheld_value,
          'absoluteError', absolute_error_value,
          'blindingComplete', p_blinding_complete,
          'privateRationale', btrim(p_private_rationale)
        )::text,
        'UTF8'
      ),
      'sha256'
    ),
    'hex'
  );

  insert into public.evidence_credibility_calibration_labels(
    assignment_id,
    request_key,
    final_status,
    final_outcome,
    final_finality_reason,
    final_integrity_finding,
    final_responsiveness_finding,
    final_dispute_conduct_finding,
    materially_upheld,
    absolute_error,
    blinding_complete,
    private_rationale,
    label_hash,
    completed_by
  ) values (
    assignment_row.id,
    btrim(p_request_key),
    p_final_status,
    p_final_outcome,
    btrim(p_final_finality_reason),
    btrim(p_final_integrity_finding),
    btrim(p_final_responsiveness_finding),
    btrim(p_final_dispute_conduct_finding),
    material_upheld_value,
    absolute_error_value,
    p_blinding_complete,
    btrim(p_private_rationale),
    label_hash_value,
    reviewer_id_value
  ) returning id into label_id_value;

  select coalesce(max(event.sequence_number), 0) + 1
  into next_sequence
  from public.evidence_credibility_calibration_assignment_events event
  where event.assignment_id = assignment_row.id;

  insert into public.evidence_credibility_calibration_assignment_events(
    assignment_id,
    sequence_number,
    event_type,
    actor_id
  ) values (
    assignment_row.id,
    next_sequence,
    'completed',
    reviewer_id_value
  );

  return jsonb_build_object(
    'labelId', label_id_value,
    'status', 'completed',
    'materiallyUpheld', material_upheld_value,
    'absoluteError', absolute_error_value,
    'shadowOnly', true
  );
end;
$function$;

create or replace function public.can_access_my_evidence_credibility_calibration_file_v1(
  p_assignment_id uuid,
  p_item_kind text,
  p_item_id uuid
)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $function$
declare
  reviewer_id_value uuid := moral_trade_private.require_calibration_audit_reviewer();
begin
  if p_item_kind not in ('evidence_item', 'payment_receipt') then
    return false;
  end if;

  return exists (
    select 1
    from public.evidence_credibility_calibration_audit_assignments assignment
    join public.evidence_credibility_calibration_draws draw
      on draw.id = assignment.draw_id
    where assignment.id = p_assignment_id
      and assignment.reviewer_id = reviewer_id_value
      and assignment.expires_at > now()
      and moral_trade_private.calibration_draw_is_current_v1(draw.id)
      and not exists (
        select 1
        from public.evidence_credibility_calibration_labels label
        where label.assignment_id = assignment.id
      )
      and not exists (
        select 1
        from public.evidence_credibility_calibration_assignment_events terminal_event
        where terminal_event.assignment_id = assignment.id
          and terminal_event.event_type in ('completed', 'expired', 'excluded')
      )
      and (
        (
          p_item_kind = 'evidence_item'
          and draw.target_type = 'evidence_decision'
          and exists (
            select 1
            from public.trade_evidence_decisions evidence_decision
            join public.trade_milestone_reviews review
              on review.id = evidence_decision.review_id
            join public.trade_evidence_bundle_items item
              on item.bundle_id = review.bundle_id
            where evidence_decision.id = draw.evidence_decision_id
              and item.id = p_item_id
              and item.evidence_type = 'file'
              and length(btrim(item.storage_path)) > 0
          )
        )
        or (
          p_item_kind = 'payment_receipt'
          and draw.target_type = 'settlement_decision'
          and p_item_id =
            moral_trade_private.calibration_projected_receipt_id_v1(draw.id)
          and exists (
            select 1
            from public.trade_external_payment_receipts receipt
            where receipt.id = p_item_id
              and length(btrim(receipt.receipt_storage_path)) > 0
          )
        )
      )
  );
end;
$function$;

revoke all on function public.reconcile_evidence_credibility_calibration_assignments_v1()
  from public, anon, authenticated, service_role;
grant execute on function public.reconcile_evidence_credibility_calibration_assignments_v1()
  to authenticated, service_role;

notify pgrst, 'reload schema';
