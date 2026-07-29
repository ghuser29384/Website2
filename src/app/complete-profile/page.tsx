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
import { hasSupabaseEnv } from "@/lib/supabase/config";
import {
  getDisconnectedXProfileConnectorStatus,
  getXProfileConnectorStatus,
} from "@/lib/x-profile-connector";
import {
  getWalkthroughProfileDraft,
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
  const walkthroughDraft = getWalkthroughProfileDraft({
    cookieValue: cookieStore.get(WALKTHROUGH_PROFILE_COOKIE_NAME)?.value,
    searchParams: resolvedSearchParams,
  });

  if (!walkthroughDraft) {
    redirect("/walkthrough");
  }

  const supabaseReady = hasSupabaseEnv();
  const viewer =
    supabaseReady && hasSupabaseAuthCookie(cookieStore) ? await getViewer() : null;
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
  const returnTo = buildCompleteProfilePath(walkthroughDraft);
  const signupHref = `/signup?method=email&returnTo=${encodeURIComponent(returnTo)}`;
  const loginHref = `/login?method=email&returnTo=${encodeURIComponent(returnTo)}`;
  const initialConnectionsOpen =
    readSearchParam(resolvedSearchParams.sources) === "x" ||
    readSearchParam(resolvedSearchParams.panel) === "connections";

  return (
    <div className={styles.pageShell}>
      <CompleteProfileConnections
        key={initialConnectionsOpen ? "connections-open" : "connections-closed"}
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

        <CompleteProfileReview
          accountEmail={viewer?.profile.email ?? ""}
          draft={walkthroughDraft}
          initialAffiliation={initialAffiliation}
          initialDisplayName={viewer?.displayName ?? ""}
          isAuthenticated={Boolean(viewer)}
          loginHref={loginHref}
          returnTo={returnTo}
          signupHref={signupHref}
        />
      </main>
    </div>
  );
}
