import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import {
  createTradeInvitationAction,
  revokeTradeInvitationAction,
} from "@/app/core-trade-actions";
import { InvitationShareControls } from "@/components/core-trade/invitation-share-controls";
import { PendingSubmitButton } from "@/components/core-trade/pending-submit-button";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteTopbar } from "@/components/layout/site-topbar";
import { LocalDateTime } from "@/components/ui/local-date-time";
import { requireViewer } from "@/lib/app-data";
import {
  getCoreOfferForOwner,
  listTradeInvitationsForOffer,
} from "@/lib/core-trade";
import { getFormMessage } from "@/lib/form-state";
import { getPrimaryNavLinks, getTopbarActions } from "@/lib/site";
import { getSiteUrl } from "@/lib/supabase/config";
import { isTradeInvitationUsable } from "@/lib/trade-invitations";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  title: "Invite someone",
  robots: { index: false, follow: false },
};

interface InvitePageProps {
  params: Promise<{ offerId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

function deliveryLabel(deliveryKind: string) {
  return deliveryKind === "email" ? "Email-bound" : "First-claim share link";
}

export default async function InvitePage({ params, searchParams }: InvitePageProps) {
  const [{ offerId }, resolvedSearchParams] = await Promise.all([params, searchParams]);
  const viewer = await requireViewer(`/trades/${offerId}/invite`);
  const offer = await getCoreOfferForOwner(offerId, viewer.authUser.id);
  if (!offer) notFound();

  const invitations = await listTradeInvitationsForOffer(offer.id, viewer.authUser.id);
  const formMessage = getFormMessage(resolvedSearchParams);
  const invitationBase = new URL("/invitations/", getSiteUrl()).toString();
  const eligible = offer.workflow_status === "published" && offer.status === "open";

  return (
    <div className="page-shell marketplace-app-shell">
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
              formMessage.tone === "error" ? "status-banner-error" : "status-banner-success"
            }`}
            role="status"
          >
            {formMessage.text}
          </div>
        ) : null}

        <section className="section section-white" aria-labelledby="invite-heading">
          <div className="section-head section-head-compact">
            <p className="eyebrow">Invitation-first trade</p>
            <h1 id="invite-heading">Invite someone outside Moral Trade.</h1>
            <p>
              You are inviting them to inspect “{offer.offered_cause} ↔ {offer.requested_cause}.”
              They can read all terms before joining, then accept, counter, or decline.
            </p>
            <div className="form-actions">
              <Link className="button button-secondary" href={`/trades/${offer.id}/manage`}>
                Back to proposal
              </Link>
              <Link className="button button-secondary" href={`/offers/${offer.id}`}>
                View public offer
              </Link>
            </div>
          </div>

          {eligible ? (
            <div className="detail-grid detail-grid-wide">
              <form action={createTradeInvitationAction} className="panel stack-form">
                <input name="offer_id" type="hidden" value={offer.id} />
                <p className="detail-kicker">Create invitation</p>
                <h2>Email one person or make a private link.</h2>
                <label className="field">
                  <span>Recipient email (optional)</span>
                  <input
                    autoComplete="email"
                    name="recipient_email"
                    placeholder="person@example.org"
                    type="email"
                  />
                </label>
                <p className="route-text">
                  With an email, only the matching confirmed account can answer. Without one, the
                  first signed-in person to answer permanently claims the link.
                </p>
                <label className="field">
                  <span>Private invitation note (optional)</span>
                  <textarea
                    maxLength={4000}
                    name="message"
                    placeholder="Why this exact proposal may be worth their time"
                    rows={5}
                  />
                </label>
                <PendingSubmitButton pendingLabel="Creating secure invitation...">
                  Create 14-day invitation
                </PendingSubmitButton>
              </form>

              <article className="panel detail-block">
                <p className="detail-kicker">What the recipient sees</p>
                <h2>Terms before account creation.</h2>
                <dl className="detail-grid">
                  <div>
                    <dt>Your commitment</dt>
                    <dd>{offer.offer_action}</dd>
                  </div>
                  <div>
                    <dt>Their commitment</dt>
                    <dd>{offer.request_action}</dd>
                  </div>
                  <div>
                    <dt>No-trade baseline</dt>
                    <dd>{offer.no_trade_baseline}</dd>
                  </div>
                  <div>
                    <dt>Maximum burden</dt>
                    <dd>{offer.maximum_burden}</dd>
                  </div>
                </dl>
                <div className="status-banner">
                  <strong>No immediate activation</strong>
                  <p>
                    Even an acceptance creates only a proposed frozen agreement. Both participants
                    must separately confirm that exact version before it becomes active.
                  </p>
                </div>
              </article>
            </div>
          ) : (
            <div className="status-banner status-banner-error">
              <strong>This proposal is not invitation-eligible.</strong>
              <p>
                Invitations require a published, open, bounded, non-financial pledge proposal.
              </p>
              <Link className="button button-secondary button-mini" href={`/trades/${offer.id}/manage`}>
                Review proposal state
              </Link>
            </div>
          )}
        </section>

        <section className="section section-subtle" aria-labelledby="invitation-status-heading">
          <div className="section-head section-head-compact">
            <p className="eyebrow">Delivery and responses</p>
            <h2 id="invitation-status-heading">
              {invitations.length} invitation{invitations.length === 1 ? "" : "s"}
            </h2>
            <p>
              Open links can be copied, shared, previewed, or revoked. Email links are also shown
              here so you can use a trusted existing channel if delivery is delayed.
            </p>
          </div>

          <div className="data-grid">
            {invitations.length ? (
              invitations.map((invitation) => {
                const usable = isTradeInvitationUsable(invitation.status);
                const invitationUrl = invitation.token
                  ? `${invitationBase}${invitation.token}`
                  : "";
                return (
                  <article className="panel data-card" key={invitation.id}>
                    <p className="detail-kicker">{deliveryLabel(invitation.delivery_kind)}</p>
                    <h3>{invitation.status.replaceAll("_", " ")}</h3>
                    <dl className="detail-grid">
                      <div>
                        <dt>Recipient</dt>
                        <dd>{invitation.recipient_email || "Anyone holding the unclaimed link"}</dd>
                      </div>
                      <div>
                        <dt>Created</dt>
                        <dd>
                          <LocalDateTime
                            value={invitation.created_at}
                            fallback={invitation.created_at}
                          />
                        </dd>
                      </div>
                      <div>
                        <dt>Expires</dt>
                        <dd>
                          <LocalDateTime
                            value={invitation.expires_at}
                            fallback={invitation.expires_at}
                          />
                        </dd>
                      </div>
                    </dl>
                    {usable && invitationUrl ? (
                      <InvitationShareControls invitationUrl={invitationUrl} />
                    ) : invitation.revocation_reason ? (
                      <p className="route-text">{invitation.revocation_reason}</p>
                    ) : null}
                    {usable ? (
                      <form action={revokeTradeInvitationAction}>
                        <input name="invitation_id" type="hidden" value={invitation.id} />
                        <input name="offer_id" type="hidden" value={offer.id} />
                        <PendingSubmitButton
                          className="button button-secondary button-mini"
                          pendingLabel="Revoking..."
                        >
                          Revoke invitation
                        </PendingSubmitButton>
                      </form>
                    ) : null}
                  </article>
                );
              })
            ) : (
              <article className="panel data-card">
                <h3>No invitations yet</h3>
                <p className="route-text">
                  Create one above. It will remain private and expire automatically after 14 days.
                </p>
              </article>
            )}
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
