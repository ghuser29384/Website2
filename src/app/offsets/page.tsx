import type { Metadata } from "next";
import Link from "next/link";

import { DealReceipt, type DealReceiptRow } from "@/components/marketplace/deal-receipt";
import { OffsetFlowFigure } from "@/components/marketplace/gain-field";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteTopbar } from "@/components/layout/site-topbar";
import { getDonationOffsetOverview, getViewer } from "@/lib/app-data";
import { getAbsoluteUrl } from "@/lib/seo";
import { getPrimaryNavLinks, getTopbarActions } from "@/lib/site";
import { hasSupabaseEnv } from "@/lib/supabase/config";

export const metadata: Metadata = {
  title: "Donation offsets",
  description:
    "Match opposed planned donations and redirect the matched amount into a named destination both donors prefer.",
  alternates: { canonical: "/offsets" },
  openGraph: {
    title: "Donation offsets at Moral Trade",
    description:
      "Turn a zero-sum pair of planned donations into a shared gain with explicit baselines, matched amounts, settlement, evidence, and surplus rules.",
    url: getAbsoluteUrl("/offsets"),
    type: "website",
  },
};

function formatMoney(amountCents: number | null | undefined) {
  if (amountCents === null || amountCents === undefined) {
    return "Not available";
  }

  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(amountCents / 100);
}

const receiptRows: readonly DealReceiptRow[] = [
  {
    label: "Without this deal",
    value: "Donor A gives $100 to Cause X; Donor B gives $100 to an opposed Cause Y.",
  },
  {
    label: "Your commitment",
    value: "Redirect the matched $100 amount from the stated original destination.",
  },
  {
    label: "Other commitments",
    value: "The counterparty redirects the same matched amount from the opposed destination.",
  },
  {
    label: "Condition",
    value: "Both prior intentions, the match, shared recipient, deadline, and settlement gates pass review.",
  },
  {
    label: "Maximum exposure",
    value: "$100. Unmatched amounts keep their published surplus rule.",
    emphasis: true,
  },
  {
    label: "Evidence",
    value: "Baseline evidence, payment authorization, recipient mapping, and settlement record.",
  },
  {
    label: "Exit",
    value: "Cancel before capture starts; failed paired settlement triggers the published compensation path.",
  },
];

const flow = [
  ["01", "State the planned donations", "Each donor records what they would otherwise fund and the evidence supporting that baseline."],
  ["02", "Match only the agreed amount", "The matched portion stops; unmatched surplus remains governed by the stated rule."],
  ["03", "Choose a shared destination", "Both donors inspect the named recipient, amount, deadline, and externality review."],
  ["04", "Authorize and settle", "The transaction moves through explicit mandate, capture, transfer, completion, refund, or dispute states."],
] as const;

export default async function OffsetsPage() {
  const viewer = await getViewer();
  const overview = hasSupabaseEnv() ? await getDonationOffsetOverview() : null;
  const isAuthenticated = Boolean(viewer);

  return (
    <div className="page-shell marketplace-product-shell">
      <div className="mt-beta-strip">
        <span>Offset</span>
        <span>A baseline claim is not accepted merely because both donors prefer the proposal.</span>
        <Link href="/donation-offsets">Advanced details</Link>
      </div>

      <header>
        <SiteTopbar
          brandHref="/"
          links={getPrimaryNavLinks(isAuthenticated)}
          {...getTopbarActions(isAuthenticated)}
          showLogout={isAuthenticated}
        />
      </header>

      <main className="mt-product-main" id="main-content" tabIndex={-1}>
        <section className="mt-mechanism-hero" aria-labelledby="offsets-heading">
          <div className="mt-mechanism-copy">
            <p className="mt-product-kicker">Donation offsets</p>
            <h1 id="offsets-heading">Turn a zero-sum donation into a shared gain.</h1>
            <p>
              When two people would otherwise fund opposed efforts, they can redirect the matched
              amount into a named destination both prefer to the original pair of donations.
            </p>
            <div className="mt-product-actions">
              <Link
                className="button button-primary"
                href="/offers/new?entry=draft&template=pure-opposed-cause&mode=offset"
              >
                Start an offset draft
              </Link>
              <Link className="button button-secondary" href="/worked-examples">
                Inspect examples
              </Link>
            </div>
            <ul className="mt-product-proof-line" aria-label="Offset terms">
              <li>Prior intent</li>
              <li>Matched amount</li>
              <li>Named recipient</li>
              <li>Compensated settlement</li>
            </ul>
          </div>
          <div className="mt-mechanism-visual">
            <OffsetFlowFigure />
          </div>
        </section>

        <section className="mt-product-section is-white" aria-labelledby="offset-flow-heading">
          <div className="mt-product-section-head">
            <div>
              <p className="mt-product-kicker">The flow</p>
              <h2 id="offset-flow-heading">Redirect the match, not the narrative.</h2>
            </div>
            <p>
              The interface distinguishes a planned donation, a saved authorization, a captured
              payment, a destination transfer, and a completed offset. Those states are not synonyms.
            </p>
          </div>
          <ol className="mt-how-grid">
            {flow.map(([number, title, description]) => (
              <li className="mt-how-step" key={number}>
                <span>{number}</span>
                <h3>{title}</h3>
                <p>{description}</p>
              </li>
            ))}
          </ol>
        </section>

        <section className="mt-product-section" aria-labelledby="offset-activity-heading">
          <div className="mt-product-section-head">
            <div>
              <p className="mt-product-kicker">Marketplace activity</p>
              <h2 id="offset-activity-heading">Report financial states precisely.</h2>
            </div>
            <p>
              Completed redirection, public-good routing, open pool commitments, and available pools
              are reported separately. A pledge is not counted as a completed donation.
            </p>
          </div>
          <div className="mt-mechanism-facts">
            <article className="mt-mechanism-fact">
              <span>Completed redirection</span>
              <strong>{formatMoney(overview?.totalRedirectedCents)}</strong>
              <p>Completed offset records only.</p>
            </article>
            <article className="mt-mechanism-fact">
              <span>Public-good routed</span>
              <strong>{formatMoney(overview?.moralPublicGoodsRedirectedCents)}</strong>
              <p>Completed offsets routed to broad public goods.</p>
            </article>
            <article className="mt-mechanism-fact">
              <span>Open commitments</span>
              <strong>{formatMoney(overview?.pooledCommitmentCents)}</strong>
              <p>Conditional commitments, not completed transfers.</p>
            </article>
            <article className="mt-mechanism-fact">
              <span>Available pools</span>
              <strong>{overview ? String(overview.pools.length) : "Not available"}</strong>
              <p>Pool records currently gathering or reviewing commitments.</p>
            </article>
          </div>
        </section>

        <section className="mt-product-section is-white" aria-labelledby="offset-receipt-heading">
          <div className="mt-receipt-layout">
            <div className="mt-receipt-copy">
              <p className="mt-product-kicker">Deal Receipt</p>
              <h2 id="offset-receipt-heading">The baseline and settlement stay inspectable together.</h2>
              <p>
                A completed offset should be shareable as terms, evidence, and settlement—not as an
                unsupported claim that one donation “cancelled” another in every relevant sense.
              </p>
              <Link className="button button-secondary" href="/donation-offsets">
                Review mechanism and safeguards
              </Link>
            </div>
            <DealReceipt
              note="Illustrative offset. It is not a live offer, payment authorization, tax receipt, or completed donation."
              rows={receiptRows}
              state="Draft"
              title="Cause X ↔ Cause Y"
            />
          </div>
        </section>

        <section className="mt-product-section" aria-labelledby="offset-claims-heading">
          <div className="mt-product-section-head">
            <div>
              <p className="mt-product-kicker">Claim discipline</p>
              <h2 id="offset-claims-heading">Three claims that must not be blurred.</h2>
            </div>
            <p>
              The product can state enforced conditionality and measured redirection. It should not
              routinely claim a counterfactual that the larger outcome depended on one specific user.
            </p>
          </div>
          <div className="mt-caveat-panel">
            <article>
              <h3>Conditionality</h3>
              <p>Your authorization is used only if the published match and settlement conditions pass.</p>
            </article>
            <article>
              <h3>Redirection</h3>
              <p>The matched amount moved from the opposed planned destinations to the named shared destination.</p>
            </article>
            <article>
              <h3>Pivotality</h3>
              <p>A claim that the outcome would not have happened without your specific action requires separate evidence.</p>
            </article>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
