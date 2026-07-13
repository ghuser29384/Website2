import type { Metadata } from "next";
import Link from "next/link";

import { SiteFooter } from "@/components/layout/site-footer";
import { SiteTopbar } from "@/components/layout/site-topbar";
import { Breadcrumbs, SectionHeader } from "@/components/ui/page-primitives";
import {
  DONATION_CANCELLATION_ADMIN_BLOCKERS,
  DONATION_CANCELLATION_BACKEND_REQUIREMENTS,
  DONATION_CANCELLATION_NON_MVP_BANNER,
  assertDonationCancellationCapability,
  createDonationCancellationDemoSettlement,
  evaluateDonationCancellationCapabilities,
  getDonationCancellationDeploymentEnvironment,
  getDonationCancellationMarkets,
  getDonationCancellationRecipients,
  getDonationCancellationRounds,
} from "@/lib/moral-trade/donation-cancellation-clearinghouse";
import { getAbsoluteUrl } from "@/lib/seo";
import { getPrimaryNavLinks, getTopbarActions } from "@/lib/site";

export const metadata: Metadata = {
  alternates: {
    canonical: "/admin/donation-cancellation",
  },
  description: "Donation Cancellation Clearinghouse admin review, matching, settlement, and audit console.",
  openGraph: {
    description: "Inspect recipients, markets, rounds, blockers, settlement plans, pause lanes, and audit reports.",
    title: "Donation clearinghouse admin",
    type: "website",
    url: getAbsoluteUrl("/admin/donation-cancellation"),
  },
  title: "Donation clearinghouse admin",
};

function formatMinor(amountMinor: number, currency = "usd") {
  return new Intl.NumberFormat("en-US", {
    currency: currency.toUpperCase(),
    maximumFractionDigits: amountMinor % 100 === 0 ? 0 : 2,
    style: "currency",
  }).format(amountMinor / 100);
}

export default function DonationCancellationAdminPage() {
  const environment = getDonationCancellationDeploymentEnvironment();
  const labsDecision = assertDonationCancellationCapability(
    "view_labs_landing",
    { role: "admin", permissions: ["donation_cancellation_labs_admin"] },
    environment,
    {
      featureEnabled: true,
      labsEnabled: true,
      paymentMode: "dev_simulated_capture",
    },
  );
  const rounds = getDonationCancellationRounds({ environment, includeNonMvpLabs: true });
  const recipients = getDonationCancellationRecipients();
  const markets = getDonationCancellationMarkets();
  const { auditReport, plan } = createDonationCancellationDemoSettlement();
  const productionCapability = evaluateDonationCancellationCapabilities({
    compliantCaptureSupported: false,
    environment: "production",
    featureFlagEnabled: true,
    paymentMode: "dev_simulated_capture",
    providerAuthorizationSupported: false,
  });
  const pauseCapability = evaluateDonationCancellationCapabilities({
    compliantCaptureSupported: false,
    environment: "development",
    featureFlagEnabled: true,
    pausedLanes: ["all_feature_activity"],
    paymentMode: "dev_simulated_capture",
    providerAuthorizationSupported: false,
  });
  const adminRoutes = [
    "/admin/donation-cancellation/rounds",
    "/admin/donation-cancellation/recipients",
    "/admin/donation-cancellation/opposition-markets",
    "/admin/donation-cancellation/matching",
    "/admin/donation-cancellation/settlement",
    "/admin/donation-cancellation/audit",
  ];

  return (
    <div className="page-shell page-shell-focused">
      <header className="v72-route-header">
        <SiteTopbar brandHref="/" links={getPrimaryNavLinks(false)} {...getTopbarActions(false)} />
        <Breadcrumbs
          items={[
            { href: "/admin", label: "Admin" },
            { href: "/admin/donation-cancellation", label: "Donation clearinghouse" },
          ]}
        />
      </header>

      <main id="main-content" tabIndex={-1}>
        <section className="section section-white" aria-labelledby="admin-heading">
          <div className="section-head section-head-compact">
            <p className="eyebrow">Admin</p>
            <h1 id="admin-heading">Donation Cancellation Clearinghouse v0.1 console.</h1>
            <p>
              {DONATION_CANCELLATION_NON_MVP_BANNER}
            </p>
            <p>
              Admins define recipients, recipient routes, opposition markets, round caps and dates,
              copy preflight, matching, settlement approval, routing operations, audit reports, and
              pause lanes. This page is route-safe and non-mutating.
            </p>
          </div>
          <div className="data-grid">
            <article className="panel data-card">
              <p className="detail-kicker">Non-MVP gate</p>
              <h3>{labsDecision.ok ? "labs view allowed" : "blocked"}</h3>
              <p>{labsDecision.ok ? DONATION_CANCELLATION_NON_MVP_BANNER : labsDecision.reasons.join(", ")}</p>
            </article>
            <article className="panel data-card">
              <p className="detail-kicker">Rounds</p>
              <h3>{rounds.length}</h3>
              <p>{rounds.map((round) => `${round.title}: ${round.status}`).join("; ")}</p>
            </article>
            <article className="panel data-card">
              <p className="detail-kicker">Recipients</p>
              <h3>{recipients.filter((recipient) => recipient.reviewState === "approved").length} approved</h3>
              <p>{recipients.filter((recipient) => recipient.reviewState === "blocked").length} blocked placeholders remain unavailable.</p>
            </article>
            <article className="panel data-card">
              <p className="detail-kicker">Opposition markets</p>
              <h3>{markets.filter((market) => market.status === "active").length} active</h3>
              <p>Users cannot create markets directly.</p>
            </article>
          </div>
        </section>

        <section className="section section-subtle" aria-labelledby="blockers-heading">
          <SectionHeader eyebrow="Admin blockers" id="blockers-heading" title="Production money movement is blocked by default.">
            Production cannot use the dev simulated payment mode. Provider authorization or
            compliant captured-funds support must exist before registration, matching, routing, or
            public report publication can mutate real state.
          </SectionHeader>
          <div className="data-grid">
            <article className="panel data-card">
              <p className="detail-kicker">Production capability</p>
              <h3>{productionCapability.status}</h3>
              <p>{productionCapability.blockers.join(", ")}</p>
            </article>
            <article className="panel data-card">
              <p className="detail-kicker">Emergency pause</p>
              <h3>{pauseCapability.status}</h3>
              <p>{pauseCapability.userFacingSummary}</p>
            </article>
            <article className="panel data-card">
              <p className="detail-kicker">Required blocker list</p>
              <h3>{DONATION_CANCELLATION_ADMIN_BLOCKERS.length} blockers</h3>
              <p>{DONATION_CANCELLATION_ADMIN_BLOCKERS.slice(0, 4).join(", ")}.</p>
            </article>
            <article className="panel data-card">
              <p className="detail-kicker">Feature flag</p>
              <h3>{rounds[0]?.featureFlag ?? "donation_cancellation_clearinghouse_v0_1"}</h3>
              <p>Production enablement stays blocked unless the flag and provider gates agree.</p>
            </article>
          </div>
        </section>

        <section className="section section-white" aria-labelledby="settlement-heading">
          <SectionHeader eyebrow="Matching and settlement" id="settlement-heading" title="Settlement plan is deterministic before routing.">
            The plan binds registrations, payment states, matching output, redirect suggestions,
            allocation rows, routing operations, idempotency keys, and calculation hashes before
            any money movement.
          </SectionHeader>
          <dl className="mpgf-summary-grid">
            <div>
              <dt>Settlement status</dt>
              <dd>{plan.status}</dd>
            </div>
            <div>
              <dt>Ledger status</dt>
              <dd>{plan.ledgerBalanceStatus}</dd>
            </div>
            <div>
              <dt>Matched</dt>
              <dd>{formatMinor(auditReport.grossMatchedMinor)}</dd>
            </div>
            <div>
              <dt>Redirected</dt>
              <dd>{formatMinor(auditReport.grossRedirectedMinor)}</dd>
            </div>
            <div>
              <dt>Routed to intended</dt>
              <dd>{formatMinor(auditReport.grossRoutedToIntendedMinor)}</dd>
            </div>
          </dl>
        </section>

        <section className="section section-subtle" aria-labelledby="routes-heading">
          <SectionHeader eyebrow="Admin routes" id="routes-heading" title="Suggested console URLs resolve to this non-mutating console.">
            The route aliases are in place for rounds, recipients, markets, matching, settlement,
            and audit until dedicated mutation-backed screens are ready.
          </SectionHeader>
          <div className="data-grid">
            {adminRoutes.map((href) => (
              <article className="panel data-card" key={href}>
                <p className="detail-kicker">Route</p>
                <h3>{href.split("/").at(-1)}</h3>
                <Link className="button button-secondary" href={href}>
                  Open
                </Link>
              </article>
            ))}
          </div>
        </section>

        <section className="section section-white" aria-labelledby="backend-heading">
          <SectionHeader eyebrow="Backend required" id="backend-heading" title="Durable admin actions need persistence, RLS, outbox, and provider gates.">
            These requirements are documented and migration-scaffolded before live enablement.
          </SectionHeader>
          <div className="data-grid">
            {DONATION_CANCELLATION_BACKEND_REQUIREMENTS.slice(0, 6).map((requirement) => (
              <article className="panel data-card" key={requirement}>
                <p className="detail-kicker">Required</p>
                <h3>{requirement}</h3>
              </article>
            ))}
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
