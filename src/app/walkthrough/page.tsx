import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { ImmersiveWalkthrough } from "@/components/walkthrough/immersive-walkthrough";
import {
  getAccountActivationState,
  getWalkthroughActivationDestination,
} from "@/lib/account-activation";
import { getViewer } from "@/lib/app-data";
import { getAbsoluteUrl, truncateDescription } from "@/lib/seo";
import { hasSupabaseAuthCookie } from "@/lib/supabase/auth-cookie";
import { hasSupabaseEnv } from "@/lib/supabase/config";
import {
  parseWalkthroughProfileDraft,
  WALKTHROUGH_PROFILE_COOKIE_NAME,
} from "@/lib/walkthrough-profile";

import "./walkthrough.css";

const description = truncateDescription(
  "Try Moral Trade: redirect opposed donations, group-buy verified action, coordinate conditional funding, and close a higher-impact job's salary gap.",
);

export const metadata: Metadata = {
  title: "Interactive walkthrough",
  description,
  alternates: {
    canonical: "/walkthrough",
  },
  openGraph: {
    title: "Try Moral Trade",
    description,
    url: getAbsoluteUrl("/walkthrough"),
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "Try Moral Trade",
    description,
  },
};

interface WalkthroughPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

function readSearchParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

export default async function WalkthroughPage({ searchParams }: WalkthroughPageProps) {
  const [cookieStore, resolvedSearchParams] = await Promise.all([cookies(), searchParams]);
  const authenticated =
    hasSupabaseEnv() && hasSupabaseAuthCookie(cookieStore.getAll());
  const viewer = authenticated ? await getViewer() : null;
  const activationState = getAccountActivationState({ authenticated, viewer });
  const destination = getWalkthroughActivationDestination(activationState);

  if (destination) {
    redirect(destination);
  }

  return (
    <ImmersiveWalkthrough
      activationError={readSearchParam(resolvedSearchParams.error)}
      initialProfileDraft={parseWalkthroughProfileDraft(
        cookieStore.get(WALKTHROUGH_PROFILE_COOKIE_NAME)?.value,
      )}
      tradeCreateHref="/trades/new"
    />
  );
}
