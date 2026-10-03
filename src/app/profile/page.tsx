import { permanentRedirect } from "next/navigation";

import { getProfileDashboardTarget } from "@/lib/dashboard-view";

interface ProfilePageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

// Also handle client-side navigation: the account surface has one canonical URL.
export default async function ProfilePage({ searchParams }: ProfilePageProps) {
  permanentRedirect(getProfileDashboardTarget(await searchParams));
}
