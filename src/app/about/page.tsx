import type { Metadata } from "next";
import Link from "next/link";

import { SiteFooter } from "@/components/layout/site-footer";
import { SiteTopbar } from "@/components/layout/site-topbar";
import { getViewer } from "@/lib/app-data";
import { getAbsoluteUrl } from "@/lib/seo";
import { getPrimaryNavLinks, getTopbarActions } from "@/lib/site";

export const metadata: Metadata = {
  title: "About",
  description:
    "About Moral Trade's pilot-stage stewardship, operator commitments, review posture, and public trust roadmap.",
  alternates: {
    canonical: "/about",
  },
  openGraph: {
    title: "About Moral Trade",
    description:
      "Moral Trade is a pilot institution for evidence-reviewed cooperation across moral disagreement, private discovery, and public-goods coordination.",
    url: getAbsoluteUrl("/about"),
    type: "website",
  },
};

const commitments = [
  "Separate worked examples from live proposals and avoid liquidity claims before verified activity exists.",
  "Keep no-custody, no-escrow, no-legal-advice, and no-hidden-automation boundaries visible.",
  "Reject threats, coercive baselines, harassment, fraud, and pressure on vulnerable people.",
  "Publish reviewer roles, transparency metrics, and operator/advisor identities as governance formalizes.",
] as const;

export default async function AboutPage() {
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
            <p className="eyebrow">About</p>
            <h1>A pilot institution for cooperation under disagreement.</h1>
            <p className="hero-text">
              Moral Trade is being built as a reviewed pilot before it is a broad marketplace:
              education, cohort formation, evidence standards, and governance come before claims
              about liquidity or impact.
            </p>
            <div className="hero-actions">
              <Link className="button button-primary" href="/status">
                Read pilot status
              </Link>
              <Link className="button button-secondary" href="/contact">
                Contact operators
              </Link>
            </div>
          </section>

          <aside className="hero-panel panel">
            <p className="eyebrow">Current posture</p>
            <div className="flow-card">
              <div className="flow-step">
                <span className="flow-number">01</span>
                <div>
                  <strong>Prototype-stage public site</strong>
                  <p>Worked examples and cohort loops are the main public value today.</p>
                </div>
              </div>
              <div className="flow-step">
                <span className="flow-number">02</span>
                <div>
                  <strong>Manual review before reliance</strong>
                  <p>Records need evidence, baseline, and externality checks.</p>
                </div>
              </div>
              <div className="flow-step">
                <span className="flow-number">03</span>
                <div>
                  <strong>Governance still forming</strong>
                  <p>Named reviewer and advisor roles should become public as they formalize.</p>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </header>

      <main id="main-content" tabIndex={-1}>
        <section className="section section-white">
          <div className="section-head">
            <p className="eyebrow">Operator commitments</p>
            <h2>What stewardship means at this stage</h2>
            <p>
              The public trust layer should be honest about what exists now and what must be
              published before broader marketplace mechanics are credible.
            </p>
          </div>
          <div className="panel data-card data-card-wide">
            <ul className="compact-list">
              {commitments.map((commitment) => (
                <li key={commitment}>{commitment}</li>
              ))}
            </ul>
          </div>
        </section>

        <section className="section section-subtle">
          <div className="section-head">
            <p className="eyebrow">Trust roadmap</p>
            <h2>What should become visible next</h2>
            <p>
              The audit calls for stronger authorship, governance, accessibility, and
              measurement. The current site now exposes the destinations for that work.
            </p>
          </div>
          <div className="data-grid">
            <Link className="panel data-card" href="/research">
              <h3>Research and governance</h3>
              <p className="route-text">Open questions, reviewer rulebook links, and transparency plans.</p>
            </Link>
            <Link className="panel data-card" href="/trust">
              <h3>What you can rely on</h3>
              <p className="route-text">Guarantees, non-guarantees, and review states.</p>
            </Link>
            <Link className="panel data-card" href="/updates">
              <h3>Pilot updates</h3>
              <p className="route-text">Follow public progress without relying on premature claims.</p>
            </Link>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
