import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import {
  getAccountActivationState,
  getRootActivationDestination,
} from "@/lib/account-activation";
import { getViewer } from "@/lib/app-data";
import { getAbsoluteUrl, truncateDescription } from "@/lib/seo";
import { hasSupabaseAuthCookie } from "@/lib/supabase/auth-cookie";
import { hasSupabaseEnv } from "@/lib/supabase/config";

const homeDescription = truncateDescription(
  "Moral Trade is a marketplace and coordination mechanism for completing real donations through reviewed payment routes, swapping commitments, redirecting offsets, and joining conditional funding pools.",
);

export const metadata: Metadata = {
  title: "Do more good without agreeing",
  description: homeDescription,
  alternates: {
    canonical: "/",
  },
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

export default async function Page() {
  const cookieStore = await cookies();
  const authenticated = hasSupabaseEnv() && hasSupabaseAuthCookie(cookieStore.getAll());
  const viewer = authenticated ? await getViewer() : null;

  redirect(
    getRootActivationDestination(
      getAccountActivationState({ authenticated, viewer }),
    ),
  );
}
