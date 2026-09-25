import Link from "next/link";

import { toggleCartAction } from "@/app/actions";
import { groupOffersByUnderlyingAction } from "@/lib/marketplace-participant-groups";
import { formatMode } from "@/lib/offers";
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
  const actionGroups = groupOffersByUnderlyingAction(offers);

  return (
    <article
      aria-labelledby={headingId}
      className={styles.group}
      data-participant-offer-group
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
          {offers.length} exact proposal{offers.length === 1 ? "" : "s"} ·{" "}
          {actionGroups.length} offered action{actionGroups.length === 1 ? "" : "s"}
        </p>
      </header>

      <div className={styles.offerList}>
        {actionGroups.map((actionGroup) => (
          <section className={styles.actionGroup} key={actionGroup.key}>
            <header className={styles.actionGroupHeader}>
              <div>
                <p className={styles.kicker}>One offered action</p>
                <strong>{actionGroup.offeredAction}</strong>
              </div>
              <span>
                {actionGroup.offers.length} requested-action alternative
                {actionGroup.offers.length === 1 ? "" : "s"}
              </span>
            </header>
            <div className={styles.actionOfferList}>
              {actionGroup.offers.map((offer) => {
          const offerHref = `/offers/${offer.id}`;
          const respondHref = `${offerHref}#respond`;
          const questionHref = `${offerHref}#discussion`;
          const counterofferHref = `/offers/new?mode=${offer.mode}&source_offer=${offer.id}`;
          const isOwner = viewerId === offer.owner_id;
          const saved = savedOfferIds.has(offer.id);
          const offerHeadingId = `offer-${offer.id}-heading`;
          const offerDescriptionId = `offer-${offer.id}-description`;

          return (
            <section
              aria-describedby={`${offerDescriptionId} ${truthNoteId}`}
              aria-labelledby={offerHeadingId}
              className={styles.offer}
              data-offer-id={offer.id}
              data-participant-offer
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
                  prefetch={false}
                >
                  {isOwner ? "Manage" : "Respond"}
                </Link>
              </div>

              <ul aria-label="Proposal summary" className={styles.meta} id={offerDescriptionId}>
                <li>{offer.duration}</li>
                <li>Verification method stated · not independently reviewed</li>
                <li>Open · Exact published proposal</li>
              </ul>

              <details className={styles.disclosure} data-proposal-disclosure data-testid="proposal-disclosure">
                <summary>Exact terms &amp; more actions</summary>
                <div className={styles.disclosureBody}>
                  <dl className={styles.exactTerms}>
                    <div>
                      <dt>Get</dt>
                      <dd>{offer.request_action}</dd>
                    </div>
                    <div>
                      <dt>Do</dt>
                      <dd>{offer.offer_action}</dd>
                    </div>
                    <div>
                      <dt>Offered cause</dt>
                      <dd>{offer.offered_cause}</dd>
                    </div>
                    <div>
                      <dt>Requested cause</dt>
                      <dd>{offer.requested_cause}</dd>
                    </div>
                    <div>
                      <dt>Duration</dt>
                      <dd>{offer.duration}</dd>
                    </div>
                    <div>
                      <dt>Evidence and reliability</dt>
                      <dd>{offer.verification}</dd>
                    </div>
                    <div>
                      <dt>Evidence status</dt>
                      <dd>Verification method stated · not independently reviewed</dd>
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
                      <Link href={authHref(counterofferHref, isAuthenticated, "signup")} prefetch={false}>
                        Counteroffer
                      </Link>
                    ) : null}
                    <Link href={questionHref} prefetch={false}>Ask</Link>
                    {isAuthenticated && !isOwner ? (
                      <form action={toggleCartAction}>
                        <input name="offer_id" type="hidden" value={offer.id} />
                        <input name="return_to" type="hidden" value={currentReturnTo} />
                        <button type="submit">{saved ? "Remove saved" : "Save"}</button>
                      </form>
                    ) : !isAuthenticated ? (
                      <Link href={`/login?returnTo=${encodeURIComponent(offerHref)}`} prefetch={false}>Save</Link>
                    ) : null}
                    <Link className={styles.detailLink} href={offerHref} prefetch={false}>
                      Open full terms <span aria-hidden="true">↗</span>
                    </Link>
                  </nav>
                </div>
              </details>
            </section>
          );
              })}
            </div>
          </section>
        ))}
      </div>

      <p className={styles.truthNote} data-participant-exact-terms-note id={truthNoteId}>
        These are the owner&apos;s exact published terms. Counteroffer opens a new proposal; it does
        not imply that this participant has already accepted a different combination.
      </p>
    </article>
  );
}
