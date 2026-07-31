import type { Metadata } from "next";
import Link from "next/link";

import { runInstitutionalAction } from "@/app/institutions/actions";
import styles from "@/app/institutions/institutions.module.css";
import { InstitutionalDate, InstitutionalKeyValue, InstitutionalSectionHeader, InstitutionalStatus, formatInstitutionalLabel, institutionalStatusTone } from "@/components/institutions/institutional-ui";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteTopbar } from "@/components/layout/site-topbar";
import { requireViewer } from "@/lib/app-data";
import { getFormMessage } from "@/lib/form-state";
import { loadInstitutionalVerifierAssignment } from "@/lib/institutional-data";
import { institutionalIndividualDealHref } from "@/lib/institutional-trade";
import { getPrimaryNavLinks, getTopbarActions } from "@/lib/site";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Independent verifier assignment", robots: { index: false, follow: false } };

interface PageProps { params: Promise<{ assignmentId: string }>; searchParams: Promise<Record<string, string | string[] | undefined>>; }

export default async function VerifierAssignmentPage({ params, searchParams }: PageProps) {
  const [{ assignmentId }, resolvedSearch] = await Promise.all([params, searchParams]);
  await requireViewer(`/institutions/verifier-assignments/${assignmentId}`);
  const { assignment, deal } = await loadInstitutionalVerifierAssignment(assignmentId);
  const message = getFormMessage(resolvedSearch);
  const actions = getTopbarActions(true);
  const returnTo = `/institutions/verifier-assignments/${assignmentId}`;
  return <div className={styles.shell}><SiteTopbar brandHref="/" links={getPrimaryNavLinks(true)} authLink={actions.authLink} primaryAction={actions.primaryAction} showLogout />
    <header className={styles.hero}><div className={styles.heroInner}><div className={styles.heroCopy}><p className={styles.eyebrow}>Independent verification</p><h1>{deal?.title || "Verifier assignment"}</h1><p>{assignment.scope}</p></div><aside className={styles.heroAside}><div className={styles.principle}><span>01</span><div><strong>No access before acceptance</strong><p>The invitation alone does not grant confidential deal-room access.</p></div></div><div className={styles.principle}><span>02</span><div><strong>Conflict declaration is mandatory</strong><p>Acceptance records an explicit declaration and the verifier’s authenticated identity.</p></div></div></aside></div></header>
    <main className={styles.main}>{message ? <p className={message.tone === "error" ? styles.errorNotice : styles.successNotice}>{message.text}</p> : null}<section className={styles.section}><InstitutionalSectionHeader title="Assignment decision" description="Accept only when you can independently review the stated scope. Declining grants no confidential access." />
      <article className={styles.panel}><div className={styles.cardHeader}><h3>Assignment status</h3><InstitutionalStatus tone={institutionalStatusTone(assignment.status)}>{formatInstitutionalLabel(assignment.status)}</InstitutionalStatus></div><InstitutionalKeyValue entries={[["Scope", assignment.scope],["Assigned", <InstitutionalDate key="assigned" value={assignment.created_at} />],["Accepted", assignment.accepted_at ? <InstitutionalDate key="accepted" value={assignment.accepted_at} /> : "Not accepted"],["Conflict declaration", assignment.conflict_declaration || "Not recorded"]]} /></article>
      {assignment.status === "invited" ? <form action={runInstitutionalAction} className={styles.formGrid}><input name="actionType" type="hidden" value="decide_verifier_assignment" /><input name="actingCapacity" type="hidden" value="individual" /><input name="returnTo" type="hidden" value={returnTo} /><input name="assignmentId" type="hidden" value={assignment.id} /><label>Decision<select name="decision" defaultValue="accepted"><option value="accepted">Accept assignment</option><option value="declined">Decline assignment</option></select></label><label className={styles.fullSpan}>Conflict declaration<textarea name="conflictDeclaration" required /></label><div className={`${styles.formActions} ${styles.fullSpan}`}><button className={styles.primaryButton} type="submit">Record my decision</button></div></form> : <p className={styles.callout}>Assignment is {formatInstitutionalLabel(assignment.status)}. Confidential access exists only while an accepted assignment remains active.</p>}
      <div className={styles.inlineActions}>{deal ? <Link className={styles.secondaryButton} href={institutionalIndividualDealHref(String(deal.id))}>Open deal room after acceptance</Link> : null}<Link className={styles.secondaryButton} href="/institutions">Institutional directory</Link></div>
    </section></main><SiteFooter /></div>;
}
