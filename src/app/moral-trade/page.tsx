import type { Metadata } from "next";
import Link from "next/link";

import { SiteFooter } from "@/components/layout/site-footer";
import { SiteTopbar } from "@/components/layout/site-topbar";
import {
  Breadcrumbs,
  MoralTradeHeroVisual,
  PageHero,
  SectionHeader,
  TradeFlowDiagram,
} from "@/components/ui/page-primitives";
import { getViewer } from "@/lib/app-data";
import { buildArticleJsonLd, buildBreadcrumbJsonLd, getAbsoluteUrl } from "@/lib/seo";
import { getPrimaryNavLinks, getTopbarActions } from "@/lib/site";

const moralTradeDescription =
  "A primer on voluntary moral trade, worked examples, operating boundaries, evidence, and the trust problems a serious coordination service must handle.";

export const metadata: Metadata = {
  title: "What Is Moral Trade?",
  description: moralTradeDescription,
  alternates: {
    canonical: "/what-is-moral-trade",
  },
  openGraph: {
    title: "What Is Moral Trade?",
    description:
      "Moral trade lets people with different moral priorities cooperate when each can make a concession that matters less to them and more to the other side.",
    url: getAbsoluteUrl("/what-is-moral-trade"),
    type: "article",
  },
};

const explainerCards = [
  {
    title: "What it is",
    detail:
      "A protocol and service for voluntary commitments between people who disagree morally but can still improve the outcome by their own lights.",
  },
  {
    title: "What it is not",
    detail:
      "Not a moral authority, escrow service, legal promise, tax product, autonomous matchmaker, or mechanism for buying off threats.",
  },
  {
    title: "Who it is for",
    detail:
      "Donors, researchers, organizers, founders, reviewers, and serious counterparties who can begin with one bounded, inspectable action.",
  },
] as const;

const examples = [
  {
    title: "Personal pledge swap",
    summary:
      "Victoria gives more to global poverty if Paul keeps a vegetarian pledge. Each values the other's action more than the concession they make.",
    href: "/offers/examples/seed-victoria",
  },
  {
    title: "Donation offset",
    summary:
      "People who would otherwise fund opposed advocacy redirect matched amounts toward a mutually preferred destination, subject to baseline and externality review.",
    href: "/donation-offsets",
  },
  {
    title: "Moral public-good commitment",
    summary:
      "Participants with different ultimate priorities coordinate around a threshold commitment for a good many views value somewhat.",
    href: "/moral-goods-group-buying",
  },
] as const;

const workflowSteps = [
  "Record the no-trade baseline",
  "Specify bounded actions and timing",
  "Name evidence and privacy rules",
  "Review threats and externalities",
  "Accept only if both prefer the result",
] as const;

const hardProblems = [
  {
    title: "Factual trust",
    detail: "Did each participant do what they said? Evidence must be scoped to the actual claim.",
  },
  {
    title: "Counterfactual trust",
    detail: "Would the action have happened anyway? Baseline confidence is separate from action evidence.",
  },
  {
    title: "Perverse incentives",
    detail: "A mechanism must not reward people for worsening a baseline or manufacturing leverage.",
  },
  {
    title: "Third-party externalities",
    detail: "A bilateral improvement can still harm people or values not represented by the parties.",
  },
] as const;

const operatingBoundaries = [
  "No objective platform ranking of moral value.",
  "No escrow, custody, legal advice, tax advice, or investment service.",
  "No autonomous disclosure of exact wishes, identities, or contact details.",
  "No threat market, harassment, coercion, or compensation for newly escalated harm.",
  "No assumption that submitted evidence proves the counterfactual baseline.",
] as const;

export default async function MoralTradePrimerPage() {
  const viewer = await getViewer();
  const articleStructuredData = buildArticleJsonLd({
    headline: "What Is Moral Trade?",
    description: moralTradeDescription,
    path: "/what-is-moral-trade",
  });
  const breadcrumbStructuredData = buildBreadcrumbJsonLd([
    { href: "/what-is-moral-trade", label: "What is moral trade?" },
  ]);

  return (
    <div className="page-shell">
      <script
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleStructuredData) }}
        type="application/ld+json"
      />
      <script
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbStructuredData) }}
        type="application/ld+json"
      />

      <header className="hero">
        <SiteTopbar
          brandHref="/"
          links={getPrimaryNavLinks(Boolean(viewer))}
          {...getTopbarActions(Boolean(viewer))}
          showLogout={Boolean(viewer)}
        />
        <Breadcrumbs items={[{ href: "/what-is-moral-trade", label: "Primer" }]} />

        <PageHero
          actions={
            <>
              <Link className="button button-primary" href="/signup?returnTo=/onboarding">
                Join the network
              </Link>
              <Link className="button button-secondary" href="/worked-examples">
                Browse worked examples
              </Link>
              <Link className="button button-secondary" href="/moral-trade/technical-spec">
                View technical specification
              </Link>
            </>
          }
          description="Moral trade lets people with different moral priorities cooperate when each can make a concession that matters less to them and more to the other side."
          eyebrow="Primer"
          title="What is moral trade?"
        >
          <MoralTradeHeroVisual />
        </PageHero>
      </header>

      <main id="main-content" tabIndex={-1}>
        <section className="section section-white" aria-labelledby="summary-heading">
          <SectionHeader
            eyebrow="Short summary"
            id="summary-heading"
            title="A protocol, not a hidden moral ranking."
          >
            Moral Trade is a coordination service for voluntary, evidence-reviewed cooperation
            across moral disagreement. It supports pledge swaps, donation offsets, private matching,
            and shared public-good commitments while keeping baselines and review states explicit.
          </SectionHeader>
          <div className="data-grid" aria-label="One-screen explainer">
            {explainerCards.map((card) => (
              <article className="panel data-card" key={card.title}>
                <p className="detail-kicker">Explainer</p>
                <h3>{card.title}</h3>
                <p className="route-text">{card.detail}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="section section-subtle" aria-labelledby="workflow-heading">
          <SectionHeader
            eyebrow="How it works"
            id="workflow-heading"
            title="Move from disagreement to reviewable terms."
          >
            The protocol records the default first, then makes actions, evidence, privacy, safety,
            and exit rules legible before either side relies on the arrangement.
          </SectionHeader>
          <TradeFlowDiagram steps={workflowSteps} title="Moral Trade protocol workflow" />
        </section>

        <section className="section section-white" aria-labelledby="examples-heading">
          <SectionHeader
            eyebrow="Examples"
            id="examples-heading"
            title="Start from a complete case, not an abstract promise."
          />
          <div className="data-grid">
            {examples.map((example) => (
              <Link className="panel data-card" href={example.href} key={example.title}>
                <p className="detail-kicker">Example</p>
                <h3>{example.title}</h3>
                <p className="route-text">{example.summary}</p>
                <span className="inline-link">Inspect the route</span>
              </Link>
            ))}
          </div>
        </section>

        <section className="section section-subtle" aria-labelledby="trust-heading">
          <SectionHeader
            eyebrow="Trust problems"
            id="trust-heading"
            title="The difficult parts are explicit product objects."
          >
            Serious moral trade requires more than a matching form. The service separates action
            evidence, counterfactual baselines, incentive risks, and third-party effects.
          </SectionHeader>
          <div className="data-grid">
            {hardProblems.map((problem) => (
              <article className="panel data-card" key={problem.title}>
                <h3>{problem.title}</h3>
                <p className="route-text">{problem.detail}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="section section-white" aria-labelledby="boundaries-heading">
          <SectionHeader
            eyebrow="Operating boundaries"
            id="boundaries-heading"
            title="Cooperation without overclaim."
          />
          <div className="protocol-contract-grid">
            <article className="panel protocol-contract-card">
              <h3>What the service does not claim</h3>
              <ul className="trust-check-list">
                {operatingBoundaries.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </article>
            <article className="panel protocol-contract-card">
              <h3>Public validator contract</h3>
              <p>
                Required fields, statuses, guardrails, evidence schemas, provenance objects, and
                factor codes are published in the technical specification.
              </p>
              <Link className="text-button" href="/moral-trade/technical-spec">
                Open technical specification
              </Link>
            </article>
            <article className="panel protocol-contract-card">
              <h3>Recourse</h3>
              <p>
                Participants and affected third parties can inspect challenge, appeal, disclosure,
                externality, and incident-response routes before relying on a record.
              </p>
              <Link className="text-button" href="/trust">
                Review reliance and recourse
              </Link>
            </article>
          </div>
        </section>

        <section className="section section-subtle" aria-labelledby="next-heading">
          <SectionHeader
            eyebrow="Where to go next"
            id="next-heading"
            title="Move from primer to a concrete record."
          />
          <div className="teaser-grid">
            <Link className="panel teaser-card" href="/worked-examples">
              <h3>Worked examples</h3>
              <p>Inspect complete terms before drafting anything.</p>
            </Link>
            <Link className="panel teaser-card" href="/anti-threat-rules">
              <h3>Anti-threat rules</h3>
              <p>Baseline integrity, cooling-off rules, and rejected proposal patterns.</p>
            </Link>
            <Link className="panel teaser-card" href="/moral-goods-group-buying">
              <h3>Moral public goods</h3>
              <p>Coordinate around goods many different moral views value.</p>
            </Link>
            <Link className="panel teaser-card" href="/signup?returnTo=/onboarding">
              <h3>Join the network</h3>
              <p>Choose one first action and create a backed account record.</p>
            </Link>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
