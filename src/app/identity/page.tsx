import type { Metadata } from "next";

import { getViewer } from "@/lib/app-data";
import { getOnePersonAccountConfig } from "@/lib/identity/one-person-account";
import { getSafeInternalPath } from "@/lib/paths";

import { startIdentityVerificationAction } from "./actions";
import styles from "./identity.module.css";

export const metadata: Metadata = {
  title: "Verify one person, one account",
  description: "Privately verify that one natural person has one canonical Moral Trade account.",
  robots: { index: false, follow: false },
};

type Params = Record<string, string | string[] | undefined>;

function param(params: Params, key: string) {
  const value = params[key];
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

export default async function IdentityPage({
  searchParams,
}: {
  searchParams: Promise<Params>;
}) {
  const [params, viewer] = await Promise.all([searchParams, getViewer()]);
  const config = getOnePersonAccountConfig();
  const returnTo = getSafeInternalPath(
    param(params, "returnTo") || param(params, "return_to"),
    viewer ? "/account/identity" : "/onboarding",
  );
  const error = param(params, "error");
  const message = param(params, "message");
  const requestedPurpose = param(params, "purpose");
  const defaultPurpose =
    requestedPurpose === "recovery"
      ? "recovery"
      : viewer
        ? "verify_existing"
        : "registration";

  return (
    <main className={styles.shell}>
      <div className={styles.container}>
        <p className={styles.eyebrow}>Canonical person account</p>
        <h1 className={styles.title}>One person. One account.</h1>
        <p className={styles.lede}>
          Moral Trade privately checks that each natural person has one canonical account. Your
          public profile may remain pseudonymous. Raw identity documents, selfies, and biometric
          media are processed by the approved verification provider and are not stored by Moral Trade.
        </p>

        {error ? <p className={styles.error}>{error}</p> : null}
        {message ? <p className={styles.success}>{message}</p> : null}

        <section className={styles.card} aria-labelledby="verification-heading">
          <h2 id="verification-heading">
            {viewer ? "Verify this existing account" : "Verify before creating an account"}
          </h2>
          <div className={styles.grid}>
            <div className={styles.fact}>
              <strong>Public identity</strong>
              <span>Pseudonym allowed</span>
            </div>
            <div className={styles.fact}>
              <strong>Private uniqueness check</strong>
              <span>Document + liveness</span>
            </div>
            <div className={styles.fact}>
              <strong>Provider mode</strong>
              <span>{config.providerMode === "disabled" ? "Not enabled" : config.providerName}</span>
            </div>
          </div>

          <form action={startIdentityVerificationAction} className={styles.form}>
            <input name="return_to" type="hidden" value={returnTo} />
            <label className={styles.field}>
              Verification purpose
              <select className={styles.select} defaultValue={defaultPurpose} name="purpose">
                {viewer ? <option value="verify_existing">Verify this signed-in account</option> : null}
                {!viewer ? <option value="registration">Create my only Moral Trade account</option> : null}
                <option value="recovery">Recover my existing canonical account</option>
              </select>
            </label>
            <button className={styles.button} disabled={config.providerMode === "disabled"} type="submit">
              Start private verification
            </button>
          </form>

          {config.providerMode === "disabled" ? (
            <p className={styles.notice}>
              Identity verification is not enabled in this deployment. Existing production behavior
              remains unchanged while the release gates are off.
            </p>
          ) : null}

          <ul className={styles.list}>
            <li>Names, devices, IP addresses, and household addresses do not independently prove a duplicate.</li>
            <li>People aged 13–17 require a separately verified guardian and receive restricted capabilities.</li>
            <li>A returning or closed-account user is routed to recovery rather than a second account.</li>
          </ul>
        </section>
      </div>
    </main>
  );
}
