import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { respondToTradeInvitationAction } from "@/app/core-trade-actions";
import { PendingSubmitButton } from "@/components/core-trade/pending-submit-button";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteTopbar } from "@/components/layout/site-topbar";
import { LocalDateTime } from "@/components/ui/local-date-time";
import { getViewer } from "@/lib/app-data";
import { getInvitationByToken } from "@/lib/core-trade";
import { getFormMessage } from "@/lib/form-state";
import { getPrimaryNavLinks, getTopbarActions } from "@/lib/site";
import { isTradeInvitationUsable } from "@/lib/trade-invitations";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  title: "Private trade invitation",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

interface InvitationPageProps {
  params: Promise<{ token: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

function HiddenResponseFields({ token }: { token: string }) {
  return <input name="token" type="hidden" value={token} />;
}

export default async function InvitationPage({ params, searchParams }: InvitationPageProps) {
  const [{ token }, resolvedSearchParams, viewer] = await Promise.all([
    params,
    searchParams,
    getViewer(),
  ]);
  const record = await getInvitationByToken(token, viewer?.authUser.id);
  if (!record) notFound();

  const { offer } = record;
  const formMessage = getFormMessage(resolvedSearchParams);
  const returnTo = `/invitations/${token}`;
  const usable = isTradeInvitationUsable(record.status);

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

        <section className="section section-white" aria-labelledby="invitation-heading">
          <div className="section-head section-head-compact">
            <p className="eyebrow">Private invitation · expires in 14 days</p>
            <h1 id="invitation-heading">
              {offer.offeredCause} ↔ {offer.requestedCause}
            </h1>
            <p>
              {record.senderDisplayName} invited you to inspect a bounded, non-financial proposal.
              You can read every term before creating an account. The invitation itself creates no
              obligation.
            </p>
          </div>

          <div className="detail-grid detail-grid-wide">
            <article className="panel detail-block">
              <p className="detail-kicker">Reviewed terms · version {offer.termsVersion}</p>
              <h2>Complete proposal</h2>
              <dl className="detail-grid">
                <div>
                  <dt>Without this deal</dt>
                  <dd>{offer.noTradeBaseline}</dd>
                </div>
                <div>
                  <dt>Inviter commits</dt>
                  <dd>{offer.offerAction}</dd>
                </div>
                <div>
                  <dt>Counterparty commits</dt>
                  <dd>{offer.requestAction}</dd>
                </div>
                <div>
                  <dt>Duration</dt>
                  <dd>{offer.duration}</dd>
                </div>
                <div>
                  <dt>Start date</dt>
                  <dd>{offer.startDate ?? "Set during final confirmation"}</dd>
                </div>
                <div>
                  <dt>Commitment limit</dt>
                  <dd>{offer.maximumBurden}</dd>
                </div>
                <div>
                  <dt>Evidence</dt>
                  <dd>{offer.verification}</dd>
                </div>
                <div>
                  <dt>Evidence due</dt>
                  <dd>{offer.evidenceDueDate ?? "No separate due date"}</dd>
                </div>
                <div>
                  <dt>Exit</dt>
                  <dd>{offer.exitConditions}</dd>
                </div>
                <div>
                  <dt>Privacy</dt>
                  <dd>{offer.privacyScope}</dd>
                </div>
              </dl>
              {record.message ? (
                <div className="status-banner">
                  <strong>Private note from the inviter</strong>
                  <p>{record.message}</p>
                </div>
              ) : null}
              <p className="route-text">
                Link expires <LocalDateTime value={record.expiresAt} fallback={record.expiresAt} />.
                Email invitations are locked to the confirmed addressed account. Share links bind
                permanently to the first signed-in person who answers.
              </p>
            </article>

            <aside className="panel detail-block">
              <p className="detail-kicker">Your decision</p>
              <h2>{record.status.replaceAll("_", " ")}</h2>

              {!viewer ? (
                <>
                  <p className="route-text">
                    Create an account or sign in only when you are ready to accept, counter, or
                    decline. You will return to this exact reviewed proposal.
                  </p>
                  <div className="form-actions">
                    <Link
                      className="button button-primary"
                      href={`/signup?returnTo=${encodeURIComponent(returnTo)}`}
                    >
                      Create account to answer
                    </Link>
                    <Link
                      className="button button-secondary"
                      href={`/login?returnTo=${encodeURIComponent(returnTo)}`}
                    >
                      Sign in
                    </Link>
                  </div>
                </>
              ) : usable ? (
                <div className="mini-list">
                  <form action={respondToTradeInvitationAction} className="stack-form">
                    <HiddenResponseFields token={token} />
                    <input name="decision" type="hidden" value="accept" />
                    <label className="field">
                      <span>Optional private response note</span>
                      <textarea
                        name="message"
                        placeholder="What makes these exact terms workable for you?"
                        rows={4}
                      />
                    </label>
                    <PendingSubmitButton pendingLabel="Accepting reviewed terms...">
                      Accept these exact terms
                    </PendingSubmitButton>
                    <p className="route-text">
                      Acceptance creates a frozen proposed agreement. It becomes active only after
                      both participants separately confirm that same version.
                    </p>
                  </form>

                  <details className="subtle-panel">
                    <summary>
                      <strong>Counter with different terms</strong>
                    </summary>
                    <form action={respondToTradeInvitationAction} className="stack-form">
                      <HiddenResponseFields token={token} />
                      <input name="decision" type="hidden" value="counter" />
                      <label className="field">
                        <span>Private response note</span>
                        <textarea
                          name="message"
                          placeholder="Briefly explain the changes you are proposing"
                          rows={3}
                        />
                      </label>
                      <label className="field">
                        <span>Inviter commitment</span>
                        <textarea defaultValue={offer.offerAction} name="proposed_action" required rows={4} />
                      </label>
                      <label className="field">
                        <span>Your commitment</span>
                        <textarea defaultValue={offer.requestAction} name="requested_action" required rows={4} />
                      </label>
                      <div className="field-grid">
                        <label className="field">
                          <span>Duration</span>
                          <input defaultValue={offer.duration} name="duration" required />
                        </label>
                        <label className="field">
                          <span>Start date</span>
                          <input defaultValue={offer.startDate ?? ""} name="start_date" type="date" />
                        </label>
                      </div>
                      <label className="field">
                        <span>Evidence rule</span>
                        <textarea defaultValue={offer.verification} name="evidence_rule" required rows={3} />
                      </label>
                      <label className="field">
                        <span>Evidence due date</span>
                        <input
                          defaultValue={offer.evidenceDueDate ?? ""}
                          name="evidence_due_date"
                          type="date"
                        />
                      </label>
                      <label className="field">
                        <span>Exit conditions</span>
                        <textarea defaultValue={offer.exitConditions} name="exit_conditions" required rows={3} />
                      </label>
                      <label className="field">
                        <span>Maximum burden</span>
                        <textarea defaultValue={offer.maximumBurden} name="maximum_burden" required rows={3} />
                      </label>
                      <label className="field">
                        <span>Privacy scope</span>
                        <textarea defaultValue={offer.privacyScope} name="privacy_scope" required rows={3} />
                      </label>
                      <label className="field">
                        <span>No-trade baseline</span>
                        <textarea
                          defaultValue={offer.noTradeBaseline}
                          name="no_trade_baseline"
                          required
                          rows={3}
                        />
                      </label>
                      <PendingSubmitButton pendingLabel="Sending counterproposal...">
                        Send counterproposal
                      </PendingSubmitButton>
                    </form>
                  </details>

                  <form action={respondToTradeInvitationAction}>
                    <HiddenResponseFields token={token} />
                    <input name="decision" type="hidden" value="decline" />
                    <PendingSubmitButton
                      className="button button-secondary"
                      pendingLabel="Declining..."
                    >
                      Decline without obligation
                    </PendingSubmitButton>
                  </form>
                </div>
              ) : record.threadId ? (
                <div className="status-banner status-banner-success">
                  <strong>Decision already recorded</strong>
                  <p>Continue from the private record created by this invitation.</p>
                  <Link className="button button-primary button-mini" href={`/messages/${record.threadId}`}>
                    Open private thread
                  </Link>
                </div>
              ) : (
                <p className="route-text">
                  This invitation is {record.status.replaceAll("_", " ")}. It cannot be answered
                  again.
                </p>
              )}

              <div className="status-banner">
                <strong>Consent boundary</strong>
                <p>
                  Accepting does not move money and does not immediately activate a commitment.
                  Any counterproposal is a new immutable round. Final activation always requires
                  two confirmations of the same frozen version.
                </p>
              </div>
            </aside>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
