export const MORAL_TRADE_SENSITIVE_EVIDENCE_ATTESTATION_CONTRACT_VERSION =
  "moral-trade-sensitive-evidence-attestations-v0.1-2026-06";
export const MORAL_TRADE_SENSITIVE_EVIDENCE_ATTESTATION_VALIDATOR_VERSION =
  "moral-trade-sensitive-evidence-attestation-validator-v0.1";

export type MoralTradeSensitiveEvidenceAttestationTransition =
  | "evidence_review"
  | "counterparty_preview"
  | "matched_trade_lock"
  | "payment_capture"
  | "payout_release"
  | "reliance"
  | "public_metric_publication"
  | "challenge_response"
  | "release_gate_promotion";

export type MoralTradeSensitiveEvidenceAttestationSubjectType =
  | "evidence_record"
  | "impact_claim"
  | "matched_trade_lock_proposal"
  | "payout_milestone"
  | "recipient_destination"
  | "noncompensable_blocker_assessment"
  | "appeal_case"
  | "disclosure_decision";

export type MoralTradeSensitiveEvidencePathType =
  | "private_receipt"
  | "identity_artifact"
  | "legal_capacity_artifact"
  | "payment_destination_artifact"
  | "source_note"
  | "private_message"
  | "protected_trait_evidence"
  | "safety_report"
  | "reviewer_note"
  | "provider_record"
  | "raw_private_artifact";

export type MoralTradeSensitiveEvidenceAttestationClaimType =
  | "payment_receipt_verified"
  | "destination_verified"
  | "eligibility_verified"
  | "baseline_scope_verified"
  | "completion_evidence_verified"
  | "impact_evidence_verified"
  | "safety_review_non_blocking"
  | "confidentiality_review_non_blocking"
  | "uncertainty_present"
  | "manual_review";

export type MoralTradeSensitiveEvidenceAttestationResultState =
  | "draft"
  | "attested"
  | "insufficient"
  | "challenged"
  | "under_review"
  | "blocked"
  | "superseded";

export type MoralTradeSensitiveEvidenceDisclosureMode =
  | "attestation_only"
  | "counterparty_claim_typed_summary"
  | "reviewer_raw_artifact"
  | "privacy_grant_broader_disclosure"
  | "public_suppressed";

export type MoralTradeSensitiveEvidencePrivacyGrantStatus =
  | "not_required"
  | "granted_current"
  | "missing"
  | "expired"
  | "revoked"
  | "scope_mismatch";

export type MoralTradeSensitiveEvidenceConfidentialityReviewStatus =
  | "passed"
  | "not_required_for_stage"
  | "missing"
  | "under_review"
  | "failed"
  | "stale"
  | "superseded";

export type MoralTradeSensitiveEvidenceAttestationPolicyStatus =
  | "resolved_immutable"
  | "missing"
  | "mutable"
  | "stale"
  | "superseded";

export interface MoralTradeSensitiveEvidenceAttestationRecord {
  recordId: string;
  subjectType: MoralTradeSensitiveEvidenceAttestationSubjectType;
  subjectId: string;
  evidencePathType: MoralTradeSensitiveEvidencePathType;
  claimType: MoralTradeSensitiveEvidenceAttestationClaimType;
  attestationPolicyRef: string;
  policyStatus: MoralTradeSensitiveEvidenceAttestationPolicyStatus;
  rawPrivateArtifactRefHash: string | null;
  attestationResultHash: string | null;
  uncertaintyStatement: string;
  scopeStatement: string;
  challengeRoute: string;
  disclosureMode: MoralTradeSensitiveEvidenceDisclosureMode;
  privacyGrantStatus: MoralTradeSensitiveEvidencePrivacyGrantStatus;
  confidentialityReviewStatus: MoralTradeSensitiveEvidenceConfidentialityReviewStatus;
  counterpartyReceivesRawArtifact: boolean;
  publicRawArtifact: boolean;
  resultState: MoralTradeSensitiveEvidenceAttestationResultState;
  reviewerDecisionRef: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface MoralTradeSensitiveEvidenceAttestationEvaluationInput {
  transition: MoralTradeSensitiveEvidenceAttestationTransition;
  attestationRequired: boolean;
  checkedAt?: string;
  records: MoralTradeSensitiveEvidenceAttestationRecord[];
}

export interface MoralTradeSensitiveEvidenceAttestationEvaluation {
  status: "pass" | "blocked";
  transition: MoralTradeSensitiveEvidenceAttestationTransition;
  checkedAt: string;
  attestationRequired: boolean;
  reviewedRecordCount: number;
  attestedRecordCount: number;
  privacyPreservingDisclosureCount: number;
  rawArtifactDisclosureBlockerCount: number;
  blockers: string[];
  userFacingBlockerCategories: string[];
}

export interface MoralTradeSensitiveEvidenceAttestationTransitionDefinition {
  key: MoralTradeSensitiveEvidenceAttestationTransition;
  label: string;
  requiresAttestation: boolean;
  requiresPrivacyPreservingCounterpartyResult: boolean;
  userFacingBlockerCategory: string;
}

export interface MoralTradeSensitiveEvidenceAttestationCheck {
  id: string;
  label: string;
  status: "pass" | "fail";
  evidence: string;
}

export interface MoralTradeSensitiveEvidenceAttestationValidation {
  status: "pass" | "fail";
  validatorName: "moral-trade-sensitive-evidence-attestation-contract";
  validatorVersion: string;
  contractVersion: string;
  checks: MoralTradeSensitiveEvidenceAttestationCheck[];
  blockers: string[];
}

export interface MoralTradeSensitiveEvidenceAttestationContract {
  version: string;
  purpose: string;
  privacyRule: string;
  failClosedRule: string;
  attestationResultRule: string;
  rawArtifactDisclosureRule: string;
  challengeRule: string;
  firstClassRecordTables: string[];
  policySnapshotSubjects: string[];
  subjectTypes: MoralTradeSensitiveEvidenceAttestationSubjectType[];
  evidencePathTypes: MoralTradeSensitiveEvidencePathType[];
  claimTypes: MoralTradeSensitiveEvidenceAttestationClaimType[];
  disclosureModes: MoralTradeSensitiveEvidenceDisclosureMode[];
  privacyGrantStatuses: MoralTradeSensitiveEvidencePrivacyGrantStatus[];
  confidentialityReviewStatuses: MoralTradeSensitiveEvidenceConfidentialityReviewStatus[];
  resultStates: MoralTradeSensitiveEvidenceAttestationResultState[];
  policyStatuses: MoralTradeSensitiveEvidenceAttestationPolicyStatus[];
  transitionDefinitions: MoralTradeSensitiveEvidenceAttestationTransitionDefinition[];
  sampleEvaluations: MoralTradeSensitiveEvidenceAttestationEvaluation[];
  contractTests: string[];
}

const HASH_PATTERN = /^sha256:[a-f0-9]{64}$/;
const MAX_RECORD_AGE_DAYS = 120;

const FIRST_CLASS_RECORD_TABLES = [
  "moral_trade_sensitive_evidence_attestations",
] as const;

const POLICY_SNAPSHOT_SUBJECTS = ["sensitive_evidence_attestation"] as const;

const SUBJECT_TYPES: MoralTradeSensitiveEvidenceAttestationSubjectType[] = [
  "evidence_record",
  "impact_claim",
  "matched_trade_lock_proposal",
  "payout_milestone",
  "recipient_destination",
  "noncompensable_blocker_assessment",
  "appeal_case",
  "disclosure_decision",
];

const EVIDENCE_PATH_TYPES: MoralTradeSensitiveEvidencePathType[] = [
  "private_receipt",
  "identity_artifact",
  "legal_capacity_artifact",
  "payment_destination_artifact",
  "source_note",
  "private_message",
  "protected_trait_evidence",
  "safety_report",
  "reviewer_note",
  "provider_record",
  "raw_private_artifact",
];

const CLAIM_TYPES: MoralTradeSensitiveEvidenceAttestationClaimType[] = [
  "payment_receipt_verified",
  "destination_verified",
  "eligibility_verified",
  "baseline_scope_verified",
  "completion_evidence_verified",
  "impact_evidence_verified",
  "safety_review_non_blocking",
  "confidentiality_review_non_blocking",
  "uncertainty_present",
  "manual_review",
];

const DISCLOSURE_MODES: MoralTradeSensitiveEvidenceDisclosureMode[] = [
  "attestation_only",
  "counterparty_claim_typed_summary",
  "reviewer_raw_artifact",
  "privacy_grant_broader_disclosure",
  "public_suppressed",
];

const PRIVACY_GRANT_STATUSES: MoralTradeSensitiveEvidencePrivacyGrantStatus[] = [
  "not_required",
  "granted_current",
  "missing",
  "expired",
  "revoked",
  "scope_mismatch",
];

const CONFIDENTIALITY_REVIEW_STATUSES: MoralTradeSensitiveEvidenceConfidentialityReviewStatus[] = [
  "passed",
  "not_required_for_stage",
  "missing",
  "under_review",
  "failed",
  "stale",
  "superseded",
];

const RESULT_STATES: MoralTradeSensitiveEvidenceAttestationResultState[] = [
  "draft",
  "attested",
  "insufficient",
  "challenged",
  "under_review",
  "blocked",
  "superseded",
];

const POLICY_STATUSES: MoralTradeSensitiveEvidenceAttestationPolicyStatus[] = [
  "resolved_immutable",
  "missing",
  "mutable",
  "stale",
  "superseded",
];

const PRIVACY_PRESERVING_DISCLOSURE_MODES =
  new Set<MoralTradeSensitiveEvidenceDisclosureMode>([
    "attestation_only",
    "counterparty_claim_typed_summary",
    "public_suppressed",
  ]);

const TRANSITION_DEFINITIONS: MoralTradeSensitiveEvidenceAttestationTransitionDefinition[] = [
  {
    key: "evidence_review",
    label: "Evidence review",
    requiresAttestation: true,
    requiresPrivacyPreservingCounterpartyResult: false,
    userFacingBlockerCategory:
      "Sensitive evidence review records claim-typed attestation results instead of raw artifacts",
  },
  {
    key: "counterparty_preview",
    label: "Counterparty preview",
    requiresAttestation: true,
    requiresPrivacyPreservingCounterpartyResult: true,
    userFacingBlockerCategory:
      "Counterparties receive claim-typed attestation results, uncertainty, scope, and challenge routes rather than raw private artifacts",
  },
  {
    key: "matched_trade_lock",
    label: "Matched-trade lock",
    requiresAttestation: true,
    requiresPrivacyPreservingCounterpartyResult: true,
    userFacingBlockerCategory:
      "Lock waits for privacy-preserving attestations or explicit privacy grant plus confidentiality review",
  },
  {
    key: "payment_capture",
    label: "Payment capture",
    requiresAttestation: true,
    requiresPrivacyPreservingCounterpartyResult: true,
    userFacingBlockerCategory:
      "Payment capture cannot expose private receipts, provider records, or destination artifacts to counterparties without a valid grant and confidentiality review",
  },
  {
    key: "payout_release",
    label: "Payout release",
    requiresAttestation: true,
    requiresPrivacyPreservingCounterpartyResult: true,
    userFacingBlockerCategory:
      "Payout release uses claim-typed attestation and challenge routes instead of raw private evidence disclosure",
  },
  {
    key: "reliance",
    label: "Reliance",
    requiresAttestation: true,
    requiresPrivacyPreservingCounterpartyResult: true,
    userFacingBlockerCategory:
      "Reliance-bearing states require attested claim result, uncertainty, scope, and challenge route",
  },
  {
    key: "public_metric_publication",
    label: "Public metric publication",
    requiresAttestation: true,
    requiresPrivacyPreservingCounterpartyResult: true,
    userFacingBlockerCategory:
      "Public metrics may rely on attestation state and uncertainty, not raw private artifacts",
  },
  {
    key: "challenge_response",
    label: "Challenge response",
    requiresAttestation: true,
    requiresPrivacyPreservingCounterpartyResult: true,
    userFacingBlockerCategory:
      "Challenges route through scoped appeal paths with redacted evidence summaries",
  },
  {
    key: "release_gate_promotion",
    label: "Release-gate promotion",
    requiresAttestation: true,
    requiresPrivacyPreservingCounterpartyResult: true,
    userFacingBlockerCategory:
      "Release promotion requires sensitive-evidence attestation evidence and raw-artifact suppression counters",
  },
];

const CONTRACT_TESTS = [
  "sensitive_evidence_attestation_contract_validator",
  "sensitive_evidence_privacy_preserving_attestation_test",
  "sensitive_evidence_raw_artifact_disclosure_blocks",
  "sensitive_evidence_attestation_route_contract",
  "sensitive_evidence_attestation_schema_contract",
] as const;

function check(
  id: string,
  label: string,
  passed: boolean,
  evidence: string,
): MoralTradeSensitiveEvidenceAttestationCheck {
  return {
    id,
    label,
    status: passed ? "pass" : "fail",
    evidence,
  };
}

function hasMeaningfulText(value: string | null | undefined) {
  return Boolean(value && value.trim().length >= 12);
}

function isHash(value: string | null) {
  return Boolean(value && HASH_PATTERN.test(value));
}

function isValidIso(value: string) {
  return Number.isFinite(Date.parse(value));
}

function isStaleTimestamp(value: string, checkedAt: string) {
  if (!isValidIso(value) || !isValidIso(checkedAt)) {
    return true;
  }

  const maxAgeMs = MAX_RECORD_AGE_DAYS * 24 * 60 * 60 * 1000;

  return Date.parse(checkedAt) - Date.parse(value) > maxAgeMs;
}

function rawArtifactDisclosureAllowed(
  record: MoralTradeSensitiveEvidenceAttestationRecord,
) {
  return (
    record.disclosureMode === "privacy_grant_broader_disclosure" &&
    record.privacyGrantStatus === "granted_current" &&
    record.confidentialityReviewStatus === "passed"
  );
}

function evaluateRecord({
  checkedAt,
  record,
  requiresPrivacyPreservingCounterpartyResult,
}: {
  checkedAt: string;
  record: MoralTradeSensitiveEvidenceAttestationRecord;
  requiresPrivacyPreservingCounterpartyResult: boolean;
}) {
  const blockers: string[] = [];

  if (!hasMeaningfulText(record.recordId)) {
    blockers.push("sensitive_evidence_attestation_id_missing");
  }

  if (!hasMeaningfulText(record.subjectId)) {
    blockers.push(`sensitive_evidence_attestation_subject_missing:${record.recordId}`);
  }

  if (!hasMeaningfulText(record.attestationPolicyRef)) {
    blockers.push(`sensitive_evidence_attestation_policy_ref_missing:${record.recordId}`);
  }

  if (record.policyStatus !== "resolved_immutable") {
    blockers.push(
      `sensitive_evidence_attestation_policy_not_immutable:${record.recordId}:${record.policyStatus}`,
    );
  }

  if (!isHash(record.rawPrivateArtifactRefHash)) {
    blockers.push(`sensitive_evidence_raw_artifact_ref_hash_missing:${record.recordId}`);
  }

  if (!isHash(record.attestationResultHash)) {
    blockers.push(`sensitive_evidence_attestation_result_hash_missing:${record.recordId}`);
  }

  if (!hasMeaningfulText(record.uncertaintyStatement)) {
    blockers.push(`sensitive_evidence_uncertainty_missing:${record.recordId}`);
  }

  if (!hasMeaningfulText(record.scopeStatement)) {
    blockers.push(`sensitive_evidence_scope_missing:${record.recordId}`);
  }

  if (!/^\/api\/moral-trade\/challenge-appeal\/(?:evaluate|enforce|contract)$/.test(record.challengeRoute)) {
    blockers.push(`sensitive_evidence_challenge_route_missing:${record.recordId}`);
  }

  if (record.resultState !== "attested") {
    blockers.push(`sensitive_evidence_attestation_not_attested:${record.recordId}:${record.resultState}`);
  }

  if (
    requiresPrivacyPreservingCounterpartyResult &&
    !PRIVACY_PRESERVING_DISCLOSURE_MODES.has(record.disclosureMode) &&
    !rawArtifactDisclosureAllowed(record)
  ) {
    blockers.push(`sensitive_evidence_disclosure_not_privacy_preserving:${record.recordId}:${record.disclosureMode}`);
  }

  if (
    record.disclosureMode === "privacy_grant_broader_disclosure" &&
    (record.privacyGrantStatus !== "granted_current" ||
      record.confidentialityReviewStatus !== "passed")
  ) {
    blockers.push(`sensitive_evidence_privacy_grant_or_confidentiality_review_missing:${record.recordId}`);
  }

  if (
    record.counterpartyReceivesRawArtifact &&
    !rawArtifactDisclosureAllowed(record)
  ) {
    blockers.push(`sensitive_evidence_counterparty_raw_artifact_disclosure_blocked:${record.recordId}`);
  }

  if (record.publicRawArtifact) {
    blockers.push(`sensitive_evidence_public_raw_artifact_disclosure_blocked:${record.recordId}`);
  }

  if (
    record.confidentialityReviewStatus === "missing" ||
    record.confidentialityReviewStatus === "under_review" ||
    record.confidentialityReviewStatus === "failed" ||
    record.confidentialityReviewStatus === "stale" ||
    record.confidentialityReviewStatus === "superseded"
  ) {
    blockers.push(`sensitive_evidence_confidentiality_review_not_passed:${record.recordId}:${record.confidentialityReviewStatus}`);
  }

  if (!hasMeaningfulText(record.reviewerDecisionRef)) {
    blockers.push(`sensitive_evidence_reviewer_decision_missing:${record.recordId}`);
  }

  if (!isValidIso(record.createdAt)) {
    blockers.push(`sensitive_evidence_created_at_invalid:${record.recordId}`);
  }

  if (!isValidIso(record.updatedAt)) {
    blockers.push(`sensitive_evidence_updated_at_invalid:${record.recordId}`);
  } else if (isStaleTimestamp(record.updatedAt, checkedAt)) {
    blockers.push(`sensitive_evidence_attestation_stale:${record.recordId}`);
  }

  return blockers;
}

export function evaluateMoralTradeSensitiveEvidenceAttestation(
  input: MoralTradeSensitiveEvidenceAttestationEvaluationInput,
): MoralTradeSensitiveEvidenceAttestationEvaluation {
  const checkedAt = input.checkedAt ?? new Date().toISOString();
  const transitionDefinition = TRANSITION_DEFINITIONS.find(
    (definition) => definition.key === input.transition,
  );
  const attestationRequired =
    input.attestationRequired ||
    transitionDefinition?.requiresAttestation === true;
  const requiresPrivacyPreservingCounterpartyResult =
    transitionDefinition?.requiresPrivacyPreservingCounterpartyResult === true;
  const blockers: string[] = [];
  let reviewedRecordCount = 0;
  let attestedRecordCount = 0;
  let privacyPreservingDisclosureCount = 0;
  let rawArtifactDisclosureBlockerCount = 0;

  if (attestationRequired && input.records.length === 0) {
    blockers.push("sensitive_evidence_attestation_missing");
  }

  for (const record of input.records) {
    const recordBlockers = evaluateRecord({
      checkedAt,
      record,
      requiresPrivacyPreservingCounterpartyResult,
    });

    blockers.push(...recordBlockers);

    if (
      record.policyStatus === "resolved_immutable" &&
      hasMeaningfulText(record.reviewerDecisionRef)
    ) {
      reviewedRecordCount += 1;
    }

    if (record.resultState === "attested" && recordBlockers.length === 0) {
      attestedRecordCount += 1;
    }

    if (
      PRIVACY_PRESERVING_DISCLOSURE_MODES.has(record.disclosureMode) &&
      !record.counterpartyReceivesRawArtifact &&
      !record.publicRawArtifact
    ) {
      privacyPreservingDisclosureCount += 1;
    }

    if (
      recordBlockers.some((blocker) =>
        /raw_artifact|privacy_grant_or_confidentiality/.test(blocker),
      )
    ) {
      rawArtifactDisclosureBlockerCount += 1;
    }
  }

  if (
    attestationRequired &&
    input.records.length > 0 &&
    attestedRecordCount === 0
  ) {
    blockers.push("sensitive_evidence_attested_result_missing");
  }

  return {
    status: blockers.length ? "blocked" : "pass",
    transition: input.transition,
    checkedAt,
    attestationRequired,
    reviewedRecordCount,
    attestedRecordCount,
    privacyPreservingDisclosureCount,
    rawArtifactDisclosureBlockerCount,
    blockers,
    userFacingBlockerCategories: Array.from(
      new Set(
        blockers.map((blocker) =>
          blocker.includes("raw_artifact") ||
          blocker.includes("privacy_grant_or_confidentiality")
            ? "Raw private artifacts require an explicit current privacy grant and passed confidentiality review before broader disclosure"
            : blocker.includes("uncertainty")
              ? "Sensitive evidence attestations must include uncertainty"
              : blocker.includes("scope")
                ? "Sensitive evidence attestations must state the claim scope"
                : blocker.includes("challenge_route")
                  ? "Sensitive evidence attestations must name a challenge route"
                  : blocker.includes("policy")
                    ? "Sensitive evidence attestation policy is not frozen"
                    : "Sensitive evidence attestation is incomplete or not attested",
        ),
      ),
    ),
  };
}

function sampleRecord(
  overrides: Partial<MoralTradeSensitiveEvidenceAttestationRecord> = {},
): MoralTradeSensitiveEvidenceAttestationRecord {
  return {
    recordId: "sensitive-evidence-attestation:demo",
    subjectType: "evidence_record",
    subjectId: "evidence-record:demo",
    evidencePathType: "private_receipt",
    claimType: "payment_receipt_verified",
    attestationPolicyRef: "policy-snapshot:sensitive-evidence-attestation-v1",
    policyStatus: "resolved_immutable",
    rawPrivateArtifactRefHash:
      "sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    attestationResultHash:
      "sha256:bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
    uncertaintyStatement:
      "Receipt authenticity is high confidence but limited to the named payment event.",
    scopeStatement:
      "Attestation covers payment-receipt verification for the named matched trade only.",
    challengeRoute: "/api/moral-trade/challenge-appeal/evaluate",
    disclosureMode: "counterparty_claim_typed_summary",
    privacyGrantStatus: "not_required",
    confidentialityReviewStatus: "passed",
    counterpartyReceivesRawArtifact: false,
    publicRawArtifact: false,
    resultState: "attested",
    reviewerDecisionRef: "review-decision:sensitive-evidence-attestation",
    createdAt: "2026-06-01T00:00:00.000Z",
    updatedAt: "2026-06-12T00:00:00.000Z",
    ...overrides,
  };
}

export function getMoralTradeSensitiveEvidenceAttestationContract(): MoralTradeSensitiveEvidenceAttestationContract {
  return {
    version: MORAL_TRADE_SENSITIVE_EVIDENCE_ATTESTATION_CONTRACT_VERSION,
    purpose:
      "Fail-closed sensitive-evidence attestation governance for privacy-preserving verification results before counterparties, locks, money movement, reliance, public metrics, challenges, or release gates can depend on private artifacts.",
    privacyRule:
      "Counterparties receive claim-typed attestation results, uncertainty, scope, and challenge routes rather than raw private artifacts. Public contract responses expose only static rules, table names, enums, validation blockers, and sample pass/block states.",
    failClosedRule:
      "Missing attestation records, mutable policy, missing raw-artifact reference hashes, missing attestation result hashes, missing uncertainty, missing scope, missing challenge route, non-attested results, stale records, or raw private artifact disclosure without an explicit current privacy grant and passed confidentiality review block lock, capture, payout, reliance, public metrics, challenge response, and release promotion.",
    attestationResultRule:
      "Sensitive evidence paths must produce claim-typed attestation results with uncertainty and scope statements before counterparties can rely on them.",
    rawArtifactDisclosureRule:
      "Raw private artifacts cannot be sent to counterparties unless disclosure mode is privacy_grant_broader_disclosure, the privacy grant is current, and confidentiality review has passed. Public raw artifact disclosure is always blocked.",
    challengeRule:
      "Every counterparty-facing attestation names a scoped challenge route under /api/moral-trade/challenge-appeal so the recipient can dispute the claim type, uncertainty, or scope without receiving raw artifacts.",
    firstClassRecordTables: [...FIRST_CLASS_RECORD_TABLES],
    policySnapshotSubjects: [...POLICY_SNAPSHOT_SUBJECTS],
    subjectTypes: [...SUBJECT_TYPES],
    evidencePathTypes: [...EVIDENCE_PATH_TYPES],
    claimTypes: [...CLAIM_TYPES],
    disclosureModes: [...DISCLOSURE_MODES],
    privacyGrantStatuses: [...PRIVACY_GRANT_STATUSES],
    confidentialityReviewStatuses: [...CONFIDENTIALITY_REVIEW_STATUSES],
    resultStates: [...RESULT_STATES],
    policyStatuses: [...POLICY_STATUSES],
    transitionDefinitions: TRANSITION_DEFINITIONS.map((definition) => ({
      ...definition,
    })),
    sampleEvaluations: [
      evaluateMoralTradeSensitiveEvidenceAttestation({
        transition: "counterparty_preview",
        attestationRequired: true,
        checkedAt: "2026-06-12T00:00:00.000Z",
        records: [sampleRecord()],
      }),
      evaluateMoralTradeSensitiveEvidenceAttestation({
        transition: "matched_trade_lock",
        attestationRequired: true,
        checkedAt: "2026-06-12T00:00:00.000Z",
        records: [
          sampleRecord({
            recordId: "sensitive-evidence-attestation:raw-demo",
            disclosureMode: "reviewer_raw_artifact",
            privacyGrantStatus: "missing",
            confidentialityReviewStatus: "under_review",
            counterpartyReceivesRawArtifact: true,
            resultState: "under_review",
            reviewerDecisionRef: null,
          }),
        ],
      }),
    ],
    contractTests: [...CONTRACT_TESTS],
  };
}

function hasAll(values: readonly string[], required: readonly string[]) {
  return required.every((entry) => values.includes(entry));
}

export function validateMoralTradeSensitiveEvidenceAttestationContract(
  contract: MoralTradeSensitiveEvidenceAttestationContract =
    getMoralTradeSensitiveEvidenceAttestationContract(),
): MoralTradeSensitiveEvidenceAttestationValidation {
  const checks = [
    check(
      "first-class-record-table",
      "Contract names sensitive-evidence attestation records",
      contract.firstClassRecordTables.includes(
        "moral_trade_sensitive_evidence_attestations",
      ),
      contract.firstClassRecordTables.join(", "),
    ),
    check(
      "policy-snapshot-subject",
      "Contract names sensitive_evidence_attestation policy snapshots",
      contract.policySnapshotSubjects.includes("sensitive_evidence_attestation"),
      contract.policySnapshotSubjects.join(", "),
    ),
    check(
      "claim-type-coverage",
      "Contract covers payment, destination, eligibility, baseline, completion, impact, safety, confidentiality, uncertainty, and manual-review claims",
      hasAll(contract.claimTypes, CLAIM_TYPES),
      contract.claimTypes.join(", "),
    ),
    check(
      "privacy-rule",
      "Contract requires claim-typed attestation results, uncertainty, scope, and challenge routes instead of raw artifacts",
      /claim-typed/i.test(contract.privacyRule) &&
        /uncertainty/i.test(contract.privacyRule) &&
        /scope/i.test(contract.privacyRule) &&
        /challenge routes/i.test(contract.privacyRule) &&
        /raw private artifacts/i.test(contract.privacyRule),
      contract.privacyRule,
    ),
    check(
      "raw-artifact-disclosure-rule",
      "Raw-artifact disclosure requires current privacy grant and passed confidentiality review",
      /privacy grant is current/i.test(contract.rawArtifactDisclosureRule) &&
        /confidentiality review has passed/i.test(contract.rawArtifactDisclosureRule) &&
        /Public raw artifact disclosure is always blocked/i.test(
          contract.rawArtifactDisclosureRule,
        ),
      contract.rawArtifactDisclosureRule,
    ),
    check(
      "transition-coverage",
      "Contract gates counterparty preview, lock, capture, payout, reliance, public metrics, challenges, and release promotion",
      [
        "counterparty_preview",
        "matched_trade_lock",
        "payment_capture",
        "payout_release",
        "reliance",
        "public_metric_publication",
        "challenge_response",
        "release_gate_promotion",
      ].every((transition) =>
        contract.transitionDefinitions.some(
          (definition) =>
            definition.key === transition &&
            definition.requiresAttestation &&
            definition.requiresPrivacyPreservingCounterpartyResult,
        ),
      ),
      contract.transitionDefinitions
        .filter((definition) => definition.requiresAttestation)
        .map((definition) => definition.key)
        .join(", "),
    ),
    check(
      "sample-evaluation-coverage",
      "Contract includes passing and blocked sample evaluations",
      contract.sampleEvaluations.some((evaluation) => evaluation.status === "pass") &&
        contract.sampleEvaluations.some((evaluation) => evaluation.status === "blocked"),
      contract.sampleEvaluations
        .map((evaluation) => `${evaluation.transition}:${evaluation.status}`)
        .join(", "),
    ),
    check(
      "contract-test-coverage",
      "Contract lists validator, privacy-preserving, raw-disclosure, route, and schema tests",
      hasAll(contract.contractTests, CONTRACT_TESTS),
      contract.contractTests.join(", "),
    ),
  ];
  const blockers = checks
    .filter((entry) => entry.status === "fail")
    .map((entry) => `${entry.id}:${entry.label}`);

  return {
    status: blockers.length ? "fail" : "pass",
    validatorName: "moral-trade-sensitive-evidence-attestation-contract",
    validatorVersion: MORAL_TRADE_SENSITIVE_EVIDENCE_ATTESTATION_VALIDATOR_VERSION,
    contractVersion: contract.version,
    checks,
    blockers,
  };
}

const moralTradeSensitiveEvidenceAttestations = {
  evaluateMoralTradeSensitiveEvidenceAttestation,
  getMoralTradeSensitiveEvidenceAttestationContract,
  validateMoralTradeSensitiveEvidenceAttestationContract,
};

export default moralTradeSensitiveEvidenceAttestations;
