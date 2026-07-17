import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { SiteFooter } from "@/components/layout/site-footer";
import { SiteTopbar } from "@/components/layout/site-topbar";
import { CompleteProfileReview } from "@/components/profile/complete-profile-review";
import { getViewer } from "@/lib/app-data";
import { getFormMessage } from "@/lib/form-state";
import { getPrimaryNavLinks, getTopbarActions } from "@/lib/site";
import { hasSupabaseEnv } from "@/lib/supabase/config";
import {
  getWalkthroughProfileDraft,
  type WalkthroughProfileDraft,
  WALKTHROUGH_PROFILE_COOKIE_NAME,
} from "@/lib/walkthrough-profile";

import styles from "./page.module.css";

export const metadata: Metadata = {
  title: "Complete your profile",
  description:
    "Review the private starter profile created from the Moral Trade walkthrough before saving it to your account.",
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
  const returnTo = buildCompleteProfilePath(walkthroughDraft);
  const signupHref = `/signup?method=email&returnTo=${encodeURIComponent(returnTo)}`;
  const loginHref = `/login?method=email&returnTo=${encodeURIComponent(returnTo)}`;
  const formMessage = getFormMessage(resolvedSearchParams);

  return (
    <div className={styles.pageShell}>
      <header className={styles.routeHeader}>
        <SiteTopbar
          brandHref="/"
          links={getPrimaryNavLinks(Boolean(viewer))}
          {...getTopbarActions(Boolean(viewer))}
          showLogout={Boolean(viewer)}
          showSearch={false}
        />
        <div className={styles.workflowBar}>
          <div className={styles.workflowPath}>
            <span>Walkthrough</span>
            <span aria-hidden="true">/</span>
            <strong>Complete profile</strong>
          </div>
          <div className={styles.workflowStatus}>
            <i aria-hidden="true" />
            Private draft
          </div>
        </div>
      </header>

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
          initialDisplayName={viewer?.displayName ?? ""}
          isAuthenticated={Boolean(viewer)}
          loginHref={loginHref}
          returnTo={returnTo}
          signupHref={signupHref}
        />
      </main>

      <SiteFooter />
    </div>
  );
}
