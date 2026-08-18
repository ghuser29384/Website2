import "server-only";

import { hasSupabaseEnv } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";
import {
  buildMpgfPublicGoodsCompactPublishedExamplesState,
  type MpgfPublicGoodsCompactAcknowledgements,
  type MpgfPublicGoodsCompactsState,
} from "./public-goods-compacts";

interface RpcErrorLike { code?: string | null; message?: string | null; details?: string | null }
interface CompactRpcClient {
  rpc: (functionName: string, parameters?: Record<string, unknown>) => Promise<{ data: unknown; error: RpcErrorLike | null }>;
}
export interface MpgfPublicGoodsCompactMutationResult {
  ok: true;
  moneyMoved?: false;
  automaticCollectionEnabled?: false;
  paymentMandateCreated?: false;
  paymentMandateChanged?: false;
  membershipTransferred?: false;
  moneyTransferred?: false;
  reputationTransferred?: false;
  [key: string]: unknown;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
function isMissingRpc(error: RpcErrorLike) {
  return error.code === "PGRST202" || /could not find the function|function .* does not exist/i.test(error.message ?? error.details ?? "");
}
function summarizeRpcError(error: RpcErrorLike) {
  return [error.code, error.message ?? error.details].filter(Boolean).join(": ") || "Unknown public-goods Compact database error.";
}
async function getRpcClient() {
  return (await createClient()) as unknown as CompactRpcClient;
}
function unavailableState(reason: string): MpgfPublicGoodsCompactsState {
  return { ...buildMpgfPublicGoodsCompactPublishedExamplesState(), unavailableReason: reason };
}

export async function loadMpgfPublicGoodsCompactsState(): Promise<MpgfPublicGoodsCompactsState> {
  if (!hasSupabaseEnv()) return buildMpgfPublicGoodsCompactPublishedExamplesState();
  try {
    const client = await getRpcClient();
    const { data, error } = await client.rpc("get_mpgf_public_goods_compacts_v2_state");
    if (error) {
      if (!isMissingRpc(error)) console.error("[mpgf] Could not load Compact v2 state.", { code: error.code, message: error.message });
      return unavailableState("Durable Compact v2 state is unavailable. No payment, identity, readiness, or voting facts are inferred.");
    }
    return data as MpgfPublicGoodsCompactsState;
  } catch (error) {
    console.error("[mpgf] Could not connect to Compact v2 state.", { message: error instanceof Error ? error.message : "Unknown error" });
    return unavailableState("Durable Compact v2 state is temporarily unavailable. No payment, identity, readiness, or voting facts are inferred.");
  }
}

async function runMutation<T extends MpgfPublicGoodsCompactMutationResult>(functionName: string, parameters: Record<string, unknown>) {
  if (!hasSupabaseEnv()) throw new Error("Durable Compact v2 membership is not configured.");
  const { data, error } = await (await getRpcClient()).rpc(functionName, parameters);
  if (error) {
    if (isMissingRpc(error)) throw new Error("Durable Compact v2 membership is not available yet.");
    throw new Error(summarizeRpcError(error));
  }
  if (!isRecord(data) || data.ok !== true) throw new Error("The Compact v2 mutation returned an invalid response.");
  return data as T;
}

export function joinMpgfPublicGoodsCompact(input: {
  compactPublicKey: string;
  constitutionVersion: string;
  acknowledgements: MpgfPublicGoodsCompactAcknowledgements;
  idempotencyKey: string;
}) {
  return runMutation<MpgfPublicGoodsCompactMutationResult>("join_mpgf_public_goods_compact_v2", {
    p_compact_public_key: input.compactPublicKey,
    p_constitution_version: input.constitutionVersion,
    p_acknowledgements: input.acknowledgements,
    p_idempotency_key: input.idempotencyKey,
  });
}

export function setMpgfPublicGoodsCompactAllocation(input: { allocationBps: Record<string, number>; idempotencyKey: string }) {
  return runMutation<MpgfPublicGoodsCompactMutationResult>("set_mpgf_public_goods_compact_allocation_v2", {
    p_allocation_bps: input.allocationBps,
    p_idempotency_key: input.idempotencyKey,
  });
}

export function requestMpgfPublicGoodsCompactExit(input: { compactPublicKey: string; idempotencyKey: string }) {
  return runMutation<MpgfPublicGoodsCompactMutationResult>("request_mpgf_public_goods_compact_exit_v2", {
    p_compact_public_key: input.compactPublicKey,
    p_idempotency_key: input.idempotencyKey,
  });
}

export function setMpgfPublicGoodsCompactDelegation(input: { compactPublicKey: string; cycleKey: string; delegateeMembershipId: string; idempotencyKey: string }) {
  return runMutation<MpgfPublicGoodsCompactMutationResult>("set_mpgf_public_goods_compact_delegation_v2", {
    p_compact_public_key: input.compactPublicKey,
    p_cycle_key: input.cycleKey,
    p_delegatee_membership_id: input.delegateeMembershipId,
    p_idempotency_key: input.idempotencyKey,
  });
}

export function clearMpgfPublicGoodsCompactDelegation(input: { compactPublicKey: string; cycleKey: string; idempotencyKey: string }) {
  return runMutation<MpgfPublicGoodsCompactMutationResult>("clear_mpgf_public_goods_compact_delegation_v2", {
    p_compact_public_key: input.compactPublicKey,
    p_cycle_key: input.cycleKey,
    p_idempotency_key: input.idempotencyKey,
  });
}
