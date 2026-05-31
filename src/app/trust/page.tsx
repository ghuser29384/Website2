import type { Metadata } from "next";
import Link from "next/link";

import { SiteFooter } from "@/components/layout/site-footer";
import { SiteTopbar } from "@/components/layout/site-topbar";
import { StatusBadge } from "@/components/ui/page-primitives";
import { getViewer } from "@/lib/app-data";
import {
  getMoralTradeChallengeAppealContract,
  validateMoralTradeChallengeAppealContract,
} from "@/lib/moral-trade/challenge-appeal";
import {
  getMoralTradeDisclosureContract,
  validateMoralTradeDisclosureContract,
} from "@/lib/moral-trade/disclosure";
import {
  getMoralTradeExternalityProfile,
  validateMoralTradeExternalityProfile,
} from "@/lib/moral-trade/externality";
import {
  getMoralTradeIncidentResponseProfile,
  validateMoralTradeIncidentResponseProfile,
} from "@/lib/moral-trade/incident-response";
import { getAbsoluteUrl } from "@/lib/seo";
import { getPrimaryNavLinks, getTopbarActions } from "@/lib/site";

export const metadata: Metadata = {
  title: "What You Can Rely On",
  description:
    "A plain-language trust explainer for Moral Trade: prototype guarantees, review states, non-guarantees, and recourse routes.",
  alternates: {
    canonical: "/trust",
  },
  openGraph: {
    title: "What you can rely on today",
    description:
      "Understand Moral Trade's current prototype guarantees, non-guarantees, review states, and recourse routes.",
    url: getAbsoluteUrl("/trust"),
    type: "website",
  },
};

const reviewStates = [
  {
    title: "Worked example",
    detail:
      "Illustrative terms only. It can be cloned, but nobody should rely on it as an active agreement.",
  },
  {
    title: "Draft proposal",
    detail:
      "A participant-stated proposal that still needs baseline, evidence, safety, and counterparty review.",
  },
  {
    title: "Evidence submitted",
    detail:
      "Receipts, logs, attestations, or public statements have been named for reviewer inspection.",
  },
  {
    title: "Reviewed record",
    detail:
      "A reviewer has checked the named scope, conflicts, proof uniqueness, and challenge window.",
  },
] as const;

function formatTrustToken(value: string) {
  return value.replaceAll("_", " ");
}

export default async function TrustPage() {
  const viewer = await getViewer();
  const challengeAppealContract = getMoralTradeChallengeAppealContract();
  const challengeAppealValidation =
    validateMoralTradeChallengeAppealContract(challengeAppealContract);
  const disclosureContract = getMoralTradeDisclosureContract();
  const disclosureValidation = validateMoralTradeDisclosureContract(disclosureContract);
  const externalityProfile = getMoralTradeExternalityProfile();
  const externalityValidation = validateMoralTradeExternalityProfile(externalityProfile);
  const incidentResponseProfile = getMoralTradeIncidentResponseProfile();
  const incidentResponseValidation =
    validateMoralTradeIncidentResponseProfile(incidentResponseProfile);
  const recourseRoutes = [
    {
      title: "Challenge reviewed evidence or baseline",
      href: "/api/moral-trade/challenge-appeal/contract",
      status: challengeAppealValidation.status,
      detail: `Appeals cover ${challengeAppealContract.subjects.length} reviewed subject types, ${challengeAppealContract.standingCategories.length} standing categories, and ${challengeAppealContract.allowedOutcomes.length} human-reviewed outcomes.`,
      chips: challengeAppealContract.appealTriggers.slice(0, 4),
      action: "View appeal contract",
    },
    {
      title: "Request disclosure review",
      href: "/api/moral-trade/disclosure/contract",
      status: disclosureValidation.status,
      detail: `Disclosure grants cover ${disclosureContract.disclosureFields.length} field types across ${disclosureContract.audienceStages.length} audience stages, with raw source notes and contact details redacted by default.`,
      chips: disclosureContract.searchPrivacyControls.map((control) => control.key).slice(0, 4),
      action: "View disclosure contract",
    },
    {
      title: "Request externality remedy",
      href: "/api/moral-trade/externality/health",
      status: externalityValidation.status,
      detail: `Externality review names ${externalityProfile.triggerCodes.length} trigger codes, ${externalityProfile.reviewStandards.length} review standards, and ${externalityProfile.remedyControls.length} remedy controls before reliance.`,
      chips: externalityProfile.remedyControls.map((control) => control.key),
      action: "View externality health",
    },
    {
      title: "Report safety or privacy incident",
      href: "/api/moral-trade/incident-response/health",
      status: incidentResponseValidation.status,
      detail: `Incident response covers ${incidentResponseProfile.incidentCategories.length} incident categories and ${incidentResponseProfile.severityLevels.length} severity levels, with public summaries kept aggregate and redacted.`,
      chips: incidentResponseProfile.intakeChannels.map((channel) => channel.key).slice(0, 4),
      action: "View incident response",
    },
  ] as const;

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
            <p className="eyebrow">Trust explainer</p>
            <h1>What you can rely on today.</h1>
            <p className="hero-text">
              Moral Trade makes proposal terms, evidence expectations, safety boundaries, and
              review status legible. It does not make moral rankings, hold funds, automate
              outreach, or promise legal enforceability.
            </p>
            <div className="hero-actions">
              <Link className="button button-primary" href="/safety">
                Review safety policy
              </Link>
              <Link className="button button-secondary" href="/contact">
                Contact operators
              </Link>
            </div>
          </section>

          <aside className="hero-panel panel">
            <p className="eyebrow">Trust split</p>
            <div className="flow-card">
              <div className="flow-step">
                <span className="flow-number">01</span>
                <div>
                  <strong>Action evidence</strong>
                  <p>Did someone do what they said? Look for receipts, logs, attestations, or records.</p>
                </div>
              </div>
              <div className="flow-step">
                <span className="flow-number">02</span>
                <div>
                  <strong>Baseline confidence</strong>
                  <p>Would they have done it anyway? This stays separate from factual proof.</p>
                </div>
              </div>
              <div className="flow-step">
                <span className="flow-number">03</span>
                <div>
                  <strong>Externality review</strong>
                  <p>Who might object, and could the trade harm values not represented by the parties?</p>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </header>

      <main id="main-content" tabIndex={-1}>
        <section className="section section-white">
          <div className="section-head">
            <p className="eyebrow">Guarantees</p>
            <h2>Current public commitments</h2>
            <p>
              These are the operational claims the site is designed to support in the current
              pilot phase.
            </p>
          </div>

          <div className="data-grid">
            <article className="panel data-card">
              <h3>Boundaries are explicit</h3>
              <p className="route-text">
                Public pages must state no escrow, no custody, no legal advice, no tax advice, and
                no hidden automation where those boundaries matter.
              </p>
            </article>
            <article className="panel data-card">
              <h3>Examples are labeled</h3>
              <p className="route-text">
                Worked examples are separated from live proposals so visitors can learn the format
                without mistaking examples for liquidity.
              </p>
            </article>
            <article className="panel data-card">
              <h3>Threats are rejected</h3>
              <p className="route-text">
                Baseline integrity rules reject pay-me-or-I-will-do-harm offers and compensation
                for stopping newly escalated harmful behavior.
              </p>
            </article>
          </div>
        </section>

        <section className="section section-subtle">
          <div className="section-head">
            <p className="eyebrow">Review states</p>
            <h2>How to read proposal status</h2>
          </div>

          <div className="data-grid">
            {reviewStates.map((state) => (
              <article className="panel data-card" key={state.title}>
                <h3>{state.title}</h3>
                <p className="route-text">{state.detail}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="section section-white" aria-labelledby="recourse-heading">
          <div className="section-head">
            <p className="eyebrow">Recourse</p>
            <h2 id="recourse-heading">When something looks wrong</h2>
            <p>
              Challenges, privacy complaints, third-party harms, and safety incidents should enter
              scoped review lanes. These routes do not mutate live proposal state by themselves;
              they publish what humans need to review.
            </p>
          </div>

          <div className="data-grid">
            {recourseRoutes.map((route) => (
              <article className="panel data-card" key={route.title}>
                <div className="protocol-workflow-card-head">
                  <h3>{route.title}</h3>
                  <StatusBadge tone={route.status === "pass" ? "default" : "warning"}>
                    {route.status}
                  </StatusBadge>
                </div>
                <p className="route-text">{route.detail}</p>
                <div className="protocol-factor-list" aria-label={`${route.title} codes`}>
                  {route.chips.map((chip) => (
                    <span key={chip}>{formatTrustToken(chip)}</span>
                  ))}
                </div>
                <Link className="text-button" href={route.href}>
                  {route.action}
                </Link>
              </article>
            ))}
          </div>
        </section>

        <section className="section section-white">
          <div className="section-head">
            <p className="eyebrow">Non-guarantees</p>
            <h2>What the site does not currently promise</h2>
          </div>

          <div className="panel data-card data-card-wide">
            <ul className="compact-list">
              <li>No objective platform ranking of moral value.</li>
              <li>No custody, escrow, tax, legal, investment, or payment-protection service.</li>
              <li>No autonomous scraping, private-feed mining, or surprise counterparty exposure.</li>
              <li>No claim that bilateral gains eliminate third-party moral externalities.</li>
              <li>No claim that live marketplace liquidity already exists.</li>
            </ul>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
