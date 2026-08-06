import type { FormulaAst } from "./formula";
import type { GroupContributionProposalPayload } from "./group-contribution-payload";
import type {
  CreatorParticipation,
  ParticipantOwnedFundingTerms,
  ParticipantTarget,
} from "./participant-target";
import type { GroupContributionReviewRecordFragment } from "./group-contribution-review-record";

export const CREATE_INTERFACE_VERSION = "moral_trade_create_v1" as const;

export const CREATE_SUBMISSION_KINDS = [
  "pledge_swap",
  "donation_redirect",
  "pool_create",
  "existing_pool_contribution",
] as const;

export type CreateSubmissionKind = (typeof CREATE_SUBMISSION_KINDS)[number];
export type CreateRequestKind = "commitment" | "skill" | "fund";
export type CreateFundMode = "pledgeSwap" | "redirect" | "dac";
export type CreateDacPath = "create" | "existing";
export type CreateOfferType = "money" | "time" | "behavior" | "skill" | "intro" | "cause";
export type CreateFailureBonusType = "none" | "fixed" | "percentage" | "function";
export type CreateFailureTimingMode = "all" | "cutoff" | "firstPercent" | "preset" | "piecewise" | "formula";
export type CreateProgressVisibility = "exact" | "range" | "threshold" | "sealed";

export interface CreateOfferOption {
  [key: string]: string | boolean | number | null | undefined;
}

export interface CreateOfferContribution {
  id: CreateOfferType;
  title: string;
  options: CreateOfferOption[];
}

export interface CreateThresholdInput {
  amount: string;
}

export interface CreateTimingBandInput {
  end: string;
  multiplier: string;
}

export interface CreateCommonGroundParticipantInput {
  target: ParticipantTarget;
  participantTerms: ParticipantOwnedFundingTerms | null;
}

export interface CreateCommonGroundInput {
  targetAmountCents: number;
  allocationStatus: "open";
  creatorParticipation: CreatorParticipation;
  privateValueEstimatesStored: false;
  participants: CreateCommonGroundParticipantInput[];
}

export interface CreatePoolInput {
  commonGround?: CreateCommonGroundInput | null;
  thresholds: CreateThresholdInput[];
  deadline: string;
  failureBonusType: CreateFailureBonusType;
  failureBonusAmount: string;
  failureBonusPercent: string;
  failureBonusFunction: string;
  failureTimingMode: CreateFailureTimingMode;
  timingCutoffMethod: "period" | "date";
  timingCutoffPercent: string;
  timingCutoffDate: string;
  timingContributorPercent: string;
  timingPreset: "linear" | "frontLoaded" | "gentle";
  timingPiecewiseBands: CreateTimingBandInput[];
  timingFormula: string;
  timingFormulaAcknowledged: boolean;
  continuation: "stop" | "continue";
  thresholdVisibility: "public_exact";
  progressVisibility: CreateProgressVisibility;
  moralTradeBonusShare: string;
  activationRule: string;
}

export interface MoralTradeCreatePayload {
  interfaceVersion: typeof CREATE_INTERFACE_VERSION;
  submissionKey: string;
  cause: string;
  requestKind: CreateRequestKind;
  fundMode: CreateFundMode | null;
  dacPath: CreateDacPath | null;
  requestAction: string;
  existingPoolAmount: string;
  existingPoolCurrency: string;
  offers: CreateOfferContribution[];
  pool: CreatePoolInput | null;
  groupContributionTerms: unknown | null;
}

export interface ValidatedFormulaTerms {
  source: string;
  languageVersion: string;
  hash: string;
  ast: FormulaAst;
  variables: string[];
}

export interface ValidatedCreateCommonGroundTerms extends CreateCommonGroundInput {}

export interface ValidatedCreatePoolTerms {
  commonGround: ValidatedCreateCommonGroundTerms | null;
  thresholdAmountsCents: number[];
  deadlineAt: string;
  failureBonusType: CreateFailureBonusType;
  failureBonusTerms: Record<string, unknown>;
  failureTimingMode: CreateFailureTimingMode;
  failureTimingTerms: Record<string, unknown>;
  formula: ValidatedFormulaTerms | null;
  continuation: "stop" | "continue";
  thresholdVisibility: "public_exact";
  progressVisibility:
    | "exact_amount"
    | "progress_range"
    | "threshold_status_only"
    | "sealed_progress";
  moralTradeBonusShareBps: number;
  activationRule: string;
}

export interface ValidatedCreatePayload {
  source: MoralTradeCreatePayload;
  kind: CreateSubmissionKind;
  cause: string;
  requestedAction: string;
  offeredTerms: CreateOfferContribution[];
  offeredSummary: string;
  existingPoolReference: string | null;
  existingPoolAmountCents: number | null;
  existingPoolCurrency: string | null;
  poolTerms: ValidatedCreatePoolTerms | null;
  groupContributionTerms: GroupContributionProposalPayload;
  groupContributionReviewRecord: GroupContributionReviewRecordFragment | null;
  payloadHash: string;
}

export interface CreatePublishResult {
  id: string;
  displayId: string;
  status: "pending_review" | "published";
  targetType: "offer" | "mpgf_pool_proposal";
  targetId: string;
  canonicalPath: string;
  canonicalUrl: string;
  objectLabel: string;
  title: string;
  lede: string;
  visibility: string;
  openStatus: string;
}
