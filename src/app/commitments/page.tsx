import type { Metadata } from "next";
import Link from "next/link";

import { SiteFooter } from "@/components/layout/site-footer";
import { SiteTopbar } from "@/components/layout/site-topbar";
import { LocalDateTime } from "@/components/ui/local-date-time";
import {
  CommitmentStatusBadge,
  MarketplaceBottomNav,
  MarketplaceRouteShell,
} from "@/components/marketplace/marketplace-components";
import { getViewer, listAgreementsForUser } from "@/lib/app-data";
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
  return <LocalDateTime value={value} fallback="Date unavailable" dateOnly />;
}

function summarizeAgreement(
  agreement: Awaited<ReturnType<typeof listAgreementsForUser>>[number],
) {
  const status = mapAgreementToCommitmentStatus(agreement);
  const latestPayment = agreement.payments[0] ?? null;
  const latestEvidence = agreement.evidenceItems[0] ?? null;
  const latestReview = agreement.reviewCases[0] ?? null;
  const evidenceDueBond =
    agreement.performanceBonds.find((bond) => bond.status === "evidence_due") ??
    null;

  return {
    counterparty: agreement.counterparty?.resolvedName ?? "Counterparty private",
    dealroomHref: `/deals/${agreement.id}`,
    evidenceHref: `/evidence/${agreement.id}`,
    evidenceState: latestEvidence ? (
      <>
        {latestEvidence.status.replaceAll("_", " ")} submitted{" "}
        {formatDate(latestEvidence.created_at)}
      </>
    ) : evidenceDueBond ? (
      <>Evidence due {formatDate(evidenceDueBond.evidence_due_at)}</>
    ) : null,
    fullRecordHref: `/agreements/${agreement.id}`,
    paymentState: latestPayment
      ? `${latestPayment.status.replaceAll("_", " ")} (${latestPayment.authorization_status.replaceAll("_", " ")})`
      : null,
    reviewState: latestReview ? latestReview.status.replaceAll("_", " ") : null,
    status,
    statusLabel: getCommitmentStatusLabel(status),
  };
}

export default async function CommitmentsPage() {
  const supabaseReady = hasSupabaseEnv();
  const viewer = supabaseReady ? await getViewer() : null;
  const agreements = viewer
    ? await listAgreementsForUser(viewer.authUser.id)
    : [];
  const summaries = agreements.map((agreement) => ({
    agreement,
    summary: summarizeAgreement(agreement),
  }));

  return (
    <div className="page-shell marketplace-app-shell">
      <header className="v72-route-header">
        <SiteTopbar
          brandHref="/"
          links={getPrimaryNavLinks(Boolean(viewer))}
          {...getTopbarActions(Boolean(viewer))}
          showSearch={false}
          showLogout={Boolean(viewer)}
        />
      </header>

      <main id="main-content" tabIndex={-1}>
        <MarketplaceRouteShell active="track">
          <section
            className="v72-private-surface commitments-center mt-v75-route-card"
            aria-labelledby="commitments-heading"
          >
            <div className="v72-owner-strip">
              <h1 id="commitments-heading">Deals</h1>
              <p>
                Negotiate terms in the dealroom, then use the full record for evidence,
                review, payment, or dispute controls.
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
                              : "Private introduction agreement"}
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
                          <dt>Stage</dt>
                          <dd>{summary.statusLabel}</dd>
                        </div>
                        {summary.paymentState ? (
                          <div>
                            <dt>Exposure</dt>
                            <dd>{summary.paymentState}</dd>
                          </div>
                        ) : null}
                        {summary.evidenceState ? (
                          <div>
                            <dt>Evidence</dt>
                            <dd>{summary.evidenceState}</dd>
                          </div>
                        ) : null}
                        {summary.reviewState ? (
                          <div>
                            <dt>Review</dt>
                            <dd>{summary.reviewState}</dd>
                          </div>
                        ) : null}
                        <div>
                          <dt>Created</dt>
                          <dd>{formatDate(agreement.created_at)}</dd>
                        </div>
                      </dl>

                      <div className="offer-actions">
                        <Link
                          className="button button-primary button-mini"
                          href={summary.dealroomHref}
                        >
                          Open dealroom
                        </Link>
                        <Link
                          className="button button-secondary button-mini"
                          href={summary.fullRecordHref}
                        >
                          Full agreement record
                        </Link>
                        {summary.evidenceState || summary.reviewState ? (
                          <Link
                            className="button button-secondary button-mini"
                            href={summary.evidenceHref}
                          >
                            Evidence dossier
                          </Link>
                        ) : null}
                      </div>
                    </article>
                  ))}
                </div>
              ) : (
                <div className="empty-state marketplace-empty-state">
                  <div>
                    <strong>
                      {viewer ? "No agreements yet." : "Sign in to view private deals."}
                    </strong>
                    <p>
                      {viewer
                        ? "Saved offers, examples, searches, and marketplace previews are not agreements. A dealroom appears only after the existing acceptance or introduction flow creates a shared record."
                        : "Dealrooms are private. This surface does not create demo agreements, fake evidence rows, or simulated negotiation activity."}
                    </p>
                    <Link
                      className="button button-primary"
                      href={viewer ? "/offers" : "/login?returnTo=/commitments"}
                    >
                      {viewer ? "Browse marketplace" : "Sign in to continue"}
                    </Link>
                  </div>
                </div>
              )
            ) : (
              <div className="empty-state marketplace-empty-state">
                <div>
                  <strong>Agreement data unavailable.</strong>
                  <p>
                    Supabase is not configured in this environment, so the page cannot
                    load real agreements. No demo deals, evidence, or review activity is
                    shown.
                  </p>
                </div>
              </div>
            )}
          </section>
        </MarketplaceRouteShell>
      </main>

      <MarketplaceBottomNav active="track" />
      <SiteFooter />
    </div>
  );
}
