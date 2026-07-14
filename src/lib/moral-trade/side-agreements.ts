export const MORAL_TRADE_SIDE_AGREEMENTS_CONTRACT_VERSION =
  "moral-trade-side-agreements-v0.2-2026-06";
export const MORAL_TRADE_SIDE_AGREEMENTS_VALIDATOR_VERSION =
  "moral-trade-side-agreements-validator-v0.1";

export type MoralTradeSideAgreementTransition =
  | "draft_preview"
  | "matched_trade_lock"
  | "payment_capture"
  | "payout_release"
  | "public_completion_claim"
  | "challenge_decision"
  | "release_gate_promotion";

export type MoralTradeSideAgreementSubjectType =
  | "donation_offset"
  | "pledge_swap"
  | "compensated_moral_action"
  | "performance_bond"
  | "evidence_term"
  | "challenge_term"
  | "recipient_choice"
  | "common_ground_budget"
  | "public_goods_round";

export type MoralTradeSideAgreementDisclosureStatus =
  | "none_declared"
  | "disclosed"
  | "under_review"
  | "non_blocking"
  | "blocked"
  | "missing"
  | "stale"
  | "superseded";

export type MoralTradeSideAgreementReviewDimension =
  | "collusion"
  | "externality"
  | "legal_jurisdiction"
  | "anti_threat"
  | "reporting_integrity"
  | "civil_rights_discrimination"
  | "participant_autonomy"
  | "confidentiality_privacy_rights"
  | "financial_crime_fraud"
  | "anti_corruption"
  | "representative_authority";

export type MoralTradeSideAgreementReviewStatus =
  | "passed"
  | "not_required_for_stage"
  | "missing"
  | "under_review"
  | "failed"
  | "blocked"
  | "stale"
  | "superseded";

export type MoralTradeSideAgreementNoticeStatus =
  | "sent"
  | "not_required_for_stage"
  | "missing"
  | "failed"
  | "stale";

export type MoralTradeSideAgreementPolicySnapshotStatus =
  | "resolved_immutable"
  | "missing"
  | "mutable"
  | "stale"
  | "superseded";

export interface MoralTradeSideAgreementDisclosureRecord {
  disclosureId: string;
  subjectType: MoralTradeSideAgreementSubjectType;
  subjectRef: string;
  sideAgreementPresent: boolean;
  disclosureStatus: MoralTradeSideAgreementDisclosureStatus;
  publicSafeSummary: string;
  privateDetailsRedacted: boolean;
  participantNoticeStatus: MoralTradeSideAgreementNoticeStatus;
  policySnapshotStatus: MoralTradeSideAgreementPolicySnapshotStatus;
  disclosureHash: string;
  reviewedAt: string;
  expiresAt: string | null;
  supersededBy: string | null;
  reviewStatuses: Record<
    MoralTradeSideAgreementReviewDimension,
    MoralTradeSideAgreementReviewStatus
  >;
}

export interface MoralTradeSideAgreementTransitionDefinition {
  key: MoralTradeSideAgreementTransition;
  label: string;
  requiresDisclosureRecord: boolean;
  requiresNonBlockingReviews: boolean;
  userFacingBlockerCategory: string;
}

export interface MoralTradeSideAgreementEvaluationInput {
  transition: MoralTradeSideAgreementTransition;
  checkedAt?: string;
  disclosures: MoralTradeSideAgreementDisclosureRecord[];
}

export interface MoralTradeSideAgreementEvaluation {
  status: "pass" | "blocked";
  transition: MoralTradeSideAgreementTransition;
  checkedAt: string;
  requiredDisclosureCount: number;
  passingDisclosureCount: number;
  blockers: string[];
  userFacingBlockerCategories: string[];
}

export interface MoralTradeSideAgreementCheck {
  id: string;
  label: string;
  status: "pass" | "fail";
  evidence: string;
}

export interface MoralTradeSideAgreementValidation {
  status: "pass" | "fail";
  validatorName: "moral-trade-side-agreements-contract";
  validatorVersion: string;
  contractVersion: string;
  checks: MoralTradeSideAgreementCheck[];
  blockers: string[];
}

export interface MoralTradeSideAgreementContract {
  version: string;
  purpose: string;
  failClosedRule: string;
  firstClassRecordTables: string[];
  policySnapshotSubjects: string[];
  subjectTypes: MoralTradeSideAgreementSubjectType[];
  reviewDimensions: MoralTradeSideAgreementReviewDimension[];
  failClosedStatuses: Array<
    MoralTradeSideAgreementDisclosureStatus | MoralTradeSideAgreementReviewStatus
  >;
  forbiddenPublicSummaryTerms: string[];
  transitionDefinitions: MoralTradeSideAgreementTransitionDefinition[];
  sampleEvaluations: MoralTradeSideAgreementEvaluation[];
  contractTests: string[];
}

const HASH_PATTERN = /^sha256:[a-f0-9]{64}$/;
const MAX_REVIEW_AGE_DAYS = 180;

const FIRST_CLASS_RECORD_TABLES = [
  "moral_trade_side_agreement_disclosures",
  "moral_trade_side_agreement_reviews",
  "moral_trade_side_agreement_enforcement_records",
] as const;

const POLICY_SNAPSHOT_SUBJECTS = [
  "side_agreement_disclosure",
  "side_agreement_review",
] as const;

const SUBJECT_TYPES: MoralTradeSideAgreementSubjectType[] = [
  "donation_offset",
  "pledge_swap",
  "compensated_moral_action",
  "performance_bond",
  "evidence_term",
  "challenge_term",
  "recipient_choice",
  "common_ground_budget",
  "public_goods_round",
];

const REVIEW_DIMENSIONS: MoralTradeSideAgreementReviewDimension[] = [
  "collusion",
  "externality",
  "legal_jurisdiction",
  "anti_threat",
  "reporting_integrity",
  "civil_rights_discrimination",
  "participant_autonomy",
  "confidentiality_privacy_rights",
  "financial_crime_fraud",
  "anti_corruption",
  "representative_authority",
];

const FAIL_CLOSED_STATUSES = [
  "missing",
  "under_review",
  "failed",
  "blocked",
  "stale",
  "superseded",
] as const;

const FORBIDDEN_PUBLIC_SUMMARY_TERMS = [
  "reviewer notes",
  "source hash",
  "provider payload",
  "raw evidence",
  "private message",
  "contact details",
  "exact counterparty",
  "bank account",
  "wallet address",
] as const;

const TRANSITION_DEFINITIONS: MoralTradeSideAgreementTransitionDefinition[] = [
  {
    key: "draft_preview",
    label: "Draft preview",
    requiresDisclosureRecord: false,
    requiresNonBlockingReviews: false,
    userFacingBlockerCategory: "Side-agreement disclosure is preview-only",
  },
  {
    key: "matched_trade_lock",
    label: "Matched-trade lock",
    requiresDisclosureRecord: true,
    requiresNonBlockingReviews: true,
    userFacingBlockerCategory:
      "Side agreement disclosure needs review before lock",
  },
  {
    key: "payment_capture",
    label: "Payment capture",
    requiresDisclosureRecord: true,
    requiresNonBlockingReviews: true,
    userFacingBlockerCategory:
      "Side agreement disclosure needs review before payment",
  },
  {
    key: "payout_release",
    label: "Payout release",
    requiresDisclosureRecord: true,
    requiresNonBlockingReviews: true,
    userFacingBlockerCategory:
      "Side agreement disclosure needs review before payout",
  },
  {
    key: "public_completion_claim",
    label: "Public completion claim",
    requiresDisclosureRecord: true,
    requiresNonBlockingReviews: true,
    userFacingBlockerCategory:
      "Side agreement disclosure needs review before public completion",
  },
  {
    key: "challenge_decision",
    label: "Challenge or appeal decision",
    requiresDisclosureRecord: true,
    requiresNonBlockingReviews: true,
    userFacingBlockerCategory:
      "Side agreement disclosure needs review before the challenge decision",
  },
  {
    key: "release_gate_promotion",
    label: "Release-gate promotion",
    requiresDisclosureRecord: true,
    requiresNonBlockingReviews: true,
    userFacingBlockerCategory:
      "Side agreement disclosure governance is incomplete",
  },
];

const CONTRACT_TESTS = [
  "side_agreement_contract_validator",
  "side_agreement_missing_disclosure_fails_closed",
  "side_agreement_review_dimensions_block_lock_and_payout",
  "side_agreement_public_summary_privacy_smoke",
  "side_agreement_enforce_route_contract",
  "side_agreement_route_health_spec_and_migration_wiring",
] as const;

function check(
  id: string,
  label: string,
  passed: boolean,
  evidence: string,
): MoralTradeSideAgreementCheck {
  return {
    id,
    label,
    status: passed ? "pass" : "fail",
    evidence,
  };
}

function isHash(value: string) {
  return HASH_PATTERN.test(value);
}

function daysBetween(earlier: string, later: string) {
  const earlierTimestamp = Date.parse(earlier);
  const laterTimestamp = Date.parse(later);

  if (!Number.isFinite(earlierTimestamp) || !Number.isFinite(laterTimestamp)) {
    return Number.POSITIVE_INFINITY;
  }

  return (laterTimestamp - earlierTimestamp) / (1000 * 60 * 60 * 24);
}

function isExpired(value: string | null, checkedAt: string) {
  if (value === null) {
    return false;
  }

  const expiresAt = Date.parse(value);
  const checkedAtTimestamp = Date.parse(checkedAt);

  return (
    !Number.isFinite(expiresAt) ||
    !Number.isFinite(checkedAtTimestamp) ||
    expiresAt <= checkedAtTimestamp
  );
}

function makeHash(seed: string) {
  const hexSeed = seed.replace(/[^a-f0-9]/gi, "b") || "b";

  return `sha256:${hexSeed.padEnd(64, "0").slice(0, 64).toLowerCase()}`;
}

function allReviewStatuses(
  status: MoralTradeSideAgreementReviewStatus,
): Record<MoralTradeSideAgreementReviewDimension, MoralTradeSideAgreementReviewStatus> {
  return Object.fromEntries(
    REVIEW_DIMENSIONS.map((dimension) => [dimension, status]),
  ) as Record<
    MoralTradeSideAgreementReviewDimension,
    MoralTradeSideAgreementReviewStatus
  >;
}

function makeSampleDisclosure(
  overrides: Partial<MoralTradeSideAgreementDisclosureRecord> = {},
): MoralTradeSideAgreementDisclosureRecord {
  return {
    disclosureId: "side-agreement:demo",
    subjectType: "donation_offset",
    subjectRef: "donation-offset:demo",
    sideAgreementPresent: false,
    disclosureStatus: "none_declared",
    publicSafeSummary: "No side agreement is declared for this reviewed record.",
    privateDetailsRedacted: true,
    participantNoticeStatus: "not_required_for_stage",
    policySnapshotStatus: "resolved_immutable",
    disclosureHash: makeHash("side-agreement"),
    reviewedAt: "2026-06-08T12:00:00.000Z",
    expiresAt: "2026-12-08T12:00:00.000Z",
    supersededBy: null,
    reviewStatuses: allReviewStatuses("not_required_for_stage"),
    ...overrides,
  };
}

function getTransitionDefinition(transition: MoralTradeSideAgreementTransition) {
  return TRANSITION_DEFINITIONS.find((definition) => definition.key === transition);
}

function publicSummaryHasForbiddenTerm(summary: string) {
  const lowerSummary = summary.toLowerCase();

  return FORBIDDEN_PUBLIC_SUMMARY_TERMS.some((term) =>
    lowerSummary.includes(term.toLowerCase()),
  );
}

function reviewStatusBlocks(status: MoralTradeSideAgreementReviewStatus) {
  return status !== "passed" && status !== "not_required_for_stage";
}

export function evaluateMoralTradeSideAgreementDisclosure(
  input: MoralTradeSideAgreementEvaluationInput,
): MoralTradeSideAgreementEvaluation {
  const checkedAt = input.checkedAt ?? new Date().toISOString();
  const definition = getTransitionDefinition(input.transition);
  const blockers: string[] = [];
  const passingDisclosures = new Set<string>();

  if (!definition) {
    return {
      status: "blocked",
      transition: input.transition,
      checkedAt,
      requiredDisclosureCount: 0,
      passingDisclosureCount: 0,
      blockers: [`unknown_side_agreement_transition:${input.transition}`],
      userFacingBlockerCategories: [
        "Side agreement disclosure state cannot be interpreted",
      ],
    };
  }

  if (definition.requiresDisclosureRecord && input.disclosures.length === 0) {
    blockers.push("side_agreement_disclosure_required");
  }

  input.disclosures.forEach((disclosure) => {
    const recordBlockers: string[] = [];

    if (disclosure.supersededBy) {
      recordBlockers.push(
        `side_agreement_disclosure_superseded:${disclosure.disclosureId}`,
      );
    }

    if (!isHash(disclosure.disclosureHash)) {
      recordBlockers.push(
        `invalid_side_agreement_disclosure_hash:${disclosure.disclosureId}`,
      );
    }

    if (publicSummaryHasForbiddenTerm(disclosure.publicSafeSummary)) {
      recordBlockers.push(
        `unsafe_side_agreement_public_summary:${disclosure.disclosureId}`,
      );
    }

    if (disclosure.policySnapshotStatus !== "resolved_immutable") {
      recordBlockers.push(
        `side_agreement_policy_snapshot_not_immutable:${disclosure.policySnapshotStatus}`,
      );
    }

    if (daysBetween(disclosure.reviewedAt, checkedAt) > MAX_REVIEW_AGE_DAYS) {
      recordBlockers.push(
        `stale_side_agreement_disclosure:${disclosure.disclosureId}`,
      );
    }

    if (isExpired(disclosure.expiresAt, checkedAt)) {
      recordBlockers.push(
        `expired_side_agreement_disclosure:${disclosure.disclosureId}`,
      );
    }

    if (disclosure.sideAgreementPresent) {
      if (disclosure.disclosureStatus !== "non_blocking") {
        recordBlockers.push(
          `side_agreement_not_non_blocking:${disclosure.disclosureId}:${disclosure.disclosureStatus}`,
        );
      }

      if (!disclosure.privateDetailsRedacted) {
        recordBlockers.push(
          `side_agreement_private_details_not_redacted:${disclosure.disclosureId}`,
        );
      }

      if (
        disclosure.participantNoticeStatus !== "sent" &&
        disclosure.participantNoticeStatus !== "not_required_for_stage"
      ) {
        recordBlockers.push(
          `side_agreement_notice_not_recorded:${disclosure.disclosureId}:${disclosure.participantNoticeStatus}`,
        );
      }
    } else if (
      definition.requiresDisclosureRecord &&
      disclosure.disclosureStatus !== "none_declared"
    ) {
      recordBlockers.push(
        `side_agreement_absence_not_explicit:${disclosure.disclosureId}:${disclosure.disclosureStatus}`,
      );
    }

    if (definition.requiresNonBlockingReviews) {
      REVIEW_DIMENSIONS.forEach((dimension) => {
        const status = disclosure.reviewStatuses[dimension] ?? "missing";

        if (reviewStatusBlocks(status)) {
          recordBlockers.push(
            `side_agreement_review_not_non_blocking:${dimension}:${status}`,
          );
        }
      });
    }

    if (recordBlockers.length === 0) {
      passingDisclosures.add(disclosure.disclosureId);
    }

    blockers.push(...recordBlockers);
  });

  return {
    status: blockers.length === 0 ? "pass" : "blocked",
    transition: input.transition,
    checkedAt,
    requiredDisclosureCount: definition.requiresDisclosureRecord ? 1 : 0,
    passingDisclosureCount: passingDisclosures.size,
    blockers,
    userFacingBlockerCategories:
      blockers.length === 0 ? [] : [definition.userFacingBlockerCategory],
  };
}

export function getMoralTradeSideAgreementContract():
  MoralTradeSideAgreementContract {
  const previewSample = evaluateMoralTradeSideAgreementDisclosure({
    transition: "draft_preview",
    checkedAt: "2026-06-08T12:00:00.000Z",
    disclosures: [],
  });
  const lockSample = evaluateMoralTradeSideAgreementDisclosure({
    transition: "matched_trade_lock",
    checkedAt: "2026-06-08T12:00:00.000Z",
    disclosures: [makeSampleDisclosure()],
  });
  const blockedSample = evaluateMoralTradeSideAgreementDisclosure({
    transition: "payout_release",
    checkedAt: "2026-06-08T12:00:00.000Z",
    disclosures: [
      makeSampleDisclosure({
        sideAgreementPresent: true,
        disclosureStatus: "under_review",
        publicSafeSummary:
          "A possible side arrangement is under bounded review before payout.",
        participantNoticeStatus: "missing",
        reviewStatuses: {
          ...allReviewStatuses("passed"),
          collusion: "under_review",
          anti_threat: "missing",
          financial_crime_fraud: "blocked",
        },
      }),
    ],
  });

  return {
    version: MORAL_TRADE_SIDE_AGREEMENTS_CONTRACT_VERSION,
    purpose:
      "Fail-closed side-agreement disclosure governance and endpoint enforcement before lock, payment, payout, public completion, challenge decisions, or release promotion.",
    failClosedRule:
      "Undisclosed off-platform compensation, reciprocal favors, threats, reporting suppression, collusion, authority claims, or private side arrangements are blockers until represented by first-class disclosure and review records. Enforcement records are append-only, owner-scoped, and never authorize lock, payment, payout, reliance, challenge decisions, public completion, or release promotion by themselves. Public surfaces expose only safe summaries, categories, and next steps.",
    firstClassRecordTables: [...FIRST_CLASS_RECORD_TABLES],
    policySnapshotSubjects: [...POLICY_SNAPSHOT_SUBJECTS],
    subjectTypes: SUBJECT_TYPES,
    reviewDimensions: REVIEW_DIMENSIONS,
    failClosedStatuses: [...FAIL_CLOSED_STATUSES],
    forbiddenPublicSummaryTerms: [...FORBIDDEN_PUBLIC_SUMMARY_TERMS],
    transitionDefinitions: TRANSITION_DEFINITIONS,
    sampleEvaluations: [previewSample, lockSample, blockedSample],
    contractTests: [...CONTRACT_TESTS],
  };
}

export function validateMoralTradeSideAgreementContract(
  contract = getMoralTradeSideAgreementContract(),
): MoralTradeSideAgreementValidation {
  const checks = [
    check(
      "first-class-side-agreement-tables",
      "Side-agreement disclosures, review records, and enforcement records are first-class tables.",
      FIRST_CLASS_RECORD_TABLES.every((table) =>
        contract.firstClassRecordTables.includes(table),
      ),
      contract.firstClassRecordTables.join(", "),
    ),
    check(
      "policy-snapshot-subjects",
      "Side-agreement disclosure and review are governed by immutable policy snapshot subjects.",
      POLICY_SNAPSHOT_SUBJECTS.every((subject) =>
        contract.policySnapshotSubjects.includes(subject),
      ),
      contract.policySnapshotSubjects.join(", "),
    ),
    check(
      "subject-type-coverage",
      "Disclosure subjects cover offsets, pledge swaps, compensated actions, performance bonds, evidence terms, challenge terms, recipients, budgets, and rounds.",
      SUBJECT_TYPES.every((subjectType) =>
        contract.subjectTypes.includes(subjectType),
      ),
      contract.subjectTypes.join(", "),
    ),
    check(
      "review-dimensions",
      "Disclosure review covers collusion, externality, legal, anti-threat, reporting, civil-rights, autonomy, privacy, fraud, anti-corruption, and authority dimensions.",
      REVIEW_DIMENSIONS.every((dimension) =>
        contract.reviewDimensions.includes(dimension),
      ),
      contract.reviewDimensions.join(", "),
    ),
    check(
      "high-risk-transitions",
      "Lock, payment, payout, completion, challenge, and release promotion require disclosure records and non-blocking reviews.",
      [
        "matched_trade_lock",
        "payment_capture",
        "payout_release",
        "public_completion_claim",
        "challenge_decision",
        "release_gate_promotion",
      ].every((transition) =>
        contract.transitionDefinitions.some(
          (definition) =>
            definition.key === transition &&
            definition.requiresDisclosureRecord &&
            definition.requiresNonBlockingReviews,
        ),
      ),
      contract.transitionDefinitions.map((definition) => definition.key).join(", "),
    ),
    check(
      "public-summary-privacy",
      "Public side-agreement summaries avoid raw private, reviewer, source, provider, payment, and contact-detail terms.",
      contract.sampleEvaluations.every((evaluation) =>
        evaluation.userFacingBlockerCategories.every(
          (category) => !publicSummaryHasForbiddenTerm(category),
        ),
      ) && FORBIDDEN_PUBLIC_SUMMARY_TERMS.every((term) =>
        contract.forbiddenPublicSummaryTerms.includes(term),
      ),
      contract.forbiddenPublicSummaryTerms.join(", "),
    ),
    check(
      "sample-evaluations",
      "The public contract exposes passing preview/lock samples and a blocked payout sample.",
      contract.sampleEvaluations.some(
        (evaluation) =>
          evaluation.transition === "draft_preview" &&
          evaluation.status === "pass",
      ) &&
        contract.sampleEvaluations.some(
          (evaluation) =>
            evaluation.transition === "matched_trade_lock" &&
            evaluation.status === "pass",
        ) &&
        contract.sampleEvaluations.some(
          (evaluation) =>
            evaluation.transition === "payout_release" &&
            evaluation.status === "blocked",
        ),
      contract.sampleEvaluations
        .map((evaluation) => `${evaluation.transition}:${evaluation.status}`)
        .join(", "),
    ),
    check(
      "contract-tests",
      "Side-agreement contract test hooks are published.",
      CONTRACT_TESTS.every((testName) => contract.contractTests.includes(testName)),
      contract.contractTests.join(", "),
    ),
  ];
  const blockers = checks
    .filter((entry) => entry.status === "fail")
    .map((entry) => entry.id);

  return {
    status: blockers.length === 0 ? "pass" : "fail",
    validatorName: "moral-trade-side-agreements-contract",
    validatorVersion: MORAL_TRADE_SIDE_AGREEMENTS_VALIDATOR_VERSION,
    contractVersion: contract.version,
    checks,
    blockers,
  };
}

const moralTradeSideAgreements = {
  evaluateMoralTradeSideAgreementDisclosure,
  getMoralTradeSideAgreementContract,
  validateMoralTradeSideAgreementContract,
};

export default moralTradeSideAgreements;
