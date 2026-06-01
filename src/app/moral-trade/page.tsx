import type { Metadata } from "next";
import Link from "next/link";

import { SiteFooter } from "@/components/layout/site-footer";
import { SiteTopbar } from "@/components/layout/site-topbar";
import {
  Breadcrumbs,
  MoralTradeHeroVisual,
  PageHero,
  SectionHeader,
  StatusBadge,
  TradeFlowDiagram,
} from "@/components/ui/page-primitives";
import { getViewer } from "@/lib/app-data";
import { getMoralTradeProtocolProfile } from "@/lib/moral-trade/protocol";
import {
  evaluateMoralTradeProtocolDraft,
  formatProtocolReviewStatus,
  type MoralTradeVerificationStepStatus,
} from "@/lib/proposal-review";
import { buildArticleJsonLd, buildBreadcrumbJsonLd, getAbsoluteUrl } from "@/lib/seo";
import { getPrimaryNavLinks, getTopbarActions } from "@/lib/site";

const moralTradeDescription =
  "A primer on voluntary moral trade, worked examples, safety boundaries, and the trust problems the pilot is designed to test.";

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

const examples = [
  {
    title: "Personal pledge swap",
    summary:
      "Victoria donates to global poverty if Paul keeps a vegetarian pledge. Each side treats the other's action as more valuable than the concession they make.",
  },
  {
    title: "Donation offset",
    summary:
      "Two people who would otherwise fund opposed advocacy redirect matched amounts to a shared public good, subject to baseline and externality review.",
  },
  {
    title: "Moral public-good commitment",
    summary:
      "Participants with different priorities coordinate around a threshold commitment for a good many moral views value somewhat, such as public health or open knowledge.",
  },
] as const;

const explainerCards = [
  {
    title: "What it is",
    detail:
      "A pilot for small, voluntary commitments between people who disagree morally but can still improve the outcome by their own lights.",
  },
  {
    title: "What it is not",
    detail:
      "Not a moral authority, escrow, custody service, legal promise, tax product, automated matchmaker, or way to buy off threats.",
  },
  {
    title: "Who it is for",
    detail:
      "Effective givers, organizers, founders, reviewers, and serious counterparties who can start with one low-risk, reviewable example.",
  },
] as const;

const exclusions = [
  "Not charity evaluation or a claim that the platform knows the objectively best cause.",
  "Not escrow, custody, legal advice, tax advice, or enforceable contract formation.",
  "Not coercion, harassment, pressure, or a threat market.",
  "Not a guarantee that the action would not have happened without the trade.",
] as const;

const hardProblems = [
  "Factual trust: did each person do what they said?",
  "Counterfactual trust: would they have done it anyway?",
  "Perverse incentives: does the mechanism reward worsening a baseline?",
  "Third-party externalities: could the trade harm people or values not represented by the parties?",
] as const;

const glossaryTerms = [
  {
    term: "Pledge swap",
    definition:
      "Two parties make bounded promises each side values, then name evidence and exit rules before anyone relies on the promise.",
  },
  {
    term: "Donation offset",
    definition:
      "Participants redirect or match gifts so opposed giving is replaced with a clearer shared or reciprocal action.",
  },
  {
    term: "Threshold",
    definition:
      "The point at which a participant says the trade is worthwhile on their own view; it is not a platform moral ranking.",
  },
  {
    term: "Manual review",
    definition:
      "A human check of baselines, evidence, safety, privacy, and externalities before a draft becomes something to rely on.",
  },
  {
    term: "Public good",
    definition:
      "A shared benefit many moral views can value somewhat, even when participants disagree about ultimate priorities.",
  },
] as const;

const workflowSteps = [
  "Draft structured terms",
  "Run protocol review",
  "Attach scoped evidence",
  "Open human review",
  "Publish factor-coded preview",
] as const;

const workflowCards = [
  {
    label: "Incomplete draft",
    nextStep: "Ask for the exact missing baseline, evidence rule, and exit terms.",
    review: evaluateMoralTradeProtocolDraft({
      format: "pledge",
      offeredCause: "Animal welfare",
      requestedCause: "Global poverty",
      offeredAction: "Try a vegetarian pledge",
      requestedAction: "Donate to a poverty fund",
      baselineStatement: "",
      duration: "3 months",
      exitConditions: "",
      verificationMethod: "",
      publicDescription: "Early draft for a reciprocal pledge swap.",
    }),
  },
  {
    label: "Reviewable draft",
    nextStep: "Show a match preview only after normal reviewer checks.",
    review: evaluateMoralTradeProtocolDraft({
      format: "pledge",
      offeredCause: "Global poverty",
      requestedCause: "Animal welfare",
      offeredAction: "Donate 1% of income to an evidence-backed poverty charity for 12 months.",
      requestedAction: "Adopt a vegetarian diet for 12 months with a visible meal log.",
      baselineStatement:
        "Before this trade I would keep my existing donation plan; prior receipts and dated notes can show the agreement changed the timing and amount.",
      duration: "12 months",
      exitConditions:
        "Either side can pause if evidence is missing, disputed, stale, or outside the agreed scope.",
      verificationMethod: "Annual receipts and manual reviewer inspection",
      publicDescription:
        "A voluntary pledge swap with no custody, no legal guarantee, and no platform moral ranking.",
    }),
  },
  {
    label: "Blocked draft",
    nextStep: "Do not publish; route to safety review instead of matching.",
    review: evaluateMoralTradeProtocolDraft({
      format: "payment",
      offeredCause: "Financial support",
      requestedCause: "Public safety",
      offeredAction: "Pay me or I will harass a target audience online.",
      requestedAction: "Send money to stop the harmful action.",
      baselineStatement:
        "Unless someone compensates me, I will start escalating the harmful behavior next week.",
      duration: "Open-ended",
      exitConditions: "The action stops only if payment continues.",
      verificationMethod: "Self-report",
      publicDescription:
        "This resembles a threat baseline and must be blocked before any public preview.",
    }),
  },
] as const;

function reviewTone(status: (typeof workflowCards)[number]["review"]["status"]) {
  return ["blocked", "needs_evidence", "needs_human_review", "challenge_window"].includes(status)
    ? "warning"
    : status === "matchable"
      ? "default"
      : "secondary";
}

function formatVerificationStepStatus(status: MoralTradeVerificationStepStatus) {
  return status.replaceAll("_", " ");
}

export default async function MoralTradePrimerPage() {
  const viewer = await getViewer();
  const profile = getMoralTradeProtocolProfile();
  const factorDictionary = new Map(profile.factorCodes.map((factor) => [factor.code, factor.label]));
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
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(articleStructuredData),
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
        <Breadcrumbs items={[{ href: "/what-is-moral-trade", label: "Primer" }]} />

        <PageHero
          actions={
            <>
              <Link className="button button-primary" href="/cohort">
                Join the founding cohort
              </Link>
              <Link className="button button-secondary" href="/worked-examples">
                Browse worked examples
              </Link>
              <Link className="button button-secondary" href="/moral-trade/technical-spec">
                View technical spec
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
          <SectionHeader eyebrow="Short summary" id="summary-heading" title="A protocol, not a hidden moral ranking.">
            Moral Trade is a pilot for voluntary, evidence-reviewed cooperation across moral
            disagreement. It helps people test low-risk pledge swaps, donation offsets, and shared
            public-good commitments without escrow, custody, legal advice, or hidden automation.
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

        <section className="section section-subtle" aria-labelledby="glossary-heading">
          <SectionHeader
            eyebrow="Plain-English glossary"
            id="glossary-heading"
            title="Translate the terms before reading the protocol."
          >
            These definitions keep the first reading grounded in user action rather than internal
            mechanism language.
          </SectionHeader>
          <div className="data-grid">
            {glossaryTerms.map((item) => (
              <article className="panel data-card" key={item.term}>
                <p className="detail-kicker">Term</p>
                <h3>{item.term}</h3>
                <p className="route-text">{item.definition}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="section section-white" aria-labelledby="examples-heading">
          <SectionHeader eyebrow="Examples" id="examples-heading" title="Concrete cases make the concept legible." />
          <div className="data-grid">
            {examples.map((example) => (
              <article className="panel data-card" key={example.title}>
                <p className="detail-kicker">Example</p>
                <h3>{example.title}</h3>
                <p className="route-text">{example.summary}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="section section-subtle" aria-labelledby="workflow-heading">
          <SectionHeader
            eyebrow="Instrumented workflow"
            id="workflow-heading"
            title="Drafts move through visible protocol checks."
          >
            The product should show users why a draft can move forward, why it needs evidence, or
            why it is blocked. The labels below come from structured review statuses and factor
            codes, not hidden free-form ranking.
          </SectionHeader>
          <TradeFlowDiagram steps={workflowSteps} title="Moral Trade protocol workflow" />
          <div className="protocol-contract-grid workflow-card-grid">
            {workflowCards.map((card) => (
              <article className="panel protocol-workflow-card" key={card.label}>
                <div className="protocol-workflow-card-head">
                  <p className="detail-kicker">{card.label}</p>
                  <StatusBadge tone={reviewTone(card.review.status)}>
                    {formatProtocolReviewStatus(card.review.status)}
                  </StatusBadge>
                </div>
                <p>{card.review.summary}</p>
                <div>
                  <strong>Verification gates</strong>
                  <ol className="protocol-gate-list" aria-label={`${card.label} verification gates`}>
                    {card.review.verificationLoop.map((step) => (
                      <li className={`protocol-gate-item protocol-gate-item-${step.status}`} key={step.key}>
                        <div>
                          <strong>{step.label}</strong>
                          <small>{step.detail}</small>
                        </div>
                        <span>{formatVerificationStepStatus(step.status)}</span>
                      </li>
                    ))}
                  </ol>
                </div>
                <div>
                  <strong>Why</strong>
                  <div className="protocol-factor-list" aria-label={`${card.label} factor codes`}>
                    {card.review.factorCodes.map((factor) => (
                      <span key={factor} title={factorDictionary.get(factor) ?? factor}>
                        {factor}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="protocol-workflow-evidence-grid">
                  <div>
                    <strong>Evidence to request</strong>
                    <ul>
                      {(card.review.reviewInstructions.artifactsToRequest.length
                        ? card.review.reviewInstructions.artifactsToRequest
                        : ["No new artifact requested by this deterministic preview."]
                      ).map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <strong>Reviewer scope</strong>
                    <ul>
                      {card.review.reviewInstructions.reviewScope.slice(0, 3).map((item) => (
                        <li key={item}>{item}</li>
                      ))}
                    </ul>
                  </div>
                </div>
                <div>
                  <strong>Cited evidence rows</strong>
                  <div className="protocol-evidence-row-list" aria-label={`${card.label} cited evidence rows`}>
                    {card.review.citedEvidenceTable.slice(0, 3).map((row) => (
                      <div className="protocol-evidence-row" key={`${row.citation}-${row.claim}`}>
                        <span>{row.status.replaceAll("_", " ")}</span>
                        <p>{row.claim}</p>
                      </div>
                    ))}
                  </div>
                </div>
                <p className="route-text">
                  <strong>Next step:</strong> {card.nextStep}
                </p>
              </article>
            ))}
          </div>
        </section>

        <section className="section section-white" aria-labelledby="boundaries-heading">
          <SectionHeader
            eyebrow="Boundaries"
            id="boundaries-heading"
            title="The pilot separates cooperation from overclaim."
          />
          <div className="protocol-contract-grid">
            <article className="panel protocol-contract-card">
              <h3>What it is not</h3>
              <ul className="trust-check-list">
                {exclusions.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </article>
            <article className="panel protocol-contract-card">
              <h3>Why it is hard</h3>
              <ul className="trust-check-list">
                {hardProblems.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </article>
            <article className="panel protocol-contract-card">
              <h3>Public validator contract</h3>
              <p>
                Required fields, statuses, guardrails, evidence schemas, provenance objects, and
                factor codes are published in the core technical spec.
              </p>
              <Link className="text-button" href="/moral-trade/technical-spec">
                Open Moral Trade technical spec
              </Link>
            </article>
          </div>
        </section>

        <section className="section section-subtle" aria-labelledby="next-heading">
          <SectionHeader eyebrow="Where to go next" id="next-heading" title="Move from primer to reviewable records." />
          <div className="teaser-grid">
            <Link className="panel teaser-card" href="/anti-threat-rules">
              <h3>Anti-threat rules</h3>
              <p>Baseline integrity, cooling-off rules, and rejected proposal examples.</p>
            </Link>
            <Link className="panel teaser-card" href="/moral-trade/technical-spec">
              <h3>Protocol contract</h3>
              <p>Validator-backed fields, statuses, evidence schemas, and factor-code checks.</p>
            </Link>
            <Link className="panel teaser-card" href="/mpgf">
              <h3>Public Goods Fund</h3>
              <p>The scalable thesis: coordinate around goods many moral views value.</p>
            </Link>
            <Link className="panel teaser-card" href="/research">
              <h3>Research and governance</h3>
              <p>What the pilot is testing and what would make it unsafe.</p>
            </Link>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
