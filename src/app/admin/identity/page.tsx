import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { LocalDateTime } from "@/components/ui/local-date-time";
import { evaluateAdminOperatorAccess } from "@/lib/admin";
import { loadBackgroundAccountSecuritySummary } from "@/lib/background-account-security";
import { getViewer } from "@/lib/app-data";
import { getOnePersonAccountConfig } from "@/lib/identity/one-person-account";
import { createServiceClient } from "@/lib/supabase/server";

import {
  completeManualIdentityReviewAction,
  configureQaIdentityReleaseAction,
} from "@/app/identity/actions";
import styles from "@/app/identity/identity.module.css";

export const metadata: Metadata = {
  title: "Identity operations",
  robots: { index: false, follow: false },
};

type Params = Record<string, string | string[] | undefined>;
function param(params: Params, key: string) {
  const value = params[key];
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

interface PendingSession {
  session_id: string;
  purpose: string;
  requested_profile_id: string | null;
  provider_mode: string;
  provider_name: string;
  state: string;
  age_class: string;
  created_at: string;
  expires_at: string;
}

export default async function AdminIdentityPage({
  searchParams,
}: {
  searchParams: Promise<Params>;
}) {
  const [params, viewer] = await Promise.all([searchParams, getViewer()]);
  if (!viewer) redirect("/login?returnTo=/admin/identity");
  const access = evaluateAdminOperatorAccess({
    email: viewer.authUser.email,
    mfaSummary: await loadBackgroundAccountSecuritySummary(),
  });
  if (!access.allowed) redirect(`/dashboard?error=${encodeURIComponent(access.message)}`);

  const config = getOnePersonAccountConfig();
  const service = createServiceClient() as any;
  const [{ data: sessions, error: sessionError }, { data: queue, error: queueError }] =
    await Promise.all([
      service.rpc("list_pending_person_verification_sessions_v1", { p_limit: 100 }),
      service.rpc("get_person_identity_admin_queue_v1", { p_limit: 100 }),
    ]);
  const pending = (sessions ?? []) as PendingSession[];

  return (
    <main className={styles.shell}>
      <div className={styles.container}>
        <p className={styles.eyebrow}>Restricted operations</p>
        <h1 className={styles.title}>Identity operations</h1>
        <p className={styles.lede}>
          Review private uniqueness cases without exposing legal identity in public profiles. Raw
          documents and biometric media must remain with the approved provider.
        </p>
        {param(params, "error") ? <p className={styles.error}>{param(params, "error")}</p> : null}
        {param(params, "message") ? <p className={styles.success}>{param(params, "message")}</p> : null}
        {sessionError || queueError ? <p className={styles.error}>The private identity queue is unavailable.</p> : null}

        <section className={styles.card}>
          <h2>Deployment gates</h2>
          <div className={styles.grid}>
            <div className={styles.fact}><strong>Provider mode</strong><span>{config.providerMode}</span></div>
            <div className={styles.fact}><strong>Registration env gate</strong><span>{String(config.registrationEnforcementEnabled)}</span></div>
            <div className={styles.fact}><strong>Participation env gate</strong><span>{String(config.participationEnforcementEnabled)}</span></div>
            <div className={styles.fact}><strong>Manual linking</strong><span>{String(config.manualIdentityLinkingEnabled)}</span></div>
          </div>
          {process.env.VERCEL_ENV !== "production" && config.providerMode === "qa_mock" ? (
            <form action={configureQaIdentityReleaseAction} className={styles.form}>
              <label className={styles.field}>Registration enforcement
                <select className={styles.select} defaultValue="false" name="registration_enforcement">
                  <option value="false">Off</option><option value="true">On in QA</option>
                </select>
              </label>
              <label className={styles.field}>Participation enforcement
                <select className={styles.select} defaultValue="false" name="participation_enforcement">
                  <option value="false">Off</option><option value="true">On in QA</option>
                </select>
              </label>
              <button className={styles.button} type="submit">Update QA database gates</button>
            </form>
          ) : null}
        </section>

        <section className={styles.card}>
          <h2>Pending verification sessions</h2>
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead><tr><th>Session</th><th>Purpose</th><th>State</th><th>Expires</th></tr></thead>
              <tbody>
                {pending.map((session) => (
                  <tr key={session.session_id}>
                    <td className={styles.code}>{session.session_id}</td>
                    <td>{session.purpose}</td><td>{session.state}</td>
                    <td><LocalDateTime fallback="—" value={session.expires_at} /></td>
                  </tr>
                ))}
                {!pending.length ? <tr><td colSpan={4}>No pending sessions.</td></tr> : null}
              </tbody>
            </table>
          </div>

          {(config.providerMode === "manual_review" || config.providerMode === "qa_mock") ? (
            <form action={completeManualIdentityReviewAction} className={styles.form}>
              <label className={styles.field}>Session UUID
                <input className={styles.input} name="session_id" required />
              </label>
              <label className={styles.field}>Opaque provider subject reference
                <input className={styles.input} minLength={6} name="subject_reference" required />
              </label>
              <label className={styles.field}>Age class
                <select className={styles.select} defaultValue="adult" name="age_class">
                  <option value="adult">Adult</option><option value="minor_13_17">13–17</option>
                </select>
              </label>
              <button className={styles.button} type="submit">Record equivalent manual verification</button>
            </form>
          ) : null}
        </section>

        <section className={styles.card}>
          <h2>Private review queue</h2>
          <pre className={styles.code}>{JSON.stringify(queue ?? [], null, 2)}</pre>
        </section>
      </div>
    </main>
  );
}
