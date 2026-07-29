import type { Metadata } from "next";
import Link from "next/link";

import { CollectiveCommitmentShell } from "@/components/collective-commitments/collective-commitment-shell";
import styles from "@/components/collective-commitments/collective-commitments.module.css";
import { getViewer } from "@/lib/app-data";
import { isCollectiveCommitmentsEnabled } from "@/lib/collective-commitments/config";
import { listCollectiveCommitments } from "@/lib/collective-commitments/service";
import { COLLECTIVE_PROPOSITION_TYPE_META } from "@/lib/collective-commitments/types";

export const metadata: Metadata = {
  title: "Collective commitments",
  description: "Privately join a verified identity-threshold proposition and reveal together only when its exact threshold is met.",
};

export const dynamic = "force-dynamic";

function statusClass(status: string) {
  if (status === "active") return `${styles.status} ${styles.statusActive}`;
  if (status === "expired") return `${styles.status} ${styles.statusExpired}`;
  if (status === "activating") return `${styles.status} ${styles.statusActivating}`;
  return styles.status;
}

export default async function CollectiveCommitmentsPage() {
  const viewer = await getViewer();
  const enabled = isCollectiveCommitmentsEnabled();
  const commitments = enabled ? await listCollectiveCommitments() : [];

  return (
    <CollectiveCommitmentShell viewerPresent={Boolean(viewer)}>
      {!enabled ? (
        <section className={styles.disabledState}>
          <h1>Collective commitments are disabled.</h1>
          <p>This environment has not enabled the encrypted identity-threshold service. No signatures can be created here.</p>
        </section>
      ) : (
        <>
          <section className={styles.hero}>
            <div className={styles.heroCopy}>
              <h1>Commit privately. Reveal together.</h1>
              <p>
                Associate your verified real name with a frozen proposition only if enough other qualified people independently make the same commitment before the deadline.
              </p>
              <div className={styles.heroActions}>
                <Link className="button button-primary" href={viewer ? "/collective-commitments/new" : "/login?returnTo=/collective-commitments/new"}>
                  Create a commitment
                </Link>
                <Link className="button button-secondary" href="/collective-commitments/identity">
                  Identity requirements
                </Link>
              </div>
            </div>
            <aside className={styles.mechanismNote}>
              <strong>Threshold publication, not anonymous endorsement</strong>
              <p>Before activation, no signer name or affiliation is public. At the exact threshold, all verified real names are published atomically. If the deadline passes, the encrypted signatures and per-commitment key are erased.</p>
            </aside>
          </section>

          <section className={styles.section}>
            <div className={styles.sectionHeading}>
              <h2>Open and completed propositions</h2>
              <p>Counts show qualifying verified signers. They do not identify who signed before activation.</p>
            </div>

            {commitments.length ? (
              <div className={styles.commitmentList}>
                {commitments.map((commitment) => (
                  <article className={styles.commitmentCard} key={commitment.id}>
                    <div>
                      <span className={statusClass(commitment.status)}>{commitment.status}</span>
                      <h3>{commitment.title}</h3>
                      <p>{commitment.propositionText}</p>
                      <div className={styles.actions}>
                        <Link className="button button-secondary button-mini" href={`/collective-commitments/${commitment.id}`}>
                          Review exact terms
                        </Link>
                      </div>
                    </div>
                    <dl className={styles.cardMeta}>
                      <div><dt>Type</dt><dd>{COLLECTIVE_PROPOSITION_TYPE_META[commitment.propositionType].label}</dd></div>
                      <div><dt>Verified signers</dt><dd>{commitment.qualifyingSignerCount} / {commitment.thresholdCount}</dd></div>
                      <div><dt>Creator</dt><dd>{commitment.creatorDisplayName}</dd></div>
                      <div><dt>Deadline</dt><dd>{new Date(commitment.deadlineAt).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short", timeZone: "UTC" })} UTC</dd></div>
                    </dl>
                  </article>
                ))}
              </div>
            ) : (
              <div className={styles.emptyState}>
                <h2>No collective commitments yet.</h2>
                <p>Create the first frozen proposition. This empty state does not fabricate participants, counts, or social proof.</p>
              </div>
            )}
          </section>
        </>
      )}
    </CollectiveCommitmentShell>
  );
}
