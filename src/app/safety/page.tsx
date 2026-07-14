import type { Metadata } from "next";
import Link from "next/link";

import { SiteFooter } from "@/components/layout/site-footer";
import { SiteTopbar } from "@/components/layout/site-topbar";
import { StatusBadge } from "@/components/ui/page-primitives";
import { getViewer } from "@/lib/app-data";
import {
  auditMoralTradeSecurityScaleReadiness,
  getMoralTradeSecurityProfile,
  validateMoralTradeSecurityProfile,
} from "@/lib/moral-trade/security";
import {
  getMoralTradeOperationsProfile,
  validateMoralTradeOperationsProfile,
} from "@/lib/moral-trade/operations";
import { buildBreadcrumbJsonLd, getAbsoluteUrl } from "@/lib/seo";
import { getPrimaryNavLinks, getTopbarActions } from "@/lib/site";

const safetyDescription =
  "Safety standards for Moral Trade proposals, private matching, payments, consent-gated introductions, evidence review, and incident response.";

export const metadata: Metadata = {
  title: "Safety",
  description: safetyDescription,
  alternates: {
    canonical: "/safety",
  },
  openGraph: {
    title: "Safety | Moral Trade",
    description: safetyDescription,
    url: getAbsoluteUrl("/safety"),
    type: "article",
  },
};

const safetyRules = [
  {
    title: "No manufactured threats",
    detail:
      "A proposal must not reward newly escalated harm, coercive leverage, extortion, harassment, or a worse baseline created to extract concessions.",
  },
  {
    title: "No surprise disclosure",
    detail:
      "Exact wishes, identities, sensitive constraints, evidence bodies, and contact details remain private until the relevant person approves a scoped disclosure.",
  },
  {
    title: "No autonomous outreach",
    detail:
      "Private matching does not scrape private feeds, mass-message candidates, or contact a possible counterparty without an accountable human request and review.",
  },
  {
    title: "Third-party harms count",
    detail:
      "A deal can be mutually preferred by its direct parties and still require externality review, affected-party standing, correction, or rejection.",
  },
  {
    title: "Evidence stays scoped",
    detail:
      "A receipt or log may show that an action occurred. It does not automatically prove the no-trade baseline, causation, impact, or absence of externalities.",
  },
  {
    title: "Recourse remains available",
    detail:
      "Participants and affected parties can challenge evidence, request correction, appeal decisions, report incidents, revoke grants, or freeze private matching state.",
  },
] as const;

const blockedClasses = [
  "Violence, threats, extortion, coercion, harassment, doxxing, or stalking.",
  "Fraud, impersonation, illegal acts, deceptive evidence, or attempts to evade provider rules.",
  "Pressure on vulnerable people or demands that create unsafe personal, medical, legal, or financial exposure.",
  "Political campaign contribution offsets or other regulated activity outside the service boundary.",
  "Proposals that require unrestricted private-data access or unconsented contact disclosure.",
] as const;

function formatToken(value: string) {
  return value.replaceAll("_", " ");
}

export default async function SafetyPage() {
  const viewer = await getViewer();
  const securityProfile = getMoralTradeSecurityProfile();
  const operationsProfile = getMoralTradeOperationsProfile();
  const securityValidation = validateMoralTradeSecurityProfile(securityProfile);
  const operationsValidation = validateMoralTradeOperationsProfile(operationsProfile);
  const scaleGates = securityProfile.scaleGates.map((gate) => ({
    ...gate,
    readiness: auditMoralTradeSecurityScaleReadiness({ gateKey: gate.key, profile: securityProfile }),
  }));
  const breadcrumbStructuredData = buildBreadcrumbJsonLd([
    { href: "/safety", label: "Safety" },
  ]);

  return (
    <div className="page-shell">
      <script
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbStructuredData) }}
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
            <p className="eyebrow">Safety</p>
            <h1>Safety rules for voluntary moral trade.</h1>
            <p className="hero-text">
              Moral Trade should make serious cooperation easier without rewarding coercion,
              exposing private moral preferences, weakening evidence standards, or ignoring harms to
              people outside the deal.
            </p>
            <div className="hero-actions">
              <Link className="button button-primary" href="/anti-threat-rules">
                Read anti-threat rules
              </Link>
              <Link className="button button-secondary" href="/trust">
                Review recourse routes
              </Link>
              <Link className="button button-secondary" href="/contact">
                Report a concern
              </Link>
            </div>
          </section>
          <aside className="hero-panel panel">
            <p className="eyebrow">Current contract health</p>
            <dl className="profile-stats profile-stats-hero">
              <div>
                <dt>Security</dt>
                <dd>{securityValidation.status}</dd>
              </div>
              <div>
                <dt>Operations</dt>
                <dd>{operationsValidation.status}</dd>
              </div>
              <div>
                <dt>Scale gates</dt>
                <dd>{scaleGates.length}</dd>
              </div>
              <div>
                <dt>Incident route</dt>
                <dd>Public</dd>
              </div>
            </dl>
          </aside>
        </div>
      </header>

      <main id="main-content" tabIndex={-1}>
        <section className="section section-white" aria-labelledby="safety-rules-heading">
          <div className="section-head">
            <p className="eyebrow">Core rules</p>
            <h2 id="safety-rules-heading">What every workflow must preserve</h2>
          </div>
          <div className="data-grid">
            {safetyRules.map((rule) => (
              <article className="panel data-card" key={rule.title}>
                <h3>{rule.title}</h3>
                <p className="route-text">{rule.detail}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="section section-subtle" aria-labelledby="blocked-classes-heading">
          <div className="section-head">
            <p className="eyebrow">Blocked or escalated</p>
            <h2 id="blocked-classes-heading">Proposal classes outside the service boundary</h2>
          </div>
          <div className="panel data-card data-card-wide">
            <ul className="trust-check-list">
              {blockedClasses.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
        </section>

        <section className="section section-white" aria-labelledby="safety-contracts-heading">
          <div className="section-head">
            <p className="eyebrow">Public contracts</p>
            <h2 id="safety-contracts-heading">Inspect the controls behind the claims</h2>
            <p>
              Machine-readable endpoints expose security, operations, disclosure, appeal, incident,
              and externality rules. Public copy should remain tied to those checks.
            </p>
          </div>
          <div className="data-grid">
            {[
              ["Security health", "/api/moral-trade/security/health"],
              ["Operations health", "/api/moral-trade/operations/health"],
              ["Disclosure contract", "/api/moral-trade/disclosure/contract"],
              ["Challenge and appeal", "/api/moral-trade/challenge-appeal/contract"],
              ["Incident response", "/api/moral-trade/incident-response/health"],
              ["Externality review", "/api/moral-trade/externality/health"],
            ].map(([label, href]) => (
              <Link className="panel data-card" href={href} key={href}>
                <h3>{label}</h3>
                <p className="route-text">Open the current public contract and validator result.</p>
                <span className="inline-link">Open JSON</span>
              </Link>
            ))}
          </div>
        </section>

        <section className="section section-subtle" aria-labelledby="scale-gates-heading">
          <div className="section-head">
            <p className="eyebrow">Scale gates</p>
            <h2 id="scale-gates-heading">Sensitive capabilities do not expand without named controls</h2>
          </div>
          <div className="data-grid">
            {scaleGates.map((gate) => (
              <article className="panel data-card" key={gate.key}>
                <div className="protocol-workflow-card-head">
                  <h3>{gate.label}</h3>
                  <StatusBadge tone={gate.readiness.status === "pass" ? "default" : "warning"}>
                    {gate.readiness.status}
                  </StatusBadge>
                </div>
                <p className="route-text">{gate.rule}</p>
                <p className="panel-note">
                  Requires {gate.requires.map(formatToken).join(", ")}.
                </p>
              </article>
            ))}
          </div>
        </section>

        <section className="section section-white" aria-labelledby="nonclaims-heading">
          <div className="section-head">
            <p className="eyebrow">Non-claims</p>
            <h2 id="nonclaims-heading">What the service does not promise</h2>
          </div>
          <div className="panel data-card data-card-wide">
            <ul className="trust-check-list">
              {securityProfile.publicNonClaims.map((nonClaim) => (
                <li key={nonClaim}>{nonClaim}</li>
              ))}
            </ul>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
