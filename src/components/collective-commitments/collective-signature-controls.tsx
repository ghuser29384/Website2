"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useActionState, useEffect } from "react";

import {
  signCollectiveCommitmentAction,
  withdrawCollectiveCommitmentAction,
} from "@/app/collective-commitments/actions";
import { EMPTY_COLLECTIVE_ACTION_STATE } from "@/lib/collective-commitments/action-state";
import type { CollectiveCommitmentDetail, CollectiveIdentityCredential } from "@/lib/collective-commitments/types";

import { CollectiveSubmitButton } from "./submit-button";
import styles from "./collective-commitments.module.css";

export function CollectiveSignatureControls({
  commitment,
  credential,
}: {
  commitment: CollectiveCommitmentDetail;
  credential: CollectiveIdentityCredential | null;
}) {
  const router = useRouter();
  const [signState, signAction] = useActionState(
    signCollectiveCommitmentAction,
    EMPTY_COLLECTIVE_ACTION_STATE,
  );
  const [withdrawState, withdrawAction] = useActionState(
    withdrawCollectiveCommitmentAction,
    EMPTY_COLLECTIVE_ACTION_STATE,
  );

  useEffect(() => {
    if (signState.message || withdrawState.message) router.refresh();
  }, [router, signState.message, withdrawState.message]);

  if (commitment.viewerHasSigned) {
    return (
      <section className={styles.controlPanel} aria-labelledby="your-signature-heading">
        <h2 id="your-signature-heading">Your private signature is counting</h2>
        <p>Your identity remains hidden while this commitment is open. You may withdraw before activation begins.</p>
        <form action={withdrawAction}>
          <input name="commitment_id" type="hidden" value={commitment.id} />
          <CollectiveSubmitButton pendingLabel="Withdrawing…" secondary>
            Withdraw private signature
          </CollectiveSubmitButton>
        </form>
        {withdrawState.message ? (
          <p className={withdrawState.ok ? styles.successMessage : styles.errorMessage} role="status">
            {withdrawState.message}
          </p>
        ) : null}
      </section>
    );
  }

  if (!credential || !commitment.viewerCanSign) {
    return (
      <section className={styles.controlPanel} aria-labelledby="verification-required-heading">
        <h2 id="verification-required-heading">Current identity verification required</h2>
        <p>A current, operator-approved real-name and human-uniqueness credential is required. Stale, revoked, rejected, or duplicate-flagged credentials cannot sign.</p>
        <Link className="button button-secondary" href="/collective-commitments/identity">
          Review identity requirements
        </Link>
      </section>
    );
  }

  return (
    <section className={styles.controlPanel} aria-labelledby="sign-heading">
      <h2 id="sign-heading">Sign privately</h2>
      <dl className={styles.identityPreview}>
        <div><dt>Verified real name</dt><dd>{credential.verifiedRealName}</dd></div>
        <div><dt>Verified affiliation</dt><dd>{credential.verifiedAffiliation || "None verified"}</dd></div>
        <div><dt>Assurance</dt><dd>{credential.assuranceTier}</dd></div>
      </dl>
      <form action={signAction} className={styles.signForm}>
        <input name="commitment_id" type="hidden" value={commitment.id} />
        {credential.verifiedAffiliation ? (
          <label className={styles.checkboxRow}>
            <input name="publish_affiliation" type="checkbox" />
            <span>Publish my verified affiliation with my name if the threshold is reached.</span>
          </label>
        ) : null}
        <label className={styles.checkboxRow}>
          <input name="terms_acknowledgment" required type="checkbox" />
          <span>I accept the exact frozen proposition, requirements, eligibility rule, threshold, and deadline shown above.</span>
        </label>
        <label className={styles.checkboxRow}>
          <input name="identity_publication_acknowledgment" required type="checkbox" />
          <span>I understand that my verified real name will become public if the threshold is reached.</span>
        </label>
        {commitment.riskClass === "high" ? (
          <label className={styles.checkboxRow}>
            <input name="high_risk_acknowledgment" required type="checkbox" />
            <span>I understand that coordinated publication may expose me to legal, employment, political, financial, reputational, or physical risk, and that Moral Trade cannot guarantee safety.</span>
          </label>
        ) : null}
        <CollectiveSubmitButton pendingLabel="Encrypting private signature…">
          Sign privately
        </CollectiveSubmitButton>
      </form>
      {signState.message ? (
        <p className={signState.ok ? styles.successMessage : styles.errorMessage} role="status">
          {signState.message}
        </p>
      ) : null}
    </section>
  );
}
