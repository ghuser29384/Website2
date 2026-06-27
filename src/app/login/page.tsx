import type { Metadata } from "next";

import { AuthPage } from "@/components/auth/auth-card";
import { getViewer } from "@/lib/app-data";

export const metadata: Metadata = {
  title: "Log in or create an account",
  description:
    "Log in or create a Moral Trade account with Google, Apple, or email.",
  robots: {
    index: false,
    follow: false,
  },
};

interface LoginPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const resolvedSearchParams = await searchParams;
  const viewer = await getViewer();

  return (
    <AuthPage
      initialMode="login"
      isAuthenticated={Boolean(viewer)}
      searchParams={resolvedSearchParams}
    />
  );
}
