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
    "What Moral Trade is testing, what would make it unsafe, and how reviewer governance should develop during the pilot.",
  alternates: {
    canonical: "/research",
  },
  openGraph: {
    title: "Research and Governance",
    description:
      "Research framing, reviewer rulebook links, transparency plans, and open mechanism-design questions for the Moral Trade pilot.",
    url: getAbsoluteUrl("/research"),
    type: "article",
  },
};

const testAreas = [
  "Whether low-risk pledge swaps can be made legible enough for private counterparty discovery.",
  "Whether action evidence and baseline confidence can be separated without overwhelming users.",
  "Whether moral public-good threshold commitments can coordinate overlapping moral reasons.",
  "Whether a small cohort can generate reviewable examples before broad marketplace mechanics exist.",
] as const;

const unsafeSignals = [
  "The pilot rewards threats, newly escalated harmful behavior, or coercive bargaining.",
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
        <h1>A pilot institution, not just a product surface.</h1>
        <p>
          Moral trade depends unusually heavily on trust, review quality, and operator integrity.
          This page keeps the research agenda, safety blockers, and governance work visible before
          the project expands beyond cohort-mediated proposals.
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
            The public rulebook should make reviewer roles, challenge windows, conflicts, appeal
            paths, proof uniqueness, and third-party externality standing visible before users rely
            on a proposal.
          </p>
          <div className="hero-actions">
            <Link className="button button-secondary" href="/validation">
              Validation
            </Link>
            <Link className="button button-secondary" href="/anti-threat-baseline">
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
            The first useful reports should count review outcomes, rejected proposal classes,
            challenge-window resolutions, pair-completion evidence, and unresolved externality
            objections. They should not expose private-feed data or exact wishes without consent.
          </p>
        </section>

        <section className="panel data-card data-card-wide">
          <h2>People, operators, and advisors</h2>
          <p>
            Public authorship matters because counterparties are trusting more than a matching
            interface. The people page should identify operators, reviewer responsibilities, and
            advisor roles as they become formal.
          </p>
          <Link className="text-button" href="/people">
            View public people
          </Link>
        </section>

        <section className="panel data-card data-card-wide">
          <h2>Subscribe for pilot updates</h2>
          <p>
            Follow the cohort, reviewer governance, and public-goods pilot without treating the
            site as a liquid marketplace before the trust problem is solved.
          </p>
          <Link className="button button-primary" href="/updates">
            Subscribe for pilot updates
          </Link>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
