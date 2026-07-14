import type { Metadata } from "next";
import Link from "next/link";

import { SiteFooter } from "@/components/layout/site-footer";
import { SiteTopbar } from "@/components/layout/site-topbar";
import { StatusBadge } from "@/components/ui/page-primitives";
import { getMarketplaceOverview, getViewer } from "@/lib/app-data";
import { CANONICAL_WORKED_CASE_COUNT } from "@/lib/seed-data";
import { buildBreadcrumbJsonLd, buildWebPageJsonLd, getAbsoluteUrl } from "@/lib/seo";
import { getPrimaryNavLinks, getTopbarActions } from "@/lib/site";

export const metadata: Metadata = {
  title: "Service status",
  description:
    "Current Moral Trade service status, supported workflows, public health checks, and operating boundaries.",
  alternates: {
    canonical: "/status",
  },
  openGraph: {
    title: "Moral Trade service status",
    description:
      "See the workflows Moral Trade supports, inspect public health endpoints, and review the service boundaries.",
    url: getAbsoluteUrl("/status"),
    type: "website",
  },
};

function formatStatusCount(value: number | null) {
  return value === null ? "—" : new Intl.NumberFormat("en-US").format(value);
}

const supportedCapabilities = [
  {
    title: "Accounts and guided onboarding",
    detail:
      "Email-based accounts, structured onboarding, role and cause selection, referral attribution, and one-action activation routing.",
    href: "/signup?returnTo=/onboarding",
    action: "Create account",
  },
  {
    title: "Bounded trade records",
    detail:
      "Create and inspect pledge swaps and donation offsets with explicit baselines, terms, evidence requirements, timing, and exit rules.",
    href: "/offers",
    action: "Explore trades",
  },
  {
    title: "Consent-gated matching",
    detail:
      "Publish broad previews without exposing exact wishes or contact details, then disclose only after participant approval.",
    href: "/background-networking",
    action: "Open private matching",
  },
  {
    title: "Moral public-good coordination",
    detail:
      "Structure shared actions, contribution records, external payment evidence, candidate pools, and governance review without platform custody.",
    href: "/moral-goods-group-buying",
    action: "Open public-good tools",
  },
  {
    title: "Evidence and review",
    detail:
      "Store evidence states, reviewer decisions, challenges, appeals, disputes, and completion records without collapsing claims into verified facts.",
    href: "/validation",
    action: "Review validation rules",
  },
  {
    title: "Member workspace",
    detail:
      "Signed-in participants can manage their offers, interests, wish profile, private matching state, agreements, invitations, and data portability.",
    href: "/dashboard",
    action: "Open workspace",
  },
] as const;

const publicHealthChecks = [
  {
    label: "Core protocol",
    href: "/api/moral-trade/health",
    summary: "Protocol fields, statuses, transition rules, privacy classes, and relationship boundaries.",
  },
  {
    label: "Operations",
    href: "/api/moral-trade/operations/health",
    summary: "Operational controls, retention, rate limits, security non-claims, and launch gates.",
  },
  {
    label: "Performance",
    href: "/api/moral-trade/performance/health",
    summary: "Performance targets, route recovery coverage, and privacy-safe telemetry limits.",
  },
  {
    label: "Incident response",
    href: "/api/moral-trade/incident-response/health",
    summary: "Incident intake, severity rules, response phases, and disclosure boundaries.",
  },
  {
    label: "Externality review",
    href: "/api/moral-trade/externality/health",
    summary: "Third-party impact triggers, affected-party standing, review standards, and remedies.",
  },
  {
    label: "Transparency report",
    href: "/api/moral-trade/transparency/report",
    summary: "Aggregate review, disclosure, report, appeal, and operator-timing statistics.",
  },
] as const;

const serviceBoundaries = [
  {
    title: "No liquidity claim",
    detail:
      "The service may have few open proposals. Worked examples are clearly separated from live participant records.",
  },
  {
    title: "No escrow or custody",
    detail:
      "Moral Trade does not hold money, assets, participant commitments, or private keys. External providers handle payments where applicable.",
  },
  {
    title: "No guaranteed legal enforceability",
    detail:
      "The service records terms, evidence, and review states. It does not provide legal, tax, investment, or fiduciary advice.",
  },
  {
    title: "No autonomous disclosure or outreach",
    detail:
      "Private wishes, identities, and contact details remain participant-controlled. Matching and introductions are consent-gated.",
  },
] as const;

export default async function StatusPage() {
  const [viewer, overview] = await Promise.all([getViewer(), getMarketplaceOverview()]);
  const statusStructuredData = buildWebPageJsonLd({
    name: "Moral Trade service status",
    description:
      "Current Moral Trade service status, supported workflows, public health checks, and operating boundaries.",
    path: "/status",
  });
  const breadcrumbStructuredData = buildBreadcrumbJsonLd([
    { href: "/status", label: "Service status" },
  ]);

  return (
    <div className="page-shell">
      <script
        dangerouslySetInnerHTML={{ __html: JSON.stringify(statusStructuredData) }}
        type="application/ld+json"
      />
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
            <p className="eyebrow">Service status</p>
            <h1>What Moral Trade supports today.</h1>
            <p className="hero-text">
              Moral Trade is an operating coordination service with backed account, offer,
              onboarding, matching, evidence, review, and public-good workflows. This page states
              the limits that remain in force.
            </p>
            <div className="hero-actions">
              <Link className="button button-primary" href="/worked-examples">
                Inspect worked examples
              </Link>
              <Link className="button button-secondary" href="/trust">
                Read reliance rules
              </Link>
            </div>
          </section>

          <aside className="hero-panel panel">
            <p className="eyebrow">Backed records</p>
            <dl className="profile-stats profile-stats-hero">
              <div>
                <dt>Open proposals</dt>
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
            <p className="eyebrow">Available now</p>
            <h2>Supported workflows</h2>
            <p>These routes create or read backed records rather than simulated marketplace activity.</p>
          </div>
          <div className="data-grid">
            {supportedCapabilities.map((capability) => (
              <article className="panel data-card" key={capability.title}>
                <div className="protocol-workflow-card-head">
                  <h3>{capability.title}</h3>
                  <StatusBadge tone="default">available</StatusBadge>
                </div>
                <p className="route-text">{capability.detail}</p>
                <Link className="text-button" href={capability.href}>
                  {capability.action}
                </Link>
              </article>
            ))}
          </div>
        </section>

        <section className="section section-subtle" aria-labelledby="health-heading">
          <div className="section-head">
            <p className="eyebrow">Machine-readable checks</p>
            <h2 id="health-heading">Public health and governance endpoints</h2>
            <p>
              These endpoints expose protocol, operations, performance, incident, externality, and
              transparency contracts for direct inspection.
            </p>
          </div>
          <div className="data-grid">
            {publicHealthChecks.map((check) => (
              <article className="panel data-card" key={check.label}>
                <div className="protocol-workflow-card-head">
                  <h3>{check.label}</h3>
                  <StatusBadge tone="default">public</StatusBadge>
                </div>
                <p className="route-text">{check.summary}</p>
                <Link className="text-button" href={check.href}>
                  Open JSON
                </Link>
              </article>
            ))}
          </div>
        </section>

        <section className="section section-white">
          <div className="section-head">
            <p className="eyebrow">Operating boundaries</p>
            <h2>What the service does not claim</h2>
            <p>
              These limits are product controls, not temporary disclaimers. Any change requires an
              explicit operational and governance update.
            </p>
          </div>
          <div className="data-grid">
            {serviceBoundaries.map((boundary) => (
              <article className="panel data-card" key={boundary.title}>
                <h3>{boundary.title}</h3>
                <p className="route-text">{boundary.detail}</p>
              </article>
            ))}
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
