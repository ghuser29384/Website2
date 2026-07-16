import type { Metadata } from "next";
import Link from "next/link";

import { SiteFooter } from "@/components/layout/site-footer";
import { SiteTopbar } from "@/components/layout/site-topbar";
import { StatusBadge } from "@/components/ui/page-primitives";
import { getViewer } from "@/lib/app-data";
import { getMoralTradeFundingReadiness } from "@/lib/funding";
import { getAbsoluteUrl } from "@/lib/seo";
import { getPrimaryNavLinks, getTopbarActions } from "@/lib/site";

export const metadata: Metadata = {
  title: "Support Moral Trade",
  description:
    "Use direct Every.org routes for existing charities and review the sponsor-gated funding posture for Moral Trade itself.",
  alternates: {
    canonical: "/support",
  },
  openGraph: {
    title: "Support Moral Trade",
    description:
      "Direct-to-charity giving is available now. Project funding activates only through a disclosed fiscal sponsor.",
    url: getAbsoluteUrl("/support"),
    type: "website",
  },
};

export const dynamic = "force-dynamic";

export default async function SupportPage() {
  const viewer = await getViewer();
  const isAuthenticated = Boolean(viewer);
  const funding = getMoralTradeFundingReadiness();
  const sponsor = funding.sponsor;

  return (
    <div className="page-shell">
      <header className="hero">
        <SiteTopbar
          brandHref="/"
          links={getPrimaryNavLinks(isAuthenticated)}
          {...getTopbarActions(isAuthenticated)}
          showLogout={isAuthenticated}
        />

        <div className="hero-grid">
          <section className="hero-copy">
            <p className="eyebrow">Support</p>
            <h1>Fund public goods now. Fund Moral Trade only through an approved sponsor.</h1>
            <p className="hero-text">
              Existing charities can receive donations directly through Every.org. Moral Trade does
              not accept project funds into a personal account or native checkout. Project funding
              activates only after a fiscal sponsor is contractually in place and fully disclosed.
            </p>
            <div className="hero-actions">
              <Link className="button button-primary" href="/donate">
                Donate to an existing charity
              </Link>
              <a className="button button-secondary" href="#moral-trade-project">
                Review project funding
              </a>
            </div>
            <ul className="hero-signals" aria-label="Funding safeguards">
              <li>No personal-account donations</li>
              <li>No native payment custody</li>
              <li>Exact sponsor disclosures required</li>
              <li>Conditional pools stay pledge-only</li>
            </ul>
          </section>

          <aside className="hero-panel panel">
            <p className="eyebrow">Current funding posture</p>
            <dl className="profile-stats profile-stats-hero">
              <div>
                <dt>Existing charities</dt>
                <dd>Available</dd>
              </div>
              <div>
                <dt>Moral Trade project</dt>
                <dd>{funding.projectFundingAvailable ? "Sponsor-backed" : "Not accepting funds"}</dd>
              </div>
              <div>
                <dt>Native checkout</dt>
                <dd>Disabled</dd>
              </div>
              <div>
                <dt>Conditional pools</dt>
                <dd>Pledge-only</dd>
              </div>
            </dl>
          </aside>
        </div>
      </header>

      <main id="main-content" tabIndex={-1}>
        <section className="section section-white">
          <div className="section-head">
            <p className="eyebrow">Available now</p>
            <h2>Donate directly to an established recipient</h2>
            <p>
              Every.org handles payment, receipt, refund, and recipient disbursement. Moral Trade
              provides reviewed links and optional evidence reconciliation, but does not receive the
              donation.
            </p>
          </div>
          <div className="panel data-card data-card-wide">
            <div className="protocol-workflow-card-head">
              <h3>Direct-to-charity Every.org routes</h3>
              <StatusBadge>available</StatusBadge>
            </div>
            <p className="route-text">
              Choose among the configured animal-welfare, global-poverty, climate, and long-term-future
              routes. The recipient shown by Every.org is the beneficiary; Moral Trade is not.
            </p>
            <div className="offer-actions">
              <Link className="button button-primary" href="/donate">
                Choose a charity route
              </Link>
              <Link className="button button-secondary" href="/status">
                Review service boundaries
              </Link>
            </div>
          </div>
        </section>

        <section className="section section-subtle" id="moral-trade-project">
          <div className="section-head">
            <p className="eyebrow">Moral Trade project</p>
            <h2>
              {funding.projectFundingAvailable
                ? "Project support is available through the disclosed sponsor"
                : "Project support is not yet accepting funds"}
            </h2>
            <p>
              A sponsor-backed route must identify the legal recipient, jurisdiction, sponsor fee,
              tax-receipt treatment, and refund policy before a contribution button appears.
            </p>
          </div>

          <article className="panel data-card data-card-wide">
            <div className="protocol-workflow-card-head">
              <h3>Fiscal sponsorship</h3>
              <StatusBadge tone={funding.projectFundingAvailable ? "default" : "warning"}>
                {funding.projectFundingAvailable ? "active" : "pending"}
              </StatusBadge>
            </div>

            {sponsor ? (
              <>
                <dl className="profile-stats">
                  <div>
                    <dt>Legal recipient</dt>
                    <dd>{sponsor.legalName}</dd>
                  </div>
                  <div>
                    <dt>Jurisdiction</dt>
                    <dd>{sponsor.jurisdiction}</dd>
                  </div>
                  <div>
                    <dt>Sponsor fee</dt>
                    <dd>{sponsor.feeDisclosure}</dd>
                  </div>
                  <div>
                    <dt>Tax receipts</dt>
                    <dd>{sponsor.taxReceiptDisclosure}</dd>
                  </div>
                </dl>
                <div className="offer-actions">
                  <a
                    className="button button-primary"
                    href={sponsor.contributionUrl}
                    rel="noopener noreferrer"
                    target="_blank"
                  >
                    Contribute through the fiscal sponsor
                  </a>
                  <a
                    className="button button-secondary"
                    href={sponsor.refundPolicyUrl}
                    rel="noopener noreferrer"
                    target="_blank"
                  >
                    Read the sponsor refund policy
                  </a>
                </div>
              </>
            ) : (
              <>
                <p className="route-text">
                  No fiscal sponsor relationship is currently represented as active. Do not send money
                  to Moral Trade, its operators, or a personal payment account. The site will remain in
                  this fail-closed state until an approved sponsor route is configured.
                </p>
                <div className="offer-actions">
                  <Link className="button button-primary" href="/contact">
                    Ask about fiscal sponsorship
                  </Link>
                  <a className="button button-secondary" href="/api/funding/readiness">
                    Open funding readiness JSON
                  </a>
                </div>
              </>
            )}
          </article>
        </section>

        <section className="section section-white">
          <div className="section-head">
            <p className="eyebrow">Conditional funding</p>
            <h2>Pledges remain non-custodial until an approved route exists</h2>
            <p>
              Moral Trade can record bounded pledge intent and evidence states. It does not store a
              payment method or charge a participant in the current production posture.
            </p>
          </div>
          <div className="data-grid">
            <article className="panel data-card">
              <h3>Before a threshold clears</h3>
              <p className="route-text">
                The system records a maximum amount, deadline, acceptable counterpart conditions,
                and failure path. No money moves.
              </p>
            </article>
            <article className="panel data-card">
              <h3>After a threshold clears</h3>
              <p className="route-text">
                The participant is directed to the approved external recipient. Provider or sponsor
                evidence must be reviewed before the contribution counts.
              </p>
            </article>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
