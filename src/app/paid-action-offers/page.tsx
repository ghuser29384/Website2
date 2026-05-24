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
  title: "Deferred paid action offers",
  description:
    "Why paid moral-trade action offers are deferred until validation, identity, dispute, and compliance workflows are mature.",
  alternates: {
    canonical: "/paid-action-offers",
  },
  openGraph: {
    title: "Deferred paid action offers",
    description:
      "Paid action offers remain outside the mainstream Moral Trade launch wedge while trust and compliance workflows mature.",
    url: getAbsoluteUrl("/paid-action-offers"),
    type: "website",
  },
};

export default async function PaidActionOffersPage() {
  const viewer = await getViewer();

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
          title="Paid action offers are deferred."
          description="The pilot keeps general paid action offers out of the mainstream creation path until identity, dispute, legal, and evidence workflows are strong enough for the higher trust burden."
          actions={
            <>
              <Link className="button button-primary" href="/offers?mode=payment">
                View worked examples
              </Link>
              <Link className="button button-secondary" href="/validation">
                Review validation rules
              </Link>
              <Link className="text-button" href={viewer ? "/offers/new?mode=offset" : "/signup?returnTo=/offers/new%3Fmode%3Doffset"}>
                Create verified offset instead
              </Link>
            </>
          }
        >
          <TradeFlowDiagram
            title="Paid action offer flow"
            steps={["Defer public creation", "Design evidence rules", "Mature disputes", "Pilot by invitation"]}
          />
        </PageHero>
      </header>

      <main id="main-content" tabIndex={-1}>
        <section className="section section-white" aria-labelledby="paid-required-heading">
          <SectionHeader eyebrow="Why deferred" id="paid-required-heading" title="Payment language is not the only risk.">
            Paid actions can drift into labor, exploitation, enforcement, AML/KYC, tax, and dispute issues faster than donation offsets or pledge swaps.
          </SectionHeader>
          <div className="step-card-grid">
            <StepCard index={1} title="Bound the action.">
              A paid pilot would need precise action scope, measurement rules, and exclusions.
            </StepCard>
            <StepCard index={2} title="Name the payment condition.">
              It must say payment is pending verification, avoid escrow-backed or guaranteed
              payment language, and state that the record is not legal escrow.
            </StepCard>
            <StepCard index={3} title="State evidence and dispute path.">
              It needs a mature reviewer lane, challenge window, and unresolved-evidence state before launch.
            </StepCard>
          </div>
        </section>

        <section className="section section-subtle" aria-labelledby="paid-boundaries-heading">
          <SectionHeader eyebrow="Legal posture" id="paid-boundaries-heading" title="No custody, escrow, tax, or investment claim.">
            Paid offers remain external-payment examples unless provider-approved checkout, verified counterparties, and reviewed legal terms explicitly support more.
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
