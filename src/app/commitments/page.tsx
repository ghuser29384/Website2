import type { Metadata } from "next";
import Link from "next/link";

import { SiteFooter } from "@/components/layout/site-footer";
import { SiteTopbar } from "@/components/layout/site-topbar";
import {
  CommitmentStatusBadge,
  MarketplaceBottomNav,
} from "@/components/marketplace/marketplace-components";
import { listAgreementsForUser, requireViewer } from "@/lib/app-data";
import {
  getCommitmentStatusLabel,
  mapAgreementToCommitmentStatus,
} from "@/lib/marketplace-deals";
import { formatMode } from "@/lib/offers";
import { getPrimaryNavLinks, getTopbarActions } from "@/lib/site";
import { hasSupabaseEnv } from "@/lib/supabase/config";

export const metadata: Metadata = {
  title: "Commitments",
  robots: {
    follow: false,
    index: false,
  },
};

function formatDate(value: string | null | undefined) {
  if (!value) return "Not set";
  const timestamp = Date.parse(value);
  return Number.isNaN(timestamp) ? "Date unavailable" : new Date(timestamp).toLocaleDateString();
}

function summarizeAgreement(agreement: Awaited<ReturnType<typeof listAgreementsForUser>>[number]) {
  const status = mapAgreementToCommitmentStatus(agreement);
  const latestPayment = agreement.payments[0] ?? null;
  const latestEvidence = agreement.evidenceItems[0] ?? null;
  const latestReview = agreement.reviewCases[0] ?? null;
  const evidenceDueBond = agreement.performanceBonds.find((bond) => bond.status === "evidence_due") ?? null;

  return {
    chargeState: latestPayment
      ? `${latestPayment.status.replaceAll("_", " ")} (${latestPayment.authorization_status.replaceAll("_", " ")})`
      : "No payment record",
    counterparty: agreement.counterparty?.resolvedName ?? "Counterparty private",
    evidenceState: latestEvidence
      ? `${latestEvidence.status.replaceAll("_", " ")} submitted ${formatDate(latestEvidence.created_at)}`
      : evidenceDueBond
        ? `Evidence due ${formatDate(evidenceDueBond.evidence_due_at)}`
        : "No evidence item yet",
    href: `/agreements/${agreement.id}`,
    reviewState: latestReview ? latestReview.status.replaceAll("_", " ") : "No review case",
    status,
    statusLabel: getCommitmentStatusLabel(status),
  };
}

export default async function CommitmentsPage() {
  const supabaseReady = hasSupabaseEnv();
  const viewer = supabaseReady ? await requireViewer("/commitments") : null;
  const agreements = viewer ? await listAgreementsForUser(viewer.authUser.id) : [];
  const summaries = agreements.map((agreement) => ({
    agreement,
    summary: summarizeAgreement(agreement),
  }));
  const statusCounts = summaries.reduce<Record<string, number>>((counts, entry) => {
    counts[entry.summary.status] = (counts[entry.summary.status] ?? 0) + 1;
    return counts;
  }, {});

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
            <p className="eyebrow">Commitments</p>
            <h1>Your conditional pledges and trades.</h1>
            <p className="hero-text">
              Track draft, authorized, active, review, charged, released, completed, refunded, and
              disputed states without turning saved offers or examples into fake commitments.
            </p>
            <div className="hero-actions">
              <Link className="button button-primary" href="/offers">
                Browse marketplace
              </Link>
              <Link className="button button-secondary" href="/saved-offers">
                Saved offers
              </Link>
            </div>
          </section>
          <aside className="hero-panel panel">
            <p className="eyebrow">Status center</p>
            <div className="flow-card">
              {[
                "Draft",
                "Authorized",
                "Pending match",
                "Evidence due",
                "Under review",
                "Completed",
              ].map((label, index) => (
                <div className="flow-step" key={label}>
                  <span className="flow-number">{String(index + 1).padStart(2, "0")}</span>
                  <div>
                    <strong>{label}</strong>
                    <p>{statusCounts[label.toLowerCase().replaceAll(" ", "_")] ?? 0} current</p>
                  </div>
                </div>
              ))}
            </div>
          </aside>
        </div>
      </header>

      <main id="main-content" tabIndex={-1}>
        <section className="section section-white commitments-center" aria-labelledby="commitments-heading">
          <div className="section-head section-head-compact">
            <p className="eyebrow">Order center</p>
            <h2 id="commitments-heading">Commitment tracking</h2>
            <p>
              Rows are backed by existing agreements, payments, evidence items, review cases, and
              performance bonds. If there is no backend row, no commitment is shown.
            </p>
          </div>

          {supabaseReady ? (
            summaries.length ? (
              <div className="commitment-list">
                {summaries.map(({ agreement, summary }) => (
                  <article className="commitment-row panel" key={agreement.id}>
                    <div className="commitment-row-main">
                      <CommitmentStatusBadge status={summary.status} />
                      <div>
                        <h3>
                          {agreement.offer
                            ? `${agreement.offer.offered_cause} for ${agreement.offer.requested_cause}`
                            : "Agreement without public offer"}
                        </h3>
                        <p>
                          {agreement.offer
                            ? formatMode(agreement.offer.mode)
                            : agreement.source.replaceAll("_", " ")}
                          {" · "}
                          {summary.counterparty}
                        </p>
                      </div>
                    </div>
                    <dl className="deal-economics-grid">
                      <div>
                        <dt>Charge state</dt>
                        <dd>{summary.chargeState}</dd>
                      </div>
                      <div>
                        <dt>Evidence</dt>
                        <dd>{summary.evidenceState}</dd>
                      </div>
                      <div>
                        <dt>Review</dt>
                        <dd>{summary.reviewState}</dd>
                      </div>
                      <div>
                        <dt>Created</dt>
                        <dd>{formatDate(agreement.created_at)}</dd>
                      </div>
                    </dl>
                    <div className="offer-actions">
                      <Link className="button button-secondary button-mini" href={summary.href}>
                        View agreement
                      </Link>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <div className="empty-state marketplace-empty-state">
                <div>
                  <strong>No commitments yet.</strong>
                  <p>
                    Saved offers, examples, searches, and marketplace previews are not commitments.
                    Agreements will appear here only after the existing acceptance flow creates one.
                  </p>
                  <Link className="button button-primary" href="/offers">
                    Browse marketplace
                  </Link>
                </div>
              </div>
            )
          ) : (
            <div className="empty-state marketplace-empty-state">
              <div>
                <strong>Commitment data unavailable.</strong>
                <p>
                  Supabase is not configured in this environment, so the page cannot load real
                  agreements. No demo commitments are shown.
                </p>
              </div>
            </div>
          )}
        </section>
      </main>

      <MarketplaceBottomNav active="pledges" />
      <SiteFooter />
    </div>
  );
}
