import type { Metadata } from "next";
import { ProfilePrioritiesView } from "@/components/profile/profile-priorities-view";

export const metadata: Metadata = {
  title: "Profile priorities",
  description: "Adjust the private 100-spark priority allocation used by your Moral Trade feed.",
  robots: { follow: false, index: false },
};

export default function ProfilePrioritiesPage({ searchParams }: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  return <ProfilePrioritiesView searchParams={searchParams} />;
}
