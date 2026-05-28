import type { Metadata } from "next";
import Link from "next/link";

import { SiteFooter } from "@/components/layout/site-footer";
import { SiteTopbar } from "@/components/layout/site-topbar";
import { getViewer } from "@/lib/app-data";
import { getMoralTradeProvenanceContract } from "@/lib/moral-trade/provenance";
import {
  evaluateMoralTradeProtocolDraft,
  formatProtocolReviewStatus,
  getOfferReviewCardInstrumentation,
  getOfferReviewWorkflowContract,
  type ProtocolReviewStatus,
} from "@/lib/proposal-review";
import { getAbsoluteUrl } from "@/lib/seo";
import { CANONICAL_WORKED_CASE_OFFERS } from "@/lib/seed-data";
import { getPrimaryNavLinks, getTopbarActions } from "@/lib/site";

export const metadata: Metadata = {
  title: "Reasoning Center",
  description:
    "A Moral Trade pilot index for public review notes, factor codes, uncertainty flags, and next-step checklists.",
  alternates: {
    canonical: "/reasoning-center",
  },
  openGraph: {
    title: "Reasoning Center",
    description:
      "Public review notes, factor codes, uncertainty flags, and governance questions for the Moral Trade pilot.",
    url: getAbsoluteUrl("/reasoning-center"),
    type: "website",
  },
};

const navSections = [
  { label: "Review queue", descriptor: "public" },
  { label: "Trade design", descriptor: "factors" },
  { label: "Evidence gaps", descriptor: "checks" },
  { label: "Safety review", descriptor: "gates" },
  { label: "Public goods", descriptor: "notes" },
  { label: "Open questions", descriptor: "drafts" },
] as const;

const reviewFilters = ["All records", "Needs evidence", "Human review", "Blocked", "Pass with limits"] as const;

const topics = [
  "Donation offsets",
  "Pledge swaps",
  "Anti-threat rules",
  "Public goods fund",
  "Evidence design",
  "Moral uncertainty",
] as const;

function getReasoningStatusTone(status: ProtocolReviewStatus) {
  switch (status) {
    case "blocked":
      return "blocked";
    case "matchable":
      return "pass";
    case "needs_human_review":
      return "human-review";
    default:
      return "needs-input";
  }
}

function getWorkedCaseBaselineStatement(offer: (typeof CANONICAL_WORKED_CASE_OFFERS)[number]) {
  if (offer.mode === "offset" && offer.baselineAmountUsd) {
    return `Without this trade, ${offer.alias} reports a baseline intention to direct $${offer.baselineAmountUsd.toLocaleString()} toward ${offer.baselineOpposedCause}.`;
  }

  return `Without this trade, ${offer.alias} would not expect this reciprocal ${offer.mode} to happen during ${offer.duration}.`;
}

function getReasoningReviewRecords() {
  return CANONICAL_WORKED_CASE_OFFERS.slice(0, 5).map((offer, index) => {
    const protocolReview = evaluateMoralTradeProtocolDraft({
      format: offer.mode,
      offeredCause: offer.offeredCause,
      requestedCause: offer.requestedCause,
      offeredAction: offer.offerAction,
      requestedAction: offer.requestAction,
      baselineStatement: getWorkedCaseBaselineStatement(offer),
      duration: offer.duration,
      exitConditions:
        "If evidence is missing, disputed, stale, or outside the agreed scope, this worked example stays unresolved until a reviewer records a scoped decision.",
      verificationMethod: offer.verification,
      publicDescription: offer.notes,
      evidenceUrl: offer.evidenceUrl,
      participantImportance: offer.offerImpact,
      counterpartyThreshold: offer.minCounterpartyImpact,
    });
    const marketplaceInstrumentation = getOfferReviewCardInstrumentation({
      ...offer,
      currentStatus: "Worked example; manual review required before reliance",
      offerImpact: offer.offerImpact,
      minCounterpartyImpact: offer.minCounterpartyImpact,
    });
    const factorCodes = Array.from(
      new Set([...marketplaceInstrumentation.factorCodes, ...protocolReview.factorCodes]),
    ).slice(0, 7);

    return {
      status: formatProtocolReviewStatus(protocolReview.status),
      statusTone: getReasoningStatusTone(protocolReview.status),
      scope: `Worked example ${offer.id}`,
      title: `${offer.alias}: ${offer.offeredCause} for ${offer.requestedCause}`,
      factorCodes,
      summary: protocolReview.summary,
      nextStep: protocolReview.nextStepChecklist[0] ?? marketplaceInstrumentation.nextStep,
      evidenceRows: protocolReview.citedEvidenceTable.slice(0, 3),
      uncertaintyFlags: protocolReview.uncertaintyFlags.slice(0, 4),
      reviewScope: protocolReview.reviewInstructions.reviewScope.slice(0, 3),
      href: `/offers/examples/${offer.id}`,
      rank: index + 1,
    };
  });
}

const reviewRecords = getReasoningReviewRecords();
const provenanceContract = getMoralTradeProvenanceContract();
const reviewWorkflowContract = getOfferReviewWorkflowContract();

const reviewNotes = [
  {
    label: "No hidden ranking",
    text: "Reasoning summaries should explain explicit factors without implying a platform-wide moral score.",
  },
  {
    label: "No autonomous outreach",
    text: "The reasoning workspace can draft checklists, but contact, disclosure, and status changes require consent gates.",
  },
  {
    label: "No fake certainty",
    text: "Incomplete records should remain marked as needing input instead of being polished into confident prose.",
  },
] as const;

const openQuestions = [
  "Can offset matching distinguish counterfactual change from already-planned giving?",
  "Which third-party harms should give standing to challenge a private agreement?",
  "When should political-adjacent trades be rejected rather than sandboxed as examples?",
] as const;

const notices = [
  "This page is a public index, not a live forum or autonomous moral-ranking system.",
  "Signed-in drafting and reviewer workflows remain separate from public examples until explicit publication.",
  "Public entries should cite factor codes, evidence state, uncertainty, and the next human-controlled step.",
] as const;

async function getOptionalViewerForReasoningCenter() {
  try {
    return await getViewer();
  } catch (error) {
    console.warn("[reasoning-center] Rendering signed-out state after viewer lookup failed.", error);
    return null;
  }
}

export default async function ReasoningCenterPage() {
  const viewer = await getOptionalViewerForReasoningCenter();
  const isAuthenticated = Boolean(viewer);

  return (
    <div className="page-shell reasoning-shell">
      <SiteTopbar
        brandHref="/"
        links={getPrimaryNavLinks(isAuthenticated)}
        {...getTopbarActions(isAuthenticated)}
        showLogout={isAuthenticated}
        showSearch
      />

      <main className="reasoning-layout" id="main-content" tabIndex={-1}>
        <aside className="reasoning-left-rail" aria-label="Reasoning sections">
          <Link className="reasoning-new-post" href={isAuthenticated ? "/dashboard" : "/signup"}>
            Draft review note
          </Link>
          <nav className="reasoning-side-nav" aria-label="Reasoning center navigation">
            {navSections.map((section, index) => (
              <Link
                aria-current={index === 0 ? "page" : undefined}
                href="/reasoning-center"
                key={section.label}
              >
                <span>{section.label}</span>
                <small>{section.descriptor}</small>
              </Link>
            ))}
          </nav>
          <section className="reasoning-rail-block" aria-labelledby="sequences-heading">
            <h2 id="sequences-heading">Public packets</h2>
            <Link href="/reasoning-center">Donation-offset design</Link>
            <Link href="/reasoning-center">Anti-threat review</Link>
            <Link href="/reasoning-center">Public-goods governance</Link>
          </section>
        </aside>

        <section className="reasoning-feed" aria-labelledby="reasoning-title">
          <header className="reasoning-feed-head">
            <div>
              <p className="eyebrow">Pilot reasoning index</p>
              <h1 id="reasoning-title">Reasoning Center</h1>
              <p>
                Public review records for making draft trades legible: factor codes, uncertainty
                flags, evidence gaps, and the next human-controlled step before anyone relies on
                them.
              </p>
            </div>
            <Link className="button button-primary" href="/reasoning-standards">
              Standards
            </Link>
          </header>

          <div className="reasoning-tabs" aria-label="Review filters">
            {reviewFilters.map((tab, index) => (
              <Link aria-current={index === 0 ? "page" : undefined} href="/reasoning-center" key={tab}>
                {tab}
              </Link>
            ))}
          </div>

          <div className="reasoning-topic-strip" aria-label="Topics">
            {topics.map((topic) => (
              <Link href="/reasoning-center" key={topic}>
                {topic}
              </Link>
            ))}
          </div>

          <section className="reasoning-contract-strip" aria-label="Published review contracts">
            <article>
              <span>Review workflow</span>
              <strong>{reviewWorkflowContract.detailWorkflowCards.length} cards</strong>
              <small>{reviewWorkflowContract.marketplaceFactorPriority.length} marketplace factors</small>
            </article>
            <article>
              <span>Provenance contract</span>
              <strong>{provenanceContract.validationRules.length} rules</strong>
              <small>{provenanceContract.sampleBundleSummary.validationStatus} sample bundle</small>
            </article>
            <article>
              <span>Public packet source</span>
              <strong>{reviewRecords.length} worked examples</strong>
              <small>deterministic review output only</small>
            </article>
          </section>

          <div className="reasoning-post-list" aria-label="Public review records">
            {reviewRecords.map((record) => (
              <article className="reasoning-post-row" key={record.title}>
                <div
                  className={`reasoning-status-box reasoning-status-${record.statusTone}`}
                  aria-label={`${record.status} status`}
                >
                  <span>{record.status}</span>
                  <small>state</small>
                </div>
                <div className="reasoning-post-main">
                  <div className="reasoning-post-rank">#{record.rank}</div>
                  <h2>
                    <Link href={record.href}>{record.title}</Link>
                  </h2>
                  <p>{record.summary}</p>
                  <div className="reasoning-factor-list" aria-label="Factor codes">
                    {record.factorCodes.map((code) => (
                      <span className="reasoning-factor" key={code}>
                        {code}
                      </span>
                    ))}
                  </div>
                  <p className="reasoning-next-step">
                    <strong>Next step:</strong> {record.nextStep}
                  </p>
                  <div className="reasoning-packet-grid">
                    <div>
                      <strong>Cited evidence rows</strong>
                      <ul>
                        {record.evidenceRows.map((row) => (
                          <li key={`${record.title}:${row.citation}:${row.claim}`}>
                            {row.status}: {row.claim}
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div>
                      <strong>Uncertainty flags</strong>
                      {record.uncertaintyFlags.length ? (
                        <ul>
                          {record.uncertaintyFlags.map((flag) => (
                            <li key={`${record.title}:${flag}`}>{flag}</li>
                          ))}
                        </ul>
                      ) : (
                        <p>No public uncertainty flags beyond ordinary reviewer scope.</p>
                      )}
                    </div>
                    <div>
                      <strong>Reviewer scope</strong>
                      <ul>
                        {record.reviewScope.map((scope) => (
                          <li key={`${record.title}:${scope}`}>{scope}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                  <div className="reasoning-post-meta">
                    <span>{record.scope}</span>
                    <Link href="/moral-trade/technical-spec">Protocol spec</Link>
                    <Link href="/api/moral-trade/review-workflow/contract">Review contract</Link>
                    <Link href="/api/moral-trade/provenance/schema">Provenance schema</Link>
                    <Link href="/reasoning-standards">Evidence standards</Link>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>

        <aside className="reasoning-right-rail" aria-label="Reasoning center sidebar">
          <section className="reasoning-widget">
            <div className="reasoning-widget-head">
              <h2>Review notes</h2>
              <Link href="/moral-trade/technical-spec">Spec</Link>
            </div>
            <div className="quick-take-list">
              {reviewNotes.map((note) => (
                <article className="quick-take" key={note.text}>
                  <strong className="reasoning-note-label">{note.label}</strong>
                  <p>{note.text}</p>
                </article>
              ))}
            </div>
          </section>

          <section className="reasoning-widget">
            <div className="reasoning-widget-head">
              <h2>Contract rules</h2>
              <Link href="/api/moral-trade/provenance/schema">JSON</Link>
            </div>
            <ul className="reasoning-contract-rule-list">
              {provenanceContract.validationRules.slice(0, 5).map((rule) => (
                <li key={rule.key}>
                  <strong>{rule.key}</strong>
                  <span>{rule.label}</span>
                </li>
              ))}
            </ul>
          </section>

          <section className="reasoning-widget">
            <div className="reasoning-widget-head">
              <h2>Open questions</h2>
              <Link href="/reasoning-center">Ask</Link>
            </div>
            <ol className="reasoning-question-list">
              {openQuestions.map((question) => (
                <li key={question}>{question}</li>
              ))}
            </ol>
          </section>

          <section className="reasoning-widget reasoning-standards-widget">
            <h2>Reasoning standards</h2>
            <p>
              Separate claims about moral value, evidence quality, counterfactual baselines, and
              safety boundaries before publishing a trade.
            </p>
            <Link className="inline-link" href="/reasoning-standards">
              Read standards
            </Link>
          </section>

          <section className="reasoning-widget">
            <h2>Community notices</h2>
            <ul className="reasoning-notice-list">
              {notices.map((notice) => (
                <li key={notice}>{notice}</li>
              ))}
            </ul>
          </section>
        </aside>
      </main>

      <SiteFooter />
    </div>
  );
}
