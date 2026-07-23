import type { Metadata } from "next";
import Link from "next/link";

import { CommandWorkspace } from "@/components/command/command-workspace";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteTopbar } from "@/components/layout/site-topbar";
import { getViewer } from "@/lib/app-data";
import { getCommandSession, listCommandSessions } from "@/lib/command/persistence";
import type { CommandSessionView } from "@/lib/command/types";
import { getPrimaryNavLinks, getTopbarActions } from "@/lib/site";

import styles from "./command.module.css";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  title: "Command",
  description:
    "Plan, preview, and carry out authorized Moral Trade actions through a persistent, typed command workspace.",
  robots: { index: false, follow: false },
};

interface CommandPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

function single(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

export default async function CommandPage({ searchParams }: CommandPageProps) {
  const [viewer, resolved] = await Promise.all([getViewer(), searchParams]);
  if (!viewer) {
    const returnTo = "/command";
    return (
      <div className="page-shell marketplace-app-shell">
        <header className="v72-route-header">
          <SiteTopbar
            brandHref="/"
            links={getPrimaryNavLinks(false)}
            {...getTopbarActions(false)}
            showSearch={false}
          />
        </header>
        <main className={styles.gate} id="main-content" tabIndex={-1}>
          <section className={styles.gateCard} aria-labelledby="command-sign-in-heading">
            <p className={styles.gateLabel}>Private command workspace</p>
            <h1 id="command-sign-in-heading">Sign in to use Command.</h1>
            <p>
              Command keeps conversation history, plans, tool outcomes, confirmations, and resulting
              records private to your account. It cannot bypass consent, review, payment, or safety
              controls.
            </p>
            <div className={styles.gateActions}>
              <Link className="button button-primary" href={`/signup?returnTo=${encodeURIComponent(returnTo)}`}>
                Create account
              </Link>
              <Link className="button button-secondary" href={`/login?returnTo=${encodeURIComponent(returnTo)}`}>
                Sign in
              </Link>
            </div>
          </section>
        </main>
        <SiteFooter />
      </div>
    );
  }

  let initialSessions: CommandSessionView[] = [];
  let initialSession: CommandSessionView | null = null;
  let initialError = "";
  try {
    initialSessions = await listCommandSessions(viewer.authUser.id);
    const requestedSessionId = single(resolved.session);
    const selectedSessionId =
      (requestedSessionId && initialSessions.some((entry) => entry.id === requestedSessionId)
        ? requestedSessionId
        : initialSessions.find((entry) => entry.state === "active")?.id) ?? "";
    if (selectedSessionId) {
      initialSession = await getCommandSession(viewer.authUser.id, selectedSessionId);
    }
  } catch (error) {
    console.error("[command] Initial workspace load failed", error);
    initialError = "Command history could not be loaded. No action was taken.";
  }

  return (
    <CommandWorkspace
      initialError={initialError}
      initialSession={initialSession}
      initialSessions={initialSessions}
      viewerName={viewer.displayName}
    />
  );
}
