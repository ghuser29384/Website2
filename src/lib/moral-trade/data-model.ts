import dataModelProfileJson from "../../../config/moral-trade/data-model-profile.json";

export const MORAL_TRADE_DATA_MODEL_VALIDATOR_VERSION =
  "moral-trade-data-model-validator-v0.3";

export type MoralTradeDataModelCategory =
  | "identity"
  | "profile"
  | "proposal"
  | "privacy"
  | "evidence"
  | "review"
  | "matching"
  | "operations"
  | "payment"
  | "provenance";

export type MoralTradeDataModelEntity = {
  key: string;
  label: string;
  category: MoralTradeDataModelCategory;
  privacyClass: string;
  requiredFields: string[];
  relationships: string[];
  publicExposure: string;
};

export type MoralTradeDataModelRule = {
  key: string;
  rule: string;
};

export type MoralTradeDataModelProfile = {
  version: string;
  purpose: string;
  entities: MoralTradeDataModelEntity[];
  privacyClasses: MoralTradeDataModelRule[];
  offerRequiredFields: string[];
  relationshipBoundaries: MoralTradeDataModelRule[];
  nonClaims: string[];
  contractTests: string[];
};

export type MoralTradeDataModelValidationCheck = {
  id: string;
  label: string;
  status: "pass" | "fail";
  evidence: string;
};

export type MoralTradeDataModelValidation = {
  status: "pass" | "fail";
  validatorName: "moral-trade-data-model-profile";
  validatorVersion: string;
  profileVersion: string;
  checks: MoralTradeDataModelValidationCheck[];
  blockers: string[];
};

const dataModelProfile = dataModelProfileJson as MoralTradeDataModelProfile;

const REQUIRED_ENTITIES = [
  "participant",
  "public_profile",
  "private_wish_profile",
  "offer",
  "trade_format",
  "baseline_statement",
  "evidence_claim",
  "evidence_artifact",
  "external_entity_reference",
  "traceability_event",
  "provenance_activity",
  "provenance_agent",
  "state_transition_event_record",
  "review_decision",
  "challenge",
  "appeal",
  "privacy_grant",
  "match_suggestion",
  "notification",
  "payment_record",
  "agreement_event",
  "source_connection",
  "source_note",
  "background_wish_interview_session",
  "background_wish_interview_answer",
  "background_wish_dialogue_session",
  "background_wish_dialogue_message",
  "background_wish_field_proposal",
  "background_source_summary",
  "background_source_sync_job",
  "background_profile_signal",
  "background_opportunity_brief",
  "background_helper_run",
  "background_match_feedback",
  "background_intro_packet",
  "background_private_overlap_tag",
  "background_private_overlap_check",
  "transparency_receipt",
  "match_concierge_request",
  "saved_search",
  "profile_visibility_control",
  "dispute",
  "payment_update",
] as const;

const DEPRECATED_ENTITY_KEYS = ["reviewer_decision"] as const;

const REQUIRED_OFFER_FIELDS = [
  "cause_areas",
  "offered_action",
  "requested_action",
  "expected_impact",
  "verification_method",
  "duration",
  "exit_conditions",
  "baseline_statement",
] as const;

const REQUIRED_PRIVACY_CLASSES = [
  "public_contract",
  "public_preview",
  "privacy_thresholded_public_preview",
  "private_authenticated",
  "authenticated_private",
  "review_scoped",
  "consent_granted",
  "operational_private",
] as const;

const REQUIRED_BOUNDARIES = [
  "profile_privacy_boundary",
  "source_note_boundary",
  "match_disclosure_boundary",
  "review_state_boundary",
  "payment_non_custody_boundary",
] as const;

const REQUIRED_CONTRACT_TESTS = [
  "data_model_profile_validator",
  "data_model_entity_coverage",
  "data_model_profile_json_schema",
  "offer_required_field_contract",
  "source_note_privacy_boundary",
  "public_data_model_contract_route",
  "api_contract_data_model_route",
  "health_data_model_smoke",
  "technical_spec_data_model_smoke",
] as const;

const PRIVATE_ENTITY_KEYS = [
  "private_wish_profile",
  "source_connection",
  "source_note",
  "background_wish_interview_session",
  "background_wish_interview_answer",
  "background_wish_dialogue_session",
  "background_wish_dialogue_message",
  "background_wish_field_proposal",
  "background_source_summary",
  "background_source_sync_job",
  "background_profile_signal",
  "background_opportunity_brief",
  "background_helper_run",
  "background_match_feedback",
  "background_intro_packet",
  "background_private_overlap_tag",
  "background_private_overlap_check",
  "transparency_receipt",
  "saved_search",
  "privacy_grant",
  "notification",
  "payment_record",
  "payment_update",
] as const;

function hasAll(values: readonly string[], required: readonly string[]) {
  return required.every((entry) => values.includes(entry));
}

function check(
  id: string,
  label: string,
  passed: boolean,
  evidence: string,
): MoralTradeDataModelValidationCheck {
  return {
    id,
    label,
    status: passed ? "pass" : "fail",
    evidence,
  };
}

export function getMoralTradeDataModelProfile() {
  return dataModelProfile;
}

export function validateMoralTradeDataModelProfile(
  profile: MoralTradeDataModelProfile = dataModelProfile,
): MoralTradeDataModelValidation {
  const entityKeys = profile.entities.map((entity) => entity.key);
  const entityKeySet = new Set(entityKeys);
  const privacyClassKeys = profile.privacyClasses.map((privacyClass) => privacyClass.key);
  const boundaryKeys = profile.relationshipBoundaries.map((boundary) => boundary.key);
  const duplicateEntityKeys = entityKeys.filter(
    (key, index) => entityKeys.indexOf(key) !== index,
  );
  const unknownRelationshipTargets = profile.entities.flatMap((entity) =>
    entity.relationships
      .filter((relationship) => !entityKeySet.has(relationship))
      .map((relationship) => `${entity.key}:${relationship}`),
  );
  const deprecatedEntityKeys = entityKeys.filter((key) =>
    DEPRECATED_ENTITY_KEYS.includes(key as (typeof DEPRECATED_ENTITY_KEYS)[number]),
  );
  const privateEntities = profile.entities.filter((entity) =>
    PRIVATE_ENTITY_KEYS.includes(entity.key as (typeof PRIVATE_ENTITY_KEYS)[number]),
  );
  const privateEntityPrivacyOk = privateEntities.every(
    (entity) =>
      entity.privacyClass.includes("private") ||
      entity.privacyClass === "consent_granted" ||
      entity.privacyClass === "operational_private",
  );
  const offerEntity = profile.entities.find((entity) => entity.key === "offer");
  const matchSuggestionEntity = profile.entities.find(
    (entity) => entity.key === "match_suggestion",
  );
  const traceabilityEntity = profile.entities.find(
    (entity) => entity.key === "traceability_event",
  );
  const stateTransitionEntity = profile.entities.find(
    (entity) => entity.key === "state_transition_event_record",
  );
  const sourceBoundary = profile.relationshipBoundaries.find(
    (boundary) => boundary.key === "source_note_boundary",
  );
  const matchBoundary = profile.relationshipBoundaries.find(
    (boundary) => boundary.key === "match_disclosure_boundary",
  );
  const reviewBoundary = profile.relationshipBoundaries.find(
    (boundary) => boundary.key === "review_state_boundary",
  );
  const paymentBoundary = profile.relationshipBoundaries.find(
    (boundary) => boundary.key === "payment_non_custody_boundary",
  );
  const nonClaimText = profile.nonClaims.join(" ");

  const checks = [
    check(
      "entity-coverage",
      "Core data model entities",
      hasAll(entityKeys, REQUIRED_ENTITIES) &&
        duplicateEntityKeys.length === 0 &&
        deprecatedEntityKeys.length === 0,
      `${profile.entities.length} entity/entities; duplicates: ${
        duplicateEntityKeys.length ? duplicateEntityKeys.join(", ") : "none"
      }; deprecated: ${deprecatedEntityKeys.length ? deprecatedEntityKeys.join(", ") : "none"}.`,
    ),
    check(
      "entity-field-coverage",
      "Entities publish required field contracts",
      profile.entities.every(
        (entity) =>
          entity.label &&
          entity.category &&
          entity.privacyClass &&
          entity.requiredFields.length >= 4 &&
          entity.publicExposure,
      ),
      `${profile.entities.filter((entity) => entity.requiredFields.length >= 4).length} entity/entities have four or more required fields.`,
    ),
    check(
      "provenance-audit-questions",
      "Provenance events answer what, who, and when",
      Boolean(
        traceabilityEntity?.requiredFields.includes("audit_question_answers") &&
          stateTransitionEntity?.requiredFields.includes("audit_question_answers") &&
          /what happened, who touched it, and when/i.test(traceabilityEntity.publicExposure) &&
          /what happened, who touched it, and when/i.test(stateTransitionEntity.publicExposure),
      ),
      [
        `traceability=${traceabilityEntity?.requiredFields.join(",") ?? "missing"}`,
        `state_transition=${stateTransitionEntity?.requiredFields.join(",") ?? "missing"}`,
      ].join("; "),
    ),
    check(
      "match-suggestion-disclosure-policy",
      "Match suggestions name disclosure stage, privacy policy, redactions, and human review",
      Boolean(
        matchSuggestionEntity &&
          hasAll(matchSuggestionEntity.requiredFields, [
            "disclosure_stage",
            "privacy_policy_id",
            "redacted_fields",
            "human_review_required",
            "created_at",
          ]) &&
          /privacy policy ids/i.test(matchSuggestionEntity.publicExposure) &&
          /hidden until consent/i.test(matchSuggestionEntity.publicExposure),
      ),
      matchSuggestionEntity?.requiredFields.join(", ") ?? "missing match_suggestion",
    ),
    check(
      "offer-required-fields",
      "Offer fields match the audit data model",
      hasAll(profile.offerRequiredFields, REQUIRED_OFFER_FIELDS) &&
        Boolean(offerEntity && hasAll(offerEntity.requiredFields, REQUIRED_OFFER_FIELDS)),
      `${profile.offerRequiredFields.join(", ")}`,
    ),
    check(
      "privacy-classes",
      "Privacy classes cover public, private, consent, and operations records",
      hasAll(privacyClassKeys, REQUIRED_PRIVACY_CLASSES) &&
        profile.privacyClasses.every((privacyClass) => privacyClass.rule.length >= 20),
      `${profile.privacyClasses.length} privacy class(es).`,
    ),
    check(
      "private-entity-boundaries",
      "Private records are not public by default",
      privateEntityPrivacyOk &&
        privateEntities.every((entity) =>
          /exact wishes|source notes|private feeds|contact|public|grant|generic|external|escrow|custody|provider|payment/i.test(
            entity.publicExposure,
          ),
        ),
      privateEntities.map((entity) => `${entity.key}:${entity.privacyClass}`).join(", "),
    ),
    check(
      "relationship-boundaries",
      "Relationship boundaries prevent hidden disclosure or automatic reliance",
      hasAll(boundaryKeys, REQUIRED_BOUNDARIES) &&
        unknownRelationshipTargets.length === 0 &&
        Boolean(sourceBoundary && /raw private feeds|not mined/i.test(sourceBoundary.rule)) &&
        Boolean(matchBoundary && /exact wishes|source notes|contacts|staged disclosure/i.test(matchBoundary.rule)) &&
        Boolean(reviewBoundary && /human review|provenance activity/i.test(reviewBoundary.rule)) &&
        Boolean(paymentBoundary && /not custody|escrow|tax|legal|investment/i.test(paymentBoundary.rule)),
      unknownRelationshipTargets.length
        ? unknownRelationshipTargets.join(", ")
        : `${profile.relationshipBoundaries.length} boundary rule(s).`,
    ),
    check(
      "non-claims",
      "Public non-claims prevent overclaiming",
      /objective platform moral rankings/i.test(nonClaimText) &&
        /autonomous outreach/i.test(nonClaimText) &&
        /raw private feeds/i.test(nonClaimText) &&
        /escrow|custody|tax|legal|investment/i.test(nonClaimText) &&
        /human review|provenance events/i.test(nonClaimText),
      `${profile.nonClaims.length} non-claim(s).`,
    ),
    check(
      "contract-tests",
      "Contract test hooks",
      hasAll(profile.contractTests, REQUIRED_CONTRACT_TESTS),
      profile.contractTests.join(", "),
    ),
  ];
  const blockers = checks
    .filter((entry) => entry.status === "fail")
    .map((entry) => `${entry.id}: ${entry.label}`);

  return {
    status: blockers.length ? "fail" : "pass",
    validatorName: "moral-trade-data-model-profile",
    validatorVersion: MORAL_TRADE_DATA_MODEL_VALIDATOR_VERSION,
    profileVersion: profile.version,
    checks,
    blockers,
  };
}
