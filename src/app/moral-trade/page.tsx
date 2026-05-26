import type { Metadata } from "next";
import Link from "next/link";

import { SiteFooter } from "@/components/layout/site-footer";
import { SiteTopbar } from "@/components/layout/site-topbar";
import { getViewer } from "@/lib/app-data";
import { getAbsoluteUrl } from "@/lib/seo";
import { getPrimaryNavLinks, getTopbarActions } from "@/lib/site";

export const metadata: Metadata = {
  title: "What Is Moral Trade?",
  description:
    "A primer on voluntary moral trade, worked examples, safety boundaries, and the trust problems the pilot is designed to test.",
  alternates: {
    canonical: "/moral-trade",
  },
  openGraph: {
    title: "What Is Moral Trade?",
    description:
      "Moral trade lets people with different moral priorities cooperate when each can make a concession that matters less to them and more to the other side.",
    url: getAbsoluteUrl("/moral-trade"),
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

export default async function MoralTradePrimerPage() {
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
        <p className="eyebrow">Primer</p>
        <h1>What is moral trade?</h1>
        <p>
          Moral trade lets people with different moral priorities cooperate when each can make a
          concession that matters less to them and more to the other side.
        </p>

        <section className="panel data-card data-card-wide">
          <h2>Short summary</h2>
          <p>
            Moral Trade is a pilot for voluntary, evidence-reviewed cooperation across moral
            disagreement. It helps people test low-risk pledge swaps, donation offsets, and shared
            public-good commitments without escrow, custody, legal advice, or hidden automation.
          </p>
          <div className="hero-actions">
            <Link className="button button-primary" href="/cohort">
              Join the founding cohort
            </Link>
            <Link className="button button-secondary" href="/offers?view=examples">
              Browse worked examples
            </Link>
          </div>
        </section>

        <section className="panel data-card data-card-wide">
          <h2>Three examples</h2>
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

        <section className="panel data-card data-card-wide">
          <h2>What it is not</h2>
          <ul className="trust-check-list">
            {exclusions.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </section>

        <section className="panel data-card data-card-wide">
          <h2>Why it is hard</h2>
          <ul className="trust-check-list">
            {hardProblems.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </section>

        <section className="panel data-card data-card-wide">
          <h2>Where to go next</h2>
          <div className="teaser-grid">
            <Link className="panel teaser-card" href="/anti-threat-baseline">
              <h3>Anti-threat rules</h3>
              <p>Baseline integrity, cooling-off rules, and rejected proposal examples.</p>
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
