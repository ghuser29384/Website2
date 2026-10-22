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
import styles from "@/components/core-trade/offer-workspace.module.css";
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
  return deliveryKind === "email" ? "Email invitation" : "Share link";
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
    <div className={styles.page} data-offer-workspace>
      <header className={styles.header}>
        <SiteTopbar
          brandHref="/"
          links={getPrimaryNavLinks(true)}
          {...getTopbarActions(true)}
          showSearch={false}
          showLogout
        />
      </header>

      <main className={styles.main} id="main-content" tabIndex={-1}>
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

        <nav className={styles.breadcrumb} aria-label="Breadcrumb">
          <Link href={`/trades/${offer.id}/manage`}>Manage proposal</Link><span aria-hidden="true">/</span><span>Invite</span>
        </nav>
        <header className={styles.intro}>
          <h1 id="invite-heading">Invite someone</h1>
          <p className={styles.proposalTitle}>{offer.offered_cause} ↔ {offer.requested_cause}</p>
        </header>
        <section aria-labelledby="invite-heading">
          {eligible ? (
            <div className={styles.inviteGrid}>
              <form action={createTradeInvitationAction} className={`${styles.card} stack-form`}>
                <input name="offer_id" type="hidden" value={offer.id} />
                <h2>Create invitation</h2>
                <label className="field">
                  <span>Recipient email (optional)</span>
                  <input
                    aria-describedby="recipient-help"
                    autoComplete="email"
                    name="recipient_email"
                    placeholder="person@example.org"
                    type="email"
                  />
                </label>
                <p className={styles.fieldHelp} id="recipient-help">Add an email to limit responses to that person. Leave it blank for a link claimed by the first signed-in person who answers.</p>
                <label className="field">
                  <span>Personal note (optional)</span>
                  <textarea
                    maxLength={4000}
                    name="message"
                    placeholder="Add a short message"
                    rows={4}
                  />
                </label>
                <PendingSubmitButton pendingLabel="Creating invitation...">
                  Create 14-day invitation
                </PendingSubmitButton>
              </form>

              <article className={styles.card}>
                <h2>Proposal preview</h2>
                <dl className={styles.terms}>
                  <div>
                    <dt>Your commitment</dt>
                    <dd>{offer.offer_action}</dd>
                  </div>
                  <div>
                    <dt>Their commitment</dt>
                    <dd>{offer.request_action}</dd>
                  </div>

                </dl>
                <details className={styles.inlineDetails}>
                  <summary>More terms</summary>
                  <dl className={styles.terms}>
                    <div><dt>No-trade baseline</dt><dd>{offer.no_trade_baseline}</dd></div>
                    <div><dt>Maximum burden</dt><dd>{offer.maximum_burden}</dd></div>
                  </dl>
                </details>
                <p className={styles.small}>Both participants must confirm the same agreement before it becomes active.</p>
                <Link className={styles.textLink} href={`/offers/${offer.id}`}>View full proposal</Link>
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

        <section className={styles.history} aria-labelledby="invitation-status-heading">
          <div className={styles.sectionHeading}>
            <h2 id="invitation-status-heading">Invitations</h2>
            <span className={styles.count}>{invitations.length}</span>
          </div>
          <div className={styles.invitationList}>
            {invitations.length ? (
              invitations.map((invitation) => {
                const usable = isTradeInvitationUsable(invitation.status);
                const invitationUrl = invitation.token
                  ? `${invitationBase}${invitation.token}`
                  : "";
                return (
                  <article className={styles.card} key={invitation.id}>
                    <div className={styles.invitationHeading}>
                      <div>
                        <h3>{invitation.recipient_email || "Private share link"}</h3>
                        <p className={styles.small}>{deliveryLabel(invitation.delivery_kind)}</p>
                      </div>
                      <span className={styles.status}>{invitation.status.replaceAll("_", " ")}</span>
                    </div>
                    <dl className={styles.invitationDates}>
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
                    <div className={styles.invitationActions}>
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
                    </div>
                  </article>
                );
              })
            ) : (
              <article className={styles.card}>
                <h3>No invitations yet</h3>
                <p className="route-text">
                  {eligible ? "Your invitations will appear here." : "There are no invitations for this proposal."}
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
