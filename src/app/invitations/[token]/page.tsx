import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { respondToTradeInvitationAction } from "@/app/core-trade-actions";
import { PendingSubmitButton } from "@/components/core-trade/pending-submit-button";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteTopbar } from "@/components/layout/site-topbar";
import { getViewer } from "@/lib/app-data";
import { getInvitationByToken } from "@/lib/core-trade";
import { getFormMessage } from "@/lib/form-state";
import { getPrimaryNavLinks, getTopbarActions } from "@/lib/site";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  title: "Private trade invitation",
  robots: { index: false, follow: false },
};

interface InvitationPageProps {
  params: Promise<{ token: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function InvitationPage({ params, searchParams }: InvitationPageProps) {
  const [{ token }, resolvedSearchParams, viewer] = await Promise.all([
    params,
    searchParams,
    getViewer(),
  ]);
  const record = await getInvitationByToken(token);
  if (!record) notFound();
  const { invitation, offer, sender } = record;
  const formMessage = getFormMessage(resolvedSearchParams);
  const returnTo = `/invitations/${token}`;

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
          >
            {formMessage.text}
          </div>
        ) : null}

        <section className="section section-white" aria-labelledby="invitation-heading">
          <div className="section-head section-head-compact">
            <p className="eyebrow">Private invitation</p>
            <h1 id="invitation-heading">
              {offer.offered_cause} ↔ {offer.requested_cause}
            </h1>
            <p>
              {sender?.display_name ?? "A Moral Trade participant"} invited you to inspect a bounded,
              non-financial proposal. The invitation creates no obligation. You may decline without
              explanation or retaliation.
            </p>
          </div>

          <div className="detail-grid detail-grid-wide">
            <article className="panel detail-block">
              <p className="detail-kicker">Deal receipt</p>
              <h2>Terms before response</h2>
              <dl className="detail-grid">
                <div>
                  <dt>Without this deal</dt>
                  <dd>{offer.no_trade_baseline}</dd>
                </div>
                <div>
                  <dt>Inviter commits</dt>
                  <dd>{offer.offer_action}</dd>
                </div>
                <div>
                  <dt>Counterparty commits</dt>
                  <dd>{offer.request_action}</dd>
                </div>
                <div>
                  <dt>Duration</dt>
                  <dd>{offer.duration}</dd>
                </div>
                <div>
                  <dt>Commitment limit</dt>
                  <dd>{offer.maximum_burden}</dd>
                </div>
                <div>
                  <dt>Evidence</dt>
                  <dd>{offer.verification}</dd>
                </div>
                <div>
                  <dt>Exit</dt>
                  <dd>{offer.exit_conditions}</dd>
                </div>
                <div>
                  <dt>Privacy</dt>
                  <dd>{offer.privacy_scope}</dd>
                </div>
              </dl>
              {invitation.message ? (
                <div className="status-banner">
                  <strong>Invitation note</strong>
                  <p>{invitation.message}</p>
                </div>
              ) : null}
            </article>

            <aside className="panel detail-block">
              <p className="detail-kicker">Your decision</p>
              <h2>{invitation.status.replaceAll("_", " ")}</h2>
              {!viewer ? (
                <>
                  <p className="route-text">
                    Sign in or create an account before sending a private response. The token will
                    return you to this exact proposal.
                  </p>
                  <div className="form-actions">
                    <Link
                      className="button button-primary"
                      href={`/signup?returnTo=${encodeURIComponent(returnTo)}`}
                    >
                      Create account to respond
                    </Link>
                    <Link
                      className="button button-secondary"
                      href={`/login?returnTo=${encodeURIComponent(returnTo)}`}
                    >
                      Sign in
                    </Link>
                  </div>
                </>
              ) : invitation.status === "responded" ? (
                <div className="status-banner status-banner-success">
                  <strong>Response already recorded</strong>
                  <p>Open Messages to continue the private negotiation.</p>
                  <Link className="button button-primary button-mini" href="/messages">
                    Open Messages
                  </Link>
                </div>
              ) : invitation.status === "declined" ? (
                <p className="route-text">This invitation was declined. No agreement exists.</p>
              ) : (
                <form action={respondToTradeInvitationAction} className="stack-form">
                  <input name="token" type="hidden" value={token} />
                  <label className="field">
                    <span>Private response note</span>
                    <textarea
                      name="message"
                      placeholder="What looks workable, what needs changing, or why you are interested"
                      rows={5}
                    />
                  </label>
                  <div className="form-actions">
                    <PendingSubmitButton
                      name="decision"
                      pendingLabel="Sending response..."
                      value="respond"
                    >
                      Respond and open thread
                    </PendingSubmitButton>
                    <PendingSubmitButton
                      className="button button-secondary"
                      name="decision"
                      pendingLabel="Declining..."
                      value="decline"
                    >
                      Decline without obligation
                    </PendingSubmitButton>
                  </div>
                </form>
              )}

              <div className="status-banner">
                <strong>Before reliance</strong>
                <p>
                  A response opens a private thread. It does not activate the proposal. Structured
                  terms can be counterproposed, and both parties must separately confirm the same
                  immutable agreement version.
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
