import type { Metadata } from "next";
import Link from "next/link";

import { SiteFooter } from "@/components/layout/site-footer";
import { SiteTopbar } from "@/components/layout/site-topbar";
import { getViewer } from "@/lib/app-data";
import { getAbsoluteUrl } from "@/lib/seo";
import { getPrimaryNavLinks, getTopbarActions } from "@/lib/site";

export const metadata: Metadata = {
  title: "Research and Governance",
  description:
    "Moral Trade's research agenda, safety blockers, reviewer governance, transparency commitments, and open mechanism-design questions.",
  alternates: {
    canonical: "/research",
  },
  openGraph: {
    title: "Research and Governance",
    description:
      "Research framing, reviewer rulebooks, transparency plans, and open mechanism-design questions for Moral Trade.",
    url: getAbsoluteUrl("/research"),
    type: "article",
  },
};

const testAreas = [
  "Whether low-risk pledge swaps can be made legible enough for serious counterparty discovery.",
  "Whether action evidence and baseline confidence can be separated without overwhelming users.",
  "Whether moral public-good threshold commitments can coordinate overlapping moral reasons.",
  "Whether consent-gated matching can produce useful introductions without exposing exact wishes prematurely.",
] as const;

const unsafeSignals = [
  "The service rewards threats, newly escalated harmful behavior, or coercive bargaining.",
  "Scores start looking like platform moral rankings rather than party-relative statements.",
  "Private matching becomes targeting, surveillance, scraping, or autonomous outreach.",
  "Third-party objections are ignored because both direct parties prefer the trade.",
] as const;

const openQuestions = [
  "How should reviewers distinguish genuine counterfactual change from actions users would have taken anyway?",
  "Which moral public goods are broad enough for threshold commitments without erasing dissent?",
  "When should political-adjacent examples be rejected, delayed, or framed only as case studies?",
  "What transparency reports can build trust without exposing private counterparties?",
] as const;

export default async function ResearchPage() {
  const viewer = await getViewer();

  return (
    <div className="page-shell">
      <SiteTopbar
        brandHref="/"
        links={getPrimaryNavLinks(Boolean(viewer))}
        {...getTopbarActions(Boolean(viewer))}
        showLogout={Boolean(viewer)}
      />
      <main className="legal-page" id="main-content" tabIndex={-1}>
        <p className="eyebrow">Research and governance</p>
        <h1>An operating institution, not just a matching interface.</h1>
        <p>
          Moral trade depends unusually heavily on trust, review quality, and operator integrity.
          This page keeps the research agenda, safety blockers, governance rules, and unresolved
          design questions visible as the service grows.
        </p>

        <section className="panel data-card data-card-wide">
          <h2>What we are testing</h2>
          <ul className="trust-check-list">
            {testAreas.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </section>

        <section className="panel data-card data-card-wide">
          <h2>What would make this unsafe</h2>
          <ul className="trust-check-list">
            {unsafeSignals.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </section>

        <section className="panel data-card data-card-wide">
          <h2>Open mechanism-design questions</h2>
          <ul className="trust-check-list">
            {openQuestions.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </section>

        <section className="panel data-card data-card-wide">
          <h2>Reviewer rulebook</h2>
          <p>
            The public rulebook makes reviewer roles, challenge windows, conflicts, appeal paths,
            proof uniqueness, and third-party externality standing visible before participants rely
            on a record.
          </p>
          <div className="hero-actions">
            <Link className="button button-secondary" href="/validation">
              Validation
            </Link>
            <Link className="button button-secondary" href="/anti-threat-rules">
              Anti-threat baseline rules
            </Link>
            <Link className="button button-secondary" href="/reasoning-standards">
              Evidence standards
            </Link>
          </div>
        </section>

        <section className="panel data-card data-card-wide">
          <h2>Transparency reports</h2>
          <p>
            The report counts review outcomes, disclosure grants, reports, appeals, operator timing,
            and unresolved disputes with small-sample suppression. It does not expose private-feed
            data, case files, report bodies, or exact wishes.
          </p>
          <Link className="text-button" href="/transparency">
            Open transparency report
          </Link>
        </section>

        <section className="panel data-card data-card-wide">
          <h2>People, operators, and advisors</h2>
          <p>
            Public accountability matters because counterparties are trusting more than an
            interface. The team and governance page identifies operators, reviewer
            responsibilities, decision rights, and advisor roles as they become formal.
          </p>
          <Link className="text-button" href="/team-and-governance">
            View team and governance
          </Link>
        </section>

        <section className="panel data-card data-card-wide">
          <h2>Service updates</h2>
          <p>
            Follow shipped changes, governance decisions, public-goods work, case studies, and
            activation metrics without confusing plans with reviewed outcomes.
          </p>
          <Link className="button button-primary" href="/updates">
            Read service updates
          </Link>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
