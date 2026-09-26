create or replace function public.record_trade_evidence_decision_v1(
  p_milestone_id uuid,
  p_review_id uuid,
  p_decision_confidence_band smallint,
  p_primary_provenance_class text,
  p_provider_authentication_status text,
  p_provider_authentication_ref text,
  p_adjudication_class text,
  p_contradiction_status text,
  p_integrity_finding text,
  p_responsiveness_finding text,
  p_dispute_conduct_finding text,
  p_finality_reason text,
  p_exclusion_reason text default '',
  p_supersedes_decision_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  actor_id uuid := auth.uid();
  service_call boolean := coalesce(auth.jwt() ->> 'role', '') = 'service_role';
  actor_is_administrator boolean := moral_trade_private.current_actor_has_trade_role('administrator');
  actor_is_reviewer boolean := moral_trade_private.current_actor_has_trade_role('reviewer');
  milestone_row public.trade_agreement_milestones%rowtype;
  agreement_row public.agreements%rowtype;
  version_row public.trade_agreement_versions%rowtype;
  review_row public.trade_milestone_reviews%rowtype;
  base_review_row public.trade_milestone_reviews%rowtype;
  payout_row public.trade_milestone_payouts%rowtype;
  prior_decision public.trade_evidence_decisions%rowtype;
  decision_status_value text;
  completion_units_value numeric(20, 6);
  completion_fraction_value numeric(12, 10);
  payout_factor_value smallint;
  base_review_id_value uuid;
  terms_hash_value text;
  occurred_at_value timestamptz;
  decision_hash_value text;
  source_key_value text;
  existing_id uuid;
  decision_id uuid;
begin
  if not service_call and not actor_is_administrator and not actor_is_reviewer then
    raise exception 'Evidence decisions require an active AAL2 reviewer or administrator.';
  end if;

  select *
  into milestone_row
  from public.trade_agreement_milestones milestone
  where milestone.id = p_milestone_id
  for share;
  if not found then
    raise exception 'Milestone is unavailable.';
  end if;

  select * into agreement_row
  from public.agreements agreement
  where agreement.id = milestone_row.agreement_id;
  select * into version_row
  from public.trade_agreement_versions version
  where version.id = milestone_row.agreement_version_id
    and version.agreement_id = milestone_row.agreement_id;

  terms_hash_value := coalesce(version_row.complete_terms_hash, version_row.terms_hash);
  if terms_hash_value is null or terms_hash_value !~ '^[0-9a-f]{64}$' then
    raise exception 'The frozen milestone terms hash is unavailable.';
  end if;

  if p_review_id is not null then
    select *
    into review_row
    from public.trade_milestone_reviews review
    where review.id = p_review_id
      and review.milestone_id = milestone_row.id;
    if not found
       or not review_row.is_final
       or review_row.finalized_at is null
       or milestone_row.final_review_id is distinct from review_row.id then
      raise exception 'Only the final milestone review may create a scored decision.';
    end if;

    select *
    into payout_row
    from public.trade_milestone_payouts payout
    where payout.milestone_id = milestone_row.id
      and payout.review_id = review_row.id
      and payout.is_final;
    if not found then
      raise exception 'The final payout basis is unavailable.';
    end if;

    if not service_call and not actor_is_administrator and actor_id <> review_row.reviewer_id then
      raise exception 'Only the final reviewer may record this decision.';
    end if;

    completion_units_value := review_row.completion_units;
    payout_factor_value := review_row.confidence_band;
    base_review_id_value := review_row.base_review_id;
    occurred_at_value := review_row.finalized_at;
  else
    if not service_call and not actor_is_administrator then
      raise exception 'A no-review finality decision requires an administrator.';
    end if;
    if p_finality_reason not in (
      'replacement_expired', 'permissible_exit', 'force_majeure',
      'mutual_cancellation', 'unjustified_abandonment', 'unresolved_dispute'
    ) then
      raise exception 'This finality reason requires a final review.';
    end if;
    completion_units_value := 0;
    payout_factor_value := null;
    base_review_id_value := null;
    occurred_at_value := now();
  end if;

  decision_status_value := case
    when p_finality_reason in ('permissible_exit', 'force_majeure', 'mutual_cancellation')
      then 'excluded'
    when p_finality_reason = 'unresolved_dispute' or p_decision_confidence_band = 0
      then 'review_required'
    else 'eligible'
  end;

  if p_finality_reason in (
    'terminal_rejection', 'replacement_expired', 'unjustified_abandonment'
  ) then
    completion_units_value := 0;
  end if;

  if decision_status_value <> 'eligible'
     and length(btrim(coalesce(p_exclusion_reason, ''))) not between 1 and 1000 then
    raise exception 'Excluded and review-required decisions need a private reason.';
  end if;

  if p_review_id is not null then
    if p_finality_reason = 'terminal_rejection' and review_row.outcome <> 'rejected' then
      raise exception 'A terminal rejection requires a rejected final review.';
    end if;
    if p_finality_reason = 'replacement_success'
       and (review_row.review_kind <> 'replacement' or review_row.outcome <> 'graded') then
      raise exception 'Replacement success requires a final graded replacement review.';
    end if;
    if p_finality_reason in ('appeal_affirmed', 'appeal_overturned') then
      if review_row.review_kind <> 'appeal' or review_row.base_review_id is null then
        raise exception 'Appeal finality requires a final appeal review.';
      end if;
      select * into base_review_row
      from public.trade_milestone_reviews base_review
      where base_review.id = review_row.base_review_id;
      if p_finality_reason = 'appeal_affirmed'
         and (
           base_review_row.outcome is distinct from review_row.outcome
           or base_review_row.completion_units is distinct from review_row.completion_units
         ) then
        raise exception 'An affirmed appeal must preserve the underlying completion result.';
      end if;
      if p_finality_reason = 'appeal_overturned'
         and base_review_row.outcome is not distinct from review_row.outcome
         and base_review_row.completion_units is not distinct from review_row.completion_units then
        raise exception 'An overturned appeal must change the underlying completion result.';
      end if;
    end if;
  end if;

  if p_adjudication_class = 'unreviewed' and decision_status_value = 'eligible' then
    raise exception 'An eligible shadow event cannot be unreviewed.';
  end if;
  if p_review_id is not null and review_row.review_kind = 'appeal'
     and p_adjudication_class <> 'appeal_review_final' then
    raise exception 'Appeal reviews require appeal-review adjudication.';
  end if;
  if p_review_id is not null and review_row.review_kind <> 'appeal'
     and p_adjudication_class <> 'neutral_review_final' then
    raise exception 'Initial and replacement reviews require neutral-review adjudication.';
  end if;
  if p_primary_provenance_class = 'authenticated_provider' then
    if p_provider_authentication_status <> 'authenticated'
       or length(btrim(coalesce(p_provider_authentication_ref, ''))) not between 1 and 500 then
      raise exception 'Authenticated-provider provenance requires a verified provider reference.';
    end if;
  elsif p_provider_authentication_status = 'authenticated' then
    raise exception 'Authenticated provider status requires authenticated-provider provenance.';
  end if;
  if p_contradiction_status = 'materially_reckless'
     and p_integrity_finding <> 'reckless_misleading' then
    raise exception 'Materially reckless contradiction requires the matching integrity finding.';
  elsif p_contradiction_status = 'deliberate'
     and p_integrity_finding <> 'deliberate_fabrication' then
    raise exception 'Deliberate contradiction requires the fabrication integrity finding.';
  end if;

  completion_fraction_value := round(
    completion_units_value / milestone_row.units_total,
    10
  );

  if p_supersedes_decision_id is not null then
    select * into prior_decision
    from public.trade_evidence_decisions decision_record
    where decision_record.id = p_supersedes_decision_id
    for share;
    if not found
       or prior_decision.milestone_id <> milestone_row.id
       or exists (
         select 1
         from public.trade_evidence_decisions successor
         where successor.supersedes_decision_id = prior_decision.id
       ) then
      raise exception 'The superseded evidence decision is invalid or no longer current.';
    end if;
  end if;

  if p_finality_reason in (
    'appeal_affirmed', 'appeal_overturned', 'late_cure',
    'administrative_correction'
  ) and p_supersedes_decision_id is null then
    raise exception 'This finality reason must supersede the current decision.';
  end if;

  if p_review_id is not null and review_row.review_kind = 'appeal' then
    if p_supersedes_decision_id is null
       or prior_decision.review_id is distinct from review_row.base_review_id then
      raise exception 'The appeal must supersede the base-review decision.';
    end if;
  end if;

  decision_hash_value := encode(
    extensions.digest(
      convert_to(
        jsonb_build_object(
          'milestoneId', milestone_row.id,
          'agreementId', milestone_row.agreement_id,
          'agreementVersionId', milestone_row.agreement_version_id,
          'reviewId', p_review_id,
          'supersedesDecisionId', p_supersedes_decision_id,
          'completionUnits', completion_units_value,
          'unitsTotal', milestone_row.units_total,
          'completionFraction', completion_fraction_value,
          'payoutFactorBand', payout_factor_value,
          'decisionConfidenceBand', p_decision_confidence_band,
          'primaryProvenanceClass', p_primary_provenance_class,
          'providerAuthenticationStatus', p_provider_authentication_status,
          'providerAuthenticationRef', btrim(coalesce(p_provider_authentication_ref, '')),
          'adjudicationClass', p_adjudication_class,
          'contradictionStatus', p_contradiction_status,
          'integrityFinding', p_integrity_finding,
          'additionalityStatus', 'not_evaluated',
          'responsivenessFinding', p_responsiveness_finding,
          'disputeConductFinding', p_dispute_conduct_finding,
          'finalityReason', p_finality_reason,
          'exclusionReason', btrim(coalesce(p_exclusion_reason, '')),
          'termsHash', terms_hash_value
        )::text,
        'UTF8'
      ),
      'sha256'
    ),
    'hex'
  );
  source_key_value := 'evidence-decision:v1:' || milestone_row.id::text || ':' || decision_hash_value;

  select id into existing_id
  from public.trade_evidence_decisions
  where source_key = source_key_value;
  if existing_id is not null then
    perform public.materialize_trade_evidence_decision_shadow_v1(existing_id);
    return jsonb_build_object(
      'decisionId', existing_id,
      'status', 'replayed',
      'shadowOnly', true
    );
  end if;

  if p_supersedes_decision_id is null and exists (
    select 1
    from public.trade_evidence_decisions decision_record
    where decision_record.milestone_id = milestone_row.id
      and not exists (
        select 1
        from public.trade_evidence_decisions successor
        where successor.supersedes_decision_id = decision_record.id
      )
  ) then
    raise exception 'A current evidence decision already exists; supersede it explicitly.';
  end if;

  insert into public.trade_evidence_decisions (
    milestone_id,
    agreement_id,
    agreement_version_id,
    review_id,
    base_review_id,
    supersedes_decision_id,
    performer_id,
    payer_id,
    decision_status,
    completion_units,
    units_total,
    completion_fraction,
    payout_factor_band,
    decision_confidence_band,
    primary_provenance_class,
    provider_authentication_status,
    provider_authentication_ref,
    adjudication_class,
    contradiction_status,
    integrity_finding,
    additionality_status,
    responsiveness_finding,
    dispute_conduct_finding,
    finality_reason,
    exclusion_reason,
    terms_hash,
    decision_hash,
    source_key,
    occurred_at,
    finalized_at,
    created_by,
    metadata
  ) values (
    milestone_row.id,
    milestone_row.agreement_id,
    milestone_row.agreement_version_id,
    p_review_id,
    base_review_id_value,
    p_supersedes_decision_id,
    milestone_row.performer_id,
    milestone_row.payer_id,
    decision_status_value,
    completion_units_value,
    milestone_row.units_total,
    completion_fraction_value,
    payout_factor_value,
    p_decision_confidence_band,
    p_primary_provenance_class,
    p_provider_authentication_status,
    btrim(coalesce(p_provider_authentication_ref, '')),
    p_adjudication_class,
    p_contradiction_status,
    p_integrity_finding,
    'not_evaluated',
    p_responsiveness_finding,
    p_dispute_conduct_finding,
    p_finality_reason,
    btrim(coalesce(p_exclusion_reason, '')),
    terms_hash_value,
    decision_hash_value,
    source_key_value,
    occurred_at_value,
    now(),
    actor_id,
    jsonb_build_object(
      'shadowOnly', true,
      'additionalityExcluded', true,
      'activePublicCredibilityUnaffected', true
    )
  )
  returning id into decision_id;

  perform public.materialize_trade_evidence_decision_shadow_v1(decision_id);

  return jsonb_build_object(
    'decisionId', decision_id,
    'status', decision_status_value,
    'completionFraction', completion_fraction_value,
    'shadowOnly', true
  );
end;
$function$;
