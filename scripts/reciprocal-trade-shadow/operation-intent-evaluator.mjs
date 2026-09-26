import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

const PACKAGE_ROOT = new URL(
  "../../docs/moral-trade/reciprocal-trade-operation-intent-v1/",
  import.meta.url,
);

function loadJson(name) {
  return JSON.parse(readFileSync(new URL(name, PACKAGE_ROOT), "utf8"));
}

const INPUT_SCHEMA = loadJson("authority-input.schema.v1.json");
const DECISION_SCHEMA = loadJson("authority-decision.schema.v1.json");
const ENVELOPE_SCHEMA = loadJson("opportunity-envelope.schema.v1.json");
const REASON_REGISTRY = loadJson("reason-codes.v1.json");
const PAID_ACTION_MATRIX = loadJson("paid-action-destination-matrix.v1.json");

export const EVALUATOR_VERSION = "moral-trade-operation-intent-shadow-v1.0.0";

export const BLOCKING_REASON_ORDER = Object.freeze(
  REASON_REGISTRY.blockingReasonCodes.map((item) => item.code),
);
export const GLOBAL_BLOCKER_ORDER = Object.freeze(
  REASON_REGISTRY.globalBlockerReasonCodes.map((item) => item.code),
);
export const OBSERVATION_ORDER = Object.freeze(
  REASON_REGISTRY.observationCodes.map((item) => item.code),
);

const BLOCKING_REASON_SET = new Set(BLOCKING_REASON_ORDER);
const GLOBAL_BLOCKER_SET = new Set(GLOBAL_BLOCKER_ORDER);
const OBSERVATION_SET = new Set(OBSERVATION_ORDER);
const DESTINATION_RULES = new Map(
  PAID_ACTION_MATRIX.destinations.map((item) => [item.id, item]),
);
const DESTINATION_IDS = new Set(DESTINATION_RULES.keys());
const NESTED_DESTINATION_IDS = new Set(
  PAID_ACTION_MATRIX.destinations
    .filter((item) => item.nestedOpportunityRequired)
    .map((item) => item.id),
);
const MUTATION_INTENTS = new Set([
  "start_suggested_match",
  "create_invitation",
  "ordinary_publish_or_review",
  "feed_private_delivery",
]);
const TARGET_REQUIRED_INTENTS = new Set([
  "reciprocal_trade_match_suggestion_list",
  "start_suggested_match",
  "feed_private_delivery",
  "research_edge_projection",
]);
const NEW_PAIR_INTENTS = new Set([
  "reciprocal_trade_match_suggestion_list",
  "start_suggested_match",
  "create_invitation",
  "feed_private_delivery",
  "research_edge_projection",
]);
const COMPATIBILITY_INTENTS = new Set([
  "reciprocal_trade_match_suggestion_list",
  "start_suggested_match",
  "research_edge_projection",
]);
const REQUIRED_ROLE_BY_INTENT = Object.freeze({
  cross_mechanism_feed_ingestion_and_ranking: "feed_ranker",
  reciprocal_trade_match_suggestion_list: "source_owner",
  start_suggested_match: "source_owner",
  create_invitation: "source_owner",
  ordinary_publish_or_review: "reviewer",
  feed_private_delivery: "reviewer",
  research_edge_projection: "research_projector",
});
const STRUCTURED_GATE_CODES = Object.freeze({
  moderation: ["SOURCE_MODERATION_NOT_CLEARED", "TARGET_MODERATION_NOT_CLEARED"],
  noncompensableHarmThreat: [
    "SOURCE_NONCOMPENSABLE_HARM_NOT_CLEARED",
    "TARGET_NONCOMPENSABLE_HARM_NOT_CLEARED",
  ],
  validity: ["SOURCE_VALIDITY_NOT_CLEARED", "TARGET_VALIDITY_NOT_CLEARED"],
  baseline: ["SOURCE_BASELINE_NOT_CLEARED", "TARGET_BASELINE_NOT_CLEARED"],
  legality: ["SOURCE_LEGALITY_NOT_CLEARED", "TARGET_LEGALITY_NOT_CLEARED"],
  participantPolicy: [
    "SOURCE_PARTICIPANT_POLICY_NOT_CLEARED",
    "TARGET_PARTICIPANT_POLICY_NOT_CLEARED",
  ],
});
const CO_ACT_PROMISED_STATE_BY_OBLIGATION = Object.freeze({
  join: "joined",
  accept_role: "role_accepted",
  reach_milestone: "milestone_completed",
  complete_role: "role_completed",
});

function canonicalize(value) {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.keys(value)
        .sort()
        .map((key) => [key, canonicalize(value[key])]),
    );
  }
  return value;
}

export function canonicalJson(value) {
  return JSON.stringify(canonicalize(value));
}

function sha256(value) {
  return `sha256:${createHash("sha256").update(value).digest("hex")}`;
}

function deepEqual(left, right) {
  return canonicalJson(left) === canonicalJson(right);
}

function valueType(value) {
  if (value === null) return "null";
  if (Array.isArray(value)) return "array";
  if (Number.isInteger(value)) return "integer";
  return typeof value;
}

function resolveRef(rootSchema, reference) {
  if (reference === "opportunity-envelope.schema.v1.json") {
    return { resolved: ENVELOPE_SCHEMA, resolvedRoot: ENVELOPE_SCHEMA };
  }
  if (!reference.startsWith("#/")) {
    throw new Error(`Unsupported JSON Schema reference: ${reference}`);
  }
  const resolved = reference
    .slice(2)
    .split("/")
    .map((part) => part.replaceAll("~1", "/").replaceAll("~0", "~"))
    .reduce((value, part) => value?.[part], rootSchema);
  return { resolved, resolvedRoot: rootSchema };
}

export function validateJsonSchema(value, schema, rootSchema = schema, path = "$") {
  const errors = [];
  if (schema.$ref) {
    const { resolved, resolvedRoot } = resolveRef(rootSchema, schema.$ref);
    if (!resolved) return [`${path}: unresolved schema reference ${schema.$ref}`];
    return validateJsonSchema(value, resolved, resolvedRoot, path);
  }

  if (schema.oneOf) {
    const matches = schema.oneOf.filter(
      (candidate) => validateJsonSchema(value, candidate, rootSchema, path).length === 0,
    );
    if (matches.length !== 1) {
      return [`${path}: expected exactly one oneOf branch, matched ${matches.length}`];
    }
    return [];
  }
  if (schema.anyOf) {
    const matches = schema.anyOf.some(
      (candidate) => validateJsonSchema(value, candidate, rootSchema, path).length === 0,
    );
    if (!matches) return [`${path}: did not match any anyOf branch`];
    return [];
  }

  if (Object.hasOwn(schema, "const") && !deepEqual(value, schema.const)) {
    errors.push(`${path}: expected const ${canonicalJson(schema.const)}`);
  }
  if (schema.enum && !schema.enum.some((item) => deepEqual(item, value))) {
    errors.push(`${path}: value is not in enum`);
  }

  if (schema.type) {
    const actual = valueType(value);
    const valid =
      schema.type === actual ||
      (schema.type === "number" && (actual === "integer" || actual === "number"));
    if (!valid) {
      errors.push(`${path}: expected type ${schema.type}, received ${actual}`);
      return errors;
    }
  }

  if (typeof value === "string") {
    if (schema.minLength !== undefined && value.length < schema.minLength) {
      errors.push(`${path}: shorter than minLength ${schema.minLength}`);
    }
    if (schema.pattern && !new RegExp(schema.pattern, "u").test(value)) {
      errors.push(`${path}: does not match ${schema.pattern}`);
    }
  }
  if (typeof value === "number") {
    if (schema.minimum !== undefined && value < schema.minimum) {
      errors.push(`${path}: less than minimum ${schema.minimum}`);
    }
    if (schema.maximum !== undefined && value > schema.maximum) {
      errors.push(`${path}: greater than maximum ${schema.maximum}`);
    }
  }
  if (Array.isArray(value)) {
    if (schema.minItems !== undefined && value.length < schema.minItems) {
      errors.push(`${path}: fewer than minItems ${schema.minItems}`);
    }
    if (schema.maxItems !== undefined && value.length > schema.maxItems) {
      errors.push(`${path}: more than maxItems ${schema.maxItems}`);
    }
    if (schema.uniqueItems) {
      const unique = new Set(value.map(canonicalJson));
      if (unique.size !== value.length) errors.push(`${path}: items are not unique`);
    }
    if (schema.items) {
      value.forEach((item, index) => {
        errors.push(
          ...validateJsonSchema(item, schema.items, rootSchema, `${path}[${index}]`),
        );
      });
    }
  }
  if (value && typeof value === "object" && !Array.isArray(value)) {
    for (const required of schema.required ?? []) {
      if (!Object.hasOwn(value, required)) errors.push(`${path}: missing required ${required}`);
    }
    const properties = schema.properties ?? {};
    for (const [key, item] of Object.entries(value)) {
      if (properties[key]) {
        errors.push(
          ...validateJsonSchema(item, properties[key], rootSchema, `${path}.${key}`),
        );
      } else if (schema.additionalProperties === false) {
        errors.push(`${path}: additional property ${key}`);
      }
    }
  }
  return errors;
}

export class OperationIntentSchemaError extends Error {
  constructor(kind, errors) {
    super(`${kind} schema validation failed:\n${errors.join("\n")}`);
    this.name = "OperationIntentSchemaError";
    this.kind = kind;
    this.errors = errors;
  }
}

function assertSchema(kind, value, schema) {
  const errors = validateJsonSchema(value, schema);
  if (errors.length) throw new OperationIntentSchemaError(kind, errors);
}

export function validateOperationIntentInput(input) {
  assertSchema("input", input, INPUT_SCHEMA);
  return true;
}

export function validateOpportunityEnvelope(envelope) {
  assertSchema("opportunity envelope", envelope, ENVELOPE_SCHEMA);
  return true;
}

export function validateOperationIntentDecision(decision) {
  assertSchema("decision", decision, DECISION_SCHEMA);
  return true;
}

function addReason(reasons, code) {
  if (!BLOCKING_REASON_SET.has(code)) {
    throw new Error(`Evaluator emitted unregistered blocking reason code: ${code}`);
  }
  reasons.add(code);
}

function addGlobal(globals, code) {
  if (!GLOBAL_BLOCKER_SET.has(code)) {
    throw new Error(`Evaluator emitted unregistered global blocker code: ${code}`);
  }
  globals.add(code);
}

function addObservation(observations, code) {
  if (!OBSERVATION_SET.has(code)) {
    throw new Error(`Evaluator emitted unregistered observation code: ${code}`);
  }
  observations.add(code);
}

function ordered(set, order) {
  return order.filter((code) => set.has(code));
}

function isPublishedOpenOperative(offer) {
  return (
    offer.workflowStatus === "published" &&
    offer.operationalStatus === "open" &&
    offer.operative === true
  );
}

function checkStructuredGateSet(reasons, gates, target) {
  if (!gates) return;
  const index = target ? 1 : 0;
  for (const [field, codes] of Object.entries(STRUCTURED_GATE_CODES)) {
    if (gates[field] !== "cleared") addReason(reasons, codes[index]);
  }
}

function checkRestrictions(reasons, restrictions) {
  for (const restriction of restrictions) {
    if (restriction.status === "active" || restriction.status === "reviewing") {
      addReason(reasons, "ACTIVE_RESTRICTION");
    }
    if (restriction.status === "unknown" || restriction.status === "contradictory") {
      addReason(reasons, "RESTRICTION_STATUS_UNKNOWN");
    }
  }
}

function checkEngagements(reasons, engagements) {
  if (engagements.activeInterest) addReason(reasons, "ACTIVE_INTEREST_CONFLICT");
  if (engagements.activeInvitation) addReason(reasons, "ACTIVE_INVITATION_CONFLICT");
  if (engagements.activeThread) addReason(reasons, "ACTIVE_THREAD_CONFLICT");
  if (engagements.activeAgreement) addReason(reasons, "ACTIVE_AGREEMENT_CONFLICT");
  if (engagements.duplicateCurrentPair) {
    addReason(reasons, "DUPLICATE_CURRENT_PAIR_CONFLICT");
  }
  if (!engagements.terminalHistoricalRecordsCaptured) {
    addReason(reasons, "HISTORICAL_STATE_NOT_CAPTURED");
  }
}

function checkCompatibility(reasons, input) {
  const compatibility = input.pair.compatibility;
  const expectedKind =
    input.sourceOffer.outerContractFamily === "paid_action"
      ? "paid_action_terms"
      : "reciprocal_cause_pair";
  if (
    input.targetOffer &&
    input.targetOffer.outerContractFamily !== input.sourceOffer.outerContractFamily
  ) {
    addReason(reasons, "DATABASE_COMPATIBILITY_KIND_MISMATCH");
  }
  if (compatibility.kind !== expectedKind) {
    addReason(reasons, "DATABASE_COMPATIBILITY_KIND_MISMATCH");
  }
  if (!compatibility.databaseResultBound || compatibility.status === "unavailable") {
    addReason(reasons, "DATABASE_COMPATIBILITY_REQUIRED");
  } else if (compatibility.status === "no_match") {
    addReason(reasons, "DATABASE_COMPATIBILITY_NO_MATCH");
  }
  if (!compatibility.collationIdentity) {
    addReason(reasons, "DATABASE_COLLATION_IDENTITY_REQUIRED");
  }
}

function nestedGraphHasCycle(byId) {
  const visiting = new Set();
  const visited = new Set();

  function visit(id) {
    if (visiting.has(id)) return true;
    if (visited.has(id)) return false;
    const nested = byId.get(id);
    if (!nested) return false;
    visiting.add(id);
    const linkedNestedIds = [
      nested.parentOpportunityId,
      ...nested.ancestryOpportunityIds,
    ].filter(
      (candidateId) =>
        candidateId !== nested.nestedOpportunityId && byId.has(candidateId),
    );
    if (linkedNestedIds.some(visit)) return true;
    visiting.delete(id);
    visited.add(id);
    return false;
  }

  return [...byId.keys()].some(visit);
}

function checkNestedOpportunities(reasons, input) {
  const byId = new Map();
  for (const nested of input.nestedOpportunities) {
    if (byId.has(nested.nestedOpportunityId)) {
      addReason(reasons, "NESTED_DUPLICATE_ID");
    } else {
      byId.set(nested.nestedOpportunityId, nested);
    }
    if (nested.depth !== 1) addReason(reasons, "NESTING_DEPTH_EXCEEDED");
    if (nested.parentOpportunityId !== input.sourceOffer.offerId) {
      addReason(reasons, "NESTED_PARENT_MISMATCH");
    }
    if (
      nested.nestedOpportunityId === input.sourceOffer.offerId ||
      nested.nestedOpportunityId === input.targetOffer?.offerId ||
      nested.nestedOpportunityId === nested.parentOpportunityId
    ) {
      addReason(reasons, "NESTED_SELF_REFERENCE");
    }
    if (nested.ancestryOpportunityIds.includes(nested.nestedOpportunityId)) {
      addReason(reasons, "NESTED_CYCLE");
    }
    if (!nested.termsFrozen || nested.nestedTermsVersion < 1) {
      addReason(reasons, "NESTED_TERMS_NOT_FROZEN");
    }
    if (!nested.sourceRevisionCurrent) {
      addReason(reasons, "NESTED_SOURCE_REVISION_STALE");
    }
    if (!nested.authorityEligible) {
      addReason(reasons, "NESTED_AUTHORITY_NOT_ELIGIBLE");
    }
    if (nested.authoritySnapshotId !== input.snapshot.snapshotId) {
      addReason(reasons, "NESTED_SNAPSHOT_MISMATCH");
    }
  }
  if (nestedGraphHasCycle(byId)) addReason(reasons, "NESTED_CYCLE");
  return byId;
}

function checkPaidAction(reasons, globals, observations, input, nestedById) {
  const isPaidAction = input.sourceOffer.outerContractFamily === "paid_action";
  if (!isPaidAction) {
    if (input.paidAction !== null) addReason(reasons, "PAID_ACTION_CONTRACT_FORBIDDEN");
    return;
  }

  addGlobal(globals, "PAYMENT_DESTINATION_LIVE_ENABLEMENT_DEFERRED");
  addObservation(observations, "PAID_ACTION_ONTOLOGY_ONLY");
  const paid = input.paidAction;
  if (!paid) {
    addReason(reasons, "PAID_ACTION_CONTRACT_REQUIRED");
    return;
  }
  if (!DESTINATION_IDS.has(paid.destinationClass)) {
    addReason(reasons, "PAID_ACTION_DESTINATION_NOT_ALLOWED");
  }
  if (!Number.isInteger(paid.totalAmountMinor) || paid.totalAmountMinor <= 0) {
    addReason(reasons, "PAID_ACTION_AMOUNT_INVALID");
  }
  if (!paid.allocations.length) addReason(reasons, "PAID_ACTION_ALLOCATION_REQUIRED");
  const allocationIds = new Set(paid.allocations.map((allocation) => allocation.allocationId));
  if (allocationIds.size !== paid.allocations.length) {
    addReason(reasons, "DUPLICATE_ALLOCATION_ID");
  }
  const allocationTotal = paid.allocations.reduce(
    (sum, allocation) => sum + allocation.amountMinor,
    0,
  );
  if (paid.destinationClass === "exact_cent_split_allocation") {
    if (paid.allocations.length < 2 || allocationTotal !== paid.totalAmountMinor) {
      addReason(reasons, "EXACT_CENT_SPLIT_MISMATCH");
    }
  } else if (
    paid.allocations.length !== 1 ||
    paid.allocations[0]?.destinationClass !== paid.destinationClass ||
    allocationTotal !== paid.totalAmountMinor
  ) {
    addReason(reasons, "PAID_ACTION_ALLOCATION_REQUIRED");
  }
  if (paid.substantiveDestinationIncludesSystemLeg) {
    addReason(reasons, "SUBSTANTIVE_DESTINATION_CONTAINS_SYSTEM_LEG");
  }
  if (
    paid.allocations.some(
      (allocation) =>
        allocation.destinationClass === "verified_expense_reimbursement",
    ) &&
    !paid.expensePreApproved
  ) {
    addReason(reasons, "EXPENSE_REIMBURSEMENT_PREAPPROVAL_REQUIRED");
  }
  if (
    paid.allocations.some(
      (allocation) =>
        allocation.destinationClass === "designated_third_party_beneficiary",
    ) &&
    paid.thirdPartyReviewStatus !== "approved"
  ) {
    addReason(reasons, "THIRD_PARTY_BENEFICIARY_REVIEW_REQUIRED");
  }
  if (
    paid.settlementStatus === "partially_settled" &&
    paid.partialCompletionPolicyStatus !== "resolved"
  ) {
    addReason(reasons, "PARTIAL_SETTLEMENT_POLICY_UNRESOLVED");
  }
  if (["failed", "reversed", "charged_back"].includes(paid.settlementStatus)) {
    addReason(reasons, "SETTLEMENT_FAILED");
  }
  for (const allocation of paid.allocations) {
    if (!NESTED_DESTINATION_IDS.has(allocation.destinationClass)) continue;
    const nested = allocation.nestedOpportunityId
      ? nestedById.get(allocation.nestedOpportunityId)
      : null;
    if (!nested) {
      addReason(reasons, "NESTED_OPPORTUNITY_REQUIRED");
      continue;
    }
    const allowedNestedTypes =
      DESTINATION_RULES.get(allocation.destinationClass)?.allowedNestedTypes ?? [];
    if (!allowedNestedTypes.includes(nested.nestedOpportunityType)) {
      addReason(reasons, "NESTED_DESTINATION_TYPE_MISMATCH");
    }
  }
}

function checkCoAct(reasons, input, nestedById) {
  const directCoAct =
    input.intent === "cross_mechanism_feed_ingestion_and_ranking" &&
    input.sourceOffer.mechanismFamily === "co_act";
  const nestedCoActs = [...nestedById.values()].filter(
    (item) => item.nestedOpportunityType === "co_act",
  );
  const nestedCoAct = nestedCoActs[0];
  if (!directCoAct && !nestedCoAct) {
    if (input.coAct !== null) addReason(reasons, "CO_ACT_PRESENTATION_MISMATCH");
    return;
  }
  if (!input.coAct) {
    addReason(reasons, "CO_ACT_CONTRACT_REQUIRED");
    return;
  }
  const coAct = input.coAct;
  if ((directCoAct && nestedCoAct) || nestedCoActs.length > 1) {
    addReason(reasons, "CO_ACT_PRESENTATION_MISMATCH");
  }
  if (directCoAct) {
    if (
      coAct.presentation !== "direct_feed" ||
      coAct.nestedOpportunityId !== null ||
      coAct.roleId !== null ||
      coAct.obligationLevel !== "not_applicable" ||
      coAct.promisedState !== "not_applicable" ||
      coAct.promisedStateSatisfied
    ) {
      addReason(reasons, "CO_ACT_PRESENTATION_MISMATCH");
    }
    if (input.feed.cta !== "join_or_review_co_act") {
      addReason(reasons, "CO_ACT_DIRECT_CTA_INVALID");
    }
  }
  if (nestedCoAct) {
    if (
      coAct.presentation !== "nested_obligation" ||
      coAct.nestedOpportunityId !== nestedCoAct.nestedOpportunityId
    ) {
      addReason(reasons, "CO_ACT_PRESENTATION_MISMATCH");
    }
    if (
      CO_ACT_PROMISED_STATE_BY_OBLIGATION[coAct.obligationLevel] !==
      coAct.promisedState
    ) {
      addReason(reasons, "CO_ACT_OBLIGATION_STATE_MISMATCH");
    }
  }
  if (!coAct.authorityEligible) addReason(reasons, "CO_ACT_AUTHORITY_NOT_ELIGIBLE");
  if (coAct.activationState !== "active" || coAct.capacityState !== "available") {
    addReason(reasons, "CO_ACT_ACTIVATION_OR_CAPACITY_BLOCKED");
  }
  if (
    !coAct.timingBound ||
    !coAct.evidenceBound ||
    !coAct.withdrawalTermsBound ||
    !coAct.identityPrivacyBound ||
    !coAct.participantEligibilityCleared ||
    (nestedCoAct && !coAct.roleId)
  ) {
    addReason(reasons, "CO_ACT_FROZEN_ROLE_TERMS_REQUIRED");
  }
  if (
    nestedCoAct &&
    (!coAct.promisedStateSatisfied || coAct.observedState !== coAct.promisedState)
  ) {
    addReason(reasons, "CO_ACT_PROMISED_STATE_NOT_SATISFIED");
  }
}

function checkCrossMechanismFeed(reasons, input) {
  if (!input.feed.mechanismAuthorityEligible) {
    addReason(reasons, "MECHANISM_AUTHORITY_NOT_ELIGIBLE");
  }
  if (input.feed.rankingAttemptedToOverrideAuthority) {
    addReason(reasons, "FEED_RANKING_AUTHORITY_OVERRIDE_PROHIBITED");
  }
  if (input.feed.sourceChannel !== "public_mechanism") {
    addReason(reasons, "OPPORTUNITY_ENVELOPE_INVALID");
  }
  try {
    validateOpportunityEnvelope(input.feed.opportunityEnvelope);
    const envelope = input.feed.opportunityEnvelope;
    if (
      envelope.mechanismFamily !== input.sourceOffer.mechanismFamily ||
      envelope.outerContractFamily !== input.sourceOffer.outerContractFamily ||
      envelope.opportunityId !== input.sourceOffer.offerId ||
      envelope.authority.snapshotId !== input.snapshot.snapshotId ||
      envelope.authority.effectiveAt !== input.effectiveAt ||
      envelope.terms.version !== input.sourceOffer.termsVersion ||
      envelope.terms.hash !== input.sourceOffer.termsHash ||
      envelope.terms.sourceRevision !== input.sourceOffer.sourceRevision ||
      envelope.delivery.sourceChannel !== "public_mechanism" ||
      envelope.delivery.cta !== input.feed.cta
    ) {
      addReason(reasons, "OPPORTUNITY_ENVELOPE_INVALID");
    }
  } catch {
    addReason(reasons, "OPPORTUNITY_ENVELOPE_INVALID");
  }
}

function checkLifecycle(reasons, input) {
  const { intent, sourceOffer, targetOffer } = input;
  if (
    intent === "cross_mechanism_feed_ingestion_and_ranking" ||
    intent === "reciprocal_trade_match_suggestion_list" ||
    intent === "start_suggested_match" ||
    intent === "create_invitation" ||
    intent === "research_edge_projection"
  ) {
    if (!isPublishedOpenOperative(sourceOffer)) {
      addReason(reasons, "SOURCE_OFFER_NOT_CURRENT");
    }
  } else if (intent === "ordinary_publish_or_review") {
    if (
      sourceOffer.workflowStatus !== "pending_review" ||
      sourceOffer.operationalStatus !== "paused" ||
      sourceOffer.operative
    ) {
      addReason(reasons, "SOURCE_OFFER_NOT_CURRENT");
    }
  } else if (intent === "feed_private_delivery") {
    if (
      sourceOffer.workflowStatus !== "pending_review" ||
      sourceOffer.operationalStatus !== "paused" ||
      sourceOffer.operative
    ) {
      addReason(reasons, "SOURCE_OFFER_NOT_CURRENT");
    }
  }
  if (targetOffer && !isPublishedOpenOperative(targetOffer)) {
    addReason(reasons, "TARGET_OFFER_NOT_CURRENT");
  }
  if (!sourceOffer.termsCurrent) addReason(reasons, "SOURCE_TERMS_STALE");
  if (!sourceOffer.sourceRevisionCurrent) addReason(reasons, "SOURCE_REVISION_STALE");
  if (targetOffer && !targetOffer.termsCurrent) addReason(reasons, "TARGET_TERMS_STALE");
  if (targetOffer && !targetOffer.sourceRevisionCurrent) {
    addReason(reasons, "TARGET_REVISION_STALE");
  }
}

function checkIntentMechanism(reasons, input) {
  const feedIntent = input.intent === "cross_mechanism_feed_ingestion_and_ranking";
  if (!feedIntent && input.sourceOffer.mechanismFamily !== "reciprocal_trade") {
    addReason(reasons, "SOURCE_MECHANISM_NOT_ALLOWED");
  }
  if (
    !feedIntent &&
    input.targetOffer &&
    input.targetOffer.mechanismFamily !== "reciprocal_trade"
  ) {
    addReason(reasons, "TARGET_MECHANISM_NOT_ALLOWED");
  }
  if (input.sourceOffer.mechanismFamily === "reciprocal_trade") {
    if (!["reciprocal_pledge_swap", "paid_action"].includes(input.sourceOffer.outerContractFamily)) {
      addReason(reasons, "SOURCE_OUTER_CONTRACT_FAMILY_NOT_ALLOWED");
    }
  } else if (input.sourceOffer.outerContractFamily !== null) {
    addReason(reasons, "SOURCE_OUTER_CONTRACT_FAMILY_NOT_ALLOWED");
  }
  if (
    !feedIntent &&
    input.targetOffer &&
    input.targetOffer.outerContractFamily !== input.sourceOffer.outerContractFamily
  ) {
    addReason(reasons, "TARGET_OUTER_CONTRACT_FAMILY_MISMATCH");
  }
}

function checkIdentity(reasons, input) {
  const requiredRole = REQUIRED_ROLE_BY_INTENT[input.intent];
  if (!input.actor.authorized || input.actor.role !== requiredRole) {
    addReason(reasons, "ACTOR_NOT_AUTHORIZED");
  }
  if (
    requiredRole === "source_owner" &&
    input.actor.actorId !== input.sourceOffer.ownerId
  ) {
    addReason(reasons, "ACTOR_NOT_AUTHORIZED");
  }
  if (TARGET_REQUIRED_INTENTS.has(input.intent) && !input.targetOffer) {
    addReason(reasons, "TARGET_OFFER_REQUIRED");
  }
  if (
    ["cross_mechanism_feed_ingestion_and_ranking", "ordinary_publish_or_review"].includes(
      input.intent,
    ) &&
    input.targetOffer
  ) {
    addReason(reasons, "TARGET_OFFER_NOT_ALLOWED");
  }
  if (input.targetOffer) {
    if (input.targetOffer.offerId === input.sourceOffer.offerId) {
      addReason(reasons, "SELF_REFERENCE");
    }
    if (
      input.targetOffer.ownerId === input.sourceOffer.ownerId ||
      !input.counterparty.distinctFromActor ||
      input.counterparty.profileId === input.actor.actorId
    ) {
      addReason(reasons, "SAME_OWNER");
    }
    if (input.counterparty.profileId !== input.targetOffer.ownerId) {
      addReason(reasons, "COUNTERPARTY_BINDING_REQUIRED");
    }
  } else if (!input.counterparty.distinctFromActor) {
    addReason(reasons, "SAME_OWNER");
  }
  if (
    ["start_suggested_match", "feed_private_delivery", "research_edge_projection"].includes(
      input.intent,
    ) &&
    (!input.counterparty.profileId || input.counterparty.accountBindingStatus !== "bound")
  ) {
    addReason(reasons, "COUNTERPARTY_BINDING_REQUIRED");
  }
  if (
    input.intent === "create_invitation" &&
    input.counterparty.accountBindingStatus === "unknown"
  ) {
    addReason(reasons, "COUNTERPARTY_BINDING_REQUIRED");
  }
}

function checkConsent(reasons, observations, input) {
  const consent = input.consent;
  if (consent.sourceProductDiscovery !== "granted") {
    addReason(reasons, "SOURCE_PRODUCT_DISCOVERY_CONSENT_REQUIRED");
  }
  if (
    [
      "reciprocal_trade_match_suggestion_list",
      "start_suggested_match",
      "feed_private_delivery",
      "research_edge_projection",
    ].includes(input.intent) &&
    consent.targetProductDiscovery !== "granted"
  ) {
    addReason(reasons, "TARGET_PRODUCT_DISCOVERY_CONSENT_REQUIRED");
  }
  if (
    ["start_suggested_match", "create_invitation"].includes(input.intent) &&
    consent.invitationDeliveryPermission !== "granted"
  ) {
    addReason(reasons, "INVITATION_DELIVERY_PERMISSION_REQUIRED");
  }
  if (
    ["start_suggested_match", "create_invitation"].includes(input.intent) &&
    consent.invitationAcceptance === "declined"
  ) {
    addReason(reasons, "INVITATION_ACCEPTANCE_STATE_INVALID");
  }
  if (
    ["start_suggested_match", "create_invitation"].includes(input.intent) &&
    consent.invitationAcceptance === "pending"
  ) {
    addObservation(observations, "INVITATION_ACCEPTANCE_PENDING");
  }
  if (
    !consent.privacyScopeCompatible ||
    !input.sourceOffer.privacyScopeCompatible ||
    (input.targetOffer && !input.targetOffer.privacyScopeCompatible)
  ) {
    addReason(reasons, "PRIVACY_SCOPE_INCOMPATIBLE");
  }
}

function checkTransaction(reasons, input) {
  if (!MUTATION_INTENTS.has(input.intent)) return;
  if (
    !input.snapshot.sameTransaction ||
    !input.snapshot.revalidatedImmediatelyBeforeMutation
  ) {
    addReason(reasons, "SAME_TRANSACTION_REVALIDATION_REQUIRED");
  }
  if (input.snapshot.decisionRevision !== input.snapshot.mutationRevision) {
    addReason(reasons, "SNAPSHOT_REVISION_MISMATCH");
  }
  if (input.snapshot.concurrentMutationDetected) {
    addReason(reasons, "CONCURRENT_MUTATION_DETECTED");
  }
}

function checkPrivateDelivery(reasons, input) {
  const delivery = input.privateDelivery;
  if (input.intent !== "feed_private_delivery") {
    if (delivery.applies) addReason(reasons, "PRIVATE_DELIVERY_CONTRACT_FORBIDDEN");
    return;
  }
  const boundSource = input.targetOffer;
  if (
    !delivery.applies ||
    !boundSource ||
    delivery.boundSourceOfferId !== boundSource?.offerId ||
    delivery.boundTermsVersion !== boundSource?.termsVersion ||
    delivery.boundTermsHash !== boundSource?.termsHash ||
    delivery.boundSourceRevision !== boundSource?.sourceRevision ||
    !delivery.exactSourceOfferIdBound ||
    !delivery.exactTermsVersionBound ||
    !delivery.exactTermsHashBound ||
    !delivery.exactSourceRevisionBound
  ) {
    addReason(reasons, "PRIVATE_DELIVERY_SOURCE_BINDING_REQUIRED");
  }
  if (delivery.publicMarketPublicationRequested) {
    addReason(reasons, "PRIVATE_DELIVERY_PUBLIC_MARKET_FORBIDDEN");
  }
  if (input.feed.opportunityEnvelope !== null) {
    addReason(reasons, "PRIVATE_DELIVERY_PUBLIC_MARKET_FORBIDDEN");
  }
  if (input.feed.sourceChannel !== "private_source_bound") {
    addReason(reasons, "PRIVATE_DELIVERY_CHANNEL_REQUIRED");
  }
}

function checkResearch(reasons, globals, input) {
  if (input.research.recommendationGraphUsedAsAuthority) {
    addReason(reasons, "RECOMMENDATION_GRAPH_AUTHORITY_PROHIBITED");
  }
  if (input.research.participantCausalOutputRequested) {
    addReason(reasons, "PARTICIPANT_CAUSAL_OUTPUT_PROHIBITED");
  }
  if (input.research.applies || input.intent === "research_edge_projection") {
    addGlobal(globals, "RESEARCH_EXECUTION_NOT_AUTHORIZED");
  }
  if (input.intent !== "research_edge_projection") {
    if (input.research.applies) {
      addReason(reasons, "RESEARCH_OVERLAY_INTENT_MISMATCH");
    }
    return;
  }
  if (!input.research.applies || !input.research.purposeBound) {
    addReason(reasons, "RESEARCH_PURPOSE_NOT_BOUND");
  }
  if (
    !input.research.studySpecificConsentOrWaiverApproved ||
    input.consent.sourceResearch !== "approved" ||
    input.consent.targetResearch !== "approved"
  ) {
    addReason(reasons, "RESEARCH_CONSENT_OR_WAIVER_REQUIRED");
  }
  if (
    !input.research.historicalInterferenceCaptured ||
    !input.pair.engagements.terminalHistoricalRecordsCaptured
  ) {
    addReason(reasons, "HISTORICAL_STATE_NOT_CAPTURED");
  }
}

export function evaluateOperationIntent(input) {
  validateOperationIntentInput(input);

  const reasons = new Set();
  const globals = new Set();
  const observations = new Set();
  addGlobal(globals, "DESIGN_SHADOW_ONLY");
  addGlobal(globals, "LIVE_ACTIVATION_NOT_AUTHORIZED");
  addGlobal(globals, "PRODUCTION_MIGRATION_NOT_AUTHORIZED");

  checkIntentMechanism(reasons, input);
  checkIdentity(reasons, input);
  checkLifecycle(reasons, input);

  const crossFeed = input.intent === "cross_mechanism_feed_ingestion_and_ranking";
  if (crossFeed) {
    checkCrossMechanismFeed(reasons, input);
    addObservation(observations, "CROSS_MECHANISM_RANKING_NON_AUTHORITATIVE");
  } else {
    if (
      input.intent !== "feed_private_delivery" &&
      input.feed.opportunityEnvelope !== null
    ) {
      addReason(reasons, "OPPORTUNITY_ENVELOPE_INVALID");
    }
    checkStructuredGateSet(reasons, input.structuredGates.source, false);
    if (input.targetOffer) {
      checkStructuredGateSet(reasons, input.structuredGates.target, true);
    }
    checkRestrictions(reasons, input.pair.restrictions);
  }

  if (NEW_PAIR_INTENTS.has(input.intent)) {
    if (input.pair.blockStatus === "blocked") addReason(reasons, "PAIR_BLOCKED");
    if (input.pair.blockStatus === "unknown") addReason(reasons, "BLOCK_STATUS_UNKNOWN");
    checkEngagements(reasons, input.pair.engagements);
  }
  if (
    COMPATIBILITY_INTENTS.has(input.intent) ||
    (input.intent === "create_invitation" && input.targetOffer)
  ) {
    checkCompatibility(reasons, input);
  }

  checkConsent(reasons, observations, input);
  checkTransaction(reasons, input);
  checkPrivateDelivery(reasons, input);
  checkResearch(reasons, globals, input);

  const nestedById = checkNestedOpportunities(reasons, input);
  checkPaidAction(reasons, globals, observations, input, nestedById);
  checkCoAct(reasons, input, nestedById);

  if (input.systemMoneyLegs.length) {
    addObservation(observations, "SYSTEM_MONEY_LEGS_SEPARATE");
  }
  if (input.pair.engagements.terminalHistoricalCount > 0) {
    addObservation(observations, "TERMINAL_HISTORY_RETAINED");
  }

  const candidateReasonCodes = ordered(reasons, BLOCKING_REASON_ORDER);
  const globalBlockerReasonCodes = ordered(globals, GLOBAL_BLOCKER_ORDER);
  const observationCodes = ordered(observations, OBSERVATION_ORDER);
  const candidatePolicySatisfied = candidateReasonCodes.length === 0;
  const opportunityEnvelopeAccepted = crossFeed && candidatePolicySatisfied;
  const inputDigest = sha256(canonicalJson(input));
  const decisionWithoutDigest = {
    schemaVersion: "moral-trade-operation-intent-decision-v1.0.0",
    evaluatorVersion: EVALUATOR_VERSION,
    inputDigest,
    intent: input.intent,
    mechanismFamily: input.sourceOffer.mechanismFamily,
    outerContractFamily: input.sourceOffer.outerContractFamily,
    candidatePolicySatisfied,
    shadowDecision: candidatePolicySatisfied ? "include" : "exclude",
    liveEligible: false,
    executionDecision: "no_live_activation",
    candidateReasonCodes,
    globalBlockerReasonCodes,
    observationCodes,
    transactionRevalidationRequired: MUTATION_INTENTS.has(input.intent),
    opportunityEnvelopeAccepted,
    syntheticOnly: true,
    effectiveAt: input.effectiveAt,
    snapshotId: input.snapshot.snapshotId,
    releaseClassification: "repository_only_design_and_shadow",
  };
  const decision = {
    ...decisionWithoutDigest,
    decisionDigest: sha256(canonicalJson(decisionWithoutDigest)),
  };
  validateOperationIntentDecision(decision);
  return decision;
}
