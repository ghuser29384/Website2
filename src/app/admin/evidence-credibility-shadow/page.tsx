import type { Metadata } from "next";
import Link from "next/link";

import {
  recordEvidenceCredibilityShadowAction,
  recordSettlementCredibilityShadowAction,
} from "@/app/admin/evidence-credibility-shadow-actions";
import { PendingSubmitButton } from "@/components/core-trade/pending-submit-button";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteTopbar } from "@/components/layout/site-topbar";
import { LocalDateTime } from "@/components/ui/local-date-time";
import { requireViewer } from "@/lib/app-data";
import { loadBackgroundAccountSecuritySummary } from "@/lib/background-account-security";
import { getFormMessage } from "@/lib/form-state";
import { getPrimaryNavLinks, getTopbarActions } from "@/lib/site";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  title: "Private credibility shadow collection",
  robots: { index: false, follow: false },
};

interface CollectionPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

type QueueKind = "evidence" | "settlement";

type CollectionQueueItem = {
  kind: QueueKind;
  queueKey: string;
  agreementId: string;
  milestoneId: string;
  payoutId: string | null;
  sourceReviewId: string | null;
  sourcePaymentReviewDecisionId: string | null;
  currentDecisionId: string | null;
  requiresSupersession: boolean;
  actionCategory: string;
  description: string;
  sourceStatus: string;
  sourceKind: string;
  sourceOutcome: string | null;
  suggestedFinalityReason: string;
  allowedFinalityReasons: string[];
  derivedAdjudicationClass: string;
  performerId: string;
  payerId: string;
  payeeId: string;
  unitsTotal: number | string | null;
  completionUnits: number | string | null;
  payoutFactorBand: number | null;
  amountDueCents: number | null;
  currency: string | null;
  sourceFinalizedAt: string | null;
  shadowOnly: true;
};

const CONFIDENCE_BANDS = [100, 75, 50, 25, 0] as const;
const PROVENANCE_CLASSES = [
  "platform_observed",
  "authenticated_provider",
  "independent_third_party",
  "bilateral_confirmation",
  "self_report",
] as const;
const PROVIDER_AUTHENTICATION_STATES = [
  "not_applicable",
  "authenticated",
  "unverified",
  "failed",
  "manual_review_required",
] as const;
const CONTRADICTION_STATES = [
  "not_assessed",
  "none",
  "innocent",
  "materially_reckless",
  "deliberate",
] as const;
const INTEGRITY_FINDINGS = [
  "not_assessed",
  "supported_honest",
  "reckless_misleading",
  "deliberate_fabrication",
] as const;
const RESPONSIVENESS_FINDINGS = [
  "not_assessed",
  "on_time",
  "late_cure",
  "missed_deadline",
  "excused",
] as const;
const DISPUTE_FINDINGS = [
  "not_assessed",
  "cooperative",
  "obstructive",
  "retaliatory",
  "evidence_destruction",
  "abusive_appeal",
] as const;

function label(value: string | null | undefined) {
  return value ? value.replaceAll("_", " ") : "Not recorded";
}

function formatAmount(amountCents: number | null, currency: string | null) {
  if (!Number.isSafeInteger(amountCents) || !currency) return "Not applicable";
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
    }).format(Number(amountCents) / 100);
  } catch {
    return `${(Number(amountCents) / 100).toFixed(2)} ${currency}`;
  }
}

function parseQueueItems(value: unknown): CollectionQueueItem[] {
  if (!value || typeof value !== "object" || Array.isArray(value)) return [];
  const items = (value as { items?: unknown }).items;
  if (!Array.isArray(items)) return [];
  return items.filter(
    (item): item is CollectionQueueItem =>
      Boolean(
        item &&
          typeof item === "object" &&
          ["evidence", "settlement"].includes(
            String((item as { kind?: unknown }).kind ?? ""),
          ),
      ),
  );
}

function SourceSummary({ item }: { item: CollectionQueueItem }) {
  return (
    <dl className="detail-grid">
      <div>
        <dt>Source</dt>
        <dd>
          {label(item.sourceKind)} · {label(item.sourceStatus)}
        </dd>
      </div>
      <div>
        <dt>Source outcome</dt>
        <dd>{label(item.sourceOutcome)}</dd>
      </div>
      <div>
        <dt>Derived adjudication</dt>
        <dd>{label(item.derivedAdjudicationClass)}</dd>
      </div>
      <div>
        <dt>Final source time</dt>
        <dd>
          {item.sourceFinalizedAt ? (
            <LocalDateTime
              fallback={item.sourceFinalizedAt}
              value={item.sourceFinalizedAt}
            />
          ) : (
            "Unavailable"
          )}
        </dd>
      </div>
      {item.kind === "evidence" ? (
        <>
          <div>
            <dt>Completion</dt>
            <dd>
              {item.completionUnits ?? 0} / {item.unitsTotal ?? "?"}
            </dd>
          </div>
          <div>
            <dt>Frozen payout factor</dt>
            <dd>
              {item.payoutFactorBand == null ? "Not applicable" : `${item.payoutFactorBand}%`}
            </dd>
          </div>
        </>
      ) : (
        <div>
          <dt>Frozen external amount</dt>
          <dd>{formatAmount(item.amountDueCents, item.currency)}</dd>
        </div>
      )}
    </dl>
  );
}

function SharedCollectionFields({ item }: { item: CollectionQueueItem }) {
  const defaultProvenance = item.sourceReviewId || item.sourcePaymentReviewDecisionId
    ? "independent_third_party"
    : "platform_observed";

  return (
    <>
      <div className="field-grid">
        <label className="field">
          <span>Decision confidence</span>
          <select defaultValue="75" name="decision_confidence_band" required>
            {CONFIDENCE_BANDS.map((band) => (
              <option key={band} value={band}>
                {band}%
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>Relied-on provenance</span>
          <select
            defaultValue={defaultProvenance}
            name="primary_provenance_class"
            required
          >
            {PROVENANCE_CLASSES.map((value) => (
              <option key={value} value={value}>
                {label(value)}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="field-grid">
        <label className="field">
          <span>Provider-authentication status</span>
          <select
            defaultValue="not_applicable"
            name="provider_authentication_status"
            required
          >
            {PROVIDER_AUTHENTICATION_STATES.map((value) => (
              <option key={value} value={value}>
                {label(value)}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>Private provider reference</span>
          <input
            maxLength={500}
            name="provider_authentication_ref"
            placeholder="Required only for authenticated-provider provenance"
            type="text"
          />
        </label>
      </div>

      <label className="field">
        <span>Finality reason</span>
        <select
          defaultValue={item.suggestedFinalityReason}
          name="finality_reason"
          required
        >
          {item.allowedFinalityReasons.map((reason) => (
            <option key={reason} value={reason}>
              {label(reason)}
            </option>
          ))}
        </select>
      </label>

      <label className="field">
        <span>Private exclusion or review-required reason</span>
        <textarea
          maxLength={1000}
          name="exclusion_reason"
          placeholder="Required for excluded outcomes and zero-confidence or unresolved decisions"
          rows={3}
        />
      </label>

      <label className="field">
        <span>Private operator rationale</span>
        <textarea
          maxLength={4000}
          name="private_rationale"
          placeholder="Explain the relied-on source, confidence judgment, and finality classification."
          required
          rows={5}
        />
      </label>
    </>
  );
}

function EvidenceCollectionForm({ item }: { item: CollectionQueueItem }) {
  return (
    <form action={recordEvidenceCredibilityShadowAction} className="stack-form">
      <input name="milestone_id" type="hidden" value={item.milestoneId} />
      <input
        name="source_review_id"
        type="hidden"
        value={item.sourceReviewId ?? ""}
      />
      <input
        name="current_decision_id"
        type="hidden"
        value={item.currentDecisionId ?? ""}
      />

      <div className="field-grid">
        <label className="field">
          <span>Contradiction state</span>
          <select defaultValue="not_assessed" name="contradiction_status" required>
            {CONTRADICTION_STATES.map((value) => (
              <option key={value} value={value}>
                {label(value)}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>Evidence-integrity finding</span>
          <select defaultValue="not_assessed" name="integrity_finding" required>
            {INTEGRITY_FINDINGS.map((value) => (
              <option key={value} value={value}>
                {label(value)}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="field-grid">
        <label className="field">
          <span>Responsiveness finding</span>
          <select
            defaultValue="not_assessed"
            name="responsiveness_finding"
            required
          >
            {RESPONSIVENESS_FINDINGS.map((value) => (
              <option key={value} value={value}>
                {label(value)}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>Dispute-conduct finding</span>
          <select
            defaultValue="not_assessed"
            name="dispute_conduct_finding"
            required
          >
            {DISPUTE_FINDINGS.map((value) => (
              <option key={value} value={value}>
                {label(value)}
              </option>
            ))}
          </select>
        </label>
      </div>

      <SharedCollectionFields item={item} />
      <PendingSubmitButton pendingLabel="Recording private judgment…">
        Record evidence shadow judgment
      </PendingSubmitButton>
    </form>
  );
}

function SettlementCollectionForm({ item }: { item: CollectionQueueItem }) {
  return (
    <form action={recordSettlementCredibilityShadowAction} className="stack-form">
      <input name="payout_id" type="hidden" value={item.payoutId ?? ""} />
      <input
        name="source_payment_review_decision_id"
        type="hidden"
        value={item.sourcePaymentReviewDecisionId ?? ""}
      />
      <input
        name="current_decision_id"
        type="hidden"
        value={item.currentDecisionId ?? ""}
      />
      <SharedCollectionFields item={item} />
      <PendingSubmitButton pendingLabel="Recording private judgment…">
        Record settlement shadow judgment
      </PendingSubmitButton>
    </form>
  );
}

export default async function EvidenceCredibilityShadowCollectionPage({
  searchParams,
}: CollectionPageProps) {
  const viewer = await requireViewer("/admin/evidence-credibility-shadow");
  const [resolvedSearchParams, security] = await Promise.all([
    searchParams,
    loadBackgroundAccountSecuritySummary(),
  ]);
  const supabase = await createClient();
  const { data: administratorGrant } = await (supabase as any)
    .from("trade_review_role_grants")
    .select("profile_id")
    .eq("profile_id", viewer.authUser.id)
    .eq("role", "administrator")
    .eq("active", true)
    .is("revoked_at", null)
    .maybeSingle();

  const access = {
    allowed:
      Boolean(administratorGrant?.profile_id) &&
      (security?.verifiedTotpCount ?? 0) >= 1 &&
      security?.currentLevel === "aal2",
    message: !administratorGrant?.profile_id
      ? "This profile does not have an active Moral Trade administrator grant."
      : (security?.verifiedTotpCount ?? 0) < 1
        ? "Enroll a verified authenticator factor before opening private shadow collection."
        : security?.currentLevel !== "aal2"
          ? "Verify the authenticator for this session before opening private shadow collection."
          : "Profile-bound administrator access verified at AAL2.",
  };

  const queueResult = access.allowed
    ? await (supabase as any).rpc("list_credibility_shadow_collection_queue_v1", {
        p_limit: 100,
        p_offset: 0,
      })
    : { data: null, error: null };
  const items = parseQueueItems(queueResult.data);
  const evidenceCount = items.filter((item) => item.kind === "evidence").length;
  const settlementCount = items.length - evidenceCount;
  const formMessage = getFormMessage(resolvedSearchParams);

  return (
    <div className="page-shell marketplace-app-shell trade-workflow-shell">
      <header className="v72-route-header">
        <SiteTopbar
          brandHref="/"
          links={getPrimaryNavLinks(true)}
          {...getTopbarActions(true)}
          showLogout
          showSearch={false}
        />
      </header>

      <main id="main-content" tabIndex={-1}>
        {formMessage ? (
          <div
            className={`status-banner ${
              formMessage.tone === "error"
                ? "status-banner-error"
                : "status-banner-success"
            }`}
            role={formMessage.tone === "error" ? "alert" : "status"}
          >
            {formMessage.text}
          </div>
        ) : null}

        <section
          className="section section-white"
          aria-labelledby="shadow-collection-heading"
        >
          <div className="section-head section-head-compact">
            <p className="eyebrow">Private shadow calibration</p>
            <h1 id="shadow-collection-heading">
              Record final evidence and settlement judgments without changing live credibility.
            </h1>
            <p>
              This queue is restricted to AAL2 administrators. It writes only append-only private
              shadow decisions and an operator audit rationale. Public credibility, ranking,
              exposure, eligibility, safeguards, and restrictions remain unchanged.
            </p>
          </div>

          {!access.allowed ? (
            <article className="panel data-card data-card-wide">
              <div className="status-banner status-banner-error">
                <strong>Private collection access blocked</strong>
                <p>{access.message}</p>
              </div>
              <div className="form-actions">
                <Link className="button button-primary" href="/dashboard#account-security">
                  Open account security
                </Link>
                <Link className="button button-secondary" href="/admin/trade-review">
                  Back to trade review
                </Link>
              </div>
            </article>
          ) : queueResult.error ? (
            <article className="panel data-card data-card-wide">
              <div className="status-banner status-banner-error">
                <strong>The private queue is unavailable.</strong>
                <p>{String(queueResult.error.message ?? "Unknown queue error")}</p>
              </div>
            </article>
          ) : (
            <>
              <div className="pilot-metric-grid">
                <article className="panel data-card">
                  <p className="detail-kicker">Milestone evidence</p>
                  <h2>{evidenceCount}</h2>
                  <p className="route-text">Final sources without a matching current decision.</p>
                </article>
                <article className="panel data-card">
                  <p className="detail-kicker">Settlement</p>
                  <h2>{settlementCount}</h2>
                  <p className="route-text">Final payouts without a matching current decision.</p>
                </article>
                <article className="panel data-card">
                  <p className="detail-kicker">Effect state</p>
                  <h2>Shadow only</h2>
                  <p className="route-text">Every active credibility effect remains disabled.</p>
                </article>
              </div>

              <div className="data-grid">
                {items.map((item) => (
                  <article className="panel data-card data-card-wide" key={item.queueKey}>
                    <div className="profile-card-head">
                      <div>
                        <p className="detail-kicker">
                          {item.kind === "evidence" ? "Milestone evidence" : "Settlement"}
                        </p>
                        <h2>{item.description}</h2>
                      </div>
                      <span className="badge">
                        {item.requiresSupersession ? "Supersession required" : "New decision"}
                      </span>
                    </div>

                    <p className="route-text">
                      {label(item.actionCategory)} · finality candidate{" "}
                      {label(item.suggestedFinalityReason)}
                    </p>
                    <SourceSummary item={item} />

                    <div className="form-actions">
                      <Link
                        className="button button-secondary button-mini"
                        href={`/trade-review/${item.milestoneId}`}
                      >
                        Inspect frozen private source
                      </Link>
                    </div>

                    {item.kind === "evidence" ? (
                      <EvidenceCollectionForm item={item} />
                    ) : (
                      <SettlementCollectionForm item={item} />
                    )}
                  </article>
                ))}

                {!items.length ? (
                  <div className="empty-state">
                    <div>
                      <strong>No final source needs a shadow decision.</strong>
                      <p>
                        The queue will show a new item when a final milestone or settlement source
                        lacks a matching current append-only decision.
                      </p>
                    </div>
                  </div>
                ) : null}
              </div>

              <div className="form-actions">
                <Link className="button button-secondary" href="/admin/trade-review">
                  Back to trade review
                </Link>
                <Link className="button button-secondary" href="/credibility">
                  Review active public-model boundaries
                </Link>
              </div>
            </>
          )}
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
