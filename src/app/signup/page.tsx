import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { AuthPage } from "@/components/auth/auth-card";
import { getViewer } from "@/lib/app-data";
import { isOnePersonRegistrationEnforced } from "@/lib/identity/one-person-account";
import { hasReadyOnePersonRegistration } from "@/lib/identity/server";
import { getSafeInternalPath } from "@/lib/paths";

export const metadata: Metadata = {
  title: "Create your Moral Trade account",
  description:
    "Create a Moral Trade account with email and enabled sign-in providers, then add profile details later.",
  robots: {
    index: false,
    follow: false,
  },
};

interface SignupPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function SignupPage({ searchParams }: SignupPageProps) {
  const resolvedSearchParams = await searchParams;
  const viewer = await getViewer();
  const rawReturnTo = resolvedSearchParams.returnTo ?? resolvedSearchParams.return_to;
  const returnTo = getSafeInternalPath(
    Array.isArray(rawReturnTo) ? rawReturnTo[0] : rawReturnTo,
    "/onboarding",
  );

  if (!viewer && isOnePersonRegistrationEnforced() && !(await hasReadyOnePersonRegistration())) {
    redirect(`/identity?returnTo=${encodeURIComponent(returnTo)}`);
  }

  return (
    <AuthPage
      initialMode="signup"
      isAuthenticated={Boolean(viewer)}
      searchParams={resolvedSearchParams}
    />
  );
}
