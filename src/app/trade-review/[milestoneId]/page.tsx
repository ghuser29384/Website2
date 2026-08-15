import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import {
  resolveTradePaymentAppealAction,
  resolveTradePaymentReviewAction,
  resolveTradeMilestoneAppealAction,
  submitNeutralTradeMilestoneReviewAction,
} from "@/app/trade-milestone-actions";
import { PendingSubmitButton } from "@/components/core-trade/pending-submit-button";
import { FullNavigationActionForm } from "@/components/core-trade/full-navigation-action-form";
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
  title: "Neutral milestone review",
  robots: { index: false, follow: false },
};

interface TradeReviewPageProps {
  params: Promise<{ milestoneId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

function deadlineHasPassed(value: unknown) {
  const deadline = Date.parse(String(value ?? ""));
  return Number.isFinite(deadline) && deadline <= Date.now();
}

export default async function TradeReviewPage({
  params,
  searchParams,
}: TradeReviewPageProps) {
  const [{ milestoneId }, resolvedSearchParams, security] = await Promise.all([
    params,
    searchParams,
    loadBackgroundAccountSecuritySummary(),
  ]);
  const returnTo = `/trade-review/${milestoneId}`;
  const viewer = await requireViewer(returnTo);
  if (security.verifiedTotpCount < 1 || security.currentLevel !== "aal2") {
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
          <section className="section section-white">
            <div className="status-banner status-banner-error">
              <strong>Authenticator verification required</strong>
              <p>
                Private evidence is available only to an assigned reviewer with a verified
                authenticator and an active AAL2 session.
              </p>
            </div>
            <Link className="button button-primary" href="/dashboard#account-security">
              Open account security
            </Link>
          </section>
        </main>
        <SiteFooter />
      </div>
    );
  }
  const supabase = await createClient();
  const { data: milestone } = await (supabase as any)
    .from("trade_agreement_milestones")
    .select("*")
    .eq("id", milestoneId)
    .maybeSingle();
  if (!milestone) notFound();

  const [
    { data: bundles },
    { data: appeal },
    { data: reviews },
    { data: payout },
  ] = await Promise.all([
    (supabase as any)
      .from("trade_evidence_bundles")
      .select("*")
      .eq("milestone_id", milestoneId)
      .order("created_at", { ascending: false }),
    (supabase as any)
      .from("trade_milestone_appeals")
      .select("*")
      .eq("milestone_id", milestoneId)
      .maybeSingle(),
    (supabase as any)
      .from("trade_milestone_reviews")
      .select("*")
      .eq("milestone_id", milestoneId)
      .order("created_at", { ascending: false }),
    (supabase as any)
      .from("trade_milestone_payouts")
      .select("*")
      .eq("milestone_id", milestoneId)
      .maybeSingle(),
  ]);
  const { data: paymentCases } = payout?.id
    ? await (supabase as any)
        .from("trade_payment_review_cases")
        .select("*")
        .eq("payout_id", payout.id)
        .order("payment_cycle", { ascending: false })
    : { data: [] };
  const paymentCase = (paymentCases ?? [])[0] ?? null;
  const [{ data: paymentAppeal }, { data: paymentDecisions }] = paymentCase?.id
    ? await Promise.all([
        (supabase as any)
          .from("trade_payment_appeals")
          .select("*")
          .eq("case_id", paymentCase.id)
          .maybeSingle(),
        (supabase as any)
          .from("trade_payment_review_decisions")
          .select("*")
          .eq("case_id", paymentCase.id)
          .order("created_at", { ascending: false }),
      ])
    : [{ data: null }, { data: [] }];
  const paymentReceiptId = paymentCase?.corrected_receipt_id
    ? String(paymentCase.corrected_receipt_id)
    : paymentCase?.initial_receipt_id
      ? String(paymentCase.initial_receipt_id)
      : null;
  const { data: paymentReceipt } = paymentReceiptId
    ? await (supabase as any)
        .from("trade_external_payment_receipts")
        .select("*")
        .eq("id", paymentReceiptId)
        .maybeSingle()
    : { data: null };
  let paymentReceiptUrl: string | null = null;
  if (paymentReceipt?.receipt_storage_path) {
    const { data } = await supabase.storage
      .from("trade-evidence")
      .createSignedUrl(String(paymentReceipt.receipt_storage_path), 3600);
    paymentReceiptUrl = data?.signedUrl ?? null;
  }
  const currentBundle =
    (bundles ?? []).find(
      (bundle: Record<string, any>) => String(bundle.id) === String(milestone.current_bundle_id),
    ) ?? null;
  const { data: items } = currentBundle
    ? await (supabase as any)
        .from("trade_evidence_bundle_items")
        .select("*")
        .eq("bundle_id", currentBundle.id)
        .order("created_at", { ascending: true })
    : { data: [] };
  const itemsWithUrls = await Promise.all(
    (items ?? []).map(async (item: Record<string, any>) => {
      if (!item.storage_path) return { ...item, signedUrl: null };
      const { data } = await supabase.storage
        .from("trade-evidence")
        .createSignedUrl(String(item.storage_path), 3600);
      return { ...item, signedUrl: data?.signedUrl ?? null };
    }),
  );

  const isAppealViewer =
    String(appeal?.assigned_reviewer_id ?? "") === viewer.authUser.id;
  const isAppealReview =
    isAppealViewer && appeal?.status === "assigned";
  const isInitialReviewer =
    !isAppealViewer &&
    String(milestone.assigned_reviewer_id) === viewer.authUser.id;
  const isInitialReview =
    isInitialReviewer &&
    milestone.status === "under_review";
  const isPaymentAppealViewer =
    String(paymentAppeal?.assigned_reviewer_id ?? "") === viewer.authUser.id;
  const isPaymentAppealReview =
    isPaymentAppealViewer && paymentAppeal?.status === "assigned";
  const isPaymentReview =
    !isPaymentAppealViewer &&
    String(paymentCase?.assigned_reviewer_id ?? "") === viewer.authUser.id;
  if (
    !isAppealViewer &&
    !isInitialReviewer &&
    !isPaymentAppealViewer &&
    !isPaymentReview
  ) {
    notFound();
  }

  const action = isAppealViewer
    ? resolveTradeMilestoneAppealAction
    : submitNeutralTradeMilestoneReviewAction;
  const formMessage = getFormMessage(resolvedSearchParams);
  const paymentReviewReady =
    isPaymentAppealReview ||
    (isPaymentReview &&
      (paymentCase?.status === "assigned" ||
        paymentCase?.status === "final_review" ||
        (paymentCase?.status === "corrected_response" &&
          deadlineHasPassed(paymentReceipt?.response_deadline_at))));

  if (isPaymentReview || isPaymentAppealViewer) {
    const basePaymentDecision = (paymentDecisions ?? []).find(
      (decision: Record<string, any>) =>
        String(decision.id) === String(paymentAppeal?.base_decision_id),
    );
    const paymentAction = isPaymentAppealViewer
      ? resolveTradePaymentAppealAction
      : resolveTradePaymentReviewAction;
    const inactivePaymentReviewCopy = isPaymentAppealViewer
      ? paymentAppeal?.status === "resolved"
        ? {
            title: "This payment appeal is final.",
            body: "The different neutral reviewer’s final paid or still-due decision is recorded in the private history.",
          }
        : {
            title: "This payment appeal is not currently actionable.",
            body: "The appeal remains visible to its assigned reviewer, but no further decision is available in its current state.",
          }
      : paymentCase?.status === "correction_due"
        ? {
            title: "Waiting for the payer’s corrected receipt.",
            body: "One correction was permitted. The same neutral reviewer remains assigned for the final decision after the fresh payee response window.",
          }
        : paymentCase?.status === "corrected_response"
          ? {
              title: "The payee response window is still open.",
              body: "A corrected receipt receives a fresh seven-day response window. If it remains unanswered, this same reviewer may make the final decision after the deadline.",
            }
          : paymentCase?.status === "decision_pending"
            ? {
                title: "The provisional payment decision is awaiting finality.",
                body: "Either participant may use the single seven-day appeal. Otherwise the paid or still-due decision becomes final after the deadline.",
              }
            : paymentCase?.status === "appeal_pending"
              ? {
                  title: "A different neutral reviewer will decide the appeal.",
                  body: "The original reviewer’s decision and private rationale remain visible, but the original reviewer cannot decide the appeal.",
                }
              : paymentCase?.status === "resolved"
                ? {
                    title: "This payment review is final.",
                    body: "The final paid or still-due result is recorded in the private payment history.",
                  }
                : {
                    title: "This payment review is not currently actionable.",
                    body: "The assigned reviewer retains private read access while the participants complete the next lifecycle step.",
                  };
    const formattedAmount = Number.isSafeInteger(Number(paymentReceipt?.amount_cents))
      ? (Number(paymentReceipt.amount_cents) / 100).toFixed(2)
      : null;

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
          <section className="section section-white" aria-labelledby="payment-review-heading">
            <div className="section-head section-head-compact">
              <p className="eyebrow">
                {isPaymentAppealViewer
                  ? "Independent payment appeal"
                  : paymentCase?.corrected_receipt_id
                    ? "Final corrected-receipt review"
                    : "Neutral external-payment review"}
              </p>
              <h1 id="payment-review-heading">
                Decide whether the frozen external amount was paid.
              </h1>
              <p>
                Review the private receipt and transaction facts only. Moral Trade
                records the decision but never holds, captures, releases, refunds,
                or transfers funds.
              </p>
            </div>

            {formMessage ? (
              <div
                className={
                  formMessage.tone === "error"
                    ? "status-banner status-banner-error"
                    : "status-banner status-banner-success"
                }
                role={formMessage.tone === "error" ? "alert" : "status"}
              >
                {formMessage.text}
              </div>
            ) : null}

            <article className="panel data-card data-card-wide">
              <div className="panel-head">
                <div>
                  <p className="detail-kicker">{String(milestone.action_category)}</p>
                  <h2>{String(milestone.description)}</h2>
                </div>
                <span className="badge">
                  {isPaymentAppealViewer ? "Payment appeal" : "Payment review"}
                </span>
              </div>
              <dl className="detail-grid">
                <div>
                  <dt>Frozen amount</dt>
                  <dd>
                    {formattedAmount
                      ? `${formattedAmount} ${String(paymentReceipt?.currency ?? "")}`
                      : "Unavailable"}
                  </dd>
                </div>
                <div>
                  <dt>Payment cycle</dt>
                  <dd>{String(paymentReceipt?.payment_cycle ?? "Unavailable")}</dd>
                </div>
                <div>
                  <dt>Receipt type</dt>
                  <dd>{String(paymentReceipt?.receipt_kind ?? "Unavailable")}</dd>
                </div>
                <div>
                  <dt>Provider</dt>
                  <dd>{String(paymentReceipt?.provider ?? "Unavailable")}</dd>
                </div>
                <div>
                  <dt>External reference</dt>
                  <dd>{String(paymentReceipt?.provider_reference ?? "Unavailable")}</dd>
                </div>
                <div>
                  <dt>Payment date</dt>
                  <dd>{String(paymentReceipt?.paid_on ?? "Unavailable")}</dd>
                </div>
                <div>
                  <dt>Payee response</dt>
                  <dd>{String(paymentReceipt?.response_outcome ?? "none")}</dd>
                </div>
                <div>
                  <dt>Response deadline</dt>
                  <dd>
                    {paymentReceipt?.response_deadline_at ? (
                      <LocalDateTime
                        fallback={String(paymentReceipt.response_deadline_at)}
                        value={String(paymentReceipt.response_deadline_at)}
                      />
                    ) : (
                      "Unavailable"
                    )}
                  </dd>
                </div>
              </dl>
              {paymentReceipt?.counterparty_note ? (
                <div className="status-banner">
                  <strong>Payee note</strong>
                  <p>{String(paymentReceipt.counterparty_note)}</p>
                </div>
              ) : null}
              {paymentReceiptUrl ? (
                <a
                  className="inline-link"
                  href={paymentReceiptUrl}
                  rel="noreferrer"
                  target="_blank"
                >
                  Open private payment receipt
                </a>
              ) : (
                <p className="panel-note">No private receipt file was attached.</p>
              )}
            </article>

            {isPaymentAppealViewer && basePaymentDecision ? (
              <div className="status-banner">
                <strong>
                  Prior decision: {String(basePaymentDecision.outcome).replaceAll("_", " ")}
                </strong>
                <p>{String(basePaymentDecision.private_reason)}</p>
              </div>
            ) : null}

            {!paymentReviewReady ? (
              <div className="status-banner status-banner-warning">
                <strong>{inactivePaymentReviewCopy.title}</strong>
                <p>{inactivePaymentReviewCopy.body}</p>
              </div>
            ) : (
              <FullNavigationActionForm
                action={paymentAction}
                className="panel stack-form"
              >
                <input
                  name="agreement_id"
                  type="hidden"
                  value={String(milestone.agreement_id)}
                />
                <input name="milestone_id" type="hidden" value={milestoneId} />
                <input name="return_to" type="hidden" value={returnTo} />
                {isPaymentAppealReview ? (
                  <input
                    name="payment_appeal_id"
                    type="hidden"
                    value={String(paymentAppeal.id)}
                  />
                ) : (
                  <input
                    name="payment_case_id"
                    type="hidden"
                    value={String(paymentCase.id)}
                  />
                )}
                <label className="field">
                  <span>Decision</span>
                  <select
                    name={
                      isPaymentAppealReview
                        ? "payment_appeal_outcome"
                        : "payment_review_outcome"
                    }
                    required
                  >
                    <option value="">Choose a decision</option>
                    <option value="confirm_paid">Confirm paid</option>
                    <option value="still_due">Reject receipt — amount still due</option>
                    {!isPaymentAppealReview &&
                    !paymentCase.corrected_receipt_id ? (
                      <option value="allow_correction">
                        Permit one corrected receipt
                      </option>
                    ) : null}
                  </select>
                </label>
                <label className="field">
                  <span>Private rationale visible to the participants</span>
                  <textarea
                    name="payment_review_rationale"
                    placeholder="Explain the receipt facts and why this decision follows."
                    required
                    rows={5}
                  />
                </label>
                <p className="panel-note">
                  Paid/still-due decisions have one seven-day appeal to a
                  different reviewer. Permission to correct is not itself
                  appealable.
                </p>
                <PendingSubmitButton pendingLabel="Recording payment decision…">
                  {isPaymentAppealReview
                    ? "Record final payment-appeal decision"
                    : "Record payment-review decision"}
                </PendingSubmitButton>
              </FullNavigationActionForm>
            )}

            <Link className="button button-secondary" href="/dashboard">
              Back to account
            </Link>
          </section>
        </main>

        <SiteFooter />
      </div>
    );
  }

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
        <section className="section section-white" aria-labelledby="review-heading">
          <div className="section-head section-head-compact">
            <p className="eyebrow">
              {isAppealViewer ? "Independent appeal review" : "Assigned neutral review"}
            </p>
            <h1 id="review-heading">Grade the promised result, not the submission’s polish.</h1>
            <p>
              Apply the frozen completion units and one of the five fixed confidence bands. Do not
              reward unnecessary disclosure or presentation quality.
            </p>
          </div>

          {formMessage ? (
            <div
              className={
                formMessage.tone === "error"
                  ? "status-banner status-banner-error"
                  : "status-banner status-banner-success"
              }
              role={formMessage.tone === "error" ? "alert" : "status"}
            >
              {formMessage.text}
            </div>
          ) : null}

          <article className="panel data-card data-card-wide">
            <div className="panel-head">
              <div>
                <p className="detail-kicker">{String(milestone.action_category)}</p>
                <h2>{String(milestone.description)}</h2>
              </div>
              <span className="badge">{isAppealViewer ? "Appeal" : "Initial review"}</span>
            </div>
            <dl className="detail-grid">
              <div>
                <dt>Completion structure</dt>
                <dd>
                  {milestone.indivisible
                    ? "Indivisible: 0 or 1"
                    : `${milestone.units_total} ${milestone.unit_label}`}
                </dd>
              </div>
              <div>
                <dt>Evidence packet</dt>
                <dd>{currentBundle ? `Attempt ${currentBundle.attempt_number}` : "Unavailable"}</dd>
              </div>
              <div className="field-wide">
                <dt>Frozen evidence rule</dt>
                <dd>{String(milestone.evidence_rule)}</dd>
              </div>
            </dl>
          </article>

          <div className="data-grid">
            {itemsWithUrls.map((item: Record<string, any>) => (
              <article className="panel data-card" key={String(item.id)}>
                <p className="detail-kicker">{String(item.evidence_type)}</p>
                <h3>Private evidence item</h3>
                {item.attestation ? <p className="route-text">{String(item.attestation)}</p> : null}
                {item.signedUrl ? (
                  <a className="inline-link" href={String(item.signedUrl)}>
                    Open private evidence file
                  </a>
                ) : null}
                {item.evidence_url ? (
                  <a className="inline-link" href={String(item.evidence_url)}>
                    Open private evidence link
                  </a>
                ) : null}
                <p className="panel-note">
                  Added <LocalDateTime fallback={String(item.created_at)} value={String(item.created_at)} />
                </p>
              </article>
            ))}
          </div>

          {isAppealReview && reviews?.[0] ? (
            <div className="status-banner">
              <strong>Prior decision under appeal</strong>
              <p>{String(reviews[0].private_reason)}</p>
            </div>
          ) : null}

          {isAppealReview || isInitialReview ? (
            <form action={action} className="panel stack-form">
              <input name="agreement_id" type="hidden" value={String(milestone.agreement_id)} />
              <input name="milestone_id" type="hidden" value={milestoneId} />
              <input name="return_to" type="hidden" value={returnTo} />
              {isAppealReview ? (
                <>
                  <input name="appeal_id" type="hidden" value={String(appeal.id)} />
                  <label className="field">
                    <span>Appeal resolution</span>
                    <select name="appeal_resolution" required>
                      <option value="upheld">Uphold the prior decision</option>
                      <option value="regraded">Replace it with a new grade</option>
                    </select>
                  </label>
                </>
              ) : null}
              <div className="field-grid">
                <label className="field">
                  <span>Completed {String(milestone.unit_label)}</span>
                  {milestone.indivisible ? (
                    <select
                      defaultValue={
                        isAppealReview && reviews?.[0]?.completion_units != null
                          ? String(reviews[0].completion_units)
                          : ""
                      }
                      name="completed_units"
                      required
                    >
                      <option value="">Choose completion</option>
                      <option value="1">1 — completed</option>
                      <option value="0">0 — not completed</option>
                    </select>
                  ) : (
                    <input
                      defaultValue={
                        isAppealReview ? Number(reviews?.[0]?.completion_units ?? 0) : undefined
                      }
                      max={Number(milestone.units_total)}
                      min="0"
                      name="completed_units"
                      required
                      step="1"
                      type="number"
                    />
                  )}
                </label>
                <label className="field">
                  <span>Evidence confidence</span>
                  <select
                    defaultValue={
                      isAppealReview && reviews?.[0]?.confidence_band != null
                        ? String(reviews[0].confidence_band)
                        : ""
                    }
                    name="confidence_band"
                    required
                  >
                    <option value="">Choose a fixed band</option>
                    {[100, 75, 50, 25, 0].map((band) => (
                      <option key={band} value={band}>
                        {band}%
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <label className="field">
                <span>Private rationale visible to the participants</span>
                <textarea
                  name="review_rationale"
                  placeholder="Explain the completion finding and why this fixed confidence band applies."
                  required
                  rows={5}
                />
              </label>
              <p className="panel-note">
                A 0% band rejects the packet and returns the milestone to replacement evidence under
                the approved timing rule. Moral Trade calculates the resulting amount but does not
                move money.
              </p>
              <PendingSubmitButton pendingLabel="Recording decision…">
                {isAppealReview ? "Record final appeal decision" : "Record neutral review"}
              </PendingSubmitButton>
            </form>
          ) : (
            <div className="status-banner">
              <strong>This assigned review is recorded.</strong>
              <p>
                Private evidence and the retained audit record remain readable,
                but no further decision is available in this state.
              </p>
            </div>
          )}

          <Link className="button button-secondary" href="/dashboard">
            Back to account
          </Link>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
