import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { SiteFooter } from "@/components/layout/site-footer";
import { SiteTopbar } from "@/components/layout/site-topbar";
import { Breadcrumbs, PageHero, SectionHeader } from "@/components/ui/page-primitives";
import { getViewer } from "@/lib/app-data";
import {
  formatDirectDonationUpgradeUsd,
  getDirectDonationUpgradeConfig,
} from "@/lib/direct-donation-upgrade";
import { loadDirectDonationUpgradePrivateDetail } from "@/lib/direct-donation-upgrade-data";
import {
  PROVIDER_REFUND_RENDERED_QA_OFFER_ID,
  providerRefundRenderedQaPublicOffer,
} from "@/lib/provider-refund-rendered-qa";
import { getPrimaryNavLinks, getTopbarActions } from "@/lib/site";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  title: "Donation Upgrade provider status",
  robots: { index: false, follow: false },
};

interface PageProps {
  params: Promise<{ offerId: string }>;
}

function statusLabel(value: unknown) {
  return String(value ?? "unknown").replaceAll("_", " ");
}

export default async function DonationUpgradeProviderStatusPage({
  params,
}: PageProps) {
  const [{ offerId }, viewer] = await Promise.all([params, getViewer()]);
  const config = getDirectDonationUpgradeConfig();
  if (!config.environment) notFound();

  const renderedQaOffer =
    offerId === PROVIDER_REFUND_RENDERED_QA_OFFER_ID
      ? providerRefundRenderedQaPublicOffer(config.environment)
      : null;
  const detail = renderedQaOffer
    ? null
    : await loadDirectDonationUpgradePrivateDetail({
        offerId,
        viewerId: viewer?.authUser.id ?? null,
        environment: config.environment,
      });
  const publicOffer = (renderedQaOffer ?? detail?.publicOffer ?? null) as any;
  if (!publicOffer) notFound();

  const historicalGross = Number(publicOffer.verified_gross_amount_cents ?? 0);
  const historicalNet = Number(publicOffer.verified_net_amount_cents ?? 0);
  const currentGross = Number(
    publicOffer.current_unreversed_gross_amount_cents ?? historicalGross,
  );
  const currentNet = Number(
    publicOffer.current_unreversed_net_amount_cents ?? historicalNet,
  );
  const currentIncremental = Number(
    publicOffer.current_incremental_net_amount_cents ??
      publicOffer.incremental_net_amount_cents ??
      0,
  );
  const currentRedirected = Number(
    publicOffer.current_redirected_net_amount_cents ??
      publicOffer.redirected_net_amount_cents ??
      0,
  );
  const reversedCount = Number(
    publicOffer.provider_reversed_obligation_count ?? 0,
  );
  const hasProviderRefund =
    reversedCount > 0 || publicOffer.status === "post_completion_exception";

  return (
    <div className="page-shell">
      <header className="hero">
        <SiteTopbar
          brandHref="/"
          links={getPrimaryNavLinks(Boolean(viewer))}
          {...getTopbarActions(Boolean(viewer))}
          showLogout={Boolean(viewer)}
        />
        <Breadcrumbs
          items={[
            { href: "/donation-upgrades", label: "Donation Upgrades" },
            {
              href: `/donation-upgrades/${offerId}`,
              label: "Exact commitment",
            },
            {
              href: `/donation-upgrades/${offerId}/provider-status`,
              label: "Provider status",
            },
          ]}
        />
        <PageHero
          eyebrow={`Provider status · ${statusLabel(publicOffer.status)}`}
          title={
            hasProviderRefund
              ? "A later Every.org refund changed current credited impact."
              : "Every.org confirmation is a factual record, not a finality guarantee."
          }
          description={
            hasProviderRefund
              ? "The original authenticated confirmation remains in the audit history. Current unreversed figures exclude the provider-refunded obligation."
              : "Every.org confirmed the donation at the recorded time. Rare fraud-related refunds can later occur, and Moral Trade does not process or issue those refunds."
          }
          actions={
            <Link
              className="button button-secondary"
              href={`/donation-upgrades/${offerId}`}
            >
              Back to exact commitment
            </Link>
          }
        />
      </header>

      <main id="main-content" tabIndex={-1}>
        <section
          className="section section-white"
          aria-labelledby="provider-accounting-heading"
        >
          <SectionHeader
            eyebrow="Provider-confirmed history and current credit"
            id="provider-accounting-heading"
            title="Historical confirmation and current unreversed value remain separately reconstructible."
          >
            Provider reconciliation, factual fulfillment, credibility, and
            counterfactual additionality are separate. Recording a provider
            refund changes current factual-credit status; it does not establish
            what a participant otherwise would have done.
          </SectionHeader>
          <div className="pilot-metric-grid">
            <article className="panel data-card">
              <p className="detail-kicker">Historical confirmed gross</p>
              <h2>{formatDirectDonationUpgradeUsd(historicalGross)}</h2>
            </article>
            <article className="panel data-card">
              <p className="detail-kicker">Historical confirmed net</p>
              <h2>{formatDirectDonationUpgradeUsd(historicalNet)}</h2>
            </article>
            <article className="panel data-card">
              <p className="detail-kicker">Current unreversed gross</p>
              <h2>{formatDirectDonationUpgradeUsd(currentGross)}</h2>
            </article>
            <article className="panel data-card">
              <p className="detail-kicker">Current unreversed net credit</p>
              <h2>{formatDirectDonationUpgradeUsd(currentNet)}</h2>
            </article>
            <article className="panel data-card">
              <p className="detail-kicker">Current incremental net</p>
              <h2>{formatDirectDonationUpgradeUsd(currentIncremental)}</h2>
            </article>
            <article className="panel data-card">
              <p className="detail-kicker">Current redirected net</p>
              <h2>{formatDirectDonationUpgradeUsd(currentRedirected)}</h2>
            </article>
            <article className="panel data-card">
              <p className="detail-kicker">Provider-refunded obligations</p>
              <h2>{reversedCount}</h2>
            </article>
          </div>

          <div
            className={`status-banner ${
              hasProviderRefund ? "status-banner-error" : ""
            }`}
            role="status"
          >
            <strong>
              {hasProviderRefund
                ? "Provider refund recorded"
                : "Confirmed by Every.org"}
            </strong>
            <p>
              {hasProviderRefund
                ? "Every.org authoritative evidence records a later refund. The original confirmation and its hashes remain immutable, while current credit excludes the refunded amount."
                : "Every.org confirmed this donation, but rare fraud-related refunds can later occur."}
            </p>
            <p>
              Moral Trade does not receive, hold, process, issue, or refund the
              payment. A provider refund is not participant default, failed
              donation, cancellation, or Moral Trade action.
            </p>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
