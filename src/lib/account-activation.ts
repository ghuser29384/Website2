export type AccountActivationStatus = "started" | "completed" | null;

export type AccountLandingPath =
  | "/discover"
  | "/walkthrough"
  | "/complete-profile"
  | "/feed";

export interface AccountActivationState {
  authenticated: boolean;
  onboardingStatus: AccountActivationStatus;
  hasWalkthroughProfileDraft: boolean;
  hasSeenWalkthrough: boolean;
}

/**
 * Resolve the canonical landing route without treating a browser cookie as proof
 * that an account is new. Persisted completion always wins over stale local state.
 *
 * Until the Next.js walkthrough writes a persisted `started` row, the walkthrough
 * cookies keep an in-progress same-device setup recoverable. Accounts with neither
 * persisted nor local setup state are treated as existing accounts and sent to Feed.
 */
export function getAccountLandingPath({
  authenticated,
  onboardingStatus,
  hasWalkthroughProfileDraft,
  hasSeenWalkthrough,
}: AccountActivationState): AccountLandingPath {
  if (!authenticated) {
    return "/discover";
  }

  if (onboardingStatus === "completed") {
    return "/feed";
  }

  if (hasWalkthroughProfileDraft) {
    return "/complete-profile";
  }

  if (onboardingStatus === "started" || hasSeenWalkthrough) {
    return "/walkthrough";
  }

  return "/feed";
}
