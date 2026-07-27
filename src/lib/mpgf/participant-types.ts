import type {
  FailureBonusEligibilityPolicy,
  FailureBonusSuccessPremiumPayer,
  FailureBonusSuccessPremiumPricingAssumptions,
  FailureBonusSuccessPremiumScheduleQuote,
} from "./failure-bonus-success-premium";
import type { FailureBonusScheduleStatus } from "./failure-bonus-threshold-editor";
import type {
  MpgfBallot,
  MpgfPledge,
  MpgfPublicGoodsCaptureMode,
  MpgfPublicGoodsDestinationType,
  MpgfPublicGoodsPledge,
  MpgfPublicGoodsSubscription,
  MpgfRecurringContributionCommitment,
} from "./types";

export type MpgfParticipantPersistenceStatus =
  | "authenticated"
  | "sign_in_required"
  | "unavailable"
  | "error";

export interface MpgfPoolProposalRecord {
  id: string;
  proposerId?: string;
  title: string;
  summary: string;
  causeArea: string;
  problem: string;
  intervention: string;
  moralPublicGoodRationale: string;
  requestedMaximumFundingCents: number;
  minimumViableFundingCents?: number;
  outcomeUnitsSummary: string;
  expectedEffectVsFunding: string;
  timeline: string;
  milestones: string[];
  risks: string[];
  misusePathways: string;
  proposedRecipientName?: string;
  implementingTeam?: string;
  publicGoodsDestinationType?: MpgfPublicGoodsDestinationType;
  publicGoodsDestinationRef?: string;
  publicGoodsThresholdAmountCents?: number;
  publicGoodsThresholdSupporters?: number;
  publicGoodsFailureBonusEnabled?: boolean;
  publicGoodsFailureBonusRateBps?: number;
  publicGoodsFailureBonusEligibilityPolicy?: FailureBonusEligibilityPolicy;
  publicGoodsFailureBonusMaxParticipants?: number;
  publicGoodsFailureBonusMaxPerParticipantCents?: number;
  publicGoodsThresholdSchedule?: FailureBonusSuccessPremiumScheduleQuote;
  publicGoodsFailureBonusScheduleStatus?: FailureBonusScheduleStatus;
  publicGoodsSuccessPremiumRateBps?: number;
  publicGoodsSuccessPremiumCents?: number;
  publicGoodsSuccessPremiumPayer?: FailureBonusSuccessPremiumPayer;
  publicGoodsSuccessPremiumPolicyVersion?: string;
  publicGoodsSuccessPremiumIncludedInNetThreshold?: false;
  publicGoodsSuccessPremiumProvisional?: boolean;
  publicGoodsGrossSuccessRequirementCents?: number;
  publicGoodsSuccessPremiumPricingAssumptions?: FailureBonusSuccessPremiumPricingAssumptions;
  publicGoodsDeadlineAt?: string;
  publicGoodsVerificationMethod?: string;
  publicGoodsBaselineRule?: string;
  publicGoodsExitRule?: string;
  publicGoodsBaseMatchRatio?: number;
  publicGoodsQfEnabled?: boolean;
  publicGoodsQfCapMultiple?: number;
  publicGoodsPayoutMethod?: MpgfPublicGoodsCaptureMode;
  status: "draft" | "submitted" | "under_review" | "approved_as_candidate" | "rejected" | "withdrawn";
  candidateAlternativeId?: string;
  createdAt?: string;
}

export interface MpgfParticipantState {
  status: MpgfParticipantPersistenceStatus;
  userId?: string;
  displayName?: string;
  pledges: MpgfPledge[];
  recurringCommitments: MpgfRecurringContributionCommitment[];
  publicGoodsPledges: MpgfPublicGoodsPledge[];
  publicGoodsSubscriptions: MpgfPublicGoodsSubscription[];
  poolProposals: MpgfPoolProposalRecord[];
  ballots: MpgfBallot[];
  warnings: string[];
}

export interface MpgfParticipantActionResult<T = unknown> {
  ok: boolean;
  message: string;
  data?: T;
  state?: MpgfParticipantState;
  requiresAuth?: boolean;
}
