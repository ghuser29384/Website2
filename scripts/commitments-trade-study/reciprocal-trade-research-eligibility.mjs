import inputSchema from "../../docs/commitments/impact-identification/study-candidates/trade-bilateral-encouragement-planning-v1/canonical-eligibility/eligibility-input.schema.v1.json" with { type: "json" };
import decisionSchema from "../../docs/commitments/impact-identification/study-candidates/trade-bilateral-encouragement-planning-v1/canonical-eligibility/eligibility-decision.schema.v1.json" with { type: "json" };

export const EVALUATOR_VERSION = "reciprocal-trade-research-eligibility-v1.0.0";
export const INPUT_SCHEMA_VERSION = "reciprocal-trade-research-eligibility-input-v1.0.0";
export const DECISION_SCHEMA_VERSION = "reciprocal-trade-research-eligibility-decision-v1.0.0";
export const POLICY_SOURCE_MANIFEST_HASH = "sha256:ba46f72b3676229eb73e653d4b5b370a2145a2998522bf7acb0991d38da42243";
export const BOUND_BASE_COMMIT = "79ca382c3bdc325dfc5a28e2cbbafc1b95640386";

export const GLOBAL_BLOCKER_CODES = Object.freeze([
  "CANONICAL_ELIGIBILITY_SOURCE_CONFLICT",
  "GATE_EVIDENCE_PROVENANCE_UNRESOLVED",
  "PRIVACY_REVIEW_NOT_APPROVED",
  "ETHICS_DETERMINATION_NOT_APPROVED",
  "CONSENT_OR_WAIVER_NOT_APPROVED"
]);

export const CANDIDATE_REASON_CODES = Object.freeze([
  "INPUT_SCHEMA_INVALID",
  "INPUT_SCHEMA_VERSION_MISMATCH",
  "EVALUATOR_VERSION_MISMATCH",
  "POLICY_MANIFEST_HASH_MISMATCH",
  "BASE_COMMIT_MISMATCH",
  "EFFECTIVE_TIME_INVALID",
  "PROVENANCE_NOT_SYNTHETIC",
  "SYNTHETIC_IDENTIFIER_NAMESPACE_REQUIRED",
  "REAL_ROWS_PROHIBITED",
  "PROTECTED_DATA_NOT_AUTHORIZED",
  "STUDY_AUTHORIZATION_PROHIBITED",
  "RECOMMENDATION_EVIDENCE_PROHIBITED",
  "PARTICIPANT_CAUSAL_OUTPUT_PROHIBITED",
  "ASSIGNMENT_MATERIAL_PROHIBITED",
  "SAME_OFFER",
  "SAME_OWNER",
  "UNSUPPORTED_MODE",
  "MODE_MISMATCH",
  "SOURCE_NOT_PUBLISHED",
  "TARGET_NOT_PUBLISHED",
  "SOURCE_NOT_OPEN",
  "TARGET_NOT_OPEN",
  "SOURCE_NOT_OPERATIVE",
  "TARGET_NOT_OPERATIVE",
  "SOURCE_INVITATION_INCOMPATIBLE",
  "TARGET_INVITATION_INCOMPATIBLE",
  "CAUSE_COLLATION_UNBOUND",
  "CAUSE_VALUE_UNSAFE",
  "CAUSE_PATTERN_INVALID",
  "SOURCE_REQUEST_NOT_OFFERED_BY_TARGET",
  "TARGET_REQUEST_NOT_OFFERED_BY_SOURCE",
  "SOURCE_MODERATION_NOT_CLEARED",
  "TARGET_MODERATION_NOT_CLEARED",
  "SOURCE_HARM_NOT_CLEARED",
  "TARGET_HARM_NOT_CLEARED",
  "SOURCE_BASELINE_NOT_CLEARED",
  "TARGET_BASELINE_NOT_CLEARED",
  "SOURCE_LEGALITY_NOT_CLEARED",
  "TARGET_LEGALITY_NOT_CLEARED",
  "SOURCE_PARTICIPANT_NOT_ELIGIBLE",
  "TARGET_PARTICIPANT_NOT_ELIGIBLE",
  "SOURCE_CONSENT_NOT_CURRENT",
  "TARGET_CONSENT_NOT_CURRENT",
  "SOURCE_ROLE_NOT_AUTHORIZED",
  "TARGET_ROLE_NOT_AUTHORIZED",
  "PRIVACY_SCOPE_MISMATCH",
  "PAIR_BLOCKED",
  "BLOCK_STATUS_UNKNOWN",
  "SOURCE_RESTRICTED",
  "TARGET_RESTRICTED",
  "PAIR_RESTRICTED",
  "RESTRICTION_STATUS_UNKNOWN",
  "RESTRICTION_STATUS_CONTRADICTORY",
  "ACCEPTED_INTEREST_CONFLICT",
  "INVITATION_CONFLICT",
  "ACTIVE_THREAD_CONFLICT",
  "ACTIVE_AGREEMENT_CONFLICT",
  "DUPLICATE_PAIR_CONFLICT",
  "HISTORICAL_INTERFERENCE_UNKNOWN"
]);

export const REASON_CODES = Object.freeze([...GLOBAL_BLOCKER_CODES, ...CANDIDATE_REASON_CODES]);
const REASON_RANK = Object.freeze(Object.fromEntries(REASON_CODES.map((code, index) => [code, index])));

function isRecord(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value) && Object.getPrototypeOf(value) === Object.prototype;
}

function oneOf(value, values) {
  return typeof value === "string" && values.includes(value);
}

function resolveLocalRef(root, reference) {
  if (!reference.startsWith("#/")) return null;
  return reference.slice(2).split("/").reduce((value, segment) => value?.[segment.replaceAll("~1", "/").replaceAll("~0", "~")], root);
}

function matchesType(value, type) {
  if (type === "null") return value === null;
  if (type === "array") return Array.isArray(value);
  if (type === "object") return isRecord(value);
  if (type === "integer") return Number.isInteger(value);
  return typeof value === type;
}

function sameJsonValue(left, right) {
  return JSON.stringify(left) === JSON.stringify(right);
}

function schemaMatches(schema, value, root) {
  if (schema.$ref) {
    const resolved = resolveLocalRef(root, schema.$ref);
    return resolved !== null && schemaMatches(resolved, value, root);
  }
  if (schema.oneOf) {
    const matches = schema.oneOf.filter((candidate) => schemaMatches(candidate, value, root)).length;
    if (matches !== 1) return false;
  }
  if (schema.type !== undefined) {
    const types = Array.isArray(schema.type) ? schema.type : [schema.type];
    if (!types.some((type) => matchesType(value, type))) return false;
  }
  if (Object.hasOwn(schema, "const") && !sameJsonValue(value, schema.const)) return false;
  if (schema.enum && !schema.enum.some((candidate) => sameJsonValue(value, candidate))) return false;
  if (typeof value === "string") {
    if (schema.minLength !== undefined && value.length < schema.minLength) return false;
    if (schema.maxLength !== undefined && value.length > schema.maxLength) return false;
    if (schema.pattern !== undefined && !new RegExp(schema.pattern, "u").test(value)) return false;
  }
  if (typeof value === "number") {
    if (schema.minimum !== undefined && value < schema.minimum) return false;
    if (schema.maximum !== undefined && value > schema.maximum) return false;
  }
  if (Array.isArray(value)) {
    if (schema.minItems !== undefined && value.length < schema.minItems) return false;
    if (schema.maxItems !== undefined && value.length > schema.maxItems) return false;
    if (schema.uniqueItems && new Set(value.map((entry) => JSON.stringify(entry))).size !== value.length) return false;
    if (schema.prefixItems) {
      for (let index = 0; index < schema.prefixItems.length; index += 1) {
        if (index >= value.length || !schemaMatches(schema.prefixItems[index], value[index], root)) return false;
      }
    }
    if (schema.items && !value.every((entry) => schemaMatches(schema.items, entry, root))) return false;
  }
  if (isRecord(value)) {
    if (schema.required && !schema.required.every((key) => Object.hasOwn(value, key))) return false;
    if (schema.additionalProperties === false) {
      const allowed = new Set(Object.keys(schema.properties ?? {}));
      if (Object.keys(value).some((key) => !allowed.has(key))) return false;
    }
    for (const [key, propertySchema] of Object.entries(schema.properties ?? {})) {
      if (Object.hasOwn(value, key) && !schemaMatches(propertySchema, value[key], root)) return false;
    }
  }
  return true;
}

export function validateEligibilityInput(input) {
  return schemaMatches(inputSchema, input, inputSchema);
}

export function validateEligibilityDecision(decision) {
  return schemaMatches(decisionSchema, decision, decisionSchema);
}

function isTimestamp(value) {
  return typeof value === "string" && /^[0-9]{4}-(?:(?:0[13578]|1[02])-(?:0[1-9]|[12][0-9]|3[01])|(?:0[469]|11)-(?:0[1-9]|[12][0-9]|30)|02-(?:0[1-9]|1[0-9]|2[0-9]))T(?:[01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]Z$/.test(value);
}

function isSyntheticKey(value) {
  return typeof value === "string" && /^synthetic:[a-z0-9][a-z0-9_-]{0,63}$/.test(value);
}

function isPrintableAscii(value) {
  return typeof value === "string" && value.length >= 1 && value.length <= 180 && /^[\x20-\x7e]+$/.test(value);
}

function isValidPostgresLikePattern(pattern) {
  for (let index = 0; index < pattern.length; index += 1) {
    if (pattern[index] !== "\\") continue;
    if (index + 1 >= pattern.length) return false;
    index += 1;
  }
  return true;
}

function escapeRegexCharacter(character) {
  return /[\\^$.*+?()[\]{}|/]/.test(character) ? `\\${character}` : character;
}

function postgresIlikePrintableAscii(value, pattern) {
  let source = "^";
  for (let index = 0; index < pattern.length; index += 1) {
    const character = pattern[index];
    if (character === "\\" && index + 1 >= pattern.length) {
      return false;
    }
    if (character === "\\") {
      index += 1;
      source += escapeRegexCharacter(pattern[index]);
    } else if (character === "%") {
      source += ".*";
    } else if (character === "_") {
      source += ".";
    } else {
      source += escapeRegexCharacter(character);
    }
  }
  source += "$";
  return new RegExp(source, "i").test(value);
}

function uniqueOrdered(values) {
  return [...new Set(values)].sort((left, right) => {
    const rankDifference = (REASON_RANK[left] ?? Number.MAX_SAFE_INTEGER) - (REASON_RANK[right] ?? Number.MAX_SAFE_INTEGER);
    if (rankDifference !== 0) return rankDifference;
    return left < right ? -1 : left > right ? 1 : 0;
  });
}

function globalBlockersFor(input) {
  const blockers = [
    "CANONICAL_ELIGIBILITY_SOURCE_CONFLICT",
    "GATE_EVIDENCE_PROVENANCE_UNRESOLVED"
  ];
  const authorization = isRecord(input) && isRecord(input.studyAuthorization) ? input.studyAuthorization : {};
  if (authorization.privacyReviewStatus !== "approved") blockers.push("PRIVACY_REVIEW_NOT_APPROVED");
  if (authorization.ethicsDeterminationStatus !== "approved") blockers.push("ETHICS_DETERMINATION_NOT_APPROVED");
  if (authorization.consentOrWaiverStatus !== "approved") blockers.push("CONSENT_OR_WAIVER_NOT_APPROVED");
  return uniqueOrdered(blockers);
}

function makeDecision(input, candidateReasons, unknown, stale) {
  const candidateReasonCodes = uniqueOrdered(candidateReasons);
  const globalBlockerReasons = globalBlockersFor(input);
  const candidatePolicySatisfied = candidateReasonCodes.length === 0;
  const decision = {
    schemaVersion: DECISION_SCHEMA_VERSION,
    evaluatorVersion: EVALUATOR_VERSION,
    policySourceManifestHash: POLICY_SOURCE_MANIFEST_HASH,
    effectiveAt: isRecord(input) && isTimestamp(input.effectiveAt) ? input.effectiveAt : null,
    subjectMode: isRecord(input) && oneOf(input.subjectMode, ["synthetic", "protected"]) ? input.subjectMode : "invalid",
    candidatePolicySatisfied,
    candidateReasonCodes,
    globalBlockerReasons,
    eligible: candidatePolicySatisfied && globalBlockerReasons.length === 0,
    reasonCodes: uniqueOrdered([...globalBlockerReasons, ...candidateReasonCodes]),
    unknownBlockers: uniqueOrdered(unknown),
    staleSourceBlockers: uniqueOrdered(stale),
    canonicalEligibilitySourceStatus: "blocked_source_conflict",
    realGraphDiagnosticsStatus: "blocked_not_run",
    protectedDataExportAuthorized: false,
    executionDecision: "no_launch",
    assignmentGenerated: false,
    assignmentSeedGenerated: false,
    participantLevelCausalClaim: null
  };
  if (!validateEligibilityDecision(decision)) throw new Error("Evaluator emitted a decision outside the frozen decision schema.");
  return decision;
}

function pushEvidenceResult(evidence, expectedGateId, reason, effectiveAt, reasons, unknown, stale) {
  if (evidence.gateId === expectedGateId && evidence.status === "cleared" && evidence.sourceStatus === "current" && evidence.policyManifestHash === POLICY_SOURCE_MANIFEST_HASH && evidence.evidenceProvenanceStatus === "unresolved_not_bound" && evidence.evidenceSourceId === null && evidence.projectionHash === null && evidence.attestationHash === null && evidence.reviewedAt <= effectiveAt && (evidence.expiresAt === null || evidence.expiresAt > effectiveAt)) return;
  reasons.push(reason);
  if (evidence.status === "stale" || evidence.sourceStatus === "stale" || evidence.expiresAt !== null && evidence.expiresAt <= effectiveAt) stale.push(reason);
  if (["unknown", "contradictory"].includes(evidence.status) || ["unknown", "unbound", "contradictory"].includes(evidence.sourceStatus) || evidence.gateId !== expectedGateId || evidence.policyManifestHash !== POLICY_SOURCE_MANIFEST_HASH || evidence.evidenceProvenanceStatus !== "unresolved_not_bound" || evidence.evidenceSourceId !== null || evidence.projectionHash !== null || evidence.attestationHash !== null || evidence.reviewedAt > effectiveAt) unknown.push(reason);
}

function pushConsentResult(consent, role, reason, roleReason, effectiveAt, reasons, unknown, stale) {
  const current = consent.status === "current"
    && consent.sourceStatus === "current"
    && consent.purposeCode === "reciprocal_trade_research_eligibility_v1"
    && consent.privacyScope === "research_eligibility_normalized_pair_only"
    && consent.startsAt <= effectiveAt
    && (consent.expiresAt === null || consent.expiresAt > effectiveAt)
    && consent.revokedAt === null;
  if (!current) {
    reasons.push(reason);
    if (consent.status === "stale" || consent.sourceStatus === "stale" || consent.expiresAt !== null && consent.expiresAt <= effectiveAt) stale.push(reason);
    if (["absent", "unknown", "contradictory"].includes(consent.status) || ["unknown", "unbound", "contradictory"].includes(consent.sourceStatus) || consent.startsAt > effectiveAt) unknown.push(reason);
    if (consent.purposeCode !== "reciprocal_trade_research_eligibility_v1" || consent.privacyScope !== "research_eligibility_normalized_pair_only" || consent.status === "scope_mismatch") reasons.push("PRIVACY_SCOPE_MISMATCH");
  }
  if (![role, "bidirectional"].includes(consent.allowedRole)) reasons.push(roleReason);
}

function pushRestrictionResult(restriction, reason, effectiveAt, reasons, unknown, stale) {
  if (["unknown", "contradictory"].includes(restriction.status) || ["unknown", "unbound", "contradictory"].includes(restriction.sourceStatus)) {
    reasons.push("RESTRICTION_STATUS_UNKNOWN");
    unknown.push("RESTRICTION_STATUS_UNKNOWN");
    return;
  }
  if (restriction.sourceStatus === "stale") {
    reasons.push("RESTRICTION_STATUS_UNKNOWN");
    stale.push("RESTRICTION_STATUS_UNKNOWN");
    return;
  }
  const timestampsContradict = restriction.startsAt > effectiveAt
    || restriction.expiresAt !== null && restriction.expiresAt < restriction.startsAt
    || restriction.revokedAt !== null && restriction.revokedAt < restriction.startsAt
    || restriction.expiresAt !== null && restriction.revokedAt !== null;
  const statusContradicts = restriction.status === "clear" && (restriction.expiresAt !== null || restriction.revokedAt !== null)
    || ["active", "reviewing"].includes(restriction.status) && (restriction.expiresAt !== null && restriction.expiresAt <= effectiveAt || restriction.revokedAt !== null && restriction.revokedAt <= effectiveAt)
    || restriction.status === "expired" && (restriction.expiresAt === null || restriction.expiresAt > effectiveAt || restriction.revokedAt !== null)
    || restriction.status === "revoked" && (restriction.revokedAt === null || restriction.revokedAt > effectiveAt);
  if (timestampsContradict || statusContradicts) {
    reasons.push("RESTRICTION_STATUS_CONTRADICTORY");
    unknown.push("RESTRICTION_STATUS_CONTRADICTORY");
    return;
  }
  if (["active", "reviewing"].includes(restriction.status)) reasons.push(reason);
}

function pushEngagement(value, reason, reasons, unknown) {
  if (value === "active" || value === "present") reasons.push(reason);
  if (value === "unknown" || value === "contradictory") {
    reasons.push(reason);
    unknown.push(reason);
  }
}

export function evaluateReciprocalTradeResearchEligibility(input) {
  const reasons = [];
  const unknown = [];
  const stale = [];
  if (!validateEligibilityInput(input)) {
    reasons.push("INPUT_SCHEMA_INVALID");
    if (!isRecord(input) || !isTimestamp(input.effectiveAt)) reasons.push("EFFECTIVE_TIME_INVALID");
    return makeDecision(input, reasons, unknown, stale);
  }
  if (input.schemaVersion !== INPUT_SCHEMA_VERSION) reasons.push("INPUT_SCHEMA_VERSION_MISMATCH");
  if (input.evaluatorVersion !== EVALUATOR_VERSION) reasons.push("EVALUATOR_VERSION_MISMATCH");
  if (input.policySourceManifestHash !== POLICY_SOURCE_MANIFEST_HASH) reasons.push("POLICY_MANIFEST_HASH_MISMATCH");
  if (input.provenance.boundBaseCommit !== BOUND_BASE_COMMIT) reasons.push("BASE_COMMIT_MISMATCH");
  if (!isTimestamp(input.effectiveAt)) reasons.push("EFFECTIVE_TIME_INVALID");
  if (reasons.length > 0) return makeDecision(input, reasons, unknown, stale);

  if (input.subjectMode !== "synthetic" || input.provenance.sourceKind !== "synthetic_fixture") reasons.push("PROVENANCE_NOT_SYNTHETIC");
  if ((input.subjectMode === "synthetic" || input.provenance.sourceKind === "synthetic_fixture") && ![
    input.provenance.snapshotKey,
    input.sourceOffer.offerKey,
    input.sourceOffer.ownerKey,
    input.targetOffer.offerKey,
    input.targetOffer.ownerKey
  ].every(isSyntheticKey)) reasons.push("SYNTHETIC_IDENTIFIER_NAMESPACE_REQUIRED");
  if (input.provenance.containsRealRows) reasons.push("REAL_ROWS_PROHIBITED");
  if (input.subjectMode === "protected" || input.studyAuthorization.protectedDataExportAuthorized) reasons.push("PROTECTED_DATA_NOT_AUTHORIZED");
  if (input.studyAuthorization.assignmentAuthorized || input.studyAuthorization.participantContactAuthorized) reasons.push("STUDY_AUTHORIZATION_PROHIBITED");
  if (input.provenance.recommendationEdgeUsed) reasons.push("RECOMMENDATION_EVIDENCE_PROHIBITED");
  if (input.provenance.participantCausalOutputRequested) reasons.push("PARTICIPANT_CAUSAL_OUTPUT_PROHIBITED");
  if (input.provenance.assignmentMaterialPresent) reasons.push("ASSIGNMENT_MATERIAL_PROHIBITED");

  const source = input.sourceOffer;
  const target = input.targetOffer;
  const effectiveAt = input.effectiveAt;
  if (source.offerKey === target.offerKey) reasons.push("SAME_OFFER");
  if (source.ownerKey === target.ownerKey) reasons.push("SAME_OWNER");
  if (source.mode !== "pledge" || target.mode !== "pledge") reasons.push("UNSUPPORTED_MODE");
  if (source.mode !== target.mode) reasons.push("MODE_MISMATCH");
  if (source.workflowStatus !== "published") reasons.push("SOURCE_NOT_PUBLISHED");
  if (target.workflowStatus !== "published") reasons.push("TARGET_NOT_PUBLISHED");
  if (source.status !== "open") reasons.push("SOURCE_NOT_OPEN");
  if (target.status !== "open") reasons.push("TARGET_NOT_OPEN");
  if (source.operability !== "operative") {
    reasons.push("SOURCE_NOT_OPERATIVE");
    if (source.operability === "stale") stale.push("SOURCE_NOT_OPERATIVE");
    if (["unknown", "contradictory"].includes(source.operability)) unknown.push("SOURCE_NOT_OPERATIVE");
  }
  if (target.operability !== "operative") {
    reasons.push("TARGET_NOT_OPERATIVE");
    if (target.operability === "stale") stale.push("TARGET_NOT_OPERATIVE");
    if (["unknown", "contradictory"].includes(target.operability)) unknown.push("TARGET_NOT_OPERATIVE");
  }
  if (source.invitationCompatibility !== "compatible") {
    reasons.push("SOURCE_INVITATION_INCOMPATIBLE");
    if (source.invitationCompatibility === "stale") stale.push("SOURCE_INVITATION_INCOMPATIBLE");
    if (["unknown", "contradictory"].includes(source.invitationCompatibility)) unknown.push("SOURCE_INVITATION_INCOMPATIBLE");
  }
  if (target.invitationCompatibility !== "compatible") {
    reasons.push("TARGET_INVITATION_INCOMPATIBLE");
    if (target.invitationCompatibility === "stale") stale.push("TARGET_INVITATION_INCOMPATIBLE");
    if (["unknown", "contradictory"].includes(target.invitationCompatibility)) unknown.push("TARGET_INVITATION_INCOMPATIBLE");
  }
  if (source.causeCollation !== "postgres-ilike-printable-ascii-v1" || target.causeCollation !== "postgres-ilike-printable-ascii-v1") reasons.push("CAUSE_COLLATION_UNBOUND");
  const causes = [source.offeredCause, source.requestedCause, target.offeredCause, target.requestedCause];
  if (!causes.every(isPrintableAscii)) reasons.push("CAUSE_VALUE_UNSAFE");
  const patternsAreValid = isValidPostgresLikePattern(source.requestedCause) && isValidPostgresLikePattern(source.offeredCause);
  if (causes.every(isPrintableAscii) && !patternsAreValid) reasons.push("CAUSE_PATTERN_INVALID");
  if (causes.every(isPrintableAscii) && patternsAreValid) {
    if (!postgresIlikePrintableAscii(target.offeredCause, source.requestedCause)) reasons.push("SOURCE_REQUEST_NOT_OFFERED_BY_TARGET");
    if (!postgresIlikePrintableAscii(target.requestedCause, source.offeredCause)) reasons.push("TARGET_REQUEST_NOT_OFFERED_BY_SOURCE");
  }

  pushEvidenceResult(source.gates.moderation, "moderation", "SOURCE_MODERATION_NOT_CLEARED", effectiveAt, reasons, unknown, stale);
  pushEvidenceResult(target.gates.moderation, "moderation", "TARGET_MODERATION_NOT_CLEARED", effectiveAt, reasons, unknown, stale);
  pushEvidenceResult(source.gates.harmfulOffer, "harmful_offer", "SOURCE_HARM_NOT_CLEARED", effectiveAt, reasons, unknown, stale);
  pushEvidenceResult(target.gates.harmfulOffer, "harmful_offer", "TARGET_HARM_NOT_CLEARED", effectiveAt, reasons, unknown, stale);
  pushEvidenceResult(source.gates.baselineIntegrity, "baseline_integrity", "SOURCE_BASELINE_NOT_CLEARED", effectiveAt, reasons, unknown, stale);
  pushEvidenceResult(target.gates.baselineIntegrity, "baseline_integrity", "TARGET_BASELINE_NOT_CLEARED", effectiveAt, reasons, unknown, stale);
  pushEvidenceResult(source.gates.legality, "legality", "SOURCE_LEGALITY_NOT_CLEARED", effectiveAt, reasons, unknown, stale);
  pushEvidenceResult(target.gates.legality, "legality", "TARGET_LEGALITY_NOT_CLEARED", effectiveAt, reasons, unknown, stale);
  pushEvidenceResult(source.gates.participantEligibility, "participant_eligibility", "SOURCE_PARTICIPANT_NOT_ELIGIBLE", effectiveAt, reasons, unknown, stale);
  pushEvidenceResult(target.gates.participantEligibility, "participant_eligibility", "TARGET_PARTICIPANT_NOT_ELIGIBLE", effectiveAt, reasons, unknown, stale);

  pushConsentResult(input.pair.sourceConsent, "source_only", "SOURCE_CONSENT_NOT_CURRENT", "SOURCE_ROLE_NOT_AUTHORIZED", effectiveAt, reasons, unknown, stale);
  pushConsentResult(input.pair.targetConsent, "target_only", "TARGET_CONSENT_NOT_CURRENT", "TARGET_ROLE_NOT_AUTHORIZED", effectiveAt, reasons, unknown, stale);
  if (input.pair.blockStatus !== "clear") {
    if (["unknown", "contradictory"].includes(input.pair.blockStatus)) {
      reasons.push("BLOCK_STATUS_UNKNOWN");
      unknown.push("BLOCK_STATUS_UNKNOWN");
    } else {
      reasons.push("PAIR_BLOCKED");
    }
  }
  pushRestrictionResult(input.pair.sourceRestriction, "SOURCE_RESTRICTED", effectiveAt, reasons, unknown, stale);
  pushRestrictionResult(input.pair.targetRestriction, "TARGET_RESTRICTED", effectiveAt, reasons, unknown, stale);
  pushRestrictionResult(input.pair.pairRestriction, "PAIR_RESTRICTED", effectiveAt, reasons, unknown, stale);

  const engagement = input.pair.engagement;
  pushEngagement(engagement.acceptedInterest, "ACCEPTED_INTEREST_CONFLICT", reasons, unknown);
  pushEngagement(engagement.invitation, "INVITATION_CONFLICT", reasons, unknown);
  pushEngagement(engagement.thread, "ACTIVE_THREAD_CONFLICT", reasons, unknown);
  pushEngagement(engagement.agreement, "ACTIVE_AGREEMENT_CONFLICT", reasons, unknown);
  pushEngagement(engagement.duplicatePair, "DUPLICATE_PAIR_CONFLICT", reasons, unknown);
  if (["unknown", "contradictory"].includes(engagement.historicalInterference)) {
    reasons.push("HISTORICAL_INTERFERENCE_UNKNOWN");
    unknown.push("HISTORICAL_INTERFERENCE_UNKNOWN");
  }

  return makeDecision(input, reasons, unknown, stale);
}
