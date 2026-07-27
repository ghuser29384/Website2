import Link from "next/link";

import { LocalDateTime } from "@/components/ui/local-date-time";

import { formatDealroomState } from "./dealroom-state";
import type { DealroomAgreement } from "./dealroom-types";
import styles from "./dealroom.module.css";

type AgreementEvent = DealroomAgreement["events"][number];

interface DealroomHistoryProps {
  agreement: DealroomAgreement;
  sortedEvents: AgreementEvent[];
}

export function DealroomHistory({
  agreement,
  sortedEvents,
}: DealroomHistoryProps) {
  return (
    <>
      <section className="section section-white" aria-labelledby="history-heading">
        <div className="section-head">
          <p className="eyebrow">Version and event history</p>
          <h2 id="history-heading">What changed, when, and why</h2>
          <p>
            Terms updates, counteroffers, status changes, and later evidence events remain
            visible to both participants.
          </p>
        </div>

        {sortedEvents.length ? (
          <ol className={styles.activityList}>
            {sortedEvents.map((event) => (
              <li key={event.id}>
                <time dateTime={event.created_at}>
                  <LocalDateTime
                    fallback="Event time unavailable"
                    value={event.created_at}
                  />
                </time>
                <article>
                  <p className={styles.activityKicker}>
                    {formatDealroomState(event.event_type)}
                  </p>
                  <h3>{event.summary}</h3>
                  {event.details ? <p>{event.details}</p> : null}
                </article>
              </li>
            ))}
          </ol>
        ) : (
          <div className={styles.emptyActivity}>
            <h3>No revisions have been recorded yet.</h3>
            <p>
              The first saved terms change, counteroffer, or status transition will start
              this history. No placeholder events are generated.
            </p>
          </div>
        )}
      </section>

      {agreement.evidenceItems.length || agreement.reviewCases.length ? (
        <section className="section section-subtle" aria-labelledby="evidence-heading">
          <div className="section-head">
            <p className="eyebrow">Evidence and review activity</p>
            <h2 id="evidence-heading">Real submitted records only</h2>
            <p>
              {agreement.evidenceItems.length} evidence item(s) and {agreement.reviewCases.length} review case(s) are attached to this agreement.
            </p>
          </div>
          <div className="hero-actions">
            <Link className="button button-primary" href={`/evidence/${agreement.id}`}>
              Open evidence dossier
            </Link>
            <Link
              className="button button-secondary"
              href={`/agreements/${agreement.id}`}
            >
              Open review controls
            </Link>
          </div>
        </section>
      ) : null}
    </>
  );
}
