export type MpgfCompletionProfile = "demo_complete" | "exact_pilot_complete" | "real_money_complete";

export type MpgfValidationStatus = "passed" | "failed";

export interface MpgfValidationIssue {
  id: string;
  message: string;
  path?: string;
}

export interface MpgfValidationResult {
  status: MpgfValidationStatus;
  generatedAt: string;
  validatorName: string;
  validatorVersion: string;
  errors: MpgfValidationIssue[];
  warnings: MpgfValidationIssue[];
  blockers: MpgfValidationIssue[];
}

export interface MpgfCheckResult {
  id: string;
  label: string;
  status: MpgfValidationStatus;
  evidence: string;
  routeOrAction: string;
  check: string;
  passed: boolean;
}

export interface MpgfCandidateAlternative {
  id: string;
  name: string;
  shortName: string;
  causeArea: string;
  recipientName: string;
  description: string;
  moralPublicGoodRationale: string;
  outcomeUnit: string;
  status: "approved_demo" | "carryover_only";
  operationalReliabilityBps: number;
  riskBps: number;
  tailLossBps: number;
  demoPriorityBps: number;
}

export interface MpgfCycle {
  id: string;
  label: string;
  stage: "pilot" | "public_beta" | "mature";
  mode: "non_real_money_demo" | "pledge_only" | "test_mode" | "real_money";
  contributionMode: "pledge_only";
  currency: "usd";
  budgetCents: number;
  proposalOpensAt: string;
  ballotOpensAt: string;
  ballotClosesAt: string;
  summaryPublishedAt: string;
  protocolParameterVersion: string;
  termsVersion: string;
  privacyVersion: string;
}

export interface MpgfBallotWeight {
  alternativeId: string;
  valueBps: number;
  strongNegative: boolean;
}

export interface MpgfBallot {
  id: string;
  voterLabel: string;
  cycleId: string;
  weights: MpgfBallotWeight[];
}

export interface MpgfPledge {
  id: string;
  contributorLabel: string;
  amountCents: number;
  cadence: "one_time" | "monthly";
  status: "pledged" | "paused" | "cancelled";
}

export interface MpgfAllocationLine {
  alternativeId: string;
  name: string;
  scoreBps: number;
  allocationCents: number;
  remainderNumerator: bigint;
}

export interface MpgfAllocationResult {
  cycleId: string;
  budgetCents: number;
  allocatedCents: number;
  carryoverCents: number;
  lines: MpgfAllocationLine[];
  certificate: {
    algorithm: "exact_integer_proportional_v0";
    totalScoreBps: number;
    deterministicTieBreak: "alternative_id_ascending";
    generatedAt: string;
  };
}

export interface MpgfLedgerEntry {
  account: string;
  direction: "debit" | "credit";
  amountCents: number;
  currency: "usd";
}

export interface MpgfLedgerTransaction {
  id: string;
  templateId: string;
  description: string;
  entries: MpgfLedgerEntry[];
}

export interface MpgfPublicSummary {
  cycleId: string;
  mode: MpgfCycle["mode"];
  nonRealMoneyStatus: string;
  budgetCents: number;
  pledgedCents: number;
  releasedInternalCents: number;
  payoutAuthorizedCents: number;
  externallyPaidCents: number;
  allocations: Array<{
    alternativeId: string;
    name: string;
    allocationCents: number;
    outcomeUnit: string;
  }>;
  disclaimers: Record<string, string>;
}

export interface MpgfDirectWorkingResult {
  passed: boolean;
  baseUrl: string;
  checkedAt: string;
  environment: "local" | "test" | "staging" | "production";
  featureMode: "demo" | "pledge_only" | "test_mode";
  deployedCommitShaOrBuildId?: string;
  checks: MpgfCheckResult[];
  status: MpgfValidationStatus;
  blockers: MpgfValidationIssue[];
  generatedAt: string;
}
