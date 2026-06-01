"use client";

import Link from "next/link";
import { useEffect } from "react";

import { SiteTopbar } from "@/components/layout/site-topbar";
import { getPrimaryNavLinks, getTopbarActions } from "@/lib/site";

interface ReasoningCenterErrorPageProps {
  error: Error & { digest?: string };
  reset: () => void;
}

const recoveryRoutes = [
  {
    href: "/reasoning-center",
    label: "Retry packet index",
    text: "Return to the public reasoning packet list.",
  },
  {
    href: "/api/moral-trade/reasoning/packets",
    label: "Packet JSON",
    text: "Open the validator-backed recovery payload.",
  },
  {
    href: "/moral-trade/technical-spec",
    label: "Protocol spec",
    text: "Review route resilience and document coverage gates.",
  },
] as const;

export default function ReasoningCenterErrorPage({
  error,
  reset,
}: ReasoningCenterErrorPageProps) {
  useEffect(() => {
    console.error("[reasoning-center] route segment error", {
      digest: error.digest ?? null,
      message: error.message,
    });
  }, [error]);

  return (
    <div className="page-shell reasoning-shell">
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
          <p className="eyebrow">Reasoning Center recovery</p>
          <h1>The reasoning index did not finish rendering.</h1>
          <p>
            Retry the packet view, or move to a public contract surface that can expose validator
            blockers without relying on account data. This recovery screen does not change proposal
            status, disclosure, outreach, evidence decisions, or rankings.
          </p>
        </div>

        <div className="hero-actions">
          <button className="button button-primary" type="button" onClick={reset}>
            Try again
          </button>
          <Link className="button button-secondary" href="/api/moral-trade/reasoning/packets">
            Open packet JSON
          </Link>
          <Link className="button button-secondary" href="/moral-trade/technical-spec">
            Open protocol spec
          </Link>
        </div>

        <div aria-label="Reasoning Center recovery routes" className="route-state-grid">
          {recoveryRoutes.map((route) => (
            <Link className="route-state-card route-state-link" href={route.href} key={route.href}>
              <span className="route-state-number" aria-hidden="true">
                Go
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
