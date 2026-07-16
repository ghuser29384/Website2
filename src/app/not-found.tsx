import Link from "next/link";

import { SiteFooter } from "@/components/layout/site-footer";
import { SiteTopbar } from "@/components/layout/site-topbar";
import { getPrimaryNavLinks, getTopbarActions } from "@/lib/site";

export default function NotFound() {
  return (
    <div className="page-shell">
      <header className="v72-route-header">
        <SiteTopbar
          brandHref="/"
          links={getPrimaryNavLinks(false)}
          {...getTopbarActions(false)}
        />
      </header>

      <main id="main-content" tabIndex={-1}>
        <section className="v72-safe-state panel" aria-labelledby="safe-state-heading">
          <h1 id="safe-state-heading">Unavailable</h1>
          <p>The route is not available as a backed Moral Trade record.</p>
          <p className="v72-receipt-fragment">Unavailable · Terms changed</p>
          <div className="hero-actions">
            <Link className="button button-primary" href="/offers?view=live">
              Explore live proposals
            </Link>
            <Link className="button button-secondary" href="/donate">
              Fund a public good
            </Link>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
