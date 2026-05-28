import type { Metadata } from "next";
import Link from "next/link";

import { SiteFooter } from "@/components/layout/site-footer";
import { SiteTopbar } from "@/components/layout/site-topbar";
import { getViewer } from "@/lib/app-data";
import { getAbsoluteUrl } from "@/lib/seo";
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

const reviewRecords = [
  {
    status: "Needs evidence",
    statusTone: "needs-input",
    scope: "Worked-example draft",
    title: "Donation offset baseline credibility",
    factorCodes: ["baseline_credibility", "evidence_sufficiency", "match_explanation"],
    summary:
      "A draft can describe the matched redirection and compromise destination, but it cannot become matchable until the evidence object names a receipt, public log, audit, or reviewer-verifiable record.",
    nextStep:
      "Attach a specific evidence source and state why the action was not already planned without the trade.",
  },
  {
    status: "Blocked",
    statusTone: "blocked",
    scope: "Safety gate",
    title: "Threat or coercive baseline",
    factorCodes: ["anti_threat", "human_review_routing"],
    summary:
      "Records that rely on threats, retaliation, harassment, doxxing, fake evidence, or vulnerable-person pressure are refused instead of routed into matching or outreach.",
    nextStep:
      "Rewrite the proposal around a voluntary action both parties can decline, or keep it out of the marketplace.",
  },
  {
    status: "Human review",
    statusTone: "human-review",
    scope: "Externality trigger",
    title: "Third-party standing and dissent",
    factorCodes: ["externality_trigger", "human_review_routing", "privacy_redaction"],
    summary:
      "A proposal that could materially affect non-participants needs reviewer routing before publication, with private details redacted and dissent summarized when safe.",
    nextStep:
      "Name the potentially affected group, the harm pathway, and what public summary can be disclosed without exposing private parties.",
  },
  {
    status: "Pass with limits",
    statusTone: "pass",
    scope: "Explanation record",
    title: "Privacy-safe match explanation",
    factorCodes: ["privacy_redaction", "match_explanation", "schema_completeness"],
    summary:
      "A match explanation can expose compatible cause areas, action types, and review state while keeping counterparties hidden until both sides consent.",
    nextStep:
      "Publish only redacted factor codes and confidence bands; do not reveal identities, private wishes, or autonomous contact suggestions.",
  },
  {
    status: "Needs evidence",
    statusTone: "needs-input",
    scope: "Draft completeness",
    title: "Required fields before reliance",
    factorCodes: ["schema_completeness", "evidence_sufficiency", "baseline_credibility"],
    summary:
      "A draft may be saved as a private checklist, but public reliance requires action terms, reciprocal request, exit rule, evidence standard, and anti-threat certification.",
    nextStep:
      "Complete the missing fields before asking reviewers or counterparties to rely on the record.",
  },
] as const;

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

          <div className="reasoning-post-list" aria-label="Public review records">
            {reviewRecords.map((record, index) => (
              <article className="reasoning-post-row" key={record.title}>
                <div
                  className={`reasoning-status-box reasoning-status-${record.statusTone}`}
                  aria-label={`${record.status} status`}
                >
                  <span>{record.status}</span>
                  <small>state</small>
                </div>
                <div className="reasoning-post-main">
                  <div className="reasoning-post-rank">#{index + 1}</div>
                  <h2>
                    <Link href="/reasoning-center">{record.title}</Link>
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
                  <div className="reasoning-post-meta">
                    <span>{record.scope}</span>
                    <Link href="/moral-trade/technical-spec">Protocol spec</Link>
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
