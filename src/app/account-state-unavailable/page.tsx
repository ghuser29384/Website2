import type { Metadata } from "next";
import Link from "next/link";

import { SiteTopbar } from "@/components/layout/site-topbar";

export const metadata: Metadata = {
  title: "Account status unavailable",
  description:
    "Moral Trade could not confirm the signed-in account's persisted setup stage and did not select an activation route.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function AccountStateUnavailablePage() {
  return (
    <div className="page-shell" data-mt-surface="account-state-unavailable">
      <header className="v72-route-header">
        <SiteTopbar
          brandHref="/discover"
          links={[{ href: "/discover", label: "Discover" }]}
          showSearch={false}
        />
      </header>

      <main id="main-content" tabIndex={-1}>
        <section className="v72-safe-state panel" aria-labelledby="account-state-heading">
          <p className="eyebrow">Account check paused</p>
          <h1 id="account-state-heading">We couldn&apos;t confirm your setup status.</h1>
          <p>
            Moral Trade could not read the persisted activation stage, so it did not classify this
            account as new or open Feed or Complete Profile. No activation stage was changed.
          </p>
          <p className="v72-receipt-fragment">
            Account state unavailable · No activation change
          </p>
          <div className="hero-actions">
            <Link className="button button-primary" href="/">
              Retry account check
            </Link>
            <Link className="button button-secondary" href="/discover">
              Browse Discover
            </Link>
          </div>
        </section>
      </main>

    </div>
  );
}
