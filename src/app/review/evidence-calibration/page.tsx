import type { Metadata } from "next";
import Link from "next/link";

import { recordEvidenceCredibilityAuditLabelAction } from "@/app/evidence-credibility-audit-actions";
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
  title: "Blinded evidence calibration review",
  robots: { index: false, follow: false },
};

interface EvidenceCalibrationReviewPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

type AuditCase = Record<string, any>;
type EvidenceItem = {
  itemId?: string;
  evidenceType?: string;
  attestation?: string;
  evidenceUrl?: string;
  hasPrivateFile?: boolean;
};

type PaymentReceipt = {
  receiptId?: string;
  provider?: string;
  amountCents?: number;
  currency?: string;
  paidOn?: string;
  hasPrivateFile?: boolean;
};

const EVIDENCE_FINALITIES = [
  "review_final",
  "replacement_success",
  "terminal_rejection",
  "replacement_expired",
  "appeal_affirmed",
  "appeal_overturned",
  "permissible_exit",
  "force_majeure",
  "mutual_cancellation",
  "unjustified_abandonment",
  "unresolved_dispute",
  "late_cure",
  "administrative_correction",
] as const;

const SETTLEMENT_FINALITIES = [
  "confirmed",
  "adjudicated_paid",
  "adjudicated_unpaid",
  "not_due",
  "unresolved_dispute",
  "permissible_cancellation",
  "late_payment_cure",
  "administrative_correction",
] as const;

function humanize(value: unknown) {
  return String(value ?? "")
    .replaceAll("_", " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function formatDate(value: unknown) {
  const text = String(value ?? "");
  return text ? <LocalDateTime value={text} fallback={text} /> : "Not set";
}

function formatMoney(cents: unknown, currency: unknown) {
  const numeric = Number(cents);
  if (!Number.isFinite(numeric)) return "Not set";
  try {
    return new Intl.NumberFormat("en", {
      style: "currency",
      currency: String(currency || "USD"),
    }).format(numeric / 100);
  } catch {
    return `${String(currency || "USD")} ${(numeric / 100).toFixed(2)}`;
  }
}

function asEvidenceItems(value: unknown): EvidenceItem[] {
  return Array.isArray(value) ? (value as EvidenceItem[]) : [];
}

function asPaymentReceipt(value: unknown): PaymentReceipt | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const receipt = value as PaymentReceipt;
  return receipt.receiptId ? receipt : null;
}

function privateFileHref(
  assignmentId: unknown,
  itemKind: "evidence_item" | "payment_receipt",
  itemId: unknown,
) {
  const params = new URLSearchParams({
    assignmentId: String(assignmentId),
    itemId: String(itemId),
    itemKind,
  });
  return `/api/review/evidence-calibration/file?${params.toString()}`;
}

function EvidencePacket({ auditCase }: { auditCase: AuditCase }) {
  const items = asEvidenceItems(auditCase.evidence_items);
  if (!items.length) {
    return (
      <div className="empty-state">
        <div>
          <strong>No evidence item is available in the frozen packet.</strong>
          <p>Record review-required rather than inferring missing facts.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="data-grid">
      {items.map((item, index) => (
        <article className="panel data-card" key={String(item.itemId ?? index)}>
          <p className="detail-kicker">Evidence item {index + 1}</p>
          <h3>{humanize(item.evidenceType)}</h3>
          {item.attestation ? <p className="route-text">{item.attestation}</p> : null}
          {item.evidenceUrl ? (
            <a
              className="button button-secondary"
              href={item.evidenceUrl}
              rel="noreferrer nofollow"
              target="_blank"
            >
              Open submitted link
            </a>
          ) : null}
          {item.hasPrivateFile && item.itemId ? (
            <a
              className="button button-secondary"
              href={privateFileHref(
                auditCase.assignment_id,
                "evidence_item",
                item.itemId,
              )}
              rel="noreferrer"
              target="_blank"
            >
              Open private file
            </a>
          ) : null}
        </article>
      ))}
    </div>
  );
}

function PaymentPacket({ auditCase }: { auditCase: AuditCase }) {
  const receipt = asPaymentReceipt(auditCase.payment_receipt);
  if (!receipt) {
    return (
      <div className="empty-state">
        <div>
          <strong>No payment receipt is available.</strong>
          <p>Do not infer payment from the original adjudication.</p>
        </div>
      </div>
    );
  }

  return (
    <article className="panel data-card">
      <p className="detail-kicker">Submitted external-payment record</p>
      <h3>{String(receipt.provider ?? "Provider not stated")}</h3>
      <dl className="detail-list">
        <div>
          <dt>Reported amount</dt>
          <dd>{formatMoney(receipt.amountCents, receipt.currency)}</dd>
        </div>
        <div>
          <dt>Reported payment date</dt>
          <dd>{String(receipt.paidOn ?? "Not set")}</dd>
        </div>
      </dl>
      {receipt.hasPrivateFile && receipt.receiptId ? (
        <a
          className="button button-secondary"
          href={privateFileHref(
            auditCase.assignment_id,
            "payment_receipt",
            receipt.receiptId,
          )}
          rel="noreferrer"
          target="_blank"
        >
          Open private receipt file
        </a>
      ) : null}
    </article>
  );
}

function IndependentDecisionForm({ auditCase }: { auditCase: AuditCase }) {
  const evidenceCase = auditCase.target_type === "evidence_decision";
  const finalities = evidenceCase ? EVIDENCE_FINALITIES : SETTLEMENT_FINALITIES;

  return (
    <form action={recordEvidenceCredibilityAuditLabelAction} className="panel stack-form">
      <input
        name="assignment_id"
        type="hidden"
        value={String(auditCase.assignment_id)}
      />
      <input name="target_type" type="hidden" value={String(auditCase.target_type)} />
      <input
        name="request_key"
        type="hidden"
        value={`review-label:${String(auditCase.assignment_id)}`}
      />

      <p className="detail-kicker">Independent terminal label</p>
      <h3>Judge only the frozen obligation and evidence shown above.</h3>

      <label className="field">
        <span>Independent final status</span>
        <select name="final_status" defaultValue="" required>
          <option disabled value="">
            Choose a status
          </option>
          <option value="eligible">Eligible for a numerical outcome</option>
          <option value="excluded">Excluded under a permitted finality</option>
          <option value="review_required">No defensible terminal conclusion</option>
        </select>
      </label>

      <label className="field">
        <span>{evidenceCase ? "Independent completion fraction" : "Independent payment outcome"}</span>
        {evidenceCase ? (
          <input
            inputMode="decimal"
            max="1"
            min="0"
            name="final_outcome"
            placeholder="0 to 1; leave blank when excluded or review-required"
            step="0.000001"
            type="number"
          />
        ) : (
          <select name="final_outcome" defaultValue="">
            <option value="">Not numerical</option>
            <option value="1">Paid</option>
            <option value="0">Still due</option>
          </select>
        )}
      </label>

      <label className="field">
        <span>Independent finality reason</span>
        <select name="final_finality_reason" defaultValue="" required>
          <option disabled value="">
            Choose a finality reason
          </option>
          {finalities.map((value) => (
            <option key={value} value={value}>
              {humanize(value)}
            </option>
          ))}
        </select>
      </label>

      {evidenceCase ? (
        <>
          <label className="field">
            <span>Evidence-integrity finding</span>
            <select name="final_integrity_finding" defaultValue="not_assessed" required>
              <option value="not_assessed">Not assessed</option>
              <option value="supported_honest">Supported honest conduct</option>
              <option value="reckless_misleading">Recklessly misleading</option>
              <option value="deliberate_fabrication">Deliberate fabrication</option>
            </select>
          </label>

          <label className="field">
            <span>Responsiveness finding</span>
            <select
              name="final_responsiveness_finding"
              defaultValue="not_assessed"
              required
            >
              <option value="not_assessed">Not assessed</option>
              <option value="on_time">On time</option>
              <option value="late_cure">Late cure</option>
              <option value="missed_deadline">Missed deadline</option>
              <option value="excused">Excused</option>
            </select>
          </label>

          <label className="field">
            <span>Dispute-conduct finding</span>
            <select
              name="final_dispute_conduct_finding"
              defaultValue="not_assessed"
              required
            >
              <option value="not_assessed">Not assessed</option>
              <option value="cooperative">Cooperative</option>
              <option value="obstructive">Obstructive</option>
              <option value="retaliatory">Retaliatory</option>
              <option value="evidence_destruction">Evidence destruction</option>
              <option value="abusive_appeal">Abusive appeal</option>
            </select>
          </label>
        </>
      ) : null}

      <label className="field">
        <span>Private independent rationale</span>
        <textarea
          maxLength={4000}
          minLength={1}
          name="private_rationale"
          placeholder="Explain the evidence-to-conclusion path without referring to any hidden original decision."
          required
          rows={6}
        />
      </label>

      <label className="checkbox-field">
        <input name="blinding_complete" type="checkbox" value="true" />
        <span>
          I did not see the first reviewer’s conclusion, confidence assessment, private
          rationale, current aggregate, or avoidable participant identity before deciding.
        </span>
      </label>

      <PendingSubmitButton pendingLabel="Recording independent label…">
        Record independent label
      </PendingSubmitButton>
    </form>
  );
}

export default async function EvidenceCalibrationReviewPage({
  searchParams,
}: EvidenceCalibrationReviewPageProps) {
  const [viewer, resolvedSearchParams, security] = await Promise.all([
    requireViewer("/review/evidence-calibration"),
    searchParams,
    loadBackgroundAccountSecuritySummary(),
  ]);
  const supabase = await createClient();
  const { data: reviewerGrant } = await (supabase as any)
    .from("trade_review_role_grants")
    .select("profile_id")
    .eq("profile_id", viewer.authUser.id)
    .eq("role", "reviewer")
    .eq("active", true)
    .is("revoked_at", null)
    .maybeSingle();
  const hasReviewerRole = Boolean(reviewerGrant?.profile_id);
  const access = {
    allowed:
      hasReviewerRole &&
      (security?.verifiedTotpCount ?? 0) >= 1 &&
      security?.currentLevel === "aal2",
    message: !hasReviewerRole
      ? "This profile does not have an active Moral Trade reviewer grant."
      : (security?.verifiedTotpCount ?? 0) < 1
        ? "Enroll a verified authenticator factor before reviewing calibration cases."
        : security?.currentLevel !== "aal2"
          ? "Verify the authenticator for this session before reviewing calibration cases."
          : "Profile-bound calibration reviewer access verified at AAL2.",
  };
  const formMessage = getFormMessage(resolvedSearchParams);
  const result = access.allowed
    ? await (supabase as any).rpc(
        "list_my_evidence_credibility_calibration_audits_v1",
        { p_limit: 50, p_offset: 0 },
      )
    : { data: [], error: null };
  const cases: AuditCase[] = Array.isArray(result.data) ? result.data : [];
  const queueError = result.error?.message ?? "";

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
              formMessage.tone === "error"
                ? "status-banner-error"
                : "status-banner-success"
            }`}
          >
            {formMessage.text}
          </div>
        ) : null}

        <section className="section section-white" aria-labelledby="blind-review-heading">
          <div className="section-head section-head-compact">
            <p className="eyebrow">Independent calibration review</p>
            <h1 id="blind-review-heading">Review the evidence, not the prior judgment.</h1>
            <p>
              Cases omit the prior conclusion, confidence assessment, evidential multiplier,
              aggregate score, original rationale, and avoidable identities. Your decision is a
              private calibration label only; it cannot alter the participant’s agreement,
              payout, credibility, ranking, eligibility, or restrictions.
            </p>
          </div>

          {!access.allowed ? (
            <article className="panel data-card data-card-wide">
              <div className="status-banner status-banner-error">
                <strong>Calibration review blocked</strong>
                <p>{access.message}</p>
              </div>
              <div className="form-actions">
                <Link className="button button-primary" href="/dashboard">
                  Open account security
                </Link>
                <Link className="button button-secondary" href="/">
                  Return home
                </Link>
              </div>
            </article>
          ) : (
            <>
              {queueError ? (
                <div className="status-banner status-banner-error">
                  <strong>Blind-review queue unavailable</strong>
                  <p>{queueError}</p>
                </div>
              ) : null}

              <div className="data-grid">
                {cases.map((auditCase) => (
                  <article
                    className="panel data-card data-card-wide"
                    key={String(auditCase.assignment_id)}
                  >
                    <div className="profile-card-head">
                      <div>
                        <p className="detail-kicker">{String(auditCase.case_code)}</p>
                        <h2>
                          {humanize(auditCase.target_type)} ·{" "}
                          {humanize(auditCase.action_category)}
                        </h2>
                        <p className="route-text">
                          {String(auditCase.obligation_description ?? "")}
                        </p>
                      </div>
                      <span className="status-pill status-pill-neutral">
                        Due {formatDate(auditCase.expires_at)}
                      </span>
                    </div>

                    <dl className="detail-list">
                      <div>
                        <dt>Frozen obligation</dt>
                        <dd>
                          {String(auditCase.units_total)} {String(auditCase.unit_label)} ·{" "}
                          {formatMoney(
                            auditCase.maximum_amount_cents,
                            auditCase.currency,
                          )}
                        </dd>
                      </div>
                      <div>
                        <dt>Frozen evidence rule</dt>
                        <dd>{String(auditCase.evidence_rule ?? "Not set")}</dd>
                      </div>
                      <div>
                        <dt>No-trade baseline</dt>
                        <dd>{String(auditCase.no_trade_baseline ?? "Not set")}</dd>
                      </div>
                      <div>
                        <dt>Assignment</dt>
                        <dd>
                          Assigned {formatDate(auditCase.assigned_at)} ·{" "}
                          {humanize(auditCase.blinding_mode)}
                        </dd>
                      </div>
                    </dl>

                    <div className="section-head section-head-compact">
                      <p className="eyebrow">Frozen evidence available at decision cutoff</p>
                      <h3>Inspect only what is necessary for this narrow judgment.</h3>
                    </div>

                    {auditCase.target_type === "evidence_decision" ? (
                      <EvidencePacket auditCase={auditCase} />
                    ) : (
                      <PaymentPacket auditCase={auditCase} />
                    )}

                    <IndependentDecisionForm auditCase={auditCase} />
                  </article>
                ))}

                {!cases.length && !queueError ? (
                  <div className="empty-state">
                    <div>
                      <strong>No blind calibration audit is assigned to you.</strong>
                      <p>Completed, expired, and unassigned cases are not shown.</p>
                    </div>
                  </div>
                ) : null}
              </div>
            </>
          )}
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
