import Link from "next/link";

import { SiteFooter } from "@/components/layout/site-footer";
import { SiteTopbar } from "@/components/layout/site-topbar";
import { getPrimaryNavLinks, getTopbarActions } from "@/lib/site";

export default function NotFound() {
  return (
    <div className="page-shell">
      <header className="hero">
        <SiteTopbar
          brandHref="/"
          links={getPrimaryNavLinks(false)}
          {...getTopbarActions(false)}
        />

        <div className="hero-grid">
          <section className="hero-copy">
            <p className="eyebrow">Not found</p>
            <h1>This record is not available.</h1>
            <p className="hero-text">
              The page may have moved, the offer may no longer be public, or the profile may not
              have a visible record yet.
            </p>
            <div className="hero-actions">
              <Link className="button button-primary" href="/offers">
                Browse offers
              </Link>
              <Link className="button button-secondary" href="/people">
                Browse people
              </Link>
            </div>
          </section>

          <aside className="hero-panel panel">
            <p className="eyebrow">Useful next step</p>
            <div className="flow-card">
              <div className="flow-step">
                <span className="flow-number">01</span>
                <div>
                  <strong>Search public records</strong>
                  <p>Offers, people, and broad wish previews are the public entry points.</p>
                </div>
              </div>
              <div className="flow-step">
                <span className="flow-number">02</span>
                <div>
                  <strong>Sign in for private records</strong>
                  <p>Dashboards, carts, and agreements require the relevant account.</p>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </header>

      <SiteFooter />
    </div>
  );
}
