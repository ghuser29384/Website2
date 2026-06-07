export const MORAL_TRADE_PARTICIPANT_CONFIRMATION_CONTRACT_VERSION =
  "moral-trade-participant-confirmations-v0.1-2026-06";
export const MORAL_TRADE_PARTICIPANT_CONFIRMATION_VALIDATOR_VERSION =
  "moral-trade-participant-confirmation-validator-v0.1";

export type MoralTradeParticipantConfirmationSubjectType =
  | "common_ground_budget"
  | "marketplace_round"
  | "matched_trade_lock_proposal"
  | "cleared_trade_agreement"
  | "agreement_amendment_record"
  | "project_set_change"
  | "payment_capture"
  | "payout_release"
  | "privacy_grant"
  | "exposure_increase";

export type MoralTradeParticipantConfirmationScope =
  | "budget_activation"
  | "round_lock"
  | "final_lock"
  | "cleared_agreement"
  | "renewed_material_change"
  | "project_set_change_approval"
  | "payment_capture"
  | "payout_release"
  | "privacy_disclosure"
  | "exposure_increase";

export type MoralTradeParticipantConfirmationStatus =
  | "recorded"
  | "draft"
  | "missing"
  | "expired"
  | "revoked"
  | "superseded"
  | "stale";

export type MoralTradeConsentQualityStatus =
  | "passed"
  | "not_required_for_stage"
  | "missing"
  | "failed"
  | "stale"
  | "under_review";

export type MoralTradeNoticeRecordStatus =
  | "delivered"
  | "not_required_for_stage"
  | "missing"
  | "failed"
  | "stale";

export interface MoralTradeParticipantConfirmationRecord {
  subjectType: MoralTradeParticipantConfirmationSubjectType;
  subjectId: string;
  participantId: string;
  confirmationScope: MoralTradeParticipantConfirmationScope;
  confirmationStatus: MoralTradeParticipantConfirmationStatus;
  confirmationHash: string;
  baselineHash: string;
  termsSnapshotHash: string;
  policySnapshotBundleHash: string;
  maximumExposureCents: number;
  currency: string;
  noticeRecordStatus: MoralTradeNoticeRecordStatus;
  consentQualityStatus: MoralTradeConsentQualityStatus;
  consentQualityRequired: boolean;
  eligibleSetHash: string | null;
  fallbackPolicyHash: string | null;
  supersedesConfirmationHash: string | null;
  materialTermsChangedAfterConfirmation: boolean;
  recordedAt: string;
  expiresAt: string | null;
}

export interface MoralTradeParticipantConfirmationEvaluation {
  status: "pass" | "blocked";
  subjectType: MoralTradeParticipantConfirmationSubjectType;
  confirmationScope: MoralTradeParticipantConfirmationScope;
  canAuthorizeRouting: boolean;
  canAuthorizeClearing: boolean;
  canAuthorizeCapture: boolean;
  canAuthorizePayoutRelease: boolean;
  canAuthorizePrivacyDisclosure: boolean;
  canAuthorizeMaterialChange: boolean;
  blockers: string[];
  checkedAt: string;
}

export interface MoralTradeParticipantConfirmationCheck {
  id: string;
  label: string;
  status: "pass" | "fail";
  evidence: string;
}

export interface MoralTradeParticipantConfirmationValidation {
  status: "pass" | "fail";
  validatorName: "moral-trade-participant-confirmation-contract";
  validatorVersion: string;
  contractVersion: string;
  checks: MoralTradeParticipantConfirmationCheck[];
  blockers: string[];
}

export interface MoralTradeParticipantConfirmationContract {
  version: string;
  purpose: string;
  firstClassRecordTables: string[];
  subjectTypes: MoralTradeParticipantConfirmationSubjectType[];
  confirmationScopes: MoralTradeParticipantConfirmationScope[];
  failClosedStatuses: MoralTradeParticipantConfirmationStatus[];
  consentQualityStatuses: MoralTradeConsentQualityStatus[];
  noticeRecordStatuses: MoralTradeNoticeRecordStatus[];
  requiredHashFields: Array<keyof Pick<
    MoralTradeParticipantConfirmationRecord,
    "baselineHash" | "confirmationHash" | "policySnapshotBundleHash" | "termsSnapshotHash"
  >>;
  highRiskScopesRequiringConsentQuality: MoralTradeParticipantConfirmationScope[];
  eligibleSetScopes: MoralTradeParticipantConfirmationScope[];
  sampleEvaluations: MoralTradeParticipantConfirmationEvaluation[];
  contractTests: string[];
}

const HASH_PATTERN = /^sha256:[a-f0-9]{64}$/;
const UUID_OR_SYNTHETIC_ID_PATTERN = /^[a-z0-9][a-z0-9:_-]{2,}$/i;
const MAX_CONFIRMATION_AGE_MS = 1000 * 60 * 60 * 24 * 180;

const SUBJECT_TYPES: MoralTradeParticipantConfirmationSubjectType[] = [
  "common_ground_budget",
  "marketplace_round",
  "matched_trade_lock_proposal",
  "cleared_trade_agreement",
  "agreement_amendment_record",
  "project_set_change",
  "payment_capture",
  "payout_release",
  "privacy_grant",
  "exposure_increase",
];

const CONFIRMATION_SCOPES: MoralTradeParticipantConfirmationScope[] = [
  "budget_activation",
  "round_lock",
  "final_lock",
  "cleared_agreement",
  "renewed_material_change",
  "project_set_change_approval",
  "payment_capture",
  "payout_release",
  "privacy_disclosure",
  "exposure_increase",
];

const FAIL_CLOSED_STATUSES: MoralTradeParticipantConfirmationStatus[] = [
  "draft",
  "missing",
  "expired",
  "revoked",
  "superseded",
  "stale",
];

const CONSENT_QUALITY_STATUSES: MoralTradeConsentQualityStatus[] = [
  "passed",
  "not_required_for_stage",
  "missing",
  "failed",
  "stale",
  "under_review",
];

const NOTICE_RECORD_STATUSES: MoralTradeNoticeRecordStatus[] = [
  "delivered",
  "not_required_for_stage",
  "missing",
  "failed",
  "stale",
];

const HIGH_RISK_SCOPES_REQUIRING_CONSENT_QUALITY: MoralTradeParticipantConfirmationScope[] = [
  "final_lock",
  "cleared_agreement",
  "renewed_material_change",
  "payment_capture",
  "payout_release",
  "privacy_disclosure",
  "exposure_increase",
];

const ELIGIBLE_SET_SCOPES: MoralTradeParticipantConfirmationScope[] = [
  "budget_activation",
  "round_lock",
  "project_set_change_approval",
];

const CONTRACT_TESTS = [
  "participant_confirmation_contract_validator",
  "participant_confirmation_missing_stale_expired_block",
  "participant_confirmation_hash_snapshot_binding",
  "participant_confirmation_consent_quality_required_for_high_risk",
  "participant_confirmation_project_set_reconfirmation",
  "participant_confirmation_api_route_contract",
] as const;

function check(
  id: string,
  label: string,
  passed: boolean,
  evidence: string,
): MoralTradeParticipantConfirmationCheck {
  return {
    id,
    label,
    status: passed ? "pass" : "fail",
    evidence,
  };
}

function isFreshRecordedAt(value: string) {
  const timestamp = Date.parse(value);

  return Number.isFinite(timestamp) && Date.now() - timestamp <= MAX_CONFIRMATION_AGE_MS;
}

function isFutureOrNull(value: string | null) {
  if (value === null) {
    return true;
  }

  const timestamp = Date.parse(value);

  return Number.isFinite(timestamp) && timestamp > Date.now();
}

function isHash(value: string) {
  return HASH_PATTERN.test(value);
}

function makeHash(seed: string) {
  return `sha256:${seed.padEnd(64, "0").slice(0, 64)}`;
}

function makeSampleRecord(
  overrides: Partial<MoralTradeParticipantConfirmationRecord> = {},
): MoralTradeParticipantConfirmationRecord {
  return {
    subjectType: "matched_trade_lock_proposal",
    subjectId: "proposal:demo-final-lock",
    participantId: "profile:demo-participant",
    confirmationScope: "final_lock",
    confirmationStatus: "recorded",
    confirmationHash: makeHash("a"),
    baselineHash: makeHash("b"),
    termsSnapshotHash: makeHash("c"),
    policySnapshotBundleHash: makeHash("d"),
    maximumExposureCents: 25000,
    currency: "usd",
    noticeRecordStatus: "delivered",
    consentQualityStatus: "passed",
    consentQualityRequired: true,
    eligibleSetHash: null,
    fallbackPolicyHash: makeHash("e"),
    supersedesConfirmationHash: null,
    materialTermsChangedAfterConfirmation: false,
    recordedAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 14).toISOString(),
    ...overrides,
  };
}

export function evaluateMoralTradeParticipantConfirmation(
  record: MoralTradeParticipantConfirmationRecord,
): MoralTradeParticipantConfirmationEvaluation {
  const blockers: string[] = [];

  if (!SUBJECT_TYPES.includes(record.subjectType)) {
    blockers.push(`unknown_subject_type:${record.subjectType}`);
  }

  if (!CONFIRMATION_SCOPES.includes(record.confirmationScope)) {
    blockers.push(`unknown_confirmation_scope:${record.confirmationScope}`);
  }

  if (!UUID_OR_SYNTHETIC_ID_PATTERN.test(record.subjectId)) {
    blockers.push("invalid_subject_id");
  }

  if (!UUID_OR_SYNTHETIC_ID_PATTERN.test(record.participantId)) {
    blockers.push("invalid_participant_id");
  }

  if (record.confirmationStatus !== "recorded") {
    blockers.push(`confirmation_not_recorded:${record.confirmationStatus}`);
  }

  for (const field of [
    "confirmationHash",
    "baselineHash",
    "termsSnapshotHash",
    "policySnapshotBundleHash",
  ] as const) {
    if (!isHash(record[field])) {
      blockers.push(`invalid_or_missing_hash:${field}`);
    }
  }

  if (record.maximumExposureCents < 0 || !Number.isInteger(record.maximumExposureCents)) {
    blockers.push("invalid_maximum_exposure");
  }

  if (!/^[a-z]{3}$/.test(record.currency)) {
    blockers.push(`invalid_currency:${record.currency}`);
  }

  if (!["delivered", "not_required_for_stage"].includes(record.noticeRecordStatus)) {
    blockers.push(`notice_not_non_blocking:${record.noticeRecordStatus}`);
  }

  if (record.consentQualityRequired && record.consentQualityStatus !== "passed") {
    blockers.push(`consent_quality_not_passed:${record.consentQualityStatus}`);
  }

  if (
    HIGH_RISK_SCOPES_REQUIRING_CONSENT_QUALITY.includes(record.confirmationScope) &&
    !record.consentQualityRequired
  ) {
    blockers.push(`consent_quality_required_for_scope:${record.confirmationScope}`);
  }

  if (ELIGIBLE_SET_SCOPES.includes(record.confirmationScope) && !isHash(record.eligibleSetHash ?? "")) {
    blockers.push(`eligible_set_hash_required:${record.confirmationScope}`);
  }

  if (
    record.confirmationScope === "renewed_material_change" &&
    !isHash(record.supersedesConfirmationHash ?? "")
  ) {
    blockers.push("renewed_confirmation_must_supersede_prior_hash");
  }

  if (record.materialTermsChangedAfterConfirmation) {
    blockers.push("material_terms_changed_after_confirmation");
  }

  if (!isFreshRecordedAt(record.recordedAt)) {
    blockers.push("confirmation_record_stale_or_invalid_recorded_at");
  }

  if (!isFutureOrNull(record.expiresAt)) {
    blockers.push("confirmation_expired");
  }

  const passed = blockers.length === 0;

  return {
    status: passed ? "pass" : "blocked",
    subjectType: record.subjectType,
    confirmationScope: record.confirmationScope,
    canAuthorizeRouting:
      passed &&
      ["budget_activation", "round_lock", "project_set_change_approval"].includes(
        record.confirmationScope,
      ),
    canAuthorizeClearing:
      passed && ["final_lock", "cleared_agreement"].includes(record.confirmationScope),
    canAuthorizeCapture: passed && record.confirmationScope === "payment_capture",
    canAuthorizePayoutRelease: passed && record.confirmationScope === "payout_release",
    canAuthorizePrivacyDisclosure: passed && record.confirmationScope === "privacy_disclosure",
    canAuthorizeMaterialChange: passed && record.confirmationScope === "renewed_material_change",
    blockers,
    checkedAt: new Date().toISOString(),
  };
}

export function getMoralTradeParticipantConfirmationContract(): MoralTradeParticipantConfirmationContract {
  return {
    version: MORAL_TRADE_PARTICIPANT_CONFIRMATION_CONTRACT_VERSION,
    purpose:
      "Public contract for first-class participant confirmation records: confirmations bind a participant to a frozen baseline, terms snapshot, policy snapshot bundle, maximum exposure, notice state, consent-quality state, eligible-set/fallback hashes where relevant, and a narrow confirmation scope before routing, clearing, capture, payout release, privacy disclosure, or material-term changes can proceed.",
    firstClassRecordTables: [
      "moral_trade_participant_confirmation_records",
      "moral_trade_consent_quality_records",
    ],
    subjectTypes: SUBJECT_TYPES,
    confirmationScopes: CONFIRMATION_SCOPES,
    failClosedStatuses: FAIL_CLOSED_STATUSES,
    consentQualityStatuses: CONSENT_QUALITY_STATUSES,
    noticeRecordStatuses: NOTICE_RECORD_STATUSES,
    requiredHashFields: [
      "baselineHash",
      "confirmationHash",
      "policySnapshotBundleHash",
      "termsSnapshotHash",
    ],
    highRiskScopesRequiringConsentQuality: HIGH_RISK_SCOPES_REQUIRING_CONSENT_QUALITY,
    eligibleSetScopes: ELIGIBLE_SET_SCOPES,
    sampleEvaluations: [
      evaluateMoralTradeParticipantConfirmation(makeSampleRecord()),
      evaluateMoralTradeParticipantConfirmation(
        makeSampleRecord({
          confirmationStatus: "expired",
          confirmationScope: "payment_capture",
          consentQualityStatus: "missing",
          noticeRecordStatus: "failed",
          expiresAt: new Date(Date.now() - 1000 * 60).toISOString(),
        }),
      ),
    ],
    contractTests: [...CONTRACT_TESTS],
  };
}

export function validateMoralTradeParticipantConfirmationContract(
  contract: MoralTradeParticipantConfirmationContract =
    getMoralTradeParticipantConfirmationContract(),
): MoralTradeParticipantConfirmationValidation {
  const passingSample = contract.sampleEvaluations[0];
  const blockedSample = contract.sampleEvaluations[1];
  const checks = [
    check(
      "subject-scope-coverage",
      "Subjects and scopes cover budget activation, lock, cleared agreement, amendments, money movement, privacy grants, and exposure increases",
      [
        "common_ground_budget",
        "matched_trade_lock_proposal",
        "cleared_trade_agreement",
        "agreement_amendment_record",
        "payment_capture",
        "payout_release",
        "privacy_grant",
        "exposure_increase",
      ].every((subject) =>
        contract.subjectTypes.includes(subject as MoralTradeParticipantConfirmationSubjectType),
      ) &&
        [
          "budget_activation",
          "round_lock",
          "final_lock",
          "cleared_agreement",
          "renewed_material_change",
          "payment_capture",
          "payout_release",
          "privacy_disclosure",
          "exposure_increase",
        ].every((scope) =>
          contract.confirmationScopes.includes(scope as MoralTradeParticipantConfirmationScope),
        ),
      `${contract.subjectTypes.length} subject(s), ${contract.confirmationScopes.length} scope(s).`,
    ),
    check(
      "first-class-record-tables",
      "Confirmation and consent-quality records are first-class tables",
      contract.firstClassRecordTables.includes("moral_trade_participant_confirmation_records") &&
        contract.firstClassRecordTables.includes("moral_trade_consent_quality_records"),
      contract.firstClassRecordTables.join(", "),
    ),
    check(
      "required-hash-binding",
      "Confirmations require frozen baseline, terms, policy bundle, and confirmation hashes",
      ["baselineHash", "confirmationHash", "policySnapshotBundleHash", "termsSnapshotHash"].every(
        (field) =>
          contract.requiredHashFields.includes(
            field as MoralTradeParticipantConfirmationContract["requiredHashFields"][number],
          ),
      ),
      contract.requiredHashFields.join(", "),
    ),
    check(
      "fail-closed-statuses",
      "Draft, missing, expired, revoked, superseded, and stale confirmations fail closed",
      ["draft", "missing", "expired", "revoked", "superseded", "stale"].every((status) =>
        contract.failClosedStatuses.includes(status as MoralTradeParticipantConfirmationStatus),
      ),
      contract.failClosedStatuses.join(", "),
    ),
    check(
      "consent-quality-coverage",
      "High-risk scopes require consent-quality checks",
      [
        "final_lock",
        "cleared_agreement",
        "renewed_material_change",
        "payment_capture",
        "payout_release",
        "privacy_disclosure",
        "exposure_increase",
      ].every((scope) =>
        contract.highRiskScopesRequiringConsentQuality.includes(
          scope as MoralTradeParticipantConfirmationScope,
        ),
      ) && contract.consentQualityStatuses.includes("under_review"),
      contract.highRiskScopesRequiringConsentQuality.join(", "),
    ),
    check(
      "eligible-set-scope-coverage",
      "Budget activation, round lock, and project-set changes require eligible-set hashes",
      ["budget_activation", "round_lock", "project_set_change_approval"].every((scope) =>
        contract.eligibleSetScopes.includes(scope as MoralTradeParticipantConfirmationScope),
      ),
      contract.eligibleSetScopes.join(", "),
    ),
    check(
      "sample-pass-and-block",
      "Samples include one passing final-lock record and one blocked stale/expired money-movement record",
      passingSample?.status === "pass" &&
        passingSample.canAuthorizeClearing &&
        blockedSample?.status === "blocked" &&
        blockedSample.blockers.some((blocker) => blocker.includes("confirmation_not_recorded")) &&
        blockedSample.blockers.some((blocker) => blocker.includes("confirmation_expired")),
      contract.sampleEvaluations
        .map((evaluation) => `${evaluation.confirmationScope}:${evaluation.status}`)
        .join(", "),
    ),
    check(
      "contract-tests",
      "Contract test hooks are named",
      [...CONTRACT_TESTS].every((key) => contract.contractTests.includes(key)),
      contract.contractTests.join(", "),
    ),
  ];
  const blockers = checks
    .filter((entry) => entry.status === "fail")
    .map((entry) => `${entry.id}: ${entry.label}`);

  return {
    status: blockers.length ? "fail" : "pass",
    validatorName: "moral-trade-participant-confirmation-contract",
    validatorVersion: MORAL_TRADE_PARTICIPANT_CONFIRMATION_VALIDATOR_VERSION,
    contractVersion: contract.version,
    checks,
    blockers,
  };
}

const moralTradeParticipantConfirmations = {
  evaluateMoralTradeParticipantConfirmation,
  getMoralTradeParticipantConfirmationContract,
  validateMoralTradeParticipantConfirmationContract,
};

export default moralTradeParticipantConfirmations;
