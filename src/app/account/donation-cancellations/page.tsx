import type { Metadata } from "next";
import Link from "next/link";

import { SiteFooter } from "@/components/layout/site-footer";
import { SiteTopbar } from "@/components/layout/site-topbar";
import { Breadcrumbs, SectionHeader } from "@/components/ui/page-primitives";
import {
  DONATION_CANCELLATION_DASHBOARD_STATES,
  DONATION_CANCELLATION_SEED_RECIPIENTS,
  DONATION_CANCELLATION_SEED_REGISTRATIONS,
  assertDonationCancellationCapability,
  createDonationCancellationDemoSettlement,
  getDonationCancellationDeploymentEnvironment,
  getDonationCancellationReceiptCopy,
} from "@/lib/moral-trade/donation-cancellation-clearinghouse";
import { getAbsoluteUrl } from "@/lib/seo";
import { getPrimaryNavLinks, getTopbarActions } from "@/lib/site";
import { DonationCancellationNonMvpNotice } from "../../donation-cancellation/non-mvp-notice";

export const metadata: Metadata = {
  alternates: {
    canonical: "/account/donation-cancellations",
  },
  description: "Status: non-MVP labs/research mechanism. Ordinary account donation-cancellation records are not currently available.",
  openGraph: {
    description: "Donation Cancellation Clearinghouse is not part of the current CGPP MVP.",
    title: "Donation clearinghouse records unavailable",
    type: "website",
    url: getAbsoluteUrl("/account/donation-cancellations"),
  },
  title: "Donation clearinghouse records unavailable",
};

function formatMinor(amountMinor: number, currency = "usd") {
  return new Intl.NumberFormat("en-US", {
    currency: currency.toUpperCase(),
    maximumFractionDigits: amountMinor % 100 === 0 ? 0 : 2,
    style: "currency",
  }).format(amountMinor / 100);
}

export default function DonationCancellationAccountPage() {
  const publicDecision = assertDonationCancellationCapability(
    "view_public_landing",
    { role: "user" },
    getDonationCancellationDeploymentEnvironment(),
    {
      featureEnabled: false,
      labsEnabled: false,
    },
  );

  if (!publicDecision.ok) {
    return <DonationCancellationNonMvpNotice decision={publicDecision} title="Donation cancellation account records are not currently available." />;
  }

  const { plan } = createDonationCancellationDemoSettlement();
  const rows = DONATION_CANCELLATION_SEED_REGISTRATIONS.slice(0, 5).map((registration) => ({
    allocation: plan.allocationRows.find((row) => row.registrationId === registration.id),
    registration,
  }));

  return (
    <div className="page-shell page-shell-focused">
      <header className="v72-route-header">
        <SiteTopbar brandHref="/" links={getPrimaryNavLinks(false)} {...getTopbarActions(false)} />
        <Breadcrumbs
          items={[
            { href: "/donation-cancellation", label: "Cancel opposed donations" },
            { href: "/account/donation-cancellations", label: "Dashboard" },
          ]}
        />
      </header>

      <main id="main-content" tabIndex={-1}>
        <section className="section section-white" aria-labelledby="dashboard-heading">
          <div className="section-head section-head-compact">
            <p className="eyebrow">Account</p>
            <h1 id="dashboard-heading">Donation clearinghouse statuses and receipts.</h1>
            <p>
              Ordinary users can see their own registrations, review-needed suggestions, routing
              status, receipts, and support links. This public build uses seeded demo rows and does
              not expose private user data.
            </p>
          </div>
          <div className="data-grid">
            {DONATION_CANCELLATION_DASHBOARD_STATES.slice(0, 6).map((state) => (
              <article className="panel data-card" key={state}>
                <p className="detail-kicker">State</p>
                <h3>{state}</h3>
              </article>
            ))}
          </div>
        </section>

        <section className="section section-subtle" aria-labelledby="receipts-heading">
          <SectionHeader eyebrow="Routing receipts" id="receipts-heading" title="Receipts reconcile intended and redirect routes.">
            Receipts include round id, registration id, original intended recipient, gross amount,
            fees, matched amount, unmatched amount, rulebook hash, fee policy hash, algorithm
            version, and final status. Original-destination fallback remains explicit when no
            compatible redirect clears.
          </SectionHeader>
          <div className="data-grid">
            {rows.map(({ allocation, registration }) => (
              <article className="panel data-card" key={registration.id}>
                <p className="detail-kicker">{registration.registrationState}</p>
                <h3>{formatMinor(registration.grossAmountMinor, registration.currency)}</h3>
                <p>
                  {getDonationCancellationReceiptCopy({
                    allocation,
                    recipients: DONATION_CANCELLATION_SEED_RECIPIENTS,
                    registration,
                  })}
                </p>
                <p className="route-text">
                  Round {registration.roundId}; registration {registration.id}; rulebook{" "}
                  {registration.rulebookHashAtConsent.slice(0, 18)}.
                </p>
              </article>
            ))}
          </div>
          <div className="hero-actions">
            <Link className="button button-secondary" href="/donation-cancellation">
              Back to clearinghouse
            </Link>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
