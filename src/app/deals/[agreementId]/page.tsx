import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { SiteFooter } from "@/components/layout/site-footer";
import { SiteTopbar } from "@/components/layout/site-topbar";
import type { DealroomTerms } from "@/components/marketplace/dealroom-terms-editor";
import { LocalDateTime } from "@/components/ui/local-date-time";
import { getAgreementForUser, requireViewer } from "@/lib/app-data";
import { getFormMessage } from "@/lib/form-state";
import { getPrimaryNavLinks, getTopbarActions } from "@/lib/site";

import { DealroomHistory } from "./dealroom-history";
import { DealroomMainSections } from "./dealroom-main-sections";
import {
  buildLifecycleStages,
  formatDealroomState,
} from "./dealroom-state";
import styles from "./dealroom.module.css";

export const metadata: Metadata = {
  title: "Agreement dealroom",
  robots: { index: false, follow: false },
};

interface DealroomPageProps {
  params: Promise<{ agreementId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function DealroomPage({
  params,
  searchParams,
}: DealroomPageProps) {
  const [{ agreementId }, resolvedSearchParams] = await Promise.all([
    params,
    searchParams,
  ]);
  const returnTo = `/deals/${agreementId}`;
  const viewer = await requireViewer(returnTo);
  const agreement = await getAgreementForUser(agreementId, viewer.authUser.id);

  if (!agreement) notFound();

  const formMessage = getFormMessage(resolvedSearchParams);
  const proposerName = agreement.proposer?.resolvedName ?? "Proposer";
  const responderName = agreement.responder?.resolvedName ?? "Responder";
  const defaultStructuredTerms =
    agreement.structured_terms ||
    agreement.offer?.offer_action ||
    "State both commitments, burdens, and the expected moral surplus.";
  const defaultEvidenceRule =
    agreement.evidence_rule ||
    agreement.offer?.verification ||
    "Name the receipts, logs, attestations, or provider records that will count.";
  const initialTerms: DealroomTerms = {
    structuredTerms: defaultStructuredTerms,
    noTradeBaseline: agreement.no_trade_baseline,
    counterfactualDeclaration: agreement.counterfactual_declaration,
    durationTerms: agreement.duration_terms,
    exitConditions: agreement.exit_conditions,
    evidenceRule: defaultEvidenceRule,
    privacyScope: agreement.privacy_scope,
    disclosureScope: agreement.disclosure_scope,
  };
  const hasRecordedTerms = Boolean(
    initialTerms.structuredTerms.trim() &&
      initialTerms.noTradeBaseline.trim() &&
      initialTerms.durationTerms.trim() &&
      initialTerms.exitConditions.trim() &&
      initialTerms.evidenceRule.trim(),
  );
  const sortedEvents = [...agreement.events].sort(
    (left, right) => Date.parse(right.created_at) - Date.parse(left.created_at),
  );
  const stages = buildLifecycleStages({
    agreementStatus: agreement.status,
    completionState: agreement.completion_state,
    eventTypes: new Set(sortedEvents.map((event) => event.event_type)),
    evidenceCount: agreement.evidenceItems.length,
    hasRecordedTerms,
    reviewStatuses: new Set(
      agreement.reviewCases.map((reviewCase) => reviewCase.status),
    ),
  });
  const currentStage = stages[
    stages.reduce(
      (highest, stage, index) => (stage.reached ? index : highest),
      0,
    )
  ];

  return (
    <div className="page-shell marketplace-app-shell">
      <header className="hero">
        <SiteTopbar
          brandHref="/"
          links={getPrimaryNavLinks(true)}
          {...getTopbarActions(true)}
          showLogout
        />

        <div className="hero-grid">
          <section className="hero-copy">
            <p className="eyebrow">Private agreement dealroom</p>
            <h1>Negotiate, revise, and confirm one shared record.</h1>
            <p className="hero-text">
              Compare commitments side by side, revise explicit terms, record a
              counteroffer, and follow the agreement lifecycle without treating draft
              language as a completed or verified trade.
            </p>
            <div className="hero-actions">
              <Link className="button button-secondary" href="/commitments">
                Back to commitments
              </Link>
              <Link
                className="button button-secondary"
                href={`/agreements/${agreement.id}`}
              >
                Open full agreement record
              </Link>
            </div>
          </section>

          <aside className={`hero-panel panel ${styles.statusPanel}`}>
            <span className={styles.statusTag}>
              {formatDealroomState(agreement.status)}
            </span>
            <h2>{currentStage?.label ?? "Agreement opened"}</h2>
            <dl className={styles.statusMeta}>
              <div>
                <dt>Parties</dt>
                <dd>{proposerName} ↔ {responderName}</dd>
              </div>
              <div>
                <dt>Source</dt>
                <dd>{formatDealroomState(agreement.source)}</dd>
              </div>
              <div>
                <dt>Completion review</dt>
                <dd>{formatDealroomState(agreement.completion_state)}</dd>
              </div>
              <div>
                <dt>Updated</dt>
                <dd>
                  <LocalDateTime
                    fallback="Update time unavailable"
                    value={agreement.updated_at}
                  />
                </dd>
              </div>
            </dl>
          </aside>
        </div>
      </header>

      <main id="main-content" tabIndex={-1}>
        {formMessage ? (
          <div
            className={`status-banner ${
              formMessage.tone === "error"
                ? "status-banner-error"
                : "status-banner-success"
            }`}
          >
            {formMessage.text}
          </div>
        ) : null}

        {agreement.status === "cancelled" ? (
          <div className="status-banner status-banner-error" role="status">
            This agreement is cancelled. Its terms and history remain available as a
            record, but the dealroom does not present it as active.
          </div>
        ) : null}

        <DealroomMainSections
          agreement={agreement}
          defaultStructuredTerms={defaultStructuredTerms}
          initialTerms={initialTerms}
          proposerName={proposerName}
          responderName={responderName}
          returnTo={returnTo}
          stages={stages}
        />
        <DealroomHistory agreement={agreement} sortedEvents={sortedEvents} />
      </main>

      <SiteFooter />
    </div>
  );
}
