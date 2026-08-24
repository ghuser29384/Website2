import type { Metadata } from "next";
import Link from "next/link";

import { recordDirectDonationUpgradeProviderRefundAction } from "@/app/admin/donation-upgrades/actions";
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
import { getFormMessage } from "@/lib/form-state";
import { providerRefundRenderedQaAdminSnapshot } from "@/lib/provider-refund-rendered-qa";
import { getPrimaryNavLinks, getTopbarActions } from "@/lib/site";
import { createServiceClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  title: "Donation Upgrade operations",
  robots: { index: false, follow: false },
};

interface PageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

function statusLabel(value: unknown) {
  return String(value ?? "unknown").replaceAll("_", " ");
}

async function loadSnapshot(environment: "staging" | "live" | null) {
  const renderedQaSnapshot = providerRefundRenderedQaAdminSnapshot(environment);
  if (renderedQaSnapshot) {
    return renderedQaSnapshot as {
      offers: DirectDonationUpgradeOfferRow[];
      obligations: DirectDonationUpgradeObligationRow[];
      credits: any[];
      reversals: any[];
      auditEvents: any[];
      errors: string[];
    };
  }
  if (!environment) {
    return {
      offers: [],
      obligations: [],
      credits: [],
      reversals: [],
      auditEvents: [],
      errors: [] as string[],
    };
  }
  const supabase = createServiceClient() as any;
  const [offers, obligations, credits, reversals, auditEvents] = await Promise.all([
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
      .from("direct_donation_upgrade_provider_reversals")
      .select(
        "id, offer_id, obligation_id, environment, amount_cents, currency, provider_refunded_at, evidence_source, recorded_at",
      )
      .eq("environment", environment)
      .order("recorded_at", { ascending: false })
      .limit(100),
    supabase
      .from("direct_donation_upgrade_audit_events")
      .select("*, offer:direct_donation_upgrade_offers!inner(environment)")
      .eq("offer.environment", environment)
      .order("created_at", { ascending: false })
      .limit(100),
  ]);
  const errors = [offers, obligations, credits, reversals, auditEvents]
    .map((result) => result.error?.message)
    .filter((message): message is string => Boolean(message));
  return {
    offers: (offers.data ?? []) as DirectDonationUpgradeOfferRow[],
    obligations: (obligations.data ?? []) as DirectDonationUpgradeObligationRow[],
    credits: credits.data ?? [],
    reversals: reversals.data ?? [],
    auditEvents: auditEvents.data ?? [],
    errors,
  };
}

export default async function DonationUpgradeAdminPage({ searchParams }: PageProps) {
  const [viewer, security, resolvedSearchParams] = await Promise.all([
    requireViewer("/admin/donation-upgrades"),
    loadBackgroundAccountSecuritySummary(),
    searchParams,
  ]);
  const access = evaluateAdminOperatorAccess({
    email: viewer.authUser.email,
    mfaSummary: security,
  });
  const config = getDirectDonationUpgradeConfig();
  const snapshot = access.allowed ? await loadSnapshot(config.environment) : null;
  const formMessage = getFormMessage(resolvedSearchParams);
  const needsReview =
    snapshot?.offers.filter((offer) => offer.status === "needs_review") ?? [];
  const postCompletionExceptions =
    snapshot?.offers.filter(
      (offer) => offer.status === "post_completion_exception",
    ) ?? [];
  const defaulted =
    snapshot?.offers.filter((offer) => offer.status === "defaulted") ?? [];
  const verifiedObligations =
    snapshot?.obligations.filter(
      (obligation) => obligation.status === "verified",
    ) ?? [];
  const providerReversedObligations =
    snapshot?.obligations.filter(
      (obligation) => obligation.status === "provider_reversed",
    ) ?? [];
  const openObligations =
    snapshot?.obligations.filter((obligation) =>
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
        <section
          className="section section-white trade-workflow-shell"
          aria-labelledby="direct-upgrade-admin-heading"
        >
          <SectionHeader
            eyebrow="Donation Upgrade operations"
            id="direct-upgrade-admin-heading"
            title="Inspect confirmations, provider refunds, mismatches, and current credit."
          >
            This console does not prove a donation from a browser return and
            does not execute refunds. Authenticated Every.org confirmation and
            authoritative Every.org refund evidence remain separate, auditable
            provider records.
          </SectionHeader>
          <div className="form-actions">
            <Link className="button button-secondary" href="/admin">
              Back to admin
            </Link>
            <Link className="button button-secondary" href="/donation-upgrades">
              Public directory
            </Link>
          </div>

          {formMessage ? (
            <div
              className={`status-banner ${
                formMessage.tone === "error" ? "status-banner-error" : ""
              }`}
              role="status"
            >
              {formMessage.text}
            </div>
          ) : null}

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
                <article className="panel data-card">
                  <p className="detail-kicker">Mode</p>
                  <h2>{config.mode}</h2>
                </article>
                <article className="panel data-card">
                  <p className="detail-kicker">Offers</p>
                  <h2>{snapshot.offers.length}</h2>
                </article>
                <article className="panel data-card">
                  <p className="detail-kicker">Open obligations</p>
                  <h2>{openObligations.length}</h2>
                </article>
                <article className="panel data-card">
                  <p className="detail-kicker">Needs review</p>
                  <h2>{needsReview.length}</h2>
                </article>
                <article className="panel data-card">
                  <p className="detail-kicker">Post-completion exceptions</p>
                  <h2>{postCompletionExceptions.length}</h2>
                </article>
                <article className="panel data-card">
                  <p className="detail-kicker">Provider refunds</p>
                  <h2>{snapshot.reversals.length}</h2>
                </article>
                <article className="panel data-card">
                  <p className="detail-kicker">Defaults</p>
                  <h2>{defaulted.length}</h2>
                </article>
                <article className="panel data-card">
                  <p className="detail-kicker">Historical impact records</p>
                  <h2>{snapshot.credits.length}</h2>
                </article>
              </div>

              <SectionHeader
                eyebrow="Provider refund recording"
                id="direct-upgrade-refund-heading"
                title="Record an authoritative full Every.org refund without rewriting history."
              >
                This AAL2-gated action records a provider fact. It does not ask
                Every.org to issue a refund, move money, or infer that a
                participant defaulted. The action derives charge, donation,
                recipient, amount, currency, participant, offer, and environment
                from the immutable verified obligation. The evidence reference
                is hashed before storage; do not enter donor names, donor email,
                payment data, or a raw webhook body.
              </SectionHeader>
              <div className="data-grid">
                {verifiedObligations.map((obligation) => (
                  <article
                    className="panel data-card data-card-wide"
                    key={obligation.id}
                  >
                    <p className="detail-kicker">
                      verified · {obligation.participant_role}
                    </p>
                    <h3>
                      {formatDirectDonationUpgradeUsd(
                        obligation.provider_gross_amount_cents ??
                          obligation.expected_amount_cents,
                      )}{" "}
                      to {obligation.expected_recipient.name}
                    </h3>
                    <p>
                      Confirmed by Every.org
                      {obligation.provider_donation_date ? (
                        <>
                          {" "}on{" "}
                          <DirectUpgradeLocalDateTime
                            value={obligation.provider_donation_date}
                          />
                        </>
                      ) : null}
                      . Rare fraud-related refunds can later occur.
                    </p>
                    <form
                      action={recordDirectDonationUpgradeProviderRefundAction}
                      className="form-stack"
                    >
                      <input
                        name="obligation_id"
                        type="hidden"
                        value={obligation.id}
                      />
                      <label>
                        Every.org refund timestamp
                        <input
                          name="provider_refunded_at"
                          type="datetime-local"
                          required
                        />
                      </label>
                      <label>
                        Authoritative evidence source
                        <select name="evidence_source" defaultValue="" required>
                          <option value="" disabled>
                            Select source
                          </option>
                          <option value="every_org_dashboard">
                            Every.org dashboard
                          </option>
                          <option value="every_org_support">
                            Every.org support
                          </option>
                        </select>
                      </label>
                      <label>
                        Evidence reference
                        <input
                          name="evidence_reference"
                          type="text"
                          minLength={8}
                          maxLength={500}
                          autoComplete="off"
                          placeholder="Dashboard record or support-ticket reference; no donor PII"
                          required
                        />
                      </label>
                      <label className="check-row">
                        <input
                          name="authority_confirmation"
                          type="checkbox"
                          value="yes"
                          required
                        />
                        <span>
                          I verified authoritative Every.org dashboard or
                          support evidence of a full refund for this exact
                          obligation. I understand this records a provider event
                          and does not execute a refund.
                        </span>
                      </label>
                      <button className="button button-primary" type="submit">
                        Record provider refund
                      </button>
                    </form>
                  </article>
                ))}
                {!verifiedObligations.length ? (
                  <article className="panel data-card">
                    <h3>No verified obligation awaits a first refund record</h3>
                  </article>
                ) : null}
              </div>

              <SectionHeader
                eyebrow="Recorded provider refunds"
                id="direct-upgrade-reversals-heading"
                title="Original confirmation remains; current credit excludes the reversal."
              />
              <div className="data-grid">
                {snapshot.reversals.map((reversal: any) => (
                  <article className="panel data-card" key={reversal.id}>
                    <p className="detail-kicker">provider refund recorded</p>
                    <h3>
                      {formatDirectDonationUpgradeUsd(reversal.amount_cents)}{" "}
                      {reversal.currency}
                    </h3>
                    <p>
                      Provider refund time:{" "}
                      <DirectUpgradeLocalDateTime
                        value={String(reversal.provider_refunded_at)}
                      />
                    </p>
                    <p className="field-note">
                      Source: {statusLabel(reversal.evidence_source)}. Moral
                      Trade recorded this provider evidence; Moral Trade did not
                      process or issue the refund.
                    </p>
                    <Link
                      className="button button-secondary"
                      href={`/donation-upgrades/${reversal.offer_id}`}
                    >
                      Open participant-safe detail
                    </Link>
                  </article>
                ))}
                {!snapshot.reversals.length ? (
                  <article className="panel data-card">
                    <h3>No provider refund has been recorded</h3>
                  </article>
                ) : null}
              </div>

              <SectionHeader
                eyebrow="Review queue"
                id="direct-upgrade-review-heading"
                title="Any exact mismatch freezes the offer."
              />
              <div className="data-grid">
                {[...needsReview, ...postCompletionExceptions].map((offer) => (
                  <article
                    className="panel data-card data-card-wide"
                    key={offer.id}
                  >
                    <p className="detail-kicker">
                      {offer.failure_code || statusLabel(offer.status)}
                    </p>
                    <h3>{offer.upgraded_recipient.name}</h3>
                    <p>
                      {offer.failure_message ||
                        "Review the provider and immutable audit records."}
                    </p>
                    <Link
                      className="button button-secondary"
                      href={`/donation-upgrades/${offer.id}`}
                    >
                      Open participant-safe detail
                    </Link>
                  </article>
                ))}
                {!needsReview.length && !postCompletionExceptions.length ? (
                  <article className="panel data-card">
                    <h3>No mismatch or post-completion exception awaits review</h3>
                  </article>
                ) : null}
              </div>

              <SectionHeader
                eyebrow="Recent obligations"
                id="direct-upgrade-obligations-heading"
                title="Exact participant, branch, amount, recipient, and current provider state."
              />
              <div className="data-grid">
                {snapshot.obligations.slice(0, 40).map((obligation) => (
                  <article className="panel data-card" key={obligation.id}>
                    <p className="detail-kicker">
                      {obligation.participant_role} ·{" "}
                      {statusLabel(obligation.status)}
                    </p>
                    <h3>
                      {formatDirectDonationUpgradeUsd(
                        obligation.expected_amount_cents,
                      )}{" "}
                      to {obligation.expected_recipient.name}
                    </h3>
                    <p>
                      Due <DirectUpgradeLocalDateTime value={obligation.due_at} />
                    </p>
                    <p className="field-note">
                      {obligation.provider_charge_id_hash
                        ? `Charge hash ${obligation.provider_charge_id_hash.slice(0, 18)}…`
                        : "No provider charge recorded"}
                    </p>
                    {obligation.status === "provider_reversed" ? (
                      <p>
                        Provider refund recorded. The historical confirmation
                        remains; current credited impact excludes this
                        obligation.
                      </p>
                    ) : null}
                    {obligation.failure_message ? (
                      <p>{obligation.failure_message}</p>
                    ) : null}
                  </article>
                ))}
                {!snapshot.obligations.length ? (
                  <article className="panel data-card">
                    <h3>No obligation records</h3>
                  </article>
                ) : null}
              </div>

              <SectionHeader
                eyebrow="Audit"
                id="direct-upgrade-audit-heading"
                title="Most recent immutable lifecycle events."
              />
              <div className="data-grid">
                {snapshot.auditEvents.slice(0, 40).map((event: any) => (
                  <article className="panel data-card" key={event.id}>
                    <p className="detail-kicker">
                      {statusLabel(event.event_type)}
                    </p>
                    <h3>{String(event.offer_id ?? "platform event").slice(0, 18)}…</h3>
                    <p>
                      <DirectUpgradeLocalDateTime
                        value={String(event.created_at)}
                      />
                    </p>
                  </article>
                ))}
              </div>

              {providerReversedObligations.length !== snapshot.reversals.length ? (
                <div className="status-banner status-banner-error">
                  Provider-reversed obligation and reversal-record counts do not
                  agree. Treat this environment as requiring review.
                </div>
              ) : null}
            </>
          )}
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
