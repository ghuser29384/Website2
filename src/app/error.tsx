"use client";

import Link from "next/link";
import { useEffect } from "react";

import { SiteTopbar } from "@/components/layout/site-topbar";
import { getPrimaryNavLinks, getTopbarActions } from "@/lib/site";

interface ErrorPageProps {
  error: Error & { digest?: string };
  reset: () => void;
}

const recoveryRoutes = [
  {
    href: "/moral-trade/technical-spec",
    label: "Protocol spec",
    text: "Open the public validator contract and health links.",
  },
  {
    href: "/offers?view=examples",
    label: "Worked examples",
    text: "Browse static examples while live data recovers.",
  },
  {
    href: "/reasoning-standards",
    label: "Evidence standards",
    text: "Review safety, evidence, and reliance standards.",
  },
] as const;

export default function ErrorPage({ error, reset }: ErrorPageProps) {
  useEffect(() => {
    console.error("[app] route error", {
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
          <p className="eyebrow">Recoverable route error</p>
          <h1>This page did not finish rendering.</h1>
          <p>
            Retry the current request, or move to a public contract surface that does not depend on
            private account data. No proposal status, match disclosure, or evidence decision is
            changed by this recovery screen.
          </p>
        </div>

        <div className="hero-actions">
          <button className="button button-primary" type="button" onClick={reset}>
            Try again
          </button>
          <Link className="button button-secondary" href="/offers">
            Browse offers
          </Link>
          <Link className="button button-secondary" href="/dashboard">
            Open dashboard
          </Link>
        </div>

        <div aria-label="Safe recovery routes" className="route-state-grid">
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
