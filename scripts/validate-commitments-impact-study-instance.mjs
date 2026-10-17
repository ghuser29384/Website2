import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const root = process.cwd();
const docsDir = path.join(root, "docs/commitments/impact-identification");
const schemaPath = path.join(docsDir, "study-instance.schema.v2.json");
const fixturePath = path.join(
  docsDir,
  "synthetic-study-fixtures/trade-validation-fixture.v2.json",
);
const canonicalFixturePath = path.join(
  docsDir,
  "canonical-json-parity-fixtures.v2.json",
);
const bindingPath = path.join(docsDir, "study-instance-validator-binding.v2.json");
const templateDir = path.join(docsDir, "study-templates");

const SHA256 = /^sha256:[0-9a-f]{64}$/;
const KEY = /^[a-z][a-z0-9._:-]{0,127}$/;
const SYNTHETIC_KEY = /^synthetic:[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;
const EVIDENCE_REF = /^qa-evidence:\/\/synthetic\/[A-Za-z0-9._:/-]+$/;
const HASH_FIELDS = [
  "protocolPayloadHash",
  "templatePayloadHash",
  "evidenceToProductMappingHash",
  "studyInstanceSchemaHash",
  "eligiblePopulationSnapshotHash",
  "assignmentCodeHash",
  "analysisCodeHash",
  "seedCommitment",
  "studyInstancePayloadHash",
];
const BLOCKING_SAFETY_OUTCOMES = [
  "harmful_offer_or_threat",
  "baseline_manufacture_or_worsening",
  "harm_shifted_to_nonparticipants",
  "coercion_harassment_identity_exposure_or_retaliation",
  "concentration_or_exclusion_effect",
  "off_platform_substitution",
  "duplicate_or_overlapping_resource_claim",
];
const MECHANISMS = [
  "trade",
  "co_fund",
  "threshold_funding",
  "donation_upgrade",
  "threshold_sign_on",
  "donation_redirect",
];
const TEMPLATE_FILES = Object.fromEntries(
  MECHANISMS.map((mechanism) => [
    mechanism,
    path.join(templateDir, `${mechanism}.v2.json`),
  ]),
);

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

function sha256Text(text) {
  return `sha256:${crypto.createHash("sha256").update(text).digest("hex")}`;
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function assertObject(value, label) {
  assert(
    value !== null && typeof value === "object" && !Array.isArray(value),
    `${label} must be an object.`,
  );
}

function assertExactKeys(value, expected, label) {
  assertObject(value, label);
  const actual = Object.keys(value).sort();
  const wanted = [...expected].sort();
  assert(
    JSON.stringify(actual) === JSON.stringify(wanted),
    `${label} keys mismatch. expected=${wanted.join(",")} actual=${actual.join(",")}`,
  );
}

function assertNonEmptyString(value, label) {
  assert(typeof value === "string" && value.trim().length > 0, `${label} must be non-empty.`);
}

function assertStringArray(value, label, { min = 0, unique = false } = {}) {
  assert(Array.isArray(value) && value.length >= min, `${label} must be an array with at least ${min} item(s).`);
  for (const [index, entry] of value.entries()) {
    assertNonEmptyString(entry, `${label}[${index}]`);
  }
  if (unique) {
    assert(new Set(value).size === value.length, `${label} must not contain duplicates.`);
  }
}

function normalizeNumber(value) {
  assert(Number.isFinite(value), "Canonical JSON does not permit non-finite numbers.");
  if (Object.is(value, -0) || value === 0) return "0";
  const absolute = Math.abs(value);
  assert(
    absolute < 1e21 && absolute >= 1e-6,
    `Canonical JSON number ${value} is outside the supported non-exponential range.`,
  );
  if (Number.isInteger(value)) {
    assert(Number.isSafeInteger(value), `Canonical JSON integer ${value} is not safely representable.`);
  } else {
    const fixed = value.toString();
    const digits = fixed.replace(/[-.]/g, "").replace(/^0+/, "");
    assert(digits.length <= 15, `Canonical JSON decimal ${value} exceeds 15 significant digits.`);
  }
  return JSON.stringify(value);
}

function canonicalJson(value) {
  if (value === null) return "null";
  if (typeof value === "boolean") return value ? "true" : "false";
  if (typeof value === "number") return normalizeNumber(value);
  if (typeof value === "string") return JSON.stringify(value);
  if (Array.isArray(value)) {
    return `[${value.map((entry) => canonicalJson(entry)).join(",")}]`;
  }
  assertObject(value, "Canonical JSON value");
  const entries = Object.entries(value);
  for (const [key] of entries) {
    assert(
      /^[A-Za-z][A-Za-z0-9_]*$/.test(key),
      `Canonical JSON object key ${JSON.stringify(key)} is outside the ASCII contract.`,
    );
  }
  entries.sort(([left], [right]) => (left < right ? -1 : left > right ? 1 : 0));
  return `{${entries
    .map(([key, entry]) => `${JSON.stringify(key)}:${canonicalJson(entry)}`)
    .join(",")}}`;
}

function canonicalHash(value) {
  return sha256Text(canonicalJson(value));
}

function payloadWithoutSelfHash(payload) {
  const copy = structuredClone(payload);
  delete copy.studyInstancePayloadHash;
  return copy;
}

function loadTemplates() {
  return Object.fromEntries(
    Object.entries(TEMPLATE_FILES).map(([mechanism, file]) => {
      const wrapper = readJson(file);
      return [mechanism, wrapper];
    }),
  );
}

function schemaRequired(schema) {
  assert(Array.isArray(schema.required), "Study-instance schema required list is missing.");
  return schema.required;
}

function validateOutcome(outcome, label) {
  assertExactKeys(
    outcome,
    ["outcomeKey", "outcomeKind", "nativeUnit", "role"],
    label,
  );
  assert(KEY.test(outcome.outcomeKey), `${label}.outcomeKey is invalid.`);
  assert(
    ["scalar_native_unit", "prespecified_global_test"].includes(
      outcome.outcomeKind,
    ),
    `${label}.outcomeKind is invalid.`,
  );
  assertNonEmptyString(outcome.nativeUnit, `${label}.nativeUnit`);
  assert(
    ["primary", "secondary", "safety_cost"].includes(outcome.role),
    `${label}.role is invalid.`,
  );
}

function validateStudyInstance(payload, { schema, binding, templates }) {
  assertObject(payload, "Study instance");

  const required = schemaRequired(schema);
  assertExactKeys(payload, required, "Study instance");

  assert(SYNTHETIC_KEY.test(payload.studyKey), "studyKey must be synthetic.");
  assert(
    Number.isSafeInteger(payload.studyVersion) && payload.studyVersion > 0,
    "studyVersion must be a positive safe integer.",
  );
  assert(MECHANISMS.includes(payload.mechanismFamily), "mechanismFamily is invalid.");
  assert(KEY.test(payload.studyVariant), "studyVariant is invalid.");

  for (const field of HASH_FIELDS) {
    assert(SHA256.test(payload[field]), `${field} is not a SHA-256 identifier.`);
  }

  assert(
    payload.protocolKey ===
      "commitments-causal-identification-and-calibration-master-v2",
    "protocolKey mismatch.",
  );
  assert(
    payload.protocolPayloadHash ===
      "sha256:cd663ae722ee028ddfe3e1b866acab9ef79b5fcf5b5418d053bd3687eca3881a",
    "protocolPayloadHash mismatch.",
  );
  assert(
    payload.evidenceToProductMappingHash ===
      "sha256:eb4aadae8491c1a6924fca03acdeb9157b07a1439098e736c88e549db16b59b8",
    "evidenceToProductMappingHash mismatch.",
  );
  assert(
    payload.studyInstanceSchemaHash === binding.schemaRawSha256,
    "studyInstanceSchemaHash mismatch.",
  );

  const template = templates[payload.mechanismFamily];
  assert(template, "Bound mechanism template is missing.");
  assert(
    payload.templateKey === template.templateKey &&
      payload.templatePayloadHash === template.payloadSha256,
    "Template identity or payload hash mismatch.",
  );
  const variant = template.payload.studyVariants.find(
    (entry) => entry.variantKey === payload.studyVariant,
  );
  assert(variant, "studyVariant is not present in the exact bound template.");

  const fixed = template.payload.fixedDesignChoices;
  for (const [payloadField, fixedField] of [
    ["assignmentUnit", "assignmentUnit"],
    ["exposureUnit", "exposureUnit"],
    ["outcomeUnit", "outcomeUnit"],
    ["analysisUnit", "analysisUnit"],
  ]) {
    assert(
      payload[payloadField] === fixed[fixedField],
      `${payloadField} does not match the exact template.`,
    );
  }
  assert(
    payload.estimator.family === fixed.primaryEstimatorFamily,
    "Estimator family does not match the exact template.",
  );

  assertStringArray(payload.eligibilityRules, "eligibilityRules", { min: 1 });
  assertStringArray(payload.exclusionRules, "exclusionRules");
  assertStringArray(
    payload.blockingAndStratificationVariables,
    "blockingAndStratificationVariables",
    { unique: true },
  );
  assertStringArray(payload.sensitivityAnalyses, "sensitivityAnalyses", { min: 1 });
  assertStringArray(payload.stopAndSuspensionRules, "stopAndSuspensionRules", { min: 1 });
  assertStringArray(payload.blockingSafetyOutcomes, "blockingSafetyOutcomes", {
    min: BLOCKING_SAFETY_OUTCOMES.length,
    unique: true,
  });
  for (const requiredSafetyOutcome of BLOCKING_SAFETY_OUTCOMES) {
    assert(
      payload.blockingSafetyOutcomes.includes(requiredSafetyOutcome),
      `blockingSafetyOutcomes is missing ${requiredSafetyOutcome}.`,
    );
  }

  assert(
    Array.isArray(payload.assignmentProbabilities) &&
      payload.assignmentProbabilities.length >= 2,
    "assignmentProbabilities must contain at least two arms.",
  );
  const armKeys = new Set();
  let probabilitySum = 0;
  for (const [index, arm] of payload.assignmentProbabilities.entries()) {
    assertExactKeys(arm, ["armKey", "probability"], `assignmentProbabilities[${index}]`);
    assert(KEY.test(arm.armKey), `assignmentProbabilities[${index}].armKey is invalid.`);
    assert(!armKeys.has(arm.armKey), "assignment arm keys must be unique.");
    armKeys.add(arm.armKey);
    assert(
      /^(?:0\.[0-9]{1,10}|1(?:\.0{1,10})?)$/.test(arm.probability),
      `assignmentProbabilities[${index}].probability is invalid.`,
    );
    const probability = Number(arm.probability);
    assert(probability > 0 && probability <= 1, "Assignment probabilities must be in (0,1].");
    probabilitySum += probability;
  }
  assert(Math.abs(probabilitySum - 1) < 1e-12, "Assignment probabilities must sum to 1.");

  assertStringArray(payload.supportedExposureCells, "supportedExposureCells", {
    min: 1,
    unique: true,
  });
  for (const cell of payload.supportedExposureCells) {
    assert(KEY.test(cell), `Unsupported exposure-cell key ${cell}.`);
  }
  assert(
    ["withhold_estimand", "no_launch"].includes(payload.emptyExposureCellAction),
    "emptyExposureCellAction is invalid.",
  );

  assertExactKeys(
    payload.primaryEstimand,
    ["estimandKey", "estimandType", "claimScope"],
    "primaryEstimand",
  );
  assert(KEY.test(payload.primaryEstimand.estimandKey), "primaryEstimand.estimandKey is invalid.");
  assert(
    payload.primaryEstimand.estimandType === "assignment_policy_itt" &&
      payload.primaryEstimand.claimScope === "policy_level",
    "The primary estimand must remain a policy-level assignment-policy ITT.",
  );

  validateOutcome(payload.primaryOutcome, "primaryOutcome");
  assert(payload.primaryOutcome.role === "primary", "primaryOutcome role must be primary.");
  assert(
    Array.isArray(payload.outcomeRegistry) && payload.outcomeRegistry.length >= 1,
    "outcomeRegistry must contain at least the primary outcome.",
  );
  const outcomeKeys = new Set();
  let primaryMatches = 0;
  for (const [index, outcome] of payload.outcomeRegistry.entries()) {
    validateOutcome(outcome, `outcomeRegistry[${index}]`);
    assert(!outcomeKeys.has(outcome.outcomeKey), "outcomeRegistry keys must be unique.");
    outcomeKeys.add(outcome.outcomeKey);
    if (JSON.stringify(outcome) === JSON.stringify(payload.primaryOutcome)) primaryMatches += 1;
  }
  assert(primaryMatches === 1, "outcomeRegistry must contain the exact primaryOutcome once.");

  assertExactKeys(payload.estimator, ["estimatorKey", "family", "designBased"], "estimator");
  assert(KEY.test(payload.estimator.estimatorKey), "estimator.estimatorKey is invalid.");
  assert(payload.estimator.designBased === true, "Estimator must be design-based.");
  assertExactKeys(payload.varianceProcedure, ["procedureKey", "designBased"], "varianceProcedure");
  assert(payload.varianceProcedure.designBased === true, "Variance procedure must be design-based.");
  assertExactKeys(
    payload.finiteSampleInference,
    ["methodKey", "randomizationBased"],
    "finiteSampleInference",
  );
  assert(
    payload.finiteSampleInference.randomizationBased === true,
    "Finite-sample inference must be randomization-based.",
  );

  assertExactKeys(
    payload.graphDiagnostics,
    ["status", "noLaunchIfInadequate"],
    "graphDiagnostics",
  );
  assert(
    ["required_not_completed", "passed"].includes(payload.graphDiagnostics.status) &&
      payload.graphDiagnostics.noLaunchIfInadequate === true,
    "graphDiagnostics does not fail closed.",
  );
  assertExactKeys(
    payload.precisionSimulation,
    ["status", "noLaunchDetermination"],
    "precisionSimulation",
  );
  assert(
    ["required_not_completed", "passed"].includes(payload.precisionSimulation.status),
    "precisionSimulation.status is invalid.",
  );
  assert(
    ["not_assessed", "no_launch", "eligible_for_separate_execution_review"].includes(
      payload.precisionSimulation.noLaunchDetermination,
    ),
    "precisionSimulation.noLaunchDetermination is invalid.",
  );

  assertExactKeys(
    payload.ethicsDetermination,
    ["status", "independentRequired", "gatekeeperPermissionIsConsent"],
    "ethicsDetermination",
  );
  assert(
    ["required_not_completed", "approved_for_separate_execution_review"].includes(
      payload.ethicsDetermination.status,
    ) &&
      payload.ethicsDetermination.independentRequired === true &&
      payload.ethicsDetermination.gatekeeperPermissionIsConsent === false,
    "ethicsDetermination does not fail closed.",
  );
  assertExactKeys(payload.consentOrWaiver, ["status", "independentlyApproved"], "consentOrWaiver");
  assert(
    ["not_determined", "consent_required", "waiver_or_alteration_approved"].includes(
      payload.consentOrWaiver.status,
    ),
    "consentOrWaiver.status is invalid.",
  );
  if (payload.consentOrWaiver.status === "not_determined") {
    assert(
      payload.consentOrWaiver.independentlyApproved === false,
      "An undetermined consent path cannot be independently approved.",
    );
  }

  assert(
    Array.isArray(payload.unblindingLog) && payload.unblindingLog.length === 0 &&
      Array.isArray(payload.postAssignmentEligibilityChangeLog) &&
      payload.postAssignmentEligibilityChangeLog.length === 0 &&
      Array.isArray(payload.amendmentLog) && payload.amendmentLog.length === 0 &&
      Array.isArray(payload.deviationLog) && payload.deviationLog.length === 0,
    "Initial append-only logs must be empty.",
  );

  assert(
    JSON.stringify(payload.evidenceReferenceSchemes) ===
      JSON.stringify(["qa-evidence://synthetic/"]),
    "Only the exact synthetic evidence-reference scheme is permitted.",
  );
  assert(
    /^qa-registry:\/\/synthetic\/[A-Za-z0-9._:/-]+$/.test(
      payload.appendOnlyRegistryRecord,
    ),
    "appendOnlyRegistryRecord is invalid.",
  );
  assert(
    /^github:\/\/ghuser29384\/Website2\/(?:commit|tag)\/[0-9a-f]{40}$/.test(
      payload.protectedTagOrEquivalent,
    ),
    "protectedTagOrEquivalent is invalid.",
  );

  assert(
    payload.instrumentationEnvironment === "qa" &&
      payload.subjectMode === "synthetic_only" &&
      payload.executionAuthorized === false &&
      payload.realUserAssignmentAllowed === false,
    "Study instrumentation must remain QA-only, synthetic-only, and non-executing.",
  );

  const expectedPayloadHash = canonicalHash(payloadWithoutSelfHash(payload));
  assert(
    payload.studyInstancePayloadHash === expectedPayloadHash,
    `studyInstancePayloadHash mismatch. expected=${expectedPayloadHash}`,
  );

  return {
    valid: true,
    studyInstancePayloadHash: expectedPayloadHash,
    schemaRawSha256: binding.schemaRawSha256,
    validatorRawSha256: binding.validatorRawSha256,
    evidenceToProductMappingHash: payload.evidenceToProductMappingHash,
    executionAuthorized: false,
    subjectMode: "synthetic_only",
  };
}

function validateCanonicalFixtures(fixtures) {
  assert(fixtures?.fixtureSchemaVersion === "moral-trade-canonical-json-parity-v2", "Canonical fixture schema mismatch.");
  for (const fixture of fixtures.fixtures ?? []) {
    const parsed = JSON.parse(fixture.inputJson);
    if (fixture.valid) {
      const canonical = canonicalJson(parsed);
      assert(canonical === fixture.canonicalJson, `${fixture.key}: canonical JSON mismatch.`);
      assert(canonicalHash(parsed) === fixture.sha256, `${fixture.key}: hash mismatch.`);
    } else {
      let rejected = false;
      try {
        canonicalJson(parsed);
      } catch {
        rejected = true;
      }
      assert(rejected, `${fixture.key}: unsupported canonical input was accepted.`);
    }
  }
}

function validateBinding(binding, schemaText) {
  assertExactKeys(
    binding,
    [
      "bindingSchemaVersion",
      "schemaKey",
      "schemaPath",
      "schemaRawSha256",
      "validatorKey",
      "validatorPath",
      "validatorRawSha256",
      "evidenceToProductMappingHash",
      "executionAuthorized",
    ],
    "Validator binding",
  );
  assert(
    binding.bindingSchemaVersion ===
      "moral-trade-impact-study-validator-binding-v2",
    "Validator binding schema mismatch.",
  );
  assert(
    binding.schemaRawSha256 === sha256Text(schemaText),
    "Validator binding schema hash mismatch.",
  );
  assert(SHA256.test(binding.validatorRawSha256), "Validator source hash is malformed.");
  assert(
    binding.evidenceToProductMappingHash ===
      "sha256:eb4aadae8491c1a6924fca03acdeb9157b07a1439098e736c88e549db16b59b8",
    "Evidence-to-product mapping hash mismatch.",
  );
  assert(binding.executionAuthorized === false, "Validator binding cannot authorize execution.");
}

function selfTest(payload, context) {
  const cases = [
    [
      "participant credit",
      (draft) => {
        draft.primaryEstimand.estimandType = "participant_direct_causal_attribution";
      },
    ],
    [
      "unknown variant",
      (draft) => {
        draft.studyVariant = "unregistered_variant";
      },
    ],
    [
      "unsupported exposure cell action",
      (draft) => {
        draft.emptyExposureCellAction = "impute";
      },
    ],
    [
      "fake ethics approval",
      (draft) => {
        draft.ethicsDetermination = {
          status: "approved",
          independentRequired: false,
          gatekeeperPermissionIsConsent: true,
        };
      },
    ],
    [
      "execution authorization",
      (draft) => {
        draft.executionAuthorized = true;
      },
    ],
    [
      "real user mode",
      (draft) => {
        draft.subjectMode = "real_users";
      },
    ],
    [
      "hash tampering",
      (draft) => {
        draft.targetPopulation = "tampered after hashing";
      },
    ],
    [
      "probability mismatch",
      (draft) => {
        draft.assignmentProbabilities[0].probability = "0.6";
      },
    ],
    [
      "unregistered outcome",
      (draft) => {
        draft.outcomeRegistry = [];
      },
    ],
  ];

  for (const [label, mutate] of cases) {
    const draft = structuredClone(payload);
    mutate(draft);
    let rejected = false;
    try {
      validateStudyInstance(draft, context);
    } catch {
      rejected = true;
    }
    assert(rejected, `Self-test ${label} was not rejected.`);
  }
}

const schemaText = fs.readFileSync(schemaPath, "utf8");
const schema = JSON.parse(schemaText);
const binding = readJson(bindingPath);
validateBinding(binding, schemaText);
const templates = loadTemplates();
const fixture = readJson(fixturePath);
const canonicalFixtures = readJson(canonicalFixturePath);
validateCanonicalFixtures(canonicalFixtures);

const result = validateStudyInstance(fixture, { schema, binding, templates });
if (process.argv.includes("--self-test")) {
  selfTest(fixture, { schema, binding, templates });
}

const attestation = {
  attestationSchemaVersion: "moral-trade-impact-study-validator-attestation-v2",
  schemaKey: binding.schemaKey,
  schemaRawSha256: binding.schemaRawSha256,
  validatorKey: binding.validatorKey,
  validatorRawSha256: binding.validatorRawSha256,
  studyInstancePayloadHash: result.studyInstancePayloadHash,
  evidenceToProductMappingHash: result.evidenceToProductMappingHash,
  validationResult: "valid",
  instrumentationEnvironment: "qa",
  subjectMode: "synthetic_only",
  executionAuthorized: false,
};
attestation.attestationPayloadSha256 = canonicalHash(attestation);

process.stdout.write(
  `${JSON.stringify(
    {
      ok: true,
      studyKey: fixture.studyKey,
      studyInstancePayloadHash: result.studyInstancePayloadHash,
      attestation,
    },
    null,
    2,
  )}\n`,
);
