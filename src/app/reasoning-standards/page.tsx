import type { Metadata } from "next";
import Link from "next/link";

import { SiteFooter } from "@/components/layout/site-footer";
import { SiteTopbar } from "@/components/layout/site-topbar";
import { getViewer } from "@/lib/app-data";
import { getPrimaryNavLinks, getTopbarActions } from "@/lib/site";
import { getAbsoluteUrl } from "@/lib/seo";

export const metadata: Metadata = {
  title: "Reasoning standards",
  description:
    "The public standards Moral Trade uses to separate voluntary moral trade from coercion, unsupported verification, and overclaiming.",
  alternates: {
    canonical: "/reasoning-standards",
  },
  openGraph: {
    title: "Reasoning standards",
    description:
      "The public standards Moral Trade uses to separate voluntary moral trade from coercion, unsupported verification, and overclaiming.",
    url: getAbsoluteUrl("/reasoning-standards"),
    type: "website",
  },
};

export default async function ReasoningStandardsPage() {
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
            <p className="eyebrow">Reasoning standards</p>
            <h1>Make trade records specific enough to judge.</h1>
            <p className="hero-text">
              Moral Trade is useful only when the parties can see the action, the reciprocal
              request, the verification rule, and the safety boundary before anyone relies on the
              exchange.
            </p>
            <div className="hero-actions">
              <Link className="button button-primary" href="/offers">
                Review offers
              </Link>
              <Link className="button button-secondary" href="/safety">
                Safety policy
              </Link>
            </div>
          </section>

          <aside className="hero-panel panel">
            <p className="eyebrow">Core test</p>
            <div className="flow-card">
              <div className="flow-step">
                <span className="flow-number">01</span>
                <div>
                  <strong>Voluntary</strong>
                  <p>Both sides can decline without threat, pressure, doxxing, or retaliation.</p>
                </div>
              </div>
              <div className="flow-step">
                <span className="flow-number">02</span>
                <div>
                  <strong>Mutually beneficial</strong>
                  <p>Each side can explain why the trade is better under its own moral view.</p>
                </div>
              </div>
              <div className="flow-step">
                <span className="flow-number">03</span>
                <div>
                  <strong>Verifiable</strong>
                  <p>The record names what evidence will count and who reviews it.</p>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </header>

      <main id="main-content" tabIndex={-1}>
        <section className="section section-white">
          <div className="section-head">
            <p className="eyebrow">Trade standard</p>
            <h2>A valid offer should name the whole exchange</h2>
            <p>
              Public offers should show the action, reciprocal request, cause areas, minimum
              reciprocal impact, duration, exit rule, and evidence rule. Donation offsets add a
              named compromise destination, matched-redirection rule, unmatched-surplus rule,
              threshold, expiry, and anti-threat certification.
            </p>
          </div>

          <div className="concept-grid">
            <article className="panel concept-card">
              <h3>Not a threat market</h3>
              <p>
                Offers that rely on threats, coercion, fraud, harassment, doxxing, or pressure on
                vulnerable people are not moral trades. They should be blocked or sent to review.
              </p>
            </article>
            <article className="panel concept-card">
              <h3>Not generic charity advice</h3>
              <p>
                Moral public goods are presented as coordination mechanisms for shared consensus
                goods. The site is not a charity evaluator and should not claim that a destination
                is best for every donor.
              </p>
            </article>
            <article className="panel concept-card">
              <h3>Not legal escrow</h3>
              <p>
                Payment language must stay aligned with the terms. Evidence-gated review,
                third-party payment records, and pending verification are not legal escrow.
              </p>
            </article>
          </div>
        </section>

        <section className="section section-subtle">
          <div className="section-head">
            <p className="eyebrow">Verification standard</p>
            <h2>Evidence has to be named before reliance</h2>
            <p>
              Records should state the evidence standard in plain language: receipt, third-party
              payment record, audit, dated public statement, manual reviewer decision, or another
              checkable rule. A submitted claim is not treated as verified merely because it was
              uploaded.
            </p>
          </div>

          <div className="editorial-grid">
            <article className="panel editorial-card">
              <h3>Donation offsets</h3>
              <p>
                Offset records should expose the matched action, compromise destination,
                verification rule, threshold, expiry, unmatched-surplus rule, and evidence
                standard.
              </p>
              <Link className="inline-link" href="/donation-offsets">
                Read offset standards
              </Link>
            </article>
            <article className="panel editorial-card">
              <h3>MPGF evidence</h3>
              <p>
                Manual external-payment evidence is available after sign-in and remains pending
                until review. Provider webhooks can record provider events only when the relevant
                payment mode is configured and approved.
              </p>
              <Link className="inline-link" href="/mpgf">
                Review MPGF workflow
              </Link>
            </article>
            <article className="panel editorial-card">
              <h3>Priority correction</h3>
              <p>
                The Priority Correction Fund records monthly calculations, arbiter assignments,
                support counts, dissent notes, and published reasoning instead of hiding allocation
                decisions in private messages.
              </p>
              <Link className="inline-link" href="/priority-correction-fund">
                Review the fund process
              </Link>
            </article>
          </div>
        </section>

        <section className="section section-white">
          <div className="section-head">
            <p className="eyebrow">User guidance</p>
            <h2>Dense moral claims need practical field-level guidance</h2>
            <p>
              The current forms use structured fields and validation so a participant can see what
              is missing before publishing. The next product step is deeper onboarding and richer
              examples, not loosening these standards.
            </p>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
