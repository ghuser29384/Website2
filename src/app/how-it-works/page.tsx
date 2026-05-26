import type { Metadata } from "next";
import Link from "next/link";

import { SiteFooter } from "@/components/layout/site-footer";
import { SiteTopbar } from "@/components/layout/site-topbar";
import { IconMark, TradeFlowDiagram } from "@/components/ui/page-primitives";
import { getViewer } from "@/lib/app-data";
import { getAbsoluteUrl } from "@/lib/seo";
import { getPrimaryNavLinks, getTopbarActions } from "@/lib/site";

export const metadata: Metadata = {
  title: "How It Works",
  description:
    "A one-screen guide to what Moral Trade is, who the pilot is for, and the first low-risk action to take.",
  alternates: {
    canonical: "/how-it-works",
  },
  openGraph: {
    title: "How Moral Trade works",
    description:
      "Understand the pilot flow: choose a format, state a baseline, write terms, name evidence, and submit reviewable proof.",
    url: getAbsoluteUrl("/how-it-works"),
    type: "article",
  },
};

const quickGuide = [
  {
    title: "What it is",
    detail:
      "A reviewed pilot for voluntary pledge swaps, donation offsets, and public-good commitments across moral disagreement.",
    icon: "swap",
  },
  {
    title: "Who it is for",
    detail:
      "Serious counterparties, organizers, donors, and reviewers who can start with one bounded, reviewable action.",
    icon: "profile",
  },
  {
    title: "What it is not",
    detail:
      "Not charity evaluation, legal enforcement, escrow, custody, autonomous outreach, or a market for threats.",
    icon: "safety",
  },
] as const;

const steps = [
  "Choose a worked example or format",
  "State the no-trade baseline",
  "Write bounded terms",
  "Name action evidence",
  "Check safety and externalities",
  "Submit one proof artifact",
] as const;

export default async function HowItWorksPage() {
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

        <div className="hero-grid">
          <section className="hero-copy">
            <p className="eyebrow">How it works</p>
            <h1>Start with one clear, reviewable trade.</h1>
            <p className="hero-text">
              Moral Trade is easiest to understand as a small pilot workflow: pick a low-risk
              example, state what would happen without the trade, agree on evidence, and keep
              review visible before anyone relies on the record.
            </p>
            <div className="hero-actions">
              <Link className="button button-primary" href="/offers?view=examples">
                Browse worked examples
              </Link>
              <Link className="button button-secondary" href="/cohort">
                Join the pilot
              </Link>
            </div>
          </section>

          <TradeFlowDiagram steps={steps} title="Moral Trade pilot workflow" />
        </div>
      </header>

      <main id="main-content" tabIndex={-1}>
        <section className="section section-white" aria-labelledby="quick-guide-heading">
          <div className="section-head">
            <p className="eyebrow">One-screen guide</p>
            <h2 id="quick-guide-heading">What a new visitor needs to know</h2>
            <p>
              The pilot is not asking visitors to trust a liquid marketplace yet. It is asking
              them to understand the mechanism and try one reviewed action.
            </p>
          </div>

          <div className="data-grid">
            {quickGuide.map((item) => (
              <article className="panel data-card" key={item.title}>
                <IconMark name={item.icon} />
                <h3>{item.title}</h3>
                <p className="route-text">{item.detail}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="section section-subtle" aria-labelledby="first-action-heading">
          <div className="section-head">
            <p className="eyebrow">First action</p>
            <h2 id="first-action-heading">The recommended path today</h2>
            <p>
              Read one worked example, clone it as a private draft, invite one serious
              counterparty, and submit one proof artifact. That loop tests trust before liquidity.
            </p>
          </div>
          <div className="hero-actions">
            <Link className="button button-primary" href="/offers?view=examples">
              Choose an example
            </Link>
            <Link className="button button-secondary" href="/trust">
              Read what you can rely on
            </Link>
            <Link className="button button-secondary" href="/anti-threat-baseline">
              Check anti-threat rules
            </Link>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
