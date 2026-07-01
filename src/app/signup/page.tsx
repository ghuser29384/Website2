import type { Metadata } from "next";

import { AuthPage } from "@/components/auth/auth-card";
import { getViewer } from "@/lib/app-data";

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

  return (
    <AuthPage
      initialMode="signup"
      isAuthenticated={Boolean(viewer)}
      searchParams={resolvedSearchParams}
    />
  );
}
