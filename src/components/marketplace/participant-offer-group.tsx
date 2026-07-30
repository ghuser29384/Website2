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

function initials(value: string) {
  const parts = value.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "MT";
  return parts.slice(0, 2).map((part) => part[0]?.toUpperCase()).join("");
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

  return (
    <article aria-labelledby={headingId} className={styles.group}>
      <header className={styles.groupHeader}>
        <div className={styles.identity}>
          <span aria-hidden="true" className={styles.avatar}>{initials(participantName)}</span>
          <div>
            <p className={styles.kicker}>Participant menu</p>
            <h3 id={headingId}>{participantName}</h3>
          </div>
        </div>
        <span className={styles.proposalCount}>
          {offers.length} exact proposal{offers.length === 1 ? "" : "s"}
        </span>
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

          return (
            <section className={styles.offer} key={offer.id}>
              <div className={styles.offerHeading}>
                <div>
                  <p className={styles.kicker}>{formatMode(offer.mode)}</p>
                  <h4>{offer.offered_cause} <span aria-hidden="true">↔</span> {offer.requested_cause}</h4>
                </div>
                <span className={styles.liveState}>Exact published proposal</span>
              </div>

              <div className={styles.exchange}>
                <div className={styles.termCard}>
                  <span>Offers</span>
                  <strong>{offer.offer_action}</strong>
                </div>
                <span aria-hidden="true" className={styles.exchangeArrow}>↔</span>
                <div className={styles.termCard}>
                  <span>Requests</span>
                  <strong>{offer.request_action}</strong>
                </div>
              </div>

              <div className={styles.meta}>
                <span>{offer.duration}</span>
                <span>{verified ? "Named verification evidence" : "Verification terms stated"}</span>
                <span>{offer.discount_note || "Bounded terms"}</span>
              </div>

              <div className={styles.actions}>
                <Link
                  className="button button-primary button-mini"
                  href={isOwner ? offerHref : authHref(respondHref, isAuthenticated, "login")}
                >
                  {isOwner ? "Manage" : "Respond"}
                </Link>
                {!isOwner ? (
                  <Link
                    className="button button-secondary button-mini"
                    href={authHref(counterofferHref, isAuthenticated, "signup")}
                  >
                    Counteroffer
                  </Link>
                ) : null}
                <Link className="button button-secondary button-mini" href={questionHref}>
                  Ask
                </Link>
                {isAuthenticated && !isOwner ? (
                  <form action={toggleCartAction}>
                    <input name="offer_id" type="hidden" value={offer.id} />
                    <input name="return_to" type="hidden" value={currentReturnTo} />
                    <button className="button button-secondary button-mini" type="submit">
                      {saved ? "Remove saved" : "Save"}
                    </button>
                  </form>
                ) : !isAuthenticated ? (
                  <Link
                    className="button button-secondary button-mini"
                    href={`/login?returnTo=${encodeURIComponent(offerHref)}`}
                  >
                    Save
                  </Link>
                ) : null}
                <Link className={styles.detailLink} href={offerHref}>Open full terms ↗</Link>
              </div>

              <p className={styles.truthNote}>
                These are the owner&apos;s exact published terms. Counteroffer opens a new proposal;
                it does not imply that this participant has already accepted a different combination.
              </p>
            </section>
          );
        })}
      </div>
    </article>
  );
}
