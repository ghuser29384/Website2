"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function ProfileCredibilityLink({ profileId }: { profileId: string }) {
  const pathname = usePathname();

  if (pathname.endsWith("/credibility")) {
    return null;
  }

  return (
    <div className="status-banner">
      <strong>This public profile has a contextual credibility passport.</strong>{" "}
      <Link className="text-button" href={`/people/${profileId}/credibility`}>
        View evidence, uncertainty, and role-specific records
      </Link>
    </div>
  );
}
