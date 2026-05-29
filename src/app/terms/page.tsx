import type { Metadata } from "next";
import Link from "next/link";

import { SiteFooter } from "@/components/layout/site-footer";
import { SiteTopbar } from "@/components/layout/site-topbar";
import { getViewer } from "@/lib/app-data";
import { getPrimaryNavLinks, getTopbarActions } from "@/lib/site";

export const metadata: Metadata = {
  title: "Terms",
  description: "Terms for using Moral Trade.",
  alternates: {
    canonical: "/terms",
  },
};

export default async function TermsPage() {
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
        <p className="eyebrow">Terms</p>
        <h1>Terms for careful participation</h1>
        <p>
          Moral Trade helps people discover, discuss, and record voluntary commitments. It is not a
          law firm, escrow agent, charity evaluator, investment adviser, or court.
        </p>
        <section className="panel data-card data-card-wide">
          <h2>Participant responsibilities</h2>
          <p>
            Participants are responsible for checking legality, tax treatment, safety, truthfulness,
            feasibility, and moral relevance before entering a trade. Do not use the service for
            coercive, deceptive, harassing, illegal, exploitative, or violent proposals.
          </p>
        </section>
        <section className="panel data-card data-card-wide">
          <h2>Payments</h2>
          <p>
            Stripe may be used to route payments between participants. Payment records support
            accountability, but they do not create legal escrow unless a separate legally valid
            arrangement says so. Recurring cadence settings create reminders and records; they are
            not automatic subscriptions unless the parties separately complete a Stripe payment.
          </p>
        </section>
        <section className="panel data-card data-card-wide">
          <h2>Operator review</h2>
          <p>
            Moral Trade may review reports, blocked wish profiles, failed email, disputes, and
            payment-review requests. Review does not mean endorsement, legal advice, or adjudication
            of the underlying moral claim.
          </p>
        </section>
        <section className="panel data-card data-card-wide">
          <h2>Disputes and evidence</h2>
          <p>
            Agreement notes, verification evidence, ratings, and payment status are records for
            participants. They are not a guarantee that an action occurred, that a commitment is
            enforceable, or that a trade was morally correct.
          </p>
        </section>
        <section className="panel data-card data-card-wide">
          <h2>Privacy, processors, and data requests</h2>
          <p>
            Privacy requests, processor questions, profile export, correction, deletion, and
            restriction workflows are handled through the Privacy page, dashboard portability
            tools, and contact route. Some audit, payment, safety, or dispute records may need to
            be retained to preserve review integrity.
          </p>
          <div className="offer-actions">
            <Link className="button button-primary" href="/privacy">
              Read privacy practices
            </Link>
            <Link className="button button-secondary" href="/contact">
              Contact support
            </Link>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
