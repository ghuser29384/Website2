import type { Metadata } from "next";
import Link from "next/link";

import { MpgfPageFrame } from "@/components/mpgf/mpgf-page-frame";
import { getViewer } from "@/lib/app-data";
import { demoAlternatives, MPGF_COPY } from "@/lib/mpgf/data";
import {
  buildPublicSummary,
  computeExactMpgfAllocation,
  formatUsd,
} from "@/lib/mpgf/mechanism";
import { loadMpgfManualEvidenceReadiness, loadMpgfRealMoneyReadiness } from "@/lib/mpgf/real-money";
import { getAbsoluteUrl } from "@/lib/seo";

export const metadata: Metadata = {
  title: "Public Goods Fund",
  description:
    "Review the Moral Trade Public Goods Fund overview, evidence review, demo candidate pools, allocation process, and technical notes.",
  alternates: {
    canonical: "/mpgf",
  },
  openGraph: {
    title: "Public Goods Fund",
    description:
      "Submit manual external-payment evidence for the Moral Public Goods Fund and review shared moral public goods.",
    url: getAbsoluteUrl("/mpgf"),
    type: "website",
  },
};

export const dynamic = "force-dynamic";

export default async function MpgfPage() {
  const viewer = await getViewer();
  const allocation = computeExactMpgfAllocation();
  const publicSummary = buildPublicSummary({ allocation });
  const manualEvidenceReadiness = await loadMpgfManualEvidenceReadiness();
  const realMoneyReadiness = await loadMpgfRealMoneyReadiness();

  return (
    <MpgfPageFrame
      actions={
        <>
          <Link className="button button-primary" href="/mpgf/contribute">
            Submit manual evidence
          </Link>
          <Link className="button button-secondary" href="/mpgf/pools">
            Review candidate pools
          </Link>
        </>
      }
      description="The Public Goods Fund coordinates contributions toward goods many moral views can value, with external-payment evidence and reviewer verification."
      eyebrow="Public Goods Fund"
      title="Pool support for shared moral goods."
      realMoneyReadiness={realMoneyReadiness}
      viewerPresent={Boolean(viewer)}
    >
      <nav className="hub-tabs" aria-label="Public Goods Fund sections">
        <a href="#overview">Overview</a>
        <a href="#evidence-review">Evidence review</a>
        <a href="#candidate-pools">Candidate pools</a>
        <a href="#allocation-process">Allocation process</a>
        <a href="#technical-notes">Technical notes</a>
      </nav>

      <section className="section section-white" id="overview">
        <div className="section-head section-head-compact">
          <p className="eyebrow">Overview</p>
          <h2>A public fund for overlapping moral reasons</h2>
          <p>
            The Moral Public Goods Fund, or MPGF, is the mechanism name. Public pages use Public
            Goods Fund so newcomers can understand the purpose before the acronym.
          </p>
        </div>
        <div className="concept-grid">
          <article className="panel concept-card">
            <h3>Consensus goods</h3>
            <p>{MPGF_COPY.moralPublicGoods}</p>
          </article>
          <article className="panel concept-card">
            <h3>Evidence before counting</h3>
            <p>{MPGF_COPY.manualExternalPaymentEvidence}</p>
          </article>
          <article className="panel concept-card">
            <h3>Legal posture</h3>
            <p>
              {MPGF_COPY.not_escrow} {MPGF_COPY.not_tax_advice}
            </p>
          </article>
        </div>
      </section>

      <section className="mpgf-kpi-grid" aria-label="Public Goods Fund current summary">
        <div className="mpgf-kpi">
          <span>Demo budget</span>
          <strong>{formatUsd(publicSummary.budgetCents)}</strong>
        </div>
        <div className="mpgf-kpi">
          <span>Allocated internally</span>
          <strong>{formatUsd(allocation.allocatedCents)}</strong>
        </div>
        <div className="mpgf-kpi">
          <span>External payouts</span>
          <strong>{formatUsd(publicSummary.externallyPaidCents)}</strong>
        </div>
        <div className="mpgf-kpi">
          <span>Review status</span>
          <strong>{manualEvidenceReadiness.ready ? "Open" : "Persistence check"}</strong>
        </div>
      </section>

      <section className="section section-subtle" id="evidence-review">
        <div className="section-head">
          <p className="eyebrow">Evidence and payment review path</p>
          <h2>Manual evidence starts review; it does not move or certify money by itself</h2>
          <p>
            Signed-in participants can record external-payment evidence for MPGF review. A record
            is counted only after review accepts the destination, reference, amount, evidence
            standard, and any provider event that applies.
          </p>
        </div>

        <div className="concept-grid">
          <article className="panel concept-card">
            <h3>Manual evidence</h3>
            <p>
              Participants submit an external destination, amount, date, reference, and evidence
              note. Until review accepts it, the contribution remains a pending claim.
            </p>
          </article>
          <article className="panel concept-card">
            <h3>Provider events</h3>
            <p>
              Stripe webhook records can support provider-approved flows when real-money mode is
              configured. The public pilot still treats provider data as review evidence rather
              than a promise of custody or legal escrow.
            </p>
          </article>
          <article className="panel concept-card">
            <h3>Participant controls</h3>
            <p>
              Signed-out visitors can inspect the workflow, but manual evidence submission and
              persisted contribution records are available only after sign-in.
            </p>
          </article>
        </div>
      </section>

      <section className="section section-white" id="participation">
        <div className="section-head">
          <p className="eyebrow">How participation works</p>
          <h2>Pay externally, submit evidence, then wait for review</h2>
          <p>
            The public hub explains the workflow without embedding the full submission console.
            Signed-in participants use the dedicated contribution page to record evidence.
          </p>
        </div>
        <div className="step-card-grid">
          <article className="panel step-card">
            <span className="step-index">01</span>
            <h3>Pay through an approved external destination</h3>
            <p>Use the external destination named by the pilot or by the candidate pool.</p>
          </article>
          <article className="panel step-card">
            <span className="step-index">02</span>
            <h3>Submit receipt evidence</h3>
            <p>Record the amount, reference, payment date, destination, and supporting evidence.</p>
          </article>
          <article className="panel step-card">
            <span className="step-index">03</span>
            <h3>Reviewers mark it verified or unresolved</h3>
            <p>Evidence counts only after review accepts it; unresolved records remain pending.</p>
          </article>
        </div>
        <div className="hero-actions">
          <Link className="button button-primary" href="/mpgf/contribute">
            Submit manual evidence
          </Link>
          <Link className="button button-secondary" href="/mpgf/account/contributions">
            View contribution state
          </Link>
        </div>
      </section>

      <section className="section section-white" id="candidate-pools">
        <div className="section-head section-head-compact">
          <p className="eyebrow">Candidate pools</p>
          <h2>Demo pools are clearly marked as demo pools</h2>
          <p>
            These alternatives are non-real-money examples used to show how candidate public goods
            can be described before any live allocation or payout workflow exists.
          </p>
        </div>
        <div className="data-grid">
          {demoAlternatives.slice(0, 4).map((alternative) => (
            <article className="panel data-card" key={alternative.id}>
              <p className="detail-kicker">Demo pool | {alternative.causeArea}</p>
              <h3>{alternative.name}</h3>
              <p className="route-text">{alternative.description}</p>
              <div className="tag-row">
                <span className="badge badge-secondary">
                  {alternative.isConsensus ? "Consensus good" : "Hybrid good"}
                </span>
                <span className="badge badge-secondary">Review state: demo only</span>
              </div>
              <dl className="listing-terms">
                <div>
                  <dt>Amount verified</dt>
                  <dd>{formatUsd(0)}</dd>
                </div>
                <div>
                  <dt>Amount pending</dt>
                  <dd>{formatUsd(0)}</dd>
                </div>
              </dl>
              <Link className="text-button" href="/mpgf/pools">
                Inspect pool
              </Link>
            </article>
          ))}
        </div>
      </section>

      <section className="section section-subtle" id="allocation-process">
        <div className="section-head section-head-compact">
          <p className="eyebrow">Allocation process</p>
          <h2>Two-stage review before any public reliance</h2>
          <p>
            The pilot separates evidence review from allocation review. Evidence records must be
            accepted before they count, and demo allocation records remain internal plans rather
            than disbursement, custody, or effectiveness guarantees.
          </p>
        </div>
        <div className="step-card-grid">
          <article className="panel step-card">
            <span className="step-index">01</span>
            <h3>Evidence review</h3>
            <p>Check external destination, amount, reference, payment date, and supporting evidence.</p>
          </article>
          <article className="panel step-card">
            <span className="step-index">02</span>
            <h3>Allocation review</h3>
            <p>Review candidate pools, demo reasoning, dissent notes, and published technical records.</p>
          </article>
        </div>
      </section>

      <section className="section section-white" id="technical-notes">
        <div className="section-head section-head-compact">
          <p className="eyebrow">Technical notes</p>
          <h2>Detailed mechanism language lives behind the overview</h2>
          <p>
            Technical records remain available for auditors and mechanism reviewers without making
            them the first thing a new visitor has to parse.
          </p>
        </div>
        <div className="hero-actions">
          <Link className="button button-secondary" href="/mpgf/technical-spec">
            Technical spec
          </Link>
          <Link className="button button-secondary" href="/mpgf/pools">
            Candidate pools
          </Link>
          <Link className="button button-secondary" href="/priority-correction-fund">
            Priority Correction Fund
          </Link>
        </div>
      </section>
    </MpgfPageFrame>
  );
}
