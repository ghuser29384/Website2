"use client";

import Link from "next/link";

import { getPrimaryNavLinks, getTopbarActions } from "@/lib/site";

import { SiteFooter } from "./site-footer";
import { SiteTopbar } from "./site-topbar";

interface PublicRouteErrorProps {
  reset: () => void;
  eyebrow: string;
  title: string;
  description: string;
}

export function PublicRouteError({
  reset,
  eyebrow,
  title,
  description,
}: PublicRouteErrorProps) {
  return (
    <div className="page-shell">
      <header className="hero">
        <SiteTopbar
          brandHref="/"
          links={getPrimaryNavLinks(false)}
          {...getTopbarActions(false)}
          showLogout={false}
        />
        <div className="hero-grid">
          <section className="hero-copy">
            <p className="eyebrow">{eyebrow}</p>
            <h1>{title}</h1>
            <p className="hero-text">{description}</p>
            <div className="hero-actions">
              <button className="button button-primary" onClick={reset} type="button">
                Try again
              </button>
              <Link className="button button-secondary" href="/status">
                Check service status
              </Link>
            </div>
          </section>
        </div>
      </header>

      <main id="main-content" tabIndex={-1}>
        <section className="section section-white" aria-labelledby="route-recovery-heading">
          <div className="section-head">
            <p className="eyebrow">No action taken</p>
            <h2 id="route-recovery-heading">The requested data was not changed.</h2>
            <p>
              This page could not load its live data. Retrying is safe; no donation, pledge,
              commitment, publication, or payment was created by this failed request.
            </p>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
