import type { Metadata } from "next";
import Link from "next/link";

import {
  suppressEmailOutboxAction,
  updateMatchReportStatusAction,
  updatePaymentReviewStatusAction,
} from "@/app/actions";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteTopbar } from "@/components/layout/site-topbar";
import { isAdminEmail } from "@/lib/admin";
import { requireViewer } from "@/lib/app-data";
import { getFormMessage } from "@/lib/form-state";
import { getPrimaryNavLinks, getTopbarActions } from "@/lib/site";
import { hasSupabaseEnv } from "@/lib/supabase/config";
import type { Database } from "@/lib/supabase/database.types";
import { createServiceClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Admin Review",
  robots: {
    index: false,
    follow: false,
  },
};

interface AdminPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

type MatchReportRow = Database["public"]["Tables"]["match_reports"]["Row"];
type AgreementPaymentRow = Database["public"]["Tables"]["agreement_payments"]["Row"];
type AgreementEventRow = Database["public"]["Tables"]["agreement_events"]["Row"];
type EmailOutboxRow = Database["public"]["Tables"]["email_outbox"]["Row"];
type WishProfileRow = Database["public"]["Tables"]["wish_profiles"]["Row"];

function formatPaymentAmount(amountCents: number, currency: string) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(amountCents / 100);
}

async function loadAdminQueues() {
  const supabase = createServiceClient();
  const [reports, payments, events, emails, wishProfiles] = await Promise.all([
    supabase
      .from("match_reports")
      .select("*")
      .eq("status", "open")
      .order("created_at", { ascending: false })
      .limit(50),
    supabase
      .from("agreement_payments")
      .select("*")
      .in("status", ["refund_requested", "disputed", "failed"])
      .order("updated_at", { ascending: false })
      .limit(50),
    supabase
      .from("agreement_events")
      .select("*")
      .in("event_type", ["dispute_opened", "cancellation_requested"])
      .order("created_at", { ascending: false })
      .limit(50),
    supabase
      .from("email_outbox")
      .select("*")
      .in("status", ["queued", "failed"])
      .order("created_at", { ascending: true })
      .limit(50),
    supabase
      .from("wish_profiles")
      .select("*")
      .in("safety_status", ["flagged", "blocked"])
      .order("updated_at", { ascending: false })
      .limit(50),
  ]);

  const errors = [reports.error, payments.error, events.error, emails.error, wishProfiles.error]
    .filter(Boolean)
    .map((error) => error?.message)
    .join(" ");

  if (errors) {
    throw new Error(errors);
  }

  return {
    reports: (reports.data ?? []) as MatchReportRow[],
    payments: (payments.data ?? []) as AgreementPaymentRow[],
    events: (events.data ?? []) as AgreementEventRow[],
    emails: (emails.data ?? []) as EmailOutboxRow[],
    wishProfiles: (wishProfiles.data ?? []) as WishProfileRow[],
  };
}

export default async function AdminPage({ searchParams }: AdminPageProps) {
  const resolvedSearchParams = await searchParams;
  const formMessage = getFormMessage(resolvedSearchParams);
  const viewer = hasSupabaseEnv() ? await requireViewer("/admin") : null;
  const isAdmin = isAdminEmail(viewer?.authUser.email);
  let queues:
    | Awaited<ReturnType<typeof loadAdminQueues>>
    | null = null;
  let loadError: string | null = null;

  if (isAdmin) {
    try {
      queues = await loadAdminQueues();
    } catch (error) {
      loadError = error instanceof Error ? error.message : "Unable to load admin queues.";
    }
  }

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
            <p className="eyebrow">Operations</p>
            <h1>Admin review console.</h1>
            <p className="hero-text">
              Review unsafe matches, payment problems, queued email, and blocked wish profiles.
              This page is gated by the `ADMIN_EMAILS` environment variable.
            </p>
          </section>
          <aside className="hero-panel panel">
            <p className="eyebrow">Queue counts</p>
            <div className="flow-card">
              <div className="flow-step">
                <span className="flow-number">01</span>
                <div>
                  <strong>{queues?.reports.length ?? 0} open report(s)</strong>
                  <p>Reported matches and safety concerns.</p>
                </div>
              </div>
              <div className="flow-step">
                <span className="flow-number">02</span>
                <div>
                  <strong>{queues?.payments.length ?? 0} payment issue(s)</strong>
                  <p>Refund requests, disputes, and failures.</p>
                </div>
              </div>
              <div className="flow-step">
                <span className="flow-number">03</span>
                <div>
                  <strong>{queues?.emails.length ?? 0} email item(s)</strong>
                  <p>Queued or failed outbound mail.</p>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </header>

      <main>
        {!hasSupabaseEnv() ? (
          <div className="status-banner status-banner-error">Supabase is not configured.</div>
        ) : null}

        {formMessage ? (
          <div
            className={`status-banner ${
              formMessage.tone === "error" ? "status-banner-error" : "status-banner-success"
            }`}
          >
            {formMessage.text}
          </div>
        ) : null}

        {!isAdmin ? (
          <section className="section section-white">
            <div className="empty-state">
              <div>
                <strong>Admin access required.</strong>
                <p>Add your signed-in email to ADMIN_EMAILS in Vercel to use this console.</p>
              </div>
            </div>
          </section>
        ) : loadError ? (
          <section className="section section-white">
            <div className="status-banner status-banner-error">{loadError}</div>
          </section>
        ) : (
          <>
            <section className="section section-white">
              <div className="section-head">
                <p className="eyebrow">Trust and safety</p>
                <h2>Open match reports</h2>
                <p>Review reports for coercion, spam, privacy risk, illegal asks, or other abuse.</p>
              </div>
              <div className="data-grid">
                {queues?.reports.length ? (
                  queues.reports.map((report) => (
                    <article className="panel data-card" key={report.id}>
                      <p className="detail-kicker">{report.reason}</p>
                      <h3>Report {report.id.slice(0, 8)}</h3>
                      <p className="route-text">{report.details || "No details provided."}</p>
                      <p className="route-text">
                        Match {report.match_id}; reporter {report.reporter_profile_id}
                      </p>
                      <div className="form-actions">
                        <form action={updateMatchReportStatusAction}>
                          <input name="report_id" type="hidden" value={report.id} />
                          <input name="return_to" type="hidden" value="/admin" />
                          <input name="status" type="hidden" value="reviewed" />
                          <button className="button button-secondary button-mini" type="submit">
                            Mark reviewed
                          </button>
                        </form>
                        <form action={updateMatchReportStatusAction}>
                          <input name="report_id" type="hidden" value={report.id} />
                          <input name="return_to" type="hidden" value="/admin" />
                          <input name="status" type="hidden" value="dismissed" />
                          <button className="button button-secondary button-mini" type="submit">
                            Dismiss
                          </button>
                        </form>
                      </div>
                    </article>
                  ))
                ) : (
                  <div className="empty-state">
                    <div>
                      <strong>No open match reports.</strong>
                      <p>Reports submitted from participant dashboards will appear here.</p>
                    </div>
                  </div>
                )}
              </div>
            </section>

            <section className="section section-subtle">
              <div className="section-head">
                <p className="eyebrow">Payments</p>
                <h2>Refund, dispute, and failed payment review</h2>
                <p>These are platform records. Stripe-side refunds and chargebacks still need to be handled in Stripe.</p>
              </div>
              <div className="data-grid">
                {queues?.payments.length ? (
                  queues.payments.map((payment) => (
                    <article className="panel data-card" key={payment.id}>
                      <p className="detail-kicker">{payment.status.replace("_", " ")}</p>
                      <h3>{formatPaymentAmount(payment.amount_cents, payment.currency)}</h3>
                      <p className="route-text">
                        Agreement{" "}
                        <Link className="inline-link" href={`/agreements/${payment.agreement_id}`}>
                          {payment.agreement_id}
                        </Link>
                      </p>
                      <p className="route-text">
                        Payer {payment.payer_id}; payee {payment.payee_id}
                      </p>
                      <div className="form-actions">
                        {["refunded", "disputed", "cancelled", "paid"].map((status) => (
                          <form action={updatePaymentReviewStatusAction} key={status}>
                            <input name="payment_id" type="hidden" value={payment.id} />
                            <input name="return_to" type="hidden" value="/admin" />
                            <input name="status" type="hidden" value={status} />
                            <button className="button button-secondary button-mini" type="submit">
                              Mark {status}
                            </button>
                          </form>
                        ))}
                      </div>
                    </article>
                  ))
                ) : (
                  <div className="empty-state">
                    <div>
                      <strong>No payment issues in the review queue.</strong>
                      <p>Refund requests, disputes, and failed payments appear here.</p>
                    </div>
                  </div>
                )}
              </div>
            </section>

            <section className="section section-white">
              <div className="section-head">
                <p className="eyebrow">Lifecycle events</p>
                <h2>Dispute and cancellation events</h2>
                <p>Events are immutable participant records for later review.</p>
              </div>
              <div className="data-grid">
                {queues?.events.length ? (
                  queues.events.map((event) => (
                    <article className="panel data-card" key={event.id}>
                      <p className="detail-kicker">{event.event_type.replace("_", " ")}</p>
                      <h3>{event.summary}</h3>
                      <p className="route-text">{event.details || "No details provided."}</p>
                      <Link className="text-button" href={`/agreements/${event.agreement_id}`}>
                        Open agreement
                      </Link>
                    </article>
                  ))
                ) : (
                  <div className="empty-state">
                    <div>
                      <strong>No dispute or cancellation events.</strong>
                      <p>Participant lifecycle problems will appear here.</p>
                    </div>
                  </div>
                )}
              </div>
            </section>

            <section className="section section-subtle">
              <div className="section-head">
                <p className="eyebrow">Email</p>
                <h2>Queued and failed email</h2>
                <p>The cron worker sends queued email through Resend when provider env vars are configured.</p>
              </div>
              <div className="data-grid">
                {queues?.emails.length ? (
                  queues.emails.map((email) => (
                    <article className="panel data-card" key={email.id}>
                      <p className="detail-kicker">{email.status}</p>
                      <h3>{email.subject}</h3>
                      <p className="route-text">{email.recipient_email || "No recipient"}</p>
                      {email.last_error ? <p className="route-text">{email.last_error}</p> : null}
                      <form action={suppressEmailOutboxAction}>
                        <input name="email_id" type="hidden" value={email.id} />
                        <input name="return_to" type="hidden" value="/admin" />
                        <button className="button button-secondary button-mini" type="submit">
                          Suppress
                        </button>
                      </form>
                    </article>
                  ))
                ) : (
                  <div className="empty-state">
                    <div>
                      <strong>No queued or failed email.</strong>
                      <p>Outbound records will appear here before the provider worker sends them.</p>
                    </div>
                  </div>
                )}
              </div>
            </section>

            <section className="section section-white">
              <div className="section-head">
                <p className="eyebrow">Wish safety</p>
                <h2>Flagged or blocked wish profiles</h2>
                <p>Profiles caught by the lightweight safety filter should be reviewed before any manual outreach.</p>
              </div>
              <div className="data-grid">
                {queues?.wishProfiles.length ? (
                  queues.wishProfiles.map((profile) => (
                    <article className="panel data-card" key={profile.profile_id}>
                      <p className="detail-kicker">{profile.safety_status}</p>
                      <h3>{profile.profile_id}</h3>
                      <p className="route-text">{profile.safety_notes || "No safety note."}</p>
                      <p className="route-text">{profile.public_preview || "No public preview."}</p>
                    </article>
                  ))
                ) : (
                  <div className="empty-state">
                    <div>
                      <strong>No flagged wish profiles.</strong>
                      <p>Blocked or flagged registry entries will appear here.</p>
                    </div>
                  </div>
                )}
              </div>
            </section>
          </>
        )}
      </main>

      <SiteFooter />
    </div>
  );
}
