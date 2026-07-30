import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { CollectiveCommitmentShell } from "@/components/collective-commitments/collective-commitment-shell";
import { CollectiveSignatureControls } from "@/components/collective-commitments/collective-signature-controls";
import styles from "@/components/collective-commitments/collective-commitments.module.css";
import { LocalDateTime } from "@/components/ui/local-date-time";
import { getViewer } from "@/lib/app-data";
import { isCollectiveCommitmentsEnabled } from "@/lib/collective-commitments/config";
import {
  getCollectiveCommitmentDetail,
  getCollectiveIdentityCredential,
} from "@/lib/collective-commitments/service";
import { COLLECTIVE_PROPOSITION_TYPE_META } from "@/lib/collective-commitments/types";

interface CollectiveCommitmentPageProps {
  params: Promise<{ commitmentId: string }>;
}

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: CollectiveCommitmentPageProps): Promise<Metadata> {
  const { commitmentId } = await params;
  return {
    title: `Collective commitment ${commitmentId.slice(0, 8)}`,
    robots: { index: false, follow: false },
  };
}

function statusClass(status: string) {
  if (status === "active") return `${styles.status} ${styles.statusActive}`;
  if (status === "expired") return `${styles.status} ${styles.statusExpired}`;
  if (status === "activating") return `${styles.status} ${styles.statusActivating}`;
  return styles.status;
}

export default async function CollectiveCommitmentPage({ params }: CollectiveCommitmentPageProps) {
  const { commitmentId } = await params;
  const viewer = await getViewer();
  const enabled = isCollectiveCommitmentsEnabled();

  if (!enabled) {
    return (
      <CollectiveCommitmentShell viewerPresent={Boolean(viewer)}>
        <section className={styles.disabledState}>
          <h1>Collective commitments are disabled.</h1>
          <p>This environment cannot load private threshold state.</p>
        </section>
      </CollectiveCommitmentShell>
    );
  }

  const commitment = await getCollectiveCommitmentDetail(commitmentId, viewer?.profile.id);
  if (!commitment) notFound();
  const credential = viewer ? await getCollectiveIdentityCredential(viewer.profile.id) : null;
  const progress = Math.min(100, (commitment.qualifyingSignerCount / commitment.thresholdCount) * 100);

  return (
    <CollectiveCommitmentShell viewerPresent={Boolean(viewer)}>
      <article>
        <header className={styles.detailHeader}>
          <div className={styles.detailKicker}>
            <span className={statusClass(commitment.status)}>{commitment.status}</span>
            <span>{COLLECTIVE_PROPOSITION_TYPE_META[commitment.propositionType].label}</span>
            <span>{commitment.riskClass === "high" ? "High risk" : "Standard risk"}</span>
          </div>
          <h1>{commitment.title}</h1>
          <p>Created by {commitment.creatorDisplayName}. The proposition, eligibility rule, threshold, deadline, and risk terms below are frozen.</p>
        </header>

        <section className={styles.progressPanel} aria-label="Verified signer progress">
          <strong>{commitment.qualifyingSignerCount} / {commitment.thresholdCount}</strong>
          <div className={styles.progressTrack} aria-hidden="true">
            <span style={{ width: `${progress}%` }} />
          </div>
          <span>{commitment.status === "active" ? "revealed" : "verified signers"}</span>
        </section>

        <div className={styles.detailGrid}>
          <div>
            <section className={styles.termBlock}>
              <h2>Exact proposition</h2>
              <p>{commitment.propositionText}</p>
            </section>
            <section className={styles.termBlock}>
              <h2>Requirements</h2>
              <p>{commitment.requirementsText}</p>
            </section>
            <section className={styles.termBlock}>
              <h2>Eligibility rule</h2>
              <p>{commitment.eligibilityRule}</p>
            </section>
            <section className={styles.termBlock}>
              <dl className={styles.termGrid}>
                <div><dt>Exact threshold</dt><dd>{commitment.thresholdCount} qualifying verified humans</dd></div>
                <div><dt>Deadline</dt><dd><LocalDateTime fallback="Date unavailable" value={commitment.deadlineAt} /></dd></div>
                <div><dt>Risk dimensions</dt><dd>{commitment.riskDimensions.length ? commitment.riskDimensions.join(", ") : "No additional dimensions selected"}</dd></div>
                <div><dt>Frozen-terms hash</dt><dd className={styles.hash}>{commitment.termsHash}</dd></div>
              </dl>
            </section>
            {commitment.riskClass === "high" ? (
              <aside className={styles.highRisk}>
                <strong>High-risk participation warning</strong>
                <p>Reaching the threshold does not guarantee safety. Collective publication may still expose participants to retaliation, employment action, financial loss, legal process, political pressure, reputational harm, or physical danger.</p>
              </aside>
            ) : null}
          </div>

          <aside>
            {viewer && commitment.status === "open" ? (
              <CollectiveSignatureControls commitment={commitment} credential={credential} />
            ) : commitment.status === "activating" ? (
              <section className={styles.controlPanel}>
                <h2>Activation in progress</h2>
                <p>The threshold was reached. Moral Trade is revalidating the exact credential set before publishing anyone.</p>
              </section>
            ) : commitment.status === "active" ? (
              <section className={styles.controlPanel}>
                <h2>Threshold reached</h2>
                <p>The exact verified signer set was published atomically. Private ciphertext and the per-commitment key were deleted.</p>
              </section>
            ) : commitment.status === "expired" ? (
              <section className={styles.controlPanel}>
                <h2>Deadline passed</h2>
                <p>The threshold was not reached. No signer identities were published; private ciphertext and the per-commitment key were deleted.</p>
              </section>
            ) : (
              <section className={styles.controlPanel}>
                <h2>Sign in to participate</h2>
                <p>Pre-threshold signer identities are private. A signed-in account with a current verified credential is required.</p>
                <Link className="button button-primary" href={`/login?returnTo=/collective-commitments/${commitment.id}`}>
                  Sign in
                </Link>
              </section>
            )}
          </aside>
        </div>

        <section className={styles.signerSection} aria-labelledby="revealed-signers-heading">
          <h2 id="revealed-signers-heading">Revealed verified signers</h2>
          {commitment.status === "active" && commitment.publicSigners.length ? (
            <ol className={styles.signerList}>
              {commitment.publicSigners.map((signer) => (
                <li key={signer.id}>
                  <span className={styles.signerOrdinal}>{String(signer.ordinal).padStart(2, "0")}</span>
                  <span className={styles.signerName}>{signer.verifiedRealName}</span>
                  <span className={styles.signerAffiliation}>{signer.verifiedAffiliation ?? "Affiliation not published"}</span>
                </li>
              ))}
            </ol>
          ) : (
            <p>
              {commitment.status === "expired"
                ? "No names were published."
                : "No signer identity is public before successful activation."}
            </p>
          )}
        </section>

        {commitment.receipt ? (
          <section className={styles.receiptSection} aria-labelledby="receipt-heading">
            <h2 id="receipt-heading">Cryptographic outcome receipt</h2>
            <dl className={styles.receiptGrid}>
              <div><dt>Outcome</dt><dd>{commitment.receipt.outcome}</dd></div>
              <div><dt>Signer count</dt><dd>{commitment.receipt.signerCount}</dd></div>
              <div><dt>Terms hash</dt><dd className={styles.hash}>{commitment.receipt.termsHash}</dd></div>
              <div><dt>Signer manifest hash</dt><dd className={styles.hash}>{commitment.receipt.signerManifestHash ?? "No manifest—expired without publication"}</dd></div>
              <div><dt>Receipt hash</dt><dd className={styles.hash}>{commitment.receipt.receiptHash}</dd></div>
              <div><dt>Recorded</dt><dd><LocalDateTime fallback="Date unavailable" value={commitment.receipt.createdAt} /></dd></div>
            </dl>
          </section>
        ) : null}
      </article>
    </CollectiveCommitmentShell>
  );
}
