import type { Metadata } from "next";
import Link from "next/link";

import { SiteFooter } from "@/components/layout/site-footer";
import { SiteTopbar } from "@/components/layout/site-topbar";
import { getViewer } from "@/lib/app-data";
import {
  ANTI_THREAT_BASELINE_RULES,
  REJECTED_PROPOSAL_EXAMPLES,
  THIRD_PARTY_EXTERNALITY_PROMPTS,
} from "@/lib/proposal-review";
import { getAbsoluteUrl } from "@/lib/seo";
import { getPrimaryNavLinks, getTopbarActions } from "@/lib/site";

export const metadata: Metadata = {
  title: "Anti-Threat and Baseline Integrity",
  description:
    "Rules for rejecting coercive moral-trade proposals, checking counterfactual baselines, and reviewing third-party externalities.",
  alternates: {
    canonical: "/anti-threat-rules",
  },
  openGraph: {
    title: "Anti-Threat and Baseline Integrity",
    description:
      "No threat creation, no compensation for newly escalated harmful behavior, and no reliance without a no-trade baseline statement.",
    url: getAbsoluteUrl("/anti-threat-rules"),
    type: "article",
  },
};

export default async function AntiThreatBaselinePage() {
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
        <p className="eyebrow">Safety and review</p>
        <h1>Anti-threat and baseline integrity</h1>
        <p>
          A moral-trade pilot only works if it refuses threat creation and makes counterfactual
          baselines reviewable. Participants must state what they would do absent the trade before
          anyone treats a proposal as matchable.
        </p>

        <section className="panel data-card data-card-wide">
          <h2>Baseline rules</h2>
          <ul className="trust-check-list">
            {ANTI_THREAT_BASELINE_RULES.map((rule) => (
              <li key={rule}>{rule}</li>
            ))}
          </ul>
        </section>

        <section className="panel data-card data-card-wide">
          <h2>Required baseline statement</h2>
          <p>
            Every proposal should answer: <strong>What would you do absent this trade?</strong>{" "}
            Reviewers should look for dated intentions, prior behavior, evidence of ordinary plans,
            and reasons to think the agreement changes behavior rather than merely records it.
          </p>
        </section>

        <section className="panel data-card data-card-wide">
          <h2>Cooling-off period</h2>
          <p>
            If a participant recently started, escalated, or publicly threatened a harmful action,
            the proposal should not proceed as a compensated moral trade. Reviewers can require
            cooling off, independent evidence of prior intent, or rejection.
          </p>
        </section>

        <section className="panel data-card data-card-wide">
          <h2>Reviewer challenge lane</h2>
          <p>
            Coercive baselines, suspicious timing, pressure on vulnerable people, or unusually large
            requested concessions should route to a challenge lane before broad previews, private
            introductions, or public reliance.
          </p>
          <div className="hero-actions">
            <Link className="button button-secondary" href="/validation">
              Validation rulebook
            </Link>
            <Link className="button button-secondary" href="/safety">
              Safety policy
            </Link>
          </div>
        </section>

        <section className="panel data-card data-card-wide">
          <h2>Third-party externality review</h2>
          <p>
            Bilateral gain is not enough. A proposal can be better for both parties while still
            creating bad incentives or harms for people and values outside the room.
          </p>
          <ul className="trust-check-list">
            {THIRD_PARTY_EXTERNALITY_PROMPTS.map((prompt) => (
              <li key={prompt}>{prompt}</li>
            ))}
          </ul>
        </section>

        <section className="panel data-card data-card-wide">
          <h2>Rejected proposal examples</h2>
          <div className="data-grid">
            {REJECTED_PROPOSAL_EXAMPLES.map((example) => (
              <article className="panel data-card" key={example.title}>
                <p className="detail-kicker">Rejected</p>
                <h3>{example.title}</h3>
                <p className="route-text">{example.summary}</p>
              </article>
            ))}
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
