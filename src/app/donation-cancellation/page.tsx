import type { Metadata } from "next";
import Link from "next/link";

import { SiteFooter } from "@/components/layout/site-footer";
import { SiteTopbar } from "@/components/layout/site-topbar";
import { Breadcrumbs, IconMark, PageHero, SectionHeader } from "@/components/ui/page-primitives";
import { getViewer } from "@/lib/app-data";
import {
  DONATION_CANCELLATION_BACKEND_REQUIREMENTS,
  assertDonationCancellationCapability,
  createDonationCancellationDemoSettlement,
  getDonationCancellationDeploymentEnvironment,
  getDonationCancellationMarkets,
  getDonationCancellationPublicRound,
  getDonationCancellationRecipients,
  getDonationCancellationRounds,
  serializeDonationCancellationPublicReport,
} from "@/lib/moral-trade/donation-cancellation-clearinghouse";
import { getAbsoluteUrl } from "@/lib/seo";
import { getPrimaryNavLinks, getTopbarActions } from "@/lib/site";
import { DonationCancellationNonMvpNotice } from "./non-mvp-notice";

export const metadata: Metadata = {
  alternates: {
    canonical: "/donation-cancellation",
  },
  description:
    "Status: non-MVP labs/research mechanism. Production registration, payment, routing, and settlement are disabled.",
  openGraph: {
    description:
      "Donation Cancellation Clearinghouse is not part of the current CGPP MVP and is not currently available as a public product.",
    title: "Donation Cancellation Clearinghouse unavailable",
    type: "website",
    url: getAbsoluteUrl("/donation-cancellation"),
  },
  title: "Donation Cancellation Clearinghouse unavailable",
};

function formatMinor(amountMinor: number, currency = "usd") {
  return new Intl.NumberFormat("en-US", {
    currency: currency.toUpperCase(),
    maximumFractionDigits: amountMinor % 100 === 0 ? 0 : 2,
    style: "currency",
  }).format(amountMinor / 100);
}

export default async function DonationCancellationPage() {
  const viewer = await getViewer();
  const publicDecision = assertDonationCancellationCapability(
    "view_public_landing",
    { role: "public" },
    getDonationCancellationDeploymentEnvironment(),
    {
      featureEnabled: false,
      labsEnabled: false,
    },
  );

  if (!publicDecision.ok) {
    return <DonationCancellationNonMvpNotice decision={publicDecision} />;
  }

  const rounds = getDonationCancellationRounds();
  const recipients = getDonationCancellationRecipients();
  const markets = getDonationCancellationMarkets();
  const activeRounds = rounds.filter((round) => round.status === "open").map(getDonationCancellationPublicRound);
  const settled = createDonationCancellationDemoSettlement();
  const publicReport = serializeDonationCancellationPublicReport(settled.auditReport);
  const approvedRecipients = recipients.filter((recipient) => recipient.reviewState === "approved" && recipient.paymentRouteState === "verified");

  return (
    <div className="page-shell">
      <header className="hero">
        <SiteTopbar
          brandHref="/"
          links={getPrimaryNavLinks(Boolean(viewer))}
          {...getTopbarActions(Boolean(viewer))}
          showLogout={Boolean(viewer)}
        />
        <Breadcrumbs items={[{ href: "/donation-cancellation", label: "Cancel opposed donations" }]} />
        <PageHero
          actions={
            <>
              <Link className="button button-primary" href="/donation-cancellation/dev-donation-clearinghouse/register">
                Register intended donation
              </Link>
              <Link className="button button-secondary" href="#how-it-works">
                How it works
              </Link>
              <Link className="button button-secondary" href="#past-results">
                View past results
              </Link>
            </>
          }
          description="Register a donation you already intend to make. If someone on the other side registers an opposed donation, Moral Trade can redirect the matched amounts to a recipient you both find acceptable. If no compatible opposed donation is found, your money goes to your original intended destination."
          eyebrow="Moral Trade"
          title="Cancel opposed donations"
        >
          <aside className="hero-marketplace-visual panel" aria-label="Donation clearinghouse overview">
            <div className="visual-card visual-card-left">
              <span>Intended donation</span>
              <strong>Side A</strong>
              <p>Payment-backed registration</p>
            </div>
            <div className="visual-exchange" aria-hidden="true">
              <span />
              <span />
            </div>
            <div className="visual-card visual-card-right">
              <span>Opposed donation</span>
              <strong>Side B</strong>
              <p>Matched amount can redirect</p>
            </div>
            <div className="visual-ledger">
              <span>Fallback</span>
              <strong>Original intended recipient</strong>
            </div>
          </aside>
        </PageHero>
      </header>

      <main id="main-content" tabIndex={-1}>
        <section className="section section-white" aria-labelledby="promise-heading">
          <SectionHeader eyebrow="Core promise" id="promise-heading" title="Your fallback is the destination you chose.">
            Your money will go either to your intended recipient or, if an opposed donation is
            matched and you have consented to the suggested redirect recipient, to a mutually
            acceptable redirect recipient. If there is no compatible opposed donation, your money
            goes to your original intended destination.
          </SectionHeader>
          <div className="concept-grid">
            <article className="panel concept-card">
              <IconMark name="payment" />
              <h3>Payment-backed registration</h3>
              <p>
                Development mode uses simulated confirmation. Production stays blocked until
                provider authorization or compliant captured-funds support is configured.
              </p>
            </article>
            <article className="panel concept-card">
              <IconMark name="swap" />
              <h3>Opposed amounts match 1:1</h3>
              <p>
                Matching uses frozen gross minor units, deterministic largest-remainder rounding,
                and partial matching when one side has surplus.
              </p>
            </article>
            <article className="panel concept-card">
              <IconMark name="safety" />
              <h3>Redirect only with consent</h3>
              <p>
                Redirect recipients must be approved for the market, accepted by each user&apos;s
                frozen preferences, and verified again before settlement.
              </p>
            </article>
          </div>
        </section>

        <section className="section section-subtle" aria-labelledby="rounds-heading">
          <SectionHeader eyebrow="Active round" id="rounds-heading" title="Donation clearinghouse">
            Public pre-close progress is qualitative only. Exact gaps and counterparty identities
            are not shown.
          </SectionHeader>
          <div className="data-grid">
            {activeRounds.map((round) => (
              <article className="panel data-card" key={round.slug}>
                <p className="detail-kicker">{round.status} · {round.paymentMode}</p>
                <h3>{round.title}</h3>
                <p>{round.paymentCopy}</p>
                <p className="route-text">{round.progressCopy}</p>
                <div className="hero-actions">
                  <Link className="button button-primary" href={`/donation-cancellation/${round.slug}/register`}>
                    Register intended donation
                  </Link>
                  <Link className="button button-secondary" href={`/donation-cancellation/${round.slug}`}>
                    View round
                  </Link>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="section section-white" id="how-it-works" aria-labelledby="how-heading">
          <SectionHeader eyebrow="How it works" id="how-heading" title="Intended donation, priorities, review and payment.">
            The ordinary user flow freezes the intended recipient, moral priorities, redirect
            constraints, fallback mode, payment language, rulebook hash, and fee policy before the
            registration can count.
          </SectionHeader>
          <div className="step-card-grid">
            <article className="panel step-card">
              <span className="step-index">01</span>
              <h3>Intended donation</h3>
              <p>Choose an approved recipient, amount, and round. Unapproved recipients go to review first.</p>
            </article>
            <article className="panel step-card">
              <span className="step-index">02</span>
              <h3>Moral priorities</h3>
              <p>Private aggregate-only priorities suggest redirect recipients without creating a public score.</p>
            </article>
            <article className="panel step-card">
              <span className="step-index">03</span>
              <h3>Final review and payment</h3>
              <p>Payment copy distinguishes saved methods, authorization, capture, release, and donation execution.</p>
            </article>
            <article className="panel step-card">
              <span className="step-index">04</span>
              <h3>Settlement</h3>
              <p>Unmatched or incompatible matched amounts route to the original intended recipient.</p>
            </article>
          </div>
        </section>

        <section className="section section-subtle" aria-labelledby="admin-heading">
          <SectionHeader eyebrow="Review scope" id="admin-heading" title="Only reviewed nonprofit recipients and markets are available.">
            Users cannot create opposition markets directly. Political, election, campaign,
            vote-buying, threat-like, and lobbying flows are blocked in this release.
          </SectionHeader>
          <div className="data-grid">
            <article className="panel data-card">
              <p className="detail-kicker">Approved recipients</p>
              <h3>{approvedRecipients.length} dev recipients</h3>
              <p>{approvedRecipients.slice(0, 4).map((recipient) => recipient.name).join(", ")}.</p>
            </article>
            <article className="panel data-card">
              <p className="detail-kicker">Opposition markets</p>
              <h3>{markets.filter((market) => market.status === "active").length} active demo market</h3>
              <p>Every market requires legal, safety, and public-copy review before it can open.</p>
            </article>
            <article className="panel data-card">
              <p className="detail-kicker">Production state</p>
              <h3>Money movement blocked</h3>
              <p>{DONATION_CANCELLATION_BACKEND_REQUIREMENTS[4]}</p>
            </article>
          </div>
        </section>

        <section className="section section-white" id="past-results" aria-labelledby="results-heading">
          <SectionHeader eyebrow="Past results" id="results-heading" title="Settled report separates matched, redirected, intended, and fee totals.">
            Public reports use aggregate-only visibility and say &quot;opposed donation volume
            redirected&quot; rather than claiming objective impact.
          </SectionHeader>
          <dl className="mpgf-summary-grid">
            <div>
              <dt>Total registered</dt>
              <dd>{formatMinor(publicReport.grossRegisteredMinor)}</dd>
            </div>
            <div>
              <dt>Total matched</dt>
              <dd>{formatMinor(publicReport.grossMatchedMinor)}</dd>
            </div>
            <div>
              <dt>Redirected</dt>
              <dd>{formatMinor(publicReport.grossRedirectedMinor)}</dd>
            </div>
            <div>
              <dt>Routed to intended destinations</dt>
              <dd>{formatMinor(publicReport.grossRoutedToIntendedMinor)}</dd>
            </div>
            <div>
              <dt>Fees</dt>
              <dd>{formatMinor(publicReport.feeMinor)}</dd>
            </div>
          </dl>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
