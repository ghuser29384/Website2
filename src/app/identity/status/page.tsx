import type { Metadata } from "next";

import { LocalDateTime } from "@/components/ui/local-date-time";
import { getOnePersonVerificationSession } from "@/lib/identity/server";

import {
  continueIdentityRegistrationAction,
  restartIdentityVerificationAction,
} from "../actions";
import styles from "../identity.module.css";

export const metadata: Metadata = {
  title: "Identity verification status",
  robots: { index: false, follow: false },
};

type Params = Record<string, string | string[] | undefined>;
function param(params: Params, key: string) {
  const value = params[key];
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

const stateCopy: Record<string, string> = {
  unavailable: "No current private verification session was found.",
  created: "The verification session was created.",
  provider_pending: "The provider is still reviewing the identity and liveness result.",
  needs_review: "A trained reviewer must resolve this verification.",
  guardian_required: "The person is 13–17 and verified guardian consent is required.",
  verified: "The uniqueness verification succeeded.",
  duplicate_recovery: "This identity matches an existing or disputed account and must use private recovery.",
  rejected: "The verification did not establish an eligible unique person.",
  expired: "This verification session expired.",
  consumed: "This verification was already used for its canonical account.",
};

export default async function IdentityStatusPage({
  searchParams,
}: {
  searchParams: Promise<Params>;
}) {
  const [params, session] = await Promise.all([searchParams, getOnePersonVerificationSession()]);
  const { status } = session;
  const error = param(params, "error");

  return (
    <main className={styles.shell}>
      <div className={styles.container}>
        <p className={styles.eyebrow}>Private identity session</p>
        <h1 className={styles.title}>Verification status</h1>
        <p className={styles.lede}>{stateCopy[status.state] ?? "The verification state is unavailable."}</p>
        {error ? <p className={styles.error}>{error}</p> : null}

        <section className={styles.card}>
          <div className={styles.grid}>
            <div className={styles.fact}><strong>State</strong><span>{status.state.replaceAll("_", " ")}</span></div>
            <div className={styles.fact}><strong>Purpose</strong><span>{status.purpose?.replaceAll("_", " ") ?? "unavailable"}</span></div>
            <div className={styles.fact}><strong>Provider</strong><span>{status.providerName}</span></div>
            <div className={styles.fact}><strong>Expires</strong><span><LocalDateTime fallback="—" value={status.expiresAt} /></span></div>
          </div>

          {status.registrationReady ? (
            <form action={continueIdentityRegistrationAction} className={styles.form}>
              <button className={styles.button} type="submit">Continue to account creation</button>
            </form>
          ) : null}

          {status.recoveryRequired ? (
            <p className={styles.notice}>
              No information about any other account is shown here. Recovery will restore the same
              canonical identity after enhanced review.
            </p>
          ) : null}

          <div className={styles.actions}>
            <a className={styles.secondaryButton} href="/identity/status">Refresh status</a>
            <form action={restartIdentityVerificationAction}>
              <input name="return_to" type="hidden" value={status.returnTo} />
              <button className={styles.secondaryButton} type="submit">Restart verification</button>
            </form>
          </div>
        </section>
      </div>
    </main>
  );
}
