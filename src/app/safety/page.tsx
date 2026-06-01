import type { Metadata } from "next";
import Link from "next/link";

import { SiteFooter } from "@/components/layout/site-footer";
import { SiteTopbar } from "@/components/layout/site-topbar";
import { Breadcrumbs, StatusBadge } from "@/components/ui/page-primitives";
import { getViewer } from "@/lib/app-data";
import {
  auditMoralTradeSecurityScaleReadiness,
  getMoralTradeSecurityProfile,
  validateMoralTradeSecurityProfile,
  type MoralTradeSecurityControlStatus,
} from "@/lib/moral-trade/security";
import {
  getMoralTradeOperationsProfile,
  validateMoralTradeOperationsProfile,
} from "@/lib/moral-trade/operations";
import { buildBreadcrumbJsonLd, getAbsoluteUrl } from "@/lib/seo";
import { getPrimaryNavLinks, getTopbarActions } from "@/lib/site";

const safetyDescription =
  "Safety standards for Moral Trade proposals, background networking, payments, consent-gated introductions, and validator-backed review.";

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
  twitter: {
    card: "summary_large_image",
    title: "Safety | Moral Trade",
    description: safetyDescription,
  },
};

function formatSafetyToken(value: string) {
  return value.replaceAll("_", " ");
}

function securityTone(status: MoralTradeSecurityControlStatus) {
  if (status === "implemented") {
    return "default";
  }

  if (status === "provider_boundary") {
    return "secondary";
  }

  return "warning";
}

export default async function SafetyPage() {
  const viewer = await getViewer();
  const securityProfile = getMoralTradeSecurityProfile();
  const securityValidation = validateMoralTradeSecurityProfile(securityProfile);
  const operationsProfile = getMoralTradeOperationsProfile();
  const operationsValidation = validateMoralTradeOperationsProfile(operationsProfile);
  const securityScaleGateReadiness = securityProfile.scaleGates.map((gate) => ({
    ...gate,
    readiness: auditMoralTradeSecurityScaleReadiness({
      gateKey: gate.key,
      profile: securityProfile,
    }),
  }));
  const breadcrumbStructuredData = buildBreadcrumbJsonLd([
    { href: "/safety", label: "Safety" },
  ]);

  return (
    <div className="page-shell">
      <script
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(breadcrumbStructuredData),
        }}
        type="application/ld+json"
      />
      <SiteTopbar
        brandHref="/"
        links={getPrimaryNavLinks(Boolean(viewer))}
        {...getTopbarActions(Boolean(viewer))}
        showLogout={Boolean(viewer)}
      />
      <Breadcrumbs items={[{ href: "/safety", label: "Safety" }]} />
      <main className="legal-page" id="main-content" tabIndex={-1}>
        <p className="eyebrow">Safety</p>
        <h1>Safety rules for voluntary moral trade</h1>
        <p>
          Moral Trade should make serious cooperation easier without rewarding coercion, harassment,
          manipulation, or unsafe background networking.
        </p>
        <section className="panel data-card data-card-wide">
          <h2>Anti-threat and baseline integrity</h2>
          <p>
            Safety review starts with the no-trade baseline: what would each participant do absent
            the trade? Proposals involving threat creation, newly escalated harmful behavior, or
            coercive compensation requests should be rejected or sent to challenge review.
          </p>
          <Link className="text-button" href="/anti-threat-rules">
            Read anti-threat baseline rules
          </Link>
        </section>
        <section className="panel data-card data-card-wide">
          <h2>Blocked proposal classes</h2>
          <p>
            The platform should reject or review proposals involving violence, illegal acts, fraud,
            extortion, doxxing, harassment, exploitation, or pressure on vulnerable people.
          </p>
        </section>
        <section className="panel data-card data-card-wide">
          <h2>Validator-backed safety evidence</h2>
          <p>
            Public health endpoints expose whether the security, disclosure, challenge-appeal,
            incident-response, performance, and AI-governance contracts pass their current
            validators. Safety claims should stay tied to these checks rather than implying hidden
            automation, escrow, or unrestricted reviewer authority.
          </p>
          <div className="hero-actions">
            <Link className="button button-primary" href="/api/moral-trade/security/health">
              View security health
            </Link>
            <Link className="button button-secondary" href="/api/moral-trade/disclosure/contract">
              View disclosure contract
            </Link>
            <Link className="button button-secondary" href="/api/moral-trade/challenge-appeal/contract">
              View appeal contract
            </Link>
            <Link className="button button-secondary" href="/api/moral-trade/incident-response/health">
              View incident response
            </Link>
            <Link className="button button-secondary" href="/api/moral-trade/operations/health">
              View operations health
            </Link>
          </div>
        </section>
        <section className="panel data-card data-card-wide">
          <div className="protocol-workflow-card-head">
            <div>
              <p className="eyebrow">Security posture contract</p>
              <h2>Controls, scale gates, and non-claims are public.</h2>
            </div>
            <StatusBadge tone={securityValidation.status === "pass" ? "default" : "warning"}>
              {securityValidation.status}
            </StatusBadge>
          </div>
          <p>
            The security profile names browser headers, private cache rules, Supabase session
            boundaries, provider encryption assumptions, admin-scale gates, key-rotation gates,
            abuse throttles, and incident reporting. It also says what the pilot does not yet claim.
          </p>
          <div className="data-grid">
            {securityProfile.controls.map((control) => (
              <article className="panel data-card" key={control.key}>
                <div className="protocol-workflow-card-head">
                  <h3>{control.label}</h3>
                  <StatusBadge tone={securityTone(control.status)}>
                    {formatSafetyToken(control.status)}
                  </StatusBadge>
                </div>
                <p className="route-text">{control.publicClaim}</p>
              </article>
            ))}
          </div>
        </section>
        <section className="panel data-card data-card-wide">
          <div className="protocol-workflow-card-head">
            <div>
              <p className="eyebrow">Operations contract</p>
              <h2>Headers, sessions, retention, and fallback controls are inspectable.</h2>
            </div>
            <StatusBadge tone={operationsValidation.status === "pass" ? "default" : "warning"}>
              {operationsValidation.status}
            </StatusBadge>
          </div>
          <p>
            The operations profile names the platform controls that were previously unspecified in
            public materials: HTTP security headers, private no-store routes, rate-limit surfaces,
            session/privacy controls, retention lifecycles, observability metrics, and safe
            fallback behavior.
          </p>
          <div className="protocol-review-grid">
            <article className="panel data-card">
              <h3>Header and cache evidence</h3>
              <ul className="clean-list">
                {operationsProfile.securityHeaders.map((header) => (
                  <li key={header.code}>
                    <strong>{header.label}:</strong> {header.evidence}
                  </li>
                ))}
              </ul>
            </article>
            <article className="panel data-card">
              <h3>Privacy and session controls</h3>
              <ul className="clean-list">
                {operationsProfile.privacyAndSessionControls.map((control) => (
                  <li key={control.key}>
                    <strong>{control.label}:</strong> {control.evidence}
                  </li>
                ))}
              </ul>
            </article>
            <article className="panel data-card">
              <h3>Observability without private text</h3>
              <ul className="clean-list">
                {operationsProfile.observabilityMetrics.map((metric) => (
                  <li key={metric}>{formatSafetyToken(metric)}</li>
                ))}
              </ul>
              <p className="panel-note">
                Operational telemetry is framed as counts, route health, latency, Web Vitals,
                privacy incidents, fallbacks, and review SLAs rather than raw wishes or source
                notes.
              </p>
            </article>
          </div>
          <div className="protocol-review-grid">
            <article className="panel data-card">
              <h3>Rate-limit surfaces</h3>
              <p className="route-text">
                {operationsProfile.rateLimitSurfaces.length} surfaces, including{" "}
                {operationsProfile.rateLimitSurfaces
                  .slice(0, 8)
                  .map((surface) => `${formatSafetyToken(surface.key)} (${surface.limit}/${surface.window})`)
                  .join(", ")}
                .
              </p>
            </article>
            <article className="panel data-card">
              <h3>Retention lifecycle controls</h3>
              <p className="route-text">
                {operationsProfile.retentionControls
                  .map((control) => formatSafetyToken(control.key))
                  .join(", ")}
                .
              </p>
            </article>
            <article className="panel data-card">
              <h3>Fallback and rollout gates</h3>
              <ul className="clean-list">
                {operationsProfile.fallbackControls.map((control) => (
                  <li key={control.key}>{control.rule}</li>
                ))}
              </ul>
            </article>
          </div>
          <div className="hero-actions">
            <Link className="button button-primary" href="/api/moral-trade/operations/health">
              Open operations JSON
            </Link>
            <Link className="button button-secondary" href="/moral-trade/technical-spec">
              Inspect technical spec
            </Link>
          </div>
        </section>
        <section className="panel data-card data-card-wide">
          <h2>Security scale gates</h2>
          <p>
            Expansion is blocked unless the named controls are implemented or consciously held at a
            provider boundary. This keeps sensitive admin, paid-action, and trust-badge scale from
            outrunning the current security evidence.
          </p>
          <div className="data-grid">
            {securityScaleGateReadiness.map((gate) => (
              <article className="panel data-card" key={gate.key}>
                <div className="protocol-workflow-card-head">
                  <h3>{gate.label}</h3>
                  <StatusBadge tone={gate.readiness.status === "pass" ? "default" : "warning"}>
                    {gate.readiness.status}
                  </StatusBadge>
                </div>
                <p className="route-text">{gate.rule}</p>
                <p className="panel-note">
                  Requires {gate.requires.map(formatSafetyToken).join(", ")}.
                </p>
              </article>
            ))}
          </div>
        </section>
        <section className="panel data-card data-card-wide">
          <h2>Public security non-claims</h2>
          <ul className="trust-check-list">
            {securityProfile.publicNonClaims.map((nonClaim) => (
              <li key={nonClaim}>{nonClaim}</li>
            ))}
          </ul>
        </section>
        <section className="panel data-card data-card-wide">
          <h2>Background networking boundaries</h2>
          <p>
            The current prototype does not run autonomous AI outreach, mass profile ingestion, or
            private-feed search. Matching is limited to explicit fields, broad previews, saved
            searches, and manual source notes so the first version stays legible enough to audit.
          </p>
          <p>No surprise exposure. No autonomous outreach. No private-feed mining.</p>
        </section>
        <section className="panel data-card data-card-wide">
          <h2>Collusion, secrecy, and review</h2>
          <p>
            The safety problem is not solved by either full openness or total opacity. Broad
            previews, review queues, match reports, and risk signals try to preserve enough
            oversight to investigate suspicious activity without exposing every participant&apos;s exact
            wishes to the public by default.
          </p>
        </section>
        <section className="panel data-card data-card-wide">
          <h2>Dispute handling</h2>
          <p>
            Participants can record verification evidence, counterproposals, cancellation requests,
            and disputes on agreements. These records make review possible but do not replace
            professional legal or financial advice.
          </p>
        </section>
        <section className="panel data-card data-card-wide">
          <h2>Review queues</h2>
          <p>
            Reports, payment-review requests, failed notifications, and blocked wish profiles are
            routed to an admin console so operators can inspect problems before they become public
            or affect counterparties.
          </p>
        </section>
        <section className="panel data-card data-card-wide">
          <h2>Privacy gates</h2>
          <p>
            Match suggestions should reveal broad reasons first. Exact asks, identities, and contact
            details should be shared only after both sides consent.
          </p>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
