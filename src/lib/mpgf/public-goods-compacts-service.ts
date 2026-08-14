import "server-only";

import {
  buildMpgfPublicGoodsCompactPublishedExamplesState,
  type MpgfPublicGoodsCompactsState,
} from "./public-goods-compacts";
import {
  clearMpgfPublicGoodsCompactDelegation as clearUncheckedDelegation,
  joinMpgfPublicGoodsCompact as joinUncheckedCompact,
  loadMpgfPublicGoodsCompactsState as loadUncheckedState,
  requestMpgfPublicGoodsCompactExit as requestUncheckedExit,
  setMpgfPublicGoodsCompactDelegation as setUncheckedDelegation,
  type MpgfPublicGoodsCompactMutationResult,
} from "./public-goods-compacts-server";
import {
  assertMpgfPublicGoodsCompactMutationSafety,
  validateAndNormalizeMpgfPublicGoodsCompactsDatabaseState,
} from "./public-goods-compacts-state";

function invalidDatabaseState(): MpgfPublicGoodsCompactsState {
  return {
    ...buildMpgfPublicGoodsCompactPublishedExamplesState(),
    unavailableReason:
      "Durable compact membership state returned an invalid safety contract. Published charter examples are shown instead.",
  };
}

export async function loadMpgfPublicGoodsCompactsState(): Promise<MpgfPublicGoodsCompactsState> {
  const state = await loadUncheckedState();

  if (!state.available) {
    return state;
  }

  const validated =
    validateAndNormalizeMpgfPublicGoodsCompactsDatabaseState(state);

  if (!validated) {
    console.error(
      "[mpgf] Rejected incomplete or internally inconsistent compact state.",
    );
    return invalidDatabaseState();
  }

  return validated;
}

async function safeMutation(
  mutation: Promise<MpgfPublicGoodsCompactMutationResult>,
) {
  const result = await mutation;
  return assertMpgfPublicGoodsCompactMutationSafety(
    result,
  ) as MpgfPublicGoodsCompactMutationResult;
}

export function joinMpgfPublicGoodsCompact(
  input: Parameters<typeof joinUncheckedCompact>[0],
) {
  return safeMutation(joinUncheckedCompact(input));
}

export function requestMpgfPublicGoodsCompactExit(
  input: Parameters<typeof requestUncheckedExit>[0],
) {
  return safeMutation(requestUncheckedExit(input));
}

export function setMpgfPublicGoodsCompactDelegation(
  input: Parameters<typeof setUncheckedDelegation>[0],
) {
  return safeMutation(setUncheckedDelegation(input));
}

export function clearMpgfPublicGoodsCompactDelegation(
  input: Parameters<typeof clearUncheckedDelegation>[0],
) {
  return safeMutation(clearUncheckedDelegation(input));
}
