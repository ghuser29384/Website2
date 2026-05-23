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
  title: "Pledge swaps",
  description:
    "Learn how to structure voluntary pledge swaps with reciprocal terms, evidence rules, duration, and review boundaries.",
  alternates: {
    canonical: "/pledge-swaps",
  },
  openGraph: {
    title: "Pledge swaps",
    description:
      "Structure voluntary reciprocal commitments with explicit evidence rules and safety review.",
    url: getAbsoluteUrl("/pledge-swaps"),
    type: "website",
  },
};

export default async function PledgeSwapsPage() {
  const viewer = await getViewer();
  const createHref = viewer ? "/offers/new?mode=pledge" : "/signup?returnTo=/offers/new%3Fmode%3Dpledge";

  return (
    <div className="page-shell">
      <header className="hero">
        <SiteTopbar
          brandHref="/"
          links={getPrimaryNavLinks(Boolean(viewer))}
          {...getTopbarActions(Boolean(viewer))}
          showLogout={Boolean(viewer)}
        />
        <Breadcrumbs items={[{ href: "/pledge-swaps", label: "Pledge swaps" }]} />

        <PageHero
          eyebrow="Trade format"
          title="Swap bounded pledges under explicit terms."
          description="A pledge swap lets two parties commit to actions each side values, while keeping the exchange voluntary, reviewable, and reversible under stated exit rules."
          actions={
            <>
              <Link className="button button-primary" href="/offers?mode=pledge">
                Browse pledge swaps
              </Link>
              <Link className="button button-secondary" href={createHref}>
                Create pledge swap
              </Link>
            </>
          }
        >
          <TradeFlowDiagram
            title="Pledge swap flow"
            steps={["State your pledge", "Name the reciprocal ask", "Set evidence and duration", "Review before reliance"]}
          />
        </PageHero>
      </header>

      <main id="main-content" tabIndex={-1}>
        <section className="section section-white" aria-labelledby="pledge-required-heading">
          <SectionHeader eyebrow="Required terms" id="pledge-required-heading" title="A good pledge swap is specific enough to inspect.">
            The listing should make it clear what each party is offering, what counts as fulfillment, and when either party can exit.
          </SectionHeader>
          <div className="step-card-grid">
            <StepCard index={1} title="Action and counter-action.">
              Describe both sides plainly, including scope, cadence, and any exclusions.
            </StepCard>
            <StepCard index={2} title="Duration and exit rule.">
              State when the pledge starts, when it ends, and how either side can stop relying on it.
            </StepCard>
            <StepCard index={3} title="Evidence standard.">
              Name whether receipts, public pledges, peer witness, or qualitative notes are expected.
            </StepCard>
          </div>
        </section>

        <section className="section section-subtle" aria-labelledby="pledge-safety-heading">
          <SectionHeader eyebrow="Safety boundaries" id="pledge-safety-heading" title="Pledge swaps are trades, not pressure campaigns.">
            The platform blocks threats, harassment, illegal asks, deceptive baselines, and pressure on vulnerable people.
          </SectionHeader>
          <div className="concept-grid">
            <article className="panel concept-card">
              <h3>Voluntary only</h3>
              <p>Each side must be able to decline without penalty outside the stated proposal.</p>
            </article>
            <article className="panel concept-card">
              <h3>No hidden leverage</h3>
              <p>Do not use private information, intimidation, or reputational threats to induce acceptance.</p>
            </article>
            <article className="panel concept-card">
              <h3>Review before trust</h3>
              <p>Published terms remain subject to manual review before anyone should rely on them.</p>
            </article>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
