"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function OfferCredibilityLink({ offerId }: { offerId: string }) {
  const pathname = usePathname();

  if (pathname.endsWith("/credibility")) {
    return null;
  }

  return (
    <aside
      aria-label="Offer review context"
      className="status-banner offer-record-context-banner"
    >
      <span className="offer-record-context-copy">
        <strong>Check evidence status and safeguards before responding.</strong>
      </span>
      <nav aria-label="Offer review shortcuts" className="offer-record-context-actions">
        <Link className="text-button" href={`/offers/${offerId}/credibility`}>
          Review evidence status and safeguards
        </Link>
        <a className="text-button" href="#marketplace-commitment">
          Jump to commitment terms
        </a>
      </nav>
    </aside>
  );
}
