begin;

do $qa_guard$
begin
  if to_regclass('moraltrade_qa.environment_identity') is null
    or not exists (
      select 1
      from moraltrade_qa.environment_identity
      where singleton
        and environment = 'qa'
        and project_ref = 'hvmxfjjbdcgjjudmthdz'
        and sentinel_id = 'a0244e19-9744-4a82-83e4-57776804cc06'::uuid
        and sentinel_sha256 = 'f7801a29e33764650322ad39e66a2062d9e2f750a9438e74d9fff0c9eeeb8d30'
        and provisioned_out_of_band
    )
  then
    raise exception
      'Refusing impact-study instrumentation outside the independently provisioned MoralTrade QA environment.'
      using errcode = '55000';
  end if;

  if to_regclass('public.impact_study_instances') is not null
    and exists (select 1 from public.impact_study_instances)
  then
    raise exception
      'The rejected QA instrumentation contains study instances and cannot be reset automatically.'
      using errcode = '55000';
  end if;
end;
$qa_guard$;

drop table if exists public.impact_study_calibration_manifests cascade;
drop table if exists public.impact_study_safety_events cascade;
drop table if exists public.impact_study_synthetic_outcomes cascade;
drop table if exists public.impact_study_synthetic_exposures cascade;
drop table if exists public.impact_study_synthetic_assignments cascade;
drop table if exists public.impact_study_registry_events cascade;
drop table if exists public.impact_study_allowed_evidence_schemes cascade;
drop table if exists public.impact_study_allowed_outcomes cascade;
drop table if exists public.impact_study_allowed_exposure_cells cascade;
drop table if exists public.impact_study_allowed_arms cascade;
drop table if exists public.impact_study_validator_attestations cascade;
drop table if exists public.impact_study_instances cascade;
drop table if exists public.impact_study_template_variants cascade;
drop table if exists public.impact_study_template_bindings cascade;
drop table if exists public.impact_study_protocol_bindings cascade;
drop table if exists public.impact_study_validator_bindings cascade;

drop function if exists public.register_qa_impact_study_instance(jsonb) cascade;
drop function if exists public.register_qa_impact_study_instance(jsonb,jsonb) cascade;
drop function if exists public.append_qa_impact_study_event(uuid,text,jsonb) cascade;
drop function if exists public.record_qa_synthetic_assignment(uuid,text,text,text,numeric,text,jsonb) cascade;
drop function if exists public.record_qa_synthetic_exposure(uuid,text,text,boolean,boolean,jsonb) cascade;
drop function if exists public.record_qa_synthetic_outcome(uuid,text,text,text,numeric,text,text[],jsonb) cascade;
drop function if exists public.record_qa_impact_safety_event(uuid,text,text,text,jsonb) cascade;
drop function if exists public.register_qa_synthetic_calibration_manifest(uuid,text,integer,jsonb) cascade;
drop function if exists public.impact_study_validate_instance_insert() cascade;
drop function if exists public.impact_study_validate_child_insert() cascade;
drop function if exists public.impact_study_reject_mutation() cascade;
drop function if exists public.impact_study_payload_has_required_bindings(jsonb) cascade;
drop function if exists public.impact_study_required_binding_names() cascade;
drop function if exists public.impact_study_payload_contains_real_identifiers(jsonb) cascade;
drop function if exists public.impact_study_jsonb_sha256(jsonb) cascade;
drop function if exists public.impact_study_is_synthetic_key(text) cascade;
drop function if exists public.impact_study_is_sha256(text) cascade;

create or replace function public.impact_study_is_sha256(p_value text)
returns boolean
language sql
immutable
set search_path = public
as $$
  select coalesce(p_value ~ '^sha256:[0-9a-f]{64}$', false);
$$;

create or replace function public.impact_study_is_key(p_value text)
returns boolean
language sql
immutable
set search_path = public
as $$
  select coalesce(p_value ~ '^[a-z][a-z0-9._:-]{0,127}$', false);
$$;

create or replace function public.impact_study_is_synthetic_key(p_value text)
returns boolean
language sql
immutable
set search_path = public
as $$
  select coalesce(
    p_value ~ '^synthetic:[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$',
    false
  );
$$;

create or replace function public.impact_study_is_synthetic_evidence_ref(p_value text)
returns boolean
language sql
immutable
set search_path = public
as $$
  select coalesce(
    p_value ~ '^qa-evidence://synthetic/[A-Za-z0-9._:/-]+$',
    false
  );
$$;

create or replace function public.impact_study_jsonb_children(p_value jsonb)
returns table(key_name text, child_value jsonb)
language sql
immutable
set search_path = public
as $$
  select entry.key, entry.value
  from jsonb_each(p_value) entry
  where jsonb_typeof(p_value) = 'object'
  union all
  select null::text, element.value
  from jsonb_array_elements(p_value) element
  where jsonb_typeof(p_value) = 'array';
$$;

create or replace function public.impact_study_payload_contains_real_identifiers(
  p_payload jsonb
)
returns boolean
language sql
immutable
set search_path = public
as $$
  with recursive nodes(key_name, value) as (
    select null::text, p_payload
    union all
    select child.key_name, child.child_value
    from nodes parent
    cross join lateral public.impact_study_jsonb_children(parent.value) child
  )
  select exists (
    select 1
    from nodes
    where (
      key_name is not null
      and lower(regexp_replace(key_name, '[^a-zA-Z0-9]', '', 'g')) in (
        'userid','authuserid','profileid','email','phone','fullname',
        'legalname','address','receipturl','receiptid'
      )
    )
    or (
      jsonb_typeof(value) = 'string'
      and (
        (value #>> '{}') ~* '[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}'
        or (value #>> '{}') ~* '^(https?://|mailto:|tel:)'
      )
    )
  );
$$;

create or replace function public.impact_study_canonical_number(p_value jsonb)
returns text
language plpgsql
immutable
set search_path = public
as $$
declare
  number_value numeric;
  normalized text;
  significant_digits text;
begin
  if jsonb_typeof(p_value) <> 'number' then
    raise exception 'Canonical number input must be a JSON number'
      using errcode = '22023';
  end if;

  number_value := (p_value #>> '{}')::numeric;

  if number_value = 0 then
    return '0';
  end if;

  if abs(number_value) >= 1e21::numeric
    or abs(number_value) < 0.000001::numeric
  then
    raise exception
      'Canonical JSON numbers must remain in the non-exponential range [1e-6, 1e21).'
      using errcode = '22023';
  end if;

  normalized := trim_scale(number_value)::text;

  if trunc(number_value) = number_value then
    if abs(number_value) > 9007199254740991::numeric then
      raise exception 'Canonical JSON integer exceeds the safe integer range'
        using errcode = '22023';
    end if;
    return normalized;
  end if;

  if normalized ~* 'e' then
    raise exception 'Canonical JSON decimal unexpectedly used exponent notation'
      using errcode = '22023';
  end if;

  significant_digits := regexp_replace(normalized, '[-.0]', '', 'g');
  if length(significant_digits) > 15 then
    raise exception 'Canonical JSON decimal exceeds 15 significant non-zero digits'
      using errcode = '22023';
  end if;

  return normalized;
end;
$$;

create or replace function public.impact_study_canonical_json(p_value jsonb)
returns text
language plpgsql
immutable
set search_path = public
as $$
declare
  value_type text;
  result text;
begin
  value_type := jsonb_typeof(p_value);

  if value_type = 'null' then
    return 'null';
  elsif value_type = 'boolean' then
    return p_value::text;
  elsif value_type = 'number' then
    return public.impact_study_canonical_number(p_value);
  elsif value_type = 'string' then
    return to_json(p_value #>> '{}')::text;
  elsif value_type = 'array' then
    select '[' || coalesce(
      string_agg(
        public.impact_study_canonical_json(element.value),
        ',' order by element.ordinality
      ),
      ''
    ) || ']'
    into result
    from jsonb_array_elements(p_value) with ordinality element(value, ordinality);
    return result;
  elsif value_type = 'object' then
    if exists (
      select 1
      from jsonb_object_keys(p_value) object_key
      where object_key !~ '^[A-Za-z][A-Za-z0-9_]*$'
    ) then
      raise exception 'Canonical JSON object keys must use the ASCII identifier contract'
        using errcode = '22023';
    end if;

    select '{' || coalesce(
      string_agg(
        to_json(entry.key)::text || ':' ||
          public.impact_study_canonical_json(entry.value),
        ',' order by entry.key collate "C"
      ),
      ''
    ) || '}'
    into result
    from jsonb_each(p_value) entry;
    return result;
  end if;

  raise exception 'Unsupported JSON value for canonicalization'
    using errcode = '22023';
end;
$$;

create or replace function public.impact_study_jsonb_sha256(p_value jsonb)
returns text
language sql
immutable
set search_path = public
as $$
  select 'sha256:' || encode(
    extensions.digest(
      convert_to(public.impact_study_canonical_json(p_value), 'UTF8'),
      'sha256'
    ),
    'hex'
  );
$$;

create or replace function public.impact_study_assert_payload_hash(
  p_payload jsonb,
  p_declared_hash text
)
returns void
language plpgsql
immutable
set search_path = public
as $$
declare
  expected_hash text;
begin
  if not public.impact_study_is_sha256(p_declared_hash) then
    raise exception 'Declared payload hash is malformed' using errcode = '23514';
  end if;
  expected_hash := public.impact_study_jsonb_sha256(p_payload);
  if expected_hash <> p_declared_hash then
    raise exception 'Payload hash mismatch: expected %, received %',
      expected_hash, p_declared_hash
      using errcode = '23514';
  end if;
end;
$$;

create or replace function public.impact_study_object_has_exact_keys(
  p_value jsonb,
  p_expected_keys text[]
)
returns boolean
language sql
immutable
set search_path = public
as $$
  select jsonb_typeof(p_value) = 'object'
    and coalesce(
      (
        select array_agg(key order by key collate "C")
        from jsonb_object_keys(p_value) key
      ),
      '{}'::text[]
    ) = coalesce(
      (
        select array_agg(key order by key collate "C")
        from unnest(p_expected_keys) key
      ),
      '{}'::text[]
    );
$$;

create or replace function public.impact_study_is_string_array(
  p_value jsonb,
  p_minimum integer,
  p_unique boolean
)
returns boolean
language sql
immutable
set search_path = public
as $$
  select jsonb_typeof(p_value) = 'array'
    and jsonb_array_length(p_value) >= p_minimum
    and not exists (
      select 1
      from jsonb_array_elements(p_value) element
      where jsonb_typeof(element) <> 'string'
        or btrim(element #>> '{}') = ''
    )
    and (
      not p_unique
      or (
        select count(*)
        from jsonb_array_elements_text(p_value)
      ) = (
        select count(distinct element)
        from jsonb_array_elements_text(p_value) element
      )
    );
$$;

create table public.impact_study_validator_bindings (
  schema_key text not null,
  schema_raw_sha256 text not null,
  validator_key text not null,
  validator_raw_sha256 text not null,
  evidence_mapping_payload_hash text not null,
  binding_file_raw_sha256 text not null,
  binding_status text not null,
  execution_authorized boolean not null default false,
  created_at timestamptz not null default statement_timestamp(),
  primary key (schema_key, schema_raw_sha256, validator_key, validator_raw_sha256),
  check (public.impact_study_is_sha256(schema_raw_sha256)),
  check (public.impact_study_is_sha256(validator_raw_sha256)),
  check (public.impact_study_is_sha256(evidence_mapping_payload_hash)),
  check (public.impact_study_is_sha256(binding_file_raw_sha256)),
  check (binding_status = 'bound_nonexecuting'),
  check (execution_authorized = false)
);

create table public.impact_study_protocol_bindings (
  protocol_key text not null,
  payload_sha256 text not null,
  evidence_mapping_payload_hash text not null,
  repository text not null,
  merged_commit_sha text not null,
  accepted_review_id bigint not null,
  binding_status text not null,
  execution_authorized boolean not null default false,
  created_at timestamptz not null default statement_timestamp(),
  primary key (protocol_key, payload_sha256, evidence_mapping_payload_hash),
  check (public.impact_study_is_sha256(payload_sha256)),
  check (public.impact_study_is_sha256(evidence_mapping_payload_hash)),
  check (merged_commit_sha ~ '^[0-9a-f]{40}$'),
  check (binding_status = 'accepted_internal_design_contract'),
  check (execution_authorized = false)
);

create table public.impact_study_template_bindings (
  mechanism_family text not null,
  template_key text not null,
  payload_sha256 text not null,
  template_status text not null,
  execution_authorized boolean not null default false,
  created_at timestamptz not null default statement_timestamp(),
  primary key (mechanism_family, template_key, payload_sha256),
  check (mechanism_family in (
    'trade','co_fund','threshold_funding','donation_upgrade',
    'threshold_sign_on','donation_redirect'
  )),
  check (public.impact_study_is_sha256(payload_sha256)),
  check (template_status = 'bound_nonexecuting'),
  check (execution_authorized = false)
);

create table public.impact_study_template_variants (
  mechanism_family text not null,
  template_key text not null,
  template_payload_hash text not null,
  study_variant text not null,
  assignment_unit text not null,
  exposure_unit text not null,
  outcome_unit text not null,
  analysis_unit text not null,
  estimator_family text not null,
  participant_specific_credit_authorized boolean not null default false,
  primary key (
    mechanism_family, template_key, template_payload_hash, study_variant
  ),
  foreign key (mechanism_family, template_key, template_payload_hash)
    references public.impact_study_template_bindings(
      mechanism_family, template_key, payload_sha256
    ),
  check (public.impact_study_is_key(study_variant)),
  check (participant_specific_credit_authorized = false)
);

insert into public.impact_study_validator_bindings (
  schema_key,
  schema_raw_sha256,
  validator_key,
  validator_raw_sha256,
  evidence_mapping_payload_hash,
  binding_file_raw_sha256,
  binding_status,
  execution_authorized
) values (
  'commitments-impact-study-instance-schema-v2',
  'sha256:a8650788ed3e0ab6749dcd86342fd9c39dfc829ec23a4afe00d34bd28fa2a859',
  'commitments-impact-study-instance-validator-v2',
  'sha256:1381fd100964182e1de8c3b276624b2fe51ffbad512505166fed23a7b1396c85',
  'sha256:eb4aadae8491c1a6924fca03acdeb9157b07a1439098e736c88e549db16b59b8',
  'sha256:2ef406b8db8d4fe43750d2abce23cca627b571b8f2164e448776a1cc853241d8',
  'bound_nonexecuting',
  false
);

insert into public.impact_study_protocol_bindings (
  protocol_key,
  payload_sha256,
  evidence_mapping_payload_hash,
  repository,
  merged_commit_sha,
  accepted_review_id,
  binding_status,
  execution_authorized
) values (
  'commitments-causal-identification-and-calibration-master-v2',
  'sha256:cd663ae722ee028ddfe3e1b866acab9ef79b5fcf5b5418d053bd3687eca3881a',
  'sha256:eb4aadae8491c1a6924fca03acdeb9157b07a1439098e736c88e549db16b59b8',
  'ghuser29384/Website2',
  'f93acc33c135f34bc28f006842d9e08120d5b859',
  4905985869,
  'accepted_internal_design_contract',
  false
);

insert into public.impact_study_template_bindings (
  mechanism_family, template_key, payload_sha256,
  template_status, execution_authorized
) values
('trade','commitments-trade-study-template-v2','sha256:cf0a7a96294b431dcd79879fa01b7d1031ea50a842cebca6986e13351bcbb1e1','bound_nonexecuting',false),
('co_fund','commitments-co-fund-study-template-v2','sha256:441c6e82335c851e7e5ba80e291473caaf23600af7ca695849f994bc4867195c','bound_nonexecuting',false),
('threshold_funding','commitments-threshold-funding-study-template-v2','sha256:44f934b72fb31f0fb2c2c01235bafffbe6dadc229062ee19da4c7858e70c344a','bound_nonexecuting',false),
('donation_upgrade','commitments-donation-upgrade-study-template-v2','sha256:a0c6ea80a989558070869d87aae41aabe7d34a8e011f41e53427015fc0e95512','bound_nonexecuting',false),
('threshold_sign_on','commitments-threshold-sign-on-study-template-v2','sha256:dec601d3f34a3015cc7829d7a860a37b7f1be7b41112aec6a700833fc24890e8','bound_nonexecuting',false),
('donation_redirect','commitments-donation-redirect-study-template-v2','sha256:f7486aa6d6532a316b2cc7e075dcb6b6e8a1ffe0c85dea345a1d2c6d4fbd756c','bound_nonexecuting',false);

insert into public.impact_study_template_variants (
  mechanism_family, template_key, template_payload_hash, study_variant,
  assignment_unit, exposure_unit, outcome_unit, analysis_unit,
  estimator_family, participant_specific_credit_authorized
) values
('trade','commitments-trade-study-template-v2','sha256:cf0a7a96294b431dcd79879fa01b7d1031ea50a842cebca6986e13351bcbb1e1','graph_cluster_role_2x2_encouragement','pre-randomization graph cluster','frozen eligible directed dyad opportunity','frozen dyad outcome','independent randomized graph cluster','cluster-level Horvitz-Thompson or Hájek with randomization inference',false),
('co_fund','commitments-co-fund-study-template-v2','sha256:441c6e82335c851e7e5ba80e291473caaf23600af7ca695849f994bc4867195c','project_delivery_policy_effect','project within an independent participant-project interference cluster','eligible participant-project opportunity','project','independent participant-project interference cluster','two-stage Horvitz-Thompson or Hájek with design-based variance',false),
('co_fund','commitments-co-fund-study-template-v2','sha256:441c6e82335c851e7e5ba80e291473caaf23600af7ca695849f994bc4867195c','other_resources_unlocked_policy_effect','project within an independent participant-project interference cluster','eligible participant-project opportunity','project','independent participant-project interference cluster','two-stage Horvitz-Thompson or Hájek with design-based variance',false),
('threshold_funding','commitments-threshold-funding-study-template-v2','sha256:44f934b72fb31f0fb2c2c01235bafffbe6dadc229062ee19da4c7858e70c344a','pledge_invitation_saturation','pool or project within an independent participant-pool interference cluster','eligible participant-pool opportunity','pool','independent participant-pool interference cluster','two-stage or pool-level design-based estimator matching the selected variant',false),
('threshold_funding','commitments-threshold-funding-study-template-v2','sha256:44f934b72fb31f0fb2c2c01235bafffbe6dadc229062ee19da4c7858e70c344a','pool_randomized_bonus_design','pool or project within an independent participant-pool interference cluster','eligible participant-pool opportunity','pool','independent participant-pool interference cluster','two-stage or pool-level design-based estimator matching the selected variant',false),
('donation_upgrade','commitments-donation-upgrade-study-template-v2','sha256:a0c6ea80a989558070869d87aae41aabe7d34a8e011f41e53427015fc0e95512','donor_matcher_campaign_graph_offer','pre-randomization donor-matcher-campaign graph cluster','frozen eligible donation intent','eligible donation intent','independent donor-matcher-campaign graph cluster','cluster-level Horvitz-Thompson or Hájek with randomization inference',false),
('threshold_sign_on','commitments-threshold-sign-on-study-template-v2','sha256:dec601d3f34a3015cc7829d7a860a37b7f1be7b41112aec6a700833fc24890e8','public_signal','campaign within an independent participant-campaign interference cluster','eligible participant-campaign opportunity','campaign','independent participant-campaign interference cluster','two-stage Horvitz-Thompson or Hájek with design-based variance',false),
('threshold_sign_on','commitments-threshold-sign-on-study-template-v2','sha256:dec601d3f34a3015cc7829d7a860a37b7f1be7b41112aec6a700833fc24890e8','completed_action','campaign within an independent participant-campaign interference cluster','eligible participant-campaign opportunity','campaign','independent participant-campaign interference cluster','two-stage Horvitz-Thompson or Hájek with design-based variance',false),
('donation_redirect','commitments-donation-redirect-study-template-v2','sha256:f7486aa6d6532a316b2cc7e075dcb6b6e8a1ffe0c85dea345a1d2c6d4fbd756c','scalar_native_unit_outcome','pre-randomization connected-user graph cluster','frozen eligible pair of opposed plans','eligible pair','independent connected-user graph cluster','cluster-level design-based estimator or prespecified multivariate randomization test',false),
('donation_redirect','commitments-donation-redirect-study-template-v2','sha256:f7486aa6d6532a316b2cc7e075dcb6b6e8a1ffe0c85dea345a1d2c6d4fbd756c','prespecified_multivariate_global_test','pre-randomization connected-user graph cluster','frozen eligible pair of opposed plans','eligible pair','independent connected-user graph cluster','cluster-level design-based estimator or prespecified multivariate randomization test',false);

create table public.impact_study_instances (
  id uuid primary key default gen_random_uuid(),
  study_key text not null unique,
  study_version integer not null check (study_version > 0),
  mechanism_family text not null,
  study_variant text not null,
  protocol_key text not null,
  protocol_payload_hash text not null,
  template_key text not null,
  template_payload_hash text not null,
  evidence_mapping_payload_hash text not null,
  study_instance_schema_key text not null,
  study_instance_schema_hash text not null,
  validator_key text not null,
  validator_hash text not null,
  study_instance_payload jsonb not null,
  study_instance_payload_hash text not null,
  eligible_population_snapshot_hash text not null,
  assignment_code_hash text not null,
  analysis_code_hash text not null,
  seed_commitment text not null,
  append_only_registry_uri text not null,
  protected_record_ref text not null,
  environment text not null default 'qa' check (environment = 'qa'),
  subject_mode text not null default 'synthetic_only'
    check (subject_mode = 'synthetic_only'),
  execution_authorized boolean not null default false
    check (execution_authorized = false),
  real_user_assignment_allowed boolean not null default false
    check (real_user_assignment_allowed = false),
  registry_status text not null default 'registered_nonexecuting'
    check (registry_status = 'registered_nonexecuting'),
  created_at timestamptz not null default statement_timestamp(),
  created_by_role text not null default current_user,
  check (public.impact_study_is_synthetic_key(study_key)),
  check (public.impact_study_is_sha256(protocol_payload_hash)),
  check (public.impact_study_is_sha256(template_payload_hash)),
  check (public.impact_study_is_sha256(evidence_mapping_payload_hash)),
  check (public.impact_study_is_sha256(study_instance_schema_hash)),
  check (public.impact_study_is_sha256(validator_hash)),
  check (public.impact_study_is_sha256(study_instance_payload_hash)),
  check (public.impact_study_is_sha256(eligible_population_snapshot_hash)),
  check (public.impact_study_is_sha256(assignment_code_hash)),
  check (public.impact_study_is_sha256(analysis_code_hash)),
  check (public.impact_study_is_sha256(seed_commitment)),
  foreign key (
    protocol_key, protocol_payload_hash, evidence_mapping_payload_hash
  ) references public.impact_study_protocol_bindings(
    protocol_key, payload_sha256, evidence_mapping_payload_hash
  ),
  foreign key (
    mechanism_family, template_key, template_payload_hash, study_variant
  ) references public.impact_study_template_variants(
    mechanism_family, template_key, template_payload_hash, study_variant
  ),
  foreign key (
    study_instance_schema_key, study_instance_schema_hash,
    validator_key, validator_hash
  ) references public.impact_study_validator_bindings(
    schema_key, schema_raw_sha256, validator_key, validator_raw_sha256
  )
);

create table public.impact_study_validator_attestations (
  study_instance_id uuid primary key
    references public.impact_study_instances(id),
  attestation_payload jsonb not null,
  attestation_payload_sha256 text not null,
  schema_key text not null,
  schema_raw_sha256 text not null,
  validator_key text not null,
  validator_raw_sha256 text not null,
  study_instance_payload_hash text not null,
  evidence_mapping_payload_hash text not null,
  validation_result text not null check (validation_result = 'valid'),
  execution_authorized boolean not null default false
    check (execution_authorized = false),
  created_at timestamptz not null default statement_timestamp(),
  check (public.impact_study_is_sha256(attestation_payload_sha256)),
  check (public.impact_study_is_sha256(schema_raw_sha256)),
  check (public.impact_study_is_sha256(validator_raw_sha256)),
  check (public.impact_study_is_sha256(study_instance_payload_hash)),
  check (public.impact_study_is_sha256(evidence_mapping_payload_hash))
);

create table public.impact_study_allowed_arms (
  study_instance_id uuid not null
    references public.impact_study_instances(id),
  arm_key text not null,
  assignment_probability numeric(12,10) not null
    check (assignment_probability > 0 and assignment_probability <= 1),
  primary key (study_instance_id, arm_key),
  check (public.impact_study_is_key(arm_key))
);

create table public.impact_study_allowed_exposure_cells (
  study_instance_id uuid not null
    references public.impact_study_instances(id),
  exposure_cell_key text not null,
  primary key (study_instance_id, exposure_cell_key),
  check (public.impact_study_is_key(exposure_cell_key))
);

create table public.impact_study_allowed_outcomes (
  study_instance_id uuid not null
    references public.impact_study_instances(id),
  outcome_key text not null,
  outcome_kind text not null
    check (outcome_kind in ('scalar_native_unit','prespecified_global_test')),
  native_unit text not null,
  outcome_role text not null
    check (outcome_role in ('primary','secondary','safety_cost')),
  primary key (study_instance_id, outcome_key),
  check (public.impact_study_is_key(outcome_key)),
  check (btrim(native_unit) <> '')
);

create table public.impact_study_allowed_evidence_schemes (
  study_instance_id uuid not null
    references public.impact_study_instances(id),
  scheme_prefix text not null
    check (scheme_prefix = 'qa-evidence://synthetic/'),
  primary key (study_instance_id, scheme_prefix)
);

create table public.impact_study_registry_events (
  id uuid primary key default gen_random_uuid(),
  study_instance_id uuid not null
    references public.impact_study_instances(id),
  event_sequence bigint generated always as identity,
  event_type text not null check (event_type in (
    'study_registered','amendment_recorded','deviation_recorded',
    'unblinding_recorded','post_assignment_eligibility_change_recorded',
    'synthetic_assignment_recorded','synthetic_exposure_recorded',
    'synthetic_outcome_recorded','safety_veto_recorded',
    'calibration_manifest_recorded','study_cancelled'
  )),
  event_payload jsonb not null,
  event_payload_sha256 text not null,
  execution_effect text not null default 'none'
    check (execution_effect = 'none'),
  synthetic_only boolean not null default true check (synthetic_only),
  recorded_at timestamptz not null default statement_timestamp(),
  recorded_by_role text not null default current_user,
  unique (study_instance_id, event_sequence),
  check (public.impact_study_is_sha256(event_payload_sha256))
);

create table public.impact_study_synthetic_assignments (
  id uuid primary key default gen_random_uuid(),
  study_instance_id uuid not null
    references public.impact_study_instances(id),
  synthetic_subject_key text not null,
  synthetic_cluster_key text not null,
  arm_key text not null,
  assignment_probability numeric(12,10) not null,
  planned_exposure_cell text not null,
  assignment_payload jsonb not null,
  assignment_payload_sha256 text not null,
  is_real_user boolean not null default false check (is_real_user = false),
  assigned_at timestamptz not null default statement_timestamp(),
  unique (study_instance_id, synthetic_subject_key),
  check (public.impact_study_is_synthetic_key(synthetic_subject_key)),
  check (public.impact_study_is_synthetic_key(synthetic_cluster_key)),
  check (public.impact_study_is_sha256(assignment_payload_sha256)),
  foreign key (study_instance_id, arm_key)
    references public.impact_study_allowed_arms(study_instance_id, arm_key),
  foreign key (study_instance_id, planned_exposure_cell)
    references public.impact_study_allowed_exposure_cells(
      study_instance_id, exposure_cell_key
    )
);

create table public.impact_study_synthetic_exposures (
  id uuid primary key default gen_random_uuid(),
  assignment_id uuid not null
    references public.impact_study_synthetic_assignments(id),
  exposure_event_key text not null,
  observed_exposure_cell text not null,
  contamination_detected boolean not null default false,
  spillover_detected boolean not null default false,
  exposure_payload jsonb not null,
  exposure_payload_sha256 text not null,
  observed_at timestamptz not null default statement_timestamp(),
  unique (assignment_id, exposure_event_key),
  check (public.impact_study_is_synthetic_key(exposure_event_key)),
  check (public.impact_study_is_sha256(exposure_payload_sha256))
);

create table public.impact_study_synthetic_outcomes (
  id uuid primary key default gen_random_uuid(),
  study_instance_id uuid not null
    references public.impact_study_instances(id),
  synthetic_subject_key text not null,
  outcome_key text not null,
  native_unit text not null,
  numeric_value numeric,
  resolution_status text not null
    check (resolution_status in ('reviewed','unresolved','missing','rejected')),
  evidence_refs text[] not null default '{}'::text[],
  outcome_payload jsonb not null,
  outcome_payload_sha256 text not null,
  causal_claim_authorized boolean not null default false
    check (causal_claim_authorized = false),
  additionality_claim_authorized boolean not null default false
    check (additionality_claim_authorized = false),
  participant_credit_authorized boolean not null default false
    check (participant_credit_authorized = false),
  recorded_at timestamptz not null default statement_timestamp(),
  unique (study_instance_id, synthetic_subject_key, outcome_key),
  check (public.impact_study_is_synthetic_key(synthetic_subject_key)),
  check (public.impact_study_is_sha256(outcome_payload_sha256)),
  check (
    resolution_status <> 'reviewed'
    or (numeric_value is not null and cardinality(evidence_refs) > 0)
  ),
  foreign key (study_instance_id, outcome_key)
    references public.impact_study_allowed_outcomes(
      study_instance_id, outcome_key
    )
);

create table public.impact_study_safety_events (
  id uuid primary key default gen_random_uuid(),
  study_instance_id uuid not null
    references public.impact_study_instances(id),
  safety_event_key text not null,
  synthetic_subject_key text,
  safety_outcome_key text not null check (safety_outcome_key in (
    'harmful_offer_or_threat',
    'baseline_manufacture_or_worsening',
    'harm_shifted_to_nonparticipants',
    'coercion_harassment_identity_exposure_or_retaliation',
    'concentration_or_exclusion_effect',
    'off_platform_substitution',
    'duplicate_or_overlapping_resource_claim'
  )),
  safety_status text not null
    check (safety_status in ('observed','unresolved')),
  blocking_veto boolean not null default true check (blocking_veto),
  safety_payload jsonb not null,
  safety_payload_sha256 text not null,
  recorded_at timestamptz not null default statement_timestamp(),
  unique (study_instance_id, safety_event_key),
  check (public.impact_study_is_synthetic_key(safety_event_key)),
  check (
    synthetic_subject_key is null
    or public.impact_study_is_synthetic_key(synthetic_subject_key)
  ),
  check (public.impact_study_is_sha256(safety_payload_sha256))
);

create table public.impact_study_calibration_manifests (
  id uuid primary key default gen_random_uuid(),
  study_instance_id uuid not null
    references public.impact_study_instances(id),
  dataset_key text not null,
  observation_count integer not null check (observation_count >= 0),
  source_scope text not null default 'synthetic_qa_only'
    check (source_scope = 'synthetic_qa_only'),
  holdout_status text not null default 'not_applicable_synthetic'
    check (holdout_status = 'not_applicable_synthetic'),
  eligible_for_empirical_calibration boolean not null default false
    check (eligible_for_empirical_calibration = false),
  eligible_for_model_activation boolean not null default false
    check (eligible_for_model_activation = false),
  manifest_payload jsonb not null,
  manifest_payload_sha256 text not null,
  created_at timestamptz not null default statement_timestamp(),
  unique (study_instance_id, dataset_key),
  check (public.impact_study_is_synthetic_key(dataset_key)),
  check (public.impact_study_is_sha256(manifest_payload_sha256))
);

commit;
