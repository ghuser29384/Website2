import type { Metadata } from "next";
import { cookies } from "next/headers";

import { HomePage } from "@/components/home/home-page";
import { getViewer } from "@/lib/app-data";
import { getAbsoluteUrl, truncateDescription } from "@/lib/seo";
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

function hasSupabaseAuthCookie(cookieStore: Awaited<ReturnType<typeof cookies>>) {
  return cookieStore
    .getAll()
    .some(({ name }) => /^sb-.+-auth-token(?:\.\d+)?$/.test(name));
}

export default async function Page() {
  const cookieStore = await cookies();
  const viewer =
    hasSupabaseEnv() && hasSupabaseAuthCookie(cookieStore) ? await getViewer() : null;

  return (
    <>
      <h1 className="sr-only">Your best match right now</h1>
      <HomePage displayName={viewer?.displayName ?? null} />
    </>
  );
}
