-- Immutable, privacy-safe analysis export for completed blind calibration audits.
--
-- This migration does not fit a model, inspect raw evidence, expose identity,
-- change credibility, activate cutover, or authorize a production release.

create table if not exists public.evidence_credibility_calibration_exports (
  id uuid primary key default gen_random_uuid(),
  export_schema_version text not null default 'v1-blind-audit-jsonl',
  analysis_plan_version text not null,
  analysis_plan_hash text not null,
  source_key text not null unique,
  source_cutoff_at timestamptz not null,
  pseudonymization_key_commitment text not null,
  row_count integer not null,
  rows_digest text not null,
  manifest_hash text not null,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  constraint evidence_credibility_calibration_exports_schema_check
    check (export_schema_version = 'v1-blind-audit-jsonl'),
  constraint evidence_credibility_calibration_exports_plan_version_check
    check (length(btrim(analysis_plan_version)) between 1 and 200),
  constraint evidence_credibility_calibration_exports_plan_hash_check
    check (analysis_plan_hash ~ '^[0-9a-f]{64}$'),
  constraint evidence_credibility_calibration_exports_source_key_check
    check (length(btrim(source_key)) between 1 and 500),
  constraint evidence_credibility_calibration_exports_cutoff_check
    check (source_cutoff_at <= created_at),
  constraint evidence_credibility_calibration_exports_pseudonymization_check
    check (pseudonymization_key_commitment ~ '^[0-9a-f]{64}$'),
  constraint evidence_credibility_calibration_exports_row_count_check
    check (row_count >= 1),
  constraint evidence_credibility_calibration_exports_rows_digest_check
    check (rows_digest ~ '^[0-9a-f]{64}$'),
  constraint evidence_credibility_calibration_exports_manifest_hash_check
    check (manifest_hash ~ '^[0-9a-f]{64}$')
);

create index if not exists evidence_credibility_calibration_exports_created_idx
  on public.evidence_credibility_calibration_exports(created_at desc, id desc);

create table if not exists public.evidence_credibility_calibration_export_rows (
  export_id uuid not null,
  row_number integer not null,
  observation jsonb not null,
  row_hash text not null,
  created_at timestamptz not null default now(),
  primary key (export_id, row_number),
  constraint evidence_credibility_calibration_export_rows_export_fk
    foreign key (export_id)
    references public.evidence_credibility_calibration_exports(id)
    on delete restrict
    deferrable initially deferred,
  constraint evidence_credibility_calibration_export_rows_number_check
    check (row_number >= 1),
  constraint evidence_credibility_calibration_export_rows_observation_check
    check (jsonb_typeof(observation) = 'object'),
  constraint evidence_credibility_calibration_export_rows_hash_check
    check (row_hash ~ '^[0-9a-f]{64}$')
);

create index if not exists evidence_credibility_calibration_export_rows_hash_idx
  on public.evidence_credibility_calibration_export_rows(export_id, row_hash);

drop trigger if exists evidence_credibility_calibration_exports_append_only
  on public.evidence_credibility_calibration_exports;
create trigger evidence_credibility_calibration_exports_append_only
before update or delete on public.evidence_credibility_calibration_exports
for each row execute function moral_trade_private.reject_credibility_shadow_history_mutation();

drop trigger if exists evidence_credibility_calibration_export_rows_append_only
  on public.evidence_credibility_calibration_export_rows;
create trigger evidence_credibility_calibration_export_rows_append_only
before update or delete on public.evidence_credibility_calibration_export_rows
for each row execute function moral_trade_private.reject_credibility_shadow_history_mutation();

alter table public.evidence_credibility_calibration_exports enable row level security;
alter table public.evidence_credibility_calibration_export_rows enable row level security;

revoke all on table public.evidence_credibility_calibration_exports
  from public, anon, authenticated;
revoke all on table public.evidence_credibility_calibration_export_rows
  from public, anon, authenticated;

grant select on table public.evidence_credibility_calibration_exports to service_role;
grant select on table public.evidence_credibility_calibration_export_rows to service_role;

create or replace function moral_trade_private.calibration_export_token_v1(
  p_secret text,
  p_domain text,
  p_value text
)
returns text
language sql
immutable
set search_path = ''
as $function$
  select encode(
    extensions.hmac(
      convert_to(p_domain || chr(31) || coalesce(p_value, ''), 'UTF8'),
      decode(p_secret, 'hex'),
      'sha256'
    ),
    'hex'
  );
$function$;

revoke all on function moral_trade_private.calibration_export_token_v1(text, text, text)
  from public, anon, authenticated, service_role;

create or replace function public.create_evidence_credibility_calibration_export_v1(
  p_source_key text,
  p_source_cutoff_at timestamptz,
  p_analysis_plan_version text,
  p_analysis_plan_hash text,
  p_pseudonymization_secret text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $function$
declare
  actor_id uuid := auth.uid();
  existing_export public.evidence_credibility_calibration_exports%rowtype;
  export_id_value uuid := gen_random_uuid();
  pseudonymization_commitment_value text;
  row_count_value integer := 0;
  rows_digest_value text;
  manifest_hash_value text;
begin
  perform moral_trade_private.require_calibration_audit_administrator();

  if length(btrim(coalesce(p_source_key, ''))) not between 1 and 500 then
    raise exception 'Calibration-export request key is invalid.';
  end if;
  if length(btrim(coalesce(p_analysis_plan_version, ''))) not between 1 and 200 then
    raise exception 'A frozen analysis-plan version is required before export.';
  end if;
  if p_analysis_plan_hash !~ '^[0-9a-f]{64}$' then
    raise exception 'Analysis-plan hash must be exactly 64 lowercase hexadecimal characters.';
  end if;
  if p_pseudonymization_secret !~ '^[0-9a-f]{64}$' then
    raise exception 'Pseudonymization secret must be exactly 64 lowercase hexadecimal characters.';
  end if;
  if p_source_cutoff_at is null or p_source_cutoff_at > now() then
    raise exception 'Calibration-export cutoff must not be in the future.';
  end if;

  select * into existing_export
  from public.evidence_credibility_calibration_exports export_record
  where export_record.source_key = btrim(p_source_key);
  if found then
    if existing_export.source_cutoff_at is distinct from p_source_cutoff_at
       or existing_export.analysis_plan_version is distinct from btrim(p_analysis_plan_version)
       or existing_export.analysis_plan_hash is distinct from p_analysis_plan_hash then
      raise exception 'The immutable calibration-export request differs from this request.';
    end if;
    return jsonb_build_object(
      'exportId', existing_export.id,
      'status', 'replayed',
      'rowCount', existing_export.row_count,
      'manifestHash', existing_export.manifest_hash,
      'shadowOnly', true
    );
  end if;

  pseudonymization_commitment_value := encode(
    extensions.digest(convert_to(p_pseudonymization_secret, 'UTF8'), 'sha256'),
    'hex'
  );

  with source_rows as (
    select
      draw.id as draw_id,
      draw.target_type,
      draw.subject_profile_id,
      draw.counterparty_profile_id,
      draw.original_reviewer_id,
      draw.agreement_id,
      draw.milestone_id,
      draw.model_version,
      draw.role,
      draw.category,
      draw.dimension,
      draw.original_status,
      draw.original_outcome,
      draw.original_confidence_band,
      draw.original_provenance_class,
      draw.original_adjudication_class,
      draw.original_finality_reason,
      draw.original_integrity_finding,
      draw.original_responsiveness_finding,
      draw.original_dispute_conduct_finding,
      draw.provenance_weight,
      draw.decision_confidence_weight,
      draw.context_similarity,
      draw.stake_units,
      draw.decision_finalized_at,
      draw.sampling_stratum,
      draw.inclusion_probability,
      draw.random_unit,
      draw.selected_reason,
      draw.snapshot_hash,
      sampling_run.id as sampling_run_id,
      sampling_run.policy_version as sampling_policy_version,
      sampling_run.seed_commitment,
      assignment.id as assignment_id,
      assignment.reviewer_id as audit_reviewer_id,
      assignment.blinding_mode,
      independent_label.label_tier,
      independent_label.final_status,
      independent_label.final_outcome,
      independent_label.final_finality_reason,
      independent_label.final_integrity_finding,
      independent_label.final_responsiveness_finding,
      independent_label.final_dispute_conduct_finding,
      independent_label.materially_upheld,
      independent_label.absolute_error,
      independent_label.blinding_complete,
      independent_label.label_hash,
      independent_label.completed_at,
      shadow_event.id as shadow_event_id,
      shadow_event.profile_id as event_profile_id,
      shadow_event.counterparty_id as event_counterparty_id,
      shadow_event.occurred_at as event_occurred_at,
      shadow_event.created_at as event_created_at,
      model.recency_half_life_days
    from public.evidence_credibility_calibration_labels independent_label
    join public.evidence_credibility_calibration_audit_assignments assignment
      on assignment.id = independent_label.assignment_id
    join public.evidence_credibility_calibration_draws draw
      on draw.id = assignment.draw_id
    join public.evidence_credibility_calibration_sampling_runs sampling_run
      on sampling_run.id = draw.sampling_run_id
    join public.credibility_shadow_model_versions model
      on model.version = draw.model_version
    join lateral (
      select event_row.*
      from public.credibility_shadow_events event_row
      where event_row.dimension = draw.dimension
        and (
          (draw.target_type = 'evidence_decision'
            and event_row.evidence_decision_id = draw.evidence_decision_id)
          or (draw.target_type = 'settlement_decision'
            and event_row.settlement_decision_id = draw.settlement_decision_id)
        )
      order by event_row.created_at desc, event_row.id desc
      limit 1
    ) shadow_event on true
    where draw.selected
      and independent_label.completed_at <= p_source_cutoff_at
      and draw.decision_finalized_at <= p_source_cutoff_at
      and case draw.target_type
        when 'evidence_decision' then not exists (
          select 1
          from public.trade_evidence_decisions successor
          where successor.supersedes_decision_id = draw.evidence_decision_id
            and successor.finalized_at <= p_source_cutoff_at
        )
        when 'settlement_decision' then not exists (
          select 1
          from public.trade_settlement_shadow_decisions successor
          where successor.supersedes_decision_id = draw.settlement_decision_id
            and successor.finalized_at <= p_source_cutoff_at
        )
        else false
      end
  ), enriched as (
    select
      source_rows.*,
      case
        when source_rows.event_counterparty_id is null then 1
        else (
          select greatest(1, count(*)::integer)
          from public.credibility_shadow_events prior_event
          where prior_event.profile_id = source_rows.event_profile_id
            and prior_event.counterparty_id = source_rows.event_counterparty_id
            and prior_event.role = source_rows.role
            and prior_event.category = source_rows.category
            and prior_event.dimension = source_rows.dimension
            and prior_event.scoring_state = 'eligible'
            and prior_event.outcome is not null
            and (
              prior_event.occurred_at < source_rows.event_occurred_at
              or (
                prior_event.occurred_at = source_rows.event_occurred_at
                and prior_event.id <= source_rows.shadow_event_id
              )
            )
            and not exists (
              select 1
              from public.credibility_shadow_events successor_event
              where successor_event.supersedes_event_id = prior_event.id
                and successor_event.created_at <= source_rows.event_created_at
            )
        )
      end as counterparty_sequence_at_decision,
      greatest(
        0::numeric,
        extract(epoch from (
          source_rows.decision_finalized_at - source_rows.event_occurred_at
        ))::numeric / 86400::numeric
      ) as event_age_days_at_decision,
      public.credibility_stake_weight(source_rows.stake_units) as stake_weight
    from source_rows
  ), weighted as (
    select
      enriched.*,
      exp(
        -ln(2::numeric)
        * enriched.event_age_days_at_decision
        / enriched.recency_half_life_days::numeric
      ) as recency_weight_at_decision
    from enriched
  ), tokenized as (
    select
      weighted.*,
      moral_trade_private.calibration_export_token_v1(
        p_pseudonymization_secret, 'observation', weighted.draw_id::text
      ) as observation_token,
      moral_trade_private.calibration_export_token_v1(
        p_pseudonymization_secret, 'agreement', weighted.agreement_id::text
      ) as agreement_group_token,
      moral_trade_private.calibration_export_token_v1(
        p_pseudonymization_secret,
        'decision_chain',
        weighted.agreement_id::text || ':' || weighted.milestone_id::text || ':' || weighted.target_type
      ) as decision_chain_group_token,
      moral_trade_private.calibration_export_token_v1(
        p_pseudonymization_secret, 'subject', weighted.subject_profile_id::text
      ) as subject_group_token,
      case when weighted.counterparty_profile_id is null then null else
        moral_trade_private.calibration_export_token_v1(
          p_pseudonymization_secret,
          'counterparty',
          weighted.counterparty_profile_id::text
        )
      end as counterparty_group_token,
      moral_trade_private.calibration_export_token_v1(
        p_pseudonymization_secret,
        'participant_pair',
        case when weighted.counterparty_profile_id is null
          then weighted.subject_profile_id::text
          else least(
            weighted.subject_profile_id::text,
            weighted.counterparty_profile_id::text
          ) || ':' || greatest(
            weighted.subject_profile_id::text,
            weighted.counterparty_profile_id::text
          )
        end
      ) as participant_pair_group_token,
      case when weighted.original_reviewer_id is null then null else
        moral_trade_private.calibration_export_token_v1(
          p_pseudonymization_secret,
          'original_reviewer',
          weighted.original_reviewer_id::text
        )
      end as original_reviewer_group_token,
      moral_trade_private.calibration_export_token_v1(
        p_pseudonymization_secret,
        'audit_reviewer',
        weighted.audit_reviewer_id::text
      ) as audit_reviewer_group_token,
      moral_trade_private.calibration_export_token_v1(
        p_pseudonymization_secret,
        'sampling_run',
        weighted.sampling_run_id::text
      ) as sampling_run_group_token
    from weighted
  ), payloads as (
    select
      row_number() over (
        order by tokenized.decision_finalized_at, tokenized.observation_token
      )::integer as export_row_number,
      (
        jsonb_build_object(
          'schemaVersion', 'v1-blind-audit-jsonl',
          'observationToken', tokenized.observation_token,
          'agreementGroupToken', tokenized.agreement_group_token,
          'decisionChainGroupToken', tokenized.decision_chain_group_token,
          'subjectGroupToken', tokenized.subject_group_token,
          'counterpartyGroupToken', tokenized.counterparty_group_token,
          'participantPairGroupToken', tokenized.participant_pair_group_token,
          'originalReviewerGroupToken', tokenized.original_reviewer_group_token,
          'auditReviewerGroupToken', tokenized.audit_reviewer_group_token,
          'samplingRunGroupToken', tokenized.sampling_run_group_token,
          'targetType', tokenized.target_type,
          'dimension', tokenized.dimension,
          'category', tokenized.category,
          'role', tokenized.role,
          'modelVersion', tokenized.model_version
        )
        || jsonb_build_object(
          'samplingPolicyVersion', tokenized.sampling_policy_version,
          'samplingSeedCommitment', tokenized.seed_commitment,
          'samplingStratum', tokenized.sampling_stratum,
          'samplingKind', case
            when tokenized.selected_reason = 'random_selected' then 'random'
            else 'mandatory'
          end,
          'inclusionProbability', tokenized.inclusion_probability,
          'samplingRandomUnit', tokenized.random_unit,
          'selectedReason', tokenized.selected_reason,
          'sourcePathway', case
            when tokenized.original_finality_reason = 'administrative_correction'
              then 'administrative_correction'
            when tokenized.original_adjudication_class = 'appeal_review_final'
              or tokenized.original_finality_reason in ('appeal_affirmed', 'appeal_overturned')
              then 'appeal'
            when tokenized.original_provenance_class = 'authenticated_provider'
              or tokenized.original_adjudication_class = 'provider_established'
              then 'provider_reconciliation'
            else 'terminal_review'
          end,
          'originalStatus', tokenized.original_status,
          'originalOutcome', tokenized.original_outcome,
          'originalConfidenceBand', tokenized.original_confidence_band,
          'originalProvenanceClass', tokenized.original_provenance_class,
          'originalAdjudicationClass', tokenized.original_adjudication_class,
          'originalFinalityReason', tokenized.original_finality_reason,
          'originalIntegrityFinding', tokenized.original_integrity_finding,
          'originalResponsivenessFinding', tokenized.original_responsiveness_finding,
          'originalDisputeConductFinding', tokenized.original_dispute_conduct_finding,
          'additionalityStatus', 'not_evaluated'
        )
        || jsonb_build_object(
          'provenanceWeight', round(tokenized.provenance_weight, 8),
          'decisionConfidenceWeight', round(tokenized.decision_confidence_weight, 8),
          'contextSimilarity', round(tokenized.context_similarity, 8),
          'stakeWeight', round(tokenized.stake_weight, 8),
          'counterpartySequenceAtDecision', tokenized.counterparty_sequence_at_decision,
          'recencyHalfLifeDays', tokenized.recency_half_life_days,
          'eventAgeDaysAtDecision', round(tokenized.event_age_days_at_decision, 6),
          'recencyWeightAtDecision', round(tokenized.recency_weight_at_decision, 8),
          'provisionalEventWeightAtDecision', case
            when tokenized.original_status = 'eligible' then round(
              tokenized.recency_weight_at_decision
              * tokenized.provenance_weight
              * tokenized.decision_confidence_weight
              * (1::numeric / sqrt(tokenized.counterparty_sequence_at_decision::numeric))
              * tokenized.context_similarity
              * tokenized.stake_weight,
              8
            )
            else null
          end,
          'decisionDateUtc', to_char(
            tokenized.decision_finalized_at at time zone 'UTC',
            'YYYY-MM-DD'
          ),
          'auditCompletedDateUtc', to_char(
            tokenized.completed_at at time zone 'UTC',
            'YYYY-MM-DD'
          ),
          'predictionSnapshotHash', tokenized.snapshot_hash
        )
        || jsonb_build_object(
          'labelTier', tokenized.label_tier,
          'blindingMode', tokenized.blinding_mode,
          'blindingComplete', tokenized.blinding_complete,
          'finalStatus', tokenized.final_status,
          'finalOutcome', tokenized.final_outcome,
          'finalFinalityReason', tokenized.final_finality_reason,
          'finalIntegrityFinding', tokenized.final_integrity_finding,
          'finalResponsivenessFinding', tokenized.final_responsiveness_finding,
          'finalDisputeConductFinding', tokenized.final_dispute_conduct_finding,
          'materiallyUpheld', tokenized.materially_upheld,
          'absoluteError', tokenized.absolute_error,
          'labelHash', tokenized.label_hash
        )
      ) as observation
    from tokenized
  ), inserted as (
    insert into public.evidence_credibility_calibration_export_rows(
      export_id,
      row_number,
      observation,
      row_hash
    )
    select
      export_id_value,
      payloads.export_row_number,
      payloads.observation,
      encode(
        extensions.digest(
          convert_to(payloads.observation::text, 'UTF8'),
          'sha256'
        ),
        'hex'
      )
    from payloads
    returning row_number, row_hash
  )
  select
    count(*)::integer,
    encode(
      extensions.digest(
        convert_to(
          coalesce(string_agg(inserted.row_hash, '|' order by inserted.row_number), ''),
          'UTF8'
        ),
        'sha256'
      ),
      'hex'
    )
  into row_count_value, rows_digest_value
  from inserted;

  if row_count_value < 1 then
    raise exception 'No completed, current blind-audit labels exist at this cutoff.';
  end if;

  manifest_hash_value := encode(
    extensions.digest(
      convert_to(
        jsonb_build_object(
          'exportSchemaVersion', 'v1-blind-audit-jsonl',
          'analysisPlanVersion', btrim(p_analysis_plan_version),
          'analysisPlanHash', p_analysis_plan_hash,
          'sourceCutoffAt', p_source_cutoff_at,
          'pseudonymizationKeyCommitment', pseudonymization_commitment_value,
          'rowCount', row_count_value,
          'rowsDigest', rows_digest_value,
          'rawEvidenceIncluded', false,
          'rawIdentityIncluded', false,
          'exactPaymentDataIncluded', false,
          'shadowOnly', true
        )::text,
        'UTF8'
      ),
      'sha256'
    ),
    'hex'
  );

  insert into public.evidence_credibility_calibration_exports(
    id,
    analysis_plan_version,
    analysis_plan_hash,
    source_key,
    source_cutoff_at,
    pseudonymization_key_commitment,
    row_count,
    rows_digest,
    manifest_hash,
    created_by
  ) values (
    export_id_value,
    btrim(p_analysis_plan_version),
    p_analysis_plan_hash,
    btrim(p_source_key),
    p_source_cutoff_at,
    pseudonymization_commitment_value,
    row_count_value,
    rows_digest_value,
    manifest_hash_value,
    actor_id
  );

  return jsonb_build_object(
    'exportId', export_id_value,
    'status', 'created',
    'rowCount', row_count_value,
    'manifestHash', manifest_hash_value,
    'shadowOnly', true
  );
end;
$function$;

create or replace function public.list_evidence_credibility_calibration_exports_v1(
  p_limit integer default 50,
  p_offset integer default 0
)
returns table (
  export_id uuid,
  export_schema_version text,
  analysis_plan_version text,
  analysis_plan_hash text,
  source_cutoff_at timestamptz,
  row_count integer,
  rows_digest text,
  manifest_hash text,
  created_at timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $function$
begin
  perform moral_trade_private.require_calibration_audit_administrator();
  if p_limit < 1 or p_limit > 200 or p_offset < 0 then
    raise exception 'Invalid calibration-export list page.';
  end if;

  return query
  select
    export_record.id,
    export_record.export_schema_version,
    export_record.analysis_plan_version,
    export_record.analysis_plan_hash,
    export_record.source_cutoff_at,
    export_record.row_count,
    export_record.rows_digest,
    export_record.manifest_hash,
    export_record.created_at
  from public.evidence_credibility_calibration_exports export_record
  order by export_record.created_at desc, export_record.id desc
  limit p_limit
  offset p_offset;
end;
$function$;

create or replace function public.get_evidence_credibility_calibration_export_manifest_v1(
  p_export_id uuid
)
returns table (
  export_id uuid,
  export_schema_version text,
  analysis_plan_version text,
  analysis_plan_hash text,
  source_cutoff_at timestamptz,
  pseudonymization_key_commitment text,
  row_count integer,
  rows_digest text,
  manifest_hash text,
  manifest_payload text,
  created_at timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $function$
begin
  perform moral_trade_private.require_calibration_audit_administrator();

  return query
  select
    export_record.id,
    export_record.export_schema_version,
    export_record.analysis_plan_version,
    export_record.analysis_plan_hash,
    export_record.source_cutoff_at,
    export_record.pseudonymization_key_commitment,
    export_record.row_count,
    export_record.rows_digest,
    export_record.manifest_hash,
    jsonb_build_object(
      'exportSchemaVersion', export_record.export_schema_version,
      'analysisPlanVersion', export_record.analysis_plan_version,
      'analysisPlanHash', export_record.analysis_plan_hash,
      'sourceCutoffAt', export_record.source_cutoff_at,
      'pseudonymizationKeyCommitment', export_record.pseudonymization_key_commitment,
      'rowCount', export_record.row_count,
      'rowsDigest', export_record.rows_digest,
      'rawEvidenceIncluded', false,
      'rawIdentityIncluded', false,
      'exactPaymentDataIncluded', false,
      'shadowOnly', true
    )::text,
    export_record.created_at
  from public.evidence_credibility_calibration_exports export_record
  where export_record.id = p_export_id;
end;
$function$;

create or replace function public.list_evidence_credibility_calibration_export_rows_v1(
  p_export_id uuid,
  p_limit integer default 1000,
  p_offset integer default 0
)
returns table (
  row_number integer,
  row_hash text,
  observation jsonb,
  observation_text text
)
language plpgsql
stable
security definer
set search_path = ''
as $function$
begin
  perform moral_trade_private.require_calibration_audit_administrator();
  if p_limit < 1 or p_limit > 1000 or p_offset < 0 then
    raise exception 'Invalid calibration-export row page.';
  end if;

  return query
  select
    export_row.row_number,
    export_row.row_hash,
    export_row.observation,
    export_row.observation::text
  from public.evidence_credibility_calibration_export_rows export_row
  where export_row.export_id = p_export_id
  order by export_row.row_number
  limit p_limit
  offset p_offset;
end;
$function$;

revoke all on function public.create_evidence_credibility_calibration_export_v1(
  text, timestamptz, text, text, text
) from public, anon, authenticated, service_role;
revoke all on function public.list_evidence_credibility_calibration_exports_v1(integer, integer)
  from public, anon, authenticated, service_role;
revoke all on function public.get_evidence_credibility_calibration_export_manifest_v1(uuid)
  from public, anon, authenticated, service_role;
revoke all on function public.list_evidence_credibility_calibration_export_rows_v1(
  uuid, integer, integer
) from public, anon, authenticated, service_role;

grant execute on function public.create_evidence_credibility_calibration_export_v1(
  text, timestamptz, text, text, text
) to authenticated, service_role;
grant execute on function public.list_evidence_credibility_calibration_exports_v1(integer, integer)
  to authenticated, service_role;
grant execute on function public.get_evidence_credibility_calibration_export_manifest_v1(uuid)
  to authenticated, service_role;
grant execute on function public.list_evidence_credibility_calibration_export_rows_v1(
  uuid, integer, integer
) to authenticated, service_role;

notify pgrst, 'reload schema';
