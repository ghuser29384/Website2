"use client";

import Link from "next/link";
import { useEffect } from "react";

interface ErrorPageProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function ErrorPage({ error, reset }: ErrorPageProps) {
  useEffect(() => {
    console.error("[app] route error", {
      digest: error.digest ?? null,
      message: error.message,
    });
  }, [error]);

  return (
    <div className="page-shell">
      <main className="section section-white state-page">
        <div className="section-head">
          <p className="eyebrow">Something failed</p>
          <h1>The site could not finish loading this page.</h1>
          <p>
            You can retry the request, return to the public directories, or come back through the
            dashboard if the page depends on private account data.
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
      </main>
    </div>
  );
}
