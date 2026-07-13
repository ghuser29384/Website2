import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { SiteFooter } from "@/components/layout/site-footer";
import { SiteTopbar } from "@/components/layout/site-topbar";
import { Breadcrumbs, IconMark, SectionHeader } from "@/components/ui/page-primitives";
import {
  DONATION_CANCELLATION_BACKEND_REQUIREMENTS,
  assertDonationCancellationCapability,
  createDonationCancellationDemoSettlement,
  getDonationCancellationDeploymentEnvironment,
  getDonationCancellationMarkets,
  getDonationCancellationRecipients,
  getDonationCancellationRoundBySlug,
  getDonationCancellationRounds,
  paymentModeCopy,
  serializeDonationCancellationPublicReport,
} from "@/lib/moral-trade/donation-cancellation-clearinghouse";
import { getAbsoluteUrl } from "@/lib/seo";
import { getPrimaryNavLinks, getTopbarActions } from "@/lib/site";
import { DonationCancellationNonMvpNotice } from "../non-mvp-notice";

interface RoundPageProps {
  params: Promise<{ roundSlug: string }>;
}

export function generateStaticParams() {
  return getDonationCancellationRounds({ environment: "production" }).map((round) => ({
    roundSlug: round.slug,
  }));
}

export async function generateMetadata({ params }: RoundPageProps): Promise<Metadata> {
  const { roundSlug } = await params;
  const round = getDonationCancellationRoundBySlug(roundSlug);

  if (!round) {
    return { title: "Donation clearinghouse round unavailable" };
  }

  return {
    alternates: {
      canonical: `/donation-cancellation/${round.slug}`,
    },
    description: "Status: non-MVP labs/research mechanism. Production public rounds are disabled.",
    openGraph: {
      description: "Donation Cancellation Clearinghouse rounds are not part of the current CGPP MVP.",
      title: "Donation clearinghouse round unavailable",
      type: "article",
      url: getAbsoluteUrl(`/donation-cancellation/${round.slug}`),
    },
    title: "Donation clearinghouse round unavailable",
  };
}

function formatMinor(amountMinor: number, currency = "usd") {
  return new Intl.NumberFormat("en-US", {
    currency: currency.toUpperCase(),
    maximumFractionDigits: amountMinor % 100 === 0 ? 0 : 2,
    style: "currency",
  }).format(amountMinor / 100);
}

export default async function DonationCancellationRoundPage({ params }: RoundPageProps) {
  const { roundSlug } = await params;
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
    return <DonationCancellationNonMvpNotice decision={publicDecision} title="Donation Cancellation Clearinghouse rounds are not currently available." />;
  }

  const round = getDonationCancellationRoundBySlug(roundSlug);

  if (!round) {
    notFound();
  }

  const recipients = getDonationCancellationRecipients();
  const markets = getDonationCancellationMarkets();
  const approvedRecipients = recipients.filter((recipient) => recipient.reviewState === "approved");
  const activeMarkets = markets.filter((market) => market.status === "active");
  const settled = round.status === "settled" ? createDonationCancellationDemoSettlement() : null;
  const publicReport = settled ? serializeDonationCancellationPublicReport(settled.auditReport) : null;

  return (
    <div className="page-shell page-shell-focused">
      <header className="v72-route-header">
        <SiteTopbar brandHref="/" links={getPrimaryNavLinks(false)} {...getTopbarActions(false)} />
        <Breadcrumbs
          items={[
            { href: "/donation-cancellation", label: "Cancel opposed donations" },
            { href: `/donation-cancellation/${round.slug}`, label: round.title },
          ]}
        />
      </header>

      <main id="main-content" tabIndex={-1}>
        <section className="v72-detail-screen" aria-labelledby="round-heading">
          <div className="v72-top-controls">
            <Link className="text-button" href="/donation-cancellation">
              Back to clearinghouse
            </Link>
          </div>

          <article className="v72-decision-block panel">
            <div className="v72-decision-main">
              <span className="moral-deal-visual moral-deal-visual-offset-trade" aria-hidden="true">
                <IconMark name="offset" />
              </span>
              <div>
                <p className="detail-kicker">Donation clearinghouse · {round.status}</p>
                <h1 id="round-heading">{round.title}</h1>
                <p>{round.description}</p>
              </div>
            </div>
            <dl className="v72-receipt-facts v72-economics-band">
              <div>
                <dt>Payment mode</dt>
                <dd>{round.paymentMode}</dd>
              </div>
              <div>
                <dt>Per-user range</dt>
                <dd>{formatMinor(round.perUserGrossMinMinor)} to {formatMinor(round.perUserGrossMaxMinor)}</dd>
              </div>
              <div>
                <dt>Fallback</dt>
                <dd>Original intended destination</dd>
              </div>
            </dl>
            <div className="v72-trust-strip" aria-label="Donation clearinghouse trust facts">
              <span>Feature flag: {round.featureFlag}</span>
              <span>Progress qualitative before close</span>
              <span>Rulebook hash recorded</span>
            </div>
          </article>

          <div className="marketplace-detail-grid">
            <section className="panel" aria-labelledby="recipients-heading">
              <div className="section-head section-head-compact">
                <p className="eyebrow">Recipients</p>
                <h2 id="recipients-heading">Approved recipient list</h2>
                <p>Only approved recipients with verified routes can receive routed donations.</p>
              </div>
              <div className="mpgf-table" aria-label="Approved recipients">
                {approvedRecipients.slice(0, 6).map((recipient) => (
                  <div className="mpgf-table-row" key={recipient.id}>
                    <span>{recipient.name}</span>
                    <span>{recipient.paymentRouteState}</span>
                    <span>{recipient.causeAreaTags.join(", ")}</span>
                  </div>
                ))}
              </div>
            </section>

            <aside className="marketplace-detail-side">
              <section className="panel" aria-labelledby="payment-heading">
                <h2 id="payment-heading">Payment state</h2>
                <p>{paymentModeCopy(round.paymentMode)}</p>
                <p className="v72-receipt-fragment">
                  No production capture is available from this route until provider and compliance
                  gates pass.
                </p>
              </section>
              <section className="panel" aria-labelledby="register-heading">
                <h2 id="register-heading">Register intended donation</h2>
                <p>
                  The registration flow freezes your intended recipient, redirect preferences,
                  fallback mode, rulebook hash, and payment wording before payment-backed
                  registration.
                </p>
                <Link className="button button-primary" href={`/donation-cancellation/${round.slug}/register`}>
                  Register intended donation
                </Link>
              </section>
            </aside>
          </div>
        </section>

        <section className="section section-subtle" aria-labelledby="markets-heading">
          <SectionHeader eyebrow="Opposition markets" id="markets-heading" title="Admin-reviewed markets only.">
            Users cannot define opposition markets directly. Each market requires legal, safety,
            and public-copy review before registrations can match against it.
          </SectionHeader>
          <div className="data-grid">
            {activeMarkets.map((market) => (
              <article className="panel data-card" key={market.id}>
                <p className="detail-kicker">{market.status}</p>
                <h3>{market.title}</h3>
                <p>{market.summary}</p>
                <p className="route-text">
                  {market.sideALabel} / {market.sideBLabel}; redirect list has{" "}
                  {market.allowedRedirectRecipientIds.length} approved candidates.
                </p>
              </article>
            ))}
          </div>
        </section>

        {publicReport ? (
          <section className="section section-white" aria-labelledby="report-heading">
            <SectionHeader eyebrow="Public report" id="report-heading" title="Aggregate-only settlement report.">
              The report suppresses counterparty identities, priority weights, exact private scores,
              payment references, and private review notes.
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
                <dt>Opposed donation volume redirected</dt>
                <dd>{formatMinor(publicReport.grossRedirectedMinor)}</dd>
              </div>
              <div>
                <dt>Routed to intended destinations</dt>
                <dd>{formatMinor(publicReport.grossRoutedToIntendedMinor)}</dd>
              </div>
            </dl>
          </section>
        ) : (
          <section className="section section-white" aria-labelledby="blocked-heading">
            <SectionHeader eyebrow="Production gap" id="blocked-heading" title="Settlement preview is non-mutating until live routing is connected.">
              This route is development-safe. Production settlement requires the missing backend
              work below before any money movement can occur.
            </SectionHeader>
            <div className="data-grid">
              {DONATION_CANCELLATION_BACKEND_REQUIREMENTS.slice(0, 3).map((requirement) => (
                <article className="panel data-card" key={requirement}>
                  <p className="detail-kicker">Required</p>
                  <h3>{requirement}</h3>
                </article>
              ))}
            </div>
          </section>
        )}
      </main>

      <SiteFooter />
    </div>
  );
}
