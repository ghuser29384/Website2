import { ArrowsLeftRight } from "@phosphor-icons/react/dist/ssr";
import Link from "next/link";

import { toggleCartAction } from "@/app/actions";
import { formatMode } from "@/lib/offers";
import { isVerifiedEvidenceText } from "@/lib/smart-query-records";
import type { Database } from "@/lib/supabase/database.types";

import styles from "./participant-offer-group.module.css";

type OfferRow = Database["public"]["Tables"]["offers"]["Row"];

interface ParticipantOfferGroupProps {
  currentReturnTo: string;
  isAuthenticated: boolean;
  offers: OfferRow[];
  participantName: string;
  savedOfferIds: ReadonlySet<string>;
  viewerId: string | null;
}

function authHref(path: string, isAuthenticated: boolean, mode: "login" | "signup") {
  return isAuthenticated ? path : `/${mode}?returnTo=${encodeURIComponent(path)}`;
}

export function ParticipantOfferGroup({
  currentReturnTo,
  isAuthenticated,
  offers,
  participantName,
  savedOfferIds,
  viewerId,
}: ParticipantOfferGroupProps) {
  const ownerId = offers[0]?.owner_id;
  if (!ownerId || !offers.length) return null;

  const headingId = `participant-${ownerId}`;
  const truthNoteId = `participant-${ownerId}-truth-note`;

  return (
    <article
      aria-labelledby={headingId}
      className={styles.group}
      data-testid="participant-offer-group"
    >
      <header className={styles.groupHeader}>
        <div className={styles.identity}>
          <div>
            <p className={styles.kicker}>Participant</p>
            <h3 id={headingId}>{participantName}</h3>
          </div>
        </div>
        <p className={styles.proposalCount}>
          {offers.length} exact proposal{offers.length === 1 ? "" : "s"}
        </p>
      </header>

      <div className={styles.offerList}>
        {offers.map((offer) => {
          const offerHref = `/offers/${offer.id}`;
          const respondHref = `${offerHref}#respond`;
          const questionHref = `${offerHref}#discussion`;
          const counterofferHref = `/offers/new?mode=${offer.mode}&source_offer=${offer.id}`;
          const isOwner = viewerId === offer.owner_id;
          const saved = savedOfferIds.has(offer.id);
          const verified = isVerifiedEvidenceText(offer.verification);
          const offerHeadingId = `offer-${offer.id}-heading`;

          return (
            <section
              aria-describedby={truthNoteId}
              aria-labelledby={offerHeadingId}
              className={styles.offer}
              data-offer-id={offer.id}
              data-testid="proposal-row"
              key={offer.id}
            >
              <div className={styles.offerHeading}>
                <div>
                  <p className={styles.kicker}>{formatMode(offer.mode)}</p>
                  <h4 id={offerHeadingId}>
                    {offer.offered_cause}
                    <span aria-hidden="true"> / </span>
                    {offer.requested_cause}
                  </h4>
                </div>
                <Link
                  className={styles.primaryAction}
                  data-testid="proposal-primary-action"
                  href={isOwner ? offerHref : authHref(respondHref, isAuthenticated, "login")}
                >
                  {isOwner ? "Manage" : "Respond"}
                </Link>
              </div>

              <div className={styles.exchange}>
                <div className={styles.term}>
                  <span>Offers</span>
                  <strong>{offer.offer_action}</strong>
                </div>
                <ArrowsLeftRight aria-hidden="true" className={styles.exchangeArrow} size={28} weight="thin" />
                <div className={styles.term}>
                  <span>Requests</span>
                  <strong>{offer.request_action}</strong>
                </div>
              </div>

              <ul aria-label="Proposal state" className={styles.meta}>
                <li title={offer.duration}>{offer.duration}</li>
                <li>{verified ? "Named verification evidence" : "Verification terms stated"}</li>
                <li>Open · Exact published proposal</li>
              </ul>

              <details className={styles.disclosure} data-testid="proposal-disclosure">
                <summary>More actions &amp; exact terms</summary>
                <div className={styles.disclosureBody}>
                  <dl className={styles.exactTerms}>
                    <div>
                      <dt>Offered cause</dt>
                      <dd>{offer.offered_cause}</dd>
                    </div>
                    <div>
                      <dt>Requested cause</dt>
                      <dd>{offer.requested_cause}</dd>
                    </div>
                    <div>
                      <dt>Exact offer</dt>
                      <dd>{offer.offer_action}</dd>
                    </div>
                    <div>
                      <dt>Exact request</dt>
                      <dd>{offer.request_action}</dd>
                    </div>
                    <div>
                      <dt>Duration</dt>
                      <dd>{offer.duration}</dd>
                    </div>
                    <div>
                      <dt>Evidence</dt>
                      <dd>{offer.verification}</dd>
                    </div>
                    <div>
                      <dt>Terms note</dt>
                      <dd>{offer.discount_note || "Bounded terms"}</dd>
                    </div>
                    {offer.notes ? (
                      <div>
                        <dt>Additional terms</dt>
                        <dd>{offer.notes}</dd>
                      </div>
                    ) : null}
                  </dl>

                  <nav aria-label={`Actions for ${offer.offered_cause}`} className={styles.actions}>
                    {!isOwner ? (
                      <Link href={authHref(counterofferHref, isAuthenticated, "signup")}>
                        Counteroffer
                      </Link>
                    ) : null}
                    <Link href={questionHref}>Ask</Link>
                    {isAuthenticated && !isOwner ? (
                      <form action={toggleCartAction}>
                        <input name="offer_id" type="hidden" value={offer.id} />
                        <input name="return_to" type="hidden" value={currentReturnTo} />
                        <button type="submit">{saved ? "Remove saved" : "Save"}</button>
                      </form>
                    ) : !isAuthenticated ? (
                      <Link href={`/login?returnTo=${encodeURIComponent(offerHref)}`}>Save</Link>
                    ) : null}
                    <Link className={styles.detailLink} href={offerHref}>
                      Open full terms <span aria-hidden="true">↗</span>
                    </Link>
                  </nav>
                </div>
              </details>
            </section>
          );
        })}
      </div>

      <p className={styles.truthNote} id={truthNoteId}>
        These are the owner&apos;s exact published terms. Counteroffer opens a new proposal; it does
        not imply that this participant has already accepted a different combination.
      </p>
    </article>
  );
}
