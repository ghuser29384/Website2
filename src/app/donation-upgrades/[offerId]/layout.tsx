import type { ReactNode } from "react";

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

interface LayoutProps {
  children: ReactNode;
  params: Promise<{ offerId: string }>;
}

export default async function DonationUpgradeOfferLayout({
  children,
  params,
}: LayoutProps) {
  const [{ offerId }, viewer] = await Promise.all([params, getViewer()]);
  const config = getDirectDonationUpgradeConfig();

  if (!config.environment) return children;

  const detail = await loadDirectDonationUpgradePrivateDetail({
    offerId,
    viewerId: viewer?.authUser.id ?? null,
    environment: config.environment,
  });
  const renderedQaOffer =
    offerId === PROVIDER_REFUND_RENDERED_QA_OFFER_ID
      ? providerRefundRenderedQaPublicOffer(config.environment)
      : null;
  const publicOffer = (renderedQaOffer ?? detail.publicOffer) as
    | NonNullable<typeof detail.publicOffer>
    | null;
  if (!publicOffer) return children;

  const reversedCount = publicOffer.provider_reversed_obligation_count ?? 0;
  const historicalGross = publicOffer.verified_gross_amount_cents ?? 0;
  const historicalNet = publicOffer.verified_net_amount_cents ?? 0;
  const currentGross =
    publicOffer.current_unreversed_gross_amount_cents ?? historicalGross;
  const currentNet =
    publicOffer.current_unreversed_net_amount_cents ?? historicalNet;
  const currentIncremental =
    publicOffer.current_incremental_net_amount_cents ??
    publicOffer.incremental_net_amount_cents ??
    0;
  const currentRedirected =
    publicOffer.current_redirected_net_amount_cents ??
    publicOffer.redirected_net_amount_cents ??
    0;
  const providerRefundRecorded =
    reversedCount > 0 || publicOffer.status === "post_completion_exception";

  return (
    <>
      <aside
        aria-labelledby="donation-upgrade-provider-status-heading"
        className={`status-banner ${
          providerRefundRecorded ? "status-banner-error" : ""
        }`}
        style={{ margin: "1rem auto", maxWidth: "72rem" }}
      >
        <strong id="donation-upgrade-provider-status-heading">
          {providerRefundRecorded
            ? "Provider refund recorded"
            : "Every.org confirmation is not irreversible finality"}
        </strong>
        <p>
          {providerRefundRecorded
            ? "Every.org authoritative evidence records a later refund. The original donation confirmation remains in the immutable audit history, while current credited impact excludes the refunded obligation."
            : "When an obligation is verified, Every.org confirmed the donation at that time. Rare fraud-related refunds can later occur."}
        </p>
        <p>
          Moral Trade does not receive, hold, process, issue, or refund the
          charitable payment. A provider refund is distinct from participant
          default, failed donation, cancellation, and Moral Trade action.
        </p>
        {providerRefundRecorded ? (
          <>
            <p>
              This agreement is in a post-completion exception state because a
              required donation was later refunded by the provider. This status
              does not retroactively establish what the participant otherwise
              would have done.
            </p>
            <dl className="detail-grid">
              <div>
                <dt>Historical provider-confirmed gross</dt>
                <dd>{formatDirectDonationUpgradeUsd(historicalGross)}</dd>
              </div>
              <div>
                <dt>Historical provider-confirmed net</dt>
                <dd>{formatDirectDonationUpgradeUsd(historicalNet)}</dd>
              </div>
              <div>
                <dt>Current unreversed gross</dt>
                <dd>{formatDirectDonationUpgradeUsd(currentGross)}</dd>
              </div>
              <div>
                <dt>Current unreversed net credit</dt>
                <dd>{formatDirectDonationUpgradeUsd(currentNet)}</dd>
              </div>
              <div>
                <dt>Current incremental net credit</dt>
                <dd>{formatDirectDonationUpgradeUsd(currentIncremental)}</dd>
              </div>
              <div>
                <dt>Current redirected net credit</dt>
                <dd>{formatDirectDonationUpgradeUsd(currentRedirected)}</dd>
              </div>
              <div>
                <dt>Provider-reversed obligations</dt>
                <dd>{reversedCount}</dd>
              </div>
            </dl>
            <p className="field-note">
              Any “Verified” totals on the underlying record are retained as
              historical provider-confirmation totals. The current unreversed
              figures above are the current factual-credit totals.
            </p>
          </>
        ) : null}
      </aside>
      {children}
    </>
  );
}
