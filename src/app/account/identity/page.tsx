import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { LocalDateTime } from "@/components/ui/local-date-time";
import { getViewer } from "@/lib/app-data";
import { getOnePersonAccountConfig } from "@/lib/identity/one-person-account";
import {
  loadOnePersonAccountStatus,
  synchronizeOnePersonCredentialInventory,
} from "@/lib/identity/server";
import { createClient } from "@/lib/supabase/server";

import {
  startIdentityVerificationAction,
  startOAuthIdentityLinkAction,
  unlinkIdentityCredentialAction,
} from "@/app/identity/actions";
import styles from "@/app/identity/identity.module.css";

export const metadata: Metadata = {
  title: "Account identity and sign-in methods",
  robots: { index: false, follow: false },
};

type Params = Record<string, string | string[] | undefined>;
function param(params: Params, key: string) {
  const value = params[key];
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

export default async function AccountIdentityPage({
  searchParams,
}: {
  searchParams: Promise<Params>;
}) {
  const [params, viewer] = await Promise.all([searchParams, getViewer()]);
  if (!viewer) redirect("/login?returnTo=/account/identity");

  const config = getOnePersonAccountConfig();
  const [status, authResult] = await Promise.all([
    loadOnePersonAccountStatus(viewer.authUser.id),
    createClient().then((client) => client.auth.getUser()),
  ]);
  const identities = authResult.data.user?.identities ?? [];

  if (status?.verificationStatus === "verified" && config.dedupeKey.length >= 32) {
    await synchronizeOnePersonCredentialInventory(viewer.authUser.id).catch(() => null);
  }

  return (
    <main className={styles.shell}>
      <div className={styles.container}>
        <p className={styles.eyebrow}>Canonical account</p>
        <h1 className={styles.title}>Identity and sign-in methods</h1>
        <p className={styles.lede}>
          One natural person may have one canonical account. Multiple email, OAuth, and passkey
          credentials may be linked to that same account.
        </p>

        {param(params, "error") ? <p className={styles.error}>{param(params, "error")}</p> : null}
        {param(params, "message") ? <p className={styles.success}>{param(params, "message")}</p> : null}

        <section className={styles.card}>
          <h2>Private verification status</h2>
          <div className={styles.grid}>
            <div className={styles.fact}><strong>Verification</strong><span>{status?.verificationStatus.replaceAll("_", " ") ?? "unavailable"}</span></div>
            <div className={styles.fact}><strong>Account state</strong><span>{status?.accountStatus.replaceAll("_", " ") ?? "unavailable"}</span></div>
            <div className={styles.fact}><strong>Age capability</strong><span>{status?.ageClass.replaceAll("_", " ") ?? "unknown"}</span></div>
            <div className={styles.fact}><strong>Guardian consent</strong><span>{status?.guardianConsentStatus.replaceAll("_", " ") ?? "not required"}</span></div>
          </div>
          {status?.verificationStatus !== "verified" ? (
            <form action={startIdentityVerificationAction} className={styles.form}>
              <input name="purpose" type="hidden" value="verify_existing" />
              <input name="return_to" type="hidden" value="/account/identity" />
              <button className={styles.button} disabled={config.providerMode === "disabled"} type="submit">
                Verify this canonical account
              </button>
            </form>
          ) : (
            <p className={styles.success}>Identity verified. Your legal identity remains private.</p>
          )}
        </section>

        <section className={styles.card}>
          <h2>Linked credentials</h2>
          <p className={styles.muted}>
            Linking is initiated only while signed in to this canonical account. Removing a credential
            requires a recent sign-in and at least one other credential.
          </p>
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead><tr><th>Provider</th><th>Created</th><th>Action</th></tr></thead>
              <tbody>
                {identities.map((identity) => (
                  <tr key={identity.identity_id}>
                    <td>{identity.provider}</td>
                    <td><LocalDateTime fallback="—" value={identity.created_at ?? null} /></td>
                    <td>
                      {identities.length > 1 && config.manualIdentityLinkingEnabled ? (
                        <form action={unlinkIdentityCredentialAction}>
                          <input name="identity_id" type="hidden" value={identity.identity_id} />
                          <button className={styles.secondaryButton} type="submit">Remove</button>
                        </form>
                      ) : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <form action={startOAuthIdentityLinkAction} className={styles.form}>
            <label className={styles.field}>
              Add another sign-in provider
              <select className={styles.select} defaultValue="google" name="provider">
                <option value="google">Google</option>
                <option value="apple">Apple</option>
                <option value="github">GitHub</option>
              </select>
            </label>
            <button className={styles.button} disabled={!config.manualIdentityLinkingEnabled} type="submit">
              Link provider to this account
            </button>
          </form>
          {!config.manualIdentityLinkingEnabled ? (
            <p className={styles.notice}>Manual identity linking remains disabled until QA gates pass.</p>
          ) : null}
        </section>
      </div>
    </main>
  );
}
