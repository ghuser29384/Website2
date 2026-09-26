begin;

do $qa_guard$
begin
  if not exists (
    select 1
    from moraltrade_qa.environment_identity
    where singleton
      and environment = 'qa'
      and project_ref = 'hvmxfjjbdcgjjudmthdz'
      and sentinel_id = 'a0244e19-9744-4a82-83e4-57776804cc06'::uuid
      and sentinel_sha256 = 'f7801a29e33764650322ad39e66a2062d9e2f750a9438e74d9fff0c9eeeb8d30'
      and provisioned_out_of_band
  ) then
    raise exception 'MoralTrade QA sentinel is absent or incorrect'
      using errcode = '55000';
  end if;
end;
$qa_guard$;

create trigger impact_study_instances_validate_insert
before insert on public.impact_study_instances
for each row execute function public.impact_study_validate_instance_insert();

create trigger impact_study_instances_append_only
before update or delete on public.impact_study_instances
for each row execute function public.impact_study_reject_mutation();

create trigger impact_study_attestations_validate_insert
before insert on public.impact_study_validator_attestations
for each row execute function public.impact_study_validate_attestation_insert();

create trigger impact_study_attestations_append_only
before update or delete on public.impact_study_validator_attestations
for each row execute function public.impact_study_reject_mutation();

create trigger impact_study_registry_events_validate_insert
before insert on public.impact_study_registry_events
for each row execute function public.impact_study_validate_child_insert();

create trigger impact_study_registry_events_append_only
before update or delete on public.impact_study_registry_events
for each row execute function public.impact_study_reject_mutation();

create trigger impact_study_assignments_validate_insert
before insert on public.impact_study_synthetic_assignments
for each row execute function public.impact_study_validate_child_insert();

create trigger impact_study_assignments_append_only
before update or delete on public.impact_study_synthetic_assignments
for each row execute function public.impact_study_reject_mutation();

create trigger impact_study_exposures_validate_insert
before insert on public.impact_study_synthetic_exposures
for each row execute function public.impact_study_validate_child_insert();

create trigger impact_study_exposures_append_only
before update or delete on public.impact_study_synthetic_exposures
for each row execute function public.impact_study_reject_mutation();

create trigger impact_study_outcomes_validate_insert
before insert on public.impact_study_synthetic_outcomes
for each row execute function public.impact_study_validate_child_insert();

create trigger impact_study_outcomes_append_only
before update or delete on public.impact_study_synthetic_outcomes
for each row execute function public.impact_study_reject_mutation();

create trigger impact_study_safety_validate_insert
before insert on public.impact_study_safety_events
for each row execute function public.impact_study_validate_child_insert();

create trigger impact_study_safety_append_only
before update or delete on public.impact_study_safety_events
for each row execute function public.impact_study_reject_mutation();

create trigger impact_study_calibration_validate_insert
before insert on public.impact_study_calibration_manifests
for each row execute function public.impact_study_validate_child_insert();

create trigger impact_study_calibration_append_only
before update or delete on public.impact_study_calibration_manifests
for each row execute function public.impact_study_reject_mutation();

create trigger impact_study_validator_bindings_append_only
before update or delete on public.impact_study_validator_bindings
for each row execute function public.impact_study_reject_mutation();

create trigger impact_study_protocol_bindings_append_only
before update or delete on public.impact_study_protocol_bindings
for each row execute function public.impact_study_reject_mutation();

create trigger impact_study_template_bindings_append_only
before update or delete on public.impact_study_template_bindings
for each row execute function public.impact_study_reject_mutation();

create trigger impact_study_template_variants_append_only
before update or delete on public.impact_study_template_variants
for each row execute function public.impact_study_reject_mutation();

create trigger impact_study_allowed_arms_append_only
before update or delete on public.impact_study_allowed_arms
for each row execute function public.impact_study_reject_mutation();

create trigger impact_study_allowed_exposure_cells_append_only
before update or delete on public.impact_study_allowed_exposure_cells
for each row execute function public.impact_study_reject_mutation();

create trigger impact_study_allowed_outcomes_append_only
before update or delete on public.impact_study_allowed_outcomes
for each row execute function public.impact_study_reject_mutation();

create trigger impact_study_allowed_evidence_schemes_append_only
before update or delete on public.impact_study_allowed_evidence_schemes
for each row execute function public.impact_study_reject_mutation();

alter table public.impact_study_validator_bindings enable row level security;
alter table public.impact_study_protocol_bindings enable row level security;
alter table public.impact_study_template_bindings enable row level security;
alter table public.impact_study_template_variants enable row level security;
alter table public.impact_study_instances enable row level security;
alter table public.impact_study_validator_attestations enable row level security;
alter table public.impact_study_allowed_arms enable row level security;
alter table public.impact_study_allowed_exposure_cells enable row level security;
alter table public.impact_study_allowed_outcomes enable row level security;
alter table public.impact_study_allowed_evidence_schemes enable row level security;
alter table public.impact_study_registry_events enable row level security;
alter table public.impact_study_synthetic_assignments enable row level security;
alter table public.impact_study_synthetic_exposures enable row level security;
alter table public.impact_study_synthetic_outcomes enable row level security;
alter table public.impact_study_safety_events enable row level security;
alter table public.impact_study_calibration_manifests enable row level security;

revoke all on table public.impact_study_validator_bindings,public.impact_study_protocol_bindings,public.impact_study_template_bindings,public.impact_study_template_variants,public.impact_study_instances,public.impact_study_validator_attestations,public.impact_study_allowed_arms,public.impact_study_allowed_exposure_cells,public.impact_study_allowed_outcomes,public.impact_study_allowed_evidence_schemes,public.impact_study_registry_events,public.impact_study_synthetic_assignments,public.impact_study_synthetic_exposures,public.impact_study_synthetic_outcomes,public.impact_study_safety_events,public.impact_study_calibration_manifests
from public, anon, authenticated, service_role;

grant select on table public.impact_study_validator_bindings,public.impact_study_protocol_bindings,public.impact_study_template_bindings,public.impact_study_template_variants,public.impact_study_instances,public.impact_study_validator_attestations,public.impact_study_allowed_arms,public.impact_study_allowed_exposure_cells,public.impact_study_allowed_outcomes,public.impact_study_allowed_evidence_schemes,public.impact_study_registry_events,public.impact_study_synthetic_assignments,public.impact_study_synthetic_exposures,public.impact_study_synthetic_outcomes,public.impact_study_safety_events,public.impact_study_calibration_manifests
to service_role;

do $sequence_privileges$
declare
  event_sequence regclass :=
    to_regclass('public.impact_study_registry_events_event_sequence_seq');
begin
  if event_sequence is not null then
    execute format(
      'revoke all on sequence %s from public, anon, authenticated, service_role',
      event_sequence
    );
  end if;
end;
$sequence_privileges$;

revoke execute on function
  public.register_qa_impact_study_instance(jsonb),
  public.register_qa_impact_study_instance(jsonb,jsonb),
  public.append_qa_impact_study_event(uuid,text,jsonb),
  public.record_qa_synthetic_assignment(
    uuid,text,text,text,numeric,text,jsonb
  ),
  public.record_qa_synthetic_exposure(
    uuid,text,text,boolean,boolean,jsonb
  ),
  public.record_qa_synthetic_outcome(
    uuid,text,text,text,numeric,text,text[],jsonb
  ),
  public.record_qa_impact_safety_event(
    uuid,text,text,text,text,jsonb
  ),
  public.register_qa_synthetic_calibration_manifest(
    uuid,text,integer,jsonb
  )
from public, anon, authenticated, service_role;

grant execute on function
  public.register_qa_impact_study_instance(jsonb,jsonb),
  public.append_qa_impact_study_event(uuid,text,jsonb),
  public.record_qa_synthetic_assignment(
    uuid,text,text,text,numeric,text,jsonb
  ),
  public.record_qa_synthetic_exposure(
    uuid,text,text,boolean,boolean,jsonb
  ),
  public.record_qa_synthetic_outcome(
    uuid,text,text,text,numeric,text,text[],jsonb
  ),
  public.record_qa_impact_safety_event(
    uuid,text,text,text,text,jsonb
  ),
  public.register_qa_synthetic_calibration_manifest(
    uuid,text,integer,jsonb
  )
to service_role;

revoke execute on function
  public.impact_study_is_sha256(text),
  public.impact_study_is_key(text),
  public.impact_study_is_synthetic_key(text),
  public.impact_study_is_synthetic_evidence_ref(text),
  public.impact_study_jsonb_children(jsonb),
  public.impact_study_payload_contains_real_identifiers(jsonb),
  public.impact_study_canonical_number(jsonb),
  public.impact_study_canonical_json(jsonb),
  public.impact_study_jsonb_sha256(jsonb),
  public.impact_study_assert_payload_hash(jsonb,text),
  public.impact_study_object_has_exact_keys(jsonb,text[]),
  public.impact_study_is_string_array(jsonb,integer,boolean),
  public.impact_study_required_binding_names(),
  public.impact_study_assert_no_real_identifiers(jsonb,text),
  public.impact_study_assert_outcome_object(jsonb,text),
  public.impact_study_assert_instance_semantics(jsonb),
  public.impact_study_assert_validator_attestation(jsonb,jsonb),
  public.impact_study_assert_child_payload(text,jsonb),
  public.impact_study_assert_event_payload(text,jsonb),
  public.impact_study_is_blocked(uuid),
  public.impact_study_reject_mutation(),
  public.impact_study_validate_instance_insert(),
  public.impact_study_validate_attestation_insert(),
  public.impact_study_validate_child_insert()
from public, anon, authenticated, service_role;

comment on table public.impact_study_instances is
  'MoralTrade QA-only, synthetic-only, non-executing study registry. No row authorizes a real-user study.';
comment on table public.impact_study_calibration_manifests is
  'Synthetic QA manifests are structurally ineligible for empirical calibration and model activation.';
comment on function public.register_qa_impact_study_instance(jsonb,jsonb) is
  'Registers an exact validator-attested synthetic QA study instance; never authorizes execution.';
comment on schema moraltrade_qa is
  'Independently provisioned QA environment identity; intentionally absent from production.';

commit;
