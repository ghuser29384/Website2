import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import {
  addAgreementEventAction,
  createAgreementPaymentCheckoutAction,
  createAgreementPaymentScheduleAction,
  rateAgreementAction,
  requestPaymentReviewAction,
  updateAgreementStatusAction,
} from "@/app/actions";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteTopbar } from "@/components/layout/site-topbar";
import { getAgreementForUser, requireViewer } from "@/lib/app-data";
import { getFormMessage } from "@/lib/form-state";
import { getPrimaryNavLinks, getTopbarActions } from "@/lib/site";

export const metadata: Metadata = {
  title: "Agreement",
  robots: {
    index: false,
    follow: false,
  },
};

interface AgreementPageProps {
  params: Promise<{ agreementId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

function formatPaymentAmount(amountCents: number, currency: string) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(amountCents / 100);
}

function formatCadence(value: number, unit: string) {
  if (unit === "one_time") {
    return "one-time";
  }

  if (unit === "custom_days") {
    return `every ${value} day${value === 1 ? "" : "s"}`;
  }

  return value === 1 ? `every ${unit}` : `every ${value} ${unit}s`;
}

export default async function AgreementPage({ params, searchParams }: AgreementPageProps) {
  const { agreementId } = await params;
  const resolvedSearchParams = await searchParams;
  const viewer = await requireViewer(`/agreements/${agreementId}`);
  const agreement = await getAgreementForUser(agreementId, viewer.authUser.id);
  const formMessage = getFormMessage(resolvedSearchParams);

  if (!agreement) {
    notFound();
  }

  return (
    <div className="page-shell">
      <header className="hero">
        <SiteTopbar
          brandHref="/"
          links={getPrimaryNavLinks(true)}
          {...getTopbarActions(true)}
          showLogout
        />

        <div className="hero-grid">
          <section className="hero-copy">
            <p className="eyebrow">Agreement record</p>
            <h1>
              Agreement with{" "}
              {agreement.counterparty ? agreement.counterparty.resolvedName : "counterparty"}.
            </h1>
            <p className="hero-text">
              This page keeps the negotiation, payment records, verification evidence, disputes,
              cancellation requests, and ratings in one auditable place.
            </p>
            <div className="hero-actions">
              <Link className="button button-secondary" href="/dashboard">
                Back to dashboard
              </Link>
              {agreement.offer ? (
                <Link className="button button-primary" href={`/offers/${agreement.offer.id}`}>
                  View offer
                </Link>
              ) : null}
            </div>
          </section>

          <aside className="hero-panel panel">
            <p className="eyebrow">Current state</p>
            <div className="flow-card">
              <div className="flow-step">
                <span className="flow-number">01</span>
                <div>
                  <strong>{agreement.status}</strong>
                  <p>Status last updated {new Date(agreement.updated_at).toLocaleDateString()}.</p>
                </div>
              </div>
              <div className="flow-step">
                <span className="flow-number">02</span>
                <div>
                  <strong>{agreement.payments.length} payment record(s)</strong>
                  <p>{agreement.paymentSchedules.length} reminder schedule(s).</p>
                </div>
              </div>
              <div className="flow-step">
                <span className="flow-number">03</span>
                <div>
                  <strong>{agreement.events.length} event(s)</strong>
                  <p>Evidence, counterproposals, disputes, and status changes.</p>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </header>

      <main>
        {formMessage ? (
          <div
            className={`status-banner ${
              formMessage.tone === "error" ? "status-banner-error" : "status-banner-success"
            }`}
          >
            {formMessage.text}
          </div>
        ) : null}

        <section className="section section-white">
          <div className="section-head">
            <p className="eyebrow">Terms</p>
            <h2>What the parties are tracking</h2>
            <p>
              {agreement.offer
                ? `${agreement.offer.offered_cause} for ${agreement.offer.requested_cause}`
                : "The original offer could not be loaded."}
            </p>
          </div>

          <div className="data-grid">
            <article className="panel data-card">
              <p className="detail-kicker">Offer action</p>
              <h3>{agreement.offer?.offer_action ?? "Unavailable"}</h3>
              <p className="route-text">{agreement.offer?.verification ?? "No verification listed."}</p>
            </article>
            <article className="panel data-card">
              <p className="detail-kicker">Counterparty action</p>
              <h3>{agreement.offer?.request_action ?? "Unavailable"}</h3>
              <p className="route-text">{agreement.notes || "No additional notes recorded."}</p>
            </article>
          </div>
        </section>

        <section className="section section-subtle">
          <div className="section-head">
            <p className="eyebrow">Payments</p>
            <h2>Payment, reminders, refund review, and disputes</h2>
            <p>
              Stripe Checkout handles individual payments. Recurring cadence here creates reminder
              schedules rather than automatic charges.
            </p>
          </div>

          <div className="data-grid">
            <article className="panel data-card">
              <p className="detail-kicker">Pay now</p>
              <h3>Create a Stripe checkout</h3>
              <form action={createAgreementPaymentCheckoutAction} className="stack-form compact-form">
                <input name="agreement_id" type="hidden" value={agreement.id} />
                <input name="return_to" type="hidden" value={`/agreements/${agreement.id}`} />
                <div className="field-grid">
                  <label className="field">
                    <span>Amount</span>
                    <input min="1" name="amount" placeholder="25.00" step="0.01" type="number" />
                  </label>
                  <label className="field">
                    <span>Currency</span>
                    <input defaultValue="usd" name="currency" />
                  </label>
                </div>
                <div className="field-grid">
                  <label className="field">
                    <span>Cadence label</span>
                    <select defaultValue="one_time" name="cadence_unit">
                      <option value="one_time">One-time</option>
                      <option value="day">Daily</option>
                      <option value="month">Monthly</option>
                      <option value="year">Yearly</option>
                      <option value="custom_days">Custom day range</option>
                    </select>
                  </label>
                  <label className="field">
                    <span>Every</span>
                    <input defaultValue={1} min={1} name="cadence_value" type="number" />
                  </label>
                </div>
                <label className="field">
                  <span>Payment note</span>
                  <input name="notes" placeholder="What this payment covers" />
                </label>
                <button className="button button-primary button-mini" type="submit">
                  Pay with Stripe
                </button>
              </form>
            </article>

            <article className="panel data-card">
              <p className="detail-kicker">Recurring reminder</p>
              <h3>Record a negotiated cadence</h3>
              <form action={createAgreementPaymentScheduleAction} className="stack-form compact-form">
                <input name="agreement_id" type="hidden" value={agreement.id} />
                <input name="return_to" type="hidden" value={`/agreements/${agreement.id}`} />
                <div className="field-grid">
                  <label className="field">
                    <span>Amount</span>
                    <input min="1" name="amount" placeholder="25.00" step="0.01" type="number" />
                  </label>
                  <label className="field">
                    <span>Currency</span>
                    <input defaultValue="usd" name="currency" />
                  </label>
                </div>
                <div className="field-grid">
                  <label className="field">
                    <span>Cadence</span>
                    <select defaultValue="month" name="cadence_unit">
                      <option value="day">Daily</option>
                      <option value="month">Monthly</option>
                      <option value="year">Yearly</option>
                      <option value="custom_days">Custom day range</option>
                    </select>
                  </label>
                  <label className="field">
                    <span>Every</span>
                    <input defaultValue={1} min={1} name="cadence_value" type="number" />
                  </label>
                </div>
                <label className="field">
                  <span>First due date</span>
                  <input name="next_due_at" type="date" />
                </label>
                <label className="field">
                  <span>Schedule note</span>
                  <input name="notes" placeholder="Monthly stipend, 40-day trial, annual pledge, etc." />
                </label>
                <button className="button button-secondary button-mini" type="submit">
                  Create reminder schedule
                </button>
              </form>
            </article>
          </div>

          <div className="data-grid">
            {agreement.payments.length ? (
              agreement.payments.map((payment) => (
                <article className="panel data-card" key={payment.id}>
                  <p className="detail-kicker">Payment record</p>
                  <h3>{formatPaymentAmount(payment.amount_cents, payment.currency)}</h3>
                  <div className="tag-row">
                    <span className="badge">{payment.status.replace("_", " ")}</span>
                    <span className="source-pill">
                      {formatCadence(payment.cadence_interval_value, payment.cadence_interval_unit)}
                    </span>
                    {payment.paid_at ? (
                      <span className="source-pill">
                        Paid {new Date(payment.paid_at).toLocaleDateString()}
                      </span>
                    ) : null}
                  </div>
                  <p className="route-text">{payment.notes || "No payment note."}</p>
                  <form action={requestPaymentReviewAction} className="stack-form compact-form">
                    <input name="payment_id" type="hidden" value={payment.id} />
                    <input name="return_to" type="hidden" value={`/agreements/${agreement.id}`} />
                    <label className="field">
                      <span>Payment review</span>
                      <select defaultValue="refund" name="request_type">
                        <option value="refund">Request refund review</option>
                        <option value="dispute">Open dispute</option>
                      </select>
                    </label>
                    <label className="field">
                      <span>Reason</span>
                      <textarea name="details" placeholder="Explain the refund or dispute request." />
                    </label>
                    <button className="button button-secondary button-mini" type="submit">
                      Record review request
                    </button>
                  </form>
                </article>
              ))
            ) : (
              <div className="empty-state">
                <div>
                  <strong>No payment records yet.</strong>
                  <p>Create a checkout when a payment is due under this agreement.</p>
                </div>
              </div>
            )}

            {agreement.paymentSchedules.length ? (
              agreement.paymentSchedules.map((schedule) => (
                <article className="panel data-card" key={schedule.id}>
                  <p className="detail-kicker">Reminder schedule</p>
                  <h3>{formatPaymentAmount(schedule.amount_cents, schedule.currency)}</h3>
                  <div className="tag-row">
                    <span className="badge">{schedule.status}</span>
                    <span className="source-pill">
                      {formatCadence(schedule.cadence_interval_value, schedule.cadence_interval_unit)}
                    </span>
                    <span className="source-pill">
                      Next due {new Date(schedule.next_due_at).toLocaleDateString()}
                    </span>
                  </div>
                </article>
              ))
            ) : null}
          </div>
        </section>

        <section className="section section-white">
          <div className="section-head">
            <p className="eyebrow">Lifecycle</p>
            <h2>Counterproposals, evidence, cancellation, and rating</h2>
            <p>Every material change should be recorded as an event.</p>
          </div>

          <div className="data-grid">
            <article className="panel data-card">
              <p className="detail-kicker">Record update</p>
              <h3>Add an agreement event</h3>
              <form action={addAgreementEventAction} className="stack-form compact-form">
                <input name="agreement_id" type="hidden" value={agreement.id} />
                <input name="return_to" type="hidden" value={`/agreements/${agreement.id}`} />
                <label className="field">
                  <span>Event type</span>
                  <select defaultValue="verification_submitted" name="event_type">
                    <option value="note">Note</option>
                    <option value="counterproposal">Counterproposal</option>
                    <option value="verification_submitted">Verification evidence</option>
                    <option value="cancellation_requested">Cancellation request</option>
                    <option value="dispute_opened">Dispute opened</option>
                  </select>
                </label>
                <label className="field">
                  <span>Summary</span>
                  <input name="summary" placeholder="Short event summary" />
                </label>
                <label className="field">
                  <span>Details</span>
                  <textarea name="details" placeholder="Evidence, counterproposal terms, or dispute details" />
                </label>
                <button className="button button-secondary button-mini" type="submit">
                  Record update
                </button>
              </form>
            </article>

            <article className="panel data-card">
              <p className="detail-kicker">Status and rating</p>
              <h3>Close the loop</h3>
              <div className="form-actions">
                <form action={updateAgreementStatusAction}>
                  <input name="agreement_id" type="hidden" value={agreement.id} />
                  <input name="return_to" type="hidden" value={`/agreements/${agreement.id}`} />
                  <input name="status" type="hidden" value="completed" />
                  <input name="summary" type="hidden" value="Agreement marked completed by one party." />
                  <button className="button button-secondary button-mini" type="submit">
                    Mark complete
                  </button>
                </form>
                <form action={updateAgreementStatusAction}>
                  <input name="agreement_id" type="hidden" value={agreement.id} />
                  <input name="return_to" type="hidden" value={`/agreements/${agreement.id}`} />
                  <input name="status" type="hidden" value="cancelled" />
                  <input name="summary" type="hidden" value="Agreement cancellation recorded by one party." />
                  <button className="button button-secondary button-mini" type="submit">
                    Cancel
                  </button>
                </form>
              </div>
              {agreement.counterparty ? (
                <form action={rateAgreementAction} className="stack-form compact-form">
                  <input name="agreement_id" type="hidden" value={agreement.id} />
                  <input name="rated_user_id" type="hidden" value={agreement.counterparty.id} />
                  <input name="return_to" type="hidden" value={`/agreements/${agreement.id}`} />
                  <label className="field">
                    <span>Rate this transaction (1-10)</span>
                    <input
                      defaultValue={agreement.viewerRating?.score ?? 8}
                      max={10}
                      min={1}
                      name="score"
                      type="number"
                    />
                  </label>
                  <button className="button button-secondary button-mini" type="submit">
                    {agreement.viewerRating ? "Update rating" : "Submit rating"}
                  </button>
                </form>
              ) : null}
            </article>
          </div>

          <div className="data-grid">
            {agreement.events.length ? (
              agreement.events.map((event) => (
                <article className="panel data-card" key={event.id}>
                  <p className="detail-kicker">{event.event_type.replaceAll("_", " ")}</p>
                  <h3>{event.summary}</h3>
                  <p className="route-text">{event.details || "No additional detail."}</p>
                  <span className="source-pill">
                    {new Date(event.created_at).toLocaleString()}
                  </span>
                </article>
              ))
            ) : (
              <div className="empty-state">
                <div>
                  <strong>No events yet.</strong>
                  <p>Record evidence, counterproposals, and status changes as the agreement moves.</p>
                </div>
              </div>
            )}
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
