import type { Metadata } from "next";
import Link from "next/link";

import { SiteFooter } from "@/components/layout/site-footer";
import { SiteTopbar } from "@/components/layout/site-topbar";
import { StatusBadge } from "@/components/ui/page-primitives";
import { getMarketplaceOverview, getViewer } from "@/lib/app-data";
import {
  auditMoralTradeApiImplementationContract,
  getMoralTradeApiContractProfile,
  validateMoralTradeApiContractProfile,
} from "@/lib/moral-trade/api-contract";
import { validateMoralTradeAiGovernanceProfile } from "@/lib/moral-trade/ai-governance";
import {
  getMoralTradeChallengeAppealContract,
  validateMoralTradeChallengeAppealContract,
} from "@/lib/moral-trade/challenge-appeal";
import { validateMoralTradeDataModelProfile } from "@/lib/moral-trade/data-model";
import {
  getMoralTradeDisclosureContract,
  validateMoralTradeDisclosureContract,
} from "@/lib/moral-trade/disclosure";
import { validateMoralTradeEvaluationProfile } from "@/lib/moral-trade/evaluation";
import { validateMoralTradeExternalityProfile } from "@/lib/moral-trade/externality";
import { validateMoralTradeIncidentResponseProfile } from "@/lib/moral-trade/incident-response";
import { validateMoralTradeOperationsProfile } from "@/lib/moral-trade/operations";
import {
  auditMoralTradeRouteRecoveryManifest,
  getMoralTradePerformanceProfile,
  validateMoralTradePerformanceProfile,
} from "@/lib/moral-trade/performance";
import { validateMoralTradeProvenanceContract } from "@/lib/moral-trade/provenance";
import {
  getMoralTradeReasoningPacketContract,
  getMoralTradeReasoningPackets,
  validateMoralTradeReasoningPacketContract,
} from "@/lib/moral-trade/reasoning-packets";
import { validateMoralTradeSecurityProfile } from "@/lib/moral-trade/security";
import { validateMoralTradeProtocolProfile } from "@/lib/moral-trade/protocol";
import {
  getMoralTradeTransparencyReportContract,
  validateMoralTradeTransparencyReportContract,
} from "@/lib/moral-trade/transparency-report";
import { CANONICAL_WORKED_CASE_COUNT } from "@/lib/seed-data";
import { buildBreadcrumbJsonLd, buildWebPageJsonLd, getAbsoluteUrl } from "@/lib/seo";
import { getPrimaryNavLinks, getTopbarActions } from "@/lib/site";

export const metadata: Metadata = {
  title: "Pilot Status",
  description:
    "Current Moral Trade pilot status: what is live, what is reviewed, what is not guaranteed, and what comes next.",
  alternates: {
    canonical: "/status",
  },
  openGraph: {
    title: "Moral Trade pilot status",
    description:
      "See what the Moral Trade pilot currently supports, what remains prototype-stage, and where to start.",
    url: getAbsoluteUrl("/status"),
    type: "website",
  },
};

function formatStatusCount(value: number | null) {
  return value === null ? "Pending" : new Intl.NumberFormat("en-US").format(value);
}

type ValidationSummary = {
  status: "pass" | "fail";
  checks?: readonly unknown[];
  blockers: readonly string[];
};

function summarizeValidationSurfaces(...surfaces: readonly ValidationSummary[]) {
  return {
    status: surfaces.every((surface) => surface.status === "pass") ? "pass" : "fail",
    checkCount: surfaces.reduce((total, surface) => total + (surface.checks?.length ?? 0), 0),
    blockerCount: surfaces.reduce((total, surface) => total + surface.blockers.length, 0),
  };
}

export default async function StatusPage() {
  const [viewer, overview] = await Promise.all([getViewer(), getMarketplaceOverview()]);
  const coreProtocolValidation = validateMoralTradeProtocolProfile();
  const dataModelValidation = validateMoralTradeDataModelProfile();
  const provenanceValidation = validateMoralTradeProvenanceContract();
  const reasoningPackets = getMoralTradeReasoningPackets();
  const reasoningPacketValidation = validateMoralTradeReasoningPacketContract(
    getMoralTradeReasoningPacketContract(reasoningPackets),
    reasoningPackets,
  );
  const operationsValidation = validateMoralTradeOperationsProfile();
  const securityValidation = validateMoralTradeSecurityProfile();
  const evaluationValidation = validateMoralTradeEvaluationProfile();
  const aiGovernanceValidation = validateMoralTradeAiGovernanceProfile();
  const disclosureValidation = validateMoralTradeDisclosureContract(
    getMoralTradeDisclosureContract(),
  );
  const challengeAppealValidation = validateMoralTradeChallengeAppealContract(
    getMoralTradeChallengeAppealContract(),
  );
  const externalityValidation = validateMoralTradeExternalityProfile();
  const incidentResponseValidation = validateMoralTradeIncidentResponseProfile();
  const performanceProfile = getMoralTradePerformanceProfile();
  const performanceValidation = validateMoralTradePerformanceProfile(performanceProfile);
  const routeRecoveryAudit = auditMoralTradeRouteRecoveryManifest({
    profile: performanceProfile,
  });
  const apiContractProfile = getMoralTradeApiContractProfile();
  const apiContractValidation = validateMoralTradeApiContractProfile(apiContractProfile);
  const apiImplementationAudit = auditMoralTradeApiImplementationContract(apiContractProfile);
  const transparencyReportValidation = validateMoralTradeTransparencyReportContract(
    getMoralTradeTransparencyReportContract(),
  );
  const protocolHealthSurfaces = [
    {
      label: "Core protocol and data model",
      href: "/api/moral-trade/health",
      summary:
        "Required fields, statuses, factor codes, transition rules, privacy classes, and relationship boundaries.",
      ...summarizeValidationSurfaces(coreProtocolValidation, dataModelValidation),
    },
    {
      label: "Evidence provenance",
      href: "/api/moral-trade/provenance/schema",
      summary:
        "Evidence artifacts, claims, reviewer decisions, traceability events, agents, and append-only persistence tables.",
      ...summarizeValidationSurfaces(provenanceValidation),
    },
    {
      label: "Reasoning Center packets",
      href: "/api/moral-trade/reasoning/packets",
      summary:
        "Structured public packets, cited evidence rows, uncertainty flags, filters, and next human-controlled steps.",
      ...summarizeValidationSurfaces(reasoningPacketValidation),
    },
    {
      label: "API contract and implementation",
      href: "/api/moral-trade/api-contract",
      summary:
        "Public route schemas, cache controls, rate-limit surfaces, fallbacks, and implementation audit.",
      ...summarizeValidationSurfaces(apiContractValidation, apiImplementationAudit),
      checkCount: apiContractValidation.checks.length + apiImplementationAudit.routeCount,
    },
    {
      label: "Disclosure grants and appeals",
      href: "/api/moral-trade/disclosure/contract",
      summary:
        "Stage-bound disclosure grants, redacted fields, search privacy controls, appeal triggers, standing, and review outcomes.",
      ...summarizeValidationSurfaces(disclosureValidation, challengeAppealValidation),
    },
    {
      label: "Externality and remedy review",
      href: "/api/moral-trade/externality/health",
      summary:
        "Third-party impact triggers, due-diligence steps, affected-party standing, remediation controls, and review standards.",
      ...summarizeValidationSurfaces(externalityValidation),
    },
    {
      label: "Incident response",
      href: "/api/moral-trade/incident-response/health",
      summary:
        "Incident intake channels, severity levels, privacy-safe disclosure rules, readiness gates, and response-phase coverage.",
      ...summarizeValidationSurfaces(incidentResponseValidation),
    },
    {
      label: "Performance and route recovery",
      href: "/api/moral-trade/performance/health",
      summary:
        "Observed route friction, Core Web Vitals targets, route recovery manifest coverage, and privacy-safe telemetry limits.",
      ...summarizeValidationSurfaces(performanceValidation, routeRecoveryAudit),
    },
    {
      label: "Operations and security",
      href: "/api/moral-trade/operations/health",
      summary:
        "Security headers, private-cache controls, retention lifecycle, rate limits, security non-claims, and scale gates.",
      ...summarizeValidationSurfaces(operationsValidation, securityValidation),
    },
    {
      label: "Evaluation and AI governance",
      href: "/api/moral-trade/evaluation/health",
      summary:
        "Quality metrics, privacy-safe slices, promotion gates, model-card requirements, and prohibited automation.",
      ...summarizeValidationSurfaces(evaluationValidation, aiGovernanceValidation),
    },
    {
      label: "Transparency report",
      href: "/api/moral-trade/transparency/report",
      summary:
        "Aggregate-only review outcomes, disclosure grants, reports, appeals, median timing, SLA attainment, and small-sample suppression.",
      ...summarizeValidationSurfaces(transparencyReportValidation),
    },
  ] as const;
  const statusStructuredData = buildWebPageJsonLd({
    name: "Moral Trade pilot status",
    description:
      "Current Moral Trade pilot status: what is live, what is reviewed, what is not guaranteed, and what comes next.",
    path: "/status",
  });
  const breadcrumbStructuredData = buildBreadcrumbJsonLd([
    { href: "/status", label: "Pilot status" },
  ]);

  return (
    <div className="page-shell">
      <script
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(statusStructuredData),
        }}
        type="application/ld+json"
      />
      <script
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(breadcrumbStructuredData),
        }}
        type="application/ld+json"
      />
      <header className="hero">
        <SiteTopbar
          brandHref="/"
          links={getPrimaryNavLinks(Boolean(viewer))}
          {...getTopbarActions(Boolean(viewer))}
          showLogout={Boolean(viewer)}
        />

        <div className="hero-grid">
          <section className="hero-copy">
            <p className="eyebrow">Pilot status</p>
            <h1>What is real on Moral Trade today.</h1>
            <p className="hero-text">
              The public site is a reviewed pilot, not a liquid exchange. Its strongest current
              use is understanding the mechanism, cloning worked examples, joining a small cohort,
              and submitting reviewable proof artifacts.
            </p>
            <div className="hero-actions">
              <Link className="button button-primary" href="/worked-examples">
                Browse worked examples
              </Link>
              <Link className="button button-secondary" href="/trust">
                Read what you can rely on
              </Link>
            </div>
          </section>

          <aside className="hero-panel panel">
            <p className="eyebrow">Public snapshot</p>
            <dl className="profile-stats profile-stats-hero">
              <div>
                <dt>Live proposals</dt>
                <dd>{formatStatusCount(overview.openOfferCount)}</dd>
              </div>
              <div>
                <dt>Worked examples</dt>
                <dd>{CANONICAL_WORKED_CASE_COUNT}</dd>
              </div>
              <div>
                <dt>Public profiles</dt>
                <dd>{formatStatusCount(overview.publicProfileCount)}</dd>
              </div>
              <div>
                <dt>Completed agreements</dt>
                <dd>{formatStatusCount(overview.completedAgreementCount)}</dd>
              </div>
            </dl>
          </aside>
        </div>
      </header>

      <main id="main-content" tabIndex={-1}>
        <section className="section section-white">
          <div className="section-head">
            <p className="eyebrow">Now</p>
            <h2>Supported pilot surfaces</h2>
            <p>
              These are the parts visitors can use without assuming hidden liquidity or automated
              matching.
            </p>
          </div>

          <div className="data-grid">
            <article className="panel data-card">
              <h3>Primer and worked examples</h3>
              <p className="route-text">
                Public examples show terms, evidence, baseline confidence, and externality review
                without pretending they are live offers.
              </p>
            </article>
            <article className="panel data-card">
              <h3>Founding cohort</h3>
              <p className="route-text">
                Early users are routed toward one low-risk action, one serious invite, and one
                proof artifact before broader marketplace activity.
              </p>
            </article>
            <article className="panel data-card">
              <h3>Non-custodial donation routes</h3>
              <p className="route-text">
                Curated Every.org links and manual evidence records support donation workflows
                without escrow, custody, tax advice, or platform-held funds.
              </p>
            </article>
          </div>
        </section>

        <section className="section section-white" aria-labelledby="protocol-health-heading">
          <div className="section-head">
            <p className="eyebrow">Protocol health</p>
            <h2 id="protocol-health-heading">Validator-backed surfaces you can audit now</h2>
            <p>
              The report recommends MPGF-style transparency for the core Moral Trade feature.
              These public checks expose what is machine-checked today before any claim of scale,
              automation, custody, or reliance.
            </p>
          </div>

          <div className="data-grid">
            {protocolHealthSurfaces.map((surface) => (
              <article className="panel data-card" key={surface.label}>
                <div className="protocol-workflow-card-head">
                  <h3>{surface.label}</h3>
                  <StatusBadge tone={surface.status === "pass" ? "default" : "warning"}>
                    {surface.status}
                  </StatusBadge>
                </div>
                <p className="route-text">{surface.summary}</p>
                <p className="panel-note">
                  {surface.checkCount} check(s), {surface.blockerCount} blocker(s).
                </p>
                <Link className="text-button" href={surface.href}>
                  Open public JSON
                </Link>
              </article>
            ))}
          </div>
        </section>

        <section className="section section-subtle">
          <div className="section-head">
            <p className="eyebrow">Not yet</p>
            <h2>Prototype boundaries</h2>
            <p>
              These are intentionally not marketed as complete until the site has more verified
              activity and governance operations.
            </p>
          </div>

          <div className="data-grid">
            <article className="panel data-card">
              <h3>No liquidity claim</h3>
              <p className="route-text">
                Public live proposals may be sparse or absent. Browse examples before treating the
                site as a market.
              </p>
            </article>
            <article className="panel data-card">
              <h3>No automated outreach</h3>
              <p className="route-text">
                Broad previews and consent gates come before identity-specific disclosure or
                introductions.
              </p>
            </article>
            <article className="panel data-card">
              <h3>No guaranteed legal enforceability</h3>
              <p className="route-text">
                The site records terms, evidence, and review states; it does not provide legal,
                tax, escrow, custody, or investment services.
              </p>
            </article>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
