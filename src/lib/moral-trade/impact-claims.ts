export const MORAL_TRADE_IMPACT_CLAIMS_CONTRACT_VERSION =
  "moral-trade-impact-claims-v0.1-2026-06";
export const MORAL_TRADE_IMPACT_CLAIMS_VALIDATOR_VERSION =
  "moral-trade-impact-claims-validator-v0.1";

export type MoralTradeImpactClaimSurface =
  | "offer_detail"
  | "public_dashboard"
  | "transparency_report"
  | "round_summary"
  | "recipient_project_page";

export type MoralTradeImpactClaimKind =
  | "transfer_metric"
  | "payout_metric"
  | "sponsor_leverage_metric"
  | "outcome_claim"
  | "cost_effectiveness_claim"
  | "causal_impact_claim"
  | "moral_value_claim";

export type MoralTradeImpactClaimStatus =
  | "draft"
  | "under_review"
  | "reviewed"
  | "published"
  | "blocked"
  | "stale"
  | "superseded";

export type MoralTradeImpactPolicySnapshotStatus =
  | "resolved_immutable"
  | "missing"
  | "mutable"
  | "stale"
  | "superseded";

export type MoralTradeImpactReviewStatus =
  | "passed"
  | "not_required_for_stage"
  | "missing"
  | "under_review"
  | "failed"
  | "stale"
  | "superseded";

export type MoralTradeImpactEvidenceClaimType =
  | "payment_receipt"
  | "destination_verification"
  | "transfer_metric"
  | "impact_outcome"
  | "impact_methodology"
  | "uncertainty_analysis"
  | "cost_denominator";

export type MoralTradeImpactClaimFailClosedStatus =
  | "methodology_policy_missing"
  | "methodology_policy_mutable"
  | "methodology_policy_stale"
  | "methodology_policy_superseded"
  | "impact_claim_record_missing"
  | "impact_claim_not_reviewed"
  | "impact_claim_under_review"
  | "impact_claim_failed"
  | "impact_claim_stale"
  | "impact_claim_superseded"
  | "methodology_policy_ref_missing"
  | "evidence_refs_missing"
  | "evidence_claim_type_mismatch"
  | "uncertainty_disclosure_missing"
  | "transfer_vs_impact_label_missing"
  | "transfer_metric_used_as_impact"
  | "payment_evidence_used_as_impact"
  | "content_moderation_missing"
  | "reviewer_quality_missing"
  | "privileged_action_missing"
  | "audit_integrity_missing"
  | "public_metric_suppression_missing"
  | "private_evidence_public"
  | "invalid_policy_hash"
  | "invalid_claim_hash";

export interface MoralTradeImpactClaimPolicyRecord {
  policyId: string;
  policyVersion: string;
  claimType: MoralTradeImpactClaimKind;
  policySnapshotStatus: MoralTradeImpactPolicySnapshotStatus;
  evidenceRequired: boolean;
  uncertaintyDisclosureRequired: boolean;
  transferSeparationRequired: boolean;
  contentModerationRequired: boolean;
  reviewerQualityRequired: boolean;
  privilegedActionRequired: boolean;
  auditIntegrityRequired: boolean;
  publicMetricSuppressionRequired: boolean;
  minEvidenceRefs: number;
  methodologyHash: string;
  reviewedAt: string;
  supersededBy: string | null;
}

export interface MoralTradeImpactClaimRecord {
  claimId: string;
  surface: MoralTradeImpactClaimSurface;
  claimType: MoralTradeImpactClaimKind;
  publicationStatus: MoralTradeImpactClaimStatus;
  methodologyPolicyRef: string | null;
  evidenceRefs: string[];
  evidenceClaimTypes: MoralTradeImpactEvidenceClaimType[];
  uncertaintyDisclosure: string | null;
  transferVsImpactLabel: string | null;
  grossTransferAmountDisplayed: boolean;
  netRecipientPayoutDisplayed: boolean;
  sponsorLeverageDisplayed: boolean;
  paymentEvidenceUsedAsImpact: boolean;
  impactClaimTextPublic: boolean;
  contentModerationStatus: MoralTradeImpactReviewStatus;
  reviewerQualityStatus: MoralTradeImpactReviewStatus;
  privilegedActionStatus: MoralTradeImpactReviewStatus;
  auditIntegrityStatus: MoralTradeImpactReviewStatus;
  publicMetricSuppressionStatus: MoralTradeImpactReviewStatus;
  privateEvidencePublic: boolean;
  claimHash: string;
  reviewedAt: string | null;
  expiresAt: string | null;
  supersededBy: string | null;
}

export interface MoralTradeImpactClaimSurfaceDefinition {
  key: MoralTradeImpactClaimSurface;
  label: string;
  protectedClaimBoundary: string;
  requiredControls: string[];
  blocksTransitions: string[];
}

export interface MoralTradeImpactClaimEvaluationInput {
  surface: MoralTradeImpactClaimSurface;
  claimType: MoralTradeImpactClaimKind;
  checkedAt?: string;
  policies: MoralTradeImpactClaimPolicyRecord[];
  claims: MoralTradeImpactClaimRecord[];
}

export interface MoralTradeImpactClaimEvaluation {
  status: "pass" | "blocked";
  surface: MoralTradeImpactClaimSurface;
  claimType: MoralTradeImpactClaimKind;
  checkedAt: string;
  policyCount: number;
  claimCount: number;
  blockers: string[];
  userFacingBlockerCategories: string[];
}

export interface MoralTradeImpactClaimCheck {
  id: string;
  label: string;
  status: "pass" | "fail";
  evidence: string;
}

export interface MoralTradeImpactClaimValidation {
  status: "pass" | "fail";
  validatorName: "moral-trade-impact-claims-contract";
  validatorVersion: string;
  contractVersion: string;
  checks: MoralTradeImpactClaimCheck[];
  blockers: string[];
}

export interface MoralTradeImpactClaimContract {
  version: string;
  purpose: string;
  privacyRule: string;
  failClosedRule: string;
  firstClassRecordTables: string[];
  policySnapshotSubjects: string[];
  surfaces: MoralTradeImpactClaimSurface[];
  claimTypes: MoralTradeImpactClaimKind[];
  evidenceClaimTypes: MoralTradeImpactEvidenceClaimType[];
  failClosedStatuses: MoralTradeImpactClaimFailClosedStatus[];
  surfaceDefinitions: MoralTradeImpactClaimSurfaceDefinition[];
  sampleEvaluations: MoralTradeImpactClaimEvaluation[];
  contractTests: string[];
}

const HASH_PATTERN = /^sha256:[a-f0-9]{64}$/;
const MAX_POLICY_AGE_DAYS = 180;
const MAX_CLAIM_AGE_DAYS = 180;

const FIRST_CLASS_RECORD_TABLES = [
  "moral_trade_impact_claim_methodology_policies",
  "moral_trade_impact_claim_records",
] as const;

const POLICY_SNAPSHOT_SUBJECTS = [
  "impact_claim_methodology",
  "public_metrics",
] as const;

const SURFACES: MoralTradeImpactClaimSurface[] = [
  "offer_detail",
  "public_dashboard",
  "transparency_report",
  "round_summary",
  "recipient_project_page",
];

const CLAIM_TYPES: MoralTradeImpactClaimKind[] = [
  "transfer_metric",
  "payout_metric",
  "sponsor_leverage_metric",
  "outcome_claim",
  "cost_effectiveness_claim",
  "causal_impact_claim",
  "moral_value_claim",
];

const EVIDENCE_CLAIM_TYPES: MoralTradeImpactEvidenceClaimType[] = [
  "payment_receipt",
  "destination_verification",
  "transfer_metric",
  "impact_outcome",
  "impact_methodology",
  "uncertainty_analysis",
  "cost_denominator",
];

const FAIL_CLOSED_STATUSES: MoralTradeImpactClaimFailClosedStatus[] = [
  "methodology_policy_missing",
  "methodology_policy_mutable",
  "methodology_policy_stale",
  "methodology_policy_superseded",
  "impact_claim_record_missing",
  "impact_claim_not_reviewed",
  "impact_claim_under_review",
  "impact_claim_failed",
  "impact_claim_stale",
  "impact_claim_superseded",
  "methodology_policy_ref_missing",
  "evidence_refs_missing",
  "evidence_claim_type_mismatch",
  "uncertainty_disclosure_missing",
  "transfer_vs_impact_label_missing",
  "transfer_metric_used_as_impact",
  "payment_evidence_used_as_impact",
  "content_moderation_missing",
  "reviewer_quality_missing",
  "privileged_action_missing",
  "audit_integrity_missing",
  "public_metric_suppression_missing",
  "private_evidence_public",
  "invalid_policy_hash",
  "invalid_claim_hash",
];

const IMPACT_CLAIM_TYPES = new Set<MoralTradeImpactClaimKind>([
  "outcome_claim",
  "cost_effectiveness_claim",
  "causal_impact_claim",
  "moral_value_claim",
]);

const PAYMENT_ONLY_EVIDENCE_TYPES = new Set<MoralTradeImpactEvidenceClaimType>([
  "payment_receipt",
  "destination_verification",
  "transfer_metric",
]);

const REQUIRED_CONTROLS = [
  "frozen_methodology_policy",
  "claim_typed_evidence_refs",
  "uncertainty_disclosure",
  "transfer_vs_impact_separation",
  "content_moderation",
  "reviewer_quality",
  "privileged_action_approval",
  "audit_integrity_checkpoint",
] as const;

const SURFACE_DEFINITIONS: MoralTradeImpactClaimSurfaceDefinition[] = [
  {
    key: "offer_detail",
    label: "Offer detail",
    protectedClaimBoundary: "offer copy cannot convert receipts or payment proof into impact",
    requiredControls: [...REQUIRED_CONTROLS],
    blocksTransitions: ["public_offer_publication", "impact_claim_publication"],
  },
  {
    key: "public_dashboard",
    label: "Public dashboard",
    protectedClaimBoundary:
      "gross transfer, net payout, sponsor leverage, and impact remain separately labeled",
    requiredControls: [...REQUIRED_CONTROLS, "public_metric_suppression"],
    blocksTransitions: ["public_metric_release", "public_impact_claim"],
  },
  {
    key: "transparency_report",
    label: "Transparency report",
    protectedClaimBoundary:
      "aggregate money metrics do not imply causal outcomes or moral value",
    requiredControls: [...REQUIRED_CONTROLS, "public_metric_suppression"],
    blocksTransitions: ["transparency_report_publication", "public_impact_claim"],
  },
  {
    key: "round_summary",
    label: "Round summary",
    protectedClaimBoundary:
      "round completion, payout release, and sponsor leverage are not impact evidence",
    requiredControls: [...REQUIRED_CONTROLS, "public_metric_suppression"],
    blocksTransitions: ["round_close_publication", "public_money_or_impact_claim"],
  },
  {
    key: "recipient_project_page",
    label: "Recipient project page",
    protectedClaimBoundary:
      "recipient destination verification remains separate from outcome evidence",
    requiredControls: [...REQUIRED_CONTROLS],
    blocksTransitions: ["recipient_project_publication", "impact_claim_publication"],
  },
];

const CONTRACT_TESTS = [
  "impact_claim_contract_validator",
  "impact_claim_evaluator_fail_closed",
  "impact_claim_route_contract",
  "impact_claim_schema_contract",
  "impact_claim_health_contract",
] as const;

function hasAll(values: readonly string[], required: readonly string[]) {
  return required.every((entry) => values.includes(entry));
}

function check(
  id: string,
  label: string,
  passed: boolean,
  evidence: string,
): MoralTradeImpactClaimCheck {
  return {
    id,
    label,
    status: passed ? "pass" : "fail",
    evidence,
  };
}

function daysBetween(startIso: string, endIso: string) {
  const start = Date.parse(startIso);
  const end = Date.parse(endIso);

  if (!Number.isFinite(start) || !Number.isFinite(end)) {
    return Number.POSITIVE_INFINITY;
  }

  return Math.max(0, (end - start) / 86_400_000);
}

function isExpired(expiresAt: string | null, checkedAt: string) {
  return Boolean(expiresAt && Date.parse(expiresAt) <= Date.parse(checkedAt));
}

function isNonBlockingReviewStatus(status: MoralTradeImpactReviewStatus) {
  return status === "passed" || status === "not_required_for_stage";
}

function isImpactClaimType(claimType: MoralTradeImpactClaimKind) {
  return IMPACT_CLAIM_TYPES.has(claimType);
}

function policyBlockers(
  policy: MoralTradeImpactClaimPolicyRecord,
  checkedAt: string,
) {
  const blockers: string[] = [];

  if (policy.policySnapshotStatus === "missing") {
    blockers.push(`methodology_policy_missing:${policy.claimType}`);
  }

  if (policy.policySnapshotStatus === "mutable") {
    blockers.push(`methodology_policy_mutable:${policy.policyId}`);
  }

  if (
    policy.policySnapshotStatus === "stale" ||
    daysBetween(policy.reviewedAt, checkedAt) > MAX_POLICY_AGE_DAYS
  ) {
    blockers.push(`methodology_policy_stale:${policy.policyId}`);
  }

  if (policy.policySnapshotStatus === "superseded" || policy.supersededBy) {
    blockers.push(`methodology_policy_superseded:${policy.policyId}`);
  }

  if (!HASH_PATTERN.test(policy.methodologyHash)) {
    blockers.push(`invalid_policy_hash:${policy.policyId}`);
  }

  return blockers;
}

function claimStatusBlockers(
  claim: MoralTradeImpactClaimRecord,
  checkedAt: string,
) {
  const blockers: string[] = [];

  if (claim.publicationStatus === "draft") {
    blockers.push(`impact_claim_not_reviewed:${claim.claimId}`);
  }

  if (claim.publicationStatus === "under_review") {
    blockers.push(`impact_claim_under_review:${claim.claimId}`);
  }

  if (claim.publicationStatus === "blocked") {
    blockers.push(`impact_claim_failed:${claim.claimId}`);
  }

  if (
    claim.publicationStatus === "stale" ||
    isExpired(claim.expiresAt, checkedAt) ||
    !claim.reviewedAt ||
    daysBetween(claim.reviewedAt, checkedAt) > MAX_CLAIM_AGE_DAYS
  ) {
    blockers.push(`impact_claim_stale:${claim.claimId}`);
  }

  if (claim.publicationStatus === "superseded" || claim.supersededBy) {
    blockers.push(`impact_claim_superseded:${claim.claimId}`);
  }

  return blockers;
}

function claimSubstanceBlockers(
  policy: MoralTradeImpactClaimPolicyRecord,
  claim: MoralTradeImpactClaimRecord,
) {
  const blockers: string[] = [];
  const impactClaim = isImpactClaimType(claim.claimType);
  const hasImpactEvidence = claim.evidenceClaimTypes.some(
    (type) => !PAYMENT_ONLY_EVIDENCE_TYPES.has(type),
  );

  if (!claim.methodologyPolicyRef) {
    blockers.push(`methodology_policy_ref_missing:${claim.claimId}`);
  }

  if (
    policy.evidenceRequired &&
    claim.evidenceRefs.length < Math.max(1, policy.minEvidenceRefs)
  ) {
    blockers.push(`evidence_refs_missing:${claim.claimId}`);
  }

  if (impactClaim && !hasImpactEvidence) {
    blockers.push(`evidence_claim_type_mismatch:${claim.claimId}`);
  }

  if (
    impactClaim &&
    policy.uncertaintyDisclosureRequired &&
    !claim.uncertaintyDisclosure
  ) {
    blockers.push(`uncertainty_disclosure_missing:${claim.claimId}`);
  }

  if (
    policy.transferSeparationRequired &&
    (claim.impactClaimTextPublic ||
      claim.grossTransferAmountDisplayed ||
      claim.netRecipientPayoutDisplayed ||
      claim.sponsorLeverageDisplayed) &&
    !claim.transferVsImpactLabel
  ) {
    blockers.push(`transfer_vs_impact_label_missing:${claim.claimId}`);
  }

  if (!impactClaim && claim.impactClaimTextPublic) {
    blockers.push(`transfer_metric_used_as_impact:${claim.claimId}`);
  }

  if (claim.paymentEvidenceUsedAsImpact) {
    blockers.push(`payment_evidence_used_as_impact:${claim.claimId}`);
  }

  if (
    policy.contentModerationRequired &&
    !isNonBlockingReviewStatus(claim.contentModerationStatus)
  ) {
    blockers.push(`content_moderation_missing:${claim.claimId}`);
  }

  if (
    policy.reviewerQualityRequired &&
    !isNonBlockingReviewStatus(claim.reviewerQualityStatus)
  ) {
    blockers.push(`reviewer_quality_missing:${claim.claimId}`);
  }

  if (
    policy.privilegedActionRequired &&
    !isNonBlockingReviewStatus(claim.privilegedActionStatus)
  ) {
    blockers.push(`privileged_action_missing:${claim.claimId}`);
  }

  if (
    policy.auditIntegrityRequired &&
    !isNonBlockingReviewStatus(claim.auditIntegrityStatus)
  ) {
    blockers.push(`audit_integrity_missing:${claim.claimId}`);
  }

  if (
    policy.publicMetricSuppressionRequired &&
    !isNonBlockingReviewStatus(claim.publicMetricSuppressionStatus)
  ) {
    blockers.push(`public_metric_suppression_missing:${claim.claimId}`);
  }

  if (claim.privateEvidencePublic) {
    blockers.push(`private_evidence_public:${claim.claimId}`);
  }

  if (!HASH_PATTERN.test(claim.claimHash)) {
    blockers.push(`invalid_claim_hash:${claim.claimId}`);
  }

  return blockers;
}

function userFacingCategories(blockers: string[]) {
  const categories = new Set<string>();

  for (const blocker of blockers) {
    if (
      blocker.includes("methodology") ||
      blocker.includes("evidence") ||
      blocker.includes("uncertainty")
    ) {
      categories.add("Impact evidence review is incomplete");
    } else if (
      blocker.includes("transfer") ||
      blocker.includes("payment") ||
      blocker.includes("payout")
    ) {
      categories.add("Transfer metrics must stay separate from impact claims");
    } else if (
      blocker.includes("moderation") ||
      blocker.includes("reviewer") ||
      blocker.includes("privileged")
    ) {
      categories.add("Required review is incomplete");
    } else if (blocker.includes("private")) {
      categories.add("Private evidence cannot be published");
    } else {
      categories.add("Impact claim publication is not ready");
    }
  }

  return Array.from(categories);
}

export function evaluateMoralTradeImpactClaim(
  input: MoralTradeImpactClaimEvaluationInput,
): MoralTradeImpactClaimEvaluation {
  const checkedAt = input.checkedAt ?? new Date().toISOString();
  const matchingPolicies = input.policies.filter(
    (policy) => policy.claimType === input.claimType,
  );
  const activePolicy =
    matchingPolicies.find(
      (policy) => policy.policySnapshotStatus === "resolved_immutable",
    ) ?? matchingPolicies[0];
  const matchingClaims = input.claims.filter(
    (claim) =>
      claim.surface === input.surface && claim.claimType === input.claimType,
  );
  const activeClaim =
    matchingClaims.find((claim) =>
      claim.publicationStatus === "reviewed" ||
      claim.publicationStatus === "published",
    ) ?? matchingClaims[0];
  const blockers: string[] = [];

  if (!activePolicy) {
    blockers.push(`methodology_policy_missing:${input.claimType}`);
  } else {
    blockers.push(...policyBlockers(activePolicy, checkedAt));
  }

  if (!activeClaim) {
    blockers.push(
      `impact_claim_record_missing:${input.surface}:${input.claimType}`,
    );
  } else {
    blockers.push(...claimStatusBlockers(activeClaim, checkedAt));

    if (activePolicy) {
      blockers.push(...claimSubstanceBlockers(activePolicy, activeClaim));
    }
  }

  const uniqueBlockers = Array.from(new Set(blockers));

  return {
    status: uniqueBlockers.length ? "blocked" : "pass",
    surface: input.surface,
    claimType: input.claimType,
    checkedAt,
    policyCount: matchingPolicies.length,
    claimCount: matchingClaims.length,
    blockers: uniqueBlockers,
    userFacingBlockerCategories: userFacingCategories(uniqueBlockers),
  };
}

function samplePolicy(
  claimType: MoralTradeImpactClaimKind,
  overrides: Partial<MoralTradeImpactClaimPolicyRecord> = {},
): MoralTradeImpactClaimPolicyRecord {
  return {
    policyId: `impact-methodology-${claimType}`,
    policyVersion: MORAL_TRADE_IMPACT_CLAIMS_CONTRACT_VERSION,
    claimType,
    policySnapshotStatus: "resolved_immutable",
    evidenceRequired: true,
    uncertaintyDisclosureRequired: isImpactClaimType(claimType),
    transferSeparationRequired: true,
    contentModerationRequired: true,
    reviewerQualityRequired: true,
    privilegedActionRequired: isImpactClaimType(claimType),
    auditIntegrityRequired: true,
    publicMetricSuppressionRequired: true,
    minEvidenceRefs: isImpactClaimType(claimType) ? 2 : 1,
    methodologyHash:
      "sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    reviewedAt: "2026-06-01T00:00:00.000Z",
    supersededBy: null,
    ...overrides,
  };
}

function sampleClaim(
  claimType: MoralTradeImpactClaimKind,
  overrides: Partial<MoralTradeImpactClaimRecord> = {},
): MoralTradeImpactClaimRecord {
  const impactClaim = isImpactClaimType(claimType);

  return {
    claimId: `impact-claim-${claimType}`,
    surface: impactClaim ? "transparency_report" : "public_dashboard",
    claimType,
    publicationStatus: "reviewed",
    methodologyPolicyRef: `impact-methodology-${claimType}`,
    evidenceRefs: impactClaim
      ? ["evidence:outcome-review", "evidence:uncertainty-review"]
      : ["metric:gross-transfer"],
    evidenceClaimTypes: impactClaim
      ? ["impact_outcome", "impact_methodology", "uncertainty_analysis"]
      : ["transfer_metric"],
    uncertaintyDisclosure: impactClaim
      ? "Outcome estimate includes wide uncertainty and no unsupported causality beyond reviewed evidence."
      : null,
    transferVsImpactLabel:
      "Transfer, payout, sponsor leverage, outcome, and cost-effectiveness claims are separate.",
    grossTransferAmountDisplayed: !impactClaim,
    netRecipientPayoutDisplayed: !impactClaim,
    sponsorLeverageDisplayed: !impactClaim,
    paymentEvidenceUsedAsImpact: false,
    impactClaimTextPublic: impactClaim,
    contentModerationStatus: "passed",
    reviewerQualityStatus: "passed",
    privilegedActionStatus: impactClaim ? "passed" : "not_required_for_stage",
    auditIntegrityStatus: "passed",
    publicMetricSuppressionStatus: "passed",
    privateEvidencePublic: false,
    claimHash:
      "sha256:bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
    reviewedAt: "2026-06-01T00:00:00.000Z",
    expiresAt: "2026-12-01T00:00:00.000Z",
    supersededBy: null,
    ...overrides,
  };
}

function buildSampleEvaluations() {
  const transferPolicy = samplePolicy("transfer_metric", {
    privilegedActionRequired: false,
  });
  const transferClaim = sampleClaim("transfer_metric");
  const causalPolicy = samplePolicy("causal_impact_claim");
  const blockedCausalClaim = sampleClaim("causal_impact_claim", {
    publicationStatus: "under_review",
    evidenceRefs: ["payment:receipt"],
    evidenceClaimTypes: ["payment_receipt"],
    uncertaintyDisclosure: null,
    paymentEvidenceUsedAsImpact: true,
    privilegedActionStatus: "missing",
    auditIntegrityStatus: "missing",
    claimHash: "invalid-hash",
  });

  return [
    evaluateMoralTradeImpactClaim({
      surface: "public_dashboard",
      claimType: "transfer_metric",
      checkedAt: "2026-06-02T00:00:00.000Z",
      policies: [transferPolicy],
      claims: [transferClaim],
    }),
    evaluateMoralTradeImpactClaim({
      surface: "transparency_report",
      claimType: "causal_impact_claim",
      checkedAt: "2026-06-02T00:00:00.000Z",
      policies: [causalPolicy],
      claims: [blockedCausalClaim],
    }),
  ];
}

export function getMoralTradeImpactClaimContract(): MoralTradeImpactClaimContract {
  return {
    version: MORAL_TRADE_IMPACT_CLAIMS_CONTRACT_VERSION,
    purpose:
      "Fail-closed impact-claim governance for reviewed methodology, claim-typed evidence, uncertainty disclosure, and transfer-vs-impact separation before public impact, outcome, cost-effectiveness, or moral-value claims.",
    privacyRule:
      "Public impact-claim contract responses expose only static claim types, table names, statuses, and sample pass/block states; they never expose private evidence, reviewer notes, methodology payloads, recipient-sensitive outcomes, or participant-specific claim records.",
    failClosedRule:
      "Transfers are not impact: missing frozen methodology, missing impact_claim_record, missing claim-typed evidence, missing uncertainty disclosure, transfer/payment evidence used as impact, missing moderation, missing reviewer quality, missing privileged-action approval, missing audit integrity, missing public-metric suppression, or public private evidence blocks impact publication.",
    firstClassRecordTables: [...FIRST_CLASS_RECORD_TABLES],
    policySnapshotSubjects: [...POLICY_SNAPSHOT_SUBJECTS],
    surfaces: [...SURFACES],
    claimTypes: [...CLAIM_TYPES],
    evidenceClaimTypes: [...EVIDENCE_CLAIM_TYPES],
    failClosedStatuses: [...FAIL_CLOSED_STATUSES],
    surfaceDefinitions: [...SURFACE_DEFINITIONS],
    sampleEvaluations: buildSampleEvaluations(),
    contractTests: [...CONTRACT_TESTS],
  };
}

export function validateMoralTradeImpactClaimContract(
  contract = getMoralTradeImpactClaimContract(),
): MoralTradeImpactClaimValidation {
  const checks = [
    check(
      "record-table-coverage",
      "Impact claims have first-class methodology policy and claim record tables",
      hasAll(contract.firstClassRecordTables, FIRST_CLASS_RECORD_TABLES),
      contract.firstClassRecordTables.join(", "),
    ),
    check(
      "policy-subject-coverage",
      "Impact methodology is a frozen policy-snapshot subject",
      hasAll(contract.policySnapshotSubjects, POLICY_SNAPSHOT_SUBJECTS),
      contract.policySnapshotSubjects.join(", "),
    ),
    check(
      "claim-type-coverage",
      "Transfer, payout, sponsor, outcome, cost-effectiveness, causal impact, and moral-value claim types are distinct",
      hasAll(contract.claimTypes, CLAIM_TYPES),
      contract.claimTypes.join(", "),
    ),
    check(
      "evidence-claim-type-coverage",
      "Payment evidence and impact evidence remain separately typed",
      hasAll(contract.evidenceClaimTypes, EVIDENCE_CLAIM_TYPES),
      contract.evidenceClaimTypes.join(", "),
    ),
    check(
      "fail-closed-coverage",
      "Fail-closed statuses include transfer-as-impact, evidence, uncertainty, review, and audit blockers",
      hasAll(contract.failClosedStatuses, FAIL_CLOSED_STATUSES),
      contract.failClosedStatuses.join(", "),
    ),
    check(
      "surface-coverage",
      "Public surfaces that might publish impact claims are listed",
      hasAll(contract.surfaces, SURFACES),
      contract.surfaces.join(", "),
    ),
    check(
      "sample-evaluation-coverage",
      "Sample evaluations prove transfer metrics pass only with separation and causal impact blocks without evidence",
      contract.sampleEvaluations.some(
        (evaluation) =>
          evaluation.claimType === "transfer_metric" &&
          evaluation.status === "pass",
      ) &&
        contract.sampleEvaluations.some(
          (evaluation) =>
            evaluation.claimType === "causal_impact_claim" &&
            evaluation.status === "blocked",
        ),
      contract.sampleEvaluations
        .map((evaluation) => `${evaluation.claimType}:${evaluation.status}`)
        .join(", "),
    ),
    check(
      "contract-test-coverage",
      "Contract lists route, schema, health, and fail-closed tests",
      hasAll(contract.contractTests, CONTRACT_TESTS),
      contract.contractTests.join(", "),
    ),
  ];
  const blockers = checks
    .filter((entry) => entry.status === "fail")
    .map((entry) => `${entry.id}:${entry.label}`);

  return {
    status: blockers.length ? "fail" : "pass",
    validatorName: "moral-trade-impact-claims-contract",
    validatorVersion: MORAL_TRADE_IMPACT_CLAIMS_VALIDATOR_VERSION,
    contractVersion: contract.version,
    checks,
    blockers,
  };
}

const moralTradeImpactClaims = {
  evaluateMoralTradeImpactClaim,
  getMoralTradeImpactClaimContract,
  validateMoralTradeImpactClaimContract,
};

export default moralTradeImpactClaims;
