import type { Metadata } from "next";
import Link from "next/link";

import {
  DealReceipt,
  VICTORIA_PAUL_RECEIPT_ROWS,
} from "@/components/marketplace/deal-receipt";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteTopbar } from "@/components/layout/site-topbar";
import { getViewer } from "@/lib/app-data";
import { getPrimaryNavLinks, getTopbarActions } from "@/lib/site";

export const metadata: Metadata = {
  title: "Founding-user pilot",
  description:
    "Inspect one complete Moral Trade example, create an account, complete one bounded action, and review the safeguards.",
  robots: {
    index: false,
    follow: false,
  },
};

export default async function PilotPage() {
  const viewer = await getViewer();
  const isAuthenticated = Boolean(viewer);
  const startHref = isAuthenticated ? "/onboarding" : "/signup?returnTo=/onboarding";
  const cloneHref = isAuthenticated
    ? "/offers/new?entry=draft&mode=pledge&example=seed-victoria"
    : `/signup?returnTo=${encodeURIComponent(
        "/offers/new?entry=draft&mode=pledge&example=seed-victoria",
      )}`;
  const draftHref = isAuthenticated
    ? "/create?mode=trade"
    : `/signup?returnTo=${encodeURIComponent("/create?mode=trade")}`;
  const inviteHref = isAuthenticated
    ? "/cohort#invite"
    : `/signup?returnTo=${encodeURIComponent("/cohort#invite")}`;

  return (
    <div className="page-shell marketplace-product-shell">
      <header>
        <SiteTopbar
          brandHref="/"
          links={getPrimaryNavLinks(isAuthenticated)}
          {...getTopbarActions(isAuthenticated)}
          primaryAction={{
            href: startHref,
            label: isAuthenticated ? "Continue pilot" : "Join the pilot",
          }}
          showLogout={isAuthenticated}
        />
      </header>

      <main className="mt-product-main" id="main-content" tabIndex={-1}>
        <section className="mt-product-hero growth-hero" aria-labelledby="pilot-heading">
          <div className="mt-product-hero-copy">
            <p className="mt-product-kicker">Guided first-user journey</p>
            <h1 id="pilot-heading">
              Test one moral trade
              <span>from idea to saved action.</span>
            </h1>
            <p className="mt-product-hero-text">
              Inspect a complete worked example, create an account, and save one action.
            </p>
            <div className="mt-product-actions">
              <Link className="button button-primary" href={startHref}>
                {isAuthenticated ? "Continue the pilot" : "Create account and start"}
              </Link>
              <Link className="button button-secondary" href="/offers/examples/seed-victoria">
                Inspect the example first
              </Link>
            </div>
            <ul className="mt-product-proof-line" aria-label="Pilot boundaries">
              <li>Non-financial</li>
              <li>Voluntary</li>
              <li>Bounded terms</li>
              <li>One saved action</li>
            </ul>
          </div>

          <div className="mt-product-hero-visual">
            <DealReceipt
              note="Illustrative worked example. It is not a live proposal or completed transaction."
              rows={VICTORIA_PAUL_RECEIPT_ROWS}
              state="Draft"
              title="Victoria ↔ Paul"
            />
          </div>
        </section>

        <section className="mt-product-section" aria-labelledby="pilot-action-heading">
          <div className="mt-product-section-head">
            <div>
              <p className="mt-product-kicker">Choose one</p>
              <h2 id="pilot-action-heading">Finish with a real artifact.</h2>
            </div>
          </div>

          <div className="mt-market-grid">
            <article className="mt-market-card">
              <div className="mt-market-card-head">
                <span className="mt-market-eyebrow">Lowest friction</span>
                <span className="mt-market-state">Recommended</span>
              </div>
              <h3>Clone the Victoria–Paul example</h3>
              <dl>
                <div>
                  <dt>Action</dt>
                  <dd>
                    Adapt the commitments, duration, evidence, and exit terms to something you could
                    actually consider.
                  </dd>
                </div>
                <div>
                  <dt>Completion</dt>
                  <dd>Save the adapted proposal as your own draft.</dd>
                </div>
              </dl>
              <div className="mt-market-card-foot">
                <span>About 5 minutes</span>
                <Link href={cloneHref}>Clone and save ↗</Link>
              </div>
            </article>

            <article className="mt-market-card">
              <div className="mt-market-card-head">
                <span className="mt-market-eyebrow">Original proposal</span>
                <span className="mt-market-state">Bounded draft</span>
              </div>
              <h3>Draft one trade</h3>
              <dl>
                <div>
                  <dt>Action</dt>
                  <dd>
                    Name what you would do, what you would request, and the explicit no-deal default.
                  </dd>
                </div>
                <div>
                  <dt>Completion</dt>
                  <dd>Save a draft with a cap, duration, evidence rule, and exit.</dd>
                </div>
              </dl>
              <div className="mt-market-card-foot">
                <span>About 10 minutes</span>
                <Link href={draftHref}>Draft a trade ↗</Link>
              </div>
            </article>

            <article className="mt-market-card">
              <div className="mt-market-card-head">
                <span className="mt-market-eyebrow">Network action</span>
                <span className="mt-market-state">Specific person</span>
              </div>
              <h3>Draft one serious invitation</h3>
              <dl>
                <div>
                  <dt>Action</dt>
                  <dd>
                    Name a researcher, builder, donor, organizer, or institution that could test a
                    concrete use case.
                  </dd>
                </div>
                <div>
                  <dt>Completion</dt>
                  <dd>Save the target, reason, desired capability, and tailored message.</dd>
                </div>
              </dl>
              <div className="mt-market-card-foot">
                <span>About 5 minutes</span>
                <Link href={inviteHref}>Draft an invite ↗</Link>
              </div>
            </article>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
