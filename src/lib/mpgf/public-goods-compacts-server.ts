import "server-only";

import { hasSupabaseEnv } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

import {
  buildMpgfPublicGoodsCompactPublishedExamplesState,
  type MpgfPublicGoodsCompactsState,
} from "./public-goods-compacts";

interface RpcErrorLike {
  code?: string | null;
  message?: string | null;
  details?: string | null;
}

interface CompactRpcClient {
  rpc: (
    functionName: string,
    parameters?: Record<string, unknown>,
  ) => Promise<{ data: unknown; error: RpcErrorLike | null }>;
}

export interface MpgfPublicGoodsCompactMutationResult {
  ok: true;
  moneyMoved?: false;
  automaticCollectionEnabled?: false;
  [key: string]: unknown;
}

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
    "Unknown public-goods compact database error."
  );
}

async function getRpcClient() {
  return (await createClient()) as unknown as CompactRpcClient;
}

function unavailableState(reason: string): MpgfPublicGoodsCompactsState {
  return {
    ...buildMpgfPublicGoodsCompactPublishedExamplesState(),
    unavailableReason: reason,
  };
}

export async function loadMpgfPublicGoodsCompactsState(): Promise<MpgfPublicGoodsCompactsState> {
  if (!hasSupabaseEnv()) {
    return buildMpgfPublicGoodsCompactPublishedExamplesState();
  }

  try {
    const client = await getRpcClient();
    const { data, error } = await client.rpc(
      "get_mpgf_public_goods_compacts_state",
    );

    if (error) {
      if (!isMissingRpc(error)) {
        console.error("[mpgf] Could not load public-goods compacts.", {
          code: error.code,
          message: error.message,
        });
      }

      return unavailableState(
        "Durable compact membership state is unavailable. Published charter examples are shown without member counts or participant activity.",
      );
    }

    if (
      !isRecord(data) ||
      data.available !== true ||
      data.source !== "database" ||
      !Array.isArray(data.compacts) ||
      data.moneyMovesOnPageAction !== false ||
      data.automaticCollectionEnabled !== false
    ) {
      return unavailableState(
        "Durable compact membership state returned an invalid safety contract. Published charter examples are shown instead.",
      );
    }

    return data as unknown as MpgfPublicGoodsCompactsState;
  } catch (error) {
    console.error("[mpgf] Could not connect to public-goods compacts.", {
      message: error instanceof Error ? error.message : "Unknown error",
    });
    return unavailableState(
      "Durable compact membership state is temporarily unavailable. Published charter examples are shown without member counts or participant activity.",
    );
  }
}

async function runMutation<T extends MpgfPublicGoodsCompactMutationResult>(
  functionName: string,
  parameters: Record<string, unknown>,
) {
  if (!hasSupabaseEnv()) {
    throw new Error("Durable public-goods compact membership is not configured.");
  }

  const client = await getRpcClient();
  const { data, error } = await client.rpc(functionName, parameters);

  if (error) {
    if (isMissingRpc(error)) {
      throw new Error("Durable public-goods compact membership is not available yet.");
    }

    throw new Error(summarizeRpcError(error));
  }

  if (!isRecord(data) || data.ok !== true) {
    throw new Error("The public-goods compact mutation returned an invalid response.");
  }

  return data as T;
}

export function joinMpgfPublicGoodsCompact(input: {
  compactPublicKey: string;
  constitutionVersion: string;
  declaredEligibleMonthlySpendingCents: number;
  idempotencyKey: string;
}) {
  return runMutation<MpgfPublicGoodsCompactMutationResult>(
    "join_mpgf_public_goods_compact",
    {
      p_compact_public_key: input.compactPublicKey,
      p_constitution_version: input.constitutionVersion,
      p_declared_eligible_monthly_spending_cents:
        input.declaredEligibleMonthlySpendingCents,
      p_idempotency_key: input.idempotencyKey,
    },
  );
}

export function requestMpgfPublicGoodsCompactExit(input: {
  compactPublicKey: string;
  idempotencyKey: string;
}) {
  return runMutation<MpgfPublicGoodsCompactMutationResult>(
    "request_mpgf_public_goods_compact_exit",
    {
      p_compact_public_key: input.compactPublicKey,
      p_idempotency_key: input.idempotencyKey,
    },
  );
}

export function setMpgfPublicGoodsCompactDelegation(input: {
  compactPublicKey: string;
  electorateKey: string;
  delegateeMembershipId: string;
  idempotencyKey: string;
}) {
  return runMutation<MpgfPublicGoodsCompactMutationResult>(
    "set_mpgf_public_goods_compact_delegation",
    {
      p_compact_public_key: input.compactPublicKey,
      p_electorate_key: input.electorateKey,
      p_delegatee_membership_id: input.delegateeMembershipId,
      p_idempotency_key: input.idempotencyKey,
    },
  );
}

export function clearMpgfPublicGoodsCompactDelegation(input: {
  compactPublicKey: string;
  electorateKey: string;
  idempotencyKey: string;
}) {
  return runMutation<MpgfPublicGoodsCompactMutationResult>(
    "clear_mpgf_public_goods_compact_delegation",
    {
      p_compact_public_key: input.compactPublicKey,
      p_electorate_key: input.electorateKey,
      p_idempotency_key: input.idempotencyKey,
    },
  );
}
