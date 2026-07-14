"use client";

import Link from "next/link";
import { useEffect } from "react";

import { SiteTopbar } from "@/components/layout/site-topbar";
import { getPrimaryNavLinks, getTopbarActions } from "@/lib/site";

interface TechnicalSpecErrorPageProps {
  error: Error & { digest?: string };
  reset: () => void;
}

const contractRecoveryRoutes = [
  {
    href: "/api/moral-trade/health",
    label: "Health JSON",
    text: "Read aggregate validator blockers and non-claims.",
  },
  {
    href: "/api/moral-trade/document-coverage/health",
    label: "Document coverage",
    text: "Check which source-document recommendations have implementation evidence.",
  },
  {
    href: "/api/moral-trade/api-contract",
    label: "API contract",
    text: "Open route, schema, privacy, rate-limit, and fallback metadata.",
  },
] as const;

export default function TechnicalSpecErrorPage({
  error,
  reset,
}: TechnicalSpecErrorPageProps) {
  useEffect(() => {
    console.error("[moral-trade/technical-spec] route segment error", {
      digest: error.digest ?? null,
      message: error.message,
    });
  }, [error]);

  return (
    <div className="page-shell">
      <SiteTopbar
        brandHref="/"
        links={getPrimaryNavLinks(false)}
        {...getTopbarActions(false)}
        showSearch
      />

      <main
        className="section section-white state-page route-state-page"
        id="main-content"
        tabIndex={-1}
      >
        <div className="section-head">
          <p className="eyebrow">Technical spec recovery</p>
          <h1>The protocol spec did not finish rendering.</h1>
          <p>
            Retry the spec, or use the public contract JSON routes below. This recovery screen does
            not change proposal status, match disclosure, outreach, evidence review, payments, or
            rankings.
          </p>
        </div>

        <div className="hero-actions">
          <button className="button button-primary" type="button" onClick={reset}>
            Try again
          </button>
          <Link className="button button-secondary" href="/api/moral-trade/health">
            Open health JSON
          </Link>
          <Link
            className="button button-secondary"
            href="/api/moral-trade/document-coverage/health"
          >
            Open coverage JSON
          </Link>
        </div>

        <div aria-label="Technical spec recovery routes" className="route-state-grid">
          {contractRecoveryRoutes.map((route) => (
            <Link className="route-state-card route-state-link" href={route.href} key={route.href}>
              <span className="route-state-number" aria-hidden="true">
                JSON
              </span>
              <span>
                <strong>{route.label}</strong>
                <small>{route.text}</small>
              </span>
            </Link>
          ))}
        </div>
      </main>
    </div>
  );
}
