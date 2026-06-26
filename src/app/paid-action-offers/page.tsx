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
import { buildBreadcrumbJsonLd, buildWebPageJsonLd, getAbsoluteUrl } from "@/lib/seo";
import { getPrimaryNavLinks, getTopbarActions } from "@/lib/site";

const paidActionOffersDescription =
  "Paid action offers are not open to the public yet. Moral Trade keeps them deferred until identity, dispute, legal, and evidence workflows are mature enough for higher-trust paid moral action pilots.";

const paidActionAlternatives = [
  {
    href: "/worked-examples",
    label: "Inspect a worked example",
    summary: "See how reviewed examples stay non-binding until terms, evidence, and review are clear.",
  },
  {
    href: "/offers/new?mode=offset",
    label: "Create a donation offset",
    summary: "Draft a lower-risk redirect with baseline, destination, proof, and review boundaries.",
  },
  {
    href: "/signup?returnTo=/paid-action-offers",
    label: "Join an invitation-only pilot",
    summary: "Sign in to express interest without creating a public, payable, or reliance-bearing offer.",
  },
] as const;

export const metadata: Metadata = {
  title: "Deferred paid action offers",
  description: paidActionOffersDescription,
  alternates: {
    canonical: "/paid-action-offers",
  },
  openGraph: {
    title: "Deferred paid action offers | Moral Trade",
    description: paidActionOffersDescription,
    url: getAbsoluteUrl("/paid-action-offers"),
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Deferred paid action offers | Moral Trade",
    description: paidActionOffersDescription,
  },
};

export default async function PaidActionOffersPage() {
  const viewer = await getViewer();
  const paidActionStructuredData = buildWebPageJsonLd({
    name: "Deferred paid action offers | Moral Trade",
    description: paidActionOffersDescription,
    path: "/paid-action-offers",
  });
  const breadcrumbStructuredData = buildBreadcrumbJsonLd([
    { href: "/paid-action-offers", label: "Paid action offers" },
  ]);

  return (
    <div className="page-shell">
      <script
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(paidActionStructuredData),
        }}
        type="application/ld+json"
      />
      <script
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(breadcrumbStructuredData),
        }}
        type="application/ld+json"
      />
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
          title="Paid action offers are not open to the public yet."
          description="Use one of the safe alternatives below; public paid-action creation stays closed until review, payment, dispute, and legal controls are ready."
          actions={
            <>
              <Link className="button button-primary" href="/worked-examples">
                Inspect a worked example
              </Link>
              <Link className="button button-secondary" href={viewer ? "/offers/new?mode=offset" : "/signup?returnTo=/offers/new%3Fmode%3Doffset"}>
                Create a donation offset
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
        <section className="section section-white" aria-labelledby="paid-safe-alternatives-heading">
          <SectionHeader
            eyebrow="Safe alternatives"
            id="paid-safe-alternatives-heading"
            title="Choose one of three non-public paid-action paths."
          >
            None of these creates a payable paid-action offer, locks a deal, or asks reviewers to
            accept compensation terms before the pilot is ready.
          </SectionHeader>
          <div className="concept-grid">
            {paidActionAlternatives.map((alternative) => (
              <article className="panel concept-card" key={alternative.label}>
                <h3>{alternative.label}</h3>
                <p>{alternative.summary}</p>
                <Link className="inline-link" href={alternative.href}>
                  {alternative.label}
                </Link>
              </article>
            ))}
          </div>
        </section>

        <section className="section section-white" aria-labelledby="paid-required-heading">
          <SectionHeader eyebrow="Why deferred" id="paid-required-heading" title="Payment language is not the only risk.">
            Paid actions can drift into labor, exploitation, enforcement, AML/KYC, tax, and dispute issues faster than donation offsets or pledge swaps.
          </SectionHeader>
          <details className="pilot-note">
            <summary>Details on labor, exploitation, AML/KYC, tax, and dispute risks</summary>
            <div className="step-card-grid">
              <StepCard index={1} title="Bound the action.">
                A paid pilot would need precise action scope, measurement rules, and exclusions.
              </StepCard>
              <StepCard index={2} title="Name the payment condition.">
                It must say payment is pending verification, avoid escrow-backed or guaranteed
                payment language, and state that the record is not legal escrow.
              </StepCard>
              <StepCard index={3} title="State evidence and dispute path.">
                It needs a mature reviewer lane, challenge window, and unresolved-evidence state
                before launch.
              </StepCard>
            </div>
          </details>
        </section>

        <section className="section section-subtle" aria-labelledby="paid-boundaries-heading">
          <SectionHeader eyebrow="Legal posture" id="paid-boundaries-heading" title="No custody, escrow, tax, or investment claim.">
            Paid offers remain external-payment examples unless provider-approved checkout, verified counterparties, and reviewed legal terms explicitly support more.
          </SectionHeader>
          <details className="pilot-note">
            <summary>Review legal and payment boundaries</summary>
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
          </details>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
