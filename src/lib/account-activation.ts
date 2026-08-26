export const ACCOUNT_ACTIVATION_STAGES = [
  "walkthrough_required",
  "sparks_required",
  "setup_complete",
] as const;

export const ACCOUNT_ACTIVATION_UNAVAILABLE_PATH = "/account-state-unavailable";

export type AccountActivationStage = (typeof ACCOUNT_ACTIVATION_STAGES)[number];

export type AccountActivationState =
  | { kind: "signed_out" }
  | { kind: "unavailable" }
  | { kind: "available"; stage: AccountActivationStage };

interface ActivationProfileLike {
  activation_stage?: unknown;
}

interface ActivationViewerLike {
  profile: ActivationProfileLike;
  profileStatus: "loaded" | "created" | "fallback";
  profileSyncError: string | null;
}

export function isAccountActivationStage(value: unknown): value is AccountActivationStage {
  return ACCOUNT_ACTIVATION_STAGES.includes(value as AccountActivationStage);
}

export function getAccountActivationState({
  authenticated,
  viewer,
}: {
  authenticated: boolean;
  viewer: ActivationViewerLike | null;
}): AccountActivationState {
  if (!authenticated) {
    return { kind: "signed_out" };
  }

  if (
    !viewer ||
    viewer.profileStatus === "fallback" ||
    viewer.profileSyncError ||
    !isAccountActivationStage(viewer.profile.activation_stage)
  ) {
    return { kind: "unavailable" };
  }

  return {
    kind: "available",
    stage: viewer.profile.activation_stage,
  };
}

export function getRootActivationDestination(state: AccountActivationState) {
  if (state.kind === "signed_out") {
    return "/discover";
  }

  if (state.kind === "unavailable") {
    return ACCOUNT_ACTIVATION_UNAVAILABLE_PATH;
  }

  if (state.stage === "walkthrough_required") {
    return "/walkthrough";
  }

  if (state.stage === "sparks_required") {
    return "/complete-profile";
  }

  return "/feed";
}

export function getWalkthroughActivationDestination(state: AccountActivationState) {
  if (state.kind === "signed_out") {
    return null;
  }

  if (state.kind === "unavailable") {
    return ACCOUNT_ACTIVATION_UNAVAILABLE_PATH;
  }

  if (state.stage === "walkthrough_required") return null;

  return state.stage === "sparks_required" ? "/complete-profile" : "/feed";
}

export function getCompleteProfileActivationDestination(state: AccountActivationState) {
  if (state.kind === "unavailable") {
    return ACCOUNT_ACTIVATION_UNAVAILABLE_PATH;
  }

  if (state.kind === "signed_out" || state.stage === "walkthrough_required") {
    return "/walkthrough";
  }

  return null;
}

export function getPostAuthActivationDestination(
  state: AccountActivationState,
  requestedDestination: string,
) {
  if (state.kind !== "available") {
    return ACCOUNT_ACTIVATION_UNAVAILABLE_PATH;
  }

  if (state.stage === "walkthrough_required") {
    return "/walkthrough";
  }

  if (state.stage === "sparks_required") {
    return "/complete-profile";
  }

  return requestedDestination;
}
