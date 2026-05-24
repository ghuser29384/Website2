import type { Metadata } from "next";
import Link from "next/link";

import { SiteFooter } from "@/components/layout/site-footer";
import { SiteTopbar } from "@/components/layout/site-topbar";
import {
  Breadcrumbs,
  IconMark,
  PageHero,
  SectionHeader,
  StepCard,
  TradeFlowDiagram,
} from "@/components/ui/page-primitives";
import { getViewer } from "@/lib/app-data";
import { getAbsoluteUrl } from "@/lib/seo";
import { getPrimaryNavLinks, getTopbarActions } from "@/lib/site";
import {
  TRUST_BADGE_LADDER,
  VALIDATION_STATUS_STATES,
  VALIDATOR_SCOPES,
} from "@/lib/validation";

export const metadata: Metadata = {
  title: "Validation and evidence",
  description:
    "How Moral Trade turns manual review into validator scopes, evidence states, challenge windows, and transaction-linked trust badges.",
  alternates: {
    canonical: "/validation",
  },
  openGraph: {
    title: "Validation and evidence",
    description:
      "Validator scopes, evidence states, challenge windows, and transaction-linked trust badges for Moral Trade.",
    url: getAbsoluteUrl("/validation"),
    type: "website",
  },
};

export default async function ValidationPage() {
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
        <Breadcrumbs items={[{ href: "/validation", label: "Validation" }]} />

        <PageHero
          eyebrow="Validation and evidence"
          title="Manual review becomes an explicit institution."
          description="The pilot should not rely on vague trust. Every visible proof claim needs a scope, evidence schema, challenge lane, and completion state."
          actions={
            <>
              <Link className="button button-primary" href={viewer ? "/offers/new?mode=offset" : "/signup?returnTo=/offers/new%3Fmode%3Doffset"}>
                Create reviewed offset
              </Link>
              <Link className="button button-secondary" href="/admin">
                Open operator console
              </Link>
            </>
          }
        >
          <TradeFlowDiagram
            title="Validation flow"
            steps={["State baseline", "Attach evidence", "Screen risk", "Open challenge", "Review completion"]}
          />
        </PageHero>
      </header>

      <main id="main-content" tabIndex={-1}>
        <section className="section section-white" aria-labelledby="scope-heading">
          <SectionHeader eyebrow="Validator scope" id="scope-heading" title="What reviewers are allowed to certify.">
            Reviewers certify narrow evidence claims, not broad moral worth, legal enforceability, tax treatment, escrow status, or final real-world impact.
          </SectionHeader>
          <div className="concept-grid">
            {VALIDATOR_SCOPES.map((scope) => (
              <article className="panel concept-card" key={scope.title}>
                <IconMark name="review" />
                <h3>{scope.title}</h3>
                <p>{scope.detail}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="section section-subtle" aria-labelledby="states-heading">
          <SectionHeader eyebrow="Status taxonomy" id="states-heading" title="Every proof claim should have a visible state." />
          <div className="data-grid">
            {VALIDATION_STATUS_STATES.map((state, index) => (
              <article className="panel data-card" key={state.state}>
                <p className="detail-kicker">State {index + 1}</p>
                <h3>{state.state}</h3>
                <p>{state.meaning}</p>
                <p className="panel-note">{state.reviewerAction}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="section section-white" aria-labelledby="badges-heading">
          <SectionHeader eyebrow="Trust ladder" id="badges-heading" title="Badges are transaction-linked, never decorative." />
          <div className="step-card-grid">
            {TRUST_BADGE_LADDER.map((badge, index) => (
              <StepCard index={index + 1} key={badge} title={badge}>
                {badge === "Provider payment verified"
                  ? "Only provider-linked receipts or webhooks should create this badge."
                  : "Show this badge only when the underlying record and review scope support it."}
              </StepCard>
            ))}
          </div>
        </section>

        <section className="section section-subtle" aria-labelledby="governance-heading">
          <SectionHeader eyebrow="Governance" id="governance-heading" title="Centralized operator, published rules, independent review.">
            The next operating model is founder-led moderation with a public rulebook, an appeal path, external reviewer panel, and real transparency numbers.
          </SectionHeader>
          <div className="concept-grid">
            <article className="panel concept-card">
              <h3>Rulebook first</h3>
              <p>No threats, coercive baselines, hidden platform fees, unsupported jurisdictions, or campaign-contribution offsets.</p>
            </article>
            <article className="panel concept-card">
              <h3>Appeals and audits</h3>
              <p>Hard cases should leave an internal audit log and, when safe, a short publishable reasoning summary.</p>
            </article>
            <article className="panel concept-card">
              <h3>Portable later</h3>
              <p>The pilot stays centralized for safety and compliance while preserving exportable records for future interoperability.</p>
            </article>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
