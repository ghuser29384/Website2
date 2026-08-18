import "server-only";

import { buildMpgfPublicGoodsCompactPublishedExamplesState, type MpgfPublicGoodsCompactsState } from "./public-goods-compacts";
import {
  clearMpgfPublicGoodsCompactDelegation as clearUncheckedDelegation,
  joinMpgfPublicGoodsCompact as joinUncheckedCompact,
  loadMpgfPublicGoodsCompactsState as loadUncheckedState,
  requestMpgfPublicGoodsCompactExit as requestUncheckedExit,
  setMpgfPublicGoodsCompactAllocation as setUncheckedAllocation,
  setMpgfPublicGoodsCompactDelegation as setUncheckedDelegation,
  type MpgfPublicGoodsCompactMutationResult,
} from "./public-goods-compacts-server";
import { assertMpgfPublicGoodsCompactMutationSafety, validateAndNormalizeMpgfPublicGoodsCompactsDatabaseState } from "./public-goods-compacts-state";

function invalidDatabaseState(): MpgfPublicGoodsCompactsState {
  return { ...buildMpgfPublicGoodsCompactPublishedExamplesState(), unavailableReason: "Durable Compact v2 state returned an invalid safety contract. Published examples are shown instead." };
}
export async function loadMpgfPublicGoodsCompactsState(): Promise<MpgfPublicGoodsCompactsState> {
  const state = await loadUncheckedState();
  if (!state.available) return state;
  const validated = validateAndNormalizeMpgfPublicGoodsCompactsDatabaseState(state);
  if (!validated) {
    console.error("[mpgf] Rejected incomplete or inconsistent Compact v2 state.");
    return invalidDatabaseState();
  }
  return validated;
}
async function safeMutation(mutation: Promise<MpgfPublicGoodsCompactMutationResult>, requiredFalseFlags: readonly string[]) {
  const result = assertMpgfPublicGoodsCompactMutationSafety(await mutation) as MpgfPublicGoodsCompactMutationResult;
  if (requiredFalseFlags.some((flag) => result[flag] !== false)) throw new Error("The Compact v2 mutation omitted an explicit no-money safety boundary.");
  return result;
}
export function joinMpgfPublicGoodsCompact(input: Parameters<typeof joinUncheckedCompact>[0]) {
  return safeMutation(joinUncheckedCompact(input), ["moneyMoved", "paymentMandateCreated", "automaticCollectionEnabled"]);
}
export function setMpgfPublicGoodsCompactAllocation(input: Parameters<typeof setUncheckedAllocation>[0]) {
  return safeMutation(setUncheckedAllocation(input), ["moneyMoved", "paymentMandateCreated", "automaticCollectionEnabled"]);
}
export function requestMpgfPublicGoodsCompactExit(input: Parameters<typeof requestUncheckedExit>[0]) {
  return safeMutation(requestUncheckedExit(input), ["moneyMoved", "paymentMandateChanged", "automaticCollectionEnabled"]);
}
export function setMpgfPublicGoodsCompactDelegation(input: Parameters<typeof setUncheckedDelegation>[0]) {
  return safeMutation(setUncheckedDelegation(input), ["membershipTransferred", "moneyTransferred", "reputationTransferred"]);
}
export function clearMpgfPublicGoodsCompactDelegation(input: Parameters<typeof clearUncheckedDelegation>[0]) {
  return safeMutation(clearUncheckedDelegation(input), ["membershipTransferred", "moneyTransferred", "reputationTransferred"]);
}
