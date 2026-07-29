import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { CollectiveCommitmentForm } from "@/components/collective-commitments/collective-commitment-form";
import { CollectiveCommitmentShell } from "@/components/collective-commitments/collective-commitment-shell";
import styles from "@/components/collective-commitments/collective-commitments.module.css";
import { getViewer } from "@/lib/app-data";
import {
  getCollectiveCommitmentMinimumDeadlineMinutes,
  isCollectiveCommitmentsEnabled,
} from "@/lib/collective-commitments/config";

export const metadata: Metadata = {
  title: "Create a collective commitment",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function NewCollectiveCommitmentPage() {
  const viewer = await getViewer();
  if (!viewer) redirect("/login?returnTo=/collective-commitments/new");
  const enabled = isCollectiveCommitmentsEnabled();

  return (
    <CollectiveCommitmentShell viewerPresent>
      {!enabled ? (
        <section className={styles.disabledState}>
          <h1>Collective commitments are disabled.</h1>
          <p>This environment cannot accept or persist a proposition.</p>
          <Link className="button button-secondary" href="/collective-commitments">Return</Link>
        </section>
      ) : (
        <section>
          <div className={`${styles.heroCopy} ${styles.heroCompact}`}>
            <h1>Freeze the proposition before anyone signs.</h1>
            <p>Define the exact statement, eligibility rule, verified-signer threshold, deadline, and risk disclosures. These terms cannot be weakened or edited after creation.</p>
          </div>
          <CollectiveCommitmentForm minimumDeadlineMinutes={getCollectiveCommitmentMinimumDeadlineMinutes()} />
        </section>
      )}
    </CollectiveCommitmentShell>
  );
}
