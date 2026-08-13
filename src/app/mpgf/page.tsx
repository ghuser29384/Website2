import type { Metadata } from "next";
import Link from "next/link";

import { MpgfAssuranceFundingReceipt } from "@/components/mpgf/mpgf-assurance-funding-receipt";
import { MpgfPageFrame } from "@/components/mpgf/mpgf-page-frame";
import { getViewer } from "@/lib/app-data";
import { demoMpgfAssuranceRound } from "@/lib/mpgf/data";
import { loadMpgfRealMoneyReadiness } from "@/lib/mpgf/real-money";
import { getAbsoluteUrl } from "@/lib/seo";

export const metadata: Metadata = {
  title: "Common Ground Budget | Public Goods Fund",
  description:
    "Coordinate support for moral public goods through bounded budgets, explicit project stances, threshold rules, evidence review, and non-custodial settlement paths.",
  alternates: {
    canonical: "/mpgf",
  },
  openGraph: {
    title: "Common Ground Budget | Public Goods Fund",
    description:
      "A structured route for coordinating moral public-good funding across people with different values.",
    url: getAbsoluteUrl("/mpgf"),
    type: "website",
  },
};

export const dynamic = "force-dynamic";

const workflow = [
  {
    number: "01",
    title: "Choose a maximum budget",
    detail:
      "Set the most you are willing to contribute and define fallback treatment before any external payment handoff is opened.",
  },
  {
    number: "02",
    title: "State project preferences",
    detail:
      "Use plain stances: fund, fund if different-view support joins, needs review, or skip.",
  },
  {
    number: "03",
    title: "Review the frozen terms",
    detail:
      "Inspect caps, thresholds, fees, privacy, destination evidence, challenge windows, and non-completion rules.",
  },
  {
    number: "04",
    title: "Clear only after gates pass",
    detail:
      "Threshold, identity, review, challenge, destination, external-payment, and evidence checks must pass before a contribution counts.",
  },
] as const;

const serviceRoutes = [
  {
    title: "Voluntary public-goods compacts",
    detail:
      "Choose a cause-specific constitution with a 1% contribution rule, $10 monthly cap, 5,000-member activation threshold, and automatic collection disabled.",
    href: "/mpgf/compacts",
    action: "Review founding compacts",
  },
  {
    title: "Current round",
    detail:
      "Inspect the public round, project stances, sealed progress rules, contribution terms, and final reporting path.",
    href: `/mpgf/rounds/${demoMpgfAssuranceRound.id}`,
    action: "View current round",
  },
  {
    title: "Candidate pools",
    detail:
      "Browse candidate public-good pools, public reasoning, destination types, evidence requirements, and review states.",
    href: "/mpgf/pools",
    action: "Browse candidate pools",
  },
  {
    title: "Contribute evidence",
    detail:
      "Submit or import external contribution evidence while keeping provider records separate from counterfactual-impact claims.",
    href: "/mpgf/contribute",
    action: "Open evidence route",
  },
  {
    title: "Governance",
    detail:
      "Review ballots, challenges, rule changes, reviewer responsibilities, and the controls that block unsafe clearing.",
    href: "/mpgf/governance",
    action: "Review governance",
  },
  {
    title: "Funding metrics",
    detail:
      "Inspect aggregate, privacy-thresholded funding, review, clearing, evidence, and settlement metrics.",
    href: "/mpgf/metrics",
    action: "Open metrics",
  },
  {
    title: "Technical specification",
    detail:
      "Read the mechanism states, policy snapshots, authorization rules, evidence contracts, and non-custody boundaries.",
    href: "/mpgf/technical-spec",
    action: "Open technical spec",
  },
] as const;

const operatingBoundaries = [
  "A preview is not a contribution, charge, match, payout, or certificate.",
  "Moral Trade does not hold participant funds or provide legal escrow.",
  "Project support requires an active fiscal sponsor or another legally approved external recipient.",
  "External payment evidence shows that a transaction occurred; it does not by itself prove why it occurred.",
  "Projects do not clear while threshold, review, challenge, destination, authorization, or settlement blockers remain.",
  "Public progress may remain sealed before close to reduce strategic manipulation and privacy leakage.",
] as const;

export default async function MpgfPage() {
  const viewer = await getViewer();
  const realMoneyReadiness = await loadMpgfRealMoneyReadiness();
  const roundHref = `/mpgf/rounds/${demoMpgfAssuranceRound.id}`;

  return (
    <MpgfPageFrame
      actions={
        <>
          <Link className="button button-primary" href={`${roundHref}#common-ground-budget-preview`}>
            Build a Common Ground Budget
          </Link>
          <Link className="button button-secondary" href={roundHref}>
            View current round
          </Link>
          <Link className="button button-secondary" href="/mpgf/about">
            Read the mechanism
          </Link>
        </>
      }
      description="Coordinate around goods that many people value for different reasons. Contributions count only after the relevant identity, threshold, review, challenge, authorization, evidence, and settlement rules pass."
      eyebrow="Public Goods Fund"
      title="Common Ground Budget"
      realMoneyReadiness={realMoneyReadiness}
      viewerPresent={Boolean(viewer)}
    >
      <nav className="hub-tabs" aria-label="Public Goods Fund sections">
        <a href="#how-it-works">How it works</a>
        <a href="#assurance-funding">Assurance funding estimate</a>
        <a href="#routes">Service routes</a>
        <a href="#boundaries">Operating boundaries</a>
        <Link href={roundHref}>Current round</Link>
        <Link href="/mpgf/pools">Candidate pools</Link>
        <Link href="/mpgf/governance">Governance</Link>
        <Link href="/mpgf/compacts">Voluntary compacts</Link>
        <Link href="/mpgf/metrics">Metrics</Link>
      </nav>

      <section className="section section-white" id="how-it-works" aria-labelledby="mpgf-workflow-heading">
        <div className="section-head section-head-compact">
          <p className="eyebrow">How it works</p>
          <h2 id="mpgf-workflow-heading">One budget, explicit stances, gate-cleared funding.</h2>
          <p>
            The default path is intentionally bounded. Advanced mechanism details remain
            inspectable, but they do not become binding unless the review screen presents them and
            the participant accepts the frozen snapshot.
          </p>
        </div>
        <div className="step-card-grid">
          {workflow.map((step) => (
            <article className="panel step-card" key={step.number}>
              <span className="step-index">{step.number}</span>
              <h3>{step.title}</h3>
              <p>{step.detail}</p>
            </article>
          ))}
        </div>
      </section>

      <section
        className="section section-subtle"
        id="assurance-funding"
        aria-labelledby="assurance-funding-heading"
      >
        <div className="section-head section-head-compact">
          <p className="eyebrow">Assurance funding</p>
          <h2 id="assurance-funding-heading">Estimate the funding beyond your own pledge.</h2>
          <p>
            Enter a possible pledge and your own estimate of the chance it would be decisive. The
            receipt shows the expected funding from everyone else per proposed pledge dollar in a
            simplified exact-fill scenario.
          </p>
        </div>
        <MpgfAssuranceFundingReceipt />
      </section>

      <section className="section section-white" id="routes" aria-labelledby="mpgf-routes-heading">
        <div className="section-head section-head-compact">
          <p className="eyebrow">Service routes</p>
          <h2 id="mpgf-routes-heading">Choose the task you need to complete.</h2>
          <p>
            The hub links directly to the backed workflow for each task instead of exposing the
            entire mechanism on one page.
          </p>
        </div>
        <div className="data-grid">
          {serviceRoutes.map((route) => (
            <Link className="panel data-card" href={route.href} key={route.title}>
              <h3>{route.title}</h3>
              <p className="route-text">{route.detail}</p>
              <span className="inline-link">{route.action}</span>
            </Link>
          ))}
        </div>
      </section>

      <section className="section section-white" id="boundaries" aria-labelledby="mpgf-boundaries-heading">
        <div className="section-head section-head-compact">
          <p className="eyebrow">Operating boundaries</p>
          <h2 id="mpgf-boundaries-heading">What participants can rely on.</h2>
        </div>
        <div className="panel data-card data-card-wide">
          <ul className="trust-check-list">
            {operatingBoundaries.map((boundary) => (
              <li key={boundary}>{boundary}</li>
            ))}
          </ul>
        </div>
        <div className="hero-actions">
          <Link className="button button-primary" href={roundHref}>
            Open current round
          </Link>
          <Link className="button button-secondary" href="/mpgf/real-money-terms">
            Review funding terms
          </Link>
          <Link className="button button-secondary" href="/status">
            Check service status
          </Link>
        </div>
      </section>
    </MpgfPageFrame>
  );
}
