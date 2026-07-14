import type { MpgfBallot, MpgfPledge, MpgfRecurringContributionCommitment } from "./types";

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
