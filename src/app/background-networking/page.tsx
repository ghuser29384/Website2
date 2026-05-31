import type { Metadata } from "next";
import Link from "next/link";

import { createMatchConciergeRequestAction } from "@/app/actions";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteTopbar } from "@/components/layout/site-topbar";
import { StatusBadge } from "@/components/ui/page-primitives";
import {
  BACKGROUND_DATA_INVENTORY,
  BACKGROUND_SELF_SERVE_DELETION_CONFIRMATION,
  BACKGROUND_SELF_SERVE_DELETION_SURFACES,
} from "@/lib/background-privacy-controls";
import {
  BACKGROUND_SOURCE_PERMISSION_FIELD_OPTIONS,
  BACKGROUND_SOURCE_RETENTION_DAY_OPTIONS,
} from "@/lib/background-source-permissions";
import {
  getBackgroundAiShadowContract,
  validateBackgroundAiShadowContract,
} from "@/lib/background-ai-shadow";
import {
  getBackgroundCapabilityGateContract,
  validateBackgroundCapabilityGateContract,
} from "@/lib/background-capability-gates";
import {
  getBackgroundRlsAuditContract,
  validateBackgroundRlsAuditContract,
} from "@/lib/background-rls-audit";
import { getViewer } from "@/lib/app-data";
import { getFormMessage } from "@/lib/form-state";
import {
  getMoralTradeMatchSignalContract,
  validateMoralTradeMatchSignal,
  validateMoralTradeMatchSignalContract,
} from "@/lib/moral-trade/match-signal";
import { getPrimaryNavLinks, getTopbarActions } from "@/lib/site";
import { getAbsoluteUrl } from "@/lib/seo";

export const metadata: Metadata = {
  title: "Background networking",
  description:
    "How Moral Trade surfaces possible counterparties without scraping private feeds, revealing exact wishes, or sending autonomous outreach.",
  alternates: {
    canonical: "/background-networking",
  },
  openGraph: {
    title: "Background networking",
    description:
      "How Moral Trade surfaces possible counterparties without scraping private feeds, revealing exact wishes, or sending autonomous outreach.",
    url: getAbsoluteUrl("/background-networking"),
    type: "website",
  },
};

interface BackgroundNetworkingPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

function formatMatchSignalToken(value: string) {
  return value.replaceAll("_", " ");
}

export default async function BackgroundNetworkingPage({
  searchParams,
}: BackgroundNetworkingPageProps) {
  const resolvedSearchParams = await searchParams;
  const formMessage = getFormMessage(resolvedSearchParams);
  const viewer = await getViewer();
  const matchSignalContract = getMoralTradeMatchSignalContract();
  const matchSignalValidation =
    validateMoralTradeMatchSignalContract(matchSignalContract);
  const sampleSignalValidation = validateMoralTradeMatchSignal(
    matchSignalContract.sampleSignal,
  );
  const matchSignalStatus =
    matchSignalValidation.status === "pass" && sampleSignalValidation.status === "pass"
      ? "pass"
      : "fail";
  const matchSignalBlockerCount =
    matchSignalValidation.blockers.length + sampleSignalValidation.blockers.length;
  const aiShadowContract = getBackgroundAiShadowContract();
  const aiShadowValidation = validateBackgroundAiShadowContract(aiShadowContract);
  const capabilityGateContract = getBackgroundCapabilityGateContract();
  const capabilityGateValidation =
    validateBackgroundCapabilityGateContract(capabilityGateContract);
  const rlsAuditContract = getBackgroundRlsAuditContract();
  const rlsAuditValidation = validateBackgroundRlsAuditContract(rlsAuditContract);

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
            <p className="eyebrow">Background networking</p>
            <h1>Find possible trades without turning people into targets.</h1>
            <p className="hero-text">
              Background networking is a conservative matching layer. It compares broad public
              previews, saved preferences, and manual source notes so a participant can decide
              whether an introduction is worth exploring.
            </p>
            <div className="hero-actions">
              <Link className="button button-primary" href={viewer ? "/dashboard" : "/signup"}>
                {viewer ? "Open dashboard" : "Create account"}
              </Link>
              <Link className="button button-secondary" href="/wish-registry">
                Search broad previews
              </Link>
            </div>
          </section>

          <aside className="hero-panel panel">
            <p className="eyebrow">Boundary</p>
            <div className="flow-card">
              <div className="flow-step">
                <span className="flow-number">01</span>
                <div>
                  <strong>Broad previews first</strong>
                  <p>Cause areas and high-level aims can be compared before exact wishes are shared.</p>
                </div>
              </div>
              <div className="flow-step">
                <span className="flow-number">02</span>
                <div>
                  <strong>Consent before detail</strong>
                  <p>Contact details and private constraints remain gated until both sides opt in.</p>
                </div>
              </div>
              <div className="flow-step">
                <span className="flow-number">03</span>
                <div>
                  <strong>No autonomous outreach</strong>
                  <p>The platform records suggestions; it does not message strangers on a user&apos;s behalf.</p>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </header>

      <main id="main-content" tabIndex={-1}>
        {formMessage ? (
          <div
            className={`status-banner ${
              formMessage.tone === "error" ? "status-banner-error" : "status-banner-success"
            }`}
          >
            {formMessage.text}
          </div>
        ) : null}

        <section className="section section-white">
          <div className="section-head">
            <p className="eyebrow">How it works</p>
            <h2>Match suggestions are staged, reviewable, and reversible</h2>
            <p>
              The dashboard stores private wish profiles, manual source notes, saved searches, and
              broad registry previews. A deterministic scan can suggest possible counterparties,
              but a suggestion is not an introduction and does not reveal private data by itself.
            </p>
          </div>

          <div className="concept-grid">
            <article className="panel concept-card">
              <h3>Manual sources</h3>
              <p>
                Users can add notes about public pages or conversations they choose to record. The
                current prototype does not ingest private feeds, scrape profiles at scale, or mine
                email and chat histories.
              </p>
            </article>
            <article className="panel concept-card">
              <h3>Deterministic matching</h3>
              <p>
                Candidate matches are scored from declared cause areas, trade modes, constraints,
                location sensitivity, and verification preferences. Scores are prompts for human
                review, not automatic rankings of people.
              </p>
            </article>
            <article className="panel concept-card">
              <h3>Consent gates</h3>
              <p>
                A participant can request more detail, decline, or report a suggestion. Exact
                wishes, contact information, and sensitive constraints should only move forward
                after staged disclosure and mutual consent.
              </p>
            </article>
            <article className="panel concept-card">
              <h3>Match explanations</h3>
              <p>
                Match cards show coarse reason codes, confidence bands, trust and risk badges,
                scanned surfaces, and redacted surfaces. They explain why a suggestion exists
                without exposing raw wish text, contact details, or source notes.
              </p>
            </article>
            <article className="panel concept-card">
              <h3>Purpose-bound grants</h3>
              <p>
                Private facts should be shared for a narrow decision and, by default, a time box.
                Grants can expire or be revoked instead of becoming permanent background access.
              </p>
            </article>
            <article className="panel concept-card">
              <h3>Minimal telemetry</h3>
              <p>
                Operational metrics use buckets and counts, such as scan runs and request states.
                Analytics should not store exact wishes, private constraints, report bodies, or
                message text.
              </p>
            </article>
            <article className="panel concept-card">
              <h3>Anti-enumeration budgets</h3>
              <p>
                Manual scans, helper jobs, saved searches, and signed-in registry searches are
                budgeted and logged with hashed query fingerprints. Highly specific sparse
                registry searches are withheld until the user broadens the query.
              </p>
            </article>
          </div>
        </section>

        <section className="section section-subtle" aria-labelledby="match-signal-contract-heading">
          <div className="section-head">
            <p className="eyebrow">Match signal contract</p>
            <h2 id="match-signal-contract-heading">
              Suggestions explain public compatibility without revealing private wishes.
            </h2>
            <p>
              The report recommends factor-code explanations, staged disclosure, and no autonomous
              outreach. This contract keeps background matching to redacted profile previews, a
              confidence band, explicit blockers, and human review before disclosure or contact.
            </p>
          </div>

          <div className="protocol-validator-card panel">
            <div>
              <p className="detail-kicker">Redacted match-signal preview</p>
              <div className="protocol-workflow-card-head">
                <h3>{matchSignalStatus}</h3>
                <StatusBadge tone={matchSignalStatus === "pass" ? "default" : "warning"}>
                  {matchSignalStatus}
                </StatusBadge>
              </div>
              <p>
                {matchSignalValidation.checks.length} contract check(s),{" "}
                {matchSignalBlockerCount} blocker(s), mode{" "}
                {formatMatchSignalToken(matchSignalContract.decisioningMode)}.
              </p>
            </div>
            <div className="hero-actions">
              <Link className="button button-primary" href="/api/moral-trade/match-signal/contract">
                Open match contract
              </Link>
              <Link className="button button-secondary" href="/moral-trade/technical-spec">
                Technical spec
              </Link>
              <Link className="button button-secondary" href="/privacy">
                Disclosure rules
              </Link>
            </div>
          </div>

          <div className="protocol-review-grid">
            <article className="panel data-card">
              <h3>Why this sample appears</h3>
              <p className="route-text">
                {matchSignalContract.sampleSignal.participantExplanation.summary}
              </p>
              <div className="review-factor-list" aria-label="Sample match factor codes">
                {matchSignalContract.sampleSignal.factorCodes.map((factorCode) => (
                  <span key={factorCode}>{factorCode}</span>
                ))}
              </div>
            </article>

            <article className="panel data-card">
              <h3>Counts, not hidden inference</h3>
              <ul className="clean-list">
                <li>
                  Shared cause areas:{" "}
                  {matchSignalContract.sampleSignal.counts.sharedCauseAreas}
                </li>
                <li>
                  Cause-area complementarity:{" "}
                  {matchSignalContract.sampleSignal.counts.causeAreaComplementarity}
                </li>
                <li>
                  Compatible trade modes:{" "}
                  {matchSignalContract.sampleSignal.counts.compatibleTradeModes}
                </li>
                <li>
                  Compatible verification preferences:{" "}
                  {matchSignalContract.sampleSignal.counts.compatibleVerificationPreferences}
                </li>
              </ul>
              <p className="panel-note">
                The evaluator does not infer ideology, psychology, protected traits, or hidden
                preferences.
              </p>
            </article>

            <article className="panel data-card">
              <h3>Redactions and review gates</h3>
              <ul className="clean-list">
                {matchSignalContract.redactedFields.map((field) => (
                  <li key={field}>{formatMatchSignalToken(field)}</li>
                ))}
              </ul>
              <p className="panel-note">
                {matchSignalContract.sampleSignal.participantExplanation.humanReviewNotice}
              </p>
            </article>
          </div>
        </section>

        <section className="section section-white" aria-labelledby="capability-gates-heading">
          <div className="section-head">
            <p className="eyebrow">Capability gates</p>
            <h2 id="capability-gates-heading">
              Higher-power background features stay gated until privacy review is done.
            </h2>
            <p>
              The reports recommend staged expansion rather than broad passive ingestion. This
              public gate keeps source connectors, AI summarization, and private-overlap
              computation default-off, shadow-only, or design-only until DPIA, lawful-basis,
              privacy-design, external review, and human-control checks are satisfied.
            </p>
          </div>

          <div className="protocol-validator-card panel">
            <div>
              <p className="detail-kicker">Expansion gate</p>
              <div className="protocol-workflow-card-head">
                <h3>{capabilityGateValidation.status}</h3>
                <StatusBadge
                  tone={capabilityGateValidation.status === "pass" ? "default" : "warning"}
                >
                  {capabilityGateValidation.status}
                </StatusBadge>
              </div>
              <p>
                {capabilityGateValidation.checks.length} check(s),{" "}
                {capabilityGateValidation.blockers.length} blocker(s), expansion ready:{" "}
                {String(capabilityGateValidation.expansionReady)}.
              </p>
            </div>
            <div className="hero-actions">
              <Link
                className="button button-primary"
                href="/api/moral-trade/background-capability-gates/contract"
              >
                Open gate contract
              </Link>
              <Link className="button button-secondary" href="/safety">
                Safety posture
              </Link>
            </div>
          </div>

          <div className="protocol-review-grid">
            {capabilityGateContract.gates.map((gate) => (
              <article className="panel data-card" key={gate.key}>
                <p className="detail-kicker">{formatMatchSignalToken(gate.releaseState)}</p>
                <h3>{gate.label}</h3>
                <p className="route-text">{gate.allowedUse}</p>
                <p className="route-text">
                  <strong>Required before expansion:</strong>{" "}
                  {gate.requiredBeforeExpansion.slice(0, 3).join("; ")}.
                </p>
                <p className="panel-note">
                  Current blocker: {gate.currentBlockers[0]}
                </p>
              </article>
            ))}
          </div>
        </section>

        <section className="section section-subtle" aria-labelledby="rls-audit-heading">
          <div className="section-head">
            <p className="eyebrow">RLS and encryption audit</p>
            <h2 id="rls-audit-heading">
              Private background tables now have an executable access-control contract.
            </h2>
            <p>
              The schema audit covers private wishes, manual source notes, saved searches, match
              suggestions, grants, concierge requests, notifications, helper runs, risk signals,
              and audit events. The regression test fails if those tables lose row-level security,
              participant-scoped policies, or ciphertext/version columns for sensitive text.
            </p>
          </div>

          <div className="protocol-validator-card panel">
            <div>
              <p className="detail-kicker">Repository schema audit</p>
              <div className="protocol-workflow-card-head">
                <h3>{rlsAuditValidation.status}</h3>
                <StatusBadge tone={rlsAuditValidation.status === "pass" ? "default" : "warning"}>
                  {rlsAuditValidation.status}
                </StatusBadge>
              </div>
              <p>
                {rlsAuditContract.tableRequirements.length} RLS table requirement(s),{" "}
                {rlsAuditContract.sensitiveStorageRequirements.length} sensitive storage
                requirement(s), {rlsAuditValidation.blockers.length} blocker(s).
              </p>
            </div>
            <div className="hero-actions">
              <Link
                className="button button-primary"
                href="/api/moral-trade/background-rls-audit/contract"
              >
                Open RLS contract
              </Link>
              <Link className="button button-secondary" href="/privacy">
                Data inventory
              </Link>
            </div>
          </div>

          <div className="protocol-review-grid">
            <article className="panel data-card">
              <p className="detail-kicker">Private by default</p>
              <h3>No anonymous private-table policies</h3>
              <p className="route-text">
                Every background-networking table requirement disallows anonymous policies. Public
                discovery stays on broad previews rather than private wish or source tables.
              </p>
            </article>
            <article className="panel data-card">
              <p className="detail-kicker">Participant scoped</p>
              <h3>Match data uses participant helper checks</h3>
              <p className="route-text">
                Match suggestions, grants, requests, reports, and audit events are checked through
                owner, counterparty, or participant predicates instead of public reads.
              </p>
            </article>
            <article className="panel data-card">
              <p className="detail-kicker">Sensitive text</p>
              <h3>Ciphertext columns are part of the contract</h3>
              <p className="route-text">
                Wish bodies, exact profile notes, source notes, connector consent notes, and
                synthesis summaries require encrypted storage slots and encryption-version columns.
              </p>
            </article>
          </div>
        </section>

        <section className="section section-subtle" aria-labelledby="ai-shadow-contract-heading">
          <div className="section-head">
            <p className="eyebrow">AI shadow mode</p>
            <h2 id="ai-shadow-contract-heading">
              Optional AI assistance must earn trust before it can affect matching.
            </h2>
            <p>
              The next AI layer is shadow-only: it can test approved, redacted source summaries
              from consenting users, but it cannot create live match suggestions, disclose private
              details, contact counterparties, change ranking, or store raw source content.
            </p>
          </div>

          <div className="protocol-validator-card panel">
            <div>
              <p className="detail-kicker">Shadow contract</p>
              <div className="protocol-workflow-card-head">
                <h3>{aiShadowValidation.status}</h3>
                <StatusBadge tone={aiShadowValidation.status === "pass" ? "default" : "warning"}>
                  {aiShadowValidation.status}
                </StatusBadge>
              </div>
              <p>
                {aiShadowValidation.checks.length} contract check(s),{" "}
                {aiShadowValidation.blockers.length} blocker(s), use{" "}
                {aiShadowContract.allowedUse.replaceAll("_", " ")}.
              </p>
            </div>
            <div className="hero-actions">
              <Link className="button button-primary" href="/api/moral-trade/ai-shadow/contract">
                Open shadow contract
              </Link>
              <Link className="button button-secondary" href="/privacy">
                Source permissions
              </Link>
            </div>
          </div>

          <div className="protocol-review-grid">
            <article className="panel data-card">
              <h3>Approved inputs only</h3>
              <ul className="clean-list">
                {aiShadowContract.requiredSourceFields.map((field) => (
                  <li key={field}>{formatMatchSignalToken(String(field))}</li>
                ))}
              </ul>
            </article>
            <article className="panel data-card">
              <h3>Prohibited effects</h3>
              <ul className="clean-list">
                {aiShadowContract.prohibitedEffects.slice(0, 5).map((effect) => (
                  <li key={effect}>{formatMatchSignalToken(effect)}</li>
                ))}
              </ul>
            </article>
            <article className="panel data-card">
              <h3>Sample redaction</h3>
              <p className="route-text">
                {aiShadowContract.sampleReadyEvaluation.redactedApprovedSummary}
              </p>
              <p className="panel-note">
                Blocked sample reasons:{" "}
                {aiShadowContract.sampleBlockedEvaluation.blockedReasons.join("; ")}.
              </p>
            </article>
          </div>
        </section>

        <section className="section section-white">
          <div className="section-head">
            <p className="eyebrow">Privacy controls</p>
            <h2>What the current pilot stores and how it is bounded</h2>
            <p>
              The signed-in dashboard now exposes the background-networking data map, active
              grants, notification channel choices, local drafts, local transparency receipts, and
              data-right requests.
            </p>
          </div>

          <div className="data-grid">
            {BACKGROUND_DATA_INVENTORY.map((item) => (
              <article className="panel data-card" key={item.surface}>
                <p className="detail-kicker">{item.classification}</p>
                <h3>{item.label}</h3>
                <p className="route-text">{item.use}</p>
                <p className="route-text">
                  <strong>Retention:</strong> {item.retention}
                </p>
                <p className="route-text">
                  <strong>Control:</strong> {item.control}
                </p>
              </article>
            ))}
          </div>

          <div className="panel data-card data-card-wide">
            <p className="detail-kicker">Source connector boundary</p>
            <h3>External sources require explicit, revocable field permissions</h3>
            <p className="route-text">
              Connect a source only to produce a private summary for matching. Moral Trade does
              not search the raw source continuously, contact anyone from it, or copy raw content
              into analytics. Participants can review a summary before saving, limit which fields
              it may influence, and revoke access at any time.
            </p>
            <p className="route-text">
              Raw connector ingestion remains disabled. Active external connections require
              consent notes, a supported retention window (
              {BACKGROUND_SOURCE_RETENTION_DAY_OPTIONS.join(", ")} days), and at least one broad
              field permission.
            </p>
            <ul className="compact-list">
              {BACKGROUND_SOURCE_PERMISSION_FIELD_OPTIONS.map((option) => (
                <li key={option.value}>
                  <strong>{option.label}:</strong> {option.description}
                </li>
              ))}
            </ul>
          </div>

          <div className="panel data-card data-card-wide">
            <p className="detail-kicker">Deletion scope</p>
            <h3>Participants can remove the background layer without erasing the whole account</h3>
            <p className="route-text">
              The dashboard self-serve flow requires the exact confirmation phrase{" "}
              <strong>{BACKGROUND_SELF_SERVE_DELETION_CONFIRMATION}</strong>, then removes
              private wishes, broad previews, source summaries, saved searches, grants,
              suggestions, notifications, helper records, and introduction artifacts tied to
              background networking. Safety and operator audit rows stay only as redacted or
              anonymized records when review integrity requires retention.
            </p>
            <ul className="compact-list">
              {BACKGROUND_SELF_SERVE_DELETION_SURFACES.map((surface) => (
                <li key={surface}>{surface}</li>
              ))}
            </ul>
            <div className="hero-actions">
              <Link className="button button-primary" href={viewer ? "/dashboard" : "/login?returnTo=/dashboard"}>
                Open deletion controls
              </Link>
              <Link className="button button-secondary" href="/privacy">
                Privacy and retention
              </Link>
            </div>
          </div>
        </section>

        <section className="section section-subtle" id="concierge-intake">
          <div className="section-head">
            <p className="eyebrow">Concierge intake</p>
            <h2>Turn a broad preview into a reviewed introduction request</h2>
            <p>
              This request goes to an operator queue first. It records intent, proposed trade
              shape, privacy constraints, and an SLA before anyone receives contact details or
              exact wishes. Declined or closed concierge decisions can be appealed from the
              dashboard for a second operator review.
            </p>
          </div>

          {viewer ? (
            <form action={createMatchConciergeRequestAction} className="panel stack-form">
              <input name="return_to" type="hidden" value="/background-networking" />
              <div className="field-grid">
                <label className="field">
                  <span>Route</span>
                  <select name="route" defaultValue="private_match">
                    <option value="private_match">Private counterparty search</option>
                    <option value="pledge_swap">Bounded pledge swap</option>
                    <option value="donation_offset">Donation offset</option>
                    <option value="mpgf">Moral public-good cycle</option>
                    <option value="other">Other reviewed request</option>
                  </select>
                </label>
                <label className="field">
                  <span>Cause areas</span>
                  <input
                    name="cause_areas_json"
                    placeholder="Animal welfare, global poverty, public health"
                  />
                </label>
              </div>
              <label className="field">
                <span>Structured intent</span>
                <textarea
                  name="intent_summary"
                  placeholder="What introduction would help you decide whether a real trade is possible?"
                  required
                  rows={4}
                />
              </label>
              <div className="field-grid">
                <label className="field">
                  <span>What you can offer</span>
                  <textarea
                    name="offer_summary"
                    placeholder="Pledge, donation redirect, expertise, institutional access, or another bounded action."
                    rows={3}
                  />
                </label>
                <label className="field">
                  <span>What you are asking for</span>
                  <textarea
                    name="ask_summary"
                    placeholder="The counterparty action, evidence, or conversation you want."
                    rows={3}
                  />
                </label>
              </div>
              <div className="field-grid">
                <label className="field">
                  <span>Privacy and safety constraints</span>
                  <textarea
                    name="constraints"
                    placeholder="What should not be disclosed yet? What would make the intro unsafe or premature?"
                    rows={3}
                  />
                </label>
                <label className="field">
                  <span>Timeline</span>
                  <input name="desired_timeline" placeholder="e.g. Review within a week" />
                </label>
              </div>
              <button className="button button-primary" type="submit">
                Request concierge review
              </button>
            </form>
          ) : (
            <div className="empty-state">
              <div>
                <strong>Sign in to request concierge review.</strong>
                <p>
                  The operator queue needs an accountable requester before it can triage an
                  introduction.
                </p>
              </div>
              <Link className="button button-primary" href="/signup?returnTo=/background-networking">
                Create account
              </Link>
            </div>
          )}
        </section>

        <section className="section section-subtle">
          <div className="section-head">
            <p className="eyebrow">Safety posture</p>
            <h2>Background networking is not a private-feed automation product</h2>
            <p>
              Moral trade needs trust and permission. The matching layer is therefore designed to
              reduce search costs without creating pressure, doxxing risk, harassment, or surprise
              exposure of sensitive values.
            </p>
          </div>

          <div className="editorial-grid">
            <article className="panel editorial-card">
              <h3>What can be public</h3>
              <p>
                Broad cause areas, public offers, and voluntarily written previews can help people
                discover overlap without revealing exact asks or bargaining constraints.
              </p>
            </article>
            <article className="panel editorial-card">
              <h3>What stays private</h3>
              <p>
                Exact wishes, sensitive evidence, contact information, and negotiation details are
                private unless the relevant parties choose to disclose them through the dashboard.
              </p>
            </article>
            <article className="panel editorial-card">
              <h3>What is not automated</h3>
              <p>
                The prototype does not perform autonomous outreach, mass scraping, or dark-pattern
                matching. It records possible introductions for human review.
              </p>
            </article>
          </div>
        </section>

        <section className="section section-white">
          <div className="section-head">
            <p className="eyebrow">Where to use it</p>
            <h2>The dashboard is the working surface</h2>
            <p>
              Signed-in members can create a wish profile, save search constraints, add manual
              source notes, export their profile data, and review suggestions from one place.
            </p>
            <div className="hero-actions">
              <Link className="button button-primary" href={viewer ? "/dashboard" : "/signup"}>
                {viewer ? "Open dashboard" : "Create account"}
              </Link>
              <Link className="button button-secondary" href="/privacy">
                Review privacy rules
              </Link>
              <Link className="button button-secondary" href="/safety">
                Review safety rules
              </Link>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
