import type { Metadata } from "next";
import Link from "next/link";

import { startTradeDonationPoolBundleCheckoutAction } from "@/app/trade-donation-pool-actions";
import { PendingSubmitButton } from "@/components/core-trade/pending-submit-button";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteTopbar } from "@/components/layout/site-topbar";
import { LocalDateTime } from "@/components/ui/local-date-time";
import { evaluateAdminOperatorAccess } from "@/lib/admin";
import { requireViewer } from "@/lib/app-data";
import { loadBackgroundAccountSecuritySummary } from "@/lib/background-account-security";
import { getFormMessage } from "@/lib/form-state";
import { getPrimaryNavLinks, getTopbarActions } from "@/lib/site";
import {
  loadTradeDonationPoolAdminSnapshot,
  type TradeDonationPoolBundleRow,
} from "@/lib/trade-donation-pool";
import { formatUsdFromCents } from "@/lib/trade-donation";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  title: "Pooled donation settlement",
  robots: { index: false, follow: false },
};

interface PageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

function stateLabel(value: string) {
  return value.replaceAll("_", " ");
}

function manifestItemCount(bundle: TradeDonationPoolBundleRow) {
  return Array.isArray(bundle.manifest?.items) ? bundle.manifest.items.length : 0;
}

export default async function TradeDonationPoolsAdminPage({ searchParams }: PageProps) {
  const [viewer, security, resolvedSearchParams] = await Promise.all([
    requireViewer("/admin/trade-donation-pools"),
    loadBackgroundAccountSecuritySummary(),
    searchParams,
  ]);
  const access = evaluateAdminOperatorAccess({
    email: viewer.authUser.email,
    mfaSummary: security,
  });
  const formMessage = getFormMessage(resolvedSearchParams);
  const snapshot = access.allowed ? await loadTradeDonationPoolAdminSnapshot() : null;

  return (
    <div className="page-shell marketplace-app-shell trade-workflow-shell">
      <header className="v72-route-header">
        <SiteTopbar
          brandHref="/"
          links={getPrimaryNavLinks(true)}
          {...getTopbarActions(true)}
          showSearch={false}
          showLogout
        />
      </header>
      <main id="main-content" tabIndex={-1}>
        {formMessage ? (
          <div
            className={`status-banner ${
              formMessage.tone === "error" ? "status-banner-error" : "status-banner-success"
            }`}
            role="status"
          >
            {formMessage.text}
          </div>
        ) : null}

        <section className="section section-white" aria-labelledby="pool-admin-heading">
          <div className="section-head section-head-compact">
            <p className="eyebrow">Platform-paid pooled settlement</p>
            <h1 id="pool-admin-heading">Reconcile exact sub-$10 obligations before provider payment.</h1>
            <p>
              Participants fund Moral Trade through Stripe. Compatible obligations freeze into one immutable manifest. An operator may open Every.org only when the configured environment and gates permit it. Every provider mismatch activates zero component agreements.
            </p>
            <div className="form-actions">
              <Link className="button button-secondary" href="/admin">Back to admin</Link>
              <Link className="button button-secondary" href="/connectors">Connector registry</Link>
            </div>
          </div>

          {!access.allowed || !snapshot ? (
            <article className="panel data-card data-card-wide">
              <div className="status-banner status-banner-error">
                <strong>Operator access blocked</strong>
                <p>{access.message}</p>
              </div>
            </article>
          ) : (
            <>
              <div className="pilot-metric-grid">
                <article className="panel data-card">
                  <p className="detail-kicker">Mode</p>
                  <h2>{snapshot.config.mode}</h2>
                  <p className="route-text">
                    {snapshot.config.readyForParticipantFunding
                      ? "Participant funding enabled in this environment."
                      : snapshot.config.blockers[0] ?? "Fail-closed."}
                  </p>
                </article>
                <article className="panel data-card">
                  <p className="detail-kicker">Open obligations</p>
                  <h2>{snapshot.obligations.filter((item) => !["settled", "refunded", "cancelled"].includes(item.status)).length}</h2>
                  <p className="route-text">Private participant funding and allocation records.</p>
                </article>
                <article className="panel data-card">
                  <p className="detail-kicker">Frozen bundles</p>
                  <h2>{snapshot.bundles.filter((bundle) => ["frozen", "checkout_started"].includes(bundle.status)).length}</h2>
                  <p className="route-text">Immutable manifests awaiting exact provider settlement.</p>
                </article>
                <article className="panel data-card">
                  <p className="detail-kicker">Stripe account</p>
                  <h2>{snapshot.stripeAccount.reachable ? "Reachable" : "Blocked"}</h2>
                  <p className="route-text">
                    Charges {snapshot.stripeAccount.chargesEnabled ? "enabled" : "not enabled"}; details {snapshot.stripeAccount.detailsSubmitted ? "submitted" : "incomplete"}.
                  </p>
                </article>
              </div>

              <div className="section-head section-head-compact">
                <p className="eyebrow">Environment gates</p>
                <h2>Every gate remains visible; none is inferred from a code deploy.</h2>
              </div>
              <div className="data-grid">
                {snapshot.gates.map((gate) => (
                  <article className="panel data-card" key={gate.gate_key}>
                    <p className="detail-kicker">{gate.status}</p>
                    <h3>{stateLabel(gate.gate_key)}</h3>
                    <p className="route-text">{gate.notes}</p>
                    <small>
                      Updated <LocalDateTime value={gate.updated_at} fallback={gate.updated_at} />
                    </small>
                  </article>
                ))}
              </div>

              <div className="section-head section-head-compact">
                <p className="eyebrow">Provider bundles</p>
                <h2>One Every.org payment, exact component allocation.</h2>
                <p>
                  The operator action is available only for a frozen or already-started, internally consistent bundle in a ready environment. Resuming reuses the bundle&apos;s immutable partner donation ID. Participant identities stay out of Every.org metadata.
                </p>
              </div>
              <div className="data-grid">
                {snapshot.bundles.length ? (
                  snapshot.bundles.map((bundle) => (
                    <article className="panel data-card data-card-wide" key={bundle.id}>
                      <div className="profile-card-head">
                        <div>
                          <p className="detail-kicker">{stateLabel(bundle.status)}</p>
                          <h3>{formatUsdFromCents(bundle.amount_cents)} to {bundle.target_name}</h3>
                        </div>
                        <span className="badge">{bundle.environment}</span>
                      </div>
                      <dl className="detail-grid">
                        <div><dt>Manifest items</dt><dd>{manifestItemCount(bundle)}</dd></div>
                        <div><dt>Ledger allocation total</dt><dd>{formatUsdFromCents(bundle.allocation_total_cents)}</dd></div>
                        <div><dt>Manifest hash</dt><dd>{bundle.manifest_hash.slice(0, 20)}…</dd></div>
                        <div><dt>Recipient</dt><dd>{bundle.nonprofit_slug}{bundle.nonprofit_ein ? ` · ${bundle.nonprofit_ein}` : ""}</dd></div>
                        <div><dt>Frozen</dt><dd><LocalDateTime value={bundle.frozen_at} fallback={bundle.frozen_at} /></dd></div>
                        <div><dt>Provider state</dt><dd>{bundle.provider_charge_id_hash ? "charge recorded" : "no charge recorded"}</dd></div>
                      </dl>
                      {bundle.failure_message ? (
                        <div className="status-banner status-banner-error">
                          <strong>{bundle.failure_code || "Review required"}</strong>
                          <p>{bundle.failure_message}</p>
                        </div>
                      ) : null}
                      {["frozen", "checkout_started"].includes(bundle.status) ? (
                        <form action={startTradeDonationPoolBundleCheckoutAction}>
                          <input name="bundle_id" type="hidden" value={bundle.id} />
                          <PendingSubmitButton
                            className="button button-primary"
                            pendingLabel={
                              bundle.status === "checkout_started"
                                ? "Resuming Every.org..."
                                : "Opening Every.org..."
                            }
                            disabled={!snapshot.config.readyForProviderCheckout}
                          >
                            {bundle.status === "checkout_started"
                              ? "Resume Every.org checkout"
                              : "Pay consolidated bundle through Every.org"}
                          </PendingSubmitButton>
                        </form>
                      ) : null}
                    </article>
                  ))
                ) : (
                  <article className="panel data-card">
                    <h3>No bundle records in this environment</h3>
                    <p className="route-text">A bundle appears only after compatible signed Stripe funding reaches at least $10.</p>
                  </article>
                )}
              </div>

              <div className="section-head section-head-compact">
                <p className="eyebrow">Participant obligations</p>
                <h2>Funding, refund, dispute, and allocation states.</h2>
              </div>
              <div className="data-grid">
                {snapshot.obligations.slice(0, 50).map((obligation) => (
                  <article className="panel data-card" key={obligation.id}>
                    <p className="detail-kicker">{stateLabel(obligation.status)}</p>
                    <h3>{formatUsdFromCents(obligation.amount_cents)} · {obligation.target_name}</h3>
                    <p className="route-text">Agreement {obligation.agreement_id.slice(0, 12)}…</p>
                    <dl className="detail-grid">
                      <div><dt>Condition</dt><dd>{obligation.condition_hash.slice(0, 16)}…</dd></div>
                      <div><dt>Bundle</dt><dd>{obligation.bundle_id ? `${obligation.bundle_id.slice(0, 12)}…` : "Not frozen"}</dd></div>
                      <div><dt>Funded</dt><dd>{obligation.funded_at ? <LocalDateTime value={obligation.funded_at} fallback={obligation.funded_at} /> : "No"}</dd></div>
                      <div><dt>Disclosures</dt><dd>{obligation.disclosure_version}</dd></div>
                    </dl>
                    {obligation.failure_message ? <p className="route-text">{obligation.failure_message}</p> : null}
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
