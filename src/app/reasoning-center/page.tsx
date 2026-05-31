import type { Metadata } from "next";
import Link from "next/link";

import { SiteFooter } from "@/components/layout/site-footer";
import { SiteTopbar } from "@/components/layout/site-topbar";
import { Breadcrumbs } from "@/components/ui/page-primitives";
import { getViewer } from "@/lib/app-data";
import {
  MORAL_TRADE_REASONING_PACKET_FILTERS,
  filterMoralTradeReasoningPackets,
  getMoralTradeReasoningPacketFilterCounts,
  getMoralTradeReasoningPacketFilterKey,
  getMoralTradeReasoningPacketContract,
  getMoralTradeReasoningPackets,
} from "@/lib/moral-trade/reasoning-packets";
import { buildBreadcrumbJsonLd, getAbsoluteUrl, truncateDescription } from "@/lib/seo";
import { getPrimaryNavLinks, getTopbarActions } from "@/lib/site";

const reasoningCenterDescription =
  "A Moral Trade pilot index for public review notes, factor codes, uncertainty flags, and next-step checklists.";

export const metadata: Metadata = {
  title: "Reasoning Center",
  description: reasoningCenterDescription,
  alternates: {
    canonical: "/reasoning-center",
  },
  openGraph: {
    title: "Reasoning Center | Moral Trade",
    description: reasoningCenterDescription,
    url: getAbsoluteUrl("/reasoning-center"),
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Reasoning Center | Moral Trade",
    description: reasoningCenterDescription,
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

const topics = [
  "Donation offsets",
  "Pledge swaps",
  "Anti-threat rules",
  "Public goods fund",
  "Evidence design",
  "Moral uncertainty",
] as const;

const reviewRecords = getMoralTradeReasoningPackets();
const reasoningPacketContract = getMoralTradeReasoningPacketContract(reviewRecords);

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

interface ReasoningCenterPageProps {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}

export default async function ReasoningCenterPage({
  searchParams,
}: ReasoningCenterPageProps) {
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const activeFilterKey = getMoralTradeReasoningPacketFilterKey(
    resolvedSearchParams.status,
  );
  const activeFilter =
    MORAL_TRADE_REASONING_PACKET_FILTERS.find(
      (filter) => filter.key === activeFilterKey,
    ) ?? MORAL_TRADE_REASONING_PACKET_FILTERS[0];
  const filterCounts = getMoralTradeReasoningPacketFilterCounts(reviewRecords);
  const filteredReviewRecords = filterMoralTradeReasoningPackets(
    reviewRecords,
    activeFilterKey,
  );
  const viewer = await getOptionalViewerForReasoningCenter();
  const isAuthenticated = Boolean(viewer);
  const breadcrumbStructuredData = buildBreadcrumbJsonLd([
    { href: "/reasoning-center", label: "Reasoning Center" },
  ]);
  const reasoningCollectionStructuredData = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "Moral Trade Reasoning Center",
    url: getAbsoluteUrl("/reasoning-center"),
    description: reasoningCenterDescription,
    mainEntity: {
      "@type": "ItemList",
      itemListElement: filteredReviewRecords.map((record, index) => ({
        "@type": "ListItem",
        position: index + 1,
        url: getAbsoluteUrl(record.href),
        name: record.title,
        description: truncateDescription(`${record.status}: ${record.summary}`, 150),
      })),
    },
  };

  return (
    <div className="page-shell reasoning-shell">
      <script
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(breadcrumbStructuredData),
        }}
        type="application/ld+json"
      />
      <script
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(reasoningCollectionStructuredData),
        }}
        type="application/ld+json"
      />
      <SiteTopbar
        brandHref="/"
        links={getPrimaryNavLinks(isAuthenticated)}
        {...getTopbarActions(isAuthenticated)}
        showLogout={isAuthenticated}
        showSearch
      />
      <Breadcrumbs items={[{ href: "/reasoning-center", label: "Reasoning Center" }]} />

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
              <p className="reasoning-filter-summary">
                Showing {filteredReviewRecords.length} of {reviewRecords.length} public packet
                {reviewRecords.length === 1 ? "" : "s"} for {activeFilter.label.toLowerCase()}.
              </p>
            </div>
            <Link className="button button-primary" href="/reasoning-standards">
              Standards
            </Link>
          </header>

          <div className="reasoning-tabs" aria-label="Review filters">
            {MORAL_TRADE_REASONING_PACKET_FILTERS.map((filter) => (
              <Link
                aria-current={filter.key === activeFilterKey ? "page" : undefined}
                href={filter.href}
                key={filter.key}
                title={filter.description}
              >
                <span>{filter.label}</span>
                <small>{filterCounts[filter.key]}</small>
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
              <strong>
                {reasoningPacketContract.linkedContracts.reviewWorkflowCardCount} cards
              </strong>
              <small>
                {reasoningPacketContract.linkedContracts.reviewWorkflowMarketplaceFactorCount} marketplace factors
              </small>
            </article>
            <article>
              <span>Provenance contract</span>
              <strong>
                {reasoningPacketContract.linkedContracts.provenanceValidationRuleCount} rules
              </strong>
              <small>
                {reasoningPacketContract.linkedContracts.provenanceSampleBundleStatus} sample bundle
              </small>
            </article>
            <article>
              <span>Packet contract</span>
              <strong>{reasoningPacketContract.packetCount} worked examples</strong>
              <small>deterministic review output only</small>
            </article>
          </section>

          <div
            className="reasoning-post-list"
            aria-label={`${activeFilter.label} public review records`}
          >
            {filteredReviewRecords.length ? (
              filteredReviewRecords.map((record) => (
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
                      <strong>Decision steps</strong>
                      <ul>
                        {record.decisionSteps.map((step) => (
                          <li key={`${record.title}:${step.key}`}>
                            {step.status}: {step.label}
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
                    <Link href="/api/moral-trade/reasoning/packets">Packet JSON</Link>
                    <Link href="/api/moral-trade/provenance/schema">Provenance schema</Link>
                    <Link href="/reasoning-standards">Evidence standards</Link>
                  </div>
                </div>
              </article>
              ))
            ) : (
              <section className="reasoning-empty-state" aria-label="No matching packets">
                <p className="eyebrow">No public packets</p>
                <h2>No {activeFilter.label.toLowerCase()} records are published yet.</h2>
                <p>
                  The Reasoning Center only shows deterministic worked-example packets. Live
                  private offers, exact wishes, contact details, and raw source notes stay out of
                  this public index.
                </p>
                <div className="reasoning-empty-actions">
                  <Link className="button button-secondary" href="/reasoning-center">
                    Show all records
                  </Link>
                  <Link className="button button-secondary" href="/reasoning-standards">
                    Review standards
                  </Link>
                </div>
              </section>
            )}
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
              <h2>Packet rules</h2>
              <Link href="/api/moral-trade/reasoning/packets">JSON</Link>
            </div>
            <ul className="reasoning-contract-rule-list">
              {reasoningPacketContract.invariants.slice(0, 5).map((invariant, index) => (
                <li key={invariant}>
                  <strong>rule {index + 1}</strong>
                  <span>{invariant}</span>
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
