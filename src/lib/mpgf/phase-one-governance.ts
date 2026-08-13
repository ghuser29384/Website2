import "server-only";

import { hasSupabaseEnv } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

import {
  MPGF_PHASE_ONE_BALLOT_POLICY,
  MPGF_PHASE_ONE_QUORUM_BPS,
  MPGF_PHASE_ONE_RESULT_EFFECT,
} from "./phase-one-governance-policy";

export type MpgfPhaseOneRoundStatus =
  | "draft"
  | "pledge_open"
  | "ballot_open"
  | "results_published"
  | "quorum_failed"
  | "closed"
  | "cancelled";

export interface MpgfPhaseOneProject {
  id: string;
  title: string;
  summary: string;
  recipientName: string;
  actionCategory: string;
  status:
    | "submitted"
    | "under_review"
    | "approved"
    | "paused"
    | "rejected"
    | "retired";
  checkoutAvailable: boolean;
}

export interface MpgfPhaseOneGovernanceState {
  available: boolean;
  unavailableReason?: string;
  round: {
    id: string;
    slug: string;
    title: string;
    status: MpgfPhaseOneRoundStatus;
    pledgeOpensAt: string | null;
    pledgeClosesAt: string | null;
    ballotOpensAt: string | null;
    ballotClosesAt: string | null;
    termsVersion: string;
  } | null;
  projects: MpgfPhaseOneProject[];
  results: {
    eligiblePledgerCount: number;
    submittedBallotCount: number;
    quorumRequiredCount: number;
    quorumMet: boolean;
    quorumBps: number;
    resultHash: string | null;
    binding: false;
    externalCheckoutConfirmationRequired: true;
    projectShares: Array<{
      projectId: string;
      title: string;
      creditScore: string;
      advisoryShareBps: number;
    }>;
  } | null;
  policy: {
    ballotPolicy: typeof MPGF_PHASE_ONE_BALLOT_POLICY;
    governanceWeightPerConfirmedPledger: 1;
    pledgeAmountAffectsWeight: false;
    quorumBps: typeof MPGF_PHASE_ONE_QUORUM_BPS;
    binding: false;
    externalCheckoutConfirmationRequired: true;
  };
}

export interface MpgfPhaseOneParticipantState {
  roundId: string;
  pledge: {
    id: string;
    amountCents: number;
    currency: "usd";
    status: "confirmed" | "cancelled" | "expired";
    confirmedAt: string;
    cancelledAt: string | null;
    termsVersion: string;
  } | null;
  eligibleToVote: boolean;
  ballot: {
    id: string;
    status: "submitted" | "invalidated";
    revision: number;
    selectionCount: number;
    selectedProjectIds: string[];
    submittedAt: string;
  } | null;
  checkoutHandoffs: Array<{
    id: string;
    projectId: string;
    amountCents: number;
    currency: "usd";
    status: "confirmed_external_handoff" | "cancelled";
    resultHash: string;
    confirmedAt: string;
    cancelledAt: string | null;
  }>;
}

export interface MpgfPhaseOneMutationResult {
  ok: true;
  [key: string]: unknown;
}

export interface MpgfPhaseOneCheckoutHandoffResult
  extends MpgfPhaseOneMutationResult {
  externalCheckoutUrl: string;
  moneyMoved: false;
  paymentConfirmed: false;
  receiptRecorded: false;
  nextAction: "complete_external_checkout";
}

interface RpcErrorLike {
  code?: string | null;
  message?: string | null;
  details?: string | null;
}

interface RpcClient {
  rpc: (
    functionName: string,
    parameters?: Record<string, unknown>,
  ) => Promise<{ data: unknown; error: RpcErrorLike | null }>;
}

const unavailableState: MpgfPhaseOneGovernanceState = {
  available: false,
  unavailableReason: "Phase-one governance is not available yet.",
  round: null,
  projects: [],
  results: null,
  policy: {
    ballotPolicy: MPGF_PHASE_ONE_BALLOT_POLICY,
    governanceWeightPerConfirmedPledger: 1,
    pledgeAmountAffectsWeight: false,
    quorumBps: MPGF_PHASE_ONE_QUORUM_BPS,
    binding: false,
    externalCheckoutConfirmationRequired: true,
  },
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function isMissingRpc(error: RpcErrorLike) {
  return (
    error.code === "PGRST202" ||
    /could not find the function|function .* does not exist/i.test(
      error.message ?? error.details ?? "",
    )
  );
}

function summarizeRpcError(error: RpcErrorLike) {
  return (
    [error.code, error.message ?? error.details].filter(Boolean).join(": ") ||
    "Unknown MPGF database error."
  );
}

function assertSafePositiveCents(value: number) {
  if (!Number.isSafeInteger(value) || value <= 0) {
    throw new Error("Amount must be a positive integer number of cents.");
  }
}

async function getRpcClient() {
  return (await createClient()) as unknown as RpcClient;
}

async function runMutation<T extends MpgfPhaseOneMutationResult>(
  functionName: string,
  parameters: Record<string, unknown>,
) {
  if (!hasSupabaseEnv()) {
    throw new Error("Phase-one governance is not configured.");
  }

  const client = await getRpcClient();
  const { data, error } = await client.rpc(functionName, parameters);

  if (error) {
    if (isMissingRpc(error)) {
      throw new Error("Phase-one governance is not available yet.");
    }

    throw new Error(summarizeRpcError(error));
  }

  if (!isRecord(data) || data.ok !== true) {
    throw new Error("Phase-one governance returned an invalid response.");
  }

  return data as T;
}

export async function loadMpgfPhaseOneGovernanceState(
  roundId?: string | null,
): Promise<MpgfPhaseOneGovernanceState> {
  if (!hasSupabaseEnv()) {
    return unavailableState;
  }

  try {
    const client = await getRpcClient();
    const { data, error } = await client.rpc(
      "get_mpgf_phase_one_governance_state",
      { p_round_id: roundId ?? null },
    );

    if (error) {
      if (!isMissingRpc(error)) {
        console.error("[mpgf] Could not load phase-one governance state.", {
          code: error.code,
          message: error.message,
        });
      }

      return unavailableState;
    }

    if (!isRecord(data) || typeof data.available !== "boolean") {
      return {
        ...unavailableState,
        unavailableReason: "Phase-one governance returned an invalid public state.",
      };
    }

    return data as unknown as MpgfPhaseOneGovernanceState;
  } catch (error) {
    console.error("[mpgf] Could not connect to phase-one governance.", {
      message: error instanceof Error ? error.message : "Unknown error",
    });
    return {
      ...unavailableState,
      unavailableReason: "Phase-one governance is temporarily unavailable.",
    };
  }
}

export async function loadMpgfPhaseOneParticipantState(
  roundId: string,
): Promise<MpgfPhaseOneParticipantState | null> {
  if (!hasSupabaseEnv()) {
    return null;
  }

  const client = await getRpcClient();
  const { data, error } = await client.rpc(
    "get_mpgf_phase_one_participant_state",
    { p_round_id: roundId },
  );

  if (error) {
    if (isMissingRpc(error)) {
      return null;
    }

    throw new Error(summarizeRpcError(error));
  }

  return isRecord(data)
    ? (data as unknown as MpgfPhaseOneParticipantState)
    : null;
}

export function confirmMpgfPhaseOnePledge(input: {
  roundId: string;
  amountCents: number;
  idempotencyKey: string;
}) {
  assertSafePositiveCents(input.amountCents);

  return runMutation<MpgfPhaseOneMutationResult>(
    "confirm_mpgf_phase_one_pledge",
    {
      p_round_id: input.roundId,
      p_amount_cents: input.amountCents,
      p_idempotency_key: input.idempotencyKey,
    },
  );
}

export function cancelMpgfPhaseOnePledge(input: {
  roundId: string;
  idempotencyKey: string;
}) {
  return runMutation<MpgfPhaseOneMutationResult>(
    "cancel_mpgf_phase_one_pledge",
    {
      p_round_id: input.roundId,
      p_idempotency_key: input.idempotencyKey,
    },
  );
}

export function submitMpgfPhaseOneBallot(input: {
  roundId: string;
  projectIds: string[];
  idempotencyKey: string;
}) {
  return runMutation<MpgfPhaseOneMutationResult>(
    "submit_mpgf_phase_one_ballot",
    {
      p_round_id: input.roundId,
      p_project_ids: input.projectIds,
      p_idempotency_key: input.idempotencyKey,
    },
  );
}

export function confirmMpgfPhaseOneCheckoutHandoff(input: {
  roundId: string;
  projectId: string;
  amountCents: number;
  resultHash: string;
  idempotencyKey: string;
}) {
  assertSafePositiveCents(input.amountCents);

  return runMutation<MpgfPhaseOneCheckoutHandoffResult>(
    "confirm_mpgf_phase_one_external_checkout",
    {
      p_round_id: input.roundId,
      p_project_id: input.projectId,
      p_amount_cents: input.amountCents,
      p_result_hash: input.resultHash,
      p_idempotency_key: input.idempotencyKey,
    },
  );
}

export const MPGF_PHASE_ONE_GOVERNANCE_CONTRACT = {
  ballotPolicy: MPGF_PHASE_ONE_BALLOT_POLICY,
  resultEffect: MPGF_PHASE_ONE_RESULT_EFFECT,
  quorumBps: MPGF_PHASE_ONE_QUORUM_BPS,
  pledgeAmountAffectsWeight: false,
  binding: false,
  moneyMovesOnMoralTrade: false,
} as const;
