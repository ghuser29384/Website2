import type { Metadata } from "next";
import Link from "next/link";

import { DirectUpgradeLocalDateTime } from "@/components/donation-upgrades/direct-upgrade-deadline-field";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteTopbar } from "@/components/layout/site-topbar";
import { SectionHeader } from "@/components/ui/page-primitives";
import { evaluateAdminOperatorAccess } from "@/lib/admin";
import { requireViewer } from "@/lib/app-data";
import { loadBackgroundAccountSecuritySummary } from "@/lib/background-account-security";
import {
  formatDirectDonationUpgradeUsd,
  getDirectDonationUpgradeConfig,
  type DirectDonationUpgradeObligationRow,
  type DirectDonationUpgradeOfferRow,
} from "@/lib/direct-donation-upgrade";
import { getPrimaryNavLinks, getTopbarActions } from "@/lib/site";
import { createServiceClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  title: "Donation Upgrade operations",
  robots: { index: false, follow: false },
};

function statusLabel(value: unknown) {
  return String(value ?? "unknown").replaceAll("_", " ");
}

async function loadSnapshot(environment: "staging" | "live" | null) {
  if (!environment) {
    return { offers: [], obligations: [], credits: [], auditEvents: [], errors: [] as string[] };
  }
  const supabase = createServiceClient() as any;
  const [offers, obligations, credits, auditEvents] = await Promise.all([
    supabase
      .from("direct_donation_upgrade_offers")
      .select("*")
      .eq("environment", environment)
      .order("created_at", { ascending: false })
      .limit(100),
    supabase
      .from("direct_donation_upgrade_obligations")
      .select("*")
      .eq("environment", environment)
      .order("created_at", { ascending: false })
      .limit(100),
    supabase
      .from("direct_donation_upgrade_impact_credits")
      .select("*, offer:direct_donation_upgrade_offers!inner(environment)")
      .eq("offer.environment", environment)
      .order("verified_at", { ascending: false })
      .limit(100),
    supabase
      .from("direct_donation_upgrade_audit_events")
      .select("*, offer:direct_donation_upgrade_offers!inner(environment)")
      .eq("offer.environment", environment)
      .order("created_at", { ascending: false })
      .limit(100),
  ]);
  const errors = [offers, obligations, credits, auditEvents]
    .map((result) => result.error?.message)
    .filter((message): message is string => Boolean(message));
  return {
    offers: (offers.data ?? []) as DirectDonationUpgradeOfferRow[],
    obligations: (obligations.data ?? []) as DirectDonationUpgradeObligationRow[],
    credits: credits.data ?? [],
    auditEvents: auditEvents.data ?? [],
    errors,
  };
}

export default async function DonationUpgradeAdminPage() {
  const [viewer, security] = await Promise.all([
    requireViewer("/admin/donation-upgrades"),
    loadBackgroundAccountSecuritySummary(),
  ]);
  const access = evaluateAdminOperatorAccess({ email: viewer.authUser.email, mfaSummary: security });
  const config = getDirectDonationUpgradeConfig();
  const snapshot = access.allowed ? await loadSnapshot(config.environment) : null;
  const needsReview = snapshot?.offers.filter((offer) => offer.status === "needs_review") ?? [];
  const defaulted = snapshot?.offers.filter((offer) => offer.status === "defaulted") ?? [];
  const openObligations = snapshot?.obligations.filter((obligation) =>
    ["pending", "checkout_started"].includes(obligation.status),
  ) ?? [];

  return (
    <div className="page-shell">
      <header>
        <SiteTopbar
          brandHref="/"
          links={getPrimaryNavLinks(true)}
          {...getTopbarActions(true)}
          showLogout
        />
      </header>
      <main id="main-content" tabIndex={-1}>
        <section className="section section-white" aria-labelledby="direct-upgrade-admin-heading">
          <SectionHeader
            eyebrow="Donation Upgrade operations"
            id="direct-upgrade-admin-heading"
            title="Inspect direct obligations, mismatches, defaults, and verified impact."
          >
            This console does not prove a donation from a browser return. The provider webhook and
            immutable audit records remain authoritative.
          </SectionHeader>
          <div className="form-actions">
            <Link className="button button-secondary" href="/admin">Back to admin</Link>
            <Link className="button button-secondary" href="/donation-upgrades">Public directory</Link>
          </div>

          {!access.allowed || !snapshot ? (
            <div className="status-banner status-banner-error">
              <strong>Operator access blocked.</strong> {access.message}
            </div>
          ) : (
            <>
              {snapshot.errors.length ? (
                <div className="status-banner status-banner-error">
                  {snapshot.errors[0]}
                </div>
              ) : null}
              <div className="pilot-metric-grid">
                <article className="panel data-card"><p className="detail-kicker">Mode</p><h2>{config.mode}</h2></article>
                <article className="panel data-card"><p className="detail-kicker">Offers</p><h2>{snapshot.offers.length}</h2></article>
                <article className="panel data-card"><p className="detail-kicker">Open obligations</p><h2>{openObligations.length}</h2></article>
                <article className="panel data-card"><p className="detail-kicker">Needs review</p><h2>{needsReview.length}</h2></article>
                <article className="panel data-card"><p className="detail-kicker">Defaults</p><h2>{defaulted.length}</h2></article>
                <article className="panel data-card"><p className="detail-kicker">Impact records</p><h2>{snapshot.credits.length}</h2></article>
              </div>

              <SectionHeader
                eyebrow="Review queue"
                id="direct-upgrade-review-heading"
                title="Any exact mismatch freezes the offer."
              />
              <div className="data-grid">
                {needsReview.map((offer) => (
                  <article className="panel data-card data-card-wide" key={offer.id}>
                    <p className="detail-kicker">{offer.failure_code || "needs review"}</p>
                    <h3>{offer.upgraded_recipient.name}</h3>
                    <p>{offer.failure_message || "Review the provider and audit records."}</p>
                    <Link className="button button-secondary" href={`/donation-upgrades/${offer.id}`}>
                      Open participant-safe detail
                    </Link>
                  </article>
                ))}
                {!needsReview.length ? (
                  <article className="panel data-card"><h3>No mismatches awaiting review</h3></article>
                ) : null}
              </div>

              <SectionHeader
                eyebrow="Recent obligations"
                id="direct-upgrade-obligations-heading"
                title="Exact participant, branch, amount, recipient, and deadline."
              />
              <div className="data-grid">
                {snapshot.obligations.slice(0, 40).map((obligation) => (
                  <article className="panel data-card" key={obligation.id}>
                    <p className="detail-kicker">
                      {obligation.participant_role} · {statusLabel(obligation.status)}
                    </p>
                    <h3>
                      {formatDirectDonationUpgradeUsd(obligation.expected_amount_cents)} to{" "}
                      {obligation.expected_recipient.name}
                    </h3>
                    <p>Due <DirectUpgradeLocalDateTime value={obligation.due_at} /></p>
                    <p className="field-note">
                      {obligation.provider_charge_id_hash
                        ? `Charge hash ${obligation.provider_charge_id_hash.slice(0, 18)}…`
                        : "No provider charge recorded"}
                    </p>
                    {obligation.failure_message ? <p>{obligation.failure_message}</p> : null}
                  </article>
                ))}
              </div>

              <SectionHeader
                eyebrow="Audit"
                id="direct-upgrade-audit-heading"
                title="Most recent immutable lifecycle events."
              />
              <div className="data-grid">
                {snapshot.auditEvents.slice(0, 40).map((event: any) => (
                  <article className="panel data-card" key={event.id}>
                    <p className="detail-kicker">{statusLabel(event.event_type)}</p>
                    <h3>{String(event.offer_id ?? "platform event").slice(0, 18)}…</h3>
                    <p><DirectUpgradeLocalDateTime value={String(event.created_at)} /></p>
                  </article>
                ))}
              </div>
            </>
          )}
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
