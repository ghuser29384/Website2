import "server-only";

import { hasSupabaseEnv } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";

import {
  MPGF_PUBLIC_GOODS_COMPACT_COLLECTION_GATE,
  MPGF_PUBLIC_GOODS_COMPACT_CONSTITUTION_VERSION,
  MPGF_PUBLIC_GOODS_COMPACT_FOUNDING_CHARTERS,
  MPGF_PUBLIC_GOODS_COMPACT_INVARIANTS,
  MPGF_PUBLIC_GOODS_COMPACT_REQUIRED_ACKNOWLEDGEMENTS,
  MPGF_PUBLIC_GOODS_COMPACT_TERMS,
  buildMpgfPublicGoodsCompactPublishedExamplesState,
  calculateMpgfPublicGoodsCompactContributionCents,
  type MpgfPublicGoodsCompactAcknowledgements,
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

function hasExactAcknowledgements(
  value: unknown,
): value is MpgfPublicGoodsCompactAcknowledgements {
  if (!isRecord(value)) {
    return false;
  }

  const requiredKeys = Object.keys(
    MPGF_PUBLIC_GOODS_COMPACT_REQUIRED_ACKNOWLEDGEMENTS,
  );

  return (
    Object.keys(value).length === requiredKeys.length &&
    requiredKeys.every((key) => value[key] === true)
  );
}

function hasExactTerms(value: unknown) {
  return (
    isRecord(value) &&
    value.contributionRateBps === MPGF_PUBLIC_GOODS_COMPACT_TERMS.contributionRateBps &&
    value.monthlyContributionCapCents ===
      MPGF_PUBLIC_GOODS_COMPACT_TERMS.monthlyContributionCapCents &&
    value.activationThresholdMembers ===
      MPGF_PUBLIC_GOODS_COMPACT_TERMS.activationThresholdMembers &&
    value.minimumTermMonths === MPGF_PUBLIC_GOODS_COMPACT_TERMS.minimumTermMonths &&
    value.exitNoticeDays === MPGF_PUBLIC_GOODS_COMPACT_TERMS.exitNoticeDays &&
    value.projectSelectionRule ===
      MPGF_PUBLIC_GOODS_COMPACT_TERMS.projectSelectionRule &&
    value.auditRule === MPGF_PUBLIC_GOODS_COMPACT_TERMS.auditRule &&
    value.noProjectOptOutRule ===
      MPGF_PUBLIC_GOODS_COMPACT_TERMS.noProjectOptOutRule
  );
}

function hasExactInvariants(value: unknown) {
  return (
    isRecord(value) &&
    value.optInOnly === MPGF_PUBLIC_GOODS_COMPACT_INVARIANTS.optInOnly &&
    value.randomAssignmentAllowed ===
      MPGF_PUBLIC_GOODS_COMPACT_INVARIANTS.randomAssignmentAllowed &&
    value.coreMarketplaceTaxed ===
      MPGF_PUBLIC_GOODS_COMPACT_INVARIANTS.coreMarketplaceTaxed &&
    value.bindingOnlyAfterActivation ===
      MPGF_PUBLIC_GOODS_COMPACT_INVARIANTS.bindingOnlyAfterActivation &&
    value.perProjectRefusalAllowedAfterActivation ===
      MPGF_PUBLIC_GOODS_COMPACT_INVARIANTS.perProjectRefusalAllowedAfterActivation &&
    value.exitProspectiveOnlyAfterActivation ===
      MPGF_PUBLIC_GOODS_COMPACT_INVARIANTS.exitProspectiveOnlyAfterActivation &&
    value.moneyMovesOnJoin ===
      MPGF_PUBLIC_GOODS_COMPACT_INVARIANTS.moneyMovesOnJoin &&
    value.automaticCollectionEnabled ===
      MPGF_PUBLIC_GOODS_COMPACT_INVARIANTS.automaticCollectionEnabled
  );
}

function hasSafeMembership(value: unknown, compactPublicKey: string) {
  if (value === null) {
    return true;
  }

  if (
    !isRecord(value) ||
    value.compactPublicKey !== compactPublicKey ||
    value.constitutionVersionAccepted !==
      MPGF_PUBLIC_GOODS_COMPACT_CONSTITUTION_VERSION ||
    !hasExactAcknowledgements(value.acknowledgements) ||
    !Number.isSafeInteger(value.declaredEligibleMonthlySpendingCents) ||
    (value.declaredEligibleMonthlySpendingCents as number) < 0 ||
    !Number.isSafeInteger(value.scheduledMonthlyContributionCents)
  ) {
    return false;
  }

  try {
    return (
      value.scheduledMonthlyContributionCents ===
      calculateMpgfPublicGoodsCompactContributionCents(
        value.declaredEligibleMonthlySpendingCents as number,
      )
    );
  } catch {
    return false;
  }
}

function hasSafeCompactState(value: unknown) {
  if (!isRecord(value)) {
    return false;
  }

  const foundingCharter = MPGF_PUBLIC_GOODS_COMPACT_FOUNDING_CHARTERS.find(
    (charter) => charter.publicKey === value.publicKey,
  );

  return Boolean(
    foundingCharter &&
      value.causeKey === foundingCharter.causeKey &&
      value.title === foundingCharter.title &&
      value.constitutionVersion === MPGF_PUBLIC_GOODS_COMPACT_CONSTITUTION_VERSION &&
      value.collectionState === MPGF_PUBLIC_GOODS_COMPACT_COLLECTION_GATE &&
      hasExactTerms(value.terms) &&
      hasExactInvariants(value.invariants) &&
      Number.isSafeInteger(value.acceptedMemberCount) &&
      (value.acceptedMemberCount as number) >= 0 &&
      value.memberCountAvailable === true &&
      hasSafeMembership(value.membership, foundingCharter.publicKey),
  );
}

function isSafeDatabaseState(value: unknown): value is MpgfPublicGoodsCompactsState {
  if (
    !isRecord(value) ||
    value.available !== true ||
    value.source !== "database" ||
    !Array.isArray(value.compacts) ||
    value.compacts.length !== MPGF_PUBLIC_GOODS_COMPACT_FOUNDING_CHARTERS.length ||
    value.moneyMovesOnPageAction !== false ||
    value.automaticCollectionEnabled !== false ||
    !value.compacts.every(hasSafeCompactState)
  ) {
    return false;
  }

  return (
    new Set(value.compacts.map((compact) => (compact as Record<string, unknown>).publicKey))
      .size === MPGF_PUBLIC_GOODS_COMPACT_FOUNDING_CHARTERS.length
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

    if (!isSafeDatabaseState(data)) {
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
  acknowledgements: MpgfPublicGoodsCompactAcknowledgements;
  declaredEligibleMonthlySpendingCents: number;
  idempotencyKey: string;
}) {
  return runMutation<MpgfPublicGoodsCompactMutationResult>(
    "join_mpgf_public_goods_compact",
    {
      p_compact_public_key: input.compactPublicKey,
      p_constitution_version: input.constitutionVersion,
      p_acknowledgements: input.acknowledgements,
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
