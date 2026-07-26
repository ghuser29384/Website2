import type { Metadata } from "next";

import { CollectiveCommitmentShell } from "@/components/collective-commitments/collective-commitment-shell";
import styles from "@/components/collective-commitments/collective-commitments.module.css";
import { getViewer } from "@/lib/app-data";
import { isCollectiveCommitmentsEnabled } from "@/lib/collective-commitments/config";
import { getCollectiveIdentityCredential } from "@/lib/collective-commitments/service";

export const metadata: Metadata = {
  title: "Collective identity verification",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function CollectiveIdentityPage() {
  const viewer = await getViewer();
  const enabled = isCollectiveCommitmentsEnabled();
  const credential = enabled && viewer
    ? await getCollectiveIdentityCredential(viewer.profile.id)
    : null;

  return (
    <CollectiveCommitmentShell viewerPresent={Boolean(viewer)}>
      <section className={styles.heroCopy}>
        <h1>One verified human. One qualifying signature.</h1>
        <p>High-risk propositions require strict real-name, human-uniqueness, and eligibility review. Moral Trade stores the credential result—not raw identity documents—inside this feature.</p>
      </section>

      <div className={styles.identitySteps}>
        <article><h2>1. Verify a real name</h2><p>An approved reviewer or identity provider confirms the legal or established real-world name that will be published at activation.</p></article>
        <article><h2>2. Check human uniqueness</h2><p>A stable hashed uniqueness reference prevents two accounts representing the same verified human from counting twice in one proposition.</p></article>
        <article><h2>3. Review eligibility</h2><p>The proposition-specific requirements must be verifiable at an assurance level appropriate to the stated risk.</p></article>
      </div>

      <section className={styles.credentialPanel}>
        <h2>{viewer ? "Your current credential" : "Sign in to view your credential"}</h2>
        {!enabled ? (
          <p>This environment has not enabled collective identity credentials.</p>
        ) : credential ? (
          <dl className={styles.termGrid}>
            <div><dt>Status</dt><dd>{credential.status}</dd></div>
            <div><dt>Verified real name</dt><dd>{credential.verifiedRealName}</dd></div>
            <div><dt>Verified affiliation</dt><dd>{credential.verifiedAffiliation || "None"}</dd></div>
            <div><dt>Uniqueness check</dt><dd>{credential.duplicateCheckResult}</dd></div>
            <div><dt>Manual review</dt><dd>{credential.manualReviewStatus}</dd></div>
            <div><dt>Assurance tier</dt><dd>{credential.assuranceTier}</dd></div>
            <div><dt>Verified</dt><dd>{credential.verifiedAt ? new Date(credential.verifiedAt).toLocaleString("en-US") : "Not verified"}</dd></div>
            <div><dt>Expires</dt><dd>{credential.expiresAt ? new Date(credential.expiresAt).toLocaleString("en-US") : "No recorded expiry"}</dd></div>
          </dl>
        ) : viewer ? (
          <p>No collective-commitment identity credential is recorded for this account. Verification is currently operator-reviewed; contact Moral Trade support to begin review.</p>
        ) : (
          <p>Identity credentials are private account records. Sign in to review yours.</p>
        )}
      </section>
    </CollectiveCommitmentShell>
  );
}
