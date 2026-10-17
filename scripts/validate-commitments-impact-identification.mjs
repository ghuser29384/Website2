import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const docsDir = "docs/commitments/impact-identification";
const schemaPath = path.join(docsDir, "protocol.schema.json");
const masterPath = path.join(docsDir, "master-protocol.v2.json");
const mappingPath = path.join(docsDir, "evidence-to-product-mapping.v2.json");
const prosePath = path.join(
  docsDir,
  "causal-identification-and-calibration-preregistration-v2.md",
);
const expectedMechanisms = [
  "trade",
  "co_fund",
  "threshold_funding",
  "donation_upgrade",
  "threshold_sign_on",
  "donation_redirect",
];
const requiredBindingNames = [
  "studyKey",
  "studyVersion",
  "mechanismFamily",
  "studyVariant",
  "eligiblePopulationSnapshotHash",
  "eligibilityRules",
  "exclusionRules",
  "assignmentUnit",
  "exposureUnit",
  "outcomeUnit",
  "analysisUnit",
  "interferenceClusterDefinition",
  "assignmentDesign",
  "assignmentProbabilities",
  "blockingAndStratificationVariables",
  "exposureMapping",
  "supportedExposureCells",
  "emptyExposureCellAction",
  "primaryEstimand",
  "potentialOutcomeContrast",
  "targetPopulation",
  "primaryOutcome",
  "outcomeWindow",
  "estimator",
  "varianceProcedure",
  "finiteSampleInference",
  "unequalClusterSizeHandling",
  "covariateAdjustmentPolicy",
  "missingnessEstimand",
  "attritionBounds",
  "sensitivityAnalyses",
  "graphDiagnostics",
  "precisionSimulation",
  "fixedHorizonOrSequentialDesign",
  "ethicsDetermination",
  "participantDefinition",
  "consentOrWaiver",
  "controlConditionJustification",
  "vulnerableParticipantProtections",
  "debriefingPolicy",
  "adverseEventMonitoring",
  "stopAndSuspensionRules",
  "privacyRetentionAndDeletion",
  "accessControl",
  "incidentResponse",
  "entropySource",
  "seedGenerationProcedure",
  "seedCommitment",
  "constrainedRandomizationRule",
  "assignmentConcealment",
  "outcomeAdjudicatorBlinding",
  "unblindingLog",
  "postAssignmentEligibilityChangeLog",
  "differentialEvidenceResolutionAudit",
  "blockingSafetyOutcomes",
  "contaminationAndSpilloverMonitoring",
  "offPlatformSubstitutionAudit",
  "resourceClaimDeduplication",
  "analysisCodeHash",
  "protocolPayloadHash",
  "templatePayloadHash",
  "studyInstancePayloadHash",
  "appendOnlyRegistryRecord",
  "protectedTagOrEquivalent",
  "amendmentLog",
  "deviationLog",
];

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function canonicalize(value) {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, entry]) => [key, canonicalize(entry)]),
    );
  }
  return value;
}

function payloadHash(value) {
  return `sha256:${crypto
    .createHash("sha256")
    .update(JSON.stringify(canonicalize(value)))
    .digest("hex")}`;
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function nonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function nonEmptyArray(value) {
  return Array.isArray(value) && value.length > 0;
}

function includesAll(values, expected) {
  return (
    Array.isArray(values) &&
    expected.every((entry) => values.includes(entry))
  );
}

function validateArtifactEnvelope(artifact, kind, keyName, keyValue) {
  assert(
    artifact?.artifactSchemaVersion ===
      "moral-trade-impact-identification-artifact-v2",
    `${kind}: unexpected artifact schema.`,
  );
  assert(artifact?.artifactKind === kind, `${kind}: artifact kind mismatch.`);
  assert(artifact?.[keyName] === keyValue, `${kind}: identity mismatch.`);
  assert(artifact?.version === 2, `${kind}: version must equal 2.`);
  assert(artifact?.status === "under_review", `${kind}: must remain under_review.`);
  assert(
    /^sha256:[0-9a-f]{64}$/.test(artifact?.payloadSha256 ?? ""),
    `${kind}: payload hash is malformed.`,
  );
  assert(
    payloadHash(artifact.payload) === artifact.payloadSha256,
    `${kind}: canonical payload hash mismatch.`,
  );
}

function validateSchema(schema) {
  assert(
    schema?.$schema === "https://json-schema.org/draft/2020-12/schema",
    "Protocol schema must use JSON Schema draft 2020-12.",
  );
  assert(Array.isArray(schema.oneOf) && schema.oneOf.length === 3, "Schema must cover three artifact kinds.");
  const defs = schema.$defs;
  assert(defs && typeof defs === "object", "Schema definitions are missing.");
  for (const name of [
    "masterProtocolWrapper",
    "studyTemplateWrapper",
    "evidenceMappingWrapper",
    "masterPayload",
    "templatePayload",
    "mappingPayload",
    "ethicsGovernance",
    "concealment",
    "precision",
    "safety",
    "provenance",
  ]) {
    assert(defs[name], `Schema definition ${name} is missing.`);
  }
  const bindingRequired =
    defs.templatePayload?.properties?.requiredStudyInstanceBindings?.required;
  assert(
    includesAll(bindingRequired, requiredBindingNames),
    "Schema does not make every required study-instance binding mandatory.",
  );
}

function validateMaster(master) {
  validateArtifactEnvelope(
    master,
    "master_protocol",
    "protocolKey",
    "commitments-causal-identification-and-calibration-master-v2",
  );
  const p = master.payload;
  assert(p.protocolStatus === "under_review", "Master protocol must remain under_review.");
  assert(p.executionAuthorization?.authorized === false, "Execution must remain unauthorized.");
  assert(p.executionAuthorization?.environment === "none", "No execution environment may be authorized.");
  assert(
    nonEmptyArray(p.executionAuthorization?.prohibitedActions),
    "Execution prohibitions are missing.",
  );
  assert(
    Array.isArray(p.sourceBoundary?.calibrationEvidenceRefs) &&
      p.sourceBoundary.calibrationEvidenceRefs.length === 0,
    "The protocol must not claim empirical calibration evidence.",
  );
  assert(
    includesAll(Object.keys(p.evidenceStreams ?? {}), [
      "outcomePrediction",
      "causalIdentification",
      "transportability",
    ]),
    "The three evidence streams are not separated.",
  );
  assert(
    p.productClaimPolicy?.policyLevelEvidenceMaySupportPolicyClaims === true &&
      p.productClaimPolicy
        ?.policyLevelEvidenceAuthorizesParticipantCausalCredit === false &&
      p.productClaimPolicy?.localEffectsArePopulationSpecific === true &&
      p.productClaimPolicy?.localEffectsAreNonAdditive === true &&
      p.productClaimPolicy?.participantExpectedAdditionalDefault ===
        "withheld" &&
      p.productClaimPolicy?.participantDirectCausalAttributionDefault ===
        "withheld" &&
      p.productClaimPolicy?.verifiedOutcomeEstablishesCounterfactual ===
        false &&
      p.productClaimPolicy?.highConfidenceAllowed === false,
    "The evidence-to-product fail-closed policy is incomplete.",
  );
  assert(
    includesAll(
      p.masterStudyInstanceContract?.requiredBindingNames,
      requiredBindingNames,
    ),
    "Master protocol does not bind every required study-instance field.",
  );
  assert(
    p.masterStudyInstanceContract?.ethicsGovernance
      ?.independentDeterminationRequired === true &&
      p.masterStudyInstanceContract?.ethicsGovernance
        ?.gatekeeperPermissionIsNotParticipantConsent === true &&
      p.masterStudyInstanceContract?.ethicsGovernance?.status ===
        "required_not_completed",
    "Independent ethics governance is not fail-closed.",
  );
  assert(
    p.masterStudyInstanceContract?.allocationConcealment
      ?.eligibilityFrozenBeforeSeedGeneration === true &&
      p.masterStudyInstanceContract?.allocationConcealment
        ?.seedShoppingProhibited === true &&
      p.masterStudyInstanceContract?.allocationConcealment
        ?.undisclosedRerandomizationProhibited === true &&
      p.masterStudyInstanceContract?.allocationConcealment
        ?.differentialEvidenceResolutionAuditedByArm === true,
    "Allocation concealment is incomplete.",
  );
  assert(
    p.masterStudyInstanceContract?.precisionAndStopping
      ?.simulationRequiredBeforeLaunch === true &&
      p.masterStudyInstanceContract?.precisionAndStopping
        ?.optionalStoppingProhibited === true &&
      p.masterStudyInstanceContract?.precisionAndStopping
        ?.fixedHorizonOrValidSequentialDesignRequired === true,
    "Precision and stopping governance is incomplete.",
  );
  assert(
    p.masterStudyInstanceContract?.safetyVetoPolicy?.safetyOutcomesAreVetoes ===
      true &&
      p.masterStudyInstanceContract?.safetyVetoPolicy
        ?.noImplicitMoralAggregation === true &&
      nonEmptyArray(
        p.masterStudyInstanceContract?.safetyVetoPolicy
          ?.requiredBlockingOutcomes,
      ),
    "Safety vetoes are incomplete.",
  );
  assert(
    p.masterStudyInstanceContract?.provenanceAndImmutability
      ?.canonicalPayloadHashRequired === true &&
      p.masterStudyInstanceContract?.provenanceAndImmutability
        ?.signedProtectedTagOrEquivalentRequiredBeforeApproval === true &&
      p.masterStudyInstanceContract?.provenanceAndImmutability
        ?.appendOnlyRegistryRequiredBeforeAssignment === true &&
      p.masterStudyInstanceContract?.provenanceAndImmutability
        ?.preAssignmentAmendmentsAndPostAssignmentDeviationsSeparated === true,
    "Protocol provenance and immutability are incomplete.",
  );
  assert(
    Array.isArray(p.templateManifest) &&
      p.templateManifest.length === expectedMechanisms.length,
    "Master protocol must bind exactly six templates.",
  );
  const manifestMechanisms = p.templateManifest.map(
    (entry) => entry.mechanismFamily,
  );
  assert(
    JSON.stringify(manifestMechanisms) === JSON.stringify(expectedMechanisms),
    "Template manifest order or mechanism set is incorrect.",
  );
  assert(
    p.qualityGatePolicy?.validatorRequired === true &&
      p.qualityGatePolicy?.negativeSelfTestRequired === true &&
      p.qualityGatePolicy?.exactDiffCheckRequired === true &&
      p.qualityGatePolicy?.runtimeBuildRequired === false,
    "Repository-only quality-gate policy is incomplete.",
  );
  assert(nonEmptyArray(p.approvalBlockers), "Approval blockers are missing.");
}

function validateMapping(mapping) {
  validateArtifactEnvelope(
    mapping,
    "evidence_to_product_mapping",
    "mappingKey",
    "commitments-impact-evidence-to-product-v2",
  );
  const p = mapping.payload;
  assert(p.mappingStatus === "under_review", "Evidence mapping must remain under_review.");
  const byComponent = new Map(
    (p.pr534Components ?? []).map((entry) => [entry.component, entry]),
  );
  for (const component of [
    "deterministic_terms",
    "verified_outcome",
    "baseline_redirected",
    "platform_funded_bonus",
    "assignment_policy_itt",
    "success_case_additional",
    "expected_additional",
    "direct_causal_attribution",
    "cooperative_allocation",
    "confidence_label",
  ]) {
    assert(byComponent.has(component), `Evidence mapping omits ${component}.`);
    assert(
      byComponent.get(component).participantCreditAuthorized === false,
      `${component}: participant credit must remain unauthorized.`,
    );
  }
  for (const component of ["expected_additional", "direct_causal_attribution"]) {
    const entry = byComponent.get(component);
    assert(
      entry.causalStudyRequired === true &&
        entry.policyStudyCanSupport === false &&
        /withheld|does not identify/i.test(entry.displayRule),
      `${component}: policy ITT must not authorize the participant component.`,
    );
  }
  assert(
    byComponent.get("assignment_policy_itt").policyStudyCanSupport === true,
    "Assignment-policy ITT support is missing.",
  );
  assert(
    byComponent.get("verified_outcome").causalStudyRequired === false &&
      /not.*additionality|never described/i.test(
        byComponent.get("verified_outcome").displayRule,
      ),
    "Verified outcome is being conflated with additionality.",
  );
  assert(
    includesAll(
      (p.evidenceStreams ?? []).map((entry) => entry.stream),
      [
        "outcome_prediction",
        "causal_identification",
        "transportability",
        "reviewed_outcome_evidence",
      ],
    ),
    "Evidence mapping omits a required evidence stream.",
  );
  assert(
    includesAll(Object.keys(p.mechanismNotes ?? {}), expectedMechanisms),
    "Evidence mapping omits a mechanism note.",
  );
  assert(nonEmptyArray(p.globalFailClosedRules), "Global fail-closed rules are missing.");
}

function validateTemplate(template, mechanism, masterEntry) {
  validateArtifactEnvelope(
    template,
    "mechanism_study_template",
    "templateKey",
    masterEntry.templateKey,
  );
  assert(
    template.mechanismFamily === mechanism &&
      template.payload.mechanismFamily === mechanism,
    `${mechanism}: template family mismatch.`,
  );
  assert(
    template.payloadSha256 === masterEntry.payloadSha256,
    `${mechanism}: master manifest hash mismatch.`,
  );
  const p = template.payload;
  assert(p.templateStatus === "under_review", `${mechanism}: template must remain under_review.`);
  assert(p.executionAuthorized === false, `${mechanism}: execution must remain unauthorized.`);
  assert(nonEmptyArray(p.studyVariants), `${mechanism}: no study variants.`);
  for (const variant of p.studyVariants) {
    assert(
      nonEmptyString(variant.variantKey) &&
        variant.status === "specified_not_validated",
      `${mechanism}: invalid study variant.`,
    );
  }
  assert(
    p.fixedDesignChoices?.participantSpecificCreditAuthorized === false,
    `${mechanism}: participant-specific credit must remain unauthorized.`,
  );
  for (const unit of [
    "assignmentUnit",
    "exposureUnit",
    "outcomeUnit",
    "analysisUnit",
    "primaryEstimatorFamily",
  ]) {
    assert(nonEmptyString(p.fixedDesignChoices?.[unit]), `${mechanism}: ${unit} missing.`);
  }
  for (const name of requiredBindingNames) {
    const entry = p.requiredStudyInstanceBindings?.[name];
    assert(entry, `${mechanism}: required binding ${name} is missing.`);
    assert(
      entry.status === "study_instance_required" &&
        nonEmptyString(entry.valueType),
      `${mechanism}: invalid binding ${name}.`,
    );
  }
  assert(
    p.ethicsGovernance?.independentDeterminationRequired === true &&
      p.ethicsGovernance?.gatekeeperPermissionIsNotParticipantConsent ===
        true &&
      p.ethicsGovernance?.status === "required_not_completed" &&
      nonEmptyArray(p.ethicsGovernance?.requiredDeterminations) &&
      nonEmptyArray(p.ethicsGovernance?.requiredProtections),
    `${mechanism}: ethics gate is incomplete.`,
  );
  assert(
    p.allocationConcealment?.eligibilityFrozenBeforeSeedGeneration === true &&
      p.allocationConcealment?.seedShoppingProhibited === true &&
      p.allocationConcealment?.undisclosedRerandomizationProhibited === true &&
      p.allocationConcealment?.assignmentConcealedUntilEligibilityIrreversible ===
        true &&
      p.allocationConcealment?.allUnblindingAndPostAssignmentEligibilityChangesLogged ===
        true &&
      p.allocationConcealment?.differentialEvidenceResolutionAuditedByArm ===
        true,
    `${mechanism}: allocation concealment is incomplete.`,
  );
  assert(
    p.precisionAndStopping?.simulationRequiredBeforeLaunch === true &&
      nonEmptyArray(p.precisionAndStopping?.requiredInputs) &&
      nonEmptyArray(p.precisionAndStopping?.requiredOutputs) &&
      p.precisionAndStopping?.optionalStoppingProhibited === true,
    `${mechanism}: precision contract is incomplete.`,
  );
  assert(
    p.safetyVetoPolicy?.safetyOutcomesAreVetoes === true &&
      p.safetyVetoPolicy?.noImplicitMoralAggregation === true &&
      nonEmptyArray(p.safetyVetoPolicy?.requiredBlockingOutcomes) &&
      nonEmptyArray(p.safetyVetoPolicy?.prohibitedStudyArms),
    `${mechanism}: safety vetoes are incomplete.`,
  );
  assert(
    p.provenanceAndImmutability?.canonicalPayloadHashRequired === true &&
      p.provenanceAndImmutability
        ?.signedProtectedTagOrEquivalentRequiredBeforeApproval === true &&
      p.provenanceAndImmutability
        ?.appendOnlyRegistryRequiredBeforeAssignment === true &&
      nonEmptyArray(p.provenanceAndImmutability?.registryMustBind),
    `${mechanism}: provenance contract is incomplete.`,
  );

  const mapping = p.evidenceToProductMapping;
  const supports = (mapping?.supports ?? []).map((entry) => entry.claimId);
  const doesNotSupport = new Map(
    (mapping?.doesNotSupport ?? []).map((entry) => [entry.claimId, entry]),
  );
  assert(
    includesAll(supports, ["assignment_policy_itt", "reviewed_outcome_quantity"]),
    `${mechanism}: supported policy and outcome claims are incomplete.`,
  );
  assert(
    doesNotSupport.has("participant_expected_additional") &&
      doesNotSupport.has("participant_direct_causal_attribution") &&
      doesNotSupport.has("verified_additionality") &&
      doesNotSupport.has("high_confidence_participant_impact"),
    `${mechanism}: unsupported participant claims are not explicit.`,
  );
  assert(
    mapping?.participantCausalComponentsDefault === "withheld" &&
      mapping?.localEffectsArePopulationSpecific === true &&
      mapping?.localEffectsAreNonAdditive === true,
    `${mechanism}: local and participant effect policy is incomplete.`,
  );
  assert(
    nonEmptyArray(p.launchBlockers) &&
      p.launchBlockers.includes("production_experiment_not_authorized"),
    `${mechanism}: launch blockers are incomplete.`,
  );

  validateMechanismSpecific(template);
}

function validateMechanismSpecific(template) {
  const mechanism = template.mechanismFamily;
  const p = template.payload;
  const serialized = JSON.stringify(p);
  switch (mechanism) {
    case "trade":
      assert(
        p.studyVariants.length === 1 &&
          p.studyVariants[0].variantKey ===
            "graph_cluster_role_2x2_encouragement" &&
          includesAll(p.studyVariants[0].assignmentArms, [
            "neither_role",
            "role_a_only",
            "role_b_only",
            "both_roles",
          ]),
        "trade: exact 2x2 bilateral encouragement design is not bound.",
      );
      assert(
        /largest-component|effective independent-cluster|cut-edge/i.test(
          serialized,
        ),
        "trade: graph diagnostics are incomplete.",
      );
      break;
    case "co_fund":
      assert(
        includesAll(
          p.studyVariants.map((entry) => entry.variantKey),
          [
            "project_delivery_policy_effect",
            "other_resources_unlocked_policy_effect",
          ],
        ),
        "co_fund: primary estimand variants are incomplete.",
      );
      assert(
        /participant-project graph|sharing a participant/i.test(serialized),
        "co_fund: cross-project interference graph is missing.",
      );
      break;
    case "threshold_funding":
      assert(
        includesAll(
          p.studyVariants.map((entry) => entry.variantKey),
          [
            "pledge_invitation_saturation",
            "pool_randomized_bonus_design",
          ],
        ),
        "threshold_funding: invitation and bonus trials are not separate.",
      );
      assert(
        /platform-funded bonus cost/i.test(serialized) &&
          /no beneficial sign is assumed/i.test(serialized),
        "threshold_funding: bonus cost or sign policy is missing.",
      );
      break;
    case "donation_upgrade":
      assert(
        /donor-matcher-campaign graph/i.test(serialized) &&
          /both donor planned donation and matcher no-offer plan/i.test(
            serialized,
          ),
        "donation_upgrade: interference graph or dual baseline is missing.",
      );
      break;
    case "threshold_sign_on":
      assert(
        includesAll(
          p.studyVariants.map((entry) => entry.variantKey),
          ["public_signal", "completed_action"],
        ) &&
          /separate immutable study-instance registrations/i.test(serialized),
        "threshold_sign_on: public-signal and action studies are not separate.",
      );
      break;
    case "donation_redirect":
      assert(
        includesAll(
          p.studyVariants.map((entry) => entry.variantKey),
          [
            "scalar_native_unit_outcome",
            "prespecified_multivariate_global_test",
          ],
        ),
        "donation_redirect: valid primary-outcome modes are not bound.",
      );
      assert(
        /unranked outcome vector is prohibited/i.test(serialized) &&
          /largest connected-component share/i.test(serialized),
        "donation_redirect: vector contradiction or giant-component fallback remains.",
      );
      break;
    default:
      throw new Error(`Unexpected mechanism: ${mechanism}`);
  }
}

function validateProse(prose) {
  for (const heading of [
    "# Commitments causal-identification and calibration protocol v2",
    "## Evidence-to-product boundary",
    "## Reproducible study-instance contract",
    "## Network and graph feasibility",
    "## Human-participant ethics",
    "## Allocation concealment and adjudication",
    "## Precision, horizon, and no-launch rules",
    "## Separate predictive, causal, and transportability evidence",
    "## Safety vetoes and third-party effects",
    "## Immutability and amendment control",
    "## Mechanism-specific templates",
    "## Current authorization boundary",
  ]) {
    assert(prose.includes(heading), `Prose protocol is missing ${heading}.`);
  }
  for (const phrase of [
    "assignment-policy ITT",
    "does not authorize participant-level causal credit",
    "gatekeeper permission does not substitute for participant consent",
    "unranked outcome vector is prohibited",
    "high confidence remains disabled",
    "production experiment is not authorized",
  ]) {
    assert(
      prose.toLowerCase().includes(phrase.toLowerCase()),
      `Prose protocol omits required rule: ${phrase}.`,
    );
  }
}

function validateAll({
  schema,
  master,
  mapping,
  templates,
  prose,
}) {
  validateSchema(schema);
  validateMaster(master);
  validateMapping(mapping);
  const byMechanism = new Map(
    master.payload.templateManifest.map((entry) => [
      entry.mechanismFamily,
      entry,
    ]),
  );
  for (const mechanism of expectedMechanisms) {
    validateTemplate(
      templates[mechanism],
      mechanism,
      byMechanism.get(mechanism),
    );
  }
  validateProse(prose);
}

function loadArtifacts() {
  const master = readJson(masterPath);
  const templates = Object.fromEntries(
    expectedMechanisms.map((mechanism) => [
      mechanism,
      readJson(
        path.join(
          docsDir,
          "study-templates",
          `${mechanism}.v2.json`,
        ),
      ),
    ]),
  );
  return {
    schema: readJson(schemaPath),
    master,
    mapping: readJson(mappingPath),
    templates,
    prose: fs.readFileSync(prosePath, "utf8"),
  };
}

function expectFailure(name, mutate) {
  const artifacts = loadArtifacts();
  mutate(artifacts);
  let failed = false;
  try {
    validateAll(artifacts);
  } catch {
    failed = true;
  }
  assert(failed, `Negative self-test did not fail: ${name}`);
  console.log(`negative_self_test|${name}|rejected=true`);
}

function runSelfTests() {
  expectFailure("missing_primary_estimand_binding", ({ templates }) => {
    delete templates.trade.payload.requiredStudyInstanceBindings.primaryEstimand;
    templates.trade.payloadSha256 = payloadHash(templates.trade.payload);
  });
  expectFailure("missing_ethics_determination", ({ templates }) => {
    delete templates.co_fund.payload.requiredStudyInstanceBindings.ethicsDetermination;
    templates.co_fund.payloadSha256 = payloadHash(templates.co_fund.payload);
  });
  expectFailure("execution_authorized", ({ master }) => {
    master.payload.executionAuthorization.authorized = true;
    master.payloadSha256 = payloadHash(master.payload);
  });
  expectFailure("participant_credit_enabled", ({ templates }) => {
    templates.threshold_funding.payload.fixedDesignChoices.participantSpecificCreditAuthorized = true;
    templates.threshold_funding.payloadSha256 = payloadHash(
      templates.threshold_funding.payload,
    );
  });
  expectFailure("safety_veto_removed", ({ templates }) => {
    templates.donation_upgrade.payload.safetyVetoPolicy.requiredBlockingOutcomes = [];
    templates.donation_upgrade.payloadSha256 = payloadHash(
      templates.donation_upgrade.payload,
    );
  });
  expectFailure("policy_itt_claims_direct_attribution", ({ mapping }) => {
    const direct = mapping.payload.pr534Components.find(
      (entry) => entry.component === "direct_causal_attribution",
    );
    direct.policyStudyCanSupport = true;
    mapping.payloadSha256 = payloadHash(mapping.payload);
  });
  expectFailure("fake_calibration_evidence", ({ master }) => {
    master.payload.sourceBoundary.calibrationEvidenceRefs = [
      "source:conceptual-paper",
    ];
    master.payloadSha256 = payloadHash(master.payload);
  });
  expectFailure("high_confidence_enabled", ({ master }) => {
    master.payload.productClaimPolicy.highConfidenceAllowed = true;
    master.payloadSha256 = payloadHash(master.payload);
  });
  expectFailure("redirect_vector_contradiction", ({ templates }) => {
    templates.donation_redirect.payload.mechanismSpecificRequirements.primaryOutcomeRule =
      "Use an unranked outcome vector.";
    templates.donation_redirect.payloadSha256 = payloadHash(
      templates.donation_redirect.payload,
    );
  });
  expectFailure("tampered_payload_hash", ({ templates }) => {
    templates.threshold_sign_on.payload.displayName = "tampered";
  });
}

const artifacts = loadArtifacts();
validateAll(artifacts);

for (const mechanism of expectedMechanisms) {
  const template = artifacts.templates[mechanism];
  console.log(
    [
      "template_valid",
      mechanism,
      template.templateKey,
      template.payloadSha256,
      "under_review",
      "execution_authorized=false",
    ].join("|"),
  );
}
console.log(
  [
    "master_protocol_valid",
    artifacts.master.protocolKey,
    artifacts.master.payloadSha256,
    "under_review",
    "execution_authorized=false",
  ].join("|"),
);
console.log(
  [
    "evidence_mapping_valid",
    artifacts.mapping.mappingKey,
    artifacts.mapping.payloadSha256,
    "participant_credit_authorized=false",
  ].join("|"),
);

if (process.argv.includes("--self-test")) {
  runSelfTests();
  console.log("negative_self_tests_valid=true");
}
