import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import {
  CompleteProfileConnections,
  type CompleteProfileXConnectionSummary,
} from "@/components/profile/complete-profile-connections";
import { CompleteProfileReview } from "@/components/profile/complete-profile-review";
import { getViewer } from "@/lib/app-data";
import { getFormMessage } from "@/lib/form-state";
import { getSafeInternalPath } from "@/lib/paths";
import { hasSupabaseEnv } from "@/lib/supabase/config";
import { WALKTHROUGH_SEEN_COOKIE_NAME } from "@/lib/walkthrough-state";
import {
  getDisconnectedXProfileConnectorStatus,
  getXProfileConnectorStatus,
} from "@/lib/x-profile-connector";
import {
  getCompleteProfileDraft,
  type WalkthroughProfileDraft,
  WALKTHROUGH_PROFILE_COOKIE_NAME,
} from "@/lib/walkthrough-profile";

import styles from "./page.module.css";

export const metadata: Metadata = {
  title: "Complete your profile",
  description:
    "Rank your priorities with a private, coarse 100-spark mosaic before saving your Moral Trade profile.",
  robots: {
    index: false,
    follow: false,
  },
};

interface CompleteProfilePageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

function buildCompleteProfilePath(draft: WalkthroughProfileDraft) {
  if (draft.source === "direct") return "/complete-profile";

  const query = new URLSearchParams({
    source: "walkthrough",
    cause_area: draft.causeArea,
    walkthrough_cause: draft.originalCause,
    offer_type: draft.offerType,
    match_name: draft.matchName,
    match_get: draft.matchGet,
    match_give: draft.matchGive,
  });

  return `/complete-profile?${query.toString()}`;
}

function hasSupabaseAuthCookie(cookieStore: Awaited<ReturnType<typeof cookies>>) {
  return cookieStore
    .getAll()
    .some(({ name }) => /^sb-.+-auth-token(?:\.\d+)?$/.test(name));
}

function readSearchParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

export default async function CompleteProfilePage({ searchParams }: CompleteProfilePageProps) {
  const resolvedSearchParams = await searchParams;
  const cookieStore = await cookies();
  const usernamePromptRequested =
    readSearchParam(resolvedSearchParams.username_required) === "1";
  const profileDraft = getCompleteProfileDraft({
    allowDirect:
      usernamePromptRequested ||
      cookieStore.get(WALKTHROUGH_SEEN_COOKIE_NAME)?.value === "1",
    cookieValue: cookieStore.get(WALKTHROUGH_PROFILE_COOKIE_NAME)?.value,
    searchParams: resolvedSearchParams,
  });

  if (!profileDraft) {
    redirect("/walkthrough");
  }

  const supabaseReady = hasSupabaseEnv();
  const viewer =
    supabaseReady && hasSupabaseAuthCookie(cookieStore) ? await getViewer() : null;
  const initialUsername = viewer?.profile.username ?? "";
  const initialPublicInvitationMentionsEnabled =
    viewer?.profile.public_invitation_mentions_enabled ?? true;
  const initialAffiliation = (
    viewer?.profile as unknown as { affiliation?: string | null } | undefined
  )?.affiliation ?? "";
  const formMessage = getFormMessage(resolvedSearchParams);
  const xConnectorStatus = viewer
    ? await getXProfileConnectorStatus(viewer.authUser.id)
    : getDisconnectedXProfileConnectorStatus();
  const xConnection: CompleteProfileXConnectionSummary = {
    accessStatus: xConnectorStatus.accessStatus,
    connected: xConnectorStatus.accessStatus === "connected",
    retentionExpiresAt: xConnectorStatus.retentionExpiresAt,
    username: xConnectorStatus.username,
  };
  const requestedSuccessTo = getSafeInternalPath(
    readSearchParam(resolvedSearchParams.next),
    "/feed",
  );
  const baseReturnTo = buildCompleteProfilePath(profileDraft);
  const returnTo = usernamePromptRequested
    ? `${baseReturnTo}${baseReturnTo.includes("?") ? "&" : "?"}${new URLSearchParams({
        username_required: "1",
        next: requestedSuccessTo,
      }).toString()}`
    : baseReturnTo;
  const signupHref = `/signup?method=email&returnTo=${encodeURIComponent(returnTo)}`;
  const loginHref = `/login?method=email&returnTo=${encodeURIComponent(returnTo)}`;
  const initialConnectionsOpen =
    readSearchParam(resolvedSearchParams.sources) === "x" ||
    readSearchParam(resolvedSearchParams.panel) === "connections";

  return (
    <div className={styles.pageShell} data-mt-surface="complete-profile">
      <CompleteProfileConnections
        feedback={formMessage}
        initialOpen={initialConnectionsOpen}
        isAuthenticated={Boolean(viewer)}
        loginHref={loginHref}
        returnTo={returnTo}
        signupHref={signupHref}
        xAvailabilityReason={xConnectorStatus.availability.reason}
        xConnection={xConnection}
        xEnabled={xConnectorStatus.availability.enabled}
      />

      <main id="main-content" tabIndex={-1}>
        {!supabaseReady ? (
          <div className={`${styles.statusBanner} ${styles.statusError}`} role="alert">
            Account storage is unavailable. Contact support before continuing.
          </div>
        ) : null}

        {formMessage ? (
          <div
            className={`${styles.statusBanner} ${
              formMessage.tone === "error" ? styles.statusError : ""
            }`}
            role={formMessage.tone === "error" ? "alert" : "status"}
          >
            {formMessage.text}
          </div>
        ) : null}

        {usernamePromptRequested && viewer && !initialUsername ? (
          <div className={styles.statusBanner} role="status">
            Choose a unique public username before continuing. Moral Trade does not generate one for existing accounts.
          </div>
        ) : null}

        <CompleteProfileReview
          accountEmail={viewer?.profile.email ?? ""}
          draft={profileDraft}
          initialAffiliation={initialAffiliation}
          initialDisplayName={viewer?.displayName ?? ""}
          initialUsername={initialUsername}
          initialPublicInvitationMentionsEnabled={initialPublicInvitationMentionsEnabled}
          initialDetailsOpen={usernamePromptRequested && Boolean(viewer) && !initialUsername}
          isAuthenticated={Boolean(viewer)}
          loginHref={loginHref}
          returnTo={returnTo}
          signupHref={signupHref}
          successTo={requestedSuccessTo}
        />
      </main>
    </div>
  );
}
