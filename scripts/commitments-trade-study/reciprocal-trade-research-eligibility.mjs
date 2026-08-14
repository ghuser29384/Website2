export const EVALUATOR_VERSION = "reciprocal-trade-research-eligibility-v1.0.0";
export const INPUT_SCHEMA_VERSION = "reciprocal-trade-research-eligibility-input-v1.0.0";
export const DECISION_SCHEMA_VERSION = "reciprocal-trade-research-eligibility-decision-v1.0.0";
export const POLICY_SOURCE_MANIFEST_HASH = "sha256:19423f7be11351846c4dfc3036e8ca730ea9a2083fab495979290913287ed2b8";
export const BOUND_BASE_COMMIT = "79ca382c3bdc325dfc5a28e2cbbafc1b95640386";

export const REASON_CODES = Object.freeze([
  "INPUT_SCHEMA_INVALID",
  "INPUT_SCHEMA_VERSION_MISMATCH",
  "EVALUATOR_VERSION_MISMATCH",
  "POLICY_MANIFEST_HASH_MISMATCH",
  "BASE_COMMIT_MISMATCH",
  "EFFECTIVE_TIME_INVALID",
  "PROVENANCE_NOT_SYNTHETIC",
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

const REASON_RANK = Object.freeze(Object.fromEntries(REASON_CODES.map((code, index) => [code, index])));
const GATE_STATUSES = ["cleared", "blocked", "review_required", "unknown", "stale", "contradictory"];
const SOURCE_STATUSES = ["current", "stale", "unknown", "unbound", "contradictory"];
const WORKFLOW_STATUSES = ["draft", "pending_review", "published", "changes_requested", "rejected", "paused", "closed", "deleted"];
const OFFER_STATUSES = ["open", "paused", "matched", "closed"];
const OPERABILITY_STATUSES = ["operative", "expired", "superseded", "withdrawn", "blocked", "unknown", "stale", "contradictory"];
const RESTRICTION_STATUSES = ["clear", "active", "reviewing", "expired", "revoked", "unknown", "contradictory"];

function isRecord(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value) && Object.getPrototypeOf(value) === Object.prototype;
}

function exactKeys(value, expected) {
  if (!isRecord(value)) return false;
  const actual = Object.keys(value).sort();
  const wanted = [...expected].sort();
  return actual.length === wanted.length && actual.every((key, index) => key === wanted[index]);
}

function oneOf(value, values) {
  return typeof value === "string" && values.includes(value);
}

function isSha256(value) {
  return typeof value === "string" && /^sha256:[a-f0-9]{64}$/.test(value);
}

function isSafeKey(value) {
  return typeof value === "string" && /^(synthetic:[a-z0-9][a-z0-9_-]{0,63}|pseudonym:sha256:[a-f0-9]{64})$/.test(value);
}

function isTimestamp(value) {
  if (typeof value !== "string") return false;
  const match = /^([0-9]{4})-(0[1-9]|1[0-2])-([0-2][0-9]|3[01])T([01][0-9]|2[0-3]):([0-5][0-9]):([0-5][0-9])Z$/.exec(value);
  if (!match) return false;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const leap = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  const days = [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  return day >= 1 && day <= days[month - 1];
}

function isTimestampOrNull(value) {
  return value === null || isTimestamp(value);
}

function validGateEvidence(value) {
  return exactKeys(value, ["status", "sourceStatus", "sourceHash", "reviewedAt", "expiresAt"])
    && oneOf(value.status, GATE_STATUSES)
    && oneOf(value.sourceStatus, SOURCE_STATUSES)
    && isSha256(value.sourceHash)
    && isTimestamp(value.reviewedAt)
    && isTimestampOrNull(value.expiresAt);
}

function validOffer(value) {
  if (!exactKeys(value, ["offerKey", "ownerKey", "mode", "offeredCause", "requestedCause", "causeCollation", "workflowStatus", "status", "operability", "invitationCompatibility", "gates"])) return false;
  if (!isSafeKey(value.offerKey) || !isSafeKey(value.ownerKey)) return false;
  if (!oneOf(value.mode, ["pledge", "offset", "payment"])) return false;
  if (typeof value.offeredCause !== "string" || typeof value.requestedCause !== "string") return false;
  if (value.offeredCause.length < 1 || value.offeredCause.length > 180 || value.requestedCause.length < 1 || value.requestedCause.length > 180) return false;
  if (typeof value.causeCollation !== "string" || value.causeCollation.length < 1 || value.causeCollation.length > 80) return false;
  if (!oneOf(value.workflowStatus, WORKFLOW_STATUSES) || !oneOf(value.status, OFFER_STATUSES) || !oneOf(value.operability, OPERABILITY_STATUSES)) return false;
  if (!oneOf(value.invitationCompatibility, ["compatible", "payment_schedule_present", "donation_offset_attachment_present", "active_performance_bond_present", "unknown", "stale", "contradictory"])) return false;
  if (!exactKeys(value.gates, ["moderation", "harmfulOffer", "baselineIntegrity", "legality", "participantEligibility"])) return false;
  return Object.values(value.gates).every(validGateEvidence);
}

function validConsent(value) {
  return exactKeys(value, ["status", "allowedRole", "purposeCode", "privacyScope", "sourceStatus", "grantHash", "startsAt", "expiresAt", "revokedAt"])
    && oneOf(value.status, ["current", "absent", "revoked", "stale", "scope_mismatch", "unknown", "contradictory"])
    && oneOf(value.allowedRole, ["source_only", "target_only", "bidirectional", "none"])
    && value.purposeCode === "reciprocal_trade_research_eligibility_v1"
    && value.privacyScope === "research_eligibility_normalized_pair_only"
    && oneOf(value.sourceStatus, SOURCE_STATUSES)
    && isSha256(value.grantHash)
    && isTimestamp(value.startsAt)
    && isTimestampOrNull(value.expiresAt)
    && isTimestampOrNull(value.revokedAt);
}

function validRestriction(value) {
  return exactKeys(value, ["status", "sourceStatus", "startsAt", "expiresAt", "revokedAt"])
    && oneOf(value.status, RESTRICTION_STATUSES)
    && oneOf(value.sourceStatus, SOURCE_STATUSES)
    && isTimestamp(value.startsAt)
    && isTimestampOrNull(value.expiresAt)
    && isTimestampOrNull(value.revokedAt);
}

function validEngagement(value) {
  return exactKeys(value, ["acceptedInterest", "invitation", "thread", "agreement", "duplicatePair", "historicalInterference"])
    && oneOf(value.acceptedInterest, ["none", "active", "terminal", "unknown", "contradictory"])
    && oneOf(value.invitation, ["none", "active", "terminal", "unknown", "contradictory"])
    && oneOf(value.thread, ["none", "active", "terminal", "unknown", "contradictory"])
    && oneOf(value.agreement, ["none", "active", "terminal", "unknown", "contradictory"])
    && oneOf(value.duplicatePair, ["none", "present", "unknown", "contradictory"])
    && oneOf(value.historicalInterference, ["captured", "none", "unknown", "contradictory"]);
}

function validInputShape(input) {
  if (!exactKeys(input, ["schemaVersion", "evaluatorVersion", "policySourceManifestHash", "effectiveAt", "subjectMode", "studyAuthorization", "provenance", "sourceOffer", "targetOffer", "pair"])) return false;
  if (typeof input.schemaVersion !== "string" || typeof input.evaluatorVersion !== "string" || !isSha256(input.policySourceManifestHash)) return false;
  if (typeof input.effectiveAt !== "string" || !oneOf(input.subjectMode, ["synthetic", "protected"])) return false;
  const authorization = input.studyAuthorization;
  if (!exactKeys(authorization, ["protectedDataExportAuthorized", "privacyReviewStatus", "ethicsDeterminationStatus", "consentOrWaiverStatus", "assignmentAuthorized", "participantContactAuthorized"])) return false;
  if (typeof authorization.protectedDataExportAuthorized !== "boolean" || typeof authorization.assignmentAuthorized !== "boolean" || typeof authorization.participantContactAuthorized !== "boolean") return false;
  const reviewStates = ["approved", "required_not_completed", "rejected", "unknown"];
  if (!oneOf(authorization.privacyReviewStatus, reviewStates) || !oneOf(authorization.ethicsDeterminationStatus, reviewStates) || !oneOf(authorization.consentOrWaiverStatus, reviewStates)) return false;
  const provenance = input.provenance;
  if (!exactKeys(provenance, ["boundBaseCommit", "sourceKind", "snapshotKey", "snapshotSha256", "syntheticClusterCount", "containsRealRows", "recommendationEdgeUsed", "participantCausalOutputRequested", "assignmentMaterialPresent"])) return false;
  if (typeof provenance.boundBaseCommit !== "string" || !oneOf(provenance.sourceKind, ["synthetic_fixture", "protected_normalized_snapshot"]) || !isSafeKey(provenance.snapshotKey) || !isSha256(provenance.snapshotSha256)) return false;
  if (!Number.isInteger(provenance.syntheticClusterCount) || provenance.syntheticClusterCount < 0 || provenance.syntheticClusterCount > 3200) return false;
  if (typeof provenance.containsRealRows !== "boolean" || typeof provenance.recommendationEdgeUsed !== "boolean" || typeof provenance.participantCausalOutputRequested !== "boolean" || typeof provenance.assignmentMaterialPresent !== "boolean") return false;
  if (!validOffer(input.sourceOffer) || !validOffer(input.targetOffer)) return false;
  const pair = input.pair;
  if (!exactKeys(pair, ["blockStatus", "sourceRestriction", "targetRestriction", "pairRestriction", "sourceConsent", "targetConsent", "engagement"])) return false;
  return oneOf(pair.blockStatus, ["clear", "blocked_source_to_target", "blocked_target_to_source", "blocked_both", "unknown", "contradictory"])
    && validRestriction(pair.sourceRestriction)
    && validRestriction(pair.targetRestriction)
    && validRestriction(pair.pairRestriction)
    && validConsent(pair.sourceConsent)
    && validConsent(pair.targetConsent)
    && validEngagement(pair.engagement);
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

function makeDecision(input, reasons, unknown, stale) {
  const orderedReasons = uniqueOrdered(reasons);
  return {
    schemaVersion: DECISION_SCHEMA_VERSION,
    evaluatorVersion: EVALUATOR_VERSION,
    policySourceManifestHash: POLICY_SOURCE_MANIFEST_HASH,
    effectiveAt: isRecord(input) && isTimestamp(input.effectiveAt) ? input.effectiveAt : null,
    subjectMode: isRecord(input) && oneOf(input.subjectMode, ["synthetic", "protected"]) ? input.subjectMode : "invalid",
    eligible: orderedReasons.length === 0,
    reasonCodes: orderedReasons,
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
}

function pushEvidenceResult(evidence, reason, effectiveAt, reasons, unknown, stale) {
  if (evidence.status === "cleared" && evidence.sourceStatus === "current" && evidence.sourceHash === POLICY_SOURCE_MANIFEST_HASH && evidence.reviewedAt <= effectiveAt && (evidence.expiresAt === null || evidence.expiresAt > effectiveAt)) return;
  reasons.push(reason);
  if (evidence.status === "stale" || evidence.sourceStatus === "stale" || evidence.expiresAt !== null && evidence.expiresAt <= effectiveAt) stale.push(reason);
  if (["unknown", "contradictory"].includes(evidence.status) || ["unknown", "unbound", "contradictory"].includes(evidence.sourceStatus) || evidence.sourceHash !== POLICY_SOURCE_MANIFEST_HASH || evidence.reviewedAt > effectiveAt) unknown.push(reason);
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
  if (!validInputShape(input)) {
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

  pushEvidenceResult(source.gates.moderation, "SOURCE_MODERATION_NOT_CLEARED", effectiveAt, reasons, unknown, stale);
  pushEvidenceResult(target.gates.moderation, "TARGET_MODERATION_NOT_CLEARED", effectiveAt, reasons, unknown, stale);
  pushEvidenceResult(source.gates.harmfulOffer, "SOURCE_HARM_NOT_CLEARED", effectiveAt, reasons, unknown, stale);
  pushEvidenceResult(target.gates.harmfulOffer, "TARGET_HARM_NOT_CLEARED", effectiveAt, reasons, unknown, stale);
  pushEvidenceResult(source.gates.baselineIntegrity, "SOURCE_BASELINE_NOT_CLEARED", effectiveAt, reasons, unknown, stale);
  pushEvidenceResult(target.gates.baselineIntegrity, "TARGET_BASELINE_NOT_CLEARED", effectiveAt, reasons, unknown, stale);
  pushEvidenceResult(source.gates.legality, "SOURCE_LEGALITY_NOT_CLEARED", effectiveAt, reasons, unknown, stale);
  pushEvidenceResult(target.gates.legality, "TARGET_LEGALITY_NOT_CLEARED", effectiveAt, reasons, unknown, stale);
  pushEvidenceResult(source.gates.participantEligibility, "SOURCE_PARTICIPANT_NOT_ELIGIBLE", effectiveAt, reasons, unknown, stale);
  pushEvidenceResult(target.gates.participantEligibility, "TARGET_PARTICIPANT_NOT_ELIGIBLE", effectiveAt, reasons, unknown, stale);

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
