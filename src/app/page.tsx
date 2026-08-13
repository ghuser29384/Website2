import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import {
  getAccountLandingPath,
  type AccountActivationStatus,
} from "@/lib/account-activation";
import { getViewer } from "@/lib/app-data";
import { getAbsoluteUrl, truncateDescription } from "@/lib/seo";
import { hasSupabaseEnv } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";
import { WALKTHROUGH_SEEN_COOKIE_NAME } from "@/lib/walkthrough-state";
import {
  parseWalkthroughProfileDraft,
  WALKTHROUGH_PROFILE_COOKIE_NAME,
} from "@/lib/walkthrough-profile";

const homeDescription = truncateDescription(
  "Moral Trade is a marketplace and coordination mechanism for completing real donations through reviewed payment routes, swapping commitments, redirecting offsets, and joining conditional funding pools.",
);

export const metadata: Metadata = {
  title: "Do more good without agreeing",
  description: homeDescription,
  alternates: { canonical: "/" },
  openGraph: {
    title: "Moral Trade: do more good without agreeing",
    description: homeDescription,
    url: getAbsoluteUrl("/"),
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "Moral Trade: do more good without agreeing",
    description: homeDescription,
  },
};

export const dynamic = "force-dynamic";
export const revalidate = 0;

function hasSupabaseAuthCookie(cookieStore: Awaited<ReturnType<typeof cookies>>) {
  return cookieStore
    .getAll()
    .some(({ name }) => /^sb-.+-auth-token(?:\.\d+)?$/.test(name));
}

async function getOnboardingStatus(profileId: string): Promise<AccountActivationStatus> {
  const supabase = await createClient();
  // This table predates the generated database type snapshot used by createClient.
  // Keep the compatibility cast local until those generated types are refreshed.
  const typedSupabase = supabase as any;
  const { data, error } = await typedSupabase
    .from("cohort_onboarding_profiles")
    .select("status")
    .eq("profile_id", profileId)
    .maybeSingle();

  if (error) {
    console.error("Could not resolve the account activation state.", {
      code: error.code,
      message: error.message,
    });
    return null;
  }

  return data?.status === "started" || data?.status === "completed"
    ? data.status
    : null;
}

export default async function Page() {
  const cookieStore = await cookies();
  const viewer =
    hasSupabaseEnv() && hasSupabaseAuthCookie(cookieStore) ? await getViewer() : null;
  const onboardingStatus = viewer ? await getOnboardingStatus(viewer.authUser.id) : null;
  const profileDraft = parseWalkthroughProfileDraft(
    cookieStore.get(WALKTHROUGH_PROFILE_COOKIE_NAME)?.value,
  );

  redirect(
    getAccountLandingPath({
      authenticated: Boolean(viewer),
      onboardingStatus,
      hasWalkthroughProfileDraft: Boolean(profileDraft),
      hasSeenWalkthrough:
        cookieStore.get(WALKTHROUGH_SEEN_COOKIE_NAME)?.value === "1",
    }),
  );
}
