import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import {
  existsSync,
  readFileSync,
  readdirSync,
  statSync,
} from "node:fs";
import { relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import {
  BLOCKING_REASON_ORDER,
  GLOBAL_BLOCKER_ORDER,
  OBSERVATION_ORDER,
  evaluateOperationIntent,
  validateOperationIntentDecision,
  validateOperationIntentInput,
  validateOpportunityEnvelope,
} from "./operation-intent-evaluator.mjs";

const REPO_ROOT = resolve(fileURLToPath(new URL("../..", import.meta.url)));
const PACKAGE_PATH = "docs/moral-trade/reciprocal-trade-operation-intent-v1";
const PACKAGE_ROOT = resolve(REPO_ROOT, PACKAGE_PATH);
const WORKFLOW_PATH =
  ".github/workflows/reciprocal-trade-operation-intent-shadow-gates.yml";

function read(path) {
  return readFileSync(resolve(REPO_ROOT, path), "utf8");
}

function json(path) {
  return JSON.parse(read(path));
}

function sha256(path) {
  return createHash("sha256").update(readFileSync(resolve(REPO_ROOT, path))).digest("hex");
}

function gitBlobSha1(path) {
  return execFileSync("git", ["hash-object", "--", path], {
    cwd: REPO_ROOT,
    encoding: "utf8",
  }).trim();
}

function sorted(values) {
  return [...values].sort((left, right) => left.localeCompare(right));
}

function clone(value) {
  return structuredClone(value);
}

function deepMerge(base, patch) {
  if (patch === null || typeof patch !== "object" || Array.isArray(patch)) {
    return clone(patch);
  }
  const result =
    base && typeof base === "object" && !Array.isArray(base) ? clone(base) : {};
  for (const [key, value] of Object.entries(patch)) {
    result[key] =
      value &&
      typeof value === "object" &&
      !Array.isArray(value) &&
      result[key] &&
      typeof result[key] === "object" &&
      !Array.isArray(result[key])
        ? deepMerge(result[key], value)
        : clone(value);
  }
  return result;
}

function walkFiles(root) {
  const output = [];
  for (const entry of readdirSync(root)) {
    const absolute = resolve(root, entry);
    if (statSync(absolute).isDirectory()) output.push(...walkFiles(absolute));
    else output.push(relative(REPO_ROOT, absolute));
  }
  return output;
}

function pathCovered(path, patterns) {
  return patterns.some((pattern) => {
    if (pattern.endsWith("/**")) return path.startsWith(pattern.slice(0, -3));
    return path === pattern;
  });
}

function workflowPathPatterns(workflow) {
  return [...workflow.matchAll(/^\s+-\s+"([^"]+)"\s*$/gm)].map((match) => match[1]);
}

const SUPPORTED_SCHEMA_KEYWORDS = new Set([
  "$schema",
  "$id",
  "$ref",
  "$defs",
  "definitions",
  "title",
  "description",
  "type",
  "additionalProperties",
  "required",
  "properties",
  "const",
  "enum",
  "oneOf",
  "anyOf",
  "allOf",
  "items",
  "minItems",
  "maxItems",
  "uniqueItems",
  "minLength",
  "pattern",
  "minimum",
  "maximum",
]);

function assertSupportedSchema(schema, path = "$", propertyMap = false) {
  if (!schema || typeof schema !== "object") return;
  if (Array.isArray(schema)) {
    schema.forEach((item, index) => assertSupportedSchema(item, `${path}[${index}]`));
    return;
  }
  for (const [key, value] of Object.entries(schema)) {
    if (!propertyMap) {
      assert.ok(SUPPORTED_SCHEMA_KEYWORDS.has(key), `${path}: unsupported schema keyword ${key}`);
    }
    if (key === "properties" || key === "$defs" || key === "definitions") {
      assertSupportedSchema(value, `${path}.${key}`, true);
    } else if (propertyMap) {
      assertSupportedSchema(value, `${path}.${key}`, false);
    } else if (
      ["oneOf", "anyOf", "allOf", "items"].includes(key) ||
      (value && typeof value === "object" && !["const", "enum"].includes(key))
    ) {
      assertSupportedSchema(value, `${path}.${key}`, false);
    }
  }
}

const ontology = json(`${PACKAGE_PATH}/ontology.v1.json`);
const matrix = json(`${PACKAGE_PATH}/operation-intent-matrix.v1.json`);
const paid = json(`${PACKAGE_PATH}/paid-action-destination-matrix.v1.json`);
const coAct = json(`${PACKAGE_PATH}/co-act-state-matrix.v1.json`);
const reasons = json(`${PACKAGE_PATH}/reason-codes.v1.json`);
const fixtures = json(`${PACKAGE_PATH}/synthetic-shadow-fixtures.v1.json`);
const sourceMap = json(`${PACKAGE_PATH}/differential-source-map.v1.json`);
const manifest = json(`${PACKAGE_PATH}/package-manifest.v1.json`);
const inputSchema = json(`${PACKAGE_PATH}/authority-input.schema.v1.json`);
const decisionSchema = json(`${PACKAGE_PATH}/authority-decision.schema.v1.json`);
const envelopeSchema = json(`${PACKAGE_PATH}/opportunity-envelope.schema.v1.json`);
const workflow = read(WORKFLOW_PATH);

const expectedMechanisms = [
  "reciprocal_trade",
  "donation_redirect",
  "donation_upgrade",
  "spending_consumption_upgrade",
  "co_fund",
  "co_act",
  "threshold_funding_assurance_dac",
  "threshold_sign_on",
];
const expectedIntents = [
  "cross_mechanism_feed_ingestion_and_ranking",
  "reciprocal_trade_match_suggestion_list",
  "start_suggested_match",
  "create_invitation",
  "ordinary_publish_or_review",
  "feed_private_delivery",
  "research_edge_projection",
];
const expectedDestinations = [
  "actor_compensation",
  "approved_charity_or_project",
  "threshold_pool_contribution",
  "upgrade_payment",
  "approved_moral_trade_opportunity",
  "merchant_vendor_payment",
  "verified_expense_reimbursement",
  "designated_third_party_beneficiary",
  "exact_cent_split_allocation",
];

assert.deepEqual(
  ontology.mechanismFamilies.map((item) => item.id),
  expectedMechanisms,
  "mechanism ontology drift",
);
assert.ok(
  ontology.mechanismFamilies.every((item) => item.independentAuthorityRequired),
  "every mechanism family must retain its own authority",
);
assert.deepEqual(
  ontology.outerContractFamilies.map((item) => item.id),
  ["reciprocal_pledge_swap", "paid_action"],
);
assert.notEqual(
  ontology.mechanismFamilies.find((item) => item.id === "donation_upgrade")?.id,
  ontology.mechanismFamilies.find(
    (item) => item.id === "spending_consumption_upgrade",
  )?.id,
);
assert.equal(ontology.nestedOpportunityContract.maximumDepth, 1);
assert.equal(ontology.nestedOpportunityContract.selfReferenceAllowed, false);
assert.equal(ontology.nestedOpportunityContract.cyclesAllowed, false);
assert.equal(ontology.nestedOpportunityContract.duplicateOpportunityIdsAllowed, false);
assert.equal(
  ontology.nestedOpportunityContract.depthOneParent,
  "evaluated_root_opportunity",
);
assert.deepEqual(ontology.nestedOpportunityContract.requiredFields, [
  "nestedOpportunityType",
  "nestedOpportunityId",
  "nestedTermsVersion",
  "nestedTermsHash",
  "nestedSourceRevision",
  "depth",
  "parentOpportunityId",
  "ancestryOpportunityIds",
  "authorityEligible",
  "authoritySnapshotId",
  "sourceRevisionCurrent",
  "termsFrozen",
]);
for (const trigger of [
  "deliver_invitation",
  "accept_invitation",
  "decline_invitation",
  "revoke_invitation",
  "expire_invitation",
  "submit_counterproposal",
  "decide_counterproposal",
  "confirm_agreement_version",
  "partial_settlement",
  "refund_or_reversal",
  "co_act_state_transition",
]) {
  assert.ok(ontology.triggerTypes.includes(trigger), `missing trigger type ${trigger}`);
}
assert.equal(ontology.authorization.liveActivationAuthorized, false);
assert.equal(ontology.authorization.runtimeWiringAuthorized, false);
assert.equal(ontology.authorization.productionMigrationAuthorized, false);
assert.equal(ontology.authorization.realOrQaRowAccessAuthorized, false);
assert.equal(ontology.authorization.moneyMovementAuthorized, false);
assert.equal(ontology.authorization.studyRegistrationOrExecutionAuthorized, false);
assert.equal(ontology.authorization.assignmentEntropyAuthorized, false);
assert.equal(ontology.authorization.participantContactAuthorized, false);
assert.equal(ontology.authorization.pr534MethodologyAuthorized, false);

assert.deepEqual(
  paid.destinations.map((item) => item.option),
  [1, 2, 3, 4, 5, 6, 7, 8, 9],
);
assert.deepEqual(
  paid.destinations.map((item) => item.id),
  expectedDestinations,
);
assert.equal(paid.liveEnablement, "all_disabled_pending_separate_activation_decisions");
const systemLegIds = paid.systemMoneyLegs.map((item) => item.id);
assert.equal(
  systemLegIds.filter((id) => expectedDestinations.includes(id)).length,
  0,
  "system money legs overlap substantive destinations",
);
assert.deepEqual(ontology.substantiveDestinationIds, expectedDestinations);
assert.deepEqual(ontology.systemMoneyLegTypes, systemLegIds);

assert.equal(coAct.directFeed.mechanismFamily, "co_act");
assert.equal(coAct.directFeed.requiredCta, "join_or_review_co_act");
assert.deepEqual(
  coAct.nestedObligations.map((item) => item.obligationLevel),
  ["join", "accept_role", "reach_milestone", "complete_role"],
);
assert.deepEqual(
  ontology.coActNestedStateContract,
  Object.fromEntries(
    coAct.nestedObligations.map((item) => [
      item.obligationLevel,
      item.requiredObservedState,
    ]),
  ),
);

assert.deepEqual(matrix.intents.map((item) => item.intent), expectedIntents);
assert.ok(matrix.intents.every((item) => item.runtimeStatus === "shadow_only_not_wired"));
assert.equal(matrix.releaseBoundary.runtimeCallSitesWired, false);
assert.equal(matrix.releaseBoundary.liveEligibleAlwaysFalse, true);
assert.equal(matrix.releaseBoundary.sqlAuthorityCandidateIncluded, false);
assert.match(matrix.commonRules.paidAction, /unique/i);
assert.match(matrix.commonRules.nested, /depth exactly one/i);
assert.match(matrix.commonRules.coAct, /Direct Feed presentation/i);

assert.deepEqual(
  reasons.blockingReasonCodes.map((item) => item.code),
  BLOCKING_REASON_ORDER,
);
assert.deepEqual(
  reasons.globalBlockerReasonCodes.map((item) => item.code),
  GLOBAL_BLOCKER_ORDER,
);
assert.deepEqual(
  reasons.observationCodes.map((item) => item.code),
  OBSERVATION_ORDER,
);

for (const schema of [inputSchema, decisionSchema, envelopeSchema]) {
  assertSupportedSchema(schema);
}
assert.deepEqual(
  inputSchema.properties.intent.enum,
  expectedIntents,
  "input intent schema drift",
);
assert.deepEqual(
  inputSchema.properties.sourceOffer.properties.mechanismFamily.enum,
  expectedMechanisms,
  "input mechanism schema drift",
);
assert.deepEqual(
  envelopeSchema.properties.mechanismFamily.enum,
  expectedMechanisms,
  "envelope mechanism schema drift",
);
assert.equal(
  envelopeSchema.properties.authority.properties.authorityId.pattern,
  "^synthetic:[A-Za-z0-9._:-]+$",
  "envelope authority identifier must be synthetic-only",
);
assert.equal(
  inputSchema.properties.feed.properties.opportunityEnvelope.oneOf[0].$ref,
  "opportunity-envelope.schema.v1.json",
  "input schema must validate the complete bundled envelope schema",
);
for (const property of ["boundSourceOfferId", "boundSourceRevision"]) {
  assert.equal(
    inputSchema.properties.privateDelivery.properties[property].oneOf[0].pattern,
    "^synthetic:[A-Za-z0-9._:-]+$",
    `${property} must be synthetic-only`,
  );
}
assert.deepEqual(
  inputSchema.properties.paidAction.oneOf[0].properties.destinationClass.enum,
  expectedDestinations,
  "Paid Action destination schema drift",
);
assert.deepEqual(
  decisionSchema.properties.candidateReasonCodes.items.enum,
  BLOCKING_REASON_ORDER,
  "decision reason schema drift",
);
assert.deepEqual(
  decisionSchema.properties.globalBlockerReasonCodes.items.enum,
  GLOBAL_BLOCKER_ORDER,
  "decision global blocker schema drift",
);

let decisionCount = 0;
for (const fixture of fixtures.cases) {
  const input = deepMerge(fixtures.baseInput, fixture.patch);
  validateOperationIntentInput(input);
  const decision = evaluateOperationIntent(input);
  validateOperationIntentDecision(decision);
  assert.equal(
    decision.candidatePolicySatisfied,
    fixture.expectedCandidatePolicySatisfied,
    fixture.id,
  );
  assert.deepEqual(decision.candidateReasonCodes, fixture.expectedCandidateReasonCodes, fixture.id);
  assert.equal(decision.liveEligible, false, fixture.id);
  decisionCount += 1;
}
for (const fixture of fixtures.invalidInputCases) {
  assert.throws(
    () => evaluateOperationIntent(deepMerge(fixtures.baseInput, fixture.patch)),
    /input schema validation failed/,
    fixture.id,
  );
}
const coverageTags = new Set(fixtures.cases.flatMap((fixture) => fixture.tags));
for (const tag of fixtures.requiredCoverageTags) {
  assert.ok(coverageTags.has(tag), `missing required fixture tag ${tag}`);
}
const envelopeFixture = fixtures.cases.find(
  (fixture) => fixture.id === "cross_feed_co_act_direct_pass",
);
assert.ok(envelopeFixture);
validateOpportunityEnvelope(
  deepMerge(fixtures.baseInput, envelopeFixture.patch).feed.opportunityEnvelope,
);

const sourceRowsById = new Map(sourceMap.rows.map((row) => [row.callSiteId, row]));
assert.equal(sourceRowsById.size, sourceMap.rows.length, "duplicate source-map row ID");
const mappedPaths = new Set(sourceMap.rows.flatMap((row) => row.paths));
for (const intent of matrix.intents) {
  assert.ok(intent.differentialSourceRowIds.length > 0, `${intent.intent}: no source rows`);
  assert.equal(
    new Set(intent.differentialSourceRowIds).size,
    intent.differentialSourceRowIds.length,
    `${intent.intent}: duplicate source row`,
  );
  for (const rowId of intent.differentialSourceRowIds) {
    const row = sourceRowsById.get(rowId);
    assert.ok(row, `${intent.intent}: unknown source row ${rowId}`);
    assert.ok(
      row.operationIntents.includes(intent.intent),
      `${intent.intent}: source row ${rowId} does not claim the intent`,
    );
  }
}
for (const row of sourceMap.rows) {
  assert.equal(row.runtimeModified, false, row.callSiteId);
  for (const path of row.paths) {
    assert.ok(existsSync(resolve(REPO_ROOT, path)), `${row.callSiteId}: missing ${path}`);
  }
}
for (const tracked of sourceMap.trackedSymbolCoverage) {
  const allowed = new Set(
    tracked.coveredByRows.flatMap((rowId) => {
      const row = sourceRowsById.get(rowId);
      assert.ok(row, `unknown coveredByRows id ${rowId}`);
      return row.paths;
    }),
  );
  const matches = walkFiles(resolve(REPO_ROOT, tracked.scanRoot)).filter((path) => {
    if (tracked.excludeSuffixes.some((suffix) => path.endsWith(suffix))) return false;
    return read(path).includes(tracked.pattern);
  });
  assert.ok(matches.length > 0, `tracked symbol disappeared: ${tracked.pattern}`);
  for (const path of matches) {
    assert.ok(
      allowed.has(path) && mappedPaths.has(path),
      `unmapped call site for ${tracked.pattern}: ${path}`,
    );
  }
}

assert.equal(manifest.boundBaseCommit, "75fd512e6cf82e2c51df53e211b854c0263109c3");
assert.equal(manifest.release.classification, "repository_only_design_and_shadow");
assert.equal(manifest.release.disposition, "do_not_merge_or_deploy");
assert.equal(manifest.release.sqlAuthorityCandidateIncluded, false);
assert.equal(manifest.release.runtimeCallSitesWired, false);
assert.equal(manifest.authorization.liveActivationAuthorized, false);
assert.equal(manifest.authorization.productionMigrationAuthorized, false);
assert.equal(manifest.authorization.realOrQaRowAccessAuthorized, false);
assert.equal(manifest.authorization.moneyMovementAuthorized, false);
assert.equal(manifest.authorization.studyRegistrationOrExecutionAuthorized, false);
assert.equal(manifest.authorization.assignmentEntropyAuthorized, false);
assert.equal(manifest.authorization.participantContactAuthorized, false);
assert.equal(manifest.authorization.pr534MethodologyAuthorized, false);

const manifestSourcePaths = new Set(manifest.sourceBindings.map((binding) => binding.path));
assert.equal(
  manifestSourcePaths.size,
  manifest.sourceBindings.length,
  "duplicate manifest source path",
);
assert.equal(
  new Set(manifest.sourceBindings.map((binding) => binding.sourceId)).size,
  manifest.sourceBindings.length,
  "duplicate manifest source ID",
);
for (const path of mappedPaths) {
  assert.ok(manifestSourcePaths.has(path), `source-map path lacks manifest binding: ${path}`);
}
for (const binding of manifest.sourceBindings) {
  assert.ok(existsSync(resolve(REPO_ROOT, binding.path)), `missing source ${binding.path}`);
  assert.equal(gitBlobSha1(binding.path), binding.gitBlobSha1, binding.sourceId);
  assert.equal(sha256(binding.path), binding.rawSha256, binding.sourceId);
  const source = read(binding.path);
  for (const pattern of binding.symbolPatterns) {
    assert.ok(source.includes(pattern), `${binding.sourceId}: missing symbol ${pattern}`);
  }
}
for (const binding of manifest.artifactBindings) {
  assert.ok(existsSync(resolve(REPO_ROOT, binding.path)), `missing artifact ${binding.path}`);
  assert.equal(sha256(binding.path), binding.rawSha256, binding.path);
}

const intendedFiles = sorted(manifest.intendedFiles);
assert.deepEqual(intendedFiles, sorted(new Set(intendedFiles)), "duplicate intended file");
const boundArtifacts = new Set(manifest.artifactBindings.map((binding) => binding.path));
assert.equal(
  boundArtifacts.size,
  manifest.artifactBindings.length,
  "duplicate artifact binding path",
);
const manifestPath = `${PACKAGE_PATH}/package-manifest.v1.json`;
assert.deepEqual(
  intendedFiles,
  sorted([...boundArtifacts, manifestPath]),
  "every intended file except the manifest itself must have an artifact hash",
);
for (const path of intendedFiles) {
  assert.ok(existsSync(resolve(REPO_ROOT, path)), `missing intended file ${path}`);
  assert.ok(
    !/^(?:src|supabase|public)\//.test(path) &&
      !/^(?:package(?:-lock)?\.json|next\.config|vercel\.json)$/.test(path),
    `runtime, database, public, dependency, or deployment path entered scope: ${path}`,
  );
}

assert.match(workflow, /pull_request:/);
assert.match(workflow, /push:/);
assert.match(workflow, /branches:\s*\[main\]/);
assert.match(workflow, /contents:\s*read/);
assert.match(workflow, /persist-credentials:\s*false/);
const triggerPatterns = workflowPathPatterns(workflow);
for (const binding of [
  ...manifest.sourceBindings,
  ...manifest.artifactBindings,
  { path: manifestPath },
]) {
  assert.ok(
    pathCovered(binding.path, triggerPatterns),
    `workflow trigger does not cover ${binding.path}`,
  );
}

const evaluatorSource = read(
  "scripts/reciprocal-trade-shadow/operation-intent-evaluator.mjs",
);
for (const prohibited of [
  /@\/lib\/supabase/,
  /\bfetch\s*\(/,
  /process\.env/,
  /Date\.now\s*\(/,
  /new Date\s*\(/,
  /Math\.random\s*\(/,
  /randomUUID\s*\(/,
]) {
  assert.doesNotMatch(evaluatorSource, prohibited);
}

for (const documentPath of [
  `${PACKAGE_PATH}/README.md`,
  `${PACKAGE_PATH}/operation-intent-matrix.v1.md`,
]) {
  const document = read(documentPath);
  for (const intent of expectedIntents) assert.ok(document.includes(intent), `${documentPath}: ${intent}`);
}
const humanSourceMap = read(`${PACKAGE_PATH}/differential-source-map.v1.md`);
for (const token of [
  "listReciprocalMatches",
  "startSuggestedMatchAction",
  "offer_is_invitable",
  "moral_trade_feed_create_deliver_service",
  "recommendation_graph_edges",
]) {
  assert.ok(humanSourceMap.includes(token), `human source map missing ${token}`);
}

const baseFlagIndex = process.argv.indexOf("--base");
const headFlagIndex = process.argv.indexOf("--head");
if (baseFlagIndex >= 0 || headFlagIndex >= 0) {
  assert.ok(baseFlagIndex >= 0 && headFlagIndex >= 0, "--base and --head are both required");
  const base = process.argv[baseFlagIndex + 1];
  const head = process.argv[headFlagIndex + 1];
  assert.equal(base, manifest.boundBaseCommit, "exact merge-base drift");
  execFileSync("git", ["diff", "--check", base, head], {
    cwd: REPO_ROOT,
    stdio: "inherit",
  });
  const changed = execFileSync("git", ["diff", "--name-only", base, head], {
    cwd: REPO_ROOT,
    encoding: "utf8",
  })
    .trim()
    .split("\n")
    .filter(Boolean);
  assert.deepEqual(sorted(changed), intendedFiles, "exact changed-file scope drift");
}

console.log(
  [
    "Validated operation-intent shadow package:",
    `${matrix.intents.length} intents`,
    `${ontology.mechanismFamilies.length} mechanisms`,
    `${paid.destinations.length} Paid Action destinations`,
    `${paid.systemMoneyLegs.length} system money legs`,
    `${decisionCount} schema-valid decisions`,
    `${fixtures.invalidInputCases.length} expected schema rejections`,
    `${sourceMap.rows.length} differential rows`,
    `${manifest.sourceBindings.length} exact source bindings`,
    `${manifest.artifactBindings.length} exact artifact hashes`,
    "0 runtime/database files",
    "liveEligible=false",
  ].join("; "),
);
