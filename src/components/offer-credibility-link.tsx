"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function OfferCredibilityLink({ offerId }: { offerId: string }) {
  const pathname = usePathname();

  if (pathname.endsWith("/credibility")) {
    return null;
  }

  return (
    <div className="status-banner">
      <strong>Contextual credibility is available for this offer.</strong>{" "}
      <Link className="text-button" href={`/offers/${offerId}/credibility`}>
        View reliability evidence and recommended safeguards
      </Link>
    </div>
  );
}
