import type { Metadata } from "next";
import Link from "next/link";

import { SiteFooter } from "@/components/layout/site-footer";
import { SiteTopbar } from "@/components/layout/site-topbar";
import {
  Breadcrumbs,
  PageHero,
  SectionHeader,
  StepCard,
  TradeFlowDiagram,
} from "@/components/ui/page-primitives";
import { getViewer } from "@/lib/app-data";
import { getAbsoluteUrl } from "@/lib/seo";
import { getPrimaryNavLinks, getTopbarActions } from "@/lib/site";

export const metadata: Metadata = {
  title: "Paid action offers",
  description:
    "Learn how paid moral-trade action offers can state action, payment, verification, and non-custody boundaries without claiming escrow.",
  alternates: {
    canonical: "/paid-action-offers",
  },
  openGraph: {
    title: "Paid action offers",
    description:
      "Structure paid action offers with payment pending verification, external payment evidence, and no legal escrow claim.",
    url: getAbsoluteUrl("/paid-action-offers"),
    type: "website",
  },
};

export default async function PaidActionOffersPage() {
  const viewer = await getViewer();
  const createHref = viewer ? "/offers/new?mode=payment" : "/signup?returnTo=/offers/new%3Fmode%3Dpayment";

  return (
    <div className="page-shell">
      <header className="hero">
        <SiteTopbar
          brandHref="/"
          links={getPrimaryNavLinks(Boolean(viewer))}
          {...getTopbarActions(Boolean(viewer))}
          showLogout={Boolean(viewer)}
        />
        <Breadcrumbs items={[{ href: "/paid-action-offers", label: "Paid action offers" }]} />

        <PageHero
          eyebrow="Trade format"
          title="Offer payment for bounded moral actions."
          description="Paid action offers can help coordinate costly actions, but public copy must stay clear: payment is pending verification, external evidence is reviewed, and Moral Trade is not legal escrow."
          actions={
            <>
              <Link className="button button-primary" href="/offers?mode=payment">
                Browse paid offers
              </Link>
              <Link className="button button-secondary" href={createHref}>
                Create paid offer
              </Link>
            </>
          }
        >
          <TradeFlowDiagram
            title="Paid action offer flow"
            steps={["Define the action", "State payment terms", "Verify evidence", "Resolve externally"]}
          />
        </PageHero>
      </header>

      <main id="main-content" tabIndex={-1}>
        <section className="section section-white" aria-labelledby="paid-required-heading">
          <SectionHeader eyebrow="Required terms" id="paid-required-heading" title="Payment language has to be especially careful.">
            The platform may record terms and evidence, but it should not imply custody, guaranteed payment, tax treatment, or legal enforceability.
          </SectionHeader>
          <div className="step-card-grid">
            <StepCard index={1} title="Bound the action.">
              Say what action is being requested, how it will be measured, and what does not count.
            </StepCard>
            <StepCard index={2} title="Name the payment condition.">
              Use payment-pending-verification language rather than escrow-backed or guaranteed payment language.
            </StepCard>
            <StepCard index={3} title="State evidence and dispute path.">
              Explain what evidence reviewers inspect and what happens when evidence is unresolved.
            </StepCard>
          </div>
        </section>

        <section className="section section-subtle" aria-labelledby="paid-boundaries-heading">
          <SectionHeader eyebrow="Legal posture" id="paid-boundaries-heading" title="No custody, escrow, tax, or investment claim.">
            Paid offers should remain external-payment records unless provider-approved checkout and reviewed legal terms explicitly support more.
          </SectionHeader>
          <div className="concept-grid">
            <article className="panel concept-card">
              <h3>External payments</h3>
              <p>Receipts and references can be reviewed as evidence; the platform does not hold funds by default.</p>
            </article>
            <article className="panel concept-card">
              <h3>Manual review</h3>
              <p>Unclear fulfillment, risky asks, or coercive terms should route to review before reliance.</p>
            </article>
            <article className="panel concept-card">
              <h3>No illegal or deceptive asks</h3>
              <p>Paid action offers must pass the same safety screen as pledge swaps and offsets.</p>
            </article>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
