import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { getSafeInternalPath } from "@/lib/paths";

export const metadata: Metadata = {
  title: "100 Sparks — Your priorities",
  robots: { index: false, follow: false },
};

interface HundredSparksPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function HundredSparksPage({ searchParams }: HundredSparksPageProps) {
  const params = await searchParams;
  const requestedReturnTo = Array.isArray(params.returnTo) ? params.returnTo[0] : params.returnTo;
  const returnTo = getSafeInternalPath(requestedReturnTo, "/profile");

  // Keep one account-bound editor and one persistence path for both entry points.
  redirect(`/profile/priorities?returnTo=${encodeURIComponent(returnTo)}`);
}
