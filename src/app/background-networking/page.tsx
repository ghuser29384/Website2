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
  getBackgroundPhaseStatusForDocs,
  validateBackgroundPhaseGateBundle,
} from "@/lib/background-phase-gates";
import {
  buildBackgroundParticipantScreenState,
  getBackgroundPlainLanguageTerm,
  getBackgroundUiCopyBundle,
  validateBackgroundUiLanguageContract,
} from "@/lib/background-ui-language";
import {
  getBackgroundNetworkingRolloutPlan,
  validateBackgroundNetworkingRolloutPlan,
} from "@/lib/background-rollout";
import {
  getBackgroundRlsAuditContract,
  validateBackgroundRlsAuditContract,
} from "@/lib/background-rls-audit";
import {
  BACKGROUND_PUBLIC_BACKGROUND_HERO,
  BACKGROUND_PUBLIC_MENTAL_MODEL_STEPS,
  BACKGROUND_PUBLIC_NOT_THIS,
  BACKGROUND_PUBLIC_PILOT_STATUS,
  BACKGROUND_PUBLIC_PROMISE,
  BACKGROUND_PUBLIC_SAFETY_CARDS,
  BACKGROUND_PUBLIC_TECHNICAL_LINKS,
  validateBackgroundPublicPageSimplificationSpec,
} from "@/lib/background-public-pages";
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
    "Find possible trades by comparing broad previews first, with exact details shared only through consent.",
  alternates: {
    canonical: "/background-networking",
  },
  openGraph: {
    title: "Background networking",
    description:
      "Find possible trades by comparing broad previews first, with exact details shared only through consent.",
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
  const backgroundRolloutPlan = getBackgroundNetworkingRolloutPlan();
  const backgroundRolloutValidation =
    validateBackgroundNetworkingRolloutPlan(backgroundRolloutPlan);
  const backgroundPhaseStatus = getBackgroundPhaseStatusForDocs();
  const backgroundPhaseValidation = validateBackgroundPhaseGateBundle();
  const uiCopyBundle = getBackgroundUiCopyBundle();
  const uiLanguageValidation = validateBackgroundUiLanguageContract();
  const publicPageSimplificationValidation =
    validateBackgroundPublicPageSimplificationSpec();
  const participantSetupState = buildBackgroundParticipantScreenState({
    actionKey: "find_opportunities_for_me",
    defaultExplanation:
      "Use the simple path to choose inputs, search scope, preview audience, cadence, and expiry before any background helper can act.",
    screenKey: "background-networking.public-setup-model",
    statusInput: { enabled: true, queuedOrWaiting: true },
    technicalDetails: {
      broadSignalCategories: ["cause areas", "trade modes", "verification preferences"],
      outputSchemaVersion: "background-participant-screen-state-bg84-v1",
      purposeCode: "moral_trade_offer",
      retentionWindow: "phase-bounded participant receipts",
    },
    whySeeingThis:
      "This public explainer mirrors the participant control center copy without exposing any live account or match state.",
  });
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
            <h1>{BACKGROUND_PUBLIC_BACKGROUND_HERO}</h1>
            <p className="hero-text">{BACKGROUND_PUBLIC_PROMISE}</p>
            <div className="hero-actions">
              <Link className="button button-primary" href={viewer ? "/dashboard" : "/signup"}>
                {viewer ? "Open dashboard" : "Create account"}
              </Link>
              <Link className="button button-secondary" href="/wish-registry">
                Browse broad previews
              </Link>
              <Link className="button button-secondary" href="#background-technical-details">
                Technical details
              </Link>
            </div>
          </section>

          <aside className="hero-panel panel">
            <p className="eyebrow">Simple path</p>
            <div className="flow-card">
              {BACKGROUND_PUBLIC_MENTAL_MODEL_STEPS.slice(0, 3).map((step, index) => (
                <div className="flow-step" key={step}>
                  <span className="flow-number">{String(index + 1).padStart(2, "0")}</span>
                  <div>
                    <strong>{step}</strong>
                    <p>
                      {index === 0
                        ? "Start with broad profile fields instead of exact asks."
                        : index === 1
                          ? "Choose the audience and review route before anyone sees more."
                          : "Review a safe possible-opportunity card in your dashboard."}
                    </p>
                  </div>
                </div>
              ))}
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

        <section className="section section-white" aria-labelledby="background-simple-model-heading">
          <div className="section-head">
            <p className="eyebrow">How it works</p>
            <h2 id="background-simple-model-heading">
              One review path from broad profile to optional detail sharing
            </h2>
            <p>{BACKGROUND_PUBLIC_PROMISE}</p>
          </div>

          <div className="concept-grid">
            {BACKGROUND_PUBLIC_SAFETY_CARDS.map((card) => (
              <article className="panel concept-card" key={card.title}>
                <h3>{card.title}</h3>
                <p>{card.body}</p>
              </article>
            ))}
          </div>

          <div className="protocol-review-grid">
            <article className="panel data-card data-card-wide">
              <h3>Five steps</h3>
              <div className="mini-list">
                {BACKGROUND_PUBLIC_MENTAL_MODEL_STEPS.map((step, index) => (
                  <div className="mini-list-item" key={step}>
                    <strong>{String(index + 1).padStart(2, "0")}</strong>
                    <span>{step}</span>
                  </div>
                ))}
              </div>
            </article>
            <article className="panel data-card data-card-wide">
              <h3>What this is not</h3>
              <ul className="compact-list">
                {BACKGROUND_PUBLIC_NOT_THIS.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </article>
          </div>
        </section>

        <section className="section section-subtle" aria-labelledby="background-pilot-status-heading">
          <div className="section-head">
            <p className="eyebrow">Current pilot status</p>
            <h2 id="background-pilot-status-heading">Conservative by default</h2>
            <p>
              The live pilot supports broad profiles, saved preferences, review queues, and
              consent-gated next steps. Higher-power lanes stay staff-only, shadow-only, or off.
            </p>
          </div>
          <div className="data-grid">
            {BACKGROUND_PUBLIC_PILOT_STATUS.map((item) => (
              <article className="panel data-card" key={item.label}>
                <h3>{item.label}</h3>
                <p className="route-text">{item.body}</p>
              </article>
            ))}
          </div>
        </section>

        <details
          className="section section-white details-panel"
          id="background-technical-details"
        >
          <summary>Technical details</summary>
          <div className="details-content">
            <p className="panel-note">
              This section keeps contracts, route health, bundle hashes, factor-code samples,
              validator results, table protections, and detailed policy mechanics inspectable
              without making them the default public reading path.
            </p>
            <div className="hero-actions">
              {BACKGROUND_PUBLIC_TECHNICAL_LINKS.map((link) => (
                <Link className="button button-secondary" href={link.href} key={link.href}>
                  {link.label}
                </Link>
              ))}
            </div>

        <section className="section section-white" aria-labelledby="plain-language-setup-heading">
          <div className="section-head">
            <p className="eyebrow">Participant setup model</p>
            <h2 id="plain-language-setup-heading">Six questions cover the consent model.</h2>
            <p>
              The participant-facing copy uses plain action labels first, then keeps exact technical
              terms in optional details. The simplified labels preserve the same privacy, expiry,
              audience, and revocation boundaries as the governed background-networking system.
            </p>
          </div>

          <div className="protocol-validator-card panel">
            <div>
              <p className="detail-kicker">UI copy bundle</p>
              <div className="protocol-workflow-card-head">
                <h3>{uiLanguageValidation.status}</h3>
                <StatusBadge
                  tone={uiLanguageValidation.status === "pass" ? "default" : "warning"}
                >
                  {uiLanguageValidation.status}
                </StatusBadge>
              </div>
              <p>
                {uiCopyBundle.termMap.length} term-map entries,{" "}
                {uiCopyBundle.setupQuestions.length} setup questions, and{" "}
                {uiCopyBundle.privacySummaries.length} privacy-summary templates are bound to the
                current UI-copy bundle.
              </p>
              <p className="panel-note">
                Public-page simplification contract: {publicPageSimplificationValidation.status};
                hash {publicPageSimplificationValidation.hash.slice(0, 12)}.
              </p>
            </div>
            <div className="tag-row">
              {[
                "delegate authorization",
                "candidate exposure",
                "opportunity brief",
                "intro request",
                "disclosure grant",
                "privacy freeze",
              ].map((term) => {
                const copy = getBackgroundPlainLanguageTerm(term);

                return copy ? (
                  <span className="source-pill" key={term}>
                    {copy.participantLabel}
                  </span>
                ) : null;
              })}
            </div>
          </div>

          <div className="protocol-review-grid">
            <article className="panel data-card">
              <p className="detail-kicker">{participantSetupState.statusLabel}</p>
              <h3>{participantSetupState.actionLabel}</h3>
              <p className="route-text">{participantSetupState.defaultExplanation}</p>
              <div className="mini-list">
                {participantSetupState.setupQuestions.map((question) => (
                  <div className="mini-list-item" key={question.key}>
                    <strong>{question.label}</strong>
                    <span>{question.plainDescription}</span>
                  </div>
                ))}
              </div>
            </article>

            <article className="panel data-card">
              <p className="detail-kicker">Privacy summary</p>
              <h3>{participantSetupState.privacySummary.heading}</h3>
              <dl className="values-summary compact-summary">
                <div>
                  <dt>What happens</dt>
                  <dd>{participantSetupState.privacySummary.whatHappens}</dd>
                </div>
                <div>
                  <dt>What stays hidden</dt>
                  <dd>{participantSetupState.privacySummary.whatStaysHidden}</dd>
                </div>
                <div>
                  <dt>How to stop or undo future access</dt>
                  <dd>{participantSetupState.privacySummary.howToStopOrUndo}</dd>
                </div>
              </dl>
            </article>

            <article className="panel data-card">
              <p className="detail-kicker">Progressive detail</p>
              <h3>Why am I seeing this?</h3>
              <p className="route-text">{participantSetupState.whySeeingThis}</p>
              <details className="details-panel">
                <summary>{participantSetupState.technicalDetails.title}</summary>
                <div className="details-content">
                  <dl className="values-summary compact-summary">
                    {participantSetupState.technicalDetails.rows.map((row) => (
                      <div key={row.label}>
                        <dt>{row.label}</dt>
                        <dd>{row.value}</dd>
                      </div>
                    ))}
                  </dl>
                </div>
              </details>
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
              <h3>{matchSignalContract.sampleSignal.participantExplanation.headline}</h3>
              <p className="route-text">
                {matchSignalContract.sampleSignal.participantExplanation.summary}
              </p>
              <div className="review-factor-list" aria-label="Sample match factor codes">
                {matchSignalContract.sampleSignal.factorCodes.map((factorCode) => (
                  <span key={factorCode}>{factorCode}</span>
                ))}
              </div>
              <p className="panel-note">
                {matchSignalContract.sampleSignal.participantExplanation.redactionNotice}
              </p>
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
              Private-overlap checks are currently a disabled design lane; the route returns a
              generic unavailable response and does not accept live free text, raw tags, or tag
              lookups.
            </p>
            <p>
              The current source-summary path is manual/import first: participants create a source
              connection, draft a redacted summary from user-provided material, approve the summary,
              then recompute only viewer-owned profile signals. The bg16 route aliases are
              published for this path as <code>/api/background/source-connections/:id/summary-draft</code>,
              <code>/api/background/source-connections/:id/approve</code>, and{" "}
              <code>/api/background/profile/recompute</code>.
            </p>
            <p>
              The bg17 route surface adds <code>/api/background/sources</code>,{" "}
              <code>/api/background/sources/:id/draft-summary</code>,{" "}
              <code>/api/background/wish-dialogue/:id/proposal</code>,{" "}
              <code>/api/background/helper-runs</code>, and{" "}
              <code>/api/background/private-overlap/check</code>. These routes remain
              authenticated, private, rate-limited, and consent-gated.
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
              <Link
                className="button button-secondary"
                href="/api/moral-trade/private-overlap/contract"
              >
                Private overlap contract
              </Link>
            </div>
          </div>

          <div className="protocol-validator-card panel">
            <div>
              <p className="detail-kicker">Bg14 rollout</p>
              <div className="protocol-workflow-card-head">
                <h3>{backgroundRolloutPlan.stage.replaceAll("_", " ")}</h3>
                <StatusBadge
                  tone={backgroundRolloutValidation.status === "pass" ? "default" : "warning"}
                >
                  {backgroundRolloutValidation.status}
                </StatusBadge>
              </div>
              <p>{backgroundRolloutPlan.deploymentNote.summary}</p>
              <p className="panel-note">Rollback: {backgroundRolloutPlan.rollbackPlan.summary}</p>
            </div>
            <div className="tag-row">
              {backgroundRolloutPlan.flags.map((flag) => (
                <span className="source-pill" key={flag.key}>
                  {flag.key}: {flag.enabled ? "enabled" : "off"}
                </span>
              ))}
            </div>
          </div>

          <div className="protocol-validator-card panel">
            <div>
              <p className="detail-kicker">Current phase artifact</p>
              <div className="protocol-workflow-card-head">
                <h3>{backgroundPhaseStatus.currentPhase.replaceAll("_", " ")}</h3>
                <StatusBadge
                  tone={backgroundPhaseValidation.status === "pass" ? "default" : "warning"}
                >
                  {backgroundPhaseValidation.status}
                </StatusBadge>
              </div>
              <p>
                The active release manifest binds this phase, the policy engine, action-kind
                registry, schema bundle, signal taxonomy, claim-assurance taxonomy,
                tool-capability bundle, retention bundle, composition bundle, transition bundle,
                UI-copy bundle, and phase-gate hash before background routes can mutate state.
                Phase 2 includes
                privacy freeze and sanitized participant export controls; future partner,
                federation, vault, exact-disclosure, high-sensitivity, and private-overlap lanes
                remain unavailable.
              </p>
              <p className="panel-note">
                Manifest {backgroundPhaseStatus.manifestId}; phase gate{" "}
                {backgroundPhaseStatus.phaseGateBundleVersion}; output schema{" "}
                {backgroundPhaseStatus.outputSchemaBundleVersion}; signal taxonomy{" "}
                {backgroundPhaseStatus.signalTaxonomyVersion}; claim assurance{" "}
                {backgroundPhaseStatus.claimAssuranceTaxonomyVersion}; tool capability{" "}
                {backgroundPhaseStatus.toolCapabilityBundleVersion}; UI copy{" "}
                {backgroundPhaseStatus.uiCopyBundleVersion}.
              </p>
              <p className="panel-note">
                Background-networking data is not training, personalization, ad targeting,
                engagement optimization, or product-analytics feature-learning data. Exports use a
                sanitized participant-owned schema and fail closed while a privacy freeze is active.
              </p>
            </div>
            <div className="tag-row">
              {backgroundPhaseStatus.disabledLanes.slice(0, 8).map((lane) => (
                <span className="source-pill" key={lane}>
                  {lane.replaceAll("_", " ")}: unavailable
                </span>
              ))}
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
              Raw connector ingestion remains disabled. The manual/import source summary lane
              supports a review card before approval, a permission table for revoke/renewal, and
              active external connections require consent notes, a supported retention window (
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
          </div>
        </details>

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
              <label className="field">
                <span>No-trade baseline</span>
                <textarea
                  name="no_trade_baseline"
                  placeholder="What happens if no trade or introduction occurs?"
                  required
                  rows={3}
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

        <section className="section section-white" aria-labelledby="cohort-packs-heading">
          <div className="section-head">
            <p className="eyebrow">Cohort pilot packs</p>
            <h2 id="cohort-packs-heading">Start with specific communities before broad rollout</h2>
            <p>
              Background networking should prove itself in reviewed niches before making wider
              discovery claims. Pilot packs give operators a narrow audience, a clear matchmaker
              role, and a weekly funnel to inspect.
            </p>
          </div>

          <div className="editorial-grid">
            <article className="panel editorial-card">
              <h3>Donor circles</h3>
              <p>
                Use broad cause previews, donation-route constraints, and reviewed introduction
                requests to find reciprocal pledge or donation-offset conversations.
              </p>
            </article>
            <article className="panel editorial-card">
              <h3>Reading groups</h3>
              <p>
                Let a facilitator collect private wish profiles, review opportunity briefs, and
                decide which broad previews merit consent-gated follow-up.
              </p>
            </article>
            <article className="panel editorial-card">
              <h3>Organization cohorts</h3>
              <p>
                Keep outreach inside partner-approved boundaries while operators track brief opens,
                intro requests, and declined-match reasons.
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
