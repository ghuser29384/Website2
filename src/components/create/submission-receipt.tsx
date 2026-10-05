import Link from "next/link";

import { LocalDateTime } from "@/components/ui/local-date-time";

import styles from "./submission-receipt.module.css";

interface SubmissionReceiptRecord {
  id: string;
  submission_kind: string;
  target_type: string | null;
  target_id: string | null;
  status: string;
  cause_area: string;
  requested_action: string;
  created_at: string;
  interface_version: string;
}

function label(value: string) {
  return value.replaceAll("_", " ").replace(/\b\w/g, (character) => character.toUpperCase());
}

export function SubmissionReceipt({ submission, targetHref }: {
  submission: SubmissionReceiptRecord;
  targetHref: string | null;
}) {
  return (
    <section className={styles.receipt} aria-labelledby="submission-title">
      <header className={styles.heading}>
        <p className="eyebrow">Durable Create receipt</p>
        <h1 id="submission-title">{label(submission.submission_kind)}</h1>
        <p className={styles.notice}>
          This record was saved atomically. It is not public and creates no payment, pledge,
          trade, or payout obligation while its status is {label(submission.status).toLowerCase()}.
        </p>
      </header>

      <div className={styles.body}>
        <dl className={styles.summary}>
          <div><dt>Status</dt><dd>{label(submission.status)}</dd></div>
          <div><dt>Cause</dt><dd>{submission.cause_area}</dd></div>
          <div><dt>Created</dt><dd><LocalDateTime value={submission.created_at} fallback="Date unavailable" /></dd></div>
          <div className={styles.action}><dt>Requested action</dt><dd>{submission.requested_action}</dd></div>
        </dl>

        <div className={styles.actions}>
          {targetHref ? <Link className="button button-primary" href={targetHref}>Open target record</Link> : null}
          <Link className="button button-secondary" href="/trades/new">Create another</Link>
        </div>

        <details className={styles.details}>
          <summary>Record details</summary>
          <dl className={styles.metadata}>
            <div><dt>Submission ID</dt><dd>{submission.id}</dd></div>
            <div><dt>Target type</dt><dd>{submission.target_type ? label(submission.target_type) : "Unavailable"}</dd></div>
            <div><dt>Target ID</dt><dd>{submission.target_id ?? "Unavailable"}</dd></div>
            <div><dt>Interface version</dt><dd>{submission.interface_version}</dd></div>
          </dl>
        </details>
      </div>
    </section>
  );
}
